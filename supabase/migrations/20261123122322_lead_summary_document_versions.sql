begin;
set local lock_timeout='5s';

create table public.lead_summary_documents (
  id uuid primary key,
  lead_id uuid references public.leads(id) on delete set null,
  previous_id uuid references public.lead_summary_documents(id),
  assigned_to_at_upload uuid,
  filename text not null check(length(filename) between 1 and 180 and filename ~* '\.pdf$' and filename !~ '[[:cntrl:]/\\]'),
  content_type text not null check(content_type='application/pdf'),
  size integer not null check(size between 1 and 4194304),
  sha256 text not null check(sha256 ~ '^[0-9a-f]{64}$'),
  bucket_id text not null check(length(bucket_id) between 1 and 100),
  storage_key text not null unique,
  uploaded_by uuid not null,
  uploaded_by_name text not null,
  change_note text not null default '' check(length(change_note)<=500),
  created_at timestamptz not null default clock_timestamp(),
  ready_at timestamptz,
  version integer check(version>0),
  review_due_at timestamptz,
  is_current boolean not null default false,
  archived_at timestamptz,
  check ((ready_at is null and version is null and review_due_at is null and not is_current and archived_at is null)
    or (ready_at is not null and version is not null and review_due_at is not null and
      ((is_current and archived_at is null) or (not is_current and archived_at is not null))))
);
create unique index lead_summary_one_current on public.lead_summary_documents(lead_id) where is_current;
create unique index lead_summary_version on public.lead_summary_documents(lead_id,version) where version is not null;
create index lead_summary_history on public.lead_summary_documents(lead_id,version desc);

create table public.lead_summary_document_events (
  document_id uuid primary key references public.lead_summary_documents(id),
  lead_id uuid references public.leads(id) on delete set null,
  previous_id uuid,
  action text not null check(action in ('published','replaced')),
  actor_id uuid not null,
  at timestamptz not null default clock_timestamp(),
  reason text not null
);
alter table public.lead_summary_documents enable row level security;
alter table public.lead_summary_document_events enable row level security;
revoke all on public.lead_summary_documents,public.lead_summary_document_events from public,anon,authenticated,service_role;
grant select on public.lead_summary_documents,public.lead_summary_document_events to authenticated;

create function private.can_read_lead_summary(p_id uuid) returns boolean
language sql stable security definer set search_path=pg_catalog as $$
  select exists(select 1 from public.lead_summary_documents d join public.leads l on l.id=d.lead_id
    join public.profiles p on p.id=auth.uid() where d.id=p_id and p.status='active'
      and (p.role='admin' or (p.role='salesman' and l.assigned_to=p.id and not l.is_archived and d.ready_at is not null and d.is_current)));
$$;
revoke all on function private.can_read_lead_summary(uuid) from public,anon,authenticated,service_role;
grant execute on function private.can_read_lead_summary(uuid) to authenticated;
create policy lead_summary_read on public.lead_summary_documents for select to authenticated
  using(private.can_read_lead_summary(id));
create policy lead_summary_audit_read on public.lead_summary_document_events for select to authenticated
  using(private.can_read_lead_summary(document_id) and private.lifecycle_admin());

create function private.save_lead_summary_document(p_lead uuid,p_id uuid,p_previous uuid,p_note text,p_file jsonb,p_finish boolean) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare actor public.profiles; lead public.leads; doc public.lead_summary_documents; prior uuid; n integer; stamp timestamptz;
begin
  select * into actor from public.profiles where id=auth.uid() and role='admin' and status='active' for share;
  if not found then raise exception 'Active Admin access required' using errcode='42501'; end if;
  select * into lead from public.leads where id=p_lead and not is_archived for update;
  if not found then raise exception 'Active lead not found' using errcode='P0002'; end if;
  if p_note is null or length(p_note)>500 or (p_previous is not null and btrim(p_note)='') then
    raise exception 'Enter a replacement note of up to 500 characters' using errcode='22023'; end if;
  select id into prior from public.lead_summary_documents where lead_id=p_lead and is_current;
  select * into doc from public.lead_summary_documents where id=p_id;
  if found then
    if doc.lead_id is distinct from p_lead or doc.uploaded_by<>actor.id or doc.previous_id is distinct from p_previous
      or doc.change_note is distinct from p_note or doc.filename is distinct from p_file->>'filename'
      or doc.content_type is distinct from p_file->>'content_type' or doc.size::text is distinct from p_file->>'size'
      or doc.sha256 is distinct from p_file->>'sha256' or doc.bucket_id is distinct from p_file->>'bucket_id' then
      raise exception 'This upload request was already used' using errcode='PT409'; end if;
    if doc.ready_at is not null then
      if not doc.is_current then raise exception 'A newer summary is current. Reload before replacing it' using errcode='PT409'; end if;
      return to_jsonb(doc);
    end if;
    if doc.assigned_to_at_upload is distinct from lead.assigned_to then
      raise exception 'Lead assignment changed. Reload before uploading' using errcode='PT409'; end if;
  end if;
  if prior is distinct from p_previous then raise exception 'Current summary changed. Reload before replacing it' using errcode='PT409'; end if;
  if doc.id is null then
    if p_finish then raise exception 'Upload reservation missing' using errcode='PT409'; end if;
    if (select count(*) from public.lead_summary_documents where lead_id=p_lead and ready_at is null)>=20 then
      raise exception 'Too many incomplete summary uploads. Ask management to review them' using errcode='PT409'; end if;
    if not exists(select 1 from storage.buckets where id=p_file->>'bucket_id' and not public
      and (file_size_limit is null or file_size_limit>=(p_file->>'size')::integer)
      and (allowed_mime_types is null or 'application/pdf'=any(allowed_mime_types))) then
      raise exception 'A private PDF bucket is required' using errcode='22023'; end if;
    insert into public.lead_summary_documents(id,lead_id,previous_id,assigned_to_at_upload,filename,content_type,size,sha256,bucket_id,storage_key,uploaded_by,uploaded_by_name,change_note)
      values(p_id,p_lead,p_previous,lead.assigned_to,p_file->>'filename',p_file->>'content_type',(p_file->>'size')::integer,p_file->>'sha256',p_file->>'bucket_id',
        'lead-summaries/'||p_lead::text||'/'||p_id::text||'.pdf',actor.id,coalesce(nullif(actor.full_name,''),'Admin'),p_note) returning * into doc;
  end if;
  if p_finish then
    if not exists(select 1 from storage.objects o where o.bucket_id=doc.bucket_id and o.name=doc.storage_key
      and o.owner_id=actor.id::text and (o.metadata->>'size')::bigint=doc.size and o.metadata->>'mimetype'='application/pdf') then
      raise exception 'PDF upload has not been stored completely' using errcode='PT409'; end if;
    stamp:=clock_timestamp();
    select coalesce(max(version),0)+1 into n from public.lead_summary_documents where lead_id=p_lead;
    update public.lead_summary_documents set is_current=false,archived_at=stamp where id=prior;
    update public.lead_summary_documents set ready_at=stamp,version=n,review_due_at=stamp+interval '3 months',is_current=true where id=p_id returning * into doc;
    insert into public.lead_summary_document_events(document_id,lead_id,previous_id,action,actor_id,at,reason)
      values(p_id,p_lead,prior,case when prior is null then 'published' else 'replaced' end,actor.id,stamp,p_note);
  end if;
  return to_jsonb(doc);
end $$;
revoke all on function private.save_lead_summary_document(uuid,uuid,uuid,text,jsonb,boolean) from public,anon,authenticated,service_role;
grant execute on function private.save_lead_summary_document(uuid,uuid,uuid,text,jsonb,boolean) to authenticated;
create function public.save_lead_summary_document(p_lead uuid,p_id uuid,p_previous uuid,p_note text,p_file jsonb,p_finish boolean default false) returns jsonb
language sql security invoker set search_path=pg_catalog as $$
  select private.save_lead_summary_document(p_lead,p_id,p_previous,p_note,p_file,p_finish)
$$;
revoke all on function public.save_lead_summary_document(uuid,uuid,uuid,text,jsonb,boolean) from public,anon,authenticated,service_role;
grant execute on function public.save_lead_summary_document(uuid,uuid,uuid,text,jsonb,boolean) to authenticated;

create function private.can_store_lead_summary(p_bucket text,p_key text,p_write boolean) returns boolean
language sql stable security definer set search_path=pg_catalog as $$
  select exists(select 1 from public.lead_summary_documents d join public.leads l on l.id=d.lead_id
    join public.profiles p on p.id=auth.uid() where d.bucket_id=p_bucket and d.storage_key=p_key and p.status='active'
      and (case when p_write then p.role='admin' and not l.is_archived and d.ready_at is null and d.uploaded_by=p.id and d.assigned_to_at_upload is not distinct from l.assigned_to
        else p.role='admin' or (p.role='salesman' and l.assigned_to=p.id and not l.is_archived and d.is_current and d.ready_at is not null) end));
$$;
revoke all on function private.can_store_lead_summary(text,text,boolean) from public,anon,authenticated,service_role;
grant execute on function private.can_store_lead_summary(text,text,boolean) to authenticated;
create policy lead_summary_storage_read on storage.objects for select to authenticated
  using(split_part(name,'/',1)='lead-summaries' and private.can_store_lead_summary(bucket_id,name,false));
create policy lead_summary_storage_insert on storage.objects for insert to authenticated
  with check(split_part(name,'/',1)='lead-summaries' and owner_id=auth.uid()::text and private.can_store_lead_summary(bucket_id,name,true));
-- Restrictive policies also contain any unrelated broad uploader/owner policy.
create policy lead_summary_storage_read_boundary on storage.objects as restrictive for select to authenticated
  using(split_part(name,'/',1)<>'lead-summaries' or private.can_store_lead_summary(bucket_id,name,false));
create policy lead_summary_storage_insert_boundary on storage.objects as restrictive for insert to authenticated
  with check(split_part(name,'/',1)<>'lead-summaries' or (owner_id=auth.uid()::text and private.can_store_lead_summary(bucket_id,name,true)));
create policy lead_summary_storage_update_boundary on storage.objects as restrictive for update to authenticated
  using(split_part(name,'/',1)<>'lead-summaries') with check(split_part(name,'/',1)<>'lead-summaries');
create policy lead_summary_storage_delete_boundary on storage.objects as restrictive for delete to authenticated
  using(split_part(name,'/',1)<>'lead-summaries');

notify pgrst,'reload schema';
commit;
