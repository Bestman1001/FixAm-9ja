import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
const source=fs.readFileSync('supabase/functions/qoreid-webhook/index.ts','utf8');
const code=source.slice(source.indexOf('function normalizeQoreIdStatus('),source.indexOf('function extractProviderMessage('));
const context=vm.createContext({}); vm.runInContext(stripTypeScriptTypes(code),context);
const status=context.normalizeQoreIdStatus;
test('completed or successful request alone cannot approve identity',()=>{
 for(const payload of [{status:'completed'},{status:{state:'complete'}},{success:true},{status:'success'}]) assert.equal(status(payload),'pending');
});
test('failed liveness overrides completion and successful identity components',()=>{
 assert.equal(status({status:{state:'COMPLETE',status:'NOT LIVE'},identity:{status:'verified'},success:true}),'failed');
 assert.equal(status({status:'complete',verified:false}),'failed');
 assert.equal(status({identity:{status:'verified'},liveness:{status:'mismatched'}}),'failed');
});
test('explicit verified result is accepted without confusing live environment flag',()=>{
 assert.equal(status({status:{state:'COMPLETE',status:'VERIFIED'},isLive:true}),'verified');
});

// Only verdict fields from the support sample are retained: no identity data,
// media URLs, photos or biometric blobs belong in a test fixture.
const supportSample = {
 eventType:'identity', customerReference:'test-reference',
 metadata:{type:'nin',isLive:true,match:true},
 summary:{liveness_check:{isLive:true,match:true},nin_check:{status:'PARTIAL_MATCH',fieldMatches:{firstname:true,lastname:true,phoneNumber:false}}},
 status:{state:'complete',status:'verified'},liveness:{isLive:true,match:true}
};
test('QoreID support sample uses final verdict and biometric outcomes, not optional phone match',()=>{
 assert.equal(status(supportSample),'verified');
 for(const path of ['liveness','metadata']) {
  const failed=structuredClone(supportSample); failed[path].isLive=false;
  assert.equal(status(failed),'failed');
 }
 const mismatch=structuredClone(supportSample); mismatch.summary.liveness_check.match=false;
 assert.equal(status(mismatch),'failed');
 assert.equal(status({status:{status:'verified'},liveness:{isLive:true}}),'pending');
});
test('unsigned collection payload cannot be acknowledged as a readiness probe',()=>{
 const probeCode=source.slice(source.indexOf('function isWebhookReadinessProbe('),source.indexOf('async function hasValidWebhookSignature('));
 vm.runInContext(stripTypeScriptTypes(probeCode),context);
 assert.equal(context.isWebhookReadinessProbe('{}'),true);
 assert.equal(context.isWebhookReadinessProbe(JSON.stringify(supportSample)),false);
 assert.equal(context.isWebhookReadinessProbe('{"status":{"status":"verified"}}'),false);
});
