// Callers must supply only records visible to the current user.
function matchPlacesToVisibleLeads(places, visibleLeads) {
  const byPlaceId = new Map();
  for (const lead of visibleLeads || []) {
    const placeId = String(lead.google_place_id || '').trim();
    if (!placeId || !lead.id) continue;
    if (!byPlaceId.has(placeId)) byPlaceId.set(placeId, []);
    byPlaceId.get(placeId).push(lead);
  }
  return (places || []).map(place => {
    const placeId = String(place.google_place_id || place.place_id || '').trim();
    const matches = placeId ? (byPlaceId.get(placeId) || []) : [];
    if (!placeId || matches.length > 1) return { ...place, crm_status: 'unverified', crm_lead_id: null };
    if (!matches.length) return { ...place, crm_status: 'new', crm_lead_id: null };
    const lead = matches[0];
    const stage = String(lead.stage || lead.lead_status || '').trim().toUpperCase();
    return { ...place, crm_status: ['WON', 'ACTIVE'].includes(stage) ? 'customer' : 'lead', crm_lead_id: lead.id };
  });
}

module.exports = { matchPlacesToVisibleLeads };
