const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {test, expect, chromium} = require("@playwright/test");
const {capture, login, blockExternalTraffic} = require("./helpers");
const {inspectPresentation} = require("./presentation-audit");

test("native Chromium page zoom", async ({baseURL}, info) => {
  const zoom = Number(info.project.metadata.zoom);
  expect([1, 1.25, 1.5]).toContain(zoom);
  test.setTimeout(240000);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "arg-crm-native-zoom-"));
  fs.mkdirSync(path.join(profile, "Default"));
  // Chromium stores default page zoom per storage partition. The default
  // partition has an empty relative path and therefore the key "x".
  fs.writeFileSync(path.join(profile, "Default", "Preferences"), JSON.stringify({
    partition:{default_zoom_level:{x:Math.log(zoom) / Math.log(1.2)}}
  }));
  const context = await chromium.launchPersistentContext(profile, {
    channel:"chromium", headless:true, viewport:null,
    args:["--window-size=1440,900"], serviceWorkers:"block",
    locale:"en-GB", timezoneId:"Asia/Dubai", baseURL
  });
  const reports = [];
  const directory = path.join(os.tmpdir(), "arg-crm-ui-native-zoom");
  fs.mkdirSync(directory, {recursive:true});
  try {
    const page = context.pages()[0];
    await blockExternalTraffic(page);
    const inspect = async name => {
      const dimensions = await page.evaluate(() => ({
        width:innerWidth, height:innerHeight, outerWidth, outerHeight,
        pixelRatio:devicePixelRatio, visualScale:visualViewport.scale
      }));
      expect(dimensions.pixelRatio).toBeCloseTo(zoom, 2);
      expect(dimensions.visualScale).toBeCloseTo(1, 2);
      expect(dimensions.outerWidth).toBe(1440);
      expect(dimensions.width).toBeLessThanOrEqual(Math.ceil(1440 / zoom));
      expect(dimensions.width).toBeGreaterThan(1400 / zoom);
      reports.push({name, zoom, dimensions, findings:await page.evaluate(inspectPresentation)});
      fs.writeFileSync(path.join(directory, `${info.project.name}-${zoom}.json`), JSON.stringify(reports, null, 2));
      await capture(page, info, `90-zoom-${Math.round(zoom * 100)}-${name}`);
    };
    await page.goto("/");
    await expect(page.locator("#loginForm")).toBeVisible();
    await inspect("login");
    const role = await login(page, info);
    for (const view of ["dashboard", "pipeline", "tasks", ...(role === "admin" ? ["salesmen", "activity"] : [])]) {
      await page.goto(`/?view=${view}`);
      await expect(page.locator(`#${view}View`)).toBeVisible();
      if (view === "dashboard") {
        if (role === "admin") await expect(page.locator("#metricValue")).toHaveText("9");
        else await expect(page.locator('[data-summary-card="salesmanMyLeads"] strong')).toHaveText("12");
      }
      if (view === "pipeline") await expect(page.locator("#leadList tbody tr[data-lead-id]")).toHaveCount(10);
      if (view === "tasks") {
        if (role === "admin") await expect(page.locator(".tasks-review-empty")).toContainText("No submitted weekly reports yet");
        else await expect(page.locator('[data-weekly-field="summary"]')).toBeVisible();
      }
      if (view === "salesmen") await expect(page.locator(".salesmen-directory-table tbody tr")).not.toHaveCount(0);
      await inspect(view);
    }
    for (const tab of ["overview", "activities", "pmr", "reminders", "intel", "notes"]) {
      await page.goto(`/leads/ui-lead-1?tab=${tab}`);
      await expect(page.locator(`[data-drawer-tab="${tab}"]`)).toHaveAttribute("aria-current", "page");
      await inspect(`lead-${tab}`);
    }
    const addLead = page.locator("#openLeadForm");
    await addLead.click();
    await expect(page.locator("#leadDialog")).toBeVisible();
    await inspect("add-lead");
    await page.locator("#leadDialog").press("Escape");
    await expect(page.locator("#leadDialog")).toBeHidden();
    const findings = reports.flatMap(report => report.findings.map(finding => ({screen:report.name, zoom, ...finding})));
    expect(findings, JSON.stringify(findings.slice(0, 30), null, 2)).toEqual([]);
  } finally {
    await context.close();
  }
});
