-- Supports overdue reminder banners for projects that normalize activities
-- into public.activities. Current ARG Leads Tracker deployments may also keep
-- activities inside public.leads.activities JSONB, which does not need a
-- schema change.

alter table if exists public.activities
  add column if not exists completed_at timestamptz;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'activities'
  ) then
    execute '
      create index if not exists activities_open_reminders_due_idx
      on public.activities (reminder_due_date)
      where type = ''Reminder'' and completed_at is null
    ';
  end if;
end $$;
