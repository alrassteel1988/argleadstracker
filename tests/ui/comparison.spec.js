const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const {execFileSync} = require("node:child_process");
const {test, expect} = require("@playwright/test");
const {phase, capture, login, blockExternalTraffic} = require("./helpers");
const {BASELINE_REF} = require("./fixture-server");

test("dataset-ready primary screen comparison captures", async ({page}, info) => {
  test.setTimeout(180000);
  await blockExternalTraffic(page);
  if (phase === "before") expect(process.env.CRM_UI_REPLAY_BASELINE).toBe("1");
  else expect(process.env.CRM_UI_REPLAY_BASELINE).not.toBe("1");
  const captures = [];
  const snapshot = async (name, readiness) => {
    const filename = await capture(page, info, `70-${name}`);
    captures.push({name, filename, readiness,
      sha256:crypto.createHash("sha256").update(fs.readFileSync(filename)).digest("hex")});
  };
  await page.goto("/");
  await expect(page.locator("#loginForm")).toBeVisible();
  const fieldContracts = await page.evaluate(({before, after}) => {
    const read = source => Array.from(new DOMParser().parseFromString(source, "text/html")
      .querySelectorAll("input, select, textarea")).map(field => ({
        form:field.closest("form")?.id || "", tag:field.tagName, id:field.id, name:field.getAttribute("name"),
        attributes:Object.fromEntries(["type", "required", "minlength", "maxlength", "min", "max", "pattern", "multiple", "accept", "readonly", "disabled"]
          .map(name => [name, field.getAttribute(name)])),
        options:field.tagName === "SELECT" ? Array.from(field.options).map(option => option.value) : null
      })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    return {before:read(before), after:read(after)};
  }, {
    before:execFileSync("git", ["show", `${BASELINE_REF}:index.html`], {cwd:path.resolve(__dirname, "../.."), encoding:"utf8"}),
    after:fs.readFileSync(path.resolve(__dirname, "../../index.html"), "utf8")
  });
  expect(fieldContracts.before.some(field => field.form === "loginForm" && field.name === "email")).toBe(true);
  expect(fieldContracts.before.some(field => field.form === "leadForm" && field.name === "company_name" && field.attributes.required !== null)).toBe(true);
  expect(fieldContracts.after, "Static form identity, validation and stored option values must survive the reskin").toEqual(fieldContracts.before);
  await snapshot("login", "Sign-in form visible before authentication");
  const role = await login(page, info);
  const user = role === "admin" ? "Demo Admin" : "Demo Salesman";
  for (const view of ["dashboard", "pipeline", "tasks", ...(role === "admin" ? ["salesmen", "activity"] : [])]) {
    await page.goto(`/?view=${view}`);
    await expect(page.locator(`#${view}View`)).toBeVisible();
    await expect(page.locator("#mobileSidebar")).toContainText(user);
    let readiness;
    if (view === "dashboard") {
      await expect(page.locator(role === "admin" ? "#metricValue" : '[data-summary-card="salesmanMyLeads"] strong')).toHaveText(role === "admin" ? "9" : "12");
      readiness = `${user}; ${role === "admin" ? "9 open records" : "12 assigned records"}`;
    } else if (view === "pipeline") {
      await expect(page.locator("#leadList tbody tr[data-lead-id]")).toHaveCount(10);
      readiness = "10 loaded lead rows on page 1";
    } else if (view === "tasks") {
      if (role === "admin") await expect(page.locator(".tasks-review-empty")).toContainText("No submitted weekly reports yet");
      else await expect(page.locator('[data-weekly-field="summary"]')).toBeVisible();
      readiness = role === "admin" ? "Loaded empty review state" : "Loaded report summary field";
    } else if (view === "salesmen") {
      await expect(page.locator(".salesmen-directory-table tbody tr")).toHaveCount(2);
      readiness = "2 loaded salesman rows";
    } else {
      await expect(page.locator("#activitySummary")).toHaveText("18 activities");
      await expect(page.locator(".activity-table tbody tr")).toHaveCount(10);
      readiness = "18 activities; 10 loaded rows on page 1";
    }
    await snapshot(view, readiness);
  }
  for (const tab of ["overview", "activities", "pmr", "reminders", "intel", "notes"]) {
    await page.goto(`/leads/ui-lead-1?tab=${tab}`);
    await expect(page.locator(`[data-drawer-tab="${tab}"]`)).toHaveClass(/active/);
    await expect(page.locator("#leadDetailView .drawer-title-copy h2")).toHaveText("Synthetic Steel Company 01");
    await expect(page.locator("#leadAiSummaryPagePanel")).toContainText("Synthetic Steel Company 01");
    await snapshot(`lead-${tab}`, "Selected tab active; company and AI summary loaded for ui-lead-1");
  }
  const directory = path.join(os.tmpdir(), "arg-crm-ui-comparison-manifests");
  fs.mkdirSync(directory, {recursive:true});
  fs.writeFileSync(path.join(directory, `${phase}-${info.project.name}.json`), JSON.stringify({
    capturedAt:new Date().toISOString(), phase, profile:info.project.name, viewport:page.viewportSize(),
    runtimeSource:phase === "before" ? BASELINE_REF : "working-tree", staticFieldContracts:fieldContracts.after.length, captures
  }, null, 2));
});
