---
name: implement-crm-feature
description: Plan and implement a safely scoped ARG Leads Tracker CRM feature with explicit acceptance criteria, role authorization, business-rule validation, regression coverage, and complete verification. Use when asked to add or extend CRM behavior, routes, UI workflows, APIs, reports, integrations, or role-specific capabilities.
---

# Implement CRM Feature

1. Read [AGENTS.md](../../../AGENTS.md) and the relevant references below.
2. Restate the requested feature and measurable acceptance criteria.
3. Identify affected roles, permissions, routes, APIs, data, and mobile workflows.
4. Stop for clarification when scope, business rules, permissions, or success criteria are uncertain.
5. Inspect the branch, worktree, and `origin/main` state.
6. Start from current `origin/main` on a dedicated feature branch.
7. Inspect existing architecture and reuse established patterns.
8. Produce a short implementation plan before editing.
9. Keep changes confined to the approved feature.
10. Preserve authentication, authorization, role isolation, Supabase RLS, storage integrity, CSP, signed-URL handling, service-worker caching, and sensitive-data protections.
11. Require explicit confirmation before migrations, production-data operations, backfills, secrets, environment changes, destructive actions, deployments, or merges.
12. Add or update tests for acceptance criteria, permissions, error states, and regression risks.
13. Update service-worker cache/version protection when shipped assets require it.
14. Run the most focused relevant tests first.
15. Run `npm run verify` before proposing a pull request.
16. Compare suspicious failures against a clean `origin/main` baseline.
17. Report exact commands, files changed, branch, commit SHA, verification performed and not performed, first failure, security/database impact, deployment impact, blockers, and limitations.
18. Use the precise states: local only, committed, pushed, pull request open, merged, deployed.
19. Never merge or deploy.

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
- **Acceptance criteria:**
- **Implementation plan:**
- **Change:**
- **Tests:**
- **Verification:**
- **Security/database impact:**
- **Deployment impact:**
- **Branch and commit:**
- **Blockers/limitations:**
