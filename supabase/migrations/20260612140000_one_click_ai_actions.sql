create extension if not exists pgcrypto;

create table if not exists public.ai_action_log (
  id uuid primary key default gen_random_uuid(),
  "timestamp" timestamptz not null default now(),
  user_uid uuid references auth.users(id) on delete set null,
  user_role text not null default '',
  scope text not null default 'company_record',
  company_id uuid references public.leads(id) on delete set null,
  action text not null,
  duration_ms integer not null default 0,
  status text not null default 'success' check (status in ('success', 'failed')),
  error text not null default ''
);

alter table public.ai_action_log
  add column if not exists user_role text not null default '',
  add column if not exists scope text not null default 'company_record',
  add column if not exists company_id uuid references public.leads(id) on delete set null,
  add column if not exists action text not null default '',
  add column if not exists duration_ms integer not null default 0,
  add column if not exists status text not null default 'success',
  add column if not exists error text not null default '';

create index if not exists ai_action_log_user_timestamp_idx on public.ai_action_log(user_uid, "timestamp" desc);
create index if not exists ai_action_log_company_idx on public.ai_action_log(company_id);

create table if not exists public.attention_flags (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.leads(id) on delete set null,
  company_name text not null default '',
  flagged_by_uid uuid references auth.users(id) on delete set null,
  flagged_by_name text not null default '',
  flagged_at timestamptz not null default now(),
  reason text not null default '',
  latest_pmr_id uuid references public.pmrs(id) on delete set null,
  latest_pmr_snapshot jsonb not null default '{}'::jsonb,
  company_snapshot jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  acknowledged_by text not null default '',
  acknowledged_at timestamptz,
  resolution_note text not null default '',
  resolved_by text not null default '',
  resolved_at timestamptz
);

create index if not exists attention_flags_status_flagged_at_idx on public.attention_flags(status, flagged_at desc);
create index if not exists attention_flags_company_idx on public.attention_flags(company_id);
create index if not exists attention_flags_flagged_by_idx on public.attention_flags(flagged_by_uid);

alter table public.ai_action_log enable row level security;
alter table public.attention_flags enable row level security;

grant select, insert on public.ai_action_log to authenticated;
grant select, insert, update on public.attention_flags to authenticated;

drop policy if exists "Users can insert own AI action logs" on public.ai_action_log;
drop policy if exists "Users can read own AI action logs" on public.ai_action_log;
drop policy if exists "Leadership can read AI action logs" on public.ai_action_log;

create policy "Users can insert own AI action logs" on public.ai_action_log
  for insert to authenticated
  with check (user_uid = (select auth.uid()));

create policy "Users can read own AI action logs" on public.ai_action_log
  for select to authenticated
  using (user_uid = (select auth.uid()));

create policy "Leadership can read AI action logs" on public.ai_action_log
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'director', 'manager'));

drop policy if exists "Users can create attention flags" on public.attention_flags;
drop policy if exists "Salesmen can read own attention flags" on public.attention_flags;
drop policy if exists "Leadership can read attention flags" on public.attention_flags;
drop policy if exists "Leadership can update attention flags" on public.attention_flags;

create policy "Users can create attention flags" on public.attention_flags
  for insert to authenticated
  with check (flagged_by_uid = (select auth.uid()));

create policy "Salesmen can read own attention flags" on public.attention_flags
  for select to authenticated
  using (flagged_by_uid = (select auth.uid()));

create policy "Leadership can read attention flags" on public.attention_flags
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'director', 'manager'));

create policy "Leadership can update attention flags" on public.attention_flags
  for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'director', 'manager'))
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'director', 'manager'));
