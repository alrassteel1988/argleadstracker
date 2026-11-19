create function private.next_management_working_date(p_at timestamptz)
returns date language sql immutable strict security invoker set search_path = pg_catalog as $$
  select due + case when extract(isodow from due) = 7 then 1 else 0 end
  from (select (p_at at time zone 'Asia/Dubai')::date + 1 as due) dates;
$$;
revoke all on function private.next_management_working_date(timestamptz) from public, anon, authenticated, service_role;

-- Insert-only policy: existing tasks, deadlines, activities and link-replacement protection are unchanged.
create or replace function private.assign_initial_management_task()
returns trigger language plpgsql security definer set search_path = pg_catalog as $$
declare
  actor public.profiles%rowtype;
  rep public.profiles%rowtype;
  task public.management_tasks%rowtype;
  instructions text;
  task_title text;
  assigned_at timestamptz := clock_timestamp();
begin
  if tg_op = 'UPDATE' then
    if new.initial_management_task_id is distinct from old.initial_management_task_id then
      raise exception 'Initial management task link cannot be edited' using errcode = '42501';
    end if;
    return new;
  end if;
  if new.initial_management_task_id is null then return new; end if;
  select * into actor from public.profiles where id = auth.uid() for share;
  if not found or actor.role is distinct from 'admin' or actor.status is distinct from 'active'
    or new.created_by is distinct from actor.id then
    raise exception 'Only an active Admin can assign an initial management task' using errcode = '42501';
  end if;
  select * into rep from public.profiles where id = new.assigned_to for share;
  if not found or rep.role is distinct from 'salesman' or rep.status is distinct from 'active' then
    raise exception 'Choose an active salesman for this next step' using errcode = '22023';
  end if;
  task_title := new.next_action;
  -- Older builds can still insert their original action labels during a coordinated release.
  if task_title in ('To Call', 'To Send Email', 'To Visit') then task_title := 'New Lead Outreach'; end if;
  if task_title is null or task_title not in ('New Lead Outreach', 'Respond to Initial RFQ') then
    raise exception 'Choose New Lead Outreach or Respond to Initial RFQ' using errcode = '22023';
  end if;
  instructions := left(coalesce(nullif(concat_ws(chr(10), nullif(btrim(new.activity_purpose), ''),
    nullif(btrim(new.notes), '')), ''), 'Initial next step assigned by management.'), 4000);
  insert into public.management_tasks
    (id, assignee_id, assignee_name, assigned_by, assigned_by_name, lead_id, lead_name, title, instructions,
      due_date, priority, created_at, updated_at, notified_at)
  values
    (new.initial_management_task_id, rep.id, coalesce(nullif(rep.full_name, ''), 'Salesman'), actor.id,
      coalesce(nullif(actor.full_name, ''), 'Admin'), new.id, new.company_name,
      task_title, instructions, private.next_management_working_date(assigned_at), 'medium', assigned_at, assigned_at, assigned_at)
  returning * into task;
  insert into private.management_task_events (task_id, action, actor_id, actor_name, at, snapshot)
    values (task.id, 'assign', actor.id, task.assigned_by_name, assigned_at, to_jsonb(task));
  update public.leads set assigned_salesman = task.assignee_name, next_action = '', next_action_date = null where id = new.id;
  return new;
end;
$$;
revoke all on function private.assign_initial_management_task() from public, anon, authenticated, service_role;
notify pgrst, 'reload schema';
