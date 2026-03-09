-- Add verified social identity columns
alter table public.profiles
  add column if not exists twitter_verified text,   -- stores verified Twitter/X username
  add column if not exists linkedin_verified text;  -- stores verified LinkedIn sub/ID
