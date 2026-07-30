const assert = require("assert");
const fs = require("fs");
const path = require("path");
const server = require("../server");

const salesman = {
  id: "sales-1",
  name: "P.N. Bhatia",
  email: "bhatia@alrassteel.com",
  role: "salesman",
  territory: "Dubai"
};

const leads = [
  {
    id: "lead-1",
    company_name: "ACA Steel Constructions Contracting LLC",
    stage: "PROSPECT",
    estimated_value: 250000,
    product_interest: "Rebar",
    next_action_date: "2026-06-20",
    last_activity: "2026-06-01",
    activities: []
  }
];

const context = server.weeklyReportContext(salesman, leads, "2026-06-26");

const draft = {
  ...server.weeklyReportDefaults(salesman, "2026-06-26"),
  user_id: salesman.id,
  summary: "Met procurement and reviewed two active quotations for June delivery.",
  next_week_plan: "Call ACA Steel on Monday and send revised quotation by Tuesday.",
  market_intelligence: {
    demand_band: "Same",
    demand_note: "Customers said projects remain active in June with stable buying plans.",
    pricing_band: "Occasional",
    competitor_loss: "no",
    competitor_pricing_note: "No fresh undercutting was reported this week.",
    cashflow_band: "Occasional",
    extended_terms_band: "Occasional",
    defaults_heard: "no",
    projects_note: "Dubai warehouse and villa packages are still moving.",
    government_projects_band: "No change",
    government_projects_note: "",
    new_customers_note: "None confirmed this week after follow-up review.",
    lost_customers_note: "None lost this week after account review.",
    big_changes_note: "No major account changes reported this week."
  },
  attested: true,
  no_secured_orders_confirmed: true
};

assert.equal(server.weeklyReportIsLockedForEditing("submitted"), true);
assert.equal(server.weeklyReportIsLockedForEditing("under_review"), true);
assert.equal(server.weeklyReportIsLockedForEditing("accepted"), true);
assert.equal(server.weeklyReportIsLockedForEditing("revision_required"), false);
assert.equal(server.weeklyReportIsLockedForEditing("in_progress"), false);

let blockers = server.weeklyReportBlockers(draft, { ...context, expected_orders: [], problematic_accounts: [] });
assert(blockers.includes("Confirm explicitly if there were no expected orders to review this week."));
assert(blockers.includes("Confirm explicitly if there were zero problematic accounts this week."));

draft.no_expected_orders_confirmed = true;
draft.no_problematic_accounts_confirmed = true;
blockers = server.weeklyReportBlockers(draft, { ...context, expected_orders: [], problematic_accounts: [] });
assert.equal(blockers.some(item => /expected orders/i.test(item)), false);
assert.equal(blockers.some(item => /zero problematic accounts/i.test(item)), false);

const expectedOrderDraft = {
  ...draft,
  no_expected_orders_confirmed: false,
  expected_orders: [{
    lead_id: "lead-1",
    account_name: "ACA Steel Constructions Contracting LLC",
    likelihood: "Low chance",
    timing: "Next week",
    blockers: ""
  }]
};
blockers = server.weeklyReportBlockers(expectedOrderDraft, { ...context, expected_orders: leads, problematic_accounts: [] });
assert(blockers.some(item => /Describe what could stop ACA Steel/i.test(item)));
expectedOrderDraft.expected_orders[0].blockers = "Customer approval and final pricing could delay award.";
blockers = server.weeklyReportBlockers(expectedOrderDraft, { ...context, expected_orders: leads, problematic_accounts: [] });
assert.equal(blockers.some(item => /Describe what could stop ACA Steel/i.test(item)), false);

const clientSource = fs.readFileSync(path.join(__dirname, "..", "client.js"), "utf8");
const stylesSource = fs.readFileSync(path.join(__dirname, "..", "styles.css"), "utf8");
assert.match(clientSource, /function weeklyExpectedOrderCompletion/);
assert.match(clientSource, /const blockersRequired = true/);
assert.match(clientSource, /expected\.every\(item => weeklyExpectedOrderCompletion\(item\)\.complete\)/);
assert.match(clientSource, /data-weekly-completion-field/);
assert.match(clientSource, /syncWeeklyRequiredFieldStates\(\)/);
assert.match(stylesSource, /field--required-empty/);
assert.match(stylesSource, /field--filled/);
assert.match(stylesSource, /tasks-field-label\.is-required::after/);

console.log("PASS weekly report workflow rules");
