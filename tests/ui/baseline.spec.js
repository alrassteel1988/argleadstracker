const { test, expect } = require("@playwright/test");
const { phase, capture, login, blockExternalTraffic } = require("./helpers");

test.beforeEach(async ({ page }) => blockExternalTraffic(page));

test("sign-in validation, role routes, Pipeline filters and lead tabs", async ({ page }, info) => {
  await page.goto("/");
  if (phase === "after") {
    const signInPresentation = await page.locator('#loginForm button[type="submit"]').evaluate(button => ({
      icon: getComputedStyle(button, "::before").maskImage,
      foreground: getComputedStyle(button).color,
      background: getComputedStyle(button).backgroundColor
    }));
    expect(signInPresentation.icon).toContain("data:image/svg+xml");
    expect(signInPresentation.foreground).toBe("rgb(8, 61, 119)");
    expect(signInPresentation.background).toBe("rgb(255, 177, 0)");
  }
  await capture(page, info, "01-login");
  await page.locator('#loginForm button[type="submit"]').click();
  await expect(page.locator("#loginForm")).toBeVisible();
  const role = await login(page, info);
  await expect(page.locator("#dashboardView")).toBeVisible();
  if (phase === "after") {
    const presentation = await page.locator(".main").evaluate(element => ({
      image: getComputedStyle(element).backgroundImage,
      font: getComputedStyle(element).fontFamily,
      headingFont: getComputedStyle(element.querySelector("h1")).fontFamily
    }));
    expect(presentation.image).toContain(info.project.name.endsWith("mobile") ? "crm-silk-white-mobile.png" : "crm-silk-white-desktop.png");
    expect(presentation.font).toContain("Inter");
    expect(presentation.headingFont).toContain("Playfair Display");
  }
  await capture(page, info, "02-dashboard");
  if (phase === "after" && role === "salesman") {
    const surface = await page.locator(".salesman-dashboard-pipeline").evaluate(element => ({
      color: getComputedStyle(element).backgroundColor,
      border: getComputedStyle(element).borderTopColor,
      headingColor: getComputedStyle(element.querySelector("h2")).color
    }));
    expect(surface.color).toBe("rgb(254, 252, 253)");
    expect(surface.border).toBe("rgb(91, 192, 190)");
    expect(surface.headingColor).toBe("rgb(8, 61, 119)");
    await expect(page.locator("#salesmanSimplifiedPipeline [data-summary-card]")).toHaveCount(5);
    const actions = await page.locator(".salesman-dashboard-top-actions").boundingBox();
    const calls = await page.locator(".salesman-dashboard-call-queue").boundingBox();
    const list = await page.locator(".salesman-dashboard-live-leads").boundingBox();
    expect(list.y).toBeGreaterThanOrEqual(Math.max(actions.y + actions.height, calls.y + calls.height) + 15);
    const companyText = await page.locator("#salesmanDashboardLeadList .lead-table-company strong").first().evaluate(element => parseFloat(getComputedStyle(element).fontSize));
    expect(companyText).toBeGreaterThanOrEqual(14);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  }

  await page.goto("/?view=pipeline");
  await expect(page.locator("#leadList table")).toBeVisible();
  if (phase === "after" && info.project.name.endsWith("mobile")) {
    const field = await page.locator('[data-pipeline-filter="search"]').evaluate(element => ({
      fontSize: parseFloat(getComputedStyle(element).fontSize),
      height: element.getBoundingClientRect().height
    }));
    expect(field.fontSize).toBeGreaterThanOrEqual(16);
    expect(field.height).toBeGreaterThanOrEqual(44);
  }
  await expect(page.locator("#leadList")).toContainText("Synthetic Steel Company 01");
  if (role === "salesman") {
    await expect(page.locator("#leadList")).not.toContainText("Synthetic Steel Company 13");
    await expect(page.locator("#pipelineReportTools")).toBeHidden();
  } else await expect(page.locator("#pipelineReportTools")).toBeVisible();
  await capture(page, info, "03-pipeline");
  const search = page.locator('[data-pipeline-filter="search"]');
  await search.fill("Company 01");
  await expect(page.locator("#leadList tbody tr")).toHaveCount(1);
  await page.locator('[data-pipeline-filter="stage"]').selectOption("NEW");
  await expect(page.locator("#leadList tbody tr")).toHaveCount(1);
  await page.locator('[data-pipeline-sort="company"]').click();
  await expect(search).toHaveValue("Company 01");
  await page.locator("#clearPipelineFilters").click();
  await expect(search).toHaveValue("");

  for (const tab of ["overview", "activities", "pmr", "reminders", "intel", "notes"]) {
    await page.goto(`/leads/ui-lead-1?tab=${tab}`);
    await expect(page.locator("#leadDetailView")).toBeVisible();
    await expect(page.locator(`[data-drawer-tab="${tab}"]`)).toBeVisible();
    await capture(page, info, `04-lead-${tab}`);
  }

  for (const view of ["salesmen", "activity", "tasks"]) {
    await page.goto(`/?view=${view}`);
    if (role === "salesman" && view !== "tasks") {
      await expect(page.locator("#dashboardView")).toBeVisible();
      await expect(page.locator(`#${view}View`)).toBeHidden();
    } else {
      await expect(page.locator(`#${view}View`)).toBeVisible();
      if (view === "tasks") await expect(page.locator("#tasksPrimary")).not.toBeEmpty();
      await capture(page, info, `05-${view}`);
    }
  }
  if (info.project.name.endsWith("mobile") && await page.locator("#logoutButton").evaluate(button => Boolean(button.closest("#mobileSidebar")))) await page.locator("#mobileMenuToggle").click();
  await page.locator("#logoutButton").click();
  await expect(page.locator("#loginForm")).toBeVisible();
});

test("existing add-lead steps, activity dialog, AI confirmation shell and report draft", async ({ page }, info) => {
  const role = await login(page, info);
  await page.locator("#openLeadForm").click();
  await expect(page.locator("#leadDialog")).toBeVisible();
  const companyNames = {
    "admin-desktop": "Alder Foundry",
    "salesman-desktop": "Cypress Shipbuilders",
    "admin-mobile": "Keystone Fabrication",
    "salesman-mobile": "Zenith Contractors"
  };
  await page.locator("#leadCompanyName").fill(companyNames[info.project.name]);
  await capture(page, info, "06-lead-step-1");
  await page.locator("#leadStepNext").click();
  await expect(page.locator('[data-lead-step-panel="1"]')).toBeVisible();
  await capture(page, info, "06-lead-step-2");
  await page.locator("#leadStepNext").click();
  await expect(page.locator("#leadSubmitButton")).toBeVisible();
  await page.locator('#leadForm textarea[name="notes"]').fill("Synthetic UI baseline: review requirements next week.");
  await capture(page, info, "06-lead-step-3");
  const save = page.waitForResponse(response => response.url().endsWith("/api/leads") && response.request().method() === "POST");
  await page.locator("#leadSubmitButton").click();
  const saved = await save;
  expect(saved.status(), await saved.text()).toBe(201);
  await expect(page.locator("#leadDialog")).toBeHidden();

  await page.goto("/leads/ui-lead-1");
  await page.locator('[data-drawer-log-activity="ui-lead-1"]').click();
  await expect(page.locator("#activityDialog")).toBeVisible();
  await capture(page, info, "07-add-activity");
  await page.locator("#cancelActivityDialog").click();
  await expect(page.locator("#activityDialog")).toBeHidden();

  await page.locator("#aiAssistantLauncher").click();
  await expect(page.locator("#aiAssistantDialog")).toBeVisible();
  await capture(page, info, "08-ai-assistant");
  await page.locator("#closeAiAssistant").click();
  await expect(page.locator("#aiAssistantDialog")).toBeHidden();

  await page.goto("/?view=tasks");
  await expect(page.locator("#tasksPrimary")).not.toBeEmpty();
  if (role === "salesman") {
    await page.locator('[data-weekly-field="summary"]').fill("Reviewed requirements with demo buyers; next week confirm volumes and delivery dates.");
    const draft = page.waitForResponse(response => /\/api\/weekly-reports\//.test(response.url())
      && ["POST", "PUT", "PATCH"].includes(response.request().method()));
    await page.locator("#weeklySaveDraft").click();
    expect((await draft).ok()).toBe(true);
    await capture(page, info, "09-weekly-draft");
  } else {
    await page.goto("/?view=activity");
    await expect(page.locator("#activityCalendarToggle")).toBeVisible();
    await page.locator("#activityCalendarToggle").click();
    await expect(page.locator("#activityWeeklyLog")).toBeHidden();
    await expect(page.locator("#activityCalendarToggle")).toHaveAttribute("aria-expanded", "false");
    await capture(page, info, "09-calendar-minimized");
    await page.locator("#activityCalendarToggle").click();
    await expect(page.locator("#activityWeeklyLog")).toBeVisible();
  }
});
