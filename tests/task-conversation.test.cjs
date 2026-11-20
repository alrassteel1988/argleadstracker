const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { PGlite } = require("@electric-sql/pglite");
const { saveLocalManagementTask, validateManagementTask } = require("../src/services/managementTaskService");
const migration = "20261120104635_management_task_conversation_followup.sql";

test("local task conversation preserves completion, attribution, other plans and idempotency", () => {
  const admin={id:randomUUID(),role:"admin",status:"active",name:"Manager"}, sales={id:randomUUID(),role:"salesman",status:"active",name:"Rep"}, peer={...sales,id:randomUUID()};
  const task={id:randomUUID(),assignee_id:sales.id,lead_id:randomUUID(),status:"completed",version:3,title:"RFQ",instructions:"Original instructions",remarks:"Original completion",completed_at:"2026-11-19T06:00:00Z"};
  const lead={id:task.lead_id,assigned_to:sales.id,activities:[{id:"saved",text:"Preserve verbatim"}],next_action:"To Visit",next_action_date:"2026-12-01"};
  const db={users:[admin,sales,peer],leads:[lead],management_tasks:[task],management_task_events:[]};
  const save=(actor,action,input)=>saveLocalManagementTask(db,actor,action,task.id,validateManagementTask(action,input,"2026-11-20"),"2026-11-20T08:00:00Z");
  const note={request_id:randomUUID(),expected_version:3,text:"Please call about the specification."};
  save(admin,"note",note); save(admin,"note",note);
  assert.equal(task.version,4); assert.equal(db.notifications.length,1); assert.equal(db.notifications[0].recipient_uid,sales.id);
  assert.throws(()=>save(sales,"note",{...note,expected_version:4}),{status:403});
  assert.throws(()=>save(admin,"followup",{...note,expected_version:4,next_action_plan:"To Call",next_action_date:"2026-11-21"}),{status:403});
  const follow={request_id:randomUUID(),expected_version:4,text:"Call procurement for the specification.",next_action_plan:"To Call",next_action_date:"2026-11-21"};
  save(sales,"followup",follow); save(sales,"followup",follow);
  assert.equal(task.status,"completed"); assert.equal(task.completed_at,"2026-11-19T06:00:00Z"); assert.equal(task.remarks,"Original completion"); assert.equal(task.instructions,"Original instructions");
  assert.equal(lead.activities.length,2); assert.deepEqual(lead.activities[0],{id:"saved",text:"Preserve verbatim"});
  assert.equal(lead.next_action,"To Visit"); assert.equal(lead.next_action_date,"2026-12-01");
  assert.equal(lead.activities[1].created_by,sales.id); assert.equal(lead.activities[1].management_task_id,task.id);
  assert.equal(db.management_task_remarks.filter(item=>item.type==="follow_up_plan").length,1);
  assert.equal(db.notifications.filter(item=>item.recipient_uid===admin.id).length,1);
  assert.throws(()=>save(peer,"followup",follow),{status:404});
  assert.throws(()=>save(sales,"followup",{...follow,text:"Different"}),{status:409});
  lead.is_archived=true; assert.throws(()=>save(sales,"followup",follow),{status:404});
  assert.throws(()=>save(admin,"note",{...note,expected_version:5}),{status:409});
  for (const date of ["2026-02-30","2026-11-19",""]) assert.throws(()=>validateManagementTask("followup",{...follow,next_action_date:date},"2026-11-20"),{status:400});
});

test("SQL conversation is atomic, role-scoped, immutable and archive-aware", async () => {
  const db=new PGlite(), admin=randomUUID(), sales=randomUUID(), peer=randomUUID(), task=randomUUID(), lead=randomUUID();
  const sql=file=>readFileSync(join(__dirname,"../supabase/migrations",file),"utf8");
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create schema auth; grant usage on schema auth to authenticated;
      create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create function auth.jwt() returns jsonb language sql as $$select '{"email":"synthetic@example.test"}'::jsonb$$;
      create schema private; grant usage on schema private to authenticated;
      create table public.profiles(id uuid primary key,role text,status text,full_name text);
      create table public.leads(id uuid primary key,assigned_to uuid,assigned_salesman text,created_by uuid,company_name text,initial_management_task_id uuid,is_archived boolean default false,
        activities jsonb default '[]',updated_at timestamptz default now(),next_action text,next_action_date date);
      create table public.notifications(id uuid primary key default gen_random_uuid(),recipient_uid uuid,lead_id uuid,type text,title text,message text,payload jsonb,status text default 'pending',created_at timestamptz);
      grant select on public.profiles,public.leads,public.notifications to authenticated;
      alter table public.notifications enable row level security;
      create policy own_notices on public.notifications for select to authenticated using(recipient_uid=auth.uid());`);
    for (const [id,role,name] of [[admin,"admin","Manager"],[sales,"salesman","Rep"],[peer,"salesman","Peer"]]) await db.query("insert into public.profiles values($1,$2,'active',$3)",[id,role,name]);
    await db.query("insert into public.leads(id,assigned_to,company_name,activities,next_action,next_action_date) values($1,$2,'Synthetic','[{\"id\":\"original\",\"text\":\"Keep\"}]','To Visit','2099-01-01')",[lead,sales]);
    for (const file of ["20261112070450_management_assigned_tasks.sql","20261117114500_remove_duplicate_management_tasks.sql","20261120083750_management_task_remark_history.sql"]) await db.exec(sql(file));
    // Exercise the released archive guard unchanged, alongside caller-owned task RLS.
    const lifecycle=sql("20261120050707_lead_lifecycle_archive.sql");
    await db.exec(lifecycle.slice(lifecycle.indexOf("create function private.lifecycle_admin()"),lifecycle.indexOf("create function private.lead_company_key(")));
    await db.exec(lifecycle.slice(lifecycle.indexOf('create policy "Lifecycle notifications boundary"'),lifecycle.indexOf("create function private.guard_archived_task()")));
    await db.exec(lifecycle.slice(lifecycle.indexOf("create function private.guard_archived_task()"),lifecycle.indexOf("do $$ declare fk record;",lifecycle.indexOf("create function private.guard_archived_task()")))+
      "create trigger archived_lead_task_guard before insert or update on public.management_tasks for each row execute function private.guard_archived_task();");
    await db.exec(sql("20261118122627_lead_creation_activity_audit.sql"));
    await db.query(`insert into public.management_tasks(id,assignee_id,assignee_name,assigned_by,assigned_by_name,lead_id,title,instructions,due_date,priority,status,remarks,version,completed_at)
      values($1,$2,'Rep',$3,'Manager',$4,'RFQ','Original instructions','2099-01-01','medium','completed','Original completion',3,'2026-11-19T06:00:00Z')`,[task,sales,admin,lead]);
    await db.exec(sql(migration));
    const beforeRepair=(await db.query("select proacl::text grants from pg_proc where oid='private.record_management_task_conversation(text,uuid,jsonb)'::regprocedure")).rows[0].grants;
    await db.exec(sql("20261120113300_task_conversation_conflict_response.sql"));
    assert.equal((await db.query("select proacl::text grants from pg_proc where oid='private.record_management_task_conversation(text,uuid,jsonb)'::regprocedure")).rows[0].grants,beforeRepair,"Repair must preserve execution grants");
    const writer=(await db.query("select pg_get_functiondef('private.record_management_task_conversation(text,uuid,jsonb)'::regprocedure) definition")).rows[0].definition;
    assert.doesNotMatch(writer,/errcode\s*=\s*'40001'/i,"Business conflicts must not trigger PostgREST serialization retries");
    const as=async id=>{await db.exec("set role authenticated");await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);};
    const call=async(action,input)=>(await db.query("select public.record_management_task_conversation($1,$2,$3) saved",[action,task,input])).rows[0].saved;
    const note={request_id:randomUUID(),expected_version:3,text:"Please clarify the specification."};
    await as(admin); const saved=await call("note",note); assert.equal(saved.version,4);
    assert.equal((await call("note",note)).version,4,"A retry must not append twice");
    await assert.rejects(()=>call("note",{...note,text:"Reused key"}),{code:"PT409"});
    await as(sales); assert.equal((await db.query("select * from public.notifications")).rows.length,1);
    await assert.rejects(()=>call("note",{...note,expected_version:4}),{code:"42501"});
    const follow={request_id:randomUUID(),expected_version:4,text:"Call for the specification.",next_action_plan:"To Call",next_action_date:"2098-12-31"};
    const completed=await call("followup",follow); await call("followup",follow);
    assert.equal(completed.status,"completed"); assert.equal(completed.completed_at,saved.completed_at); assert.equal(completed.remarks,saved.remarks); assert.equal(completed.due_date,saved.due_date);
    assert.equal(completed.followup_lead.activities.length,2); assert.equal(completed.followup_lead.activities[0].text,"Keep");
    const entry=(await db.query("select * from public.management_task_remarks where type='follow_up_plan'")).rows[0];
    assert.equal(entry.activity_id,completed.followup_lead.activities[1].id); assert.equal(entry.author_id,sales);
    await assert.rejects(()=>call("followup",{...follow,request_id:randomUUID()}),{code:"PT409"});
    assert.equal((await db.query("select version from public.management_tasks")).rows[0].version,5,"A stale draft cannot change the task");
    assert.equal((await db.query("select count(*)::int n from public.management_task_remarks")).rows[0].n,2,"A stale draft cannot append history");
    assert.equal((await db.query("select jsonb_array_length(activities) n from public.leads")).rows[0].n,2,"A stale draft cannot create another Activity");
    for (const command of ["update public.management_task_remarks set text='Forged'","delete from public.management_task_remarks"]) await assert.rejects(()=>db.exec(command),{code:"42501"});
    await as(peer); await assert.rejects(()=>call("followup",follow),{code:"P0002"}); assert.equal((await db.query("select * from public.management_task_remarks")).rows.length,0);
    await as(admin); await assert.rejects(()=>call("followup",follow),{code:"42501"});
    await db.exec("reset role");
    assert.equal((await db.query("select count(*)::int n from public.notifications")).rows[0].n,2);
    assert.equal((await db.query("select next_action from public.leads")).rows[0].next_action,"To Visit");
    await db.exec("alter table public.notifications add constraint reject_followup check(type<>'management_task_remark') not valid");
    await as(sales); await assert.rejects(()=>call("followup",{...follow,request_id:randomUUID(),expected_version:5}),{code:"23514"});
    assert.equal((await db.query("select version from public.management_tasks")).rows[0].version,5);
    assert.equal((await db.query("select jsonb_array_length(activities) n from public.leads")).rows[0].n,2);
    await db.exec("reset role; alter table public.notifications drop constraint reject_followup");
    await db.query("update public.leads set is_archived=true where id=$1",[lead]);
    await as(sales); await assert.rejects(()=>call("followup",follow),{code:"P0002"});
    assert.equal((await db.query("select * from public.management_task_remarks")).rows.length,0,"Archived task conversations must be hidden by RLS");
    assert.equal((await db.query("select * from public.notifications")).rows.length,0,"Archived task notes must also be hidden by RLS");
    await as(admin); await assert.rejects(()=>call("note",{...note,expected_version:5}),{code:"P0002"});
    await db.exec("reset role"); await db.query("update public.leads set is_archived=false,assigned_to=$1 where id=$2",[peer,lead]);
    await as(sales); await assert.rejects(()=>call("followup",follow),{code:"P0002"});
    assert.equal((await db.query("select * from public.notifications")).rows.length,0,"Former assignees must not read old management notes");
    for (const role of ["anon","service_role"]) { await db.exec(`set role ${role}`); await assert.rejects(()=>call("note",note),{code:"42501"}); }
  } finally { await db.close(); }
});
