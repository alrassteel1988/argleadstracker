const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const [admin, former, next, manager, director, inactive, other, leadId] = Array.from({ length: 8 }, (_, i) => id(i + 1));
const originalDate = "2026-11-17T06:00:00Z";
const note = "Transfer the synthetic lead for continued follow-up.";
const migrations = path.join(__dirname, "..", "supabase", "migrations");
const read = file => fs.readFileSync(path.join(migrations, file), "utf8");

test("Admin-only transfer changes ownership, audit history and notices together", { skip: !process.env.CRM_TEST_PGLITE_MODULE }, async () => {
  const { PGlite } = require(process.env.CRM_TEST_PGLITE_MODULE);
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth to authenticated, anon;
      create table public.profiles(id uuid primary key, status text, role text, full_name text, territory text);
      create table public.leads(id uuid primary key, assigned_to uuid, assigned_salesman text, created_by uuid,
        territory text, latitude double precision, longitude double precision, notes text,
        updated_at timestamptz, activities jsonb);
      create table public.test_linked_records(lead_id uuid);
      alter table public.test_linked_records enable row level security;
      create function public.set_test_updated_at() returns trigger language plpgsql as
        $$ begin new.updated_at := clock_timestamp(); return new; end; $$;
      create trigger leads_set_updated_at before update on public.leads for each row execute function public.set_test_updated_at();
      alter table public.leads enable row level security;
      grant select, update on public.leads to authenticated;
      grant select on public.test_linked_records to authenticated;
    `);
    const handoff = read("20260803104946_reconcile_missing_production_schema.sql");
    await db.exec(handoff.slice(handoff.indexOf("create table if not exists public.handoff_logs"), handoff.indexOf("create table if not exists public.agent_query_log")));
    const architecture = read("20260612120000_multi_user_architecture.sql");
    await db.exec(architecture.slice(architecture.indexOf("create table if not exists public.notifications"), architecture.indexOf("create index if not exists profiles_territory_idx")));
    const policies = read("20260803105004_replace_legacy_rls_policies.sql");
    await db.exec(policies.slice(0, policies.indexOf("alter table public.profiles enable row level security;")));
    await db.exec(`
      alter table public.handoff_logs enable row level security;
      alter table public.notifications enable row level security;
      grant select, insert, update, delete on public.handoff_logs to authenticated;
      grant select, update on public.notifications to authenticated;
      create policy "F04 leads read" on public.leads for select to authenticated using (private.crm_can_access_lead(id));
      create policy "F04 leads update" on public.leads for update to authenticated using (private.crm_can_access_lead(id)) with check (private.crm_can_access_lead(id));
      create policy "F04 handoffs read" on public.handoff_logs for select to authenticated using (private.crm_can_access_lead(lead_id));
      create policy "F04 notifications own" on public.notifications for select to authenticated using (recipient_uid = auth.uid());
      create policy "F04 notifications update own" on public.notifications for update to authenticated using (recipient_uid = auth.uid()) with check (recipient_uid = auth.uid());
      create policy linked_lead on public.test_linked_records for select to authenticated using (private.crm_can_access_lead(lead_id));
      alter table public.notifications add constraint synthetic_notice_failure check (recipient_uid <> '${other}'::uuid);
    `);
    const people = [
      [admin, "active", "admin", "Admin"], [former, "active", "salesman", "Former"],
      [next, "active", "salesman", "New"], [manager, "active", "manager", "Manager"],
      [director, "active", "director", "Director"], [inactive, "disabled", "salesman", "Inactive"],
      [other, "active", "salesman", "Other"]
    ];
    for (const person of people) {
      await db.query("insert into auth.users values ($1)", [person[0]]);
      await db.query("insert into public.profiles values ($1,$2,$3,$4,'UAE-North')", person);
    }
    const original = { id: "original", created_by: former };
    await db.query("insert into public.leads values ($1,$2,'Former',$2,'UAE-North',null,null,'Before',$3,$4)",
      [leadId, former, originalDate, JSON.stringify([original])]);
    await db.query("insert into public.test_linked_records values ($1)", [leadId]);
    await db.query("insert into public.notifications (recipient_uid,lead_id,type,title,message) values ($1,$2,'handoff','Legacy title','Legacy private handoff')", [former, leadId]);
    await db.exec(read("20261117071828_audited_admin_lead_reassignment.sql"));

    const actor = async uid => {
      await db.exec("set role authenticated");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid]);
    };
    const transfer = async (uid, target = next, remarks = note, revision = originalDate, patch = {}) => {
      await actor(uid);
      return (await db.query("select public.reassign_lead($1,$2,$3,$4,$5) as result",
        [leadId, target, remarks, revision, JSON.stringify(patch)])).rows[0].result;
    };
    for (const denied of [former, manager, director, inactive]) await assert.rejects(transfer(denied), /active Admin/);
    for (const direct of [admin, manager, former]) {
      await actor(direct);
      await assert.rejects(db.query("update public.leads set assigned_to=$1 where id=$2", [next, leadId]), /Admin handoff workflow/);
    }
    await assert.rejects(transfer(admin, inactive), /active Salesman/);
    await assert.rejects(transfer(admin, next, "too short"), /20 to 4000/);
    await assert.rejects(transfer(admin, next, note, "2020-01-01Z"), /lead changed/);
    await assert.rejects(transfer(admin, next, note, originalDate, { created_by: next }), /Invalid lead edit/);
    await assert.rejects(transfer(admin, other), /synthetic_notice_failure/);
    assert.equal((await db.query("select assigned_to from public.leads")).rows[0].assigned_to, former);
    assert.equal((await db.query("select * from public.handoff_logs")).rows.length, 0);
    await actor(other);
    assert.equal((await db.query("select * from public.leads")).rows.length, 0, "Shared territory grants no lead access");
    await actor(former);
    assert.equal((await db.query("select * from public.test_linked_records")).rows.length, 1);
    const moved = await transfer(admin, next, note, originalDate, { latitude: null, longitude: 0, notes: "Edited during transfer" });
    assert.equal(moved.assigned_to, next);
    assert.equal(moved.created_by, former);
    assert.equal(moved.notes, "Edited during transfer");
    assert.equal(moved.longitude, 0);
    assert.deepEqual(moved.activities[1], original);
    const handoffs = (await db.query("select * from public.handoff_logs")).rows;
    assert.equal(handoffs.length, 1);
    assert.equal(handoffs[0].initiated_by_uid, admin);
    assert.equal(handoffs[0].previous_owner_uid, former);
    assert.equal(handoffs[0].new_owner_uid, next);
    assert.equal(handoffs[0].handoff_note, note);
    assert.equal(moved.activities[0].handoff_id, handoffs[0].handoff_id);
    await assert.rejects(db.query("delete from public.handoff_logs"), /permission denied/);
    await assert.rejects(transfer(admin, next, note, moved.updated_at), /already owns/);
    await actor(former);
    for (const table of ["leads", "handoff_logs", "test_linked_records"]) {
      assert.equal((await db.query(`select * from public.${table}`)).rows.length, 0);
    }
    const formerNotices = (await db.query("select lead_id,payload from public.notifications")).rows;
    assert.deepEqual(formerNotices, [{ lead_id: null, payload: {} }]);
    await actor(next);
    assert.equal((await db.query("select * from public.test_linked_records")).rows.length, 1);
    assert.deepEqual((await db.query("select lead_id,payload from public.notifications")).rows, [{ lead_id: leadId, payload: {} }]);
    await db.exec("reset role; set role anon");
    await assert.rejects(db.query("select public.reassign_lead($1,$2,$3,$4,'{}')", [leadId, former, note, originalDate]), /permission denied/);
  } finally {
    await db.close();
  }
});
