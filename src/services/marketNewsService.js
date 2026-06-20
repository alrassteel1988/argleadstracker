const integrations = require("../config/integrations");

const NEWS_CACHE_TTL_MS = 15 * 60 * 1000;
const MARKET_NEWS_QUERY = [
  "\"steel market\"",
  "\"construction materials\"",
  "\"construction industry\"",
  "\"oil and gas\"",
  "\"marine engineering\"",
  "\"metal fabrication\"",
  "\"metal industries\"",
  "fabrication",
  "metal",
  "steel",
  "\"UAE construction\"",
  "\"Dubai infrastructure\"",
  "\"industrial projects\""
].join(" OR ");
const MARKET_NEWS_KEYWORDS = [
  { term: "construction", weight: 3 },
  { term: "construction materials", weight: 4 },
  { term: "oil and gas", weight: 5 },
  { term: "marine engineering", weight: 5 },
  { term: "marine", weight: 2 },
  { term: "shipyard", weight: 3 },
  { term: "offshore", weight: 3 },
  { term: "metal", weight: 2 },
  { term: "metal industries", weight: 4 },
  { term: "steel", weight: 3 },
  { term: "fabrication", weight: 4 },
  { term: "fabricator", weight: 3 },
  { term: "rebar", weight: 3 },
  { term: "industrial", weight: 2 }
];

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

function articleRelevanceScore(article) {
  const haystack = `${article?.title || ""} ${article?.description || ""}`.toLowerCase();
  return MARKET_NEWS_KEYWORDS.reduce((score, keyword) => (
    haystack.includes(keyword.term) ? score + keyword.weight : score
  ), 0);
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
    pageSize: "12",
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
    .filter(Boolean)
    .map(article => ({ ...article, _score: articleRelevanceScore(article) }))
    .filter(article => article._score > 0)
    .sort((a, b) => {
      const dateDifference = new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
      if (dateDifference !== 0) return dateDifference;
      return b._score - a._score;
    })
    .slice(0, 6)
    .map(({ _score, ...article }) => article);

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
