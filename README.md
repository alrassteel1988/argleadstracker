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
- Mobile voice-note recording with OpenAI Whisper speech-to-text transcription
- Required email and password sign-in
- Administrator-only salesman account creation
- Supabase Auth and durable Postgres persistence when configured
- Local JSON fallback in `data/db.json` for offline development
- Seed salesmen and sample leads
- Google Places business discovery and Hunter domain email enrichment

## Supabase setup

Run [supabase/migrations/20260602154500_create_lead_enrichment_backend.sql](supabase/migrations/20260602154500_create_lead_enrichment_backend.sql) in the Supabase SQL editor or apply it with the Supabase CLI. It creates:

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

Get the Supabase URL from `Project Settings > API > Project URL`. Get the publishable or legacy anon key from `Project Settings > API Keys`. Get the service-role key from the server-side secret keys area and store it only in Vercel environment variables or your private local `.env`.

Enable `Places API (New)` in Google Cloud and restrict the Google key to the server deployment. Hunter enrichment uses Hunter's Domain Search endpoint and requires a Hunter API key.

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

Voice notes are recorded in the browser and uploaded to the local backend. The backend calls OpenAI, so the API key is never exposed in frontend code.

Set these server environment variables before starting:

```powershell
$env:OPENAI_API_KEY="your_openai_api_key"
$env:OPENAI_TRANSCRIPTION_MODEL="gpt-4o-mini-transcribe"
npm start
```

On mobile:

1. Open a lead and tap `Record Voice Note`.
2. Allow microphone access.
3. Speak, then tap `Stop Recording`.
4. Review and edit the transcript before saving the activity.

The Add Lead form also supports recording directly into the notes field. Recordings are limited to two minutes in the browser and 20 MB on the backend.

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
- `POST /api/transcriptions`
- `POST /api/places/search`
- `PATCH /api/leads/:id`
- `DELETE /api/leads/:id`
- `POST /api/leads/:id/enrich`

## Production note

Use Supabase in production. The JSON fallback is for offline development only because Vercel function filesystems are ephemeral.
