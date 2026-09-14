-- Apply after app-readiness.sql and qoreid-collection-readiness.sql.
begin;

create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  application_id uuid references public.artisan_applications(id) on delete set null,
  artisan_id integer references public.artisans(id) on delete set null,
  email text not null,
  plan text not null check (plan in ('monthly', 'biannual', 'annual')),
  amount_kobo integer not null check (amount_kobo > 0),
  plan_code text not null,
  reference text unique not null,
  authorization_url text,
  customer_code text,
  subscription_code text unique,
  provider_status text not null default 'pending',
  paid_through timestamptz,
  last_paid_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.billing_subscriptions add column if not exists payment_mode text not null default 'automatic';
alter table public.billing_subscriptions drop constraint if exists billing_subscriptions_payment_mode_check;
alter table public.billing_subscriptions add constraint billing_subscriptions_payment_mode_check
  check (payment_mode in ('once', 'automatic'));
create unique index if not exists billing_one_open_per_user
  on public.billing_subscriptions(user_id) where closed_at is null;
create table if not exists public.billing_payments (
  reference text primary key,
  subscription_id uuid not null references public.billing_subscriptions(id),
  amount_kobo integer not null,
  paid_at timestamptz not null,
  created_at timestamptz not null default now()
);
-- Billing is served through authenticated Edge Functions. No browser writes or tokens.
alter table public.billing_subscriptions enable row level security;
alter table public.billing_payments enable row level security;
revoke all on public.billing_subscriptions, public.billing_payments from anon, authenticated;
grant all on public.billing_subscriptions, public.billing_payments to service_role;

-- Legacy activation requests remain readable, but public clients cannot manufacture payments.
drop policy if exists "Anyone can create subscription requests" on public.subscription_requests;

create or replace function public.fixam_protect_paystack_request()
returns trigger language plpgsql set search_path = public as $$
begin
  if auth.role() <> 'service_role' and (old.channel = 'paystack' or new.channel = 'paystack') and (
    new.status is distinct from old.status or new.plan is distinct from old.plan or
    new.amount is distinct from old.amount or new.channel is distinct from old.channel or
    (new.payment_reference is not null and new.payment_reference is distinct from old.payment_reference)
  ) then
    raise exception 'Paystack payment records are managed by the payment service';
  end if;
  return new;
end;
$$;
drop trigger if exists fixam_protect_paystack_request on public.subscription_requests;
create trigger fixam_protect_paystack_request before update on public.subscription_requests
  for each row execute function public.fixam_protect_paystack_request();

create or replace function public.fixam_apply_paystack_payment(
  p_subscription_id uuid, p_reference text, p_amount integer, p_paid_at timestamptz
) returns timestamptz language plpgsql security definer set search_path = public as $$
declare b public.billing_subscriptions; expiry timestamptz; application_code_value text;
begin
  select * into b from public.billing_subscriptions where id = p_subscription_id for update;
  if not found or b.user_id is null or b.closed_at is not null then
    raise exception 'Billing account unavailable';
  end if;
  if p_amount <> b.amount_kobo or p_paid_at is null or p_paid_at > now() + interval '5 minutes' then
    raise exception 'Invalid payment';
  end if;
  if exists (select 1 from public.billing_payments where reference = p_reference) then
    if not exists (select 1 from public.billing_payments where reference = p_reference and subscription_id = b.id) then
      raise exception 'Payment already assigned';
    end if;
    return b.paid_through;
  end if;
  insert into public.billing_payments(reference, subscription_id, amount_kobo, paid_at)
    values (p_reference, b.id, p_amount, p_paid_at);
  expiry := greatest(b.paid_through, p_paid_at + case b.plan
    when 'annual' then interval '1 year' when 'biannual' then interval '6 months' else interval '1 month' end);
  update public.billing_subscriptions set paid_through = expiry,
    provider_status = case when payment_mode = 'once' then 'paid' else provider_status end,
    last_paid_at = greatest(last_paid_at, p_paid_at) where id = b.id;
  select application_code into application_code_value from public.artisan_applications where id = b.application_id;
  insert into public.subscription_requests(request_code, application_code, artisan_id, applicant_user_id,
    applicant_email, plan, amount, status, channel, payment_reference)
  values ('F9-P-' || b.id, application_code_value, b.artisan_id, b.user_id,
    b.email, b.plan, b.amount_kobo / 100, case when expiry > now() then 'active' else 'expired' end, 'paystack', p_reference)
  on conflict (request_code) do update set status = excluded.status, payment_reference = excluded.payment_reference, updated_at = now();
  update public.artisan_applications set subscription_status = case when expiry > now() then 'active' else 'expired' end,
    subscription_plan = b.plan, subscription_amount = b.amount_kobo / 100
    where id = b.application_id and applicant_user_id = b.user_id;
  update public.artisans set subscription_status = case when expiry > now() then 'active' else 'expired' end,
    subscription_plan = b.plan, subscription_amount = b.amount_kobo / 100,
    subscription_started_at = coalesce(subscription_started_at, p_paid_at),
    subscription_expires_at = expiry, payment_reference = p_reference
    where (id = b.artisan_id or application_id = b.application_id) and owner_user_id = b.user_id;
  return expiry;
end;
$$;
revoke all on function public.fixam_apply_paystack_payment(uuid, text, integer, timestamptz) from public, anon, authenticated;
grant execute on function public.fixam_apply_paystack_payment(uuid, text, integer, timestamptz) to service_role;

-- Preserve billing when identity verification creates or updates a directory profile later.
create or replace function public.fixam_preserve_paid_access()
returns trigger language plpgsql security definer set search_path = public as $$
declare b public.billing_subscriptions;
begin
  if auth.role() = 'authenticated' and not exists (select 1 from public.admin_profiles where user_id = auth.uid()) then
    if tg_op = 'UPDATE' and (
      new.subscription_status is distinct from old.subscription_status or
      new.subscription_plan is distinct from old.subscription_plan or
      new.subscription_amount is distinct from old.subscription_amount or
      new.subscription_started_at is distinct from old.subscription_started_at or
      new.subscription_expires_at is distinct from old.subscription_expires_at or
      new.payment_reference is distinct from old.payment_reference
    ) then raise exception 'Billing fields are managed by the payment service'; end if;
  end if;
  select * into b from public.billing_subscriptions
    where user_id = new.owner_user_id and (artisan_id = new.id or application_id = new.application_id)
      and paid_through is not null order by paid_through desc limit 1;
  if found then
    new.subscription_status := case when b.paid_through > now() then 'active' else 'expired' end;
    new.subscription_plan := b.plan;
    new.subscription_amount := b.amount_kobo / 100;
    new.subscription_expires_at := b.paid_through;
    new.subscription_started_at := coalesce(new.subscription_started_at, b.last_paid_at);
  end if;
  return new;
end;
$$;
drop trigger if exists fixam_preserve_paid_access on public.artisans;
create trigger fixam_preserve_paid_access before insert or update on public.artisans
  for each row execute function public.fixam_preserve_paid_access();

-- Access expires even if a renewal webhook is delayed or never arrives.
drop policy if exists "Anyone can read active artisans" on public.artisans;
create policy "Anyone can read active artisans" on public.artisans for select to anon, authenticated
using (profile_status = 'active' and verification_status = 'verified' and identity_verification_status = 'verified'
  and subscription_status in ('active', 'founding', 'free_trial')
  and (subscription_expires_at is null or subscription_expires_at > now()));

-- The existing public cleanup RPC must not bypass cancellation in the Edge Function.
do $$ begin
  if to_regprocedure('public.fixam_prepare_account_deletion_data()') is null then
    alter function public.fixam_prepare_account_deletion() rename to fixam_prepare_account_deletion_data;
  end if;
end $$;
revoke all on function public.fixam_prepare_account_deletion_data() from public, anon, authenticated;
create or replace function public.fixam_prepare_account_deletion()
returns uuid language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if exists (select 1 from public.billing_subscriptions where user_id = auth.uid() and closed_at is null
    and payment_mode = 'automatic'
    and (subscription_code is null or provider_status not in ('non-renewing', 'cancelled', 'complete', 'completed'))) then
    raise exception 'Cancel recurring billing before deleting this account';
  end if;
  return public.fixam_prepare_account_deletion_data();
end;
$$;
revoke all on function public.fixam_prepare_account_deletion() from public, anon;
grant execute on function public.fixam_prepare_account_deletion() to authenticated;

create or replace function public.fixam_close_deleted_user_billing()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.billing_subscriptions where user_id = old.id and closed_at is null
    and payment_mode = 'automatic'
    and (subscription_code is null or provider_status not in ('non-renewing', 'cancelled', 'complete', 'completed'))) then
    raise exception 'Cancel recurring billing before deleting this account';
  end if;
  update public.billing_subscriptions set email = 'deleted', closed_at = coalesce(closed_at, now()) where user_id = old.id;
  return old;
end;
$$;
drop trigger if exists fixam_close_deleted_user_billing on auth.users;
create trigger fixam_close_deleted_user_billing before delete on auth.users
  for each row execute function public.fixam_close_deleted_user_billing();

commit;
