const { runAgentQuery } = require("../src/services/agentService");

async function agentQuery({ prompt, user, leads, pmrs = [] }) {
  return runAgentQuery({ prompt, user, leads, pmrs });
}

module.exports = { agentQuery };
