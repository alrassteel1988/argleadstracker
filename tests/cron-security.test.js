const assert = require("assert");
const {
  MIN_CRON_SECRET_BYTES,
  authorizeCronRequest,
  constantTimeSecretEqual,
  idempotencyUuid,
  isoWeekWindowKey,
  runSecuredScheduledJob
} = require("../src/services/cronSecurityService");
const server = require("../server");

const SECRET = "a".repeat(MIN_CRON_SECRET_BYTES * 2);

function request(authorization = "", url = "/api/cron/fetch-market-intelligence") {
  return { method: "GET", url, headers: authorization ? { authorization } : {} };
}

function responseRecorder() {
  return {
    status: 0,
    headers: {},
    body: "",
    writeHead(status, headers) {
      this.status = status;
      this.headers = headers;
    },
    end(body) {
      this.body = body || "";
    }
  };
}

async function run() {
  assert.strictEqual(constantTimeSecretEqual(SECRET, SECRET), true);
  assert.strictEqual(constantTimeSecretEqual(`${SECRET}x`, SECRET), false);
  assert.strictEqual(isoWeekWindowKey("2026-07-27T02:00:00.000Z"), "2026-W31");
  assert.strictEqual(isoWeekWindowKey("2026-08-02T23:59:59.000Z"), "2026-W31");
  assert.strictEqual(isoWeekWindowKey("2026-08-03T00:00:00.000Z"), "2026-W32");
  assert.strictEqual(
    idempotencyUuid("market_intelligence_weekly:2026-W31"),
    idempotencyUuid("market_intelligence_weekly:2026-W31")
  );
  assert.notStrictEqual(
    idempotencyUuid("market_intelligence_weekly:2026-W31"),
    idempotencyUuid("market_intelligence_weekly:2026-W32")
  );
  assert.match(idempotencyUuid("market_intelligence_weekly:2026-W31"), /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);

  const missingConfig = authorizeCronRequest(request(`Bearer ${SECRET}`), "");
  assert.strictEqual(missingConfig.status, 503);

  const weakConfig = authorizeCronRequest(request(`Bearer ${SECRET}`), "too-short");
  assert.strictEqual(weakConfig.status, 503);

  for (const candidate of [
    request(),
    request("Basic abc"),
    request("Bearer"),
    request("Bearer wrong"),
    request(`Bearer ${SECRET} trailing`),
    request("", `/api/cron/fetch-market-intelligence?secret=${SECRET}`)
  ]) {
    const rejected = authorizeCronRequest(candidate, SECRET);
    assert.strictEqual(rejected.status, 401, `${candidate.url} should be unauthorized`);
  }

  const authorized = authorizeCronRequest(request(`Bearer ${SECRET}`), SECRET);
  assert.strictEqual(authorized.ok, true);

  const previousSecret = process.env.CRON_SECRET;
  try {
    delete process.env.CRON_SECRET;
    const missingSecretResponse = responseRecorder();
    await server.handleApi(
      request(),
      missingSecretResponse,
      new URL("http://localhost/api/cron/fetch-market-intelligence")
    );
    assert.strictEqual(missingSecretResponse.status, 503);
    assert.deepStrictEqual(JSON.parse(missingSecretResponse.body), {
      error: "Scheduled job authentication is not configured."
    });

    process.env.CRON_SECRET = SECRET;
    const querySecretResponse = responseRecorder();
    await server.handleApi(
      request("", `/api/cron/fetch-market-intelligence?secret=${SECRET}`),
      querySecretResponse,
      new URL(`http://localhost/api/cron/fetch-market-intelligence?secret=${SECRET}`)
    );
    assert.strictEqual(querySecretResponse.status, 401);
  } finally {
    if (previousSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previousSecret;
  }

  let reservationCount = 0;
  let executionCount = 0;
  const completions = [];
  const reservations = new Set();
  const logger = { log() {}, info() {}, warn() {}, error() {} };
  const options = {
    configuredSecret: SECRET,
    jobName: "market_intelligence_weekly",
    now: new Date("2026-07-27T02:00:00.000Z"),
    logger,
    reserve: async ({ idempotencyKey }) => {
      reservationCount += 1;
      if (reservations.has(idempotencyKey)) return false;
      reservations.add(idempotencyKey);
      return true;
    },
    execute: async () => {
      executionCount += 1;
      return {
        recordsRead: 38,
        recordsWritten: 7,
        response: { imported: 7, disabled: false }
      };
    },
    complete: async result => completions.push(result)
  };

  for (const candidate of [
    request(),
    request("Bearer wrong"),
    request(`Bearer ${SECRET} trailing`)
  ]) {
    const rejected = await runSecuredScheduledJob({ ...options, req: candidate });
    assert.strictEqual(rejected.status, 401);
  }
  assert.strictEqual(reservationCount, 0, "rejected requests must not reserve a run");
  assert.strictEqual(executionCount, 0, "rejected requests must not execute job code");

  const first = await runSecuredScheduledJob({ ...options, req: request(`Bearer ${SECRET}`) });
  assert.strictEqual(first.status, 200);
  assert.strictEqual(first.body.skipped, false);
  assert.strictEqual(first.body.imported, 7);
  assert.strictEqual(executionCount, 1);
  assert.strictEqual(completions.length, 1);
  assert.strictEqual(completions[0].status, "success");
  assert.strictEqual(completions[0].recordsRead, 38);
  assert.strictEqual(completions[0].recordsWritten, 7);

  const duplicate = await runSecuredScheduledJob({ ...options, req: request(`Bearer ${SECRET}`) });
  assert.strictEqual(duplicate.status, 200);
  assert.strictEqual(duplicate.body.skipped, true);
  assert.strictEqual(duplicate.body.reason, "already_processed");
  assert.strictEqual(executionCount, 1, "duplicate requests must not execute job code");

  let failureCompletion = null;
  const failed = await runSecuredScheduledJob({
    ...options,
    jobName: "market_intelligence_failure_test",
    req: request(`Bearer ${SECRET}`),
    reserve: async () => true,
    execute: async () => {
      throw new Error("provider failed with private details");
    },
    complete: async result => {
      failureCompletion = result;
    }
  });
  assert.strictEqual(failed.status, 500);
  assert.deepStrictEqual(failed.body, {
    error: "Scheduled job failed.",
    window: "2026-W31"
  });
  assert.strictEqual(failureCompletion.status, "failed");
  assert.match(failureCompletion.error, /provider failed/);
}

run()
  .then(() => console.log("PASS cron authentication and idempotency"))
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
