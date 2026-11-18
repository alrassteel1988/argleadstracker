const { test, expect } = require("@playwright/test");
const { login, blockExternalTraffic, capture } = require("./helpers");

test("registration shows the actual creator in Admin Activity without inventing follow-ups", async ({ page, browser }, info) => {
  test.skip(!info.project.name.startsWith("admin"), "Verifies both roles in separate synthetic sessions");
  await blockExternalTraffic(page);
  await login(page, info);
  const context = await browser.newContext({ baseURL: info.project.use.baseURL, viewport: info.project.use.viewport,
    isMobile: info.project.use.isMobile, hasTouch: info.project.use.hasTouch, serviceWorkers: "block" });
  try {
    const sales = await context.newPage();
    await blockExternalTraffic(sales);
    await login(sales, { project: { name: "salesman" } });
    await page.goto("/?view=activity");
    const log = page.locator("#adminReferenceActivity");
    await expect(log.locator(".admin-ref-activity-table tbody tr")).toHaveCount(18);
    const beforePending = Number(await log.locator(".admin-ref-stat.warning strong").innerText());
    const beforeMissing = Number(await log.locator(".admin-activity-missing strong").innerText());
    const create = async (target, company, admin) => {
      await target.goto("/?view=pipeline");
      await target.locator("#openLeadForm").click({ timeout: 8000 });
      await target.locator("#leadCompanyName").fill(company);
      if (admin) await target.locator("#formSalesman").selectOption("Demo Salesman");
      await target.locator("#leadStepNext").click();
      await target.locator("#leadStepNext").click();
      const saving = target.waitForResponse(response => response.url().endsWith("/api/leads") && response.request().method() === "POST");
      await target.locator("#leadSubmitButton").click();
      const response = await saving;
      const saved = await response.json();
      expect(response.status(), JSON.stringify(saved)).toBe(201);
      expect(saved.activities.filter(item => item.lead_creation)).toHaveLength(1);
      await expect(target.locator("#leadDialog")).toBeHidden();
      return saved;
    };
    const salesCompany = "Amber Harbor Signup Fixture";
    const adminCompany = "Silver Crest Registration Works";
    const registered = await create(sales, salesCompany, false);
    await create(page, adminCompany, true);
    await page.goto("/?view=activity");
    const recorded = log.locator(".admin-ref-activity-table tbody tr").filter({ hasText: "New Lead Account creation" });
    await expect(recorded).toHaveCount(2);
    const self = recorded.filter({ hasText: salesCompany });
    await expect(self.locator('[data-label="Type"]')).toHaveText("Lead creation");
    await expect(self.locator('[data-label="Logged by"]')).toHaveText("Demo Salesman");
    await expect(self.locator('[data-label="Origin"]')).toContainText("Self");
    await expect(self.locator('[data-label="Status & remarks"]')).toContainText("Recorded");
    await expect(self).not.toContainText("No remarks");
    const managed = recorded.filter({ hasText: adminCompany });
    await expect(managed.locator('[data-label="Type"]')).toHaveText("Lead creation");
    await expect(managed.locator('[data-label="Logged by"]')).toHaveText("Demo Admin");
    await expect(managed.locator('[data-label="Origin"]')).toContainText("Management");
    await expect(log.locator(".admin-ref-stat.warning strong")).toHaveText(String(beforePending + 1));
    await expect(log.locator(".admin-activity-missing strong")).toHaveText(String(beforeMissing + 1));
    await expect(log.locator(".admin-ref-stat.teal b")).toHaveText("/ 19");
    await capture(page, info, "admin-lead-creation-attribution");
    await sales.goto("/?view=activity");
    const personal = sales.locator("#adminReferenceActivity");
    await expect(personal.locator(".admin-ref-activity-table tbody tr").filter({ hasText: "New Lead Account creation" })).toHaveCount(1);
    await expect(personal.locator(".admin-ref-activity-table tbody tr").filter({ hasText: "New Lead Account creation" })).toContainText(salesCompany);
    await expect(personal.locator(".admin-ref-activity-table tbody tr").filter({ hasText: adminCompany })).toHaveCount(0);
    await sales.goto(`/leads/${registered.id}?tab=activities`);
    const creation = sales.locator(".activity-item").filter({ hasText: "New Lead Account creation" });
    await expect(creation).toHaveCount(1);
    await expect(creation.getByRole("button", { name: "Edit", exact: true })).toHaveCount(0);
    await expect(creation.getByRole("button", { name: "Request Deletion", exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  } finally { await context.close().catch(() => {}); }
});
