const state = {
  leads: [],
  settings: { stages: [], priorities: [], territories: [], salesmen: [] },
  selectedId: null,
  filters: { search: "", stage: "all", salesman: "all" },
  currentUser: null
};

const els = {
  authScreen: document.querySelector("#authScreen"),
  appShell: document.querySelector("#appShell"),
  loginForm: document.querySelector("#loginForm"),
  loginMessage: document.querySelector("#loginMessage"),
  signedInUser: document.querySelector("#signedInUser"),
  logoutButton: document.querySelector("#logoutButton"),
  openSalesmanForm: document.querySelector("#openSalesmanForm"),
  salesmanDialog: document.querySelector("#salesmanDialog"),
  salesmanForm: document.querySelector("#salesmanForm"),
  salesmanMessage: document.querySelector("#salesmanMessage"),
  placesDialog: document.querySelector("#placesDialog"),
  placesForm: document.querySelector("#placesForm"),
  placesMessage: document.querySelector("#placesMessage"),
  placesResults: document.querySelector("#placesResults"),
  leadList: document.querySelector("#leadList"),
  detailPanel: document.querySelector("#detailPanel"),
  leadCount: document.querySelector("#leadCount"),
  searchInput: document.querySelector("#searchInput"),
  stageFilter: document.querySelector("#stageFilter"),
  salesmanFilter: document.querySelector("#salesmanFilter"),
  metricTotal: document.querySelector("#metricTotal"),
  metricValue: document.querySelector("#metricValue"),
  metricHot: document.querySelector("#metricHot"),
  metricDue: document.querySelector("#metricDue"),
  leadDialog: document.querySelector("#leadDialog"),
  leadForm: document.querySelector("#leadForm"),
  formSalesman: document.querySelector("#formSalesman"),
  formStage: document.querySelector("#formStage"),
  formPriority: document.querySelector("#formPriority")
};

const SESSION_KEY = "arg_crm_session";

const money = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
  maximumFractionDigits: 0
});

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = sessionStorage.getItem(SESSION_KEY);
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && typeof options.body === "string" && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(path, {
    ...options,
    headers
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Request failed: ${response.status}`);
  return result;
}

async function transcribeRecording(blob) {
  const token = sessionStorage.getItem(SESSION_KEY);
  const response = await fetch("/api/transcriptions", {
    method: "POST",
    headers: {
      "Content-Type": blob.type || "audio/webm",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: blob
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Transcription failed: ${response.status}`);
  return String(result.text || "").trim();
}

let activeRecorder = null;

function recorderMimeType() {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return types.find(type => window.MediaRecorder?.isTypeSupported?.(type)) || "";
}

async function toggleVoiceRecording({ button, status, target }) {
  if (activeRecorder) {
    if (activeRecorder.button !== button) {
      status.textContent = "Finish the current voice note first.";
      return;
    }
    activeRecorder.recorder.stop();
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    status.textContent = "Voice recording is not supported in this browser.";
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks = [];
    const mimeType = recorderMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const timeout = setTimeout(() => recorder.state === "recording" && recorder.stop(), 120_000);
    activeRecorder = { recorder, stream, chunks, button, status, target, timeout };
    button.textContent = "Stop Recording";
    button.classList.add("recording");
    status.textContent = "Recording voice note...";

    recorder.addEventListener("dataavailable", event => {
      if (event.data.size) chunks.push(event.data);
    });
    recorder.addEventListener("stop", async () => {
      const current = activeRecorder;
      activeRecorder = null;
      clearTimeout(current.timeout);
      current.stream.getTracks().forEach(track => track.stop());
      current.button.textContent = "Record Voice Note";
      current.button.classList.remove("recording");
      current.status.textContent = "Transcribing voice note...";
      try {
        const transcript = await transcribeRecording(new Blob(current.chunks, { type: recorder.mimeType || "audio/webm" }));
        if (!transcript) throw new Error("No speech was detected. Please record again.");
        current.target.value = [current.target.value.trim(), transcript].filter(Boolean).join(current.target.value.trim() ? "\n" : "");
        current.target.dispatchEvent(new Event("input", { bubbles: true }));
        current.status.textContent = "Transcript added. You can edit it before saving.";
      } catch (error) {
        current.status.textContent = error.message;
      }
    });
    recorder.start();
  } catch (error) {
    status.textContent = error.name === "NotAllowedError"
      ? "Microphone permission was denied. Allow microphone access and try again."
      : `Could not start recording: ${error.message}`;
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setMessage(element, message, type = "") {
  element.textContent = message;
  element.classList.toggle("success", type === "success");
  element.classList.toggle("error", type === "error");
}

function fillSelect(select, values, firstLabel) {
  select.innerHTML = firstLabel ? `<option value="all">${firstLabel}</option>` : "";
  values.forEach(value => {
    const option = document.createElement("option");
    option.value = typeof value === "string" ? value : value.name;
    option.textContent = typeof value === "string" ? value : value.name;
    select.appendChild(option);
  });
}

function filteredLeads() {
  const query = state.filters.search.trim().toLowerCase();
  return state.leads.filter(lead => {
    const text = [
      lead.company_name,
      lead.contact_person,
      lead.product_interest,
      lead.territory,
      lead.assigned_salesman,
      lead.stage
    ].join(" ").toLowerCase();
    const matchesQuery = !query || text.includes(query);
    const matchesStage = state.filters.stage === "all" || lead.stage === state.filters.stage;
    const matchesSalesman = state.filters.salesman === "all" || lead.assigned_salesman === state.filters.salesman;
    return matchesQuery && matchesStage && matchesSalesman;
  });
}

function priorityClass(priority) {
  return String(priority || "").toLowerCase().replace(/\s+/g, "-");
}

function renderMetrics() {
  const due = state.leads.filter(lead => lead.next_action_date <= today() && lead.stage !== "Won").length;
  const openValue = state.leads
    .filter(lead => lead.stage !== "Won")
    .reduce((sum, lead) => sum + Number(lead.estimated_value || 0), 0);
  els.metricTotal.textContent = state.leads.length;
  els.metricValue.textContent = money.format(openValue);
  els.metricHot.textContent = state.leads.filter(lead => lead.priority === "Hot").length;
  els.metricDue.textContent = due;
}

function renderLeadList() {
  const leads = filteredLeads();
  els.leadCount.textContent = `${leads.length} record${leads.length === 1 ? "" : "s"}`;
  els.leadList.innerHTML = leads.map(lead => `
    <button class="lead-card ${lead.id === state.selectedId ? "active" : ""}" data-lead-id="${escapeHtml(lead.id)}">
      <div class="lead-title">
        <strong>${escapeHtml(lead.company_name)}</strong>
        <span class="chip ${priorityClass(lead.priority)}">${escapeHtml(lead.priority)}</span>
      </div>
      <p>${escapeHtml(lead.product_interest)}</p>
      <div class="chip-row">
        <span class="chip ${priorityClass(lead.stage)}">${escapeHtml(lead.stage)}</span>
        <span class="chip">${escapeHtml(lead.territory)}</span>
        <span class="chip">${escapeHtml(lead.assigned_salesman)}</span>
      </div>
    </button>
  `).join("");

  document.querySelectorAll(".lead-card").forEach(card => {
    card.addEventListener("click", () => {
      state.selectedId = card.dataset.leadId;
      render();
    });
  });
}

function renderDetail() {
  const lead = state.leads.find(item => item.id === state.selectedId);
  if (!lead) {
    els.detailPanel.innerHTML = `
      <div class="empty-state">
        <strong>Select a lead</strong>
        <span>Open any record to view details, update stage, and log activity.</span>
      </div>
    `;
    return;
  }

  const stageOptions = state.settings.stages.map(stage =>
    `<option value="${escapeHtml(stage)}" ${stage === lead.stage ? "selected" : ""}>${escapeHtml(stage)}</option>`
  ).join("");
  const activities = (lead.activities || []).map(activity => `
    <div class="activity-item">
      <span class="meta-label">${escapeHtml(activity.at)} - ${escapeHtml(activity.type)}</span>
      <p>${escapeHtml(activity.text)}</p>
    </div>
  `).join("");

  els.detailPanel.innerHTML = `
    <div class="detail-body">
      <div class="detail-heading">
        <div>
          <h2>${escapeHtml(lead.company_name)}</h2>
          <p>${escapeHtml(lead.notes || "No notes added yet.")}</p>
        </div>
        <span class="chip ${priorityClass(lead.priority)}">${escapeHtml(lead.priority)}</span>
      </div>

      <div class="meta-grid">
        <div class="meta-box"><span class="meta-label">Contact</span><span class="meta-value">${escapeHtml(lead.contact_person)}</span></div>
        <div class="meta-box"><span class="meta-label">Phone</span><span class="meta-value">${escapeHtml(lead.phone)}</span></div>
        <div class="meta-box"><span class="meta-label">Email</span><span class="meta-value">${escapeHtml(lead.email)}</span></div>
        <div class="meta-box"><span class="meta-label">Industry</span><span class="meta-value">${escapeHtml(lead.industry || "Not added")}</span></div>
        <div class="meta-box"><span class="meta-label">Website</span><span class="meta-value">${escapeHtml(lead.website || "Not added")}</span></div>
        <div class="meta-box"><span class="meta-label">Enrichment</span><span class="meta-value">${escapeHtml(lead.enrichment_status || "pending")}</span></div>
        <div class="meta-box"><span class="meta-label">Estimated value</span><span class="meta-value">${money.format(lead.estimated_value || 0)}</span></div>
        <div class="meta-box"><span class="meta-label">Next action</span><span class="meta-value">${escapeHtml(lead.next_action)}</span></div>
        <div class="meta-box"><span class="meta-label">Due date</span><span class="meta-value">${escapeHtml(lead.next_action_date)}</span></div>
      </div>

      <div class="detail-actions">
        <button class="ghost-button" id="enrichLead" type="button">Enrich with Hunter</button>
        <button class="ghost-button" id="deleteLead" type="button">Delete Lead</button>
        <span class="form-message" id="detailMessage" aria-live="polite"></span>
      </div>

      <div class="stage-actions">
        <select id="detailStage">${stageOptions}</select>
        <button class="primary-button" id="saveStage">Update Stage</button>
      </div>

      <div class="quick-note">
        <input id="activityText" placeholder="Log a call, visit, email, or follow-up note">
        <div class="quick-note-actions">
          <button class="voice-button" id="recordActivityVoice" type="button">Record Voice Note</button>
          <button class="ghost-button" id="saveActivity">Add Activity</button>
        </div>
        <span class="voice-status" id="activityVoiceStatus" aria-live="polite"></span>
      </div>

      <section>
        <h2>Activity Timeline</h2>
        <div class="activity-list">${activities || "<p>No activity yet.</p>"}</div>
      </section>
    </div>
  `;

  document.querySelector("#saveStage").addEventListener("click", async () => {
    const stage = document.querySelector("#detailStage").value;
    await api(`/api/leads/${lead.id}/stage`, { method: "PATCH", body: JSON.stringify({ stage }) });
    await loadLeads();
  });

  document.querySelector("#saveActivity").addEventListener("click", async () => {
    const input = document.querySelector("#activityText");
    if (!input.value.trim()) return;
    await api(`/api/leads/${lead.id}/activities`, {
      method: "POST",
      body: JSON.stringify({ type: "Note", text: input.value.trim() })
    });
    input.value = "";
    await loadLeads();
  });

  document.querySelector("#recordActivityVoice").addEventListener("click", () => {
    toggleVoiceRecording({
      button: document.querySelector("#recordActivityVoice"),
      status: document.querySelector("#activityVoiceStatus"),
      target: document.querySelector("#activityText")
    });
  });

  document.querySelector("#enrichLead").addEventListener("click", async () => {
    const message = document.querySelector("#detailMessage");
    setMessage(message, "Searching Hunter...");
    try {
      const result = await api(`/api/leads/${lead.id}/enrich`, { method: "POST" });
      setMessage(message, result.emails.length ? `Hunter found ${result.emails.length} email suggestion(s).` : "Hunter completed with no email suggestions.", "success");
      await loadLeads();
    } catch (error) {
      setMessage(message, error.message, "error");
    }
  });

  document.querySelector("#deleteLead").addEventListener("click", async () => {
    if (!window.confirm(`Delete ${lead.company_name}?`)) return;
    const message = document.querySelector("#detailMessage");
    setMessage(message, "Deleting lead...");
    try {
      await api(`/api/leads/${lead.id}`, { method: "DELETE" });
      state.selectedId = null;
      await loadLeads();
    } catch (error) {
      setMessage(message, error.message, "error");
    }
  });
}

function render() {
  renderMetrics();
  renderLeadList();
  renderDetail();
}

async function loadLeads() {
  state.leads = await api("/api/leads");
  if (!state.selectedId && state.leads.length) state.selectedId = state.leads[0].id;
  render();
}

function showLogin(message = "") {
  state.currentUser = null;
  els.loginMessage.textContent = message;
  els.authScreen.classList.remove("hidden");
  els.appShell.classList.add("hidden");
}

function showApp(user) {
  state.currentUser = user;
  els.signedInUser.textContent = `${user.name} · ${user.role}`;
  els.openSalesmanForm.classList.toggle("hidden", user.role !== "admin");
  els.authScreen.classList.add("hidden");
  els.appShell.classList.remove("hidden");
}

async function loadWorkspace() {
  state.settings = await api("/api/settings");
  fillSelect(els.stageFilter, state.settings.stages, "All stages");
  fillSelect(els.salesmanFilter, state.settings.salesmen, "All salesmen");
  fillSelect(els.formSalesman, state.settings.salesmen);
  fillSelect(els.formStage, state.settings.stages);
  fillSelect(els.formPriority, state.settings.priorities);
  els.leadForm.elements.next_action_date.value = today();
  await loadLeads();
}

async function init() {
  if (!sessionStorage.getItem(SESSION_KEY)) {
    showLogin();
    return;
  }

  try {
    const result = await api("/api/auth/me");
    showApp(result.user);
    await loadWorkspace();
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    showLogin("Please sign in to continue.");
  }
}

els.searchInput.addEventListener("input", event => {
  state.filters.search = event.target.value;
  renderLeadList();
});

els.stageFilter.addEventListener("change", event => {
  state.filters.stage = event.target.value;
  renderLeadList();
});

els.salesmanFilter.addEventListener("change", event => {
  state.filters.salesman = event.target.value;
  renderLeadList();
});

document.querySelector("#openLeadForm").addEventListener("click", () => els.leadDialog.showModal());
document.querySelector("#closeLeadForm").addEventListener("click", () => els.leadDialog.close());
document.querySelector("#closeSalesmanForm").addEventListener("click", () => els.salesmanDialog.close());
document.querySelector("#openPlacesSearch").addEventListener("click", () => {
  setMessage(els.placesMessage, "");
  els.placesResults.innerHTML = "";
  els.placesDialog.showModal();
});
document.querySelector("#closePlacesSearch").addEventListener("click", () => els.placesDialog.close());

els.placesForm.addEventListener("submit", async event => {
  event.preventDefault();
  setMessage(els.placesMessage, "Searching Google Places...");
  els.placesResults.innerHTML = "";
  try {
    const result = await api("/api/places/search", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(new FormData(els.placesForm).entries()))
    });
    setMessage(els.placesMessage, result.matches.length ? `${result.matches.length} business match(es) found.` : "No matching businesses found.", result.matches.length ? "success" : "");
    els.placesResults.innerHTML = result.matches.map((place, index) => `
      <article class="place-result">
        <strong>${escapeHtml(place.company_name)}</strong>
        <p>${escapeHtml(place.address || "Address not provided")}</p>
        <p>${escapeHtml(place.phone || "Phone not provided")} ${place.google_rating ? ` · Rating ${escapeHtml(place.google_rating)} (${escapeHtml(place.google_review_count)} reviews)` : ""}</p>
        <button class="primary-button" type="button" data-place-index="${index}">Use Business</button>
      </article>
    `).join("");
    document.querySelectorAll("[data-place-index]").forEach(button => {
      button.addEventListener("click", () => {
        const place = result.matches[Number(button.dataset.placeIndex)];
        Object.entries(place).forEach(([key, value]) => {
          const field = els.leadForm.elements[key];
          if (field) field.value = value ?? "";
        });
        els.placesDialog.close();
        els.leadDialog.showModal();
      });
    });
  } catch (error) {
    setMessage(els.placesMessage, error.message, "error");
  }
});

els.loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  els.loginMessage.textContent = "Signing in...";

  try {
    const result = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(new FormData(els.loginForm).entries()))
    });
    sessionStorage.setItem(SESSION_KEY, result.token);
    els.loginForm.reset();
    showApp(result.user);
    await loadWorkspace();
  } catch (error) {
    els.loginMessage.textContent = error.message;
  }
});

els.logoutButton.addEventListener("click", async () => {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } finally {
    sessionStorage.removeItem(SESSION_KEY);
    showLogin();
  }
});

els.openSalesmanForm.addEventListener("click", () => {
  els.salesmanMessage.textContent = "";
  els.salesmanDialog.showModal();
});

els.salesmanForm.addEventListener("submit", async event => {
  event.preventDefault();
  els.salesmanMessage.textContent = "Creating account...";

  try {
    await api("/api/users", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(new FormData(els.salesmanForm).entries()))
    });
    els.salesmanMessage.textContent = "Salesman account created.";
    els.salesmanForm.reset();
    await loadWorkspace();
  } catch (error) {
    els.salesmanMessage.textContent = error.message;
  }
});

document.querySelector("#recordLeadVoice").addEventListener("click", () => {
  toggleVoiceRecording({
    button: document.querySelector("#recordLeadVoice"),
    status: document.querySelector("#leadVoiceStatus"),
    target: els.leadForm.elements.notes
  });
});

els.leadForm.addEventListener("submit", async event => {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(els.leadForm).entries());
  payload.estimated_value = Number(payload.estimated_value || 0);
  const lead = await api("/api/leads", { method: "POST", body: JSON.stringify(payload) });
  state.selectedId = lead.id;
  els.leadForm.reset();
  els.leadForm.elements.next_action_date.value = today();
  els.leadDialog.close();
  await loadLeads();
});

document.querySelectorAll(".nav-item").forEach(item => {
  item.addEventListener("click", () => {
    document.querySelectorAll(`.nav-item[data-view="${item.dataset.view}"]`).forEach(active => active.classList.add("active"));
    document.querySelectorAll(`.nav-item:not([data-view="${item.dataset.view}"])`).forEach(inactive => inactive.classList.remove("active"));
  });
});

init().catch(error => {
  document.body.innerHTML = `<main class="empty-state"><strong>Could not load ARG CRM</strong><span>${escapeHtml(error.message)}</span></main>`;
});
