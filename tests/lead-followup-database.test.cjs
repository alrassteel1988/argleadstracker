const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// Run against a disposable PostgreSQL engine. No hosted connection or credentials.
const { PGlite } = require(process.env.CRM_TEST_PGLITE_MODULE || "@electric-sql/pglite");
const admin = "00000000-0000-4000-8000-000000000001";
const owner = "00000000-0000-4000-8000-000000000002";
const other = "00000000-0000-4000-8000-000000000003";
const inactive = "00000000-0000-4000-8000-000000000004";
const leadId = "00000000-0000-4000-8000-000000000011";
const original = { id: "reminder-1", type: "Reminder", reminder: true, activity_required: "To Call", due_date: "2026-01-01" };
const governance = process.env.CRM_TEST_SCHEDULE_GOVERNANCE === "1";

async function test() {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth;
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth to authenticated;
      create table public.profiles (id uuid primary key, status text, role text, full_name text, territory text default 'UAE-North');
      create table public.leads (
        id uuid primary key, assigned_to uuid, assigned_salesman text, next_action text not null,
        next_action_date date not null, last_activity date not null, updated_at timestamptz not null, activities jsonb,
        created_by uuid, territory text default 'UAE-North'
      );
      create function public.set_lead_time() returns trigger language plpgsql as
        $$ begin new.updated_at := clock_timestamp(); return new; end; $$;
      create trigger leads_set_updated_at before update on public.leads for each row execute function public.set_lead_time();
      grant select on public.profiles to authenticated;
      grant select, update on public.leads to authenticated;
      grant select on public.profiles to service_role;
      grant select, update on public.leads to service_role;
      alter table public.profiles enable row level security;
      alter table public.leads enable row level security;
      create policy own_profile on public.profiles for select to authenticated using (id = auth.uid());
    `);
    await db.query("insert into public.profiles (id,status,role,full_name) values ($1,'active','admin','Admin actor'), ($2,'active','salesman','Assigned rep'), ($3,'active','salesman','Other rep'), ($4,'disabled','salesman','Inactive rep')", [admin, owner, other, inactive]);
    await db.query("insert into public.leads (id,assigned_to,assigned_salesman,next_action,next_action_date,last_activity,updated_at,activities) values ($1,$2,'Assigned rep','To Call','2026-01-01','2025-12-20','2026-01-02Z',$3)", [leadId, owner, JSON.stringify([original])]);
    const migrations = path.join(__dirname, "..", "supabase", "migrations");
    const policies = fs.readFileSync(path.join(migrations, "20260803105004_replace_legacy_rls_policies.sql"), "utf8");
    // Load the real lead access helpers and policies without unrelated tables.
    await db.exec(policies.slice(0, policies.indexOf("alter table public.profiles enable row level security;")));
    await db.exec(policies.slice(policies.indexOf('create policy "F04 leads read"'), policies.indexOf('drop policy if exists "F04 contacts read"')));
    await db.exec(fs.readFileSync(path.join(migrations, "20261112062358_resolve_lead_followup.sql"), "utf8"));
    if (governance) {
      await db.exec(fs.readFileSync(path.join(migrations, "20261116113000_activity_schedule_governance.sql"), "utf8"));
      const role = async (name, id = "") => {
        await db.exec(`reset role; set role ${name}`);
        await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
      };
      await role("authenticated", owner);
      await assert.rejects(db.query("update public.leads set next_action_date='2099-01-01' where id=$1", [leadId]), /next-step controls/);
      await assert.rejects(db.query("update public.leads set activities=jsonb_set(activities,'{0,due_date}','\"2099-01-01\"') where id=$1", [leadId]), /read-only/);
      await assert.rejects(db.query("update public.leads set activities='[]' where id=$1", [leadId]), /cannot be removed/);
      await assert.rejects(db.query("select public.commit_activity_schedule($1,now(),'{}','{}')", [leadId]), /permission denied/);
      assert.equal((await db.query("select count(*)::int n from public.activity_schedule_events")).rows[0].n, 0);
      const legacyPlan = {
        id: `legacy:${leadId}:2026-01-01`, created_at: null, due_time: "09:00", original_due_date: "2026-01-01",
        original_due_time: "09:00", priority: "Normal", agenda: "", reschedules: 0, request: null
      };
      const patch = { next_action_date: "2026-01-01", activities: [original], activity_schedule: legacyPlan };
      const event = { id: "00000000-0000-4000-8000-000000000031", actor_id: owner, actor_role: "salesman",
        plan_id: legacyPlan.id, kind: "rescheduled", original_due_date: "2026-01-01", original_due_time: "09:00" };
      await role("service_role");
      await assert.rejects(db.query("select public.commit_activity_schedule($1,$2,$3,$4)",
        [leadId, "2026-01-02Z", JSON.stringify(patch), JSON.stringify(event)]), /needs a reschedule request/);
      const queued = (await db.query("select public.commit_activity_schedule($1,$2,$3,$4) as row",
        [leadId, "2026-01-02Z", JSON.stringify(patch), JSON.stringify({ ...event, kind: "reschedule_requested" })])).rows[0].row;
      assert.equal(queued.activity_schedule.created_at, null);
      assert.equal(queued.next_action_date, "2026-01-01");
      await assert.rejects(db.query("delete from public.activity_schedule_events"), /permission denied/);
      await role("authenticated", owner);
      assert.equal((await db.query("select count(*)::int n from public.activity_schedule_events")).rows[0].n, 0);
      await role("authenticated", admin);
      assert.equal((await db.query("select count(*)::int n from public.activity_schedule_events")).rows[0].n, 1);
      await db.exec("reset role");
      await db.query("update public.leads set activity_schedule=null where id=$1", [leadId]);

      const freshId = "00000000-0000-4000-8000-000000000012";
      const fresh = (await db.query(`insert into public.leads
        (id,assigned_to,assigned_salesman,next_action,next_action_date,last_activity,updated_at,activities)
        values ($1,$2,'Assigned rep','To Call','2099-02-01','2026-01-01',clock_timestamp(),'[]') returning *`,
      [freshId, owner])).rows[0];
      const freshVersion = (await db.query("select updated_at::text as version from public.leads where id=$1", [freshId])).rows[0].version;
      const freshPlan = fresh.activity_schedule;
      assert.ok(freshPlan.created_at);
      assert.equal(freshPlan.original_due_date, "2099-02-01");
      const change = { next_action_date: "2099-02-02", activities: [],
        activity_schedule: { ...freshPlan, reschedules: 1, agenda: "Updated agenda" } };
      const freshAudit = { ...event, id: "00000000-0000-4000-8000-000000000032",
        plan_id: freshPlan.id, original_due_date: freshPlan.original_due_date };
      const commit = async (version, patch, entry = freshAudit) => (await db.query(
        "select public.commit_activity_schedule($1,$2,$3,$4) as row",
        [freshId, version, JSON.stringify(patch), JSON.stringify(entry)])).rows[0].row;
      await role("service_role");
      const moved = await commit(freshVersion, change);
      assert.equal(moved.next_action_date, "2099-02-02");
      assert.equal(moved.activity_schedule.original_due_date, "2099-02-01");
      assert.equal(await commit(freshVersion, change), null);
      await db.exec("reset role");
      const expired = (await db.query(`update public.leads set activity_schedule=jsonb_set(
        activity_schedule,'{created_at}',to_jsonb(clock_timestamp() - interval '48 hours'))
        where id=$1 returning activity_schedule, updated_at::text as version`, [freshId])).rows[0];
      await role("service_role");
      await assert.rejects(commit(expired.version, { ...change, next_action_date: "2099-02-03", activity_schedule: expired.activity_schedule }),
        /needs a reschedule request/);
      await db.exec("reset role");
    }
    const input = { request_id: "b2822dec-4323-4f57-b782-c50801606e0f", status: "cancelled", reason: "Duplicate activity",
      remarks: "Same synthetic follow-up already scheduled.", expected_action: "To Call", expected_due: "2026-01-01",
      expected_updated_at: governance ? (await db.query("select updated_at::text as version from public.leads where id=$1", [leadId])).rows[0].version : "2026-01-02T00:00:00Z",
      expected_revision: "" };
    const save = async (user, values) => {
      await db.exec("set role authenticated");
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user]);
      return (await db.query("select public.resolve_lead_followup($1, $2) as saved", [leadId, JSON.stringify(values)])).rows[0].saved;
    };
    await assert.rejects(save(other, input), /Follow-up unavailable/);
    await assert.rejects(save(inactive, input), /Active Admin or salesman required/);
    await assert.rejects(save(admin, { ...input, remarks: "\n              \t" }), /Invalid follow-up/);
    const completed = await save(owner, { ...input, status: "completed", reason: "Quote requested",
      done_at: "2026-01-03T09:00+04:00", next_type: "Send quotation", next_date: "2099-01-04", next_note: "Send sample quotation" });
    assert.equal(completed.activity.done_by, owner);
    assert.equal(completed.activity.audit_history[0].actor_id, owner);
    assert.equal(completed.activity.resolved_reminder_id, original.id);
    assert.equal(completed.lead.next_action, "To Send Email");
    assert.equal(completed.lead.activities[1].text, "Send sample quotation");
    assert.deepEqual(completed.lead.activities[2], original);
    await assert.rejects(save(admin, { ...input, request_id: "b2822dec-4323-4f57-b782-c50801606e10" }), /next step changed/i);
    const cancellation = { ...input, request_id: "b2822dec-4323-4f57-b782-c50801606e10",
      expected_action: "To Send Email", expected_due: "2099-01-04", expected_revision: completed.activity.id,
      expected_updated_at: completed.lead.updated_at };
    const cancelled = await save(admin, cancellation);
    assert.equal(cancelled.activity.transaction_status, "cancelled");
    assert.equal(cancelled.activity.cancelled_by, admin);
    assert.equal(cancelled.activity.audit_history[0].actor_name, "Admin actor");
    assert.equal(cancelled.lead.next_action_date, null);
    assert.equal(cancelled.lead.last_activity, "2026-01-03");
    assert.equal(cancelled.lead.activities.length, 4);
    const duplicate = await save(admin, cancellation);
    assert.equal(duplicate.duplicate, true);
    assert.deepEqual(duplicate.lead.activities, cancelled.lead.activities);
    if (governance) {
      assert.equal(cancelled.lead.activity_schedule, null);
      assert.equal(completed.lead.activity_schedule.original_due_date, "2099-01-04");
      const audited = (await db.query("select kind, count(*)::int n from public.activity_schedule_events group by kind")).rows;
      assert.deepEqual(new Map(audited.map(item => [item.kind, item.n])),
        new Map([["completed", 1], ["cancelled", 1], ["reschedule_requested", 1], ["rescheduled", 1]]));
      await assert.rejects(db.query("update public.leads set activities=jsonb_set(activities,'{0,text}','\"changed\"') where id=$1", [leadId]), /read-only/);
    }
    await db.exec("reset role; set role anon");
    await assert.rejects(db.query("select public.resolve_lead_followup($1, $2)", [leadId, JSON.stringify(input)]), /permission denied/);
    console.log("PASS local PostgreSQL: assignment, inactive user, Admin actor, validation, stale saves, replacement, and idempotency");
  } finally {
    await db.close();
  }
}

test().catch(error => { console.error(error); process.exitCode = 1; });
