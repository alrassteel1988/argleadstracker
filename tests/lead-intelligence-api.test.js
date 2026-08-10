const assert = require("assert");
const fs = require("fs");
const path = require("path");

const nativeFetch = global.fetch;
const originalExistsSync = fs.existsSync;
const originalReadFileSync = fs.readFileSync;
const dbPath = path.join(__dirname, "..", "data", "db.json");
const dataIntelPath = path.join(__dirname, "..", "data", "lead-intelligence");
const originalDb = fs.existsSync(dbPath) ? fs.readFileSync(dbPath) : null;

fs.rmSync(dbPath, { force: true });
fs.rmSync(dataIntelPath, { recursive: true, force: true });
delete process.env.VERCEL;
process.env.ADMIN_EMAIL = "admin-intel@alrassteel.test";
process.env.ADMIN_BOOTSTRAP_PASSWORD = "AdminPass123!";
process.env.APP_SESSION_SECRET = "lead-intelligence-test-secret";
process.env.RATE_LIMIT_HASH_SECRET = "lead-intelligence-rate-limit-secret-32";
process.env.NEXT_PUBLIC_SUPABASE_URL = "";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.OPENAI_API_KEY = "test-openai-key";
process.env.OPENAI_LEAD_INTELLIGENCE_MODEL = "gpt-4.1-mini";
process.env.ENABLE_LEAD_INTELLIGENCE_AUTO_QUEUE = "true";
process.env.LEAD_INTELLIGENCE_CRON_SECRET = "cron-test-secret";

fs.existsSync = function patchedExistsSync(target) {
  if (String(target).endsWith(`${path.sep}.env`)) return false;
  return originalExistsSync.apply(this, arguments);
};
fs.readFileSync = function patchedReadFileSync(target) {
  if (String(target).endsWith(`${path.sep}.env`)) return "";
  return originalReadFileSync.apply(this, arguments);
};

const server = require("../server");

fs.existsSync = originalExistsSync;
fs.readFileSync = originalReadFileSync;

function providerFixture() {
  return {
    research_date: "2026-08-10",
    executive_snapshot: { company: "API Intelligence Lead LLC", company_type: "Steel contractor", buyer_classification: "Direct Buyer", steel_demand: "HIGH", procurement_accessibility: "General channel", best_sales_entry_point: "Procurement", top_opportunity: "Structural steel supply" },
    company_profile: { company: "API Intelligence Lead LLC", website: "https://example.com", headquarters: "Dubai, UAE", main_activities: ["Steel fabrication"] },
    buyer_classification: { classification: "Direct Buyer", basis: "Public profile." },
    project_intelligence: { recently_awarded_projects: [], ongoing_projects: [], previous_relevant_projects: [], announced_upcoming_projects: [] },
    procurement_contacts: [],
    best_verified_company_contact_channel: "https://example.com/contact",
    structural_steel_opportunity: { steel_demand: "HIGH", likely_required_materials: [{ material: "Structural sections", likelihood: "High", reason_project_link: "Steel fabrication profile", fact_or_inference: "Inference", source_refs: ["src-1"] }], buying_pattern_opportunity: "Project-based buying", buying_triggers: ["UAE fabrication activity"] },
    lead_score: { components: [
      { key: "current_project_activity", score: 8, evidence: "Active profile", source_refs: ["src-1"] },
      { key: "structural_steel_relevance", score: 8, evidence: "Steel focus", source_refs: ["src-1"] },
      { key: "project_scale_volume", score: 7, evidence: "Direct buyer", source_refs: ["src-1"] },
      { key: "procurement_accessibility", score: 4, evidence: "General channel", source_refs: ["src-1"] },
      { key: "uae_activity_presence", score: 9, evidence: "Dubai UAE", source_refs: ["src-1"] },
      { key: "recurring_purchase_likelihood", score: 6, evidence: "One source", source_refs: ["src-1"] }
    ] },
    sales_recommendation: { best_person_department_to_approach: "Procurement", recommended_sales_angle: "Steel availability", known_active_recent_project_to_reference: "Not publicly found", most_relevant_products: ["Structural sections"], suggested_next_action: "Verify procurement contact", suggested_opening_message_angle: "Ask about near-term structural steel requirements" },
    research_quality: { verified_information: [{ statement: "Company profile is public.", source_refs: ["src-1"], confidence: "High" }], reasonable_inferences: [{ statement: "Structural sections may be relevant.", source_refs: ["src-1"], confidence: "Medium" }], not_publicly_found_unverified: [{ statement: "Named procurement contact not publicly found.", source_refs: [], confidence: "Low" }], confidence_summary: { company_identity: "High", company_profile: "High", project_intelligence: "Low", procurement_contacts: "Low", steel_opportunity_assessment: "Medium" } },
    sources: [{ id: "src-1", title: "Official profile", url: "https://example.com", publisher: "Example", source_type: "Tier 1 official", access_date: "2026-08-10" }],
    anti_fabrication_check: { no_guessed_contacts: true, no_unsourced_projects: true, verified_facts_separated_from_inferences: true }
  };
}

let providerMode = "success";
global.fetch = async function mockedFetch(url, options) {
  if (String(url).startsWith("https://api.openai.com/")) {
    if (providerMode === "provider_error") {
      return { ok: false, status: 502, async json() { return { error: { message: "mock provider failure" } }; } };
    }
    const outputText = providerMode === "success" ? JSON.stringify(providerFixture()) : JSON.stringify({ sources: [] });
    return { ok: true, status: 200, async json() { return { id: `resp-${providerMode}`, status: "completed", usage: { input_tokens: 10, output_tokens: 20 }, output: [{ content: [{ type: "output_text", text: outputText }] }] }; } };
  }
  return nativeFetch(url, options);
};

async function request(baseUrl, pathName, { method = "GET", token = "", body, headers = {} } = {}) {
  const response = await nativeFetch(`${baseUrl}${pathName}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual"
  });
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : Buffer.from(await response.arrayBuffer());
  return { response, data };
}

(async () => {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try {
    const adminLogin = await request(baseUrl, "/api/auth/login", { method: "POST", body: { email: "admin-intel@alrassteel.test", password: "AdminPass123!" } });
    assert.equal(adminLogin.response.status, 200, JSON.stringify(adminLogin.data));
    const adminToken = adminLogin.data.token;

    const lead = await request(baseUrl, "/api/leads", { method: "POST", token: adminToken, body: { company_name: "API Intelligence Lead LLC", stage: "PROSPECT", territory: "Dubai", website: "https://example.com", sector: "Steel fabrication" } });
    assert.equal(lead.response.status, 201, JSON.stringify(lead.data));

    const initialIntel = await request(baseUrl, `/api/leads/${lead.data.id}/intel`, { token: adminToken });
    assert.equal(initialIntel.response.status, 200);
    assert.equal(initialIntel.data.active_report.status, "queued");

    const generated = await request(baseUrl, `/api/leads/${lead.data.id}/intelligence/generate`, { method: "POST", token: adminToken });
    assert.equal(generated.response.status, 200, JSON.stringify(generated.data));
    assert.equal(generated.data.code, "completed");
    assert.equal(generated.data.result.status, "completed");

    const completedIntel = await request(baseUrl, `/api/leads/${lead.data.id}/intel`, { token: adminToken });
    assert.equal(completedIntel.data.report.status, "completed");
    assert.equal(completedIntel.data.report.weighted_score, 7.2);
    assert.equal(completedIntel.data.report.priority, "B");
    const currentReportId = completedIntel.data.report.id;

    const pdf = await request(baseUrl, completedIntel.data.report.download_url, { token: adminToken });
    assert.equal(pdf.response.status, 200);
    assert.strictEqual(pdf.data.slice(0, 4).toString(), "%PDF");

    const refresh = await request(baseUrl, `/api/leads/${lead.data.id}/intelligence/refresh`, { method: "POST", token: adminToken });
    assert.equal(refresh.response.status, 200);
    assert.equal(refresh.data.result.status, "completed");
    assert.notEqual(refresh.data.state.report.id, currentReportId, "Successful refresh should immediately replace the current report.");
    const refreshedReportId = refresh.data.state.report.id;

    providerMode = "invalid";
    const lowConfidenceRefresh = await request(baseUrl, `/api/leads/${lead.data.id}/intelligence/refresh`, { method: "POST", token: adminToken });
    assert.equal(lowConfidenceRefresh.response.status, 200, JSON.stringify(lowConfidenceRefresh.data));
    assert.equal(lowConfidenceRefresh.data.result.status, "completed");
    assert.equal(lowConfidenceRefresh.data.state.report.priority, "D");
    assert.equal(lowConfidenceRefresh.data.state.report.summary.sources_count, 1);
    assert.notEqual(lowConfidenceRefresh.data.state.report.id, refreshedReportId, "Low-confidence report should still become the current report.");

    providerMode = "provider_error";
    const failedRefresh = await request(baseUrl, `/api/leads/${lead.data.id}/intelligence/refresh`, { method: "POST", token: adminToken });
    assert.equal(failedRefresh.response.status, 500);
    assert.equal(failedRefresh.data.result.status, "failed");
    const failedState = await request(baseUrl, `/api/leads/${lead.data.id}/intel`, { token: adminToken });
    assert.equal(failedState.data.report.id, lowConfidenceRefresh.data.state.report.id, "Failed refresh must not remove the last successful report.");
    assert.equal(failedState.data.failed_report.status, "failed");

    providerMode = "success";
    const retryProcess = await request(baseUrl, `/api/leads/${lead.data.id}/intelligence/retry`, { method: "POST", token: adminToken, body: { report_id: failedState.data.failed_report.id } });
    assert.equal(retryProcess.response.status, 200, JSON.stringify(retryProcess.data));
    assert.equal(retryProcess.data.result.status, "completed");

    const cronUnauthorized = await request(baseUrl, "/api/cron/process-lead-intelligence", { method: "POST" });
    assert.equal(cronUnauthorized.response.status, 401);
    const cronAuthorized = await request(baseUrl, "/api/cron/process-lead-intelligence", { method: "POST", headers: { Authorization: "Bearer cron-test-secret" }, body: { limit: 1 } });
    assert.equal(cronAuthorized.response.status, 200);
    const cronGetAuthorized = await request(baseUrl, "/api/cron/process-lead-intelligence", { headers: { Authorization: "Bearer cron-test-secret" } });
    assert.equal(cronGetAuthorized.response.status, 200);

    const salesmanAccount = await request(baseUrl, "/api/users", { method: "POST", token: adminToken, body: { name: "Intel Salesman", email: "salesman-intel@alrassteel.test", password: "SalesPass123!", territory: "Abu Dhabi" } });
    assert.equal(salesmanAccount.response.status, 201);
    const salesmanLogin = await request(baseUrl, "/api/auth/login", { method: "POST", body: { email: "salesman-intel@alrassteel.test", password: "SalesPass123!" } });
    assert.equal(salesmanLogin.response.status, 200);
    const forbiddenIntel = await request(baseUrl, `/api/leads/${lead.data.id}/intel`, { token: salesmanLogin.data.token });
    assert.equal(forbiddenIntel.response.status, 404);

    console.log("PASS lead intelligence API");
  } finally {
    await new Promise(resolve => server.close(resolve));
    global.fetch = nativeFetch;
    fs.rmSync(dataIntelPath, { recursive: true, force: true });
    if (originalDb) fs.writeFileSync(dbPath, originalDb);
    else fs.rmSync(dbPath, { force: true });
  }
})().catch(error => {
  global.fetch = nativeFetch;
  if (originalDb) fs.writeFileSync(dbPath, originalDb);
  else fs.rmSync(dbPath, { force: true });
  throw error;
});
