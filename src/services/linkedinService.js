const TITLE_OPTIONS = [
  { label: "Procurement Manager", query: "procurement manager" },
  { label: "Supply Chain Manager", query: "supply chain manager" },
  { label: "Project Manager", query: "project manager" },
  { label: "Estimation Manager", query: "estimation manager" },
  { label: "Quantity Surveyor", query: "quantity surveyor" },
  { label: "MD / CEO", query: "managing director OR CEO" },
  { label: "Operations Manager", query: "operations manager" },
  { label: "Technical Manager", query: "technical manager" }
];

function titleOptions() {
  return TITLE_OPTIONS.map(item => item.label);
}

function normalizeTitle(title) {
  const value = String(title || "").trim();
  const match = TITLE_OPTIONS.find(item => item.label === value || item.query === value);
  return match || TITLE_OPTIONS[0];
}

function linkedInPeopleSearchUrl(companyName, title = TITLE_OPTIONS[0].label) {
  const company = String(companyName || "").trim();
  const selectedTitle = normalizeTitle(title);
  const keywords = [company, selectedTitle.query].filter(Boolean).join(" ");
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keywords)}`;
}

module.exports = {
  TITLE_OPTIONS,
  linkedInPeopleSearchUrl,
  normalizeTitle,
  titleOptions
};
