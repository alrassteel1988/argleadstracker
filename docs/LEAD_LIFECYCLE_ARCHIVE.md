# Lead Lifecycle and Duplicate Review

## Scope and State

Feature branch: `codex/lead-lifecycle-archive`, based on released main `0072f1f106e59bae85ad02e434e00de9e9796b4b`.
PR #76 is a staging candidate, not an approved Production release. This document does not authorize a hosted migration, deployment, or merge.
PR #69 and the root worktree are separate and unchanged by this feature.

The existing stack is a static JavaScript/PWA frontend, a Node HTTP API, and Supabase Auth/Postgres/RLS through PostgREST.
There is no ORM. Local development also supports JSON persistence.
Lead records are in `public.leads`, linked to `public.companies`. Existing related contacts, PMRs, tasks, files, and activity history remain in their current stores.

## Files Changed

- `src/services/leadLifecycleService.js`: local lifecycle, normalized duplicate matching, audit, notifications and approval rules.
- `src/services/leadLifecycleRoutes.js`: authenticated lifecycle, request/decision, archive-list, audit and duplicate-check endpoints.
- `server.js`: integration with ordinary create/edit/stage/deletion/import paths and archive visibility.
- `src/services/managementTaskService.js`: suspended archived/orphaned task behavior without changing history or deadlines.
- `client.js`, `styles.css`: role-specific actions, responsive dialogs, Archived Leads and management approval queues.
- `index.html`, `sw.js`: versioned asset references and refreshed PWA cache.
- `supabase/migrations/20261120050707_lead_lifecycle_archive.sql`: lifecycle schema and rules; applied to staging only after approval.
- `supabase/migrations/20261120063951_initial_management_lead_rls_readback.sql`: follow-up for the Admin initial-task registration read-back; applied to staging only after approval.
- `tests/lead-lifecycle.test.cjs`, `tests/lead-lifecycle-database.test.cjs`, `tests/ui/lead-lifecycle.spec.js`: focused local/synthetic coverage.
- `tests/admin-salesman-permissions.e2e.test.js`, `tests/lead-enrichment-form.test.js`: approved archive behavior and enrichment isolation regression updates.
- `tests/activity-dashboard-latest.test.js`, `tests/admin-dashboard-layout.test.js`, `tests/global-bauhaus-system.test.js`: updated cache assertions.
- `package.json`, `playwright.ui.config.js`: verification wiring and browser suite selection.
- This document: migration/configuration instructions, local evidence scope and remaining release gates.

## Confirmed Rules

- `CLOSED_NOT_INTERESTED` is displayed as Closed - Not Interested. Closing requires No requirement, Uses another supplier, Business closed, or Other. Other requires a note.
- The authenticated actor, not the assignee or browser-provided identity, is recorded as the closer.
- Close and automatic archive are transactional with their audit events and in-app notifications. Every active Admin and Salesman receives the do-not-contact message, including the closer.
- Only Admin can manually archive with a reason, restore, decide duplicate reviews, or permanently delete.
- Salesmen retain automatic archiving when explicitly selecting Closed - Not Interested, as separately confirmed by the owner. That is distinct from Request for Deletion.
- Salesmen can submit Request for Deletion for an owned active lead with Disqualified, Not interested, or Other and a supporting note. The request does not change any lead field, activity, task, reminder, or visibility. It notifies all active Admins and prevents duplicate pending submissions.
- Admin reviews deletion requests in the Archived Leads workspace. Approval soft-archives and retains the record; rejection leaves it active. Neither decision permanently deletes anything. A lifecycle audit and a requester notification record each decision.
- Archived duplicate warnings offer Request Restore. This only sends a management request; it cannot restore or issue a new-lead duplicate permit. Admin chooses the matched archived record and approves restoration to Prospect, or rejects the request. Assignment and activity history remain unchanged.
- Restore always selects Prospect (`PROSPECT` in the blueprint database, `NEW` in the application's stage aliases). It does not change the Salesman assignment.
- Tasks/reminders are hidden and suspended while archived. No task status, deadline, activity history, or prior closure metadata is erased. Restored tasks retain their original dates and can therefore already be overdue.
- Normal lead feeds exclude archived records. Admin accesses them through Archived Leads, with search, owner/status filters, and per-lead/global lifecycle audit.
- Direct lead DELETE is disabled. Approval of a legacy lead-deletion request archives instead of deleting, retaining the existing no-self-approval rule.
- Permanent deletion requires an archived row, Admin access, a reason, exact company-name confirmation, and the existing application-level Admin password check. Lifecycle audit rows have no cascading lead foreign key and survive deletion.

## Duplicate Checks

Exact normalized company name, UAE-normalized phone, or case-insensitive email matches are checked against all leads, regardless of owner or archive status.
Company normalization ignores punctuation and LLC/L.L.C/FZCO/FZE/FZ-LLC/Trading/Co/Est. Empty normalized keys never match.
The existing fuzzy-name, website, Google-place identity checks and database uniqueness constraints remain in place. No Customer Master duplicate integration was found in current main; none is invented or replaced.

Salesmen cannot override archived or other-owner matches. Request Admin Review records only the proposed identity, note, and match references, not a full unsaved lead/contact form.
Admins can restore a specifically selected old lead or approve a new registration/edit. Salesmen resubmit their original form after approval.
Own active-lead warnings retain an acknowledgement path with a reason; they do not permit overriding an additional archived/other-owner match.

Approvals are single use, bound to the requester, normalized identity, edit target, and current match fingerprint. They expire after 24 hours.
Changes to matching records invalidate a permit rather than silently approving a different duplicate. A fresh review is required in that case.
Admin overrides and review decisions are audited. Direct database inserts/identity changes enforce the same gate; `allow_duplicate` cannot bypass it.
Existing unique website/Google-place constraints are NOT relaxed by approval. When those constraints apply, restore the existing record or use the existing verified manual-entry workflow rather than importing conflicting provider identifiers.

## Migration

Apply these files in order on a new approved database:

1. `supabase/migrations/20261120050707_lead_lifecycle_archive.sql`
2. `supabase/migrations/20261120063951_initial_management_lead_rls_readback.sql`

The first file was applied to staging `grxzqxqgtksunzfhtwox` on 20 November 2026 with explicit approval after backup/schema checks. Supabase recorded it as `20261120062232_lead_lifecycle_archive`.
The approved follow-up was applied to staging on 20 November 2026 and recorded as `20261120065009_initial_management_lead_rls_readback`. Both files remain unapplied to Production.

Both files were generated with the Supabase CLI's local-only `migration new` command, then edited and exercised in disposable PGlite databases.
The first adds the archive/closure/restore columns, immutable lifecycle events, duplicate reviews, private transactional command capabilities, validated RPCs, normalized indexes, and restrictive archive policies alongside existing RLS.
The same unapplied migration also adds `lead_archive_requests` for deletion/restore approvals. Only Admin can query the full queue. Salesmen receive a restricted caller-only RPC response without candidate lead IDs or another user's requests.
It extends the existing atomic registration function without changing its normal RLS or read-back logic. The migration stops if that function differs from its reviewed baseline.
Trusted allowlisted service-role workers retain ordinary import/enrichment writes, but cannot use service access to close/archive/restore/purge.
There is no backfill or conversion of existing Lost/Dormant leads, and no deletion or rewriting of saved activities/tasks.

The follow-up replaces only `public.save_initial_management_lead(jsonb)`. The hosted Admin save exposed an `INSERT ... RETURNING` failure under the new lookup-based lead visibility policy. The RPC now generates the lead ID, inserts without lead `RETURNING`, then performs a separate RLS-checked read in the same transaction, following the already-released Salesman registration pattern. Admin checks, creator validation, stage-constraint retry, caller privileges, task/audit triggers and RLS remain unchanged. A denied read-back or failed task aborts the whole company/lead/task transaction.

Before any hosted application, the release owner must separately approve the exact project and migration, verify a fresh completed backup and schema, and coordinate writes from older builds.
After approval, run ONLY the approved file in the selected project's SQL editor or the repository's approved migration tool. Do not reapply the first file to staging, run a reset, the bundled RUN_ALL scripts, or an unreviewed set of pending migrations.
Each file runs in a transaction. A failure must roll back the entire file; do not manually skip failed statements.

Read-only post-application checks:

```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'leads'
  and column_name in ('is_archived','archived_at','archived_by','archive_reason',
    'closed_reason','closed_note','closed_by','closed_at','restored_at','restored_by');

select proname, prosecdef
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and proname in ('change_lead_lifecycle','close_edited_lead',
  'check_lead_duplicates','request_lead_duplicate_review','decide_lead_duplicate_review','restore_lead_duplicate_review',
  'request_lead_archive_review','review_lead_archive_request','my_lead_archive_requests');

select tablename, policyname, permissive
from pg_policies where schemaname='public' and policyname like 'Lifecycle%';
```

## Configuration and Verification

No new environment variable, email provider, external service, or account-role change is required. Notifications use the existing in-app notification table.
Existing Supabase URL, anon key, server-side service-role allowlist, authentication, private storage, CSP, and normal role isolation remain in force.
Never supply Production credentials to local tests.
Before an authenticated hosted Preview test, separately approve/configure exact-branch Preview overrides for `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to staging only. Keep the service-role value a Secret. Do not inherit shared Production database credentials or put credentials in code/PR descriptions. All three overrides were saved with approval for `codex/lead-lifecycle-archive` only on 20 November 2026. The owner then redeployed as Preview; the agent did not deploy.

With repository dependencies installed (`npm ci`), run:

```powershell
npm.cmd run test:lead-lifecycle
npm.cmd run verify
$env:CRM_UI_SUITE='lead-lifecycle'
$env:CRM_UI_TEST_PORT='4671'
npx.cmd playwright test --config=playwright.ui.config.js --project=admin-desktop --project=admin-mobile
```

The lifecycle browser suite creates separate synthetic Admin/Salesman sessions and uses isolated local fixture databases.
Coverage includes close reasons/notifications, archive isolation in UI/API/RLS/related PMRs and tasks, normalized duplicates, single-use review approval, restore/history preservation, orphan-company rollback, full edited-close data retention, trusted worker boundaries, and permanent-delete confirmation.
Additional request tests prove the lead is byte-for-byte unchanged while deletion approval is pending, a Salesman cannot approve or restore directly, management receives the notification, rejection leaves the lead active, and Admin-approved removal/restoration preserves all activities.
Task visibility regression coverage holds a drawer refresh open after closure: cached task rows, counts and actions stay hidden until the authorized read completes. Opening a drawer or changing lifecycle invalidates prior reads; late read/mutation responses cannot repopulate invalidated rows. A refreshed Salesman lead feed also invalidates tasks linked to records no longer visible. No task status, deadline, permissions or history is changed by this client-only invalidation.
The initial-management registration regression uses the released Admin RPC and task triggers with the archive lookup policy. It reproduces SQLSTATE `42501` before the follow-up, then verifies one company/lead/task/audit event, preserved next-working-day scheduling, Salesman/peer isolation, denied forged callers, and rollback for invalid stages, task titles/assignees, duplicate task IDs and denied read-back. No permission bypass is used.
Normal CRM verification remains required in addition to these focused tests.

## Release Gates and Boundaries

- Staging schema/RPC checks and three separate rolled-back Admin/Salesman database-role rehearsals passed. These covered closure/broadcast, archive isolation, request/restore approval, normalized duplicates, single-use permits, task/history preservation and purge/audit guards. Read-back confirmed zero rehearsal companies/leads/tasks/requests remained.
- The first hosted Preview test on commit `4e38cd3` saved one synthetic Salesman lead without a follow-up. The Admin initial-task save failed with SQLSTATE `42501`; read-back confirmed zero company/lead records for that failed Admin attempt. After the approved follow-up, hosted Admin registration on `5ef9d36` passed with one company, one Prospect lead and one linked next-working-day task. The deletion-request, approval, duplicate-warning, restoration and closure workflows also passed; existing activity/task history was retained.
- That hosted test found a transient stale Management Task display before refresh completed. This follow-up clears the task view during drawer refresh and lifecycle invalidation, with late-response guards. Fresh hosted verification of this UI fix remains required; earlier hosted results do not prove this follow-up.
- The saved synthetic Salesman lead remains in staging as `PR76 Juniper Lifecycle Test 20Nov`; no deletion or reuse of that record is part of the follow-up fix.
- Before release, rehearse the migration on the actual staging schema, run database advisors, and verify Admin/Salesman workflows on a fresh staging-only Preview, including two concurrent duplicate saves.
- Review linked private-storage policies and any environment-specific tables not present in repository migrations. Restrictive policies are added to existing foreign keys; this cannot discover undocumented JSON references.
- Archived PMR voice-note paths are denied by an additional Storage policy even to the file owner. Purge saves private path tombstones so removing a PMR cannot reopen that object's access. Previously issued signed URLs retain their existing expiration; no secret rotation is performed.
- Permanent deletion removes the lead through existing database relationships, not backups or physical storage blobs. It retains lifecycle audit and private file guards. A separate retention/physical-erasure policy is required for those stores.
- Existing saved weekly-report narratives/version snapshots and previously downloaded files are not rewritten or revoked. Current lead/task/activity feeds are filtered; historical free-text references are not automatically scrubbed.
- Existing Google-place/website uniqueness constraints can reject an intentionally duplicated provider identity even after an Admin review. Do not weaken these constraints without a separate explicit decision.
- Production migration, merge, deployment, real lead changes, and all other PRs remain outside this staging candidate. PR #76 remains draft while hosted verification is incomplete.
