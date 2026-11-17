alter table public.management_tasks
  add column removed_at timestamptz,
  add column removed_by uuid,
  add column removal_reason text,
  add constraint management_tasks_removal_record check (
    (removed_at is null and removed_by is null and removal_reason is null)
    or (removed_at is not null and removed_by is not null and removal_reason is not null
      and char_length(removal_reason) between 10 and 4000 and status in ('not_started','in_progress'))
  );

-- Some installations already have newer task actions. Keep their audit history valid.
do $$
declare
  prior_actions text;
begin
  select pg_get_expr(conbin, conrelid) into strict prior_actions from pg_constraint
  where conrelid = 'private.management_task_events'::regclass and conname = 'management_task_events_action_check' and contype = 'c';
  alter table private.management_task_events drop constraint management_task_events_action_check;
  execute format('alter table private.management_task_events add constraint management_task_events_action_check check ((%s) or action = %L)', prior_actions, 'remove');
end;
$$;

create function private.can_read_removed_management_tasks()
returns boolean language sql stable security definer set search_path = pg_catalog as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and status = 'active');
$$;
revoke all on function private.can_read_removed_management_tasks() from public, anon, authenticated;
grant execute on function private.can_read_removed_management_tasks() to authenticated;
create policy management_task_hide_removed on public.management_tasks as restrictive for select to authenticated
  using (removed_at is null or (select private.can_read_removed_management_tasks()));

-- Keep existing write paths from editing, reminding, or progressing a removed task.
create function private.guard_removed_management_task()
returns trigger language plpgsql set search_path = pg_catalog as $$
begin
  raise exception 'Removed tasks are read-only' using errcode = '40001';
end;
$$;
revoke all on function private.guard_removed_management_task() from public, anon, authenticated;
create trigger guard_removed_management_task before update on public.management_tasks
  for each row when (old.removed_at is not null) execute function private.guard_removed_management_task();

create function private.remove_management_task(p_id uuid, p_expected_version integer, p_reason text)
returns jsonb language plpgsql security definer set search_path = pg_catalog as $$
declare
  actor public.profiles%rowtype;
  task public.management_tasks%rowtype;
  reason_text text := regexp_replace(coalesce(p_reason, ''), '^[[:space:]]+|[[:space:]]+$', '', 'g');
  removed_time timestamptz;
begin
  select * into actor from public.profiles where id = auth.uid() for share;
  if not found or actor.status is distinct from 'active' or actor.role is distinct from 'admin' then
    raise exception 'This task action is not available to your role' using errcode = '42501';
  end if;
  if char_length(reason_text) not between 10 and 4000 then
    raise exception 'Enter a removal reason of 10 to 4000 characters' using errcode = '22023';
  end if;
  select * into task from public.management_tasks where id = p_id for update;
  if not found then raise exception 'Task not found' using errcode = 'P0002'; end if;
  if task.version is distinct from p_expected_version then
    raise exception 'This task changed. Refresh before trying again' using errcode = '40001';
  end if;
  if task.removed_at is not null then raise exception 'Removed tasks are read-only' using errcode = '40001'; end if;
  if task.status = 'completed' then raise exception 'Completed tasks are read-only' using errcode = '40001'; end if;
  if task.status not in ('not_started','in_progress') then raise exception 'Only open tasks can be removed' using errcode = '40001'; end if;
  if exists(select 1 from public.leads where initial_management_task_id = task.id) then
    raise exception 'The original task linked as a lead next step cannot be removed' using errcode = '40001';
  end if;

  removed_time := clock_timestamp();
  update public.management_tasks set removed_at = removed_time, removed_by = actor.id, removal_reason = reason_text,
    updated_at = removed_time, version = version + 1 where id = p_id returning * into task;
  insert into private.management_task_events (task_id, action, actor_id, actor_name, at, snapshot)
    values (task.id, 'remove', actor.id, coalesce(nullif(actor.full_name, ''), 'Admin'), removed_time, to_jsonb(task));
  return to_jsonb(task);
end;
$$;
revoke all on function private.remove_management_task(uuid,integer,text) from public, anon, authenticated;
grant execute on function private.remove_management_task(uuid,integer,text) to authenticated;

create function public.remove_management_task(p_id uuid, p_expected_version integer, p_reason text)
returns jsonb language sql security invoker set search_path = pg_catalog as $$
  select private.remove_management_task(p_id,p_expected_version,p_reason);
$$;
revoke all on function public.remove_management_task(uuid,integer,text) from public, anon, authenticated;
grant execute on function public.remove_management_task(uuid,integer,text) to authenticated;
notify pgrst, 'reload schema';
