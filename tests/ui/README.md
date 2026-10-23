# Isolated CRM UI baseline

Run `npm run test:ui` from the repository root. It runs `test:ui:baseline` (8
core-flow tests), `test:ui:shell` (4 shell/navigation tests), then `test:ui:data`
(4 Pipeline data-surface tests), then `test:ui:team` (4 directory/role checks),
then `test:ui:reports` (4 authoring/review checks) and `test:ui:dashboard`
(4 dashboard/counter/drill-down checks),
each with fresh servers. Chromium must already
be available through the existing Playwright dependency. This suite does not
use the production add-lead script or production credentials.

## Isolation

- Each role/viewport gets a separate loopback server and temporary directory.
- Core, shell and data suites run sequentially with fresh normal rate-limit buckets;
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
- Lead tab aria-current, white/navy header treatment, desktop column placement,
  record-first mobile placement, AI minimize/restore and inline Notes edit/save.
- Add Activity dialog open/cancel and AI Assistant dialog open/close.
- Salesman weekly draft save; Admin calendar minimize/expand.
- Report required-empty/filled feedback and checkpoint synchronization, all
  expected-order/market fields, draft save, submit and locked fields. Admin
  checks require a revision note, request revision, resubmit as version two,
  accept and retain both immutable versions. All writes use synthetic fixtures.
- Admin Activity week navigation, busy-day scrolling/text visibility, log
  pagination, Salesman/type/date/company filters and reset, reminder-type chips,
  Add Activity open/close, control sizing and page/record overflow guards.
- Admin Salesmen list/cards, search/territory/status/stage/sort controls, empty
  reset, page-size controls, chart totals/pixels, lead popup, assignment window,
  CSV export and actions menu; Salesman role is denied the Admin directory.
- Supplied logo loading, white header/title accents, stable desktop rail,
  existing Admin account dialog through Tools, footer sign-out and mobile menu.
- Mobile Home/Leads/Log/Map/Alerts navigation and their existing windows.
- Salesman dashboard white/teal/navy surfaces, unchanged five stage actions,
  nonoverlapping action/list flow, 14px company names and page overflow checks.
- Admin alert/KPI/work-row order, both dashboards' existing count-to-popup
  parity, summary search/reset, Escape and focus restoration; management plan
  bulk expand/collapse, Intel collapse and route return. Expanded lower-panel
  content must not clip on desktop or mobile.
- Search places button foreground/background contrast for both roles.
- The data suite separately exercises all Pipeline column filters, combined
  sorting/pagination, Admin-only report ranges and Excel/PDF downloads, loading,
  empty results, a synthetic 503 and retry, and opening a lead. It also checks
  KPI caption bounds, table text and AI-launcher pagination clearance.
- Additional desktop effective-layout widths of 1280, 1152 and 960px. The latter
  two approximate available layout widths at 125%/150% on a 1440px screen; these
  are not a claim of native browser-zoom testing.

This is a main-flow baseline, not complete coverage of every inventory item.
It does not verify production Supabase RLS, external providers, microphone
permissions/recording, every report rejection/error state or every modal.

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
