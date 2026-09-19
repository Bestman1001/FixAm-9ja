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

test('profession, title, description and skills use neat left alignment', () => {
  assert.match(app, /class="eyebrow profile-profession"/);
  assert.match(app, /class="profile-description"/);
  assert.match(app, /class="profile-skills"/);
  assert.match(css, /\.profile-profession,\s*\.profile-description,\s*\.profile-skills\s*\{[^}]*text-align:\s*left/s);
  assert.match(css, /\.profile-skills\s*\{[^}]*grid-column:\s*1 \/ -1/s);
  assert.match(css, /\.profile-skills \.badge-row\s*\{[^}]*justify-content:\s*flex-start/s);
  assert.doesNotMatch(css, /\.profile-panel \.profile-metrics span[^}]*text-align:\s*center/s);
  assert.doesNotMatch(css, /\.profile-panel \.portfolio-grid article[^}]*text-align:\s*center/s);
});

test('portrait remains left aligned and wording uses the full width beneath it', () => {
  assert.match(css, /\.profile-hero\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)[^}]*gap:\s*28px[^}]*width:\s*100%[^}]*padding-right:\s*0/s);
  assert.match(css, /\.profile-description\s*\{[^}]*width:\s*100%[^}]*max-width:\s*none/s);
  assert.doesNotMatch(css, /\.profile-panel \.profile-avatar\s*\{[^}]*margin-inline:\s*auto/s);
  assert.match(css, /\.profile-avatar\s*\{[^}]*overflow:\s*hidden/s);
});
