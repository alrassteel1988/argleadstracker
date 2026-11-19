# New Lead Creation Activity

## Current Reconciliation: 19 November 2026

The notes below this section describe earlier verification snapshots. PR #72 and PR #75 are now in `origin/main` at `9fbfe9b3e74ca74fc49257b5c4f34e66acce5d51`. This reconciliation preserves their transactional company/lead registration, optional Salesman Step 3, Admin task choices, identity matching and verified manual-entry controls. PR #69 and PR #71 are not included.

The registration serializer retains `newRegistration: true` while adding the protected creation event. Cache revisions are now `lead-creation-registration-audit` and `arg-pwa-v180-lead-creation-registration`. No migration SQL was changed, and no historical data is backfilled.

Full `npm.cmd run verify` passed with PGlite enabled. New integration coverage executes the actual registration RPC both with and without the creation trigger, against the unchanged blueprint stage constraint. It verifies one event after the default-stage retry, no orphan company on failure, current-owner isolation and a separate explicit reminder. The Admin task RPC is also tested with the creation trigger: exactly one creation event and one linked task, with no duplicate reminder. The Supabase HTTP serializer test executes the actual Salesman RPC and verifies the final database event ID and authenticated creator.

The first restricted full run failed on localhost `connect EACCES`; the next unrestricted run exposed an obsolete zero-activities assertion in the blank-Step-3 test. It was strengthened to require zero reminders and exactly one creation event. Final full verification passed after updating the corresponding API fixture expectations.

Desktop and mobile browser tests passed (2 tests, each with independent Admin and Salesman sessions). Both blank Step 3 and explicitly scheduled Step 3 now verify `New Lead creation`, `Self`, the creator's name and `Recorded` in the personal Salesman Activity log. Admin sees Management for Admin-created leads and Self for Salesman-created leads. Optional follow-ups remain separate rows and do not change the creation event. Manual lookup is disabled for synthetic fixtures. Screenshots: `.tmp/lead-creation-reconciled/after/{admin-desktop,admin-mobile}/{admin,salesman}-lead-creation-attribution.png`.

Commands: `node --test tests/lead-creation-activity.test.cjs tests/lead-registration-database.test.cjs tests/management-tasks.test.cjs`; `npm.cmd run verify`; with `CRM_UI_SUITE=lead-creation`, `CRM_UI_TEST_PORT=4521` and `CRM_UI_ARTIFACT_DIR=.tmp/lead-creation-reconciled`, `node C:/Users/Glory/Documents/argleadstracker/node_modules/playwright/cli.js test --config=playwright.ui.config.js --project=admin-desktop --project=admin-mobile --output=.tmp/lead-creation-results`.

These are local disposable tests, not hosted acceptance or Production proof. Fresh Preview, staging workflow verification, Production backup/schema review and explicit Production migration approval remain release gates. No merge, manual deployment, environment change or Production data operation occurred during this reconciliation.

## Earlier Status

Release candidate on `codex/lead-creation-activity-release`, based on fetched `origin/main` at `636438d45759855b4e95b871034d8e832ca40b7d` after PR #73. The earlier uncommitted draft is preserved in its original worktree. The user authorized a separate PR and staging-only migration, exact-branch Preview overrides and two synthetic lead registrations on 18 November 2026. No Production operation or merge is authorized. Record exact commit, PR, migration ledger and staging evidence after verification; do not infer completion from this plan. PR #69, PR #71 and PR #72 remain separate, and historical attribution is not backfilled.

## Acceptance And Implementation

- Each successful new CRM lead registration has one protected activity displayed as Type `New Lead creation` and the exact Notes text `New Lead Account creation`. The stored canonical type remains `Lead creation`; display formatting does not rewrite saved history.
- A Salesman's explicitly entered Step 3 action/date creates a separate `Reminder` activity with its own ID, actual creator and `Self` origin. Creation remains a Recorded event, not a pending follow-up. PR #72 supplies optional blank Step 3 and transactional registration; this PR does not bundle those changes.
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
- `index.html`, `sw.js` and three cache assertion tests: client/cache revision `new-lead-creation-activity` / `arg-pwa-v178-new-lead-creation`; caching protections and PR #73 layout unchanged.

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

Commit/push and a separate PR are authorized. On 19 November 2026, after the explicit action-time confirmation, staging's service-role key was saved as a Vercel Secret for `codex/lead-creation-activity-release` only. The filtered Vercel list verified exactly three branch overrides: Secret `SUPABASE_SERVICE_ROLE_KEY`, Config `NEXT_PUBLIC_SUPABASE_ANON_KEY` and Config `NEXT_PUBLIC_SUPABASE_URL`, each marked Preview with that branch. Production and shared variables were not changed, and Redeploy was not clicked. Values were not included in logs or files. Feature publication and hosted verification are tracked separately in the PR; a successful configuration save is not deployment or workflow proof.

Review overlap with PR #69 before combining; this branch has only the reminder helper overlap and creation-specific behavior. PR #72 remains separate; its conflict reconciliation at `621a1f9` and hosted Admin/Salesman staging tests passed on 19 November 2026, but it is not released. Its transactional registration repairs are not included here. In current main, `normalizeStageValue` maps Prospect to `NEW`, while the blueprint constraint accepts `PROSPECT`, `OUTREACH`, `ENGAGED`, `SAMPLING`, `ACTIVE` and `DORMANT`. The ordinary Salesman path also creates the company before inserting the lead. Do not run a knowingly failing hosted registration that could leave an orphan company, select another stage to mask it, or bypass caller permissions. Release/retest that prerequisite before claiming full hosted Admin/Salesman form acceptance for this PR.

Local SQL tests use the exact blueprint status set and prove an invalid `NEW` status rolls back their transactional test function. This does not prove that the baseline nontransactional HTTP save path is repaired. Hosted role-session verification, a fresh Preview matched to the feature commit, and current-head GitHub checks remain unperformed. No two persistent synthetic leads have been created for the hosted test yet.

## Display Label And Separate Follow-up Regression: 19 November 2026

The requested Admin Type label is now `New Lead creation` for protected creation events only. Raw saved type remains `Lead creation`; no historical entry or SQL migration was changed by this follow-up. `node tests/admin-reference.test.js` first failed with actual `Lead creation` versus expected `New Lead creation`, then passed after the projection-only fix.

`node tests/admin-salesman-permissions.e2e.test.js`, full `npm run verify` with PGlite enabled, and both Admin desktop/mobile Playwright projects passed. Browser assertions verify exactly two rows for the Salesman's synthetic lead: one Recorded creation and one separately scheduled Reminder, distinct IDs, actual creator and Self origin. Admin creation shows Management and the Admin creator. No Production or hosted business records were changed by this follow-up. PR #72's optional Step 3 and atomic registration remain a separate release prerequisite. Local screenshot artifacts are under `.tmp/lead-creation-ui/after/`; they are not hosted acceptance proof.

Production schema/backup review, migration approval and human release are separate gates. No Production operation, merge or manual deployment occurred. No existing `Not recorded` entries were repaired or guessed.
