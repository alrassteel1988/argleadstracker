const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../client.js"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "../admin-dashboard-clean.css"), "utf8");
const fn = name => {
  const result = source.match(new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`));
  assert.ok(result, name);
  return result[0];
};
const state = { currentUser: {role:"admin"}, userAccounts: [{id:"admin", name:"Manager", role:"admin"}, {id:"rep", name:"Salesman", role:"salesman"}], settings:{salesmen:[]}, leads:[] };
const adminReference = {activity:{search:"",date:"all",company:"all",type:"all",origin:"all",person:"all",linked:"all",status:"all",sort:"newest"}};
const context = vm.createContext({ state, adminReference,
  allActivities: () => state.leads.flatMap(lead => lead.activities.map(activity => ({...activity, lead_id:lead.id, company_name:lead.company_name}))),
  normalizeStageKey: stage => stage, daysSince: date => (Date.parse("2026-11-02") - Date.parse(date)) / 86400000,
  downloadTextFile: (...args) => {context.download = args;}
});
vm.runInContext(["adminReferenceActivityRows", "adminReferenceFilterActivity", "adminReferenceQuoteRows", "adminReferenceExport"].map(fn).join("\n"), context);
state.leads = [{id:"lead", company_name:"Test company", stage:"NEW", quotation_ref:"Q1", estimated_value:100,
  activities:[{id:"1", created_by:"admin", at:"2026-11-01", type:"Email", text:"sent catalogue"},
    {id:"2", created_by:"rep", at:"2026-10-01", type:"Call", transaction_status:"closed", transaction_outcome:"Done - spoke to customer", transaction_remarks:"Requirements confirmed"},
    {id:"3", created_by:"unknown", at:"2026-10-10", type:"Meeting"}]}];
let rows = context.adminReferenceActivityRows();
assert.equal(rows[0].origin, "Management");
assert.equal(rows[1].origin, "Self");
assert.equal(rows[2].origin, "Not recorded", "Unknown provenance must not be fabricated as Self");
assert.equal(rows[0].closed, false, "Legacy activities default Pending");
adminReference.activity.status = "closed";
assert.equal(context.adminReferenceFilterActivity(rows).length, 1);
adminReference.activity.search = "requirements";
assert.equal(context.adminReferenceFilterActivity(rows).length, 1);
adminReference.activity.search = "unmatched";
assert.equal(context.adminReferenceFilterActivity(rows).length, 0);
Object.assign(adminReference.activity, {search:"",status:"missing",date:"older"});
assert.equal(context.adminReferenceFilterActivity(rows).length, 0);
let quotes = context.adminReferenceQuoteRows(state.leads);
assert.equal(quotes[0].status, "Not recorded", "A quote reference alone proves neither sending nor a quote outcome");
state.leads[0].stage = "LOST";
assert.equal(context.adminReferenceQuoteRows(state.leads)[0].status, "Not recorded", "Lead stage must not invent a quote outcome");
assert.equal(state.leads[0].stage, "LOST", "The UI must not reclassify stored leads");
state.leads[0].activities.push({quotation_ref:"Q2", type:"Quotation Sent", at:"2026-10-02"});
quotes = context.adminReferenceQuoteRows(state.leads);
assert.equal(quotes.length, 2);
assert.ok(quotes.every(quote => quote.estimated === null), "Do not duplicate a lead estimate across several quote references");
context.adminReferenceExport("test.csv", ["Company"], [["=formula"], ['quote"value']]);
assert.match(context.download[1], /'=formula/);
assert.match(context.download[1], /quote""value/);
context.download = null;
state.currentUser.role = "salesman";
context.adminReferenceExport("test.csv", [], []);
assert.equal(context.download, null, "Salesmen must not use Admin export");
assert.match(source, /renderReferenceAdminShell\(\)/);
assert.match(source, /data-admin-activity-history/);
assert.match(source, /readOnlyLog = state\.currentUser\?\.role === "admin" && currentView === "activity"/);
assert.match(css, /html:has\(body\.admin-reference-mode\)/, "Sticky navigation must not be trapped in a body scroll container");
assert.match(css, /\.admin-ref-mobile-filters/, "Mobile filter access must not depend on table columns");
context.percentOf = (count, total) => total ? Math.round(count / total * 100) : 0;
context.today = () => "2026-11-02";
vm.runInContext(["adminDashboardInitials", "adminDashboardMetricPresentation"].map(fn).join("\n"), context);
assert.equal(context.adminDashboardInitials("Other Demo Salesman"), "OD");
assert.equal(context.adminDashboardInitials("  "), "");
assert.equal(context.adminDashboardInitials(null), "A");
let cards = context.adminDashboardMetricPresentation({openPipeline:[{}, {}], activeCustomers:[{}], atRisk:[{}, {}, {}], tasksDue:[{next_action_date:"2026-11-01"}, {next_action_date:"2026-11-02"}]}, 4);
assert.deepEqual(Array.from(cards, card => card.percent), [50, 25, 75, 50]);
assert.equal(cards[1].unit, "of 4");
cards = context.adminDashboardMetricPresentation({openPipeline:[], activeCustomers:[], atRisk:[], tasksDue:[]}, 0);
assert.ok(cards.every(card => card.percent === 0), "Empty datasets must not produce invalid meters");
assert.match(css, /body\.admin-reference-mode\.admin-dashboard-mode #appShell #metricsPanel \.metric-open/, "V3 colors must be scoped to Admin home only");
console.log("admin-reference.test.js: PASS");
