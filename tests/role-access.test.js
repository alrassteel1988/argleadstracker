const assert = require("assert");
const server = require("../server");

const admin = { id: "admin-1", name: "Glory", email: "glory@alrassteel.com", role: "admin", territory: "Mixed" };
const director = { id: "director-1", name: "Director", email: "director@alrassteel.com", role: "director", territory: "Mixed" };
const salesman = { id: "user-1", name: "Ahmed Khan", email: "ahmed@alrassteel.com", role: "salesman", territory: "UAE-North" };

const leads = [
  { id: "lead-1", company_name: "Same Territory", assigned_salesman: "Other", created_by: "admin-1", territory: "UAE-North" },
  { id: "lead-2", company_name: "Assigned Outside Territory", assigned_salesman: "Other", assigned_to: "user-1", created_by: "admin-1", territory: "UAE-South" },
  { id: "lead-3", company_name: "Mixed Assigned By Name", assigned_salesman: "Ahmed Khan", created_by: "admin-1", territory: "Mixed" },
  { id: "lead-4", company_name: "No Territory", assigned_salesman: "Ahmed Khan", assigned_to: "user-1", created_by: "user-1", territory: "" },
  { id: "lead-5", company_name: "Other Territory", assigned_salesman: "Rafiq Ali", created_by: "admin-1", territory: "Saudi" },
  { id: "lead-6", company_name: "Created By Salesman", assigned_salesman: "Other", created_by: "user-1", territory: "Saudi" }
];

assert.deepEqual(server.visibleLeadsForUser(leads, admin).map(lead => lead.id), ["lead-1", "lead-2", "lead-3", "lead-4", "lead-5", "lead-6"]);
assert.deepEqual(server.visibleLeadsForUser(leads, director).map(lead => lead.id), ["lead-1", "lead-2", "lead-3", "lead-4", "lead-5", "lead-6"]);
assert.deepEqual(server.visibleLeadsForUser(leads, salesman).map(lead => lead.id), ["lead-2", "lead-3", "lead-4", "lead-6"]);
assert.equal(server.leadBelongsToUser(leads[0], salesman), false);
assert.equal(server.leadBelongsToUser(leads[1], salesman), true);
assert.equal(server.leadBelongsToUser(leads[3], salesman), true);
assert.equal(server.leadBelongsToUser(leads[5], salesman), true);

const newLeadPayload = server.prepareLeadPayloadForUser({ company_name: "New Lead", assigned_salesman: "Rafiq Ali", territory: "Saudi" }, salesman);
assert.equal(newLeadPayload.assigned_salesman, "Ahmed Khan");
assert.equal(newLeadPayload.assigned_to, undefined);
assert.equal(newLeadPayload.territory, "UAE-North");

const updatePayload = server.prepareLeadPayloadForUser(
  { assigned_salesman: "Rafiq Ali", territory: "Saudi", notes: "Updated" },
  salesman,
  { assigned_salesman: "Ahmed Khan", territory: "UAE-North" }
);
assert.equal(updatePayload.assigned_salesman, "Ahmed Khan");
assert.equal(updatePayload.territory, "UAE-North");
assert.equal(updatePayload.notes, "Updated");

console.log("PASS strict salesman lead ownership access");
