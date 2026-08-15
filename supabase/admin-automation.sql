-- FixAm 9ja automated operations and admin audit foundation.
-- Run once in the Supabase SQL Editor after schema.sql.

alter table public.user_profiles
  add column if not exists account_status text not null default 'active'
    check (account_status in ('active', 'restricted', 'suspended')),
  add column if not exists status_reason text;

alter table public.artisan_applications
  add column if not exists identity_verified_at timestamptz;

create table if not exists public.admin_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_type text not null default 'admin' check (actor_type in ('admin', 'automation')),
  action text not null,
  entity_type text not null,
  entity_id text,
  reason text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_events_created_at_idx on public.admin_audit_events (created_at desc);
create index if not exists admin_audit_events_entity_idx on public.admin_audit_events (entity_type, entity_id);
alter table public.admin_audit_events enable row level security;

drop policy if exists "Admins can read audit events" on public.admin_audit_events;
drop policy if exists "Admins can add audit reasons" on public.admin_audit_events;
drop policy if exists "Admins can update user account status" on public.user_profiles;

create policy "Admins can read audit events" on public.admin_audit_events
  for select to authenticated
  using (exists (select 1 from public.admin_profiles where admin_profiles.user_id = auth.uid()));

create policy "Admins can add audit reasons" on public.admin_audit_events
  for insert to authenticated
  with check (
    actor_user_id = auth.uid()
    and exists (select 1 from public.admin_profiles where admin_profiles.user_id = auth.uid())
  );

create policy "Admins can update user account status" on public.user_profiles
  for update to authenticated
  using (exists (select 1 from public.admin_profiles where admin_profiles.user_id = auth.uid()))
  with check (exists (select 1 from public.admin_profiles where admin_profiles.user_id = auth.uid()));

create or replace function public.fixam_protect_account_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.account_status is distinct from old.account_status or new.status_reason is distinct from old.status_reason)
     and not exists (select 1 from public.admin_profiles where admin_profiles.user_id = auth.uid()) then
    raise exception 'Only an administrator can change account status';
  end if;
  return new;
end;
$$;

drop trigger if exists fixam_protect_user_account_status on public.user_profiles;
create trigger fixam_protect_user_account_status before update on public.user_profiles
for each row execute function public.fixam_protect_account_status();

create or replace function public.fixam_create_user_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_profiles (user_id, email, full_name, phone, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, 'FixAm user'), '@', 1)),
    new.raw_user_meta_data->>'phone',
    case when new.raw_user_meta_data->>'role' = 'artisan' then 'artisan' else 'customer' end
  ) on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists fixam_auth_user_profile on auth.users;
create trigger fixam_auth_user_profile after insert on auth.users
for each row execute function public.fixam_create_user_profile();

create or replace function public.fixam_prepare_completed_quote_review()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' and new.review_token is null then
    new.review_token := 'rv-' || lower(new.request_code) || '-' || substr(gen_random_uuid()::text, 1, 8);
  end if;
  return new;
end;
$$;

drop trigger if exists fixam_completed_quote_review on public.quote_requests;
create trigger fixam_completed_quote_review before update on public.quote_requests
for each row execute function public.fixam_prepare_completed_quote_review();

create or replace function public.fixam_route_low_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare low_count integer;
begin
  if new.rating <= 2 then
    select count(*) into low_count from public.artisan_reviews
    where artisan_id = new.artisan_id and rating <= 2 and created_at >= now() - interval '180 days';

    if low_count >= 2 then
      insert into public.artisan_quality_controls
        (artisan_id, artisan_name, artisan_category, artisan_state, artisan_area, standing, admin_note, updated_at)
      values
        (new.artisan_id, new.artisan_name, new.artisan_category, new.artisan_state, new.artisan_area,
         'warning', 'Automatically routed after repeated low customer ratings. Human review required.', now())
      on conflict (artisan_id) do update set
        standing = case when artisan_quality_controls.standing = 'active' then 'warning' else artisan_quality_controls.standing end,
        admin_note = excluded.admin_note,
        updated_at = now();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists fixam_low_rating_route on public.artisan_reviews;
create trigger fixam_low_rating_route after insert on public.artisan_reviews
for each row execute function public.fixam_route_low_rating();

create or replace function public.fixam_automate_verified_onboarding()
returns trigger language plpgsql security definer set search_path = public as $$
declare new_artisan_id integer;
declare state_lat numeric;
declare state_lng numeric;
begin
  if new.status = 'approved' and new.identity_verification_status = 'verified'
     and not exists (select 1 from public.artisans where application_id = new.id) then
    state_lat := case new.state when 'Lagos' then 6.5244 when 'Abuja/FCT' then 9.0765 when 'Edo' then 6.3350 when 'Ogun' then 7.1608 when 'Delta' then 5.5325 when 'Rivers' then 4.8156 else 6.5244 end;
    state_lng := case new.state when 'Lagos' then 3.3792 when 'Abuja/FCT' then 7.3986 when 'Edo' then 5.6037 when 'Ogun' then 3.3486 when 'Delta' then 5.8987 when 'Rivers' then 7.0498 else 3.3792 end;

    insert into public.artisans (
      application_id, business_name, owner_name, owner_user_id, phone, category, state, area, lga, town,
      lat, lng, plan, profile_status, verification_status, identity_verification_status,
      subscription_status, subscription_plan, subscription_amount, bio, skills, verification_checks
    ) values (
      new.id, new.full_name, new.full_name, new.applicant_user_id, new.phone, new.trade, new.state,
      coalesce(new.lga, new.area), coalesce(new.lga, new.area), coalesce(new.town, ''), state_lat, state_lng,
      'Verified', 'draft', 'verified', 'verified', coalesce(new.subscription_status, 'founding'),
      coalesce(new.subscription_plan, new.preferred_plan), coalesce(new.subscription_amount, 0), new.work_summary,
      array[new.trade], array['Application approved', 'Identity verified', 'Profile created automatically']
    ) returning id into new_artisan_id;

    new.status := 'listed';
    insert into public.admin_audit_events (actor_type, action, entity_type, entity_id, reason, new_data)
    values ('automation', 'profile_created', 'artisan', new_artisan_id::text,
      'Approved and identity-verified application automatically created a draft artisan profile.',
      jsonb_build_object('application_id', new.id, 'artisan_id', new_artisan_id));
  end if;
  return new;
end;
$$;

drop trigger if exists fixam_verified_onboarding on public.artisan_applications;
create trigger fixam_verified_onboarding before update on public.artisan_applications
for each row execute function public.fixam_automate_verified_onboarding();

create or replace function public.fixam_audit_row_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare row_id text;
begin
  row_id := coalesce(to_jsonb(new)->>'id', to_jsonb(old)->>'id', to_jsonb(new)->>'user_id', to_jsonb(old)->>'user_id');
  insert into public.admin_audit_events
    (actor_user_id, actor_type, action, entity_type, entity_id, old_data, new_data)
  values (
    auth.uid(), case when auth.uid() is null then 'automation' else 'admin' end,
    lower(tg_op), tg_table_name, row_id,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists fixam_audit_applications on public.artisan_applications;
drop trigger if exists fixam_audit_artisans on public.artisans;
drop trigger if exists fixam_audit_quotes on public.quote_requests;
drop trigger if exists fixam_audit_reviews on public.artisan_reviews;
drop trigger if exists fixam_audit_subscriptions on public.subscription_requests;
drop trigger if exists fixam_audit_users on public.user_profiles;

create trigger fixam_audit_applications after insert or update or delete on public.artisan_applications for each row execute function public.fixam_audit_row_change();
create trigger fixam_audit_artisans after insert or update or delete on public.artisans for each row execute function public.fixam_audit_row_change();
create trigger fixam_audit_quotes after insert or update or delete on public.quote_requests for each row execute function public.fixam_audit_row_change();
create trigger fixam_audit_reviews after insert or update or delete on public.artisan_reviews for each row execute function public.fixam_audit_row_change();
create trigger fixam_audit_subscriptions after insert or update or delete on public.subscription_requests for each row execute function public.fixam_audit_row_change();
create trigger fixam_audit_users after update on public.user_profiles for each row execute function public.fixam_audit_row_change();
