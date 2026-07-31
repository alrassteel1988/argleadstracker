const crypto = require("crypto");

const WEEKLY_REPORT_STATUS = Object.freeze({
  NOT_STARTED: "not_started",
  IN_PROGRESS: "in_progress",
  SUBMITTED: "submitted",
  UNDER_REVIEW: "under_review",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  REVISION_REQUIRED: "revision_required"
});

const EDITABLE_STATUSES = new Set([
  WEEKLY_REPORT_STATUS.NOT_STARTED,
  WEEKLY_REPORT_STATUS.IN_PROGRESS,
  WEEKLY_REPORT_STATUS.REVISION_REQUIRED
]);

const REVIEWABLE_STATUSES = new Set([
  WEEKLY_REPORT_STATUS.SUBMITTED,
  WEEKLY_REPORT_STATUS.UNDER_REVIEW
]);

const REVIEW_ACTIONS = new Set([
  WEEKLY_REPORT_STATUS.UNDER_REVIEW,
  WEEKLY_REPORT_STATUS.ACCEPTED,
  WEEKLY_REPORT_STATUS.REJECTED,
  WEEKLY_REPORT_STATUS.REVISION_REQUIRED
]);

function workflowError(status, message, details = {}) {
  const error = new Error(message);
  error.status = status;
  error.details = details;
  return error;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function recordId(prefix) {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
}

function normalizeStatus(value) {
  const status = String(value || "").trim().toLowerCase();
  if (status === "revision_requested" || status === "revision_in_progress") {
    return WEEKLY_REPORT_STATUS.REVISION_REQUIRED;
  }
  return status || WEEKLY_REPORT_STATUS.NOT_STARTED;
}

function isEditableStatus(value) {
  return EDITABLE_STATUSES.has(normalizeStatus(value));
}

function isReviewableStatus(value) {
  return REVIEWABLE_STATUSES.has(normalizeStatus(value));
}

function weekStartFromEnding(weekEnding) {
  const date = new Date(`${String(weekEnding || "").slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "";
  date.setUTCDate(date.getUTCDate() - 4);
  return date.toISOString().slice(0, 10);
}

function validateReportingPeriod(weekStart, weekEnding) {
  const start = new Date(`${String(weekStart || "").slice(0, 10)}T00:00:00Z`);
  const end = new Date(`${String(weekEnding || "").slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    throw workflowError(400, "Choose a valid weekly reporting period.");
  }
}

function idempotencyKey(scope, parts = []) {
  const normalized = [scope, ...parts].map(value => {
    if (value && typeof value === "object") return JSON.stringify(value);
    return String(value ?? "");
  }).join("|");
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

function ensureCollections(db) {
  db.weekly_reports = Array.isArray(db.weekly_reports) ? db.weekly_reports : [];
  db.weekly_report_versions = Array.isArray(db.weekly_report_versions) ? db.weekly_report_versions : [];
  db.weekly_report_reviews = Array.isArray(db.weekly_report_reviews) ? db.weekly_report_reviews : [];
  db.weekly_report_events = Array.isArray(db.weekly_report_events) ? db.weekly_report_events : [];
  return db;
}

function auditEvent({
  report,
  actor,
  eventType,
  versionId = "",
  previousStatus = "",
  newStatus = "",
  idempotency = "",
  metadata = {},
  now = new Date().toISOString()
}) {
  return {
    id: recordId("wsre"),
    report_id: report.id,
    report_version_id: versionId || null,
    timestamp: now,
    created_at: now,
    actor_uid: actor?.id || "",
    actor_name: actor?.name || actor?.full_name || actor?.email || "System",
    actor_role: actor?.role || "system",
    action: eventType,
    event_type: eventType,
    previous_status: previousStatus || null,
    new_status: newStatus || null,
    idempotency_key: idempotency || null,
    details: metadata
  };
}

function immutableVersion(report, actor, versionNumber, now) {
  const id = recordId("wsrv");
  const payload = clone({
    ...report,
    current_version_number: versionNumber,
    current_version_id: id,
    status: WEEKLY_REPORT_STATUS.SUBMITTED,
    submitted_at: now
  });
  return {
    id,
    weekly_report_id: report.id,
    version_number: versionNumber,
    report_payload: payload,
    submitted_by: actor?.id || report.user_id,
    submitted_at: now,
    created_at: now
  };
}

function findByOwnerAndWeek(db, userId, weekStart, weekEnding) {
  return ensureCollections(db).weekly_reports.find(report =>
    String(report.user_id) === String(userId)
    && String(report.week_start || weekStartFromEnding(report.week_ending)) === String(weekStart)
    && String(report.week_ending) === String(weekEnding)
  ) || null;
}

function assertExpectedRowVersion(report, expectedRowVersion) {
  if (expectedRowVersion === undefined || expectedRowVersion === null || expectedRowVersion === "") return;
  if (Number(report?.row_version || 0) !== Number(expectedRowVersion)) {
    throw workflowError(409, "This weekly report changed in another session. Reload it before continuing.", {
      current_row_version: Number(report?.row_version || 0)
    });
  }
}

function saveLocalDraft(db, {
  report,
  actor,
  expectedRowVersion,
  idempotency = "",
  now = new Date().toISOString()
}) {
  ensureCollections(db);
  const weekEnding = String(report.week_ending || "").slice(0, 10);
  const weekStart = String(report.week_start || weekStartFromEnding(weekEnding)).slice(0, 10);
  validateReportingPeriod(weekStart, weekEnding);
  const existing = findByOwnerAndWeek(db, actor.id, weekStart, weekEnding);
  if (existing && !isEditableStatus(existing.status)) {
    throw workflowError(409, "This weekly report is locked after submission.");
  }
  if (existing) assertExpectedRowVersion(existing, expectedRowVersion);
  if (existing && idempotency && existing.last_idempotency_key === idempotency) return existing;

  const previousStatus = normalizeStatus(existing?.status);
  const next = {
    ...(existing || {}),
    ...clone(report),
    id: existing?.id || report.id || recordId("wsr"),
    user_id: actor.id,
    week_start: weekStart,
    week_ending: weekEnding,
    status: WEEKLY_REPORT_STATUS.IN_PROGRESS,
    current_version_number: Number(existing?.current_version_number || 0),
    current_version_id: existing?.current_version_id || null,
    row_version: Number(existing?.row_version || 0) + 1,
    last_idempotency_key: idempotency || null,
    created_at: existing?.created_at || now,
    updated_at: now
  };
  if (existing) Object.assign(existing, next);
  else db.weekly_reports.unshift(next);
  db.weekly_report_events.unshift(auditEvent({
    report: next,
    actor,
    eventType: existing ? "draft_saved" : "report_created",
    previousStatus,
    newStatus: next.status,
    idempotency,
    metadata: { week_start: weekStart, week_ending: weekEnding },
    now
  }));
  return next;
}

function submitLocalReport(db, {
  report,
  actor,
  expectedRowVersion,
  idempotency,
  now = new Date().toISOString()
}) {
  ensureCollections(db);
  const weekEnding = String(report.week_ending || "").slice(0, 10);
  const weekStart = String(report.week_start || weekStartFromEnding(weekEnding)).slice(0, 10);
  validateReportingPeriod(weekStart, weekEnding);
  const existing = findByOwnerAndWeek(db, actor.id, weekStart, weekEnding);
  if (existing) {
    if (idempotency && existing.last_idempotency_key === idempotency && normalizeStatus(existing.status) === WEEKLY_REPORT_STATUS.SUBMITTED) {
      return {
        report: existing,
        version: db.weekly_report_versions.find(item => item.id === existing.current_version_id) || null,
        idempotent: true
      };
    }
    assertExpectedRowVersion(existing, expectedRowVersion);
    if (!isEditableStatus(existing.status)) {
      throw workflowError(409, "This weekly report has already been submitted and is locked.");
    }
  }

  const previousStatus = normalizeStatus(existing?.status);
  const versionNumber = Number(existing?.current_version_number || 0) + 1;
  const next = {
    ...(existing || {}),
    ...clone(report),
    id: existing?.id || report.id || recordId("wsr"),
    user_id: actor.id,
    week_start: weekStart,
    week_ending: weekEnding,
    status: WEEKLY_REPORT_STATUS.SUBMITTED,
    current_version_number: versionNumber,
    row_version: Number(existing?.row_version || 0) + 1,
    last_idempotency_key: idempotency || null,
    submitted_at: now,
    reviewed_at: null,
    reviewed_by_admin_id: null,
    latest_review_note: "",
    review_note: "",
    accepted_at: null,
    rejected_at: null,
    created_at: existing?.created_at || now,
    updated_at: now
  };
  const version = immutableVersion(next, actor, versionNumber, now);
  next.current_version_id = version.id;
  version.report_payload.current_version_id = version.id;
  if (existing) Object.assign(existing, next);
  else db.weekly_reports.unshift(next);
  db.weekly_report_versions.unshift(version);
  db.weekly_report_events.unshift(auditEvent({
    report: next,
    actor,
    eventType: versionNumber > 1 ? "report_resubmitted" : "report_submitted",
    versionId: version.id,
    previousStatus,
    newStatus: next.status,
    idempotency,
    metadata: { version_number: versionNumber, submitted_at: now },
    now
  }));
  return { report: next, version, idempotent: false };
}

function reviewLocalReport(db, {
  reportId,
  versionId,
  action,
  note = "",
  actor,
  idempotency,
  now = new Date().toISOString()
}) {
  ensureCollections(db);
  const report = db.weekly_reports.find(item => String(item.id) === String(reportId));
  if (!report) throw workflowError(404, "Weekly report not found.");
  const normalizedAction = normalizeStatus(action);
  if (!REVIEW_ACTIONS.has(normalizedAction)) throw workflowError(400, "Choose a valid review action.");
  if (!versionId || String(report.current_version_id || "") !== String(versionId)) {
    throw workflowError(409, "This report has a newer submitted version. Reload it before reviewing.", {
      current_version_id: report.current_version_id || null
    });
  }
  const cleanNote = String(note || "").trim();
  if ([WEEKLY_REPORT_STATUS.REJECTED, WEEKLY_REPORT_STATUS.REVISION_REQUIRED].includes(normalizedAction) && !cleanNote) {
    throw workflowError(422, normalizedAction === WEEKLY_REPORT_STATUS.REJECTED
      ? "A rejection reason is required."
      : "A revision note is required.");
  }
  if (idempotency && report.last_idempotency_key === idempotency && normalizeStatus(report.status) === normalizedAction) {
    return {
      report,
      review: db.weekly_report_reviews.find(item => item.idempotency_key === idempotency) || null,
      idempotent: true
    };
  }
  if (!isReviewableStatus(report.status)) {
    throw workflowError(409, `A report in ${normalizeStatus(report.status)} status cannot be reviewed.`);
  }

  const previousStatus = normalizeStatus(report.status);
  const review = {
    id: recordId("wsrr"),
    weekly_report_id: report.id,
    report_version_id: versionId,
    admin_id: actor.id,
    admin_name: actor.name || actor.email || "Admin",
    decision: normalizedAction,
    review_note: cleanNote,
    idempotency_key: idempotency || null,
    created_at: now
  };
  Object.assign(report, {
    status: normalizedAction,
    reviewed_at: now,
    reviewed_by_admin_id: actor.id,
    latest_review_note: cleanNote,
    review_note: cleanNote,
    accepted_at: normalizedAction === WEEKLY_REPORT_STATUS.ACCEPTED ? now : null,
    rejected_at: normalizedAction === WEEKLY_REPORT_STATUS.REJECTED ? now : null,
    row_version: Number(report.row_version || 0) + 1,
    last_idempotency_key: idempotency || null,
    updated_at: now
  });
  db.weekly_report_reviews.unshift(review);
  const eventName = {
    [WEEKLY_REPORT_STATUS.UNDER_REVIEW]: "review_started",
    [WEEKLY_REPORT_STATUS.ACCEPTED]: "report_accepted",
    [WEEKLY_REPORT_STATUS.REJECTED]: "report_rejected",
    [WEEKLY_REPORT_STATUS.REVISION_REQUIRED]: "revision_requested"
  }[normalizedAction];
  db.weekly_report_events.unshift(auditEvent({
    report,
    actor,
    eventType: eventName,
    versionId,
    previousStatus,
    newStatus: normalizedAction,
    idempotency,
    metadata: { note: cleanNote, decision: normalizedAction },
    now
  }));
  return { report, review, idempotent: false };
}

function reportVersions(db, reportId) {
  return ensureCollections(db).weekly_report_versions
    .filter(item => String(item.weekly_report_id) === String(reportId))
    .sort((a, b) => Number(b.version_number || 0) - Number(a.version_number || 0))
    .map(clone);
}

function reportReviews(db, reportId) {
  return ensureCollections(db).weekly_report_reviews
    .filter(item => String(item.weekly_report_id) === String(reportId))
    .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))
    .map(clone);
}

module.exports = {
  EDITABLE_STATUSES,
  REVIEWABLE_STATUSES,
  WEEKLY_REPORT_STATUS,
  ensureCollections,
  findByOwnerAndWeek,
  idempotencyKey,
  isEditableStatus,
  isReviewableStatus,
  normalizeStatus,
  reportReviews,
  reportVersions,
  reviewLocalReport,
  saveLocalDraft,
  submitLocalReport,
  validateReportingPeriod,
  weekStartFromEnding,
  workflowError
};
