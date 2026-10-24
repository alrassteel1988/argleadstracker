const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const css = read("crm-record.css");
const html = read("index.html");
const vercel = JSON.parse(read("vercel.json"));
assert.match(css, /grid-template-areas:\s*"ai info"/);
assert.match(css, /@media \(max-width: 1024px\)[\s\S]*grid-template-areas:\s*"info" "ai"/);
assert.ok(html.indexOf('id="leadDetailPagePanel"') < html.indexOf('id="leadAiSummaryPagePanel"'), "Primary record content comes first in the reading and keyboard order");
assert.match(css, /\.lead-page-header, \.lead-detail-tabs\)[^}]*background:\s*var\(--crm-surface\)/s);
assert.match(css, /\.drawer-title-copy h2\s*\{[^}]*color:\s*var\(--crm-navy\)/s);
assert.match(css, /\.lead-detail-tabs button\.active\s*\{[^}]*border-bottom-color:\s*var\(--crm-amber\)/s);
assert.match(css, /\.drawer-field-value, \.drawer-summary-card strong\)\s*\{[^}]*font-size:\s*15px/s);
assert.match(css, /\.drawer-field\.is-empty \.drawer-field-value\s*\{[^}]*var\(--crm-text-secondary\)[^}]*font-style:\s*italic/s);
assert.match(css, /\.drawer-primary-actions > a\.ghost-button\s*\{[^}]*color:\s*var\(--crm-navy\)/s);
assert.match(css, /\.lead-ai-card\.risk[^\n]*--crm-health-red/);
assert.match(css, /\.lead-ai-note\s*\{[^}]*var\(--crm-health-amber-soft\)/s);
assert.match(css, /\.lead-ai-minimize-button:not\(\.hidden\):not\(\[hidden\]\)\s*\{[^}]*display:\s*inline-flex/s);
assert.doesNotMatch(css, /rgba\(|gradient\(|backdrop-filter|filter:\s*blur/);
assert.match(css, /@media \(max-width: 720px\)[\s\S]*\.lead-intel-market-feed > summary\s*\{[^}]*min-height:\s*44px[^}]*padding-block:\s*var\(--crm-space-3\)/s);
assert.match(read("client.js"), /aria-label="Lead details sections"/);
assert.match(read("client.js"), /aria-current="\$\{state\.leadDrawerTab === tab \? "page" : "false"\}"/);
assert.ok(html.indexOf('/crm-record.css?v=') > html.indexOf('/crm-data.css?v='));
assert.ok(html.indexOf('/mobile-ui.css?v=') > html.indexOf('/crm-record.css?v='));
assert.ok(vercel.builds.some(item => item.src === "crm-record.css" && item.use === "@vercel/static"));
assert.ok(vercel.routes.some(item => item.src === "/crm-record.css" && item.dest === "/crm-record.css"));
assert.ok(read("sw.js").includes('"/crm-record.css"'));
assert.match(css, /@media \(min-width: 1025px\)/);
assert.match(css, /grid-template-columns: minmax\(0, 1\.6fr\) minmax\(0, 1fr\)/);
assert.match(css, /\.record-desktop-overview, \.record-header-actions, \.record-breadcrumb-company \{ display: none; \}/);
assert.match(read("client.js"), /function desktopLeadOverviewMarkup\(lead\)/);
assert.match(read("client.js"), /record-overview-notes">\$\{renderDrawerNotes\(lead\)\}/);
const client = read("client.js");
const overviewHelpers = client.slice(client.indexOf("function desktopLeadOverviewMarkup("), client.indexOf("function renderDrawerOverview("));
const context = {
  state: {selectedId: "other", leadAiSummary: null}, summaryText: String,
  escapeHtml: value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[char])),
  remindersForLead: () => [], daysUntil: () => -5,
  normalizeNextActionPlan: String, formatDisplayDate: String,
  activityTypeClass: value => `activity-${value}`,
  renderDrawerNotes: () => '<section class="drawer-notes-view">Existing notes editor</section>',
  drawerStageLabel: String,
  lead: {id:'test"<id>', contact_person:'<script>contact</script>', activities:[{type:'Call"<script>', text:'<img src=x onerror=alert(1)>', at:'2026-10-20'}]}
};
const emptyOverview = vm.runInNewContext(`${overviewHelpers}\ndesktopLeadOverviewMarkup(lead)`, context);
assert.ok(emptyOverview.includes("No next step set"));
assert.ok(emptyOverview.includes("No reminders set."));
assert.ok(emptyOverview.includes("Not added yet"));
assert.ok(emptyOverview.includes("&lt;script&gt;contact&lt;/script&gt;"));
assert.ok(!emptyOverview.includes("<script>") && !emptyOverview.includes("<img"));
assert.ok(!emptyOverview.includes('href="#"'), "Missing contact methods must not create dead links");
const mobileNext = vm.runInNewContext(`${overviewHelpers}\nmobileLeadNextStepMarkup({...lead, next_action:'To Call', next_action_date:'2026-10-20'})`, context);
assert.ok(mobileNext.includes("5 days overdue"));
assert.ok(mobileNext.includes("Due 2026-10-20"));
assert.ok(mobileNext.includes('data-drawer-edit-lead="test&quot;&lt;id&gt;"'));
assert.match(css, /\.record-mobile-actions\s*\{[^}]*position: fixed;[^}]*safe-area-inset-bottom/s);
assert.match(client, /data-record-note/);
const mobileHelpers = client.slice(client.indexOf("function companyAiActionsMarkup("), client.indexOf("function desktopLeadOverviewMarkup("));
const mobileExtras = vm.runInNewContext(`${mobileHelpers}\n${overviewHelpers}\nmobileLeadOverviewExtras(lead)`, context);
assert.match(mobileExtras, /New scoring rules await approval/);
assert.equal((mobileExtras.match(/data-company-ai-action=/g) || []).length, 5);
assert.equal((mobileExtras.match(/Not rated/g) || []).length, 5);
assert.doesNotMatch(mobileExtras, /At risk|Act now|expected 14|Create quote/);
context.state = {selectedId: context.lead.id, leadAiSummary: {data:{recommended_next_action:'<script>unsafe</script>'}, provider:'fallback'}};
const guardedGuidance = vm.runInNewContext(`${overviewHelpers}\nmobileLeadNextStepMarkup(lead)`, context);
assert.match(guardedGuidance, /CRM guidance/);
assert.match(guardedGuidance, /&lt;script&gt;unsafe&lt;\/script&gt;/);
assert.doesNotMatch(guardedGuidance, /<script>/);
context.state.selectedId = "other-lead";
context.state.leadAiSummary.data.recommended_next_action = "OTHER LEAD GUIDANCE";
const mismatchedGuidance = vm.runInNewContext(`${overviewHelpers}\nmobileLeadNextStepMarkup(lead)`, context);
assert.doesNotMatch(mismatchedGuidance, /OTHER LEAD GUIDANCE/);
context.state.selectedId = context.lead.id;
context.state.leadAiSummary.loading = true;
assert.match(vm.runInNewContext(`${overviewHelpers}\nmobileLeadNextStepMarkup(lead)`, context), /Loading guidance/);
context.state.leadAiSummary.loading = false;
context.state.leadAiSummary.error = "Unavailable";
assert.match(vm.runInNewContext(`${overviewHelpers}\nmobileLeadNextStepMarkup(lead)`, context), /Guidance unavailable/);
const escapeListener = client.match(/document.addEventListener\("keydown", event => \{\s*if \(event.defaultPrevented[^]*?\n\}\);/)[0];
let capturedHandler, leadClosed = 0, dialogOpen = true;
vm.runInNewContext(escapeListener, {
  document: {addEventListener: (_type, handler) => { capturedHandler = handler; }, querySelector: () => dialogOpen ? {} : null},
  state: {leadDrawerOpen:true}, closeLeadDrawer: () => { leadClosed++; }
});
capturedHandler({key:'Escape'});
assert.equal(leadClosed, 0, 'Escape must not close the underlying lead while a dialog is open');
dialogOpen = false;
capturedHandler({key:'Escape', defaultPrevented:true});
assert.equal(leadClosed, 0);
capturedHandler({key:'Escape'});
assert.equal(leadClosed, 1, 'Escape outside a dialog retains the existing lead-close action');
console.log("PASS shared record presentation, tab accessibility, contrast and static asset contracts");
