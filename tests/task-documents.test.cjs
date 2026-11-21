const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID, createHash } = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { PGlite } = require("@electric-sql/pglite");
const { handleTaskDocuments } = require("../src/services/taskDocumentRoutes");
const { requestRateLimitCategory } = require("../src/services/rateLimitService");
const { validateActivityAttachment } = require("../src/services/activityWorkflowService");
const migration = "20261121050416_management_task_rfq_documents.sql";
const digest = bytes => createHash("sha256").update(bytes).digest("hex");

test("closing a private preview aborts its request and clears its object URL", () => {
  const vm = require("node:vm"), source = fs.readFileSync(path.join(__dirname,"../client.js"),"utf8");
  const revoked=[], removed=[], aborted=[];
  const context={URL:{revokeObjectURL:url=>revoked.push(url)}};
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf("let taskDocumentPreview ="),source.indexOf("async function viewTaskDocument(")),context);
  context.fixture={url:"blob:private-synthetic",abort:{abort:()=>aborted.push(true)},dialog:{remove:()=>removed.push(true)}};
  vm.runInContext("taskDocumentPreview=fixture; closeTaskDocumentPreview(); closeTaskDocumentPreview()",context);
  assert.deepEqual(revoked,["blob:private-synthetic"]);
  assert.deepEqual(removed,[true]); assert.deepEqual(aborted,[true]);
  assert.equal(vm.runInContext("taskDocumentPreview",context),null);
});

test("a closed preview ignores late protected bytes instead of displaying them", async () => {
  const vm = require("node:vm"), source = fs.readFileSync(path.join(__dirname,"../client.js"),"utf8");
  let finish;
  const dialog={isConnected:true,setAttribute(){},querySelector:()=>({addEventListener(){}}),addEventListener(){},
    showModal(){},remove(){this.isConnected=false;}};
  const context={state:{currentUser:{id:"sales"}},AbortController,escapeHtml:value=>value,
    document:{createElement:()=>dialog,body:{append(){}}},
    URL:{createObjectURL(){throw new Error("Late preview exposed bytes");}},
    authenticatedFetch:()=>new Promise(resolve=>{finish=resolve;})};
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf("let taskDocumentPreview ="),source.indexOf("async function downloadTaskDocument(")),context);
  const viewing=context.viewTaskDocument({target:{closest:()=>({dataset:{filename:"fixture.pdf",task:"synthetic",taskDocumentView:"/api/synthetic"}})}});
  context.closeTaskDocumentPreview();
  finish({ok:true,blob:async()=>({type:"application/pdf"})});
  await viewing;
  assert.equal(dialog.isConnected,false);
});

test("task disclosure restore keeps only fresh authorized panels and is account scoped", () => {
  const vm = require("node:vm"), source = fs.readFileSync(path.join(__dirname,"../client.js"),"utf8");
  const context = {state:{currentUser:{id:"sales"}}};
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf("function captureManagementTaskPanels("), source.indexOf("function renderRfqLeadFiles(")), context);
  const conversation = {open:true,closest:()=>({dataset:{mgCard:"kept"}})};
  const document = {open:true,dataset:{taskDocuments:"kept"}};
  const old = {dataset:{taskPanelOwner:"sales"},querySelectorAll:selector=>selector.includes("data-mg-card") ? [conversation] : [document,{dataset:{taskDocuments:"gone"}}]};
  const panels = context.captureManagementTaskPanels(old);
  conversation.open = false; document.open = false;
  const fresh = {dataset:{},querySelectorAll:selector=>selector.includes("data-mg-card") ? [conversation] : [document]};
  context.restoreManagementTaskPanels(fresh,panels);
  assert.equal(conversation.open,true); assert.equal(document.open,true);
  assert.equal(fresh.dataset.taskPanelOwner,"sales");
  context.state.currentUser.id = "peer";
  conversation.open = false; document.open = false;
  context.restoreManagementTaskPanels(fresh,panels);
  assert.equal(conversation.open,false); assert.equal(document.open,false);
  assert.equal(context.captureManagementTaskPanels(old).documents.size,0);
});

test("RFQ task title emphasis escapes labels and does not alter business priority", () => {
  const vm=require("node:vm"), source=fs.readFileSync(path.join(__dirname,"../client.js"),"utf8");
  const title=vm.runInNewContext(source.slice(source.indexOf("function managementTaskTitle("),source.indexOf("function taskDocumentsMarkup("))+";managementTaskTitle",
    {escapeHtml:value=>String(value||"").replaceAll("<","&lt;").replaceAll(">","&gt;")});
  const task={title:"Respond to Initial RFQ",priority:"medium",status:"completed",due_date:"2026-11-23"};
  const before=structuredClone(task);
  assert.equal(title(task),'<strong class="mg-task-title-rfq">Respond to Initial RFQ</strong>');
  assert.deepEqual(task,before);
  assert.equal(title({title:"New Lead Outreach"}),'<strong>New Lead Outreach</strong>');
  assert.equal(title({title:"<img>"}),'<strong>&lt;img&gt;</strong>');
});

test("late RFQ upload responses cannot mutate a reopened form or a different account", async () => {
  const vm=require("node:vm"), source=fs.readFileSync(path.join(__dirname,"../client.js"),"utf8");
  let finish, requests=0;
  const owner=randomUUID(), draft={owner,files:[{id:randomUUID(),file:{name:"fixture.pdf",type:"application/pdf"}}]};
  const context={rfqLeadUpload:draft,state:{currentUser:{id:owner,role:"admin"}},
    document:{getElementById:()=>{throw new Error("Stale form mutated");}},
    authenticatedFetch:async()=>{requests++;return new Promise(resolve=>{finish=resolve;});}};
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf("async function uploadRfqLeadFiles("),source.indexOf("function managementTaskTiming(")),context);
  const upload=context.uploadRfqLeadFiles({initial_management_task_id:randomUUID()},draft);
  const fresh={owner,files:[],savedLead:null}; context.rfqLeadUpload=fresh;
  finish({ok:true,json:async()=>({})});
  await assert.rejects(()=>upload,/account changed/);
  context.rfqUploadFailure(new Error("Late failure"),draft);
  await assert.rejects(()=>context.uploadRfqLeadFiles({initial_management_task_id:randomUUID()},draft),/form or account changed/);
  assert.equal(requests,1); assert.equal(fresh.savedLead,null); assert.equal(draft.files[0].saved,undefined);
  context.rfqLeadUpload=draft; context.state.currentUser={id:randomUUID(),role:"admin"};
  context.rfqUploadFailure(new Error("Old account failure"),draft);
  await assert.rejects(()=>context.uploadRfqLeadFiles({initial_management_task_id:randomUUID()},draft),/form or account changed/);
});

test("RFQ documents validate types, preserve the lead/task and enforce local API ownership", async () => {
  const admin = { id: randomUUID(), role: "admin", status: "active", name: "Synthetic Admin" };
  const sales = { id: randomUUID(), role: "salesman", status: "active" }, peer = { ...sales, id: randomUUID() };
  const lead = { id: randomUUID(), assigned_to: sales.id, is_archived: false, activities: [{ id: "original", text: "Keep" }] };
  const task = { id: randomUUID(), lead_id: lead.id, assignee_id: sales.id, title: "Respond to Initial RFQ", status: "completed", completed_at: "2026-11-20T08:00:00Z", version: 4 };
  lead.initial_management_task_id = task.id;
  let db = { users: [admin, sales, peer], leads: [lead], management_tasks: [task] };
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "crm-rfq-documents-"));
  const context = { user: admin, supabaseEnabled: false, bucket: "private-fixture", dataDir: directory,
    readDb: () => structuredClone(db), writeDb: value => { db = structuredClone(value); },
    readRawBody: async req => req.bytes, sendJson: (res, status, body) => Object.assign(res, { status, body }),
    sendDownload: (res, type, name, bytes) => Object.assign(res, { status: 200, type, name, bytes }) };
  const request = async (user, method, id = "", filename = "fixture.pdf", bytes = Buffer.from("%PDF-synthetic"), type = "application/pdf") => {
    const response = {};
    await handleTaskDocuments({ method, headers: { "x-upload-owner": user.id, "x-file-name": filename, "content-type": type }, bytes }, response,
      new URL(`http://fixture.invalid/api/management-tasks/${task.id}/documents${id ? `/${id}` : ""}`), { ...context, user });
    return response;
  };
  const id = randomUUID(), bytes = Buffer.from("%PDF-synthetic");
  assert.equal(requestRateLimitCategory("POST", `/api/management-tasks/${task.id}/documents/${id}`), "upload");
  assert.equal((await request(admin, "POST", id)).status, 201);
  assert.equal((await request(admin, "POST", id)).status, 201);
  assert.equal(db.management_task_documents.length, 1); assert.equal(db.notifications.length, 1);
  assert.equal(db.notifications[0].recipient_uid, sales.id);
  assert.deepEqual(db.leads[0], lead); assert.deepEqual(db.management_tasks[0], task);
  const list = await request(sales, "GET");
  assert.equal(list.body.length, 1); assert.equal(list.body[0].storage_key, undefined);
  assert.deepEqual((await request(sales, "GET", id)).bytes, bytes);
  for (const method of ["PATCH", "DELETE", "PUT"]) await assert.rejects(() => request(admin, method, id), { status: 405 });
  await assert.rejects(() => request(sales, "POST", randomUUID()), { status: 403 });
  await assert.rejects(() => request({...admin,status:"disabled"}, "POST", randomUUID()), { status: 403 });
  await assert.rejects(() => request(peer, "GET", id), { status: 404 });
  await assert.rejects(() => request(admin, "POST", id, "fixture.pdf", Buffer.from("%PDF-changed")), { status: 409 });
  await assert.rejects(() => request(admin, "POST", randomUUID(), "oversize.pdf", Buffer.alloc(4*1024*1024+1)), { status: 413 });
  for (const [name, content, type] of [["evil.pdf", Buffer.from("MZ"), "application/pdf"], ["evil.exe", Buffer.from("MZ"), "application/octet-stream"], ["sheet.xlsx", Buffer.from("PK"), "application/zip"]]) {
    await assert.rejects(() => request(admin, "POST", randomUUID(), name, content, type), { status: 415 });
  }
  for (const [name, type, content] of [
    ["image.PNG", "image/png", Buffer.from([137,80,78,71,13,10,26,10])],
    ["image.jpg", "image/jpeg", Buffer.from([255,216,255,224,255,217])],
    ["image.jpeg", "image/jpeg", Buffer.from([255,216,255,224,255,217])],
    ["word.doc", "application/msword", Buffer.from([208,207,17,224,161,177,26,225])]
  ]) assert.equal((await request(admin, "POST", randomUUID(), name, content, type)).status, 201);
  const docx = Buffer.concat([Buffer.from([80,75,3,4]), Buffer.from("word/document.xml")]);
  assert.equal(validateActivityAttachment({ filename: "sample.docx", contentType: "application/zip", buffer: docx }).extension, ".docx");
  await assert.rejects(() => request(admin, "POST", randomUUID()), { status: 400 });
  db.management_tasks[0].removed_at = "2026-11-21T06:00:00Z";
  await assert.rejects(() => request(sales, "GET", id), { status: 404 });
  db.management_tasks[0].removed_at = null; db.leads[0].is_archived = true;
  await assert.rejects(() => request(sales, "GET", id), { status: 404 });
  await assert.rejects(() => request(admin, "POST", randomUUID()), { status: 409 });
  assert.equal((await request(admin, "GET", id)).status, 200, "Admin retains archived document review");
  db.leads[0].is_archived = false; db.leads[0].assigned_to = peer.id;
  await assert.rejects(() => request(sales, "GET", id), { status: 404 });
  // Retain the disposable local files as test evidence; never delete hosted objects.
});

test("Supabase upload retries preserve caller credentials and never publish incomplete files", async () => {
  const user = { id: randomUUID(), role: "admin", status: "active", token: "synthetic-caller-token" };
  const task = { id: randomUUID(), lead_id: randomUUID(), assignee_id: randomUUID(), title: "Respond to Initial RFQ" };
  const lead = { id: task.lead_id, assigned_to: task.assignee_id, initial_management_task_id: task.id };
  const id = randomUUID(), bytes = Buffer.from("%PDF-synthetic");
  let document, stored = false, noticeCount = 0, uploadCount = 0, rpcFinishes = 0, response;
  let storageRelative = true;
  const calls = [];
  const context = { user, supabaseEnabled: true, bucket: "private-fixture",
    readRawBody: async () => bytes,
    sendJson: (_res, status, body) => { response = {status,body}; },
    sendDownload: (_res,type,name,content) => { response = {type,name,bytes:content}; },
    rest: async (route, options) => {
      assert.equal(options.token, user.token); calls.push(route);
      if (route.startsWith("management_tasks?")) return [task];
      if (route.startsWith("leads?")) return [lead];
      if (route.startsWith("management_task_documents?")) return document ? [document] : [];
      assert.equal(route,"rpc/save_task_document");
      assert.equal(options.body.p_id,id);
      if (!document) document = {...options.body.p_file,id,task_id:task.id,storage_key:"synthetic-private-path",uploaded_by:user.id,ready_at:null};
      if (options.body.p_finish) {
        rpcFinishes++;
        assert.equal(stored,true);
        if (!document.ready_at) { document.ready_at="2026-11-21T06:00:00Z"; noticeCount++; }
      }
      return structuredClone(document);
    },
    uploadStorageObjectToBucket: async (bucket, key, buffer, type, token) => {
      assert.equal(token,user.token); assert.equal(bucket,"private-fixture");
      assert.equal(key,document.storage_key); assert.deepEqual(buffer,bytes); assert.equal(type,"application/pdf");
      uploadCount++;
      if (!stored) { stored=true; throw Object.assign(new Error("Synthetic response lost"),{status:503}); }
      throw Object.assign(new Error("Object already exists"),{status:409});
    },
    createStorageSignedUrlForBucket: async (bucket,key,ttl,token) => {
      assert.equal(token,user.token); assert.equal(bucket,"private-fixture"); assert.equal(key,document.storage_key); assert.equal(ttl,60);
      return `https://storage-fixture.invalid${storageRelative ? "" : "/storage/v1"}/object/sign/private-file?token=synthetic`;
    }
  };
  const request = (method="POST") => handleTaskDocuments({method,headers:{"x-upload-owner":user.id,"x-file-name":"fixture.pdf","content-type":"application/pdf"}}, {},
    new URL(`http://fixture.invalid/api/management-tasks/${task.id}/documents/${id}`),context);
  await assert.rejects(request,{status:503});
  assert.equal(document.ready_at,null); assert.equal(noticeCount,0); assert.equal(rpcFinishes,0);
  const originalFetch=global.fetch;
  global.fetch=async (url,options) => {
    assert.equal(url,"https://storage-fixture.invalid/storage/v1/object/sign/private-file?token=synthetic"); assert.equal(options.redirect,"error");
    return {ok:true,arrayBuffer:async()=>bytes};
  };
  try {
    await request(); await request();
    assert.equal(uploadCount,2); assert.equal(noticeCount,1); assert.equal(rpcFinishes,1);
    assert.equal(response.status,201); assert.equal(response.body.document.ready,true);
    assert.equal(response.body.document.storage_key,undefined);
    await request("GET");
    assert.deepEqual(response.bytes,bytes,"Both download and lost-upload read-back must resolve the Storage API path");
    storageRelative = false;
    await request("GET");
    assert.deepEqual(response.bytes,bytes,"Already-correct Storage API URLs must not be prefixed twice");
    assert.ok(calls.includes("rpc/save_task_document"));
  } finally { global.fetch=originalFetch; }
});

test("SQL RFQ upload reservation, immutable metadata and Storage follow the current task/lead owner", async () => {
  const db = new PGlite(), admin = randomUUID(), sales = randomUUID(), peer = randomUUID(), task = randomUUID(), lead = randomUUID(), id = randomUUID();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create schema auth; create schema private; create schema storage;
      grant usage on schema auth,private,storage to authenticated;
      create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create table public.profiles(id uuid primary key,role text,status text,full_name text);
      create table public.leads(id uuid primary key,assigned_to uuid,is_archived boolean default false,initial_management_task_id uuid);
      create table public.management_tasks(id uuid primary key,lead_id uuid references public.leads(id) on delete set null,assignee_id uuid,title text,status text,removed_at timestamptz,version int default 4);
      create table public.notifications(id uuid default gen_random_uuid(),recipient_uid uuid,lead_id uuid,type text,title text,message text not null,payload jsonb);
      create table storage.buckets(id text primary key,public boolean default false,allowed_mime_types text[]);
      create table storage.objects(bucket_id text,name text,owner_id text,metadata jsonb);
      alter table storage.objects enable row level security;
      grant select,insert,update,delete on storage.objects to authenticated;
      create policy fixture_permissive on storage.objects for all to authenticated using(true) with check(true);
      create function private.lifecycle_admin() returns boolean language sql stable security definer set search_path=pg_catalog as $$select exists(select 1 from public.profiles where id=auth.uid() and role='admin' and status='active')$$;
      insert into storage.buckets values('private-fixture',false,null),('pmr-voice-notes',false,array['audio/webm']);`);
    for (const [user, role] of [[admin,"admin"],[sales,"salesman"],[peer,"salesman"]]) await db.query("insert into public.profiles values($1,$2,'active','Synthetic')", [user,role]);
    await db.query("update public.profiles set full_name=null where id=$1",[admin]);
    await db.query("insert into public.leads values($1,$2,false,$3)", [lead,sales,task]);
    await db.query("insert into public.management_tasks(id,lead_id,assignee_id,title,status) values($1,$2,$3,'Respond to Initial RFQ','completed')", [task,lead,sales]);
    await db.exec(fs.readFileSync(path.join(__dirname,"../supabase/migrations",migration),"utf8"));
    const bucket=(await db.query("select * from storage.buckets where id='pmr-voice-notes'")).rows[0];
    assert.equal(bucket.public,false);
    assert.deepEqual(bucket.allowed_mime_types.sort(),['audio/webm','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/png','image/jpeg'].sort());
    assert.equal((await db.query("select allowed_mime_types from storage.buckets where id='private-fixture'")).rows[0].allowed_mime_types,null);
    assert.equal((await db.query("select has_table_privilege('anon','public.management_task_documents','select') allowed")).rows[0].allowed,false);
    const as = async user => { await db.exec("reset role; set role authenticated"); await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]); };
    const file = { filename:"fixture.pdf",content_type:"application/pdf",size:14,sha256:digest(Buffer.from("%PDF-synthetic")),bucket_id:"private-fixture" };
    const save = async (finish=false, fileId=id, input=file) => (await db.query("select public.save_task_document($1,$2,$3,$4) doc",[task,fileId,input,finish])).rows[0].doc;
    await as(sales); await assert.rejects(() => save(), { code:"42501" });
    await as(admin);
    await assert.rejects(()=>save(false,randomUUID(),{...file,filename:"mismatch.jpg"}),{code:"23514"});
    const pending=await save(); assert.equal(pending.ready_at,null);
    await assert.rejects(() => save(true), {code:"PT409"});
    await db.query("insert into storage.objects values('private-fixture',$1,$2,'{\"size\":14}')",[pending.storage_key,admin]);
    await as(sales); assert.equal((await db.query("select * from public.management_task_documents")).rows.length,0);
    assert.equal((await db.query("select * from storage.objects")).rows.length,0);
    await as(admin); await save(true); await save(true);
    await db.exec("reset role"); assert.equal((await db.query("select count(*)::int n from public.notifications")).rows[0].n,1);
    assert.match((await db.query("select message from public.notifications")).rows[0].message,/^Admin added/);
    await as(sales); assert.equal((await db.query("select * from public.management_task_documents")).rows.length,1);
    assert.equal((await db.query("select * from storage.objects")).rows.length,1);
    for(const statement of ["update public.management_task_documents set filename='forged'", "delete from public.management_task_documents"]) await assert.rejects(()=>db.exec(statement),{code:"42501"});
    assert.equal((await db.query("delete from storage.objects returning name")).rows.length,0);
    await as(peer); assert.equal((await db.query("select * from public.management_task_documents")).rows.length,0);
    for(const change of ["update public.management_tasks set removed_at=now()", "update public.leads set is_archived=true", `update public.leads set assigned_to='${peer}'`]) {
      await db.exec("reset role; update public.management_tasks set removed_at=null; update public.leads set is_archived=false");
      await db.query("update public.leads set assigned_to=$1",[sales]); await db.exec(change);
      await as(sales); assert.equal((await db.query("select * from public.management_task_documents")).rows.length,0);
      assert.equal((await db.query("select * from storage.objects")).rows.length,0);
    }
    await as(admin); await assert.rejects(()=>save(false,randomUUID()),{code:"P0002"});
    await db.exec("reset role"); assert.equal((await db.query("select status,version from public.management_tasks")).rows[0].status,"completed");
    assert.equal((await db.query("select version from public.management_tasks")).rows[0].version,4);
    await db.query("update public.leads set assigned_to=$1,is_archived=false",[sales]);
    await as(admin); await assert.rejects(()=>save(false,id,{...file,sha256:'0'.repeat(64)}),{code:"PT409"});
    for(let i=0;i<4;i++) await save(false,randomUUID());
    await assert.rejects(()=>save(false,randomUUID()),{code:"22023"});
    await db.exec("reset role; delete from public.leads");
    assert.equal((await db.query("select count(*)::int n from public.management_task_documents where lead_id is null")).rows[0].n,5,"Existing approved lead-purge flow is not blocked by the new metadata FK");
  } finally { await db.close(); }
});
