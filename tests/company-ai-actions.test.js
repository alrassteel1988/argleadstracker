const assert = require("assert");

process.env.ENABLE_CLAUDE_ENRICHMENT = "false";

const {
  normalizeAiAction,
  runCompanyAiAction
} = require("../src/services/companyAiActionService");

const bundle = {
  lead: {
    id: "lead-1",
    company_name: "GCC Fabrication LLC",
    stage: "ENGAGED",
    assigned_salesman: "Alex",
    territory: "UAE-North",
    product_interest: "H-beams and plates",
    next_action: "Follow up quotation QT-100",
    next_action_date: "2026-06-20",
    health: { label: "AMBER", reason: "18 days since last activity" },
    activities: [
      { at: "2026-06-02", type: "Quotation Sent", text: "Quotation QT-100 sent for H-beams." }
    ]
  },
  pmrs: [
    { id: "pmr-1", relationship_heat_score: "4", director_action_required: "Awareness only", notes: "Buyer asked for faster delivery." }
  ],
  intel: [{ title: "Dubai warehouse award", summary: "New warehouse package in Dubai." }],
  handoffs: []
};

(async () => {
  assert.strictEqual(normalizeAiAction("prepare"), "prepare_meeting");
  assert.strictEqual(normalizeAiAction("next"), "next_action");
  assert.strictEqual(normalizeAiAction("email"), "draft_email");
  assert.strictEqual(normalizeAiAction("summary"), "summarise_relationship");

  const meeting = await runCompanyAiAction({ action: "prepare", bundle });
  assert.strictEqual(meeting.action, "prepare_meeting");
  assert.strictEqual(meeting.provider, "fallback");
  assert.ok(meeting.output.includes("Relationship snapshot"));
  assert.ok(meeting.output.includes("QT-100"));

  const next = await runCompanyAiAction({ action: "next_action", bundle });
  assert.ok(next.output.includes("Follow up quotation QT-100"));

  console.log("PASS company record one-click AI actions");
})().catch(error => {
  throw error;
});
