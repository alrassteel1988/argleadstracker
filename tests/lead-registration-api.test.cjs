const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { nextManagementWorkingDate } = require("../src/services/managementTaskService");

for (const key of ["ENABLE_GOOGLE_PLACES", "ENABLE_CLAUDE_ENRICHMENT", "ENABLE_LEAD_INTELLIGENCE_AUTO_QUEUE"]) process.env[key] = "false";
const supabase = require("../supabase-client");
const users = {
  admin: { id: randomUUID(), role: "admin", status: "active", name: "Test Admin", territory: "Mixed" },
  sales: { id: randomUUID(), role: "salesman", status: "active", name: "Test Salesman", territory: "UAE-North" }
};
const writes = [];
require.cache[require.resolve("../supabase-client")].exports = {
  ...supabase,
  isSupabaseConfigured: () => true,
  isSupabaseAdminConfigured: () => false,
  currentSupabaseUser: async req => {
    const token = supabase.bearerToken(req);
    return users[token] ? { ...users[token], token } : null;
  },
  rest: async (resource, { method = "GET", token, body } = {}) => {
    if (method === "GET" && resource.startsWith("profiles?")) {
      return [{ id: users.sales.id, full_name: users.sales.name, role: "salesman", status: "active" }];
    }
    if (method === "GET" && /^(leads|companies)\?/.test(resource)) return [];
    if (resource === "rpc/save_initial_management_lead") {
      assert.equal(token, "admin", "The caller token must be preserved");
      writes.push({ resource, body });
      return { ...body.p_lead, id: randomUUID(), next_action: "", next_action_date: null };
    }
    if (method === "POST" && /^(leads|companies)\?/.test(resource)) {
      writes.push({ resource, body });
      return [{ ...body, id: randomUUID() }];
    }
    throw new Error(`Unexpected synthetic Supabase request: ${method} ${resource}`);
  }
};
const server = require("../server");
async function create(token, body) {
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/leads`, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body)
  });
  return { status: response.status, body: await response.json() };
}
(async () => {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    for (const title of ["New Lead Outreach", "Respond to Initial RFQ"]) {
      const saved = await create("admin", { company_name: `Synthetic ${title}`, assigned_to: users.sales.id,
        initial_management_task_title: title, next_action_date: "2099-01-01", notes: "Retain the buyer instructions." });
      assert.equal(saved.status, 201, JSON.stringify(saved.body));
      const sent = writes.at(-1).body.p_lead;
      assert.equal(sent.next_action, title);
      assert.equal(sent.next_action_date, nextManagementWorkingDate(new Date()));
      assert.equal(sent.created_by, users.admin.id);
      assert.equal(sent.assigned_to, users.sales.id);
      assert.equal(sent.notes, "Retain the buyer instructions.");
      assert.ok(sent.initial_management_task_id);
      assert.equal(sent.activities.length, 0);
      assert.ok(!Object.hasOwn(sent, "initial_management_task_title"), "UI-only field must not leak into SQL columns");
    }
    assert.equal(writes.length, 2, "Admin registration must use only the atomic company/lead/task RPC");
    const badTitle = await create("admin", { company_name: "Invalid choice fixture", assigned_to: users.sales.id, initial_management_task_title: "Invented" });
    assert.equal(badTitle.status, 400);
    assert.equal(writes.length, 2, "Invalid choice must not create an orphan company");
    for (const body of [{}, { next_action: "", next_action_date: "", notes: "Notes only" }]) {
      const saved = await create("sales", { company_name: "Own optional follow-up fixture", initial_management_task_title: "Respond to Initial RFQ", ...body });
      assert.equal(saved.status, 201, JSON.stringify(saved.body));
      const sent = writes.at(-1).body;
      assert.equal(sent.next_action, "");
      assert.equal(sent.next_action_date, null);
      assert.deepEqual(sent.activities, []);
      assert.equal(sent.assigned_to, users.sales.id);
      assert.ok(!sent.initial_management_task_id);
    }
    const beforeInvalid = writes.length;
    for (const body of [{ next_action: "To Call" }, { next_action_date: "2099-01-01" }, { next_action: "To Call", next_action_date: "2099-02-30" }]) {
      assert.equal((await create("sales", { company_name: "Incomplete schedule fixture", ...body })).status, 400);
    }
    assert.equal(writes.length, beforeInvalid);
    const scheduled = await create("sales", { company_name: "Explicit schedule fixture", next_action: "To Visit", next_action_date: "2099-01-01" });
    assert.equal(scheduled.status, 201, JSON.stringify(scheduled.body));
    assert.equal(writes.at(-1).body.activities.filter(item => item.reminder).length, 1);
    console.log("PASS Supabase new-lead API task choices, atomic writes, optional follow-ups and role isolation");
  } finally { await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
