const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const client = fs.readFileSync(path.join(root, "client.js"), "utf8");
const css = fs.readFileSync(path.join(root, "admin-dashboard-clean.css"), "utf8");
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const vercel = fs.readFileSync(path.join(root, "vercel.json"), "utf8");

assert.match(html, /href="admin-dashboard-clean\.css\?v=2"/, "the Admin Dashboard stylesheet must be loaded");
assert.match(html, /id="adminDashboardOverviewSlot"[^>]*aria-label="Dashboard overview"/, "overview region needs an accessible label");
assert.match(html, /id="adminDashboardTriageRow"[^>]*aria-label="Attention required"/, "attention region needs an accessible label");
assert.match(html, /id="adminDashboardAnalyticsRow"[^>]*aria-label="Pipeline analytics"/, "analytics region needs an accessible label");
assert.match(html, /id="adminDashboardBottomRow"[^>]*aria-label="Lead action plan insights"/, "Lead Action Plan insights need an accessible label");

assert.match(client, /button\.setAttribute\("aria-label", `\$\{action\} \$\{sectionTitle\}`\)/, "collapse buttons need section-specific accessible names");
assert.match(client, /Boolean\(state\.currentUser\) && !isSalesmanRole\(\) && currentView === "dashboard"/, "all privileged dashboard roles must retain collapsible controls");
assert.match(client, /document\.addEventListener\("click", handleDashboardCollapseClick\)/, "collapse controls must use a rerender-safe delegated handler");
assert.match(client, /event\.target\.closest\("\.panel-collapse-toggle"\)/, "the delegated handler must target collapse controls only");
assert.match(client, /document\.body\.classList\.contains\("admin-dashboard-mode"\)/, "Admin Dashboard collapse controls must remain interactive after dashboard rerenders");
assert.match(client, /actionPlanBody\.appendChild\(els\.adminDashboardBottomRow\)/, "lower insight panels must live inside Lead Action Plans");
assert.match(client, /section\.classList\.add\("collapsible-enabled"\)/, "Admin Dashboard layout must enable its visible collapse controls");
assert.match(client, /section\.querySelector\("\.panel-collapse-toggle"\)\?\.classList\.remove\("hidden"\)/, "Admin Dashboard layout must reveal its collapse controls");
assert.match(client, /class="overdue-banner-kpis"/, "overdue attention panel must expose total and affected-salesman counts");
assert.match(client, /class="overdue-banner-pills"/, "salesman overdue counts must remain visible");
assert.match(client, /renderMetrics\(\)/, "dashboard metric rendering must remain intact");
assert.match(client, /renderMarketSnapshotPanel\(\)/, "market snapshot rendering must remain intact");
assert.match(client, /renderDashboardPipelineFunnel\(\)/, "pipeline funnel rendering must remain intact");

assert.match(css, /body\.admin-dashboard-mode \.dashboard-view\s*\{[^}]*grid-template-columns:\s*repeat\(12,\s*minmax\(0,\s*1fr\)\)/s, "desktop dashboard must use a 12-column composition");
assert.match(css, /\.admin-dashboard-triage-row\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*5fr\)\s+minmax\(0,\s*4fr\)\s+minmax\(0,\s*3fr\)/s, "attention panels must use the requested 5/4/3 balance");
assert.match(css, /\.admin-dashboard-analytics-row\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s, "analytics panels must be balanced side by side");
assert.match(css, /\.admin-dashboard-overview-slot \.metrics\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/s, "overview metrics must use four equal columns");
assert.match(css, /\.admin-dashboard-bottom-row\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/s, "Lead Action Plan insights must use three equal columns");
assert.match(css, /\.panel-header \.panel-collapse-toggle\.hidden\s*\{[^}]*display:\s*flex !important/s, "redesigned dashboard panels must keep their collapse controls visible");
assert.match(css, /#actionPlanPanel \.action-plan-grid\s*\{[^}]*max-height:\s*270px;[^}]*overflow-y:\s*auto/s, "growable action plans need scoped internal scrolling");
assert.match(css, /@media \(max-width:\s*900px\)/, "tablet layout breakpoint must exist");
assert.match(css, /@media \(max-width:\s*700px\)/, "mobile layout breakpoint must exist");
assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)/, "dashboard must honor reduced motion");
assert.doesNotMatch(css, /margin-(?:top|left):\s*-\d/, "dashboard must not use negative positioning fixes");

assert.match(sw, /arg-pwa-v59-salesmen-card-view/, "PWA cache must rotate for the latest UI assets");
assert.match(sw, /"\/admin-dashboard-clean\.css"/, "PWA shell must cache the dashboard stylesheet");
assert.match(vercel, /"src": "admin-dashboard-clean\.css"/, "Vercel must build the dashboard stylesheet");
assert.match(vercel, /"src": "\/admin-dashboard-clean\.css", "dest": "\/admin-dashboard-clean\.css"/, "Vercel must expose the dashboard stylesheet");

let depth = 0;
for (const char of css.replace(/\/\*[\s\S]*?\*\//g, "")) {
  if (char === "{") depth += 1;
  if (char === "}") depth -= 1;
  assert.ok(depth >= 0, "Admin Dashboard CSS has an unmatched closing brace");
}
assert.equal(depth, 0, "Admin Dashboard CSS braces must balance");

console.log("admin-dashboard-layout.test.js: PASS");
