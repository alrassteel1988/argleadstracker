-- Review with the activity-schedule feature. Do not backfill creation times
-- for legacy schedules: those start locked and can be rescheduled by review.
alter table public.leads add column activity_schedule jsonb;
create schema if not exists app_private;

create table public.activity_schedule_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null,
  plan_id text not null,
  kind text not null check (kind in ('schedule_edited','rescheduled','reschedule_requested','reschedule_approved','reschedule_rejected','completed','cancelled')),
  recorded_at timestamptz not null,
  actor_id uuid not null,
  actor_name text not null,
  actor_role text not null,
  assignee_id uuid,
  assignee_name text not null,
  original_due_date date not null,
  original_due_time text not null,
  details jsonb not null
);
create index activity_schedule_events_recent on public.activity_schedule_events(recorded_at desc, id);
create index activity_schedule_events_original_due on public.activity_schedule_events(original_due_date);
alter table public.activity_schedule_events enable row level security;
revoke all on public.activity_schedule_events from public, anon, authenticated, service_role;
grant select on public.activity_schedule_events to authenticated, service_role;
grant insert on public.activity_schedule_events to service_role;
create policy activity_schedule_admin_read on public.activity_schedule_events for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid())
    and p.role = 'admin' and p.status = 'active'));

create function app_private.activity_schedule_stamp(p_date date, p_action text, p_activities jsonb)
returns jsonb language sql set search_path = pg_catalog as $$
  select case when p_date is not null and btrim(coalesce(p_action, '')) <> '' then jsonb_build_object(
    'id', gen_random_uuid(), 'created_at', clock_timestamp(), 'original_due_date', p_date,
    'due_time', r.due_time, 'original_due_time', r.due_time,
    'agenda', '', 'priority', 'Normal', 'reschedules', 0, 'request', null) end
  from (select coalesce((
    select item->>'due_time' from jsonb_array_elements(
      case when jsonb_typeof(p_activities)='array' then p_activities else '[]'::jsonb end
    ) a(item)
    where (item->>'reminder'='true' or lower(item->>'type')='reminder')
      and item->>'due_date'=p_date::text and lower(btrim(item->>'activity_required'))=lower(btrim(p_action))
      and item->>'due_time' ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    limit 1
  ), '09:00') as due_time) r
$$;
grant usage on schema app_private to authenticated, service_role;
revoke all on function app_private.activity_schedule_stamp(date,text,jsonb) from public, anon;
grant execute on function app_private.activity_schedule_stamp(date,text,jsonb) to authenticated, service_role;

create function app_private.guard_activity_schedule()
returns trigger language plpgsql set search_path = pg_catalog as $$
declare
  trusted boolean := current_user in ('postgres','service_role');
  old_open boolean := false;
  pair_changed boolean := false;
  updating_items boolean := false;
  prior_items jsonb := '[]'::jsonb;
  after_items jsonb := case when jsonb_typeof(new.activities)='array' then new.activities else '[]'::jsonb end;
  prior_by_id jsonb;
  after_by_id jsonb;
  entry jsonb;
  previous jsonb;
  old_history jsonb;
  new_history jsonb;
  history_index integer;
  history_offset integer;
  stable_id text;
  key_name text;
  deletion_change record;
  original_fields constant text[] := array['at','type','text','note','notes','activity_purpose','next_action_plan',
    'next_action_date','due_date','reminder_due_date','due_time','activity_required','reminder_type','reminder','reminder_status',
    'created_by','created_by_name','schedule_agenda','schedule_priority','done_at','done_by',
    'followup_resolution','followup_action','followup_due_date','resolved_reminder_id','resolved_legacy_reminder',
    'correction','corrected_by','corrected_by_name','corrected_at','proposed_activity_date','proposed_activity_type'];
begin
  if tg_op = 'UPDATE' then
    old_open := old.next_action_date is not null and btrim(coalesce(old.next_action,'')) <> '';
    pair_changed := (btrim(coalesce(new.next_action,'')),new.next_action_date)
      is distinct from (btrim(coalesce(old.next_action,'')),old.next_action_date);
    if not trusted and new.activity_schedule is distinct from old.activity_schedule then
      raise exception 'Schedule metadata cannot be edited directly' using errcode='42501';
    end if;
    if not trusted and old_open and pair_changed then
      raise exception 'Use the next-step controls to change an existing schedule.' using errcode='42501';
    end if;
    updating_items := new.activities is distinct from old.activities;
    if jsonb_typeof(old.activities)='array' then prior_items := old.activities; end if;
  elsif not trusted and new.activity_schedule is not null then
    raise exception 'Schedule metadata cannot be supplied directly' using errcode='42501';
  else
    updating_items := true;
  end if;

  if not trusted and updating_items then
    if jsonb_typeof(new.activities) is distinct from 'array' then
      raise exception 'Activity history must be an array' using errcode='23514';
    end if;
    select coalesce(jsonb_object_agg(i.value->>'id', i.value),'{}'::jsonb) into prior_by_id
      from jsonb_array_elements(prior_items) i(value) where nullif(i.value->>'id','') is not null;
    select coalesce(jsonb_object_agg(i.value->>'id', i.value),'{}'::jsonb) into after_by_id
      from jsonb_array_elements(after_items) i(value) where nullif(i.value->>'id','') is not null;
    if exists (select 1 from jsonb_array_elements(after_items) i(value)
      where nullif(i.value->>'id','') is not null group by i.value->>'id' having count(*)>1) then
      raise exception 'Activity IDs must be unique within a lead' using errcode='23514';
    end if;
    if exists (select 1 from jsonb_object_keys(prior_by_id) p(id) where not (after_by_id ? p.id)) then
      raise exception 'Activities cannot be removed from history' using errcode='42501';
    end if;
    for entry in select i.value from jsonb_array_elements(after_items) i(value) loop
      stable_id := nullif(entry->>'id','');
      previous := prior_by_id->stable_id;
      if previous is null then
        if entry->>'followup_resolution' is not null
          or (entry->>'followup_completed'='true' and old_open
            and entry->>'completed_due_date'=old.next_action_date::text
            and lower(btrim(entry->>'completed_activity_required'))=lower(btrim(old.next_action)))
          or (nullif(entry->>'created_by','') is not null and entry->>'created_by' is distinct from auth.uid()::text)
          or (nullif(entry->>'corrected_by','') is not null and entry->>'corrected_by' is distinct from auth.uid()::text) then
          raise exception 'Use the activity outcome workflow; creator attribution cannot be supplied for another user'
            using errcode='42501';
        end if;
        continue;
      end if;
      if entry=previous then continue; end if;
      foreach key_name in array original_fields loop
        if entry->key_name is distinct from previous->key_name then
          raise exception 'Original activity details are read-only; add a correction instead' using errcode='42501';
        end if;
      end loop;
      old_history := case when jsonb_typeof(previous->'audit_history')='array' then previous->'audit_history' else '[]'::jsonb end;
      new_history := case when jsonb_typeof(entry->'audit_history')='array' then entry->'audit_history' else '[]'::jsonb end;
      history_offset := jsonb_array_length(new_history) - jsonb_array_length(old_history);
      if history_offset < 0 then raise exception 'Activity audit history is append-only' using errcode='42501'; end if;
      for history_index in 0..jsonb_array_length(old_history)-1 loop
        if old_history->history_index is distinct from new_history->(history_offset+history_index) then
          raise exception 'Activity audit history is append-only' using errcode='42501';
        end if;
      end loop;
      if (previous->>'reminder'='true' or lower(previous->>'type')='reminder')
        and nullif(entry->>'transaction_next_attempt','') is distinct from nullif(previous->>'transaction_next_attempt','') then
        raise exception 'Use the next-step controls to change an existing schedule.' using errcode='42501';
      end if;
      if (previous->>'transaction_status' in ('closed','cancelled','completed')
          or previous->>'followup_resolution' is not null or previous->>'reminder_status' in ('completed','cancelled'))
        and ((entry->>'transaction_status',entry->>'transaction_outcome',entry->>'transaction_remarks',entry->>'reminder_status')
        is distinct from (previous->>'transaction_status',previous->>'transaction_outcome',previous->>'transaction_remarks',previous->>'reminder_status')) then
        raise exception 'This outcome is read-only; add a correction instead' using errcode='42501';
      end if;
    end loop;
  end if;

  -- The deletion workflow may clear and later restore the active reminder.
  -- Preserve its identity and edit window rather than treating Restore as creation.
  if current_user='service_role' and pair_changed and updating_items then
    select a.position, a.item, p.item as previous into deletion_change
    from jsonb_array_elements(after_items) with ordinality a(item,position)
    join jsonb_array_elements(prior_items) p(item) on p.item->>'id'=a.item->>'id'
    where a.item->>'delete_request'='true' and a.item->>'target_type'='activity'
      and ((old_open and new.next_action_date is null
        and p.item->>'request_status'='pending' and a.item->>'request_status'='approved'
        and a.item->>'previous_next_action_date'=old.next_action_date::text
        and a.item->>'previous_next_action'=old.next_action)
      or (not old_open and p.item->>'request_status'='approved' and a.item->>'request_status'='restored'
        and p.item->>'previous_next_action_date'=new.next_action_date::text
        and p.item->>'previous_next_action'=new.next_action))
    limit 1;
    if found then
      if old_open then
        new.activities := jsonb_set(after_items, array[(deletion_change.position-1)::text,'previous_activity_schedule'],
          coalesce(old.activity_schedule,'null'::jsonb));
        new.activity_schedule := null;
      else
        new.activity_schedule := nullif(deletion_change.previous->'previous_activity_schedule','null'::jsonb);
      end if;
      return new;
    end if;
  end if;

  if tg_op='INSERT' or (pair_changed and new.activity_schedule is not distinct from old.activity_schedule) then
    new.activity_schedule := app_private.activity_schedule_stamp(new.next_action_date,new.next_action,new.activities);
  end if;
  return new;
end $$;
revoke all on function app_private.guard_activity_schedule() from public, anon, authenticated, service_role;
create trigger guard_activity_schedule before insert or update on public.leads
  for each row execute function app_private.guard_activity_schedule();

-- Only the CRM's server can commit its evaluated schedule and audit event.
-- Compare the current version and assignee so stale edits cannot win a race.
create function public.commit_activity_schedule(p_lead_id uuid,p_version timestamptz,p_patch jsonb,p_event jsonb)
returns jsonb language plpgsql security invoker set search_path=pg_catalog as $$
declare
  v_actor public.profiles%rowtype;
  v_lead public.leads%rowtype;
  v_plan jsonb := p_patch->'activity_schedule';
  v_kind text := p_event->>'kind';
begin
  if current_user <> 'service_role' then raise exception 'CRM server required' using errcode='42501'; end if;
  select * into v_actor from public.profiles where id=(p_event->>'actor_id')::uuid and status='active';
  if not found or coalesce(v_actor.role,'') not in ('admin','salesman') or v_actor.role is distinct from p_event->>'actor_role' then
    raise exception 'Active CRM actor required' using errcode='42501';
  end if;
  select * into v_lead from public.leads
  where id=p_lead_id and updated_at=p_version and (v_actor.role='admin' or assigned_to=v_actor.id)
    and next_action_date is not null and btrim(next_action)<>''
  for update;
  if not found then return null; end if;
  if v_kind is null or v_kind not in ('schedule_edited','rescheduled','reschedule_requested','reschedule_approved','reschedule_rejected')
    or p_event->>'plan_id' is distinct from v_plan->>'id'
    or v_plan->>'id' is distinct from coalesce(v_lead.activity_schedule->>'id','legacy:'||v_lead.id||':'||v_lead.next_action_date)
    or v_plan->>'created_at' is distinct from v_lead.activity_schedule->>'created_at'
    or v_plan->>'original_due_date' is distinct from coalesce(v_lead.activity_schedule->>'original_due_date',v_lead.next_action_date::text)
    or v_plan->>'original_due_time' is distinct from p_event->>'original_due_time'
    or (v_lead.activity_schedule is not null and v_plan->>'original_due_time' is distinct from v_lead.activity_schedule->>'original_due_time')
    or jsonb_typeof(p_patch->'activities') is distinct from 'array' then
    raise exception 'Invalid schedule plan or audit event' using errcode='22023';
  end if;
  if v_actor.role='salesman' and v_kind<>'reschedule_requested' and (
    v_kind not in ('schedule_edited','rescheduled')
    or (v_lead.activity_schedule->>'created_at') is null
    or clock_timestamp()>=(v_lead.activity_schedule->>'created_at')::timestamptz + interval '48 hours'
    or clock_timestamp()>=(v_lead.next_action_date + (v_lead.activity_schedule->>'due_time')::time) at time zone 'Asia/Dubai'
  ) then
    raise exception 'This activity needs a reschedule request.' using errcode='40001';
  end if;
  if v_kind in ('reschedule_requested','reschedule_rejected') and (
    (p_patch->>'next_action_date')::date is distinct from v_lead.next_action_date
    or p_patch->'activities' is distinct from v_lead.activities
  ) then
    raise exception 'A pending or rejected request cannot change the original schedule.' using errcode='22023';
  end if;
  update public.leads set next_action_date=(p_patch->>'next_action_date')::date,
    activities=p_patch->'activities', activity_schedule=p_patch->'activity_schedule'
  where id=p_lead_id
  returning * into v_lead;
  if not found then return null; end if;
  insert into public.activity_schedule_events (id,lead_id,plan_id,kind,recorded_at,actor_id,actor_name,actor_role,
    assignee_id,assignee_name,original_due_date,original_due_time,details)
  values ((p_event->>'id')::uuid,p_lead_id,p_event->>'plan_id',p_event->>'kind',clock_timestamp(),v_actor.id,
    coalesce(nullif(v_actor.full_name,''),'User'),v_actor.role,v_lead.assigned_to,coalesce(nullif(v_lead.assigned_salesman,''),'Unassigned'),
    (p_event->>'original_due_date')::date,p_event->>'original_due_time',
    p_event - array['id','lead_id','plan_id','kind','recorded_at','actor_id','actor_name','actor_role','assignee_id','assignee_name','original_due_date','original_due_time']);
  return to_jsonb(v_lead);
end $$;
revoke all on function public.commit_activity_schedule(uuid,timestamptz,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.commit_activity_schedule(uuid,timestamptz,jsonb,jsonb) to service_role;

-- Keep the existing public outcome RPC compatible with the live app. The
-- existing, reviewed invoker remains private and is called only after the
-- wrapper checks the authenticated actor and locks their eligible lead.
alter function public.resolve_lead_followup(uuid,jsonb) set schema app_private;
revoke all on function app_private.resolve_lead_followup(uuid,jsonb) from public, anon, authenticated, service_role;
create function app_private.resolve_scheduled_activity(p_lead_id uuid,p_input jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare
  v_user public.profiles%rowtype;
  v_before public.leads%rowtype;
  v_after public.leads%rowtype;
  v_result jsonb;
  v_outcome jsonb;
  v_plan jsonb;
  v_due_time text;
begin
  select * into v_user from public.profiles where id=auth.uid() and status='active';
  if not found or coalesce(v_user.role,'') not in ('admin','salesman') then raise exception 'Active Admin or salesman required' using errcode='42501'; end if;
  select * into v_before from public.leads where id=p_lead_id and
    (v_user.role='admin' or assigned_to=v_user.id or (assigned_to is null
      and btrim(coalesce(v_user.full_name,''))<>'' and lower(btrim(assigned_salesman))=lower(btrim(v_user.full_name))))
  for update;
  if not found then raise exception 'Follow-up unavailable' using errcode='42501'; end if;
  if exists (
    select 1 from jsonb_array_elements(v_before.activities) a(item)
    where (item->>'reminder'='true' or lower(item->>'type')='reminder') and item->>'deletion_status'='pending'
      and coalesce(item->>'due_date',item->>'reminder_due_date')=v_before.next_action_date::text
      and lower(btrim(coalesce(item->>'activity_required',item->>'text','')))=lower(btrim(v_before.next_action))
  ) and not exists (select 1 from jsonb_array_elements(v_before.activities) a(item)
    where item->>'id'='followup-'||(p_input->>'request_id') and item->>'followup_resolution' is not null
      and item->>'created_by'=v_user.id::text) then
    raise exception 'This reminder is read-only while deletion is pending' using errcode='42501';
  end if;
  v_result := app_private.resolve_lead_followup(p_lead_id,p_input);
  if v_result->>'duplicate'='true' then return v_result; end if;
  v_outcome := v_result->'activity';
  v_plan := v_before.activity_schedule;
  v_due_time := coalesce(v_plan->>'due_time',
    app_private.activity_schedule_stamp(v_before.next_action_date,v_before.next_action,v_before.activities)->>'due_time','09:00');
  insert into public.activity_schedule_events (lead_id,plan_id,kind,recorded_at,actor_id,actor_name,actor_role,
    assignee_id,assignee_name,original_due_date,original_due_time,details)
  values (v_before.id,coalesce(v_plan->>'id','legacy:'||v_before.id||':'||v_before.next_action_date),
    v_outcome->>'followup_resolution',(v_outcome->>'created_at')::timestamptz,v_user.id,
    coalesce(nullif(v_user.full_name,''),'User'),v_user.role,v_before.assigned_to,coalesce(nullif(v_before.assigned_salesman,''),'Unassigned'),
    coalesce((v_plan->>'original_due_date')::date,v_before.next_action_date),coalesce(v_plan->>'original_due_time',v_due_time),
    jsonb_build_object('before',jsonb_build_object('action',v_before.next_action,'date',v_before.next_action_date,'time',v_due_time),
      'reason',v_outcome->>'transaction_outcome','occurred_at',v_outcome->>'done_at','request_id',v_plan->'request'->>'id'));
  if (v_result->'lead'->>'next_action',v_result->'lead'->>'next_action_date') is not distinct from
     (v_before.next_action,v_before.next_action_date::text) then
    update public.leads set activity_schedule=app_private.activity_schedule_stamp(next_action_date,next_action,activities)
      where id=p_lead_id returning * into v_after;
    v_result := jsonb_set(v_result,'{lead}',to_jsonb(v_after));
  end if;
  return v_result;
end $$;
revoke all on function app_private.resolve_scheduled_activity(uuid,jsonb) from public, anon, service_role;
grant execute on function app_private.resolve_scheduled_activity(uuid,jsonb) to authenticated;
create function public.resolve_lead_followup(p_lead_id uuid,p_input jsonb)
returns jsonb language sql security invoker set search_path=pg_catalog as $$
  select app_private.resolve_scheduled_activity(p_lead_id,p_input)
$$;
revoke all on function public.resolve_lead_followup(uuid,jsonb) from public, anon, service_role;
grant execute on function public.resolve_lead_followup(uuid,jsonb) to authenticated;
