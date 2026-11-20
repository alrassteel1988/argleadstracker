begin;

alter table public.management_task_remarks drop constraint management_task_remarks_type_check;
alter table public.management_task_remarks add constraint management_task_remarks_type_check
  check(type in ('started','progress_update','completion','additional_remark','management_note','follow_up_plan'));
alter table public.management_task_remarks add column request_id uuid, add column activity_id text,
  add column next_action_plan text, add column next_action_date date;
alter table public.management_task_remarks add constraint task_conversation_link_check check (
  (type='follow_up_plan' and activity_id is not null and request_id is not null
    and next_action_plan in ('To Call','To Send Email','To Visit') and next_action_date is not null)
  or (type<>'follow_up_plan' and activity_id is null and next_action_plan is null and next_action_date is null));
create unique index management_task_conversation_request on public.management_task_remarks(task_id,author_id,request_id) where request_id is not null;

-- Recipient access alone must not expose a note after the task is removed or transferred.
create policy management_task_note_visibility on public.notifications as restrictive for select to authenticated
  using(type<>'management_task_note' or exists(select 1 from public.management_tasks t where t.id::text=payload->>'task_id'));

create function private.record_management_task_conversation(p_action text,p_id uuid,p_input jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare actor public.profiles; assignee public.profiles; task public.management_tasks; lead public.leads;
  previous public.management_task_remarks; entry_id uuid:=gen_random_uuid(); request_key uuid;
  at_time timestamptz:=clock_timestamp(); entry_text text; entry_type text; actor_name text;
  plan text; due date; activity jsonb; response jsonb; expected integer;
begin
  select * into actor from public.profiles where id=auth.uid() for share;
  if not found or actor.status is distinct from 'active' or p_action not in ('note','followup') or p_action is null
    or actor.role is distinct from (case when p_action='note' then 'admin' else 'salesman' end) then
    raise exception 'This task action is not available to your role' using errcode='42501'; end if;
  entry_text:=regexp_replace(coalesce(p_input->>'text',''),'^[[:space:]]+|[[:space:]]+$','','g');
  if char_length(entry_text) not between 1 and 4000 then raise exception 'Enter a note of 1 to 4000 characters' using errcode='22023'; end if;
  if coalesce(p_input->>'request_id','') !~* '^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$'
    or coalesce(p_input->>'expected_version','') !~ '^[1-9][0-9]{0,8}$' then
    raise exception 'A valid task version and request ID are required' using errcode='22023'; end if;
  request_key:=(p_input->>'request_id')::uuid; expected:=(p_input->>'expected_version')::integer;
  if p_action='followup' then
    plan:=p_input->>'next_action_plan';
    if coalesce(plan,'') not in ('To Call','To Send Email','To Visit') or coalesce(p_input->>'next_action_date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
      raise exception 'Choose a follow-up action and date' using errcode='22023'; end if;
    begin due:=(p_input->>'next_action_date')::date;
    exception when datetime_field_overflow or invalid_datetime_format then raise exception 'Choose a valid follow-up date' using errcode='22023'; end;
  end if;
  select * into task from public.management_tasks where id=p_id for update;
  if not found or (actor.role='salesman' and task.assignee_id<>actor.id) then raise exception 'Task not found' using errcode='P0002'; end if;
  if task.removed_at is not null or task.status not in ('not_started','in_progress','completed') then
    raise exception 'This task changed. Refresh before trying again' using errcode='40001'; end if;
  select * into assignee from public.profiles where id=task.assignee_id for share;
  if not found or assignee.status is distinct from 'active' or assignee.role is distinct from 'salesman' then
    raise exception 'The salesman no longer has access to this task' using errcode='40001'; end if;
  if task.lead_id is not null then
    select * into lead from public.leads where id=task.lead_id and assigned_to=task.assignee_id
      and coalesce(to_jsonb(leads)->>'is_archived','false')<>'true' for update;
    if not found then raise exception 'Task not found' using errcode='P0002'; end if;
  end if;
  if p_action='followup' and (task.lead_id is null or task.status<>'completed') then
    raise exception 'Choose a completed task with a linked lead to plan a follow-up' using errcode='22023'; end if;
  entry_type:=case when p_action='note' then 'management_note' else 'follow_up_plan' end;
  select * into previous from public.management_task_remarks where task_id=p_id and author_id=actor.id and request_id=request_key;
  if found then
    if previous.type<>entry_type or previous.text<>entry_text or previous.next_action_plan is distinct from plan or previous.next_action_date is distinct from due then
      raise exception 'This task request has already been used' using errcode='40001'; end if;
    response:=to_jsonb(task);
    if p_action='followup' then response:=response||jsonb_build_object('followup_lead',jsonb_build_object('id',lead.id,'activities',lead.activities,'updated_at',lead.updated_at)); end if;
    return response;
  end if;
  if task.version<>expected then raise exception 'This task changed. Refresh before trying again' using errcode='40001'; end if;
  if p_action='followup' and (due<(at_time at time zone 'Asia/Dubai')::date or not isfinite(due)) then
    raise exception 'Choose a follow-up date of today or later' using errcode='22023'; end if;
  actor_name:=coalesce(nullif(btrim(actor.full_name),''),nullif(auth.jwt()->>'email',''),'CRM user');
  if p_action='followup' then
    if jsonb_typeof(coalesce(lead.activities,'[]'::jsonb))<>'array' then raise exception 'This task changed. Refresh before trying again' using errcode='40001'; end if;
    activity:=jsonb_build_object('id','task-followup-'||entry_id::text,'type','Reminder','reminder',true,
      'text',entry_text,'activity_required',entry_text,'next_action_plan',plan,'next_action_date',due,'due_date',due,
      'management_task_id',p_id,'task_remark_id',entry_id,'at',at_time,'created_at',at_time,'updated_at',at_time,'version',1,
      'created_by',actor.id,'created_by_name',actor_name,'created_by_role',actor.role,'transaction_status','pending',
      'audit_history',jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'action','activity_created','actor_id',actor.id,'actor_name',actor_name,'at',at_time)));
    update public.leads set activities=coalesce(activities,'[]'::jsonb)||jsonb_build_array(activity),updated_at=at_time where id=lead.id;
    select * into lead from public.leads where id=lead.id;
  end if;
  update public.management_tasks set version=version+1,updated_at=at_time where id=p_id returning * into task;
  insert into public.management_task_remarks(id,task_id,author_id,author_name,type,text,created_at,task_version,request_id,activity_id,next_action_plan,next_action_date)
    values(entry_id,p_id,actor.id,actor_name,entry_type,entry_text,at_time,task.version,request_key,activity->>'id',plan,due);
  insert into private.management_task_events(task_id,action,actor_id,actor_name,at,snapshot)
    values(p_id,'remark',actor.id,actor_name,at_time,to_jsonb(task)||jsonb_build_object('remark_id',entry_id,'conversation_type',entry_type));
  insert into public.notifications(recipient_uid,lead_id,type,title,message,payload,created_at)
    select p.id,task.lead_id,case when p_action='note' then 'management_task_note' else 'management_task_remark' end,
      case when p_action='note' then 'Management task note' else 'Task follow-up planned' end,
      actor_name||case when p_action='note' then ' added a management note to: ' else ' planned a follow-up for: ' end||task.title,
      jsonb_build_object('task_id',p_id,'remark_id',entry_id),at_time from public.profiles p
      where p.status='active' and ((p_action='note' and p.id=task.assignee_id) or (p_action='followup' and p.role='admin'));
  response:=to_jsonb(task);
  if p_action='followup' then response:=response||jsonb_build_object('followup_lead',jsonb_build_object('id',lead.id,'activities',lead.activities,'updated_at',lead.updated_at)); end if;
  return response;
end $$;
revoke all on function private.record_management_task_conversation(text,uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function private.record_management_task_conversation(text,uuid,jsonb) to authenticated;
create function public.record_management_task_conversation(p_action text,p_id uuid,p_input jsonb) returns jsonb
language sql security invoker set search_path=pg_catalog as $$select private.record_management_task_conversation(p_action,p_id,p_input)$$;
revoke all on function public.record_management_task_conversation(text,uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.record_management_task_conversation(text,uuid,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
