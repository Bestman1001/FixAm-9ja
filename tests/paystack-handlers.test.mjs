import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';
import { readFile } from 'node:fs/promises';
import { createHmac } from 'node:crypto';

async function fixture() {
  const user = { id: 'user-1', email: 'artisan@example.com' };
  const env = { APP_ORIGIN: 'https://www.fixam9ja.com', PAYSTACK_MODE: 'live', PAYSTACK_SECRET_KEY: 'sk_live_fixture',
    PAYSTACK_PLAN_MONTHLY: 'PLN_monthly', SUPABASE_URL: 'https://fixture.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-fixture' };
  const tables = { billing_subscriptions: [], billing_payments: [], user_profiles: [{ user_id: user.id, account_status: 'active' }],
    artisan_applications: [{ id: 'app-1', application_code: 'APP-1', applicant_user_id: user.id, status: 'listed', identity_verification_status: 'verified' }],
    artisans: [{ id: 1, application_id: 'app-1', owner_user_id: user.id, profile_status: 'active', identity_verification_status: 'verified' }] };
  const state = { tables, env, user, calls: [], payments: [], status: 'active', failWrite: false, transactionPatch: {}, failProvider: false };
  const db = {
    auth: { getUser: async (token) => token === 'valid' ? { data: { user } } : { data: {}, error: {} } },
    from(table) {
      let action = 'select', payload, filters = [], one = false, limit = Infinity;
      const query = {
        select() { return query; },
        insert(value) { action = 'insert'; payload = value; return query; },
        update(value) { action = 'update'; payload = value; return query; },
        eq(key, value) { filters.push((row) => row[key] === value); return query; },
        is(key, value) { filters.push((row) => (row[key] ?? null) === value); return query; },
        in(key, values) { filters.push((row) => values.includes(row[key])); return query; },
        order() { return query; }, limit(value) { limit = value; return query; },
        single() { one = true; return query; }, maybeSingle() { one = true; return query; },
        then(resolve, reject) {
          return Promise.resolve().then(() => {
            if (state.failWrite && action !== 'select') return { data: null, error: { code: 'broken' } };
            let rows = tables[table].filter((row) => filters.every((filter) => filter(row))).slice(0, limit);
            if (action === 'insert') {
              if (table === 'billing_subscriptions' && tables[table].some((row) => row.user_id === payload.user_id && !row.closed_at)) return { error: { code: '23505' } };
              const row = { id: crypto.randomUUID(), created_at: new Date().toISOString(), provider_status: 'pending', ...payload };
              tables[table].push(row); rows = [row];
            }
            if (action === 'update') rows.forEach((row) => Object.assign(row, payload));
            return { data: one ? rows[0] || null : rows, error: null };
          }).then(resolve, reject);
        },
      };
      return query;
    },
    rpc: async (name, args) => { state.payments.push(args); return state.failWrite ? { error: {} } : { data: '2026-10-10T00:00:00Z', error: null }; },
  };
  const fetchMock = async (url, options) => {
    const path = new URL(url).pathname;
    const body = options.body ? JSON.parse(options.body) : undefined;
    state.calls.push({ path, body });
    if (state.failProvider) return Response.json({ status: false }, { status: 500 });
    let data;
    if (path.startsWith('/plan/')) data = { amount: 250000, currency: 'NGN', interval: 'monthly', domain: 'live' };
    else if (path === '/transaction/initialize') data = { reference: body.reference, authorization_url: 'https://checkout.paystack.com/fixture' };
    else if (path.startsWith('/transaction/verify/')) data = { status: 'success', reference: decodeURIComponent(path.split('/').at(-1)), domain: 'live',
      amount: 250000, currency: 'NGN', customer: { email: user.email, customer_code: 'CUS_1' },
      plan: { plan_code: 'PLN_monthly' }, paid_at: new Date().toISOString(), ...state.transactionPatch };
    else if (path === '/subscription/disable') data = {};
    else if (path.endsWith('/manage/link')) data = { link: 'https://paystack.com/manage/subscriptions/fixture' };
    else if (path.startsWith('/subscription/')) data = { subscription_code: path.split('/')[2], status: state.status, domain: 'live',
      plan: { plan_code: 'PLN_monthly' }, customer: { email: user.email, customer_code: 'CUS_1' }, email_token: 'never-return-this-token', createdAt: new Date().toISOString() };
    else throw new Error(`Unexpected provider call ${path}`);
    return Response.json({ status: true, data });
  };
  let handler;
  const context = vm.createContext({ console, crypto, Uint8Array, TextEncoder, TextDecoder, URL, Request, Response, AbortSignal,
    fetch: fetchMock, Deno: { env: { get: (key) => env[key] }, serve: (callback) => { handler = callback; } } });
  const modules = new Map();
  async function load(url) {
    if (modules.has(url.href)) return modules.get(url.href);
    const source = stripTypeScriptTypes(await readFile(url, 'utf8'));
    const mod = new vm.SourceTextModule(source, { context, identifier: url.href });
    modules.set(url.href, mod);
    await mod.link(async (specifier, parent) => {
      if (specifier.startsWith('npm:')) return new vm.SyntheticModule(['createClient'], function () { this.setExport('createClient', () => db); }, { context });
      return load(new URL(specifier, parent.identifier));
    });
    return mod;
  }
  const billing = await load(new URL('../supabase/functions/paystack-billing/index.ts', import.meta.url));
  await billing.evaluate(); const billingHandler = handler;
  const webhook = await load(new URL('../supabase/functions/paystack-webhook/index.ts', import.meta.url));
  await webhook.evaluate(); const webhookHandler = handler;
  state.request = (body, token = 'valid') => billingHandler(new Request('https://fixture.test', {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, Origin: env.APP_ORIGIN, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }));
  state.webhook = (event, signature = true) => {
    const raw = JSON.stringify(event);
    return webhookHandler(new Request('https://fixture.test', { method: 'POST', body: raw,
      headers: { 'x-paystack-signature': signature ? createHmac('sha512', env.PAYSTACK_SECRET_KEY).update(raw).digest('hex') : 'bad' } }));
  };
  state.checkout = () => state.request({ action: 'checkout', plan: 'monthly', payment_mode: 'automatic', consent: true });
  return state;
}

test('checkout requires authentication, payment mode, explicit consent and verified artisan ownership', async () => {
  const f = await fixture();
  assert.equal((await f.request({ action: 'checkout' }, 'invalid')).status, 401);
  assert.equal((await f.request({ action: 'checkout', plan: 'monthly', consent: true })).status, 400);
  assert.equal((await f.request({ action: 'checkout', plan: 'monthly', payment_mode: 'once' })).status, 400);
  assert.equal((await f.request({ action: 'checkout', plan: 'monthly', payment_mode: 'once', consent: true, application_code: 'OTHER' })).status, 403);
  f.tables.artisan_applications[0].identity_verification_status = 'pending';
  assert.equal((await f.checkout()).status, 409);
  assert.equal(f.calls.length, 0);
});
test('checkout uses server prices, correct recurring plan, trusted callback and one reusable checkout', async () => {
  const f = await fixture();
  assert.equal((await f.request({ action: 'checkout', plan: 'monthly', payment_mode: 'automatic', amount: 1, consent: true })).status, 200);
  const call = f.calls.find((item) => item.path === '/transaction/initialize');
  assert.equal(call.body.amount, '250000'); assert.equal(call.body.plan, 'PLN_monthly');
  assert.deepEqual(call.body.channels, ['card']);
  assert.equal(call.body.callback_url, 'https://www.fixam9ja.com/billing.html');
  assert.equal((await f.checkout()).status, 200);
  assert.equal(f.calls.filter((item) => item.path === '/transaction/initialize').length, 1);
  assert.equal(f.tables.billing_subscriptions.length, 1);
});
test('one-time checkout offers Nigerian bank apps, transfer, USSD, PayAttitude and card without creating a subscription', async () => {
  const f = await fixture();
  const response = await f.request({ action: 'checkout', plan: 'monthly', payment_mode: 'once', consent: true });
  assert.equal(response.status, 200);
  const call = f.calls.find((item) => item.path === '/transaction/initialize');
  assert.equal(call.body.plan, undefined);
  assert.deepEqual(call.body.channels, ['bank', 'bank_transfer', 'ussd', 'payattitude', 'card']);
  assert.equal(f.tables.billing_subscriptions[0].payment_mode, 'once');
  f.transactionPatch.plan = null;
  assert.equal((await f.request({ action: 'verify', reference: f.tables.billing_subscriptions[0].reference })).status, 200);
  assert.equal(f.tables.billing_subscriptions[0].provider_status, 'paid');
});
test('a definitively failed recurring checkout can be replaced with a one-time checkout', async () => {
  const f = await fixture(); await f.checkout();
  f.transactionPatch.status = 'failed';
  const response = await f.request({ action: 'checkout', plan: 'monthly', payment_mode: 'once', consent: true });
  assert.equal(response.status, 200);
  assert.ok(f.tables.billing_subscriptions[0].closed_at);
  assert.equal(f.tables.billing_subscriptions[1].payment_mode, 'once');
  assert.equal(f.calls.filter((item) => item.path === '/transaction/initialize').length, 2);
});
test('browser verification rejects a foreign reference and mismatched payment without activation', async () => {
  const f = await fixture(); await f.checkout();
  assert.equal((await f.request({ action: 'verify', reference: 'someone-elses-payment' })).status, 404);
  f.transactionPatch.amount = 1;
  assert.equal((await f.request({ action: 'verify', reference: f.tables.billing_subscriptions[0].reference })).status, 400);
  assert.equal(f.payments.length, 0);
});
test('invalid webhook signatures cannot activate access; database failures are retried', async () => {
  const f = await fixture(); await f.checkout();
  const event = { event: 'charge.success', data: { reference: f.tables.billing_subscriptions[0].reference } };
  assert.equal((await f.webhook(event, false)).status, 401);
  assert.equal(f.payments.length, 0);
  f.failWrite = true;
  assert.equal((await f.webhook(event)).status, 503);
  f.failWrite = false;
  assert.equal((await f.webhook(event)).status, 200);
  assert.equal(f.payments.length, 1);
});
test('renewal invoice is matched to subscription and independently verified', async () => {
  const f = await fixture(); await f.checkout();
  f.tables.billing_subscriptions[0].subscription_code = 'SUB_1';
  const event = { event: 'invoice.update', data: { paid: true, subscription: { subscription_code: 'SUB_1' }, transaction: { reference: 'renewal-1' } } };
  assert.equal((await f.webhook(event)).status, 200);
  assert.equal(f.payments[0].p_reference, 'renewal-1');
  assert.ok(f.calls.some((call) => call.path === '/transaction/verify/renewal-1'));
  const count = f.payments.length;
  await f.webhook({ event: 'invoice.payment_failed', data: { subscription: { subscription_code: 'SUB_1' } } });
  assert.equal(f.payments.length, count);
});
test('an invoice arriving before subscription.create resolves the provider subscription safely', async () => {
  const f = await fixture(); await f.checkout();
  const response = await f.webhook({ event: 'invoice.update', data: { paid: true, subscription: { subscription_code: 'SUB_1' }, transaction: { reference: 'renewal-early' } } });
  assert.equal(response.status, 200);
  assert.equal(f.tables.billing_subscriptions[0].subscription_code, 'SUB_1');
  assert.equal(f.payments[0].p_reference, 'renewal-early');
});
test('cancellation requires confirmation, preserves dates and never exposes provider tokens', async () => {
  const f = await fixture(); await f.checkout();
  const row = f.tables.billing_subscriptions[0]; row.subscription_code = 'SUB_1'; row.paid_through = '2099-01-01';
  assert.equal((await f.request({ action: 'cancel' })).status, 400);
  assert.equal(f.calls.filter((call) => call.path === '/subscription/disable').length, 0);
  const response = await f.request({ action: 'cancel', confirmation: 'CANCEL' });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).paid_through, '2099-01-01');
  assert.equal(row.paid_through, '2099-01-01');
  assert.equal(f.calls.filter((call) => call.path === '/subscription/disable').length, 1);
  const status = await f.request({ action: 'status' });
  assert.ok(!(await status.text()).includes('never-return-this-token'));
});
test('test credentials are rejected for the production origin', async () => {
  const f = await fixture(); f.env.PAYSTACK_MODE = 'test'; f.env.PAYSTACK_SECRET_KEY = 'sk_test_fixture';
  const response = await f.checkout(); assert.equal(response.status, 400);
  assert.match((await response.json()).error, /Test payments are disabled/);
  assert.equal(f.calls.length, 0);
});
