const integrations = require("../config/integrations");

const GEO_CENTROIDS = {
  UAE: { lat: 24.4539, lng: 54.3773 },
  Dubai: { lat: 25.2048, lng: 55.2708 },
  "Abu Dhabi": { lat: 24.4539, lng: 54.3773 },
  Sharjah: { lat: 25.3463, lng: 55.4209 },
  Ajman: { lat: 25.4052, lng: 55.5136 },
  "Ras Al Khaimah": { lat: 25.8007, lng: 55.9762 },
  Fujairah: { lat: 25.1288, lng: 56.3265 },
  "Umm Al Quwain": { lat: 25.5647, lng: 55.5552 },
  "Saudi Arabia": { lat: 24.7136, lng: 46.6753 },
  Kuwait: { lat: 29.3759, lng: 47.9774 },
  Bahrain: { lat: 26.0667, lng: 50.5577 },
  Oman: { lat: 23.588, lng: 58.3829 },
  Qatar: { lat: 25.2854, lng: 51.531 }
};

const SECTOR_TAGS = ["Oil & Gas", "Marine", "Fabricator", "Contractor", "Trader", "Piling", "Trailer", "PEB"];

function asArray(value) {
  if (Array.isArray(value)) return value.map(item => String(item || "").trim()).filter(Boolean);
  return String(value || "").split(",").map(item => item.trim()).filter(Boolean);
}

function normalizeIntelItem(item, source = "Manual") {
  const title = String(item.title || "").trim();
  const url = String(item.url || item.link || "").trim();
  const published = item.published_at || item.publishedAt || item.date || new Date().toISOString();
  return {
    id: item.id || `intel-${Buffer.from(`${title}|${url}`).toString("base64url").slice(0, 24)}`,
    title,
    source: String(item.source || source).trim(),
    url,
    published_at: new Date(published).toISOString(),
    fetched_at: new Date().toISOString(),
    summary: String(item.summary || item.description || "").trim(),
    sector_tags: asArray(item.sector_tags || item.sectors).filter(tag => SECTOR_TAGS.some(sector => sector.toLowerCase() === tag.toLowerCase()) || tag),
    geography_tags: asArray(item.geography_tags || item.geographies || item.region),
    companies_mentioned: asArray(item.companies_mentioned || item.companies),
    matched_company_ids: asArray(item.matched_company_ids),
    relevance_score: Number(item.relevance_score || 0)
  };
}

function leadGeographyTokens(lead) {
  return [lead.country_emirate, lead.location, lead.territory, lead.address]
    .join(" ")
    .toLowerCase();
}

function leadSectorTokens(lead) {
  return [lead.sector, lead.industry, lead.business_category, lead.product_interest, lead.tags]
    .join(" ")
    .toLowerCase();
}

function scoreIntelForLead(item, lead) {
  let score = 0;
  const sectorText = leadSectorTokens(lead);
  const geographyText = leadGeographyTokens(lead);
  const companyName = String(lead.company_name || "").toLowerCase();
  if ((item.sector_tags || []).some(tag => sectorText.includes(String(tag).toLowerCase()))) score += 0.5;
  if ((item.geography_tags || []).some(tag => geographyText.includes(String(tag).toLowerCase()))) score += 0.3;
  if ((item.companies_mentioned || []).some(name => companyName && String(name).toLowerCase().includes(companyName))) score += 1;
  return Number(score.toFixed(2));
}

function matchIntelligenceToLeads(items, leads) {
  return (items || []).map(item => {
    const matches = (leads || [])
      .map(lead => ({ lead, score: scoreIntelForLead(item, lead) }))
      .filter(match => match.score > 0)
      .sort((a, b) => b.score - a.score);
    return {
      ...item,
      matched_company_ids: matches.map(match => match.lead.id),
      relevance_score: matches[0]?.score || Number(item.relevance_score || 0)
    };
  });
}

function heatMapFromIntel(items) {
  const counts = new Map();
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  (items || []).forEach(item => {
    if (new Date(item.published_at || item.fetched_at).getTime() < cutoff) return;
    (item.geography_tags || []).forEach(tag => {
      const key = Object.keys(GEO_CENTROIDS).find(name => name.toLowerCase() === String(tag).toLowerCase());
      if (key) counts.set(key, (counts.get(key) || 0) + 1);
    });
  });
  const max = Math.max(1, ...counts.values());
  return [...counts.entries()].map(([name, count]) => ({
    name,
    count,
    intensity: Number((count / max).toFixed(2)),
    ...GEO_CENTROIDS[name]
  }));
}

async function fetchMarketIntelligence() {
  if (!integrations.marketIntel || !integrations.env.zawyaApiUrl || !integrations.keys.zawya) {
    return { items: [], disabled: true, reason: "ZAWYA_API_KEY or ZAWYA_API_URL is not configured." };
  }
  const response = await fetch(integrations.env.zawyaApiUrl, {
    headers: { Authorization: `Bearer ${integrations.env.zawyaKey}` }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || "Market intelligence fetch failed.");
    error.status = response.status;
    throw error;
  }
  const rawItems = Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : [];
  return { items: rawItems.map(item => normalizeIntelItem(item, "Zawya")), disabled: false };
}

module.exports = {
  GEO_CENTROIDS,
  fetchMarketIntelligence,
  heatMapFromIntel,
  matchIntelligenceToLeads,
  normalizeIntelItem,
  scoreIntelForLead
};
