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
    const mobile = info.project.name.endsWith("mobile");
    await expect(page.locator("#adminDashboardWorkRow")).toBeHidden();
    await expect(page.locator("#topbarPageTitle")).toHaveText("What should I do today?");
    await expect(page.locator("#topbarPageTitle em")).toHaveText("today?");
    await expect(page.locator("#salespersonDashboardDate")).not.toBeEmpty();
    await expect(page.locator('[data-summary-card="salesmanStageLost"] .salesman-stage-label')).toHaveText("Lost");
    if (mobile) {
      await expect(page.locator(".topbar")).toBeHidden();
      await expect(page.locator("#salespersonMobileGreeting")).toContainText("Demo");
      await expect(page.locator("#salespersonMobileDate")).not.toBeEmpty();
      await expect(page.locator("#overdueBanner")).toBeHidden();
      const nav = await page.locator("#mobileTabs .nav-item:visible").evaluateAll(elements => elements.map(e => e.getAttribute("aria-label") || e.textContent.trim()));
      expect(nav).toEqual(["Home", "Leads", "Log activity", "AI actions", "Map"]);
      await expect(page.locator('#mobileTabs [data-view="dashboard"]')).toHaveCSS("display", "grid");
      expect(await page.locator('#mobileTabs [data-view="dashboard"]').evaluate(e => getComputedStyle(e, "::before").position)).toBe("static");
      await expect(page.locator(".salesperson-contact-icon").first()).toBeVisible();
      const origins = await page.locator("#salespersonOrigin .salesperson-origin-row:not(.origin-unknown)").evaluateAll(elements => elements.map(e => e.getBoundingClientRect().top));
      expect(Math.max(...origins) - Math.min(...origins)).toBeLessThanOrEqual(1);
      await page.locator("[data-dashboard-stages]").click();
    } else await expect(page.locator("#overdueBanner")).toBeVisible();
    expect(await page.locator("#overdueBanner").evaluate(e => e.parentElement.id)).toBe("sharedDashboardTopSlot");
    for (const selector of [".salesman-dashboard-pipeline", ".salesman-dashboard-call-queue"]) {
      const accent = page.locator(`${selector} h2 .crm-title-accent`);
      await expect(accent).toHaveCSS("color", "rgb(184, 122, 0)");
      expect(await accent.evaluate(e => parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(17);
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
      expect(stage.countBottom).toBeGreaterThan(stage.labelTop);
      expect(stage.background).toBe("rgb(255, 255, 255)");
    }
    if (mobile) await page.locator("[data-dashboard-stages]").click();
    const moreTools = page.locator(".salesman-dashboard-more-tools");
    await expect(moreTools).not.toHaveAttribute("open", "");
    await expect(page.locator(".salesman-dashboard-more-content")).toBeHidden();
    for (const id of ["dailyAiPanel", "dashboardQuickActions", "salesmanLossPromptPanel"]) await expect(page.locator(`#${id}`)).toBeHidden();
    {
      const positions = await page.locator('#salesmanSimplifiedMetrics > button:not([data-summary-card="salesmanMyLeads"])').evaluateAll(elements => elements.map(e => e.getBoundingClientRect().top));
      expect(Math.max(...positions) - Math.min(...positions)).toBeLessThanOrEqual(1);
      const metricWidths = await page.locator('#salesmanSimplifiedMetrics > button:not([data-summary-card="salesmanMyLeads"])').evaluateAll(elements => elements.map(e => e.getBoundingClientRect().width));
      expect(metricWidths.reduce((sum, width) => sum + width, mobile ? 8 : 10)).toBeCloseTo((await page.locator("#salesmanSimplifiedMetrics").boundingBox()).width, 0);
    }
    await capture(page, info, "43-home-reference-layout", {fullPage:false});
    await capture(page, info, "44-salesperson-dashboard-complete");
    const summaryBox = await page.locator("#salesmanSimplifiedMetrics").boundingBox();
    const pipelineBox = await page.locator(".salesman-dashboard-pipeline").boundingBox();
    expect(pipelineBox.y).toBeGreaterThanOrEqual(summaryBox.y + summaryBox.height);
    const focusBox = await page.locator(".salesperson-focus-card").boundingBox();
    const followupBox = await page.locator(".salesperson-followup-card").boundingBox();
    await expect(page.locator("#salespersonFocusList > li")).toHaveCount(3);
    await expect(page.locator("#salespersonQuickGrid button")).toHaveCount(3);
    const assistantBottom = await page.locator(".salesperson-dashboard-assistant").evaluate(e => e.getBoundingClientRect().bottom + scrollY);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeGreaterThanOrEqual(assistantBottom);
    await expect(page.locator("#salespersonOrigin")).toContainText("Accounts by origin");
    await expect(page.locator("#salespersonFocusList")).not.toContainText("Synthetic Steel Company 13");
    const mainBackground = await page.locator("#appShell > .main").evaluate(e => getComputedStyle(e).backgroundImage);
    expect(mainBackground).toContain(info.project.name.endsWith("mobile") ? "crm-silk-white-mobile.png" : "crm-silk-white-desktop.png");
    const pipelineMeters = await page.locator("#salesmanSimplifiedPipeline meter").evaluateAll(elements => elements.map(e => ({ value:e.value, max:e.max })));
    expect(pipelineMeters.reduce((sum, item) => sum + item.value, 0)).toBe(12);
    expect(pipelineMeters.every(item => item.max === 12)).toBeTruthy();
    if (!info.project.name.endsWith("mobile")) {
      expect(followupBox.x).toBeGreaterThan(focusBox.x + focusBox.width);
      expect(Math.abs(followupBox.y - focusBox.y)).toBeLessThanOrEqual(1);
    } else {
      expect(focusBox.y).toBeGreaterThanOrEqual(followupBox.y + followupBox.height);
      const quickBox = await page.locator(".salesperson-quick-card").boundingBox();
      expect(quickBox.y).toBeGreaterThanOrEqual(focusBox.y + focusBox.height);
      expect(pipelineBox.y).toBeGreaterThanOrEqual(quickBox.y + quickBox.height);
      await page.locator("[data-dashboard-stages]").click();
    }
    let interpreted = 0;
    page.on("request", request => { if (request.url().includes("/interpret") || request.url().includes("/confirm")) interpreted++; });
    await page.locator("#salespersonDashboardQuestion").fill("Review my accounts");
    await page.locator(".salesperson-dashboard-assistant button").click();
    await expect(page.locator("#aiAssistantDialog")).toBeVisible();
    await expect(page.locator("#aiAssistantCommand")).toHaveValue("Review my accounts");
    expect(interpreted).toBe(0);
    await page.keyboard.press("Escape");
    await moreTools.locator("summary").click();
    expect((await page.locator(".salesperson-dashboard-assistant").boundingBox()).width).toBeCloseTo((await page.locator("#salesmanSimplifiedDashboard").boundingBox()).width, 0);
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

  const selector = role === "admin" ? "#metricsPanel [data-summary-card]" : "#salesmanSimplifiedMetrics [data-summary-card], #salesmanSimplifiedPipeline [data-summary-card], #salespersonPipelineBreakdown > [data-summary-card]";
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

test("Salesperson dashboard reference actions and responsive bounds", async ({ page }, info) => {
  test.skip(info.project.name.startsWith("admin"), "Salesperson-only reference layout");
  await login(page, info);
  const mobile = info.project.name.endsWith("mobile");
  let requests = [];
  page.on("request", request => {
    if (request.url().endsWith("/api/salesperson-ai-actions") && request.postDataJSON()?.action === "pipeline_health") return;
    if (request.method() !== "GET" && request.url().includes("/api/")) requests.push(request.url());
  });
  if (mobile) await page.locator(".salesman-dashboard-more-tools > summary").click();
  await page.locator("[data-dashboard-refresh]:visible").click();
  await expect(page.locator('[data-summary-card="salesmanMyLeads"] strong')).toHaveText("12");
  expect(requests).toEqual([]);
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    const clipped = await page.locator(".salesperson-dashboard-layout button, .salesperson-dashboard-assistant").evaluateAll(elements => elements.filter(e => {
      const box = e.getBoundingClientRect();
      return box.width && (box.left < 0 || box.right > innerWidth + 1);
    }).length);
    expect(clipped).toBe(0);
  }
  await page.setViewportSize(info.project.use.viewport);
  await expect(page.locator('#mobileSidebar [data-view="ai-actions"]')).toHaveClass(/hidden/);
  await expect(page.locator('#mobileSidebar [data-view="neglected"]')).toHaveCount(0);
  await page.locator('[data-dashboard-portfolio="neglected"]').click();
  await expect(page).toHaveURL(/\?view=dashboard\/neglected$/);
  await expect(page.locator('.crm-neglected-table tbody tr').first()).toBeVisible();
  await expect(page.locator('#aiActionDialog')).not.toBeVisible();
  await expect(page.locator('#mobileSidebar [data-view="dashboard"]')).toHaveClass(/active/);
  await page.reload();
  await expect(page.locator('.crm-neglected-panel')).toBeVisible();
  await expect(page).toHaveURL(/\?view=dashboard\/neglected$/);
  await page.goBack();
  await expect(page.locator('#dashboardView')).toBeVisible();
  await page.goForward();
  await expect(page.locator('.crm-neglected-panel')).toBeVisible();
  await page.locator('[aria-label="Back to Dashboard"]').click();
  await expect(page.locator('#dashboardView')).toBeVisible();
  await page.goto('/?view=neglected');
  await expect(page.locator('.crm-neglected-panel')).toBeVisible();
  await page.locator('[aria-label="Back to Dashboard"]').click();
  await expect(page.locator('#dashboardView')).toBeVisible();
  await page.locator("[data-dashboard-focus-open]").first().click();
  await expect(page.locator("#leadDetailView")).toBeVisible();
  await expect(page.locator("#leadDrawerTitle")).toHaveText("Synthetic Steel Company 01");
  await page.goto("/?view=dashboard");
  if (mobile) {
    await page.locator("[data-dashboard-search]").click();
    await expect(page.locator("#smartSearchInput")).toBeVisible();
    await page.locator("#mobileMenuToggle").click();
    await page.locator('#mobileSidebar [data-view="focus"]').click();
  } else await page.locator("[data-dashboard-today]").click();
  await expect(page.locator("#topbarPageTitle")).toHaveText("Today");
  await page.goto("/?view=dashboard");
  await page.locator(mobile ? '#mobileTabs [data-view="ai-actions"]' : "[data-dashboard-ai-all]").click();
  await expect(page.locator(".crm-onetap-company-grid")).toBeVisible();
  await page.goto("/?view=dashboard");
  await page.locator('[data-dashboard-portfolio="pipeline_health"]').click();
  await expect(page.locator("#aiActionDialog")).toBeVisible();
  await expect(page.locator("#aiActionResult")).not.toBeEmpty();
  await page.keyboard.press("Escape");
});
