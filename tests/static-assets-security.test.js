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
    assert.ok(
      vercel.routes.some(route => route.src === "/leads/([^/]+)/?" && route.dest === "/index.html"),
      "Vercel must retain the lead-detail SPA fallback"
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
