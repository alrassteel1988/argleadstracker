const integrations = require("../config/integrations");

const AGENT_EXAMPLE_PROMPTS = [
  "Which fabricators in Abu Dhabi have had no activity in the last 30 days?",
  "How many leads are in ENGAGED status across all territories?",
  "What did we discuss in our last meeting with Gulf Steel Fabricators?",
  "Show me all Tier 1 accounts in Saudi Arabia assigned to any salesperson.",
  "Which accounts have been stuck in OUTREACH for more than 21 days?",
  "Who are the most active salespeople by number of activities this month?"
];

const AGENT_TOOLS = [
  {
    name: "query_companies",
    description: "Query visible lead/company records with optional filters. Returns company list with key CRM fields.",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["PROSPECT", "OUTREACH", "ENGAGED", "SAMPLING", "ACTIVE", "DORMANT"] },
        territory: { type: "string" },
        sector: { type: "string" },
        assigned_to_name: { type: "string" },
        tier: { type: "number", enum: [1, 2, 3] },
        overdue_only: { type: "boolean" },
        limit: { type: "number" }
      }
    }
  },
  {
    name: "get_activity_log",
    description: "Get the activity log for a specific visible company.",
    input_schema: {
      type: "object",
      required: ["company_id"],
      properties: {
        company_id: { type: "string" },
        date_from: { type: "string" },
        date_to: { type: "string" },
        activity_type: { type: "string" },
        limit: { type: "number" }
      }
    }
  },
  {
    name: "get_pmr_data",
    description: "Get Post-Meeting Report records for a specific visible company.",
    input_schema: {
      type: "object",
      required: ["company_id"],
      properties: {
        company_id: { type: "string" },
        limit: { type: "number" }
      }
    }
  },
  {
    name: "calculate_pipeline_metrics",
    description: "Calculate aggregate pipeline metrics over visible records.",
    input_schema: {
      type: "object",
      properties: {
        territory: { type: "string" },
        assigned_to_name: { type: "string" },
        date_from: { type: "string" },
        date_to: { type: "string" }
      }
    }
  },
  {
    name: "search_companies_by_name",
    description: "Search visible companies by partial company name. Use this first when a specific company is mentioned.",
    input_schema: {
      type: "object",
      required: ["query"],
      properties: {
        query: { type: "string" }
      }
    }
  }
];

function dateOnly(value) {
  return String(value || "").slice(0, 10);
}

function daysSince(value) {
  const parsed = Date.parse(value || "");
  if (!Number.isFinite(parsed)) return 999;
  return Math.floor((Date.now() - parsed) / 86_400_000);
}

function isSalesman(user) {
  return String(user?.role || "").toLowerCase() === "salesman";
}

function scopedLeads(leads, user) {
  if (!isSalesman(user)) return leads || [];
  const territory = String(user.territory || "").trim();
  const name = String(user.name || user.full_name || "").trim().toLowerCase();
  return (leads || []).filter(lead => {
    const leadTerritory = String(lead.territory || "").trim();
    if (!leadTerritory) return false;
    if (leadTerritory === "Mixed") {
      return String(lead.assigned_salesman || "").trim().toLowerCase() === name
        || String(lead.assigned_to || "") === String(user.id || "");
    }
    return leadTerritory === territory;
  });
}

function compactLead(lead) {
  return {
    id: lead.id,
    company_name: lead.company_name,
    status: lead.stage || lead.lead_status,
    territory: lead.territory,
    sector: lead.sector || lead.industry || lead.business_category,
    tier: lead.tier,
    assigned_to: lead.assigned_salesman,
    next_action: lead.next_action,
    next_action_due: lead.next_action_date,
    last_activity_date: lead.last_activity,
    estimated_value: Number(lead.estimated_value || 0),
    health: lead.health?.label || "",
    estimated_monthly_volume: lead.estimated_monthly_volume || ""
  };
}

function filterLeads(leads, input = {}) {
  let rows = [...(leads || [])];
  if (input.status) rows = rows.filter(lead => String(lead.stage || lead.lead_status || "").toUpperCase() === String(input.status).toUpperCase());
  if (input.territory) rows = rows.filter(lead => String(lead.territory || "").toLowerCase() === String(input.territory).toLowerCase());
  if (input.sector) rows = rows.filter(lead => String(lead.sector || lead.industry || lead.business_category || "").toLowerCase().includes(String(input.sector).toLowerCase()));
  if (input.assigned_to_name) rows = rows.filter(lead => String(lead.assigned_salesman || "").toLowerCase().includes(String(input.assigned_to_name).toLowerCase()));
  if (input.tier) rows = rows.filter(lead => String(lead.tier || "") === String(input.tier));
  if (input.overdue_only) rows = rows.filter(lead => dateOnly(lead.next_action_date) && dateOnly(lead.next_action_date) < dateOnly(new Date().toISOString()));
  return rows.slice(0, Math.min(Number(input.limit || 20), 100)).map(compactLead);
}

function activityRows(lead, input = {}) {
  const from = dateOnly(input.date_from);
  const to = dateOnly(input.date_to);
  return [...(lead?.activities || [])]
    .filter(activity => !input.activity_type || String(activity.type || "").toLowerCase() === String(input.activity_type).toLowerCase())
    .filter(activity => !from || dateOnly(activity.at || activity.date || activity.created_at) >= from)
    .filter(activity => !to || dateOnly(activity.at || activity.date || activity.created_at) <= to)
    .sort((a, b) => String(b.at || b.date || "").localeCompare(String(a.at || a.date || "")))
    .slice(0, Math.min(Number(input.limit || 20), 100))
    .map(activity => ({
      id: activity.id || "",
      date: activity.at || activity.date || "",
      type: activity.type || "Note",
      note: activity.text || activity.note || activity.activity_required || "",
      reminder_due_date: activity.reminder_due_date || activity.due_date || ""
    }));
}

function metricRows(leads, input = {}) {
  const rows = filterLeads(leads, { ...input, limit: 1000 });
  const byStatus = {};
  const byTerritory = {};
  let overdue = 0;
  rows.forEach(lead => {
    byStatus[lead.status || "Unknown"] = (byStatus[lead.status || "Unknown"] || 0) + 1;
    byTerritory[lead.territory || "Unknown"] = (byTerritory[lead.territory || "Unknown"] || 0) + 1;
    if (dateOnly(lead.next_action_due) && dateOnly(lead.next_action_due) < dateOnly(new Date().toISOString())) overdue += 1;
  });
  return { total: rows.length, overdue_followups: overdue, by_status: byStatus, by_territory: byTerritory };
}

function executeAgentTool(name, input, context) {
  const leads = context.leads || [];
  if (name === "query_companies") return filterLeads(leads, input);
  if (name === "search_companies_by_name") {
    const query = String(input.query || "").toLowerCase();
    return leads
      .filter(lead => String(lead.company_name || "").toLowerCase().includes(query))
      .slice(0, 10)
      .map(compactLead);
  }
  if (name === "get_activity_log") {
    const lead = leads.find(item => String(item.id) === String(input.company_id));
    return lead ? activityRows(lead, input) : [];
  }
  if (name === "get_pmr_data") {
    const visibleIds = new Set(leads.map(lead => String(lead.id)));
    return (context.pmrs || [])
      .filter(pmr => String(pmr.lead_id || pmr.company_id) === String(input.company_id))
      .filter(pmr => visibleIds.has(String(pmr.lead_id || pmr.company_id)))
      .sort((a, b) => String(b.meeting_date || b.created_at || "").localeCompare(String(a.meeting_date || a.created_at || "")))
      .slice(0, Math.min(Number(input.limit || 5), 20));
  }
  if (name === "calculate_pipeline_metrics") return metricRows(leads, input);
  return { error: `Unknown tool: ${name}` };
}

function responseText(payload) {
  return Array.isArray(payload?.content)
    ? payload.content.filter(part => part.type === "text").map(part => part.text).join("\n").trim()
    : "";
}

async function anthropicMessage(body, anthropicFetch = fetch) {
  const response = await anthropicFetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": integrations.env.anthropicKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error?.message || `Claude agent failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

async function runAgentQuery({ prompt, user, leads, pmrs = [], anthropicFetch }) {
  const question = String(prompt || "").trim();
  if (question.length < 3) {
    const error = new Error("Ask a longer question about the CRM database.");
    error.status = 400;
    throw error;
  }
  if (!integrations.aiAgent || !integrations.keys.anthropic) {
    const error = new Error("AI database agent is not configured. Add ANTHROPIC_API_KEY on the server.");
    error.status = 503;
    throw error;
  }

  const scoped = scopedLeads(leads, user);
  const system = [
    "You are a read-only CRM database assistant for Al Ras Steel.",
    "Every answer must be grounded only in tool results from the live CRM data supplied by the application.",
    "If the tools do not provide enough data, say so clearly. Do not use general knowledge.",
    "You cannot create, update, or delete records.",
    `User role: ${user.role}. Territory scope: ${isSalesman(user) ? user.territory || "Not set" : "All visible records"}.`,
    "Keep answers concise and actionable for steel sales work.",
    "Use search_companies_by_name first when the user mentions a specific company."
  ].join(" ");

  const messages = [{ role: "user", content: question }];
  let payload = null;
  const toolsUsed = [];
  for (let round = 0; round < 5; round += 1) {
    payload = await anthropicMessage({
      model: integrations.env.anthropicModel,
      max_tokens: 1100,
      system,
      tools: AGENT_TOOLS,
      messages
    }, anthropicFetch);
    const toolUses = (payload.content || []).filter(part => part.type === "tool_use");
    if (!toolUses.length) break;
    const toolResults = toolUses.map(tool => {
      toolsUsed.push(tool.name);
      return {
        type: "tool_result",
        tool_use_id: tool.id,
        content: JSON.stringify(executeAgentTool(tool.name, tool.input || {}, { leads: scoped, pmrs, user }))
      };
    });
    messages.push({ role: "assistant", content: payload.content });
    messages.push({ role: "user", content: toolResults });
  }

  return {
    answer: responseText(payload) || "I could not produce a grounded answer from the available CRM records.",
    rounds: messages.length,
    tools_used: [...new Set(toolsUsed)],
    visible_records: scoped.length
  };
}

module.exports = {
  AGENT_EXAMPLE_PROMPTS,
  AGENT_TOOLS,
  executeAgentTool,
  runAgentQuery,
  scopedLeads
};
