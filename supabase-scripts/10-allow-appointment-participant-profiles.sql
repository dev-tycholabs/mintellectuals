-- Allow users to view profiles of people they have appointments with
-- This fixes the bug where experts see "Unknown" instead of the booker's name
create policy "Users can view appointment partner profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.appointments a
      where (a.expert_id = auth.uid() and a.booker_id = profiles.id)
         or (a.booker_id = auth.uid() and a.expert_id = profiles.id)
    )
  );
