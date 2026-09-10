export const PLANS = {
  monthly: { amount: 250000, interval: 'monthly', label: 'Monthly', env: 'PAYSTACK_PLAN_MONTHLY' },
  biannual: { amount: 1200000, interval: 'biannually', label: '6 months', env: 'PAYSTACK_PLAN_BIANNUAL' },
  annual: { amount: 2400000, interval: 'annually', label: 'Yearly', env: 'PAYSTACK_PLAN_ANNUAL' },
} as const;

export function getPlan(value: unknown) {
  if (typeof value !== 'string' || !Object.hasOwn(PLANS, value)) throw new Error('Choose a valid subscription plan.');
  return PLANS[value as keyof typeof PLANS];
}

export function safePaystackUrl(value: unknown, kind: 'checkout' | 'manage') {
  const url = new URL(String(value));
  if (url.protocol !== 'https:' || url.username || url.password || url.port ||
      (kind === 'checkout' ? url.hostname !== 'checkout.paystack.com' :
        url.hostname !== 'paystack.com' || !url.pathname.startsWith('/manage/subscriptions/'))) {
    throw new Error('Unexpected payment destination.');
  }
  return url.href;
}

export function validateTransaction(data: any, billing: any, reference: string, mode: string) {
  const planCode = typeof data.plan === 'string' ? data.plan : data.plan?.plan_code || data.plan_object?.plan_code;
  if (data.status !== 'success' || data.reference !== reference || data.domain !== mode ||
      data.currency !== 'NGN' || data.amount !== billing.amount_kobo ||
      String(data.customer?.email || '').toLowerCase() !== billing.email.toLowerCase() ||
      planCode !== billing.plan_code || !Number.isFinite(Date.parse(data.paid_at)) ||
      (billing.customer_code && data.customer?.customer_code !== billing.customer_code)) {
    throw new Error('Payment details do not match this subscription.');
  }
}

export async function validSignature(raw: Uint8Array, signature: string, secret: string) {
  if (!/^[a-f0-9]{128}$/i.test(signature)) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-512' }, false, ['verify']);
  const bytes = Uint8Array.from(signature.match(/../g)!, (hex) => parseInt(hex, 16));
  return crypto.subtle.verify('HMAC', key, bytes, new Uint8Array(raw));
}

export function hasPaidAccess(billing: any, now = Date.now()) {
  return Boolean(billing?.paid_through && Date.parse(billing.paid_through) > now);
}
