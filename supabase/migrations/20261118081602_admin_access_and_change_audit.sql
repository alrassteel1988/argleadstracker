-- Forward-only, metadata-only audit. No historical attribution or retention purge.
create table private.admin_audit_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid,
  at timestamptz not null default clock_timestamp(),
  phase text not null check (phase in ('attempt','result','change')),
  actor_id uuid,
  actor_name text,
  actor_role text,
  action text not null check (action in ('sign_in','sign_out','session_refresh','read','write','export','download','insert','update','delete')),
  method text check (method in ('GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS')),
  route text check (length(route) <= 300),
  record_id text check (length(record_id) <= 100),
  outcome text not null check (outcome in ('attempted','succeeded','denied','failed')),
  status integer check (status between 100 and 599),
  table_name text,
  changed_fields text[],
  account_hash text check (account_hash ~ '^[a-f0-9]{64}$')
);
create index admin_audit_events_page on private.admin_audit_events(at desc, id desc);
create index admin_audit_events_actor on private.admin_audit_events(actor_id, at desc);
create index admin_audit_events_request on private.admin_audit_events(request_id);
alter table private.admin_audit_events enable row level security;
alter table private.admin_audit_events force row level security;
revoke all on private.admin_audit_events from public, anon, authenticated, service_role;

create function private.reject_admin_audit_mutation() returns trigger
language plpgsql set search_path = pg_catalog as $$
begin
  raise exception 'Admin audit events are append-only' using errcode = '42501';
end;
$$;
revoke all on function private.reject_admin_audit_mutation() from public, anon, authenticated, service_role;
create trigger admin_audit_immutable before update or delete or truncate on private.admin_audit_events
for each statement execute function private.reject_admin_audit_mutation();

-- Only the server's allowlisted service-role path may write access events.
create function private.append_admin_access_event(p_event jsonb) returns uuid
language plpgsql security definer set search_path = pg_catalog as $$
declare
  actor public.profiles%rowtype;
  event_id uuid;
  role_claim text := coalesce(nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'role');
begin
  if role_claim is distinct from 'service_role' then
    raise exception 'Trusted audit writer required' using errcode = '42501';
  end if;
  if p_event->>'phase' not in ('attempt','result') or p_event->>'phase' is null
    or p_event - array['id','request_id','actor_id','actor_name','actor_role','method','route','record_id',
      'action','phase','outcome','status','account_hash'] <> '{}'::jsonb then
    raise exception 'Invalid access audit fields' using errcode = '22023';
  end if;
  select * into actor from public.profiles where id = (p_event->>'actor_id')::uuid;
  insert into private.admin_audit_events(id,request_id,phase,actor_id,actor_name,actor_role,
    method,route,record_id,action,outcome,status,account_hash)
  values ((p_event->>'id')::uuid,(p_event->>'request_id')::uuid,p_event->>'phase',
    actor.id,actor.full_name,actor.role,p_event->>'method',p_event->>'route',p_event->>'record_id',
    p_event->>'action',p_event->>'outcome',(p_event->>'status')::integer,p_event->>'account_hash')
  returning id into event_id;
  return event_id;
end;
$$;
revoke all on function private.append_admin_access_event(jsonb) from public, anon, authenticated;
grant execute on function private.append_admin_access_event(jsonb) to service_role;
grant usage on schema private to service_role;
create function public.append_admin_access_event(p_event jsonb) returns uuid
language sql security invoker set search_path = pg_catalog as $$
  select private.append_admin_access_event(p_event);
$$;
revoke all on function public.append_admin_access_event(jsonb) from public, anon, authenticated;
grant execute on function public.append_admin_access_event(jsonb) to service_role;

create function private.capture_admin_change() returns trigger
language plpgsql security definer set search_path = pg_catalog as $$
declare
  old_row jsonb := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;
  new_row jsonb := case when tg_op = 'DELETE' then '{}'::jsonb else to_jsonb(new) end;
  headers jsonb := coalesce(nullif(current_setting('request.headers',true), ''), '{}')::jsonb;
  role_claim text := coalesce(nullif(current_setting('request.jwt.claim.role',true), ''),
    nullif(current_setting('request.jwt.claims',true), '')::jsonb->>'role');
  actor_id uuid := auth.uid();
  actor public.profiles%rowtype;
  fields text[];
  trace_id uuid;
begin
  -- A service-role attribution header is accepted only from a trusted server call.
  if actor_id is null and role_claim = 'service_role' then
    actor_id := (headers->>'x-crm-audit-actor-id')::uuid;
  end if;
  select * into actor from public.profiles p where p.id = actor_id;
  -- Preserve the actor when an Admin changes their own role/status or removes their profile.
  if tg_table_name = 'profiles' and old_row->>'id' = actor_id::text
    and old_row->>'role' = 'admin' and old_row->>'status' = 'active' then
    actor.id := actor_id; actor.role := 'admin'; actor.status := 'active';
    actor.full_name := old_row->>'full_name';
  end if;
  if actor.role is distinct from 'admin' or actor.status is distinct from 'active' then return null; end if;
  select array_agg(key order by key) into fields from (
    select key from jsonb_object_keys(old_row || new_row) key
    where old_row->key is distinct from new_row->key
      and key !~* 'password|token|secret|credential'
  ) changes;
  if coalesce(cardinality(fields),0) = 0 then return null; end if;
  trace_id := (headers->>'x-crm-audit-request-id')::uuid;
  insert into private.admin_audit_events(request_id,phase,actor_id,actor_name,actor_role,
    action,table_name,record_id,outcome,changed_fields)
  values(trace_id,'change',actor.id,actor.full_name,'admin',lower(tg_op),tg_table_name,
    coalesce(new_row->>'id',old_row->>'id'),'succeeded',fields);
  return null;
end;
$$;
revoke all on function private.capture_admin_change() from public, anon, authenticated, service_role;

-- Public CRM base tables present at installation, including embedded activity changes.
-- Future migrations introducing tables must install this trigger too.
do $$
declare target record;
begin
  for target in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r','p') and not c.relispartition and not exists (
      select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'e'
    )
  loop
    execute format('create trigger admin_change_audit after insert or update or delete on public.%I '
      || 'for each row execute function private.capture_admin_change()',target.relname);
  end loop;
end;
$$;

create function private.list_admin_audit_events(p_before timestamptz, p_before_id uuid, p_limit integer)
returns setof private.admin_audit_events
language plpgsql stable security definer set search_path = pg_catalog as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and status = 'active') then
    raise exception 'Active Admin access required' using errcode = '42501';
  end if;
  if p_limit is null or p_limit not between 1 and 100 or (p_before is null) <> (p_before_id is null) then
    raise exception 'Invalid audit pagination' using errcode = '22023';
  end if;
  return query select e.* from private.admin_audit_events e
    where p_before is null or (e.at,e.id) < (p_before,p_before_id)
    order by e.at desc,e.id desc limit p_limit;
end;
$$;
revoke all on function private.list_admin_audit_events(timestamptz,uuid,integer) from public, anon, service_role;
grant execute on function private.list_admin_audit_events(timestamptz,uuid,integer) to authenticated;
create function public.list_admin_audit_events(p_before timestamptz default null,p_before_id uuid default null,p_limit integer default 50)
returns setof private.admin_audit_events
language sql stable security invoker set search_path = pg_catalog as $$
  select * from private.list_admin_audit_events(p_before,p_before_id,p_limit);
$$;
revoke all on function public.list_admin_audit_events(timestamptz,uuid,integer) from public, anon, service_role;
grant execute on function public.list_admin_audit_events(timestamptz,uuid,integer) to authenticated;
notify pgrst,'reload schema';
