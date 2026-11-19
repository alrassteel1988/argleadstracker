begin;

create schema if not exists private;

create or replace function private.record_lead_creation_activity()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  actor_id uuid := auth.uid();
  actor_name text;
  actor_role text;
  actor_status text;
  recorded_at timestamptz := clock_timestamp();
  event jsonb;
  history jsonb;
begin
  -- Trusted server imports may use service_role; browser callers cannot choose an actor.
  if actor_id is null and current_user = 'service_role' then
    actor_id := new.created_by;
  end if;
  if actor_id is null or (new.created_by is not null and new.created_by <> actor_id) then
    raise exception 'An authenticated lead creator is required.' using errcode = '42501';
  end if;
  select nullif(btrim(p.full_name), ''), lower(p.role), lower(p.status)
    into actor_name, actor_role, actor_status
    from public.profiles p where p.id = actor_id;
  if actor_status is distinct from 'active' or coalesce(actor_role, '') not in ('admin', 'director', 'manager', 'salesman') then
    raise exception 'An active CRM creator is required.' using errcode = '42501';
  end if;
  actor_name := coalesce(actor_name, nullif(auth.jwt()->>'email', ''), 'CRM user');
  new.created_by := actor_id;
  if jsonb_typeof(coalesce(new.activities, '[]'::jsonb)) <> 'array' then
    raise exception 'Activities must be an array.' using errcode = '23514';
  end if;
  event := jsonb_build_object(
    'id', 'lead-created-' || new.id::text, 'at', recorded_at,
    'created_at', recorded_at, 'updated_at', recorded_at, 'version', 1,
    'type', 'Lead creation', 'text', 'New Lead Account creation',
    'lead_creation', true, 'immutable_append', true, 'transaction_status', 'recorded',
    'attachments', '[]'::jsonb, 'archived', false, 'deletion_status', '',
    'created_by', actor_id, 'created_by_name', actor_name, 'created_by_role', actor_role,
    'audit_history', jsonb_build_array(jsonb_build_object(
      'id', 'lead-created-audit-' || new.id::text, 'action', 'activity_created',
      'actor_id', actor_id, 'actor_name', actor_name, 'at', recorded_at))
  );
  select coalesce(jsonb_agg(
    case when item->>'reminder' = 'true' or lower(item->>'type') = 'reminder' then
      item || jsonb_build_object('created_by', actor_id, 'created_by_name', actor_name, 'created_by_role', actor_role)
    else item end order by position), '[]'::jsonb)
    into history
    from jsonb_array_elements(coalesce(new.activities, '[]'::jsonb)) with ordinality as entries(item, position)
    where coalesce(item->>'lead_creation', 'false') <> 'true'
      and coalesce(item->>'type', '') not in ('Lead creation', 'Lead Created')
      and coalesce(item->>'id', '') not like 'lead-created-%';
  new.activities := jsonb_build_array(event) || history;
  return new;
end;
$$;

create or replace function private.protect_lead_creation_activity()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  before_events jsonb;
  after_events jsonb;
begin
  if jsonb_typeof(coalesce(new.activities, '[]'::jsonb)) <> 'array' then
    raise exception 'Activities must be an array.' using errcode = '23514';
  end if;
  select coalesce(jsonb_agg(item order by item->>'id'), '[]'::jsonb) into before_events
    from jsonb_array_elements(case when jsonb_typeof(old.activities) = 'array' then old.activities else '[]'::jsonb end) item
    where item->>'lead_creation' = 'true' or item->>'type' in ('Lead creation', 'Lead Created') or item->>'id' like 'lead-created-%';
  select coalesce(jsonb_agg(item order by item->>'id'), '[]'::jsonb) into after_events
    from jsonb_array_elements(coalesce(new.activities, '[]'::jsonb)) item
    where item->>'lead_creation' = 'true' or item->>'type' in ('Lead creation', 'Lead Created') or item->>'id' like 'lead-created-%';
  if before_events is distinct from after_events then
    raise exception 'Lead creation history is read-only.' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function private.record_lead_creation_activity() from public, anon, authenticated, service_role;
revoke all on function private.protect_lead_creation_activity() from public, anon, authenticated, service_role;

create trigger record_lead_creation_activity
before insert on public.leads
for each row execute function private.record_lead_creation_activity();

create trigger protect_lead_creation_activity
before update of activities on public.leads
for each row execute function private.protect_lead_creation_activity();

-- No historical attribution, backfill, table grants or RLS policies are changed.
commit;
