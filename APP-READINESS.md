# FixAm 9ja app-readiness runbook

## Environments

Use separate Supabase projects for development, staging and production. Never test migrations, identity providers or account deletion against production first. Keep only the public anonymous key in browser configuration; store service-role, QoreID and webhook secrets exclusively in Supabase Function secrets.

Required production function secrets:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_ORIGIN`
- `QOREID_WEBHOOK_SECRET`
- QoreID/provider credentials used by `verify-nin`

Production must not set `IDENTITY_PROVIDER_MODE=mock`, `NIN_PROVIDER_MODE=mock`, or `ALLOW_MOCK_IDENTITY=true`.

## Production mailboxes

- `info@fixam9ja.com`: public information and general enquiries.
- `support@fixam9ja.com`: account access, technical support and safety reports.
- `customers@fixam9ja.com`: customer quotes, jobs, reviews and disputes.
- `artisans@fixam9ja.com`: artisan applications, profiles, onboarding and leads.
- `verification@fixam9ja.com`: NIN/liveness verification support.
- `payments@fixam9ja.com`: subscriptions, payment confirmation, cancellation and refunds.
- `privacy@fixam9ja.com`: privacy rights, retention and account deletion.
- `admin@fixam9ja.com`: internal administration only; do not publish as a support address.

Configure Supabase Auth custom SMTP with sender name `FixAm 9ja` and sender address
`no-reply@auth.fixam9ja.com`. Use `support@fixam9ja.com` as the support or reply-to address where the provider supports it.
Verify SPF, DKIM and DMARC for the authentication sending domain before sending production authentication email.

## Deployment order

1. Back up the production database and test restoration in staging.
2. Apply `supabase/schema.sql` to a fresh project when provisioning.
3. Apply `supabase/admin-automation.sql`.
4. Apply `supabase/app-readiness.sql`.
5. Deploy `verify-nin`, `qoreid-webhook` and `delete-account` Edge Functions.
6. Configure allowed authentication redirect URLs for production and staging.
7. Validate Row Level Security with separate customer, artisan, admin and anonymous sessions.
8. Run `./scripts/verify-production.ps1` before deployment.

## Mandatory release tests

- Customer registration, email confirmation, sign-in and sign-out.
- Artisan registration, application ownership, identity verification and profile activation.
- Customer quote creation; artisan access is limited to its own leads.
- Quote status notification and notification preference updates.
- Admin role enforcement and MFA on every production administrator account.
- Private verification media cannot be read by customers, artisans or anonymous visitors.
- Unsupported or oversized uploads are rejected.
- Account deletion removes authentication, private profile/media and notifications, anonymises retained records, and pauses claimed artisan listings.
- Backup restoration and rollback are tested in staging.

## Native application preparation

Use Capacitor after the staging release passes the tests above. Add native secure storage, push-notification registration, deep links for artisan profiles/quotes/reviews, permission explanations, native icons/splash screens, and Android/iOS release signing. Store reviewer credentials in the store-review notes, never in this repository.

The formal security audit, legal review, identity-provider production approval, store privacy declarations, analytics/crash monitoring configuration and closed beta remain external launch gates.
