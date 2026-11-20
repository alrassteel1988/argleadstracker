# Task conversation and completed-task follow-up

## Scope

Branch: `codex/task-conversation-followup`, based on released main
`58b004e93d18364248fd19e0b6419f26bb746c8e` (PR #77).
This feature is separate from PR #69. Publication and staging approval do not
authorize a Production migration, merge or manual deployment.

- Admin can append a Management note to an active or completed assignment.
- Only its current, active Salesman receives the in-CRM note notification.
- A Salesman can plan a follow-up from a completed task linked to their active lead.
- The follow-up is a separate Reminder Activity with an explicit action and date,
  linked to both the task and its immutable conversation entry.
- Original instructions, completion date, deadline and remarks remain unchanged.
- Existing lead activities and independent next-action fields are preserved.
- A follow-up notification reaches active Admins. These are CRM notifications,
  not email, SMS or external-calendar delivery.
- Removed, archived, unavailable or reassigned work cannot accept new entries.
- Existing task history remains append-only; there are no edit/delete controls.

## Files

- `src/services/managementTaskService.js`: validation and local transactional save.
- `server.js`: caller-JWT RPC routing and recipient/current-task-scoped notices.
- `client.js`, `management-tasks.css`, `index.html`, `sw.js`: conversation UI,
  deliberate follow-up form, notifications and cache rotation.
- `supabase/migrations/20261120104635_management_task_conversation_followup.sql`:
  two remark types, nullable Activity linkage, unique request IDs, restrictive
  note visibility and authenticated conversation writer.
- `tests/task-conversation.test.cjs`, `tests/task-remark-history-api.test.cjs`:
  role, RLS, append-only, archive/reassignment, atomicity and retry coverage.
- `tests/ui/task-conversation.spec.js`: cross-role desktop/mobile workflow,
  including a successful save whose response is interrupted before retry.
- `tests/management-tasks.test.cjs`: mock the new recipient-notice read while
  retaining the stale-response assertions.
- `tests/activity-dashboard-latest.test.js`, `tests/admin-dashboard-layout.test.js`,
  `tests/global-bauhaus-system.test.js`: updated cache-revision contracts.
- `package.json`, `playwright.ui.config.js`: verification entry points.

## Local Verification

Run from this feature worktree in PowerShell:

```powershell
npm.cmd ci
$env:CRM_TEST_PGLITE_MODULE='@electric-sql/pglite'
npm.cmd run verify
$env:CRM_UI_SUITE='task-conversation'
$env:CRM_UI_TEST_PORT='4279'
node node_modules/playwright/cli.js test --config=playwright.ui.config.js --project=admin-desktop --project=admin-mobile
$env:CRM_UI_SUITE='management-tasks'
$env:CRM_UI_TEST_PORT='4379'
node node_modules/playwright/cli.js test --config=playwright.ui.config.js --project=admin-desktop --project=admin-mobile
```

Use disposable local fixtures only. No environment credentials are needed.
The SQL test runs the actual task migrations, creation-history guard and relevant
released archive helper/policies; it does not substitute for hosted acceptance.

Verified locally on 20 November 2026:

- Full `npm.cmd run verify` passed with the optional PGlite fixtures enabled.
- New task-conversation desktop/mobile cross-role workflow: 2 passed.
- Existing Admin task workflow suite: 8 passed; 2 Salesman-only role skips.
- Those Salesman-only registration cases ran separately: 2 passed.
- CRLF-aware `git diff --check` passed.
- Desktop and mobile screenshots were visually inspected.

Initial test failures were corrected before these final runs: SQL CASE syntax,
the select-control test locator, and existing mock notification reads. No
assertion or authorization invariant was removed to obtain these results.
Hosted browser acceptance, concurrent hosted callers and Production readiness
remain separate release gates for this new feature. Commit SHAs and current
publication status are recorded in the pull request.

## Staging Migration Verification

The owner approved only this feature's staging migration and exact-branch
Preview settings. The latest completed staging backup was 20 November 2026
at 06:51:32 Dubai time. Database backups do not recover Storage objects or
changes saved after that backup.

The approved source migration was applied to staging as ledger version
`20261120111348`, name `management_task_conversation_followup`. Required
archive and immutable task-history prerequisites were present. After applying:

- Both functions have a fixed `pg_catalog` search path; the public wrapper is
  invoker and only the private validated writer is definer.
- Only authenticated callers can execute them; anonymous and service-role
  execution are denied.
- History RLS and the immutable trigger remain enabled, and direct history
  inserts, updates and deletes remain denied.
- The new notification policy is restrictive and checks current task visibility.
- Existing lead, company, task, task-event, remark and notification counts did
  not change during migration or the rolled-back rehearsal.

The hosted database-role rehearsal passed Admin note, assigned Salesman notice,
Started/Completion history, linked Activity creation, identical-request retry,
Admin reply on a completed task, immutable history rejection and archive-aware
task/history/notice denial. Every synthetic change was rolled back; no customer
record contents were read for dataset-wide checksum comparison.

Security advisor results did not change. Existing unrelated weekly-report
function warnings and disabled leaked-password protection remain outside this
feature. Relevant references:
[function warning](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable),
[password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Staging And Release Gates

The new migration requires the released PR #77 task-remark history migration and
PR #76 archive safeguards. It preserves every existing history row, adds nullable
columns and replaces only the remark type constraint. It does not backfill,
delete records or reopen completed tasks.

After separate publication approval, configure an exact-branch staging Preview
before using it. Separately obtain approval to apply only
`20261120104635_management_task_conversation_followup.sql` to staging, after a
fresh backup/schema check and with staging task updates idle. Use the approved
single-file migration operation, not an unscoped push of pending migrations.
Verify its ledger, function grants, fixed search path, RLS and immutable trigger.

Rehearse Admin note -> Salesman notification -> completion -> linked follow-up
with synthetic staging records, including interrupted-response retry, archived
and former-owner denial, and notification failure rollback. No new external
provider or secret type is required.

Production requires its own backup/mapping review, explicit migration approval
and release-owner-controlled merge/deployment. This document authorizes none of
those operations. Keep other pending PRs separate and reconcile main again before
publication.
