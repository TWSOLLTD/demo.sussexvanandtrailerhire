-- ============================================================
-- Sussex Van & Trailer Hire — migration 03
-- Run ONCE in Supabase → SQL Editor (after migration-02.sql).
-- Adds fields used by the cancellation / decline emails:
--   admin_message  — reason an admin gives when declining or cancelling
--   cancelled_by   — 'customer' or 'admin', so the right email is sent
-- ============================================================
alter table public.bookings add column if not exists admin_message text;
alter table public.bookings add column if not exists cancelled_by text;
