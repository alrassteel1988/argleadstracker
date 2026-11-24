const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { nextManagementWorkingDate } = require("../src/services/managementTaskService");

for (const key of ["ENABLE_GOOGLE_PLACES", "ENABLE_CLAUDE_ENRICHMENT", "ENABLE_LEAD_INTELLIGENCE_AUTO_QUEUE"]) process.env[key] = "false";
const supabase = require("../supabase-client");
const users = {
  admin: { id: randomUUID(), role: "admin", status: "active", name: "Test Admin", territory: "Mixed" },
  sales: { id: randomUUID(), role: "salesman", status: "active", name: "Test Salesman", territory: "UAE-North" }
};
const writes = [];
let postgres;
let registrationError;
const fixtureColumns = new Set(["id", "company_id", "created_by", "assigned_to", "lead_status", "activities"]);
const fixtureTypes = {
  google_rating: "numeric", google_review_count: "integer", hunter_confidence_score: "numeric", estimated_value: "numeric",
  latitude: "double precision", longitude: "double precision", next_action_date: "date", last_activity: "date", first_order_date: "date",
  enriched_at: "timestamptz", enrichment_updated_at: "timestamptz", lost_at: "timestamptz", imported_at: "timestamptz",
  lost_by: "uuid", imported_by: "uuid", auto_enrichment: "jsonb"
};
require.cache[require.resolve("../supabase-client")].exports = {
  ...supabase,
  isSupabaseConfigured: () => true,
  isSupabaseAdminConfigured: () => false,
  currentSupabaseUser: async req => {
    const token = supabase.bearerToken(req);
    return users[token] ? { ...users[token], token } : null;
  },
  rest: async (resource, { method = "GET", token, body } = {}) => {
    if (method === "GET" && resource.startsWith("profiles?")) {
      return [{ id: users.sales.id, full_name: users.sales.name, role: "salesman", status: "active" }];
    }
    if (method === "GET" && /^(leads|companies)\?/.test(resource)) return [];
    if (resource === "rpc/save_initial_management_lead") {
      assert.equal(token, "admin", "The caller token must be preserved");
      writes.push({ resource, body });
      return { ...body.p_lead, id: randomUUID(), next_action: "", next_action_date: null };
    }
    if (resource === "rpc/save_new_crm_lead") {
      assert.equal(token, "sales", "Ordinary registration must keep the caller token");
      writes.push({ resource, body });
      if (registrationError) throw registrationError;
      if (postgres) {
        // Exercise the actual RPC with every field produced by the form's server serializer.
        for (const [key, value] of Object.entries(body.p_lead)) {
          assert.match(key, /^[a-z_]+$/);
          if (fixtureColumns.has(key)) continue;
          const type = fixtureTypes[key] || (value && typeof value === "object" ? "jsonb" : "text");
          await postgres.exec(`alter table public.leads add column "${key}" ${type}`);
          fixtureColumns.add(key);
        }
        await postgres.exec("set role authenticated");
        await postgres.query("select set_config('request.jwt.claim.sub',$1,false)", [users.sales.id]);
        try {
          return (await postgres.query("select public.save_new_crm_lead($1::jsonb) as lead", [JSON.stringify(body.p_lead)])).rows[0].lead;
        } catch (error) { throw Object.assign(error, {status:error.code === "42501" ? 403 : 400}); }
        finally { await postgres.exec("reset role"); }
      }
      return { ...body.p_lead, id: randomUUID(), lead_status: "PROSPECT" };
    }
    if (method === "POST" && /^(leads|companies)\?/.test(resource)) {
      if (postgres && resource.startsWith("leads?")) {
        try { await postgres.query("insert into public.leads (lead_status) values ($1)", [body.lead_status]); }
        catch (error) { throw Object.assign(error, { status: 400 }); }
      }
      writes.push({ resource, body });
      return [{ ...body, id: randomUUID() }];
    }
    throw new Error(`Unexpected synthetic Supabase request: ${method} ${resource}`);
  }
};
const server = require("../server");
async function create(token, body) {
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/leads`, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body)
  });
  return { status: response.status, body: await response.json() };
}
(async () => {
  if (process.env.CRM_TEST_PGLITE_MODULE) {
    const { PGlite } = require(process.env.CRM_TEST_PGLITE_MODULE);
    postgres = new PGlite();
    const blueprint = readFileSync(join(__dirname, "../supabase/migrations/20260603130000_blueprint_phase1_foundation.sql"), "utf8");
    const constraint = blueprint.match(/^alter table public\.leads add constraint leads_status_blueprint_check\s+check \([^;]+\);/m)[0];
    await postgres.exec(`create role anon; create role authenticated; create role service_role;
      create schema auth; grant usage on schema auth to authenticated;
      create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create function auth.jwt() returns jsonb language sql as $$select '{"email":"synthetic@example.test"}'::jsonb$$;
      create table public.profiles(id uuid primary key,full_name text,territory text,role text,status text);
      create table public.companies(id uuid primary key default gen_random_uuid(),company_name text not null,created_by uuid,
        enriched_at timestamptz,enrichment_updated_at timestamptz);
      create table public.leads(id uuid primary key default gen_random_uuid(),company_id uuid references public.companies(id),
        created_by uuid,assigned_to uuid,lead_status text not null default 'NEW',activities jsonb default '[]'); ${constraint}
      alter table public.profiles enable row level security;
      alter table public.companies enable row level security;
      alter table public.leads enable row level security;
      create policy own_profile on public.profiles for select to authenticated using(id=auth.uid());
      create policy own_company on public.companies for all to authenticated using(created_by=auth.uid()) with check(created_by=auth.uid());
      create schema private; grant usage on schema private to authenticated;
      create function private.crm_can_access_lead(target_lead_id uuid) returns boolean language sql stable security definer set search_path=pg_catalog as $$
        select exists(select 1 from public.leads where id=target_lead_id and assigned_to=auth.uid());
      $$;
      create policy own_lead_read on public.leads for select to authenticated using(private.crm_can_access_lead(id));
      create policy own_lead_insert on public.leads for insert to authenticated with check(created_by=auth.uid() and assigned_to=auth.uid());
      grant select on public.profiles to authenticated;
      grant select,insert on public.companies,public.leads to authenticated;`);
    await postgres.query("insert into public.profiles values($1,$2,$3,'salesman','active')", [users.sales.id,users.sales.name,users.sales.territory]);
    await postgres.exec(readFileSync(join(__dirname, "../supabase/migrations/20261118111941_atomic_new_lead_registration.sql"), "utf8"));
    await postgres.exec(readFileSync(join(__dirname, "../supabase/migrations/20261118113937_registration_rls_readback.sql"), "utf8"));
    await postgres.exec(readFileSync(join(__dirname, "../supabase/migrations/20261118122627_lead_creation_activity_audit.sql"), "utf8"));
  }
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    for (const title of ["New Lead Outreach", "Respond to Initial RFQ"]) {
      const saved = await create("admin", { company_name: `Synthetic ${title}`, assigned_to: users.sales.id,
        initial_management_task_title: title, next_action_date: "2099-01-01", notes: "Retain the buyer instructions." });
      assert.equal(saved.status, 201, JSON.stringify(saved.body));
      const sent = writes.at(-1).body.p_lead;
      assert.equal(sent.next_action, title);
      assert.equal(sent.next_action_date, nextManagementWorkingDate(new Date()));
      assert.equal(sent.created_by, users.admin.id);
      assert.equal(sent.assigned_to, users.sales.id);
      assert.equal(sent.notes, "Retain the buyer instructions.");
      assert.ok(sent.initial_management_task_id);
      assert.equal(sent.activities.length, 1);
      assert.equal(sent.activities[0].lead_creation, true);
      assert.equal(sent.activities[0].created_by, users.admin.id);
      assert.ok(!Object.hasOwn(sent, "initial_management_task_title"), "UI-only field must not leak into SQL columns");
    }
    assert.equal(writes.length, 2, "Admin registration must use only the atomic company/lead/task RPC");
    const badTitle = await create("admin", { company_name: "Invalid choice fixture", assigned_to: users.sales.id, initial_management_task_title: "Invented" });
    assert.equal(badTitle.status, 400);
    assert.equal(writes.length, 2, "Invalid choice must not create an orphan company");
    for (const body of [{}, { next_action: "", next_action_date: "", notes: "Notes only" }]) {
      const saved = await create("sales", { company_name: "Own optional follow-up fixture", initial_management_task_title: "Respond to Initial RFQ", ...body });
      assert.equal(saved.status, 201, JSON.stringify(saved.body));
      assert.equal(saved.body.lead_status, "NEW", "Keep the existing API stage label");
      if (postgres) assert.equal((await postgres.query("select lead_status from public.leads where id=$1", [saved.body.id])).rows[0].lead_status, "PROSPECT");
      const sent = writes.at(-1).body.p_lead;
      assert.equal(sent.next_action, "");
      assert.equal(sent.next_action_date, null);
      assert.equal(sent.activities.length, 1);
      assert.equal(sent.activities[0].lead_creation, true);
      assert.equal(sent.activities[0].created_by, users.sales.id);
      assert.equal(saved.body.activities.length, 1);
      if (postgres) assert.equal(saved.body.activities[0].id, `lead-created-${saved.body.id}`);
      assert.equal(sent.assigned_to, users.sales.id);
      assert.ok(!sent.initial_management_task_id);
    }
    const beforeInvalid = writes.length;
    for (const body of [{ next_action: "To Call" }, { next_action_date: "2099-01-01" }, { next_action: "To Call", next_action_date: "2099-02-30" }]) {
      assert.equal((await create("sales", { company_name: "Incomplete schedule fixture", ...body })).status, 400);
    }
    assert.equal(writes.length, beforeInvalid);
    const scheduled = await create("sales", { company_name: "Explicit schedule fixture", next_action: "To Visit", next_action_date: "2099-01-01" });
    assert.equal(scheduled.status, 201, JSON.stringify(scheduled.body));
    assert.equal(writes.at(-1).body.p_lead.activities.filter(item => item.reminder).length, 1);
    assert.ok(writes.every(item => item.resource.startsWith("rpc/")), "Registration must never split company and lead writes");
    registrationError = Object.assign(new Error("Could not find public.save_new_crm_lead(p_lead) in the schema cache"), { status: 404 });
    const missingMigration = await create("sales", { company_name: "Migration missing fixture" });
    assert.equal(missingMigration.status, 503);
    assert.match(missingMigration.body.error, /lead was not saved/i);
    registrationError = Object.assign(new Error("permission denied by row-level security"), { status: 403 });
    const deniedSave = await create("sales", { company_name: "RLS denial fixture" });
    assert.equal(deniedSave.status, 403);
    assert.ok(writes.every(item => item.resource.startsWith("rpc/")), "RPC failures must not fall back to non-atomic or service-role inserts");
    if (postgres) {
      const counts = (await postgres.query("select (select count(*)::int from public.companies) as companies,(select count(*)::int from public.leads) as leads")).rows[0];
      assert.deepEqual(counts, {companies:3,leads:3});
      await postgres.exec(readFileSync(join(__dirname,"../supabase/migrations/20261124050745_lead_territory_options.sql"),"utf8"));
    }
    registrationError = null;
    for (const territory of ["Qatar","India","Netherlands","Turkmenistan","Romania"]) {
      const saved=await create("sales",{company_name:`International ${territory}`,territory,created_by:users.admin.id,assigned_to:users.admin.id});
      assert.equal(saved.status,201,JSON.stringify(saved.body));
      assert.equal(saved.body.territory,territory);
      assert.equal(writes.at(-1).body.p_lead.created_by,users.sales.id);
      assert.equal(writes.at(-1).body.p_lead.assigned_to,users.sales.id);
      if(postgres) assert.equal((await postgres.query("select territory from public.leads where id=$1",[saved.body.id])).rows[0].territory,territory);
    }
    for (const token of ["admin","sales"]) {
      const before=writes.length;
      assert.equal((await create(token,{company_name:"Invalid territory",territory:"x".repeat(101)})).status,400);
      assert.equal((await create(token,{company_name:"Invalid territory",territory:"India\nPrivate"})).status,400);
      assert.equal(writes.length,before,"Territory validation must happen before any database write");
    }
    console.log("PASS Supabase new-lead API task choices, atomic writes, optional follow-ups and role isolation");
  } finally { await new Promise(resolve => server.close(resolve)); await postgres?.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
