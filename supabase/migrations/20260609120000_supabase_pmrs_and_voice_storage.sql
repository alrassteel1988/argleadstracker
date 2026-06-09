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
