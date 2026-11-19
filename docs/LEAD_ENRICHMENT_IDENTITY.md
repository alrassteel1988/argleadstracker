# Lead Enrichment Identity And Manual Registration

## Scope

Separate fix on `codex/enrichment-identity-review`, based on released PR #72/main `6ef32d51afc51416776f8f43f0872ec4cfc80131`. PR #69 and PR #74 remain separate. No Production code, migration, historical backfill, role, permission or saved-activity changes are included. Hosted staging acceptance requires branch-only staging credentials before the first push/Preview.

## Root Cause And Reproduction

The previous automatic selector sorted search results and always returned the first result, even with zero identity evidence or only shared industry words. Place details were not independently revalidated. The form could rename the user's company, and cancelling a conflicting suggestion still applied non-conflicting/hidden fields. There was no supported manual registration opt-out, and pre-save plus post-save server enrichment could repeat a rejected lookup.

Synthetic regression first failed with actual `enriched` versus expected `not_found` for two unrelated fabrication/piling businesses. Real customer data is not used in fixtures or evaluation inputs.

## Rules

- Reuse existing company-name normalization/Jaro-Winkler helpers. Exact normalized names qualify; other candidates must retain every distinctive requested-name token and meet the conservative name score. Shared industry/location/legal terms alone cannot establish identity.
- Multiple eligible distinct Place IDs are ambiguous and return no automatic enrichment. Recheck the detailed result against the requested company, rather than trusting the search candidate's identity.
- A rejected result returns the requested name and `not_found` without another business's Place ID, address, website, phone, rating or coordinates. This is not legal-entity certification; aliases and uncertain/ambiguous names can require manual entry.
- Automatic form enrichment never renames the user's company. Explicitly choosing a business from the existing Places search remains an intentional selection and is unchanged.
- Cancel rejects the whole suggestion, including hidden identity fields. Cancelling is not a partial acceptance.
- New Admin/Salesman registration has an Automatic company lookup checkbox, initially checked. Turning it off invalidates timers/in-flight responses and restores fields applied by that unsaved lookup, preserving subsequent manual edits. Editing the name in manual mode preserves manually entered details; duplicate checks still run.
- Manual new registrations use existing `enrichment_source = manual` and valid `enrichment_status = pending`. The pre-save server lookup and background auto-enrichment job both honor the opt-out. This neither pretends the data was Google-verified nor weakens caller-token/RLS or duplicate protections.
- The new checkbox is scoped to registration. Existing Edit Lead controls/history remain unchanged; an existing manual record does not automatically run a lookup during editing. Explicit re-enrichment remains an intentional separate action.
- Admin task choices, Monday-Saturday/Dubai deadlines, one linked initial task and optional Salesman Step 3 remain PR #72 behavior.

## Files

`enrichment.js`, `client.js`, `server.js`, `index.html`, `styles.css`, `sw.js`; three cache assertions; existing enrichment tests; new form/server unit and Admin/Salesman browser regressions; `playwright.ui.config.js` and one verification script in `package.json`. No new dependency or migration.

## Verification Commands

```powershell
node tests/enrichment.test.js
node tests/lead-enrichment-form.test.js
npm run verify
$env:CRM_UI_SUITE='enrichment'
$env:CRM_UI_TEST_PORT='4541'
$env:CRM_UI_ARTIFACT_DIR=Join-Path (Get-Location) '.tmp\enrichment-ui'
node node_modules/playwright/cli.js test --config=playwright.ui.config.js
git -c core.whitespace=cr-at-eol diff --check
```

Local SQL verification uses the repo's pinned PGlite dependency. Browser fixtures are isolated from Production, use synthetic identities/data and block external business/provider traffic. New unit cases cover unrelated/ambiguous candidates, changed detail identity, cancellation, manual metadata clearing, stale response off/on races and both server enrichment entry points.

## Evidence And Remaining Gates

Backend/form regressions and the final full `npm run verify` rerun passed on 19 November 2026. The final browser rerun passed all eight cases across Admin/Salesman desktop/mobile (2.0 minutes), including saved read-back, optional blank Step 3, manual-name edits, preserved user website, pending-response rejection and Cancel without hidden Google identity. Initial browser runs exposed test-only assumptions: displayed Prospect uses option value NEW, mobile registration is reached through the tested Pipeline path, and a mutating test must not precede a helper asserting original fixture counts. These are corrected without changing stage rules, hiding product errors or weakening the existing fixture assertion. Hosted staging verification remains pending; local fixtures are not hosted acceptance proof.

Vercel refused to save branch overrides before the branch existed in the connected repository. That unsaved form was discarded, leaving all existing variables unchanged. Baseline-reference creation requires the owner's separate approval; the feature must not be pushed or signed into with inherited shared credentials. Saving the staging service-role key as a Secret for the exact new branch also requires action-time confirmation.

Source/client revision: `enrichment-identity-review`; service-worker revision: `arg-pwa-v179-enrichment-identity`. Future combinations must reconcile cache revisions, not overwrite another held feature's assets. Production deployment, merge and real-data changes require separate owner action/approval. Commit, push, PR/Preview and hosted acceptance are distinct states.
