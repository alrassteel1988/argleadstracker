const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  buildAssistantPreview,
  inferIntent,
  normalizeAssistantCommand,
  resolveAuthorizedRecords,
  resolveDateExpression
} = require("../src/services/aiSalesAssistantService");

const root = path.join(__dirname, "..");
const serverSource = fs.readFileSync(path.join(root, "server.js"), "utf8");
const clientSource = fs.readFileSync(path.join(root, "client.js"), "utf8");
const htmlSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
const vercelSource = fs.readFileSync(path.join(root, "vercel.json"), "utf8");
const migrationSource = fs.readFileSync(
  path.join(root, "supabase", "migrations", "20260724120000_ai_sales_assistant.sql"),
  "utf8"
);

assert.equal(inferIntent("Schedule a call with Tecon tomorrow at 10 AM"), "schedule_call");
assert.equal(inferIntent("Prepare a quotation follow-up email for Seagull"), "create_email_draft");
assert.equal(inferIntent("Show my overdue calls"), "view_overdue_activities");
assert.equal(inferIntent("Delete every old account"), "unsupported");

const normalized = normalizeAssistantCommand({}, "Call Tecon after 2 hours today for a new requirement");
assert.equal(normalized.intent, "schedule_call");
assert.equal(normalized.purpose, "New Requirements");
assert.equal(normalized.requiresConfirmation, true);

const relative = resolveDateExpression("after 2 hours today", {
  now: "2026-07-24T08:00:00+04:00",
  timezone: "Asia/Dubai"
});
assert.equal(relative.status, "resolved");
assert.match(relative.resolved_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\+04:00$/);

const missingTime = resolveDateExpression("tomorrow", {
  now: "2026-07-24T08:00:00+04:00",
  timezone: "Asia/Dubai"
});
assert.equal(missingTime.status, "missing_time");
assert.equal(missingTime.resolved_at, "");

const nextMonday = resolveDateExpression("next Monday at 10 AM", {
  now: "2026-07-24T08:00:00+04:00",
  timezone: "Asia/Dubai"
});
assert.equal(nextMonday.status, "resolved");
assert.equal(nextMonday.date, "2026-07-27");
assert.equal(nextMonday.time, "10:00");

const authorizedRecords = [
  { id: "lead-1", company_name: "Tecon Specialized Engineering Solutions", email: "sales@tecon.example" },
  { id: "lead-2", company_name: "Container Solutions Co. LLC", email: "info@container.example" }
];
assert.equal(resolveAuthorizedRecords("Tecon", authorizedRecords)[0].record.id, "lead-1");
assert.equal(resolveAuthorizedRecords("", authorizedRecords, "lead-2")[0].record.id, "lead-2");
assert.equal(resolveAuthorizedRecords("Private Account", authorizedRecords).length, 0);

const emailPreview = buildAssistantPreview({
  command: normalizeAssistantCommand({
    intent: "create_email_draft",
    relatedRecordQuery: "Tecon",
    purpose: "Quotation Follow Up"
  }, "Prepare a quotation follow-up email for Tecon"),
  lead: {
    id: "lead-1",
    company_name: "Tecon Specialized Engineering Solutions",
    contact_person: "Procurement Team",
    email: "sales@tecon.example",
    quotation_ref: "QTN-2042"
  },
  resolvedDate: { date: "2026-07-24", time: "", resolved_at: "", timezone: "Asia/Dubai" },
  user: { timezone: "Asia/Dubai" }
});
assert.equal(emailPreview.operation, "write");
assert.equal(emailPreview.email_draft.recipient, "sales@tecon.example");
assert.match(emailPreview.email_draft.subject, /QTN-2042/);

[
  "/api/ai-assistant/interpret",
  "/api/ai-assistant/confirm",
  "/api/ai-assistant/cancel",
  "/api/ai-assistant/history",
  "/api/ai-assistant/email-drafts",
  "AI_ASSISTANT_WRITE_INTENTS",
  "assistantRateAllowed",
  "assistantCompatibilityLogRow",
  "saveAssistantCompatibilityEntry",
  "loadAssistantCompatibilityEntries",
  "ai_action_log"
].forEach(token => assert(serverSource.includes(token), `${token} must be implemented`));

[
  "initAiSalesAssistant",
  "interpretAiAssistantCommand",
  "confirmAiAssistantAction",
  "toggleAiAssistantRecording",
  "This assistant never sends email automatically."
].forEach(token => assert(clientSource.includes(token), `${token} must be wired`));

[
  "aiAssistantLauncher",
  "aiAssistantDialog",
  "aiAssistantCommand",
  "aiAssistantConfirm",
  "refreshAiDrafts"
].forEach(id => assert(htmlSource.includes(`id="${id}"`), `${id} must exist`));

assert(vercelSource.includes("ai-sales-assistant.css"));
assert(migrationSource.includes("enable row level security"));
assert(migrationSource.includes("assistant_audit_logs"));
assert(migrationSource.includes("email_drafts"));

console.log("AI Sales Assistant tests passed.");
