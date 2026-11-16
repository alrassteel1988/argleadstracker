const assert = require("node:assert/strict");
const { once } = require("node:events");
const { randomUUID } = require("node:crypto");
const path = require("node:path");

const stagingUrl = "https://grxzqxqgtksunzfhtwox.supabase.co";
assert.equal(process.env.CRM_RUN_SCHEDULE_STAGING, "yes");
assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL, stagingUrl);
assert.ok(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY);
assert.ok(process.env.CRM_DELETION_CHECKOUT);
process.env.ENABLE_LEAD_INTELLIGENCE_AUTO_QUEUE = "false";
delete process.env.VERCEL;
const scheduleServer = require("../server");
const deletionServer = require(path.join(process.env.CRM_DELETION_CHECKOUT, "server.js"));
const run = randomUUID().slice(0, 8);
const password = `Staging-${randomUUID()}!aA4`;
const sessions = [];

async function request(url, method, body, headers) {
  const response = await fetch(url, { method, headers: { ...headers, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  return { status: response.status, data: await response.json().catch(() => null) };
}

function expect(response, status, label) {
  const statuses = Array.isArray(status) ? status : [status];
  assert.ok(statuses.includes(response.status), `${label}: got ${response.status}, expected ${statuses.join("/")}; ${response.data?.code || ""} ${response.data?.error || response.data?.message || ""}`);
  return response.data;
}

function sb(route, method = "GET", body, token) {
  const key = process.env[token ? "NEXT_PUBLIC_SUPABASE_ANON_KEY" : "SUPABASE_SERVICE_ROLE_KEY"];
  return request(stagingUrl + route, method, body, { apikey: key, Authorization: `Bearer ${token || key}`,
    Prefer: "return=representation,resolution=merge-duplicates" });
}

function api(server, route, session, method = "GET", body) {
  return request(`http://127.0.0.1:${server.address().port}${route}`, method, body, session ? {
    Authorization: `Bearer ${session.token}`, "X-CSRF-Token": session.csrf_token || ""
  } : {});
}

async function login(role, suffix = role) {
  const email = `schedule-${suffix}-${run}@example.test`;
  const name = `Synthetic Schedule ${suffix} ${run}`;
  const created = expect(await sb("/auth/v1/admin/users", "POST", {
    email, password, email_confirm: true, user_metadata: { full_name: name }
  }), 200, "provision synthetic Auth user");
  const id = (created.user || created).id;
  expect(await sb("/rest/v1/profiles?on_conflict=id", "POST", {
    id, full_name: name, role, status: "active", territory: "UAE-North"
  }), [200, 201], "provision role");
  const credentials = { email, password };
  const schedule = expect(await api(scheduleServer, "/api/auth/login", null, "POST", credentials), 200, "schedule login");
  const deletion = expect(await api(deletionServer, "/api/auth/login", null, "POST", credentials), 200, "deletion login");
  for (const s of [schedule, deletion]) {
    assert.equal(s.user.id, id);
    assert.equal(s.user.role, role);
    sessions.push(s);
  }
  return { schedule, deletion, id, name };
}

async function main() {
  for (const server of [scheduleServer, deletionServer]) {
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
  }
  console.log(`Staging rehearsal ${run}`);
  const admin = await login("admin");
  const sales = await login("salesman");
  const outside = await login("salesman", "unassigned");
  const sessionIds = sessions.map(({ token }) => JSON.parse(Buffer.from(token.split(".")[1], "base64url")).session_id);
  assert.ok(sessionIds.every(Boolean) && new Set(sessionIds).size === sessions.length);
  const due = "2099-01-01";
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Dubai" });
  const rid = `schedule-reminder-${run}`;
  const [lead] = expect(await sb("/rest/v1/leads", "POST", {
    company_name: `Synthetic Schedule UAT ${run}`, territory: "UAE-North", lead_status: "PROSPECT",
    assigned_to: sales.id, assigned_salesman: sales.name, created_by: sales.id, last_activity: today,
    next_action: "To Call", next_action_date: due,
    activities: [{ id: rid, type: "Reminder", reminder: true, reminder_status: "scheduled", activity_required: "To Call",
      due_date: due, due_time: "10:00", at: today, created_by: sales.id, created_by_name: sales.name }]
  }), 201, "create synthetic scheduled lead");
  const base = `/api/leads/${lead.id}`;
  const row = `/rest/v1/leads?id=eq.${lead.id}`;
  const schedule = (user, method = "GET", body) => api(scheduleServer, `${base}/activity-schedule`, user.schedule, method, body);
  const deletion = (user, suffix, method = "GET", body) => api(deletionServer, `${base}/delete-requests${suffix}`, user.deletion, method, body);
  const decision = (requestId, action, user = admin, note = "") => deletion(user, `/${requestId}/${action}`, "POST",
    { admin_password: password, note });
  const current = async () => expect(await schedule(sales), 200, "read schedule");
  const input = (state, fields) => ({ expected_plan_id: state.plan.id, expected_updated_at: state.updated_at,
    date: "2099-01-02", time: "11:00", priority: "High", agenda: "Synthetic call agenda",
    operation: "submit", reason: "Synthetic schedule change for staging.", ...fields });
  const fresh = await current();
  assert.equal(fresh.needs_review, false);
  expect(await schedule(outside), [403, 404], "unassigned salesperson is blocked");
  expect(await sb(row, "PATCH", { next_action_date: "2099-01-03" }, sales.schedule.token), [401, 403], "reject direct schedule bypass");
  expect(await schedule(sales, "POST", input(fresh)), 200, "salesman reschedules within 48 hours");
  expect(await schedule(sales, "POST", input(fresh)), 409, "stale edit rejected");
  const [durable] = expect(await sb(row), 200, "database read after reschedule");
  assert.equal(durable.activity_schedule.original_due_date, due);
  assert.equal(durable.activity_schedule.original_due_time, "10:00");
  const aged = { ...durable.activity_schedule, created_at: new Date(Date.now() - 49 * 3600000).toISOString() };
  expect(await sb(row, "PATCH", { activity_schedule: aged }), 200, "age only this synthetic plan past 48 hours");
  const expired = await current();
  assert.equal(expired.needs_review, true);
  const pending = expect(await deletion(sales, "", "POST", { target_type: "activity", activity_id: rid,
    reason: "Synthetic duplicate reminder for staging." }), 201, "salesman requests deletion");
  const locked = await current();
  expect(await schedule(sales, "POST", input(locked, { date: "2099-01-03" })), 409, "pending deletion locks rescheduling");
  const cancellation = state => ({ status: "cancelled", reason: "Duplicate activity",
    remarks: "Synthetic staging outcome with audit.", expected_action: state.action, expected_due: state.date,
    expected_revision: "", expected_updated_at: state.updated_at, request_id: randomUUID() });
  const resolve = (s, body) => api(scheduleServer, `${base}/followup-resolution`, s.schedule, "POST", body);
  expect(await resolve(sales, cancellation(locked)), [403, 409], "pending deletion locks outcomes");
  expect(await decision(pending.request.id, "approve", sales), 403, "salesman cannot approve deletion");
  const approved = expect(await decision(pending.request.id, "approve"), 200, "admin approves deletion");
  assert.equal(approved.lead.next_action_date, null);
  assert.ok(approved.lead.activities.find(item => item.id === rid).archived);
  expect(await schedule(sales), 409, "approved archive removes active follow-up");
  expect(await decision(pending.request.id, "restore"), 200, "admin restores the same follow-up");
  const restored = await current();
  assert.equal(restored.plan.id, aged.id);
  assert.equal(restored.plan.created_at, aged.created_at);
  assert.equal(restored.plan.original_due_date, due);
  assert.equal(restored.needs_review, true);
  assert.equal(restored.date, "2099-01-02");
  const queued = expect(await schedule(sales, "POST", input(restored, { date: "2099-01-04" })), 202, "late edit requests review");
  const awaiting = await current();
  assert.equal(awaiting.date, restored.date);
  const review = input(awaiting, { operation: "review", decision: "approve", request_id: awaiting.plan.request.id });
  assert.equal(queued.lead.activity_schedule.request.id, review.request_id);
  expect(await schedule(sales, "POST", review), 403, "salesman cannot approve own reschedule");
  expect(await schedule(admin, "POST", review), 200, "admin approves reschedule");
  const final = await current();
  assert.equal(final.date, "2099-01-04");
  assert.equal(final.plan.original_due_date, due);
  const outcome = cancellation(final);
  const cancelled = expect(await resolve(sales, outcome), 201, "salesman cancels after edit window");
  assert.equal(cancelled.activity.cancelled_by, sales.id);
  assert.equal(cancelled.lead.next_action_date, null);
  assert.equal(expect(await resolve(sales, outcome), 200, "outcome retry").duplicate, true);
  expect(await api(scheduleServer, "/api/activity-schedule-report", sales.schedule), 403, "report is admin-only");
  expect(await api(scheduleServer, "/api/activity-schedule-report", admin.schedule), 200, "admin activity report reads staging");
  const auditPath = `/rest/v1/activity_schedule_events?lead_id=eq.${lead.id}&select=kind,actor_id,plan_id`;
  const events = expect(await sb(auditPath, "GET", undefined, admin.schedule.token), 200, "Admin audit read-back");
  assert.deepEqual(events.map(item => item.kind).sort(), ["cancelled", "reschedule_approved", "reschedule_requested", "rescheduled"]);
  assert.ok(events.every(item => item.plan_id === aged.id && item.actor_id === (item.kind === "reschedule_approved" ? admin.id : sales.id)));
  assert.deepEqual(expect(await sb(auditPath, "GET", undefined, sales.schedule.token), 200, "Salesman audit RLS"), []);
  console.log(`PASS staging ${run}: separate sessions, RLS, stale writes, 48-hour lock, deletion pending/approve/restore, Admin reschedule, audited cancellation and retry.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  await Promise.allSettled(sessions.map(({ token }) => sb("/auth/v1/logout", "POST", undefined, token)));
  for (const server of [scheduleServer, deletionServer]) {
    server.closeAllConnections?.();
    server.close();
  }
});
