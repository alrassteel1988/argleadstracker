const WORKFLOW_VERSION = "uae-structural-steel-lead-intelligence@2026-08-10";
const UNKNOWN = "Not publicly found";

const BUYER_CLASSIFICATIONS = new Set(["Buyer", "Direct Buyer", "Likely Buyer", "Fabricator", "Indirect Influencer", "Low-Relevance Buyer", "Potential Competitor", "Not Applicable", "Insufficient Evidence"]);
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
const CRM_OWNER_CONTACT_DOMAINS = new Set(["steelstockist.com", "alrassteel.com"]);
const CRM_OWNER_PHONE_DIGITS = new Set(["048860366", "97148860366"]);
const CRM_OWNER_NAME_HINTS = [/\bal\s*ras\s*steel\b/i, /\bsteel\s*stockist\b/i];
const CONTACT_CHANNEL_PLACEHOLDER_VALUES = new Set([
  "email",
  "phone",
  "telephone",
  "website",
  "contact",
  "phone number",
  "not publicly found",
  "not found",
  "best verified",
  "best channel",
  "procurement contact channel",
  "procurement contact",
  "contact channel",
  "procurement_contact_channel",
  "best_verified_channel",
  "best_verified_company_contact_channel",
  "not publicly found",
  "not publicly found.",
  "notpubliclyfound"
]);
const GEMINI_RESEARCH_STEPS = Object.freeze([
  {
    id: "A1",
    section: "Identity & profile",
    focus: "Step 1",
    brief: "Legal name, established year, HQ, website, telephone, email, company type, activities, clients."
  },
  {
    id: "A2",
    section: "Structural-steel relevance",
    focus: "Step 2",
    brief: "Buyer classification and reasoning; assess structural-steel relevance."
  },
  {
    id: "A3",
    section: "Project activity",
    focus: "Step 3",
    brief: "Recently awarded, ongoing, previous relevant and announced upcoming projects."
  },
  {
    id: "A4",
    section: "Procurement contacts",
    focus: "Step 4",
    brief: "Named individuals in procurement/commercial/GM roles, with confidence and channels."
  },
  {
    id: "A5",
    section: "Materials & scoring",
    focus: "Steps 5-6",
    brief: "Likely required materials, buying triggers, and evidence for all six score factors."
  }
]);
const GEMINI_INTERACTIONS_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";

function safeText(value, fallback = "") {
  const text = String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return text || fallback;
}

function safeSnippet(value, max = 15000) {
  return String(value ?? "").slice(0, max);
}

function normalizePlaceholder(value) {
  return safeText(value)
    .toLowerCase()
    .replace(/[\s_.:\/\-]+/g, " ")
    .replace(/["'`]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTemplatePlaceholder(value, fallback = UNKNOWN) {
  const text = safeText(value);
  const normalized = normalizePlaceholder(text);
  if (!text) return fallback;
  if (!normalized) return fallback;
  if (normalized === "unknown" || normalized === "n a" || normalized === "na") return fallback;
  if (CONTACT_CHANNEL_PLACEHOLDER_VALUES.has(normalized)) return fallback;
  return text;
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
      source_refs: sourceRefList(source.source_refs || source.sources),
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

function stripInvalidContactChannel(value) {
  const text = stripTemplatePlaceholder(value, "");
  if (!text || text === UNKNOWN) return UNKNOWN;
  const lowered = normalizePlaceholder(text);
  if (CONTACT_CHANNEL_PLACEHOLDER_VALUES.has(lowered) || /^(?:phone|telephone|email|website)$/i.test(lowered)) return UNKNOWN;
  if (text.startsWith("http://") || text.startsWith("https://") || text.includes("www.")) return text;
  if (text.includes("@")) return text;
  if (/[0-9]/.test(text)) return text;
  return UNKNOWN;
}

function normalizeSource(source, index) {
  const url = safeText(source?.url);
  return {
    id: safeText(source?.id, `src-${index + 1}`),
    label: stripTemplatePlaceholder(source?.label || source?.title || source?.name, url || UNKNOWN),
    title: stripTemplatePlaceholder(source?.title || source?.label || source?.name, url || UNKNOWN),
    url: stripTemplatePlaceholder(url || UNKNOWN, UNKNOWN),
    publisher: stripTemplatePlaceholder(source?.publisher || source?.source || source?.domain, UNKNOWN),
    tier: stripTemplatePlaceholder(source?.tier || source?.source_type || source?.type, UNKNOWN),
    source_type: stripTemplatePlaceholder(source?.source_type || source?.type, UNKNOWN),
    accessed_date: safeDate(source?.accessed_date || source?.access_date || source?.research_date) || new Date().toISOString().slice(0, 10),
    access_date: safeDate(source?.access_date || source?.research_date) || new Date().toISOString().slice(0, 10)
  };
}

function collectResponseUrlCitations(value, citations = []) {
  if (!value || typeof value !== "object") return citations;
  if (Array.isArray(value)) {
    value.forEach(item => collectResponseUrlCitations(item, citations));
    return citations;
  }
  if (value.type === "url_citation" && value.url) {
    citations.push({
      url: value.url,
      title: value.title || value.label || value.url,
      publisher: value.publisher || value.source || "",
      source_type: "Web citation"
    });
  }
  Object.values(value).forEach(item => collectResponseUrlCitations(item, citations));
  return citations;
}

function extractInlineUrls(value) {
  if (!value) return [];
  const text = String(value);
  const pattern = /(?:https?:\/\/|www\.)[^\s\]\)\}>"']+/gi;
  const urls = [];
  for (const match of text.matchAll(pattern)) {
    let rawUrl = safeText(match[0]);
    if (!rawUrl) continue;
    rawUrl = rawUrl.replace(/[)\].,;:]$/, "");
    urls.push(rawUrl.startsWith("www.") ? `https://${rawUrl}` : rawUrl);
  }
  return urls;
}

function extractGeminiContentReadSignals(payload = {}) {
  const candidates = asArray(payload?.candidates);
  const candidateSignals = [];
  candidates.forEach((candidate, candidateIndex) => {
    const candidateText = extractResponseText(candidate?.content ? { output: [{ content: asArray(candidate.content.parts || []) }] } : payload);
    const groundingMetadata = candidate?.grounding_metadata || candidate?.groundingMetadata || {};
    const groundingChunks = asArray(groundingMetadata?.grounding_chunks || groundingMetadata?.groundingChunks || groundingMetadata?.grounding_chunkss).filter(Boolean);
    const chunkSignals = groundingChunks.map((chunk, index) => {
      const web = chunk?.web || {};
      const resolvedUrl = safeText(chunk?.uri || web?.uri || web?.url || chunk?.url);
      const retrievedContent = safeText(chunk?.text || web?.text || web?.snippet || chunk?.snippet);
      return {
        source: resolvedUrl || "unknown-url",
        has_text: Boolean(retrievedContent),
        has_content_length: retrievedContent.length,
        text_preview: safeSnippet(retrievedContent, 1800) || safeSnippet(chunk?.content || "", 1800),
        chunk_index: index,
        chunk_type: chunk?.type || (chunk?.web ? "web" : "unknown")
      };
    });
    if (groundingChunks.length || candidateText) {
      candidateSignals.push({
        candidate_index: candidateIndex,
        candidate_keys: Object.keys(candidate || {}),
        has_output_text: Boolean(safeSnippet(candidateText)),
        grounding_metadata_keys: Object.keys(groundingMetadata || {}),
        grounding_chunks: chunkSignals
      });
    }
  });
  const stepSignals = {
    has_steps: Array.isArray(payload?.steps),
    step_count: asArray(payload?.steps).length,
    output_text_len: extractResponseText(payload).length,
    candidate_count: candidates.length,
    candidate_signals: candidateSignals,
    payload_keys: Object.keys(payload || {})
  };
  const readEvidence = {
    from_candidates: candidateSignals.some(candidate => candidate.grounding_chunks.length),
    from_payload_grounding: Boolean(asArray(payload?.groundingMetadata).length || asArray(payload?.grounding_metadata).length),
    from_output_text: Boolean(stepSignals.output_text_len),
    candidate_signals: candidateSignals
  };
  return { step_signals: stepSignals, read_evidence: readEvidence };
}

function logGeminiReadAttempt(step, leadInput, payload) {
  if (!process.env.LEAD_INTELLIGENCE_DEBUG_GEMINI_FETCH) return;
  const citations = collectGeminiUrlCitations(payload);
  const signals = extractGeminiContentReadSignals(payload);
  const readSignals = signals.read_evidence;
  const rawText = extractResponseText(payload);
  const hasAlGeemiSignal = citations.some(citation => /algeemi\.com/i.test(safeText(citation.url)));
  console.log(`[intel-debug][gemini][${step.id}] output_text_length=${rawText.length}, citations=${citations.length}, has_algeemi_citation=${hasAlGeemiSignal}`);
  console.log(`[intel-debug][gemini][${step.id}] read_evidence=${JSON.stringify({
    has_read_attempted: readSignals.from_candidates || readSignals.from_payload_grounding || readSignals.from_output_text,
    from_candidates: readSignals.from_candidates,
    from_payload_grounding: readSignals.from_payload_grounding,
    from_output_text: readSignals.from_output_text,
    payload_keys: signals.step_signals.payload_keys,
    candidate_count: signals.step_signals.candidate_count
  })}`);
  console.log(`[intel-debug][gemini][${step.id}] output_text_preview=${safeSnippet(rawText, 2200)}`);
  const topUrlSignals = readSignals.from_candidates ? asArray(signals.step_signals.candidate_signals).map(candidate => candidate.grounding_chunks).flat().filter(Boolean) : [];
  if (topUrlSignals.length) {
    console.log(`[intel-debug][gemini][${step.id}] read_payload=${JSON.stringify(topUrlSignals.map(signal => ({
      source: signal.source,
      has_content_length: signal.has_content_length,
      text_preview: signal.text_preview
    })))}`);
  }
  if (citations.length) {
    console.log(`[intel-debug][gemini][${step.id}] cited_urls=${JSON.stringify(citations.map(source => source.url))}`);
  } else {
    console.log(`[intel-debug][gemini][${step.id}] cited_urls=[]`);
  }
}

function collectGeminiUrlCitations(payload, citations = []) {
  for (const step of asArray(payload?.steps)) {
    if (step?.type !== "model_output") continue;
    for (const block of asArray(step.content)) {
      if (block?.type !== "text") continue;
      for (const annotation of asArray(block.annotations)) {
        if (annotation?.type !== "url_citation" || !annotation.url) continue;
        const normalizedUrl = safeText(annotation.url);
        const normalizedTitle = stripTemplatePlaceholder(annotation.title || annotation.label, normalizedUrl);
        if (isCrmOwnerLeak(normalizedTitle)) continue;
        citations.push({
          url: normalizedUrl,
          title: normalizedTitle || normalizedUrl,
          publisher: stripTemplatePlaceholder(annotation.publisher || annotation.title || "", ""),
          source_type: "Gemini Google Search citation"
        });
      }
      for (const url of extractInlineUrls(block.text)) {
        const normalizedUrl = safeText(url);
        if (!normalizedUrl) continue;
        citations.push({
          url: normalizedUrl,
          title: normalizedUrl,
          publisher: "",
          source_type: "Gemini Google Search citation"
        });
      }
    }
  }
  return citations;
}

function mergeCitationSources(input, citations = []) {
  const existingSources = asArray(input?.sources);
  const scrubbedExisting = existingSources.map((source, index) => {
    const next = {
      ...source,
      title: stripTemplatePlaceholder(source?.title || source?.label || source?.name, UNKNOWN),
      label: stripTemplatePlaceholder(source?.label || source?.title || source?.name, UNKNOWN),
      url: stripTemplatePlaceholder(source?.url, UNKNOWN),
      publisher: stripTemplatePlaceholder(source?.publisher || source?.source || source?.domain, UNKNOWN),
      tier: stripTemplatePlaceholder(source?.tier || source?.source_type || source?.type, UNKNOWN),
      source_type: stripTemplatePlaceholder(source?.source_type || source?.type, UNKNOWN),
      accessed_date: safeDate(source?.accessed_date || source?.access_date || source?.research_date) || new Date().toISOString().slice(0, 10),
      access_date: safeDate(source?.access_date || source?.research_date) || new Date().toISOString().slice(0, 10)
    };
    if (isCrmOwnerLeak(next.url) || isCrmOwnerLeak(next.label) || isCrmOwnerLeak(next.title) || isCrmOwnerLeak(next.publisher) || isCrmOwnerLeak(next.tier) || isCrmOwnerLeak(next.source_type)) {
      return { ...next, id: safeText(source?.id, `src-${index + 1}`), url: UNKNOWN, title: UNKNOWN, label: UNKNOWN, publisher: UNKNOWN, tier: UNKNOWN, source_type: UNKNOWN };
    }
    return next;
  });
  if (!citations.length) return { ...input, sources: scrubbedExisting };
  const seen = new Set(existingSources.map(source => safeText(source?.url).toLowerCase()).filter(Boolean));
  const citedSources = citations
    .filter(citation => {
      const url = safeText(citation.url).toLowerCase();
      if (!url || seen.has(url)) return false;
      seen.add(url);
      return true;
    })
    .map((citation, index) => ({
      id: safeText(citation.id, `src-${existingSources.length + index + 1}`),
      title: safeText(citation.title, citation.url),
      url: safeText(citation.url),
      publisher: stripTemplatePlaceholder(citation.publisher, UNKNOWN),
      source_type: safeText(citation.source_type, "Web citation"),
      access_date: new Date().toISOString().slice(0, 10)
    }));
  if (!citedSources.length) return input;
  const sourceRefs = citedSources.map(source => source.id).slice(0, 3);
  const researchQuality = input?.research_quality && typeof input.research_quality === "object" ? input.research_quality : {};
  return {
    ...input,
    sources: [...existingSources, ...citedSources],
    research_quality: {
      ...researchQuality,
      verified_information: asArray(researchQuality.verified_information).length
        ? researchQuality.verified_information
        : [{
            statement: `Public web research returned URL-backed source material for ${safeText(input?.executive_snapshot?.company || input?.company_profile?.company, "this lead")}.`,
            source_refs: sourceRefs,
            confidence: "Medium"
          }]
    }
  };
}

function extractFirstBalancedJson(raw = "") {
  let depth = 0;
  let inString = false;
  let escaped = false;
  let start = -1;
  for (let index = 0; index < raw.length; index += 1) {
    const ch = raw[index];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === "\"") {
        inString = false;
      }
      continue;
    }
    if (ch === "\"") {
      inString = true;
      continue;
    }
    if (ch === "{") {
      if (start === -1) start = index;
      depth += 1;
      continue;
    }
    if (ch === "}") {
      if (start === -1) continue;
      depth -= 1;
      if (depth === 0) return raw.slice(start, index + 1);
    }
  }
  return "";
}

function normalizeJsonTextForParsing(candidate) {
  return String(candidate || "").trim().replace(/,\s*([}\]])/g, "$1");
}

function isUsableSourceForConfidence(source = {}) {
  const url = safeText(source.url);
  const sourceType = safeText(source.source_type);
  return url && url !== UNKNOWN && sourceType !== "Unverified public research gap" && !isCrmOwnerLeak(url);
}

function appendLowConfidenceGap(report, statement) {
  if (!report.research_quality.not_publicly_found_unverified.some(item => item.statement === statement)) {
    appendGroundingGap(report, statement);
  }
}

function applyDeterministicLowConfidenceFallback(report) {
  const sourceIds = validSourceIds(report.sources);
  const hasGroundedSource = asArray(report.sources).some(isUsableSourceForConfidence);
  const hasGroundedVerified = asArray(report.research_quality.verified_information).some(item => {
    const statement = stripTemplatePlaceholder(item?.statement, "");
    return statement && statement !== UNKNOWN && groundedRefs(item?.source_refs, sourceIds).length > 0;
  });
  if (!hasGroundedSource || !hasGroundedVerified) {
    if (!hasGroundedSource) {
      appendLowConfidenceGap(report, "No source-backed public URL or citation was returned by the research workflow.");
    } else {
      appendLowConfidenceGap(report, "No grounded, source-backed verified facts were returned by the research workflow.");
    }
    appendLowConfidenceGap(report, "Information is low-confidence until manually validated with additional public evidence.");
    report.company_profile = {
      ...report.company_profile,
      established: UNKNOWN,
      headquarters: UNKNOWN,
      website: UNKNOWN,
      telephone: UNKNOWN,
      general_email: UNKNOWN,
      email: UNKNOWN,
      po_box: UNKNOWN,
      contact_page: UNKNOWN,
      locations: [],
      parent_group: UNKNOWN,
      company_type: UNKNOWN,
      main_activities: [],
      services_evidenced: [],
      main_products_services: [],
      industries_served: [],
      clients_listed: [],
      important_clients: [],
      identity_confidence: "Low",
      structural_steel_relationship: UNKNOWN
    };
    report.executive_snapshot = {
      ...report.executive_snapshot,
      company_type: UNKNOWN,
      procurement_accessibility: UNKNOWN,
      best_entry_point: UNKNOWN,
      best_sales_entry_point: UNKNOWN,
      top_opportunity: UNKNOWN,
      primary_sales_angle: UNKNOWN,
      key_limitation: UNKNOWN,
      recommended_first_action: UNKNOWN
    };
    report.project_intelligence = {
      ...report.project_intelligence,
      project_intelligence_conclusion: UNKNOWN,
      recently_awarded_projects: [],
      ongoing_projects: [],
      previous_relevant_projects: [],
      announced_upcoming_projects: []
    };
    report.procurement_contacts = [];
    report.named_contacts = [];
    report.named_procurement_contact = UNKNOWN;
    report.best_verified_company_contact_channel = UNKNOWN;
    report.best_verified_channel = UNKNOWN;
    report.contact_strategy = UNKNOWN;
    report.suggested_opening_message = UNKNOWN;
    report.qualification_questions = [];
    report.structural_steel_opportunity = {
      ...report.structural_steel_opportunity,
      buying_pattern: UNKNOWN,
      buying_pattern_opportunity: UNKNOWN,
      buying_triggers: [],
      likely_required_materials: [],
      materials: []
    };
    report.lead_score.components = report.lead_score.components.map(component => ({
      ...component,
      score: 0,
      weighted_score: 0,
      evidence: UNKNOWN,
      source_refs: []
    }));
    report.lead_score.weighted_score = 0;
    report.lead_score.displayed_score = displayedScore(0);
    report.lead_score.priority = "D";
    report.executive_snapshot.lead_score = report.lead_score.displayed_score;
    report.lead_score_sales_plan = {
      ...report.lead_score_sales_plan,
      sales_recommendation: UNKNOWN,
      commercial_angle: UNKNOWN,
      reference_point: UNKNOWN,
      next_milestone: UNKNOWN
    };
    report.sales_recommendation = {
      ...report.sales_recommendation,
      best_person_department_to_approach: UNKNOWN,
      recommended_sales_angle: UNKNOWN,
      known_active_recent_project_to_reference: UNKNOWN,
      most_relevant_products: [],
      suggested_next_action: UNKNOWN,
      suggested_opening_message_angle: UNKNOWN,
      sales_recommendation: UNKNOWN,
      commercial_angle: UNKNOWN,
      reference_point: UNKNOWN,
      next_milestone: UNKNOWN
    };
    report.research_quality.reasonable_inferences = [];
    report.research_quality.confidence_summary = {
      company_identity: "Low",
      company_profile: "Low",
      project_intelligence: "Low",
      procurement_contacts: "Low",
      steel_opportunity_assessment: "Low"
    };
    if (!report.sources.length) {
      report.sources = [{
        id: "src-unverified-public-research",
        label: "No public source URL verified by research workflow",
        title: "No public source URL verified by research workflow",
        url: UNKNOWN,
        publisher: UNKNOWN,
        tier: "Unverified public research gap",
        source_type: "Unverified public research gap",
        accessed_date: report.research_date,
        access_date: report.research_date
      }];
    }
    appendLowConfidenceGap(report, "High-confidence fields were normalized to low-confidence placeholders to prevent unrecoverable contamination.");
  }
  return report;
}

function validSourceIds(sources) {
  return new Set(asArray(sources).map(source => safeText(source.id)).filter(Boolean));
}

function groundedRefs(refs, sourceIds) {
  return sourceRefList(refs).filter(ref => sourceIds.has(ref));
}

function appendGroundingGap(report, statement) {
  report.research_quality.not_publicly_found_unverified.push({
    statement,
    source_refs: [],
    confidence: "Low"
  });
}

function sourceRefText(refs) {
  const values = sourceRefList(refs);
  return values.length ? `Sources: ${values.join(", ")}` : "Sources: Not source-backed";
}

function hostFromUrl(value) {
  const text = safeText(value);
  if (!text || text === UNKNOWN) return "";
  try {
    return new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return text.replace(/^www\./i, "").split("/")[0].toLowerCase();
  }
}

function phoneDigits(value) {
  return safeText(value).replace(/\D/g, "");
}

function targetLooksLikeCrmOwner(companyName) {
  return /(?:^|\b)(al\s*ras|arg|steel\s*stockist)(?:\b|$)/i.test(safeText(companyName));
}

function isCrmOwnerLeak(value) {
  const text = safeText(value);
  if (!text || text === UNKNOWN) return false;
  const lowered = text.toLowerCase();
  if (CRM_OWNER_PHONE_DIGITS.has(phoneDigits(text))) return true;
  const host = hostFromUrl(text);
  if (CRM_OWNER_CONTACT_DOMAINS.has(host)) return true;
  if (/@/.test(text)) {
    const domain = hostFromUrl(text.split("@").pop() || "");
    if (CRM_OWNER_CONTACT_DOMAINS.has(domain)) return true;
  }
  if (CRM_OWNER_NAME_HINTS.some(pattern => pattern.test(text))) return true;
  return false;
}

function scrubStringForOwnerLeaks(value) {
  const text = safeText(value);
  if (!isCrmOwnerLeak(text)) return { value: text, changed: false };
  return { value: UNKNOWN, changed: true };
}

function scrubFieldForOwnerLeaks(node, path, removed) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (let index = 0; index < node.length; index += 1) {
      const item = node[index];
      if (item === null || item === undefined) continue;
      if (typeof item === "string") {
        const scrubbed = scrubStringForOwnerLeaks(item);
        if (scrubbed.changed) {
          removed.push(`${path}[${index}]`);
          node[index] = UNKNOWN;
        }
      } else if (typeof item === "object") {
        scrubFieldForOwnerLeaks(item, `${path}[${index}]`, removed);
      }
    }
    return;
  }
  if (path === "report.sources" && node.id !== undefined && !node.id) {
    return;
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === "id") continue;
    if (typeof value === "string") {
      const scrubbed = scrubStringForOwnerLeaks(value);
      if (scrubbed.changed) {
        removed.push(`${path}.${key}`);
        node[key] = UNKNOWN;
      }
      continue;
    }
    if (value && typeof value === "object") {
      scrubFieldForOwnerLeaks(value, `${path}.${key}`, removed);
    }
  }
}

function sanitizeCrmOwnerContactLeak(report) {
  if (targetLooksLikeCrmOwner(report.executive_snapshot.company)) return;
  const removed = [];
  scrubFieldForOwnerLeaks(report, "report", removed);
  if (removed.length) {
    appendGroundingGap(report, `CRM owner values were removed from the target-company report to prevent contamination: ${removed.join(", ")}.`);
  }
}

function enforceContactGrounding(contactRows, report, fallbackSourceRefs = []) {
  const keptContacts = [];
  const contactsWithRefs = asArray(contactRows).map(item => ({
    ...item,
    source_refs: sourceRefList(item?.source_refs || item?.sources)
  }));
  const applyFallbackSourceRefs = item => {
    if (!item.source_refs.length && fallbackSourceRefs.length) {
      item.source_refs = fallbackSourceRefs;
    }
  };
  for (const contact of contactsWithRefs) {
    const sanitizedContactName = stripTemplatePlaceholder(contact.name);
    const sanitizedContactEmail = stripTemplatePlaceholder(contact.business_email);
    const sanitizedContactPhone = stripTemplatePlaceholder(contact.business_telephone);
    const hasNamedData = [sanitizedContactName, sanitizedContactEmail, sanitizedContactPhone].some(value => value && value !== UNKNOWN);
    const hadSourceRefs = contact.source_refs.length > 0;
    contact.name = sanitizedContactName;
    contact.business_email = sanitizedContactEmail;
    contact.business_telephone = sanitizedContactPhone;
    applyFallbackSourceRefs(contact);
    if (hasNamedData && !contact.source_refs.length) {
      if (sanitizedContactName && sanitizedContactName !== UNKNOWN) {
        appendGroundingGap(report, `Procurement contact claim omitted because it was not tied to a verified source: ${contact.name}.`);
      } else if (contact.position || contact.role) {
        appendGroundingGap(report, "Procurement contact claim omitted because it was not tied to a verified source.");
      }
      continue;
    }
    if (hasNamedData && !hadSourceRefs && contact.source_refs.length) {
      appendGroundingGap(report, `Procurement contact claim retained from ungrounded output and should be treated as low-confidence: ${sanitizedContactName || "procurement contact evidence"}.`);
    }
    if (!hasNamedData) {
      continue;
    }
    keptContacts.push(contact);
  }
  return keptContacts;
}

function enforceSourceGrounding(report) {
  const sourceIds = validSourceIds(report.sources);
  const groundingSourceIds = asArray(report.sources).filter(isUsableSourceForConfidence).map(source => safeText(source.id)).filter(Boolean);
  const fallbackSourceRefs = groundingSourceIds.length ? [groundingSourceIds[0]] : [];
  const applyFallbackSourceRefs = item => {
    if (!item.source_refs.length && fallbackSourceRefs.length) {
      item.source_refs = fallbackSourceRefs;
    }
    return item;
  };
  const normalizeRefs = item => {
    item.source_refs = groundedRefs(item.source_refs, sourceIds);
    return item;
  };
  Object.values(report.project_intelligence).filter(Array.isArray).forEach(projects => {
    const kept = [];
    for (const project of projects.map(normalizeRefs)) {
      const hasProjectData = [project.project_name, project.client, project.client_developer, project.main_contractor, project.main_contracter, project.consultant, project.location, project.company_role, project.award_announcement_date, project.current_status].some(value => value && value !== UNKNOWN);
      if (!hasProjectData) continue;
      if (!project.source_refs.length) {
        applyFallbackSourceRefs(project);
        if (project.source_refs.length) {
          appendGroundingGap(report, `Project claim retained from ungrounded output and should be treated as low-confidence: ${stripTemplatePlaceholder(project.project_name, "project evidence")}.`);
          kept.push(project);
          continue;
        }
        const claim = stripTemplatePlaceholder(project.project_name, "project evidence");
        if (!claim || claim === "project evidence") {
          appendGroundingGap(report, "Project claim omitted because it was not tied to a verified source.");
          continue;
        }
        appendGroundingGap(report, `Project claim omitted because it was not tied to a verified source: ${claim}.`);
        continue;
      }
      kept.push(project);
    }
    projects.splice(0, projects.length, ...kept);
  });
  report.procurement_contacts = enforceContactGrounding(report.procurement_contacts.map(normalizeRefs), report, fallbackSourceRefs);
  report.named_contacts = enforceContactGrounding(report.named_contacts.map(normalizeRefs), report, fallbackSourceRefs);
  report.structural_steel_opportunity.likely_required_materials = report.structural_steel_opportunity.likely_required_materials.map(material => {
    const next = normalizeRefs(material);
    if (next.fact_or_inference === "Verified" && !next.source_refs.length) next.fact_or_inference = "Inference";
    if (!next.source_refs.length) {
      applyFallbackSourceRefs(next);
      if (next.source_refs.length) {
        appendGroundingGap(report, `Material claim retained from ungrounded output and should be treated as low-confidence: ${safeText(next.material, "material evidence")}.`);
      }
    }
    return next;
  });
  report.lead_score.components = report.lead_score.components.map(normalizeRefs);
  report.research_quality.verified_information = report.research_quality.verified_information.map(normalizeRefs).filter(fact => {
    if (fact.statement !== UNKNOWN && !fact.source_refs.length) {
      report.research_quality.reasonable_inferences.push({
        ...fact,
        confidence: fact.confidence === "High" ? "Medium" : fact.confidence
      });
      return false;
    }
    return true;
  });
  report.research_quality.reasonable_inferences = report.research_quality.reasonable_inferences.map(normalizeRefs);
  report.research_quality.not_publicly_found_unverified = report.research_quality.not_publicly_found_unverified.map(normalizeRefs);
  sanitizeCrmOwnerContactLeak(report);
  if (!report.research_quality.verified_information.length) {
    report.research_quality.verified_information.push({
      statement: "No independently verified public facts with source references were returned by the research workflow.",
      source_refs: [],
      confidence: "Low"
    });
  }
  return report;
}

function normalizeProject(project) {
  const client = safeText(project?.client || project?.client_developer, UNKNOWN);
  const statusDate = safeText(project?.status_date || project?.award_announcement_date || project?.award_date || project?.announcement_date || project?.current_status || project?.status, UNKNOWN);
  return {
    project_name: stripTemplatePlaceholder(project?.project_name || project?.project, UNKNOWN),
    client,
    client_developer: client,
    main_contracter: stripTemplatePlaceholder(project?.main_contracter || project?.main_contractor, UNKNOWN),
    main_contractor: stripTemplatePlaceholder(project?.main_contractor || project?.main_contracter, UNKNOWN),
    consultant: stripTemplatePlaceholder(project?.consultant, UNKNOWN),
    location: stripTemplatePlaceholder(project?.location, UNKNOWN),
    company_role: stripTemplatePlaceholder(project?.company_role || project?.role, UNKNOWN),
    award_announcement_date: stripTemplatePlaceholder(project?.award_announcement_date || project?.award_date || project?.announcement_date, UNKNOWN),
    current_status: stripTemplatePlaceholder(project?.current_status || project?.status, UNKNOWN),
    expected_completion: stripTemplatePlaceholder(project?.expected_completion, UNKNOWN),
    structural_steel_relevance: enumValue(project?.structural_steel_relevance, STEEL_RELEVANCE, "Unknown"),
    evidence_reason: stripTemplatePlaceholder(project?.evidence_reason || project?.evidence || project?.reason, UNKNOWN),
    verified_scope: stripTemplatePlaceholder(project?.verified_scope || project?.scope || project?.evidence_reason || project?.evidence || project?.reason, UNKNOWN),
    status_date: statusDate,
    confidence: enumValue(project?.confidence, CONFIDENCE_LABELS, "Low"),
    source_refs: sourceRefList(project?.source_refs || project?.sources)
  };
}

function normalizeContact(contact) {
  const role = stripTemplatePlaceholder(contact?.role || contact?.position || contact?.title, UNKNOWN);
  return {
    name: stripTemplatePlaceholder(contact?.name, UNKNOWN),
    role,
    position: role,
    company: stripTemplatePlaceholder(contact?.company, UNKNOWN),
    location: stripTemplatePlaceholder(contact?.location, UNKNOWN),
    business_email: stripTemplatePlaceholder(contact?.business_email || contact?.email, UNKNOWN),
    business_telephone: stripTemplatePlaceholder(contact?.business_telephone || contact?.telephone || contact?.phone, UNKNOWN),
    source_note: stripTemplatePlaceholder(contact?.source_note || contact?.public_professional_source || contact?.source, UNKNOWN),
    public_professional_source: stripTemplatePlaceholder(contact?.public_professional_source || contact?.source_note || contact?.source, UNKNOWN),
    confidence: enumValue(contact?.confidence, CONFIDENCE_LABELS, "Low"),
    why_relevant: stripTemplatePlaceholder(contact?.why_relevant || contact?.relevance, UNKNOWN),
    source_refs: sourceRefList(contact?.source_refs || contact?.sources)
  };
}

function normalizeMaterial(item) {
  return {
    material: stripTemplatePlaceholder(item?.material, UNKNOWN),
    likelihood: stripTemplatePlaceholder(item?.likelihood, "Unknown"),
    rationale: stripTemplatePlaceholder(item?.rationale || item?.reason_project_link || item?.reason, UNKNOWN),
    reason_project_link: stripTemplatePlaceholder(item?.reason_project_link || item?.rationale || item?.reason, UNKNOWN),
    basis: /verified/i.test(safeText(item?.basis || item?.fact_or_inference)) ? "Verified" : "Inference",
    fact_or_inference: /verified/i.test(safeText(item?.fact_or_inference || item?.basis)) ? "Verified" : "Inference",
    source_refs: sourceRefList(item?.source_refs || item?.sources)
  };
}

function normalizeFact(item, kind) {
  if (typeof item === "string") return { statement: safeText(item, UNKNOWN), source_refs: [], confidence: kind === "inference" ? "Medium" : "Low" };
  return {
    statement: stripTemplatePlaceholder(item?.statement || item?.fact || item?.inference || item?.gap, UNKNOWN),
    source_refs: sourceRefList(item?.source_refs || item?.sources),
    confidence: enumValue(item?.confidence, CONFIDENCE_LABELS, kind === "verified" ? "Medium" : "Low")
  };
}

function normalizeLeadIntelligenceReport(input = {}, context = {}) {
  const errors = [];
  const researchDate = safeDate(input.research_date) || new Date().toISOString().slice(0, 10);
  const sources = asArray(input.sources).map(normalizeSource).filter(item => item.title !== UNKNOWN || item.url !== UNKNOWN);
  const executiveInput = input.executive_decision || input.executive_snapshot || {};
  const profileInput = input.company_profile || {};
  const projectInput = input.project_intelligence || {};
  const contactInput = input.procurement_commercial_contacts || {};
  const opportunityInput = input.structural_steel_opportunity || {};
  const scoreInput = input.lead_score_sales_plan || input.lead_score || {};
  const qualityInput = input.research_quality || {};

  const score = calculateLeadScore(scoreInput.score_factors || scoreInput.components || input.scoring_components || input.components || []);
  const priority = priorityForWeightedScore(score.weighted_score);
  if (scoreInput.priority && !PRIORITIES.has(scoreInput.priority)) errors.push("Lead priority must be A, B, C, or D.");

  const companyName = safeText(executiveInput.company || profileInput.company || profileInput.legal_name || context.company_name);
  if (!companyName) errors.push("Company name is required.");

  const report = {
    workflow_version: safeText(input.workflow_version, WORKFLOW_VERSION),
    research_date: researchDate,
    executive_snapshot: {
      company: companyName || UNKNOWN,
      company_type: stripTemplatePlaceholder(executiveInput.company_type || profileInput.company_type, UNKNOWN),
      buyer_classification: enumValue(executiveInput.buyer_classification, BUYER_CLASSIFICATIONS, "Insufficient Evidence"),
      lead_score: score.displayed_score,
      steel_demand: enumValue(executiveInput.steel_demand, DEMAND_LABELS, "UNKNOWN"),
      sales_priority: safeText(executiveInput.sales_priority || scoreInput.priority, priority),
      executive_summary: stripTemplatePlaceholder(executiveInput.executive_summary, UNKNOWN),
      procurement_accessibility: stripTemplatePlaceholder(executiveInput.procurement_accessibility || executiveInput.best_entry_point, "Unknown"),
      best_entry_point: stripTemplatePlaceholder(executiveInput.best_entry_point || executiveInput.best_sales_entry_point, UNKNOWN),
      best_sales_entry_point: stripTemplatePlaceholder(executiveInput.best_sales_entry_point || executiveInput.best_entry_point, UNKNOWN),
      top_opportunity: stripTemplatePlaceholder(executiveInput.top_opportunity, UNKNOWN),
      primary_sales_angle: stripTemplatePlaceholder(executiveInput.primary_sales_angle, UNKNOWN),
      key_limitation: stripTemplatePlaceholder(executiveInput.key_limitation, UNKNOWN),
      recommended_first_action: stripTemplatePlaceholder(executiveInput.recommended_first_action, UNKNOWN)
    },
    company_profile: {
      company: companyName || UNKNOWN,
      legal_name: stripTemplatePlaceholder(profileInput.legal_name || companyName, UNKNOWN),
      established: stripTemplatePlaceholder(profileInput.established, UNKNOWN),
      headquarters: stripTemplatePlaceholder(profileInput.headquarters, UNKNOWN),
      website: stripTemplatePlaceholder(profileInput.website, UNKNOWN),
      telephone: stripTemplatePlaceholder(profileInput.telephone, UNKNOWN),
      general_email: stripTemplatePlaceholder(profileInput.general_email || profileInput.email, UNKNOWN),
      email: stripTemplatePlaceholder(profileInput.email || profileInput.general_email, UNKNOWN),
      po_box: stripTemplatePlaceholder(profileInput.po_box, UNKNOWN),
      contact_page: stripTemplatePlaceholder(profileInput.contact_page, UNKNOWN),
      locations: asArray(profileInput.locations).map(item => safeText(item)).filter(Boolean),
      parent_group: stripTemplatePlaceholder(profileInput.parent_group, UNKNOWN),
      company_type: stripTemplatePlaceholder(profileInput.company_type, UNKNOWN),
      main_activities: asArray(profileInput.main_activities).map(item => safeText(item)).filter(Boolean),
      services_evidenced: asArray(profileInput.services_evidenced || profileInput.main_products_services).map(item => safeText(item)).filter(Boolean),
      main_products_services: asArray(profileInput.main_products_services || profileInput.services_evidenced).map(item => safeText(item)).filter(Boolean),
      industries_served: asArray(profileInput.industries_served).map(item => safeText(item)).filter(Boolean),
      clients_listed: asArray(profileInput.clients_listed || profileInput.important_clients).map(item => safeText(item)).filter(Boolean),
      important_clients: asArray(profileInput.important_clients || profileInput.clients_listed).map(item => safeText(item)).filter(Boolean),
      identity_confidence: enumValue(profileInput.identity_confidence, CONFIDENCE_LABELS, "Low"),
      structural_steel_relationship: stripTemplatePlaceholder(profileInput.structural_steel_relationship, UNKNOWN)
    },
    buyer_classification: {
      classification: enumValue(input.buyer_classification?.classification || executiveInput.buyer_classification, BUYER_CLASSIFICATIONS, "Insufficient Evidence"),
      basis: safeText(input.buyer_classification?.basis, UNKNOWN)
    },
    project_intelligence: {
      recently_awarded_projects: asArray(projectInput.recently_awarded_projects).map(normalizeProject),
      ongoing_projects: asArray(projectInput.ongoing_projects).map(normalizeProject),
      previous_relevant_projects: asArray(projectInput.previous_relevant_projects).map(normalizeProject),
      announced_upcoming_projects: asArray(projectInput.announced_upcoming_projects).map(normalizeProject),
      project_intelligence_conclusion: safeText(projectInput.project_intelligence_conclusion, UNKNOWN)
    },
    procurement_contacts: asArray(input.procurement_contacts || contactInput.named_contacts || input.named_contacts).map(normalizeContact),
    named_contacts: asArray(contactInput.named_contacts || input.procurement_contacts || input.named_contacts).map(normalizeContact),
    named_procurement_contact: stripTemplatePlaceholder(contactInput.named_procurement_contact, UNKNOWN),
    best_verified_company_contact_channel: stripInvalidContactChannel(input.best_verified_company_contact_channel || contactInput.best_verified_channel || input.procurement_contact_channel),
    best_verified_channel: stripInvalidContactChannel(contactInput.best_verified_channel || input.best_verified_company_contact_channel || input.procurement_contact_channel),
    contact_strategy: stripTemplatePlaceholder(contactInput.contact_strategy, UNKNOWN),
    suggested_opening_message: stripTemplatePlaceholder(contactInput.suggested_opening_message, UNKNOWN),
    qualification_questions: asArray(contactInput.qualification_questions).map(item => safeText(item)).filter(Boolean),
    structural_steel_opportunity: {
      steel_demand: enumValue(opportunityInput.steel_demand || executiveInput.steel_demand, DEMAND_LABELS, "UNKNOWN"),
      materials: asArray(opportunityInput.materials || opportunityInput.likely_required_materials).map(normalizeMaterial),
      likely_required_materials: asArray(opportunityInput.likely_required_materials || opportunityInput.materials).map(normalizeMaterial),
      buying_pattern: safeText(opportunityInput.buying_pattern || opportunityInput.buying_pattern_opportunity, UNKNOWN),
      buying_pattern_opportunity: safeText(opportunityInput.buying_pattern_opportunity || opportunityInput.buying_pattern, UNKNOWN),
      buying_triggers: Array.isArray(opportunityInput.buying_triggers) ? opportunityInput.buying_triggers.map(item => safeText(item)).filter(Boolean) : [safeText(opportunityInput.buying_triggers, UNKNOWN)].filter(Boolean)
    },
    lead_score: score,
    lead_score_sales_plan: {
      score_factors: score.components,
      weighted_score: score.weighted_score,
      sales_recommendation: stripTemplatePlaceholder(scoreInput.sales_recommendation || input.sales_recommendation?.sales_recommendation, UNKNOWN),
      commercial_angle: stripTemplatePlaceholder(scoreInput.commercial_angle || input.sales_recommendation?.recommended_sales_angle, UNKNOWN),
      reference_point: stripTemplatePlaceholder(scoreInput.reference_point || input.sales_recommendation?.known_active_recent_project_to_reference, UNKNOWN),
      next_milestone: stripTemplatePlaceholder(scoreInput.next_milestone || input.sales_recommendation?.suggested_next_action, UNKNOWN)
    },
    sales_recommendation: {
      best_person_department_to_approach: stripTemplatePlaceholder(input.sales_recommendation?.best_person_department_to_approach || executiveInput.best_entry_point, UNKNOWN),
      recommended_sales_angle: stripTemplatePlaceholder(input.sales_recommendation?.recommended_sales_angle || scoreInput.commercial_angle || executiveInput.primary_sales_angle, UNKNOWN),
      known_active_recent_project_to_reference: stripTemplatePlaceholder(input.sales_recommendation?.known_active_recent_project_to_reference || scoreInput.reference_point, UNKNOWN),
      most_relevant_products: asArray(input.sales_recommendation?.most_relevant_products).map(item => safeText(item)).filter(Boolean),
      suggested_next_action: stripTemplatePlaceholder(input.sales_recommendation?.suggested_next_action || scoreInput.next_milestone || executiveInput.recommended_first_action, UNKNOWN),
      suggested_opening_message_angle: stripTemplatePlaceholder(input.sales_recommendation?.suggested_opening_message_angle || contactInput.suggested_opening_message, UNKNOWN),
      sales_recommendation: stripTemplatePlaceholder(scoreInput.sales_recommendation || input.sales_recommendation?.sales_recommendation, UNKNOWN),
      commercial_angle: stripTemplatePlaceholder(scoreInput.commercial_angle || input.sales_recommendation?.recommended_sales_angle, UNKNOWN),
      reference_point: stripTemplatePlaceholder(scoreInput.reference_point || input.sales_recommendation?.known_active_recent_project_to_reference, UNKNOWN),
      next_milestone: stripTemplatePlaceholder(scoreInput.next_milestone || input.sales_recommendation?.suggested_next_action, UNKNOWN)
    },
    research_quality: {
      verified_information: asArray(qualityInput.verified_information || input.verified_facts).map(item => normalizeFact(item, "verified")),
      reasonable_inferences: asArray(qualityInput.reasonable_inferences || input.reasonable_inferences).map(item => normalizeFact(item, "inference")),
      not_publicly_found_unverified: asArray(qualityInput.not_publicly_found_unverified || qualityInput.not_publicly_found || input.not_publicly_found_unverified).map(item => normalizeFact(item, "gap")),
      not_publicly_found: asArray(qualityInput.not_publicly_found || qualityInput.not_publicly_found_unverified || input.not_publicly_found_unverified).map(item => stripTemplatePlaceholder(item?.statement || item)).filter(Boolean),
      confidence_summary: {
        company_identity: enumValue(qualityInput.confidence_summary?.company_identity, CONFIDENCE_LABELS, "Low"),
        company_profile: enumValue(qualityInput.confidence_summary?.company_profile, CONFIDENCE_LABELS, "Low"),
        project_intelligence: enumValue(qualityInput.confidence_summary?.project_intelligence, CONFIDENCE_LABELS, "Low"),
        procurement_contacts: enumValue(qualityInput.confidence_summary?.procurement_contacts, CONFIDENCE_LABELS, "Low"),
        steel_opportunity_assessment: enumValue(qualityInput.confidence_summary?.steel_opportunity_assessment, CONFIDENCE_LABELS, "Low")
      }
    },
    sources: sources.length ? sources : [{
      id: "src-unverified-public-research",
      label: "No public source URL verified by research workflow",
      title: "No public source URL verified by research workflow",
      url: UNKNOWN,
      publisher: UNKNOWN,
      tier: "Unverified public research gap",
      source_type: "Unverified public research gap",
      accessed_date: researchDate,
      access_date: researchDate
    }],
    method_note: safeText(input.method_note, UNKNOWN),
    anti_fabrication_check: {
      no_guessed_contacts: Boolean(input.anti_fabrication_check?.no_guessed_contacts ?? true),
      no_unsourced_projects: Boolean(input.anti_fabrication_check?.no_unsourced_projects ?? true),
      verified_facts_separated_from_inferences: Boolean(input.anti_fabrication_check?.verified_facts_separated_from_inferences ?? true)
    }
  };

  if (!report.research_quality.verified_information.length) {
    report.research_quality.verified_information.push({
      statement: "No independently verified public facts were returned by the research workflow.",
      source_refs: [],
      confidence: "Low"
    });
  }
  if (!report.research_quality.not_publicly_found_unverified.length) {
    report.research_quality.not_publicly_found_unverified.push({ statement: "No additional gaps were listed by the research workflow.", source_refs: [], confidence: "Low" });
  }
  report.research_quality.not_publicly_found = report.research_quality.not_publicly_found_unverified.map(item => item.statement);
  if (!sources.length && !report.research_quality.not_publicly_found_unverified.some(item => /source|verified|public/i.test(item.statement))) {
    report.research_quality.not_publicly_found_unverified.push({
      statement: "A public source URL was not verified; treat the report as low-confidence until manually checked.",
      source_refs: [],
      confidence: "Low"
    });
  }
  for (const component of report.lead_score.components) {
    if (component.score < 0 || component.score > 10) errors.push(`Invalid score for ${component.factor}`);
  }
  report.lead_score.priority = priority;
  report.executive_snapshot.lead_score = report.lead_score.displayed_score;
  report.executive_snapshot.buyer_classification = report.buyer_classification.classification;
  report.executive_snapshot.steel_demand = report.structural_steel_opportunity.steel_demand;
  const groundedReport = enforceSourceGrounding(report);
  const fallbackReport = applyDeterministicLowConfidenceFallback(groundedReport);
  sanitizeCrmOwnerContactLeak(groundedReport);
  return { report: fallbackReport, errors };
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
  const companyName = safeText(lead.company_name || lead.legal_name);
  const ownerTarget = targetLooksLikeCrmOwner(companyName);
  return {
    company_name: companyName,
    legal_name: safeText(lead.legal_name),
    trading_name: safeText(lead.company_name),
    emirate_city_country: safeText([lead.country_emirate, lead.location, lead.territory].filter(Boolean).join(", ")),
    business_activity: safeText(lead.business_category || lead.sector || lead.industry || lead.products_services_remarks),
    known_project_context: safeText(lead.recent_projects || lead.product_interest || "").slice(0, 500)
  };
}

function buildLeadIntelligencePrompt(leadInput) {
  const context = [
    leadInput.company_name,
    leadInput.emirate_city_country,
    leadInput.business_activity,
    leadInput.legal_name,
    leadInput.trading_name
  ].filter(Boolean).join(" | ") || "target company";
  return [
    "You are generating a UAE Structural Steel Lead Intelligence report for ARG Leads Tracker / Al Ras Steel.",
    `Workflow version: ${WORKFLOW_VERSION}`,
    "Al Ras Steel, ARG, steelstockist.com, and phone 04 886 0366 are CRM owner context only. Never use them as the target company's website, phone, email, source, or profile unless the target company is explicitly Al Ras Steel.",
    "Use current public web research. Do not rely on memory for current facts.",
    `Target research context: ${context}.`,
    "Identify the correct UAE entity first. If ambiguity remains, state it in research quality and do not merge companies.",
    "Use the source hierarchy: Tier 1 official company/parent/developer/government/tender/official press sources; Tier 2 reputable project/business/trade/professional sources; Tier 3 directories/job ads/case studies only as supporting evidence. Low-confidence scraped or AI summaries cannot support important claims alone.",
    "Never invent or infer person names, emails, phone numbers, project names, dates, roles, URLs, or contacts. Unknown fields must be exactly 'Not publicly found'. Separate verified facts from reasonable inferences.",
    "Do not include a named project, person, email, phone, award, or date unless it has source_refs tied to sources[].id. If the source_refs are missing, omit that item and list the gap under not_publicly_found_unverified.",
    "Return only JSON matching the requested schema. Every important factual claim must include source_refs pointing to sources[].id.",
    `Allowed CRM identity hint only: ${JSON.stringify({
      company_name: leadInput.company_name,
      legal_name: leadInput.legal_name,
      trading_name: leadInput.trading_name,
      emirate_city_country: leadInput.emirate_city_country
    }, null, 2)}`
  ].join("\n\n");
}

function buildGeminiResearchContext(leadInput) {
  return {
    company_name: leadInput.company_name,
    legal_name: leadInput.legal_name,
    trading_name: leadInput.trading_name,
    emirate_city_country: leadInput.emirate_city_country,
    business_activity: leadInput.business_activity,
    known_project_context: leadInput.known_project_context
  };
}

function buildGeminiResearchPrompt(leadInput, step) {
  const context = safeText([leadInput.company_name, leadInput.emirate_city_country, leadInput.business_activity].filter(Boolean).join(" in "));
  return [
    "You are a UAE structural-steel B2B lead researcher.",
    `Use Google Search grounding to research the target company: ${context || leadInput.company_name}.`,
    `Research focus: ${step.focus} (${step.id}) - ${step.section}.`,
    `Requested outputs for this section: ${step.brief}`,
    "Do not invent person names, emails, phone numbers, projects, dates, roles, URLs, channels, or any contacts.",
    "Every factual claim must remain explicitly tied to groundable search evidence in this section.",
    "Only use public web sources about the target company.",
    "Use ONLY public web sources about the target company. Do not use, reference, or infer from Al Ras Steel, Steel Stockist, steelstockist.com, alrassteel.com, 04 886 0366, or any CRM/internal company data under any circumstance.",
    `Allowed CRM identity hint only: ${JSON.stringify(buildGeminiResearchContext(leadInput), null, 2)}`,
    `If nothing verifiable is found in ${step.id}, write exactly "${UNKNOWN}" rather than guessing.`,
    "Separate findings into three explicit lists: Verified Information, Reasonable Inferences, and Not Publicly Found / Unverified."
  ].join("\n\n");
}

function buildGeminiResearchQueries(leadInput, step) {
  const company = safeText([leadInput.company_name, leadInput.legal_name, leadInput.trading_name].filter(Boolean)[0] || "target company");
  const location = safeText(leadInput.emirate_city_country);
  const activity = safeText(leadInput.business_activity) || "UAE structural steel";
  const loc = location ? ` (${location})` : "";
  const activityContext = `${activity}${loc}`;
  switch (step.id) {
    case "A1":
      return [
        `${company} company profile and legal name ${activityContext}`,
        `${company} official website contact information ${activityContext}`,
        `${company} structural steel activities ${activityContext}`
      ];
    case "A2":
      return [
        `${company} project types and structural steel role ${activityContext}`,
        `${company} steel procurement profile UAE ${activityContext}`
      ];
    case "A3":
      return [
        `${company} recent awarded projects UAE ${activityContext}`,
        `${company} ongoing and previous projects ${activityContext}`,
        `${company} announced structural steel projects ${activityContext}`
      ];
    case "A4":
      return [
        `${company} procurement team contacts UAE ${activityContext}`,
        `${company} procurement manager commercial director ${activityContext}`,
        `${company} company contact page ${activityContext}`
      ];
    case "A5":
    default:
      return [
        `${company} steel material requirements ${activityContext}`,
        `${company} tender criteria and procurement triggers ${activityContext}`
      ];
  }
}

function buildGeminiFormattingPrompt(researchBrief) {
  return [
    "Convert the research brief below into JSON that matches the provided schema exactly.",
    "Do not invent, infer, or add any fact that is not already present in the brief. This call transcribes and structures; it does not research.",
    `If a field's value is not stated in the brief, use the literal string "${UNKNOWN}".`,
    "Every entry in verified_information, reasonable_inferences, and not_publicly_found must reference a source id from sources[] wherever the brief provided one.",
    "Return only JSON. No markdown code fences, no commentary, no text before or after the JSON object.",
    "RESEARCH BRIEF:",
    researchBrief
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
  for (const step of asArray(payload?.steps)) {
    if (step?.type !== "model_output") continue;
    for (const part of asArray(step?.content)) {
      if (part?.type === "text") chunks.push(part.text || "");
    }
  }
  return chunks.join("\n").trim();
}

function parseJsonText(text) {
  const raw = String(text || "").trim();
  if (!raw) throw new Error("AI provider returned no structured report text.");
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1]?.trim();
  const candidates = [];
  const pushCandidate = value => {
    const candidate = String(value || "").trim();
    if (candidate && !candidates.includes(candidate)) candidates.push(candidate);
  };
  pushCandidate(raw);
  pushCandidate(fenced);
  pushCandidate(extractFirstBalancedJson(raw));
  pushCandidate(extractFirstBalancedJson(fenced || ""));
  let lastError = null;
  for (const candidate of candidates) {
    const noLeadingText = candidate.includes("{") ? candidate.slice(candidate.indexOf("{")) : candidate;
    const parseAttempts = [
      candidate,
      noLeadingText,
      normalizeJsonTextForParsing(candidate),
      normalizeJsonTextForParsing(noLeadingText)
    ];
    for (const attempt of parseAttempts) {
      if (!attempt) continue;
      try {
        return JSON.parse(attempt);
      } catch (error) {
        lastError = error;
      }
    }
  }
  if (lastError) throw lastError;
  throw new Error("AI provider returned output that is not valid JSON.");
}

function providerJsonParseError(error, details = {}) {
  const wrapped = new Error(`Lead intelligence JSON could not be parsed: ${error.message}`);
  wrapped.code = "provider_json_parse_failed";
  wrapped.status = 502;
  wrapped.details = [error.message];
  wrapped.provider_metadata = {
    ...details,
    parse_error: error.message
  };
  return wrapped;
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
    let parsedText;
    const rawOutput = extractResponseText(payload);
    try {
      parsedText = parseJsonText(rawOutput);
    } catch (parseError) {
      throw providerJsonParseError(parseError, {
        provider: "openai",
        model,
        call_a_raw_output: safeSnippet(rawOutput),
        parse_errors: [`format: ${parseError.message}`]
      });
    }
    const parsed = mergeCitationSources(parsedText, collectResponseUrlCitations(payload));
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

async function parseLeadIntelligencePdfWithOpenAI({ rawPdfText, lead, openAiKey, model = "gpt-4.1-mini", fetchImpl = fetch, timeoutMs = 90_000 }) {
  if (!openAiKey) {
    const error = new Error("AI Lead Intelligence PDF processing is not configured. Add OPENAI_API_KEY on the server.");
    error.status = 503;
    throw error;
  }
  const source = safeText(rawPdfText);
  if (!source) {
    const error = new Error("The uploaded PDF appears to be empty.");
    error.status = 400;
    throw error;
  }
  if (source.length < 60) {
    const error = new Error("The PDF text is too short to extract a structured intelligence report.");
    error.status = 400;
    throw error;
  }
  const leadInput = allowedResearchInputFromLead(lead);
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
        input: [
          "You are reconstructing a UAE Structural Steel Lead Intelligence report from extracted PDF text.",
          "Return only valid JSON that matches the supplied CRM schema.",
          "The PDF contains these sections in order: Executive Lead Snapshot, Company Profile, Project Intelligence, Procurement and Commercial Contacts, Structural Steel Opportunity, Lead Score, Sales Recommendation, Research Quality, Sources.",
          "Map the PDF into the CRM intelligence schema exactly.",
          "Do not add markdown fences or commentary.",
          "Do not invent facts.",
          "If a field is genuinely absent, use 'Not publicly found'.",
          `Lead context: ${JSON.stringify(leadInput)}`,
          `PDF text: ${source.slice(0, 18000)}`
        ].join("\n\n"),
        text: { format: { type: "json_schema", name: "uae_structural_steel_lead_intelligence_from_pdf", schema: openAiJsonSchema(), strict: false } },
        max_output_tokens: 9000
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error?.message || `OpenAI lead intelligence PDF parsing failed: ${response.status}`);
      error.code = response.status === 429 ? "provider_rate_limited" : "provider_error";
      error.status = response.status;
      throw error;
    }
    const rawText = extractResponseText(payload);
    let parsed;
    try {
      parsed = parseJsonText(rawText);
    } catch (error) {
      throw providerJsonParseError(error, {
        provider: "openai",
        model,
        call_b_raw_output: safeSnippet(rawText)
      });
    }
    return {
      report: assertValidLeadIntelligenceReport(parsed, leadInput),
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

async function callGeminiInteraction({ geminiApiKey, model, input, tools, responseFormat, maxOutputTokens, fetchImpl, signal }) {
  const body = { model, input };
  if (tools) body.tools = tools;
  if (responseFormat) body.response_format = responseFormat;
  if (maxOutputTokens) body.max_output_tokens = maxOutputTokens;
  const response = await fetchImpl(GEMINI_INTERACTIONS_URL, {
    method: "POST",
    signal,
    headers: {
      "x-goog-api-key": geminiApiKey,
      "Content-Type": "application/json",
      "Api-Revision": "2026-05-20"
    },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error?.message || `Gemini lead intelligence failed: ${response.status}`);
    error.code = response.status === 429 ? "provider_rate_limited" : "provider_error";
    error.status = response.status;
    throw error;
  }
  return payload;
}

async function repairGeminiJsonText({ rawText, geminiApiKey, model, fetchImpl, signal }) {
  const payload = await callGeminiInteraction({
    geminiApiKey,
    model,
    fetchImpl,
    signal,
    input: [
      "Repair this malformed JSON into valid JSON only.",
      "Do not add facts, remove facts, rename fields, or change values except where required for JSON syntax.",
      "Return only one JSON object matching the schema.",
      rawText
    ].join("\n\n"),
    responseFormat: {
      type: "text",
      mime_type: "application/json",
      schema: openAiJsonSchema()
    },
    maxOutputTokens: 8192
  });
  return parseJsonText(extractResponseText(payload));
}

async function runGeminiResearchStep({ geminiApiKey, model, fetchImpl, signal, leadInput, step }) {
  const plannedQueries = buildGeminiResearchQueries(leadInput, step);
  const payload = await callGeminiInteraction({
    geminiApiKey,
    model,
    fetchImpl,
    signal,
    input: buildGeminiResearchPrompt(leadInput, step),
    tools: [{ type: "google_search" }],
    maxOutputTokens: 8192
  });
  const brief = extractResponseText(payload);
  const citations = collectGeminiUrlCitations(payload);
  logGeminiReadAttempt(step, leadInput, payload);
  const labeledBrief = `## ${step.section} (${step.focus}) - ${step.step_id}\n${brief || `${step.id}: ${UNKNOWN}`}`;
  return {
    step_id: step.id,
    section: step.section,
    focus: step.focus,
    queries: plannedQueries,
    brief: labeledBrief,
    source_count: citations.length,
    source_ids: citations.map(source => source.url).filter(Boolean),
    raw_output: safeSnippet(labeledBrief),
    citations,
    response_id: payload.id || payload.name || "",
    usage: payload.usageMetadata || payload.usage || {}
  };
}

async function generateLeadIntelligenceWithGemini({ lead, geminiApiKey, model = "gemini-3.6-flash", fetchImpl = fetch, timeoutMs = 90_000 }) {
  if (!geminiApiKey) {
    const error = new Error("Lead intelligence research is not configured. Add GEMINI_API_KEY on the server.");
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
    const researchSteps = await Promise.all(GEMINI_RESEARCH_STEPS.map(step => runGeminiResearchStep({
      geminiApiKey,
      model,
      fetchImpl,
      signal: controller.signal,
      leadInput,
      step
    })));
    const citations = researchSteps.flatMap(step => step.citations);
    const researchSourceCount = citations.length;
    const researchBrief = researchSteps.map(step => step.brief).join("\n\n");
    const stepSummaries = researchSteps.map(step => ({
      step_id: step.step_id,
      section: step.section,
      focus: step.focus,
      query_plan: step.queries,
      source_count: step.source_count,
      source_ids: step.source_ids
    }));
    const stepRawOutputs = researchSteps.map(step => safeSnippet(step.raw_output, 800)).join("\n\n");
    if (!citations.length) {
      const error = new Error("Gemini research returned no grounded source URLs.");
      error.code = "provider_no_grounding_sources";
      error.status = 502;
      error.provider_metadata = {
        provider: "gemini",
        model,
        call_a_raw_output: safeSnippet(researchBrief),
        call_a_source_count: 0,
        call_a_step_results: stepSummaries
      };
      throw error;
    }
    let formatPayload = await callGeminiInteraction({
      geminiApiKey,
      model,
      fetchImpl,
      signal: controller.signal,
      input: buildGeminiFormattingPrompt(researchBrief),
      responseFormat: {
        type: "text",
        mime_type: "application/json",
        schema: openAiJsonSchema()
      },
      maxOutputTokens: 8192
    });
    let rawText = extractResponseText(formatPayload);
    let parsedText;
    const parseErrors = [];
    try {
      parsedText = parseJsonText(rawText);
    } catch (firstParseError) {
      parseErrors.push(`format: ${firstParseError.message}`);
      try {
        parsedText = await repairGeminiJsonText({
          rawText,
          geminiApiKey,
          model,
          fetchImpl,
          signal: controller.signal
        });
      } catch (repairError) {
        parseErrors.push(`repair: ${repairError.message}`);
        formatPayload = await callGeminiInteraction({
          geminiApiKey,
          model,
          fetchImpl,
          signal: controller.signal,
          input: buildGeminiFormattingPrompt(researchBrief),
          responseFormat: {
            type: "text",
            mime_type: "application/json",
            schema: openAiJsonSchema()
          },
          maxOutputTokens: 8192
        });
        rawText = extractResponseText(formatPayload);
        try {
          parsedText = parseJsonText(rawText);
        } catch (retryError) {
          parseErrors.push(`retry: ${retryError.message}`);
          throw providerJsonParseError(retryError, {
            provider: "gemini",
            model,
            call_a_raw_output: safeSnippet(researchBrief),
            call_a_source_count: researchSourceCount,
            call_b_raw_output: safeSnippet(rawText),
            parse_errors: parseErrors
          });
        }
      }
    }
    const parsed = mergeCitationSources(parsedText, citations);
    const report = assertValidLeadIntelligenceReport(parsed, leadInput);
    return {
      report,
      metadata: {
        provider: "gemini",
        model,
        response_id: formatPayload.id || formatPayload.name || researchSteps.find(step => step.response_id)?.response_id || "",
        research_response_id: researchSteps.map(step => step.response_id).filter(Boolean).join(","),
        format_response_id: formatPayload.id || formatPayload.name || "",
        status: formatPayload.status || "completed",
        duration_ms: Date.now() - startedAt,
        call_a_source_count: researchSourceCount,
        call_a_step_results: stepSummaries,
        call_a_raw_output: safeSnippet(researchBrief),
        call_a_raw_outputs: stepRawOutputs,
        call_b_raw_output: safeSnippet(rawText),
        parse_errors: parseErrors,
        usage: {
          research: {
            steps: researchSteps.map(step => step.step_id),
            usage: researchSteps.reduce((result, step) => {
              if (!step.usage) return result;
              Object.entries(step.usage).forEach(([key, value]) => {
                const number = Number(value);
                if (Number.isFinite(number)) result[key] = (result[key] || 0) + number;
              });
              return result;
            }, {})
          },
          formatting: formatPayload.usageMetadata || formatPayload.usage || {}
        }
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

async function parseLeadIntelligencePdfWithGemini({ rawPdfText, lead, geminiApiKey, model = "gemini-3.6-flash", fetchImpl = fetch, timeoutMs = 90_000 }) {
  if (!geminiApiKey) {
    const error = new Error("AI Lead Intelligence PDF processing is not configured. Add GEMINI_API_KEY on the server.");
    error.status = 503;
    throw error;
  }
  const source = safeText(rawPdfText);
  if (!source) {
    const error = new Error("The uploaded PDF appears to be empty.");
    error.status = 400;
    throw error;
  }
  if (source.length < 60) {
    const error = new Error("The PDF text is too short to extract a structured intelligence report.");
    error.status = 400;
    throw error;
  }
  const leadInput = allowedResearchInputFromLead(lead);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const payload = await callGeminiInteraction({
      geminiApiKey,
      model,
      fetchImpl,
      signal: controller.signal,
      input: [
        "You are reconstructing a UAE Structural Steel Lead Intelligence report from extracted PDF text.",
        "Return only valid JSON that matches the supplied CRM schema.",
        "The PDF contains these sections in order: Executive Lead Snapshot, Company Profile, Project Intelligence, Procurement and Commercial Contacts, Structural Steel Opportunity, Lead Score, Sales Recommendation, Research Quality, Sources.",
        "Map the PDF into the CRM intelligence schema exactly.",
        "Do not add markdown fences or commentary.",
        "Do not invent facts.",
        "If a field is genuinely absent, use 'Not publicly found'.",
        `Lead context: ${JSON.stringify(leadInput)}`,
        `PDF text: ${source.slice(0, 18000)}`
      ].join("\n\n"),
      responseFormat: {
        type: "text",
        mime_type: "application/json",
        schema: openAiJsonSchema()
      },
      maxOutputTokens: 8192
    });
    const rawText = extractResponseText(payload);
    let parsed;
    try {
      parsed = parseJsonText(rawText);
    } catch (error) {
      throw providerJsonParseError(error, {
        provider: "gemini",
        model,
        call_b_raw_output: safeSnippet(rawText)
      });
    }
    return {
      report: assertValidLeadIntelligenceReport(parsed, leadInput),
      metadata: {
        provider: "gemini",
        model,
        response_id: payload.id || payload.name || "",
        status: payload.status || "completed",
        usage: payload.usageMetadata || payload.usage || {}
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
  items.forEach(item => addPdfLine(lines, `- ${safeText(item.statement || item)} | ${sourceRefText(item.source_refs)}`, 9, 2));
}

function renderLeadIntelligencePdf(report, { generatedAt = new Date().toISOString() } = {}) {
  const lines = [];
  lines.push({ text: "ARG Leads Tracker / Al Ras Steel Intelligence", size: 16, indent: 0 });
  lines.push({ text: "UAE STRUCTURAL STEEL LEAD INTELLIGENCE", size: 14, indent: 0 });
  addPdfLine(lines, `Company: ${report.executive_snapshot.company}`, 11);
  addPdfLine(lines, `Research date: ${report.research_date} | Generated: ${generatedAt} | Workflow: ${report.workflow_version}`, 8);
  addPdfLine(lines, `Lead Score: ${report.lead_score.displayed_score}/10 (${report.lead_score.weighted_score}/10 weighted) | Priority: ${report.lead_score.priority} | Demand: ${report.executive_snapshot.steel_demand} | Buyer: ${report.executive_snapshot.buyer_classification}`, 10);
  addPdfLine(lines, "Disclaimer: This report uses publicly available sources and must be commercially verified before outreach.", 8);

  addSection(lines, "Executive Decision");
  [
    ["Executive Summary", report.executive_snapshot.executive_summary],
    ["Company Type", report.executive_snapshot.company_type],
    ["Best Entry Point", report.executive_snapshot.best_entry_point || report.executive_snapshot.best_sales_entry_point],
    ["Top Opportunity", report.executive_snapshot.top_opportunity],
    ["Primary Sales Angle", report.executive_snapshot.primary_sales_angle || report.sales_recommendation.recommended_sales_angle],
    ["Key Limitation", report.executive_snapshot.key_limitation],
    ["Recommended First Action", report.executive_snapshot.recommended_first_action || report.sales_recommendation.suggested_next_action]
  ].forEach(([label, value]) => addPdfLine(lines, `${label}: ${value || UNKNOWN}`, 9));

  addSection(lines, "Buyer Classification");
  addPdfLine(lines, `Classification: ${report.buyer_classification.classification || UNKNOWN}`, 9);
  addPdfLine(lines, `Basis: ${report.buyer_classification.basis || UNKNOWN}`, 9);

  addSection(lines, "Company Profile");
  Object.entries(report.company_profile).forEach(([key, value]) => addPdfLine(lines, `${key.replace(/_/g, " ")}: ${Array.isArray(value) ? (value.join(", ") || UNKNOWN) : value}`, 8));

  addSection(lines, "Project Intelligence");
  addPdfLine(lines, `Conclusion: ${report.project_intelligence.project_intelligence_conclusion || UNKNOWN}`, 9);
  for (const [title, projects] of [["Recently Awarded Projects", report.project_intelligence.recently_awarded_projects], ["Ongoing Projects", report.project_intelligence.ongoing_projects], ["Previous Relevant Projects", report.project_intelligence.previous_relevant_projects], ["Announced Upcoming Projects", report.project_intelligence.announced_upcoming_projects]]) {
    addSection(lines, title);
    if (!projects.length) addPdfLine(lines, title === "Recently Awarded Projects" ? "No recently awarded UAE projects publicly verified." : title === "Ongoing Projects" ? "No ongoing UAE projects publicly verified." : UNKNOWN, 9);
    projects.forEach(project => {
      addPdfLine(lines, `Project: ${project.project_name} | Status: ${project.current_status} | Location: ${project.location}`, 9);
      addPdfLine(lines, `Client: ${project.client || project.client_developer} | Main contractor: ${project.main_contractor} | Consultant: ${project.consultant}`, 8, 2);
      addPdfLine(lines, `Role: ${project.company_role} | Date/Status: ${project.status_date || project.award_announcement_date} | Confidence: ${project.confidence} | Steel relevance: ${project.structural_steel_relevance}`, 8, 2);
      addPdfLine(lines, `Verified scope: ${project.verified_scope || project.evidence_reason}`, 8, 2);
      addPdfLine(lines, sourceRefText(project.source_refs), 8, 2);
    });
  }

  addSection(lines, "Procurement & Commercial Contacts");
  addPdfLine(lines, `Named procurement contact: ${report.named_procurement_contact || UNKNOWN}. Best verified channel: ${report.best_verified_channel || report.best_verified_company_contact_channel}`, 9);
  addPdfLine(lines, `Contact strategy: ${report.contact_strategy || UNKNOWN}`, 9);
  addPdfLine(lines, `Suggested opening message: ${report.suggested_opening_message || report.sales_recommendation.suggested_opening_message_angle || UNKNOWN}`, 9);
  if (report.qualification_questions?.length) addPdfLine(lines, `Qualification questions: ${report.qualification_questions.join(" | ")}`, 8);
  report.procurement_contacts.forEach((contact, index) => {
    addPdfLine(lines, `Contact ${index + 1}: ${contact.name} | ${contact.role || contact.position} | Confidence: ${contact.confidence}`, 9);
    addPdfLine(lines, `Email: ${contact.business_email} | Telephone: ${contact.business_telephone} | Source: ${contact.source_note || contact.public_professional_source}`, 8, 2);
    addPdfLine(lines, `Why relevant: ${contact.why_relevant}`, 8, 2);
    addPdfLine(lines, sourceRefText(contact.source_refs), 8, 2);
  });
  if (report.named_contacts.length) {
    addSection(lines, "Named Contacts");
    report.named_contacts.forEach((contact, index) => {
      addPdfLine(lines, `Contact ${index + 1}: ${contact.name} | ${contact.role || contact.position} | Confidence: ${contact.confidence}`, 9);
      addPdfLine(lines, `Email: ${contact.business_email} | Telephone: ${contact.business_telephone} | Source: ${contact.source_note || contact.public_professional_source}`, 8, 2);
      addPdfLine(lines, `Why relevant: ${contact.why_relevant}`, 8, 2);
      addPdfLine(lines, sourceRefText(contact.source_refs), 8, 2);
    });
  }

  addSection(lines, "Structural Steel Opportunity");
  addPdfLine(lines, `Steel Demand: ${report.structural_steel_opportunity.steel_demand}`, 10);
  report.structural_steel_opportunity.likely_required_materials.forEach(material => addPdfLine(lines, `${material.material} | ${material.likelihood} | ${material.fact_or_inference}: ${material.reason_project_link} | ${sourceRefText(material.source_refs)}`, 8));
  addPdfLine(lines, `Buying Pattern / Opportunity: ${report.structural_steel_opportunity.buying_pattern_opportunity}`, 9);
  addPdfLine(lines, `Buying Triggers: ${Array.isArray(report.structural_steel_opportunity.buying_triggers) ? report.structural_steel_opportunity.buying_triggers.join(", ") : report.structural_steel_opportunity.buying_triggers || UNKNOWN}`, 9);

  addSection(lines, "Lead Score & Sales Plan");
  report.lead_score.components.forEach(component => addPdfLine(lines, `${component.factor} | Weight ${component.weight_percent}% | Score ${component.score}/10 | Weighted ${component.weighted_score}: ${component.evidence} | ${sourceRefText(component.source_refs)}`, 8));
  addPdfLine(lines, `Weighted Lead Score: ${report.lead_score.weighted_score}/10 | Displayed Lead Score: ${report.lead_score.displayed_score}/10 | Lead Priority: ${report.lead_score.priority}`, 10);
  Object.entries(report.sales_recommendation).forEach(([key, value]) => addPdfLine(lines, `${key.replace(/_/g, " ")}: ${Array.isArray(value) ? (value.join(", ") || UNKNOWN) : value}`, 9));
  addSection(lines, "Lead Score Sales Plan");
  const leadScoreSalesPlan = report.lead_score_sales_plan || {};
  addPdfLine(lines, `Sales recommendation: ${leadScoreSalesPlan.sales_recommendation || UNKNOWN}`, 9);
  addPdfLine(lines, `Commercial angle: ${leadScoreSalesPlan.commercial_angle || UNKNOWN}`, 9);
  addPdfLine(lines, `Reference point: ${leadScoreSalesPlan.reference_point || UNKNOWN}`, 9);
  addPdfLine(lines, `Next milestone: ${leadScoreSalesPlan.next_milestone || UNKNOWN}`, 9);

  addSection(lines, "Research Quality & Sources");
  addList(lines, "Verified Information", report.research_quality.verified_information);
  addList(lines, "Reasonable Inferences", report.research_quality.reasonable_inferences);
  addList(lines, "Not Publicly Found / Unverified", report.research_quality.not_publicly_found_unverified);
  addSection(lines, "Confidence Summary");
  Object.entries(report.research_quality.confidence_summary).forEach(([key, value]) => addPdfLine(lines, `${key.replace(/_/g, " ")}: ${value}`, 9));
  addSection(lines, "Anti-Fabrication Checks");
  const antiFabricationCheck = report.anti_fabrication_check || {};
  addPdfLine(lines, `No guessed contacts: ${antiFabricationCheck.no_guessed_contacts ? "Yes" : "No"}`, 9);
  addPdfLine(lines, `No unsourced projects: ${antiFabricationCheck.no_unsourced_projects ? "Yes" : "No"}`, 9);
  addPdfLine(lines, `Verified facts separated from inferences: ${antiFabricationCheck.verified_facts_separated_from_inferences ? "Yes" : "No"}`, 9);

  addSection(lines, "Sources");
  report.sources.forEach((source, index) => {
    const sourceLine = `${index + 1}. ${source.title} | ${source.publisher} | ${source.source_type} | ${source.access_date} | ${source.url}`;
    const wrapped = wrapText(sourceLine, 98);
    wrapped.forEach((line, lineIndex) => lines.push({ text: line, size: 8, indent: 0, url: lineIndex === 0 && /^https?:\/\//i.test(source.url) ? source.url : "" }));
  });
  addSection(lines, "Method Note");
  addPdfLine(lines, report.method_note || "Generated from grounded public web research, then formatted into the ARG Lead Intelligence schema without adding facts.", 8);

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
  generateLeadIntelligenceWithGemini,
  generateLeadIntelligenceWithOpenAI,
  normalizeLeadIntelligenceReport,
  parseLeadIntelligencePdfWithOpenAI,
  parseLeadIntelligencePdfWithGemini,
  priorityForWeightedScore,
  renderLeadIntelligencePdf,
  reportSummary,
  safeText
};
