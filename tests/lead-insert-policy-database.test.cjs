const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { PGlite } = require(process.env.CRM_TEST_PGLITE_MODULE || "@electric-sql/pglite");

const migration = name => readFileSync(join(__dirname, "../supabase/migrations", name), "utf8");
const repair = migration("20261128045804_lead_insert_policy_boundary.sql");
const policy = (source, name) => {
  const statement = source.match(new RegExp(`create policy "${name}"[^;]+;`));
  assert.ok(statement, `Missing released policy: ${name}`);
  return statement[0];
};

async function fixture(international) {
  const db = new PGlite();
  const ids = Object.fromEntries(["admin", "director", "manager", "sales", "peer", "inactive", "inactiveAdmin", "other", "mixed", "unnamed"].map(key => [key, randomUUID()]));
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; grant usage on schema auth to authenticated;
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create schema private; grant usage on schema private to authenticated;
    create table public.profiles(id uuid primary key,role text,status text,full_name text,territory text);
    alter table public.profiles enable row level security;
    create policy own_profile on public.profiles for select to authenticated using(id=auth.uid());
    grant select on public.profiles to authenticated;
    create table public.leads(id uuid primary key default gen_random_uuid(),company_name text not null,
      created_by uuid,assigned_to uuid,assigned_salesman text not null default 'Unassigned',territory text not null default 'Dubai',
      is_archived boolean not null default false,lead_status text default 'NEW',closed_by uuid);
    alter table public.leads enable row level security;
    alter table public.leads force row level security;
    grant select,insert,update,delete on public.leads to authenticated;
    grant insert on public.leads to service_role;`);
  const legacy = migration("20260803105004_replace_legacy_rls_policies.sql");
  await db.exec(legacy.match(/create or replace function private\.crm_is_leadership\(\)[\s\S]+?\$\$;/)[0]);
  await db.exec(`create function private.lifecycle_admin() returns boolean language sql stable security definer set search_path=pg_catalog as $$
      select exists(select 1 from public.profiles where id=auth.uid() and status='active' and role='admin')$$;
    create policy preserved_read on public.leads for select to authenticated using(assigned_to=auth.uid() or private.crm_is_leadership());
    create policy preserved_update on public.leads for update to authenticated using(assigned_to=auth.uid() or private.crm_is_leadership());
    create policy preserved_delete on public.leads for delete to authenticated using(false);`);
  await db.exec(policy(legacy, "F04 leads insert"));
  await db.exec(policy(migration(international ? "20261124050745_lead_territory_options.sql" : "20260807170000_repair_salesman_lead_insert_policy.sql"), "Salesmen can insert self-owned leads"));
  await db.exec(policy(migration("20261120050707_lead_lifecycle_archive.sql"), "Lifecycle lead boundary"));
  for (const [key, id] of Object.entries(ids)) {
    const role = ["sales", "peer", "inactive", "mixed", "unnamed"].includes(key) ? "salesman" : key === "inactiveAdmin" ? "admin" : key;
    await db.query("insert into public.profiles values($1,$2,$3,$4,$5)", [id, role, key.startsWith("inactive") ? "disabled" : "active", key === "unnamed" ? null : key, key === "mixed" ? "Mixed" : "UAE-North"]);
  }
  await db.query("insert into public.leads(company_name,created_by,territory) values('Preserved legacy row',$1,'')", [ids.sales]);
  const as = async (id, role = "authenticated") => {
    await db.exec(`set role ${role}`);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id || ""]);
  };
  const insert = (extra = {}) => {
    const row = { company_name: "Synthetic policy fixture", created_by: ids.sales, assigned_to: ids.sales, assigned_salesman: "sales", territory: "India", is_archived: false, lead_status: "NEW", closed_by: null, ...extra };
    return db.query(`insert into public.leads(company_name,created_by,assigned_to,assigned_salesman,territory,is_archived,lead_status,closed_by)
      values($1,$2,$3,$4,$5,$6,$7,$8)`, Object.values(row));
  };
  const snapshot = async () => {
    await db.exec("reset role");
    return (await db.query(`select
      (select jsonb_agg(to_jsonb(l) order by id) from public.leads l) as rows,
      (select jsonb_agg(to_jsonb(p) order by policyname) from pg_policies p where schemaname='public' and tablename='leads' and cmd<>'INSERT') as other_policies,
      (select jsonb_build_object('rls',relrowsecurity,'forced',relforcerowsecurity,'acl',relacl) from pg_class where oid='public.leads'::regclass) as security,
      (select jsonb_agg(jsonb_build_object('name',oid::regprocedure::text,'definition',pg_get_functiondef(oid),'acl',proacl) order by oid)
        from pg_proc where pronamespace in ('auth'::regnamespace,'private'::regnamespace)) as helpers`)).rows[0];
  };
  return { db, ids, as, insert, snapshot };
}

for (const international of [false, true]) test(`direct lead INSERT closes the legacy permissive bypass (international policy: ${international})`, async () => {
  const { db, ids, as, insert, snapshot } = await fixture(international);
  try {
    const before = await snapshot();
    await db.exec(repair);
    assert.deepEqual(await snapshot(), before, "Repair must not rewrite records, grants, helpers or non-INSERT policies");
    await as(ids.sales);
    for (const extra of [{ assigned_to: null, assigned_salesman: "Unassigned" }, { assigned_to: null }, { assigned_to: ids.peer },
      { assigned_salesman: "peer" }, { assigned_salesman: "Unassigned" }, { created_by: ids.peer }, { created_by: null }]) {
      await assert.rejects(() => insert(extra), { code: "42501" }, `Reject forged ownership: ${JSON.stringify(extra)}`);
    }
    for (const territory of ["", "   ", "x".repeat(101), "India\nPrivate", "India\tPrivate", "__custom_territory__"]) {
      await assert.rejects(() => insert({ territory }), { code: "42501" });
    }
    await assert.rejects(() => insert({ territory: null }), error => ["42501", "23502"].includes(error.code));
    for (const territory of ["UAE-North", "Qatar", "India", "Iraq", "Syria", "Netherlands", "Turkmenistan", "Mixed", "New Zealand", "x".repeat(100)]) await insert({ territory });
    await assert.rejects(() => insert({ is_archived: true }), { code: "42501" }, "The restrictive archive boundary must still apply");
    for (const key of ["mixed", "unnamed"]) {
      await as(ids[key]);
      await insert({ created_by: ids[key], assigned_to: ids[key], assigned_salesman: key === "unnamed" ? "synthetic@example.test" : key });
    }
    for (const key of ["admin", "director", "manager"]) {
      await as(ids[key]);
      await insert({ created_by: ids[key], assigned_to: ids.peer, assigned_salesman: "peer" });
      await insert({ created_by: ids[key], assigned_to: null, assigned_salesman: "Unassigned" });
      await assert.rejects(() => insert({ created_by: ids[key], territory: "" }), { code: "42501" });
      await assert.rejects(() => insert({ created_by: ids.sales }), { code: "42501" });
    }
    for (const key of ["inactive", "inactiveAdmin", "other"]) {
      await as(ids[key]);
      await assert.rejects(() => insert({ created_by: ids[key], assigned_to: ids[key], assigned_salesman: key }), { code: "42501" });
    }
    await as(null);
    await assert.rejects(() => insert(), { code: "42501" });
    await as(ids.sales, "anon");
    await assert.rejects(() => insert(), { code: "42501" });
    await as(null, "service_role");
    await insert({ company_name: "Trusted server import", created_by: null, assigned_to: null });
    await as(ids.peer);
    assert.equal((await db.query("select count(*)::int count from public.leads")).rows[0].count, 3, "Only leadership-assigned rows are visible to the peer, not geography or creator history");
    await db.exec("reset role");
    const policies = (await db.query("select policyname,roles from pg_policies where schemaname='public' and tablename='leads' and cmd='INSERT'")).rows;
    assert.deepEqual(policies, [{ policyname: "CRM lead insert", roles: ["authenticated"] }]);
    const installed = await snapshot();
    await db.exec(repair);
    assert.deepEqual(await snapshot(), installed, "A safe rerun must not change data or unrelated security");
  } finally { await db.close(); }
});

test("policy repair fails closed on unexpected permissive policies or disabled RLS", async () => {
  const { db, snapshot } = await fixture(true);
  try {
    for (const command of ["insert", "all"]) {
      await db.exec(`create policy unexpected_access on public.leads for ${command} to authenticated ${command === "all" ? "using(true)" : ""} with check(true)`);
      const before = await snapshot();
      await assert.rejects(() => db.exec(repair), /Unexpected permissive lead insert policy/);
      await db.exec("rollback");
      assert.deepEqual(await snapshot(), before, "Failed preflight must leave the policy set and data untouched");
      await db.exec("drop policy unexpected_access on public.leads");
    }
    await db.exec("alter table public.leads disable row level security");
    await assert.rejects(() => db.exec(repair), /Lead RLS must already be enabled/);
    await db.exec("rollback");
    assert.equal((await snapshot()).security.rls, false, "Migration must not silently change RLS configuration");
  } finally { await db.close(); }
});
