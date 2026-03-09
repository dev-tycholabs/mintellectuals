-- Create dedicated expert_coins table (replaces coin columns on profiles)
create table if not exists public.expert_coins (
  id uuid primary key default gen_random_uuid(),
  expert_id uuid not null references public.profiles(id) on delete cascade,
  coin_address text not null,
  coin_name text not null,
  coin_symbol text not null,
  coin_launched_at timestamptz not null default now(),
  gate_dm boolean not null default false,
  gate_audio boolean not null default false,
  gate_video boolean not null default false,
  cost_dm integer not null default 0,
  cost_audio integer not null default 0,
  cost_video integer not null default 0,
  created_at timestamptz not null default now(),
  unique(expert_id)
);

-- Enable RLS
alter table public.expert_coins enable row level security;

-- Anyone can read expert coin info (needed for gating checks)
create policy "Expert coins are publicly readable"
  on public.expert_coins for select
  using (true);

-- Only the expert themselves can insert/update their coin
create policy "Experts can insert their own coin"
  on public.expert_coins for insert
  with check (auth.uid() = expert_id);

create policy "Experts can update their own coin"
  on public.expert_coins for update
  using (auth.uid() = expert_id);

-- Migrate existing coin data from profiles (if any)
insert into public.expert_coins (expert_id, coin_address, coin_name, coin_symbol, coin_launched_at)
select id, coin_address, coin_name, coin_symbol, coalesce(coin_launched_at, now())
from public.profiles
where coin_address is not null
on conflict (expert_id) do nothing;
