const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const read = name => fs.readFileSync(path.join(__dirname, "..", name), "utf8");
const css = read("crm-activity.css");
const html = read("index.html");
const vercel = JSON.parse(read("vercel.json"));
assert.match(css, /\.activity-kpi-card\s*\{[^}]*background:\s*var\(--crm-surface\)/s);
assert.match(css, /\.activity-section-header\s*\{[^}]*margin:\s*0\s*!important;[^}]*background:\s*var\(--crm-surface\)/s);
assert.match(css, /\.activity-section-header h2\s*\{[^}]*color:\s*var\(--crm-navy\)[^}]*20px/s);
assert.match(css, /\.activity-section-header h2 em\s*\{[^}]*var\(--crm-gold-heading\)[^}]*var\(--crm-font-title\)/s);
assert.match(css, /\.activity-table td\s*\{[^}]*14px\/1\.5/s);
assert.match(css, /\.activity-table\s*\{[^}]*table-layout:\s*auto\s*!important/s);
assert.match(css, /\.activity-table-actions \.small-action\s*\{[^}]*white-space:\s*nowrap\s*!important/s);
assert.match(css, /\.activity-table-scroll\s*\{[^}]*max-height:\s*520px[^}]*overflow:\s*auto/s);
assert.match(css, /\.activity-weekly-day-items\s*\{[^}]*max-height:\s*180px[^}]*overflow-y:\s*auto/s);
assert.match(css, /\.activity-filter-bar :is\(input, select\)\s*\{[^}]*-webkit-text-fill-color:\s*var\(--crm-text\)/s);
assert.match(css, /@media \(max-width: 720px\)[\s\S]*min-height:\s*44px[^}]*font-size:\s*16px/s);
assert.match(css, /@media \(max-width: 720px\)[\s\S]*:is\(button, \.activity-row-menu summary, \.calendar-link, \.calendar-range-pill\)\s*\{[^}]*min-width:\s*44px\s*!important;[^}]*min-height:\s*44px\s*!important/s);
assert.match(css, /\.activity-pagination button\s*\{[^}]*font-size:\s*0\s*!important/s);
assert.match(css, /aria-label="Previous activity page"\][^}]*var\(--crm-icon-chevron-left\)/);
assert.match(css, /aria-label="Next activity page"\][^}]*var\(--crm-icon-chevron-right\)/);
assert.match(read("crm-shell.css"), /#overdueBanner \.overdue-owner-chip\s*\{[^}]*flex:\s*0 1 auto[^}]*white-space:\s*normal/s);
assert.match(css, /:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--crm-focus\)/s);
assert.doesNotMatch(css, /gradient\(|rgba\(|blur\(|opacity:\s*0\.|\.sidebar\b/);
assert.doesNotMatch(css, /\[hidden\][^{]*\{[^}]*display:\s*(?:flex|grid|block)/s);
assert.ok(html.includes('Weekly <em>calendar</em>'));
assert.ok(html.indexOf('/crm-activity.css?v=') > html.indexOf('/crm-record.css?v='));
assert.ok(html.indexOf('/mobile-ui.css?v=') > html.indexOf('/crm-activity.css?v='));
assert.ok(vercel.builds.some(item => item.src === "crm-activity.css" && item.use === "@vercel/static"));
assert.ok(vercel.routes.some(item => item.src === "/crm-activity.css" && item.dest === "/crm-activity.css"));
assert.ok(read("sw.js").includes('"/crm-activity.css"'));
assert.ok(read("server.js").includes('["/crm-activity.css", "crm-activity.css"]'));

const client = read("client.js");
const declaration = name => client.match(new RegExp(`function ${name}\\([^]*?\\n}`, "m"))[0];
const stageDeclarations = client.slice(client.indexOf("const KANBAN_STAGES = ["), client.indexOf("const NEXT_ACTION_PLAN_OPTIONS"));
for (const role of ["admin", "salesman"]) {
  const context = vm.createContext({
    state: {currentUser:{role}}, today:() => "2026-10-23",
    formatDisplayDate:value => value, activityDisplayDate:() => "2026-10-01",
    activityDisplayTime:() => "", activityTypeClass:() => "neutral",
    activityIconGlyph:() => "N", activityViewButton:() => "",
    activityEditButton:() => "", activityDeleteButton:() => "",
    activityAudioMarkup:() => "", activityTranscriptMarkup:() => ""
  });
  vm.runInContext(`${stageDeclarations}\n${declaration("escapeHtml")}\n${declaration("activityTableStatus")}\n${declaration("activityCardMarkup")}`, context);
  for (const [stage, label] of Object.entries({NEW:"Prospect", CONTACTED:"Outreach", NEGOTIATION:"Engaged", WON:"Active", DORMANT:"Dormant", LOST:"Lost", lost:"Lost", Sampling:"Engaged", "Custom stage":"Custom stage"})) {
    const activity = Object.freeze({stage, type:"Note", company_name:"Synthetic company", note:"Synthetic note"});
    assert.equal(context.activityTableStatus(activity).label, label);
    assert.equal(context.activityTableStatus(activity).tone, "neutral");
    assert.ok(context.activityCardMarkup(activity).includes(`>${label}</span>`), `${role}: card stage ${stage} uses ${label}`);
    assert.equal(activity.stage, stage, "Display mapping must not mutate stored activity history");
  }
  for (const [activity, label, tone] of [
    [{stage:"LOST", deletion_status:"pending"}, "Deletion pending", "pending"],
    [{stage:"LOST", type:"Reminder", due_date:"2026-10-01"}, "Overdue", "overdue"],
    [{stage:"LOST", type:"Reminder", due_date:"2026-10-01", reminder_status:"completed"}, "Completed", "completed"],
    [{stage:"LOST", type:"Reminder", reminder_status:"Scheduled"}, "Scheduled", "scheduled"],
    [{stage:"LOST", due_date:"2026-10-24"}, "Upcoming", "upcoming"],
    [{status:"Reviewed"}, "Reviewed", "neutral"],
    [{}, "Logged", "neutral"]
  ]) {
    const result = context.activityTableStatus(Object.freeze(activity));
    assert.equal(result.label, label);
    assert.equal(result.tone, tone);
  }
  assert.ok(context.activityCardMarkup({type:"Reminder", stage:"LOST", reminder_status:"Scheduled"}).includes('>Scheduled</span>'));
  assert.ok(context.activityCardMarkup({stage:'<custom>'}).includes('&lt;custom&gt;'));
}
console.log("PASS revised Activity presentation, control readability and static asset contracts");
