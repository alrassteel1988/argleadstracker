const { randomUUID, createHash } = require("node:crypto");

const CLOSED = "CLOSED_NOT_INTERESTED";
const closedReasons = ["No requirement", "Uses another supplier", "Business closed", "Other"];
const failure = (status, message, details) => Object.assign(new Error(message), { status, details });
const isClosed = value => [CLOSED, "CLOSED - NOT INTERESTED", "CLOSED \u2013 NOT INTERESTED"].includes(String(value || "").trim().toUpperCase());
const archived = lead => Boolean(lead?.is_archived) || isClosed(lead?.stage || lead?.lead_status);
function companyKey(value) {
  return String(value || "").toLowerCase().replace(/l[.\s]*l[.\s]*c\b/g, " llc ")
    .replace(/fz[\s-]*llc\b/g, " fzllc ").replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\b(llc|fzco|fze|fzllc|trading|co|est)\b/g, " ").replace(/\s+/g, " ").trim();
}
function phoneKey(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("00971")) digits = digits.slice(2);
  if (digits.startsWith("971")) digits = digits.slice(3);
  else if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.length >= 7 ? digits : "";
}
function identity(input) {
  return { name: companyKey(input.company_name), phone: phoneKey(input.phone), email: String(input.email || input.contact_email || "").trim().toLowerCase() };
}
function matches(leads, input, exclude = "") {
  const key = identity(input);
  return leads.filter(lead => String(lead.id) !== String(exclude)).filter(lead => {
    const other = identity(lead);
    return key.name && key.name === other.name || key.phone && key.phone === other.phone || key.email && key.email === other.email;
  });
}
function signature(leads, input, exclude = "") {
  return createHash("sha256").update(JSON.stringify([identity(input), String(exclude), matches(leads, input, exclude)
    .map(lead => [lead.id, lead.updated_at || "", archived(lead), lead.assigned_to || "", lead.company_name]).sort()])).digest("hex");
}
function ownedBy(lead,user) {
  const id=String(lead.assigned_to || "").trim();
  if(id) return id===String(user.id);
  const name=String(lead.assigned_salesman || "").trim().toLowerCase();
  return Boolean(name && [user.name,user.email,String(user.email || "").split("@")[0]].some(value=>String(value || "").trim().toLowerCase()===name));
}
function publicMatch(lead, user) {
  const item = { company_name: lead.company_name, owner_name: lead.assigned_salesman || "Unassigned", is_archived: archived(lead),
    self_owned: !archived(lead) && user.role === "salesman" && ownedBy(lead,user) };
  const closed = isClosed(lead.stage || lead.lead_status);
  if (item.is_archived) Object.assign(item, { closed, closed_at: closed ? lead.closed_at : lead.archived_at,
    closed_by_name: (closed ? lead.closed_by_name : lead.archived_by_name) || "CRM user", reason: closed ? lead.closed_reason : lead.archive_reason,
    closed_note: closed && lead.closed_reason === "Other" ? lead.closed_note : "" });
  if (item.is_archived) item.soft_deleted = String(lead.archive_reason || "").startsWith("Approved deletion request - ");
  if (user.role === "admin") item.id = lead.id;
  return item;
}
function event(db, user, action, lead, reason, extra = {}) {
  const row = { id: randomUUID(), action, lead_id: lead?.id || null, company_name: lead?.company_name || "", user_id: user.id,
    user_name: user.name || user.email || "CRM user", at: new Date().toISOString(), reason, ...extra };
  (db.lead_lifecycle_events ||= []).unshift(row);
  return row;
}
function notify(db, users, type, title, message, payload = {}) {
  for (const recipient of users.filter(person => person.status === "active" && ["admin", "salesman"].includes(person.role))) {
    (db.notifications ||= []).unshift({ id: randomUUID(), recipient_uid: recipient.id, lead_id: null, type, title, message, payload,
      status: "pending", created_at: new Date().toISOString() });
  }
}
function validateClose(input) {
  if (!closedReasons.includes(input.closed_reason)) throw failure(400, "Choose a reason for Closed - Not Interested.");
  const note = String(input.closed_note || "").trim();
  if (note.length > 2000 || input.closed_reason === "Other" && !note) throw failure(400, "Enter a note for Other (up to 2000 characters).");
  return { closed_reason: input.closed_reason, closed_note: note };
}
function localLifecycle(db, user, lead, action, input) {
  if (action !== "close" && user.role !== "admin") throw failure(403, "Admin access required.");
  if (action === "close" && (!["admin","salesman"].includes(user.role) || lead.is_archived
    || user.role !== "admin" && !ownedBy(lead,user))) throw failure(404, "Lead not found.");
  const reason = action === "close" ? validateClose(input).closed_reason : String(input.reason || "").trim();
  if (!reason || reason.length > 2000) throw failure(400, "Enter a reason (up to 2000 characters).");
  const at = new Date().toISOString(), name = user.name || user.email || "CRM user";
  if (action === "close") {
    Object.assign(lead, validateClose(input), { stage: CLOSED, lead_status: CLOSED, closed_at: at, closed_by: user.id, closed_by_name: name });
    notify(db, db.users, "lead_closed", "Do not contact", `${lead.company_name} has been marked Closed \u2013 Not Interested by ${name}. Please do not contact.`);
  }
  if (action === "archive" || action === "close") {
    if (action === "archive" && archived(lead)) throw failure(409, "This lead is already archived.");
    Object.assign(lead, { is_archived: true, archived_at: at, archived_by: user.id, archived_by_name: name, archive_reason: reason });
  } else if (action === "restore") {
    if (!archived(lead)) throw failure(409, "This lead is not archived.");
    Object.assign(lead, { is_archived: false, stage: "NEW", lead_status: "PROSPECT", restored_at: at, restored_by: user.id });
  } else if (action === "purge") {
    if (!archived(lead)) throw failure(409, "Archive the lead before permanently deleting it.");
    if (input.company_name !== lead.company_name) throw failure(400, "Type the exact company name to confirm deletion.");
    db.leads = db.leads.filter(item => item.id !== lead.id);
  }
  lead.updated_at = at;
  event(db, user, action, lead, reason, action === "close" ? { note: lead.closed_note } : {});
  if (action === "close") event(db, user, "archive", lead, reason);
  return action === "purge" ? { ok: true } : lead;
}
function assertLocalDuplicates(db, user, input, exclude = "") {
  const found = matches(db.leads, input, exclude);
  if (!found.length) return;
  const fingerprint = signature(db.leads, input, exclude);
  const permit = (db.lead_duplicate_reviews || []).find(row => row.requested_by === user.id && row.status === "approved"
    && row.signature === fingerprint && !row.used_at && Date.parse(row.expires_at) > Date.now());
  if (permit) { permit.used_at = new Date().toISOString(); return true; }
  throw failure(409, "A matching lead requires Admin review before saving.", { duplicate_review_required: true, matches: found.map(lead => publicMatch(lead, user)) });
}
function requestArchiveReview(db, user, kind, input) {
  if (user.role !== "salesman") throw failure(403, "Salesman access required to request management review.");
  const reason = String(input.reason || "").trim(), note = String(input.note || "").trim();
  if (!reason || reason.length > 2000 || !note || note.length > 2000) throw failure(400,"Enter a request reason and supporting note (up to 2000 characters).");
  let found;
  if (kind === "archive") {
    if (!["Disqualified","Not interested","Other"].includes(reason)) throw failure(400,"Choose a request reason.");
    found = db.leads.filter(lead => lead.id === input.lead_id && !archived(lead) && ownedBy(lead,user));
  } else if (kind === "restore") found = matches(db.leads,input).filter(archived);
  else throw failure(400,"Choose an archive or restore request.");
  if (!found.length) throw failure(404,"No eligible lead was found for this request.");
  const key = kind === "archive" ? found[0].id : JSON.stringify(identity(input));
  if ((db.lead_archive_requests || []).some(row=>row.requested_by===user.id && row.kind===kind && row.request_key===key && row.status==="pending")) throw failure(409,"A management review is already pending for this request.");
  const row = { id:randomUUID(),kind,lead_id:kind==="archive"?found[0].id:null,candidate_ids:found.map(lead=>lead.id),
    company_name:kind==="archive"?found[0].company_name:String(input.company_name || found[0].company_name),requested_by:user.id,
    requested_by_name:user.name || user.email || "Salesman",reason,note,request_key:key,status:"pending",created_at:new Date().toISOString() };
  (db.lead_archive_requests ||= []).unshift(row);
  for (const lead of found) event(db,user,`request_${kind}`,lead,reason,{request_id:row.id,note});
  notify(db,db.users.filter(person=>person.role==="admin"),"lead_lifecycle_request",kind==="archive"?"Lead deletion request":"Lead restore request",
    `${row.requested_by_name} requested ${kind==="archive"?"deletion":"restoration"} of ${row.company_name}. ${reason}: ${note}`);
  return {id:row.id,status:row.status};
}
function reviewArchiveRequest(db, user, id, input) {
  if (user.role !== "admin") throw failure(403,"Admin access required.");
  const row = (db.lead_archive_requests || []).find(item=>item.id===id);
  const reason = String(input.reason || "").trim();
  if (!row || row.status!=="pending") throw failure(409,"This request is no longer pending.");
  if (!reason || reason.length>2000 || typeof input.approve!=="boolean") throw failure(400,"Choose a decision and enter its reason.");
  if (row.requested_by===user.id) throw failure(403,"You cannot approve or reject your own request.");
  const leadId = row.kind==="archive"?row.lead_id:input.lead_id;
  const lead = db.leads.find(item=>item.id===leadId && row.candidate_ids.includes(item.id));
  if (input.approve && !lead) throw failure(409,"The requested lead is no longer available.");
  if (input.approve && row.kind==="archive" && !archived(lead)) localLifecycle(db,user,lead,"archive",{reason:`Approved deletion request - ${row.reason}: ${row.note}`.slice(0,2000)});
  if (input.approve && row.kind==="restore") localLifecycle(db,user,lead,"restore",{reason});
  Object.assign(row,{status:input.approve?"approved":"rejected",decided_by:user.id,decided_by_name:user.name || user.email,
    decided_at:new Date().toISOString(),decision_reason:reason,restored_lead_id:input.approve && row.kind==="restore"?lead.id:null});
  event(db,user,`${row.kind}_request_${row.status}`,lead || {id:row.lead_id || row.candidate_ids[0],company_name:row.company_name},reason,{request_id:row.id});
  notify(db,db.users.filter(person=>person.id===row.requested_by),"lead_lifecycle_request","Management decision",
    `${row.company_name}: your ${row.kind==="archive"?"deletion":"restore"} request was ${row.status}. ${reason}`);
  return {id:row.id,status:row.status};
}
module.exports = { CLOSED, closedReasons, isClosed, archived, companyKey, phoneKey, identity, matches, signature, publicMatch,
  event, notify, validateClose, localLifecycle, assertLocalDuplicates, requestArchiveReview, reviewArchiveRequest, failure };
