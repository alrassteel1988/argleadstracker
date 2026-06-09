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
- CRM reminders for quotation follow-ups, planned visits, important dates, payment follow-ups, sample approvals, and general follow-ups
- Google Calendar add-to-calendar links for each reminder
- Mobile voice-note recording with OpenAI Whisper translation into English text
- Required email and password sign-in
- Administrator-only salesman account creation
- Supabase Auth and durable Postgres persistence when configured
- Local JSON fallback in `data/db.json` for offline development
- Seed salesmen and sample leads
- Automatic Google Places business enrichment when a company name is entered
- Google Places business discovery and Hunter domain email enrichment

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
```

Get the Supabase URL from `Project Settings > API > Project URL`. Get the publishable or legacy anon key from `Project Settings > API Keys`. For `SUPABASE_SERVICE_ROLE_KEY`, use the JWT-format legacy `service_role` key for this project (it starts with `eyJ...` and has three dot-separated parts). Store it only in Vercel environment variables or your private local `.env`; do not use the short `sb_secret_...` key with this Node server.

Enable `Places API (New)` in Google Cloud and restrict the Google key to the server deployment. Store `GOOGLE_PLACES_API_KEY` only as a server/Vercel environment variable. It is never sent to `client.js` or browser code.

Google Places enrichment uses Text Search (New) to find the best company match, then Place Details (New) to populate available CRM fields: business name, website, phone, formatted address, Google Maps URL, business category/types, opening hours, rating, and review count. Google Places does not provide full legal name, year established, company email, or detailed products/services. Those fields are left blank when unavailable, and the lead remarks include `Not available from Google Places API`.

Automatic enrichment runs when a company name is typed in the Add Lead form and again server-side when a new lead is saved. The browser debounces requests and caches duplicate company/location lookups. Existing manually edited fields are not overwritten unless the user confirms. Enrichment statuses are `pending`, `enriched`, `partial`, `failed`, and `not_found`.

Hunter enrichment uses Hunter's Domain Search endpoint and requires a Hunter API key.

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

Items intentionally left for later integration are true Claude tool-use, market intelligence feeds such as MEED/Zawya, map pins, push notifications, offline IndexedDB sync, route optimisation, WhatsApp integration, quotation module, and inventory visibility. The brief explicitly says not to build WhatsApp, quotation, inventory, native mobile apps, gamification, complex approvals, or route optimisation inside this app.
