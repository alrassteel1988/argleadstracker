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
  await expect(summary).toHaveCSS("background-color", "rgb(248, 237, 206)");
  const before = Number((await page.locator("[data-weekly-progress-copy]").innerText()).split("/")[0]);
  await summary.fill(summaryText);
  await expect(summary).toHaveClass(/field--filled/);
  await expect(summary).toHaveCSS("background-color", "rgb(230, 240, 216)");
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
