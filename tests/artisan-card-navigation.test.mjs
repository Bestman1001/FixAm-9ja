import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync('app.js', 'utf8');
const css = fs.readFileSync('styles.css', 'utf8');

test('artisan card summary and explicit button both open the profile', () => {
  assert.match(app, /class="artisan-card-profile"[^>]*data-action="profile"[^>]*data-artisan-id=/);
  assert.match(app, /<button type="button" data-action="profile"[^>]*>View profile<\/button>/);
  assert.match(app, /const button = event\.target\.closest\("\[data-action\]\[data-artisan-id\]"\)/);
});

test('clickable card summary keeps quote action separate and is keyboard accessible', () => {
  assert.match(app, /class="artisan-card-profile" type="button"/);
  assert.match(app, /data-action="quote"[^>]*>Request quote<\/button>/);
  assert.match(app, /aria-label="View \$\{escapeHtml\(artisan\.name\)\} profile"/);
});

test('clickable card has clear hover and keyboard focus feedback', () => {
  assert.match(css, /\.artisan-card-profile\s*\{[^}]*cursor:\s*pointer/s);
  assert.match(css, /\.artisan-card-profile:focus-visible\s*\{[^}]*outline:/s);
  assert.match(css, /\.artisan-card:has\(\.artisan-card-profile:hover\)/);
});
