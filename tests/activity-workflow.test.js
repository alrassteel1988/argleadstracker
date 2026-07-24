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
assert(htmlSource.includes("Upload PNG, PDF, Word, or Excel files") || htmlSource.includes("PNG, PDF, Word, or Excel files"));

console.log("Activity workflow tests passed.");
