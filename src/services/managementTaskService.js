const { randomUUID } = require("node:crypto");

const priorities = ["high", "medium", "low"];
const statuses = ["not_started", "in_progress", "completed"];
const initialTaskTitles = ["New Lead Outreach", "Respond to Initial RFQ"];

function managementTaskRemarks(db, task) {
  const saved = (db.management_task_remarks || []).filter(item => item.task_id === task.id);
  const result = new Map(saved.map(item => [item.source_key || item.id, item]));
  let previous = "not_started";
  const events = (db.management_task_events || []).filter(item => item.task_id === task.id)
    .sort((a, b) => (a.snapshot?.version || 0) - (b.snapshot?.version || 0) || Date.parse(a.at) - Date.parse(b.at) || String(a.id).localeCompare(String(b.id)));
  for (const event of events) {
    const snapshot = event.snapshot || {};
    if (event.action === "progress") {
      const source_key = `event:${event.id}`;
      const type = snapshot.status === "completed" ? "completion"
        : snapshot.status === "in_progress" && previous !== "in_progress" ? "started" : "progress_update";
      if (!result.has(source_key)) result.set(source_key, { id: event.id, task_id: task.id,
        author_id: event.actor_id, author_name: event.actor_name, type, text: snapshot.remarks || "", created_at: event.at, task_version: snapshot.version, source_key });
    }
    previous = snapshot.status || previous;
  }
  if (task.remarks && ![...result.values()].some(item => item.text === task.remarks
    && Date.parse(item.created_at) === Date.parse(task.progress_at || task.completed_at || task.updated_at))) {
    const source_key = `legacy:${task.id}`;
    if (!result.has(source_key)) result.set(source_key, { id: source_key, task_id: task.id, author_id: null,
      author_name: "Not recorded", type: task.status === "completed" ? "completion" : "progress_update",
      text: task.remarks, created_at: task.progress_at || task.completed_at || task.updated_at || task.created_at, task_version: task.version, source_key });
  }
  return [...result.values()].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at) || (a.task_version || 0) - (b.task_version || 0) || String(a.id).localeCompare(String(b.id)));
}

function managementTaskWithRemarks(db, task) {
  return { ...task, remark_history: managementTaskRemarks(db, task) };
}

function taskError(status, message) {
  return Object.assign(new Error(message), { status });
}

function ownsLinkedLead(db, salesmanId, leadId) {
  return !leadId || db.leads.some(lead => String(lead.id) === leadId && String(lead.assigned_to || "") === salesmanId);
}

function canReadManagementTask(db, user, task) {
  return user.role === "admin" || (user.role === "salesman" && !task.removed_at && task.assignee_id === String(user.id)
    && ownsLinkedLead(db, task.assignee_id, task.lead_id));
}

function requestsInitialManagementTask(input, user) {
  const assignee = String(input.assigned_salesman || "").trim();
  return user.role === "admin" && Boolean(input.assigned_to || (assignee && assignee.toLowerCase() !== "unassigned"));
}

function nextManagementWorkingDate(now) {
  const date = new Date(+new Date(now) + 4 * 3600_000);
  date.setUTCDate(date.getUTCDate() + 1);
  if (date.getUTCDay() === 0) date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function initialManagementTaskInput(lead, assigneeId, now) {
  const today = new Date(+new Date(now) + 4 * 3600_000).toISOString().slice(0, 10);
  const title = lead.initial_management_task_title === undefined ? initialTaskTitles[0] : lead.initial_management_task_title;
  if (!initialTaskTitles.includes(title)) throw taskError(400, "Choose New Lead Outreach or Respond to Initial RFQ.");
  const instructions = [lead.activity_purpose, lead.notes].filter(Boolean).join("\n") || "Initial next step assigned by management.";
  return validateManagementTask("assign", {
    assignee_id: String(assigneeId), lead_id: String(lead.id || ""), title,
    instructions: [...instructions].slice(0, 4000).join(""), due_date: nextManagementWorkingDate(now), priority: "medium"
  }, today);
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
  if (action === "remark") {
    const text = str("text");
    if (!text || !limited(text, 4000)) throw taskError(400, "Enter an additional remark of 1 to 4000 characters.");
    values.text = text;
  }
  if (action === "remove" || action === "resolve_duplicate") {
    const reason = str("reason");
    if ([...reason].length < 10 || !limited(reason, 4000)) throw taskError(400, "Enter a removal reason of 10 to 4000 characters.");
    values.reason = reason;
  }
  if (action === "resolve_duplicate") {
    const retained = str("retained_task_id");
    if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(retained)
      || !Number.isSafeInteger(input.retained_version) || input.retained_version < 1 || input.confirmed !== true) {
      throw taskError(400, "Choose a retained task and confirm the duplicate.");
    }
    Object.assign(values, { retained_task_id: retained, retained_version: input.retained_version, confirmed: true });
  }
  return values;
}

function saveLocalManagementTask(db, user, action, id, values, now) {
  if ((["assign", "edit", "remind", "remove", "resolve_duplicate"].includes(action) && user.role !== "admin")
    || (["remove", "resolve_duplicate"].includes(action) && user.status !== "active")
    || (["progress", "seen", "remark"].includes(action) && user.role !== "salesman")
    || user.status !== "active") throw taskError(403, "This task action is not available to your role.");
  const actor = String(user.id), actorName = user.name || "User";
  const old = db.management_tasks.find(task => task.id === id);
  let task, resolvedLead, resolution;
  if (action === "assign") {
    if (old) {
      if (old.assigned_by === actor && old.assignee_id === values.assignee_id) return old;
      throw taskError(409, "This task request has already been used.");
    }
    const assignee = db.users.find(person => String(person.id) === values.assignee_id && person.status === "active" && person.role === "salesman");
    if (!assignee) throw taskError(400, "Choose an active salesman.");
    if (!ownsLinkedLead(db, values.assignee_id, values.lead_id)) throw taskError(400, "Choose a lead assigned to this salesman.");
    const lead = db.leads.find(item => String(item.id) === values.lead_id);
    task = { ...values, id, lead_name: lead?.company_name || "", assignee_name: assignee.name || "Salesman",
      assigned_by: actor, assigned_by_name: actorName, created_at: now, updated_at: now, version: 1,
      status: "not_started", remarks: "", progress_at: null, completed_at: null, notified_at: now, seen_at: null };
  } else {
    if (!old || !canReadManagementTask(db, user, old)) throw taskError(404, "Task not found.");
    if (old.version !== values.expected_version) throw taskError(409, "This task changed. Refresh before trying again.");
    if (old.removed_at) throw taskError(409, "Removed tasks are read-only.");
    if (action === "seen") {
      old.seen_at ||= now;
      return old;
    }
    if (old.status === "completed" && action !== "remark") throw taskError(409, "Completed tasks are read-only.");
    if (action === "remark" && old.status !== "completed") throw taskError(400, "Choose a completed task to add an additional remark.");
    db.management_task_remarks ||= [];
    const history = managementTaskRemarks(db, old);
    for (const entry of history) if (!db.management_task_remarks.some(item => item.task_id === id && item.source_key === entry.source_key)) db.management_task_remarks.push(entry);
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
    } else if (action === "remark") {
      const entry = { id: randomUUID(), task_id: id, author_id: actor, author_name: actorName,
        type: "additional_remark", text: values.text, created_at: now, task_version: task.version };
      db.management_task_remarks.push(entry);
      db.notifications ||= [];
      for (const manager of db.users.filter(person => person.role === "admin" && person.status === "active")) {
        db.notifications.push({ id: randomUUID(), recipient_uid: String(manager.id), lead_id: null,
          type: "management_task_remark", title: "Additional task remark", status: "pending", created_at: now,
          message: `${actorName} added an additional remark to completed task: ${task.title}`,
          payload: { task_id: id, remark_id: entry.id } });
      }
    } else if (action === "resolve_duplicate") {
      if (!["not_started", "in_progress"].includes(old.status)) throw taskError(409, "Only open tasks can be removed.");
      const linked = db.leads.find(lead => lead.initial_management_task_id === id);
      const retained = db.management_tasks.find(item => item.id === values.retained_task_id);
      if (!linked || String(linked.id) !== old.lead_id) throw taskError(409, "Choose the current initial task to resolve.");
      if (!retained || retained.id === id || retained.lead_id !== old.lead_id || retained.assignee_id !== old.assignee_id
        || retained.removed_at || !["not_started", "in_progress"].includes(retained.status)) {
        throw taskError(409, "Choose an open retained task on the same lead and salesman. Cross-lead cleanup needs separate review.");
      }
      if (retained.version !== values.retained_version) throw taskError(409, "This task changed. Refresh before trying again.");
      if (!db.users.some(person => String(person.id) === old.assignee_id && person.role === "salesman" && person.status === "active")
        || !ownsLinkedLead(db, old.assignee_id, old.lead_id)) throw taskError(409, "The salesman no longer has access to this task.");
      resolvedLead = { id: linked.id, initial_management_task_id: retained.id, updated_at: now };
      resolution = { previous_initial_task_id: id, retained_task_id: retained.id, retained_version: retained.version };
      Object.assign(task, { removed_at: now, removed_by: actor, removal_reason: values.reason, duplicate_of_task_id: retained.id });
      Object.assign(linked, resolvedLead);
    } else if (action === "remove") {
      if (!["not_started", "in_progress"].includes(old.status)) throw taskError(409, "Only open tasks can be removed.");
      if (db.leads.some(lead => lead.initial_management_task_id === id)) {
        throw taskError(409, "The original task linked as a lead next step cannot be removed.");
      }
      Object.assign(task, { removed_at: now, removed_by: actor, removal_reason: values.reason });
    }
  }
  if (old) Object.assign(old, task);
  else db.management_tasks.unshift(task);
  db.management_task_events.push({ id: randomUUID(), task_id: id, action, actor_id: actor, actor_name: actorName, at: now, snapshot: { ...task, ...resolution } });
  if (action === "progress") {
    db.management_task_remarks ||= [];
    for (const entry of managementTaskRemarks(db, task)) {
      if (!db.management_task_remarks.some(item => item.task_id === id && item.source_key === entry.source_key)) db.management_task_remarks.push(entry);
    }
  }
  return resolvedLead ? { ...task, resolved_lead: resolvedLead } : task;
}

module.exports = { taskError, canReadManagementTask, validateManagementTask, saveLocalManagementTask,
  requestsInitialManagementTask, initialManagementTaskInput, nextManagementWorkingDate, managementTaskWithRemarks, managementTaskRemarks };
