# PR 63 Release Reconciliation

Reconciled `codex/cancelled-overdue-dashboard` with released main `9fbfe9b3e74ca74fc49257b5c4f34e66acce5d51` on 19 November 2026. Preserved the released personal Activity menu, audited ownership transfer, atomic registration, current Management Task layout and company identity/manual-entry safeguards. Only the remaining cancelled/overdue outcome behavior is proposed; other pending PRs stay separate. Cache version is `arg-pwa-v180-targeted-outcomes`.

Full `npm.cmd run verify` passed with the existing PGlite module enabled. `node tests/lead-followup-database.test.cjs` passed disposable SQL tests covering assignment, inactive users, Admin actor, validation, stale saves, replacement and idempotency.

Browser commands use `node C:/Users/Glory/Documents/argleadstracker/node_modules/playwright/cli.js test --config=playwright.ui.config.js` with the following environment and arguments:

- `CRM_UI_SUITE=dashboard`, `CRM_UI_TEST_PORT=4581`, `CRM_UI_ARTIFACT_DIR=.tmp/overdue-reconciled`, `--grep 'cancel|overdue' --output=.tmp/overdue-dashboard-results`: 2 passed, 2 intentional Admin skips.
- `CRM_UI_SUITE=ai-workspace`, `CRM_UI_TEST_PORT=4591`, same artifact directory, `--grep 'Neglected' --output=.tmp/overdue-workspace-results`: 10 passed, 2 intentional Admin outcome-mutation skips. Cancellation/outcomes leave another current next step unchanged; loading/error/retry/empty and responsive states pass. The initial `^Neglected` filter selected no tests; the corrected filter ran the complete focused set.

On 19 November, the specifically approved Vercel configuration was saved and read back as three Preview-only overrides for `codex/cancelled-overdue-dashboard`: URL, anon key and service-role Secret. Production was excluded; shared settings were not changed and Redeploy was not clicked.

Read-only staging checks confirmed project `grxzqxqgtksunzfhtwox` is ACTIVE_HEALTHY, required lead column types match, and `public.resolve_overdue_activity(uuid,jsonb)` is missing. Migration `20261116094621_targeted_activity_outcomes.sql` is unchanged. A fresh backup check, explicit staging migration approval and hosted staging acceptance are still required. No migration, backfill, Production write, merge or manual deployment was performed during this reconciliation. Production release requires its own backup/schema and migration approval.
