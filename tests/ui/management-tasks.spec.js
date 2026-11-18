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
    await expect(drawer.locator(".mg-drawer-total-today")).toContainText("1");
    const search = drawer.getByRole("searchbox", { name: "Search management tasks" });
    await search.fill("an unmatched search");
    await expect(drawer).toContainText("No tasks match your search or filter.");
    await search.fill("tonnage");
    await expect(card).toBeVisible();
    await search.clear();
    await capture(sales, info, "salesman-management-tasks", { fullPage: false });
    await card.getByRole("button", { name: "Start", exact: true }).click();
    await card.getByLabel("Progress remarks").fill("Waiting for the buyer to call back.");
    await card.locator('button[type="submit"]').click();
    await expect(card).toContainText("Waiting for the buyer to call back.");
    const status = card.getByRole("combobox", { name: `Status for ${title}` });
    await expect(status).toHaveValue("in_progress");
    await status.selectOption("completed");
    const complete = card.getByRole("button", { name: "Mark completed" });
    await expect(complete).toBeDisabled();
    await card.getByLabel("Completion remarks for management").fill("Short");
    await expect(complete).toBeDisabled();
    await card.getByLabel("Completion remarks for management").fill(remarks);
    await capture(sales, info, "salesman-task-completion", { fullPage: false });
    await sales.route("**/api/management-tasks/*/progress", route => route.fulfill({
      status: 503, json: { error: "Temporary test failure" }
    }), { times: 1 });
    await complete.click();
    await expect(card.getByRole("status")).toContainText("Temporary test failure");
    await expect(card.getByLabel("Completion remarks for management")).toHaveValue(remarks);
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

test("Admin removes only the selected duplicate and keeps an audit view", async ({ page, browser }, info) => {
  test.skip(!info.project.name.startsWith("admin"), "Runs both roles against one synthetic workspace");
  await blockExternalTraffic(page);
  await login(page, info);
  const [original, duplicate] = await page.evaluate(async () => {
    const ids = [crypto.randomUUID(), crypto.randomUUID()];
    for (const id of ids) await api(`/api/management-tasks/${id}/assign`, { method: "POST", body: JSON.stringify({
      title: "Synthetic duplicate assignment", instructions: "Ask about the delivery schedule.",
      assignee_id: "ui-salesman", lead_id: "ui-lead-1", due_date: "2099-01-01", priority: "medium"
    }) });
    return ids;
  });
  await page.goto("/?view=tasks");
  await page.locator('[data-mg-tab="management"]').click();
  const workspace = page.locator("#managementTasksWorkspace");
  const row = workspace.locator(`[data-mg-row="${duplicate}"]`);
  const originalRow = workspace.locator(`[data-mg-row="${original}"]`);
  await row.locator("summary").click();
  await row.getByRole("button", { name: "Remove task" }).click();
  const dialog = page.locator("#managementTaskFormDialog");
  await expect(dialog).toContainText("Synthetic Steel Company 01");
  const reason = "Entered twice. Keep the first assignment.";
  await dialog.getByLabel("Removal reason").fill(reason);
  await dialog.getByRole("button", { name: "Remove task" }).click();
  await expect(dialog).toBeHidden();
  await expect(row).toHaveCount(0);
  await expect(originalRow).toBeVisible();
  await page.reload();
  await page.locator('[data-mg-tab="management"]').click();
  await workspace.getByRole("button", { name: "Removed 1" }).click();
  await expect(row).toContainText("Removed");
  await row.locator("summary").click();
  await expect(row).toContainText(reason);
  await expect(row.getByRole("button", { name: "Remove task" })).toHaveCount(0);

  const ctx = await browser.newContext({ baseURL: info.project.use.baseURL, serviceWorkers: "block" });
  try {
    const sales = await ctx.newPage();
    await blockExternalTraffic(sales);
    await login(sales, { project: { name: "salesman" } });
    await sales.locator("#managementTasksMetric button").click();
    const drawer = sales.locator("#managementTasksDrawer");
    await expect(drawer.locator(`[data-mg-card="${original}"]`)).toBeVisible();
    await expect(drawer.locator(`[data-mg-card="${duplicate}"]`)).toHaveCount(0);
    await expect(drawer.getByRole("button", { name: /Removed|Remove task/ })).toHaveCount(0);
    const denied = await sales.evaluate(async id => {
      try {
        await api(`/api/management-tasks/${id}/Remove`, { method: "POST", body: JSON.stringify({
          expected_version: 1, reason: "Synthetic unauthorized removal attempt." }) });
        return 200;
      } catch (error) { return error.status; }
    }, original);
    expect(denied).toBe(403);
  } finally {
    await ctx.close();
  }
});

test("Admin lead creation assigns one task shared by Focus and Management Tasks", async ({ page, browser }, info) => {
  test.skip(info.project.name !== "admin-desktop", "Two independent desktop sessions");
  await blockExternalTraffic(page);
  await login(page, info);
  const context = await browser.newContext({ baseURL: info.project.use.baseURL, serviceWorkers: "block" });
  try {
    const sales = await context.newPage();
    await blockExternalTraffic(sales);
    await login(sales, { project: { name: "salesman" } });
    const company = "Unique Bluebeam Procurement Account";
    await page.locator("#openLeadForm").click();
    await page.locator("#leadCompanyName").fill(company);
    await page.locator("#formSalesman").selectOption("Demo Salesman");
    await page.locator("#leadStepNext").click();
    await page.locator("#leadStepNext").click();
    await expect(page.locator("#leadNextStepHelp")).toContainText("assigned as a Management Task");
    await expect(page.locator("#formNextAction")).toHaveValue("To Call");
    await page.locator('#leadForm textarea[name="notes"]').fill("Ask who manages purchasing.");
    const saving = page.waitForResponse(response => response.url().endsWith("/api/leads") && response.request().method() === "POST");
    await page.locator("#leadSubmitButton").click();
    const response = await saving;
    const lead = await response.json();
    expect(response.status(), JSON.stringify(lead)).toBe(201);
    expect(lead.initial_management_task_id).toBeTruthy();
    expect(lead.assigned_to).toBe("ui-salesman");
    expect(lead.next_action_date).toBeNull();
    expect(lead.activities).toHaveLength(0);
    const tasks = await page.evaluate(id => api("/api/management-tasks").then(rows => rows.filter(item => item.lead_id === id)), lead.id);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].id).toBe(lead.initial_management_task_id);
    expect(tasks[0].assigned_by).toBe("ui-admin");
    expect(tasks[0].instructions).toContain("Ask who manages purchasing.");

    await sales.reload();
    const focus = sales.locator("#salespersonFocusList li").filter({ hasText: company });
    await expect(focus).toHaveCount(1);
    await expect(focus).toContainText("To Call");
    await expect(focus.locator("[data-dashboard-focus-log]")).toHaveCount(0);
    const open = focus.getByRole("button", { name: `Open management task for ${company}` });
    await expect(open).toHaveAttribute("data-mg-open", tasks[0].id);
    await open.click();
    const drawer = sales.locator("#managementTasksDrawer");
    const row = drawer.locator(`[data-mg-card="${tasks[0].id}"]`);
    await expect(row).toContainText(company);
    await row.getByLabel("Status for To Call").selectOption("completed");
    await row.getByLabel("Completion remarks for management").fill("Spoke with the purchasing contact.");
    await row.getByRole("button", { name: "Mark completed" }).click();
    await expect(row).toContainText("Spoke with the purchasing contact.");
    await drawer.getByRole("button", { name: "Close management tasks" }).click();
    await expect(focus).toHaveCount(0);
    const persisted = await page.evaluate(id => api("/api/management-tasks").then(rows => rows.find(item => item.id === id)), tasks[0].id);
    expect(persisted.status).toBe("completed");
  } finally {
    await context.close();
  }
});
