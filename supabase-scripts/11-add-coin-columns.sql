-- Add coin-related columns to profiles
alter table public.profiles
  add column if not exists coin_address text,
  add column if not exists coin_name text,
  add column if not exists coin_symbol text,
  add column if not exists coin_launched_at timestamptz;
