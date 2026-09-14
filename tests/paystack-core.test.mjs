import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { getPlan, safePaystackUrl, validateTransaction, validSignature, hasPaidAccess } from '../supabase/functions/_shared/paystack-core.ts';

test('prices use kobo and six months remains distinct from annual', () => {
  assert.equal(getPlan('monthly').amount, 250000);
  assert.equal(getPlan('biannual').interval, 'biannually');
  assert.equal(getPlan('biannual').amount, 1200000);
  assert.equal(getPlan('annual').amount, 2400000);
  for (const value of ['__proto__', 'constructor', 'free', null]) assert.throws(() => getPlan(value));
});
test('webhook signatures verify exact raw bytes', async () => {
  const raw = new TextEncoder().encode('{ "event": "charge.success" }');
  const signature = createHmac('sha512', 'sk_test_example').update(raw).digest('hex');
  assert.equal(await validSignature(raw, signature, 'sk_test_example'), true);
  assert.equal(await validSignature(raw, signature, 'different-secret'), false);
  assert.equal(await validSignature(new TextEncoder().encode('{}'), signature, 'sk_test_example'), false);
  assert.equal(await validSignature(raw, '', 'sk_test_example'), false);
});
test('payment verification enforces recurring plans and plan-free one-time payments', () => {
  const billing = { email: 'artisan@example.com', plan_code: 'PLN_monthly', payment_mode: 'automatic', amount_kobo: 250000, customer_code: 'CUS_1' };
  const valid = { status: 'success', reference: 'F9-1', domain: 'live', amount: 250000, currency: 'NGN',
    customer: { email: 'ARTISAN@example.com', customer_code: 'CUS_1' }, plan: { plan_code: 'PLN_monthly' }, paid_at: '2026-09-10T09:00:00Z' };
  assert.doesNotThrow(() => validateTransaction(valid, billing, 'F9-1', 'live'));
  assert.doesNotThrow(() => validateTransaction({ ...valid, plan: null }, { ...billing, payment_mode: 'once' }, 'F9-1', 'live'));
  assert.throws(() => validateTransaction(valid, { ...billing, payment_mode: 'once' }, 'F9-1', 'live'));
  for (const change of [{ amount: 2500 }, { currency: 'USD' }, { status: 'failed' }, { domain: 'test' },
    { reference: 'F9-other' }, { plan: null }, { paid_at: 'invalid' },
    { customer: { email: 'other@example.com', customer_code: 'CUS_1' } },
    { customer: { email: 'artisan@example.com', customer_code: 'CUS_2' } }]) {
    assert.throws(() => validateTransaction({ ...valid, ...change }, billing, 'F9-1', 'live'));
  }
});
test('redirects permit only Paystack checkout and management pages', () => {
  assert.equal(safePaystackUrl('https://checkout.paystack.com/abc', 'checkout'), 'https://checkout.paystack.com/abc');
  assert.equal(safePaystackUrl('https://paystack.com/manage/subscriptions/abc', 'manage'), 'https://paystack.com/manage/subscriptions/abc');
  for (const url of ['http://checkout.paystack.com/abc', 'https://checkout.paystack.com.evil.test', 'https://evil.test', 'javascript:alert(1)', 'https://user:pass@checkout.paystack.com/a']) {
    assert.throws(() => safePaystackUrl(url, 'checkout'));
  }
  assert.throws(() => safePaystackUrl('https://paystack.com/other', 'manage'));
});
test('cancellation preserves paid access but expired and failed payments do not grant access', () => {
  const now = Date.parse('2026-09-10');
  assert.equal(hasPaidAccess({ provider_status: 'non-renewing', paid_through: '2026-10-10' }, now), true);
  assert.equal(hasPaidAccess({ provider_status: 'active', paid_through: '2026-09-10' }, now), false);
  assert.equal(hasPaidAccess({ provider_status: 'attention' }, now), false);
});
