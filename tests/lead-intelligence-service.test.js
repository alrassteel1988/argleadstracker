const assert = require("assert");

const {
  UNKNOWN,
  allowedResearchInputFromLead,
  assertValidLeadIntelligenceReport,
  calculateLeadScore,
  generateLeadIntelligenceWithOpenAI,
  priorityForWeightedScore,
  renderLeadIntelligencePdf
} = require("../src/services/leadIntelligenceService");

function fixtureReport(overrides = {}) {
  return {
    research_date: "2026-08-10",
    executive_snapshot: {
      company: "Test Steel Contracting LLC",
      company_type: "UAE steel fabrication contractor",
      buyer_classification: "Direct Buyer",
      steel_demand: "HIGH",
      procurement_accessibility: "General company channel publicly listed.",
      best_sales_entry_point: "Procurement department",
      top_opportunity: "Structural steel supply for ongoing fabrication work."
    },
    company_profile: {
      company: "Test Steel Contracting LLC",
      established: "2018",
      headquarters: "Dubai, UAE",
      website: "https://example.com",
      telephone: "+97140000000",
      email: "info@example.com",
      contact_page: "https://example.com/contact",
      locations: ["Dubai"],
      parent_group: UNKNOWN,
      company_type: "Steel contractor",
      main_activities: ["Structural steel fabrication"],
      main_products_services: ["Steel structures"],
      industries_served: ["Construction"],
      important_clients: [UNKNOWN]
    },
    buyer_classification: { classification: "Direct Buyer", basis: "Public company profile lists steel fabrication activity." },
    project_intelligence: {
      recently_awarded_projects: [],
      ongoing_projects: [{
        project_name: "Warehouse fabrication package",
        location: "Dubai",
        current_status: "Ongoing",
        client_developer: UNKNOWN,
        main_contractor: UNKNOWN,
        consultant: UNKNOWN,
        company_role: "Steel fabricator",
        award_announcement_date: UNKNOWN,
        evidence_reason: "Company website describes active fabrication services.",
        structural_steel_relevance: "Likely structural sections and plates.",
        source_refs: ["src-1"]
      }],
      previous_relevant_projects: [],
      announced_upcoming_projects: []
    },
    procurement_contacts: [{
      name: UNKNOWN,
      position: "Procurement department",
      business_email: "info@example.com",
      business_telephone: "+97140000000",
      public_professional_source: "Company contact page",
      confidence: "Medium",
      why_relevant: "General company channel only; named contact not publicly verified.",
      source_refs: ["src-1"]
    }],
    best_verified_company_contact_channel: "Company contact page",
    structural_steel_opportunity: {
      steel_demand: "HIGH",
      likely_required_materials: [{ material: "Structural sections", likelihood: "High", reason_project_link: "Fabrication services indicate recurring section demand.", fact_or_inference: "Inference", source_refs: ["src-1"] }],
      buying_pattern_opportunity: "Likely project-based buying through procurement.",
      buying_triggers: ["Active fabrication scope"]
    },
    lead_score: {
      components: [
        { key: "current_project_activity", score: 8, evidence: "Public activity signal", source_refs: ["src-1"] },
        { key: "structural_steel_relevance", score: 8, evidence: "Steel fabrication focus", source_refs: ["src-1"] },
        { key: "project_scale_volume", score: 7, evidence: "Direct steel buyer", source_refs: ["src-1"] },
        { key: "procurement_accessibility", score: 4, evidence: "Only general contact", source_refs: ["src-1"] },
        { key: "uae_activity_presence", score: 9, evidence: "Dubai UAE", source_refs: ["src-1"] },
        { key: "recurring_purchase_likelihood", score: 6, evidence: "One official source", source_refs: ["src-1"] }
      ],
      weighted_score: 1,
      displayed_score: 1,
      priority: "D"
    },
    sales_recommendation: {
      best_person_department_to_approach: "Procurement department",
      recommended_sales_angle: "Reference structural steel availability and fast UAE delivery.",
      known_active_recent_project_to_reference: UNKNOWN,
      most_relevant_products: ["Structural sections"],
      suggested_next_action: "Verify procurement contact before outreach.",
      suggested_opening_message_angle: "Ask whether the team has near-term structural steel requirements."
    },
    research_quality: {
      verified_information: [{ statement: "The company publishes UAE contact details.", source_refs: ["src-1"], confidence: "High" }],
      reasonable_inferences: [{ statement: "Structural sections may be relevant to its fabrication scope.", source_refs: ["src-1"], confidence: "Medium" }],
      not_publicly_found_unverified: [{ statement: "Named procurement manager not publicly found.", source_refs: [], confidence: "Low" }],
      confidence_summary: {
        company_identity: "High",
        company_profile: "High",
        project_intelligence: "Low",
        procurement_contacts: "Low",
        steel_opportunity_assessment: "Medium"
      }
    },
    sources: [{ id: "src-1", title: "Official company contact page", url: "https://example.com/contact", publisher: "Test Steel Contracting LLC", source_type: "Tier 1 official", access_date: "2026-08-10" }],
    anti_fabrication_check: { no_guessed_contacts: true, no_unsourced_projects: true, verified_facts_separated_from_inferences: true },
    ...overrides
  };
}

const score = calculateLeadScore(fixtureReport().lead_score.components);
assert.strictEqual(score.weighted_score, 7.2);
assert.strictEqual(score.displayed_score, 7);
assert.strictEqual(priorityForWeightedScore(score.weighted_score), "B");

const report = assertValidLeadIntelligenceReport(fixtureReport(), { company_name: "Fallback Company" });
assert.strictEqual(report.lead_score.weighted_score, 7.2, "Application code must recompute model arithmetic.");
assert.strictEqual(report.lead_score.priority, "B");
assert.strictEqual(report.procurement_contacts[0].name, UNKNOWN);
assert.strictEqual(report.sources[0].url, "https://example.com/contact");
assert.ok(report.research_quality.verified_information[0].source_refs.includes("src-1"));

assert.throws(() => assertValidLeadIntelligenceReport(fixtureReport({ sources: [] })), /failed validation/);
assert.throws(() => assertValidLeadIntelligenceReport(fixtureReport({ research_quality: { verified_information: [], reasonable_inferences: [], not_publicly_found_unverified: [], confidence_summary: {} } })), /failed validation/);

const allowed = allowedResearchInputFromLead({
  company_name: "Allowed Co",
  country_emirate: "Dubai",
  notes: "confidential commercial note",
  estimated_annual_revenue: "secret"
});
assert.strictEqual(allowed.company_name, "Allowed Co");
assert.ok(!Object.keys(allowed).includes("notes"));
assert.ok(!JSON.stringify(allowed).includes("secret"));

const pdf = renderLeadIntelligencePdf(report, { generatedAt: "2026-08-10T09:00:00.000Z" });
assert.strictEqual(pdf.slice(0, 4).toString(), "%PDF");
assert.ok(pdf.toString("utf8").includes("/Subtype /Link"), "Source URLs should be clickable PDF annotations.");
assert.ok(pdf.toString("utf8").includes("Not publicly found"));

(async () => {
  const providerReportWithInlineUrlOnly = fixtureReport({
    sources: [],
    research_quality: {
      verified_information: [],
      reasonable_inferences: [{ statement: "Structural sections may be relevant.", source_refs: ["src-1"], confidence: "Medium" }],
      not_publicly_found_unverified: [{ statement: "Named procurement manager not publicly found.", source_refs: [], confidence: "Low" }],
      confidence_summary: {
        company_identity: "Medium",
        company_profile: "Medium",
        project_intelligence: "Low",
        procurement_contacts: "Low",
        steel_opportunity_assessment: "Medium"
      }
    }
  });
  const result = await generateLeadIntelligenceWithOpenAI({
    lead: { company_name: "Test Steel Contracting LLC", website: "https://example.com" },
    openAiKey: "test-key",
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      async json() {
        return {
          id: "resp-cited",
          status: "completed",
          output: [{
            content: [{
              type: "output_text",
              text: JSON.stringify(providerReportWithInlineUrlOnly)
            }]
          }]
        };
      }
    })
  });
  assert.strictEqual(result.report.sources[0].url, "https://example.com");
  assert.strictEqual(result.report.sources[0].source_type, "Provider URL field");
  assert.ok(result.report.research_quality.verified_information[0].source_refs.includes("src-1"));

  console.log("PASS lead intelligence service");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
