const integrations = require("../config/integrations");

// ERP Integration Stub - Al Ras Group
// Replace the fetchQuotationDetails body when ERP API details are confirmed.
// Expected ERP: TO BE CONFIRMED - likely Sage, SAP, or a custom ERP.
// Quotation reference format: TO BE CONFIRMED - e.g. "QT-2024-00123".

async function validateQuotationRef(ref) {
  const value = String(ref || "").trim();
  if (!value) return { valid: false, data: null, error: "Empty reference", source: "stub" };

  if (!integrations.keys.erp) {
    return { valid: true, data: null, error: null, source: "stub" };
  }

  try {
    const base = integrations.env.erpBaseUrl.replace(/\/+$/, "");
    const response = await fetch(`${base}/quotations/${encodeURIComponent(value)}`, {
      headers: { Authorization: `Bearer ${integrations.env.erpApiKey}` }
    });
    if (response.status === 404) return { valid: false, data: null, error: "Reference not found", source: "erp" };
    const data = await response.json().catch(() => null);
    if (!response.ok) return { valid: false, data: null, error: "ERP lookup failed", source: "erp" };
    return { valid: true, data, error: null, source: "erp" };
  } catch {
    return { valid: true, data: null, error: null, source: "stub" };
  }
}

async function fetchQuotationDetails(ref) {
  const result = await validateQuotationRef(ref);
  return result.valid ? result.data : null;
}

module.exports = {
  fetchQuotationDetails,
  validateQuotationRef
};
