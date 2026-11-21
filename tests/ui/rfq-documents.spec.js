const { test, expect } = require("@playwright/test");
const { capture, login, blockExternalTraffic } = require("./helpers");

test("Admin RFQ supporting files survive a lost upload response and are downloadable by the assigned Salesman", async ({ page, browser }, info) => {
  test.skip(!info.project.name.startsWith("admin"), "Independent Admin and Salesman sessions");
  await blockExternalTraffic(page);
  await login(page, info);
  const context = await browser.newContext({ baseURL: info.project.use.baseURL, viewport: info.project.use.viewport,
    isMobile: info.project.use.isMobile, hasTouch: info.project.use.hasTouch, serviceWorkers: "block" });
  try {
    const sales = await context.newPage();
    await blockExternalTraffic(sales); await login(sales, { project: { name: "salesman" } });
    await page.goto("/?view=tasks");
    await page.locator("#openLeadForm").click();
    await page.locator("#leadGoogleLookup").uncheck();
    await page.locator("#leadCompanyName").fill("Synthetic RFQ Supporting Documents");
    await page.locator("#formSalesman").selectOption("Demo Salesman");
    await page.locator("#leadStepNext").click(); await page.locator("#leadStepNext").click();
    const form = page.locator("#leadDialog");
    await expect(page.locator("#leadRfqFiles")).toBeHidden();
    await form.locator('[name="initial_management_task_title"]').selectOption("Respond to Initial RFQ");
    await expect(page.locator("#leadRfqFiles")).toBeVisible();
    const pdf = Buffer.from("%PDF-synthetic RFQ specification"), jpeg = Buffer.from([255,216,255,224,255,217]);
    await page.locator("#leadRfqFileInput").setInputFiles([{ name:"specification.pdf",mimeType:"application/pdf",buffer:pdf },
      { name:"drawing.jpeg",mimeType:"image/jpeg",buffer:jpeg }]);
    await expect(page.locator("#leadRfqFileList li")).toHaveCount(2);
    await capture(page, info, "rfq-step3-supporting-files", { fullPage:false });
    const saves = [];
    page.on("request", request => { if (new URL(request.url()).pathname === "/api/leads" && request.method()==="POST") saves.push(request); });
    let lost = false;
    await page.route("**/api/management-tasks/*/documents/*", async route => {
      if (route.request().method()==="POST" && !lost) {
        lost=true; await route.fetch();
        return route.fulfill({status:503,contentType:"application/json",body:JSON.stringify({error:"Synthetic lost upload response"})});
      }
      return route.continue();
    });
    await page.locator("#leadSubmitButton").click();
    await expect(page.locator("#leadRfqUploadMessage")).toContainText("Lead already saved");
    expect(saves).toHaveLength(1);
    await expect(page.locator("#leadSubmitButton")).toHaveText("Retry document uploads");
    await page.locator("#leadSubmitButton").click();
    await expect(form).toBeHidden();
    expect(saves).toHaveLength(1);
    await page.goto("/?view=tasks");
    await page.locator("#openLeadForm").click();
    await expect(page.locator("#leadSubmitButton")).toBeEnabled();
    await page.locator("#leadDialog").getByRole("button",{name:"Close",exact:true}).click();
    const tasks = await page.evaluate(() => api("/api/management-tasks"));
    const task = tasks.find(item => item.lead_name==="Synthetic RFQ Supporting Documents");
    expect(task).toBeTruthy();
    expect(task.priority).toBe("medium");
    await page.locator('[data-mg-tab="management"]').click();
    const adminTitle = page.locator(`[data-mg-row="${task.id}"] > summary .mg-task-title-rfq`);
    await expect(adminTitle).toHaveText("Respond to Initial RFQ");
    await expect(adminTitle).toHaveCSS("color", "rgb(155, 28, 28)");
    await capture(page, info, "rfq-admin-red-title", {fullPage:false});
    const docs = await page.evaluate(id => api(`/api/management-tasks/${id}/documents`),task.id);
    expect(docs).toHaveLength(2); expect(docs.every(doc=>doc.ready)).toBe(true);
    expect(docs.some(doc=>doc.storage_key)).toBe(false);
    await sales.reload();
    await sales.locator("#managementTasksMetric button").click();
    const card = sales.locator(`[data-mg-card="${task.id}"]`);
    await expect(card.locator(".mg-drawer-task > .mg-task-title-rfq")).toHaveCSS("color", "rgb(155, 28, 28)");
    await card.locator(".mg-drawer-expanded > summary").click();
    await card.locator("[data-task-documents] > summary").click();
    await expect(card.locator(".mg-task-document")).toHaveCount(2);
    await expect(card).toContainText("specification.pdf");
    const documentRow = card.locator('.mg-task-document').filter({hasText:"specification.pdf"});
    expect((await documentRow.locator(":scope > span").boundingBox()).width).toBeGreaterThanOrEqual(140);
    expect((await documentRow.getByRole("button",{name:"Download"}).boundingBox()).width).toBeLessThanOrEqual(140);
    const received = sales.waitForEvent("download");
    await card.locator('.mg-task-document').filter({hasText:"specification.pdf"}).getByRole("button",{name:"Download"}).click();
    const download = await received;
    expect(download.suggestedFilename()).toBe("specification.pdf");
    expect(require("node:fs").readFileSync(await download.path())).toEqual(pdf);
    await documentRow.scrollIntoViewIfNeeded();
    await capture(sales, info, "rfq-salesman-documents", {fullPage:false});
    expect(await sales.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  } finally { await context.close(); }
});

test("Salesman registration has no RFQ supporting upload control", async ({page},info) => {
  test.skip(info.project.name.startsWith("admin"), "Salesman registration");
  await blockExternalTraffic(page); await login(page,info);
  await page.goto("/?view=tasks");
  await page.locator("#openLeadForm").click();
  await page.locator("#leadCompanyName").fill("Synthetic Salesman Optional Lead");
  await page.locator("#leadStepNext").click(); await page.locator("#leadStepNext").click();
  await expect(page.locator("#leadRfqFiles")).toBeHidden();
  await expect(page.locator("#leadRfqFileInput")).toBeDisabled();
});
