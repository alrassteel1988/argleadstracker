# UAE Structural Steel Lead Intelligence

ARG Leads Tracker generates lead intelligence as a server-side, versioned workflow. The browser never receives AI provider keys, Supabase service-role keys, raw storage object keys, or privileged database errors.

## Configuration

Required server-side values:

- `OPENAI_API_KEY` and `OPENAI_LEAD_INTELLIGENCE_MODEL`, default `gpt-4.1-mini`.
- Lead Intelligence reports are created from uploaded Lead Intelligence summary PDFs in the lead edit form.
- `SUPABASE_LEAD_INTELLIGENCE_BUCKET`: private PDF bucket, default `lead-intelligence-reports`.
- `SUPABASE_SERVICE_ROLE_KEY`: required in production for the background worker to claim jobs and write private PDF objects.

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

Opening the Intel tab does not automatically spend provider tokens; upload a summary PDF from the lead edit form to populate the intelligence report.

Admin can reprocess an uploaded report by uploading a newer summary PDF for the same lead.

Each report upload triggers parsing, field extraction, and PDF generation/update in one request.

## Versioning and Retry

Upload creates a new report row. Completed report versions are preserved; only the latest completed report is marked current.

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
