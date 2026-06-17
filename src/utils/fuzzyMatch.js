const LEGAL_SUFFIXES = /\b(l\s*l\s*c|llc|l\.l\.c|fze|fzco|wll|bsc|co|company|ltd|limited|trading|group|industries|international|est|establishment|contracting|construction|services|solutions)\b/gi;
const PUNCTUATION = /[.,\-&']/g;

function normalise(name) {
  return String(name || "")
    .toLowerCase()
    .replace(PUNCTUATION, " ")
    .replace(LEGAL_SUFFIXES, "")
    .replace(/\s+/g, " ")
    .trim();
}

function jaroWinkler(s1, s2) {
  const left = String(s1 || "");
  const right = String(s2 || "");
  if (left === right) return 1;
  const len1 = left.length;
  const len2 = right.length;
  if (!len1 || !len2) return 0;
  const matchDist = Math.max(Math.floor(Math.max(len1, len2) / 2) - 1, 0);
  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);
  let matches = 0;
  let transpositions = 0;
  for (let i = 0; i < len1; i += 1) {
    const start = Math.max(0, i - matchDist);
    const end = Math.min(i + matchDist + 1, len2);
    for (let j = start; j < end; j += 1) {
      if (s2Matches[j] || left[i] !== right[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches += 1;
      break;
    }
  }
  if (!matches) return 0;
  let k = 0;
  for (let i = 0; i < len1; i += 1) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k += 1;
    if (left[i] !== right[k]) transpositions += 1;
    k += 1;
  }
  const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
  let prefix = 0;
  for (let i = 0; i < Math.min(4, len1, len2); i += 1) {
    if (left[i] === right[i]) prefix += 1;
    else break;
  }
  return jaro + prefix * 0.1 * (1 - jaro);
}

function findDuplicates(inputName, existingCompanies, duplicateThreshold = 0.85, warnThreshold = 0.75) {
  const normInput = normalise(inputName);
  if (normInput.length < 4) return [];
  return (existingCompanies || [])
    .map(company => ({
      ...company,
      score: jaroWinkler(normInput, normalise(company.name || company.company_name))
    }))
    .filter(company => company.score >= warnThreshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(company => ({ ...company, isDuplicate: company.score >= duplicateThreshold }));
}

module.exports = {
  findDuplicates,
  jaroWinkler,
  normalise
};
