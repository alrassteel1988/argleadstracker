const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const css = fs.readFileSync(path.join(root, "crm-theme.css"), "utf8");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const vercel = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
const token = name => css.match(new RegExp(`--crm-${name}:\\s*([^;]+);`))?.[1].trim();

function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map(value => {
    const channel = parseInt(value, 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(first, second) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

for (const [name, value] of Object.entries({
  navy: "#083D77", white: "#FEFCFD", teal: "#5BC0BE", amber: "#FFB100",
  "gold-heading": "#B87A00", "sidebar-start": "#0F2B47", "sidebar-end": "#07192B"
})) assert.equal(token(name), value, `Approved ${name} token`);

for (const [foreground, background] of [
  ["navy", "white"], ["text", "white"], ["text-secondary", "white"],
  ["navy", "amber"], ["white", "navy"], ["amber", "sidebar-start"],
  ["health-red", "health-red-soft"], ["health-amber", "health-amber-soft"],
  ["health-green", "health-green-soft"]
]) assert.ok(contrast(token(foreground), token(background)) >= 4.5, `${foreground} on ${background} must pass AA`);

assert.ok(contrast(token("gold-heading"), token("white")) >= 3, "Gold is reserved for AA large headings");
assert.ok(contrast(token("gold-heading"), token("white")) < 4.5, "Do not advertise gold as normal-text AA");
assert.equal(token("font-ui"), '"Inter", sans-serif');
assert.equal(token("font-title"), '"Playfair Display", Georgia, serif');
assert.match(css, /--font-display: var\(--crm-font-ui\)/, "Legacy display token also styles UI labels; reserve serif for explicit page titles");
assert.match(index, /Playfair\+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700/);
assert.ok(index.lastIndexOf('/crm-theme.css?v=') > index.lastIndexOf('/bauhaus-global.css?v='), "Canonical foundation must follow legacy theme definitions");
assert.ok(index.lastIndexOf('/mobile-ui.css?v=') > index.lastIndexOf('/crm-theme.css?v='), "Preserve the final mobile safety layer");
assert.doesNotMatch(css, /body\.(?:admin|salesman|salesperson)[^{]*\{/i, "Both roles share one token layer");

const assets = {
  "assets/brand/crm-silk-white-desktop.png": "701c12d03cbf49733a6236c1b723aba50bb1078c340ca7bc818027898ac643cc",
  "assets/brand/crm-silk-white-mobile.png": "ab182a144e6624c25bd30253b8a01ea50e6c28a4dc0d6ee19ae821775f3de181",
  "assets/brand/al-ras-steel-white-logo.png": "51a19082381c3b09bac131c95112828ed0d132bd812f4973d495f3b9e2c3e536"
};
for (const [file, hash] of Object.entries(assets)) {
  assert.equal(crypto.createHash("sha256").update(fs.readFileSync(path.join(root, file))).digest("hex"), hash, `Preserve original ${file}`);
}
for (const file of ["crm-theme.css", ...Object.keys(assets)]) {
  assert.ok(vercel.builds.some(build => build.src === file && build.use === "@vercel/static"), `Explicit build ${file}`);
  assert.ok(vercel.routes.some(route => route.src === `/${file}` && route.dest === `/${file}`), `Explicit route ${file}`);
  assert.ok(worker.includes(`"/${file}"`), `Cache only approved public asset ${file}`);
}
assert.match(worker, /if \(url\.pathname\.startsWith\("\/api\/"\)\) return;/, "Keep API responses outside service-worker caching");
console.log("PASS revised CRM design tokens, artwork provenance, contrast and asset contracts");
