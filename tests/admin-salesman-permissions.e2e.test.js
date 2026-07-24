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
      body: { name: "E2E Salesman", email: "salesman-e2e@alrassteel.test", password: "SalesPass123!", territory: "UAE-North" }
    });
    assert.equal(salesmanAccount.response.status, 201);

    const ownLead = await request(baseUrl, "/api/leads", {
      method: "POST",
      token: adminToken,
      body: { company_name: "Own E2E Lead", assigned_salesman: "E2E Salesman", stage: "PROSPECT", territory: "UAE-North" }
    });
    assert.equal(ownLead.response.status, 201);

    const otherLead = await request(baseUrl, "/api/leads", {
      method: "POST",
      token: adminToken,
      body: { company_name: "Other E2E Lead", assigned_salesman: "Other Salesman", stage: "PROSPECT", territory: "UAE-South" }
    });
    assert.equal(otherLead.response.status, 201);

    const salesmanLogin = await request(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: "salesman-e2e@alrassteel.test", password: "SalesPass123!" }
    });
    assert.equal(salesmanLogin.response.status, 200);
    const salesmanToken = salesmanLogin.data.token;

    const salesmanConfigState = await request(baseUrl, "/api/configuration-agent/state", { token: salesmanToken });
    assert.equal(salesmanConfigState.response.status, 403);

    const adminConfigState = await request(baseUrl, "/api/configuration-agent/state", { token: adminToken });
    assert.equal(adminConfigState.response.status, 200);
    assert(Array.isArray(adminConfigState.data.configuration.territories));

    const configProposal = await request(baseUrl, "/api/configuration-agent/propose", {
      method: "POST",
      token: adminToken,
      body: { prompt: "Add Qatar to territories" }
    });
    assert.equal(configProposal.response.status, 200, JSON.stringify(configProposal.data));
    assert(configProposal.data.diff.some(row => row.field === "territories"));

    const applyWithoutPassword = await request(baseUrl, "/api/configuration-agent/apply", {
      method: "POST",
      token: adminToken,
      body: { changes: configProposal.data.changes }
    });
    assert.equal(applyWithoutPassword.response.status, 403);

    const appliedConfig = await request(baseUrl, "/api/configuration-agent/apply", {
      method: "POST",
      token: adminToken,
      body: {
        changes: configProposal.data.changes,
        proposal_id: configProposal.data.id,
        reason: "Enable Qatar territory for testing",
        admin_password: "AdminPass123!"
      }
    });
    assert.equal(appliedConfig.response.status, 200, JSON.stringify(appliedConfig.data));
    assert(appliedConfig.data.configuration.territories.includes("Qatar"));

    const settingsAfterConfig = await request(baseUrl, "/api/settings", { token: adminToken });
    assert(settingsAfterConfig.data.territories.includes("Qatar"));

    const configAudit = await request(baseUrl, "/api/configuration-agent/audit", { token: adminToken });
    assert.equal(configAudit.response.status, 200);
    assert(configAudit.data.some(item => item.action === "configuration_applied"));

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

    const invalidStructuredActivity = await request(baseUrl, `/api/leads/${ownLead.data.id}/activities`, {
      method: "POST",
      token: salesmanToken,
      body: {
        id: "act-invalid-structured",
        structured_activity: true,
        next_action_plan: "To Call",
        next_action_date: "",
        activity_purpose: "Company Introductory",
        notes: "Missing required date"
      }
    });
    assert.equal(invalidStructuredActivity.response.status, 400);

    const forbiddenStructuredActivity = await request(baseUrl, `/api/leads/${otherLead.data.id}/activities`, {
      method: "POST",
      token: salesmanToken,
      body: {
        id: "act-forbidden-structured",
        structured_activity: true,
        next_action_plan: "To Visit",
        next_action_date: "2026-07-30",
        activity_purpose: "Meeting",
        notes: "Salesman must not be able to reach this lead."
      }
    });
    assert.equal(forbiddenStructuredActivity.response.status, 404);

    const structuredActivityPayload = {
      id: "act-salesman-structured",
      structured_activity: true,
      next_action_plan: "To Send Email",
      next_action_date: "2026-07-30",
      activity_purpose: "Quotation Follow Up",
      notes: "Reviewed the quotation and agreed to send the revised commercial offer."
    };
    const structuredActivity = await request(baseUrl, `/api/leads/${ownLead.data.id}/activities`, {
      method: "POST",
      token: salesmanToken,
      body: structuredActivityPayload
    });
    assert.equal(structuredActivity.response.status, 201, JSON.stringify(structuredActivity.data));
    assert.equal(structuredActivity.data.activity.next_action_plan, "To Send Email");
    assert.equal(structuredActivity.data.activity.next_action_date, "2026-07-30");
    assert.equal(structuredActivity.data.activity.activity_purpose, "Quotation Follow Up");
    assert.equal(structuredActivity.data.activity.created_by, salesmanAccount.data.id);
    assert(structuredActivity.data.activity.created_at);
    assert.equal(structuredActivity.data.lead.next_action, "To Send Email");

    const structuredActivityRetry = await request(baseUrl, `/api/leads/${ownLead.data.id}/activities`, {
      method: "POST",
      token: salesmanToken,
      body: structuredActivityPayload
    });
    assert.equal(structuredActivityRetry.response.status, 200);
    assert.equal(structuredActivityRetry.data.duplicate, true);
    assert.equal(structuredActivityRetry.data.activity.id, structuredActivity.data.activity.id);

    const adminStructuredActivity = await request(baseUrl, `/api/leads/${otherLead.data.id}/activities`, {
      method: "POST",
      token: adminToken,
      body: {
        id: "act-admin-structured",
        structured_activity: true,
        next_action_plan: "To Visit",
        next_action_date: "2026-08-03",
        activity_purpose: "Meeting",
        notes: "Admin scheduled a director-supported customer visit."
      }
    });
    assert.equal(adminStructuredActivity.response.status, 201, JSON.stringify(adminStructuredActivity.data));
    assert.equal(adminStructuredActivity.data.activity.created_by, adminLogin.data.user.id);
    assert.equal(adminStructuredActivity.data.lead.next_action, "To Visit");

    const handoffWithoutNote = await request(baseUrl, `/api/leads/${otherLead.data.id}`, {
      method: "PATCH",
      token: adminToken,
      body: { assigned_salesman: "E2E Salesman" }
    });
    assert.equal(handoffWithoutNote.response.status, 400);

    const handoffWithNote = await request(baseUrl, `/api/leads/${otherLead.data.id}`, {
      method: "PATCH",
      token: adminToken,
      body: {
        assigned_salesman: "E2E Salesman",
        handoff_note: "Reassigning to UAE North owner for immediate follow-up and quotation registration."
      }
    });
    assert.equal(handoffWithNote.response.status, 200, JSON.stringify(handoffWithNote.data));
    assert.equal(handoffWithNote.data.assigned_salesman, "E2E Salesman");
    assert.equal(handoffWithNote.data.territory, "UAE-North");

    const handoffHistory = await request(baseUrl, `/api/leads/${otherLead.data.id}/handoffs`, { token: adminToken });
    assert.equal(handoffHistory.response.status, 200);
    assert.equal(handoffHistory.data.length, 1);
    assert.equal(handoffHistory.data[0].new_owner_name, "E2E Salesman");

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

    const correction = await request(baseUrl, `/api/leads/${ownLead.data.id}/activities/0`, {
      method: "PATCH",
      token: salesmanToken,
      body: { type: "Note", text: "Corrected note appended without changing the original" }
    });
    assert.equal(correction.response.status, 201, JSON.stringify(correction.data));
    assert.equal(correction.data.activity.type, "Correction");
    assert.equal(correction.data.activity.target_activity_id, activity.data.activity.id);
    assert(correction.data.lead.activities.some(item => item.id === activity.data.activity.id));

    const directActivityDelete = await request(baseUrl, `/api/leads/${ownLead.data.id}/activities/1`, {
      method: "DELETE",
      token: adminToken,
      body: { admin_password: "AdminPass123!" }
    });
    assert.equal(directActivityDelete.response.status, 405);

    const activityDeleteRequest = await request(baseUrl, `/api/leads/${ownLead.data.id}/delete-requests`, {
      method: "POST",
      token: salesmanToken,
      body: { target_type: "activity", activity_index: 1, reason: "Duplicate activity entry" }
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
    assert(approveActivityDelete.data.lead.activities.some(item => item.id === activity.data.activity.id));
    assert(approveActivityDelete.data.lead.activities.some(item => item.type === "Activity Review"));

    const meetingActivity = await request(baseUrl, `/api/leads/${ownLead.data.id}/activities`, {
      method: "POST",
      token: salesmanToken,
      body: { type: "Site Visit", text: "Met procurement team to discuss steel requirements" }
    });
    assert.equal(meetingActivity.response.status, 201, JSON.stringify(meetingActivity.data));

    const linkedPmr = await request(baseUrl, `/api/leads/${ownLead.data.id}/pmrs`, {
      method: "POST",
      token: salesmanToken,
      body: {
        activity_id: meetingActivity.data.activity.id,
        meeting_date: "2026-06-16",
        relationship_heat_score: "4",
        director_action_required: "None",
        notes: "PMR should link to the exact site visit."
      }
    });
    assert.equal(linkedPmr.response.status, 201, JSON.stringify(linkedPmr.data));
    assert.equal(linkedPmr.data.pmr.activity_id, meetingActivity.data.activity.id);
    assert(linkedPmr.data.lead.activities.some(item => item.type === "PMR Filed" && item.target_activity_id === meetingActivity.data.activity.id));
    assert(linkedPmr.data.lead.activities.some(item => item.id === meetingActivity.data.activity.id));

    const autoLinkedPmr = await request(baseUrl, `/api/leads/${ownLead.data.id}/pmrs`, {
      method: "POST",
      token: salesmanToken,
      body: {
        meeting_date: "2026-06-17",
        relationship_heat_score: "3",
        director_action_required: "None",
        notes: "PMR without selected activity should create a meeting activity."
      }
    });
    assert.equal(autoLinkedPmr.response.status, 201, JSON.stringify(autoLinkedPmr.data));
    assert(autoLinkedPmr.data.pmr.activity_id);
    assert(autoLinkedPmr.data.lead.activities.some(item => item.id === autoLinkedPmr.data.pmr.activity_id && item.type === "In-Person Meeting"));

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
