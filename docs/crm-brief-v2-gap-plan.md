# CRM Brief V2 Feature Gap and Delivery Plan

Release correction (24 October): the LOST-to-Blocked alias has been removed.
LOST is labelled Lost; distinct Block setup remains future work, for Active
customers with payment issues, bad behavior or another recorded reason. The
owner-selected eight Lost records were moved to CONTACTED (Outreach) with a
private pre-change backup and independent read-back. No blanket historical
migration or Block implementation ran. These latest decisions supersede the
older release-hold and migration-not-executed checkpoint language below.

## Scope and Evidence

Owner request dated 24 October 2026 expands the visual migration into missing
feature delivery. The attached `alras_lead_tracker_brief_v2(2).docx` is the
functional reference, with Sampling removed and Block requested instead. The
revised PDF and matching HTML screens govern presentation. Sidebar icons are
now explicitly required, superseding the earlier text-only-menu instruction.

This is a repository audit, not a production deployment audit. Existing code
does not prove that the corresponding capability is enabled in production.
No production records, secrets or provider configuration were read or changed.
Origin/main was refreshed; this ongoing feature branch is zero commits behind
and 24 commits ahead before the current uncommitted checkpoint.

## Feature Inventory

| Brief feature | Current repository evidence | Gap / next work |
| --- | --- | --- |
| Company record, ownership, contacts, tier, territory | `server.js`, lead forms, authorization tests | Preserve existing schema and caller-scoped visibility; audit each brief field before extending |
| Six displayed statuses | Existing raw stage keys plus display mapping in `client.js` | Sampling omitted; old Block alias is a release hold. Owner approved planning an independent stored Block and moving historical LOST to Outreach; implementation/data execution remain pending |
| Activities | Existing logging, attachments, correction and deletion-request routes | Owner confirmed preserving current workflows on 24 October; no append-only replacement in this phase |
| PMRs and voice notes | Existing PMR forms, services, protected files and tests | Keep current workflow; verify structured fields and storage choice against brief before extending |
| Prepare me for this meeting | `companyAiActionService.js`, company action API and Lead Details buttons | Dedicated online view/company selection delivered locally; live provider configuration remains unverified |
| What should I do next | Existing company AI action `next` | Reachable in the new online action workspace; salesperson focus also has a dedicated view |
| Draft follow-up email | Existing company AI action `email`, manual-send output | Dedicated online view delivered locally; edit/send in the mail app. Direct Zoho sending/reply sync remains separate integration work |
| Summarise relationship / flag attention | Existing company actions and attention flags API | Preserve permissions, confirmation and notification behavior |
| Focus today | `salespersonAiActionService.js` action `focus_today` | Dedicated online view delivered locally, using existing API |
| Who have I neglected | Existing action `neglected`, existing contact-frequency rules | Dedicated online view delivered locally, using existing API |
| Pipeline health | Existing `pipeline_health` action and metrics | Exposed in workspace without duplicated calculations |
| Prospect intelligence | Existing `new_intel` action, market services | Exposed in workspace; subscriptions/provider availability not verified |
| Weekly pipeline summary / coaching / weak pipeline / recovery / PMR summary | Some metrics and read-only agent tools exist; no complete dedicated five-action management workflow found in initial scan | Separate authorized management action implementation, permission and grounding tests |
| Configuration agent | Existing configuration proposal/apply/audit routes | Review Tier 1/2 access and retrospective preview against brief; do not assume full compliance |
| Relationship health | Existing contact rules and derived health metrics | Compare all five brief inputs/weights and PMR evidence; no speculative score changes |
| Company enrichment and LinkedIn | Existing separate services and confirmation flow | Verify configuration later; preserve core operation if providers unavailable |
| Market feeds / weekly refresh | Existing services and protected cron routes | Confirm licensed sources, scheduling, matching and production configuration separately |
| Monday priorities digest | No completed digest delivery workflow found in initial scan | Delivery channel, consent, scheduler and failure handling need specification |
| Offline PWA | Existing IndexedDB activity outbox and protected cache exclusions | Not full offline company/PMR access. Device storage, retention, encryption and sign-out isolation need security design |
| Map / import / duplicate checks | Existing implementations and tests | Preserve; no route optimization feature inside CRM |
| Quotes / accounts | Existing shortcuts and separate design review proposals | Brief forbids quotation module. Keep ERP reference behavior; do not silently build pricing, credit or ERP write workflows |

## Ordered Implementation

1. Finish the current shared design/Home/report checkpoint; retain exact test
   failures and fixes rather than describing it as a complete migration.
2. Restore accessible outline icons alongside sidebar labels and action words.
3. Add navigable AI workspace entry points using existing company and
   salesperson action functions, caller-scoped records, and existing dialogs.
   Do not auto-run provider requests merely on navigation.
4. Add the missing management briefings with reviewed role scope and grounded
   data access. No invented quotations, people, orders or metric trends.
5. Reconcile remaining brief fields, strict activity-history requirement,
   configuration previews, digest and offline requirements with owner answers.
6. Validate desktop/mobile, role isolation, API/error behavior and production
   prerequisites. Push/PR/deployment/migrations remain separate approvals.

## Pending Decisions

Owner answers received 24 October: keep current activity correction/deletion
workflows; deliver online pages first and treat offline access separately;
historical LOST leads must move to Outreach and Block must be planned as a
new independent stored status. The current compatibility alias is not the
final status design and must be reconciled before release. No production
record migration has been executed. Block alert timing, terminal/recoverable
meaning, migration/rollback and permission tests require a separate reviewed
implementation plan.

- Preserve current correction/deletion requests, or replace with append-only
  correction events in a separately reviewed change? Answer: preserve now.
- Block as a compatibility display label, or a distinct stored status? Answer:
  distinct planned stored status; legacy LOST belongs under Outreach.
- Online pages first, or offline security design first? Existing protected
  cache rules must not be weakened without explicit reviewed approval. Answer:
  online first; offline separate.
- Confirm ERP reference format, licensed intelligence subscriptions, director
  accounts and PMR document storage before completing those integrations.

No feature in this document is marked complete solely because a mockup or
button exists. Production enablement and external-provider readiness remain
unverified until explicitly tested with authorized access.

## Online Workspace Delivered Locally

The `ai-actions`, `focus`, `neglected`, `meeting-prep` and `draft-email` views
reuse existing actions, provider/fallback responses and caller-scoped company
data. Portfolio actions remain Salesman-only. Navigation itself does not call
an AI provider; company actions require a visible selected company. Draft email
opens the existing mail-app/manual-send flow, not a new Zoho integration.

The browser suite passed for both roles at desktop and mobile (four profiles).
Canonical `npm run verify` passed. A background pipeline-health refresh could
overwrite a foreground AI dialog; isolated interactive state and regression
tests now protect the open result and focus-restoration trigger. This does not
constitute a live-provider or production authentication test.

## Status Replacement Plan (Not Executed)

1. Owner confirmed Block excludes a lead from follow-up/reminder queues until
   reopened. Apply this consistently to contact cadence and overdue alerts;
   reopening restores eligibility under the chosen status and due date. Keep
   existing attention flags separate; do not reuse them as the stored status.
2. Add a distinct canonical `BLOCK` key through server validation/normalization,
   client options, contact rules and read-only agent tool enums. Preserve API
   field names, current-assignment isolation, authentication and RLS protections.
3. Align every displayed label and generated narrative: NEW=Prospect,
   CONTACTED=Outreach, NEGOTIATION=Engaged, WON=Active, DORMANT=Dormant,
   BLOCK=Block. Sampling must not appear. Do not globally replace ordinary prose
   or historical audit text; use structured status-aware formatting.
4. Remove the LOST-as-Block alias together with its tile/modal dataset. Reconcile
   filters, counts, ordering, reports, health and overdue rules in one tested
   change; do not show an invented Block count before it is a real dataset.
5. Prepare a separately reviewed migration of current historical LOST status
   values to CONTACTED. Inventory actual storage and constraints first; export
   affected IDs/current values to a private backup, dry-run in staging, check
   counts and ownership, and retain historical activity/audit entries unchanged.
6. Require human approval, a verified backup/restore procedure and a maintenance
   window before any production write. A rollback restores only rows changed
   by that migration, after checking for subsequent user edits; no blanket reset.
7. Test both roles: create/edit Block, reopen, historical Outreach records,
   company forms, pipeline/summary filters and pagination, AI text, dashboards,
   reminder/contact rules and unauthorized cross-owner requests. Run canonical
   verification plus desktop/mobile browser suites before proposing release.

No SQL migration, backfill, production database query or status rewrite was run
as part of the online workspace checkpoint. Dormant's legacy server description
also needs review: the brief defines it as previously Active and now quiet,
whereas existing code refers to no future steel requirement. Do not silently
change that rule while implementing navigation.
