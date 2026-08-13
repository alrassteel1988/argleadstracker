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
  downloadStorageObjectFromBucketAsService,
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

function binaryResponse(body = "file-bytes") {
  const bytes = new TextEncoder().encode(body);
  return {
    ok: true,
    status: 200,
    async arrayBuffer() {
      return bytes.buffer;
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

test("server-validated lead insert is the only lead write allowlisted for service role", async t => {
  const calls = [];
  t.mock.method(global, "fetch", async (url, options) => {
    calls.push({ url, options });
    return jsonResponse([{ id: "lead-1" }]);
  });

  await serviceRest("leads.server_validated_insert", "leads?select=*", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: {
      company_name: "Validated Salesman Lead",
      created_by: "salesman-1",
      assigned_to: "salesman-1"
    }
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.method, "POST");
  assert.match(String(calls[0].url), /\/rest\/v1\/leads\?select=\*/);
  assert.equal(calls[0].options.headers.apikey, "service.role.signature");
  assert.equal(calls[0].options.headers.Authorization, "Bearer service.role.signature");
  await assert.rejects(
    serviceRest("leads.untrusted_update", "leads?id=eq.lead-1", { method: "PATCH", body: { assigned_to: "other" } }),
    /service-role operation is not allowlisted/
  );
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

test("lead intelligence server storage download uses service role and does not redirect browsers", async t => {
  const calls = [];
  t.mock.method(global, "fetch", async (url, options) => {
    calls.push({ url, options });
    return binaryResponse("%PDF-test");
  });

  const body = await downloadStorageObjectFromBucketAsService("lead-intelligence-reports", "lead-1/report.pdf");

  assert.equal(body.slice(0, 4).toString(), "%PDF");
  assert.equal(calls.length, 1);
  assert.match(String(calls[0].url), /\/storage\/v1\/object\/lead-intelligence-reports\/lead-1\/report\.pdf$/);
  assert.equal(calls[0].options.headers.apikey, "service.role.signature");
  assert.equal(calls[0].options.headers.Authorization, "Bearer service.role.signature");

  const serverSource = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
  assert.match(serverSource, /downloadStorageObjectFromBucketAsService\(LEAD_INTELLIGENCE_BUCKET,\s*report\.pdf_storage_key\)/);
  assert.doesNotMatch(serverSource, /leadIntelligencePdfMatch[\s\S]{0,900}writeHead\(302/);
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

test("production notification reconciliation precedes recipient-scoped policies", () => {
  const migrationDirectory = path.join(__dirname, "..", "supabase", "migrations");
  const reconciliationName = "20260803105000_reconcile_legacy_notifications_schema.sql";
  const policyName = "20260803105004_replace_legacy_rls_policies.sql";
  const reconciliation = fs.readFileSync(
    path.join(migrationDirectory, reconciliationName),
    "utf8"
  );
  const policyMigration = fs.readFileSync(
    path.join(migrationDirectory, policyName),
    "utf8"
  );

  assert.ok(reconciliationName < policyName);
  assert.match(reconciliation, /add column if not exists recipient_uid uuid/i);
  assert.match(reconciliation, /add column if not exists payload jsonb/i);
  assert.match(reconciliation, /coalesce\(data, '\{\}'::jsonb\)/i);
  assert.match(reconciliation, /notifications_recipient_uid_required/i);
  assert.match(reconciliation, /notifications_recipient_status_idx/i);
  assert.match(policyMigration, /using \(recipient_uid = auth\.uid\(\)\)/i);
});

test("salesman lead insert repair keeps ownership checks in RLS", () => {
  const migration = fs.readFileSync(
    path.join(__dirname, "..", "supabase", "migrations", "20260807170000_repair_salesman_lead_insert_policy.sql"),
    "utf8"
  );

  assert.match(migration, /grant insert on public\.leads to authenticated/i);
  assert.match(migration, /for insert to authenticated/i);
  assert.match(migration, /created_by = auth\.uid\(\)/i);
  assert.match(migration, /assigned_to = auth\.uid\(\)/i);
  assert.match(migration, /lower\(profile\.role\) = 'salesman'/i);
  assert.doesNotMatch(migration, /for update to authenticated/i);
  assert.doesNotMatch(migration, /for delete to authenticated/i);
});

test("function hardening migration removes anonymous RPC execution", () => {
  const migration = fs.readFileSync(
    path.join(__dirname, "..", "supabase", "migrations", "20260808045702_harden_function_execution_and_search_path.sql"),
    "utf8"
  );

  for (const signature of [
    "public.submit_weekly_report\\(jsonb, integer, text\\)",
    "public.review_weekly_report\\(text, text, text, text, text\\)"
  ]) {
    assert.match(migration, new RegExp(`revoke execute on function ${signature} from public`, "i"));
    assert.match(migration, new RegExp(`revoke execute on function ${signature} from anon`, "i"));
    assert.match(migration, new RegExp(`grant execute on function ${signature} to authenticated`, "i"));
  }

  [
    "admin_email",
    "current_email",
    '"current_role"',
    "is_admin",
    "is_manager",
    "can_write_tracker",
    "assigned_to_user\\(jsonb\\)",
    "can_read_company\\(jsonb\\)",
    "can_read_company_id\\(text\\)"
  ].forEach(name => {
    assert.match(migration, new RegExp(`alter function app_private\\.${name}`));
    assert.match(migration, /set search_path = app_private, public, pg_temp/i);
  });
});
