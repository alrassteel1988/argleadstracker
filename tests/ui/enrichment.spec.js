const { test, expect } = require("@playwright/test");
const { capture, login, blockExternalTraffic } = require("./helpers");

async function manualRegistration({ page }, info) {
  await blockExternalTraffic(page);
  const role = await login(page, info);
  await page.goto("/?view=pipeline");
  let release, seen;
  const ready = new Promise(resolve => { seen = resolve; });
  const pending = new Promise(resolve => { release = resolve; });
  await page.route("**/api/leads/enrich-company", async route => {
    seen();
    await pending;
    await route.fulfill({ json: { enrichment: { company_name: "Unrelated Synthetic Steel", google_place_id: "unwanted-place",
      website: "https://unrelated.example", address: "Unwanted synthetic address", enrichment_status: "enriched" } } });
  });
  await page.locator("#openLeadForm:visible, #salesmanSimplifiedAddLead:visible").first().click();
  const form = page.locator("#leadForm");
  await expect(form.locator("#leadGoogleLookup")).toBeChecked();
  await form.locator('[name="company_name"]').fill("Amber Harbor Manual Fixture");
  await ready;
  await form.locator("#leadGoogleLookup").uncheck();
  await form.locator('[data-lead-details-toggle="company"]').click();
  await form.locator('[name="website"]').fill("https://amber-harbor.example");
  await form.locator('[name="company_name"]').fill("Amber Harbor Manual Fixture Final");
  if (role === "admin") await form.locator("#formSalesman").selectOption({ label: "Demo Salesman" });
  const returned = page.waitForResponse(response => response.url().endsWith("/api/leads/enrich-company"));
  release();
  await returned;
  await expect(form.locator("#leadEnrichmentStatus")).toContainText("Manual entry");
  await expect(form.locator('[name="company_name"]')).toHaveValue("Amber Harbor Manual Fixture Final");
  await expect(form.locator('[name="website"]')).toHaveValue("https://amber-harbor.example");
  await expect(form.locator('[name="google_place_id"]')).toHaveValue("");
  await expect(form.locator('[name="address"]')).toHaveValue("");
  const width = await form.locator(".enrichment-strip").evaluate(node => ({ overflow: node.scrollWidth - node.clientWidth,
    pageOverflow: document.documentElement.scrollWidth - innerWidth }));
  expect(width.overflow).toBeLessThanOrEqual(1);
  expect(width.pageOverflow).toBeLessThanOrEqual(1);
  await capture(page, info, "manual-lead-company", { fullPage: false });
  await form.locator("#leadStepNext").click();
  await expect(form.locator("#formStage")).toHaveValue("NEW");
  await expect(form.locator("#formStage option:checked")).toHaveText("Prospect");
  await form.locator("#leadStepNext").click();
  if (role === "salesman") {
    await expect(form.locator('[name="next_action"]')).toHaveValue("");
    await expect(form.locator('[name="next_action_date"]')).toHaveValue("");
  } else {
    await expect(form.locator('[name="initial_management_task_title"]')).toHaveValue("New Lead Outreach");
  }
  await capture(page, info, "manual-lead-step3", { fullPage: false });
  const saved = page.waitForResponse(response => response.url().endsWith("/api/leads") && response.request().method() === "POST");
  await form.locator("#leadSubmitButton").click();
  const response = await saved;
  const lead = await response.json();
  expect(response.status(), JSON.stringify(lead)).toBe(201);
  expect(lead.company_name).toBe("Amber Harbor Manual Fixture Final");
  expect(lead.website).toBe("https://amber-harbor.example");
  expect(lead.enrichment_source).toBe("manual");
  expect(lead.enrichment_status).toBe("pending");
  expect(lead.google_place_id || "").toBe("");
  expect(lead.google_maps_url || "").toBe("");
  expect((lead.activities || []).filter(item => item.reminder)).toHaveLength(0);
  await expect(form).toBeHidden();
  const persisted = await page.evaluate(id => api(`/api/leads/${id}`), lead.id);
  expect(persisted.company_name).toBe("Amber Harbor Manual Fixture Final");
}

test("cancel rejects the entire suggestion without hidden Google identity", async ({ page }, info) => {
  await blockExternalTraffic(page);
  await login(page, info);
  await page.goto("/?view=pipeline");
  let release, seen;
  const ready = new Promise(resolve => { seen = resolve; });
  const pending = new Promise(resolve => { release = resolve; });
  await page.route("**/api/leads/enrich-company", async route => {
    seen();
    await pending;
    await route.fulfill({ json: { enrichment: { company_name: "Silver Crescent Fabrication LLC",
      website: "https://suggested.example", address: "Suggested fixture site", phone: "+971 4 000 0000",
      google_place_id: "suggested-place", enrichment_status: "enriched" } } });
  });
  await page.locator("#openLeadForm:visible, #salesmanSimplifiedAddLead:visible").first().click();
  const form = page.locator("#leadForm");
  await form.locator('[name="company_name"]').fill("Silver Crescent Fabrication");
  await ready;
  await form.locator('[data-lead-details-toggle="company"]').click();
  await form.locator('[name="website"]').fill("https://verified-manual.example");
  const cancelled = new Promise(resolve => page.once("dialog", async dialog => { await dialog.dismiss(); resolve(); }));
  release();
  await cancelled;
  await expect(form.locator("#leadEnrichmentStatus")).toContainText("not applied");
  await expect(form.locator('[name="company_name"]')).toHaveValue("Silver Crescent Fabrication");
  await expect(form.locator('[name="website"]')).toHaveValue("https://verified-manual.example");
  await expect(form.locator('[name="google_place_id"]')).toHaveValue("");
  await expect(form.locator('[name="address"]')).toHaveValue("");
  await capture(page, info, "cancelled-enrichment", { fullPage: false });
});

test("manual registration ignores a pending lookup and saves only the entered company", manualRegistration);
