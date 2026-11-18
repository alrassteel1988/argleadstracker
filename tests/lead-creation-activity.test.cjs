const assert = require("node:assert/strict");
const test = require("node:test");
const { withLeadCreationActivity, assertLeadCreationActivitiesUnchanged, activityAuthorFields } = require("../src/services/activityWorkflowService");

test("lead creation records the actual actor once without rewriting saved history", () => {
  const user = { id: "sales", name: "Sales Test", role: "salesman" };
  const saved = { id: "old", type: "Call", text: "Preserve this" };
  const lead = { id: "lead-1", activities: [saved, { lead_creation: true, created_by: "forged" }] };
  const result = withLeadCreationActivity(lead, user, "2026-11-18T12:00:00.000Z");
  assert.equal(result.activities.length, 2);
  assert.deepEqual(result.activities[1], saved);
  assert.equal(result.activities[0].text, "New Lead Account creation");
  assert.equal(result.activities[0].type, "Lead creation");
  assert.equal(result.activities[0].created_by, user.id);
  assert.equal(result.activities[0].created_by_name, user.name);
  assert.equal(result.activities[0].created_by_role, "salesman");
  assert.equal(result.activities[0].transaction_status, "recorded");
  assert.equal(result.activities[0].reminder, undefined);
  assert.equal(result.activities[0].audit_history[0].actor_id, user.id);
  assert.deepEqual(withLeadCreationActivity(lead, user, "2026-11-18T12:00:00.000Z"), result);
  assert.equal(lead.activities.length, 2, "The caller's existing history is not mutated");
  const assigned = withLeadCreationActivity({ id: "lead-2", assigned_to: user.id }, { id: "admin", full_name: "Admin Test", role: "admin" });
  assert.equal(assigned.activities[0].created_by, "admin");
  assert.equal(assigned.activities[0].created_by_name, "Admin Test");
  assert.equal(assigned.activities[0].created_by_role, "admin");
  assert.deepEqual(activityAuthorFields({ id: "x", email: "test@example.test", role: "salesman" }), {
    created_by: "x", created_by_name: "test@example.test", created_by_role: "salesman"
  });
});

test("creation entries cannot be altered, removed, duplicated or injected on edit", () => {
  const lead = withLeadCreationActivity({ id: "one" }, { id: "admin", name: "Admin", role: "admin" });
  const event = lead.activities[0];
  assert.doesNotThrow(() => assertLeadCreationActivitiesUnchanged(lead.activities, [{ id: "new-call" }, event]));
  for (const next of [[], [{ ...event, text: "Changed" }], [event, event], [{ ...event, lead_creation: false }]]) {
    assert.throws(() => assertLeadCreationActivitiesUnchanged(lead.activities, next), /creation history/);
  }
  assert.throws(() => assertLeadCreationActivitiesUnchanged([], [event]), /creation history/);
  assert.doesNotThrow(() => assertLeadCreationActivitiesUnchanged([{ id: "legacy" }], [{ id: "legacy", text: "updated" }]));
});

test("database stamps authenticated creation atomically and protects history without changing RLS", async () => {
  const { PGlite } = require(process.env.CRM_TEST_PGLITE_MODULE || "@electric-sql/pglite");
  const { readFileSync } = require("node:fs");
  const { join } = require("node:path");
  const { randomUUID } = require("node:crypto");
  const db = new PGlite();
  const admin = randomUUID(), sales = randomUUID(), peer = randomUUID(), inactive = randomUUID(), legacy = randomUUID(), legacyNull = randomUUID();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; grant usage on schema auth to authenticated,anon,service_role;
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create function auth.role() returns text language sql stable as $$select current_setting('request.jwt.claim.role',true)$$;
      create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('email','synthetic@example.test')$$;
      create table public.profiles(id uuid primary key, full_name text, role text, status text);
      create table public.companies(id uuid primary key, created_by uuid);
      create table public.leads(id uuid primary key default gen_random_uuid(), created_by uuid, assigned_to uuid,
        activities jsonb default '[]', notes text,
        lead_status text check(lead_status in ('PROSPECT','OUTREACH','ENGAGED','SAMPLING','ACTIVE','DORMANT')));
      insert into public.leads(id,activities) values('${legacy}','[{"id":"legacy","text":"Unchanged"}]');
      insert into public.leads(id,activities) values('${legacyNull}','null'::jsonb);
      alter table public.profiles enable row level security;
      alter table public.leads enable row level security;
      create policy own_profile on public.profiles for select to authenticated using(id=auth.uid());
      create policy own_lead on public.leads for all to authenticated using(assigned_to=auth.uid() or exists(select 1 from public.profiles where id=auth.uid() and role='admin'))
        with check(created_by=auth.uid() and (assigned_to=auth.uid() or exists(select 1 from public.profiles where id=auth.uid() and role='admin')));
      grant select on public.profiles to authenticated,service_role;
      grant select,insert,update on public.leads to authenticated,service_role;
      grant insert on public.companies to authenticated;
      create function public.test_atomic_registration(company uuid, lead uuid, status text) returns void language plpgsql security invoker as $$
        begin insert into public.companies values(company,auth.uid());
          insert into public.leads(id,created_by,assigned_to,lead_status) values(lead,auth.uid(),auth.uid(),status); end;
      $$;`);
    for (const person of [[admin,"Admin Test","admin","active"],[sales,"Sales Test","salesman","active"],
      [peer,"Peer Test","salesman","active"],[inactive,"Inactive","salesman","inactive"]]) {
      await db.query("insert into public.profiles values($1,$2,$3,$4)", person);
    }
    const policiesBefore = (await db.query("select * from pg_policies order by tablename,policyname")).rows;
    await db.exec(readFileSync(join(__dirname,"../supabase/migrations/20261118122627_lead_creation_activity_audit.sql"),"utf8"));
    assert.deepEqual((await db.query("select * from pg_policies order by tablename,policyname")).rows, policiesBefore);
    assert.deepEqual((await db.query("select activities from public.leads where id=$1",[legacy])).rows[0].activities,[{id:"legacy",text:"Unchanged"}]);
    const actor = async (id, role = "authenticated") => {
      await db.exec(`set role ${role}`);
      await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role',$2,false)",[id || "",role]);
    };
    const insert = async (creator, assignee, activities = [], status = "PROSPECT") => (await db.query(
      "insert into public.leads(created_by,assigned_to,activities,lead_status) values($1,$2,$3,$4) returning *",
      [creator,assignee,JSON.stringify(activities),status])).rows[0];
    await actor(sales);
    await assert.rejects(insert(admin,sales), /authenticated lead creator/);
    await actor(inactive);
    await assert.rejects(insert(inactive,inactive), /active CRM creator/);
    await actor(null,"anon");
    await assert.rejects(insert(sales,sales), /permission denied/);
    await actor(sales);
    const saved = await insert(sales,sales,[{lead_creation:true,created_by:admin},{id:"reminder",type:"Reminder",created_by:admin,text:"To Call",due_date:"2099-01-01"}]);
    assert.equal(saved.activities.length,2);
    const event = saved.activities[0];
    assert.equal(event.created_by,sales);
    assert.equal(event.created_by_name,"Sales Test");
    assert.equal(event.created_by_role,"salesman");
    assert.equal(event.text,"New Lead Account creation");
    assert.equal(event.type,"Lead creation");
    assert.equal(event.id,`lead-created-${saved.id}`);
    assert.equal(saved.activities[1].created_by,sales);
    assert.equal(saved.activities[1].due_date,"2099-01-01");
    for (const activities of [[],[...saved.activities,event],[{...event,created_by:admin}],[{...event,lead_creation:false}]]) {
      await assert.rejects(db.query("update public.leads set activities=$1 where id=$2",[JSON.stringify(activities),saved.id]), /creation history/);
    }
    await db.query("update public.leads set notes='ordinary edit',activities=$1 where id=$2",[JSON.stringify([{id:"call",type:"Call"},...saved.activities]),saved.id]);
    assert.deepEqual((await db.query("select activities from public.leads where id=$1",[saved.id])).rows[0].activities[1],event);
    await assert.rejects(db.query("select public.test_atomic_registration($1,$2,'INVALID')",[randomUUID(),randomUUID()]), /check constraint/);
    await assert.rejects(db.query("select public.test_atomic_registration($1,$2,'NEW')",[randomUUID(),randomUUID()]), /check constraint/,
      "The blueprint constraint must not be relaxed to hide the existing registration-stage mismatch");
    await actor(peer);
    assert.equal((await db.query("select * from public.leads where id=$1",[saved.id])).rows.length,0);
    await actor(admin);
    const assigned = await insert(admin,sales);
    assert.equal(assigned.activities[0].created_by,admin);
    assert.equal(assigned.activities[0].created_by_role,"admin");
    await actor(null,"service_role");
    const imported = await insert(admin,sales);
    assert.equal(imported.activities[0].created_by,admin,"Trusted imports retain their verified active creator");
    await assert.rejects(insert(null,sales), /authenticated lead creator/);
    await db.exec("reset role");
    assert.equal((await db.query("select count(*)::int as total from public.companies")).rows[0].total,0,"Failed registration leaves no company or creation event");
    assert.equal((await db.query("select count(*)::int as total from public.leads")).rows[0].total,5);
    await db.query("update public.leads set activities='[]'::jsonb where id=$1",[legacyNull]);
    assert.deepEqual((await db.query("select activities from public.leads where id=$1",[legacy])).rows[0].activities,[{id:"legacy",text:"Unchanged"}]);
    await assert.rejects(db.query("update public.leads set activities=$1 where id=$2",[JSON.stringify([event]),legacy]), /creation history/);
  } finally { await db.close(); }
});
