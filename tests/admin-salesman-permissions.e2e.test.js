const assert = require("assert");
const fs = require("fs");
const path = require("path");

const originalExistsSync = fs.existsSync;
const originalReadFileSync = fs.readFileSync;
const dbPath = path.join(__dirname, "..", "data", "db.json");
const originalDb = fs.existsSync(dbPath) ? fs.readFileSync(dbPath) : null;

fs.rmSync(dbPath, { force: true });
delete process.env.VERCEL;
process.env.ADMIN_EMAIL = "admin-e2e@alrassteel.test";
process.env.ADMIN_BOOTSTRAP_PASSWORD = "AdminPass123!";
process.env.APP_SESSION_SECRET = "test-session-secret";
process.env.NEXT_PUBLIC_SUPABASE_URL = "";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";

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

async function request(baseUrl, pathName, { method = "GET", token = "", body } = {}) {
  const response = await fetch(`${baseUrl}${pathName}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

(async () => {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try {
    const adminLogin = await request(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: "admin-e2e@alrassteel.test", password: "AdminPass123!" }
    });
    assert.equal(adminLogin.response.status, 200, JSON.stringify(adminLogin.data));
    const adminToken = adminLogin.data.token;

    const salesmanAccount = await request(baseUrl, "/api/users", {
      method: "POST",
      token: adminToken,
      body: { name: "E2E Salesman", email: "salesman-e2e@alrassteel.test", password: "SalesPass123!", territory: "Dubai" }
    });
    assert.equal(salesmanAccount.response.status, 201);

    const ownLead = await request(baseUrl, "/api/leads", {
      method: "POST",
      token: adminToken,
      body: { company_name: "Own E2E Lead", assigned_salesman: "E2E Salesman", stage: "PROSPECT" }
    });
    assert.equal(ownLead.response.status, 201);

    const otherLead = await request(baseUrl, "/api/leads", {
      method: "POST",
      token: adminToken,
      body: { company_name: "Other E2E Lead", assigned_salesman: "Other Salesman", stage: "PROSPECT" }
    });
    assert.equal(otherLead.response.status, 201);

    const salesmanLogin = await request(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: "salesman-e2e@alrassteel.test", password: "SalesPass123!" }
    });
    assert.equal(salesmanLogin.response.status, 200);
    const salesmanToken = salesmanLogin.data.token;

    const salesmanLeads = await request(baseUrl, "/api/leads", { token: salesmanToken });
    assert.equal(salesmanLeads.response.status, 200);
    assert(salesmanLeads.data.some(lead => lead.id === ownLead.data.id));
    assert(!salesmanLeads.data.some(lead => lead.id === otherLead.data.id));

    const salesmanExcelExport = await request(baseUrl, "/api/exports/leads.xls", { token: salesmanToken });
    assert.equal(salesmanExcelExport.response.status, 403);

    const adminExcelExport = await fetch(`${baseUrl}/api/exports/leads.xls`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(adminExcelExport.status, 200);
    assert(adminExcelExport.headers.get("content-type").includes("application/vnd.ms-excel"));
    assert((await adminExcelExport.text()).includes("Own E2E Lead"));

    const adminPdfExport = await fetch(`${baseUrl}/api/exports/leads.pdf`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(adminPdfExport.status, 200);
    assert(adminPdfExport.headers.get("content-type").includes("application/pdf"));
    const pdfBytes = Buffer.from(await adminPdfExport.arrayBuffer());
    assert.equal(pdfBytes.slice(0, 4).toString("utf8"), "%PDF");

    const forbiddenPatch = await request(baseUrl, `/api/leads/${otherLead.data.id}`, {
      method: "PATCH",
      token: salesmanToken,
      body: { notes: "Should not be allowed" }
    });
    assert.equal(forbiddenPatch.response.status, 404);

    const directDeleteAsSalesman = await request(baseUrl, `/api/leads/${ownLead.data.id}`, {
      method: "DELETE",
      token: salesmanToken,
      body: { admin_password: "SalesPass123!" }
    });
    assert.equal(directDeleteAsSalesman.response.status, 403);

    const activity = await request(baseUrl, `/api/leads/${ownLead.data.id}/activities`, {
      method: "POST",
      token: salesmanToken,
      body: { type: "Note", text: "Salesman wants to revise this later" }
    });
    assert.equal(activity.response.status, 201);

    const activityDeleteRequest = await request(baseUrl, `/api/leads/${ownLead.data.id}/delete-requests`, {
      method: "POST",
      token: salesmanToken,
      body: { target_type: "activity", activity_index: 0, reason: "Duplicate activity entry" }
    });
    assert.equal(activityDeleteRequest.response.status, 201, JSON.stringify(activityDeleteRequest.data));
    assert.equal(activityDeleteRequest.data.request.request_status, "pending");

    const approveWithoutPassword = await request(baseUrl, `/api/leads/${ownLead.data.id}/delete-requests/${activityDeleteRequest.data.request.id}/approve`, {
      method: "POST",
      token: adminToken,
      body: {}
    });
    assert.equal(approveWithoutPassword.response.status, 403);

    const approveActivityDelete = await request(baseUrl, `/api/leads/${ownLead.data.id}/delete-requests/${activityDeleteRequest.data.request.id}/approve`, {
      method: "POST",
      token: adminToken,
      body: { admin_password: "AdminPass123!" }
    });
    assert.equal(approveActivityDelete.response.status, 200, JSON.stringify(approveActivityDelete.data));
    assert(!approveActivityDelete.data.lead.activities.some(item => item.id === activity.data.activity.id));

    const leadDeleteRequest = await request(baseUrl, `/api/leads/${ownLead.data.id}/delete-requests`, {
      method: "POST",
      token: salesmanToken,
      body: { target_type: "lead", reason: "Created during test by mistake" }
    });
    assert.equal(leadDeleteRequest.response.status, 201);

    const rejectLeadDelete = await request(baseUrl, `/api/leads/${ownLead.data.id}/delete-requests/${leadDeleteRequest.data.request.id}/reject`, {
      method: "POST",
      token: adminToken,
      body: { admin_password: "AdminPass123!", note: "Keep for follow-up" }
    });
    assert.equal(rejectLeadDelete.response.status, 200);
    assert.equal(rejectLeadDelete.data.request.request_status, "rejected");

    const secondLeadDeleteRequest = await request(baseUrl, `/api/leads/${ownLead.data.id}/delete-requests`, {
      method: "POST",
      token: salesmanToken,
      body: { target_type: "lead", reason: "Confirmed duplicate" }
    });
    assert.equal(secondLeadDeleteRequest.response.status, 201);

    const approveLeadDelete = await request(baseUrl, `/api/leads/${ownLead.data.id}/delete-requests/${secondLeadDeleteRequest.data.request.id}/approve`, {
      method: "POST",
      token: adminToken,
      body: { admin_password: "AdminPass123!" }
    });
    assert.equal(approveLeadDelete.response.status, 200);
    assert.equal(approveLeadDelete.data.deleted, true);

    const deletedLeadHidden = await request(baseUrl, "/api/leads", { token: adminToken });
    assert(!deletedLeadHidden.data.some(lead => lead.id === ownLead.data.id));

    console.log("PASS admin/salesman HTTP permission boundaries");
  } finally {
    await new Promise(resolve => server.close(resolve));
    if (originalDb) {
      fs.writeFileSync(dbPath, originalDb);
    } else {
      fs.rmSync(dbPath, { force: true });
    }
  }
})().catch(error => {
  server.close(() => {});
  if (originalDb) {
    fs.writeFileSync(dbPath, originalDb);
  } else {
    fs.rmSync(dbPath, { force: true });
  }
  throw error;
});
