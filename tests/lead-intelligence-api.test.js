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
let providerDelayMs = 0;
let providerBodyDelayMatch = "";
let providerBodyDelayMs = 0;
global.fetch = async function mockedFetch(url, options) {
  if (String(url).startsWith("https://api.openai.com/")) {
    const requestBody = typeof options?.body === "string"
      ? options.body
      : (Buffer.isBuffer(options?.body) ? options.body.toString("utf8") : "");
    if (providerBodyDelayMatch && requestBody.includes(providerBodyDelayMatch) && providerBodyDelayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, providerBodyDelayMs));
    } else if (providerDelayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, providerDelayMs));
    }
    if (providerMode === "provider_error") {
      return { ok: false, status: 502, async json() { return { error: { message: "mock provider failure" } }; } };
    }
    const outputText = providerMode === "success" ? JSON.stringify(providerFixture()) : JSON.stringify({ sources: [] });
    return { ok: true, status: 200, async json() { return { id: `resp-${providerMode}`, status: "completed", usage: { input_tokens: 10, output_tokens: 20 }, output: [{ content: [{ type: "output_text", text: outputText }] }] }; } };
  }
  return nativeFetch(url, options);
};

async function request(baseUrl, pathName, { method = "GET", token = "", csrfToken = "", body, headers = {} } = {}) {
  const response = await nativeFetch(`${baseUrl}${pathName}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual"
  });
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : Buffer.from(await response.arrayBuffer());
  return { response, data };
}

function readLocalDb() {
  return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

function listIntelFiles() {
  if (!fs.existsSync(dataIntelPath)) return [];
  const files = [];
  const walk = current => {
    if (!fs.existsSync(current)) return;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else files.push(full);
    }
  };
  walk(dataIntelPath);
  return files.sort();
}

async function requestBinary(baseUrl, pathName, { method = "POST", token = "", csrfToken = "", body, headers = {} } = {}) {
  const response = await nativeFetch(`${baseUrl}${pathName}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
      ...(method === "POST" ? { "Content-Type": "application/pdf", "x-file-name": "lead-intelligence-summary.pdf" } : {}),
      ...headers
    },
    body,
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
    const adminCsrfToken = adminLogin.data.csrf_token;

    const lead = await request(baseUrl, "/api/leads", { method: "POST", token: adminToken, csrfToken: adminCsrfToken, body: { company_name: "API Intelligence Lead LLC", stage: "PROSPECT", territory: "Dubai", website: "https://example.com", sector: "Steel fabrication" } });
    assert.equal(lead.response.status, 201, JSON.stringify(lead.data));

    const salesmanAccount = await request(baseUrl, "/api/users", { method: "POST", token: adminToken, csrfToken: adminCsrfToken, body: { name: "Intel Salesman", email: "salesman-intel@alrassteel.test", password: "SalesPass123!", territory: "Abu Dhabi" } });
    assert.equal(salesmanAccount.response.status, 201);
    const salesmanLogin = await request(baseUrl, "/api/auth/login", { method: "POST", body: { email: "salesman-intel@alrassteel.test", password: "SalesPass123!" } });
    assert.equal(salesmanLogin.response.status, 200);

    const initialIntel = await request(baseUrl, `/api/leads/${lead.data.id}/intel`, { token: adminToken });
    assert.equal(initialIntel.response.status, 200);
    assert.equal(initialIntel.data.active_report, null);
    assert.equal(initialIntel.data.report, null);

    const pdfText = "API Intelligence Lead LLC company_name API Intelligence Lead LLC stage Prospect territory Dubai sector Steel fabrication email intelligence@api.com phone +971555123456";
    const firstUpload = await requestBinary(baseUrl, `/api/leads/${lead.data.id}/intelligence/upload`, {
      method: "POST",
      token: adminToken,
      csrfToken: adminCsrfToken,
      body: Buffer.from(`%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n2 0 obj\n<< /Length 100 >>\nstream\nBT /F1 12 Tf 72 720 Td (${pdfText}) Tj ET\nendstream\nendobj\ntrailer <<>>\n%%EOF`)
    });
    assert.equal(firstUpload.response.status, 200, JSON.stringify(firstUpload.data));

    const completedIntel = await request(baseUrl, `/api/leads/${lead.data.id}/intel`, { token: adminToken });
    assert.equal(completedIntel.data.report.status, "completed");
    assert.equal(typeof completedIntel.data.report.weighted_score, "number");
    assert.ok(completedIntel.data.report.weighted_score > 0);
    assert.ok(completedIntel.data.report.displayed_score !== null && completedIntel.data.report.displayed_score !== undefined);
    assert.equal(firstUpload.data.lead.id, lead.data.id);
    const currentReportId = completedIntel.data.report.id;
    assert.ok(completedIntel.data.report.pdf_url.startsWith(`/api/leads/${lead.data.id}/intelligence/pdf/`));
    assert.ok(completedIntel.data.report.download_url.startsWith(`/api/leads/${lead.data.id}/intelligence/pdf/`));
    assert.ok(!completedIntel.data.report.pdf_url.includes("/storage/v1/object/sign/"));
    const firstDbState = readLocalDb();
    const firstCurrent = firstDbState.lead_intelligence_reports.find(item => item.id === currentReportId);
    const firstStorageKey = firstCurrent.pdf_storage_key;
    const firstPdfPath = path.join(__dirname, "..", "data", firstStorageKey);
    assert.ok(fs.existsSync(firstPdfPath));
    assert.equal(firstDbState.lead_intelligence_reports.filter(item => item.lead_id === lead.data.id && item.is_current).length, 1);

    const pdf = await request(baseUrl, completedIntel.data.report.download_url, { token: adminToken });
    assert.equal(pdf.response.status, 200);
    assert.strictEqual(pdf.data.slice(0, 4).toString(), "%PDF");

    const beforeUnauthorizedFiles = listIntelFiles().length;
    const forbiddenReplace = await requestBinary(baseUrl, `/api/leads/${lead.data.id}/intelligence/upload`, {
      method: "POST",
      token: salesmanLogin.data.token,
      csrfToken: salesmanLogin.data.csrf_token,
      body: Buffer.from(`%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n2 0 obj\n<< /Length 80 >>\nstream\nBT /F1 12 Tf 72 720 Td (${pdfText}) Tj ET\nendstream\nendobj\ntrailer <<>>\n%%EOF`)
    });
    assert.equal(forbiddenReplace.response.status, 404);
    assert.equal(listIntelFiles().length, beforeUnauthorizedFiles);

    const invalidType = await requestBinary(baseUrl, `/api/leads/${lead.data.id}/intelligence/upload`, {
      method: "POST",
      token: adminToken,
      csrfToken: adminCsrfToken,
      headers: { "Content-Type": "text/plain", "x-file-name": "not-a-pdf.txt" },
      body: Buffer.from("plain text")
    });
    assert.equal(invalidType.response.status, 415);
    assert.equal(listIntelFiles().length, beforeUnauthorizedFiles);

    const invalidSignature = await requestBinary(baseUrl, `/api/leads/${lead.data.id}/intelligence/upload`, {
      method: "POST",
      token: adminToken,
      csrfToken: adminCsrfToken,
      body: Buffer.from("not a pdf payload")
    });
    assert.equal(invalidSignature.response.status, 415);
    assert.equal(listIntelFiles().length, beforeUnauthorizedFiles);

    let oversizeRejected = false;
    try {
      const oversizeUpload = await requestBinary(baseUrl, `/api/leads/${lead.data.id}/intelligence/upload`, {
        method: "POST",
        token: adminToken,
        csrfToken: adminCsrfToken,
        body: Buffer.alloc(8 * 1024 * 1024 + 1, 0x20)
      });
      assert.equal(oversizeUpload.response.status, 413);
      oversizeRejected = true;
    } catch (error) {
      oversizeRejected = /fetch failed|socket|UND_ERR_SOCKET/i.test(String(error && (error.message || error)));
    }
    assert.equal(oversizeRejected, true);
    assert.equal(listIntelFiles().length, beforeUnauthorizedFiles);

    providerMode = "provider_error";
    const providerFailure = await requestBinary(baseUrl, `/api/leads/${lead.data.id}/intelligence/upload?apply=false`, {
      method: "POST",
      token: adminToken,
      csrfToken: adminCsrfToken,
      body: Buffer.from(`%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n2 0 obj\n<< /Length 80 >>\nstream\nBT /F1 12 Tf 72 720 Td (${pdfText}) Tj ET\nendstream\nendobj\ntrailer <<>>\n%%EOF`)
    });
    assert.equal(providerFailure.response.status, 502, JSON.stringify(providerFailure.data));
    providerMode = "success";
    const afterProviderFailure = await request(baseUrl, `/api/leads/${lead.data.id}/intel`, { token: adminToken });
    assert.equal(afterProviderFailure.data.report.id, currentReportId);
    const afterProviderDb = readLocalDb();
    assert.equal(afterProviderDb.lead_intelligence_reports.find(item => item.id === currentReportId).pdf_storage_key, firstStorageKey);
    assert.ok(fs.existsSync(firstPdfPath));
    assert.equal(listIntelFiles().length, 1);

    const originalWriteFileSync = fs.writeFileSync;
    fs.writeFileSync = function patchedWriteFileSync(target) {
      if (String(target).includes(`${path.sep}lead-intelligence${path.sep}`)) {
        throw new Error("simulated candidate upload failure");
      }
      return originalWriteFileSync.apply(this, arguments);
    };
    const uploadFailure = await requestBinary(baseUrl, `/api/leads/${lead.data.id}/intelligence/upload?apply=false`, {
      method: "POST",
      token: adminToken,
      csrfToken: adminCsrfToken,
      body: Buffer.from(`%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n2 0 obj\n<< /Length 80 >>\nstream\nBT /F1 12 Tf 72 720 Td (${pdfText}) Tj ET\nendstream\nendobj\ntrailer <<>>\n%%EOF`)
    });
    fs.writeFileSync = originalWriteFileSync;
    assert.equal(uploadFailure.response.status, 500);
    const afterUploadFailure = await request(baseUrl, `/api/leads/${lead.data.id}/intel`, { token: adminToken });
    assert.equal(afterUploadFailure.data.report.id, currentReportId);
    assert.equal(readLocalDb().lead_intelligence_reports.find(item => item.id === currentReportId).pdf_storage_key, firstStorageKey);
    assert.equal(listIntelFiles().length, 1);

    fs.writeFileSync = function patchedWriteDbOnly(target) {
      if (String(target) === dbPath) {
        throw new Error("simulated db update failure");
      }
      return originalWriteFileSync.apply(this, arguments);
    };
    const dbFailure = await requestBinary(baseUrl, `/api/leads/${lead.data.id}/intelligence/upload?apply=false`, {
      method: "POST",
      token: adminToken,
      csrfToken: adminCsrfToken,
      body: Buffer.from(`%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n2 0 obj\n<< /Length 80 >>\nstream\nBT /F1 12 Tf 72 720 Td (${pdfText}) Tj ET\nendstream\nendobj\ntrailer <<>>\n%%EOF`)
    });
    fs.writeFileSync = originalWriteFileSync;
    assert.equal(dbFailure.response.status, 500);
    const afterDbFailure = await request(baseUrl, `/api/leads/${lead.data.id}/intel`, { token: adminToken });
    assert.equal(afterDbFailure.data.report.id, currentReportId);
    assert.equal(readLocalDb().lead_intelligence_reports.find(item => item.id === currentReportId).pdf_storage_key, firstStorageKey);
    assert.equal(listIntelFiles().length, 1);

    const secondUpload = await requestBinary(baseUrl, `/api/leads/${lead.data.id}/intelligence/upload`, {
      method: "POST",
      token: adminToken,
      csrfToken: adminCsrfToken,
      body: Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n2 0 obj\n<< /Length 100 >>\nstream\nBT /F1 12 Tf 72 720 Td (API Intelligence Lead LLC updated report includes updated notes and priority high.) Tj ET\nendstream\nendobj\ntrailer <<>>\n%%EOF")
    });
    assert.equal(secondUpload.response.status, 200, JSON.stringify(secondUpload.data));
    assert.equal(secondUpload.data.report.id, currentReportId, "Re-uploading should retain the same report row for the same lead.");
    const secondDbState = readLocalDb();
    const secondCurrent = secondDbState.lead_intelligence_reports.find(item => item.id === currentReportId);
    assert.notEqual(secondCurrent.pdf_storage_key, firstStorageKey);
    assert.equal(secondDbState.lead_intelligence_reports.filter(item => item.lead_id === lead.data.id && item.is_current).length, 1);
    const secondPdfPath = path.join(__dirname, "..", "data", secondCurrent.pdf_storage_key);
    assert.ok(fs.existsSync(secondPdfPath));
    assert.ok(!fs.existsSync(firstPdfPath), "Old PDF should be removed after successful replacement.");
    assert.equal(listIntelFiles().length, 1);
    assert.ok(secondUpload.data.report.pdf_url.startsWith(`/api/leads/${lead.data.id}/intelligence/pdf/`));

    const cleanupWarnings = [];
    const originalWarn = console.warn;
    console.warn = (...args) => cleanupWarnings.push(args.join(" "));
    const originalUnlinkSync = fs.unlinkSync;
    fs.unlinkSync = function patchedUnlinkSync(target) {
      if (String(target).endsWith(secondCurrent.pdf_storage_key.replace(/\//g, path.sep))) {
        throw new Error("simulated old cleanup failure");
      }
      return originalUnlinkSync.apply(this, arguments);
    };
    const cleanupFailureUpload = await requestBinary(baseUrl, `/api/leads/${lead.data.id}/intelligence/upload`, {
      method: "POST",
      token: adminToken,
      csrfToken: adminCsrfToken,
      body: Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n2 0 obj\n<< /Length 140 >>\nstream\nBT /F1 12 Tf 72 720 Td (API Intelligence Lead LLC cleanup warning replacement with updated procurement notes and demand summary.) Tj ET\nendstream\nendobj\ntrailer <<>>\n%%EOF")
    });
    fs.unlinkSync = originalUnlinkSync;
    console.warn = originalWarn;
    assert.equal(cleanupFailureUpload.response.status, 200, JSON.stringify(cleanupFailureUpload.data));
    const cleanupDbState = readLocalDb();
    const cleanupCurrent = cleanupDbState.lead_intelligence_reports.find(item => item.id === currentReportId);
    assert.notEqual(cleanupCurrent.pdf_storage_key, secondCurrent.pdf_storage_key);
    assert.ok(fs.existsSync(path.join(__dirname, "..", "data", cleanupCurrent.pdf_storage_key)));
    assert.ok(fs.existsSync(path.join(__dirname, "..", "data", secondCurrent.pdf_storage_key)));
    assert.ok(cleanupWarnings.some(line => line.includes("lead-intelligence-cleanup")));
    assert.ok(cleanupWarnings.every(line => !line.includes("/storage/v1/object/sign/") && !line.includes("http")));

    providerBodyDelayMatch = "Concurrent replacement A";
    providerBodyDelayMs = 200;
    const concurrentAPromise = requestBinary(baseUrl, `/api/leads/${lead.data.id}/intelligence/upload?apply=false`, {
      method: "POST",
      token: adminToken,
      csrfToken: adminCsrfToken,
      body: Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n2 0 obj\n<< /Length 150 >>\nstream\nBT /F1 12 Tf 72 720 Td (Concurrent replacement A with enough descriptive lead intelligence text to pass extraction thresholds.) Tj ET\nendstream\nendobj\ntrailer <<>>\n%%EOF")
    });
    await new Promise(resolve => setTimeout(resolve, 25));
    const concurrentB = await requestBinary(baseUrl, `/api/leads/${lead.data.id}/intelligence/upload?apply=false`, {
        method: "POST",
        token: adminToken,
        csrfToken: adminCsrfToken,
        body: Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n2 0 obj\n<< /Length 150 >>\nstream\nBT /F1 12 Tf 72 720 Td (Concurrent replacement B with enough descriptive lead intelligence text to pass extraction thresholds.) Tj ET\nendstream\nendobj\ntrailer <<>>\n%%EOF")
    });
    const concurrentA = await concurrentAPromise;
    providerBodyDelayMatch = "";
    providerBodyDelayMs = 0;
    assert.deepEqual([concurrentA.response.status, concurrentB.response.status].sort((a, b) => a - b), [200, 409]);
    const afterConflictDb = readLocalDb();
    const afterConflictCurrent = afterConflictDb.lead_intelligence_reports.find(item => item.id === currentReportId);
    assert.equal(afterConflictDb.lead_intelligence_reports.filter(item => item.lead_id === lead.data.id && item.is_current).length, 1);
    const conflictFiles = listIntelFiles();
    assert.equal(conflictFiles.length, 2, "Conflict should delete only the losing candidate while preserving the current file and any earlier cleanup residue.");
    assert.ok(conflictFiles.some(file => file.endsWith(afterConflictCurrent.pdf_storage_key.replace(/\//g, path.sep))));

    const staleStartedAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const staleCreatedAt = new Date(Date.now() + 1000).toISOString();
    const dbAfterRetry = JSON.parse(fs.readFileSync(dbPath, "utf8"));
    dbAfterRetry.lead_intelligence_reports.unshift({
      id: "lir-stale-researching",
      lead_id: lead.data.id,
      status: "researching",
      report_json: null,
      weighted_score: null,
      displayed_score: null,
      priority: "",
      demand_classification: "",
      steel_demand: "",
      buyer_classification: "",
      workflow_version: "uae-structural-steel-lead-intelligence@2026-08-10",
      provider_metadata: {},
      research_timestamp: null,
      pdf_storage_key: "",
      pdf_url: "",
      error_code: "",
      error_message: "",
      created_at: staleCreatedAt,
      started_at: staleStartedAt,
      completed_at: null,
      updated_at: staleStartedAt,
      initiating_user_id: adminLogin.data.user.id,
      initiated_by: adminLogin.data.user.id,
      is_current: false,
      superseded_at: null
    });
    fs.writeFileSync(dbPath, JSON.stringify(dbAfterRetry, null, 2));
    const staleState = await request(baseUrl, `/api/leads/${lead.data.id}/intel`, { token: adminToken });
    assert.equal(staleState.response.status, 200);
    assert.equal(staleState.data.active_report, null);
    const staleFailed = (staleState.data.history || []).find(item => item.id === "lir-stale-researching");
    assert.ok(staleFailed);
    assert.equal(staleFailed.error_code, "stale_worker_interrupted");

    const removedGenerate = await request(baseUrl, `/api/leads/${lead.data.id}/intelligence/generate`, { method: "POST", token: adminToken, csrfToken: adminCsrfToken });
    const removedRefresh = await request(baseUrl, `/api/leads/${lead.data.id}/intelligence/refresh`, { method: "POST", token: adminToken, csrfToken: adminCsrfToken });
    const removedRetry = await request(baseUrl, `/api/leads/${lead.data.id}/intelligence/retry`, { method: "POST", token: adminToken, csrfToken: adminCsrfToken, body: { report_id: currentReportId } });
    assert.equal(removedGenerate.response.status, 404);
    assert.equal(removedRefresh.response.status, 404);
    assert.equal(removedRetry.response.status, 404);
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
