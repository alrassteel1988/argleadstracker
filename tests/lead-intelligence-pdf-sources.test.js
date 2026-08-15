const assert = require("assert");
const pdfParse = require("pdf-parse");
const { publicSourcesFromPdfText, renderLeadIntelligencePdf } = require("../src/services/leadIntelligenceService");

const sources = Array.from({ length: 8 }, (_, index) => ({
  id: `src-${index + 1}`,
  title: `[Public source ${index + 1}]`,
  url: `https://citation-${index + 1}.example.com/report`,
  publisher: "Public publisher", source_type: "Tier 1 official", access_date: "2026-08-15"
}));
const report = {
  research_date: "2026-08-15", workflow_version: "test",
  executive_snapshot: { company: "PDF Source Test", company_type: "Test", procurement_accessibility: "Public", best_sales_entry_point: "Procurement", top_opportunity: "Test", steel_demand: "HIGH", buyer_classification: "Direct Buyer" },
  company_profile: {}, buyer_classification: { classification: "Direct Buyer", basis: "Test" },
  project_intelligence: { recently_awarded_projects: [], ongoing_projects: [], previous_relevant_projects: [], announced_upcoming_projects: [] },
  procurement_contacts: [], best_verified_company_contact_channel: "Public",
  structural_steel_opportunity: { steel_demand: "HIGH", likely_required_materials: [], buying_pattern_opportunity: "Test", buying_triggers: [] },
  lead_score: { displayed_score: 7, weighted_score: 7.2, priority: "B", components: [] },
  sales_recommendation: {}, research_quality: { verified_information: [], reasonable_inferences: [], not_publicly_found_unverified: [], confidence_summary: {} }, sources
};

(async () => {
  const extracted = (await pdfParse(renderLeadIntelligencePdf(report))).text;
  const recovered = publicSourcesFromPdfText(extracted);
  assert.strictEqual(recovered.length, 8, "PDF extraction must preserve a numbered Sources list with hyperlink URLs");
  assert.strictEqual(recovered[0].url, sources[0].url);
  assert.strictEqual(recovered[7].url, sources[7].url);
  console.log("PASS lead intelligence PDF sources");
})().catch(error => { console.error(error); process.exitCode = 1; });
