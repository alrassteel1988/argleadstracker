const assert = require("assert");
const fs = require("fs");
const path = require("path");

const originalExistsSync = fs.existsSync;
const originalReadFileSync = fs.readFileSync;
const dbPath = path.join(__dirname, "..", "data", "db.json");
const originalDb = fs.existsSync(dbPath) ? fs.readFileSync(dbPath) : null;

fs.rmSync(dbPath, { force: true });
delete process.env.VERCEL;
process.env.ADMIN_EMAIL = "admin-isolation@alrassteel.test";
process.env.ADMIN_BOOTSTRAP_PASSWORD = "AdminPass123!";
process.env.APP_SESSION_SECRET = "lead-assignment-isolation-session-secret";
process.env.NEXT_PUBLIC_SUPABASE_URL = "";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";

fs.existsSync = function patchedExistsSync(target) {
  if (String(target).endsWith(`${path.sep}.env`)) return false;
  return originalExistsSync.apply(this, arguments);
};
fs.readFileSync = function patchedReadFileSync(target) {
  if (String(target).endsWith(`${path.sep}.env`)) return "";
  return originalReadFileSync.apply(this, arguments);
};

const server = require("../server");

fs.existsSync = originalExistsSync;
fs.readFileSync = originalReadFileSync;

async function request(baseUrl, pathName, { method = "GET", token = "", csrfToken = "", body } = {}) {
  const response = await fetch(`${baseUrl}${pathName}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  return { response, data: await response.json().catch(() => ({})) };
}

(async () => {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try {
    const adminLogin = await request(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: "admin-isolation@alrassteel.test", password: "AdminPass123!" }
    });
    assert.equal(adminLogin.response.status, 200, JSON.stringify(adminLogin.data));
    const admin = { token: adminLogin.data.token, csrfToken: adminLogin.data.csrf_token };

    const [alexAccount, bhatiaAccount] = await Promise.all([
      request(baseUrl, "/api/users", {
        method: "POST",
        ...admin,
        body: { name: "Alex", email: "alex-isolation@alrassteel.test", password: "AlexPass123!", territory: "UAE-North" }
      }),
      request(baseUrl, "/api/users", {
        method: "POST",
        ...admin,
        body: { name: "P.N. Bhatia", email: "bhatia-isolation@alrassteel.test", password: "BhatiaPass123!", territory: "UAE-South" }
      })
    ]);
    assert.equal(alexAccount.response.status, 201, JSON.stringify(alexAccount.data));
    assert.equal(bhatiaAccount.response.status, 201, JSON.stringify(bhatiaAccount.data));

    const alexLogin = await request(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: "alex-isolation@alrassteel.test", password: "AlexPass123!" }
    });
    assert.equal(alexLogin.response.status, 200, JSON.stringify(alexLogin.data));
    const alex = { token: alexLogin.data.token, csrfToken: alexLogin.data.csrf_token };

    const createdByAlex = await request(baseUrl, "/api/leads", {
      method: "POST",
      ...alex,
      body: { company_name: "ACA Steel Constructions Contracting LLC", stage: "PROSPECT" }
    });
    assert.equal(createdByAlex.response.status, 201, JSON.stringify(createdByAlex.data));

    const reassignedToBhatia = await request(baseUrl, `/api/leads/${encodeURIComponent(createdByAlex.data.id)}`, {
      method: "PATCH",
      ...admin,
      body: {
        assigned_salesman: "P.N. Bhatia",
        handoff_note: "Reassigning the ACA Steel account to its current Bhatia owner for follow-up."
      }
    });
    assert.equal(reassignedToBhatia.response.status, 200, JSON.stringify(reassignedToBhatia.data));
    assert.equal(reassignedToBhatia.data.created_by, alexAccount.data.id);
    assert.equal(reassignedToBhatia.data.assigned_to, bhatiaAccount.data.id);
    assert.equal(reassignedToBhatia.data.assigned_salesman, "P.N. Bhatia");

    const alexLeads = await request(baseUrl, "/api/leads", alex);
    assert.equal(alexLeads.response.status, 200);
    assert(!alexLeads.data.some(lead => lead.id === createdByAlex.data.id), "Alex must not see a lead reassigned to Bhatia");

    const alexProtectedRoute = await request(baseUrl, `/api/leads/${encodeURIComponent(createdByAlex.data.id)}/pmrs`, alex);
    assert([403, 404].includes(alexProtectedRoute.response.status), JSON.stringify(alexProtectedRoute.data));

    const bhatiaLogin = await request(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: "bhatia-isolation@alrassteel.test", password: "BhatiaPass123!" }
    });
    assert.equal(bhatiaLogin.response.status, 200, JSON.stringify(bhatiaLogin.data));
    const bhatia = { token: bhatiaLogin.data.token, csrfToken: bhatiaLogin.data.csrf_token };

    const bhatiaLeads = await request(baseUrl, "/api/leads", bhatia);
    assert.equal(bhatiaLeads.response.status, 200);
    assert(bhatiaLeads.data.some(lead => lead.id === createdByAlex.data.id), "Bhatia must see the currently assigned lead");

    const bhatiaProtectedRoute = await request(baseUrl, `/api/leads/${encodeURIComponent(createdByAlex.data.id)}/pmrs`, bhatia);
    assert.equal(bhatiaProtectedRoute.response.status, 200, JSON.stringify(bhatiaProtectedRoute.data));

    console.log("PASS reassigned lead is isolated to its current salesman");
  } finally {
    await new Promise(resolve => server.close(resolve));
    if (originalDb) fs.writeFileSync(dbPath, originalDb);
    else fs.rmSync(dbPath, { force: true });
  }
})().catch(error => {
  server.close(() => {});
  if (originalDb) fs.writeFileSync(dbPath, originalDb);
  else fs.rmSync(dbPath, { force: true });
  throw error;
});
