-- FixAm 9ja: allow QoreID Collection SDK NIN face matching.
-- The SDK captures the comparison selfie, so a duplicate Supabase upload is not required.

begin;

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

commit;
