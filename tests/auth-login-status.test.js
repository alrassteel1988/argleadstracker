const assert = require("assert");
const http = require("http");
const path = require("path");

process.env.ADMIN_EMAIL = "admin-auth-status@alrassteel.test";
process.env.ADMIN_BOOTSTRAP_PASSWORD = "AdminPass123!";
process.env.APP_SESSION_SECRET = "test-session-secret";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-test-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-test-key";
process.env.AUTH_LOGIN_IP_LIMIT = "100";
process.env.AUTH_LOGIN_ACCOUNT_LIMIT = "100";
process.env.RATE_LIMIT_HASH_SECRET = "rate-limit-test-secret";

const supabasePath = path.join(__dirname, "..", "supabase-client.js");
const actualSupabaseClient = require(supabasePath);
require.cache[require.resolve(supabasePath)] = {
  id: supabasePath,
  filename: supabasePath,
  loaded: true,
  exports: {
    ...actualSupabaseClient,
    isSupabaseConfigured: () => true,
    isSupabaseAdminConfigured: () => true,
    serviceRest: async () => ({ allowed: true, remaining: 99, reset_after_seconds: 60 }),
    signIn: async () => {
      const error = new Error("Invalid login credentials");
      error.status = 400;
      throw error;
    }
  }
};

const server = require("../server");

function postJson(port, pathname, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const request = http.request({
      hostname: "127.0.0.1",
      port,
      path: pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload)
      }
    }, response => {
      let text = "";
      response.setEncoding("utf8");
      response.on("data", chunk => { text += chunk; });
      response.on("end", () => resolve({ response, data: JSON.parse(text || "{}") }));
    });
    request.on("error", reject);
    request.end(payload);
  });
}

(async () => {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  try {
    const result = await postJson(server.address().port, "/api/auth/login", {
      email: "missing@alrassteel.test",
      password: "WrongPass123!"
    });
    assert.strictEqual(result.response.statusCode, 401);
    assert.strictEqual(result.data.error, "Invalid email or password.");
    assert.strictEqual(result.data.token, undefined);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }

  console.log("PASS Supabase login failures return 401");
})().catch(error => {
  server.close(() => {});
  console.error(error);
  process.exitCode = 1;
});