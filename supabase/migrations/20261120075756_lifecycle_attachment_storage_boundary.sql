begin;

-- Keep the restrictive policy and its grants; uploader ownership must not
-- bypass the lifecycle of a lead encoded in an attachment's storage key.
create or replace function private.lifecycle_storage_visible(p_name text) returns boolean
language sql stable security definer set search_path=pg_catalog as $$
  select private.lifecycle_admin() or (
    auth.uid() is not null
    and case when split_part(p_name,'/',1) in ('activity-attachments','lead-intelligence') then
      exists(select 1 from public.leads l
        where l.id::text=lower(split_part(p_name,'/',2)) and not l.is_archived)
      else true end
    and not exists(select 1 from private.lead_lifecycle_file_guards where file_name=p_name)
    and not exists (
      select 1 from public.pmrs p join public.leads l
        on l.id::text=coalesce(nullif(to_jsonb(p)->>'lead_id',''),to_jsonb(p)->>'company_id')
      where to_jsonb(p)->>'voice_note_path'=p_name and l.is_archived
    )
  );
$$;

commit;
