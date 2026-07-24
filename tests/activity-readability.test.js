const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const css = fs.readFileSync(path.join(root, "activity-readability.css"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const serviceWorker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const vercelConfig = fs.readFileSync(path.join(root, "vercel.json"), "utf8");

const leadStyleIndex = html.indexOf('href="lead-detail-readability.css');
const activityStyleIndex = html.indexOf('href="activity-readability.css');
const globalStyleIndex = html.indexOf('href="bauhaus-global.css');
assert.ok(activityStyleIndex > leadStyleIndex, "Activity readability must load after the Lead Detail page layer");
assert.ok(globalStyleIndex > activityStyleIndex, "The shared Bauhaus system must remain the final theme layer");
assert.match(serviceWorker, /"\/activity-readability\.css"/, "The PWA shell must cache Activity readability CSS");
assert.match(vercelConfig, /"src": "activity-readability\.css"/, "Vercel must build Activity readability CSS");

for (const [token, value] of [
  ["--activity-font-caption", "13px"],
  ["--activity-font-body", "14px"],
  ["--activity-font-body-lg", "16px"],
  ["--activity-font-heading-sm", "17px"],
  ["--activity-font-heading-md", "20px"],
  ["--activity-text-primary", "#172b4d"],
  ["--activity-text-secondary", "#475569"],
  ["--activity-text-muted", "#5f6b7a"]
]) {
  assert.match(css, new RegExp(`${token}:\\s*${value}`, "i"), `${token} must use the approved Activity readability value`);
}

assert.match(css, /body\.activity-mode\s*\{[^}]*font-size:\s*var\(--activity-font-body\)/s, "Activity body text needs a 14px floor");
assert.match(css, /\.activity-panel-cap h2,[\s\S]*font-size:\s*var\(--activity-font-heading-sm\)\s*!important/, "Activity panel headings need the 17px scale");
assert.match(css, /\.activity-filter-bar :is\(input, select\)[\s\S]*min-height:\s*42px\s*!important/, "Filter controls need an accessible 42px height");
assert.match(css, /\.activity-shortcut-chips button\s*\{[^}]*min-height:\s*32px\s*!important/s, "Activity type chips need an accessible 32px height");
assert.match(css, /\.calendar-nav-button\s*\{[^}]*min-width:\s*40px\s*!important;[^}]*min-height:\s*40px\s*!important/s, "Calendar navigation needs a 40px target");
assert.match(css, /\.date-presets button\.active,[\s\S]*?background:\s*#14141c\s*!important/, "Active date filters need a high-contrast dark fill");
assert.match(css, /#activityWeekRange\.calendar-range-pill\s*\{[^}]*font-size:\s*15px\s*!important/s, "The week range needs a readable 15px label");
assert.match(css, /\.activity-feed-body > strong\s*\{[^}]*font-size:\s*var\(--activity-font-body-lg\)\s*!important/s, "Activity company names need the 16px scale");
assert.match(css, /\.reminder-card strong\s*\{[^}]*font-size:\s*15px\s*!important/s, "Reminder titles need the 15px scale");
assert.match(css, /:focus-visible\s*\{[^}]*outline:\s*3px solid var\(--activity-focus\)\s*!important/s, "Activity controls need a visible keyboard focus ring");
assert.match(css, /@media \(max-width: 1024px\)[\s\S]*body\.activity-mode \.app-shell\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/, "Activity must reclaim the full app-shell width at zoomed laptop sizes");

for (const forbidden of [/rgba\(/i, /(?:linear|radial)-gradient/i, /filter:\s*blur/i]) {
  assert.doesNotMatch(css, forbidden, `Activity readability CSS must not introduce ${forbidden}`);
}

let depth = 0;
for (const char of css.replace(/\/\*[\s\S]*?\*\//g, "")) {
  if (char === "{") depth += 1;
  if (char === "}") depth -= 1;
  assert.ok(depth >= 0, "Activity readability CSS has an unmatched closing brace");
}
assert.equal(depth, 0, "Activity readability CSS braces must balance");

console.log("activity-readability.test.js: PASS");
