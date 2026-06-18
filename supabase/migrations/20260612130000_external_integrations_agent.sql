alter table public.leads
  add column if not exists steel_products_likely_needed text[] not null default '{}',
  add column if not exists competitors_likely_using text[] not null default '{}',
  add column if not exists certifications text[] not null default '{}',
  add column if not exists estimated_scale text not null default '',
  add column if not exists estimated_annual_revenue text not null default '',
  add column if not exists key_personnel jsonb not null default '[]'::jsonb,
  add column if not exists recent_projects text[] not null default '{}';

create table if not exists public.agent_query_log (
  id uuid primary key default gen_random_uuid(),
  timestamp timestamptz not null default now(),
  user_uid uuid references auth.users(id) on delete set null,
  user_role text not null default '',
  user_territory text not null default '',
  prompt text not null,
  answer text not null default '',
  tools_used text[] not null default '{}',
  rounds integer not null default 0,
  visible_records integer not null default 0
);

create index if not exists agent_query_log_timestamp_idx on public.agent_query_log(timestamp desc);
create index if not exists agent_query_log_user_idx on public.agent_query_log(user_uid, timestamp desc);

alter table public.agent_query_log enable row level security;

drop policy if exists "Users can insert own agent query logs" on public.agent_query_log;
drop policy if exists "Leadership can read agent query logs" on public.agent_query_log;

create policy "Users can insert own agent query logs" on public.agent_query_log
  for insert to authenticated
  with check (user_uid = (select auth.uid()));

create policy "Leadership can read agent query logs" on public.agent_query_log
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'director', 'manager'));

drop policy if exists "Admins can read integration logs" on public.integration_logs;
drop policy if exists "Leadership can read integration logs" on public.integration_logs;
create policy "Leadership can read integration logs" on public.integration_logs
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'director', 'manager'));
