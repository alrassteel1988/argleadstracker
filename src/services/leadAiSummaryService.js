const JSON_KEYS = [
  "current_lead_status",
  "market_intelligence",
  "salesman_engagement_history",
  "risks_attention_needed",
  "recommended_next_action",
  "suggested_follow_up_message",
  "confidence",
  "data_gaps",
  "sources"
];

function safeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function shortDate(value) {
  return safeText(value).slice(0, 10);
}

function take(items, limit) {
  return Array.isArray(items) ? items.slice(0, limit) : [];
}

function extractJsonObject(text) {
  const raw = safeText(text);
  if (!raw) throw new Error("Lead summary returned no text.");
  try {
    return JSON.parse(raw);
  } catch (error) {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw error;
    return JSON.parse(match[0]);
  }
}

function normalizeList(value) {
  if (Array.isArray(value)) return value.map(item => safeText(item)).filter(Boolean);
  if (!safeText(value)) return [];
  return [safeText(value)];
}

function normalizeConfidence(value) {
  const normalized = safeText(value).toLowerCase();
  if (normalized === "high") return "High";
  if (normalized === "low") return "Low";
  return "Medium";
}

function normalizeSources(value, bundle) {
  const input = Array.isArray(value) ? value : [];
  const cleaned = input
    .map(item => {
      if (!item) return null;
      if (typeof item === "string") return { label: safeText(item), url: "" };
      return {
        label: safeText(item.label || item.title || item.name || item.source),
        url: safeText(item.url || item.link)
      };
    })
    .filter(item => item?.label);
  if (cleaned.length) return cleaned.slice(0, 8);
  return take(bundle.intel, 4)
    .map(item => ({
      label: safeText(item.title || item.source || "Market intelligence"),
      url: safeText(item.url)
    }))
    .filter(item => item.label);
}

function buildLeadSummaryContext(bundle) {
  const lead = bundle.lead || {};
  return {
    lead: {
      id: lead.id,
      company_name: lead.company_name,
      legal_name: lead.legal_name,
      stage: lead.stage || lead.lead_status,
      priority: lead.priority,
      sector: lead.sector || lead.industry || lead.business_category,
      territory: lead.territory,
      country_emirate: lead.country_emirate || lead.location,
      estimated_value: lead.estimated_value,
      product_interest: lead.product_interest,
      next_action: lead.next_action,
      next_action_date: lead.next_action_date,
      activity_purpose: lead.activity_purpose,
      contact_person: lead.contact_person || lead.contact_name,
      primary_contact_title: lead.primary_contact_title,
      phone: lead.phone,
      email: lead.email || lead.contact_email,
      website: lead.website,
      notes: safeText(lead.notes),
      last_activity: lead.last_activity
    },
    salesman: {
      name: safeText(bundle.salesman?.name || lead.assigned_salesman),
      email: safeText(bundle.salesman?.email),
      territory: safeText(bundle.salesman?.territory),
      status: safeText(bundle.salesman?.status || "active"),
      last_login_at: safeText(bundle.salesman?.last_login_at)
    },
    activity_summary: {
      total: (bundle.activities || []).length,
      calls: (bundle.calls || []).length,
      emails: (bundle.emails || []).length,
      meetings: (bundle.meetings || []).length,
      reminders: (bundle.reminders || []).length,
      followups: (bundle.followups || []).length,
      stage_changes: (bundle.stageChanges || []).length,
      notes: (bundle.noteEntries || []).length,
      last_activity_date: safeText(bundle.lastActivityDate)
    },
    recent_activities: take(bundle.activities, 12).map(activity => ({
      date: safeText(activity.at || activity.activity_date || activity.created_at),
      type: safeText(activity.type || "Note"),
      note: safeText(activity.text || activity.note || activity.activity_required),
      reminder_status: safeText(activity.reminder_status),
      quotation_ref: safeText(activity.quotation_ref),
      quotation_status: safeText(activity.quotation_status)
    })),
    reminders: take(bundle.reminders, 10).map(reminder => ({
      due_date: safeText(reminder.due_date),
      due_time: safeText(reminder.due_time),
      reminder_type: safeText(reminder.reminder_type || reminder.type),
      status: safeText(reminder.reminder_status || (reminder.followup_completed ? "completed" : "scheduled")),
      activity_required: safeText(reminder.activity_required || reminder.text)
    })),
    followup_history: take(bundle.followups, 10).map(item => ({
      due_date: safeText(item.due_date),
      completed_at: safeText(item.completed_at || item.at),
      type: safeText(item.reminder_type || item.type),
      status: safeText(item.reminder_status || (item.followup_completed ? "completed" : "scheduled")),
      activity_required: safeText(item.activity_required || item.text)
    })),
    quotes: take(bundle.quotes, 10).map(item => ({
      date: safeText(item.at || item.activity_date || item.created_at),
      quotation_ref: safeText(item.quotation_ref || lead.quotation_ref),
      status: safeText(item.quotation_status || item.type || "quotation"),
      note: safeText(item.text || item.note)
    })),
    stage_history: take(bundle.stageChanges, 10).map(item => ({
      date: safeText(item.at || item.activity_date || item.created_at),
      detail: safeText(item.text || item.note),
      stage: safeText(item.stage || item.next_stage || "")
    })),
    pmrs: take(bundle.pmrs, 6).map(pmr => ({
      meeting_date: safeText(pmr.meeting_date || pmr.created_at),
      filed_by: safeText(pmr.filed_by),
      products_discussed: safeText(pmr.products_discussed),
      competitors_mentioned: safeText(pmr.competitors_mentioned),
      compliance_requirements: safeText(pmr.compliance_requirements),
      relationship_heat_score: safeText(pmr.relationship_heat_score),
      director_action_required: safeText(pmr.director_action_required),
      account_status: safeText(pmr.account_status),
      notes: safeText(pmr.notes),
      transcript_excerpt: safeText(pmr.voice_note_transcript).slice(0, 500)
    })),
    intel_status: {
      configured: Boolean(bundle.marketIntelConfigured),
      unavailable_reason: safeText(bundle.marketIntelUnavailableReason)
    },
    market_intelligence: take(bundle.intel, 8).map(item => ({
      title: safeText(item.title),
      summary: safeText(item.summary),
      source: safeText(item.source),
      published_at: safeText(item.published_at || item.fetched_at),
      url: safeText(item.url)
    }))
  };
}

function fallbackLeadSummary(bundle) {
  const lead = bundle.lead || {};
  const latestActivity = (bundle.activities || [])[0];
  const latestReminder = (bundle.reminders || [])[0];
  const latestPmr = (bundle.pmrs || [])[0];
  const risks = [];
  const dataGaps = [];
  const today = new Date().toISOString().slice(0, 10);

  if (lead.next_action_date && lead.next_action_date < today) {
    risks.push(`Follow-up overdue since ${lead.next_action_date}.`);
  }
  if (!(bundle.quotes || []).length && !lead.quotation_ref) {
    risks.push("No quotation has been logged for this lead.");
  }
  if (!lead.contact_person) {
    risks.push("Primary contact or decision-maker is not confirmed.");
  }
  if (!(bundle.activities || []).length) {
    dataGaps.push("No CRM activities logged yet.");
  }
  if (!(bundle.pmrs || []).length) {
    dataGaps.push("No PMR records filed.");
  }
  if (!bundle.marketIntelConfigured) {
    dataGaps.push(bundle.marketIntelUnavailableReason || "Market intelligence unavailable. ZAWYA/LSEG API is not configured.");
  }
  if (!lead.estimated_value) {
    dataGaps.push("Open pipeline value is not recorded.");
  }

  return {
    current_lead_status: [
      `${lead.company_name || "This lead"} is currently in ${lead.stage || lead.lead_status || "an unclassified"} stage.`,
      lead.estimated_value ? `Open pipeline value is recorded at ${lead.estimated_value}.` : "No open pipeline value is recorded.",
      lead.next_action ? `The next planned action is ${lead.next_action}${lead.next_action_date ? ` on ${lead.next_action_date}` : ""}.` : "No next action has been recorded yet."
    ].join(" "),
    market_intelligence: bundle.marketIntelConfigured
      ? ((bundle.intel && bundle.intel[0] && safeText(bundle.intel[0].summary || bundle.intel[0].title)) || "No matched market intelligence was found for this lead.")
      : "Market intelligence unavailable. ZAWYA/LSEG API is not configured.",
    salesman_engagement_history: [
      `${lead.assigned_salesman || bundle.salesman?.name || "The assigned salesman"} registered or owns this lead${lead.created_at ? ` since ${shortDate(lead.created_at)}` : ""}.`,
      latestActivity
        ? `Latest CRM activity: ${shortDate(latestActivity.at || latestActivity.activity_date || latestActivity.created_at)} - ${safeText(latestActivity.type || "Activity")}: ${safeText(latestActivity.text || latestActivity.note || latestActivity.activity_required)}.`
        : "No completed call, meeting, email, or note has been logged yet.",
      latestPmr
        ? `Latest PMR recorded account status ${safeText(latestPmr.account_status || "Not set")} with heat ${safeText(latestPmr.relationship_heat_score || "3")}/5.`
        : "No PMR records are on file.",
      latestReminder
        ? `Next reminder on record: ${shortDate(latestReminder.due_date)} for ${safeText(latestReminder.activity_required || latestReminder.text || latestReminder.reminder_type)}.`
        : "No reminder is scheduled."
    ].join(" "),
    risks_attention_needed: risks.length ? risks : ["No critical risk was detected from the current CRM record."],
    recommended_next_action: lead.next_action
      ? `${lead.next_action}${lead.next_action_date ? ` by ${lead.next_action_date}` : ""}. Confirm live steel requirements, buyer ownership, and quotation timing.`
      : "Call the primary contact, confirm current steel requirements, identify the decision-maker, and schedule the next follow-up.",
    suggested_follow_up_message: `Hello ${lead.contact_person || "team"}, this is ${lead.assigned_salesman || "the Al Ras Steel team"} following up on ${lead.company_name || "your requirement"}. Could you please confirm any current steel requirement, the right procurement contact, and the next quotation step?`,
    confidence: risks.length >= 2 || dataGaps.length >= 2 ? "Medium" : "High",
    data_gaps: dataGaps,
    sources: normalizeSources([], bundle)
  };
}

function summaryPrompt(bundle) {
  return [
    "You are the executive AI analyst inside Al Ras Steel's CRM.",
    "Return only valid JSON.",
    `Use exactly these top-level keys: ${JSON_KEYS.join(", ")}.`,
    "Rules:",
    "- Never invent calls, meetings, quotes, commitments, contacts, or market facts.",
    "- Use only the supplied CRM and market-intelligence context.",
    "- If data is missing, state that clearly in the relevant field and list it in data_gaps.",
    "- risks_attention_needed and data_gaps must be arrays of short strings.",
    "- sources must be an array of objects with label and url keys.",
    "- confidence must be one of High, Medium, Low.",
    "- Keep each narrative field concise and useful to sales management in GCC steel trading.",
    "",
    "Context:",
    JSON.stringify(buildLeadSummaryContext(bundle), null, 2)
  ].join("\n");
}

async function runLeadAiSummary({
  bundle,
  openAiKey,
  model = "gpt-4.1-mini",
  openAiFetch = fetch
}) {
  const fallback = fallbackLeadSummary(bundle);
  if (!safeText(openAiKey)) {
    return {
      summary: fallback,
      provider: "fallback",
      model: "fallback"
    };
  }

  const response = await openAiFetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      instructions: "You analyze one CRM lead at a time for Al Ras Steel management. Return only valid JSON and stay strictly grounded in the supplied CRM data.",
      input: summaryPrompt(bundle),
      max_output_tokens: 1400
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(String(data.error?.message || "Lead summary AI request failed.").slice(0, 300));
    error.status = response.status === 429 ? 429 : 502;
    throw error;
  }

  const output = (data.output || [])
    .flatMap(item => item.content || [])
    .filter(item => item.type === "output_text")
    .map(item => item.text)
    .join("")
    .trim();

  const parsed = extractJsonObject(output);
  const summary = {
    current_lead_status: safeText(parsed.current_lead_status) || fallback.current_lead_status,
    market_intelligence: safeText(parsed.market_intelligence) || fallback.market_intelligence,
    salesman_engagement_history: safeText(parsed.salesman_engagement_history) || fallback.salesman_engagement_history,
    risks_attention_needed: normalizeList(parsed.risks_attention_needed),
    recommended_next_action: safeText(parsed.recommended_next_action) || fallback.recommended_next_action,
    suggested_follow_up_message: safeText(parsed.suggested_follow_up_message) || fallback.suggested_follow_up_message,
    confidence: normalizeConfidence(parsed.confidence || fallback.confidence),
    data_gaps: normalizeList(parsed.data_gaps),
    sources: normalizeSources(parsed.sources, bundle)
  };

  if (!summary.risks_attention_needed.length) summary.risks_attention_needed = fallback.risks_attention_needed;
  if (!summary.data_gaps.length) summary.data_gaps = fallback.data_gaps;

  return {
    summary,
    provider: "openai",
    model
  };
}

module.exports = {
  buildLeadSummaryContext,
  fallbackLeadSummary,
  runLeadAiSummary
};
