-- Atomic activity updates. Review access rules and apply only with approval.
create or replace function public.update_activity_transaction(
  p_lead_id uuid,
  p_activity_id text,
  p_expected_version integer,
  p_status text,
  p_outcome text,
  p_remarks text,
  p_next_attempt date default null
) returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_lead public.leads%rowtype;
  v_item jsonb;
  v_updated jsonb;
  v_history jsonb;
  v_index integer;
  v_count integer;
  v_version integer;
  v_status text := lower(btrim(coalesce(p_status, '')));
  v_outcome text := btrim(coalesce(p_outcome, ''));
  v_remarks text := btrim(coalesce(p_remarks, ''));
  v_now timestamptz := clock_timestamp();
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into v_profile from public.profiles where id = v_uid;
  if not found or v_profile.status is distinct from 'active' or v_profile.role is distinct from 'salesman' then
    raise exception 'Active salesman access required' using errcode = '42501';
  end if;
  if v_status not in ('pending', 'closed') or p_expected_version is null or p_expected_version < 1 then
    raise exception 'Invalid status or version' using errcode = '22023';
  end if;
  if (v_status = 'pending' and v_outcome not in ('Call back requested', 'Meeting or visit scheduled', 'Will try again', 'Waiting for customer reply'))
    or (v_status = 'closed' and v_outcome not in ('Done - spoke to customer', 'Done - visit or meeting held', 'Not reached - no answer', 'Not reached - wrong or invalid number', 'Not interested', 'Company closed or moved')) then
    raise exception 'Invalid outcome for status' using errcode = '22023';
  end if;
  if char_length(v_remarks) < 1 or char_length(v_remarks) > 4000 then
    raise exception 'Remarks are required and must not exceed 4000 characters' using errcode = '22023';
  end if;
  if (v_status = 'pending' and p_next_attempt is null) or (v_status = 'closed' and p_next_attempt is not null) then
    raise exception 'A next-attempt date is required only for pending activities' using errcode = '22023';
  end if;

  select * into v_lead from public.leads where id = p_lead_id for update;
  if not found or not coalesce((
    v_lead.assigned_to = v_uid
    or (v_lead.assigned_to is null and coalesce(v_lead.assigned_salesman, '') <> ''
      and lower(btrim(v_lead.assigned_salesman)) = lower(btrim(coalesce(v_profile.full_name, ''))))
  ), false) then
    raise exception 'Activity unavailable' using errcode = '42501';
  end if;
  if jsonb_typeof(v_lead.activities) is distinct from 'array' or nullif(btrim(coalesce(p_activity_id, '')), '') is null then
    raise exception 'Activity unavailable' using errcode = '22023';
  end if;
  select count(*), min(item.ordinality)::integer - 1 into v_count, v_index
  from jsonb_array_elements(v_lead.activities) with ordinality as item(value, ordinality)
  where item.value->>'id' = p_activity_id;
  if v_count <> 1 then raise exception 'Activity unavailable or ID is ambiguous' using errcode = '22023'; end if;
  v_item := v_lead.activities->v_index;
  if coalesce((v_item->>'archived')::boolean, false) or coalesce((v_item->>'delete_request')::boolean, false)
    or v_item->>'deletion_status' = 'pending' then
    raise exception 'Activity cannot be updated' using errcode = '22023';
  end if;
  if coalesce(v_item->>'version', '1') !~ '^[1-9][0-9]{0,8}$' then
    raise exception 'Invalid stored activity version' using errcode = '22023';
  end if;
  v_version := coalesce((v_item->>'version')::integer, 1);
  if v_version <> p_expected_version then raise exception 'Activity changed; refresh before saving' using errcode = '40001'; end if;
  v_history := case when jsonb_typeof(v_item->'audit_history') = 'array' then v_item->'audit_history' else '[]'::jsonb end;
  v_updated := v_item || jsonb_build_object(
    'transaction_status', v_status, 'transaction_outcome', v_outcome,
    'transaction_remarks', v_remarks, 'transaction_next_attempt', coalesce(p_next_attempt::text, ''),
    'transaction_updated_at', v_now, 'transaction_updated_by', v_uid,
    'transaction_updated_by_name', coalesce(nullif(v_profile.full_name, ''), 'User'),
    'version', v_version + 1,
    'audit_history', jsonb_build_array(jsonb_build_object(
      'id', 'audit_' || gen_random_uuid()::text, 'action', 'transaction_status_updated',
      'actor_id', v_uid, 'actor_name', coalesce(nullif(v_profile.full_name, ''), 'User'),
      'at', v_now, 'previous_status', coalesce(v_item->>'transaction_status', 'pending'),
      'new_status', v_status, 'outcome', v_outcome, 'remarks', v_remarks,
      'next_attempt', coalesce(p_next_attempt::text, '')
    )) || v_history
  );
  update public.leads set activities = jsonb_set(v_lead.activities, array[v_index::text], v_updated)
  where id = p_lead_id;
  if not found then raise exception 'Activity unavailable' using errcode = '42501'; end if;
  return v_updated;
end;
$$;

revoke all on function public.update_activity_transaction(uuid, text, integer, text, text, text, date) from public, anon;
grant execute on function public.update_activity_transaction(uuid, text, integer, text, text, text, date) to authenticated;
