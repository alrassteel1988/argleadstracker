const assert = require("node:assert/strict");
const { test } = require("node:test");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

test("Admin audit is private, immutable, actor-verified and transactional", { skip: !process.env.CRM_TEST_PGLITE_MODULE }, async () => {
  const { PGlite } = require(process.env.CRM_TEST_PGLITE_MODULE);
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema private; grant usage on schema private to authenticated;
      create schema auth;
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to authenticated,service_role;
      create table public.profiles(id uuid primary key,full_name text,role text,status text);
      create table public.leads(id uuid primary key,created_by uuid,assigned_to uuid,notes text,stage text);
      grant select,update,insert,delete on public.leads to authenticated,service_role;
      grant select,update on public.profiles to authenticated;
      alter table public.leads enable row level security;
      create policy fixture_access on public.leads to authenticated using (true) with check (true);`);
    for (let n = 1; n <= 7; n++) await db.query("insert into profiles values($1,$2,$3,$4)",
      [id(n), `Synthetic Admin ${n}`, n <= 5 ? "admin" : n === 6 ? "salesman" : "manager", n === 5 ? "inactive" : "active"]);
    await db.query("insert into leads values($1,$2,$2,'Private content','NEW')", [id(10), id(6)]);
    await db.exec(readFileSync(join(__dirname,"../supabase/migrations/20261118081602_admin_access_and_change_audit.sql"),"utf8"));
    const actor = async (n, role = "authenticated") => {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role',$2,false),set_config('request.headers','{}',false)",
        [n ? id(n) : "",role]);
      await db.exec(`set role ${role}`);
    };
    const list = () => db.query("select * from public.list_admin_audit_events()");
    for (let n = 1; n <= 4; n++) {
      await actor(n);
      await db.query("update leads set notes=$1 where id=$2", [`Confidential ${n}`,id(10)]);
      const events = (await list()).rows;
      const event = events.find(row => row.actor_id === id(n));
      assert.equal(event.actor_name,`Synthetic Admin ${n}`);
      assert.deepEqual(event.changed_fields,["notes"]);
      assert.equal(event.table_name,"leads");
      assert.equal(event.action,"update");
      assert(!JSON.stringify(events).includes("Confidential"));
      assert.equal((await db.query("select created_by from leads")).rows[0].created_by,id(6));
      await assert.rejects(db.query("insert into private.admin_audit_events(phase,action,outcome) values('result','read','succeeded')"),/permission denied/);
      await assert.rejects(db.query("select public.append_admin_access_event('{}')"),/permission denied/);
    }
    for (const n of [5,6,7]) { await actor(n); await assert.rejects(list(),/Active Admin/); }
    await actor(null,"anon"); await assert.rejects(list(),/permission denied/);
    await actor(6);
    await db.query("select set_config('request.headers',$1,false)",[JSON.stringify({"x-crm-audit-actor-id":id(1)})]);
    await db.query("update leads set notes='Salesman change' where id=$1",[id(10)]);
    await actor(1); assert.equal((await list()).rows.length,4,"Salesman cannot impersonate Admin via headers");
    await db.exec("begin");
    await db.query("update leads set notes='Rolled back' where id=$1",[id(10)]);
    await db.exec("rollback");
    assert.equal((await list()).rows.length,4);
    assert.equal((await db.query("select notes from leads")).rows[0].notes,"Salesman change");

    await actor(null,"service_role");
    const access = { id:id(30),request_id:id(31),actor_id:id(1),actor_name:"Forged name",actor_role:"salesman",
      phase:"attempt",action:"write",outcome:"attempted",method:"PATCH",route:"/api/leads/:id",record_id:id(10) };
    await db.query("select public.append_admin_access_event($1)",[JSON.stringify(access)]);
    await assert.rejects(db.query("select public.append_admin_access_event($1)",[JSON.stringify({...access,id:id(32),password:"secret"})]),/Invalid access audit/);
    await db.query("select set_config('request.headers',$1,false)", [JSON.stringify({"x-crm-audit-actor-id":id(2),"x-crm-audit-request-id":id(31)})]);
    await db.query("update leads set notes='Server update' where id=$1",[id(10)]);
    await actor(1);
    const events = (await list()).rows;
    assert.equal(events.find(row => row.id===id(30)).actor_name,"Synthetic Admin 1");
    assert.equal(events.find(row => row.phase==="change" && row.request_id===id(31)).actor_id,id(2));
    await assert.rejects(db.query("select * from public.list_admin_audit_events(null,null,101)"),/Invalid audit pagination/);
    const first = (await db.query("select * from public.list_admin_audit_events(null,null,1)")).rows[0];
    const second = (await db.query("select * from public.list_admin_audit_events($1,$2,1)",[first.at,first.id])).rows[0];
    assert.notEqual(first.id,second.id);
    await db.exec("reset role");
    for (const sql of ["update private.admin_audit_events set actor_name='Changed'", "delete from private.admin_audit_events", "truncate private.admin_audit_events"]) {
      await assert.rejects(db.exec(sql),/append-only/);
    }
    await db.exec("alter table private.admin_audit_events add constraint simulate_audit_outage check (action <> 'delete')");
    await actor(1);
    await assert.rejects(db.query("delete from leads where id=$1",[id(10)]),/simulate_audit_outage/);
    assert.equal((await db.query("select count(*)::int as n from leads")).rows[0].n,1,"Audit failure rolls back business deletion");
    await db.query("update profiles set role='salesman' where id=$1",[id(1)]);
    await actor(2);
    assert((await list()).rows.some(row => row.actor_id===id(1) && row.table_name==="profiles"),"Self-demotion remains attributed");
  } finally { await db.close(); }
});
