const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const client = fs.readFileSync(path.join(root, "client.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");

for (const type of ["openPipeline", "activeCustomers", "atRisk", "tasksDue"]) {
  assert.match(html, new RegExp(`data-summary-card=["']${type}["']`), `${type} card must opt into the details modal`);
}

assert.match(html, /id="summaryCardDetailsDialog"[^>]*aria-modal="true"[^>]*aria-labelledby="summaryCardDetailsTitle"/, "details modal must expose dialog semantics");
assert.match(client, /function dashboardSummaryDatasets\(\)/, "dashboard totals and modal records need a shared selector");
assert.match(client, /function renderMetrics\(\)\s*{\s*const datasets = dashboardSummaryDatasets\(\)/, "metric counts must consume the shared selector");
assert.match(client, /function summaryCardDetailsConfig\(type\)/, "modal configuration should be reusable across summary types");

for (const title of ["Open Pipeline", "Active Customers", "At Risk", "Tasks Due"]) {
  assert.ok(client.includes(`title: "${title}"`), `${title} modal configuration must exist`);
}

for (const requirement of [
  "Salesman",
  "Stage",
  "Priority",
  "Territory",
  "Risk reason",
  "Task type",
  "Due date",
  "Status"
]) {
  assert.ok(client.includes(`label: "${requirement}"`), `${requirement} filter or column must be available`);
}

assert.match(client, /trapSummaryCardDetailsFocus\(event\)/, "modal must trap keyboard focus");
assert.match(client, /summary-details-modal-open/, "modal must lock background scrolling");
assert.match(client, /cleanupSummaryCardDetailsModal/, "modal must restore focus and clean up after closing");
assert.match(client, /openLeadDrawer\(leadId\)/, "modal rows must retain lead-detail navigation");
assert.match(css, /\.summary-card-details-table th\s*{[^}]*position:\s*sticky;/s, "table header must remain visible while scrolling");
assert.match(css, /@media \(max-width: 639px\)[\s\S]*\.summary-card-details-dialog\s*{[^}]*width:\s*100vw;/, "modal must adapt to mobile screens");

console.log("dashboard-summary-modal.test.js: PASS");
