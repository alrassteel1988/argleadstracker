const os = require("node:os");
const path = require("node:path");
const { defineConfig } = require("@playwright/test");

const port = Number(process.env.CRM_UI_TEST_PORT || 4179);
if (!Number.isInteger(port) || port < 1024 || port > 65532) throw new Error("Invalid fixture port range");
const baseURL = `http://127.0.0.1:${port}`;
const suite = process.env.CRM_UI_SUITE || "baseline";
if (!["baseline", "shell"].includes(suite)) throw new Error("Invalid UI suite");
const profiles = ["admin-desktop", "salesman-desktop", "admin-mobile", "salesman-mobile"];

module.exports = defineConfig({
  testDir: "./tests/ui",
  testMatch: suite === "shell" ? "shell.spec.js" : "baseline.spec.js",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  reporter: "list",
  outputDir: path.join(os.tmpdir(), "arg-crm-ui-playwright-results"),
  use: {
    baseURL,
    browserName: "chromium",
    timezoneId: "Asia/Dubai",
    locale: "en-GB",
    serviceWorkers: "block",
    trace: "retain-on-failure"
  },
  projects: profiles.map((name, index) => ({
    name,
    use: {
      baseURL: `http://127.0.0.1:${port + index}`,
      viewport: name.endsWith("mobile") ? { width: 375, height: 812 } : { width: 1440, height: 900 },
      isMobile: name.endsWith("mobile"),
      hasTouch: name.endsWith("mobile")
    }
  })),
  // Isolate storage and normal rate-limit buckets per role/viewport. Do not weaken
  // runtime limits just because a browser suite visits many routes quickly.
  webServer: profiles.map((_, index) => ({
    command: "node tests/ui/fixture-server.js",
    url: `http://127.0.0.1:${port + index}/api/health`,
    reuseExistingServer: false,
    timeout: 30000,
    env: { CRM_UI_TEST_PORT: String(port + index) }
  }))
});
