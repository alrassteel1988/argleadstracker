function value(name) {
  return String(process.env[name] || "").trim();
}

function enabled(name, fallback) {
  const raw = value(name);
  if (!raw) return fallback;
  return !["0", "false", "off", "no"].includes(raw.toLowerCase());
}

const GOOGLE_PLACES_KEY = value("GOOGLE_PLACES_API_KEY") || value("REACT_APP_GOOGLE_PLACES_API_KEY");
const ANTHROPIC_KEY = value("ANTHROPIC_API_KEY");
const ZAWYA_KEY = value("ZAWYA_API_KEY");
const ERP_BASE_URL = value("ERP_API_BASE_URL");
const ERP_KEY = value("ERP_API_KEY");

const integrations = {
  googlePlaces: enabled("ENABLE_GOOGLE_PLACES", Boolean(GOOGLE_PLACES_KEY)),
  claudeEnrichment: enabled("ENABLE_CLAUDE_ENRICHMENT", Boolean(ANTHROPIC_KEY)),
  claudeWebSearch: enabled("ENABLE_ANTHROPIC_WEB_SEARCH", Boolean(ANTHROPIC_KEY)),
  aiAgent: enabled("ENABLE_AI_AGENT", Boolean(ANTHROPIC_KEY)),
  marketIntel: enabled("ENABLE_MARKET_INTEL", Boolean(ZAWYA_KEY)),
  erp: enabled("ENABLE_ERP_LOOKUP", true),
  linkedin: enabled("ENABLE_LINKEDIN_SEARCH", true),
  keys: {
    googlePlaces: Boolean(GOOGLE_PLACES_KEY),
    anthropic: Boolean(ANTHROPIC_KEY),
    zawya: Boolean(ZAWYA_KEY),
    erp: Boolean(ERP_BASE_URL && ERP_KEY)
  },
  env: {
    googlePlacesKey: GOOGLE_PLACES_KEY,
    anthropicKey: ANTHROPIC_KEY,
    zawyaKey: ZAWYA_KEY,
    erpBaseUrl: ERP_BASE_URL,
    erpApiKey: ERP_KEY,
    anthropicModel: value("ANTHROPIC_MODEL") || "claude-sonnet-4-6",
    zawyaApiUrl: value("ZAWYA_API_URL") || value("ZAWYA_FEED_URL")
  }
};

module.exports = integrations;
