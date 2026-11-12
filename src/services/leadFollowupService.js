const { activityAuditEvent } = require("./activityWorkflowService");

const REASONS = Object.freeze({
  completed: ["Spoke to customer", "Meeting booked", "Quote requested", "Left voicemail", "No answer", "Wrong number"],
  cancelled: ["Contact has left the company", "Customer asked not to be contacted", "Duplicate activity", "No longer relevant", "Wrong lead or contact details", "Replaced by another activity", "Management instruction", "Other"]
});
const PLANS = Object.freeze({
  "To Call": "To Call", "To Send Email": "To Send Email", "To Visit": "To Visit", "Send quotation": "To Send Email"
});

function followupError(status, message) {
  return Object.assign(new Error(message), { status });
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(+date) && date.toISOString().slice(0, 10) === value;
}

function dubaiDate(value) {
  return new Date(Date.parse(value) + 4 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function validateLeadFollowup(input = {}, now) {
  const status = String(input.status || "");
  const reason = String(input.reason || "").trim();
  const remarks = String(input.remarks || "").trim();
  const spokeWith = status === "completed" ? String(input.spoke_with || "").trim() : "";
  const action = String(input.expected_action || "").trim();
  const due = String(input.expected_due || "");
  const request = String(input.request_id || "");
  const doneAt = status === "completed" ? String(input.done_at || "") : "";
  if (!Object.hasOwn(REASONS, status) || !REASONS[status].includes(reason)) throw followupError(400, "Choose an outcome or cancellation reason.");
  if ([...remarks].length < (status === "completed" ? 10 : 15) || [...remarks].length > 4000) throw followupError(400, "Enter the required notes or justification (maximum 4000 characters).");
  if (!action || action.length > 200 || !validDate(due) || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(request)) throw followupError(400, "A scheduled follow-up and valid request are required.");
  if (status === "completed" && (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}\+04:00$/.test(doneAt) || !validDate(doneAt.slice(0, 10)) || !Number.isFinite(Date.parse(doneAt)) || Date.parse(doneAt) > Date.parse(now))) throw followupError(400, "Enter a valid completion time in UAE time that is not in the future.");
  if (spokeWith.length > 200) throw followupError(400, "The contact name must not exceed 200 characters.");
  const next = input.next_step;
  const nextType = String(next?.type || "");
  const nextDate = String(next?.date || "");
  const nextNote = String(next?.note || "").trim();
  if (next && (!Object.hasOwn(PLANS, nextType) || !validDate(nextDate) || nextDate < dubaiDate(now) || nextNote.length > 500)) throw followupError(400, "Choose a replacement type and a valid date of today or later.");
  return {
    status, reason, remarks, spoke_with: spokeWith, expected_action: action, expected_due: due,
    expected_revision: String(input.expected_revision || ""), expected_updated_at: String(input.expected_updated_at || ""),
    request_id: request, done_at: doneAt, next_type: nextType, next_date: nextDate, next_note: nextNote
  };
}

function canResolveLeadFollowup(user, lead) {
  return user.role === "admin" || (user.role === "salesman" && (
    lead.assigned_to ? String(lead.assigned_to) === String(user.id)
      : Boolean(user.name && String(lead.assigned_salesman || "").trim().toLowerCase() === user.name.trim().toLowerCase())
  ));
}

function matchesScheduledReminder(item, action, due) {
  return item && !item.archived && !item.delete_request && item.deletion_status !== "pending"
    && (item.reminder || String(item.type || "").toLowerCase() === "reminder")
    && !["completed", "cancelled"].includes(item.reminder_status)
    && item.transaction_status !== "closed"
    && String(item.due_date || item.reminder_due_date || "") === due
    && String(item.activity_required || item.text || "").trim().toLowerCase() === action.toLowerCase();
}

function resolveLocalLeadFollowup(lead, user, values, now) {
  if (!canResolveLeadFollowup(user, lead)) throw followupError(403, "Only an Admin or the assigned salesman can resolve this follow-up.");
  const activities = Array.isArray(lead.activities) ? lead.activities : [];
  const id = `followup-${values.request_id}`;
  const duplicate = activities.find(item => item?.id === id);
  if (duplicate) {
    if (duplicate.created_by !== user.id || !duplicate.followup_resolution) throw followupError(409, "This follow-up request has already been used.");
    return { lead, activity: duplicate, duplicate: true };
  }
  if (String(lead.next_action || "").trim() !== values.expected_action
    || String(lead.next_action_date || "") !== values.expected_due
    || String(activities.find(item => item?.followup_resolution)?.id || "") !== values.expected_revision
    || String(lead.updated_at || "") !== values.expected_updated_at) {
    throw followupError(409, "The next step changed. Refresh the lead before saving.");
  }
  const matches = activities.filter(item => matchesScheduledReminder(item, values.expected_action, values.expected_due)
    && !isResolvedReminder(item, activities));
  if (!matches.length && activities.some(item => item?.followup_completed && item.completed_due_date === values.expected_due
    && String(item.completed_activity_required || "").trim().toLowerCase() === values.expected_action.toLowerCase())) {
    throw followupError(409, "This next step has already been completed.");
  }
  if (matches.length > 1) throw followupError(409, "More than one reminder matches this next step. Review the lead's Reminders before saving.");
  const original = matches[0];
  const actor = String(user.name || user.email || "User");
  const completed = values.status === "completed";
  const at = completed ? new Date(values.done_at).toISOString() : now;
  const replacement = values.next_type ? {
    id: `${id}-next`, type: "Reminder", reminder: true, reminder_status: "scheduled", reminder_type: "General follow-up",
    at: now, created_at: now, created_by: user.id, created_by_name: actor, version: 1,
    due_date: values.next_date, due_time: "09:00", activity_required: PLANS[values.next_type],
    text: values.next_note || values.next_type, followup_label: values.next_type
  } : null;
  const event = activityAuditEvent(`followup_${values.status}`, user, {
    previous_status: "scheduled", new_status: values.status, reason: values.reason,
    remarks: values.remarks, original_due_date: values.expected_due, replacement_id: replacement?.id || null
  });
  event.at = now;
  const activity = {
    id, type: completed ? (/email/i.test(values.expected_action) ? "Email" : /visit|meeting/i.test(values.expected_action) ? "Meeting" : "Phone Call") : "Follow-up cancelled",
    at, activity_date: dubaiDate(at), created_at: now, updated_at: now, version: 1, created_by: user.id, created_by_name: actor,
    followup_resolution: values.status, followup_action: values.expected_action, followup_due_date: values.expected_due,
    resolved_reminder_id: original?.id || "", resolved_legacy_reminder: Boolean(original && !original.id),
    transaction_status: completed ? "closed" : "cancelled", transaction_outcome: values.reason,
    transaction_remarks: values.remarks, transaction_updated_at: now, transaction_updated_by: user.id,
    transaction_updated_by_name: actor, text: values.remarks, notes: values.remarks, spoke_with: values.spoke_with,
    ...(completed ? { done_at: at, done_by: user.id } : { cancelled_at: at, cancelled_by: user.id }),
    replacement_id: replacement?.id || "", replacement_label: values.next_type, replacement_due_date: values.next_date,
    audit_history: [event]
  };
  const lastActivity = String(lead.last_activity || "").slice(0, 10);
  return {
    lead: { ...lead, next_action: replacement?.activity_required || "", next_action_date: replacement?.due_date || null,
      last_activity: completed && dubaiDate(at) > lastActivity ? dubaiDate(at) : lead.last_activity,
      updated_at: now, activities: [activity, ...(replacement ? [replacement] : []), ...activities] },
    activity
  };
}

function isResolvedReminder(item, activities) {
  return Boolean(item?.reminder || String(item?.type || "").toLowerCase() === "reminder") && activities.some(event =>
    event?.followup_resolution && (item.id ? event.resolved_reminder_id === item.id
      : event.resolved_legacy_reminder && event.followup_due_date === (item.due_date || item.reminder_due_date)
        && String(event.followup_action || "").toLowerCase() === String(item.activity_required || item.text || "").trim().toLowerCase()));
}

module.exports = { canResolveLeadFollowup, isResolvedReminder, validateLeadFollowup, resolveLocalLeadFollowup };
