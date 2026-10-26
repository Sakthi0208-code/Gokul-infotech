-- Support tickets table for the Gokul Infocare AI support concept.
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.

create table if not exists public.support_tickets (
  id          text primary key check (id ~ '^GI-[2-9A-HJ-NP-Z]{6}$'),
  data        jsonb not null,            -- the full ticket (AI triage, transcript, status, resolution)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists support_tickets_created_at_idx on public.support_tickets (created_at desc);

-- Lock the table down: Row Level Security with no policies means the public
-- (anon/publishable) key cannot read or write anything. Only the app's server,
-- using the secret service-role key, can access tickets.
alter table public.support_tickets enable row level security;
revoke all on public.support_tickets from anon, authenticated;
