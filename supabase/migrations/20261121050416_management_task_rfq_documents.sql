begin;

create table public.management_task_documents (
  id uuid primary key,
  task_id uuid not null references public.management_tasks(id),
  lead_id uuid references public.leads(id) on delete set null,
  filename text not null check (char_length(filename) between 1 and 180),
  content_type text not null check (content_type in ('application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/png','image/jpeg')),
  size integer not null check (size between 1 and 4194304),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  bucket_id text not null,
  storage_key text not null unique,
  uploaded_by uuid not null references public.profiles(id),
  uploaded_by_name text not null,
  created_at timestamptz not null default clock_timestamp(),
  ready_at timestamptz,
  constraint rfq_document_extension_type check(content_type=case
    when lower(filename) ~ '\.pdf$' then 'application/pdf'
    when lower(filename) ~ '\.doc$' then 'application/msword'
    when lower(filename) ~ '\.docx$' then 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    when lower(filename) ~ '\.png$' then 'image/png'
    when lower(filename) ~ '\.jpe?g$' then 'image/jpeg' else '' end)
);
create index management_task_documents_task on public.management_task_documents(task_id,created_at,id);
alter table public.management_task_documents enable row level security;
revoke all on public.management_task_documents from public,anon,authenticated,service_role;
grant select on public.management_task_documents to authenticated;

create function private.can_read_task_document(p_task uuid) returns boolean
language sql stable security definer set search_path=pg_catalog as $$
  select exists(select 1 from public.profiles p where p.id=auth.uid() and p.status='active' and (
    p.role='admin' or (p.role='salesman' and exists (
      select 1 from public.management_tasks t join public.leads l on l.id=t.lead_id
      where t.id=p_task and t.assignee_id=p.id and l.assigned_to=p.id and not l.is_archived
        and t.removed_at is null and t.status in ('not_started','in_progress','completed')))));
$$;
revoke all on function private.can_read_task_document(uuid) from public,anon,authenticated,service_role;
grant execute on function private.can_read_task_document(uuid) to authenticated;
create policy task_documents_read on public.management_task_documents for select to authenticated
  using(private.can_read_task_document(task_id) and (ready_at is not null or private.lifecycle_admin()));

create function private.save_task_document(p_task uuid,p_id uuid,p_file jsonb,p_finish boolean) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare actor public.profiles; task public.management_tasks; lead public.leads; doc public.management_task_documents;
  key text; ext text;
begin
  select * into actor from public.profiles where id=auth.uid() and role='admin' and status='active' for share;
  if not found then raise exception 'Admin access required' using errcode='42501'; end if;
  select * into task from public.management_tasks where id=p_task for update;
  if not found or task.removed_at is not null or task.title<>'Respond to Initial RFQ' then
    raise exception 'RFQ task not available' using errcode='P0002'; end if;
  select * into lead from public.leads where id=task.lead_id and not is_archived
    and initial_management_task_id=p_task and assigned_to=task.assignee_id for update;
  if not found then raise exception 'RFQ task not available' using errcode='P0002'; end if;
  select * into doc from public.management_task_documents where id=p_id;
  if found then
    if doc.task_id<>p_task or doc.uploaded_by<>actor.id or doc.sha256 is distinct from p_file->>'sha256'
      or doc.filename is distinct from p_file->>'filename' or doc.content_type is distinct from p_file->>'content_type'
      or doc.size::text is distinct from p_file->>'size' or doc.bucket_id is distinct from p_file->>'bucket_id' then
      raise exception 'This upload request was already used' using errcode='PT409'; end if;
    if p_finish and doc.ready_at is null then
      if not exists(select 1 from storage.objects o where o.bucket_id=doc.bucket_id and o.name=doc.storage_key
        and o.owner_id=actor.id::text and (o.metadata->>'size')::bigint=doc.size) then
        raise exception 'Upload has not been stored completely' using errcode='PT409'; end if;
      update public.management_task_documents set ready_at=clock_timestamp() where id=p_id returning * into doc;
      insert into public.notifications(recipient_uid,lead_id,type,title,message,payload)
        values(task.assignee_id,lead.id,'management_task_note','RFQ supporting document',
          coalesce(nullif(actor.full_name,''),'Admin')||' added a supporting document to: '||task.title,jsonb_build_object('task_id',p_task,'document_id',p_id));
    end if;
    return to_jsonb(doc);
  end if;
  if p_finish then raise exception 'Upload request not found' using errcode='P0002'; end if;
  if (select count(*) from public.management_task_documents where task_id=p_task)>=5 then
    raise exception 'A maximum of five RFQ documents is allowed' using errcode='22023'; end if;
  ext:=substring(lower(p_file->>'filename') from '\.[^.]+$');
  if ext not in ('.pdf','.doc','.docx','.png','.jpg','.jpeg') or ext is null then
    raise exception 'Choose a PDF, Word, PNG or JPEG document' using errcode='22023'; end if;
  if not exists(select 1 from storage.buckets b where b.id=p_file->>'bucket_id' and not b.public) then
    raise exception 'A private document bucket is required' using errcode='22023'; end if;
  key:='activity-attachments/'||lead.id::text||'/rfq-task-'||p_task::text||'/'||p_id::text||ext;
  insert into public.management_task_documents(id,task_id,lead_id,filename,content_type,size,sha256,bucket_id,storage_key,uploaded_by,uploaded_by_name)
    values(p_id,p_task,lead.id,p_file->>'filename',p_file->>'content_type',(p_file->>'size')::integer,
      p_file->>'sha256',p_file->>'bucket_id',key,actor.id,coalesce(nullif(actor.full_name,''),'Admin')) returning * into doc;
  return to_jsonb(doc);
end $$;
revoke all on function private.save_task_document(uuid,uuid,jsonb,boolean) from public,anon,authenticated,service_role;
grant execute on function private.save_task_document(uuid,uuid,jsonb,boolean) to authenticated;
create function public.save_task_document(p_task uuid,p_id uuid,p_file jsonb,p_finish boolean default false) returns jsonb
language sql security invoker set search_path=pg_catalog as $$ select private.save_task_document(p_task,p_id,p_file,p_finish) $$;
revoke all on function public.save_task_document(uuid,uuid,jsonb,boolean) from public,anon,authenticated,service_role;
grant execute on function public.save_task_document(uuid,uuid,jsonb,boolean) to authenticated;

-- The new task files retain the existing lead boundary and add task-level revocation.
create function private.task_document_storage_visible(p_bucket text,p_name text,p_write boolean) returns boolean
language sql stable security definer set search_path=pg_catalog as $$
  select case when split_part(p_name,'/',1)='activity-attachments' and split_part(p_name,'/',3) like 'rfq-task-%'
    then exists(select 1 from public.management_task_documents d where d.bucket_id=p_bucket and d.storage_key=p_name
      and private.can_read_task_document(d.task_id) and
      (case when p_write then private.lifecycle_admin() and d.uploaded_by=auth.uid() and d.ready_at is null
        else d.ready_at is not null or private.lifecycle_admin() end)) else true end;
$$;
revoke all on function private.task_document_storage_visible(text,text,boolean) from public,anon,authenticated,service_role;
grant execute on function private.task_document_storage_visible(text,text,boolean) to authenticated;
create policy task_document_storage_read on storage.objects as restrictive for select to authenticated
  using(private.task_document_storage_visible(bucket_id,name,false));
create policy task_document_storage_insert on storage.objects as restrictive for insert to authenticated
  with check(private.task_document_storage_visible(bucket_id,name,true));
create policy task_document_storage_update on storage.objects as restrictive for update to authenticated
  using(not (split_part(name,'/',1)='activity-attachments' and split_part(name,'/',3) like 'rfq-task-%'))
  with check(not (split_part(name,'/',1)='activity-attachments' and split_part(name,'/',3) like 'rfq-task-%'));
create policy task_document_storage_delete on storage.objects as restrictive for delete to authenticated
  using(not (split_part(name,'/',1)='activity-attachments' and split_part(name,'/',3) like 'rfq-task-%'));

-- Preserve existing media types and limits; permit only the requested document types.
update storage.buckets set allowed_mime_types=array(
  select distinct mime from unnest(allowed_mime_types || array['application/pdf','application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/png','image/jpeg']) mime
) where id='pmr-voice-notes' and not public and allowed_mime_types is not null;
notify pgrst,'reload schema';
commit;
