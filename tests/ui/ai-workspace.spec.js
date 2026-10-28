const {test, expect} = require("@playwright/test");
const {login, capture, blockExternalTraffic} = require("./helpers");
const {inspectPresentation} = require("./presentation-audit");

test.beforeEach(async ({page}) => blockExternalTraffic(page));

test("Neglected follow-up activity rows are responsive and management is read-only", async ({page}, info) => {
  const role = await login(page, info);
  await page.route("**/api/leads", async route => {
    const response = await route.fetch();
    const leads = await response.json();
    if (leads.length) leads[0].activities = [
      {id:"demo-one", type:"Phone Call", next_action_date:"2020-01-01", version:1},
      {id:"demo-two", type:"Email", next_action_date:"2020-01-02", transaction_status:"closed", transaction_remarks:"Synthetic remark", transaction_outcome:"Done - spoke to customer"}
    ];
    await route.fulfill({response, json:leads});
  });
  await page.goto("/?view=neglected");
  await expect(page.locator(".neglected-v2-row")).toHaveCount(2);
  await expect(page.locator(".neglected-v2-stats")).toContainText("1 / 2");
  if (role === "salesman") {
    await expect(page.locator("[data-neglected-export]")).toHaveCount(0);
    expect(await page.evaluate(async () => (await authenticatedFetch("/api/management/overdue-activities.csv")).status)).toBe(403);
    await page.locator("[data-neglected-edit]").first().click();
    await expect(page.locator("[data-neglected-save]")).toBeDisabled();
    await page.locator("[data-neglected-form] select").selectOption("Will try again");
    await page.locator("[data-neglected-form] textarea").fill("Synthetic follow-up");
    await expect(page.locator("[data-neglected-save]")).toBeDisabled();
    await page.locator("[data-neglected-form] input[type=date]").fill("2026-11-01");
    await expect(page.locator("[data-neglected-save]")).toBeEnabled();
  } else {
    await expect(page.locator("[data-neglected-export]")).toBeVisible();
    await expect(page.locator("[data-neglected-edit]")).toHaveCount(0);
    expect(await page.evaluate(async () => (await authenticatedFetch("/api/leads/ui-lead-1/activities/demo-one/transaction", {method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({})})).status)).toBe(403);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await capture(page, info, "neglected-activity-review", {fullPage:true});
});

test("Neglected follow-up update persists in the isolated local database", async ({page}, info) => {
  const role = await login(page, info);
  test.skip(role !== "salesman", "Only assigned salesmen may update transactions.");
  const lead = await page.evaluate(async () => (await api("/api/leads"))[0]);
  const created = await page.evaluate(async leadId => api(`/api/leads/${encodeURIComponent(leadId)}/activities`, {
    method: "POST", body: JSON.stringify({type:"Reminder", reminder:true, due_date:"2020-01-01", activity_required:"Synthetic follow-up"})
  }), lead.id);
  await page.goto("/?view=neglected");
  // Reminder type and due date identify the synthetic record even when the text is not shown.
  const target = page.locator(".neglected-v2-row").filter({hasText:"2020-01-01"}).first();
  await expect(target).toBeVisible();
  await target.locator("[data-neglected-edit]").click();
  const form = page.locator("[data-neglected-form]");
  await form.locator("select").selectOption("Will try again");
  await form.locator("textarea").fill("Synthetic saved remark");
  await form.locator("input[type=date]").fill("2026-11-01");
  await form.locator("[data-neglected-save]").click();
  await expect(target).toContainText("Synthetic saved remark");
  await page.reload();
  await expect(page.locator(".neglected-v2-row").filter({hasText:"2020-01-01"}).first()).toContainText("Synthetic saved remark");
  const persisted = await page.evaluate(async leadId => (await api("/api/leads")).find(item => item.id === leadId), lead.id);
  expect(persisted.activities.find(item => item.id === created.activity.id).transaction_remarks).toBe("Synthetic saved remark");
});

test("Neglected activity loading errors, retry, empty results and responsive actions", async ({page}, info) => {
  const role = await login(page, info);
  await page.goto("/?view=neglected");
  await expect(page.locator(".neglected-v2-list")).toBeVisible();
  let mode = "error";
  await page.route("**/api/leads", async route => {
    if (route.request().method() !== "GET") return route.continue();
    if (mode === "error") return route.fulfill({status:503, json:{error:"Synthetic lead service unavailable"}});
    const response = await route.fetch();
    const leads = await response.json();
    if (mode === "empty") leads.forEach(lead => { lead.activities = []; });
    else if (leads.length) leads[0].activities = [{id:"demo-retry", type:"Phone Call", next_action_date:"2020-01-01"}];
    await route.fulfill({response, json:leads});
  });
  await page.evaluate(async () => { state.leadsLoaded = false; state.leads = []; try { await loadLeads(); } catch {} renderAiWorkspace(); });
  await expect(page.locator('.neglected-v2-list [role="alert"]')).toContainText("Synthetic lead service unavailable");
  mode = "success";
  await page.locator("[data-neglected-retry]").click();
  await expect(page.locator(".neglected-v2-row")).toHaveCount(1);
  await expect(page.locator(".neglected-v2-row")).not.toContainText("Company 13");
  await expect(page.locator('#mobileSidebar [data-view="neglected"]')).toHaveClass(/active/);
  if (info.project.name.endsWith("mobile")) {
    await page.setViewportSize({width:320,height:812});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  }
  if (role === "salesman") {
    await expect(page.locator("[data-neglected-task]")).toBeVisible();
    await expect(page.locator('.neglected-v2-actions a[href^="tel:"]')).toHaveCount(1);
    await page.locator("[data-neglected-task]").click();
    await expect(page.locator("#leadDetailView")).toBeVisible();
    await expect(page.locator('[data-drawer-tab="reminders"]')).toHaveClass(/active/);
    await page.goto("/?view=neglected");
  }
  await expect(page.locator("#aiAssistantLauncher")).toBeVisible();
  await expect(page.locator("#aiAssistantLauncher")).toHaveCSS("position", "static");
  await page.locator(".neglected-v2-back").click();
  await expect(page.locator("#dashboardView")).toBeVisible();
  mode = "empty";
  await page.goto("/?view=neglected");
  await expect(page.locator(".neglected-v2-empty")).toContainText("No overdue activities");
  await expect(page.locator(".neglected-v2-stats article").first().locator("strong")).toHaveText("0");
});

test("Draft Email downloads an editable MIME draft with the exact protected profile", async ({page}, info) => {
  test.setTimeout(120000);
  const fs = require("node:fs");
  const path = require("node:path");
  const role = await login(page, info);
  const writes = [];
  page.on("request", request => {
    if (new URL(request.url()).pathname === "/api/salesperson-ai-actions" && request.postDataJSON()?.action === "pipeline_health") return;
    if (["POST", "PATCH", "PUT", "DELETE"].includes(request.method()) && /\/api\//.test(request.url())) writes.push(new URL(request.url()).pathname);
  });
  await page.goto("/?view=draft-email");
  await expect(page.locator("[data-email-download]")).toBeDisabled();
  await page.locator("#aiWorkspaceCompany").selectOption("ui-lead-1");
  expect(writes).toEqual([]);
  await page.locator("[data-email-generate]").click();
  await expect(page.locator("#emailDraftBody")).not.toHaveValue("");
  await expect(page.locator(".email-provenance")).toContainText("CRM draft");
  if (info.project.name.endsWith("mobile")) await capture(page, info, "75-email-mobile-reference", {fullPage:false});
  await page.locator("[data-email-cc]").click();
  await page.locator("#emailDraftCc").fill("copied@example.test");
  await page.locator("#emailDraftSubject").fill("Edited steel enquiry");
  await page.locator("#emailDraftBody").fill("Dear Procurement,\n\nEdited enquiry for RHS.\n\nRegards,\nDemo");
  await page.locator('[data-email-tone="friendly"]').click();
  await expect(page.locator("#emailDraftBody")).toHaveValue(/Hello Procurement,[\s\S]*Best regards,/);
  page.once("dialog", dialog => dialog.dismiss());
  await page.locator("[data-email-generate]").click();
  await expect(page.locator("#emailDraftSubject")).toHaveValue("Edited steel enquiry");
  if (info.project.name.endsWith("mobile")) {
    await expect(page.locator(".email-mobile-back")).toBeVisible();
    await expect(page.locator("#aiWorkspaceHeading")).toHaveCSS("font-size", "21px");
    await expect(page.locator(".email-mobile-source")).toContainText("CRM draft");
    await expect(page.locator(".email-editor footer")).toHaveCSS("position", "fixed");
    await expect(page.locator("[data-email-copy]")).toHaveCSS("position", "fixed");
    expect((await page.locator("[data-email-generate]").boundingBox()).width).toBe(44);
    const tones = await page.locator(".email-tones").boundingBox();
    const editor = await page.locator(".email-editor").boundingBox();
    expect(tones.y + tones.height).toBeLessThan(editor.y);
    await expect(page.locator(".email-attached [data-email-profile]")).toHaveCount(1);
    await expect(page.locator(".email-delivery-details")).not.toHaveAttribute("open");
    const copy = await page.locator("[data-email-copy]").boundingBox();
    const download = await page.locator("[data-email-download]").boundingBox();
    expect(copy.height).toBe(48);
    expect(download.height).toBe(48);
    expect(copy.x + copy.width).toBeLessThan(download.x);
    expect(download.y + download.height).toBeLessThanOrEqual(page.viewportSize().height);
    await expect(page.locator(".email-assistant-host")).toBeHidden();
    await page.locator(".email-delivery-details summary").scrollIntoViewIfNeeded();
    const lastControl = await page.locator(".email-delivery-details summary").boundingBox();
    const footer = await page.locator(".email-editor footer").boundingBox();
    expect(lastControl.y + lastControl.height).toBeLessThanOrEqual(footer.y);
    await page.evaluate(() => window.scrollTo(0, 0));
    // Reparenting at breakpoints must preserve a single set of live form controls.
    const originalSize = page.viewportSize();
    await page.setViewportSize({width:1440, height:900});
    await expect(page.locator(".email-adjust-fieldset .email-tones")).toHaveCount(1);
    await expect(page.locator(".email-adjust-fieldset [data-email-profile]")).toHaveCount(1);
    await expect(page.locator("#emailDraftSubject")).toHaveValue("Edited steel enquiry");
    await page.setViewportSize(originalSize);
    await expect(page.locator(".email-mobile-tone-host .email-tones")).toHaveCount(1);
    await expect(page.locator(".email-attached [data-email-profile]")).toHaveCount(1);
    await expect(page.locator(".email-editor footer")).toHaveCSS("position", "fixed");
  } else {
    await expect(page.locator(".email-mobile-back")).toBeHidden();
    await expect(page.locator(".email-adjust-fieldset .email-tones")).toHaveCount(1);
    await expect(page.locator(".email-editor footer")).toHaveCSS("position", "static");
  }
  await capture(page, info, "75-draft-email", {fullPage:true});
  await page.route("**/api/leads/ui-lead-1/ai-actions", route => route.fulfill({status:503, contentType:"application/json", body:JSON.stringify({error:"Synthetic provider unavailable"})}));
  page.once("dialog", dialog => dialog.accept());
  await page.locator("[data-email-generate]").click();
  await expect(page.locator(".email-status")).toContainText("Synthetic provider unavailable");
  await expect(page.locator("#emailDraftSubject")).toHaveValue("Edited steel enquiry");
  await page.unroute("**/api/leads/ui-lead-1/ai-actions");
  await page.route("**/email-profile?part=0", route => route.fulfill({status:503, body:"unavailable"}));
  await page.locator("[data-email-download]").click();
  await expect(page.locator(".email-status")).toContainText("no draft was downloaded");
  await expect(page.locator("#emailDraftBody")).toHaveValue(/Edited enquiry for RHS/);
  await page.unroute("**/email-profile?part=0");
  await expect(page.locator(".topbar")).toBeHidden();
  expect((await page.locator("#emailDraftBody").boundingBox()).height).toBeGreaterThanOrEqual(info.project.name.endsWith("mobile") ? 300 : 350);
  await expect(page.locator(".email-assistant-host #aiAssistantLauncher")).toHaveCSS("position", "static");
  if (info.project.name.endsWith("mobile")) await expect(page.locator("#mobileTabs")).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  const downloadWait = page.waitForEvent("download");
  await page.locator("[data-email-download]").click();
  const download = await downloadWait;
  expect(download.suggestedFilename()).toMatch(/\.eml$/);
  const mime = fs.readFileSync(await download.path(), "utf8");
  expect(mime).toContain("X-Unsent: 1\r\n");
  expect(mime).toContain("Cc: copied@example.test\r\n");
  const attachment = mime.split('filename="Al Ras Group - Company Profile.pdf"')[1].split("\r\n\r\n")[1].split("\r\n--")[0];
  expect(Buffer.from(attachment.replace(/\s/g, ""), "base64")).toEqual(fs.readFileSync(path.join(__dirname, "../../assets/email/Al Ras Group - Company Profile.pdf")));
  await expect(page.locator("[data-email-download]")).toBeEnabled();
  expect(writes.filter(url => !url.endsWith("/ai-actions"))).toEqual([]);
  const denied = await page.evaluate(async id => {
    const response = await authenticatedFetch(`/api/leads/${id}/email-profile?part=0`);
    return response.status;
  }, role === "salesman" ? "ui-lead-13" : "not-a-visible-lead");
  expect(denied).toBe(404);
  // Anonymous requests cannot retrieve the profile even with a visible-looking lead ID.
  expect((await page.request.get("/api/leads/ui-lead-1/email-profile?part=0")).status()).toBe(401);
  await page.locator("[data-email-profile]").uncheck();
  const plainWait = page.waitForEvent("download");
  await page.locator("[data-email-download]").click();
  const plain = await plainWait;
  expect(fs.readFileSync(await plain.path(), "utf8")).not.toContain("application/pdf");
  await page.locator("[data-email-change]").click();
  page.once("dialog", dialog => dialog.accept());
  await page.locator("#aiWorkspaceCompany").selectOption("ui-lead-2");
  await expect(page.locator("#emailDraftBody")).toHaveValue("");
  await expect(page.locator("#emailDraftTo")).toHaveValue("contact-2@example.test");
});

test("AI workspace routes reuse authorized company and portfolio actions", async ({page}, info) => {
  test.setTimeout(120000);
  const role = await login(page, info);
  const actionRequests = [];
  const assistantRequests = [];
  page.on("request", request => {
    if (request.method() === 'POST' && request.url().includes('/api/ai-assistant/')) assistantRequests.push(request.url());
    if (request.method() === "POST" && /\/api\/(?:salesperson-ai-actions|leads\/[^/]+\/ai-actions)$/.test(new URL(request.url()).pathname)) actionRequests.push(request.postDataJSON());
  });
  if (role === "salesman") {
    await page.locator(info.project.name.endsWith("mobile") ? '#mobileTabs [data-view="ai-actions"]' : '[data-dashboard-ai-all]').click();
  } else {
    if (await page.locator("#mobileMenuToggle").isVisible()) await page.locator("#mobileMenuToggle").click();
    await page.locator('#mobileSidebar [data-view="ai-actions"]').click();
  }
  await expect(page).toHaveURL(/view=ai-actions/);
  await expect(page.locator("#aiWorkspaceView")).toBeVisible();
  await expect(page.locator("#overdueBanner")).toBeHidden();
  await expect(page.locator("#aiWorkspaceCompany option")).toHaveCount((role === "admin" ? 18 : 12) + 1);
  await expect(page.locator("[data-workspace-portfolio-action]")).toHaveCount(role === "salesman" ? 4 : 0);
  expect(actionRequests.filter(item => item.action !== "pipeline_health")).toEqual([]);
  const prepare = page.locator('[data-workspace-company-action="prepare"]');
  await expect(prepare).toBeDisabled();
  await expect(page.locator('.crm-onetap-heading')).toContainText('One-tap AI actions');
  if (!info.project.name.endsWith('mobile')) await expect(page.locator('.topbar')).toBeHidden();
  await expect(page.locator('.crm-onetap-company-grid > button')).toHaveCount(5);
  await expect(page.locator('.crm-onetap-assistant #aiAssistantLauncher')).toHaveCSS('position', 'static');
  await expect(page.locator('[data-workspace-pick]')).toHaveCount(3);
  if (info.project.name.endsWith('mobile')) {
    await expect(page.locator('.crm-onetap-back')).toBeVisible();
    await expect(page.locator('#mobileTabs')).toBeHidden();
    await expect(page.locator('.crm-onetap-assistant')).toHaveCSS('position', 'fixed');
    const footer = await page.locator('.crm-onetap-assistant').boundingBox();
    expect(footer.y + footer.height).toBeLessThanOrEqual(page.viewportSize().height + 1);
    if (role === 'salesman') {
      const row = await page.locator('.crm-onetap-day-grid button').first().boundingBox();
      expect(row.height).toBeLessThanOrEqual(80);
    }
  }
  await capture(page, info, '70-ai-workspace-unselected', {fullPage:true});
  await page.locator('[data-workspace-pick="ui-lead-1"]').click();
  await expect(page.locator('#aiWorkspaceCompany')).toHaveValue('ui-lead-1');
  await expect(page.locator('#aiWorkspaceCompany')).toBeFocused();
  expect(actionRequests.filter(item => item.action !== "pipeline_health")).toEqual([]);
  await page.locator("#aiWorkspaceCompany").selectOption("ui-lead-1");
  await expect(prepare).toBeEnabled();
  await expect(page.locator(".crm-ai-workspace-status")).toHaveText("Company actions are ready.");
  expect(await page.evaluate(inspectPresentation, {checkTouchTargets:true})).toEqual([]);
  await capture(page, info, "70-ai-workspace", {fullPage:false});
  await prepare.click();
  await expect(page.locator("#aiActionDialog")).toContainText("CRM-data fallback was used.");
  expect(actionRequests.filter(item => item.action !== "pipeline_health").at(-1)).toEqual({action:"prepare"});
  await page.locator("#aiActionDialog").press("Escape");
  await expect(prepare).toBeFocused();
  if (info.project.name.endsWith('mobile')) {
    const lastAction = page.locator('[data-workspace-company-action="flag"]');
    await lastAction.scrollIntoViewIfNeeded();
    const lastBox = await lastAction.boundingBox();
    const footer = await page.locator('.crm-onetap-assistant').boundingBox();
    expect(lastBox.y + lastBox.height).toBeLessThanOrEqual(footer.y);
  }
  await page.locator('#aiWorkspaceCompany').selectOption('');
  await expect(prepare).toBeDisabled();
  if (info.project.name.endsWith('mobile')) {
    await page.locator('.crm-onetap-assistant-input').fill('Summarise my visible accounts');
    await page.locator('.crm-onetap-assistant-input').press('Enter');
  } else await page.locator('.crm-onetap-assistant #aiAssistantLauncher').click();
  await expect(page.locator('#aiAssistantDialog')).toBeVisible();
  if (info.project.name.endsWith('mobile')) await expect(page.locator('#aiAssistantCommand')).toHaveValue('Summarise my visible accounts');
  expect(assistantRequests).toEqual([]);
  await page.locator('#closeAiAssistant').click();
  if (info.project.name.endsWith('mobile')) {
    await page.locator('.crm-onetap-back').click();
    await expect(page.locator('#dashboardView')).toBeVisible();
    await expect(page.locator('#mobileTabs')).toBeVisible();
  }

  await page.goto("/?view=draft-email");
  await expect(page.locator("#aiWorkspaceCompany option[value='ui-lead-1']")).toHaveCount(1);
  await expect(page.locator("[data-email-generate]")).toBeDisabled();
  await page.locator("#aiWorkspaceCompany").selectOption("ui-lead-1");
  await page.locator('[data-email-generate]').click();
  await expect(page.locator(".email-provenance")).toContainText("CRM-data fallback was used.");
  await expect(page.locator("[data-email-download]")).toBeEnabled();
  expect(actionRequests.filter(item => item.action !== "pipeline_health").at(-1)).toEqual({action:"email"});
  await page.goto("/?view=meeting-prep");
  await expect(page.locator('[data-meeting-generate]')).toBeVisible();
  await expect(page.locator(`#mobileSidebar [data-view="${role === "salesman" ? "dashboard" : "ai-actions"}"]`)).toHaveClass(/active/);
  if (role === "salesman") {
    for (const [view, action] of [["focus", "focus_today"]]) {
      await page.goto(`/?view=${view}`);
      if (view === "focus") await page.locator(".crm-today-more summary").click();
      const button = page.locator(`[data-workspace-portfolio-action="${action}"]`);
      await expect(button).toBeEnabled();
      await button.click();
      await expect(page.locator("#aiActionDialog")).toContainText("CRM-data fallback was used.");
      expect(actionRequests.filter(item => item.action !== "pipeline_health").at(-1)).toEqual({action});
      await page.locator("#aiActionDialog").press("Escape");
      await capture(page, info, `70-${view}`, {fullPage:false});
    }
  } else {
    await page.goto("/?view=neglected");
    await expect(page.locator("#aiWorkspaceView")).toBeVisible();
    await expect(page.locator("[data-workspace-portfolio-action]")).toHaveCount(0);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

test("Today uses existing follow-ups, contact actions, summaries and quick actions", async ({page}, info) => {
  test.setTimeout(120000);
  const role = await login(page, info);
  await page.goto("/?view=focus");
  if (role === "admin") {
    await expect(page.locator("#topbarPageTitle")).toHaveText("One-tap AI actions");
    await expect(page.locator(".crm-today-layout")).toHaveCount(0);
    return;
  }
  await expect(page.locator("#topbarPageTitle")).toHaveText("Today");
  await expect(page.locator("#aiAssistantLauncher")).toHaveCSS("position", "static");
  expect(await page.locator("#aiAssistantLauncher").evaluate(element => Boolean(element.closest(".topbar")))).toBe(true);
  await expect(page.locator("#topbarContext")).toContainText("6 follow-ups");
  await expect(page.locator(".crm-today-call-row")).toHaveCount(4);
  await expect(page.locator(".crm-today-company-link").first()).toHaveCSS("border-top-width", "0px");
  await expect(page.locator("button.crm-today-stage").first()).toHaveCSS("border-top-width", "0px");
  await expect(page.locator('[data-today-action="add"]')).toHaveCSS("align-items", "center");
  await expect(page.locator(".crm-today-stage")).toHaveCount(6);
  await expect(page.locator(".crm-today-layout")).not.toContainText("Sampling");
  await expect(page.locator(".crm-today-note")).toContainText("Block status setup is pending");
  await expect(page.locator(".crm-today-layout")).not.toContainText("Company 13");
  await expect(page.locator(".crm-today-call-row").first().locator(".crm-today-email")).toHaveAttribute("href", "mailto:contact-1%40example.test");
  await expect(page.locator(".crm-today-call-row").first().locator(".crm-today-call")).toHaveAttribute("href", "tel:+12025550101");
  await expect(page.locator(".crm-today-call-row").nth(1).locator(".crm-today-call")).toBeDisabled();
  const layout = await page.locator(".crm-today-layout").evaluate(root => {
    const calls = root.querySelector(".crm-today-calls").getBoundingClientRect();
    const side = root.querySelector(".crm-today-side").getBoundingClientRect();
    return {calls:calls.toJSON(), side:side.toJSON()};
  });
  if (info.project.name.endsWith("mobile")) expect(layout.side.top).toBeGreaterThanOrEqual(layout.calls.bottom);
  else expect(layout.side.left).toBeGreaterThan(layout.calls.right);
  expect(await page.evaluate(inspectPresentation, {checkTouchTargets:true})).toEqual([]);
  await capture(page, info, "71-today-reference", {fullPage:false});
  await page.locator('[data-today-summary="salesmanScheduled"]').click();
  await expect(page.locator("#summaryCardDetailsTitle")).toContainText("Call Next");
  await expect(page.locator("#summaryCardDetailsCount")).toContainText("6");
  await page.locator("#summaryCardDetailsDialog").press("Escape");
  await page.locator('[data-today-summary="salesmanStageContacted"]').click();
  await expect(page.locator("#summaryCardDetailsTitle")).toContainText("Outreach");
  await page.locator("#summaryCardDetailsDialog").press("Escape");
  await page.locator('[data-today-action="add"]').click();
  await expect(page.locator("#leadDialog")).toBeVisible();
  await page.locator("#closeLeadForm").click();
  await page.locator('[data-today-action="places"]').click();
  await expect(page.locator("#placesDialog")).toBeVisible();
  await page.locator("#closePlacesSearch").click();
  await page.locator('[data-today-lead="ui-lead-1"]').click();
  await expect(page.locator("#leadDetailView")).toBeVisible();
  await page.goto("/?view=focus");
  await page.locator('[data-today-action="report"]').click();
  await expect(page.locator("#tasksView")).toBeVisible();
});
