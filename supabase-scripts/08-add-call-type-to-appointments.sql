-- Add call_type column to appointments (video or audio)
alter table public.appointments
  add column if not exists call_type text default 'video' check (call_type in ('video', 'audio'));
