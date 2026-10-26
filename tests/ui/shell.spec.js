const { test, expect } = require("@playwright/test");
const { phase, capture, login, blockExternalTraffic } = require("./helpers");

test.beforeEach(async ({ page }) => blockExternalTraffic(page));

test("all CRM pages share the approved responsive artwork behind clean cards", async ({page}, info) => {
  test.setTimeout(120000);
  const role = await login(page, info);
  const mobile = info.project.name.endsWith("mobile");
  const expected = `crm-silk-white-${mobile ? "mobile" : "desktop"}.png`;
  for (const view of ["dashboard", "pipeline", "tasks", "ai-actions", "focus", "neglected", "meeting-prep", "draft-email", ...(role === "admin" ? ["salesmen", "activity"] : [])]) {
    await page.goto(`/?view=${view}`);
    await expect(page.locator("#appShell > .main")).toBeVisible();
    await expect(page.locator("#appShell > .main")).toHaveCSS("background-image", new RegExp(expected.replaceAll(".", "\\.")));
    await expect(page.locator("#appShell > .main")).toHaveCSS("background-size", "cover");
    await expect(page.locator("#appShell > .main")).toHaveCSS("background-repeat", "no-repeat");
    if (["meeting-prep", "draft-email"].includes(view)) {
      await page.locator("#aiWorkspaceCompany").selectOption("ui-lead-1");
      const card = page.locator(view === "meeting-prep" ? ".meeting-talking" : ".email-editor");
      await expect(card).toHaveCSS("background-image", "none");
      await expect(card).toHaveCSS("background-color", "rgb(255, 255, 255)");
      await capture(page, info, `76-background-${view}`, {fullPage:false});
    }
  }
  await page.goto("/leads/ui-lead-1");
  await expect(page.locator("#appShell > .main")).toHaveCSS("background-image", new RegExp(expected.replaceAll(".", "\\.")));
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test("login displays the approved Al Ras Steel logo on desktop and mobile", async ({ page }, info) => {
  await page.goto("/");
  await expect(page.locator("#loginForm")).toBeVisible();
  const logo = page.locator("#authScreen .auth-brand .crm-brand-image");
  await expect(logo).toBeVisible();
  await expect(logo).toHaveAttribute("src", "/assets/brand/al-ras-steel-white-logo.png");
  await expect(logo).toHaveAttribute("alt", "Al Ras Steel");
  await expect.poll(() => logo.evaluate(image => image.complete && image.naturalWidth === 2400 && image.naturalHeight === 1511)).toBe(true);
  const bounds = await logo.boundingBox();
  const mobile = info.project.name.endsWith("mobile");
  expect(bounds.width).toBe(mobile ? 128 : 264);
  await expect(logo).toHaveCSS("clip-path", "polygon(0px 0px, 100% 0px, 100% 58%, 20% 58%, 20% 100%, 0px 100%)");
  expect(bounds.height).toBeGreaterThanOrEqual(64);
  expect(bounds.width / bounds.height).toBeCloseTo(2400 / 1511, 1);
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize().width);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(page.viewportSize().height);
  await expect(page.locator("#authScreen .auth-hero")).toHaveCSS("background-color", "rgb(7, 25, 43)");
  await expect(page.locator('.auth-footer a')).toHaveAttribute("href", "mailto:glory@alrassteel.com");
  await expect(page.locator('.auth-footer')).toBeInViewport();
  await expect(page.locator('#loginForm input[type="checkbox"]')).toHaveCount(0);
  const password = page.locator('#loginPassword');
  await password.fill("SyntheticUiOnly123!");
  await page.getByRole("button", {name:"Show password", exact:true}).click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(password).toHaveValue("SyntheticUiOnly123!");
  await page.getByRole("button", {name:"Hide password", exact:true}).click();
  await expect(password).toHaveAttribute("type", "password");
  await password.fill("");
  expect(await page.locator('#loginForm').evaluate(form => [...new FormData(form).keys()])).toEqual(["email", "password"]);
  if (mobile) {
    await expect(page.locator('.auth-hero-copy')).toBeHidden();
    await expect(page.locator('.auth-stats')).toBeHidden();
    await expect(page.locator('#loginForm')).toHaveCSS("border-top-left-radius", "24px");
    await page.setViewportSize({width:390,height:844});
    await expect(page.locator('.auth-footer')).toBeInViewport();
    await capture(page, info, "00-login-reference-390", {fullPage:false});
    await page.setViewportSize({width:320,height:568});
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.locator('.auth-footer').scrollIntoViewIfNeeded();
    await expect(page.locator('.auth-footer')).toBeInViewport();
    await page.setViewportSize({width:375,height:812});
    await page.evaluate(() => scrollTo(0, 0));
  } else {
    const hero = await page.locator('.auth-hero').boundingBox();
    const form = await page.locator('#loginForm').boundingBox();
    expect(hero.width).toBeCloseTo(form.width, 0);
    expect(form.x).toBeCloseTo(hero.width, 0);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await capture(page, info, "00-login-logo", {fullPage:false});
});

test("shared shell branding, navigation and existing management actions", async ({ page }, info) => {
  const role = await login(page, info);
  const mobile = info.project.name.endsWith("mobile");
  const brand = await page.locator('#mobileSidebar .crm-brand-image').evaluate(image => ({
    loaded: image.complete && image.naturalWidth === 2400,
    source: image.getAttribute("src")
  }));
  expect(brand.loaded).toBe(true);
  expect(brand.source).toBe("/assets/brand/al-ras-steel-white-logo.png");
  await expect(page.locator('#mobileSidebar .nav-item.active')).toHaveCSS("border-radius", "10px");
  await expect(page.locator('#mobileSidebar .nav-item.active .nav-item-icon')).toBeVisible();
  await expect(page.locator('#openLeadForm')).toHaveCSS("border-radius", "10px");
  await expect(page.locator('#topbarPageTitle em')).toHaveText(role === "admin" ? "Dashboard" : "today?");
  if (mobile && role === "salesman") await page.locator("[data-dashboard-search]").click();
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
    expect(width).toBe(232);
  }
  const menuLogo = page.locator("#mobileSidebar .crm-brand-image");
  await expect(menuLogo).toHaveAttribute("alt", "Al Ras Steel");
  await expect(menuLogo).toHaveCSS("clip-path", "polygon(0px 0px, 100% 0px, 100% 58%, 20% 58%, 20% 100%, 0px 100%)");
  const menuLogoBounds = await menuLogo.boundingBox();
  expect(menuLogoBounds.width).toBeGreaterThan(128);
  const sidebarBounds = await page.locator("#mobileSidebar").boundingBox();
  expect(menuLogoBounds.x + menuLogoBounds.width).toBeLessThanOrEqual(sidebarBounds.x + sidebarBounds.width);
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
      if (action === "alerts" && role === "salesman") {
        await page.locator(".salesman-dashboard-more-tools > summary").click();
        await page.locator("[data-dashboard-alerts]").click();
      } else await page.locator(`#mobileTabs [data-mobile-action="${action}"]`).click();
      await expect(page.locator(`#${dialog}`)).toBeVisible();
      await capture(page, info, `11-mobile-${action}`);
      await page.locator(`#${close}`).click();
      await expect(page.locator(`#${dialog}`)).toBeHidden();
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  }
});
