# UI Proposal: Open Questions, Mismatches and Hold Points

## Scope

Date: 22 October 2026 (Asia/Dubai).
Baseline: `62ec92668261142e5c0fa8b3a1be91359fee9241`.
Branch: `codex/crm-ui-proposal-inventory`.
This register accompanies [functionality-inventory.md](functionality-inventory.md). It records differences, not permission to implement new behavior. The inventory commit changed documentation only; subsequent baseline work adds synthetic tests and supplied artwork, not CRM behavior.

## Questions and decisions

| ID | Observation | Decision needed / safe default | Blocks |
| --- | --- | --- | --- |
| Q-01 | Prompt names Al_Ras_Steel_CRM_Comprehensive_UI_Proposal_A4.pdf; actual attachment is Revised CRM UI Design Proposal.pdf, 57 pages. Cover says developer brief v22; internal footer says V18. | RESOLVED: owner confirmed "Use the attached revised proposal." | None |
| Q-02 | Stored stages are NEW, CONTACTED, NEGOTIATION, WON, DORMANT, LOST. Design shows Prospect, Outreach, Engaged, Sampling, Active, Dormant. Owner replied "remove Sampling and Lost." | Sampling can be omitted because no independent stored stage exists. Lost removal conflicts with preserving every existing feature and status; clarification requested on whether only the dashboard tile/design chip is meant. Until resolved, retain Lost records, options, counts and actions. Other display mappings below remain unapproved. | Stage/pill/title migration |
| Q-03 | Owner supplied landscape and portrait silk-white PNGs with embedded bottom logo, then Al-Ras-Steel-White-Logo.png. All three are preserved unchanged under assets/brand. | RESOLVED: use supplied artwork, preserve proportions and transparency. See assets/brand/README.md for provenance and hashes. No redraw or extraction needed. | None |
| Q-04 | Existing Playwright spec defaults to production, reads .env and creates/deletes a disposable user/lead. Existing HTTP E2E is not browser coverage. | New test:ui:baseline uses a temporary allowlisted copy of runtime files, synthetic Admin/Salesman records, no .env, no inherited provider credentials, blocked server outbound fetch, and a loopback-only server. Screenshots/traces stay outside the repository. No production UAT performed. | Full screenshot/state matrix still requires coverage |
| Q-05 | package.json has check/test/verify/build, but no lint or typecheck scripts. App is JavaScript, not TypeScript. | Use supported commands now. Owner must supply/approve additional tooling if separate lint/typecheck is mandatory; do not add a framework/compiler merely for this UI task. | Literal lint/typecheck acceptance |
| Q-06 | Quotes and Accounts buttons currently use Pipeline quick-view destinations; parseAppRoute has no quotes/accounts route. PDF pages 52-56 mark quote/account concepts Proposed. | Preserve existing shortcuts and Pipeline destination. Do not create quote builder, receivables, ERP synchronization, new routes or backend endpoints. | No blocker for styling existing shortcuts |
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

## Proposed display-only status mapping (NOT IMPLEMENTED)

| Stored value | Current display | Proposed display | Status |
| --- | --- | --- | --- |
| NEW | New | Prospect | Owner approval pending |
| CONTACTED | Contacted | Outreach | Owner approval pending |
| NEGOTIATION | Negotiation | Engaged | Owner approval pending |
| WON | Won | Active | Owner approval pending |
| DORMANT | Dormant | Dormant | No semantic change; owner acknowledgement pending |
| LOST | Lost | Lost | Must stay distinct; proposal omits it |
| No independent stored value | N/A | Sampling | Omit; do not create or infer a new stage |

Existing contact-rule aliases already map both ENGAGED and SAMPLING to NEGOTIATION, so they cannot be converted back into two truthful independent counts without changing the data model. This visual-only task does not authorize that change. Any display mapping must be applied consistently to labels/options/chart legends, while option values, API payloads, filters, calculations and exports retain their current contracts unless a separate display-only export decision is approved.

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
