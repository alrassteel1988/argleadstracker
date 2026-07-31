const assert = require("assert");
const workflow = require("../src/services/weeklyReportWorkflowService");

function makeDb() {
  return {
    weekly_reports: [],
    weekly_report_versions: [],
    weekly_report_reviews: [],
    weekly_report_events: []
  };
}

function makeReport(weekEnding, summary = "Detailed customer meetings and quotation follow-ups completed this week.") {
  return {
    week_start: workflow.weekStartFromEnding(weekEnding),
    week_ending: weekEnding,
    summary,
    next_week_plan: "Call the procurement team on Monday and send the revised quotation by Tuesday.",
    expected_orders: [],
    problematic_accounts: [],
    secured_orders: [],
    market_intelligence: { demand_band: "Same" },
    attested: true
  };
}

function expectWorkflowError(fn, status, messagePattern) {
  assert.throws(fn, error => {
    assert.equal(error.status, status);
    assert.match(error.message, messagePattern);
    return true;
  });
}

const db = makeDb();
const salesman = { id: "sales-1", name: "Roy Gabriel", email: "roy@example.com", role: "salesman" };
const admin = { id: "admin-1", name: "Glory", email: "admin@example.com", role: "admin" };

const firstDraft = workflow.saveLocalDraft(db, {
  report: makeReport("2026-07-31"),
  actor: salesman,
  expectedRowVersion: 0,
  idempotency: "draft-week-1",
  now: "2026-07-30T08:00:00.000Z"
});
assert.equal(firstDraft.status, "in_progress");
assert.equal(firstDraft.user_id, salesman.id);
assert.equal(firstDraft.week_start, "2026-07-27");
assert.equal(firstDraft.row_version, 1);
assert.equal(db.weekly_reports.length, 1);
assert.equal(db.weekly_report_events.length, 1);

const duplicateDraft = workflow.saveLocalDraft(db, {
  report: makeReport("2026-07-31"),
  actor: salesman,
  expectedRowVersion: 1,
  idempotency: "draft-week-1",
  now: "2026-07-30T08:01:00.000Z"
});
assert.equal(duplicateDraft.id, firstDraft.id);
assert.equal(db.weekly_report_events.length, 1);

const firstSubmission = workflow.submitLocalReport(db, {
  report: { ...firstDraft, summary: "Submitted week one summary with customer names, dates, and quotation outcomes." },
  actor: salesman,
  expectedRowVersion: 1,
  idempotency: "submit-week-1",
  now: "2026-07-31T10:00:00.000Z"
});
assert.equal(firstSubmission.report.status, "submitted");
assert.equal(firstSubmission.report.current_version_number, 1);
assert.equal(db.weekly_report_versions.length, 1);
assert.equal(firstSubmission.version.report_payload.summary, firstSubmission.report.summary);
assert.notStrictEqual(firstSubmission.version.report_payload, firstSubmission.report);

const retrySubmission = workflow.submitLocalReport(db, {
  report: firstSubmission.report,
  actor: salesman,
  expectedRowVersion: 1,
  idempotency: "submit-week-1",
  now: "2026-07-31T10:00:01.000Z"
});
assert.equal(retrySubmission.idempotent, true);
assert.equal(db.weekly_report_versions.length, 1);

expectWorkflowError(() => workflow.saveLocalDraft(db, {
  report: firstSubmission.report,
  actor: salesman,
  expectedRowVersion: firstSubmission.report.row_version,
  idempotency: "edit-locked-week-1"
}), 409, /locked/i);

const accepted = workflow.reviewLocalReport(db, {
  reportId: firstSubmission.report.id,
  versionId: firstSubmission.version.id,
  action: "accepted",
  note: "Reviewed and accepted.",
  actor: admin,
  idempotency: "accept-week-1",
  now: "2026-07-31T11:00:00.000Z"
});
assert.equal(accepted.report.status, "accepted");
assert.equal(accepted.review.report_version_id, firstSubmission.version.id);
assert.equal(accepted.report.reviewed_by_admin_id, admin.id);

const duplicateAccept = workflow.reviewLocalReport(db, {
  reportId: firstSubmission.report.id,
  versionId: firstSubmission.version.id,
  action: "accepted",
  note: "Reviewed and accepted.",
  actor: admin,
  idempotency: "accept-week-1",
  now: "2026-07-31T11:01:00.000Z"
});
assert.equal(duplicateAccept.idempotent, true);
assert.equal(db.weekly_report_reviews.length, 1);

const secondDraft = workflow.saveLocalDraft(db, {
  report: makeReport("2026-08-07"),
  actor: salesman,
  expectedRowVersion: 0,
  idempotency: "draft-week-2",
  now: "2026-08-06T08:00:00.000Z"
});
const secondSubmission = workflow.submitLocalReport(db, {
  report: secondDraft,
  actor: salesman,
  expectedRowVersion: secondDraft.row_version,
  idempotency: "submit-week-2-v1",
  now: "2026-08-07T09:00:00.000Z"
});

expectWorkflowError(() => workflow.reviewLocalReport(db, {
  reportId: secondSubmission.report.id,
  versionId: secondSubmission.version.id,
  action: "revision_required",
  note: "",
  actor: admin,
  idempotency: "revision-week-2"
}), 422, /revision note/i);

const revision = workflow.reviewLocalReport(db, {
  reportId: secondSubmission.report.id,
  versionId: secondSubmission.version.id,
  action: "revision_required",
  note: "Add the missing customer outcome and pricing evidence.",
  actor: admin,
  idempotency: "revision-week-2",
  now: "2026-08-07T10:00:00.000Z"
});
assert.equal(revision.report.status, "revision_required");
assert.equal(workflow.isEditableStatus(revision.report.status), true);
assert.equal(revision.report.latest_review_note, "Add the missing customer outcome and pricing evidence.");

const revisedDraft = workflow.saveLocalDraft(db, {
  report: {
    ...revision.report,
    summary: "Revised week two report with the requested customer outcome and pricing evidence."
  },
  actor: salesman,
  expectedRowVersion: revision.report.row_version,
  idempotency: "draft-week-2-revision",
  now: "2026-08-07T11:00:00.000Z"
});
assert.equal(revisedDraft.id, secondDraft.id);
assert.equal(revisedDraft.status, "in_progress");

const resubmission = workflow.submitLocalReport(db, {
  report: revisedDraft,
  actor: salesman,
  expectedRowVersion: revisedDraft.row_version,
  idempotency: "submit-week-2-v2",
  now: "2026-08-07T12:00:00.000Z"
});
assert.equal(resubmission.report.current_version_number, 2);
assert.equal(workflow.reportVersions(db, secondDraft.id).length, 2);
assert.equal(workflow.reportVersions(db, secondDraft.id)[1].report_payload.summary, secondSubmission.version.report_payload.summary);
assert.notEqual(resubmission.version.report_payload.summary, secondSubmission.version.report_payload.summary);

expectWorkflowError(() => workflow.reviewLocalReport(db, {
  reportId: resubmission.report.id,
  versionId: secondSubmission.version.id,
  action: "accepted",
  note: "",
  actor: admin,
  idempotency: "accept-stale-week-2"
}), 409, /newer submitted version/i);

const underReview = workflow.reviewLocalReport(db, {
  reportId: resubmission.report.id,
  versionId: resubmission.version.id,
  action: "under_review",
  note: "Review started.",
  actor: admin,
  idempotency: "start-review-week-2",
  now: "2026-08-07T12:30:00.000Z"
});
assert.equal(underReview.report.status, "under_review");
assert.equal(workflow.isReviewableStatus(underReview.report.status), true);

const acceptedRevision = workflow.reviewLocalReport(db, {
  reportId: resubmission.report.id,
  versionId: resubmission.version.id,
  action: "accepted",
  note: "Revision accepted.",
  actor: admin,
  idempotency: "accept-week-2-v2",
  now: "2026-08-07T13:00:00.000Z"
});
assert.equal(acceptedRevision.report.status, "accepted");
assert.equal(workflow.reportReviews(db, secondDraft.id).length, 3);

const thirdDraft = workflow.saveLocalDraft(db, {
  report: makeReport("2026-08-14"),
  actor: salesman,
  expectedRowVersion: 0,
  idempotency: "draft-week-3"
});
const thirdSubmission = workflow.submitLocalReport(db, {
  report: thirdDraft,
  actor: salesman,
  expectedRowVersion: thirdDraft.row_version,
  idempotency: "submit-week-3"
});
expectWorkflowError(() => workflow.reviewLocalReport(db, {
  reportId: thirdSubmission.report.id,
  versionId: thirdSubmission.version.id,
  action: "rejected",
  note: "",
  actor: admin,
  idempotency: "reject-week-3"
}), 422, /rejection reason/i);

const rejected = workflow.reviewLocalReport(db, {
  reportId: thirdSubmission.report.id,
  versionId: thirdSubmission.version.id,
  action: "rejected",
  note: "The submitted report contains unsupported claims.",
  actor: admin,
  idempotency: "reject-week-3"
});
assert.equal(rejected.report.status, "rejected");
assert.equal(workflow.isEditableStatus(rejected.report.status), false);
assert.equal(db.weekly_reports.length, 3);
assert.equal(new Set(db.weekly_reports.map(item => `${item.user_id}|${item.week_start}|${item.week_ending}`)).size, 3);
assert(db.weekly_report_events.some(item => item.event_type === "report_resubmitted"));
assert(db.weekly_report_events.some(item => item.event_type === "revision_requested"));
assert(db.weekly_report_events.every(item => item.actor_uid));

console.log("PASS durable weekly report lifecycle");
