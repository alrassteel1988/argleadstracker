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
      const clippedControls = await page.locator("#dashboardView .panel-header select, #dashboardView .panel-header-actions button").evaluateAll(elements => elements.filter(element => {
        const box = element.getBoundingClientRect();
        return box.width > 0 && box.height > 0 && (box.left < 0 || box.right > document.documentElement.clientWidth + 1);
      }).map(element => ({id:element.id, text:element.textContent, right:element.getBoundingClientRect().right})));
      expect(clippedControls).toEqual([]);
      expect(await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
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
  } else {
    await expect(page.locator("#adminDashboardWorkRow")).toBeHidden();
    await expect(page.locator("#topbarPageTitle")).toHaveText("What do I do next?");
    await expect(page.locator("#topbarPageTitle em")).toHaveText("next?");
    await expect(page.locator('[data-summary-card="salesmanStageLost"] .salesman-stage-label')).toHaveText("Lost");
    await expect(page.locator("#overdueBanner")).toBeVisible();
    expect(await page.locator("#overdueBanner").evaluate(e => e.parentElement.id)).toBe("sharedDashboardTopSlot");
    for (const selector of [".salesman-dashboard-pipeline", ".salesman-dashboard-call-queue"]) {
      const accent = page.locator(`${selector} h2 .crm-title-accent`);
      await expect(accent).toHaveCSS("color", "rgb(184, 122, 0)");
      await expect(accent).toHaveCSS("font-size", "20px");
      await expect(accent).toHaveCSS("font-style", "italic");
    }
    const stages = await page.locator("#salesmanSimplifiedPipeline [data-summary-card]").evaluateAll(elements => elements.map(element => ({
      labelTop: element.querySelector(".salesman-stage-label").getBoundingClientRect().top,
      countBottom: element.querySelector("strong").getBoundingClientRect().bottom,
      border: getComputedStyle(element).borderTopColor,
      background: getComputedStyle(element).backgroundColor
    })));
    expect(stages).toHaveLength(6);
    for (const stage of stages) {
      if (!info.project.name.endsWith("mobile")) expect(stage.labelTop).toBeGreaterThanOrEqual(stage.countBottom);
      expect(stage.border).toBe(stage.background);
    }
    const moreTools = page.locator(".salesman-dashboard-more-tools");
    await expect(moreTools).not.toHaveAttribute("open", "");
    await expect(page.locator(".salesman-dashboard-more-content")).toBeHidden();
    for (const id of ["dailyAiPanel", "dashboardQuickActions", "salesmanLossPromptPanel"]) await expect(page.locator(`#${id}`)).toBeHidden();
    if (info.project.name.endsWith("mobile")) {
      const positions = await page.locator("#salesmanSimplifiedMetrics > button").evaluateAll(elements => elements.map(e => e.getBoundingClientRect().top));
      expect(Math.max(...positions) - Math.min(...positions)).toBeLessThanOrEqual(1);
    }
    await capture(page, info, "43-home-reference-layout", {fullPage:false});
    const summaryBox = await page.locator("#salesmanSimplifiedMetrics").boundingBox();
    const pipelineBox = await page.locator(".salesman-dashboard-pipeline").boundingBox();
    const queueBox = await page.locator(".salesman-dashboard-call-queue").boundingBox();
    expect(queueBox.y).toBeGreaterThanOrEqual(pipelineBox.y + pipelineBox.height);
    expect(pipelineBox.y).toBeGreaterThanOrEqual(summaryBox.y + summaryBox.height);
    if (!info.project.name.endsWith("mobile")) {
      expect(queueBox.width).toBeCloseTo(summaryBox.width, 0);
      expect(summaryBox.height).toBeLessThanOrEqual(130);
      expect(pipelineBox.height).toBeLessThanOrEqual(150);
    }
    await moreTools.locator("summary").click();
    await expect(page.locator("#salesmanSimplifiedActions")).toBeVisible();
    const actionCards = page.locator("#salesmanSimplifiedActions .salesman-triage-card");
    await expect(actionCards).toHaveCount(3);
    const iconLayouts = await actionCards.evaluateAll(elements => elements.map(element => {
      const icon = getComputedStyle(element, "::before");
      const label = element.querySelector(".salesman-triage-kicker");
      const cardBox = element.getBoundingClientRect();
      const labelBox = label.getBoundingClientRect();
      return {
        position: icon.position,
        row: icon.gridRowStart,
        column: icon.gridColumnStart,
        labelRow: getComputedStyle(label).gridRowStart,
        labelColumn: getComputedStyle(label).gridColumnStart,
        labelInset: labelBox.left - cardBox.left,
        overflow: element.scrollWidth - element.clientWidth
      };
    }));
    for (const layout of iconLayouts) {
      expect(layout.position).toBe("static");
      expect(layout.row).toBe("1");
      expect(layout.column).toBe("1");
      expect(layout.labelRow).toBe("1");
      expect(layout.labelColumn).toBe("2");
      expect(layout.labelInset).toBeGreaterThanOrEqual(30);
      expect(layout.overflow).toBeLessThanOrEqual(1);
    }
  }

  const selector = role === "admin" ? "#metricsPanel [data-summary-card]" : "#salesmanSimplifiedMetrics [data-summary-card], #salesmanSimplifiedPipeline [data-summary-card]";
  const cards = await page.locator(selector).evaluateAll(elements => elements.map(e => ({
    type: e.dataset.summaryCard, count: Number(e.querySelector("strong").textContent)
  })));
  expect(cards).toHaveLength(role === "admin" ? 4 : 9);
  if (role === "salesman") expect(cards.map(card => card.type)).toContain("salesmanStageDormant");
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
  await capture(page, info, "42-home-summary", {fullPage:false});
  if (role === "admin") {
    await page.goto("/?view=pipeline");
    await expect(page.locator("#leadList table")).toBeVisible();
    await page.goto("/?view=dashboard");
    await expect(page.locator("#adminDashboardWorkRow > #actionPlanPanel")).toBeVisible();
    await expect(page.locator("#adminDashboardTriageRow > #marketIntelPanel")).toBeVisible();
  }
});
