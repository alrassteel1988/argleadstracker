begin;
lock table public.management_tasks, private.management_task_events in share row exclusive mode;
create table public.management_task_remarks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.management_tasks(id),
  author_id uuid,
  author_name text not null,
  type text not null check(type in ('started','progress_update','completion','additional_remark')),
  text text not null check(char_length(text)<=4000),
  created_at timestamptz not null,
  task_version integer,
  source_key text unique
);
create index management_task_remarks_timeline on public.management_task_remarks(task_id,created_at,task_version,id);
alter table public.management_task_remarks enable row level security;
revoke all on public.management_task_remarks from public,anon,authenticated,service_role;
grant select on public.management_task_remarks to authenticated;
create policy management_task_remark_read on public.management_task_remarks for select to authenticated
  using(exists(select 1 from public.management_tasks t where t.id=task_id));

-- Recover every original progress snapshot, including overwritten remarks.
with ordered as (
  select e.*,lag(snapshot->>'status') over(partition by task_id order by (snapshot->>'version')::integer,at,id) previous_status
  from private.management_task_events e
)
insert into public.management_task_remarks(id,task_id,author_id,author_name,type,text,created_at,task_version,source_key)
select id,task_id,actor_id,actor_name,
  case when snapshot->>'status'='completed' then 'completion'
    when snapshot->>'status'='in_progress' and previous_status is distinct from 'in_progress' then 'started'
    else 'progress_update' end,
  coalesce(snapshot->>'remarks',''),at,(snapshot->>'version')::integer,'event:'||id::text
from ordered where action='progress';

-- Preserve a latest legacy value that has no matching audit snapshot. Do not invent its author.
insert into public.management_task_remarks(task_id,author_id,author_name,type,text,created_at,task_version,source_key)
select t.id,null,'Not recorded',case when t.status='completed' then 'completion' else 'progress_update' end,
  t.remarks,coalesce(t.progress_at,t.completed_at,t.updated_at,t.created_at),t.version,'legacy:'||t.id::text
from public.management_tasks t where t.remarks<>'' and not exists(
  select 1 from public.management_task_remarks r where r.task_id=t.id and r.text=t.remarks
    and r.created_at=coalesce(t.progress_at,t.completed_at,t.updated_at,t.created_at));

create function private.guard_management_task_remark_history() returns trigger
language plpgsql set search_path=pg_catalog as $$
begin raise exception 'Task remark history is append-only.' using errcode='42501'; end $$;
revoke all on function private.guard_management_task_remark_history() from public,anon,authenticated,service_role;
create trigger immutable_management_task_remarks before update or delete on public.management_task_remarks
for each row execute function private.guard_management_task_remark_history();

create function private.capture_management_task_remark() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
declare previous_status text;
begin
  select snapshot->>'status' into previous_status from private.management_task_events
    where task_id=new.task_id and id<>new.id order by (snapshot->>'version')::integer desc,at desc,id desc limit 1;
  insert into public.management_task_remarks(id,task_id,author_id,author_name,type,text,created_at,task_version,source_key)
  values(new.id,new.task_id,new.actor_id,new.actor_name,
    case when new.snapshot->>'status'='completed' then 'completion'
      when new.snapshot->>'status'='in_progress' and previous_status is distinct from 'in_progress' then 'started'
      else 'progress_update' end,
    coalesce(new.snapshot->>'remarks',''),new.at,(new.snapshot->>'version')::integer,'event:'||new.id::text);
  return new;
end $$;
revoke all on function private.capture_management_task_remark() from public,anon,authenticated,service_role;
create trigger management_task_remark_capture after insert on private.management_task_events
for each row when(new.action='progress') execute function private.capture_management_task_remark();

do $$ declare prior_actions text; begin
  select pg_get_expr(conbin,conrelid) into strict prior_actions from pg_constraint
    where conrelid='private.management_task_events'::regclass and conname='management_task_events_action_check';
  alter table private.management_task_events drop constraint management_task_events_action_check;
  execute format('alter table private.management_task_events add constraint management_task_events_action_check check ((%s) or action=%L)',prior_actions,'remark');
end $$;

create function private.append_management_task_remark(p_id uuid,p_expected_version integer,p_text text) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare actor public.profiles; task public.management_tasks; entry_id uuid:=gen_random_uuid(); at_time timestamptz:=clock_timestamp();
  remark_text text:=regexp_replace(coalesce(p_text,''),'^[[:space:]]+|[[:space:]]+$','','g');
begin
  select * into actor from public.profiles where id=auth.uid() for share;
  if not found or actor.status is distinct from 'active' or actor.role is distinct from 'salesman' then
    raise exception 'This task action is not available to your role' using errcode='42501'; end if;
  if char_length(remark_text) not between 1 and 4000 then
    raise exception 'Enter an additional remark of 1 to 4000 characters' using errcode='22023'; end if;
  select * into task from public.management_tasks where id=p_id and assignee_id=actor.id for update;
  if not found or task.removed_at is not null then raise exception 'Task not found' using errcode='P0002'; end if;
  if task.lead_id is not null then
    perform 1 from public.leads l where l.id=task.lead_id and l.assigned_to=actor.id
      and coalesce(to_jsonb(l)->>'is_archived','false')<>'true' for share;
    if not found then raise exception 'Task not found' using errcode='P0002'; end if;
  end if;
  if task.version is distinct from p_expected_version then
    raise exception 'This task changed. Refresh before trying again' using errcode='40001'; end if;
  if task.status<>'completed' then raise exception 'Choose a completed task to add an additional remark' using errcode='22023'; end if;
  update public.management_tasks set version=version+1,updated_at=at_time where id=p_id returning * into task;
  insert into public.management_task_remarks(id,task_id,author_id,author_name,type,text,created_at,task_version)
    values(entry_id,p_id,actor.id,coalesce(nullif(actor.full_name,''),'Salesman'),'additional_remark',remark_text,at_time,task.version);
  insert into private.management_task_events(task_id,action,actor_id,actor_name,at,snapshot)
    values(p_id,'remark',actor.id,coalesce(nullif(actor.full_name,''),'Salesman'),at_time,to_jsonb(task)||jsonb_build_object('remark_id',entry_id));
  insert into public.notifications(recipient_uid,lead_id,type,title,message,payload,created_at)
    select p.id,null,'management_task_remark','Additional task remark',
      coalesce(nullif(actor.full_name,''),'Salesman')||' added an additional remark to completed task: '||task.title,
      jsonb_build_object('task_id',p_id,'remark_id',entry_id),at_time from public.profiles p where p.role='admin' and p.status='active';
  return to_jsonb(task);
end $$;
revoke all on function private.append_management_task_remark(uuid,integer,text) from public,anon,authenticated,service_role;
grant execute on function private.append_management_task_remark(uuid,integer,text) to authenticated;
create function public.append_management_task_remark(p_id uuid,p_expected_version integer,p_text text) returns jsonb
language sql security invoker set search_path=pg_catalog as $$select private.append_management_task_remark(p_id,p_expected_version,p_text)$$;
revoke all on function public.append_management_task_remark(uuid,integer,text) from public,anon,authenticated,service_role;
grant execute on function public.append_management_task_remark(uuid,integer,text) to authenticated;
notify pgrst,'reload schema';
commit;
