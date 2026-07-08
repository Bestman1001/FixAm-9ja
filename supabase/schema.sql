create extension if not exists pgcrypto;

create or replace function public.fixam_phone_key(phone_input text)
returns text
language sql
immutable
as $$
  select right(regexp_replace(coalesce(phone_input, ''), '\D', '', 'g'), 10);
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fixam-media',
  'fixam-media',
  true,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fixam-verification',
  'fixam-verification',
  false,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  phone text,
  role text not null default 'customer' check (role in ('customer', 'artisan')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

drop policy if exists "Users can read own profile" on public.user_profiles;
drop policy if exists "Users can upsert own profile" on public.user_profiles;

create policy "Users can read own profile"
  on public.user_profiles
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can upsert own profile"
  on public.user_profiles
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.service_categories (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text not null,
  skills text[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'paused', 'removed')),
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_categories_status_idx
  on public.service_categories (status);

create index if not exists service_categories_sort_idx
  on public.service_categories (sort_order, name);

insert into public.service_categories (name, description, skills, sort_order)
values
  ('Electrician', 'Power, wiring, repairs', array['House wiring', 'Fault tracing', 'Inverter setup'], 10),
  ('Plumber', 'Leaks, fittings, water systems', array['Leak repair', 'Pipe fitting', 'Pump setup'], 20),
  ('Carpenter', 'Furniture, fittings, woodwork', array['Cabinets', 'Doors', 'Furniture repair'], 30),
  ('Welder', 'Metalwork, fabrication, repairs', array['Welding', 'Gate fabrication', 'Metal repairs'], 40),
  ('Painter', 'Homes, offices, finishing', array['Interior finish', 'Exterior painting', 'Wall prep'], 50),
  ('Tiler', 'Floor, wall, bathroom tiling', array['Floor tiling', 'Wall tiling', 'Bathroom finishing'], 60),
  ('Bricklayer', 'Blocks, walls, foundations', array['Block work', 'Foundations', 'Wall construction'], 70),
  ('Mason', 'Stonework, concrete, construction', array['Concrete work', 'Stonework', 'Construction repairs'], 80),
  ('POP Installer', 'Ceiling, cornices, finishing', array['POP ceilings', 'Cornices', 'Interior finishing'], 90),
  ('Roofer', 'Roofing, repairs, gutters', array['Roof repairs', 'Gutter work', 'Roof installation'], 100),
  ('Aluminum Fabricator', 'Windows, doors, partitions', array['Aluminum windows', 'Doors', 'Office partitions'], 110),
  ('Glass Installer (Glazier)', 'Glass, mirrors, storefronts', array['Glass installation', 'Mirrors', 'Storefronts'], 120),
  ('AC Technician', 'Cooling, servicing, installation', array['AC servicing', 'Gas refill', 'Installation'], 130),
  ('Refrigeration Technician', 'Fridges, freezers, cold rooms', array['Fridge repair', 'Freezer repair', 'Cold rooms'], 140),
  ('Solar Installer', 'Panels, inverters, batteries', array['Panel setup', 'Battery wiring', 'Load audit'], 150),
  ('CCTV Installer', 'Cameras, security systems', array['Camera installation', 'DVR setup', 'Security systems'], 160),
  ('Satellite/DSTV Installer', 'Satellite dishes, decoder setup', array['Dish installation', 'Decoder setup', 'Signal troubleshooting'], 170),
  ('Generator Technician', 'Generator repair and maintenance', array['Generator servicing', 'Fault repair', 'Maintenance'], 180),
  ('Mechanic', 'Vehicle repair and diagnostics', array['Diagnostics', 'Engine service', 'Brake repair'], 190),
  ('Auto Electrician', 'Vehicle electrical systems', array['Vehicle wiring', 'Battery issues', 'Electrical diagnostics'], 200),
  ('Vulcanizer', 'Tyres, punctures, balancing', array['Puncture repair', 'Tyre fitting', 'Balancing'], 210),
  ('Panel Beater', 'Vehicle body repairs', array['Body repairs', 'Dent removal', 'Accident repairs'], 220),
  ('Spray Painter', 'Auto body painting', array['Vehicle painting', 'Body finishing', 'Paint matching'], 230),
  ('Upholsterer', 'Furniture, car seats, cushions', array['Seat repairs', 'Cushions', 'Furniture upholstery'], 240),
  ('Furniture Maker', 'Custom furniture, cabinetry', array['Custom furniture', 'Cabinets', 'Wardrobes'], 250),
  ('Locksmith', 'Keys, locks, security', array['Key cutting', 'Lock repairs', 'Security locks'], 260),
  ('Borehole Technician', 'Drilling, pumps, water systems', array['Borehole pumps', 'Drilling support', 'Water systems'], 270),
  ('Water Treatment Technician', 'Water purification systems', array['Water filters', 'Purification systems', 'Treatment setup'], 280),
  ('Fumigator', 'Pest control services', array['Pest control', 'Fumigation', 'Sanitation'], 290),
  ('Cleaner', 'Home and office cleaning', array['Home cleaning', 'Office cleaning', 'Deep cleaning'], 300),
  ('Laundry & Dry Cleaning', 'Washing, ironing, dry cleaning', array['Laundry', 'Ironing', 'Dry cleaning'], 310),
  ('Tailor', 'Fashion, uniforms, alterations', array['Native wear', 'Alterations', 'Uniforms'], 320),
  ('Fashion Designer', 'Custom clothing and styling', array['Custom clothing', 'Styling', 'Fashion design'], 330),
  ('Shoe Maker', 'Shoes, sandals, leatherwork', array['Shoe making', 'Sandal repairs', 'Leatherwork'], 340),
  ('Bag Maker', 'Bags, leather products', array['Bag making', 'Leather products', 'Repairs'], 350),
  ('Hair Stylist', 'Hair cutting and styling', array['Hair styling', 'Braids', 'Hair treatment'], 360),
  ('Barber', 'Men''s grooming', array['Haircuts', 'Shaving', 'Grooming'], 370),
  ('Makeup Artist', 'Bridal and event makeup', array['Bridal makeup', 'Event makeup', 'Gele styling'], 380),
  ('Nail Technician', 'Manicure and pedicure', array['Manicure', 'Pedicure', 'Nail art'], 390),
  ('Interior Decorator', 'Home and office decor', array['Interior styling', 'Space planning', 'Decor setup'], 400),
  ('Sign Writer', 'Business signs and branding', array['Business signs', 'Lettering', 'Branding'], 410),
  ('Graphic Installer', 'Vinyl, banners, branding', array['Vinyl installation', 'Banners', 'Wall branding'], 420),
  ('Appliance Repair Technician', 'TVs, washing machines, microwaves', array['TV repairs', 'Washing machines', 'Microwaves'], 430),
  ('Phone Repair Technician', 'Smartphones and tablets', array['Screen replacement', 'Battery replacement', 'Software fixes'], 440),
  ('Computer Technician', 'Laptop and desktop repairs', array['Laptop repair', 'Desktop repair', 'Software support'], 450),
  ('IT Technician', 'Computers, networks, CCTV, printers', array['Laptop repair', 'Network setup', 'Printer support'], 460)
on conflict (name) do update
set description = excluded.description,
    skills = excluded.skills,
    sort_order = excluded.sort_order,
    updated_at = now();

alter table public.service_categories enable row level security;

drop policy if exists "Anyone can read active service categories" on public.service_categories;
drop policy if exists "Admins can manage service categories" on public.service_categories;

create policy "Anyone can read active service categories"
  on public.service_categories
  for select
  to anon, authenticated
  using (status = 'active');

create policy "Admins can manage service categories"
  on public.service_categories
  for all
  to authenticated
  using (exists (
    select 1 from public.admin_profiles
    where admin_profiles.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.admin_profiles
    where admin_profiles.user_id = auth.uid()
  ));

create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  request_code text unique not null,
  review_token text unique,
  artisan_id integer not null,
  artisan_name text not null,
  artisan_category text not null,
  artisan_state text not null,
  artisan_area text not null,
  customer_name text not null,
  customer_phone text not null,
  job_location text not null,
  urgency text not null,
  job_details text not null,
  status text not null default 'new' check (
    status in ('new', 'contacted', 'accepted', 'declined', 'completed', 'cancelled')
  ),
  source text not null default 'website',
  created_at timestamptz not null default now()
);

alter table public.quote_requests
  add column if not exists review_token text;

alter table public.quote_requests
  add column if not exists customer_user_id uuid references auth.users(id) on delete set null;

alter table public.quote_requests
  add column if not exists media_count integer not null default 0;

create index if not exists quote_requests_created_at_idx
  on public.quote_requests (created_at desc);

create index if not exists quote_requests_status_idx
  on public.quote_requests (status);

create index if not exists quote_requests_artisan_state_idx
  on public.quote_requests (artisan_state);

create index if not exists quote_requests_review_token_idx
  on public.quote_requests (review_token);

create unique index if not exists quote_requests_review_token_unique_idx
  on public.quote_requests (review_token)
  where review_token is not null;

alter table public.quote_requests enable row level security;

drop policy if exists "Anyone can create quote requests" on public.quote_requests;

create policy "Anyone can create quote requests"
  on public.quote_requests
  for insert
  to anon, authenticated
  with check (true);

create table if not exists public.artisan_applications (
  id uuid primary key default gen_random_uuid(),
  application_code text unique not null,
  full_name text not null,
  trade text not null,
  state text not null,
  area text not null,
  phone text not null,
  preferred_plan text not null,
  years_experience integer not null default 0,
  work_summary text not null,
  status text not null default 'new' check (
    status in ('new', 'reviewing', 'approved', 'rejected', 'listed')
  ),
  source text not null default 'website',
  created_at timestamptz not null default now()
);

alter table public.artisan_applications
  add column if not exists applicant_user_id uuid references auth.users(id) on delete set null;

alter table public.artisan_applications
  add column if not exists applicant_email text;

alter table public.artisan_applications
  add column if not exists media_count integer not null default 0;

alter table public.artisan_applications
  add column if not exists nin_last4 text,
  add column if not exists nin_consent boolean not null default false,
  add column if not exists nin_consent_at timestamptz,
  add column if not exists liveness_consent boolean not null default false,
  add column if not exists liveness_consent_at timestamptz,
  add column if not exists verification_media_count integer not null default 0,
  add column if not exists identity_verification_status text not null default 'pending',
  add column if not exists identity_verification_reference text,
  add column if not exists subscription_status text not null default 'pending',
  add column if not exists subscription_plan text,
  add column if not exists subscription_amount integer;

create index if not exists artisan_applications_created_at_idx
  on public.artisan_applications (created_at desc);

create index if not exists artisan_applications_status_idx
  on public.artisan_applications (status);

create index if not exists artisan_applications_state_idx
  on public.artisan_applications (state);

create table if not exists public.identity_verification_attempts (
  id uuid primary key default gen_random_uuid(),
  application_code text not null,
  applicant_email text,
  nin_last4 text,
  liveness_media_count integer not null default 0,
  provider text not null default 'configured_provider',
  provider_reference text,
  status text not null default 'pending' check (status in ('pending', 'verified', 'failed')),
  message text,
  response_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.identity_verification_attempts
  add column if not exists liveness_media_count integer not null default 0;

create index if not exists identity_verification_attempts_application_idx
  on public.identity_verification_attempts (application_code, created_at desc);

alter table public.identity_verification_attempts enable row level security;

drop policy if exists "Admins can read identity verification attempts" on public.identity_verification_attempts;

create policy "Admins can read identity verification attempts"
  on public.identity_verification_attempts
  for select
  to authenticated
  using (exists (
    select 1 from public.admin_profiles
    where admin_profiles.user_id = auth.uid()
  ));

alter table public.artisan_applications enable row level security;

drop policy if exists "Anyone can create artisan applications" on public.artisan_applications;

create policy "Anyone can create artisan applications"
  on public.artisan_applications
  for insert
  to anon, authenticated
  with check (
    nin_consent = true
    and nin_last4 ~ '^[0-9]{4}$'
    and liveness_consent = true
    and verification_media_count > 0
    and applicant_email like '%@%'
    and identity_verification_status = 'pending'
    and subscription_status = 'pending'
  );

create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.admin_profiles enable row level security;

drop policy if exists "Admins can read own profile" on public.admin_profiles;

create policy "Admins can read own profile"
  on public.admin_profiles
  for select
  to authenticated
  using (user_id = auth.uid());

create table if not exists public.artisans (
  id integer generated by default as identity primary key,
  application_id uuid references public.artisan_applications(id) on delete set null,
  business_name text not null,
  owner_name text not null,
  phone text not null,
  category text not null,
  state text not null,
  area text not null,
  lat numeric(10, 7) not null,
  lng numeric(10, 7) not null,
  plan text not null default 'Basic' check (plan in ('Basic', 'Verified', 'Pro', 'Business')),
  profile_status text not null default 'active' check (
    profile_status in ('draft', 'active', 'paused', 'suspended', 'removed')
  ),
  verification_status text not null default 'reviewed' check (
    verification_status in ('pending', 'reviewed', 'verified')
  ),
  bio text,
  skills text[] not null default '{}',
  availability text not null default 'Taking scheduled jobs',
  service_radius integer not null default 10,
  jobs integer not null default 0,
  completed_jobs integer not null default 0,
  rating numeric(2, 1) not null default 4.5,
  response_time text not null default '30 min',
  verification_checks text[] not null default '{"Profile reviewed"}',
  portfolio_items text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.artisans
  add column if not exists owner_user_id uuid references auth.users(id) on delete set null;

alter table public.artisans
  add column if not exists profile_image_url text;

alter table public.artisans
  add column if not exists nin_last4 text,
  add column if not exists identity_verification_status text not null default 'pending',
  add column if not exists identity_verification_reference text,
  add column if not exists identity_verified_at timestamptz,
  add column if not exists subscription_status text not null default 'pending',
  add column if not exists subscription_plan text not null default 'monthly',
  add column if not exists subscription_amount integer not null default 2500,
  add column if not exists subscription_started_at timestamptz,
  add column if not exists subscription_expires_at timestamptz,
  add column if not exists payment_reference text;

create index if not exists artisans_state_area_idx
  on public.artisans (state, area);

create index if not exists artisans_category_idx
  on public.artisans (category);

create index if not exists artisans_profile_status_idx
  on public.artisans (profile_status);

create unique index if not exists artisans_application_id_unique_idx
  on public.artisans (application_id)
  where application_id is not null;

create table if not exists public.subscription_requests (
  id uuid primary key default gen_random_uuid(),
  request_code text unique not null,
  application_code text references public.artisan_applications(application_code) on delete set null,
  artisan_id integer references public.artisans(id) on delete set null,
  applicant_user_id uuid references auth.users(id) on delete set null,
  applicant_email text,
  applicant_name text,
  applicant_phone text,
  plan text not null default 'monthly' check (plan in ('monthly', 'biannual', 'annual')),
  amount integer not null default 2500,
  status text not null default 'pending' check (status in ('pending', 'active', 'past_due', 'cancelled', 'expired')),
  channel text not null default 'manual_activation',
  payment_reference text,
  source text not null default 'website',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscription_requests
  drop constraint if exists subscription_requests_status_check;

alter table public.subscription_requests
  add constraint subscription_requests_status_check
  check (status in ('pending', 'founding', 'free_trial', 'active', 'past_due', 'cancelled', 'expired'));

create index if not exists subscription_requests_created_at_idx
  on public.subscription_requests (created_at desc);

create index if not exists subscription_requests_application_idx
  on public.subscription_requests (application_code);

create index if not exists subscription_requests_status_idx
  on public.subscription_requests (status);

alter table public.subscription_requests enable row level security;

drop policy if exists "Anyone can create subscription requests" on public.subscription_requests;
drop policy if exists "Admins can read subscription requests" on public.subscription_requests;
drop policy if exists "Admins can update subscription requests" on public.subscription_requests;
drop policy if exists "Applicants can read own subscription requests" on public.subscription_requests;

create policy "Anyone can create subscription requests"
  on public.subscription_requests
  for insert
  to anon, authenticated
  with check (
    status = 'pending'
    and amount > 0
    and plan in ('monthly', 'biannual', 'annual')
  );

create policy "Admins can read subscription requests"
  on public.subscription_requests
  for select
  to authenticated
  using (exists (
    select 1 from public.admin_profiles
    where admin_profiles.user_id = auth.uid()
  ));

create policy "Admins can update subscription requests"
  on public.subscription_requests
  for update
  to authenticated
  using (exists (
    select 1 from public.admin_profiles
    where admin_profiles.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.admin_profiles
    where admin_profiles.user_id = auth.uid()
  ));

create policy "Applicants can read own subscription requests"
  on public.subscription_requests
  for select
  to authenticated
  using (
    applicant_user_id = auth.uid()
    or lower(applicant_email) = lower((auth.jwt() ->> 'email'))
  );

alter table public.artisans enable row level security;

drop policy if exists "Anyone can read active artisans" on public.artisans;
drop policy if exists "Admins can manage artisans" on public.artisans;
drop policy if exists "Artisans can read own profile" on public.artisans;
drop policy if exists "Artisans can update own profile" on public.artisans;
drop policy if exists "Artisans can claim unowned matching phone profile" on public.artisans;

create policy "Anyone can read active artisans"
  on public.artisans
  for select
  to anon, authenticated
  using (
    profile_status = 'active'
    and verification_status = 'verified'
    and identity_verification_status = 'verified'
    and subscription_status in ('active', 'founding', 'free_trial')
  );

create policy "Admins can manage artisans"
  on public.artisans
  for all
  to authenticated
  using (exists (
    select 1 from public.admin_profiles
    where admin_profiles.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.admin_profiles
    where admin_profiles.user_id = auth.uid()
  ));

create policy "Artisans can read own profile"
  on public.artisans
  for select
  to authenticated
  using (owner_user_id = auth.uid());

create policy "Artisans can update own profile"
  on public.artisans
  for update
  to authenticated
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

create policy "Artisans can claim unowned matching phone profile"
  on public.artisans
  for update
  to authenticated
  using (
    profile_status = 'active'
    and exists (
      select 1 from public.user_profiles
      where user_profiles.user_id = auth.uid()
        and public.fixam_phone_key(user_profiles.phone) = public.fixam_phone_key(artisans.phone)
        and user_profiles.role = 'artisan'
    )
  )
  with check (owner_user_id = auth.uid());

drop policy if exists "Admins can read quote requests" on public.quote_requests;
drop policy if exists "Admins can update quote requests" on public.quote_requests;
drop policy if exists "Artisans can read own received quote requests" on public.quote_requests;
drop policy if exists "Artisans can update own received quote status" on public.quote_requests;

create policy "Admins can read quote requests"
  on public.quote_requests
  for select
  to authenticated
  using (exists (
    select 1 from public.admin_profiles
    where admin_profiles.user_id = auth.uid()
  ));

create policy "Admins can update quote requests"
  on public.quote_requests
  for update
  to authenticated
  using (exists (
    select 1 from public.admin_profiles
    where admin_profiles.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.admin_profiles
    where admin_profiles.user_id = auth.uid()
  ));

create policy "Artisans can read own received quote requests"
  on public.quote_requests
  for select
  to authenticated
  using (exists (
    select 1 from public.artisans
    where artisans.id = quote_requests.artisan_id
      and artisans.owner_user_id = auth.uid()
  ));

create or replace function public.update_quote_request_status(p_quote_id uuid, p_status text)
returns public.quote_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_quote public.quote_requests;
begin
  if p_status not in ('contacted', 'accepted', 'declined') then
    raise exception 'Unsupported quote status: %', p_status;
  end if;

  update public.quote_requests
  set status = p_status
  where id = p_quote_id
    and exists (
      select 1
      from public.artisans
      where artisans.id = quote_requests.artisan_id
        and artisans.owner_user_id = auth.uid()
    )
  returning * into updated_quote;

  if updated_quote.id is null then
    raise exception 'Quote request not found for this artisan account.';
  end if;

  return updated_quote;
end;
$$;

grant execute on function public.update_quote_request_status(uuid, text) to authenticated;

create or replace function public.update_customer_quote_status(p_quote_id uuid, p_status text)
returns public.quote_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_quote public.quote_requests;
begin
  if p_status not in ('cancelled', 'completed') then
    raise exception 'Unsupported customer quote status: %', p_status;
  end if;

  update public.quote_requests
  set
    status = p_status,
    review_token = case
      when p_status = 'completed' then coalesce(
        review_token,
        'rv-' || lower(replace(request_code, ' ', '-')) || '-' || left(gen_random_uuid()::text, 8)
      )
      else review_token
    end
  where id = p_quote_id
    and customer_user_id = auth.uid()
    and (
      (p_status = 'cancelled' and status in ('new', 'contacted'))
      or (p_status = 'completed' and status in ('contacted', 'accepted'))
    )
  returning * into updated_quote;

  if updated_quote.id is null then
    raise exception 'Quote request cannot be updated from its current status.';
  end if;

  return updated_quote;
end;
$$;

grant execute on function public.update_customer_quote_status(uuid, text) to authenticated;

drop policy if exists "Customers can read own quote requests" on public.quote_requests;

create policy "Customers can read own quote requests"
  on public.quote_requests
  for select
  to authenticated
  using (customer_user_id = auth.uid());

create table if not exists public.artisan_reviews (
  id uuid primary key default gen_random_uuid(),
  review_token text unique not null,
  quote_request_id uuid references public.quote_requests(id) on delete set null,
  artisan_id integer not null,
  artisan_name text not null,
  artisan_category text not null,
  artisan_state text not null,
  artisan_area text not null,
  customer_name text not null,
  rating integer not null check (rating between 1 and 5),
  quality_rating integer not null check (quality_rating between 1 and 5),
  timeliness_rating integer not null check (timeliness_rating between 1 and 5),
  professionalism_rating integer not null check (professionalism_rating between 1 and 5),
  price_fairness_rating integer not null check (price_fairness_rating between 1 and 5),
  would_recommend boolean not null default true,
  comment text not null,
  visibility text not null default 'public' check (
    visibility in ('public', 'hidden', 'flagged')
  ),
  admin_note text,
  created_at timestamptz not null default now()
);

alter table public.artisan_reviews
  add column if not exists customer_user_id uuid references auth.users(id) on delete set null;

alter table public.artisan_reviews
  add column if not exists media_count integer not null default 0;

create index if not exists artisan_reviews_artisan_id_idx
  on public.artisan_reviews (artisan_id);

create index if not exists artisan_reviews_visibility_idx
  on public.artisan_reviews (visibility);

create index if not exists artisan_reviews_created_at_idx
  on public.artisan_reviews (created_at desc);

alter table public.artisan_reviews enable row level security;

drop policy if exists "Anyone can create customer reviews" on public.artisan_reviews;
drop policy if exists "Anyone can read public reviews" on public.artisan_reviews;
drop policy if exists "Admins can read all reviews" on public.artisan_reviews;
drop policy if exists "Admins can update review visibility" on public.artisan_reviews;

create policy "Anyone can create customer reviews"
  on public.artisan_reviews
  for insert
  to anon, authenticated
  with check (visibility = 'public');

create policy "Anyone can read public reviews"
  on public.artisan_reviews
  for select
  to anon, authenticated
  using (visibility = 'public');

create policy "Admins can read all reviews"
  on public.artisan_reviews
  for select
  to authenticated
  using (exists (
    select 1 from public.admin_profiles
    where admin_profiles.user_id = auth.uid()
  ));

create policy "Admins can update review visibility"
  on public.artisan_reviews
  for update
  to authenticated
  using (exists (
    select 1 from public.admin_profiles
    where admin_profiles.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.admin_profiles
    where admin_profiles.user_id = auth.uid()
  ));

create table if not exists public.artisan_quality_controls (
  artisan_id integer primary key,
  artisan_name text not null,
  artisan_category text not null,
  artisan_state text not null,
  artisan_area text not null,
  standing text not null default 'active' check (
    standing in ('active', 'warning', 'suspended', 'removed')
  ),
  admin_note text,
  updated_at timestamptz not null default now()
);

alter table public.artisan_quality_controls enable row level security;

drop policy if exists "Anyone can read artisan standing" on public.artisan_quality_controls;
drop policy if exists "Admins can upsert artisan standing" on public.artisan_quality_controls;

create policy "Anyone can read artisan standing"
  on public.artisan_quality_controls
  for select
  to anon, authenticated
  using (true);

create policy "Admins can upsert artisan standing"
  on public.artisan_quality_controls
  for all
  to authenticated
  using (exists (
    select 1 from public.admin_profiles
    where admin_profiles.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.admin_profiles
    where admin_profiles.user_id = auth.uid()
  ));

drop policy if exists "Admins can read artisan applications" on public.artisan_applications;
drop policy if exists "Admins can update artisan applications" on public.artisan_applications;
drop policy if exists "Applicants can read own artisan applications" on public.artisan_applications;

create policy "Admins can read artisan applications"
  on public.artisan_applications
  for select
  to authenticated
  using (exists (
    select 1 from public.admin_profiles
    where admin_profiles.user_id = auth.uid()
  ));

create policy "Admins can update artisan applications"
  on public.artisan_applications
  for update
  to authenticated
  using (exists (
    select 1 from public.admin_profiles
    where admin_profiles.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.admin_profiles
    where admin_profiles.user_id = auth.uid()
  ));

create policy "Applicants can read own artisan applications"
  on public.artisan_applications
  for select
  to authenticated
  using (applicant_user_id = auth.uid());

create table if not exists public.media_uploads (
  id uuid primary key default gen_random_uuid(),
  bucket text not null default 'fixam-media',
  storage_path text unique not null,
  public_url text,
  entity_type text not null check (
    entity_type in ('quote_request', 'artisan_application', 'artisan_profile', 'customer_review', 'identity_verification')
  ),
  entity_id text not null,
  uploaded_by_role text not null check (uploaded_by_role in ('customer', 'artisan', 'admin')),
  uploaded_by_user_id uuid references auth.users(id) on delete set null,
  file_name text not null,
  mime_type text not null,
  file_size integer not null default 0,
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  created_at timestamptz not null default now()
);

alter table public.media_uploads
  drop constraint if exists media_uploads_entity_type_check;

alter table public.media_uploads
  add constraint media_uploads_entity_type_check
  check (entity_type in ('quote_request', 'artisan_application', 'artisan_profile', 'customer_review', 'identity_verification'));

create index if not exists media_uploads_entity_idx
  on public.media_uploads (entity_type, entity_id);

create index if not exists media_uploads_user_idx
  on public.media_uploads (uploaded_by_user_id);

alter table public.media_uploads enable row level security;

drop policy if exists "Anyone can create media metadata" on public.media_uploads;
drop policy if exists "Anyone can read public media metadata" on public.media_uploads;
drop policy if exists "Users can read own media metadata" on public.media_uploads;
drop policy if exists "Admins can read all media metadata" on public.media_uploads;

create policy "Anyone can create media metadata"
  on public.media_uploads
  for insert
  to anon, authenticated
  with check (true);

create policy "Anyone can read public media metadata"
  on public.media_uploads
  for select
  to anon, authenticated
  using (visibility = 'public' and entity_type <> 'identity_verification');

create policy "Users can read own media metadata"
  on public.media_uploads
  for select
  to authenticated
  using (uploaded_by_user_id = auth.uid());

create policy "Admins can read all media metadata"
  on public.media_uploads
  for select
  to authenticated
  using (exists (
    select 1 from public.admin_profiles
    where admin_profiles.user_id = auth.uid()
  ));

drop policy if exists "Anyone can read FixAm media files" on storage.objects;
drop policy if exists "Anyone can upload FixAm media files" on storage.objects;
drop policy if exists "Users can update own FixAm media files" on storage.objects;
drop policy if exists "Anyone can upload FixAm verification files" on storage.objects;
drop policy if exists "Admins can read FixAm verification files" on storage.objects;

create policy "Anyone can read FixAm media files"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'fixam-media');

create policy "Anyone can upload FixAm media files"
  on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'fixam-media');

create policy "Users can update own FixAm media files"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'fixam-media' and owner = auth.uid())
  with check (bucket_id = 'fixam-media' and owner = auth.uid());

create policy "Anyone can upload FixAm verification files"
  on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'fixam-verification');

create policy "Admins can read FixAm verification files"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'fixam-verification'
    and exists (
      select 1 from public.admin_profiles
      where admin_profiles.user_id = auth.uid()
    )
  );
