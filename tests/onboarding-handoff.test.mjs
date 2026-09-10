import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const account = fs.readFileSync('account.js','utf8');
const app = fs.readFileSync('app.js','utf8');
function accountView() {
 const context={artisanNextStep:{},artisanProfile:{},claimProfileButton:{},artisanProfileForm:{},currentProfile:{role:'artisan'},window:{location:{href:'https://www.fixam9ja.com/account'}},URL,escapeHtml:s=>String(s),formatNaira:String};
 vm.createContext(context);
 vm.runInContext(account.slice(account.indexOf('function renderArtisanNextStep('),account.indexOf('function fillArtisanProfileForm(')),context);
 return context;
}
test('pending owned application shows waiting status and never asks to claim or repeat verification',()=>{
 const c=accountView(); const applications=[{application_code:'F9-A-test',identity_verification_status:'pending'}];
 c.renderArtisanNextStep(applications,[]); c.renderArtisanProfile([],applications);
 assert.match(c.artisanNextStep.innerHTML,/Waiting for your verification result/);
 assert.match(c.artisanNextStep.innerHTML,/do not need to claim/);
 assert.doesNotMatch(c.artisanNextStep.innerHTML,/Continue to subscription/);
 assert.equal(c.claimProfileButton.hidden,true);
});
test('verified application can proceed to correct billing plan before a public listing exists',()=>{
 const c=accountView(); c.renderArtisanNextStep([{application_code:'F9-A-123',identity_verification_status:'verified',subscription_plan:'biannual'}],[]);
 assert.match(c.artisanNextStep.innerHTML,/billing.html\?application=F9-A-123&plan=biannual/);
 assert.match(c.artisanNextStep.innerHTML,/Continue to subscription/);
});
test('QoreID success keeps subscription action; close cannot overwrite it and next attempt uses its own application',async()=>{
 const handlers={}; const messages=[]; const sdk={on:(event,cb)=>handlers[event]=cb,start:async()=>{}};
 const c={setJoinStatus:(...args)=>messages.push(args),enterQoreIdMode(){},exitQoreIdMode(){},loadQoreIdSdk:async()=>sdk,splitFullName:()=>({first:'Test',last:'User'}),normalizeNigerianPhone:s=>s};
 vm.createContext(c);
 vm.runInContext(app.slice(app.indexOf('let currentQoreIdAction ='),app.indexOf('function enterQoreIdMode(')),c);
 for(const applicationCode of ['F9-A-first','F9-A-second']) {
  await c.launchQoreIdCollection({applicationCode,amount:2500,plan:'monthly'});
  handlers.success(); const message=messages.at(-1); handlers.close();
  assert.equal(messages.at(-1),message); assert.equal(message[2].applicationCode,applicationCode);
  assert.equal(message[2].amount,2500); assert.equal(message[2].sdkSessionToken,undefined);
 }
});
