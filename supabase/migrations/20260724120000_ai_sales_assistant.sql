create table if not exists public.assistant_audit_logs (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_role text not null default '',
  original_command text not null default '',
  translated_command text not null default '',
  detected_language text not null default 'English',
  intent text not null default '',
  extracted_fields jsonb not null default '{}'::jsonb,
  records_considered jsonb not null default '[]'::jsonb,
  selected_record_id text not null default '',
  clarification text not null default '',
  confirmation_status text not null default 'pending',
  activity_id text not null default '',
  draft_id text not null default '',
  status text not null default 'preview',
  error text not null default ''
);

create index if not exists assistant_audit_logs_user_created_idx
  on public.assistant_audit_logs(user_id, created_at desc);

create table if not exists public.email_drafts (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  activity_id text,
  recipient text not null default '',
  cc text not null default '',
  bcc text not null default '',
  subject text not null default '',
  body text not null default '',
  related_quotation text not null default '',
  scheduled_for timestamptz,
  status text not null default 'Draft'
    check (status in ('Draft', 'Scheduled for Review', 'Ready for Review', 'Approved to Send', 'Sending', 'Sent', 'Cancelled', 'Failed')),
  requires_manual_send boolean not null default true,
  sent_at timestamptz
);

create index if not exists email_drafts_user_status_idx
  on public.email_drafts(user_id, status, scheduled_for);

alter table public.assistant_audit_logs enable row level security;
alter table public.email_drafts enable row level security;

grant select, insert, update on public.assistant_audit_logs to authenticated;
grant select, insert, update on public.email_drafts to authenticated;

drop policy if exists "Users manage own assistant audit logs" on public.assistant_audit_logs;
create policy "Users manage own assistant audit logs" on public.assistant_audit_logs
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Leadership reads assistant audit logs" on public.assistant_audit_logs;
create policy "Leadership reads assistant audit logs" on public.assistant_audit_logs
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'director', 'manager'));

drop policy if exists "Users manage own email drafts" on public.email_drafts;
create policy "Users manage own email drafts" on public.email_drafts
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Leadership reads authorized email drafts" on public.email_drafts;
create policy "Leadership reads authorized email drafts" on public.email_drafts
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'director', 'manager'));
