const { randomUUID } = require("node:crypto");
const { isResolvedReminder } = require("./leadFollowupService");

const DEFAULT_TIME = "09:00";
const DAY = 86400000;
const DUBAI_OFFSET = 4 * 3600000;
const PRIORITIES = ["Normal", "High", "Low"];
const PROTECTED = "Use the next-step controls to change an existing schedule.";

function fail(status, message) {
  throw Object.assign(new Error(message), { status });
}

function dateOnly(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "") && !value.startsWith("0000")
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

function validTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value || "");
}

function dueTimestamp(date, time = DEFAULT_TIME) {
  return dateOnly(date) && validTime(time) ? Date.parse(`${date}T${time}:00+04:00`) : NaN;
}

function activeSchedule(lead) {
  return Boolean(String(lead.next_action || "").trim() && dateOnly(lead.next_action_date));
}

function isPendingReminder(item) {
  return item && !item.archived && !item.delete_request
    && (item.reminder || /^(reminder)$/i.test(item.type || ""))
    && !["completed", "closed", "cancelled"].includes(item.reminder_status)
    && !["completed", "closed", "cancelled"].includes(item.transaction_status);
}

function matchingReminders(lead) {
  const items = lead.activities || [];
  return items.filter(item => isPendingReminder(item) && !isResolvedReminder(item, items)
    && String(item.due_date || item.reminder_due_date || "") === lead.next_action_date
    && String(item.activity_required || item.text || "").trim().toLowerCase() === String(lead.next_action || "").trim().toLowerCase());
}

function matchesActiveStep(lead, date, action) {
  return activeSchedule(lead) && date === lead.next_action_date
    && String(action || "").trim().toLowerCase() === String(lead.next_action).trim().toLowerCase();
}

function initialSchedule(lead, now, trustedCreation = true) {
  if (!activeSchedule(lead)) return null;
  const [reminder] = matchingReminders(lead);
  const time = validTime(reminder?.due_time) ? reminder.due_time : DEFAULT_TIME;
  return {
    id: trustedCreation ? randomUUID() : `legacy:${lead.id}:${lead.next_action_date}`,
    created_at: trustedCreation ? now : null, due_time: time, original_due_date: lead.next_action_date,
    original_due_time: time, agenda: "", priority: "Normal", reschedules: 0, request: null
  };
}

function scheduleState(lead, now) {
  if (!activeSchedule(lead)) return null;
  return lead.activity_schedule?.id ? lead.activity_schedule : initialSchedule(lead, now, false);
}

function scheduleEditDeadline(lead, plan) {
  return Math.min(Date.parse(plan.created_at) + 48 * 3600000, dueTimestamp(lead.next_action_date, plan.due_time));
}

function schedulePatchChanges(lead, patch) {
  return (Object.hasOwn(patch, "next_action") && String(patch.next_action || "").trim() !== String(lead.next_action || "").trim())
    || (Object.hasOwn(patch, "next_action_date") && String(patch.next_action_date || "") !== String(lead.next_action_date || ""));
}

function recordScheduleEvent(lead, plan, user, kind, now, values = {}) {
  return {
    id: randomUUID(), lead_id: lead.id, plan_id: plan.id, kind, recorded_at: now,
    actor_id: user.id, actor_name: user.name || user.email || "User", actor_role: user.role,
    assignee_id: lead.assigned_to || null, assignee_name: lead.assigned_salesman || "Unassigned",
    original_due_date: plan.original_due_date, original_due_time: plan.original_due_time, ...values
  };
}

function scheduleSnapshot(lead, plan) {
  return { action: lead.next_action, date: lead.next_action_date, time: plan.due_time, agenda: plan.agenda, priority: plan.priority };
}

function requestScheduleChange(lead, user, input, now) {
  const operation = input.operation;
  const isAdmin = user.role === "admin";
  if (!isAdmin && (user.role !== "salesman" || !lead.assigned_to || String(lead.assigned_to) !== String(user.id))) {
    fail(403, "Only the current assigned salesman or an Admin can change this schedule.");
  }
  const plan = scheduleState(lead, now);
  if (!plan) fail(409, "There is no open follow-up to reschedule.");
  if (input.expected_plan_id !== plan.id || String(input.expected_updated_at || "") !== String(lead.updated_at || "")) {
    fail(409, "The activity changed. Refresh before saving.");
  }
  const reminders = matchingReminders(lead);
  if (reminders.length > 1) fail(409, "More than one reminder matches this schedule.");
  if (reminders[0]?.deletion_status === "pending" || (reminders[0] && (lead.activities || []).some(item =>
    item.delete_request && item.target_type === "activity" && item.request_status === "pending"
    && item.target_activity_id === reminders[0].id))) fail(409, "This reminder is read-only while deletion is pending.");
  if (!reminders.length && (lead.activities || []).some(item => item.followup_completed
    && matchesActiveStep(lead, item.completed_due_date, item.completed_activity_required))) {
    fail(409, "An outcome was already recorded for this follow-up.");
  }

  const before = scheduleSnapshot(lead, plan);
  const reason = String(input.reason || "").trim();
  const timestamp = Date.parse(now);
  const overdue = timestamp >= dueTimestamp(before.date, before.time);
  let after;
  let request;
  if (operation === "review") {
    if (!isAdmin) fail(403, "Admin access required.");
    request = plan.request;
    if (!request || input.request_id !== request.id) fail(409, "This request is no longer pending.");
    if (reason.length < 10 || reason.length > 500) fail(400, "Enter a decision reason of 10 to 500 characters.");
    if (input.decision === "reject") {
      const event = recordScheduleEvent(lead, plan, user, "reschedule_rejected", now, { before, after: request.proposed, reason, request_id: request.id, requester_id: request.actor_id });
      return { lead: { ...lead, activity_schedule: { ...plan, request: null }, updated_at: now }, event, status: "rejected" };
    }
    if (input.decision !== "approve") fail(400, "Choose approve or reject.");
    if (String(request.actor_id) !== String(lead.assigned_to || "")) {
      fail(409, "The assignment changed. Reject this request and ask the current salesman to submit a new one.");
    }
    after = request.proposed;
    if (!(dueTimestamp(after.date, after.time) > timestamp)) fail(409, "The proposed time has passed. Reject this request and ask for a new date.");
  } else if (operation === "submit") {
    if (plan.request) fail(409, "A schedule change is already waiting for Admin review.");
    after = {
      action: before.action, date: String(input.date || ""), time: String(input.time || ""),
      agenda: String(input.agenda || "").trim(), priority: String(input.priority || "")
    };
    if (!dateOnly(after.date) || !validTime(after.time) || after.agenda.length > 500 || !PRIORITIES.includes(after.priority)) {
      fail(400, "Enter a valid date, time, and priority. Agenda is limited to 500 characters.");
    }
    if (["date", "time", "agenda", "priority"].every(key => before[key] === after[key])) fail(400, "Nothing changed.");
    const moved = before.date !== after.date || before.time !== after.time;
    if (moved && !(dueTimestamp(after.date, after.time) > timestamp)) fail(400, "The new due time must be in the future.");
    const needsReview = !isAdmin && !(timestamp < scheduleEditDeadline(lead, plan));
    if (needsReview && overdue && !moved) fail(400, "Choose a future due time for an overdue reschedule request.");
    if ((moved || needsReview || isAdmin) && (reason.length < 10 || reason.length > 500)) {
      fail(400, "Enter a reason of 10 to 500 characters.");
    }
    if (needsReview) {
      const event = recordScheduleEvent(lead, plan, user, "reschedule_requested", now, { before, after, reason, overdue });
      return {
        lead: { ...lead, activity_schedule: { ...plan, request: { id: event.id, actor_id: user.id, actor_name: event.actor_name,
          at: now, proposed: after, reason, overdue } }, updated_at: now },
        event, status: "pending"
      };
    }
  } else {
    fail(400, "Unknown schedule operation.");
  }

  const moved = before.date !== after.date || before.time !== after.time;
  const reschedules = plan.reschedules + Number(moved);
  const event = recordScheduleEvent(lead, plan, user, operation === "review" ? "reschedule_approved" : moved ? "rescheduled" : "schedule_edited", now, {
    before, after, reason, moved, overdue, repeated: moved && reschedules >= 2,
    ...(request ? { request_id: request.id, requester_id: request.actor_id, requester_name: request.actor_name, request_reason: request.reason } : {})
  });
  const prior = reminders[0];
  const updatedReminder = {
    ...(prior || { id: `schedule-${plan.id}`, at: now, created_at: plan.created_at || now,
      type: "Reminder", reminder: true, reminder_status: "scheduled", activity_required: before.action }),
    text: prior?.text || before.action, due_date: after.date, due_time: after.time,
    schedule_agenda: after.agenda, schedule_priority: after.priority, updated_at: now,
    ...(moved ? { google_calendar_url: "" } : {})
  };
  return {
    lead: { ...lead, next_action_date: after.date, activity_schedule: { ...plan, due_time: after.time,
      agenda: after.agenda, priority: after.priority, reschedules, request: null },
      activities: prior ? lead.activities.map(item => item === prior ? updatedReminder : item) : [updatedReminder, ...(lead.activities || [])],
      updated_at: now },
    event, status: "applied"
  };
}

function outcomeScheduleEvent(lead, user, outcome, now) {
  const plan = scheduleState(lead, now);
  return recordScheduleEvent(lead, plan, user, outcome.followup_resolution, now, {
    before: scheduleSnapshot(lead, plan), reason: outcome.transaction_outcome,
    occurred_at: outcome.done_at || null, request_id: plan.request?.id || null
  });
}

function activityScheduleReport(leads, events, now) {
  const timestamp = Date.parse(now);
  const local = new Date(timestamp + DUBAI_OFFSET);
  local.setUTCHours(0, 0, 0, 0);
  const today = local.toISOString().slice(0, 10);
  const weekStartMs = +local - ((local.getUTCDay() + 6) % 7) * DAY;
  const weekStart = new Date(weekStartMs).toISOString().slice(0, 10);
  const weekEnd = new Date(weekStartMs + 7 * DAY).toISOString().slice(0, 10);
  const rows = new Map();
  const row = (id, name) => {
    const key = id || `legacy:${name || "Unassigned"}`;
    if (!rows.has(key)) rows.set(key, { name: name || "Unassigned", due: 0, completed: 0, on_time: 0, overdue: 0,
      changed: new Set(), reasons: new Map(), cancelled: 0, last_update: "" });
    return rows.get(key);
  };
  const leadNames = new Map(leads.map(lead => [lead.id, lead.company_name]));
  const pending = [];
  const dueThisWeek = date => date >= weekStart && date <= today;
  for (const lead of leads) {
    const plan = scheduleState(lead, now);
    if (!plan) continue;
    if (plan.request) pending.push({
      lead_id: lead.id, company_name: lead.company_name, expected_updated_at: lead.updated_at || "",
      plan_id: plan.id, current_due: lead.next_action_date, current_time: plan.due_time, ...plan.request
    });
    if (dueThisWeek(plan.original_due_date) && dueTimestamp(plan.original_due_date, plan.original_due_time) <= timestamp) {
      row(lead.assigned_to, lead.assigned_salesman).due++;
    }
    if (dueTimestamp(lead.next_action_date, plan.due_time) <= timestamp) row(lead.assigned_to, lead.assigned_salesman).overdue++;
  }
  const flagged = new Map();
  const outcomes = new Set();
  for (const event of events) {
    const outcome = ["completed", "cancelled"].includes(event.kind);
    if (outcome && outcomes.has(event.plan_id)) continue;
    if (outcome) outcomes.add(event.plan_id);
    if (outcome && dueThisWeek(event.original_due_date)
      && dueTimestamp(event.original_due_date, event.original_due_time) <= timestamp
      && !(event.kind === "cancelled" && Date.parse(event.recorded_at) < dueTimestamp(event.original_due_date, event.original_due_time))) {
      const owner = row(event.assignee_id, event.assignee_name);
      owner.due++;
      if (event.kind === "completed" && Date.parse(event.recorded_at) < dueTimestamp(event.original_due_date, event.original_due_time)) owner.on_time++;
    }
    const day = new Date(Date.parse(event.recorded_at) + DUBAI_OFFSET).toISOString().slice(0, 10);
    if (day < weekStart || day >= weekEnd) continue;
    const actorName = event.requester_name || event.actor_name;
    const actor = row(event.requester_id || event.actor_id, actorName);
    if (event.recorded_at > actor.last_update) actor.last_update = event.recorded_at;
    if (event.kind === "completed") actor.completed++;
    if (event.kind === "cancelled") actor.cancelled++;
    if (event.moved) actor.changed.add(event.plan_id);
    if (event.moved || event.kind === "cancelled") {
      const reason = event.request_reason || event.reason;
      if (reason) actor.reasons.set(reason, (actor.reasons.get(reason) || 0) + 1);
    }
    if ((event.repeated || event.overdue && (event.moved || event.kind === "reschedule_requested")) && !flagged.has(event.plan_id)) {
      flagged.set(event.plan_id, { lead_id: event.lead_id, company_name: leadNames.get(event.lead_id) || "Unavailable lead",
        actor: actorName, reason: event.request_reason || event.reason, from: event.before?.date, to: event.after?.date,
        label: event.repeated ? "Repeated reschedule" : "Overdue schedule change" });
    }
  }
  return { week_start: weekStart, pending, flags: [...flagged.values()],
    rows: [...rows.values()].map(item => ({ ...item, changed: item.changed.size, reasons: [...item.reasons] }))
      .sort((a, b) => a.name.localeCompare(b.name)) };
}

module.exports = { PROTECTED, activeSchedule, scheduleState, initialSchedule, requestScheduleChange,
  scheduleEditDeadline, schedulePatchChanges, outcomeScheduleEvent, activityScheduleReport, isPendingReminder, matchesActiveStep };
