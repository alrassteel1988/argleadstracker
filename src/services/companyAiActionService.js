const integrations = require("../config/integrations");

const AI_ACTIONS = {
  prepare_meeting: "Prepare me for this meeting",
  next_action: "What should I do next?",
  draft_email: "Draft follow-up email",
  summarise_relationship: "Summarise this relationship"
};

const ACTION_ALIASES = {
  prepare: "prepare_meeting",
  next: "next_action",
  email: "draft_email",
  summary: "summarise_relationship"
};

const SYSTEM_PROMPT = `You are the AI assistant inside the Al Ras Group Lead Tracker, used by steel salespeople in the GCC.
Al Ras Group is a structural steel importer and stockist in JAFZA, Dubai, established in 1988.

Rules:
- Ground every statement in the supplied CRM context only.
- Never invent meetings, quotes, prices, names, commitments, or history.
- If data is missing, say "No data on record".
- Be concise, specific, and useful to a busy steel salesperson.
- Use AED for UAE amounts unless CRM data says otherwise.`;

function normalizeAiAction(action) {
  const key = String(action || "").trim();
  return ACTION_ALIASES[key] || key;
}

function recentActivities(lead) {
  return [...(lead.activities || [])]
    .sort((a, b) => String(b.at || b.activity_date || b.created_at || "").localeCompare(String(a.at || a.activity_date || a.created_at || "")))
    .slice(0, 20);
}

function latestByType(activities, typeNeedle) {
  const needle = String(typeNeedle || "").toLowerCase();
  return activities.find(activity => String(activity.type || "").toLowerCase().includes(needle)) || null;
}

function compactLead(lead) {
  return {
    id: lead.id,
    company_name: lead.company_name,
    legal_name: lead.legal_name,
    stage: lead.stage || lead.lead_status,
    tier: lead.tier,
    sector: lead.sector || lead.industry,
    territory: lead.territory,
    country_emirate: lead.country_emirate || lead.location,
    assigned_salesman: lead.assigned_salesman,
    contact_person: lead.contact_person || lead.contact_name,
    primary_contact_title: lead.primary_contact_title,
    phone: lead.phone,
    email: lead.email || lead.contact_email,
    estimated_value: lead.estimated_value,
    estimated_monthly_volume: lead.estimated_monthly_volume,
    product_interest: lead.product_interest,
    next_action: lead.next_action,
    next_action_date: lead.next_action_date,
    last_activity: lead.last_activity,
    tags: lead.tags,
    notes: lead.notes,
    quotation_ref: lead.quotation_ref,
    relationship_health: lead.health
  };
}

function buildCompanyContext(bundle) {
  const lead = bundle.lead || {};
  const activities = recentActivities(lead);
  const lastQuotation = bundle.lastQuotation || latestByType(activities, "quotation");
  const lastOrder = bundle.lastOrder || latestByType(activities, "order");
  return {
    company: compactLead(lead),
    activities: activities.map(activity => ({
      date: activity.at || activity.activity_date || activity.created_at,
      type: activity.type,
      note: activity.text || activity.note || activity.activity_required,
      logged_by: activity.logged_by || activity.created_by_name,
      quotation_ref: activity.quotation_ref
    })),
    pmrs: (bundle.pmrs || []).slice(0, 3),
    lastQuotation,
    lastOrder,
    market_intelligence: (bundle.intel || []).slice(0, 5),
    handoffs: (bundle.handoffs || []).slice(0, 5)
  };
}

function contextText(bundle) {
  const ctx = buildCompanyContext(bundle);
  return [
    "=== COMPANY RECORD ===",
    JSON.stringify(ctx.company, null, 2),
    "",
    "=== ACTIVITY LOG (newest first, last 20) ===",
    ctx.activities.length ? JSON.stringify(ctx.activities, null, 2) : "No activities logged.",
    "",
    "=== POST-MEETING REPORTS (newest first, last 3) ===",
    ctx.pmrs.length ? JSON.stringify(ctx.pmrs, null, 2) : "No PMRs filed.",
    "",
    "=== LAST QUOTATION ===",
    ctx.lastQuotation ? JSON.stringify(ctx.lastQuotation, null, 2) : "No quotation on record.",
    "",
    "=== LAST ORDER ===",
    ctx.lastOrder ? JSON.stringify(ctx.lastOrder, null, 2) : "No order on record.",
    "",
    "=== RECENT MARKET INTELLIGENCE ===",
    ctx.market_intelligence.length ? JSON.stringify(ctx.market_intelligence, null, 2) : "No matched intelligence items.",
    "",
    "=== HANDOFF HISTORY ===",
    ctx.handoffs.length ? JSON.stringify(ctx.handoffs, null, 2) : "No handoffs."
  ].join("\n");
}

const ACTION_PROMPTS = {
  prepare_meeting: ctx => `${ctx}

Task: Prepare the salesperson for the next meeting. Output exactly these sections:

## Relationship snapshot
2-3 sentences covering who they are, status, relationship temperature, and assigned owner.

## What happened last time
Summarise the most recent activity or PMR. Reference actual dates and facts.

## Open items
- Last quotation sent and whether it was followed up
- Director actions outstanding from PMRs
- Any overdue next actions

## Recent intelligence
Relevant matched market intelligence. If none, say "No recent intelligence."

## Talking points
3-5 specific talking points grounded in CRM history.

## Recommended ask
ONE specific ask tied to this company's current pipeline status.`,

  next_action: ctx => `${ctx}

Task: Tell the salesperson the ONE most important next action for this company.

Format:
## Next action
One concrete action with a suggested timeframe.

## Why this action
2-4 sentences grounded in activity history, PMR signals, pipeline status, and last contact.

## Watch out for
1-2 risks or sensitivities if evident. Omit this section if none are evident.`,

  draft_email: ctx => `${ctx}

Task: Draft a follow-up email from the assigned salesperson to the primary contact.

Style:
- Professional, warm GCC B2B trading tone.
- Short paragraphs, no fluff, no marketing language.
- Reference the actual last interaction and quotation ref if present.
- One clear call to action.
- Sign off with the salesperson name and Al Ras Building Material LLC / Al Ras Steel Trading LLC, Jebel Ali Freezone, Dubai.

Output only:
Subject: ...

Email body...`,

  summarise_relationship: ctx => `${ctx}

Task: Write ONE paragraph of 5-8 sentences summarising the whole relationship for handoff or director review. Cover sector, engagement history, milestones, current status, contact, outstanding items, and the most important thing to know. No headers or bullets.`
};

function fallbackCompanyAiAction(action, bundle) {
  const lead = bundle.lead || {};
  const activities = recentActivities(lead);
  const lastActivity = activities[0];
  const latestPmr = (bundle.pmrs || [])[0];
  if (action === "prepare_meeting") {
    return [
      "## Relationship snapshot",
      `${lead.company_name || "This company"} is a ${lead.stage || "pipeline"} account assigned to ${lead.assigned_salesman || "the sales team"}. Relationship health is ${lead.health?.label || "not calculated"}.`,
      "",
      "## What happened last time",
      lastActivity ? `${lastActivity.at || lastActivity.activity_date || "No date"} - ${lastActivity.type || "Activity"}: ${lastActivity.text || lastActivity.note || "No note on record"}.` : "No data on record.",
      "",
      "## Open items",
      `- Next action: ${lead.next_action || "No data on record"}`,
      `- Due date: ${lead.next_action_date || "No data on record"}`,
      `- Latest PMR director action: ${latestPmr?.director_action_required || "No data on record"}`,
      "",
      "## Recent intelligence",
      bundle.intel?.length ? bundle.intel[0].summary || bundle.intel[0].title : "No recent intelligence.",
      "",
      "## Talking points",
      `- Confirm current demand for ${lead.product_interest || "structural steel requirements"}.`,
      "- Ask about procurement timeline and quotation registration.",
      "- Confirm decision maker and payment/credit expectations.",
      "",
      "## Recommended ask",
      lead.next_action || "Ask for the next live enquiry or trial order opportunity."
    ].join("\n");
  }
  if (action === "next_action") {
    return `## Next action\n${lead.next_action || "Call the primary contact and confirm current steel requirements"} within 2 working days.\n\n## Why this action\nThe latest CRM next action is ${lead.next_action || "not recorded"}, and the relationship health is ${lead.health?.label || "not calculated"}. ${lastActivity ? `The latest activity on record was ${lastActivity.at || "undated"}: ${lastActivity.text || lastActivity.note || "No note"}.` : "No activity has been logged yet."}`;
  }
  if (action === "draft_email") {
    return [
      "Subject: Follow-up from Al Ras Steel",
      "",
      `Dear ${lead.contact_person || "Team"},`,
      "",
      `Thank you for your time${lastActivity ? ` after our ${lastActivity.type || "discussion"} on ${lastActivity.at || "the recent interaction"}` : ""}. We would like to follow up on ${lead.product_interest || "your structural steel requirements"} and confirm the next step.`,
      "",
      "Please let us know if there is an active enquiry, project requirement, or quotation registration process where Al Ras can support.",
      "",
      `Regards,`,
      `${lead.assigned_salesman || "Al Ras Sales Team"}`,
      "Al Ras Building Material LLC / Al Ras Steel Trading LLC",
      "Jebel Ali Freezone, Dubai"
    ].join("\n");
  }
  return `${lead.company_name || "This company"} is a ${lead.stage || "pipeline"} account assigned to ${lead.assigned_salesman || "the sales team"}. ${lastActivity ? `The latest activity was ${lastActivity.type || "Activity"} on ${lastActivity.at || "no date"}: ${lastActivity.text || lastActivity.note || "No note"}.` : "No activity has been logged yet."} ${latestPmr ? `The latest PMR recorded heat ${latestPmr.relationship_heat_score || "not set"}/5 and account status ${latestPmr.account_status || "not set"}.` : "No PMR has been filed."} The current next action is ${lead.next_action || "not recorded"}.`;
}

async function runCompanyAiAction({ action, bundle, anthropicFetch = fetch }) {
  const normalizedAction = normalizeAiAction(action);
  if (!AI_ACTIONS[normalizedAction]) {
    const error = new Error("Unknown AI action.");
    error.status = 400;
    throw error;
  }
  if (!integrations.keys.anthropic || !integrations.claudeEnrichment) {
    return {
      action: normalizedAction,
      label: AI_ACTIONS[normalizedAction],
      output: fallbackCompanyAiAction(normalizedAction, bundle),
      provider: "fallback"
    };
  }

  const response = await anthropicFetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": integrations.env.anthropicKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: integrations.env.anthropicModel,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: ACTION_PROMPTS[normalizedAction](contextText(bundle)) }]
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error?.message || "AI action failed.");
    error.status = response.status;
    throw error;
  }
  const output = (data.content || [])
    .filter(block => block.type === "text")
    .map(block => block.text)
    .join("\n")
    .trim();
  return {
    action: normalizedAction,
    label: AI_ACTIONS[normalizedAction],
    output: output || fallbackCompanyAiAction(normalizedAction, bundle),
    provider: "anthropic"
  };
}

module.exports = {
  AI_ACTIONS,
  normalizeAiAction,
  runCompanyAiAction,
  fallbackCompanyAiAction
};
