const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const clientSource = fs.readFileSync(path.join(root, "client.js"), "utf8");
const cssSource = fs.readFileSync(path.join(root, "lead-detail-readability.css"), "utf8");

assert.ok(clientSource.includes("function renderDrawerIntel"));
assert.ok(clientSource.includes("Upload intelligence PDF"));
assert.ok(clientSource.includes("/intelligence/upload"));
assert.ok(clientSource.includes("Intelligence PDF saved to the Intel card and AI summary context."));
assert.ok(clientSource.includes("report.report.executive_snapshot"));
assert.ok(clientSource.includes("No intelligence report yet."));
assert.ok(clientSource.includes("Generate Intelligence"));
assert.ok(clientSource.includes("Intelligence report is ${escapeHtml(statusLabel)}."));
assert.ok(clientSource.includes("Latest intelligence job failed."));
assert.ok(clientSource.includes("Refresh Intelligence"));
assert.ok(clientSource.includes("Download PDF"));
assert.ok(clientSource.includes("Open in new tab"));
assert.ok(clientSource.includes('type="application/pdf"'));
assert.ok(clientSource.includes("data-lead-intelligence-action"));
assert.ok(clientSource.includes("/intelligence/${encodeURIComponent(action)}"));
assert.ok(clientSource.includes("/api/leads/${encodeURIComponent(leadId)}/intel"));
assert.ok(cssSource.includes(".lead-intel-pdf"));
assert.ok(cssSource.includes("@media (max-width: 720px)"));

console.log("PASS lead intelligence Intel tab UI contract");
