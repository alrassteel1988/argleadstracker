const { runCompanyAiAction } = require("../src/services/companyAiActionService");

async function companyAiAction({ action, bundle }) {
  return runCompanyAiAction({ action, bundle });
}

module.exports = { companyAiAction };
