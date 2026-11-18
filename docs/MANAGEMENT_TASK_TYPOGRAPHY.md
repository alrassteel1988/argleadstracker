# Management Task Drawer Typography

## Status And Scope

Visual repair on `codex/management-task-typography`, based on fetched `origin/main` at `41a8a75c26725be16aa3a57ea23ef3dba79c2a2d`. The user authorized a scoped commit and push on 18 November 2026. The resulting commit SHA, PR URL and automatic Vercel Preview status must be verified and recorded in the PR release evidence, not inferred from this document. The separate new-lead Activity log change, PR #72's database repair, PR #69 and PR #71 are excluded. Existing root-worktree changes were preserved.

The Salesman drawer mixed 13px row text with shared 14px controls/paragraphs, and the flexible action column could shrink to 70px, splitting or clipping Complete. The regression failed on the unchanged main runtime: `Consistent row typography at 1440px`, expected 1 font size, received 2.

## Changes

- `management-tasks.css`: drawer-scoped body/control/metadata sizes; equal-height status/action controls; a 90px drawer action column; a 122px status column; natural company-name wrapping; earlier stacked drawer layout at 1100px; mobile 44px controls and balanced two-column filter buttons. Expanded Admin rows now allocate most width to instructions and remarks, with a fixed 156px action column. Mobile actions wrap at their natural widths.
- `client.js`: the existing protected-initial-task explanation is rendered below the expanded content across the full row, instead of forcing the actions column to its max-content width. Labels, restrictions, IDs and handlers are unchanged.
- `index.html`: Management Tasks stylesheet revision `5-task-layout` and client revision `compact-admin-task-actions`.
- `sw.js`: cache revision `arg-pwa-v175-management-task-layout`; cache policy is unchanged.
- `tests/activity-dashboard-latest.test.js`, `tests/admin-dashboard-layout.test.js`, `tests/global-bauhaus-system.test.js`: matching cache revision assertions.
- `tests/ui/management-tasks.spec.js`: computed font consistency, matching control sizes, single-line Complete label, and no horizontal overflow at 1440, 1100, 1024, 901, 900, 768 and 375px, while retaining assignment/progress/completion tests. The same-lead duplicate-resolution test additionally checks compact Admin buttons at 1440, 1100, 900, 768, 720 and 375px, no clipped labels, and over 70% of desktop panel width available for the two text columns.

The new Admin regression reproduced the screenshot defect before the fix: at 1440px, action width was 866.265625px (expected at most 170px). The auto-sized third grid column was expanded by its long protection message. The corrected test passes at every listed width, and the existing removal/duplicate resolution permissions and audit views still pass.

Management Instructions and Salesman Remarks use equal-width desktop columns. Both preserve line breaks and wrap long text; neither is truncated or limited to a fixed height. On mobile they stack at equal full width. The cross-role test saves multi-line Salesman progress remarks, refreshes Admin, verifies the full persisted remarks and instructions, then checks equal widths and no text overflow at 1440, 1100, 900, 768 and 375px. Proof: `.tmp/admin-task-actions/after/admin-desktop/admin-task-saved-remarks-1440.png` and the matching `admin-mobile/admin-task-saved-remarks-375.png`.

## Verification

```powershell
$env:CRM_UI_SUITE='management-tasks'
$env:CRM_UI_TEST_PORT='4351'
$env:CRM_UI_ARTIFACT_DIR=Join-Path (Get-Location) '.tmp\task-typography-ui'
node C:/Users/Glory/Documents/argleadstracker/node_modules/playwright/cli.js test --config=playwright.ui.config.js --project=admin-desktop --grep 'assign, progress and complete'
node C:/Users/Glory/Documents/argleadstracker/node_modules/playwright/cli.js test --config=playwright.ui.config.js
$env:CRM_TEST_PGLITE_MODULE='C:\Users\Glory\Documents\argleadstracker\.worktrees\lead-registration-purpose\node_modules\@electric-sql\pglite'
npm run verify
git -c core.whitespace=cr-at-eol diff --check
```

The focused responsive browser regression and full repository verification passed. Desktop/mobile synthetic screenshots were inspected. The full Management Tasks browser suite passed: 7 passed and 9 intentional role/viewport-inapplicable skips. These commands use local synthetic fixtures only; machine-specific paths above identify the test runtimes, not production dependencies.

The full suite and `npm run verify` were rerun successfully after the Admin layout extension. Admin screenshots inspected: `.tmp/admin-task-actions/after/admin-desktop/admin-expanded-task-1440.png` and `.tmp/admin-task-actions/after/admin-mobile/admin-expanded-task-375.png`. Latest browser command used `CRM_UI_TEST_PORT=4391` and `CRM_UI_ARTIFACT_DIR=.tmp/admin-task-actions`.

## Safety And Remaining Gates

No backend, Supabase schema, data, permission, auth, RLS, file access or secret changes. No customer data or credentials were used in the screenshots. Earlier PR #72 staging records were not modified by these local tests. The existing server permissions, service-worker protection and management task audit behavior are preserved.

Commit/push is authorized for this UI-only fix. PR review, passing remote checks and hosted Preview inspection remain release gates. The agent must not merge or manually deploy/promote; the release owner performs the Production release. This fix requires no Supabase migration or environment-variable change. No Production release is authorized by this document.

For the human release, merge only this reviewed PR after its checks pass, confirm Vercel's Production deployment matches the merge commit, then refresh the CRM and expand an existing task read-only. Check equal Instructions/Remarks columns, full wrapped text, compact actions and mobile stacking. Do not send a reminder, edit a task or resolve a duplicate during a presentation-only smoke check. If the UI regresses, the release owner can revert this PR through a separate reviewed commit; there is no database rollback.
