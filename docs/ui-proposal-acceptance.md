# Revised CRM UI Proposal Acceptance Map

Authoritative reference: `Revised CRM UI Design Proposal.pdf` (57 pages), approved
by the owner. Audit date: 23 October 2026. This is a verification map, not final
visual approval or authority to add features. All runtime sources and business
rules remain those of the existing CRM. See `functionality-inventory.md` and
`open-questions.md` for the full action inventory, exceptions and decisions.

## Evidence Rules

- Automated presentation checks cover computed typography, contrast, blur,
  gradients, icons, clipping and selected mobile touch geometry. Passing them
  does not prove pixel-level similarity to the proposal.
- Functional browser suites use isolated synthetic data, no `.env`, blocked
  provider calls, and the real local authentication/authorization handlers.
- Before captures must come from baseline commit
  `62ec92668261142e5c0fa8b3a1be91359fee9241`, not current CSS with an old label.
  The optional historical replay copies only allowlisted runtime files from Git.
- Screenshots are under the OS temporary directory at
  `arg-crm-ui-screenshots/{before,after}/{role}-{desktop,mobile}/`. Desktop is
  1440x900 and mobile is 375x812. Main-page captures can be full-page; new
  management-dialog captures use the viewport so the backdrop is represented
  accurately. These private local artifacts are not committed.
- A provider that is unavailable in a synthetic fixture is not verified live.
  A documented absent feature is not a functional pass.
- Reinspection found the original Admin desktop `02-dashboard.png` was captured
  before data/user labels finished loading (zero counts and generic User).
  Existing file-pair counts therefore do not prove dataset-ready Before/After
  parity. The new `70-*` primary set supersedes those primary comparisons with
  44 validated pairs (88 PNGs), matching synthetic records and exact pixel widths.
  Both capture phases passed all four profiles. See JSON under
  `arg-crm-ui-comparison-manifests` in the OS temporary directory. Old images are
  preserved, not silently relabeled. Other original dialog/state frames still
  require revalidation rather than presumed comparability.
- The focused source-contract browser check matched all 132 static fields against
  the original HTML, including form ownership, IDs/names, validation constraints
  and stored select values. Dynamic report fields remain workflow-test scope.
- Current native-zoom command PASS (6): both roles at 100%, 125% and 150%,
  72 rendered states, with native DPR and viewport dimensions verified. This
  proves those captured presentations, not every interaction at every zoom or
  production authentication resilience.

## Page Crosswalk

| PDF pages | Proposal surface | Existing equivalent and evidence | Remaining acceptance work |
| --- | --- | --- | --- |
| 1-5 | Brief, palette, design language | Shared `crm-theme.css`, `crm-controls.css`; `test:ui:tokens` | Final visual consistency review, not just token checks |
| 6 | Sign-in | `01-login.png`; baseline sign-in and validation checks | Existing nonfunctional recovery control remains Q-08; no new password feature |
| 7, 31, 52 | Part dividers | Document navigation only | Not app screens |
| 8 | Salesman home | `02-dashboard.png`, `40-dashboard.png`, nine existing summary actions including Dormant/Blocked | Full visual approval; existing Top 3 actions/live list retained although not all shown in the PDF |
| 9 | Today dashboard | Existing Dashboard/Tasks surfaces; no standalone Today route | Document-only proposed layout, do not add a route or new calculations |
| 10-11 | Daily and neglected-account AI | Existing salesperson AI tools/fallback results; service tests | Per-action visual/state captures and provider acceptance remain incomplete |
| 12 | My Pipeline | `03-pipeline.png`, `13-pipeline-data.png`; data suite | Final reference comparison and final-source native zoom |
| 13 | Companies and health | Existing Pipeline/Lead Details, not a separate companies route | Preserve existing health calculations; no new scoring system |
| 14 | Statuses and automatic alerts | Approved display-only mappings in existing stage controls; token/dialog tests | No new Sampling stage, alert rules or status route; full label coverage review |
| 15-20 | Lead record, AI preparation/email/attention | Six `04-lead-*.png` views; `61-company-ai-actions.png`; AI dialog tests | Existing company actions exposed by owner approval; complete result/loading/error visual captures remain pending |
| 21-23 | Edit Lead steps | Three `06-lead-step-*.png` views; baseline create/edit checks | Complete optional/disclosure/error-state visual comparison |
| 24 | Duplicate check | Existing Add Lead duplicate flow; fuzzy-match/API tests | Dedicated browser duplicate-state before/after evidence still pending |
| 25-26 | Activity log and entry | Lead Activities and shared Add Activity dialog; `07-add-activity.png`, `50-add-activity.png` | No standalone Salesman Activity route. Active Lead Activities has Edit/Request Deletion, not View Details; do not manufacture that entry point |
| 27 | PMR | `04-lead-pmr.png`, `50-pmr.png`; PMR/voice security tests | Full recording/playback/provider visual-state and device UAT |
| 28 | Weekly report | `05-tasks.png`, report-suite draft/submission/revision captures | Final visual comparison, voice/device and all error states |
| 29-30 | Salesman mobile | Mobile main-flow/dialog/shell captures | Full state-by-state visual approval and hardware keyboard/touch UAT |
| 32 | Admin dashboard | `02-dashboard.png`, plans expanded and four summary captures | Keep all existing analytics/controls; secondary/error states and final visual approval |
| 33-35 | Director AI, coaching, recovery | Existing attention, database/configuration and management tools are retained | Exact proposed five-action feature set is absent; do not build new automation/ranking |
| 36 | Summary drill-down | `40-summary-*.png`; counts, search, reset, close/focus checks | Remaining filter/error/large-list visual states and final pixel comparison |
| 37 | Admin Pipeline | `03-pipeline.png`; column filters/sort/export/recovery data suite | Final reference comparison and final-source native zoom |
| 38-39 | Sales team/performance | `05-salesmen.png`, team suite list/cards/charts/actions | Full loading/error/empty visual states and reference approval |
| 40 | Admin weekly activity | `05-activity.png`, `09-calendar-minimized.png`; Activity workflow/presentation checks | Deletion-review/media edge states and final visual approval |
| 41 | Weekly review | Existing leadership Tasks review; report-suite status/version checks | All rejection/error states and final visual comparison |
| 42-43 | Admin Lead tabs | Six `04-lead-*.png` views; tab/notes/actions tests | Provider/upload/media state matrix and final visual approval |
| 44-47 | Activity/Add Lead/Places/Assistant dialogs | `07-add-activity.png`, three lead steps, `50-places.png`, `08-ai-assistant.png` | Full optional/result/confirmation/error states; no external provider or real microphone pass claimed |
| 48-51 | Admin mobile | Admin mobile captures for main pages, lead tabs and dialogs | Final-source zoom, remaining secondary states and visual approval |
| 53-54, 56 | Proposed Accounts/Quotes | Owner chose separate proposal review tabs, not runtime modules | Existing duplicate shortcut handlers documented Q-06; no ERP/quote/account workflow added |
| 55 | Proposed Places results | Existing Places search/Use Business flow is retained | Provider-results visual coverage; no new search service |
| 57 | Proposal coverage | This crosswalk plus full functionality inventory | Not a completion percentage or release sign-off |

## Additional Existing Dialogs

These are not all illustrated in the PDF, but must remain styled and usable.
The expanded audit navigates the existing Admin entry points for Activity
Details, Edit Activity from Details, empty deletion review, Create Salesman and
reassignment confirmation. It cancels without account creation, reassignment,
activity correction or deletion. Salesman cases assert management controls stay
hidden; they do not claim a Salesman Details entry point that does not exist.

Matching filenames use `62-activity-details`, `62-activity-details-edit`,
`62-deletion-review-empty`, `62-create-salesman`, and
`62-reassignment-confirmation`. Historical Before replay and final After audit
results: current management suite PASS (4), five After states per Admin profile;
historical replay PASS (4 capture/role checks), three paired states per profile.
Historical Details and Edit-from-Details were unavailable and are not counted
as pairs. See per-run JSON in the OS temporary directory under
`arg-crm-ui-management-manifests` rather than inferring provenance from filenames.
The historical Activity layout intercepts normal pointer clicks. Before replay
uses native keyboard activation for documentation, not forced clicks; current
After checks require pointer clicks. This baseline limitation is not a current
workflow pass and is not hidden by the capture process.

## Still Required Before UI Sign-Off

1. Complete reference comparison and secondary state captures, including
   duplicate lead, real Places-result equivalent, AI results/confirmations,
   recording/media, offline/outbox and pending deletion review cards.
2. Current complete interactive chain PASS (48), native zoom PASS (6), and
   canonical verification PASS. Rerun affected gates after any later UI changes.
   These do not clear the separately recorded startup-authentication weakness.
3. Update each inventory item only with evidence covering that exact action.
   Do not convert all SOURCE/PENDING entries to PASS from shared CSS checks.
4. Obtain owner review of legitimate design/app differences and responsive
   screenshots. Keep separate lint/auth follow-ups separate.
5. Release requires separate human authorization. This map authorizes no push,
   PR, merge, deployment, production data access or database operation.
