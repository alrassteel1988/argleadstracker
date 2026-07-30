const crypto = require("crypto");
const path = require("path");

const MAX_ACTIVITY_ATTACHMENT_BYTES = 8 * 1024 * 1024;
const ACTIVITY_ATTACHMENT_TYPES = Object.freeze({
  ".png": ["image/png"],
  ".pdf": ["application/pdf"],
  ".doc": ["application/msword", "application/octet-stream"],
  ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/zip", "application/octet-stream"],
  ".xls": ["application/vnd.ms-excel", "application/octet-stream"],
  ".xlsx": ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/zip", "application/octet-stream"]
});
const ACTIVITY_DELETION_REASONS = Object.freeze([
  "Activity entered by mistake",
  "Duplicate activity",
  "Incorrect related lead or account",
  "Incorrect activity details",
  "Test or invalid record",
  "Other"
]);

function workflowId(prefix) {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(5).toString("hex")}`;
}

function safeOriginalFilename(value) {
  return path.basename(String(value || "attachment"))
    .replace(/[^\w.\- ()]/g, "_")
    .slice(0, 180);
}

function hasPrefix(buffer, bytes) {
  return bytes.every((byte, index) => buffer[index] === byte);
}

function validateActivityAttachment({ filename, contentType, buffer }) {
  const safeName = safeOriginalFilename(filename);
  const extension = path.extname(safeName).toLowerCase();
  const normalizedType = String(contentType || "application/octet-stream").split(";")[0].trim().toLowerCase();
  if (!ACTIVITY_ATTACHMENT_TYPES[extension]) {
    const error = new Error("Attach a PNG, PDF, DOC, DOCX, XLS, or XLSX file.");
    error.status = 415;
    throw error;
  }
  if (!Buffer.isBuffer(buffer) || !buffer.length) {
    const error = new Error("The selected attachment is empty.");
    error.status = 400;
    throw error;
  }
  if (buffer.length > MAX_ACTIVITY_ATTACHMENT_BYTES) {
    const error = new Error("Attachments must be 8 MB or smaller.");
    error.status = 413;
    throw error;
  }
  if (!ACTIVITY_ATTACHMENT_TYPES[extension].includes(normalizedType)) {
    const error = new Error("The attachment content type does not match an allowed document type.");
    error.status = 415;
    throw error;
  }

  const isPng = hasPrefix(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const isPdf = buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  const isOle = hasPrefix(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  const isZip = hasPrefix(buffer, [0x50, 0x4b, 0x03, 0x04])
    || hasPrefix(buffer, [0x50, 0x4b, 0x05, 0x06])
    || hasPrefix(buffer, [0x50, 0x4b, 0x07, 0x08]);
  const zipText = isZip ? buffer.toString("latin1") : "";
  const signatureValid = extension === ".png"
    ? isPng
    : extension === ".pdf"
      ? isPdf
      : [".doc", ".xls"].includes(extension)
        ? isOle
        : extension === ".docx"
          ? isZip && zipText.includes("word/")
          : isZip && zipText.includes("xl/");
  if (!signatureValid) {
    const error = new Error("The attachment signature does not match its file extension.");
    error.status = 415;
    throw error;
  }
  return { filename: safeName, extension, contentType: normalizedType, size: buffer.length };
}

function activityAuditEvent(action, user, details = {}) {
  return {
    id: workflowId("audit"),
    action,
    actor_id: user?.id || "",
    actor_name: user?.name || user?.email || "User",
    at: new Date().toISOString(),
    ...details
  };
}

function normalizeWorkflowActivity(activity, user = null) {
  const now = new Date().toISOString();
  const createdAt = activity.created_at || now;
  const history = Array.isArray(activity.audit_history) ? activity.audit_history : [];
  return {
    ...activity,
    id: activity.id || workflowId("act"),
    created_at: createdAt,
    updated_at: activity.updated_at || createdAt,
    version: Number(activity.version || 1),
    attachments: Array.isArray(activity.attachments) ? activity.attachments : [],
    audit_history: history.length
      ? history
      : [activityAuditEvent("activity_created", user || {
        id: activity.created_by || "",
        name: activity.created_by_name || "User"
      })],
    archived: Boolean(activity.archived),
    deletion_status: activity.deletion_status || ""
  };
}

function activityEditableFields(activity = {}) {
  return {
    next_action_plan: String(activity.next_action_plan || ""),
    next_action_date: String(activity.next_action_date || ""),
    activity_purpose: String(activity.activity_purpose || activity.type || ""),
    notes: String(activity.notes ?? activity.text ?? "")
  };
}

function updateWorkflowActivity(existing, nextValues, user, expectedVersion) {
  const current = normalizeWorkflowActivity(existing, user);
  if (Number(expectedVersion || 0) !== current.version) {
    const error = new Error("This activity was updated by another user. Refresh the activity and review the latest changes before saving.");
    error.status = 409;
    throw error;
  }
  const previousValues = activityEditableFields(current);
  const changedFields = Object.keys(nextValues).filter(key => String(previousValues[key] ?? "") !== String(nextValues[key] ?? ""));
  if (!changedFields.length) return current;
  const updatedAt = new Date().toISOString();
  return {
    ...current,
    ...nextValues,
    type: nextValues.activity_purpose,
    text: nextValues.notes || `${nextValues.activity_purpose}: ${nextValues.next_action_plan} on ${nextValues.next_action_date}`,
    updated_at: updatedAt,
    updated_by: user.id,
    updated_by_name: user.name || user.email || "User",
    version: current.version + 1,
    audit_history: [
      activityAuditEvent("activity_edited", user, {
        changed_fields: changedFields,
        previous_values: Object.fromEntries(changedFields.map(key => [key, previousValues[key]])),
        new_values: Object.fromEntries(changedFields.map(key => [key, nextValues[key]]))
      }),
      ...current.audit_history
    ]
  };
}

module.exports = {
  ACTIVITY_ATTACHMENT_TYPES,
  ACTIVITY_DELETION_REASONS,
  MAX_ACTIVITY_ATTACHMENT_BYTES,
  activityAuditEvent,
  activityEditableFields,
  normalizeWorkflowActivity,
  safeOriginalFilename,
  updateWorkflowActivity,
  validateActivityAttachment,
  workflowId
};
