const { test } = require("node:test");
const assert = require("node:assert/strict");
const life = require("../src/services/leadLifecycleService");
const server = require("../server");
const { canReadManagementTask, saveLocalManagementTask } = require("../src/services/managementTaskService");

test("company, UAE phone and email identities normalize consistently", () => {
  for (const name of [" Harbor L.L.C. ", "HARBOR LLC", "Harbor FZCO", "Harbor FZE", "Harbor FZ-LLC", "Harbor Trading Co.", "Harbor Est."]) assert.equal(life.companyKey(name),"harbor");
  for (const phone of ["+971 50 123 4567", "00971501234567", "050-123-4567"]) assert.equal(life.phoneKey(phone),"501234567");
  assert.equal(life.matches([{id:"a",company_name:"Other",email:" Contact@Example.test "}],{email:"contact@example.TEST"}).length,1);
  assert.equal(life.matches([{id:"a",company_name:""}],{company_name:"LLC"}).length,0,"Empty normalized names must never collide");
});

test("close broadcasts to every active Admin/Salesman, hides all sales surfaces and preserves tasks/history", () => {
  const admin={id:"a",role:"admin",status:"active",name:"Admin"}, sales={id:"s",role:"salesman",status:"active",name:"Sales"};
  const peer={id:"p",role:"salesman",status:"active",name:"Peer"};
  const lead={id:"l",company_name:"Synthetic Harbor",stage:"NEW",assigned_to:"s",assigned_salesman:"Sales",activities:[{id:"original",text:"Keep history"}]};
  const task={id:"t",lead_id:"l",assignee_id:"s",status:"not_started",due_date:"2099-01-01",version:1};
  const db={users:[admin,sales,peer,{id:"x",role:"salesman",status:"inactive"}],leads:[lead],management_tasks:[task]};
  const activities=structuredClone(lead.activities), originalTask=structuredClone(task);
  assert.throws(()=>life.localLifecycle(db,sales,lead,"close",{closed_reason:"Other"}),/note/);
  life.localLifecycle(db,sales,lead,"close",{closed_reason:"Other",closed_note:"Synthetic explanation"});
  assert.equal(lead.closed_by,sales.id); assert.ok(lead.closed_at); assert.equal(lead.is_archived,true);
  assert.equal(db.notifications.length,3); assert.ok(db.notifications.every(row=>row.lead_id===null && row.message.includes("Please do not contact.")));
  assert.equal(server.leadBelongsToUser(lead,sales),false);
  assert.deepEqual(server.visibleLeadsForUser(db.leads,sales),[]);
  assert.equal(canReadManagementTask(db,sales,task),false);
  assert.throws(()=>saveLocalManagementTask(db,admin,"remind","t",{expected_version:1},new Date().toISOString()),/suspended/);
  assert.throws(()=>life.localLifecycle(db,sales,lead,"restore",{reason:"Not allowed"}),/Admin/);
  life.localLifecycle(db,admin,lead,"restore",{reason:"Reopened synthetic requirement"});
  assert.equal(lead.stage,"NEW"); assert.equal(lead.closed_note,"Synthetic explanation");
  assert.deepEqual(lead.activities,activities); assert.deepEqual(task,originalTask); assert.equal(canReadManagementTask(db,sales,task),true);
  assert.throws(()=>life.localLifecycle(db,admin,lead,"purge",{reason:"Test",company_name:lead.company_name}),/Archive/);
  life.localLifecycle(db,admin,lead,"archive",{reason:"Duplicate fixture"});
  assert.throws(()=>life.localLifecycle(db,admin,lead,"purge",{reason:"Test",company_name:"wrong"}),/exact/);
  life.localLifecycle(db,admin,lead,"purge",{reason:"Synthetic cleanup",company_name:lead.company_name});
  assert.equal(db.leads.length,0); assert.ok(db.lead_lifecycle_events.some(row=>row.action==="purge" && row.lead_id==="l"));
});

test("closed/other-owner duplicates cannot use the legacy bypass and one approval is single use", () => {
  const user={id:"s",role:"salesman"};
  const db={leads:[{id:"l",company_name:"Harbor LLC",assigned_to:"p",assigned_salesman:"Peer",phone:"+971501234567"}]};
  const input={company_name:"Harbor FZE",phone:"0501234567",allow_duplicate:true};
  assert.throws(()=>life.assertLocalDuplicates(db,user,input),error=>error.status===409 && error.details.matches[0].id===undefined && error.details.matches[0].phone===undefined);
  db.lead_duplicate_reviews=[{requested_by:"s",status:"approved",signature:life.signature(db.leads,input),expires_at:new Date(Date.now()+60000).toISOString()}];
  assert.equal(life.assertLocalDuplicates(db,user,input),true);
  assert.throws(()=>life.assertLocalDuplicates(db,user,input),{status:409});
});

test("Salesman deletion/restore requests notify management but only Admin decisions change visibility",()=>{
  const sales={id:"s",role:"salesman",status:"active",name:"Sales"},admin={id:"a",role:"admin",status:"active",name:"Admin"};
  const lead={id:"l",company_name:"Juniper Request Fixture",stage:"NEW",assigned_to:"s",assigned_salesman:"Sales",activities:[{id:"old",text:"Keep"}]};
  const db={leads:[lead],users:[sales,admin],management_tasks:[]}; const original=structuredClone(lead);
  const request=life.requestArchiveReview(db,sales,"archive",{lead_id:"l",reason:"Disqualified",note:"Synthetic reason"});
  assert.deepEqual(lead,original,"Request must not archive, close, update or rewrite the lead");
  assert.equal(db.notifications[0].recipient_uid,"a"); assert.equal(db.notifications[0].type,"lead_lifecycle_request");
  assert.throws(()=>life.reviewArchiveRequest(db,sales,request.id,{approve:true,reason:"Cannot approve"}),{status:403});
  assert.throws(()=>life.requestArchiveReview(db,sales,"archive",{lead_id:"l",reason:"Disqualified",note:"Repeated"}),{status:409});
  life.reviewArchiveRequest(db,admin,request.id,{approve:true,reason:"Confirmed disqualified"});
  assert.equal(lead.is_archived,true); assert.equal(db.leads.length,1); assert.deepEqual(lead.activities,original.activities);
  assert.equal(life.publicMatch(lead,sales).soft_deleted,true);
  const restore=life.requestArchiveReview(db,sales,"restore",{company_name:"JUNIPER Request Fixture LLC",reason:"New steel requirement",note:"Now interested in steel"});
  assert.equal(lead.is_archived,true,"Restore request cannot restore directly");
  assert.throws(()=>life.localLifecycle(db,sales,lead,"restore",{reason:"Bypass"}),{status:403});
  life.reviewArchiveRequest(db,admin,restore.id,{approve:true,lead_id:"l",reason:"Approved renewed requirement"});
  assert.equal(lead.is_archived,false); assert.equal(lead.stage,"NEW"); assert.deepEqual(lead.activities,original.activities);
  assert.ok(db.lead_lifecycle_events.some(row=>row.action==="restore_request_approved"));
});
