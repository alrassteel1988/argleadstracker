const crypto = require("crypto");

const MIN_CRON_SECRET_BYTES = 32;

function safeErrorMessage(error) {
  return String(error?.message || error || "Scheduled job failed.")
    .replace(/[\r\n\t]+/g, " ")
    .slice(0, 300);
}

function constantTimeSecretEqual(actual, expected) {
  const actualDigest = crypto.createHash("sha256").update(String(actual || ""), "utf8").digest();
  const expectedDigest = crypto.createHash("sha256").update(String(expected || ""), "utf8").digest();
  return crypto.timingSafeEqual(actualDigest, expectedDigest);
}

function bearerCredential(req) {
  const header = String(req?.headers?.authorization || "");
  const match = header.match(/^Bearer ([^\s]+)$/);
  return match ? match[1] : "";
}

function authorizeCronRequest(req, configuredSecret) {
  const secret = String(configuredSecret || "").trim();
  if (Buffer.byteLength(secret, "utf8") < MIN_CRON_SECRET_BYTES) {
    return {
      ok: false,
      status: 503,
      reason: "cron_secret_not_configured",
      error: "Scheduled job authentication is not configured."
    };
  }

  const credential = bearerCredential(req);
  if (!credential || !constantTimeSecretEqual(credential, secret)) {
    return {
      ok: false,
      status: 401,
      reason: credential ? "invalid_credential" : "missing_or_malformed_credential",
      error: "Unauthorized scheduled job request."
    };
  }

  return { ok: true, status: 200, reason: "authorized" };
}

function isoWeekWindowKey(input = new Date()) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid cron window date.");

  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7);
  return `${utcDate.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function idempotencyUuid(key) {
  const bytes = crypto.createHash("sha256").update(String(key || ""), "utf8").digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20)
  ].join("-");
}

function structuredLog(logger, level, event, fields = {}) {
  const target = logger && typeof logger[level] === "function" ? logger[level] : logger?.log;
  if (typeof target !== "function") return;
  target.call(logger, JSON.stringify({
    event,
    at: new Date().toISOString(),
    ...fields
  }));
}

async function runSecuredScheduledJob({
  req,
  configuredSecret,
  jobName,
  now = new Date(),
  reserve,
  execute,
  complete,
  logger = console
}) {
  const authorization = authorizeCronRequest(req, configuredSecret);
  if (!authorization.ok) {
    structuredLog(logger, "warn", "scheduled_job_rejected", {
      job: jobName,
      reason: authorization.reason,
      status: authorization.status
    });
    return {
      status: authorization.status,
      body: { error: authorization.error }
    };
  }

  const window = isoWeekWindowKey(now);
  const idempotencyKey = `${jobName}:${window}`;
  const startedAt = Date.now();
  const acquired = await reserve({
    idempotencyKey,
    window,
    startedAt: new Date(now).toISOString()
  });

  if (!acquired) {
    structuredLog(logger, "info", "scheduled_job_skipped", {
      job: jobName,
      window,
      reason: "already_processed"
    });
    return {
      status: 200,
      body: {
        ok: true,
        skipped: true,
        reason: "already_processed",
        window
      }
    };
  }

  structuredLog(logger, "info", "scheduled_job_started", { job: jobName, window });

  try {
    const result = await execute({ idempotencyKey, window });
    const durationMs = Math.max(0, Date.now() - startedAt);
    const recordsRead = Math.max(0, Number(result?.recordsRead || 0));
    const recordsWritten = Math.max(0, Number(result?.recordsWritten || 0));

    await complete({
      idempotencyKey,
      window,
      status: "success",
      durationMs,
      recordsRead,
      recordsWritten,
      error: ""
    });

    structuredLog(logger, "info", "scheduled_job_completed", {
      job: jobName,
      window,
      duration_ms: durationMs,
      records_read: recordsRead,
      records_written: recordsWritten
    });

    return {
      status: 200,
      body: {
        ok: true,
        skipped: false,
        window,
        ...(result?.response || {})
      }
    };
  } catch (error) {
    const durationMs = Math.max(0, Date.now() - startedAt);
    const safeError = safeErrorMessage(error);
    try {
      await complete({
        idempotencyKey,
        window,
        status: "failed",
        durationMs,
        recordsRead: 0,
        recordsWritten: 0,
        error: safeError
      });
    } catch (logError) {
      structuredLog(logger, "error", "scheduled_job_completion_log_failed", {
        job: jobName,
        window,
        error: safeErrorMessage(logError)
      });
    }
    structuredLog(logger, "error", "scheduled_job_failed", {
      job: jobName,
      window,
      duration_ms: durationMs,
      error: safeError
    });
    return {
      status: 500,
      body: { error: "Scheduled job failed.", window }
    };
  }
}

module.exports = {
  MIN_CRON_SECRET_BYTES,
  authorizeCronRequest,
  bearerCredential,
  constantTimeSecretEqual,
  idempotencyUuid,
  isoWeekWindowKey,
  runSecuredScheduledJob,
  safeErrorMessage
};
