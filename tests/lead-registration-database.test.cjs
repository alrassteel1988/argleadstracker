const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { randomUUID } = require("node:crypto");
const { PGlite } = require(process.env.CRM_TEST_PGLITE_MODULE || "@electric-sql/pglite");

for (const creationAudit of [false, true, "international"]) test(`new lead RPC preserves RLS and atomicity on the blueprint schema (creation audit: ${creationAudit})`, async () => {
  const international = creationAudit === "international";
  const db = new PGlite();
  const admin = randomUUID(), sales = randomUUID(), peer = randomUUID(), inactive = randomUUID();
  try {
    const blueprint = readFileSync(join(__dirname, "../supabase/migrations/20260603130000_blueprint_phase1_foundation.sql"), "utf8");
    const constraint = blueprint.match(/^alter table public\.leads add constraint leads_status_blueprint_check\s+check \([^;]+\);/m)[0];
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create schema auth; grant usage on schema auth to authenticated;
      create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create function auth.jwt() returns jsonb language sql as $$select '{"email":"synthetic@example.test"}'::jsonb$$;
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
      create schema private; grant usage on schema private to authenticated;
      create function private.crm_can_access_lead(target_lead_id uuid) returns boolean language sql stable security definer set search_path=pg_catalog as $$
        select exists(select 1 from public.profiles where id=auth.uid() and role='admin' and status='active')
          or exists(select 1 from public.leads lead join public.profiles profile on profile.id=auth.uid()
            where lead.id=target_lead_id and profile.status='active' and profile.role='salesman'
              and (lead.assigned_to=profile.id or (lead.assigned_to is null and nullif(btrim(lead.assigned_salesman),'') is not null
                and lower(btrim(lead.assigned_salesman))=lower(btrim(profile.full_name))
                and not exists(select 1 from public.profiles other where other.id<>profile.id and other.role='salesman'
                  and other.status='active' and lower(btrim(other.full_name))=lower(btrim(profile.full_name))))));
      $$;
      create policy own_lead_read on public.leads for select to authenticated using(private.crm_can_access_lead(id));
      create policy own_lead_insert on public.leads for insert to authenticated with check(created_by=auth.uid());
      grant select on public.profiles to authenticated;
      grant select,insert on public.companies,public.leads to authenticated;`);
    for (const [id, role, status, name] of [[admin,"admin","active","Admin"],[sales,"salesman","active","Salesman"],
      [peer,"salesman","active","Peer"],[inactive,"salesman","disabled","Inactive"]]) {
      await db.query("insert into public.profiles values($1,$2,$3,$4,'Dubai')", [id,role,status,name]);
    }
    await db.exec(readFileSync(join(__dirname, "../supabase/migrations/20261118111941_atomic_new_lead_registration.sql"), "utf8"));
    await db.exec(readFileSync(join(__dirname, "../supabase/migrations/20261118113937_registration_rls_readback.sql"), "utf8"));
    if (creationAudit) await db.exec(readFileSync(join(__dirname, "../supabase/migrations/20261118122627_lead_creation_activity_audit.sql"), "utf8"));
    if (international) {
      await db.exec(`drop policy own_lead_insert on public.leads;
        create policy admin_lead_insert on public.leads for insert to authenticated with check (
          exists(select 1 from public.profiles where id=auth.uid() and role='admin' and status='active'));`);
      await db.exec(readFileSync(join(__dirname,"../supabase/migrations/20261124050745_lead_territory_options.sql"),"utf8"));
    }
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
      ...(international ? [] : [{territory:"Saudi"}]),{initial_management_task_id:randomUUID()}]) {
      await assert.rejects(() => save(input("Forged fixture",extra)), {code:"42501"});
    }
    await assert.rejects(() => save(input("Unsupported fixture",{removed_at:"2026-01-01"})), {code:"22023"});
    assert.deepEqual(await counts(), {companies:0,leads:0});

    await as(sales);
    const saved = await save(input("Blank follow-up fixture", {products_services_remarks:"Old optional company columns may be absent."}));
    assert.equal(saved.lead_status,"PROSPECT");
    assert.equal(saved.next_action,"");
    assert.equal(saved.next_action_date,null);
    assert.equal(saved.activities.length, creationAudit ? 1 : 0);
    if (creationAudit) {
      assert.equal(saved.activities[0].id, `lead-created-${saved.id}`);
      assert.equal(saved.activities[0].created_by, sales);
      assert.equal(saved.activities[0].created_by_name, "Salesman");
      assert.equal(saved.activities[0].created_by_role, "salesman");
      assert.equal(saved.activities[0].transaction_status, "recorded");
    }
    assert.equal(saved.notes,"Synthetic notes retained.");
    assert.equal(saved.products_services_remarks,"Old optional company columns may be absent.");
    const reused = await save(input("Reused visible company",{company_id:saved.company_id,next_action:"To Call",next_action_date:"2099-01-01",
      activities:[{id:"reminder",type:"Reminder",created_by:sales}]}));
    assert.equal(reused.company_id,saved.company_id);
    assert.equal(reused.activities.length, creationAudit ? 2 : 1);
    if (creationAudit) {
      assert.equal(reused.activities.filter(item => item.lead_creation).length, 1);
      assert.equal(reused.activities.filter(item => item.type === "Reminder").length, 1);
    }
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
      create policy reject_read_fixture on public.leads as restrictive for select to authenticated
        using(company_name <> 'RLS read denied fixture');`);
    await as(sales);
    await assert.rejects(() => save(input("RLS read denied fixture")), {code:"P0002"});
    assert.deepEqual(await counts(), {companies:1,leads:2}, "A denied read-back must roll back both inserts");
    await db.exec(`drop policy reject_read_fixture on public.leads;
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
    if (international) {
      await as(sales);
      for (const territory of ["Qatar","India","Netherlands","Turkmenistan","Romania","  New   Zealand  "]) {
        const row=await save(input(`International ${territory}`,{territory}));
        assert.equal(row.territory,territory.trim().replace(/\s+/g," "));
        assert.equal(row.assigned_to,sales); assert.equal(row.created_by,sales);
      }
      const before=await counts(); await as(sales);
      for (const territory of ["", "x".repeat(101),"India\nPrivate", "__custom_territory__",{country:"India"},17,null]) {
        await assert.rejects(()=>save(input("Invalid territory",{territory})),{code:"22023"});
      }
      await assert.rejects(()=>db.query(`insert into public.leads(company_name,created_by,assigned_to,territory) values('Forged direct insert',$1,$2,'India')`,[sales,peer]),{code:"42501"});
      assert.deepEqual(await counts(),before,"Territory rejection cannot leave orphan companies");
      await as(peer);
      assert.equal((await db.query("select * from public.leads")).rows.length,0,"Customer geography never grants a peer lead access");
      await as(admin);
      const adminInternational=await save(input("Admin international",{created_by:admin,assigned_to:null,assigned_salesman:"Unassigned",territory:"Netherlands"}));
      assert.equal(adminInternational.territory,"Netherlands");
    }
  } finally { await db.close(); }
});
