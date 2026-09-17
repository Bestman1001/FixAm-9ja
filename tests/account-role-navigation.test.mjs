import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const account = fs.readFileSync('account.js', 'utf8');
const html = fs.readFileSync('account.html', 'utf8');

function roleView(role) {
  const subscriptionLink = { hidden: false };
  const sections = [
    { dataset: { accountView: 'customer' }, hidden: false },
    { dataset: { accountView: 'artisan' }, hidden: false },
  ];
  const dashboardTitle = { textContent: '' };
  const context = {
    currentProfile: { role, full_name: 'Test User' },
    subscriptionLink,
    document: {
      body: { dataset: {} },
      querySelectorAll: () => sections,
      querySelector: () => dashboardTitle,
    },
  };
  vm.createContext(context);
  const start = account.indexOf('function applyAccountRoleView()');
  const end = account.indexOf('function isMissingLocationColumn(', start);
  vm.runInContext(account.slice(start, end), context);
  context.applyAccountRoleView();
  return { subscriptionLink, sections, dashboardTitle };
}

test('subscription navigation starts hidden before an account role loads', () => {
  assert.match(html, /id="subscriptionLink"[^>]*hidden/);
});

test('customer dashboard hides subscription navigation', () => {
  const view = roleView('customer');
  assert.equal(view.subscriptionLink.hidden, true);
  assert.equal(view.sections[0].hidden, false);
  assert.equal(view.sections[1].hidden, true);
});

test('artisan dashboard shows subscription navigation', () => {
  const view = roleView('artisan');
  assert.equal(view.subscriptionLink.hidden, false);
  assert.equal(view.sections[0].hidden, true);
  assert.equal(view.sections[1].hidden, false);
});
