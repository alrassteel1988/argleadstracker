-- Production originally created notifications as a generic JSON envelope.
-- Reconcile it with the canonical CRM shape before user-scoped policies refer
-- to recipient_uid. Existing JSON data is retained for rollback compatibility.

alter table public.notifications
  add column if not exists recipient_uid uuid,
  add column if not exists lead_id uuid,
  add column if not exists type text default 'handoff',
  add column if not exists title text default '',
  add column if not exists message text default '',
  add column if not exists status text default 'pending',
  add column if not exists payload jsonb default '{}'::jsonb;

-- Preserve the legacy data envelope when that column exists. Dynamic SQL keeps
-- this migration valid for projects that already have the canonical schema.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'notifications'
      and column_name = 'data'
  ) then
    execute $sql$
      update public.notifications
      set payload = case
        when coalesce(payload, '{}'::jsonb) = '{}'::jsonb
          then coalesce(data, '{}'::jsonb)
        else payload
      end
      where data is not null
    $sql$;
  end if;
end;
$$;

-- Recover canonical values when legacy JSON already contains them. Invalid or
-- absent UUIDs remain null and are hidden by the recipient-scoped RLS policy.
update public.notifications
set recipient_uid = (
  coalesce(
    payload ->> 'recipient_uid',
    payload ->> 'recipient_id',
    payload ->> 'user_id'
  )
)::uuid
where recipient_uid is null
  and coalesce(
    payload ->> 'recipient_uid',
    payload ->> 'recipient_id',
    payload ->> 'user_id'
  ) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

update public.notifications
set lead_id = (payload ->> 'lead_id')::uuid
where lead_id is null
  and (payload ->> 'lead_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

update public.notifications
set type = coalesce(nullif(payload ->> 'type', ''), nullif(type, ''), 'handoff'),
    title = coalesce(nullif(payload ->> 'title', ''), nullif(title, ''), ''),
    message = coalesce(nullif(payload ->> 'message', ''), nullif(message, ''), ''),
    status = case
      when coalesce(nullif(payload ->> 'status', ''), nullif(status, ''), 'pending')
        in ('pending', 'read', 'dismissed')
        then coalesce(nullif(payload ->> 'status', ''), nullif(status, ''), 'pending')
      else 'pending'
    end,
    payload = coalesce(payload, '{}'::jsonb);

alter table public.notifications
  alter column type set default 'handoff',
  alter column type set not null,
  alter column title set default '',
  alter column title set not null,
  alter column message set default '',
  alter column message set not null,
  alter column status set default 'pending',
  alter column status set not null,
  alter column payload set default '{}'::jsonb,
  alter column payload set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.notifications'::regclass
      and conname = 'notifications_recipient_uid_fkey'
  ) then
    alter table public.notifications
      add constraint notifications_recipient_uid_fkey
      foreign key (recipient_uid) references auth.users(id) on delete cascade
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.notifications'::regclass
      and conname = 'notifications_lead_id_fkey'
  ) then
    alter table public.notifications
      add constraint notifications_lead_id_fkey
      foreign key (lead_id) references public.leads(id) on delete cascade
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.notifications'::regclass
      and conname = 'notifications_status_check'
  ) then
    alter table public.notifications
      add constraint notifications_status_check
      check (status in ('pending', 'read', 'dismissed')) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.notifications'::regclass
      and conname = 'notifications_recipient_uid_required'
  ) then
    alter table public.notifications
      add constraint notifications_recipient_uid_required
      check (recipient_uid is not null) not valid;
  end if;
end;
$$;

create index if not exists notifications_recipient_status_idx
  on public.notifications(recipient_uid, status);
