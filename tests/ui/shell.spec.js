const { test, expect } = require("@playwright/test");
const { phase, capture, login, blockExternalTraffic } = require("./helpers");

test.beforeEach(async ({ page }) => blockExternalTraffic(page));

test("shared shell branding, navigation and existing management actions", async ({ page }, info) => {
  const role = await login(page, info);
  const mobile = info.project.name.endsWith("mobile");
  const brand = await page.locator('#mobileSidebar .crm-brand-image').evaluate(image => ({
    loaded: image.complete && image.naturalWidth === 2400,
    source: image.getAttribute("src")
  }));
  expect(brand.loaded).toBe(true);
  expect(brand.source).toBe("/assets/brand/al-ras-steel-white-logo.png");
  await expect(page.locator('#topbarPageTitle em')).toHaveText("Dashboard");
  const placesColors = await page.locator("#openPlacesSearch").evaluate(button => ({
    background: getComputedStyle(button).backgroundColor,
    foreground: getComputedStyle(button).color
  }));
  expect(placesColors.background).toBe("rgb(254, 252, 253)");
  expect(placesColors.foreground).toBe("rgb(8, 61, 119)");
  await page.locator("#smartSearchInput").fill("Synthetic Steel Company 01");
  await expect(page.locator("#smartSearchPanel")).toBeVisible();
  await expect(page.locator("#smartSearchPanel")).toContainText("Synthetic Steel Company 01");
  await page.locator("#smartSearchInput").fill("");
  await expect(page.locator("#smartSearchPanel")).toBeHidden();
  if (mobile) {
    await page.locator("#mobileMenuToggle").click();
    await expect(page.locator("#mobileMenuToggle")).toHaveAttribute("aria-expanded", "true");
    await expect.poll(async () => Math.abs((await page.locator("#mobileSidebar").boundingBox()).x)).toBeLessThanOrEqual(1);
    const navigationTargets = await page.locator("#mobileSidebar .nav-item:visible").evaluateAll(elements => elements.map(element => ({
      name: element.textContent.trim(),
      height: element.getBoundingClientRect().height
    })));
    expect(navigationTargets.length).toBeGreaterThanOrEqual(5);
    for (const target of navigationTargets) expect(target.height, target.name).toBeGreaterThanOrEqual(44);
  } else {
    const width = await page.locator("#mobileSidebar").evaluate(element => element.getBoundingClientRect().width);
    expect(width).toBe(188);
  }
  if (role === "admin") {
    await expect(page.locator("#configAgentExamples")).not.toContainText(/whats\s*app/i);
    await expect(page.locator("#configAgentExamples")).toContainText("Add Qatar to territories");
    await page.locator("#sidebarToolsMenu > summary").click();
    await page.locator("#openSalesmanForm").click();
    await expect(page.locator("#salesmanDialog")).toBeVisible();
    await capture(page, info, "10-create-salesman");
    await page.locator("#closeSalesmanForm").click();
    await expect(page.locator("#salesmanDialog")).toBeHidden();
  } else {
    await expect(page.locator("#sidebarToolsMenu")).toBeHidden();
    await expect(page.locator("#openSalesmanForm")).toBeHidden();
  }
  await capture(page, info, "10-shell-navigation");
  if (!mobile) {
    for (const [width, height] of [[1280, 800], [1152, 720], [960, 600]]) {
      await page.setViewportSize({ width, height });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      expect(overflow).toBeLessThanOrEqual(1);
      if (width <= 1024) await expect(page.locator("#mobileMenuToggle")).toBeVisible();
      await capture(page, info, `12-shell-${width}`);
    }
    await page.setViewportSize({ width: 1440, height: 900 });
  }
  if (mobile) {
    await page.locator("#closeMobileSidebar").click();
    await expect(page.locator("#mobileMenuToggle")).toHaveAttribute("aria-expanded", "false");
    await page.locator('#mobileTabs [data-view="pipeline"]').click();
    await expect(page.locator("#leadList table")).toBeVisible();
    await page.locator('#mobileTabs [data-view="dashboard"]').click();
    await expect(page.locator("#dashboardView")).toBeVisible();
    for (const [action, dialog, close] of [
      ["quick-log", "quickLogDialog", "closeQuickLog"],
      ["map", "mobileMapDialog", "closeMobileMap"],
      ["alerts", "pendingChangesDialog", "closePendingChanges"]
    ]) {
      await page.locator(`#mobileTabs [data-mobile-action="${action}"]`).click();
      await expect(page.locator(`#${dialog}`)).toBeVisible();
      await capture(page, info, `11-mobile-${action}`);
      await page.locator(`#${close}`).click();
      await expect(page.locator(`#${dialog}`)).toBeHidden();
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  }
});
