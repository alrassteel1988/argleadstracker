const assert = require("assert");

const {
  UNKNOWN,
  allowedResearchInputFromLead,
  assertValidLeadIntelligenceReport,
  calculateLeadScore,
  generateLeadIntelligenceWithGemini,
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

const noSourceReport = assertValidLeadIntelligenceReport(fixtureReport({ sources: [] }));
assert.strictEqual(noSourceReport.sources[0].id, "src-unverified-public-research");
assert.strictEqual(noSourceReport.research_quality.verified_information[0].confidence, "Low");
assert.match(noSourceReport.research_quality.verified_information[0].statement, /No independently verified public facts/);
assert.strictEqual(noSourceReport.company_profile.website, UNKNOWN);
assert.strictEqual(noSourceReport.company_profile.telephone, UNKNOWN);
assert.strictEqual(noSourceReport.company_profile.email, UNKNOWN);
assert.strictEqual(noSourceReport.procurement_contacts.length, 0);
assert.strictEqual(noSourceReport.lead_score.displayed_score, 1);

const noVerifiedFactsReport = assertValidLeadIntelligenceReport(fixtureReport({ research_quality: { verified_information: [], reasonable_inferences: [], not_publicly_found_unverified: [], confidence_summary: {} } }));
assert.strictEqual(noVerifiedFactsReport.research_quality.verified_information[0].confidence, "Low");
assert.match(noVerifiedFactsReport.research_quality.verified_information[0].statement, /No independently verified public facts/);

const noCrmFallbackReport = assertValidLeadIntelligenceReport(
  fixtureReport({ company_profile: { company: "Different Steel LLC" } }),
  { company_name: "Different Steel LLC", website: "https://www.steelstockist.com", phone: "04 886 0366", email: "sales@steelstockist.com" }
);
assert.strictEqual(noCrmFallbackReport.company_profile.website, UNKNOWN);
assert.strictEqual(noCrmFallbackReport.company_profile.telephone, UNKNOWN);
assert.strictEqual(noCrmFallbackReport.company_profile.email, UNKNOWN);

const ownerContactLeakReport = assertValidLeadIntelligenceReport(fixtureReport({
  executive_snapshot: { company: "Different Steel LLC" },
  company_profile: {
    company: "Different Steel LLC",
    website: "www.steelstockist.com",
    telephone: "04 886 0366",
    email: "sales@steelstockist.com",
    contact_page: "https://www.steelstockist.com/contact"
  }
}));
assert.strictEqual(ownerContactLeakReport.company_profile.website, UNKNOWN);
assert.strictEqual(ownerContactLeakReport.company_profile.telephone, UNKNOWN);
assert.strictEqual(ownerContactLeakReport.company_profile.email, UNKNOWN);
assert.strictEqual(ownerContactLeakReport.company_profile.contact_page, UNKNOWN);
assert.ok(ownerContactLeakReport.research_quality.not_publicly_found_unverified.some(item => /CRM owner values were removed/.test(item.statement)));

const allowed = allowedResearchInputFromLead({
  company_name: "Allowed Co",
  country_emirate: "Dubai",
  notes: "confidential commercial note",
  estimated_annual_revenue: "secret"
});
assert.strictEqual(allowed.company_name, "Allowed Co");
assert.ok(!Object.keys(allowed).includes("notes"));
assert.ok(!JSON.stringify(allowed).includes("secret"));

const cleanedOwnerContactInput = allowedResearchInputFromLead({
  company_name: "Different Steel LLC",
  website: "https://www.steelstockist.com",
  phone: "04 886 0366",
  email: "sales@steelstockist.com"
});
assert.ok(!Object.prototype.hasOwnProperty.call(cleanedOwnerContactInput, "website"));
assert.ok(!Object.prototype.hasOwnProperty.call(cleanedOwnerContactInput, "telephone"));
assert.ok(!Object.prototype.hasOwnProperty.call(cleanedOwnerContactInput, "general_email"));

const placeholderTemplateReport = assertValidLeadIntelligenceReport(fixtureReport({
  executive_snapshot: { company: "Different Steel LLC" },
  company_profile: {
    company: "Different Steel LLC",
    website: "email",
    email: "email",
    telephone: "phone",
    contact_page: "website"
  },
  procurement_contacts: [{
    name: "email",
    position: "procurement",
    business_email: "email",
    business_telephone: "phone"
  }],
  best_verified_company_contact_channel: "email",
  best_verified_channel: "phone",
  sources: []
}));
assert.strictEqual(placeholderTemplateReport.best_verified_company_contact_channel, UNKNOWN);
assert.strictEqual(placeholderTemplateReport.best_verified_channel, UNKNOWN);
assert.strictEqual(placeholderTemplateReport.named_procurement_contact, UNKNOWN);
assert.ok(!/email|phone|telephone|website/.test(placeholderTemplateReport.best_verified_company_contact_channel || ""));
assert.ok(!placeholderTemplateReport.procurement_contacts.some(contact => [contact.name, contact.business_email, contact.business_telephone].some(value => /email|phone|telephone/.test(String(value || "")))));
assert.ok(!placeholderTemplateReport.research_quality.not_publicly_found_unverified.some(item => /procurement contact claim omitted because it was not tied to a verified source: email/i.test(item.statement)));

const contaminationCheckedReport = assertValidLeadIntelligenceReport(fixtureReport({
  executive_snapshot: { company: "Different Steel LLC" },
  company_profile: {
    company: "Different Steel LLC",
    website: "https://www.steelstockist.com",
    email: "sales@steelstockist.com",
    telephone: "04 886 0366",
    contact_page: "https://www.steelstockist.com/contact"
  },
  sources: [
    { id: "src-contam-1", title: "Owner profile", url: "https://www.steelstockist.com", publisher: "Al Ras Steel", tier: "Tier 1", source_type: "Tier 1 official", access_date: "2026-08-11" },
    { id: "src-contam-2", title: "Owner stock", url: "https://www.alrassteel.com/about", publisher: "Steel Stockist", tier: "Tier 2", source_type: "Tier 2 reference", access_date: "2026-08-11" },
    { id: "src-clean", title: "Third-party project listing", url: "https://www.example.com/project-listing", publisher: "UAE builder directory", tier: "Tier 3", source_type: "Tier 3 supporting", access_date: "2026-08-11" }
  ],
  named_procurement_contact: "Al Ras Steel Procurement",
  procurement_contacts: [{ name: "Al Ras Steel Procurement", business_email: "sales@steelstockist.com", business_telephone: "04 886 0366", source_refs: ["src-clean"] }],
  best_verified_company_contact_channel: "website",
  best_verified_channel: "email",
  research_quality: {
    verified_information: [],
    reasonable_inferences: [],
    not_publicly_found_unverified: []
  }
}));
const leakedText = JSON.stringify(contaminationCheckedReport).toLowerCase();
assert.ok(!/steelstockist|al ras steel|alrassteel|04 886 0366/.test(leakedText));
  assert.ok(contaminationCheckedReport.sources.length >= 1);
  assert.ok(contaminationCheckedReport.sources.every(source => !/steelstockist|al ras steel|alrassteel|04 886 0366/.test(`${source.url} ${source.title} ${source.publisher} ${source.tier} ${source.source_type}`)));
  assert.ok(!/al ras steel|steelstockist|alrassteel|04 886 0366/.test(`${contaminationCheckedReport.named_procurement_contact} ${contaminationCheckedReport.best_verified_company_contact_channel} ${contaminationCheckedReport.procurement_contacts.map(contact => `${contact.name} ${contact.business_email} ${contact.business_telephone}`).join(" ")}`));

const unsourcedContactRetainedReport = assertValidLeadIntelligenceReport(fixtureReport({
  procurement_contacts: [{
    name: "Procurement Team",
    role: "Senior Buyer",
    business_email: "procurement@example.com",
    business_telephone: "+97155000001",
    source_refs: []
  }],
  named_contacts: [{
    name: "Procurement Team",
    role: "Senior Buyer",
    business_email: "procurement@example.com",
    business_telephone: "+97155000001",
    source_refs: []
  }],
  structural_steel_opportunity: {
    materials: [{
      material: "Structural sections",
      likelihood: "High",
      rationale: "Project-level summaries indicate recurring section demand.",
      fact_or_inference: "Inference",
      source_refs: []
    }]
  },
  sources: [{
    id: "src-1",
    title: "Verified source backup",
    url: "https://example-projects.com",
    publisher: "Example Project Source",
    tier: "Tier 2",
    source_type: "Tier 2 supporting",
    access_date: "2026-08-10"
  }]
}));
assert.strictEqual(unsourcedContactRetainedReport.procurement_contacts[0].source_refs[0], "src-1");
assert.strictEqual(unsourcedContactRetainedReport.named_contacts[0].source_refs[0], "src-1");
assert.ok(unsourcedContactRetainedReport.procurement_contacts[0].name === "Procurement Team");
assert.ok(unsourcedContactRetainedReport.structural_steel_opportunity.likely_required_materials[0].source_refs[0] === "src-1");
assert.strictEqual(unsourcedContactRetainedReport.structural_steel_opportunity.likely_required_materials[0].material, "Structural sections");


const pdf = renderLeadIntelligencePdf(report, { generatedAt: "2026-08-10T09:00:00.000Z" });
assert.strictEqual(pdf.slice(0, 4).toString(), "%PDF");
assert.ok(pdf.toString("utf8").includes("/Subtype /Link"), "Source URLs should be clickable PDF annotations.");
const pdfText = pdf.toString("utf8");
assert.ok(pdfText.includes("Not publicly found"));
assert.ok(pdfText.includes("Buyer Classification"));
assert.ok(pdfText.includes("Lead Score Sales Plan"));
assert.ok(pdfText.includes("Anti-Fabrication Checks"));
assert.ok(pdfText.includes("Named Contacts"));

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
            }, {
              type: "url_citation",
              url: "https://example.com",
              title: "Official company website"
            }]
          }]
        };
      }
    })
  });
  assert.strictEqual(result.report.sources[0].url, "https://example.com");
  assert.strictEqual(result.report.sources[0].source_type, "Web citation");
  assert.ok(result.report.research_quality.verified_information[0].source_refs.includes("src-1"));

  await assert.rejects(
    generateLeadIntelligenceWithOpenAI({
      lead: { company_name: "OpenAI Parse Fail LLC", website: "https://example.com" },
      openAiKey: "test-key",
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        async json() {
          return {
            id: "resp-bad-json",
            status: "completed",
            output: [{ content: [{ type: "output_text", text: "{\"research_date\":\"2026-08-10\",\"executive_snapshot\":{\"company\":\"OpenAI Parse Fail LLC\" \"company_type\":\"Steel contractor\"}}" }] }]
          };
        }
      })
    }),
    error => error.code === "provider_json_parse_failed"
  );

  const stepSources = {
    A1: { url: "https://alpha.example.com/company-profile", title: "A1 identity profile" },
    A2: { url: "https://alpha.example.com/structural-steel", title: "A2 structural relevance" },
    A3: { url: "https://alpha.example.com/projects", title: "A3 project activity" },
    A4: { url: "https://alpha.example.com/contacts", title: "A4 procurement contacts" },
    A5: { url: "https://alpha.example.com/materials", title: "A5 materials and scoring" }
  };
  const detectStepId = input => {
    const match = String(input || "").match(/\((A[1-5])\)/i);
    return match?.[1]?.toUpperCase() || "A1";
  };
  const geminiResearchStepPayload = stepId => ({
    id: `gemini-research-${stepId.toLowerCase()}`,
    status: "completed",
    output_text: `## ${stepId} brief\nVerified details for ${stepId}.`,
    steps: [{
      type: "model_output",
      content: [{
        type: "text",
        text: `Verified Information\n- Verified facts for ${stepId}. Source: ${stepSources[stepId].url}`,
        annotations: [{
          type: "url_citation",
          url: stepSources[stepId].url,
          title: stepSources[stepId].title,
          start_index: 0,
          end_index: 16
        }]
      }]
    }]
  });
  let geminiCalls = 0;
  const multiStepGeminiResult = await generateLeadIntelligenceWithGemini({
    lead: { company_name: "Test Steel Contracting LLC" },
    geminiApiKey: "test-gemini-key",
    model: "gemini-3.6-flash",
    fetchImpl: async (url, options) => {
      geminiCalls += 1;
      assert.strictEqual(url, "https://generativelanguage.googleapis.com/v1beta/interactions");
      assert.strictEqual(options.headers["x-goog-api-key"], "test-gemini-key");
      assert.strictEqual(options.headers["Api-Revision"], "2026-05-20");
      const body = JSON.parse(options.body);
      assert.strictEqual(body.model, "gemini-3.6-flash");
      assert.strictEqual(body.max_output_tokens, 8192);
      if (body.tools && body.tools.length) {
        assert.deepStrictEqual(body.tools, [{ type: "google_search" }]);
        assert.ok(!body.response_format, "Grounded research calls must not force JSON mode.");
        const stepId = detectStepId(body.input);
        return {
          ok: true,
          status: 200,
          async json() { return geminiResearchStepPayload(stepId); }
        };
      }
      assert.ok(!body.tools, "Formatting call must not perform a second web search.");
      assert.strictEqual(body.response_format.mime_type, "application/json");
      assert.match(body.input, /RESEARCH BRIEF/);
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            id: "gemini-formatted",
            status: "completed",
            output_text: JSON.stringify(providerReportWithInlineUrlOnly)
          };
        }
      };
    }
  });
  assert.strictEqual(geminiCalls, 6);
  assert.strictEqual(multiStepGeminiResult.metadata.provider, "gemini");
  assert.strictEqual(multiStepGeminiResult.report.sources[0].source_type, "Gemini Google Search citation");
  assert.strictEqual(multiStepGeminiResult.metadata.model, "gemini-3.6-flash");
  assert.strictEqual(multiStepGeminiResult.metadata.call_a_step_results.length, 5);
  assert.ok(multiStepGeminiResult.metadata.call_a_step_results.every(step => Array.isArray(step.query_plan) && step.query_plan.length));
  assert.ok(multiStepGeminiResult.metadata.call_a_raw_outputs.includes("## Identity & profile"));
  assert.ok(multiStepGeminiResult.metadata.call_a_raw_outputs.includes("## Structural-steel relevance"));
  assert.ok(multiStepGeminiResult.metadata.call_a_raw_outputs.includes("## Project activity"));
  assert.ok(multiStepGeminiResult.metadata.call_a_raw_outputs.includes("## Procurement contacts"));
  assert.ok(multiStepGeminiResult.metadata.call_a_raw_outputs.includes("## Materials & scoring"));
  assert.deepStrictEqual(
    multiStepGeminiResult.metadata.call_a_step_results.map(step => step.step_id),
    ["A1", "A2", "A3", "A4", "A5"]
  );

  const secondRunGeminiResult = await generateLeadIntelligenceWithGemini({
    lead: { company_name: "Test Steel Contracting LLC" },
    geminiApiKey: "test-gemini-key",
    model: "gemini-3.6-flash",
    fetchImpl: async (url, options) => {
      const body = JSON.parse(options.body);
      if (body.tools && body.tools.length) {
        const stepId = detectStepId(body.input);
        return { ok: true, status: 200, async json() { return geminiResearchStepPayload(stepId); } };
      }
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            id: "gemini-formatted-repeat",
            status: "completed",
            output_text: JSON.stringify(providerReportWithInlineUrlOnly)
          };
        }
      };
    }
  });
  assert.deepStrictEqual(
    multiStepGeminiResult.report.sources.map(source => source.url),
    secondRunGeminiResult.report.sources.map(source => source.url)
  );
  assert.deepStrictEqual(
    multiStepGeminiResult.report.research_quality.verified_information.map(item => item.statement),
    secondRunGeminiResult.report.research_quality.verified_information.map(item => item.statement)
  );

  let repairCalls = 0;
  const geminiRepairResult = await generateLeadIntelligenceWithGemini({
    lead: { company_name: "Test Steel Contracting LLC" },
    geminiApiKey: "test-gemini-key",
    model: "gemini-3.6-flash",
    fetchImpl: async (_url, options) => {
      repairCalls += 1;
      const body = JSON.parse(options.body);
      if (body.tools && body.tools.length) {
        assert.deepStrictEqual(body.tools, [{ type: "google_search" }]);
        const stepId = detectStepId(body.input);
        return {
          ok: true,
          status: 200,
          async json() {
            return { id: `gemini-research-${stepId.toLowerCase()}`, status: "completed", ...geminiResearchStepPayload(stepId) };
          }
        };
      }
      assert.ok(!body.tools, "JSON repair must not perform a second web search.");
      assert.strictEqual(body.response_format.mime_type, "application/json");
      if (body.input.includes("Repair this malformed JSON")) {
        return {
          ok: true,
          status: 200,
          async json() {
            return { id: "gemini-repaired", output_text: JSON.stringify(providerReportWithInlineUrlOnly) };
          }
        };
      }
      return {
        ok: true,
        status: 200,
        async json() {
          return { id: "gemini-malformed-format", output_text: `{"research_date":"2026-08-10","executive_snapshot":{"company":"Test Steel Contracting LLC" "company_type":"Steel contractor"}}` };
        }
      };
    }
  });
  assert.strictEqual(repairCalls, 7);
  assert.strictEqual(geminiRepairResult.report.sources[0].source_type, "Gemini Google Search citation");

  let noSourceCalls = 0;
  await assert.rejects(
    generateLeadIntelligenceWithGemini({
      lead: { company_name: "No Source LLC" },
      geminiApiKey: "test-gemini-key",
      fetchImpl: async (_url, options) => {
        noSourceCalls += 1;
        const body = JSON.parse(options.body);
        if (body.tools && body.tools.length) {
          return {
            ok: true,
            status: 200,
            async json() {
              return { id: "gemini-no-source", output_text: "No grounded sources found." };
            }
          };
        }
        return {
          ok: true,
          status: 200,
          async json() {
            return { id: "gemini-no-source-format", output_text: JSON.stringify(providerReportWithInlineUrlOnly) };
          }
        };
      }
    }),
    error => error.code === "provider_no_grounding_sources"
  );
  assert.strictEqual(noSourceCalls, 5);

  let retryFailureCalls = 0;
  await assert.rejects(
    generateLeadIntelligenceWithGemini({
      lead: { company_name: "Retry Failure LLC" },
      geminiApiKey: "test-gemini-key",
      fetchImpl: async (_url, options) => {
        retryFailureCalls += 1;
        const body = JSON.parse(options.body);
        if (body.tools && body.tools.length) {
          assert.deepStrictEqual(body.tools, [{ type: "google_search" }]);
          const stepId = detectStepId(body.input);
          return {
            ok: true,
            status: 200,
            async json() {
              return {
                id: `research-${stepId.toLowerCase()}`,
                output_text: `Research brief with source ${stepSources[stepId].url}`,
                steps: [{ type: "model_output", content: [{ type: "text", text: "Research brief", annotations: [{ type: "url_citation", url: stepSources[stepId].url, title: stepSources[stepId].title }] }] }]
              };
            }
          };
        }
        if (body.input.includes("Repair this malformed JSON")) assert.match(body.input, /Repair this malformed JSON/);
        return { ok: true, status: 200, async json() { return { id: `bad-${retryFailureCalls}`, output_text: "{bad json" }; } };
      }
    }),
    error => error.code === "provider_json_parse_failed" && /retry/.test(error.provider_metadata.parse_errors.join(" "))
  );
  assert.strictEqual(retryFailureCalls, 8);

  console.log("PASS lead intelligence service");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
