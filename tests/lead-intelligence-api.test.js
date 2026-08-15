const assert = require("assert");
const fs = require("fs");
const path = require("path");

const nativeFetch = global.fetch;
const originalExistsSync = fs.existsSync;
const originalReadFileSync = fs.readFileSync;
const serverSource = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
const leadIntelligencePdfRoute = serverSource.slice(
  serverSource.indexOf("const leadIntelligencePdfMatch"),
  serverSource.indexOf('if (req.method === "POST" && url.pathname === "/api/admin/lead-intelligence/process")')
);
const leadIntelStateRoute = serverSource.slice(
  serverSource.indexOf("const leadIntelMatch"),
  serverSource.indexOf("const leadIntelligenceUploadMatch")
);
const leadSummaryBundleSource = serverSource.slice(
  serverSource.indexOf("async function buildLeadSummaryBundle"),
  serverSource.indexOf("function leadSummaryFingerprint")
);
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

assert.match(leadIntelligencePdfRoute, /const storageResponse = await fetch\(signedUrl[,)]/, "Supabase PDFs must be fetched server-side through the authorized app route");
assert.ok(!/res\.writeHead\(302,\s*\{\s*Location:\s*signedUrl/.test(leadIntelligencePdfRoute), "The app must not redirect browsers to signed Supabase PDF URLs");
assert.ok(leadIntelligencePdfRoute.includes("|| currentReport;"), "stale PDF route references must fall back to the authorized lead's current completed report");
assert.ok(serverSource.includes("function leadIntelligencePdfStorageKeys(report)"), "PDF delivery must try legacy and canonical storage keys");
assert.ok(serverSource.includes("function currentCompletedLeadIntelligenceReport(reports)"), "the current completed report lookup must ignore legacy string false values");
assert.ok(!/market_intelligence|fetchMarketIntelligence|zawya/i.test(leadIntelStateRoute), "the Intel tab state endpoint must not fetch Zawya-backed market intelligence");
assert.ok(!/fetchMarketIntelligence|zawya/i.test(leadSummaryBundleSource), "Refresh AI Summary must not make a live Zawya request; it uses stored PDF intelligence instead");

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
    const serializedRequest = String(options?.body || "");
    const leadCompany = (serializedRequest.match(/\\"company_name\\":\\"([^\\"]+)/)?.[1]
      || serializedRequest.match(/"company_name":"([^"]+)/)?.[1]
      || "API Intelligence Lead LLC");
    const providerReport = providerMode === "second_lead" ? {
      ...providerFixture(),
      executive_snapshot: { ...providerFixture().executive_snapshot, company: "Second Intelligence Lead LLC", top_opportunity: "Second lead structural steel package" },
      company_profile: { ...providerFixture().company_profile, company: "Second Intelligence Lead LLC", website: "https://second.example.com" }
    } : {
      ...providerFixture(),
      executive_snapshot: { ...providerFixture().executive_snapshot, company: leadCompany },
      company_profile: { ...providerFixture().company_profile, company: leadCompany }
    };
    const validJson = JSON.stringify(providerReport);
    const outputText = (providerMode === "success" || providerMode === "second_lead") ? validJson
      : providerMode === "repairable_json" ? `Here is the reconstructed report:\n\n\`\`\`json\n${validJson.replace(',"executive_snapshot"', ' "executive_snapshot"').replace(/}$/, ',}')}\n\`\`\``
      : providerMode === "repairable_array_json" ? validJson.replace('["Steel fabrication"]', '["Steel fabrication" "Structural steel supply"]')
      : providerMode === "pdf_missing_validation_evidence" ? JSON.stringify({ ...providerFixture(), sources: [], research_quality: { ...providerFixture().research_quality, verified_information: [] } })
      : providerMode === "repairable_newline_json" ? validJson.replace("Structural steel supply", "Structural steel\nsupply")
      : providerMode === "malformed_json" ? '{"research_date":"2026-08-10","executive_snapshot":'
      : JSON.stringify({ sources: [] });
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

async function requestPdf(baseUrl, pathName, token, text) {
  const pdf = Buffer.from(`%PDF-1.4\n1 0 obj\n<<>>\nendobj\n2 0 obj\n<< /Length ${text.length + 30} >>\nstream\nBT /F1 12 Tf 72 720 Td (${text}) Tj ET\nendstream\nendobj\ntrailer <<>>\n%%EOF`);
  const response = await nativeFetch(`${baseUrl}${pathName}`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/pdf", "X-File-Name": "uploaded-intel.pdf" }, body: pdf });
  return { response, data: await response.json(), pdf };
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
    assert.ok(!Object.hasOwn(initialIntel.data, "market_items"), "the Intel tab API must not fetch or expose the Zawya-backed market feed");

    const generated = await request(baseUrl, `/api/leads/${lead.data.id}/intelligence/generate`, { method: "POST", token: adminToken });
    assert.equal(generated.response.status, 200, JSON.stringify(generated.data));
    assert.equal(generated.data.code, "completed");
    assert.equal(generated.data.result.status, "completed");

    const completedIntel = await request(baseUrl, `/api/leads/${lead.data.id}/intel`, { token: adminToken });
    assert.equal(completedIntel.data.report.status, "completed");
    assert.equal(completedIntel.data.report.weighted_score, 7.2);
    assert.equal(completedIntel.data.report.priority, "B");
    const currentReportId = completedIntel.data.report.id;

    const uploaded = await requestPdf(baseUrl, `/api/leads/${lead.data.id}/intelligence/upload`, adminToken, `
      [PDF PAGE 1]
      API Intelligence Lead LLC
      Lead Score: 7/10 | Priority: C | Steel Demand: MEDIUM | Classification: DIRECT BUYER
      Auditable Lead Score
      Weighted Lead Score: 6.4/10
      Lead Priority: Priority B - worthwhile active prospect
      Confidence Summary
      Company identity: High
      Steel opportunity: Medium
    `);
    assert.equal(uploaded.response.status, 200, JSON.stringify(uploaded.data));
    assert.equal(uploaded.data.report.status, "completed");
    assert.equal(uploaded.data.report.is_current, true, "uploaded report must be marked current");
    assert.ok(uploaded.data.report.pdf_available, "uploaded report must persist a PDF storage reference");
    assert.ok(uploaded.data.report.report.executive_snapshot, "uploaded extraction must be saved in report_json");
    const reextracted = await request(baseUrl, `/api/leads/${lead.data.id}/intelligence/refresh`, { method: "POST", token: adminToken });
    assert.equal(reextracted.response.status, 200, JSON.stringify(reextracted.data));
    assert.equal(reextracted.data.result.mode, "pdf_section_reextraction", "Refresh Intelligence must re-extract uploaded PDF card fields instead of generating a new report");
    assert.deepEqual(reextracted.data.report.report.intel_card, {
      score_display: 7,
      priority: "B",
      steel_demand: "MEDIUM",
      buyer_classification: "DIRECT BUYER",
      steel_opportunity_confidence: "Medium",
      provenance: "pdf_section_targeted"
    }, "Refresh Intelligence must use the requested PDF sections for every Intel card field");
    const immediateUploadedPdf = await request(baseUrl, uploaded.data.report.pdf_url, { token: adminToken });
    assert.equal(immediateUploadedPdf.response.status, 200, "a freshly uploaded PDF must be viewable immediately through the protected stream");
    assert.equal(immediateUploadedPdf.data.subarray(0, 5).toString("utf8"), "%PDF-", "the immediate protected stream must return the uploaded PDF bytes");
    assert.deepEqual(immediateUploadedPdf.data, uploaded.pdf, "the protected viewer must return the exact PDF uploaded for this lead");
    const uploadedIntel = await request(baseUrl, `/api/leads/${lead.data.id}/intel`, { token: adminToken });
    assert.equal(uploadedIntel.data.report.id, uploaded.data.report.id);
    assert.equal(uploadedIntel.data.report.status, "completed", "Intel reload must return the saved completed upload");
    assert.ok(uploadedIntel.data.report.report.sales_recommendation, "Intel tab payload must expose saved extracted fields");
    assert.notEqual(uploadedIntel.data.report.id, currentReportId, "upload must replace the current intelligence report");
    const anonymousPdf = await request(baseUrl, uploaded.data.report.download_url);
    assert.equal(anonymousPdf.response.status, 401, "PDF delivery must remain protected without a bearer token");

    const secondLead = await request(baseUrl, "/api/leads", {
      method: "POST", token: adminToken,
      body: { company_name: "Second Intelligence Lead LLC", stage: "PROSPECT", territory: "Dubai", website: "https://second.example.com", sector: "Steel fabrication" }
    });
    assert.equal(secondLead.response.status, 201, JSON.stringify(secondLead.data));
    providerMode = "second_lead";
    const secondUpload = await requestPdf(baseUrl, `/api/leads/${secondLead.data.id}/intelligence/upload`, adminToken, "Second Intelligence Lead LLC has a distinct structural steel package.");
    assert.equal(secondUpload.response.status, 200, JSON.stringify(secondUpload.data));
    providerMode = "success";
    const [firstLeadPdf, secondLeadPdf, firstLeadDownload, secondLeadDownload] = await Promise.all([
      request(baseUrl, uploaded.data.report.pdf_url, { token: adminToken }),
      request(baseUrl, secondUpload.data.report.pdf_url, { token: adminToken }),
      request(baseUrl, uploaded.data.report.download_url, { token: adminToken }),
      request(baseUrl, secondUpload.data.report.download_url, { token: adminToken })
    ]);
    for (const response of [firstLeadPdf, secondLeadPdf, firstLeadDownload, secondLeadDownload]) {
      assert.equal(response.response.status, 200, "each lead's viewer and download route must resolve its own uploaded PDF");
    }
    assert.deepEqual(firstLeadPdf.data, uploaded.pdf, "first lead viewer must not serve the second lead's PDF");
    assert.deepEqual(firstLeadDownload.data, uploaded.pdf, "first lead download must not serve the second lead's PDF");
    assert.deepEqual(secondLeadPdf.data, secondUpload.pdf, "second lead viewer must not serve the first lead's PDF");
    assert.deepEqual(secondLeadDownload.data, secondUpload.pdf, "second lead download must not serve the first lead's PDF");
    assert.notDeepEqual(firstLeadPdf.data, secondLeadPdf.data, "two distinct uploads must never share stored PDF bytes");
    const [firstLeadSummary, secondLeadSummary] = await Promise.all([
      request(baseUrl, "/api/ai/lead-summary", { method: "POST", token: adminToken, body: { leadId: lead.data.id } }),
      request(baseUrl, "/api/ai/lead-summary", { method: "POST", token: adminToken, body: { leadId: secondLead.data.id } })
    ]);
    assert.equal(firstLeadSummary.response.status, 200, JSON.stringify(firstLeadSummary.data));
    assert.equal(secondLeadSummary.response.status, 200, JSON.stringify(secondLeadSummary.data));
    assert.match(firstLeadSummary.data.summary.current_lead_status, /API Intelligence Lead LLC/, "first lead summary must use only its own uploaded PDF intelligence");
    assert.match(secondLeadSummary.data.summary.current_lead_status, /Second Intelligence Lead LLC/, "second lead summary must use only its own uploaded PDF intelligence");
    const [firstLeadIntel, secondLeadIntel] = await Promise.all([
      request(baseUrl, `/api/leads/${lead.data.id}/intel`, { token: adminToken }),
      request(baseUrl, `/api/leads/${secondLead.data.id}/intel`, { token: adminToken })
    ]);
    assert.equal(firstLeadIntel.data.report.lead_id, lead.data.id, "first lead Intel must remain scoped to its lead id");
    assert.equal(secondLeadIntel.data.report.lead_id, secondLead.data.id, "second lead Intel must remain scoped to its lead id");
    assert.equal(firstLeadIntel.data.report.report.company_profile.company, "API Intelligence Lead LLC", "first lead must not show the second PDF report");
    assert.equal(secondLeadIntel.data.report.report.company_profile.company, "Second Intelligence Lead LLC", "second lead must show only its own PDF report");
    assert.notEqual(firstLeadIntel.data.report.id, secondLeadIntel.data.report.id, "two lead uploads must never share a report row");
    providerMode = "second_lead";
    const mismatchedUpload = await requestPdf(baseUrl, `/api/leads/${lead.data.id}/intelligence/upload`, adminToken, "Second Intelligence Lead LLC PDF submitted to the wrong lead.");
    assert.equal(mismatchedUpload.response.status, 422, "a PDF identifying another company must not be stored against this lead");
    assert.match(mismatchedUpload.data.error || "", /appears to describe/i);
    providerMode = "success";

    providerMode = "pdf_missing_validation_evidence";
    const evidenceFallbackUpload = await requestPdf(baseUrl, `/api/leads/${lead.data.id}/intelligence/upload`, adminToken, "PDF without web citations.");
    assert.equal(evidenceFallbackUpload.response.status, 500, JSON.stringify(evidenceFallbackUpload.data));
    assert.ok(evidenceFallbackUpload.data.details.includes("At least one public source is required."), "a source-less PDF must not bypass public-source validation");
    providerMode = "success";

    const queuedPdfLead = await request(baseUrl, "/api/leads", {
      method: "POST", token: adminToken,
      body: { company_name: "Queued PDF Intelligence Lead LLC", stage: "PROSPECT", territory: "Dubai" }
    });
    assert.equal(queuedPdfLead.response.status, 201, JSON.stringify(queuedPdfLead.data));
    const queuedBeforePdfUpload = await request(baseUrl, `/api/leads/${queuedPdfLead.data.id}/intel`, { token: adminToken });
    assert.equal(queuedBeforePdfUpload.data.active_report.status, "queued");
    const queuedPdfUpload = await requestPdf(baseUrl, `/api/leads/${queuedPdfLead.data.id}/intelligence/upload`, adminToken, "Queued PDF Intelligence Lead LLC structural steel opportunity.");
    assert.equal(queuedPdfUpload.response.status, 200, JSON.stringify(queuedPdfUpload.data));
    assert.equal(queuedPdfUpload.data.report.status, "completed");
    assert.equal(queuedPdfUpload.data.state.active_report, null, "successful PDF upload must retire the older queued job");
    assert.equal(queuedPdfUpload.data.state.report.id, queuedPdfUpload.data.report.id, "uploaded PDF report must be current");
    assert.equal(queuedPdfUpload.data.state.failed_report, null, "a completed PDF upload must not surface its retired queue as a failure");

    const failedPdfLead = await request(baseUrl, "/api/leads", {
      method: "POST", token: adminToken,
      body: { company_name: "Failed PDF Intelligence Lead LLC", stage: "PROSPECT", territory: "Dubai" }
    });
    assert.equal(failedPdfLead.response.status, 201, JSON.stringify(failedPdfLead.data));
    providerMode = "malformed_json";
    const failedQueuedPdfUpload = await requestPdf(baseUrl, `/api/leads/${failedPdfLead.data.id}/intelligence/upload`, adminToken, "Failed PDF Intelligence Lead LLC.");
    assert.equal(failedQueuedPdfUpload.response.status, 422, JSON.stringify(failedQueuedPdfUpload.data));
    const failedQueuedPdfState = await request(baseUrl, `/api/leads/${failedPdfLead.data.id}/intel`, { token: adminToken });
    assert.equal(failedQueuedPdfState.data.active_report, null, "failed PDF parsing must not leave the initial job queued");
    assert.equal(failedQueuedPdfState.data.failed_report.status, "failed");
    assert.match(failedQueuedPdfState.data.failed_report.error_message, /malformed JSON.*could not be safely repaired/i);
    providerMode = "success";

    const adminReplacement = await requestPdf(baseUrl, `/api/leads/${lead.data.id}/intelligence/upload`, adminToken, "Replacement API Intelligence Lead LLC PDF with procurement and structural steel details.");
    assert.equal(adminReplacement.response.status, 200, JSON.stringify(adminReplacement.data));
    assert.equal(adminReplacement.data.replaced_report_id, uploaded.data.report.id, "admin upload must replace the last successful PDF");

    providerMode = "repairable_json";
    const repairedUpload = await requestPdf(baseUrl, `/api/leads/${lead.data.id}/intelligence/upload`, adminToken, "Repairable JSON intelligence PDF.");
    assert.equal(repairedUpload.response.status, 200, JSON.stringify(repairedUpload.data));
    assert.ok(repairedUpload.data.report.report.executive_snapshot, "safe JSON repair must populate the Intel Card report");
    assert.ok(repairedUpload.data.state.report.report.sales_recommendation, "Intel Card state must use the repaired PDF report");
    providerMode = "success";
    const repairedSummary = await request(baseUrl, "/api/ai/lead-summary", { method: "POST", token: adminToken, body: { leadId: lead.data.id } });
    assert.equal(repairedSummary.response.status, 200, JSON.stringify(repairedSummary.data));
    assert.match(repairedSummary.data.summary.market_intelligence, /Structural steel supply/, "Lead Overview summary must use repaired PDF intelligence context");
    assert.match(repairedSummary.data.summary.current_lead_status, /Steel fabrication/, "Lead Overview current status must include the uploaded PDF company profile");
    assert.match(repairedSummary.data.summary.recommended_next_action, /Verify procurement contact/, "Lead Overview next action must fall back to the uploaded PDF recommendation");
    const repairedReportId = repairedUpload.data.report.id;

    providerMode = "repairable_array_json";
    const repairedArrayUpload = await requestPdf(baseUrl, `/api/leads/${lead.data.id}/intelligence/upload`, adminToken, "PDF with missing array JSON comma.");
    assert.equal(repairedArrayUpload.response.status, 200, JSON.stringify(repairedArrayUpload.data));
    assert.deepEqual(repairedArrayUpload.data.report.report.company_profile.main_activities, ["Steel fabrication", "Structural steel supply"], "safe JSON repair must restore missing commas between model array values");
    providerMode = "success";

    providerMode = "repairable_newline_json";
    const repairedNewlineUpload = await requestPdf(baseUrl, `/api/leads/${lead.data.id}/intelligence/upload`, adminToken, "PDF with a model JSON line-break defect.");
    assert.equal(repairedNewlineUpload.response.status, 200, JSON.stringify(repairedNewlineUpload.data));
    assert.match(repairedNewlineUpload.data.report.report.executive_snapshot.top_opportunity, /Structural steel\s+supply/, "safe JSON repair must preserve a line break within a model string");
    providerMode = "success";
    const repairedNewlineReportId = repairedNewlineUpload.data.report.id;

    providerMode = "malformed_json";
    const malformedUpload = await requestPdf(baseUrl, `/api/leads/${lead.data.id}/intelligence/upload`, adminToken, "Unrepairable JSON intelligence PDF.");
    assert.equal(malformedUpload.response.status, 422, JSON.stringify(malformedUpload.data));
    assert.match(malformedUpload.data.error, /malformed JSON.*could not be safely repaired/i);
    const afterMalformedUpload = await request(baseUrl, `/api/leads/${lead.data.id}/intel`, { token: adminToken });
    assert.equal(afterMalformedUpload.data.report.id, repairedNewlineReportId, "failed PDF JSON validation must preserve the saved current report");
    providerMode = "success";

    const pdf = await request(baseUrl, completedIntel.data.report.download_url, { token: adminToken });
    assert.equal(pdf.response.status, 200);
    assert.strictEqual(pdf.data.slice(0, 4).toString(), "%PDF");
    const legacyFilenamePdf = await request(baseUrl, `/api/leads/${lead.data.id}/intelligence/pdf/${encodeURIComponent(`${completedIntel.data.report.id}.pdf`)}`, { token: adminToken });
    assert.equal(legacyFilenamePdf.response.status, 200, "legacy PDF filename routes must resolve to the lead's current completed report");
    assert.strictEqual(legacyFilenamePdf.data.slice(0, 4).toString(), "%PDF");
    const staleHyphenatedPdf = await request(baseUrl, `/api/leads/${lead.data.id}/intelligence/pdf/legacy-upload-name-with-hyphens`, { token: adminToken });
    assert.equal(staleHyphenatedPdf.response.status, 200, "hyphenated stale PDF route references must resolve to the current completed report");
    assert.strictEqual(staleHyphenatedPdf.data.slice(0, 4).toString(), "%PDF");
    fs.rmSync(path.join(dataIntelPath, lead.data.id, `${completedIntel.data.report.id}.pdf`), { force: true });
    const missingPdfFile = await request(baseUrl, completedIntel.data.report.download_url, { token: adminToken });
    assert.equal(missingPdfFile.response.status, 404);
    assert.equal(missingPdfFile.data.error, "PDF file not found, please re-upload.");

    const refresh = await request(baseUrl, `/api/leads/${lead.data.id}/intelligence/refresh`, { method: "POST", token: adminToken });
    assert.equal(refresh.response.status, 200);
    assert.equal(refresh.data.result.status, "completed");
    assert.equal(refresh.data.result.mode, "pdf_section_reextraction", "Refresh must re-extract the current uploaded PDF rather than replace it with a generic report.");
    const refreshedReportId = refresh.data.state.report.id;

    providerMode = "invalid";
    const repeatRefresh = await request(baseUrl, `/api/leads/${lead.data.id}/intelligence/refresh`, { method: "POST", token: adminToken });
    assert.equal(repeatRefresh.response.status, 200);
    assert.equal(repeatRefresh.data.state.report.id, refreshedReportId, "PDF re-extraction must keep the same report instead of creating a cross-source replacement.");
    providerMode = "success";

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
    const salesmanToken = salesmanLogin.data.token;
    const salesmanLead = await request(baseUrl, "/api/leads", {
      method: "POST",
      token: salesmanToken,
      body: { company_name: "Salesman Intelligence Lead LLC", stage: "PROSPECT", territory: "Abu Dhabi" }
    });
    assert.equal(salesmanLead.response.status, 201, JSON.stringify(salesmanLead.data));
    assert.equal(salesmanLead.data.assigned_to, salesmanAccount.data.id, "salesman-created lead must retain current assignment");

    const salesmanUpload = await requestPdf(baseUrl, `/api/leads/${salesmanLead.data.id}/intelligence/upload`, salesmanToken, "Salesman Intelligence Lead LLC uploaded PDF describing a structural steel opportunity.");
    assert.equal(salesmanUpload.response.status, 200, JSON.stringify(salesmanUpload.data));
    assert.equal(salesmanUpload.data.report.status, "completed");
    assert.ok(salesmanUpload.data.state.report.report.executive_snapshot, "salesman upload must update Intel Card fields");
    const salesmanSummary = await request(baseUrl, "/api/ai/lead-summary", { method: "POST", token: salesmanToken, body: { leadId: salesmanLead.data.id } });
    assert.equal(salesmanSummary.response.status, 200, JSON.stringify(salesmanSummary.data));
    assert.match(salesmanSummary.data.summary.market_intelligence, /Structural steel supply/, "Lead Overview summary must use the uploaded PDF intelligence context");

    const forbiddenIntel = await request(baseUrl, `/api/leads/${lead.data.id}/intel`, { token: salesmanToken });
    assert.equal(forbiddenIntel.response.status, 404);
    const forbiddenUpload = await requestPdf(baseUrl, `/api/leads/${lead.data.id}/intelligence/upload`, salesmanToken, "Unauthorized replacement attempt.");
    assert.equal(forbiddenUpload.response.status, 404, JSON.stringify(forbiddenUpload.data));

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
