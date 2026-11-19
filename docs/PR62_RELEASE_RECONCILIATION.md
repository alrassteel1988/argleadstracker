# PR 62 Release Reconciliation

## Scope

Reconciled `codex/activity-workflows-integration` with released main `9fbfe9b3e74ca74fc49257b5c4f34e66acce5d51` on 19 November 2026. This is the combined implementation of PR 60 deletion approvals and PR 61 schedule governance; do not merge all three independently. PR 63, 66, 69, 71 and 74 are not bundled. Main, real records and Production configuration were not changed.

Preserved PR 67 stage/blank-field editing and audited ownership transfer, PR 72 atomic registration/optional Step 3, PR 73 task layout and PR 75 identity/manual-entry controls. Personal Salesman Activity remains available and read-only; Admin-only deletion queue controls remain restricted. Cache version is `arg-pwa-v180-activity-workflows`.

## Verification

Full `npm.cmd run verify` passed with `CRM_TEST_PGLITE_MODULE` pointing to the existing local PGlite installation. `npm.cmd run test:activity-schedule-db` passed against disposable SQL fixtures. No hosted database was modified.

Browser command: with `CRM_UI_SUITE=management`, `CRM_UI_TEST_PORT=4541`, `CRM_UI_ARTIFACT_DIR=.tmp/workflows-reconciled`, run `node C:/Users/Glory/Documents/argleadstracker/node_modules/playwright/cli.js test --config=playwright.ui.config.js --output=.tmp/workflows-management-results-final`. Result: 12 passed, 4 intentional role-specific skips, across Admin/Salesman desktop/mobile.

Integration failures exposed obsolete assumptions: optional blank registration no longer starts a schedule, and the full Edit Lead regression attempted to clear an active date during reassignment. Tests now verify the first explicitly entered schedule and preserve an existing schedule during handoff. The API regression explicitly requires 409 for clearing a protected schedule, then verifies unrelated sector/contact/numeric/date edits still save. The schedule guard was not weakened. Final full and browser reruns passed.

## Release Gates

The existing SQL migrations remain `20261116100000_activity_deletion_approvals.sql` and `20261116113000_activity_schedule_governance.sql`; neither was changed or applied during this reconciliation. Fresh hosted staging role workflows, current-head CI, Production backup/schema checks and explicit Production migration approval remain required. This document does not authorize migration, merge or deployment.
