const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const vm = require("node:vm");
const { saveLocalManagementTask, validateManagementTask, managementTaskWithRemarks, canReadManagementTask } = require("../src/services/managementTaskService");
const { PGlite } = require("@electric-sql/pglite");
const migration = "20261120083750_management_task_remark_history.sql";

test("remarks append across progress and completion without altering completed evidence", () => {
  const admin = { id: randomUUID(), name: "Admin", role: "admin", status: "active" };
  const sales = { id: randomUUID(), name: "Salesman", role: "salesman", status: "active" };
  const peer = { ...sales, id: randomUUID() }, id = randomUUID();
  const db = { users: [admin,sales,peer], leads: [], management_tasks: [], management_task_events: [] };
  const save = (actor, action, input, at) => saveLocalManagementTask(db,actor,action,id,validateManagementTask(action,input,"2026-11-20"),at);
  let task = save(admin,"assign",{assignee_id:sales.id,title:"Synthetic RFQ",instructions:"Reply to the enquiry",lead_id:"",due_date:"2026-11-21",priority:"medium"},"2026-11-20T06:00:00Z");
  for (const [status,remarks,at] of [["in_progress","Started calling.","2026-11-20T06:15:00Z"],["in_progress","Waiting for callback.","2026-11-20T06:30:00Z"],["completed","Phone call not attended.","2026-11-20T06:45:00Z"]]) {
    task = save(sales,"progress",{expected_version:task.version,status,remarks},at);
  }
  const completed = structuredClone(task);
  task = save(sales,"remark",{expected_version:task.version,text:"Correction: the contact is Mr. Jai."},"2026-11-20T08:40:00Z");
  assert.equal(task.status,"completed"); assert.equal(task.completed_at,completed.completed_at); assert.equal(task.remarks,completed.remarks);
  const trail = managementTaskWithRemarks(db,task).remark_history;
  assert.equal(db.management_task_remarks.length,4,"All new entries must also persist in the separate history collection");
  assert.deepEqual(trail.map(entry=>entry.type),["started","progress_update","completion","additional_remark"]);
  assert.deepEqual(trail.map(entry=>entry.author_id),Array(4).fill(sales.id));
  assert.equal(trail[2].text,completed.remarks); assert.equal(trail[3].created_at,"2026-11-20T08:40:00Z");
  assert.equal(db.notifications.length,1); assert.equal(db.notifications[0].recipient_uid,admin.id);
  assert.equal(canReadManagementTask(db,sales,task),true); assert.equal(canReadManagementTask(db,peer,task),false);
  assert.throws(()=>save(peer,"remark",{expected_version:task.version,text:"Forged"}),{status:404});
  assert.throws(()=>save(admin,"remark",{expected_version:task.version,text:"Forged"}),{status:403});
  assert.throws(()=>save(sales,"remark",{expected_version:completed.version,text:"Retry"}),{status:409});
  assert.throws(()=>validateManagementTask("remark",{expected_version:task.version,text:"  "}),{status:400});
});

test("filters, counts, latest previews and default tabs include completed work", () => {
  const source = readFileSync(join(__dirname,"../client.js"),"utf8");
  const helpers = vm.runInNewContext(source.slice(source.indexOf("const MG_TASK_LABELS"),source.indexOf("function renderManagementTaskDashboard"))
    + ";({managementTaskCounts,managementTaskFilter,managementTaskDefaultFilter,managementTaskLatestRemark})",{});
  const today = new Date(Date.now()+4*3600000).toISOString().slice(0,10);
  const rows = ["not_started","in_progress","completed"].map((status,i)=>({id:String(i),status,due_date:"2000-01-01",title:"Fixture",created_at:today}));
  rows.push({...rows[0],id:"removed",removed_at:today});
  const counts = JSON.parse(JSON.stringify(helpers.managementTaskCounts(rows)));
  assert.deepEqual(counts,{all:3,pending:2,completed:1,removed:1,not_started:1,in_progress:1,today:0,overdue:2});
  for (const [filter,count] of [["all",3],["not_started",1],["in_progress",1],["completed",1],["overdue",2],["removed",1]]) assert.equal(helpers.managementTaskFilter(rows,filter).length,count);
  assert.equal(helpers.managementTaskDefaultFilter(rows),"not_started");
  assert.equal(helpers.managementTaskDefaultFilter(rows.slice(1,3)),"in_progress");
  assert.equal(helpers.managementTaskDefaultFilter([rows[2]]),"all");
  assert.equal(helpers.managementTaskLatestRemark({remarks:"Original",remark_history:[{id:"r",created_at:today,type:"additional_remark",text:"Correction"}]}),"Correction");
});

test("SQL migration preserves original remarks/authors/times and enforces append-only RLS", async () => {
  const db = new PGlite();
  const admin=randomUUID(), otherAdmin=randomUUID(), sales=randomUUID(), peer=randomUUID(), task=randomUUID(), legacy=randomUUID();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create schema auth; grant usage on schema auth to authenticated;
      create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create schema private; grant usage on schema private to authenticated;
      create table public.profiles(id uuid primary key,role text,status text,full_name text);
      create table public.leads(id uuid primary key,assigned_to uuid,company_name text,initial_management_task_id uuid,is_archived boolean default false);
      create table public.notifications(id uuid primary key default gen_random_uuid(),recipient_uid uuid,lead_id uuid,type text,title text,message text,payload jsonb,created_at timestamptz);
      grant select on public.profiles to authenticated;`);
    for (const [id,role,name] of [[admin,"admin","Admin"],[otherAdmin,"admin","Second Admin"],[sales,"salesman","Original Salesman"],[peer,"salesman","Peer"]]) {
      await db.query("insert into public.profiles values($1,$2,'active',$3)",[id,role,name]);
    }
    for (const file of ["20261112070450_management_assigned_tasks.sql","20261117114500_remove_duplicate_management_tasks.sql"]) await db.exec(readFileSync(join(__dirname,"../supabase/migrations",file),"utf8"));
    for (const id of [task,legacy]) await db.query(`insert into public.management_tasks(id,assignee_id,assignee_name,assigned_by,assigned_by_name,title,instructions,due_date,priority,status,remarks,version,completed_at,progress_at)
      values($1,$2,'Original Salesman',$3,'Admin','Legacy task','Original instructions','2099-01-01','medium','completed','Original completion remark',3,'2026-11-19T08:30:00Z','2026-11-19T08:30:00Z')`,[id,sales,admin]);
    for (const [version,status,remarks,at] of [[2,"in_progress","Original progress remark","2026-11-19T08:00:00Z"],[3,"completed","Original completion remark","2026-11-19T08:30:00Z"]]) {
      await db.query("insert into private.management_task_events(task_id,action,actor_id,actor_name,at,snapshot) values($1,'progress',$2,'Original name at entry',$3,$4)",[task,sales,at,{status,remarks,version}]);
    }
    await db.exec(readFileSync(join(__dirname,"../supabase/migrations",migration),"utf8"));
    const as = async id => { await db.exec("set role authenticated"); await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]); };
    const history = async () => (await db.query("select * from public.management_task_remarks where task_id=$1 order by created_at,task_version,id",[task])).rows;
    const append = async (version,text="Correction: Mr. Jai is the correct contact.") => (await db.query("select public.append_management_task_remark($1,$2,$3) task",[task,version,text])).rows[0].task;
    await as(sales);
    const original = await history();
    assert.deepEqual(original.map(row=>[row.type,row.text,row.author_name,new Date(row.created_at).toISOString()]),[
      ["started","Original progress remark","Original name at entry","2026-11-19T08:00:00.000Z"],
      ["completion","Original completion remark","Original name at entry","2026-11-19T08:30:00.000Z"]]);
    const unknown=(await db.query("select * from public.management_task_remarks where task_id=$1",[legacy])).rows[0];
    assert.equal(unknown.author_id,null); assert.equal(unknown.author_name,"Not recorded"); assert.equal(unknown.text,"Original completion remark");
    const before=(await db.query("select * from public.management_tasks where id=$1",[task])).rows[0];
    const saved=await append(3);
    assert.equal(saved.status,before.status); assert.equal(+new Date(saved.completed_at),+new Date(before.completed_at)); assert.equal(saved.remarks,before.remarks);
    assert.deepEqual((await history()).slice(0,2),original); assert.equal((await history()).at(-1).type,"additional_remark");
    await assert.rejects(()=>append(3),{code:"40001"});
    await assert.rejects(()=>append(4,"  "),{code:"22023"});
    await as(peer); assert.equal((await history()).length,0); await assert.rejects(()=>append(4),{code:"P0002"});
    await as(admin); await assert.rejects(()=>append(4),{code:"42501"});
    for (const action of ["update public.management_task_remarks set text='Forged'","delete from public.management_task_remarks"]) await assert.rejects(()=>db.exec(action),{code:"42501"});
    await as(sales); await assert.rejects(()=>db.query("insert into public.management_task_remarks(task_id,author_name,type,text,created_at) values($1,'Forged','completion','Fake',now())",[task]),{code:"42501"});
    await db.exec("reset role");
    assert.equal((await db.query("select count(*)::int n from public.notifications where type='management_task_remark'")).rows[0].n,2,"Notify every active Admin");
    await db.exec("alter table public.notifications add constraint reject_test_notice check(type<>'management_task_remark') not valid");
    await as(sales); await assert.rejects(()=>append(4),{code:"23514"});
    assert.equal((await history()).length,3); assert.equal((await db.query("select version from public.management_tasks where id=$1",[task])).rows[0].version,4);
    await db.exec("reset role; alter table public.notifications drop constraint reject_test_notice");
    const fresh = randomUUID();
    await as(admin);
    await db.query("select public.save_management_task('assign',$1,$2)",[fresh,{assignee_id:sales,title:"Fresh task",instructions:"Do synthetic work",due_date:"2099-01-01",priority:"medium"}]);
    await as(sales);
    await db.query("select public.save_management_task('progress',$1,$2)",[fresh,{expected_version:1,status:"in_progress",remarks:"Fresh progress"}]);
    assert.equal((await db.query("select type from public.management_task_remarks where task_id=$1",[fresh])).rows[0].type,"started");
    await db.exec("set role anon"); await assert.rejects(history,{code:"42501"}); await assert.rejects(()=>append(4),{code:"42501"});
  } finally { await db.close(); }
});
