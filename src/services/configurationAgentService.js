const CONFIGURATION_AGENT_EXAMPLES = [
  "Add At Risk to lead priorities",
  "Add Qatar to territories",
  "Add WhatsApp Follow-up to activity types",
  "Remove Other from sectors"
];

const CONFIG_FIELD_LABELS = {
  priorities: "Lead priorities",
  sectors: "Sectors",
  territories: "Territories",
  activityTypes: "Activity types"
};

const CONFIG_FIELD_ALIASES = [
  { key: "priorities", patterns: [/priorit/i, /lead\s+priority/i] },
  { key: "sectors", patterns: [/sector/i, /industr/i] },
  { key: "territories", patterns: [/territor/i, /country/i, /emirate/i, /region/i] },
  { key: "activityTypes", patterns: [/activity\s*type/i, /activity/i, /log\s*type/i] }
];

function uniqueList(values = []) {
  const seen = new Set();
  return values
    .map(value => String(value || "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter(value => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 40);
}

function normalizeConfiguration(input = {}, defaults = {}) {
  const config = {
    priorities: uniqueList(input.priorities || defaults.priorities || []),
    sectors: uniqueList(input.sectors || defaults.sectors || []),
    territories: uniqueList(input.territories || defaults.territories || []),
    activityTypes: uniqueList(input.activityTypes || defaults.activityTypes || []),
    pmr: {
      heat: uniqueList(input.pmr?.heat || defaults.pmr?.heat || []),
      firstOrderTiming: uniqueList(input.pmr?.firstOrderTiming || defaults.pmr?.firstOrderTiming || []),
      potentialValue: uniqueList(input.pmr?.potentialValue || defaults.pmr?.potentialValue || []),
      directorAction: uniqueList(input.pmr?.directorAction || defaults.pmr?.directorAction || []),
      accountStatus: uniqueList(input.pmr?.accountStatus || defaults.pmr?.accountStatus || [])
    }
  };
  return config;
}

function sanitizeConfigPatch(changes = {}, current = {}) {
  const patch = {};
  Object.keys(CONFIG_FIELD_LABELS).forEach(key => {
    if (changes[key] === undefined) return;
    const next = uniqueList(Array.isArray(changes[key]) ? changes[key] : String(changes[key]).split(/\n|,/));
    if (next.length) patch[key] = next;
  });
  if (changes.pmr && typeof changes.pmr === "object") {
    patch.pmr = {};
    ["heat", "firstOrderTiming", "potentialValue", "directorAction", "accountStatus"].forEach(key => {
      if (changes.pmr[key] === undefined) return;
      const next = uniqueList(Array.isArray(changes.pmr[key]) ? changes.pmr[key] : String(changes.pmr[key]).split(/\n|,/));
      if (next.length) patch.pmr[key] = next;
    });
    if (!Object.keys(patch.pmr).length) delete patch.pmr;
  }
  return normalizeConfiguration({ ...current, ...patch, pmr: { ...(current.pmr || {}), ...(patch.pmr || {}) } }, current);
}

function fieldForPrompt(prompt) {
  return CONFIG_FIELD_ALIASES.find(item => item.patterns.some(pattern => pattern.test(prompt)))?.key || "";
}

function valueFromPrompt(prompt) {
  const cleaned = String(prompt || "")
    .replace(/\b(add|remove|delete|include|create|new|option|to|from|in|the|crm|lead|list|configuration|config)\b/gi, " ")
    .replace(/\b(priorities?|sectors?|industries|territories|countries|emirates|regions|activity\s*types?|activity|log\s*types?)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.replace(/^["']|["']$/g, "").trim();
}

function proposeConfigurationChange({ prompt = "", changes = null, current = {}, user = {} }) {
  const now = new Date().toISOString();
  const safeCurrent = normalizeConfiguration(current, current);
  let proposed = null;
  const warnings = [];
  if (changes && typeof changes === "object") {
    proposed = sanitizeConfigPatch(changes, safeCurrent);
  } else {
    const text = String(prompt || "").trim();
    const field = fieldForPrompt(text);
    const value = valueFromPrompt(text);
    if (!field || !value) {
      warnings.push("Could not identify a safe configuration field and value. Try: Add Qatar to territories.");
      proposed = safeCurrent;
    } else {
      const removing = /\b(remove|delete)\b/i.test(text);
      const list = uniqueList(safeCurrent[field] || []);
      const next = removing
        ? list.filter(item => item.toLowerCase() !== value.toLowerCase())
        : uniqueList([...list, value]);
      proposed = sanitizeConfigPatch({ [field]: next }, safeCurrent);
      if (next.length === list.length && !removing) warnings.push(`${value} already exists in ${CONFIG_FIELD_LABELS[field]}.`);
      if (next.length === list.length && removing) warnings.push(`${value} was not found in ${CONFIG_FIELD_LABELS[field]}.`);
    }
  }
  const diff = configurationDiff(safeCurrent, proposed);
  return {
    id: `cfg-proposal-${Date.now()}`,
    created_at: now,
    created_by: user.name || user.email || user.id || "Admin",
    prompt: String(prompt || "").trim(),
    summary: diff.length ? `Prepared ${diff.length} configuration change${diff.length === 1 ? "" : "s"}.` : "No configuration changes detected.",
    changes: proposed,
    diff,
    warnings,
    status: "draft"
  };
}

function configurationDiff(before = {}, after = {}) {
  const rows = [];
  Object.keys(CONFIG_FIELD_LABELS).forEach(key => {
    const a = uniqueList(before[key] || []);
    const b = uniqueList(after[key] || []);
    if (a.join("|") !== b.join("|")) {
      rows.push({ field: key, label: CONFIG_FIELD_LABELS[key], before: a, after: b });
    }
  });
  ["heat", "firstOrderTiming", "potentialValue", "directorAction", "accountStatus"].forEach(key => {
    const a = uniqueList(before.pmr?.[key] || []);
    const b = uniqueList(after.pmr?.[key] || []);
    if (a.join("|") !== b.join("|")) {
      rows.push({ field: `pmr.${key}`, label: `PMR ${key}`, before: a, after: b });
    }
  });
  return rows;
}

module.exports = {
  CONFIGURATION_AGENT_EXAMPLES,
  normalizeConfiguration,
  proposeConfigurationChange,
  sanitizeConfigPatch,
  configurationDiff
};
