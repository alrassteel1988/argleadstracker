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
