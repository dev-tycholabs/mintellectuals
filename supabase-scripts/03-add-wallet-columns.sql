-- Add wallet columns to profiles table
alter table public.profiles
  add column if not exists wallet_address text,
  add column if not exists encrypted_seed_phrase text;
