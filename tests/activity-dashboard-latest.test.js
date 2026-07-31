const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const client = fs.readFileSync(path.join(root, "client.js"), "utf8");
const css = fs.readFileSync(path.join(root, "activity-dashboard-latest.css"), "utf8");
const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
const serviceWorker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const vercel = fs.readFileSync(path.join(root, "vercel.json"), "utf8");

assert.match(html, /activity-dashboard-latest\.css\?v=5/, "Latest Activity CSS must load after the shared theme");
assert.ok(
  html.indexOf("activity-dashboard-latest.css") > html.indexOf("bauhaus-global.css"),
  "The latest Activity layer must win the theme cascade"
);
assert.match(html, /activity-kpi-card--blue/, "Activity KPIs need semantic card variants");
assert.match(client, /function activityTableMarkup\(activities\)/, "Activity Log needs the shared semantic table renderer");
assert.match(client, /<table class="activity-table">/, "Activity Log must use semantic table markup");
assert.match(client, /activityPageSize:\s*10/, "Activity pagination should show ten records per page");
assert.match(client, /data-activity-page=/, "Activity pagination controls must be wired");
assert.match(css, /grid-template-columns:\s*minmax\(0, 1\.85fr\) minmax\(330px, 1fr\)/, "Desktop layout needs the approved roughly 65/35 split");
assert.match(css, /\.activity-table-row\s*\{[^}]*height:\s*46px/s, "Compact rows must fit five records above the laptop fold");
assert.match(css, /\.activity-table th\s*\{[^}]*height:\s*30px/s, "The table header needs compact fixed rhythm");
assert.match(css, /\.activity-panel-cap h2,[\s\S]*color:\s*var\(--activity-latest-ink\)\s*!important/, "White panel caps need readable dark headings");
assert.match(css, /@media \(max-width:\s*680px\)[\s\S]*\.activity-table td::before/, "Mobile Activity records need readable field labels");
assert.doesNotMatch(css, /\.sidebar\b/, "The Activity redesign must not change sidebar sizing");
assert.doesNotMatch(css, /(?:linear|radial)-gradient|backdrop-filter:\s*blur|filter:\s*blur/i, "The latest Activity layer must remain flat and opaque");
assert.match(serviceWorker, /"\/activity-dashboard-latest\.css"/, "The PWA shell must cache the latest Activity layer");
assert.match(vercel, /"src": "activity-dashboard-latest\.css"/, "Vercel must publish the latest Activity layer");
assert.match(server, /\["\/activity-dashboard-latest\.css", "activity-dashboard-latest\.css"\]/, "The Node server must publish the latest Activity layer");

console.log("activity-dashboard-latest.test.js: PASS");
