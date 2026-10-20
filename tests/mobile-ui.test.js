const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const css = fs.readFileSync(path.join(root, "mobile-ui.css"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const client = fs.readFileSync(path.join(root, "client.js"), "utf8");
const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
const serviceWorker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const vercel = fs.readFileSync(path.join(root, "vercel.json"), "utf8");

assert.match(html, /href="\/mobile-ui\.css\?v=1"/, "The final mobile CSS layer must load in the app shell");
assert.match(html, /class="mobile-tabs hidden" id="mobileTabs"/, "Mobile navigation must remain unavailable before sign-in");
assert.match(client, /els\.mobileTabs\?\.classList\.add\("hidden"\)/, "Sign-out must hide mobile navigation");
assert.match(client, /els\.mobileTabs\?\.classList\.remove\("hidden"\)/, "Successful sign-in must reveal mobile navigation");
assert.match(css, /@media \(max-width: 720px\)/, "Shared phone breakpoint must be defined");
assert.match(css, /\.auth-hero h1\s*\{[\s\S]*?font-size:\s*clamp\(28px, 8\.2vw, 34px\)/, "Mobile login hero must use a compact readable heading scale");
assert.match(css, /\.topbar-actions\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/, "Header actions must reflow into touch-friendly rows");
assert.match(css, /min-height:\s*44px/, "Mobile controls must meet a 44px touch-target floor");
assert.match(css, /\.mobile-tabs\s*\{[\s\S]*?background-color:\s*var\(--bauhaus-surface\) !important[\s\S]*?box-shadow:\s*none !important/, "Mobile navigation must use an opaque flat surface");
assert.match(css, /\.mobile-tabs \.nav-item\s*\{[\s\S]*?white-space:\s*nowrap/, "Mobile navigation labels must not wrap into unreadable fragments");
assert.match(css, /\.lead-table-scroll,[\s\S]*?overflow-x:\s*auto !important/, "Wide tables must scroll within their own container");
assert.match(css, /\.summary-card-details-dialog, \.salesman-leads-dialog\)\s*\{[\s\S]*?max-height:\s*calc\(100dvh - 16px\) !important/, "Data dialogs must fit inside a phone viewport");
assert.match(css, /@media \(max-width: 420px\)[\s\S]*?\.salesman-simplified-metrics\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\) !important/, "Narrow phones must not compress metric cards unreadably");
assert.match(server, /\["\/mobile-ui\.css", "mobile-ui\.css"\]/, "Node server must publish the shared mobile CSS");
assert.match(serviceWorker, /"\/mobile-ui\.css"/, "PWA shell must cache the shared mobile CSS");
assert.match(vercel, /"src": "mobile-ui\.css", "use": "@vercel\/static"/, "Vercel must publish the shared mobile CSS");
assert.match(vercel, /"src": "\/mobile-ui\.css", "dest": "\/mobile-ui\.css"/, "Vercel must route the shared mobile CSS");

console.log("mobile-ui.test.js: PASS");
