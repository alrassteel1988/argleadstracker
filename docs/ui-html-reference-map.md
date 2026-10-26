# HTML Reference to CRM Screen Map

Release correction (24 October): LOST is now truthfully labelled Lost, not
Blocked. Only the eight owner-selected Lost records were changed to Outreach;
the backup stays private. Distinct Block behavior remains unimplemented and
must not be inferred from the reference artwork or earlier checkpoint notes.

Latest override (24 October): outline icons are required beside sidebar labels
and actions. Sampling is omitted; historical LOST belongs under Outreach and a
new independent stored Block status is planned. Older text-only-menu and Blocked
flag notes below are historical. The status transition is a release hold, not a
completed migration. Online AI pages precede the separate offline-security phase.


The owner supplied `Al_Ras_Steel_CRM_UI_HTML.zip` on 23 October 2026 and requested
that its matching HTML files guide layout, spacing, colors and icons instead of
relying on PDF images alone. ZIP SHA-256:
`2f5c5569ac1631acadd4051a1dddb2b16e3e91c7b7cf0b96ca34db396e78fc65`.
There are 96 HTML screens plus the gallery index and README. The archive remains
unchanged; references are inspected in a private temporary folder, not shipped
as application pages or substituted for real CRM records.

`_D` is the desktop reference; `_M` is the mobile reference. The package declares
1440px desktop and 390px mobile. Application checks remain at 1440px and 375px;
fixed 390px prototype overflow is recorded rather than copied into the app.
Prefer V18 when both versions exist. V17-only screens remain relevant where the
existing app has an equivalent. Explicit owner corrections override prototype
details, including 14px card/10px button radii, opaque white inputs, one accent
word, navy dialog caps, and Blocked as a separate flag.

Shared styling checkpoint: 14px cards/dialogs, 10px controls, white fields,
232px desktop sidebar, text-only menu and rounded active pill are implemented.
The active fill is an opaque amber/navy tint for consistent contrast rather
than layering the prototype's alpha fill over the gradient. Required-state
borders/markers remain; the newer white-input requirement replaces tinted
field fills. These shared changes do not imply that every screen's spacing,
status treatment, title accent or header structure has been matched yet.

## File Families

Names below include both D/M files unless a specific filename is given. All
files are under the archive's `screens/` directory.

| Reference file family | Existing CRM destination | Scope or difference |
| --- | --- | --- |
| `Main.html`, `Mobile.html` | Sign-in, `#authScreen` / `#loginForm` | Preserve authentication/reset flow and field contracts |
| `SalesDesktop_V18.html`, `SalesMobile_V18.html` | Salesman `/?view=dashboard`, simplified dashboard | Primary Home layout |
| `SalesDash_D_V18.html`, `SalesDash_M_V18.html` | Existing Salesman dashboard queues, live list and drill-downs | Today design, not a new route; V17 versions are superseded aliases |
| `SalesMenu_M_V18.html` | Salesman mobile `#mobileSidebar` | Existing navigation/actions only |
| `SalesPipeline_*_V18.html` | Salesman `/?view=pipeline`, `#pipelineView` / `#leadList` | Keep caller-scoped records, filters, sorting and exports |
| `SalesLead_D_V18.html`, `SalesLeadIcons_M_V18.html` | Salesman `/leads/:id`, `#leadDetailView` | Six existing tabs; V17 copies are older aliases |
| `SalesWeekly_*_V18.html` | Salesman `/?view=tasks`, `#tasksView` | Weekly authoring, draft, submit, voice and history |
| `AdminDesktop_V18.html`, `AdminMobile_V18.html` | Admin `/?view=dashboard` | Preserve all existing totals and management controls |
| `AdminMenu_M_V18.html` | Admin mobile `#mobileSidebar` | Role-specific entries remain permission controlled |
| `AdminPipeline_*_V18.html` | Admin `/?view=pipeline` | Same shared lead implementation, Admin-specific columns |
| `AdminSalesmen_*_V18.html` | Admin `/?view=salesmen`, directory | Existing list/cards/filter/export/actions |
| `AdminPerformance_*_V18.html` | Performance snapshot on Salesmen page | No independent performance route added |
| `AdminActivity_*_V18.html` | Admin `/?view=activity` | Weekly calendar, log, reminders and filters |
| `AdminWeekly_*_V18.html` | Admin `/?view=tasks` | Existing report selection/review/revision/acceptance |
| `AdminLead_*_V18.html` | Admin `/leads/:id?tab=overview` | Shared Lead Details shell/Overview |
| `AdminLeadActivities_*_V18.html` | Admin Lead `tab=activities` | Existing log/edit/deletion-request behavior |
| `AdminLeadPMR_*_V18.html` | Admin Lead `tab=pmr` | Existing PMR records/media |
| `AdminLeadReminders_*_V18.html` | Admin Lead `tab=reminders` | Existing reminder actions |
| `AdminLeadIntel_*_V18.html` | Admin Lead `tab=intel` | Preserve PDF parsing, current report and protected access |
| `AdminLeadNotes_*_V18.html` | Admin Lead `tab=notes` | Existing notes and audit behavior |
| `DlgAddLead_*_V18.html` | Shared `#leadDialog` | Keep all existing fields, validation and steps |
| `EditLead1_*_V17.html` | Lead dialog, first step | Existing company/contact fields |
| `EditLead2_*_V17.html` | Lead dialog, second step | Existing commercial/details fields |
| `EditLead3_*_V17.html` | Lead dialog, final step | Existing review/save fields and actions |
| `Duplicate_*_V17.html` | Existing Add Lead duplicate warning | No change to fuzzy matching or save rules |
| `DlgAddActivity_*_V18.html` | Shared `#activityDialog` | Keep attachments, next action and voice behavior |
| `ActLog_*_V17.html` | Lead Activities and Admin log | No separate Salesman Activity route added |
| `LogActivity_*_V17.html` | Existing activity-entry/correction dialog | Presentation equivalent, not another workflow |
| `PmrFile_*_V17.html` | Shared `#pmrDialog` | Existing PMR form and voice-note actions |
| `DlgSearchPlaces_*_V18.html` | Shared `#placesDialog` | Existing provider/query/territory behavior |
| `PlacesResults_*_V18.html` | Places dialog results / Use Business | Preserve provider attribution and lead prefill |
| `DlgAssistant_*_V18.html` | Shared `#aiAssistantDialog` | Existing interpretation/preview/confirm tools only |
| `DlgSummary_*_V18.html` | Shared `#summaryCardDetailsDialog` | All applicable totals/filters/pagination and detail navigation |
| `AiPrepare_*_V17.html` | `?view=meeting-prep`, existing company prepare action | New navigation reuses `#aiActionDialog`; no new AI capability |
| `AiEmail_*_V17.html` | `?view=draft-email`, existing email action | New navigation, existing manual mail-app send; no new email integration |
| `AiCompany_*_V17.html` | Existing company AI actions / relationship summary | Existing five approved actions |
| `AiFlag_*_V17.html` | Existing `#flagAttentionDialog` | Not an authorization to submit a flag |
| `AiHome_*_V17.html` | `?view=ai-actions` and `?view=focus`, existing company/portfolio AI functions | Online workspace added under 24 October feature authorization; no new ranking model |
| `AiNeglect_*_V17.html` | `?view=neglected`, existing salesperson neglected action | Dedicated entry point reuses contact-gap rules; no new recovery algorithm |
| `AiDormant_*_V17.html` | Existing dormant records/actions | New recovery automation is absent and not invented |
| `AiCoaching_*_V17.html` | Existing management/attention tools where equivalent | Exact proposed coaching workflow is absent; review-only otherwise |
| `AiDirector_*_V17.html` | Existing Admin AI/attention tools where equivalent | Preserve absent-feature gap, do not create five proposed tools |
| `Health_*_V17.html` | Existing Pipeline/company relationship data | No independent health page/calculation added |
| `Record_*_V17.html` | Existing Lead Details / account summary | Reuse current detail route, fields and tabs |
| `Statuses_*_V17.html` | Shared status display/filter/column presentation | Not a new route; Sampling/storage and LOST migration require separate reconciliation |
| `Accounts_*_V18.html` | Separate proposal review only | No account/credit/ERP module authorized |
| `Quotes_*_V18.html` | Separate proposal review only | No pricing/numbering/quotation backend authorized |

## Ordered Corrections

1. Tasks containment and Assistant overlap: reproduced with long synthetic
   company names; targeted fix and workflow verification in progress.
2. Generated/AI status wording: pending.
3. Six statuses including Sampling; Blocked separate; Status headings: pending.
   Owner requests existing LOST records become CONTACTED/Outreach. No live
   records have been modified and no migration has been applied.
4. All dialog caps navy: pending full audit.
5. Meaningful sort/pagination icons only: pending.
6. Untruncated filters, real date controls and priority semantics: pending.
7. Exactly one nonnumeric gold-italic accent word per title/card heading: pending.
8. Shared radii, white fields, text-only menu/amber active pill and Dashboard-only
   soft-red banner: pending.

## Rendering and Comparison

Use the existing Playwright installation, with page scripts disabled and network
limited to embedded assets and the existing font provider:

```powershell
$env:CRM_UI_REFERENCE_ROOT = '<private extracted reference folder>'
node scripts/capture-ui-html-references.js SalesWeekly_D_V18.html SalesWeekly_M_V18.html AdminWeekly_D_V18.html AdminWeekly_M_V18.html
```

Screenshots and source hashes go to the OS temporary directory under
`arg-crm-html-reference-captures`. The supplied HTML is not modified to make an
app comparison pass. App captures use synthetic data and are kept separately.
Per-screen comparisons must list remaining differences; matching colors alone
is not visual acceptance. The initial Tasks comparison is the first entry to
complete, followed by the owner's ordered corrections above.
