const assert = require("assert");

process.env.ENABLE_CLAUDE_ENRICHMENT = "false";

const contactRules = require("../src/config/contactRules");
const {
  runSalespersonAiAction
} = require("../src/services/salespersonAiActionService");

const bundle = {
  caller: { id: "usr-1", name: "Alex", role: "salesman", territory: "UAE-North" },
  companies: [
    {
      id: "lead-1",
      name: "Priority Fabricator LLC",
      status: "ENGAGED",
      tier: "1",
      next_action: "Follow up quotation QT-44",
      next_action_overdue: true,
      days_overdue: 8,
      last_activity_date: "2026-05-20",
      expected_contact_days: 10,
      contact_overdue: true,
      contact_overdue_by: 13
    },
    {
      id: "lead-2",
      name: "Healthy Contractor LLC",
      status: "PROSPECT",
      tier: "3",
      next_action_overdue: false,
      last_activity_date: "2026-06-10",
      expected_contact_days: 45,
      contact_overdue: false,
      contact_overdue_by: 0
    }
  ],
  intel: []
};

(async () => {
  assert.strictEqual(contactRules.effectiveThreshold("ENGAGED", "1"), 10);
  assert.strictEqual(contactRules.effectiveThreshold("PROSPECT", "3"), 45);

  const focus = await runSalespersonAiAction({ action: "focus_today", bundle });
  assert.strictEqual(focus.type, "markdown");
  assert.ok(focus.result.includes("Priority Fabricator LLC"));
  assert.ok(focus.result.includes("QT-44"));

  const neglected = await runSalespersonAiAction({ action: "neglected", bundle });
  assert.ok(neglected.result.includes("Neglected accounts"));
  assert.ok(neglected.result.includes("Priority Fabricator LLC"));

  const metrics = await runSalespersonAiAction({
    action: "pipeline_health",
    bundle,
    metrics: {
      total_companies: 2,
      by_status: { ENGAGED: 1, PROSPECT: 1 },
      overdue_next_actions: 1,
      overdue_action_companies: [{ id: "lead-1", name: "Priority Fabricator LLC", action: "Follow up quotation QT-44", days_overdue: 8 }],
      contact_overdue_count: 1,
      activities_this_month: 4,
      activities_last_month: 8,
      activity_trend: -50
    }
  });
  assert.strictEqual(metrics.type, "metrics");
  assert.strictEqual(metrics.metrics.overdue_next_actions, 1);
  assert.ok(metrics.insight);

  const empty = await runSalespersonAiAction({
    action: "new_intel",
    bundle: { caller: bundle.caller, companies: [], intel: [] }
  });
  assert.strictEqual(empty.type, "empty");
  assert.ok(empty.result.includes("No companies assigned"));

  console.log("PASS salesperson home one-click AI actions");
})().catch(error => {
  throw error;
});
