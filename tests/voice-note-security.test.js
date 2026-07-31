const assert = require("assert");
const fs = require("fs");
const path = require("path");
const server = require("../server");
const {
  VOICE_NOTE_SIGNED_URL_TTL_SECONDS,
  signLocalVoiceNoteGrant,
  verifyLocalVoiceNoteGrant
} = require("../src/services/voiceNoteSecurityService");

const SECRET = "voice-note-security-test-secret";
const NOTE_ID = "voice-1760000000000-abcdef1234567890";

function responseRecorder() {
  return {
    status: 0,
    headers: {},
    body: "",
    setHeader(name, value) {
      this.headers[String(name).toLowerCase()] = value;
    },
    writeHead(status, headers = {}) {
      this.status = status;
      Object.entries(headers).forEach(([name, value]) => {
        this.headers[String(name).toLowerCase()] = value;
      });
    },
    end(body) {
      this.body = body || "";
    }
  };
}

async function run() {
  const issuedAt = Date.parse("2026-07-30T10:00:00.000Z");
  const grant = signLocalVoiceNoteGrant({
    noteId: NOTE_ID,
    userId: "salesman-1",
    secret: SECRET,
    now: issuedAt
  });
  assert.strictEqual(grant.expiresAt, Math.floor(issuedAt / 1000) + VOICE_NOTE_SIGNED_URL_TTL_SECONDS);
  assert.deepStrictEqual(
    verifyLocalVoiceNoteGrant({
      noteId: NOTE_ID,
      userId: grant.userId,
      expiresAt: grant.expiresAt,
      signature: grant.signature,
      secret: SECRET,
      now: issuedAt + 1000
    }),
    { ok: true, reason: "authorized" }
  );
  assert.strictEqual(
    verifyLocalVoiceNoteGrant({
      noteId: `${NOTE_ID}-tampered`,
      userId: grant.userId,
      expiresAt: grant.expiresAt,
      signature: grant.signature,
      secret: SECRET,
      now: issuedAt + 1000
    }).ok,
    false
  );
  assert.deepStrictEqual(
    verifyLocalVoiceNoteGrant({
      noteId: NOTE_ID,
      userId: grant.userId,
      expiresAt: grant.expiresAt,
      signature: grant.signature,
      secret: SECRET,
      now: issuedAt + (VOICE_NOTE_SIGNED_URL_TTL_SECONDS * 1000)
    }),
    { ok: false, reason: "expired_grant" }
  );

  const lead = {
    id: "lead-1",
    assigned_to: "owner-1",
    assigned_salesman: "Owner User",
    created_by: "admin-1",
    territory: "UAE-North"
  };
  assert.strictEqual(server.voiceNoteAccessAllowed(lead, {
    id: "admin-1",
    role: "admin",
    status: "active",
    territory: "All"
  }), true);
  assert.strictEqual(server.voiceNoteAccessAllowed(lead, {
    id: "owner-1",
    name: "Owner User",
    role: "salesman",
    status: "active",
    territory: "Saudi"
  }), true);
  assert.strictEqual(server.voiceNoteAccessAllowed(lead, {
    id: "territory-user",
    name: "Territory User",
    role: "salesman",
    status: "active",
    territory: "UAE-North"
  }), true);
  assert.strictEqual(server.voiceNoteAccessAllowed(lead, {
    id: "other-user",
    name: "Other User",
    role: "salesman",
    status: "active",
    territory: "Saudi"
  }), false);
  assert.strictEqual(server.voiceNoteAccessAllowed(lead, {
    id: "owner-1",
    name: "Owner User",
    role: "salesman",
    status: "inactive",
    territory: "UAE-North"
  }), false);

  const anonymousResponse = responseRecorder();
  const anonymousRequest = {
    method: "GET",
    url: `/api/pmr-voice-notes/${NOTE_ID}`,
    headers: {},
    socket: { remoteAddress: "127.0.0.1" }
  };
  await server.handleApi(
    anonymousRequest,
    anonymousResponse,
    new URL(`http://localhost/api/pmr-voice-notes/${NOTE_ID}`)
  );
  assert.strictEqual(anonymousResponse.status, 401);
  assert.deepStrictEqual(JSON.parse(anonymousResponse.body), {
    error: "Authentication required."
  });

  const serverSource = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
  const clientSource = fs.readFileSync(path.join(__dirname, "..", "client.js"), "utf8");
  const storageMigration = fs.readFileSync(
    path.join(__dirname, "..", "supabase", "migrations", "20260609120000_supabase_pmrs_and_voice_storage.sql"),
    "utf8"
  );
  assert.match(serverSource, /"Cache-Control": "private, no-store"/);
  assert.doesNotMatch(serverSource, /private, max-age=31536000, immutable/);
  assert.match(
    serverSource,
    /createStorageSignedUrl\(\s*objectPath,\s*VOICE_NOTE_SIGNED_URL_TTL_SECONDS,\s*user\.token\s*\)/
  );
  assert.match(clientSource, /const source = !voiceNoteId && activity\.voice_note_url/);
  assert.match(storageMigration, /'pmr-voice-notes',[\s\S]*?false,/);

  console.log("PASS PMR voice-note media requires authorization and five-minute grants");
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
