const assert = require("assert");
const fs = require("fs");
const path = require("path");

const {
  consumeLocalBucket,
  hashRateLimitSubject,
  normalizeAccountIdentifier,
  policyFromEnvironment,
  requestRateLimitCategory
} = require("../src/services/rateLimitService");

const root = path.join(__dirname, "..");
const serverSource = fs.readFileSync(path.join(root, "server.js"), "utf8");
const supabaseClientSource = fs.readFileSync(path.join(root, "supabase-client.js"), "utf8");
const migrationSource = fs.readFileSync(
  path.join(root, "supabase", "migrations", "20260730170000_add_durable_rate_limits.sql"),
  "utf8"
);

const secret = "test-rate-limit-secret-at-least-32-bytes";
const subjectHash = hashRateLimitSubject("login:account", "person@example.com", secret);
assert.match(subjectHash, /^[a-f0-9]{64}$/);
assert.strictEqual(normalizeAccountIdentifier(" Person@Example.COM "), "person@example.com");

const policy = { limit: 2, windowMs: 60_000, blockMs: 5_000 };
const db = {};
const first = consumeLocalBucket(db, {
  scope: "login:account",
  subjectHash,
  policy,
  nowMs: 1_000_000
});
const second = consumeLocalBucket(db, {
  scope: "login:account",
  subjectHash,
  policy,
  nowMs: 1_000_001
});
const denied = consumeLocalBucket(db, {
  scope: "login:account",
  subjectHash,
  policy,
  nowMs: 1_000_002
});
assert.strictEqual(first.allowed, true);
assert.strictEqual(second.allowed, true);
assert.strictEqual(denied.allowed, false);
assert.strictEqual(denied.retryAfterSeconds, 5);
assert.strictEqual(db.rate_limit_buckets[0].subject_hash, subjectHash);
assert.ok(!JSON.stringify(db).includes("person@example.com"), "Persistent buckets must not store raw account identifiers.");

const restartedDb = JSON.parse(JSON.stringify(db));
const stillDenied = consumeLocalBucket(restartedDb, {
  scope: "login:account",
  subjectHash,
  policy,
  nowMs: 1_001_000
});
assert.strictEqual(stillDenied.allowed, false, "A separate process reading the same durable bucket must share the limit.");

consumeLocalBucket(restartedDb, {
  scope: "login:account",
  subjectHash,
  policy,
  nowMs: 1_006_000
});
consumeLocalBucket(restartedDb, {
  scope: "login:account",
  subjectHash,
  policy,
  nowMs: 1_006_001
});
const progressiveBlock = consumeLocalBucket(restartedDb, {
  scope: "login:account",
  subjectHash,
  policy,
  nowMs: 1_006_002
});
assert.strictEqual(progressiveBlock.allowed, false);
assert.strictEqual(progressiveBlock.retryAfterSeconds, 10, "Repeated bursts must receive a progressive block.");

assert.deepStrictEqual(policyFromEnvironment("ai", {
  RATE_LIMIT_AI_MAX: "7",
  RATE_LIMIT_AI_WINDOW_SECONDS: "30",
  RATE_LIMIT_AI_BLOCK_SECONDS: "45"
}), { limit: 7, windowMs: 30_000, blockMs: 45_000 });

assert.strictEqual(requestRateLimitCategory("POST", "/api/ai-assistant/interpret"), "ai");
assert.strictEqual(requestRateLimitCategory("POST", "/api/transcriptions"), "transcription");
assert.strictEqual(requestRateLimitCategory("POST", "/api/exports/pipeline-report.pdf"), "export");
assert.strictEqual(requestRateLimitCategory("POST", "/api/pmr-voice-notes"), "upload");
assert.strictEqual(requestRateLimitCategory("POST", "/api/places/search"), "search");
assert.strictEqual(requestRateLimitCategory("GET", "/api/weekly-reports/review"), "report");
assert.strictEqual(requestRateLimitCategory("GET", "/api/leads"), "");

assert.ok(serverSource.includes("enforceAuthenticatedRateLimits(req, res, url, db, user, supabaseEnabled)"));
assert.ok(serverSource.includes('res.setHeader("Retry-After"'));
assert.ok(!serverSource.includes("const transcriptionRateLimit = new Map()"));
assert.ok(!serverSource.includes("const assistantRateLimit = new Map()"));
assert.ok(supabaseClientSource.includes('"security.rate_limits"'));

assert.match(migrationSource, /create table if not exists private\.rate_limit_buckets/i);
assert.match(migrationSource, /pg_advisory_xact_lock/i);
assert.match(migrationSource, /security definer/i);
assert.match(migrationSource, /revoke all on function public\.consume_rate_limit[\s\S]*from public/i);
assert.match(migrationSource, /grant execute on function public\.consume_rate_limit[\s\S]*to service_role/i);
assert.doesNotMatch(migrationSource, /grant execute[\s\S]*to authenticated/i);

console.log("Durable rate-limit security tests passed.");
