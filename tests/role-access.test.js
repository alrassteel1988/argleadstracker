const assert = require("assert");
const server = require("../server");

const admin = { id: "admin-1", name: "Glory", email: "glory@alrassteel.com", role: "admin" };
const salesman = { id: "user-1", name: "Ahmed Khan", email: "ahmed@alrassteel.com", role: "salesman" };

const leads = [
  { id: "lead-1", company_name: "Assigned By Name", assigned_salesman: "Ahmed Khan", created_by: "admin-1" },
  { id: "lead-2", company_name: "Assigned By User ID", assigned_salesman: "Other", assigned_to: "user-1", created_by: "admin-1" },
  { id: "lead-3", company_name: "Created By Salesman", assigned_salesman: "Other", created_by: "user-1" },
  { id: "lead-4", company_name: "Other Salesman", assigned_salesman: "Rafiq Ali", created_by: "admin-1" }
];

assert.deepEqual(server.visibleLeadsForUser(leads, admin).map(lead => lead.id), ["lead-1", "lead-2", "lead-3", "lead-4"]);
assert.deepEqual(server.visibleLeadsForUser(leads, salesman).map(lead => lead.id), ["lead-1", "lead-2", "lead-3"]);
assert.equal(server.leadBelongsToUser(leads[3], salesman), false);

const newLeadPayload = server.prepareLeadPayloadForUser({ company_name: "New Lead", assigned_salesman: "Rafiq Ali" }, salesman);
assert.equal(newLeadPayload.assigned_salesman, "Ahmed Khan");
assert.equal(newLeadPayload.assigned_to, undefined);

const updatePayload = server.prepareLeadPayloadForUser(
  { assigned_salesman: "Rafiq Ali", notes: "Updated" },
  salesman,
  { assigned_salesman: "Ahmed Khan" }
);
assert.equal(updatePayload.assigned_salesman, "Ahmed Khan");
assert.equal(updatePayload.notes, "Updated");

console.log("PASS role-scoped salesman lead access");
