# UI Proposal: Open Questions, Mismatches and Hold Points

## Scope

Date: 22 October 2026 (Asia/Dubai).
Baseline: `62ec92668261142e5c0fa8b3a1be91359fee9241`.
Branch: `codex/crm-ui-proposal-inventory`.
This register accompanies [functionality-inventory.md](functionality-inventory.md). It records differences, not permission to implement new behavior. No runtime file has changed during the inventory step.

## Questions and decisions

| ID | Observation | Decision needed / safe default | Blocks |
| --- | --- | --- | --- |
| Q-01 | Prompt names Al_Ras_Steel_CRM_Comprehensive_UI_Proposal_A4.pdf; actual attachment is Revised CRM UI Design Proposal.pdf, 57 pages. Cover says developer brief v22; internal footer says V18. | Confirm the attached revised proposal is the visual source of truth. Do not assume two differently named PDFs are identical. | Pixel-fidelity signoff |
| Q-02 | Stored stages are NEW, CONTACTED, NEGOTIATION, WON, DORMANT, LOST. Design pages 8/12/14/37/48 show Prospect, Outreach, Engaged, Sampling, Active, Dormant. Sampling has no independent stored stage, while Lost must remain visible. | Proposed display-only mapping below needs approval. Never merge Lost into Dormant, invent Sampling records, change stage values/counts, or alter filters/contact rules. Keep current labels until approved. | Stage/pill/title migration |
| Q-03 | Silk-white Al Ras Steel background and the vertical-line corporate logo are pictured in the PDF but not available as identified, approved source assets in the public static allowlist. Current login uses AR branding. Historical screenshots are not source artwork. | Supply original licensed background/logo files or confirm current assets stay pending. Do not redraw the logo, use a screenshot of it, or invent a branded silk image. | Exact background/brand match |
| Q-04 | Existing Playwright spec defaults to production, reads .env and creates/deletes a disposable user/lead. Existing HTTP E2E is not browser coverage. | Approve a local/staging synthetic fixture with isolated storage, secrets disabled, external providers mocked only at test boundaries, and test Admin/Salesman accounts. No production UAT or live customer-data screenshots. | Browser baseline and before/after screenshots |
| Q-05 | package.json has check/test/verify/build, but no lint or typecheck scripts. App is JavaScript, not TypeScript. | Use supported commands now. Owner must supply/approve additional tooling if separate lint/typecheck is mandatory; do not add a framework/compiler merely for this UI task. | Literal lint/typecheck acceptance |
| Q-06 | Quotes and Accounts buttons currently use Pipeline quick-view destinations; parseAppRoute has no quotes/accounts route. PDF pages 52-56 mark quote/account concepts Proposed. | Preserve existing shortcuts and Pipeline destination. Do not create quote builder, receivables, ERP synchronization, new routes or backend endpoints. | No blocker for styling existing shortcuts |
| Q-07 | PDF describes dedicated Companies, Today, Statuses, Director AI, recovery/coaching screens. Existing equivalents are embedded dashboard/Pipeline/lead/tool surfaces; the exact five Director AI actions are not present as a matching standalone feature set. | Style only implemented equivalents. No new screens, buttons, calculations, ranking or automation. List omitted proposed actions during per-page comparison. | Exact screen-for-screen matching where behavior is absent |
| Q-08 | Login contains Forgot password button without a handler/reset API. PDF adds Show password control, which is not implemented. | Keep existing recovery control styled without claiming it works; do not add Show/reset features within a visual-only migration. Functional password recovery needs a separate approved task. | Login functionality signoff must acknowledge existing gap |
| Q-09 | Design mentions seven activity types and no rankings; code has existing user/meta activity types, reminders/corrections/handoffs and performance/status metrics. | Keep all existing options, activity history, charts, performance and directory data. Removing them would violate the preserve-functionality rule. No modification of activity or score calculations. | Resolve design/app content difference, not a backend task |
| Q-10 | README and docs/API_AUTHORIZATION_MATRIX.md contain older territory/created-by visibility, export, user-role and endpoint descriptions. Actual leadBelongsToUser enforces current assigned_to, with name fallback only if ID absent. exportableLeadsForUser is Admin-only. /api/users uses a management guard; UI creation remains Admin-visible. Source has GET handoffs, not a standalone POST handler, and no /api/supabase-config handler was found. | Current runtime checks and passing invariants win. This UI task must not fix permissions, add missing legacy endpoints or edit migrations. Report documentary drift separately. | Permission signoff uses source/tests, not old prose |
| Q-11 | Gold #B87A00 on #FEFCFD is approximately 3.53:1. Teal #5BC0BE on white is approximately 2.11:1. Amber #FFB100 on white is approximately 1.78:1. | Use navy for normal text; use prescribed gold only for sufficiently large headings (>=24px regular, or >=18.67px bold), and amber text on navy. Teal can be decorative, not the sole essential control/focus boundary. If small gold text is mandatory, approve a darker accessible token. Never shrink text to fit. | Small text/interactive contrast |
| Q-12 | Existing icons mix letter boxes, glyphs, emoji and custom SVG; no Lucide runtime is installed. Many button labels are replaced dynamically, including loading, recording, minimize and AI confirmation states. | Use a locally bundled consistent icon set or approved existing icon helper; preserve accessible names, IDs and event targets. No remote script/CSP weakening. If a renderer logic change is needed to retain icons, stop and record it before editing logic. | Icon implementation approach |
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
- Full Playwright browser baseline and screenshot matrix: NOT RUN / blocked by Q-04 and Q-16.
- No runtime code, theme tokens, form markup, source data, secrets, API, database or service-worker asset revision changed.
- Documentation only: `docs/functionality-inventory.md` and `docs/open-questions.md`.
- Next safe step: resolve Q-01/Q-02/Q-03/Q-04, establish the browser baseline, then start tokens as a small independently verified commit.
