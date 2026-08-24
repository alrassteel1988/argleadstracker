# Baseline, Design System, and Invariants

## Test Baseline Snapshot

Baseline commit: `d3ce2192790f62a2dbd6316bc80cf8777161b7ef` (`origin/main`), recorded 2026-08-24. [Git baseline verification performed in detached worktree]

Commands executed: `git fetch origin main`; `git worktree add --detach C:\tmp\argleadstracker-agent-baseline-d3ce219 origin/main`; `npm ci`; `npm run verify`.

| Phase | Result |
| --- | --- |
| Syntax check | Passed (`npm run check`) |
| Tests | Passed (`npm test`) |
| Build | Passed (`npm run build`) |

No known pre-existing verification failures as of `d3ce2192790f62a2dbd6316bc80cf8777161b7ef`.

This is a dated snapshot, not a permanent assertion. Refresh it whenever `origin/main` or the verification workflow materially changes. Before attributing a failure to a change, run the same test on this kind of clean baseline and on the change branch; report both results. Do not fix a demonstrated baseline failure during an unrelated task. [package.json; .github/workflows/verify.yml]

## Design System Source of Truth

| Concern | Source | Evidence |
| --- | --- | --- |
| Shared final theme/tokens | `bauhaus-global.css` | Shared Bauhaus tokens and final theme layer are defined there. [bauhaus-global.css; index.html] |
| Base typography/tokens | `styles.css`, font links in `index.html` | Inter and Plus Jakarta Sans are linked; base tokens are defined in CSS. [styles.css; index.html] |
| Feature styling | Named feature CSS files loaded root-relatively | Preserve stylesheet ordering and nested-route-safe root-relative paths. [index.html; vercel.json; tests/static-assets-security.test.js] |
| Component structure/behavior | `index.html`, `client.js` | Preserve IDs, event wiring, options, accessibility, and responsive behavior. [index.html; client.js] |
| System-wide spacing, border, button-state, chart conventions | TBD — requires owner confirmation | No separate approved component library or chart-convention document is verified. [styles.css; bauhaus-global.css] |

## Invariants That Must Not Regress

| Invariant | Enforcing implementation | Covering test | Evidence status | Change-approval requirement |
| --- | --- | --- | --- | --- |
| Voice-note storage keys are scoped by user and media retrieval requires visible-lead access | `server.js` voice-note storage/access helpers | `tests/voice-note-security.test.js` | Verified | Explicit owner approval, replacement protection, updated tests, and security impact |
| Private file signed URLs require server authorization and Storage RLS | `server.js`, Supabase helpers | `tests/supabase-authorization-boundary.test.js` | Verified | Same requirement |
| Lead-intelligence PDFs are fetched server-side through authorized route, not browser-redirected to signed URL | `server.js` lead-intelligence PDF route | `tests/lead-intelligence-api.test.js` | Verified | Same requirement |
| Voice-note local files stream through the application; configured remote voice notes/attachments use authorized signed URLs | `server.js` download handlers | `tests/voice-note-security.test.js` | Verified; remote attachment redirect behavior is distinct from PDF behavior | Same requirement |
| No fallback from an absent intelligence source field to another record is documented | TBD — implementation or owner policy not verified | TBD — requires test | TBD | Do not add fallback behavior without owner confirmation |
| CSP preserves self-only defaults and explicitly listed external origins | `vercel.json`, `src/config/securityHeaders.js` | `tests/security-headers.test.js` | Verified | Explicit owner approval and updated test |
| Inline scripts are controlled by CSP (`script-src` excludes `'unsafe-inline'`); inline styles are currently allowed | `vercel.json` | `tests/security-headers.test.js` | Verified | Explicit owner approval and updated test |
| Shipped UI asset changes require service-worker cache/version review | `sw.js` | `tests/activity-dashboard-latest.test.js`, stylesheet/PWA tests | Verified | Updated cache/version protection and tests when applicable |
| Authentication, role isolation, and caller-token Supabase access remain enforced | `server.js`, migrations | `tests/role-access.test.js`, `tests/lead-assignment-isolation.test.js`, `tests/supabase-authorization-boundary.test.js` | Verified | Explicit owner approval, replacement protection, updated tests, and security impact |
| Supabase business tables require RLS assumptions validated by migration tests | `supabase/migrations/`, server boundary | `tests/supabase-authorization-boundary.test.js` | Verified | Explicit owner approval and migration/security review |
