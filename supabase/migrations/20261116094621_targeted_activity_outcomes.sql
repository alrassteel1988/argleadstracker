-- Resolve an independent overdue item without changing the lead's current plan.
create schema if not exists app_private;
grant usage on schema app_private to authenticated;

create function app_private.resolve_overdue_activity(p_lead_id uuid, p_input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_lead public.leads%rowtype;
  v_target text := btrim(coalesce(p_input->>'activity_id', ''));
  v_version integer := nullif(p_input->>'expected_activity_version', '')::integer;
  v_id text := 'followup-' || (nullif(p_input->>'request_id', '')::uuid)::text;
  v_status text := coalesce(p_input->>'status', '');
  v_reason text := btrim(coalesce(p_input->>'reason', ''));
  v_remarks text := regexp_replace(coalesce(p_input->>'remarks', ''), '^[[:space:]]+|[[:space:]]+$', '', 'g');
  v_contact text := case when v_status = 'completed' then btrim(coalesce(p_input->>'spoke_with', '')) else '' end;
  v_due text := coalesce(p_input->>'expected_due', '');
  v_action text := btrim(coalesce(p_input->>'expected_action', ''));
  v_now timestamptz := clock_timestamp();
  v_at timestamptz := case when v_status = 'completed' then nullif(p_input->>'done_at', '')::timestamptz else v_now end;
  v_actor text;
  v_items jsonb;
  v_original jsonb;
  v_event jsonb;
  v_count integer;
  v_reminder boolean;
  v_original_action text;
  v_original_due text;
  v_actual_day date;
begin
  select * into v_profile from public.profiles where id = v_uid;
  if not found or v_profile.status is distinct from 'active' or coalesce(v_profile.role, '') not in ('admin', 'salesman') then
    raise exception 'Active Admin or salesman required' using errcode = '42501';
  end if;
  if char_length(v_target) not between 1 and 200 or v_version is null or v_version < 1 or v_id is null
    or v_status not in ('completed', 'cancelled')
    or (v_status = 'completed' and v_reason not in ('Spoke to customer', 'Meeting booked', 'Quote requested', 'Left voicemail', 'No answer', 'Wrong number'))
    or (v_status = 'cancelled' and v_reason not in ('Contact has left the company', 'Customer asked not to be contacted', 'Duplicate activity', 'No longer relevant', 'Wrong lead or contact details', 'Replaced by another activity', 'Management instruction', 'Other'))
    or char_length(v_remarks) not between (case when v_status = 'completed' then 10 else 15 end) and 4000
    or char_length(v_contact) > 200 or char_length(v_action) not between 1 and 200
    or v_due !~ '^\d{4}-\d{2}-\d{2}$' or v_due::date >= (v_now at time zone 'Asia/Dubai')::date
    or v_at is null or not isfinite(v_at) or v_at > v_now
    or (v_status = 'completed' and coalesce(p_input->>'done_at', '') !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}\+04:00$')
    or coalesce(p_input->>'next_type', '') <> '' or coalesce(p_input->>'next_date', '') <> ''
    or coalesce(p_input->>'next_note', '') <> '' or p_input->>'next_step' is not null then
    raise exception 'Invalid overdue activity, outcome, date or remarks' using errcode = '22023';
  end if;

  select * into v_lead from public.leads where id = p_lead_id and (v_profile.role = 'admin' or assigned_to = v_uid) for update;
  if not found then
    raise exception 'Follow-up unavailable' using errcode = '42501';
  end if;
  v_items := coalesce(v_lead.activities, '[]'::jsonb);
  select item into v_event from jsonb_array_elements(v_items) item where item->>'id' = v_id limit 1;
  if found then
    if v_event->>'created_by' is distinct from v_uid::text or v_event->>'followup_resolution' is distinct from v_status
      or v_event->>'resolved_activity_id' is distinct from v_target
      or v_event->>'transaction_outcome' is distinct from v_reason or v_event->>'transaction_remarks' is distinct from v_remarks
      or v_event->>'followup_due_date' is distinct from v_due or v_event->>'followup_action' is distinct from v_action then
      raise exception 'Follow-up request already used' using errcode = '40001';
    end if;
    return jsonb_build_object('lead', to_jsonb(v_lead), 'activity', v_event, 'duplicate', true);
  end if;

  select count(*), (jsonb_agg(item)->0) into v_count, v_original
    from jsonb_array_elements(v_items) item where item->>'id' = v_target;
  if v_count <> 1 or v_lead.updated_at is distinct from nullif(p_input->>'expected_updated_at', '')::timestamptz
    or coalesce(v_original->>'version', '1') is distinct from v_version::text
    or v_original->>'archived' = 'true' or v_original->>'delete_request' = 'true' or v_original->>'deletion_status' = 'pending'
    or v_original->>'followup_resolution' is not null or v_original->>'followup_completed' = 'true' or nullif(v_original->>'completed_at', '') is not null
    or lower(v_original->>'reminder_status') in ('closed', 'completed', 'cancelled')
    or lower(v_original->>'transaction_status') in ('closed', 'completed', 'cancelled')
    or exists (select 1 from jsonb_array_elements(v_items) prior where prior->>'followup_resolution' in ('completed', 'cancelled')
      and (prior->>'resolved_activity_id' = v_target or prior->>'resolved_reminder_id' = v_target)) then
    raise exception 'This activity changed or is no longer pending. Refresh before saving.' using errcode = '40001';
  end if;

  v_reminder := coalesce(v_original->>'reminder' = 'true' or lower(v_original->>'type') = 'reminder', false);
  if not v_reminder and nullif(v_original->>'next_action_plan', '') is not null then
    raise exception 'This activity records a lead plan. Use the next-step controls.' using errcode = '40001';
  end if;
  v_original_due := left(coalesce(nullif(v_original->>'next_action_date', ''), nullif(v_original->>'reminder_due_date', ''),
    case when v_reminder then v_original->>'due_date' end), 10);
  v_original_action := btrim(coalesce(nullif(v_original->>'activity_required', ''), nullif(v_original->>'followup_action', ''),
    case when v_reminder then nullif(v_original->>'text', '') end, nullif(v_original->>'activity_purpose', ''), nullif(v_original->>'type', ''), 'Activity'));
  if v_original_due is distinct from v_due or v_original_action is distinct from v_action then
    raise exception 'This activity changed. Refresh before saving.' using errcode = '40001';
  end if;
  if v_reminder and v_lead.next_action_date::text in (v_due, left(v_original->>'due_date', 10), left(v_original->>'reminder_due_date', 10))
    and lower(v_original_action) = lower(btrim(v_lead.next_action)) then
    raise exception 'This activity is the lead''s next step. Use the next-step controls.' using errcode = '40001';
  end if;

  v_actor := coalesce(nullif(btrim(v_profile.full_name), ''), 'User');
  v_actual_day := (v_at at time zone 'Asia/Dubai')::date;
  v_event := jsonb_build_object(
    'id', v_id, 'version', 1, 'type', case when v_status = 'cancelled' then 'Follow-up cancelled'
      when v_action ~* 'email' then 'Email' when v_action ~* 'visit|meeting' then 'Meeting' else 'Phone Call' end,
    'at', v_at, 'activity_date', v_actual_day, 'created_at', v_now, 'updated_at', v_now, 'created_by', v_uid, 'created_by_name', v_actor,
    'followup_scope', 'activity', 'resolved_activity_id', v_target,
    'followup_resolution', v_status, 'followup_action', v_action, 'followup_due_date', v_due,
    'transaction_status', case when v_status = 'completed' then 'closed' else 'cancelled' end,
    'transaction_outcome', v_reason, 'transaction_remarks', v_remarks,
    'transaction_updated_at', v_now, 'transaction_updated_by', v_uid, 'transaction_updated_by_name', v_actor,
    'notes', v_remarks, 'text', v_remarks, 'spoke_with', v_contact,
    'audit_history', jsonb_build_array(jsonb_build_object('action', 'followup_' || v_status, 'at', v_now,
      'actor_id', v_uid, 'actor_name', v_actor, 'actor_role', v_profile.role, 'activity_id', v_target,
      'previous_status', 'scheduled', 'new_status', v_status, 'original_due_date', v_due, 'reason', v_reason, 'remarks', v_remarks))
  ) || case when v_status = 'completed' then jsonb_build_object('done_at', v_at, 'done_by', v_uid)
    else jsonb_build_object('cancelled_at', v_at, 'cancelled_by', v_uid) end;
  update public.leads set activities = jsonb_build_array(v_event) || v_items, updated_at = v_now,
    last_activity = case when v_status = 'completed' then greatest(last_activity, v_actual_day) else last_activity end
    where id = p_lead_id returning * into v_lead;
  if not found then raise exception 'Follow-up unavailable' using errcode = '42501'; end if;
  return jsonb_build_object('lead', to_jsonb(v_lead), 'activity', v_event);
end;
$$;

revoke all on function app_private.resolve_overdue_activity(uuid, jsonb) from public, anon, service_role;
grant execute on function app_private.resolve_overdue_activity(uuid, jsonb) to authenticated;

create function public.resolve_overdue_activity(p_lead_id uuid, p_input jsonb)
returns jsonb
language sql
security invoker
set search_path = pg_catalog
as $$ select app_private.resolve_overdue_activity(p_lead_id, p_input) $$;

revoke all on function public.resolve_overdue_activity(uuid, jsonb) from public, anon, service_role;
grant execute on function public.resolve_overdue_activity(uuid, jsonb) to authenticated;

-- Direct JSON writes may carry existing audit items forward, but cannot forge or change them.
create function app_private.guard_overdue_activity_history()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  v_before jsonb := '[]'::jsonb;
  v_after jsonb := case when jsonb_typeof(new.activities) = 'array' then new.activities else '[]'::jsonb end;
begin
  if current_user in ('postgres', 'service_role') then return new; end if;
  if tg_op = 'UPDATE' and jsonb_typeof(old.activities) = 'array' then v_before := old.activities; end if;
  if exists (
    (select item from jsonb_array_elements(v_before) item where item ? 'resolved_activity_id'
      except all select item from jsonb_array_elements(v_after) item)
    union all
    (select item from jsonb_array_elements(v_after) item where item ? 'resolved_activity_id'
      except all select item from jsonb_array_elements(v_before) item)
  ) then
    raise exception 'Use the follow-up controls to record an outcome' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function app_private.guard_overdue_activity_history() from public, anon, authenticated, service_role;
create trigger guard_overdue_activity_history before insert or update of activities on public.leads
  for each row execute function app_private.guard_overdue_activity_history();
notify pgrst, 'reload schema';
