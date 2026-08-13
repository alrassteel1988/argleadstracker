const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const clientSource = fs.readFileSync(path.join(root, "client.js"), "utf8");
const cssSource = fs.readFileSync(path.join(root, "lead-detail-readability.css"), "utf8");

assert.ok(clientSource.includes("function renderDrawerIntel"));
assert.ok(clientSource.includes("No intelligence report yet."));
assert.ok(clientSource.includes("Lead Intelligence Summary"));
assert.ok(clientSource.includes("No intelligence report uploaded yet."));
assert.ok(clientSource.includes("Upload Intelligence Report (PDF)"));
assert.ok(clientSource.includes("data-lead-intelligence-upload-shell=\"summary\""));
assert.ok(clientSource.includes("leadIntelligencePdfInput"));
assert.ok(clientSource.includes("Running AI review of selected PDF..."));
assert.ok(clientSource.includes("Could not upload intelligence report."));
assert.ok(clientSource.includes("Uploading intelligence PDF..."));
assert.ok(clientSource.includes("Intelligence report uploaded and parsed."));
assert.ok(clientSource.includes("Intelligence report is ${escapeHtml(statusLabel)}."));
assert.ok(clientSource.includes("Latest intelligence job failed."));
assert.ok(clientSource.includes("Download PDF"));
assert.ok(clientSource.includes("Open in new tab"));
assert.ok(clientSource.includes("fetchAuthenticatedBlob"));
assert.ok(clientSource.includes("data-lead-intelligence-pdf-preview"));
assert.ok(clientSource.includes("Loading PDF preview..."));
assert.ok(clientSource.includes("<iframe"));
assert.ok(clientSource.includes("/intelligence/upload"));
assert.ok(clientSource.includes("/api/leads/${encodeURIComponent(leadId)}/intelligence/upload"));
assert.ok(cssSource.includes(".lead-intel-pdf"));
assert.ok(cssSource.includes("@media (max-width: 720px)"));

console.log("PASS lead intelligence Intel tab UI contract");
