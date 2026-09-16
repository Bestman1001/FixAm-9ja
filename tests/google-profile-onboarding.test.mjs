import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const home = fs.readFileSync('index.html', 'utf8');
const account = fs.readFileSync('account.html', 'utf8');
const homeScript = fs.readFileSync('app.js', 'utf8');
const accountScript = fs.readFileSync('account.js', 'utf8');
const migration = fs.readFileSync('supabase/nin-face-match-profile-readiness.sql', 'utf8');

test('customer and artisan entry points offer Google OAuth through Supabase', () => {
  assert.match(home, /id="joinGoogleButton"/);
  assert.match(account, /id="googleSignInButton"/);
  assert.match(home, /class="google-icon" src="google-g-logo\.png"/);
  assert.match(account, /class="google-icon" src="google-g-logo\.png"/);
  for (const source of [homeScript, accountScript]) {
    assert.match(source, /signInWithOAuth\(\{[\s\S]*provider:\s*"google"/);
    assert.match(source, /redirectTo:/);
  }
  assert.match(homeScript, /hasGoogleIntent\s*=\s*Boolean\(sessionStorage\.getItem\(googleJoinIntentKey\)\)/);
  assert.match(homeScript, /auth"\) !== "google" && !hasGoogleIntent/);
  assert.match(homeScript, /new URL\("\/account\.html", window\.location\.origin\)/);
  assert.match(homeScript, /url\.searchParams\.set\("onboarding", "artisan"\)/);
});

test('artisan authentication lands on a guided, resumable account checklist', () => {
  assert.match(account, /id="artisanOnboardingGuide"/);
  assert.match(account, /id="artisanOnboardingChecklist"/);
  assert.match(account, /id="artisanOnboardingContinue"/);
  assert.match(accountScript, /function artisanOnboardingState\(/);
  assert.match(accountScript, /function renderArtisanOnboardingGuide\(/);
  assert.match(accountScript, /Continue artisan registration/);
  assert.match(accountScript, /Add public profile photograph/);
  assert.match(accountScript, /Choose payment and activate membership/);
  assert.match(accountScript, /localStorage\.setItem\(artisanOnboardingIntentKey/);
  assert.match(homeScript, /async function resumeArtisanOnboarding\(/);
  assert.match(homeScript, /Welcome back\. Your account details are saved/);
  assert.match(homeScript, /continueToArtisanAccount\(completedAction\)/);
  assert.match(accountScript, /function scheduleVerificationStatusRefresh\(/);
  assert.match(accountScript, /Confirming your QoreID result/);
});

test('completed artisans get a live workspace instead of repeated onboarding controls', () => {
  assert.match(account, /id="profileRole" type="hidden"/);
  assert.doesNotMatch(account, /<select id="profileRole">/);
  assert.match(account, /id="accountSettings"/);
  assert.match(account, /id="artisanLiveActions"/);
  assert.match(account, /id="artisanApplicationsCard"/);
  assert.match(account, /id="profilePhotoEditor"/);
  assert.match(account, /id="artisanProfileEditor"/);
  assert.match(accountScript, /artisanOnboardingChecklist\.hidden = isComplete/);
  assert.match(accountScript, /artisanLiveActions\.hidden = !isComplete/);
  assert.match(accountScript, /Your artisan profile is live/);
  assert.match(accountScript, /View artisan marketplace/);
});

test('new artisan applications record face-match consent', () => {
  assert.match(homeScript, /face_match_consent:\s*hasNinConsent/);
  assert.match(homeScript, /face_match_consent_at:/);
  assert.doesNotMatch(homeScript, /liveness_consent:\s*hasNinConsent/);
});

test('marketplace publication requires the public profile photograph', () => {
  assert.match(migration, /profile_image_url is not null/);
  assert.match(migration, /btrim\(profile_image_url\) <> ''/);
  assert.match(accountScript, /Add your public profile photograph/);
});
