# Durable Rate Limiting

ARG Leads Tracker uses one shared abuse-protection layer for local development and production:

- Local fallback persists hashed buckets in `data/db.json`.
- Supabase production persists atomic buckets in `private.rate_limit_buckets`.
- Public API clients cannot query the bucket table or invoke its RPC functions.
- Only the allowlisted server-side `service_role` operation may consume or reset buckets.

## Protected operations

| Category | Scope |
| --- | --- |
| Login | IP address and normalized account identifier |
| AI | AI Sales Assistant, database agent, salesperson AI actions, and lead AI actions |
| Transcription | Voice transcription and PMR transcript analysis |
| Export | Pipeline and lead XLS/PDF exports |
| Upload | PMR voice notes and Activity attachments |
| Search | Google Places search and company enrichment |
| Report | Weekly reports and market-intelligence refresh |

Authenticated expensive operations consume both a per-user bucket and a broader tenant bucket. Login failures use progressive delays and progressively longer temporary blocks.

## Production rollout

1. Apply `supabase/migrations/20260730170000_add_durable_rate_limits.sql` to the production Supabase project.
2. Generate a random secret of at least 32 bytes and set `RATE_LIMIT_HASH_SECRET` in every Vercel environment.
3. Confirm `SUPABASE_SERVICE_ROLE_KEY` is configured only in the server environment.
4. Keep the same `RATE_LIMIT_HASH_SECRET` and `RATE_LIMIT_TENANT_ID` on every deployment instance.
5. Deploy the API only after the migration is present. The production API fails closed with `503` when durable protection is unavailable.
6. Verify a threshold breach returns `429`, a safe error body, and `Retry-After`.

Policy defaults and optional overrides are documented in `.env.example`.

## Telemetry

The server emits structured `rate_limit_near_threshold` and `rate_limit_exceeded` events. Subjects are HMAC hashes truncated for correlation. Events do not contain passwords, account email addresses, API keys, request bodies, audio, or transcripts.
