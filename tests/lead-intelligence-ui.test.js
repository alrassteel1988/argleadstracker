const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const clientSource = fs.readFileSync(path.join(root, "client.js"), "utf8");
const cssSource = fs.readFileSync(path.join(root, "lead-detail-readability.css"), "utf8");
const securityHeadersSource = fs.readFileSync(path.join(root, "src", "config", "securityHeaders.js"), "utf8");

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
const leadIntelligencePdfViewerMarkup = new Function(
  "escapeHtml",
  `${sourceFunction("leadIntelligencePdfViewerMarkup")}\nreturn leadIntelligencePdfViewerMarkup;`
)(value => String(value));
const renderDrawerIntelSource = sourceFunction("renderDrawerIntel");

assert.ok(clientSource.includes("function renderDrawerIntel"));
assert.ok(clientSource.includes("function summaryText(value)"));
assert.ok(clientSource.includes("summaryText(summary.salesman_engagement_history)"));
assert.ok(clientSource.includes("leadIntelligenceUploadMarkup(lead.id, { hasReport: Boolean(report), processing })"));
assert.ok(clientSource.includes("/intelligence/upload"));
assert.ok(clientSource.includes("const uploadInput = event.currentTarget;"), "the upload input must be captured before awaiting the request");
assert.ok(clientSource.includes("const uploadedLeadId = String(uploadInput?.dataset.leadIntelligenceUpload || \"\");"), "the upload lead id must not read event.currentTarget after an await");
assert.ok(clientSource.includes("state.leadDrawerIntel = await api(`/api/leads/${encodeURIComponent(uploadedLeadId)}/intel`);"), "successful PDF uploads must reload the persisted Intel report");
assert.ok(clientSource.includes("function fetchAuthenticatedBlob(url)"));
assert.ok(clientSource.includes("error.status = response.status"), "PDF delivery failures must retain the HTTP status for missing-file handling");
assert.ok(clientSource.includes("function downloadAuthenticatedPdf(url)"));
assert.ok(clientSource.includes("function openAuthenticatedPdf(url, popup = null)"));
assert.ok(clientSource.includes("data-lead-intelligence-pdf-download"));
assert.ok(clientSource.includes("data-lead-intelligence-pdf-open"));
assert.ok(clientSource.includes("data-lead-intelligence-pdf-preview"));
assert.ok(clientSource.includes("leadIntelligenceMissingPdfUrls: new Set()"), "missing PDFs must not be retried on every Intel tab render");
assert.ok(clientSource.includes("PDF file not found, please re-upload."), "the Intel tab must show a clear missing-PDF recovery message");
assert.ok(!clientSource.includes('href="${escapeHtml(report.download_url)}"'), "protected PDFs must not use direct navigation links");
assert.ok(securityHeadersSource.includes("frame-src 'self' blob:"), "the authenticated blob-backed PDF preview must be allowed without permitting Supabase domains");
assert.ok(clientSource.includes("Intelligence PDF saved to the Intel card and AI summary context."));
assert.ok(clientSource.includes("state.leadDrawerIntel = await api(`/api/leads/${encodeURIComponent(uploadedLeadId)}/intel`);"), "failed PDF uploads must refresh the Intel state instead of leaving a stale queued status");
assert.ok(clientSource.includes("report.report.executive_snapshot"));
assert.ok(clientSource.includes("No intelligence report yet."));
assert.ok(clientSource.includes("Generate Intelligence"));
assert.ok(clientSource.includes("Intelligence report is ${escapeHtml(statusLabel)}."));
assert.ok(clientSource.includes("Latest intelligence job failed."));
assert.ok(clientSource.includes("Refresh Intelligence"));
assert.ok(clientSource.includes("Download PDF"));
assert.ok(clientSource.includes("function leadIntelligencePdfViewerMarkup(report, hasPdf)"));
assert.ok(clientSource.includes("clearLeadIntelligencePdfMissing(uploadedLeadId);"), "a successful upload must clear stale missing-file state before reloading the report");
assert.ok(!renderDrawerIntelSource.includes("market_items"), "the Intel tab must not consume the market feed");
assert.ok(!renderDrawerIntelSource.includes("ZAWYA"), "the Intel tab must not reference Zawya");
assert.ok(!renderDrawerIntelSource.includes("Matched market feed items"), "the former Zawya-backed Intel block must be removed");
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

const pdfViewer = leadIntelligencePdfViewerMarkup({ pdf_url: "/api/leads/lead-aca/intelligence/pdf/report-1" }, true);
assert.match(pdfViewer, /View PDF/);
assert.match(pdfViewer, /target="_blank"/);
assert.match(pdfViewer, /rel="noopener noreferrer"/);
assert.match(pdfViewer, /data-lead-intelligence-pdf-open="\/api\/leads\/lead-aca\/intelligence\/pdf\/report-1"/);
assert.ok(!pdfViewer.includes("supabase"), "PDF viewing must use the app's authenticated streaming route");

const noPdfViewer = leadIntelligencePdfViewerMarkup(null, false);
assert.match(noPdfViewer, /disabled/);
assert.match(noPdfViewer, /No report uploaded yet/);

console.log("PASS lead intelligence Intel tab UI contract");
