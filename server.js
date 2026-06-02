const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  fs.readFileSync(filePath, "utf8").split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const separator = trimmed.indexOf("=");
    if (separator < 1) return;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
    if (!process.env[key]) process.env[key] = value;
  });
}

loadEnvFile(path.join(__dirname, ".env"));

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = process.env.VERCEL ? path.join("/tmp", "argleadstracker") : path.join(ROOT, "data");
const DB_PATH = path.join(DATA_DIR, "db.json");
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_TRANSCRIPTION_MODEL = process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-4o-mini-transcribe";
const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || "glory@alrassteel.com").trim().toLowerCase();
const ADMIN_BOOTSTRAP_PASSWORD = process.env.ADMIN_BOOTSTRAP_PASSWORD || "";
const SESSION_SECRET = process.env.APP_SESSION_SECRET || "local-development-session-secret-change-me";
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const transcriptionRateLimit = new Map();

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon"
};

const seed = {
  salesmen: [
    { id: "usr-101", name: "Ahmed Khan", email: "ahmed@argsteel.com", role: "salesman", territory: "Dubai", status: "active" },
    { id: "usr-102", name: "Rafiq Ali", email: "rafiq@argsteel.com", role: "salesman", territory: "Sharjah", status: "active" },
    { id: "usr-103", name: "Naveen Joseph", email: "naveen@argsteel.com", role: "salesman", territory: "Abu Dhabi", status: "active" }
  ],
  leads: [
    {
      id: "lead-1001",
      company_name: "Gulf Horizon Contracting",
      contact_person: "Mansoor Al Qasimi",
      phone: "+971 50 218 4471",
      email: "procurement@gulfhorizon.example",
      territory: "Dubai",
      assigned_salesman: "Ahmed Khan",
      stage: "Qualified",
      priority: "Hot",
      estimated_value: 285000,
      product_interest: "Rebar, structural steel, cut and bend",
      next_action: "Send mill certificate package and confirm monthly volume",
      next_action_date: "2026-05-24",
      last_activity: "2026-05-21",
      source: "Existing contractor network",
      notes: "Tendering for two warehouse projects in Dubai Industrial City.",
      activities: [
        { at: "2026-05-21", type: "Call", text: "Procurement requested pricing benchmark and delivery lead time." }
      ]
    },
    {
      id: "lead-1002",
      company_name: "Al Noor Precast Factory",
      contact_person: "Saira Rahman",
      phone: "+971 55 301 8842",
      email: "saira.procurement@alnoorprecast.example",
      territory: "Sharjah",
      assigned_salesman: "Rafiq Ali",
      stage: "Proposal",
      priority: "Warm",
      estimated_value: 164000,
      product_interest: "Wire mesh and rebar coils",
      next_action: "Follow up on sample approval",
      next_action_date: "2026-05-25",
      last_activity: "2026-05-20",
      source: "Inbound website enquiry",
      notes: "Quality team is checking bend tolerance and delivery packaging.",
      activities: [
        { at: "2026-05-20", type: "Email", text: "Sent product list and indicative rates." }
      ]
    },
    {
      id: "lead-1003",
      company_name: "Metroline MEP Services",
      contact_person: "John D'Souza",
      phone: "+971 52 771 9130",
      email: "john@metrolinemep.example",
      territory: "Abu Dhabi",
      assigned_salesman: "Naveen Joseph",
      stage: "New",
      priority: "New",
      estimated_value: 72000,
      product_interest: "GI sheets, angles, channels",
      next_action: "Qualify steel consumption and payment terms",
      next_action_date: "2026-05-23",
      last_activity: "2026-05-22",
      source: "Salesman visit",
      notes: "Potential monthly repeat orders if credit terms are approved.",
      activities: [
        { at: "2026-05-22", type: "Visit", text: "Initial site visit completed; buyer asked for catalogue." }
      ]
    }
  ]
};

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2));
}

function readDb() {
  ensureDb();
  const db = JSON.parse(fs.readFileSync(DB_PATH, "utf8").replace(/^\uFEFF/, ""));
  if (ensureAdminAccount(db)) writeDb(db);
  return db;
}

function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(String(password), salt, 120000, 32, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

function passwordMatches(password, storedHash) {
  if (!storedHash || !storedHash.includes(":")) return false;
  const [salt, expected] = storedHash.split(":");
  const actual = crypto.pbkdf2Sync(String(password), salt, 120000, 32, "sha256").toString("hex");
  return expected.length === actual.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}

function ensureAdminAccount(db) {
  db.users = Array.isArray(db.users) ? db.users : [];
  const existing = db.users.find(user => String(user.email || "").toLowerCase() === ADMIN_EMAIL);
  if (existing) {
    existing.role = "admin";
    existing.status = "active";
    return false;
  }
  if (!ADMIN_BOOTSTRAP_PASSWORD) return false;
  db.users.push({
    id: `admin-${Date.now()}`,
    name: "Glory",
    email: ADMIN_EMAIL,
    role: "admin",
    territory: "All",
    status: "active",
    password_hash: hashPassword(ADMIN_BOOTSTRAP_PASSWORD),
    created_at: new Date().toISOString()
  });
  return true;
}

function publicUser(user) {
  if (!user) return null;
  const { password_hash, ...safe } = user;
  return safe;
}

function issueToken(user) {
  const payload = Buffer.from(JSON.stringify({
    sub: user.id,
    role: user.role,
    exp: Date.now() + 12 * 60 * 60 * 1000
  })).toString("base64url");
  const signature = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function currentUser(req, db) {
  const header = String(req.headers.authorization || "");
  if (!header.startsWith("Bearer ")) return null;
  const [payload, signature] = header.slice(7).split(".");
  if (!payload || !signature) return null;
  const expected = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (parsed.exp < Date.now()) return null;
    return db.users.find(user => user.id === parsed.sub && user.status === "active") || null;
  } catch (error) {
    return null;
  }
}

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function readRawBody(req, maxBytes = MAX_AUDIO_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", chunk => {
      size += chunk.length;
      if (size > maxBytes) {
        const error = new Error("Audio recording is too large. Keep recordings under 20 MB.");
        error.status = 413;
        reject(error);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function clientIp(req) {
  return String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "local").split(",")[0].trim();
}

function allowTranscription(req) {
  const key = clientIp(req);
  const now = Date.now();
  const windowMs = 60_000;
  const attempts = (transcriptionRateLimit.get(key) || []).filter(timestamp => now - timestamp < windowMs);
  if (attempts.length >= 10) return false;
  attempts.push(now);
  transcriptionRateLimit.set(key, attempts);
  return true;
}

function audioExtension(contentType) {
  if (contentType.includes("mp4")) return "mp4";
  if (contentType.includes("mpeg")) return "mp3";
  if (contentType.includes("wav")) return "wav";
  if (contentType.includes("m4a")) return "m4a";
  return "webm";
}

function safeProviderMessage(value) {
  return String(value || "OpenAI transcription request failed.")
    .replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]")
    .slice(0, 300);
}

async function transcribeAudio(req, res) {
  if (!OPENAI_API_KEY) return sendJson(res, 503, { error: "Voice transcription is not configured. Add OPENAI_API_KEY on the server." });
  if (!allowTranscription(req)) return sendJson(res, 429, { error: "Too many voice transcription requests. Please wait one minute and try again." });

  const contentType = String(req.headers["content-type"] || "audio/webm").split(";")[0].trim();
  if (!contentType.startsWith("audio/") && contentType !== "application/octet-stream") {
    return sendJson(res, 415, { error: "Unsupported recording format." });
  }
  const audio = await readRawBody(req);
  if (!audio.length) return sendJson(res, 400, { error: "Record a voice note before requesting transcription." });

  const form = new FormData();
  form.append("model", OPENAI_TRANSCRIPTION_MODEL);
  form.append("file", new Blob([audio], { type: contentType }), `sales-note.${audioExtension(contentType)}`);

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: form
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(safeProviderMessage(data.error?.message));
    error.status = response.status === 429 ? 429 : 502;
    throw error;
  }
  return sendJson(res, 200, { text: String(data.text || "").trim(), model: OPENAI_TRANSCRIPTION_MODEL });
}

function normalizeLead(input) {
  const now = new Date().toISOString().slice(0, 10);
  return {
    id: input.id || `lead-${Date.now()}`,
    company_name: String(input.company_name || "New ARG Lead").trim(),
    contact_person: String(input.contact_person || "").trim(),
    phone: String(input.phone || "").trim(),
    email: String(input.email || "").trim(),
    territory: String(input.territory || "Dubai").trim(),
    assigned_salesman: String(input.assigned_salesman || "Unassigned").trim(),
    stage: String(input.stage || "New").trim(),
    priority: String(input.priority || "New").trim(),
    estimated_value: Number(input.estimated_value || 0),
    product_interest: String(input.product_interest || "").trim(),
    next_action: String(input.next_action || "Qualify lead").trim(),
    next_action_date: String(input.next_action_date || now).trim(),
    last_activity: String(input.last_activity || now).trim(),
    source: String(input.source || "Manual entry").trim(),
    notes: String(input.notes || "").trim(),
    activities: Array.isArray(input.activities) ? input.activities : []
  };
}

async function handleApi(req, res, url) {
  const db = readDb();

  if (req.method === "GET" && url.pathname === "/api/health") {
    return sendJson(res, 200, {
      ok: true,
      app: "ARG Leads Tracker",
      transcription: { enabled: Boolean(OPENAI_API_KEY), model: OPENAI_TRANSCRIPTION_MODEL },
      date: new Date().toISOString()
    });
  }

  if (req.method === "POST" && url.pathname === "/api/auth/login") {
    const payload = await readBody(req);
    const email = String(payload.email || "").trim().toLowerCase();
    const user = db.users.find(item => String(item.email || "").toLowerCase() === email && item.status === "active");
    if (!user || !passwordMatches(payload.password, user.password_hash)) {
      return sendJson(res, 401, { error: "Invalid email or password." });
    }
    return sendJson(res, 200, { token: issueToken(user), user: publicUser(user) });
  }

  const user = currentUser(req, db);
  if (!user) return sendJson(res, 401, { error: "Authentication required." });

  if (req.method === "GET" && url.pathname === "/api/auth/me") {
    return sendJson(res, 200, { user: publicUser(user) });
  }

  if (req.method === "POST" && url.pathname === "/api/auth/logout") {
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "POST" && url.pathname === "/api/transcriptions") {
    return transcribeAudio(req, res);
  }

  if (url.pathname === "/api/users") {
    if (user.role !== "admin") return sendJson(res, 403, { error: "Admin access required." });
    if (req.method === "GET") return sendJson(res, 200, db.users.map(publicUser));
    if (req.method === "POST") {
      const payload = await readBody(req);
      const email = String(payload.email || "").trim().toLowerCase();
      const name = String(payload.name || "").trim();
      const password = String(payload.password || "");
      if (!name || !email || password.length < 8) {
        return sendJson(res, 400, { error: "Name, email, and a password of at least 8 characters are required." });
      }
      if (db.users.some(item => String(item.email || "").toLowerCase() === email)) {
        return sendJson(res, 409, { error: "An account with this email already exists." });
      }
      const account = {
        id: `usr-${Date.now()}`,
        name,
        email,
        role: "salesman",
        territory: String(payload.territory || "Dubai").trim(),
        status: "active",
        password_hash: hashPassword(password),
        created_at: new Date().toISOString()
      };
      db.users.push(account);
      if (!db.salesmen.some(item => String(item.email || "").toLowerCase() === email)) {
        db.salesmen.push(publicUser(account));
      }
      writeDb(db);
      return sendJson(res, 201, publicUser(account));
    }
  }

  if (req.method === "GET" && url.pathname === "/api/settings") {
    return sendJson(res, 200, {
      stages: ["New", "Qualified", "Proposal", "Negotiation", "Won", "Dormant"],
      priorities: ["New", "Warm", "Hot", "At Risk"],
      territories: ["Dubai", "Sharjah", "Abu Dhabi", "Ajman", "Northern Emirates"],
      salesmen: db.salesmen
    });
  }

  if (req.method === "GET" && url.pathname === "/api/leads") {
    return sendJson(res, 200, db.leads);
  }

  if (req.method === "POST" && url.pathname === "/api/leads") {
    const payload = await readBody(req);
    const lead = normalizeLead(payload);
    db.leads.unshift(lead);
    writeDb(db);
    return sendJson(res, 201, lead);
  }

  const stageMatch = url.pathname.match(/^\/api\/leads\/([^/]+)\/stage$/);
  if (req.method === "PATCH" && stageMatch) {
    const payload = await readBody(req);
    const lead = db.leads.find(item => item.id === stageMatch[1]);
    if (!lead) return sendJson(res, 404, { error: "Lead not found" });
    lead.stage = String(payload.stage || lead.stage);
    lead.last_activity = new Date().toISOString().slice(0, 10);
    lead.activities.unshift({
      at: lead.last_activity,
      type: "Stage",
      text: `Stage changed to ${lead.stage}`
    });
    writeDb(db);
    return sendJson(res, 200, lead);
  }

  const activityMatch = url.pathname.match(/^\/api\/leads\/([^/]+)\/activities$/);
  if (req.method === "POST" && activityMatch) {
    const payload = await readBody(req);
    const lead = db.leads.find(item => item.id === activityMatch[1]);
    if (!lead) return sendJson(res, 404, { error: "Lead not found" });
    const activity = {
      at: new Date().toISOString().slice(0, 10),
      type: String(payload.type || "Note"),
      text: String(payload.text || "Activity added")
    };
    lead.activities.unshift(activity);
    lead.last_activity = activity.at;
    writeDb(db);
    return sendJson(res, 201, { lead, activity });
  }

  return sendJson(res, 404, { error: "API route not found" });
}

function serveStatic(req, res, url) {
  const requestedPath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(ROOT, requestedPath));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Not found");
    }
    const type = MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
    } else {
      serveStatic(req, res, url);
    }
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message || "Server error" });
  }
});

if (require.main === module) {
  ensureDb();
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`ARG Leads Tracker running at http://127.0.0.1:${PORT}`);
  });
}

server.handleApi = handleApi;
server.normalizeLead = normalizeLead;
server.transcribeAudio = transcribeAudio;
module.exports = server;
