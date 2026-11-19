const assert = require("node:assert/strict");
const { test } = require("node:test");
const crypto = require("node:crypto");
const { auditRoute, runAudit, startAdminAudit, completeAdminAudit, auditHeaders, localAuditChanges } = require("../src/services/adminAuditService");

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://synthetic.supabase.test";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "synthetic-anon";
process.env.SUPABASE_SERVICE_ROLE_KEY = "synthetic.service.key";
process.env.APP_SESSION_SECRET = "synthetic-audit-session-secret";
process.env.RATE_LIMIT_HASH_SECRET = "synthetic-audit-hashing-secret";
const clientPath = require.resolve("../supabase-client");
const actualClient = require(clientPath);
const events = [];
let outage = "", businessCalls = 0, validLogin = false;
const admins = Array.from({length:4}, (_,i) => ({id:crypto.randomUUID(),role:"admin",name:`Synthetic Admin ${i}`,status:"active",token:`admin${i}`}));
const sales = { id:crypto.randomUUID(),role:"salesman",name:"Synthetic Salesman",status:"active",token:"sales" };
require.cache[clientPath].exports = { ...actualClient,
  currentSupabaseUser:async req => [...admins,sales].find(user => req.headers.authorization===`Bearer ${user.token}`) || null,
  signIn:async () => {
    if(validLogin) return {access_token:admins[0].token,refresh_token:"private-refresh-token"};
    const error=new Error("Invalid credentials"); error.status=400; throw error;
  },
  signOut:async () => {businessCalls++;},
  serviceRest:async (operation, route, options) => {
    if(operation!=="security.admin_audit") return {allowed:true,count:1,remaining:90};
    assert.equal(route,"rpc/append_admin_access_event");
    const event=options.body.p_event;
    if(event.phase===outage) throw new Error("Database secret must never leak");
    await new Promise(resolve=>setTimeout(resolve,5));
    events.push(event);
    return event.id;
  },
  rest:async route => { businessCalls++; if(route==="rpc/list_admin_audit_events") return events.slice(-10); return []; }
};
const server = require("../server");

test("Admin API awaits audit, isolates four actors, records denials and fails safely", async () => {
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  const call=async (route,token,options={}) => {
    const response=await fetch(base+route,{...options,headers:{Authorization:`Bearer ${token||"invalid"}`,"Content-Type":"application/json"}});
    return {status:response.status,body:await response.text(),headers:response.headers};
  };
  try {
    const results=await Promise.all(admins.map(user=>call("/api/auth/me?secret=must-not-log",user.token)));
    assert(results.every(result=>result.status===200));
    for(const user of admins){
      const own=events.filter(event=>event.actor_id===user.id);
      assert.equal(own.length,2);
      assert.equal(own[0].request_id,own[1].request_id);
      assert.equal(own[1].outcome,"succeeded");
      assert(!JSON.stringify(own).includes(user.token));
    }
    assert(!JSON.stringify(events).includes("must-not-log"));
    let result=await call("/api/admin/audit-events",sales.token);
    assert.equal(result.status,403);
    assert.equal(events.at(-1).actor_id,sales.id);
    assert.equal(events.at(-1).outcome,"denied");
    result=await call("/api/auth/me",null);
    assert.equal(result.status,401);
    assert.equal(events.at(-1).actor_id,null);
    result=await call("/api/auth/login",null,{method:"POST",body:JSON.stringify({email:"fake@example.test",password:"private-test-password"})});
    assert.equal(result.status,401);
    assert.equal(events.at(-1).actor_id,null);
    assert.match(events.at(-1).account_hash,/^[a-f0-9]{64}$/);
    assert(!JSON.stringify(events).includes("fake@example.test"));
    assert(!JSON.stringify(events).includes("private-test-password"));
    validLogin=true;
    result=await call("/api/auth/login",null,{method:"POST",body:JSON.stringify({email:"fake@example.test",password:"private-test-password"})});
    assert.equal(result.status,200);
    assert.equal(events.at(-1).actor_id,admins[0].id);
    assert.equal(events.at(-1).action,"sign_in");
    assert(!JSON.stringify(events).includes("private-refresh-token"));
    result=await call("/api/exports/leads.xls",admins[0].token);
    assert.equal(result.status,200);
    assert.equal(events.at(-1).action,"export");
    result=await call("/api/admin/audit-events?limit=101",admins[0].token);
    assert.equal(result.status,400);
    assert.equal(events.at(-1).outcome,"failed");
    result=await call("/api/auth/logout",admins[1].token,{method:"POST",body:"{}"});
    assert.equal(result.status,200); assert.equal(events.at(-1).action,"sign_out");
    const calls=businessCalls;
    outage="attempt";
    result=await call("/api/auth/logout",admins[0].token,{method:"POST",body:"{}"});
    assert.equal(result.status,503); assert.equal(businessCalls,calls,"No side effect when pre-audit fails");
    outage="result";
    result=await call("/api/auth/me",admins[0].token);
    assert.equal(result.status,503); assert(!result.body.includes(admins[0].name));
    assert(!result.body.includes("Database secret"));
    assert.equal(result.headers.get("cache-control"),"no-store");
    result=await call("/api/exports/leads.xls",admins[0].token);
    assert.equal(result.status,503);
    assert.equal(result.headers.get("content-disposition"),null);
    result=await call("/api/auth/logout",admins[0].token,{method:"POST",body:"{}"});
    assert.equal(result.status,503);
    assert(result.body.includes("may already have committed"));
  } finally { await new Promise(resolve=>server.close(resolve)); }
});

test("Privacy-limited routing, local changes and trusted request headers",async()=>{
  const url=new URL("https://example.test/api/leads/00000000-0000-4000-8000-000000000010/private-customer-name?signature=secret");
  assert.deepEqual(auditRoute(url),{route:"/api/leads/:id/:redacted",record_id:"00000000-0000-4000-8000-000000000010"});
  const saved=[];
  await runAudit({method:"PATCH"},url,async event=>saved.push(event),async()=>{
    await startAdminAudit(admins[0]);
    assert.equal(auditHeaders()["x-crm-audit-actor-id"],admins[0].id);
    const changes=localAuditChanges({leads:[{id:"one",notes:"private old",created_by:sales.id}]},
      {leads:[{id:"one",notes:"private new",created_by:sales.id}]});
    assert.deepEqual(changes[0].changed_fields,["notes"]);
    assert(!JSON.stringify(changes).includes("private new"));
    await completeAdminAudit(200,{"Content-Disposition":"attachment"});
  });
  assert.equal(saved.at(-1).action,"download");
  assert.deepEqual(auditHeaders(),{});
});

test("Audit service credential cannot be reused for other tables",async()=>{
  await assert.rejects(actualClient.serviceRest("security.admin_audit","leads",{method:"POST"}),/restricted to the append-only writer/);
});

test("Supabase request tracing uses verified context instead of supplied attribution",async()=>{
  const originalFetch=global.fetch;
  try{
    global.fetch=async(url,options)=>{
      assert.equal(options.headers["x-crm-audit-actor-id"],admins[2].id);
      assert.equal(options.headers.Authorization,"Bearer verified-user-token");
      assert.match(options.headers["x-crm-audit-request-id"],/^[0-9a-f-]{36}$/);
      return {ok:true,json:async()=>[]};
    };
    await runAudit({method:"PATCH"},new URL("https://example.test/api/leads"),async()=>{},async()=>{
      await startAdminAudit(admins[2]);
      await actualClient.rest("leads",{method:"PATCH",token:"verified-user-token",
        headers:{"x-crm-audit-actor-id":"forged"},body:{notes:"Not an audit value"}});
    });
  }finally{global.fetch=originalFetch;}
});
