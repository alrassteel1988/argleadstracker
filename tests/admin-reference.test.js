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
  allActivities: leads => leads.flatMap(lead => lead.activities.map(activity => ({...activity, lead_id:lead.id, company_name:lead.company_name}))),
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
const registration = { id: "creation", lead_creation: true, type: "Lead creation", text: "New Lead Account creation",
  created_by: "new-rep", created_by_name: "Actual Registrar", created_by_role: "salesman", at: "2026-11-01", transaction_status: "recorded" };
state.leads[0].activities.push(registration);
const created = context.adminReferenceActivityRows().find(row => row.id === "creation");
assert.equal(created.actor, "Actual Registrar", "Use the stored creator, not the assigned salesman");
assert.equal(created.type, "New Lead creation", "The Admin Type column uses the requested creation label");
assert.equal(registration.type, "Lead creation", "Display labels must not rewrite protected saved history");
assert.equal(created.origin, "Self", "Creator snapshots survive profile-list omissions");
assert.equal(created.recorded, true);
const detailButton = () => ({classList:{toggle(name,value){this[name]=value;}},dataset:{}});
const detailElements = {activityDetailsDialog:{showModal(){}},activityDetailsTitle:{},
  activityDetailsBody:{querySelectorAll:()=>[]},editActivityFromDetails:detailButton(),
  requestActivityDeletionFromDetails:detailButton(),cancelActivityDeletionFromDetails:detailButton()};
Object.assign(context,{els:detailElements,currentView:"activity",isSalesmanRole:()=>false,
  resolveActivity:()=>({lead:{company_name:"Creation fixture",next_action:"To Call",assigned_salesman:"Current owner",activities:[registration]},activity:registration}),
  pageTitleMarkup:value=>String(value),escapeHtml:value=>String(value),formatDisplayDate:value=>String(value),formatDateTime:value=>String(value)});
vm.runInContext(fn("openActivityDetails"),context);
context.openActivityDetails("lead",0,"creation");
assert.match(detailElements.activityDetailsBody.innerHTML, /<span>Created on<\/span>/);
assert.match(detailElements.activityDetailsBody.innerHTML, /<span>Type<\/span><strong>New Lead creation<\/strong>/);
assert.doesNotMatch(detailElements.activityDetailsBody.innerHTML, /Next action|To Call|Outcome &amp; remarks|No remarks recorded/,
  "A creation audit must not inherit the current plan or appear to require a follow-up outcome");
context.currentView="pipeline";
context.openActivityDetails("lead",0,"creation");
assert.equal(detailElements.editActivityFromDetails.classList.hidden,true,"Creation stays read-only outside the Activity log");
assert.equal(detailElements.requestActivityDeletionFromDetails.classList.hidden,true);
context.currentView="activity";
context.resolveActivity=()=>({lead:{company_name:"Ordinary fixture",next_action:"To Call",activities:[]},
  activity:{id:"ordinary",type:"Phone Call",at:"2026-11-01"}});
context.openActivityDetails("lead",0,"ordinary");
assert.match(detailElements.activityDetailsBody.innerHTML, /<span>Next action<\/span><strong>To Call<\/strong>/);
const otherSnapshot = { ...registration, id: "unverified-role", lead_creation: false, type: "Call", created_by_role: "admin" };
state.leads[0].activities.push(otherSnapshot);
assert.equal(context.adminReferenceActivityRows().find(row => row.id === "unverified-role").origin, "Not recorded",
  "An arbitrary legacy role field must not invent management provenance");
state.leads[0].activities.pop();
for (const status of ["pending", "missing", "closed", "completed", "cancelled", "done", "not-reached"]) {
  adminReference.activity.status = status;
  assert.equal(context.adminReferenceFilterActivity([created]).length, 0, status);
}
adminReference.activity.status = "recorded";
assert.equal(context.adminReferenceFilterActivity([created]).length, 1);
state.leads[0].activities.pop();
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
state.currentUser = {id:"rep", name:"Salesman", role:"salesman"};
context.adminReferenceExport("test.csv", [], []);
assert.equal(context.download, null, "Salesmen must not use Admin export");
state.leads[0].assigned_to = "rep";
state.leads[0].activities.push(
  {id:"legacy", created_by_name:"Salesman", type:"Call"},
  {id:"offline", created_by:"rep", pending_sync:true},
  {id:"archived", created_by:"rep", archived:true},
  {id:"request", created_by:"rep", delete_request:true}
);
state.leads.push(
  {id:"reassigned", assigned_to:"other", assigned_salesman:"Salesman", activities:[{id:"reassigned-activity",created_by:"rep"}]},
  {id:"unverified", assigned_salesman:"Salesman", activities:[{id:"unverified-activity",created_by:"rep"}]}
);
assert.deepEqual(Array.from(context.adminReferenceActivityRows(), row => row.id), ["2"],
  "Personal log requires verified authorship and current assignment, and excludes pending sync and hidden records");
state.currentUser.id = "other";
assert.equal(context.adminReferenceActivityRows().length, 0, "Another signed-in Salesman cannot inherit the previous account's log");
assert.match(source, /renderReferenceAdminShell\(\)/);
assert.match(source, /data-admin-activity-history/);
assert.match(source, /readOnlyLog = creation \|\| currentView === "activity" && \(state\.currentUser\?\.role === "admin" \|\| isSalesmanRole\(\)\)/);
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
