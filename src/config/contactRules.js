const STATUS_THRESHOLDS = {
  NEW: 30,
  CONTACTED: 21,
  NEGOTIATION: 14,
  WON: 30,
  LOST: 90
};

const STATUS_ALIASES = {
  PROSPECT: "NEW",
  OUTREACH: "CONTACTED",
  QUALIFIED: "CONTACTED",
  ENGAGED: "NEGOTIATION",
  SAMPLING: "NEGOTIATION",
  PROPOSAL: "NEGOTIATION",
  "PROPOSAL SENT": "NEGOTIATION",
  ACTIVE: "WON",
  DORMANT: "LOST",
  "AT RISK": "LOST"
};

const TIER_MULTIPLIERS = {
  1: 0.7,
  2: 1.0,
  3: 1.5
};

function effectiveThreshold(status, tier) {
  const rawKey = String(status || "NEW").trim().toUpperCase();
  const key = STATUS_ALIASES[rawKey] || rawKey;
  const base = STATUS_THRESHOLDS[key] ?? 30;
  const mult = TIER_MULTIPLIERS[String(tier || "2")] ?? 1.0;
  return Math.round(base * mult);
}

module.exports = {
  STATUS_THRESHOLDS,
  TIER_MULTIPLIERS,
  effectiveThreshold
};
