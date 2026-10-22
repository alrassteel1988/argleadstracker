const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test, expect } = require("@playwright/test");
const { FIXTURE_PASSWORD, FIXTURE_USERS } = require("./fixture-server");

const phase = process.env.CRM_UI_SCREENSHOT_PHASE || "before";
if (!["before", "after"].includes(phase)) throw new Error("Screenshot phase must be before or after");
const artifacts = path.resolve(process.env.CRM_UI_ARTIFACT_DIR || path.join(os.tmpdir(), "arg-crm-ui-screenshots"));

async function capture(page, info, name) {
  const directory = path.join(artifacts, phase, info.project.name);
  fs.mkdirSync(directory, { recursive: true });
  await page.screenshot({ path: path.join(directory, `${name}.png`), fullPage: true });
}

async function login(page, info) {
  const role = info.project.name.startsWith("admin") ? "admin" : "salesman";
  const user = FIXTURE_USERS.find(item => item.role === role);
  await page.goto("/");
  await expect(page.locator("#loginForm")).toBeVisible();
  await page.locator('#loginForm input[name="email"]').fill(user.email);
  await page.locator('#loginForm input[name="password"]').fill(FIXTURE_PASSWORD);
  await page.locator('#loginForm button[type="submit"]').click();
  await expect(page.locator("#appShell")).toBeVisible();
  await expect(page.locator("#loginForm")).toBeHidden();
  return role;
}

test.beforeEach(async ({ page }) => {
  // Prevent accidental provider/API traffic from the test browser. Static font/chart hosts
  // already used by the app are allowed; no customer data exists in this fixture.
  await page.route("**/*", route => {
    const url = new URL(route.request().url());
    if (["127.0.0.1", "fonts.googleapis.com", "fonts.gstatic.com", "cdnjs.cloudflare.com"].includes(url.hostname)
      || ["data:", "blob:"].includes(url.protocol)) return route.continue();
    return route.abort("blockedbyclient");
  });
});

test("sign-in validation, role routes, Pipeline filters and lead tabs", async ({ page }, info) => {
  await page.goto("/");
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

  await page.goto("/?view=pipeline");
  await expect(page.locator("#leadList table")).toBeVisible();
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
