const assert = require("assert");
const fs = require("fs");
const path = require("path");

const client = fs.readFileSync(path.join(__dirname, "..", "client.js"), "utf8");
const server = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
const styles = fs.readFileSync(path.join(__dirname, "..", "styles.css"), "utf8");
const migration = fs.readFileSync(
  path.join(__dirname, "..", "supabase", "migrations", "20260731140000_weekly_report_lifecycle.sql"),
  "utf8"
);

assert.match(client, /data-weekly-open-id=/);
assert.match(client, /tasks-open-report-copy/);
assert.match(client, /\/api\/admin\/weekly-reports\/\$\{encodeURIComponent\(state\.weeklyReports\.selectedId\)\}\/\$\{endpoint\}/);
assert.match(client, /version_id:\s*versionId/);
assert.match(client, /data-weekly-version-number/);
assert.match(client, /weeklyAdminWeekEnding/);
assert.match(client, /weekEnd=\$\{encodeURIComponent\(state\.weeklyReports\.weekEnding\)\}/);
assert.match(client, /A rejection reason is required|Add a rejection reason/);
assert.match(client, /Add a revision note/);
assert.match(client, /My weekly reports/);
assert.match(client, /Resubmit report/);
assert.match(server, /\/api\/admin\/weekly-reports/);
assert.match(server, /start-review\|accept\|reject\|request-revision/);
assert.match(server, /The submitted report version is required/);
assert.match(server, /\["40001", "23505"\]\.includes\(code\)/);
assert.match(server, /code === "42501"/);
assert.match(styles, /\.tasks-version-row/);
assert.match(styles, /\.tasks-week-filter/);
assert.match(migration, /create table if not exists public\.weekly_report_versions/i);
assert.match(migration, /create table if not exists public\.weekly_report_reviews/i);
assert.match(migration, /create or replace function public\.submit_weekly_report/i);
assert.match(migration, /create or replace function public\.review_weekly_report/i);
assert.match(migration, /enable row level security/i);
assert.doesNotMatch(migration, /coalesce\(full_name,\s*email/i);

console.log("PASS weekly report UI and API wiring");
