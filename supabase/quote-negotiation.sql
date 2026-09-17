-- Two-sided quote negotiation and completion acknowledgement.
-- Safe to run more than once in the Supabase SQL editor.

alter table public.quote_requests
  add column if not exists artisan_phone text,
  add column if not exists agreed_amount integer,
  add column if not exists customer_completed_at timestamptz,
  add column if not exists artisan_completion_status text not null default 'pending',
  add column if not exists artisan_completion_note text,
  add column if not exists artisan_completion_responded_at timestamptz;

alter table public.quote_requests
  drop constraint if exists quote_requests_agreed_amount_check;
alter table public.quote_requests
  add constraint quote_requests_agreed_amount_check
  check (agreed_amount is null or agreed_amount between 100 and 100000000);

alter table public.quote_requests
  drop constraint if exists quote_requests_artisan_completion_status_check;
alter table public.quote_requests
  add constraint quote_requests_artisan_completion_status_check
  check (artisan_completion_status in ('pending', 'confirmed', 'disputed'));

alter table public.quote_requests
  drop constraint if exists quote_requests_artisan_completion_note_check;
alter table public.quote_requests
  add constraint quote_requests_artisan_completion_note_check
  check (artisan_completion_status <> 'disputed' or nullif(btrim(artisan_completion_note), '') is not null);

update public.quote_requests q
set artisan_phone = a.phone
from public.artisans a
where a.id = q.artisan_id
  and (q.artisan_phone is null or btrim(q.artisan_phone) = '');

create table if not exists public.quote_offers (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null references public.quote_requests(id) on delete cascade,
  offered_by text not null check (offered_by in ('customer', 'artisan')),
  offered_by_user_id uuid not null references auth.users(id) on delete restrict,
  amount integer not null check (amount between 100 and 100000000),
  note text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'countered')),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create index if not exists quote_offers_quote_request_created_idx
  on public.quote_offers (quote_request_id, created_at desc);

alter table public.quote_offers enable row level security;

drop policy if exists "Quote participants can read offers" on public.quote_offers;
create policy "Quote participants can read offers"
  on public.quote_offers for select to authenticated
  using (exists (
    select 1
    from public.quote_requests q
    where q.id = quote_offers.quote_request_id
      and (
        q.customer_user_id = auth.uid()
        or exists (
          select 1 from public.artisans a
          where a.id = q.artisan_id and a.owner_user_id = auth.uid()
        )
      )
  ));

create or replace function public.make_quote_offer(p_quote_id uuid, p_amount integer, p_note text default null)
returns public.quote_offers
language plpgsql
security definer
set search_path = public
as $$
declare
  quote_row public.quote_requests;
  party text;
  other_user_id uuid;
  created_offer public.quote_offers;
begin
  if p_amount < 100 or p_amount > 100000000 then
    raise exception 'Enter an amount between NGN 100 and NGN 100,000,000.';
  end if;
  if length(coalesce(p_note, '')) > 500 then
    raise exception 'The price note must be 500 characters or fewer.';
  end if;

  select * into quote_row from public.quote_requests where id = p_quote_id for update;
  if quote_row.id is null then raise exception 'Quote request not found.'; end if;

  if quote_row.customer_user_id = auth.uid() then
    party := 'customer';
    select a.owner_user_id into other_user_id from public.artisans a where a.id = quote_row.artisan_id;
  elsif exists (
    select 1 from public.artisans a
    where a.id = quote_row.artisan_id and a.owner_user_id = auth.uid()
  ) then
    party := 'artisan';
    other_user_id := quote_row.customer_user_id;
  else
    raise exception 'Only the linked customer or artisan can negotiate this quote.';
  end if;
  if quote_row.status in ('completed', 'cancelled', 'declined') then
    raise exception 'Price negotiation is closed for this request.';
  end if;

  update public.quote_offers
  set status = 'countered', responded_at = now()
  where quote_request_id = p_quote_id and status = 'pending';

  insert into public.quote_offers (quote_request_id, offered_by, offered_by_user_id, amount, note)
  values (p_quote_id, party, auth.uid(), p_amount, nullif(btrim(coalesce(p_note, '')), ''))
  returning * into created_offer;

  update public.quote_requests
  set status = case when status = 'new' then 'contacted' else status end
  where id = p_quote_id;

  if other_user_id is not null then
    insert into public.user_notifications (user_id, category, title, message, action_url)
    values (
      other_user_id,
      'quote',
      'New price offer',
      quote_row.request_code || ': ' || initcap(party) || ' proposed NGN ' || trim(to_char(p_amount, 'FM999,999,999')),
      'account.html?quote=' || p_quote_id::text
    );
  end if;

  return created_offer;
end;
$$;

revoke all on function public.make_quote_offer(uuid, integer, text) from public, anon;
grant execute on function public.make_quote_offer(uuid, integer, text) to authenticated;

create or replace function public.respond_to_quote_offer(p_offer_id uuid, p_response text)
returns public.quote_offers
language plpgsql
security definer
set search_path = public
as $$
declare
  offer_row public.quote_offers;
  quote_row public.quote_requests;
  responder_party text;
  updated_offer public.quote_offers;
begin
  if p_response not in ('accepted', 'declined') then
    raise exception 'Unsupported price response.';
  end if;

  select * into offer_row from public.quote_offers where id = p_offer_id for update;
  if offer_row.id is null then raise exception 'Price offer not found.'; end if;
  select * into quote_row from public.quote_requests where id = offer_row.quote_request_id for update;

  if quote_row.customer_user_id = auth.uid() then
    responder_party := 'customer';
  elsif exists (
    select 1 from public.artisans a
    where a.id = quote_row.artisan_id and a.owner_user_id = auth.uid()
  ) then
    responder_party := 'artisan';
  else
    raise exception 'Only the linked customer or artisan can respond to this offer.';
  end if;
  if offer_row.status <> 'pending' then
    raise exception 'This price offer is no longer awaiting a response.';
  end if;
  if quote_row.status in ('completed', 'cancelled', 'declined') then
    raise exception 'Price negotiation is closed for this request.';
  end if;
  if responder_party = offer_row.offered_by then
    raise exception 'The other party must respond to this price offer.';
  end if;

  update public.quote_offers
  set status = p_response, responded_at = now()
  where id = p_offer_id
  returning * into updated_offer;

  if p_response = 'accepted' then
    update public.quote_requests
    set agreed_amount = offer_row.amount,
        status = case when status in ('new', 'contacted') then 'accepted' else status end
    where id = quote_row.id;
  end if;

  insert into public.user_notifications (user_id, category, title, message, action_url)
  values (
    offer_row.offered_by_user_id,
    'quote',
    case when p_response = 'accepted' then 'Price accepted' else 'Price offer declined' end,
    quote_row.request_code || ': ' || initcap(responder_party) || ' ' || p_response || ' NGN ' || trim(to_char(offer_row.amount, 'FM999,999,999')),
    'account.html?quote=' || quote_row.id::text
  );

  return updated_offer;
end;
$$;

revoke all on function public.respond_to_quote_offer(uuid, text) from public, anon;
grant execute on function public.respond_to_quote_offer(uuid, text) to authenticated;

create or replace function public.respond_to_quote_completion(p_quote_id uuid, p_response text, p_note text default null)
returns public.quote_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  quote_row public.quote_requests;
  updated_quote public.quote_requests;
begin
  if p_response not in ('confirmed', 'disputed') then
    raise exception 'Unsupported completion response.';
  end if;
  if length(coalesce(p_note, '')) > 500 then
    raise exception 'The completion note must be 500 characters or fewer.';
  end if;
  if p_response = 'disputed' and btrim(coalesce(p_note, '')) = '' then
    raise exception 'Add a short note explaining what remains unresolved.';
  end if;

  select * into quote_row from public.quote_requests where id = p_quote_id for update;
  if quote_row.id is null or quote_row.status <> 'completed' then
    raise exception 'This request has not been marked completed by the customer.';
  end if;
  if not exists (
    select 1 from public.artisans a
    where a.id = quote_row.artisan_id and a.owner_user_id = auth.uid()
  ) then
    raise exception 'Only the linked artisan can respond to completion.';
  end if;
  if quote_row.artisan_completion_status <> 'pending' then
    raise exception 'A completion response has already been recorded.';
  end if;

  update public.quote_requests
  set artisan_completion_status = p_response,
      artisan_completion_note = nullif(btrim(coalesce(p_note, '')), ''),
      artisan_completion_responded_at = now()
  where id = p_quote_id
  returning * into updated_quote;

  if p_response = 'confirmed' then
    update public.artisans
    set completed_jobs = completed_jobs + 1,
        jobs = greatest(jobs, completed_jobs + 1),
        updated_at = now()
    where id = quote_row.artisan_id;
  end if;

  if quote_row.customer_user_id is not null then
    insert into public.user_notifications (user_id, category, title, message, action_url)
    values (
      quote_row.customer_user_id,
      'quote',
      case when p_response = 'confirmed' then 'Completion confirmed' else 'Completion needs attention' end,
      quote_row.request_code || case when p_response = 'confirmed'
        then ': the artisan confirmed completion.'
        else ': the artisan reported an issue with completion.' end,
      'account.html?quote=' || quote_row.id::text
    );
  end if;

  return updated_quote;
end;
$$;

revoke all on function public.respond_to_quote_completion(uuid, text, text) from public, anon;
grant execute on function public.respond_to_quote_completion(uuid, text, text) to authenticated;

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
    customer_completed_at = case when p_status = 'completed' then now() else customer_completed_at end,
    artisan_completion_status = case when p_status = 'completed' then 'pending' else artisan_completion_status end,
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
    and (
      (p_status = 'contacted' and status = 'new')
      or (p_status in ('accepted', 'declined') and status in ('new', 'contacted'))
    )
  returning * into updated_quote;

  if updated_quote.id is null then
    raise exception 'Quote request cannot be updated from its current status.';
  end if;

  return updated_quote;
end;
$$;

revoke all on function public.update_quote_request_status(uuid, text) from public, anon;
grant execute on function public.update_quote_request_status(uuid, text) to authenticated;

create or replace function public.fixam_notify_quote_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  artisan_user_id uuid;
begin
  if new.status is distinct from old.status then
    if new.customer_user_id is not null then
      insert into public.user_notifications (user_id, category, title, message, action_url)
      values (new.customer_user_id, 'quote', 'Quote request updated',
        new.request_code || ' is now ' || replace(new.status, '_', ' '), 'account.html?quote=' || new.id::text);
    end if;

    select owner_user_id into artisan_user_id from public.artisans where id = new.artisan_id;
    if artisan_user_id is not null and new.status in ('completed', 'cancelled') then
      insert into public.user_notifications (user_id, category, title, message, action_url)
      values (artisan_user_id, 'quote',
        case when new.status = 'completed' then 'Customer marked job completed' else 'Customer cancelled request' end,
        new.request_code || ' is now ' || new.status, 'account.html?quote=' || new.id::text);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists fixam_quote_status_notification on public.quote_requests;
create trigger fixam_quote_status_notification after update of status on public.quote_requests
for each row execute function public.fixam_notify_quote_status();
