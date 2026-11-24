const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.join(__dirname,"..");
const client=fs.readFileSync(path.join(root,"client.js"),"utf8");

test("Step 1 offers Qatar once and Add manually without rewriting configured territories",()=>{
  const configured=["UAE-North","qatar","Qatar","Netherlands"],options=[];
  const context={state:{settings:{territories:configured}},els:{formTerritory:{add:option=>options.push(option)}},
    fillSelect:(select,values)=>options.push(...Array.from(values)),Option:function(label,value){this.label=label;this.value=value;}};
  vm.createContext(context);
  const start=client.indexOf("  fillSelect(els.formTerritory,[...new Set(");
  assert.notEqual(start,-1);
  vm.runInContext(client.slice(start,client.indexOf("  if (!isAdminOrManager()",start)),context);
  assert.equal(options.filter(value=>value==="Qatar").length,1);
  assert.equal(options.at(-1).label,"Add manually");
  assert.equal(options.at(-1).value,"__custom_territory__");
  assert.deepEqual(configured,["UAE-North","qatar","Qatar","Netherlands"]);
});

test("manual territory input is required only during a new manual registration",()=>{
  let hidden=false,validity="";
  const custom={setCustomValidity:value=>{validity=value;}},option={value:"__custom_territory__"};
  const select={value:option.value,options:[option]};
  const context={state:{editingLeadId:""},els:{formTerritory:select},document:{getElementById:id=>id==="formCustomTerritory" ? custom : {classList:{toggle:(name,value)=>{hidden=value;}}}}};
  vm.createContext(context);
  vm.runInContext(client.slice(client.indexOf("function renderLeadTerritoryInput("),client.indexOf("function activityRecordingElapsedSeconds(")),context);
  context.renderLeadTerritoryInput();assert.equal(hidden,false);assert.equal(custom.required,true);assert.equal(custom.disabled,false);
  select.value="Qatar";context.renderLeadTerritoryInput();assert.equal(hidden,true);assert.equal(custom.required,false);assert.equal(validity,"");
  select.value=option.value;context.state.editingLeadId="existing";context.renderLeadTerritoryInput();assert.equal(option.hidden,true);assert.equal(custom.disabled,true);
});

test("Git-only Territory branch disables its own automatic deployment only",()=>{
  const config=JSON.parse(fs.readFileSync(path.join(root,"vercel.json"),"utf8"));
  assert.deepEqual(config.git.deploymentEnabled,{"codex/lead-territory-options":false});
});
