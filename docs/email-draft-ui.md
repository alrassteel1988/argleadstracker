# Draft Email UI Checkpoint

Implementation checkpoint: this work was first verified locally on
`codex/crm-ui-proposal-inventory`, before publication was authorized. No email
was sent and no deployment was performed. The subsequent publication handoff
is documented in `docs/meeting-email-release.md`.

## Delivered Behavior

- AI Actions and company email actions open the dedicated editable composer.
- Only caller-visible companies can be selected. Generation is explicit and
  reuses the existing company AI endpoint and its truthful fallback label.
- To, optional CC, subject and body are editable. Regeneration and company
  replacement confirm before discarding edits. Tone changes greeting/sign-off
  only. Edits remain in memory, not a durable CRM draft store.
- Download produces an unsent multipart `.eml`, with optional company profile.
  Nothing is sent, no activity is logged and no reminder or cadence is changed.
- The supplied eight-page PDF is copied without alteration. SHA-256:
  `08ebefa2fbfb7604e3d896d64414a2e251d4e265d0e307c77d4bea8c8f021193`.
- The 11,559,067-byte PDF is not public or part of the service-worker shell.
  `/api/leads/:id/email-profile?part=N` requires the existing authentication,
  rate limiting and visible-lead checks. Bounded 1 MiB responses are private,
  no-store, and avoid a single oversized serverless response. The browser
  assembles the MIME attachment only after explicit download.
- No stock-list attachment is offered because none was supplied.

## Changed Files

`client.js`, `crm-dashboard.css`, `index.html`, `server.js`, `sw.js`,
`vercel.json`, `src/services/emailProfileService.js`,
`assets/email/Al Ras Group - Company Profile.pdf`,
`tests/activity-dashboard-latest.test.js`, `tests/admin-dashboard-layout.test.js`,
`tests/global-bauhaus-system.test.js`, `tests/crm-ai-workspace.test.js`,
`tests/static-assets-security.test.js`, `tests/ui/ai-workspace.spec.js`,
`tests/ui/fixture-server.js`, and this checkpoint. Previously modified meeting
tests, open questions and unrelated untracked files were preserved.

## Verification

- `node tests/crm-ai-workspace.test.js`: passed, including MIME byte round-trip,
  Unicode subject encoding, header-injection rejection, exact PDF assembly,
  generation error preservation and stale-company response isolation.
- `npm run verify`: passed (syntax, authentication/loading, tests, UI tokens,
  build). No database migration or environment change is required.
- `$env:CRM_UI_TEST_PORT='4962'; npm run test:ui:ai-workspace`: 20 passed.
- `$env:CRM_UI_TEST_PORT='4970'; npm run test:ui:meeting`: 12 passed.
- Final focused check: set `CRM_UI_TEST_PORT=4963` and
  `CRM_UI_SUITE=ai-workspace`, then run
  `node node_modules/playwright/cli.js test --config=playwright.ui.config.js --grep 'Draft Email downloads'`:
  4 passed after the final mobile spacing and CC-label changes.
- `git diff --check`: passed. Initial browser checks found a mobile textarea
  height override (84.78125 px versus >=350 px) and an existing background
  pipeline-health request in a no-send assertion; the scoped height override
  and precise request classification were corrected before the passing run.
- Browser verification used isolated synthetic users and records, with external
  providers disabled. Authenticated out-of-scope and anonymous PDF requests
  were denied. Downloaded PDF bytes match the supplied source exactly.

## Limitations

No real email was sent. Actual Outlook, Apple Mail or other mail-client import,
edit and sending behavior is not verified. Some clients open `.eml` read-only
and require Edit/Forward. The attached draft is about 16 MB; mailbox limits
apply. Production packaging and hosting behavior remain unverified because no
deployment is authorized. There are no implementation blockers; those live
environment/client checks remain release acceptance steps.

Synthetic local preview: `http://127.0.0.1:4192/?view=draft-email`.

## Mobile Reference Follow-Up

The same branch now uses the supplied mobile references: company-first header,
Back and icon-only regeneration, compact provenance/change/open context row,
tone segments above the editor, profile checkbox chip below the body, and fixed
48 px Copy/Download actions. The title is 21 px. Details remain available in a
collapsed disclosure; the visible note states the actual draft-only behavior.
The absent stock-list and unimplemented send/log/reset claims are not added.

The existing controls are reparented across the 700 px breakpoint rather than
duplicated. Their values, disabled state, single attachment selection and
edited content are preserved. Desktop retains its sidebar controls and normal
flow footer. No API, database, authorization, document or provider changes were
made in this mobile follow-up. Service-worker revision is
`arg-pwa-v130-email-mobile-reference`.

Follow-up scope: `client.js`, `crm-dashboard.css`, `index.html`, `sw.js`, the
three cache-version tests, `tests/ui/ai-workspace.spec.js`, and this checkpoint.
Branch remains `codex/crm-ui-proposal-inventory`; no commit was created.
`node tests/crm-ai-workspace.test.js`, `npm run verify` and `git diff --check`
passed. The focused four-profile email test command, using ports 4964/4965,
checks responsive control relocation, fixed-action geometry, preservation on
resize, exact PDF MIME bytes, access denial and error recovery. Full hosting
deployment and real mail-client import remain unperformed as above.
The final mobile-only rerun uses port 4967 and both `admin-mobile` and
`salesman-mobile` projects. The Assistant launcher is hidden on this mobile
composer, preventing a normal-flow button from appearing behind the fixed
action bar; it remains available on desktop and the AI Actions page. Physical
device and software-keyboard testing were not performed.
