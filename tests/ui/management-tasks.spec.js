const { test, expect } = require("@playwright/test");
const { capture, login, blockExternalTraffic } = require("./helpers");
const { FIXTURE_PASSWORD, FIXTURE_USERS } = require("./fixture-server");

test("assign, progress and complete a management task across roles", async ({ page, browser }, info) => {
  test.skip(!info.project.name.startsWith("admin"), "Runs both roles against one synthetic workspace");
  const title = "Confirm project list";
  const remarks = "Confirmed dates and tonnage with procurement.";
  await blockExternalTraffic(page);
  await login(page, info);
  await page.goto("/?view=tasks");
  await page.locator('[data-mg-tab="management"]').click();
  const workspace = page.locator("#managementTasksWorkspace");
  await workspace.getByRole("button", { name: "Assign task" }).click();
  const form = page.locator("#managementTaskFormDialog");
  await form.getByRole("combobox", { name: "Salesman", exact: true }).selectOption("ui-salesman", { timeout: 8000 });
  await form.getByRole("combobox", { name: "Lead / account (optional)", exact: true }).selectOption("ui-lead-1", { timeout: 8000 });
  await form.getByLabel("Task", { exact: true }).fill(title);
  await form.getByLabel("Instructions / remarks").fill("Ask for dates and tonnage. Record the confirmed schedule.");
  const deadline = form.getByLabel("Deadline");
  await deadline.fill(await deadline.getAttribute("min"));
  await form.getByText("High", { exact: true }).click();
  await capture(page, info, "assign-management-task", { fullPage: false });
  await form.getByRole("button", { name: "Assign task" }).click();
  await expect(form).toBeHidden();
  const row = workspace.locator("[data-mg-row]").filter({ hasText: title });
  await expect(row).toContainText("Not started");
  await capture(page, info, "admin-management-tasks");
  const id = await row.getAttribute("data-mg-row");

  const ctx = await browser.newContext({ baseURL: info.project.use.baseURL, viewport: info.project.use.viewport,
    isMobile: info.project.use.isMobile, hasTouch: info.project.use.hasTouch, serviceWorkers: "block" });
  try {
    const sales = await ctx.newPage();
    await blockExternalTraffic(sales);
    await login(sales, { project: { name: "salesman" } });
    await expect(sales.locator("#managementTasksMetric")).toContainText("pending of 1");
    await sales.locator("#managementTasksMetric button").click();
    const drawer = sales.locator("#managementTasksDrawer");
    const card = drawer.locator("[data-mg-card]").filter({ hasText: title });
    await expect(card).toContainText("Demo Admin");
    await expect(card).toContainText("Synthetic Steel Company 01");
    await expect(card).toContainText("Ask for dates and tonnage.");
    await capture(sales, info, "salesman-management-tasks", { fullPage: false });
    await card.getByRole("button", { name: "In progress", exact: true }).click();
    await card.getByLabel("Progress remarks").fill("Waiting for the buyer to call back.");
    await card.locator('button[type="submit"]').click();
    await expect(card.getByRole("button", { name: "In progress", exact: true })).toHaveAttribute("aria-pressed", "true");
    await card.getByRole("button", { name: "Completed", exact: true }).click();
    const complete = card.getByRole("button", { name: "Mark completed" });
    await expect(complete).toBeDisabled();
    await card.getByLabel("Completion remarks for management").fill("Short");
    await expect(complete).toBeDisabled();
    await card.getByLabel("Completion remarks for management").fill(remarks);
    await capture(sales, info, "salesman-task-completion", { fullPage: false });
    await complete.click();
    await expect(drawer).toContainText("0 pending of 1");
    await drawer.getByRole("button", { name: "Completed 1" }).click();
    await expect(card).toContainText(remarks);
    expect(await sales.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(info.project.use.viewport.width);
    await drawer.getByRole("button", { name: "Close management tasks" }).click();
    await expect(drawer).toBeHidden();
  } finally {
    await ctx.close();
  }

  await page.reload();
  await page.locator('[data-mg-tab="management"]').click();
  await expect(row).toContainText("Completed");
  await row.locator("summary").click();
  await expect(row).toContainText(remarks);
  await expect(row.getByRole("button", { name: "Edit task" })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(info.project.use.viewport.width);

  const peer = await browser.newContext({ baseURL: info.project.use.baseURL });
  try {
    const other = await peer.newPage();
    await blockExternalTraffic(other);
    await other.goto("/");
    await other.locator('#loginForm input[name="email"]').fill(FIXTURE_USERS[2].email);
    await other.locator('#loginForm input[name="password"]').fill(FIXTURE_PASSWORD);
    await other.locator('#loginForm button[type="submit"]').click();
    await expect(other.locator("#managementTasksMetric")).toContainText("pending of 0");
    await other.locator("#managementTasksMetric button").click();
    await expect(other.locator("#managementTasksDrawer")).not.toContainText(title);
    await expect(other.locator(`[data-mg-card="${id}"]`)).toHaveCount(0);
  } finally {
    await peer.close();
  }
});
