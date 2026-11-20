begin;
create schema if not exists private;
alter table public.leads
  add column if not exists is_archived boolean not null default false,
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid,
  add column if not exists archived_by_name text,
  add column if not exists archive_reason text,
  add column if not exists closed_reason text,
  add column if not exists closed_note text,
  add column if not exists closed_by uuid,
  add column if not exists closed_by_name text,
  add column if not exists closed_at timestamptz,
  add column if not exists restored_at timestamptz,
  add column if not exists restored_by uuid;
create index if not exists leads_archive_idx on public.leads(is_archived,archived_at desc);

-- Retain the existing constraint's accepted stages rather than remapping old records.
do $$ declare expression text; begin
  select pg_get_expr(conbin,conrelid) into expression from pg_constraint
    where conrelid='public.leads'::regclass and conname='leads_status_blueprint_check';
  if expression is not null then
    alter table public.leads drop constraint leads_status_blueprint_check;
    execute format('alter table public.leads add constraint leads_status_blueprint_check check ((%s) or lead_status = %L)',expression,'CLOSED_NOT_INTERESTED');
  end if;
end $$;

create table public.lead_lifecycle_events (
  id uuid primary key default gen_random_uuid(), lead_id uuid, company_name text not null,
  action text not null, user_id uuid not null, user_name text not null, at timestamptz not null default clock_timestamp(),
  reason text not null, details jsonb not null default '{}'
);
create index on public.lead_lifecycle_events(lead_id,at desc);
create table public.lead_duplicate_reviews (
  id uuid primary key default gen_random_uuid(), requested_by uuid not null, requested_by_name text not null,
  company_name text not null, input jsonb not null, exclude_id uuid, matched_lead_ids uuid[] not null,
  signature text not null, note text not null, status text not null default 'pending' check(status in ('pending','approved','rejected')),
  created_at timestamptz not null default clock_timestamp(), expires_at timestamptz not null default clock_timestamp()+interval '24 hours',
  decided_by uuid, decided_at timestamptz, decision_reason text, used_at timestamptz
);
create index on public.lead_duplicate_reviews(requested_by,status,signature);
create table public.lead_archive_requests (
  id uuid primary key default gen_random_uuid(),kind text not null check(kind in ('archive','restore')),
  lead_id uuid,candidate_ids uuid[] not null,company_name text not null,requested_by uuid not null,requested_by_name text not null,
  reason text not null,note text not null,request_key text not null,status text not null default 'pending' check(status in ('pending','approved','rejected')),
  created_at timestamptz not null default clock_timestamp(),decided_by uuid,decided_by_name text,decided_at timestamptz,decision_reason text,restored_lead_id uuid
);
create unique index pending_lead_archive_review on public.lead_archive_requests(requested_by,kind,request_key) where status='pending';
-- Only a validated lifecycle RPC may mint a command for the current transaction.
create table private.lead_lifecycle_commands(tx bigint not null,lead_id uuid not null,actor uuid not null,action text not null,reason text not null,
  primary key(tx,lead_id));
revoke all on private.lead_lifecycle_commands from public,anon,authenticated,service_role;
create table private.lead_lifecycle_file_guards(lead_id uuid not null,file_name text not null,purged_at timestamptz not null default clock_timestamp(),primary key(lead_id,file_name));
revoke all on private.lead_lifecycle_file_guards from public,anon,authenticated,service_role;

create function private.lifecycle_admin() returns boolean language sql stable security definer set search_path=pg_catalog as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role='admin' and status='active');
$$;
create function private.lifecycle_actor() returns public.profiles language plpgsql stable security definer set search_path=pg_catalog as $$
declare actor public.profiles; begin
  select * into actor from public.profiles where id=auth.uid() and status='active';
  if not found then raise exception 'An active CRM account is required.' using errcode='42501'; end if;
  return actor;
end $$;
create or replace function private.crm_can_access_lead(target_lead_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog as $$
  select exists(select 1 from public.leads lead join public.profiles p on p.id=auth.uid()
    where lead.id=target_lead_id and p.status='active' and (
      p.role='admin'
      or (not lead.is_archived and p.role in ('director','manager'))
      or (not lead.is_archived and p.role='salesman' and (
        lead.assigned_to=p.id or (
          lead.assigned_to is null and nullif(btrim(lead.assigned_salesman),'') is not null
          and lower(btrim(lead.assigned_salesman))=lower(btrim(p.full_name))
          and not exists(select 1 from public.profiles other where other.id<>p.id and other.role='salesman'
            and other.status='active' and lower(btrim(other.full_name))=lower(btrim(p.full_name)))
        )
      ))
    ));
$$;
create function private.lead_company_key(value text) returns text language sql immutable set search_path=pg_catalog as $$
  select btrim(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(lower(coalesce(value,'')),
    'l[.[:space:]]*l[.[:space:]]*c\y',' llc ','g'),'fz[[:space:]-]*llc\y',' fzllc ','g'),
    '[^[:alnum:]]+',' ','g'),'\m(llc|fzco|fze|fzllc|trading|co|est)\M',' ','g'),'[[:space:]]+',' ','g'));
$$;
create function private.lead_phone_key(value text) returns text language plpgsql immutable set search_path=pg_catalog as $$
declare v text:=regexp_replace(coalesce(value,''),'[^0-9]','','g'); begin
  if left(v,5)='00971' then v:=substr(v,3); end if;
  if left(v,3)='971' then v:=substr(v,4); elsif left(v,1)='0' then v:=substr(v,2); end if;
  return case when length(v)>=7 then v else '' end;
end $$;
create function private.lead_identity(p jsonb) returns jsonb language sql immutable set search_path=pg_catalog as $$
  select jsonb_build_object('name',private.lead_company_key(p->>'company_name'),'phone',private.lead_phone_key(p->>'phone'),
    'email',lower(btrim(coalesce(nullif(p->>'email',''),p->>'contact_email',''))));
$$;
create function private.match_leads(p jsonb,p_exclude uuid) returns setof public.leads
language sql stable security definer set search_path=pg_catalog as $$
  select l.* from public.leads l, lateral(select private.lead_identity(p) k) key
  where l.id is distinct from p_exclude and ((key.k->>'name'<>'' and private.lead_company_key(l.company_name)=key.k->>'name')
    or (key.k->>'phone'<>'' and private.lead_phone_key(l.phone)=key.k->>'phone')
    or (key.k->>'email'<>'' and lower(btrim(l.contact_email))=key.k->>'email'));
$$;
create index on public.leads(private.lead_company_key(company_name));
create index on public.leads(private.lead_phone_key(phone));
create index on public.leads(lower(btrim(contact_email)));
create function private.duplicate_signature(p jsonb,p_exclude uuid) returns text
language sql volatile security definer set search_path=pg_catalog as $$
  select md5(private.lead_identity(p)::text||coalesce(p_exclude::text,'')||coalesce((select string_agg(
    jsonb_build_array(l.id,l.updated_at,l.is_archived,l.assigned_to,l.company_name)::text,',' order by l.id)
    from private.match_leads(p,p_exclude) l),''));
$$;
create function private.duplicate_check(p_input jsonb,p_exclude uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare actor public.profiles:=private.lifecycle_actor(); result jsonb; begin
  if p_exclude is not null and not private.crm_can_access_lead(p_exclude) then
    raise exception 'Lead not found.' using errcode='42501'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('company_name',l.company_name,'owner_name',l.assigned_salesman,'is_archived',l.is_archived,
    'self_owned',actor.role='salesman' and not l.is_archived and private.crm_can_access_lead(l.id))
    || case when actor.role='admin' then jsonb_build_object('id',l.id) else '{}'::jsonb end
    || case when l.is_archived then jsonb_build_object('closed',l.lead_status='CLOSED_NOT_INTERESTED',
      'closed_at',case when l.lead_status='CLOSED_NOT_INTERESTED' then l.closed_at else l.archived_at end,
      'closed_by_name',case when l.lead_status='CLOSED_NOT_INTERESTED' then l.closed_by_name else l.archived_by_name end,
      'reason',case when l.lead_status='CLOSED_NOT_INTERESTED' then l.closed_reason else l.archive_reason end,
      'closed_note',case when l.lead_status='CLOSED_NOT_INTERESTED' and l.closed_reason='Other' then l.closed_note else '' end)
      else '{}'::jsonb end
    || case when l.is_archived then jsonb_build_object('soft_deleted',left(coalesce(l.archive_reason,''),28)='Approved deletion request - ') else '{}'::jsonb end),'[]') into result from private.match_leads(p_input,p_exclude) l;
  return jsonb_build_object('matches',result,'approved',exists(select 1 from public.lead_duplicate_reviews r
    where r.requested_by=actor.id and r.status='approved' and r.used_at is null and r.expires_at>clock_timestamp()
      and r.signature=private.duplicate_signature(p_input,p_exclude)));
end $$;
create function public.check_lead_duplicates(p_input jsonb,p_exclude uuid default null) returns jsonb
language sql security invoker set search_path=pg_catalog as $$select private.duplicate_check(p_input,p_exclude)$$;

create function private.lifecycle_event(p_id uuid,p_name text,p_action text,p_reason text,p_details jsonb default '{}')
returns void language plpgsql security definer set search_path=pg_catalog as $$
declare actor public.profiles:=private.lifecycle_actor(); begin
  insert into public.lead_lifecycle_events(lead_id,company_name,action,user_id,user_name,reason,details)
    values(p_id,p_name,p_action,actor.id,coalesce(nullif(actor.full_name,''),auth.jwt()->>'email','CRM user'),p_reason,p_details);
end $$;
create function private.duplicate_request(p_input jsonb,p_exclude uuid,p_note text,p_override boolean) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare actor public.profiles:=private.lifecycle_actor(); ids uuid[]; review_id uuid; actor_name text; begin
  if p_exclude is not null and not private.crm_can_access_lead(p_exclude) then raise exception 'Lead not found.' using errcode='42501'; end if;
  if length(btrim(coalesce(p_note,''))) not between 1 and 2000 then raise exception 'Enter a review note.' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(9020261120);
  select array_agg(id order by id) into ids from private.match_leads(p_input,p_exclude);
  if ids is null then raise exception 'No matching lead remains. Check again.' using errcode='40001'; end if;
  if p_override and actor.role<>'admin' and (actor.role<>'salesman' or exists(select 1 from private.match_leads(p_input,p_exclude) l
    where l.is_archived or not private.crm_can_access_lead(l.id))) then raise exception 'Admin access required.' using errcode='42501'; end if;
  actor_name:=coalesce(nullif(actor.full_name,''),auth.jwt()->>'email','CRM user');
  insert into public.lead_duplicate_reviews(requested_by,requested_by_name,company_name,input,exclude_id,matched_lead_ids,signature,note,status,decided_by,decided_at,decision_reason)
    values(actor.id,actor_name,p_input->>'company_name',private.lead_identity(p_input),p_exclude,ids,
      private.duplicate_signature(p_input,p_exclude),btrim(p_note),case when p_override then 'approved' else 'pending' end,
      case when p_override then actor.id end,case when p_override then clock_timestamp() end,case when p_override then btrim(p_note) end)
    returning id into review_id;
  perform private.lifecycle_event(ids[1],p_input->>'company_name',case when p_override then 'duplicate_override' else 'duplicate_review_requested' end,p_note,jsonb_build_object('review_id',review_id));
  if not p_override then
    insert into public.notifications(recipient_uid,type,title,message)
      select id,'duplicate_review','Duplicate lead review',actor_name||': '||(p_input->>'company_name')||'. '||p_note
      from public.profiles where role='admin' and status='active';
  end if;
  return jsonb_build_object('id',review_id,'status',case when p_override then 'approved' else 'pending' end);
end $$;
create function public.request_lead_duplicate_review(p_input jsonb,p_exclude uuid,p_note text,p_override boolean default false) returns jsonb
language sql security invoker set search_path=pg_catalog as $$select private.duplicate_request(p_input,p_exclude,p_note,p_override)$$;
create function private.duplicate_decision(p_id uuid,p_approve boolean,p_reason text) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare r public.lead_duplicate_reviews; begin
  if not private.lifecycle_admin() then raise exception 'Admin access required.' using errcode='42501'; end if;
  if length(btrim(coalesce(p_reason,''))) not between 1 and 2000 then raise exception 'Enter a decision reason.' using errcode='22023'; end if;
  select * into r from public.lead_duplicate_reviews where id=p_id for update;
  if not found or r.status<>'pending' then raise exception 'This review is no longer pending.' using errcode='40001'; end if;
  update public.lead_duplicate_reviews set status=case when p_approve then 'approved' else 'rejected' end,
    decided_by=auth.uid(),decided_at=clock_timestamp(),decision_reason=p_reason,expires_at=clock_timestamp()+interval '24 hours' where id=p_id;
  perform private.lifecycle_event(r.matched_lead_ids[1],r.company_name,case when p_approve then 'duplicate_review_approved' else 'duplicate_review_rejected' end,p_reason,jsonb_build_object('review_id',p_id));
  insert into public.notifications(recipient_uid,type,title,message) values(r.requested_by,'duplicate_review','Duplicate review decision',
    r.company_name||': '||case when p_approve then 'approved' else 'rejected' end||'. '||p_reason);
  return jsonb_build_object('id',p_id,'status',case when p_approve then 'approved' else 'rejected' end);
end $$;
create function public.decide_lead_duplicate_review(p_id uuid,p_approve boolean,p_reason text) returns jsonb
language sql security invoker set search_path=pg_catalog as $$select private.duplicate_decision(p_id,p_approve,p_reason)$$;

create function private.guard_lead_lifecycle() returns trigger language plpgsql security definer set search_path=pg_catalog as $$
declare actor public.profiles; cmd private.lead_lifecycle_commands;
  closing boolean; changed boolean; permit_id uuid; candidate jsonb;
begin
  -- Existing allowlisted import/enrichment workers have no interactive session.
  -- They may keep ordinary writes, but can never close, restore, archive or purge.
  if auth.uid() is null and current_setting('role',true)='service_role' then
    actor.id:=new.created_by; actor.role:='service_role';
  else actor:=private.lifecycle_actor(); end if;
  select c.* into cmd from private.lead_lifecycle_commands c where c.tx=txid_current() and c.lead_id=coalesce(new.id,old.id) and c.actor=auth.uid();
  if tg_op='DELETE' then
    if actor.role<>'admin' or not old.is_archived or cmd.action is distinct from 'purge' then
      raise exception 'Only Admin can permanently delete an archived lead through confirmed deletion.' using errcode='42501'; end if;
    insert into private.lead_lifecycle_file_guards(lead_id,file_name)
      select old.id,to_jsonb(p)->>'voice_note_path' from public.pmrs p
      where coalesce(nullif(to_jsonb(p)->>'lead_id',''),to_jsonb(p)->>'company_id')=old.id::text
        and nullif(to_jsonb(p)->>'voice_note_path','') is not null on conflict do nothing;
    perform private.lifecycle_event(old.id,old.company_name,'purge',cmd.reason);
    return old;
  end if;
  if tg_op='UPDATE' and old.is_archived and cmd.action is distinct from 'restore' then
    raise exception 'Restore this archived lead before editing it.' using errcode='42501'; end if;
  closing:=new.lead_status='CLOSED_NOT_INTERESTED' and (tg_op='INSERT' or old.lead_status is distinct from new.lead_status);
  if closing then
    if actor.role not in ('admin','salesman') or (tg_op='UPDATE' and not private.crm_can_access_lead(old.id)) then
      raise exception 'You cannot close this lead.' using errcode='42501'; end if;
    if coalesce(new.closed_reason,'') not in ('No requirement','Uses another supplier','Business closed','Other')
      or (new.closed_reason='Other' and nullif(btrim(new.closed_note),'') is null) or length(coalesce(new.closed_note,''))>2000 then
      raise exception 'Choose a close reason and add a note for Other.' using errcode='22023'; end if;
    new.closed_by:=actor.id; new.closed_at:=clock_timestamp();
    new.closed_by_name:=coalesce(nullif(actor.full_name,''),auth.jwt()->>'email','CRM user');
    new.is_archived:=true; new.archived_at:=new.closed_at; new.archived_by:=actor.id;
    new.archived_by_name:=new.closed_by_name; new.archive_reason:=new.closed_reason;
  elsif tg_op='INSERT' then
    if new.is_archived or new.closed_at is not null or new.archived_at is not null or new.closed_reason is not null
      or new.closed_note is not null or new.closed_by is not null or new.closed_by_name is not null
      or new.archived_by is not null or new.archived_by_name is not null or new.archive_reason is not null
      or new.restored_at is not null or new.restored_by is not null then raise exception 'Lifecycle metadata is server controlled.' using errcode='42501'; end if;
  elsif row(new.is_archived,new.archived_at,new.archived_by,new.archived_by_name,new.archive_reason,new.closed_reason,new.closed_note,new.closed_by,new.closed_by_name,new.closed_at,new.restored_at,new.restored_by)
    is distinct from row(old.is_archived,old.archived_at,old.archived_by,old.archived_by_name,old.archive_reason,old.closed_reason,old.closed_note,old.closed_by,old.closed_by_name,old.closed_at,old.restored_at,old.restored_by) then
    if actor.role<>'admin' or cmd.action not in ('archive','restore') or cmd.action is null then
      raise exception 'Use the Admin archive or restore action.' using errcode='42501'; end if;
  end if;
  changed:=tg_op='INSERT';
  if tg_op='UPDATE' then changed:=private.lead_identity(to_jsonb(new)) is distinct from private.lead_identity(to_jsonb(old)); end if;
  if changed then
    perform pg_advisory_xact_lock(9020261120);
    candidate:=to_jsonb(new);
    if exists(select 1 from private.match_leads(candidate,case when tg_op='UPDATE' then new.id end)) then
      select id into permit_id from public.lead_duplicate_reviews where requested_by=actor.id and status='approved' and used_at is null
        and expires_at>clock_timestamp() and signature=private.duplicate_signature(candidate,case when tg_op='UPDATE' then new.id end)
        order by created_at limit 1 for update;
      if permit_id is null then raise exception 'A matching lead requires Admin review before saving.' using errcode='23505'; end if;
      update public.lead_duplicate_reviews set used_at=clock_timestamp() where id=permit_id;
      perform private.lifecycle_event(new.id,new.company_name,'duplicate_permit_used','Approved duplicate save',jsonb_build_object('review_id',permit_id));
    end if;
  end if;
  return new;
end $$;
create trigger lead_lifecycle_guard before insert or update or delete on public.leads for each row execute function private.guard_lead_lifecycle();
create function private.record_lead_lifecycle() returns trigger language plpgsql security definer set search_path=pg_catalog as $$
begin
  if new.lead_status='CLOSED_NOT_INTERESTED' and (tg_op='INSERT' or old.lead_status is distinct from new.lead_status) then
    perform private.lifecycle_event(new.id,new.company_name,'close',new.closed_reason,jsonb_build_object('note',new.closed_note));
    perform private.lifecycle_event(new.id,new.company_name,'archive',new.archive_reason);
    insert into public.notifications(recipient_uid,type,title,message)
      select id,'lead_closed','Do not contact',new.company_name||' has been marked Closed '||chr(8211)||' Not Interested by '||new.closed_by_name||'. Please do not contact.'
      from public.profiles where status='active' and role in ('admin','salesman');
  elsif tg_op='UPDATE' and new.is_archived is distinct from old.is_archived then
    perform private.lifecycle_event(new.id,new.company_name,case when new.is_archived then 'archive' else 'restore' end,
      (select reason from private.lead_lifecycle_commands where tx=txid_current() and lead_id=new.id));
  end if;
  return new;
end $$;
create trigger lead_lifecycle_record after insert or update on public.leads for each row execute function private.record_lead_lifecycle();
create function private.lifecycle_change(p_id uuid,p_action text,p_input jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare actor public.profiles:=private.lifecycle_actor(); l public.leads; reason text:=btrim(coalesce(p_input->>'reason','')); result jsonb; begin
  if p_action not in ('close','archive','restore','purge') or (p_action<>'close' and actor.role<>'admin') then raise exception 'Admin access required.' using errcode='42501'; end if;
  select * into l from public.leads where id=p_id for update;
  if not found or not private.crm_can_access_lead(p_id) then raise exception 'Lead not found.' using errcode='42501'; end if;
  if p_action='close' then reason:=p_input->>'closed_reason'; end if;
  if length(coalesce(reason,'')) not between 1 and 2000 then raise exception 'Enter a reason.' using errcode='22023'; end if;
  insert into private.lead_lifecycle_commands values(txid_current(),p_id,actor.id,p_action,reason);
  if p_action='close' then
    update public.leads set lead_status='CLOSED_NOT_INTERESTED',closed_reason=p_input->>'closed_reason',closed_note=btrim(coalesce(p_input->>'closed_note','')) where id=p_id;
  elsif p_action='archive' then
    update public.leads set is_archived=true,archive_reason=reason,archived_at=clock_timestamp(),archived_by=actor.id,
      archived_by_name=coalesce(nullif(actor.full_name,''),auth.jwt()->>'email','CRM user') where id=p_id;
  elsif p_action='restore' then
    if not l.is_archived then raise exception 'This lead is not archived.' using errcode='22023'; end if;
    update public.leads set is_archived=false,lead_status='PROSPECT',restored_by=actor.id,restored_at=clock_timestamp() where id=p_id;
  else
    if p_input->>'company_name' is distinct from l.company_name then raise exception 'Type the exact company name.' using errcode='22023'; end if;
    delete from public.leads where id=p_id;
  end if;
  select to_jsonb(lead) into result from public.leads lead where id=p_id;
  delete from private.lead_lifecycle_commands where tx=txid_current() and lead_id=p_id;
  if actor.role<>'admin' then return '{"ok":true,"is_archived":true}'::jsonb; end if;
  return coalesce(result,'{"ok":true}'::jsonb);
end $$;
create function public.change_lead_lifecycle(p_id uuid,p_action text,p_input jsonb) returns jsonb
language sql security invoker set search_path=pg_catalog as $$select private.lifecycle_change(p_id,p_action,p_input)$$;
create function private.close_edited_lead(p_id uuid,p_expected timestamptz,p_updates jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare actor public.profiles:=private.lifecycle_actor(); l public.leads; columns text; result jsonb;
  allowed constant text[]:=array['company_name','industry','location','address','phone','website','google_place_id','google_maps_url',
    'google_rating','google_review_count','contact_name','contact_email','hunter_confidence_score','lead_status','notes','territory','priority',
    'estimated_value','product_interest','activity_purpose','next_action','next_action_date','source','legal_name','year_established','business_category',
    'opening_hours','steel_products_likely_needed','competitors_likely_using','certifications','estimated_scale','estimated_annual_revenue','key_personnel',
    'recent_projects','products_services_remarks','enrichment_source','enrichment_status','enriched_at','enrichment_updated_at','lost_reason','lost_reason_detail',
    'lost_competitor','lost_at','lost_by','auto_enrichment','latitude','longitude','activities','sector','tier','country_emirate','primary_contact_title',
    'secondary_contact_name','secondary_contact_title','secondary_contact_mobile','secondary_contact_email','tags','quotation_ref','estimated_monthly_volume',
    'first_order_date','closed_reason','closed_note'];
begin
  if actor.role not in ('admin','salesman') or not private.crm_can_access_lead(p_id) then raise exception 'Lead not found.' using errcode='42501'; end if;
  if jsonb_typeof(p_updates) is distinct from 'object' or p_updates->>'lead_status' is distinct from 'CLOSED_NOT_INTERESTED'
    or exists(select 1 from jsonb_object_keys(p_updates) key where key<>all(allowed) or (actor.role<>'admin' and key='territory')) then
    raise exception 'Unsupported closed-lead edit.' using errcode='22023'; end if;
  select * into strict l from public.leads where id=p_id for update;
  if l.is_archived or p_expected is distinct from l.updated_at then raise exception 'This lead changed. Refresh before saving.' using errcode='40001'; end if;
  select string_agg(format('%I',key),',' order by key) into columns from jsonb_object_keys(p_updates) key;
  execute format('update public.leads set (%1$s)=(select %1$s from jsonb_populate_record(null::public.leads,$1)) where id=$2 returning to_jsonb(leads)',columns)
    into result using p_updates,p_id;
  return case when actor.role='admin' then result else jsonb_build_object('id',p_id,'is_archived',true) end;
end $$;
create function public.close_edited_lead(p_id uuid,p_expected timestamptz,p_updates jsonb) returns jsonb
language sql security invoker set search_path=pg_catalog as $$select private.close_edited_lead(p_id,p_expected,p_updates)$$;
create function private.duplicate_restore(p_review uuid,p_lead uuid,p_reason text) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare r public.lead_duplicate_reviews; begin
  if not private.lifecycle_admin() then raise exception 'Admin access required.' using errcode='42501'; end if;
  select * into r from public.lead_duplicate_reviews where id=p_review for update;
  if not found or r.status<>'pending' or not p_lead=any(r.matched_lead_ids) then
    raise exception 'Choose an archived lead from this pending review.' using errcode='22023'; end if;
  perform private.lifecycle_change(p_lead,'restore',jsonb_build_object('reason',p_reason));
  update public.lead_duplicate_reviews set status='rejected',decided_by=auth.uid(),decided_at=clock_timestamp(),
    decision_reason='Restored existing lead: '||p_reason where id=p_review;
  perform private.lifecycle_event(p_lead,r.company_name,'duplicate_review_restored',p_reason,jsonb_build_object('review_id',p_review));
  insert into public.notifications(recipient_uid,type,title,message) values(r.requested_by,'duplicate_review','Duplicate review decision',r.company_name||': existing lead restored. '||p_reason);
  return jsonb_build_object('id',p_review,'status','rejected','restored',true);
end $$;
create function public.restore_lead_duplicate_review(p_review uuid,p_lead uuid,p_reason text) returns jsonb
language sql security invoker set search_path=pg_catalog as $$select private.duplicate_restore(p_review,p_lead,p_reason)$$;

create function private.request_lead_archive_review(p_kind text,p_lead uuid,p_identity jsonb,p_reason text,p_note text) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare actor public.profiles:=private.lifecycle_actor(); l public.leads; ids uuid[]; request_id uuid; request_name text; actor_name text; key text; begin
  if actor.role<>'salesman' then raise exception 'Salesman access required.' using errcode='42501'; end if;
  if length(btrim(coalesce(p_reason,''))) not between 1 and 2000 or length(btrim(coalesce(p_note,''))) not between 1 and 2000 then
    raise exception 'Enter a request reason and supporting note.' using errcode='22023'; end if;
  if p_kind='archive' then
    select * into l from public.leads where id=p_lead for update;
    if not found or l.is_archived or not private.crm_can_access_lead(p_lead) then raise exception 'Lead not found.' using errcode='42501'; end if;
    if p_reason not in ('Disqualified','Not interested','Other') then raise exception 'Choose a request reason.' using errcode='22023'; end if;
    ids:=array[l.id]; request_name:=l.company_name; key:=l.id::text;
  elsif p_kind='restore' then
    select array_agg(id order by id) into ids from private.match_leads(p_identity,null) where is_archived;
    if ids is null then raise exception 'No matching archived lead remains.' using errcode='22023'; end if;
    request_name:=coalesce(nullif(btrim(p_identity->>'company_name'),''),'Matching archived company');
    key:=md5(private.lead_identity(p_identity)::text);
  else raise exception 'Choose an archive or restore request.' using errcode='22023'; end if;
  actor_name:=coalesce(nullif(actor.full_name,''),auth.jwt()->>'email','Salesman');
  if exists(select 1 from public.lead_archive_requests r where r.requested_by=actor.id and r.kind=p_kind and r.request_key=key and r.status='pending') then
    raise exception 'A management review is already pending for this request.' using errcode='23505'; end if;
  insert into public.lead_archive_requests(kind,lead_id,candidate_ids,company_name,requested_by,requested_by_name,reason,note,request_key)
    values(p_kind,case when p_kind='archive' then p_lead end,ids,request_name,actor.id,actor_name,p_reason,p_note,key) returning id into request_id;
  foreach p_lead in array ids loop
    perform private.lifecycle_event(p_lead,request_name,'request_'||p_kind,p_reason,jsonb_build_object('request_id',request_id,'note',p_note));
  end loop;
  insert into public.notifications(recipient_uid,type,title,message)
    select id,'lead_lifecycle_request',case when p_kind='archive' then 'Lead deletion request' else 'Lead restore request' end,
      actor_name||' requested '||case when p_kind='archive' then 'deletion' else 'restoration' end||' of '||request_name||'. '||p_reason||': '||p_note
    from public.profiles where role='admin' and status='active';
  return jsonb_build_object('id',request_id,'status','pending');
end $$;
create function public.request_lead_archive_review(p_kind text,p_lead uuid,p_identity jsonb,p_reason text,p_note text) returns jsonb
language sql security invoker set search_path=pg_catalog as $$select private.request_lead_archive_review(p_kind,p_lead,p_identity,p_reason,p_note)$$;
create function private.review_lead_archive_request(p_id uuid,p_approve boolean,p_target uuid,p_reason text) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare actor public.profiles:=private.lifecycle_actor(); r public.lead_archive_requests; l public.leads; target uuid; begin
  if actor.role<>'admin' then raise exception 'Admin access required.' using errcode='42501'; end if;
  if p_approve is null or length(btrim(coalesce(p_reason,''))) not between 1 and 2000 then raise exception 'Choose a decision and enter its reason.' using errcode='22023'; end if;
  select * into r from public.lead_archive_requests where id=p_id for update;
  if not found or r.status<>'pending' then raise exception 'This request is no longer pending.' using errcode='40001'; end if;
  if r.requested_by=actor.id then raise exception 'You cannot review your own request.' using errcode='42501'; end if;
  target:=case when r.kind='archive' then r.lead_id else p_target end;
  if p_approve then
    if target is null or not target=any(r.candidate_ids) then raise exception 'Choose a lead from this request.' using errcode='22023'; end if;
    select * into l from public.leads where id=target for update;
    if not found then raise exception 'The requested lead is no longer available.' using errcode='40001'; end if;
    if r.kind='archive' and not l.is_archived then
      perform private.lifecycle_change(target,'archive',jsonb_build_object('reason',left('Approved deletion request - '||r.reason||': '||r.note,2000)));
    elsif r.kind='restore' then perform private.lifecycle_change(target,'restore',jsonb_build_object('reason',p_reason)); end if;
  end if;
  update public.lead_archive_requests set status=case when p_approve then 'approved' else 'rejected' end,decided_by=actor.id,
    decided_by_name=coalesce(nullif(actor.full_name,''),auth.jwt()->>'email','Admin'),decided_at=clock_timestamp(),decision_reason=p_reason,
    restored_lead_id=case when p_approve and r.kind='restore' then target end where id=p_id;
  perform private.lifecycle_event(coalesce(target,r.candidate_ids[1]),r.company_name,r.kind||'_request_'||case when p_approve then 'approved' else 'rejected' end,p_reason,jsonb_build_object('request_id',p_id));
  insert into public.notifications(recipient_uid,type,title,message) values(r.requested_by,'lead_lifecycle_request','Management decision',
    r.company_name||': your '||case when r.kind='archive' then 'deletion' else 'restore' end||' request was '||case when p_approve then 'approved' else 'rejected' end||'. '||p_reason);
  return jsonb_build_object('id',p_id,'status',case when p_approve then 'approved' else 'rejected' end);
end $$;
create function public.review_lead_archive_request(p_id uuid,p_approve boolean,p_target uuid,p_reason text) returns jsonb
language sql security invoker set search_path=pg_catalog as $$select private.review_lead_archive_request(p_id,p_approve,p_target,p_reason)$$;
create function private.my_lead_archive_requests() returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare actor public.profiles:=private.lifecycle_actor(); result jsonb; begin
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'kind',kind,'lead_id',case when private.crm_can_access_lead(lead_id) then lead_id end,
    'company_name',company_name,'status',status,'reason',reason,'note',note,'created_at',created_at,'decision_reason',decision_reason) order by created_at desc),'[]')
    into result from (select * from public.lead_archive_requests where requested_by=actor.id order by created_at desc limit 200) r;
  return result;
end $$;
create function public.my_lead_archive_requests() returns jsonb language sql security invoker set search_path=pg_catalog as $$select private.my_lead_archive_requests()$$;

create function private.company_not_archived(p_id uuid) returns boolean language sql stable security definer set search_path=pg_catalog as $$
  select private.lifecycle_admin() or not exists(select 1 from public.leads where company_id=p_id)
    or exists(select 1 from public.leads where company_id=p_id and not is_archived and private.crm_can_access_lead(id));
$$;
create policy "Lifecycle company boundary" on public.companies as restrictive for all to authenticated
  using(private.company_not_archived(id)) with check(private.company_not_archived(id));
create policy "Lifecycle lead boundary" on public.leads as restrictive for all to authenticated
  using(private.lifecycle_admin() or not is_archived) with check(private.lifecycle_admin() or not is_archived
    or (lead_status='CLOSED_NOT_INTERESTED' and closed_by=auth.uid()));
-- A close RPC is the only Salesman path that can change a visible row into a hidden one.
create policy "Lifecycle notifications boundary" on public.notifications as restrictive for all to authenticated
  using(lead_id is null or private.crm_can_access_lead(lead_id)) with check(lead_id is null or private.crm_can_access_lead(lead_id));
create policy "Lifecycle tasks boundary" on public.management_tasks as restrictive for all to authenticated
  using(private.lifecycle_admin() or lead_id is null or private.crm_can_access_lead(lead_id))
  with check(private.lifecycle_admin() or lead_id is null or private.crm_can_access_lead(lead_id));
create function private.guard_archived_task() returns trigger language plpgsql security definer set search_path=pg_catalog as $$
begin
  if new.lead_id is not null and not exists(select 1 from public.leads where id=new.lead_id and not is_archived) then
    raise exception 'Tasks on archived leads are suspended. Restore the lead first.' using errcode='42501'; end if;
  return new;
end $$;
do $$ declare fk record; begin
  for fk in select distinct c.conrelid::regclass as relation,a.attname as column_name
    from pg_constraint c join pg_attribute a on a.attrelid=c.conrelid and a.attnum=c.conkey[1]
    join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace
    where c.contype='f' and c.confrelid='public.companies'::regclass and cardinality(c.conkey)=1 and n.nspname='public' and t.relname<>'leads'
  loop
    execute format('create policy %I on %s as restrictive for all to authenticated using (%I is null or private.company_not_archived(%I)) with check (%I is null or private.company_not_archived(%I))',
      'Lifecycle company '||fk.column_name,fk.relation,fk.column_name,fk.column_name,fk.column_name,fk.column_name);
  end loop;
end $$;
create trigger archived_lead_task_guard before insert or update on public.management_tasks for each row execute function private.guard_archived_task();
create function private.lifecycle_lead_not_archived(p_id uuid) returns boolean language sql stable security definer set search_path=pg_catalog as $$
  select private.lifecycle_admin() or exists(select 1 from public.leads where id=p_id and not is_archived);
$$;
-- Existing policies may allow an activity/file creator separately from the lead owner.
-- Add a restrictive archive boundary alongside, not instead of, those policies.
do $$ declare fk record; begin
  for fk in select distinct c.conrelid::regclass as relation,a.attname as column_name
    from pg_constraint c join pg_attribute a on a.attrelid=c.conrelid and a.attnum=c.conkey[1]
    join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace
    where c.contype='f' and c.confrelid='public.leads'::regclass and cardinality(c.conkey)=1 and n.nspname='public'
      and t.relname not in ('notifications','management_tasks')
  loop
    execute format('create policy %I on %s as restrictive for all to authenticated using (%I is null or private.lifecycle_lead_not_archived(%I)) with check (%I is null or private.lifecycle_lead_not_archived(%I))',
      'Lifecycle archive '||fk.column_name,fk.relation,fk.column_name,fk.column_name,fk.column_name,fk.column_name);
  end loop;
end $$;
create function private.guard_lifecycle_history() returns trigger language plpgsql set search_path=pg_catalog as $$
begin raise exception 'Lifecycle audit history is append-only.' using errcode='42501'; end $$;
create function private.lifecycle_storage_visible(p_name text) returns boolean
language sql stable security definer set search_path=pg_catalog as $$
  select private.lifecycle_admin() or (not exists(select 1 from private.lead_lifecycle_file_guards where file_name=p_name) and not exists (
    select 1 from public.pmrs p join public.leads l on l.id::text=coalesce(nullif(to_jsonb(p)->>'lead_id',''),to_jsonb(p)->>'company_id')
    where to_jsonb(p)->>'voice_note_path'=p_name and l.is_archived
  ));
$$;
do $$ begin
  if to_regclass('storage.objects') is not null then
    create policy "Lifecycle archived voice notes" on storage.objects as restrictive for all to authenticated
      using(private.lifecycle_storage_visible(name)) with check(private.lifecycle_storage_visible(name));
  end if;
end $$;
create trigger immutable_lifecycle_events before update or delete on public.lead_lifecycle_events for each row execute function private.guard_lifecycle_history();
alter table public.lead_lifecycle_events enable row level security;
alter table public.lead_lifecycle_events force row level security;
alter table public.lead_duplicate_reviews enable row level security;
alter table public.lead_duplicate_reviews force row level security;
alter table public.lead_archive_requests enable row level security;
alter table public.lead_archive_requests force row level security;
create policy "Admin lifecycle audit" on public.lead_lifecycle_events for select to authenticated using(private.lifecycle_admin());
create policy "Admin duplicate reviews" on public.lead_duplicate_reviews for select to authenticated using(private.lifecycle_admin());
create policy "Admin archive requests" on public.lead_archive_requests for select to authenticated using(private.lifecycle_admin());
revoke all on public.lead_lifecycle_events,public.lead_duplicate_reviews from public,anon,authenticated,service_role;
grant select on public.lead_lifecycle_events,public.lead_duplicate_reviews to authenticated;
revoke all on public.lead_archive_requests from public,anon,authenticated,service_role;
grant select on public.lead_archive_requests to authenticated;

-- Extend the existing atomic registration allowlist without replacing its RLS/read-back logic.
do $$ declare definition text; begin
  if to_regprocedure('public.save_new_crm_lead(jsonb)') is null then
    raise exception 'The released atomic registration RPC is required before this migration.';
  end if;
  if to_regprocedure('public.save_new_crm_lead(jsonb)') is not null then
    definition:=pg_get_functiondef('public.save_new_crm_lead(jsonb)'::regprocedure);
    if position('''closed_reason''' in definition)=0 then
      if position('''lost_reason'',''lost_reason_detail''' in definition)=0 or position('select to_jsonb(l) into strict saved_lead from public.leads l where l.id=saved_id;' in definition)=0 then
        raise exception 'Registration RPC differs from the reviewed baseline. Reconcile before applying.';
      end if;
      definition:=replace(definition,'''lost_reason'',''lost_reason_detail''','''closed_reason'',''closed_note'',''lost_reason'',''lost_reason_detail''');
      definition:=replace(definition,'select to_jsonb(l) into strict saved_lead from public.leads l where l.id=saved_id;',
        'if p_lead->>''lead_status''=''CLOSED_NOT_INTERESTED'' and actor.role<>''admin'' then saved_lead:=jsonb_build_object(''id'',saved_id,''is_archived'',true,''lead_status'',''CLOSED_NOT_INTERESTED''); else select to_jsonb(l) into strict saved_lead from public.leads l where l.id=saved_id; end if;');
      execute definition;
    end if;
  end if;
end $$;
-- No private helper is executable by default. Only validated RPC wrappers and RLS helpers are exposed.
do $$ declare f record; begin
  for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private'
    and p.proname in ('lifecycle_admin','lifecycle_actor','lead_company_key','lead_phone_key','lead_identity','match_leads','duplicate_signature',
      'duplicate_check','lifecycle_event','duplicate_request','duplicate_decision','guard_lead_lifecycle','record_lead_lifecycle','lifecycle_change',
      'company_not_archived','guard_archived_task','guard_lifecycle_history','lifecycle_lead_not_archived','duplicate_restore','close_edited_lead','lifecycle_storage_visible',
      'request_lead_archive_review','review_lead_archive_request','my_lead_archive_requests') loop
    execute format('revoke all on function %s from public,anon,authenticated,service_role',f.signature);
  end loop;
end $$;
grant execute on function private.lifecycle_admin(),private.company_not_archived(uuid),private.duplicate_check(jsonb,uuid),
  private.duplicate_request(jsonb,uuid,text,boolean),private.duplicate_decision(uuid,boolean,text),private.lifecycle_change(uuid,text,jsonb) to authenticated;
grant execute on function private.lead_company_key(text),private.lead_phone_key(text) to authenticated,service_role;
grant execute on function private.lifecycle_lead_not_archived(uuid) to authenticated;
grant execute on function private.duplicate_restore(uuid,uuid,text) to authenticated;
grant execute on function private.close_edited_lead(uuid,timestamptz,jsonb) to authenticated;
grant execute on function private.lifecycle_storage_visible(text) to authenticated;
grant execute on function private.request_lead_archive_review(text,uuid,jsonb,text,text),private.review_lead_archive_request(uuid,boolean,uuid,text),private.my_lead_archive_requests() to authenticated;
revoke all on function public.check_lead_duplicates(jsonb,uuid),public.request_lead_duplicate_review(jsonb,uuid,text,boolean),
  public.decide_lead_duplicate_review(uuid,boolean,text),public.change_lead_lifecycle(uuid,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.check_lead_duplicates(jsonb,uuid),public.request_lead_duplicate_review(jsonb,uuid,text,boolean),
  public.decide_lead_duplicate_review(uuid,boolean,text),public.change_lead_lifecycle(uuid,text,jsonb) to authenticated;
revoke all on function public.restore_lead_duplicate_review(uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.restore_lead_duplicate_review(uuid,uuid,text) to authenticated;
revoke all on function public.close_edited_lead(uuid,timestamptz,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.close_edited_lead(uuid,timestamptz,jsonb) to authenticated;
revoke all on function public.request_lead_archive_review(text,uuid,jsonb,text,text),public.review_lead_archive_request(uuid,boolean,uuid,text),public.my_lead_archive_requests() from public,anon,authenticated,service_role;
grant execute on function public.request_lead_archive_review(text,uuid,jsonb,text,text),public.review_lead_archive_request(uuid,boolean,uuid,text),public.my_lead_archive_requests() to authenticated;
notify pgrst,'reload schema';
commit;
