import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const home = fs.readFileSync('index.html', 'utf8');
const accountHtml = fs.readFileSync('account.html', 'utf8');
const accountJs = fs.readFileSync('account.js', 'utf8');
const homeCss = fs.readFileSync('styles.css', 'utf8');
const accountCss = fs.readFileSync('account.css', 'utf8');

test('homepage presents distinct customer and artisan entry paths', () => {
  assert.match(home, /For customers[\s\S]*I need a service[\s\S]*Join as a Customer/);
  assert.match(home, /For skilled workers[\s\S]*I provide services[\s\S]*Join as an Artisan/);
  assert.match(home, /account\.html\?role=customer&amp;intent=signup/);
  assert.match(homeCss, /\.audience-paths\s*\{[\s\S]*grid-template-columns:\s*repeat\(2/);
});

test('account page uses large explicit role choices instead of an ambiguous dropdown', () => {
  assert.match(accountHtml, /data-account-role="customer"[\s\S]*I need a service/);
  assert.match(accountHtml, /data-account-role="artisan"[\s\S]*I provide services/);
  assert.doesNotMatch(accountHtml, /<select id="accountRole">/);
  assert.match(accountCss, /\.account-role-choice\[aria-pressed="true"\]/);
});

test('role choice updates the sign-in explanation and survives OAuth redirects', () => {
  assert.match(accountJs, /function selectAccountRole\(role/);
  assert.match(accountJs, /Continue with Google as \$\{article\} \$\{roleLabel\}/);
  assert.match(accountJs, /url\.searchParams\.set\("role", role === "artisan" \? "artisan" : "customer"\)/);
});

test('an established account keeps its saved role when entered through the wrong path', () => {
  assert.match(accountJs, /const hasSavedRole = data\.role === "customer" \|\| data\.role === "artisan"/);
  assert.match(accountJs, /const savedRole = hasSavedRole \? data\.role : \(requestedRole \|\| "customer"\)/);
  assert.match(accountJs, /accountRoleMismatch = \{ requestedRole, savedRole \}/);
  assert.match(accountJs, /role:\s*savedRole/);
  assert.match(accountJs, /kept its saved account type unchanged/);
});
