const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { canReadManagementTask, saveLocalManagementTask, validateManagementTask } = require("../src/services/managementTaskService");

const admin = { id: "00000000-0000-4000-8000-000000000001", role: "admin", status: "active", name: "Demo Admin" };
const rep = { id: "00000000-0000-4000-8000-000000000002", role: "salesman", status: "active", name: "Demo Salesman" };
const peer = { ...rep, id: "00000000-0000-4000-8000-000000000003", name: "Other Salesman" };
const lead = "00000000-0000-4000-8000-000000000004";
const taskId = "00000000-0000-4000-8000-000000000005";
const payload = { title: "Confirm project list", instructions: "Ask for dates and tonnage.", due_date: "2099-11-15", priority: "high", assignee_id: rep.id, lead_id: lead };
const completion = { expected_version: 3, status: "completed", remarks: "Confirmed the dates and tonnage." };

test("management task validation rejects invalid deadlines and incomplete remarks", () => {
  for (const due_date of ["", "2026-02-30", "2025-11-12"]) {
    assert.throws(() => validateManagementTask("assign", { ...payload, due_date }, "2026-11-12"), { status: 400 });
  }
  for (const remarks of ["   ", "too short"]) {
    assert.throws(() => validateManagementTask("progress", { ...completion, remarks }), { status: 400 });
  }
  assert.throws(() => validateManagementTask("edit", payload), { status: 400 });
});

test("local management task saves enforce roles, ownership, versions and history", () => {
  const db = { users: [admin, rep, peer], leads: [{ id: lead, assigned_to: rep.id, company_name: "Synthetic Steel" }], management_tasks: [], management_task_events: [] };
  const now = "2026-11-12T08:00:00Z", later = "2026-11-12T08:02:00Z";
  const save = (user, action, values, at = now) => saveLocalManagementTask(db, user, action, taskId, validateManagementTask(action, values, now.slice(0, 10)), at);
  assert.throws(() => save(rep, "assign", payload), { status: 403 });
  assert.throws(() => save(admin, "assign", { ...payload, assignee_id: peer.id }), { status: 400 });
  const task = save(admin, "assign", payload);
  assert.equal(save(admin, "assign", payload).id, task.id);
  assert.equal(db.management_task_events.length, 1);
  assert.equal(canReadManagementTask(db, peer, task), false);
  assert.throws(() => save(peer, "progress", completion), { status: 404 });
  assert.throws(() => save(admin, "progress", completion), { status: 403 });
  assert.throws(() => save(admin, "remind", { expected_version: 1 }), { status: 409 });
  assert.equal(save(rep, "seen", { expected_version: 1 }).seen_at, now);
  assert.equal(save(admin, "remind", { expected_version: 1 }, later).seen_at, null);
  assert.equal(save(admin, "edit", { ...payload, title: "Updated project list", expected_version: 2 }, later).version, 3);
  assert.throws(() => save(rep, "progress", { ...completion, expected_version: 2 }), { status: 409 });
  db.leads[0].assigned_to = peer.id;
  assert.equal(canReadManagementTask(db, rep, task), false);
  assert.throws(() => save(rep, "progress", completion), { status: 404 });
  db.leads[0].assigned_to = rep.id;
  assert.equal(save(rep, "progress", completion).status, "completed");
  assert.throws(() => save(admin, "edit", { ...payload, expected_version: 4 }), { status: 409 });
  assert.deepEqual(db.management_task_events.map(event => [event.action, event.actor_id]), [
    ["assign", admin.id], ["remind", admin.id], ["edit", admin.id], ["progress", rep.id]
  ]);
  assert.equal(db.management_task_events[0].snapshot.title, payload.title);
});

test("SQL task writer and RLS on a disposable PostgreSQL fixture", { skip: !process.env.CRM_TEST_PGLITE_MODULE }, async () => {
  const { PGlite } = require(process.env.CRM_TEST_PGLITE_MODULE);
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create schema private; grant usage on schema private to authenticated;
      create schema auth; grant usage on schema auth to authenticated;
      create function auth.uid() returns uuid language sql as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      create table public.profiles (id uuid primary key, role text, status text, full_name text);
      create table public.leads (id uuid primary key, assigned_to uuid, company_name text);`);
    await db.exec(readFileSync(join(__dirname, "../supabase/migrations/20261112070450_management_assigned_tasks.sql"), "utf8"));
    for (const user of [admin, rep, peer]) await db.query("insert into public.profiles values ($1,$2,$3,$4)", [user.id, user.role, user.status, user.name]);
    await db.query("insert into public.leads values ($1,$2,'Synthetic Steel')", [lead, rep.id]);
    const as = async user => {
      await db.exec("set role authenticated");
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user.id]);
    };
    const save = async (action, input) => (await db.query("select public.save_management_task($1,$2,$3::jsonb) as task", [action, taskId, JSON.stringify(input)])).rows[0].task;
    const list = async () => (await db.query("select * from public.management_tasks")).rows;
    await db.exec("set role anon");
    await assert.rejects(list, { code: "42501" });
    await assert.rejects(() => save("assign", payload), { code: "42501" });
    await as(admin);
    await assert.rejects(() => save("assign", { ...payload, assignee_id: peer.id }), { code: "22023" });
    assert.equal((await save("assign", payload)).version, 1);
    assert.equal((await save("assign", payload)).version, 1);
    await assert.rejects(() => save("progress", completion), { code: "42501" });
    await assert.rejects(() => save("remind", { expected_version: 1 }), { code: "40001" });
    await as(peer);
    assert.equal((await list()).length, 0);
    await assert.rejects(() => save("progress", completion), { code: "P0002" });
    await as(rep);
    assert.equal((await list()).length, 1);
    await assert.rejects(() => db.exec("update public.management_tasks set status='in_progress'"), { code: "42501" });
    await assert.rejects(() => db.exec("select * from private.management_task_events"), { code: "42501" });
    assert.ok((await save("seen", { expected_version: 1 })).seen_at);
    await assert.rejects(() => save("progress", { ...completion, expected_version: 1, remarks: "   short   " }), { code: "22023" });
    const concurrent = await Promise.allSettled(Array.from({ length: 2 }, () => save("progress", { expected_version: 1, status: "in_progress", remarks: "Waiting for a callback." })));
    assert.equal(concurrent.filter(item => item.status === "fulfilled").length, 1);
    assert.equal(concurrent.find(item => item.status === "rejected").reason.code, "40001");
    await as(admin);
    assert.equal((await save("edit", { ...payload, expected_version: 2 })).seen_at, null);
    await db.exec("reset role");
    await db.query("update public.leads set assigned_to=$1 where id=$2", [peer.id, lead]);
    await as(rep);
    assert.equal((await list()).length, 0);
    await assert.rejects(() => save("progress", completion), { code: "P0002" });
    await db.exec("reset role");
    await db.query("update public.leads set assigned_to=$1 where id=$2", [rep.id, lead]);
    await db.query("update public.profiles set status='inactive' where id=$1", [rep.id]);
    await as(rep);
    assert.equal((await list()).length, 0);
    await assert.rejects(() => save("progress", completion), { code: "42501" });
    await db.exec("reset role");
    await db.query("update public.profiles set status='active' where id=$1", [rep.id]);
    await as(rep);
    assert.equal((await save("progress", completion)).status, "completed");
    await as(admin);
    assert.equal((await list())[0].remarks, completion.remarks);
    await db.exec("reset role");
    const { rows } = await db.query("select action, actor_id from private.management_task_events order by (snapshot->>'version')::int");
    assert.deepEqual(rows.map(event => [event.action, event.actor_id]), [["assign", admin.id], ["progress", rep.id], ["edit", admin.id], ["progress", rep.id]]);

    await db.exec(`alter table public.leads
      add column assigned_salesman text,
      add column created_by uuid,
      add column next_action text,
      add column next_action_date date,
      add column activity_purpose text,
      add column notes text,
      add constraint reject_invalid_fixture check (company_name <> 'Rollback fixture');
      grant insert, select, update on public.leads to authenticated;`);
    await db.exec(readFileSync(join(__dirname, "../supabase/migrations/20261116111051_initial_management_task.sql"), "utf8"));
    const lead2 = "a0000000-0000-4000-8000-000000000002";
    const task2 = "b0000000-0000-4000-8000-000000000002";
    const create = (actor, company = "New synthetic account", assignee = rep.id) => db.query(
      `insert into public.leads (id, initial_management_task_id, assigned_to, created_by, company_name, next_action, next_action_date, activity_purpose, notes)
        values ($1, $2, $3, $4, $5, 'To Call', '2099-01-01', 'Company Introductory', 'Ask for the buyer') returning *`,
      [lead2, task2, assignee, actor.id, company]);
    await as(rep);
    await assert.rejects(() => create(rep), { code: "42501" });
    await as(admin);
    await assert.rejects(() => create(admin, "New synthetic account", admin.id), { code: "22023" });
    await assert.rejects(() => create(admin, "Rollback fixture"), { code: "23514" });
    assert.equal((await list()).length, 1, "A rejected lead must not leave an orphan assignment");
    await create(admin);
    const saved = (await db.query("select * from public.leads where id=$1", [lead2])).rows[0];
    assert.equal(saved.initial_management_task_id, task2);
    assert.equal(saved.next_action, "");
    assert.equal(saved.next_action_date, null);
    await assert.rejects(() => create(admin), { code: "23505" });
    await db.query(`insert into public.leads (id, initial_management_task_id, assigned_to, created_by, company_name, next_action, next_action_date)
      values ($1, gen_random_uuid(), $2, $3, 'No-op conflict', 'To Call', '2099-01-01') on conflict (id) do nothing`,
    [lead2, rep.id, admin.id]);
    assert.equal((await list()).length, 2, "A skipped insert must not create an extra task");
    const rejectedId = "a0000000-0000-4000-8000-000000000003";
    await assert.rejects(db.query(`insert into public.leads (id, initial_management_task_id, assigned_to, created_by, company_name, next_action, next_action_date)
      values ($1, $2, $3, $4, 'Task collision', 'To Call', '2099-01-01')`, [rejectedId, taskId, rep.id, admin.id]),
    { code: "23505" });
    assert.equal((await db.query("select id from public.leads where id=$1", [rejectedId])).rows.length, 0,
      "A failed assignment must roll back the lead");
    await as(peer);
    assert.equal((await list()).length, 0);
    await as(rep);
    const openingTask = (await list()).find(task => task.id === task2);
    assert.equal(openingTask.lead_id, lead2);
    assert.equal(openingTask.assigned_by, admin.id);
    assert.equal(openingTask.title, "To Call");
    assert.equal(openingTask.due_date.toISOString().slice(0, 10), "2099-01-01");
    assert.equal(openingTask.instructions, "Company Introductory\nAsk for the buyer");
    await assert.rejects(db.query("update public.leads set initial_management_task_id=null where id=$1", [lead2]), { code: "42501" });
    await db.exec("reset role");
    const assigned = await db.query("select action, actor_id from private.management_task_events where task_id=$1", [task2]);
    assert.deepEqual(assigned.rows, [{ action: "assign", actor_id: admin.id }]);
  } finally {
    await db.close();
  }
});
