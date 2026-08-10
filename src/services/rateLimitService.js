const crypto = require("crypto");

const MINUTE = 60_000;

const RATE_LIMIT_POLICIES = Object.freeze({
  login_ip: { limit: 20, windowMs: 15 * MINUTE, blockMs: 5 * MINUTE },
  login_account: { limit: 5, windowMs: 15 * MINUTE, blockMs: 15 * MINUTE },
  ai: { limit: 30, windowMs: MINUTE, blockMs: MINUTE },
  transcription: { limit: 10, windowMs: MINUTE, blockMs: MINUTE },
  export: { limit: 20, windowMs: 10 * MINUTE, blockMs: 5 * MINUTE },
  upload: { limit: 30, windowMs: 10 * MINUTE, blockMs: 5 * MINUTE },
  search: { limit: 60, windowMs: MINUTE, blockMs: MINUTE },
  report: { limit: 30, windowMs: 10 * MINUTE, blockMs: 5 * MINUTE }
});

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function policyFromEnvironment(name, source = process.env) {
  const base = RATE_LIMIT_POLICIES[name];
  if (!base) throw new Error(`Unknown rate-limit policy: ${name}`);
  const prefix = `RATE_LIMIT_${name.toUpperCase()}`;
  return {
    limit: positiveInteger(source[`${prefix}_MAX`], base.limit),
    windowMs: positiveInteger(source[`${prefix}_WINDOW_SECONDS`], Math.ceil(base.windowMs / 1000)) * 1000,
    blockMs: positiveInteger(source[`${prefix}_BLOCK_SECONDS`], Math.ceil(base.blockMs / 1000)) * 1000
  };
}

function normalizeAccountIdentifier(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "");
}

function hashRateLimitSubject(scope, subject, secret) {
  const key = String(secret || "").trim();
  if (key.length < 16) throw new Error("RATE_LIMIT_HASH_SECRET or APP_SESSION_SECRET must contain at least 16 characters.");
  return crypto
    .createHmac("sha256", key)
    .update(`${String(scope || "").trim()}:${String(subject || "").trim()}`)
    .digest("hex");
}

function normalizeRateLimitResult(result, policy, nowMs = Date.now()) {
  const source = Array.isArray(result) ? result[0] : result;
  const retryAfterSeconds = Math.max(0, Number(source?.retry_after_seconds ?? source?.retryAfterSeconds ?? 0) || 0);
  const resetAt = source?.reset_at || source?.resetAt || new Date(nowMs + policy.windowMs).toISOString();
  return {
    allowed: Boolean(source?.allowed),
    count: Math.max(0, Number(source?.current_count ?? source?.count ?? 0) || 0),
    remaining: Math.max(0, Number(source?.remaining ?? 0) || 0),
    retryAfterSeconds,
    resetAt
  };
}

function consumeLocalBucket(db, {
  scope,
  subjectHash,
  policy,
  nowMs = Date.now()
}) {
  db.rate_limit_buckets = Array.isArray(db.rate_limit_buckets) ? db.rate_limit_buckets : [];
  const nowIso = new Date(nowMs).toISOString();
  let bucket = db.rate_limit_buckets.find(item => item.scope === scope && item.subject_hash === subjectHash);
  if (!bucket) {
    bucket = {
      scope,
      subject_hash: subjectHash,
      window_started_at: nowIso,
      count: 0,
      strike_count: 0,
      blocked_until: null,
      updated_at: nowIso
    };
    db.rate_limit_buckets.push(bucket);
  }

  const blockedUntilMs = bucket.blocked_until ? Date.parse(bucket.blocked_until) : 0;
  if (blockedUntilMs > nowMs) {
    return {
      allowed: false,
      count: bucket.count,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((blockedUntilMs - nowMs) / 1000)),
      resetAt: bucket.blocked_until
    };
  }

  const windowStartedMs = Date.parse(bucket.window_started_at) || nowMs;
  if (blockedUntilMs || nowMs - windowStartedMs >= policy.windowMs) {
    bucket.window_started_at = nowIso;
    bucket.count = 0;
    bucket.blocked_until = null;
    if (!blockedUntilMs) {
      bucket.strike_count = Math.max(0, Number(bucket.strike_count || 0) - 1);
    }
  }

  bucket.count = Number(bucket.count || 0) + 1;
  bucket.updated_at = nowIso;
  const windowResetMs = Date.parse(bucket.window_started_at) + policy.windowMs;
  if (bucket.count > policy.limit) {
    bucket.strike_count = Math.min(5, Number(bucket.strike_count || 0) + 1);
    const blockMs = policy.blockMs * (2 ** Math.max(0, bucket.strike_count - 1));
    bucket.blocked_until = new Date(nowMs + blockMs).toISOString();
    return {
      allowed: false,
      count: bucket.count,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil(blockMs / 1000)),
      resetAt: bucket.blocked_until
    };
  }

  return {
    allowed: true,
    count: bucket.count,
    remaining: Math.max(0, policy.limit - bucket.count),
    retryAfterSeconds: 0,
    resetAt: new Date(windowResetMs).toISOString()
  };
}

function resetLocalBucket(db, scope, subjectHash) {
  db.rate_limit_buckets = (Array.isArray(db.rate_limit_buckets) ? db.rate_limit_buckets : [])
    .filter(item => item.scope !== scope || item.subject_hash !== subjectHash);
}

function requestRateLimitCategory(method, pathname) {
  const verb = String(method || "GET").toUpperCase();
  const path = String(pathname || "");
  if (verb === "POST" && (
    path.startsWith("/api/ai-assistant/") ||
    path === "/api/agent/query" ||
    path === "/api/salesperson-ai-actions" ||
    path === "/api/ai/lead-summary" ||
    /\/api\/leads\/[^/]+\/ai-actions$/.test(path) ||
      /\/api\/leads\/[^/]+\/intelligence\/(generate|refresh|retry)$/.test(path) ||
      path === "/api/admin/lead-intelligence/process"
  )) return "ai";
  if (verb === "POST" && ["/api/transcriptions", "/api/pmrs/analyze-transcript"].includes(path)) return "transcription";
  if ((verb === "GET" || verb === "POST") && path.startsWith("/api/exports/")) return "export";
  if (verb === "POST" && (
    path === "/api/pmr-voice-notes" ||
    /\/api\/leads\/[^/]+\/activities\/[^/]+\/attachments$/.test(path)
  )) return "upload";
  if (verb === "POST" && ["/api/places/search", "/api/leads/enrich-company"].includes(path)) return "search";
  if (
    path.startsWith("/api/weekly-reports/") ||
    (verb === "POST" && path === "/api/market-intelligence/fetch")
  ) return "report";
  return "";
}

function rateLimitHeaders(policy, result) {
  return {
    "RateLimit-Limit": String(policy.limit),
    "RateLimit-Remaining": String(result.remaining),
    "RateLimit-Reset": String(Math.max(0, Math.ceil((Date.parse(result.resetAt) - Date.now()) / 1000)))
  };
}

module.exports = {
  RATE_LIMIT_POLICIES,
  consumeLocalBucket,
  hashRateLimitSubject,
  normalizeAccountIdentifier,
  normalizeRateLimitResult,
  policyFromEnvironment,
  rateLimitHeaders,
  requestRateLimitCategory,
  resetLocalBucket
};
