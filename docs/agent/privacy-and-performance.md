# Privacy, Retention, and Performance

## Privacy and Retention

| Topic | Verified rule / safety default | Evidence |
| --- | --- | --- |
| Customer/lead data | Customer, lead, contact, activity, PMR, and territory/assignment data are sensitive; use authorization-scoped records only. | [AGENTS.md; docs/API_AUTHORIZATION_MATRIX.md] |
| Uploaded documents | Configured attachments and lead-intelligence reports use private/authorized access. Do not disclose paths, signed URLs, or contents. | [server.js; docs/LEAD_INTELLIGENCE.md] |
| Exports | Export routes are authorization-controlled; do not create/download/disclose exports without task authorization. | [docs/API_AUTHORIZATION_MATRIX.md; tests/admin-salesman-permissions.e2e.test.js] |
| Voice notes | Lead authorization protects access; do not place audio, transcripts, URLs, or identifiers in logs, commits, PRs, screenshots, or evaluation data. | [server.js; tests/voice-note-security.test.js; AGENTS.md] |
| AI providers | OpenAI and Anthropic integrations exist; provider retention/processing policy is not documented. | TBD — requires owner confirmation. [server.js; src/config/integrations.js] |
| Deletion requests | Request/review/audit workflow exists; legal deletion policy and response time are not documented. | TBD — requires owner confirmation. [server.js; docs/API_AUTHORIZATION_MATRIX.md] |
| Retention periods | No retention schedule for records, documents, exports, voice notes, or AI data is verified. | TBD — requires owner confirmation. |
| Prohibited disclosure | Never include secrets, `.env` values, sensitive CRM data, documents, or production data in logs, commits, PRs, screenshots, or AI prompts without explicit authorization within an approved existing flow. | [AGENTS.md] |

Default to data minimization. Do not use production customer data in tests, demonstrations, or AI evaluation datasets. [AGENTS.md]

## Performance Budgets

| Metric | Repository-supported evidence | Budget |
| --- | --- | --- |
| Asset/bundle size | Static assets are enumerated in Vercel configuration; no size measurement/limit is defined. | TBD — requires owner confirmation. [vercel.json] |
| Initial page load | No load-time metric or budget is defined. | TBD — requires owner confirmation. |
| API latency | No latency SLO/budget is defined. | TBD — requires owner confirmation. |
| Dashboard database query count | No query-count budget is defined. | TBD — requires owner confirmation. |
| Pagination/large lists | Activity pagination is tested at 10 records per page; server queries use explicit limits in several flows. | General budget TBD — requires owner confirmation. [tests/activity-dashboard-latest.test.js; server.js] |
| Market-news caching | Normalized NewsAPI response is documented as cached for 15 minutes. | Cache duration verified; performance budget TBD — requires owner confirmation. [README.md; src/services/marketNewsService.js] |
