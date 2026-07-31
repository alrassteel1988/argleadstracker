# API Authorization Matrix

This document is the authorization contract for the ARG Leads Tracker server.
It accompanies migration `20260730150000_enforce_user_scoped_rls.sql`.

## Identity and data-boundary rules

- All `/api/*` routes except health, login, cron, and public Supabase configuration require an active authenticated user.
- Normal Supabase REST and Storage requests use the caller's access token. They never silently switch to the service-role key.
- Leadership means `admin`, `director`, or `manager`. The current UI exposes `admin` and `salesman`.
- A salesman may access a lead when they created it, are its `assigned_to` user, match `assigned_salesman`, or share its non-`Mixed` territory. `Mixed` leads require direct ownership/assignment.
- Leadership may access all CRM records except where a route intentionally narrows its result.
- Private files use the same lead rule. A signed URL is issued only after both server authorization and Storage RLS succeed.

## Route inventory

| Route family | Methods | Anonymous | Salesman | Leadership |
| --- | --- | --- | --- | --- |
| `/api/health` | GET | Health metadata only | Same | Same |
| `/api/supabase-config` | GET | Public URL, anon key, bucket only | Same | Same |
| `/api/auth/login` | POST | Credential exchange | Same | Same |
| `/api/auth/me`, `/api/auth/logout` | GET/POST | Denied | Own session | Own session |
| `/api/cron/fetch-market-intelligence` | GET | Requires cron signature | No user access | No interactive access |
| `/api/transcriptions` | POST | Denied | Own upload/request | Allowed |
| `/api/ai-assistant/*` | GET/POST | Denied | Own audit history, drafts, and visible leads | Authorized organization scope |
| `/api/agent/query` | POST | Denied | Query only visible records | Query organization records |
| `/api/configuration-agent/*` | GET/POST | Denied | Denied | Admin only |
| `/api/integrations/status` | GET | Denied | Own/visible integration status where returned | Organization status |
| `/api/market-intelligence`, `/api/market-news`, `/api/linkedin/search-url` | GET | Denied | Read shared intelligence | Read shared intelligence |
| `/api/market-intelligence/fetch` | POST | Denied | Denied | Admin/leadership only |
| `/api/erp/validate-quotation` | POST | Denied | Visible lead/request | Allowed |
| `/api/places/search`, `/api/leads/enrich-company` | POST | Denied | Request scoped to own workflow | Allowed |
| `/api/users` | GET/POST | Denied | Denied | Admin only; Auth Admin API is explicit privileged operation |
| `/api/settings` | GET | Denied | Own settings/profile | All salesman settings where required |
| `/api/leads`, `/api/leads/duplicates` | GET/POST | Denied | RLS-visible leads only; create as self | All leads |
| `/api/leads/import` | POST | Denied | Denied | Admin only |
| `/api/leads/:id` | GET/PATCH/DELETE | Denied | Visible lead; delete only when permitted | All leads |
| `/api/leads/:id/stage` | PATCH | Denied | Visible lead | All leads |
| `/api/leads/:id/intel` | GET | Denied | Visible lead | All leads |
| `/api/leads/:id/handoffs` | GET/POST | Denied | Read visible lead handoffs | Create/manage handoffs |
| `/api/leads/:id/auto-enrichment/*` | POST | Denied | Visible lead | All leads |
| `/api/leads/:id/delete-requests*` | GET/POST/PATCH | Denied | Request/cancel for visible own lead | Approve/reject |
| `/api/leads/:id/activities*` | GET/POST/PATCH/DELETE | Denied | Visible lead; edit own authorized activity | All visible activities |
| `/api/leads/:id/activities/:activityId/attachments*` | GET/POST | Denied | Visible lead and authorized activity | All visible lead attachments |
| `/api/activities` | GET | Denied | Activities from RLS-visible leads | Organization activities |
| `/api/activity-deletion-requests` | GET | Denied | Own requests where exposed | Review queue |
| `/api/leads/:id/pmrs` | GET/POST | Denied | Visible lead; file as self | All PMRs |
| `/api/pmrs/analyze-transcript` | POST | Denied | Own transcript request | Allowed |
| `/api/pmr-voice-notes` | POST | Denied | Upload as self | Upload as self |
| `/api/pmr-voice-notes/:id`, `/signed-url` | GET | Denied | Only voice notes for visible leads | All voice notes |
| `/api/weekly-reports/current*` | GET/POST | Denied | Own report | Own report if used |
| `/api/weekly-reports/review`, `/api/weekly-reports/:id/review` | GET/POST | Denied | Denied | Leadership review |
| `/api/weekly-reports/:id` | GET | Denied | Own report | All reports |
| `/api/salesperson-ai-actions` | POST | Denied | Own action against visible lead | Allowed |
| `/api/attention-flags*` | GET/POST/PATCH | Denied | Own/visible lead flags | Organization review/update |
| `/api/ai/lead-summary`, `/api/leads/:id/ai-actions` | POST | Denied | Visible lead | All leads |
| `/api/leads/:id/enrich` | POST | Denied | Visible lead | All leads |
| `/api/exports/leads.xls`, `/api/exports/leads.pdf`, `/api/exports/pipeline-report.*` | GET | Denied | Exports RLS-visible leads | Organization export |

## Explicit service-role operations

Only these labels are accepted by `serviceRest()`:

| Operation | Purpose | Caller protection |
| --- | --- | --- |
| `auth.create_user` | Create a Supabase Auth salesman account | Admin-only `/api/users` route |
| `auth.list_users` | Join profile and Auth metadata | Admin-only `/api/users` route |
| `cron.integration_logs` | Reserve and complete an idempotent cron run | Signed cron route |
| `cron.market_intelligence` | Read all leads and write shared intelligence during cron | Signed cron route |
| `notifications.director_fanout` | Deliver a lead flag to leadership recipients | Authenticated flag workflow |
| `workflow.activity_managers` | Resolve managers for activity deletion review | Authenticated activity workflow |

Any other service-role label, and every unlabelled `service: true` request, fails closed.

## Production verification

Before go-live, run these checks against the deployed Supabase project:

1. Apply all migrations through `20260730150000_enforce_user_scoped_rls.sql`.
2. Create one admin and two active salesmen in different territories.
3. Assign a unique lead, PMR, activity attachment, voice note, contact, and weekly report to each salesman.
4. With each salesman's access token, call PostgREST directly for every business table and confirm the other salesman's rows are absent.
5. Attempt direct `PATCH` and `DELETE` against the other salesman's lead and confirm HTTP 404/403 with no changed row.
6. Attempt to sign or download the other salesman's Storage object and confirm Storage rejects it.
7. Confirm the admin can perform the operations allowed by the matrix.
8. Re-run the same checks after token refresh and at least once with a disabled profile.
