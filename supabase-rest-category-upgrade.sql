-- Run once in Supabase SQL Editor to enable the “休息” category for existing records.
alter table public.time_records drop constraint if exists time_records_category_check;
alter table public.time_records add constraint time_records_category_check
  check (category in ('money', 'learning', 'network', 'fun', 'rest'));
