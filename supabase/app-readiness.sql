-- FixAm 9ja app-readiness migration.
-- Run after schema.sql and admin-automation.sql.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fixam-private-media', 'fixam-private-media', false, 52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  in_app_enabled boolean not null default true,
  email_enabled boolean not null default true,
  push_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;
drop policy if exists "Users manage own notification preferences" on public.notification_preferences;
create policy "Users manage own notification preferences"
  on public.notification_preferences for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null default 'account' check (category in ('account', 'quote', 'application', 'verification', 'subscription', 'review', 'safety')),
  title text not null,
  message text not null,
  action_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists user_notifications_user_created_idx
  on public.user_notifications (user_id, created_at desc);

alter table public.user_notifications enable row level security;
drop policy if exists "Users read own notifications" on public.user_notifications;
drop policy if exists "Users mark own notifications read" on public.user_notifications;
create policy "Users read own notifications"
  on public.user_notifications for select to authenticated using (user_id = auth.uid());
create policy "Users mark own notifications read"
  on public.user_notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.account_deletion_receipts (
  id uuid primary key default gen_random_uuid(),
  email_hash text not null,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'requested' check (status in ('requested', 'completed', 'failed')),
  retention_note text not null default 'Marketplace records retained only where required and anonymised.'
);

alter table public.account_deletion_receipts enable row level security;

create or replace function public.fixam_prepare_account_deletion()
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  account_id uuid := auth.uid();
  account_email text;
  receipt_id uuid;
begin
  if account_id is null then raise exception 'Authentication required'; end if;
  select email into account_email from auth.users where id = account_id;

  insert into public.account_deletion_receipts (email_hash)
  values (encode(digest(lower(coalesce(account_email, '')) || ':fixam-deletion-v1', 'sha256'), 'hex'))
  returning id into receipt_id;

  update public.quote_requests set
    customer_name = 'Deleted customer', customer_phone = 'deleted',
    job_location = 'Location removed', job_details = 'Details removed following account deletion',
    customer_user_id = null, review_token = null
  where customer_user_id = account_id;

  update public.artisan_applications set
    full_name = 'Deleted applicant', phone = 'deleted', applicant_email = null,
    applicant_user_id = null, nin_last4 = null,
    nin_consent = false, nin_consent_at = null,
    liveness_consent = false, liveness_consent_at = null,
    identity_verification_reference = null
  where applicant_user_id = account_id;

  update public.subscription_requests set
    applicant_user_id = null, applicant_email = null,
    applicant_name = 'Deleted applicant', applicant_phone = 'deleted', payment_reference = null
  where applicant_user_id = account_id;

  update public.artisan_reviews set customer_name = 'Deleted customer', customer_user_id = null
  where customer_user_id = account_id;

  update public.artisans set owner_user_id = null,
    profile_status = case when profile_status = 'active' then 'paused' else profile_status end
  where owner_user_id = account_id;

  delete from public.media_uploads where uploaded_by_user_id = account_id;
  delete from public.notification_preferences where user_id = account_id;
  delete from public.user_notifications where user_id = account_id;
  delete from public.user_profiles where user_id = account_id;

  return receipt_id;
end;
$$;

revoke all on function public.fixam_prepare_account_deletion() from public, anon;
grant execute on function public.fixam_prepare_account_deletion() to authenticated;

create or replace function public.fixam_notify_quote_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and new.customer_user_id is not null then
    insert into public.user_notifications (user_id, category, title, message, action_url)
    values (new.customer_user_id, 'quote', 'Quote request updated',
      new.request_code || ' is now ' || replace(new.status, '_', ' '), 'account.html');
  end if;
  return new;
end;
$$;

drop trigger if exists fixam_quote_status_notification on public.quote_requests;
create trigger fixam_quote_status_notification after update of status on public.quote_requests
for each row execute function public.fixam_notify_quote_status();

create or replace function public.fixam_notify_application_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and new.applicant_user_id is not null then
    insert into public.user_notifications (user_id, category, title, message, action_url)
    values (new.applicant_user_id, 'application', 'Artisan application updated',
      new.application_code || ' is now ' || replace(new.status, '_', ' '), 'account.html');
  end if;
  return new;
end;
$$;

drop trigger if exists fixam_application_status_notification on public.artisan_applications;
create trigger fixam_application_status_notification after update of status on public.artisan_applications
for each row execute function public.fixam_notify_application_status();

-- Require authenticated ownership for identity verification. Existing anonymous
-- applications should be linked to an account before production verification.
drop policy if exists "Anyone can create media metadata" on public.media_uploads;
create policy "Authenticated users create own media metadata"
  on public.media_uploads for insert to authenticated
  with check (uploaded_by_user_id = auth.uid());

drop policy if exists "Anyone can upload FixAm media files" on storage.objects;
create policy "Authenticated users upload FixAm media files"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'fixam-media' and owner = auth.uid());

drop policy if exists "Anyone can upload FixAm verification files" on storage.objects;
create policy "Authenticated users upload FixAm verification files"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'fixam-verification' and owner = auth.uid());

drop policy if exists "Users upload private marketplace media" on storage.objects;
drop policy if exists "Participants read private marketplace media" on storage.objects;
create policy "Users upload private marketplace media"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'fixam-private-media' and owner = auth.uid());

create policy "Participants read private marketplace media"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'fixam-private-media' and (
      owner = auth.uid()
      or exists (
        select 1 from public.media_uploads m
        join public.quote_requests q on m.entity_type = 'quote_request'
          and m.entity_id in (q.id::text, q.request_code)
        left join public.artisans a on a.id = q.artisan_id
        where m.bucket = bucket_id and m.storage_path = name
          and (q.customer_user_id = auth.uid() or a.owner_user_id = auth.uid())
      )
      or exists (select 1 from public.admin_profiles where admin_profiles.user_id = auth.uid())
    )
  );

drop policy if exists "Quote participants read private media metadata" on public.media_uploads;
create policy "Quote participants read private media metadata"
  on public.media_uploads for select to authenticated
  using (
    visibility = 'private' and entity_type = 'quote_request' and exists (
      select 1 from public.quote_requests q
      left join public.artisans a on a.id = q.artisan_id
      where entity_id in (q.id::text, q.request_code)
        and (q.customer_user_id = auth.uid() or a.owner_user_id = auth.uid())
    )
  );

drop policy if exists "Authenticated users create own media metadata" on public.media_uploads;
create policy "Authenticated users create own media metadata"
  on public.media_uploads for insert to authenticated
  with check (
    uploaded_by_user_id = auth.uid()
    and bucket in ('fixam-media', 'fixam-private-media', 'fixam-verification')
    and ((bucket = 'fixam-media' and visibility = 'public') or (bucket <> 'fixam-media' and visibility = 'private'))
  );

drop policy if exists "Anyone can create artisan applications" on public.artisan_applications;
create policy "Artisans create own applications"
  on public.artisan_applications for insert to authenticated
  with check (
    applicant_user_id = auth.uid()
    and lower(applicant_email) = lower(auth.jwt() ->> 'email')
    and status = 'new'
  );

drop policy if exists "Anyone can create quote requests" on public.quote_requests;
create policy "Visitors and customers create quote requests"
  on public.quote_requests for insert to anon, authenticated
  with check (
    status = 'new'
    and (customer_user_id is null or customer_user_id = auth.uid())
  );

drop policy if exists "Anyone can create customer reviews" on public.artisan_reviews;
create policy "Customers create tokenised reviews"
  on public.artisan_reviews for insert to anon, authenticated
  with check (
    visibility = 'public'
    and (customer_user_id is null or customer_user_id = auth.uid())
  );

create or replace function public.fixam_notify_verification_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.identity_verification_status is distinct from old.identity_verification_status
     and new.applicant_user_id is not null then
    insert into public.user_notifications (user_id, category, title, message, action_url)
    values (new.applicant_user_id, 'verification', 'Identity verification updated',
      'Verification for ' || new.application_code || ' is ' || replace(new.identity_verification_status, '_', ' '), 'account.html');
  end if;
  return new;
end;
$$;

drop trigger if exists fixam_verification_status_notification on public.artisan_applications;
create trigger fixam_verification_status_notification after update of identity_verification_status on public.artisan_applications
for each row execute function public.fixam_notify_verification_status();

create or replace function public.fixam_notify_subscription_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and new.applicant_user_id is not null then
    insert into public.user_notifications (user_id, category, title, message, action_url)
    values (new.applicant_user_id, 'subscription', 'Subscription updated',
      new.request_code || ' is now ' || replace(new.status, '_', ' '), 'artisan-plans.html');
  end if;
  return new;
end;
$$;

drop trigger if exists fixam_subscription_status_notification on public.subscription_requests;
create trigger fixam_subscription_status_notification after update of status on public.subscription_requests
for each row execute function public.fixam_notify_subscription_status();
