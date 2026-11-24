const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { safeOriginalFilename } = require("./activityWorkflowService");
const { canReadManagementTask } = require("./managementTaskService");

const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const fail = (status, message) => Object.assign(new Error(message), { status });
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
const canRead = (user, lead) => user?.status === "active" && lead &&
  (user.role === "admin" || user.role === "salesman" && !lead.is_archived && String(lead.assigned_to) === String(user.id));
const currentDocument = (db, leadId) => (db.lead_summary_documents || []).find(doc => doc.lead_id === leadId && doc.is_current && doc.ready_at);

function publicDocument(doc) {
  if (!doc) return null;
  return { id:doc.id, filename:doc.filename, size:doc.size, version:doc.version,
    published_at:doc.ready_at, review_due_at:doc.review_due_at, uploaded_by_name:doc.uploaded_by_name,
    change_note:doc.change_note, is_current:doc.is_current, archived_at:doc.archived_at,
    download_url:`/api/leads/${doc.lead_id}/summary-documents/${doc.id}` };
}

function reviewDate(iso) {
  const date = new Date(iso), day = date.getUTCDate();
  date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() + 3);
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day,end));
  return date.toISOString();
}

function localActor(db, user, leadId, upload = false) {
  const actor = db.users?.find(row => String(row.id) === String(user.id));
  const lead = db.leads?.find(row => String(row.id) === leadId);
  if (!canRead(actor,lead)) throw fail(404,"Lead not found.");
  if (upload && (actor.role !== "admin" || lead.is_archived)) throw fail(403,"Only an active Admin can publish a summary on an active lead.");
  return { actor, lead };
}

function saveLocal(db, user, leadId, id, previous, note, file, finish) {
  const {actor,lead} = localActor(db,user,leadId,true);
  db.lead_summary_documents ||= [];
  let doc = db.lead_summary_documents.find(row => row.id === id);
  const current = currentDocument(db,leadId);
  if (doc && (doc.lead_id !== leadId || doc.uploaded_by !== user.id || doc.previous_id !== previous || doc.change_note !== note
    || Object.keys(file).some(key => doc[key] !== file[key]))) throw fail(409,"This upload request was already used.");
  if (doc?.ready_at) {
    if (!doc.is_current) throw fail(409,"A newer summary is current. Reload before replacing it.");
    return doc;
  }
  if ((current?.id || null) !== previous || doc && doc.assigned_to_at_upload !== lead.assigned_to) throw fail(409,"The lead or current summary changed. Reload before replacing it.");
  if (previous && !note) throw fail(400,"Enter a reason for replacing the summary.");
  if (!doc) {
    if (finish) throw fail(409,"Upload reservation is missing.");
    if (db.lead_summary_documents.filter(row => row.lead_id === leadId && !row.ready_at).length >= 20) throw fail(409,"There are too many incomplete summary uploads. Ask management to review them.");
    doc = { ...file,id,lead_id:leadId,previous_id:previous,change_note:note,assigned_to_at_upload:lead.assigned_to,
      uploaded_by:user.id,uploaded_by_name:actor.name || "Admin",created_at:new Date().toISOString(),ready_at:null,
      version:null,is_current:false,archived_at:null,storage_key:`lead-summaries/${leadId}/${id}.pdf` };
    db.lead_summary_documents.push(doc);
  }
  if (finish) {
    const now = new Date().toISOString();
    if (current) { current.is_current = false; current.archived_at = now; }
    doc.version = Math.max(0,...db.lead_summary_documents.filter(row=>row.lead_id === leadId).map(row=>row.version || 0)) + 1;
    doc.ready_at = now; doc.is_current = true; doc.review_due_at = reviewDate(now);
    db.lead_summary_document_events ||= [];
    db.lead_summary_document_events.push({id:doc.id,lead_id:leadId,document_id:id,previous_id:previous,
      action:previous ? "replaced" : "published",actor_id:actor.id,at:now,reason:note});
  }
  return doc;
}

async function handleLeadSummaryDocuments(req,res,url,context) {
  const taskLinks=url.pathname === "/api/management-task-summary-documents";
  const match = url.pathname.match(/^\/api\/leads\/([^/]+)\/summary-documents(?:\/([^/]+))?$/);
  if (!taskLinks && !match) return false;
  res.setHeader("Cache-Control","private, no-store");
  res.setHeader("Vary","Authorization, Cookie");
  if (taskLinks) {
    const {user,supabaseEnabled,rest,readDb,sendJson}=context;
    if (req.method!=="GET") throw fail(405,"Task summary links are read-only.");
    if (!["admin","salesman"].includes(user.role) || user.status!=="active") throw fail(403,"An active CRM account is required.");
    const ids=[...new Set(String(url.searchParams.get("ids") || "").split(",").filter(Boolean))];
    if (ids.length>100 || ids.some(id=>!uuid.test(id))) throw fail(400,"Choose up to 100 valid task IDs.");
    if (!ids.length) {sendJson(res,200,{attachments:[]});return true;}
    const local=supabaseEnabled ? null : readDb();
    const tasks=supabaseEnabled ? await rest(`management_tasks?id=in.(${ids.join(",")})&select=id,lead_id,assignee_id,removed_at,status`,{token:user.token})
      : (local.management_tasks || []).filter(task=>ids.includes(task.id) && canReadManagementTask(local,user,task));
    const leadIds=[...new Set(tasks.map(task=>task.lead_id).filter(Boolean))];
    const docs=!leadIds.length ? [] : supabaseEnabled
      ? await rest(`lead_summary_documents?lead_id=in.(${leadIds.join(",")})&is_current=eq.true&ready_at=not.is.null&select=*&limit=100`,{token:user.token})
      : (local.lead_summary_documents || []).filter(doc=>leadIds.includes(doc.lead_id) && doc.is_current && doc.ready_at && canRead(local.users.find(actor=>actor.id===user.id),local.leads.find(lead=>lead.id===doc.lead_id)));
    const attachments=tasks.filter(task=>user.role==="admin" || !task.removed_at && task.assignee_id===user.id)
      .map(task=>({task_id:task.id,lead_id:task.lead_id,document:publicDocument(docs.find(doc=>doc.lead_id===task.lead_id))}));
    sendJson(res,200,{attachments});return true;
  }
  const {user,supabaseEnabled,rest,readDb,writeDb,readRawBody,sendJson,sendDownload,dataDir,bucket,
    uploadStorageObjectToBucket,createStorageSignedUrlForBucket} = context;
  const [,leadId,id] = match;
  if (id && !uuid.test(id)) throw fail(400,"Invalid document ID.");
  if (!["admin","salesman"].includes(user.role) || user.status !== "active") throw fail(403,"An active CRM account is required.");
  if (req.method !== "GET" && !(req.method === "POST" && id)) throw fail(405,"Summary versions cannot be edited or deleted. Publish a new version.");
  const upload = req.method === "POST", history = url.searchParams.get("archived") === "1";
  if ((upload || history) && user.role !== "admin") throw fail(403,"Admin access required.");
  const lead = supabaseEnabled ? (await rest(`leads?id=eq.${encodeURIComponent(leadId)}&select=id,assigned_to,is_archived`,{token:user.token}))[0]
    : localActor(readDb(),user,leadId,upload).lead;
  if (!canRead(user,lead)) throw fail(404,"Lead not found.");
  if (upload && lead.is_archived) throw fail(403,"Restore the lead before publishing a new summary.");
  if (!upload) {
    const offset = Number(url.searchParams.get("offset") || 0);
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000) throw fail(400,"Invalid archive page.");
    let documents = supabaseEnabled ? await rest(`lead_summary_documents?lead_id=eq.${encodeURIComponent(leadId)}&ready_at=not.is.null&${id ? `id=eq.${id}` : history ? "is_current=eq.false" : "is_current=eq.true"}&select=*&order=version.desc&limit=21&offset=${id ? 0 : offset}`,{token:user.token})
      : (readDb().lead_summary_documents || []).filter(doc=>doc.lead_id === leadId && doc.ready_at && (id ? doc.id === id : history ? !doc.is_current : doc.is_current)).sort((a,b)=>b.version-a.version).slice(offset,offset+21);
    documents = documents.filter(doc=>user.role === "admin" || doc.is_current);
    if (!id) { sendJson(res,200,{documents:documents.slice(0,20).map(publicDocument),has_more:documents.length>20,can_upload:user.role === "admin" && !lead.is_archived}); return true; }
    const doc = documents[0];
    if (!doc) throw fail(404,"Summary version not found.");
    let bytes;
    if (supabaseEnabled) {
      const signed = new URL(await createStorageSignedUrlForBucket(doc.bucket_id,doc.storage_key,60,user.token));
      if (signed.pathname.startsWith("/object/sign/")) signed.pathname = `/storage/v1${signed.pathname}`;
      const response = await fetch(signed.href,{redirect:"error"});
      if (!response.ok) throw fail(404,"Summary document is unavailable.");
      bytes = Buffer.from(await response.arrayBuffer());
      const stillVisible = await rest(`lead_summary_documents?lead_id=eq.${encodeURIComponent(leadId)}&id=eq.${id}&select=id`,{token:user.token});
      if (!stillVisible.length) throw fail(404,"Summary version not found.");
    } else {
      const target = path.resolve(dataDir,doc.storage_key);
      if (!target.startsWith(path.resolve(dataDir)+path.sep) || !fs.existsSync(target)) throw fail(404,"Summary document is unavailable.");
      bytes = fs.readFileSync(target);
      // Recheck the live assignment and current version after loading private bytes.
      const fresh = readDb(),currentActor = localActor(fresh,user,leadId).actor;
      if (currentActor.role !== "admin" && currentDocument(fresh,leadId)?.id !== id) throw fail(404,"Summary version not found.");
    }
    if (bytes.length !== doc.size || digest(bytes) !== doc.sha256) throw fail(409,"Summary integrity check failed.");
    sendDownload(res,"application/pdf",safeOriginalFilename(doc.filename),bytes); return true;
  }
  if (req.headers["x-upload-owner"] !== String(user.id)) throw fail(403,"The upload account changed.");
  let filename,note;
  try { filename = decodeURIComponent(String(req.headers["x-file-name"] || "")); note = decodeURIComponent(String(req.headers["x-change-note"] || "")).trim(); }
  catch { throw fail(400,"Invalid upload metadata."); }
  const previous = String(req.headers["x-current-document"] || "") || null;
  if (previous && !uuid.test(previous) || note.length > 500) throw fail(400,"Invalid current version or change note.");
  if (previous && !note) throw fail(400,"Enter a reason for replacing the summary.");
  const bytes = await readRawBody(req,4*1024*1024,"Summary PDFs must be 4 MB or smaller.");
  if (!bytes.length || bytes.length>4*1024*1024 || !/\.pdf$/i.test(filename) || bytes.subarray(0,5).toString() !== "%PDF-") throw fail(415,"Choose a PDF up to 4 MB.");
  const file = {filename:safeOriginalFilename(filename),size:bytes.length,sha256:digest(bytes),content_type:"application/pdf",bucket_id:bucket};
  const rpc = finish=>rest("rpc/save_lead_summary_document",{method:"POST",token:user.token,body:{p_lead:leadId,p_id:id,p_previous:previous,p_note:note,p_file:file,p_finish:finish}});
  let doc;
  if (supabaseEnabled) doc = await rpc(false);
  else { const fresh=readDb(); doc=saveLocal(fresh,user,leadId,id,previous,note,file,false); writeDb(fresh); }
  if (!doc.ready_at) {
    if (supabaseEnabled) {
      try { await uploadStorageObjectToBucket(bucket,doc.storage_key,bytes,"application/pdf",user.token); }
      catch(error) {
        if (![400,409].includes(error.status)) throw error;
        const signed=new URL(await createStorageSignedUrlForBucket(bucket,doc.storage_key,60,user.token));
        if (signed.pathname.startsWith("/object/sign/")) signed.pathname=`/storage/v1${signed.pathname}`;
        const existing=await fetch(signed.href,{redirect:"error"});
        if (!existing.ok || digest(Buffer.from(await existing.arrayBuffer())) !== file.sha256) throw fail(409,"Stored upload differs from this file.");
      }
      doc=await rpc(true);
    } else {
      const target=path.join(dataDir,doc.storage_key); fs.mkdirSync(path.dirname(target),{recursive:true});
      if (fs.existsSync(target)) { if(digest(fs.readFileSync(target))!==file.sha256) throw fail(409,"Stored upload differs from this file."); }
      else fs.writeFileSync(target,bytes,{flag:"wx"});
      const fresh=readDb(); doc=saveLocal(fresh,user,leadId,id,previous,note,file,true); writeDb(fresh);
    }
  }
  sendJson(res,201,{document:publicDocument(doc)}); return true;
}

module.exports = {handleLeadSummaryDocuments,reviewDate};
