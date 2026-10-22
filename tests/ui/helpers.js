const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { expect } = require("@playwright/test");
const { FIXTURE_PASSWORD, FIXTURE_USERS } = require("./fixture-server");

const phase = process.env.CRM_UI_SCREENSHOT_PHASE || "after";
if (!["before", "after"].includes(phase)) throw new Error("Screenshot phase must be before or after");
const artifacts = path.resolve(process.env.CRM_UI_ARTIFACT_DIR || path.join(os.tmpdir(), "arg-crm-ui-screenshots"));

async function capture(page, info, name) {
  const directory = path.join(artifacts, phase, info.project.name);
  fs.mkdirSync(directory, { recursive: true });
  await page.screenshot({ path: path.join(directory, `${name}.png`), fullPage: true });
}

async function login(page, info) {
  const role = info.project.name.startsWith("admin") ? "admin" : "salesman";
  const user = FIXTURE_USERS.find(item => item.role === role);
  await page.goto("/");
  await expect(page.locator("#loginForm")).toBeVisible();
  await page.locator('#loginForm input[name="email"]').fill(user.email);
  await page.locator('#loginForm input[name="password"]').fill(FIXTURE_PASSWORD);
  await page.locator('#loginForm button[type="submit"]').click();
  await expect(page.locator("#appShell")).toBeVisible();
  await expect(page.locator("#loginForm")).toBeHidden();
  // Wait for the known synthetic records, not the initial zero/loading frame.
  if (role === "admin") await expect(page.locator("#metricValue")).toHaveText("9");
  else await expect(page.locator('[data-summary-card="salesmanMyLeads"] strong')).toHaveText("12");
  return role;
}

async function blockExternalTraffic(page) {
  // Prevent accidental provider/API traffic from the test browser. Static font/chart hosts
  // already used by the app are allowed; no customer data exists in this fixture.
  await page.route("**/*", route => {
    const url = new URL(route.request().url());
    if (["127.0.0.1", "fonts.googleapis.com", "fonts.gstatic.com", "cdnjs.cloudflare.com"].includes(url.hostname)
      || ["data:", "blob:"].includes(url.protocol)) return route.continue();
    return route.abort("blockedbyclient");
  });

}

module.exports = { phase, capture, login, blockExternalTraffic };
