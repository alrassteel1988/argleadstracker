const integrations = require("../config/integrations");

const SALESPERSON_AI_ACTIONS = {
  focus_today: "What should I focus on today?",
  neglected: "Who have I neglected?",
  pipeline_health: "My pipeline health",
  new_intel: "Any new intel on my prospects?"
};

const SYSTEM_PROMPT = `You are the AI assistant inside the Al Ras Group Lead Tracker, used by steel salespeople in the GCC.
Al Ras Group is a structural steel importer and stockist in JAFZA, Dubai, established in 1988.

Rules:
- Ground every statement in the supplied CRM context only.
- Never invent companies, dates, contacts, projects, or activity history.
- If data is missing, say so.
- Be direct, scannable, and actionable for the start of a salesperson's day.
- Always reference companies by their exact names from the data.`;

function compact(value) {
  if (Array.isArray(value)) return value.map(compact).filter(item => item != null);
  if (!value || typeof value !== "object") return value === "" || value == null ? null : value;
  const out = {};
  Object.entries(value).forEach(([key, item]) => {
    const next = compact(item);
    if (next == null) return;
    if (Array.isArray(next) && !next.length) return;
    if (typeof next === "object" && !Array.isArray(next) && !Object.keys(next).length) return;
    out[key] = next;
  });
  return out;
}

function byUrgency(a, b) {
  return Number(b.tier === "1") - Number(a.tier === "1")
    || Number(b.next_action_overdue) - Number(a.next_action_overdue)
    || Number(b.contact_overdue_by || 0) - Number(a.contact_overdue_by || 0)
    || String(a.name || "").localeCompare(String(b.name || ""));
}

function promptCompaniesForAction(action, companies) {
  if (action === "focus_today") {
    return [...companies]
      .filter(company =>
        company.next_action_overdue
        || company.contact_overdue
        || Number(company.latest_pmr?.relationship_heat_score || company.latest_pmr?.heat_score || 0) >= 4
        || String(company.tier || "") === "1"
        || company.has_recent_intel
      )
      .sort(byUrgency)
      .slice(0, 60);
  }
  if (action === "neglected") {
    return companies.filter(company => company.contact_overdue).sort(byUrgency);
  }
  if (action === "new_intel") {
    return companies.map(company => ({
      id: company.id,
      name: company.name,
      sector: company.sector,
      status: company.status,
      territory: company.territory
    }));
  }
  return companies;
}

const ACTION_PROMPTS = {
  focus_today: bundle => `
=== SALESPERSON ===
${bundle.caller.name}, territory: ${bundle.caller.territory}

=== PRIORITISED PORTFOLIO CANDIDATES ===
${JSON.stringify(compact(promptCompaniesForAction("focus_today", bundle.companies)), null, 2)}

=== RECENT MARKET INTELLIGENCE ===
${bundle.intel.length ? JSON.stringify(compact(bundle.intel), null, 2) : "No recent intelligence."}

Task: Pick the 3-5 companies this salesperson should focus on TODAY, in priority order.

For each company, use this exact format:
## Today's focus
### [N]. [Company Name] - [Status] - Tier [X]
**Why today:** 1-2 sentences citing days overdue, contact gap, PMR heat, tier, or intel.
**Do this:** One concrete action.

End with: Everything else can wait until these are done.
If nothing is urgent, say so honestly and suggest 2-3 proactive touches.`,

  neglected: bundle => `
=== SALESPERSON ===
${bundle.caller.name}, territory: ${bundle.caller.territory}

=== NEGLECTED COMPANIES ===
${JSON.stringify(compact(promptCompaniesForAction("neglected", bundle.companies)), null, 2)}

Task: Show who this salesperson has neglected based on expected_contact_days and contact_overdue_by.

Use this format:
## Neglected accounts
### Seriously neglected
### Slipping
### No contact ever logged

For each company: **[Name]** - [Status] - Tier [X] - last contact [date / never] - expected every [N] days, now [N] days over. Add one short re-engagement suggestion.
Sort each section by Tier 1 first, then by days overdue descending.`,

  new_intel: bundle => `
=== SALESPERSON ===
${bundle.caller.name}, territory: ${bundle.caller.territory}

=== PORTFOLIO COMPANIES ===
${JSON.stringify(compact(promptCompaniesForAction("new_intel", bundle.companies)), null, 2)}

=== MARKET INTELLIGENCE ===
${bundle.intel.length ? JSON.stringify(compact(bundle.intel), null, 2) : "NONE"}

Task: Brief this salesperson on new market intelligence relevant to their prospects.

If intelligence exists:
## New intel on your patch
### [Headline] - [Source], [date]
1-2 sentence summary.
**Why it matters to you:** name affected portfolio companies and the opportunity.

If no intelligence exists, output exactly:
## New intel on your patch
No new intelligence matched to your territory and sectors in the last 14 days. Check back after Monday's feed refresh.`
};

function fallbackFocus(bundle) {
  const candidates = promptCompaniesForAction("focus_today", bundle.companies).slice(0, 5);
  if (!candidates.length) return "## Today's focus\nNo urgent companies are showing from overdue actions or contact gaps. Use today for proactive check-ins with your highest-tier prospects.";
  return [
    "## Today's focus",
    ...candidates.map((company, index) => [
      `### ${index + 1}. ${company.name} - ${company.status} - Tier ${company.tier || "2"}`,
      `**Why today:** ${company.next_action_overdue ? `${company.days_overdue} days overdue on next action.` : company.contact_overdue ? `${company.contact_overdue_by} days past expected contact frequency.` : "High-priority account in your portfolio."}`,
      `**Do this:** ${company.next_action || "Call the buyer and confirm current steel requirements."}`
    ].join("\n")),
    "Everything else can wait until these are done."
  ].join("\n\n");
}

function fallbackNeglected(bundle) {
  const neglected = promptCompaniesForAction("neglected", bundle.companies);
  if (!neglected.length) return "## Neglected accounts\nNo companies are past their expected contact frequency. Good discipline today.";
  const serious = neglected.filter(company => Number(company.contact_overdue_by || 0) >= Number(company.expected_contact_days || 30));
  const slipping = neglected.filter(company => Number(company.contact_overdue_by || 0) < Number(company.expected_contact_days || 30) && company.last_activity_date);
  const never = neglected.filter(company => !company.last_activity_date);
  const line = company => `**${company.name}** - ${company.status} - Tier ${company.tier || "2"} - last contact ${company.last_activity_date || "never"} - expected every ${company.expected_contact_days} days, now ${company.contact_overdue_by ?? "unknown"} days over. Re-engage with a clear next-step call.`;
  return [
    "## Neglected accounts",
    "### Seriously neglected",
    ...(serious.length ? serious.map(line) : ["No data on record."]),
    "### Slipping",
    ...(slipping.length ? slipping.map(line) : ["No data on record."]),
    "### No contact ever logged",
    ...(never.length ? never.map(line) : ["No data on record."])
  ].join("\n");
}

function fallbackIntel(bundle) {
  if (!bundle.intel.length) {
    return "## New intel on your patch\nNo new intelligence matched to your territory and sectors in the last 14 days. Check back after Monday's feed refresh.";
  }
  return [
    "## New intel on your patch",
    ...bundle.intel.slice(0, 8).map(item => [
      `### ${item.title || "Market intelligence"} - ${item.source || "Source"}, ${String(item.published_at || item.fetched_at || "").slice(0, 10) || "recent"}`,
      item.summary || "No summary on record.",
      `**Why it matters to you:** Review matched portfolio companies and use this as a call reason.`
    ].join("\n"))
  ].join("\n\n");
}

function fallbackPipelineInsight(metrics) {
  if (!metrics.total_companies) return "No companies are assigned yet.";
  if (metrics.overdue_next_actions > 0) return `${metrics.overdue_next_actions} overdue next actions need attention before new prospecting.`;
  if (metrics.contact_overdue_count > 0) return `${metrics.contact_overdue_count} companies are past expected contact frequency.`;
  return "Pipeline health is steady; keep momentum with proactive customer touches.";
}

function fallbackMarkdown(action, bundle) {
  if (action === "focus_today") return fallbackFocus(bundle);
  if (action === "neglected") return fallbackNeglected(bundle);
  return fallbackIntel(bundle);
}

async function anthropicText(prompt, maxTokens = 1500, anthropicFetch = fetch) {
  const response = await anthropicFetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": integrations.env.anthropicKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: integrations.env.anthropicModel,
      max_tokens: maxTokens,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }]
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error?.message || "Salesperson AI action failed.");
    error.status = response.status;
    throw error;
  }
  return (data.content || []).filter(block => block.type === "text").map(block => block.text).join("\n").trim();
}

async function runSalespersonAiAction({ action, bundle, metrics = null, anthropicFetch = fetch }) {
  const key = String(action || "").trim();
  if (!SALESPERSON_AI_ACTIONS[key]) {
    const error = new Error("Unknown salesperson AI action.");
    error.status = 400;
    throw error;
  }
  if (!bundle.companies.length) {
    return {
      type: "empty",
      action: key,
      label: SALESPERSON_AI_ACTIONS[key],
      result: "No companies assigned to you yet. Once leads are assigned, your daily briefing will appear here."
    };
  }
  if (key === "pipeline_health") {
    let insight = fallbackPipelineInsight(metrics || {});
    if (integrations.keys.anthropic && integrations.claudeEnrichment) {
      try {
        insight = await anthropicText(
          `Pipeline metrics for ${bundle.caller.name}: ${JSON.stringify(metrics || {})}. Write one sentence, max 25 words, with the single most important insight.`,
          150,
          anthropicFetch
        );
      } catch {
        // The metrics are the core product; the AI sentence is optional.
      }
    }
    return { type: "metrics", action: key, label: SALESPERSON_AI_ACTIONS[key], metrics, insight };
  }
  if (!integrations.keys.anthropic || !integrations.claudeEnrichment) {
    return { type: "markdown", action: key, label: SALESPERSON_AI_ACTIONS[key], result: fallbackMarkdown(key, bundle), provider: "fallback" };
  }
  const result = await anthropicText(ACTION_PROMPTS[key](bundle), 1500, anthropicFetch);
  return { type: "markdown", action: key, label: SALESPERSON_AI_ACTIONS[key], result, provider: "anthropic" };
}

module.exports = {
  SALESPERSON_AI_ACTIONS,
  compact,
  runSalespersonAiAction,
  fallbackPipelineInsight
};
