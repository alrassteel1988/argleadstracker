const { test, expect } = require("@playwright/test");
const { capture, login, blockExternalTraffic } = require("./helpers");

test.beforeEach(async ({ page }) => blockExternalTraffic(page));

test("team directory views, filters, chart totals and existing actions", async ({ page }, info) => {
  const role = await login(page, info);
  await page.goto("/?view=salesmen");
  if (role !== "admin") {
    await expect(page.locator("#salesmenView")).toBeHidden();
    await expect(page.locator("#dashboardView")).toBeVisible();
    return;
  }
  const rows = page.locator(".salesmen-directory-table tbody tr");
  await expect(rows).toHaveCount(2);
  await expect(page.locator("#salesmenMetricTotal")).toHaveText("2");
  await expect(page.locator("#salesmenMetricOpenLeads")).toHaveText("9");
  if (info.project.name.endsWith("mobile")) {
    expect(await page.locator("#overdueBanner .overdue-owner-chip").evaluateAll(elements => elements.every(e => e.getBoundingClientRect().height < 80))).toBe(true);
  }
  await expect(page.locator(".salesmen-metric-card").first()).toHaveCSS("background-color", "rgb(254, 252, 253)");
  expect(await page.locator("#performancePanel").evaluate(e => getComputedStyle(e, "::before").content)).toBe("none");
  const chart = await page.locator("#performanceChart").evaluate(canvas => {
    const instance = Chart.getChart(canvas);
    const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    return { data: instance.data.datasets[0].data, color: instance.data.datasets[0].backgroundColor, drawn: pixels.some((value, index) => index % 4 === 3 && value > 0) };
  });
  expect(chart.data).toEqual([12, 6]);
  expect(chart.color).toBe("#083D77");
  expect(chart.drawn).toBe(true);
  const snapshotTotals = await page.locator(".salesmen-summary-legend-row strong").allTextContents();
  expect(snapshotTotals[0]).toBe("3");
  expect(snapshotTotals[1]).toBe("9");
  await capture(page, info, "20-team-list");

  await expect(page.locator("#applySalesmenFilters")).toHaveCount(0);
  const clear = async () => { await page.locator("#clearSalesmenFilters").click(); await expect(rows).toHaveCount(2); };
  await page.locator("#salesmenSearch").fill("Other Demo");
  await expect(rows).toHaveCount(1);
  await expect(rows).toContainText("Other Demo Salesman");
  await expect(page.locator("#salesmenMetricTotal")).toHaveText("2");
  await clear();
  await page.locator("#salesmenTerritoryFilter").selectOption("UAE-South");
  await expect(rows).toHaveCount(1);
  await clear();
  await page.locator("#salesmenStatusFilter").selectOption("top-performer");
  await expect(rows).toHaveCount(1);
  await clear();
  await page.locator("#performanceStageFilter").selectOption("WON");
  await expect(rows).toHaveCount(2);
  await clear();
  await page.locator("#salesmenSort").selectOption("name-asc");
  await expect(rows.first()).toContainText("Demo Salesman");
  await page.locator("[data-salesmen-page-size]").selectOption("5");
  await expect(page.locator('[data-salesmen-page="next"]')).toBeDisabled();
  await page.locator("#salesmenSearch").fill("Unmatched synthetic team search");
  await expect(page.locator(".salesmen-empty-state")).toContainText("No salesmen match");
  await capture(page, info, "20-team-empty");
  await page.locator("[data-salesmen-clear-empty]").click();

  await page.locator('[data-salesmen-view="cards"]').click();
  const cards = page.locator(".salesmen-directory-card");
  await expect(cards).toHaveCount(2);
  await expect(cards.first()).toHaveCSS("border-top-color", "rgb(255, 177, 0)");
  expect(await cards.locator("h3").evaluateAll(elements => elements.every(e => e.scrollWidth <= e.clientWidth + 1))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await capture(page, info, "20-team-cards");
  await cards.first().locator('[data-salesmen-action="profile"]').first().click();
  await expect(page.locator("#salesmanLeadsDialog")).toBeVisible();
  await expect(page.locator("#salesmanLeadsList tbody tr")).toHaveCount(12);
  await capture(page, info, "20-team-leads");
  await page.locator("#closeSalesmanLeads").click();
  await cards.first().locator('[data-salesmen-action="assign"]').click();
  await expect(page.locator("#leadDialog")).toBeVisible();
  await expect(page.locator('#leadForm [name="assigned_salesman"]')).toHaveValue("Demo Salesman");
  await page.locator("#closeLeadForm").click();
  const download = page.waitForEvent("download");
  await page.locator("#exportSalesmenDirectory").click();
  expect((await download).suggestedFilename()).toMatch(/^salesmen-directory-.*\.csv$/);
  await cards.first().locator("details > summary").click();
  await cards.first().getByRole("button", { name: "Jump to Leads", exact: true }).click();
  await expect(page.locator("#salesmanLeadsDialog")).toBeVisible();
  await expect(page.locator("#salesmanLeadsList tbody tr")).toHaveCount(12);
  await page.locator("#closeSalesmanLeads").click();
  await cards.first().getByRole("button", { name: "Filter Pipeline", exact: true }).click();
  await expect(page.locator("#pipelineView")).toBeVisible();
  await expect(page.locator('[data-pipeline-filter="salesman"]')).toHaveValue("Demo Salesman");
});
