const assert = require("assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { findDuplicates, jaroWinkler, normalise } = require("../src/utils/fuzzyMatch");

assert.equal(normalise("Al Mansour Steel Trading L.L.C."), "al mansour steel");
assert(jaroWinkler("almansour steel", "al mansour steel") >= 0.85);

const candidates = [
  { id: "1", company_name: "Almansour Steel LLC", assigned_salesman: "Roy Gabriel", territory: "UAE-North" },
  { id: "2", company_name: "Bahrain Petroleum Company", assigned_salesman: "Suraj Kumar", territory: "Bahrain" },
  { id: "3", company_name: "Gulf Fabrication Company", assigned_salesman: "Alex", territory: "UAE-South" }
];

const alMansour = findDuplicates("Al Mansour Steel Trading LLC", candidates);
assert.equal(alMansour[0].id, "1");
assert.equal(alMansour[0].isDuplicate, true);

const gulf = findDuplicates("Gulf Fabricators", candidates);
assert.equal(gulf[0].id, "3");
assert(gulf[0].score >= 0.75);

const bapco = findDuplicates("BAPCO", candidates);
assert(!bapco.some(match => match.id === "2" && match.isDuplicate));

const client = fs.readFileSync(path.join(__dirname, "..", "client.js"), "utf8");
const importMatcherStart = client.indexOf("function clientFuzzyNormalise(");
const importMatcherEnd = client.indexOf("function handleLeadCompanyNameInput(", importMatcherStart);
assert(importMatcherStart >= 0 && importMatcherEnd > importMatcherStart);
const findImportDuplicates = vm.runInNewContext(
  client.slice(importMatcherStart, importMatcherEnd) + "\nclientDuplicateCandidates;"
);

for (const [label, matchNames] of [["Add Lead", findDuplicates], ["CSV import", findImportDuplicates]]) {
  for (const [left, right] of [
    ["Gulf Boring LLC", "Gulf Zobla LLC"],
    ["TerrCove Piling", "Ground Rec Piling"],
    ["TerrCove Piling", "Ground Rec Piling & Foundation"]
  ]) {
    assert.equal(matchNames(left, [{ company_name: right }]).length, 0, `${label}: ${left} is distinct from ${right}`);
    assert.equal(matchNames(right, [{ company_name: left }]).length, 0, `${label}: distinct names must also pass in reverse`);
  }
  assert(matchNames("TerrCove Piling", [{ company_name: "Terr Cove Piling L.L.C." }])[0]?.isDuplicate);
  assert(matchNames("Gulf Boring LLC", [{ company_name: "Gulf Boring Limited" }])[0]?.isDuplicate);
  assert(matchNames("Gulf Borings LLC", [{ company_name: "Gulf Boring LLC" }])[0]?.isDuplicate);
  assert(matchNames("Gulf Fabricators", candidates).some(match => match.id === "3"));
}

console.log("PASS fuzzy duplicate matching");
