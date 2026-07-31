-- Durable weekly-report lifecycle: immutable submissions, review decisions,
-- optimistic locking, idempotency, and append-only audit events.

create extension if not exists pgcrypto;

alter table public.weekly_sales_reports
  add column if not exists week_start date,
  add column if not exists current_version_number integer not null default 0,
  add column if not exists current_version_id text,
  add column if not exists reviewed_by_admin_id uuid references auth.users(id),
  add column if not exists latest_review_note text not null default '',
  add column if not exists accepted_at timestamptz,
  add column if not exists rejected_at timestamptz,
  add column if not exists row_version integer not null default 0,
  add column if not exists last_idempotency_key text;

update public.weekly_sales_reports
set week_start = week_ending - 4
where week_start is null;

alter table public.weekly_sales_reports
  alter column week_start set not null;

alter table public.weekly_sales_reports
  drop constraint if exists weekly_sales_reports_status_check;

alter table public.weekly_sales_reports
  add constraint weekly_sales_reports_status_check
  check (status in (
    'not_started',
    'in_progress',
    'submitted',
    'under_review',
    'accepted',
    'rejected',
    'revision_required'
  ));

create table if not exists public.weekly_report_versions (
  id text primary key,
  weekly_report_id text not null references public.weekly_sales_reports(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  report_payload jsonb not null,
  submitted_by uuid not null references auth.users(id),
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (weekly_report_id, version_number)
);

create table if not exists public.weekly_report_reviews (
  id text primary key,
  weekly_report_id text not null references public.weekly_sales_reports(id) on delete cascade,
  report_version_id text not null references public.weekly_report_versions(id) on delete restrict,
  admin_id uuid not null references auth.users(id),
  admin_name text not null default '',
  decision text not null check (decision in ('under_review', 'accepted', 'rejected', 'revision_required')),
  review_note text not null default '',
  idempotency_key text,
  created_at timestamptz not null default now()
);

alter table public.weekly_report_events
  add column if not exists report_version_id text references public.weekly_report_versions(id) on delete restrict,
  add column if not exists event_type text,
  add column if not exists previous_status text,
  add column if not exists new_status text,
  add column if not exists idempotency_key text,
  add column if not exists created_at timestamptz not null default now();

update public.weekly_report_events
set event_type = action
where event_type is null;

-- Backfill one immutable version for existing submitted/reviewed reports.
insert into public.weekly_report_versions (
  id,
  weekly_report_id,
  version_number,
  report_payload,
  submitted_by,
  submitted_at,
  created_at
)
select
  'wsrv-backfill-' || report.id,
  report.id,
  1,
  to_jsonb(report),
  report.user_id,
  coalesce(report.submitted_at, report.updated_at, report.created_at, now()),
  coalesce(report.submitted_at, report.updated_at, report.created_at, now())
from public.weekly_sales_reports report
where report.status in ('submitted', 'under_review', 'accepted', 'rejected', 'revision_required')
  and not exists (
    select 1 from public.weekly_report_versions version
    where version.weekly_report_id = report.id
  );

update public.weekly_sales_reports report
set
  current_version_number = version.version_number,
  current_version_id = version.id,
  latest_review_note = coalesce(nullif(report.latest_review_note, ''), report.review_note, '')
from public.weekly_report_versions version
where version.weekly_report_id = report.id
  and version.version_number = (
    select max(latest.version_number)
    from public.weekly_report_versions latest
    where latest.weekly_report_id = report.id
  )
  and (report.current_version_id is null or report.current_version_number = 0);

alter table public.weekly_sales_reports
  drop constraint if exists weekly_sales_reports_current_version_id_fkey;

alter table public.weekly_sales_reports
  add constraint weekly_sales_reports_current_version_id_fkey
  foreign key (current_version_id)
  references public.weekly_report_versions(id)
  deferrable initially deferred;

create unique index if not exists weekly_sales_reports_user_period_uidx
  on public.weekly_sales_reports(user_id, week_start, week_ending);

create index if not exists weekly_report_versions_report_idx
  on public.weekly_report_versions(weekly_report_id, version_number desc);

create index if not exists weekly_report_reviews_report_idx
  on public.weekly_report_reviews(weekly_report_id, created_at desc);

create unique index if not exists weekly_report_reviews_idempotency_uidx
  on public.weekly_report_reviews(idempotency_key)
  where idempotency_key is not null;

create unique index if not exists weekly_report_events_idempotency_uidx
  on public.weekly_report_events(idempotency_key)
  where idempotency_key is not null;

alter table public.weekly_report_versions enable row level security;
alter table public.weekly_report_reviews enable row level security;

grant select on public.weekly_report_versions to authenticated;
grant select on public.weekly_report_reviews to authenticated;

drop policy if exists "Leadership can read weekly report versions" on public.weekly_report_versions;
drop policy if exists "Salesmen can read own weekly report versions" on public.weekly_report_versions;
drop policy if exists "Leadership can read weekly report reviews" on public.weekly_report_reviews;
drop policy if exists "Salesmen can read own weekly report reviews" on public.weekly_report_reviews;

create policy "Leadership can read weekly report versions" on public.weekly_report_versions
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles profile
      where profile.id = (select auth.uid())
        and profile.role in ('admin', 'director', 'manager')
    )
  );

create policy "Salesmen can read own weekly report versions" on public.weekly_report_versions
  for select to authenticated
  using (
    exists (
      select 1 from public.weekly_sales_reports report
      where report.id = weekly_report_id
        and report.user_id = (select auth.uid())
    )
  );

create policy "Leadership can read weekly report reviews" on public.weekly_report_reviews
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles profile
      where profile.id = (select auth.uid())
        and profile.role in ('admin', 'director', 'manager')
    )
  );

create policy "Salesmen can read own weekly report reviews" on public.weekly_report_reviews
  for select to authenticated
  using (
    exists (
      select 1 from public.weekly_sales_reports report
      where report.id = weekly_report_id
        and report.user_id = (select auth.uid())
    )
  );

create or replace function public.submit_weekly_report(
  p_report jsonb,
  p_expected_row_version integer default null,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_report public.weekly_sales_reports;
  v_version public.weekly_report_versions;
  v_report_id text;
  v_week_start date;
  v_week_end date;
  v_previous_status text;
  v_version_number integer;
  v_now timestamptz := now();
  v_actor_name text;
begin
  if v_uid is null then
    raise exception using errcode = '42501', message = 'Authentication required.';
  end if;

  v_week_end := nullif(p_report ->> 'week_ending', '')::date;
  v_week_start := coalesce(nullif(p_report ->> 'week_start', '')::date, v_week_end - 4);
  if v_week_start is null or v_week_end is null or v_week_start > v_week_end then
    raise exception using errcode = '22023', message = 'Choose a valid weekly reporting period.';
  end if;

  select * into v_report
  from public.weekly_sales_reports
  where user_id = v_uid
    and week_start = v_week_start
    and week_ending = v_week_end
  for update;

  if found and p_idempotency_key is not null
    and v_report.last_idempotency_key = p_idempotency_key
    and v_report.status = 'submitted' then
    select * into v_version
    from public.weekly_report_versions
    where id = v_report.current_version_id;
    return jsonb_build_object('report', to_jsonb(v_report), 'version', to_jsonb(v_version), 'idempotent', true);
  end if;

  if found and v_report.status not in ('not_started', 'in_progress', 'revision_required') then
    raise exception using errcode = '40001', message = 'This weekly report is locked after submission.';
  end if;

  if found and p_expected_row_version is not null and v_report.row_version <> p_expected_row_version then
    raise exception using errcode = '40001', message = 'This weekly report changed in another session.';
  end if;

  v_previous_status := coalesce(v_report.status, 'not_started');
  v_report_id := coalesce(v_report.id, nullif(p_report ->> 'id', ''), 'wsr-' || gen_random_uuid()::text);

  if not found then
    insert into public.weekly_sales_reports (
      id, user_id, week_start, week_ending, rep_name, rep_email, branch, territory,
      status, summary, no_secured_orders_confirmed, no_expected_orders_confirmed,
      no_problematic_accounts_confirmed, secured_orders, expected_orders,
      problematic_accounts, market_intelligence, next_week_plan, attested,
      attested_at, attestation_device, contradiction_flags, created_at, updated_at
    ) values (
      v_report_id, v_uid, v_week_start, v_week_end,
      coalesce(p_report ->> 'rep_name', ''),
      coalesce(p_report ->> 'rep_email', ''),
      coalesce(p_report ->> 'branch', ''),
      coalesce(p_report ->> 'territory', ''),
      'in_progress',
      coalesce(p_report ->> 'summary', ''),
      coalesce((p_report ->> 'no_secured_orders_confirmed')::boolean, false),
      coalesce((p_report ->> 'no_expected_orders_confirmed')::boolean, false),
      coalesce((p_report ->> 'no_problematic_accounts_confirmed')::boolean, false),
      coalesce(p_report -> 'secured_orders', '[]'::jsonb),
      coalesce(p_report -> 'expected_orders', '[]'::jsonb),
      coalesce(p_report -> 'problematic_accounts', '[]'::jsonb),
      coalesce(p_report -> 'market_intelligence', '{}'::jsonb),
      coalesce(p_report ->> 'next_week_plan', ''),
      coalesce((p_report ->> 'attested')::boolean, false),
      nullif(p_report ->> 'attested_at', '')::timestamptz,
      coalesce(p_report ->> 'attestation_device', ''),
      coalesce(p_report -> 'contradiction_flags', '[]'::jsonb),
      v_now, v_now
    )
    returning * into v_report;
  else
    update public.weekly_sales_reports set
      rep_name = coalesce(p_report ->> 'rep_name', rep_name),
      rep_email = coalesce(p_report ->> 'rep_email', rep_email),
      branch = coalesce(p_report ->> 'branch', branch),
      territory = coalesce(p_report ->> 'territory', territory),
      summary = coalesce(p_report ->> 'summary', ''),
      no_secured_orders_confirmed = coalesce((p_report ->> 'no_secured_orders_confirmed')::boolean, false),
      no_expected_orders_confirmed = coalesce((p_report ->> 'no_expected_orders_confirmed')::boolean, false),
      no_problematic_accounts_confirmed = coalesce((p_report ->> 'no_problematic_accounts_confirmed')::boolean, false),
      secured_orders = coalesce(p_report -> 'secured_orders', '[]'::jsonb),
      expected_orders = coalesce(p_report -> 'expected_orders', '[]'::jsonb),
      problematic_accounts = coalesce(p_report -> 'problematic_accounts', '[]'::jsonb),
      market_intelligence = coalesce(p_report -> 'market_intelligence', '{}'::jsonb),
      next_week_plan = coalesce(p_report ->> 'next_week_plan', ''),
      attested = coalesce((p_report ->> 'attested')::boolean, false),
      attested_at = coalesce(nullif(p_report ->> 'attested_at', '')::timestamptz, attested_at),
      attestation_device = coalesce(p_report ->> 'attestation_device', ''),
      contradiction_flags = coalesce(p_report -> 'contradiction_flags', '[]'::jsonb),
      updated_at = v_now
    where id = v_report.id
    returning * into v_report;
  end if;

  v_version_number := v_report.current_version_number + 1;
  insert into public.weekly_report_versions (
    id, weekly_report_id, version_number, report_payload, submitted_by, submitted_at
  ) values (
    'wsrv-' || gen_random_uuid()::text,
    v_report.id,
    v_version_number,
    p_report || jsonb_build_object(
      'id', v_report.id,
      'user_id', v_uid,
      'week_start', v_week_start,
      'week_ending', v_week_end,
      'status', 'submitted',
      'current_version_number', v_version_number,
      'submitted_at', v_now
    ),
    v_uid,
    v_now
  )
  returning * into v_version;

  update public.weekly_sales_reports set
    status = 'submitted',
    current_version_number = v_version_number,
    current_version_id = v_version.id,
    submitted_at = v_now,
    reviewed_at = null,
    reviewed_by_admin_id = null,
    latest_review_note = '',
    review_note = '',
    accepted_at = null,
    rejected_at = null,
    row_version = row_version + 1,
    last_idempotency_key = p_idempotency_key,
    updated_at = v_now
  where id = v_report.id
  returning * into v_report;

  select coalesce(nullif(full_name, ''), 'Salesman') into v_actor_name
  from public.profiles where id = v_uid;

  insert into public.weekly_report_events (
    id, report_id, report_version_id, timestamp, created_at, actor_uid,
    actor_name, actor_role, action, event_type, previous_status, new_status,
    idempotency_key, details
  ) values (
    'wsre-' || gen_random_uuid()::text,
    v_report.id,
    v_version.id,
    v_now,
    v_now,
    v_uid,
    coalesce(v_actor_name, 'Salesman'),
    'salesman',
    case when v_version_number > 1 then 'report_resubmitted' else 'report_submitted' end,
    case when v_version_number > 1 then 'report_resubmitted' else 'report_submitted' end,
    v_previous_status,
    'submitted',
    p_idempotency_key,
    jsonb_build_object('version_number', v_version_number, 'submitted_at', v_now)
  );

  return jsonb_build_object('report', to_jsonb(v_report), 'version', to_jsonb(v_version), 'idempotent', false);
end;
$$;

create or replace function public.review_weekly_report(
  p_report_id text,
  p_version_id text,
  p_action text,
  p_note text default '',
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_admin_name text;
  v_report public.weekly_sales_reports;
  v_review public.weekly_report_reviews;
  v_action text := lower(trim(p_action));
  v_note text := trim(coalesce(p_note, ''));
  v_previous_status text;
  v_now timestamptz := now();
begin
  select role, coalesce(nullif(full_name, ''), 'Admin')
  into v_role, v_admin_name
  from public.profiles where id = v_uid;

  if v_uid is null or v_role not in ('admin', 'director', 'manager') then
    raise exception using errcode = '42501', message = 'Director access required.';
  end if;

  if v_action not in ('under_review', 'accepted', 'rejected', 'revision_required') then
    raise exception using errcode = '22023', message = 'Choose a valid review action.';
  end if;

  if v_action in ('rejected', 'revision_required') and v_note = '' then
    raise exception using errcode = '22023', message = 'A review note is required for this decision.';
  end if;

  select * into v_report
  from public.weekly_sales_reports
  where id = p_report_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Weekly report not found.';
  end if;

  if p_idempotency_key is not null and v_report.last_idempotency_key = p_idempotency_key and v_report.status = v_action then
    select * into v_review
    from public.weekly_report_reviews
    where idempotency_key = p_idempotency_key;
    return jsonb_build_object('report', to_jsonb(v_report), 'review', to_jsonb(v_review), 'idempotent', true);
  end if;

  if v_report.current_version_id is null or v_report.current_version_id <> p_version_id then
    raise exception using errcode = '40001', message = 'This report has a newer submitted version. Reload it before reviewing.';
  end if;

  if v_report.status not in ('submitted', 'under_review') then
    raise exception using errcode = '40001', message = 'This report is not in a reviewable state.';
  end if;

  v_previous_status := v_report.status;

  insert into public.weekly_report_reviews (
    id, weekly_report_id, report_version_id, admin_id, admin_name,
    decision, review_note, idempotency_key, created_at
  ) values (
    'wsrr-' || gen_random_uuid()::text,
    v_report.id,
    p_version_id,
    v_uid,
    coalesce(v_admin_name, 'Admin'),
    v_action,
    v_note,
    p_idempotency_key,
    v_now
  )
  returning * into v_review;

  update public.weekly_sales_reports set
    status = v_action,
    reviewed_at = v_now,
    reviewed_by_admin_id = v_uid,
    latest_review_note = v_note,
    review_note = v_note,
    accepted_at = case when v_action = 'accepted' then v_now else null end,
    rejected_at = case when v_action = 'rejected' then v_now else null end,
    row_version = row_version + 1,
    last_idempotency_key = p_idempotency_key,
    updated_at = v_now
  where id = v_report.id
  returning * into v_report;

  insert into public.weekly_report_events (
    id, report_id, report_version_id, timestamp, created_at, actor_uid,
    actor_name, actor_role, action, event_type, previous_status, new_status,
    idempotency_key, details
  ) values (
    'wsre-' || gen_random_uuid()::text,
    v_report.id,
    p_version_id,
    v_now,
    v_now,
    v_uid,
    coalesce(v_admin_name, 'Admin'),
    v_role,
    case v_action
      when 'under_review' then 'review_started'
      when 'accepted' then 'report_accepted'
      when 'rejected' then 'report_rejected'
      else 'revision_requested'
    end,
    case v_action
      when 'under_review' then 'review_started'
      when 'accepted' then 'report_accepted'
      when 'rejected' then 'report_rejected'
      else 'revision_requested'
    end,
    v_previous_status,
    v_action,
    p_idempotency_key,
    jsonb_build_object('note', v_note, 'decision', v_action)
  );

  return jsonb_build_object('report', to_jsonb(v_report), 'review', to_jsonb(v_review), 'idempotent', false);
end;
$$;

revoke all on function public.submit_weekly_report(jsonb, integer, text) from public;
revoke all on function public.review_weekly_report(text, text, text, text, text) from public;
grant execute on function public.submit_weekly_report(jsonb, integer, text) to authenticated;
grant execute on function public.review_weekly_report(text, text, text, text, text) to authenticated;
