const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  ACTIVITY_DELETION_REASONS,
  MAX_ACTIVITY_ATTACHMENT_BYTES,
  normalizeWorkflowActivity,
  updateWorkflowActivity,
  validateActivityAttachment
} = require("../src/services/activityWorkflowService");

const root = path.join(__dirname, "..");
const serverSource = fs.readFileSync(path.join(root, "server.js"), "utf8");
const clientSource = fs.readFileSync(path.join(root, "client.js"), "utf8");
const htmlSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
const { validateLeadFollowup, resolveLocalLeadFollowup, isResolvedReminder } = require("../src/services/leadFollowupService");

{
  const now = "2026-11-12T09:00:00.000Z";
  const lead = { assigned_to: "rep-a", assigned_salesman: "Rep A", next_action: "To Call", next_action_date: "2026-11-10",
    last_activity: "2026-11-01", activities: [{ id: "old", type: "Reminder", activity_required: "To Call", due_date: "2026-11-10" }] };
  const admin = { id: "admin", role: "admin", name: "Admin actor" };
  const request = { request_id: "efc9db5e-6c62-49cd-bbd9-a8838c830e35", status: "cancelled", reason: "Duplicate activity",
    remarks: "Duplicate follow-up already assigned elsewhere.", expected_action: lead.next_action, expected_due: lead.next_action_date };
  const values = validateLeadFollowup(request, now);
  assert.throws(() => validateLeadFollowup({ ...request, remarks: "   too short  " }, now), /required/);
  assert.throws(() => validateLeadFollowup({ ...request, next_step: { type: "To Call", date: "2026-11-11" } }, now), /today or later/);
  assert.throws(() => resolveLocalLeadFollowup(lead, { id: "rep-b", name: "Rep A", role: "salesman" }, values, now), /assigned salesman/);
  const result = resolveLocalLeadFollowup(lead, admin, values, now);
  assert.equal(result.activity.cancelled_by, admin.id);
  assert.equal(result.activity.audit_history[0].actor_id, admin.id);
  assert.equal(result.activity.transaction_status, "cancelled");
  assert.equal(result.lead.last_activity, lead.last_activity);
  assert.equal(result.lead.next_action_date, null);
  assert.equal(result.lead.activities[1], lead.activities[0]);
  assert(isResolvedReminder(lead.activities[0], result.lead.activities));
  assert(resolveLocalLeadFollowup(result.lead, admin, values, now).duplicate);
  assert.throws(() => resolveLocalLeadFollowup(result.lead, admin, { ...values, request_id: "other" }, now), /next step changed/);
  const completed = resolveLocalLeadFollowup(lead, { id: "rep-a", role: "salesman", name: "Rep A" }, validateLeadFollowup({
    ...request, status: "completed", reason: "Quote requested", done_at: "2026-11-12T12:00+04:00",
    next_step: { type: "Send quotation", date: "2026-11-12", note: "Send synthetic price" }
  }, now), now);
  assert.equal(completed.activity.done_by, "rep-a");
  assert.equal(completed.activity.transaction_status, "closed");
  assert.equal(completed.lead.last_activity, "2026-11-12");
  assert.equal(completed.lead.next_action, "To Send Email");
  assert.equal(completed.lead.activities[1].text, "Send synthetic price");
  assert(!isResolvedReminder(completed.lead.activities[1], completed.lead.activities));
}

function attachment(filename, type, buffer) {
  return validateActivityAttachment({ filename, contentType: type, buffer });
}

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const pdf = Buffer.from("%PDF-1.7\nsample", "ascii");
const ole = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00]);
const docx = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from("word/document.xml")]);
const xlsx = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from("xl/workbook.xml")]);

assert.equal(attachment("photo.png", "image/png", png).extension, ".png");
assert.equal(attachment("brief.pdf", "application/pdf", pdf).extension, ".pdf");
assert.equal(attachment("legacy.doc", "application/msword", ole).extension, ".doc");
assert.equal(attachment("legacy.xls", "application/vnd.ms-excel", ole).extension, ".xls");
assert.equal(attachment("brief.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", docx).extension, ".docx");
assert.equal(attachment("report.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", xlsx).extension, ".xlsx");
assert.throws(
  () => attachment("malware.exe", "application/octet-stream", Buffer.from("MZ")),
  /PNG, PDF, DOC, DOCX, XLS, or XLSX/
);
assert.throws(
  () => attachment("renamed.pdf", "application/pdf", Buffer.from("MZ executable")),
  /signature does not match/
);
assert.throws(
  () => attachment("large.pdf", "application/pdf", Buffer.concat([Buffer.from("%PDF-"), Buffer.alloc(MAX_ACTIVITY_ATTACHMENT_BYTES)])),
  /8 MB or smaller/
);
assert.equal(ACTIVITY_DELETION_REASONS.includes("Incorrect related lead or account"), true);
assert.equal(ACTIVITY_DELETION_REASONS.includes("Test or invalid record"), true);

const user = { id: "user-1", name: "Roy Gabriel", role: "salesman" };
const base = normalizeWorkflowActivity({
  id: "act-1",
  next_action_plan: "To Call",
  next_action_date: "2026-07-24",
  activity_purpose: "Company Introductory",
  notes: "Initial note"
}, user);
assert.equal(base.version, 1);
assert.equal(base.audit_history[0].action, "activity_created");

const updated = updateWorkflowActivity(base, {
  next_action_plan: "To Send Email",
  next_action_date: "2026-07-25",
  activity_purpose: "Quotation Follow Up",
  notes: "Updated note"
}, user, 1);
assert.equal(updated.version, 2);
assert.equal(updated.audit_history[0].action, "activity_edited");
assert.deepEqual(updated.audit_history[0].changed_fields.sort(), [
  "activity_purpose",
  "next_action_date",
  "next_action_plan",
  "notes"
].sort());
assert.throws(
  () => updateWorkflowActivity(updated, {
    next_action_plan: "To Visit",
    next_action_date: "2026-07-26",
    activity_purpose: "Meeting",
    notes: "Conflicting update"
  }, user, 1),
  /updated by another user/
);

[
  "activityAttachmentInput",
  "activityDropZone",
  "activityDetailsDialog",
  "activityDeletionDialog",
  "activityDeletionQueueDialog",
  "cancelActivityDeletionFromDetails"
].forEach(id => assert(htmlSource.includes(`id="${id}"`), `${id} must exist`));

[
  "activityFileSignatureLooksValid",
  "loadActivityDeletionQueue",
  "cancelActivityDeletionRequest",
  "data-activity-request-action",
  "fetchActivities()"
].forEach(token => assert(clientSource.includes(token), `${token} must be wired`));

[
  "/api/activity-deletion-requests",
  "/attachments",
  "deleteRequestCancelMatch",
  "You cannot approve or reject your own request",
  "pending deletion request and cannot be edited",
  "createStorageSignedUrlForBucket",
  "activity_archived"
].forEach(token => assert(serverSource.includes(token), `${token} must be implemented server-side`));

assert(serverSource.includes('url.pathname.match(/^\\/api\\/leads\\/([^/]+)\\/delete-requests\\/([^/]+)\\/cancel$/)'));
assert.match(
  serverSource,
  /const activityMatch = url\.pathname\.match\([\s\S]*?patchSupabaseLeadWithOptionalFallback\(user\.token, activityMatch\[1\], updates\)/,
  "Manual Add New Activity must tolerate production leads schemas missing optional mirror columns"
);
assert(htmlSource.includes("Upload PNG, PDF, Word, or Excel files") || htmlSource.includes("PNG, PDF, Word, or Excel files"));

console.log("Activity workflow tests passed.");
