const { test, expect } = require("@playwright/test");
const { capture, login, blockExternalTraffic } = require("./helpers");

test.beforeEach(async ({page}) => blockExternalTraffic(page));

async function checkDialog(page, id, mobile) {
  const dialog = page.locator(`#${id}`);
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveCSS("background-color", "rgb(254, 252, 253)");
  const header = dialog.locator(".dialog-header, .activity-entry-header, .ai-assistant-header").first();
  await expect(header).toHaveCSS("background-color", "rgb(8, 61, 119)");
  await expect(header.locator("h2")).toHaveCSS("color", "rgb(254, 252, 253)");
  await header.locator("button").first().focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(header.locator("button").first()).toBeFocused();
  await expect(header.locator("button").first()).toHaveCSS("outline-color", "rgb(255, 177, 0)");
  const bounds = await dialog.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize().width + 1);
  expect(bounds.height).toBeLessThanOrEqual(page.viewportSize().height);
  const field = dialog.locator('input:not([type="hidden"]):not([type="checkbox"]), textarea, select').filter({visible:true}).first();
  if (await field.count()) {
    await expect(field).toHaveCSS("color", "rgb(23, 43, 77)");
    expect(await field.evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(mobile ? 16 : 14);
  }
}

test("shared dialogs remain readable and existing forms preserve actions", async ({page}, info) => {
  test.setTimeout(90000);
  const role = await login(page, info);
  const mobile = info.project.name.endsWith("mobile");
  if (role === "salesman") {
    await expect(page.locator('[data-summary-card="salesmanStageLost"]')).toContainText("Blocked");
    const dormant = page.locator('[data-summary-card="salesmanStageDormant"]');
    await expect(dormant).toContainText("Dormant");
    await dormant.click();
    await expect(page.locator("#summaryCardDetailsTitle")).toContainText("Dormant Leads Summary (2)");
    await expect(page.locator("#summaryCardDetailsDialog")).toContainText("Previously active leads that have gone quiet.");
    await capture(page, info, "50-dormant-summary");
    await page.locator("#summaryCardDetailsDialog").press("Escape");
    await expect(page.locator("#summaryCardDetailsDialog")).not.toBeVisible();
  }
  await page.locator("#openLeadForm").click();
  await checkDialog(page, "leadDialog", mobile);
  await expect(page.locator('#formStage option[value="LOST"]')).toHaveText("Blocked");
  await expect(page.locator('#formStage option[value="NEW"]')).toHaveText("Prospect");
  await expect(page.locator('#formStage option[value="DORMANT"]')).toHaveText("Dormant");
  if (mobile) {
    const tops = await page.locator(".lead-step").evaluateAll(elements=>elements.map(e=>e.getBoundingClientRect().top));
    expect(Math.max(...tops)-Math.min(...tops)).toBeLessThanOrEqual(1);
  }
  await expect(page.locator("#leadFormTitle .crm-title-accent")).toHaveText("Lead");
  await page.locator("#leadStepNext").click();
  await expect(page.locator('[data-lead-step-panel="0"]')).toBeVisible();
  await expect(page.locator("#leadDialog")).toBeVisible();
  await capture(page, info, "50-add-lead-validation");
  await page.locator("#closeLeadForm").click();
  await expect(page.locator("#leadDialog")).toBeHidden();
  await page.locator("#openPlacesSearch").click();
  await checkDialog(page, "placesDialog", mobile);
  await capture(page, info, "50-places");
  await page.locator("#closePlacesSearch").click();
  await page.goto("/leads/ui-lead-1");
  await page.locator('[data-drawer-log-activity="ui-lead-1"]').click();
  await checkDialog(page, "activityDialog", mobile);
  await expect(page.locator("#activityRecordVoice")).toBeVisible();
  await expect(page.locator("#activityRecordVoice")).toHaveCSS("background-color", "rgb(254, 252, 253)");
  await expect(page.locator("#activityDialog #saveActivity")).toHaveCSS("background-color", "rgb(255, 177, 0)");
  await expect(page.locator("#activityAttachmentInput")).toHaveAttribute("accept", ".png,.pdf,.doc,.docx,.xls,.xlsx");
  await page.locator("#activityNextActionDate").fill("2026-10-26");
  await page.locator("#activityPurpose").selectOption("Meeting");
  const note = "Synthetic dialog regression: buyer confirmed procurement review for Monday.";
  await page.locator("#activityNotes").fill(note);
  await capture(page, info, "50-add-activity");
  const saved = page.waitForResponse(r=>r.url().includes("/api/") && ["POST","PATCH"].includes(r.request().method()));
  await page.locator("#activityDialog #saveActivity").click();
  const response = await saved;
  expect(response.ok(), await response.text()).toBe(true);
  await expect(page.locator("#activityDialog")).toBeHidden();
  await page.goto("/leads/ui-lead-1?tab=activities");
  await expect(page.locator("#leadDetailPagePanel")).toContainText(note);
  await page.goto("/leads/ui-lead-1?tab=pmr");
  await page.locator('[data-drawer-file-pmr="ui-lead-1"]').click();
  await checkDialog(page, "pmrDialog", mobile);
  await capture(page, info, "50-pmr");
  await page.locator("#closePmrForm").click();
  await page.locator("#aiAssistantLauncher").click();
  await checkDialog(page, "aiAssistantDialog", mobile);
  await expect(page.locator("#aiAssistantTitle .crm-title-accent")).toHaveText("Assistant");
  await page.locator('[data-ai-prompt="Show my overdue calls"]').click();
  await expect(page.locator("#aiAssistantCommand")).toHaveValue("Show my overdue calls");
  await capture(page, info, "50-ai-assistant");
  await page.locator("#closeAiAssistant").click();
  await page.goto("/?view=pipeline");
  const sourceRead = page.waitForResponse(r=>r.url().endsWith("/api/leads") && r.request().method() === "GET");
  await page.locator("#refreshPipelineLeads").click();
  const sourceResponse = await sourceRead;
  expect(sourceResponse.ok()).toBe(true);
  const sourceLeads = await sourceResponse.json();
  expect(sourceLeads.find(lead => lead.id === "ui-lead-5").stage).toBe("LOST");
  expect(sourceLeads.find(lead => lead.id === "ui-lead-1").stage).toBe("NEW");
  const stage = page.locator('[data-pipeline-filter="stage"]');
  await expect(stage.locator('option[value="LOST"]')).toHaveText("Blocked");
  await stage.selectOption("LOST");
  await expect(page.locator("#leadList .lead-table-stage-lost").first()).toHaveText("Blocked");
  await page.locator("#leadList [data-lead-id]").first().click();
  await expect(page.locator("#leadDetailView")).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});
