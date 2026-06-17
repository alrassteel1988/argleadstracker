create extension if not exists pgcrypto;

create table if not exists public.app_config (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.configuration_audit_log (
  id text primary key,
  "timestamp" timestamptz not null default now(),
  actor_uid uuid references auth.users(id),
  actor_name text not null default '',
  action text not null default '',
  before_config jsonb not null default '{}'::jsonb,
  after_config jsonb not null default '{}'::jsonb,
  diff jsonb not null default '[]'::jsonb,
  details jsonb not null default '{}'::jsonb
);

create index if not exists configuration_audit_log_timestamp_idx
  on public.configuration_audit_log("timestamp" desc);

alter table public.app_config enable row level security;
alter table public.configuration_audit_log enable row level security;

grant select, insert, update on public.app_config to authenticated;
grant select, insert on public.configuration_audit_log to authenticated;

drop policy if exists "Admins can read app config" on public.app_config;
drop policy if exists "Admins can manage app config" on public.app_config;
drop policy if exists "Admins can read configuration audit" on public.configuration_audit_log;
drop policy if exists "Admins can insert configuration audit" on public.configuration_audit_log;

create policy "Admins can read app config" on public.app_config
  for select to authenticated
  using (
    exists (
      select 1
      from public.profiles profile
      where profile.id = (select auth.uid())
        and profile.role = 'admin'
    )
  );

create policy "Admins can manage app config" on public.app_config
  for all to authenticated
  using (
    exists (
      select 1
      from public.profiles profile
      where profile.id = (select auth.uid())
        and profile.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles profile
      where profile.id = (select auth.uid())
        and profile.role = 'admin'
    )
  );

create policy "Admins can read configuration audit" on public.configuration_audit_log
  for select to authenticated
  using (
    exists (
      select 1
      from public.profiles profile
      where profile.id = (select auth.uid())
        and profile.role = 'admin'
    )
  );

create policy "Admins can insert configuration audit" on public.configuration_audit_log
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.profiles profile
      where profile.id = (select auth.uid())
        and profile.role = 'admin'
    )
  );
