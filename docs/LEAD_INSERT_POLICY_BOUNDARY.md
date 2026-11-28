# Lead INSERT Policy Boundary Repair

## Scope and Root Cause

The released `F04 leads insert` and `Salesmen can insert self-owned leads`
policies are permissive and combine with OR. In the legacy rule, the unqualified
`territory` inside the profile subquery resolves to `profile.territory`, not the
new lead's territory. That rule also accepts a NULL assignee and an Unassigned
display name. The stricter policy cannot veto that path.

`20261128045804_lead_insert_policy_boundary.sql` replaces only those two known
INSERT policies with one `CRM lead insert` policy. It does not change historical
rows, helper functions, table grants, triggers, read/update/delete policies,
Storage policies, or the restrictive lifecycle boundary.

| Caller | New lead requirements |
| --- | --- |
| Active Admin, Director or Manager | Creator is the caller; valid descriptive territory; management assignment and Unassigned leads remain supported. |
| Active Salesman | Creator and assignee are the caller; display name matches the nonempty profile name; valid descriptive territory. Existing empty-profile-name fallback remains unchanged from the registration RPC. |
| Inactive/unsupported account or anonymous caller | No INSERT policy grants access. |
| Trusted service-role jobs | Existing BYPASSRLS behavior and grants are unchanged; no new service-role operation is introduced. |

Territory validation matches the released international-registration RPC:
trimmed length 1-100, no control characters, and no `__custom_territory__`
selector sentinel. Customer geography does not grant ownership or read access.
This repair does not attempt to change UPDATE behavior or normalize old rows.

The migration is transactional with a five-second lock timeout. It fails before
replacing policies if RLS is disabled, the known policy configuration has changed,
or another permissive INSERT/ALL policy could bypass the replacement. Unknown
policies are not silently deleted. A rerun on the canonical policy is supported.

## Local Verification

The direct-INSERT fixture extracts the actual legacy and newer policy SQL.
Before the repair, both upgrade variants fail with:

```text
Missing expected rejection: Reject forged ownership: {"assigned_to":null,"assigned_salesman":"Unassigned"}
```

Coverage includes invalid creators, NULL/peer assignees, mismatched display names,
invalid territories, active/inactive roles, international presets and custom
countries, private peer visibility, preserved historical rows/security, trusted
imports, restrictive archive checks, idempotent rerun, and fail-closed preflight.
Registration and lifecycle suites also run with the repair applied, including
atomic rollback, closed registration, archive/restore, immutable history,
protected files, and the real Admin initial-task registration workflow.

Commands from the repair checkout:

```powershell
npm.cmd ci --ignore-scripts --no-audit --no-fund
node --test tests/lead-insert-policy-database.test.cjs tests/lead-registration-database.test.cjs tests/lead-lifecycle-database.test.cjs
$env:CRM_TEST_PGLITE_MODULE=(Resolve-Path node_modules/@electric-sql/pglite).Path
npm.cmd run verify
$env:CRM_UI_SUITE='international-territory'
node node_modules/playwright/cli.js test --config=playwright.ui.config.js
git diff --check
```

The Playwright suite uses isolated synthetic local fixtures, not hosted Supabase.
Passing it is not evidence that hosted staging or Production has the migration.

### Local Verification Before Hosted Approval: 28 November 2026

- Local branch: `codex/lead-insert-policy-boundary`, based on fetched main
  `7ee1757d64ef64e71a4f841c828ca2c1a6337837`. No new commit or push was made.
- Focused database command: 10 tests passed, zero skipped.
- `npm.cmd run verify`: passed. A second full run with
  `CRM_TEST_PGLITE_MODULE` explicitly set also passed, including the otherwise
  optional reassignment and management-task SQL fixtures, with zero skips.
- Playwright international-territory suite: four tests passed, covering Admin
  and Salesman on desktop/mobile and five registrations per role/viewport.
  Execution used `CRM_UI_TEST_PORT=4279`; screenshots were inspected.
- `git diff --check`: passed.
- Initial setup failure was missing local PGlite; lockfile installation resolved
  it. The first sandboxed dependency install failed with npm registry ENOTFOUND;
  the approved unsandboxed install passed without lockfile changes.
- The first sandboxed full verification stopped in `tests/auth-refresh.test.js`
  with `connect EACCES 127.0.0.1:63937`. The approved unsandboxed runs passed;
  no application behavior was changed to work around that sandbox restriction.
- Read-only staging inspection confirmed RLS enabled, the Territory migration
  present, the repair absent, and the two original permissive INSERT policies
  still installed. This is not repaired hosted staging acceptance.
- New staging migration approval and a verified staging-connected test app are
  still required. No hosted migration, environment change, Production write,
  merge or deployment was performed by this repair work.

### Approved Staging Installation and Database Verification

After the owner approved only this migration and confirmed idle staging writes:

- Target rechecked: `grxzqxqgtksunzfhtwox`, ARG Leads CRM Staging,
  `ACTIVE_HEALTHY`. No Production database was queried or changed in this step.
- Latest scheduled backup listed: 28 November 2026 02:54:04 UTC, or 06:54:04
  Dubai. This was a listing check, not a restore test; Storage contents are excluded.
- Only `20261128045804_lead_insert_policy_boundary.sql` was applied through the
  staging migration tool. Actual hosted ledger version: `20261128051149`, name
  `lead_insert_policy_boundary`.
- Post-migration read-back: exactly one permissive INSERT policy, `CRM lead insert`.
  Non-INSERT policies, forced/enabled RLS, table ACLs, registration/helper
  definitions and function ACLs matched their pre-migration snapshots.
- `tests/staging/lead-insert-policy.sql` passed all 14 reported checks on staging,
  using transaction-local authenticated role contexts for the designated synthetic
  Admin and Salesman accounts. This tests real staging RPCs and RLS, not password
  sign-in, browser rendering, or application HTTP routes.
- Covered Admin assigned/Unassigned registration and initial RFQ linkage; five
  Salesman international registrations; valid direct INSERT; rejection of NULL,
  other-owner and mismatched-name bypasses; invalid territories; RPC creator/owner
  checks; Admin-only task rights; assignment isolation; and closed/archive history.
- The entire acceptance transaction rolled back. An independent read confirmed
  zero matching synthetic companies, leads and tasks before and after.
- Anonymous and service-role execution of `save_new_crm_lead(jsonb)` remained
  denied; authenticated execution remained granted.
- No existing Territory Preview was found in Vercel branch history. No deployment
  was requested or performed and no Vercel environment variable was changed.
- Owner separately approved a temporary localhost-only staging runtime. Its setup
  helper is Git-ignored under `tmp/`, binds only 127.0.0.1, fixes the staging
  database origin, accepts the existing staging service-role key privately in
  memory, rejects another project's key, and keeps normal application protections.
  Browser acceptance remains pending private setup and normal test-account sign-in.

#### Local Setup Transport Follow-up

The first private setup attempt did not start the staging CRM. The in-app browser
posted the local form with `Origin: null` and `Sec-Fetch-Site: same-origin`, which
the temporary helper rejected before key validation. Its localhost page displayed
the rejection; the other CRM tab was the live Production domain and was not used
for staging tests.

The Git-ignored helper now accepts that transport only in conjunction with its
exact loopback Host and unguessable form nonce. Its fixed staging project/key
validation is unchanged. Six synthetic localhost checks passed: native and
in-app same-origin submissions reach validation and reject another project's
fake key; cross-origin, null cross-site, missing-origin and bad-nonce requests
are denied. Successful setup now presents an explicit local CRM link instead of
a cross-port form redirect. No application or database permission was changed.
Private staging key entry and normal Admin/Salesman sign-in are still pending.

#### Admin Browser Acceptance: 28 November 2026

Private setup subsequently succeeded. The normal CRM server runs at
`http://127.0.0.1:60116/`, bound to loopback and fixed to staging. The owner
signed in privately as the designated staging Admin. No credentials were read
from the browser or written to the evidence.

Five synthetic leads were created through the real form and reopened:

| Synthetic fixture | Territory | Initial management task |
| --- | --- | --- |
| Cobalt Meridian Laboratory Q81 Qatar 28Nov | Qatar | Respond to Initial RFQ |
| Amber Zenith Survey Laboratory Q81 India 28Nov | India | New Lead Outreach |
| Silver Beacon Research Workshop Q81 Iraq 28Nov | Iraq | New Lead Outreach |
| Violet Canyon Materials Laboratory Q81 Syria 28Nov | Syria | New Lead Outreach |
| Copper Aurora Export Laboratory Q81 Custom 28Nov | Netherlands | New Lead Outreach |

The empty Others input kept Step 1 open with an actionable validation message.
The custom Netherlands registration also passed with a requested 375x812 viewport
override and screenshot inspection, with surrounding whitespace removed on save;
the temporary viewport override was reset. Its exact rendered CSS dimensions were
not separately measured during that Admin check.
The Admin Management Tasks workspace loaded after a fresh navigation and showed
all five linked tasks. No prior task or conversation was edited.

Independent read-only staging verification confirmed all five saved territories,
the correct Admin creator and Salesman assignee, exactly one creation entry per
lead, correct task links/assignees, and a 30 November 2026 next-working-day due date.
These five browser fixtures remain in staging for Salesman acceptance. Unlike the
earlier SQL acceptance transaction, browser registrations were committed normally;
no record cleanup or deletion has been performed. Salesman browser acceptance is
still pending private sign-in to the local staging runtime.

#### Salesman Browser Acceptance: 28 November 2026

The owner signed into the designated test Salesman in the original loopback tab;
the unused separate localhost tab stayed signed out. No session token or password
was copied between tabs or read by the agent.

| Synthetic fixture | Saved territory |
| --- | --- |
| Indigo Aspen Precision Works Q81 Sales Qatar 28Nov | Qatar |
| Scarlet Birch Engineering Studio Q81 Sales India 28Nov | India |
| Saffron Elm Fabrication Laboratory Q81 Sales Iraq 28Nov | Iraq |
| Teal Juniper Survey Laboratory Q81 Sales Syria 28Nov | Syria |
| Crimson Willow Export Studio Q81 Sales Custom 28Nov | Turkmenistan |

All five were created and reopened through the normal CRM form. Independent
staging read-back confirmed the Salesman as creator and assignee, exactly one
correctly attributed creation entry per lead, no initial management-task link,
and no management tasks created by these Salesman registrations. Empty Others
input was rejected before leaving Step 1, and custom whitespace was trimmed.

The browser viewport capability initially targeted the unused tab, so that
attempt was not counted as mobile acceptance. The authenticated browser pane was
then tested at measured 310x555 CSS pixels: the custom field and controls were
usable and the full Turkmenistan registration saved successfully. Management
Tasks and its conversation were also inspected at measured 376x812. Temporary
viewport overrides were cleared and the original 822x812 pane size was restored.
The earlier synthetic local Playwright suite separately covered 1440x900 and
375x812 for both roles; it is not substituted for staging database evidence.

The Salesman Management Tasks drawer showed all five new Admin assignments.
Searching Q81 showed five rows; opening the new Qatar RFQ exposed the original
management instructions. Only this new synthetic RFQ task was progressed:

- Start saved a synthetic progress remark. Not Started changed 18 to 17 and
  In Progress changed 1 to 2; total assignments stayed 23.
- Completion required a remark and saved successfully. In Progress returned to
  1, Completed increased 4 to 5, and pending changed 19 to 18.
- Completed search retained both Started and Completion timeline entries with
  the correct Salesman name and timestamps, plus the original Admin instructions.
- Independent read-back confirmed completed status, version 3, a recorded
  completion timestamp, both correctly attributed remarks, retained assignment
  and progress audit events, and the unchanged 30 November deadline.

Direct browser navigation to the known other-owner and archived synthetic lead
fixtures returned "Lead not found" without their details. The Salesman's new
Turkmenistan lead reopened normally after fresh navigation.

Final staging security read-back matched the pre-migration RLS/ACLs, non-INSERT
policies and registration/helper definitions/grants. The canonical INSERT policy
and approved ledger entry remained installed. No additional migration was applied.

Browser evidence consists of ten saved synthetic leads, five linked Admin
management tasks, and two remarks on the new RFQ task. They remain in staging;
no records or files were deleted, no pre-existing task was edited, and no real
customer contact or quotation was made.

Cleanup: the automated Sign Out clicks did not produce a confirmed login screen;
no sign-out defect was diagnosed or repaired in this scope. Both temporary test
tabs were closed instead. After verifying the exact helper process identity,
only its process (PID 34848) was stopped, releasing the process-held staging key.
No credential was written to workspace files, rotated or published by the agent.
The temporary local staging runtime is stopped. Production, Git pushes, merges
and deployments were untouched.

The INSERT-policy staging acceptance is complete. This does not certify unrelated
PR #80 document features, a hosted Vercel Preview, Production readiness, or the
unverified Sign Out cleanup path. At the end of staging acceptance, the repair
was local and uncommitted on `codex/lead-insert-policy-boundary`.

Final local verification was rerun after the browser acceptance using:

```powershell
$env:CRM_TEST_PGLITE_MODULE=(Resolve-Path node_modules/@electric-sql/pglite).Path
npm.cmd run verify *> tmp/insert-policy-final-verify.log
git diff --check
```

The complete verify command exited 0, including the optional database fixtures,
task/document security tests, UI contracts and build; no fixture skips were
reported. The final diff whitespace check passed. The generated log is Git-ignored.

Production migration, push/PR, merge and deployment were not performed under the
staging installation or local-runtime approval.

### Separate Git-only PR Preparation: 28 November 2026

The owner subsequently authorized committing/pushing this repair to a separate
PR with the staging results, explicitly excluding Production migration, merge
and deployment. The fetched `origin/main` remains
`7ee1757d64ef64e71a4f841c828ca2c1a6337837`, with no branch divergence.

`vercel.json` disables automatic Git deployment for this exact repair branch;
the existing Territory-branch guard remains intact. A regression assertion
checks both explicit branch rules without disabling deployment for `main` or
other branches. The repository's only GitHub workflow runs verification, not
migrations or deployment. No hosted Vercel settings or Secrets are changed.

Full verification passed again after this guard and its test were added, with
the optional database fixtures enabled and no reported skips. The focused guard
and direct-policy command passed all six tests; `git diff --check` also passed.
Publication status, the created commit SHA and PR URL are recorded in the PR description
and handoff after remote verification; this document alone is not evidence of
a completed push. Production installation and release remain separate gates.

## Hosted Verification and Release Gates

No hosted operation is authorized by this document.

1. Obtain approval for this exact migration and confirm staging writes are idle.
2. Recheck the staging project identity, backup/recovery limitations, RLS and
   complete policy set before applying it. Do not use a Production project.
3. Apply only the approved migration; retain its actual hosted ledger version.
4. Confirm exactly one permissive INSERT policy remains, lifecycle boundaries
   and other policies/grants are unchanged, and both caller-role tests pass.
5. Use only a verified staging-connected app for browser acceptance. Confirm the
   code revision and database mapping before signing in or creating fixtures.
   Do not use a Preview that inherits an unverified shared database URL.
6. Test Admin assigned and Unassigned registration; Salesman self-registration
   with Qatar/India/Iraq/Syria/custom territory; invalid ownership rejection;
   peer isolation; unchanged closed/archive behavior; desktop/mobile rendering.
   Retain synthetic evidence without passwords, tokens or customer content.
7. Push/PR, any environment or Secret changes, owner-created Preview, Production
   migration and release each require their own applicable authorization. Never
   merge or deploy from this repair task.

Read-only policy inspection:

```sql
select policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'leads'
order by policyname;

select relrowsecurity, relforcerowsecurity
from pg_class where oid = 'public.leads'::regclass;

select version, name from supabase_migrations.schema_migrations
where name in ('lead_territory_options', 'lead_insert_policy_boundary')
order by version;
```

Do not restore the permissive legacy policy as an automatic rollback. If staging
acceptance fails, stop affected registration, preserve evidence and obtain a
reviewed forward repair. A database restore is a separate owner decision and
does not restore Storage file contents.
