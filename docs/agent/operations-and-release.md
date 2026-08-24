# Operations, Observability, and Release

## Safe Operations

The repository is deployed through Vercel configuration, but agents must never deploy or promote a deployment. [vercel.json; AGENTS.md] If GitHub, authentication, network access, Vercel, Supabase, or another required tool is unavailable, report the blocker and stop at the last verified state. [AGENTS.md]

The operating rule prohibits direct commits/pushes to `main`. [AGENTS.md] Repository evidence: `.github/workflows/verify.yml` defines the `CRM Verification` workflow and `Verify CRM` job. [.github/workflows/verify.yml] Owner-confirmed external GitHub configuration, dated 2026-08-24: the `main` ruleset requires the GitHub Actions `Verify CRM` status check, requires pull requests, requires branches to be up to date before merging, and blocks force pushes. Repository files cannot prove this external ruleset state; future agents must verify it at runtime. A divergent local history was explicitly preserved for this operation, but it is runtime-only state, not permanent repository truth. Check branch/worktree state at runtime and preserve any user-identified history/worktree. [AGENTS.md]

## Observability Runbook

| Area | Verified evidence | Safe diagnostic action |
| --- | --- | --- |
| Application events | Structured rate-limit, voice-note access, and scheduled-job events exist. | Read authorized logs only; retain event/timestamp/outcome and redacted or hashed identifiers. [server.js; docs/DURABLE_RATE_LIMITING.md] |
| Audit data | Integration, agent-query, configuration, assistant, activity, and weekly-report audit/event data are implemented. | Use authorized read-only inspection with the narrowest scope. [server.js; README.md] |
| Rate limiting | HMAC-hashed subjects and near-threshold/exceeded events are documented. | Do not expose rate-limit secrets or raw account/request data. [docs/DURABLE_RATE_LIMITING.md; src/services/rateLimitService.js] |
| Health | `/api/health` is anonymous health metadata. | Read-only health checks do not authorize deployment actions. [docs/API_AUTHORIZATION_MATRIX.md] |
| External monitoring links, dashboards, alert owner, universal request IDs | TBD — requires owner confirmation | Do not fabricate URLs, owners, or identifiers. |

## Release Checklist

The agent prepares evidence only; it must never perform the production release. [AGENTS.md]

| Check | Requirement |
| --- | --- |
| Local verification | `npm run verify` succeeds, or baseline-equivalent failures are demonstrated and reported. [package.json; docs/agent/baseline-and-invariants.md] |
| GitHub checks | Repository evidence: `CRM Verification` workflow and `Verify CRM` job are defined. Owner-confirmed external setting as of 2026-08-24: GitHub Actions `Verify CRM` is required on `main`; future agents must verify the ruleset at runtime. [.github/workflows/verify.yml] |
| PR review | Required; reviewer/approval policy TBD — requires owner confirmation. [AGENTS.md] |
| Preview/staging verification | Required when relevant; environment and acceptance criteria TBD — requires owner confirmation. [AGENTS.md] |
| Migration review | Required for migration changes; never apply without explicit human approval. [AGENTS.md; supabase/migrations/] |
| Backup confirmation | Required before any authorized data-changing operation. [AGENTS.md] |
| Rollback, smoke test, monitoring | Required before/after authorized release; exact procedure/owner/link TBD — requires owner confirmation. [AGENTS.md] |
| Human release approval | Required for production releases, promotions, data changes, migrations, backfills, secret rotation, and environment-variable changes. [AGENTS.md] |
