const {test, expect} = require("@playwright/test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {phase, capture, login, blockExternalTraffic} = require("./helpers");
const {inspectPresentation} = require("./presentation-audit");
const {BASELINE_REF} = require("./fixture-server");

test.beforeEach(async ({page}) => blockExternalTraffic(page));

test("deletion queue filters records and confirms bulk approval and restore", async ({page}, info) => {
  test.skip(phase !== "after" || !info.project.name.startsWith("admin"), "Current Admin UI only");
  await login(page, info);
  const entries = ["Synthetic Reminder", "Synthetic Activity"].map((company, index) => ({
    id: `delete-${index}`, lead_id: `lead-${index}`, company_name: company,
    entry_type: index ? "Activity" : "Reminder", activity_type: "Phone Call",
    activity_notes: "Synthetic review details", reason: "Duplicate test entry",
    requested_by_name: "Demo Salesman", requested_at: "2025-01-01T12:00:00Z",
    request_status: "pending", target_available: true, can_approve: true
  }));
  entries.push({
    ...entries[0], id: "delete-2", lead_id: "lead-2", company_name: "Synthetic Legacy",
    can_approve: false, approval_block_reason: "Approval blocked: the recorded creator is missing or does not match the requester."
  });
  const decisions = [];
  await page.route("**/api/activity-deletion-requests?status=all&include_digest=1", route => route.fulfill({json: {
    requests: entries,
    digest: { created_at: "2025-01-06", requests: [{ company_name: "Synthetic Reminder", requested_at: "2025-01-01" }] }
  }}));
  await page.route(/\/api\/leads\/lead-\d\/delete-requests\/delete-\d\/(approve|restore)$/, async route => {
    const [, id, action] = new URL(route.request().url()).pathname.match(/(delete-\d)\/(approve|restore)$/);
    const row = entries.find(item => item.id === id);
    decisions.push({id, action, body: route.request().postDataJSON()});
    row.request_status = action === "approve" ? "approved" : "restored";
    row.can_restore = action === "approve";
    row.reviewed_by_name = "Demo Admin";
    await route.fulfill({json: {request: row}});
  });
  await page.goto("/?view=activity");
  await page.locator("[data-admin-deletion-queue]").click();
  await expect(page.locator("#deletionQueueCounts")).toContainText("3 awaiting approval");
  await page.locator("#deletionQueueDigest summary").click();
  await expect(page.locator("#deletionQueueDigest li")).toContainText("Synthetic Reminder");
  await expect(page.locator(".deletion-request-row.late")).toHaveCount(3);
  const legacy = page.locator(".deletion-request-row").filter({hasText: "Synthetic Legacy"});
  await expect(legacy).toContainText("recorded creator is missing");
  await expect(legacy.getByRole("checkbox")).toHaveCount(0);
  await expect(legacy.getByRole("button", {name: "Approve request"})).toHaveCount(0);
  await legacy.getByRole("button", {name: "Review", exact: true}).click();
  const review = page.locator("#activityDeletionQueueDialog");
  await expect(review.getByRole("button", {name: "Approve", exact: true})).toHaveCount(0);
  await expect(review.getByRole("button", {name: "Reject", exact: true})).toBeVisible();
  await review.getByRole("button", {name: "Close review"}).click();
  await page.getByLabel("Entry type").selectOption("Reminder");
  await expect(page.getByRole("checkbox", {name: "Select request for Synthetic Activity"})).toHaveCount(0);
  await page.getByLabel("Entry type").selectOption("");
  await page.getByRole("checkbox", {name: "Select request for Synthetic Reminder"}).check();
  await page.getByRole("checkbox", {name: "Select request for Synthetic Activity"}).check();
  await page.getByRole("button", {name: "Approve selected (2)"}).click();
  await expect(review).toBeVisible();
  await expect(review).toContainText("Synthetic Reminder");
  await expect(review).toContainText("Synthetic Activity");
  expect(decisions).toHaveLength(0);
  await review.locator('[name="admin_password"]').fill("test-confirmation");
  await review.getByRole("button", {name: "Approve", exact: true}).click();
  await expect(review).toBeHidden();
  await expect(page.locator("#deletionQueueCounts")).toContainText("2 decided");
  expect(decisions.map(item => item.action)).toEqual(["approve", "approve"]);
  await page.getByRole("button", {name: "Decided", exact: true}).click();
  const reminderRow = page.locator(".deletion-request-row").filter({hasText: "Synthetic Reminder"});
  await reminderRow.getByRole("button", {name: "Restore"}).click();
  await review.locator('[name="admin_password"]').fill("test-confirmation");
  await review.getByRole("button", {name: "Restore", exact: true}).click();
  await expect(reminderRow).toContainText("Restored");
  expect(decisions.at(-1).id).toBe("delete-0");
  expect(decisions.at(-1).action).toBe("restore");
});

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
  const activityCount = phase === "before" ? page.locator("#activitySummary") : page.locator(".admin-activity-count");
  const activityCountText = phase === "before" ? "18 activities" : /18 of 18/;
  await page.goto("/?view=activity");
  await expect(activityCount).toHaveText(activityCountText);
  await activate(page.locator(phase === "before" ? '#activityView [data-view-activity-lead="ui-lead-1"]' : '[data-admin-activity-history="ui-lead-1"]').first());
  if (phase === "before" && !await page.locator("#activityDetailsDialog").isVisible()) {
    await expect(page.locator("#leadDetailView")).toBeVisible();
    info.annotations.push({type:"baseline-limitation", description:"Historical View keyboard activation navigates to the lead instead of opening Activity Details; pointer activation is intercepted by the old layout."});
    await capture(page, info, "62-activity-details-unavailable-before", {fullPage:false});
    captures.push("62-activity-details-unavailable-before.png");
  } else {
    await inspectDialog("activityDetailsDialog", "activity-details");
    await expect(page.locator("#activityDetailsBody")).toContainText("Synthetic Steel Company 01");
    if (phase === "before") {
      await activate(page.locator("#editActivityFromDetails"));
      await inspectDialog("activityDialog", "activity-details-edit");
      await activate(page.locator("#closeActivityDialog"));
    } else {
      await expect(page.locator("#editActivityFromDetails")).toBeHidden();
      await expect(page.locator("#requestActivityDeletionFromDetails")).toBeHidden();
    }
  }
  await page.goto("/?view=activity");
  await expect(activityCount).toHaveText(activityCountText);
  await activate(page.locator(phase === "before" ? "#openActivityDeletionQueue" : "[data-admin-deletion-queue]"));
  await expect(page.locator(phase === "before" ? "#activityDeletionQueueDialog" : "#deletionRequestsView")).toBeVisible();
  await expect(page.locator("#activityDeletionQueueBody")).toContainText("No deletion requests");
  if (phase === "before") await inspectDialog("activityDeletionQueueDialog", "deletion-review-empty");
  if (phase === "after" && info.project.name.endsWith("mobile")) {
    const heights = await page.locator('.activity-queue-toolbar input[type="search"]').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().height));
    for (const height of heights) {
      expect(height).toBeGreaterThanOrEqual(44);
      expect(height).toBeLessThanOrEqual(52);
    }
  }
  await activate(page.locator(phase === "before" ? '[data-close-activity-queue]' : "#deletionQueueBack"));
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
