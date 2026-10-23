const { test, expect } = require("@playwright/test");
const { capture, login, blockExternalTraffic } = require("./helpers");

test.beforeEach(async ({ page }) => blockExternalTraffic(page));

test("dashboard layout, existing drill-down counts and management controls", async ({ page }, info) => {
  const role = await login(page, info);
  if (role === "admin") {
    const positions = await page.locator("#dashboardView").evaluate(root => {
      const box = id => root.querySelector(id).getBoundingClientRect();
      return { alert: box("#overdueBanner").bottom, metrics: box("#adminDashboardOverviewSlot").top,
        plans: box("#actionPlanPanel").toJSON(), intel: box("#marketIntelPanel").toJSON() };
    });
    expect(positions.metrics).toBeGreaterThan(positions.alert);
    if (info.project.name.endsWith("mobile")) expect(positions.intel.top).toBeGreaterThanOrEqual(positions.plans.bottom);
    else expect(positions.intel.left).toBeGreaterThan(positions.plans.right);
    await expect(page.locator("#actionPlanPanel")).toHaveCSS("background-color", "rgb(254, 252, 253)");
    if (info.project.name.endsWith("mobile")) {
      const report = await page.locator("#overdueBanner .overdue-action").boundingBox();
      const dismiss = await page.locator("#overdueBanner .overdue-dismiss").boundingBox();
      expect(Math.abs(report.y - dismiss.y)).toBeLessThanOrEqual(1);
    }
    await expect(page.locator("#actionPlanPanel .salesman-plan-card")).toHaveCount(2);
    await page.locator('[data-action-plan-bulk="expand"]').click();
    await expect(page.locator(".salesman-plan-table-region[hidden]")).toHaveCount(0);
    await expect(page.locator(".salesman-plan-row")).toHaveCount(18);
    await capture(page, info, "40-dashboard-plans-expanded");
    await page.locator('[data-action-plan-bulk="collapse"]').click();
    await expect(page.locator(".salesman-plan-table-region[hidden]")).toHaveCount(2);
    const intelToggle = page.locator("#marketIntelPanel .panel-collapse-toggle");
    await intelToggle.click();
    await expect(page.locator("#marketIntelPanel")).toHaveClass(/is-collapsed/);
    await intelToggle.click();
    await expect(page.locator("#marketIntelPanel")).not.toHaveClass(/is-collapsed/);
    const record = page.locator("#dashboardFocus .dashboard-activity-item").first();
    await expect(record).toHaveCSS("text-align", "left");
    expect(await record.locator("strong").evaluate(e => parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(14);
    const clipped = await page.locator("#adminDashboardBottomRow .dashboard-collapsible-body-inner").evaluateAll(elements => elements.map(e => e.scrollHeight - e.clientHeight));
    expect(Math.max(...clipped)).toBeLessThanOrEqual(1);
    await expect(page.locator(".market-snapshot-bar-track > i").first()).toHaveCSS("background-color", "rgb(91, 192, 190)");
  } else await expect(page.locator("#adminDashboardWorkRow")).toBeHidden();

  const selector = role === "admin" ? "#metricsPanel [data-summary-card]" : "#salesmanSimplifiedMetrics [data-summary-card], #salesmanSimplifiedPipeline [data-summary-card]";
  const cards = await page.locator(selector).evaluateAll(elements => elements.map(e => ({
    type: e.dataset.summaryCard, count: Number(e.querySelector("strong").textContent)
  })));
  expect(cards).toHaveLength(role === "admin" ? 4 : 8);
  for (const { type, count } of cards) {
    const card = page.locator(`[data-summary-card="${type}"]`);
    await card.click();
    const dialog = page.locator("#summaryCardDetailsDialog");
    await expect(dialog).toBeVisible();
    await expect(page.locator("#summaryCardDetailsTitle")).toContainText(`(${count})`);
    await expect(page.locator("#summaryCardDetailsCount")).toContainText(String(count));
    if (count) {
      await page.locator("[data-summary-details-search]").fill("no-synthetic-record-matches");
      await expect(page.locator("#summaryCardDetailsTableWrap")).toContainText("No matching records");
      await page.locator("[data-summary-details-reset]").click();
      await expect(page.locator(".summary-card-details-row")).toHaveCount(Math.min(count, 10));
    }
    await capture(page, info, `40-summary-${type}`);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(card).toBeFocused();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await capture(page, info, "40-dashboard");
  if (role === "admin") {
    await page.goto("/?view=pipeline");
    await expect(page.locator("#leadList table")).toBeVisible();
    await page.goto("/?view=dashboard");
    await expect(page.locator("#adminDashboardWorkRow > #actionPlanPanel")).toBeVisible();
    await expect(page.locator("#adminDashboardTriageRow > #marketIntelPanel")).toBeVisible();
  }
});
