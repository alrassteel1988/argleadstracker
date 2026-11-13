-- Use a versioned entry point so an older database cannot ignore a selected activity.
create or replace function public.resolve_lead_followup(p_lead_id uuid, p_input jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_lead public.leads%rowtype;
  v_status text := coalesce(p_input->>'status', '');
  v_reason text := btrim(coalesce(p_input->>'reason', ''));
  v_remarks text := regexp_replace(coalesce(p_input->>'remarks', ''), '^[[:space:]]+|[[:space:]]+$', '', 'g');
  v_contact text := case when v_status = 'completed' then btrim(coalesce(p_input->>'spoke_with', '')) else '' end;
  v_action text := btrim(coalesce(p_input->>'expected_action', ''));
  v_due date := nullif(p_input->>'expected_due', '')::date;
  v_request uuid := nullif(p_input->>'request_id', '')::uuid;
  v_id text := 'followup-' || v_request::text;
  v_next_type text := coalesce(p_input->>'next_type', '');
  v_next_due date := nullif(p_input->>'next_date', '')::date;
  v_next_note text := btrim(coalesce(p_input->>'next_note', ''));
  v_next_action text;
  v_now timestamptz := clock_timestamp();
  v_at timestamptz := case when v_status = 'completed' then nullif(p_input->>'done_at', '')::timestamptz else v_now end;
  v_actor text;
  v_items jsonb;
  v_existing jsonb;
  v_original jsonb;
  v_revision text;
  v_replacement jsonb;
  v_event jsonb;
  v_count integer;
  v_target_id text := nullif(p_input->>'activity_id', '');
  v_target_count integer;
  v_target jsonb;
  v_target_version text := p_input->>'expected_activity_version';
  v_resolve_plan boolean := true;
begin
  select * into v_profile from public.profiles where id = v_uid;
  if not found or v_profile.status is distinct from 'active' or coalesce(v_profile.role, '') not in ('admin', 'salesman') then
    raise exception 'Active Admin or salesman required' using errcode = '42501';
  end if;
  if v_status not in ('completed', 'cancelled')
    or (v_status = 'completed' and v_reason not in ('Spoke to customer', 'Meeting booked', 'Quote requested', 'Left voicemail', 'No answer', 'Wrong number'))
    or (v_status = 'cancelled' and v_reason not in ('Contact has left the company', 'Customer asked not to be contacted', 'Duplicate activity', 'No longer relevant', 'Wrong lead or contact details', 'Replaced by another activity', 'Management instruction', 'Other'))
    or char_length(v_remarks) not between (case when v_status = 'completed' then 10 else 15 end) and 4000
    or char_length(v_contact) > 200
    or char_length(v_action) not between 1 and 200 or v_due is null or not isfinite(v_due) or v_request is null
    or v_at is null or not isfinite(v_at) or v_at > v_now then
    raise exception 'Invalid follow-up outcome, reason, date or remarks' using errcode = '22023';
  end if;
  if v_target_id is not null and (v_status <> 'cancelled' or char_length(v_target_id) > 200
    or btrim(v_target_id) <> v_target_id or coalesce(v_target_version, '') !~ '^[1-9][0-9]{0,8}$') then
    raise exception 'Invalid cancellation target or activity version' using errcode = '22023';
  end if;
  if v_next_type <> '' then
    if v_next_type not in ('To Call', 'To Send Email', 'To Visit', 'Send quotation') or v_next_due is null
      or not isfinite(v_next_due) or v_next_due < (v_now at time zone 'Asia/Dubai')::date or char_length(v_next_note) > 500 then
      raise exception 'Invalid replacement type or date' using errcode = '22023';
    end if;
    v_next_action := case when v_next_type = 'Send quotation' then 'To Send Email' else v_next_type end;
  elsif v_next_due is not null or v_next_note <> '' then
    raise exception 'Replacement type required' using errcode = '22023';
  end if;

  select * into v_lead from public.leads where id = p_lead_id for update;
  if not found or not coalesce(v_profile.role = 'admin' or v_lead.assigned_to = v_uid
    or (v_lead.assigned_to is null and btrim(coalesce(v_profile.full_name, '')) <> ''
      and lower(btrim(v_lead.assigned_salesman)) = lower(btrim(v_profile.full_name))), false) then
    raise exception 'Follow-up unavailable' using errcode = '42501';
  end if;
  v_items := coalesce(v_lead.activities, '[]'::jsonb);
  select item into v_existing from jsonb_array_elements(v_items) item where item->>'id' = v_id limit 1;
  if found then
    if v_existing->>'created_by' is distinct from v_uid::text or v_existing->>'followup_resolution' is distinct from v_status
      or nullif(v_existing->>'resolved_activity_id', '') is distinct from v_target_id then
      raise exception 'Follow-up request already used' using errcode = '40001';
    end if;
    return jsonb_build_object('lead', to_jsonb(v_lead), 'activity', v_existing, 'duplicate', true);
  end if;
  select item->>'id' into v_revision from jsonb_array_elements(v_items) with ordinality as e(item, position)
    where item->>'followup_resolution' is not null order by position limit 1;
  if (v_target_id is null and (btrim(v_lead.next_action) is distinct from v_action or v_lead.next_action_date is distinct from v_due))
    or coalesce(v_revision, '') is distinct from coalesce(p_input->>'expected_revision', '')
    or v_lead.updated_at is distinct from nullif(p_input->>'expected_updated_at', '')::timestamptz then
    raise exception 'The next step changed. Refresh the lead before saving.' using errcode = '40001';
  end if;

  select count(*), (jsonb_agg(item)->0) into v_count, v_original
  from jsonb_array_elements(v_items) item
  where (item->>'reminder' = 'true' or lower(item->>'type') = 'reminder')
    and coalesce(item->>'archived', 'false') <> 'true' and coalesce(item->>'delete_request', 'false') <> 'true'
    and coalesce(item->>'deletion_status', '') <> 'pending'
    and coalesce(item->>'reminder_status', '') not in ('completed', 'cancelled')
    and coalesce(item->>'transaction_status', '') not in ('closed', 'cancelled')
    and nullif(item->>'completed_at', '') is null and coalesce(item->>'followup_completed', '') <> 'true'
    and item->>'followup_resolution' is null
    and coalesce(nullif(item->>'due_date', ''), item->>'reminder_due_date') = v_due::text
    and lower(btrim(coalesce(nullif(item->>'activity_required', ''), item->>'text'))) = lower(v_action)
    and not exists (select 1 from jsonb_array_elements(v_items) prior where prior->>'followup_resolution' is not null
      and (nullif(item->>'id', '') in (prior->>'resolved_reminder_id', prior->>'resolved_activity_id')
        or (nullif(item->>'id', '') is null and prior->>'resolved_legacy_reminder' = 'true'
          and prior->>'followup_due_date' = v_due::text and lower(prior->>'followup_action') = lower(v_action))));
  if v_target_id is not null then
    select count(*), (jsonb_agg(item)->0) into v_target_count, v_target
    from jsonb_array_elements(v_items) item where item->>'id' = v_target_id;
    if v_target_count <> 1 or coalesce(nullif(v_target->>'version', ''), '1') <> v_target_version
      or coalesce(v_target->>'archived', '') = 'true' or coalesce(v_target->>'delete_request', '') = 'true'
      or coalesce(v_target->>'deletion_status', '') = 'pending'
      or coalesce(v_target->>'reminder_status', '') in ('completed', 'cancelled')
      or coalesce(v_target->>'transaction_status', '') in ('closed', 'cancelled')
      or nullif(v_target->>'completed_at', '') is not null or coalesce(v_target->>'followup_completed', '') = 'true'
      or v_target->>'followup_resolution' is not null
      or left(coalesce(nullif(v_target->>'next_action_date', ''), nullif(v_target->>'reminder_due_date', ''),
        case when v_target->>'reminder' = 'true' or lower(v_target->>'type') = 'reminder' then v_target->>'due_date' end), 10)
        is distinct from v_due::text
      or btrim(coalesce(nullif(v_target->>'activity_required', ''), nullif(v_target->>'followup_action', ''),
        case when v_target->>'reminder' = 'true' or lower(v_target->>'type') = 'reminder' then nullif(v_target->>'text', '') end,
        nullif(v_target->>'activity_purpose', ''), nullif(v_target->>'type', ''), 'Activity')) is distinct from v_action
      or exists (select 1 from jsonb_array_elements(v_items) prior where prior->>'followup_resolution' is not null
        and v_target_id in (prior->>'resolved_reminder_id', prior->>'resolved_activity_id')) then
      raise exception 'The activity changed or is no longer pending. Refresh before saving.' using errcode = '40001';
    end if;
    -- Only a uniquely linked reminder can change the lead's current plan.
    v_resolve_plan := coalesce(v_count = 1 and v_original->>'id' = v_target_id
      and btrim(v_lead.next_action) = v_action and v_lead.next_action_date = v_due, false);
    v_original := v_target;
  elsif v_count > 1 then
    raise exception 'More than one reminder matches this next step. Review the lead''s Reminders before saving.' using errcode = '40001';
  end if;
  if v_target_id is null and v_count = 0 and exists (select 1 from jsonb_array_elements(v_items) item where item->>'followup_completed' = 'true'
    and item->>'completed_due_date' = v_due::text and lower(btrim(item->>'completed_activity_required')) = lower(v_action)) then
    raise exception 'This next step has already been completed.' using errcode = '40001';
  end if;
  v_actor := coalesce(nullif(v_profile.full_name, ''), 'User');
  if v_next_action is not null then
    v_replacement := jsonb_build_object(
      'id', v_id || '-next', 'type', 'Reminder', 'reminder', true, 'reminder_status', 'scheduled',
      'reminder_type', 'General follow-up', 'at', v_now, 'created_at', v_now, 'version', 1,
      'created_by', v_uid, 'created_by_name', v_actor, 'due_date', v_next_due, 'due_time', '09:00',
      'activity_required', v_next_action, 'text', coalesce(nullif(v_next_note, ''), v_next_type), 'followup_label', v_next_type);
  end if;
  v_event := jsonb_build_object(
    'id', v_id, 'type', case when v_status = 'cancelled' then 'Follow-up cancelled'
      when v_action ~* 'email' then 'Email' when v_action ~* 'visit|meeting' then 'Meeting' else 'Phone Call' end,
    'at', v_at, 'activity_date', (v_at at time zone 'Asia/Dubai')::date, 'created_at', v_now, 'updated_at', v_now,
    'version', 1, 'created_by', v_uid, 'created_by_name', v_actor, 'followup_resolution', v_status,
    'followup_action', v_action, 'followup_due_date', v_due, 'resolved_reminder_id', case when v_original->>'reminder' = 'true' or lower(v_original->>'type') = 'reminder'
      then coalesce(v_original->>'id', '') else '' end,
    'resolved_legacy_reminder', v_count = 1 and nullif(v_original->>'id', '') is null,
    'transaction_status', case when v_status = 'completed' then 'closed' else 'cancelled' end,
    'transaction_outcome', v_reason, 'transaction_remarks', v_remarks, 'transaction_updated_at', v_now,
    'transaction_updated_by', v_uid, 'transaction_updated_by_name', v_actor, 'text', v_remarks, 'notes', v_remarks,
    'spoke_with', v_contact, 'replacement_id', coalesce(v_replacement->>'id', ''), 'replacement_label', v_next_type,
    'replacement_due_date', coalesce(v_next_due::text, ''),
    'audit_history', jsonb_build_array(jsonb_build_object(
      'id', 'audit-' || gen_random_uuid()::text, 'action', 'followup_' || v_status, 'actor_id', v_uid,
      'actor_name', v_actor, 'at', v_now, 'previous_status', 'scheduled', 'new_status', v_status,
      'reason', v_reason, 'remarks', v_remarks, 'original_due_date', v_due, 'resolved_activity_id', v_target_id, 'replacement_id', v_replacement->>'id'
    ))
  ) || case when v_target_id is null then '{}'::jsonb else jsonb_build_object('resolved_activity_id', v_target_id,
    'followup_scope', case when v_resolve_plan then 'plan' else 'activity' end) end
    || case when v_status = 'completed' then jsonb_build_object('done_at', v_at, 'done_by', v_uid)
     else jsonb_build_object('cancelled_at', v_at, 'cancelled_by', v_uid) end;
  update public.leads set
    activities = jsonb_build_array(v_event) || case when v_replacement is null then '[]'::jsonb else jsonb_build_array(v_replacement) end || v_items,
    next_action = case when v_resolve_plan then coalesce(v_next_action, '') else v_lead.next_action end,
    next_action_date = case when v_resolve_plan then v_next_due else v_lead.next_action_date end,
    last_activity = case when v_status = 'completed' then greatest(last_activity, (v_at at time zone 'Asia/Dubai')::date) else last_activity end
  where id = p_lead_id returning * into v_lead;
  if not found then raise exception 'Follow-up unavailable' using errcode = '42501'; end if;
  return jsonb_build_object('lead', to_jsonb(v_lead), 'activity', v_event);
end;
$$;

revoke all on function public.resolve_lead_followup(uuid, jsonb) from public, anon;
grant execute on function public.resolve_lead_followup(uuid, jsonb) to authenticated;

create or replace function public.resolve_lead_activity_cancellation(p_lead_id uuid, p_input jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if nullif(p_input->>'activity_id', '') is null or p_input->>'status' is distinct from 'cancelled' then
    raise exception 'A cancellation target is required' using errcode = '22023';
  end if;
  return public.resolve_lead_followup(p_lead_id, p_input);
end;
$$;

revoke all on function public.resolve_lead_activity_cancellation(uuid, jsonb) from public, anon;
grant execute on function public.resolve_lead_activity_cancellation(uuid, jsonb) to authenticated;

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
  if v_item->>'followup_resolution' is not null or v_item->>'transaction_status' = 'cancelled'
    or v_item->>'reminder_status' = 'cancelled' or exists (
      select 1 from jsonb_array_elements(v_lead.activities) as entry(value)
      where entry.value->>'followup_resolution' is not null
        and p_activity_id in (entry.value->>'resolved_activity_id', entry.value->>'resolved_reminder_id')
    ) then
    raise exception 'Activity changed; refresh before saving' using errcode = '40001';
  end if;
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
