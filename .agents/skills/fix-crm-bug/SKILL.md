---
name: fix-crm-bug
description: Diagnose and repair a reproducible ARG Leads Tracker CRM defect with the smallest safe change, regression coverage, baseline comparison, and complete verification. Use when asked to investigate, reproduce, or fix incorrect CRM behavior, failing tests, broken routes, UI regressions, authorization defects, data-isolation defects, upload/download failures, or other repository bugs.
---

# Fix CRM Bug

1. Read [AGENTS.md](../../../AGENTS.md) and the relevant references below.
2. Confirm the expected behavior and affected role.
3. Inspect the branch, worktree, and `origin/main` state.
4. Start from current `origin/main` on a dedicated fix branch.
5. Reproduce the defect before editing.
6. Identify the smallest supported root cause.
7. Compare suspicious failures with a clean `origin/main` baseline.
8. Do not modify a test merely to accept incorrect application behavior.
9. Add or update a regression test that fails before the fix and passes afterward.
10. Preserve authentication, authorization, role isolation, Supabase RLS, storage integrity, CSP, signed-URL handling, service-worker cache behavior, and sensitive-data protections.
11. Stop for confirmation before migrations, production data, backfills, secrets, environment changes, destructive actions, deployments, merges, or unclear business rules.
12. Keep the diff confined to the defect.
13. Run the most focused relevant test first.
14. Run `npm run verify` before proposing a pull request.
15. If verification fails, report the exact first failure and compare it against clean `origin/main` before calling it pre-existing.
16. Report files changed, exact commands, branch, commit SHA, verification performed and not performed, security/database impact, deployment impact, blockers, and limitations.
17. Never claim pushed, PR open, merged, or deployed unless each state is verified.
18. Never merge or deploy.

## Repository References

Read these references instead of duplicating their detailed tables:

- [AGENTS.md](../../../AGENTS.md)
- [commands.md](../../../docs/agent/commands.md)
- [architecture.md](../../../docs/agent/architecture.md)
- [roles-and-business-rules.md](../../../docs/agent/roles-and-business-rules.md)
- [baseline-and-invariants.md](../../../docs/agent/baseline-and-invariants.md)
- [ai-safety-and-evaluation.md](../../../docs/agent/ai-safety-and-evaluation.md)
- [operations-and-release.md](../../../docs/agent/operations-and-release.md)
- [privacy-and-performance.md](../../../docs/agent/privacy-and-performance.md)
- [README.md](../../../docs/agent/README.md)

## Final Output

- **Status:**
- **Root cause:**
- **Reproduction:**
- **Change:**
- **Regression test:**
- **Verification:**
- **Security/database impact:**
- **Deployment impact:**
- **Branch and commit:**
- **Blockers/limitations:**
