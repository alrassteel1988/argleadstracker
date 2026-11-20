const { test, expect } = require("@playwright/test");
const { login, blockExternalTraffic, capture } = require("./helpers");
const { FIXTURE_PASSWORD } = require("./fixture-server");

test("archived tasks stay hidden while the Salesman drawer refresh is delayed", async ({page,browser},info)=>{
  test.skip(!info.project.name.startsWith("admin"),"Both roles in separate sessions");
  test.setTimeout(120000);
  await blockExternalTraffic(page); await login(page,info);
  const context=await browser.newContext({baseURL:info.project.use.baseURL,viewport:info.project.use.viewport,
    isMobile:info.project.use.isMobile,hasTouch:info.project.use.hasTouch,serviceWorkers:"block"});
  let release;
  try {
    const sales=await context.newPage(); await blockExternalTraffic(sales); await login(sales,{project:{name:"salesman"}});
    const fixture=await page.evaluate(()=>api('/api/leads',{method:'POST',body:JSON.stringify({
      company_name:"Lifecycle Drawer Visibility Fixture",assigned_to:"ui-salesman",assigned_salesman:"Demo Salesman",
      territory:"UAE-North",sector:"Fabricator",stage:"NEW",enrichment_source:"manual",
      initial_management_task_title:"New Lead Outreach",notes:"Synthetic task retained during archive and restore."
    })}));
    const leadId=fixture.id, taskId=fixture.initial_management_task_id;
    expect(taskId).toBeTruthy();
    await sales.evaluate(async()=>{await loadLeads(); await loadManagementTasks();});
    await sales.locator("#managementTasksMetric button").click();
    const drawer=sales.locator("#managementTasksDrawer");
    await expect(drawer.locator(`[data-mg-card="${taskId}"]`)).toBeVisible();
    await drawer.getByRole("button",{name:"Close management tasks"}).click();
    await sales.goto(`/leads/${leadId}`);
    await expect(sales.locator("[data-lifecycle-close]")).toBeVisible();
    await expect.poll(()=>sales.evaluate(()=>managementTasks.ready)).toBe(true);
    const gate=new Promise(resolve=>{release=resolve;});
    await sales.route("**/api/management-tasks",async route=>{await gate; await route.continue();});
    await sales.locator("[data-lifecycle-close]").click();
    const close=sales.getByRole("dialog",{name:"Closed - Not Interested",exact:true});
    await close.getByLabel("Close reason").selectOption("No requirement");
    await close.getByRole("button",{name:"Closed - Not Interested",exact:true}).click();
    await expect(sales.locator("#pipelineListPanel")).toBeVisible();
    // Open without navigating/reloading, preserving the cache that exposed the defect.
    await sales.evaluate(()=>openManagementTaskDrawer());
    await expect(drawer).toContainText("Loading management tasks");
    await expect(drawer.locator("[data-mg-card]")).toHaveCount(0);
    await expect(drawer.locator("#managementTasksDrawerCount")).toBeHidden();
    await capture(sales,info,"archived-task-refresh-loading",{fullPage:false});
    release();
    await expect(drawer).toContainText("No management tasks have been assigned to you.");
    const archived=await page.evaluate(()=>api('/api/archived-leads'));
    expect(archived.some(lead=>lead.id===leadId)).toBe(true);
    await page.evaluate(id=>api(`/api/leads/${id}/restore`,{method:'POST',body:JSON.stringify({reason:'Restore synthetic fixture after visibility regression'})}),leadId);
    await drawer.getByRole("button",{name:"Close management tasks"}).click();
    await sales.evaluate(()=>openManagementTaskDrawer());
    await expect(drawer.locator(`[data-mg-card="${taskId}"]`)).toBeVisible();
    await page.evaluate(id=>api(`/api/leads/${id}/archive`,{method:'POST',body:JSON.stringify({reason:'Retain synthetic regression fixture in archive'})}),leadId);
  } finally {release?.(); await context.close();}
});

test("Admin and Salesman archive isolation, duplicate review and restore work on desktop/mobile", async ({page,browser},info)=>{
  test.skip(!info.project.name.startsWith("admin"),"Both roles tested in independent sessions");
  test.setTimeout(120000);
  await blockExternalTraffic(page); await login(page,info);
  const context=await browser.newContext({baseURL:info.project.use.baseURL,viewport:info.project.use.viewport,isMobile:info.project.use.isMobile,hasTouch:info.project.use.hasTouch,serviceWorkers:"block"});
  try {
    const sales=await context.newPage(); await blockExternalTraffic(sales); await login(sales,{project:{name:"salesman"}});
    const request=(target,url,options={})=>target.evaluate(async({url,options})=>{try{return {status:200,body:await api(url,options)};}catch(error){return {status:error.status,message:error.message};}},{url,options});
    await sales.goto("/leads/ui-lead-1");
    await sales.locator("[data-lifecycle-close]").click({timeout:15000});
    const modal=sales.getByRole("dialog",{name:"Closed - Not Interested"});
    await expect(modal).toBeVisible();
    await modal.getByLabel("Close reason").selectOption("Other");
    await modal.getByRole("button",{name:"Close and archive"}).count().then(async count=>{
      // The direct close action uses the same label as its title.
      await modal.getByRole("button",{name:count?"Close and archive":"Closed - Not Interested",exact:true}).click();
    });
    await expect(modal).toBeVisible();
    await modal.getByLabel("Note",{exact:true}).fill("Synthetic do-not-contact fixture");
    await capture(sales,info,"salesman-close-reason");
    await modal.getByRole("button",{name:"Closed - Not Interested",exact:true}).click();
    await expect(modal).toHaveCount(0);
    await expect(sales.locator("#pipelineListPanel")).toBeVisible();
    expect((await request(sales,"/api/leads/ui-lead-1")).status).toBe(404);
    expect((await request(sales,"/api/archived-leads")).status).toBe(403);
    expect((await request(sales,"/api/leads/ui-lead-1",{method:"DELETE",body:JSON.stringify({admin_password:"not-used"})})).status).toBe(403);
    const list=await request(sales,"/api/leads"); expect(list.body.some(row=>row.id==="ui-lead-1")).toBe(false);
    const log=await request(sales,"/api/activities"); expect(log.body.some(row=>row.lead_id==="ui-lead-1" || row.company_id==="ui-lead-1")).toBe(false);
    const bypass=await request(sales,"/api/leads",{method:"POST",body:JSON.stringify({company_name:"Synthetic Steel Company 01 LLC",enrichment_source:"manual",allow_duplicate:true})});
    expect(bypass.status).toBe(409);
    await sales.goto("/?view=pipeline"); await sales.locator("#openLeadForm").click();
    await sales.locator("#leadGoogleLookup").uncheck(); await sales.locator("#leadCompanyName").fill("Synthetic Steel Company 01 LLC");
    await sales.locator("#leadStepNext").click(); await sales.locator("#leadStepNext").click(); await sales.locator("#leadSubmitButton").click();
    const duplicate=sales.getByRole("dialog",{name:"Matching lead found"}); await expect(duplicate).toBeVisible();
    await expect(duplicate).toContainText("Closed - Not Interested");
    await expect(duplicate.getByRole("button",{name:"Create anyway"})).toHaveCount(0);
    await duplicate.getByLabel("Reason / review note").fill("Synthetic Admin review request");
    await capture(sales,info,"salesman-archived-warning"); await duplicate.getByRole("button",{name:"Request Admin Review"}).click();
    await expect(duplicate).toHaveCount(0);
    await page.goto("/?view=archived");
    const archive=page.locator("#archivedLeadsView"); await expect(archive).toContainText("Synthetic Steel Company 01");
    await expect(archive).toContainText("Synthetic Admin review request");
    await capture(page,info,"admin-archived-leads");
    await archive.locator('[data-restore="ui-lead-1"]').click();
    const restore=page.getByRole("dialog",{name:"Restore to Prospect"}); await restore.getByLabel("Reason / review note").fill("Synthetic requirement reopened");
    await restore.getByRole("button",{name:"Restore to Prospect",exact:true}).click();
    await expect(archive.locator('[data-restore="ui-lead-1"]')).toHaveCount(0);
    const restored=await request(sales,"/api/leads/ui-lead-1"); expect(restored.status).toBe(200); expect(restored.body.stage).toBe("NEW");
    expect(restored.body.closed_note).toBe("Synthetic do-not-contact fixture");
    await sales.locator("#leadDialog #closeLeadForm").click().catch(()=>{});
    await sales.goto("/leads/ui-lead-1"); await expect(sales.locator("[data-lifecycle-close]")).toBeVisible();
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth); expect(overflow).toBeLessThanOrEqual(1);
    await sales.goto("/?view=pipeline"); await sales.locator("#openLeadForm").click();
    await sales.locator("#leadGoogleLookup").uncheck(); await sales.locator("#leadCompanyName").fill("Willow Closed Registration Fixture");
    await sales.locator("#leadStepNext").click();
    await sales.locator("#formStage").selectOption("CLOSED_NOT_INTERESTED");
    await sales.locator("#leadStepNext").click(); await sales.locator("#leadSubmitButton").click();
    const closing=sales.getByRole("dialog",{name:"Closed - Not Interested",exact:true});
    await closing.getByLabel("Close reason").selectOption("No requirement");
    const saved=sales.waitForResponse(response=>response.url().endsWith('/api/leads') && response.request().method()==='POST');
    await closing.getByRole("button",{name:"Close and archive",exact:true}).click();
    const response=await saved; expect(response.status(),await response.text()).toBe(201);
    await expect(sales.locator("#leadDialog")).toBeHidden();
    const active=await request(sales,"/api/leads"); expect(active.body.some(row=>row.company_name==="Willow Closed Registration Fixture")).toBe(false);
    const archived=await request(page,"/api/archived-leads"); expect(archived.body.some(row=>row.company_name==="Willow Closed Registration Fixture" && row.closed_by_name==="Demo Salesman")).toBe(true);
  } finally {await context.close();}
});

test("Salesman requests notify management and only Admin can approve removal and restoration",async({page,browser},info)=>{
  test.skip(!info.project.name.startsWith("admin"),"Both roles in separate sessions"); test.setTimeout(120000);
  await blockExternalTraffic(page); await login(page,info);
  const context=await browser.newContext({baseURL:info.project.use.baseURL,viewport:info.project.use.viewport,isMobile:info.project.use.isMobile,hasTouch:info.project.use.hasTouch,serviceWorkers:"block"});
  try {
    const sales=await context.newPage(); await blockExternalTraffic(sales); await login(sales,{project:{name:"salesman"}});
    await sales.goto("/leads/ui-lead-3");
    const original=await sales.evaluate(()=>api('/api/leads/ui-lead-3'));
    await sales.getByRole("button",{name:"Request for Deletion",exact:true}).click();
    const modal=sales.getByRole("dialog",{name:"Request for Deletion",exact:true});
    await modal.getByLabel("Request reason").selectOption("Disqualified");
    await modal.getByLabel("Reason / review note").fill("Synthetic disqualified lead; management approval needed");
    await capture(sales,info,"salesman-deletion-request");
    await modal.getByRole("button",{name:"Send to management"}).click();
    await expect(sales.getByRole("button",{name:"Deletion requested",exact:true})).toBeDisabled();
    expect(await sales.evaluate(()=>api('/api/leads/ui-lead-3'))).toEqual(original);
    const notices=await page.evaluate(()=>api('/api/lead-lifecycle-notices'));
    expect(notices.some(row=>row.message.includes('requested deletion of Synthetic Steel Company 03'))).toBe(true);
    await page.goto("/?view=archived");
    const deletion=page.locator('#archiveRequestQueue article').filter({hasText:'Synthetic Steel Company 03 - Deletion request'});
    await expect(deletion).toBeVisible(); await capture(page,info,"admin-deletion-request-queue");
    await deletion.getByRole('button',{name:'Approve and archive'}).click();
    const approve=page.getByRole('dialog',{name:'Approve and archive',exact:true});
    await approve.getByLabel('Reason / review note').fill('Approved synthetic disqualification');
    await approve.getByRole('button',{name:'Approve and archive',exact:true}).click();
    await expect(deletion).toHaveCount(0);
    const hidden=await sales.evaluate(async()=>{try{await api('/api/leads/ui-lead-3');return 200;}catch(error){return error.status;}}); expect(hidden).toBe(404);
    const denied=await sales.evaluate(async()=>{try{await api('/api/leads/ui-lead-3/restore',{method:'POST',body:JSON.stringify({reason:'Cannot restore directly'})});return 200;}catch(error){return error.status;}}); expect(denied).toBe(403);
    await sales.goto('/?view=pipeline'); await sales.locator('#openLeadForm').click();
    await sales.locator('#leadGoogleLookup').uncheck(); await sales.locator('#leadCompanyName').fill('Synthetic Steel Company 03 LLC');
    await sales.locator('#leadStepNext').click(); await sales.locator('#leadStepNext').click(); await sales.locator('#leadSubmitButton').click();
    const warning=sales.getByRole('dialog',{name:'Matching lead found'}); await expect(warning).toContainText('soft-deleted');
    await expect(warning).toContainText('Disqualified');
    await warning.getByLabel('Reason / review note').fill('Customer now wants steel; please restore the existing lead');
    await warning.getByRole('button',{name:'Request Restore',exact:true}).click(); await expect(warning).toHaveCount(0);
    await page.goto('/?view=archived');
    const restoration=page.locator('#archiveRequestQueue article').filter({hasText:'Restore request'});
    await expect(restoration).toContainText('Customer now wants steel'); await capture(page,info,'admin-restore-request-queue');
    await restoration.getByRole('button',{name:'Restore Synthetic Steel Company 03',exact:true}).click();
    const restoring=page.getByRole('dialog',{name:'Restore Synthetic Steel Company 03',exact:true});
    await restoring.getByLabel('Reason / review note').fill('Approved renewed steel requirement');
    await restoring.getByRole('button',{name:'Restore Synthetic Steel Company 03',exact:true}).click();
    await expect(restoration).toHaveCount(0);
    const reopened=await sales.evaluate(()=>api('/api/leads/ui-lead-3'));
    expect(reopened.stage).toBe('NEW'); expect(reopened.activities).toEqual(original.activities);
  } finally {await context.close();}
});

test("Admin permanent deletion requires an archived lead, exact company name and password",async({page},info)=>{
  test.skip(!info.project.name.startsWith("admin"),"Admin-only confirmation workflow");
  await blockExternalTraffic(page); await login(page,info);
  await page.goto("/leads/ui-lead-2"); await page.locator("[data-lifecycle-archive]").click();
  const archiving=page.getByRole("dialog",{name:"Archive lead",exact:true});
  await archiving.getByLabel("Reason / review note").fill("Synthetic duplicate entry for deletion test");
  await archiving.getByRole("button",{name:"Archive lead",exact:true}).click();
  const archive=page.locator("#archivedLeadsView");
  await archive.locator('[data-purge="ui-lead-2"]').click();
  const modal=page.getByRole("dialog",{name:"Delete permanently",exact:true});
  await modal.getByLabel("Reason / review note").fill("Remove synthetic duplicate");
  await modal.getByLabel("Type Synthetic Steel Company 02 to confirm").fill("Wrong company");
  await modal.getByLabel("Admin password",{exact:true}).fill(FIXTURE_PASSWORD);
  await modal.getByRole("button",{name:"Delete permanently",exact:true}).click();
  await expect(modal).toBeVisible();
  await modal.getByLabel("Type Synthetic Steel Company 02 to confirm").fill("Synthetic Steel Company 02");
  await capture(page,info,"admin-permanent-delete-confirmation");
  await modal.getByRole("button",{name:"Delete permanently",exact:true}).click();
  await expect(archive.locator('[data-purge="ui-lead-2"]')).toHaveCount(0);
  const rows=await page.evaluate(()=>api('/api/leads/ui-lead-2/lifecycle-audit'));
  expect(rows.some(row=>row.action==="purge" && row.reason==="Remove synthetic duplicate")).toBe(true);
});
