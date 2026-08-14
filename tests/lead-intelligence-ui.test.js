const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const clientSource = fs.readFileSync(path.join(root, "client.js"), "utf8");
const cssSource = fs.readFileSync(path.join(root, "lead-detail-readability.css"), "utf8");

function sourceFunction(name) {
  const start = clientSource.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const parametersStart = clientSource.indexOf("(", start);
  let parametersDepth = 0;
  let parametersEnd = -1;
  for (let index = parametersStart; index < clientSource.length; index += 1) {
    if (clientSource[index] === "(") parametersDepth += 1;
    if (clientSource[index] === ")") parametersDepth -= 1;
    if (parametersDepth === 0) {
      parametersEnd = index;
      break;
    }
  }
  const bodyStart = clientSource.indexOf("{", parametersEnd);
  let depth = 0;
  for (let index = bodyStart; index < clientSource.length; index += 1) {
    if (clientSource[index] === "{") depth += 1;
    if (clientSource[index] === "}") depth -= 1;
    if (depth === 0) return clientSource.slice(start, index + 1);
  }
  throw new Error(`Could not extract ${name}`);
}

const leadIntelligenceUploadMarkup = new Function(
  "escapeHtml",
  `${sourceFunction("leadIntelligenceUploadMarkup")}\nreturn leadIntelligenceUploadMarkup;`
)(value => String(value));

assert.ok(clientSource.includes("function renderDrawerIntel"));
assert.ok(clientSource.includes("function summaryText(value)"));
assert.ok(clientSource.includes("summaryText(summary.salesman_engagement_history)"));
assert.ok(clientSource.includes("leadIntelligenceUploadMarkup(lead.id, { hasReport: Boolean(report), processing })"));
assert.ok(clientSource.includes("/intelligence/upload"));
assert.ok(clientSource.includes("function fetchAuthenticatedBlob(url)"));
assert.ok(clientSource.includes("function downloadAuthenticatedPdf(url)"));
assert.ok(clientSource.includes("function openAuthenticatedPdf(url, popup = null)"));
assert.ok(clientSource.includes("data-lead-intelligence-pdf-download"));
assert.ok(clientSource.includes("data-lead-intelligence-pdf-open"));
assert.ok(clientSource.includes("data-lead-intelligence-pdf-preview"));
assert.ok(!clientSource.includes('href="${escapeHtml(report.download_url)}"'), "protected PDFs must not use direct navigation links");
assert.ok(clientSource.includes("Intelligence PDF saved to the Intel card and AI summary context."));
assert.ok(clientSource.includes("state.leadDrawerIntel = await api(`/api/leads/${encodeURIComponent(uploadedLeadId)}/intel`);"), "failed PDF uploads must refresh the Intel state instead of leaving a stale queued status");
assert.ok(clientSource.includes("report.report.executive_snapshot"));
assert.ok(clientSource.includes("No intelligence report yet."));
assert.ok(clientSource.includes("Generate Intelligence"));
assert.ok(clientSource.includes("Intelligence report is ${escapeHtml(statusLabel)}."));
assert.ok(clientSource.includes("Latest intelligence job failed."));
assert.ok(clientSource.includes("Refresh Intelligence"));
assert.ok(clientSource.includes("Download PDF"));
assert.ok(clientSource.includes("Open in new tab"));
assert.ok(clientSource.includes("data-lead-intelligence-action"));
assert.ok(clientSource.includes("/intelligence/${encodeURIComponent(action)}"));
assert.ok(clientSource.includes("/api/leads/${encodeURIComponent(leadId)}/intel"));
assert.ok(cssSource.includes(".lead-intel-pdf"));
assert.ok(cssSource.includes(".lead-intel-upload-control"));
assert.ok(cssSource.includes("@media (max-width: 720px)"));

const completedReportUpload = leadIntelligenceUploadMarkup("lead-aca", { role: "admin", hasReport: true });
assert.match(completedReportUpload, /Replace PDF/);
assert.match(completedReportUpload, /data-lead-intelligence-upload="lead-aca"/);

const researchingReportUpload = leadIntelligenceUploadMarkup("lead-aca", { role: "manager", hasReport: true, processing: true });
assert.match(researchingReportUpload, /Replace PDF/);
assert.match(researchingReportUpload, /data-lead-intelligence-upload="lead-aca"/);

const salesmanReportUpload = leadIntelligenceUploadMarkup("lead-aca", { role: "salesman", hasReport: true });
assert.match(salesmanReportUpload, /Replace PDF/);
assert.match(salesmanReportUpload, /data-lead-intelligence-upload="lead-aca"/);

console.log("PASS lead intelligence Intel tab UI contract");
