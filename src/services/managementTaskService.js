const { randomUUID } = require("node:crypto");

const priorities = ["high", "medium", "low"];
const statuses = ["not_started", "in_progress", "completed"];
const adminActions = ["assign", "edit", "remind", "reassign", "cancel", "review", "history"];

function taskError(status, message) {
  return Object.assign(new Error(message), { status });
}

function ownsLinkedLead(db, salesmanId, leadId) {
  return !leadId || db.leads.some(lead => String(lead.id) === leadId && String(lead.assigned_to || "") === salesmanId);
}

function canReadManagementTask(db, user, task) {
  return user.status === "active" && (user.role === "admin" || (user.role === "salesman"
    && task.assignee_id === String(user.id) && ownsLinkedLead(db, task.assignee_id, task.lead_id)));
}

function validateManagementTask(action, body, today) {
  const input = body && typeof body === "object" ? body : {};
  const str = key => typeof input[key] === "string" ? input[key].trim() : "";
  const limited = (value, max) => [...value].length <= max;
  const values = {};
  if (action !== "assign") {
    values.expected_version = input.expected_version;
    if (!Number.isSafeInteger(values.expected_version) || values.expected_version < 1) throw taskError(400, "A valid task version is required.");
  }
  if (action === "assign" || action === "edit") {
    const title = str("title"), instructions = str("instructions"), due = str("due_date"), priority = str("priority");
    const parsed = new Date(due + "T00:00:00Z");
    if (!title || !limited(title, 200) || !instructions || !limited(instructions, 4000)) throw taskError(400, "Enter a task title and instructions.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(due) || !Number.isFinite(+parsed) || parsed.toISOString().slice(0, 10) !== due || action === "assign" && due < today) {
      throw taskError(400, action === "assign" ? "Choose a deadline of today or later." : "Choose a valid deadline.");
    }
    if (!priorities.includes(priority)) throw taskError(400, "Choose a priority.");
    Object.assign(values, { title, instructions, due_date: due, priority });
    if (action === "assign") {
      const assignee = str("assignee_id"), lead = str("lead_id");
      if (!assignee || !limited(assignee, 100) || !limited(lead, 100)) throw taskError(400, "Choose an active salesman.");
      Object.assign(values, { assignee_id: assignee, lead_id: lead });
    }
  }
  if (action === "progress") {
    const status = str("status"), remarks = str("remarks");
    if (!statuses.includes(status) || !limited(remarks, 4000) || (status === "completed" && [...remarks].length < 10)) {
      throw taskError(400, "Choose a status and enter at least 10 characters of remarks to complete the task.");
    }
    Object.assign(values, { status, remarks });
  }
  if (["cancel", "reassign"].includes(action)) {
    const reason = str("reason");
    if ([...reason].length < 10 || !limited(reason, 4000)) throw taskError(400, "Enter at least 10 characters for the reason or handoff note.");
    values.reason = reason;
    if (action === "reassign") {
      values.assignee_id = str("assignee_id");
      if (!values.assignee_id || !limited(values.assignee_id, 100)) throw taskError(400, "Choose an active salesman.");
    }
  }
  return values;
}

function saveLocalManagementTask(db, user, action, id, values, now) {
  if (user.status !== "active" || !(user.role === "admin" ? adminActions.filter(key => key !== "history") : user.role === "salesman" ? ["progress", "seen"] : []).includes(action)) {
    throw taskError(403, "This task action is not available to your role.");
  }
  const actor = String(user.id), actorName = user.name || "User";
  const old = db.management_tasks.find(task => task.id === id);
  const activeAssignee = assigneeId => db.users.find(person => String(person.id) === assigneeId && person.status === "active" && person.role === "salesman");
  let task;
  if (action === "assign") {
    if (old) {
      const created = db.management_task_events.find(event => event.task_id === id && event.action === "assign" && event.actor_id === actor)?.snapshot;
      if (created && Object.keys(values).every(key => (created[key] ?? "") === values[key])) return old;
      throw taskError(409, "This task request has already been used.");
    }
    const assignee = activeAssignee(values.assignee_id);
    if (!assignee) throw taskError(400, "Choose an active salesman.");
    const lead = db.leads.find(item => String(item.id) === values.lead_id);
    if (values.lead_id && !lead) throw taskError(404, "Lead not found.");
    if (lead && !lead.assigned_to && !["", "unassigned"].includes(String(lead.assigned_salesman || "").trim().toLowerCase())) {
      throw taskError(409, "Reassign the lead first. Its current owner could not be verified.");
    }
    if (lead && lead.assigned_to && !ownsLinkedLead(db, values.assignee_id, values.lead_id)) throw taskError(409, "Reassign the lead first. It belongs to another salesman.");
    if (lead && !lead.assigned_to) Object.assign(lead, { assigned_to: values.assignee_id, assigned_salesman: assignee.name });
    task = { ...values, id, lead_name: lead?.company_name || "", assignee_name: assignee.name || "Salesman",
      assigned_by: actor, assigned_by_name: actorName, created_at: now, updated_at: now, version: 1,
      status: "not_started", remarks: "", progress_at: null, completed_at: null, notified_at: now, seen_at: null };
  } else {
    if (!old || !canReadManagementTask(db, user, old)) throw taskError(404, "Task not found.");
    if (old.version !== values.expected_version) throw taskError(409, "This task changed. Refresh before trying again.");
    if (action === "seen") {
      old.seen_at ||= now;
      return old;
    }
    if (action === "review") {
      if (old.status !== "completed") throw taskError(409, "Only completed tasks can be reviewed.");
      if (old.reviewed_at) return old;
    } else if (["completed", "cancelled"].includes(old.status)) {
      throw taskError(409, "Completed and cancelled tasks are read-only.");
    }
    task = { ...old, version: old.version + 1, updated_at: now };
    if (["edit", "remind"].includes(action) && (!db.users.some(person => String(person.id) === old.assignee_id && person.role === "salesman" && person.status === "active")
      || !ownsLinkedLead(db, old.assignee_id, old.lead_id))) throw taskError(409, "The salesman no longer has access to this task.");
    if (action === "edit") {
      const { title, instructions, due_date, priority } = values;
      Object.assign(task, { title, instructions, due_date, priority, notified_at: now, seen_at: null });
    } else if (action === "remind") {
      if (+new Date(now) - +new Date(old.notified_at) < 60_000) throw taskError(409, "A task notice was sent recently. Try again in a minute.");
      Object.assign(task, { notified_at: now, seen_at: null });
    } else if (action === "progress") {
      Object.assign(task, { status: values.status, remarks: values.remarks, progress_at: now,
        completed_at: values.status === "completed" ? now : null, seen_at: now });
    } else if (action === "review") {
      Object.assign(task, { reviewed_at: now, reviewed_by: actor });
    } else if (action === "cancel") {
      Object.assign(task, { status: "cancelled", cancel_reason: values.reason, notified_at: now, seen_at: null });
    } else if (action === "reassign") {
      const assignee = activeAssignee(values.assignee_id);
      if (!assignee || old.assignee_id === values.assignee_id) throw taskError(400, "Choose a different active salesman.");
      if (!ownsLinkedLead(db, values.assignee_id, old.lead_id)) throw taskError(409, "Reassign the lead first. It belongs to another salesman.");
      Object.assign(task, { assignee_id: values.assignee_id, assignee_name: assignee.name, status: "not_started",
        remarks: "", progress_at: null, notified_at: now, seen_at: null });
    }
  }
  if (old) Object.assign(old, task);
  else db.management_tasks.unshift(task);
  db.management_task_events.push({ id: randomUUID(), task_id: id, action, actor_id: actor, actor_name: actorName, at: now,
    snapshot: { ...task, ...(values.reason ? { reason: values.reason } : {}) } });
  return task;
}

module.exports = { adminActions, taskError, canReadManagementTask, validateManagementTask, saveLocalManagementTask };
