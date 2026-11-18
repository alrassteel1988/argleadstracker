# Same-Lead Management Task Duplicate Resolution

## Scope

An active Admin may retire an open initial task only when another open, non-removed
task exists on the exact same lead and belongs to the same active Salesperson who
currently owns that lead. Company-name similarity is not sufficient. Cross-lead
resolution, lead merging, automatic duplicate detection, and hard deletion are out
of scope. Protected rows explain this restriction even when no candidate exists.

## Transaction and Audit Rules

- The request must include both task versions, a 10-4000 character reason, and an
  explicit duplicate confirmation. The server ignores caller-supplied actor data.
- PostgreSQL locks both task rows in ID order, then locks the lead and checks its
  current initial-task link and owner. Stale versions or ownership fail closed.
- One transaction marks the selected duplicate removed, stores its retained-task
  ID, writes an append-only resolve_duplicate event, and switches the lead's
  initial-task pointer to the retained task. A failure rolls back all these steps.
- The retained task's content, status, deadline, remarks, and version are unchanged.
  Its new initial-task link protects it from ordinary Remove Task.
- The audit snapshot records the actor, time, reason, old initial-task ID, retained
  task ID, retained version, and transaction ID. Existing event actions remain valid.
- The lead trigger accepts a changed initial-task link only with a matching
  resolver audit event written in the current transaction by the active Admin.
  A caller-controlled setting is not an authorization mechanism. Ordinary direct
  link edits remain forbidden.
- Salespeople, Managers, Directors, inactive Admins, and anonymous callers cannot
  invoke this action successfully. The public RPC uses SECURITY INVOKER; the
  privileged checks and writes live in private functions with fixed search_path.
- Existing RLS hides removed tasks from Salespeople and retains them for Admin.
  Removed rows remain read-only. Focus Today uses the retained linked task.

## Migration and Release

Prerequisites are the existing management-task, initial-task, and PR #68 removal
migrations. The new add-on migration is
20261118053747_resolve_same_lead_task_duplicates.sql. It adds the duplicate-of
reference and RPC and replaces only the initial-link update guard. The initial
lead-insert function and next-action default are unchanged.

Apply only to an explicitly approved environment after backup confirmation and
local verification. Test with synthetic records and separate Admin and Salesperson
roles before requesting Production approval. A local browser test does not prove a
hosted Preview was tested. No merge, deployment, production mutation, or live-task
removal is authorized by this document.

If the frontend release must be rolled back, leave audit history and schema intact.
Reverting a resolved link or restoring a retired initial task needs a separately
reviewed corrective operation; never delete the resolution event.

## Verification

- npm run verify (with CRM_TEST_PGLITE_MODULE pointing to a disposable PGlite runtime).
- The management task PostgreSQL test covers role denials, cross-lead and stale
  rejection, direct-link and audit-insert denials, rollback, competing requests,
  unchanged retained task, immutable history provenance, and RLS visibility.
- The management-tasks Playwright suite covers desktop/mobile Admin confirmation,
  unavailable-candidate explanation, cross-lead candidate exclusion, retry after
  failed save, and Salesperson Focus Today / Management Tasks consistency.

## Staging Rehearsal Evidence - 18 November 2026

- The approved migration was applied only to ARG Leads CRM Staging
  (grxzqxqgtksunzfhtwox), after checking the completed backup from
  02:51:32 UTC / 06:51:32 Dubai. Supabase recorded ledger version 20261118055110
  for resolve_same_lead_task_duplicates; do not apply the file again merely
  because its filename timestamp differs from the generated ledger version.
- Separate authenticated Admin and Salesperson database-role sessions verified
  successful same-lead resolution, unchanged retained task, append-only audit,
  Salesperson visibility, anonymous denial, cross-lead/stale rejection, and the
  direct-link guard. All synthetic rehearsal writes were rolled back; read-back
  found no remaining rehearsal companies, leads, tasks, or audit events.
- Public RPC invoker security, private definer checks, fixed search paths, RLS,
  and audit-table write restrictions were checked. Security advisors reported
  the same four pre-existing findings before and after, with no new finding.
- Local npm run verify passed with PGlite enabled. The desktop/mobile browser
  suite passed seven tests with one pre-existing mobile skip; a final focused
  duplicate-resolution rerun passed both desktop and mobile cases.
- These results do not establish hosted Preview success. Fresh exact-branch
  staging credentials and separate private Admin/Salesperson browser sessions
  are still required. Production and live AGM tasks were not accessed or changed.
