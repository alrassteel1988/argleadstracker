const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service.role.signature";
process.env.SUPABASE_STORAGE_BUCKET = "pmr-voice-notes";

const {
  createStorageSignedUrl,
  rest,
  serviceRest,
  uploadStorageObject
} = require("../supabase-client");

function jsonResponse(body = []) {
  return {
    ok: true,
    status: 200,
    async json() {
      return body;
    }
  };
}

test("normal Supabase REST calls use the signed-in user's JWT", async t => {
  const calls = [];
  t.mock.method(global, "fetch", async (url, options) => {
    calls.push({ url, options });
    return jsonResponse([]);
  });

  await rest("leads?select=*", { token: "salesman.jwt.token" });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.headers.apikey, "anon-key");
  assert.equal(calls[0].options.headers.Authorization, "Bearer salesman.jwt.token");
});

test("normal Supabase REST calls reject missing user authentication", async () => {
  await assert.rejects(
    rest("leads?select=*"),
    /authenticated Supabase user token is required/
  );
});

test("service-role REST calls require an explicitly allowlisted operation", async t => {
  t.mock.method(global, "fetch", async () => jsonResponse([]));

  await assert.rejects(
    rest("leads?select=*", { service: true }),
    /service-role operation is not allowlisted/
  );
  await assert.rejects(
    serviceRest("untrusted.operation", "leads?select=*"),
    /service-role operation is not allowlisted/
  );
});

test("allowlisted cron operations use the service-role credential", async t => {
  const calls = [];
  t.mock.method(global, "fetch", async (url, options) => {
    calls.push({ url, options });
    return jsonResponse([]);
  });

  await serviceRest("cron.market_intelligence", "leads?select=id");

  assert.equal(calls[0].options.headers.apikey, "service.role.signature");
  assert.equal(calls[0].options.headers.Authorization, "Bearer service.role.signature");
});

test("Storage upload and signing use the user's JWT, not service role", async t => {
  const calls = [];
  t.mock.method(global, "fetch", async (url, options) => {
    calls.push({ url, options });
    return jsonResponse(url.includes("/sign/") ? { signedURL: "/storage/signed/file" } : {});
  });

  await uploadStorageObject("user-id/note.webm", Buffer.from("voice"), "audio/webm", "salesman.jwt.token");
  await createStorageSignedUrl("user-id/note.webm", 300, "salesman.jwt.token");

  assert.equal(calls.length, 2);
  calls.forEach(call => {
    assert.equal(call.options.headers.apikey, "anon-key");
    assert.equal(call.options.headers.Authorization, "Bearer salesman.jwt.token");
  });
});

test("server defaults CRM data access to the authenticated token", () => {
  const serverSource = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
  const helper = serverSource.match(/function supabaseDataOptions\(token, extra = \{\}\) \{[\s\S]*?\n\}/)?.[0] || "";

  assert.match(helper, /Authenticated Supabase access token required/);
  assert.match(helper, /\btoken\b/);
  assert.doesNotMatch(helper, /service\s*:\s*true/);
  assert.doesNotMatch(serverSource, /rest\([\s\S]{0,160}service\s*:\s*true/);
});

test("F-04 migration covers core tables and private CRM media", () => {
  const migration = fs.readFileSync(
    path.join(__dirname, "..", "supabase", "migrations", "20260730150000_enforce_user_scoped_rls.sql"),
    "utf8"
  );
  const requiredTables = [
    "profiles",
    "companies",
    "leads",
    "contacts",
    "search_history",
    "enrichment_status",
    "pmrs",
    "handoff_logs",
    "notifications",
    "ai_action_log",
    "attention_flags",
    "integration_logs",
    "market_intelligence",
    "agent_query_log",
    "app_config",
    "configuration_audit_log",
    "weekly_sales_reports",
    "weekly_report_events",
    "assistant_audit_logs",
    "email_drafts"
  ];

  requiredTables.forEach(table => {
    assert.match(migration, new RegExp(`alter table public\\.${table} force row level security`, "i"));
  });
  assert.match(migration, /create schema if not exists private/i);
  assert.match(migration, /create or replace function private\.crm_can_access_lead/i);
  assert.match(migration, /revoke all on function private\.crm_can_access_lead\(uuid\) from public/i);
  assert.match(migration, /grant execute on function private\.crm_can_access_lead\(uuid\) to authenticated/i);
  assert.match(migration, /select policyname\s+from pg_policies/i);
  assert.match(migration, /drop policy if exists %I on public\.%I/i);
  assert.match(migration, /on storage\.objects/i);
  assert.match(migration, /bucket_id = 'pmr-voice-notes'/i);
  assert.match(migration, /owner_id = auth\.uid\(\)::text/i);
});
