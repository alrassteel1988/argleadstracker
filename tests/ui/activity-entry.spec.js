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
  } finally { await context.close().catch(() => {}); }
});
