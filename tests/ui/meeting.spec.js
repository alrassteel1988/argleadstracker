const {test, expect} = require("@playwright/test");
const {login, capture, blockExternalTraffic} = require("./helpers");
const {inspectPresentation} = require("./presentation-audit");

test.beforeEach(async ({page}) => blockExternalTraffic(page));

test("existing preparation dialog opens the full meeting brief without regenerating", async ({page}, info) => {
  await login(page, info);
  await page.goto("/leads/ui-lead-1");
  let count = 0;
  page.on("request", request => {
    if (request.method() === "POST" && request.url().endsWith("/api/leads/ui-lead-1/ai-actions")) count++;
  });
  await page.locator('[data-company-ai-action="prepare"]:visible').click();
  await expect(page.locator("#aiActionDialog")).toContainText("CRM-data fallback was used");
  await page.locator("[data-ai-open-brief]").click();
  await expect(page).toHaveURL(/view=meeting-prep/);
  await expect(page.locator("#aiActionDialog")).toBeHidden();
  await expect(page.locator(".meeting-ai-badge")).toHaveText("CRM fallback");
  await expect(page.locator('.meeting-heading [data-meeting-generate], .meeting-heading [data-meeting-copy], .meeting-heading [data-meeting-log]')).toHaveCount(3);
  await expect(page.locator("#meetingCompanyPicker")).toBeHidden();
  await expect(page.locator('.meeting-breadcrumb a')).toHaveText('AI actions');
  await expect(page.locator('.meeting-breadcrumb')).not.toContainText('Pipeline');
  await expect(page.locator('.meeting-breadcrumb a')).toHaveAttribute('href', '/?view=ai-actions');
  await expect(page.locator('.meeting-company-meta [data-meeting-change]')).toBeVisible();
  await expect(page.locator('.meeting-open-lead')).toHaveAttribute('href', /\/leads\/ui-lead-1/);
  await expect(page.locator(".meeting-evidence > .meeting-evidence-row > h4")).toHaveText(["History", "Last PMR", "Recent intel", "Quote reference"]);
  await expect(page.locator(".meeting-assistant-host #aiAssistantLauncher")).toHaveCSS("position", "static");
  await expect(page.locator(".meeting-talking li")).toHaveCount(3);
  await expect(page.locator(".meeting-ask")).not.toContainText("Generate a brief");
  expect(count).toBe(1);
  await capture(page, info, "74-meeting-brief-existing-result", {fullPage:true});
  await page.locator(info.project.name.endsWith('mobile') ? '.meeting-back' : '.meeting-breadcrumb a').click();
  await expect(page).toHaveURL(/view=ai-actions/);
  await expect(page.locator("#aiAssistantLauncher")).toHaveCount(1);
  await expect(page.locator("#aiAssistantLauncher")).toBeVisible();
});

test("meeting brief reference layout preserves selected-company actions", async ({page}, info) => {
  await login(page, info);
  await page.goto("/?view=meeting-prep");
  await expect(page.locator(".topbar")).toBeHidden();
  if (info.project.name.endsWith("mobile")) {
    await expect(page.locator('.meeting-back')).toBeVisible();
    await expect(page.locator('#mobileTabs')).toBeHidden();
    await page.locator('.meeting-back').click();
    await expect(page).toHaveURL(/view=ai-actions/);
    await expect(page.locator('.crm-onetap-heading')).toBeVisible();
    await page.goto('/?view=meeting-prep');
  }
  const requests = [];
  const output = "## Recommended ask\nConfirm the procurement contact.\n## Talking points\n- Discuss current demand.\n- Confirm a meeting date.\n## Relationship snapshot\nSynthetic account context.\n## What happened last time\nSynthetic activity history.\n## Open items\n- Confirm requirements.\n## Recent intelligence\nNo recent intelligence.\n## Additional context\n<script>not executable</script>";
  await page.route("**/api/leads/*/ai-actions", async route => {
    requests.push({url:route.request().url(), body:route.request().postDataJSON()});
    await route.fulfill({json:{action:"prepare_meeting", output, provider:"fallback"}});
  });
  await expect(page.locator("[data-meeting-generate]")).toBeDisabled();
  await page.locator("#aiWorkspaceCompany").selectOption("ui-lead-1");
  expect(requests).toEqual([]);
  await page.locator("[data-meeting-generate]").click();
  await expect(page.locator(".meeting-ask")).toContainText("Confirm the procurement contact.");
  await expect(page.locator(".meeting-provenance")).toContainText("CRM-data fallback was used");
  await expect(page.locator("#aiActionDialog")).toBeHidden();
  await expect(page.locator(".meeting-talking li")).toHaveCount(2);
  if (info.project.name.endsWith('mobile')) {
    await expect(page.locator('.meeting-toolbar')).toHaveCSS('position', 'fixed');
    await expect(page.locator('.meeting-mobile-summary')).toContainText('Prospect');
    await expect(page.locator('.meeting-mobile-summary')).toContainText('AMBER');
    await expect(page.locator('.meeting-mobile-company')).toHaveText('Synthetic Steel Company 01');
    expect(await page.locator('#aiWorkspaceHeading').innerText()).toBe('Prepare for meeting');
    const footer = await page.locator('.meeting-toolbar').boundingBox();
    expect(footer.y + footer.height).toBeLessThanOrEqual(page.viewportSize().height + 1);
    expect(footer.height).toBeLessThan(100);
    const log = await page.locator('.meeting-toolbar [data-meeting-log]').boundingBox();
    const copy = await page.locator('[data-meeting-copy]').boundingBox();
    expect(log.width).toBeGreaterThan(160);
    expect(copy.width).toBeGreaterThanOrEqual(80);
    expect(copy.width).toBeLessThanOrEqual(100);
    expect(copy.height).toBe(48);
    await page.locator('.meeting-after').scrollIntoViewIfNeeded();
    const after = await page.locator('.meeting-after').boundingBox();
    expect(after.y + after.height).toBeLessThanOrEqual(footer.y);
  }
  await expect(page.locator(".meeting-evidence")).toContainText("<script>not executable</script>");
  await expect(page.locator(".meeting-evidence script")).toHaveCount(0);
  await page.locator(".meeting-extra-context > summary").click();
  await expect(page.locator(".meeting-extra-context")).toContainText("Synthetic account context.");
  await expect(page.locator(".meeting-extra-context")).toContainText("Confirm requirements.");
  await page.locator(".meeting-extra-context > summary").click();
  await expect(page.locator("#aiWorkspaceView")).not.toContainText("Create quote");
  expect(requests).toHaveLength(1);
  expect(requests[0].url).toContain("/api/leads/ui-lead-1/ai-actions");
  expect(requests[0].body).toEqual({action:"prepare"});
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.locator("[data-meeting-copy]").click();
  expect((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, "\n")).toBe(output);
  await page.locator("[data-meeting-check='0']").check();
  await expect(page.locator("[data-meeting-check='0']")).toBeChecked();
  const main = await page.locator(".meeting-main").boundingBox();
  const side = await page.locator(".meeting-side").boundingBox();
  if (info.project.name.endsWith("mobile")) expect(side.y).toBeGreaterThanOrEqual(main.y + main.height);
  else expect(side.x).toBeGreaterThanOrEqual(main.x + main.width);
  expect(await page.evaluate(inspectPresentation, {checkTouchTargets:true})).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  await capture(page, info, "74-meeting-brief-reference", {fullPage:false});
  await page.locator(".meeting-toolbar [data-meeting-log]").click();
  await expect(page.locator("#activityDialog")).toBeVisible();
  await expect(page.locator("#activityForm input[name='lead_id']")).toHaveValue("ui-lead-1");
  await expect(page.locator("#activityPurpose")).toHaveValue("Meeting");
  await page.locator("#closeActivityDialog").click();
  await page.locator("[data-meeting-pmr]").click();
  await expect(page.locator("#pmrDialog")).toBeVisible();
  await expect(page.locator("#pmrForm input[name='company_id']")).toHaveValue("ui-lead-1");
  await page.locator("#closePmrForm").click();
  await page.locator("[data-meeting-change]").click();
  await expect(page.locator("#aiWorkspaceCompany")).toBeFocused();
  await page.locator("#aiWorkspaceCompany").selectOption("ui-lead-2");
  await expect(page.locator(".meeting-heading")).toContainText("Synthetic Steel Company 02");
  await expect(page.locator('.meeting-open-lead')).toHaveAttribute('href', /\/leads\/ui-lead-2/);
  await expect(page.locator("[data-meeting-copy]")).toBeDisabled();
  await expect(page.locator("[data-meeting-check='0']")).not.toBeChecked();
  await expect(page.locator(".meeting-ask")).not.toContainText("Confirm the procurement contact.");
  expect(requests).toHaveLength(1);
});

test("meeting brief loading and failed regeneration never expose stale results", async ({page}, info) => {
  await login(page, info);
  await page.goto("/?view=meeting-prep");
  await page.locator("#aiWorkspaceCompany").selectOption("ui-lead-1");
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route("**/api/leads/ui-lead-1/ai-actions", async route => {
    await gate;
    await route.fulfill({status:503, json:{error:"Synthetic provider unavailable"}});
  });
  await page.locator("[data-meeting-generate]").click();
  await expect(page.locator("#aiWorkspaceView")).toHaveAttribute("aria-busy", "true");
  await expect(page.locator("[data-meeting-generate]")).toBeDisabled();
  await page.locator("#aiWorkspaceCompany").selectOption("ui-lead-2");
  release();
  await expect(page.locator(".meeting-heading")).toContainText("Synthetic Steel Company 02");
  await expect(page.locator(".crm-ai-workspace-error")).toHaveCount(0);
  await page.route("**/api/leads/ui-lead-2/ai-actions", route => route.fulfill({status:503, json:{error:"Synthetic provider unavailable"}}));
  await page.locator("[data-meeting-generate]").click();
  await expect(page.locator("[role='alert']")).toContainText("Couldn't generate this right now");
  await expect(page.locator("[data-meeting-copy]")).toBeDisabled();
  await expect(page.locator("[data-meeting-generate]")).toBeEnabled();
  await capture(page, info, "74-meeting-brief-error", {fullPage:false});
});
