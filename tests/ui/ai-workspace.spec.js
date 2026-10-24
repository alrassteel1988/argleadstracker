const {test, expect} = require("@playwright/test");
const {login, capture, blockExternalTraffic} = require("./helpers");
const {inspectPresentation} = require("./presentation-audit");

test.beforeEach(async ({page}) => blockExternalTraffic(page));

test("AI workspace routes reuse authorized company and portfolio actions", async ({page}, info) => {
  test.setTimeout(120000);
  const role = await login(page, info);
  const actionRequests = [];
  page.on("request", request => {
    if (request.method() === "POST" && /\/api\/(?:salesperson-ai-actions|leads\/[^/]+\/ai-actions)$/.test(new URL(request.url()).pathname)) actionRequests.push(request.postDataJSON());
  });
  if (await page.locator("#mobileMenuToggle").isVisible()) await page.locator("#mobileMenuToggle").click();
  await page.locator('#mobileSidebar [data-view="ai-actions"]').click();
  await expect(page).toHaveURL(/view=ai-actions/);
  await expect(page.locator("#aiWorkspaceView")).toBeVisible();
  await expect(page.locator("#overdueBanner")).toBeHidden();
  await expect(page.locator("#aiWorkspaceCompany option")).toHaveCount((role === "admin" ? 18 : 12) + 1);
  await expect(page.locator("[data-workspace-portfolio-action]")).toHaveCount(role === "salesman" ? 4 : 0);
  expect(actionRequests.filter(item => item.action !== "pipeline_health")).toEqual([]);
  const prepare = page.locator('[data-workspace-company-action="prepare"]');
  await expect(prepare).toBeDisabled();
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

  await page.goto("/?view=draft-email");
  await expect(page.locator("#aiWorkspaceCompany option[value='ui-lead-1']")).toHaveCount(1);
  await expect(page.locator("[data-workspace-company-action]")).toHaveCount(1);
  await page.locator("#aiWorkspaceCompany").selectOption("ui-lead-1");
  await page.locator('[data-workspace-company-action="email"]').click();
  await expect(page.locator("#aiActionDialog")).toContainText("CRM-data fallback was used.");
  await expect(page.locator("[data-ai-mailto]")).toBeVisible();
  expect(actionRequests.filter(item => item.action !== "pipeline_health").at(-1)).toEqual({action:"email"});
  await page.locator("#aiActionDialog").press("Escape");

  await page.goto("/?view=meeting-prep");
  await expect(page.locator('[data-workspace-company-action="prepare"]')).toBeVisible();
  await expect(page.locator('#mobileSidebar [data-view="ai-actions"]')).toHaveClass(/active/);
  if (role === "salesman") {
    for (const [view, action] of [["focus", "focus_today"], ["neglected", "neglected"]]) {
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

test("Neglected accounts uses scoped cadence data and responsive existing actions", async ({page}, info) => {
  const role = await login(page, info);
  let metrics = null;
  if (role === 'salesman') await page.route('**/api/salesperson-ai-actions', async route => {
    if (route.request().postDataJSON()?.action !== 'pipeline_health') return route.continue();
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    metrics = (await response.json()).metrics;
    await route.fulfill({response});
  });
  await page.goto("/?view=neglected");
  if (role === "admin") {
    await expect(page.locator('.crm-neglected-panel')).toHaveCount(0);
    return;
  }
  await expect(page.locator('.crm-neglected-table tbody tr').first()).toBeVisible();
  await expect.poll(() => metrics).not.toBeNull();
  await expect(page.locator('.crm-neglected-table tbody tr')).toHaveCount(metrics.contact_overdue_companies.length);
  await expect(page.locator('.crm-neglected-stats article')).toHaveCount(3);
  await expect(page.locator('.crm-neglected-panel')).not.toContainText('Company 13');
  await expect(page.locator('.crm-neglected-panel')).not.toContainText('Sampling');
  await expect(page.locator('.crm-neglected-toolbar')).not.toContainText('Export');
  if (!info.project.name.endsWith('mobile')) {
    const panel = await page.locator('.crm-neglected-panel').boundingBox();
    expect(panel.y + panel.height).toBeLessThan(page.viewportSize().height - 80);
  }
  if (info.project.name.endsWith('mobile')) {
    await expect(page.locator('#appShell .topbar-actions')).toBeHidden();
    await page.locator('[data-neglected-tools]').click();
    await expect(page.locator('#openPlacesSearch')).toBeVisible();
    await expect(page.locator('#openLeadForm')).toBeVisible();
    await expect(page.locator('#aiAssistantLauncher')).toBeVisible();
    await expect(page.locator('#aiAssistantLauncher')).toHaveCSS('position', 'static');
    await page.locator('[data-neglected-tools]').click();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  expect(await page.evaluate(inspectPresentation, {checkTouchTargets:true})).toEqual([]);
  await capture(page, info, '72-neglected-reference', {fullPage:false});
  await page.locator('[data-neglected-log]').first().click();
  await expect(page.locator('#activityDialog')).toBeVisible();
  await expect(page.locator('#activityLeadName')).toContainText('Synthetic Steel Company');
  await page.locator('#closeActivityDialog').click();
  if (!info.project.name.endsWith('mobile')) {
    await page.locator('[data-neglected-task]').first().click();
    await expect(page.locator('#leadDetailView')).toBeVisible();
    await expect(page.locator('[data-drawer-tab="reminders"]')).toHaveClass(/active/);
    await page.goto('/?view=neglected');
  }
  await page.locator('.crm-neglected-toolbar [data-workspace-view="focus"]').click();
  await expect(page.locator('.crm-today-layout')).toBeVisible();
});

test('Neglected accounts reports request errors, retries and honest empty results', async ({page}, info) => {
  const role = await login(page, info);
  if (role !== 'salesman') return;
  let mode = 'error';
  await page.route('**/api/salesperson-ai-actions', async route => {
    if (route.request().postDataJSON()?.action !== 'pipeline_health') return route.continue();
    if (mode === 'error') return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Synthetic contact service unavailable'})});
    if (mode === 'empty') return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({metrics:{contact_overdue_companies:[]}})});
    return route.continue();
  });
  await page.goto('/?view=neglected');
  await expect(page.locator('.crm-neglected-panel [role="alert"]')).toContainText('Synthetic contact service unavailable');
  await expect(page.locator('.crm-neglected-stats article').first().locator('strong')).toHaveText('—');
  mode = 'success';
  await page.locator('[data-neglected-retry]').click();
  await expect(page.locator('.crm-neglected-table tbody tr').first()).toBeVisible();
  mode = 'empty';
  await page.reload();
  await expect(page.locator('.crm-neglected-state')).toHaveText('No accounts are past their expected contact frequency.');
  await expect(page.locator('.crm-neglected-stats article').first().locator('strong')).toHaveText('0');
});
