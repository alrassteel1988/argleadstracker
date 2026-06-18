const assert = require("assert");
const server = require("../server");

const validVoiceId = "voice-1760000000000-abcdef1234567890";

const pmr = server.normalizePmr(
  {
    meeting_date: "2026-06-03",
    relationship_heat_score: "5",
    voice_note_id: validVoiceId,
    voice_note_url: `/api/pmr-voice-notes/${validVoiceId}`,
    voice_note_mime_type: "audio/webm",
    voice_note_size_bytes: "12345",
    voice_note_transcript: "Customer asked for rebar pricing, mentioned a competitor, and needs ISO documents."
  },
  { id: "lead-test" },
  { name: "Glory" }
);

assert.equal(pmr.company_id, "lead-test");
assert.equal(pmr.voice_note_id, validVoiceId);
assert.equal(pmr.voice_note_url, `/api/pmr-voice-notes/${validVoiceId}`);
assert.equal(pmr.voice_note_mime_type, "audio/webm");
assert.equal(pmr.voice_note_size_bytes, 12345);
assert.equal(pmr.voice_note_transcript, "Customer asked for rebar pricing, mentioned a competitor, and needs ISO documents.");
assert.deepEqual(pmr.voice_note, {
  id: validVoiceId,
  url: `/api/pmr-voice-notes/${validVoiceId}`,
  path: "",
  mime_type: "audio/webm",
  size_bytes: 12345
});

const rejected = server.normalizePmr(
  {
    voice_note_id: validVoiceId,
    voice_note_url: "https://example.com/not-owned-audio.webm"
  },
  { id: "lead-test" },
  { name: "Glory" }
);

assert.equal(rejected.voice_note_id, "");
assert.equal(rejected.voice_note_url, "");
assert.equal(rejected.voice_note, null);

const draft = server.normalizePmrAnalysisDraft({
  products_discussed: "Rebar and cut-and-bend supply",
  competitors_mentioned: "Local mill competitor",
  compliance_requirements: "ISO certificates and mill test certificates",
  notes: "Buyer expects a trial order next month.",
  first_order_timing: "30-90 days",
  potential_annual_value: "5M+",
  relationship_heat_score: "5",
  director_action_required: "Attend next visit",
  account_status: "Hot"
});

assert.equal(draft.products_discussed, "Rebar and cut-and-bend supply");
assert.equal(draft.first_order_timing, "30-90 days");
assert.equal(draft.potential_annual_value, "5M+");
assert.equal(draft.relationship_heat_score, "5");
assert.equal(draft.director_action_required, "Attend next visit");
assert.equal(draft.account_status, "Hot");

const guardedDraft = server.normalizePmrAnalysisDraft({
  first_order_timing: "tomorrow",
  potential_annual_value: "huge",
  relationship_heat_score: "10",
  director_action_required: "CEO must fly in",
  account_status: "Excellent"
});

assert.equal(guardedDraft.first_order_timing, "unknown");
assert.equal(guardedDraft.potential_annual_value, "500K-2M");
assert.equal(guardedDraft.relationship_heat_score, "3");
assert.equal(guardedDraft.director_action_required, "None");
assert.equal(guardedDraft.account_status, "Warm");

console.log("PASS PMR voice note is linked only from server-issued media URLs");
