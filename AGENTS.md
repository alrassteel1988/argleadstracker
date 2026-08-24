# ARG Leads Tracker Agent Instructions

## Non-Negotiable Operating and Safety Rules

1. Read the repository and relevant tests before changing code.
2. Start from the latest `origin/main` on a separate feature or fix branch; inspect branch divergence, worktrees, and working-tree status first. [docs/agent/operations-and-release.md]
3. Never commit or push directly to `main`; open a pull request into `main` and never merge it. [docs/agent/operations-and-release.md]
4. Keep changes narrowly scoped to the authorized task. Do not create or alter unrelated files.
5. Run `npm run verify` before opening a pull request. If it fails, report the exact first failure and do not claim success. [docs/agent/commands.md]
6. Never deploy or promote a Vercel deployment. Never modify production data, run database backfills, apply Supabase migrations, rotate secrets, or change production environment variables without explicit human approval. [docs/agent/operations-and-release.md]
7. Never expose secrets or commit `.env` files. Treat customer, lead, contact, voice-note, and uploaded-document data as sensitive. [docs/agent/privacy-and-performance.md]
8. Preserve authentication, authorization, role isolation, Supabase RLS, protected file access, CSP, and service-worker cache protections. [docs/agent/baseline-and-invariants.md]
9. Add or update tests for bug fixes and behavior changes. Do not weaken a verified invariant without explicit owner approval, replacement protection, updated tests, and documented security impact. [docs/agent/baseline-and-invariants.md]
10. Do not delete branches, files, records, backups, or worktrees unless explicitly authorized.
11. Commits, pushes, and pull requests require task-granted authorization. Merging and production deployment are prohibited. [docs/agent/ai-safety-and-evaluation.md]
12. When evidence conflicts or scope, authorization, acceptance criteria, business rules, or security effects are materially uncertain, stop and request clarification. [docs/agent/commands.md]

## Required References

- [Commands, tooling, reporting, escalation, and definition of done](docs/agent/commands.md)
- [Architecture and routes](docs/agent/architecture.md)
- [Roles and business rules](docs/agent/roles-and-business-rules.md)
- [Design system and verified invariants](docs/agent/baseline-and-invariants.md)
- [AI safety and evaluation](docs/agent/ai-safety-and-evaluation.md)
- [Operations, baseline, and release checklist](docs/agent/operations-and-release.md)
- [Privacy and performance](docs/agent/privacy-and-performance.md)
- [Shared TBD Register](docs/agent/README.md)

Every pull request must include: summary; files changed; verification performed and not performed; security/database impact; deployment impact; known limitations; exact commands; branch; commit SHA for each created commit; blockers; and incomplete steps. Use only status terms whose evidence is complete. [docs/agent/commands.md]

No documentation in this set authorizes a database operation, deployment, merge, secret change, or production-data access.
