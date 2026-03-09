-- Allow users to view profiles of people they have conversations with
-- This fixes the bug where experts can't see seeker profiles in messages
create policy "Users can view conversation partner profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.conversations c
      where (c.participant_1 = auth.uid() and c.participant_2 = profiles.id)
         or (c.participant_2 = auth.uid() and c.participant_1 = profiles.id)
    )
  );
