const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { canReadManagementTask, saveLocalManagementTask, validateManagementTask, requestsInitialManagementTask,
  initialManagementTaskInput, nextManagementWorkingDate } = require("../src/services/managementTaskService");

test("new Admin lead task titles and next Monday-Saturday working date use Dubai time", () => {
  const cases = [
    ["2026-11-19T08:00:00Z", "2026-11-20"],
    ["2026-11-20T08:00:00Z", "2026-11-21"],
    ["2026-11-21T08:00:00Z", "2026-11-23"],
    ["2026-11-22T08:00:00Z", "2026-11-23"],
    ["2026-11-20T20:01:00Z", "2026-11-23"],
    ["2026-12-31T20:01:00Z", "2027-01-02"]
  ];
  for (const [now, expected] of cases) assert.equal(nextManagementWorkingDate(now), expected);
  const lead = { id: "fixture", notes: "Ask about the steel requirement.", next_action_date: "2099-01-01" };
  assert.equal(requestsInitialManagementTask({ assigned_to: "rep" }, { role: "admin" }), true);
  assert.equal(requestsInitialManagementTask({ assigned_to: "rep" }, { role: "salesman" }), false);
  assert.equal(requestsInitialManagementTask({ assigned_salesman: "Unassigned" }, { role: "admin" }), false);
  for (const title of ["New Lead Outreach", "Respond to Initial RFQ"]) {
    const task = initialManagementTaskInput({ ...lead, initial_management_task_title: title }, "rep", cases[2][0]);
    assert.equal(task.title, title);
    assert.equal(task.due_date, "2026-11-23");
  }
  assert.equal(initialManagementTaskInput(lead, "rep", cases[0][0]).title, "New Lead Outreach");
  assert.throws(() => initialManagementTaskInput({ ...lead, initial_management_task_title: "Invented task" }, "rep", cases[0][0]), { status: 400 });
});

const admin = { id: "00000000-0000-4000-8000-000000000001", role: "admin", status: "active", name: "Demo Admin" };
const rep = { id: "00000000-0000-4000-8000-000000000002", role: "salesman", status: "active", name: "Demo Salesman" };
const peer = { ...rep, id: "00000000-0000-4000-8000-000000000003", name: "Other Salesman" };
const lead = "00000000-0000-4000-8000-000000000004";
const taskId = "00000000-0000-4000-8000-000000000005";
const payload = { title: "Confirm project list", instructions: "Ask for dates and tonnage.", due_date: "2099-11-15", priority: "high", assignee_id: rep.id, lead_id: lead };
const completion = { expected_version: 3, status: "completed", remarks: "Confirmed the dates and tonnage." };
const duplicateId = "00000000-0000-4000-8000-000000000006";
const removal = { expected_version: 1, reason: "Duplicate assignment; keep the original." };

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

test("only an active Admin can remove an open duplicate and retain its audit", () => {
  const db = { users: [admin, rep], leads: [{ id: lead, assigned_to: rep.id, company_name: "Synthetic Steel", initial_management_task_id: taskId }],
    management_tasks: [], management_task_events: [] };
  const now = "2026-11-17T10:00:00Z";
  const save = (user, action, id, values) => saveLocalManagementTask(db, user, action, id,
    validateManagementTask(action, values, now.slice(0, 10)), now);
  save(admin, "assign", taskId, payload);
  save(admin, "assign", duplicateId, payload);
  assert.throws(() => save(rep, "remove", duplicateId, removal), { status: 403 });
  assert.throws(() => save({ ...admin, status: "inactive" }, "remove", duplicateId, removal), { status: 403 });
  assert.throws(() => save(admin, "remove", taskId, removal), { status: 409 });
  assert.throws(() => save(admin, "remove", duplicateId, { ...removal, expected_version: 2 }), { status: 409 });
  assert.throws(() => save(admin, "remove", duplicateId, { ...removal, reason: "  short  " }), { status: 400 });
  const removed = save(admin, "remove", duplicateId, removal);
  assert.equal(removed.version, 2);
  assert.equal(removed.removed_at, now);
  assert.equal(removed.removed_by, admin.id);
  assert.equal(removed.removal_reason, removal.reason);
  assert.equal(canReadManagementTask(db, rep, removed), false);
  assert.deepEqual(db.management_tasks.filter(task => canReadManagementTask(db, rep, task)).map(task => task.id), [taskId]);
  assert.throws(() => save(admin, "remove", duplicateId, { ...removal, expected_version: 2 }), { status: 409 });
  assert.throws(() => save(admin, "remind", duplicateId, { expected_version: 2 }), { status: 409 });
  assert.equal(db.leads[0].initial_management_task_id, taskId);
  assert.deepEqual(db.management_task_events.map(event => [event.action, event.task_id]),
    [["assign", taskId], ["assign", duplicateId], ["remove", duplicateId]]);
  assert.equal(db.management_task_events[2].snapshot.removal_reason, removal.reason);
});

test("same-lead initial task resolution enforces confirmation, versions and retained ownership", () => {
  const now = "2026-11-18T08:00:00Z";
  const db = { users: [admin, rep, peer], leads: [{ id: lead, assigned_to: rep.id, company_name: "Synthetic Steel", initial_management_task_id: taskId }],
    management_tasks: [], management_task_events: [] };
  const save = (user, action, id, values) => saveLocalManagementTask(db, user, action, id, validateManagementTask(action, values), now);
  save(admin, "assign", taskId, payload);
  save(admin, "assign", duplicateId, payload);
  const values = { ...removal, retained_task_id: duplicateId, retained_version: 1, confirmed: true };
  for (const bad of [{ confirmed: false }, { confirmed: "true" }, { retained_version: 0 }, { retained_task_id: "" }, { reason: "short" }]) {
    assert.throws(() => save(admin, "resolve_duplicate", taskId, { ...values, ...bad }), { status: 400 });
  }
  for (const actor of [rep, peer, { ...admin, role: "manager" }, { ...admin, status: "inactive" }]) {
    assert.throws(() => save(actor, "resolve_duplicate", taskId, values), { status: 403 });
  }
  assert.throws(() => save(admin, "resolve_duplicate", taskId, { ...values, retained_task_id: taskId }), { status: 409 });
  assert.throws(() => save(admin, "resolve_duplicate", taskId, { ...values, retained_version: 2 }), { status: 409 });
  const retained = db.management_tasks.find(task => task.id === duplicateId);
  for (const bad of [{ lead_id: "another-lead" }, { assignee_id: peer.id }, { removed_at: now }, { status: "completed" }]) {
    const before = { ...retained };
    Object.assign(retained, bad);
    assert.throws(() => save(admin, "resolve_duplicate", taskId, values), { status: 409 });
    Object.assign(retained, before);
    if (!before.removed_at) delete retained.removed_at;
    assert.equal(db.leads[0].initial_management_task_id, taskId);
    assert.equal(db.management_task_events.length, 2);
  }
  const original = { ...retained };
  const result = save(admin, "resolve_duplicate", taskId, values);
  assert.equal(result.duplicate_of_task_id, duplicateId);
  assert.equal(result.removed_by, admin.id);
  assert.equal(db.leads[0].initial_management_task_id, duplicateId);
  assert.equal(result.resolved_lead.initial_management_task_id, duplicateId);
  assert.deepEqual(retained, original, "The retained task's content and version stay unchanged");
  assert.deepEqual(db.management_tasks.filter(task => canReadManagementTask(db, rep, task)).map(task => task.id), [duplicateId]);
  assert.equal(db.management_task_events.at(-1).action, "resolve_duplicate");
  assert.equal(db.management_task_events.at(-1).snapshot.previous_initial_task_id, taskId);
  assert.equal(db.management_task_events.at(-1).snapshot.retained_task_id, duplicateId);
  assert.throws(() => save(admin, "remove", duplicateId, removal), { status: 409 }, "Retained task becomes protected");
  assert.throws(() => save(admin, "resolve_duplicate", taskId, { ...values, expected_version: 2 }), { status: 409 });
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
      add column next_action text not null default 'Qualify lead',
      add column next_action_date date,
      add column notes text,
      add constraint reject_invalid_fixture check (company_name <> 'Rollback fixture');
      grant insert, select, update on public.leads to authenticated;`);
    const repair = readFileSync(join(__dirname, "../supabase/migrations/20261116131732_restore_lead_activity_purpose.sql"), "utf8");
    await db.exec(repair);
    const existingLead = () => db.query("select activity_purpose, next_action from public.leads where id=$1", [lead]);
    assert.deepEqual((await existingLead()).rows, [{ activity_purpose: "Company Introductory", next_action: "Qualify lead" }]);
    await db.query("update public.leads set activity_purpose='Existing purpose' where id=$1", [lead]);
    await db.exec(repair);
    assert.deepEqual((await existingLead()).rows, [{ activity_purpose: "Existing purpose", next_action: "Qualify lead" }]);
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

    await db.exec(`create table public.companies (
      id uuid primary key default gen_random_uuid(), created_by uuid not null, company_name text not null,
      legal_name text, year_established integer, industry text, location text, address text, phone text,
      website text, google_place_id text, google_maps_url text, google_rating numeric,
      google_review_count integer, business_category text,
      opening_hours jsonb, enrichment_source text, enrichment_status text,
      enriched_at timestamptz, enrichment_updated_at timestamptz);
      alter table public.companies enable row level security;
      create policy company_owner on public.companies for all to authenticated
        using (created_by = auth.uid()) with check (created_by = auth.uid());
      grant insert, select on public.companies to authenticated;
      alter table public.profiles enable row level security;
      create policy read_own_profile on public.profiles for select to authenticated using (id = auth.uid());
      grant select on public.profiles to authenticated;
      alter table public.leads alter column id set default gen_random_uuid(),
        add column company_id uuid references public.companies(id),
        add column latitude numeric, add column longitude numeric,
        add column lead_status text not null default 'PROSPECT',
        add constraint leads_status_blueprint_check check (lead_status in ('PROSPECT', 'DORMANT'));`);
    await db.exec(readFileSync(join(__dirname, "../supabase/migrations/20261116124651_atomic_initial_management_lead.sql"), "utf8"));
    const task3 = "b0000000-0000-4000-8000-000000000003";
    const atomic = async (company, overrides = {}) => (await db.query(
      "select public.save_initial_management_lead($1::jsonb) as lead",
      [JSON.stringify({ company_name: company, lead_status: "NEW", created_by: admin.id, assigned_to: rep.id,
        initial_management_task_id: task3, next_action: "To Call", next_action_date: "2099-01-01", ...overrides })]
    )).rows[0].lead;
    await db.exec("set role anon");
    await assert.rejects(() => atomic("Anonymous fixture"), { code: "42501" });
    await as(rep);
    await assert.rejects(() => atomic("Salesman fixture", { created_by: rep.id }), { code: "42501" });
    await as(admin);
    await assert.rejects(() => atomic("Ownership fixture", { created_by: rep.id }), { code: "42501" });
    await assert.rejects(() => atomic("Rollback fixture"), { code: "23514", constraint: "reject_invalid_fixture" });
    await assert.rejects(() => atomic("Bad stage fixture", { lead_status: "LOST" }), { code: "23514", constraint: "leads_status_blueprint_check" });
    await assert.rejects(() => atomic("Task collision fixture", { initial_management_task_id: taskId }), { code: "23505" });
    assert.equal((await db.query("select count(*)::int as count from public.companies")).rows[0].count, 0,
      "Rejected leads and task failures must not leave company records");
    const prospect = await atomic("Atomic Prospect fixture", { latitude: 25.2, longitude: 55.3 });
    assert.equal(prospect.lead_status, "PROSPECT");
    assert.equal(prospect.initial_management_task_id, task3);
    assert.ok(prospect.company_id);
    assert.equal(prospect.next_action_date, null);
    assert.equal(Number(prospect.latitude), 25.2);
    assert.equal((await list()).filter(task => task.lead_id === prospect.id).length, 1);

    await db.exec("reset role; alter table public.leads drop constraint leads_status_blueprint_check");
    await as(admin);
    const withModernStage = await atomic("Modern fixture", {
      initial_management_task_id: "b0000000-0000-4000-8000-000000000004", company_id: prospect.company_id
    });
    assert.equal(withModernStage.lead_status, "NEW");
    assert.equal(withModernStage.company_id, prospect.company_id);
    assert.equal((await db.query("select count(*)::int as count from public.companies")).rows[0].count, 1,
      "An existing company must be reused");
    await as(peer);
    assert.equal((await list()).length, 0);
    await as(rep);
    assert.equal((await list()).filter(task => task.id === task3 && task.lead_id === prospect.id).length, 1);
    await db.exec("reset role");
    const unlinkedLead = await db.query("insert into public.leads (company_name) values ('Ordinary fixture') returning next_action, activity_purpose, initial_management_task_id");
    assert.deepEqual(unlinkedLead.rows, [{ next_action: "Qualify lead", activity_purpose: "Company Introductory", initial_management_task_id: null }]);
    assert.equal((await db.query("select count(*)::int as n from public.management_tasks where lead_name='Ordinary fixture'")).rows[0].n, 0);

    // The staging workspace already recognizes reassign/close events. Removing a duplicate must not narrow that rule.
    await db.exec(`alter table private.management_task_events drop constraint management_task_events_action_check;
      alter table private.management_task_events add constraint management_task_events_action_check
        check (action in ('assign','edit','remind','progress','reassign','close'));`);
    const saveAuditFixture = action => db.query(`insert into private.management_task_events (task_id, action, actor_id, actor_name, snapshot)
      values ($1,$2,$3,'Demo Admin','{}')`, [task2, action, admin.id]);
    await saveAuditFixture("reassign");
    await db.exec(readFileSync(join(__dirname, "../supabase/migrations/20261117114500_remove_duplicate_management_tasks.sql"), "utf8"));
    await saveAuditFixture("close");
    await assert.rejects(() => saveAuditFixture("unknown"), { code: "23514" });
    const remove = async (id, version = 1, reason = removal.reason) => (await db.query(
      "select public.remove_management_task($1,$2,$3) as task", [id, version, reason])).rows[0].task;
    await as(admin);
    await db.query("select public.save_management_task('assign',$1,$2::jsonb)", [duplicateId, JSON.stringify({ ...payload, lead_id: lead2, title: "To Call" })]);
    await as(rep);
    assert.ok((await list()).some(task => task.id === duplicateId));
    await assert.rejects(() => remove(duplicateId), { code: "42501" });
    await db.exec("reset role; set role anon");
    await assert.rejects(() => remove(duplicateId), { code: "42501" });
    await as(admin);
    await assert.rejects(() => remove(taskId, 4), { code: "40001", message: /Completed tasks/ });
    await assert.rejects(() => remove(task2), { code: "40001", message: /original task/ });
    await assert.rejects(() => remove(duplicateId, 2), { code: "40001", message: /task changed/ });
    await assert.rejects(() => remove(duplicateId, 1, "  short  "), { code: "22023" });
    await assert.rejects(() => db.query("delete from public.management_tasks where id=$1", [duplicateId]), { code: "42501" });
    const removed = await remove(duplicateId);
    assert.equal(removed.removed_by, admin.id);
    assert.equal(removed.version, 2);
    await assert.rejects(() => remove(duplicateId, 2), { code: "40001", message: /Removed tasks/ });
    await assert.rejects(() => db.query("select public.save_management_task('edit',$1,$2::jsonb)",
      [duplicateId, JSON.stringify({ ...payload, expected_version: 2 })]), { code: "40001", message: /Removed tasks/ });
    await as(rep);
    assert.ok((await list()).some(task => task.id === task2));
    assert.ok(!(await list()).some(task => task.id === duplicateId));
    await db.exec("reset role");
    const audit = await db.query("select actor_id, snapshot->>'removal_reason' as reason from private.management_task_events where task_id=$1 and action='remove'", [duplicateId]);
    assert.deepEqual(audit.rows, [{ actor_id: admin.id, reason: removal.reason }]);

    await db.exec("alter table public.leads add column updated_at timestamptz");
    await db.exec(readFileSync(join(__dirname, "../supabase/migrations/20261118053747_resolve_same_lead_task_duplicates.sql"), "utf8"));
    const keep = "00000000-0000-4000-8000-000000000007", foreign = "00000000-0000-4000-8000-000000000008";
    await as(admin);
    for (const [id, linkedId] of [[keep, lead2], [foreign, lead]]) {
      await db.query("select public.save_management_task('assign',$1,$2::jsonb)", [id, JSON.stringify({ ...payload, lead_id: linkedId })]);
    }
    const resolve = (overrides = {}) => db.query("select public.resolve_management_task_duplicate($1,$2,$3,$4,$5,$6) as task",
      [task2, overrides.version ?? 1, overrides.keep ?? keep, overrides.keepVersion ?? 1, overrides.reason ?? removal.reason, overrides.confirmed ?? true]);
    await as(rep);
    await assert.rejects(() => resolve(), { code: "42501" });
    await db.exec("set role anon");
    await assert.rejects(() => resolve(), { code: "42501" });
    await as(admin);
    for (const bad of [{ confirmed: false }, { reason: "short" }]) await assert.rejects(() => resolve(bad), { code: "22023" });
    for (const bad of [{ keep: foreign }, { version: 9 }, { keepVersion: 9 }]) await assert.rejects(() => resolve(bad), { code: "40001" });
    await assert.rejects(() => db.query("update public.leads set initial_management_task_id=$1 where id=$2", [keep, lead2]), { code: "42501" });
    await assert.rejects(() => db.exec("insert into private.management_task_events (task_id,action,actor_id,actor_name,snapshot) values (gen_random_uuid(),'resolve_duplicate',auth.uid(),'Forged','{}')"), { code: "42501" });
    await db.exec("reset role");
    await db.exec(`create function public.reject_resolution_fixture() returns trigger language plpgsql as $$
      begin raise exception 'Synthetic rollback fixture' using errcode='23514'; end; $$;
      create trigger reject_resolution_fixture after update of initial_management_task_id on public.leads
        for each row execute function public.reject_resolution_fixture();`);
    await as(admin);
    await assert.rejects(() => resolve(), { code: "23514" });
    await db.exec("reset role");
    assert.equal((await db.query("select initial_management_task_id from public.leads where id=$1", [lead2])).rows[0].initial_management_task_id, task2);
    assert.equal((await db.query("select removed_at from public.management_tasks where id=$1", [task2])).rows[0].removed_at, null);
    assert.equal((await db.query("select count(*)::int as n from private.management_task_events where action='resolve_duplicate'")).rows[0].n, 0);
    await db.exec("drop trigger reject_resolution_fixture on public.leads; drop function public.reject_resolution_fixture()");
    const retainedBefore = (await db.query("select * from public.management_tasks where id=$1", [keep])).rows[0];
    await as(admin);
    const competing = await Promise.allSettled([resolve(), resolve()]);
    assert.equal(competing.filter(result => result.status === "fulfilled").length, 1);
    assert.equal(competing.find(result => result.status === "rejected").reason.code, "40001");
    const resolved = competing.find(result => result.status === "fulfilled").value.rows[0].task;
    assert.equal(resolved.duplicate_of_task_id, keep);
    assert.equal(resolved.resolved_lead.initial_management_task_id, keep);
    await assert.rejects(() => resolve(), { code: "40001" });
    await assert.rejects(() => db.query("select public.remove_management_task($1,1,$2)", [keep, removal.reason]), { code: "40001" });
    await assert.rejects(() => db.query("update public.leads set initial_management_task_id=$1 where id=$2", [task2, lead2]), { code: "42501" });
    await as(rep);
    const visibleAfter = await list();
    assert.ok(visibleAfter.some(task => task.id === keep));
    assert.ok(!visibleAfter.some(task => task.id === task2));
    await db.exec("reset role");
    assert.deepEqual((await db.query("select * from public.management_tasks where id=$1", [keep])).rows[0], retainedBefore);
    const resolutionAudit = (await db.query("select actor_id,snapshot->>'previous_initial_task_id' as previous,snapshot->>'retained_task_id' as retained from private.management_task_events where action='resolve_duplicate'")).rows;
    assert.deepEqual(resolutionAudit, [{ actor_id: admin.id, previous: task2, retained: keep }]);
    await saveAuditFixture("reassign");
    await saveAuditFixture("close");
    await db.exec(`alter table public.leads add column activities jsonb not null default '[]';
      alter table public.leads add constraint leads_status_blueprint_check
        check (lead_status in ('PROSPECT', 'DORMANT')) not valid;`);
    await db.query("update public.leads set activities=$1::jsonb where id=$2", [JSON.stringify([
      { id: "saved-activity", type: "Phone Call", created_by: rep.id, text: "Keep the saved outcome." }
    ]), lead]);
    const existingState = async () => (await db.query(`select
      (select jsonb_agg(to_jsonb(l) order by id) from public.leads l) as leads,
      (select jsonb_agg(to_jsonb(t) order by id) from public.management_tasks t) as tasks,
      (select jsonb_agg(to_jsonb(e) order by id) from private.management_task_events e) as events`)).rows;
    const beforeRegistrationChange = await existingState();
    await db.exec(readFileSync(join(__dirname, "../supabase/migrations/20261118100838_lead_registration_task_choices.sql"), "utf8"));
    assert.deepEqual(await existingState(), beforeRegistrationChange, "Migration must not rewrite any saved lead, task or history");
    for (const at of ["2026-11-20T08:00:00Z", "2026-11-21T08:00:00Z", "2026-11-22T08:00:00Z", "2026-11-20T20:01:00Z", "2026-12-31T20:01:00Z"]) {
      const due = (await db.query("select private.next_management_working_date($1)::text as due", [at])).rows[0].due;
      assert.equal(due, nextManagementWorkingDate(at));
    }
    await as(rep);
    await assert.rejects(() => atomic("Unauthorized registration", { initial_management_task_id: "b0000000-0000-4000-8000-000000000011", next_action: "Respond to Initial RFQ", created_by: rep.id }), { code: "42501" });
    await assert.rejects(() => db.query("select private.next_management_working_date(now())"), { code: "42501" });
    await as(admin);
    const companyCount = (await db.query("select count(*)::int as n from public.companies")).rows[0].n;
    await assert.rejects(() => atomic("Bad task title", { initial_management_task_id: "b0000000-0000-4000-8000-000000000012", next_action: "Invented task" }), { code: "22023" });
    assert.equal((await db.query("select count(*)::int as n from public.companies")).rows[0].n, companyCount);
    for (const [index, title] of ["New Lead Outreach", "Respond to Initial RFQ", "To Call"].entries()) {
      const taskId = `b0000000-0000-4000-8000-00000000002${index}`;
      const saved = await atomic(`New workflow fixture ${index}`, { initial_management_task_id: taskId, next_action: title,
        next_action_date: "2000-01-01", notes: "Preserve these new-lead notes." });
      assert.equal(saved.next_action, "");
      assert.equal(saved.next_action_date, null);
      assert.equal(saved.lead_status, "PROSPECT", "The same blueprint constraint must still accept the default stage");
      const task = (await db.query("select * from public.management_tasks where id=$1", [taskId])).rows[0];
      assert.equal(task.title, title === "To Call" ? "New Lead Outreach" : title);
      assert.equal(task.due_date.toISOString().slice(0, 10), nextManagementWorkingDate(task.created_at));
      assert.match(task.instructions, /Preserve these new-lead notes/);
      await assert.rejects(() => db.query("update public.leads set initial_management_task_id=null where id=$1", [saved.id]), { code: "42501" });
      await as(rep);
      assert.equal((await list()).filter(item => item.id === taskId).length, 1);
      await as(peer);
      assert.equal((await list()).some(item => item.id === taskId), false);
      await as(admin);
    }
    await db.exec("reset role");
    const newAudit = (await db.query("select actor_id, snapshot->>'title' as title from private.management_task_events where task_id::text like 'b0000000-0000-4000-8000-00000000002%' order by task_id")).rows;
    assert.deepEqual(newAudit.map(item => [item.actor_id, item.title]), ["New Lead Outreach", "Respond to Initial RFQ", "New Lead Outreach"].map(title => [admin.id, title]));
  } finally {
    await db.close();
  }
});
