# Meeting, Email and Shared Artwork Release Handoff

## Scope and Baseline

- Branch: `codex/meeting-email-background-refresh`.
- Base: `414fafaff5a94f3849d18b7dd87722524cb7ab4f`, current `origin/main` at
  branch creation. PR #34 was already merged by the owner; it is not reopened.
- Includes the remaining AI Actions reference UI, desktop/mobile meeting-prep
  refinement, editable email composer, protected company-profile attachment,
  and responsive shared-artwork consistency fix.
- The user approved shared page artwork behind clean card surfaces. Both
  supplied background PNGs exactly match the existing approved asset hashes;
  no binary rewrite or repeated artwork inside cards is needed.
- Removes AI-page artwork suppression and prevents legacy Activity background
  shorthands from resetting cover/position/repeat. Cache revision:
  `arg-pwa-v131-consistent-artwork-email`.

## Files

UI: `client.js`, `crm-dashboard.css`, `crm-theme.css`, `index.html`, `sw.js`.
Protected profile: `server.js`, `src/services/emailProfileService.js`,
`assets/email/Al Ras Group - Company Profile.pdf`, `vercel.json`.
Tests: `tests/activity-dashboard-latest.test.js`,
`tests/admin-dashboard-layout.test.js`, `tests/crm-ai-workspace.test.js`,
`tests/crm-design-tokens.test.js`, `tests/global-bauhaus-system.test.js`,
`tests/static-assets-security.test.js`, `tests/ui/ai-workspace.spec.js`,
`tests/ui/fixture-server.js`, `tests/ui/meeting.spec.js`,
`tests/ui/shell.spec.js`.
Documentation: this file, `docs/email-draft-ui.md`, `docs/open-questions.md`.

Unrelated backups, cleanup/export scripts and test artifacts remain excluded.
Git commit SHA and PR publication status are recorded in the PR and task report,
not embedded into the commit that would need to reference itself.

## Verification

- `npm run verify`: passed after the final runtime/style changes.
- `$env:CRM_UI_TEST_PORT='4980'; npm run test:ui:shell`: 12 passed, including
  desktop/mobile artwork checks on CRM routes for Admin and Salesperson.
- `$env:CRM_UI_TEST_PORT='4960'; npm run test:ui:ai-workspace`: 20 passed.
- `$env:CRM_UI_TEST_PORT='4970'; npm run test:ui:meeting`: 12 passed.
- `git diff --check`, `git diff --cached --check`, and scoped staged-diff
  review passed. All 22 scoped files were reviewed; unrelated WIP is excluded.
- Initial new artwork test missed the meeting card because no company was
  selected; its setup was corrected. The next run exposed Activity desktop
  using background-size `auto` instead of `cover`; the canonical theme now
  protects cover, position and repeat. The final shell rerun passed.
- Browser checks use isolated synthetic records with external providers off.
  No production data, secrets or customer records were accessed for testing.

## Security, Database and Deployment Impact

No migrations, production writes, credentials, environment variables, RLS,
authentication or authorization changes. The added profile GET route requires
authentication and visible-lead access, returns bounded private/no-store parts,
and keeps the PDF off public routes and service-worker caching. The `.eml`
download is draft-only: no email send, activity log or reminder reset.

The supplied PDF must be included in the server function bundle; the exact
includeFiles path is configured. Production packaging is not verified. The
owner must review the PR, perform any merge and release, and verify the intended
Vercel team/project/commit/environment. The agent did not deploy or promote;
workspace rules prohibit it. Git integration preview checks, if present, are
separate from production release evidence.

Mail-client import, mailbox size limits, physical-device/software-keyboard
behavior and production visual UAT remain unverified. With the unmodified
profile attached, the `.eml` is approximately 16 MB. See `docs/email-draft-ui.md`
for draft details and additional limitations.
