-- Pending transactions table for tracking all blockchain interactions
create table if not exists pending_transactions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    tx_hash text not null,
    tx_type text not null,           -- 'coin_launch' | 'coin_purchase' | 'token_send'
    status text not null default 'pending',  -- 'pending' | 'confirmed' | 'failed'
    payload jsonb not null default '{}',     -- context needed for resolution (coinName, coinSymbol, etc.)
    created_at timestamptz not null default now(),
    resolved_at timestamptz,
    error text
);

create index idx_pending_tx_status on pending_transactions(status) where status = 'pending';
create index idx_pending_tx_user on pending_transactions(user_id);

-- Make coin_address nullable on expert_coins (it's null until tx confirms)
alter table expert_coins alter column coin_address drop not null;

-- Add tx_hash column to expert_coins
alter table expert_coins add column if not exists tx_hash text;
