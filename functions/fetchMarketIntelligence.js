const { fetchMarketIntelligence } = require("../src/services/marketIntelService");

async function fetchMarketIntelligenceJob() {
  return fetchMarketIntelligence();
}

module.exports = { fetchMarketIntelligenceJob };
