const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || "";
const HUNTER_API_KEY = process.env.HUNTER_API_KEY || "";
const requestLog = new Map();

function allowRequest(key, limit = 20, windowMs = 60_000) {
  const now = Date.now();
  const attempts = (requestLog.get(key) || []).filter(timestamp => now - timestamp < windowMs);
  if (attempts.length >= limit) return false;
  attempts.push(now);
  requestLog.set(key, attempts);
  return true;
}

function domainFromWebsite(website) {
  try {
    return new URL(website).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function cleanPlace(place) {
  return {
    place_id: String(place.id || ""),
    company_name: String(place.displayName?.text || ""),
    address: String(place.formattedAddress || ""),
    location: String(place.formattedAddress || ""),
    phone: String(place.nationalPhoneNumber || ""),
    website: String(place.websiteUri || ""),
    google_maps_url: String(place.googleMapsUri || ""),
    google_rating: Number(place.rating || 0),
    google_review_count: Number(place.userRatingCount || 0),
    industry: String(place.primaryTypeDisplayName?.text || place.primaryType || "")
  };
}

async function searchGooglePlaces(keyword, location, rateKey) {
  if (!GOOGLE_PLACES_API_KEY) {
    const error = new Error("Google Places is not configured. Add GOOGLE_PLACES_API_KEY on the server.");
    error.status = 503;
    throw error;
  }
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
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
      "X-Goog-FieldMask": [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.nationalPhoneNumber",
        "places.websiteUri",
        "places.rating",
        "places.userRatingCount",
        "places.primaryType",
        "places.primaryTypeDisplayName",
        "places.googleMapsUri"
      ].join(",")
    },
    body: JSON.stringify({ textQuery, pageSize: 8, regionCode: "AE" })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error?.message || `Google Places request failed: ${response.status}`);
    error.status = response.status === 429 ? 429 : 502;
    throw error;
  }
  return (data.places || []).map(cleanPlace);
}

async function enrichHunter(website, companyName, rateKey) {
  if (!HUNTER_API_KEY) {
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
  const params = new URLSearchParams({ domain, api_key: HUNTER_API_KEY, limit: "10" });
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
  domainFromWebsite,
  enrichHunter,
  googlePlacesConfigured: () => Boolean(GOOGLE_PLACES_API_KEY),
  hunterConfigured: () => Boolean(HUNTER_API_KEY),
  searchGooglePlaces
};
