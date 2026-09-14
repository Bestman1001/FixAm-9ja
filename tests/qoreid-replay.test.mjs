import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';

const source = fs.readFileSync('supabase/functions/verify-nin/index.ts', 'utf8');
const replayCode = source.slice(
  source.indexOf('async function replayCollectionWebhook('),
  source.indexOf('async function verifyWithProvider('),
);

function loadReplay({ env, fetch }) {
  const context = vm.createContext({
    Deno: { env: { get: (name) => env[name] } },
    fetch,
    Request,
    Response,
    URL,
    JSON,
    json: (payload, status = 200) => new Response(JSON.stringify(payload), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  });
  vm.runInContext(stripTypeScriptTypes(replayCode), context);
  return context.replayCollectionWebhook;
}

const baseEnv = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'current-service-key',
  QOREID_CLIENT_ID: 'client-id',
  QOREID_CLIENT_SECRET: 'client-secret',
};

function request(token = '') {
  return new Request('https://example.supabase.co/functions/v1/verify-nin', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

test('QoreID replay rejects ordinary callers before contacting either provider', async () => {
  let calls = 0;
  const replay = loadReplay({ env: baseEnv, fetch: async () => { calls += 1; } });
  const response = await replay(request(), { request_id: '199786122' });
  assert.equal(response.status, 403);
  assert.equal(calls, 0);
});

test('QoreID replay accepts the configured service key and only resends the existing webhook', async () => {
  const calls = [];
  const replay = loadReplay({
    env: baseEnv,
    fetch: async (url, options) => {
      calls.push({ url: String(url), options });
      if (String(url).endsWith('/token')) {
        return new Response(JSON.stringify({ accessToken: 'qoreid-token' }), { status: 200 });
      }
      return new Response('', { status: 200 });
    },
  });
  const response = await replay(request('current-service-key'), { request_id: '199786122' });
  assert.equal(response.status, 200);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, 'https://api.qoreid.com/token');
  assert.deepEqual(JSON.parse(calls[0].options.body), { clientId: 'client-id', secret: 'client-secret' });
  assert.equal(calls[1].url, 'https://api.qoreid.com/v1/webhooks/collection/realtime?requestId=199786122');
  assert.equal(calls[1].options.method, 'POST');
  assert.equal(calls[1].options.headers.Authorization, 'Bearer qoreid-token');
});

test('a rotated service key must pass the Supabase admin API before replay', async () => {
  const calls = [];
  const replay = loadReplay({
    env: baseEnv,
    fetch: async (url, options) => {
      calls.push({ url: String(url), options });
      if (String(url).includes('/auth/v1/admin/users')) return new Response('{}', { status: 200 });
      if (String(url).endsWith('/token')) return new Response(JSON.stringify({ access_token: 'qoreid-token' }), { status: 200 });
      return new Response('', { status: 200 });
    },
  });
  const response = await replay(request('rotated-service-key'), { request_id: '199786122' });
  assert.equal(response.status, 200);
  assert.equal(calls[0].url, 'https://example.supabase.co/auth/v1/admin/users?page=1&per_page=1');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer rotated-service-key');
  assert.equal(calls[0].options.headers.apikey, 'rotated-service-key');
});

test('invalid request IDs and provider failures do not report a successful replay', async () => {
  let calls = 0;
  const invalidReplay = loadReplay({ env: baseEnv, fetch: async () => { calls += 1; } });
  const invalid = await invalidReplay(request('current-service-key'), { request_id: '../new-verification' });
  assert.equal(invalid.status, 400);
  assert.equal(calls, 0);

  const failedReplay = loadReplay({
    env: baseEnv,
    fetch: async () => new Response('{}', { status: 401 }),
  });
  const failed = await failedReplay(request('current-service-key'), { request_id: '199786122' });
  assert.equal(failed.status, 502);
});
