-- Keep deletion decisions server-only while existing activity writers remain user-scoped.
create schema if not exists app_private;
-- Archiving the only recorded activity leaves no "last activity" date.
alter table public.leads alter column last_activity drop not null;
create table if not exists app_private.activity_deletion_audit (
  lead_id uuid not null,
  request_id text not null,
  status text not null check (status in ('pending', 'approved', 'rejected', 'restored', 'cancelled')),
  recorded_at timestamptz not null default now(),
  details jsonb not null,
  primary key (lead_id, request_id, status)
);
revoke all on app_private.activity_deletion_audit from public, anon, authenticated, service_role;
grant usage on schema app_private to service_role;
grant insert on app_private.activity_deletion_audit to service_role;

create or replace function app_private.guard_activity_deletion()
returns trigger language plpgsql set search_path = pg_catalog as $$
declare
  before_items jsonb := '[]';
  after_items jsonb := case when jsonb_typeof(new.activities) = 'array' then new.activities else '[]'::jsonb end;
  item jsonb;
  previous jsonb;
  next_item jsonb;
  item_id text;
  decision_status text;
  actor text;
  audit_path constant jsonpath := '$.audit_history[*] ? (
    @.action == "deletion_requested" || @.action == "deletion_rejected"
    || @.action == "deletion_cancelled" || @.action == "activity_archived"
    || @.action == "activity_restored")';
begin
  if tg_op = 'UPDATE' then
    if current_user <> 'service_role'
      and (new.next_action, new.next_action_date) is distinct from (old.next_action, old.next_action_date)
      and exists (
        select 1 from jsonb_array_elements(case when jsonb_typeof(old.activities) = 'array'
          then old.activities else '[]'::jsonb end) a(entry)
        where a.entry->>'deletion_status' = 'pending'
          and (a.entry->>'reminder' = 'true' or lower(a.entry->>'type') = 'reminder')
          and coalesce(a.entry->>'due_date', a.entry->>'reminder_due_date') = old.next_action_date::text
          and lower(btrim(coalesce(a.entry->>'activity_required', a.entry->>'text', '')))
              = lower(btrim(old.next_action))
      ) then
      raise exception 'This follow-up is read-only while deletion is pending' using errcode = '42501';
    end if;
    if new.activities is not distinct from old.activities then return new; end if;
    if jsonb_typeof(old.activities) = 'array' then before_items := old.activities; end if;
  end if;

  if exists (
    select 1 from jsonb_array_elements(after_items) a(entry)
    where nullif(a.entry->>'id', '') is not null group by a.entry->>'id' having count(*) > 1
  ) then
    raise exception 'Activity IDs must be unique within a lead' using errcode = '23514';
  end if;

  if current_user = 'service_role' and tg_op = 'UPDATE' then
    for item in select a.entry from jsonb_array_elements(after_items) a(entry)
      where a.entry->>'delete_request' = 'true' and a.entry->>'target_type' = 'activity'
    loop
      select a.entry into previous from jsonb_array_elements(before_items) a(entry)
        where a.entry->>'id' = item->>'id';
      decision_status := item->>'request_status';
      if decision_status is not distinct from previous->>'request_status' then continue; end if;
      insert into app_private.activity_deletion_audit (lead_id, request_id, status, details)
      values (new.id, item->>'id', decision_status, item);
      actor := case decision_status when 'pending' then item->>'requested_by'
        when 'restored' then item->>'restored_by' when 'cancelled' then item->>'cancelled_by'
        else item->>'reviewed_by' end;
      if decision_status = 'pending' then
        insert into public.notifications (recipient_uid, lead_id, type, title, message, payload)
        select p.id, new.id, 'activity_deletion_requested', 'Activity deletion request',
          'A deletion request is ready for review for ' || new.company_name || '.',
          jsonb_build_object('request_id', item->>'id', 'view', 'activity/deletions')
        from public.profiles p where p.role = 'admin' and p.status = 'active' and p.id::text <> actor;
      elsif decision_status in ('approved', 'rejected', 'restored') and item->>'requested_by' <> actor then
        insert into public.notifications (recipient_uid, lead_id, type, title, message, payload)
        select p.id, new.id, 'activity_deletion_' || decision_status, 'Activity deletion ' || decision_status,
          new.company_name || ': your activity deletion request was ' || decision_status || '.' ||
            case when decision_status <> 'restored' and nullif(item->>'review_note', '') is not null
              then ' ' || (item->>'review_note') else '' end,
          jsonb_build_object('request_id', item->>'id')
        from public.profiles p where p.id::text = item->>'requested_by' and p.status = 'active';
      end if;
    end loop;
    return new;
  end if;

  for previous in select a.entry from jsonb_array_elements(before_items) a(entry) loop
    item_id := previous->>'id';
    select a.entry into next_item from jsonb_array_elements(after_items) a(entry)
      where a.entry->>'id' = item_id;
    if nullif(item_id, '') is not null and next_item is null then
      raise exception 'Use the CRM deletion approval workflow' using errcode = '42501';
    end if;
    if previous->>'delete_request' = 'true' or previous->>'archived' = 'true'
      or previous->>'deletion_status' = 'pending'
      or exists (select 1 from jsonb_array_elements(before_items) a(entry)
        where a.entry->>'delete_request' = 'true' and a.entry->>'request_status' = 'pending'
          and a.entry->>'target_activity_id' = item_id) then
      if previous is distinct from next_item then
        raise exception 'Deletion request and protected entry are read-only' using errcode = '42501';
      end if;
    elsif (item_id is not null and nullif(previous->>'created_by', '') is not null
        and (previous->>'created_by', previous->>'created_by_name')
          is distinct from (next_item->>'created_by', next_item->>'created_by_name'))
      or jsonb_path_query_array(previous, audit_path)
        <> coalesce(jsonb_path_query_array(next_item, audit_path), '[]'::jsonb) then
      raise exception 'Activity attribution and deletion audit cannot be changed' using errcode = '42501';
    end if;
  end loop;

  for item in select a.entry from jsonb_array_elements(after_items) a(entry) loop
    select a.entry into previous from jsonb_array_elements(before_items) a(entry)
      where a.entry->>'id' = item->>'id';
    if item = previous then continue; end if;
    if item->>'followup_resolution' in ('completed', 'cancelled') and previous is null
      and exists (
        select 1 from jsonb_array_elements(before_items) a(entry)
        where a.entry->>'deletion_status' = 'pending'
          and (a.entry->>'reminder' = 'true' or lower(a.entry->>'type') = 'reminder')
          and coalesce(a.entry->>'due_date', a.entry->>'reminder_due_date') = item->>'followup_due_date'
          and lower(btrim(coalesce(a.entry->>'activity_required', a.entry->>'text', '')))
              = lower(btrim(item->>'followup_action'))
      ) then
      raise exception 'This follow-up is read-only while deletion is pending' using errcode = '42501';
    end if;
    if coalesce(item->'delete_request', 'false'::jsonb) not in ('false'::jsonb, 'null'::jsonb)
      or coalesce(item->'archived', 'false'::jsonb) not in ('false'::jsonb, 'null'::jsonb)
      or nullif(item->>'archive_request_id', '') is not null
      or nullif(item->>'archived_at', '') is not null or nullif(item->>'archived_by', '') is not null
      or nullif(item->>'deletion_status', '') is distinct from nullif(previous->>'deletion_status', '')
      or jsonb_path_query_array(item, audit_path)
        <> coalesce(jsonb_path_query_array(previous, audit_path), '[]'::jsonb) then
      raise exception 'Use the CRM deletion approval workflow' using errcode = '42501';
    end if;
    if nullif(item->>'created_by', '') is distinct from nullif(previous->>'created_by', '')
      and (previous is not null or (current_user <> 'service_role'
        and item->>'created_by' is distinct from auth.uid()::text)) then
      raise exception 'Activity creator cannot be reassigned' using errcode = '42501';
    end if;
  end loop;
  return new;
end;
$$;
revoke all on function app_private.guard_activity_deletion() from public, anon, authenticated, service_role;

drop trigger if exists guard_activity_deletion on public.leads;
create trigger guard_activity_deletion after insert or update of activities, next_action, next_action_date on public.leads
  for each row execute function app_private.guard_activity_deletion();

-- Authorization and password confirmation happen in the CRM. Require the
-- version read through that user's RLS before the server can commit its patch.
create or replace function public.commit_activity_deletion(
  p_lead_id uuid, p_expected_updated_at timestamptz, p_patch jsonb
) returns jsonb language sql security invoker set search_path = pg_catalog as $$
  update public.leads
  set activities = p_patch->'activities',
      last_activity = case when p_patch ? 'last_activity' then (p_patch->>'last_activity')::date else last_activity end,
      next_action = case when p_patch ? 'next_action' then p_patch->>'next_action' else next_action end,
      next_action_date = case when p_patch ? 'next_action_date' then (p_patch->>'next_action_date')::date else next_action_date end
  where id = p_lead_id and updated_at = p_expected_updated_at and jsonb_typeof(p_patch->'activities') = 'array'
  returning to_jsonb(leads)
$$;
revoke all on function public.commit_activity_deletion(uuid, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.commit_activity_deletion(uuid, timestamptz, jsonb) to service_role;

create or replace function public.send_activity_deletion_digest(p_window text)
returns integer language plpgsql security invoker set search_path = pg_catalog as $$
declare
  open_requests jsonb;
  request_count integer;
  written integer;
begin
  if p_window is null or p_window !~ '^[0-9]{4}-W[0-9]{2}$' then
    raise exception 'Invalid digest window' using errcode = '22023';
  end if;
  select count(*), jsonb_agg(jsonb_build_object('lead_id', lead.id, 'request_id', item->>'id',
    'requested_at', item->>'requested_at') order by item->>'requested_at')
  into request_count, open_requests
  from public.leads lead cross join lateral jsonb_array_elements(
    case when jsonb_typeof(lead.activities) = 'array' then lead.activities else '[]'::jsonb end
  ) a(item)
  where item->>'delete_request' = 'true' and item->>'target_type' = 'activity'
    and item->>'request_status' = 'pending';
  if request_count = 0 then return 0; end if;

  insert into public.notifications (id, recipient_uid, type, title, message, payload)
  select md5('activity-deletion-digest:' || p_window || ':' || p.id)::uuid,
    p.id, 'activity_deletion_digest', 'Weekly deletion approval digest',
    request_count || case when request_count = 1 then ' deletion request is awaiting approval.'
      else ' deletion requests are awaiting approval.' end,
    jsonb_build_object('view', 'activity/deletions', 'window', p_window, 'requests', open_requests)
  from public.profiles p where p.role = 'admin' and p.status = 'active'
  on conflict (id) do nothing;
  get diagnostics written = row_count;
  return written;
end;
$$;
revoke all on function public.send_activity_deletion_digest(text) from public, anon, authenticated;
grant execute on function public.send_activity_deletion_digest(text) to service_role;
