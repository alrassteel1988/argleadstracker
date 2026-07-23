const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const css = fs.readFileSync(path.join(root, "tasks-bauhaus-flat.css"), "utf8");
const contrastCss = fs.readFileSync(path.join(root, "tasks-contrast.css"), "utf8");
const client = fs.readFileSync(path.join(root, "client.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const serviceWorker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const vercelConfig = fs.readFileSync(path.join(root, "vercel.json"), "utf8");

const sharedStyleIndex = html.indexOf('href="styles.css');
const leadStyleIndex = html.indexOf('href="lead-detail-readability.css');
const tasksStyleIndex = html.indexOf('href="tasks-bauhaus-flat.css');
const globalStyleIndex = html.indexOf('href="bauhaus-global.css');
const tasksContrastStyleIndex = html.indexOf('href="tasks-contrast.css');
assert.ok(sharedStyleIndex >= 0, "Shared stylesheet must be linked");
assert.ok(leadStyleIndex > sharedStyleIndex, "Lead Detail overrides must load after shared styles");
assert.ok(tasksStyleIndex > leadStyleIndex, "Tasks Bauhaus overrides must load after Lead Detail styles");
assert.ok(tasksContrastStyleIndex > globalStyleIndex, "Tasks contrast guard must load after the shared navy panel-header rule");
assert.match(serviceWorker, /"\/tasks-bauhaus-flat\.css"/, "Tasks Bauhaus stylesheet must be cached for the PWA shell");
assert.match(serviceWorker, /"\/tasks-contrast\.css"/, "The PWA shell must cache the Tasks contrast guard");
assert.match(vercelConfig, /"src": "tasks-bauhaus-flat\.css"/, "Vercel must build the Tasks Bauhaus stylesheet as a static asset");
assert.match(vercelConfig, /"src": "tasks-contrast\.css"/, "Vercel must build the Tasks contrast guard as a static asset");
assert.match(vercelConfig, /"src": "\/tasks-bauhaus-flat\.css", "dest": "\/tasks-bauhaus-flat\.css"/, "Vercel must route the Tasks Bauhaus stylesheet directly");
assert.match(contrastCss, /#tasksWeekLabel\s*\{[^}]*color:\s*#0f3550\s*!important;[^}]*font-size:\s*13px;[^}]*-webkit-text-fill-color:\s*#0f3550/s, "Week date badge must use dark readable text");
assert.match(contrastCss, /#tasksStatusBadge\s*\{[^}]*color:\s*#5a3709\s*!important;[^}]*font-size:\s*13px;[^}]*-webkit-text-fill-color:\s*#5a3709/s, "Not Started badge must use dark readable text");

assert.match(css, /body\.tasks-mode:not\(\.admin-tasks-mode\)/, "Bauhaus styling must be scoped to the Salesman Tasks page");
assert.doesNotMatch(css, /body\.tasks-mode\.admin-tasks-mode/, "Admin Tasks review must not receive Salesman-only styling");

for (const forbidden of [/rgba\(/i, /linear-gradient/i, /radial-gradient/i, /filter:\s*blur/i]) {
  assert.doesNotMatch(css, forbidden, `Salesman Tasks stylesheet must not contain ${forbidden}`);
}

const boxShadows = [...css.matchAll(/box-shadow:\s*([^;]+);/gi)].map((match) => match[1].replace(/\s*!important\s*$/i, "").trim());
assert.deepEqual([...new Set(boxShadows)], ["none"], "Salesman Tasks stylesheet must only disable visual shadows");
assert.match(css, /backdrop-filter:\s*none\s*!important/, "Salesman Tasks must explicitly disable inherited frosted effects");

for (const [token, value] of [
  ["--tasks-bauhaus-navy", "#06283d"],
  ["--tasks-bauhaus-blue", "#1f6aa5"],
  ["--tasks-bauhaus-red", "#d94a48"],
  ["--tasks-bauhaus-yellow", "#e6a933"],
  ["--tasks-bauhaus-green", "#6d9f3d"],
  ["--tasks-bauhaus-background", "#f7f5ef"],
  ["--tasks-bauhaus-radius", "4px"]
]) {
  assert.match(css, new RegExp(`${token}:\\s*${value}`, "i"), `${token} must use the approved CRM Bauhaus value`);
}

assert.match(css, /\.tasks-section-card--blue-cap\s*>\s*\.tasks-section-head[\s\S]*background-color:\s*var\(--tasks-bauhaus-blue\)/, "Report subsections need solid blue header caps");
assert.match(css, /\.tasks-status-card\s*{[^}]*border:\s*2px solid var\(--tasks-bauhaus-blue\)/s, "Submission status needs a crisp blue border");
assert.match(css, /\.tasks-blockers-card\s*{[^}]*border:\s*2px solid var\(--tasks-bauhaus-red\)/s, "Blockers need a crisp red border");
assert.match(css, /field--required-empty[^{]*{[^}]*background-color:\s*#fcf0dd/s, "Required empty fields must retain amber completion feedback");
assert.match(css, /field--filled[^{]*{[^}]*background-color:\s*#e9f4dc/s, "Completed fields must retain green completion feedback");
assert.match(css, /:focus-visible\s*{[^}]*outline:\s*3px solid var\(--tasks-bauhaus-blue\)/s, "Tasks controls need a visible keyboard focus indicator");

assert.match(client, /function renderWeeklySalesmanView\(\)/, "The existing Weekly Sales Report renderer must remain in use");
assert.match(client, /data-weekly-voice-button/, "Voice-note controls must remain wired");
assert.match(client, /id="weeklySaveDraft"/, "Save-draft workflow must remain wired");
assert.match(client, /id="weeklySubmitReport"/, "Submission workflow must remain wired");
assert.match(client, /weeklyCompletionSnapshot\(wrapper\)/, "Field styling and checkpoint count must keep sharing completion logic");

let depth = 0;
for (const char of css.replace(/\/\*[\s\S]*?\*\//g, "")) {
  if (char === "{") depth += 1;
  if (char === "}") depth -= 1;
  assert.ok(depth >= 0, "Tasks Bauhaus CSS has an unmatched closing brace");
}
assert.equal(depth, 0, "Tasks Bauhaus CSS braces must balance");

console.log("tasks-bauhaus-flat.test.js: PASS");
