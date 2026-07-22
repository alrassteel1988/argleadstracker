const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const css = fs.readFileSync(path.join(root, "lead-detail-readability.css"), "utf8");
const sharedCss = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const client = fs.readFileSync(path.join(root, "client.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

const sharedStyleIndex = html.indexOf('href="styles.css');
const dashboardStyleIndex = html.indexOf('href="salesman-dashboard-live-leads.css');
const leadDetailStyleIndex = html.indexOf('href="lead-detail-readability.css');
assert.ok(sharedStyleIndex >= 0, "Shared stylesheet must be linked");
assert.ok(dashboardStyleIndex > sharedStyleIndex, "Dashboard overrides must load after shared styles");
assert.ok(leadDetailStyleIndex > dashboardStyleIndex, "Lead Detail overrides must load last");
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

let depth = 0;
for (const char of css.replace(/\/\*[\s\S]*?\*\//g, "")) {
  if (char === "{") depth += 1;
  if (char === "}") depth -= 1;
  assert.ok(depth >= 0, "Lead Detail CSS has an unmatched closing brace");
}
assert.equal(depth, 0, "Lead Detail CSS braces must balance");

console.log("lead-detail-bauhaus.test.js: PASS");
