import { PLANS, getPlan, hasPaidAccess, safePaystackUrl } from '../_shared/paystack-core.ts';
import { applyPayment, checked, configuration, database, paystack, syncSubscription } from '../_shared/paystack.ts';

Deno.serve(async (request) => {
  const origin = Deno.env.get('APP_ORIGIN') || 'https://www.fixam9ja.com';
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Cache-Control': 'no-store', Vary: 'Origin' };
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  if (request.headers.get('Origin') && request.headers.get('Origin') !== origin) return reply({ error: 'Origin not allowed' }, 403);
  try {
    const db = database();
    const token = request.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
    if (!token) return reply({ error: 'Sign in to manage your subscription.' }, 401);
    const { data: auth, error } = await db.auth.getUser(token);
    if (error || !auth.user?.email) return reply({ error: 'Please sign in again.' }, 401);
    const user = auth.user;
    const body = await request.json();
    let { data: billing } = checked(await db.from('billing_subscriptions').select('*')
      .eq('user_id', user.id).is('closed_at', null).maybeSingle());

    if (body.action === 'status') {
      if (billing?.subscription_code) {
        const subscription = await syncSubscription(db, billing);
        billing.provider_status = subscription.status;
      }
      const { data: memberships } = checked(await db.from('billing_subscriptions').select('id').eq('user_id', user.id));
      const { data: payments } = memberships?.length ? checked(await db.from('billing_payments')
        .select('reference,amount_kobo,paid_at').in('subscription_id', memberships.map((item: { id: string }) => item.id))
        .order('paid_at', { ascending: false }).limit(12)) : { data: [] };
      return reply({ subscription: billing ? {
        plan: billing.plan, status: billing.provider_status, paid_through: billing.paid_through,
        active: hasPaidAccess(billing), can_manage: Boolean(billing.subscription_code), reference: billing.reference,
      } : null, payments, plans: Object.entries(PLANS).map(([id, plan]) => ({ id, label: plan.label, amount_kobo: plan.amount })) });
    }
    if (body.action === 'verify') {
      const reference = String(body.reference || '');
      if (!/^[a-zA-Z0-9.=-]{1,120}$/.test(reference)) return reply({ error: 'Invalid payment reference.' }, 400);
      // Only the owner's initial checkout can be verified from the browser.
      const { data: ownBilling } = checked(await db.from('billing_subscriptions').select('*')
        .eq('reference', reference).eq('user_id', user.id).maybeSingle());
      if (!ownBilling) return reply({ error: 'Payment was not found for this account.' }, 404);
      return reply(await applyPayment(db, ownBilling, reference));
    }
    if (body.action === 'manage' || body.action === 'cancel') {
      if (!billing?.subscription_code) return reply({ error: 'Your recurring subscription is still being confirmed. Refresh shortly.' }, 409);
      const subscription = await syncSubscription(db, billing);
      if (body.action === 'manage') {
        const data = await paystack(`/subscription/${encodeURIComponent(billing.subscription_code)}/manage/link`);
        return reply({ url: safePaystackUrl(data.link, 'manage') });
      }
      if (body.confirmation !== 'CANCEL') return reply({ error: 'Confirm cancellation first.' }, 400);
      if (!['non-renewing', 'cancelled', 'complete', 'completed'].includes(subscription.status)) {
        await paystack('/subscription/disable', { code: billing.subscription_code, token: subscription.email_token });
      }
      checked(await db.from('billing_subscriptions').update({ provider_status: 'non-renewing' }).eq('id', billing.id));
      return reply({ cancelled: true, paid_through: billing.paid_through });
    }
    if (body.action !== 'checkout') return reply({ error: 'Unsupported billing action.' }, 400);
    const plan = getPlan(body.plan);
    const config = configuration();
    if (body.consent !== true) return reply({ error: 'Agree to automatic renewal before continuing.' }, 400);
    const { data: profile } = checked(await db.from('user_profiles').select('account_status').eq('user_id', user.id).maybeSingle());
    if (!profile || profile.account_status !== 'active') return reply({ error: 'An active FixAm account is required.' }, 403);
    if (billing?.subscription_code) {
      const subscription = await syncSubscription(db, billing);
      if (!hasPaidAccess(billing) && ['non-renewing', 'cancelled', 'complete', 'completed'].includes(subscription.status)) {
        checked(await db.from('billing_subscriptions').update({ closed_at: new Date().toISOString() }).eq('id', billing.id));
        billing = null;
      } else return reply({ error: 'You already have a subscription. Manage it below; a new plan can start after cancellation and the paid term ends.' }, 409);
    }
    if (billing && billing.plan !== body.plan) return reply({ error: 'An unfinished checkout already exists for another plan. Complete it or contact payments@fixam9ja.com.' }, 409);
    if (!billing) {
      const applicationCode = typeof body.application_code === 'string' ? body.application_code : null;
      let appQuery = db.from('artisan_applications').select('id,identity_verification_status,status')
        .eq('applicant_user_id', user.id).order('created_at', { ascending: false }).limit(1);
      if (applicationCode) appQuery = appQuery.eq('application_code', applicationCode);
      const { data: application } = checked(await appQuery.maybeSingle());
      let artisanQuery = db.from('artisans').select('id,application_id,identity_verification_status,profile_status')
        .eq('owner_user_id', user.id).order('created_at', { ascending: false }).limit(1);
      if (application) artisanQuery = artisanQuery.eq('application_id', application.id);
      const { data: artisan } = checked(await artisanQuery.maybeSingle());
      if (applicationCode && !application) return reply({ error: 'This application does not belong to your account.' }, 403);
      if ((!application && !artisan) || (application && application.identity_verification_status !== 'verified') ||
          (!application && artisan?.identity_verification_status !== 'verified') ||
          ['rejected', 'removed'].includes(application?.status) || ['suspended', 'removed'].includes(artisan?.profile_status)) {
        return reply({ error: 'Complete your artisan identity verification before paying for a subscription.' }, 409);
      }
      const planCode = Deno.env.get(plan.env) || '';
      if (!/^PLN_[a-zA-Z0-9]+$/.test(planCode)) throw new Error('This plan is not available yet. Contact payments@fixam9ja.com.');
      const providerPlan = await paystack(`/plan/${encodeURIComponent(planCode)}`);
      if (providerPlan.amount !== plan.amount || providerPlan.currency !== 'NGN' || providerPlan.interval !== plan.interval ||
          providerPlan.domain !== config.mode || providerPlan.is_deleted || providerPlan.is_archived || providerPlan.invoice_limit) {
        throw new Error('The payment plan configuration needs review. Contact payments@fixam9ja.com.');
      }
      const result = await db.from('billing_subscriptions').insert({ user_id: user.id, email: user.email!.toLowerCase(),
        application_id: application?.id || artisan?.application_id || null, artisan_id: artisan?.id || null,
        plan: body.plan, amount_kobo: plan.amount, plan_code: planCode, reference: `F9-${crypto.randomUUID()}`,
      }).select('*').single();
      if (result.error?.code === '23505') return reply({ error: 'Checkout is already being prepared. Please refresh and try again.' }, 409);
      billing = checked(result).data;
    }
    if (billing.authorization_url) return reply({ url: safePaystackUrl(billing.authorization_url, 'checkout') });
    const data = await paystack('/transaction/initialize', { email: billing.email, amount: String(billing.amount_kobo),
      currency: 'NGN', plan: billing.plan_code, reference: billing.reference, channels: ['card'],
      callback_url: `${config.origin}/billing.html`,
      metadata: JSON.stringify({ fixam_billing_id: billing.id }),
    });
    if (data.reference !== billing.reference) throw new Error('Unexpected checkout reference.');
    const url = safePaystackUrl(data.authorization_url, 'checkout');
    checked(await db.from('billing_subscriptions').update({ authorization_url: url }).eq('id', billing.id));
    return reply({ url });
  } catch (error) {
    return reply({ error: error instanceof Error ? error.message : 'Billing is temporarily unavailable.' }, 400);
  }
});
