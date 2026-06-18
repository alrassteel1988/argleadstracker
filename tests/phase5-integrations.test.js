const assert = require("assert");
const { validateQuotationRef } = require("../src/services/erpService");
const { linkedInPeopleSearchUrl, titleOptions } = require("../src/services/linkedinService");
const {
  heatMapFromIntel,
  matchIntelligenceToLeads,
  normalizeIntelItem
} = require("../src/services/marketIntelService");

async function run(name, test) {
  try {
    await test();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

(async () => {
  await run("ERP stub validates non-empty quotation refs", async () => {
    assert.strictEqual((await validateQuotationRef("QT-2026-001")).valid, true);
    assert.strictEqual((await validateQuotationRef("")).valid, false);
  });

  await run("LinkedIn URL uses company and selected title", async () => {
    const url = linkedInPeopleSearchUrl("Al Ras Steel", "Project Manager");
    assert.ok(url.includes("linkedin.com/search/results/people"));
    assert.ok(decodeURIComponent(url).includes("Al Ras Steel project manager"));
    assert.strictEqual(titleOptions().length, 8);
  });

  await run("market intelligence matches by sector and geography", async () => {
    const item = normalizeIntelItem({
      title: "Marine fabrication award in Bahrain",
      url: "https://example.com/intel",
      sector_tags: ["Marine"],
      geography_tags: ["Bahrain"]
    });
    const [matched] = matchIntelligenceToLeads([item], [{
      id: "lead-1",
      company_name: "Bahrain Marine Fabrication",
      sector: "Marine",
      territory: "Bahrain"
    }]);
    assert.deepStrictEqual(matched.matched_company_ids, ["lead-1"]);
    assert.strictEqual(matched.relevance_score, 0.8);
  });

  await run("market intelligence heat map uses 30-day geography counts", async () => {
    const heat = heatMapFromIntel([
      normalizeIntelItem({ title: "Dubai tender", geography_tags: ["Dubai"], published_at: new Date().toISOString() })
    ]);
    assert.strictEqual(heat[0].name, "Dubai");
    assert.strictEqual(heat[0].count, 1);
  });
})();
