const { AsyncLocalStorage } = require("node:async_hooks");
const crypto = require("node:crypto");

const context = new AsyncLocalStorage();
const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
// Unknown path segments are never retained: they can contain names or secrets.
const SEGMENTS = new Set(("api admin auth login logout refresh me leads companies contacts activities management-tasks "
  + "assign edit remind progress seen remove resolve_duplicate reassign handoff handoff-notices lead-handoff-notices "
  + "pmrs pmr-voice-notes attachments download pdf email-profile export exports xls csv pipeline summary dashboard "
  + "weekly-reports weekly-sales-reports submit review history versions users salesmen configuration-agent audit "
  + "audit-events intelligence lead-intelligence process ai-actions ai-assistant interpret execute transcriptions "
  + "notifications settings configuration duplicates search cancel complete outcome status stage notes "
  + "deletion-requests approve reject restore withdraw tasks overdue-activities.csv").split(/\s+/));
const LOCAL_COLLECTIONS = ["users", "leads", "pmrs", "management_tasks", "weekly_reports", "weekly_report_versions",
  "weekly_report_reviews", "email_drafts", "notifications", "lead_intelligence_reports", "attention_flags"];

function auditRoute(url) {
  const parts = url.pathname.split("/").filter(Boolean);
  const record = parts.find(part => UUID.test(part));
  return {
    route: "/" + parts.slice(0, 12).map(part => SEGMENTS.has(part) ? part : UUID.test(part) ? ":id" : ":redacted").join("/"),
    record_id: record || null
  };
}

function auditAction(method, url, headers = {}) {
  if (url.pathname === "/api/auth/login") return "sign_in";
  if (url.pathname === "/api/auth/logout") return "sign_out";
  if (url.pathname === "/api/auth/refresh") return "session_refresh";
  if (/export|\.csv$|\/xls$/.test(url.pathname)) return "export";
  if (/download|attachments|pmr-voice-notes|\/pdf$|email-profile/.test(url.pathname)
    || headers["Content-Disposition"]) return "download";
  return ["GET", "HEAD"].includes(method) ? "read" : "write";
}

function runAudit(req, url, persist, callback) {
  return context.run({ request_id: crypto.randomUUID(), method: req.method,
    url, ...auditRoute(url), persist, actor: null, started: false, completed: false }, callback);
}

function auditFailure() {
  const error = new Error("Audit recording is unavailable. No response data was released. A write may already have committed; reload before retrying.");
  error.status = 503;
  error.code = "audit_unavailable";
  return error;
}

async function persistEvent(entry) {
  const state = context.getStore();
  try {
    await state.persist({ id: crypto.randomUUID(), request_id: state.request_id,
      actor_id: state.actor?.id || null, actor_name: state.actor?.name || null,
      actor_role: state.actor?.role || null, method: state.method, route: state.route,
      record_id: state.record_id, action: auditAction(state.method, state.url), ...entry });
  } catch {
    // Never forward database errors, request payloads, credentials or signed URLs.
    throw auditFailure();
  }
}

async function startAdminAudit(user, accountHash = null) {
  const state = context.getStore();
  if (!state || state.completed) return;
  if (user) state.actor = { id: user.id, name: user.name, role: user.role };
  if (accountHash) state.account_hash = accountHash;
  if (state.started || (state.actor?.role !== "admin" && !accountHash)) return;
  await persistEvent({ phase: "attempt", outcome: "attempted", status: null, account_hash: state.account_hash || null });
  state.started = true;
}

async function completeAdminAudit(status, headers = {}) {
  const state = context.getStore();
  if (!state || state.completed) return;
  if (!state.started && state.actor?.role !== "admin" && ![401, 403].includes(status)) return;
  await persistEvent({ phase: "result", status, action: auditAction(state.method, state.url, headers),
    outcome: [401, 403].includes(status) ? "denied" : status >= 400 ? "failed" : "succeeded",
    account_hash: state.account_hash || null });
  state.completed = true;
}

function auditHeaders() {
  const state = context.getStore();
  if (!state?.started || state.actor?.role !== "admin") return {};
  return { "x-crm-audit-request-id": state.request_id, "x-crm-audit-actor-id": state.actor.id };
}

function localAuditChanges(before, after) {
  const state = context.getStore();
  if (!state?.started || state.actor?.role !== "admin") return [];
  const events = [];
  for (const table of [...LOCAL_COLLECTIONS, "configuration"]) {
    const oldRows = table === "configuration" ? [{ id: "configuration", value: before[table] }] : before[table] || [];
    const newRows = table === "configuration" ? [{ id: "configuration", value: after[table] }] : after[table] || [];
    const oldById = new Map(oldRows.map(row => [row.id, row]));
    const newById = new Map(newRows.map(row => [row.id, row]));
    for (const id of new Set([...oldById.keys(), ...newById.keys()])) {
      const oldRow = oldById.get(id), newRow = newById.get(id);
      const fields = [...new Set([...Object.keys(oldRow || {}), ...Object.keys(newRow || {})])]
        .filter(key => !/password|token|secret|credential/i.test(key)
          && JSON.stringify(oldRow?.[key]) !== JSON.stringify(newRow?.[key])).sort();
      if (!fields.length) continue;
      events.push({ id: crypto.randomUUID(), request_id: state.request_id, at: new Date().toISOString(),
        phase: "change", outcome: "succeeded", actor_id: state.actor.id, actor_name: state.actor.name,
        actor_role: "admin", table_name: table, record_id: String(id), changed_fields: fields,
        action: !oldRow ? "insert" : !newRow ? "delete" : "update" });
    }
  }
  return events;
}

module.exports = { runAudit, startAdminAudit, completeAdminAudit, auditHeaders, localAuditChanges, auditRoute, auditAction };
