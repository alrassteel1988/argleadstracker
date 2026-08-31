const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const client = fs.readFileSync(path.join(root, "client.js"), "utf8");
const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");

assert.match(client, /const REFRESH_SESSION_KEY = "arg_crm_refresh_session"/, "refresh session must be stored separately from the access token");
assert.match(client, /function persistSession\(session = \{\}\)/, "login and refresh must persist the rotated session");
assert.match(client, /async function refreshAuthenticatedSession\(\)/, "expired access tokens must use the existing Supabase refresh mechanism");
assert.match(client, /async function authenticatedFetch\(path, options = \{\}\)/, "protected requests must share one authenticated request path");
assert.match(client, /credentials: "same-origin"/, "protected requests must preserve same-origin credentials");
assert.match(client, /response\.status === 401/, "401 responses must be handled explicitly");
assert.match(client, /await refreshAuthenticatedSession\(\)/, "a failed access token must refresh once before retrying");
assert.match(client, /showLogin\("Your session has expired\. Please sign in again\."\)/, "missing or expired sessions must enter a controlled reauthentication state");
assert.match(client, /async function loadLeads\(options = \{\}\)/, "lead loading must have an authentication-initialization gate");
assert.match(client, /if \(!options\.authInitialized\) await authInitialization;/, "lead loading must wait for authentication initialization");
assert.match(client, /state\.leads = await api\("\/api\/leads"\)/, "summary counts and rendered rows must share the authorized list response");
assert.match(client, /if \(\[401, 403\]\.includes\(Number\(error\?\.status\)\)\) state\.leads = \[\];/, "authorization failures must not leave stale lead rows rendered");
assert.match(client, /status: "failed",[\s\S]*Authentication is required before this change can sync\.[\s\S]*break;/, "outbox authentication failures must stop instead of retrying indefinitely");
assert.match(client, /syncOutbox\(\)\.catch\(handleOutboxSyncError\)/, "background outbox triggers must not create unhandled promise rejections");
assert.match(client, /Promise\.allSettled\(\[/, "stale or missing detail IDs must not prevent valid lead data from rendering");
assert.match(client, /response\.status === 401/, "401 handling must stay distinct from ordinary not-found request errors");
assert.match(server, /url\.pathname === "\/api\/auth\/refresh"/, "the API must expose a refresh route");
assert.match(server, /refreshSession\(refreshToken\)/, "the refresh route must exchange only the supplied refresh session");
assert.match(server, /req\.method === "GET" && leadDetailMatch/, "authorized lead-detail GET requests must be supported");
assert.match(server, /if \(!user\) return sendJson\(res, 401, \{ error: "Authentication required\." \}\);/, "protected APIs must remain authenticated");
assert.match(server, /leadBelongsToUser\(lead, user\)/, "salesman lead isolation must remain enforced");
assert.match(sw, /if \(url\.pathname\.startsWith\("\/api\/"\)\) return;/, "the service worker must not cache protected API responses");
assert.doesNotMatch(sw, /cache\.put\([^\n]*\/api\//, "protected API responses must never be placed in the application cache");

console.log("PASS sales lead summary authentication loading safeguards");
