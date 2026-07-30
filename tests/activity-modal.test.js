const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const client = fs.readFileSync(path.join(root, "client.js"), "utf8");
const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
const css = fs.readFileSync(path.join(root, "activity-modal.css"), "utf8");
const serviceWorker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const vercelConfig = fs.readFileSync(path.join(root, "vercel.json"), "utf8");

assert(html.includes('id="activityDialog"'));
assert(html.includes('aria-labelledby="activityDialogTitle"'));
assert(html.includes('id="activityForm"'));
assert(html.includes('placeholder="Type notes or record a voice note"'));
assert(html.includes('id="activityRecordVoice"'));
assert(html.includes('id="activityPauseVoice"'));
assert(html.includes('id="activityStopVoice"'));
assert(html.includes('id="activityCancelVoice"'));
[
  "To Call",
  "To Send Email",
  "To Visit",
  "Company Introductory",
  "New Requirements",
  "Quotation Submission",
  "Quotation Follow Up",
  "Meeting"
].forEach(option => assert(html.includes(`<option value="${option}">${option}</option>`), `Missing activity option: ${option}`));

assert(client.includes("function openActivityModal("));
assert(client.includes("function saveActivityModal("));
assert(client.includes("structured_activity: true"));
assert(client.includes("transcribeRecording(new Blob("));
assert(client.includes('join(existing ? "\\n" : "")'));
assert(client.includes("transcript !== activityModalLastTranscript"));
assert(client.includes("Microphone permission was denied"));
assert(client.includes("activityModalSaving || Boolean(activityModalRecorder)"));
assert(client.includes('data-drawer-log-activity="${escapeHtml(lead.id)}">Add New Activity</button>'));
assert(!client.includes("async function logDrawerActivity("));
["ready", "recording", "paused", "processing", "completed", "failed"].forEach(status => {
  assert(client.includes(`${status}:`), `Missing voice recorder state: ${status}`);
});

assert(server.includes("function normalizeStructuredActivity(input, user)"));
assert(server.includes("STRUCTURED_ACTIVITY_PURPOSE_OPTIONS"));
assert(server.includes("created_by: user.id"));
assert(server.includes("created_at: createdAt"));
assert(server.includes("duplicate: true"));
assert(server.includes("updates.next_action = activity.next_action_plan"));
assert(server.includes("lead.next_action = activity.next_action_plan"));

assert(css.includes(".activity-entry-dialog::backdrop"));
assert(css.includes("backdrop-filter: none"));
assert(css.includes("grid-template-columns: repeat(2"));
assert(css.includes("@media (max-width: 700px)"));
assert(css.includes("outline: 2px solid var(--bauhaus-blue"));
assert(serviceWorker.includes('"/activity-modal.css"'));
assert(vercelConfig.includes('{ "src": "activity-modal.css", "use": "@vercel/static" }'));
assert(vercelConfig.includes('{ "src": "/activity-modal.css", "dest": "/activity-modal.css" }'));

console.log("PASS shared Add New Activity modal");
