const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const {execFileSync} = require("node:child_process");

const ROOT = path.resolve(__dirname, "../..");
const BASELINE_REF = "62ec92668261142e5c0fa8b3a1be91359fee9241";
const RUNTIME_FILE = /^(?:server\.js|client\.js|supabase-client\.js|enrichment\.js|index\.html|manifest\.json|favicon\.svg|sw\.js|[^/]+\.css|src\/.+\.js|icons\/.+\.png|assets\/brand\/.+\.png)$/;
const FIXTURE_PASSWORD = "SyntheticUiOnly123!";
const FIXTURE_USERS = [
  { id: "ui-admin", name: "Demo Admin", email: "admin@crm-ui.test", role: "admin", territory: "Mixed" },
  { id: "ui-salesman", name: "Demo Salesman", email: "salesman@crm-ui.test", role: "salesman", territory: "UAE-North" },
  { id: "ui-other", name: "Other Demo Salesman", email: "other@crm-ui.test", role: "salesman", territory: "UAE-South" }
];

function copyRuntime(source, destination, prefix = "") {
  for (const item of fs.readdirSync(source, { withFileTypes: true })) {
    const relative = `${prefix}${item.name}`;
    if (item.isDirectory()) {
      if (!["src", "icons", "assets", "assets/brand"].includes(relative)
        && !relative.startsWith("src/")) continue;
      copyRuntime(path.join(source, item.name), destination, `${relative}/`);
      continue;
    }
    const allowed = RUNTIME_FILE.test(relative);
    if (!item.isFile() || !allowed) continue;
    const target = path.join(destination, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(source, item.name), target);
  }
}

function copyBaselineRuntime(destination) {
  const files = execFileSync("git", ["ls-tree", "-r", "--name-only", BASELINE_REF], {cwd:ROOT, encoding:"utf8"}).trim().split(/\r?\n/);
  for (const file of files.filter(file => RUNTIME_FILE.test(file))) {
    const target = path.resolve(destination, file);
    if (!target.startsWith(`${path.resolve(destination)}${path.sep}`)) throw new Error("Invalid baseline runtime path");
    fs.mkdirSync(path.dirname(target), {recursive:true});
    fs.writeFileSync(target, execFileSync("git", ["show", `${BASELINE_REF}:${file}`], {cwd:ROOT, maxBuffer:32 * 1024 * 1024}));
  }
}

function syntheticDatabase() {
  const salt = "synthetic-ui-only";
  const hash = crypto.pbkdf2Sync(FIXTURE_PASSWORD, salt, 120000, 32, "sha256").toString("hex");
  const users = FIXTURE_USERS.map(user => ({ ...user, status: "active", password_hash: `${salt}:${hash}` }));
  const stages = ["NEW", "CONTACTED", "NEGOTIATION", "WON", "LOST", "DORMANT"];
  const leads = Array.from({ length: 18 }, (_, index) => {
    const owner = index < 12 ? users[1] : users[2];
    return {
      id: `ui-lead-${index + 1}`,
      company_name: `Synthetic Steel Company ${String(index + 1).padStart(2, "0")}`,
      contact_person: `Demo Contact ${index + 1}`,
      email: `contact-${index + 1}@example.test`,
      phone: index === 0 ? "+12025550101" : "",
      assigned_to: owner.id,
      assigned_salesman: owner.name,
      created_by: users[0].id,
      territory: owner.territory,
      sector: "Structural Fabricator",
      location: "Demo City",
      country_emirate: "Demo Region",
      stage: stages[index % stages.length],
      priority: ["New", "Warm", "Hot", "At Risk"][index % 4],
      tier: String(index % 3 + 1),
      estimated_value: 10000 + index * 1000,
      next_action: "To Call",
      next_action_date: "2026-10-20",
      last_activity: "2026-10-01",
      created_at: "2026-10-01T09:00:00.000Z",
      notes: "Synthetic fixture only. No customer data.",
      product_interest: "Rebar",
      activities: [{
        id: `ui-activity-${index + 1}`,
        at: "2026-10-01",
        type: "Phone Call",
        text: "Synthetic baseline call, awaiting a requirements update.",
        logged_by: owner.name,
        created_by: owner.id
      }]
    };
  });
  return { users, salesmen: users.slice(1), leads, pmrs: [], activities: [] };
}

function createFixtureSnapshot() {
  const snapshot = fs.mkdtempSync(path.join(os.tmpdir(), "arg-crm-ui-baseline-"));
  if (process.env.CRM_UI_REPLAY_BASELINE === "1") {
    if (process.env.CRM_UI_SCREENSHOT_PHASE !== "before") throw new Error("Baseline replay requires Before screenshot phase");
    copyBaselineRuntime(snapshot);
    console.log(`Synthetic runtime source: ${BASELINE_REF}`);
  } else copyRuntime(ROOT, snapshot);
  fs.mkdirSync(path.join(snapshot, "data"));
  fs.writeFileSync(path.join(snapshot, "data", "db.json"), JSON.stringify(syntheticDatabase()));
  if (fs.existsSync(path.join(snapshot, ".env"))) throw new Error("UI fixture must never contain .env");
  return snapshot;
}

function startFixture() {
  const port = Number(process.env.CRM_UI_TEST_PORT || 4179);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Invalid local fixture port");
  const snapshot = createFixtureSnapshot();
  console.log(`Synthetic UI fixture snapshot: ${snapshot}`);
  // The child runtime receives no inherited credentials, provider keys or Vercel flags.
  for (const name of Object.keys(process.env)) {
    if (!/^(?:PATH|SYSTEMROOT|WINDIR|COMSPEC|TEMP|TMP|TMPDIR|HOME|USERPROFILE)$/i.test(name)) delete process.env[name];
  }
  Object.assign(process.env, {
    ADMIN_EMAIL: FIXTURE_USERS[0].email,
    APP_SESSION_SECRET: crypto.randomBytes(32).toString("hex"),
    ENABLE_LEAD_INTELLIGENCE_AUTO_QUEUE: "false",
    ENABLE_GOOGLE_PLACES: "false",
    ENABLE_CLAUDE_ENRICHMENT: "false",
    ENABLE_ANTHROPIC_WEB_SEARCH: "false",
    ENABLE_AI_AGENT: "false",
    ENABLE_MARKET_INTEL: "false",
    ENABLE_MARKET_NEWS: "false"
  });
  global.fetch = async () => { throw new Error("External fetch disabled in the synthetic UI fixture"); };
  const server = require(path.join(snapshot, "server.js"));
  server.listen(port, "127.0.0.1", () => console.log(`Synthetic CRM UI fixture ready at http://127.0.0.1:${port}`));
  const stop = () => server.close(() => process.exit(0));
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
  return { server, snapshot };
}

if (require.main === module) startFixture();

module.exports = { BASELINE_REF, FIXTURE_PASSWORD, FIXTURE_USERS, copyRuntime, syntheticDatabase, createFixtureSnapshot, startFixture };
