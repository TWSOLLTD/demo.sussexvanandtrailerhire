-- ============================================================
-- Sussex Van & Trailer Hire — Supabase / Postgres schema
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query).
-- It creates every table, the security policies (RLS) and the
-- trigger that makes a profile row when someone signs up.
-- ============================================================

-- ---------- enums ----------
create type booking_status as enum ('pending','approved','paid','declined','cancelled');
create type submission_status as enum ('pending','approved','rejected');
create type pay_method as enum ('card','cash');

-- ============================================================
-- profiles  (1 row per auth user; passwords live in auth.users, hashed)
-- ============================================================
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  email       text not null,
  phone       text,
  role        text not null default 'customer' check (role in ('customer','admin')),
  created_at  timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- helper: is the current user an admin?
create or replace function public.is_admin() returns boolean
language sql security definer stable as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;

-- a user can read & update their own profile; admins can read/update all.
create policy "profiles self read"   on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profiles self update" on public.profiles for update using (id = auth.uid())  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));
create policy "profiles admin update" on public.profiles for update using (public.is_admin());

-- create a profile automatically on signup (name/phone come from sign-up metadata)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, email, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'name','Customer'), new.email, new.raw_user_meta_data->>'phone');
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- listings  (trailers & vans)
-- ============================================================
create table public.listings (
  id          uuid primary key default gen_random_uuid(),
  category    text not null check (category in ('trailer','van')),
  name        text not null,
  blurb       text,
  description text,
  specs       jsonb default '{}',
  electrics   text,                       -- trailer plug type: '7-pin' | '13-pin'
  full_day    integer not null,
  half_day    integer not null,
  deposit     integer not null,
  photos      text[] default '{}',        -- public storage URLs, [0] = cover
  available   boolean not null default true,
  blocked     date[]  default '{}',       -- maintenance / unavailable days
  sort        integer default 0,
  created_at  timestamptz not null default now()
);
alter table public.listings enable row level security;
-- anyone (even logged-out) can read listings for the public website
create policy "listings public read" on public.listings for select using (true);
-- only admins can create / edit / delete
create policy "listings admin write" on public.listings for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- bookings
-- ============================================================
create table public.bookings (
  id            uuid primary key default gen_random_uuid(),
  listing_id    uuid references public.listings(id) on delete set null,
  user_id       uuid references public.profiles(id) on delete set null,
  start_date    date not null,
  end_date      date not null,
  period        text not null default 'full',     -- 'am' | 'pm' | 'full'
  customer      jsonb not null,                   -- { name, phone, email } snapshot
  towing        text,
  towing_reg    text,
  plate_wanted  boolean default false,
  electrics     text,                             -- customer's tow socket: '7-pin'|'13-pin'|'not sure'
  licence       text,
  fulfilment    text default 'collection',        -- 'collection' | 'delivery'
  payment_method pay_method default 'card',
  notes         text,
  price         integer not null,
  deposit       integer not null,
  status        booking_status not null default 'pending',
  reminder_sent_at timestamptz,                   -- guards against double reminders
  created_at    timestamptz not null default now(),
  updated_at    timestamptz
);
alter table public.bookings enable row level security;
-- customers see only their own bookings; admins see all
create policy "bookings own read"  on public.bookings for select using (user_id = auth.uid() or public.is_admin());
-- a logged-in customer can create a booking for themselves
create policy "bookings own create" on public.bookings for insert with check (user_id = auth.uid());
-- customer may cancel their own; admin may update anything (approve / mark paid / etc.)
create policy "bookings own update" on public.bookings for update using (user_id = auth.uid() or public.is_admin());

-- ============================================================
-- submissions  (community photos + reviews, moderated)
-- ============================================================
create table public.submissions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.profiles(id) on delete set null,
  user_name     text,
  anonymous     boolean default false,
  listing_id    uuid references public.listings(id) on delete set null,
  listing_name  text,
  rating        integer check (rating between 1 and 5),
  body          text,
  photos        text[] default '{}',
  status        submission_status not null default 'pending',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz
);
alter table public.submissions enable row level security;
-- approved submissions are public (for the website gallery & reviews);
-- a user can also see their own pending ones; admins see all
create policy "submissions read" on public.submissions for select
  using (status = 'approved' or user_id = auth.uid() or public.is_admin());
create policy "submissions own create" on public.submissions for insert with check (user_id = auth.uid());
create policy "submissions admin update" on public.submissions for update using (public.is_admin());

-- ============================================================
-- gallery  (website photos managed in admin; approved submission
--           photos are copied in here on approval)
-- ============================================================
create table public.gallery (
  id          uuid primary key default gen_random_uuid(),
  url         text not null,
  sort        integer default 0,
  created_at  timestamptz not null default now()
);
alter table public.gallery enable row level security;
create policy "gallery public read" on public.gallery for select using (true);
create policy "gallery admin write" on public.gallery for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- settings  (single row: editable email templates + phone)
-- ============================================================
create table public.settings (
  id          int primary key default 1 check (id = 1),
  phone       text default '07378 152002',
  templates   jsonb not null
);
alter table public.settings enable row level security;
create policy "settings public read" on public.settings for select using (true);
create policy "settings admin write" on public.settings for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- Storage buckets (run once; or create in Dashboard → Storage):
--   listing-photos  (public)
--   gallery          (public)
--   review-photos    (public)
-- Then add a storage policy allowing admins to upload, public to read.
-- ============================================================

-- After running this, promote your own account to admin:
--   update public.profiles set role = 'admin' where email = 'you@youremail.com';
