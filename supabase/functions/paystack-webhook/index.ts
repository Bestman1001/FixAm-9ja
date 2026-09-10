import { validSignature } from '../_shared/paystack-core.ts';
import { applyPayment, checked, configuration, database, paystack, syncSubscription } from '../_shared/paystack.ts';

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  try {
    const config = configuration();
    const raw = new Uint8Array(await request.arrayBuffer());
    if (raw.length > 262144) return new Response('Payload too large', { status: 413 });
    if (!await validSignature(raw, request.headers.get('x-paystack-signature') || '', config.secret)) {
      return new Response('Invalid signature', { status: 401 });
    }
    const event = JSON.parse(new TextDecoder().decode(raw));
    const data = event.data;
    const db = database();
    if (event.event === 'charge.success') {
      const { data: billing } = checked(await db.from('billing_subscriptions').select('*').eq('reference', data.reference).maybeSingle());
      if (billing?.user_id && !billing.closed_at) await applyPayment(db, billing, data.reference);
      // Recurring payments are matched by subscription code in invoice.update, never by email alone.
    } else if (['subscription.create', 'subscription.disable', 'subscription.not_renew', 'invoice.update', 'invoice.payment_failed'].includes(event.event)) {
      const code = data.subscription?.subscription_code || data.subscription_code;
      if (!/^SUB_[a-zA-Z0-9]+$/.test(code || '')) return new Response('Invalid subscription', { status: 400 });
      let { data: billing } = checked(await db.from('billing_subscriptions').select('*').eq('subscription_code', code).maybeSingle());
      let snapshot;
      if (!billing) {
        snapshot = await paystack(`/subscription/${encodeURIComponent(code)}`);
        const planCode = snapshot.plan?.plan_code;
        const email = String(snapshot.customer?.email || '').toLowerCase();
        if (email && planCode) {
          const { data: candidates } = checked(await db.from('billing_subscriptions').select('*')
            .eq('email', email).eq('plan_code', planCode).is('subscription_code', null).is('closed_at', null));
          if (candidates?.length === 1) {
            // An old subscription event must not attach to a newly started checkout.
            const candidate = candidates[0];
            const created = Date.parse(snapshot.createdAt || snapshot.created_at || '');
            if (!Number.isFinite(created)) throw new Error('Subscription creation date unavailable');
            if (created >= Date.parse(candidate.created_at) - 60000) billing = candidate;
          }
        }
      }
      if (!billing) {
        return new Response('Ignored', { status: 200 });
      }
      if (!billing.user_id || billing.closed_at) return new Response('Closed account', { status: 200 });
      await syncSubscription(db, billing, code, snapshot);
      if (event.event === 'invoice.update' && data.paid === true && data.transaction?.reference) {
        await applyPayment(db, billing, data.transaction.reference);
      }
    }
    return new Response('OK', { status: 200 });
  } catch {
    // Non-2xx requests are retried by Paystack. Never acknowledge a failed database write.
    console.error('Paystack webhook processing failed; delivery will be retried.');
    return new Response('Please retry', { status: 503 });
  }
});
