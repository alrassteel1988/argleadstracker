# CRM Functionality Inventory and UI Migration Baseline

### Management Dialog and Evidence Checkpoint (23 October)

Shared dialog CSS now contains direct form-submit buttons within their side
margins and puts them on their own line on mobile. A regression reproduced the
Create Salesman button extending beyond the panel; the same shared rule covers
reassignment confirmation. Mobile deletion-review search inputs also inherited
a 180px flex basis as height when the toolbar changed to a column. Their mobile
flex sizing now stays natural; bounds and 44-52px height assertions pass.

`npm run test:ui:management` PASS (4): five Admin dialog states at 1440x900 and
375x812, normal pointer activation, visible close controls, computed presentation,
keyboard/field constraints and cancellation without administrative writes.
Salesman cases verify management controls stay hidden, not fictitious dialog
entry points. Existing read-only `/api/ai/lead-summary` POST is explicitly
distinguished from writes. First harness attempts used a nonexistent Lead-tab
View action and an overbroad POST guard; those were corrected, not app logic.

`npm run verify` PASS on final runtime CSS. `npm run test:ui:audit` PASS (8,
68 states) before the final queue-sizing addition, which is covered by the
final management regression and CSS contract. An initial combined 12-case audit
passed assertions but hit normal report rate limits; management is now a separate
fresh-fixture suite. No runtime limits or assertions were loosened. The complete
interactive chain is now 48 checks and has not been rerun as one command at this
checkpoint. Native zoom and separate lint/type checking are not claimed.

Historical replay uses fixed baseline `62ec92668261142e5c0fa8b3a1be91359fee9241`,
allowlisted runtime files, synthetic data and no `.env`. Byte equality was
verified against Git for client/server/index/styles. Historical construction
alone has a 120-second setup budget after the first 30-second setup timeout.
Normal fixture startup remains 30 seconds. Final replay PASS (4 capture/role
checks), with three matching Before/After dialogs per Admin profile: deletion
review, Create Salesman and reassignment. Activity Details and its Edit state
are unavailable through the historical route and are explicitly annotated,
not counted as paired captures or passing historical pointer workflows.
Per-run manifests under `arg-crm-ui-management-manifests` in the OS temporary
directory record source, dimensions, activation method, captures and limitations.
The current run has all five After states per Admin profile, without limitations.

Reinspection also found the original Before Admin desktop Dashboard image was
captured during loading (zero counts/generic User). The prior count of 68 paired
filenames is not proof of dataset-ready comparison. Recapture/revalidation is
required. The full 57-page proposal crosswalk and remaining acceptance work are
in [ui-proposal-acceptance.md](ui-proposal-acceptance.md). Full visual sign-off is
still pending. Cache revision: `arg-pwa-v103-revised-ui-dialog-bounds`.

### Shared Mobile Touch Checkpoint (23 October)

The expanded presentation sweep reproduced undersized controls in both mobile
roles: overdue actions (33.5-36px high), overdue dismiss controls (36x34px),
Admin panel collapse controls (32x44px), and the Intel market-feed disclosure
(21px high). Desktop audit profiles passed. Shared mobile-only styles now
give these controls minimum 44px dimensions, preserving handlers, text, native
disclosure markers, desktop density, authorization and calculations.

The first expanded audit returned 6 PASS / 2 FAIL on mobile target-size findings;
this is additional coverage, not a new runtime regression. Its controlled fixture
also checks exact-sized positive controls and hidden closed-details content.
`npm run verify` PASS after the fix. `npm run test:ui:audit` then PASS (8),
covering 68 rendered page/dialog states across both roles and viewport profiles.
No separate lint/typecheck, full 44-test interactive chain or native-zoom rerun
is claimed for this checkpoint. Full proposal visual/state acceptance remains
pending. Cache revision: `arg-pwa-v102-revised-ui-shared-touch`.

### Mobile Activity Touch Checkpoint (23 October)

Fresh-fixture regression reproduced mobile Activity controls below the intended
44px target: calendar buttons were 40x38px, menu triggers were 28x38px and
pagination was approximately 28x40.8px. The base `:is()` selector's complex menu
branch had greater specificity than the mobile override. The override now
matches that specificity and sets both minimum dimensions to 44px. Pagination
uses existing Lucide chevrons with its original ARIA names and click handlers.

Focused regression PASS, then `npm run test:ui:baseline` PASS (8), and
`npm run test:ui:audit` PASS (8). The first broad run passed seven but exhausted
the single sweep's 60-second total budget: the final menu click started at
59.53 seconds. That expanded multi-route case now has a 120-second total budget;
expectation limits and all assertions remain unchanged. Its rerun passed.
No authentication code or runtime limit changed. Final `npm run verify` PASS,
including syntax, auth guards, unit/API/security tests, UI contracts and build.

Keyboard focus/hit-testing confirms the pagination target is not covered by the
AI launcher. Manual synthetic-data review confirms the open More Actions item
is reachable and 44px high; no deletion request was submitted. Matching live
review captures are `crm-activity-touch-before-mobile.jpg` and
`crm-activity-touch-after-mobile.jpg` in the OS temporary directory (360x780
rendered images); automated mobile fixtures remain 375x812. Shared touch geometry
outside Activity and full proposal visual/state sign-off remain pending.

### Activity Stage Vocabulary Checkpoint (23 October)

Vocabulary-checkpoint gates: `node tests/crm-activity.test.js` PASS, `npm run test:ui`
PASS (all 44 checks in one sequential command), and `npm run verify` PASS.
This clears the earlier combined-run auditor-fixture failure gate without
weakening assertions. It does not resolve the separately investigated startup
authentication weakness or constitute complete visual/production acceptance.

Activity stage badges use the approved shared display mapping while stored
keys, unknown custom values, reminder status precedence, API payloads and
history remain unchanged. Frozen-input regression checks cover both roles;
browser checks verify ten mapped Activity rows before the existing filters and
pagination tests. Desktop Before/After and mobile review captures were taken
with synthetic records. No authentication, schema or permission change.

### Native Zoom and Mobile Overflow Checkpoint (23 October)

`npm run test:ui:zoom` passes all six isolated role/zoom cases: Admin and
Salesman at native Chromium page zoom 100%, 125% and 150%. The 72 captured
screen/dialog states cover login, implemented main pages, six Lead Details tabs
and Add Lead. The harness uses temporary synthetic profiles and confirms actual
device-pixel ratio and visual viewport scale; this is not CSS scaling or pinch
zoom. At a 1440x900 outer window, measured content widths are 1422, 1138 and
948 CSS pixels respectively. It does not exercise every action at each zoom.

The sweep found and fixed mobile Admin dashboard header controls wrapping into
an overflowing second flex column, and two Salesman panel subtitles clipping at
125%. Headers now grow in normal flow and subtitles wrap without shrinking
text. The computed auditor now checks both body and document scroll widths;
earlier zero-finding audits used the narrower document-only check and did not
rule out hidden body overflow. The focused four-profile dashboard suite passes.
The serial combined browser run passed all 36 functional checks, then failed
two new mobile auditor-control checks. Their deliberate overflow expanded
`innerWidth`; the corrected auditor uses layout-viewport `clientWidth`. Focused
audit (8 checks) and dashboard (4 checks) reruns pass with that stronger check.
The full combined command had not been rerun at that checkpoint; the latest
Activity vocabulary checkpoint above now records its clean 44-check pass.

Final `npm run verify` passes. The initial native-zoom command passed six cases;
the stricter-auditor rerun passed five but returned Salesman 125% to sign-in at
PMR. Its isolated rerun passed without code changes. The failed request trace
ended with an unfinished `/api/auth/me`, not a confirmed HTTP 401. The startup
catch-all session reset exists in baseline source unchanged. The owner approved
a separate authentication investigation; this intermittent result is not
silently counted as a clean full-command pass or production readiness.

Owner decision: linting is an approved separate follow-up, not a new toolchain
inside this migration. No separate lint or TypeScript result is claimed.

Activity display-label follow-up: `activityCardMarkup` and `activityTableStatus`
now use the existing approved map for recognized stage values. Unknown custom
values, reminder/completion/deletion/overdue/upcoming status precedence and
stored activity history remain unchanged. The focused regression first failed
with `NEW !== Prospect`, then passed after the two display expressions changed.
Browser assertions now check the first ten Activity row labels, in addition to
the existing navigation, filter and pagination coverage. Full browser and
canonical verification results are recorded in the checkpoint below.

Checkpoint files: `crm-dashboard.css`, `sw.js`, `package.json`,
`playwright.ui.config.js`, `tests/activity-dashboard-latest.test.js`,
`tests/admin-dashboard-layout.test.js`, `tests/global-bauhaus-system.test.js`,
`tests/ui/README.md`, `tests/ui/audit.spec.js`, `tests/ui/dashboard.spec.js`,
`tests/ui/presentation-audit.js`, `tests/ui/zoom.spec.js`, this inventory and
`docs/open-questions.md`. No API, database, authentication or permission source
was changed. Temporary artifacts and unrelated untracked files are excluded.

### Company AI Actions Checkpoint (23 October)

Owner-approved exposure: active Lead Overview now includes the five existing
company AI controls. Four synthetic role/viewport tests pass for controls,
request payloads, CRM-data fallback, unavailable response and flag cancellation.
`npm run verify` passes. Existing provider APIs and permissions are unchanged;
external provider success and the whole-route presentation audit remain pending.

### Presentation Audit Checkpoint (23 October)

`npm run verify` and `npm run test:ui:audit` pass for this phase. The latter has
eight checks: four controlled auditor fixtures and four role/viewport sweeps.
The sweeps captured 68 screen/dialog states with zero findings under their
limited computed-style rules. Activity Edit uses the existing shared Activity
modal; flag, deletion-request, import and closure windows were opened without
submitting changes. External providers, recording, native zoom, full workflow
coverage and complete visual comparison remain pending. The expanded combined
44-check `npm run test:ui` chain has not been rerun as a whole after this phase.

Quotes/Accounts have a baseline duplicate-nav-handler defect and return to
Dashboard, despite declaring Pipeline quick views. Their actual destination was
captured, not certified as a working module. The owner selected separate review
tabs for the proposal images; no app route or backend module was added.

## 1. Scope and evidence

- Inventory date: 22 October 2026 (Asia/Dubai).
- Baseline: `62ec92668261142e5c0fa8b3a1be91359fee9241` (`origin/main`, fetched before the audit).
- Branch: `codex/crm-ui-proposal-inventory`.
- The inventory commit changed documentation only; preparation added artwork and an isolated browser baseline. Presentation work now covers tokens, fonts, artwork, controls, shell and the primary Salesman dashboard. No API, database, authentication, route, calculation, or production changes have been made.
- Authoritative attachment, confirmed by the owner: `Revised CRM UI Design Proposal.pdf`, 57 landscape A4 pages. The prompt named another PDF that was not supplied. See Q-01 in [open-questions.md](open-questions.md).
- All 57 pages were text-extracted; representative sign-in, Salesman home/statuses, Admin team/activity/mobile pages were rendered and visually inspected. Prototype data is not application data.
- Repository-wide indexing covers 137 tracked runtime, stylesheet, configuration, test, migration, and agent-reference files. Main routing, form, renderer, role, API dispatch, job and integration contracts were inspected directly. This is a source-based functionality inventory, not a claim that every execution branch has been exercised or a new security audit.
- Private environment files, production databases, backups, customer exports, recordings, and report archives were not used as test data. Historical video/artwork artifacts and dependency internals are not executable CRM features and are outside the migration.
- Static index: 14 form elements, 132 input/select/textarea declarations, 136 button declarations. Client templates: 78 field declarations and 163 button declarations, including conditional and legacy renderer paths. Appendices list declarations/hooks, not unique user-visible records.
- Source is authoritative where older README/authorization documentation differs. In particular, current-assignment isolation, export restrictions and stored stages must not be replaced with older territory-based descriptions.

## 2. Result vocabulary

| Result | Meaning |
| --- | --- |
| SOURCE | Declaration/handler reviewed in source; not a live workflow pass. |
| PASS suite | Named baseline test file passed within `npm run verify`; does not imply complete browser coverage. |
| FAIL | A demonstrated failed assertion or workflow, with evidence required. |
| NOT RUN | No runtime evidence available. |
| PENDING | Must be checked after the re-skin; not a pass. |
| BLOCKED | Needs an owner decision, asset, or approved test environment. |
| N/A | Not an implemented application feature. |

Every screen, field and action below is **PENDING full after-re-skin verification** unless its specific evidence says otherwise. Shared foundation, controls and shell work is in progress. Do not turn a SOURCE result into PASS merely because a CSS assertion passed.

## 3. Baseline commands and results

| Command/check | Baseline result | Post-re-skin |
| --- | --- | --- |
| `git fetch origin main` | PASS; baseline above | PENDING |
| `npm run verify` | PASS; exit 0 before any UI edits | PASS at latest Activity touch checkpoint |
| `npm run check` | PASS as part of verify; Node syntax checks | PASS within latest verify |
| `npm run test:sales-lead-summary-auth-loading` | PASS; includes refresh-session tests | PASS within latest verify; not a transient-startup fix |
| `npm test` | PASS; unit, API/HTTP, UI contract and security suites | PASS within latest verify; local/mocked providers |
| `npm run build` | PASS; existing build reports no asset compilation required | PASS within latest verify; no asset compilation |
| Separate lint | NOT AVAILABLE in package.json; no substitute tool invented | Owner approved a separate linting task; implementation PENDING |
| Separate TypeScript check | NOT AVAILABLE; JavaScript application, no typecheck script | N/A unless owner configures tooling separately |
| `npm run test:ui:baseline` | PASS: 8 tests across Admin/Salesman at desktop/mobile, synthetic local storage only | PASS: 8 within latest combined UI run; not every inventory item |
| `npm run test:ui` | Combined chain added during migration | PASS: 44 at vocabulary checkpoint 8770fda; subsequent touch step runs targeted core/audit gates |
| Production browser UAT scripts | NOT RUN: default to production, create a user and lead, perform cleanup | Never run without separate explicit production authorization |
| Before screenshots, 1440px and 375px, both roles | Main-flow screenshots captured by isolated suite; full state/dialog matrix incomplete | 68 matching main-flow Before/After files captured; full visual/state sign-off PENDING |
| Production smoke test, external providers and live RLS | NOT RUN; no production access authorized by this visual task | Not a local-suite claim |

First baseline test failure: **none**. No behavioral test was changed or removed during this inventory.
The filename `admin-salesman-permissions.e2e.test.js` denotes local HTTP testing, not Playwright browser coverage.

Preparation checkpoint: `npm run verify` passed again with no runtime edits.
New harness development initially failed on a wrong sort-key locator, fuzzy
duplicate rejection of overly similar test company names, and cross-profile
rate-limit contention. The harness was corrected: real `company` hook, distinct
synthetic names, and separate temporary servers per role/viewport. No application
validation, authentication, rate limit or behavior was weakened. The final run
passed all 8 tests. See [tests/ui/README.md](../tests/ui/README.md) for exact coverage
and exclusions; no production browser tests or provider operations were run.

### Foundation phase evidence

- Shared `crm-theme.css` defines the proposal palette, font, spacing, radius,
  surface, focus, health and approved-artwork tokens for both roles.
- Inter remains the general UI face; Playfair Display is scoped to page titles
  and explicit accent helpers. The existing font provider now loads regular and
  italic weights. No new external host or CSP permission was introduced.
- Desktop/mobile silk-white artwork is applied to the content area. The white
  logo is publicly available for the next branding step; navigation markup has
  not yet been replaced. No artwork bytes changed.
- `server.js` changes only the exact static-file allowlist. Vercel lists those
  same public assets explicitly. The PWA version is v84 and includes the new
  public assets; the API cache exclusion and all private-file guards remain.
- `npm run verify`: PASS after resolving obsolete asset-version/font URL
  assertions. First failure was admin-dashboard-layout.test.js:70, expecting
  v83 rather than v84. A subsequent mobile-final stylesheet-order assertion was
  preserved by moving the foundation before mobile-ui.css, not weakening the
  test. The mobile font-loading assertion was expanded to require all old italic
  weights plus the new regular/italic title weights.
- `npm run test:ui:tokens`: PASS. Covers palette, AA token contrast (gold only
  large-text AA), artwork hashes, static build/routes, font request and cache
  contracts. It is included in `npm run verify`.
- Browser After captures at this phase show only the foundation, not a finished
  re-skin. The baseline suite now checks the computed desktop/mobile background,
  Inter UI face and Playfair page-title face before its existing main flows.
  Final `CRM_UI_SCREENSHOT_PHASE=after npm run test:ui:baseline`: PASS, 8 tests
  across both roles at 1440x900 and 375x812 (2.8 minutes).
- Still pending: full primitive/shell/page/dialog migration, complete visual
  state matrix, real-provider/voice UAT and production checks. No push or deploy.

### Shared controls phase evidence

- Added `crm-controls.css` and a 40-icon, locally bundled Lucide CSS subset.
  Source/integrity/license: assets/icons/README.md and LICENSE. Existing dynamic
  labels and handlers are untouched; decorative masks cannot receive clicks or
  change accessible names. Buttons already containing SVGs and record cards are
  intentionally left for their page-specific pass.
- Shared buttons, fields, semantic completion/error/disabled feedback, focus,
  neutral panel caps, tab treatment and opaque surfaces now use proposal tokens.
  Legacy brand variables are rebound to the shared token layer for both roles.
- Pipeline exports keep the same IDs, routes, formats and handlers. Only their
  legacy green/red presentation was converted to the shared secondary surface;
  the two obsolete color assertions were updated, not behavior assertions.
- Native forms, required indicators, field names, IDs, data attributes, ARIA,
  permission/routing logic and service-worker API exclusions are unchanged.
- `npm run test:ui:tokens`, `node tests/pipeline-live-leads.test.js`,
  `node tests/static-assets-security.test.js` and `npm run verify`: PASS.
  No test failure in this phase. Manual review led to replacing duplicate close/
  collapse glyphs with the decorative icon while retaining their ARIA names.
- Browser captures now wait for the fixture's known 9 Admin open records or
  12 Salesman assigned records instead of the initial zero/loading frame.
  New browser assertions cover the Sign in icon/colors and phone Pipeline
  field font >=16px and height >=44px. Production values are never hardcoded.
- Role navigation, logo placement, full per-page layout, remaining icon/table/
  dialog states, 125%/150% zoom and provider/voice verification remain PENDING.
- Final `CRM_UI_SCREENSHOT_PHASE=after npm run test:ui:baseline`: PASS, 8 tests
  in 2.8 minutes. Both role totals, Sign in icon/colors and phone field assertions
  passed alongside the existing create, draft, filter, tabs and dialog flows.

### Shared shell phase evidence

- `crm-shell.css` applies the approved sidebar gradient, supplied original logo,
  active gold italic navigation, white topbar, proposal title treatment, local
  icons and existing five-action mobile navigation. Both roles use one layer.
- Existing Sign Out moved into the sidebar footer; existing Admin-only Create
  Salesman Account moved into Tools. IDs, handlers, role guards and dialog
  behavior remain unchanged. No routes, actions or permissions were added.
- `pageTitleMarkup()` is a presentation-only renderer: all title fragments are
  escaped before wrapping the final word. Tests cover hostile title text.
- Hidden-state selectors remain authoritative. Desktop sidebar width stays
  188px; existing Salesmen full-height behavior is retained. The mobile menu
  remains controlled by existing menu state, backdrop and ARIA attributes.
- Manifest/header browser colors changed only; application name, scope, start
  URL, shortcuts and square icons are unchanged. Cache v86 adds the explicit
  shell stylesheet; API and private-file cache exclusions remain unchanged.
- Browser checks cover both roles at 1440x900 and 375x812, global search,
  original logo loading, Admin management dialog open/cancel, mobile menu,
  existing Home/Leads navigation and Quick Log/Map/Alerts dialogs. Additional
  widths 1280, 1152 and 960 check overflow, not native browser zoom.
- The original eight-flow suite and four shell checks use fresh isolated
  fixtures in sequence. Initial combined-suite rate-limit contention was fixed
  by test isolation, not by weakening runtime limits. An animated menu assertion
  now waits for its final position instead of measuring an intermediate frame.
- Default captures are After; baseline Before images are not overwritten.
- Final shell checkpoint: `npm run verify` PASS; `npm run test:ui:shell`
  PASS, all four role/viewport projects in 47.1 seconds, including global search.
  First attempt in the restricted sandbox failed at auth-refresh.test.js with
  `connect EACCES 127.0.0.1:62654`. The browser attempt was stopped after no
  progress. Both commands then ran with approved local-server access; the full
  verification and browser suite passed. No application protection changed.
- Page-specific layout, all dialog/state captures, actual 125%/150% zoom and
  provider/voice UAT remain pending. No production operations or deployment.

### Salesman dashboard presentation phase

- `crm-dashboard.css` converts the existing Salesman summary cards, stage
  counts, action cards, call queue and live table to white surfaces, teal
  boundaries and navy typography. Red/amber remain small health indicators.
- All three metric actions, five existing stage drill-downs, queue actions,
  first-touch and loss-reason sections remain. No data, values, datasets,
  permissions, routes or JavaScript behavior changed in this phase.
- The main grid uses content-sized rows instead of inherited fixed grid tracks.
  Two desktop action panels remain side by side and stack below 1025px. Queue
  scrolling is scoped to its list; the lead table retains internal scrolling.
- Table body/company text is 14px; metadata and labels are at least 12px.
  Summary descriptions wrap instead of truncating. Phone stage tiles wrap into
  two columns without shrinking labels. The duplicate Add Lead action remains
  available but is secondary; the topbar action remains amber.
- Visual review caught a legacy Salesman-only white Search places label. The
  shared shell now explicitly uses navy text on its white background, tested
  for both roles and viewport profiles. Mobile greeting contrast is also fixed.
- The first browser attempt failed only on a newly added nonexistent
  `.lead-company-name` locator. The renderer uses `.lead-table-company strong`;
  both the presentation selector and test were corrected. Behavioral assertions
  were not removed. Final `npm run test:ui`: PASS, eight main-flow tests in
  4.0 minutes followed by four shared-shell tests in 49.0 seconds. These include
  new dashboard surface/spacing/type checks and both-role Search places contrast
  checks. Final stage action icons were manually confirmed visible at 20px in
  the updated mobile preview; no handler or data code changed.
- Final `npm run verify`: PASS, including the new dashboard contract suite.
  No lint or TypeScript script exists; no separate lint/typecheck pass claimed.
- Remaining full-migration work includes other pages/dialogs, all secondary
  dashboard states, transient sign-in/loading presentation, proposal title
  accent consistency, duplicate legacy stylesheet consolidation and full zoom
  coverage. Q-02 status presentation remains unchanged pending clarification.

### Shared data surfaces and Pipeline phase

- Proposal pages 12 and 37 were rendered and compared. `crm-data.css` now owns
  shared KPI surfaces and live-lead table typography, row states and badges.
  Duplicate dashboard table declarations were removed from crm-dashboard.css.
- Existing Admin dashboard and both-role Pipeline KPI cards use white surfaces,
  teal boundaries, amber top rules and small health markers. Values, summary
  actions and calculations are untouched. Fixed Pipeline metric wrapper heights
  were removed so the existing subtext is no longer clipped.
- Pipeline keeps all nine existing columns, all eight existing header filters,
  role-specific Salesman scope, inclusive Admin report dates, exports and
  pagination. The proposal's separate simpler filter row is not substituted
  for these existing controls. No JS, API or permission logic changed.
- Shared table bodies are 14px with 12px metadata/badges, navy text and opaque
  semantic fills. Sticky header offsets match the 44px column heading row.
  Narrow-screen overflow remains table-scoped; all data is retained.
- A new browser flow found the floating AI launcher intercepting Next page on
  desktop. Pagination now reserves space for it. The noninteractive appToast
  status element has pointer-events:none; its text/timer/ARIA behavior remains.
- The first new suite was stopped after this verified overlap. A subsequent
  loading-state assertion was corrected to navigate through the actual Pipeline
  control while the synthetic response is held; initial route restoration is
  deferred by existing bootstrap behavior and was not changed by this UI task.
- New isolated tests exercise company/contact search, every column filter,
  combined filters/sorting/pagination, Admin salesman filter and Excel/PDF
  downloads, report dates, loading, empty results, simulated 503/retry and row
  navigation. Interception is confined to disposable synthetic browsers.
- Final `npm run verify`: PASS. The complete browser chain passes all eight
  core-flow and four shell checks; all four final data projects also passed,
  including KPI caption bounds and 14px navy company text. Browser-chain final
  process completed with exit 0 (8 core in 3.9m, 4 shell in 1.0m, 4 data in 1.5m).
- Remaining full-migration items include other pages/dialogs, all secondary states,
  approved status presentation under Q-02, full native zoom and production UAT.

### Shared Lead Details presentation phase

- Proposal page 15 was rendered and compared. Shared `crm-record.css` applies
  white company/tabs/panels, navy headings and values, teal boundaries, neutral
  fields, and restrained red/amber risk or warning markers for both roles.
- Existing Overview, Activities, PMR, Reminders, Intel and Notes remain. The
  company heading is 24px (20px phone), section headings 18px, values 15px,
  body copy 14px and labels/metadata 12-13px. Empty fields remain italic and
  readable. Call/Email keep their original URLs and now include local icons.
- The desktop AI-left / information-right structure and original column widths
  remain. Primary record markup now precedes AI markup in reading/focus order;
  named grid areas preserve desktop placement and stack record-first at tablet
  and phone sizes. No record, action or AI content was removed.
- The only client change adds a navigation label and aria-current derived from
  the already-selected tab. No handlers, route logic, state updates, data
  fetching, validation, API payloads, permissions or calculations changed.
- Browser checks now include AI minimize/restore, active-tab announcements,
  white/navy header colors, column placement, no page overflow and existing
  inline Notes edit/save through the real synthetic API.
- First browser attempt: one fixture bootstrap exceeded the old 5s wait. Trace
  showed login/settings/leads HTTP 200 and an unfinished activities request,
  not an authentication rejection. The exact-count startup assertion remains,
  with a bounded 15s allowance. A second new style assertion read a detached
  header during async rendering; retrying locator CSS assertions now verify
  the same colors against the current element. No application behavior changed.
- The new mobile control check also found the existing Minimize action hidden
  by legacy phone CSS. That responsive hide is overridden while honoring any
  explicit hidden attribute/class. The same existing minimize/restore handler
  is reused; no new AI request or state workflow was introduced.
- `npm run test:ui`: PASS (8 core flows in 2.7m, 4 shell flows in 30.1s,
  4 data flows in 1.5m). Final collapsed-summary styling rerun:
  `npm run test:ui:baseline -- --grep "sign-in validation"`: PASS, all four
  Admin/Salesman desktop/mobile profiles in 1.8m on 23 October 2026.
- `npm run verify`: PASS on 23 October 2026 against the final record styling,
  including syntax, API/security regression tests, presentation contracts and
  the production build command. No separate lint or TypeScript script exists.
- Populated PMR/media,
  every Intel job state, provider UAT, native zoom and final legacy CSS cleanup
  remain part of the full migration audit, not claimed complete here.

### Activity presentation phase

- Compared the existing Admin Activity hierarchy, renderers and filters with
  revised proposal page 40. Added `crm-activity.css` using shared tokens only:
  white panels/metrics, teal boundaries, amber metric top rules, navy text and
  Playfair italic accents in the existing calendar/log headings.
- Preserved all original IDs, fields, options, handlers, requests, counts and
  permissions. `client.js` is unchanged in this phase. Admin-only Activity access
  remains unchanged; shared Salesman report/lead activity functions are retained.
- Removed old fixed viewport-height constraints for this page. Calendar days
  have bounded, independently scrollable event lists; Activity and Reminders
  keep scoped list scrolling. Phone filters still use their existing drawer.
  Fields are 40px desktop/44px phone, with 14px/16px text respectively; record
  text is 14px, metadata/labels 12-13px, headings 20px and metrics 28px.
- Browser coverage adds calendar minimize/expand and previous/next navigation,
  pagination, Salesman/type/date/company filters, reset, reminder-type chips,
  Add Activity open/close, control sizing and page-overflow checks.
- An initial mobile test attempted a collapsed search field; it now opens the
  existing Filters toggle. A later added filter test incorrectly assumed IDs
  for option values; source `fillSelect` uses names, so the test selects the
  visible label. No production filtering or data logic was changed for tests.
- Live synthetic preview also exposed event text shrinking inside a busy day;
  max-content event rows preserve text while the day list itself scrolls.
- Rendered desktop review found legacy page clipping and narrow action buttons.
  The Activity root/body now use natural flow; action text stays on one line and
  the table scrolls horizontally within its panel when its columns need space.
  New browser assertions cover nonwrapping actions and document reachability.
- Phone screenshot review also found legacy owner chips shrinking to a
  one-character column. The Activity overdue banner now stacks/wraps at phone
  widths, with the same counts/actions and no hidden records.
- `npm run test:ui`: PASS, 8 core flows (3.4m), 4 shell flows (48.4s), 4 data
  flows (1.0m). The final Activity-only flow/banner corrections additionally
  passed both Admin desktop/mobile profiles (1.2m) using
  `CRM_UI_TEST_PORT=4190 npm run test:ui:baseline -- --grep "sign-in validation"
  --project=admin-desktop --project=admin-mobile` (set the environment variable
  using the host shell syntax).
- `npm run verify`: PASS after final styling, including supported syntax,
  API/security, presentation contracts and build checks. Desktop/mobile After
  screenshots are under the existing OS-temporary artifact directory.
- These results are not full application migration signoff, native browser
  zoom testing, provider UAT or production acceptance.

### Salesmen presentation phase

- Compared revised proposal page 38 with the existing Admin Salesmen directory.
  `crm-team.css` uses the shared white/teal/navy/amber system for four metrics,
  filters, list/cards, paging and the existing performance snapshot. All current
  controls and data remain, including card progress, last activity and tasks due.
- Decorative per-person accent attributes remain in markup but render through
  one shared palette. Health/status meaning remains in labelled badges, warnings
  and chart indicators, rather than arbitrary violet/orange identity colors.
- Names/emails/territories wrap; fields use 14px desktop/16px phone text and
  40px/44px controls. Tables retain scoped horizontal scrolling; cards stack on
  phones. Footer paging reserves space for the fixed AI Assistant.
- Removed the legacy outer panel highlight that washed out directory controls.
  The phone overdue-banner layout now lives once in `crm-shell.css`, shared by
  both roles/views rather than duplicated as an Activity-specific exception.
- Added a presentation-only `crmChartColors` helper. It resolves existing CSS
  tokens for canvas fills, borders, axis text and legend markers. Original chart
  rows, labels, values, percentages, order, axes, cutout and tooltips remain.
  A focused VM test verifies unchanged example totals and pagination ranges.
- New isolated `test:ui:team` covers Admin list/cards, search, territory, status,
  stage and sort; empty reset, page size, chart values/pixels, profile leads,
  assignment form, CSV and menu actions. Both Salesman profiles retain denied
  directory access. No production records or external providers are used.
- Capture now returns the document to its top before full-page screenshots so
  sticky headers do not appear midway down the artifact. Existing Before images
  are retained; the complete final comparison matrix remains outstanding.
- `npm run verify`: PASS after the final shared banner consolidation. Expanded
  `npm run test:ui`: PASS, all 20 flows (8 core in 3.0m, 4 shell in 26.3s,
  4 data in 57.3s, 4 team in 35.2s). The final team suite including explicit
  Jump to Leads / Filter Pipeline assertions passed again, 4 profiles in 34.2s.
- Native zoom, all error/provider states and the full migration remain pending.

### Tasks and weekly reports presentation phase

- Compared revised proposal pages 28 and 41 with the existing Salesman authoring
  and Admin review views. `crm-reports.css` shares white/teal panels, navy text,
  gold italic title accents, readable date ranges and compact status badges.
- Preserved every field path, required/optional completion rule, voice target,
  draft/submit/review event handler and API. Only two client title-rendering
  lines use the existing escaping title helper. No report workflow changed.
- Desktop columns scroll independently; tablet/phone use natural single-column
  flow, readable wrapping and 44px/16px fields. Tasks keeps the shared navy rail.
- Required-empty amber and filled green reuse existing completeness classes.
  Corrected CSS specificity so the neutral field rule cannot override these
  states; completion count and optional fields retain their original behavior.
- Browser verification found the fixed AI launcher obscuring desktop Submit.
  Action-card bottom clearance now applies on desktop as well as mobile; tests
  click normally without forcing events or hiding the launcher.
- `npm run verify`: PASS. `npm run test:ui:reports`: PASS, all four role/viewport
  profiles in 1.8m. Covers draft, submit, revision note validation, revision,
  resubmission, acceptance, immutable versions and required-field feedback.
- Full `npm run test:ui`: PASS, all 24 flows (8 core in 2.7m, 4 shell in 31.7s,
  4 data in 51.3s, 4 team in 34.7s, 4 reports in 1.7m).
  Microphone permissions, production UAT,
  provider errors, native zoom and the complete design/state matrix remain pending.

### Admin Dashboard presentation phase

- Compared proposal page 32 with the current dashboard. The overdue alert now
  precedes KPIs; existing Lead Action Plans and intelligence/Director Alerts
  share a desktop work row and stack in document order on smaller screens.
  Existing overview collapse, lower operational cards, configuration agent,
  market snapshot and funnel remain available; no proposed feature is added.
- Extended shared `crm-dashboard.css`, rather than creating a role-specific
  theme. Uses the same white/teal panels, navy typography and safe gold-italic
  title helper. The DOM arranger moves existing elements only; dataset, API,
  permission, count, collapse-storage and event-handler logic are unchanged.
- The proposal's Assigned Leads chart has no matching existing dashboard
  component and is omitted; the existing performance snapshot stays on Salesmen.
- Corrected lower-card left alignment and removed legacy parent/child fixed
  heights that clipped enlarged records and mobile Pipeline Health totals.
  Regression checks compare rendered scroll/client heights, not CSS alone.
- Added four-profile `test:ui:dashboard`: counts in all four Admin summaries and
  eight Salesman KPI/stage summaries match their sources; search/reset, Escape,
  focus restoration, bulk plan expand/collapse, Intel collapse, route return,
  mobile wrapping and page overflow are covered. Final four-profile dashboard
  run passed in 41.9s, including alert-button alignment and teal market bars.
- First verify failure was the old direct-after-action-plan DOM assertion in
  `dashboard-summary-modal.test.js`; replaced it with the new work-row equivalent
  while retaining count, permission, focus and data-source assertions. Verify
  passed. Final `npm run verify`: PASS. Full `npm run test:ui`: PASS, 28 flows
  (8 core in 2.7m, 4 shell in 24.2s, 4 data in 39.7s, 4 team in 28.5s,
  4 reports in 1.0m and 4 dashboard in 41.9s). A final market-bar-only color
  refinement is covered by the fresh dashboard suite and token contract test.
  Full provider/error/zoom coverage and final all-screen comparison remain pending.

### Dialogs and approved display-label phase

- Compared proposal dialog pages 36 and 44-47 with native forms. New shared
  `crm-dialogs.css` styles navy/white/teal surfaces, gold title accents, readable
  labels/fields, clear focus and disabled/error states, responsive bounds and
  scrolling. Existing IDs, field names, state, API calls and event handlers stay.
- Title rendering uses the already escaped `pageTitleMarkup` helper. Native
  dialog close/Escape/backdrop and AI save-confirmation mechanics are unchanged.
  Stepper numbers serve as their own navigation markers; removed duplicate
  auto-inserted arrows that caused excess height and narrow text columns.
- Owner clarified Lost should display as Blocked. The approved proposal display
  map is Prospect/Outreach/Engaged/Active/Dormant/Blocked for unchanged canonical
  NEW/CONTACTED/NEGOTIATION/WON/DORMANT/LOST. Sampling remains omitted. Form values,
  counters, datasets, closure/risk rules, reason history and API fields stay.
  Pipeline sorting retains the pre-migration canonical-label comparison.
- Four-profile dialog checks cover required-company validation, Places, PMR,
  voice/attachment control presence, activity save/read-back, AI prompt entry,
  bounds/readability, filter values and raw stage persistence. A pre-existing
  duplicate saveActivity ID required a scoped test locator, not an app-ID rename.
- Keyboard checks exposed a genuine specificity conflict: the shared control
  rule overrode amber header focus with navy. The open-dialog selector now wins;
  tests navigate by Tab/Shift+Tab instead of relying on programmatic focus.
- `npm run verify`: PASS after the final primary-button consolidation and the
  owner-requested Dormant tile. The clean expanded 32-flow suite passed before
  the Dormant addition (8 core, 4 shell, 4 data, 4 team, 4 report, 4 dashboard,
  4 dialog checks). The authenticated API read proves LOST/NEW remain stored
  unchanged. Earlier keyboard-focus failures were fixed, not waived.
- Dormant already exists in the data model and stage selectors. Added its
  assigned-record count and shared summary popup to the dashboard status row,
  between Active and Blocked. The popup describes previously active leads that
  have gone quiet; no automatic reclassification or closure-rule change occurs.
  Six desktop tiles reuse the existing responsive grid and mobile breakpoints.
  After this addition, `npm run test:ui:dialogs` passed all four role/viewport
  profiles (1.2m), including Dormant popup count, description, Escape close and
  canonical DORMANT selector-value assertions.
  Real microphone/provider success, every deletion/import/handoff/error state,
  native zoom and final all-screen comparison remain pending.

### Login and final presentation audit checkpoint

- Public sign-in uses the same shared white/navy/amber tokens as both roles.
  Preserved logo bytes/proportions, input names/types/autocomplete, native
  validation, submit handler, error live region and existing recovery control.
  Brand caption is visible; desktop kicker precedes the headline, while mobile
  retains headline-first stacking. Field boundaries use the shared accessible
  control border, with 16px input text and at least 44px targets.
- The previous mobile parent surface masked the form's rounded top corners.
  The narrow-screen shell now uses the existing navy token behind that surface;
  no positioning, authentication, validation or viewport-scaling change.
- Removed the WhatsApp configuration-example button at render time only,
  as requested by management. Source example arrays, settings, API responses,
  existing activity records and proposal/apply permissions remain unchanged.
  Other examples, including Add Qatar to territories, remain available.
- Updated the core browser assertion from five to six dashboard stage tiles
  after the owner-approved Dormant addition; did not remove the assertion.
- Public hero and form computed filter/backdrop-filter/box-shadow are all none.
  The Sign in button has a solid amber fill and no background image or shadow.
  Live desktop and 375px phone captures are kept outside the repository.
- Existing Before/After capture pairs were checked by exact filename: 18 per
  Admin profile and 16 per Salesman profile, 68 pairs total, with no missing
  After counterpart. File presence is not visual signoff; extra state captures
  and the complete all-dialog/native-zoom comparison remain outstanding.
- `npm run verify`: PASS against the final login source. Separate lint/typecheck
  commands remain unavailable, as documented in Q-05.
- The expanded `npm run test:ui` passed core 8 (2.5m), shell 4 (31.9s), data 4
  (42.7s), team 4 (44.2s) and reports 4 (1.9m), then stopped on the obsolete
  dashboard assertion expecting eight Salesman summaries instead of nine.
  Updated that assertion to nine and explicitly require the Dormant card; no
  count check was removed. Corrected dashboard rerun: four profiles PASS (1.3m),
  including every Dormant drill-down count. Final dialog rerun: four profiles
  PASS (1.8m), including the added 1440px/375px Dormant summary captures.
  All seven suites have passing evidence across the run and focused reruns, but
  that earlier full command remains a failed historical run. The subsequent
  clean mobile Pipeline chain below passes and clears the rerun gate.
- Final-source sign-in/role-route rerun: four profiles PASS (2.1m), using
  `CRM_UI_TEST_PORT=4191` and the existing Playwright CLI with
  `test --config=playwright.ui.config.js --grep "sign-in validation"`.
  An initial npm/cmd wrapper split the filter argument and found no tests;
  direct argument-array invocation fixed the command without altering tests.
- Files in this checkpoint: client.js, crm-shell.css, index.html, sw.js;
  tests/activity-dashboard-latest.test.js, tests/admin-dashboard-layout.test.js,
  tests/crm-shell.test.js, tests/global-bauhaus-system.test.js,
  tests/ui/baseline.spec.js, tests/ui/dashboard.spec.js, tests/ui/dialogs.spec.js,
  tests/ui/shell.spec.js, tests/ui/README.md and these two migration documents.
  No API request, data model, validation, role/permission or provider change.
  No production UAT, push, PR, merge or deployment occurs.
- The current in-app browser exposes viewport and visibility capabilities, not
  native browser zoom. Effective-width checks are retained as responsive
  evidence only; actual 125%/150% browser zoom still needs a supported browser
  or human UAT, and has not been replaced with CSS zoom.

### Mobile Pipeline card checkpoint

- Shared pipelineLeadRowMarkup still renders one role-scoped record set and all
  nine existing cells. Added presentation labels and a phone-only call link using
  primaryLeadContact and the existing tel convention. No new backend operation,
  API field, workflow, role guard, filtering, sorting or pagination calculation.
- At <=720px, the existing table rows present as labeled two-column cards with
  16px company names, 14px values, 12px labels and 44px actions. Desktop remains
  a table. All existing filters/sort controls stay in a scoped horizontal header
  band; only that header scrolls sideways, never the mobile record cards/page.
- Existing row/Open keyboard and click handlers are unchanged; links are already
  excluded by bindLeadTableRows. No Call link is rendered for a missing number.
  The phone test fixture uses the reserved +1 202-555-0101, never called.
- Regression coverage verifies nine cells and escaped values, phone/desktop
  visibility, card bounds, header-only horizontal overflow, retained filters,
  sorting, pagination, exports, role restrictions, error/retry and row Enter.
  Mobile Open remains clear of the AI launcher. Actual API/business tests stay.
- Commands: node tests/crm-data.test.js PASS; npm run test:ui:data PASS all four
  profiles after final styling (55.4s); npm run verify PASS. Fresh clean
  npm run test:ui PASS, exit 0, all 32 checks: 8 core (4.0m), 4 shell (32.1s),
  4 data (1.1m), 4 team (34.9s), 4 reports (2.3m), 4 dashboard (58.8s) and
  4 dialogs (1.5m). No assertion was skipped or removed to obtain this result.
- Files: client.js, crm-data.css, sw.js; tests/crm-data.test.js,
  tests/activity-dashboard-latest.test.js, tests/admin-dashboard-layout.test.js,
  tests/global-bauhaus-system.test.js, tests/ui/data.spec.js,
  tests/ui/fixture-server.js, tests/ui/README.md and the two migration documents.
  Shipped CSS stays on the existing static route; cache revision v96 preserves
  all existing private/API cache exclusions. No production release performed.
- Existing mobile prototype has fewer metadata fields and filters than the
  application. Keeping every live field makes these cards taller; none are
  omitted to imitate the prototype. Native zoom/provider/full-state UAT remains.

## 4. Existing page and route inventory

Frontend: static SPA in `index.html` and `client.js`, not React/Vue/Angular. Query views are restricted by `parseAppRoute()`; nested lead URLs retain browser history and tab state. Keep IDs, data attributes, event delegation and focus restoration stable.

After results below are scoped to their named synthetic checks. A PASS prefix
does not clear a remaining PENDING state or certify a production provider.

| ID | Route/surface | Roles and existing content/actions | Evidence / baseline | After |
| --- | --- | --- | --- | --- |
| P-01 | `/` when signed out | Work email/password, submit, validation, live login errors, current Forgot password control | index.html loginForm; auth-login-status, auth-refresh PASS suite; recovery has no handler | PASS local sign-in/presentation and existing auth tests; recovery gap Q-08 unchanged |
| P-02 | `/?view=dashboard`, Admin | Dashboard Overview; four drill-down KPI cards; overdue report; Intel Overview; Director Alerts; location/sector market snapshot; funnel/comparison expand; action plans; cold relationships; interactions; pipeline health; database agent; configuration agent | render(), arrangeAdminDashboardLayout(); admin-dashboard-layout, dashboard-summary-modal PASS suite | PASS main layout/count drill-downs/collapse and route reentry; secondary/provider/error states PENDING |
| P-03 | `/?view=dashboard`, Salesman | My Leads/Overdue Calls/Due Today; six pipeline stages including Dormant and Blocked (stored LOST); Top 3 actions; Call these next; live contact table; first touch/loss reasons; tools; daily briefing, news, portfolio/follow-up sections and summary popups | renderSalesman* functions; dashboard-summary-modal, salesperson-ai-actions PASS suite | PASS main flow, nine summary counts/search/close/focus and normal flow; secondary/provider states PENDING |
| P-04 | `/?view=pipeline` | List only, KPIs, column search/filter/sort, page size/pagination, retry/refresh, lead open; Admin due-date report filter and Excel/PDF exports | renderPipeline*, pipelineVisibleLeads(); pipeline-live-leads, assignment-isolation, HTTP permissions PASS suite | PASS four-profile filters/sort/pagination/export/recovery, desktop table and mobile cards; native zoom PENDING |
| P-05 | `/?view=salesmen` | Management directory; KPIs, search, territory/status/stage/sort filters, List/Cards, pagination, CSV export, profile/lead modal, assign/filter-pipeline actions, performance charts | configureRoleUi()/applyView(); salesmen-directory PASS suite | PASS four-profile role/list/cards/filters/chart totals/CSV/existing actions; full state matrix PENDING |
| P-06 | `/?view=activity` | Management calendar, week navigation and Minimize/Expand, activity KPIs/log, date presets/range, salesman/type/company filters, reset, add/edit/view, deletion-review queue, reminders, quick links, pagination | Salesman access redirects to dashboard; activity-dashboard-latest, activity-workflow PASS suite | PASS calendar/minimize/filter/reset/readability and role redirect; deletion/review/media browser states PENDING |
| P-07 | `/?view=tasks`, Salesman | Weekly report: week summary, secured orders/exceptions, expected orders/voice, problem accounts, market intel, next week plan, attestation, checkpoints, blockers, draft, submit/resubmit, history | weekly-report*, weekly-report-workflow PASS suite | PASS required-field feedback/draft/submit/history/revision flow; microphone/provider states PENDING |
| P-08 | `/?view=tasks`, leadership | Weekly review, selected report/version, missing submissions, date/week selection, start review, accept/reject/request revision, review notes and immutable history | renderWeeklyReviewView(); weekly-report-workflow/ui PASS suite | PASS synthetic submitted/accepted/revision and empty selection; every rejection/error state PENDING |
| P-09 | `/leads/:id?tab=...` | Both roles, authorized record only; company/owner/stage/territory header; back navigation; Overview, Activities, PMR, Reminders, Intel, Notes | leadRouteUrl()/applyRouteState(); lead-detail-bauhaus and related suites PASS | PASS all six tabs, role routes, active state and responsive bounds; complete tab-state matrix PENDING |
| P-10 | Lead Overview | Snapshot, contacts, commercial/additional/secondary fields, health, call/email, log/edit, enrichment review/field apply, LinkedIn search, AI summary, one-click company actions, attention flags | drawerOverviewMarkup and renderDetail; lead-ai-summary, company-ai-actions PASS suite | PASS Overview presentation and AI minimize/expand; enrichment/provider/action-state browser UAT PENDING |
| P-11 | Lead Activities | Timeline/structured activity, view/edit/correction/delete-request, attachments, protected audio, quote reference | activity-modal/workflow, pmr-voice-note, voice-note-security PASS suite | PASS timeline and activity save/read after navigation; correction/deletion/media browser paths PENDING |
| P-12 | Lead PMR | File/report display, meeting/activity linkage, transcript/recording, structured fields | pmr-voice-note and role-access PASS suite | PASS tab/dialog presentation and open/close; microphone/provider workflow UAT PENDING |
| P-13 | Lead Reminders | Add, complete, reschedule, note, calendar links, overdue/upcoming display | reminderCard(), follow-up handlers; activity-workflow PASS suite, complete browser path NOT RUN | PASS tab presentation; add/complete/reschedule/calendar browser paths PENDING |
| P-14 | Lead Intel | Report/job state; generate/refresh/retry; PDF upload/preview/open/download; source information and prior-report safety | lead-intelligence-service/api/ui PASS suite | PASS current empty/configuration-state presentation and API tests; live job/upload/PDF browser UAT PENDING |
| P-15 | Lead Notes | Edit and save existing notes | drawerNotesMarkup(), API PATCH; SOURCE | PASS four-profile edit/PATCH response/updated UI; production persistence not tested |
| P-16 | Quotes navigation | Declares Pipeline, but baseline duplicate handlers return to Dashboard; no quote route/builder/approval/send/CRUD | Baseline source and four-profile audit; N/A separate module | Known baseline workflow defect; proposal images reviewed separately, no routing repair authorized |
| P-17 | Accounts navigation | Declares Pipeline, but baseline duplicate handlers return to Dashboard; no receivables/credit/utilization module | Baseline source and four-profile audit; N/A standalone module | Known baseline workflow defect; proposal images reviewed separately, no routing repair authorized |
| P-18 | Search Places | Dialog with keyword/location, results, Use Business into Add Lead, enrichment/duplicate review | placesForm and /api/places/search; enrichment PASS suite | PASS dialog/fields/focus/bounds; live provider/results UAT PENDING |
| P-19 | Mobile Home/Leads/Log/Map/Alerts | Bottom tabs; raised Log opens Quick Log; Map dialog/list/external navigation; Alerts opens pending changes (not a new notification inbox); sidebar drawer and backdrops | initPwaShell(), nav handlers; pwa-shell/mobile-ui PASS suite | PASS bottom tabs/drawer/Quick Log/Map/Pending open-close and public hiding; offline/external actions PENDING |
| P-20 | Install/update/offline surfaces | Install banner, update/refresh, sync status, IndexedDB pending items, retry/sync now, toast/error/loading/empty states | sw.js and outbox handlers; pwa-shell/static-assets-security PASS suite | PASS static asset/cache protection tests; offline/install/update/sync full browser matrix PENDING |

No new route may be added to simulate the proposal's Today, Companies, Statuses, Performance or Director AI screens. Re-skin the current equivalent surface, retain existing controls not pictured, and record missing equivalents instead.

## 5. Dialogs, drawers, sheets and forms

Appendix A lists every static field declaration, including page filters and hidden inputs. Appendix B lists generated field contracts, including weekly report paths. Values/options are sourced from existing settings/constants; do not replace them with prototype options.

| Form/dialog | Existing behavior to preserve | Baseline | After |
| --- | --- | --- | --- |
| loginForm / authScreen | Existing email/password submission, required/type checks, session refresh and failure reporting | auth-login-status/auth-refresh PASS suite | PENDING |
| leadDialog / leadForm | Three steps and optional groups; company/contact/follow-up fields; step validation; duplicates; product-interest checkboxes; voice note; metadata; save/edit | role-access, enrichment, fuzzy-match, assignment-isolation PASS suite; browser NOT RUN | PENDING |
| importLeadsDialog | CSV file, mapping, preview filters, duplicateMode skip/update/import_all, import, template and error downloads | SOURCE; admin HTTP restriction PASS suite | PENDING |
| pmrDialog / pmrForm | Structured PMR, recording/playback/delete/re-record, AI draft review, activity link, save/offline queue | pmr-voice-note PASS suite | PENDING |
| activityDialog / activityForm | Lead picker, next-action plan/date/purpose, notes, record/pause/stop/cancel, attachments, remove/retry, edit version, save/cancel | activity-modal/workflow PASS suite | PENDING |
| activityEditDialog / activityEditForm | Append correction, date/type/text, optional reminder corrections; preserve original history | activity-workflow PASS suite | PENDING |
| activityDetailsDialog | View fields, attachments, edit, deletion request/cancel, protected file downloads | activity-workflow PASS suite | PENDING |
| activityDeletionDialog / activityDeletionForm | Reason/comments, required validation, submit/cancel | activity-workflow PASS suite | PENDING |
| activityDeletionQueueDialog | Search/filters/review notes, approve/reject, no self-approval | activity-workflow/role suites PASS | PENDING |
| lostReasonDialog / lostReasonForm | Existing reason keys, competitor, 500-character detail, skip/save; keep Lost independent from Dormant | role-access and source review | PENDING |
| placesDialog / placesForm | Required keyword/location, search/results, Use Business, close | enrichment PASS suite | PENDING |
| salesmanDialog / salesmanForm | Name/email/territory/password >=8, management server scope, Admin-visible create action | HTTP permissions PASS suite | PENDING |
| handoffDialog / handoffForm | Required note >=20 characters, confirm/cancel, immutable handoff/notification side effects unchanged | assignment-isolation/role-access PASS suite | PENDING |
| aiActionDialog | Company/portfolio results, regenerate/retry/copy, draft email, mail app, save brief/activity/notes, set next action, linked companies | company-ai-actions/salesperson-ai-actions PASS suite | PENDING |
| flagAttentionDialog / flagAttentionForm | Existing company_id/reason, cancel/flag; director notification and snapshot behavior | company-ai-actions PASS suite | PENDING |
| salesmanLeadsDialog / salesmanLeadsForm | Owner-specific summary stats and table; open/close, row navigation, stage/overdue badges | salesmen-directory PASS suite | PENDING |
| summaryCardDetailsDialog | Shared Admin/Salesman metric breakdown; same source totals, search, column filters, sort, page size/page nav, retry/open full list, close/Escape/backdrop/focus restoration | dashboard-summary-modal PASS suite | PENDING |
| quickLogDialog / quickLogForm | Company search/select/recent/nearby, types/phrases, quote/order inputs, next date, save/offline queue | pwa-shell/activity suites PASS | PENDING |
| pendingChangesDialog | Pending/failed entries, status, retry/sync now/close | pwa-shell PASS suite | PENDING |
| mobileMapDialog | Visible company map/list, external map/navigate and log | SOURCE; no route optimization | PENDING |
| leadDrawer | AI/detail split and mobile tabs, back/backdrop/Escape, authorized record | lead-detail-bauhaus/assignment suites PASS | PENDING |
| aiAssistantDialog / aiAssistantForm | Command/voice, choices, preview, confirmation, cancel, email drafts/history, open lead, refresh, keyboard/focus | ai-sales-assistant PASS suite | PENDING |
| Configuration Agent panel | Prompt/examples, proposal, password-confirmed apply, audit | agent-service/security suites and SOURCE | PENDING |

## 6. Field and validation invariants

- Lead field names and hidden enrichment/coordinate metadata must stay intact (Appendix A). Product-interest checkboxes are generated and must retain `name="product_interest"`.
- Lead ownership/territory enforcement is server-side, not an editable styling choice.
- Pipeline filters: search (previous company/contact coverage), nextAction, overdue band, dueDate, salesman, stage, priority, territory, plus report dateFrom/dateTo. Preserve combined filters, sorting, pagination and Lost/Dormant-last Salesman ordering.
- Report date ranges are based on `next_action_date`; do not silently switch to creation/activity dates.
- Summary drilldowns use the same records/count rules as their cards. Preserve all Salesman summary types, including Overdue, Coverage Gap, Next Up and Lost.
- Weekly report required-field amber/green states and checkpoint/sidebar blockers share completeness logic. Keep exact nested `data-weekly-field`, array-toggle and voice-target paths.
- Weekly statuses: not_started, in_progress, submitted, under_review, accepted, rejected, revision_required. Retain locks, revision/version numbers, immutable events, attestation and save/submit behavior.
- PMR account status/heat/value/timing are independent fields, not pipeline-stage aliases. Preserve each option set.
- Activity date/user/correction/version/deletion semantics remain server-controlled. Keep nine-plus existing activity/meta types and reminders; do not reduce them to the proposal's seven types.
- Notes, upload validation, recording limits, keyboard submission, field-level errors, disabling/loading and retry states are functionality, not optional presentation.
- Hidden/legacy renderers must not be deleted merely because they were found by the index; determine reachability before migration.

## 7. Role and permission preservation

| Area | Admin current behavior | Salesman current behavior | Baseline / after |
| --- | --- | --- | --- |
| Routes/navigation | Dashboard, Pipeline, Salesmen, Activity, Tasks, lead detail | Dashboard, Pipeline, Tasks, own visible lead details; Salesmen/Activity redirected | role-access PASS suite / PENDING |
| Visible leads | Organization scope within existing route/RLS narrowing | Current assigned_to ID is authoritative; assigned_salesman name/email fallback only when ID absent | assignment-isolation PASS suite / PENDING |
| Create/edit lead | Existing management controls and reassignment flow | Self-assignment/territory on create; no reassignment escalation | role-access/HTTP PASS suite / PENDING |
| User administration | Create button shown to Admin; server uses management guard for /api/users | No user administration | SOURCE + HTTP tests / PENDING |
| User PATCH | Existing status/role/territory fields and password checks; no self-deactivation | Denied by management guard | SOURCE / PENDING |
| Import and lead/report exports | Admin-only existing guard | Denied | HTTP permissions PASS suite / PENDING |
| Activity | Management review queue and allowed activity actions | Existing own/visible-record create/edit/correction/deletion-request access, no review escalation | activity-workflow PASS suite / PENDING |
| Deletion | Authorized approve/reject/direct delete as currently implemented; self-approval protections | Request/cancel only where currently allowed | role-access/workflow PASS suite / PENDING |
| Weekly reports | Existing leadership review and versions | Own draft/submit/history only | weekly-report-workflow PASS suite / PENDING |
| Company AI / portfolio AI | Existing guarded scopes | Own visible-record context only | company/salesperson/agent suites PASS / PENDING |
| Configuration Agent | Admin only, password-confirmed apply | Denied | agent tests/source / PENDING |
| Private media/PDF | Lead-authorized retrieval and expiring access | Same record isolation | voice-note/intelligence/security suites PASS / PENDING |

Manager and Director are real code roles. Preserve their current guards even though this UI task focuses on Admin/Salesman. Do not rename Admin into Director or infer identical permissions from the proposal.

## 8. API contract catalogue

Notation: V = authenticated, visible-record scope; O = own record/session; M = management guard (admin/director/manager); A = admin-only; C = existing cron secret/signature. Source is `server.js` unless noted. Entries group explicit aliases; each method and suffix must remain unchanged. All are SOURCE-reviewed and PENDING post-re-skin; baseline suite coverage is recorded in section 10.

| Endpoint/pattern | Method(s) | Scope / purpose |
| --- | --- | --- |
| /api/health | GET | Anonymous health metadata |
| /api/auth/login | POST | Anonymous credential exchange |
| /api/auth/refresh | POST | Existing refresh-session exchange |
| /api/auth/me | GET | O session identity |
| /api/auth/logout | POST | O sign-out |
| /api/settings | GET | Existing authenticated settings/profile scope |
| /api/users | GET, POST | M list/create; UI create control currently Admin-only |
| /api/users/:id | PATCH | M update; preserve all existing password/status/role/self checks |
| /api/leads | GET, POST | V list; create payload ownership rules |
| /api/leads/duplicates | GET | Existing fuzzy name match/authorized result rules |
| /api/leads/import | POST | A bulk import |
| /api/leads/:id | GET, PATCH, DELETE | V, current field/reassignment/delete checks |
| /api/leads/:id/stage | PATCH | V; stage/loss metadata and validation |
| /api/leads/:id/handoffs | GET | V handoff history; writes occur through existing reassignment path |
| /api/leads/:id/delete-requests | POST | Authorized request |
| /api/leads/:id/delete-requests/:requestId/approve | POST | Existing management review/self-approval checks |
| /api/leads/:id/delete-requests/:requestId/reject | POST | Existing management review |
| /api/leads/:id/delete-requests/:requestId/cancel | POST | Authorized requester cancellation |
| /api/activities | GET | V activity search/filter/page data |
| /api/activity-deletion-requests | GET | Existing own/management queue narrowing |
| /api/leads/:id/activities | POST | V append/structured activity |
| /api/leads/:id/activities/:activityId | PATCH | Existing workflow/version checks; separate numeric legacy correction branch |
| /api/leads/:id/activities/:numericIndex | DELETE | Existing legacy guard/failure behavior, not direct UI permission |
| /api/leads/:id/activities/:activityId/attachments | POST | Authorized activity upload |
| /api/leads/:id/activities/:activityId/attachments/:attachmentId | GET | Authorized protected download |
| /api/leads/:id/pmrs | GET, POST | V structured PMR list/create |
| /api/transcriptions | POST | Authenticated upload/transcription |
| /api/pmrs/analyze-transcript | POST | Authenticated PMR draft analysis |
| /api/pmr-voice-notes | POST | O authorized recording upload |
| /api/pmr-voice-notes/:id | GET | Protected audio, not public static media |
| /api/pmr-voice-notes/:id/signed-url | GET | Lead-authorized expiring URL |
| /api/leads/:id/intel | GET | V intelligence/report/job status |
| /api/leads/:id/intelligence/upload | POST | V PDF upload |
| /api/leads/:id/intelligence/generate | POST | V queue/create job |
| /api/leads/:id/intelligence/refresh | POST | V refresh |
| /api/leads/:id/intelligence/retry | POST | V retry |
| /api/leads/:id/intelligence/pdf/:reportId | GET | Server-authorized PDF stream |
| /api/admin/lead-intelligence/process | POST | Existing Admin processing guard; do not run during re-skin |
| /api/admin/lead-intelligence/backfill | POST | Existing Admin backfill guard; do not run |
| /api/leads/enrich-company | POST | Existing company lookup workflow |
| /api/leads/:id/auto-enrichment/confirm | POST | V reviewed fields apply |
| /api/leads/:id/auto-enrichment/retry | POST | V provider retry |
| /api/leads/:id/enrich | POST | V Hunter enrichment |
| /api/places/search | POST | Existing authenticated Places search |
| /api/integrations/status | GET | Authenticated provider availability |
| /api/market-intelligence | GET | Existing visible-portfolio matching |
| /api/market-news | GET | Normalized cached news |
| /api/market-intelligence/fetch | POST | Existing management refresh guard |
| /api/linkedin/search-url | GET | Ordinary external search URL, not LinkedIn API |
| /api/erp/validate-quotation | POST | Read-only reference validation stub |
| /api/agent/query | POST | Read-only visible CRM query |
| /api/configuration-agent/state | GET | A settings/proposal context |
| /api/configuration-agent/propose | POST | A draft configuration proposal |
| /api/configuration-agent/apply | POST | A existing password-confirmed apply |
| /api/configuration-agent/audit | GET | A audit history |
| /api/salesperson-ai-actions | POST | Caller-derived visible portfolio |
| /api/ai/lead-summary | POST | V grounded summary |
| /api/leads/:id/ai-actions | POST | V company actions |
| /api/attention-flags | GET | Existing own/management scope |
| /api/attention-flags/:id | PATCH | Existing management acknowledgement/resolution guard |
| /api/leads/:id/attention-flags | POST | V flag with snapshots/notification |
| /api/ai-assistant/interpret | POST | Existing command interpretation and preview |
| /api/ai-assistant/confirm | POST | Confirm previously interpreted action; no write before confirmation |
| /api/ai-assistant/cancel | POST | O cancel |
| /api/ai-assistant/history | GET | O existing audit scope |
| /api/ai-assistant/email-drafts | GET | O draft/review state; no email delivery feature |
| /api/weekly-reports/current | GET, POST | O current report/read/save |
| /api/weekly-reports/current/submit | POST | O validated submission |
| /api/weekly-reports/mine | GET | O report history |
| /api/weekly-reports/review; /api/admin/weekly-reports | GET | Existing leadership review list |
| /api/weekly-reports/:id; /api/admin/weekly-reports/:id | GET | O or authorized leadership detail |
| /api/weekly-reports/:id/draft | PUT, PATCH | Existing editable-status/version checks |
| /api/weekly-reports/:id/submit | POST | Existing validation/locking/version transition |
| /api/weekly-reports/:id/review | POST | Existing leadership action/note |
| /api/admin/weekly-reports/:id/start-review, /accept, /reject, /request-revision | POST | Existing leadership aliases |
| /api/exports/leads.xls; /api/exports/leads.pdf | GET | A lead backup exports |
| /api/exports/pipeline-report.xls; /api/exports/pipeline-report.pdf | POST | A selected IDs/date-filter report, not GET |
| /api/cron/fetch-market-intelligence | GET | C signed/idempotent weekly work |
| /api/cron/process-lead-intelligence | GET, POST | C existing queue-processing contract |

Older docs mention `/api/supabase-config`, POST handoffs and broader export/user access. Those are not permission to add endpoints or widen current guards. See Q-10.

## 9. Jobs, browser tasks and integrations

| ID | Existing job/integration | Current boundary and UI to preserve | Baseline / after |
| --- | --- | --- | --- |
| J-01 | Vercel market-intelligence cron | `0 2 * * 1`; signed/idempotent reservation and logs | cron-security PASS suite / PENDING |
| J-02 | Vercel lead-intelligence processor | `0 3 * * *`; existing secret, bounded queue processing | lead-intelligence-api PASS suite / PENDING |
| J-03 | Auth initialization/refresh | Prevent unauthenticated background fetch replacing loaded data | auth-refresh/summary-loading PASS suite / PENDING |
| J-04 | Overdue/workspace refresh | Existing signed-in 60-second lead refresh; no new polling | SOURCE / PENDING |
| J-05 | IndexedDB outbox | Online/offline/visibility/SyncManager and 60-second retry; PMR/voice/quick-log payloads | pwa-shell/pmr suites / PENDING |
| J-06 | PWA cache/install/update | Static allowlist; API network-only; existing cache rotation protections | pwa-shell/static-assets-security PASS / PENDING |
| J-07 | Typing debounces | Company duplicate/enrichment caches, company/activity searches | fuzzy-match/enrichment PASS / PENDING |
| J-08 | Recording timers | Existing microphone permission, recording limits, pause/stop, elapsed UI, review/transcribe; no automatic save | pmr/assistant/workflow suites / PENDING |
| I-01 | Supabase Auth/Postgres/Storage | Caller JWT, current-assignment isolation, private files, allowlisted privileged operations | authorization-boundary PASS / PENDING |
| I-02 | Local JSON fallback | Development backend only, not a production migration target | HTTP suites PASS / PENDING |
| I-03 | Google Places | Server-side discovery/enrichment, availability/error/partial/review states, manually edited fields protected | enrichment PASS / PENDING |
| I-04 | Hunter | Server-side domain email enrichment, gated by backend/provider availability | source/service suites / PENDING |
| I-05 | OpenAI | Voice translation/normalization, PMR drafts, lead summary/intelligence/assistant where configured; no new transmissions | lead-intelligence/summary/assistant PASS / PENDING |
| I-06 | Anthropic | Grounded company/portfolio actions, enrichment, database/configuration agent, audit/rate limits | agent/company/salesperson suites PASS / PENDING |
| I-07 | Zawya/market feeds | Config-gated sector/geography matching and refresh | phase5-integrations PASS / PENDING |
| I-08 | NewsAPI | Config-gated normalized news, existing 15-minute cache | phase5-integrations PASS / PENDING |
| I-09 | ERP | Existing non-empty quotation-reference stub; not a new quote/accounting connector | phase5-integrations PASS / PENDING |
| I-10 | LinkedIn | Standard search links only | phase5-integrations PASS / PENDING |
| I-11 | Google Calendar/Maps/geolocation | Existing add-to-calendar links, map navigation, optional nearby assist; preserve permissions and no route optimization | SOURCE / PENDING |
| I-12 | Email/tel | mailto/tel, editable follow-up drafts and mail-app launch; no Zoho mailbox OAuth, sending service or incoming-reply synchronization | SOURCE / PENDING |
| I-13 | Raw PMR document URL | Existing external document link, not a Drive upload/sync integration | SOURCE / PENDING |
| I-14 | Chart.js/Google Fonts | Existing chart data/series and font host/CSP; preserve legends/text equivalents | static/phase5 suites / PENDING |
| I-15 | Firebase messaging worker | Scaffold only; no claim of configured push delivery | SOURCE; live delivery NOT RUN / PENDING scaffold only |
| I-16 | XLS/PDF/CSV exports | Existing content, columns, guard, filter scope, filenames and downloads | HTTP/static suites / PENDING |
| I-17 | WhatsApp | No wa.me/WhatsApp link found in current index/client source scan; do not add | SOURCE / PENDING final whole-runtime scan |

## 10. Test families and remaining baseline work

All following baseline files ran successfully through `npm run verify`:
- Auth/roles/security: auth-login-status, auth-refresh, sales-lead-summary-auth-loading, role-access, lead-assignment-isolation, admin-salesman-permissions.e2e, supabase-authorization-boundary, security-headers, rate-limit-security, cron-security, static-assets-security.
- Lead/AI/integrations: enrichment, fuzzy-match, agent-service, company-ai-actions, lead-ai-summary, salesperson-ai-actions, phase5-integrations, lead-intelligence-service, lead-intelligence-api, lead-intelligence-ui.
- Activities/media/reports: pmr-voice-note, voice-note-security, activity-modal, activity-workflow, weekly-report, weekly-report-workflow, weekly-report-ui.
- UI contracts: dashboard-summary-modal, admin-dashboard-layout, lead-detail-bauhaus, activity-readability, activity-dashboard-latest, tasks-bauhaus-flat, global-bauhaus-system, salesmen-directory, pipeline-live-leads, ai-sales-assistant, mobile-ui, pwa-shell.

Before styling:
1. Agree a local/staging synthetic-data browser fixture that cannot load production secrets or modify a live database. Existing Playwright production spec is unsuitable as-is.
2. Run both roles through login/logout/session refresh; dashboard drilldowns; Pipeline combinations/sort/pages; create/edit/duplicate; detail tabs; structured activity/correction/deletion review; PMR/voice review; weekly draft/submit/review; search/import/export; AI preview/cancel/confirm and offline queue.
3. Voice, camera/location, provider, email, and file actions must not fabricate live success. Stub provider boundaries only in tests, not runtime, and label synthetic screens.
4. Capture all baseline screen/dialog/state screenshots before tokens are edited.
5. UI contract tests that pin old CSS/colors may need reviewed presentation-assertion updates. Never remove behavior/security tests to make a new theme pass.
6. Establish lint/typecheck handling with owner; do not promise nonexistent commands.

## 11. Screenshot matrix

For each applicable Admin/Salesman screen in P-01 through P-20, and every dialog in section 5:
- Desktop: 1440 x 900; Mobile: 375 x 812; browser scale 100%.
- Use the same fixture data and selected state for before/after.
- Include overview and every lead tab, both directory modes, filter-open state, long list, loading, empty/error, disabled and keyboard focus states.
- Include expanded/minimized calendar, expanded/collapsed dashboard panels, report missing/complete/locked/revision states, duplicate warning, pending enrichment and AI confirmation.
- Store artifacts outside the repository by default; publish only approved de-identified screenshots.
- At inventory time: all Before/After entries NOT RUN/PENDING, not completed screenshots.
- Preparation checkpoint: main-flow Before captures are under the OS temporary directory, `arg-crm-ui-screenshots/before/<project>/`. They include login, dashboard, Pipeline, six lead tabs, authorized main routes, Add Lead steps, Add Activity, AI Assistant, weekly draft or minimized calendar. Every other state/dialog and all After captures remain PENDING. Approved background/logo assets are recorded in [assets/brand/README.md](../assets/brand/README.md); they are not yet applied to the runtime.

## 12. Migration plan and commit gates

| Step | Scope | Commit boundary | Required gate |
| --- | --- | --- | --- |
| 0 | Inventory, proposal mismatches, baseline evidence | Documentation only | This inventory posted before runtime changes |
| 1 | Synthetic local/staging browser baseline and screenshot matrix | Test-only commit, no production defaults/secrets | Both roles' main flows pass before styles |
| 2 | Shared design tokens, font loading, approved background/logo assets | Tokens/assets only | Contrast, CSP/static allowlist/cache, responsive tests |
| 3 | Presentational Button/Pill/Card/Table/Dialog/Sheet/Stepper/Field/Tabs/EmptyState patterns in existing HTML/template architecture | Small primitive commits | Preserve IDs/names/events; icon names; no new state/library |
| 4 | Sidebar/topbar/mobile tabs, one existing amber main action, launcher | Shell only | Role navigation and 375-1440px overflow/focus checks |
| 5 | Login, Salesman Dashboard, Pipeline, lead Overview and remaining tabs, weekly report | One page/tab family per commit | Same fixtures/totals/actions; before/after per role |
| 6 | Admin Dashboard, Salesmen/Performance, Activity, weekly review | One page family per commit | Preserve full data and management-only controls |
| 7 | Existing dialogs, summary drilldowns, voice/upload/review forms, mobile sheets | Small dialog-family commits | Focus trap/restoration/Escape/backdrop; validation; no workflow changes |
| 8 | Existing Quotes/Accounts shortcuts and omitted legacy surfaces; all states | Presentation only, no new modules | Resolve Q items; preserve current destinations/features |
| 9 | Whole-route regression/visual review and inventory updates | Verification/evidence commit | Every applicable item PASS or explicitly BLOCKED; no silently untested acceptance |

Run supported focused tests and `npm run verify` after each implementation step. Run approved lint/type checks if provided. No merge, manual Vercel deployment, Supabase migration, environment change, backfill or production-data action is part of this plan.

## Appendix A. Static field contracts

Each row is SOURCE baseline / PENDING after re-skin. Readonly/hidden fields count as contracts. IDs/names are exact source tokens. The table includes filter controls outside forms as `page`; dynamic option values remain supplied by runtime settings.

| Form | Field contract | Type | Validation/attributes | Source |
| --- | --- | --- | --- | --- |
| loginForm | name=email | email | required; autocomplete=username | index.html:73 |
| loginForm | name=password | password | required; autocomplete=current-password | index.html:74 |
| page | id=smartSearchInput | search | autocomplete=off | index.html:157 |
| page | id=portfolioReportView | select | existing runtime/browser validation | index.html:352 |
| page | id=portfolioStageFilter | select | existing runtime/browser validation | index.html:353 |
| page | id=portfolioCountryFilter | select | existing runtime/browser validation | index.html:354 |
| page | id=portfolioEmirateFilter | select | existing runtime/browser validation | index.html:355 |
| page | id=marketSnapshotSalesmanFilter | select | existing runtime/browser validation | index.html:453 |
| page | id=agentPrompt | text | existing runtime/browser validation | index.html:543 |
| page | id=configAgentPrompt | textarea | existing runtime/browser validation | index.html:563 |
| page | id=pipelineReportDateFrom | date | existing runtime/browser validation | index.html:605 |
| page | id=pipelineReportDateTo | date | existing runtime/browser validation | index.html:609 |
| page | id=salesmenSearch | search | autocomplete=off | index.html:669 |
| page | id=salesmenTerritoryFilter | select | existing runtime/browser validation | index.html:673 |
| page | id=salesmenStatusFilter | select | existing runtime/browser validation | index.html:677 |
| page | id=performanceStageFilter | select | existing runtime/browser validation | index.html:688 |
| page | id=salesmenSort | select | existing runtime/browser validation | index.html:692 |
| page | id=activitySalesmanFilter | select | existing runtime/browser validation | index.html:894 |
| page | id=activityTypeSelect | select | existing runtime/browser validation | index.html:900 |
| page | id=activityDateFrom | date | existing runtime/browser validation | index.html:908 |
| page | id=activityDateTo | date | existing runtime/browser validation | index.html:909 |
| page | id=activityCompanySearch | search | existing runtime/browser validation | index.html:914 |
| leadForm | name=company_name; id=leadCompanyName | input | required | index.html:1039 |
| leadForm | name=assigned_salesman; id=formSalesman | select | existing runtime/browser validation | index.html:1044 |
| leadForm | name=territory; id=formTerritory | select | existing runtime/browser validation | index.html:1045 |
| leadForm | name=sector; id=formSector | select | existing runtime/browser validation | index.html:1046 |
| leadForm | name=tier; id=formTier | select | existing runtime/browser validation | index.html:1054 |
| leadForm | name=country_emirate | input | existing runtime/browser validation | index.html:1055 |
| leadForm | name=location | input | existing runtime/browser validation | index.html:1056 |
| leadForm | name=legal_name | input | existing runtime/browser validation | index.html:1057 |
| leadForm | name=year_established | input | existing runtime/browser validation | index.html:1058 |
| leadForm | name=industry | input | existing runtime/browser validation | index.html:1059 |
| leadForm | name=business_category | input | existing runtime/browser validation | index.html:1060 |
| leadForm | name=address | input | existing runtime/browser validation | index.html:1061 |
| leadForm | name=website | url | existing runtime/browser validation | index.html:1062 |
| leadForm | name=google_maps_url | url | existing runtime/browser validation | index.html:1063 |
| leadForm | name=contact_person | input | existing runtime/browser validation | index.html:1080 |
| leadForm | name=phone | input | existing runtime/browser validation | index.html:1081 |
| leadForm | name=email | email | existing runtime/browser validation | index.html:1082 |
| leadForm | name=stage; id=formStage | select | existing runtime/browser validation | index.html:1083 |
| leadForm | name=priority; id=formPriority | select | existing runtime/browser validation | index.html:1084 |
| leadForm | name=primary_contact_title | input | existing runtime/browser validation | index.html:1092 |
| leadForm | name=estimated_value | number | min=0 | index.html:1093 |
| leadForm | name=secondary_contact_name | input | existing runtime/browser validation | index.html:1098 |
| leadForm | name=secondary_contact_title | input | existing runtime/browser validation | index.html:1099 |
| leadForm | name=secondary_contact_mobile | input | existing runtime/browser validation | index.html:1100 |
| leadForm | name=secondary_contact_email | email | existing runtime/browser validation | index.html:1101 |
| leadForm | name=tags | input | existing runtime/browser validation | index.html:1102 |
| leadForm | name=quotation_ref | input | existing runtime/browser validation | index.html:1103 |
| leadForm | name=next_action; id=formNextAction | select | existing runtime/browser validation | index.html:1120 |
| leadForm | name=next_action_date | date | existing runtime/browser validation | index.html:1125 |
| leadForm | name=activity_purpose; id=formActivityPurpose | select | existing runtime/browser validation | index.html:1126 |
| leadForm | name=notes | textarea | existing runtime/browser validation | index.html:1133 |
| leadForm | name=estimated_monthly_volume | input | existing runtime/browser validation | index.html:1145 |
| leadForm | name=first_order_date | date | existing runtime/browser validation | index.html:1146 |
| leadForm | name=products_services_remarks | textarea | existing runtime/browser validation | index.html:1147 |
| leadForm | name=google_place_id | hidden | existing runtime/browser validation | index.html:1151 |
| leadForm | name=google_rating | hidden | existing runtime/browser validation | index.html:1152 |
| leadForm | name=google_review_count | hidden | existing runtime/browser validation | index.html:1153 |
| leadForm | name=latitude | hidden | existing runtime/browser validation | index.html:1154 |
| leadForm | name=longitude | hidden | existing runtime/browser validation | index.html:1155 |
| leadForm | name=opening_hours | hidden | existing runtime/browser validation | index.html:1156 |
| leadForm | name=enrichment_source | hidden | existing runtime/browser validation | index.html:1157 |
| leadForm | name=enrichment_status | hidden | existing runtime/browser validation | index.html:1158 |
| leadForm | name=enriched_at | hidden | existing runtime/browser validation | index.html:1159 |
| pmrForm | name=company_id | hidden | existing runtime/browser validation | index.html:1200 |
| pmrForm | name=meeting_date | date | required | index.html:1201 |
| pmrForm | name=relationship_heat_score; id=pmrHeat | select | existing runtime/browser validation | index.html:1202 |
| pmrForm | name=activity_id; id=pmrActivityLink | select | existing runtime/browser validation | index.html:1203 |
| pmrForm | name=first_order_timing; id=pmrOrderTiming | select | existing runtime/browser validation | index.html:1204 |
| pmrForm | name=potential_annual_value; id=pmrPotentialValue | select | existing runtime/browser validation | index.html:1205 |
| pmrForm | name=director_action_required; id=pmrDirectorAction | select | existing runtime/browser validation | index.html:1206 |
| pmrForm | name=account_status; id=pmrAccountStatus | select | existing runtime/browser validation | index.html:1207 |
| pmrForm | name=products_discussed | textarea | existing runtime/browser validation | index.html:1208 |
| pmrForm | name=competitors_mentioned | textarea | existing runtime/browser validation | index.html:1209 |
| pmrForm | name=compliance_requirements | textarea | existing runtime/browser validation | index.html:1210 |
| pmrForm | name=raw_document_url | url | existing runtime/browser validation | index.html:1211 |
| pmrForm | name=notes | textarea | existing runtime/browser validation | index.html:1212 |
| pmrForm | name=voice_note_transcript | textarea | existing runtime/browser validation | index.html:1221 |
| pmrForm | name=voice_note_id | hidden | existing runtime/browser validation | index.html:1222 |
| pmrForm | name=voice_note_url | hidden | existing runtime/browser validation | index.html:1223 |
| pmrForm | name=voice_note_path | hidden | existing runtime/browser validation | index.html:1224 |
| pmrForm | name=voice_note_mime_type | hidden | existing runtime/browser validation | index.html:1225 |
| pmrForm | name=voice_note_size_bytes | hidden | existing runtime/browser validation | index.html:1226 |
| activityEditForm | name=lead_id | hidden | existing runtime/browser validation | index.html:1243 |
| activityEditForm | name=activity_index | hidden | existing runtime/browser validation | index.html:1244 |
| activityEditForm | name=at | date | required | index.html:1245 |
| activityEditForm | name=type | select | existing runtime/browser validation | index.html:1247 |
| activityEditForm | name=text | textarea | required | index.html:1260 |
| activityEditForm | name=reminder_type | select | existing runtime/browser validation | index.html:1263 |
| activityEditForm | name=due_date | date | existing runtime/browser validation | index.html:1272 |
| activityEditForm | name=due_time | time | existing runtime/browser validation | index.html:1273 |
| activityEditForm | name=activity_required | input | existing runtime/browser validation | index.html:1274 |
| lostReasonForm | name=lost_reason; id=lostReasonSelect | select | existing runtime/browser validation | index.html:1293 |
| lostReasonForm | name=lost_competitor; id=lostCompetitorInput | input | existing runtime/browser validation | index.html:1308 |
| lostReasonForm | name=lost_reason_detail; id=lostReasonDetail | textarea | maxlength=500 | index.html:1311 |
| placesForm | name=keyword | input | required | index.html:1333 |
| placesForm | name=location | input | existing runtime/browser validation | index.html:1334 |
| salesmanForm | name=name | input | required | index.html:1352 |
| salesmanForm | name=email | email | required | index.html:1353 |
| salesmanForm | name=territory; id=salesmanTerritory | select | required | index.html:1354 |
| salesmanForm | name=password | password | required; minlength=8; autocomplete=new-password | index.html:1355 |
| handoffForm | name=handoff_note | textarea | required; minlength=20 | index.html:1372 |
| flagAttentionForm | name=company_id | hidden | existing runtime/browser validation | index.html:1406 |
| flagAttentionForm | name=reason | textarea | existing runtime/browser validation | index.html:1407 |
| quickLogForm | id=quickLogCompanySearch | input | autocomplete=off | index.html:1428 |
| quickLogForm | id=quickLogLeadSelect | select | required | index.html:1431 |
| quickLogForm | id=quickLogNote | textarea | existing runtime/browser validation | index.html:1438 |
| quickLogForm | id=quickQuotationRef | input | existing runtime/browser validation | index.html:1441 |
| quickLogForm | id=quickOrderVolume | input | existing runtime/browser validation | index.html:1444 |
| quickLogForm | id=quickNextAction | input | existing runtime/browser validation | index.html:1449 |
| quickLogForm | id=quickNextDate | date | existing runtime/browser validation | index.html:1455 |
| activityForm | name=lead_id | hidden | existing runtime/browser validation | index.html:1474 |
| activityForm | name=activity_id | hidden | existing runtime/browser validation | index.html:1475 |
| activityForm | name=activity_version | hidden | existing runtime/browser validation | index.html:1476 |
| activityForm | name=lead_picker; id=activityLeadPicker | select | existing runtime/browser validation | index.html:1480 |
| activityForm | name=next_action_plan; id=activityNextActionPlan | select | required | index.html:1484 |
| activityForm | name=next_action_date; id=activityNextActionDate | date | required | index.html:1492 |
| activityForm | name=activity_purpose; id=activityPurpose | select | required | index.html:1496 |
| activityForm | name=notes; id=activityNotes | textarea | existing runtime/browser validation | index.html:1506 |
| activityForm | id=activityAttachmentInput | file | accept=.png,.pdf,.doc,.docx,.xls,.xlsx | index.html:1532 |
| activityDeletionForm | name=lead_id | hidden | existing runtime/browser validation | index.html:1576 |
| activityDeletionForm | name=activity_id | hidden | existing runtime/browser validation | index.html:1577 |
| activityDeletionForm | name=reason | select | required | index.html:1580 |
| activityDeletionForm | name=comments | textarea | maxlength=1000 | index.html:1591 |
| page | id=activityDeletionQueueSearch | search | existing runtime/browser validation | index.html:1612 |
| page | id=activityDeletionQueueStatus | select | existing runtime/browser validation | index.html:1613 |
| page | id=activityDeletionQueueRequester | search | existing runtime/browser validation | index.html:1622 |
| page | id=activityDeletionQueueSalesman | select | existing runtime/browser validation | index.html:1623 |
| page | id=activityDeletionQueueFrom | date | existing runtime/browser validation | index.html:1626 |
| page | id=activityDeletionQueueTo | date | existing runtime/browser validation | index.html:1627 |
| aiAssistantForm | id=aiAssistantCommand | textarea | maxlength=3000 | index.html:1691 |

## Appendix B. Generated field hooks

SOURCE baseline / PENDING after re-skin. Template expressions are source placeholders, not database values. Keep the full surrounding template intact; an extracted hook is not a schema rename instruction. Anonymous readonly/display controls are retained by source location.

| Hook/name/id | Source | Baseline | After |
| --- | --- | --- | --- |
| data-activity-review-note=${escapeHtml(request.id)} | client.js:2234 | SOURCE | PENDING |
| name=product_interest | client.js:3204 | SOURCE | PENDING |
| id=importCsvFile | client.js:4091 | SOURCE | PENDING |
| data-import-map=${escapeHtml(header)} | client.js:4160 | SOURCE | PENDING |
| name=duplicateMode | client.js:4240 | SOURCE | PENDING |
| name=duplicateMode | client.js:4241 | SOURCE | PENDING |
| name=duplicateMode | client.js:4242 | SOURCE | PENDING |
| data-summary-details-search=(presence hook) | client.js:5161 | SOURCE | PENDING |
| data-summary-details-filter=${escapeHtml(filter.key)} | client.js:5171 | SOURCE | PENDING |
| data-summary-details-filter=${escapeHtml(filter.key)} | client.js:5174 | SOURCE | PENDING |
| data-summary-details-filter=${escapeHtml(filter.key)} | client.js:5177 | SOURCE | PENDING |
| data-summary-details-page-size=(presence hook) | client.js:5277 | SOURCE | PENDING |
| data-pipeline-filter=salesman | client.js:8322 | SOURCE | PENDING |
| data-pipeline-filter=search | client.js:8326 | SOURCE | PENDING |
| data-pipeline-filter=nextAction | client.js:8329 | SOURCE | PENDING |
| data-pipeline-filter=overdue | client.js:8332 | SOURCE | PENDING |
| data-pipeline-filter=dueDate | client.js:8342 | SOURCE | PENDING |
| data-pipeline-filter=stage | client.js:8346 | SOURCE | PENDING |
| data-pipeline-filter=priority | client.js:8349 | SOURCE | PENDING |
| data-pipeline-filter=territory | client.js:8352 | SOURCE | PENDING |
| data-pipeline-page-size=(presence hook) | client.js:8417 | SOURCE | PENDING |
| data-linkedin-title=${escapeHtml(lead.id)} | client.js:9066 | SOURCE | PENDING |
| name=notes | client.js:9409 | SOURCE | PENDING |
| data-lead-intelligence-upload=${escapeHtml(leadId)} | client.js:9439 | SOURCE | PENDING |
| id=drawerStageSelect | client.js:9563 | SOURCE | PENDING |
| data-salesmen-page-size=(presence hook) | client.js:10579 | SOURCE | PENDING |
| data-weekly-field=secured_orders.${index}.has_issue | client.js:12048 | SOURCE | PENDING |
| data-weekly-field=secured_orders.${index}.problem_note | client.js:12054 | SOURCE | PENDING |
| data-weekly-field=no_secured_orders_confirmed | client.js:12062 | SOURCE | PENDING |
| data-weekly-field=${fieldBase}.likelihood; data-weekly-completion-field=(presence hook) | client.js:12085 | SOURCE | PENDING |
| data-weekly-field=${fieldBase}.timing; data-weekly-completion-field=(presence hook) | client.js:12091 | SOURCE | PENDING |
| id=weeklyExpectedBlockers${index}; data-weekly-field=${fieldBase}.blockers; data-weekly-completion-field=(presence hook) | client.js:12097 | SOURCE | PENDING |
| data-weekly-field=no_expected_orders_confirmed | client.js:12119 | SOURCE | PENDING |
| data-weekly-field=problematic_accounts.${index}.disposition | client.js:12146 | SOURCE | PENDING |
| data-weekly-field=problematic_accounts.${index}.dismiss_reason | client.js:12153 | SOURCE | PENDING |
| data-weekly-array-toggle=problematic_accounts.${index}.problems | client.js:12160 | SOURCE | PENDING |
| data-weekly-field=problematic_accounts.${index}.other_problem | client.js:12168 | SOURCE | PENDING |
| data-weekly-field=problematic_accounts.${index}.specifics | client.js:12173 | SOURCE | PENDING |
| data-weekly-field=problematic_accounts.${index}.assessment | client.js:12177 | SOURCE | PENDING |
| data-weekly-field=no_problematic_accounts_confirmed | client.js:12188 | SOURCE | PENDING |
| data-weekly-field=market_intelligence.demand_band | client.js:12199 | SOURCE | PENDING |
| data-weekly-field=market_intelligence.pricing_band | client.js:12203 | SOURCE | PENDING |
| data-weekly-field=market_intelligence.demand_note | client.js:12207 | SOURCE | PENDING |
| data-weekly-field=market_intelligence.competitor_loss | client.js:12211 | SOURCE | PENDING |
| data-weekly-field=market_intelligence.cashflow_band | client.js:12215 | SOURCE | PENDING |
| data-weekly-field=market_intelligence.extended_terms_band | client.js:12219 | SOURCE | PENDING |
| data-weekly-field=market_intelligence.defaults_heard | client.js:12223 | SOURCE | PENDING |
| data-weekly-field=market_intelligence.government_projects_band | client.js:12227 | SOURCE | PENDING |
| data-weekly-field=market_intelligence.competitor_pricing_note | client.js:12231 | SOURCE | PENDING |
| data-weekly-field=market_intelligence.competitor_loss_note | client.js:12236 | SOURCE | PENDING |
| data-weekly-field=market_intelligence.defaults_details | client.js:12242 | SOURCE | PENDING |
| data-weekly-field=market_intelligence.government_projects_note | client.js:12248 | SOURCE | PENDING |
| data-weekly-field=market_intelligence.projects_note | client.js:12253 | SOURCE | PENDING |
| data-weekly-field=market_intelligence.new_customers_note | client.js:12257 | SOURCE | PENDING |
| data-weekly-field=market_intelligence.lost_customers_note | client.js:12261 | SOURCE | PENDING |
| data-weekly-field=market_intelligence.big_changes_note | client.js:12265 | SOURCE | PENDING |
| data-weekly-field=summary; data-weekly-completion-field=(presence hook) | client.js:12299 | SOURCE | PENDING |
| data-weekly-field=next_week_plan | client.js:12309 | SOURCE | PENDING |
| data-weekly-field=attested | client.js:12312 | SOURCE | PENDING |
| id=weeklyAdminWeekEnding | client.js:12352 | SOURCE | PENDING |
| id=weeklyReviewNote | client.js:12485 | SOURCE | PENDING |
| id=weeklyReviewNote | client.js:12696 | SOURCE | PENDING |
| id=detailStage | client.js:13243 | SOURCE | PENDING |
| id=activityText | client.js:13248 | SOURCE | PENDING |
| id=activityQuotationRef | client.js:13250 | SOURCE | PENDING |
| id=activityReminderDate | client.js:13254 | SOURCE | PENDING |
| id=activityReminderTime | client.js:13255 | SOURCE | PENDING |
| (anonymous display control; preserve source template) | client.js:15229 | SOURCE | PENDING |
| id=aiActivityPlan | client.js:15233 | SOURCE | PENDING |
| id=aiActivityPurpose | client.js:15237 | SOURCE | PENDING |
| id=aiActivityDate | client.js:15241 | SOURCE | PENDING |
| id=aiActivityTime | client.js:15245 | SOURCE | PENDING |
| id=aiActivityNotes | client.js:15249 | SOURCE | PENDING |
| id=aiDraftRecipient | client.js:15254 | SOURCE | PENDING |
| id=aiDraftCc | client.js:15258 | SOURCE | PENDING |
| id=aiDraftBcc | client.js:15262 | SOURCE | PENDING |
| id=aiDraftSubject | client.js:15266 | SOURCE | PENDING |
| id=aiDraftBody | client.js:15270 | SOURCE | PENDING |

## Appendix C. Static button/action declarations

Every static button declaration is listed, including close controls, selectors, hidden role controls and submit buttons. Page/form context, current role checks and the corresponding handler remain authoritative; source presence does not grant access. Labels may contain HTML entities.

| ID/action hook | Label | Source | Baseline / after |
| --- | --- | --- | --- |
| (form/context-bound button) | Forgot password? | index.html:75 | SOURCE / PENDING |
| (form/context-bound button) | Sign in | index.html:76 | SOURCE / PENDING |
| id=menuBackdrop | Close navigation menu | index.html:88 | SOURCE / PENDING |
| id=closeMobileSidebar | &times; | index.html:99 | SOURCE / PENDING |
| data-view=dashboard | DB Dashboard | index.html:104 | SOURCE / PENDING |
| data-view=pipeline | PL Pipeline | index.html:105 | SOURCE / PENDING |
| data-view=salesmen | TM Salesmen | index.html:106 | SOURCE / PENDING |
| data-view=activity | AC Activity | index.html:107 | SOURCE / PENDING |
| data-view=tasks | TS Tasks | index.html:113 | SOURCE / PENDING |
| data-quick-view=pipeline | QT Quotes | index.html:114 | SOURCE / PENDING |
| data-quick-view=pipeline | AC Accounts | index.html:115 | SOURCE / PENDING |
| id=sidebarSearchPlaces | GP Search Places | index.html:116 | SOURCE / PENDING |
| id=exportLeadsExcel | Export Excel | index.html:127 | SOURCE / PENDING |
| id=exportLeadsPdf | Export PDF | index.html:128 | SOURCE / PENDING |
| id=openImportLeads | Import Leads | index.html:129 | SOURCE / PENDING |
| id=mobileMenuToggle | Menu | index.html:146 | SOURCE / PENDING |
| id=syncStatusPill | All synced | index.html:153 | SOURCE / PENDING |
| id=openSalesmanForm | Create Salesman Account | index.html:161 | SOURCE / PENDING |
| id=logoutButton | Sign Out | index.html:162 | SOURCE / PENDING |
| id=openPlacesSearch | Search places | index.html:163 | SOURCE / PENDING |
| id=openLeadForm | Add lead | index.html:164 | SOURCE / PENDING |
| id=salesmanSimplifiedAddLead | Add lead | index.html:181 | SOURCE / PENDING |
| id=salesmanSimplifiedViewAll | View all | index.html:249 | SOURCE / PENDING |
| id=dailyAiSummary | (icon/structural control) | index.html:299 | SOURCE / PENDING |
| id=dashboardToggleTools | Coaching and research Open extra tools only when needed Full pipeline, performance, market intel, and the database assistant stay tucked away until you choose to open them. | index.html:311 | SOURCE / PENDING |
| id=dashboardQuickLogActivity | Activity Log activity Capture a call, visit, email, or follow-up note. | index.html:371 | SOURCE / PENDING |
| id=dashboardQuickPipeline | Pipeline Open full pipeline Switch to the full list or kanban when you need the whole book. | index.html:376 | SOURCE / PENDING |
| id=dashboardOpenFullBriefing | AI Briefing Open full briefing Run the deeper coaching layer only on demand. | index.html:381 | SOURCE / PENDING |
| id=dashboardTogglePerformance | Coaching My performance Reveal conversion, distribution, and portfolio metrics. | index.html:386 | SOURCE / PENDING |
| id=dashboardToggleMarketNews | Intel Market intel and news Browse headlines and project signals without crowding the default view. | index.html:391 | SOURCE / PENDING |
| id=dashboardToggleAgent | Ask Ask the database Open the read-only CRM oracle when you have a specific question. | index.html:396 | SOURCE / PENDING |
| id=refreshMarketIntel | Refresh Intel | index.html:409 | SOURCE / PENDING |
| data-market-snapshot-tab=location | Location | index.html:459 | SOURCE / PENDING |
| data-market-snapshot-tab=sector | Sector | index.html:460 | SOURCE / PENDING |
| id=agentToggle | Ask the database | index.html:532 | SOURCE / PENDING |
| id=agentAsk | Ask | index.html:544 | SOURCE / PENDING |
| id=configAgentPropose | Generate Proposal | index.html:566 | SOURCE / PENDING |
| id=configAgentApply | Apply with Admin Password | index.html:567 | SOURCE / PENDING |
| id=clearOverdueFilter | Clear overdue filter | index.html:589 | SOURCE / PENDING |
| id=exportPipelineExcel | Export Excel | index.html:612 | SOURCE / PENDING |
| id=exportPipelinePdf | Export PDF | index.html:613 | SOURCE / PENDING |
| id=clearPipelineFilters | Clear all filters | index.html:615 | SOURCE / PENDING |
| id=refreshPipelineLeads | Refresh | index.html:616 | SOURCE / PENDING |
| data-salesmen-view=list | List | index.html:702 | SOURCE / PENDING |
| data-salesmen-view=cards | Cards | index.html:703 | SOURCE / PENDING |
| id=clearSalesmenFilters | Clear Filters | index.html:706 | SOURCE / PENDING |
| id=applySalesmenFilters | Apply Filters | index.html:707 | SOURCE / PENDING |
| id=exportSalesmenDirectory | Export CSV | index.html:720 | SOURCE / PENDING |
| id=closeSalesmanLeads | Close | index.html:761 | SOURCE / PENDING |
| id=closeSummaryCardDetails | &times; | index.html:780 | SOURCE / PENDING |
| id=activityPrevWeek | ‹ | index.html:861 | SOURCE / PENDING |
| id=activityNextWeek | › | index.html:863 | SOURCE / PENDING |
| id=activityCalendarToggle | Minimize | index.html:864 | SOURCE / PENDING |
| id=openActivityCreate | + Add Activity | index.html:879 | SOURCE / PENDING |
| id=openActivityDeletionQueue | Deletion Requests | index.html:880 | SOURCE / PENDING |
| id=activityFilterToggle | Filters | index.html:884 | SOURCE / PENDING |
| id=activitySearchClear | &times; | index.html:915 | SOURCE / PENDING |
| id=activityResetFilters | Reset filters | index.html:918 | SOURCE / PENDING |
| id=installAppButton | Install | index.html:960 | SOURCE / PENDING |
| id=dismissInstallBanner | Not now | index.html:961 | SOURCE / PENDING |
| id=refreshAppButton | Refresh | index.html:969 | SOURCE / PENDING |
| data-view=dashboard | Home Home | index.html:973 | SOURCE / PENDING |
| data-view=pipeline | Leads Leads | index.html:974 | SOURCE / PENDING |
| data-mobile-action=quick-log | + Log | index.html:975 | SOURCE / PENDING |
| data-mobile-action=map | Map Map | index.html:976 | SOURCE / PENDING |
| data-mobile-action=alerts | ! Alerts 0 | index.html:977 | SOURCE / PENDING |
| id=leadDrawerBackdrop | Close lead details | index.html:981 | SOURCE / PENDING |
| data-lead-drawer-mobile-tab=ai | AI Summary | index.html:983 | SOURCE / PENDING |
| data-lead-drawer-mobile-tab=details | Lead Details | index.html:984 | SOURCE / PENDING |
| id=closeLeadForm | Close | index.html:1001 | SOURCE / PENDING |
| data-lead-step=0 | 1 Essentials Company, owner, territory | index.html:1005 | SOURCE / PENDING |
| data-lead-step=1 | 2 Contact Person, stage, priority | index.html:1012 | SOURCE / PENDING |
| data-lead-step=2 | 3 Next Step Action, timing, notes | index.html:1019 | SOURCE / PENDING |
| data-lead-details-toggle=company | Show Details | index.html:1036 | SOURCE / PENDING |
| data-lead-details-toggle=contact | Show Details | index.html:1077 | SOURCE / PENDING |
| data-lead-details-toggle=followup | Show Details | index.html:1117 | SOURCE / PENDING |
| id=recordLeadVoice | Record Voice Note | index.html:1135 | SOURCE / PENDING |
| id=leadStepBack | Back | index.html:1164 | SOURCE / PENDING |
| id=leadStepNext | Next | index.html:1166 | SOURCE / PENDING |
| id=leadSubmitButton | Save Lead | index.html:1167 | SOURCE / PENDING |
| id=closeImportLeads | Close | index.html:1181 | SOURCE / PENDING |
| id=closePmrForm | Close | index.html:1197 | SOURCE / PENDING |
| id=recordPmrVoice | Record Voice Note | index.html:1215 | SOURCE / PENDING |
| id=deletePmrVoice | Delete Recording | index.html:1216 | SOURCE / PENDING |
| (form/context-bound button) | Save PMR | index.html:1229 | SOURCE / PENDING |
| id=closeActivityEditForm | Close | index.html:1240 | SOURCE / PENDING |
| (form/context-bound button) | Append Correction | index.html:1278 | SOURCE / PENDING |
| id=closeLostReasonForm | Close | index.html:1289 | SOURCE / PENDING |
| id=skipLostReason | Skip for now | index.html:1317 | SOURCE / PENDING |
| (form/context-bound button) | Mark as Lost | index.html:1318 | SOURCE / PENDING |
| id=closePlacesSearch | Close | index.html:1330 | SOURCE / PENDING |
| (form/context-bound button) | Search | index.html:1335 | SOURCE / PENDING |
| id=closeSalesmanForm | Close | index.html:1349 | SOURCE / PENDING |
| (form/context-bound button) | Create Salesman | index.html:1358 | SOURCE / PENDING |
| id=cancelHandoff | Cancel | index.html:1369 | SOURCE / PENDING |
| id=confirmHandoff | Confirm Reassignment | index.html:1374 | SOURCE / PENDING |
| id=closeAiActionDialog | Close | index.html:1385 | SOURCE / PENDING |
| id=closeFlagAttention | Cancel | index.html:1404 | SOURCE / PENDING |
| id=cancelFlagAttention | Cancel | index.html:1410 | SOURCE / PENDING |
| (form/context-bound button) | Flag for Director | index.html:1411 | SOURCE / PENDING |
| id=closeQuickLog | Close | index.html:1424 | SOURCE / PENDING |
| data-quick-date=1 | Tomorrow | index.html:1451 | SOURCE / PENDING |
| data-quick-date=3 | 3 days | index.html:1452 | SOURCE / PENDING |
| data-quick-date=7 | Next week | index.html:1453 | SOURCE / PENDING |
| (form/context-bound button) | Save Activity | index.html:1457 | SOURCE / PENDING |
| id=closeActivityDialog | &times; | index.html:1471 | SOURCE / PENDING |
| id=activityRecordVoice; data-state=ready | Record Voice Note | index.html:1512 | SOURCE / PENDING |
| id=activityPauseVoice | Pause | index.html:1514 | SOURCE / PENDING |
| id=activityStopVoice | Stop | index.html:1515 | SOURCE / PENDING |
| id=activityCancelVoice | Cancel Recording | index.html:1516 | SOURCE / PENDING |
| id=activityDropZone | Drag and drop files here or choose Browse files | index.html:1533 | SOURCE / PENDING |
| id=cancelActivityDialog | Cancel | index.html:1542 | SOURCE / PENDING |
| id=saveActivity | Save Activity | index.html:1543 | SOURCE / PENDING |
| (form/context-bound button) | &times; | index.html:1555 | SOURCE / PENDING |
| (form/context-bound button) | Close | index.html:1559 | SOURCE / PENDING |
| id=cancelActivityDeletionFromDetails | Cancel Deletion Request | index.html:1560 | SOURCE / PENDING |
| id=editActivityFromDetails | Edit Activity | index.html:1561 | SOURCE / PENDING |
| id=requestActivityDeletionFromDetails | Request Deletion | index.html:1562 | SOURCE / PENDING |
| (form/context-bound button) | &times; | index.html:1574 | SOURCE / PENDING |
| (form/context-bound button) | Cancel | index.html:1596 | SOURCE / PENDING |
| (form/context-bound button) | Submit Request | index.html:1597 | SOURCE / PENDING |
| (form/context-bound button) | &times; | index.html:1609 | SOURCE / PENDING |
| id=closePendingChanges | Close | index.html:1641 | SOURCE / PENDING |
| id=syncNowButton | Sync now | index.html:1644 | SOURCE / PENDING |
| id=closeMobileMap | Close | index.html:1656 | SOURCE / PENDING |
| id=aiAssistantLauncher | \|\|\| AI Assistant | index.html:1662 | SOURCE / PENDING |
| id=closeAiAssistant | &times; | index.html:1674 | SOURCE / PENDING |
| id=aiAssistantMic | &#9835; Tap to speak | index.html:1693 | SOURCE / PENDING |
| id=aiAssistantInterpret | Understand command | index.html:1697 | SOURCE / PENDING |
| data-ai-prompt=Show my overdue calls | Show overdue calls | index.html:1703 | SOURCE / PENDING |
| data-ai-prompt=Show activities due today | Show due today | index.html:1704 | SOURCE / PENDING |
| data-ai-prompt=Schedule a call with  | Schedule a call | index.html:1705 | SOURCE / PENDING |
| data-ai-prompt=Prepare a quotation follow-up email for  | Draft an email | index.html:1706 | SOURCE / PENDING |
| id=aiAssistantCancel | Cancel | index.html:1721 | SOURCE / PENDING |
| id=aiAssistantConfirm | Confirm and save | index.html:1722 | SOURCE / PENDING |
| id=refreshAiDrafts | Refresh | index.html:1732 | SOURCE / PENDING |

## Appendix D. Generated action declarations

Lexical template index: hook NAMES and label excerpts identify the declaration, not evaluated runtime values. Conditional strings can contain embedded markup; follow the source line for full handler details. Includes retained legacy/hidden branches; do not expose or delete them solely because they appear here.

| Hook names | Label/source excerpt | Source | Baseline / after |
| --- | --- | --- | --- |
| data-toggle-lead-ai-minimize | AI Summary ${escapeHtml(lead.company_name \|\| "Lead")} | client.js:1267 | SOURCE / PENDING |
| data-refresh-lead-ai-summary | ${summaryState.loading ? "Refreshing..." : "Refresh AI Summary"} | client.js:1314 | SOURCE / PENDING |
| data-toggle-lead-ai-minimize | Minimize | client.js:1315 | SOURCE / PENDING |
| data-edit-activity-lead, data-edit-activity-index, data-edit-activity-id | Edit | client.js:1995 | SOURCE / PENDING |
| data-delete-activity-lead, data-delete-activity-index, data-delete-activity-id | ${pending ? "Deletion Pending" : "Request Deletion"} | client.js:2001 | SOURCE / PENDING |
| data-view-activity-lead, data-view-activity-index, data-view-activity-id | View | client.js:2006 | SOURCE / PENDING |
| data-quotation-ref | Quote ${escapeHtml(activity.quotation_ref)} | client.js:2021 | SOURCE / PENDING |
| data-details-download-attachment | Download | client.js:2111 | SOURCE / PENDING |
| data-activity-request-action, data-request-lead, data-request-id | Reject | client.js:2235 | SOURCE / PENDING |
| data-activity-request-action, data-request-lead, data-request-id | Approve | client.js:2236 | SOURCE / PENDING |
| data-review-delete-lead, data-review-delete-request, data-review-delete-action | ${request.target_type === "lead" ? "Approve Delete" : "Mark Reviewed"} | client.js:2442 | SOURCE / PENDING |
| data-review-delete-lead, data-review-delete-request, data-review-delete-action | Reject | client.js:2443 | SOURCE / PENDING |
| data-quick-lead | ${escapeHtml(lead.company_name)} | client.js:2617 | SOURCE / PENDING |
| data-quick-type | ${escapeHtml(ACTIVITY_TYPE_ICONS[type] \|\| "")} ${escapeHtml(type)} | client.js:2620 | SOURCE / PENDING |
| data-quick-phrase | ${escapeHtml(phrase)} | client.js:2623 | SOURCE / PENDING |
| data-quick-lead | Near you: ${escapeHtml(nearby.lead.company_name)} (${nearby.km.toFixed(1)} km) | client.js:2684 | SOURCE / PENDING |
| data-map-log | Log | client.js:2825 | SOURCE / PENDING |
| data-ai-company | ${escapeHtml(name)} | client.js:2874 | SOURCE / PENDING |
| data-salesperson-ai-action | Past expected contact frequency: ${Number(metrics.contact_overdue_count \|\| 0)} companies | client.js:2941 | SOURCE / PENDING |
| data-ai-company | ${escapeHtml(item.name)} ${escapeHtml(item.action)} - ${Number(item.days_overdue \|\| 0)} days overdue | client.js:2949 | SOURCE / PENDING |
| (class/context-bound) | Regenerate | client.js:2973 | SOURCE / PENDING |
| (class/context-bound) | ${state.aiAction.type === "metrics" ? "Copy summary" : "Copy"} | client.js:2975 | SOURCE / PENDING |
| (class/context-bound) | Copy brief | client.js:2978 | SOURCE / PENDING |
| (class/context-bound) | Save to activity log | client.js:2978 | SOURCE / PENDING |
| (class/context-bound) | Copy | client.js:2981 | SOURCE / PENDING |
| (class/context-bound) | Set as next action | client.js:2981 | SOURCE / PENDING |
| (class/context-bound) | Copy email | client.js:2984 | SOURCE / PENDING |
| (class/context-bound) | Open in mail app | client.js:2984 | SOURCE / PENDING |
| (class/context-bound) | Copy | client.js:2986 | SOURCE / PENDING |
| (class/context-bound) | Save to notes | client.js:2986 | SOURCE / PENDING |
| (class/context-bound) | Retry | client.js:3010 | SOURCE / PENDING |
| data-view-duplicate | View record | client.js:3736 | SOURCE / PENDING |
| id | Download Template CSV | client.js:4095 | SOURCE / PENDING |
| (class/context-bound) | Back | client.js:4166 | SOURCE / PENDING |
| (class/context-bound) | Next | client.js:4167 | SOURCE / PENDING |
| data-preview-filter | Show all | client.js:4216 | SOURCE / PENDING |
| data-preview-filter | Show warnings | client.js:4217 | SOURCE / PENDING |
| data-preview-filter | Show errors only | client.js:4218 | SOURCE / PENDING |
| (class/context-bound) | Back | client.js:4246 | SOURCE / PENDING |
| (class/context-bound) | Import ${importableCount} Leads | client.js:4247 | SOURCE / PENDING |
| (class/context-bound) | Download Error Report | client.js:4304 | SOURCE / PENDING |
| (class/context-bound) | View Imported Leads | client.js:4305 | SOURCE / PENDING |
| (class/context-bound) | Close | client.js:4306 | SOURCE / PENDING |
| data-smart-search-kind, data-smart-search-lead, data-smart-search-url | ${escapeHtml(result.company_name)} ${escapeHtml(result.stage)} ${escapeHtml(result.reason)} ${escapeHtml(result.meta)} ${escapeHtml(result.s | client.js:4583 | SOURCE / PENDING |
| data-smart-search-expand | Show all | client.js:4631 | SOURCE / PENDING |
| (class/context-bound) | Clear all filters | client.js:5162 | SOURCE / PENDING |
| (class/context-bound) | Retry | client.js:5236 | SOURCE / PENDING |
| data-summary-details-sort | ${escapeHtml(column.label)} ${summaryDetailsSortIndicator(column.key)} | client.js:5258 | SOURCE / PENDING |
| data-summary-details-page | ${pageNumber} | client.js:5272 | SOURCE / PENDING |
| data-summary-details-page | &lsaquo; | client.js:5280 | SOURCE / PENDING |
| data-summary-details-page | = pageCount ? "disabled" : ""}>&rsaquo; | client.js:5282 | SOURCE / PENDING |
| (class/context-bound) | Open full list &nearr; | client.js:5283 | SOURCE / PENDING |
| (class/context-bound) | View table | client.js:5671 | SOURCE / PENDING |
| (class/context-bound) | Close | client.js:5679 | SOURCE / PENDING |
| data-overdue-action, data-lead-id | ${escapeHtml(actionLabel)} | client.js:6027 | SOURCE / PENDING |
| (class/context-bound) | &times; | client.js:6028 | SOURCE / PENDING |
| data-followup-open | Open Lead | client.js:6882 | SOURCE / PENDING |
| data-followup-complete, data-followup-index, data-followup-date, data-followup-time, data-followup-text, data-followup-type | Complete | client.js:6883 | SOURCE / PENDING |
| data-followup-reschedule, data-followup-index, data-followup-text, data-followup-type | Reschedule | client.js:6884 | SOURCE / PENDING |
| data-followup-note | Add Note | client.js:6885 | SOURCE / PENDING |
| data-summary-card | ${salesmanDashboardSummaryIcon(card.icon)} ${escapeHtml(card.label)} ${escapeHtml(String(card.value))} ${escapeHtml(card.meta)} ${escapeHtml | client.js:7137 | SOURCE / PENDING |
| (class/context-bound) | ${escapeHtml(item.kicker)} ${escapeHtml(item.title)} ${bodyMarkup} ${escapeHtml(item.detail \|\| "")} ${escapeHtml(item.cta)} | client.js:7167 | SOURCE / PENDING |
| data-salesman-queue-open | ${escapeHtml(lead.company_name \|\| "Unnamed lead")} ${escapeHtml(lead.next_action \|\| "Next step")} - ${escapeHtml(lead.activity_purpose \|\| "F | client.js:7191 | SOURCE / PENDING |
| data-first-touch-open | Open lead | client.js:7218 | SOURCE / PENDING |
| data-first-touch-log | Log first touch | client.js:7219 | SOURCE / PENDING |
| data-loss-prompt-open | Open lead | client.js:7242 | SOURCE / PENDING |
| data-loss-prompt-capture | Capture reason | client.js:7243 | SOURCE / PENDING |
| data-summary-card | ${escapeHtml(card.label)} ${escapeHtml(String(card.value))} View summary &rarr; ${salesmanDashboardSummaryIcon(card.icon)} | client.js:7259 | SOURCE / PENDING |
| data-first-touch-open | Open Lead | client.js:7490 | SOURCE / PENDING |
| data-first-touch-log | Log First Touch | client.js:7491 | SOURCE / PENDING |
| data-salesperson-ai-action, data-dashboard-action | ${escapeHtml(item.kicker)} ${escapeHtml(item.title)} ${bodyMarkup} ${escapeHtml(item.detail \|\| "")} ${escapeHtml(item.cta)} | client.js:7574 | SOURCE / PENDING |
| data-loss-prompt-open | Open Lead | client.js:7622 | SOURCE / PENDING |
| data-loss-prompt-capture | Capture Reason | client.js:7623 | SOURCE / PENDING |
| data-agent-example | ${escapeHtml(prompt)} | client.js:7742 | SOURCE / PENDING |
| data-config-agent-example | ${escapeHtml(prompt)} | client.js:7782 | SOURCE / PENDING |
| data-focus-lead | ${escapeHtml(lead.company_name)} ${escapeHtml([inferEmirate(lead), daysAgoLabel(lead.last_activity)].filter(Boolean).join(" - "))} ${escapeH | client.js:7906 | SOURCE / PENDING |
| data-dashboard-activity-lead | ${escapeHtml(ACTIVITY_TYPE_ICONS[activity.type] \|\| "PIN")} ${escapeHtml(activity.company_name \|\| "Unnamed account")} ${escapeHtml(activity.n | client.js:7935 | SOURCE / PENDING |
| data-open-flag-lead | Open company record | client.js:7997 | SOURCE / PENDING |
| data-flag-action, data-flag-id | Acknowledge | client.js:7998 | SOURCE / PENDING |
| data-flag-action, data-flag-id | Resolve | client.js:7999 | SOURCE / PENDING |
| data-pipeline-sort | ${escapeHtml(label)} ${active ? (direction === "asc" ? "▲" : "▼") : "↕"} | client.js:8284 | SOURCE / PENDING |
| data-pipeline-open | Open | client.js:8308 | SOURCE / PENDING |
| (class/context-bound) | Clear all filters | client.js:8382 | SOURCE / PENDING |
| (class/context-bound) | Retry | client.js:8404 | SOURCE / PENDING |
| data-pipeline-page | Previous | client.js:8421 | SOURCE / PENDING |
| data-pipeline-page | = pages ? "disabled" : ""} aria-label="Next page">Next | client.js:8423 | SOURCE / PENDING |
| data-confirm-auto-enrichment | Apply All | client.js:8973 | SOURCE / PENDING |
| data-reenrich-lead | Re-enrich | client.js:8974 | SOURCE / PENDING |
| data-drawer-edit-lead | Edit | client.js:8975 | SOURCE / PENDING |
| data-confirm-auto-enrichment | Apply All | client.js:9042 | SOURCE / PENDING |
| data-apply-auto-field, data-lead-id | Apply | client.js:9052 | SOURCE / PENDING |
| data-linkedin-search | Find contact on LinkedIn | client.js:9069 | SOURCE / PENDING |
| data-drawer-log-activity | Add New Activity | client.js:9158 | SOURCE / PENDING |
| data-drawer-edit-lead | Edit Lead | client.js:9159 | SOURCE / PENDING |
| data-drawer-log-activity | Add New Activity | client.js:9257 | SOURCE / PENDING |
| data-drawer-log-activity | Add New Activity | client.js:9268 | SOURCE / PENDING |
| data-drawer-file-pmr | File New PMR | client.js:9351 | SOURCE / PENDING |
| data-drawer-add-reminder | Add Reminder | client.js:9394 | SOURCE / PENDING |
| (class/context-bound) | Edit Notes | client.js:9404 | SOURCE / PENDING |
| (class/context-bound) | Save Notes | client.js:9410 | SOURCE / PENDING |
| data-lead-intelligence-action, data-lead-id, data-report-id | ${escapeHtml(label)} | client.js:9434 | SOURCE / PENDING |
| data-lead-intelligence-pdf-download | Download PDF | client.js:9487 | SOURCE / PENDING |
| data-lead-intelligence-pdf-open | Open in new tab | client.js:9488 | SOURCE / PENDING |
| id | Back to leads | client.js:9533 | SOURCE / PENDING |
| id | Back to ${escapeHtml(state.lastNonLeadView === "activity" ? "Activity" : state.lastNonLeadView === "salesmen" ? "Salesmen" : state.lastNonLe | client.js:9552 | SOURCE / PENDING |
| data-drawer-tab | ${tabLabels[tab]} | client.js:9568 | SOURCE / PENDING |
| data-download-activity-attachment | Download | client.js:9819 | SOURCE / PENDING |
| data-toggle-remove-activity-attachment | ${removed ? "Keep" : "Remove"} | client.js:9820 | SOURCE / PENDING |
| data-retry-pending-activity-file | Retry | client.js:9831 | SOURCE / PENDING |
| data-remove-pending-activity-file | Remove | client.js:9832 | SOURCE / PENDING |
| data-kanban-tab | ${escapeHtml(stage.label)} ${count} | client.js:10193 | SOURCE / PENDING |
| data-salesmen-action, data-salesman-name | View Profile | client.js:10442 | SOURCE / PENDING |
| data-salesmen-action, data-salesman-name | Assign Leads | client.js:10443 | SOURCE / PENDING |
| data-salesmen-action, data-salesman-name | Jump to Leads | client.js:10447 | SOURCE / PENDING |
| data-salesmen-action, data-salesman-name | Filter Pipeline | client.js:10448 | SOURCE / PENDING |
| data-salesmen-page | &laquo; | client.js:10574 | SOURCE / PENDING |
| data-salesmen-page | &lsaquo; | client.js:10575 | SOURCE / PENDING |
| (class/context-bound) | ${page} | client.js:10576 | SOURCE / PENDING |
| data-salesmen-page | &rsaquo; | client.js:10577 | SOURCE / PENDING |
| data-salesmen-page | &raquo; | client.js:10578 | SOURCE / PENDING |
| (class/context-bound) | Clear Filters | client.js:10645 | SOURCE / PENDING |
| data-action-plan-bulk | Expand All | client.js:10776 | SOURCE / PENDING |
| data-action-plan-bulk | Collapse All | client.js:10777 | SOURCE / PENDING |
| data-action-plan-toggle | ${state.actionPlanCollapsed[group.key] ? "Expand" : "Collapse"} ${state.actionPlanCollapsed[group.key] ? "+" : "-"} | client.js:10823 | SOURCE / PENDING |
| data-activity-shortcut | ${escapeHtml(type)} | client.js:10974 | SOURCE / PENDING |
| data-activity-preset | ${escapeHtml(preset)} | client.js:10978 | SOURCE / PENDING |
| data-activity-quick-view | ${escapeHtml(link.icon)} ${escapeHtml(link.label)} ${escapeHtml(link.text)} | client.js:11321 | SOURCE / PENDING |
| data-quotation-ref | Quote ${escapeHtml(activity.quotation_ref)} | client.js:11397 | SOURCE / PENDING |
| data-calendar-lead | ${escapeHtml(item.time)} ${escapeHtml(item.company)} ${escapeHtml(item.title)} | client.js:11512 | SOURCE / PENDING |
| data-quotation-ref | Open quote ${escapeHtml(activity.quotation_ref)} | client.js:11564 | SOURCE / PENDING |
| data-activity-page | &#8249; | client.js:11605 | SOURCE / PENDING |
| data-activity-page | = pageCount ? "disabled" : ""} aria-label="Next activity page">&#8250; | client.js:11607 | SOURCE / PENDING |
| data-voice-target, data-idle-label, data-stop-label, data-listening-label, data-transcribing-label, data-success-label | Voice Note | client.js:12100 | SOURCE / PENDING |
| id | Load week | client.js:12359 | SOURCE / PENDING |
| data-weekly-history-id | ${escapeHtml(item.week_start && item.week_ending ? '${formatDisplayDate(item.week_start)} - ${formatDisplayDate(item.week_ending)}' : 'Week  | client.js:12363 | SOURCE / PENDING |
| id | Save draft | client.js:12399 | SOURCE / PENDING |
| id | ${String(report.status \|\| "").toLowerCase() === "revision_required" ? "Resubmit report" : "Submit report"} | client.js:12400 | SOURCE / PENDING |
| data-weekly-review-action | Mark under review | client.js:12488 | SOURCE / PENDING |
| data-weekly-review-action | Request revision | client.js:12489 | SOURCE / PENDING |
| data-weekly-review-action | Accept report | client.js:12490 | SOURCE / PENDING |
| data-weekly-open-id | ${escapeHtml(item.rep_name \|\| item.rep_email \|\| "Salesman")} ${weeklyStatusMarkup(item.status)} ${escapeHtml(item.territory \|\| "Territory no | client.js:12525 | SOURCE / PENDING |
| data-weekly-version-number | Version ${Number(version.version_number)} ${escapeHtml(formatDateTime(version.submitted_at \|\| version.created_at))} Open submitted version | client.js:12569 | SOURCE / PENDING |
| data-weekly-review-action | Mark under review | client.js:12700 | SOURCE / PENDING |
| data-weekly-review-action | Request revision | client.js:12701 | SOURCE / PENDING |
| data-weekly-review-action | Reject report | client.js:12702 | SOURCE / PENDING |
| data-weekly-review-action | Accept report | client.js:12703 | SOURCE / PENDING |
| data-weekly-open-id | ${escapeHtml(item.rep_name \|\| item.rep_email \|\| "Salesman")} ${weeklyStatusMarkup(item.status)} ${escapeHtml(item.territory \|\| "Territory no | client.js:12747 | SOURCE / PENDING |
| (class/context-bound) | Reset Filters | client.js:13119 | SOURCE / PENDING |
| data-ai-action | Prepare Me For This Meeting | client.js:13191 | SOURCE / PENDING |
| data-ai-action | What Should I Do Next? | client.js:13192 | SOURCE / PENDING |
| data-ai-action | Draft Follow-Up Email | client.js:13193 | SOURCE / PENDING |
| data-ai-action | Summarise Relationship | client.js:13194 | SOURCE / PENDING |
| data-ai-action | Flag Needs Attention | client.js:13195 | SOURCE / PENDING |
| id | Enrich with Hunter | client.js:13232 | SOURCE / PENDING |
| id | Re-enrich Company | client.js:13233 | SOURCE / PENDING |
| id | File PMR | client.js:13234 | SOURCE / PENDING |
| id | ${state.currentUser?.role === "admin" ? "Delete Lead" : "Request Delete Lead"} | client.js:13235 | SOURCE / PENDING |
| id | Update Stage | client.js:13244 | SOURCE / PENDING |
| id | Record Voice Note | client.js:13258 | SOURCE / PENDING |
| id | Add Activity | client.js:13259 | SOURCE / PENDING |
| data-place-index | Use Business | client.js:14353 | SOURCE / PENDING |
| data-ai-choice-id, data-ai-choice-value, data-ai-missing-field | ${escapeHtml(title)} ${detail ? ' ${escapeHtml(detail)} ' : ""} | client.js:15171 | SOURCE / PENDING |
| data-ai-open-lead | ${escapeHtml(record.company_name \|\| record.type \|\| "CRM activity")} ${escapeHtml([ record.next_action \|\| record.next_action_plan \|\| record.t | client.js:15186 | SOURCE / PENDING |

Additional non-button actions retained: tel/call and mailto/email links; Google Maps open/navigation; Google Calendar reminder links; LinkedIn people search; market-news/source links; intelligence PDF preview/open/download; voice/audio playback controls; form keyboard submit; row Enter/Space navigation; file input/drop-zone actions; browser history/back; native dialog Escape/cancel; outside-click dismissal where already implemented. These are SOURCE baseline / PENDING after re-skin.

## Appendix E. Indexed source footprint

These files were indexed as source/config/test/migration/reference inputs. Listing a file does not claim all of its branches were executed. Historical artifacts, data exports, secret files and node_modules were intentionally excluded. Every generated UI template and static control index above comes from the baseline source, not a screenshot or mock database.

| File | Lines | Bytes |
| --- | --- | --- |
| AGENTS.md | 32 | 3097 |
| README.md | 304 | 22679 |
| activity-dashboard-latest.css | 1954 | 54430 |
| activity-modal.css | 297 | 6197 |
| activity-readability.css | 839 | 23173 |
| activity-workflow.css | 403 | 7658 |
| admin-dashboard-clean.css | 1148 | 30225 |
| ai-sales-assistant.css | 436 | 8665 |
| bauhaus-global.css | 1597 | 42740 |
| client.js | 15584 | 727155 |
| docs/agent/README.md | 41 | 5746 |
| docs/agent/ai-safety-and-evaluation.md | 30 | 3025 |
| docs/agent/architecture.md | 36 | 5311 |
| docs/agent/baseline-and-invariants.md | 43 | 4680 |
| docs/agent/commands.md | 51 | 4566 |
| docs/agent/operations-and-release.md | 33 | 3706 |
| docs/agent/privacy-and-performance.md | 28 | 2968 |
| docs/agent/roles-and-business-rules.md | 28 | 3754 |
| enrichment.js | 441 | 15165 |
| firebase-messaging-sw.js | 18 | 576 |
| functions/agentQuery.js | 8 | 223 |
| functions/companyAiAction.js | 8 | 226 |
| functions/config/contactRules.js | 2 | 59 |
| functions/enrichCompany.js | 12 | 325 |
| functions/fetchMarketIntelligence.js | 8 | 218 |
| functions/matchIntelligenceToCompanies.js | 8 | 256 |
| functions/salespersonAiAction.js | 8 | 264 |
| index.html | 1749 | 98702 |
| lead-detail-contrast.css | 93 | 3735 |
| lead-detail-readability.css | 1228 | 36398 |
| manifest.json | 32 | 1150 |
| mobile-ui.css | 200 | 4299 |
| package.json | 24 | 6101 |
| pipeline-live-leads.css | 641 | 18069 |
| salesman-dashboard-live-leads.css | 364 | 11033 |
| salesman-dashboard-summaries.css | 822 | 23986 |
| salesmen-directory.css | 984 | 23186 |
| server.js | 7938 | 350179 |
| src/config/contactRules.js | 41 | 848 |
| src/config/integrations.js | 47 | 1738 |
| src/config/securityHeaders.js | 49 | 1291 |
| src/services/activityWorkflowService.js | 170 | 6285 |
| src/services/agentService.js | 286 | 11092 |
| src/services/aiSalesAssistantService.js | 309 | 12389 |
| src/services/companyAiActionService.js | 287 | 11507 |
| src/services/configurationAgentService.js | 150 | 5978 |
| src/services/cronSecurityService.js | 210 | 5668 |
| src/services/enrichmentService.js | 272 | 12686 |
| src/services/erpService.js | 39 | 1478 |
| src/services/leadAiSummaryService.js | 345 | 15470 |
| src/services/leadIntelligenceService.js | 873 | 44028 |
| src/services/linkedinService.js | 35 | 1273 |
| src/services/marketIntelService.js | 127 | 5156 |
| src/services/marketNewsService.js | 130 | 3830 |
| src/services/rateLimitService.js | 176 | 6446 |
| src/services/salespersonAiActionService.js | 258 | 10951 |
| src/services/voiceNoteSecurityService.js | 61 | 1960 |
| src/services/weeklyReportWorkflowService.js | 391 | 12995 |
| src/utils/fuzzyMatch.js | 72 | 2298 |
| styles.css | 26023 | 593397 |
| supabase-client.js | 293 | 9839 |
| supabase/migrations/20260602154500_create_lead_enrichment_backend.sql | 320 | 18972 |
| supabase/migrations/20260602161000_harden_shared_crm_rls.sql | 65 | 4274 |
| supabase/migrations/20260603100000_google_places_auto_enrichment.sql | 32 | 2356 |
| supabase/migrations/20260603130000_blueprint_phase1_foundation.sql | 69 | 4361 |
| supabase/migrations/20260606120000_role_scoped_salesman_access.sql | 162 | 5803 |
| supabase/migrations/20260609120000_supabase_pmrs_and_voice_storage.sql | 76 | 2826 |
| supabase/migrations/20260610100000_add_lead_stage_audit_columns.sql | 4 | 158 |
| supabase/migrations/20260610120000_add_activity_completed_at_for_overdue_banner.sql | 24 | 705 |
| supabase/migrations/20260610130000_add_lost_reason_fields.sql | 11 | 401 |
| supabase/migrations/20260610143000_add_lead_import_audit_columns.sql | 8 | 268 |
| supabase/migrations/20260612100000_phase5_external_integrations.sql | 88 | 3459 |
| supabase/migrations/20260612120000_multi_user_architecture.sql | 290 | 13026 |
| supabase/migrations/20260612130000_external_integrations_agent.sql | 44 | 2220 |
| supabase/migrations/20260612140000_one_click_ai_actions.sql | 94 | 4656 |
| supabase/migrations/20260616120000_configuration_agent_audit.sql | 87 | 2685 |
| supabase/migrations/20260617123000_add_lead_activity_purpose.sql | 6 | 191 |
| supabase/migrations/20260624120000_add_weekly_sales_reports.sql | 165 | 6317 |
| supabase/migrations/20260724120000_ai_sales_assistant.sql | 75 | 3368 |
| supabase/migrations/20260730150000_enforce_user_scoped_rls.sql | 535 | 21267 |
| supabase/migrations/20260730170000_add_durable_rate_limits.sql | 160 | 5415 |
| supabase/migrations/20260731140000_weekly_report_lifecycle.sql | 503 | 19023 |
| supabase/migrations/20260803104946_reconcile_missing_production_schema.sql | 723 | 29831 |
| supabase/migrations/20260803105000_reconcile_legacy_notifications_schema.sql | 136 | 4523 |
| supabase/migrations/20260803105004_replace_legacy_rls_policies.sql | 583 | 23073 |
| supabase/migrations/20260807170000_repair_salesman_lead_insert_policy.sql | 23 | 708 |
| supabase/migrations/20260808045702_harden_function_execution_and_search_path.sql | 58 | 2943 |
| supabase/migrations/20260810093647_lead_intelligence_reports.sql | 83 | 3739 |
| supabase/migrations/RUN_ALL_IN_SUPABASE_SQL_EDITOR.sql | 975 | 49239 |
| supabase/migrations/RUN_GRANT_APP_PRIVATE_FOR_LEADS.sql | 4 | 215 |
| supabase/migrations/RUN_IN_SUPABASE_SQL_EDITOR.sql | 244 | 9183 |
| supabase/migrations/RUN_REPAIR_EXISTING_SCHEMA_IN_SUPABASE.sql | 454 | 27094 |
| sw.js | 122 | 3328 |
| tasks-bauhaus-flat.css | 609 | 17576 |
| tasks-contrast.css | 144 | 4539 |
| tests/activity-dashboard-latest.test.js | 104 | 10704 |
| tests/activity-modal.test.js | 64 | 3136 |
| tests/activity-readability.test.js | 67 | 5378 |
| tests/activity-workflow.test.js | 119 | 4824 |
| tests/admin-dashboard-layout.test.js | 94 | 11539 |
| tests/admin-salesman-permissions.e2e.test.js | 499 | 22463 |
| tests/agent-service.test.js | 64 | 2392 |
| tests/ai-sales-assistant.test.js | 123 | 4757 |
| tests/auth-login-status.test.js | 82 | 2716 |
| tests/auth-refresh.test.js | 64 | 2808 |
| tests/company-ai-actions.test.js | 51 | 1773 |
| tests/cron-security.test.js | 179 | 6238 |
| tests/dashboard-summary-modal.test.js | 110 | 9124 |
| tests/enrichment.test.js | 152 | 5655 |
| tests/fuzzy-match.test.js | 25 | 1079 |
| tests/global-bauhaus-system.test.js | 109 | 7796 |
| tests/lead-ai-summary.test.js | 123 | 4556 |
| tests/lead-assignment-isolation.test.js | 167 | 8108 |
| tests/lead-detail-bauhaus.test.js | 83 | 7947 |
| tests/lead-intelligence-api.test.js | 351 | 26825 |
| tests/lead-intelligence-service.test.js | 196 | 9335 |
| tests/lead-intelligence-ui.test.js | 88 | 5747 |
| tests/mobile-ui.test.js | 43 | 4608 |
| tests/phase5-integrations.test.js | 58 | 2055 |
| tests/pipeline-live-leads.test.js | 70 | 7140 |
| tests/pmr-voice-note.test.js | 81 | 2854 |
| tests/production-salesman-add-lead.spec.js | 114 | 5321 |
| tests/pwa-shell.test.js | 43 | 1968 |
| tests/rate-limit-security.test.js | 112 | 4417 |
| tests/role-access.test.js | 78 | 3928 |
| tests/sales-lead-summary-auth-loading.test.js | 35 | 3585 |
| tests/salesmen-directory.test.js | 114 | 9998 |
| tests/salesperson-ai-actions.test.js | 94 | 3027 |
| tests/security-headers.test.js | 73 | 2286 |
| tests/static-assets-security.test.js | 104 | 3509 |
| tests/supabase-authorization-boundary.test.js | 239 | 9155 |
| tests/tasks-bauhaus-flat.test.js | 77 | 6018 |
| tests/voice-note-security.test.js | 158 | 4548 |
| tests/weekly-report-ui.test.js | 39 | 2066 |
| tests/weekly-report-workflow.test.js | 251 | 8737 |
| tests/weekly-report.test.js | 99 | 4403 |
| vercel.json | 89 | 5217 |
