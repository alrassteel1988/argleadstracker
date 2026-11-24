const {test,expect}=require("@playwright/test");
const {capture,login,blockExternalTraffic}=require("./helpers");

function summaryPdf() {
  const text=n=>`BT /F1 24 Tf 50 300 Td (SYNTHETIC LEAD SUMMARY PAGE ${n}) Tj ET`;
  const objects=["<< /Type /Catalog /Pages 2 0 R >>","<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>",
    ...[6,7].map(id=>`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 400] /Resources << /Font << /F1 5 0 R >> >> /Contents ${id} 0 R >>`),
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",...[1,2].map(n=>`<< /Length ${text(n).length} >>\nstream\n${text(n)}\nendstream`)];
  let body="%PDF-1.4\n";const offsets=[];
  objects.forEach((value,index)=>{offsets.push(Buffer.byteLength(body));body+=`${index+1} 0 obj\n${value}\nendobj\n`;});
  const start=Buffer.byteLength(body);
  body+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.map(offset=>`${String(offset).padStart(10,"0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;
  return Buffer.from(body);
}

test("Admin publishes independent summaries, keeps archived versions and Salesman reads only latest in full page",async({page,browser},info)=>{
  test.skip(!info.project.name.startsWith("admin"),"Independent role sessions share one synthetic lead");
  test.setTimeout(180000);
  await blockExternalTraffic(page);await login(page,info);
  await page.route("**/api/leads/ui-lead-1/intel",route=>route.fulfill({json:{failed_report:{id:"synthetic-ai-failure",status:"failed",error_message:"Synthetic AI unavailable"},market_items:[]}}));
  await page.evaluate(()=>openLeadDrawer("ui-lead-1","intel"));
  const panel=page.locator('[data-lead-summary="ui-lead-1"]');
  await expect(panel.getByRole("button",{name:"Upload summary PDF"})).toBeVisible();
  await panel.getByRole("button",{name:"Upload summary PDF"}).click();
  const dialog=page.getByRole("dialog",{name:"Publish lead summary"}),pdf=summaryPdf();
  await dialog.getByLabel("Summary PDF",{exact:true}).setInputFiles({name:"bad.exe",mimeType:"application/octet-stream",buffer:Buffer.from("bad")});
  await dialog.getByRole("button",{name:"Publish summary",exact:true}).click();
  await expect(dialog.getByRole("status")).toHaveText("Choose a PDF up to 4 MB.");
  await dialog.getByLabel("Summary PDF",{exact:true}).setInputFiles({name:"summary-original.pdf",mimeType:"application/pdf",buffer:pdf});
  let lost=false;const requests=[];
  await page.route("**/api/leads/ui-lead-1/summary-documents/*",async route=>{
    if(route.request().method()!=="POST") return route.continue();
    requests.push(route.request().url());
    if(!lost){lost=true;await route.fetch();return route.fulfill({status:503,json:{error:"Synthetic response lost"}});}
    return route.continue();
  });
  await dialog.getByRole("button",{name:"Publish summary",exact:true}).click();
  await expect(dialog.getByRole("status")).toContainText("Synthetic response lost");
  await dialog.getByRole("button",{name:"Retry upload",exact:true}).click();
  await expect(dialog).toHaveCount(0);
  expect(requests[0]).toBe(requests[1]);
  await expect(panel).toContainText("Version 1");
  const first=await page.evaluate(()=>api("/api/leads/ui-lead-1/summary-documents").then(result=>result.documents[0]));
  await panel.getByRole("button",{name:"Upload new version"}).click();
  await dialog.getByLabel("Summary PDF",{exact:true}).setInputFiles({name:"summary-current.pdf",mimeType:"application/pdf",buffer:pdf});
  await dialog.getByLabel("What changed?",{exact:true}).fill("Quarterly procurement review; synthetic note only.");
  await dialog.getByRole("button",{name:"Publish summary",exact:true}).click();
  await expect(dialog).toHaveCount(0);
  await expect(panel.locator(":scope > .lead-summary-version")).toContainText("summary-current.pdf");
  await expect(panel.locator(":scope > .lead-summary-version")).not.toContainText("summary-original.pdf");
  await panel.locator("details > summary").click();
  await expect(panel.locator("details")).toContainText("summary-original.pdf");
  await panel.locator("details").getByRole("button",{name:"View full page"}).click();
  const viewer=page.getByRole("dialog",{name:"Lead summary full-page viewer"});
  await expect(viewer.locator('canvas[data-pdf-rendered="true"]')).toBeVisible();
  const box=await viewer.boundingBox();expect(Math.abs(box.width-info.project.use.viewport.width)).toBeLessThan(2);
  await expect(viewer.getByRole("button",{name:"Next PDF page"})).toBeEnabled();
  await viewer.getByRole("button",{name:"Next PDF page"}).click();
  await expect(viewer.locator("[data-pdf-pages]")).toHaveText("2 / 2");
  expect(await viewer.locator("canvas").evaluate(canvas=>{const data=canvas.getContext("2d").getImageData(0,0,canvas.width,canvas.height).data;return data.some((value,index)=>index%4!==3 && value<150);})).toBe(true);
  await capture(page,info,"lead-summary-full-page",{fullPage:false});
  await viewer.getByRole("button",{name:"Close lead summary"}).click();
  await capture(page,info,"lead-summary-versions",{fullPage:false});
  const context=await browser.newContext({baseURL:info.project.use.baseURL,viewport:info.project.use.viewport,isMobile:info.project.use.isMobile,hasTouch:info.project.use.hasTouch,serviceWorkers:"block"});
  try {
    const sales=await context.newPage();await blockExternalTraffic(sales);await login(sales,{project:{name:"salesman"}});
    await sales.evaluate(()=>openLeadDrawer("ui-lead-1","intel"));
    const salesPanel=sales.locator('[data-lead-summary="ui-lead-1"]');
    await expect(salesPanel).toContainText("summary-current.pdf");
    await expect(salesPanel).not.toContainText("summary-original.pdf");
    await expect(salesPanel.getByText("Archived versions")).toHaveCount(0);
    await expect(salesPanel.getByRole("button",{name:"Upload new version"})).toHaveCount(0);
    expect(await sales.evaluate(url=>authenticatedFetch(url).then(response=>response.status),first.download_url)).toBe(404);
    expect(await sales.evaluate(()=>authenticatedFetch("/api/leads/ui-lead-1/summary-documents?archived=1").then(response=>response.status))).toBe(403);
    await salesPanel.getByRole("button",{name:"View full page"}).click();
    await expect(sales.getByRole("dialog",{name:"Lead summary full-page viewer"}).locator('canvas[data-pdf-rendered="true"]')).toBeVisible();
    await sales.keyboard.press("Escape");
    const receive=sales.waitForEvent("download");await salesPanel.getByRole("button",{name:"Download",exact:true}).click();
    expect(require("node:fs").readFileSync(await (await receive).path())).toEqual(pdf);
    await salesPanel.getByRole("button",{name:"View full page"}).click();
    await sales.evaluate(()=>showLogin("Synthetic account reset"));
    await expect(sales.getByRole("dialog",{name:"Lead summary full-page viewer"})).toHaveCount(0);
  } finally {await context.close();}
});

test("Salesman Intel has no manual summary upload and blocks archive/direct write APIs",async({page},info)=>{
  test.skip(!info.project.name.startsWith("salesman"),"Salesman-only empty-state coverage");
  await blockExternalTraffic(page);await login(page,info);
  await page.evaluate(()=>openLeadDrawer("ui-lead-1","intel"));
  const panel=page.locator('[data-lead-summary="ui-lead-1"]');
  await expect(panel).toContainText("No lead summary document yet.");
  await expect(panel.locator("[data-summary-upload]")).toHaveCount(0);
  const statuses=await page.evaluate(async()=>[
    (await authenticatedFetch("/api/leads/ui-lead-1/summary-documents?archived=1")).status,
    (await authenticatedFetch(`/api/leads/ui-lead-1/summary-documents/${crypto.randomUUID()}`,{method:"POST",body:"synthetic"})).status,
    (await authenticatedFetch("/api/leads/ui-lead-18/summary-documents")).status]);
  expect(statuses).toEqual([403,403,404]);
  const response=await page.evaluate(async()=>{
    const result=await authenticatedFetch("/api/leads/ui-lead-1/summary-documents");
    return {status:result.status,cache:result.headers.get("cache-control")};
  });
  expect(response.status).toBe(200);
  expect(response.cache).toBe("private, no-store");
});

test("Admin Step 3 summary survives upload retry and appears in Tasks attachments and Intel for both roles",async({page,browser},info)=>{
  test.skip(!info.project.name.startsWith("admin"),"Registration is Admin-only");test.setTimeout(180000);
  await blockExternalTraffic(page);await login(page,info);
  const context=await browser.newContext({baseURL:info.project.use.baseURL,viewport:info.project.use.viewport,isMobile:info.project.use.isMobile,hasTouch:info.project.use.hasTouch,serviceWorkers:"block"});
  try {
    const sales=await context.newPage();await blockExternalTraffic(sales);await login(sales,{project:{name:"salesman"}});
    await page.goto("/?view=tasks");await page.locator("#openLeadForm").click();
    await page.locator("#leadGoogleLookup").uncheck();await page.locator("#leadCompanyName").fill("Synthetic Summary Registration");
    await page.locator("#formSalesman").selectOption("Demo Salesman");
    await page.locator("#leadStepNext").click();await page.locator("#leadStepNext").click();
    await expect(page.locator('#leadForm [name="initial_management_task_title"]')).toHaveValue("New Lead Outreach");
    const pdf=summaryPdf();
    await page.locator('#leadForm [name="initial_management_task_title"]').selectOption("Respond to Initial RFQ");
    await page.locator("#leadRfqFileInput").setInputFiles({name:"hidden-rfq.pdf",mimeType:"application/pdf",buffer:pdf});
    await page.locator('#leadForm [name="initial_management_task_title"]').selectOption("New Lead Outreach");
    await expect(page.locator("#leadRfqFiles")).toBeHidden();
    await page.locator("#leadSummaryFileInput").setInputFiles({name:"registration-summary.pdf",mimeType:"application/pdf",buffer:pdf});
    await expect(page.locator("#leadSummaryFileList")).toContainText("registration-summary.pdf");
    await capture(page,info,"lead-summary-step3",{fullPage:false});
    let lost=false;const uploads=[],saves=[],rfqUploads=[];
    page.on("request",request=>{
      const path=new URL(request.url()).pathname;
      if(path==="/api/leads" && request.method()==="POST") saves.push(request);
      if(path.startsWith("/api/management-tasks/") && path.includes("/documents/") && request.method()==="POST") rfqUploads.push(request);
    });
    await page.route("**/api/leads/*/summary-documents/*",async route=>{
      if(route.request().method()!=="POST") return route.continue();
      uploads.push(route.request().url());
      if(!lost){lost=true;await route.fetch();return route.fulfill({status:503,json:{error:"Synthetic initial summary response lost"}});}
      return route.continue();
    });
    await page.locator("#leadSubmitButton").click();
    await expect(page.locator("#leadSummaryUploadMessage")).toContainText("Lead already saved");
    await page.locator("#leadSubmitButton").click();await expect(page.locator("#leadDialog")).toBeHidden();
    expect(saves).toHaveLength(1);expect(uploads).toHaveLength(2);expect(uploads[0]).toBe(uploads[1]);
    expect(rfqUploads).toHaveLength(0);
    const tasks=await page.evaluate(()=>api("/api/management-tasks"));
    const matching=tasks.filter(task=>task.lead_name==="Synthetic Summary Registration");expect(matching).toHaveLength(1);
    const task=matching[0];
    await page.goto("/?view=tasks");await page.locator('[data-mg-tab="management"]').click();
    const attachment=page.locator(`[data-mg-row="${task.id}"] [data-task-summary]`);
    await expect(attachment).toContainText("registration-summary.pdf");
    await attachment.getByRole("button",{name:"View",exact:true}).click();
    await expect(page.getByRole("dialog",{name:"Lead summary full-page viewer"}).locator('canvas[data-pdf-rendered="true"]')).toBeVisible();
    await page.keyboard.press("Escape");
    await capture(page,info,"lead-summary-admin-task-attachment",{fullPage:false});
    const metadata=await page.evaluate(id=>api(`/api/leads/${id}/summary-documents`),task.lead_id);
    await page.goto(`/leads/${task.lead_id}?tab=intel`);
    await expect(page.locator("[data-lead-summary]")).toContainText("registration-summary.pdf");
    await sales.reload();await sales.evaluate(()=>openManagementTaskDrawer());
    const salesAttachment=sales.locator(`[data-mg-card="${task.id}"] [data-task-summary]`);
    await expect(salesAttachment).toContainText("registration-summary.pdf");
    const links=await sales.evaluate(id=>api(`/api/management-task-summary-documents?ids=${id}`),task.id);
    expect(links.attachments[0].document.id).toBe(metadata.documents[0].id);
    await salesAttachment.getByRole("button",{name:"View",exact:true}).click();
    await expect(sales.getByRole("dialog",{name:"Lead summary full-page viewer"}).locator('canvas[data-pdf-rendered="true"]')).toBeVisible();
    await sales.keyboard.press("Escape");
    await capture(sales,info,"lead-summary-salesman-task-attachment",{fullPage:false});
    await sales.locator("#managementTasksDrawer").getByRole("button",{name:"Close management tasks"}).click();
    await sales.goto(`/leads/${task.lead_id}?tab=intel`);
    await expect(sales.locator("[data-lead-summary]")).toContainText("registration-summary.pdf");
    await page.goto("/?view=tasks");
    await page.locator("#openLeadForm").click();await page.locator("#leadGoogleLookup").uncheck();
    await page.locator("#leadCompanyName").fill("Synthetic abandoned summary draft");
    await page.locator("#formSalesman").selectOption("Demo Salesman");
    await page.locator("#leadStepNext").click();await page.locator("#leadStepNext").click();
    await page.locator("#leadSummaryFileInput").setInputFiles({name:"abandoned-summary.pdf",mimeType:"application/pdf",buffer:pdf});
    await page.evaluate(()=>showLogin("Synthetic registration reset"));
    await expect(page.locator("#leadDialog")).toBeHidden();
    expect(await page.evaluate(()=>Boolean(rfqLeadUpload.summary))).toBe(false);
  } finally {await context.close();}
});
