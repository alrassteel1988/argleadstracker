# International Customer Territory Choices

Branch: `codex/lead-territory-options`, based on main
`b1ce02aa1931c3d9d384efc1b429981ff64286e5`. Separate from lead-summary PR #80.

## Behavior and Access

Step 1 keeps configured options, adds Qatar, India, Iraq and Syria exactly once
each, and adds Others (please specify). Selecting Others reveals a required
Please specify territory field. Admin and Salesman can register a preset or a
custom customer geography such as
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
rewritten. The four preset countries are deduplicated case-insensitively and
added to Step 1 client-side
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

## Hosted Preflight Repair

Read-only staging/Production preflight on 24 November found that the replacement
RPC omitted the released lifecycle migration's closed_reason/closed_note
allowlist and minimal archived-registration response. No hosted migration had
been applied. A local test running the actual released lifecycle migrations
before the Territory migration reproduced `Unsupported lead registration field`.

The narrowly approved repair retains those fields and returns only id,
is_archived and lead_status when a non-Admin registration closes/archives
immediately. It does not grant a Salesman archived-row visibility. Both the
unmodified lifecycle baseline and the upgraded lifecycle now run the full RLS,
duplicate, notification, archive/restore, audit, attachment and initial-task
workflow. Closure reasons/notes remain stored and the archived row stays hidden.
This extends the earlier smaller registration fixture; it does not remove it.

The migration was confirmed absent from both hosted migration ledgers before
editing. Fresh backup confirmation, Vercel mapping/branch isolation and hosted
role rehearsal remain outstanding. No hosted writes or Production changes are
part of this repair. `npm.cmd run verify` passed after the repair
(`territory-verify-lifecycle-repair.log`). Both complete lifecycle SQL cases
passed without skips. Frontend assets are unchanged from the four passing
desktop/mobile cases; no new asset cache revision is required for this SQL/test
repair. The owner approved committing/pushing only this narrow repair.

Hosted migration, full populated-schema rehearsal, disaster recovery and live
Admin/Salesman workflow verification remain release gates. Do not merge/deploy.

## 27 November 2026 Local Country-Choice Extension

Status at initial local verification: uncommitted on
`codex/lead-territory-options`; existing HEAD
is `bc44783229a9fbeb484ba000e16cb3bcb8e33d77`. No new commit was created.
`git fetch --no-tags origin main` refreshed the baseline; before editing,
`git rev-list --left-right --count origin/main...HEAD` returned `0 2`. The
existing dedicated Territory branch therefore already contains current main.
The dirty root checkout and its unrelated changes were not modified.

The owner requested Qatar, India, Iraq, Syria and Others (please specify).
Configured choices remain available; repeated/case-varied preset country names
appear once. Others reveals the required Please specify territory input and
uses the existing validated custom-territory registration path. No backend,
migration, global configuration, account territory or access rule was changed
by this extension. The matching PR #81 backend remains a release dependency;
earlier hosted-status paragraphs above are historical, not a fresh audit.

Files changed for this extension: client.js, index.html, sw.js,
tests/lead-territory-options.test.cjs,
tests/ui/international-territory.spec.js, the three existing cache-contract
tests, and this document. The PWA cache revision is now
`arg-pwa-v200-international-territory-choices`.

Verification performed:
- `npm.cmd run test:lead-territory-options`: 3 passed, no skips.
- `npm.cmd run verify`: passed outside the sandbox. The first sandbox attempt
  stopped in auth-refresh with `connect EACCES 127.0.0.1:55557`; this was an
  execution-permission failure. The successful run retains the two existing
  optional SQL-fixture skips; creation, lifecycle, international registration,
  conversation, remark-history and RFQ document SQL cases ran successfully.
- `node --check tests/ui/international-territory.spec.js`: passed.
- The final browser command below passed all 4 Admin/Salesman desktop/mobile
  cases, each creating one custom and four preset-country synthetic leads.
  Checks cover blank manual input, preset uniqueness, saved country/assignee,
  form reset and horizontal overflow. Four-role screenshots were inspected.
- The first expanded browser run had 3 timeouts and 1 pass. It exposed test
  navigation to a hidden mobile Add Lead button after saving into lead details.
  The test now returns to Pipeline between registrations and has a scoped
  120-second budget for five complete registrations. No application navigation
  or save/ownership assertions were weakened. The final rerun passed in 4.9m.
- `git -c core.whitespace=cr-at-eol diff --check`: passed; only ordinary
  LF-to-CRLF conversion warnings were emitted.

```powershell
$env:CRM_UI_SUITE='international-territory'
$env:CRM_UI_TEST_PORT='4991'
node node_modules/playwright/cli.js test --config=playwright.ui.config.js
```

Not performed during that local verification: commit, push, PR metadata update, hosted Admin/Salesman tests,
hosted migration, Production data/configuration access, merge or deployment.
No secrets were read or changed. Existing records were not rewritten; tests
used isolated synthetic localhost fixtures. No deployment authorization is
implied by these local results.

On 27 November the owner subsequently requested a commit/push and Vercel
release. The tested changes are prepared for this same branch/PR; the exact
created commit and remote verification belong in the PR delivery record.
The automatic-deployment guard is retained. Production release is not ready:
effective branch-only staging isolation, hosted workflow acceptance, and the
matching Production migration readiness/approval must be confirmed first.
The Vercel connector still lists only a personal team, not Al Ras Steel.
No merge, deployment, hosted migration, environment change or Production
record operation is included in the Git push.
