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
