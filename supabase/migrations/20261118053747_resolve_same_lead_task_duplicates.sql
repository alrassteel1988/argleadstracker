alter table public.management_tasks
  add column duplicate_of_task_id uuid references public.management_tasks(id),
  add constraint management_task_duplicate_link check (
    duplicate_of_task_id is null or (removed_at is not null and duplicate_of_task_id <> id)
  );

do $$
declare prior_actions text;
begin
  select pg_get_expr(conbin, conrelid) into strict prior_actions from pg_constraint
    where conrelid = 'private.management_task_events'::regclass
      and conname = 'management_task_events_action_check' and contype = 'c';
  alter table private.management_task_events drop constraint management_task_events_action_check;
  execute format('alter table private.management_task_events add constraint management_task_events_action_check check ((%s) or action = %L)',
    prior_actions, 'resolve_duplicate');
end;
$$;

-- Only an audit event written by the resolver in this transaction can authorize a link change.
create function private.guard_initial_management_task_replacement()
returns trigger language plpgsql security definer set search_path = pg_catalog as $$
begin
  if new.initial_management_task_id is distinct from old.initial_management_task_id then
    if not exists (select 1 from public.profiles
      where id = auth.uid() and role = 'admin' and status = 'active')
      or not exists (select 1 from private.management_task_events e
        where e.task_id = old.initial_management_task_id and e.action = 'resolve_duplicate'
          and e.actor_id = auth.uid()
          and e.snapshot->>'resolution_xid' = txid_current()::text
          and e.snapshot->>'lead_id' = new.id::text
          and e.snapshot->>'previous_initial_task_id' = old.initial_management_task_id::text
          and e.snapshot->>'retained_task_id' = new.initial_management_task_id::text) then
      raise exception 'Initial management task link cannot be edited' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.guard_initial_management_task_replacement() from public, anon, authenticated, service_role;
drop trigger protect_initial_management_task_link on public.leads;
create trigger protect_initial_management_task_link before update of initial_management_task_id on public.leads
  for each row execute function private.guard_initial_management_task_replacement();

create function private.resolve_management_task_duplicate(
  p_id uuid, p_expected_version integer, p_retained_id uuid, p_retained_version integer, p_reason text, p_confirmed boolean
)
returns jsonb language plpgsql security definer set search_path = pg_catalog as $$
declare
  actor public.profiles%rowtype;
  source public.management_tasks%rowtype;
  retained public.management_tasks%rowtype;
  linked public.leads%rowtype;
  reason_text text := regexp_replace(coalesce(p_reason, ''), '^[[:space:]]+|[[:space:]]+$', '', 'g');
  resolved_time timestamptz;
begin
  select * into actor from public.profiles where id = auth.uid() for share;
  if not found or actor.status is distinct from 'active' or actor.role is distinct from 'admin' then
    raise exception 'This task action is not available to your role' using errcode = '42501';
  end if;
  if p_confirmed is distinct from true or p_retained_id is null or p_id = p_retained_id then
    raise exception 'Choose a retained task and confirm the duplicate' using errcode = '22023';
  end if;
  if char_length(reason_text) not between 10 and 4000 then
    raise exception 'Enter a removal reason of 10 to 4000 characters' using errcode = '22023';
  end if;

  -- Consistent task lock order prevents two competing resolutions from locking opposite pairs.
  perform 1 from public.management_tasks where id in (p_id, p_retained_id) order by id for update;
  select * into source from public.management_tasks where id = p_id;
  if not found then raise exception 'Task not found' using errcode = 'P0002'; end if;
  select * into retained from public.management_tasks where id = p_retained_id;
  if not found then
    raise exception 'Choose an open retained task on the same lead and salesman. Cross-lead cleanup needs separate review.' using errcode = '40001';
  end if;
  if source.version is distinct from p_expected_version or retained.version is distinct from p_retained_version then
    raise exception 'This task changed. Refresh before trying again' using errcode = '40001';
  end if;
  if source.removed_at is not null then raise exception 'Removed tasks are read-only' using errcode = '40001'; end if;
  if source.status not in ('not_started','in_progress') then raise exception 'Only open tasks can be removed' using errcode = '40001'; end if;
  if retained.id = source.id or retained.lead_id is distinct from source.lead_id
    or retained.assignee_id is distinct from source.assignee_id or retained.removed_at is not null
    or retained.status not in ('not_started','in_progress') then
    raise exception 'Choose an open retained task on the same lead and salesman. Cross-lead cleanup needs separate review.' using errcode = '40001';
  end if;
  select * into linked from public.leads where id = source.lead_id for update;
  if not found or linked.initial_management_task_id is distinct from source.id then
    raise exception 'Choose the current initial task to resolve' using errcode = '40001';
  end if;
  perform 1 from public.profiles where id = source.assignee_id and role = 'salesman' and status = 'active' for share;
  if not found or linked.assigned_to is distinct from source.assignee_id then
    raise exception 'The salesman no longer has access to this task' using errcode = '40001';
  end if;

  resolved_time := clock_timestamp();
  update public.management_tasks set removed_at = resolved_time, removed_by = actor.id,
    removal_reason = reason_text, duplicate_of_task_id = retained.id, updated_at = resolved_time, version = version + 1
    where id = source.id returning * into source;
  insert into private.management_task_events (task_id, action, actor_id, actor_name, at, snapshot)
    values (source.id, 'resolve_duplicate', actor.id, coalesce(nullif(actor.full_name, ''), 'Admin'), resolved_time,
      to_jsonb(source) || jsonb_build_object('previous_initial_task_id', source.id, 'retained_task_id', retained.id,
        'retained_version', retained.version, 'resolution_xid', txid_current()::text));
  update public.leads set initial_management_task_id = retained.id, updated_at = resolved_time
    where id = linked.id returning * into linked;
  return to_jsonb(source) || jsonb_build_object('resolved_lead', jsonb_build_object(
    'id', linked.id, 'initial_management_task_id', linked.initial_management_task_id, 'updated_at', linked.updated_at));
end;
$$;
revoke all on function private.resolve_management_task_duplicate(uuid,integer,uuid,integer,text,boolean)
  from public, anon, authenticated;
grant execute on function private.resolve_management_task_duplicate(uuid,integer,uuid,integer,text,boolean) to authenticated;

create function public.resolve_management_task_duplicate(
  p_id uuid, p_expected_version integer, p_retained_id uuid, p_retained_version integer, p_reason text, p_confirmed boolean
)
returns jsonb language sql security invoker set search_path = pg_catalog as $$
  select private.resolve_management_task_duplicate(p_id,p_expected_version,p_retained_id,p_retained_version,p_reason,p_confirmed);
$$;
revoke all on function public.resolve_management_task_duplicate(uuid,integer,uuid,integer,text,boolean)
  from public, anon, authenticated;
grant execute on function public.resolve_management_task_duplicate(uuid,integer,uuid,integer,text,boolean) to authenticated;
notify pgrst, 'reload schema';
