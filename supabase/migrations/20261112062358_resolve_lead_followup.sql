-- Review only. A resolved plan may have no next due date.
alter table public.leads alter column next_action_date drop not null;

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
    if v_existing->>'created_by' is distinct from v_uid::text or v_existing->>'followup_resolution' is null then
      raise exception 'Follow-up request already used' using errcode = '40001';
    end if;
    return jsonb_build_object('lead', to_jsonb(v_lead), 'activity', v_existing, 'duplicate', true);
  end if;
  select item->>'id' into v_revision from jsonb_array_elements(v_items) with ordinality as e(item, position)
    where item->>'followup_resolution' is not null order by position limit 1;
  if btrim(v_lead.next_action) is distinct from v_action or v_lead.next_action_date is distinct from v_due
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
    and coalesce(item->>'transaction_status', '') <> 'closed'
    and coalesce(nullif(item->>'due_date', ''), item->>'reminder_due_date') = v_due::text
    and lower(btrim(coalesce(nullif(item->>'activity_required', ''), item->>'text'))) = lower(v_action)
    and not exists (select 1 from jsonb_array_elements(v_items) prior where prior->>'followup_resolution' is not null
      and (nullif(item->>'id', '') = prior->>'resolved_reminder_id'
        or (nullif(item->>'id', '') is null and prior->>'resolved_legacy_reminder' = 'true'
          and prior->>'followup_due_date' = v_due::text and lower(prior->>'followup_action') = lower(v_action))));
  if v_count > 1 then
    raise exception 'More than one reminder matches this next step. Review the lead''s Reminders before saving.' using errcode = '40001';
  end if;
  if v_count = 0 and exists (select 1 from jsonb_array_elements(v_items) item where item->>'followup_completed' = 'true'
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
    'followup_action', v_action, 'followup_due_date', v_due, 'resolved_reminder_id', coalesce(v_original->>'id', ''),
    'resolved_legacy_reminder', v_count = 1 and nullif(v_original->>'id', '') is null,
    'transaction_status', case when v_status = 'completed' then 'closed' else 'cancelled' end,
    'transaction_outcome', v_reason, 'transaction_remarks', v_remarks, 'transaction_updated_at', v_now,
    'transaction_updated_by', v_uid, 'transaction_updated_by_name', v_actor, 'text', v_remarks, 'notes', v_remarks,
    'spoke_with', v_contact, 'replacement_id', coalesce(v_replacement->>'id', ''), 'replacement_label', v_next_type,
    'replacement_due_date', coalesce(v_next_due::text, ''),
    'audit_history', jsonb_build_array(jsonb_build_object(
      'id', 'audit-' || gen_random_uuid()::text, 'action', 'followup_' || v_status, 'actor_id', v_uid,
      'actor_name', v_actor, 'at', v_now, 'previous_status', 'scheduled', 'new_status', v_status,
      'reason', v_reason, 'remarks', v_remarks, 'original_due_date', v_due, 'replacement_id', v_replacement->>'id'
    ))
  ) || case when v_status = 'completed' then jsonb_build_object('done_at', v_at, 'done_by', v_uid)
     else jsonb_build_object('cancelled_at', v_at, 'cancelled_by', v_uid) end;
  update public.leads set
    activities = jsonb_build_array(v_event) || case when v_replacement is null then '[]'::jsonb else jsonb_build_array(v_replacement) end || v_items,
    next_action = coalesce(v_next_action, ''), next_action_date = v_next_due,
    last_activity = case when v_status = 'completed' then greatest(last_activity, (v_at at time zone 'Asia/Dubai')::date) else last_activity end
  where id = p_lead_id returning * into v_lead;
  if not found then raise exception 'Follow-up unavailable' using errcode = '42501'; end if;
  return jsonb_build_object('lead', to_jsonb(v_lead), 'activity', v_event);
end;
$$;

revoke all on function public.resolve_lead_followup(uuid, jsonb) from public, anon;
grant execute on function public.resolve_lead_followup(uuid, jsonb) to authenticated;
