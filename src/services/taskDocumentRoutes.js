const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { validateActivityAttachment, safeOriginalFilename } = require("./activityWorkflowService");
const { canReadManagementTask } = require("./managementTaskService");

const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const failure = (status, message) => Object.assign(new Error(message), { status });
const hash = buffer => createHash("sha256").update(buffer).digest("hex");
function publicDocument(doc, user) {
  return { id: doc.id, filename: doc.filename, size: doc.size, content_type: doc.content_type,
    uploaded_at: doc.ready_at || doc.created_at, uploaded_by_name: doc.uploaded_by_name, ready: Boolean(doc.ready_at),
    can_retry: !doc.ready_at && user.role === "admin" && doc.uploaded_by === user.id,
    download_url: `/api/management-tasks/${doc.task_id}/documents/${doc.id}` };
}

async function handleTaskDocuments(req, res, url, context) {
  const match = url.pathname.match(/^\/api\/management-tasks\/([^/]+)\/documents(?:\/([^/]+))?$/);
  if (!match) return false;
  const { user, supabaseEnabled, rest, sendJson, sendDownload, readRawBody, readDb, writeDb,
    dataDir, bucket, uploadStorageObjectToBucket, createStorageSignedUrlForBucket } = context;
  const [, taskId, documentId] = match;
  if (!uuid.test(taskId) || documentId && !uuid.test(documentId)) throw failure(400, "Invalid task or document ID.");
  if (!["admin", "salesman"].includes(user.role)) throw failure(403, "Management task access required.");
  if (user.status !== "active") throw failure(403, "An active CRM account is required.");
  if (req.method !== "GET" && !(req.method === "POST" && documentId)) throw failure(405, "RFQ documents cannot be edited or deleted.");
  if (req.method === "POST" && user.role !== "admin") throw failure(403, "Only Admin can upload RFQ supporting documents.");
  if (req.method === "POST" && req.headers["x-upload-owner"] !== String(user.id)) throw failure(403, "The upload account changed. Sign in again.");
  const local = supabaseEnabled ? null : readDb();
  const task = supabaseEnabled
    ? (await rest(`management_tasks?id=eq.${taskId}&select=*`, { token: user.token }))[0]
    : local.management_tasks?.find(item => item.id === taskId && canReadManagementTask(local, user, item));
  if (!task) throw failure(404, "Task not found.");
  const lead = supabaseEnabled
    ? (await rest(`leads?id=eq.${encodeURIComponent(task.lead_id || "")}&select=*`, { token: user.token }))[0]
    : local.leads.find(item => item.id === task.lead_id);
  if (!lead || user.role !== "admin" && (lead.is_archived || lead.assigned_to !== user.id || task.removed_at)) throw failure(404, "Task not found.");
  const docs = supabaseEnabled
    ? await rest(`management_task_documents?task_id=eq.${taskId}&${documentId ? `id=eq.${documentId}&` : user.role === "admin" ? "" : "ready_at=not.is.null&"}select=*&order=created_at.asc,id.asc`, { token: user.token })
    : (local.management_task_documents || []).filter(item => item.task_id === taskId && (!documentId || item.id === documentId));
  if (req.method === "GET" && !documentId) { sendJson(res, 200, docs.filter(doc => doc.ready_at || user.role === "admin").map(doc => publicDocument(doc, user))); return true; }
  if (req.method === "GET") {
    const doc = docs.find(item => item.id === documentId && item.ready_at);
    if (!doc) throw failure(404, "Document not found.");
    let bytes;
    if (supabaseEnabled) {
      const signed = await createStorageSignedUrlForBucket(doc.bucket_id, doc.storage_key, 60, user.token);
      const response = await fetch(signed, { redirect: "error" });
      if (!response.ok) throw failure(404, "Supporting document is unavailable.");
      bytes = Buffer.from(await response.arrayBuffer());
    } else bytes = fs.readFileSync(path.join(dataDir, doc.storage_key));
    if (bytes.length !== doc.size || hash(bytes) !== doc.sha256) throw failure(409, "Document integrity check failed.");
    sendDownload(res, doc.content_type, safeOriginalFilename(doc.filename), bytes); return true;
  }
  if (lead.is_archived || task.removed_at || task.title !== "Respond to Initial RFQ" || lead.initial_management_task_id !== taskId
    || lead.assigned_to !== task.assignee_id) throw failure(409, "Choose an active initial RFQ task.");
  const bytes = await readRawBody(req, 4 * 1024 * 1024, "Documents must be 4 MB or smaller.");
  if (bytes.length > 4 * 1024 * 1024) throw failure(413, "Documents must be 4 MB or smaller.");
  let filename;
  try { filename = decodeURIComponent(String(req.headers["x-file-name"] || "")); }
  catch { throw failure(400, "Invalid filename."); }
  if (!/\.(pdf|docx?|png|jpe?g)$/i.test(filename)) throw failure(415, "Choose a PDF, Word, PNG or JPEG document.");
  const validated = validateActivityAttachment({ filename, contentType: req.headers["content-type"], buffer: bytes });
  const contentType = { ".doc": "application/msword", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }[validated.extension] || validated.contentType;
  const file = { filename: validated.filename, size: bytes.length, sha256: hash(bytes), content_type: contentType, bucket_id: bucket };
  const rpc = finish => rest("rpc/save_task_document", { method: "POST", token: user.token,
    body: { p_task: taskId, p_id: documentId, p_file: file, p_finish: finish } });
  let doc;
  if (supabaseEnabled) doc = await rpc(false);
  else {
    local.management_task_documents ||= [];
    doc = local.management_task_documents.find(item => item.id === documentId);
    if (doc && (doc.task_id !== taskId || doc.uploaded_by !== user.id || Object.keys(file).some(key => doc[key] !== file[key]))) throw failure(409, "This upload request was already used.");
    if (!doc) {
      if (local.management_task_documents.filter(item => item.task_id === taskId).length >= 5) throw failure(400, "A maximum of five RFQ documents is allowed.");
      doc = { ...file, id: documentId, task_id: taskId, lead_id: lead.id,
        storage_key: `activity-attachments/${lead.id}/rfq-task-${taskId}/${documentId}${validated.extension}`,
        uploaded_by: user.id, uploaded_by_name: user.name || "Admin", created_at: new Date().toISOString(), ready_at: null };
      local.management_task_documents.push(doc); writeDb(local);
    }
  }
  if (!doc.ready_at) {
    if (supabaseEnabled) {
      try { await uploadStorageObjectToBucket(bucket, doc.storage_key, bytes, contentType, user.token); }
      catch (error) {
        // A lost response can leave accepted bytes behind. Verify them, never overwrite.
        if (![400, 409].includes(error.status)) throw error;
        const signed = await createStorageSignedUrlForBucket(bucket, doc.storage_key, 60, user.token);
        const existing = await fetch(signed, { redirect: "error" });
        if (!existing.ok || hash(Buffer.from(await existing.arrayBuffer())) !== file.sha256) throw failure(409, "Stored upload differs from this file.");
      }
      doc = await rpc(true);
    } else {
      const target = path.join(dataDir, doc.storage_key);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      if (fs.existsSync(target)) {
        if (hash(fs.readFileSync(target)) !== file.sha256) throw failure(409, "Stored upload differs from this file.");
      } else fs.writeFileSync(target, bytes, { flag: "wx" });
      const fresh = readDb();
      doc = fresh.management_task_documents.find(item => item.id === documentId);
      doc.ready_at = new Date().toISOString();
      fresh.notifications ||= [];
      fresh.notifications.push({ id: `rfq-${documentId}`, recipient_uid: task.assignee_id, lead_id: lead.id,
        type: "management_task_note", title: "RFQ supporting document", message: "Management added an RFQ supporting document.",
        payload: { task_id: taskId, document_id: documentId }, status: "pending", created_at: doc.ready_at });
      writeDb(fresh);
    }
  }
  sendJson(res, 201, { document: publicDocument(doc, user) }); return true;
}
module.exports = { handleTaskDocuments };
