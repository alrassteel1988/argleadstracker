const integrations = require("../config/integrations");

const NEWS_CACHE_TTL_MS = 15 * 60 * 1000;
const MARKET_NEWS_QUERY = [
  "\"steel market\"",
  "rebar",
  "\"construction materials\"",
  "\"UAE construction\"",
  "\"Dubai infrastructure\"",
  "\"metal prices\""
].join(" OR ");

let cache = {
  expiresAt: 0,
  payload: null
};

function normalizeArticle(article) {
  const title = String(article?.title || "").trim();
  const url = String(article?.url || "").trim();
  if (!title || !url) return null;
  const publishedAt = article?.publishedAt || article?.published_at || new Date().toISOString();
  const publishedDate = new Date(publishedAt);
  return {
    title,
    source: String(article?.source?.name || article?.source || "NewsAPI").trim(),
    published_at: Number.isNaN(publishedDate.getTime()) ? new Date().toISOString() : publishedDate.toISOString(),
    description: String(article?.description || article?.content || "").replace(/\s*\[\+\d+\s+chars\]\s*$/i, "").trim(),
    url
  };
}

async function fetchMarketNews({ force = false } = {}) {
  if (!integrations.marketNews || !integrations.env.newsApiKey) {
    return {
      items: [],
      disabled: true,
      reason: "Market news is disabled until NEWS_API_KEY is configured on the server.",
      fetched_at: ""
    };
  }

  if (!force && cache.payload && cache.expiresAt > Date.now()) {
    return cache.payload;
  }

  const params = new URLSearchParams({
    q: MARKET_NEWS_QUERY,
    language: "en",
    sortBy: "publishedAt",
    pageSize: "5",
    searchIn: "title,description",
    from: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  });

  const response = await fetch(`https://newsapi.org/v2/everything?${params.toString()}`, {
    headers: {
      "X-Api-Key": integrations.env.newsApiKey
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || data.error || "Market news fetch failed.");
    error.status = response.status;
    throw error;
  }

  const items = (Array.isArray(data.articles) ? data.articles : [])
    .map(normalizeArticle)
    .filter(Boolean);

  const payload = {
    items,
    disabled: false,
    reason: "",
    fetched_at: new Date().toISOString()
  };

  cache = {
    payload,
    expiresAt: Date.now() + NEWS_CACHE_TTL_MS
  };

  return payload;
}

module.exports = {
  fetchMarketNews,
  normalizeArticle
};
