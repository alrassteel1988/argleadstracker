-- BEGIN supabase\migrations\20260606120000_role_scoped_salesman_access.sql
update public.leads as lead
set assigned_to = profile.id
from public.profiles as profile
where lead.assigned_to is null
  and profile.role = 'salesman'
  and lower(profile.full_name) = lower(lead.assigned_salesman);

drop policy if exists "Authenticated users can read profiles" on public.profiles;
drop policy if exists "Admins can read all profiles" on public.profiles;
drop policy if exists "Users can read own profile" on public.profiles;

create policy "Admins can read all profiles" on public.profiles
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

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
drop policy if exists "Salesmen can read own leads" on public.leads;
drop policy if exists "Salesmen can create own leads" on public.leads;
drop policy if exists "Salesmen can update own leads" on public.leads;
drop policy if exists "Salesmen can delete own leads" on public.leads;

create policy "Admins can read all leads" on public.leads
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admins can create leads" on public.leads
  for insert to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admins can update leads" on public.leads
  for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admins can delete leads" on public.leads
  for delete to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Salesmen can read own leads" on public.leads
  for select to authenticated
  using (
    created_by = (select auth.uid())
    or assigned_to = (select auth.uid())
    or exists (
      select 1
      from public.profiles profile
      where profile.id = (select auth.uid())
        and profile.role = 'salesman'
        and lower(profile.full_name) = lower(public.leads.assigned_salesman)
    )
  );

create policy "Salesmen can create own leads" on public.leads
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (assigned_to is null or assigned_to = (select auth.uid()))
  );

create policy "Salesmen can update own leads" on public.leads
  for update to authenticated
  using (
    created_by = (select auth.uid())
    or assigned_to = (select auth.uid())
    or exists (
      select 1
      from public.profiles profile
      where profile.id = (select auth.uid())
        and profile.role = 'salesman'
        and lower(profile.full_name) = lower(public.leads.assigned_salesman)
    )
  )
  with check (
    created_by = (select auth.uid())
    or assigned_to = (select auth.uid())
    or exists (
      select 1
      from public.profiles profile
      where profile.id = (select auth.uid())
        and profile.role = 'salesman'
        and lower(profile.full_name) = lower(public.leads.assigned_salesman)
    )
  );

create policy "Salesmen can delete own leads" on public.leads
  for delete to authenticated
  using (
    created_by = (select auth.uid())
    or assigned_to = (select auth.uid())
    or exists (
      select 1
      from public.profiles profile
      where profile.id = (select auth.uid())
        and profile.role = 'salesman'
        and lower(profile.full_name) = lower(public.leads.assigned_salesman)
    )
  );

drop policy if exists "Authenticated users can read PMRs" on public.pmrs;
drop policy if exists "Authenticated users can create PMRs" on public.pmrs;
drop policy if exists "Admins can read all PMRs" on public.pmrs;
drop policy if exists "Salesmen can read own PMRs" on public.pmrs;
drop policy if exists "Salesmen can create own PMRs" on public.pmrs;

create policy "Admins can read all PMRs" on public.pmrs
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Salesmen can read own PMRs" on public.pmrs
  for select to authenticated
  using (
    exists (
      select 1
      from public.leads lead
      where lead.id = public.pmrs.lead_id
        and (
          lead.created_by = (select auth.uid())
          or lead.assigned_to = (select auth.uid())
          or exists (
            select 1
            from public.profiles profile
            where profile.id = (select auth.uid())
              and profile.role = 'salesman'
              and lower(profile.full_name) = lower(lead.assigned_salesman)
          )
        )
    )
  );

create policy "Salesmen can create own PMRs" on public.pmrs
  for insert to authenticated
  with check (
    filed_by = (select auth.uid())
    and exists (
      select 1
      from public.leads lead
      where lead.id = public.pmrs.lead_id
        and (
          lead.created_by = (select auth.uid())
          or lead.assigned_to = (select auth.uid())
          or exists (
            select 1
            from public.profiles profile
            where profile.id = (select auth.uid())
              and profile.role = 'salesman'
              and lower(profile.full_name) = lower(lead.assigned_salesman)
          )
        )
    )
  );

-- END supabase\migrations\20260606120000_role_scoped_salesman_access.sql

-- BEGIN supabase\migrations\20260609120000_supabase_pmrs_and_voice_storage.sql
alter table public.pmrs add column if not exists voice_note_id text not null default '';
alter table public.pmrs add column if not exists voice_note_url text not null default '';
alter table public.pmrs add column if not exists voice_note_path text not null default '';
alter table public.pmrs add column if not exists voice_note_mime_type text not null default '';
alter table public.pmrs add column if not exists voice_note_size_bytes integer not null default 0;
alter table public.pmrs add column if not exists voice_note_transcript text not null default '';

create index if not exists pmrs_voice_note_id_idx on public.pmrs(voice_note_id)
  where voice_note_id <> '';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pmr-voice-notes',
  'pmr-voice-notes',
  false,
  20971520,
  array['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'application/octet-stream']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Authenticated users can read PMRs" on public.pmrs;
drop policy if exists "Authenticated users can create PMRs" on public.pmrs;
drop policy if exists "Admins can read all PMRs" on public.pmrs;
drop policy if exists "Salesmen can read own PMRs" on public.pmrs;
drop policy if exists "Salesmen can create own PMRs" on public.pmrs;

create policy "Admins can read all PMRs" on public.pmrs
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Salesmen can read own PMRs" on public.pmrs
  for select to authenticated
  using (
    exists (
      select 1
      from public.leads lead
      where lead.id = public.pmrs.lead_id
        and (
          lead.created_by = (select auth.uid())
          or lead.assigned_to = (select auth.uid())
          or exists (
            select 1
            from public.profiles profile
            where profile.id = (select auth.uid())
              and profile.role = 'salesman'
              and lower(profile.full_name) = lower(lead.assigned_salesman)
          )
        )
    )
  );

create policy "Salesmen can create own PMRs" on public.pmrs
  for insert to authenticated
  with check (
    filed_by = (select auth.uid())
    and exists (
      select 1
      from public.leads lead
      where lead.id = public.pmrs.lead_id
        and (
          lead.created_by = (select auth.uid())
          or lead.assigned_to = (select auth.uid())
          or exists (
            select 1
            from public.profiles profile
            where profile.id = (select auth.uid())
              and profile.role = 'salesman'
              and lower(profile.full_name) = lower(lead.assigned_salesman)
          )
        )
    )
  );

-- END supabase\migrations\20260609120000_supabase_pmrs_and_voice_storage.sql
