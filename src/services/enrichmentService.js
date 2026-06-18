const integrations = require("../config/integrations");
const {
  enrichCompanyFromGoogle,
  mergeLeadWithEnrichment
} = require("../../enrichment");

const CLAUDE_CONCURRENCY = 5;
let activeClaudeRequests = 0;
const claudeQueue = [];

function runWithClaudeLimit(task) {
  return new Promise((resolve, reject) => {
    const run = async () => {
      activeClaudeRequests += 1;
      try {
        resolve(await task());
      } catch (error) {
        reject(error);
      } finally {
        activeClaudeRequests -= 1;
        const next = claudeQueue.shift();
        if (next) next();
      }
    };
    if (activeClaudeRequests < CLAUDE_CONCURRENCY) run();
    else claudeQueue.push(run);
  });
}

function timeoutSignal(timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, cancel: () => clearTimeout(timer) };
}

function extractJson(text) {
  const source = String(text || "").trim();
  try {
    return JSON.parse(source);
  } catch {
    const match = source.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : {};
  }
}

function normalizeClaudeData(data = {}) {
  const personnel = Array.isArray(data.key_personnel) ? data.key_personnel : [];
  const list = value => Array.isArray(value) ? value.map(String).map(item => item.trim()).filter(Boolean) : [];
  return {
    sector_classification: String(data.sector_classification || "Other").trim(),
    sector_sources: list(data.sector_sources),
    sector_reasoning: String(data.sector_reasoning || "").trim(),
    estimated_scale: String(data.estimated_scale || "Unknown").trim(),
    key_personnel: personnel.map(person => ({
      name: String(person.name || "").trim(),
      title: String(person.title || "").trim()
    })).filter(person => person.name || person.title),
    recent_projects: list(data.recent_projects),
    certifications: list(data.certifications),
    compliance_flags: list(data.compliance_flags),
    steel_products_likely_needed: list(data.steel_products_likely_needed),
    competitors_likely_using: list(data.competitors_likely_using),
    estimated_annual_revenue: String(data.estimated_annual_revenue || "Unknown").trim(),
    confidence: String(data.confidence || "Low").trim(),
    confidence_reason: String(data.confidence_reason || "").trim()
  };
}

function claudeBusinessPrompt({ companyName, country, emirate, sector, website }) {
  return [
    "You are a business intelligence assistant for Al Ras Steel, a structural steel importer based in JAFZA, Dubai.",
    "Research the company using available public signals and return ONLY valid JSON. Do not include markdown or commentary.",
    `Company: ${companyName}`,
    `Country/market: ${country || "United Arab Emirates"}${emirate ? `, ${emirate}` : ""}`,
    sector ? `Known CRM sector: ${sector}` : "",
    website ? `Website: ${website}` : "",
    "Schema:",
    JSON.stringify({
      sector_classification: "Fabricator | Contractor | Trader | Marine | Piling | Oil & Gas | Trailer | PEB | Other",
      sector_sources: ["Company website", "Google Places business category", "LinkedIn company page", "Public project or news signals"],
      sector_reasoning: "Short explanation of why the sector was chosen using only supported public evidence.",
      estimated_scale: "Small (<50 employees) | Medium (50-500) | Large (500+) | Unknown",
      key_personnel: [{ name: "", title: "" }],
      recent_projects: [""],
      certifications: [""],
      compliance_flags: ["ISO 9001", "ADNOC approved", "ICV", "DNV", "ARAMCO approved"],
      estimated_annual_revenue: "< AED 5M | AED 5M-50M | AED 50M-500M | AED 500M+ | Unknown",
      steel_products_likely_needed: [""],
      competitors_likely_using: [""],
      confidence: "High | Medium | Low",
      confidence_reason: ""
    })
  ].filter(Boolean).join("\n");
}

async function postClaudeMessage(body, signal) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      "x-api-key": integrations.env.anthropicKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error?.message || "Claude enrichment failed.");
    error.status = response.status;
    throw error;
  }
  return payload;
}

async function fetchClaudeBusinessIntel({ companyName, country = "United Arab Emirates", emirate = "", sector = "", website = "", timeoutMs = 8000 }) {
  if (!integrations.claudeEnrichment || !integrations.keys.anthropic) {
    return { disabled: true, data: null };
  }
  const { signal, cancel } = timeoutSignal(timeoutMs);
  try {
    return await runWithClaudeLimit(async () => {
      const baseBody = {
        model: integrations.env.anthropicModel,
        max_tokens: 1200,
        system: "Return only valid JSON matching the requested schema. Do not invent unsupported facts; use Unknown or empty arrays for unavailable data.",
        messages: [{ role: "user", content: claudeBusinessPrompt({ companyName, country, emirate, sector, website }) }]
      };
      let payload;
      try {
        payload = await postClaudeMessage({
          ...baseBody,
          ...(integrations.claudeWebSearch ? { tools: [{ type: "web_search_20260209", name: "web_search" }] } : {})
        }, signal);
      } catch (error) {
        if (!integrations.claudeWebSearch) throw error;
        payload = await postClaudeMessage(baseBody, signal);
      }
      const text = Array.isArray(payload.content)
        ? payload.content.map(part => part.text || "").join("\n")
        : "";
      return { disabled: false, data: normalizeClaudeData(extractJson(text)) };
    });
  } finally {
    cancel();
  }
}

function autoEnrichmentRecord(data, status = "pending_review") {
  const confidence = String(data?.confidence || "").toLowerCase();
  return {
    data: data || {},
    enriched_at: new Date().toISOString(),
    status,
    confidence: data?.confidence || "Unknown",
    low_confidence: confidence === "low"
  };
}

const AUTO_ENRICHMENT_FIELDS = [
  "sector_classification",
  "estimated_scale",
  "estimated_annual_revenue",
  "key_personnel",
  "recent_projects",
  "certifications",
  "compliance_flags",
  "steel_products_likely_needed",
  "competitors_likely_using"
];

function mergeVerifiedAutoEnrichment(lead, selectedFields = null) {
  const data = lead.auto_enrichment?.data || {};
  const selected = Array.isArray(selectedFields) && selectedFields.length
    ? new Set(selectedFields)
    : new Set(AUTO_ENRICHMENT_FIELDS);
  const shouldApply = key => selected.has(key);
  const firstPerson = Array.isArray(data.key_personnel) ? data.key_personnel[0] : null;
  const certifications = Array.isArray(data.certifications) ? data.certifications : [];
  const complianceFlags = Array.isArray(data.compliance_flags) ? data.compliance_flags : [];
  const projects = Array.isArray(data.recent_projects) ? data.recent_projects.join("; ") : "";
  const products = Array.isArray(data.steel_products_likely_needed) ? data.steel_products_likely_needed : [];
  const competitors = Array.isArray(data.competitors_likely_using) ? data.competitors_likely_using : [];
  const sectorSources = Array.isArray(data.sector_sources) ? data.sector_sources : [];
  const remarks = [
    lead.products_services_remarks,
    shouldApply("sector_classification") && data.sector_classification ? `Suggested sector: ${data.sector_classification}` : "",
    shouldApply("sector_classification") && sectorSources.length ? `Sector sources: ${sectorSources.join(", ")}` : "",
    shouldApply("sector_classification") && data.confidence ? `Sector confidence: ${data.confidence}${data.confidence_reason ? ` - ${data.confidence_reason}` : ""}` : "",
    shouldApply("sector_classification") && data.sector_reasoning ? `Sector reasoning: ${data.sector_reasoning}` : "",
    shouldApply("recent_projects") && projects ? `Recent public project signals: ${projects}` : "",
    shouldApply("estimated_scale") && data.estimated_scale ? `Estimated scale: ${data.estimated_scale}` : "",
    shouldApply("estimated_annual_revenue") && data.estimated_annual_revenue ? `Estimated revenue: ${data.estimated_annual_revenue}` : "",
    shouldApply("steel_products_likely_needed") && products.length ? `Likely steel products: ${products.join(", ")}` : "",
    shouldApply("competitors_likely_using") && competitors.length ? `Likely competitor/supplier references: ${competitors.join(", ")}` : ""
  ].filter(Boolean).join("\n");
  const appliedFields = Array.from(new Set([...(lead.auto_enrichment?.applied_fields || []), ...selected]));
  const allApplied = AUTO_ENRICHMENT_FIELDS.every(field => appliedFields.includes(field));
  return {
    ...lead,
    sector: shouldApply("sector_classification") && data.sector_classification && data.sector_classification !== "Other" ? data.sector_classification : lead.sector,
    estimated_scale: shouldApply("estimated_scale") ? data.estimated_scale || lead.estimated_scale || "" : lead.estimated_scale,
    estimated_annual_revenue: shouldApply("estimated_annual_revenue") ? data.estimated_annual_revenue || lead.estimated_annual_revenue || "" : lead.estimated_annual_revenue,
    contact_person: shouldApply("key_personnel") ? lead.contact_person || firstPerson?.name || "" : lead.contact_person,
    primary_contact_title: shouldApply("key_personnel") ? lead.primary_contact_title || firstPerson?.title || "" : lead.primary_contact_title,
    key_personnel: shouldApply("key_personnel") ? data.key_personnel || lead.key_personnel || [] : lead.key_personnel,
    recent_projects: shouldApply("recent_projects") ? data.recent_projects || lead.recent_projects || [] : lead.recent_projects,
    certifications: shouldApply("certifications") || shouldApply("compliance_flags") ? [...new Set([...(lead.certifications || []), ...certifications, ...complianceFlags])] : lead.certifications,
    steel_products_likely_needed: shouldApply("steel_products_likely_needed") ? products : lead.steel_products_likely_needed,
    competitors_likely_using: shouldApply("competitors_likely_using") ? competitors : lead.competitors_likely_using,
    tags: shouldApply("certifications") || shouldApply("compliance_flags")
      ? [...new Set([lead.tags, ...certifications, ...complianceFlags].filter(Boolean).join(", ").split(",").map(item => item.trim()).filter(Boolean))].join(", ")
      : lead.tags,
    products_services_remarks: remarks || lead.products_services_remarks,
    auto_enrichment: {
      ...(lead.auto_enrichment || {}),
      status: allApplied ? "verified" : "pending_review",
      applied_fields: appliedFields,
      verified_at: allApplied ? new Date().toISOString() : lead.auto_enrichment?.verified_at || null
    }
  };
}

async function runCompanyAutoEnrichment({ lead, country = "United Arab Emirates", rateKey = "server" }) {
  const logs = [];
  let nextLead = { ...lead };
  if (!nextLead.google_place_id && !nextLead.google_maps_url) {
    try {
      const google = await enrichCompanyFromGoogle({
        companyName: nextLead.company_name,
        location: nextLead.location || nextLead.territory || country,
        country,
        rateKey
      });
      nextLead = mergeLeadWithEnrichment(nextLead, google, { overwrite: false });
      logs.push({ source: "google_places", status: "success" });
    } catch (error) {
      logs.push({ source: "google_places", status: error.name === "AbortError" ? "timeout" : "failed", error_message: error.message });
    }
  }

  try {
    const claude = await fetchClaudeBusinessIntel({
      companyName: nextLead.company_name,
      country,
      emirate: nextLead.country_emirate || nextLead.location || nextLead.territory,
      sector: nextLead.sector || nextLead.business_category || nextLead.industry,
      website: nextLead.website,
      timeoutMs: 8000
    });
    if (claude.disabled) {
      logs.push({ source: "claude", status: "disabled" });
    } else {
      nextLead.auto_enrichment = autoEnrichmentRecord(claude.data);
      logs.push({ source: "claude", status: "success" });
    }
  } catch (error) {
    nextLead.auto_enrichment = autoEnrichmentRecord({ confidence: "Low" }, "failed");
    logs.push({ source: "claude", status: error.name === "AbortError" ? "timeout" : "failed", error_message: error.message });
  }

  return { lead: nextLead, logs };
}

module.exports = {
  autoEnrichmentRecord,
  AUTO_ENRICHMENT_FIELDS,
  fetchClaudeBusinessIntel,
  mergeVerifiedAutoEnrichment,
  runCompanyAutoEnrichment
};
