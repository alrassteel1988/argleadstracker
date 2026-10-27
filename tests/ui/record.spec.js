const { test, expect } = require("@playwright/test");
const { capture, login, blockExternalTraffic } = require("./helpers");
const { inspectPresentation } = require("./presentation-audit");

test.beforeEach(async ({ page }) => blockExternalTraffic(page));

test("Overview keeps organized company details without duplicate AI panels", async ({page}, info) => {
  await login(page,info);
  await page.goto('/leads/ui-lead-1/overview');
  const details = page.locator('.record-supporting-details');
  await expect(page.locator('#leadAiSummaryPagePanel')).toBeHidden();
  await expect(page.locator('#leadAiSummaryPageContent')).toBeEmpty();
  await expect(page.locator('.record-more-actions')).toHaveCount(0);
  await expect(page.locator(info.project.name.endsWith('mobile') ? '.record-mobile-ai' : '.record-overview-ai')).toBeVisible();
  const commercial = details.locator('.drawer-overview-panel--commercial');
  const company = details.locator('.drawer-overview-panel--company');
  const secondary = details.locator('.drawer-overview-panel--secondary');
  const linkedin = details.locator('.record-linkedin');
  for (const section of [commercial,company,secondary,linkedin]) await expect(section).toBeVisible();
  await expect(commercial).toContainText('Rebar');
  await expect(company).toContainText('Legal name');
  await expect(secondary).toContainText('Secondary phone');
  const left = await commercial.boundingBox();
  const right = await company.boundingBox();
  if (info.project.name.endsWith('mobile')) {
    expect(right.y).toBeGreaterThanOrEqual(left.y + left.height);
    expect(Math.abs(right.x-left.x)).toBeLessThan(2);
  } else {
    expect(right.x).toBeGreaterThan(left.x + left.width);
    expect(Math.abs(right.y-left.y)).toBeLessThan(2);
    const sidebar = await page.locator('#mobileSidebar').boundingBox();
    const shell = await page.locator('#appShell').boundingBox();
    expect(Math.abs(sidebar.y + sidebar.height - (shell.y + shell.height))).toBeLessThan(2);
    const contact = await secondary.boundingBox();
    const search = await linkedin.boundingBox();
    expect(Math.abs(contact.y-search.y)).toBeLessThan(2);
  }
  const assistant = await page.locator('.record-overview-assistant').boundingBox();
  if (!info.project.name.endsWith('mobile')) expect(assistant.y).toBeGreaterThanOrEqual((await details.boundingBox()).y + (await details.boundingBox()).height);
  expect(await page.evaluate(inspectPresentation,{checkTouchTargets:true})).toEqual([]);
  await capture(page,info,'21-overview-organized-details',{fullPage:true});
  await page.evaluate(() => { window.__linkedinSearches = []; window.open = url => { window.__linkedinSearches.push(url); return null; }; });
  await linkedin.getByRole('combobox').selectOption({label:'Project Manager'});
  await linkedin.getByRole('button',{name:'Find contact on LinkedIn'}).click();
  await expect.poll(() => page.evaluate(() => window.__linkedinSearches.length)).toBe(1);
  const url = new URL(await page.evaluate(() => window.__linkedinSearches[0]));
  expect(url.hostname).toBe('www.linkedin.com');
  expect(url.searchParams.get('keywords')).toContain('Synthetic Steel Company 01');
  expect(url.searchParams.get('keywords')).toContain('project manager');
  await page.locator('.lead-detail-tabs [data-drawer-tab="notes"]').click();
  await expect(page.locator('#leadAiSummaryPagePanel')).toBeVisible();
});

test("profile request opens the scoped draft with attachment, without sending or logging", async ({page}, info) => {
  await login(page,info);
  await page.route('**/api/leads',async route => {
    if (route.request().method() !== 'GET') return route.continue();
    const response = await route.fetch();
    const leads = await response.json();
    await route.fulfill({response,json:leads.map(lead => lead.id === 'ui-lead-1' ? {...lead,notes:'Customer requested to share company profile.',email:'',contact_email:''} : lead)});
  });
  await page.goto('/leads/ui-lead-1/overview');
  const next = page.locator(info.project.name.endsWith('mobile') ? '.record-mobile-next' : '.record-next-step');
  await expect(next.locator('.record-profile-followup')).toContainText('review delivery history');
  expect(await page.evaluate(inspectPresentation,{checkTouchTargets:true})).toEqual([]);
  await capture(page,info,'20-lead-profile-request',{fullPage:false});
  const writes = [];
  page.on('request',request => { if (['PATCH','PUT','DELETE'].includes(request.method()) || request.method() === 'POST' && !request.url().includes('/ai/lead-summary') && request.postDataJSON()?.action !== 'pipeline_health') writes.push(request.url()); });
  await next.getByRole('button',{name:'Send profile',exact:true}).click();
  await expect(page).toHaveURL(/\/leads\/ui-lead-1\/draft-email$/);
  await expect(page.locator('[data-email-profile]')).toBeChecked();
  await expect(page.locator('#emailDraftTo')).toHaveValue('');
  await expect(page.locator('#emailDraftTo')).toBeEnabled();
  await expect(page.locator('#emailDraftBody')).toHaveValue('');
  await page.locator('#emailDraftSubject').fill('Keep my edits');
  await page.locator('[data-email-profile]').uncheck();
  await page.locator(info.project.name.endsWith('mobile') ? '.email-mobile-back[data-email-parent]' : '.email-breadcrumb [data-email-parent]').click();
  await next.getByRole('button',{name:'Send profile',exact:true}).click();
  await expect(page.locator('[data-email-profile]')).toBeChecked();
  await expect(page.locator('#emailDraftSubject')).toHaveValue('Keep my edits');
  expect(writes).toEqual([]);
});

test("Send Email opens a scoped lead subpage without generating or sending", async ({page}, info) => {
  const role = await login(page, info);
  await page.goto('/leads/ui-lead-1/overview');
  const writes=[];
  page.on('request', request => {
    if (request.method() !== 'GET' && request.url().includes('/api/') && !request.url().endsWith('/api/ai/lead-summary') && request.postDataJSON()?.action !== 'pipeline_health') writes.push(request.url());
  });
  await page.getByRole('button',{name:'Send Email',exact:true}).click();
  await expect(page).toHaveURL(/\/leads\/ui-lead-1\/draft-email$/);
  await expect(page.locator('#emailDraftTo')).toHaveValue('contact-1@example.test');
  await expect(page.locator('[data-email-change]')).toHaveCount(0);
  await expect(page.locator('#emailDraftBody')).toHaveValue('');
  await expect(page.locator('[data-email-generate]')).toBeEnabled();
  expect(writes).toEqual([]);
  await page.reload();
  await expect(page.locator('#emailDraftTo')).toHaveValue('contact-1@example.test');
  await page.goBack();
  await expect(page.locator('#leadDrawerTitle')).toHaveText('Synthetic Steel Company 01');
  await page.goForward();
  await expect(page.locator('#emailDraftTo')).toHaveValue('contact-1@example.test');
  await capture(page,info,'19-lead-email-subpage',{fullPage:false});
  await page.locator(info.project.name.endsWith('mobile') ? '.email-mobile-back[data-email-parent]' : '.email-breadcrumb [data-email-parent]').click();
  await expect(page).toHaveURL(/\/leads\/ui-lead-1$/);
  await page.route('**/api/leads', async route => {
    if (route.request().method() !== 'GET') return route.continue();
    const response=await route.fetch();
    const leads=await response.json();
    await route.fulfill({response,json:leads.map(lead => lead.id === 'ui-lead-2' ? {...lead,email:'',contact_email:''} : lead)});
  });
  await page.goto('/leads/ui-lead-2');
  await page.getByRole('button',{name:'Send Email',exact:true}).click();
  await expect(page).toHaveURL(/\/leads\/ui-lead-2\/draft-email$/);
  await expect(page.locator('#emailDraftTo')).toHaveValue('');
  await expect(page.locator('#emailDraftTo')).toBeEnabled();
  await page.locator('#emailDraftTo').fill('manual@example.test');
  await page.goto('/leads/not-visible/draft-email');
  await expect(page.locator('#aiWorkspaceView')).toContainText('unavailable or you do not have access');
  await expect(page.locator('#emailDraftTo')).toHaveValue('');
  await expect(page.locator('[data-email-generate]')).toBeDisabled();
  if (role === 'salesman') {
    await page.goto('/leads/ui-lead-13/draft-email');
    await expect(page.locator('#emailDraftTo')).toHaveValue('');
    await expect(page.locator('[data-email-generate]')).toBeDisabled();
  }
  await page.goto('/?view=draft-email');
  await expect(page.locator('#aiWorkspaceCompany')).toBeVisible();
});

test("responsive Lead Details follows the reference and preserves existing actions", async ({ page }, info) => {
  await login(page, info);
  await page.goto('/leads/ui-lead-1');
  const summary = page.locator('.record-desktop-overview');
  await expect(page.locator('#leadDrawerTitle')).toHaveText('Synthetic Steel Company 01');
  expect(await page.locator('.lead-detail-tabs [data-drawer-tab]').evaluateAll(elements => elements.map(element => element.dataset.drawerTab))).toEqual(['overview', 'activities', 'pmr', 'reminders', 'intel', 'notes']);
  expect(await page.evaluate(inspectPresentation, {checkTouchTargets: true})).toEqual([]);
  if (info.project.name.endsWith('mobile')) {
    await expect(summary).toBeHidden();
    await expect(summary.locator('.record-main-column')).toBeHidden();
    await expect(page.locator('.record-header-actions')).toBeVisible();
    await expect(page.locator('.drawer-overview-panel--snapshot')).toBeHidden();
    await expect(page.locator('.drawer-overview-panel--contact')).toBeHidden();
    await expect(page.locator('.record-contact')).toBeVisible();
    await expect(page.locator('.record-mobile-next')).toBeVisible();
    const tabs = await page.locator('.lead-detail-tabs').boundingBox();
    const nextStep = await page.locator('.record-mobile-next').boundingBox();
    expect(tabs.y + tabs.height).toBeLessThanOrEqual(nextStep.y);
    await expect(page.locator('.record-mobile-ai [data-company-ai-action]')).toHaveCount(3);
    await expect(page.locator('.record-header-actions .record-add-activity')).toBeVisible();
    await expect(page.locator('.record-mobile-health')).toContainText('Contact timing uses the current status and tier cadence.');
    await expect(page.locator('.record-mobile-health .record-health-status')).toHaveCount(6);
    const health = await page.locator('.record-mobile-health').boundingBox();
    const aiCards = await page.locator('.record-mobile-ai').boundingBox();
    expect(aiCards.y + aiCards.height).toBeLessThanOrEqual(health.y);
    expect(health.y + health.height).toBeLessThanOrEqual((await page.locator('.record-contact').boundingBox()).y);
    const order = await page.locator('.record-mobile-overview').evaluate(element => [...element.children].map(child => child.className));
    expect(order).toEqual(['company-ai-actions record-mobile-ai', 'drawer-section record-mobile-health', 'drawer-section record-reminders', 'drawer-section record-recent-activity', 'record-overview-notes', 'record-contact-details']);
    await expect(page.locator('#leadAiSummaryPagePanel')).toBeHidden();
    await expect(page.locator('.record-mobile-next .record-mobile-guidance')).toContainText(/guidance/i);
    await expect(page.locator('.topbar')).toBeHidden();
    await expect(page.locator('#mobileTabs')).toBeHidden();
    await expect(page.locator('.record-mobile-actions')).toBeHidden();
    const actions = page.locator('.record-overview-assistant');
    const box = await actions.boundingBox();
    expect(box.y + box.height).toBeCloseTo(page.viewportSize().height, 0);
    let assistantActions = 0;
    page.on('request', request => { if (/\/api\/ai-assistant\/(interpret|confirm)/.test(request.url())) assistantActions++; });
    await actions.locator('input').fill('Review this account');
    await actions.locator('input').press('Enter');
    await expect(page.locator('#aiAssistantDialog')).toBeVisible();
    await expect(page.locator('#aiAssistantCommand')).toHaveValue('Review this account');
    expect(assistantActions).toBe(0);
    await page.locator('#closeAiAssistant').click();
    await capture(page, info, '18-lead-mobile-reference', {fullPage: true});
    await page.locator('.record-mobile-ai [data-company-ai-action="prepare"]').click();
    await expect(page).toHaveURL(/\/leads\/ui-lead-1\/prepare-meeting$/);
    await expect(page.locator('.meeting-provenance')).toContainText('CRM-data fallback was used.');
    await expect(page.locator('#aiActionDialog')).toBeHidden();
    await page.locator('.meeting-back').click();
    await expect(page).toHaveURL(/\/leads\/ui-lead-1$/);
    await page.locator('.record-mobile-health [data-company-ai-action="flag"]').click();
    await expect(page.locator('#flagAttentionDialog')).toBeVisible();
    await expect(page.locator('#flagAttentionForm input[name="company_id"]')).toHaveValue('ui-lead-1');
    await page.locator('#cancelFlagAttention').click();
    await page.locator('.record-mobile-next').getByRole('button', {name: 'Log outcome', exact: true}).click();
    await expect(page.locator('#activityDialog')).toBeVisible();
    await page.locator('#closeActivityDialog').click();
    await page.locator('.record-overview-notes [data-drawer-edit-notes]').click();
    await expect(page.locator('#drawerNotesForm')).toBeVisible();
    await expect(page.locator('#drawerNotesForm textarea')).toBeFocused();
    await page.locator('#drawerNotesForm textarea').fill('Unsaved responsive note');
    await page.setViewportSize({width:1280,height:900});
    await expect(page.locator('.record-main-column .record-overview-notes')).toBeVisible();
    await expect(page.locator('#drawerNotesForm textarea')).toHaveValue('Unsaved responsive note');
    for (const width of [320,430,375]) {
      await page.setViewportSize({width,height:812});
      await expect(page.locator('.record-contact-details')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await expect(page.locator('#drawerNotesForm textarea')).toHaveValue('Unsaved responsive note');
    }
    await expect(page.locator('.lead-detail-tabs [data-drawer-tab="overview"]')).toHaveAttribute('aria-current', 'page');
    await page.locator('.lead-detail-tabs [data-drawer-tab="notes"]').click();
    await expect(page.locator('.record-mobile-actions')).toBeVisible();
    await expect(page.locator('.record-assistant-host #aiAssistantLauncher')).toBeVisible();
  } else {
    await expect(summary).toBeVisible();
    await expect(page.locator('.drawer-overview-panel--snapshot')).toBeHidden();
    const left = await page.locator('.record-main-column').boundingBox();
    const right = await page.locator('.record-side-column').boundingBox();
    await expect(page.locator('.record-overview-ai [data-company-ai-action]')).toHaveCount(3);
    await expect(page.locator('.record-overview-health')).toContainText('Contact timing uses the current status and tier cadence.');
    await expect(page.locator('.record-next-guidance')).not.toBeEmpty();
    await expect(page.locator('.record-search-host #smartSearchInput')).toBeVisible();
    await expect(page.locator('.record-header-actions [data-drawer-log-activity]')).toBeVisible();
    let assistantActions = 0;
    page.on('request', request => { if (/\/api\/ai-assistant\/(interpret|confirm)/.test(request.url())) assistantActions++; });
    await page.locator('.record-overview-assistant input').fill('Review this account');
    await page.locator('.record-overview-assistant input').press('Enter');
    await expect(page.locator('#aiAssistantDialog')).toBeVisible();
    await expect(page.locator('#aiAssistantCommand')).toHaveValue('Review this account');
    expect(assistantActions).toBe(0);
    await page.locator('#closeAiAssistant').click();
    expect(right.x).toBeGreaterThan(left.x + left.width);
    expect(Math.abs(left.y - right.y)).toBeLessThan(2);
    expect(left.width / right.width).toBeCloseTo(1.6, 1);
    await expect(summary.locator('.record-recent-activity')).toContainText('Synthetic baseline call');
    await expect(page.locator('.record-call')).toHaveAttribute('href', 'tel:+12025550101');
    await expect(page.locator('.record-email')).toHaveText('Send Email');
    await expect(page.locator('#drawerStageSelect')).toHaveCount(info.project.name.startsWith('admin') ? 1 : 0);
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await summary.getByRole('button', {name: 'Copy phone number', exact: true}).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('+12025550101');
    await capture(page, info, '17-lead-desktop-reference', {fullPage: false});
    await summary.getByRole('button', {name: 'Log outcome', exact: true}).click();
    await expect(page.locator('#activityDialog')).toBeVisible();
    await page.locator('#closeActivityDialog').click();
    await summary.getByRole('button', {name: 'Reschedule', exact: true}).click();
    await expect(page.locator('#leadDialog')).toBeVisible();
    await page.locator('#closeLeadForm').click();
    await summary.locator('[data-drawer-edit-notes]').click();
    await expect(summary.locator('#drawerNotesForm')).toBeVisible();
    await expect(summary.locator('#drawerNotesForm textarea')).toHaveValue(/Synthetic/);
  }
  await page.locator('#aiAssistantLauncher').click();
  await expect(page.locator('#aiAssistantDialog')).toBeVisible();
  await page.locator('#closeAiAssistant').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  if (!info.project.name.endsWith('mobile')) {
    for (const width of [1100,1280,1440,2340]) {
      await page.setViewportSize({width,height:900});
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await expect(page.locator('.record-search-host #smartSearchInput')).toBeVisible();
      expect((await page.locator('#leadDetailView').boundingBox()).width).toBeLessThanOrEqual(1440);
    }
    await page.locator('#mobileSidebar [data-view="pipeline"]').click();
    await expect(page.locator('.topbar #smartSearchInput')).toBeVisible();
    await expect(page.locator('#smartSearchInput')).toHaveCount(1);
  }
});
