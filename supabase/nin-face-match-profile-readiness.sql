-- FixAm 9ja: move artisan identity onboarding to QoreID NIN Face Match and
-- require a public profile photograph before marketplace publication.

begin;

alter table public.artisan_applications
  add column if not exists face_match_consent boolean not null default false,
  add column if not exists face_match_consent_at timestamptz;

-- Existing applicants consented to an NIN and live-face comparison. Preserve
-- that consent so an already-paid QoreID attempt does not have to be repeated.
update public.artisan_applications
set face_match_consent = true,
    face_match_consent_at = coalesce(face_match_consent_at, liveness_consent_at, nin_consent_at)
where face_match_consent = false
  and nin_consent = true
  and liveness_consent = true;

drop policy if exists "Anyone can create artisan applications" on public.artisan_applications;
drop policy if exists "Authenticated users create own artisan applications" on public.artisan_applications;

create policy "Authenticated users create own artisan applications"
  on public.artisan_applications for insert to authenticated
  with check (
    applicant_user_id = auth.uid()
    and nin_consent = true
    and nin_last4 ~ '^[0-9]{4}$'
    and face_match_consent = true
    and applicant_email like '%@%'
    and identity_verification_status = 'pending'
    and subscription_status = 'pending'
  );

drop policy if exists "Anyone can read active artisans" on public.artisans;

create policy "Anyone can read active artisans"
  on public.artisans for select to anon, authenticated
  using (
    profile_status = 'active'
    and verification_status = 'verified'
    and identity_verification_status = 'verified'
    and subscription_status in ('active', 'founding', 'free_trial')
    and profile_image_url is not null
    and btrim(profile_image_url) <> ''
  );

commit;
