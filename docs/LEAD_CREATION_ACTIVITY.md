# New Lead Creation Activity

## Status

Release candidate on `codex/lead-creation-activity-release`, based on fetched `origin/main` at `636438d45759855b4e95b871034d8e832ca40b7d` after PR #73. The earlier uncommitted draft is preserved in its original worktree. The user authorized a separate PR and staging-only migration, exact-branch Preview overrides and two synthetic lead registrations on 18 November 2026. No Production operation or merge is authorized. Record exact commit, PR, migration ledger and staging evidence after verification; do not infer completion from this plan. PR #69, PR #71 and PR #72 remain separate, and historical attribution is not backfilled.

## Acceptance And Implementation

- Each successful new CRM lead registration has one activity with Type `Lead creation` and the exact Notes text `New Lead Account creation`.
- Its actor ID, name, role and timestamp come from authenticated server context. Admin registration records the Admin, not the assigned Salesman. Imports record the importing Admin; updating an existing imported lead does not add another creation event.
- New automatic reminders also store their actual creator. Existing unknown activity authors remain unknown; current lead ownership is never used to invent historical authorship.
- The Activity log shows creation as `Recorded`, with `Self` or `Management` origin and the creator in `Logged by`. Creation events are excluded from pending/missing-remarks/closed follow-up totals, contact conversion and activity-performance counts.
- Creation history is read-only. Ordinary activity additions and lead edits preserve it, and current-assignment Salesman isolation remains intact.

The root cause was two separate omissions: automatic reminders had no creator fields, and registration had no dedicated Activity entry. This change does not bundle PR #69's broader activity attribution work.

## Files

- `src/services/activityWorkflowService.js`: canonical creation event, actor snapshot and immutable-history validation.
- `server.js`: new registrations/imports, reminder attribution, local write protection and protected-event API restrictions.
- `client.js`: truthful creator display, Recorded status/filter, follow-up metrics and read-only creation controls.
- `supabase/migrations/20261118122627_lead_creation_activity_audit.sql`: prepared insert/update triggers; authenticated actor lookup, canonical single entry, new reminder attribution and immutable creation history. No table grants or RLS policies change. Trusted service-role imports must identify an active CRM creator. Anonymous/unknown creators fail closed.
- `package.json`, `package-lock.json`: pinned PGlite test dependency and required SQL regression in `verify`.
- `playwright.ui.config.js`, `tests/ui/lead-creation.spec.js`: separate local synthetic Admin/Salesman browser workflow.
- `tests/lead-creation-activity.test.cjs`, `tests/admin-reference.test.js`, `tests/admin-salesman-permissions.e2e.test.js`: actor, spoofing, role, history, import, failed-save and status regressions.
- `tests/ui/management-tasks.spec.js`: initial-task creation now expects its one administrative creation event, not zero activities.
- `index.html`, `sw.js` and three cache assertion tests: client/cache revision `lead-creation-activity` / `arg-pwa-v176-lead-creation-activity`; caching protections and PR #73 layout unchanged.

## Verification

```powershell
$env:CRM_TEST_PGLITE_MODULE='C:\Users\Glory\Documents\argleadstracker\.worktrees\lead-registration-purpose\node_modules\@electric-sql\pglite'
node --test tests/lead-creation-activity.test.cjs
node tests/admin-reference.test.js
node tests/admin-salesman-permissions.e2e.test.js
npm run verify
$env:CRM_UI_SUITE='lead-creation'
$env:CRM_UI_TEST_PORT='4491'
$env:CRM_UI_ARTIFACT_DIR=Join-Path (Get-Location) '.tmp\lead-creation-ui'
node C:/Users/Glory/Documents/argleadstracker/node_modules/playwright/cli.js test --config=playwright.ui.config.js --project=admin-mobile --project=admin-desktop
git -c core.whitespace=cr-at-eol diff --check
```

The service regression failed before implementation (`withLeadCreationActivity is not a function`). Focused tests and full verification passed. Database tests execute the migration in disposable PGlite with separate authenticated, anonymous and service-role sessions, active/inactive profiles and RLS. They verify spoof rejection, exactly one event, untouched legacy history/policies, immutable entries, normal activity additions, current-owner isolation and transactional rollback. Local HTTP tests exercise registration and import read-back and protected-event denial.

Desktop/mobile browser tests passed (2 tests): Salesman and Admin create through the Pipeline form; Admin sees both verified creators; the personal Salesman log retains its creator/current-assignment scope; creation entries do not inflate follow-up totals or expose editing/deletion. Browser harness navigation and selectors were corrected after failures on a hidden Add Lead button and the hidden legacy table. Synthetic proof: `.tmp/lead-creation-ui/after/admin-desktop/admin-lead-creation-attribution.png` and the matching `admin-mobile` image.

The final full-suite rerun first hit the sandbox's localhost restriction (`connect EACCES 127.0.0.1:61994`), then passed outside that restriction with all SQL tests enabled. A subsequent desktop UI rerun timed out on `#openLeadForm`; its failure snapshot showed Sign in after two immediately consecutive navigations, while mobile passed. The redundant intermediate dashboard navigation was removed from this test only. Authentication, runtime limits and application navigation are unchanged. The final browser rerun passed both desktop and mobile tests (2 passed, 56.7 seconds).

## Staging Database Evidence

On 18 November 2026, the approved staging project `grxzqxqgtksunzfhtwox` was verified healthy. Its completed scheduled backup was dated 18 November 2026 at 02:51:32 UTC (06:51:32 Dubai). Only the migration in this PR was applied; Supabase recorded ledger version `20261118131912`, name `lead_creation_activity_audit` (the source filename retains its original timestamp).

Read-back verified both triggers enabled, both functions security-invoker with `search_path=pg_catalog`, and direct execution denied to anonymous, authenticated and service roles. Separate authenticated Admin and Salesman database-role rehearsals passed, including one linked initial task, actual creator snapshots, spoof rejection and immutable history. All rehearsal writes were rolled back. These are database-role tests, not hosted form tests.

Before migration, after migration and after rehearsal, counts and aggregate row fingerprints were identical: 19 leads, 13 companies and 20 tasks. No existing records were changed or backfilled. Existing security-advisor findings were unchanged; this feature does not resolve unrelated weekly-report RPC or Auth configuration findings.

## Remaining Gates And Baseline Dependency

Commit/push and a separate PR are authorized. The remote branch currently contains unchanged main only; feature publication and hosted verification remain pending. Exact-branch staging URL and anon overrides are saved. Saving the staging service-role Secret is awaiting action-time confirmation; Production is excluded. Do not push a feature build inheriting the shared service-role credential.

Review overlap with PR #69 before combining; this branch has only the reminder helper overlap and creation-specific behavior. PR #72 remains separate and conflicting with main. Its transactional registration repairs are not included here. In current main, `normalizeStageValue` maps Prospect to `NEW`, while the blueprint constraint accepts `PROSPECT`, `OUTREACH`, `ENGAGED`, `SAMPLING`, `ACTIVE` and `DORMANT`. The ordinary Salesman path also creates the company before inserting the lead. Do not run a knowingly failing hosted registration that could leave an orphan company, select another stage to mask it, or bypass caller permissions. Resolve/retest that prerequisite before claiming full hosted Admin/Salesman form acceptance.

Local SQL tests use the exact blueprint status set and prove an invalid `NEW` status rolls back their transactional test function. This does not prove that the baseline nontransactional HTTP save path is repaired. Hosted role-session verification, a fresh Preview matched to the feature commit, and current-head GitHub checks remain unperformed. No two persistent synthetic leads have been created for the hosted test yet.

Production schema/backup review, migration approval and human release are separate gates. No Production operation, merge or manual deployment occurred. No existing `Not recorded` entries were repaired or guessed.
