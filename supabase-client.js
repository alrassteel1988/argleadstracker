const SUPABASE_URL = String(process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "pmr-voice-notes";
const SERVICE_ROLE_OPERATIONS = new Set([
  "auth.create_user",
  "auth.update_user",
  "auth.list_users",
  "cron.integration_logs",
  "cron.market_intelligence",
  "leads.server_validated_insert",
  "notifications.director_fanout",
  "profiles.admin_update",
  "security.rate_limits",
  "workflow.activity_managers",
  "lead_intelligence.worker"
]);

function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function isJwtKey(value) {
  return String(value || "").split(".").length === 3;
}

function isSupabaseAdminConfigured() {
  return isSupabaseConfigured() && Boolean(SUPABASE_SERVICE_ROLE_KEY) && isJwtKey(SUPABASE_SERVICE_ROLE_KEY);
}

function bearerToken(req) {
  const header = String(req.headers.authorization || "");
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

async function request(path, {
  method = "GET",
  body,
  token,
  service = false,
  serviceOperation = "",
  headers = {}
} = {}) {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured.");
  if (service && !SERVICE_ROLE_OPERATIONS.has(serviceOperation)) {
    throw new Error(`Supabase service-role operation is not allowlisted: ${serviceOperation || "missing operation"}.`);
  }
  const key = service ? SUPABASE_SERVICE_ROLE_KEY : SUPABASE_ANON_KEY;
  if (!key) throw new Error(service ? "SUPABASE_SERVICE_ROLE_KEY is not configured." : "Supabase publishable key is not configured.");
  if (!service && !token && !path.startsWith("/auth/v1/token")) {
    throw new Error("An authenticated Supabase user token is required.");
  }

  const response = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${token || key}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || data.msg || data.error_description || data.error || `Supabase request failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

function storageObjectUrl(objectPath, bucket = SUPABASE_STORAGE_BUCKET) {
  return `/storage/v1/object/${encodeURIComponent(bucket)}/${String(objectPath || "")
    .split("/")
    .map(part => encodeURIComponent(part))
    .join("/")}`;
}

function requireUserToken(token) {
  const value = String(token || "").trim();
  if (!value) throw new Error("An authenticated Supabase user token is required for Storage.");
  return value;
}

async function uploadStorageObjectToBucket(bucket, objectPath, content, contentType = "application/octet-stream", token) {
  const userToken = requireUserToken(token);
  const response = await fetch(`${SUPABASE_URL}${storageObjectUrl(objectPath, bucket)}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${userToken}`,
      "Content-Type": contentType,
      "x-upsert": "false"
    },
    body: content
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || data.error || `Supabase Storage upload failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

async function uploadStorageObject(objectPath, content, contentType = "application/octet-stream", token) {
  return uploadStorageObjectToBucket(SUPABASE_STORAGE_BUCKET, objectPath, content, contentType, token);
}

async function createStorageSignedUrlForBucket(bucket, objectPath, expiresIn = 3600, token) {
  const userToken = requireUserToken(token);
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${String(objectPath || "")
    .split("/")
    .map(part => encodeURIComponent(part))
    .join("/")}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${userToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ expiresIn })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || data.error || `Supabase Storage signed URL failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }
  const signedUrl = data.signedURL || data.signedUrl || "";
  return signedUrl.startsWith("http") ? signedUrl : `${SUPABASE_URL}${signedUrl}`;
}

async function createStorageSignedUrl(objectPath, expiresIn = 3600, token) {
  return createStorageSignedUrlForBucket(SUPABASE_STORAGE_BUCKET, objectPath, expiresIn, token);
}


async function uploadStorageObjectToBucketAsService(bucket, objectPath, content, contentType = "application/octet-stream") {
  const response = await fetch(`${SUPABASE_URL}${storageObjectUrl(objectPath, bucket)}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": contentType,
      "x-upsert": "false"
    },
    body: content
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || data.error || `Supabase Storage service upload failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

async function createStorageSignedUrlForBucketAsService(bucket, objectPath, expiresIn = 3600) {
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${String(objectPath || "")
    .split("/")
    .map(part => encodeURIComponent(part))
    .join("/")}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ expiresIn })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || data.error || `Supabase Storage service signed URL failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }
  const signedUrl = data.signedURL || data.signedUrl || "";
  return signedUrl.startsWith("http") ? signedUrl : `${SUPABASE_URL}${signedUrl}`;
}
async function signIn(email, password) {
  return request("/auth/v1/token?grant_type=password", { method: "POST", body: { email, password } });
}

async function signOut(token) {
  return request("/auth/v1/logout", { method: "POST", token });
}

async function getAuthUser(token) {
  return request("/auth/v1/user", { token });
}

async function createAuthUser({ email, password, name, territory, role = "salesman" }) {
  return request("/auth/v1/admin/users", {
    method: "POST",
    service: true,
    serviceOperation: "auth.create_user",
    body: {
      email,
      password,
      email_confirm: true,
      app_metadata: { role },
      user_metadata: { name, territory }
    }
  });
}

async function updateAuthUser(id, attributes = {}) {
  return request(`/auth/v1/admin/users/${encodeURIComponent(id)}`, {
    method: "PUT",
    service: true,
    serviceOperation: "auth.update_user",
    body: attributes
  });
}

async function listAuthUsers(page = 1, perPage = 1000) {
  return request(`/auth/v1/admin/users?page=${page}&per_page=${perPage}`, {
    service: true,
    serviceOperation: "auth.list_users"
  });
}

async function rest(path, options = {}) {
  return request(`/rest/v1/${path}`, options);
}

async function serviceRest(operation, path, options = {}) {
  if (!SERVICE_ROLE_OPERATIONS.has(operation)) {
    throw new Error(`Supabase service-role operation is not allowlisted: ${operation || "missing operation"}.`);
  }
  return rest(path, {
    ...options,
    service: true,
    serviceOperation: operation
  });
}

async function getProfile(token, id) {
  const profiles = await rest(`profiles?id=eq.${encodeURIComponent(id)}&select=*`, { token });
  return profiles[0] || null;
}

async function currentSupabaseUser(req) {
  const token = bearerToken(req);
  if (!token) return null;
  try {
    const authUser = await getAuthUser(token);
    const profile = await getProfile(token, authUser.id);
    if (!profile || profile.status !== "active") return null;
    return {
      id: authUser.id,
      email: authUser.email,
      name: profile.full_name || authUser.email,
      role: profile.role,
      territory: profile.territory,
      status: profile.status,
      token
    };
  } catch {
    return null;
  }
}

module.exports = {
  bearerToken,
  createAuthUser,
  createStorageSignedUrl,
  createStorageSignedUrlForBucket,
  createStorageSignedUrlForBucketAsService,
  currentSupabaseUser,
  isSupabaseAdminConfigured,
  isSupabaseConfigured,
  listAuthUsers,
  rest,
  serviceRest,
  signIn,
  signOut,
  updateAuthUser,
  uploadStorageObject,
  uploadStorageObjectToBucket,
  uploadStorageObjectToBucketAsService
};
