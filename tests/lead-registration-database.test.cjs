const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { randomUUID } = require("node:crypto");
const { PGlite } = require(process.env.CRM_TEST_PGLITE_MODULE || "@electric-sql/pglite");

test("new lead RPC preserves RLS and rolls company and lead back together on the blueprint schema", async () => {
  const db = new PGlite();
  const admin = randomUUID(), sales = randomUUID(), peer = randomUUID(), inactive = randomUUID();
  try {
    const blueprint = readFileSync(join(__dirname, "../supabase/migrations/20260603130000_blueprint_phase1_foundation.sql"), "utf8");
    const constraint = blueprint.match(/^alter table public\.leads add constraint leads_status_blueprint_check\s+check \([^;]+\);/m)[0];
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create schema auth; grant usage on schema auth to authenticated;
      create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create table public.profiles(id uuid primary key,role text,status text,full_name text,territory text);
      create table public.companies(id uuid primary key default gen_random_uuid(),company_name text not null,created_by uuid,
        google_rating numeric,opening_hours jsonb,enriched_at timestamptz,enrichment_updated_at timestamptz);
      create table public.leads(id uuid primary key default gen_random_uuid(),company_id uuid references public.companies(id),
        company_name text not null,created_by uuid,assigned_to uuid,assigned_salesman text,territory text,
        lead_status text not null default 'NEW',notes text,activities jsonb default '[]',next_action text not null default 'Qualify lead',
        next_action_date date default current_date,first_order_date date,latitude numeric,activity_purpose text,products_services_remarks text,
        constraint reject_fixture check (company_name <> 'Rejected fixture'));
      ${constraint}
      alter table public.profiles enable row level security;
      alter table public.companies enable row level security;
      alter table public.leads enable row level security;
      create policy own_profile on public.profiles for select to authenticated using(id=auth.uid());
      create policy own_company on public.companies for all to authenticated using(created_by=auth.uid()) with check(created_by=auth.uid());
      create policy own_lead on public.leads for all to authenticated using(created_by=auth.uid()) with check(created_by=auth.uid());
      grant select on public.profiles to authenticated;
      grant select,insert on public.companies,public.leads to authenticated;`);
    for (const [id, role, status, name] of [[admin,"admin","active","Admin"],[sales,"salesman","active","Salesman"],
      [peer,"salesman","active","Peer"],[inactive,"salesman","disabled","Inactive"]]) {
      await db.query("insert into public.profiles values($1,$2,$3,$4,'Dubai')", [id,role,status,name]);
    }
    await db.exec(readFileSync(join(__dirname, "../supabase/migrations/20261118111941_atomic_new_lead_registration.sql"), "utf8"));
    const as = async (id, role="authenticated") => {
      await db.exec(`set role ${role}`);
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id || ""]);
    };
    const input = (company_name, extra={}) => ({company_name,created_by:sales,assigned_to:sales,assigned_salesman:"Salesman",
      territory:"Dubai",lead_status:"NEW",next_action:"",next_action_date:null,notes:"Synthetic notes retained.",activities:[],...extra});
    const save = async body => (await db.query("select public.save_new_crm_lead($1::jsonb) as lead", [JSON.stringify(body)])).rows[0].lead;
    const counts = async () => {
      await db.exec("reset role");
      return (await db.query("select (select count(*)::int from public.companies) as companies,(select count(*)::int from public.leads) as leads")).rows[0];
    };

    await as(null,"anon");
    await assert.rejects(() => save(input("Anonymous fixture")), {code:"42501"});
    await as(sales,"service_role");
    await assert.rejects(() => save(input("Service fixture")), {code:"42501"});
    await as(inactive);
    await assert.rejects(() => save(input("Inactive fixture",{created_by:inactive,assigned_to:inactive})), {code:"42501"});
    await as(sales);
    for (const extra of [{created_by:admin},{assigned_to:peer},{assigned_to:null},{assigned_salesman:"Peer"},
      {territory:"Saudi"},{initial_management_task_id:randomUUID()}]) {
      await assert.rejects(() => save(input("Forged fixture",extra)), {code:"42501"});
    }
    await assert.rejects(() => save(input("Unsupported fixture",{removed_at:"2026-01-01"})), {code:"22023"});
    assert.deepEqual(await counts(), {companies:0,leads:0});

    await as(sales);
    const saved = await save(input("Blank follow-up fixture", {products_services_remarks:"Old optional company columns may be absent."}));
    assert.equal(saved.lead_status,"PROSPECT");
    assert.equal(saved.next_action,"");
    assert.equal(saved.next_action_date,null);
    assert.deepEqual(saved.activities,[]);
    assert.equal(saved.notes,"Synthetic notes retained.");
    assert.equal(saved.products_services_remarks,"Old optional company columns may be absent.");
    const reused = await save(input("Reused visible company",{company_id:saved.company_id,next_action:"To Call",next_action_date:"2099-01-01",
      activities:[{id:"reminder",type:"Reminder",created_by:sales}]}));
    assert.equal(reused.company_id,saved.company_id);
    assert.equal(reused.activities.length,1);
    assert.deepEqual(await counts(), {companies:1,leads:2});

    await as(peer);
    assert.equal((await db.query("select * from public.leads")).rows.length,0);
    await assert.rejects(() => save(input("Invisible company",{created_by:peer,assigned_to:peer,assigned_salesman:"Peer",company_id:saved.company_id})), {code:"42501"});
    await as(sales);
    for (const [body, code] of [
      [input("Rejected fixture"),"23514"],
      [input("Unknown stage fixture",{lead_status:"LOST"}),"23514"],
      [input("Bad date fixture",{next_action_date:"not-a-date"}),"22007"],
      [input("Bad lead numeric",{latitude:"bad"}),"22P02"],
      [input("Bad company numeric",{google_rating:"bad"}),"22P02"]
    ]) {
      await assert.rejects(() => save(body), {code});
      assert.deepEqual(await counts(), {companies:1,leads:2}, "Every failed save must roll its company back too");
      await as(sales);
    }
    await db.exec(`reset role;
      create policy reject_insert_fixture on public.leads as restrictive for insert to authenticated
        with check(company_name <> 'RLS denied fixture');`);
    await as(sales);
    await assert.rejects(() => save(input("RLS denied fixture")), {code:"42501"});
    assert.deepEqual(await counts(), {companies:1,leads:2});
    await db.exec(`drop policy reject_insert_fixture on public.leads;
      create function public.reject_fixture_write() returns trigger language plpgsql as $$begin raise exception 'Synthetic audit failure'; end$$;
      create trigger reject_fixture_write after insert on public.leads for each row execute function public.reject_fixture_write();`);
    await as(sales);
    await assert.rejects(() => save(input("Audit failure fixture")), /Synthetic audit failure/);
    assert.deepEqual(await counts(), {companies:1,leads:2});

    await db.exec("drop trigger reject_fixture_write on public.leads; alter table public.leads drop constraint leads_status_blueprint_check");
    await as(sales);
    const modern = await save(input("Modern schema fixture"));
    assert.equal(modern.lead_status,"NEW", "A schema that accepts NEW must not have its stage rewritten");
    await as(admin);
    const ordinaryAdmin = await save(input("Unassigned Admin fixture",{created_by:admin,assigned_to:null,assigned_salesman:"Unassigned"}));
    assert.equal(ordinaryAdmin.created_by,admin);
    await db.exec("reset role");
    const security = (await db.query(`select prosecdef,proconfig,has_function_privilege('anon',oid,'execute') as anon,
      has_function_privilege('authenticated',oid,'execute') as authenticated,
      has_function_privilege('service_role',oid,'execute') as service from pg_proc where oid='public.save_new_crm_lead(jsonb)'::regprocedure`)).rows[0];
    assert.equal(security.prosecdef,false);
    assert.deepEqual(security.proconfig,["search_path=pg_catalog"]);
    assert.equal(security.anon,false);
    assert.equal(security.authenticated,true);
    assert.equal(security.service,false);
  } finally { await db.close(); }
});
