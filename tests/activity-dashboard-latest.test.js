const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const client = fs.readFileSync(path.join(root, "client.js"), "utf8");
const css = fs.readFileSync(path.join(root, "activity-dashboard-latest.css"), "utf8");
const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
const serviceWorker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const vercel = fs.readFileSync(path.join(root, "vercel.json"), "utf8");

assert.match(html, /id="activityCalendarToggle"[^>]*type="button"[^>]*aria-expanded="true"[^>]*aria-controls="activityWeeklyLog"/, "Calendar toggle needs native keyboard behavior and an explicit controlled region");
assert.match(css, /#activityWeeklyLog\[hidden\]\s*\{\s*display:\s*none\s*!important;/, "Minimized calendar must release layout space despite legacy display rules");
assert.match(css, /\.activity-weekly-card\.is-minimized > \.activity-section-header\s*\{\s*margin-bottom:\s*0\s*!important;/, "Minimized card must not reserve its former body gap");
assert.match(client, /function renderActivityView\(\)\s*\{\s*renderActivityCalendarVisibility\(\);/, "Activity refreshes must preserve calendar visibility");
const visibilityFunction = client.match(/function renderActivityCalendarVisibility\(\) \{[\s\S]*?\n\}/);
assert.ok(visibilityFunction, "Calendar visibility needs one shared renderer");
const visibilityClasses = new Map();
const visibilityAttributes = new Map();
const visibilityState = { currentUser: { role: "admin" }, activityCalendarMinimized: false };
const visibilityEls = {
  activityCalendarToggle: {
    classList: { toggle: (name, value) => visibilityClasses.set(`button:${name}`, value) },
    setAttribute: (name, value) => visibilityAttributes.set(name, value)
  },
  activityWeeklyLog: {
    hidden: false,
    closest: () => ({ classList: { toggle: (name, value) => visibilityClasses.set(name, value) } })
  }
};
const visibilityContext = vm.createContext({ state: visibilityState, els: visibilityEls });
vm.runInContext(visibilityFunction[0], visibilityContext);
const toggleHandler = client.match(/els\.activityCalendarToggle\?\.addEventListener\("click", \(\) => \{([\s\S]*?)\n\}\);/);
assert.ok(toggleHandler, "Calendar minimize button must be wired");
vm.runInContext('renderActivityCalendarVisibility()', visibilityContext);
assert.equal(visibilityEls.activityWeeklyLog.hidden, false);
vm.runInContext(`(() => {${toggleHandler[1]}})()`, visibilityContext);
assert.equal(visibilityEls.activityWeeklyLog.hidden, true);
assert.equal(visibilityClasses.get("is-minimized"), true);
assert.equal(visibilityAttributes.get("aria-expanded"), "false");
assert.equal(visibilityEls.activityCalendarToggle.textContent, "Expand");
vm.runInContext('renderActivityCalendarVisibility()', visibilityContext);
assert.equal(visibilityEls.activityWeeklyLog.hidden, true, "Refreshing must not reopen the calendar");
vm.runInContext(`(() => {${toggleHandler[1]}})()`, visibilityContext);
assert.equal(visibilityEls.activityWeeklyLog.hidden, false);
assert.equal(visibilityAttributes.get("aria-expanded"), "true");
assert.equal(visibilityEls.activityCalendarToggle.textContent, "Minimize");
visibilityState.currentUser.role = "salesman";
visibilityState.activityCalendarMinimized = true;
vm.runInContext('renderActivityCalendarVisibility()', visibilityContext);
assert.equal(visibilityEls.activityWeeklyLog.hidden, false, "Admin-only preference must not hide the Salesman calendar");
assert.equal(visibilityClasses.get("button:hidden"), true);

assert.match(html, /activity-dashboard-latest\.css\?v=calendar-minimize-4/, "Activity CSS must use the calendar minimize cache revision");
assert.ok(
  html.indexOf("activity-dashboard-latest.css") > html.indexOf("bauhaus-global.css"),
  "The latest Activity layer must win the theme cascade"
);
assert.equal((html.match(/activity-section-header/g) || []).length, 3, "Only the three requested Admin Activity headers should use the framed title class");
assert.match(html, /activity-kpi-card--blue/, "Activity KPIs need semantic card variants");
assert.match(client, /function activityTableMarkup\(activities\)/, "Activity Log needs the shared semantic table renderer");
assert.match(client, /<table class="activity-table">/, "Activity Log must use semantic table markup");
assert.match(client, /activityPageSize:\s*10/, "Activity pagination should show ten records per page");
assert.match(client, /data-activity-page=/, "Activity pagination controls must be wired");
assert.match(css, /grid-template-columns:\s*minmax\(0, 1\.85fr\) minmax\(330px, 1fr\)/, "Desktop layout needs the approved roughly 65/35 split");
assert.match(css, /grid-template-columns:\s*minmax\(0, 2fr\) minmax\(330px, 1fr\)/, "Go-live Activity workspace should use the requested 66/34 split");
assert.match(css, /\.overdue-banner\.hidden\s*\{[^}]*display:\s*none\s*!important/s, "Hidden overdue alerts must not reserve vertical space");
assert.doesNotMatch(css, /\.activity-weekly-card\s*\{[^}]*max-height:\s*86px\s*!important/s, "Weekly calendar must not clip its content into an 86px strip");
assert.match(css, /\.activity-weekly-grid\s*\{[^}]*grid-template-columns:\s*repeat\(7, minmax\(132px, 1fr\)\)/s, "Weekly calendar needs seven desktop day columns");
assert.match(css, /\.activity-weekly-log\s*\{[^}]*overflow-x:\s*auto/s, "Narrow calendar views must scroll horizontally instead of clipping");
assert.match(client, /class="activity-weekly-grid"/, "Weekly renderer must create the seven-day calendar grid");
assert.match(client, /class="activity-weekly-empty">No activity scheduled\.<\/p>/, "Every empty day needs a visible empty state");
assert.match(client, /const dayItems = itemsForDay\(day\.date\)/, "Each day must render its own zero, one, or multiple scheduled items");
assert.match(css, /\.activity-kpi-copy > strong,[\s\S]*background:\s*transparent\s*!important/, "KPI values must not use large tinted value backgrounds");
assert.match(css, /Admin Activity shared CRM section titles/, "Activity section titles must use the shared CRM theme");
assert.match(css, /body\.activity-admin-mode :is\(\s*\.activity-weekly-card,\s*\.activity-log-panel,\s*\.activity-reminders-panel\s*\)::before\s*\{[^}]*content:\s*none\s*!important;[^}]*background:\s*none\s*!important;/, "Legacy panel highlight overlays must not wash out the three navy Activity headers");
assert.match(css, /\.activity-weekly-card,[\s\S]*\.activity-log-panel,[\s\S]*\.activity-reminders-panel[\s\S]*> \.activity-section-header\s*\{[^}]*box-sizing:\s*border-box\s*!important;[^}]*border:\s*2px solid var\(--bauhaus-navy\)\s*!important;[^}]*background:\s*var\(--bauhaus-navy\)\s*!important;[^}]*color:\s*#FFFFFF\s*!important;/, "Activity section headers must match the navy CRM panel headers");
assert.match(css, /> \.activity-section-header h2\s*\{[^}]*color:\s*#FFFFFF\s*!important;[^}]*font-size:\s*18px\s*!important;[^}]*font-weight:\s*700\s*!important;/, "Framed Activity section titles must use white bold text");
assert.match(css, /> \.activity-section-header :is\(\.activity-weekly-subheading, div > span:not\(\.activity-count-pill\)\)\s*\{[^}]*color:\s*#FFFFFF\s*!important;[^}]*font-size:\s*13px\s*!important;[^}]*font-weight:\s*400\s*!important;[^}]*opacity:\s*1\s*!important;/, "Framed Activity section subtitles must use white non-faded text");
assert.match(css, /\.activity-section-header :is\([\s\S]*?\.activity-count-pill,[\s\S]*?\.activity-header-action,[\s\S]*?\.calendar-nav-button,[\s\S]*?\.calendar-range-pill[\s\S]*?\)\s*\{[^}]*background:\s*var\(--bauhaus-surface\)\s*!important;[^}]*color:\s*var\(--bauhaus-navy\)\s*!important;[^}]*border-color:\s*var\(--bauhaus-border-light\)\s*!important;/, "Header controls must use the shared opaque surface and readable navy text");
assert.doesNotMatch(css, /#003F91|#F6AA1C/i, "Activity must not retain a separate blue/yellow header theme");
assert.match(css, /\.topbar\s*\{[^}]*background:\s*var\(--bauhaus-navy\) !important;/, "Activity's desktop page header must match every other CRM page");
for (const [activityToken, sharedToken] of [["ink", "text"], ["muted", "text-muted"], ["line", "border-light"], ["soft", "muted"], ["blue", "blue"], ["red", "metric-red"], ["amber", "metric-orange"], ["green", "metric-green"]]) {
  assert.match(css, new RegExp(`--activity-latest-${activityToken}:\\s*var\\(--bauhaus-${sharedToken}\\);`), `${activityToken} must reuse the shared CRM palette`);
}
assert.match(css, /\.activity-kpi-card\s*\{[^}]*background:\s*var\(--activity-kpi-fill\) !important;/, "Activity KPI cards must use solid semantic fills");
assert.match(css, /\.activity-kpi-card \.activity-kpi-copy > :is\(span, strong, small\)\s*\{[^}]*color:\s*#ffffff !important;/, "Labels and values on solid KPI fills must stay readable");
assert.match(css, /\.activity-table-row\s*\{[^}]*height:\s*46px/s, "Compact rows must fit five records above the laptop fold");
assert.match(css, /\.activity-table th\s*\{[^}]*height:\s*30px/s, "The table header needs compact fixed rhythm");
assert.match(css, /\.activity-panel-cap h2,[\s\S]*color:\s*var\(--activity-latest-ink\)\s*!important/, "White panel caps need readable dark headings");
assert.match(css, /@media \(max-width:\s*680px\)[\s\S]*\.activity-table td::before/, "Mobile Activity records need readable field labels");
assert.doesNotMatch(css, /\.sidebar\b/, "The Activity redesign must not change sidebar sizing");
assert.doesNotMatch(css, /(?:linear|radial)-gradient|backdrop-filter:\s*blur|filter:\s*blur/i, "The latest Activity layer must remain flat and opaque");
assert.match(serviceWorker, /"\/activity-dashboard-latest\.css"/, "The PWA shell must cache the latest Activity layer");
assert.match(serviceWorker, /arg-pwa-v86-revised-ui-shell/, "The PWA cache must include the latest UI asset revision");
assert.match(serviceWorker, /\.then\(\(\) => self\.skipWaiting\(\)\)/, "The updated service worker must activate immediately for stale CRM sessions");
assert.match(serviceWorker, /event\.respondWith\(networkFirst\(request\)\)/, "Same-origin UI assets must prefer the network before cached fallbacks");
assert.match(vercel, /"src": "activity-dashboard-latest\.css"/, "Vercel must publish the latest Activity layer");
assert.match(server, /\["\/activity-dashboard-latest\.css", "activity-dashboard-latest\.css"\]/, "The Node server must publish the latest Activity layer");

console.log("activity-dashboard-latest.test.js: PASS");
