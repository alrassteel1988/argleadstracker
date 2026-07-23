const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const client = fs.readFileSync(path.join(root, "client.js"), "utf8");
const css = fs.readFileSync(path.join(root, "pipeline-live-leads.css"), "utf8");
const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
const vercelConfig = fs.readFileSync(path.join(root, "vercel.json"), "utf8");

assert.doesNotMatch(html, /id="pipelineToolbar"/, "Pipeline must not render a separate filter toolbar");
assert.doesNotMatch(html, /data-pipeline-mode=/, "Pipeline must not render a List/Kanban selector");
assert.doesNotMatch(html, /Kanban Pipeline/, "Pipeline must not render the Kanban panel");
assert.match(html, /<h2>Live Leads List<\/h2>/, "Pipeline must expose one Live Leads List panel");
assert.match(html, /id="clearPipelineFilters"/, "Pipeline must expose a clear-all-filters action");
assert.match(html, /id="pipelinePagination"/, "Pipeline must expose shared pagination");
assert.match(html, /id="pipelineReportTools"[\s\S]*id="pipelineReportDateFrom"[\s\S]*id="pipelineReportDateTo"/, "Admin Pipeline must expose an inclusive report due-date range");
assert.match(html, /id="exportPipelineExcel"[\s\S]*Export Excel/, "Admin Pipeline must expose Excel export");
assert.match(html, /id="exportPipelinePdf"[\s\S]*Export PDF/, "Admin Pipeline must expose PDF export");

for (const filter of ["search", "nextAction", "overdue", "dueDate", "salesman", "stage", "priority", "territory"]) {
  assert.match(client, new RegExp(`data-pipeline-filter="${filter}"`), `${filter} must be available as a column filter`);
}

for (const sortKey of ["company", "nextAction", "daysOverdue", "dueDate", "salesman", "stage", "priority", "territory"]) {
  assert.match(client, new RegExp(`pipelineSortableHeader\\("${sortKey}"`), `${sortKey} must be sortable`);
}

assert.match(client, /function pipelineFilteredAndSortedLeads\(\)/, "Pipeline filtering and sorting must be shared");
assert.match(client, /nextAction === "all" \|\| action === nextAction/, "Next Action must combine with existing filters");
assert.match(client, /matchesPipelineOverdueRange/, "Days overdue must use the shared overdue calculation");
assert.match(client, /reportDueDate >= dateFrom[\s\S]*reportDueDate <= dateTo/, "Report date range must filter due dates inclusively");
assert.match(client, /const canExportPipeline = state\.currentUser\?\.role === "admin"/, "Pipeline report tools must be Admin-only");
assert.match(client, /const records = pipelineFilteredAndSortedLeads\(\)/, "Exports must reuse the full filtered and sorted record set");
assert.match(client, /lead_ids:\s*records\.map\(record => record\.id\)/, "Exports must include all matching record IDs across pagination");
assert.match(client, /\/api\/exports\/pipeline-report\.\$\{format\}/, "Client must use the dedicated Pipeline report endpoint");
assert.match(client, /state\.pipelineTable\.page = 1/, "Filter and sort changes must reset pagination");
assert.match(client, /isSalesmanRole\(\)[\s\S]*pipeline-owner-scope/, "Salesman scope must be non-editable");
assert.match(client, /No leads match the selected filters\./, "Filtered empty state must be explicit");
assert.match(client, /Live leads could not be loaded\./, "Pipeline must expose an error state");
assert.doesNotMatch(client, /render\(\)[\s\S]{0,500}renderKanbanView\(\)/, "The main render path must not invoke Pipeline Kanban");

assert.match(css, /\.pipeline-column-row/, "Pipeline must style the first header row");
assert.match(css, /\.pipeline-filter-row/, "Pipeline must style the filter header row");
assert.match(css, /min-width:\s*1120px/, "Table overflow must stay scoped to the table at narrow widths");
assert.match(css, /overflow:\s*auto/, "The worklist must support scoped scrolling");
assert.match(css, /outline:\s*2px solid var\(--bauhaus-blue\)/, "Pipeline controls must have visible keyboard focus");
assert.match(css, /\.pipeline-report-tools/, "Pipeline report controls must use shared responsive toolbar styling");
assert.match(css, /\.pipeline-export-button\.is-excel[\s\S]*var\(--bauhaus-green\)/, "Excel export must have a clear green action style");
assert.match(css, /\.pipeline-export-button\.is-pdf[\s\S]*var\(--bauhaus-red\)/, "PDF export must have a clear red action style");
assert.match(server, /pipeline-report\\\.\(xls\|pdf\)/, "Server must expose Pipeline Excel and PDF report formats");
assert.match(server, /async function pipelineReportLeadsForUser/, "Server must authorize and resolve requested Pipeline records");
assert.match(server, /await exportableLeadsForUser\(user, supabaseEnabled, db\)/, "Pipeline reports must reuse Admin lead authorization");
assert.match(server, /leadsExcelWorkbook\(leads,[\s\S]*worksheetName: "Pipeline Report"/, "Pipeline Excel export must use the existing workbook generator");
assert.match(server, /leadsPdfBuffer\(leads,[\s\S]*Pipeline Live Leads/, "Pipeline PDF export must use the existing PDF generator");
assert.match(vercelConfig, /"src": "pipeline-live-leads\.css"/, "Vercel must build the Pipeline stylesheet");
assert.match(vercelConfig, /"src": "\/pipeline-live-leads\.css", "dest": "\/pipeline-live-leads\.css"/, "Vercel must expose the Pipeline stylesheet");

console.log("Pipeline live-leads UI tests passed");
