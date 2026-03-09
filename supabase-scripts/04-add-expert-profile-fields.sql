-- Add expert profile fields
alter table public.profiles
  add column if not exists headline text,
  add column if not exists bio text,
  add column if not exists expertise text[] default '{}',
  add column if not exists hourly_rate integer,
  add column if not exists location text,
  add column if not exists twitter_url text,
  add column if not exists linkedin_url text,
  add column if not exists website_url text,
  add column if not exists is_expert boolean default false,
  add column if not exists updated_at timestamptz default now();

-- Allow anyone to read expert profiles (for discovery)
create policy "Anyone can view expert profiles"
  on public.profiles for select
  using (is_expert = true);
