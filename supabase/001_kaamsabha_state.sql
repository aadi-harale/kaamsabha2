-- Optional KaamSabha2 shared-state mirror for SIH demonstrations.
-- Apply manually to the configured Supabase project. The app remains local-first if absent.
create table if not exists public.kaamsabha_state (
  workspace text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.kaamsabha_state enable row level security;
revoke all on table public.kaamsabha_state from anon, authenticated;
-- Server-side /api/state uses SUPABASE_SERVICE_ROLE_KEY and therefore bypasses RLS.
