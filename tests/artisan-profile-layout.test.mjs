import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync('app.js', 'utf8');
const css = fs.readFileSync('styles.css', 'utf8');

test('public review stars use the marketplace rating colour', () => {
  assert.match(app, /class="review-star">★/);
  assert.match(css, /\.review-star\s*\{[^}]*color:\s*var\(--gold\)/s);
});

test('profile content clears the close control while keeping its original left layout', () => {
  assert.match(css, /\.profile-panel #profileContent\s*\{[^}]*clear:\s*both[^}]*padding-top:\s*18px/s);
  assert.doesNotMatch(css, /\.profile-panel \.modal-close\s*\{[^}]*float:\s*none/s);
  assert.doesNotMatch(css, /\.profile-panel #profileContent\s*\{[^}]*text-align:\s*center/s);
});

test('only profession, description and skills are centred', () => {
  assert.match(app, /class="eyebrow profile-profession"/);
  assert.match(app, /class="profile-description"/);
  assert.match(app, /class="profile-skills"/);
  assert.match(css, /\.profile-profession,\s*\.profile-description,\s*\.profile-skills\s*\{[^}]*text-align:\s*center/s);
  assert.doesNotMatch(css, /\.profile-panel \.profile-metrics span[^}]*text-align:\s*center/s);
  assert.doesNotMatch(css, /\.profile-panel \.portfolio-grid article[^}]*text-align:\s*center/s);
});

test('mobile portrait remains left aligned with visible space before its wording', () => {
  assert.match(css, /\.profile-panel \.profile-hero\s*\{[^}]*gap:\s*28px/s);
  assert.doesNotMatch(css, /\.profile-panel \.profile-avatar\s*\{[^}]*margin-inline:\s*auto/s);
  assert.match(css, /\.profile-avatar\s*\{[^}]*overflow:\s*hidden/s);
});
