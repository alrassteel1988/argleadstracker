const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const server = require("../server");

const publicRequests = [
  ["/", "text/html"],
  ["/index.html", "text/html"],
  ["/leads/lead-1001?tab=activities", "text/html"],
  ["/client.js?v=test", "text/javascript"],
  ["/styles.css?v=test", "text/css"],
  ["/manifest.json", "application/json"],
  ["/favicon.svg", "image/svg+xml"],
  ["/icons/icon-192.png", "image/png"],
  ["/sw.js", "text/javascript"]
];

const blockedRequests = [
  "/server.js",
  "/supabase-client.js",
  "/package.json",
  "/vercel.json",
  "/README.md",
  "/.env",
  "/.git/config",
  "/data/db.json",
  "/src/services/aiSalesAssistantService.js",
  "/functions/agentQuery.js",
  "/tests/role-access.test.js",
  "/supabase/migrations/20260724120000_ai_sales_assistant.sql",
  "/artifacts/ai-sales-assistant-mobile.png",
  "/admin",
  "/unknown.css"
];

async function run() {
  await new Promise((resolve, reject) => {
    const onError = error => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.off("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(0, "127.0.0.1");
  });

  const address = server.address();
  const origin = `http://127.0.0.1:${address.port}`;

  try {
    for (const [requestPath, expectedType] of publicRequests) {
      const response = await fetch(`${origin}${requestPath}`);
      assert.strictEqual(response.status, 200, `${requestPath} should be public`);
      assert.match(
        response.headers.get("content-type") || "",
        new RegExp(expectedType.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
        `${requestPath} should use ${expectedType}`
      );
    }

    for (const requestPath of blockedRequests) {
      const response = await fetch(`${origin}${requestPath}`);
      const body = await response.text();
      assert.strictEqual(response.status, 404, `${requestPath} must not be publicly served`);
      assert.strictEqual(body, "Not found", `${requestPath} must not disclose file content`);
    }

    const vercel = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
    assert.ok(
      !vercel.routes.some(route => route.src === "/(.*)" && route.dest === "server.js"),
      "Vercel must not route arbitrary paths to the Node server"
    );
    const apiHealthIndex = vercel.routes.findIndex(route => route.src === "/api/(.*)" && route.dest === "server.js");
    const clientJsIndex = vercel.routes.findIndex(route => route.src === "/client.js" && route.dest === "/client.js");
    const swIndex = vercel.routes.findIndex(route => route.src === "/sw.js" && route.dest === "/sw.js");
    const cssIndex = vercel.routes.findIndex(route => route.src === "/styles.css" && route.dest === "/styles.css");
    const manifestIndex = vercel.routes.findIndex(route => route.src === "/manifest.json" && route.dest === "/manifest.json");
    const iconIndex = vercel.routes.findIndex(route => route.src === "/icons/icon-192.png" && route.dest === "/icons/icon-192.png");
    const fallbackIndex = vercel.routes.findIndex(route => route.src === "/(.*)" && route.dest === "/index.html");

    assert.ok(apiHealthIndex >= 0, "Vercel must route API requests to the Node server");
    assert.ok(clientJsIndex >= 0, "Vercel must expose client.js as a real static asset");
    assert.ok(swIndex >= 0, "Vercel must expose the service worker as a real static asset");
    assert.ok(cssIndex >= 0, "Vercel must expose CSS assets as real static files");
    assert.ok(manifestIndex >= 0, "Vercel must expose the manifest as a real static asset");
    assert.ok(iconIndex >= 0, "Vercel must expose icons as real static assets");
    assert.ok(fallbackIndex >= 0, "Vercel must retain a final SPA fallback for nested client-side routes");
    assert.ok(apiHealthIndex < fallbackIndex, "API routes must be evaluated before the SPA fallback");
    assert.ok(clientJsIndex < fallbackIndex, "client.js must be evaluated before the SPA fallback");
    assert.ok(swIndex < fallbackIndex, "sw.js must be evaluated before the SPA fallback");
    assert.ok(cssIndex < fallbackIndex, "CSS assets must be evaluated before the SPA fallback");
    assert.ok(manifestIndex < fallbackIndex, "manifest.json must be evaluated before the SPA fallback");
    assert.ok(iconIndex < fallbackIndex, "icons must be evaluated before the SPA fallback");
    assert.ok(
      vercel.routes.filter(route => route.src === "/(.*)" && route.dest === "/index.html").length === 1,
      "Vercel must use one final SPA fallback"
    );
    assert.ok(
      !vercel.crons.some(cron => cron.path === "/api/cron/process-lead-intelligence"),
      "The retired lead-intelligence cron route must remain removed"
    );
    assert.ok(
      vercel.routes.some(route => route.src === "/manifest.json" && route.dest === "/manifest.json"),
      "Vercel must serve the PWA manifest explicitly"
    );
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

run()
  .then(() => console.log("PASS public static asset allowlist"))
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
    if (server.listening) server.close();
  });
