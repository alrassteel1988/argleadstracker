const STATUS_THRESHOLDS = {
  PROSPECT: 30,
  OUTREACH: 21,
  ENGAGED: 14,
  SAMPLING: 14,
  ACTIVE: 30,
  DORMANT: 90
};

const TIER_MULTIPLIERS = {
  1: 0.7,
  2: 1.0,
  3: 1.5
};

function effectiveThreshold(status, tier) {
  const key = String(status || "PROSPECT").trim().toUpperCase();
  const base = STATUS_THRESHOLDS[key] ?? 30;
  const mult = TIER_MULTIPLIERS[String(tier || "2")] ?? 1.0;
  return Math.round(base * mult);
}

module.exports = {
  STATUS_THRESHOLDS,
  TIER_MULTIPLIERS,
  effectiveThreshold
};
