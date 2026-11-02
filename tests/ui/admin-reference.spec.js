const { test, expect } = require("@playwright/test");
const { login, capture, blockExternalTraffic } = require("./helpers");

test.beforeEach(async ({ page }) => {
  page.on("pageerror", error => console.log(`Admin UI runtime error: ${error.message}`));
  await blockExternalTraffic(page);
  await page.route("**/api/leads", async route => {
    if (route.request().method() !== "GET") return route.continue();
    const response = await route.fetch();
    const leads = await response.json();
    await route.fulfill({ response, json: leads.map((lead, i) => ({ ...lead,
      quotation_ref: i < 3 ? `TEST-Q-${i}` : "",
      activities: (lead.activities || []).map(activity => ({ ...activity,
        created_by: i === 0 ? "ui-admin" : activity.created_by,
        created_by_name: i === 0 ? "Demo Admin" : lead.assigned_salesman,
        transaction_status: i === 1 ? "closed" : "pending",
        transaction_outcome: i === 1 ? "Done - spoke to customer" : "",
        transaction_remarks: i === 1 ? "Synthetic customer requirements confirmed." : ""
      }))
    })) });
  });
});

test("reference dashboard keeps real counts, drilldowns and responsive shell", async ({ page }, info) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const role = await login(page, info);
  if (role !== "admin") {
    await expect(page.locator("body")).not.toHaveClass(/admin-reference-mode/);
    await expect(page.locator("#salesmanSimplifiedDashboard")).toBeVisible();
    return;
  }
  await expect(page.locator(".admin-ref-attention-card")).toHaveCount(4);
  await expect(page.locator("#metricValue")).toHaveText("9");
  await expect(page.locator("#adminReferenceInsights > details")).not.toHaveAttribute("open");
  const order = await page.evaluate(() => ["adminDashboardTriageRow", "metricsShell", "actionPlanPanel", "adminDashboardAnalyticsRow"].map(id => document.getElementById(id).getBoundingClientRect().top));
  expect(order).toEqual([...order].sort((a, b) => a - b));
  await page.locator(".action-plan-toggle").first().click();
  await expect(page.locator(".salesman-plan-table-region").first()).toBeVisible();
  await page.locator("[data-summary-card='openPipeline']").click();
  await expect(page.locator("#summaryCardDetailsDialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.locator("[data-admin-interaction='cold']").click();
  await expect(page.locator("#relationshipFocusPanel")).toBeVisible();
  await page.locator("[data-admin-interaction='latest']").click();
  await expect(page.locator("#dashboardActivityFeed")).toBeVisible();
  await page.locator(".action-plan-toggle").first().click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await capture(page, info, "admin-reference-dashboard");
  if (!info.project.name.endsWith("mobile")) {
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    expect(await page.locator("#mobileSidebar").evaluate(element => Math.abs(element.getBoundingClientRect().top))).toBeLessThanOrEqual(1);
  }
  expect(errors).toEqual([]);
});

test("Admin activity filters origin, notes and status without mutation controls", async ({ page }, info) => {
  const role = await login(page, info);
  await page.goto("/?view=activity");
  if (role !== "admin") { await expect(page.locator("#activityView")).toBeHidden(); return; }
  const host = page.locator("#adminReferenceActivity");
  await expect(host.locator(".admin-ref-activity-table tbody tr")).toHaveCount(18);
  const menu = host.locator(info.project.name.endsWith("mobile") ? ".admin-ref-mobile-filters" : "thead");
  const origin = menu.locator(".admin-ref-filter").filter({ has: page.locator("summary", { hasText: /^Origin/ }) });
  await origin.locator("summary").click();
  await origin.locator("[data-value='Management']").click();
  await expect(host.locator(".admin-ref-activity-table tbody tr")).toHaveCount(1);
  await expect(host.locator("[data-admin-clear-filter='origin']")).toContainText("Assigned by management");
  await host.locator("[data-admin-clear-all]").click();
  await host.locator("[data-admin-activity-search]").fill("requirements confirmed");
  await expect(host.locator(".admin-ref-activity-table tbody tr")).toHaveCount(1);
  await expect(host.locator("tbody")).toContainText("Closed");
  await host.locator("[data-admin-activity-history]").click();
  await expect(page.locator("#activityDetailsDialog")).toBeVisible();
  await expect(page.locator("#editActivityFromDetails")).toBeHidden();
  await expect(page.locator("#requestActivityDeletionFromDetails")).toBeHidden();
  await page.keyboard.press("Escape");
  await host.locator("[data-admin-clear-all]").click();
  expect(await host.locator(".activity-dashboard").count()).toBe(1);
  await capture(page, info, "admin-reference-activity");
});

test("accounts and quotes use records, filters, pagination and existing lead page", async ({ page }, info) => {
  const role = await login(page, info);
  await page.goto("/?view=accounts");
  if (role !== "admin") { await expect(page.locator("#adminRecordsView")).toBeHidden(); return; }
  const host = page.locator("#adminRecordsView");
  await expect(page.locator("#appShell")).toBeVisible();
  await expect(host).toBeVisible();
  await expect(host.locator("tbody tr")).toHaveCount(10);
  await host.locator("[aria-label='Next page']").click();
  await expect(host.locator("tbody tr")).toHaveCount(8);
  await host.locator("[data-admin-record-search]").fill("Company 01");
  await expect(host.locator("tbody tr")).toHaveCount(1);
  await host.locator("[data-admin-open-lead]").first().click();
  await expect(page.locator("#leadDetailView")).toBeVisible();
  await page.goto("/?view=quotes");
  await expect(host.locator("tbody tr")).toHaveCount(3);
  await expect(host).toContainText("TEST-Q-0");
  await expect(host).toContainText("not ERP quote totals");
  await capture(page, info, "admin-reference-quotes");
  await page.goto("/?view=accounts");
  await capture(page, info, "admin-reference-accounts");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test("Salesmen instant filters and weekly report review remain available", async ({ page }, info) => {
  const role = await login(page, info);
  if (role !== "admin") return;
  await page.goto("/?view=salesmen");
  await expect(page.locator(".salesmen-directory-table tbody tr")).toHaveCount(2);
  await page.locator("#salesmenSearch").fill("Other Demo");
  await expect(page.locator(".salesmen-directory-table tbody tr")).toHaveCount(1);
  await page.locator("#clearSalesmenFilters").click();
  await capture(page, info, "admin-reference-salesmen");
  await page.goto("/?view=tasks");
  await expect(page.locator("#tasksView")).toBeVisible();
  await expect(page.locator("#tasksPrimary")).toContainText(/report|submission/i);
  await capture(page, info, "admin-reference-tasks");
});
