const { test, expect } = require("@playwright/test");
const { capture, login, blockExternalTraffic } = require("./helpers");

test.beforeEach(async ({ page }) => blockExternalTraffic(page));

const summaryText = "Synthetic buyer review on 23 October: confirmed quantities, procurement contacts and delivery plans.";
const noteText = "Synthetic review on 23 October: procurement approval and delivery timing were checked with the demo buyer.";

async function submitReport(page, info, screenshots = true) {
  await page.goto("/?view=tasks");
  const summary = page.locator('[data-weekly-field="summary"]');
  await expect(summary).toBeVisible();
  await expect(summary).toHaveClass(/field--required-empty/);
  await expect(summary).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(summary).toHaveCSS("border-top-color", "rgb(138, 82, 0)");
  const before = Number((await page.locator("[data-weekly-progress-copy]").innerText()).split("/")[0]);
  await summary.fill(summaryText);
  await expect(summary).toHaveClass(/field--filled/);
  await expect(summary).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(summary).toHaveCSS("border-top-color", "rgb(63, 116, 38)");
  await summary.focus();
  await expect(summary).toHaveCSS("outline-width", "2px");
  expect(Number((await page.locator("[data-weekly-progress-copy]").innerText()).split("/")[0])).toBe(before + 1);
  await expect(page.locator("#tasksWeekLabel")).toHaveCSS("color", "rgb(8, 61, 119)");
  expect(await page.locator("#mobileSidebar").evaluate(e => getComputedStyle(e).backgroundImage)).toContain("linear-gradient");
  await expect(page.locator(".tasks-section-head").first()).toHaveCSS("background-color", "rgb(254, 252, 253)");
  await expect(page.locator("[data-weekly-voice-button]").first()).toHaveAttribute("data-voice-target", /weeklyExpectedBlockers/);
  if (screenshots) await capture(page, info, "30-report-fields");

  const expectedFields = await page.locator('select[data-weekly-field^="expected_orders."]').evaluateAll(elements => elements.map(e => e.dataset.weeklyField));
  for (const path of expectedFields) await page.locator(`[data-weekly-field="${path}"]`).selectOption({ index: 1 });
  const problemFields = await page.locator('select[data-weekly-field$=".disposition"]').evaluateAll(elements => elements.map(e => e.dataset.weeklyField));
  for (const path of problemFields) await page.locator(`[data-weekly-field="${path}"]`).selectOption("dismiss");
  for (const path of await page.locator('select[data-weekly-field$=".has_issue"]').evaluateAll(elements => elements.map(e => e.dataset.weeklyField))) {
    await page.locator(`[data-weekly-field="${path}"]`).selectOption("no");
  }
  for (const [key, value] of Object.entries({ demand_band: "Same", pricing_band: "Occasional", competitor_loss: "no", cashflow_band: "Occasional", extended_terms_band: "Occasional", defaults_heard: "no", government_projects_band: "No change" })) {
    await page.locator(`[data-weekly-field="market_intelligence.${key}"]`).selectOption(value);
  }
  const notes = await page.locator('textarea[data-weekly-field]:not([data-weekly-field="summary"])').evaluateAll(elements => elements.map(e => e.dataset.weeklyField));
  for (const path of notes) await page.locator(`[data-weekly-field="${path}"]`).fill(noteText);
  for (const name of ["no_secured_orders_confirmed", "no_expected_orders_confirmed", "no_problematic_accounts_confirmed", "attested"]) {
    const checkbox = page.locator(`[data-weekly-field="${name}"]`);
    if (await checkbox.count()) await checkbox.check();
  }
  await expect(page.locator('[data-weekly-field="next_week_plan"]')).not.toHaveClass(/field--filled|field--required-empty/);
  await expect(page.locator("[data-weekly-progress-copy]")).toHaveText("11/11 checkpoints complete");
  await expect(page.locator(".tasks-expected-order-card.needs-input")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  const saved = page.waitForResponse(response => /\/api\/weekly-reports\/(?:current|[^/]+\/draft)$/.test(response.url()) && ["POST", "PATCH"].includes(response.request().method()));
  await page.locator("#weeklySaveDraft").click();
  expect((await saved).ok()).toBe(true);
  await expect(page.locator("#tasksMessage")).toContainText("draft saved");
  if (screenshots) await capture(page, info, "30-report-draft");
  const submitted = page.waitForResponse(response => /\/api\/weekly-reports\/.*\/submit$/.test(response.url()) && response.request().method() === "POST");
  await page.locator("#weeklySubmitReport").click();
  const response = await submitted;
  expect(await response.text()).not.toContain('"error"');
  expect(response.ok()).toBe(true);
  await expect(page.locator("#tasksStatusBadge")).toHaveText("Submitted");
  await expect(summary).toBeDisabled();
  await expect(page.locator("#weeklySubmitReport")).toBeDisabled();
  if (screenshots) await capture(page, info, "30-report-submitted");
}

test("weekly report layout contains content and keeps the assistant clear of the form", async ({page}, info) => {
  await page.route(/\/api\/(?:leads|weekly-reports\/current)(?:\?.*)?$/, async route => {
    if (route.request().method() !== "GET") return route.continue();
    const response = await route.fetch();
    if (!response.ok()) return route.fulfill({response});
    const data = await response.json();
    const expandCompanyNames = value => {
      if (!value || typeof value !== "object") return;
      for (const [key, item] of Object.entries(value)) {
        if (key === "company_name" && typeof item === "string") value[key] = `${item} Regional Structural Steel Procurement and Fabrication Division ${"S".repeat(80)}`;
        else expandCompanyNames(item);
      }
    };
    expandCompanyNames(data);
    await route.fulfill({response, json:data});
  });
  const role = await login(page, info);
  if (role === "salesman") await expect(page.locator("#overdueBanner")).toContainText("Regional Structural Steel");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  if (await page.locator("#mobileMenuToggle").isVisible()) await page.locator("#mobileMenuToggle").click();
  await page.locator('#mobileSidebar [data-view="tasks"]').click();
  await expect(page.locator("#tasksPrimary")).not.toBeEmpty();
  if (role === "salesman") await expect(page.locator('[data-weekly-field="summary"]')).toBeVisible();
  else await expect(page.locator(".tasks-review-empty")).toBeVisible();
  await expect(page.locator("#overdueBanner")).toBeHidden();
  for (const [width, height] of [[1440,900], [1280,800], [1010,884], [768,1024], [375,812]]) {
    await page.setViewportSize({width, height});
    const overflow = await page.locator("#appShell, #appShell > .main, .topbar, #overdueBanner, #tasksView, #tasksView .tasks-header, #tasksView .tasks-header-meta, #tasksView .tasks-layout, #tasksView .tasks-primary, #tasksView .tasks-sidebar, #tasksView .tasks-inline-grid, #tasksView .tasks-context-grid, #tasksView .tasks-row-head, #tasksView .tasks-actions-card, #tasksView .tasks-section-body, #tasksView .tasks-row-card").evaluateAll(elements => elements.filter(element => {
      const box = element.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && element.scrollWidth > element.clientWidth + 1;
    }).map(element => ({element:element.id || element.className, width:element.clientWidth, contentWidth:element.scrollWidth})));
    expect(overflow, `Nested report overflow at ${width}px`).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `Page overflow at ${width}px`).toBeLessThanOrEqual(1);
  }
  await page.setViewportSize(info.project.use.viewport);
  const launcher = page.locator("#aiAssistantLauncher");
  const assistantBox = await launcher.boundingBox();
  const reportBox = await page.locator("#tasksView").boundingBox();
  expect(assistantBox.y + assistantBox.height).toBeLessThanOrEqual(reportBox.y);
  await launcher.click();
  await expect(page.locator("#aiAssistantDialog")).toBeVisible();
  await page.locator("#aiAssistantDialog").press("Escape");
  await expect(launcher).toBeFocused();
  await capture(page, info, "31-report-contained", {fullPage:false});
  if (await page.locator("#mobileMenuToggle").isVisible()) await page.locator("#mobileMenuToggle").click();
  await page.locator('#mobileSidebar [data-view="pipeline"]').click();
  await expect(page.locator("#leadList table")).toBeVisible();
  await expect(launcher).toHaveCSS("position", "fixed");
  expect(await launcher.evaluate(element => element.parentElement === document.body)).toBe(true);
});

test("weekly report field feedback, draft, submit, immutable review and revision", async ({ page, browser }, info) => {
  test.setTimeout(120000);
  const role = await login(page, info);
  if (role === "salesman") {
    await submitReport(page, info);
    return;
  }
  await page.goto("/?view=tasks");
  await expect(page.locator(".tasks-review-empty")).toContainText("No submitted weekly reports yet");
  await capture(page, info, "30-review-empty");
  const context = await browser.newContext({ baseURL: info.project.use.baseURL, viewport: info.project.use.viewport, isMobile: info.project.name.endsWith("mobile"), hasTouch: info.project.name.endsWith("mobile"), timezoneId: "Asia/Dubai", serviceWorkers: "block" });
  try {
    const sender = await context.newPage();
    await blockExternalTraffic(sender);
    await login(sender, { ...info, project: { ...info.project, name: info.project.name.replace("admin", "salesman") } });
    await submitReport(sender, info, false);
    await page.reload();
    await expect(page.locator("[data-weekly-open-id]")).toHaveCount(1);
    await expect(page.locator("#tasksStatusBadge")).toHaveText("Submitted");
    await capture(page, info, "30-review-submitted");
    await page.locator('[data-weekly-review-action="revision_required"]').click();
    await expect(page.locator("#tasksMessage")).toContainText("Add a revision note");
    await expect(page.locator("#weeklyReviewNote")).toBeFocused();
    await page.locator("#weeklyReviewNote").fill("Synthetic revision: confirm the delivery date and buyer approval.");
    await page.locator('[data-weekly-review-action="revision_required"]').click();
    await expect(page.locator("#tasksStatusBadge")).toHaveText("Revision Requested");
    await capture(page, info, "30-review-revision");
    await sender.reload();
    await expect(sender.locator('[data-weekly-field="summary"]')).toBeEnabled();
    await sender.locator('[data-weekly-field="summary"]').fill(`${summaryText} Revised: demo buyer confirmed next-week delivery.`);
    await sender.locator("#weeklySubmitReport").click();
    await expect(sender.locator("#tasksStatusBadge")).toHaveText("Submitted");
    await page.reload();
    await expect(page.locator("#tasksStatusBadge")).toHaveText("Submitted");
    await expect(page.locator('[data-weekly-version-number="2"]')).toBeVisible();
    await page.locator("#weeklyReviewNote").fill("Synthetic management review: revised delivery note verified.");
    await page.locator('[data-weekly-review-action="accepted"]').click();
    await expect(page.locator("#tasksStatusBadge")).toHaveText("Accepted");
    await expect(page.locator('[data-weekly-version-number="1"]')).toBeVisible();
    await expect(page.locator('[data-weekly-version-number="2"]')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await capture(page, info, "30-review-accepted");
  } finally {
    await context.close();
  }
});
