const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const css = fs.readFileSync(path.join(root, "lead-detail-readability.css"), "utf8");
const contrastCss = fs.readFileSync(path.join(root, "lead-detail-contrast.css"), "utf8");
const sharedCss = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const client = fs.readFileSync(path.join(root, "client.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

const sharedStyleIndex = html.indexOf('href="styles.css');
const dashboardStyleIndex = html.indexOf('href="salesman-dashboard-live-leads.css');
const leadDetailStyleIndex = html.indexOf('href="lead-detail-readability.css');
const leadDetailContrastStyleIndex = html.indexOf('href="lead-detail-contrast.css');
assert.ok(sharedStyleIndex >= 0, "Shared stylesheet must be linked");
assert.ok(dashboardStyleIndex > sharedStyleIndex, "Dashboard overrides must load after shared styles");
assert.ok(leadDetailStyleIndex > dashboardStyleIndex, "Lead Detail overrides must load last");
assert.ok(leadDetailContrastStyleIndex > leadDetailStyleIndex, "Lead Detail contrast guard must load after the page stylesheet");
assert.doesNotMatch(html.slice(leadDetailContrastStyleIndex + 1), /<link rel="stylesheet"/, "Lead Detail contrast guard must be the final stylesheet");
assert.match(client, /function renderLeadDrawer\(\)/, "Admin and Salesman must keep using the shared Lead Details renderer");
assert.match(sharedCss, /\.lead-detail-view\s*{[^}]*grid-template-columns:\s*minmax\(340px, 0\.82fr\) minmax\(0, 1\.18fr\)/s, "desktop Lead Details must retain its two-column structure");
assert.match(css, /@media \(max-width: 1024px\)[\s\S]*body\.lead-detail-mode \.lead-detail-view\s*{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/, "Lead Details must stack responsively");

for (const forbidden of [/rgba\(/i, /linear-gradient/i, /radial-gradient/i, /filter:\s*blur/i]) {
  assert.doesNotMatch(css, forbidden, `Lead Detail page stylesheet must not contain ${forbidden}`);
}

const boxShadows = [...css.matchAll(/box-shadow:\s*([^;]+);/gi)].map((match) => match[1].replace(/\s*!important\s*$/i, "").trim());
assert.deepEqual([...new Set(boxShadows)], ["none"], "Lead Detail page stylesheet must only disable visual shadows");
assert.match(css, /backdrop-filter:\s*none\s*!important/, "Lead Detail page must explicitly disable inherited frosted effects");
assert.match(css, /\.lead-detail-page-panel::before\s*{[^}]*content:\s*none\s*!important;[^}]*display:\s*none\s*!important;[^}]*background:\s*none\s*!important;/s, "Lead Detail page must disable the shared decorative panel overlay");
assert.match(css, /--lead-bauhaus-background:\s*#f7f5ef/, "Lead Detail page needs a solid off-white background token");
assert.match(css, /--lead-bauhaus-radius:\s*4px/, "Lead Detail cards and controls need the compact Bauhaus radius");

for (const semanticClass of [
  "drawer-overview-panel--snapshot",
  "drawer-overview-panel--contact",
  "drawer-overview-panel--commercial",
  "drawer-overview-panel--company",
  "lead-ai-card.engagement",
  "lead-ai-card.risk",
  "lead-ai-card.action"
]) {
  assert.ok(css.includes(semanticClass), `${semanticClass} must retain an explicit semantic treatment`);
}

assert.match(css, /:focus-visible\s*{[^}]*outline:\s*3px solid var\(--lead-bauhaus-blue\)/s, "interactive controls need a visible keyboard focus indicator");
assert.match(css, /--lead-type-body:\s*14px/, "Lead Detail body copy must use the shared readable 14px floor");
assert.match(css, /--lead-type-value:\s*15px/, "important Lead Detail values must use the shared 15px scale");
assert.match(css, /--lead-type-label:\s*12px/, "Lead Detail labels must use the shared readable label scale");
assert.match(css, /\.lead-ai-toolbar\s*{[^}]*flex-wrap:\s*wrap/s, "AI summary badges must wrap instead of clipping");
assert.match(css, /\.lead-ai-generated\s*{[^}]*margin-left:\s*auto/s, "generated timestamp must remain aligned while preserving wrap fallback");
assert.match(client, /lead-ai-badge confidence/, "AI confidence needs a semantic reusable badge variant");
assert.match(client, /lead-ai-badge freshness/, "AI freshness needs a semantic reusable badge variant");
assert.match(client, /lead-ai-badge provider/, "AI provider needs a semantic reusable badge variant");
assert.match(css, /drawer-overview-panel[^{}]*drawer-tab-heading h3[^{}]*\{[^}]*color:\s*var\(--lead-bauhaus-text\)\s*!important/s, "Lead Snapshot headings must override the legacy dark-hero text color");
assert.match(css, /drawer-overview-panel[^{}]*drawer-summary-card[^{}]*drawer-field[^{}]*> span\s*\{[^}]*color:\s*#334155\s*!important/s, "Lead Snapshot labels must remain dark on light cards");
assert.match(css, /lead-ai-summary-page \.lead-ai-toolbar\s*\{[^}]*background-color:\s*var\(--lead-bauhaus-surface\)\s*!important/s, "AI badge toolbar must stay a light information surface");
assert.match(css, /lead-ai-badge\.confidence\s*\{[^}]*color:\s*#0f3550\s*!important;[^}]*-webkit-text-fill-color:\s*#0f3550/s, "confidence badge text must override the global dark-header color");
assert.match(css, /lead-ai-badge\.freshness\s*\{[^}]*color:\s*#243912\s*!important;[^}]*-webkit-text-fill-color:\s*#243912/s, "freshness badge text must remain dark on its green tint");
assert.match(css, /lead-ai-badge\.provider\s*\{[^}]*color:\s*#3e2d78\s*!important;[^}]*-webkit-text-fill-color:\s*#3e2d78/s, "provider badge text must remain dark on its violet tint");
assert.match(css, /drawer-stage-select\)\s*\{[^}]*color:\s*#243912\s*!important;[^}]*-webkit-text-fill-color:\s*#243912/s, "Lead Detail stage controls must remain readable on their light tint");
assert.match(css, /lead-page-header \.chip:not\(\.hot\):not\(\.warm\)\s*\{[^}]*color:\s*#0f3550\s*!important;[^}]*-webkit-text-fill-color:\s*#0f3550/s, "neutral Lead Detail header badges must remain readable");
assert.match(contrastCss, /lead-ai-badge\.confidence\s*\{[^}]*color:\s*#0f3550\s*!important;[^}]*-webkit-text-fill-color:\s*#0f3550/s, "final contrast guard must keep the confidence badge readable");
assert.match(contrastCss, /drawer-stage-select\)\s*\{[^}]*color:\s*#243912\s*!important;[^}]*-webkit-text-fill-color:\s*#243912/s, "final contrast guard must keep stage controls readable");
assert.match(contrastCss, /lead-page-header \.chip:not\(\.hot\):not\(\.warm\)\s*\{[^}]*color:\s*#0f3550\s*!important;[^}]*-webkit-text-fill-color:\s*#0f3550/s, "final contrast guard must keep header badges readable");
assert.match(css, /@media \(max-width: 1024px\)[\s\S]*body\.lead-detail-mode \.app-shell\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/, "Lead Detail must reclaim the full app-shell width at tablet and zoomed laptop sizes");

let depth = 0;
for (const char of css.replace(/\/\*[\s\S]*?\*\//g, "")) {
  if (char === "{") depth += 1;
  if (char === "}") depth -= 1;
  assert.ok(depth >= 0, "Lead Detail CSS has an unmatched closing brace");
}
assert.equal(depth, 0, "Lead Detail CSS braces must balance");

console.log("lead-detail-bauhaus.test.js: PASS");
