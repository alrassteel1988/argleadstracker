const requestLog = new Map();
const googleCache = new Map();
const GOOGLE_CACHE_MS = 15 * 60 * 1000;
const GOOGLE_LIMITATION_REMARK = "Legal name, year established, email, and detailed products/services: Not available from Google Places API.";

const googleSearchFields = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.rating",
  "places.userRatingCount",
  "places.primaryType",
  "places.primaryTypeDisplayName",
  "places.types",
  "places.googleMapsUri"
].join(",");

const googleDetailFields = [
  "id",
  "displayName",
  "formattedAddress",
  "nationalPhoneNumber",
  "internationalPhoneNumber",
  "websiteUri",
  "rating",
  "userRatingCount",
  "primaryType",
  "primaryTypeDisplayName",
  "types",
  "googleMapsUri",
  "regularOpeningHours",
  "currentOpeningHours",
  "businessStatus"
].join(",");

function googlePlacesKey() {
  return process.env.GOOGLE_PLACES_API_KEY || "";
}

function hunterKey() {
  return process.env.HUNTER_API_KEY || "";
}

function allowRequest(key, limit = 20, windowMs = 60_000) {
  const now = Date.now();
  const attempts = (requestLog.get(key) || []).filter(timestamp => now - timestamp < windowMs);
  if (attempts.length >= limit) return false;
  attempts.push(now);
  requestLog.set(key, attempts);
  return true;
}

function cacheKey(parts) {
  return parts.map(part => String(part || "").trim().toLowerCase()).join("|");
}

function getCache(key) {
  const cached = googleCache.get(key);
  if (!cached || Date.now() - cached.at > GOOGLE_CACHE_MS) return null;
  return cached.value;
}

function setCache(key, value) {
  googleCache.set(key, { at: Date.now(), value });
  return value;
}

function domainFromWebsite(website) {
  try {
    return new URL(website).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function uniqueValues(values) {
  return [...new Set(values.map(value => String(value || "").trim()).filter(Boolean))];
}

function openingHours(place) {
  return place.regularOpeningHours?.weekdayDescriptions
    || place.currentOpeningHours?.weekdayDescriptions
    || [];
}

function placeCategory(place) {
  return uniqueValues([
    place.primaryTypeDisplayName?.text,
    place.primaryType,
    ...(Array.isArray(place.types) ? place.types : [])
  ]).join(", ");
}

function googleStatus(fields) {
  if (!fields.google_place_id && !fields.company_name) return "not_found";
  const useful = ["website", "phone", "address", "google_maps_url", "business_category"]
    .filter(field => String(fields[field] || "").trim());
  return useful.length >= 3 ? "enriched" : "partial";
}

function cleanPlace(place) {
  const fields = {
    google_place_id: String(place.id || ""),
    company_name: String(place.displayName?.text || ""),
    address: String(place.formattedAddress || ""),
    location: String(place.formattedAddress || ""),
    phone: String(place.internationalPhoneNumber || place.nationalPhoneNumber || ""),
    website: String(place.websiteUri || ""),
    google_maps_url: String(place.googleMapsUri || ""),
    google_rating: Number(place.rating || 0),
    google_review_count: Number(place.userRatingCount || 0),
    business_category: placeCategory(place),
    industry: placeCategory(place),
    opening_hours: openingHours(place),
    legal_name: "",
    year_established: "",
    email: "",
    products_services_remarks: GOOGLE_LIMITATION_REMARK,
    enrichment_source: "google_places",
    enriched_at: new Date().toISOString()
  };
  fields.place_id = fields.google_place_id;
  fields.enrichment_updated_at = fields.enriched_at;
  fields.enrichment_status = googleStatus(fields);
  return fields;
}

function cleanLegacyPlace(place) {
  const fields = {
    google_place_id: String(place.place_id || ""),
    company_name: String(place.name || ""),
    address: String(place.formatted_address || ""),
    location: String(place.formatted_address || ""),
    phone: String(place.international_phone_number || place.formatted_phone_number || ""),
    website: String(place.website || ""),
    google_maps_url: String(place.url || ""),
    google_rating: Number(place.rating || 0),
    google_review_count: Number(place.user_ratings_total || 0),
    business_category: uniqueValues(Array.isArray(place.types) ? place.types : []).join(", "),
    industry: uniqueValues(Array.isArray(place.types) ? place.types : []).join(", "),
    opening_hours: place.opening_hours?.weekday_text || [],
    legal_name: "",
    year_established: "",
    email: "",
    products_services_remarks: GOOGLE_LIMITATION_REMARK,
    enrichment_source: "google_places",
    enriched_at: new Date().toISOString()
  };
  fields.place_id = fields.google_place_id;
  fields.enrichment_updated_at = fields.enriched_at;
  fields.enrichment_status = googleStatus(fields);
  return fields;
}

function isBlockedGoogleMethod(error) {
  return error?.status === 403 && /blocked|not authorized|not enabled|permission/i.test(String(error.message || ""));
}

function googleLegacyError(data, fallback) {
  const message = data.error_message || data.error?.message || fallback;
  const error = new Error(message);
  error.status = data.status === "OVER_QUERY_LIMIT" ? 429 : 502;
  return error;
}

async function fetchLegacyJson(url) {
  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error_message || data.error?.message || `Google Places legacy request failed: ${response.status}`);
    error.status = response.status === 429 ? 429 : 502;
    throw error;
  }
  if (!["OK", "ZERO_RESULTS"].includes(String(data.status || ""))) {
    throw googleLegacyError(data, `Google Places legacy request failed: ${data.status || "UNKNOWN"}`);
  }
  return data;
}

async function searchGooglePlacesLegacy(keyword, location) {
  const params = new URLSearchParams({
    query: [keyword, location].filter(Boolean).join(" in "),
    region: "ae",
    key: googlePlacesKey()
  });
  const data = await fetchLegacyJson(`https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`);
  return (data.results || []).slice(0, 8).map(cleanLegacyPlace);
}

async function searchGooglePlaces(keyword, location, rateKey) {
  const apiKey = googlePlacesKey();
  if (!apiKey) {
    const error = new Error("Google Places is not configured. Add GOOGLE_PLACES_API_KEY on the server.");
    error.status = 503;
    throw error;
  }
  const key = cacheKey(["search", keyword, location]);
  const cached = getCache(key);
  if (cached) return cached;
  if (!allowRequest(`google:${rateKey}`)) {
    const error = new Error("Too many Google Places searches. Please wait one minute and try again.");
    error.status = 429;
    throw error;
  }
  const textQuery = [keyword, location].filter(Boolean).join(" in ");
  if (textQuery.length < 2 || textQuery.length > 180) {
    const error = new Error("Enter a company keyword and optional location.");
    error.status = 400;
    throw error;
  }
  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": googleSearchFields
      },
      body: JSON.stringify({ textQuery, pageSize: 8, regionCode: "AE" })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error?.message || `Google Places request failed: ${response.status}`);
      error.status = response.status === 429 ? 429 : response.status === 403 ? 403 : 502;
      throw error;
    }
    return setCache(key, (data.places || []).map(cleanPlace));
  } catch (error) {
    if (!isBlockedGoogleMethod(error)) throw error;
    return setCache(key, await searchGooglePlacesLegacy(keyword, location));
  }
}

function matchScore(place, companyName) {
  const target = String(companyName || "").trim().toLowerCase();
  const name = String(place.company_name || "").trim().toLowerCase();
  if (!target || !name) return 0;
  if (name === target) return 100;
  if (name.includes(target) || target.includes(name)) return 80;
  return target.split(/\s+/).filter(part => part.length > 2 && name.includes(part)).length * 10;
}

function bestPlaceMatch(matches, companyName) {
  return [...matches].sort((a, b) => matchScore(b, companyName) - matchScore(a, companyName))[0] || null;
}

async function fetchGooglePlaceDetails(placeId, rateKey) {
  const apiKey = googlePlacesKey();
  if (!apiKey) {
    const error = new Error("Google Places is not configured. Add GOOGLE_PLACES_API_KEY on the server.");
    error.status = 503;
    throw error;
  }
  const id = String(placeId || "").trim();
  if (!id) {
    const error = new Error("Google Place ID is required for details lookup.");
    error.status = 400;
    throw error;
  }
  const key = cacheKey(["details", id]);
  const cached = getCache(key);
  if (cached) return cached;
  if (!allowRequest(`google-details:${rateKey}`, 30)) {
    const error = new Error("Too many Google Places detail requests. Please wait one minute and try again.");
    error.status = 429;
    throw error;
  }
  async function fetchLegacyDetails() {
    const params = new URLSearchParams({
      place_id: id,
      fields: [
        "name",
        "formatted_address",
        "formatted_phone_number",
        "international_phone_number",
        "website",
        "url",
        "rating",
        "user_ratings_total",
        "type",
        "opening_hours",
        "business_status"
      ].join(","),
      key: apiKey
    });
    const data = await fetchLegacyJson(`https://maps.googleapis.com/maps/api/place/details/json?${params}`);
    return setCache(key, cleanLegacyPlace(data.result || {}));
  }
  if (!id.startsWith("places/")) {
    return fetchLegacyDetails();
  }
  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": googleDetailFields
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error?.message || `Google Places details failed: ${response.status}`);
      error.status = response.status === 429 ? 429 : response.status === 403 ? 403 : 502;
      throw error;
    }
    return setCache(key, cleanPlace(data));
  } catch (error) {
    if (!isBlockedGoogleMethod(error)) throw error;
    return fetchLegacyDetails();
  }
}

async function enrichCompanyFromGoogle({ companyName, location = "", country = "United Arab Emirates", rateKey = "local" }) {
  const name = String(companyName || "").trim();
  if (!name) {
    const error = new Error("Enter a company name before requesting business enrichment.");
    error.status = 400;
    throw error;
  }
  const queryLocation = [location, country].filter(Boolean).join(", ");
  const key = cacheKey(["enrich", name, queryLocation]);
  const cached = getCache(key);
  if (cached) return cached;
  const matches = await searchGooglePlaces(name, queryLocation, rateKey);
  const best = bestPlaceMatch(matches, name);
  if (!best) {
    return setCache(key, {
      company_name: name,
      legal_name: "",
      year_established: "",
      email: "",
      products_services_remarks: GOOGLE_LIMITATION_REMARK,
      enrichment_source: "google_places",
      enrichment_status: "not_found",
      enriched_at: new Date().toISOString(),
      enrichment_updated_at: new Date().toISOString()
    });
  }
  const details = await fetchGooglePlaceDetails(best.google_place_id || best.place_id, rateKey);
  return setCache(key, details);
}

const googleLeadFields = [
  "company_name",
  "legal_name",
  "year_established",
  "website",
  "phone",
  "email",
  "address",
  "location",
  "google_place_id",
  "google_maps_url",
  "google_rating",
  "google_review_count",
  "business_category",
  "industry",
  "opening_hours",
  "products_services_remarks"
];

function mergeLeadWithEnrichment(lead, enrichment, { overwrite = false } = {}) {
  const merged = { ...lead };
  googleLeadFields.forEach(field => {
    const value = enrichment[field];
    if (value == null || value === "") return;
    const existing = merged[field];
    const empty = existing == null || existing === "" || (Array.isArray(existing) && !existing.length);
    if (overwrite || empty) merged[field] = value;
  });
  if (enrichment.enrichment_source) merged.enrichment_source = enrichment.enrichment_source;
  if (enrichment.enrichment_status) merged.enrichment_status = enrichment.enrichment_status;
  if (enrichment.enriched_at) merged.enriched_at = enrichment.enriched_at;
  if (enrichment.enrichment_updated_at) merged.enrichment_updated_at = enrichment.enrichment_updated_at;
  return merged;
}

async function enrichHunter(website, companyName, rateKey) {
  const apiKey = hunterKey();
  if (!apiKey) {
    const error = new Error("Hunter is not configured. Add HUNTER_API_KEY on the server.");
    error.status = 503;
    throw error;
  }
  if (!allowRequest(`hunter:${rateKey}`, 10)) {
    const error = new Error("Too many Hunter enrichment requests. Please wait one minute and try again.");
    error.status = 429;
    throw error;
  }
  const domain = domainFromWebsite(website);
  if (!domain) {
    const error = new Error("Add a valid company website before running Hunter enrichment.");
    error.status = 400;
    throw error;
  }
  const params = new URLSearchParams({ domain, api_key: apiKey, limit: "10" });
  const response = await fetch(`https://api.hunter.io/v2/domain-search?${params}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.errors?.[0]?.details || `Hunter request failed: ${response.status}`);
    error.status = response.status === 429 ? 429 : 502;
    throw error;
  }
  const emails = (data.data?.emails || []).map(item => ({
    email: String(item.value || ""),
    type: String(item.type || ""),
    confidence: Number(item.confidence || 0),
    source_data: item.sources || []
  })).filter(item => item.email);
  return { company_name: companyName, domain, emails };
}

module.exports = {
  bestPlaceMatch,
  domainFromWebsite,
  enrichCompanyFromGoogle,
  enrichHunter,
  fetchGooglePlaceDetails,
  googlePlacesConfigured: () => Boolean(googlePlacesKey()),
  hunterConfigured: () => Boolean(hunterKey()),
  mergeLeadWithEnrichment,
  searchGooglePlaces,
  _test: {
    cleanPlace,
    cleanLegacyPlace,
    clearCache: () => googleCache.clear(),
    clearRateLimit: () => requestLog.clear(),
    googleStatus
  }
};
