const crypto = require("crypto");

const VOICE_NOTE_SIGNED_URL_TTL_SECONDS = 5 * 60;

function constantTimeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function grantPayload({ noteId, userId, expiresAt }) {
  return `${String(noteId || "")}\n${String(userId || "")}\n${Number(expiresAt || 0)}`;
}

function signLocalVoiceNoteGrant({
  noteId,
  userId,
  secret,
  now = Date.now(),
  ttlSeconds = VOICE_NOTE_SIGNED_URL_TTL_SECONDS
}) {
  const expiresAt = Math.floor(Number(now) / 1000) + Math.max(1, Math.min(Number(ttlSeconds) || 0, VOICE_NOTE_SIGNED_URL_TTL_SECONDS));
  const signature = crypto
    .createHmac("sha256", String(secret || ""))
    .update(grantPayload({ noteId, userId, expiresAt }))
    .digest("base64url");
  return { userId: String(userId || ""), expiresAt, signature };
}

function verifyLocalVoiceNoteGrant({
  noteId,
  userId,
  expiresAt,
  signature,
  secret,
  now = Date.now()
}) {
  const expires = Number(expiresAt);
  const currentTime = Math.floor(Number(now) / 1000);
  if (!noteId || !userId || !signature || !Number.isInteger(expires)) {
    return { ok: false, reason: "invalid_grant" };
  }
  if (expires <= currentTime || expires > currentTime + VOICE_NOTE_SIGNED_URL_TTL_SECONDS) {
    return { ok: false, reason: expires <= currentTime ? "expired_grant" : "invalid_expiry" };
  }
  const expected = crypto
    .createHmac("sha256", String(secret || ""))
    .update(grantPayload({ noteId, userId, expiresAt: expires }))
    .digest("base64url");
  return constantTimeEqual(signature, expected)
    ? { ok: true, reason: "authorized" }
    : { ok: false, reason: "invalid_signature" };
}

module.exports = {
  VOICE_NOTE_SIGNED_URL_TTL_SECONDS,
  constantTimeEqual,
  signLocalVoiceNoteGrant,
  verifyLocalVoiceNoteGrant
};
