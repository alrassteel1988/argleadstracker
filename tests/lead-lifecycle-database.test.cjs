const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { PGlite } = require(process.env.CRM_TEST_PGLITE_MODULE || "@electric-sql/pglite");

test("archive lifecycle, RLS, duplicate review and immutable audit are transactional", async () => {
  const db = new PGlite();
  const admin=randomUUID(), sales=randomUUID(), peer=randomUUID(), lead=randomUUID(), company=randomUUID();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; grant usage on schema auth to authenticated;
      create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create function auth.jwt() returns jsonb language sql as $$select '{"email":"synthetic@example.test"}'::jsonb$$;
      create schema private; grant usage on schema private to authenticated;
      create table public.profiles(id uuid primary key,role text,status text,full_name text,territory text);
      create table public.companies(id uuid primary key default gen_random_uuid(),company_name text,created_by uuid);
      create table public.leads(id uuid primary key default gen_random_uuid(),company_id uuid references public.companies(id),company_name text not null,
        assigned_to uuid,assigned_salesman text,created_by uuid,lead_status text default 'PROSPECT',phone text,contact_email text,activities jsonb default '[]',
        updated_at timestamptz default now(),territory text,next_action text default 'Qualify lead',next_action_date date,
        constraint leads_status_blueprint_check check(lead_status in ('PROSPECT','OUTREACH','ENGAGED','SAMPLING','ACTIVE','DORMANT')));
      create table public.notifications(id uuid primary key default gen_random_uuid(),recipient_uid uuid,lead_id uuid references public.leads(id) on delete cascade,
        type text,title text,message text,status text default 'pending',created_at timestamptz default now());
      create table public.management_tasks(id uuid primary key default gen_random_uuid(),lead_id uuid references public.leads(id) on delete cascade,assignee_id uuid,
        title text,status text default 'not_started',due_date date);
      create table public.pmrs(id uuid primary key default gen_random_uuid(),lead_id uuid references public.leads(id) on delete cascade,created_by uuid,notes text,voice_note_path text);
      create schema storage; grant usage on schema storage to authenticated;
      create table storage.objects(name text primary key,owner_id uuid); alter table storage.objects enable row level security;
      create policy own_storage on storage.objects for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
      grant select,insert,update,delete on storage.objects to authenticated;
      alter table public.pmrs enable row level security;
      create policy pmr_creator on public.pmrs for all to authenticated using(created_by=auth.uid()) with check(created_by=auth.uid());
      create function private.crm_can_access_lead(uuid) returns boolean language sql as $$select true$$;
      alter table public.leads enable row level security;
      alter table public.companies enable row level security;
      alter table public.notifications enable row level security;
      alter table public.management_tasks enable row level security;
      create policy lead_access on public.leads for all to authenticated using(private.crm_can_access_lead(id)) with check(created_by=auth.uid() or private.crm_can_access_lead(id));
      create policy company_access on public.companies for all to authenticated using(true) with check(true);
      create policy notices on public.notifications for all to authenticated using(recipient_uid=auth.uid()) with check(recipient_uid=auth.uid());
      create policy tasks on public.management_tasks for all to authenticated using(assignee_id=auth.uid() or exists(select 1 from public.profiles where id=auth.uid() and role='admin')) with check(assignee_id=auth.uid() or exists(select 1 from public.profiles where id=auth.uid() and role='admin'));
      grant select,insert,update,delete on public.leads,public.companies,public.notifications,public.management_tasks to authenticated;
      grant select on public.profiles to authenticated,service_role;
      grant select,insert,update on public.leads to service_role;
      grant select,insert,update,delete on public.pmrs to authenticated;`);
    for (const [id,role,name] of [[admin,"admin","Admin"],[sales,"salesman","Salesman"],[peer,"salesman","Peer"]]) {
      await db.query("insert into public.profiles values($1,$2,'active',$3,'UAE-North')",[id,role,name]);
    }
    await db.query("insert into public.companies values($1,'Harbor', $2)",[company,sales]);
    await db.query("insert into public.leads(id,company_id,company_name,assigned_to,assigned_salesman,created_by,phone,contact_email) values($1,$2,'Harbor L.L.C.',$3,'Salesman',$3,'+971 50 123 4567','Contact@Example.test')",[lead,company,sales]);
    await db.query("insert into public.management_tasks(lead_id,assignee_id,title,due_date) values($1,$2,'Preserved task','2099-01-01')",[lead,sales]);
    await db.query("insert into public.pmrs(lead_id,created_by,notes,voice_note_path) values($1,$2,'Synthetic saved history','voice-notes/synthetic.webm')",[lead,sales]);
    await db.query("insert into storage.objects values('voice-notes/synthetic.webm',$1)",[sales]);
    await db.exec(readFileSync(join(__dirname,"../supabase/migrations/20261118111941_atomic_new_lead_registration.sql"),"utf8"));
    await db.exec(readFileSync(join(__dirname,"../supabase/migrations/20261118113937_registration_rls_readback.sql"),"utf8"));
    await db.exec(readFileSync(join(__dirname,"../supabase/migrations/20261118122627_lead_creation_activity_audit.sql"),"utf8"));
    await db.exec(readFileSync(join(__dirname,"../supabase/migrations/20261120050707_lead_lifecycle_archive.sql"),"utf8"));
    const as=async id=>{ await db.exec("set role authenticated"); await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]); };
    const change=async(action,input={})=>(await db.query("select public.change_lead_lifecycle($1,$2,$3::jsonb) result",[lead,action,JSON.stringify(input)])).rows[0].result;
    const check=async(input)=>(await db.query("select public.check_lead_duplicates($1::jsonb,null) result",[JSON.stringify(input)])).rows[0].result.matches;
    const create=async(name,phone="",email="")=>db.query("insert into public.leads(company_name,assigned_to,assigned_salesman,created_by,phone,contact_email) values($1,$2,'Peer',$2,$3,$4)",[name,peer,phone,email]);
    await as(sales);
    await assert.rejects(()=>change("close",{closed_reason:"Other"}), /note|reason/i);
    await assert.rejects(()=>change("archive",{reason:"Sales cannot archive manually"}),{code:"42501"});
    await assert.rejects(()=>db.query("delete from public.leads where id=$1",[lead]),{code:"42501"});
    await change("close",{closed_reason:"Uses another supplier",closed_note:"Synthetic closure"});
    assert.equal((await db.query("select * from public.leads")).rows.length,0);
    assert.equal((await db.query("select * from public.companies")).rows.length,0);
    assert.equal((await db.query("select * from public.management_tasks")).rows.length,0);
    assert.equal((await db.query("select * from public.pmrs")).rows.length,0,"Original authorship must not reveal archived PMRs");
    assert.equal((await db.query("select * from storage.objects")).rows.length,0,"File ownership must not bypass archive isolation");
    await assert.rejects(()=>change("restore",{reason:"Not authorized"}),{code:"42501"});
    await as(peer);
    for (const input of [{company_name:" HARBOR LLC "},{company_name:"Harbor Trading Co."},{phone:"0501234567"},{phone:"00971501234567"},{email:"contact@example.TEST"}]) {
      const rows=await check(input); assert.equal(rows.length,1); assert.equal(rows[0].is_archived,true);
      assert.equal(rows[0].closed_by_name,"Salesman"); assert.equal(rows[0].id,undefined); assert.equal(rows[0].phone,undefined); assert.equal(rows[0].email,undefined);
    }
    await assert.rejects(()=>create("Harbor FZ-LLC"),{code:"23505"});
    await assert.rejects(()=>create("Different","00971 50 1234567"),{code:"23505"});
    const input={company_name:"Harbor FZCO",phone:"",email:""};
    const review=(await db.query("select public.request_lead_duplicate_review($1,null,'Please review synthetic duplicate',false) r",[input])).rows[0].r;
    await assert.rejects(()=>db.query("select public.decide_lead_duplicate_review($1,true,'Unauthorized')",[review.id]),{code:"42501"});
    await as(admin);
    await db.query("select public.decide_lead_duplicate_review($1,true,'Approved synthetic new lead')",[review.id]);
    await as(peer); await create("Harbor FZCO");
    await assert.rejects(()=>create("Harbor FZCO"),{code:"23505"});
    await as(admin);
    const notices=(await db.query("select * from public.notifications where type='lead_closed'")).rows;
    assert.equal(notices.length,1,"Admin sees their own broadcast through RLS");
    assert.match(notices[0].message,/Harbor L.L.C..*Salesman.*Please do not contact/);
    assert.equal(notices[0].lead_id,null);
    await assert.rejects(()=>db.query("delete from public.leads where id=$1",[lead]),{code:"42501"});
    const restored=await change("restore",{reason:"Requirement reopened"});
    assert.equal(restored.lead_status,"PROSPECT"); assert.equal(restored.is_archived,false); assert.equal(restored.closed_reason,"Uses another supplier");
    await as(sales);
    assert.equal((await db.query("select * from public.leads")).rows.length,1);
    assert.equal((await db.query("select status,due_date::text from public.management_tasks")).rows[0].status,"not_started");
    assert.equal((await db.query("select due_date::text from public.management_tasks")).rows[0].due_date,"2099-01-01");
    assert.equal((await db.query("select * from storage.objects")).rows.length,1,"Restore re-enables the existing authorized file access");
    await as(admin);
    await assert.rejects(()=>change("purge",{reason:"Test cleanup",company_name:"Harbor L.L.C."}),{code:"42501"});
    await change("archive",{reason:"Synthetic duplicate"});
    await assert.rejects(()=>db.query("update public.management_tasks set title='Should not change' where lead_id=$1",[lead]),{code:"42501"});
    await assert.rejects(()=>change("purge",{reason:"Synthetic cleanup",company_name:"Wrong name"}),{code:"22023"});
    await change("purge",{reason:"Synthetic cleanup",company_name:"Harbor L.L.C."});
    const audit=(await db.query("select * from public.lead_lifecycle_events where lead_id=$1",[lead])).rows;
    assert.ok(["close","archive","restore","purge"].every(action=>audit.some(row=>row.action===action)));
    await assert.rejects(()=>db.query("update public.lead_lifecycle_events set reason='Altered'"),{code:"42501"});
    await as(sales);
    assert.equal((await db.query("select * from storage.objects")).rows.length,0,"Purging a PMR must not reopen orphaned voice-note access");
    await db.exec("reset role");
    assert.equal((await db.query("select count(*)::int n from public.notifications where type='lead_closed'")).rows[0].n,3);
    assert.equal((await db.query("select count(*)::int n from public.leads where id=$1",[lead])).rows[0].n,0);
    await as(peer);
    const closedInput={company_name:"Willow closed signup fixture",created_by:peer,assigned_to:peer,assigned_salesman:"Peer",territory:"UAE-North",
      lead_status:"CLOSED_NOT_INTERESTED",closed_reason:"No requirement",closed_note:"Synthetic closed registration",next_action:"",next_action_date:null,activities:[]};
    const saved=(await db.query("select public.save_new_crm_lead($1) lead",[closedInput])).rows[0].lead;
    assert.equal(saved.is_archived,true); assert.equal(saved.company_name,undefined,"A Salesman cannot read back the archived row");
    assert.equal((await db.query("select * from public.leads where id=$1",[saved.id])).rows.length,0);
    await db.exec("reset role");
    const before=(await db.query("select count(*)::int n from public.companies")).rows[0].n;
    await as(peer);
    await assert.rejects(()=>db.query("select public.save_new_crm_lead($1)",[{...closedInput,company_name:"Rejected closed signup fixture",closed_reason:"Other",closed_note:""}]),{code:"22023"});
    await db.exec("reset role");
    assert.equal((await db.query("select count(*)::int n from public.companies")).rows[0].n,before,"Failed close/save cannot leave an orphan company");
    await as(peer);
    const editingInput={...closedInput,company_name:"Birch active signup fixture",lead_status:"NEW"};
    delete editingInput.closed_reason; delete editingInput.closed_note;
    const editing=(await db.query("select public.save_new_crm_lead($1) lead",[editingInput])).rows[0].lead;
    await assert.rejects(()=>db.query("select public.close_edited_lead($1,$2,$3)",[editing.id,editing.updated_at,{lead_status:"CLOSED_NOT_INTERESTED",closed_reason:"No requirement",assigned_to:admin}]),{code:"22023"});
    const edited=(await db.query("select public.close_edited_lead($1,$2,$3) lead",[editing.id,editing.updated_at,
      {company_name:"Birch edited signup fixture",phone:"0507654321",contact_email:"edited@example.test",lead_status:"CLOSED_NOT_INTERESTED",closed_reason:"Other",closed_note:"Full edit retained"}])).rows[0].lead;
    assert.equal(edited.is_archived,true); assert.equal(edited.phone,undefined);
    await db.exec("reset role");
    const row=(await db.query("select * from public.leads where id=$1",[editing.id])).rows[0];
    assert.equal(row.company_name,"Birch edited signup fixture"); assert.equal(row.phone,"0507654321"); assert.equal(row.contact_email,"edited@example.test");
    assert.deepEqual(row.activities,editing.activities,"Closing must not rewrite activity history");
    await as(peer);
    const ownMatches=await check({company_name:"Harbor FZCO"});
    assert.equal(ownMatches.length,1); assert.equal(ownMatches[0].self_owned,true);
    await db.query("select public.request_lead_duplicate_review($1,null,'Acknowledged own active duplicate',true)",[{company_name:"Harbor FZCO",phone:"",email:""}]);
    await create("Harbor FZCO");
    await assert.rejects(()=>db.query("select public.request_lead_duplicate_review($1,null,'Cannot override own archived lead',true)",[{company_name:"Willow closed signup fixture"}]),{code:"42501"});
    await db.exec("reset role");
    await db.exec("alter table public.notifications add constraint reject_test_close_notice check(type<>'lead_closed') not valid");
    await as(peer);
    const active=(await db.query("select id from public.leads where company_name='Harbor FZCO' limit 1")).rows[0].id;
    await assert.rejects(()=>db.query("select public.change_lead_lifecycle($1,'close',$2)",[active,{closed_reason:"No requirement"}]),{code:"23514"});
    assert.equal((await db.query("select is_archived from public.leads where id=$1",[active])).rows[0].is_archived,false,"Notification failure must roll back closure");
    await db.exec("reset role"); await db.exec("alter table public.notifications drop constraint reject_test_close_notice");
    await as(peer);
    const flow=(await db.query("select public.save_new_crm_lead($1) lead",[{...editingInput,company_name:"Juniper Request Fixture"}])).rows[0].lead;
    const archiveRequest=(await db.query("select public.request_lead_archive_review('archive',$1,'{}','Disqualified','Synthetic management request') r",[flow.id])).rows[0].r;
    const untouched=(await db.query("select to_jsonb(l) value from public.leads l where id=$1",[flow.id])).rows[0].value;
    assert.deepEqual(untouched,flow,"Sending a deletion request must leave every lead field unchanged");
    await assert.rejects(()=>db.query("select public.review_lead_archive_request($1,true,null,'Forged approval')",[archiveRequest.id]),{code:"42501"});
    await as(sales);
    await assert.rejects(()=>db.query("select public.request_lead_archive_review('archive',$1,'{}','Disqualified','Not my lead')",[flow.id]),{code:"42501"});
    await as(admin);
    const newNotice=(await db.query("select message from public.notifications where type='lead_lifecycle_request' and recipient_uid=$1",[admin])).rows;
    assert.ok(newNotice.some(item=>item.message.includes("Peer requested deletion of Juniper")));
    await db.query("select public.review_lead_archive_request($1,false,null,'Not disqualified yet')",[archiveRequest.id]);
    await as(peer); assert.equal((await db.query("select count(*)::int n from public.leads where id=$1",[flow.id])).rows[0].n,1);
    const second=(await db.query("select public.request_lead_archive_review('archive',$1,'{}','Disqualified','Confirmed synthetic disqualification') r",[flow.id])).rows[0].r;
    await as(admin); await db.query("select public.review_lead_archive_request($1,true,null,'Approved soft deletion')",[second.id]);
    await as(peer); assert.equal((await db.query("select count(*)::int n from public.leads where id=$1",[flow.id])).rows[0].n,0);
    const warning=await check({company_name:"Juniper Request Fixture"}); assert.equal(warning[0].soft_deleted,true);
    const restoreRequest=(await db.query("select public.request_lead_archive_review('restore',null,$1,'New steel requirement','Customer has a new steel enquiry') r",[{company_name:"Juniper Request Fixture LLC"}])).rows[0].r;
    const mine=(await db.query("select public.my_lead_archive_requests() r")).rows[0].r;
    assert.ok(mine.every(item=>item.candidate_ids===undefined));
    assert.equal(mine.find(item=>item.id===restoreRequest.id).lead_id,null);
    await as(admin);
    await assert.rejects(()=>db.query("select public.review_lead_archive_request($1,true,$2,'Wrong target')",[restoreRequest.id,randomUUID()]),{code:"22023"});
    await db.query("select public.review_lead_archive_request($1,true,$2,'Approved renewed steel requirement')",[restoreRequest.id,flow.id]);
    await as(peer);
    const reopened=(await db.query("select * from public.leads where id=$1",[flow.id])).rows[0];
    assert.equal(reopened.lead_status,"PROSPECT"); assert.deepEqual(reopened.activities,flow.activities);
    await db.exec("reset role");
    await db.exec("set role service_role"); await db.query("select set_config('request.jwt.claim.sub','',false)");
    await db.query("update public.leads set next_action='Trusted worker ordinary update' where company_name='Harbor FZCO'");
    await assert.rejects(()=>db.query("update public.leads set is_archived=true where company_name='Harbor FZCO'"),{code:"42501"});
    await assert.rejects(()=>db.query("update public.leads set next_action='Must stay frozen' where id=$1",[editing.id]),{code:"42501"});
    await db.exec("reset role");
    assert.ok((await db.query("select next_action from public.leads where company_name='Harbor FZCO'")).rows.every(item=>item.next_action==="Trusted worker ordinary update"));

    // Exercise the released Admin RPC and real task trigger under the archive lookup policy.
    await db.exec(`alter table public.leads add column notes text, add column activity_purpose text;
      alter table public.management_tasks add column assignee_name text, add column assigned_by uuid,
        add column assigned_by_name text, add column lead_name text, add column instructions text,
        add column priority text, add column created_at timestamptz, add column updated_at timestamptz,
        add column notified_at timestamptz;
      create table private.management_task_events(id uuid primary key default gen_random_uuid(),task_id uuid,
        action text,actor_id uuid,actor_name text,at timestamptz,snapshot jsonb);
      revoke all on private.management_task_events from public,anon,authenticated,service_role;`);
    for (const file of ["20261116111051_initial_management_task.sql", "20261116124651_atomic_initial_management_lead.sql",
      "20261118100838_lead_registration_task_choices.sql"]) {
      await db.exec(readFileSync(join(__dirname,"../supabase/migrations",file),"utf8"));
    }
    await db.exec(readFileSync(join(__dirname,"../supabase/migrations/20261120063951_initial_management_lead_rls_readback.sql"),"utf8"));
    const initialInput = (company_name, extra={}) => ({ company_name, created_by:admin, assigned_to:sales,
      assigned_salesman:"Salesman", territory:"UAE-North", lead_status:"NEW", initial_management_task_id:randomUUID(),
      next_action:"New Lead Outreach", next_action_date:null, activity_purpose:"Company Introductory", notes:"Synthetic Admin assignment", ...extra });
    const initialSave = async input => (await db.query("select public.save_initial_management_lead($1) lead",[input])).rows[0].lead;
    const initialCounts = async () => {
      await db.exec("reset role");
      return (await db.query(`select (select count(*)::int from public.companies) companies,
        (select count(*)::int from public.leads) leads,(select count(*)::int from public.management_tasks) tasks,
        (select count(*)::int from private.management_task_events) events`)).rows[0];
    };
    const originalCounts = await initialCounts();
    await as(admin);
    const assigned = await initialSave(initialInput("Cypress Admin lifecycle assignment"));
    assert.equal(assigned.lead_status,"PROSPECT");
    assert.equal(assigned.is_archived,false);
    assert.equal(assigned.next_action,""); assert.equal(assigned.next_action_date,null);
    const assignedTask = (await db.query("select * from public.management_tasks where id=$1",[assigned.initial_management_task_id])).rows[0];
    assert.equal(assignedTask.lead_id,assigned.id); assert.equal(assignedTask.assignee_id,sales);
    assert.equal(assignedTask.title,"New Lead Outreach"); assert.ok(assignedTask.due_date);
    assert.equal((await db.query("select * from public.leads where id=$1",[assigned.id])).rows.length,1);
    assert.deepEqual(await initialCounts(), {companies:originalCounts.companies+1,leads:originalCounts.leads+1,
      tasks:originalCounts.tasks+1,events:originalCounts.events+1});
    assert.equal((await db.query("select due_date=private.next_management_working_date(created_at) correct_deadline from public.management_tasks where id=$1",[assignedTask.id])).rows[0].correct_deadline,true);
    await as(sales);
    assert.equal((await db.query("select * from public.leads where id=$1",[assigned.id])).rows.length,1);
    assert.equal((await db.query("select * from public.management_tasks where id=$1",[assignedTask.id])).rows.length,1);
    await assert.rejects(()=>initialSave(initialInput("Forged Salesman initial assignment",{created_by:sales})),{code:"42501"});
    await as(peer);
    assert.equal((await db.query("select * from public.leads where id=$1",[assigned.id])).rows.length,0);
    const stableCounts = await initialCounts();
    await as(admin);
    for (const [name,extra,code] of [
      ["Rejected initial task title",{next_action:"Unsupported"},"22023"],
      ["Rejected initial task assignee",{assigned_to:admin},"22023"],
      ["Rejected initial stage",{lead_status:"INVALID"},"23514"],
      ["Rejected initial task collision",{initial_management_task_id:assignedTask.id},"23505"],
      ["Rejected initial creator",{created_by:peer},"42501"]
    ]) {
      await assert.rejects(()=>initialSave(initialInput(name,extra)),{code});
      assert.deepEqual(await initialCounts(),stableCounts,"Failed initial assignment must roll back company, lead, task and task audit");
      await as(admin);
    }
    await db.exec(`reset role; create policy reject_admin_initial_read on public.leads as restrictive for select to authenticated
      using(company_name<>'Denied initial readback fixture');`);
    await as(admin);
    await assert.rejects(()=>initialSave(initialInput("Denied initial readback fixture")),{code:"P0002"});
    assert.deepEqual(await initialCounts(),stableCounts,"Denied read-back must roll back the whole initial assignment");
    await db.exec("drop policy reject_admin_initial_read on public.leads");
    const initialSecurity = (await db.query(`select prosecdef,proconfig,
      has_function_privilege('anon',oid,'execute') anon,
      has_function_privilege('authenticated',oid,'execute') authenticated,
      has_function_privilege('service_role',oid,'execute') service
      from pg_proc where oid='public.save_initial_management_lead(jsonb)'::regprocedure`)).rows[0];
    assert.equal(initialSecurity.prosecdef,false); assert.deepEqual(initialSecurity.proconfig,["search_path=pg_catalog"]);
    assert.equal(initialSecurity.anon,false); assert.equal(initialSecurity.authenticated,true); assert.equal(initialSecurity.service,false);
    await db.exec("alter table public.leads drop constraint leads_status_blueprint_check");
    await as(admin);
    const modernInitial = await initialSave(initialInput("Cypress modern Admin assignment",{
      company_id:assigned.company_id,next_action:"Respond to Initial RFQ"
    }));
    assert.equal(modernInitial.lead_status,"NEW","Do not rewrite a stage already supported by the database");
    assert.equal(modernInitial.company_id,assigned.company_id);
    const reusedCounts = await initialCounts();
    assert.deepEqual(reusedCounts,{companies:stableCounts.companies,leads:stableCounts.leads+1,
      tasks:stableCounts.tasks+1,events:stableCounts.events+1});

    await db.exec("set role anon");
    await assert.rejects(()=>initialSave(initialInput("Anonymous initial assignment")),{code:"42501"});
    await assert.rejects(()=>db.query("select public.check_lead_duplicates('{}',null)"),{code:"42501"});
    await assert.rejects(()=>db.query("select public.change_lead_lifecycle($1,'restore','{\"reason\":\"forged\"}')",[editing.id]),{code:"42501"});
  } finally { await db.close(); }
});
