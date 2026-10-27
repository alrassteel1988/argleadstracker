const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const css = read("crm-dashboard.css");
const html = read("index.html");
const worker = read("sw.js");
const vercel = JSON.parse(read("vercel.json"));

assert.match(css, /#salesmanSimplifiedDashboard\s*\{[^}]*grid-template-rows:\s*none\s*!important/s);
assert.match(css, /#salesmanSimplifiedDashboard\s*\{[^}]*overflow:\s*visible\s*!important/s);
assert.match(css, /\.salesman-simplified-block\s*\{[^}]*var\(--crm-card-border\)[^}]*var\(--crm-card-surface\)/s);
assert.match(css, /\.salesman-summary-card-copy small\s*\{[^}]*overflow:\s*visible[^}]*white-space:\s*normal/s);
assert.match(css, /\.salesman-simplified-queue\s*\{[^}]*max-height:\s*204px[^}]*overflow-y:\s*auto/s);
assert.match(html, /<details class="salesman-dashboard-more-tools">[\s\S]*id="salesmanSimplifiedActions"[\s\S]*id="salesmanDashboardLeadList"/);
assert.ok(html.indexOf('class="salesman-simplified-block salesman-dashboard-call-queue"') > html.indexOf('class="salesman-dashboard-more-tools"'), "The full queue remains available in expanded tools");
assert.match(html, /id="salesmanSimplifiedMetrics"[\s\S]*class="salesperson-dashboard-layout"[\s\S]*id="salespersonFocusList"/);
assert.match(css, /\.salesperson-dashboard-layout\s*\{[^}]*minmax\(0, 1\.65fr\) minmax\(300px, 1fr\)/s);
assert.match(html, /class="salesperson-dashboard-assistant"/);
assert.match(css, /\.salesman-dashboard-lead-table\s*\{[^}]*overflow:\s*auto/s);
assert.match(css, /@media \(max-width: 720px\)[\s\S]*\.salesman-simplified-pipeline-strip\s*\{[^}]*display:\s*flex[^}]*overflow-x:\s*auto/s);
assert.doesNotMatch(css, /rgba\(|gradient\(|filter:\s*blur|backdrop-filter|opacity:\s*0\./);
assert.doesNotMatch(css, /data-summary-card[^}]*display:\s*none/, "Do not remove stage or metric actions");
assert.ok(html.indexOf('/crm-dashboard.css?v=') > html.indexOf('/crm-shell.css?v='));
assert.ok(html.indexOf('/mobile-ui.css?v=') > html.indexOf('/crm-dashboard.css?v='));
assert.ok(vercel.builds.some(item => item.src === "crm-dashboard.css" && item.use === "@vercel/static"));
assert.ok(vercel.routes.some(item => item.src === "/crm-dashboard.css" && item.dest === "/crm-dashboard.css"));
assert.ok(worker.includes('"/crm-dashboard.css"'));
assert.match(css, /#adminDashboardWorkRow\s*\{[^}]*minmax\(0, 1\.5fr\) minmax\(300px, 1fr\)/s);
assert.match(css, /\.dashboard-activity-item\s*\{[^}]*height:\s*auto\s*!important[^}]*text-align:\s*left/s);
assert.match(css, /@media \(max-width: 1100px\)[\s\S]*#adminDashboardWorkRow\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/s);
assert.match(html, /id="adminDashboardWorkRow"[^>]*aria-label="Lead plans and intelligence"/);
assert.match(css, /#adminDashboardBottomRow\s*\{[^}]*height:\s*auto\s*!important/s);
console.log("PASS proposal dashboard surfaces, readable content, normal flow and static asset contracts");

const vm = require("node:vm");
const client = read("client.js");
const panelSource = client.slice(client.indexOf("function renderSalespersonReferencePanels("), client.indexOf("function arrangeSalespersonMobileDashboard("));
function referencePanels({ loading = false, error = "", leads = [] } = {}) {
  const nodes = new Map();
  const root = { querySelector: selector => {
    if (!nodes.has(selector)) nodes.set(selector, { innerHTML: "", textContent: "" });
    return nodes.get(selector);
  } };
  const datasets = { myLeads: leads, overdueCalls: leads.filter(lead => lead.overdue), stageNew: leads, stageNegotiation: [] };
  const context = {
    els: { salesmanSimplifiedDashboard: root }, state: { leadsLoading: loading, leadsLoaded: !loading && !error, leadsError: error },
    actionableSalesmanLeads: () => leads, firstTouchDueLeads: () => leads,
    primaryLeadContact: lead => ({ phone: lead.phone }), leadHasOverdueNextAction: lead => lead.overdue,
    daysOverdue: () => 4, stageDisplayLabel: () => "Prospect", salesmanDashboardSummaryIcon: () => "<svg></svg>",
    leadGeneratedBySalesman: lead => lead.created_by === "self",
    escapeHtml: value => String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]),
    datasets
  };
  vm.runInNewContext(`${panelSource}\nrenderSalespersonReferencePanels(datasets);`, context);
  return selector => nodes.get(selector);
}
const hostileLead = { id: 'lead"<x>', company_name: '<img src=x onerror="bad()">', next_action: "Email <script>bad()</script>", overdue: true };
const panels = referencePanels({ leads: [hostileLead] });
assert.match(panels("#salespersonFocusList").innerHTML, /&lt;img/);
assert.doesNotMatch(panels("#salespersonFocusList").innerHTML, /<script>|<img/);
assert.equal((panels("#salespersonFocusList").innerHTML.match(/<li>/g) || []).length, 1, "First-touch duplicates must not repeat in focus");
assert.match(panels("#salespersonOrigin").innerHTML, /Unrecorded origin/, "Missing creator metadata cannot imply management or self-generated origin");
assert.match(referencePanels({leads:[{id:'a',created_by:'other'}]})('#salespersonOrigin').innerHTML, /Created by others/, "A different creator must not be assumed to be management");
assert.match(panels("#salespersonQuickGrid").innerHTML, /salesperson-quick-count">Not available/, "Unloaded AI counts must be labelled unavailable rather than fabricated");
assert.match(referencePanels()("#salespersonFocusList").innerHTML, /are clear/);
assert.match(referencePanels({ loading: true })("#salespersonFocusList").innerHTML, /Loading/);
assert.match(referencePanels({ error: "Unavailable" })("#salespersonFocusList").innerHTML, /unavailable/);
assert.match(client, /const candidates = \[\.\.\.actionableSalesmanLeads\(\), \.\.\.firstTouchDueLeads\(\)\]/, "Focus must use existing caller-scoped datasets");
console.log("PASS Salesperson focus escaping, deduplication, truthful provenance, empty/loading/error states");
