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

test("reference dashboard keeps all seven sales reps visible without scrolling the card", async ({ page }, info) => {
  test.skip(!info.project.name.startsWith("admin"), "Admin layout only");
  const desktop = info.project.name === "admin-desktop";
  if (desktop) await page.setViewportSize({ width: 1366, height: 768 });
  await page.route("**/api/users", async route => {
    const response = await route.fetch();
    const accounts = await response.json();
    await route.fulfill({ response, json: [...accounts, ...Array.from({ length: 5 }, (_, index) => ({
      id: `ui-extra-${index}`, full_name: `Synthetic Rep ${index + 1}`, role: "salesman", status: "active", territory: "Dubai"
    }))] });
  });
  await login(page, info);
  const overview = page.locator("#cleanAdminDashboard");
  const roster = overview.locator(".clean-admin-team-content");
  await expect(roster.locator("tbody tr")).toHaveCount(7);
  const layout = await roster.evaluate(element => ({
    hiddenHeight: element.scrollHeight - element.clientHeight,
    horizontalOverflow: document.documentElement.scrollWidth - innerWidth
  }));
  expect(layout.hiddenHeight).toBeLessThanOrEqual(1);
  expect(layout.horizontalOverflow).toBeLessThanOrEqual(1);
  await expect(roster).not.toHaveAttribute("tabindex");
  if (desktop) {
    await expect(roster.locator("tbody tr").last()).toBeInViewport({ ratio: 1 });
    await expect(overview.locator(".clean-admin-pipeline")).toBeInViewport({ ratio: 1 });
    await expect(overview.locator(".clean-admin-management")).toBeInViewport({ ratio: 1 });
  }
  await capture(page, info, "admin-dashboard-full-roster", { fullPage: !desktop });
});

test("reference dashboard keeps real counts, drilldowns and responsive shell", async ({ page }, info) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const role = await login(page, info);
  if (role !== "admin") {
    await expect(page.locator("body")).not.toHaveClass(/admin-reference-mode/);
    await expect(page.locator("#cleanAdminDashboard")).toHaveCount(0);
    await expect(page.locator("#salesmanSimplifiedDashboard")).toBeVisible();
    return;
  }
  const overview = page.locator("#cleanAdminDashboard");
  await expect(overview.locator(".clean-admin-metrics > *")).toHaveCount(4);
  await expect(overview.locator('[data-clean-action="pipeline"]').first().locator("strong")).toHaveText("9");
  await expect(overview.locator(".clean-admin-person")).toHaveCount(2);
  await expect(overview.locator(".clean-admin-avatar").first()).toHaveCSS("position", "static");
  expect(await overview.locator('[data-clean-action="overdue"]').first().evaluate(button => getComputedStyle(button, "::before").content)).toBe("none");
  await expect(page.locator("#cleanAdminDetails")).not.toHaveAttribute("open");
  if (!info.project.name.endsWith("mobile")) {
    await page.setViewportSize({ width: 1366, height: 768 });
    await expect(overview.locator(".clean-admin-pipeline")).toBeInViewport({ ratio: 1 });
    await expect(overview.locator(".clean-admin-management")).toBeInViewport({ ratio: 1 });
  }
  await capture(page, info, "admin-dashboard-clean");
  await overview.getByRole("button", { name: "Activity lifecycle" }).click();
  await expect(overview).toContainText("Completed in period");
  await overview.getByRole("button", { name: "This month" }).click();
  await expect(overview.getByRole("button", { name: "This month" })).toHaveAttribute("aria-pressed", "true");
  await overview.getByRole("button", { name: "Activity log", exact: true }).click();
  await expect(overview.getByRole("button", { name: /Open activity log/ })).toBeVisible();
  await overview.getByRole("button", { name: "Sales team" }).click();
  await page.locator("#cleanAdminDetails > summary").click();
  await expect(page.locator(".admin-ref-attention-card")).toHaveCount(4);
  await expect(page.locator("#metricValue")).toHaveText("9");
  await expect(page.locator("#adminReferenceInsights > details")).not.toHaveAttribute("open");
  const order = await page.evaluate(() => ["adminDashboardTriageRow", "metricsShell", "actionPlanPanel", "adminDashboardAnalyticsRow"].map(id => document.getElementById(id).getBoundingClientRect().top));
  expect(order).toEqual([...order].sort((a, b) => a - b));
  await page.locator(".action-plan-toggle").first().click();
  await expect(page.locator(".salesman-plan-table-region").first()).toBeVisible();
  const firstPlan = page.locator(".salesman-plan-card").first();
  await expect(firstPlan.locator(".admin-v3-avatar")).toHaveText("DS");
  await expect(firstPlan.locator(".admin-ref-plan-metrics > div")).toHaveCount(4);
  await expect(firstPlan.locator("tbody tr:visible")).toHaveCount(3);
  await expect(firstPlan.locator(".admin-ref-more-leads")).toHaveText("All 12 leads in Pipeline ›");
  await expect(page.locator(".admin-v3-metric-meter")).toHaveCount(4);
  expect(await page.locator(".metric-open").evaluate(element => getComputedStyle(element).backgroundColor)).toBe("rgb(16, 59, 112)");
  await capture(page, info, "admin-dashboard-v3-expanded");
  await page.locator("[data-summary-card='openPipeline']").click();
  await expect(page.locator("#summaryCardDetailsDialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.locator("[data-admin-interaction='cold']").click();
  await expect(page.locator("#relationshipFocusPanel")).toBeVisible();
  await expect(page.locator("[data-admin-interaction='cold']")).toContainText(/Cold relationships · \d+/);
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

test("dashboard interaction cards give record text the wide column", async ({ page }, info) => {
  test.skip(!info.project.name.startsWith("admin"), "Admin dashboard cards only");
  await page.route(/\/api\/activities\?/, route => route.fulfill({
    json: Array.from({ length: 5 }, (_, index) => ({
      id: `ui-dashboard-interaction-${index + 1}`,
      lead_id: `ui-lead-${index + 1}`,
      company_name: `Synthetic Steel Company 0${index + 1}`,
      type: "Reminder",
      text: "General follow-up: confirm delivery timing and send the updated quotation."
    }))
  }));
  await login(page, info);
  await page.locator("#cleanAdminDetails > summary").click();
  if (info.project.name.endsWith("mobile")) {
    await page.setViewportSize({ width: 320, height: 812 });
  }

  for (const [tab, feed] of [["latest", "#dashboardActivityFeed"], ["cold", "#dashboardFocus"]]) {
    await page.locator(`[data-admin-interaction="${tab}"]`).click();
    const card = page.locator(`${feed} > .dashboard-activity-item`).first();
    await expect(card).toBeVisible();
    const layout = await card.evaluate(element => {
      const card = element.getBoundingClientRect();
      const pin = element.querySelector(".activity-pin").getBoundingClientRect();
      const copy = element.querySelector("div").getBoundingClientRect();
      return {
        pinWidth: pin.width,
        textBesideIcon: copy.left >= pin.right && Math.abs(copy.top - pin.top) <= 1,
        copyRatio: copy.width / card.width,
        copyInsideCard: copy.right <= card.right,
        pageOverflow: document.documentElement.scrollWidth - innerWidth
      };
    });
    expect(layout.pinWidth).toBeGreaterThan(0);
    expect(layout.textBesideIcon).toBe(true);
    expect(layout.copyRatio).toBeGreaterThan(0.65);
    expect(layout.copyInsideCard).toBe(true);
    expect(layout.pageOverflow).toBeLessThanOrEqual(1);
  }

  await page.locator("[data-admin-interaction='latest']").click();
  if (info.project.name.endsWith("desktop")) {
    const pipeline = await page.locator("#pipelineHealthPanel").boundingBox();
    const activity = await page.locator("#dashboardActivityPanel").boundingBox();
    expect(Math.abs(pipeline.y - activity.y)).toBeLessThanOrEqual(1);
    expect(pipeline.height).toBeLessThan(activity.height);
  }
  await capture(page, info, "admin-dashboard-interaction-cards");
  await page.locator("#dashboardActivityFeed > .dashboard-activity-item").first().click();
  await expect(page.locator("#leadDetailView")).toBeVisible();
});

test("v3 lead previews preserve keyboard access, scoped Pipeline links and narrow layouts", async ({ page }, info) => {
  const role = await login(page, info);
  if (role !== "admin") return;
  await page.locator("#cleanAdminDetails > summary").click();
  await page.locator("[data-action-plan-bulk='expand']").click();
  await expect(page.locator(".salesman-plan-table-region:visible")).toHaveCount(2);
  const row = page.locator(".salesman-plan-row:visible").first();
  await row.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#leadDetailView")).toBeVisible();
  await page.goto("/?view=dashboard");
  await page.locator("#cleanAdminDetails > summary").click();
  await page.locator(".action-plan-toggle").first().click();
  await page.locator(".admin-ref-more-leads").first().click();
  await expect(page.locator("#pipelineView")).toBeVisible();
  await expect(page.locator('[data-pipeline-filter="salesman"]')).toHaveValue("Demo Salesman");
  await expect(page.locator(".admin-v3-header-avatar")).toBeHidden();
  await expect(page.locator(".admin-v3-metric-unit").first()).toBeHidden();
  await page.goto("/?view=dashboard");
  await page.locator("#cleanAdminDetails > summary").click();
  await page.locator("#adminReferenceInsights summary").click();
  await expect(page.locator("#adminReferenceInsights > details")).toHaveAttribute("open");
  await page.locator("#adminReferenceInsights summary").click();
  if (info.project.name.endsWith("mobile")) {
    await page.setViewportSize({width:320, height:812});
    await page.locator(".action-plan-toggle").first().click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await expect(page.locator("#mobileMenuToggle")).toBeVisible();
    await page.locator("#mobileMenuToggle").click();
    await expect(page.locator("#mobileSidebar")).toBeVisible();
    await capture(page, info, "admin-dashboard-v3-narrow-menu");
  }
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
