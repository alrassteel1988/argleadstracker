# Lead Registration Task Choices

## Scope

- New Admin-created leads assigned to an active Salesman create one linked Management Task, displayed in Focus and Management Tasks.
- The title is `New Lead Outreach` (default) or `Respond to Initial RFQ`. The API validates this choice; the database validates the stored insert title.
- The deadline is the next Monday-Saturday working date, calculated using Asia/Dubai. Sunday is excluded; no public-holiday calendar is configured.
- Admin does not enter an action plan or deadline in this new-lead path. Purpose, notes and voice notes remain available.
- Salesman Step 3 is optional. Its action and date start blank. Both must be entered to schedule a follow-up; neither creates no reminder or Management Task. Notes alone are permitted.
- Additional follow-up details (monthly volume, first order date, products/services remarks) are no longer shown in Step 3 for either role. Saved values remain available in existing record/report views and are not cleared by an edit that omits those fields.
- Existing activities, initial tasks, deadlines and author history are not migrated or backfilled. Existing Edit Lead action/date behavior is retained.

## Backend And Security

`POST /api/leads` accepts `initial_management_task_title` for an Admin assignment. The field is validated then translated into the existing transactional RPC payload; it is not a new table column. A missing title defaults to New Lead Outreach. Salespeople cannot create management-issued tasks by supplying this field.

The atomic company/lead/task save, active Admin and Salesman validation, caller-token authorization, task audit event, RLS and same-lead duplicate-resolution guard are preserved. No new service-role or anonymous permission is granted.

Migration: `20261118100838_lead_registration_task_choices.sql`. This replaces only the insert-task function and adds a private date helper; it does not alter the database's `Qualify lead` column default. Legacy action labels from older builds are accepted on new linked inserts and mapped to New Lead Outreach with the new automatic deadline. Existing rows are unchanged.

## Release Gates

1. Run `npm run verify` with `CRM_TEST_PGLITE_MODULE` pointing to the available PGlite package.
2. Run `CRM_UI_SUITE=management-tasks` with the repository Playwright configuration, covering desktop and mobile.
3. Obtain separate approval before applying the migration to staging. Use exact-branch staging-only Preview credentials and verify the fresh build before signing in.
4. Test both titles, one linked task in both views, optional Salesman scheduling, denied role escalation, failed-save rollback, saved-field preservation and Sunday skipping.
5. Production requires a fresh backup/schema check, specific migration approval, coordinated human release and post-release role checks. Do not release the new frontend before the database function supports its titles.

This feature does not include PR #69 or the separate Admin access-audit work. No migration application, merge or deployment is authorized by this document.

## Local Verification, 18 November 2026

Verification branch: `codex/lead-registration-purpose`. Base: `41a8a75c26725be16aa3a57ea23ef3dba79c2a2d` (`origin/main` at the verified fetch). Tests below were performed locally before publication. Commit, push, checks and Preview status are tracked separately in the pull request; they do not authorize a hosted migration or Production release.

Files changed:

- Runtime: `client.js`, `index.html`, `server.js`, `src/services/managementTaskService.js`, `sw.js`.
- Database: `supabase/migrations/20261118100838_lead_registration_task_choices.sql`.
- Test runner: `package.json`.
- Regressions: `tests/lead-registration-api.test.cjs`, `tests/management-tasks.test.cjs`, `tests/lead-assignment-isolation.test.js`, `tests/lead-reassignment-api.test.js`, `tests/admin-salesman-permissions.e2e.test.js`, `tests/ui/management-tasks.spec.js`.
- Cache assertions: `tests/activity-dashboard-latest.test.js`, `tests/admin-dashboard-layout.test.js`, `tests/global-bauhaus-system.test.js`.
- Documentation: this file.

Commands run in this worktree (PGlite and Playwright paths identify the local test runtimes, not deployment dependencies):

```powershell
$env:CRM_TEST_PGLITE_MODULE=(Resolve-Path '..\activity-edit-governance\node_modules\@electric-sql\pglite').Path
npm run verify
$env:CRM_UI_SUITE='management-tasks'
$env:CRM_UI_TEST_PORT='4291'
$env:CRM_UI_ARTIFACT_DIR=Join-Path (Get-Location) '.tmp\lead-registration-ui'
node C:\Users\Glory\Documents\argleadstracker\node_modules\playwright\cli.js test --config=playwright.ui.config.js
node C:\Users\Glory\Documents\argleadstracker\node_modules\playwright\cli.js test --config=playwright.ui.config.js --grep 'Admin lead creation|Salesman Step 3'
node C:\Users\Glory\Documents\argleadstracker\node_modules\playwright\cli.js test --config=playwright.ui.config.js --grep 'Salesman Step 3'
git -c core.whitespace=cr-at-eol diff --check
```

Results:

- Clean baseline and final `npm run verify`: passed. Final database suite includes six passing tests and the new mock-Supabase API regression.
- Full Management Tasks browser suite: 10 passed, 10 intentional role-inapplicable skips. This covers assignment, progress, completion, ordinary duplicate removal, same-lead initial-task resolution and registration on desktop/mobile.
- Registration-focused browser run after visible validation changes: 4 passed, 4 role-inapplicable skips. Final Salesman persisted-record read-back run: 2 passed, 2 role-inapplicable skips.
- Screenshots inspected on desktop and mobile. No horizontal page overflow in the tested flows.
- The migration was exercised only in disposable local PostgreSQL fixtures. Existing leads, activities, tasks and audit events were compared before/after and remained identical. The default Prospect save, invalid-title rollback, role isolation, protected link and caller identity were checked.
- API regression confirms fields removed from the form are omitted from an edit, preserving their previously saved values.
- Initial full verification first failed at the old permissions fixture's other-lead create assertion (`400 == 201`): its assignee did not exist. The fixture now explicitly creates that active Salesman; the boundary checks remain unchanged and pass.

Not performed: hosted staging migration, fresh Vercel Preview, hosted Admin/Salesman rehearsal, Production access, Production migration, merge or deployment. These remain release gates, not verified outcomes. No secrets or customer records were used in the fixtures or screenshots. The existing root-worktree changes were left untouched.

## Salesman Save Repair

The first hosted rehearsal found that ordinary Salesman registration sent `NEW` to the blueprint schema, which accepts `PROSPECT`. Its separate company insert could survive a failed lead insert. The Admin linked-task path was already transactional.

Migration `20261118111941_atomic_new_lead_registration.sql` adds `public.save_new_crm_lead(jsonb)`. Ordinary form registration now uses this caller-token, security-invoker RPC to create the company and lead together. It preserves RLS, verifies active identity and Salesman ownership, rejects unsupported fields and invisible companies, and grants execution only to `authenticated`. No service-role fallback, backfill, default change or orphan cleanup is included. The existing Admin company/lead/task RPC is retained.

Only an exact `leads_status_blueprint_check` failure for input `NEW` retries as `PROSPECT`; other failures roll back the whole save. A schema accepting `NEW` keeps it. The existing API stage label remains unchanged. Missing migration returns 503 instead of falling back to separate inserts.

Repair files: `server.js`, the new migration, `tests/lead-registration-database.test.cjs`, `tests/lead-registration-api.test.cjs`, `package.json`, `package-lock.json`, `.github/workflows/verify.yml`, and this document. PGlite is pinned as a development dependency, and CI explicitly enables database regressions.

```powershell
$env:CRM_TEST_PGLITE_MODULE='@electric-sql/pglite'
node tests/lead-registration-api.test.cjs
npm run verify
$env:CRM_UI_SUITE='management-tasks'
$env:CRM_UI_TEST_PORT='4291'
$env:CRM_UI_ARTIFACT_DIR=Join-Path (Get-Location) '.tmp\lead-registration-ui'
node node_modules/playwright/cli.js test --config=playwright.ui.config.js
```

Full local verification passed after the repair. SQL tests execute the real migration with the repository's blueprint constraint and synthetic caller roles. The API test passes the complete serialized registration payload into that RPC and checks persisted status, optional scheduling, 503 on missing migration, denied writes, and no split-write fallback. SQL tests also verify company/lead rollback on constraint, date, numeric, RLS and audit failures, invisible-company isolation, visible-company reuse, unchanged `NEW` on a compatible schema, and function permissions. The first enhanced API assertion incorrectly expected the database label in the normalized API response; it now separately checks both layers.

The user approved pushing this repair to PR #72 and applying only this migration to staging after backup/schema and browser checks. Hosted repair results remain pending until recorded separately. Production, PR #69, PR #71 and the earlier synthetic orphan company are outside this approval.

Repair browser regression: 10 passed and 10 intentional role-inapplicable skips across desktop/mobile. Admin task choices and optional Salesman scheduling remain intact; desktop Admin and mobile Salesman screenshots were inspected. These local browser tests use the synthetic JSON server, while the SQL/API regressions above exercise the actual transactional function.

## Staging RLS Read-Back Follow-Up

Commit `7e9d06a6227ea4ac8d49f94f734a34102988f626` was pushed to PR #72. The approved atomic registration migration was applied to staging under ledger version `20261118113707`. Its function permissions were verified, and all company/lead/task hashes remained unchanged. The fresh Preview is `argleadstracker-idberokf5-al-ras-steel.vercel.app` (Vercel deployment `5MWAUwj1CcMZ2Z6WtpRFvwiCSZ6k`).

A rollback-only hosted Salesman rehearsal exposed a second issue: the existing `private.crm_can_access_lead(id)` SELECT policy looks up the lead and cannot see the inserted row during `INSERT ... RETURNING`. The rehearsal failed with 42501 and left company/lead counts and hashes unchanged. No persistent test records were created by that rehearsal.

Follow-up migration `20261118113937_registration_rls_readback.sql` replaces only the new security-invoker function. It generates the lead ID within the transaction, inserts without RETURNING, then reads through the unchanged SELECT policy in a separate statement. Both inserts still roll back if the read is denied. It does not alter RLS, grants, existing records, defaults or the Admin linked-task function. Apply it after the atomic registration migration, not instead of it.

The SQL regression now reproduces the lookup-based policy, including current assignment and legacy name matching. The API regression also exercises a stable lookup-based policy with the full serializer payload. Both pass locally with the follow-up; the first migration alone reproduces staging's 42501. Additional coverage confirms a denied final read rolls back both records. The complete `npm run verify` passed again with the follow-up. The user explicitly approved pushing this follow-up to PR #72 and applying only this migration to staging after verification and a backup recheck. Hosted Admin/Salesman repair results are recorded separately after testing; this approval does not cover Production, merging, PR #69/#71 or orphan cleanup.

## Current Main Reconciliation: 19 November 2026

The owner requested resolving PR #72 conflicts while preserving latest main, staging-first retesting and keeping PR #69 separate. A fresh worktree/branch, `codex/pr72-main-reconciliation`, started at main `636438d45759855b4e95b871034d8e832ca40b7d`. PR #72 head `18c7db48432ac2688b99797d85146eb1978fdaf0` was combined locally without rewriting either history. The resulting commit is intended as a fast-forward update to PR #72's existing `codex/lead-registration-purpose` branch, not a merge into main.

Conflicts were limited to the client query revision, service-worker version and three cache assertions. They now agree on `lead-registration-main` / `arg-pwa-v177-lead-registration-main`. Main's `management-tasks.css` is byte-for-byte unchanged, its `v=5-task-layout` link is retained, and the compact Admin actions, equal instruction/remark columns, full-width duplicate note and drawer typography remain. Registration assertions and main's responsive layout assertions coexist in the browser suite. No PR #69, #71 or #74 implementation is included. The three existing PR #72 SQL migration files are unchanged.

Verification on the reconciled code:

- Full `npm run verify`: passed with database tests enabled via the installed sibling PGlite runtime.
- Full local Management Tasks browser suite: 10 passed, 10 intentional role-inapplicable skips, across Admin/Salesman desktop/mobile. Includes both registration workflows, canonical task visibility/completion, optional/notes-only/scheduled Salesman saves, same-lead resolution and the latest main layout checks.
- `git diff --quiet origin/main -- management-tasks.css`: exit 0. `git diff --quiet origin/codex/lead-registration-purpose --` the three migration paths: exit 0. No conflict markers remain.

Staging-only evidence:

- Project `grxzqxqgtksunzfhtwox` is ACTIVE_HEALTHY. Latest scheduled backup observed: 19 November 2026, 02:53:40 UTC / 06:53:40 Dubai. No Restore action used.
- All three migrations already exist in staging: task choices ledger `20261118104613`, atomic registration `20261118113707`, RLS read-back `20261118114746`. No migration was reapplied or changed.
- Existing exact-branch Vercel overrides are present for `codex/lead-registration-purpose` only: service-role Secret plus URL and anon Config, each Preview-scoped. No environment variable was edited. The dashboard requested identity re-verification to reveal the public URL; this was cancelled rather than requesting or handling an OTP. Fresh-build runtime confirmation remains separate.
- Authenticated database-role rehearsals used only the existing staging test Admin and Salesman. Both Admin titles created exactly one linked task due the next Monday-Saturday working day; the Salesman could read the assigned lead/task. Blank/notes-only Salesman scheduling created no task/reminder, explicit scheduling retained one reminder, forged identity/foreign ownership were denied, and a numeric-failure save left no orphan company. All synthetic rehearsal writes were rolled back.
- Counts and aggregate row hashes remained identical before/after: 19 leads (`9a49cf80295f1f0ca4c74ff27c95444f`), 13 companies (`11d3eb8522121bb8d55c4e85d55f9726`), 20 tasks (`05ad26f0e98b502c170f5c6f6827d570`). No existing lead, task, activity or orphan company was changed.

Commands for this reconciliation:

```powershell
git fetch origin
git worktree add -b codex/pr72-main-reconciliation .worktrees/pr72-main-reconciliation origin/main
git merge --no-commit --no-ff origin/codex/lead-registration-purpose
$env:CRM_TEST_PGLITE_MODULE='C:\Users\Glory\Documents\argleadstracker\.worktrees\lead-registration-purpose\node_modules\@electric-sql\pglite'
npm run verify
$env:CRM_UI_SUITE='management-tasks'
$env:CRM_UI_TEST_PORT='4531'
$env:CRM_UI_ARTIFACT_DIR=Join-Path (Get-Location) '.tmp\pr72-reconciled-ui'
node C:/Users/Glory/Documents/argleadstracker/node_modules/playwright/cli.js test --config=playwright.ui.config.js
git -c core.whitespace=cr-at-eol diff --check
```

Current release gate: fresh Preview matched to the pushed reconciliation commit, private Admin/Salesman sign-ins and hosted form/API/database read-back remain pending. Database-role rehearsal does not prove browser workflow acceptance. Production schema/backup review and any missing migrations require separate explicit approval; no Production access, merge, deployment or promotion occurred. Earlier sections are historical evidence and must not be read as the current release status.
