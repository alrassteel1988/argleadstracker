const WORKFLOW_VERSION = "uae-structural-steel-lead-intelligence@2026-08-10";
const UNKNOWN = "Not publicly found";

const BUYER_CLASSIFICATIONS = new Set(["Direct Buyer", "Likely Buyer", "Indirect Influencer", "Low-Relevance Buyer", "Potential Competitor", "Insufficient Evidence"]);
const DEMAND_LABELS = new Set(["HIGH", "MEDIUM", "LOW", "UNKNOWN"]);
const CONFIDENCE_LABELS = new Set(["High", "Medium", "Low"]);
const PRIORITIES = new Set(["A", "B", "C", "D"]);
const STEEL_RELEVANCE = new Set(["High", "Medium", "Low", "Unknown"]);
const SCORE_FACTORS = Object.freeze([
  { key: "current_project_activity", label: "Current project activity", weight: 0.25 },
  { key: "structural_steel_relevance", label: "Structural-steel relevance", weight: 0.25 },
  { key: "project_scale_volume", label: "Project scale / volume potential", weight: 0.15 },
  { key: "procurement_accessibility", label: "Procurement accessibility", weight: 0.15 },
  { key: "uae_activity_presence", label: "UAE activity / presence", weight: 0.10 },
  { key: "recurring_purchase_likelihood", label: "Recurring purchase likelihood", weight: 0.10 }
]);

function safeText(value, fallback = "") {
  const text = String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return text || fallback;
}

function safeDate(value) {
  const text = safeText(value);
  if (!text) return "";
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString().slice(0, 10) : text.slice(0, 40);
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

function clampScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(10, Math.round(number * 10) / 10));
}

function displayedScore(weightedScore) {
  return Math.max(1, Math.min(10, Math.round(Number(weightedScore) || 0)));
}

function priorityForWeightedScore(value) {
  const score = Number(value) || 0;
  if (score >= 8) return "A";
  if (score >= 6) return "B";
  if (score >= 4) return "C";
  return "D";
}

function calculateLeadScore(components = []) {
  const byKey = new Map(asArray(components).map(item => [safeText(item?.key), item]));
  const normalized = SCORE_FACTORS.map(factor => {
    const source = byKey.get(factor.key) || asArray(components).find(item => safeText(item?.factor).toLowerCase() === factor.label.toLowerCase()) || {};
    const score = clampScore(source.score);
    const weighted_score = Math.round(score * factor.weight * 10) / 10;
    return {
      key: factor.key,
      factor: factor.label,
      weight: factor.weight,
      weight_percent: Math.round(factor.weight * 100),
      score,
      evidence: safeText(source.evidence, UNKNOWN),
      weighted_score
    };
  });
  const weighted = Math.round(normalized.reduce((sum, item) => sum + item.score * item.weight, 0) * 10) / 10;
  const display = displayedScore(weighted);
  return { components: normalized, weighted_score: weighted, displayed_score: display, priority: priorityForWeightedScore(weighted) };
}

function enumValue(value, allowed, fallback) {
  const text = safeText(value);
  return allowed.has(text) ? text : fallback;
}

function sourceRefList(value) {
  return asArray(value).map(item => safeText(item)).filter(Boolean).slice(0, 12);
}

function normalizeSource(source, index) {
  const url = safeText(source?.url);
  return {
    id: safeText(source?.id, `src-${index + 1}`),
    title: safeText(source?.title || source?.label || source?.name, url || UNKNOWN),
    url: url || UNKNOWN,
    publisher: safeText(source?.publisher || source?.source || source?.domain, UNKNOWN),
    source_type: safeText(source?.source_type || source?.type, UNKNOWN),
    access_date: safeDate(source?.access_date || source?.research_date) || new Date().toISOString().slice(0, 10)
  };
}

function normalizeProject(project) {
  return {
    project_name: safeText(project?.project_name || project?.project, UNKNOWN),
    client_developer: safeText(project?.client_developer || project?.client, UNKNOWN),
    main_contracter: safeText(project?.main_contracter || project?.main_contractor, UNKNOWN),
    main_contractor: safeText(project?.main_contractor || project?.main_contracter, UNKNOWN),
    consultant: safeText(project?.consultant, UNKNOWN),
    location: safeText(project?.location, UNKNOWN),
    company_role: safeText(project?.company_role || project?.role, UNKNOWN),
    award_announcement_date: safeText(project?.award_announcement_date || project?.award_date || project?.announcement_date, UNKNOWN),
    current_status: safeText(project?.current_status || project?.status, UNKNOWN),
    expected_completion: safeText(project?.expected_completion, UNKNOWN),
    structural_steel_relevance: enumValue(project?.structural_steel_relevance, STEEL_RELEVANCE, "Unknown"),
    evidence_reason: safeText(project?.evidence_reason || project?.evidence || project?.reason, UNKNOWN),
    source_refs: sourceRefList(project?.source_refs || project?.sources)
  };
}

function normalizeContact(contact) {
  return {
    name: safeText(contact?.name, UNKNOWN),
    position: safeText(contact?.position || contact?.title, UNKNOWN),
    company: safeText(contact?.company, UNKNOWN),
    location: safeText(contact?.location, UNKNOWN),
    business_email: safeText(contact?.business_email || contact?.email, UNKNOWN),
    business_telephone: safeText(contact?.business_telephone || contact?.telephone || contact?.phone, UNKNOWN),
    public_professional_source: safeText(contact?.public_professional_source || contact?.source, UNKNOWN),
    confidence: enumValue(contact?.confidence, CONFIDENCE_LABELS, "Low"),
    why_relevant: safeText(contact?.why_relevant || contact?.relevance, UNKNOWN),
    source_refs: sourceRefList(contact?.source_refs || contact?.sources)
  };
}

function normalizeMaterial(item) {
  return {
    material: safeText(item?.material, UNKNOWN),
    likelihood: safeText(item?.likelihood, "Unknown"),
    reason_project_link: safeText(item?.reason_project_link || item?.reason, UNKNOWN),
    fact_or_inference: /verified/i.test(safeText(item?.fact_or_inference)) ? "Verified" : "Inference",
    source_refs: sourceRefList(item?.source_refs || item?.sources)
  };
}

function normalizeFact(item, kind) {
  if (typeof item === "string") return { statement: safeText(item, UNKNOWN), source_refs: [], confidence: kind === "inference" ? "Medium" : "Low" };
  return {
    statement: safeText(item?.statement || item?.fact || item?.inference || item?.gap, UNKNOWN),
    source_refs: sourceRefList(item?.source_refs || item?.sources),
    confidence: enumValue(item?.confidence, CONFIDENCE_LABELS, kind === "verified" ? "Medium" : "Low")
  };
}

function normalizeLeadIntelligenceReport(input = {}, context = {}) {
  const errors = [];
  const researchDate = safeDate(input.research_date) || new Date().toISOString().slice(0, 10);
  const sources = asArray(input.sources).map(normalizeSource).filter(item => item.title !== UNKNOWN || item.url !== UNKNOWN);
  if (!sources.length) errors.push("At least one public source is required.");

  const score = calculateLeadScore(input.lead_score?.components || input.scoring_components || input.components || []);
  const priority = priorityForWeightedScore(score.weighted_score);
  if (input.lead_score?.priority && !PRIORITIES.has(input.lead_score.priority)) errors.push("Lead priority must be A, B, C, or D.");

  const companyName = safeText(input.executive_snapshot?.company || input.company_profile?.company || context.company_name);
  if (!companyName) errors.push("Company name is required.");

  const report = {
    workflow_version: safeText(input.workflow_version, WORKFLOW_VERSION),
    research_date: researchDate,
    executive_snapshot: {
      company: companyName || UNKNOWN,
      company_type: safeText(input.executive_snapshot?.company_type || input.company_profile?.company_type, UNKNOWN),
      buyer_classification: enumValue(input.executive_snapshot?.buyer_classification, BUYER_CLASSIFICATIONS, "Insufficient Evidence"),
      lead_score: score.displayed_score,
      steel_demand: enumValue(input.executive_snapshot?.steel_demand, DEMAND_LABELS, "UNKNOWN"),
      procurement_accessibility: safeText(input.executive_snapshot?.procurement_accessibility, "Unknown"),
      best_sales_entry_point: safeText(input.executive_snapshot?.best_sales_entry_point, UNKNOWN),
      top_opportunity: safeText(input.executive_snapshot?.top_opportunity, UNKNOWN)
    },
    company_profile: {
      company: companyName || UNKNOWN,
      established: safeText(input.company_profile?.established, UNKNOWN),
      headquarters: safeText(input.company_profile?.headquarters, UNKNOWN),
      website: safeText(input.company_profile?.website || context.website, UNKNOWN),
      telephone: safeText(input.company_profile?.telephone || context.phone, UNKNOWN),
      email: safeText(input.company_profile?.email || context.email, UNKNOWN),
      contact_page: safeText(input.company_profile?.contact_page, UNKNOWN),
      locations: asArray(input.company_profile?.locations).map(item => safeText(item)).filter(Boolean),
      parent_group: safeText(input.company_profile?.parent_group, UNKNOWN),
      company_type: safeText(input.company_profile?.company_type, UNKNOWN),
      main_activities: asArray(input.company_profile?.main_activities).map(item => safeText(item)).filter(Boolean),
      main_products_services: asArray(input.company_profile?.main_products_services).map(item => safeText(item)).filter(Boolean),
      industries_served: asArray(input.company_profile?.industries_served).map(item => safeText(item)).filter(Boolean),
      important_clients: asArray(input.company_profile?.important_clients).map(item => safeText(item)).filter(Boolean)
    },
    buyer_classification: {
      classification: enumValue(input.buyer_classification?.classification || input.executive_snapshot?.buyer_classification, BUYER_CLASSIFICATIONS, "Insufficient Evidence"),
      basis: safeText(input.buyer_classification?.basis, UNKNOWN)
    },
    project_intelligence: {
      recently_awarded_projects: asArray(input.project_intelligence?.recently_awarded_projects).map(normalizeProject),
      ongoing_projects: asArray(input.project_intelligence?.ongoing_projects).map(normalizeProject),
      previous_relevant_projects: asArray(input.project_intelligence?.previous_relevant_projects).map(normalizeProject),
      announced_upcoming_projects: asArray(input.project_intelligence?.announced_upcoming_projects).map(normalizeProject)
    },
    procurement_contacts: asArray(input.procurement_contacts).map(normalizeContact),
    best_verified_company_contact_channel: safeText(input.best_verified_company_contact_channel || input.procurement_contact_channel, UNKNOWN),
    structural_steel_opportunity: {
      steel_demand: enumValue(input.structural_steel_opportunity?.steel_demand || input.executive_snapshot?.steel_demand, DEMAND_LABELS, "UNKNOWN"),
      likely_required_materials: asArray(input.structural_steel_opportunity?.likely_required_materials).map(normalizeMaterial),
      buying_pattern_opportunity: safeText(input.structural_steel_opportunity?.buying_pattern_opportunity, UNKNOWN),
      buying_triggers: asArray(input.structural_steel_opportunity?.buying_triggers).map(item => safeText(item)).filter(Boolean)
    },
    lead_score: score,
    sales_recommendation: {
      best_person_department_to_approach: safeText(input.sales_recommendation?.best_person_department_to_approach, UNKNOWN),
      recommended_sales_angle: safeText(input.sales_recommendation?.recommended_sales_angle, UNKNOWN),
      known_active_recent_project_to_reference: safeText(input.sales_recommendation?.known_active_recent_project_to_reference, UNKNOWN),
      most_relevant_products: asArray(input.sales_recommendation?.most_relevant_products).map(item => safeText(item)).filter(Boolean),
      suggested_next_action: safeText(input.sales_recommendation?.suggested_next_action, UNKNOWN),
      suggested_opening_message_angle: safeText(input.sales_recommendation?.suggested_opening_message_angle, UNKNOWN)
    },
    research_quality: {
      verified_information: asArray(input.research_quality?.verified_information || input.verified_facts).map(item => normalizeFact(item, "verified")),
      reasonable_inferences: asArray(input.research_quality?.reasonable_inferences || input.reasonable_inferences).map(item => normalizeFact(item, "inference")),
      not_publicly_found_unverified: asArray(input.research_quality?.not_publicly_found_unverified || input.not_publicly_found_unverified).map(item => normalizeFact(item, "gap")),
      confidence_summary: {
        company_identity: enumValue(input.research_quality?.confidence_summary?.company_identity, CONFIDENCE_LABELS, "Low"),
        company_profile: enumValue(input.research_quality?.confidence_summary?.company_profile, CONFIDENCE_LABELS, "Low"),
        project_intelligence: enumValue(input.research_quality?.confidence_summary?.project_intelligence, CONFIDENCE_LABELS, "Low"),
        procurement_contacts: enumValue(input.research_quality?.confidence_summary?.procurement_contacts, CONFIDENCE_LABELS, "Low"),
        steel_opportunity_assessment: enumValue(input.research_quality?.confidence_summary?.steel_opportunity_assessment, CONFIDENCE_LABELS, "Low")
      }
    },
    sources,
    anti_fabrication_check: {
      no_guessed_contacts: Boolean(input.anti_fabrication_check?.no_guessed_contacts ?? true),
      no_unsourced_projects: Boolean(input.anti_fabrication_check?.no_unsourced_projects ?? true),
      verified_facts_separated_from_inferences: Boolean(input.anti_fabrication_check?.verified_facts_separated_from_inferences ?? true)
    }
  };

  if (!report.research_quality.verified_information.length) errors.push("Verified information must be separated and populated.");
  if (!report.research_quality.not_publicly_found_unverified.length) {
    report.research_quality.not_publicly_found_unverified.push({ statement: "No additional gaps were listed by the research workflow.", source_refs: [], confidence: "Low" });
  }
  for (const component of report.lead_score.components) {
    if (component.score < 0 || component.score > 10) errors.push(`Invalid score for ${component.factor}`);
  }
  report.lead_score.priority = priority;
  report.executive_snapshot.lead_score = report.lead_score.displayed_score;
  report.executive_snapshot.buyer_classification = report.buyer_classification.classification;
  report.executive_snapshot.steel_demand = report.structural_steel_opportunity.steel_demand;
  return { report, errors };
}

function assertValidLeadIntelligenceReport(input, context = {}) {
  const { report, errors } = normalizeLeadIntelligenceReport(input, context);
  if (errors.length) {
    const error = new Error("Lead intelligence report failed validation.");
    error.code = "schema_validation_failed";
    error.details = errors;
    throw error;
  }
  return report;
}

function allowedResearchInputFromLead(lead = {}) {
  return {
    company_name: safeText(lead.company_name || lead.legal_name),
    legal_name: safeText(lead.legal_name),
    trading_name: safeText(lead.company_name),
    emirate_city_country: safeText([lead.country_emirate, lead.location, lead.territory].filter(Boolean).join(", ")),
    website: safeText(lead.website),
    telephone: safeText(lead.phone),
    general_email: safeText(lead.email || lead.contact_email),
    business_activity: safeText(lead.business_category || lead.sector || lead.industry || lead.products_services_remarks),
    known_project_context: safeText(lead.recent_projects || lead.product_interest || "").slice(0, 500)
  };
}

function buildLeadIntelligencePrompt(leadInput) {
  return [
    "You are generating a UAE Structural Steel Lead Intelligence report for ARG Leads Tracker / Al Ras Steel.",
    `Workflow version: ${WORKFLOW_VERSION}`,
    "Use current public web research. Do not rely on memory for current facts.",
    "Identify the correct UAE entity first. If ambiguity remains, state it in research quality and do not merge companies.",
    "Use the source hierarchy: Tier 1 official company/parent/developer/government/tender/official press sources; Tier 2 reputable project/business/trade/professional sources; Tier 3 directories/job ads/case studies only as supporting evidence. Low-confidence scraped or AI summaries cannot support important claims alone.",
    "Never invent or infer person names, emails, phone numbers, project names, dates, roles, URLs, or contacts. Unknown fields must be exactly 'Not publicly found'. Separate verified facts from reasonable inferences.",
    "Return only JSON matching the requested schema. Every important factual claim must include source_refs pointing to sources[].id.",
    `Allowed CRM input: ${JSON.stringify(leadInput, null, 2)}`
  ].join("\n\n");
}

function openAiJsonSchema() {
  return {
    type: "object",
    additionalProperties: true,
    properties: {
      workflow_version: { type: "string" },
      research_date: { type: "string" },
      executive_snapshot: { type: "object" },
      company_profile: { type: "object" },
      buyer_classification: { type: "object" },
      project_intelligence: { type: "object" },
      procurement_contacts: { type: "array", items: { type: "object" } },
      best_verified_company_contact_channel: { type: "string" },
      structural_steel_opportunity: { type: "object" },
      lead_score: { type: "object" },
      sales_recommendation: { type: "object" },
      research_quality: { type: "object" },
      sources: { type: "array", items: { type: "object" } },
      anti_fabrication_check: { type: "object" }
    },
    required: ["research_date", "executive_snapshot", "company_profile", "buyer_classification", "project_intelligence", "structural_steel_opportunity", "lead_score", "sales_recommendation", "research_quality", "sources"]
  };
}

function extractResponseText(payload) {
  if (payload?.output_text) return safeText(payload.output_text);
  const chunks = [];
  for (const item of asArray(payload?.output)) {
    for (const part of asArray(item?.content)) {
      if (part?.type === "output_text" || part?.type === "text") chunks.push(part.text || "");
    }
  }
  return chunks.join("\n").trim();
}

function firstJsonObject(text) {
  const raw = String(text || "").trim();
  const start = raw.indexOf("{");
  if (start < 0) return "";
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = start; index < raw.length; index += 1) {
    const character = raw[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') quoted = false;
      continue;
    }
    if (character === '"') quoted = true;
    else if (character === "{") depth += 1;
    else if (character === "}") {
      depth -= 1;
      if (depth === 0) return raw.slice(start, index + 1);
    }
  }
  return raw.slice(start);
}

function stringEnd(text, start) {
  let escaped = false;
  for (let index = start + 1; index < text.length; index += 1) {
    if (escaped) escaped = false;
    else if (text[index] === "\\") escaped = true;
    else if (text[index] === '"') return index;
  }
  return -1;
}

function nextNonWhitespace(text, start) {
  for (let index = start; index < text.length; index += 1) {
    if (!/\s/.test(text[index])) return text[index];
  }
  return "";
}

// The model is asked for strict JSON, but it can still emit a fenced object,
// a trailing comma, omit a comma before the next object key, or include a raw
// line break in a string. Repair only those unambiguous structural defects;
// never evaluate model text as code or attempt to infer missing data.
function repairJsonObject(text) {
  const source = firstJsonObject(text);
  let output = "";
  let quoted = false;
  let escaped = false;
  const containers = [];
  const needsSeparator = () => /["}\]0-9el]/.test(output.trimEnd().slice(-1));
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === "\n") {
        output += "\\n";
        continue;
      }
      if (character === "\r") {
        output += "\\r";
        continue;
      }
      if (character === "\t") {
        output += "\\t";
        continue;
      }
      if (character.charCodeAt(0) < 0x20) {
        output += `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`;
        continue;
      }
      output += character;
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') quoted = false;
      continue;
    }
    if (character === '"') {
      const end = stringEnd(source, index);
      const isObjectKey = end >= 0 && nextNonWhitespace(source, end + 1) === ":";
      if (needsSeparator() && (isObjectKey || containers.at(-1) === "[")) output += ",";
      output += character;
      quoted = true;
      continue;
    }
    if ((character === "{" || character === "[") && needsSeparator()) output += ",";
    if (character === "{" || character === "[") containers.push(character);
    if (character === "}" || character === "]") containers.pop();
    if (character === ",") {
      const next = nextNonWhitespace(source, index + 1);
      if (next === "}" || next === "]") continue;
    }
    output += character;
  }
  return output.trim();
}

function parseJsonText(text) {
  const raw = String(text || "").trim();
  if (!raw) {
    const error = new Error("Lead intelligence validation failed: the AI response was empty.");
    error.code = "model_json_invalid";
    error.status = 422;
    error.details = ["The AI response did not contain a JSON report."];
    throw error;
  }
  const candidate = firstJsonObject(raw) || raw;
  try {
    return JSON.parse(candidate);
  } catch (initialError) {
    try {
      return JSON.parse(repairJsonObject(candidate));
    } catch (repairError) {
      const error = new Error("Lead intelligence validation failed: the AI response contained malformed JSON that could not be safely repaired. Please retry the upload.");
      error.code = "model_json_invalid";
      error.status = 422;
      error.details = [
        "The AI response was not valid JSON after safe repair.",
        `Parser detail: ${String(repairError?.message || initialError?.message || "invalid JSON").slice(0, 180)}`
      ];
      throw error;
    }
  }
}

async function generateLeadIntelligenceWithOpenAI({ lead, openAiKey, model = "gpt-4.1-mini", fetchImpl = fetch, timeoutMs = 90_000 }) {
  if (!openAiKey) {
    const error = new Error("Lead intelligence research is not configured. Add OPENAI_API_KEY on the server.");
    error.code = "provider_not_configured";
    error.status = 503;
    throw error;
  }
  const leadInput = allowedResearchInputFromLead(lead);
  if (!leadInput.company_name) {
    const error = new Error("Company name is required to generate lead intelligence.");
    error.code = "missing_company_name";
    error.status = 400;
    throw error;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  try {
    const response = await fetchImpl("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${openAiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        input: buildLeadIntelligencePrompt(leadInput),
        tools: [{ type: "web_search_preview", search_context_size: "high", user_location: { type: "approximate", country: "AE", city: "Dubai", timezone: "Asia/Dubai" } }],
        text: { format: { type: "json_schema", name: "uae_structural_steel_lead_intelligence", schema: openAiJsonSchema(), strict: false } },
        max_output_tokens: 9000
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error?.message || `OpenAI lead intelligence failed: ${response.status}`);
      error.code = response.status === 429 ? "provider_rate_limited" : "provider_error";
      error.status = response.status;
      throw error;
    }
    const parsed = parseJsonText(extractResponseText(payload));
    const report = assertValidLeadIntelligenceReport(parsed, leadInput);
    return {
      report,
      metadata: {
        provider: "openai",
        model,
        response_id: payload.id || "",
        status: payload.status || "completed",
        duration_ms: Date.now() - startedAt,
        usage: payload.usage || {}
      }
    };
  } catch (error) {
    if (error.name === "AbortError") {
      const timeout = new Error("Lead intelligence provider request timed out.");
      timeout.code = "provider_timeout";
      timeout.status = 504;
      throw timeout;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

// PDF imports use the same validated report shape as generated intelligence.  When
// the PDF has no extractable text (for example, a scanned report), Responses can
// read the attached PDF directly instead of silently producing an empty report.
async function parseLeadIntelligencePdfWithOpenAI({ rawPdfText, pdfBuffer, filename = "lead-intelligence.pdf", lead, openAiKey, model = "gpt-4.1-mini", fetchImpl = fetch, timeoutMs = 90_000 }) {
  if (!openAiKey) {
    const error = new Error("AI Lead Intelligence PDF processing is not configured. Add OPENAI_API_KEY on the server.");
    error.status = 503;
    throw error;
  }
  const source = safeText(rawPdfText);
  const hasPdfBuffer = Buffer.isBuffer(pdfBuffer) && pdfBuffer.length > 4;
  if (!source && !hasPdfBuffer) {
    const error = new Error("The uploaded PDF appears to be empty.");
    error.status = 400;
    throw error;
  }
  const leadInput = allowedResearchInputFromLead(lead);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${openAiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        input: [{ role: "user", content: [{
          type: "input_text",
          text: [
            "Reconstruct the uploaded UAE structural steel lead intelligence report.",
            "Return only JSON matching the supplied CRM schema. Do not invent facts; use 'Not publicly found' for absent values.",
            `Lead context: ${JSON.stringify(leadInput)}`,
            source ? `Extracted PDF text: ${source.slice(0, 18000)}` : "Read the attached PDF directly."
          ].join("\n\n")
        }, ...(hasPdfBuffer ? [{ type: "input_file", filename, file_data: `data:application/pdf;base64,${pdfBuffer.toString("base64")}` }] : [])] }],
        text: { format: { type: "json_schema", name: "lead_intelligence_pdf", schema: openAiJsonSchema(), strict: false } },
        max_output_tokens: 9000
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error?.message || `OpenAI lead intelligence PDF parsing failed: ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return { report: assertValidLeadIntelligenceReport(parseJsonText(extractResponseText(payload)), leadInput) };
  } catch (error) {
    if (error.name === "AbortError") {
      error = new Error("Lead intelligence provider request timed out.");
      error.status = 504;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function pdfEscape(value) {
  return String(value ?? "").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapText(value, max = 92) {
  const words = safeText(value, UNKNOWN).split(" ").filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > max) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [UNKNOWN];
}

function addPdfLine(lines, text, size = 9, indent = 0) {
  for (const line of wrapText(text, Math.max(35, 98 - indent))) lines.push({ text: line, size, indent });
}

function addSection(lines, title) {
  lines.push({ text: "", size: 6, indent: 0 });
  lines.push({ text: title, size: 13, indent: 0 });
}

function addList(lines, title, items) {
  addSection(lines, title);
  if (!items.length) return addPdfLine(lines, UNKNOWN, 9, 2);
  items.forEach(item => addPdfLine(lines, `- ${safeText(item.statement || item)}`, 9, 2));
}

function renderLeadIntelligencePdf(report, { generatedAt = new Date().toISOString() } = {}) {
  const lines = [];
  lines.push({ text: "ARG Leads Tracker / Al Ras Steel Intelligence", size: 16, indent: 0 });
  lines.push({ text: "UAE STRUCTURAL STEEL LEAD INTELLIGENCE", size: 14, indent: 0 });
  addPdfLine(lines, `Company: ${report.executive_snapshot.company}`, 11);
  addPdfLine(lines, `Research date: ${report.research_date} | Generated: ${generatedAt} | Workflow: ${report.workflow_version}`, 8);
  addPdfLine(lines, `Lead Score: ${report.lead_score.displayed_score}/10 (${report.lead_score.weighted_score}/10 weighted) | Priority: ${report.lead_score.priority} | Demand: ${report.executive_snapshot.steel_demand} | Buyer: ${report.executive_snapshot.buyer_classification}`, 10);
  addPdfLine(lines, "Disclaimer: This report uses publicly available sources and must be commercially verified before outreach.", 8);

  addSection(lines, "Executive Lead Snapshot");
  ["company_type", "procurement_accessibility", "best_sales_entry_point", "top_opportunity"].forEach(key => addPdfLine(lines, `${key.replace(/_/g, " ")}: ${report.executive_snapshot[key]}`, 9));

  addSection(lines, "Company Profile");
  Object.entries(report.company_profile).forEach(([key, value]) => addPdfLine(lines, `${key.replace(/_/g, " ")}: ${Array.isArray(value) ? (value.join(", ") || UNKNOWN) : value}`, 8));

  for (const [title, projects] of [["Recently Awarded Projects", report.project_intelligence.recently_awarded_projects], ["Ongoing Projects", report.project_intelligence.ongoing_projects], ["Previous Relevant Projects", report.project_intelligence.previous_relevant_projects], ["Announced Upcoming Projects", report.project_intelligence.announced_upcoming_projects]]) {
    addSection(lines, title);
    if (!projects.length) addPdfLine(lines, title === "Recently Awarded Projects" ? "No recently awarded UAE projects publicly verified." : title === "Ongoing Projects" ? "No ongoing UAE projects publicly verified." : UNKNOWN, 9);
    projects.forEach(project => {
      addPdfLine(lines, `Project: ${project.project_name} | Status: ${project.current_status} | Location: ${project.location}`, 9);
      addPdfLine(lines, `Client: ${project.client_developer} | Main contractor: ${project.main_contractor} | Consultant: ${project.consultant}`, 8, 2);
      addPdfLine(lines, `Role: ${project.company_role} | Date: ${project.award_announcement_date} | Steel relevance: ${project.structural_steel_relevance}`, 8, 2);
      addPdfLine(lines, `Evidence/Reason: ${project.evidence_reason}`, 8, 2);
    });
  }

  addSection(lines, "Procurement Contacts");
  if (!report.procurement_contacts.length) addPdfLine(lines, `Named procurement contact: ${UNKNOWN}. Best verified company contact channel: ${report.best_verified_company_contact_channel}`, 9);
  report.procurement_contacts.forEach((contact, index) => {
    addPdfLine(lines, `Contact ${index + 1}: ${contact.name} | ${contact.position} | Confidence: ${contact.confidence}`, 9);
    addPdfLine(lines, `Email: ${contact.business_email} | Telephone: ${contact.business_telephone} | Source: ${contact.public_professional_source}`, 8, 2);
    addPdfLine(lines, `Why relevant: ${contact.why_relevant}`, 8, 2);
  });

  addSection(lines, "Structural Steel Opportunity");
  addPdfLine(lines, `Steel Demand: ${report.structural_steel_opportunity.steel_demand}`, 10);
  report.structural_steel_opportunity.likely_required_materials.forEach(material => addPdfLine(lines, `${material.material} | ${material.likelihood} | ${material.fact_or_inference}: ${material.reason_project_link}`, 8));
  addPdfLine(lines, `Buying Pattern / Opportunity: ${report.structural_steel_opportunity.buying_pattern_opportunity}`, 9);
  addPdfLine(lines, `Buying Triggers: ${report.structural_steel_opportunity.buying_triggers.join(", ") || UNKNOWN}`, 9);

  addSection(lines, "Lead Score");
  report.lead_score.components.forEach(component => addPdfLine(lines, `${component.factor} | Weight ${component.weight_percent}% | Score ${component.score}/10 | Weighted ${component.weighted_score}: ${component.evidence}`, 8));
  addPdfLine(lines, `Weighted Lead Score: ${report.lead_score.weighted_score}/10 | Displayed Lead Score: ${report.lead_score.displayed_score}/10 | Lead Priority: ${report.lead_score.priority}`, 10);

  addSection(lines, "Sales Recommendation");
  Object.entries(report.sales_recommendation).forEach(([key, value]) => addPdfLine(lines, `${key.replace(/_/g, " ")}: ${Array.isArray(value) ? (value.join(", ") || UNKNOWN) : value}`, 9));

  addList(lines, "Verified Information", report.research_quality.verified_information);
  addList(lines, "Reasonable Inferences", report.research_quality.reasonable_inferences);
  addList(lines, "Not Publicly Found / Unverified", report.research_quality.not_publicly_found_unverified);
  addSection(lines, "Confidence Summary");
  Object.entries(report.research_quality.confidence_summary).forEach(([key, value]) => addPdfLine(lines, `${key.replace(/_/g, " ")}: ${value}`, 9));

  addSection(lines, "Sources");
  report.sources.forEach((source, index) => {
    const sourceLine = `${index + 1}. ${source.title} | ${source.publisher} | ${source.source_type} | ${source.access_date} | ${source.url}`;
    const wrapped = wrapText(sourceLine, 98);
    wrapped.forEach((line, lineIndex) => lines.push({ text: line, size: 8, indent: 0, url: lineIndex === 0 && /^https?:\/\//i.test(source.url) ? source.url : "" }));
  });

  const objects = [];
  const addObject = value => { objects.push(value); return objects.length; };
  const fontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pages = [];
  let pageLines = [];
  const flushPage = () => {
    if (!pageLines.length) return;
    const pageNumber = pages.length + 1;
    const contentLines = [...pageLines, { text: `Page ${pageNumber}`, size: 8, indent: 0, x: 520, y: 28 }];
    const stream = contentLines.map(line => `BT /F1 ${line.size || 9} Tf ${line.x || (42 + (line.indent || 0) * 10)} ${line.y} Td (${pdfEscape(line.text)}) Tj ET`).join("\n");
    const contentId = addObject(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
    const annotations = contentLines
      .filter(line => /^https?:\/\//i.test(String(line.url || "")))
      .map(line => {
        const left = line.x || (42 + (line.indent || 0) * 10);
        const bottom = Math.max(0, Number(line.y || 0) - 2);
        const top = Math.min(792, Number(line.y || 0) + 10);
        return addObject(`<< /Type /Annot /Subtype /Link /Rect [${left} ${bottom} 570 ${top}] /Border [0 0 0] /A << /S /URI /URI (${pdfEscape(line.url)}) >> >>`);
      });
    const annotBlock = annotations.length ? ` /Annots [${annotations.map(id => `${id} 0 R`).join(" ")}]` : "";
    const pageId = addObject(`<< /Type /Page /Parent 0 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >>${annotBlock} /Contents ${contentId} 0 R >>`);
    pages.push(pageId);
    pageLines = [];
  };
  let y = 752;
  for (const line of lines) {
    const step = line.size >= 13 ? 19 : line.size <= 6 ? 8 : 13;
    if (y < 54) { flushPage(); y = 752; }
    if (safeText(line.text) || line.size > 6) pageLines.push({ ...line, y });
    y -= step;
  }
  flushPage();
  const pagesId = addObject(`<< /Type /Pages /Kids [${pages.map(id => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`);
  pages.forEach(pageId => { objects[pageId - 1] = objects[pageId - 1].replace("/Parent 0 0 R", `/Parent ${pagesId} 0 R`); });
  const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(offset => { pdf += `${String(offset).padStart(10, "0")} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}

function reportSummary(report) {
  if (!report) return null;
  return {
    research_date: report.research_date,
    workflow_version: report.workflow_version,
    lead_score: report.lead_score?.displayed_score,
    weighted_score: report.lead_score?.weighted_score,
    priority: report.lead_score?.priority,
    steel_demand: report.executive_snapshot?.steel_demand,
    buyer_classification: report.executive_snapshot?.buyer_classification,
    confidence_summary: report.research_quality?.confidence_summary || {},
    sources_count: Array.isArray(report.sources) ? report.sources.length : 0
  };
}

module.exports = {
  WORKFLOW_VERSION,
  UNKNOWN,
  SCORE_FACTORS,
  allowedResearchInputFromLead,
  assertValidLeadIntelligenceReport,
  buildLeadIntelligencePrompt,
  calculateLeadScore,
  displayedScore,
  generateLeadIntelligenceWithOpenAI,
  parseJsonText,
  parseLeadIntelligencePdfWithOpenAI,
  normalizeLeadIntelligenceReport,
  priorityForWeightedScore,
  renderLeadIntelligencePdf,
  reportSummary,
  safeText
};
