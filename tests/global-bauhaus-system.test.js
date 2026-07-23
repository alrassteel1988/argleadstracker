const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const css = fs.readFileSync(path.join(root, "bauhaus-global.css"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const client = fs.readFileSync(path.join(root, "client.js"), "utf8");
const serviceWorker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const vercelConfig = fs.readFileSync(path.join(root, "vercel.json"), "utf8");

const tasksStyleIndex = html.indexOf('href="tasks-bauhaus-flat.css');
const globalStyleIndex = html.indexOf('href="bauhaus-global.css');
assert.ok(tasksStyleIndex >= 0, "Tasks stylesheet must remain linked");
assert.ok(globalStyleIndex > tasksStyleIndex, "The shared Bauhaus system must load after every page override");
assert.match(serviceWorker, /"\/bauhaus-global\.css"/, "The PWA shell must cache the shared Bauhaus stylesheet");
assert.match(serviceWorker, /arg-pwa-v44-pipeline-report-export/, "The PWA cache must rotate for the Pipeline report export update");
assert.match(vercelConfig, /"src": "bauhaus-global\.css"/, "Vercel must build the shared Bauhaus stylesheet");
assert.match(vercelConfig, /"src": "\/bauhaus-global\.css", "dest": "\/bauhaus-global\.css"/, "Vercel must expose the shared Bauhaus stylesheet");

for (const [token, value] of [
  ["--bauhaus-navy", "#06283d"],
  ["--bauhaus-deep-navy", "#041f31"],
  ["--bauhaus-blue", "#1f6aa5"],
  ["--bauhaus-red", "#d94a48"],
  ["--bauhaus-yellow", "#e6a933"],
  ["--bauhaus-green", "#6d9f3d"],
  ["--bauhaus-background", "#f7f5ef"],
  ["--bauhaus-surface", "#ffffff"],
  ["--bauhaus-border", "#17324d"],
  ["--bauhaus-radius", "4px"]
]) {
  assert.match(css, new RegExp(`${token}:\\s*${value}`, "i"), `${token} must use the approved shared value`);
}

assert.doesNotMatch(css, /rgba\(/i, "The shared theme must not define translucent surfaces");
assert.doesNotMatch(css, /(?:linear|radial)-gradient/i, "The shared theme must not define decorative gradients");
assert.doesNotMatch(css, /filter:\s*blur/i, "The shared theme must not define blur filters");
assert.match(css, /body \*,[\s\S]*backdrop-filter:\s*none\s*!important/, "The shared theme must disable inherited frosted effects globally");
assert.match(css, /body \*,[\s\S]*box-shadow:\s*none\s*!important/, "The shared theme must disable inherited glow and diffused shadows globally");
assert.match(css, /body :is\(button,[\s\S]*outline:\s*2px solid var\(--bauhaus-blue\)/, "All interactive controls need the shared visible focus ring");
assert.match(css, /\.hidden,[\s\S]*\[hidden\][\s\S]*display:\s*none\s*!important/, "The visual system must preserve functional hidden states");
assert.match(css, /@media \(prefers-reduced-motion: reduce\)/, "The visual system must respect reduced-motion preferences");
assert.match(css, /button:active:not\(:disabled\)/, "Shared buttons need a clear pressed state");

const rootTokenBlock = css.match(/:root\s*\{[\s\S]*?\n\}/)?.[0] || "";
const cssOutsideRootTokens = css.replace(rootTokenBlock, "");
assert.doesNotMatch(cssOutsideRootTokens, /^\s*--bauhaus-[\w-]+\s*:/m, "Bauhaus tokens must be defined once in :root rather than per role");
assert.match(css, /\.sidebar\s*\{[^}]*background-color:\s*var\(--bauhaus-deep-navy\)/s, "Both roles must share the flat navy sidebar");
assert.match(css, /\.topbar\s*\{[^}]*background-color:\s*var\(--bauhaus-navy\)/s, "Every page must share the flat navy topbar");
assert.match(css, /input,[\s\S]*border:\s*1px solid #b9c5d1/s, "Fields must share one opaque bordered treatment");
assert.match(css, /dialog::backdrop\s*\{[^}]*background-color:\s*var\(--bauhaus-deep-navy\)/s, "Dialogs must use a non-blurred dark overlay");

assert.doesNotMatch(client, /grid:\s*\{\s*color:\s*"rgba/i, "Chart grids must use an opaque shared color");
assert.doesNotMatch(client, /return `rgba\(/, "Market snapshot bars must use opaque colors");
assert.match(client, /function renderWeeklySalesmanView\(\)/, "Weekly report behavior must remain intact");
assert.match(client, /function dashboardSummaryDatasets\(\)/, "Dashboard calculations must remain intact");
assert.match(client, /document\.body\.classList\.toggle\("admin-dashboard-mode"/, "Admin role presentation mode must remain intact");
assert.match(client, /document\.body\.classList\.toggle\("salesman-dashboard-mode"/, "Salesman role presentation mode must remain intact");

let depth = 0;
for (const char of css.replace(/\/\*[\s\S]*?\*\//g, "")) {
  if (char === "{") depth += 1;
  if (char === "}") depth -= 1;
  assert.ok(depth >= 0, "Global Bauhaus CSS has an unmatched closing brace");
}
assert.equal(depth, 0, "Global Bauhaus CSS braces must balance");

console.log("global-bauhaus-system.test.js: PASS");
