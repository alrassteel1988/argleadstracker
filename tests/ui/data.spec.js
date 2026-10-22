const { test, expect } = require("@playwright/test");
const { capture, login, blockExternalTraffic } = require("./helpers");

test.beforeEach(async ({ page }) => blockExternalTraffic(page));

test("shared Pipeline filters, sorting, pagination, reports and recovery", async ({ page }, info) => {
  const role = await login(page, info);
  let releaseLoading;
  const loadingGate = new Promise(resolve => { releaseLoading = resolve; });
  await page.route("**/api/leads", async route => {
    await loadingGate;
    await route.continue();
  });
  try {
    await page.goto("/?view=pipeline");
    await expect(page.locator("#appShell")).toBeVisible();
    if (info.project.name.endsWith("mobile")) await page.locator("#mobileMenuToggle").click();
    await page.locator('#mobileSidebar [data-view="pipeline"]').click();
    await expect(page.locator(".pipeline-loading-state")).toBeVisible();
    await capture(page, info, "13-pipeline-loading");
  } finally {
    releaseLoading();
    await page.unroute("**/api/leads");
  }
  const rows = page.locator("#leadList tbody tr[data-lead-id]");
  await expect(rows).toHaveCount(10);
  const filter = key => page.locator(`[data-pipeline-filter="${key}"]`);
  const clear = async () => {
    await page.locator("#clearPipelineFilters").click();
    await expect(rows).toHaveCount(10);
  };
  const colors = await page.locator("#metricsPanel article").first().evaluate(element => ({
    background: getComputedStyle(element).backgroundColor,
    color: getComputedStyle(element.querySelector("strong")).color,
    top: getComputedStyle(element).borderTopColor
  }));
  expect(colors).toEqual({ background: "rgb(254, 252, 253)", color: "rgb(8, 61, 119)", top: "rgb(255, 177, 0)" });
  const captionsFit = await page.locator("#metricsPanel article small").evaluateAll(elements => elements.every(element => {
    const caption = element.getBoundingClientRect();
    const card = element.closest("article").getBoundingClientRect();
    const metrics = element.closest("#metricsPanel").getBoundingClientRect();
    return caption.height > 0 && caption.bottom <= Math.min(card.bottom, metrics.bottom) + 1;
  }));
  expect(captionsFit).toBe(true);
  const tableType = await page.locator("#leadList .lead-table-company strong").first().evaluate(element => ({
    size: parseFloat(getComputedStyle(element).fontSize), color: getComputedStyle(element).color
  }));
  expect(tableType).toEqual({ size: 14, color: "rgb(8, 61, 119)" });
  await capture(page, info, "13-pipeline-data");

  await filter("search").fill("Demo Contact 2");
  await expect(rows).toHaveCount(1);
  await expect(rows).toContainText("Synthetic Steel Company 02");
  await clear();
  for (const [key, value] of [["nextAction", "To Call"], ["priority", "New"], ["stage", "NEW"], ["territory", "UAE-North"]]) {
    await filter(key).selectOption(value);
    await expect(filter(key)).toHaveValue(value);
    await expect(rows.first()).toBeVisible();
    await clear();
  }
  const overdue = parseInt(await rows.first().locator(".lead-table-badge").first().innerText(), 10);
  const range = overdue > 30 ? "31-plus" : overdue >= 15 ? "15-30" : overdue >= 8 ? "8-14" : overdue > 0 ? "1-7" : "not-overdue";
  await filter("overdue").selectOption(range);
  await expect(rows).toHaveCount(10);
  await clear();
  await filter("dueDate").fill("2026-10-20");
  await expect(rows).toHaveCount(10);
  await clear();

  if (role === "admin") {
    await filter("salesman").selectOption("Other Demo Salesman");
    await expect(rows).toHaveCount(6);
    await clear();
    await page.locator("#pipelineReportDateFrom").fill("2026-10-20");
    await page.locator("#pipelineReportDateTo").fill("2026-10-20");
    await expect(rows).toHaveCount(10);
    for (const [button, suffix] of [["#exportPipelineExcel", ".xls"], ["#exportPipelinePdf", ".pdf"]]) {
      const download = page.waitForEvent("download");
      await page.locator(button).click();
      expect((await download).suggestedFilename()).toMatch(new RegExp(`${suffix.replace(".", "\\.")}$`));
    }
    await clear();
  } else {
    await expect(filter("salesman")).toHaveCount(0);
    await expect(page.locator("#pipelineReportTools")).toBeHidden();
  }

  await filter("nextAction").selectOption("To Call");
  await filter("territory").selectOption("UAE-North");
  await page.locator('[data-pipeline-sort="company"]').click();
  await expect(page.locator('th[aria-sort="ascending"]')).toContainText("Company");
  await page.locator('#pipelinePagination [aria-label="Next page"]').click();
  await expect(page.locator("#pipelinePagination")).toContainText("Page 2 of 2");
  await expect(filter("nextAction")).toHaveValue("To Call");
  await expect(filter("territory")).toHaveValue("UAE-North");
  await expect(rows).toHaveCount(2);
  const nextPage = await page.locator('#pipelinePagination [aria-label="Next page"]').boundingBox();
  const launcher = await page.locator("#aiAssistantLauncher").boundingBox();
  const intersects = nextPage.x < launcher.x + launcher.width && nextPage.x + nextPage.width > launcher.x
    && nextPage.y < launcher.y + launcher.height && nextPage.y + nextPage.height > launcher.y;
  expect(intersects).toBe(false);
  await clear();
  await filter("search").fill("No matching synthetic company");
  await expect(page.locator(".pipeline-empty-state")).toBeVisible();
  await capture(page, info, "14-pipeline-empty");
  await page.locator("[data-pipeline-clear]").click();
  await expect(rows).toHaveCount(10);

  await page.route("**/api/leads", route => route.fulfill({
    status: 503, contentType: "application/json", body: JSON.stringify({ error: "Synthetic test service unavailable" })
  }));
  await page.locator("#refreshPipelineLeads").click();
  await expect(page.locator(".pipeline-error-state")).toBeVisible();
  await capture(page, info, "15-pipeline-error");
  await page.unroute("**/api/leads");
  await page.locator("[data-pipeline-retry]").click();
  await expect(rows).toHaveCount(10);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await rows.first().locator("[data-pipeline-open]").click();
  await expect(page.locator("#leadDetailView")).toBeVisible();
});
