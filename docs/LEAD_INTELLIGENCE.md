# UAE Structural Steel Lead Intelligence

ARG Leads Tracker generates lead intelligence as a server-side, versioned workflow. The browser never receives OpenAI keys, Supabase service-role keys, raw storage object keys, or privileged database errors.

## Configuration

Required server-side values:

- `OPENAI_API_KEY`: enables the research provider call.
- `OPENAI_LEAD_INTELLIGENCE_MODEL`: model used for this workflow, default `gpt-4.1-mini`.
- `ENABLE_LEAD_INTELLIGENCE_AUTO_QUEUE`: `true` queues a report after each new lead is saved. Set `false` only when cost control requires manual generation.
- `SUPABASE_LEAD_INTELLIGENCE_BUCKET`: private PDF bucket, default `lead-intelligence-reports`.
- `SUPABASE_SERVICE_ROLE_KEY`: required in production for the background worker to claim jobs and write private PDF objects.
- `LEAD_INTELLIGENCE_SIGNED_URL_TTL_SECONDS`: short-lived PDF view/download URL TTL, default `600`.
- `LEAD_INTELLIGENCE_CRON_SECRET` or `CRON_SECRET`: bearer secret for `/api/cron/process-lead-intelligence`.

Apply `supabase/migrations/20260810093647_lead_intelligence_reports.sql` before enabling production generation. It creates `lead_intelligence_reports`, indexes, RLS policies, and the private storage bucket.

## Workflow

The implementation translates `uae-structural-steel-lead-intelligence@2026-08-10` into a server-side workflow module at `src/services/leadIntelligenceService.js`.

Input to the provider is allowlisted from CRM lead fields only:

- company/legal/trading name
- emirate, city, country, or territory
- website/domain
- general telephone and email
- category, sector, industry, or activity
- bounded known project context

Unrelated notes, commercial values, private contact data, credentials, and sales amounts are not included in the research request.

The AI provider must return structured JSON first. The server validates it, recomputes the official six-component score, normalizes unknowns to `Not publicly found`, preserves verified facts separately from inferences, and only then renders a deterministic PDF.

## Job Processing

Lead creation queues a `queued` report when `ENABLE_LEAD_INTELLIGENCE_AUTO_QUEUE=true`. Opening the Intel tab does not automatically spend provider tokens; it shows a Generate action if no report exists.

Process jobs with either authenticated admin access:

```powershell
$body = @{ limit = 1 } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "$BASE/api/admin/lead-intelligence/process" -Headers @{ Authorization = "Bearer $TOKEN" } -ContentType "application/json" -Body $body
```

Or with Vercel Cron/server secret:

```http
POST /api/cron/process-lead-intelligence
Authorization: Bearer <LEAD_INTELLIGENCE_CRON_SECRET>
Content-Type: application/json

{ "limit": 1 }
```

Each request processes at most 5 jobs. Keep the Vercel cron cadence conservative because each job performs cost-bearing web research and PDF generation.

## Backfill

Admin-only backfill queues existing leads idempotently. By default it skips leads that already have any intelligence history, so completed reports are not replaced accidentally.

```powershell
$body = @{ limit = 100 } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "$BASE/api/admin/lead-intelligence/backfill" -Headers @{ Authorization = "Bearer $TOKEN" } -ContentType "application/json" -Body $body
```

To intentionally refresh existing leads during backfill, include `refresh_existing = $true`.

## Versioning and Retry

Refresh creates a new report row. Completed report versions are preserved; only the latest completed report is marked current. A failed refresh records a sanitized error and leaves the previous successful PDF visible in the Intel tab.

Retry requires the failed report id and creates a new queued job. Duplicate button clicks return the active job instead of creating duplicates.

## PDF Access

PDFs are stored as private objects under a durable key. The client uses authenticated app endpoints:

- `GET /api/leads/:leadId/intelligence/pdf/:reportId`
- `GET /api/leads/:leadId/intelligence/pdf/:reportId?download=1`

In Supabase mode the server returns a short-lived signed URL after lead-level authorization. In local mode the PDF is streamed from `data/lead-intelligence`.

## Limitations

- Live research requires provider credentials and network access; tests mock provider responses.
- Production PDF storage requires the Supabase migration and service-role configuration.
- Do not mark reports completed manually. A report is completed only after schema validation, application-side score calculation, PDF generation, and private storage write all succeed.
- The report is based on public sources and must be commercially verified before outreach.