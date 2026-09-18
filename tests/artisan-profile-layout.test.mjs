import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync('app.js', 'utf8');
const css = fs.readFileSync('styles.css', 'utf8');

test('public review stars use the marketplace rating colour', () => {
  assert.match(app, /class="review-star">★/);
  assert.match(css, /\.review-star\s*\{[^}]*color:\s*var\(--gold\)/s);
});

test('profile content clears the close control and is centred in the modal', () => {
  assert.match(css, /\.profile-panel \.modal-close\s*\{[^}]*float:\s*none/s);
  assert.match(css, /\.profile-panel #profileContent\s*\{[^}]*width:\s*min\(820px, 100%\)[^}]*margin:\s*0 auto/s);
});

test('mobile artisan profiles centre the portrait and information with visible spacing', () => {
  assert.match(css, /\.profile-panel \.profile-hero\s*\{[^}]*justify-items:\s*center[^}]*gap:\s*28px[^}]*text-align:\s*center/s);
  assert.match(css, /\.profile-panel \.profile-avatar\s*\{[^}]*margin-inline:\s*auto/s);
  assert.match(css, /\.profile-avatar\s*\{[^}]*overflow:\s*hidden/s);
});
