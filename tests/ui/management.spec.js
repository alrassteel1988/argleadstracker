const {test, expect} = require("@playwright/test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {phase, capture, login, blockExternalTraffic} = require("./helpers");
const {inspectPresentation} = require("./presentation-audit");
const {BASELINE_REF} = require("./fixture-server");

test.beforeEach(async ({page}) => blockExternalTraffic(page));

test("existing administrative dialogs preserve presentation and role restrictions", async ({page}, info) => {
  test.setTimeout(120000);
  const role = await login(page, info);
  if (role === "salesman") {
    await expect(page.locator("#openSalesmanForm")).toBeHidden();
    await expect(page.locator("#openActivityDeletionQueue")).toBeHidden();
    return;
  }
  const writes = [];
  const captures = [];
  page.on("request", request => {
    const pathname = new URL(request.url()).pathname;
    // Opening Overview also requests its read-only AI summary using POST.
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method()) && pathname.startsWith("/api/")
      && !(request.method() === "POST" && pathname === "/api/ai/lead-summary")) {
      writes.push(`${request.method()} ${pathname}`);
    }
  });
  const inspectDialog = async (id, name) => {
    const dialog = page.locator(`#${id}`);
    await expect(dialog).toBeVisible();
    if (phase === "after") {
      await expect(dialog).toHaveCSS("background-color", "rgb(254, 252, 253)");
      const bounds = await dialog.boundingBox();
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize().width + 1);
      expect(bounds.height).toBeLessThanOrEqual(page.viewportSize().height);
      await expect(dialog.locator('.dialog-header button, .activity-entry-header button, .activity-workflow-header button').first()).toBeInViewport();
      const overflowing = await dialog.locator('button, input:not([type="hidden"]), select, textarea').evaluateAll(elements => elements.filter(element => {
        if (!element.checkVisibility({checkOpacity:true, checkVisibilityCSS:true})) return false;
        const box = element.getBoundingClientRect(), parent = element.closest("dialog").getBoundingClientRect();
        return box.width > 0 && box.height > 0 && (box.left < parent.left || box.right > parent.right);
      }).map(element => ({name:element.id || element.name || element.textContent.trim(),
        bounds:element.getBoundingClientRect().toJSON()})));
      expect(overflowing, "Dialog controls must remain within the panel rather than clip at its edge").toEqual([]);
      expect(await page.evaluate(inspectPresentation, {checkTouchTargets:true})).toEqual([]);
    }
    await capture(page, info, `62-${name}`, {fullPage:false});
    captures.push(`62-${name}.png`);
  };
  // Historical Activity layers intercept pointer clicks; capture native keyboard
  // activation without claiming the baseline pointer workflow was functional.
  const activate = locator => phase === "before" ? locator.press("Enter") : locator.click();
  await page.goto("/?view=activity");
  await expect(page.locator("#activitySummary")).toHaveText("18 activities");
  await activate(page.locator('#activityView [data-view-activity-lead="ui-lead-1"]').first());
  if (phase === "before" && !await page.locator("#activityDetailsDialog").isVisible()) {
    await expect(page.locator("#leadDetailView")).toBeVisible();
    info.annotations.push({type:"baseline-limitation", description:"Historical View keyboard activation navigates to the lead instead of opening Activity Details; pointer activation is intercepted by the old layout."});
    await capture(page, info, "62-activity-details-unavailable-before", {fullPage:false});
    captures.push("62-activity-details-unavailable-before.png");
  } else {
    await inspectDialog("activityDetailsDialog", "activity-details");
    await expect(page.locator("#activityDetailsBody")).toContainText("Synthetic Steel Company 01");
    await activate(page.locator("#editActivityFromDetails"));
    await inspectDialog("activityDialog", "activity-details-edit");
    await activate(page.locator("#closeActivityDialog"));
  }
  await page.goto("/?view=activity");
  await expect(page.locator("#activitySummary")).toHaveText("18 activities");
  await activate(page.locator("#openActivityDeletionQueue"));
  await expect(page.locator("#activityDeletionQueueDialog")).toBeVisible();
  await expect(page.locator("#activityDeletionQueueBody")).toContainText("No deletion requests");
  await inspectDialog("activityDeletionQueueDialog", "deletion-review-empty");
  if (phase === "after" && info.project.name.endsWith("mobile")) {
    const heights = await page.locator('.activity-queue-toolbar input[type="search"]').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().height));
    for (const height of heights) {
      expect(height).toBeGreaterThanOrEqual(44);
      expect(height).toBeLessThanOrEqual(52);
    }
  }
  await activate(page.locator('[data-close-activity-queue]'));
  if (info.project.name.endsWith("mobile")) await activate(page.locator("#mobileMenuToggle"));
  await activate(page.locator("#sidebarToolsMenu > summary"));
  await activate(page.locator("#openSalesmanForm"));
  await inspectDialog("salesmanDialog", "create-salesman");
  await expect(page.locator('#salesmanForm input[name="password"]')).toHaveAttribute("minlength", "8");
  await activate(page.locator("#closeSalesmanForm"));
  await page.goto("/leads/ui-lead-1?tab=overview");
  await activate(page.locator('#leadDetailView [data-drawer-edit-lead="ui-lead-1"]:visible').first());
  await page.locator("#formSalesman").selectOption({label:"Other Demo Salesman"});
  await activate(page.locator("#leadStepNext"));
  await activate(page.locator("#leadStepNext"));
  await activate(page.locator('#leadForm button[type="submit"]'));
  await inspectDialog("handoffDialog", "reassignment-confirmation");
  await expect(page.locator("#confirmHandoff")).toBeDisabled();
  await activate(page.locator("#cancelHandoff"));
  await expect(page.locator("#handoffDialog")).toBeHidden();
  await expect(page.locator("#formSalesman")).toHaveValue("Demo Salesman");
  await activate(page.locator("#closeLeadForm"));
  expect(writes, "Reviewing or cancelling these dialogs must not submit administrative writes").toEqual([]);
  const directory = path.join(os.tmpdir(), "arg-crm-ui-management-manifests");
  fs.mkdirSync(directory, {recursive:true});
  fs.writeFileSync(path.join(directory, `${phase}-${info.project.name}.json`), JSON.stringify({
    capturedAt:new Date().toISOString(), profile:info.project.name, viewport:page.viewportSize(), phase,
    runtimeSource:process.env.CRM_UI_REPLAY_BASELINE === "1" ? BASELINE_REF : "working-tree",
    activation:phase === "before" ? "native-keyboard" : "pointer", captures,
    limitations:info.annotations.filter(item => item.type === "baseline-limitation")
  }, null, 2));
});
