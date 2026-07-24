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
assert.match(client, /const SALESMAN_CARD_ACCENTS = \["blue", "yellow", "red", "green", "orange", "violet"\]/, "Card View needs the approved Bauhaus accent palette");
assert.match(client, /function salesmanCardAccent\(row\)/, "Card accents must be assigned deterministically");
assert.match(client, /data-card-accent="\$\{accent\}"/, "Each salesman card must expose its stable accent token");
assert.match(client, /salesmen-card-identity-copy/, "Card View must render a structured identity block");
assert.match(client, /mailto:\$\{escapeHtml\(row\.email\)\}/, "Card View email addresses must remain accessible");
assert.match(client, /salesmen-card-meta/, "Tasks due, last activity, and territory must remain visible in Card View");
assert.match(client, /salesmen-card-progress/, "Card View must retain the existing conversion value in a progress indicator");
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
assert.match(css, /\.salesmen-card-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/s, "Card View needs three large-screen columns");
assert.match(css, /\.salesmen-directory-card\s*\{[^}]*background:\s*var\(--salesmen-surface\);[^}]*border:\s*2px solid var\(--salesmen-navy\);[^}]*border-top:\s*7px solid var\(--salesman-card-accent\)/s, "Cards need an opaque Bauhaus surface and structural accent");
assert.match(css, /\.salesmen-directory-card\[data-card-accent="violet"\]/, "All deterministic accent variants must be styled");
assert.match(css, /\.salesmen-directory-card-actions \.salesmen-row-actions\s*\{[^}]*grid-template-columns:\s*1fr 1fr auto/s, "Card actions must align consistently at the bottom");
assert.match(css, /\.salesmen-directory-card a:focus-visible,[\s\S]*outline:\s*3px solid var\(--bauhaus-yellow/s, "Card actions and email links need visible keyboard focus");
assert.match(css, /@media \(max-width: 1180px\)/, "Laptop and tablet layouts need a responsive breakpoint");
assert.match(css, /@media \(max-width: 760px\)/, "Mobile layouts need a responsive breakpoint");
assert.doesNotMatch(css, /(?:linear|radial)-gradient|backdrop-filter|rgba\(/i, "The Salesmen redesign must stay flat and opaque");
assert.match(serviceWorker, /"\/salesmen-directory\.css"/, "The PWA shell must cache the Salesmen stylesheet");
assert.match(vercel, /"src": "salesmen-directory\.css"/, "Vercel must build the Salesmen stylesheet");

console.log("salesmen-directory.test.js: PASS");
