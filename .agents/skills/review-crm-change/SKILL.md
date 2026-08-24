---
name: review-crm-change
description: Review an ARG Leads Tracker CRM pull-request change for correctness, security, authorization, regression risk, and verification evidence without modifying code or repository state.
---

# Review CRM Change

1. Read [AGENTS.md](../../../AGENTS.md) and the repository references below before reviewing.
2. Inspect the pull-request diff, its base, and relevant surrounding code and tests without modifying files. If the pull request, commit range, or base branch is unclear, request it.
3. Review authentication, authorization, role isolation, Supabase RLS, sensitive CRM data, storage integrity, signed URLs, CSP, and service-worker caching.
4. Check the change against documented business rules and role permissions.
5. Identify regressions, security defects, missing tests, unsafe fallbacks, and unsupported assumptions.
6. Run focused relevant tests and `npm run verify` when appropriate and authorized; report exact commands and their outcomes.
7. Classify every finding as **Critical**, **High**, **Medium**, or **Low**.
8. Cite an exact repository file path and line number for every finding.
9. Clearly separate confirmed defects from questions and recommendations. Do not present an unsupported concern as a confirmed defect.
10. Never approve, merge, deploy, modify production data, run migrations, change secrets, or edit code.
11. Use the precise status vocabulary from [AGENTS.md](../../../AGENTS.md): local only, committed, pushed, pull request open, merged, and deployed.
12. End the review with the required output template below.

## Repository References

Use these references instead of duplicating their detailed tables:

- [AGENTS.md](../../../AGENTS.md)
- [commands.md](../../../docs/agent/commands.md)
- [architecture.md](../../../docs/agent/architecture.md)
- [roles-and-business-rules.md](../../../docs/agent/roles-and-business-rules.md)
- [baseline-and-invariants.md](../../../docs/agent/baseline-and-invariants.md)
- [ai-safety-and-evaluation.md](../../../docs/agent/ai-safety-and-evaluation.md)
- [operations-and-release.md](../../../docs/agent/operations-and-release.md)
- [privacy-and-performance.md](../../../docs/agent/privacy-and-performance.md)
- [README.md](../../../docs/agent/README.md)

## Required Review Output

- **Verdict:**
- **Findings:**
  - **Critical:**
  - **High:**
  - **Medium:**
  - **Low:**
- **Questions:**
- **Recommendations:**
- **Verification performed:**
- **Verification not performed:**
- **Security/database impact:**
- **Deployment impact:**
- **Branch/commit reviewed:**
- **Blockers:**
