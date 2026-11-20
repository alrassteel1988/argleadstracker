# Management Task Remark History

## Scope

Feature branch: `codex/task-remark-history`, based on released main `0072f1f`.
The owner approved a separate commit/PR and branch-only staging Preview setup. This document
does not authorize a hosted migration, backfill, deployment or merge.
PR #76 and all other pending PRs remain separate.

The existing application is a static JavaScript/PWA client, Node HTTP API and Supabase
Postgres/Auth/RLS, with a JSON-file development fallback. There is no ORM.
Task statuses already persist as `not_started`, `in_progress` and `completed`; no status
conversion is needed. Existing task audit snapshots preserve previous progress remarks.

## Behaviour

- Status labels are Not Started, In Progress and Completed. Overdue remains an additional
  deadline badge, never a fourth status. Removed assignments retain their existing audit-only view.
- Admin filters: All, Not Started, In Progress, Completed, Overdue, Removed. All/Assigned and
  completion rate exclude withdrawn assignments; Removed has a separate count. Pending means
  Not Started plus In Progress. Summary cards and filter counts use the selected Salesman;
  Salesman cards retain their own totals.
- The existing Salesman drawer retains search, sort, timing, counts and ownership restrictions.
  Tabs are Not Started, In Progress, Overdue, Completed, All. Opening picks the first non-empty
  pending status, otherwise All. Explicitly selected empty filters offer View completed when applicable.
- Completed tasks stay available under Completed/All. An additional remark leaves `status`,
  `completed_at`, `progress_at`, deadline and the original completion text unchanged. It increments
  the task version and records its own timestamp and authenticated author.
- All task rows show the latest remark preview. Expanded instructions and the complete dated
  timeline receive equal width on desktop and stack on mobile. No remark edit/delete controls exist.
- Every active Admin gets an in-app notification for an additional completion remark. Admin's
  Management Tasks workspace displays the pending notices; View remark opens the corresponding
  task and acknowledges only that Admin's notification.

## Data and Security

`public.management_task_remarks` stores `id`, `task_id`, `author_id`, `author_name`, `type`,
`text`, `created_at`, `task_version` and an optional unique legacy `source_key`.
Types: `started`, `progress_update`, `completion`, `additional_remark`.
The JSON fallback uses the separate `management_task_remarks` list and preserves existing events.

The legacy `management_tasks.remarks` field remains a compatibility projection for existing clients.
Progress/completion RPC audit inserts capture a new remark through a trigger, so older clients do
not bypass history. Additional remarks use a new authenticated, version-checked RPC and do not
overwrite that completion projection. A notification failure rolls back the complete append operation.

Authenticated roles have SELECT only on the new table, scoped through existing task RLS. They
have no direct INSERT/UPDATE/DELETE/TRUNCATE grants. An immutable trigger additionally rejects
updates/deletes. SQL writers use private fixed-search-path functions with explicit profile, active
role, current ownership, removed-task and linked-lead checks. The public wrapper is SECURITY INVOKER.
The new append RPC also refuses archived linked leads if PR #76 is later installed. Remark SELECT
inherits any restrictive archive policy on the parent task; this feature does not relax those policies.

API:

- `GET /api/management-tasks`: existing task list plus RLS-scoped `remark_history`; both collections
  are paginated server-side in stable order so the full history is not truncated at a PostgREST page limit.
- `POST /api/management-tasks/:id/progress`: existing status/progress writer; new history is automatic.
- `POST /api/management-tasks/:id/remark`: Salesman only, `{ expected_version, text }`, completed tasks only.
- Mutating `/api/management-tasks/:id/remarks[/remark-id]` returns 405, for Admins as well as Salesmen.
- `GET /api/management-task-notices` and `POST /api/management-task-notices/:id/read`: Admin only,
  recipient-scoped. No service-role credential is used for ordinary reads/writes.

## Migration and Legacy Recovery

New file: `supabase/migrations/20261120083750_management_task_remark_history.sql`.
Apply only after separate approval for the exact target project and backup/schema review.
Use the approved project's SQL editor or approved migration tool to run this single file.
Do not run reset, RUN_ALL or unrelated pending migrations. A release owner must merge/deploy.

The transaction locks task and event writes, creates the table, copies every historical progress
audit snapshot with its original actor name/ID and timestamp, preserves an uncovered latest legacy
value, and installs capture/immutability before releasing the lock. Task rows and old events are
not rewritten. Keep task writes paused during an approved hosted migration and verify before release.

Missing history cannot be reconstructed: if an old value was overwritten before audit capture
existed, the migration cannot invent it. An uncovered legacy text uses the existing progress,
completion, update or creation timestamp (in that order) and author `Not recorded`, rather than
guessing that the current assignee wrote it. `source_key` identifies this recovery provenance.
No original task/audit value is deleted, and no dates are replaced with migration time.

Prerequisites are the released management-task, removal and notification schemas (including
`management_tasks.removed_at` and notification `payload`). No new environment variable, provider,
secret or account permission configuration is required. Hosted staging verification must confirm
that the existing public-schema Data API settings expose the new table/RPC after schema-cache refresh.

Read-only post-migration checks:

```sql
select column_name,data_type from information_schema.columns
where table_schema='public' and table_name='management_task_remarks';
select policyname,cmd from pg_policies
where schemaname='public' and tablename='management_task_remarks';
select has_table_privilege('authenticated','public.management_task_remarks','select') can_read,
       has_table_privilege('authenticated','public.management_task_remarks','update') can_update,
       has_table_privilege('authenticated','public.management_task_remarks','delete') can_delete;
```

## Verification

```powershell
npm.cmd ci
node --test tests/task-remark-history.test.cjs
node tests/task-remark-history-api.test.cjs
npm.cmd run verify
$env:CRM_UI_SUITE='management-tasks'
$env:CRM_UI_TEST_PORT='4682'
npx.cmd playwright test --config=playwright.ui.config.js --project=admin-desktop --project=admin-mobile
```

Tests use disposable PGlite databases, mocked Supabase API responses and isolated local browser
fixtures. Never provide Production credentials to them. Coverage includes historical migration,
authenticated authorship, version conflicts, notification rollback, immutable API methods and SQL
grants/triggers, peer isolation, completed-task visibility, default/empty tabs, filters/counts,
additional remarks, notifications and narrow/mobile layout checks. Existing optional native-Postgres
tests may skip unless their fixture module is configured; the new PGlite migration test always runs.

Files changed: task service and server API, client and task CSS, index/service-worker versions,
package test wiring, focused task history/API/browser tests, the three existing cache assertion tests,
the new migration and this guide. No hosted or Production verification is claimed by local tests.

### Local Results (20 November 2026)

- `npm.cmd run verify`: passed on the final implementation, including the new migration and API tests.
- Desktop/mobile management-task browser suite: 8 passed; 2 Salesman-only scenarios are inapplicable
  to the selected Admin projects (each applicable test opens and exercises a separate Salesman session).
- The two conditionally enabled database fixtures also passed when explicitly run with
  `$env:CRM_TEST_PGLITE_MODULE='@electric-sql/pglite'` and
  `node --test tests/management-tasks.test.cjs tests/lead-reassignment-database.test.cjs` (7 tests, no skips).
- Default `git diff --check` treats existing mixed CRLF lines as trailing whitespace. The
  CRLF-aware `git -c core.whitespace=cr-at-eol diff --check` passes; unrelated line endings were preserved.
- Initial dependency installation failed with sandbox DNS `ENOTFOUND`; an approved normal-network
  `npm.cmd ci` succeeded without lockfile changes.
- No hosted migration or manual deployment was performed. Commit/push/PR status must be checked
  in Git/GitHub; hosted staging testing and separate migration approval remain release gates.

Exact file inventory:

```text
client.js
server.js
src/services/managementTaskService.js
management-tasks.css
index.html
sw.js
package.json
supabase/migrations/20261120083750_management_task_remark_history.sql
tests/task-remark-history.test.cjs
tests/task-remark-history-api.test.cjs
tests/ui/management-tasks.spec.js
tests/activity-dashboard-latest.test.js
tests/admin-dashboard-layout.test.js
tests/global-bauhaus-system.test.js
docs/MANAGEMENT_TASK_REMARK_HISTORY.md
```
