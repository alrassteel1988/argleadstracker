# Admin RFQ supporting documents

## Scope

New Admin lead registration shows an optional upload control in Step 3 only when
the initial Management Task is **Respond to Initial RFQ**. Supported files are
PDF, DOC, DOCX, PNG, JPG and JPEG, up to five files per task and 4 MB per file.
Salesmen do not receive an upload control. Existing lead registration, saved
activities, task status, deadlines, instructions and conversation history remain
unchanged.

Respond to Initial RFQ titles use the existing accessible red task color in the
Admin and Salesman Management Tasks views and task dialogs. This visual emphasis
does not change the saved priority, deadline, status or existing records.

Both task views offer authenticated supporting-document downloads. Only active
Admins and the task's currently assigned Salesman who also owns the active lead
can read them. Reassignment, task removal and lead archiving revoke Salesman
access at both the API and Storage boundaries. Admin can review archived files.
There is no new file replacement or deletion action.

## Save and retry behavior

The existing transactional company/lead/task save finishes before files upload.
File upload is a separate operation, not part of that database transaction. A
failed file upload keeps the saved lead and exposes **Retry document uploads**;
retry does not submit another lead. Stable document IDs, hashes and database
locks make repeat uploads/finalization idempotent, including a lost response.

Pending uploads are hidden from Salesmen. After a page reload, the original
uploading Admin can open Supporting documents on the saved task and retry an
incomplete reservation with the same original file. Previously selected files
that had not reached the server must be selected again; browser drafts are not
persisted. Do not register the lead again to retry files.

## Database and Storage

Local migration:
`supabase/migrations/20261121050416_management_task_rfq_documents.sql`.

It adds RLS-protected immutable document metadata, an authenticated Admin-only
prepare/finalize RPC, task-specific restrictive Storage policies and a single
Salesman notification on successful finalization. The RPC derives identity from
`auth.uid()` and the active profile; the server uses caller credentials, not a
service-role fallback. Private Storage paths and signed URLs are not returned to
the browser. Downloads verify the saved byte count and SHA-256 digest.

The migration adds the five requested MIME types to the existing private
`pmr-voice-notes` bucket's allowlist, preserving existing allowed types, bucket
privacy and size limits. The configured bucket is selected using the existing
`SUPABASE_ACTIVITY_ATTACHMENTS_BUCKET` / `SUPABASE_STORAGE_BUCKET` fallback. A
custom bucket must already be private and allow these types; this migration does
not modify custom buckets or environment settings.

File signatures, extensions, MIME types and sizes are validated. This is not an
antivirus or document-content safety scanner. No external scanning service is
configured. Saved Storage files are retained; this feature introduces no cleanup
or retention job. Existing approved permanent lead deletion is not blocked by the
new lead foreign key; document metadata is retained with a null lead reference.

## Verification and release

Implementation files:

- `client.js`, `index.html`, `management-tasks.css`, `sw.js`: role-scoped Step 3
  picker, safe retry, task downloads/private previews, responsive layout and cache revision.
- `server.js`, `src/services/taskDocumentRoutes.js`,
  `src/services/rateLimitService.js`, `src/services/activityWorkflowService.js`:
  authenticated routes, upload throttling, integrity/type checks and JPEG support.
- The migration listed above: metadata/RPC, notifications and Storage boundaries.
- `package.json`, `playwright.ui.config.js`, `tests/task-documents.test.cjs`,
  `tests/ui/rfq-documents.spec.js`, `tests/ui/management-tasks.spec.js`,
  `tests/activity-workflow.test.js`, `tests/activity-dashboard-latest.test.js`,
  `tests/admin-dashboard-layout.test.js`, `tests/global-bauhaus-system.test.js`,
  `tests/management-tasks.test.cjs`, `tests/task-remark-history.test.cjs`:
  verification integration, isolated upload fixtures, direct row selectors and
  cache-version assertions.

Run locally from this checkout:

```powershell
$env:CRM_TEST_PGLITE_MODULE='@electric-sql/pglite'
npm.cmd run test:task-documents
npm.cmd run verify
$env:CRM_UI_SUITE='management-tasks'
$env:CRM_UI_TEST_PORT='4681'
node node_modules/playwright/cli.js test --config=playwright.ui.config.js
$env:CRM_UI_SUITE='rfq-documents'
node node_modules/playwright/cli.js test --config=playwright.ui.config.js
```

The SQL tests use disposable local PGlite fixtures. Browser tests use synthetic
local records. The separately approved staging migration was applied and its
permissions/Storage rules verified. A synthetic Admin registration produced one
company, one lead, one linked task and four ready documents, each with one
Salesman notice. Current-owner reads passed; peer reads, Salesman uploads and
direct metadata edits/deletes were denied. Archive/restore access checks passed
in a rolled-back staging transaction. Both hosted roles displayed all four
files. The viewer initially returned a private-file retrieval error. Repair
`4fdfe0188683e5c74e4a0825230e0779dcb725de` passed hosted staging retrieval:
Salesman PNG and Admin JPEG previews decoded the synthetic images, and the
Salesman PDF / Admin Word downloads matched the original fixture hashes. The PDF
preview received its private blob. Screenshot review found a narrow-screen
layout problem; its approved UI-only correction passes local desktop/mobile
tests and still requires a fresh hosted visual check. Production readiness and
migration approval are not included.

No hosted migration, secret, environment change, Production operation, commit,
push, PR, merge or deployment is authorized by this document. After owner
approval and backup/schema rechecks, apply only the reviewed migration through
the established project-scoped release process. Do not run a broad database push
against an environment with unrelated pending migrations. The release owner
controls merge/deployment after staging and Production readiness gates pass.

## Private File Preview

PDF, PNG and JPEG supporting files offer View alongside Download for authorized Admins and the current assigned Salesman. View fetches bytes through the same caller-authenticated, integrity-checked endpoint. PNG/JPEG use a temporary object URL. PDFs use the bundled PDF.js canvas renderer with page navigation and zoom, not a browser PDF plugin, external viewer or public Storage URL. Closing the preview, signing out, changing account or losing task access aborts the request, destroys the PDF worker/canvas rendering and revokes temporary image URLs. Word files remain download-only. Viewing is not DRM: an authorized browser can still save already received content.

PDF.js 6.5.438 is pinned and self-hosted with upstream licenses and integrity
tests in `assets/pdfjs`. Only exact approved asset paths are served. No new npm
runtime dependency, external viewer service, CSP exception or environment setting
is required. PDF scripting/annotation actions are not executed, XFA/WASM/font-face
loading and dynamic evaluation are disabled, parsing uses a worker, previews are limited to 500 pages and
16 million canvas/image pixels. Password-protected, invalid or unsupported PDFs
show a download fallback. Original document bytes and downloads are unchanged.
See `assets/pdfjs/PROVENANCE.md` for the pinned registry integrity and update rules.

## 21 November Verification Snapshot

- Branch: `codex/admin-rfq-supporting-files`; draft PR #79.
- Pushed refresh fix: `13ecf8bc30d8d4b35068d6f4525f48d1345a26f9`.
- Pushed viewer: `b2fdabed1a54b5bef87945ae6bc7b2a1b204fc44`.
- Pushed retrieval repair: `4fdfe0188683e5c74e4a0825230e0779dcb725de`.
- Pushed stacked layout: `30593cdc490279dce35b9e861da5ae34f18b92d4`.
- All three GitHub checks passed on the viewer commit; matching Preview is Ready.
- `npm.cmd run verify` passed. Eight focused document/security/SQL tests passed.
  Four applicable desktop/mobile RFQ browser tests passed, with four deliberate
  role-specific skips. `git -c core.whitespace=cr-at-eol diff --check` passed.
- The initial restricted local run failed with localhost `EACCES`; the approved
  localhost-capable run passed. Viewer integration initially found missing
  cleanup functions in isolated VM test harnesses; these harnesses were updated
  to load the real cleanup functions, and all original guard assertions passed.
- Hosted image View returned `Supporting document is unavailable.` Storage
  metadata and byte sizes remained intact. The RFQ-only signed-path repair
  passes local verification and tests both Storage-relative and already-correct
  URLs. The owner-approved repair passed hosted retrieval on the matching Ready
  Preview; the original company/lead/task/document counts and task version,
  status, priority and deadline were unchanged.
- The repair changes only `src/services/taskDocumentRoutes.js`, its focused test
  and this report. It leaves the shared signer, permissions, caller credentials,
  redirect rejection, expiry and byte integrity checks unchanged.
- No new migration is needed for View or the retrieval repair. No Production
  operations, merge or manual deployment were performed. Production readiness,
  hosted final-layout acceptance and release-owner approval remain incomplete.
- The generic narrow-screen dialog flex row squeezed the preview header and
  body side by side. The viewer now explicitly stacks them; regression tests
  assert vertical order, full-width header and PDF content width on both viewports.
  No authentication, file-route or database behavior changes in this correction.
- Native PDF embedding remained blank in the Codex browser even with verified
  bytes. The owner approved a bundled private renderer. Local tests now parse a
  real two-page PDF, assert nonblank canvas pixels, navigate pages and zoom on
  desktop/mobile. The UI fixture allowlist explicitly copies only the new public
  runtime assets; initial missing-manifest fixture failures did not touch hosted
  environments. Full local verification includes vendor integrity and exact
  static-route/header checks. Fresh hosted canvas acceptance remains required.
- The renderer's final full `npm.cmd run verify` passed, including nine focused
  document/vendor tests. Browser coverage also checks that closing a PDF stops
  its worker. Upstream license whitespace is retained byte-for-byte; only those
  vendor license files are exempt from whitespace linting.
