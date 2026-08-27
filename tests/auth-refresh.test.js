const assert = require("node:assert/strict");
const http = require("node:http");
const path = require("node:path");

process.env.ADMIN_EMAIL = "admin-refresh@alrassteel.test";
process.env.ADMIN_BOOTSTRAP_PASSWORD = "AdminPass123!";
process.env.APP_SESSION_SECRET = "test-session-secret";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-test-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-test-key";
process.env.AUTH_LOGIN_IP_LIMIT = "100";
process.env.AUTH_LOGIN_ACCOUNT_LIMIT = "100";
process.env.RATE_LIMIT_HASH_SECRET = "rate-limit-test-secret";

const supabasePath = path.join(__dirname, "..", "supabase-client.js");
const actual = require(supabasePath);
require.cache[require.resolve(supabasePath)] = {
  id: supabasePath,
  filename: supabasePath,
  loaded: true,
  exports: {
    ...actual,
    isSupabaseConfigured: () => true,
    isSupabaseAdminConfigured: () => true,
    serviceRest: async () => ({ allowed: true, remaining: 99, reset_after_seconds: 60 }),
    refreshSession: async () => ({ access_token: "synthetic-access-token", refresh_token: "synthetic-rotated-refresh-token" }),
    currentSupabaseUser: async () => ({ id: "synthetic-salesman", email: "salesman@example.test", name: "Synthetic Salesman", role: "salesman", status: "active" })
  }
};

const server = require("../server");

function postJson(port, pathname, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const request = http.request({ hostname: "127.0.0.1", port, path: pathname, method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } }, response => {
      let text = "";
      response.on("data", chunk => { text += chunk; });
      response.on("end", () => resolve({ response, data: JSON.parse(text || "{}") }));
    });
    request.on("error", reject);
    request.end(payload);
  });
}

(async () => {
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  try {
    const refreshed = await postJson(server.address().port, "/api/auth/refresh", { refresh_token: "synthetic-refresh-token" });
    assert.equal(refreshed.response.statusCode, 200);
    assert.equal(refreshed.data.user.role, "salesman");
    const missing = await postJson(server.address().port, "/api/auth/refresh", {});
    assert.equal(missing.response.statusCode, 401);
    assert.equal(missing.data.token, undefined);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
  console.log("PASS refresh session route");
})().catch(error => {
  server.close(() => {});
  console.error(error);
  process.exitCode = 1;
});
