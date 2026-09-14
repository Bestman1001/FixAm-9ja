# Paystack membership payments

The integration uses Supabase Edge Functions and Paystack hosted checkout. Artisans can pay once using Nigerian bank apps and wallets through Pay with Bank, bank transfer, USSD, PayAttitude, or card. They can instead choose automatic renewal with a supported card. The website never receives the secret key or reusable card authorizations. Customers still discover artisans for free. Each artisan account has one current paid membership, linked to its verified application/profile.

## Production configuration — 10 September 2026

Configured in project `bqzbadvqozpmdkmdenly` through the authenticated dashboards:

- Live plans: monthly `PLN_xjk3dquddg7uiaa`, six months `PLN_zml7dsxbj7xifct`, yearly `PLN_cxhrxf3t7uvg3a3`. Unlimited billing cycles; no customer subscriptions were created during setup.
- Paystack live secret and plan codes saved as Supabase secrets; `PAYSTACK_MODE=live` and `APP_ORIGIN=https://www.fixam9ja.com`.
- Paystack live callback and webhook URLs saved as documented below.
- Billing migration applied; billing RLS enabled and browser execution of the payment activation RPC denied. Initial live ledger check: zero subscriptions and zero payments. Apply the current migration again after the payment-choice release to add `payment_mode` safely.
- Deployed `paystack-billing`, `paystack-webhook`, `delete-account`, `admin-manage-users`, and updated `qoreid-webhook`. Gateway legacy JWT verification disabled; authentication/signature checks run inside each handler.
- Live unsigned/unauthenticated POST checks returned HTTP 401 from all five handlers. The current local suite covers one-time and automatic checkout, payment verification, webhook delivery, cancellation, expiry, and account deletion.

A real customer checkout, provider renewal delivery, and live cancellation still require end-to-end validation. No live payment was made by this setup process.

## 1. Create the three plans

In the Paystack dashboard, select **Live mode → Subscriptions → Plans** and create these NGN plans with unlimited billing cycles. Do not add a trial or change these prices without updating the server price catalogue and customer-facing prices together.

| Plan name | Dashboard amount (NGN) | Interval | Supabase secret holding its PLN code |
| --- | ---: | --- | --- |
| FixAm 9ja Monthly | 2,500 | Monthly | `PAYSTACK_PLAN_MONTHLY` |
| FixAm 9ja 6 Months | 12,000 | Biannually / every six months | `PAYSTACK_PLAN_BIANNUAL` |
| FixAm 9ja Yearly | 24,000 | Annually | `PAYSTACK_PLAN_ANNUAL` |

Paystack's API uses kobo: 250000, 1200000 and 2400000 respectively. Checkout fetches each plan from Paystack and checks its price, interval, currency and environment before using it. Automatic renewal sends the selected plan to Paystack. One-time checkout keeps the same server-controlled price and term but does not send a recurring plan.

## 2. Set Supabase Function secrets

In the target Supabase project, open **Edge Functions → Secrets** and add:

| Name | Production value |
| --- | --- |
| `PAYSTACK_SECRET_KEY` | The live secret key from Paystack Settings → API Keys & Webhooks |
| `PAYSTACK_MODE` | `live` |
| `PAYSTACK_PLAN_MONTHLY` | Monthly plan's `PLN_...` code |
| `PAYSTACK_PLAN_BIANNUAL` | Six-month plan's `PLN_...` code |
| `PAYSTACK_PLAN_ANNUAL` | Yearly plan's `PLN_...` code |
| `APP_ORIGIN` | `https://www.fixam9ja.com` (no trailing slash) |

The standard `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` variables must also be available to the functions. Do not place a Paystack secret in `supabase-config.js`, a browser form, Git, logs or chat. Hosted checkout does not require a Paystack public key in the website.

For staging, use a separate Supabase project, Paystack test secret, test plan codes, `PAYSTACK_MODE=test`, and the staging origin. Test payments are explicitly rejected on the production hostname.

## 3. Apply and deploy

Back up the target database. Validate in staging first. Apply `supabase/paystack-billing.sql` after all existing migrations listed in `APP-READINESS.md`. Keep this migration last when rebuilding a database: it tightens subscription policies and wraps the account-cleanup RPC with a billing cancellation check.

Deploy from this repository so the shared modules and `supabase/config.toml` are included:

```sh
supabase functions deploy paystack-billing --project-ref YOUR_PROJECT_REF
supabase functions deploy paystack-webhook --project-ref YOUR_PROJECT_REF
supabase functions deploy delete-account --project-ref YOUR_PROJECT_REF
supabase functions deploy admin-manage-users --project-ref YOUR_PROJECT_REF
supabase functions deploy qoreid-webhook --project-ref YOUR_PROJECT_REF
```

The deployed functions use `verify_jwt=false` at the gateway. `paystack-billing`, `delete-account`, and `admin-manage-users` validate the bearer token using Supabase Auth; admin management also verifies the super-admin email and administrator profile. `paystack-webhook` validates the raw body's HMAC-SHA512 signature using the Paystack secret. A Paystack webhook cannot provide a Supabase user JWT. QoreID retains its provider signature check.

In Paystack **Settings → API Keys & Webhooks**, set the live webhook URL to:

```text
https://YOUR_PROJECT_REF.supabase.co/functions/v1/paystack-webhook
```

For the production project currently configured in this repository:

```text
https://bqzbadvqozpmdkmdenly.supabase.co/functions/v1/paystack-webhook
```

The callback URL is `https://www.fixam9ja.com/billing.html`; checkout sets it explicitly. Deploy the website only after the database, functions, secrets and webhook have been configured.

## 4. Validate before launch

Run `pnpm install --frozen-lockfile`, `pnpm test`, and `./scripts/verify-production.ps1` (Node 24 or newer). Local tests run the real SQL migrations in PGlite PostgreSQL and exercise the Edge handlers with a simulated Paystack API. They do not prove the deployed provider/account configuration.

In staging with Paystack test credentials, verify:

- A verified artisan can choose each term and either a one-time payment or automatic renewal, explicitly confirm the choice, and reach hosted checkout at the correct amount.
- One-time checkout does not contain a Paystack plan and offers Bank (including eligible bank apps and wallets), bank transfer, USSD, PayAttitude, and card. Automatic renewal contains the correct plan and is restricted to a supported card.
- Successful payment activates membership once, including when the browser is closed before the callback or the webhook is replayed.
- `subscription.create` and `invoice.update` can arrive in either order; a paid renewal records a unique reference and updates the paid-through date.
- Unsuccessful payment, wrong amount/currency/customer/plan, invalid signatures, and test-mode transactions do not activate live access.
- Cancel renewal and confirm Paystack reports non-renewing/cancelled. Access remains until the paid-through date and expired profiles disappear from public search.
- A failed renewal shows the provider's attention state; the artisan can update their card using the hosted management page. Paystack does not immediately retry failed subscription charges.
- Account deletion first disables renewal. Unresolved pending checkouts prevent deletion until payment support resolves them. Deleted accounts cannot be reactivated by delayed webhooks.
- New verification no longer grants founding access automatically. Existing explicit founding/free-trial grants remain available; paid dates survive later identity/profile updates. Payment never overrides a suspended or removed profile.

Finally, the account owner should complete a real live checkout using their own payment method and verify the amount, payment reference, membership dates, recurring subscription and cancellation in both dashboards. Live payment and email delivery have not been validated by the local tests.

## Operation and recovery

- Checkout and verification: `paystack-billing` POST actions `checkout`, `verify`, `status`, `manage`, and `cancel`. Prices and identity ownership come from the server, not the request's amount/email fields.
- Initial success is handled by both server verification and `charge.success`. Renewal `invoice.update` events are linked by subscription code, then independently verified through Paystack's transaction API.
- `billing_payments.reference` prevents replay. A database transaction locks the membership and updates the ledger, application, artisan and operations request atomically. Paid-through dates are monotonic for out-of-order deliveries.
- Cancellation changes renewal state, not the paid-through date. Public access checks the expiry timestamp directly, without depending on a scheduled job. A new plan can start when the previous paid term has ended and renewal is stopped.
- Inspect Edge Function failures and unsuccessful webhook deliveries in Paystack. Failed processing returns a retryable response. Paystack's retries are finite, so investigate persistent failures and replay missed events after resolving the cause.
- An unfinished checkout is reused to prevent duplicate payments. When the artisan changes the term or payment mode, the service verifies the old transaction and replaces it only after Paystack reports a definitive failed, abandoned, or reversed result. A still-processing attempt must be resolved before another checkout starts.
- Process refund requests and disputes in the Paystack dashboard under the stated policy; this integration does not automatically issue refunds or reverse entitlements on refund/chargeback events. Record any manual entitlement adjustment separately and review the paid-through date in `billing_subscriptions`.
- Keep historical payment references and amounts for accounting; the account-deletion trigger removes the stored billing email and detaches the Auth user. Retention duration remains an operator policy.

API references: [Transactions](https://paystack.com/docs/api/transaction/), [Subscriptions](https://paystack.com/docs/payments/subscriptions/), [Subscription management](https://paystack.com/docs/api/subscription/), [Webhooks](https://paystack.com/docs/payments/webhooks/).
