# Lead Summary Document Versions

## Scope

Local feature branch `codex/lead-summary-versions`, based on released main
`b1ce02aa1931c3d9d384efc1b429981ff64286e5`. The owner subsequently authorized a
Git-only commit/push, without deployment. No hosted migration,
secret/environment change, merge or deployment is included.

`vercel.json` disables automatic deployment only for `codex/lead-summary-versions`
using `git.deploymentEnabled`. This guard remains until separately authorized
staging preparation is complete. It does not alter main/other branch behavior.
Reference: https://vercel.com/docs/project-configuration/git-configuration

The Intel tab gains a manual Lead summary document panel. It does not replace
or change the existing AI intelligence workflow. Upload/view/download works
without AI extraction, API credits or an external document viewer.
The manual summary panel loads independently while unrelated Intel/PMR requests
are still pending; a slow AI or detail request cannot hide the summary controls.

Admin can also select a Lead summary PDF in Step 3 of new-lead registration for
either New Lead Outreach or Respond to Initial RFQ. The summary is distinct from
RFQ supporting documents. The existing atomic lead/initial-task registration is
unchanged; file publication follows its successful save. A partial/lost upload
response keeps the saved lead and upload ID for retry, never repeating lead/task
registration. Basic PDF-header validation happens before registering the lead.
The task category is snapshotted before registration. RFQ files selected before
switching to Outreach remain unsubmitted; the shared summary does not cause
hidden RFQ selections to upload to the wrong task category.

Both Admin and Salesman Management Tasks show an Attachments column with the
linked lead's current summary, View and Download. This is a lead-level shared
summary, not a second file copy or a historical task instruction. Replacing the
summary in Intel updates the document surfaced on every authorized task for that
lead. Previous versions remain available only in Admin's Intel archive.

## File and Access Rules

- An active Admin can publish a PDF on an active lead. PDF filename and header
  are checked server-side. Maximum size is 4 MB, below the hosting request limit.
- An active assigned Salesman can view/download only the latest published
  version. Ownership is `assigned_to`, not uploader, creator or territory.
- Salesmen cannot upload, replace, read archived versions, inspect audit events
  or mutate document metadata. API checks and database/Storage RLS enforce this.
- Admin can view/download retained published archives, including on an archived
  lead, but must restore the lead before publishing another summary.
- Archived, reassigned or purged leads revoke Salesman access. Disabled accounts
  cannot use the new routes. Orphaned Storage objects remain inaccessible.
- Managers/Directors do not gain new manual-summary privileges through this
  feature. Their existing AI intelligence workflows are not changed.
- PDFs stay in a private bucket, with distinct immutable version keys. No public
  sharing links, overwrites, direct metadata edits or document-delete API exists.
- Retrieval uses the caller token, a short-lived private URL fetched server-side,
  an integrity hash and a final access recheck. Signed URLs/Storage keys are not
  exposed in the metadata API or browser. API responses are not cached.
- Task attachment metadata is fetched in batches of at most 100 validated task
  IDs under the caller token. Both task access and summary/lead ownership apply;
  knowing a task ID is not authorization to read another Salesman's file. UI
  batches ignore stale account/workspace responses. No attachment-query failure
  hides or changes the underlying task/status/remarks.
- The full-screen viewer uses the already bundled PDF.js renderer with its
  existing no-eval/no-XFA controls. Original bytes remain downloadable privately.
- Downloads already received by a user cannot be revoked. This is not DRM.

## Replacement and History

The model follows Salesforce Files' document/version pattern: publish a new
version, make it current and keep earlier versions. Our archive visibility is
deliberately stricter: only Admin can inspect earlier manual summaries.

Reference: https://help.salesforce.com/s/articleView?id=sf.collab_files_versioning.htm&language=en_US&type=5
History reference: https://help.salesforce.com/s/articleView?id=sf.collab_files_history.htm&language=en_US&type=5
Storage reference: https://supabase.com/docs/guides/storage/security/access-control

Each version records immutable file identity, size/hash, uploader name/ID,
creation/publication time, version number and replacement note. Admin must enter
a note when replacing an existing summary. A protected event records publish or
replace, actor, timestamp, old/new document IDs and reason.

An upload reserves a new ID, stores bytes without upsert and publishes only
after Storage size/type/owner checks. Publication locks the lead, checks the
expected current document and assignment, archives the old version and appends
the event atomically. A unique partial index permits one current version per
lead. Competing stale saves return HTTP 409 rather than silently replacing a
newer document. Lost responses retry the same ID; retries do not republish an
old version or append duplicate events. Failed uploads leave the prior current
version available.

Three months is a review interval, not an expiry. The date is clamped to the end
of the target month. The latest PDF remains available until Admin replaces it;
there is no automatic deletion, expiry, scheduled job or retention purge.

## Limits and Operational Caveats

PDF magic/MIME/size checks are not antivirus or content-safety certification.
No malware-scanning provider is configured by this feature. Only trusted Admins
should publish reviewed files. Encrypted/unrenderable/oversized-page-count PDFs
use the existing viewer's truthful error/download behavior.

Unpublished reservations and accepted bytes are retained, never silently deleted
on dialog cancellation. Twenty pending reservations per lead trigger a safe
limit; management must review them under a separately approved cleanup policy.
No retention policy or destructive cleanup is inferred. Archived versions are
retained indefinitely pending an explicit management retention decision.

The real example PDF is not included in source, tests, uploads, logs or commits.
Browser/SQL tests use synthetic files and isolated local records only.

## Migration and Configuration

Prepared locally, NOT applied to any hosted project:
`20261123122322_lead_summary_document_versions.sql`.

It creates document/event tables, indexes, caller-checked private helpers, a
security-invoker public save wrapper, SELECT-only table grants and scoped
Storage policies for the `lead-summaries/` prefix. Restrictive policies prevent
another broad uploader/owner policy from reopening those files. Existing file
prefixes, buckets, MIME lists, data and AI report tables are unchanged.

Prerequisites: the released lead lifecycle schema (including `is_archived` and
`private.lifecycle_admin()`), profiles/auth, Storage and a verified private PDF
bucket. Runtime uses the existing `SUPABASE_LEAD_INTELLIGENCE_BUCKET`, falling
back to `lead-intelligence-reports`. No new variable names or service-role access
are added. The configured bucket must exist, be private, accept PDF and permit
the 4 MB application limit. An unreadable Secret is not proof of its value.

Before staging, obtain separate commit/push and exact-branch credential setup
approval. Recheck the staging backup/schema/bucket, then obtain approval for this
exact migration before the owner applies it. Rehearse role isolation, concurrent
replacement, failed upload recovery, archive access and full-page viewing on a
fresh isolated Preview. Production needs its own backup, mapping/schema review,
migration approval and owner-controlled release. Never run a blanket migration
push against a shared/Production database. SQL Editor execution alone does not
record the Supabase migration ledger; review ledger handling separately.

## Files and Verification

- `src/services/leadSummaryDocumentRoutes.js`, `server.js`: protected metadata,
  batched task links, upload reservation/publication, history pagination and
  private byte retrieval.
- `src/services/rateLimitService.js`: existing upload-rate policy for the new POST.
- `vercel.json`: branch-only automatic deployment guard for the Git-only push.
- `client.js`, `crm-record.css`, `management-tasks.css`, `index.html`, `sw.js`:
  Step 3 upload, shared task attachment columns, summary panel, Admin publish/
  retry dialog, archive browsing, full-screen viewer and coordinated caches.
- The migration above; `tests/lead-summary-documents.test.cjs`; browser suite
  `tests/ui/lead-summary-documents.spec.js`; suite configuration, package script
  and three existing cache-contract tests.

```powershell
npm.cmd run test:lead-summary-documents
npm.cmd run verify
$env:CRM_UI_SUITE='lead-summary-documents'
$env:CRM_UI_TEST_PORT='4801'
node node_modules/playwright/cli.js test --config=playwright.ui.config.js
git -c core.whitespace=cr-at-eol diff --check
```

Initial focused SQL failure: `permission denied for table profiles` while reading
audit events in the restricted role fixture. The policy now uses the existing
protected Admin helper rather than depending on a direct profile-table read.
The next focused run passed. Initial browser full-page assertions failed with
24px desktop/16px mobile margins inherited from shared `!important` dialog rules.
The viewer now has narrowly scoped full-screen overrides; assertions remain
strict.

An intermediate browser run completed mobile cases but desktop sign-in stalled
in local fixtures while full verification ran concurrently. No authentication
guard was weakened. Subsequent browser runs are kept separate from verification.
The first combined registration run passed five cases; a desktop test shortcut
returned without opening the new lead. The test now exercises the real nested
lead URL. A later run exposed the manual summary panel waiting behind the
existing detail-loading skeleton; the panel now loads independently, with a
regression assertion. This suite allows 15 seconds for browser assertions on
local Windows fixtures, including its shared sign-in helper; runtime
authentication and access checks are unchanged. Pending summary requests and
loaded panels survive unrelated redraws only for the same active account and
authorized lead. Metadata responses explicitly use private/no-store and vary by
Authorization/Cookie; file responses and service-worker protections remain.
The registration test returns to Tasks before opening an abandoned draft on
mobile, instead of waiting on the record page's intentionally hidden Add lead
control. Sign-out must clear that draft and its selected File.

The SQL tests use one local PGlite engine with competing upload reservations.
They verify stale publication rejection and one-current-version constraints,
not a hosted two-connection concurrency or Storage service rehearsal. Those
checks remain staging gates.

Final local verification on 24 November 2026:

- `npm.cmd run verify`: exit 0 on the final feature code, including syntax/security,
  existing task/document workflows, all five summary tests and build. After the
  Git-only push authorization, `summary-verify-git-only.log` also passed, including
  the sixth test for the branch-specific no-deployment guard.
- The final browser suite: 6 passed, 6 deliberate role-inapplicable skips, exit 0
  (`summary-ui-final-scope.log`). Both desktop and mobile cover publishing,
  replacement/archive visibility, full-page PDF page controls/pixel checks,
  byte-identical download, Step 3 retry without duplicate lead/task creation,
  RFQ-to-Outreach switching, shared Task/Intel identity, role/API/cache-header
  isolation and selected-file/viewer cleanup on sign-out.
- Desktop task attachment and full-page/mobile screenshots inspected. Filename
  wrapping, View/Download controls and the PDF toolbar remain visible.
- `git -c core.whitespace=cr-at-eol diff --check`: exit 0.
- Remote main still matched the baseline above when rechecked after resuming.

The first HTTP cache-header assertion incorrectly used an unauthenticated test
client and received the expected 401. The corrected test uses the CRM's existing
authenticated request helper; no credentials, permissions or runtime guards
were weakened. Existing non-browser optional SQL fixture gaps remain subject to
the repository's baseline skip behavior; local tests are not hosted verification.

Not verified: hosted staging/Production schema, bucket mapping, uploaded example
file contents, hosted workflows, disaster recovery or real account sessions.
