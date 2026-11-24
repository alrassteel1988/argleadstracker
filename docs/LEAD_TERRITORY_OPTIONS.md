# Qatar and Manual Customer Territory

Branch: `codex/lead-territory-options`, based on main
`b1ce02aa1931c3d9d384efc1b429981ff64286e5`. Separate from lead-summary PR #80.

## Behavior and Access

Step 1 keeps configured options, adds Qatar exactly once, and adds Add manually.
Manual selection reveals a required Country / custom territory field. Admin
and Salesman can register Qatar or a custom customer geography such as India,
Netherlands or Turkmenistan. Empty/whitespace manual entries are blocked in the
form. API defaults for omitted/legacy-empty values are preserved; explicit
whitespace, control characters, non-string values and more than 100 characters
are rejected. The database RPC requires a normalized nonempty string.
The UI-only selector marker
and custom field are never persisted. Switching back to a preset disables the
manual field. New forms reset its value and validation.

This implements the owner's earlier decision allowing both roles custom
customer territories. It intentionally replaces the account-territory equality
requirement on NEW registration only. A customer's geography is descriptive;
it does not change a user profile, role, assignment or access scope. Salesman
creator, assignee and owner name remain server-enforced. Existing UPDATE/SELECT,
archive, duplicate, activity history, task and reassignment rules stay unchanged.
An ordinary Salesman edit preserves the stored territory. The manual option is
not exposed on edits; Admin's existing edit permissions remain unchanged.

Configured global territories, server defaults and existing records are not
rewritten. Qatar is normalized consistently and is added to Step 1 client-side
without changing the global configuration approval workflow. Romania is not
mistaken for Oman by substring.

## Database and Release

Prepared only: `20261124050745_lead_territory_options.sql`, generated with the
pinned CLI. It transactionally replaces only the Salesman INSERT policy and
the existing caller-invoker atomic new-lead RPC, preserving ownership checks,
field allowlist, permissions, rollback and separate read-back. No service-role
grant, SELECT expansion, backfill or record rewrite. No new environment variables.

Hosted staging and Production are unchanged. Separate backup/schema checks,
migration approval and staging role tests are required. Do not deploy the UI
alone: the old Salesman registration RPC rejects non-profile territories. Apply
only this migration to the approved environment, not a blanket migration push;
SQL Editor ledger handling requires owner review.

`vercel.json` disables automatic deployments for this branch only, respecting
the owner's Git-only/no-deploy request. Main and other branches are unaffected.
Reference: https://vercel.com/docs/project-configuration/git-configuration

## Files and Local Verification

Client/form/cache: client.js, index.html, sw.js and three cache-contract tests.
Server/API and SQL: server.js and the migration above. Tests: role-access,
admin-salesman-permissions.e2e, lead-registration-api, lead-registration-database,
salesmen-directory, lead-territory-options.test.cjs, and the four-role/viewport
international-territory browser suite. package.json and playwright.ui.config.js
include the focused checks. The earlier local prototype is preserved unchanged.

```powershell
npm.cmd run test:lead-territory-options
node --test tests/lead-registration-database.test.cjs
node tests/lead-registration-api.test.cjs
npm.cmd run verify
$env:CRM_UI_SUITE='international-territory'
$env:CRM_UI_TEST_PORT='4961'
node node_modules/playwright/cli.js test --config=playwright.ui.config.js
git -c core.whitespace=cr-at-eol diff --check
```

Tests use synthetic local fixtures only. On 24 November 2026:
- Full `npm.cmd run verify`: exit 0 (`territory-verify.log`).
- Three focused UI-state/deployment-guard tests passed.
- Three SQL baseline/current-migration cases passed with no skips. Existing
  creation-audit and ownership checks remain; the new case adds customer
  territories, malformed JSON, invalid-input rollback and peer isolation.
- Focused registration API and Admin/Salesman HTTP permission tests passed,
  including stored-territory preservation on ordinary edits.
- All four desktop/mobile role browser tests passed, registering both a custom
  country and Qatar per case, with manual validation, reset and no overflow.
- Admin desktop/mobile screenshots inspected; custom input and controls fit.
- Diff whitespace check passed.

The first focused permission run caught an effect of adding Qatar to global
defaults on the configuration approval test. The implementation was narrowed to
the form and normalization; existing approval assertions remain intact.

Hosted migration, full populated-schema rehearsal, disaster recovery and live
Admin/Salesman workflow verification remain release gates. Do not merge/deploy.
