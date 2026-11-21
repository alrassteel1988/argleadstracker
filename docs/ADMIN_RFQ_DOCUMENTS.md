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
  picker, safe retry, task downloads, responsive layout and cache revision.
- `server.js`, `src/services/taskDocumentRoutes.js`,
  `src/services/rateLimitService.js`, `src/services/activityWorkflowService.js`:
  authenticated routes, upload throttling, integrity/type checks and JPEG support.
- The migration listed above: metadata/RPC, notifications and Storage boundaries.
- `package.json`, `playwright.ui.config.js`, `tests/task-documents.test.cjs`,
  `tests/ui/rfq-documents.spec.js`, `tests/ui/management-tasks.spec.js`,
  `tests/activity-workflow.test.js`, `tests/activity-dashboard-latest.test.js`,
  `tests/admin-dashboard-layout.test.js`, `tests/global-bauhaus-system.test.js`:
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

The SQL tests use disposable local PGlite fixtures and do not apply a hosted
migration. Browser tests use synthetic local records. Hosted Storage/RLS,
bucket MIME behavior and Admin/Salesman Preview workflows still require staging
verification after separate migration and branch-environment approval.

No hosted migration, secret, environment change, Production operation, commit,
push, PR, merge or deployment is authorized by this document. After owner
approval and backup/schema rechecks, apply only the reviewed migration through
the established project-scoped release process. Do not run a broad database push
against an environment with unrelated pending migrations. The release owner
controls merge/deployment after staging and Production readiness gates pass.
