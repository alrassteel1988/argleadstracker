# PR 69 Release Reconciliation

Reconciled `codex/activity-origin-author` with released main `9fbfe9b3e74ca74fc49257b5c4f34e66acce5d51` on 19 November 2026. This PR stays separate from creation-event PR 74, access-audit PR 71 and other pending workflows. Preserved transactional registration, the no-duplicate-reminder Management Task rule, current task layout and company identity/manual-entry safeguards. Cache version is `arg-pwa-v180-activity-origin`.

Full `npm.cmd run verify` passed with PGlite enabled. Its first run exposed an old assertion expecting a reminder from an Admin-assigned new lead; PR 72 now creates a linked task instead. The test now requires that task and zero duplicate reminders; existing spoofed-author and actual Salesman reminder assertions remain intact. No historical author is guessed from the current lead owner.

Focused browser command: `CRM_UI_SUITE=admin-reference`, `CRM_UI_TEST_PORT=4571`, `CRM_UI_ARTIFACT_DIR=.tmp/origin-reconciled`; `node C:/Users/Glory/Documents/argleadstracker/node_modules/playwright/cli.js test --config=playwright.ui.config.js --grep 'recorded author|personal read-only log' --output=.tmp/origin-results`. Result: 4 passed, 4 intentional role-specific skips, covering Admin attribution and Salesman personal logs on desktop/mobile.

This feature has no SQL migration or backfill. Fresh hosted staging attribution and current-head CI remain required before release review. On 19 November, the approved Vercel configuration was saved and read back as exactly three overrides for `codex/activity-origin-author`, Preview only: URL, anon key and service-role Secret. Production was excluded; no shared setting was changed and Redeploy was not clicked. No Production change, merge or manual deployment was performed.
