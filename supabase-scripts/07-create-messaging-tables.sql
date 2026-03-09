-- Conversations between two users
create table if not exists public.conversations (
  id uuid default gen_random_uuid() primary key,
  participant_1 uuid references public.profiles(id) on delete cascade not null,
  participant_2 uuid references public.profiles(id) on delete cascade not null,
  last_message_at timestamptz default now(),
  created_at timestamptz default now(),
  constraint unique_conversation unique (participant_1, participant_2),
  constraint no_self_chat check (participant_1 <> participant_2)
);

alter table public.conversations enable row level security;

create policy "Users can view own conversations"
  on public.conversations for select
  using (auth.uid() = participant_1 or auth.uid() = participant_2);

create policy "Authenticated users can create conversations"
  on public.conversations for insert
  with check (auth.uid() = participant_1 or auth.uid() = participant_2);

create policy "Participants can update conversation"
  on public.conversations for update
  using (auth.uid() = participant_1 or auth.uid() = participant_2);

-- Messages within conversations
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now(),
  read_at timestamptz
);

alter table public.messages enable row level security;

-- Users can read messages in their conversations
create policy "Users can view messages in their conversations"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
      and (auth.uid() = c.participant_1 or auth.uid() = c.participant_2)
    )
  );

-- Users can send messages in their conversations
create policy "Users can send messages in their conversations"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
      and (auth.uid() = c.participant_1 or auth.uid() = c.participant_2)
    )
  );

-- Users can update messages they received (for read receipts)
create policy "Users can mark messages as read"
  on public.messages for update
  using (
    sender_id <> auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
      and (auth.uid() = c.participant_1 or auth.uid() = c.participant_2)
    )
  );

-- Index for fast message lookups
create index if not exists idx_messages_conversation_id on public.messages(conversation_id, created_at desc);
create index if not exists idx_conversations_participants on public.conversations(participant_1, participant_2);

-- Enable realtime for messages
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
