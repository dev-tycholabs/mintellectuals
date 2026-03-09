-- Store Google Calendar OAuth tokens (encrypted at rest by Supabase)
alter table public.profiles
  add column if not exists google_calendar_token jsonb,
  add column if not exists google_calendar_email text,
  add column if not exists timezone text default 'UTC';

-- Appointments table for tracking bookings
create table if not exists public.appointments (
  id uuid default gen_random_uuid() primary key,
  expert_id uuid references public.profiles(id) on delete cascade not null,
  booker_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  start_time time not null,
  end_time time not null,
  status text default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  note text,
  google_event_id text,
  created_at timestamptz default now()
);

alter table public.appointments enable row level security;

create policy "Experts can view their appointments"
  on public.appointments for select using (auth.uid() = expert_id);

create policy "Bookers can view their bookings"
  on public.appointments for select using (auth.uid() = booker_id);

create policy "Authenticated users can book"
  on public.appointments for insert with check (auth.uid() = booker_id);

create policy "Experts can update status"
  on public.appointments for update using (auth.uid() = expert_id);

create policy "Bookers can cancel"
  on public.appointments for update using (auth.uid() = booker_id);
