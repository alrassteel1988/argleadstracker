# Commands, Tooling, Reporting, and Escalation

## Canonical Commands

Use only versioned, repository-supported commands. Do not invent or substitute commands. [package.json]

| Purpose | Command | Status |
| --- | --- | --- |
| Dependency installation | `npm ci` | Supported; `package-lock.json` is present. [package.json; package-lock.json] |
| Local development | `npm start` | Supported; runs `node server.js`. [package.json] |
| Syntax checking | `npm run check` | Supported Node syntax-check chain. [package.json] |
| Type checking | TBD — requires owner confirmation | No separate type-check script is defined. [package.json] |
| Linting | TBD — requires owner confirmation | No lint script is defined. [package.json] |
| Unit/integration tests | `npm test` | Supported combined Node test chain; no separate unit-only/integration-only script is defined. [package.json] |
| Build | `npm run build` | Supported; currently reports no asset compilation requirement. [package.json] |
| Local verification | `npm run verify` | Supported; runs check, test, then build. [package.json] |
| E2E | `npm run test:prod:add-lead`, `npm run test:prod:add-lead:mobile` | Scripts exist but target a live environment by name; do not run without explicit human authorization. [package.json] |
| Database migrations | TBD — requires owner confirmation | SQL migrations exist, but no package script is defined. [supabase/migrations/; package.json] |
| Seed operations | TBD — requires owner confirmation | No supported seed command is defined. [package.json] |

Repository evidence: `.github/workflows/verify.yml` defines the `CRM Verification` workflow and its `Verify CRM` job for pull requests to `main` and pushes to `main`, using Ubuntu, Node 24, npm cache, `npm ci`, and `npm run verify`. [.github/workflows/verify.yml]

Owner-confirmed external GitHub configuration, dated 2026-08-24: the `main` ruleset requires the GitHub Actions `Verify CRM` status check, requires pull requests, requires branches to be up to date before merging, and blocks force pushes. This is not provable from repository files; future agents must verify it at runtime before relying on it.

## Runtime Capability Checks

Do not commit machine-specific state as repository truth. At task start, check these capabilities at runtime: `gh --version`; `gh auth status`; `git remote -v`; fetch access; active branch and worktrees; divergence from `origin/main`; and clean/dirty working-tree status. [AGENTS.md]

## Reporting Contract

| Status term | Required evidence |
| --- | --- |
| local only | An uncommitted change or local commit not verified on a remote branch |
| committed | A local Git commit exists |
| pushed | The commit is verified on a remote branch |
| pull request open | An open PR URL is verified |
| merged | A merged PR or its commit is verified in the target branch |
| deployed | A deployment is verified in the named environment |

Never use a later status when only an earlier one is verified. Every task report must state: exact commands; branch; commit SHA for every created commit; files changed; verification performed; verification not performed; exact first failure/assertion; security/database impact; deployment impact; blockers; incomplete steps; and any redaction of secrets, credentials, private URLs, or sensitive CRM data. An unperformed check is **not verified**. [AGENTS.md]

## Escalation and Ambiguity

Stop and request clarification for conflicting code/tests/configuration/documentation; unclear scope; cross-module security/data/deployment effects; material missing acceptance criteria; uncertain authorization or business rules; or any required migration, production-data operation, secret change, destructive action, merge, or deployment. [AGENTS.md]

Use this precedence order: platform/system/security/tool restrictions; explicit current owner instruction when authorized and safe; nearest `AGENTS.md`; repository configuration and tests; repository documentation; inferred conventions. Do not silently resolve a conflict. [AGENTS.md]

## Definition of Done

A coding task is complete only when its scope and acceptance criteria are satisfied; relevant tests are updated; `npm run verify` passes or baseline-equivalent failures are demonstrated and reported; security/authorization/privacy/database/deployment effects are documented; required cache updates accompany shipped assets; and status is reported precisely. Opening a PR is not merging or deploying it. [AGENTS.md; package.json; sw.js]
