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

async function test() {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role;
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
    await db.exec(fs.readFileSync(path.join(migrations, "20261116094621_targeted_activity_outcomes.sql"), "utf8"));
    const input = { request_id: "b2822dec-4323-4f57-b782-c50801606e0f", status: "cancelled", reason: "Duplicate activity",
      remarks: "Same synthetic follow-up already scheduled.", expected_action: "To Call", expected_due: "2026-01-01",
      expected_updated_at: "2026-01-02T00:00:00Z", expected_revision: "" };
    const save = async (user, values, rpc = "resolve_lead_followup") => {
      await db.exec("set role authenticated");
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user]);
      return (await db.query(`select public.${rpc}($1, $2) as saved`, [leadId, JSON.stringify(values)])).rows[0].saved;
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
    await db.exec("reset role");
    const independent = { ...original, id: "older", activity_required: "To Visit", version: 2 };
    const contacted = { ...original, id: "older-call", due_date: "2026-01-02" };
    const planEntry = { id: "plan-entry", type: "Phone Call", next_action_plan: "To Call", next_action_date: original.due_date };
    const updated = (await db.query(`update public.leads set next_action = 'To Call', next_action_date = '2026-01-01',
      activities = $2 where id = $1 returning updated_at`,
    [leadId, JSON.stringify([original, independent, contacted, planEntry])])).rows[0];
    const targeted = { ...input, activity_id: independent.id, expected_action: "To Visit",
      expected_activity_version: 2, expected_updated_at: updated.updated_at };
    const target = (user, values) => save(user, values, "resolve_overdue_activity");
    await assert.rejects(target(other, targeted), /Follow-up unavailable/);
    await assert.rejects(target(inactive, targeted), /Active Admin or salesman/);
    await assert.rejects(target(owner, { ...targeted, expected_activity_version: 1 }), /activity changed/i);
    await assert.rejects(target(owner, { ...targeted, activity_id: original.id, expected_activity_version: 1, expected_action: "To Call" }), /lead's next step/);
    await assert.rejects(target(owner, { ...targeted, activity_id: planEntry.id, expected_activity_version: 1, expected_action: "Phone Call" }), /records a lead plan/);
    await assert.rejects(target(owner, { ...targeted, next_type: "To Call", next_date: "2099-01-01" }), /Invalid overdue activity/);
    await assert.rejects(db.query("update public.leads set activities = $2 where id = $1", [
      leadId, JSON.stringify([{ resolved_activity_id: independent.id, followup_resolution: "completed", created_by: admin }])
    ]), /Use the follow-up controls/);
    const resolved = await target(owner, targeted);
    assert.equal(resolved.lead.next_action_date, original.due_date);
    assert.equal(resolved.lead.last_activity, cancelled.lead.last_activity);
    assert.equal(resolved.activity.resolved_activity_id, independent.id);
    assert.equal(resolved.activity.audit_history[0].actor_id, owner);
    assert.deepEqual(resolved.lead.activities.slice(1), [original, independent, contacted, planEntry]);
    await assert.rejects(db.query("update public.leads set activities = activities - 0 where id = $1", [leadId]), /Use the follow-up controls/);
    assert.equal((await target(owner, targeted)).duplicate, true);
    await assert.rejects(target(owner, { ...targeted, remarks: "Different notes with the same request." }), /request already used/);
    const attempt = { ...targeted, request_id: "b2822dec-4323-4f57-b782-c50801606e11",
      activity_id: contacted.id, expected_activity_version: 1, expected_action: "To Call", expected_due: contacted.due_date,
      expected_updated_at: resolved.lead.updated_at, status: "completed", reason: "No answer", done_at: "2026-01-04T09:00+04:00" };
    await assert.rejects(target(admin, { ...attempt, done_at: "2099-01-04T09:00+04:00" }), /Invalid overdue activity/);
    const attempted = await target(admin, attempt);
    assert.equal(attempted.activity.done_by, admin);
    assert.equal(attempted.activity.transaction_outcome, "No answer");
    assert.equal(attempted.lead.next_action_date, original.due_date);
    await db.exec("reset role; set role anon");
    await assert.rejects(db.query("select public.resolve_lead_followup($1, $2)", [leadId, JSON.stringify(input)]), /permission denied/);
    await assert.rejects(db.query("select public.resolve_overdue_activity($1, $2)", [leadId, JSON.stringify(targeted)]), /permission denied/);
    console.log("PASS local PostgreSQL: assignment, inactive user, Admin actor, validation, stale saves, replacement, and idempotency");
  } finally {
    await db.close();
  }
}

test().catch(error => { console.error(error); process.exitCode = 1; });
