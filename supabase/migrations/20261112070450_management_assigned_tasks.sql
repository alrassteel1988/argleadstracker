-- Management tasks are independent of lead reminders and weekly-report submissions.
create table public.management_tasks (
  id uuid primary key,
  assignee_id uuid not null,
  assignee_name text not null,
  assigned_by uuid not null,
  assigned_by_name text not null,
  lead_id uuid,
  lead_name text not null default '',
  title text not null check (char_length(title) between 1 and 200),
  instructions text not null check (char_length(instructions) between 1 and 4000),
  due_date date not null check (isfinite(due_date)),
  priority text not null check (priority in ('high','medium','low')),
  status text not null default 'not_started' check (status in ('not_started','in_progress','completed')),
  remarks text not null default '' check (char_length(remarks) <= 4000),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  progress_at timestamptz,
  completed_at timestamptz,
  notified_at timestamptz not null default now(),
  seen_at timestamptz,
  check ((status = 'completed') = (completed_at is not null)),
  check (status <> 'completed' or char_length(remarks) >= 10)
);
create index management_tasks_assignee_due on public.management_tasks(assignee_id, due_date);
create table private.management_task_events (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.management_tasks(id),
  action text not null check (action in ('assign','edit','remind','progress')),
  actor_id uuid not null,
  actor_name text not null,
  at timestamptz not null default now(),
  snapshot jsonb not null
);
create index management_task_events_history on private.management_task_events(task_id, at);
revoke all on private.management_task_events from public, anon, authenticated;
alter table private.management_task_events enable row level security;

-- Profiles and ownership are resolved from database state, never from the request body.
create function private.can_read_management_task(p_assignee uuid, p_lead uuid)
returns boolean language sql stable security definer set search_path = pg_catalog as $$
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active'
    and (p.role = 'admin' or (p.role = 'salesman' and p.id = p_assignee
      and (p_lead is null or exists (select 1 from public.leads l where l.id = p_lead and l.assigned_to = p.id))))
  );
$$;
revoke all on function private.can_read_management_task(uuid,uuid) from public, anon, authenticated;
grant execute on function private.can_read_management_task(uuid,uuid) to authenticated;

alter table public.management_tasks enable row level security;
revoke all on public.management_tasks from public, anon, authenticated;
grant select on public.management_tasks to authenticated;
create policy management_task_read on public.management_tasks for select to authenticated
  using (private.can_read_management_task(assignee_id, lead_id));

-- The private writer is the only authenticated mutation path, and records changes in the same transaction.
create function private.save_management_task(p_action text, p_id uuid, p_input jsonb)
returns jsonb language plpgsql security definer set search_path = pg_catalog as $$
declare
  actor public.profiles%rowtype;
  rep public.profiles%rowtype;
  task public.management_tasks%rowtype;
  linked_name text := '';
  linked_id uuid;
  title_text text;
  instructions_text text;
  due date;
  priority_text text;
  status_text text;
  remarks_text text;
  current_time_at timestamptz := clock_timestamp();
begin
  if auth.uid() is null or p_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into actor from public.profiles where id = auth.uid() for share;
  if not found or actor.status is distinct from 'active' or not coalesce(
      (actor.role = 'admin' and p_action in ('assign','edit','remind'))
      or (actor.role = 'salesman' and p_action in ('progress','seen')), false) then
    raise exception 'This task action is not available to your role' using errcode = '42501';
  end if;

  if p_action in ('assign','edit') then
    title_text := regexp_replace(coalesce(p_input->>'title', ''), '^[[:space:]]+|[[:space:]]+$', '', 'g');
    instructions_text := regexp_replace(coalesce(p_input->>'instructions', ''), '^[[:space:]]+|[[:space:]]+$', '', 'g');
    due := nullif(p_input->>'due_date', '')::date;
    priority_text := coalesce(p_input->>'priority', '');
    if char_length(title_text) not between 1 and 200 or char_length(instructions_text) not between 1 and 4000
      or due is null or not isfinite(due) or (p_action = 'assign' and due < (current_time_at at time zone 'Asia/Dubai')::date)
      or priority_text not in ('high','medium','low') then
      raise exception 'Enter a title, instructions, valid deadline and priority' using errcode = '22023';
    end if;
  end if;

  if p_action = 'assign' then
    select * into rep from public.profiles where id = nullif(p_input->>'assignee_id', '')::uuid for share;
    if not found or rep.role is distinct from 'salesman' or rep.status is distinct from 'active' then
      raise exception 'Choose an active salesman' using errcode = '22023';
    end if;
    linked_id := nullif(p_input->>'lead_id', '')::uuid;
    if linked_id is not null then
      select l.company_name into linked_name from public.leads l where l.id = linked_id and l.assigned_to = rep.id for share;
      if not found then raise exception 'Choose a lead assigned to this salesman' using errcode = '22023'; end if;
    end if;
    insert into public.management_tasks (id, assignee_id, assignee_name, assigned_by, assigned_by_name,
      lead_id, lead_name, title, instructions, due_date, priority, created_at, updated_at, notified_at)
    values (p_id, rep.id, coalesce(nullif(rep.full_name, ''), 'Salesman'), actor.id, coalesce(nullif(actor.full_name, ''), 'Admin'),
      linked_id, coalesce(linked_name, ''), title_text, instructions_text, due, priority_text,
      current_time_at, current_time_at, current_time_at)
    on conflict (id) do nothing returning * into task;
    if not found then
      select * into task from public.management_tasks where id = p_id and assigned_by = actor.id and assignee_id = rep.id;
      if not found then raise exception 'This task request has already been used' using errcode = '40001'; end if;
      return to_jsonb(task);
    end if;
  else
    select * into task from public.management_tasks where id = p_id
      and (actor.role = 'admin' or assignee_id = actor.id) for update;
    if not found then raise exception 'Task not found' using errcode = 'P0002'; end if;
    if actor.role = 'salesman' and task.lead_id is not null then
      perform 1 from public.leads where id = task.lead_id and assigned_to = actor.id for share;
      if not found then raise exception 'Task not found' using errcode = 'P0002'; end if;
    end if;
    if task.version is distinct from nullif(p_input->>'expected_version', '')::integer then
      raise exception 'This task changed. Refresh before trying again' using errcode = '40001';
    end if;
    if p_action = 'seen' then
      update public.management_tasks set seen_at = coalesce(seen_at, current_time_at) where id = p_id returning * into task;
      return to_jsonb(task);
    end if;
    if task.status = 'completed' then raise exception 'Completed tasks are read-only' using errcode = '40001'; end if;
    if p_action in ('edit','remind') then
      perform 1 from public.profiles where id = task.assignee_id and role = 'salesman' and status = 'active' for share;
      if not found then raise exception 'The salesman no longer has access to this task' using errcode = '40001'; end if;
      if task.lead_id is not null then
        perform 1 from public.leads where id = task.lead_id and assigned_to = task.assignee_id for share;
        if not found then raise exception 'The salesman no longer has access to this task' using errcode = '40001'; end if;
      end if;
      if p_action = 'remind' and current_time_at - task.notified_at < interval '1 minute' then
        raise exception 'A task notice was sent recently. Try again in a minute' using errcode = '40001';
      end if;
      update public.management_tasks set title = coalesce(title_text, title), instructions = coalesce(instructions_text, instructions),
        due_date = coalesce(due, due_date), priority = coalesce(priority_text, priority),
        updated_at = current_time_at, notified_at = current_time_at, seen_at = null, version = version + 1
      where id = p_id returning * into task;
    else
      status_text := coalesce(p_input->>'status', '');
      remarks_text := regexp_replace(coalesce(p_input->>'remarks', ''), '^[[:space:]]+|[[:space:]]+$', '', 'g');
      if status_text not in ('not_started','in_progress','completed') or char_length(remarks_text) > 4000
        or (status_text = 'completed' and char_length(remarks_text) < 10) then
        raise exception 'Choose a status and enter at least 10 characters of remarks to complete the task' using errcode = '22023';
      end if;
      update public.management_tasks set status = status_text, remarks = remarks_text, progress_at = current_time_at,
        completed_at = case when status_text = 'completed' then current_time_at end,
        seen_at = current_time_at, updated_at = current_time_at, version = version + 1 where id = p_id returning * into task;
    end if;
  end if;

  insert into private.management_task_events (task_id, action, actor_id, actor_name, at, snapshot)
    values (p_id, p_action, actor.id, coalesce(nullif(actor.full_name, ''), 'User'), current_time_at, to_jsonb(task));
  return to_jsonb(task);
end;
$$;
revoke all on function private.save_management_task(text,uuid,jsonb) from public, anon, authenticated;
grant execute on function private.save_management_task(text,uuid,jsonb) to authenticated;

create function public.save_management_task(p_action text, p_id uuid, p_input jsonb)
returns jsonb language sql security invoker set search_path = pg_catalog as $$
  select private.save_management_task(p_action, p_id, p_input);
$$;
revoke all on function public.save_management_task(text,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.save_management_task(text,uuid,jsonb) to authenticated;
