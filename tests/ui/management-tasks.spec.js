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

test("Admin resolves an initial duplicate on the same lead and Salesman retains the next step", async ({ page, browser }, info) => {
  test.skip(!info.project.name.startsWith("admin"), "Uses separate synthetic Admin and Salesman sessions");
  await blockExternalTraffic(page);
  await page.goto("/");
  await page.locator('#loginForm input[name="email"]').fill(FIXTURE_USERS.find(user => user.role === "admin").email);
  await page.locator('#loginForm input[name="password"]').fill(FIXTURE_PASSWORD);
  await page.locator('#loginForm button[type="submit"]').click();
  await expect(page.locator("#appShell")).toBeVisible();
  await expect(page.locator("#loginForm")).toBeHidden();
  const linked = await page.evaluate(async () => api("/api/leads", { method: "POST", body: JSON.stringify({
    company_name: "ZZZ Resolute Delta QC70", assigned_to: "ui-salesman", assigned_salesman: "Demo Salesman",
    stage: "NEW", next_action: "To Call", next_action_date: "2099-01-01", activity_purpose: "Company Introductory"
  }) }));
  await page.goto("/?view=tasks");
  await page.locator('[data-mg-tab="management"]').click();
  const workspace = page.locator("#managementTasksWorkspace");
  const source = workspace.locator(`[data-mg-row="${linked.initial_management_task_id}"]`);
  await source.locator("summary").click();
  await expect(source.getByRole("button", { name: "Resolve duplicate", exact: true })).toBeDisabled();
  await expect(source).toContainText("separate duplicate-lead review");
  const [keep, foreign] = await page.evaluate(async leadId => {
    const ids = [crypto.randomUUID(), crypto.randomUUID()];
    for (const [i, id] of ids.entries()) await api(`/api/management-tasks/${id}/assign`, { method: "POST", body: JSON.stringify({
      title: i ? "Other lead candidate" : "Retained same-lead follow-up", instructions: "Synthetic duplicate-resolution browser verification.",
      assignee_id: "ui-salesman", lead_id: i ? "ui-lead-2" : leadId, due_date: "2099-01-01", priority: "medium"
    }) });
    return ids;
  }, linked.id);
  await workspace.getByRole("button", { name: "Refresh", exact: true }).click();
  await source.getByRole("button", { name: "Resolve duplicate", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Resolve duplicate task", exact: true });
  const retained = dialog.getByRole("combobox", { name: "Task to retain" });
  await expect(retained.locator("option")).toHaveCount(2);
  await expect(retained).not.toContainText("Other lead candidate");
  await retained.selectOption(keep);
  await expect(dialog.locator("[data-mg-retained-preview]")).toContainText("Retained same-lead follow-up");
  const reason = "This opening task duplicates the retained follow-up on the same lead.";
  await dialog.getByRole("textbox", { name: "Resolution reason" }).fill(reason);
  await dialog.getByRole("checkbox").check();
  const checkbox = await dialog.getByRole("checkbox").boundingBox();
  expect(checkbox.width).toBeLessThanOrEqual(20);
  expect(checkbox.height).toBeLessThanOrEqual(20);
  await capture(page, info, "same-lead-resolution-confirm", { fullPage: false });
  await page.route("**/api/management-tasks/*/resolve_duplicate", route => route.fulfill({
    status: 503, json: { error: "Synthetic temporary failure" }
  }), { times: 1 });
  await dialog.getByRole("button", { name: "Resolve duplicate", exact: true }).click();
  await expect(dialog.getByRole("status")).toContainText("Synthetic temporary failure");
  await expect(dialog.getByRole("textbox", { name: "Resolution reason" })).toHaveValue(reason);
  await dialog.getByRole("button", { name: "Resolve duplicate", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(source).toHaveCount(0);
  const savedLead = await page.evaluate(id => api(`/api/leads/${id}`), linked.id);
  expect(savedLead.initial_management_task_id).toBe(keep);
  await workspace.getByRole("button", { name: /^Removed / }).click();
  await expect(source).toBeVisible();
  await source.locator("summary").click();
  await expect(source).toContainText(reason);
  await expect(source).toContainText("Retained same-lead follow-up");
  await expect(source.getByRole("button", { name: "Resolve duplicate", exact: true })).toHaveCount(0);
  const ctx = await browser.newContext({ baseURL: info.project.use.baseURL, viewport: info.project.use.viewport,
    isMobile: info.project.use.isMobile, hasTouch: info.project.use.hasTouch, serviceWorkers: "block" });
  try {
    const sales = await ctx.newPage();
    await blockExternalTraffic(sales);
    // This case creates an extra lead, so the shared twelve-lead login assertion is not applicable.
    await sales.goto("/");
    await sales.locator('#loginForm input[name="email"]').fill(FIXTURE_USERS.find(user => user.role === "salesman").email);
    await sales.locator('#loginForm input[name="password"]').fill(FIXTURE_PASSWORD);
    await sales.locator('#loginForm button[type="submit"]').click();
    await expect(sales.locator("#appShell")).toBeVisible();
    await expect(sales.locator("#loginForm")).toBeHidden();
    const focus = sales.locator("#salespersonFocusList");
    await expect(focus.locator(`[data-mg-open="${keep}"]`)).toBeVisible();
    await expect(focus.locator(`[data-mg-open="${linked.initial_management_task_id}"]`)).toHaveCount(0);
    await sales.locator("#managementTasksMetric button").click();
    const drawer = sales.locator("#managementTasksDrawer");
    await expect(drawer.locator(`[data-mg-card="${keep}"]`)).toBeVisible();
    await expect(drawer.locator(`[data-mg-card="${linked.initial_management_task_id}"]`)).toHaveCount(0);
    await expect(drawer.locator(`[data-mg-card="${foreign}"]`)).toBeVisible();
    await expect(drawer.getByRole("button", { name: "Resolve duplicate", exact: true })).toHaveCount(0);
    expect(await sales.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await capture(sales, info, "same-lead-retained-task", { fullPage: false });
  } finally { await ctx.close(); }
});
