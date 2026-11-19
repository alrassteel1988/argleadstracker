# PR 66 Release Reconciliation

Reconciled `codex/pmr-release-base` with released main `9fbfe9b3e74ca74fc49257b5c4f34e66acce5d51` on 19 November 2026. Preserved released reassignment, transactional registration, Management Task layout and company-identity/manual-entry safeguards. Retained both the current reassignment browser test and the PMR test instead of choosing one side of their conflict. No other pending PR is bundled. Cache version is `arg-pwa-v180-pmr-current-main`.

Full `npm.cmd run verify` passed with PGlite enabled. Focused browser command: `CRM_UI_SUITE=record`, `CRM_UI_TEST_PORT=4561`, `CRM_UI_ARTIFACT_DIR=.tmp/pmr-reconciled`; `node C:/Users/Glory/Documents/argleadstracker/node_modules/playwright/cli.js test --config=playwright.ui.config.js --grep 'PMR links' --output=.tmp/pmr-results`. All four Admin/Salesman desktop/mobile tests passed. PMRs link only completed meetings and retain one customer activity row.

Migration `20261117044217_file_lead_pmr.sql` was not changed or applied during reconciliation. Fresh hosted staging acceptance, current-head CI, Production backup/schema review and explicit migration approval are separate release gates. No merge, manual deployment or Production business-data change was performed.
