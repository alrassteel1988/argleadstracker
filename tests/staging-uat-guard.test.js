const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const uatSource = fs.readFileSync(path.join(__dirname, "production-salesman-add-lead.spec.js"), "utf8");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

assert.match(uatSource, /process\.env\.STAGING_BASE_URL/, "mutable browser UAT must require an explicit staging URL");
assert.match(uatSource, /Refusing to run mutable UAT against production/, "mutable browser UAT must reject the production host");
assert.match(uatSource, /TEST_SUPABASE_URL/, "mutable browser UAT must require an isolated Supabase project URL");
assert.match(uatSource, /Refusing to run mutable UAT while any configured Supabase URL is the production project/, "mutable browser UAT must reject production Supabase configuration");
assert.doesNotMatch(uatSource, /PRODUCTION_BASE_URL\s*\|\|\s*["']https:\/\/argleadstracker\.vercel\.app/, "the UAT must not default to production");
assert.ok(packageJson.scripts["test:staging:add-lead"], "the staging UAT command must be available");
assert.equal(packageJson.scripts["test:prod:add-lead"], undefined, "no mutable production UAT command may remain");

console.log("PASS staging UAT production guard");
