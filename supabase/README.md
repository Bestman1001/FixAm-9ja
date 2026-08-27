# FixAm 9ja Supabase Setup

1. Open your Supabase project.
2. Go to SQL Editor.
3. Paste and run `supabase/schema.sql`.
4. Go to Project Settings > API.
5. Copy the Project URL and anon public key into `supabase-config.js`.
6. Go to Authentication > URL Configuration.
7. Set Site URL to `https://www.fixam9ja.com/`.
8. Add the production account and admin routes to Redirect URLs: `https://www.fixam9ja.com/account.html`, `https://www.fixam9ja.com/account`, `https://www.fixam9ja.com/admin/login`, `https://www.fixam9ja.com/admin-login`, and `https://www.fixam9ja.com/admin-login.html`.
9. Keep `https://bestman1001.github.io/FixAm-9ja/account.html` only as an allowed staging redirect while GitHub Pages remains in use.
10. Create an admin user in Authentication > Users.
11. Add the admin user to `public.admin_profiles`.

Use this after creating the Supabase Auth user, replacing the email:

```sql
insert into public.admin_profiles (user_id, email)
select id, email
from auth.users
where email = 'you@example.com'
on conflict (user_id) do update set email = excluded.email;
```

The public website gets insert access to `quote_requests`, `artisan_applications`, customer reviews, media metadata, the public `fixam-media` Storage bucket, and the private `fixam-verification` Storage bucket for identity proof uploads. Anonymous visitors can read active artisan profiles, public review summaries, public media metadata, and artisan standing so marketplace listings and ratings can update. Anonymous visitors cannot read private quote/customer details or identity verification media.

## Artisan Directory Flow

1. Artisan submits the public onboarding form with NIN consent and a selfie/liveness proof.
2. Admin opens `admin.html` and reviews the application.
3. Admin clicks `Create artisan profile`.
4. The profile is inserted into `public.artisans` and appears in the public directory when its profile status is `active`.
5. Admin can manage profile status, plan, verification, and quality standing from the dashboard.

## Review Flow

1. Admin opens `admin.html`.
2. Admin copies a review link from a quote request after the job is done.
3. Customer opens the link and submits `review.html`.
4. Review publishes automatically.
5. Admin can hide/flag unsafe reviews, or mark an artisan as warning, suspended, or removed.

## Accounts + Media Flow

1. Run the latest `schema.sql` to create `user_profiles`, `media_uploads`, and the `fixam-media` Storage bucket.
2. Customers or artisans open `account.html` and create/sign into an account.
3. Public quote requests, artisan applications, and reviews can attach up to four image/video files per submission.
4. Artisans can claim a listed profile when their account phone number matches an unowned artisan profile.
5. Claimed artisans can see a quote-lead count for customer requests sent to their artisan profile.
6. Claimed artisans can upload portfolio media from the account dashboard.

## LGA + Town Location Model

Run the latest `schema.sql` before deploying the LGA interface. The canonical location fields are `state`, `lga`, and optional `town`. The legacy `area` fields remain populated with the LGA value for compatibility with existing profiles, quote links, and older deployments. FCT users select an Area Council through the same LGA/Area Council control.

## QoreID NIN-Liveness Collection Verification

The browser must never call an identity provider directly. Deploy `supabase/functions/verify-nin` and store VerifyMe/QoreID, Youverify, or another provider's credentials as Supabase Edge Function secrets.

Minimum deploy flow:

```bash
supabase functions deploy verify-nin
```

Production secrets:

```bash
supabase secrets set IDENTITY_PROVIDER_NAME=your_provider_name
supabase secrets set IDENTITY_PROVIDER_URL=https://provider.example/verify-identity
supabase secrets set IDENTITY_PROVIDER_API_KEY=provider_secret_key
```

QoreID Collection SDK verification secrets:

```bash
supabase secrets set IDENTITY_PROVIDER_NAME=qoreid
supabase secrets set IDENTITY_PROVIDER_MODE=live
supabase secrets set QOREID_CLIENT_ID=your_qoreid_client_id
supabase secrets set QOREID_CLIENT_SECRET=your_qoreid_client_secret
supabase secrets set QOREID_PRODUCT_CODE=liveness_nin
```

The function now always mints a QoreID Collection SDK session with `POST https://api.qoreid.com/v1/sessions` using `{ "type": "collection", "productCode": "liveness_nin", "reference": "...", "subjectRef": "..." }`. The browser starts the QoreID Web SDK with the returned short-lived, single-use `sdkSessionToken`. There is no workflow or direct NIN API fallback. Collection ID `30423` is configured in QoreID; it is not sent as the SDK `productCode`.

Run `qoreid-collection-readiness.sql` once in the Supabase SQL Editor before testing. It replaces the former policy that required a duplicate selfie upload with an authenticated, account-owned application policy.

QoreID webhook for automatic artisan verification:

```text
https://bqzbadvqozpmdkmdenly.supabase.co/functions/v1/qoreid-webhook
```

Add this URL as the Collection test webhook, then as the live webhook when QoreID activates Collection `30423`. Set the same secret in QoreID and `QOREID_WEBHOOK_SECRET`; the function validates QoreID's `x-verifyme-signature` HMAC-SHA512 header against the unmodified request body. When QoreID posts a successful NIN-liveness result, FixAm 9ja automatically marks the artisan application as verified, creates or updates the artisan profile, and applies the existing marketplace visibility rules.

Optional secrets:

```bash
supabase secrets set IDENTITY_PROVIDER_AUTH_HEADER=Authorization
supabase secrets set IDENTITY_PROVIDER_MODE=mock
supabase secrets set QOREID_BASE_URL=https://api.qoreid.com
supabase secrets set QOREID_WEBHOOK_SECRET=optional_shared_secret
```

The older `NIN_PROVIDER_*` names also work for compatibility. `IDENTITY_PROVIDER_MODE=mock` is for local/product testing only. Do not use mock mode for launch. If no provider URL/key is set, applications remain `pending` and the function records that the provider is not configured.

The function stores only:

- `nin_last4`
- NIN and liveness consent timestamps
- provider liveness media count (the QoreID SDK captures liveness; FixAm does not upload a duplicate selfie)
- verification status
- provider reference
- small response summary

It does not store raw NIN or a duplicate browser-captured selfie. QoreID performs the NIN and live-face capture inside its secure SDK session; FixAm stores only the last four NIN digits, consent, provider reference, status, and a small response summary.
