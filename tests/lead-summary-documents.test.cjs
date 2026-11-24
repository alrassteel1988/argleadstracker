const {test}=require("node:test");
const assert=require("node:assert/strict");
const {randomUUID,createHash}=require("node:crypto");
const fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {PGlite}=require("@electric-sql/pglite");
const {handleLeadSummaryDocuments,reviewDate}=require("../src/services/leadSummaryDocumentRoutes");
const {requestRateLimitCategory}=require("../src/services/rateLimitService");
const migration=fs.readFileSync(path.join(__dirname,"../supabase/migrations/20261123122322_lead_summary_document_versions.sql"),"utf8");
const hash=bytes=>createHash("sha256").update(bytes).digest("hex");
const responseStub=()=>({headers:{},setHeader(name,value){this.headers[name]=value;}});

test("Git-only summary branch cannot trigger automatic Vercel deployment",()=>{
  const config=JSON.parse(fs.readFileSync(path.join(__dirname,"../vercel.json"),"utf8"));
  assert.deepEqual(config.git.deploymentEnabled,{"codex/lead-summary-versions":false});
  assert.equal(config.git.deploymentEnabled.main,undefined,"Do not alter main or other branch deployment settings");
});

test("manual summaries retain originals, restrict archives and resolve competing replacements",async()=>{
  const admin={id:randomUUID(),name:"Synthetic Admin",role:"admin",status:"active"};
  const sales={id:randomUUID(),role:"salesman",status:"active"},peer={...sales,id:randomUUID()};
  const lead={id:randomUUID(),assigned_to:sales.id,is_archived:false,activities:[{text:"Original history"}]};
  const task={id:randomUUID(),lead_id:lead.id,assignee_id:sales.id,status:"not_started"};
  const peerTask={...task,id:randomUUID(),assignee_id:peer.id};
  let db={users:[admin,sales,peer],leads:[lead],management_tasks:[task,peerTask]};
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"crm-summary-"));
  let readBody=async request=>request.bytes;
  const bytes=Buffer.from("%PDF-1.4 synthetic only");
  const request=async(user,method="GET",id="",previous="",note="",body=bytes,query="")=>{
    const res=responseStub();
    await handleLeadSummaryDocuments({method,bytes:body,headers:{"x-upload-owner":user.id,"x-file-name":"synthetic.pdf","x-current-document":previous,"x-change-note":encodeURIComponent(note)}},res,
      new URL(`http://fixture.invalid/api/leads/${lead.id}/summary-documents${id ? '/'+id : ''}${query}`),{
        user,supabaseEnabled:false,bucket:"private-summary-fixture",dataDir:dir,readDb:()=>structuredClone(db),writeDb:value=>{db=structuredClone(value);},
        readRawBody:req=>readBody(req),sendJson:(response,status,data)=>Object.assign(response,{status,data}),
        sendDownload:(response,type,name,body)=>Object.assign(response,{status:200,body,type,name})});
    assert.equal(res.headers["Cache-Control"],"private, no-store");
    assert.equal(res.headers.Vary,"Authorization, Cookie");
    return res;
  };
  const id=randomUUID();
  assert.equal(requestRateLimitCategory("POST",`/api/leads/${lead.id}/summary-documents/${id}`),"upload");
  await assert.rejects(()=>request(peer),{status:404});
  await assert.rejects(()=>request(sales,"POST",id),{status:403});
  for(const method of ["PUT","PATCH","DELETE"]) await assert.rejects(()=>request(admin,method,id),{status:405});
  assert.equal((await request(sales)).data.documents.length,0);
  await assert.rejects(()=>request(admin,"POST",id,"","",Buffer.from("not a PDF")),{status:415});
  const first=(await request(admin,"POST",id)).data.document;
  await request(admin,"POST",id);
  assert.equal(db.lead_summary_document_events.length,1);
  assert.deepEqual(db.leads[0],lead);
  assert.equal(first.version,1); assert.equal(first.storage_key,undefined);
  assert.deepEqual((await request(sales,"GET",id)).body,bytes);
  const taskLinks=async user=>{
    const response=responseStub();await handleLeadSummaryDocuments({method:"GET"},response,
      new URL(`http://fixture.invalid/api/management-task-summary-documents?ids=${task.id},${peerTask.id}`),{
        user,supabaseEnabled:false,readDb:()=>structuredClone(db),sendJson:(res,status,data)=>Object.assign(res,{status,data})});
    assert.equal(response.headers["Cache-Control"],"private, no-store");
    return response.data.attachments;
  };
  assert.equal((await taskLinks(admin)).length,2);
  assert.equal((await taskLinks(sales)).length,1);
  assert.equal((await taskLinks(sales))[0].document.id,id,"Tasks and Intel must reference the same stored document");
  assert.equal((await taskLinks(peer))[0]?.document || null,null,"Task ownership alone cannot expose a different owner's lead summary");
  await assert.rejects(()=>request(sales,"GET","","","",bytes,"?archived=1"),{status:403});
  await assert.rejects(()=>request(admin,"POST",randomUUID(),id),{status:400});
  const ids=[randomUUID(),randomUUID()];
  const outcomes=await Promise.allSettled(ids.map(next=>request(admin,"POST",next,id,"Quarterly review")));
  assert.equal(outcomes.filter(row=>row.status==="fulfilled").length,1);
  assert.equal(outcomes.find(row=>row.status==="rejected").reason.status,409);
  const latest=(await request(sales)).data.documents;
  assert.equal(latest.length,1); assert.equal(latest[0].version,2);
  assert.equal((await taskLinks(sales))[0].document.id,latest[0].id,"Task links follow the latest lead summary, not an old copy");
  await assert.rejects(()=>request(sales,"GET",id),{status:404});
  assert.deepEqual((await request(admin,"GET",id)).body,bytes);
  assert.equal((await request(admin,"GET","","","",bytes,"?archived=1")).data.documents[0].id,id);
  assert.equal(db.lead_summary_document_events.length,2);
  const current=latest[0].id;
  readBody=async req=>{db.leads[0].assigned_to=peer.id;return req.bytes;};
  await request(admin,"POST",randomUUID(),current,"New assignment reviewed");
  await assert.rejects(()=>request(sales),{status:404});
  assert.equal((await request(peer)).data.documents.length,1);
  db.leads[0].is_archived=true;
  await assert.rejects(()=>request(peer),{status:404});
  await assert.rejects(()=>request(admin,"POST",randomUUID(),current,"Archived"),{status:403});
  assert.equal((await request(admin)).data.documents.length,1);
  assert.equal(reviewDate("2026-11-30T12:00:00.000Z"),"2027-02-28T12:00:00.000Z");
});

test("Step 3 summary retry retains one saved lead and one stable upload identity",async()=>{
  const vm=require("node:vm"),source=fs.readFileSync(path.join(__dirname,"../client.js"),"utf8");
  const draft={owner:"synthetic-admin",rfqEnabled:false,files:[{id:randomUUID(),file:{name:"hidden-rfq.pdf"},saved:false}],summary:{id:randomUUID(),file:{name:"summary.pdf"},saved:false}};
  const lead={id:randomUUID(),initial_management_task_id:randomUUID()},requests=[];
  const context={rfqLeadUpload:draft,state:{currentUser:{id:draft.owner,role:"admin"}},renderRfqLeadFiles(){},
    authenticatedFetch:async(url,options)=>{requests.push({url,options});return {ok:requests.length>1,json:async()=>({error:"Synthetic lost upload response"})};}};
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf("async function uploadRfqLeadFiles("),source.indexOf("async function uploadTaskDocument(")),context);
  await assert.rejects(()=>context.uploadRfqLeadFiles(lead,draft),/lost upload response/);
  assert.equal(draft.savedLead,lead);
  await context.uploadRfqLeadFiles(lead,draft);await context.uploadRfqLeadFiles(lead,draft);
  assert.equal(requests.length,2);assert.equal(requests[0].url,requests[1].url);assert.equal(draft.summary.saved,true);
  assert.ok(requests.every(request=>request.url.includes('/summary-documents/')),"Retry must never register another lead or task");
  assert.equal(draft.files[0].saved,false,"Hidden RFQ selections must not be uploaded for Outreach tasks");
});

test("SQL summary publication is atomic, append-only and isolated even with a broad Storage policy",async()=>{
  const db=new PGlite(),admin=randomUUID(),sales=randomUUID(),peer=randomUUID(),lead=randomUUID();
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role;
      create schema auth;create schema private;create schema storage;
      grant usage on schema auth,private,storage to authenticated;
      create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create table public.profiles(id uuid primary key,role text,status text,full_name text);
      create table public.leads(id uuid primary key,assigned_to uuid,is_archived boolean default false);
      create function private.lifecycle_admin() returns boolean language sql stable security definer set search_path=pg_catalog as $$select exists(select 1 from public.profiles where id=auth.uid() and role='admin' and status='active')$$;
      create table storage.buckets(id text primary key,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(bucket_id text,name text,owner_id text,metadata jsonb);
      alter table storage.objects enable row level security;
      grant select,insert,update,delete on storage.objects to authenticated;
      create policy broad_owner_fixture on storage.objects for all to authenticated using(true) with check(true);
      insert into storage.buckets values('private-summary-fixture',false,10485760,array['application/pdf']);`);
    for(const [id,role] of [[admin,"admin"],[sales,"salesman"],[peer,"salesman"]]) await db.query("insert into public.profiles values($1,$2,'active','Synthetic')",[id,role]);
    await db.query("insert into public.leads values($1,$2,false)",[lead,sales]);
    await db.exec(migration);
    const as=async user=>{await db.exec("reset role;set role authenticated");await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);};
    const file={filename:"synthetic.pdf",content_type:"application/pdf",size:20,sha256:"a".repeat(64),bucket_id:"private-summary-fixture"};
    const save=async(id,previous=null,finish=false,note="")=>(await db.query("select public.save_lead_summary_document($1,$2,$3,$4,$5,$6) doc",[lead,id,previous,note,file,finish])).rows[0].doc;
    const store=doc=>db.query("insert into storage.objects values($1,$2,$3,$4)",[doc.bucket_id,doc.storage_key,admin,{size:20,mimetype:"application/pdf"}]);
    const first=randomUUID();
    await as(sales);await assert.rejects(()=>save(first),{code:"42501"});
    await as(admin);const reservation=await save(first);
    await assert.rejects(()=>save(first,null,true),{code:"PT409"});
    await store(reservation);
    await as(sales);assert.equal((await db.query("select * from public.lead_summary_documents")).rows.length,0);
    assert.equal((await db.query("select * from storage.objects")).rows.length,0);
    await as(admin);const original=await save(first,null,true);await save(first,null,true);
    assert.equal(original.version,1);
    assert.equal((await db.query("select * from public.lead_summary_document_events")).rows.length,1);
    for(const statement of ["update public.lead_summary_documents set filename='forged.pdf'","delete from public.lead_summary_documents","delete from public.lead_summary_document_events"])
      await assert.rejects(()=>db.exec(statement),{code:"42501"});
    assert.equal((await db.query("update storage.objects set name=name returning *")).rows.length,0);
    assert.equal((await db.query("delete from storage.objects returning *")).rows.length,0);
    await as(sales);assert.equal((await db.query("select * from public.lead_summary_documents")).rows.length,1);
    assert.equal((await db.query("select * from public.lead_summary_document_events")).rows.length,0);
    const a=randomUUID(),b=randomUUID();
    await as(admin);const reservedA=await save(a,first,false,"Updated review"),reservedB=await save(b,first,false,"Updated review");
    await store(reservedA);await store(reservedB);
    const outcomes=await Promise.allSettled([save(a,first,true,"Updated review"),save(b,first,true,"Updated review")]);
    assert.equal(outcomes.filter(row=>row.status==="fulfilled").length,1);
    assert.equal(outcomes.find(row=>row.status==="rejected").reason.code,"PT409");
    const current=(await db.query("select * from public.lead_summary_documents where is_current")).rows[0];
    assert.equal(current.version,2);
    assert.equal((await db.query("select * from public.lead_summary_document_events")).rows.length,2);
    assert.equal((await db.query("select * from public.lead_summary_documents where id=$1",[first])).rows[0].sha256,file.sha256);
    await as(sales);assert.equal((await db.query("select * from public.lead_summary_documents")).rows.length,1);
    assert.equal((await db.query("select * from storage.objects")).rows.length,1);
    assert.equal((await db.query("select * from public.lead_summary_documents where id=$1",[first])).rows.length,0);
    await as(peer);assert.equal((await db.query("select * from storage.objects")).rows.length,0);
    await db.exec("reset role");await db.query("update public.leads set assigned_to=$1",[peer]);
    await as(sales);assert.equal((await db.query("select * from public.lead_summary_documents")).rows.length,0);
    await as(peer);assert.equal((await db.query("select * from public.lead_summary_documents")).rows.length,1);
    await db.exec("reset role;update public.leads set is_archived=true");
    await as(peer);assert.equal((await db.query("select * from storage.objects")).rows.length,0);
    await as(admin);await assert.rejects(()=>save(randomUUID(),current.id,false,"Archive"),{code:"P0002"});
    assert.equal((await db.query("select * from public.lead_summary_documents")).rows.length,3);
    await db.exec("reset role;delete from public.leads");
    await as(admin);assert.equal((await db.query("select * from storage.objects")).rows.length,0,"Purged leads must not expose orphaned files");
    await db.exec("reset role");
    assert.equal((await db.query("select has_function_privilege('anon','public.save_lead_summary_document(uuid,uuid,uuid,text,jsonb,boolean)','execute') allowed")).rows[0].allowed,false);
  } finally {await db.close();}
});

test("summary dialogs clear private drafts, escape metadata and deduplicate pending panel refreshes",async()=>{
  const vm=require("node:vm"),source=fs.readFileSync(path.join(__dirname,"../client.js"),"utf8");
  const context={escapeHtml:text=>String(text).replaceAll('<','&lt;'),formatDateTime:String,formatDisplayDate:String,Date};
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf("let leadSummaryDialog ="),source.indexOf("function renderDrawerIntel(")),context);
  const calls=[],draft={file:{name:"private.pdf"},abort:{abort:()=>calls.push("abort")},pdfCleanup:()=>calls.push("destroy"),dialog:{remove:()=>calls.push("remove")}};
  context.draft=draft;vm.runInContext("leadSummaryDialog=draft;closeLeadSummaryDialog()",context);
  assert.equal(draft.file,null);assert.deepEqual(calls,["abort","destroy","remove"]);
  assert.match(vm.runInContext("leadSummaryDocumentMarkup({id:'synthetic',filename:'<private>.pdf',version:1,uploaded_by_name:'<Admin>',published_at:'2026-11-23',review_due_at:'2027-02-23',change_note:'<note>'})",context),/&lt;private>/);
  assert.match(vm.runInContext("leadSummaryPanelMarkup({id:'synthetic'})",context),/data-lead-summary="synthetic"/);
  assert.match(source,/state\.leadDrawerLoading\s*\? `\$\{state\.leadDrawerTab === "intel" \? leadSummaryPanelMarkup\(lead\)/,"Manual summaries stay available while unrelated Intel requests load");
  assert.match(source,/previousSummary\.dataset\.summaryOwner===String\(state\.currentUser\?\.id\)/);
  assert.match(source,/!lead\.is_archived && lead\.assigned_to===state\.currentUser\.id/);
  let resolve,callsCount=0;
  context.state={currentUser:{id:"synthetic-admin",role:"admin",status:"active"}};
  context.api=()=>{callsCount++;return new Promise(done=>{resolve=done;});};
  const panel={dataset:{leadSummary:"synthetic"},isConnected:true,querySelector:()=>null,querySelectorAll:()=>[]};
  const pending=context.loadLeadSummaryPanel(panel);
  await context.loadLeadSummaryPanel(panel);
  assert.equal(callsCount,1,"A redraw must not restart the same metadata request");
  resolve({documents:[],can_upload:false});await pending;
  assert.equal(panel.summaryRequestPending,false);
  assert.equal(panel.dataset.summaryLoaded,"true");
});

test("Supabase summary reads preserve caller tokens and recheck access after private byte retrieval",async()=>{
  const user={id:randomUUID(),role:"salesman",status:"active",token:"synthetic-caller-token"},lead=randomUUID(),id=randomUUID();
  const bytes=Buffer.from("%PDF-synthetic"),doc={id,lead_id:lead,is_current:true,ready_at:new Date().toISOString(),version:1,
    size:bytes.length,sha256:hash(bytes),filename:"synthetic.pdf",bucket_id:"private-fixture",storage_key:`lead-summaries/${lead}/${id}.pdf`};
  let visible=true,sent=0;
  const context={user,supabaseEnabled:true,rest:async(route,options)=>{
    assert.equal(options.token,user.token);assert.equal(options.serviceRole,undefined);
    if(route.startsWith("leads?")) return [{id:lead,assigned_to:user.id,is_archived:false}];
    assert.ok(route.startsWith("lead_summary_documents?"));
    return route.endsWith("select=id") ? visible ? [{id}] : [] : [doc];
  },createStorageSignedUrlForBucket:async(bucket,key,ttl,token)=>{
    assert.equal(token,user.token);assert.equal(ttl,60);assert.equal(key,doc.storage_key);
    return "https://synthetic.invalid/object/sign/private-file?token=synthetic";
  },sendDownload:(res,type,name,body)=>{sent++;assert.deepEqual(body,bytes);}};
  const original=global.fetch;
  global.fetch=async(url,options)=>{assert.equal(url,"https://synthetic.invalid/storage/v1/object/sign/private-file?token=synthetic");assert.equal(options.redirect,"error");return {ok:true,arrayBuffer:async()=>bytes};};
  const request=()=>handleLeadSummaryDocuments({method:"GET"},responseStub(),new URL(`http://fixture.invalid/api/leads/${lead}/summary-documents/${id}`),context);
  try {await request();visible=false;await assert.rejects(request,{status:404});assert.equal(sent,1);}
  finally {global.fetch=original;}
});
