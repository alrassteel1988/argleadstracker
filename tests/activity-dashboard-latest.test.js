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

assert.match(html, /activity-dashboard-latest\.css\?v=bauhaus-overdue-4/, "Latest Activity CSS must use the Bauhaus overdue cache-busting revision");
assert.ok(
  html.indexOf("activity-dashboard-latest.css") > html.indexOf("bauhaus-global.css"),
  "The latest Activity layer must win the theme cascade"
);
assert.equal((html.match(/activity-section-header/g) || []).length, 3, "Only the three requested Admin Activity headers should use the framed title class");
assert.match(html, /activity-kpi-card--blue/, "Activity KPIs need semantic card variants");
assert.match(client, /function activityTableMarkup\(activities\)/, "Activity Log needs the shared semantic table renderer");
assert.match(client, /function useOverdueFollowUps\(\)/, "Activity overdue surfaces need one authoritative dataset");
assert.match(client, /Activity scope:/, "The overdue banner must disclose the date scope it uses");
assert.match(client, /No items/, "Each empty weekly calendar day needs an explicit empty state");
assert.match(client, /overdue-\$\{staleness\}/, "Overdue reminders need a staleness escalation class");
assert.match(client, /<table class="activity-table">/, "Activity Log must use semantic table markup");
assert.match(client, /activityPageSize:\s*10/, "Activity pagination should show ten records per page");
assert.match(client, /data-activity-page=/, "Activity pagination controls must be wired");
assert.match(css, /grid-template-columns:\s*minmax\(0, 1\.85fr\) minmax\(330px, 1fr\)/, "Desktop layout needs the approved roughly 65/35 split");
assert.match(css, /grid-template-columns:\s*minmax\(0, 2fr\) minmax\(330px, 1fr\)/, "Go-live Activity workspace should use the requested 66/34 split");
assert.match(css, /\.overdue-banner\.hidden\s*\{[^}]*display:\s*none\s*!important/s, "Hidden overdue alerts must not reserve vertical space");
assert.match(css, /\.activity-weekly-card\s*\{[^}]*max-height:\s*86px\s*!important/s, "Weekly calendar must remain a compact strip");
assert.match(css, /\.activity-kpi-copy > strong,[\s\S]*background:\s*transparent\s*!important/, "KPI values must not use large tinted value backgrounds");
assert.match(css, /Admin Activity framed section titles/, "Admin Activity section title frames must be scoped and documented");
assert.match(css, /\.activity-weekly-card,[\s\S]*\.activity-log-panel,[\s\S]*\.activity-reminders-panel[\s\S]*> \.activity-section-header\s*\{[^}]*box-sizing:\s*border-box\s*!important;[^}]*border:\s*2px solid #F6AA1C\s*!important;[^}]*background:\s*#FFFFFF\s*!important;[^}]*color:\s*#2C363F\s*!important;/, "Weekly calendar, Activity log, and Reminders headers need the orange framed title treatment on the rendered class");
assert.match(css, /> \.activity-section-header h2\s*\{[^}]*color:\s*#2C363F\s*!important;[^}]*font-size:\s*18px\s*!important;[^}]*font-weight:\s*700\s*!important;/, "Framed Activity section titles must use dark bold text");
assert.match(css, /> \.activity-section-header :is\(\.activity-weekly-subheading, div > span:not\(\.activity-count-pill\)\)\s*\{[^}]*color:\s*#2C363F\s*!important;[^}]*font-size:\s*13px\s*!important;[^}]*font-weight:\s*400\s*!important;[^}]*opacity:\s*1\s*!important;/, "Framed Activity section subtitles must use dark non-faded text");
assert.match(css, /\.activity-table-row\s*\{[^}]*height:\s*46px/s, "Compact rows must fit five records above the laptop fold");
assert.match(css, /\.activity-table th\s*\{[^}]*height:\s*30px/s, "The table header needs compact fixed rhythm");
assert.match(css, /\.activity-panel-cap h2,[\s\S]*color:\s*var\(--activity-latest-ink\)\s*!important/, "White panel caps need readable dark headings");
assert.match(css, /@media \(max-width:\s*680px\)[\s\S]*\.activity-table td::before/, "Mobile Activity records need readable field labels");
assert.doesNotMatch(css, /\.sidebar\b/, "The Activity redesign must not change sidebar sizing");
assert.doesNotMatch(css, /(?:linear|radial)-gradient|backdrop-filter:\s*blur|filter:\s*blur/i, "The latest Activity layer must remain flat and opaque");
assert.match(serviceWorker, /"\/activity-dashboard-latest\.css"/, "The PWA shell must cache the latest Activity layer");
assert.match(serviceWorker, /arg-pwa-v66-activity-bauhaus-overdue/, "The PWA cache must be bumped when Activity CSS changes");
assert.match(serviceWorker, /\.then\(\(\) => self\.skipWaiting\(\)\)/, "The updated service worker must activate immediately for stale CRM sessions");
assert.match(serviceWorker, /event\.respondWith\(networkFirst\(request\)\)/, "Same-origin UI assets must prefer the network before cached fallbacks");
assert.match(vercel, /"src": "activity-dashboard-latest\.css"/, "Vercel must publish the latest Activity layer");
assert.match(server, /\["\/activity-dashboard-latest\.css", "activity-dashboard-latest\.css"\]/, "The Node server must publish the latest Activity layer");

console.log("activity-dashboard-latest.test.js: PASS");
