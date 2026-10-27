const OUTCOMES = Object.freeze({
  pending: Object.freeze([
    "Call back requested",
    "Meeting or visit scheduled",
    "Will try again",
    "Waiting for customer reply"
  ]),
  closed: Object.freeze([
    "Done - spoke to customer",
    "Done - visit or meeting held",
    "Not reached - no answer",
    "Not reached - wrong or invalid number",
    "Not interested",
    "Company closed or moved"
  ])
});

function isDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validateActivityTransaction(input) {
  const status = String(input?.status || "").trim().toLowerCase();
  const outcome = String(input?.outcome || "").trim();
  const remarks = String(input?.remarks || "").trim();
  const nextAttempt = String(input?.next_attempt || "").trim();
  if (!Object.hasOwn(OUTCOMES, status)) throw new Error("Choose Pending or Closed.");
  if (!OUTCOMES[status].includes(outcome)) throw new Error("Choose a valid outcome for the selected status.");
  if (!remarks || remarks.length > 4000) throw new Error("Remarks are required and must not exceed 4000 characters.");
  if (status === "pending" && !isDate(nextAttempt)) throw new Error("A valid next-attempt date is required for Pending.");
  if (status === "closed" && nextAttempt) throw new Error("Closed activities cannot have a next-attempt date.");
  return { status, outcome, remarks, next_attempt: status === "pending" ? nextAttempt : "" };
}

function activityTransactionStatus(activity) {
  return activity?.transaction_status === "closed" ? "closed" : "pending";
}

function updateActivityTransaction(activity, input, user, expectedVersion, now = new Date().toISOString()) {
  if (!activity?.id || !user?.id) throw new Error("A stable activity ID and authenticated user are required.");
  if (!Number.isInteger(expectedVersion) || expectedVersion !== Number(activity.version || 1)) {
    const error = new Error("This activity changed. Refresh it before saving.");
    error.status = 409;
    throw error;
  }
  const values = validateActivityTransaction(input);
  const event = {
    action: "transaction_status_updated",
    actor_id: String(user.id),
    actor_name: String(user.name || user.email || "User"),
    at: now,
    previous_status: activityTransactionStatus(activity),
    new_status: values.status,
    outcome: values.outcome,
    remarks: values.remarks,
    next_attempt: values.next_attempt
  };
  return {
    ...activity,
    transaction_status: values.status,
    transaction_outcome: values.outcome,
    transaction_remarks: values.remarks,
    transaction_next_attempt: values.next_attempt,
    transaction_updated_at: now,
    transaction_updated_by: event.actor_id,
    transaction_updated_by_name: event.actor_name,
    version: expectedVersion + 1,
    audit_history: [event, ...(Array.isArray(activity.audit_history) ? activity.audit_history : [])]
  };
}

function overdueActivityRows(leads, asOf) {
  if (!isDate(asOf)) throw new Error("A valid reference date is required.");
  return (Array.isArray(leads) ? leads : []).flatMap(lead =>
    (Array.isArray(lead.activities) ? lead.activities : [])
      .filter(activity => activity && !activity.archived && !activity.delete_request && activity.deletion_status !== "pending")
      .map(activity => {
        const due = String(activity.next_action_date || activity.reminder_due_date || (activity.reminder ? activity.due_date : "") || "").slice(0, 10);
        return { lead_id: lead.id, activity_id: activity.id || "", due_date: due, status: activityTransactionStatus(activity), activity };
      })
      .filter(row => isDate(row.due_date) && row.due_date < asOf)
  ).sort((a, b) => a.due_date.localeCompare(b.due_date)
    || String(a.lead_id || "").localeCompare(String(b.lead_id || ""))
    || String(a.activity_id).localeCompare(String(b.activity_id)));
}

module.exports = { OUTCOMES, validateActivityTransaction, activityTransactionStatus, updateActivityTransaction, overdueActivityRows };
