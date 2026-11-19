const assert = require("node:assert/strict");
const { test } = require("node:test");
const { initialSchedule, requestScheduleChange, scheduleState, scheduleEditDeadline,
  outcomeScheduleEvent, activityScheduleReport } = require("../src/services/activityScheduleService");

const salesperson = { id: "rep1", name: "Rep One", role: "salesman" };
const other = { id: "rep2", name: "Rep Two", role: "salesman" };
const admin = { id: "admin1", name: "Admin One", role: "admin" };
const created = "2026-11-16T04:00:00.000Z";

function lead(due = "2026-11-19", trusted = true) {
  const record = {
    id: "lead-a", company_name: "Synthetic lead", assigned_to: salesperson.id, assigned_salesman: salesperson.name,
    next_action: "To Call", next_action_date: due, updated_at: created, activities: [
      { id: "r1", type: "Reminder", reminder: true, activity_required: "To Call", due_date: due, due_time: "09:00",
        created_by: salesperson.id, text: "Original reminder" }
    ]
  };
  if (trusted) record.activity_schedule = initialSchedule(record, created);
  return record;
}

function change(record, actor, now, extra = {}) {
  return requestScheduleChange(record, actor, {
    operation: "submit", expected_plan_id: scheduleState(record, now).id, expected_updated_at: record.updated_at,
    date: "2026-11-20", time: "10:00", priority: "High", agenda: "Check purchase order",
    reason: "Customer requested a later call.", ...extra
  }, now);
}

function decide(record, actor, now, decision = "approve") {
  return change(record, actor, now, { operation: "review", decision, request_id: record.activity_schedule.request.id,
    reason: "Verified the proposed customer timing." });
}

test("direct edits use the earlier of the original creation window and current deadline", () => {
  const record = lead();
  const early = change(record, salesperson, "2026-11-18T03:59:59.999Z");
  assert.equal(early.status, "applied");
  assert.equal(early.lead.activities.length, 1);
  assert.equal(early.lead.activities[0].id, "r1");
  assert.equal(early.lead.activities[0].due_date, "2026-11-20");
  assert.equal(early.lead.activities[0].created_by, salesperson.id);
  assert.equal(early.lead.activity_schedule.original_due_date, "2026-11-19");
  assert.equal(early.lead.activity_schedule.created_at, created);
  assert.equal(early.event.before.date, "2026-11-19");
  assert.equal(early.event.after.date, "2026-11-20");
  assert.equal(change(early.lead, salesperson, "2026-11-18T04:00:00.000Z", { date: "2026-11-21" }).status, "pending");
  const dueFirst = lead("2026-11-17");
  assert.equal(scheduleEditDeadline(dueFirst, dueFirst.activity_schedule), Date.parse("2026-11-17T05:00:00Z"));
  assert.equal(change(dueFirst, salesperson, "2026-11-17T05:00:00Z").event.overdue, true);
});

test("legacy plans need review, and a former assignee cannot submit or carry approval forward", () => {
  const record = lead("2026-11-17", false);
  const now = "2026-11-18T08:00:00.000Z";
  assert.throws(() => change(record, other, now), /current assigned/);
  const pending = change(record, salesperson, now);
  assert.equal(pending.status, "pending");
  assert.equal(pending.lead.next_action_date, record.next_action_date);
  assert.equal(pending.lead.activity_schedule.created_at, null);
  assert.throws(() => change(pending.lead, salesperson, now), /already waiting/);
  assert.throws(() => decide(pending.lead, salesperson, now), /Admin access/);
  const reassigned = { ...pending.lead, assigned_to: other.id, assigned_salesman: other.name };
  assert.throws(() => decide(reassigned, admin, now), /assignment changed/);
  assert.equal(decide(reassigned, admin, now, "reject").status, "rejected");
  const approved = decide(pending.lead, admin, now);
  assert.equal(approved.lead.next_action_date, "2026-11-20");
  assert.equal(approved.lead.activity_schedule.request, null);
  assert.equal(approved.event.requester_id, salesperson.id);
  assert.equal(approved.event.actor_id, admin.id);
  assert.equal(approved.lead.activity_schedule.original_due_date, "2026-11-17");
  assert.throws(() => change(record, salesperson, now, { expected_updated_at: "stale" }), /changed/);
});

test("report flags repeated moves and does not treat a backdated outcome as on time", () => {
  const start = lead("2026-11-16");
  const first = change(start, salesperson, "2026-11-16T04:05:00.000Z");
  const second = change(first.lead, salesperson, "2026-11-16T06:00:00.000Z", { date: "2026-11-21" });
  assert.equal(second.event.repeated, true);
  const outcome = outcomeScheduleEvent(second.lead, salesperson, {
    followup_resolution: "completed", transaction_outcome: "Spoke to customer", done_at: "2026-11-16T04:30:00.000Z"
  }, "2026-11-16T08:00:00.000Z");
  const report = activityScheduleReport([], [outcome, { ...outcome }, second.event, first.event], "2026-11-16T09:00:00.000Z");
  assert.equal(report.rows[0].due, 1);
  assert.equal(report.rows[0].changed, 1);
  assert.equal(report.rows[0].completed, 1);
  assert.equal(report.rows[0].on_time, 0);
  assert.equal(report.flags.length, 1);
});
