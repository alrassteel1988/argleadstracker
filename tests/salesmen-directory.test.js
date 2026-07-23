const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const client = fs.readFileSync(path.join(root, "client.js"), "utf8");
const css = fs.readFileSync(path.join(root, "salesmen-directory.css"), "utf8");
const serviceWorker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const vercel = fs.readFileSync(path.join(root, "vercel.json"), "utf8");

for (const id of [
  "salesmenMetricTotal",
  "salesmenMetricTerritories",
  "salesmenMetricOverdue",
  "salesmenMetricOpenLeads",
  "salesmenSearch",
  "salesmenTerritoryFilter",
  "salesmenStatusFilter",
  "salesmenSort",
  "salesmenGrid",
  "salesmenDirectoryPagination",
  "performanceChart",
  "salesmenSummaryChart"
]) {
  assert.match(html, new RegExp(`id="${id}"`), `${id} must remain in the Salesmen workspace`);
}

for (const label of [
  "Total salesmen",
  "Active territories",
  "Overdue follow-ups",
  "Open leads assigned",
  "Salesmen Directory",
  "Salesman Performance Snapshot"
]) {
  assert.ok(html.includes(label), `${label} must be visible`);
}

assert.match(client, /function salesmenDirectoryRows\(\)/, "Directory metrics must come from the existing application state");
assert.match(client, /state\.userAccounts/, "The directory must reuse the existing account API result");
assert.match(client, /state\.leads\.filter\(lead => leadMatchesSalesman/, "Lead ownership must reuse the existing matcher");
assert.match(client, /function filteredSalesmenDirectoryRows\(rows\)/, "Search, filters, and sorting must share one data set");
assert.match(client, /function exportSalesmenDirectoryCsv\(\)/, "The Export CSV control must be functional");
assert.match(client, /openSalesmanLeadsViewer\(name\)/, "Existing Jump to Leads behavior must remain wired");
assert.match(client, /resetLeadFormForNewLead\(\)/, "Assign Leads must use the existing lead workflow");
assert.match(client, /new Chart\(els\.performanceChart/, "Assigned-lead chart must use the existing Chart.js dependency");
assert.match(client, /new Chart\(els\.salesmenSummaryChart/, "Summary chart must use the existing Chart.js dependency");

assert.match(css, /grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/, "Summary metrics need a four-column desktop grid");
assert.match(css, /\.salesmen-metric-card\s*\{[^}]*background-image:\s*none\s*!important;[^}]*opacity:\s*1\s*!important;[^}]*isolation:\s*isolate;/s, "Summary metrics must be fully opaque flat surfaces");
assert.match(css, /\.salesmen-metric-card::before,[\s\S]*\.salesmen-metric-card::after\s*\{[^}]*content:\s*none\s*!important;/, "Summary metrics must not render decorative overlay layers");
assert.match(css, /\.salesmen-metric-card\.is-blue\s*\{[^}]*background-color:\s*var\(--salesmen-blue\)\s*!important;/s, "Total Salesmen must use an explicit solid blue fill");
assert.match(css, /\.salesmen-metric-card\.is-green\s*\{[^}]*background-color:\s*var\(--salesmen-green\)\s*!important;/s, "Active Territories must use an explicit solid green fill");
assert.match(css, /\.salesmen-metric-card\.is-orange\s*\{[^}]*background-color:\s*var\(--salesmen-orange\)\s*!important;/s, "Overdue Follow-ups must use an explicit solid orange fill");
assert.match(css, /\.salesmen-metric-card\.is-red\s*\{[^}]*background-color:\s*var\(--salesmen-red\)\s*!important;/s, "Open Leads Assigned must use an explicit solid red fill");
assert.match(css, /\.salesmen-metric-card span\s*\{[^}]*-webkit-text-fill-color:\s*#ffffff;[^}]*opacity:\s*1\s*!important;/s, "Metric labels must remain fully opaque white");
assert.match(css, /\.salesmen-directory-table\s*\{[^}]*min-width:\s*1080px/s, "The directory table needs a scoped horizontal-scroll fallback");
assert.match(css, /\.salesmen-directory-table th\s*\{[^}]*position:\s*sticky/s, "Directory headers should stay visible while scrolling");
assert.match(css, /@media \(max-width: 1180px\)/, "Laptop and tablet layouts need a responsive breakpoint");
assert.match(css, /@media \(max-width: 760px\)/, "Mobile layouts need a responsive breakpoint");
assert.doesNotMatch(css, /(?:linear|radial)-gradient|backdrop-filter|rgba\(/i, "The Salesmen redesign must stay flat and opaque");
assert.match(serviceWorker, /"\/salesmen-directory\.css"/, "The PWA shell must cache the Salesmen stylesheet");
assert.match(vercel, /"src": "salesmen-directory\.css"/, "Vercel must build the Salesmen stylesheet");

console.log("salesmen-directory.test.js: PASS");
