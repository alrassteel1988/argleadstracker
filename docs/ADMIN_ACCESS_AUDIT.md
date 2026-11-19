# Admin Access and Change Audit

## Scope and Acceptance

The shared active `admin` role is audited; no email-specific rules or extra permissions
are introduced. This applies to Glory and the three newly approved Admins, and to
future accounts granted that role. Existing record visibility and RLS stay unchanged.

- Record CRM sign-ins/sign-outs, session refresh, API reads, exports/downloads,
  denied access, and write attempts/results under a server-generated request ID.
- Record committed Admin changes to existing public CRM base tables in the same
  transaction as the mutation, including embedded activity edits on a lead.
- Keep the verified actor ID and database display-name snapshot independently of
  the current lead owner or original activity author.
- Permit active Admins to read a bounded audit page, but never insert, update,
  delete or truncate events through their CRM credentials. Salespeople, inactive
  Admins, Managers and Directors cannot read this new audit.
- Preserve existing detailed task, handoff, PMR and activity histories. Do not
  infer or backfill historical actors.

## Data Minimization

Access events contain IDs, database actor name/role, database timestamp, normalized
route, method, action, result/status and request ID. A failed sign-in is not proof
of identity: its actor is null and its claimed account is represented only by an
HMAC using the existing server-side rate-limit hashing secret. Denied authenticated
requests retain their verified actor, including non-Admin denials.

Never store request/response bodies, query strings, IP addresses, passwords, tokens,
signed URLs, company names, contact details, remarks, transcripts or file contents
in this audit. Change events list changed field names only, excluding credential
fields. Detailed before/after content is not copied into a second audit store.

No automatic purge is introduced. Retention, independent archival, alert ownership
and access review frequency require management decisions before claiming compliance.

## Backend Design

`adminAuditService.js` uses request-local async context. The identity is set only
after the existing authentication/profile validation; caller headers/body cannot
select the audit actor. Each Admin request records an attempt before business work
and awaits its result event before releasing response data, downloads or redirects.
Failures never fall back to console-only logging. Concurrent requests keep separate
identities and traces.

`private.admin_audit_events` is RLS-enabled with no direct CRM grants. The service
credential has only an allowlisted application path to the access-event writer,
which rejects extra JSON fields and resolves names/roles from profiles. Normal
business REST requests retain the caller JWT. The private change trigger reads
`auth.uid()`; it accepts server attribution headers only for service-role calls.
The trigger does not replace `created_by`, activity authors or ownership rules.

Private SECURITY DEFINER helpers have fixed `pg_catalog` search paths and explicit
execution revocations. Public wrappers are SECURITY INVOKER. Mutation/truncate
guards reject attempts to alter stored events, including through a privileged SQL
session unless its owner deliberately changes the protection itself.

`GET /api/admin/audit-events?limit=50` reads newest first, up to 100 events. Continue
with the last row's ISO `at` and UUID `id` as `before` and `before_id`. Database RPC
`list_admin_audit_events` independently validates active Admin status and pagination.
Reads of the audit endpoint are themselves audited. No new screen is included.

### Failure Semantics

An unavailable attempt writer blocks the request before business work. A database
change-audit insertion failure rolls back the business mutation. Access-result
recording is a separate transaction: if it fails after a write committed, the server
returns 503 with `audit_unavailable`, releases no protected response, and explicitly
warns that a write may already have committed. Reload/reconcile before retrying;
do not treat this response as proof that the business action rolled back. The prior
attempt and transactional change history remain available. A process termination
can similarly leave an attempt without a result; it must not be interpreted as success.

## Coverage Boundaries

- A read event proves that an authorized API response was prepared for release,
  not that a human read it or that the network transfer completed. File redirects
  record issuance, not every later use of a short-lived signed URL.
- Online lead-detail loading already requests lead-scoped PMR/intelligence/handoff
  data, so those reads carry the lead ID. Collection reads have no single record ID.
  Client-only cached/offline navigation is not separately observed.
- Direct Supabase Auth/Data/Storage traffic, dashboard actions, database-owner
  maintenance and Vercel access require their platform audit logs. CRM request
  auditing does not claim to replace those logs. In particular this migration
  does not add triggers to managed Auth or Storage schemas or record past grants.
- The change trigger covers non-extension public base tables present when the
  migration runs. Partition parents propagate it to partitions. Future table
  migrations must install the same trigger; new tables are not silently auto-added.
- Cron/system writes without an authenticated Admin are not falsely attributed to
  a person. Admin-triggered service-role REST writes carry verified attribution.
- Existing specialized audit tables and protected files keep their current access
  contracts. This is not a cryptographic or externally immutable audit against a
  database owner who can replace functions/triggers.
- The local JSON fallback retains synthetic access/change events for development;
  it is not a substitute for Supabase durability or a multi-process audit service.

## Verification and Release Gates

Run on a clean, isolated checkout with a disposable PGlite module:

```powershell
$env:CRM_TEST_PGLITE_MODULE = '<absolute-path-to-installed-pglite>'
npm run test:admin-audit
npm run test:management-tasks
npm run verify
git -c core.whitespace=cr-at-eol diff --check
```

Tests cover four Admin identities, failed and successful logins, logouts, forbidden
audit reads, privacy, concurrent request isolation, pagination, trusted service
attribution, append-only protection, rollback on audit failure, export suppression
on result-writer failure, self-demotion attribution and combined task resolution.
Database tests are skipped unless `CRM_TEST_PGLITE_MODULE` is set; a default CI pass
without that module is not evidence of migration execution.

Migration: `20261118081602_admin_access_and_change_audit.sql`. It is add-only and
does not change business records or backfill. Review and explicitly authorize its
application to staging first, recheck backup, then verify a staging-only Preview
with separate Admin/Salesman sessions, the actual PostgREST wrappers and failure
behavior. Inspect advisors, permissions, latency and event volume. No Production
application, environment change, merge, deployment or new synthetic hosted record
creation is authorized by preparing this code.

Before Production, separately approve the migration after staging passes and a
fresh backup check. Coordinate migration then application release: the new build
fails closed when its audit RPC is missing. Reverting only the application leaves
database change auditing in place but removes the new access audit; it is not an
equivalent audited rollback. Do not remove audit tables or history as a rollback.
Require management approval of the coverage boundaries, retention and operational
monitoring before describing this as comprehensive compliance-grade auditing.

## Implementation Evidence (18 November 2026)

The initial implementation was local on `codex/admin-access-audit`, based on
`41a8a75c26725be16aa3a57ea23ef3dba79c2a2d`. PR #69 was not changed or
incorporated. No hosted database, real task, lead or account was modified during
that local implementation. On 18 November the owner authorized a separate
commit/push/PR and explicitly approved applying this migration and synthetic
tests in staging `grxzqxqgtksunzfhtwox` only. Production remains out of scope.
The PR records the published commit and subsequent staging evidence separately.

Files changed: `server.js`, `supabase-client.js`, `package.json`, this document,
`src/services/adminAuditService.js`, the migration named above,
`tests/admin-audit-api.test.cjs`, `tests/admin-audit-database.test.cjs`,
`tests/lead-reassignment-api.test.js`, and `tests/management-tasks.test.cjs`.
No browser assets changed; no service-worker revision is needed.

Baseline and final `npm run verify` passed using
`CRM_TEST_PGLITE_MODULE` resolved to the existing sibling worktree's
`../activity-edit-governance/node_modules/@electric-sql/pglite`.
`npm run test:admin-audit` passed five tests with zero skips;
`npm run test:management-tasks` passed five tests with zero skips;
`git -c core.whitespace=cr-at-eol diff --check` passed.

Initial verification hit sandbox `connect EACCES 127.0.0.1`; rerunning with local
loopback permission passed the baseline. The first changed-suite failure was
`tests/lead-reassignment-api.test.js:123`, `503 !== 403`, because that isolated
mock lacked the new service audit writer. Its mock now asserts the exact
allowlisted operation/resource/method; authorization assertions remain unchanged.
The added combined-migration test initially counted unrelated synthetic task
creations (`3 !== 1`); its assertion now counts only the resolved task's events.
The final complete suite passed after both test-harness corrections.

Not verified during local implementation: actual hosted Supabase/PostgREST execution, current hosted schema,
staging/Production advisors, remote role sessions, browser Preview, load/latency,
retention operations, restore or production rollout. Remote credentials were not
read. A local CLI-generated migration is not an applied migration. GitHub CLI
initially reported invalid local authentication. Before publication, current
remote main was fetched (zero divergence), GitHub authentication was revalidated,
and `npm run verify` passed again with the isolated database module enabled.
