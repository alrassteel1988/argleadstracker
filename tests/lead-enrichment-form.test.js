const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const client = fs.readFileSync(path.join(root, "client.js"), "utf8");
const server = fs.readFileSync(path.join(root, "server.js"), "utf8");

function namedFunction(source, name) {
  const start = source.search(new RegExp(`^(?:async )?function ${name}\\(`, "m"));
  assert.notEqual(start, -1, `Missing ${name}`);
  const next = source.slice(start + 1).search(/\n(?:async )?function /);
  return source.slice(start, next < 0 ? undefined : start + 1 + next);
}

function fixture() {
  const fields = Object.fromEntries(["company_name", "location", "territory", "website", "phone", "address",
    "google_place_id", "google_maps_url", "enrichment_source", "enrichment_status", "enriched_at"]
    .map(name => [name, { value: "" }]));
  fields.company_name.value = "Amber Harbor Steel";
  fields.territory.value = "Dubai";
  const toggle = { checked: true };
  const messages = [];
  const context = vm.createContext({
    state: { editingLeadId: "", leads: [] },
    els: { leadForm: { elements: fields } },
    document: { getElementById: () => toggle },
    window: { confirm: () => false },
    formValue: value => value == null ? "" : String(value),
    setEnrichmentStatus: message => messages.push(message),
    clearTimeout: () => {}, setTimeout: () => 1,
    api: async () => ({ enrichment: {} })
  });
  const constants = client.slice(client.indexOf("const enrichmentFieldMap ="), client.indexOf("const money ="));
  vm.runInContext(`let leadEnrichmentRevision=0, leadEnrichmentTimer=null, leadEnrichmentKey="";
    const leadEnrichmentChanges=new Map(), leadEnrichmentCache=new Map(), leadFormTouched=new Set();
    ${constants}
    ${["leadGoogleLookupEnabled", "handleLeadLookupChange", "applyLeadEnrichment", "leadEnrichmentRequestKey",
      "scheduleLeadCompanyEnrichment", "enrichLeadFormCompany"].map(name => namedFunction(client, name)).join("\n")}`, context);
  return { context, fields, toggle, messages };
}

(async () => {
  {
    const { context, fields } = fixture();
    context.applyLeadEnrichment({ company_name: "Amber Harbor Steel LLC", address: "Synthetic site", google_place_id: "fixture-place" });
    assert.equal(fields.company_name.value, "Amber Harbor Steel", "Automatic lookup must not rename the lead");
    assert.equal(fields.address.value, "Synthetic site");
    assert.equal(fields.google_place_id.value, "fixture-place");
  }
  {
    const { context, fields } = fixture();
    fields.website.value = "https://manual.example";
    vm.runInContext('leadFormTouched.add("website")', context);
    const applied = context.applyLeadEnrichment({ website: "https://different.example", address: "Unwanted address", google_place_id: "wrong-place" });
    assert.equal(applied, false);
    assert.equal(fields.website.value, "https://manual.example");
    assert.equal(fields.address.value, "");
    assert.equal(fields.google_place_id.value, "", "Cancel must not partially inject hidden identity data");
  }
  {
    const { context, fields, toggle } = fixture();
    context.applyLeadEnrichment({ website: "https://suggested.example", phone: "+971 4 000 0000", google_place_id: "fixture-place" });
    fields.website.value = "https://verified-manual.example";
    vm.runInContext('leadEnrichmentChanges.delete("website")', context);
    toggle.checked = false;
    context.handleLeadLookupChange();
    assert.equal(fields.company_name.value, "Amber Harbor Steel");
    assert.equal(fields.website.value, "https://verified-manual.example");
    assert.equal(fields.phone.value, "");
    assert.equal(fields.google_place_id.value, "");
  }
  {
    const { context, fields, toggle } = fixture();
    let resolve;
    context.api = () => new Promise(done => { resolve = done; });
    const pending = context.enrichLeadFormCompany("Amber Harbor Steel", "Dubai");
    toggle.checked = false;
    context.handleLeadLookupChange();
    toggle.checked = true;
    context.handleLeadLookupChange();
    resolve({ enrichment: { company_name: "Unrelated Synthetic Steel", google_place_id: "stale-place", address: "Stale address" } });
    await pending;
    assert.equal(fields.google_place_id.value, "", "Off/on must invalidate an older request, not only check the checkbox");
    assert.equal(fields.address.value, "");
    assert.equal(fields.company_name.value, "Amber Harbor Steel");
  }
  {
    const { context, toggle } = fixture();
    let lookups = 0;
    context.api = async () => { lookups += 1; return {}; };
    toggle.checked = false;
    await context.enrichLeadFormCompany("Amber Harbor Steel", "Dubai");
    assert.equal(lookups, 0);
  }
  {
    let lookups = 0, backgroundJobs = 0;
    const context = vm.createContext({
      leadLifecycle: require("../src/services/leadLifecycleService"),
      enrichCompanyFromGoogle: async () => { lookups += 1; },
      setTimeout: () => { backgroundJobs += 1; },
      clientIp: () => "fixture"
    });
    vm.runInContext(["hasGoogleFields", "googleEnrichPayload", "scheduleLeadAutoEnrichment"].map(name => namedFunction(server, name)).join("\n"), context);
    const input = { company_name: "Amber Harbor Steel", website: "https://manual.example", enrichment_source: "manual", enrichment_status: "pending" };
    assert.equal(await context.googleEnrichPayload(input, {}), input);
    context.scheduleLeadAutoEnrichment({ lead: input });
    assert.equal(lookups, 0, "Server save must honor manual entry too");
    assert.equal(backgroundJobs, 0, "Post-save enrichment must not reintroduce a rejected company");
  }
  assert.match(client, /leadEnrichmentChanges\.delete\(field\.name\)/);
  console.log("PASS enrichment form identity, cancellation, manual entry and stale-response guards");
})().catch(error => { console.error(error); process.exitCode = 1; });
