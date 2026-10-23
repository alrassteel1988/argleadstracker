const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const css = read("crm-controls.css");
const icons = read("crm-icons.css");
const html = read("index.html");
const vercel = JSON.parse(read("vercel.json"));
const worker = read("sw.js");

assert.ok(html.indexOf('/crm-icons.css?v=') > html.indexOf('/crm-theme.css?v='));
assert.ok(html.indexOf('/crm-controls.css?v=') > html.indexOf('/crm-icons.css?v='));
assert.ok(html.indexOf('/mobile-ui.css?v=') > html.indexOf('/crm-controls.css?v='), "Mobile guard must stay last");
for (const file of ["crm-icons.css", "crm-controls.css"]) {
  assert.ok(vercel.builds.some(item => item.src === file && item.use === "@vercel/static"));
  assert.ok(vercel.routes.some(item => item.src === `/${file}` && item.dest === `/${file}`));
  assert.ok(worker.includes(`"/${file}"`));
}

const declarations = [...icons.matchAll(/--crm-icon-([a-z-]+): url\("data:image\/svg\+xml,([^"]+)"\)/g)];
assert.equal(declarations.length, 40, "Bundle only the selected static icon subset");
const names = new Set(declarations.map(match => match[1]));
for (const match of declarations) {
  const svg = decodeURIComponent(match[2]);
  assert.match(svg, /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/);
  assert.doesNotMatch(svg, /<script|<foreignObject|(?:href|onload|onclick)=|https?:\/\/(?!www\.w3\.org\/2000\/svg)/i);
}
for (const reference of css.matchAll(/var\(--crm-icon-([a-z-]+)\)/g)) assert.ok(names.has(reference[1]), `Defined icon ${reference[1]}`);
assert.match(read("assets/icons/LICENSE"), /ISC License/);
assert.match(css, /pointer-events:\s*none/, "Decorative icons cannot intercept existing click targets");
assert.match(css, /content:\s*""/, "Decorative masks must not add screen-reader label text");
assert.doesNotMatch(css, /\.hidden\s*\{/, "Do not change functional visibility rules");
assert.doesNotMatch(css, /(?:backdrop-filter|filter):\s*blur|rgba\(|gradient\(/, "Controls remain opaque and crisp");
assert.match(css, /\.field--required-empty\s*\{[^}]*1\.5px solid var\(--crm-health-amber\)[^}]*var\(--crm-health-amber-soft\)/s);
assert.match(css, /\.field--filled\s*\{[^}]*1\.5px solid var\(--crm-health-green\)[^}]*var\(--crm-health-green-soft\)/s);
assert.match(css, /\[aria-invalid="true"\][^}]*var\(--crm-health-red\)/s);
assert.match(css, /:disabled\s*\{[^}]*var\(--crm-text-secondary\)[^}]*opacity:\s*1/s);
assert.match(css, /:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--crm-focus\)/s);
assert.match(css, /@media \(max-width: 720px\)[\s\S]*min-height:\s*44px[\s\S]*font-size:\s*16px\s*!important/s);
assert.match(css, /@media \(max-width: 720px\)[\s\S]*\.panel-collapse-toggle\s*\{[^}]*min-width:\s*44px\s*!important[^}]*min-height:\s*44px\s*!important/s);
assert.match(css, /\.dialog-form button\.primary-button\[type="submit"\]/, "Only primary submit buttons get amber, never destructive submits");
let depth = 0;
for (const char of css.replace(/\/\*[\s\S]*?\*\//g, "")) {
  if (char === "{") depth += 1;
  if (char === "}") depth -= 1;
  assert.ok(depth >= 0);
}
assert.equal(depth, 0, "Shared control rules must balance");
console.log("PASS shared CRM controls, static icons, validation and mobile contracts");
