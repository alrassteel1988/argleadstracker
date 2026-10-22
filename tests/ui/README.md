# Isolated CRM UI baseline

Run `npm run test:ui` from the repository root. It runs `test:ui:baseline` (8
core-flow tests) then `test:ui:shell` (4 shell/navigation tests), each with fresh
servers. Chromium must already
be available through the existing Playwright dependency. This suite does not
use the production add-lead script or production credentials.

## Isolation

- Each role/viewport gets a separate loopback server and temporary directory.
- Core and shell suites run sequentially with fresh normal rate-limit buckets;
  this avoids shared test traffic exhausting the real report limit. No limit is
  disabled or changed. No reset API is exposed.
- Only an explicit runtime-file allowlist is copied; no `.env`, source database,
  backups, uploads, recordings, Git metadata or reports are copied.
- Accounts, contacts, leads and passwords are synthetic test fixtures.
- The child server drops inherited provider credentials and blocks outbound fetch.
- Normal authentication, ownership checks, validation and rate limits stay enabled.
- Browser requests are limited to loopback and the existing static font/chart hosts.
- Service workers are blocked in this suite; existing Node tests cover cache guards.
- Lead creation and draft saves write only to the temporary synthetic database.

## Coverage

Admin and Salesman at 1440 x 900 and 375 x 812:

- Empty sign-in validation, sign-in, sign-out and role-specific route visibility.
- Pipeline search, stage filter, sorting, clear filters and Salesman isolation.
- All six lead tabs and the three existing Add Lead steps, including a real save.
- Add Activity dialog open/cancel and AI Assistant dialog open/close.
- Salesman weekly draft save; Admin calendar minimize/expand.
- Supplied logo loading, white header/title accents, stable desktop rail,
  existing Admin account dialog through Tools, footer sign-out and mobile menu.
- Mobile Home/Leads/Log/Map/Alerts navigation and their existing windows.
- Salesman dashboard white/teal/navy surfaces, unchanged five stage actions,
  nonoverlapping action/list flow, 14px company names and page overflow checks.
- Search places button foreground/background contrast for both roles.
- Additional desktop effective-layout widths of 1280, 1152 and 960px. The latter
  two approximate available layout widths at 125%/150% on a 1440px screen; these
  are not a claim of native browser-zoom testing.

This is a main-flow baseline, not complete coverage of every inventory item.
It does not verify production Supabase RLS, external providers, microphone
permissions/recording, every report submission/review state or every modal.

## Screenshots and traces

Screenshots default to the OS temporary directory under
`arg-crm-ui-screenshots/after/<project>/`. The default changed to After once the
migration started, so routine reruns do not overwrite the initial Before captures.
Use `CRM_UI_SCREENSHOT_PHASE=before` only for a deliberate baseline-source replay,
or set `CRM_UI_ARTIFACT_DIR` to another
local output directory. Traces on failure go to `arg-crm-ui-playwright-results`
under the OS temporary directory. These outputs are not staged with source code.

`CRM_UI_TEST_PORT` selects the first of four consecutive loopback ports, default
4179 through 4182. An occupied port fails the run; the suite never reuses an
unknown server. Temporary snapshots are retained, not removed by this suite.

When adding test companies, use clearly distinct names. The real fuzzy duplicate
check intentionally rejects near-identical company names. Keep each profile's
server separate so rapid cross-profile navigation does not share rate-limit
buckets; do not disable those protections to make the test pass.
