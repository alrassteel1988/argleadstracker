const assert = require("assert");

const {
  buildLeadSummaryContext,
  fallbackLeadSummary,
  runLeadAiSummary
} = require("../src/services/leadAiSummaryService");

const bundle = {
  lead: {
    id: "lead-1",
    company_name: "ACA Steel Contracting LLC",
    stage: "PROSPECT",
    assigned_salesman: "Alex",
    territory: "Dubai",
    contact_person: "Mr. Rahul",
    next_action: "To Call",
    next_action_date: "2026-06-20",
    last_activity: "2026-06-18",
    activities: [
      { id: "act-1", at: "2026-06-18", type: "Phone Call", text: "Introductory call planned." }
    ]
  },
  salesman: {
    name: "Alex",
    email: "alex@alrassteel.com",
    territory: "Dubai",
    status: "active"
  },
  activities: [
    { id: "act-1", at: "2026-06-18", type: "Phone Call", text: "Introductory call planned." }
  ],
  reminders: [
    { id: "rem-1", due_date: "2026-06-20", reminder_type: "Quotation follow-up", activity_required: "Call procurement", reminder_status: "scheduled" }
  ],
  followups: [
    { id: "rem-1", due_date: "2026-06-20", reminder_type: "Quotation follow-up", activity_required: "Call procurement", reminder_status: "scheduled" }
  ],
  quotes: [],
  calls: [{ id: "act-1", at: "2026-06-18", type: "Phone Call", text: "Introductory call planned." }],
  emails: [],
  meetings: [],
  stageChanges: [],
  noteEntries: [],
  pmrs: [],
  intel: [
    { title: "Dubai contractor activity", summary: "UAE project activity remains active.", source: "Zawya", url: "https://example.com/intel" }
  ],
  handoffs: [],
  lastActivityDate: "2026-06-18",
  marketIntelConfigured: true,
  marketIntelUnavailableReason: ""
};

const context = buildLeadSummaryContext(bundle);
assert.strictEqual(context.lead.company_name, "ACA Steel Contracting LLC");
assert.strictEqual(context.activity_summary.calls, 1);

const fallback = fallbackLeadSummary(bundle);
assert.ok(fallback.current_lead_status.includes("PROSPECT"));
assert.ok(Array.isArray(fallback.risks_attention_needed));
assert.ok(Array.isArray(fallback.data_gaps));

async function mockFetch() {
  return {
    ok: true,
    async json() {
      return {
        output: [
          {
            content: [
              {
                type: "output_text",
                text: JSON.stringify({
                  current_lead_status: "Lead is early-stage and needs qualification.",
                  market_intelligence: "Construction activity remains relevant in Dubai.",
                  salesman_engagement_history: "Alex owns the lead and logged one call.",
                  risks_attention_needed: ["No quote has been issued yet."],
                  recommended_next_action: "Call procurement and confirm current requirement.",
                  suggested_follow_up_message: "Hello team, may we confirm your current steel requirement?",
                  confidence: "High",
                  data_gaps: ["No PMR records filed."],
                  sources: [{ label: "Dubai contractor activity", url: "https://example.com/intel" }]
                })
              }
            ]
          }
        ]
      };
    }
  };
}

(async () => {
  const result = await runLeadAiSummary({
    bundle,
    openAiKey: "test-key",
    model: "gpt-4.1-mini",
    openAiFetch: mockFetch
  });
  assert.strictEqual(result.provider, "openai");
  assert.strictEqual(result.summary.confidence, "High");
  assert.strictEqual(result.summary.sources[0].label, "Dubai contractor activity");

  const fallbackResult = await runLeadAiSummary({ bundle, openAiKey: "" });
  assert.strictEqual(fallbackResult.provider, "fallback");
  console.log("PASS lead AI summary service");
})().catch(error => {
  throw error;
});
