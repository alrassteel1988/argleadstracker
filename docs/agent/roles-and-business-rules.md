# Roles and Business Rules

## Role and Permission Matrix

Never weaken role isolation or authorization. Verified code roles are `admin`, `director`, `manager`, and `salesman`; the product-facing term for `salesman` is Salesperson. Leadership means Admin, Director, or Sales Manager; the documented UI exposes Admin and Salesperson. [server.js; docs/API_AUTHORIZATION_MATRIX.md]

| Role | View | Create | Edit | Assign/reassign | Export | Approve | Delete |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Admin (`admin`) | All CRM records, subject to route narrowing | Users and authorized CRM records | All visible CRM records; user administration is admin-only | Yes, with handoff-note rule | Lead XLS/PDF exports verified | Reviews deletion requests; self-approval prohibited | Lead deletion is route-protected |
| Sales Manager (`manager`) | Leadership CRM access | TBD — requires owner confirmation | Leadership route scope | Yes, management rule applies | TBD — requires owner confirmation | Leadership review routes documented | TBD — requires owner confirmation |
| Director (`director`) | Leadership CRM access | TBD — requires owner confirmation | Leadership route scope | Yes, management rule applies | TBD — requires owner confirmation | Leadership review routes documented | TBD — requires owner confirmation |
| Salesperson (`salesman`) | Assigned/owned/non-`Mixed` territory RLS-visible records | May create leads as self | Own authorized activity and visible permitted fields | No; 403 is verified | XLS lead export denied in HTTP test | May request/cancel authorized deletion; cannot approve own request | Direct lead deletion denied in HTTP test |

Evidence: [docs/API_AUTHORIZATION_MATRIX.md; server.js; tests/role-access.test.js; tests/lead-assignment-isolation.test.js; tests/admin-salesman-permissions.e2e.test.js]. Every normal Supabase REST/Storage request uses the caller token; service-role operations are explicitly allowlisted and otherwise fail closed. [docs/API_AUTHORIZATION_MATRIX.md; tests/supabase-authorization-boundary.test.js]

## Business Rule Catalogue

| Topic | Verified rule | Evidence |
| --- | --- | --- |
| Pipeline stages | Canonical stages are `NEW`, `CONTACTED`, `NEGOTIATION`, `WON`, and `LOST`; relationship-status labels are mapped aliases for contact rules. | [server.js; src/config/contactRules.js; README.md] |
| Lead assignment | Salespeople are forced to own assignment/territory on create. Management reassignment requires a handoff note of at least 20 characters and records handoff/activity/notification when applicable. | [server.js; README.md; tests/lead-assignment-isolation.test.js] |
| Quotation approval | ERP validation is a read-only stub for non-empty references; approval policy is not verified. | TBD — requires owner confirmation. [src/services/erpService.js; README.md] |
| Loss reasons | Supported keys: `price`, `no_budget`, `competitor_relationship`, `lead_time`, `product_mismatch`, `no_response`, `project_cancelled`, `credit_terms`, `quality_concerns`, `other`. | [server.js] |
| Follow-up timing | Base thresholds: New 30, Contacted 21, Negotiation 14, Won 30, Lost 90 days; tier multipliers: 0.7, 1.0, 1.5 for tiers 1–3. Owner-approved SLA meaning is TBD. | [src/config/contactRules.js] |
| Timezone | Assistant/activity fallback is `Asia/Dubai`; organization-wide timezone policy is TBD. | [server.js] |
| Currency | Free-text assistant parsing recognizes AED, USD, QAR, SAR; canonical currency/conversion policy is TBD. | [server.js] |
| Duplicate detection | Jaro-Winkler matching; Add Lead checks after four characters with 500 ms debounce; import preview flags likely duplicates. | [src/utils/fuzzyMatch.js; README.md] |
