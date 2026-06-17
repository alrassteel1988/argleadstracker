# ARG Leads Tracker

Shared CRM web app for ARG sales teams. The same local platform can be opened from desktop browsers and mobile browsers, so salesmen and office users work from the same lead records.

## Run locally

```powershell
npm start
```

Then open:

```text
http://127.0.0.1:3000
```

On another phone connected to the same network, use the computer's local IP address with port `3000`.

## What is included

- Responsive web and mobile CRM interface
- Lead list, search, stage filter, salesman filter
- Lead detail panel with stage updates and activity logging
- Add lead form with ARG sales workflow fields
- Blueprint-aligned company fields: sector, tier, GCC territory, primary and secondary contacts, tags, ERP quotation reference, monthly volume, and first order date
- Six relationship statuses only: `PROSPECT`, `OUTREACH`, `ENGAGED`, `SAMPLING`, `ACTIVE`, `DORMANT`
- Fuzzy duplicate prevention during company creation
- Relationship health indicator on company cards and detail pages
- Structured Post-Meeting Report filing linked to company activity
- PMR voice-note attachment with browser recording, preview, delete, re-record, and activity playback
- One-click relationship intelligence actions grounded in the company record, activity log, and latest PMR
- Salesman home-screen Daily AI briefing for focus priorities, neglected accounts, pipeline health, and new market intelligence
- CRM reminders for quotation follow-ups, planned visits, important dates, payment follow-ups, sample approvals, and general follow-ups
- Google Calendar add-to-calendar links for each reminder
- Mobile voice-note recording with OpenAI Whisper translation into English text
- Required email and password sign-in
- Administrator-only salesman account creation
- Administrator-only CSV bulk import with column mapping, duplicate handling, validation preview, template download, and error report
- Administrator-only Configuration Agent with proposal review, password-confirmed applies, and audit trail
- Supabase Auth and durable Postgres persistence when configured
- Local JSON fallback in `data/db.json` for offline development
- Seed salesmen and sample leads
- Automatic Google Places business enrichment when a company name is entered
- Google Places business discovery and Hunter domain email enrichment
- Installable mobile PWA shell with service-worker app caching, iOS home-screen metadata, mobile bottom navigation, and Quick Log activity capture
- Device-local outbox for quick activity logs when connectivity drops, with pending sync status and retry visibility

## Supabase setup

Run the SQL migrations in [supabase/migrations](supabase/migrations) in filename order in the Supabase SQL editor or apply them with the Supabase CLI. They create and maintain:

- `profiles`
- `companies`
- `leads`
- `contacts`
- `search_history`
- `enrichment_status`
- Auth profile trigger, grants, updated-at triggers, and RLS policies

Configure these server environment variables:

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY="your_publishable_or_anon_key"
$env:SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
$env:GOOGLE_PLACES_API_KEY="your_google_places_key"
$env:HUNTER_API_KEY="your_hunter_key"
$env:ANTHROPIC_API_KEY="your_anthropic_key"
$env:ANTHROPIC_MODEL="claude-sonnet-4-6"
$env:ENABLE_CLAUDE_ENRICHMENT="true"
$env:ENABLE_ANTHROPIC_WEB_SEARCH="true"
$env:ENABLE_AI_AGENT="true"
$env:ZAWYA_API_KEY="optional_zawya_key"
$env:ZAWYA_API_URL="optional_zawya_feed_url"
$env:ERP_API_BASE_URL=""
$env:ERP_API_KEY=""
```

Get the Supabase URL from `Project Settings > API > Project URL`. Get the publishable or legacy anon key from `Project Settings > API Keys`. For `SUPABASE_SERVICE_ROLE_KEY`, use the JWT-format legacy `service_role` key for this project (it starts with `eyJ...` and has three dot-separated parts). Store it only in Vercel environment variables or your private local `.env`; do not use the short `sb_secret_...` key with this Node server.

Enable `Places API (New)` in Google Cloud and restrict the Google key to the server deployment. Store `GOOGLE_PLACES_API_KEY` only as a server/Vercel environment variable. It is never sent to `client.js` or browser code.

Google Places enrichment uses Text Search (New) to find the best company match, then Place Details (New) to populate available CRM fields: business name, website, phone, formatted address, Google Maps URL, business category/types, opening hours, rating, and review count. Google Places does not provide full legal name, year established, company email, or detailed products/services. Those fields are left blank when unavailable, and the lead remarks include `Not available from Google Places API`.

Automatic enrichment runs when a company name is typed in the Add Lead form and again server-side when a new lead is saved. The browser debounces requests and caches duplicate company/location lookups. Existing manually edited fields are not overwritten unless the user confirms. Enrichment statuses are `pending`, `enriched`, `partial`, `failed`, and `not_found`.

Hunter enrichment uses Hunter's Domain Search endpoint and requires a Hunter API key.

## Mobile PWA setup

The CRM includes an installable PWA layer for field use:

- [manifest.json](manifest.json) defines the app name, portrait standalone display, icons, and shortcuts for `Log activity` and `Today's focus`.
- [sw.js](sw.js) precaches the app shell and icons, caches Google Maps assets with stale-while-revalidate, and deliberately leaves `/api/*` calls as network-only.
- The mobile bottom navigation uses five tabs: Home, Leads, Log, Map, and Alerts. `Log` opens the Quick Log bottom sheet directly.
- The Quick Log sheet supports recent-company chips, assigned-lead search, optional GPS nearby-company assist, activity type selection, quick phrases, quotation/order fields, and optional next-action date.
- If the browser is offline or a network write fails, Quick Log saves the activity into an IndexedDB outbox. The sync pill shows offline/pending/syncing/failed states, and the Alerts tab opens the pending changes sheet.
- AI actions are disabled while offline because AI/API calls are never cached or queued.

Push notification delivery is scaffolded with [firebase-messaging-sw.js](firebase-messaging-sw.js), but full Firebase Cloud Messaging requires Firebase project config, a VAPID key, and server-side senders. The current production app remains Supabase/Node-based, so this phase implements the PWA shell and in-app pending alert surface without silently introducing a separate Firebase backend.

## Multi-user architecture

Run [supabase/migrations/20260612120000_multi_user_architecture.sql](supabase/migrations/20260612120000_multi_user_architecture.sql) after the earlier migrations. It enforces territory visibility at the database level, adds immutable `handoff_logs`, creates pending handoff `notifications`, and updates RLS policies for leads, PMRs, profiles, and handoff history.

Territory values are `UAE-North`, `UAE-South`, `Saudi`, `Kuwait`, `Bahrain`, `Oman`, and `Mixed`. Salesmen see non-empty leads in their own territory. `Mixed` leads are visible to leadership and to the specifically assigned salesman. Leads with a blank territory are leadership-only.

When an admin, director, or manager changes a lead's assigned salesman, the app requires a handoff note of at least 20 characters before saving. The server writes the lead reassignment, an activity entry, an immutable handoff log, and a pending notification for the new owner when an owner user ID is available.

Duplicate detection uses Jaro-Winkler matching in [src/utils/fuzzyMatch.js](src/utils/fuzzyMatch.js). The Add Lead form checks after four characters with a 500ms debounce, and CSV import preview flags similar/probable duplicates before import.

## Phase 5 external integrations

Run [supabase/migrations/20260612100000_phase5_external_integrations.sql](supabase/migrations/20260612100000_phase5_external_integrations.sql) to add `auto_enrichment`, coordinates, `integration_logs`, `market_intelligence`, and archive storage.

Phase 5 integrations are independent services. If Google Places, Claude, market intel, or ERP lookup is unavailable, the CRM still saves leads and logs activities. Integration failures are written to `integration_logs` when the table exists.

- Company auto-enrichment: lead creation still uses server-side Google Places. After save, the server attempts Claude business intelligence with `ANTHROPIC_API_KEY` and stores draft data in `auto_enrichment` with status `pending_review`. Salesmen/admins can confirm or re-enrich from the lead detail view. Claude keys are never exposed to browser code.
- Enrichment review: pending Claude intelligence is shown in a review table. Users can apply individual fields or apply all trusted fields. Confirmed data can populate sector, scale, revenue band, key personnel, recent projects, certifications, likely steel products, likely competitors, and remarks.
- LinkedIn contact search: the lead detail view builds a normal LinkedIn people search URL for eight GCC steel industry titles. It does not use or automate the LinkedIn API.
- AI database agent: the dashboard includes a collapsed `Ask the database` panel. It uses Claude tool-use through `/api/agent/query`, is read-only, logs queries to `agent_query_log`, and only receives records visible to the signed-in user.
- Configuration Agent: admins can request safe CRM option changes, such as adding territories, lead priorities, sectors, or activity types. The agent generates a proposal first; applying the change requires the admin password and writes to `configuration_audit_log`. Run [supabase/migrations/20260616120000_configuration_agent_audit.sql](supabase/migrations/20260616120000_configuration_agent_audit.sql) before using it with Supabase.
- Market intelligence: admins can refresh the feed from the dashboard when `ZAWYA_API_KEY` and `ZAWYA_API_URL` are configured. Items are matched to companies by sector, geography, and company mention. Salesmen see items matching their visible portfolio.
- ERP quotation lookup: activity logging supports an optional quotation reference. The current ERP service is a read-only stub and validates any non-empty reference until Al Ras confirms ERP API details.

Run [supabase/migrations/20260612130000_external_integrations_agent.sql](supabase/migrations/20260612130000_external_integrations_agent.sql) to add the confirmed enrichment columns and `agent_query_log` table.

## One-click AI company actions

Run [supabase/migrations/20260612140000_one_click_ai_actions.sql](supabase/migrations/20260612140000_one_click_ai_actions.sql) to add `ai_action_log`, `ai_action_log.scope`, and `attention_flags`.

The company detail page includes five one-click actions:

- `Prepare Me For This Meeting`
- `What Should I Do Next?`
- `Draft Follow-Up Email`
- `Summarise Relationship`
- `Flag Needs Attention`

The first four actions call `/api/leads/:id/ai-actions` from the server only. The server assembles a grounded context bundle from the company record, last 20 activities, latest PMRs, matched market intelligence, and handoff history, then uses `ANTHROPIC_API_KEY` when configured. If Claude is disabled locally, the app returns a safe CRM-data fallback so the UI can still be tested. Every AI action is logged and rate limited to 20 actions per user per 10 minutes.

`Flag Needs Attention` is not an AI call. It writes an `attention_flags` record with a company snapshot and latest PMR snapshot, adds a `Flagged for Attention` activity to the lead, and shows open alerts in the admin dashboard. Admins/directors/managers can acknowledge or resolve flags; salesmen can only create and view their own flags through RLS.

## One-click AI salesman home actions

Salesman dashboards include a Daily AI briefing bar with four portfolio-level actions:

- `What should I focus on today?`
- `Who have I neglected?`
- `My pipeline health`
- `New intel`

These actions call `POST /api/salesperson-ai-actions`. The browser sends only the action name; the server derives the caller from the authenticated session and builds a portfolio bundle from records visible to that user. Salesmen cannot request another salesman's portfolio from the client.

The `pipeline_health` action returns a native metrics panel with stage counts, overdue next actions, contact-overdue count, and this-month activity trend. It auto-runs once per day per browser as a collapsed summary and is exempt from the AI rate limit. The other actions return grounded markdown from Claude when `ANTHROPIC_API_KEY` and `ENABLE_CLAUDE_ENRICHMENT=true` are configured, or safe CRM-data fallbacks during local/offline testing. Company names in the AI result are tappable and open the matching lead record.

Expected contact frequency is centralized in [src/config/contactRules.js](src/config/contactRules.js): Tier 1 accounts use tighter thresholds, Tier 3 accounts use relaxed thresholds, and the same rules feed relationship health and neglected-account AI logic.

## CSV lead import

Admins can use `Import Leads` in the top bar to upload an Excel-exported `.csv` file. The wizard validates file type and size, auto-maps common column headers, previews the first rows, warns about invalid email/phone/date/value fields, detects duplicate company names, and imports up to 500 rows per batch. Salesmen and managers cannot see or use this importer.

Run `supabase/migrations/20260610143000_add_lead_import_audit_columns.sql` in Supabase to store `imported_at` and `imported_by` on imported leads. The combined `RUN_ALL_IN_SUPABASE_SQL_EDITOR.sql` file also includes this migration at the end.

## Authentication setup

When Supabase is configured, create the first administrator in Supabase Auth and set `app_metadata.role` to `admin`. The migration trigger creates the matching profile. Salesmen cannot create accounts. After the administrator signs in, use `Create Salesman Account` in the top bar to add salesman credentials through the server-only service role.

For the required administrator, create `glory@alrassteel.com` in `Supabase Dashboard > Authentication > Users`, then run [supabase/bootstrap-admin.sql](supabase/bootstrap-admin.sql) once in the SQL editor. Do not put the password in SQL or commit it.

Without Supabase variables, the local fallback administrator account is created once from server-only environment variables:

For the first server start:

```powershell
$env:ADMIN_EMAIL="glory@alrassteel.com"
$env:ADMIN_BOOTSTRAP_PASSWORD="choose_a_strong_bootstrap_password"
$env:APP_SESSION_SECRET="generate_a_long_random_secret"
npm start
```

The server stores a salted password hash in `data/db.json`. After the first successful start, remove `ADMIN_BOOTSTRAP_PASSWORD` from the environment. Keep `APP_SESSION_SECRET` private and stable so active sessions can be verified.

## Voice transcription setup

Voice notes are recorded in the browser and uploaded to the backend. The backend calls OpenAI's audio translation endpoint with `whisper-1`, then runs an English normalization pass with `gpt-4.1-mini`. This keeps Tagalog and other supported spoken languages from being saved as source-language notes. The API key is never exposed in frontend code.

Set these server environment variables before starting:

```powershell
$env:OPENAI_API_KEY="your_openai_api_key"
$env:OPENAI_TEXT_MODEL="gpt-4.1-mini"
npm start
```

On mobile:

1. Open a lead and tap `Record Voice Note`.
2. Allow microphone access.
3. Speak, then tap `Stop Recording`.
4. Review and edit the English transcript before saving the activity.

The Add Lead form also supports recording directly into the notes field. Recordings are limited to two minutes in the browser and 20 MB on the backend.

## AI-assisted PMR voice notes

The `File PMR` form includes `Record Voice Note`, `Delete Recording`, and an audio preview. After recording stops, the backend transcribes the meeting voice note into English, analyzes the transcript, and drafts the PMR fields for review:

- Products discussed
- Competitors mentioned
- Compliance requirements
- PMR notes
- First order timing
- Potential annual value
- Relationship heat
- Director action
- Account status

The user can edit all drafted PMR fields before saving. The recording is uploaded only when the PMR is saved, then linked to the PMR record and the activity timeline entry. The original AI transcript is also saved with the PMR and can be reviewed from the lead activity timeline or the full activity log.

Browser recording requires a secure origin. It works on `localhost` for development and on the HTTPS Vercel deployment. PMR audio attachments are limited to two minutes in the browser and 20 MB on the backend.

Optional PMR analysis model override:

```powershell
$env:OPENAI_PMR_ANALYSIS_MODEL="gpt-4.1-mini"
```

## Google Calendar reminders

Lead creation automatically converts the `Next action` and `Next action date` into a CRM reminder. Salesmen can also open a lead and use `Schedule Reminder` for quotation follow-ups, planned visits, important dates, payment follow-ups, sample approvals, or general follow-ups.

Reminders are saved as structured lead activities and appear in the lead detail view and Activity page. Each reminder includes an `Add to Google Calendar` link that opens Google Calendar with the customer, date/time, and required activity prefilled.

This does not silently write into a salesman's private Google Calendar account. Full automatic Google Calendar sync requires Google OAuth consent per salesman, or Google Workspace domain-wide delegation managed by your company administrator.

## Overdue follow-up banner

The app shows a persistent red overdue follow-up banner below the top bar when the signed-in user has overdue lead next actions or overdue reminder activities. Salesmen see only their own assigned overdue items because `/api/leads` is role-scoped. Admin users see the full count with a per-salesman breakdown.

The dismiss button hides the banner only for the current browser session. A fresh login clears the dismissal flag. `View All` opens Pipeline with an overdue-only filter for salesmen; `View Report` opens the Activity view for admins. When only one item is overdue, `Open Lead` opens the lead drawer directly.

If your Supabase project has a normalized `public.activities` table, run [supabase/migrations/20260610120000_add_activity_completed_at_for_overdue_banner.sql](supabase/migrations/20260610120000_add_activity_completed_at_for_overdue_banner.sql) or the combined runner to add the nullable `completed_at` column and an index for open reminder due dates. Deployments using the existing `public.leads.activities` JSONB field do not need a schema change for the banner.

## Lost reason capture

When a lead is moved to the Lost pipeline stage, the CRM opens a structured Lost Reason modal before saving. This applies to Kanban drag-and-drop, the lead drawer stage selector, the legacy detail stage selector, and the Edit Lead form. Users can either choose a primary reason and optional competitor/notes, or use `Skip for now` to mark the lead lost without a reason.

Captured fields:

- `lost_reason`
- `lost_reason_detail`
- `lost_competitor`
- `lost_at`
- `lost_by`

Run [supabase/migrations/20260610130000_add_lost_reason_fields.sql](supabase/migrations/20260610130000_add_lost_reason_fields.sql) in Supabase SQL Editor, or rerun the combined [RUN_ALL_IN_SUPABASE_SQL_EDITOR.sql](supabase/migrations/RUN_ALL_IN_SUPABASE_SQL_EDITOR.sql), before relying on these columns in production reports. Admin exports include the loss fields, and the dashboard shows a Loss Reasons chart when at least three lost leads have captured reason data.

## API routes

- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/users` administrator only
- `POST /api/users` administrator only
- `GET /api/settings`
- `GET /api/leads`
- `POST /api/leads`
- `PATCH /api/leads/:id/stage`
- `POST /api/leads/:id/activities`
- `GET /api/leads/:id/pmrs`
- `POST /api/leads/:id/pmrs`
- `POST /api/leads/:id/ai-actions`
- `POST /api/salesperson-ai-actions`
- `GET /api/attention-flags`
- `PATCH /api/attention-flags/:id`
- `POST /api/leads/:id/attention-flags`
- `POST /api/pmr-voice-notes`
- `GET /api/pmr-voice-notes/:id`
- `POST /api/transcriptions`
- `POST /api/pmrs/analyze-transcript`
- `POST /api/places/search`
- `POST /api/leads/enrich-company`
- `PATCH /api/leads/:id`
- `DELETE /api/leads/:id`
- `POST /api/leads/:id/enrich`

## Production note

Use Supabase in production. The JSON fallback is for offline development only because Vercel function filesystems are ephemeral.

## Blueprint scope note

The current implementation now covers the practical Phase 1 foundation from `alras_lead_tracker_brief_v2`: company-centric records, exact status values, assignment, duplicate prevention, append-style activity logging, PMR structure, relationship health, and one-click relationship intelligence outputs.

Items intentionally left for later integration are live paid market intelligence feeds such as MEED/Zawya, map pins, push notifications, offline IndexedDB sync, route optimisation, WhatsApp integration, quotation module, and inventory visibility. The brief explicitly says not to build WhatsApp, quotation, inventory, native mobile apps, gamification, complex approvals, or route optimisation inside this app.
