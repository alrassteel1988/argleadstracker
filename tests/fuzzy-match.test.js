const assert = require("assert");
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

console.log("PASS fuzzy duplicate matching");
