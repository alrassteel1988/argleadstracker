create extension if not exists pgcrypto;

create table if not exists public.weekly_sales_reports (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  week_ending date not null,
  rep_name text not null default '',
  rep_email text not null default '',
  branch text not null default '',
  territory text not null default '',
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'submitted', 'under_review', 'accepted', 'revision_required')),
  summary text not null default '',
  no_secured_orders_confirmed boolean not null default false,
  no_expected_orders_confirmed boolean not null default false,
  no_problematic_accounts_confirmed boolean not null default false,
  secured_orders jsonb not null default '[]'::jsonb,
  expected_orders jsonb not null default '[]'::jsonb,
  problematic_accounts jsonb not null default '[]'::jsonb,
  market_intelligence jsonb not null default '{}'::jsonb,
  next_week_plan text not null default '',
  attested boolean not null default false,
  attested_at timestamptz,
  attestation_device text not null default '',
  submitted_at timestamptz,
  reviewed_at timestamptz,
  review_note text not null default '',
  contradiction_flags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_ending)
);

create table if not exists public.weekly_report_events (
  id text primary key,
  report_id text not null references public.weekly_sales_reports(id) on delete cascade,
  timestamp timestamptz not null default now(),
  actor_uid uuid references auth.users(id),
  actor_name text not null default '',
  actor_role text not null default '',
  action text not null default '',
  details jsonb not null default '{}'::jsonb
);

create index if not exists weekly_sales_reports_user_week_idx
  on public.weekly_sales_reports(user_id, week_ending desc);

create index if not exists weekly_sales_reports_status_idx
  on public.weekly_sales_reports(status, submitted_at desc);

create index if not exists weekly_report_events_report_id_idx
  on public.weekly_report_events(report_id, timestamp desc);

drop trigger if exists weekly_sales_reports_set_updated_at on public.weekly_sales_reports;
create trigger weekly_sales_reports_set_updated_at before update on public.weekly_sales_reports
for each row execute function public.set_updated_at();

alter table public.weekly_sales_reports enable row level security;
alter table public.weekly_report_events enable row level security;

grant select, insert, update on public.weekly_sales_reports to authenticated;
grant select, insert on public.weekly_report_events to authenticated;

drop policy if exists "Leadership can read weekly sales reports" on public.weekly_sales_reports;
drop policy if exists "Salesmen can read own weekly sales reports" on public.weekly_sales_reports;
drop policy if exists "Salesmen can insert own weekly sales reports" on public.weekly_sales_reports;
drop policy if exists "Salesmen can update editable weekly sales reports" on public.weekly_sales_reports;
drop policy if exists "Leadership can update weekly sales reports" on public.weekly_sales_reports;

create policy "Leadership can read weekly sales reports" on public.weekly_sales_reports
  for select to authenticated
  using (
    exists (
      select 1
      from public.profiles profile
      where profile.id = (select auth.uid())
        and profile.role in ('admin', 'director', 'manager')
    )
  );

create policy "Salesmen can read own weekly sales reports" on public.weekly_sales_reports
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Salesmen can insert own weekly sales reports" on public.weekly_sales_reports
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Salesmen can update editable weekly sales reports" on public.weekly_sales_reports
  for update to authenticated
  using (
    user_id = (select auth.uid())
    and status in ('not_started', 'in_progress', 'revision_required')
  )
  with check (
    user_id = (select auth.uid())
  );

create policy "Leadership can update weekly sales reports" on public.weekly_sales_reports
  for update to authenticated
  using (
    exists (
      select 1
      from public.profiles profile
      where profile.id = (select auth.uid())
        and profile.role in ('admin', 'director', 'manager')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles profile
      where profile.id = (select auth.uid())
        and profile.role in ('admin', 'director', 'manager')
    )
  );

drop policy if exists "Leadership can read weekly report events" on public.weekly_report_events;
drop policy if exists "Salesmen can read own weekly report events" on public.weekly_report_events;
drop policy if exists "Leadership can insert weekly report events" on public.weekly_report_events;
drop policy if exists "Salesmen can insert own weekly report events" on public.weekly_report_events;

create policy "Leadership can read weekly report events" on public.weekly_report_events
  for select to authenticated
  using (
    exists (
      select 1
      from public.profiles profile
      where profile.id = (select auth.uid())
        and profile.role in ('admin', 'director', 'manager')
    )
  );

create policy "Salesmen can read own weekly report events" on public.weekly_report_events
  for select to authenticated
  using (
    exists (
      select 1
      from public.weekly_sales_reports report
      where report.id = report_id
        and report.user_id = (select auth.uid())
    )
  );

create policy "Leadership can insert weekly report events" on public.weekly_report_events
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.profiles profile
      where profile.id = (select auth.uid())
        and profile.role in ('admin', 'director', 'manager')
    )
  );

create policy "Salesmen can insert own weekly report events" on public.weekly_report_events
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.weekly_sales_reports report
      where report.id = report_id
        and report.user_id = (select auth.uid())
    )
  );
