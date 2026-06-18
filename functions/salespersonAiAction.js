const { runSalespersonAiAction } = require("../src/services/salespersonAiActionService");

async function salespersonAiAction({ action, bundle, metrics }) {
  return runSalespersonAiAction({ action, bundle, metrics });
}

module.exports = { salespersonAiAction };
