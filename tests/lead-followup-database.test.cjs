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
      create role anon; create role authenticated;
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
    const input = { request_id: "b2822dec-4323-4f57-b782-c50801606e0f", status: "cancelled", reason: "Duplicate activity",
      remarks: "Same synthetic follow-up already scheduled.", expected_action: "To Call", expected_due: "2026-01-01",
      expected_updated_at: "2026-01-02T00:00:00Z", expected_revision: "" };
    const save = async (user, values, targeted = false) => {
      await db.exec("set role authenticated");
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user]);
      const fn = targeted ? "resolve_lead_activity_cancellation" : "resolve_lead_followup";
      return (await db.query(`select public.${fn}($1, $2) as saved`, [leadId, JSON.stringify(values)])).rows[0].saved;
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
    await db.exec("reset role");
    const otherReminder = { ...original, id: "unlinked-reminder", due_date: "2025-12-31" };
    const snapshot = (await db.query("update public.leads set activities = activities || $2::jsonb where id = $1 returning updated_at::text", [leadId, JSON.stringify([otherReminder])])).rows[0];
    await db.exec(fs.readFileSync(path.join(migrations, "20261113090000_targeted_lead_followup_cancellation.sql"), "utf8"));
    const selected = { ...input, request_id: "b2822dec-4323-4f57-b782-c50801606e11", activity_id: otherReminder.id,
      expected_activity_version: 1, expected_due: otherReminder.due_date,
      expected_revision: completed.activity.id, expected_updated_at: snapshot.updated_at };
    await assert.rejects(save(other, selected, true), /Follow-up unavailable/);
    await assert.rejects(save(owner, { ...selected, expected_activity_version: 2 }, true), /activity changed/i);
    await assert.rejects(save(owner, { ...selected, remarks: "Too short" }, true), /Invalid follow-up/);
    const selectedResult = await save(owner, selected, true);
    assert.equal(selectedResult.activity.resolved_activity_id, otherReminder.id);
    assert.equal(selectedResult.activity.cancelled_by, owner);
    assert.equal(selectedResult.activity.audit_history[0].actor_name, "Assigned rep");
    assert.equal(selectedResult.lead.next_action_date, completed.lead.next_action_date);
    assert.deepEqual(selectedResult.lead.activities.find(item => item.id === otherReminder.id), otherReminder);
    assert.equal((await save(owner, selected, true)).duplicate, true);
    await assert.rejects(db.query("select public.update_activity_transaction($1,$2,1,'pending','Will try again','Retry','2099-01-04')", [leadId, otherReminder.id]), /activity changed/i);
    const cancellation = { ...input, request_id: "b2822dec-4323-4f57-b782-c50801606e10",
      activity_id: completed.lead.activities[1].id, expected_activity_version: 1,
      expected_action: "To Send Email", expected_due: "2099-01-04", expected_revision: selectedResult.activity.id,
      expected_updated_at: selectedResult.lead.updated_at };
    const cancelled = await save(admin, cancellation, true);
    assert.equal(cancelled.activity.transaction_status, "cancelled");
    assert.equal(cancelled.activity.cancelled_by, admin);
    assert.equal(cancelled.activity.audit_history[0].actor_name, "Admin actor");
    assert.equal(cancelled.lead.next_action_date, null);
    assert.equal(cancelled.lead.last_activity, "2026-01-03");
    assert.equal(cancelled.lead.activities.length, 6);
    const duplicate = await save(admin, cancellation, true);
    assert.equal(duplicate.duplicate, true);
    assert.deepEqual(duplicate.lead.activities, cancelled.lead.activities);
    await db.exec("reset role; set role anon");
    await assert.rejects(db.query("select public.resolve_lead_followup($1, $2)", [leadId, JSON.stringify(input)]), /permission denied/);
    await assert.rejects(db.query("select public.resolve_lead_activity_cancellation($1, $2)", [leadId, JSON.stringify(selected)]), /permission denied/);
    console.log("PASS local PostgreSQL: assignment, inactive user, Admin actor, validation, stale saves, replacement, and idempotency");
  } finally {
    await db.close();
  }
}

test().catch(error => { console.error(error); process.exitCode = 1; });
