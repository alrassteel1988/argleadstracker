const assert = require("assert");
const fs = require("fs");
const http = require("http");
const path = require("path");
const server = require("../server");
const {
  CONTENT_SECURITY_POLICY,
  SECURITY_HEADERS
} = require("../src/config/securityHeaders");

function request(port, pathname) {
  return new Promise((resolve, reject) => {
    const req = http.get({
      hostname: "127.0.0.1",
      port,
      path: pathname
    }, response => {
      response.resume();
      response.on("end", () => resolve(response));
    });
    req.on("error", reject);
  });
}

async function run() {
  const vercelConfig = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "vercel.json"), "utf8"));
  const catchAll = vercelConfig.routes.find(route => route.src === "/(.*)" && route.continue === true);

  assert(catchAll, "Vercel must apply security headers before static and API routes");
  Object.entries(SECURITY_HEADERS).forEach(([name, value]) => {
    assert.strictEqual(catchAll.headers[name], value, `${name} must match the shared server policy`);
  });

  assert.match(CONTENT_SECURITY_POLICY, /default-src 'self'/);
  assert.match(CONTENT_SECURITY_POLICY, /object-src 'self'/);
  assert.match(CONTENT_SECURITY_POLICY, /frame-ancestors 'none'/);
  assert.match(CONTENT_SECURITY_POLICY, /form-action 'self'/);
  assert.match(CONTENT_SECURITY_POLICY, /script-src 'self' https:\/\/cdnjs\.cloudflare\.com/);
  assert.doesNotMatch(
    CONTENT_SECURITY_POLICY.match(/script-src [^;]+/)?.[0] || "",
    /'unsafe-inline'/,
    "Inline JavaScript must remain blocked"
  );

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  try {
    const port = server.address().port;
    for (const pathname of ["/", "/api/health"]) {
      const response = await request(port, pathname);
      Object.entries(SECURITY_HEADERS).forEach(([name, value]) => {
        assert.strictEqual(
          response.headers[name.toLowerCase()],
          value,
          `${pathname} must return ${name}`
        );
      });
    }
  } finally {
    await new Promise(resolve => server.close(resolve));
  }

  console.log("Security header tests passed");
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
