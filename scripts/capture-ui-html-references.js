const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const {pathToFileURL} = require("node:url");
const {chromium} = require("playwright");

async function main() {
  if (!process.env.CRM_UI_REFERENCE_ROOT) throw new Error("Set CRM_UI_REFERENCE_ROOT to the extracted, approved HTML reference folder");
  const root = path.resolve(process.env.CRM_UI_REFERENCE_ROOT, "screens");
  const names = process.argv.slice(2);
  if (!names.length || names.some(name => !/^[A-Za-z0-9_]+\.html$/.test(name))) throw new Error("Provide reference HTML basenames only");
  const directory = path.join(os.tmpdir(), "arg-crm-html-reference-captures");
  fs.mkdirSync(directory, {recursive:true});
  const browser = await chromium.launch({headless:true});
  const manifest = [];
  try {
    for (const name of names) {
      const filename = path.join(root, name);
      const source = fs.readFileSync(filename);
      const mobile = /_M_|Mobile/.test(name);
      const viewport = mobile ? {width:375, height:812} : {width:1440, height:900};
      const context = await browser.newContext({viewport, javaScriptEnabled:false, serviceWorkers:"block"});
      try {
        await context.route("**/*", route => {
          const url = new URL(route.request().url());
          if (url.protocol === "file:" && url.href === pathToFileURL(filename).href
            || ["data:", "blob:"].includes(url.protocol)
            || ["fonts.googleapis.com", "fonts.gstatic.com"].includes(url.hostname)) return route.continue();
          return route.abort("blockedbyclient");
        });
        const page = await context.newPage();
        await page.goto(pathToFileURL(filename).href, {waitUntil:"load"});
        await page.evaluate(() => document.fonts.ready);
        const dimensions = await page.evaluate(() => ({viewportWidth:innerWidth, documentWidth:document.documentElement.scrollWidth, title:document.title}));
        const screenshot = path.join(directory, `${path.basename(name, ".html")}-${viewport.width}.png`);
        await page.screenshot({path:screenshot, fullPage:false});
        manifest.push({name, sourceSha256:crypto.createHash("sha256").update(source).digest("hex"), viewport, dimensions, screenshot, scriptsEnabled:false});
      } finally { await context.close(); }
    }
    fs.writeFileSync(path.join(directory, "manifest.json"), JSON.stringify(manifest, null, 2));
    console.log(JSON.stringify(manifest, null, 2));
  } finally { await browser.close(); }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
