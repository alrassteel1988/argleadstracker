# Architecture and Route Map

## Architecture Map

| Area | Verified implementation | Evidence |
| --- | --- | --- |
| Frontend | Static SPA CRM with browser-side rendering and a PWA shell. | [index.html; client.js; manifest.json; sw.js] |
| Backend/API | Node HTTP server serves API routes and local development. | [server.js; package.json] |
| Database | Supabase Auth/Postgres/RLS when configured; local JSON fallback for development. | [supabase-client.js; server.js; supabase/migrations/] |
| Authentication/authorization | Supabase Auth or local sessions; caller-token Supabase requests and service-role allowlist. | [server.js; docs/API_AUTHORIZATION_MATRIX.md; tests/supabase-authorization-boundary.test.js] |
| File storage | Supabase Storage for configured attachments/intelligence reports; local fallback in development. | [server.js; src/services/voiceNoteSecurityService.js; docs/LEAD_INTELLIGENCE.md] |
| Email | No transactional email provider is verified; follow-up email output is an editable manual-send draft. | [server.js; src/services/companyAiActionService.js] |
| AI | OpenAI supports transcription, normalization, PMR analysis, summaries, and lead intelligence; Anthropic supports configured enrichment/agent actions. | [server.js; src/services/leadIntelligenceService.js; src/services/agentService.js; src/config/integrations.js] |
| Deployment | Vercel routes API requests to `server.js`, serves static files, and configures cron routes. | [vercel.json] |
| Authoritative configuration | Runtime integrations, contact rules, security headers, Vercel routing, and Supabase migrations live in the named source/configuration paths. | [src/config/integrations.js; src/config/contactRules.js; src/config/securityHeaders.js; vercel.json; supabase/migrations/] |

Environment-variable names are documented in `.env.example` and runtime code. Use names only, never values: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_PLACES_API_KEY`, `HUNTER_API_KEY`, `NEWS_API_KEY`, `ZAWYA_API_KEY`, `ERP_API_KEY`, `APP_SESSION_SECRET`, `CRON_SECRET`, and `RATE_LIMIT_HASH_SECRET` are examples. [.env.example; server.js; src/config/integrations.js]

## Route Inventory

| Route family | Purpose | Allowed roles | Dependencies | Mobile-critical |
| --- | --- | --- | --- | --- |
| `/` | SPA entry/login | Anonymous login; authenticated CRM | `index.html`, `client.js`, auth APIs | Yes. [index.html; README.md] |
| `/leads/:id` | Nested SPA lead detail | Authenticated user with visible lead | SPA fallback, lead API, RLS | Yes. [vercel.json; docs/API_AUTHORIZATION_MATRIX.md; README.md] |
| `/api/health`, `/api/supabase-config` | Health/public client configuration | Anonymous | Server/Supabase public settings | TBD — requires owner confirmation. [docs/API_AUTHORIZATION_MATRIX.md] |
| `/api/auth/*` | Login/session lifecycle | Login anonymous; session routes authenticated | Supabase Auth/local session | Yes. [docs/API_AUTHORIZATION_MATRIX.md; server.js] |
| `/api/leads*` | Leads, stages, duplicates, handoffs, deletion requests | Salesperson RLS-visible/self-create; leadership broader scope | Leads, profiles, activities, RLS | Yes. [docs/API_AUTHORIZATION_MATRIX.md; tests/role-access.test.js] |
| `/api/activities`, activity attachment routes | Activities, reminders, attachments | Visible-lead access; own authorized activity edit; leadership scope | Lead activities, Storage/RLS | Yes. [docs/API_AUTHORIZATION_MATRIX.md; README.md] |
| PMR/voice/transcription routes | PMRs, voice notes, protected retrieval, transcript/analysis | Authenticated visible-lead/self-upload scope | PMRs, private Storage, OpenAI when configured | Yes. [docs/API_AUTHORIZATION_MATRIX.md; server.js; README.md] |
| Weekly-report routes | Draft, submit, review, history | Salesperson own report; leadership review/all | Weekly-report tables/events | TBD — requires owner confirmation. [docs/API_AUTHORIZATION_MATRIX.md] |
| AI routes | Summaries, company actions, salesperson actions, read-only data agent, assistant drafts | Authenticated visible-record scope; leadership as documented | AI services, audit/rate-limit tables | TBD — requires owner confirmation. [docs/API_AUTHORIZATION_MATRIX.md; README.md] |
| Admin routes | Users, configuration agent, imports, settings | User/config/import routes are admin-only | Supabase Auth Admin API, configuration/audit data | TBD — requires owner confirmation. [docs/API_AUTHORIZATION_MATRIX.md] |
| Export routes | XLS/PDF lead/pipeline exports | Admin export is tested; exact broader leadership behavior TBD | RLS-visible lead data, generated files | TBD — requires owner confirmation. [docs/API_AUTHORIZATION_MATRIX.md; tests/admin-salesman-permissions.e2e.test.js] |
| Market/enrichment/ERP routes | Intelligence, news, search URL, ERP validation, enrichment | Authenticated; refresh/admin behavior as documented | Configuration-gated services | TBD — requires owner confirmation. [docs/API_AUTHORIZATION_MATRIX.md; src/config/integrations.js] |
| `/api/cron/*` | Scheduled market/lead-intelligence processing | Signed cron only | Vercel cron, allowlisted service-role actions | No. [vercel.json; docs/API_AUTHORIZATION_MATRIX.md] |
