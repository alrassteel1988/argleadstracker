const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const client = fs.readFileSync(path.join(root, "client.js"), "utf8");
const css = fs.readFileSync(path.join(root, "admin-dashboard-clean.css"), "utf8");
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const vercel = fs.readFileSync(path.join(root, "vercel.json"), "utf8");

assert.match(html, /href="\/admin-dashboard-clean\.css\?v=6-intel-alert-spacing"/, "the Admin Dashboard stylesheet must use the Intel and alert spacing revision");
assert.match(html, /id="adminDashboardOverviewSlot"[^>]*aria-label="Dashboard overview"/, "overview region needs an accessible label");
assert.match(html, /id="adminDashboardTriageRow"[^>]*aria-label="Attention required"/, "attention region needs an accessible label");
assert.match(html, /id="adminDashboardAnalyticsRow"[^>]*aria-label="Pipeline analytics"/, "analytics region needs an accessible label");
assert.match(html, /id="adminDashboardBottomRow"[^>]*aria-label="Lead action plan insights"/, "Lead Action Plan insights need an accessible label");

assert.match(client, /button\.setAttribute\("aria-label", `\$\{action\} \$\{sectionTitle\}`\)/, "collapse buttons need section-specific accessible names");
assert.match(client, /Boolean\(state\.currentUser\) && !isSalesmanRole\(\) && currentView === "dashboard"/, "all privileged dashboard roles must retain collapsible controls");
assert.match(client, /document\.addEventListener\("click", handleDashboardCollapseClick\)/, "collapse controls must use a rerender-safe delegated handler");
assert.match(client, /event\.target\.closest\("\.panel-collapse-toggle"\)/, "the delegated handler must target collapse controls only");
assert.match(client, /document\.body\.classList\.contains\("admin-dashboard-mode"\)/, "Admin Dashboard collapse controls must remain interactive after dashboard rerenders");
assert.match(client, /els\.adminDashboardTriageRow\?\.after\(els\.actionPlanPanel\)/, "Lead Action Plans must follow the top summary and alert row");
assert.match(client, /els\.actionPlanPanel\?\.after\(els\.adminTaskPanel, els\.lossReasonsPanel, els\.adminDashboardBottomRow\)/, "operational panels must follow Lead Action Plans");
assert.match(client, /els\.dashboardView\?\.appendChild\(els\.adminDashboardAnalyticsRow\)/, "pipeline panels must move together to the bottom dashboard section");
assert.doesNotMatch(client, /actionPlanBody\.appendChild\(els\.adminDashboardBottomRow\)/, "Lead Action Plans must not nest lower dashboard panels");
assert.match(client, /section\.classList\.add\("collapsible-enabled"\)/, "Admin Dashboard layout must enable its visible collapse controls");
assert.match(client, /section\.querySelector\("\.panel-collapse-toggle"\)\?\.classList\.remove\("hidden"\)/, "Admin Dashboard layout must reveal its collapse controls");
assert.match(client, /class="overdue-banner-kpis"/, "overdue attention panel must expose total and affected-salesman counts");
assert.match(client, /class="overdue-banner-pills overdue-owner-chips"/, "salesman overdue counts must remain visible and wrap safely");
assert.match(client, /renderMetrics\(\)/, "dashboard metric rendering must remain intact");
assert.match(client, /renderMarketSnapshotPanel\(\)/, "market snapshot rendering must remain intact");
assert.match(client, /renderDashboardPipelineFunnel\(\)/, "pipeline funnel rendering must remain intact");

assert.match(css, /body\.admin-dashboard-mode \.dashboard-view\s*\{[^}]*grid-template-columns:\s*repeat\(12,\s*minmax\(0,\s*1fr\)\)/s, "desktop dashboard must use a 12-column composition");
assert.match(css, /\.admin-dashboard-triage-row\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*5fr\)\s+minmax\(0,\s*4fr\)\s+minmax\(0,\s*3fr\)/s, "attention panels must use the requested 5/4/3 balance");
assert.match(css, /:is\(\s*#marketIntelPanel,\s*#needsAttentionPanel\s*\)\s*>\s*\.dashboard-collapsible-body\s*>\s*\.dashboard-collapsible-body-inner\s*\{[^}]*padding:\s*0;/s, "Intel Overview and Director Alerts must reserve their body spacing for the direct content areas");
assert.match(css, /:is\(\s*#marketIntelFeed,\s*#needsAttentionList\s*\)\s*\{[^}]*display:\s*grid;[^}]*gap:\s*var\(--admin-space-2\);[^}]*padding:\s*var\(--admin-space-2\)\s+var\(--admin-space-3\);[^}]*overflow:\s*visible;/s, "Intel Overview and Director Alerts need 8px vertical and 12px horizontal body padding that can grow naturally");
assert.match(css, /:is\(\s*#marketIntelFeed,\s*#needsAttentionList\s*\)\s*>\s*:is\(\.empty-copy,\s*\.intel-item,\s*\.attention-flag-card\)\s*\{[^}]*max-width:\s*100%;[^}]*min-width:\s*0;[^}]*overflow-wrap:\s*anywhere;/s, "Intel and alert messages and populated cards must wrap safely inside their panels");
assert.match(html, /id="refreshMarketIntel"/, "Intel Overview must retain Refresh Intel");
assert.match(html, /id="needsAttentionCount">0 open</, "Director Alerts must retain its open-alert count");
assert.match(client, /Market intelligence feed is disabled until ZAWYA_API_KEY and feed URL are configured\./, "Intel Overview must retain its configuration warning state");
assert.match(client, /No open director alerts\./, "Director Alerts must retain its empty state");
assert.match(client, /function intelItemMarkup\(item\)/, "Intel Overview must retain populated-item rendering");
assert.match(client, /function attentionFlagCard\(flag\)/, "Director Alerts must retain populated-alert rendering");
assert.match(client, /data-flag-action/, "Director Alert acknowledgement and resolution controls must remain wired");
assert.match(css, /\.admin-dashboard-analytics-row\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s, "analytics panels must be balanced side by side");
assert.match(css, /\.admin-dashboard-overview-slot \.metrics\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/s, "overview metrics must use four equal columns");
assert.match(css, /\.admin-dashboard-bottom-row\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/s, "remaining operational insights must use three equal columns");
assert.doesNotMatch(css, /\.admin-dashboard-bottom-row\s*\{[^}]*height:\s*\d+px/s, "the three Admin Dashboard cards must grow to fit their content");
assert.match(css, /\.admin-dashboard-bottom-row > \.panel\s*\{[^}]*min-height:\s*180px;[^}]*overflow:\s*visible/s, "Admin Dashboard cards must have a readable minimum while preserving natural content height");
assert.doesNotMatch(css, /#dashboardFocus,[\s\S]*?#dashboardActivityFeed,[\s\S]*?#dashboardStatus[\s\S]*?overflow-y:\s*auto/s, "card content must not be cramped into an internal vertical scroll region");
assert.match(css, /\.dashboard-focus-item\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto;[^}]*column-gap:\s*var\(--admin-space-2\)/s, "Cold relationships must reserve a separate badge column and title gap");
assert.match(css, /:is\(\s*#dashboardFocus,\s*#dashboardActivityFeed\s*\)\s*>\s*\.dashboard-activity-item\s*\{[^}]*min-height:\s*54px;[^}]*padding:\s*var\(--admin-space-2\)\s+var\(--admin-space-3\)/s, "Cold relationships and Latest interactions cards need 8px vertical and 12px horizontal inner padding");
assert.match(css, /\.dashboard-activity-item strong\s*\{[^}]*overflow-wrap:\s*anywhere;[^}]*text-overflow:\s*clip;[^}]*white-space:\s*normal/s, "Cold relationships and Latest interactions must wrap long account names safely");
assert.match(css, /\.dashboard-activity-item p\s*\{[^}]*overflow-wrap:\s*anywhere/s, "Cold relationships and Latest interactions descriptions must wrap without overflow");
assert.match(css, /\.stage-badge\.compact\s*\{[^}]*align-self:\s*start;[^}]*white-space:\s*normal/s, "Cold relationship badges must not overlap wrapped text");
assert.doesNotMatch(css, /#dashboardStatus\s*\.status-card\s*\{[^}]*padding:\s*var\(--admin-space-2\)\s+var\(--admin-space-3\)/s, "Pipeline Health cards must retain their existing padding");
assert.match(css, /#dashboardStatus\s*\{[^}]*grid-auto-rows:\s*auto/s, "Pipeline Health cards must grow with their status labels");
assert.match(css, /\.status-card\s*\{[^}]*min-height:\s*72px/s, "Pipeline Health status cards need a readable minimum height");
assert.match(css, /\.panel-header \.panel-collapse-toggle\.hidden\s*\{[^}]*display:\s*flex !important/s, "redesigned dashboard panels must keep their collapse controls visible");
assert.match(css, /#actionPlanPanel \.action-plan-grid\s*\{[^}]*max-height:\s*none;[^}]*overflow-y:\s*visible/s, "Lead Action Plans must grow naturally without nested vertical scrolling");
assert.match(css, /\.admin-dashboard-analytics-row\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)/s, "bottom pipeline panels must sit side by side on desktop");
assert.match(css, /@media \(max-width:\s*900px\)/, "tablet layout breakpoint must exist");
assert.match(css, /@media \(max-width:\s*700px\)/, "mobile layout breakpoint must exist");
assert.match(css, /@media \(max-width:\s*520px\)[\s\S]*?#dashboardStatus\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/, "narrow Pipeline Health layouts must use a single readable column");
assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)/, "dashboard must honor reduced motion");
assert.doesNotMatch(css, /margin-(?:top|left):\s*-\d/, "dashboard must not use negative positioning fixes");

assert.match(sw, /arg-pwa-v76-admin-dashboard-intel-alert-spacing/, "PWA cache must rotate for the Intel and alert spacing update");
assert.match(sw, /"\/admin-dashboard-clean\.css"/, "PWA shell must cache the dashboard stylesheet");
assert.match(sw, /if \(url\.pathname\.startsWith\("\/api\/"\)\) return;/, "PWA must keep API responses out of the cache");
assert.match(vercel, /"src": "admin-dashboard-clean\.css"/, "Vercel must build the dashboard stylesheet");
assert.match(vercel, /"src": "\/admin-dashboard-clean\.css", "dest": "\/admin-dashboard-clean\.css"/, "Vercel must expose the dashboard stylesheet");

let depth = 0;
for (const char of css.replace(/\/\*[\s\S]*?\*\//g, "")) {
  if (char === "{") depth += 1;
  if (char === "}") depth -= 1;
  assert.ok(depth >= 0, "Admin Dashboard CSS has an unmatched closing brace");
}
assert.equal(depth, 0, "Admin Dashboard CSS braces must balance");

const dashboardFunnelMarkup = client.match(/function dashboardPipelineFunnelCompactMarkup\([\s\S]*?\n}\r?\n\r?\nfunction bindPipelineFunnelDialog/);
assert.ok(dashboardFunnelMarkup, "Admin Dashboard funnel renderer must remain available");
assert.match(dashboardFunnelMarkup[0], /dashboard-funnel-bar-list/, "Admin Dashboard funnel must render labelled horizontal bars");
assert.match(dashboardFunnelMarkup[0], /overlapping measures/, "Admin Dashboard funnel must explain overlapping funnel measures");
assert.doesNotMatch(dashboardFunnelMarkup[0], /donut|conic-gradient|pie|circle/i, "Admin Dashboard funnel must not render circular charts");
assert.doesNotMatch(client, /\.filter\(group => group\.leads\.length\)/, "Lead Action Plans must retain zero-lead salesmen");
assert.match(client, /No registered leads for this salesman yet\./, "Zero-lead salesmen need an explicit expanded empty state");
assert.match(client, /state\.actionPlanCollapsed\[group\.key\] = true/, "Salesman action-plan details must remain collapsed initially");

console.log("admin-dashboard-layout.test.js: PASS");
