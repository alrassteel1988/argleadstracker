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
    await db.exec(`create role anon; create role authenticated;
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
  } finally {
    await db.close();
  }
});
