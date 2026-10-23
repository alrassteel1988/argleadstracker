const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {test, expect} = require("@playwright/test");
const {capture, login, blockExternalTraffic} = require("./helpers");
const {inspectPresentation} = require("./presentation-audit");

test.beforeEach(async ({page}) => blockExternalTraffic(page));

test("presentation audit distinguishes real defects from approved navy gradients", async ({page}) => {
  await page.setContent(`<meta name="viewport" content="width=device-width, initial-scale=1"><style>
    body { margin:0; font:16px Arial; color:#000; background:#fff; }
    #mobileSidebar { background:linear-gradient(135deg,#0F2B47,#07192B); color:#fff; }
    #faint { color:#ddd; } #tiny { font-size:11px; }
    #clipped { width:32px; overflow:hidden; white-space:nowrap; }
    #decorative { background:linear-gradient(#fff,#eee); }
  </style><main id="appShell">
    <p id="readable">Readable text</p><aside id="mobileSidebar">Approved navy sidebar</aside>
    <p id="faint">Low contrast text</p><p id="tiny">Small text</p>
    <p id="clipped">Clipped label</p><div id="decorative">Decorative gradient</div>
    <button id="textOnly" style="font-size:16px">Missing icon</button>
  </main>`);
  const findings = await page.evaluate(inspectPresentation);
  expect(findings.map(({kind, element}) => `${kind}|${element}`).sort()).toEqual([
    "clipped-text|#clipped", "contrast|#faint", "gradient|#decorative",
    "missing-icon|#textOnly", "small-text|#tiny"
  ].sort());
  await page.setContent('<meta name="viewport" content="width=device-width, initial-scale=1"><style>html{overflow-x:hidden}body{margin:0}#appShell{width:calc(100vw + 20px)}</style><main id="appShell">Overflow probe</main>');
  expect(await page.evaluate(() => document.documentElement.clientWidth)).toBe(page.viewportSize().width);
  expect((await page.evaluate(inspectPresentation)).some(finding => finding.kind === "page-overflow")).toBe(true);
});


test("rendered presentation across role pages and secondary dialogs", async ({page}, info) => {
  test.setTimeout(240000);
  const reports = [];
  const directory = path.join(os.tmpdir(), "arg-crm-ui-presentation-audit");
  fs.mkdirSync(directory, {recursive:true});
  const audit = async name => {
    reports.push({name, findings:await page.evaluate(inspectPresentation)});
    fs.writeFileSync(path.join(directory, `${info.project.name}.json`), JSON.stringify(reports, null, 2));
    await capture(page, info, `60-${name}`);
  };
  await page.goto("/");
  await expect(page.locator("#loginForm")).toBeVisible();
  await audit("login");
  const role = await login(page, info), mobile = info.project.name.endsWith("mobile");
  for (const view of ["dashboard", "pipeline", "tasks", ...(role === "admin" ? ["salesmen", "activity"] : [])]) {
    await page.goto(`/?view=${view}`);
    await expect(page.locator(`#${view}View`)).toBeVisible();
    if (view === "dashboard") {
      if (role === "admin") await expect(page.locator("#metricValue")).toHaveText("9");
      else await expect(page.locator('[data-summary-card="salesmanMyLeads"] strong')).toHaveText("12");
    }
    if (view === "pipeline") await expect(page.locator("#leadList tbody tr[data-lead-id]")).toHaveCount(10);
    if (view === "tasks") await expect(page.locator("#tasksPrimary")).not.toBeEmpty();
    await audit(view);
  }
  for (const tab of ["overview", "activities", "pmr", "reminders", "intel", "notes"]) {
    await page.goto(`/leads/ui-lead-1?tab=${tab}`);
    await expect(page.locator(`[data-drawer-tab="${tab}"]`)).toHaveAttribute("aria-current", "page");
    await audit(`lead-${tab}`);
  }
  await page.goto("/leads/ui-lead-1?tab=overview");
  await page.locator('#leadDetailView [data-company-ai-action="flag"]').click();
  await expect(page.locator("#flagAttentionDialog")).toBeVisible();
  await audit("flag-attention");
  await page.locator("#closeFlagAttention").click();
  await page.goto("/leads/ui-lead-1?tab=activities");
  await page.locator('#leadDetailView [data-edit-activity-lead="ui-lead-1"]').first().click();
  await expect(page.locator("#activityDialog")).toBeVisible();
  await expect(page.locator('#activityForm input[name="activity_id"]')).not.toHaveValue("");
  await audit("activity-correction");
  await page.locator("#closeActivityDialog").click();
  await page.locator('#leadDetailView [data-delete-activity-lead="ui-lead-1"]').first().click();
  await expect(page.locator("#activityDeletionDialog")).toBeVisible();
  await audit("deletion-request");
  await page.locator("#activityDeletionDialog [data-close-activity-deletion]").first().click();
  await page.goto("/?view=dashboard");
  await expect(page.locator("#dashboardView")).toBeVisible();
  if (role === "salesman") {
    await page.locator('[data-loss-prompt-capture]:visible').first().click();
    await expect(page.locator("#lostReasonDialog")).toBeVisible();
    await audit("closure-reason");
    await page.locator("#closeLostReasonForm").click();
  } else {
    if (mobile) await page.locator("#mobileMenuToggle").click();
    await page.locator("#sidebarToolsMenu > summary").click();
    await page.locator("#openImportLeads").click();
    await expect(page.locator("#importLeadsDialog")).toBeVisible();
    await audit("import-leads");
    await page.locator("#importLeadsDialog").press("Escape");
  }
  for (const name of ["Quotes", "Accounts"]) {
    await page.goto("/?view=dashboard");
    await expect(page.locator("#dashboardView")).toBeVisible();
    if (mobile) await page.locator("#mobileMenuToggle").click();
    await page.locator("#mobileSidebar").getByRole("button", {name, exact:true}).click();
    // Known baseline duplicate handlers return these shortcuts to Dashboard.
    // Owner chose separate proposal review tabs, not a routing repair. This is
    // presentation coverage of the actual destination, not workflow sign-off.
    await expect(page.locator("#dashboardView")).toBeVisible();
    expect(new URL(page.url()).searchParams.get("view") || "dashboard").toBe("dashboard");
    await audit(`${name.toLowerCase()}-existing-shortcut`);
  }
  fs.writeFileSync(path.join(directory, `${info.project.name}.json`), JSON.stringify(reports, null, 2));
  const findings = reports.flatMap(report => report.findings.map(finding => ({screen:report.name, ...finding})));
  expect(findings, JSON.stringify(findings.slice(0, 35), null, 2)).toEqual([]);
});
