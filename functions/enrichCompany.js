const { runCompanyAutoEnrichment } = require("../src/services/enrichmentService");

async function enrichCompany(lead, options = {}) {
  return runCompanyAutoEnrichment({
    lead,
    country: options.country || "United Arab Emirates",
    rateKey: options.rateKey || "function"
  });
}

module.exports = { enrichCompany };
