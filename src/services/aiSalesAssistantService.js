const { jaroWinkler, normalise } = require("../utils/fuzzyMatch");

const ASSISTANT_INTENTS = Object.freeze([
  "schedule_call",
  "schedule_email",
  "schedule_visit",
  "schedule_meeting",
  "log_completed_call",
  "add_note",
  "create_email_draft",
  "view_due_activities",
  "view_overdue_activities",
  "view_activity",
  "unsupported"
]);

const WRITE_INTENTS = new Set([
  "schedule_call",
  "schedule_email",
  "schedule_visit",
  "schedule_meeting",
  "log_completed_call",
  "add_note",
  "create_email_draft"
]);

const NEXT_ACTION_BY_INTENT = Object.freeze({
  schedule_call: "To Call",
  schedule_email: "To Send Email",
  create_email_draft: "To Send Email",
  schedule_visit: "To Visit",
  schedule_meeting: "To Visit",
  log_completed_call: "To Call",
  add_note: "To Call"
});

const PURPOSES = Object.freeze([
  "Company Introductory",
  "New Requirements",
  "Quotation Submission",
  "Quotation Follow Up",
  "Meeting"
]);

function cleanText(value, max = 2000) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function inferPurpose(command, intent) {
  const text = cleanText(command).toLowerCase();
  if (intent === "schedule_meeting") return "Meeting";
  if (text.includes("quotation") || text.includes("quote")) return "Quotation Follow Up";
  if (text.includes("new requirement") || text.includes("requested") || text.includes("wants")) return "New Requirements";
  if (text.includes("intro")) return "Company Introductory";
  return "";
}

function inferIntent(command) {
  const text = cleanText(command).toLowerCase();
  if (!text) return "unsupported";
  if (/\b(show|list|view)\b.*\boverdue\b/.test(text)) return "view_overdue_activities";
  if (/\b(show|list|view)\b.*\b(due today|today'?s activities)\b/.test(text)) return "view_due_activities";
  if (/\b(open|view|show)\b.*\bactivity\b/.test(text)) return "view_activity";
  if (/\b(add|create|log)\b.*\bnote\b/.test(text)) return "add_note";
  if (/\b(i|we)\s+(just\s+)?called\b/.test(text) || /\blog\b.*\bcall/.test(text)) return "log_completed_call";
  if (/\b(prepare|draft|write)\b.*\bemail\b/.test(text)) return "create_email_draft";
  if (/\b(schedule|remind|set)\b.*\bmeeting\b/.test(text)) return "schedule_meeting";
  if (/\b(schedule|remind|set)\b.*\bvisit\b/.test(text)) return "schedule_visit";
  if (/\b(schedule|remind|set|send)\b.*\b(email|quotation reminder)\b/.test(text)) return "schedule_email";
  if (/\b(schedule|remind|set|call)\b.*\bcall\b/.test(text) || /^call\b/.test(text)) return "schedule_call";
  return "unsupported";
}

function extractRecordQuery(command) {
  const text = cleanText(command);
  const patterns = [
    /\b(?:with|to|for|called|call|visit|meeting with)\s+(.+?)(?=\s+(?:after|in|today|tomorrow|next|on|this|at|and they|and the customer|because)\b|[.!?]|$)/i,
    /\b(?:note that|customer)\s+(.+?)(?=\s+(?:wants|requested|needs)\b|[.!?]|$)/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return cleanText(match[1], 160);
  }
  return "";
}

function extractDateExpression(command) {
  const text = cleanText(command);
  const match = text.match(
    /\b(after\s+\d+\s+(?:minutes?|hours?)(?:\s+today)?|in\s+\d+\s+(?:minutes?|hours?)|today(?:\s+at\s+[\d:]+\s*(?:am|pm)?)?|tomorrow(?:\s+at\s+[\d:]+\s*(?:am|pm)?)?|next\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s+at\s+[\d:]+\s*(?:am|pm)?)?|(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+at\s+[\d:]+\s*(?:am|pm)?|(?:on\s+)?(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:,\s*\d{4})?(?:\s+at\s+[\d:]+\s*(?:am|pm)?)?|end of the month|next week|this afternoon)\b/i
  );
  return match ? cleanText(match[1], 120) : "";
}

function parseClock(value) {
  const match = String(value || "").trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const meridiem = String(match[3] || "").toLowerCase();
  if (minute > 59 || hour > 23 || (meridiem && hour > 12)) return null;
  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  return { hour, minute };
}

function formatLocalParts(date) {
  const pad = value => String(value).padStart(2, "0");
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`
  };
}

function applyClock(date, expression) {
  const match = String(expression || "").match(/\bat\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
  const clock = parseClock(match?.[1]);
  if (!clock) return false;
  date.setHours(clock.hour, clock.minute, 0, 0);
  return true;
}

function resolveDateExpression(expression, options = {}) {
  const raw = cleanText(expression, 160);
  if (!raw) return { status: "missing", date: "", time: "", resolved_at: "", timezone: options.timezone || "Asia/Dubai" };
  const text = raw.toLowerCase();
  const now = options.now ? new Date(options.now) : new Date();
  const result = new Date(now);
  result.setSeconds(0, 0);
  let hasTime = false;

  let match = text.match(/\b(?:after|in)\s+(\d+)\s+(minutes?|hours?)/);
  if (match) {
    const amount = Number(match[1]);
    result.setMinutes(result.getMinutes() + amount * (match[2].startsWith("hour") ? 60 : 1));
    hasTime = true;
  } else if (text.startsWith("tomorrow")) {
    result.setDate(result.getDate() + 1);
    hasTime = applyClock(result, text);
  } else if (text.startsWith("today")) {
    hasTime = applyClock(result, text);
  } else if (text === "this afternoon") {
    result.setHours(15, 0, 0, 0);
    hasTime = true;
  } else if (text === "next week") {
    result.setDate(result.getDate() + 7);
  } else if (text === "end of the month") {
    result.setMonth(result.getMonth() + 1, 0);
  } else {
    const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const weekday = weekdays.findIndex(day => text.includes(day));
    if (weekday >= 0) {
      let delta = (weekday - result.getDay() + 7) % 7;
      if (delta === 0) delta = 7;
      result.setDate(result.getDate() + delta);
      hasTime = applyClock(result, text);
    } else {
      const normalized = raw.replace(/^on\s+/i, "");
      const parsed = new Date(normalized);
      if (Number.isNaN(parsed.getTime())) {
        return { status: "invalid", date: "", time: "", resolved_at: "", timezone: options.timezone || "Asia/Dubai" };
      }
      result.setFullYear(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
      hasTime = /\bat\s+/i.test(raw);
      if (hasTime) applyClock(result, raw);
    }
  }

  const parts = formatLocalParts(result);
  return {
    status: hasTime ? "resolved" : "missing_time",
    ...parts,
    resolved_at: hasTime ? `${parts.date}T${parts.time}:00+04:00` : "",
    timezone: options.timezone || "Asia/Dubai",
    expression: raw
  };
}

function normalizeAssistantCommand(input = {}, fallbackCommand = "") {
  const intent = ASSISTANT_INTENTS.includes(input.intent) ? input.intent : inferIntent(fallbackCommand);
  const relatedRecordQuery = cleanText(input.relatedRecordQuery || input.related_record_query || extractRecordQuery(fallbackCommand), 180);
  const dateExpression = cleanText(input.requestedDateExpression || input.requested_date_expression || extractDateExpression(fallbackCommand), 160);
  const purpose = PURPOSES.includes(input.purpose) ? input.purpose : inferPurpose(fallbackCommand, intent);
  return {
    intent,
    relatedRecordType: "lead",
    relatedRecordQuery,
    relatedRecordId: cleanText(input.relatedRecordId || input.related_record_id, 100),
    nextActionPlan: NEXT_ACTION_BY_INTENT[intent] || "",
    purpose,
    requestedDateExpression: dateExpression,
    notes: cleanText(input.notes || fallbackCommand, 1600),
    emailRecipient: cleanText(input.emailRecipient || input.email_recipient, 320),
    emailSubject: cleanText(input.emailSubject || input.email_subject, 240),
    emailBody: String(input.emailBody || input.email_body || "").trim().slice(0, 8000),
    requiresConfirmation: WRITE_INTENTS.has(intent)
  };
}

function resolveAuthorizedRecords(query, leads, contextLeadId = "") {
  const records = Array.isArray(leads) ? leads : [];
  if (contextLeadId && !query) {
    const contextual = records.find(record => String(record.id) === String(contextLeadId));
    return contextual ? [{ record: contextual, score: 1, reason: "current_context" }] : [];
  }
  const normalizedQuery = normalise(query);
  if (!normalizedQuery) return [];
  return records.map(record => {
    const candidates = [
      record.company_name,
      record.contact_person,
      record.contact_name,
      record.email,
      record.contact_email,
      record.quotation_ref
    ].filter(Boolean);
    const scores = candidates.map(value => {
      const normalized = normalise(value);
      if (normalized === normalizedQuery) return 1;
      if (normalized.includes(normalizedQuery) || normalizedQuery.includes(normalized)) return 0.94;
      return jaroWinkler(normalizedQuery, normalized);
    });
    return { record, score: Math.max(...scores, 0), reason: "fuzzy_match" };
  }).filter(item => item.score >= 0.68).sort((left, right) => right.score - left.score).slice(0, 5);
}

function needsDate(intent) {
  return ["schedule_call", "schedule_email", "schedule_visit", "schedule_meeting"].includes(intent);
}

function needsPurpose(intent) {
  return ["schedule_call", "schedule_email", "schedule_visit", "log_completed_call"].includes(intent);
}

function buildEmailDraft(command, lead, resolvedDate) {
  const contactName = cleanText(lead.contact_person || lead.contact_name);
  const companyName = cleanText(lead.company_name || "Customer");
  const recipient = cleanText(command.emailRecipient || lead.email || lead.contact_email);
  const quotationReference = cleanText(lead.quotation_ref);
  const subject = command.emailSubject
    || `${quotationReference ? `Quotation ${quotationReference} ` : "Quotation "}follow-up - ${companyName}`;
  const greeting = contactName ? `Dear ${contactName},` : "Dear Sir/Madam,";
  const body = command.emailBody || [
    greeting,
    "",
    `I am following up regarding ${quotationReference ? `quotation ${quotationReference}` : "our quotation discussion"} with ${companyName}.`,
    "Please let us know if you need any clarification or additional information from Al Ras Steel.",
    "",
    "Kind regards"
  ].join("\n");
  return {
    recipient,
    cc: "",
    bcc: "",
    subject,
    body,
    related_quotation: quotationReference,
    scheduled_for: resolvedDate?.resolved_at || "",
    status: resolvedDate?.resolved_at ? "Scheduled for Review" : "Draft"
  };
}

function buildAssistantPreview({ command, lead, resolvedDate, user }) {
  const completed = command.intent === "log_completed_call" || command.intent === "add_note";
  return {
    intent: command.intent,
    operation: WRITE_INTENTS.has(command.intent) ? "write" : "read",
    lead: lead ? {
      id: lead.id,
      company_name: cleanText(lead.company_name),
      contact_person: cleanText(lead.contact_person || lead.contact_name),
      email: cleanText(lead.email || lead.contact_email),
      assigned_salesman: cleanText(lead.assigned_salesman),
      territory: cleanText(lead.territory),
      quotation_ref: cleanText(lead.quotation_ref)
    } : null,
    activity: WRITE_INTENTS.has(command.intent) ? {
      next_action_plan: command.nextActionPlan,
      activity_purpose: command.purpose,
      next_action_date: resolvedDate?.date || new Date().toISOString().slice(0, 10),
      next_action_time: resolvedDate?.time || "",
      timezone: resolvedDate?.timezone || user?.timezone || "Asia/Dubai",
      notes: command.notes,
      completed,
      status: completed ? "Completed" : "Scheduled"
    } : null,
    email_draft: ["schedule_email", "create_email_draft"].includes(command.intent)
      ? buildEmailDraft(command, lead || {}, resolvedDate)
      : null
  };
}

module.exports = {
  ASSISTANT_INTENTS,
  PURPOSES,
  WRITE_INTENTS,
  buildAssistantPreview,
  cleanText,
  extractDateExpression,
  extractRecordQuery,
  inferIntent,
  inferPurpose,
  needsDate,
  needsPurpose,
  normalizeAssistantCommand,
  resolveAuthorizedRecords,
  resolveDateExpression
};
