// Explicit opt-in. Use only the approved Supabase staging project and synthetic records.
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { once } = require("node:events");

const stagingUrl = "https://grxzqxqgtksunzfhtwox.supabase.co";
assert.equal(process.env.CRM_RUN_ACTIVITY_DELETION_STAGING, "yes");
assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL, stagingUrl);
assert.ok(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
assert.ok(process.env.SUPABASE_SERVICE_ROLE_KEY);
assert.ok(process.env.CRON_SECRET);
process.env.ENABLE_LEAD_INTELLIGENCE_AUTO_QUEUE = "false";
delete process.env.VERCEL;
const server = require("../server");
const runId = randomUUID().slice(0, 8);
const password = `Staging-${randomUUID()}!aA4`;

async function call(url, { method = "GET", headers = {}, body } = {}) {
  const response = await fetch(url, {
    method,
    headers: { ...headers, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return { status: response.status, data: await response.json().catch(() => null) };
}

function expect(result, status, step) {
  assert.equal(result.status, status, `${step}: ${result.data?.code || ""} ${result.data?.error || result.data?.message || ""}`);
  return result.data;
}

function supabase(path, method = "GET", body, token) {
  const key = token ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : process.env.SUPABASE_SERVICE_ROLE_KEY;
  return call(`${stagingUrl}${path}`, {
    method, body, headers: { apikey: key, Authorization: `Bearer ${token || key}`, Prefer: "return=representation" }
  });
}

function crm(path, session, method = "GET", body) {
  return call(`http://127.0.0.1:${server.address().port}${path}`, {
    method, body, headers: {
      ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
      ...(session?.csrf_token ? { "X-CSRF-Token": session.csrf_token } : {})
    }
  });
}

async function createSession(label, role) {
  const email = `deletion-${label}-${runId}@example.test`;
  const fullName = `Staging Deletion ${label} ${runId}`;
  const created = expect(await supabase("/auth/v1/admin/users", "POST",
    { email, password, email_confirm: true, user_metadata: { full_name: fullName } }), 200, "create test user");
  const { id } = created.user || created;
  const profile = await call(`${stagingUrl}/rest/v1/profiles?on_conflict=id`, {
    method: "POST",
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      Prefer: "resolution=merge-duplicates,return=representation"
    },
    body: { id, full_name: fullName, role, status: "active", territory: "UAE-North" }
  });
  assert.ok([200, 201].includes(profile.status), "provision test profile");
  assert.equal(profile.data[0].role, role);
  const session = expect(await crm("/api/auth/login", null, "POST", { email, password }), 200, "sign in to staging");
  assert.equal(session.user.id, id);
  assert.equal(session.user.role, role);
  return session;
}

async function main() {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  console.log(`Staging synthetic run ${runId}`);
  const admin = await createSession("admin", "admin");
  const reviewer = await createSession("reviewer", "admin");
  const salesman = await createSession("salesman", "salesman");
  const other = await createSession("other", "salesman");
  assert.equal(new Set([admin, reviewer, salesman, other].map(session => session.token)).size, 4);
  const due = "2026-06-12";
  // Seed only the synthetic fixture with a stage accepted by the legacy schema.
  const date = new Date().toISOString().slice(0, 10);
  const [lead] = expect(await supabase("/rest/v1/leads", "POST", {
    company_name: `Synthetic Deletion UAT ${runId}`, territory: "UAE-North", lead_status: "PROSPECT",
    assigned_to: salesman.user.id, assigned_salesman: salesman.user.name, created_by: salesman.user.id,
    last_activity: date, next_action: "To Call", next_action_date: due,
    activities: [{ id: `reminder-${runId}`, type: "Reminder", reminder: true, reminder_status: "scheduled",
      activity_required: "To Call", due_date: due, at: date, created_by: salesman.user.id, created_by_name: salesman.user.name },
    { id: `legacy-${runId}`, type: "Email", at: "2026-03-01", text: "Synthetic unattributed legacy entry" }]
  }), 201, "seed owned lead and reminder through Data API");
  const leadPath = `/api/leads/${lead.id}`;
  const rowPath = `/rest/v1/leads?id=eq.${lead.id}`;
  const reminder = lead.activities.find(item => item.reminder && item.due_date === due);
  assert.equal(reminder.created_by, salesman.user.id);
  const queue = "/api/activity-deletion-requests";
  const requests = `${leadPath}/delete-requests`;
  const requestBody = { target_type: "activity", activity_id: reminder.id, reason: "Duplicate synthetic reminder" };
  const submit = async (session, activityId = reminder.id) => expect(await crm(requests, session, "POST",
    { ...requestBody, activity_id: activityId }), 201, "request deletion");
  const decide = (request, action, session = admin, body = {}) => crm(`${requests}/${request.id}/${action}`, session,
    "POST", { admin_password: password, ...body });
  const denied = result => assert.ok([401, 403, 404].includes(result.status), `Expected direct API denial, got ${result.status}`);

  expect(await crm(queue, salesman), 403, "salesman cannot enter approval queue");
  expect(await crm(requests, admin, "POST", requestBody), 403, "admin cannot request a salesman's entry");
  expect(await crm(requests, salesman, "POST", { ...requestBody, reason: "Short" }), 400, "reason length");
  expect(await crm(requests, salesman, "POST", { ...requestBody, target_type: "lead" }), 400, "no lead deletion requests");
  expect(await crm(leadPath, salesman, "DELETE", {}), 403, "no salesman lead deletion");
  const foreign = await crm(requests, other, "POST", requestBody);
  denied(foreign);
  const forged = [{ ...reminder, archived: true }];
  denied(await supabase(rowPath, "PATCH", { activities: forged }, salesman.token));
  denied(await supabase(rowPath, "PATCH", { activities: [reminder] }, salesman.token));
  denied(await supabase(rowPath, "PATCH", { activities: [...lead.activities, { id: "forged-flag", archived: "yes" }] }, salesman.token));
  denied(await supabase(rowPath, "PATCH", { activities: [...lead.activities, { id: "forged-creator", created_by: admin.user.id }] }, salesman.token));
  denied(await supabase(rowPath, "PATCH", { activities: lead.activities.map(item => item.id === reminder.id
    ? { ...item, created_by: other.user.id } : item) }, salesman.token));
  denied(await supabase("/rest/v1/rpc/commit_activity_deletion", "POST", {
    p_lead_id: lead.id, p_expected_updated_at: lead.updated_at, p_patch: { activities: forged }
  }, admin.token));

  const pending = await submit(salesman);
  assert.equal(pending.request.entry_type, "Reminder");
  assert.equal(pending.lead.next_action_date, due);
  expect(await crm(requests, salesman, "POST", requestBody), 409, "no duplicate pending request");
  const pendingIndex = pending.lead.activities.findIndex(item => item.id === reminder.id);
  expect(await crm(`${leadPath}/activities/${pendingIndex}`, salesman, "PATCH", { text: "Attempt to edit" }), 409, "pending entry read-only");
  denied(await supabase(rowPath, "PATCH", { activities: pending.lead.activities.filter(item => item.id !== reminder.id) }, salesman.token));
  denied(await supabase(rowPath, "PATCH", { activities: pending.lead.activities.filter(item => item.id !== pending.request.id) }, admin.token));
  denied(await supabase(rowPath, "PATCH", { next_action_date: "2026-08-01" }, salesman.token));
  const resolution = {
    status: "cancelled", reason: "Duplicate activity", remarks: "Synthetic workflow check only",
    expected_action: "To Call", expected_due: due, expected_updated_at: pending.lead.updated_at,
    request_id: randomUUID()
  };
  expect(await crm(`${leadPath}/followup-resolution`, salesman, "POST", resolution), 409, "pending reminder cannot be cancelled");
  denied(await supabase("/rest/v1/rpc/resolve_lead_followup", "POST",
    { p_lead_id: lead.id, p_input: resolution }, salesman.token));
  const open = expect(await crm(`${queue}?search=${runId}`, admin), 200, "admin pending queue");
  assert.ok((open.requests || open).some(item => item.id === pending.request.id));
  const alerts = expect(await supabase("/rest/v1/notifications?type=eq.activity_deletion_requested&select=payload", "GET", undefined, admin.token), 200, "admin request notification");
  assert.ok(alerts.some(item => item.payload.request_id === pending.request.id));

  expect(await crm("/api/cron/activity-deletion-digest"), 401, "cron secret required");
  const cron = { token: process.env.CRON_SECRET };
  const digest = expect(await crm("/api/cron/activity-deletion-digest", cron), 200, "run weekly digest");
  if (digest.skipped) {
    // The regular job is shared by staging. A separate window rehearses
    // notification delivery on subsequent runs without resetting its state.
    const digestRpc = "/rest/v1/rpc/send_activity_deletion_digest";
    const testWindow = { p_window: `${3000 + parseInt(runId, 16) % 6000}-W01` };
    assert.ok(expect(await supabase(digestRpc, "POST", testWindow), 200, "rehearse digest in unique window") >= 2);
    assert.equal(expect(await supabase(digestRpc, "POST", testWindow), 200, "retry digest write"), 0);
  } else {
    assert.ok(digest.notifications >= 2);
  }
  assert.equal(expect(await crm("/api/cron/activity-deletion-digest", cron), 200, "retry weekly digest").skipped, true);
  const digests = expect(await supabase("/rest/v1/notifications?type=eq.activity_deletion_digest&select=payload", "GET", undefined, admin.token), 200, "admin digest notification");
  assert.ok(digests.some(item => item.payload.requests.some(request => request.request_id === pending.request.id)));
  assert.deepEqual(expect(await supabase("/rest/v1/notifications?type=eq.activity_deletion_digest&select=id", "GET", undefined, salesman.token), 200, "digest private"), []);
  const queueDigest = `${queue}?status=all&include_digest=1`;
  const withDigest = expect(await crm(queueDigest, admin), 200, "admin queue reads its weekly digest");
  assert.ok(withDigest.digest.requests.some(item => item.id === pending.request.id && item.company_name === lead.company_name));
  expect(await crm(queueDigest, salesman), 403, "salesman cannot read admin queue digest");

  expect(await decide(pending.request, "approve", salesman), 403, "salesman cannot approve");
  expect(await decide(pending.request, "cancel", admin), 403, "admin cannot withdraw someone else's request");
  expect(await decide(pending.request, "approve", admin, { admin_password: "" }), 403, "admin password required");
  expect(await decide(pending.request, "reject"), 400, "reject reason required");
  const decisions = await Promise.all([decide(pending.request, "approve"), decide(pending.request, "approve", reviewer)]);
  assert.deepEqual(decisions.map(item => item.status).sort(), [200, 409], JSON.stringify(decisions.map(item => item.data?.error)));
  const approved = decisions.find(item => item.status === 200).data;
  assert.equal(approved.lead.next_action_date, null);
  assert.equal(approved.lead.last_activity, "2026-03-01");
  assert.ok(approved.lead.activities.find(item => item.id === reminder.id).archived);
  const activityLog = expect(await crm(`/api/activities?company=${runId}`, admin), 200, "activity log after approval");
  assert.ok(!activityLog.some(item => item.id === reminder.id));
  const visible = expect(await crm(leadPath, salesman), 200, "salesman read-back after decision");
  assert.equal(visible.next_action_date, null);
  denied(await supabase(rowPath, "PATCH", { activities: visible.activities.map(item => item.id === reminder.id
    ? { ...item, archived: false } : item) }, salesman.token));
  const restored = expect(await decide(pending.request, "restore"), 200, "restore reminder");
  assert.equal(restored.lead.next_action_date, due);
  assert.ok(!restored.lead.activities.find(item => item.id === reminder.id).archived);
  assert.equal(restored.request.request_status, "restored");
  const replace = await submit(salesman);
  expect(await decide(replace.request, "approve"), 200, "archive linked reminder again");
  const newerDue = "2027-01-15";
  expect(await supabase(rowPath, "PATCH", { next_action: "To Send Email", next_action_date: newerDue }, salesman.token),
    200, "schedule a new follow-up");
  const restoreWithNewStep = expect(await decide(replace.request, "restore"), 200, "restore without overwriting a newer follow-up");
  assert.equal(restoreWithNewStep.lead.next_action, "To Send Email");
  assert.equal(restoreWithNewStep.lead.next_action_date, newerDue);

  const activity = expect(await crm(`${leadPath}/activities`, salesman, "POST",
    { type: "Phone Call", text: "Synthetic deletion review activity", created_by: admin.user.id }), 201, "log owned activity");
  assert.equal(activity.activity.created_by, salesman.user.id);
  const withdrawn = await submit(salesman, activity.activity.id);
  expect(await decide(withdrawn.request, "cancel", salesman), 200, "requester withdraws");
  const rejected = await submit(salesman, activity.activity.id);
  expect(await decide(rejected.request, "reject", admin, { note: "Keep this synthetic record in the history." }), 200, "admin rejects with reason");
  const readBack = expect(await crm(leadPath, salesman), 200, "read rejection");
  assert.equal(readBack.activities.find(item => item.id === rejected.request.id).review_note, "Keep this synthetic record in the history.");
  denied(await supabase(rowPath, "PATCH", { activities: readBack.activities.map(item => item.id === activity.activity.id
    ? { ...item, audit_history: [] } : item) }, salesman.token));
  const notices = expect(await supabase("/rest/v1/notifications?type=eq.activity_deletion_rejected&select=payload,message",
    "GET", undefined, salesman.token), 200, "rejection notice");
  assert.ok(notices.some(item => item.payload.request_id === rejected.request.id && item.message.includes("Keep this synthetic record")));

  const adminActivity = expect(await crm(`${leadPath}/activities`, admin, "POST",
    { type: "Email", text: "Synthetic administrator activity" }), 201, "log own admin entry");
  const selfRequest = await submit(admin, adminActivity.activity.id);
  const selfApproved = expect(await decide(selfRequest.request, "approve"), 200, "audited admin self-approval");
  assert.equal(selfApproved.request.requested_by, selfApproved.request.reviewed_by);

  // Recreate the legacy production shape using only this run's synthetic lead.
  const legacyIds = [`legacy-${runId}`, `legacy-wrong-creator-${runId}`];
  const legacyRequests = legacyIds.map((activityId, index) => ({
    id: `legacy-request-${runId}-${index}`, type: "Activity Review Request", at: date,
    requested_at: new Date().toISOString(), requested_by: salesman.user.id, requested_by_name: salesman.user.name,
    delete_request: true, target_type: "activity", target_activity_id: activityId,
    request_status: "pending", reason: "Synthetic pre-upgrade request"
  }));
  expect(await supabase(rowPath, "PATCH", { activities: [
    ...selfApproved.lead.activities.map(item => item.id === legacyIds[0] ? { ...item, deletion_status: "pending" } : item),
    { id: legacyIds[1], type: "Phone Call", at: date, created_by: other.user.id, deletion_status: "pending" },
    ...legacyRequests
  ] }), 200, "seed legacy pending requests on this synthetic lead only");
  const legacyQueue = expect(await crm(`${queue}?search=${runId}`, admin), 200, "legacy pending queue");
  assert.equal(legacyQueue.length, 2);
  assert.ok(legacyQueue.every(item => item.target_available && item.can_approve === false
    && /recorded creator/.test(item.approval_block_reason)));
  for (const legacyRequest of legacyRequests) {
    const blocked = expect(await decide(legacyRequest, "approve"), 409, "block legacy approval");
    assert.match(blocked.error, /recorded creator/i);
  }
  const legacyReadBack = expect(await crm(leadPath, salesman), 200, "read back blocked legacy approvals");
  assert.ok(legacyIds.every(id => !legacyReadBack.activities.find(item => item.id === id).archived));
  assert.ok(legacyRequests.every(request => legacyReadBack.activities.find(item => item.id === request.id).request_status === "pending"));
  const legacyRejected = expect(await decide(legacyRequests[0], "reject", admin, {
    note: "The original creator was not recorded."
  }), 200, "reject unattributed request without archiving");
  assert.equal(legacyRejected.request.request_status, "rejected");
  const legacyWithdrawn = expect(await decide(legacyRequests[1], "cancel", salesman), 200, "withdraw legacy request without archiving");
  assert.equal(legacyWithdrawn.request.request_status, "cancelled");
  const finalQueue = expect(await crm(`${queue}?status=all&search=${runId}`, admin), 200, "decided queue");
  assert.deepEqual((finalQueue.requests || finalQueue).map(item => item.request_status).sort(),
    ["approved", "cancelled", "cancelled", "rejected", "rejected", "restored", "restored"]);
  console.log(`PASS staging: independent sessions, legacy ownership blocks, request lifecycle, role/RLS denial, approval race, due/health inputs, notifications, digest retry. Synthetic run ${runId}.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => server.closeAllConnections?.()).finally(() => server.close());
