const ACTIVITY_FILTER_KEY = "arg_activity_filters";
const OVERDUE_BANNER_KEY = "arg_overdue_banner_dismissed";
const ACTIVITY_PRESETS = ["Today", "This Week", "This Month", "Last 30 Days", "Last 90 Days"];
const ACTIVITY_TYPE_ICONS = {
  "Note": "TXT",
  "Phone Call": "TEL",
  "Email": "@",
  "In-Person Meeting": "MEET",
  "Site Visit": "PIN",
  "Video Call": "VID",
  "Quotation Sent": "QUOTE",
  "Order Placed": "AED",
  "Reminder": "!"
};

const LOST_REASON_LABELS = {
  price: "Price - competitor offered lower price",
  no_budget: "No Budget - project cancelled or deferred",
  competitor_relationship: "Competitor Relationship - existing supplier preferred",
  lead_time: "Lead Time - couldn't meet delivery timeline",
  product_mismatch: "Product Mismatch - we don't stock required specs",
  no_response: "No Response - contact went silent",
  project_cancelled: "Project Cancelled - end client cancelled project",
  credit_terms: "Credit Terms - payment terms not acceptable",
  quality_concerns: "Quality Concerns - MTC/grade requirements not met",
  other: "Other"
};

const state = {
  leads: [],
  settings: { stages: [], priorities: [], territories: [], salesmen: [] },
  selectedId: null,
  filters: { search: "", stage: "all", salesman: "all", priority: "all", territory: "all" },
  overduePipelineOnly: false,
  performanceStage: "all",
  portfolioFilters: { reportView: "stage", stage: "all", country: "all", emirate: "all" },
  pipelineViewMode: localStorage.getItem("arg_pipeline_view_mode") || "list",
  kanbanStage: localStorage.getItem("arg_kanban_stage") || "PROSPECT",
  draggedLeadId: "",
  activities: [],
  activityLoading: false,
  activityFiltersOpen: false,
  activityFilters: loadActivityFilters(),
  leadDrawerOpen: false,
  leadDrawerTab: "overview",
  leadDrawerLoading: false,
  leadDrawerPmrs: [],
  editingLeadId: "",
  editingOriginalStage: "",
  editingLostData: null,
  lostReasonRequest: null,
  currentUser: null
};

const els = {
  authScreen: document.querySelector("#authScreen"),
  appShell: document.querySelector("#appShell"),
  mobileMenuToggle: document.querySelector("#mobileMenuToggle"),
  menuBackdrop: document.querySelector("#menuBackdrop"),
  loginForm: document.querySelector("#loginForm"),
  loginMessage: document.querySelector("#loginMessage"),
  signedInUser: document.querySelector("#signedInUser"),
  logoutButton: document.querySelector("#logoutButton"),
  openSalesmanForm: document.querySelector("#openSalesmanForm"),
  exportLeadsExcel: document.querySelector("#exportLeadsExcel"),
  exportLeadsPdf: document.querySelector("#exportLeadsPdf"),
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
  priorityFilter: document.querySelector("#priorityFilter"),
  territoryFilter: document.querySelector("#territoryFilter"),
  metricTotal: document.querySelector("#metricTotal"),
  metricValue: document.querySelector("#metricValue"),
  metricHot: document.querySelector("#metricHot"),
  metricDue: document.querySelector("#metricDue"),
  metricsPanel: document.querySelector("#metricsPanel"),
  dashboardView: document.querySelector("#dashboardView"),
  salesmanFollowupPanel: document.querySelector("#salesmanFollowupPanel"),
  salesmanFollowupGroups: document.querySelector("#salesmanFollowupGroups"),
  portfolioPanel: document.querySelector("#portfolioPanel"),
  portfolioTotal: document.querySelector("#portfolioTotal"),
  portfolioActive: document.querySelector("#portfolioActive"),
  portfolioDormant: document.querySelector("#portfolioDormant"),
  portfolioHot: document.querySelector("#portfolioHot"),
  portfolioDue: document.querySelector("#portfolioDue"),
  portfolioOverdue: document.querySelector("#portfolioOverdue"),
  portfolioReportView: document.querySelector("#portfolioReportView"),
  portfolioStageFilter: document.querySelector("#portfolioStageFilter"),
  portfolioCountryFilter: document.querySelector("#portfolioCountryFilter"),
  portfolioEmirateFilter: document.querySelector("#portfolioEmirateFilter"),
  portfolioPie: document.querySelector("#portfolioPie"),
  portfolioLegend: document.querySelector("#portfolioLegend"),
  portfolioInsights: document.querySelector("#portfolioInsights"),
  performancePanel: document.querySelector("#performancePanel"),
  performanceStageFilter: document.querySelector("#performanceStageFilter"),
  performanceChart: document.querySelector("#performanceChart"),
  performanceTable: document.querySelector("#performanceTable"),
  kpiMostActive: document.querySelector("#kpiMostActive"),
  kpiHighestVolume: document.querySelector("#kpiHighestVolume"),
  kpiMostFollowups: document.querySelector("#kpiMostFollowups"),
  kpiLeastActive: document.querySelector("#kpiLeastActive"),
  lossReasonsPanel: document.querySelector("#lossReasonsPanel"),
  lossReasonsChart: document.querySelector("#lossReasonsChart"),
  relationshipFocusPanel: document.querySelector("#relationshipFocusPanel"),
  pipelineHealthPanel: document.querySelector("#pipelineHealthPanel"),
  dashboardFocus: document.querySelector("#dashboardFocus"),
  dashboardStatus: document.querySelector("#dashboardStatus"),
  pipelineToolbar: document.querySelector("#pipelineToolbar"),
  overdueBanner: document.querySelector("#overdueBanner"),
  overduePipelineFilter: document.querySelector("#overduePipelineFilter"),
  overduePipelineCount: document.querySelector("#overduePipelineCount"),
  clearOverdueFilter: document.querySelector("#clearOverdueFilter"),
  pipelineView: document.querySelector("#pipelineView"),
  pipelineListPanel: document.querySelector("#pipelineListPanel"),
  kanbanPanel: document.querySelector("#kanbanPanel"),
  kanbanSummary: document.querySelector("#kanbanSummary"),
  kanbanMobileStages: document.querySelector("#kanbanMobileStages"),
  kanbanBoard: document.querySelector("#kanbanBoard"),
  salesmenView: document.querySelector("#salesmenView"),
  salesmenGrid: document.querySelector("#salesmenGrid"),
  salesmenSummary: document.querySelector("#salesmenSummary"),
  activityView: document.querySelector("#activityView"),
  activityFeed: document.querySelector("#activityFeed"),
  activitySummary: document.querySelector("#activitySummary"),
  activityFilterToggle: document.querySelector("#activityFilterToggle"),
  activityFilterBar: document.querySelector("#activityFilterBar"),
  activitySalesmanFilter: document.querySelector("#activitySalesmanFilter"),
  activityTypePills: document.querySelector("#activityTypePills"),
  activityDatePresets: document.querySelector("#activityDatePresets"),
  activityDateFrom: document.querySelector("#activityDateFrom"),
  activityDateTo: document.querySelector("#activityDateTo"),
  activityCompanySearch: document.querySelector("#activityCompanySearch"),
  activitySearchClear: document.querySelector("#activitySearchClear"),
  activityResetFilters: document.querySelector("#activityResetFilters"),
  activityResultsSummary: document.querySelector("#activityResultsSummary"),
  activityLoading: document.querySelector("#activityLoading"),
  leadDrawerShell: document.querySelector("#leadDrawerShell"),
  leadDrawerBackdrop: document.querySelector("#leadDrawerBackdrop"),
  leadDrawerContent: document.querySelector("#leadDrawerContent"),
  leadDialog: document.querySelector("#leadDialog"),
  leadForm: document.querySelector("#leadForm"),
  formSalesman: document.querySelector("#formSalesman"),
  formStage: document.querySelector("#formStage"),
  formPriority: document.querySelector("#formPriority"),
  formSector: document.querySelector("#formSector"),
  formTier: document.querySelector("#formTier"),
  leadEnrichmentStatus: document.querySelector("#leadEnrichmentStatus"),
  pmrDialog: document.querySelector("#pmrDialog"),
  pmrForm: document.querySelector("#pmrForm"),
  pmrMessage: document.querySelector("#pmrMessage"),
  recordPmrVoice: document.querySelector("#recordPmrVoice"),
  deletePmrVoice: document.querySelector("#deletePmrVoice"),
  pmrVoicePreview: document.querySelector("#pmrVoicePreview"),
  pmrVoiceStatus: document.querySelector("#pmrVoiceStatus"),
  pmrTranscriptLabel: document.querySelector("#pmrTranscriptLabel"),
  activityEditDialog: document.querySelector("#activityEditDialog"),
  activityEditForm: document.querySelector("#activityEditForm"),
  activityEditMessage: document.querySelector("#activityEditMessage"),
  activityEditReminderFields: document.querySelector("#activityEditReminderFields"),
  lostReasonDialog: document.querySelector("#lostReasonDialog"),
  lostReasonForm: document.querySelector("#lostReasonForm"),
  lostReasonLeadName: document.querySelector("#lostReasonLeadName"),
  lostReasonSelect: document.querySelector("#lostReasonSelect"),
  lostCompetitorField: document.querySelector("#lostCompetitorField"),
  lostCompetitorInput: document.querySelector("#lostCompetitorInput"),
  lostReasonDetail: document.querySelector("#lostReasonDetail"),
  lostReasonCount: document.querySelector("#lostReasonCount"),
  lostReasonMessage: document.querySelector("#lostReasonMessage"),
  skipLostReason: document.querySelector("#skipLostReason"),
  appToast: document.querySelector("#appToast")
};

const SESSION_KEY = "arg_crm_session";
let currentView = "dashboard";
const leadFormTouched = new Set();
const leadEnrichmentCache = new Map();
let leadEnrichmentTimer = null;
let leadEnrichmentKey = "";
let activitySearchTimer = null;
let overdueRefreshTimer = null;

const enrichmentFieldMap = {
  company_name: "company_name",
  legal_name: "legal_name",
  year_established: "year_established",
  website: "website",
  phone: "phone",
  email: "email",
  address: "address",
  google_maps_url: "google_maps_url",
  business_category: "business_category",
  industry: "industry",
  products_services_remarks: "products_services_remarks",
  google_place_id: "google_place_id",
  google_rating: "google_rating",
  google_review_count: "google_review_count",
  opening_hours: "opening_hours",
  enrichment_source: "enrichment_source",
  enrichment_status: "enrichment_status",
  enriched_at: "enriched_at"
};

const userReviewFields = new Set([
  "company_name",
  "legal_name",
  "year_established",
  "website",
  "phone",
  "email",
  "address",
  "google_maps_url",
  "business_category",
  "industry",
  "products_services_remarks"
]);

const money = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
  maximumFractionDigits: 0
});

const KANBAN_STAGES = [
  { key: "PROSPECT", label: "Prospect", color: "stage-prospect", aliases: ["PROSPECT", "NEW"] },
  { key: "OUTREACH", label: "Qualified", color: "stage-qualified", aliases: ["OUTREACH", "QUALIFIED"] },
  { key: "SAMPLING", label: "Proposal Sent", color: "stage-proposal", aliases: ["SAMPLING", "PROPOSAL", "PROPOSAL SENT"] },
  { key: "ENGAGED", label: "Negotiation", color: "stage-negotiation", aliases: ["ENGAGED", "NEGOTIATION"] },
  { key: "ACTIVE", label: "Won", color: "stage-won", aliases: ["ACTIVE", "WON"] },
  { key: "DORMANT", label: "Lost", color: "stage-lost", aliases: ["DORMANT", "LOST", "AT RISK"] }
];

const KANBAN_STAGE_BY_KEY = Object.fromEntries(KANBAN_STAGES.map(stage => [stage.key, stage]));

function allActivityTypes() {
  return ["Note", "Phone Call", "Email", "In-Person Meeting", "Site Visit", "Video Call", "Quotation Sent", "Order Placed", "Reminder"];
}

function isoDateFromDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function defaultActivityRange() {
  const now = new Date();
  return { dateFrom: isoDateFromDate(addDays(now, -30)), dateTo: isoDateFromDate(now) };
}

function defaultActivityFilters() {
  const range = defaultActivityRange();
  return {
    salesmanId: "all",
    types: allActivityTypes(),
    dateFrom: range.dateFrom,
    dateTo: range.dateTo,
    companySearch: "",
    preset: "Last 30 Days"
  };
}

function loadActivityFilters() {
  try {
    const stored = JSON.parse(sessionStorage.getItem(ACTIVITY_FILTER_KEY) || "null");
    if (!stored || typeof stored !== "object") return defaultActivityFilters();
    const defaults = defaultActivityFilters();
    return {
      ...defaults,
      ...stored,
      types: Array.isArray(stored.types) && stored.types.length ? stored.types.filter(type => allActivityTypes().includes(type)) : defaults.types
    };
  } catch {
    return defaultActivityFilters();
  }
}

function saveActivityFilters() {
  sessionStorage.setItem(ACTIVITY_FILTER_KEY, JSON.stringify(state.activityFilters));
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60_000);
}

function compactCalendarDate(dateValue, timeValue, offsetMinutes = 0) {
  const date = String(dateValue || "").trim();
  if (!date) return "";
  const time = String(timeValue || "").trim() || "09:00";
  const parsed = new Date(`${date}T${time}:00`);
  const value = Number.isNaN(parsed.getTime()) ? new Date(`${date}T09:00:00`) : addMinutes(parsed, offsetMinutes);
  const pad = number => String(number).padStart(2, "0");
  return `${value.getFullYear()}${pad(value.getMonth() + 1)}${pad(value.getDate())}T${pad(value.getHours())}${pad(value.getMinutes())}00`;
}

function googleCalendarUrl(reminder) {
  if (reminder.google_calendar_url) return reminder.google_calendar_url;
  const start = compactCalendarDate(reminder.due_date, reminder.due_time);
  if (!start) return "";
  const end = compactCalendarDate(reminder.due_date, reminder.due_time, 30);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: reminder.title || `${reminder.reminder_type || "Follow-up"}: ${reminder.company_name || "Customer"}`,
    dates: `${start}/${end}`,
    details: reminder.activity_required || reminder.text || "",
    location: reminder.location || "",
    ctz: "Asia/Dubai"
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

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
  if (!response.ok) {
    const error = new Error(result.error || `Request failed: ${response.status}`);
    error.status = response.status;
    error.details = result;
    throw error;
  }
  return result;
}

async function downloadExport(path, fallbackName) {
  const token = sessionStorage.getItem(SESSION_KEY);
  const response = await fetch(path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || `Export failed: ${response.status}`);
  }
  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = match?.[1] || fallbackName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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

async function analyzePmrTranscript(transcript) {
  const lead = state.leads.find(item => item.id === els.pmrForm?.elements.company_id?.value) || {};
  return api("/api/pmrs/analyze-transcript", {
    method: "POST",
    body: JSON.stringify({
      transcript,
      lead: {
        company_name: lead.company_name,
        sector: lead.sector || lead.industry,
        stage: lead.stage,
        notes: lead.notes
      }
    })
  });
}

let activeRecorder = null;
let pmrVoiceRecorder = null;
let pmrVoiceBlob = null;
let pmrVoicePreviewUrl = "";

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
      current.status.textContent = "Converting voice note to English text...";
      try {
        const transcript = await transcribeRecording(new Blob(current.chunks, { type: recorder.mimeType || "audio/webm" }));
        if (!transcript) throw new Error("No speech was detected. Please record again.");
        current.target.value = [current.target.value.trim(), transcript].filter(Boolean).join(current.target.value.trim() ? "\n" : "");
        current.target.dispatchEvent(new Event("input", { bubbles: true }));
        current.status.textContent = "English transcript added. You can edit it before saving.";
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

function resetPmrVoiceNote() {
  if (pmrVoiceRecorder?.recorder?.state === "recording") {
    pmrVoiceRecorder.recorder.stop();
  }
  if (pmrVoiceRecorder?.stream) {
    pmrVoiceRecorder.stream.getTracks().forEach(track => track.stop());
  }
  if (pmrVoiceRecorder?.timeout) clearTimeout(pmrVoiceRecorder.timeout);
  pmrVoiceRecorder = null;
  pmrVoiceBlob = null;
  if (pmrVoicePreviewUrl) URL.revokeObjectURL(pmrVoicePreviewUrl);
  pmrVoicePreviewUrl = "";
  if (els.pmrVoicePreview) {
    els.pmrVoicePreview.removeAttribute("src");
    els.pmrVoicePreview.load();
    els.pmrVoicePreview.classList.add("hidden");
  }
  if (els.deletePmrVoice) els.deletePmrVoice.classList.add("hidden");
  if (els.recordPmrVoice) {
    els.recordPmrVoice.textContent = "Record Voice Note";
    els.recordPmrVoice.classList.remove("recording");
  }
  if (els.pmrVoiceStatus) els.pmrVoiceStatus.textContent = "No PMR voice note recorded.";
  if (els.pmrTranscriptLabel) els.pmrTranscriptLabel.classList.add("hidden");
  ["voice_note_id", "voice_note_url", "voice_note_path", "voice_note_mime_type", "voice_note_size_bytes", "voice_note_transcript"].forEach(name => {
    if (els.pmrForm?.elements[name]) els.pmrForm.elements[name].value = "";
  });
}

function setPmrField(name, value) {
  if (value == null || value === "") return;
  const field = els.pmrForm?.elements[name];
  if (!field) return;
  field.value = String(value);
  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.dispatchEvent(new Event("change", { bubbles: true }));
}

function applyPmrDraft(draft = {}) {
  setPmrField("products_discussed", draft.products_discussed);
  setPmrField("competitors_mentioned", draft.competitors_mentioned);
  setPmrField("compliance_requirements", draft.compliance_requirements);
  setPmrField("notes", draft.notes);
  setPmrField("first_order_timing", draft.first_order_timing);
  setPmrField("potential_annual_value", draft.potential_annual_value);
  setPmrField("relationship_heat_score", draft.relationship_heat_score);
  setPmrField("director_action_required", draft.director_action_required);
  setPmrField("account_status", draft.account_status);
}

async function togglePmrVoiceRecording() {
  if (activeRecorder) {
    els.pmrVoiceStatus.textContent = "Finish the current voice note first.";
    return;
  }
  if (pmrVoiceRecorder) {
    pmrVoiceRecorder.recorder.stop();
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    els.pmrVoiceStatus.textContent = "Voice recording is not supported in this browser.";
    return;
  }
  if (pmrVoiceBlob) resetPmrVoiceNote();

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks = [];
    const mimeType = recorderMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const timeout = setTimeout(() => recorder.state === "recording" && recorder.stop(), 120_000);
    pmrVoiceRecorder = { recorder, stream, chunks, timeout };
    els.recordPmrVoice.textContent = "Stop Recording";
    els.recordPmrVoice.classList.add("recording");
    els.pmrVoiceStatus.textContent = "Recording PMR voice note...";

    recorder.addEventListener("dataavailable", event => {
      if (event.data.size) chunks.push(event.data);
    });
    recorder.addEventListener("stop", async () => {
      const current = pmrVoiceRecorder;
      if (!current) return;
      pmrVoiceRecorder = null;
      clearTimeout(current.timeout);
      current.stream.getTracks().forEach(track => track.stop());
      els.recordPmrVoice.classList.remove("recording");
      els.recordPmrVoice.textContent = "Re-record Voice Note";
      if (pmrVoicePreviewUrl) URL.revokeObjectURL(pmrVoicePreviewUrl);
      pmrVoiceBlob = new Blob(current.chunks, { type: recorder.mimeType || "audio/webm" });
      if (!pmrVoiceBlob.size) {
        resetPmrVoiceNote();
        els.pmrVoiceStatus.textContent = "No audio was captured. Please record again.";
        return;
      }
      pmrVoicePreviewUrl = URL.createObjectURL(pmrVoiceBlob);
      els.pmrVoicePreview.src = pmrVoicePreviewUrl;
      els.pmrVoicePreview.classList.remove("hidden");
      els.deletePmrVoice.classList.remove("hidden");
      els.pmrVoiceStatus.textContent = "Recording ready. Transcribing meeting note...";
      try {
        const transcript = await transcribeRecording(pmrVoiceBlob);
        if (!transcript) throw new Error("No speech was detected. You can re-record or save the audio only.");
        els.pmrForm.elements.voice_note_transcript.value = transcript;
        els.pmrTranscriptLabel.classList.remove("hidden");
        els.pmrVoiceStatus.textContent = "Transcript ready. Drafting PMR fields...";
        const result = await analyzePmrTranscript(transcript);
        applyPmrDraft(result.draft || {});
        els.pmrVoiceStatus.textContent = "AI PMR draft filled. Review and edit before saving.";
      } catch (error) {
        els.pmrVoiceStatus.textContent = `Recording saved for preview, but AI drafting failed: ${error.message}`;
      }
    });
    recorder.start();
  } catch (error) {
    els.pmrVoiceStatus.textContent = error.name === "NotAllowedError"
      ? "Microphone permission was denied. Allow microphone access and try again."
      : `Could not start recording: ${error.message}`;
  }
}

async function uploadPmrVoiceNote() {
  if (!pmrVoiceBlob) return null;
  if (els.pmrForm.elements.voice_note_id.value) {
    return {
      id: els.pmrForm.elements.voice_note_id.value,
      url: els.pmrForm.elements.voice_note_url.value
    };
  }

  const token = sessionStorage.getItem(SESSION_KEY);
  const response = await fetch("/api/pmr-voice-notes", {
    method: "POST",
    headers: {
      "Content-Type": pmrVoiceBlob.type || "audio/webm",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: pmrVoiceBlob
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Voice note upload failed: ${response.status}`);
  els.pmrForm.elements.voice_note_id.value = result.id || "";
  els.pmrForm.elements.voice_note_url.value = result.url || "";
  els.pmrForm.elements.voice_note_path.value = result.path || "";
  els.pmrForm.elements.voice_note_mime_type.value = result.mime_type || pmrVoiceBlob.type || "audio/webm";
  els.pmrForm.elements.voice_note_size_bytes.value = String(result.size_bytes || pmrVoiceBlob.size || "");
  return result;
}

function activityAudioMarkup(activity) {
  if (!activity.voice_note_url && !activity.voice_note_id) return "";
  return `<audio class="activity-audio" controls preload="metadata" data-voice-note-id="${escapeHtml(activity.voice_note_id || "")}" ${activity.voice_note_url ? `src="${escapeHtml(activity.voice_note_url)}"` : ""}></audio>`;
}

async function loadActivityAudioSources() {
  const players = [...document.querySelectorAll("audio[data-voice-note-id]")].filter(player => player.dataset.voiceNoteId);
  await Promise.all(players.map(async player => {
    try {
      const result = await api(`/api/pmr-voice-notes/${encodeURIComponent(player.dataset.voiceNoteId)}/signed-url`);
      if (result.url) player.src = result.url;
    } catch {
      player.removeAttribute("src");
      player.title = "Voice note is not available.";
    }
  }));
}

function activityTranscriptMarkup(activity) {
  if (!activity.voice_note_transcript) return "";
  return `
    <details class="activity-transcript">
      <summary>View AI transcript</summary>
      <p>${escapeHtml(activity.voice_note_transcript)}</p>
    </details>
  `;
}

function activityEditButton(leadId, activityIndex, activity = {}) {
  if (activityIndex == null || activityIndex < 0 || activity.delete_request) return "";
  return `<button class="small-action" type="button" data-edit-activity-lead="${escapeHtml(leadId)}" data-edit-activity-index="${escapeHtml(activityIndex)}">Edit</button>`;
}

function activityDeleteButton(leadId, activityIndex, activity = {}) {
  if (activityIndex == null || activityIndex < 0 || activity.delete_request) return "";
  const admin = state.currentUser?.role === "admin";
  return `<button class="small-action danger" type="button" data-delete-activity-lead="${escapeHtml(leadId)}" data-delete-activity-index="${escapeHtml(activityIndex)}">${admin ? "Delete" : "Request Delete"}</button>`;
}

function activityItemMarkup(activity, leadId, activityIndex) {
  return `
    <div class="activity-item">
      <div class="activity-row">
        <span class="meta-label">${escapeHtml(activity.at)} - ${escapeHtml(activity.type)}</span>
        <span class="activity-actions">
          ${activityEditButton(leadId, activityIndex, activity)}
          ${activityDeleteButton(leadId, activityIndex, activity)}
        </span>
      </div>
      <p>${escapeHtml(activity.text)}</p>
      ${activity.delete_request ? `<span class="request-status ${escapeHtml(activity.request_status || "pending")}">Delete request ${escapeHtml(activity.request_status || "pending")}</span>` : ""}
      ${activity.edited_at ? `<span class="meta-label">Edited ${escapeHtml(String(activity.edited_at).slice(0, 10))}</span>` : ""}
      ${activityAudioMarkup(activity)}
      ${activityTranscriptMarkup(activity)}
    </div>
  `;
}

function bindActivityEditButtons() {
  document.querySelectorAll("[data-edit-activity-lead]").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      openActivityEdit(button.dataset.editActivityLead, Number(button.dataset.editActivityIndex));
    });
  });
}

function bindDeleteButtons() {
  document.querySelectorAll("[data-delete-activity-lead]").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      handleActivityDelete(button.dataset.deleteActivityLead, Number(button.dataset.deleteActivityIndex));
    });
  });

  document.querySelectorAll("[data-review-delete-request]").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      reviewDeleteRequest(button.dataset.reviewDeleteLead, button.dataset.reviewDeleteRequest, button.dataset.reviewDeleteAction);
    });
  });
}

function openActivityEdit(leadId, activityIndex) {
  const lead = state.leads.find(item => item.id === leadId);
  const activity = lead?.activities?.[activityIndex];
  if (!lead || !activity) return;
  els.activityEditMessage.textContent = "";
  els.activityEditForm.reset();
  const form = els.activityEditForm.elements;
  form.lead_id.value = leadId;
  form.activity_index.value = String(activityIndex);
  form.at.value = activity.at || today();
  form.type.value = activity.type || "Note";
  form.text.value = activity.text || "";
  form.reminder_type.value = activity.reminder_type || "General follow-up";
  form.due_date.value = activity.due_date || activity.at || today();
  form.due_time.value = activity.due_time || "09:00";
  form.activity_required.value = activity.activity_required || activity.text || "";
  els.activityEditReminderFields.classList.toggle("hidden", !isReminderActivity(activity));
  els.activityEditDialog.showModal();
}

function adminPasswordPrompt(action) {
  return window.prompt(`Enter admin password to ${action}:`);
}

async function submitDeleteRequest(leadId, targetType, activityIndex = null) {
  const reason = window.prompt(`Reason for requesting ${targetType} deletion:`);
  if (!reason?.trim()) return;
  await api(`/api/leads/${encodeURIComponent(leadId)}/delete-requests`, {
    method: "POST",
    body: JSON.stringify({
      target_type: targetType,
      activity_index: activityIndex,
      reason: reason.trim()
    })
  });
  window.alert("Delete request sent to admin for approval.");
  await loadLeads();
}

async function handleActivityDelete(leadId, activityIndex) {
  if (state.currentUser?.role !== "admin") {
    await submitDeleteRequest(leadId, "activity", activityIndex);
    return;
  }
  const password = adminPasswordPrompt("delete this activity");
  if (!password) return;
  await api(`/api/leads/${encodeURIComponent(leadId)}/activities/${encodeURIComponent(activityIndex)}`, {
    method: "DELETE",
    body: JSON.stringify({ admin_password: password })
  });
  await loadLeads();
}

async function reviewDeleteRequest(leadId, requestId, action) {
  const password = adminPasswordPrompt(`${action} this delete request`);
  if (!password) return;
  const note = action === "reject" ? window.prompt("Optional rejection note:") || "" : "";
  const result = await api(`/api/leads/${encodeURIComponent(leadId)}/delete-requests/${encodeURIComponent(requestId)}/${encodeURIComponent(action)}`, {
    method: "POST",
    body: JSON.stringify({ admin_password: password, note })
  });
  if (result.deleted && state.selectedId === leadId) state.selectedId = null;
  await loadLeads();
}

async function markFollowupComplete(button) {
  const leadId = button.dataset.followupComplete;
  const activityIndex = button.dataset.followupIndex;
  const text = button.dataset.followupText || "Follow up with customer";
  const dueDate = button.dataset.followupDate || "";
  const reminderType = button.dataset.followupType || "General follow-up";
  if (activityIndex !== "") {
    const lead = state.leads.find(item => item.id === leadId);
    const activity = lead?.activities?.[Number(activityIndex)];
    await api(`/api/leads/${encodeURIComponent(leadId)}/activities/${encodeURIComponent(activityIndex)}`, {
      method: "PATCH",
      body: JSON.stringify({
        ...activity,
        type: "Reminder",
        text: activity?.text || text,
        reminder_status: "completed",
        activity_required: activity?.activity_required || text,
        due_date: activity?.due_date || dueDate,
        due_time: activity?.due_time || button.dataset.followupTime || "09:00"
      })
    });
  } else {
    await api(`/api/leads/${encodeURIComponent(leadId)}/activities`, {
      method: "POST",
      body: JSON.stringify({
        type: "Follow-up Complete",
        text: `Completed follow-up: ${text}`,
        followup_completed: true,
        completed_due_date: dueDate,
        completed_activity_required: text,
        completed_reminder_type: reminderType
      })
    });
  }
  await loadLeads();
}

async function rescheduleFollowup(button) {
  const leadId = button.dataset.followupReschedule;
  const activityIndex = button.dataset.followupIndex;
  const text = button.dataset.followupText || "Follow up with customer";
  const date = window.prompt("New follow-up date (YYYY-MM-DD):", today());
  if (!date) return;
  const time = window.prompt("New follow-up time (HH:MM):", "09:00") || "09:00";
  if (activityIndex !== "") {
    const lead = state.leads.find(item => item.id === leadId);
    const activity = lead?.activities?.[Number(activityIndex)];
    await api(`/api/leads/${encodeURIComponent(leadId)}/activities/${encodeURIComponent(activityIndex)}`, {
      method: "PATCH",
      body: JSON.stringify({
        ...activity,
        type: "Reminder",
        text: activity?.text || text,
        reminder_status: "scheduled",
        activity_required: activity?.activity_required || text,
        due_date: date,
        due_time: time
      })
    });
  } else {
    await api(`/api/leads/${encodeURIComponent(leadId)}`, {
      method: "PATCH",
      body: JSON.stringify({ next_action: text, next_action_date: date })
    });
    await api(`/api/leads/${encodeURIComponent(leadId)}/activities`, {
      method: "POST",
      body: JSON.stringify({ type: "Note", text: `Follow-up rescheduled to ${date} ${time}: ${text}` })
    });
  }
  await loadLeads();
}

async function addFollowupNote(leadId) {
  const note = window.prompt("Activity note:");
  if (!note?.trim()) return;
  await api(`/api/leads/${encodeURIComponent(leadId)}/activities`, {
    method: "POST",
    body: JSON.stringify({ type: "Note", text: note.trim() })
  });
  await loadLeads();
}

function bindFollowupActions() {
  document.querySelectorAll("[data-followup-open]").forEach(button => {
    button.addEventListener("click", () => {
      state.selectedId = button.dataset.followupOpen;
      openLeadDrawer(button.dataset.followupOpen, "reminders");
    });
  });
  document.querySelectorAll("[data-followup-complete]").forEach(button => {
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        await markFollowupComplete(button);
      } catch (error) {
        window.alert(error.message);
        button.disabled = false;
      }
    });
  });
  document.querySelectorAll("[data-followup-reschedule]").forEach(button => {
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        await rescheduleFollowup(button);
      } catch (error) {
        window.alert(error.message);
        button.disabled = false;
      }
    });
  });
  document.querySelectorAll("[data-followup-note]").forEach(button => {
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        await addFollowupNote(button.dataset.followupNote);
      } catch (error) {
        window.alert(error.message);
        button.disabled = false;
      }
    });
  });
}

function deleteRequestPanel(lead) {
  const requests = (lead.activities || []).filter(activity => activity.delete_request);
  const visible = state.currentUser?.role === "admin"
    ? requests
    : requests.filter(request => request.request_status === "pending");
  if (!visible.length) return "";
  return `
    <section class="delete-approval-panel">
      <div class="section-title-row">
        <h2>Delete Approvals</h2>
        <span>${visible.length} request${visible.length === 1 ? "" : "s"}</span>
      </div>
      <div class="delete-request-list">
        ${visible.map(request => `
          <article class="delete-request-card">
            <div>
              <span class="request-status ${escapeHtml(request.request_status || "pending")}">${escapeHtml(request.request_status || "pending")}</span>
              <strong>${escapeHtml(request.target_type === "lead" ? "Lead deletion" : "Activity deletion")}</strong>
              <p>${escapeHtml(request.reason || request.text || "No reason provided.")}</p>
              ${request.target_activity_summary ? `<p class="meta-label">${escapeHtml(request.target_activity_summary)}</p>` : ""}
              <span class="meta-label">Requested by ${escapeHtml(request.requested_by_name || "User")} on ${escapeHtml(String(request.requested_at || request.at || "").slice(0, 10))}</span>
            </div>
            ${state.currentUser?.role === "admin" && request.request_status === "pending" ? `
              <div class="delete-request-actions">
                <button class="small-action danger" type="button" data-review-delete-lead="${escapeHtml(lead.id)}" data-review-delete-request="${escapeHtml(request.id)}" data-review-delete-action="approve">Approve Delete</button>
                <button class="small-action" type="button" data-review-delete-lead="${escapeHtml(lead.id)}" data-review-delete-request="${escapeHtml(request.id)}" data-review-delete-action="reject">Reject</button>
              </div>
            ` : ""}
          </article>
        `).join("")}
      </div>
    </section>
  `;
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

function setToast(message, type = "success") {
  if (!els.appToast) return;
  els.appToast.textContent = message;
  els.appToast.classList.remove("hidden", "success", "error");
  els.appToast.classList.add(type === "error" ? "error" : "success");
  clearTimeout(setToast.timer);
  setToast.timer = setTimeout(() => els.appToast.classList.add("hidden"), 2800);
}

function setEnrichmentStatus(message, type = "") {
  if (!els.leadEnrichmentStatus) return;
  els.leadEnrichmentStatus.textContent = message;
  els.leadEnrichmentStatus.classList.toggle("success", type === "success");
  els.leadEnrichmentStatus.classList.toggle("error", type === "error");
}

function formValue(value) {
  if (Array.isArray(value)) return value.join("\n");
  return String(value ?? "").trim();
}

function applyLeadEnrichment(enrichment, { overwrite = false } = {}) {
  const conflicts = [];
  Object.entries(enrichmentFieldMap).forEach(([source, target]) => {
    const field = els.leadForm.elements[target];
    if (!field) return;
    const next = formValue(enrichment[source]);
    if (!next) return;
    const current = String(field.value || "").trim();
    if (
      !overwrite
      && userReviewFields.has(target)
      && leadFormTouched.has(target)
      && current
      && current !== next
    ) {
      conflicts.push(target);
    }
  });

  const allowOverwrite = overwrite || !conflicts.length || window.confirm(
    `Google Places found updated data for ${conflicts.join(", ")}. Apply it and replace those edited field(s)?`
  );

  Object.entries(enrichmentFieldMap).forEach(([source, target]) => {
    const field = els.leadForm.elements[target];
    if (!field) return;
    const next = formValue(enrichment[source]);
    if (!next) return;
    const current = String(field.value || "").trim();
    const isConflict = conflicts.includes(target);
    if (overwrite || !current || (allowOverwrite && isConflict) || !userReviewFields.has(target)) {
      field.value = next;
    }
  });
}

function leadEnrichmentRequestKey(companyName, location) {
  return [companyName, location].map(value => String(value || "").trim().toLowerCase()).join("|");
}

function scheduleLeadCompanyEnrichment() {
  clearTimeout(leadEnrichmentTimer);
  const companyName = els.leadForm.elements.company_name.value.trim();
  const location = els.leadForm.elements.location.value.trim() || els.leadForm.elements.territory.value.trim();
  if (!companyName) {
    setEnrichmentStatus("Type a company name to fetch Google business info.");
    return;
  }
  if (companyName.length < 2) return;
  leadEnrichmentTimer = setTimeout(() => enrichLeadFormCompany(companyName, location), 850);
}

async function enrichLeadFormCompany(companyName, location) {
  const key = leadEnrichmentRequestKey(companyName, location);
  if (key === leadEnrichmentKey) return;
  leadEnrichmentKey = key;
  try {
    setEnrichmentStatus("Fetching business info...");
    let result = leadEnrichmentCache.get(key);
    if (!result) {
      result = await api("/api/leads/enrich-company", {
        method: "POST",
        body: JSON.stringify({ companyName, location, country: "United Arab Emirates" })
      });
      leadEnrichmentCache.set(key, result);
    }
    const enrichment = result.enrichment || {};
    applyLeadEnrichment(enrichment);
    const status = enrichment.enrichment_status || "partial";
    if (status === "not_found") {
      setEnrichmentStatus("No Google Places match found. You can continue manually.", "error");
    } else {
      setEnrichmentStatus(`Google business info ${status}. Review fields before saving.`, "success");
    }
  } catch (error) {
    leadEnrichmentKey = "";
    setEnrichmentStatus(error.message, "error");
  }
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
    const matchesPriority = state.filters.priority === "all" || lead.priority === state.filters.priority;
    const territoryOptions = [
      lead.territory,
      lead.country_emirate,
      lead.location,
      inferCountry(lead),
      inferEmirate(lead)
    ].map(value => String(value || "").trim().toLowerCase());
    const matchesTerritory = state.filters.territory === "all" || territoryOptions.includes(state.filters.territory.toLowerCase());
    const matchesOverdue = !state.overduePipelineOnly || leadHasOverdueFollowup(lead);
    return matchesQuery && matchesStage && matchesSalesman && matchesPriority && matchesTerritory && matchesOverdue;
  });
}

function priorityClass(priority) {
  return String(priority || "").toLowerCase().replace(/\s+/g, "-");
}

function healthClass(health) {
  return `health-${String(health?.label || "amber").toLowerCase()}`;
}

function isOverdue(lead) {
  return lead.next_action_date <= today() && lead.stage !== "ACTIVE" && lead.stage !== "DORMANT";
}

function isAdminOrManager() {
  return ["admin", "manager"].includes(String(state.currentUser?.role || "").toLowerCase());
}

function activeLeadForOverdue(lead) {
  return !["WON", "LOST"].includes(String(lead?.stage || "").trim().toUpperCase());
}

function leadHasOverdueNextAction(lead) {
  return Boolean(lead?.next_action_date) && String(lead.next_action_date).slice(0, 10) < today() && activeLeadForOverdue(lead);
}

function activityDueDate(activity = {}) {
  return String(activity.reminder_due_date || activity.due_date || "").slice(0, 10);
}

function activityDueTime(activity = {}) {
  return String(activity.reminder_due_time || activity.due_time || "").slice(0, 5);
}

function isCompletedReminder(activity = {}) {
  return Boolean(activity.completed_at)
    || Boolean(activity.followup_completed)
    || String(activity.reminder_status || "").toLowerCase() === "completed";
}

function overdueReminderItemsForLead(lead) {
  if (!activeLeadForOverdue(lead)) return [];
  return (lead.activities || [])
    .map((activity, activity_index) => ({ activity, activity_index }))
    .filter(({ activity }) => isReminderActivity(activity) && !isCompletedReminder(activity))
    .filter(({ activity }) => {
      const dueDate = activityDueDate(activity);
      return dueDate && dueDate < today();
    })
    .map(({ activity, activity_index }) => ({
      id: `${lead.id}:reminder:${activity.id || activity_index}`,
      kind: "reminder",
      lead_id: lead.id,
      company_name: lead.company_name || "Unnamed company",
      assigned_salesman: lead.assigned_salesman || activity.salesman_name || "Unassigned",
      due_date: activityDueDate(activity),
      due_time: activityDueTime(activity),
      stage: lead.stage,
      text: activity.activity_required || activity.text || "Follow up with customer",
      activity_index
    }));
}

function overdueLeadItems() {
  return state.leads
    .filter(leadHasOverdueNextAction)
    .map(lead => ({
      id: `${lead.id}:lead`,
      kind: "lead",
      lead_id: lead.id,
      company_name: lead.company_name || "Unnamed company",
      assigned_salesman: lead.assigned_salesman || "Unassigned",
      due_date: String(lead.next_action_date || "").slice(0, 10),
      due_time: "09:00",
      stage: lead.stage,
      text: lead.next_action || "Follow up with customer"
    }));
}

function overdueReminderItems() {
  return state.leads.flatMap(overdueReminderItemsForLead);
}

function overdueItems() {
  return [...overdueLeadItems(), ...overdueReminderItems()].sort((a, b) =>
    String(a.due_date || "").localeCompare(String(b.due_date || ""))
    || String(a.due_time || "").localeCompare(String(b.due_time || ""))
    || String(a.company_name || "").localeCompare(String(b.company_name || ""))
  );
}

function leadHasOverdueFollowup(lead) {
  return leadHasOverdueNextAction(lead) || overdueReminderItemsForLead(lead).length > 0;
}

function daysOverdue(dateValue) {
  const days = Math.max(0, Math.abs(daysUntil(dateValue)));
  return days;
}

function daysOverdueLabel(dateValue) {
  const days = daysOverdue(dateValue);
  return days === 1 ? "1 day overdue" : `${days} days overdue`;
}

function overdueBreakdown(items) {
  return items.reduce((acc, item) => {
    const name = String(item.assigned_salesman || "Unassigned").trim() || "Unassigned";
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});
}

function renderMetrics() {
  const due = state.leads.filter(isOverdue).length;
  const openValue = state.leads
    .filter(lead => lead.stage !== "ACTIVE" && lead.stage !== "DORMANT")
    .reduce((sum, lead) => sum + Number(lead.estimated_value || 0), 0);
  els.metricTotal.textContent = state.leads.length;
  els.metricValue.textContent = money.format(openValue);
  els.metricHot.textContent = state.leads.filter(lead => lead.priority === "Hot").length;
  els.metricDue.textContent = due;
}

function renderOverdueBanner() {
  if (!els.overdueBanner || !state.currentUser) return;
  const items = overdueItems();
  if (!items.length || sessionStorage.getItem(OVERDUE_BANNER_KEY) === "true") {
    els.overdueBanner.classList.add("hidden");
    els.overdueBanner.innerHTML = "";
    return;
  }

  const oldest = items[0];
  const total = items.length;
  const admin = isAdminOrManager();
  const breakdown = overdueBreakdown(items);
  const breakdownEntries = Object.entries(breakdown).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const shown = breakdownEntries.slice(0, 4);
  const moreCount = Math.max(0, breakdownEntries.length - shown.length);
  const actionLabel = total === 1 ? "Open Lead" : admin ? "View Report" : "View All";
  const title = total === 1
    ? `1 overdue follow-up: ${oldest.company_name} (${daysOverdueLabel(oldest.due_date)})`
    : admin
      ? `${total} overdue follow-ups across ${breakdownEntries.length} ${breakdownEntries.length === 1 ? "salesman" : "salesmen"}`
      : `You have ${total} overdue follow-ups`;
  const subtitle = total === 1
    ? escapeHtml(oldest.text)
    : admin
      ? `${shown.map(([name, count]) => `<span class="overdue-pill">${escapeHtml(name)}: ${count}</span>`).join("")}${moreCount ? `<span class="overdue-pill">+${moreCount} more</span>` : ""}`
      : `Oldest: ${escapeHtml(oldest.company_name)} - ${escapeHtml(daysOverdueLabel(oldest.due_date))}`;

  els.overdueBanner.classList.remove("hidden");
  els.overdueBanner.innerHTML = `
    <div class="overdue-banner-icon" aria-hidden="true">!</div>
    <div class="overdue-banner-copy">
      <strong>${escapeHtml(title)}</strong>
      <div>${subtitle}</div>
    </div>
    <div class="overdue-banner-actions">
      <button class="overdue-action" type="button" data-overdue-action="${total === 1 ? "open" : admin ? "report" : "view"}" data-lead-id="${escapeHtml(oldest.lead_id)}">${escapeHtml(actionLabel)}</button>
      <button class="overdue-dismiss" type="button" data-overdue-dismiss aria-label="Dismiss overdue follow-up banner">&times;</button>
    </div>
  `;

  els.overdueBanner.querySelector("[data-overdue-dismiss]")?.addEventListener("click", () => {
    sessionStorage.setItem(OVERDUE_BANNER_KEY, "true");
    renderOverdueBanner();
  });
  els.overdueBanner.querySelector("[data-overdue-action]")?.addEventListener("click", event => {
    const action = event.currentTarget.dataset.overdueAction;
    if (action === "open") {
      openLeadDrawer(event.currentTarget.dataset.leadId, "reminders");
    } else if (action === "report") {
      openOverdueActivityReport();
    } else {
      openOverduePipeline();
    }
  });
}

function openOverduePipeline() {
  state.overduePipelineOnly = true;
  state.filters = { ...state.filters, search: "", stage: "all", priority: "all", territory: "all", salesman: "all" };
  state.pipelineViewMode = "list";
  localStorage.setItem("arg_pipeline_view_mode", state.pipelineViewMode);
  currentView = "pipeline";
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openOverdueActivityReport() {
  state.activityFilters = {
    ...defaultActivityFilters(),
    types: ["Reminder"],
    dateFrom: "",
    dateTo: today(),
    companySearch: "",
    preset: ""
  };
  state.activityFiltersOpen = true;
  saveActivityFilters();
  currentView = "activity";
  render();
  fetchActivities();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderPipelineFilterNotice() {
  if (!els.overduePipelineFilter) return;
  const count = state.leads.filter(leadHasOverdueFollowup).length;
  els.overduePipelineCount.textContent = `${count} overdue record${count === 1 ? "" : "s"}`;
  els.overduePipelineFilter.classList.toggle("hidden", !(currentView === "pipeline" && state.overduePipelineOnly));
}

function normalizedUserTokens(person) {
  const name = typeof person === "string" ? person : person.name || person.full_name || "";
  const email = typeof person === "string" ? "" : person.email || "";
  return [name, email, email.split("@")[0], typeof person === "string" ? "" : person.id]
    .map(value => String(value || "").trim().toLowerCase())
    .filter(Boolean);
}

function salesmanName(person) {
  return typeof person === "string" ? person : person.name || person.full_name || person.email || "Unassigned";
}

function analyticsSalesmen() {
  const people = [...(state.settings.salesmen || [])];
  const known = new Set(people.map(person => salesmanName(person).toLowerCase()));
  state.leads.forEach(lead => {
    const assigned = String(lead.assigned_salesman || "Unassigned").trim() || "Unassigned";
    if (!known.has(assigned.toLowerCase())) {
      people.push({ name: assigned, email: "", id: "" });
      known.add(assigned.toLowerCase());
    }
  });
  return people;
}

function leadMatchesSalesman(lead, person) {
  const tokens = normalizedUserTokens(person);
  const assigned = String(lead.assigned_salesman || "").trim().toLowerCase();
  const assignedTo = String(lead.assigned_to || "").trim().toLowerCase();
  return tokens.includes(assigned) || tokens.includes(assignedTo);
}

function leadGeneratedBySalesman(lead, person) {
  const tokens = normalizedUserTokens(person);
  const createdBy = String(lead.created_by || "").trim().toLowerCase();
  return Boolean(createdBy && tokens.includes(createdBy));
}

function completedFollowupActivity(activity) {
  if (!activity || activity.delete_request || isReminderActivity(activity)) return false;
  const text = `${activity.type || ""} ${activity.text || ""}`.toLowerCase();
  return /follow|call|email|visit|meeting|quotation|quote|order/.test(text);
}

function latestDate(values) {
  return values
    .map(value => String(value || "").slice(0, 10))
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a))[0] || "";
}

function daysAgo(dateValue) {
  if (!dateValue) return 9999;
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 9999;
  return Math.floor((Date.now() - date.getTime()) / 86_400_000);
}

function performanceStatus(row) {
  const inactiveDays = daysAgo(row.lastActivityDate);
  if (!row.totalAssigned || inactiveDays > 30 || row.activitiesLogged === 0) return "red";
  if (inactiveDays <= 14 && row.activitiesLogged >= Math.max(1, row.totalAssigned)) return "green";
  return "yellow";
}

function salesmanPerformanceRows() {
  const stage = state.performanceStage || "all";
  return analyticsSalesmen().map(person => {
    const name = salesmanName(person);
    const assignedLeads = state.leads.filter(lead => leadMatchesSalesman(lead, person));
    const generatedLeads = state.leads.filter(lead => leadGeneratedBySalesman(lead, person));
    const filteredStageLeads = stage === "all" ? assignedLeads : assignedLeads.filter(lead => lead.stage === stage);
    const activities = assignedLeads.flatMap(lead => Array.isArray(lead.activities) ? lead.activities : [])
      .filter(activity => !activity.delete_request);
    const followupsCompleted = activities.filter(completedFollowupActivity).length;
    const upcomingFollowups = assignedLeads.flatMap(remindersForLead)
      .filter(reminder => !reminder.due_date || reminder.due_date >= today()).length;
    const progressedLeads = assignedLeads.filter(lead => !["PROSPECT", "DORMANT"].includes(String(lead.stage || "").toUpperCase())).length;
    const lastActivityDate = latestDate([
      ...assignedLeads.map(lead => lead.last_activity),
      ...activities.map(activity => activity.at)
    ]);
    const row = {
      name,
      totalAssigned: assignedLeads.length,
      totalGenerated: generatedLeads.length,
      filteredStageCount: filteredStageLeads.length,
      activitiesLogged: activities.length,
      followupsCompleted,
      upcomingFollowups,
      progressedLeads,
      lastActivityDate,
      score: activities.length * 2 + followupsCompleted * 2 + filteredStageLeads.length + progressedLeads
    };
    row.status = performanceStatus(row);
    return row;
  }).sort((a, b) =>
    b.score - a.score
    || b.totalAssigned - a.totalAssigned
    || a.name.localeCompare(b.name)
  );
}

function metricWinner(rows, key) {
  const winner = [...rows].sort((a, b) => b[key] - a[key] || a.name.localeCompare(b.name))[0];
  return winner ? `${winner.name} (${winner[key]})` : "-";
}

function renderPerformanceAnalytics() {
  if (!els.performancePanel || state.currentUser?.role !== "admin") return;
  const rows = salesmanPerformanceRows();
  const leastActive = [...rows].sort((a, b) => a.score - b.score || daysAgo(b.lastActivityDate) - daysAgo(a.lastActivityDate))[0];
  els.kpiMostActive.textContent = metricWinner(rows, "activitiesLogged");
  els.kpiHighestVolume.textContent = metricWinner(rows, "totalAssigned");
  els.kpiMostFollowups.textContent = metricWinner(rows, "followupsCompleted");
  els.kpiLeastActive.textContent = leastActive ? `${leastActive.name} (${leastActive.activitiesLogged})` : "-";

  const maxValue = Math.max(1, ...rows.flatMap(row => [
    row.totalAssigned,
    row.totalGenerated,
    row.activitiesLogged,
    row.followupsCompleted,
    row.filteredStageCount
  ]));
  els.performanceChart.innerHTML = rows.map(row => {
    const bars = [
      ["assigned", row.totalAssigned],
      ["generated", row.totalGenerated],
      ["activities", row.activitiesLogged],
      ["followups", row.followupsCompleted],
      ["stage", row.filteredStageCount]
    ];
    return `
      <article class="performance-chart-row">
        <div class="performance-chart-name">
          <strong>${escapeHtml(row.name)}</strong>
          <span class="performance-indicator ${row.status}">${row.status}</span>
        </div>
        <div class="performance-bars">
          ${bars.map(([key, value]) => `
            <div class="performance-bar-line">
              <span>${escapeHtml(key)}</span>
              <div class="performance-bar-track">
                <i class="performance-bar ${escapeHtml(key)}" style="width:${Math.max(4, (value / maxValue) * 100)}%"></i>
              </div>
              <b>${value}</b>
            </div>
          `).join("")}
        </div>
      </article>
    `;
  }).join("") || `<p class="empty-copy">No salesman records available.</p>`;

  els.performanceTable.innerHTML = rows.map((row, index) => `
    <tr>
      <td data-label="Rank">${index + 1}</td>
      <td data-label="Salesman Name"><span class="performance-indicator ${row.status}">${row.status}</span> ${escapeHtml(row.name)}</td>
      <td data-label="Leads Assigned">${row.totalAssigned}</td>
      <td data-label="Filtered Stage">${row.filteredStageCount}</td>
      <td data-label="Activities Logged">${row.activitiesLogged}</td>
      <td data-label="Upcoming Follow-ups">${row.upcomingFollowups}</td>
      <td data-label="Last Activity Date">${escapeHtml(row.lastActivityDate || "No activity")}</td>
    </tr>
  `).join("");
}

function renderLossReasonsAnalytics() {
  if (!els.lossReasonsPanel || !els.lossReasonsChart) return;
  const visible = state.currentUser?.role === "admin";
  const lostLeads = state.leads.filter(lead => isLostStageValue(lead.stage) && lead.lost_reason);
  els.lossReasonsPanel.classList.toggle("hidden", !visible || lostLeads.length < 3);
  if (!visible || lostLeads.length < 3) {
    els.lossReasonsChart.innerHTML = "";
    return;
  }
  const rows = Object.entries(countBy(lostLeads, lead => lead.lost_reason))
    .map(([reason, count]) => ({ reason, count, label: lostReasonLabel(reason) }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  const max = Math.max(1, ...rows.map(row => row.count));
  els.lossReasonsChart.innerHTML = rows.map(row => `
    <article class="loss-reason-row">
      <span>${escapeHtml(row.label)}</span>
      <div class="loss-reason-track"><i style="width:${Math.max(5, (row.count / max) * 100)}%"></i></div>
      <strong>${row.count}</strong>
    </article>
  `).join("");
}

function renderSalesmanFollowups() {
  if (!els.salesmanFollowupPanel || state.currentUser?.role === "admin") return;
  const groups = ["Overdue Follow-Ups", "Today", "Tomorrow", "This Week", "Next Week", "Future Follow-Ups"];
  const followups = salesmanFollowups();
  const grouped = groups.map(group => [group, followups.filter(reminder => followupGroup(reminder) === group)]);
  els.salesmanFollowupGroups.innerHTML = grouped.map(([group, reminders]) => `
    <section class="followup-group">
      <div class="followup-group-header">
        <h3>${escapeHtml(group)}</h3>
        <span>${reminders.length}</span>
      </div>
      <div class="followup-list">
        ${reminders.map(reminder => {
          const priority = followupPriority(reminder);
          return `
            <article class="followup-card priority-${priority.className}">
              <div class="followup-main">
                <span class="followup-priority">${escapeHtml(priority.label)}</span>
                <strong>${escapeHtml(reminder.company_name)}</strong>
                <p>${escapeHtml(reminder.activity_required || reminder.text || "Follow up with customer")}</p>
                <div class="chip-row">
                  <span class="chip">${escapeHtml(reminder.stage || "PROSPECT")}</span>
                  <span class="chip">${escapeHtml([reminder.due_date, reminder.due_time].filter(Boolean).join(" "))}</span>
                  <span class="chip ${priorityClass(reminder.priority)}">${escapeHtml(reminder.priority || "Normal")}</span>
                </div>
              </div>
              <div class="followup-actions">
                <button class="small-action" type="button" data-followup-open="${escapeHtml(reminder.lead_id)}">Open Lead</button>
                <button class="small-action" type="button" data-followup-complete="${escapeHtml(reminder.lead_id)}" data-followup-index="${escapeHtml(reminder.activity_index ?? "")}" data-followup-date="${escapeHtml(reminder.due_date || "")}" data-followup-time="${escapeHtml(reminder.due_time || "")}" data-followup-text="${escapeHtml(reminder.activity_required || reminder.text || "")}" data-followup-type="${escapeHtml(reminder.reminder_type || "General follow-up")}">Complete</button>
                <button class="small-action" type="button" data-followup-reschedule="${escapeHtml(reminder.lead_id)}" data-followup-index="${escapeHtml(reminder.activity_index ?? "")}" data-followup-text="${escapeHtml(reminder.activity_required || reminder.text || "")}" data-followup-type="${escapeHtml(reminder.reminder_type || "General follow-up")}">Reschedule</button>
                <button class="small-action" type="button" data-followup-note="${escapeHtml(reminder.lead_id)}">Add Note</button>
              </div>
            </article>
          `;
        }).join("") || `<p class="empty-copy">No follow-ups in this bucket.</p>`}
      </div>
    </section>
  `).join("");
  bindFollowupActions();
}

function renderPortfolioAnalytics() {
  if (!els.portfolioPanel || state.currentUser?.role === "admin") return;
  const leads = portfolioFilteredLeads();
  const allDue = salesmanFollowups();
  const overdue = allDue.filter(reminder => daysUntil(reminder.due_date) < 0);
  els.portfolioTotal.textContent = leads.length;
  els.portfolioActive.textContent = leads.filter(lead => lead.stage === "ACTIVE").length;
  els.portfolioDormant.textContent = leads.filter(lead => lead.stage === "DORMANT").length;
  els.portfolioHot.textContent = leads.filter(lead => String(lead.priority || "").toLowerCase() === "hot").length;
  els.portfolioDue.textContent = allDue.filter(reminder => daysUntil(reminder.due_date) <= 7).length;
  els.portfolioOverdue.textContent = overdue.length;

  const reportView = state.portfolioFilters.reportView;
  const counts = reportView === "country"
    ? countBy(leads, inferCountry)
    : reportView === "emirate"
      ? countBy(leads, inferEmirate)
      : countBy(leads, lead => lead.stage || "PROSPECT");
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const slices = pieSlices(entries);
  els.portfolioPie.style.background = slices.length
    ? `conic-gradient(${slices.map(slice => `${slice.color} ${slice.start}% ${slice.end}%`).join(", ")})`
    : "#edf2f7";
  els.portfolioPie.innerHTML = `<span>${leads.length}<small>leads</small></span>`;
  els.portfolioLegend.innerHTML = slices.map(slice => `
    <span><i style="background:${slice.color}"></i>${escapeHtml(slice.label)} <strong>${slice.count}</strong></span>
  `).join("") || `<p class="empty-copy">No leads match the selected filters.</p>`;

  const stageCounts = Object.entries(countBy(leads, lead => lead.stage || "PROSPECT")).sort((a, b) => b[1] - a[1]);
  const countryCounts = Object.entries(countBy(leads, inferCountry)).sort((a, b) => b[1] - a[1]);
  const dormantPct = leads.length ? Math.round((leads.filter(lead => lead.stage === "DORMANT").length / leads.length) * 100) : 0;
  const concentration = entries[0] ? `${entries[0][0]} (${entries[0][1]})` : "No data";
  els.portfolioInsights.innerHTML = `
    <article><span>Highest Lead Concentration</span><strong>${escapeHtml(concentration)}</strong></article>
    <article><span>Most Active Stage</span><strong>${escapeHtml(stageCounts[0] ? `${stageCounts[0][0]} (${stageCounts[0][1]})` : "No data")}</strong></article>
    <article><span>Region With Most Leads</span><strong>${escapeHtml(countryCounts[0] ? `${countryCounts[0][0]} (${countryCounts[0][1]})` : "No data")}</strong></article>
    <article><span>Dormant Lead Percentage</span><strong>${dormantPct}%</strong></article>
    <article><span>Immediate Attention</span><strong>${overdue.length}</strong></article>
  `;
}

function renderSalesmanDashboard() {
  renderSalesmanFollowups();
  renderPortfolioAnalytics();
}

function renderDashboardView() {
  renderPerformanceAnalytics();
  renderLossReasonsAnalytics();
  renderSalesmanDashboard();
  const focus = [...state.leads]
    .sort((a, b) => {
      const healthRank = { RED: 0, AMBER: 1, GREEN: 2 };
      return (healthRank[a.health?.label] ?? 1) - (healthRank[b.health?.label] ?? 1)
        || String(a.next_action_date || "").localeCompare(String(b.next_action_date || ""));
    })
    .slice(0, 5);
  els.dashboardFocus.innerHTML = focus.map(lead => `
    <button class="insight-item" data-focus-lead="${escapeHtml(lead.id)}">
      <div>
        <strong>${escapeHtml(lead.company_name)}</strong>
        <p>${escapeHtml(lead.next_action || "Qualify relationship")}</p>
      </div>
      <span class="chip ${healthClass(lead.health)}">${escapeHtml(lead.health?.label || "AMBER")}</span>
    </button>
  `).join("") || `<p class="empty-copy">No companies yet.</p>`;

  document.querySelectorAll("[data-focus-lead]").forEach(button => {
    button.addEventListener("click", () => {
      state.selectedId = button.dataset.focusLead;
      openLeadDrawer(button.dataset.focusLead);
    });
  });

  els.dashboardStatus.innerHTML = (state.settings.stages || []).map(stage => {
    const count = state.leads.filter(lead => lead.stage === stage).length;
    return `
      <article class="status-card">
        <span class="meta-label">${escapeHtml(stage)}</span>
        <strong>${count}</strong>
      </article>
    `;
  }).join("");
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
        <span class="chip ${healthClass(lead.health)}">${escapeHtml(lead.health?.label || "AMBER")}</span>
        <span class="chip">${escapeHtml(lead.territory)}</span>
        <span class="chip">${escapeHtml(lead.assigned_salesman)}</span>
      </div>
    </button>
  `).join("");

  document.querySelectorAll(".lead-card").forEach(card => {
    card.addEventListener("click", () => {
      state.selectedId = card.dataset.leadId;
      openLeadDrawer(card.dataset.leadId);
      render();
    });
  });
}

function formatAED(value) {
  const number = Number(value || 0);
  return number ? `AED ${number.toLocaleString("en-AE")}` : "AED -";
}

function leadInitial(lead) {
  return String(lead?.company_name || "?").trim().charAt(0).toUpperCase() || "?";
}

function drawerStageLabel(stage) {
  const match = KANBAN_STAGES.find(item => item.key === String(stage || "").toUpperCase() || item.aliases.includes(String(stage || "").toUpperCase()));
  return match?.label || stage || "Prospect";
}

function drawerStageClass(stage) {
  const key = kanbanStageForLead({ stage });
  return KANBAN_STAGE_BY_KEY[key]?.color || "stage-prospect";
}

function isLostStageValue(stage) {
  return kanbanStageForLead({ stage }) === "DORMANT" || String(stage || "").trim().toUpperCase() === "LOST";
}

function lostReasonLabel(value) {
  return LOST_REASON_LABELS[value] || "Not captured";
}

function lostByLabel(lead) {
  const lostBy = String(lead.lost_by || "").trim().toLowerCase();
  if (!lostBy) return "";
  const user = (state.settings.salesmen || []).find(person => {
    const tokens = normalizedUserTokens(person);
    return tokens.includes(lostBy);
  });
  return user ? salesmanName(user) : lead.lost_by;
}

function resetLostReasonForm() {
  els.lostReasonForm?.reset();
  if (els.lostReasonMessage) els.lostReasonMessage.textContent = "";
  els.lostCompetitorField?.classList.add("hidden");
  if (els.lostReasonCount) els.lostReasonCount.textContent = "0 / 500";
}

function updateLostReasonUi() {
  const reason = els.lostReasonSelect?.value || "";
  const needsCompetitor = reason === "price" || reason === "competitor_relationship";
  els.lostCompetitorField?.classList.toggle("hidden", !needsCompetitor);
  if (els.lostReasonCount && els.lostReasonDetail) {
    els.lostReasonCount.textContent = `${els.lostReasonDetail.value.length} / 500`;
  }
}

function promptLostReason(lead) {
  return new Promise(resolve => {
    state.lostReasonRequest = { leadId: lead.id, resolve };
    resetLostReasonForm();
    if (els.lostReasonLeadName) els.lostReasonLeadName.textContent = lead.company_name || "Selected lead";
    els.lostReasonDialog?.showModal();
  });
}

function resolveLostReason(value) {
  const request = state.lostReasonRequest;
  state.lostReasonRequest = null;
  els.lostReasonDialog?.close();
  if (request?.resolve) request.resolve(value);
}

async function saveStageWithLostPrompt(lead, stage, existingLossData = null) {
  if (!lead) return { cancelled: true };
  const wasLost = isLostStageValue(lead.stage);
  const willBeLost = isLostStageValue(stage);
  let lostData = existingLossData;
  if (willBeLost && !wasLost && !lostData) {
    lostData = await promptLostReason(lead);
    if (!lostData) return { cancelled: true };
  }
  const body = willBeLost ? { stage, ...(lostData || {}) } : { stage };
  const updated = await api(`/api/leads/${encodeURIComponent(lead.id)}/stage`, {
    method: "PATCH",
    body: JSON.stringify(body)
  });
  const index = state.leads.findIndex(item => item.id === lead.id);
  if (index >= 0) state.leads[index] = { ...state.leads[index], ...updated };
  return { updated };
}

function openLeadDrawer(leadId, tab = "overview") {
  const lead = state.leads.find(item => item.id === leadId);
  if (!lead) return;
  state.selectedId = leadId;
  state.leadDrawerOpen = true;
  state.leadDrawerTab = tab;
  state.leadDrawerLoading = true;
  state.leadDrawerPmrs = [];
  renderLeadDrawer();
  api(`/api/leads/${encodeURIComponent(leadId)}/pmrs`)
    .then(pmrs => {
      if (state.selectedId === leadId) state.leadDrawerPmrs = pmrs || [];
    })
    .catch(error => {
      state.leadDrawerPmrs = [];
      setToast(`PMRs could not be loaded: ${error.message}`, "error");
    })
    .finally(() => {
      if (state.selectedId === leadId) {
        state.leadDrawerLoading = false;
        renderLeadDrawer();
        loadActivityAudioSources();
      }
    });
}

function closeLeadDrawer() {
  state.leadDrawerOpen = false;
  state.leadDrawerLoading = false;
  if (els.leadDrawerShell) {
    els.leadDrawerShell.classList.add("closing");
    setTimeout(() => {
      els.leadDrawerShell.classList.add("hidden");
      els.leadDrawerShell.classList.remove("open", "closing");
      els.leadDrawerShell.setAttribute("aria-hidden", "true");
    }, 240);
  }
}

function drawerSkeleton() {
  return `
    <div class="drawer-skeleton">
      <span></span><span></span><span></span><span></span>
      <div></div><div></div><div></div>
    </div>
  `;
}

function detailField(label, value, options = {}) {
  if (!value) value = "Not added";
  const content = options.href
    ? `<a href="${escapeHtml(options.href)}" ${options.external ? 'target="_blank" rel="noopener"' : ""}>${escapeHtml(value)}</a>`
    : escapeHtml(value);
  return `<article class="drawer-field ${options.overdue ? "overdue" : ""}"><span>${escapeHtml(label)}</span><strong>${content}</strong></article>`;
}

function tagPills(value) {
  return String(value || "").split(",").map(tag => tag.trim()).filter(Boolean)
    .map(tag => `<span class="chip">${escapeHtml(tag)}</span>`).join("") || `<span class="empty-copy">No tags added.</span>`;
}

function renderLossDetails(lead) {
  if (!isLostStageValue(lead.stage)) return "";
  return `
    <section class="drawer-section loss-details">
      <h3>Loss Details</h3>
      <div class="drawer-field-grid">
        ${detailField("Reason", lostReasonLabel(lead.lost_reason))}
        ${detailField("Competitor", lead.lost_competitor)}
        ${detailField("Lost on", lead.lost_at ? new Date(lead.lost_at).toLocaleDateString("en-AE", { year: "numeric", month: "long", day: "numeric" }) : "")}
        ${detailField("Lost by", lostByLabel(lead))}
      </div>
      <p class="drawer-remarks">${escapeHtml(lead.lost_reason_detail || "No additional loss notes captured.")}</p>
    </section>
  `;
}

function renderDrawerOverview(lead) {
  const overdue = lead.next_action_date && lead.next_action_date < today();
  return `
    <section class="drawer-section">
      <h3>Contact Information</h3>
      <div class="drawer-field-grid">
        ${detailField("Primary contact", [lead.contact_person, lead.primary_contact_title].filter(Boolean).join(" - "))}
        ${detailField("Phone", lead.phone, lead.phone ? { href: `tel:${lead.phone}` } : {})}
        ${detailField("Email", lead.email, lead.email ? { href: `mailto:${lead.email}` } : {})}
        ${detailField("Secondary contact", [lead.secondary_contact_name, lead.secondary_contact_title].filter(Boolean).join(" - "))}
        ${detailField("Secondary phone", lead.secondary_contact_mobile, lead.secondary_contact_mobile ? { href: `tel:${lead.secondary_contact_mobile}` } : {})}
        ${detailField("Secondary email", lead.secondary_contact_email, lead.secondary_contact_email ? { href: `mailto:${lead.secondary_contact_email}` } : {})}
        ${detailField("Website", lead.website, lead.website ? { href: lead.website, external: true } : {})}
        ${detailField("Google Maps", lead.google_maps_url ? "Open map" : "", lead.google_maps_url ? { href: lead.google_maps_url, external: true } : {})}
      </div>
    </section>
    <section class="drawer-section">
      <h3>Company & Commercial Details</h3>
      <div class="drawer-field-grid">
        ${detailField("Legal name", lead.legal_name)}
        ${detailField("Year established", lead.year_established)}
        ${detailField("Industry", lead.industry || lead.business_category)}
        ${detailField("Product interest", lead.product_interest)}
        ${detailField("Quotation ref", lead.quotation_ref)}
        ${detailField("First order date", lead.first_order_date)}
        ${detailField("Monthly volume", lead.estimated_monthly_volume)}
        ${detailField("Assigned salesman", lead.assigned_salesman)}
        ${detailField("Next action date", lead.next_action_date ? `${lead.next_action_date}${overdue ? " - overdue" : ""}` : "", { overdue })}
        ${detailField("Next action", lead.next_action)}
      </div>
      <div class="drawer-tags">${tagPills(lead.tags)}</div>
      <p class="drawer-remarks">${escapeHtml(lead.products_services_remarks || "No products/services remarks added.")}</p>
    </section>
    ${renderLossDetails(lead)}
    <div class="drawer-quick-actions">
      <a class="ghost-button" href="${lead.phone ? `tel:${escapeHtml(lead.phone)}` : "#"}">Call</a>
      <a class="ghost-button" href="${lead.email ? `mailto:${escapeHtml(lead.email)}` : "#"}">Email</a>
      <button class="ghost-button" type="button" data-drawer-log-activity="${escapeHtml(lead.id)}">Log Activity</button>
      <button class="primary-button" type="button" data-drawer-edit-lead="${escapeHtml(lead.id)}">Edit Lead</button>
    </div>
  `;
}

function renderDrawerActivities(lead) {
  const activities = [...(lead.activities || [])].sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
  return `
    <section class="drawer-section">
      <div class="drawer-tab-heading"><h3>Activities</h3><button class="ghost-button" type="button" data-drawer-log-activity="${escapeHtml(lead.id)}">Log New Activity</button></div>
      <div class="drawer-list">
        ${activities.map((activity, index) => `
          <article class="drawer-activity ${activityTypeClass(activity.type)}">
            <div><span class="activity-type-label"><i>${escapeHtml(ACTIVITY_TYPE_ICONS[activity.type] || "ACT")}</i>${escapeHtml(activity.type || "Note")}</span><span class="meta-label">${escapeHtml(activity.at || "")}</span></div>
            <p class="activity-note clamp" data-expand-note>${escapeHtml(activity.text || activity.note || "No note added.")}</p>
            <div class="activity-actions">${activityEditButton(lead.id, index, activity)}${activityDeleteButton(lead.id, index, activity)}</div>
          </article>
        `).join("") || `<div class="timeline-empty"><strong>No activities logged yet.</strong><span>Log the first one.</span><button class="ghost-button" type="button" data-drawer-log-activity="${escapeHtml(lead.id)}">Log Activity</button></div>`}
      </div>
    </section>
  `;
}

function heatClass(value) {
  const score = Number(value || 0);
  if (score >= 4) return "hot";
  if (score >= 2) return "warm";
  return "cold";
}

function renderDrawerPmrs(lead) {
  return `
    <section class="drawer-section">
      <div class="drawer-tab-heading"><h3>Post-Meeting Reports</h3><button class="ghost-button" type="button" data-drawer-file-pmr="${escapeHtml(lead.id)}">File New PMR</button></div>
      <div class="drawer-list">
        ${state.leadDrawerPmrs.map(pmr => `
          <article class="drawer-pmr">
            <div class="drawer-card-title"><strong>${escapeHtml(pmr.meeting_date || "Meeting")}</strong><span class="chip ${heatClass(pmr.relationship_heat_score)}">Heat ${escapeHtml(pmr.relationship_heat_score || "3")}/5</span></div>
            <div class="chip-row">
              <span class="chip">${escapeHtml(pmr.first_order_timing || "Timing unknown")}</span>
              <span class="chip">${escapeHtml(pmr.potential_annual_value || "Value unknown")}</span>
              <span class="chip">${escapeHtml(pmr.director_action_required || "No director action")}</span>
            </div>
            <p class="activity-note clamp" data-expand-note>${escapeHtml(pmr.notes || "No PMR notes added.")}</p>
            ${pmr.voice_note_url || pmr.voice_note_id ? `<audio class="activity-audio" controls preload="metadata" data-voice-note-id="${escapeHtml(pmr.voice_note_id || "")}" ${pmr.voice_note_url ? `src="${escapeHtml(pmr.voice_note_url)}"` : ""}></audio>` : ""}
          </article>
        `).join("") || `<div class="timeline-empty"><strong>No PMRs filed yet.</strong><span>File a report after the next customer meeting.</span></div>`}
      </div>
    </section>
  `;
}

function renderDrawerReminders(lead) {
  const reminders = remindersForLead(lead);
  const overdue = reminders.filter(reminder => reminder.due_date && reminder.due_date < today());
  const upcoming = reminders.filter(reminder => !reminder.due_date || reminder.due_date >= today());
  const card = reminder => {
    const days = daysUntil(reminder.due_date);
    return `<article class="reminder-card ${days < 0 ? "overdue" : ""}">
      <div><span class="meta-label">${escapeHtml([reminder.due_date, reminder.due_time].filter(Boolean).join(" "))}</span><strong>${escapeHtml(reminder.reminder_type || "Reminder")}</strong><p>${escapeHtml(reminder.activity_required || reminder.text || "Follow up")}</p></div>
      <span class="chip ${days < 0 ? "hot" : "warm"}">${days < 0 ? `${Math.abs(days)} days overdue` : `Due in ${days} days`}</span>
    </article>`;
  };
  return `
    <section class="drawer-section">
      <div class="drawer-tab-heading"><h3>Reminders</h3><button class="ghost-button" type="button" data-drawer-add-reminder="${escapeHtml(lead.id)}">Add Reminder</button></div>
      ${overdue.length ? `<h4>Overdue</h4><div class="drawer-list">${overdue.map(card).join("")}</div>` : ""}
      <h4>Upcoming</h4><div class="drawer-list">${upcoming.map(card).join("") || `<p class="empty-copy">No upcoming reminders.</p>`}</div>
    </section>
  `;
}

function renderDrawerNotes(lead) {
  return `
    <section class="drawer-section">
      <div class="drawer-tab-heading"><h3>Notes</h3><button class="ghost-button" type="button" data-drawer-edit-notes>Edit Notes</button></div>
      <div class="drawer-notes-view">
        <p>${escapeHtml(lead.notes || "No notes added yet.")}</p>
      </div>
      <form class="drawer-notes-form hidden" id="drawerNotesForm">
        <textarea name="notes" rows="8">${escapeHtml(lead.notes || "")}</textarea>
        <button class="primary-button" type="submit">Save Notes</button>
      </form>
      ${lead.voice_note_url ? `<audio class="activity-audio" controls src="${escapeHtml(lead.voice_note_url)}"></audio>` : ""}
    </section>
  `;
}

function renderLeadDrawer() {
  const lead = state.leads.find(item => item.id === state.selectedId);
  if (!state.leadDrawerOpen || !lead || !els.leadDrawerShell) return;
  els.leadDrawerShell.classList.remove("hidden", "closing");
  requestAnimationFrame(() => els.leadDrawerShell.classList.add("open"));
  els.leadDrawerShell.setAttribute("aria-hidden", "false");
  const admin = ["admin", "manager"].includes(String(state.currentUser?.role || "").toLowerCase());
  const tabs = ["overview", "activities", "pmr", "reminders", "notes"];
  const tabLabels = { overview: "Overview", activities: "Activities", pmr: "PMR", reminders: "Reminders", notes: "Notes" };
  const body = state.leadDrawerLoading ? drawerSkeleton() : ({
    overview: renderDrawerOverview(lead),
    activities: renderDrawerActivities(lead),
    pmr: renderDrawerPmrs(lead),
    reminders: renderDrawerReminders(lead),
    notes: renderDrawerNotes(lead)
  }[state.leadDrawerTab] || renderDrawerOverview(lead));
  els.leadDrawerContent.innerHTML = `
    <header class="drawer-header">
      <div class="drawer-title-row">
        <div class="drawer-avatar ${kanbanPriorityTone(lead.priority)}">${escapeHtml(leadInitial(lead))}</div>
        <div>
          <h2 id="leadDrawerTitle">${escapeHtml(lead.company_name || "Lead")}</h2>
          <p>${escapeHtml([lead.sector || lead.industry, inferEmirate(lead), lead.territory].filter(Boolean).join(" - "))}</p>
        </div>
        <button class="drawer-close" type="button" id="leadDrawerClose" aria-label="Close lead drawer">&times;</button>
      </div>
      <div class="drawer-badges">
        ${admin ? `<select class="drawer-stage-select ${drawerStageClass(lead.stage)}" id="drawerStageSelect">${(state.settings.stages || []).map(stage => `<option value="${escapeHtml(stage)}" ${stage === lead.stage ? "selected" : ""}>${escapeHtml(drawerStageLabel(stage))}</option>`).join("")}</select>` : `<span class="drawer-stage-pill ${drawerStageClass(lead.stage)}">${escapeHtml(drawerStageLabel(lead.stage))}</span>`}
        <span class="chip ${priorityClass(lead.priority)}">${escapeHtml(lead.priority || "Cold")}</span>
        <span class="chip">${escapeHtml(formatAED(lead.estimated_value))}</span>
      </div>
    </header>
    <nav class="drawer-tabs">${tabs.map(tab => `<button type="button" class="${state.leadDrawerTab === tab ? "active" : ""}" data-drawer-tab="${tab}">${tabLabels[tab]}</button>`).join("")}</nav>
    <div class="drawer-body">${body}</div>
  `;
  bindLeadDrawerEvents();
}

function bindLeadDrawerEvents() {
  document.querySelector("#leadDrawerClose")?.addEventListener("click", closeLeadDrawer);
  document.querySelectorAll("[data-drawer-tab]").forEach(button => {
    button.addEventListener("click", () => {
      state.leadDrawerTab = button.dataset.drawerTab;
      renderLeadDrawer();
      loadActivityAudioSources();
    });
  });
  document.querySelector("#drawerStageSelect")?.addEventListener("change", async event => {
    const leadId = state.selectedId;
    const stage = event.target.value;
    const lead = state.leads.find(item => item.id === leadId);
    if (!lead) return;
    const previous = lead.stage;
    try {
      const result = await saveStageWithLostPrompt(lead, stage);
      if (result.cancelled) {
        event.target.value = previous;
        renderLeadDrawer();
        return;
      }
      Object.assign(lead, result.updated);
      setToast(`Lead moved to ${drawerStageLabel(stage)}`, "success");
      render();
    } catch (error) {
      lead.stage = previous;
      setToast(error.message, "error");
      renderLeadDrawer();
    }
  });
  document.querySelectorAll("[data-drawer-log-activity]").forEach(button => {
    button.addEventListener("click", () => logDrawerActivity(button.dataset.drawerLogActivity));
  });
  document.querySelectorAll("[data-drawer-add-reminder]").forEach(button => {
    button.addEventListener("click", () => addDrawerReminder(button.dataset.drawerAddReminder));
  });
  document.querySelectorAll("[data-drawer-file-pmr]").forEach(button => {
    button.addEventListener("click", () => openPmrForLead(button.dataset.drawerFilePmr));
  });
  document.querySelectorAll("[data-drawer-edit-lead]").forEach(button => {
    button.addEventListener("click", () => openLeadEdit(button.dataset.drawerEditLead));
  });
  document.querySelector("[data-drawer-edit-notes]")?.addEventListener("click", () => {
    document.querySelector(".drawer-notes-view")?.classList.add("hidden");
    document.querySelector("#drawerNotesForm")?.classList.remove("hidden");
  });
  document.querySelector("#drawerNotesForm")?.addEventListener("submit", async event => {
    event.preventDefault();
    const lead = state.leads.find(item => item.id === state.selectedId);
    if (!lead) return;
    const notes = new FormData(event.currentTarget).get("notes");
    try {
      const updated = await api(`/api/leads/${lead.id}`, { method: "PATCH", body: JSON.stringify({ notes }) });
      Object.assign(lead, updated);
      setToast("Notes updated.", "success");
      renderLeadDrawer();
      renderDetail();
    } catch (error) {
      setToast(error.message, "error");
    }
  });
  document.querySelectorAll("[data-expand-note]").forEach(note => {
    note.addEventListener("click", event => {
      event.stopPropagation();
      note.classList.toggle("clamp");
    });
  });
  bindActivityEditButtons();
  bindDeleteButtons();
}

async function logDrawerActivity(leadId) {
  const text = window.prompt("Activity note:");
  if (!text?.trim()) return;
  try {
    await api(`/api/leads/${encodeURIComponent(leadId)}/activities`, {
      method: "POST",
      body: JSON.stringify({ type: "Note", text: text.trim() })
    });
    setToast("Activity logged.", "success");
    await loadLeads();
    openLeadDrawer(leadId, "activities");
  } catch (error) {
    setToast(error.message, "error");
  }
}

async function addDrawerReminder(leadId) {
  const activity_required = window.prompt("Reminder note:");
  if (!activity_required?.trim()) return;
  const due_date = window.prompt("Reminder date (YYYY-MM-DD):", today());
  if (!due_date?.trim()) return;
  try {
    await api(`/api/leads/${encodeURIComponent(leadId)}/activities`, {
      method: "POST",
      body: JSON.stringify({
        type: "Reminder",
        reminder: true,
        reminder_type: "General follow-up",
        activity_required: activity_required.trim(),
        text: activity_required.trim(),
        due_date: due_date.trim(),
        due_time: "09:00"
      })
    });
    setToast("Reminder added.", "success");
    await loadLeads();
    openLeadDrawer(leadId, "reminders");
  } catch (error) {
    setToast(error.message, "error");
  }
}

function openPmrForLead(leadId) {
  const lead = state.leads.find(item => item.id === leadId);
  if (!lead) return;
  els.pmrMessage.textContent = "";
  els.pmrForm.reset();
  resetPmrVoiceNote();
  els.pmrForm.elements.company_id.value = lead.id;
  els.pmrForm.elements.meeting_date.value = today();
  els.pmrDialog.showModal();
}

function openLeadEdit(leadId) {
  const lead = state.leads.find(item => item.id === leadId);
  if (!lead) return;
  state.editingLeadId = leadId;
  state.editingOriginalStage = lead.stage || "";
  state.editingLostData = null;
  leadFormTouched.clear();
  els.leadForm.reset();
  Object.entries(lead).forEach(([key, value]) => {
    const field = els.leadForm.elements[key];
    if (!field) return;
    field.value = formValue(value);
  });
  setEnrichmentStatus("Editing existing lead. Review changes before saving.", "success");
  els.leadDialog.showModal();
}

function kanbanStageForLead(lead) {
  const raw = String(lead.stage || "").trim().toUpperCase();
  const match = KANBAN_STAGES.find(stage => stage.key === raw || stage.aliases.includes(raw));
  return match?.key || "PROSPECT";
}

function canDragKanban() {
  return ["admin", "manager"].includes(String(state.currentUser?.role || "").toLowerCase());
}

function kanbanPriorityTone(priority) {
  const value = String(priority || "").toLowerCase();
  if (value.includes("hot")) return "hot";
  if (value.includes("warm")) return "warm";
  return "cold";
}

function renderKanbanView() {
  if (!els.kanbanPanel) return;
  const leads = filteredLeads();
  const activeStage = KANBAN_STAGE_BY_KEY[state.kanbanStage] ? state.kanbanStage : KANBAN_STAGES[0].key;
  const dragEnabled = canDragKanban();
  els.kanbanSummary.textContent = `${leads.length} record${leads.length === 1 ? "" : "s"}`;

  els.kanbanMobileStages.innerHTML = KANBAN_STAGES.map(stage => {
    const count = leads.filter(lead => kanbanStageForLead(lead) === stage.key).length;
    return `
      <button class="kanban-stage-tab ${stage.key === activeStage ? "active" : ""}" type="button" data-kanban-tab="${stage.key}">
        ${escapeHtml(stage.label)} <span>${count}</span>
      </button>
    `;
  }).join("");

  els.kanbanBoard.innerHTML = KANBAN_STAGES.map(stage => {
    const stageLeads = leads.filter(lead => kanbanStageForLead(lead) === stage.key);
    const stageValue = stageLeads.reduce((sum, lead) => sum + Number(lead.estimated_value || 0), 0);
    const cards = stageLeads.length ? stageLeads.map(lead => {
      const overdue = Boolean(lead.next_action_date) && new Date(`${lead.next_action_date}T23:59:59`) < new Date();
      const priorityTone = kanbanPriorityTone(lead.priority);
      return `
        <article
          class="kanban-card priority-${priorityTone}"
          data-kanban-lead="${escapeHtml(lead.id)}"
          draggable="${dragEnabled ? "true" : "false"}"
          role="button"
          tabindex="0"
          aria-label="Open ${escapeHtml(lead.company_name || "lead")}"
        >
          <div class="kanban-card-title">
            <strong>${escapeHtml(lead.company_name || "Unnamed company")}</strong>
            <span class="kanban-priority ${priorityTone}">${escapeHtml(lead.priority || "Cold")}</span>
          </div>
          ${isLostStageValue(lead.stage) && lead.lost_reason ? `<span class="lost-reason-tag">${escapeHtml(lostReasonLabel(lead.lost_reason))}</span>` : ""}
          <span class="kanban-salesman">${escapeHtml(lead.assigned_salesman || "Unassigned")}</span>
          <div class="kanban-card-meta">
            <span>${escapeHtml(formatAED(lead.estimated_value))}</span>
            <span class="${overdue ? "overdue" : ""}">${overdue ? "! " : ""}${escapeHtml(lead.next_action_date || "No follow-up")}</span>
          </div>
          <span class="kanban-territory">${escapeHtml(lead.territory || inferEmirate(lead))}</span>
        </article>
      `;
    }).join("") : `
      <div class="kanban-empty">
        <strong>No leads here</strong>
        <span>${dragEnabled ? "Drag a card or add a new lead" : "No assigned leads in this stage"}</span>
      </div>
    `;
    return `
      <section class="kanban-column ${stage.key === activeStage ? "active" : ""}" data-kanban-stage="${stage.key}">
        <div class="kanban-column-header ${stage.color}">
          <div>
            <h3>${escapeHtml(stage.label)}</h3>
            <span>${stageLeads.length} lead${stageLeads.length === 1 ? "" : "s"}</span>
          </div>
          <strong>${escapeHtml(formatAED(stageValue))}</strong>
        </div>
        <div class="kanban-card-list">${cards}</div>
      </section>
    `;
  }).join("");

  bindKanbanEvents();
}

function bindKanbanEvents() {
  document.querySelectorAll("[data-kanban-tab]").forEach(button => {
    button.addEventListener("click", () => {
      state.kanbanStage = button.dataset.kanbanTab;
      localStorage.setItem("arg_kanban_stage", state.kanbanStage);
      renderKanbanView();
    });
  });

  document.querySelectorAll("[data-kanban-lead]").forEach(card => {
    card.addEventListener("click", () => {
      state.selectedId = card.dataset.kanbanLead;
      openLeadDrawer(card.dataset.kanbanLead);
      renderDetail();
    });
    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        state.selectedId = card.dataset.kanbanLead;
        openLeadDrawer(card.dataset.kanbanLead);
        renderDetail();
      }
    });
    card.addEventListener("dragstart", event => {
      if (!canDragKanban()) {
        event.preventDefault();
        return;
      }
      state.draggedLeadId = card.dataset.kanbanLead;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", state.draggedLeadId);
      card.classList.add("dragging");
    });
    card.addEventListener("dragend", () => {
      state.draggedLeadId = "";
      card.classList.remove("dragging");
      document.querySelectorAll(".kanban-column.drag-over").forEach(column => column.classList.remove("drag-over"));
    });
  });

  document.querySelectorAll("[data-kanban-stage]").forEach(column => {
    column.addEventListener("dragover", event => {
      if (!canDragKanban() || !state.draggedLeadId) return;
      event.preventDefault();
      column.classList.add("drag-over");
    });
    column.addEventListener("dragleave", () => column.classList.remove("drag-over"));
    column.addEventListener("drop", async event => {
      event.preventDefault();
      column.classList.remove("drag-over");
      await moveKanbanLead(state.draggedLeadId || event.dataTransfer.getData("text/plain"), column.dataset.kanbanStage);
    });
  });
}

async function moveKanbanLead(leadId, stage) {
  if (!leadId || !stage || !canDragKanban()) return;
  const lead = state.leads.find(item => item.id === leadId);
  if (!lead || kanbanStageForLead(lead) === stage) return;
  const label = KANBAN_STAGE_BY_KEY[stage]?.label || stage;
  try {
    const result = await saveStageWithLostPrompt(lead, stage);
    if (result.cancelled) return;
    setToast(`Lead moved to ${label}`, "success");
    render();
  } catch (error) {
    setToast(error.message, "error");
  }
}

function renderSalesmenView() {
  if (state.currentUser?.role !== "admin") {
    els.salesmenSummary.textContent = "My workspace";
    els.salesmenGrid.innerHTML = `<p class="empty-copy">Salesman accounts are visible to administrators only.</p>`;
    return;
  }
  const salesmen = state.settings.salesmen || [];
  els.salesmenSummary.textContent = `${salesmen.length} ${salesmen.length === 1 ? "salesman" : "salespeople"}`;
  els.salesmenGrid.innerHTML = salesmen.map(person => {
    const name = typeof person === "string" ? person : person.name;
    const owned = state.leads.filter(lead => lead.assigned_salesman === name);
    const value = owned.reduce((sum, lead) => sum + Number(lead.estimated_value || 0), 0);
    const overdue = owned.filter(isOverdue).length;
    const hot = owned.filter(lead => lead.priority === "Hot").length;
    return `
      <article class="salesman-card">
        <div>
          <h2>${escapeHtml(name)}</h2>
          <p>${escapeHtml((typeof person === "string" ? "" : person.territory) || "Territory not set")}</p>
        </div>
        <div class="mini-metrics">
          <span><strong>${owned.length}</strong> Companies</span>
          <span><strong>${money.format(value)}</strong> Open value</span>
          <span><strong>${hot}</strong> Hot</span>
          <span><strong>${overdue}</strong> Overdue</span>
        </div>
      </article>
    `;
  }).join("") || `<p class="empty-copy">No salesman accounts found.</p>`;
}

function allActivities() {
  return state.leads.flatMap(lead => (lead.activities || []).map((activity, index) => ({ ...activity, company_name: lead.company_name, lead_id: lead.id, activity_index: index })))
    .sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
}

function activityPresetRange(preset) {
  const now = new Date();
  const start = new Date(now);
  if (preset === "Today") {
    return { dateFrom: isoDateFromDate(now), dateTo: isoDateFromDate(now) };
  }
  if (preset === "This Week") {
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
    return { dateFrom: isoDateFromDate(start), dateTo: isoDateFromDate(now) };
  }
  if (preset === "This Month") {
    start.setDate(1);
    return { dateFrom: isoDateFromDate(start), dateTo: isoDateFromDate(now) };
  }
  if (preset === "Last 90 Days") {
    return { dateFrom: isoDateFromDate(addDays(now, -90)), dateTo: isoDateFromDate(now) };
  }
  return defaultActivityRange();
}

function activityFiltersAreDefault() {
  const defaults = defaultActivityFilters();
  const filters = state.activityFilters;
  return filters.salesmanId === defaults.salesmanId
    && filters.dateFrom === defaults.dateFrom
    && filters.dateTo === defaults.dateTo
    && filters.companySearch === defaults.companySearch
    && filters.types.length === defaults.types.length
    && filters.types.every(type => defaults.types.includes(type));
}

function updateActivityFilter(key, value) {
  state.activityFilters = { ...state.activityFilters, [key]: value };
  if (key === "dateFrom" || key === "dateTo") state.activityFilters.preset = "";
  saveActivityFilters();
  renderActivityFilters();
  fetchActivities();
}

function resetActivityFilters() {
  state.activityFilters = defaultActivityFilters();
  saveActivityFilters();
  renderActivityFilters();
  fetchActivities();
}

function renderActivityFilters() {
  const filters = state.activityFilters;
  const admin = state.currentUser?.role === "admin" || state.currentUser?.role === "manager";
  els.activityFilterBar?.classList.toggle("collapsed", !state.activityFiltersOpen);
  els.activityFilterToggle?.classList.toggle("active", state.activityFiltersOpen);
  els.activitySalesmanFilter?.closest("label")?.classList.toggle("hidden", !admin);
  fillSelect(els.activitySalesmanFilter, state.settings.salesmen || [], "All Salesmen");
  els.activitySalesmanFilter.value = filters.salesmanId || "all";
  els.activityTypePills.innerHTML = allActivityTypes().map(type => `
    <button class="type-pill ${filters.types.includes(type) ? "active" : ""}" type="button" data-activity-type="${escapeHtml(type)}">
      <span>${escapeHtml(ACTIVITY_TYPE_ICONS[type] || "")}</span>${escapeHtml(type)}
    </button>
  `).join("");
  els.activityDatePresets.innerHTML = ACTIVITY_PRESETS.map(preset => `
    <button class="date-preset ${filters.preset === preset ? "active" : ""}" type="button" data-activity-preset="${escapeHtml(preset)}">${escapeHtml(preset)}</button>
  `).join("");
  els.activityDateFrom.value = filters.dateFrom || "";
  els.activityDateTo.value = filters.dateTo || "";
  els.activityCompanySearch.value = filters.companySearch || "";
  els.activitySearchClear.classList.toggle("hidden", !filters.companySearch);
  els.activityResetFilters.classList.toggle("hidden", activityFiltersAreDefault());
  bindActivityFilterButtons();
}

function bindActivityFilterButtons() {
  return true;
}

async function fetchActivities() {
  const filters = state.activityFilters;
  state.activityLoading = true;
  renderActivityView();
  const params = new URLSearchParams({
    from: filters.dateFrom || "",
    to: filters.dateTo || "",
    company: filters.companySearch || ""
  });
  if (filters.salesmanId && filters.salesmanId !== "all") params.set("salesman", filters.salesmanId);
  if (filters.types.length && filters.types.length < allActivityTypes().length) params.set("types", filters.types.join(","));
  try {
    state.activities = await api(`/api/activities?${params.toString()}`);
  } catch (error) {
    setToast(error.message, "error");
  } finally {
    state.activityLoading = false;
    renderActivityView();
  }
}

function isReminderActivity(activity) {
  return Boolean(activity?.reminder) || String(activity?.type || "").toLowerCase() === "reminder";
}

function reminderKey(reminder = {}) {
  return [
    reminder.lead_id || reminder.company_id || "",
    reminder.due_date || "",
    reminder.activity_required || reminder.text || "",
    reminder.reminder_type || ""
  ].map(value => String(value || "").trim().toLowerCase()).join("|");
}

function completedReminderKeys(lead) {
  return new Set((lead.activities || [])
    .filter(activity => activity.followup_completed)
    .map(activity => reminderKey({
      lead_id: lead.id,
      due_date: activity.completed_due_date,
      activity_required: activity.completed_activity_required,
      reminder_type: activity.completed_reminder_type || "General follow-up"
    })));
}

function remindersForLead(lead) {
  const completed = completedReminderKeys(lead);
  const stored = (lead.activities || [])
    .map((activity, activity_index) => ({ activity, activity_index }))
    .filter(({ activity }) => isReminderActivity(activity) && activity.reminder_status !== "completed")
    .map(({ activity, activity_index }) => ({
      ...activity,
      lead_id: lead.id,
      activity_index,
      company_name: lead.company_name,
      location: lead.address || lead.location || lead.territory,
      title: activity.title || `${activity.reminder_type || "Follow-up"}: ${lead.company_name}`
    }))
    .filter(activity => !completed.has(reminderKey(activity)));
  const hasNextActionReminder = stored.some(activity =>
    activity.due_date === lead.next_action_date
    && String(activity.activity_required || activity.text || "").includes(String(lead.next_action || ""))
  );
  if (!hasNextActionReminder && lead.next_action_date && lead.next_action) {
    stored.unshift({
      lead_id: lead.id,
      company_name: lead.company_name,
      location: lead.address || lead.location || lead.territory,
      title: `Follow-up: ${lead.company_name}`,
      type: "Reminder",
      reminder: true,
      reminder_type: "General follow-up",
      activity_required: lead.next_action,
      text: lead.next_action,
      due_date: lead.next_action_date,
      due_time: "09:00",
      reminder_status: "scheduled",
      synthetic: true
    });
  }
  return stored.filter(activity => !completed.has(reminderKey(activity))).sort((a, b) =>
    String(a.due_date || "").localeCompare(String(b.due_date || ""))
    || String(a.due_time || "").localeCompare(String(b.due_time || ""))
  );
}

function allReminders() {
  return state.leads.flatMap(remindersForLead)
    .sort((a, b) =>
      String(a.due_date || "").localeCompare(String(b.due_date || ""))
      || String(a.due_time || "").localeCompare(String(b.due_time || ""))
    );
}

function dateOnly(value) {
  const parsed = new Date(`${String(value || today()).slice(0, 10)}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date(`${today()}T00:00:00`) : parsed;
}

function daysUntil(dateValue) {
  return Math.round((dateOnly(dateValue) - dateOnly(today())) / 86_400_000);
}

function followupPriority(reminder) {
  const days = daysUntil(reminder.due_date);
  if (days < 0) return { label: "Overdue", className: "red" };
  if (days === 0) return { label: "Due Today", className: "orange" };
  if (days <= 3) return { label: "Due Soon", className: "yellow" };
  return { label: "Upcoming", className: "green" };
}

function followupGroup(reminder) {
  const days = daysUntil(reminder.due_date);
  if (days < 0) return "Overdue Follow-Ups";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days <= 7) return "This Week";
  if (days <= 14) return "Next Week";
  return "Future Follow-Ups";
}

function salesmanFollowups() {
  return state.leads.flatMap(lead => remindersForLead(lead).map(reminder => ({
    ...reminder,
    lead_id: lead.id,
    company_name: lead.company_name,
    stage: lead.stage,
    priority: lead.priority,
    due_sort: `${reminder.due_date || "9999-12-31"} ${reminder.due_time || "23:59"}`
  }))).sort((a, b) => a.due_sort.localeCompare(b.due_sort));
}

function inferCountry(lead) {
  const text = [lead.country_emirate, lead.location, lead.territory, lead.address].join(" ").toLowerCase();
  if (/saudi|ksa|riyadh|jeddah|dammam/.test(text)) return "Saudi Arabia";
  if (/qatar|doha/.test(text)) return "Qatar";
  if (/kuwait/.test(text)) return "Kuwait";
  if (/bahrain|manama/.test(text)) return "Bahrain";
  if (/oman|muscat|sohar/.test(text)) return "Oman";
  return "UAE";
}

function inferEmirate(lead) {
  const text = [lead.country_emirate, lead.location, lead.territory, lead.address].join(" ").toLowerCase();
  if (/abu dhabi/.test(text)) return "Abu Dhabi";
  if (/sharjah/.test(text)) return "Sharjah";
  if (/ajman/.test(text)) return "Ajman";
  if (/ras al khaimah|rak/.test(text)) return "Ras Al Khaimah";
  if (/fujairah/.test(text)) return "Fujairah";
  if (/umm al quwain|uaq/.test(text)) return "Umm Al Quwain";
  if (/dubai/.test(text)) return "Dubai";
  return inferCountry(lead) === "UAE" ? "Dubai" : "Outside UAE";
}

function portfolioFilteredLeads() {
  const filters = state.portfolioFilters;
  return state.leads.filter(lead => {
    const matchesStage = filters.stage === "all" || lead.stage === filters.stage;
    const country = inferCountry(lead);
    const emirate = inferEmirate(lead);
    const matchesCountry = filters.country === "all" || country === filters.country;
    const matchesEmirate = filters.emirate === "all" || emirate === filters.emirate;
    return matchesStage && matchesCountry && matchesEmirate;
  });
}

function countBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item) || "Unspecified";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

const pieColors = ["#0f766e", "#2563eb", "#d97706", "#7c3aed", "#16a34a", "#dc2626", "#0891b2", "#9333ea"];

function pieSlices(entries) {
  const total = entries.reduce((sum, [, count]) => sum + count, 0) || 1;
  let cursor = 0;
  return entries.map(([label, count], index) => {
    const start = cursor;
    const end = cursor + (count / total) * 100;
    cursor = end;
    return { label, count, color: pieColors[index % pieColors.length], start, end };
  });
}

function reminderCard(reminder, { compact = false } = {}) {
  const due = [reminder.due_date, reminder.due_time].filter(Boolean).join(" ");
  const calendarUrl = googleCalendarUrl(reminder);
  const overdue = reminder.due_date && reminder.due_date < today();
  return `
    <article class="reminder-card ${overdue ? "overdue" : ""}" data-reminder-lead="${escapeHtml(reminder.lead_id)}" tabindex="0">
      <div>
        <span class="meta-label">${escapeHtml(reminder.reminder_type || "Follow-up")} ${due ? `- ${escapeHtml(due)}` : ""}</span>
        <strong>${escapeHtml(compact ? (reminder.activity_required || reminder.text) : reminder.company_name)}</strong>
        ${compact ? "" : `<p>${escapeHtml(reminder.activity_required || reminder.text || "Follow up with customer")}</p>`}
      </div>
      ${calendarUrl ? `<a class="calendar-link" href="${escapeHtml(calendarUrl)}" target="_blank" rel="noopener">Add to Google Calendar</a>` : ""}
    </article>
  `;
}

function activityDisplayDate(activity) {
  return String(activity.activity_date || activity.at || today()).slice(0, 10);
}

function activityDisplayTime(activity) {
  const value = String(activity.activity_date || activity.at || "");
  const match = value.match(/T(\d{2}:\d{2})/);
  return match ? match[1] : String(activity.activity_time || "").slice(0, 5);
}

function activityDateHeading(date) {
  const dateValue = dateOnly(date);
  const todayValue = dateOnly(today());
  const diff = Math.round((todayValue - dateValue) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return dateValue.toLocaleDateString("en-AE", { month: "long", day: "numeric", year: "numeric" });
}

function groupedActivities() {
  return state.activities.reduce((groups, activity) => {
    const date = activityDisplayDate(activity);
    groups[date] = groups[date] || [];
    groups[date].push(activity);
    return groups;
  }, {});
}

function activityTypeClass(type) {
  return `activity-${String(type || "note").toLowerCase().replaceAll(" ", "-")}`;
}

function activitySummaryText(activities) {
  const uniqueSalesmen = new Set(activities.map(activity => activity.salesman_name || activity.assigned_salesman).filter(Boolean));
  const from = state.activityFilters.dateFrom || "Any date";
  const to = state.activityFilters.dateTo || "Any date";
  return `Showing ${activities.length} activit${activities.length === 1 ? "y" : "ies"} - ${uniqueSalesmen.size} ${uniqueSalesmen.size === 1 ? "salesman" : "salespeople"} - ${from} to ${to}`;
}

function activityCardMarkup(activity) {
  const type = activity.type || "Note";
  const note = activity.note || activity.text || "No note added.";
  const admin = state.currentUser?.role === "admin" || state.currentUser?.role === "manager";
  const isReminder = String(type).toLowerCase() === "reminder";
  const dueDate = activity.reminder_due_date || activity.due_date || "";
  const reminderOverdue = isReminder && dueDate && dueDate.slice(0, 10) < today() && activity.reminder_status !== "completed";
  return `
    <article class="activity-feed-item timeline-card ${activityTypeClass(type)}" data-activity-lead="${escapeHtml(activity.lead_id)}" tabindex="0">
      <div class="activity-row">
        <span class="activity-type-label"><i>${escapeHtml(ACTIVITY_TYPE_ICONS[type] || "ACT")}</i>${escapeHtml(type)}</span>
        <span class="activity-actions">
          ${activityEditButton(activity.lead_id, activity.activity_index, activity)}
          ${activityDeleteButton(activity.lead_id, activity.activity_index, activity)}
        </span>
      </div>
      <strong>${escapeHtml(activity.company_name)}</strong>
      ${admin ? `<span class="meta-label">Salesman: ${escapeHtml(activity.salesman_name || activity.assigned_salesman || "Unassigned")}</span>` : ""}
      <p class="activity-note clamp" data-expand-note>${escapeHtml(note)}</p>
      <div class="chip-row">
        <span class="chip">${escapeHtml([activityDisplayDate(activity), activityDisplayTime(activity)].filter(Boolean).join(" "))}</span>
        <span class="chip ${priorityClass(activity.stage)}">${escapeHtml(activity.stage || "No stage")}</span>
        ${isReminder ? `<span class="chip ${reminderOverdue ? "hot" : "warm"}">${escapeHtml(activity.reminder_status || (reminderOverdue ? "Overdue" : "Scheduled"))}${dueDate ? ` - ${escapeHtml(dueDate.slice(0, 10))}` : ""}</span>` : ""}
      </div>
      ${activity.delete_request ? `<span class="request-status ${escapeHtml(activity.request_status || "pending")}">Delete request ${escapeHtml(activity.request_status || "pending")}</span>` : ""}
      ${activity.edited_at ? `<span class="meta-label">Edited ${escapeHtml(String(activity.edited_at).slice(0, 10))}</span>` : ""}
      ${activityAudioMarkup(activity)}
      ${activityTranscriptMarkup(activity)}
    </article>
  `;
}

function renderActivityView() {
  const activities = state.activities || [];
  els.activitySummary.textContent = `${activities.length} activit${activities.length === 1 ? "y" : "ies"}`;
  renderActivityFilters();
  const upcoming = allReminders().filter(reminder => !reminder.due_date || reminder.due_date >= today()).slice(0, 8);
  const overdue = allReminders().filter(reminder => reminder.due_date && reminder.due_date < today()).slice(0, 6);
  const reminderHtml = `
    <section class="reminder-section">
      <div class="panel-header compact-header">
        <h2>Upcoming Reminders</h2>
        <span>${upcoming.length} upcoming</span>
      </div>
      <div class="reminder-grid">${upcoming.map(reminder => reminderCard(reminder)).join("") || `<p class="empty-copy">No upcoming reminders yet.</p>`}</div>
      ${overdue.length ? `<div class="panel-header compact-header"><h2>Overdue</h2><span>${overdue.length} overdue</span></div><div class="reminder-grid">${overdue.map(reminder => reminderCard(reminder)).join("")}</div>` : ""}
    </section>
  `;
  els.activityLoading.classList.toggle("hidden", !state.activityLoading);
  els.activityResultsSummary.textContent = activitySummaryText(activities);
  const groups = groupedActivities();
  const timelineHtml = Object.keys(groups).sort().reverse().map(date => `
    <section class="timeline-day">
      <div class="timeline-divider"><span>${escapeHtml(activityDateHeading(date))}</span></div>
      <div class="timeline-cards">${groups[date].map(activityCardMarkup).join("")}</div>
    </section>
  `).join("");
  const emptyHtml = `
    <div class="timeline-empty">
      <strong>No activities match your current filters.</strong>
      <span>Try another salesman, date range, activity type, or company search.</span>
      <button class="ghost-button" type="button" data-reset-activity-empty>Reset Filters</button>
    </div>
  `;
  els.activityFeed.innerHTML = reminderHtml + (state.activityLoading ? "" : (timelineHtml || emptyHtml));

  document.querySelectorAll("[data-activity-lead], [data-reminder-lead]").forEach(item => {
    const openLead = () => {
      state.selectedId = item.dataset.activityLead || item.dataset.reminderLead;
      openLeadDrawer(state.selectedId, item.dataset.reminderLead ? "reminders" : "activities");
    };
    item.addEventListener("click", event => {
      if (event.target.closest("audio, details, summary, a, button")) return;
      openLead();
    });
    item.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openLead();
    });
  });
  document.querySelectorAll("[data-expand-note]").forEach(note => {
    note.addEventListener("click", event => {
      event.stopPropagation();
      note.classList.toggle("clamp");
    });
  });
  document.querySelector("[data-reset-activity-empty]")?.addEventListener("click", resetActivityFilters);
  bindActivityEditButtons();
  bindDeleteButtons();
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
  const activities = (lead.activities || []).map((activity, index) => activityItemMarkup(activity, lead.id, index)).join("");
  const reminders = remindersForLead(lead);

  els.detailPanel.innerHTML = `
    <div class="detail-body">
      <div class="detail-heading">
        <div>
          <h2>${escapeHtml(lead.company_name)}</h2>
          <p>${escapeHtml(lead.notes || "No notes added yet.")}</p>
        </div>
        <span class="chip ${healthClass(lead.health)}">${escapeHtml(lead.health?.label || "AMBER")}</span>
      </div>

      <div class="ai-actions">
        <button class="ghost-button" data-ai-action="prepare" type="button">Prepare Me For This Meeting</button>
        <button class="ghost-button" data-ai-action="next" type="button">What Should I Do Next?</button>
        <button class="ghost-button" data-ai-action="email" type="button">Draft Follow-Up Email</button>
        <button class="ghost-button" data-ai-action="summary" type="button">Summarise Relationship</button>
        <button class="ghost-button" data-ai-action="flag" type="button">Flag Needs Attention</button>
      </div>
      <pre class="ai-output hidden" id="aiOutput"></pre>

      <div class="meta-grid">
        <div class="meta-box"><span class="meta-label">Contact</span><span class="meta-value">${escapeHtml(lead.contact_person)}</span></div>
        <div class="meta-box"><span class="meta-label">Primary title</span><span class="meta-value">${escapeHtml(lead.primary_contact_title || "Not added")}</span></div>
        <div class="meta-box"><span class="meta-label">Phone</span><span class="meta-value">${escapeHtml(lead.phone)}</span></div>
        <div class="meta-box"><span class="meta-label">Email</span><span class="meta-value">${escapeHtml(lead.email)}</span></div>
        <div class="meta-box"><span class="meta-label">Secondary contact</span><span class="meta-value">${escapeHtml(lead.secondary_contact_name || "Not added")}</span></div>
        <div class="meta-box"><span class="meta-label">Legal name</span><span class="meta-value">${escapeHtml(lead.legal_name || "Not available")}</span></div>
        <div class="meta-box"><span class="meta-label">Year established</span><span class="meta-value">${escapeHtml(lead.year_established || "Not available")}</span></div>
        <div class="meta-box"><span class="meta-label">Sector</span><span class="meta-value">${escapeHtml(lead.sector || lead.industry || "Not added")}</span></div>
        <div class="meta-box"><span class="meta-label">Tier</span><span class="meta-value">${escapeHtml(lead.tier || "2")}</span></div>
        <div class="meta-box"><span class="meta-label">Country / Emirate</span><span class="meta-value">${escapeHtml(lead.country_emirate || lead.location || "Not added")}</span></div>
        <div class="meta-box"><span class="meta-label">Business category</span><span class="meta-value">${escapeHtml(lead.business_category || "Not added")}</span></div>
        <div class="meta-box"><span class="meta-label">Website</span><span class="meta-value">${escapeHtml(lead.website || "Not added")}</span></div>
        <div class="meta-box"><span class="meta-label">Google Maps</span><span class="meta-value">${lead.google_maps_url ? `<a href="${escapeHtml(lead.google_maps_url)}" target="_blank" rel="noopener">Open map</a>` : "Not added"}</span></div>
        <div class="meta-box"><span class="meta-label">Enrichment</span><span class="meta-value">${escapeHtml(lead.enrichment_status || "pending")}</span></div>
        <div class="meta-box"><span class="meta-label">Google rating</span><span class="meta-value">${lead.google_rating ? `${escapeHtml(lead.google_rating)} (${escapeHtml(lead.google_review_count || 0)} reviews)` : "Not added"}</span></div>
        <div class="meta-box"><span class="meta-label">Health reason</span><span class="meta-value">${escapeHtml(lead.health?.reason || "Not calculated")}</span></div>
        <div class="meta-box"><span class="meta-label">Quotation ref</span><span class="meta-value">${escapeHtml(lead.quotation_ref || "Not added")}</span></div>
        <div class="meta-box"><span class="meta-label">Monthly volume</span><span class="meta-value">${escapeHtml(lead.estimated_monthly_volume || "Not added")}</span></div>
        <div class="meta-box"><span class="meta-label">Tags</span><span class="meta-value">${escapeHtml(lead.tags || "Not added")}</span></div>
        <div class="meta-box"><span class="meta-label">Estimated value</span><span class="meta-value">${money.format(lead.estimated_value || 0)}</span></div>
        <div class="meta-box"><span class="meta-label">Next action</span><span class="meta-value">${escapeHtml(lead.next_action)}</span></div>
        <div class="meta-box"><span class="meta-label">Due date</span><span class="meta-value">${escapeHtml(lead.next_action_date)}</span></div>
        <div class="meta-box"><span class="meta-label">Products/services remarks</span><span class="meta-value">${escapeHtml(lead.products_services_remarks || "Not added")}</span></div>
      </div>

      <div class="detail-actions">
        <button class="ghost-button" id="enrichLead" type="button">Enrich with Hunter</button>
        <button class="ghost-button" id="openPmrForm" type="button">File PMR</button>
        <button class="ghost-button danger" id="deleteLead" type="button">${state.currentUser?.role === "admin" ? "Delete Lead" : "Request Delete Lead"}</button>
        <span class="form-message" id="detailMessage" aria-live="polite"></span>
      </div>

      ${deleteRequestPanel(lead)}

      <div class="stage-actions">
        <select id="detailStage">${stageOptions}</select>
        <button class="primary-button" id="saveStage">Update Stage</button>
      </div>

      <div class="quick-note">
        <input id="activityText" placeholder="Log a call, visit, email, or follow-up note">
        <div class="activity-reminder-fields" aria-label="Optional activity reminder">
          <label>Optional reminder date<input id="activityReminderDate" type="date"></label>
          <label>Reminder time<input id="activityReminderTime" type="time" value="09:00"></label>
        </div>
        <div class="quick-note-actions">
          <button class="voice-button" id="recordActivityVoice" type="button">Record Voice Note</button>
          <button class="ghost-button" id="saveActivity">Add Activity</button>
        </div>
        <span class="voice-status" id="activityVoiceStatus" aria-live="polite"></span>
      </div>

      <section>
        <div class="section-title-row">
          <h2>Reminder Plan</h2>
          <span>${reminders.length} reminder${reminders.length === 1 ? "" : "s"}</span>
        </div>
        <div class="reminder-grid lead-reminders">${reminders.map(reminder => reminderCard(reminder, { compact: true })).join("") || "<p>No reminders yet.</p>"}</div>
      </section>

      <section>
        <h2>Activity Timeline</h2>
        <div class="activity-list">${activities || "<p>No activity yet.</p>"}</div>
      </section>
    </div>
  `;

  document.querySelector("#saveStage").addEventListener("click", async () => {
    const stage = document.querySelector("#detailStage").value;
    const result = await saveStageWithLostPrompt(lead, stage);
    if (result.cancelled) {
      document.querySelector("#detailStage").value = lead.stage;
      return;
    }
    await loadLeads();
  });

  document.querySelectorAll("[data-ai-action]").forEach(button => {
    button.addEventListener("click", async () => {
      const output = document.querySelector("#aiOutput");
      output.classList.remove("hidden");
      output.textContent = "Preparing relationship intelligence...";
      try {
        const result = await api(`/api/leads/${lead.id}/ai-actions`, {
          method: "POST",
          body: JSON.stringify({ action: button.dataset.aiAction })
        });
        output.textContent = result.output;
      } catch (error) {
        output.textContent = error.message;
      }
    });
  });

  document.querySelector("#saveActivity").addEventListener("click", async () => {
    const input = document.querySelector("#activityText");
    const reminderDate = document.querySelector("#activityReminderDate");
    const reminderTime = document.querySelector("#activityReminderTime");
    const note = input.value.trim();
    if (!note) return;
    const body = reminderDate.value
      ? {
        type: "Reminder",
        reminder: true,
        reminder_type: "General follow-up",
        due_date: reminderDate.value,
        due_time: reminderTime.value || "09:00",
        activity_required: note,
        text: note
      }
      : { type: "Note", text: note };
    await api(`/api/leads/${lead.id}/activities`, {
      method: "POST",
      body: JSON.stringify(body)
    });
    input.value = "";
    reminderDate.value = "";
    reminderTime.value = "09:00";
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

  document.querySelector("#openPmrForm").addEventListener("click", () => {
    els.pmrMessage.textContent = "";
    els.pmrForm.reset();
    resetPmrVoiceNote();
    els.pmrForm.elements.company_id.value = lead.id;
    els.pmrForm.elements.meeting_date.value = today();
    els.pmrDialog.showModal();
  });

  document.querySelector("#deleteLead").addEventListener("click", async () => {
    const message = document.querySelector("#detailMessage");
    if (state.currentUser?.role !== "admin") {
      try {
        await submitDeleteRequest(lead.id, "lead");
        setMessage(message, "Delete request sent to admin.", "success");
      } catch (error) {
        setMessage(message, error.message, "error");
      }
      return;
    }
    if (!window.confirm(`Delete ${lead.company_name}? This cannot be undone.`)) return;
    const password = adminPasswordPrompt("delete this lead");
    if (!password) return;
    setMessage(message, "Deleting lead...");
    try {
      await api(`/api/leads/${lead.id}`, { method: "DELETE", body: JSON.stringify({ admin_password: password }) });
      state.selectedId = null;
      await loadLeads();
    } catch (error) {
      setMessage(message, error.message, "error");
    }
  });
  bindActivityEditButtons();
  bindDeleteButtons();
}

function render() {
  renderMetrics();
  renderOverdueBanner();
  renderDashboardView();
  renderLeadList();
  renderKanbanView();
  renderDetail();
  renderLeadDrawer();
  renderSalesmenView();
  renderActivityView();
  renderPipelineFilterNotice();
  loadActivityAudioSources();
  applyView();
}

function applyView() {
  if (state.currentUser?.role !== "admin" && currentView === "salesmen") {
    currentView = "dashboard";
  }
  const isDashboard = currentView === "dashboard";
  const isPipeline = currentView === "pipeline";
  const isKanban = state.pipelineViewMode === "kanban";
  els.metricsPanel.classList.toggle("hidden", !(isDashboard || isPipeline));
  els.dashboardView.classList.toggle("hidden", !isDashboard);
  els.pipelineToolbar.classList.toggle("hidden", !isPipeline);
  els.pipelineView.classList.toggle("hidden", !isPipeline);
  els.pipelineView?.classList.toggle("kanban-mode", isPipeline && isKanban);
  els.pipelineListPanel?.classList.toggle("hidden", isKanban);
  els.kanbanPanel?.classList.toggle("hidden", !isKanban);
  els.salesmenView.classList.toggle("hidden", currentView !== "salesmen");
  els.activityView.classList.toggle("hidden", currentView !== "activity");
  document.querySelectorAll("[data-pipeline-mode]").forEach(button => {
    button.classList.toggle("active", button.dataset.pipelineMode === state.pipelineViewMode);
  });
  document.querySelectorAll(".nav-item").forEach(item => {
    item.classList.toggle("active", item.dataset.view === currentView);
  });
}

function closeMobileMenu() {
  document.body.classList.remove("menu-open");
  els.menuBackdrop?.classList.add("hidden");
  els.mobileMenuToggle?.setAttribute("aria-expanded", "false");
}

function toggleMobileMenu() {
  const open = !document.body.classList.contains("menu-open");
  document.body.classList.toggle("menu-open", open);
  els.menuBackdrop?.classList.toggle("hidden", !open);
  els.mobileMenuToggle?.setAttribute("aria-expanded", String(open));
}

function setView(view) {
  if (state.currentUser?.role !== "admin" && view === "salesmen") view = "dashboard";
  currentView = view;
  applyView();
  if (view === "pipeline") renderDetail();
  closeMobileMenu();
}

async function loadLeads() {
  state.leads = await api("/api/leads");
  if (!state.leads.some(lead => lead.id === state.selectedId)) {
    state.selectedId = state.leads[0]?.id || null;
  }
  await fetchActivities();
  render();
}

function showLogin(message = "") {
  state.currentUser = null;
  state.overduePipelineOnly = false;
  if (overdueRefreshTimer) {
    clearInterval(overdueRefreshTimer);
    overdueRefreshTimer = null;
  }
  els.loginMessage.textContent = message;
  els.authScreen.classList.remove("hidden");
  els.appShell.classList.add("hidden");
  els.overdueBanner?.classList.add("hidden");
  els.overduePipelineFilter?.classList.add("hidden");
}

function configureRoleUi(user) {
  const admin = user.role === "admin";
  document.querySelectorAll('[data-view="salesmen"]').forEach(item => {
    item.classList.toggle("hidden", !admin);
  });
  els.salesmanFilter?.closest("label")?.classList.toggle("hidden", !admin);
  els.formSalesman?.closest("label")?.classList.toggle("hidden", !admin);
  els.openSalesmanForm.classList.toggle("hidden", !admin);
  els.exportLeadsExcel?.classList.toggle("hidden", !admin);
  els.exportLeadsPdf?.classList.toggle("hidden", !admin);
  els.performancePanel?.classList.toggle("hidden", !admin);
  els.salesmanFollowupPanel?.classList.toggle("hidden", admin);
  els.portfolioPanel?.classList.toggle("hidden", admin);
  els.relationshipFocusPanel?.classList.toggle("hidden", !admin);
  els.pipelineHealthPanel?.classList.toggle("hidden", !admin);
  document.querySelector(".topbar h1").textContent = admin ? "ARG CRM Command Center" : "My Sales Dashboard";
  document.querySelector(".topbar p").textContent = admin
    ? "Track leads, assign salesmen, update pipeline stages, and keep mobile follow-ups synced."
    : "Track your assigned leads, follow-ups, customer activity, and post-meeting reports.";
  document.querySelector(".sidebar .brand span").textContent = admin ? "Shared CRM platform" : "Salesman workspace";
  if (!admin) {
    state.filters.salesman = "all";
    if (currentView === "salesmen") currentView = "dashboard";
  }
}

function showApp(user) {
  state.currentUser = user;
  els.signedInUser.textContent = `${user.name} · ${user.role}`;
  configureRoleUi(user);
  els.authScreen.classList.add("hidden");
  els.appShell.classList.remove("hidden");
  startOverdueRefresh();
}

function startOverdueRefresh() {
  if (overdueRefreshTimer) clearInterval(overdueRefreshTimer);
  overdueRefreshTimer = setInterval(() => {
    if (!state.currentUser || !sessionStorage.getItem(SESSION_KEY)) return;
    loadLeads().catch(error => setToast(error.message, "error"));
  }, 60_000);
}

async function loadWorkspace() {
  state.settings = await api("/api/settings");
  fillSelect(els.stageFilter, state.settings.stages, "All stages");
  fillSelect(els.priorityFilter, state.settings.priorities || [], "All priorities");
  fillSelect(els.territoryFilter, [...new Set([...(state.settings.territories || []), "UAE", "Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah", "Umm Al Quwain"])], "All territories");
  fillSelect(els.performanceStageFilter, state.settings.stages, "All Stages");
  els.performanceStageFilter.value = state.performanceStage;
  fillSelect(els.portfolioStageFilter, state.settings.stages, "All Stages");
  els.portfolioReportView.value = state.portfolioFilters.reportView;
  els.portfolioStageFilter.value = state.portfolioFilters.stage;
  els.portfolioCountryFilter.value = state.portfolioFilters.country;
  els.portfolioEmirateFilter.value = state.portfolioFilters.emirate;
  fillSelect(els.salesmanFilter, state.settings.salesmen, "All salesmen");
  fillSelect(els.formSalesman, state.settings.salesmen);
  if (state.currentUser?.role !== "admin") {
    els.formSalesman.value = state.currentUser.name;
  }
  fillSelect(els.formStage, state.settings.stages);
  fillSelect(els.formPriority, state.settings.priorities);
  fillSelect(els.formSector, state.settings.sectors || []);
  fillSelect(els.formTier, state.settings.tiers || []);
  fillSelect(document.querySelector("#pmrHeat"), state.settings.pmr?.heat || ["1", "2", "3", "4", "5"]);
  fillSelect(document.querySelector("#pmrOrderTiming"), state.settings.pmr?.firstOrderTiming || []);
  fillSelect(document.querySelector("#pmrPotentialValue"), state.settings.pmr?.potentialValue || []);
  fillSelect(document.querySelector("#pmrDirectorAction"), state.settings.pmr?.directorAction || []);
  fillSelect(document.querySelector("#pmrAccountStatus"), state.settings.pmr?.accountStatus || []);
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
  render();
});

els.stageFilter.addEventListener("change", event => {
  state.filters.stage = event.target.value;
  render();
});

els.performanceStageFilter?.addEventListener("change", event => {
  state.performanceStage = event.target.value;
  renderPerformanceAnalytics();
});

els.portfolioReportView?.addEventListener("change", event => {
  state.portfolioFilters.reportView = event.target.value;
  renderPortfolioAnalytics();
});

els.portfolioStageFilter?.addEventListener("change", event => {
  state.portfolioFilters.stage = event.target.value;
  renderPortfolioAnalytics();
});

els.portfolioCountryFilter?.addEventListener("change", event => {
  state.portfolioFilters.country = event.target.value;
  renderPortfolioAnalytics();
});

els.portfolioEmirateFilter?.addEventListener("change", event => {
  state.portfolioFilters.emirate = event.target.value;
  renderPortfolioAnalytics();
});

els.salesmanFilter.addEventListener("change", event => {
  state.filters.salesman = event.target.value;
  render();
});

els.priorityFilter?.addEventListener("change", event => {
  state.filters.priority = event.target.value;
  render();
});

els.territoryFilter?.addEventListener("change", event => {
  state.filters.territory = event.target.value;
  render();
});

els.clearOverdueFilter?.addEventListener("click", () => {
  state.overduePipelineOnly = false;
  render();
});

document.querySelectorAll("[data-pipeline-mode]").forEach(button => {
  button.addEventListener("click", () => {
    state.pipelineViewMode = button.dataset.pipelineMode;
    localStorage.setItem("arg_pipeline_view_mode", state.pipelineViewMode);
    render();
  });
});

els.activityFilterToggle?.addEventListener("click", () => {
  state.activityFiltersOpen = !state.activityFiltersOpen;
  renderActivityFilters();
});

els.activitySalesmanFilter?.addEventListener("change", event => {
  updateActivityFilter("salesmanId", event.target.value);
});

els.activityTypePills?.addEventListener("click", event => {
  const button = event.target.closest("[data-activity-type]");
  if (!button) return;
  const type = button.dataset.activityType;
  const selected = state.activityFilters.types.includes(type)
    ? state.activityFilters.types.filter(item => item !== type)
    : [...state.activityFilters.types, type];
  updateActivityFilter("types", selected.length ? selected : allActivityTypes());
});

els.activityDatePresets?.addEventListener("click", event => {
  const button = event.target.closest("[data-activity-preset]");
  if (!button) return;
  const preset = button.dataset.activityPreset;
  state.activityFilters = { ...state.activityFilters, ...activityPresetRange(preset), preset };
  saveActivityFilters();
  renderActivityFilters();
  fetchActivities();
});

els.activityDateFrom?.addEventListener("change", event => {
  updateActivityFilter("dateFrom", event.target.value);
});

els.activityDateTo?.addEventListener("change", event => {
  updateActivityFilter("dateTo", event.target.value);
});

els.activityCompanySearch?.addEventListener("input", event => {
  const value = event.target.value;
  clearTimeout(activitySearchTimer);
  activitySearchTimer = setTimeout(() => updateActivityFilter("companySearch", value), 300);
  els.activitySearchClear?.classList.toggle("hidden", !value);
});

els.activitySearchClear?.addEventListener("click", () => {
  updateActivityFilter("companySearch", "");
});

els.activityResetFilters?.addEventListener("click", resetActivityFilters);
els.leadDrawerBackdrop?.addEventListener("click", closeLeadDrawer);
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && state.leadDrawerOpen) closeLeadDrawer();
});

document.querySelector("#openLeadForm").addEventListener("click", () => {
  state.editingLeadId = "";
  state.editingOriginalStage = "";
  state.editingLostData = null;
  if (state.currentUser?.role !== "admin") els.formSalesman.value = state.currentUser.name;
  els.leadDialog.showModal();
});
document.querySelector("#closeLeadForm").addEventListener("click", () => {
  state.editingLeadId = "";
  state.editingOriginalStage = "";
  state.editingLostData = null;
  els.leadDialog.close();
});
document.querySelector("#closeSalesmanForm").addEventListener("click", () => els.salesmanDialog.close());
document.querySelector("#closePmrForm").addEventListener("click", () => {
  resetPmrVoiceNote();
  els.pmrDialog.close();
});
document.querySelector("#closeActivityEditForm")?.addEventListener("click", () => els.activityEditDialog.close());
els.formStage?.addEventListener("change", async event => {
  if (!state.editingLeadId) return;
  const lead = state.leads.find(item => item.id === state.editingLeadId);
  if (!lead) return;
  const nextStage = event.target.value;
  if (!isLostStageValue(nextStage)) {
    state.editingLostData = null;
    return;
  }
  if (isLostStageValue(state.editingOriginalStage)) return;
  const result = await promptLostReason(lead);
  if (!result) {
    event.target.value = state.editingOriginalStage || lead.stage || event.target.value;
    state.editingLostData = null;
    return;
  }
  state.editingLostData = result;
});
els.activityEditForm?.elements.type?.addEventListener("change", event => {
  els.activityEditReminderFields.classList.toggle("hidden", String(event.target.value).toLowerCase() !== "reminder");
});
els.lostReasonSelect?.addEventListener("change", updateLostReasonUi);
els.lostReasonDetail?.addEventListener("input", updateLostReasonUi);
els.lostReasonDialog?.addEventListener("cancel", event => {
  event.preventDefault();
  resolveLostReason(null);
});
document.querySelector("#closeLostReasonForm")?.addEventListener("click", () => resolveLostReason(null));
els.skipLostReason?.addEventListener("click", () => resolveLostReason({
  lost_reason: "",
  lost_reason_detail: "",
  lost_competitor: ""
}));
els.lostReasonForm?.addEventListener("submit", event => {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(els.lostReasonForm).entries());
  if (!payload.lost_reason) {
    setMessage(els.lostReasonMessage, "Select the primary reason before marking this lead as lost.", "error");
    return;
  }
  resolveLostReason({
    lost_reason: payload.lost_reason,
    lost_reason_detail: String(payload.lost_reason_detail || "").slice(0, 500),
    lost_competitor: payload.lost_competitor || ""
  });
});
els.recordPmrVoice?.addEventListener("click", togglePmrVoiceRecording);
els.deletePmrVoice?.addEventListener("click", resetPmrVoiceNote);
els.pmrDialog?.addEventListener("close", resetPmrVoiceNote);
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
        applyLeadEnrichment(place, { overwrite: true });
        setEnrichmentStatus("Google business selected. Review fields before saving.", "success");
        els.placesDialog.close();
        els.leadDialog.showModal();
      });
    });
  } catch (error) {
    setMessage(els.placesMessage, error.message, "error");
  }
});

els.activityEditForm?.addEventListener("submit", async event => {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(els.activityEditForm).entries());
  const leadId = payload.lead_id;
  const activityIndex = payload.activity_index;
  setMessage(els.activityEditMessage, "Saving activity changes...");
  try {
    await api(`/api/leads/${encodeURIComponent(leadId)}/activities/${encodeURIComponent(activityIndex)}`, {
      method: "PATCH",
      body: JSON.stringify({
        at: payload.at,
        type: payload.type,
        text: payload.text,
        reminder: String(payload.type || "").toLowerCase() === "reminder",
        reminder_type: payload.reminder_type,
        due_date: payload.due_date,
        due_time: payload.due_time,
        activity_required: payload.activity_required
      })
    });
    setMessage(els.activityEditMessage, "Activity updated.", "success");
    els.activityEditDialog.close();
    await loadLeads();
  } catch (error) {
    setMessage(els.activityEditMessage, error.message, "error");
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
    sessionStorage.removeItem(OVERDUE_BANNER_KEY);
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

els.mobileMenuToggle?.addEventListener("click", toggleMobileMenu);
els.menuBackdrop?.addEventListener("click", closeMobileMenu);
window.addEventListener("resize", () => {
  if (window.innerWidth > 980) closeMobileMenu();
});

els.exportLeadsExcel?.addEventListener("click", async () => {
  try {
    await downloadExport("/api/exports/leads.xls", `arg-leads-backup-${today()}.xls`);
  } catch (error) {
    window.alert(error.message);
  }
});

els.exportLeadsPdf?.addEventListener("click", async () => {
  try {
    await downloadExport("/api/exports/leads.pdf", `arg-leads-backup-${today()}.pdf`);
  } catch (error) {
    window.alert(error.message);
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

els.leadForm.querySelectorAll("input, textarea, select").forEach(field => {
  field.addEventListener("input", () => {
    if (field.name) leadFormTouched.add(field.name);
  });
});

els.leadForm.elements.company_name.addEventListener("input", scheduleLeadCompanyEnrichment);
els.leadForm.elements.location.addEventListener("input", scheduleLeadCompanyEnrichment);

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
  let lead;
  if (state.editingLeadId) {
    try {
      const existing = state.leads.find(item => item.id === state.editingLeadId);
      if (existing && isLostStageValue(payload.stage) && !isLostStageValue(state.editingOriginalStage)) {
        if (!state.editingLostData) {
          state.editingLostData = await promptLostReason(existing);
        }
        if (!state.editingLostData) {
          payload.stage = state.editingOriginalStage || existing.stage;
          els.leadForm.elements.stage.value = payload.stage;
          return;
        }
        Object.assign(payload, state.editingLostData);
      }
      lead = await api(`/api/leads/${encodeURIComponent(state.editingLeadId)}`, { method: "PATCH", body: JSON.stringify(payload) });
      state.selectedId = lead.id;
      state.editingLeadId = "";
      state.editingOriginalStage = "";
      state.editingLostData = null;
      els.leadDialog.close();
      await loadLeads();
      openLeadDrawer(lead.id, "overview");
      setToast("Lead updated.", "success");
    } catch (error) {
      setEnrichmentStatus(error.message, "error");
    }
    return;
  }
  try {
    lead = await api("/api/leads", { method: "POST", body: JSON.stringify(payload) });
  } catch (error) {
    if (error.status === 409 && error.details?.duplicate) {
      const duplicate = error.details.duplicate;
      const proceed = window.confirm(`Possible duplicate found: ${duplicate.company_name}, owned by ${duplicate.assigned_salesman}. Create a separate company record anyway?`);
      if (!proceed) return;
      lead = await api("/api/leads", { method: "POST", body: JSON.stringify({ ...payload, allow_duplicate: true }) });
    } else {
      setEnrichmentStatus(error.message, "error");
      return;
    }
  }
  state.selectedId = lead.id;
  els.leadForm.reset();
  leadFormTouched.clear();
  leadEnrichmentKey = "";
  setEnrichmentStatus("Type a company name to fetch Google business info.");
  els.leadForm.elements.next_action_date.value = today();
  els.leadDialog.close();
  await loadLeads();
  openLeadDrawer(lead.id, "overview");
});

els.pmrForm.addEventListener("submit", async event => {
  event.preventDefault();
  const companyId = els.pmrForm.elements.company_id.value;
  if (!companyId) return;
  els.pmrMessage.textContent = "Saving PMR...";
  try {
    if (pmrVoiceBlob && !els.pmrForm.elements.voice_note_id.value) {
      els.pmrMessage.textContent = "Uploading PMR voice note...";
      await uploadPmrVoiceNote();
      els.pmrMessage.textContent = "Saving PMR...";
    }
    await api(`/api/leads/${companyId}/pmrs`, {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(new FormData(els.pmrForm).entries()))
    });
    els.pmrMessage.textContent = "PMR saved.";
    resetPmrVoiceNote();
    els.pmrDialog.close();
    await loadLeads();
    if (state.leadDrawerOpen) openLeadDrawer(companyId, "pmr");
  } catch (error) {
    setMessage(els.pmrMessage, error.message, "error");
  }
});

document.querySelectorAll(".nav-item").forEach(item => {
  item.addEventListener("click", () => {
    setView(item.dataset.view || "dashboard");
  });
});

init().catch(error => {
  document.body.innerHTML = `<main class="empty-state"><strong>Could not load ARG CRM</strong><span>${escapeHtml(error.message)}</span></main>`;
});
