import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

const account = await readFile(new URL('../account.js', import.meta.url), 'utf8');
const review = await readFile(new URL('../review.js', import.meta.url), 'utf8');
const migration = await readFile(new URL('../supabase/quote-negotiation.sql', import.meta.url), 'utf8');

test('quote room exposes calls, two-sided price negotiation, completion response, and review handoff', () => {
  assert.match(account, /href="tel:\$\{escapeHtml\(callable\)\}"/);
  assert.match(account, /make_quote_offer/);
  assert.match(account, /respond_to_quote_offer/);
  assert.match(account, /data-quote-completion="confirmed"/);
  assert.match(account, /data-quote-completion="disputed"/);
  assert.match(review, /account\.html\?review=published/);
});

test('quote negotiation migration enforces participants, bounded prices, and one completion response', () => {
  assert.match(migration, /amount integer not null check \(amount between 100 and 100000000\)/i);
  assert.match(migration, /q\.customer_user_id = auth\.uid\(\)/);
  assert.match(migration, /a\.owner_user_id = auth\.uid\(\)/);
  assert.match(migration, /The other party must respond to this price offer/);
  assert.match(migration, /artisan_completion_status <> 'pending'/);
  assert.match(migration, /completed_jobs = completed_jobs \+ 1/);
});

test('linked customer and artisan negotiate and acknowledge completion through database RPCs', async (t) => {
  const db = new PGlite({ extensions: { pgcrypto } });
  t.after(() => db.close());
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'service_role') $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid, bucket_id text, name text, owner uuid);
    create function storage.foldername(text) returns text[] language sql as $$ select string_to_array($1, '/') $$;
    grant usage on schema public, auth, storage to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant usage on sequences to anon, authenticated, service_role;
  `);
  for (const file of ['schema.sql', 'app-readiness.sql', 'quote-negotiation.sql']) {
    await db.exec(await readFile(new URL(`../supabase/${file}`, import.meta.url), 'utf8'));
  }

  const customerId = '00000000-0000-4000-8000-000000000011';
  const artisanId = '00000000-0000-4000-8000-000000000012';
  const strangerId = '00000000-0000-4000-8000-000000000013';
  await db.query(`insert into auth.users(id,email) values ($1,'customer@example.com'),($2,'artisan@example.com'),($3,'stranger@example.com')`, [customerId, artisanId, strangerId]);
  const artisan = (await db.query(`insert into artisans(owner_user_id,business_name,owner_name,phone,category,state,area,lat,lng)
    values ($1,'Test Repairs','Test Artisan','08010000000','Electrician','Edo','Oredo',6.3,5.6) returning id`, [artisanId])).rows[0].id;
  const quoteId = (await db.query(`insert into quote_requests(request_code,artisan_id,artisan_name,artisan_category,artisan_state,artisan_area,customer_name,customer_phone,job_location,urgency,job_details,customer_user_id,status)
    values ('F9-Q-TEST',$1,'Test Repairs','Electrician','Edo','Oredo','Test Customer','08020000000','Benin','Today','Repair a socket',$2,'accepted') returning id`, [artisan, customerId])).rows[0].id;

  await db.exec(`set role authenticated; set request.jwt.claim.role='authenticated'; set request.jwt.claim.sub='${artisanId}'`);
  const offer = (await db.query(`select (public.make_quote_offer($1,15000,'Parts and labour')).id as id`, [quoteId])).rows[0];
  assert.ok(offer.id);
  await db.exec(`reset role; reset request.jwt.claim.role; reset request.jwt.claim.sub; set role authenticated; set request.jwt.claim.role='authenticated'; set request.jwt.claim.sub='${customerId}'`);
  await db.query(`select public.respond_to_quote_offer($1,'accepted')`, [offer.id]);
  assert.equal((await db.query(`select agreed_amount from quote_requests where id=$1`, [quoteId])).rows[0].agreed_amount, 15000);
  await db.query(`select public.update_customer_quote_status($1,'completed')`, [quoteId]);
  assert.equal((await db.query(`select artisan_completion_status from quote_requests where id=$1`, [quoteId])).rows[0].artisan_completion_status, 'pending');

  await db.exec(`reset role; reset request.jwt.claim.role; reset request.jwt.claim.sub; set role authenticated; set request.jwt.claim.role='authenticated'; set request.jwt.claim.sub='${artisanId}'`);
  await db.query(`select public.respond_to_quote_completion($1,'confirmed',null)`, [quoteId]);
  assert.equal((await db.query(`select artisan_completion_status from quote_requests where id=$1`, [quoteId])).rows[0].artisan_completion_status, 'confirmed');
  assert.equal((await db.query(`select completed_jobs from artisans where id=$1`, [artisan])).rows[0].completed_jobs, 1);
  await assert.rejects(db.query(`select public.respond_to_quote_completion($1,'confirmed',null)`, [quoteId]), /already been recorded/);

  await db.exec(`reset role; reset request.jwt.claim.role; reset request.jwt.claim.sub; set role authenticated; set request.jwt.claim.role='authenticated'; set request.jwt.claim.sub='${strangerId}'`);
  assert.equal((await db.query(`select count(*)::int as count from quote_offers`)).rows[0].count, 0);
  await assert.rejects(db.query(`select public.make_quote_offer($1,20000,null)`, [quoteId]), /Only the linked customer or artisan/);
});
