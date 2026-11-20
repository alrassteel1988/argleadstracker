const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const supabase = require("../supabase-client");
const users = Object.fromEntries(["admin","sales","peer"].map(role => [role,{id:randomUUID(),name:role,role:role==="admin"?"admin":"salesman",status:"active"}]));
const task = { id:randomUUID(),assignee_id:users.sales.id,status:"completed",version:5,remarks:"Original completion",completed_at:"2026-11-19T08:00:00Z" };
const remarks = Array.from({length:251},(_,i)=>({id:randomUUID(),task_id:task.id,author_id:users.sales.id,author_name:"Salesman",type:"progress_update",text:`Historical entry ${i}`,created_at:"2026-11-19T08:00:00Z"}));
const calls=[];
const noticeId=randomUUID(), hiddenTask=randomUUID();
require.cache[require.resolve("../supabase-client")].exports={...supabase,isSupabaseConfigured:()=>true,isSupabaseAdminConfigured:()=>false,
  currentSupabaseUser:async req=>{const token=supabase.bearerToken(req);return users[token]?{...users[token],token}:null;},
  rest:async(resource,options={})=>{
    calls.push({resource,options}); assert.ok(users[options.token],"Every data operation must keep the caller token");
    const url=new URL(`https://fixture.invalid/${resource}`);
    if(resource.startsWith("management_tasks?")) return options.token==="peer"?[]:[{...task}];
    if(resource.startsWith("management_task_remarks?")) {
      if(options.token==="peer") return [];
      const offset=Number(url.searchParams.get("offset")||0),limit=Number(url.searchParams.get("limit")||250);
      return remarks.slice(offset,offset+limit);
    }
    if(resource==="rpc/append_management_task_remark") {
      assert.equal(options.token,"sales"); assert.deepEqual(options.body,{p_id:task.id,p_expected_version:5,p_text:"Correction"});
      task.version++; remarks.push({id:randomUUID(),task_id:task.id,author_id:users.sales.id,author_name:"Salesman",type:"additional_remark",text:"Correction",created_at:"2026-11-20T08:00:00Z"});
      return {...task};
    }
    if(resource==="rpc/record_management_task_conversation") {
      assert.equal(options.body.p_id,task.id);
      assert.equal(options.body.p_action,options.token==="admin"?"note":"followup");
      assert.equal(options.body.p_input.author_id,undefined); assert.equal(options.body.p_input.status,undefined);
      assert.equal(options.body.p_input.request_id,noticeId);
      if(options.body.p_input.expected_version<task.version) {
        const error=new Error("This task changed. Refresh before trying again");
        error.status=409; error.code="PT409"; throw error;
      }
      return {...task};
    }
    if(resource.startsWith("notifications?")) {
      assert.equal(url.searchParams.get("recipient_uid"),`eq.${users[options.token].id}`);
      assert.equal(url.searchParams.get("type"),`eq.${options.token==="admin"?"management_task_remark":"management_task_note"}`);
      return options.method==="PATCH"?[]:[{id:noticeId,payload:{task_id:task.id}}, {id:randomUUID(),payload:{task_id:hiddenTask}}];
    }
    throw new Error(`Unexpected synthetic request ${resource}`);
  }
};
const server=require("../server");
async function request(path,token,method="GET",body) {
  const response=await fetch(`http://127.0.0.1:${server.address().port}${path}`,{method,headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:body?JSON.stringify(body):undefined});
  return {status:response.status,data:await response.json()};
}
(async()=>{
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  try {
    const list=await request("/api/management-tasks","sales");
    assert.equal(list.status,200);assert.equal(list.data[0].remark_history.length,251,"Do not truncate history at a PostgREST page boundary");
    assert.equal(list.data[0].status,"completed");
    assert.deepEqual((await request("/api/management-tasks","peer")).data,[]);
    for(const token of ["sales","admin"]) for(const method of ["PATCH","DELETE","PUT"]) assert.equal((await request(`/api/management-tasks/${task.id}/remarks/${remarks[0].id}`,token,method,{text:"Forged"})).status,405);
    const original=task.completed_at;
    const appended=await request(`/api/management-tasks/${task.id}/remark`,"sales","POST",{expected_version:5,text:"Correction",author_id:users.peer.id,type:"completion"});
    assert.equal(appended.status,200);assert.equal(appended.data.remark_history.length,252);assert.equal(appended.data.completed_at,original);assert.equal(appended.data.status,"completed");
    assert.equal((await request(`/api/management-tasks/${task.id}/remark`,"admin","POST",{expected_version:6,text:"Forged"})).status,403);
    const salesNotices=await request("/api/management-task-notices","sales");
    assert.equal(salesNotices.status,200); assert.equal(salesNotices.data.length,1,"Filter out inaccessible tasks even if a notice is addressed to this recipient");
    assert.equal((await request("/api/management-task-notices","peer")).data.length,0);
    assert.equal((await request(`/api/management-task-notices/${noticeId}/read`,"peer","POST",{})).status,404);
    assert.equal((await request(`/api/management-task-notices/${noticeId}/read`,"sales","POST",{})).status,200);
    assert.equal((await request("/api/management-task-notices","admin")).status,200);
    for(const [action,token] of [["note","admin"],["followup","sales"]]) {
      const input={request_id:noticeId,expected_version:task.version,text:"Please follow up",next_action_plan:"To Call",next_action_date:"2099-01-01",author_id:users.peer.id,status:"not_started"};
      assert.equal((await request(`/api/management-tasks/${task.id}/${action}`,token,"POST",input)).status,200);
      const stale=await request(`/api/management-tasks/${task.id}/${action}`,token,"POST",{...input,expected_version:task.version-1});
      assert.equal(stale.status,409,"PostgREST PT409 conflicts must reach the form as 409, not 503");
      assert.equal(stale.data.error,"This task changed. Refresh before trying again");
      assert.equal((await request(`/api/management-tasks/${task.id}/${action}`,token==="admin"?"sales":"admin","POST",input)).status,403);
    }
    assert.ok(calls.every(call=>!call.options.serviceRole));
    console.log("PASS task history API pagination, append-only methods, caller tokens and role boundaries");
  } finally {await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
