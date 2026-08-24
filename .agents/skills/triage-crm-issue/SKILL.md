---
name: triage-crm-issue
description: Triage an ARG Leads Tracker CRM issue without modifying code. Use when asked to investigate, classify, prioritize, or assess a reported bug, feature request, support problem, configuration issue, security concern, or data-integrity concern before implementation.
---

# Triage CRM Issue

1. Read [AGENTS.md](../../../AGENTS.md) and the relevant repository references below.
2. Remain strictly read-only: never edit code, tests, configuration, workflows, database data, migrations, or secrets; do not stage, commit, push, open a pull request, merge, or deploy.
3. Capture the reported symptom and the expected versus actual behavior.
4. Identify affected roles, routes, APIs, records, data fields, and mobile workflows.
5. Classify the report as one of: reproducible bug; suspected bug; feature request; configuration or environment issue; data-quality issue; support or usage question; or security or authorization concern.
6. Assign **Critical**, **High**, **Medium**, or **Low** severity, and assign priority separately from severity.
7. Record reproduction steps and whether reproduction succeeded. Compare suspicious test failures with a clean `origin/main` baseline where relevant.
8. Cite exact repository file paths and line numbers for every evidence-based conclusion.
9. Assess authentication, authorization, role isolation, Supabase RLS, sensitive CRM data, storage integrity, signed URLs, CSP, service-worker caching, database, and deployment risk.
10. Identify suspected modules without presenting an unsupported suspicion as a confirmed root cause.
11. Record missing evidence and clarifying questions.
12. Recommend exactly one next action when possible: `fix-crm-bug`, `implement-crm-feature`, `review-crm-change`, request clarification, or no repository change.
13. Never fix, approve, merge, or deploy anything.
14. End with the required output format below.

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

## Required Output

- **Status:**
- **Classification:**
- **Severity:**
- **Priority:**
- **Reported symptom:**
- **Expected behavior:**
- **Actual behavior:**
- **Reproduction result:**
- **Affected roles/routes/APIs/data/mobile workflows:**
- **Evidence:**
- **Baseline comparison:**
- **Security/database impact:**
- **Deployment impact:**
- **Suspected modules:**
- **Missing information:**
- **Clarifying questions:**
- **Recommended next action:**
- **Blockers/limitations:**
