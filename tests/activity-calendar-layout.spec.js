const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const stylesheet = ["styles.css", "activity-readability.css", "activity-dashboard-latest.css"]
  .map(file => fs.readFileSync(path.join(root, file), "utf8"))
  .join("\n");

const viewports = [
  { width: 1920, height: 1080 }, { width: 1440, height: 900 },
  { width: 1280, height: 800 }, { width: 1024, height: 768 },
  { width: 768, height: 900 }, { width: 390, height: 844 }
];

function dashboardMarkup() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    .map((day, index) => `<button type="button" class="activity-day-chip ${index === 0 ? "overdue" : "neutral"}"><strong>${day}</strong><span>${index + 1}</span><small>${index ? "No items" : "3 items"}</small></button>`).join("");
  const logRows = Array.from({ length: 12 }, (_, index) => `<button type="button" class="activity-table-row" data-log-action="${index}">Log row ${index + 1}</button>`).join("");
  const reminderRows = Array.from({ length: 12 }, (_, index) => `<button type="button" class="reminder-card ${index % 2 ? "upcoming" : "overdue"}" data-reminder-action="${index}">Reminder row ${index + 1}</button>`).join("");
  return `<style>${stylesheet}</style><div class="app-shell"><aside class="sidebar"></aside><main class="main"><div id="activityView"><div class="activity-dashboard"><div class="activity-main-column"><div class="activity-kpi-grid"><div class="activity-kpi-card">KPI</div></div><section class="panel activity-card activity-weekly-card"><div class="activity-section-header"><h2>Weekly Calendar</h2></div><div class="activity-weekly-log"><div class="calendar-legend">Legend</div><div class="activity-day-strip">${days}</div></div></section><div class="activity-secondary-grid"><section class="panel activity-card activity-log-panel"><div class="activity-section-header"><h2>Activity Log</h2></div><div class="activity-feed"><div class="activity-table-scroll">${logRows}</div></div></section><section class="panel activity-side-panel activity-reminders-panel"><div class="activity-section-header"><h2>Reminders</h2></div><div id="activityReminders">${reminderRows}</div></section></div></div></div></div></main></div>`;
}

function intersects(first, second) {
  return first.left < second.right && first.right > second.left && first.top < second.bottom && first.bottom > second.top;
}

test("Admin Activity calendar does not overlap the log or reminders", async ({ page }) => {
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.setContent(dashboardMarkup());
    await page.evaluate(() => { document.body.className = "activity-mode activity-admin-mode"; });
    const geometry = await page.evaluate(() => {
      const box = selector => {
        const { left, top, right, bottom } = document.querySelector(selector).getBoundingClientRect();
        return { left, top, right, bottom };
      };
      return {
        calendar: box(".activity-weekly-card"), log: box(".activity-log-panel"), reminders: box(".activity-reminders-panel"),
        dayCount: document.querySelectorAll(".activity-day-chip").length,
        emptyDayCount: [...document.querySelectorAll(".activity-day-chip small")].filter(node => node.textContent === "No items").length
      };
    });
    expect(intersects(geometry.calendar, geometry.log), `${viewport.width}px calendar/log overlap`).toBeFalsy();
    expect(intersects(geometry.calendar, geometry.reminders), `${viewport.width}px calendar/reminders overlap`).toBeFalsy();
    expect(intersects(geometry.log, geometry.reminders), `${viewport.width}px log/reminders overlap`).toBeFalsy();
    expect(geometry.dayCount, `${viewport.width}px all weekly columns render`).toBe(7);
    expect(geometry.emptyDayCount, `${viewport.width}px empty states remain`).toBe(6);
    for (const selector of ["[data-log-action='0']", "[data-log-action='11']", "[data-reminder-action='0']", "[data-reminder-action='11']"]) {
      const row = page.locator(selector);
      await row.scrollIntoViewIfNeeded();
      await expect(row, `${viewport.width}px ${selector} remains visible`).toBeVisible();
      await row.click();
    }
    if (viewport.width <= 1024) {
      expect(geometry.log.top, `${viewport.width}px log follows calendar`).toBeGreaterThanOrEqual(geometry.calendar.bottom);
      expect(geometry.reminders.top, `${viewport.width}px reminders follow log`).toBeGreaterThanOrEqual(geometry.log.bottom);
    }
  }
});
