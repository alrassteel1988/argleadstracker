const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");

function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;
  fs.readFileSync(envPath, "utf8").split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const separator = trimmed.indexOf("=");
    if (separator < 1) return;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
    if (!process.env[key]) process.env[key] = value;
  });
}

loadEnv();

const BASE_URL = String(process.env.STAGING_BASE_URL || process.env.TEST_BASE_URL || "").replace(/\/$/, "");
const TEST_SUPABASE_URL = String(process.env.TEST_SUPABASE_URL || "").replace(/\/$/, "");
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD;
const PRODUCTION_HOSTS = new Set(["argleadstracker.vercel.app"]);
const PRODUCTION_SUPABASE_URLS = new Set(["https://emxumtmuatbetkztbsqn.supabase.co"]);

if (BASE_URL) {
  let host = "";
  try {
    host = new URL(BASE_URL).hostname.toLowerCase();
  } catch {
    throw new Error("STAGING_BASE_URL must be an absolute URL.");
  }
  if (PRODUCTION_HOSTS.has(host)) {
    throw new Error("Refusing to run mutable UAT against production. Set STAGING_BASE_URL to the isolated staging/test deployment.");
  }
  if (!TEST_SUPABASE_URL) {
    throw new Error("Refusing to run mutable UAT without TEST_SUPABASE_URL for the isolated staging/test project.");
  }
  const configuredSupabaseUrls = [
    TEST_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_URL
  ].filter(Boolean).map(value => String(value).replace(/\/$/, ""));
  if (configuredSupabaseUrls.some(value => PRODUCTION_SUPABASE_URLS.has(value))) {
    throw new Error("Refusing to run mutable UAT while any configured Supabase URL is the production project.");
  }
}

async function api(request, method, pathname, token = "", body = undefined) {
  const response = await request.fetch(`${BASE_URL}${pathname}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    data: body
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

test("isolated staging salesman can add a lead through the UI", async ({ page, request }, testInfo) => {
  test.setTimeout(90000);
  test.skip(!BASE_URL || !TEST_SUPABASE_URL || !ADMIN_EMAIL || !ADMIN_PASSWORD, "STAGING_BASE_URL, TEST_SUPABASE_URL, TEST_ADMIN_EMAIL, and TEST_ADMIN_PASSWORD are required.");

  const stamp = Date.now();
  const email = `go-live-browser-${stamp}@alrassteel.test`;
  const password = `TempPass!${stamp}`;
  const companyName = `ZZZ GO LIVE BROWSER ${stamp}`;
  let adminToken = "";
  let salesmanId = "";
  let leadId = "";

  try {
    const adminLogin = await api(request, "POST", "/api/auth/login", "", { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    expect(adminLogin.response.status(), JSON.stringify(adminLogin.data)).toBe(200);
    adminToken = adminLogin.data.token;

    const account = await api(request, "POST", "/api/users", adminToken, {
      name: `Go Live Browser ${stamp}`,
      email,
      password,
      territory: "UAE-North"
    });
    expect(account.response.status(), JSON.stringify(account.data)).toBe(201);
    salesmanId = account.data.id;

    await page.setViewportSize(testInfo.project.name.includes("mobile") || process.env.UAT_VIEWPORT === "mobile"
      ? { width: 390, height: 844 }
      : { width: 1366, height: 900 });
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await expect(page.locator("#loginForm")).toBeVisible();
    await page.locator("#loginForm input[name=email]").fill(email);
    await page.locator("#loginForm input[name=password]").fill(password);
    await page.locator("#loginForm button[type=submit]").click();
    await expect(page.locator("#salesmanSimplifiedAddLead")).toBeVisible({ timeout: 15000 });

    await page.locator("#salesmanSimplifiedAddLead").click();
    await expect(page.locator("#leadDialog")).toBeVisible();
    await page.locator("#leadCompanyName").fill(companyName);
    await page.locator("#leadStepNext").click();
    await expect(page.locator("[data-lead-step-panel='1']")).toBeVisible();
    await page.locator("#leadStepNext").click();
    await expect(page.locator("#leadSubmitButton")).toBeVisible();
    await page.locator("#leadForm textarea[name=notes]").fill("Disposable browser UAT lead created before go-live.");
    const [saveResponse] = await Promise.all([
      page.waitForResponse(response => response.url() === `${BASE_URL}/api/leads` && response.request().method() === "POST", { timeout: 30000 }),
      page.locator("#leadForm").evaluate(form => form.requestSubmit())
    ]);
    expect(saveResponse.status(), await saveResponse.text().catch(() => "")).toBe(201);
    const savedLead = await saveResponse.json();
    leadId = savedLead.id;
    await expect(page.locator("#leadDialog")).not.toBeVisible({ timeout: 15000 });
    await expect(page.locator("body")).toContainText(companyName, { timeout: 30000 });

    const leads = await api(request, "GET", "/api/leads", adminToken);
    const created = Array.isArray(leads.data) ? leads.data.find(lead => lead.id === leadId || lead.company_name === companyName) : null;
    expect(created, "created lead should be visible to admin after UI save").toBeTruthy();
    expect(String(created.assigned_to || "")).toBe(String(salesmanId));
    expect(String(created.territory || "")).toBe("UAE-North");
  } finally {
    if (adminToken && !leadId) {
      const leads = await api(request, "GET", "/api/leads", adminToken).catch(() => ({ data: [] }));
      const created = Array.isArray(leads.data) ? leads.data.find(lead => lead.company_name === companyName) : null;
      leadId = created?.id || "";
    }
    if (adminToken && leadId) {
      await api(request, "DELETE", `/api/leads/${encodeURIComponent(leadId)}`, adminToken, { admin_password: ADMIN_PASSWORD });
    }
    if (adminToken && salesmanId) {
      await api(request, "PATCH", `/api/users/${encodeURIComponent(salesmanId)}`, adminToken, {
        status: "inactive",
        admin_password: ADMIN_PASSWORD
      });
    }
  }
});
