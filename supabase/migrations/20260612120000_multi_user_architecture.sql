create extension if not exists pgcrypto;

alter table public.profiles add column if not exists territory text not null default 'UAE-North';
alter table public.leads add column if not exists territory text not null default 'UAE-North';
alter table public.leads add column if not exists assigned_to uuid references auth.users(id);
alter table public.leads add column if not exists created_by uuid default auth.uid() references auth.users(id);
alter table public.leads add column if not exists activities jsonb not null default '[]'::jsonb;

do $$
declare
  constraint_name text;
begin
  select conname
  into constraint_name
  from pg_constraint
  where conrelid = 'public.profiles'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%role%';

  if constraint_name is not null then
    execute format('alter table public.profiles drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'director', 'manager', 'salesman'));

update public.profiles
set territory = case
  when lower(territory) in ('dubai', 'sharjah', 'ajman', 'ras al khaimah', 'rak', 'fujairah', 'umm al quwain', 'uaq', 'uae', 'uae north') then 'UAE-North'
  when lower(territory) in ('abu dhabi', 'al ain', 'uae south') then 'UAE-South'
  when lower(territory) like '%saudi%' then 'Saudi'
  when lower(territory) like '%kuwait%' then 'Kuwait'
  when lower(territory) like '%bahrain%' then 'Bahrain'
  when lower(territory) like '%oman%' then 'Oman'
  when lower(territory) like '%mixed%' then 'Mixed'
  when coalesce(territory, '') = '' then 'UAE-North'
  else territory
end;

update public.leads
set territory = case
  when lower(territory) in ('dubai', 'sharjah', 'ajman', 'ras al khaimah', 'rak', 'fujairah', 'umm al quwain', 'uaq', 'uae', 'uae north') then 'UAE-North'
  when lower(territory) in ('abu dhabi', 'al ain', 'uae south') then 'UAE-South'
  when lower(territory) like '%saudi%' then 'Saudi'
  when lower(territory) like '%kuwait%' then 'Kuwait'
  when lower(territory) like '%bahrain%' then 'Bahrain'
  when lower(territory) like '%oman%' then 'Oman'
  when lower(territory) like '%mixed%' then 'Mixed'
  when coalesce(territory, '') = '' then 'UAE-North'
  else territory
end;

update public.leads as lead
set assigned_to = profile.id
from public.profiles as profile
where lead.assigned_to is null
  and lower(profile.full_name) = lower(lead.assigned_salesman);

create table if not exists public.handoff_logs (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  handoff_id text not null unique,
  "timestamp" timestamptz not null default now(),
  previous_owner_uid uuid references auth.users(id),
  previous_owner_name text not null default '',
  new_owner_uid uuid references auth.users(id),
  new_owner_name text not null default '',
  previous_territory text not null default '',
  new_territory text not null default '',
  handoff_note text not null check (length(trim(handoff_note)) >= 20),
  initiated_by_uid uuid references auth.users(id),
  initiated_by_name text not null default '',
  initiated_by_role text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_uid uuid not null references auth.users(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  type text not null default 'handoff',
  title text not null default '',
  message text not null default '',
  status text not null default 'pending' check (status in ('pending', 'read', 'dismissed')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists profiles_territory_idx on public.profiles(territory);
create index if not exists leads_territory_idx on public.leads(territory);
create index if not exists leads_assigned_to_idx on public.leads(assigned_to);
create index if not exists handoff_logs_lead_id_idx on public.handoff_logs(lead_id);
create index if not exists notifications_recipient_status_idx on public.notifications(recipient_uid, status);

alter table public.profiles enable row level security;
alter table public.leads enable row level security;
alter table public.pmrs enable row level security;
alter table public.handoff_logs enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "Authenticated users can read profiles" on public.profiles;
drop policy if exists "Admins can read all profiles" on public.profiles;
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Leadership can read all profiles" on public.profiles;

create policy "Leadership can read all profiles" on public.profiles
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'director', 'manager'));

create policy "Users can read own profile" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists "Authenticated users can read leads" on public.leads;
drop policy if exists "Authenticated users can create leads" on public.leads;
drop policy if exists "Authenticated users can update leads" on public.leads;
drop policy if exists "Authenticated users can delete leads" on public.leads;
drop policy if exists "Admins can read all leads" on public.leads;
drop policy if exists "Admins can create leads" on public.leads;
drop policy if exists "Admins can update leads" on public.leads;
drop policy if exists "Admins can delete leads" on public.leads;
drop policy if exists "Leadership can read all leads" on public.leads;
drop policy if exists "Leadership can create leads" on public.leads;
drop policy if exists "Leadership can update leads" on public.leads;
drop policy if exists "Leadership can delete leads" on public.leads;
drop policy if exists "Salesmen can read own leads" on public.leads;
drop policy if exists "Salesmen can create own leads" on public.leads;
drop policy if exists "Salesmen can update own leads" on public.leads;
drop policy if exists "Salesmen can delete own leads" on public.leads;
drop policy if exists "Salesmen can read territory leads" on public.leads;
drop policy if exists "Salesmen can create territory leads" on public.leads;
drop policy if exists "Salesmen can update territory leads" on public.leads;

create policy "Leadership can read all leads" on public.leads
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'director', 'manager'));

create policy "Leadership can create leads" on public.leads
  for insert to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'director', 'manager'));

create policy "Leadership can update leads" on public.leads
  for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'director', 'manager'))
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'director', 'manager'));

create policy "Leadership can delete leads" on public.leads
  for delete to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Salesmen can read territory leads" on public.leads
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles profile
      where profile.id = (select auth.uid())
        and profile.role = 'salesman'
        and (
          (public.leads.territory <> 'Mixed' and public.leads.territory = profile.territory)
          or (public.leads.territory = 'Mixed' and (public.leads.assigned_to = (select auth.uid()) or lower(public.leads.assigned_salesman) = lower(profile.full_name)))
        )
    )
  );

create policy "Salesmen can create territory leads" on public.leads
  for insert to authenticated
  with check (
    exists (
      select 1 from public.profiles profile
      where profile.id = (select auth.uid())
        and profile.role = 'salesman'
        and public.leads.territory = profile.territory
        and public.leads.territory <> 'Mixed'
        and (public.leads.assigned_to is null or public.leads.assigned_to = (select auth.uid()))
        and public.leads.created_by = (select auth.uid())
    )
  );

create policy "Salesmen can update territory leads" on public.leads
  for update to authenticated
  using (
    exists (
      select 1 from public.profiles profile
      where profile.id = (select auth.uid())
        and profile.role = 'salesman'
        and (
          (public.leads.territory <> 'Mixed' and public.leads.territory = profile.territory)
          or (public.leads.territory = 'Mixed' and (public.leads.assigned_to = (select auth.uid()) or lower(public.leads.assigned_salesman) = lower(profile.full_name)))
        )
    )
  )
  with check (
    exists (
      select 1 from public.profiles profile
      where profile.id = (select auth.uid())
        and profile.role = 'salesman'
        and (
          (public.leads.territory <> 'Mixed' and public.leads.territory = profile.territory)
          or (public.leads.territory = 'Mixed' and (public.leads.assigned_to = (select auth.uid()) or lower(public.leads.assigned_salesman) = lower(profile.full_name)))
        )
    )
  );

drop policy if exists "Authenticated users can read PMRs" on public.pmrs;
drop policy if exists "Authenticated users can create PMRs" on public.pmrs;
drop policy if exists "Admins can read all PMRs" on public.pmrs;
drop policy if exists "Salesmen can read own PMRs" on public.pmrs;
drop policy if exists "Salesmen can create own PMRs" on public.pmrs;
drop policy if exists "Leadership can read all PMRs" on public.pmrs;
drop policy if exists "Salesmen can read territory PMRs" on public.pmrs;
drop policy if exists "Salesmen can create territory PMRs" on public.pmrs;

create policy "Leadership can read all PMRs" on public.pmrs
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'director', 'manager'));

create policy "Salesmen can read territory PMRs" on public.pmrs
  for select to authenticated
  using (
    exists (
      select 1
      from public.leads lead
      join public.profiles profile on profile.id = (select auth.uid())
      where lead.id = public.pmrs.lead_id
        and profile.role = 'salesman'
        and (
          (lead.territory <> 'Mixed' and lead.territory = profile.territory)
          or (lead.territory = 'Mixed' and (lead.assigned_to = (select auth.uid()) or lower(lead.assigned_salesman) = lower(profile.full_name)))
        )
    )
  );

create policy "Salesmen can create territory PMRs" on public.pmrs
  for insert to authenticated
  with check (
    public.pmrs.filed_by = (select auth.uid())
    and exists (
      select 1
      from public.leads lead
      join public.profiles profile on profile.id = (select auth.uid())
      where lead.id = public.pmrs.lead_id
        and profile.role = 'salesman'
        and (
          (lead.territory <> 'Mixed' and lead.territory = profile.territory)
          or (lead.territory = 'Mixed' and (lead.assigned_to = (select auth.uid()) or lower(lead.assigned_salesman) = lower(profile.full_name)))
        )
    )
  );

drop policy if exists "Leadership can read handoffs" on public.handoff_logs;
drop policy if exists "Leadership can create handoffs" on public.handoff_logs;
drop policy if exists "Salesmen can read territory handoffs" on public.handoff_logs;

create policy "Leadership can read handoffs" on public.handoff_logs
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'director', 'manager'));

create policy "Leadership can create handoffs" on public.handoff_logs
  for insert to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'director', 'manager'));

create policy "Salesmen can read territory handoffs" on public.handoff_logs
  for select to authenticated
  using (
    exists (
      select 1
      from public.leads lead
      join public.profiles profile on profile.id = (select auth.uid())
      where lead.id = public.handoff_logs.lead_id
        and profile.role = 'salesman'
        and (
          (lead.territory <> 'Mixed' and lead.territory = profile.territory)
          or (lead.territory = 'Mixed' and (lead.assigned_to = (select auth.uid()) or lower(lead.assigned_salesman) = lower(profile.full_name)))
        )
    )
  );

drop policy if exists "Users can read own notifications" on public.notifications;
drop policy if exists "Leadership can create notifications" on public.notifications;

create policy "Users can read own notifications" on public.notifications
  for select to authenticated
  using (recipient_uid = (select auth.uid()));

create policy "Leadership can create notifications" on public.notifications
  for insert to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'director', 'manager'));
