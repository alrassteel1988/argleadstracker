const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const css = read("crm-data.css");
const html = read("index.html");
const vercel = JSON.parse(read("vercel.json"));
assert.match(css, /#metricsPanel > article\s*\{[^}]*background:\s*var\(--crm-surface\)/s);
assert.match(css, /\.live-lead-table :is\(th, td\)\s*\{[^}]*var\(--crm-divider\)[^}]*font-size:\s*14px/s);
assert.match(css, /\.pipeline-lead-table\s*\{[^}]*min-width:\s*1120px/s);
assert.match(css, /\.pipeline-filter-row th\s*\{[^}]*top:\s*44px/s);
assert.match(css, /#leadList\s*\{[^}]*overflow:\s*auto/s);
assert.match(css, /\.pipeline-pagination\s*\{[^}]*padding-inline-end:\s*168px/s);
assert.match(read("crm-shell.css"), /body #appToast\s*\{[^}]*pointer-events:\s*none/s);
assert.match(css, /th\[aria-sort="ascending"\][^\n]*--crm-icon-chevron-up/);
assert.match(css, /\.pipeline-filter-row :is\(input, select\)\.is-active\s*\{[^}]*border:\s*2px solid var\(--crm-navy\)/s);
assert.match(css, /@media \(max-width: 720px\)[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/s);
assert.doesNotMatch(css, /gradient\(|rgba\(|backdrop-filter|filter:\s*blur|opacity:\s*0\./);
assert.ok(html.indexOf('/crm-data.css?v=') > html.indexOf('/crm-dashboard.css?v='));
assert.ok(html.indexOf('/mobile-ui.css?v=') > html.indexOf('/crm-data.css?v='));
assert.ok(vercel.builds.some(item => item.src === "crm-data.css" && item.use === "@vercel/static"));
assert.ok(vercel.routes.some(item => item.src === "/crm-data.css" && item.dest === "/crm-data.css"));
assert.ok(read("sw.js").includes('"/crm-data.css"'));
assert.match(css, /\.pipeline-lead-table thead\s*\{[^}]*overflow-x:\s*auto/s);
assert.match(css, /\.pipeline-lead-table \.lead-table-row\s*\{[^}]*display:\s*grid[^}]*repeat\(2, minmax\(0, 1fr\)\)/s);
assert.match(css, /td\[data-label\]::before\s*\{[^}]*content:\s*attr\(data-label\)/s);
const client = read("client.js");
const functionSource = name => client.match(new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`))[0];
let salesmanRole = false;
const rowMarkup = vm.runInNewContext(`${functionSource("escapeHtml")}\n${functionSource("pipelineLeadRowMarkup")}\npipelineLeadRowMarkup`, {
  state: {selectedId:""},
  isSalesmanRole: () => salesmanRole,
  primaryLeadContact: () => ({phone:'+12025550101" onclick="bad',name:'<unsafe>'}),
  leadTablePresentation: () => ({plan:{action:"To Call"},dueDate:"",overdueTone:"red",overdueLabel:"3 days",
    priorityLabel:"Hot",priorityTone:"red",stageKey:"new",companyMeta:"Demo location"}),
  stageDisplayLabel: () => "Prospect", inferEmirate: () => "", formatPlanDate: value => value
});
const rendered = rowMarkup({id:"test-lead",company_name:'<img src=x onerror="bad">',assigned_salesman:"Demo"});
assert.equal((rendered.match(/<td[ >]/g)||[]).length, 9, "Mobile cards retain every table cell");
assert.equal((rendered.match(/data-label=/g)||[]).length, 7, "Metadata stays labeled on mobile");
assert.match(rendered, /href="tel:\+12025550101&quot; onclick=&quot;bad"/);
assert.doesNotMatch(rendered, /<img|onclick="bad/);
salesmanRole = true;
const salesmanRow = rowMarkup({id:'lead"unsafe',company_name:'<img src=x>',stage:'NEW'});
assert.match(salesmanRow,/data-pipeline-log="lead&quot;unsafe"/);
assert.match(salesmanRow,/salesman-pipeline-due/);
assert.equal((salesmanRow.match(/<td[ >]/g)||[]).length,9);
assert.doesNotMatch(salesmanRow,/<img|onclick="bad/);
console.log("PASS shared CRM metric, table, badge, state and static asset presentation contracts");
