const { test, expect } = require("@playwright/test");
const { login, blockExternalTraffic, capture } = require("./helpers");

test("legacy reminder form and corrections preserve the original activity", async ({ page, browser }, info) => {
  test.skip(!info.project.name.startsWith("admin"), "Exercises both actors with independent sessions");
  await blockExternalTraffic(page);
  await login(page, info);
  const context = await browser.newContext({ baseURL: info.project.use.baseURL, viewport: info.project.use.viewport,
    isMobile: info.project.use.isMobile, hasTouch: info.project.use.hasTouch, serviceWorkers: "block" });
  try {
    const sales = await context.newPage();
    await blockExternalTraffic(sales);
    await login(sales, { project: { name: "salesman" } });
    const lead = {id:"ui-lead-1"};
    for (const [target, actor, label] of [[page, "Demo Admin", "Admin"], [sales, "Demo Salesman", "Salesman"]]) {
      const reminderIds = [];
      await target.route(`**/api/leads/${lead.id}/activities`, async route => {
        if (route.request().method() !== "POST") return route.continue();
        reminderIds.push(route.request().postDataJSON().id);
        if (label === "Admin" && reminderIds.length === 1) {
          return route.fulfill({status:503,json:{error:"Synthetic reminder save failure"}});
        }
        return route.continue();
      });
      target.on("dialog", dialog => dialog.dismiss());
      await target.route("**/api/leads/*/activities/*", async route => {
        const id = new URL(route.request().url()).pathname.split("/").pop();
        if (route.request().method() === "PATCH" && !/^\d+$/.test(id)) {
          return route.fulfill({status:409, json:{error:"Original activity details are read-only; add a correction instead"}});
        }
        return route.continue();
      });
      await target.goto(`/leads/${lead.id}?tab=reminders`);
      await target.getByRole("button", {name:"Reminders",exact:true}).click();
      await target.getByRole("button", {name:"Add Reminder",exact:true}).click();
      const form = target.getByRole("dialog", {name:"Add Reminder",exact:true});
      await expect(form).toBeVisible();
      await form.getByLabel("Reminder note", {exact:true}).fill(`${label} synthetic reminder`);
      await form.getByLabel("Due date", {exact:true}).fill("2099-01-02");
      await capture(target, info, `${label.toLowerCase()}-reminder-form`);
      if (label === "Admin") {
        const failed = target.waitForResponse(response => response.url().endsWith(`/api/leads/${lead.id}/activities`)
          && response.request().method() === "POST");
        await form.getByRole("button", {name:"Save Reminder",exact:true}).click();
        expect((await failed).status()).toBe(503);
        await expect(form).toContainText("Synthetic reminder save failure");
        await expect(form.getByLabel("Reminder note", {exact:true})).toHaveValue(`${label} synthetic reminder`);
        await expect(form.getByRole("button", {name:"Save Reminder",exact:true})).toBeEnabled();
      }
      const saving = target.waitForResponse(response => response.url().endsWith(`/api/leads/${lead.id}/activities`)
        && response.request().method() === "POST");
      await form.getByRole("button", {name:"Save Reminder",exact:true}).click();
      const response = await saving;
      expect(response.status(), await response.text()).toBe(201);
      const result = await response.json();
      expect(reminderIds).toHaveLength(label === "Admin" ? 2 : 1);
      expect(new Set(reminderIds).size).toBe(1);
      const original = result.activity;
      expect(original.created_by_name).toBe(actor);
      expect(original.due_date).toBe("2099-01-02");
      await expect(form).toBeHidden();
      await target.getByRole("button", {name:"Activities",exact:true}).click();
      const card = target.getByRole("article").filter({hasText:`${label} synthetic reminder`});
      await card.getByRole("button", {name:"Edit",exact:true}).click();
      const correction = target.getByRole("dialog", {name:"Add Activity Correction",exact:true});
      await expect(correction).toBeVisible();
      await expect(correction.getByLabel("Correction note", {exact:true})).toHaveValue("");
      await correction.getByLabel("Correction note", {exact:true}).fill(`${label} synthetic correction`);
      await capture(target, info, `${label.toLowerCase()}-correction-form`);
      const appending = target.waitForResponse(response => /\/activities\/\d+$/.test(new URL(response.url()).pathname)
        && response.request().method() === "PATCH");
      await correction.getByRole("button", {name:"Append Correction",exact:true}).click();
      const saved = await appending;
      expect(saved.status(), await saved.text()).toBe(201);
      const appended = await saved.json();
      expect(appended.activity.type).toBe("Correction");
      expect(appended.activity.created_by_name).toBe(actor);
      expect(appended.activity.target_activity_id).toBe(original.id);
      expect(appended.lead.activities.find(item => item.id === original.id)).toEqual(original);
      await expect(correction).toBeHidden();
      await capture(target, info, `${label.toLowerCase()}-legacy-reminder-correction`);
      expect(await target.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    }
    const assigned = await page.evaluate(() => api(`/api/management-tasks/${crypto.randomUUID()}/assign`, {
      method: "POST", body: JSON.stringify({ title: "Activity reconciliation task", instructions: "Synthetic task history compatibility check.",
        assignee_id: "ui-salesman", lead_id: "ui-lead-1", due_date: "2099-01-02", priority: "medium" })
    }));
    const completed = await sales.evaluate(task => api(`/api/management-tasks/${task.id}/progress`, {
      method: "POST", body: JSON.stringify({ expected_version: task.version, status: "completed", remarks: "Synthetic completion evidence stays unchanged." })
    }), assigned);
    const activitiesBefore = await sales.evaluate(() => api("/api/leads/ui-lead-1").then(lead => lead.activities));
    await sales.goto("/?view=tasks");
    await sales.locator('[data-mg-tab="management"]').click();
    const drawer = sales.locator("#managementTasksDrawer");
    await expect(drawer.locator('[data-mg-filter="all"]')).toHaveAttribute("aria-pressed", "true");
    const taskCard = drawer.locator(`[data-mg-card="${assigned.id}"]`);
    await expect(taskCard).toContainText("Completed");
    await taskCard.getByRole("button", { name: "Add remark", exact: true }).click();
    await taskCard.getByLabel("Additional remark", { exact: true }).fill("Synthetic additional remark after activity correction.");
    await taskCard.locator('.mg-task-progress-form button[type="submit"]').click();
    await expect(taskCard.locator(".mg-task-remark-preview")).toHaveText("Synthetic additional remark after activity correction.");
    await taskCard.locator(".mg-drawer-expanded > summary").click();
    await expect(taskCard.locator(".mg-task-timeline li")).toHaveCount(2);
    await expect(taskCard.locator(".mg-task-timeline")).toContainText(completed.remarks);
    await expect(taskCard.locator(".mg-task-timeline button")).toHaveCount(0);
    const after = await sales.evaluate(id => api("/api/management-tasks").then(rows => rows.find(task => task.id === id)), assigned.id);
    expect(after.status).toBe("completed");
    expect(after.completed_at).toBe(completed.completed_at);
    expect(after.remarks).toBe(completed.remarks);
    expect(after.remark_history.slice(0, -1)).toEqual(completed.remark_history);
    expect(await sales.evaluate(() => api("/api/leads/ui-lead-1").then(lead => lead.activities))).toEqual(activitiesBefore);
    await capture(sales, info, "activity-and-task-history-compatible");
    await page.goto("/?view=tasks");
    await page.locator('[data-mg-tab="management"]').click();
    const adminTask = page.locator(`[data-mg-row="${assigned.id}"]`);
    await adminTask.locator("summary").click();
    await expect(adminTask.locator(".mg-task-timeline li")).toHaveCount(2);
    await expect(adminTask).toContainText("Synthetic additional remark after activity correction.");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  } finally { await context.close().catch(() => {}); }
});
