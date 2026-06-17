const { matchIntelligenceToLeads } = require("../src/services/marketIntelService");

async function matchIntelligenceToCompanies(items, companies) {
  return matchIntelligenceToLeads(items, companies);
}

module.exports = { matchIntelligenceToCompanies };
