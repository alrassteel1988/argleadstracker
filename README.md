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
- Local Node API with JSON persistence in `data/db.json`
- Seed salesmen and sample leads

## Authentication setup

The administrator account is created once from server-only environment variables. Salesmen cannot create accounts. After the administrator signs in, use `Create Salesman Account` in the top bar to add salesman credentials.

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

## Production note

This version is ready for local team testing. For true multi-user production access, move credentials and CRM records to a durable hosted database with a production authentication provider so office users and salesmen share records securely online.
