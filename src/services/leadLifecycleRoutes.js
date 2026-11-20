const life = require("./leadLifecycleService");

async function handleLeadLifecycle(req, res, url, context) {
  const { db, user, supabaseEnabled, rest, readBody, sendJson, writeDb, verifyAdminPassword, leadBelongsToUser } = context;
  const rpc = (name, body) => rest(`rpc/${name}`, { method: "POST", token: user.token, body });
  const leadAction = url.pathname.match(/^\/api\/leads\/([^/]+)\/(close|archive|restore|purge|lifecycle-audit)$/);
  const reviewAction = url.pathname.match(/^\/api\/lead-duplicate-reviews\/([^/]+)\/(approve|reject|restore)$/);
  const deletionRequest = url.pathname.match(/^\/api\/leads\/([^/]+)\/request-deletion$/);
  const archiveDecision = url.pathname.match(/^\/api\/lead-archive-requests\/([^/]+)\/decide$/);
  if (!["/api/archived-leads", "/api/lead-duplicate-check", "/api/lead-duplicate-reviews", "/api/lead-lifecycle-notices", "/api/lead-lifecycle-audit", "/api/lead-archive-requests", "/api/lead-restore-requests"].includes(url.pathname)
    && !leadAction && !reviewAction && !deletionRequest && !archiveDecision) return false;
  const adminOnly = ["/api/archived-leads", "/api/lead-lifecycle-audit"].includes(url.pathname) || archiveDecision || reviewAction || leadAction && leadAction[2] !== "close"
    || req.method === "GET" && url.pathname === "/api/lead-duplicate-reviews";
  if (adminOnly && user.role !== "admin") throw life.failure(403, "Admin access required.");
  const getLead = async id => supabaseEnabled
    ? (await rest(`leads?id=eq.${encodeURIComponent(id)}&select=*`, { token: user.token }))[0]
    : db.leads.find(item => item.id === id);
  const body = req.method === "POST" || req.method === "PATCH" ? await readBody(req) : {};
  let result;
  if (url.pathname === "/api/lead-archive-requests" && req.method === "GET") {
    if (supabaseEnabled) result = user.role === "admin"
      ? await rest("lead_archive_requests?select=*&order=created_at.desc&limit=200",{token:user.token}) : await rpc("my_lead_archive_requests",{});
    else result = user.role === "admin" ? db.lead_archive_requests || [] : (db.lead_archive_requests || []).filter(row=>row.requested_by===user.id)
      .map(({candidate_ids,request_key,lead_id,...row})=>({...row,lead_id:db.leads.some(lead=>lead.id===lead_id && leadBelongsToUser(lead,user))?lead_id:null}));
  } else if ((deletionRequest || url.pathname === "/api/lead-restore-requests") && req.method === "POST") {
    if (user.role !== "salesman") throw life.failure(403,"Salesman access required to request management review.");
    const kind=deletionRequest?"archive":"restore";
    const input={...body,lead_id:deletionRequest?.[1] || null};
    if (deletionRequest) {
      const lead=await getLead(input.lead_id);
      if (!lead || !leadBelongsToUser(lead,user) || life.archived(lead)) throw life.failure(404,"Lead not found.");
    }
    result=supabaseEnabled ? await rpc("request_lead_archive_review",{p_kind:kind,p_lead:input.lead_id,p_identity:body,p_reason:body.reason,p_note:body.note})
      : life.requestArchiveReview(db,user,kind,input);
    if (!supabaseEnabled) writeDb(db);
  } else if (archiveDecision && req.method === "POST") {
    if (typeof body.approve!=="boolean") throw life.failure(400,"Choose an approval or rejection decision.");
    result=supabaseEnabled ? await rpc("review_lead_archive_request",{p_id:archiveDecision[1],p_approve:body.approve,p_target:body.lead_id || null,p_reason:body.reason})
      : life.reviewArchiveRequest(db,user,archiveDecision[1],body);
    if (!supabaseEnabled) writeDb(db);
  } else if (url.pathname === "/api/lead-lifecycle-audit" && req.method === "GET") {
    result = supabaseEnabled ? await rest("lead_lifecycle_events?select=*&order=at.desc&limit=200", { token: user.token }) : (db.lead_lifecycle_events || []).slice(0,200);
  } else if (url.pathname === "/api/archived-leads" && req.method === "GET") {
    const rows = supabaseEnabled ? [] : db.leads.filter(life.archived);
    if (supabaseEnabled) for (let offset=0; ;offset+=250) {
      const page=await rest(`leads?is_archived=eq.true&select=*&order=archived_at.desc,id.asc&limit=250&offset=${offset}`,{token:user.token});
      rows.push(...page); if(page.length<250) break;
    }
    const search = String(url.searchParams.get("search") || "").toLowerCase();
    const owner = url.searchParams.get("owner"), status = url.searchParams.get("status");
    result = rows.filter(lead => (!owner || lead.assigned_to === owner) && (!status || (lead.stage || lead.lead_status) === status)
      && (!search || [lead.company_name, lead.contact_person || lead.contact_name, lead.phone, lead.email || lead.contact_email,
        lead.assigned_salesman, lead.archive_reason].some(value => String(value || "").toLowerCase().includes(search))));
  } else if (url.pathname === "/api/lead-duplicate-check" && req.method === "POST") {
    if (body.exclude_id) {
      const existing = await getLead(body.exclude_id);
      if (!existing || !leadBelongsToUser(existing, user)) throw life.failure(404, "Lead not found.");
    }
    result = supabaseEnabled ? await rpc("check_lead_duplicates", { p_input: body, p_exclude: body.exclude_id || null })
      : { matches: life.matches(db.leads, body, body.exclude_id).map(lead => life.publicMatch(lead, user)),
        approved: (db.lead_duplicate_reviews || []).some(row => row.requested_by === user.id && row.status === "approved" && !row.used_at
          && Date.parse(row.expires_at) > Date.now() && row.signature === life.signature(db.leads, body, body.exclude_id)) };
  } else if (url.pathname === "/api/lead-duplicate-reviews" && req.method === "GET") {
    result = supabaseEnabled ? await rest("lead_duplicate_reviews?select=*&order=created_at.desc&limit=200", { token: user.token }) : db.lead_duplicate_reviews || [];
  } else if (url.pathname === "/api/lead-duplicate-reviews" && req.method === "POST") {
    const reason = String(body.note || "").trim();
    if (!reason || reason.length > 2000) throw life.failure(400, "Enter a review note (up to 2000 characters).");
    if (body.exclude_id) {
      const existing = await getLead(body.exclude_id);
      if (!existing || !leadBelongsToUser(existing, user)) throw life.failure(404, "Lead not found.");
    }
    if (supabaseEnabled) result = await rpc("request_lead_duplicate_review", { p_input: body, p_exclude: body.exclude_id || null, p_note: reason, p_override: body.override === true });
    else {
      const found = life.matches(db.leads, body, body.exclude_id);
      if (!found.length) throw life.failure(409, "No matching lead remains. Check again.");
      if (body.override && user.role !== "admin" && !found.every(lead => life.publicMatch(lead,user).self_owned)) throw life.failure(403, "Only Admin can override an archived or other-owner duplicate warning.");
      const row = { id: require("node:crypto").randomUUID(), requested_by: user.id, requested_by_name: user.name || user.email,
        company_name: String(body.company_name || "").trim(), input: life.identity(body), exclude_id: body.exclude_id || "",
        matched_lead_ids: found.map(lead => lead.id), signature: life.signature(db.leads, body, body.exclude_id), note: reason,
        status: body.override ? "approved" : "pending", created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 86400000).toISOString() };
      (db.lead_duplicate_reviews ||= []).unshift(row);
      life.event(db, user, body.override ? "duplicate_override" : "duplicate_review_requested", found[0], reason, { review_id: row.id });
      if (!body.override) life.notify(db, db.users.filter(person => person.role === "admin"), "duplicate_review", "Duplicate lead review", `${row.requested_by_name}: ${row.company_name}. ${reason}`);
      writeDb(db);
      result = { id: row.id, status: row.status };
    }
  } else if (reviewAction && req.method === "POST") {
    const reason = String(body.reason || "").trim();
    if (!reason || reason.length > 2000) throw life.failure(400, "Enter a decision reason.");
    if (supabaseEnabled) result = reviewAction[2] === "restore"
      ? await rpc("restore_lead_duplicate_review", {p_review:reviewAction[1],p_lead:body.lead_id,p_reason:reason})
      : await rpc("decide_lead_duplicate_review", { p_id: reviewAction[1], p_approve: reviewAction[2] === "approve", p_reason: reason });
    else {
      const row = (db.lead_duplicate_reviews || []).find(item => item.id === reviewAction[1]);
      if (!row || row.status !== "pending") throw life.failure(409, "This review is no longer pending.");
      if (reviewAction[2] === "restore") {
        const lead = db.leads.find(item=>item.id===body.lead_id);
        if (!lead || !row.matched_lead_ids.includes(lead.id)) throw life.failure(400,"Choose a matching archived lead.");
        life.localLifecycle(db,user,lead,"restore",{reason});
      }
      Object.assign(row, { status: reviewAction[2] === "approve" ? "approved" : "rejected", decided_by: user.id, decided_at: new Date().toISOString(), decision_reason: reason, expires_at: new Date(Date.now()+86400000).toISOString() });
      life.event(db, user, reviewAction[2] === "restore" ? "duplicate_review_restored" : `duplicate_review_${row.status}`, { id: row.matched_lead_ids[0], company_name: row.company_name }, reason, { review_id: row.id });
      life.notify(db, db.users.filter(person => person.id === row.requested_by), "duplicate_review", "Duplicate review decision", `${row.company_name}: ${row.status}. ${reason}`);
      writeDb(db);
      result = { id: row.id, status: row.status };
    }
  } else if (leadAction && req.method === "GET" && leadAction[2] === "lifecycle-audit") {
    result = supabaseEnabled ? await rest(`lead_lifecycle_events?lead_id=eq.${encodeURIComponent(leadAction[1])}&select=*&order=at.desc`, { token: user.token })
      : (db.lead_lifecycle_events || []).filter(row => row.lead_id === leadAction[1]);
  } else if (leadAction && req.method === "POST" && leadAction[2] !== "lifecycle-audit") {
    const [, id, action] = leadAction;
    if (action === "close" && !["admin", "salesman"].includes(user.role)) throw life.failure(403, "Admin or Salesman access required.");
    const lead = await getLead(id);
    if (!lead || !leadBelongsToUser(lead, user)) throw life.failure(404, "Lead not found.");
    if (action === "purge" && !await verifyAdminPassword(user, body.admin_password, supabaseEnabled)) throw life.failure(403, "Admin password confirmation is required.");
    result = supabaseEnabled ? await rpc("change_lead_lifecycle", { p_id: id, p_action: action, p_input: body }) : life.localLifecycle(db, user, lead, action, body);
    if (!supabaseEnabled) writeDb(db);
    if (user.role !== "admin") result = { ok: true, archived: true };
  } else if (url.pathname === "/api/lead-lifecycle-notices" && req.method === "PATCH") {
    if (!/^[\w-]{1,100}$/.test(body.id || "")) throw life.failure(400,"Choose a notification.");
    if (supabaseEnabled) await rest(`notifications?id=eq.${encodeURIComponent(body.id)}&recipient_uid=eq.${encodeURIComponent(user.id)}&type=in.(lead_closed,duplicate_review,lead_lifecycle_request)`, { method:"PATCH", token:user.token, body:{status:"dismissed"} });
    else { const notice=(db.notifications || []).find(row=>row.id===body.id && row.recipient_uid===user.id && ["lead_closed","duplicate_review","lead_lifecycle_request"].includes(row.type)); if (notice) notice.status="dismissed"; writeDb(db); }
    result={ok:true};
  } else if (url.pathname === "/api/lead-lifecycle-notices" && req.method === "GET") {
    result = supabaseEnabled ? await rest(`notifications?recipient_uid=eq.${encodeURIComponent(user.id)}&type=in.(lead_closed,duplicate_review,lead_lifecycle_request)&status=eq.pending&select=id,title,message,type,created_at&order=created_at.desc&limit=30`, { token: user.token })
      : (db.notifications || []).filter(row => row.recipient_uid === user.id && ["lead_closed", "duplicate_review", "lead_lifecycle_request"].includes(row.type) && row.status === "pending").map(({ id, title, message, type,created_at }) => ({ id, title, message,type,created_at }));
  } else throw life.failure(405, "Method not allowed.");
  sendJson(res, 200, result);
  return true;
}
module.exports = { handleLeadLifecycle };
