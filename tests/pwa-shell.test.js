const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

const manifest = JSON.parse(read("manifest.json"));
assert.strictEqual(manifest.display, "standalone");
assert.strictEqual(manifest.orientation, "portrait");
assert.ok(manifest.icons.some(icon => icon.sizes === "192x192" && icon.purpose === "any"));
assert.ok(manifest.icons.some(icon => icon.sizes === "512x512" && icon.purpose === "maskable"));
assert.ok(manifest.shortcuts.some(shortcut => shortcut.url.includes("log-activity")));

const index = read("index.html");
assert.ok(index.includes('rel="manifest" href="/manifest.json"'));
assert.ok(index.includes('id="installBanner"'));
assert.ok(index.includes('id="quickLogDialog"'));
assert.ok(index.includes('data-mobile-action="quick-log"'));
assert.ok(index.includes('id="pendingChangesDialog"'));

const sw = read("sw.js");
assert.ok(sw.includes('url.pathname.startsWith("/api/")'));
assert.ok(sw.includes("staleWhileRevalidate"));
assert.ok(sw.includes("arg-outbox-sync"));

const client = read("client.js");
assert.ok(client.includes("indexedDB.open(OUTBOX_DB_NAME"));
assert.ok(client.includes("function saveQuickLog()"));
assert.ok(client.includes("function syncPendingPmr(item)"));
assert.ok(client.includes("voice_note_blob"));
assert.ok(client.includes("function queuePmrForSync"));
assert.ok(client.includes("AI briefings need a connection."));
assert.ok(client.includes("navigator.serviceWorker.register(\"/sw.js\")"));

["icon-192.png", "icon-512.png", "icon-maskable-192.png", "icon-maskable-512.png", "shortcut-log.png", "shortcut-focus.png"].forEach(file => {
  assert.ok(fs.existsSync(path.join(root, "icons", file)), `${file} exists`);
});

console.log("PASS mobile PWA shell");
