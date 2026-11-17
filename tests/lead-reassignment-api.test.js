const assert = require("node:assert/strict");
const path = require("node:path");

const supabasePath = path.join(__dirname, "..", "supabase-client.js");
const leadId = "synthetic-reassignment";
const nextId = "00000000-0000-4000-8000-000000000012";
const users = {
  admin: { id: "admin", name: "Management", role: "admin", status: "active" },
  former: { id: "former", name: "Former Owner", role: "salesman", status: "active" },
  next: { id: nextId, name: "New Owner", role: "salesman", status: "active" },
  manager: { id: "manager", name: "Manager", role: "manager", status: "active" },
  director: { id: "director", name: "Director", role: "director", status: "active" }
};
let lead = {
  id: leadId, company_name: "Synthetic Reassignment Lead", created_by: "former", assigned_to: "former",
  assigned_salesman: "Former Owner", territory: "UAE-North", lead_status: "NEW", latitude: null, longitude: null,
  updated_at: "2026-11-17T06:00:00Z",
  activities: [{ id: "original-activity", type: "Site Visit" }]
};
const patches = [];
const transfers = [];
let transferError;
const actual = require(supabasePath);
require.cache[require.resolve(supabasePath)].exports = {
  ...actual,
  isSupabaseConfigured: () => true,
  isSupabaseAdminConfigured: () => false,
  currentSupabaseUser: async req => {
    const token = actual.bearerToken(req);
    return users[token] ? { ...users[token], token } : null;
  },
  rest: async (resource, { method = "GET", token, body } = {}) => {
    if (resource.startsWith("leads?id=")) {
      if (!["admin", "manager", "director"].includes(token) && users[token]?.id !== lead.assigned_to) return [];
      if (method === "PATCH") {
        // Match PostgREST's rejection for passing a blank string to a nullable double-precision field.
        if (["latitude", "longitude"].some(field => typeof body[field] === "string" && !body[field].trim())) {
          throw Object.assign(new Error('invalid input syntax for type double precision: ""'), { status: 400 });
        }
        patches.push(body);
        lead = { ...lead, ...body };
      }
      return [lead];
    }
    if (resource.startsWith("profiles?role=eq.salesman&status=eq.active&full_name=eq.New%20Owner")
      || resource.startsWith(`profiles?role=eq.salesman&status=eq.active&id=eq.${nextId}`)) {
      return [{ id: nextId, full_name: "New Owner", territory: "UAE-North" }];
    }
    if (resource === "rpc/reassign_lead" && method === "POST") {
      assert.equal(token, "admin");
      if (transferError) throw transferError;
      transfers.push(body);
      assert.equal(body.p_lead_id, leadId);
      assert.equal(body.p_target_id, nextId);
      assert.equal(body.p_expected_updated_at, lead.updated_at);
      lead = { ...lead, ...body.p_patch, assigned_to: nextId, assigned_salesman: "New Owner",
        activities: [{ type: "Handoff" }, ...lead.activities] };
      return lead;
    }
    if (method === "GET" && resource.startsWith("profiles?")) return [];
    throw new Error(`Unexpected Supabase request: ${method} ${resource}`);
  }
};

const server = require("../server");
const route = `/api/leads/${leadId}`;

async function request(token, body) {
  const response = await fetch(`http://127.0.0.1:${server.address().port}${route}`, {
    method: body ? "PATCH" : "GET",
    headers: { Authorization: `Bearer ${token}`, ...(body && { "Content-Type": "application/json" }) },
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: response.status, body: await response.json() };
}

async function verify() {
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  try {
    const reassign = { assigned_salesman: "New Owner", latitude: "", longitude: " " };
    const denied = await request("former", reassign);
    assert.equal(denied.status, 403, JSON.stringify(denied.body));
    assert.equal((await request("manager", { assigned_to: nextId })).status, 403);
    assert.equal((await request("director", reassign)).status, 403);
    assert.equal((await request("admin", { ...reassign, handoff_note: "Too short" })).status, 400);
    assert.equal(patches.length, 0);

    const note = "Transfer the synthetic lead for continued follow-up.";
    const inactive = await request("admin", { assigned_salesman: "Inactive Salesman", handoff_note: note });
    assert.equal(inactive.status, 400);
    transferError = Object.assign(new Error("Could not find the function public.reassign_lead"), { status: 404 });
    assert.equal((await request("admin", { ...reassign, handoff_note: note })).status, 503);
    assert.equal(patches.length, 0, "Missing transactional RPC must never fall back to a direct owner update");
    transferError = undefined;
    const result = await request("admin", { ...reassign, assigned_to: nextId, handoff_note: note });
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.equal(transfers[0].p_patch.latitude, null);
    assert.equal(transfers[0].p_patch.longitude, null);
    assert.equal(transfers[0].p_note, note);
    assert.equal(result.body.assigned_to, nextId);
    assert.equal(result.body.created_by, "former");
    assert.equal(result.body.activities[0].type, "Handoff");
    assert.equal(result.body.activities[1].id, "original-activity");
    assert.equal(transfers.length, 1);
    assert.equal(patches.length, 0);
    assert.equal((await request("former")).status, 404);
    assert.equal((await request("next")).status, 200);

    const coordinates = await request("admin", { latitude: 0, longitude: "55.5" });
    assert.equal(coordinates.status, 200);
    assert.equal(patches[0].latitude, 0);
    assert.equal(patches[0].longitude, 55.5);
    const invalid = await request("admin", { latitude: ["25"] });
    assert.equal(invalid.status, 400);
    assert.equal(patches.length, 1, "Invalid coordinates must not reach Supabase");
    const noCoordinates = await request("admin", { notes: "Owner unchanged" });
    assert.equal(noCoordinates.status, 200);
    assert.equal(Object.hasOwn(patches[1], "latitude"), false);
    assert.equal(Object.hasOwn(patches[1], "longitude"), false);
    console.log("PASS Supabase lead reassignment with blank coordinates, handoff, and role isolation");
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

verify().catch(error => { console.error(error); process.exitCode = 1; });
