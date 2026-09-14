import { createClient } from 'npm:@supabase/supabase-js@2';
import { validateTransaction } from './paystack-core.ts';

export function configuration() {
  const secret = Deno.env.get('PAYSTACK_SECRET_KEY') || '';
  const mode = Deno.env.get('PAYSTACK_MODE');
  const origin = Deno.env.get('APP_ORIGIN') || '';
  if (!['test', 'live'].includes(mode || '') || !secret.startsWith(`sk_${mode}_`) || !origin) {
    throw new Error('Billing is not configured. Please contact payments@fixam9ja.com.');
  }
  if (mode === 'test' && new URL(origin).hostname.replace(/^www\./, '') === 'fixam9ja.com') {
    throw new Error('Test payments are disabled on the production site.');
  }
  if (new URL(origin).origin !== origin || (mode === 'live' && !origin.startsWith('https://'))) {
    throw new Error('Billing origin is invalid.');
  }
  return { secret, mode: mode!, origin };
}

export function database() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Billing database is not configured.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
export type Database = ReturnType<typeof database>;

export async function paystack(path: string, body?: unknown) {
  const { secret } = configuration();
  const response = await fetch(`https://api.paystack.co${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(12000),
  });
  const result = await response.json();
  if (!response.ok || result.status !== true) {
    throw new Error('Paystack could not complete this request. Please retry or contact payments@fixam9ja.com.');
  }
  return result.data;
}

export function checked<T extends { error: any }>(result: T): T {
  if (result.error) throw new Error('Billing data could not be saved. Please retry or contact payments@fixam9ja.com.');
  return result;
}

export async function applyPayment(db: Database, billing: any, reference: string) {
  const data = await paystack(`/transaction/verify/${encodeURIComponent(reference)}`);
  if (data.status !== 'success') return { status: data.status || 'pending' };
  validateTransaction(data, billing, reference, configuration().mode);
  checked(await db.from('billing_subscriptions').update({
    customer_code: data.customer.customer_code,
    ...(billing.payment_mode === 'once' ? { provider_status: 'paid' } : {}),
  })
    .eq('id', billing.id));
  const { data: paidThrough } = checked(await db.rpc('fixam_apply_paystack_payment', {
    p_subscription_id: billing.id, p_reference: reference, p_amount: data.amount, p_paid_at: data.paid_at,
  }));
  return { status: 'success', paid_through: paidThrough };
}

// Fetch current provider state so duplicate/out-of-order webhook events cannot undo cancellation.
export async function syncSubscription(db: Database, billing: any, code = billing.subscription_code, snapshot?: any) {
  const data = snapshot || await paystack(`/subscription/${encodeURIComponent(code)}`);
  if (data.subscription_code !== code || data.plan?.plan_code !== billing.plan_code ||
      data.domain !== configuration().mode ||
      String(data.customer?.email || '').toLowerCase() !== billing.email.toLowerCase() ||
      (billing.customer_code && data.customer?.customer_code !== billing.customer_code)) {
    throw new Error('Subscription details do not match.');
  }
  checked(await db.from('billing_subscriptions').update({
    subscription_code: code, customer_code: data.customer.customer_code, provider_status: data.status,
  }).eq('id', billing.id));
  return data;
}

export async function cancelUserBilling(db: Database, userId: string) {
  const { data: rows } = checked(await db.from('billing_subscriptions').select('*').eq('user_id', userId).is('closed_at', null));
  for (const row of rows || []) {
    if (row.payment_mode === 'once') continue;
    // A still-open checkout could create a future subscription after account deletion.
    if (!row.subscription_code) throw new Error('Resolve the pending payment with payments@fixam9ja.com before deleting this account.');
    const subscription = await syncSubscription(db, row);
    if (!['cancelled', 'complete', 'completed', 'non-renewing'].includes(subscription.status)) {
      await paystack('/subscription/disable', { code: row.subscription_code, token: subscription.email_token });
    }
    checked(await db.from('billing_subscriptions').update({ provider_status: 'non-renewing' }).eq('id', row.id));
  }
}
