const {test}=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync,existsSync}=require("node:fs");
const {join}=require("node:path");
const {createHash}=require("node:crypto");
const root=join(__dirname,"..");

test("pinned private PDF assets retain upstream bytes and exact safe static routes",()=>{
  const files=require("../assets/pdfjs/manifest.json");
  const vercel=JSON.parse(readFileSync(join(root,"vercel.json"),"utf8"));
  const headers=vercel.routes.findIndex(route=>route.headers?.["Content-Security-Policy"]);
  assert.equal(new Set(files).size,files.length);
  for(const file of files){
    assert.match(file,/^(build|cmaps|standard_fonts|wasm)\/[A-Za-z0-9_.-]+$/);
    assert.ok(!file.includes(".."));
    assert.ok(existsSync(join(root,"assets/pdfjs",file)));
    const index=vercel.routes.findIndex(route=>route.dest===`/assets/pdfjs/${file}`);
    assert.ok(index>headers,"Every asset must retain the unchanged global security headers");
    assert.equal(vercel.routes[index].src,`/assets/pdfjs/${file.replaceAll(".","\\.")}`);
  }
  for(const [file,expected] of [
    ["pdf.min.mjs","3a88402882cfa3e7e72c2c9b5149f52f0f88baf1c5b62aa11a41abdbc2072440"],
    ["pdf.worker.min.mjs","1e64c8240e54735ec5913b37acd5134747799cb8c6bb3777c70adbc01232d2aa"]
  ]) assert.equal(createHash("sha256").update(readFileSync(join(root,"assets/pdfjs/build",file))).digest("hex"),expected);
  const renderer=readFileSync(join(root,"rfq-pdf-viewer.mjs"),"utf8");
  assert.match(renderer,/getDocument\(\{ data,/);
  assert.match(renderer,/useWasm: false, enableXfa: false, disableFontFace: true/);
  assert.match(renderer,/isEvalSupported: false/);
  assert.doesNotMatch(renderer,/getJSActions|eval\(|new Function|https:\/\//);
  assert.match(renderer,/signal\.addEventListener\("abort", dispose/);
  assert.match(renderer,/rendering\?\.cancel\(\)/);
  assert.match(renderer,/pdf\.numPages > 500/);
});
