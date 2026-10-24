const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const client = read("client.js");
const html = read("index.html");
const source = client.match(/function aiWorkspacePage\([^]*?\n\}/)[0];
const page = vm.runInNewContext(`${source}; aiWorkspacePage`);
for (const view of ["ai-actions", "focus", "neglected", "meeting-prep", "draft-email"]) assert.ok(page(view)?.title);
assert.equal(page("unknown"), null);
assert.equal(page("neglected").portfolioAction, "neglected");
assert.equal(page("meeting-prep").companyAction, "prepare");
assert.equal(page("draft-email").companyAction, "email");
assert.equal(page("focus").title, "Today");
assert.match(client, /if \(currentView === "focus" && isSalesmanRole\(\)\) return renderTodayWorkspace\(workspace\)/);
assert.match(client, /function renderTodayWorkspace\(workspace\) \{[^]*?salesmanDashboardSummaryDatasets\(\)[^]*?actionableSalesmanLeads\(\)/);
assert.match(client, /salesmanScheduled: \{[^]*?leads: actionableSalesmanLeads\(\)/);
assert.match(html, /id="aiWorkspaceView" aria-labelledby="aiWorkspaceHeading"/);
assert.match(html, /data-view="ai-actions"[^]*?nav-item-icon/);
assert.match(client, /const leads = \[\.\.\.state\.leads\]\.sort/);
assert.match(client, /escapeHtml\(lead\.company_name \|\| "Unnamed company"\)/);
assert.match(client, /else await runLeadAiAction\(lead, button\.dataset\.workspaceCompanyAction\)/);
assert.match(client, /await runSalespersonAiAction\(button\.dataset\.workspacePortfolioAction\)/);
assert.match(client, /openFlagAttentionModal\(lead\)/);
assert.match(client, /function render\(\)[^]*?renderAiWorkspace\(\);[^]*?applyView\(\);/);
assert.match(client, /if \(!isSalesmanRole\(\) && \["focus", "neglected"\]\.includes\(view\)\) view = "ai-actions"/);
console.log("PASS AI workspace routes, existing action reuse and escaped caller-scoped company selection");

{
  const parse = vm.runInNewContext(`${client.match(/function meetingBriefSections\([^]*?\n\}/)[0]}; meetingBriefSections`);
  const sections = parse("## Recommended ask\r\nConfirm a contact.\r\n## Talking points\n- Recorded demand\n## Additional context\n<untrusted>");
  assert.equal(sections["Recommended ask"].trim(), "Confirm a contact.");
  assert.match(sections["Talking points"], /Recorded demand/);
  assert.equal(sections["Additional context"].trim(), "<untrusted>");
  assert.equal(parse("No headings supplied").Brief.trim(), "No headings supplied");
  assert.equal(parse("## constructor\nSafe text").constructor.trim(), "Safe text");
  assert.match(client, /if \(meetingBriefState === request && String\(state\.currentUser\?\.id\) === request\.owner && currentView === "meeting-prep"\)/);
  assert.match(client, /if \(meetingBriefState\?\.owner !== owner\) meetingBriefState = null/);
  assert.match(client, /state\.leads\.find\(item => String\(item\.id\) === meetingBriefState\.leadId\)/);
  console.log("PASS meeting sections preserve extra output and scope late results to the selected owner and company");
}

{
  const leads = [{id:'a',company_name:'<img src=x>',tier:'1',stage:'NEGOTIATION'}, {id:'b',company_name:'Second',stage:'CONTACTED'}, {id:'c',company_name:'Never',stage:'NEW'}];
  const metrics = {contact_overdue_companies:[
    {id:'b',contact_overdue_by:10,days_since_activity:31,expected_contact_days:21},
    {id:'other-user',contact_overdue_by:999},
    {id:'a',contact_overdue_by:20,days_since_activity:30,expected_contact_days:10},
    {id:'c',contact_overdue_by:null,days_since_activity:null,expected_contact_days:30}
  ]};
  const state = {currentUser:{id:'u',territory:'<script>'},leads,leadsLoaded:true};
  const context = {state, neglectedToolsOpen:false, salesmanDashboardLeads:()=>leads, normalizeStageKey:value=>value,
    stageDisplayLabel:value=>({NEGOTIATION:'Engaged',CONTACTED:'Outreach',NEW:'Prospect'}[value])};
  vm.createContext(context);
  vm.runInContext(`${client.match(/function escapeHtml\([^]*?\n\}/)[0]}; ${client.match(/function neglectedAccountRows\([^]*?\n\}/)[0]}; ${client.match(/function renderNeglectedWorkspace\([^]*?\n\}/)[0]}; let neglectedWorkspace={owner:'u',leads:state.leads,loading:false,metrics:null}; rows=neglectedAccountRows; renderNeglected=renderNeglectedWorkspace; setResult=value=>Object.assign(neglectedWorkspace,value);`,context);
  assert.deepEqual(Array.from(context.rows(metrics),row=>row.id),['c','a','b']);
  const workspace={innerHTML:'',setAttribute:()=>{}};
  context.setResult({metrics}); context.renderNeglected(workspace);
  assert.match(workspace.innerHTML,/&lt;img src=x&gt;/);
  assert.doesNotMatch(workspace.innerHTML,/<img|<script>|other-user|NEGOTIATION/);
  assert.match(workspace.innerHTML,/No activity recorded/);
  assert.match(workspace.innerHTML,/Engaged/);
  assert.match(workspace.innerHTML,/<strong class="is-overdue">3<\/strong>/);
  context.setResult({loading:true}); context.renderNeglected(workspace);
  assert.match(workspace.innerHTML,/Loading contact-frequency/);
  assert.doesNotMatch(workspace.innerHTML,/<strong[^>]*>0<\/strong>/);
  context.setResult({loading:false,error:'Unavailable <script>'}); context.renderNeglected(workspace);
  assert.match(workspace.innerHTML,/Unavailable &lt;script&gt;/);
  context.setResult({error:'',metrics:{contact_overdue_companies:[]}}); context.renderNeglected(workspace);
  assert.match(workspace.innerHTML,/No accounts are past/);
  console.log('PASS Neglected scoped cadence rows, sort, unknown history, escaping and loading/error/empty states');
}

{
  const state = {leadsLoading:true, leadsLoaded:false, leadsError:"", dailyAiLoading:false};
  const datasets = {myLeads:[], stageNew:[], stageContacted:[], stageNegotiation:[], stageWon:[], stageDormant:[], stageLost:[]};
  let queue = [];
  const workspace = {innerHTML:"", setAttribute:() => {}};
  const context = {state, salesmanDashboardSummaryDatasets:() => datasets, actionableSalesmanLeads:() => queue,
    primaryLeadContact:() => ({name:"Contact", email:"test@example.test", phone:"+1 202 555 0101"}),
    daysUntil:() => -3, formatDisplayDate:() => "24 October", encodeURIComponent};
  vm.createContext(context);
  vm.runInContext(`${client.match(/function escapeHtml\([^]*?\n\}/)[0]}; ${client.match(/function renderTodayWorkspace\([^]*?\n\}/)[0]}; run = renderTodayWorkspace;`, context);
  context.run(workspace);
  assert.match(workspace.innerHTML, /Loading your follow-ups/);
  assert.doesNotMatch(workspace.innerHTML, /<strong>0<\/strong>/);
  state.leadsLoading = false;
  state.leadsError = "Synthetic error <script>";
  context.run(workspace);
  assert.match(workspace.innerHTML, /Follow-ups could not be loaded/);
  assert.match(workspace.innerHTML, /Synthetic error &lt;script&gt;/);
  assert.doesNotMatch(workspace.innerHTML, /<strong>0<\/strong>/);
  state.leadsError = "";
  state.leadsLoaded = true;
  context.run(workspace);
  assert.match(workspace.innerHTML, /No scheduled follow-ups/);
  queue = [{id:"safe-id", company_name:'<img src=x onerror="alert(1)">', next_action:"Call"}];
  context.run(workspace);
  assert.match(workspace.innerHTML, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
  assert.doesNotMatch(workspace.innerHTML, /<img src=x/);
  assert.match(workspace.innerHTML, /tel:\+12025550101/);
  assert.match(workspace.innerHTML, /Block status setup is pending/);
  console.log("PASS Today loading, unavailable, empty and escaped record states");
}

(async () => {
  const runSource = client.match(/async function runSalespersonAiAction\([^]*?\n\}/)[0];
  for (const fail of [false, true]) {
    const foreground = {scope:"company", action:"prepare", loading:true, output:"Previous report"};
    const state = {aiAction:foreground, aiCooldownUntil:0, dailyAiLoading:false};
    let clears = 0;
    const context = {
      state, navigator:{onLine:true}, SALESPERSON_ACTION_LABELS:{pipeline_health:"Pipeline health"},
      api:async () => { if (fail) throw new Error("Synthetic unavailable"); return {action:"pipeline_health", metrics:{total_companies:12}, insight:"Recorded metrics"}; },
      setToast:() => {}, renderDailyAiPanel:() => {},
      document:{querySelectorAll:() => []},
      clearInterval:() => { clears++; }
    };
    vm.createContext(context);
    vm.runInContext(`${runSource}; run = runSalespersonAiAction`, context);
    await context.run("pipeline_health", {showDialog:false});
    assert.equal(state.aiAction, foreground, "Silent updates cannot overwrite an active company result");
    assert.equal(state.aiCooldownUntil, 0, "Silent updates cannot start an interactive cooldown");
    assert.equal(clears, 0, "Silent updates cannot stop the active dialog's loading ticker");
    assert.equal(state.dailyAiLoading, false);
    if (!fail) assert.equal(state.dailyPipelineSummary.metrics.total_companies, 12);
  }
  console.log("PASS background metrics success/failure preserve foreground AI dialog state");
})().catch(error => { console.error(error); process.exitCode = 1; });
