const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PGlite } = require(process.env.CRM_TEST_PGLITE_MODULE || "@electric-sql/pglite");

const owner = "00000000-0000-4000-8000-000000000001";
const admin = "00000000-0000-4000-8000-000000000002";
const outsider = "00000000-0000-4000-8000-000000000003";
const leadId = "00000000-0000-4000-8000-000000000011";
const date = "2026-06-16";
const original = [
  { id: "visit", at: date, type: "Site Visit", transaction_status: "pending", text: "Held with procurement" },
  { id: "scheduled", at: date, type: "Site Visit", transaction_status: "pending", due_date: date },
  { id: "cancelled", at: date, type: "Site Visit", followup_resolution: "cancelled" },
  { id: "email", at: date, type: "Email", text: "Mentioned a visit", status: "completed" },
  { id: "call", at: date, type: "Phone Call", transaction_outcome: "Done - spoke to customer" },
  { id: "no-answer", at: date, type: "Phone Call", transaction_outcome: "Not reached - no answer" }
];
const readMigration = name => fs.readFileSync(path.join(__dirname, "../supabase/migrations", name), "utf8");

async function test() {
  const db = new PGlite();
  const pmrFields = {
    meeting_date: date, filed_by: outsider,
    products_discussed: "", competitors_mentioned: "", compliance_requirements: "", relationship_heat_score: 4,
    first_order_timing: "unknown", potential_annual_value: "500K-2M", director_action_required: "None",
    account_status: "Warm", raw_document_url: "", notes: "Synthetic PMR only.", voice_note_id: "",
    voice_note_url: "", voice_note_path: "", voice_note_mime_type: "", voice_note_size_bytes: 0, voice_note_transcript: ""
  };
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth;
      create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth to authenticated;
      create table public.profiles (id uuid primary key, status text, role text, full_name text, territory text);
      create table public.companies (id uuid primary key);
      create table public.leads (
        id uuid primary key, assigned_to uuid, assigned_salesman text, created_by uuid, territory text,
        last_activity date not null, activities jsonb, company_id uuid, tags text
          constraint synthetic_rollback check (tags not like '%force rollback%')
      );
      grant select on public.profiles to authenticated;
      grant select, update on public.leads to authenticated;
      alter table public.profiles enable row level security;
      alter table public.leads enable row level security;
      create policy own_profile on public.profiles for select to authenticated using (id = auth.uid());
    `);
    const foundation = readMigration("20260603130000_blueprint_phase1_foundation.sql");
    await db.exec(foundation.slice(foundation.indexOf("create table if not exists public.pmrs"), foundation.indexOf("drop trigger if exists pmrs")));
    const voice = readMigration("20260609120000_supabase_pmrs_and_voice_storage.sql");
    await db.exec(voice.slice(0, voice.indexOf("create index")));
    await db.exec("grant select, insert, update on public.pmrs to authenticated; alter table public.pmrs enable row level security");
    const policies = readMigration("20260803105004_replace_legacy_rls_policies.sql");
    await db.exec(policies.slice(0, policies.indexOf("alter table public.profiles enable row level security;")));
    await db.exec(policies.slice(policies.indexOf('create policy "F04 leads read"'), policies.indexOf('drop policy if exists "F04 contacts read"')));
    await db.exec(policies.slice(policies.indexOf('create policy "F04 PMRs read"'), policies.indexOf('drop policy if exists "F04 handoffs read"')));
    await db.query("insert into auth.users values ($1), ($2), ($3)", [owner, admin, outsider]);
    await db.query("insert into public.profiles values ($1,'active','salesman','Owner','UAE-North'), ($2,'active','admin','Admin','UAE-North'), ($3,'active','salesman','Other','UAE-North')", [owner, admin, outsider]);
    await db.query("insert into public.leads (id, assigned_to, last_activity, activities) values ($1, $2, '2026-09-01', $3)", [leadId, owner, JSON.stringify(original)]);
    await db.exec(readMigration("20261117044217_file_lead_pmr.sql"));

    const save = async (actor, activityId, { id = "act-firsttest", snapshot = original, type = "Site Visit", confirmed = false, fields = {} } = {}) => {
      await db.exec("set role authenticated");
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [actor]);
      return (await db.query("select public.file_lead_pmr($1, $2, $3, $4, $5) as saved", [
        leadId, JSON.stringify({ ...pmrFields, ...fields, activity_id: activityId }), JSON.stringify({ id, type }),
        JSON.stringify(snapshot), confirmed
      ])).rows[0].saved;
    };
    await assert.rejects(save(outsider, "visit"), /Lead not found/);
    for (const id of ["missing", "scheduled", "cancelled", "email", "no-answer", "call"]) {
      await assert.rejects(save(owner, id), /Choose a completed customer meeting/);
    }
    await assert.rejects(save(owner, "visit", { fields: { competitors_mentioned: "force rollback" } }), /synthetic_rollback/);
    const afterFailure = await db.query("select (select count(*) from public.pmrs)::int as count, activities from public.leads");
    assert.deepEqual(afterFailure.rows[0], { count: 0, activities: original });
    const linked = await save(owner, "visit");
    assert.equal(linked.pmr.filed_by, owner);
    assert.equal(linked.lead.last_activity, "2026-09-01");
    assert.equal(linked.lead.activities[0].type, "PMR Filed");
    assert.deepEqual(linked.lead.activities.slice(1), original);
    assert.equal((await save(owner, "visit")).duplicate, true);
    await assert.rejects(save(admin, "visit", { id: "act-adminduplicate" }), /already been filed/);
    await assert.rejects(save(admin, "call", { id: "act-adminstale", confirmed: true }), /activities changed/);
    const called = await save(admin, "call", { id: "act-admincall", confirmed: true, snapshot: linked.lead.activities });
    assert.equal(called.pmr.filed_by, admin);
    assert.equal(called.pmr.activity_id, "call");
    const unloggedId = "act-newvideomeeting";
    const unlogged = await save(admin, unloggedId, { id: unloggedId, type: "Video Call", snapshot: called.lead.activities });
    assert.equal(unlogged.lead.activities[0].type, "Video Call");
    assert.equal(unlogged.lead.activities[0].id, unlogged.pmr.activity_id);
    await db.exec("reset role; set role anon");
    await assert.rejects(db.query("select public.file_lead_pmr($1, '{}'::jsonb, '{}'::jsonb, '[]'::jsonb, false)", [leadId]), /permission denied/);
    console.log("PMR SQL passed: eligibility, role isolation, rollback, exact links, idempotent retry, stale writes and new meeting.");
  } finally {
    await db.close();
  }
}

test().catch(error => { console.error(error); process.exitCode = 1; });
