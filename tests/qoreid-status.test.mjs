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
