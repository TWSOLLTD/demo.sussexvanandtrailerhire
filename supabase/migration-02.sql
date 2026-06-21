-- ============================================================
-- Sussex Van & Trailer Hire — migration 02
-- Run this ONCE in Supabase → SQL Editor (after setup.sql).
-- Adds: a public availability function (so the booking calendar
-- can show which dates are taken WITHOUT exposing customers'
-- personal details), and a delivery-price column.
-- ============================================================

-- delivery quote the admin sets when approving a "please quote delivery" booking
alter table public.bookings add column if not exists delivery_price integer default 0;

-- Returns only non-personal availability data (id + listing + dates + period)
-- for active bookings. SECURITY DEFINER lets it bypass row-level security so
-- ANY visitor can see which slots are busy, but never who booked them.
create or replace function public.all_busy_slots()
returns table (id uuid, listing_id uuid, start_date date, end_date date, period text)
language sql security definer stable as $$
  select id, listing_id, start_date, end_date, period
  from public.bookings
  where status in ('pending','approved','paid')
$$;

grant execute on function public.all_busy_slots() to anon, authenticated;
