alter table public.management_tasks
  drop constraint management_tasks_status_check,
  add constraint management_tasks_status_check check (status in ('not_started','in_progress','completed','cancelled')),
  add column cancel_reason text check (char_length(cancel_reason) between 10 and 4000),
  add column reviewed_at timestamptz,
  add column reviewed_by uuid,
  add check ((status = 'cancelled') = (cancel_reason is not null)),
  add check ((reviewed_at is null and reviewed_by is null) or
    (status = 'completed' and reviewed_at is not null and reviewed_by is not null));

alter table private.management_task_events
  drop constraint management_task_events_action_check,
  add constraint management_task_events_action_check
    check (action in ('assign','edit','remind','progress','reassign','cancel','review'));

alter function private.save_management_task(text,uuid,jsonb) rename to save_management_task_base;
revoke all on function private.save_management_task_base(text,uuid,jsonb) from public, anon, authenticated;

create function private.save_management_task(p_action text, p_id uuid, p_input jsonb)
returns jsonb language plpgsql security definer set search_path = pg_catalog as $$
declare
  actor public.profiles%rowtype;
  rep public.profiles%rowtype;
  task public.management_tasks%rowtype;
  linked public.leads%rowtype;
  lead_key uuid;
  details text;
  original jsonb;
  stamp timestamptz := clock_timestamp();
begin
  select * into actor from public.profiles where id = auth.uid() for share;
  if p_id is null or not found or actor.status is distinct from 'active' or not coalesce(
    (actor.role = 'admin' and p_action in ('assign','edit','remind','reassign','cancel','review'))
    or (actor.role = 'salesman' and p_action in ('progress','seen')), false) then
    raise exception 'This task action is not available to your role' using errcode = '42501';
  end if;

  if p_action = 'assign' then
    perform pg_advisory_xact_lock(hashtextextended('management-task:' || p_id::text, 0));
    select * into task from public.management_tasks where id = p_id;
    if found then
      select e.snapshot into original from private.management_task_events e
        where e.task_id = p_id and e.action = 'assign' and e.actor_id = actor.id;
      if original is null or not (
        (original->>'assignee_id') is not distinct from (p_input->>'assignee_id') and
        (original->>'lead_id') is not distinct from nullif(p_input->>'lead_id', '') and
        (original->>'title') is not distinct from regexp_replace(coalesce(p_input->>'title', ''), '^[[:space:]]+|[[:space:]]+$', '', 'g') and
        (original->>'instructions') is not distinct from regexp_replace(coalesce(p_input->>'instructions', ''), '^[[:space:]]+|[[:space:]]+$', '', 'g') and
        (original->>'due_date') is not distinct from (p_input->>'due_date') and
        (original->>'priority') is not distinct from (p_input->>'priority')
      ) then raise exception 'This task request has already been used' using errcode = '40001'; end if;
      return to_jsonb(task);
    end if;
    lead_key := nullif(p_input->>'lead_id', '')::uuid;
    if lead_key is not null then
      select * into rep from public.profiles where id = nullif(p_input->>'assignee_id', '')::uuid
        and role = 'salesman' and status = 'active' for share;
      if not found then raise exception 'Choose an active salesman' using errcode = '22023'; end if;
      select * into linked from public.leads where id = lead_key for update;
      if not found then raise exception 'Linked lead not found' using errcode = 'P0002'; end if;
      if linked.assigned_to is null and lower(btrim(coalesce(linked.assigned_salesman, ''))) in ('', 'unassigned') then
        update public.leads set assigned_to = rep.id, assigned_salesman = rep.full_name where id = lead_key;
      elsif linked.assigned_to is distinct from rep.id then
        raise exception 'Reassign the lead first before assigning the task to another salesman' using errcode = '40001';
      end if;
    end if;
    return private.save_management_task_base(p_action, p_id, p_input);
  end if;

  select * into task from public.management_tasks where id = p_id
    and (actor.role = 'admin' or assignee_id = actor.id) for update;
  if not found then raise exception 'Task not found' using errcode = 'P0002'; end if;
  if actor.role = 'salesman' and task.lead_id is not null then
    perform 1 from public.leads where id = task.lead_id and assigned_to = actor.id for share;
    if not found then raise exception 'Task not found' using errcode = 'P0002'; end if;
  end if;
  if p_action not in ('reassign','cancel','review') then
    if task.status = 'cancelled' and p_action <> 'seen' then
      raise exception 'Cancelled tasks are read-only' using errcode = '40001';
    end if;
    return private.save_management_task_base(p_action, p_id, p_input);
  end if;
  if task.version is distinct from nullif(p_input->>'expected_version', '')::integer then
    raise exception 'This task changed. Refresh before trying again' using errcode = '40001';
  end if;
  if p_action = 'review' then
    if task.status <> 'completed' then raise exception 'Only completed remarks can be reviewed' using errcode = '22023'; end if;
    if task.reviewed_at is not null then return to_jsonb(task); end if;
    update public.management_tasks set reviewed_at = stamp, reviewed_by = actor.id,
      updated_at = stamp, version = version + 1 where id = p_id returning * into task;
  else
    if task.status not in ('not_started','in_progress') then raise exception 'This task is no longer open' using errcode = '40001'; end if;
    details := regexp_replace(coalesce(p_input->>'reason', ''), '^[[:space:]]+|[[:space:]]+$', '', 'g');
    if char_length(details) not between 10 and 4000 then
      raise exception 'Enter at least 10 characters' using errcode = '22023';
    end if;
    if p_action = 'cancel' then
      update public.management_tasks set status = 'cancelled', cancel_reason = details, updated_at = stamp,
        version = version + 1, seen_at = null, notified_at = stamp where id = p_id returning * into task;
    else
      select * into rep from public.profiles where id = nullif(p_input->>'assignee_id', '')::uuid
        and role = 'salesman' and status = 'active' for share;
      if not found or rep.id = task.assignee_id then raise exception 'Choose a different active salesman' using errcode = '22023'; end if;
      if task.lead_id is not null then
        perform 1 from public.leads where id = task.lead_id and assigned_to = rep.id for share;
        if not found then raise exception 'Reassign the lead first before reassigning this task' using errcode = '40001'; end if;
      end if;
      update public.management_tasks set assignee_id = rep.id, assignee_name = coalesce(nullif(rep.full_name, ''), 'Salesman'),
        status = 'not_started', progress_at = null, remarks = '', notified_at = stamp, seen_at = null,
        updated_at = stamp, version = version + 1 where id = p_id returning * into task;
    end if;
  end if;
  insert into private.management_task_events(task_id, action, actor_id, actor_name, at, snapshot)
    values (p_id, p_action, actor.id, coalesce(nullif(actor.full_name, ''), 'Admin'), stamp,
      to_jsonb(task) || jsonb_build_object('reason', details));
  return to_jsonb(task);
end;
$$;
revoke all on function private.save_management_task(text,uuid,jsonb) from public, anon, authenticated;
grant execute on function private.save_management_task(text,uuid,jsonb) to authenticated;

create or replace function public.save_management_task(p_action text, p_id uuid, p_input jsonb)
returns jsonb language sql security invoker set search_path = pg_catalog as $$
  select private.save_management_task(p_action, p_id, p_input);
$$;

create function private.management_task_history(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = pg_catalog as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and status = 'active' and role = 'admin') then
    raise exception 'Task history is restricted to admins' using errcode = '42501';
  end if;
  if not exists (select 1 from public.management_tasks where id = p_id) then
    raise exception 'Task not found' using errcode = 'P0002';
  end if;
  return coalesce((select jsonb_agg(to_jsonb(e) order by e.at, e.id)
    from private.management_task_events e where e.task_id = p_id), '[]'::jsonb);
end;
$$;
revoke all on function private.management_task_history(uuid) from public, anon, authenticated;
grant execute on function private.management_task_history(uuid) to authenticated;
create function public.management_task_history(p_id uuid)
returns jsonb language sql stable security invoker set search_path = pg_catalog as $$
  select private.management_task_history(p_id);
$$;
revoke all on function public.management_task_history(uuid) from public, anon, authenticated;
grant execute on function public.management_task_history(uuid) to authenticated;
notify pgrst, 'reload schema';
