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

bundle.intelligenceReport = {
  research_date: "2026-08-10",
  executive_snapshot: { top_opportunity: "Uploaded structural steel package", steel_demand: "HIGH" },
  company_profile: { company_type: "Structural steel fabricator", headquarters: "Dubai", main_activities: ["Fabrication", "Erection"] },
  structural_steel_opportunity: { buying_pattern_opportunity: "Package-based structural steel procurement" },
  sales_recommendation: { recommended_sales_angle: "Call procurement", suggested_next_action: "Ask procurement for the next tender package" },
  lead_score: { displayed_score: 8 },
  research_quality: {
    not_publicly_found_unverified: [{ statement: "Named procurement manager was not publicly verified." }],
    confidence_summary: { company_identity: "High", project_intelligence: "Low" }
  },
  sources: [{ title: "Official company profile", url: "https://example.com/profile" }]
};

const context = buildLeadSummaryContext(bundle);
assert.strictEqual(context.lead.company_name, "ACA Steel Contracting LLC");
assert.strictEqual(context.activity_summary.calls, 1);
assert.strictEqual(context.uploaded_pdf_intelligence.executive_snapshot.top_opportunity, "Uploaded structural steel package");
assert.strictEqual(context.uploaded_pdf_intelligence.sources[0].url, "https://example.com/profile");

const fallback = fallbackLeadSummary(bundle);
assert.ok(fallback.current_lead_status.includes("PROSPECT"));
assert.ok(Array.isArray(fallback.risks_attention_needed));
assert.ok(Array.isArray(fallback.data_gaps));
assert.match(fallback.market_intelligence, /Uploaded structural steel package/);
assert.match(fallback.current_lead_status, /Structural steel fabricator/);
assert.match(fallback.recommended_next_action, /To Call/, "existing CRM next actions must remain primary");
assert.strictEqual(fallback.sources[0].url, "https://example.com/profile");
assert.ok(fallback.risks_attention_needed.some(item => /PDF research gap: Named procurement manager/.test(item)), "PDF research quality gaps must surface in Overall Summary risks");

const pdfOnlyBundle = {
  ...bundle,
  lead: { ...bundle.lead, next_action: "", next_action_date: "" },
  intel: [],
  marketIntelConfigured: false,
  marketIntelUnavailableReason: ""
};
const pdfOnlyFallback = fallbackLeadSummary(pdfOnlyBundle);
assert.match(pdfOnlyFallback.market_intelligence, /Uploaded structural steel package/);
assert.match(pdfOnlyFallback.recommended_next_action, /Ask procurement for the next tender package/);
assert.strictEqual(pdfOnlyFallback.sources[0].url, "https://example.com/profile");

const noIntelFallback = fallbackLeadSummary({ ...pdfOnlyBundle, intelligenceReport: null });
assert.strictEqual(noIntelFallback.confidence, "Low");
assert.ok(noIntelFallback.data_gaps.some(item => /Insufficient external intelligence/.test(item)));

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
                  salesman_engagement_history: { owner: "Alex", latest_activity: "One call logged" },
                  risks_attention_needed: [{ issue: "No quote has been issued yet." }],
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
  assert.match(result.summary.salesman_engagement_history, /owner: Alex/i);
  assert.ok(!result.summary.salesman_engagement_history.includes("[object Object]"));
  assert.deepStrictEqual(result.summary.risks_attention_needed, ["issue: No quote has been issued yet."]);

  const fallbackResult = await runLeadAiSummary({ bundle, openAiKey: "" });
  assert.strictEqual(fallbackResult.provider, "fallback");
  console.log("PASS lead AI summary service");
})().catch(error => {
  throw error;
});
