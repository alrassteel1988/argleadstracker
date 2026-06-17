const assert = require("assert");

process.env.ANTHROPIC_API_KEY = "test-key";
process.env.ENABLE_AI_AGENT = "true";

const { executeAgentTool, runAgentQuery, scopedLeads } = require("../src/services/agentService");

const leads = [
  { id: "lead-1", company_name: "North Fabricator", stage: "ENGAGED", territory: "UAE-North", sector: "Fabricator", assigned_salesman: "Alex", tier: "1", activities: [{ id: "a1", at: "2026-06-01", type: "Phone Call", text: "Discussed quotation" }] },
  { id: "lead-2", company_name: "South Contractor", stage: "PROSPECT", territory: "UAE-South", sector: "Contractor", assigned_salesman: "Suraj", tier: "2", activities: [] }
];

const salesman = { id: "user-1", name: "Alex", role: "salesman", territory: "UAE-North" };

assert.deepStrictEqual(scopedLeads(leads, salesman).map(lead => lead.id), ["lead-1"]);
assert.strictEqual(executeAgentTool("query_companies", { status: "ENGAGED" }, { leads: scopedLeads(leads, salesman) })[0].company_name, "North Fabricator");

let callCount = 0;
let secondBody = null;
async function mockFetch(_url, options) {
  callCount += 1;
  const body = JSON.parse(options.body);
  if (callCount === 1) {
    assert.strictEqual(body.tools.length, 5);
    return {
      ok: true,
      async json() {
        return {
          stop_reason: "tool_use",
          content: [{ type: "tool_use", id: "tool-1", name: "query_companies", input: { limit: 20 } }]
        };
      }
    };
  }
  secondBody = body;
  return {
    ok: true,
    async json() {
      return {
        stop_reason: "end_turn",
        content: [{ type: "text", text: "You have 1 visible lead: North Fabricator." }]
      };
    }
  };
}

(async () => {
  const result = await runAgentQuery({
    prompt: "How many leads can I see?",
    user: salesman,
    leads,
    pmrs: [],
    anthropicFetch: mockFetch
  });
  assert.strictEqual(result.answer, "You have 1 visible lead: North Fabricator.");
  assert.deepStrictEqual(result.tools_used, ["query_companies"]);
  const toolResultMessage = secondBody.messages.find(message => Array.isArray(message.content) && message.content[0]?.type === "tool_result");
  assert(toolResultMessage.content[0].content.includes("North Fabricator"));
  assert(!toolResultMessage.content[0].content.includes("South Contractor"));
  console.log("PASS read-only AI database agent tools");
})().catch(error => {
  throw error;
});
