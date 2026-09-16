import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const account = fs.readFileSync('account.js','utf8');
const app = fs.readFileSync('app.js','utf8');
function accountView() {
 const context={artisanNextStep:{},artisanProfile:{},claimProfileButton:{},artisanProfileForm:{},currentProfile:{role:'artisan'},window:{location:{href:'https://www.fixam9ja.com/account'}},URL,escapeHtml:s=>String(s),formatNaira:String,safePublicImageUrl:value=>value || ''};
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
test('verified application waits for its automated artisan profile',()=>{
 const c=accountView(); c.renderArtisanNextStep([{application_code:'F9-A-123',identity_verification_status:'verified',subscription_plan:'biannual'}],[]);
 assert.match(c.artisanNextStep.innerHTML,/preparing your artisan profile/);
 assert.doesNotMatch(c.artisanNextStep.innerHTML,/Continue to subscription/);
});
test('verified artisan adds a public photograph before payment',()=>{
 const c=accountView(); const application={application_code:'F9-A-123',identity_verification_status:'verified',subscription_plan:'biannual'};
 c.renderArtisanNextStep([application],[{identity_verification_status:'verified',profile_image_url:null}]);
 assert.match(c.artisanNextStep.innerHTML,/Add your public profile photograph/);
 assert.doesNotMatch(c.artisanNextStep.innerHTML,/Continue to subscription/);
 c.renderArtisanNextStep([application],[{identity_verification_status:'verified',profile_image_url:'https:\/\/cdn.example.com\/photo.jpg'}]);
 assert.match(c.artisanNextStep.innerHTML,/billing.html\?application=F9-A-123&plan=biannual/);
 assert.match(c.artisanNextStep.innerHTML,/Continue to subscription/);
});
test('artisan onboarding progress is derived from saved application, verification, photo, and membership records',()=>{
 const start=account.indexOf('function artisanOnboardingState(');
 const end=account.indexOf('function renderArtisanOnboardingGuide(');
 const c={safePublicImageUrl:value=>value || ''};
 vm.createContext(c); vm.runInContext(account.slice(start,end),c);
 const application={application_code:'F9-A-123',identity_verification_status:'verified',subscription_status:'pending'};
 const artisan={identity_verification_status:'verified',profile_image_url:'https://cdn.example.com/photo.jpg',subscription_status:'pending'};
 assert.deepEqual([...c.artisanOnboardingState([],[]).complete],[true,false,false,false,false]);
 assert.deepEqual([...c.artisanOnboardingState([application],[artisan]).complete],[true,true,true,true,false]);
 artisan.subscription_status='active';
 assert.deepEqual([...c.artisanOnboardingState([application],[artisan]).complete],[true,true,true,true,true]);
});
test('QoreID success redirects to the matching artisan account handoff and close cannot overwrite it',async()=>{
 const handlers={}; const messages=[]; const redirects=[]; const sdk={on:(event,cb)=>handlers[event]=cb,start:async()=>{}};
 const c={setJoinStatus:(...args)=>messages.push(args),rememberArtisanOnboarding(){},enterQoreIdMode(){},exitQoreIdMode(){},loadQoreIdSdk:async()=>sdk,splitFullName:()=>({first:'Test',last:'User'}),normalizeNigerianPhone:s=>s,URL,window:{location:{origin:'https://www.fixam9ja.com',assign:url=>redirects.push(url)},setTimeout:callback=>callback()}};
 vm.createContext(c);
 vm.runInContext(app.slice(app.indexOf('let currentQoreIdAction ='),app.indexOf('function enterQoreIdMode(')),c);
 for(const applicationCode of ['F9-A-first','F9-A-second']) {
  await c.launchQoreIdCollection({applicationCode,amount:2500,plan:'monthly'});
  handlers.success(); const message=messages.at(-1); handlers.close();
  assert.equal(messages.at(-1),message);
  assert.match(message[0],/Taking you to your artisan account/);
  assert.match(redirects.at(-1),new RegExp(`account\\.html\\?onboarding=artisan&source=verification&application=${applicationCode}`));
 }
});
