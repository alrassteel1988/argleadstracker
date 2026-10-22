# CRM Functionality Inventory and UI Migration Baseline

## 1. Scope and evidence

- Inventory date: 22 October 2026 (Asia/Dubai).
- Baseline: `62ec92668261142e5c0fa8b3a1be91359fee9241` (`origin/main`, fetched before the audit).
- Branch: `codex/crm-ui-proposal-inventory`.
- The inventory commit changed documentation only. The following preparation checkpoint adds supplied brand assets and an isolated browser baseline. No re-skin, API, database, authentication, route, calculation, or production changes have been made.
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

Every screen, field and action below is **PENDING after re-skin**. The UI migration has not started. Do not turn a SOURCE result into PASS merely because a CSS assertion passed.

## 3. Baseline commands and results

| Command/check | Baseline result | Post-re-skin |
| --- | --- | --- |
| `git fetch origin main` | PASS; baseline above | PENDING |
| `npm run verify` | PASS; exit 0 before any UI edits | PENDING after each step |
| `npm run check` | PASS as part of verify; Node syntax checks | PENDING |
| `npm run test:sales-lead-summary-auth-loading` | PASS; includes refresh-session tests | PENDING |
| `npm test` | PASS; unit, API/HTTP, UI contract and security suites | PENDING |
| `npm run build` | PASS; existing build reports no asset compilation required | PENDING |
| Separate lint | NOT AVAILABLE in package.json; no substitute tool invented | BLOCKED pending owner-approved command |
| Separate TypeScript check | NOT AVAILABLE; JavaScript application, no typecheck script | N/A unless owner configures tooling separately |
| `npm run test:ui:baseline` | PASS: 8 tests across Admin/Salesman at desktop/mobile, synthetic local storage only | PENDING after styling; main flows, not every inventory item |
| Production browser UAT scripts | NOT RUN: default to production, create a user and lead, perform cleanup | Never run without separate explicit production authorization |
| Before screenshots, 1440px and 375px, both roles | Main-flow screenshots captured by isolated suite; full state/dialog matrix incomplete | After captures PENDING |
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

## 4. Existing page and route inventory

Frontend: static SPA in `index.html` and `client.js`, not React/Vue/Angular. Query views are restricted by `parseAppRoute()`; nested lead URLs retain browser history and tab state. Keep IDs, data attributes, event delegation and focus restoration stable.

| ID | Route/surface | Roles and existing content/actions | Evidence / baseline | After |
| --- | --- | --- | --- | --- |
| P-01 | `/` when signed out | Work email/password, submit, validation, live login errors, current Forgot password control | index.html loginForm; auth-login-status, auth-refresh PASS suite; recovery has no handler | PENDING |
| P-02 | `/?view=dashboard`, Admin | Dashboard Overview; four drill-down KPI cards; overdue report; Intel Overview; Director Alerts; location/sector market snapshot; funnel/comparison expand; action plans; cold relationships; interactions; pipeline health; database agent; configuration agent | render(), arrangeAdminDashboardLayout(); admin-dashboard-layout, dashboard-summary-modal PASS suite | PENDING |
| P-03 | `/?view=dashboard`, Salesman | My Leads/Overdue Calls/Due Today; pipeline including Lost; Top 3 actions; Call these next; live contact table; first touch/loss reasons; tools; daily briefing, news, portfolio/follow-up sections and summary popups | renderSalesman* functions; dashboard-summary-modal, salesperson-ai-actions PASS suite | PENDING |
| P-04 | `/?view=pipeline` | List only, KPIs, column search/filter/sort, page size/pagination, retry/refresh, lead open; Admin due-date report filter and Excel/PDF exports | renderPipeline*, pipelineVisibleLeads(); pipeline-live-leads, assignment-isolation, HTTP permissions PASS suite | PENDING |
| P-05 | `/?view=salesmen` | Management directory; KPIs, search, territory/status/stage/sort filters, List/Cards, pagination, CSV export, profile/lead modal, assign/filter-pipeline actions, performance charts | configureRoleUi()/applyView(); salesmen-directory PASS suite | PENDING |
| P-06 | `/?view=activity` | Management calendar, week navigation and Minimize/Expand, activity KPIs/log, date presets/range, salesman/type/company filters, reset, add/edit/view, deletion-review queue, reminders, quick links, pagination | Salesman access redirects to dashboard; activity-dashboard-latest, activity-workflow PASS suite | PENDING |
| P-07 | `/?view=tasks`, Salesman | Weekly report: week summary, secured orders/exceptions, expected orders/voice, problem accounts, market intel, next week plan, attestation, checkpoints, blockers, draft, submit/resubmit, history | weekly-report*, weekly-report-workflow PASS suite | PENDING |
| P-08 | `/?view=tasks`, leadership | Weekly review, selected report/version, missing submissions, date/week selection, start review, accept/reject/request revision, review notes and immutable history | renderWeeklyReviewView(); weekly-report-workflow/ui PASS suite | PENDING |
| P-09 | `/leads/:id?tab=...` | Both roles, authorized record only; company/owner/stage/territory header; back navigation; Overview, Activities, PMR, Reminders, Intel, Notes | leadRouteUrl()/applyRouteState(); lead-detail-bauhaus and related suites PASS | PENDING |
| P-10 | Lead Overview | Snapshot, contacts, commercial/additional/secondary fields, health, call/email, log/edit, enrichment review/field apply, LinkedIn search, AI summary, one-click company actions, attention flags | drawerOverviewMarkup and renderDetail; lead-ai-summary, company-ai-actions PASS suite | PENDING |
| P-11 | Lead Activities | Timeline/structured activity, view/edit/correction/delete-request, attachments, protected audio, quote reference | activity-modal/workflow, pmr-voice-note, voice-note-security PASS suite | PENDING |
| P-12 | Lead PMR | File/report display, meeting/activity linkage, transcript/recording, structured fields | pmr-voice-note and role-access PASS suite | PENDING |
| P-13 | Lead Reminders | Add, complete, reschedule, note, calendar links, overdue/upcoming display | reminderCard(), follow-up handlers; activity-workflow PASS suite, complete browser path NOT RUN | PENDING |
| P-14 | Lead Intel | Report/job state; generate/refresh/retry; PDF upload/preview/open/download; source information and prior-report safety | lead-intelligence-service/api/ui PASS suite | PENDING |
| P-15 | Lead Notes | Edit and save existing notes | drawerNotesMarkup(), API PATCH; SOURCE | PENDING |
| P-16 | Quotes navigation | Existing shortcut opens Pipeline; no standalone quote route, builder, approval, sending or quotation CRUD endpoint | data-quick-view; parseAppRoute(); N/A separate module | PENDING shortcut only |
| P-17 | Accounts navigation | Existing shortcut opens Pipeline; no standalone receivables/credit/utilization module | data-quick-view; N/A standalone module | PENDING shortcut only |
| P-18 | Search Places | Dialog with keyword/location, results, Use Business into Add Lead, enrichment/duplicate review | placesForm and /api/places/search; enrichment PASS suite | PENDING |
| P-19 | Mobile Home/Leads/Log/Map/Alerts | Bottom tabs; raised Log opens Quick Log; Map dialog/list/external navigation; Alerts opens pending changes (not a new notification inbox); sidebar drawer and backdrops | initPwaShell(), nav handlers; pwa-shell/mobile-ui PASS suite | PENDING |
| P-20 | Install/update/offline surfaces | Install banner, update/refresh, sync status, IndexedDB pending items, retry/sync now, toast/error/loading/empty states | sw.js and outbox handlers; pwa-shell/static-assets-security PASS suite | PENDING |

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
