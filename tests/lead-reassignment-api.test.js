const assert = require("node:assert/strict");
const fs = require("node:fs");
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
  assigned_salesman: "Former Owner", territory: "UAE-North", lead_status: "PROSPECT", latitude: null, longitude: null,
  updated_at: "2026-11-17T06:00:00Z",
  activities: [{ id: "original-activity", type: "Site Visit" }]
};
const patches = [];
const transfers = [];
let transferError;
let postgres;
// Include the visible, collapsed, and hidden controls serialized by Edit Lead.
const editForm = {
  company_name: "Synthetic Reassignment Lead", assigned_salesman: "New Owner", territory: "UAE-North",
  sector: "Fabricator", tier: "1", country_emirate: "Dubai, UAE", location: "UAE-North", legal_name: "",
  year_established: "", industry: "", business_category: "", address: "", website: "", google_maps_url: "",
  contact_person: "", phone: "", email: "", stage: "NEW", priority: "Warm", primary_contact_title: "",
  estimated_value: 0, secondary_contact_name: "", secondary_contact_title: "", secondary_contact_mobile: "",
  secondary_contact_email: "", tags: "", quotation_ref: "", product_interest: "", next_action: "To Call",
  next_action_date: "", activity_purpose: "Company Introductory", notes: "Synthetic handoff", estimated_monthly_volume: "",
  first_order_date: "", products_services_remarks: "", google_place_id: "", google_rating: "", google_review_count: "0",
  latitude: "", longitude: "", opening_hours: "Mon: 09:00-17:00\nTue: 09:00-17:00", enrichment_source: "",
  enrichment_status: "pending", enriched_at: ""
};
async function validateDatabasePatch(body) {
  if (postgres) {
    // The audited RPC uses this cast, and both write paths face the same status constraint.
    await postgres.query(`update public.leads current_lead
      set lead_status = case when $1::jsonb ? 'lead_status' then patch.lead_status else current_lead.lead_status end
      from jsonb_populate_record(null::public.leads, $1::jsonb) patch`, [JSON.stringify(body)]);
  }
}
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
        await validateDatabasePatch(body);
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
      await validateDatabasePatch(body.p_patch);
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
  if (process.env.CRM_TEST_PGLITE_MODULE) {
    const { PGlite } = require(process.env.CRM_TEST_PGLITE_MODULE);
    postgres = new PGlite();
    const blueprint = fs.readFileSync(path.join(__dirname, "..", "supabase", "migrations", "20260603130000_blueprint_phase1_foundation.sql"), "utf8");
    const statusConstraint = blueprint.match(/^alter table public\.leads add constraint leads_status_blueprint_check\s+check \([^;]+\);/m);
    assert.ok(statusConstraint, "Blueprint status constraint is required for this fixture");
    await postgres.exec(`create table public.leads (
      lead_status text not null,
      estimated_value numeric(14,2), google_rating numeric(3,2), google_review_count integer,
      latitude double precision, longitude double precision, opening_hours jsonb,
      next_action_date date, first_order_date date, enriched_at timestamptz, enrichment_updated_at timestamptz,
      lost_at timestamptz, lost_by uuid
    );
    ${statusConstraint[0]}
    insert into public.leads (lead_status) values ('PROSPECT');`);
  }
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  try {
    const reassign = { assigned_salesman: "New Owner", latitude: "", longitude: " ", google_rating: "" };
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
    const changedStage = await request("admin", { ...editForm, stage: "CONTACTED", assigned_to: nextId, handoff_note: note });
    assert.equal(changedStage.status, 400);
    assert.match(changedStage.body.error, /Save the stage change separately/);
    assert.equal(transfers.length, 0);
    const result = await request("admin", { ...editForm, assigned_to: nextId, handoff_note: note, lost_reason: "must not be written" });
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.equal(Object.hasOwn(transfers[0].p_patch, "lead_status"), false);
    assert.equal(Object.hasOwn(transfers[0].p_patch, "lost_reason"), false);
    assert.equal(lead.lead_status, "PROSPECT");
    assert.equal(result.body.stage, "NEW");
    if (postgres) {
      assert.equal((await postgres.query("select lead_status from public.leads")).rows[0].lead_status, "PROSPECT");
    }
    assert.equal(transfers[0].p_patch.latitude, null);
    assert.equal(transfers[0].p_patch.longitude, null);
    assert.equal(transfers[0].p_patch.google_rating, null);
    assert.equal(transfers[0].p_patch.next_action_date, null);
    assert.equal(transfers[0].p_patch.enriched_at, null);
    assert.equal(transfers[0].p_patch.google_review_count, "0");
    assert.deepEqual(transfers[0].p_patch.opening_hours, ["Mon: 09:00-17:00", "Tue: 09:00-17:00"]);
    assert.equal(Object.hasOwn(transfers[0].p_patch, "first_order_date"), false);
    assert.equal(transfers[0].p_note, note);
    assert.equal(result.body.assigned_to, nextId);
    assert.equal(result.body.created_by, "former");
    assert.equal(result.body.activities[0].type, "Handoff");
    assert.equal(result.body.activities[1].id, "original-activity");
    assert.equal(transfers.length, 1);
    assert.equal(patches.length, 0);
    assert.equal((await request("former")).status, 404);
    assert.equal((await request("next")).status, 200);

    const coordinates = await request("admin", { latitude: 0, longitude: "55.5", google_rating: "4.5",
      next_action_date: "2026-11-18", enriched_at: "2026-11-17T06:00:00Z", enrichment_updated_at: " ",
      google_review_count: "", opening_hours: "" });
    assert.equal(coordinates.status, 200);
    assert.equal(patches[0].latitude, 0);
    assert.equal(patches[0].longitude, 55.5);
    assert.equal(patches[0].google_rating, 4.5);
    assert.equal(patches[0].next_action_date, "2026-11-18");
    assert.equal(patches[0].enriched_at, "2026-11-17T06:00:00Z");
    assert.equal(patches[0].enrichment_updated_at, null);
    assert.equal(patches[0].google_review_count, 0);
    assert.deepEqual(patches[0].opening_hours, []);
    const invalid = await request("admin", { latitude: ["25"] });
    assert.equal(invalid.status, 400);
    const invalidRating = await request("admin", { google_rating: "not rated" });
    assert.equal(invalidRating.status, 400);
    assert.equal(patches.length, 1, "Invalid numeric fields must not reach Supabase");
    const noCoordinates = await request("admin", { notes: "Owner unchanged" });
    assert.equal(noCoordinates.status, 200);
    assert.equal(Object.hasOwn(patches[1], "latitude"), false);
    assert.equal(Object.hasOwn(patches[1], "longitude"), false);
    assert.equal(Object.hasOwn(patches[1], "google_rating"), false);
    assert.equal(Object.hasOwn(patches[1], "next_action_date"), false);
    assert.equal(Object.hasOwn(patches[1], "enriched_at"), false);
    const leadDetails = {
      sector: "Piling", tier: "3", country_emirate: "Dubai, UAE", primary_contact_title: "Buyer",
      secondary_contact_name: "Test Backup Contact", secondary_contact_title: "Assistant",
      secondary_contact_mobile: "+12025550101", secondary_contact_email: "backup@example.test",
      tags: "synthetic", quotation_ref: "TEST-123", estimated_monthly_volume: "25 MT/month"
    };
    const blockedScheduleEdit = await request("admin", {...editForm, ...leadDetails});
    assert.equal(blockedScheduleEdit.status, 409, "Full Edit Lead cannot clear an active schedule outside its audited controls");
    assert.equal(patches.length, 2);
    const ordinaryEdit = await request("admin", {...editForm, ...leadDetails, next_action:lead.next_action, next_action_date:lead.next_action_date,
      contact_person: "Test Contact", email: "buyer@example.test", first_order_date: "2026-12-01"});
    assert.equal(ordinaryEdit.status, 200, JSON.stringify(ordinaryEdit.body));
    assert.equal(Object.hasOwn(patches[2], "lead_status"), false);
    assert.equal(transfers.length, 1, "Editing lead details must not run another handoff");
    for (const [field, value] of Object.entries(leadDetails)) assert.equal(ordinaryEdit.body[field], value, field);
    assert.equal(ordinaryEdit.body.contact_person, "Test Contact");
    assert.equal(ordinaryEdit.body.email, "buyer@example.test");
    assert.equal(ordinaryEdit.body.first_order_date, "2026-12-01");
    const oldDetails = { first_order_date: "2026-12-01", estimated_monthly_volume: "125 MT", products_services_remarks: "Previously saved steel requirements." };
    Object.assign(lead, oldDetails);
    const editWithoutRetiredFields = { ...editForm, assigned_salesman: "New Owner", sector: "Piling",
      next_action:lead.next_action, next_action_date:lead.next_action_date };
    for (const field of Object.keys(oldDetails)) delete editWithoutRetiredFields[field];
    const preservedDetails = await request("admin", editWithoutRetiredFields);
    assert.equal(preservedDetails.status, 200, JSON.stringify(preservedDetails.body));
    for (const [field, value] of Object.entries(oldDetails)) {
      assert.equal(preservedDetails.body[field], value, `Removing the form control must preserve saved ${field}`);
      assert.equal(Object.hasOwn(patches.at(-1), field), false);
    }
    const clearOrderDate = await request("next", {first_order_date: ""});
    assert.equal(clearOrderDate.status, 200);
    assert.equal(clearOrderDate.body.first_order_date, null);
    const deniedEdit = await request("former", {sector: "Contractor"});
    assert.equal(deniedEdit.status, 404);
    console.log("PASS Supabase lead reassignment with a full Edit Lead payload, audit, and role isolation");
  } finally {
    await new Promise(resolve => server.close(resolve));
    await postgres?.close();
  }
}

verify().catch(error => { console.error(error); process.exitCode = 1; });
