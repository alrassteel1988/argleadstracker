# UI Proposal: Open Questions, Mismatches and Hold Points

## Scope

Dataset-ready verification checkpoint (23 October): current full interactive
chain PASS (48) in one `npm run test:ui` command; native Chromium zoom PASS (6,
72 rendered states) in one `npm run test:ui:zoom` command; canonical
`npm run verify` PASS. All 132 static HTML field contracts match the original
source in a focused browser check. Static identity/validation/option preservation
is not a blanket dynamic-form, provider or production-authentication pass.

New primary comparison captures: Before PASS (4), After PASS (4), 44 matching
screen pairs/88 PNGs at 1440/375 pixel widths, with hashes checked against
manifests. The focused static-contract rerun refreshed Admin desktop After and
recorded 132 fields. Source remains the same application UI as `63309f9`; no
runtime, presentation, API, database, auth, permission or calculation changed in
this checkpoint. Source readiness and matching records replace the old loading
frame as evidence, not the retained original file itself.

Files: `tests/ui/comparison.spec.js`, `tests/ui/helpers.js`,
`playwright.ui.config.js`, `package.json`, `tests/ui/README.md`,
`docs/functionality-inventory.md`, `docs/ui-proposal-acceptance.md`, and this
register. The comparison gate is capture-only and separate from the 48 workflow
checks. Exact Before command is in the UI README; After uses the same config
with `CRM_UI_SUITE=comparison`, `CRM_UI_SCREENSHOT_PHASE=after`, replay unset
and isolated ports. Additional commands: `node --check tests/ui/comparison.spec.js`,
`git diff --check` and PNG/manifest hash-width-source checks. No failures in the
current 48/6/capture runs. Separate lint/auth tasks and secondary visual/state
acceptance remain open; no push, PR, merge, deployment or production-data access.

Management-dialog checkpoint (23 October): fixed mobile submit-button overflow
and 180px-tall deletion-review search fields in shared dialog CSS. Final
`npm run test:ui:management` PASS (4) and `npm run verify` PASS. Existing audit
PASS (8) before the final queue addition; final management test covers that
addition. An earlier 12-case audit passed but logged report rate limiting, so
management now uses its own fresh fixtures rather than weakening runtime limits.
The new complete 48-check chain and final native zoom have not been run.

Before replay is fixed to the initial commit and uses allowlisted runtime bytes,
synthetic records and blocked providers. Source bytes were compared with Git;
initial setup timed out at 30 seconds and only historical setup now allows 120.
Historical Activity pointer activation was intercepted; native keyboard capture
can navigate to the lead instead of opening Details. Missing historical states
are annotated/captured as unavailable, never fabricated. Final replay PASS (4
capture/role checks) with three paired dialogs per Admin viewport; Details/Edit
remain unavailable in the historical route. Current After has all five states.
Per-run Temp manifests distinguish these valid captures from stale earlier files.
Original Before Dashboard capture was a loading frame; paired file counts alone
must not be called visual/data parity. See `ui-proposal-acceptance.md`.

Files: `crm-dialogs.css`, `sw.js`, `package.json`, `playwright.ui.config.js`,
`tests/crm-dialogs.test.js`, the three cache-version contract tests,
`tests/ui/management.spec.js`, `tests/ui/fixture-server.js`,
`tests/ui/helpers.js`, `tests/ui/README.md`, this register, the inventory and
`docs/ui-proposal-acceptance.md`. Commands: `npm run test:ui:management`,
`npm run test:ui:audit`, `npm run verify`, the exact Before replay command in
`tests/ui/README.md`, and `git diff --check`. First real regression: Create
Salesman submit exceeded dialog bounds; second: search height 180px >52px.
No auth, API, schema, permission or business-rule change. No account creation,
confirmed reassignment/deletion, production access, push, PR, merge or deployment.

Shared mobile touch checkpoint (23 October): the expanded existing audit found
undersized overdue actions/dismiss controls across both roles, a narrow Admin
collapse button, and the Intel disclosure. Fixes are limited to three shared
presentation stylesheets; no client/server behavior changed. `npm run verify`
PASS; final `npm run test:ui:audit` PASS (8, 68 rendered states). The full
migration is not yet signed off.

Changed files for this checkpoint: `crm-controls.css`, `crm-shell.css`,
`crm-record.css`, `sw.js`, `tests/crm-controls.test.js`,
`tests/crm-shell.test.js`, `tests/crm-record.test.js`,
`tests/activity-dashboard-latest.test.js`, `tests/admin-dashboard-layout.test.js`,
`tests/global-bauhaus-system.test.js`, `tests/ui/presentation-audit.js`,
`tests/ui/audit.spec.js`, `tests/ui/README.md`, this register and the inventory.
Commands: `npm run test:ui:audit` (first expanded run: 6 PASS / 2 FAIL on touch
targets), `npm run verify` (PASS), `git diff --check` (PASS after a changed-line
CRLF normalization). Screenshots/JSON/traces remain outside Git. Live synthetic
Salesman preview measured the updated banner action at 296x44px and dismiss at
44x44px. Capture: `crm-shared-touch-mobile-after.jpg` in the OS temporary folder.
No secret, production-data, database, API, permission or authentication change;
no push, PR, merge or deployment. Separate auth and lint follow-ups stay separate.

Date: 22 October 2026 (Asia/Dubai).
Baseline: `62ec92668261142e5c0fa8b3a1be91359fee9241`.
Branch: `codex/crm-ui-proposal-inventory`.
This register accompanies [functionality-inventory.md](functionality-inventory.md). It records differences, not permission to implement new behavior. The inventory commit changed documentation only; subsequent baseline work adds synthetic tests and supplied artwork, not CRM behavior.

## Questions and decisions

| ID | Observation | Decision needed / safe default | Blocks |
| --- | --- | --- | --- |
| Q-01 | Prompt names Al_Ras_Steel_CRM_Comprehensive_UI_Proposal_A4.pdf; actual attachment is Revised CRM UI Design Proposal.pdf, 57 pages. Cover says developer brief v22; internal footer says V18. | RESOLVED: owner confirmed "Use the attached revised proposal." | None |
| Q-02 | Stored stages are NEW, CONTACTED, NEGOTIATION, WON, DORMANT, LOST. Design shows Prospect, Outreach, Engaged, Sampling, Active, Dormant. | RESOLVED 23 October: use proposal display labels for existing stages; owner clarified "Instead of Lost replace it with Blocked". Preserve canonical keys, request values, closure/risk rules, reason history and sort behavior. Sampling stays omitted because no independent stored stage exists. | None for display-only mapping |
| Q-03 | Owner supplied landscape and portrait silk-white PNGs with embedded bottom logo, then Al-Ras-Steel-White-Logo.png. All three are preserved unchanged under assets/brand. | RESOLVED: use supplied artwork, preserve proportions and transparency. See assets/brand/README.md for provenance and hashes. No redraw or extraction needed. | None |
| Q-04 | Existing Playwright spec defaults to production, reads .env and creates/deletes a disposable user/lead. Existing HTTP E2E is not browser coverage. | New test:ui:baseline uses a temporary allowlisted copy of runtime files, synthetic Admin/Salesman records, no .env, no inherited provider credentials, blocked server outbound fetch, and a loopback-only server. Screenshots/traces stay outside the repository. No production UAT performed. | Full screenshot/state matrix still requires coverage |
| Q-05 | package.json has check/test/verify/build, but no lint or typecheck scripts. App is JavaScript, not TypeScript. | Owner approved adding linting as a separate task. Do not introduce that toolchain during this UI migration; use existing syntax, verification and browser gates here. | Separate linting task approved, implementation pending; no lint pass claimed |
| Q-06 | Quotes and Accounts buttons declare Pipeline destinations, but a second legacy nav handler returns them to Dashboard. Both handlers exist in the baseline; no quotes/accounts route exists. PDF pages 52-56 are Proposed. | Owner chose separate review tabs for the supplied proposal screenshots, not new modules or a routing repair. Keep the current runtime unchanged and document the existing shortcut defect. No quote builder, receivables, ERP sync or backend endpoints. | Existing shortcut workflow sign-off remains unavailable |
| Q-07 | PDF describes dedicated Companies, Today, Statuses, Director AI, recovery/coaching screens. Existing equivalents are embedded dashboard/Pipeline/lead/tool surfaces; the exact five Director AI actions are not present as a matching standalone feature set. | Style only implemented equivalents. No new screens, buttons, calculations, ranking or automation. List omitted proposed actions during per-page comparison. | Exact screen-for-screen matching where behavior is absent |
| Q-08 | Login contains Forgot password button without a handler/reset API. PDF adds Show password control, which is not implemented. | Keep existing recovery control styled without claiming it works; do not add Show/reset features within a visual-only migration. Functional password recovery needs a separate approved task. | Login functionality signoff must acknowledge existing gap |
| Q-09 | Design mentions seven activity types and no rankings; code has existing user/meta activity types, reminders/corrections/handoffs and performance/status metrics. | Keep all existing options, activity history, charts, performance and directory data. Removing them would violate the preserve-functionality rule. No modification of activity or score calculations. | Resolve design/app content difference, not a backend task |
| Q-10 | README and docs/API_AUTHORIZATION_MATRIX.md contain older territory/created-by visibility, export, user-role and endpoint descriptions. Actual leadBelongsToUser enforces current assigned_to, with name fallback only if ID absent. exportableLeadsForUser is Admin-only. /api/users uses a management guard; UI creation remains Admin-visible. Source has GET handoffs, not a standalone POST handler, and no /api/supabase-config handler was found. | Current runtime checks and passing invariants win. This UI task must not fix permissions, add missing legacy endpoints or edit migrations. Report documentary drift separately. | Permission signoff uses source/tests, not old prose |
| Q-11 | Gold #B87A00 on #FEFCFD is approximately 3.53:1. Teal #5BC0BE on white is approximately 2.11:1. Amber #FFB100 on white is approximately 1.78:1. | Use navy for normal text; use prescribed gold only for sufficiently large headings (>=24px regular, or >=18.67px bold), and amber text on navy. Teal can be decorative, not the sole essential control/focus boundary. If small gold text is mandatory, approve a darker accessible token. Never shrink text to fit. | Small text/interactive contrast |
| Q-12 | Existing icons mix letter boxes, glyphs, emoji and custom SVG. Many labels change during loading, recording, minimize and AI confirmation. | Shared controls now use 40 selected Lucide 1.61.0 SVGs as local CSS masks, with the original ISC license. No icon runtime, dependency, remote request or handler/state change. Existing SVG-bearing buttons and record cards are excluded from automatic prefixes and remain pending in their page passes. Navigation icons remain pending in the shell phase. | Full icon coverage and per-page cleanup |
| Q-13 | PDF has soft shadows/radii and explicit sidebar navy gradient, differing from earlier flat Bauhaus direction. | Latest request supersedes prior visual direction only: apply requested sidebar gradient; solid white cards/teal borders/soft radius. Do not reintroduce backdrop blur or translucent surfaces inadvertently. Preserve state colors and accessible text. | Not a business-logic conflict |
| Q-14 | PDF page 57 omits some existing features: handoff history, configuration agent/audit, bulk import, offline/sync, maps, enrichment review; other existing dialogs also lack full mockups. | Keep every existing feature, adapted to the same tokens/primitives. Do not delete code or controls simply because a PDF page is missing. | Additional comparison screens required |
| Q-15 | Email is manual mailto/editable drafts; PMR raw document URL is a link. ERP is a reference-validation stub. Push delivery is scaffolded. | No Zoho OAuth/send/replies, Drive integration, ERP module or push delivery should be added or claimed operational. Preserve configured failure/disabled states. | Not in visual scope |
| Q-16 | Screenshot requirement spans every role/screen/dialog/state, including sensitive records/files. Existing local browser session is not a complete test harness or safe synthetic dataset. | Baseline and after screenshots must use the same de-identified/synthetic fixtures at 1440x900 and 375x812. Store outside repo by default; obtain approval before sharing identifiable records. | Full visual acceptance |
| Q-17 | UI-only restriction permits markup/CSS/components, but forbids state/data-fetching changes. Native markup and template strings are used, not a component framework. | Consolidate CSS classes and presentational renderer helpers only. Preserve form names/ids/data-* hooks and dynamic re-render behavior. Stop if a markup change requires a state/API/validation/routing modification. | Per-step review gate |
| Q-18 | Existing release policy prohibits agent merges/manual deployments. User requests feature branch and small commits for this migration, not an immediate release. | Local small commits are authorized by this task. No push/PR/deploy/merge without task-specific authorization; production and merge remain human-only. | Release, not local audit |
| Q-19 | Existing unit/UI contract tests pin old color literals/CSS structure. | Review and update only obsolete presentation assertions alongside replacement visual/accessibility coverage. Do not weaken ownership, API, form validation, private-file, cache or approval protections. | Test-migration reviews |
| Q-20 | PDF sample figures, names, health classifications, counts and timings are prototype data. | Preserve real application data bindings and calculations. Never copy example values or change filtering to make screenshots resemble samples. | Every visual review |

## Display-only status mapping

| Stored value | Current display | Proposed display | Status |
| --- | --- | --- | --- |
| NEW | Prospect | Prospect | Applied from approved proposal, display only |
| CONTACTED | Outreach | Outreach | Applied from approved proposal, display only |
| NEGOTIATION | Engaged | Engaged | Applied from approved proposal, display only |
| WON | Active | Active | Applied from approved proposal, display only |
| DORMANT | Dormant | Dormant | Same display; no semantic change |
| LOST | Blocked | Blocked | Owner approved 23 October; display only, stored value remains LOST |
| No independent stored value | N/A | Sampling | Omit; do not create or infer a new stage |

Existing contact-rule aliases already map both ENGAGED and SAMPLING to NEGOTIATION, so they cannot be converted back into two truthful independent counts without changing the data model. This visual-only task does not authorize that change. Any display mapping must be applied consistently to labels/options/chart legends, while option values, API payloads, filters, calculations and exports retain their current contracts unless a separate display-only export decision is approved.

Blocked is the display name for the existing closed LOST stage, not a new
temporary hold state. Existing loss reasons, history fields and closure/risk
calculations remain. A different operational meaning requires a separate task.
Pipeline stage sorting retains the original canonical-label comparison, and
server-generated exports still receive only record IDs and existing date fields.

## Omitted proposal-only functionality

- Separate quote builder, quote creation/approval/send module.
- Customer credit/receivables/utilization or ERP-sync screen.
- New standalone Today/Companies/Statuses routes.
- New five-button Director analytics product and new dormant volume-ranking logic.
- New password reveal/reset behavior.
- New activity types, pipeline stages or changed automatic alert thresholds.
- New automatic email sending/incoming replies, Google Drive synchronization, push delivery or route optimization.

Do not hide existing counterparts just because the proposed version is out of scope.

## Inventory step outcome

Checkpoint notes below are chronological evidence, not current hold points.
Later owner decisions and completed phases supersede earlier pending notes.

- Baseline `npm run verify`: PASS, exit 0 on the baseline above.
- Lint/typecheck: no dedicated scripts.
- Preparation checkpoint: `npm run test:ui:baseline` PASS, 8 tests across both roles at 1440x900 and 375x812. Main-flow Before screenshots captured; complete state/dialog matrix and all After captures remain PENDING.
- No runtime code, theme tokens, form markup, source data, secrets, API, database or service-worker asset revision changed.
- Inventory commit: documentation only. Preparation adds the isolated test harness and three unchanged owner-supplied brand PNGs. `npm run verify` passed again. No assets are applied to runtime yet.
- Next safe step: clarify Lost presentation scope under Q-02, complete remaining Before captures, then start tokens as a small independently verified commit. Q-01 and Q-03 are resolved; Q-04 now has an isolated local test implementation.

## Foundation phase outcome

- Shared proposal tokens and the two approved backgrounds are now applied.
  The original white logo is available for the next shared-branding step.
- Existing mobile-final stylesheet ordering is preserved. Only obsolete literal
  cache-version and expanded font-request assertions were updated; no behavior
  or security assertion was removed.
- `npm run verify` and the new token/contrast/artwork checks pass.
- Final foundation browser run: PASS, all 8 Admin/Salesman desktop/mobile tests,
  including computed background and font checks.
- Main-flow After screenshots are phase evidence, not full design completion.
- Q-02 remains open. No status values, filters, labels, counts or Lost access
  were changed by this phase. It does not block unrelated presentation work.
- No new APIs, database operations, permissions, provider calls or deployment.

## Shared controls phase

- `crm-controls.css` consolidates buttons, fields, required/filled/error/disabled
  treatments, focus rings, neutral panel caps, tab states and decorative icons.
- Phone fields retain 16px text and a 44px touch-target floor. No hidden-state,
  form-name, ID, event-handler or accessibility-name contract was removed.
- `crm-icons.css` embeds a selected, licensed static subset. The icon source and
  integrity are recorded in assets/icons/README.md. No new package dependency.
- Pipeline export color assertions now require the shared secondary surface,
  not green/red file-format colors; export permission/format/data logic and all
  existing filter/sort/navigation checks remain unchanged.
- Cache version v85 includes both new public CSS assets; exact static routes
  only. License/source documentation remains non-public.
- `npm run verify` passes. Final desktop/mobile browser rerun: PASS, all 8 tests
  in 2.8 minutes, including loaded totals and control checks. No production
  verification claimed.
- Still pending: supplied logo placement, sidebar/header/mobile navigation,
  page-specific layout and icon cleanup, dialogs, full state/zoom matrix, Q-02.

## Shared shell phase

- The owner-supplied original logo is now placed on sign-in and sidebar navy
  surfaces without changing its bytes or proportions. The sidebar, topbar and
  mobile navigation now share proposal styling for both roles.
- Sign Out and Admin Create Salesman Account were relocated, not replaced:
  existing IDs, event handlers, permission guards and dialog mechanics remain.
- The only client JavaScript change is escaped title markup for the final-word
  accent. It does not alter title selection, records, routes or calculations.
- Global search, keyboard names, hidden-state rules and mobile alert count
  announcements remain intact. Navigation checks exercise existing actions.
- Extra 1152/960px layout captures are not native 125%/150% zoom evidence.
- Tests use separate fresh local fixtures for baseline and shell suites to
  avoid test-driven rate-limit contention; production protections are unchanged.
- Final `npm run verify`: PASS. Final `npm run test:ui:shell`: PASS, four
  projects in 47.1 seconds. Windows sandbox initially denied a loopback test
  connection; rerunning with approved local-server access passed both gates.
- Q-02 remains unresolved. Lost records, stage options, counts and stored
  values have not been removed. Full page/dialog migration remains in progress.

## Salesman dashboard presentation checkpoint

- Existing summary/stage cards, action cards, queues and live table now use
  proposal white/teal/navy styling. All existing sections and drill-down actions
  remain, including Lost until Q-02 is resolved. No stage-label mappings added.
- The proposal omits some currently implemented action/first-touch/loss-reason
  sections. These are retained under the task's preserve-functionality rule.
- Three metric cards stack on phones; five existing stage cards wrap into two
  columns. Full field and table data remain available, with table-only scrolling.
- A visual check found and fixed a legacy white-on-white Search places label.
  Loading-frame presentation and secondary coaching states still need their
  final migration pass; do not treat this checkpoint as full-screen completion.
- Final local gates: `npm run verify` PASS; `npm run test:ui` PASS (eight core
  flows plus four shell checks). Initial browser failure was a new test locator
  mismatch, corrected against the existing renderer without changing behavior.

## Shared data and Pipeline checkpoint

- Proposal pages 12/37 inform shared white KPI cards and white data tables.
  Current nine-column Pipeline structure and all column-header filters are
  retained instead of reducing coverage to the simpler proposal filter row.
- Shared table declarations have been consolidated out of the Salesman-specific
  layer. Stage/priority/overdue labels and thresholds remain unchanged.
- Pagination reserves space for the existing fixed AI Assistant. A passive
  toast no longer intercepts control clicks. Neither change alters workflows.
- The existing bootstrap defers query-route restoration until initial loading
  completes; the isolated loading test uses normal Pipeline navigation while
  the lead response is held. No routing logic was modified to satisfy a test.
- No production, provider, database, role or API changes. Initial legacy CSS
  remains for unconverted pages until their separate presentation passes.
- The current phone table uses horizontal scrolling to retain every existing
  field/filter. The proposal's compact phone record-card presentation remains
  part of the final responsive design pass, not a completed visual match here.
- `npm run verify` passes. Local browser coverage now includes all eight core
  flows, four shell flows and four data-surface flows. Real-provider, production
  RLS, native zoom and the complete visual-state matrix remain unverified.

## Lead Details checkpoint

- The existing AI summary column is retained even though proposal page 15
  focuses on contact/action cards. Both existing columns use the same proposal
  surfaces. The record comes first on phones; desktop retains AI left/record
  right. DOM reading order prioritizes the record without duplicating content.
- All six current tabs and original status values remain. Navigation now exposes
  aria-current without adding tablist keyboard semantics or changing routing.
- Field values retain a 15px floor; body copy is 14px. Former green/violet panel
  categories are replaced with shared teal boundaries; red/amber remain for
  health/risk/warning signals. Existing labels still communicate meaning.
- Call/Email links, note editing, AI minimize/restore, disclosures and existing
  Intel/PMR/media actions remain. No unseen proposal-only actions were added.
- Test startup waits are bounded at 15s and still require the exact synthetic
  totals. Header color assertions retry across existing async DOM replacements.
- The existing AI Minimize control is now visible on phones instead of being
  hidden by legacy responsive CSS. It uses the unchanged desktop handler.
- Full local browser regression chain: PASS, all 16 tests. An additional
  focused record-screen rerun passed all four profiles in 1.8m and covers the
  final minimized-summary width guard. `npm run verify` also passes against
  the final record styling. These are isolated synthetic checks, not production
  acceptance or proof of a complete application-wide visual migration.

## Activity checkpoint

- Proposal page 40 uses compact empty samples. Real activity rows, deletion
  requests, filters, calendar events, reminders and quick links remain present;
  the sample layout does not authorize removing existing data or actions.
- All existing activity types are retained (Q-09). No append-only/deletion,
  status, reminder, date or permission logic changed. This phase is CSS and
  static heading markup, plus tests and public-asset registration only.
- Busy calendar days use an internal scroll area instead of truncating events
  or expanding the entire page indefinitely. Long company names wrap.
- Phone filters retain the existing toggle. The original 66/34 desktop intent
  remains approximately 65/35; tablet/phone panels stack without hiding data.
- Full Activity error/deletion-review/provider states and native browser zoom
  remain in the final matrix; synthetic main-flow checks are not production UAT.
- The global Add Lead action remains the current primary header action. The
  proposal promotes Add Activity on this page; final cross-page action-hierarchy
  and icon cleanup must reconcile that presentation without moving handlers.
- Final supported verification gate passed. All 16 browser regression flows
  passed; the final Activity-only page/banner corrections then passed both
  Admin desktop/mobile profiles (1.2m). Phone owner chips now wrap normally.

## Salesmen checkpoint

- The proposal omits the current card view and places performance on a separate
  concept screen. Keep both directory views and the embedded performance
  snapshot; a new route or removing information is outside this UI-only task.
- All existing status values, rankings, counts, percentages, assignments and
  action handlers remain. Chart changes resolve presentation colors only.
- A single phone overdue-banner pattern is shared through the shell. The old
  Activity-only copy is removed without changing any warning calculations.
- Dense tables may scroll within their panel instead of shrinking text or
  removing columns/actions. This differs from the tiny prototype type but
  preserves accessible control and data sizes.
- Synthetic fixture has two salesmen; browser page-size/disabled controls are
  verified, and a VM test covers multi-page ranges with twelve rows. This does
  not claim production account counts or full live pagination acceptance.
- Verification gate and all 20 browser flows pass. Explicit menu actions then
  passed in a final four-profile team rerun (34.2s). Full provider/error/zoom and
  design-state comparison coverage remains outstanding.

## Reports checkpoint

- Preserve existing report sections, voice controls, immutable history, draft
  actions and Admin review even where proposal illustrations omit them. No
  submission, revision, acceptance, checkpoint or market-field logic changed.
- The existing required-field amber/green states remain semantic health colors.
  Specificity was corrected after the first browser run exposed neutral fill
  overriding amber; tests keep checking actual rendered colors.
- A second run exposed the fixed AI launcher covering desktop Submit. Added
  scrollable action-card clearance rather than forcing test clicks or moving
  report handlers. Both desktop flows now pass with ordinary clicks.
- Shared navy sidebar and 13px progress/audit copy remain readable in Tasks.
- Local verification and four report browser profiles pass (1.8m). Full 24-flow
  regression then passed, including the report rerun in 1.7m; provider/voice permissions, all error/rejection states,
  native zoom and full screenshot comparison are not yet verified.

## Admin Dashboard checkpoint

- Proposal page 32's Assigned Leads mini-chart is not an existing dashboard
  component. Do not add a new chart/feature or duplicate API calls. The actual
  Salesmen performance snapshot remains intact on its existing page.
- Preserve Dashboard Overview collapse, all management tools, configuration/audit,
  lower relationship/activity/status panels, market snapshot and funnel even
  where the proposal omits them. They remain below the redesigned work row.
- Existing DOM arrangement now places overdue before KPIs and Lead Action Plans
  beside intelligence. Route exit restores existing elements before the legacy
  page arranger runs; no route, role decision or stored preference is changed.
- Lower panels use natural height because the old 320px parent and 300px mobile
  child caps clipped real text after readability improvements. Expanded content
  is checked in the browser; collapse behavior remains separately verified.
- First full verification stopped at an obsolete presentation-order assertion;
  its replacement verifies the equivalent retained operational section. No
  business/security assertions were removed. Final verify passed, and all 28
  browser flows passed, including the final four dashboard profiles in 41.9s.
  The market distribution bars use decorative teal, not success green, without
  changing row order, percentages, filters or inline data-derived widths.
  Native zoom, external providers, all modal states and full design comparison
  remain pending; this checkpoint is not full migration or production approval.

## Mobile Pipeline presentation audit

- The proposal's phone card treatment now uses the existing Pipeline table rows,
  not a separate role-specific dataset or duplicate list renderer. Desktop keeps
  the nine-column table. Below 720px, each row becomes a full-width labeled card;
  all company/action/overdue/date/owner/stage/priority/territory/actions remain.
- Existing column filters and sort controls remain in a horizontally scrollable
  table-header band. This differs from the prototype's four compact filter chips
  because the working app has more filters and none may be removed or redefined.
  Record cards themselves do not require horizontal scrolling.
- Mobile Call links reuse primaryLeadContact and the existing tel-link pattern.
  No number means no Call link; nothing is invented, sent or dialed by the CRM.
  The fixture uses reserved +1 202-555-0101 only and tests never launch a call.
  Open/Call actions are left-aligned below metadata to avoid the floating AI
  launcher; card hover is one surface rather than tinted individual cells.
- Four-profile data checks pass after final styling (55.4s); canonical verify
  passes. A new clean complete browser chain passed all 32 checks, exit 0.
  No API, authorization,
  stage/overdue calculation, data model, filter, sort or pagination change.

## Login presentation audit

- Shared tokens replace the remaining public-screen legacy surface/accent values.
  Existing login fields, form submission, required states and live errors stay.
  The proposal's Show-password control is omitted because it has no implemented
  equivalent; the pre-existing recovery gap remains Q-08, not a new feature.
- The only WhatsApp reference rendered as an action was a configuration example
  supplied by the server. The UI omits that example without changing API data,
  configuration permissions, stored records or the server's proposal parser.
- Before/After artifacts have 68 matching main-flow filenames across four
  role/viewport profiles. This establishes capture coverage, not exhaustive
  pixel/contrast/state approval. Native 125%/150% zoom remains unverified.
- Final `npm run verify` and the four-profile sign-in, dashboard and dialog
  reruns passed. The full browser chain stopped on a stale eight-card assertion
  after Dormant added the ninth summary; the corrected dashboard rerun passed.
  The subsequent mobile Pipeline clean chain passed all 32 checks and clears
  that rerun gate; the full visual/state/native-zoom audit remains incomplete.

## Dialog and status-label checkpoint

- Shared native dialogs and sheets keep every existing form field, hook,
  validation, role guard, voice control, attachment limit and AI confirmation.
  Title markup uses the existing escaping helper; no raw record HTML is inserted.
- Owner approved Blocked in place of Lost. All six proposal display labels are
  mapped over existing stored stages; no new stage/alias/database field is added.
  Existing closed-stage behavior and historical loss reasons remain. Exports
  retain their server contracts; display labels do not rewrite record values.
- Browser save coverage found a pre-existing duplicate saveActivity ID in the
  legacy detail page and the modal. Tests scope to the modal; changing app IDs
  is outside this visual-only task and has not been attempted.
- Initial programmatic-focus testing did not establish keyboard visibility; real
  Tab/Shift+Tab then confirmed a conflicting shared rule overriding amber focus.
  Corrected the open-dialog selector and retained the stronger keyboard check.
- The clean expanded 32-flow regression passed, including activity save/read-back
  and raw API stage verification. Final verification also passes after the
  owner-requested Dormant tile. Real microphone/provider success, all
  import/deletion/handoff/error states and native zoom remain unverified.
- Dormant is an existing stored status, not a new database value. Its dashboard
  tile uses the same current-assignment selector as the shared popup; stage
  selectors already expose it. Previously active, now quiet is descriptive only:
  no time-based automatic stage change or new business rule is introduced.
  The final four-profile dialog rerun passed with the Dormant popup and selector
  assertions; the complete migration and production UAT remain outstanding.

## Approved Company AI Action Exposure

- Owner approved exposing existing company AI actions on active Lead Details.
  Baseline rendered these controls only in an always-hidden legacy panel.
- Overview now exposes all five existing company actions, reusing their handlers,
  endpoint, cooldown, CRM-data fallback and Flag Needs Attention confirmation.
  No provider, authorization, database or routing changes are included.
- Four role/viewport browser checks pass for visibility, 44px controls, exact
  action request payloads, real CRM-data fallback, explicit unavailable response
  and cancelling Flag Needs Attention. External AI generation remains unverified.
- Expanded presentation audit is work in progress, separate from the previously
  passing 32-flow browser baseline. Its addition is not full accessibility or
  full-route sign-off.
- Expanded audit first navigation failure: Admin desktop clicked the existing
  lead-timeline Edit control, but `#activityEditDialog` remained hidden after
  five seconds. This has not been classified as a regression or repaired.
  Partial text/contrast findings are retained outside the repository in the
  temporary presentation-audit directory for follow-up; they are not sign-off.

## Presentation Audit Follow-Up

- The activity Edit observation above was an audit locator error: the existing
  `openActivityEdit` calls `openActivityModal`, using `#activityDialog`, not the
  unused `#activityEditDialog`. The audit now opens the shared modal and checks
  that its existing activity ID is populated. No activity behavior was changed.
- Audit color compositing now accounts for approved navy gradient stops rather
  than incorrectly treating the transparent gradient base as white. Controlled
  browser fixtures still detect faint text, small text, clipping, missing icons
  and unapproved gradients. This is a limited computed-style audit, not WCAG
  certification or a substitute for visual inspection of bitmap backgrounds.
- The owner requested the supplied Accounts and Quotes proposal images in
  separate review tabs. Local file previews were queued in Codex; the in-app
  browser rejects file URLs, so no browser workaround or new app route was used.
- Quotes and Accounts still return to Dashboard because the existing generic
  nav handler runs after their quick-view handler. Baseline source contains the
  same handlers. The presentation sweep captures that actual destination only;
  it must not be described as a functional Quotes/Accounts or Pipeline check.
- Shared typography now fixes remaining small header controls, warning text,
  avatars, import steps and report/record captions. Old summary gradients are
  replaced with shared opaque surfaces, including loading cards. Closure copy
  uses Blocked while original LOST keys and reason workflows remain unchanged.
- Final phase verification: `npm run verify` PASS and `npm run test:ui:audit`
  PASS (8 checks, 68 captured role/screen states, zero computed-style findings).
  The combined 44-check UI chain has not yet been rerun after this phase.
  Native browser zoom and full before/after visual acceptance were still pending
  at that checkpoint; see the native zoom follow-up below for current evidence.

## Native Zoom Follow-Up

- `npm run test:ui:zoom` now passes six isolated Admin/Salesman cases at native
  100%, 125% and 150% page zoom, with 72 captured states and zero findings under
  the limited presentation auditor. See tests/ui/README.md for scope and method.
- The initial repeated-zoom harness shared a normal report rate-limit bucket
  and received a real 429. Each role/zoom now has its own fresh synthetic server;
  no application limit, authorization predicate or API behavior was relaxed.
- Testing found mobile Admin panel-header actions extending to approximately
  660px in a 375px viewport. A legacy column/wrap height constraint was removed
  locally so those controls stay in normal vertical flow. Body scroll width is
  now checked in addition to document width, including a controlled regression
  fixture that hides outer overflow but must still be reported.
- Native Salesman 125% zoom found two clipped section subtitles. They now wrap
  at the existing readable font size. All six native cases pass after the fix.
- A subsequent concurrent full-workflow run hit its existing 60-second deadline
  waiting for the Activity empty-filter result. The clean serial rerun is the
  release gate; no timeout or workflow assertion was weakened to hide this.
- The serial run passed all 36 functional checks and all four application-page
  sweeps, but failed two new mobile auditor-control checks: the deliberate
  overflow expanded `innerWidth` along with the page. The auditor now compares
  against layout-viewport `clientWidth`, and its control fixture declares a
  device-width viewport. This corrects a mobile false negative, not application
  behavior. Focused audit/dashboard/zoom reruns are required after this change;
  the earlier combined command's exit code remains a reported failure.
- These are isolated local checks, not production UAT, provider success, full
  WCAG certification or exhaustive visual approval. No production changes.
- Final checkpoint: `npm run verify`, `npm run test:ui:audit` (8) and
  `npm run test:ui:dashboard` (4) PASS. The original combined UI command is not
  reported as a clean pass after its control-fixture failure; all 36 functional
  checks had passed before that failure. The later Activity stage-label
  checkpoint below records the subsequently completed clean whole-chain run.
- The strengthened native-zoom rerun passed five cases but Salesman 125%
  returned to sign-in when navigating to PMR. Sanitized trace review found
  `/api/auth/me` unfinished (status -1), with preceding API requests 200 and no
  confirmed 401. An isolated rerun of that exact project passed without source
  changes. The baseline `init()` has the same broad catch that clears the session
  on startup failure. Causality is not yet established; do not call it repaired
  or hide it with authentication retries. Owner approved separate investigation.
- Focused reproduction command: `node -e 'process.env.CRM_UI_SUITE="zoom";process.env.CRM_UI_TEST_PORT="4191";require("child_process").execFileSync(process.execPath,["node_modules/playwright/cli.js","test","--config=playwright.ui.config.js","--project=salesman-desktop-zoom-125"],{stdio:"inherit"});'`.

## Approved Separate Task: JavaScript Linting

- Owner approved this follow-up on 23 October; implementation has not started.
  It is separate from the presentation migration, not a claimed lint pass.
- Inspect browser, Node/server and test environments before choosing configuration.
  Add one reproducible supported lint command using the existing JavaScript
  architecture; do not add TypeScript or change runtime module semantics.
- Exclude generated assets, temporary snapshots, archives, backups, recordings,
  uploads and private environment files. Do not read those as lint inputs.
- Record the initial findings before corrections. Keep any necessary behavior
  fixes separately scoped; do not run broad automatic rewrites or suppress
  meaningful security/correctness findings just to produce a green command.
- Acceptance: documented command, appropriate environment-specific globals,
  deterministic local/CI results, existing verification and browser workflows
  preserved. Dependency/configuration and CI changes belong to that task's
  separate reviewed commit, not this UI checkpoint.

## Activity Stage Label Checkpoint

- Recognized Activity stage badges reuse `STAGE_DISPLAY_LABELS`, including
  LOST to Blocked and NEW to Prospect. No stored field, alias, stage selector
  value, business classification, reminder rule or API payload is changed.
- Both the active Activity table and retained card renderer use that map;
  custom/unrecognized stage text remains visible unchanged. Reminder, deletion,
  completed and upcoming status precedence is preserved.
- The focused VM checks use production declarations and frozen synthetic inputs
  for Admin and Salesman. They cover all six stages, aliases, custom text,
  escaping and status precedence. The initial expected failure was `NEW !==
  Prospect`; a missing audio/transcript renderer stub in the test context was
  then corrected. `node tests/crm-activity.test.js` passes.
- Existing browser Activity coverage now asserts ten mapped row labels before
  exercising the same filters and pagination. Service-worker revision v100
  invalidates presentation assets only; API-cache exclusions remain unchanged.
- Authentication resilience and linting remain separately approved work. No
  authentication code or new lint toolchain is included in this checkpoint.
- Final `npm run test:ui` PASS: all 44 checks in one clean sequential command,
  including the new Activity row labels, unchanged workflows and the corrected
  auditor controls. Final `npm run verify` PASS, including syntax, authentication
  safeguards, unit/API/security tests, presentation contracts and build. This
  clears the prior whole-chain fixture gate, not the separately documented
  transient-startup weakness, manual proposal comparison or production UAT.
- Files in this step: `client.js`, `sw.js`, `tests/crm-activity.test.js`,
  `tests/ui/baseline.spec.js`, `tests/activity-dashboard-latest.test.js`,
  `tests/admin-dashboard-layout.test.js`, `tests/global-bauhaus-system.test.js`,
  `docs/functionality-inventory.md` and this file. No new component, route,
  dependency, authentication change or database change is included.

## Mobile Activity Touch Checkpoint

- The focused regression first failed with real undersized controls: 38px-high
  buttons and 28px-wide pagination/menu triggers. The base selector's `:is()`
  specificity overrode the intended mobile minimum. The mobile selector now
  includes the same menu branch, with 44px minimum width/height; pagination uses
  one centered existing chevron and retains original accessible names/actions.
- Focused mobile regression PASS; core browser suite PASS (8); presentation
  audit PASS (8). Tests check all rendered Activity buttons/menu triggers and
  calendar links, plus five hit-test points on keyboard-focused Next pagination.
- First broad core run: seven passed and Admin mobile hit the 60-second total
  scenario deadline at final sign-out. Trace timing put the final menu click
  59,528.62ms after the first navigation. There was no completed logout entry in
  that trace, so this is not evidence of a rejected logout. Only this expanded
  multi-route case's total budget changed to 120 seconds; all expectation limits
  and business assertions remain. The rerun passed. No auth/runtime edits.
- Matching 360x780 JPEG review captures are retained outside the repository;
  automated mobile geometry is checked at 375x812. More Actions was opened and
  hit-tested manually without submitting its deletion action. No speculative
  extra clearance offset was added: pagination was not covered by the launcher.
- Final `npm run verify` PASS, including syntax/auth safeguards, unit/API/security
  tests, UI presentation contracts and build. Current targeted browser gates are
  `npm run test:ui:baseline` (8 PASS) and `npm run test:ui:audit` (8 PASS); the full
  44-check chain last passed at the preceding vocabulary checkpoint, not rerun
  for this Activity-only CSS step. Native zoom was not rerun in this step.
- Files: `crm-activity.css`, `sw.js`, `tests/crm-activity.test.js`,
  `tests/ui/baseline.spec.js`, `tests/activity-dashboard-latest.test.js`,
  `tests/admin-dashboard-layout.test.js`, `tests/global-bauhaus-system.test.js`,
  `tests/ui/README.md`, `docs/functionality-inventory.md` and this file. No new
  dependency, route, API, role rule, schema, production access or deployment.
- Exact focused command (failed before CSS correction, passed afterward):
  `node -e 'process.env.CRM_UI_SUITE="baseline";require("child_process").execFileSync(process.execPath,["node_modules/playwright/cli.js","test","--config=playwright.ui.config.js","--project=admin-mobile","-g","sign-in validation"],{stdio:"inherit"});'`.
