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


-- ============================================================
-- ============   SEED DATA (fleet, gallery, templates)   ======
-- ============================================================

-- ============================================================
-- Sussex Van & Trailer Hire — SEED DATA
-- Run this AFTER schema.sql, in Supabase → SQL Editor → New query.
-- It loads your fleet, the website gallery and the email templates
-- so the site is populated the moment it goes live.
-- (User accounts are NOT seeded — they're created when people sign
--  up. Make yourself admin with the line at the bottom of schema.sql.)
-- ============================================================

-- ---------- Fleet: trailers & vans ----------
insert into public.listings (category, name, blurb, description, specs, electrics, full_day, half_day, deposit, photos, available, sort) values
('trailer', 'Car Transporter',
 'Twin-axle beavertail transporter with winch — cars, classics, projects & non-runners.',
 'Our flagship beavertail car transporter. Low load angle, electric winch and a flat, full-width deck. Ideal for moving cars, classics, project vehicles and non-runners. Comes with ratchet straps and number-plate magnets. A 7-pin towing electrics and a vehicle rated to tow ~2000kg is required.',
 '{"Type":"Beavertail","Bed length":"4.5 m","Width":"2.0 m","Axles":"Twin","Max load":"2000 kg","Winch":"Electric 12V"}', '7-pin',
 65, 40, 150, array['assets/gallery/p39.webp','assets/gallery/p38.webp','assets/gallery/p11.webp'], true, 1),

('trailer', 'Large Flatbed',
 'Open twin-axle flatbed, no sides — trades, removals, building materials & awkward loads.',
 'Heavy-duty open flatbed with no sides to get in the way. Perfect for builders, landscapers and house moves — pallets, materials, furniture and awkward loads. Lashing points all round. Straps included.',
 '{"Type":"Flatbed","Bed length":"3.6 m","Width":"1.8 m","Axles":"Twin","Max load":"1500 kg"}', null,
 65, 40, 150, array['assets/gallery/p34.webp','assets/gallery/p18.webp'], true, 2),

('trailer', 'Small Box Trailer',
 'Lockable tipping box trailer — tip runs, garden waste & house clearances.',
 'A handy lockable box trailer with a tipping bed. Great for tip runs, garden waste, house clearances and general haulage. Easy to tow behind almost any car. Straps and number-plate included.',
 '{"Type":"Tipping box","Bed length":"2.4 m","Width":"1.3 m","Axles":"Single","Max load":"750 kg","Lockable":"Yes"}', null,
 30, 20, 80, array['assets/gallery/p47.webp'], true, 3),

('trailer', 'Small Caged Trailer',
 'Mesh-sided caged trailer — bulky light loads, garden & landscaping waste.',
 'Caged trailer with removable mesh sides for taller, bulky but light loads — hedge cuttings, cardboard, furniture and landscaping waste. Drop tailgate for easy loading.',
 '{"Type":"Caged","Bed length":"2.4 m","Width":"1.3 m","Cage height":"0.6 m","Axles":"Single","Max load":"750 kg"}', null,
 35, 22, 80, array['assets/gallery/p23.webp','assets/gallery/p25.webp'], true, 4),

('van', 'Medium Panel Van',
 'SWB panel van — house moves, deliveries & trade work. (Indicative — confirm spec.)',
 'Clean, reliable medium panel van for self-drive hire. Ideal for house moves, deliveries and trade work. Three seats, bulkhead and ply-lined load area. Full UK driving licence and minimum age 25 required (TBC).',
 '{"Type":"Panel van","Load length":"2.6 m","Load height":"1.7 m","Payload":"1000 kg","Seats":"3","Fuel":"Diesel"}', null,
 70, 45, 200, array[]::text[], true, 5),

('van', 'Luton Box Van + Tail Lift',
 'Luton box van with tail lift — big house moves & bulky furniture. (Indicative — confirm spec.)',
 'Spacious Luton box van with a powered tail lift — the easiest way to move a whole house or bulky furniture single-handed. Huge box capacity over the cab. Full UK driving licence and minimum age 25 required (TBC).',
 '{"Type":"Luton + tail lift","Load length":"4.0 m","Load height":"2.2 m","Payload":"1100 kg","Tail lift":"500 kg","Fuel":"Diesel"}', null,
 85, 55, 250, array[]::text[], true, 6);

-- ---------- Website gallery (the 61 marketing photos in the repo) ----------
insert into public.gallery (url, sort)
select 'assets/gallery/p' || lpad(g::text, 2, '0') || '.webp', g
from generate_series(1, 61) as g;

-- ---------- Settings row: phone + admin-editable email templates ----------
insert into public.settings (id, phone, templates) values (1, '07378 152002', $json$
{
  "approval": {
    "subject": "Booking approved — secure it with your deposit ({{item}})",
    "body": "Hi {{customer}},\n\nGood news — your request for the {{item}} on {{start}} → {{end}} ({{period}}) has been approved!\n\nTo secure your dates, please pay your refundable deposit of £{{deposit}} using the secure link below:\n{{paylink}}\n\nWe'll hold your dates for 48 hours. As soon as your deposit is paid we'll send full collection instructions.\n\nAny questions, just call or text {{phone}}.\n\nSussex Van & Trailer Hire"
  },
  "confirmation": {
    "subject": "You're all booked in — {{item}} ({{start}})",
    "body": "Hi {{customer}},\n\nPayment received, thank you — your booking is now fully confirmed:\n\n• Item: {{item}}\n• Dates: {{start}} → {{end}} ({{period}})\n• Hire: £{{price}}  ·  Deposit: £{{deposit}} (refundable)\n• {{fulfilment}}\n\n{{paymentnote}}\n{{deliverynote}}\n\nCOLLECTION\nPlease arrive at our Rustington yard at your agreed time and bring:\n  - Your driving licence (the physical card)\n  - A form of ID & proof of address\n\nWe supply ratchet straps and number-plate magnets, and we'll make sure you're set up to tow safely before you leave.\n\nRETURNING\nPlease return the item swept out and in the same condition by the agreed time so we can refund your deposit in full.\n\nAny questions at all, just call or text us on {{phone}}.\n\nThanks, and see you soon!\nSussex Van & Trailer Hire"
  },
  "reminder": {
    "subject": "Your hire ends soon — {{item}}",
    "body": "Hi {{customer}},\n\nJust a friendly reminder that your hire of the {{item}} is due back on {{end}}.\n\nBefore you return it:\n  - Give it a quick sweep out / clean\n  - Remove your straps and any belongings\n  - Return by the agreed time so we can refund your deposit in full\n\nOne more thing — we'd love to see how you got on! Log in to your account and upload a few photos and a quick review of your trip. Approved photos may even feature in our website gallery.\n\nThanks again for choosing us,\nSussex Van & Trailer Hire · {{phone}}"
  }
}
$json$::jsonb);
