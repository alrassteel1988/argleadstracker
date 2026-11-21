const { test, expect } = require("@playwright/test");
const { capture, login, blockExternalTraffic } = require("./helpers");

function syntheticPdf() {
  const content = number => `BT /F1 24 Tf 50 300 Td (RFQ SYNTHETIC PRIVATE PREVIEW PAGE ${number}) Tj ET`;
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>",
    ...[6,7].map(id=>`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 400] /Resources << /Font << /F1 5 0 R >> >> /Contents ${id} 0 R >>`),
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ...[1,2].map(number=>`<< /Length ${content(number).length} >>\nstream\n${content(number)}\nendstream`)];
  let body="%PDF-1.4\n", offsets=[0];
  objects.forEach((object,index)=>{offsets.push(Buffer.byteLength(body));body+=`${index+1} 0 obj\n${object}\nendobj\n`;});
  const start=Buffer.byteLength(body);
  body+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(offset=>`${String(offset).padStart(10,"0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;
  return Buffer.from(body);
}

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
    const pdf = syntheticPdf(), png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aM9sAAAAASUVORK5CYII=", "base64");
    await page.locator("#leadRfqFileInput").setInputFiles([{ name:"specification.pdf",mimeType:"application/pdf",buffer:pdf },
      { name:"drawing.png",mimeType:"image/png",buffer:png }]);
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
    const adminRow = page.locator(`[data-mg-row="${task.id}"]`);
    await adminRow.locator(":scope > summary").click();
    await adminRow.locator("[data-task-documents] > summary").click();
    await expect(adminRow.locator(".mg-task-document")).toHaveCount(2);
    await page.evaluate(() => loadManagementTasks());
    await expect(adminRow).toHaveAttribute("open", "");
    await expect(adminRow.locator("[data-task-documents]")).toHaveAttribute("open", "");
    await expect(adminRow.locator(".mg-task-document")).toHaveCount(2);
    await sales.reload();
    await sales.locator("#managementTasksMetric button").click();
    const card = sales.locator(`[data-mg-card="${task.id}"]`);
    await expect(card.locator(".mg-drawer-task > .mg-task-title-rfq")).toHaveCSS("color", "rgb(155, 28, 28)");
    await card.locator(".mg-drawer-expanded > summary").click();
    await card.locator("[data-task-documents] > summary").click();
    await expect(card.locator(".mg-task-document")).toHaveCount(2);
    await expect(card).toContainText("specification.pdf");
    let documentReloads = 0;
    sales.on("request", request => { if (new URL(request.url()).pathname === `/api/management-tasks/${task.id}/documents`) documentReloads++; });
    await sales.evaluate(() => loadManagementTasks());
    await expect(card.locator(".mg-drawer-expanded")).toHaveAttribute("open", "");
    await expect(card.locator("[data-task-documents]")).toHaveAttribute("open", "");
    await expect(card.locator(".mg-task-document")).toHaveCount(2);
    expect(documentReloads).toBeGreaterThan(0);
    const documentRow = card.locator('.mg-task-document').filter({hasText:"specification.pdf"});
    expect((await documentRow.locator(":scope > span").boundingBox()).width).toBeGreaterThanOrEqual(140);
    expect((await documentRow.getByRole("button",{name:"Download"}).boundingBox()).width).toBeLessThanOrEqual(140);
    const previews = sales.getByRole("dialog",{name:"Supporting document preview"});
    await documentRow.getByRole("button",{name:"View",exact:true}).click();
    const pdfCanvas=previews.locator('canvas[data-pdf-rendered="true"]');
    await expect(pdfCanvas).toBeVisible();
    expect(sales.workers()).toHaveLength(1);
    await expect(pdfCanvas).toHaveAttribute("aria-label", "PDF page 1 of 2");
    const ink=await pdfCanvas.evaluate(canvas=>{
      const pixels=canvas.getContext("2d").getImageData(0,0,canvas.width,canvas.height).data;
      let count=0;for(let i=0;i<pixels.length;i+=4) if(pixels[i]<200&&pixels[i+1]<200&&pixels[i+2]<200&&pixels[i+3]>0) count++;
      return count;
    });
    expect(ink).toBeGreaterThan(100);
    const previewHeader = await previews.locator("header").boundingBox();
    const previewBody = await previews.locator(".mg-document-preview-body").boundingBox();
    expect(previewBody.y).toBeGreaterThanOrEqual(previewHeader.y + previewHeader.height - 1);
    expect(previewHeader.width).toBeGreaterThanOrEqual((await previews.boundingBox()).width - 4);
    expect((await previews.locator(".mg-pdf-paper").boundingBox()).width).toBeGreaterThanOrEqual(previewBody.width - 26);
    await previews.getByRole("button",{name:"Next PDF page"}).click();
    await expect(pdfCanvas).toHaveAttribute("aria-label", "PDF page 2 of 2");
    await expect(previews.getByRole("button",{name:"Next PDF page"})).toBeDisabled();
    await previews.getByRole("button",{name:"Previous PDF page"}).click();
    await expect(pdfCanvas).toHaveAttribute("aria-label", "PDF page 1 of 2");
    await previews.getByRole("combobox",{name:"PDF zoom"}).selectOption("1.5");
    await expect(pdfCanvas).toBeVisible();
    await capture(sales,info,"rfq-private-pdf-canvas",{fullPage:false});
    expect(await previews.getByRole("button",{name:"Close file preview"}).evaluate(button=>getComputedStyle(button,"::before").content)).not.toBe("none");
    await previews.getByRole("button",{name:"Close file preview"}).click();
    await expect(previews).toHaveCount(0);
    await expect.poll(()=>sales.workers().length).toBe(0);
    await card.locator('.mg-task-document').filter({hasText:"drawing.png"}).getByRole("button",{name:"View",exact:true}).click();
    await expect(previews.locator("img")).toHaveAttribute("src", /^blob:/);
    await expect(previews.locator("img")).toHaveJSProperty("naturalWidth",1);
    await capture(sales,info,"rfq-private-file-view",{fullPage:false});
    await sales.keyboard.press("Escape");
    await expect(previews).toHaveCount(0);
    const received = sales.waitForEvent("download");
    await card.locator('.mg-task-document').filter({hasText:"specification.pdf"}).getByRole("button",{name:"Download"}).click();
    const download = await received;
    expect(download.suggestedFilename()).toBe("specification.pdf");
    expect(require("node:fs").readFileSync(await download.path())).toEqual(pdf);
    await documentRow.scrollIntoViewIfNeeded();
    await capture(sales, info, "rfq-salesman-documents", {fullPage:false});
    expect(await sales.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
    await documentRow.getByRole("button",{name:"View",exact:true}).click();
    await expect(previews.locator('canvas[data-pdf-rendered="true"]')).toBeVisible();
    await sales.route("**/api/management-tasks", route => route.fulfill({json:[]}));
    await sales.evaluate(() => loadManagementTasks());
    await expect(previews).toHaveCount(0);
    await expect(card).toHaveCount(0);
    await expect(sales.locator("#managementTasksDrawerList [data-task-documents]")).toHaveCount(0);
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
