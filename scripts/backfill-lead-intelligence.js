const baseUrl = String(process.env.BASE_URL || process.env.APP_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const limit = Math.max(1, Math.min(500, Number(process.env.LEAD_INTELLIGENCE_BACKFILL_LIMIT || process.argv[2] || 100)));
const refreshExisting = ["1", "true", "yes"].includes(String(process.env.LEAD_INTELLIGENCE_REFRESH_EXISTING || "").toLowerCase());

async function jsonRequest(path, { method = "GET", token = "", body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.error || data.code || `HTTP ${response.status}`;
    throw new Error(`${method} ${path} failed: ${message}`);
  }
  return data;
}

async function adminToken() {
  if (process.env.ADMIN_TOKEN) return process.env.ADMIN_TOKEN;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD || process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (!email || !password) throw new Error("Set ADMIN_TOKEN, or set ADMIN_EMAIL and ADMIN_PASSWORD/ADMIN_BOOTSTRAP_PASSWORD.");
  const login = await jsonRequest("/api/auth/login", { method: "POST", body: { email, password } });
  return login.token;
}

(async () => {
  const token = await adminToken();
  const result = await jsonRequest("/api/admin/lead-intelligence/backfill", {
    method: "POST",
    token,
    body: { limit, refresh_existing: refreshExisting }
  });
  console.log(JSON.stringify(result, null, 2));
})().catch(error => {
  console.error(error.message || error);
  process.exitCode = 1;
});