# PR 69 Release Reconciliation

## After Released PR 77: 20 November 2026

Reconciled the existing PR 69 worktree with current main
`58b004e93d18364248fd19e0b6419f26bb746c8e`, preserving the existing branch history.
The five conflicts were shared asset revisions and cache assertions. Both feature stylesheets
remain linked, and the combined assets advance to `activity-author-task-history` and
`arg-pwa-v190-activity-author-task-history`. The task-history service, styling, migration and
existing SQL/API/browser tests match released main unchanged, as do the lifecycle routes and
archive/storage migrations. No new SQL migration, backfill or permission change is introduced.

Added a cross-feature browser regression to `tests/ui/activity-entry.spec.js`: after Admin and
Salesman reminder/correction saves, the Salesman completes a task and appends an additional
remark. Both actors see the task timeline, the completion evidence and earlier task remarks
remain unchanged, and the lead's separate activity history remains byte-for-byte equivalent.
The scenario passes on desktop and mobile. Existing archive invalidation, caller-token API
boundaries, removed-task rules and immutable histories remain enforced.

Local verification passed:

- `npm.cmd ci`: locked dependencies installed without lockfile changes; audit reported zero vulnerabilities.
- `npm.cmd run verify` with `CRM_TEST_PGLITE_MODULE=@electric-sql/pglite`: passed, including
  lifecycle SQL, registration, reassignment, all 13 task/history cases and task API pagination/security.
- Activity-entry desktop/mobile: 2 passed, each exercising independent Admin and Salesman sessions.
- Management-task Admin desktop/mobile: 8 passed, 2 role-inapplicable skips.
- Attribution/personal-log desktop/mobile: 4 passed, 4 role-inapplicable skips.
- Optional Salesman registration desktop/mobile: 2 passed, preserving blank, notes-only and explicit follow-up paths.
- CRLF-aware diff check passed. Existing mixed line endings were preserved.

The first focused run exposed a missing worktree PGlite dependency; installing the locked
dependencies resolved it. The first complete sandbox verification stopped at the auth-refresh
fixture with `connect EACCES 127.0.0.1:62575`. The unchanged test passed with normal localhost
permissions, followed by the complete passing suite. No assertion or runtime guard was weakened.

Exact commands (PowerShell in this worktree):

```powershell
npm.cmd ci
$env:CRM_TEST_PGLITE_MODULE='@electric-sql/pglite'
npm.cmd run verify
$env:CRM_UI_SUITE='activity-entry'
$env:CRM_UI_TEST_PORT='4711'
node node_modules/playwright/cli.js test --config=playwright.ui.config.js --project=admin-desktop --project=admin-mobile --output=.tmp/pr69-after77-activity-results
$env:CRM_UI_SUITE='management-tasks'
$env:CRM_UI_TEST_PORT='4721'
node node_modules/playwright/cli.js test --config=playwright.ui.config.js --project=admin-desktop --project=admin-mobile --output=.tmp/pr69-after77-task-results
$env:CRM_UI_SUITE='admin-reference'
$env:CRM_UI_TEST_PORT='4731'
node node_modules/playwright/cli.js test --config=playwright.ui.config.js --grep 'recorded author|personal read-only log' --output=.tmp/pr69-after77-attribution-results
$env:CRM_UI_SUITE='management-tasks'
$env:CRM_UI_TEST_PORT='4741'
node node_modules/playwright/cli.js test --config=playwright.ui.config.js --project=salesman-desktop --project=salesman-mobile --grep 'Salesman Step 3' --output=.tmp/pr69-after77-sales-registration-results
git -c core.whitespace=cr-at-eol diff --check
```

Vercel's existing settings show exactly three overrides for `codex/activity-origin-author`,
Preview only: Config URL/anon and Secret service-role. No value was revealed and no setting
was changed. A fresh pushed-head Preview, staging sign-in mapping and hosted Admin/Salesman
acceptance remain required; earlier hosted results below do not certify this reconciled head.
No Production record/schema change, PR merge or manual deployment is performed in this update.
Publication target remains `codex/activity-origin-author`; the local worktree branch is
`codex/activity-author-after-74`. Other PRs remain separate.

## Reminder and Legacy Correction Follow-up: 20 November 2026

Replaced the lead drawer's native reminder prompts with an in-page dialog using existing form styles.
The dialog retains failed entries, disables duplicate submission, and reuses its client activity ID
on a retry. Legacy notes/reminders now open the append-only correction dialog instead of the
structured-activity editor. Original entries are retained verbatim; corrections carry authenticated
authorship and a target ID. A mismatched target/index returns 409 without appending to another entry.
Protected creation events remain read-only and existing structured activity rules are unchanged.

Before reconciliation with the newly released lifecycle feature, `npm.cmd run verify` passed with
the disposable PGlite fixture enabled. The new `CRM_UI_SUITE=activity-entry` browser suite passed
both Admin desktop/mobile projects, each with an independent Salesman session. It checks reminder
failure/retry, actor attribution, preserved originals, append-only corrections and narrow layouts.
The initial sandbox browser startup stalled; only its identified test processes were stopped and
the local-only suite was rerun successfully with normal process permissions. No Production test,
record change, migration, merge or manual deployment was performed.

Reconciled with released main `240f3ab` after PR #76 merged. Kept both the lifecycle
archive/closure/duplicate guards and the dedicated activity-write guard; generic lead edits cannot
inject activities. Preserved all lifecycle tests and registration protections. The final
`npm.cmd run verify` passed with PGlite enabled. Reminder/correction desktop/mobile tests passed
again after reconciliation (2 cases, each exercising independent Admin/Salesman sessions).
Admin attribution and Salesman personal-log isolation tests passed on desktop/mobile (4 applicable
cases; 2 role-inapplicable skips). PWA assets use `activity-author-lifecycle` and
`arg-pwa-v188-activity-author-lifecycle`. Fresh hosted staging acceptance remains required.

## After PR 74: 19 November 2026

Reconciled the existing PR 69 branch in an isolated worktree starting from current released main `0072f1f106e59bae85ad02e434e00de9e9796b4b` (PR 74). The previous PR head `bb8d12425c726535c70d49da48e39a0c4bf901f8` is retained as a merge parent; no force push or main update is needed. Local branch: `codex/activity-author-after-74`; remote publication target remains `codex/activity-origin-author`. No other pending PR is combined.

Preserved PR 74's single immutable creation event, `New Lead creation` display, Recorded/filter/metric semantics, separate explicit reminders, optional blank Salesman Step 3, transactional registration, linked initial tasks, author/current-assignment isolation and corrected creation-history details. Reused main's existing author helper without creating a duplicate. Client/cache revisions advance to `activity-author-after-creation` / `arg-pwa-v182-activity-author`; the PR 69 stylesheet remains `14-activity-origin-author`.

The initial combined author test reproduced an invalid fallback: an arbitrary legacy `created_by_role` classified an unknown original actor as Management. Kept the existing main negative assertion. Role snapshots now require protected lead creation or a unique matching original activity-created event when no current actor profile is available. Regression fixtures cover valid original evidence, no evidence, mismatched actor evidence and ambiguous events. A historic name may be shown only from recorded identity; neither the current lead owner nor a later editor is substituted. This display fallback does not change authorization or rewrite saved history.

First full-verification failure after conflict resolution: duplicate local `const reminder` in the combined HTTP test. Renamed the new manually logged reminder fixture, preserving both sets of assertions. The generic lead-PATCH history attempt now asserts the PR 69 dedicated-workflow guard's 400 response, followed by an unchanged protected-creation read-back; the creation protection itself is not relaxed. Direct protected-activity mutation and database immutability checks remain.

Final `npm.cmd run verify` passed with disposable PGlite SQL tests enabled. Focused browser attribution/personal-log suite: 4 passed and 4 intentional role-specific skips. PR 74 Admin desktop/mobile registration suite: 2 passed, each with an independent Salesman context; verifies blank and explicit Step 3, correct creation/follow-up attribution, no duplicate reminders, personal isolation, read-only creation history and the corrected detail fields. No live environment test script was run.

```powershell
$env:CRM_TEST_PGLITE_MODULE='C:\Users\Glory\Documents\argleadstracker\.worktrees\lead-registration-purpose\node_modules\@electric-sql\pglite'
npm.cmd run verify
$env:CRM_UI_SUITE='admin-reference'
$env:CRM_UI_TEST_PORT='4631'
$env:CRM_UI_ARTIFACT_DIR=Join-Path (Get-Location) '.tmp\origin-after74'
node C:/Users/Glory/Documents/argleadstracker/node_modules/playwright/cli.js test --config=playwright.ui.config.js --grep 'recorded author|personal read-only log' --output=.tmp/origin-after74-results
$env:CRM_UI_SUITE='lead-creation'
$env:CRM_UI_TEST_PORT='4641'
$env:CRM_UI_ARTIFACT_DIR=Join-Path (Get-Location) '.tmp\creation-after69'
node C:/Users/Glory/Documents/argleadstracker/node_modules/playwright/cli.js test --config=playwright.ui.config.js --project=admin-desktop --project=admin-mobile --output=.tmp/creation-after69-results
git -c core.whitespace=cr-at-eol diff --check
```

The existing Vercel configuration was rechecked read-only: exactly three `codex/activity-origin-author` Preview overrides, Config URL/anon and Secret service-role. No values were revealed and no settings, secrets, Production data or schema were changed. No Redeploy, promotion or PR merge was performed. A push can trigger the normal automatic Preview integration; that is not a manual deployment or Production release.

This candidate has no SQL migration or backfill. Remaining gates: verify pushed-head GitHub checks and fresh Ready Preview, private staging Admin/Salesman sign-ins, and explicitly approved synthetic staging activity acceptance. A bounded staging-only test approval was requested; no hosted mutation has been performed as part of this reconciliation. No claim of Production readiness or live acceptance is made.

## Earlier Reconciliation Snapshot

Reconciled `codex/activity-origin-author` with released main `9fbfe9b3e74ca74fc49257b5c4f34e66acce5d51` on 19 November 2026. This PR stays separate from creation-event PR 74, access-audit PR 71 and other pending workflows. Preserved transactional registration, the no-duplicate-reminder Management Task rule, current task layout and company identity/manual-entry safeguards. Cache version is `arg-pwa-v180-activity-origin`.

Full `npm.cmd run verify` passed with PGlite enabled. Its first run exposed an old assertion expecting a reminder from an Admin-assigned new lead; PR 72 now creates a linked task instead. The test now requires that task and zero duplicate reminders; existing spoofed-author and actual Salesman reminder assertions remain intact. No historical author is guessed from the current lead owner.

Focused browser command: `CRM_UI_SUITE=admin-reference`, `CRM_UI_TEST_PORT=4571`, `CRM_UI_ARTIFACT_DIR=.tmp/origin-reconciled`; `node C:/Users/Glory/Documents/argleadstracker/node_modules/playwright/cli.js test --config=playwright.ui.config.js --grep 'recorded author|personal read-only log' --output=.tmp/origin-results`. Result: 4 passed, 4 intentional role-specific skips, covering Admin attribution and Salesman personal logs on desktop/mobile.

This feature has no SQL migration or backfill. Fresh hosted staging attribution and current-head CI remain required before release review. On 19 November, the approved Vercel configuration was saved and read back as exactly three overrides for `codex/activity-origin-author`, Preview only: URL, anon key and service-role Secret. Production was excluded; no shared setting was changed and Redeploy was not clicked. No Production change, merge or manual deployment was performed.
