# Agent Documentation Index and TBD Register

This directory contains repository-evidenced operating references linked from [AGENTS.md](../../AGENTS.md). It does not authorize production writes, migrations, deployments, merges, secret changes, or destructive actions. [AGENTS.md]

## TBD Register

Every TBD in this documentation set is listed here. Until confirmed, use the stated safety default.

| Item | Section/document | Missing or conflicting evidence | Required confirmer | Safety default until confirmed |
| --- | --- | --- | --- | --- |
| Separate type-check command | `commands.md` | No type-check script in `package.json`. | Repository owner | Do not invent one. |
| Lint command | `commands.md` | No lint script in `package.json`. | Repository owner | Do not substitute another tool. |
| Migration command | `commands.md` | SQL files exist but no package command. | Repository owner/database owner | Do not run migrations. |
| Seed command | `commands.md` | No supported seed command. | Repository owner/database owner | Do not seed data. |
| Mobile-critical status for non-PWA routes | `architecture.md` | Route matrix does not classify all routes for mobile criticality. | Product owner | Do not infer mobile criticality. |
| Weekly-report route detail | `architecture.md` | Authorization matrix gives family-level, not complete operation-level role detail. | Product owner/security owner | Preserve existing route checks. |
| AI route role detail | `architecture.md` | Authorization matrix gives family-level scope. | Product/security owner | Preserve caller-visible-record scope. |
| Admin/export/market route detail | `architecture.md` | Some route families have incomplete operation-level role/mobile detail; export evidence differs by role. | Product/security owner | Do not broaden access. |
| Sales Manager permissions | `roles-and-business-rules.md` | Manager is a code role, but full create/export/approve/delete matrix is not individually tested. | Product/security owner | Do not grant beyond existing route checks. |
| Director permissions | `roles-and-business-rules.md` | Director is a code role, but full create/export/approve/delete matrix is not individually tested. | Product/security owner | Do not grant beyond existing route checks. |
| Quotation approval policy | `roles-and-business-rules.md` | ERP validation is a stub; approval policy absent. | Sales/process owner | Treat validation as non-approval. |
| Approved follow-up SLA | `roles-and-business-rules.md` | Threshold implementation exists; owner-approved SLA meaning is absent. | Sales/process owner | Preserve current thresholds; do not claim policy approval. |
| Organization timezone policy | `roles-and-business-rules.md` | `Asia/Dubai` fallback exists; global policy absent. | Product owner | Preserve fallback; do not declare it policy. |
| Currency/conversion policy | `roles-and-business-rules.md` | Parser recognizes currencies; canonical policy absent. | Finance/process owner | Do not convert or normalize currency. |
| System-wide visual conventions | `baseline-and-invariants.md` | No separate component/chart convention document. | Design owner | Reuse existing relevant CSS only. |
| Empty-source no-fallback invariant | `baseline-and-invariants.md` | Implementation/policy and test not demonstrated by current audit. | Security/data owner | Do not add fallback behavior. |
| External AI field approval | `ai-safety-and-evaluation.md` | Existing integrations show inputs; owner field-by-field approval absent. | Data/privacy owner | Do not send sensitive fields outside existing approved server flow. |
| Monitoring links/owners/request IDs | `operations-and-release.md` | No external monitoring URLs, owners, or universal request ID documented. | Operations owner | Do not fabricate links/owners/IDs. |
| PR reviewer policy | `operations-and-release.md` | Required review rule is present; required reviewer identity/count absent. | Repository owner | Require review without asserting a policy. |
| Preview/staging criteria | `operations-and-release.md` | No versioned acceptance environment/criteria. | Release owner | Request criteria before claiming preview verification. |
| Rollback/smoke/monitoring procedure | `operations-and-release.md` | Required conceptually; exact procedure/owner/link absent. | Release/operations owner | Do not release; request plan. |
| AI provider retention/processing | `privacy-and-performance.md` | Provider policy is not in repository. | Privacy/legal owner | Minimize data; no unapproved disclosure. |
| Deletion legal policy/response time | `privacy-and-performance.md` | Workflow exists; legal policy absent. | Privacy/legal owner | Preserve audit/review workflow. |
| Retention periods | `privacy-and-performance.md` | No schedule is documented. | Privacy/legal owner | Minimize data; do not delete without authorization. |
| Asset/bundle budget | `privacy-and-performance.md` | No numerical budget. | Performance owner | Do not claim compliance. |
| Initial-load budget | `privacy-and-performance.md` | No numerical budget. | Performance owner | Do not claim compliance. |
| API-latency budget | `privacy-and-performance.md` | No SLO/budget. | Performance owner | Do not claim compliance. |
| Dashboard query-count budget | `privacy-and-performance.md` | No numeric budget. | Performance owner | Do not claim compliance. |
| Large-list budget | `privacy-and-performance.md` | Pagination evidence exists; general budget absent. | Performance owner | Preserve pagination; do not claim a limit. |
| Market-news performance budget | `privacy-and-performance.md` | Cache duration exists; no budget. | Performance owner | Do not claim performance compliance. |
