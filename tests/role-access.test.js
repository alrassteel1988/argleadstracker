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
assert.deepEqual(server.visibleLeadsForUser(leads, salesman).map(lead => lead.id), ["lead-2", "lead-3", "lead-4"]);
assert.equal(server.leadBelongsToUser(leads[0], salesman), false);
assert.equal(server.leadBelongsToUser(leads[1], salesman), true);
assert.equal(server.leadBelongsToUser(leads[3], salesman), true);
assert.equal(server.leadBelongsToUser(leads[5], salesman), false);

const newLeadPayload = server.prepareLeadPayloadForUser({ company_name: "New Lead", assigned_salesman: "Rafiq Ali", territory: "Saudi" }, salesman);
assert.equal(newLeadPayload.assigned_salesman, "Ahmed Khan");
assert.equal(newLeadPayload.assigned_to, undefined);
assert.equal(newLeadPayload.territory, "Saudi");

for (const territory of ["Qatar", "India", "Netherlands", "Turkmenistan", "Romania", "  New   Zealand  "]) {
  const payload = server.prepareLeadPayloadForUser({company_name:"Synthetic international",territory,assigned_to:"other",created_by:"other"},salesman);
  const row = server.toSupabaseLead(payload,salesman,{newRegistration:true});
  assert.equal(row.territory,territory.trim().replace(/\s+/g," "));
  assert.equal(row.created_by,salesman.id);
  assert.equal(row.assigned_to,salesman.id);
  assert.equal(row.assigned_salesman,salesman.name);
  assert.equal(server.leadBelongsToUser(row,{...salesman,id:"peer",name:"Peer"}),false);
}
for (const territory of ["x".repeat(101),"India\nPrivate", "__custom_territory__", {country:"India"}]) {
  assert.throws(()=>server.prepareLeadPayloadForUser({territory},salesman),{status:400});
  assert.throws(()=>server.toSupabaseLead({territory},admin,{newRegistration:true}),{status:400});
}

const exactTerritorySalesman = { ...salesman, territory: "Dubai" };
const supabaseLeadPayload = server.toSupabaseLead(
  { company_name: "Supabase Salesman Lead", assigned_salesman: "Other", assigned_to: "other-user", territory: "Saudi" },
  exactTerritorySalesman
);
assert.equal(supabaseLeadPayload.assigned_salesman, "Ahmed Khan");
assert.equal(supabaseLeadPayload.assigned_to, "user-1");
assert.equal(supabaseLeadPayload.created_by, "user-1");
assert.equal(supabaseLeadPayload.territory, "Dubai");
assert.equal(
  server.canUseServerValidatedLeadInsert(exactTerritorySalesman, supabaseLeadPayload),
  true
);
assert.equal(
  server.canUseServerValidatedLeadInsert(admin, {
    ...supabaseLeadPayload,
    created_by: admin.id,
    assigned_to: admin.id,
    assigned_salesman: admin.name,
    territory: admin.territory
  }),
  false
);
assert.equal(
  server.canUseServerValidatedLeadInsert(exactTerritorySalesman, {
    ...supabaseLeadPayload,
    assigned_to: "other-user"
  }),
  false
);
assert.equal(
  server.canUseServerValidatedLeadInsert(exactTerritorySalesman, {
    ...supabaseLeadPayload,
    territory: "Saudi"
  }),
  false
);

const updatePayload = server.prepareLeadPayloadForUser(
  { assigned_salesman: "Rafiq Ali", territory: "Saudi", notes: "Updated" },
  salesman,
  { assigned_salesman: "Ahmed Khan", territory: "UAE-North" }
);
assert.equal(updatePayload.assigned_salesman, "Ahmed Khan");
assert.equal(updatePayload.territory, "UAE-North");
assert.equal(updatePayload.notes, "Updated");
assert.equal(server.prepareLeadPayloadForUser({territory:"Qatar",notes:"Updated"},salesman,
  {assigned_salesman:salesman.name,territory:"Netherlands"}).territory,"Netherlands","Ordinary edits preserve a custom customer territory");

console.log("PASS strict salesman lead ownership access");
