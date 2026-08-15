-- Run this once in the Supabase SQL Editor to enable admin-only user totals.
drop policy if exists "Admins can read all user profiles" on public.user_profiles;

create policy "Admins can read all user profiles"
  on public.user_profiles
  for select
  to authenticated
  using (
    exists (
      select 1 from public.admin_profiles
      where admin_profiles.user_id = auth.uid()
    )
  );
