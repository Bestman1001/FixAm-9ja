import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

test('billing migration, permissions, payment idempotency and paid-access lifecycle', async (t) => {
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
  for (const file of ['schema.sql', 'admin-automation.sql', 'app-readiness.sql', 'qoreid-collection-readiness.sql', 'admin-user-counts.sql', 'paystack-billing.sql', 'paystack-billing.sql']) {
    await db.exec(await readFile(new URL(`../supabase/${file}`, import.meta.url), 'utf8'));
  }
  const uid = '00000000-0000-4000-8000-000000000001';
  await db.query(`insert into auth.users(id,email) values ($1,'artisan@example.com')`, [uid]);
  const app = (await db.query(`insert into artisan_applications(application_code,full_name,trade,state,area,phone,preferred_plan,applicant_user_id,identity_verification_status,work_summary)
    values ('APP-1','Test Artisan','Plumber','Lagos','Ikeja','08012345678','biannual',$1,'verified','Plumbing services') returning id`, [uid])).rows[0].id;
  const artisan = (await db.query(`insert into artisans(application_id,owner_user_id,business_name,owner_name,phone,category,state,area,lat,lng,verification_status,identity_verification_status,subscription_status)
    values ($1,$2,'Test Artisan','Test Artisan','08012345678','Plumber','Lagos','Ikeja',6.6,3.3,'verified','verified','pending') returning id`, [app, uid])).rows[0].id;
  const billing = (await db.query(`insert into billing_subscriptions(user_id,application_id,artisan_id,email,plan,amount_kobo,plan_code,reference)
    values ($1,$2,$3,'artisan@example.com','biannual',1200000,'PLN_six','F9-first') returning id`, [uid, app, artisan])).rows[0].id;
  const apply = (ref, amount = 1200000, paid = new Date().toISOString()) => db.query(`select fixam_apply_paystack_payment($1,$2,$3,$4) as expiry`, [billing, ref, amount, paid]);
  const first = (await apply('F9-first')).rows[0].expiry;
  assert.equal((await apply('F9-first')).rows[0].expiry.getTime(), first.getTime(), 'duplicate delivery must not extend access');
  assert.equal((await db.query('select count(*)::int as n from billing_payments')).rows[0].n, 1);
  assert.equal((await db.query('select subscription_status from artisans where id=$1', [artisan])).rows[0].subscription_status, 'active');
  await assert.rejects(apply('F9-wrong-amount', 1), /Invalid payment/);
  await assert.rejects(apply('F9-future', 1200000, '2099-01-01'), /Invalid payment/);
  const older = new Date(); older.setUTCFullYear(older.getUTCFullYear() - 1);
  assert.equal((await apply('F9-late-delivery', 1200000, older.toISOString())).rows[0].expiry.getTime(), first.getTime());
  await db.query(`update billing_subscriptions set provider_status='non-renewing' where id=$1`, [billing]);
  assert.equal((await db.query('select subscription_expires_at from artisans where id=$1', [artisan])).rows[0].subscription_expires_at.getTime(), first.getTime());
  // The identity webhook must not replace paid dates or plan with founding defaults.
  await db.query(`update artisans set subscription_status='founding',subscription_plan='monthly' where id=$1`, [artisan]);
  assert.equal((await db.query('select subscription_plan from artisans where id=$1', [artisan])).rows[0].subscription_plan, 'biannual');
  await db.exec(`set role anon`);
  assert.equal((await db.query('select count(*)::int as n from artisans')).rows[0].n, 1);
  await assert.rejects(db.query('select * from billing_subscriptions'), /permission denied/);
  await assert.rejects(apply('F9-forged'), /permission denied/);
  await db.exec(`reset role; set role authenticated; set request.jwt.claim.role='authenticated'; set request.jwt.claim.sub='${uid}'`);
  await assert.rejects(db.query(`update artisans set subscription_expires_at='2099-01-01' where id=$1`, [artisan]), /Billing fields/);
  await db.exec(`reset role; reset request.jwt.claim.role; reset request.jwt.claim.sub`);
  await db.query(`update billing_subscriptions set paid_through=now()-interval '1 second' where id=$1`, [billing]);
  // Expiration is enforced even before status rows are refreshed by an operator.
  await db.query(`update artisans set subscription_expires_at=now()-interval '1 second' where id=$1`, [artisan]);
  await db.exec('set role anon');
  assert.equal((await db.query('select count(*)::int as n from artisans')).rows[0].n, 0);
  await db.exec('reset role');
  // An inactive listing must not be made public just because payment succeeds.
  await db.query(`update artisans set profile_status='suspended' where id=$1`, [artisan]);
  await apply('F9-renewal');
  assert.equal((await db.query('select profile_status from artisans where id=$1', [artisan])).rows[0].profile_status, 'suspended');
  await db.exec(`set role authenticated; set request.jwt.claim.role='authenticated'; set request.jwt.claim.sub='${uid}'`);
  await assert.rejects(db.query('select fixam_prepare_account_deletion()'), /Cancel recurring billing/);
  await assert.rejects(db.query('select fixam_prepare_account_deletion_data()'), /permission denied/);
  await db.exec('reset role; reset request.jwt.claim.role; reset request.jwt.claim.sub');
  await assert.rejects(db.query('delete from auth.users where id=$1', [uid]), /Cancel recurring billing/);
  await db.query(`update billing_subscriptions set subscription_code='SUB_test',provider_status='non-renewing' where id=$1`, [billing]);
  await db.exec(`set role authenticated; set request.jwt.claim.role='authenticated'; set request.jwt.claim.sub='${uid}'`);
  await db.query('select fixam_prepare_account_deletion()');
  await db.exec('reset role; reset request.jwt.claim.role; reset request.jwt.claim.sub');
  await db.query('delete from auth.users where id=$1', [uid]);
  const deleted = (await db.query('select email,user_id,closed_at from billing_subscriptions where id=$1', [billing])).rows[0];
  assert.equal(deleted.email, 'deleted'); assert.equal(deleted.user_id, null); assert.ok(deleted.closed_at);
  await assert.rejects(apply('F9-deleted'), /Billing account unavailable/);
});
