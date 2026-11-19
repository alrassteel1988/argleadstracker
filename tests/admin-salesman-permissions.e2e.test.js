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

async function request(baseUrl, pathName, { method = "GET", token = "", csrfToken = "", body } = {}) {
  const response = await fetch(`${baseUrl}${pathName}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
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
    const adminCsrfToken = adminLogin.data.csrf_token;

    const salesmanAccount = await request(baseUrl, "/api/users", {
      method: "POST",
      token: adminToken,
      csrfToken: adminCsrfToken,
      body: { name: "E2E Salesman", email: "salesman-e2e@alrassteel.test", password: "SalesPass123!", territory: "UAE-North" }
    });
    assert.equal(salesmanAccount.response.status, 201);

    const otherAccount = await request(baseUrl, "/api/users", {
      method: "POST", token: adminToken, csrfToken: adminCsrfToken,
      body: { name: "Other Salesman", email: "other-e2e@example.test", password: "OtherSalesPass123!", territory: "UAE-South" }
    });
    assert.equal(otherAccount.response.status, 201);

    const dormantAccount = await request(baseUrl, "/api/users", {
      method: "POST",
      token: adminToken,
      csrfToken: adminCsrfToken,
      body: { name: "Dormant E2E Salesman", email: "dormant-salesman-e2e@alrassteel.test", password: "DormantPass123!", territory: "Saudi" }
    });
    assert.equal(dormantAccount.response.status, 201);

    const deactivateWithoutPassword = await request(baseUrl, `/api/users/${dormantAccount.data.id}`, {
      method: "PATCH",
      token: adminToken,
      csrfToken: adminCsrfToken,
      body: { status: "inactive" }
    });
    assert.equal(deactivateWithoutPassword.response.status, 403);

    const deactivatedAccount = await request(baseUrl, `/api/users/${dormantAccount.data.id}`, {
      method: "PATCH",
      token: adminToken,
      csrfToken: adminCsrfToken,
      body: { status: "inactive", admin_password: "AdminPass123!" }
    });
    assert.equal(deactivatedAccount.response.status, 200, JSON.stringify(deactivatedAccount.data));
    assert.equal(deactivatedAccount.data.status, "inactive");

    const inactiveLogin = await request(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: "dormant-salesman-e2e@alrassteel.test", password: "DormantPass123!" }
    });
    assert.equal(inactiveLogin.response.status, 401);

    const ownLead = await request(baseUrl, "/api/leads", {
      method: "POST",
      token: adminToken,
      csrfToken: adminCsrfToken,
      body: { company_name: "Own E2E Lead", assigned_salesman: "E2E Salesman", stage: "PROSPECT", territory: "UAE-North" }
    });
    assert.equal(ownLead.response.status, 201);

    const otherLead = await request(baseUrl, "/api/leads", {
      method: "POST",
      token: adminToken,
      csrfToken: adminCsrfToken,
      body: { company_name: "Other E2E Lead", assigned_salesman: "Other Salesman", stage: "PROSPECT", territory: "UAE-South" }
    });
    assert.equal(otherLead.response.status, 201);

    const salesmanLogin = await request(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: "salesman-e2e@alrassteel.test", password: "SalesPass123!" }
    });
    assert.equal(salesmanLogin.response.status, 200);
    const salesmanToken = salesmanLogin.data.token;
    const salesmanCsrfToken = salesmanLogin.data.csrf_token;

    const salesmanConfigState = await request(baseUrl, "/api/configuration-agent/state", { token: salesmanToken });
    assert.equal(salesmanConfigState.response.status, 403);

    const adminConfigState = await request(baseUrl, "/api/configuration-agent/state", { token: adminToken });
    assert.equal(adminConfigState.response.status, 200);
    assert(Array.isArray(adminConfigState.data.configuration.territories));

    const configProposal = await request(baseUrl, "/api/configuration-agent/propose", {
      method: "POST",
      token: adminToken,
      csrfToken: adminCsrfToken,
      body: { prompt: "Add Qatar to territories" }
    });
    assert.equal(configProposal.response.status, 200, JSON.stringify(configProposal.data));
    assert(configProposal.data.diff.some(row => row.field === "territories"));

    const applyWithoutPassword = await request(baseUrl, "/api/configuration-agent/apply", {
      method: "POST",
      token: adminToken,
      csrfToken: adminCsrfToken,
      body: { changes: configProposal.data.changes }
    });
    assert.equal(applyWithoutPassword.response.status, 403);

    const appliedConfig = await request(baseUrl, "/api/configuration-agent/apply", {
      method: "POST",
      token: adminToken,
      csrfToken: adminCsrfToken,
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

    const salesmanSettings = await request(baseUrl, "/api/settings", { token: salesmanToken });
    assert.equal(salesmanSettings.response.status, 200);
    assert(salesmanSettings.data.stages.includes("DORMANT"), "Salesmen must be able to select the Dormant stage.");

    const dormantOwnLead = await request(baseUrl, `/api/leads/${ownLead.data.id}`, {
      method: "PATCH",
      token: salesmanToken,
      csrfToken: salesmanCsrfToken,
      body: { stage: "DORMANT", notes: "No future steel requirement is expected at this time." }
    });
    assert.equal(dormantOwnLead.response.status, 200, JSON.stringify(dormantOwnLead.data));
    assert.equal(dormantOwnLead.data.stage, "DORMANT", "Dormant must remain distinct from Lost so it can be reactivated later.");

    const salesmanCreatedLead = await request(baseUrl, "/api/leads", {
      method: "POST",
      token: salesmanToken,
      csrfToken: salesmanCsrfToken,
      body: {
        company_name: "Salesman Created E2E Lead",
        assigned_salesman: "Other Salesman",
        territory: "Saudi",
        sector: "Fabrication",
        stage: "PROSPECT",
        priority: "New",
        next_action: "To Call",
        next_action_date: "2026-08-07",
        activity_purpose: "Company Introductory",
        notes: "Created from the salesman Add New Lead workflow."
      }
    });
    assert.equal(salesmanCreatedLead.response.status, 201, JSON.stringify(salesmanCreatedLead.data));
    assert.equal(salesmanCreatedLead.data.assigned_salesman, "E2E Salesman");
    assert.equal(salesmanCreatedLead.data.territory, "UAE-North");
    assert.equal(salesmanCreatedLead.data.created_by, salesmanAccount.data.id);

    const salesmanLeadsAfterCreate = await request(baseUrl, "/api/leads", { token: salesmanToken });
    assert.equal(salesmanLeadsAfterCreate.response.status, 200);
    assert(salesmanLeadsAfterCreate.data.some(lead => lead.id === salesmanCreatedLead.data.id));

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
      csrfToken: salesmanCsrfToken,
      body: { notes: "Should not be allowed" }
    });
    assert.equal(forbiddenPatch.response.status, 404);

    const invalidStructuredActivity = await request(baseUrl, `/api/leads/${ownLead.data.id}/activities`, {
      method: "POST",
      token: salesmanToken,
      csrfToken: salesmanCsrfToken,
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
      csrfToken: salesmanCsrfToken,
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
      csrfToken: salesmanCsrfToken,
      body: structuredActivityPayload
    });
    assert.equal(structuredActivity.response.status, 201, JSON.stringify(structuredActivity.data));
    assert.equal(structuredActivity.data.activity.next_action_plan, "To Send Email");
    assert.equal(structuredActivity.data.activity.next_action_date, "2026-07-30");
    assert.equal(structuredActivity.data.activity.activity_purpose, "Quotation Follow Up");
    assert.equal(structuredActivity.data.activity.created_by, salesmanAccount.data.id);
    assert(structuredActivity.data.activity.created_at);
    assert.equal(structuredActivity.data.lead.next_action, "To Send Email", "A first explicit schedule remains allowed after optional blank Step 3");
    assert.equal(structuredActivity.data.lead.next_action_date, "2026-07-30");
    assert.equal(structuredActivity.data.schedule_unchanged, false);

    const structuredActivityRetry = await request(baseUrl, `/api/leads/${ownLead.data.id}/activities`, {
      method: "POST",
      token: salesmanToken,
      csrfToken: salesmanCsrfToken,
      body: structuredActivityPayload
    });
    assert.equal(structuredActivityRetry.response.status, 200);
    assert.equal(structuredActivityRetry.data.duplicate, true);
    assert.equal(structuredActivityRetry.data.activity.id, structuredActivity.data.activity.id);

    const adminStructuredActivity = await request(baseUrl, `/api/leads/${otherLead.data.id}/activities`, {
      method: "POST",
      token: adminToken,
      csrfToken: adminCsrfToken,
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
    assert.equal(adminStructuredActivity.data.lead.next_action_date, "2026-08-03");
    assert.equal(adminStructuredActivity.data.schedule_unchanged, false);

    const repSession = { token: salesmanToken, csrfToken: salesmanCsrfToken };
    const adminSession = { token: adminToken, csrfToken: adminCsrfToken };
    const policyLead = await request(baseUrl, "/api/leads", {
      ...repSession, method: "POST", body: { company_name: "Synthetic Schedule Policy Lead", next_action: "To Call",
        next_action_date: "2099-03-10", stage: "PROSPECT", territory: "UAE-North" }
    });
    assert.equal(policyLead.response.status, 201);
    const policyLeadPath = `/api/leads/${policyLead.data.id}`;
    assert.equal((await request(baseUrl, policyLeadPath, {
      ...repSession, method: "PATCH", body: { next_action_date: "2099-03-11" }
    })).response.status, 409);
    const schedulePath = `${policyLeadPath}/activity-schedule`;
    const schedule = await request(baseUrl, schedulePath, repSession);
    assert.equal(schedule.response.status, 200);
    assert.equal(schedule.data.needs_review, false);
    const changeBody = { operation: "submit", expected_updated_at: schedule.data.updated_at, expected_plan_id: schedule.data.plan.id,
      date: "2099-03-11", time: "11:00", priority: "High", agenda: "Review steel requirements",
      reason: "Customer prefers tomorrow morning." };
    const changed = await request(baseUrl, schedulePath, { ...repSession, method: "POST", body: changeBody });
    assert.equal(changed.response.status, 200, JSON.stringify(changed.data));
    assert.equal(changed.data.lead.next_action_date, "2099-03-11");
    assert.equal(changed.data.lead.activity_schedule.original_due_date, "2099-03-10");
    assert.equal((await request(baseUrl, schedulePath, { ...repSession, method: "POST", body: changeBody })).response.status, 409);
    const reminder = changed.data.lead.activities.find(item => item.reminder && item.due_date === "2099-03-11");
    assert.equal(reminder.created_by, salesmanLogin.data.user.id);
    const deleteSchedule = await request(baseUrl, `${policyLeadPath}/delete-requests`, {
      ...repSession, method: "POST", body: { target_type: "activity", activity_id: reminder.id,
        reason: "Synthetic duplicate follow-up reminder." }
    });
    assert.equal(deleteSchedule.response.status, 201, JSON.stringify(deleteSchedule.data));
    const pendingSchedule = await request(baseUrl, schedulePath, repSession);
    const blockedEdit = await request(baseUrl, schedulePath, {
      ...repSession, method: "POST", body: { ...changeBody, expected_updated_at: pendingSchedule.data.updated_at, date: "2099-03-12" }
    });
    assert.equal(blockedEdit.response.status, 409);
    assert.match(blockedEdit.data.error, /deletion is pending/i);
    const decisionEndpoint = `${policyLeadPath}/delete-requests/${deleteSchedule.data.request.id}`;
    const decideSchedule = operation => request(baseUrl, `${decisionEndpoint}/${operation}`, {
      ...adminSession, method: "POST", body: { admin_password: "AdminPass123!" }
    });
    const removedSchedule = await decideSchedule("approve");
    assert.equal(removedSchedule.response.status, 200, JSON.stringify(removedSchedule.data));
    assert.equal(removedSchedule.data.lead.activity_schedule, null);
    assert.equal((await request(baseUrl, schedulePath, repSession)).response.status, 409);
    assert.equal((await decideSchedule("restore")).response.status, 200);
    const restoredSchedule = await request(baseUrl, schedulePath, repSession);
    assert.equal(restoredSchedule.response.status, 200);
    assert.deepEqual(restoredSchedule.data.plan, changed.data.lead.activity_schedule);
    const revised = await request(baseUrl, `/api/leads/${ownLead.data.id}/activities/${structuredActivity.data.activity.id}`, {
      ...repSession, method: "PATCH", body: { ...structuredActivityPayload, version: 1,
        notes: "Revised note with corrected quote information.", correction_reason: "Original quote details were incorrect." }
    });
    assert.equal(revised.response.status, 201, JSON.stringify(revised.data));
    assert.equal(revised.data.activity.audit_history[0].before.notes, structuredActivityPayload.notes);
    assert.equal(revised.data.lead.activities.find(item => item.id === structuredActivity.data.activity.id).notes, structuredActivityPayload.notes);
    assert.equal((await request(baseUrl, "/api/activity-schedule-report", repSession)).response.status, 403);
    const managementReport = await request(baseUrl, "/api/activity-schedule-report", adminSession);
    assert.equal(managementReport.response.status, 200);
    assert.equal(managementReport.data.rows.find(row => row.name === "E2E Salesman").changed, 1);

    const handoffWithoutNote = await request(baseUrl, `/api/leads/${otherLead.data.id}`, {
      method: "PATCH",
      token: adminToken,
      csrfToken: adminCsrfToken,
      body: { assigned_salesman: "E2E Salesman" }
    });
    assert.equal(handoffWithoutNote.response.status, 400);

    const handoffWithNote = await request(baseUrl, `/api/leads/${otherLead.data.id}`, {
      method: "PATCH",
      token: adminToken,
      csrfToken: adminCsrfToken,
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
      csrfToken: salesmanCsrfToken,
      body: { admin_password: "SalesPass123!" }
    });
    assert.equal(directDeleteAsSalesman.response.status, 403);

    const activity = await request(baseUrl, `/api/leads/${ownLead.data.id}/activities`, {
      method: "POST",
      token: salesmanToken,
      csrfToken: salesmanCsrfToken,
      body: { type: "Phone Call", text: "Salesman wants to revise this later", created_by: adminLogin.data.user.id }
    });
    assert.equal(activity.response.status, 201);
    assert.equal(activity.data.activity.created_by, salesmanAccount.data.id);

    const correction = await request(baseUrl, `/api/leads/${ownLead.data.id}/activities/0`, {
      method: "PATCH",
      token: salesmanToken,
      csrfToken: salesmanCsrfToken,
      body: { type: "Phone Call", text: "Corrected call appended without changing the original" }
    });
    assert.equal(correction.response.status, 201, JSON.stringify(correction.data));
    assert.equal(correction.data.activity.type, "Correction");
    assert.equal(correction.data.activity.target_activity_id, activity.data.activity.id);
    assert(correction.data.lead.activities.some(item => item.id === activity.data.activity.id));

    const directActivityDelete = await request(baseUrl, `/api/leads/${ownLead.data.id}/activities/1`, {
      method: "DELETE",
      token: adminToken,
      csrfToken: adminCsrfToken,
      body: { admin_password: "AdminPass123!" }
    });
    assert.equal(directActivityDelete.response.status, 405);

    const deletionPath = `/api/leads/${ownLead.data.id}/delete-requests`;
    const deletionBody = { target_type: "activity", activity_id: activity.data.activity.id, reason: "Duplicate activity entry" };
    const adminDecision = { method: "POST", token: adminToken, csrfToken: adminCsrfToken, body: { admin_password: "AdminPass123!" } };
    assert.equal((await request(baseUrl, deletionPath, { ...adminDecision, body: deletionBody })).response.status, 403);
    assert.equal((await request(baseUrl, deletionPath, {
      method: "POST", token: salesmanToken, csrfToken: salesmanCsrfToken, body: { ...deletionBody, reason: "Short" }
    })).response.status, 400);

    const activityDeleteRequest = await request(baseUrl, deletionPath, {
      method: "POST",
      token: salesmanToken,
      csrfToken: salesmanCsrfToken,
      body: deletionBody
    });
    assert.equal(activityDeleteRequest.response.status, 201, JSON.stringify(activityDeleteRequest.data));
    assert.equal(activityDeleteRequest.data.request.request_status, "pending");
    const decisionPath = `${deletionPath}/${activityDeleteRequest.data.request.id}`;
    const pendingIndex = activityDeleteRequest.data.lead.activities.findIndex(item => item.id === deletionBody.activity_id);
    assert.equal((await request(baseUrl, `/api/leads/${ownLead.data.id}/activities/${pendingIndex}`, {
      method: "PATCH", token: salesmanToken, csrfToken: salesmanCsrfToken, body: { type: "Phone Call", text: "Should be locked" }
    })).response.status, 409);
    assert.equal((await request(baseUrl, "/api/activity-deletion-requests", { token: salesmanToken })).response.status, 403);
    assert.equal((await request(baseUrl, "/api/activity-deletion-requests", { token: adminToken })).response.status, 200);
    assert.equal((await request(baseUrl, `${decisionPath}/reject`, adminDecision)).response.status, 400);

    const approveWithoutPassword = await request(baseUrl, `/api/leads/${ownLead.data.id}/delete-requests/${activityDeleteRequest.data.request.id}/approve`, {
      method: "POST",
      token: adminToken,
      csrfToken: adminCsrfToken,
      body: {}
    });
    assert.equal(approveWithoutPassword.response.status, 403);

    const decisions = await Promise.all([
      request(baseUrl, `${decisionPath}/approve`, adminDecision),
      request(baseUrl, `${decisionPath}/approve`, adminDecision)
    ]);
    assert.deepEqual(decisions.map(result => result.response.status).sort(), [200, 409], JSON.stringify(decisions.map(result => result.data)));
    const approved = decisions.find(result => result.response.status === 200).data;
    const archived = approved.lead.activities.find(item => item.id === deletionBody.activity_id);
    assert.equal(archived.archived, true);
    assert(archived.audit_history.some(event => event.action === "activity_archived"));
    const restored = await request(baseUrl, `${decisionPath}/restore`, adminDecision);
    assert.equal(restored.response.status, 200, JSON.stringify(restored.data));
    const restoredActivity = restored.data.lead.activities.find(item => item.id === deletionBody.activity_id);
    assert(!restoredActivity.archived);
    assert(restoredActivity.audit_history.some(event => event.action === "activity_restored"));

    const legacyDb = JSON.parse(fs.readFileSync(dbPath, "utf8"));
    const legacyLead = legacyDb.leads.find(item => item.id === ownLead.data.id);
    const legacyAt = new Date().toISOString();
    for (const [suffix, creator] of [["unattributed", null], ["wrong-creator", adminLogin.data.user.id]]) {
      legacyLead.activities.push(
        { id: `legacy-entry-${suffix}`, type: "Phone Call", at: legacyAt,
          deletion_status: "pending", ...(creator ? { created_by: creator } : {}) },
        { id: `legacy-request-${suffix}`, type: "Activity Review Request", at: legacyAt,
          requested_at: legacyAt, requested_by: salesmanAccount.data.id, delete_request: true,
          target_type: "activity", target_activity_id: `legacy-entry-${suffix}`,
          request_status: "pending", reason: "Legacy duplicate request" }
      );
    }
    fs.writeFileSync(dbPath, JSON.stringify(legacyDb));
    for (const suffix of ["unattributed", "wrong-creator"]) {
      const response = await request(baseUrl, `${deletionPath}/legacy-request-${suffix}/approve`, adminDecision);
      assert.equal(response.response.status, 409, `Approval must reject legacy ${suffix} requests`);
      assert.match(response.data.error, /recorded creator/i);
    }
    const legacyQueue = await request(baseUrl, "/api/activity-deletion-requests", { token: adminToken });
    const legacyRows = legacyQueue.data.filter(item => item.id.startsWith("legacy-request-"));
    assert.equal(legacyRows.length, 2);
    assert(legacyRows.every(item => item.target_available && !item.can_approve && item.approval_block_reason));
    const legacyReject = await request(baseUrl, `${deletionPath}/legacy-request-unattributed/reject`, {
      ...adminDecision, body: { ...adminDecision.body, note: "The original creator was not recorded." }
    });
    assert.equal(legacyReject.response.status, 200);
    assert.equal(legacyReject.data.request.request_status, "rejected");
    assert(!legacyReject.data.lead.activities.find(item => item.id === "legacy-entry-unattributed").archived);
    const legacyWithdraw = await request(baseUrl, `${deletionPath}/legacy-request-wrong-creator/cancel`, {
      method: "POST", token: salesmanToken, csrfToken: salesmanCsrfToken
    });
    assert.equal(legacyWithdraw.response.status, 200);
    assert.equal(legacyWithdraw.data.request.request_status, "cancelled");
    assert(!legacyWithdraw.data.lead.activities.find(item => item.id === "legacy-entry-wrong-creator").archived);

    const meetingActivity = await request(baseUrl, `/api/leads/${ownLead.data.id}/activities`, {
      method: "POST",
      token: salesmanToken,
      csrfToken: salesmanCsrfToken,
      body: { type: "Site Visit", text: "Met procurement team to discuss steel requirements" }
    });
    assert.equal(meetingActivity.response.status, 201, JSON.stringify(meetingActivity.data));

    const linkedPmr = await request(baseUrl, `/api/leads/${ownLead.data.id}/pmrs`, {
      method: "POST",
      token: salesmanToken,
      csrfToken: salesmanCsrfToken,
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
      csrfToken: salesmanCsrfToken,
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
      csrfToken: salesmanCsrfToken,
      body: { target_type: "lead", reason: "Created during test by mistake" }
    });
    assert.equal(leadDeleteRequest.response.status, 400);
    const retainedLeads = await request(baseUrl, "/api/leads", { token: adminToken });
    assert(retainedLeads.data.some(lead => lead.id === ownLead.data.id));

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
