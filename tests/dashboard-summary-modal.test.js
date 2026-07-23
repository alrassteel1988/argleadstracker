const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const client = fs.readFileSync(path.join(root, "client.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const salesmanCss = fs.readFileSync(path.join(root, "salesman-dashboard-summaries.css"), "utf8");

for (const type of ["openPipeline", "activeCustomers", "atRisk", "tasksDue"]) {
  assert.match(html, new RegExp(`data-summary-card=["']${type}["']`), `${type} card must opt into the details modal`);
}

assert.match(html, /id="summaryCardDetailsDialog"[^>]*aria-modal="true"[^>]*aria-labelledby="summaryCardDetailsTitle"/, "details modal must expose dialog semantics");
assert.match(client, /function dashboardSummaryDatasets\(\)/, "dashboard totals and modal records need a shared selector");
assert.match(client, /function renderMetrics\(\)\s*{\s*const datasets = dashboardSummaryDatasets\(\)/, "metric counts must consume the shared selector");
assert.match(client, /function summaryCardDetailsConfig\(type\)/, "modal configuration should be reusable across summary types");
assert.match(client, /function salesmanDashboardSummaryDatasets\(\)/, "Salesman card counts and modal records need one shared selector");

for (const type of [
  "salesmanMyLeads",
  "salesmanOverdueCalls",
  "salesmanDueToday",
  "salesmanStageNew",
  "salesmanStageContacted",
  "salesmanStageNegotiation",
  "salesmanStageWon"
]) {
  assert.ok(client.includes(`${type}: {`), `${type} modal configuration must exist`);
  assert.match(client, new RegExp(`data-summary-card="\\$\\{escapeHtml\\(card\\.type\\)\\}"`), "Salesman cards must opt into the shared modal");
}

assert.match(client, /data-summary-card="[^"]*"[^>]*aria-controls="summaryCardDetailsDialog"/, "Salesman summary buttons must expose the dialog they control");
assert.match(client, /els\.salesmanSimplifiedDashboard\?\.addEventListener\("click"[\s\S]*event\.target\.closest\("\[data-summary-card\]"\)[\s\S]*openSummaryCardDetails\(card\.dataset\.summaryCard,\s*card\)/, "Dynamically rendered Salesman cards must open the shared details modal");
assert.match(client, /function renderSalesmanSimplifiedDashboard\(\)\s*\{[\s\S]*const datasets = salesmanDashboardSummaryDatasets\(\)/, "Salesman card values must use the same datasets as their modal records");

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
assert.match(client, /summaryCardDetailsDialog\?\.addEventListener\("cancel"/, "Escape must close the summary modal through the native cancel event");
assert.match(client, /summary-details-modal-open/, "modal must lock background scrolling");
assert.match(client, /cleanupSummaryCardDetailsModal/, "modal must restore focus and clean up after closing");
assert.match(client, /openLeadDrawer\(leadId\)/, "modal rows must retain lead-detail navigation");
assert.match(client, /data-summary-details-sort=/, "summary columns must expose sorting controls");
assert.match(client, /data-summary-details-filter=/, "summary columns must expose filters");
assert.match(client, /data-summary-details-open-full/, "modal must expose Open full list navigation");
assert.match(client, /summaryDetailsPageNumbers/, "modal must render numbered pagination");
assert.match(client, /dueTodayPipelineOnly/, "Due Today full-list navigation must preserve its source scope");
assert.match(css, /\.summary-card-details-table th\s*{[^}]*position:\s*sticky;/s, "table header must remain visible while scrolling");
assert.match(css, /@media \(max-width: 639px\)[\s\S]*\.summary-card-details-dialog\s*{[^}]*width:\s*100vw;/, "modal must adapt to mobile screens");
assert.match(salesmanCss, /grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/, "pipeline stage cards must be equal-width on desktop");
assert.match(salesmanCss, /@media \(max-width:\s*1100px\)[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/, "pipeline stage cards must use two columns at medium widths");
assert.match(salesmanCss, /@media \(max-width:\s*820px\)[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)/, "summary cards must stack on small screens");

console.log("dashboard-summary-modal.test.js: PASS");
