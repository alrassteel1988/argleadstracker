const ACTIVITY_FILTER_KEY = "arg_activity_filters";
const OVERDUE_BANNER_KEY = "arg_overdue_banner_dismissed";
const PWA_VISIT_KEY = "arg_pwa_visit_count";
const PWA_INSTALL_DISMISSED_KEY = "arg_pwa_install_dismissed_until";
const LEAD_AI_SUMMARY_CACHE_KEY = "arg_lead_ai_summary_cache_v1";
const OUTBOX_DB_NAME = "arg_leads_pwa_outbox";
const OUTBOX_STORE = "outbox";
const ACTIVITY_PRESETS = ["Today", "This Week", "This Month", "Last 30 Days", "Last 90 Days"];
const QUICK_LOG_TYPES = ["Phone Call", "Email", "In-Person Meeting", "Site Visit", "Video Call", "Quotation Sent", "Order Placed"];
const QUICK_PHRASES = ["Discussed pricing", "Requested quotation", "Sample feedback", "Follow-up agreed", "Met procurement"];
const ACTIVITY_TYPE_ICONS = {
  "Note": "TXT",
  "Phone Call": "TEL",
  "Email": "@",
  "In-Person Meeting": "MEET",
  "Site Visit": "PIN",
  "Video Call": "VID",
  "Quotation Sent": "QUOTE",
  "Order Placed": "AED",
  "Reminder": "!",
  "Handoff": "MOVE"
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
  userAccounts: [],
  selectedId: null,
  lastNonLeadView: "dashboard",
  filters: { search: "", stage: "all", salesman: "all", priority: "all", territory: "all" },
  importedAfter: "",
  overduePipelineOnly: false,
  performanceStage: "all",
  marketSnapshotSalesman: "all",
  salesmanLeadsViewer: null,
  portfolioFilters: { reportView: "stage", stage: "all", country: "all", emirate: "all" },
  pipelineViewMode: localStorage.getItem("arg_pipeline_view_mode") || "list",
  kanbanStage: localStorage.getItem("arg_kanban_stage") || "PROSPECT",
  draggedLeadId: "",
  importLeads: null,
  activities: [],
  activityLoading: false,
  activityFiltersOpen: false,
  activityFilters: loadActivityFilters(),
  activityWeekAnchor: today(),
  leadDrawerOpen: false,
  leadDrawerTab: "overview",
  leadDrawerLoading: false,
  leadDrawerPmrs: [],
  leadDrawerIntel: [],
  leadDrawerHandoffs: [],
  leadAiSummary: {
    visible: true,
    loading: false,
    error: "",
    data: null,
    generatedAt: "",
    fingerprint: "",
    provider: "",
    marketIntelUnavailableReason: "",
    minimized: false,
    mobileTab: "ai",
    cached: false
  },
  duplicateMatches: [],
  duplicateChecking: false,
  integrations: { linkedin_titles: [], agent_examples: [], configuration_agent_examples: [], ai_agent: false },
  agentOpen: false,
  agentLoading: false,
  configAgent: { loading: false, proposal: null, audit: [], examples: [] },
  attentionFlags: [],
  aiAction: { scope: "company", leadId: "", action: "", label: "", output: "", loading: false, error: "", provider: "", type: "markdown", metrics: null, insight: "" },
  aiCooldownUntil: 0,
  dailyPipelineSummary: null,
  dailyAiLoading: false,
  installPrompt: null,
  quickLog: { leadId: "", type: "In-Person Meeting", nearbyLeadId: "" },
  sync: { online: navigator.onLine, syncing: false, pending: 0, failed: 0 },
  marketIntel: { items: [], heat_map: [], disabled: false },
  editingLeadId: "",
  editingOriginalStage: "",
  editingLostData: null,
  lostReasonRequest: null,
  currentUser: null,
  leadsLoaded: false,
  leadsLoading: false
};

const ADMIN_DASHBOARD_COLLAPSIBLES = [
  { id: "metricsShell", storageKey: "admin-dashboard-kpi-overview-collapsed" },
  { id: "marketIntelPanel", storageKey: "admin-dashboard-intel-overview-collapsed", refresh: "marketIntel" },
  { id: "needsAttentionPanel", storageKey: "admin-dashboard-director-alerts-collapsed", refresh: "needsAttention" },
  { id: "performancePanel", storageKey: "admin-dashboard-salesman-performance-collapsed", refresh: "performance" },
  { id: "adminTaskPanel", storageKey: "admin-dashboard-tasks-collapsed", refresh: "tasks" },
  { id: "marketSnapshotPanel", storageKey: "admin-dashboard-market-snapshot-collapsed", refresh: "marketSnapshot" },
  { id: "dashboardPipelineFunnelPanel", storageKey: "admin-dashboard-pipeline-funnel-collapsed", refresh: "dashboardPipelineFunnel" },
  { id: "actionPlanPanel", storageKey: "admin-dashboard-lead-action-plans-collapsed", refresh: "actionPlans" },
  { id: "lossReasonsPanel", storageKey: "admin-dashboard-loss-reasons-collapsed", refresh: "lossReasons" },
  { id: "relationshipFocusPanel", storageKey: "admin-dashboard-cold-relationships-collapsed" },
  { id: "dashboardActivityPanel", storageKey: "admin-dashboard-latest-interactions-collapsed" },
  { id: "pipelineHealthPanel", storageKey: "admin-dashboard-pipeline-health-collapsed" },
  { id: "configAgentPanel", storageKey: "admin-dashboard-configuration-agent-collapsed" }
];

const dashboardCollapsibleTimers = new Map();
let dashboardCollapsiblesReady = false;

const els = {
  authScreen: document.querySelector("#authScreen"),
  appShell: document.querySelector("#appShell"),
  mobileMenuToggle: document.querySelector("#mobileMenuToggle"),
  closeMobileSidebar: document.querySelector("#closeMobileSidebar"),
  menuBackdrop: document.querySelector("#menuBackdrop"),
  loginForm: document.querySelector("#loginForm"),
  loginMessage: document.querySelector("#loginMessage"),
  signedInUser: document.querySelector("#signedInUser"),
  sidebarUserMenu: document.querySelector("#sidebarUserMenu"),
  sidebarUserName: document.querySelector("#sidebarUserName"),
  sidebarUserRole: document.querySelector("#sidebarUserRole"),
  sidebarUserAvatar: document.querySelector("#sidebarUserAvatar"),
  topbarPageTitle: document.querySelector("#topbarPageTitle"),
  topbarContext: document.querySelector("#topbarContext"),
  syncStatusPill: document.querySelector("#syncStatusPill"),
  mobileAlertsBadge: document.querySelector("#mobileAlertsBadge"),
  installBanner: document.querySelector("#installBanner"),
  installBannerTitle: document.querySelector("#installBannerTitle"),
  installBannerText: document.querySelector("#installBannerText"),
  installAppButton: document.querySelector("#installAppButton"),
  dismissInstallBanner: document.querySelector("#dismissInstallBanner"),
  updateBanner: document.querySelector("#updateBanner"),
  refreshAppButton: document.querySelector("#refreshAppButton"),
  logoutButton: document.querySelector("#logoutButton"),
  openSalesmanForm: document.querySelector("#openSalesmanForm"),
  exportLeadsExcel: document.querySelector("#exportLeadsExcel"),
  exportLeadsPdf: document.querySelector("#exportLeadsPdf"),
  openImportLeads: document.querySelector("#openImportLeads"),
  importLeadsDialog: document.querySelector("#importLeadsDialog"),
  closeImportLeads: document.querySelector("#closeImportLeads"),
  importStepper: document.querySelector("#importStepper"),
  importLeadsTitle: document.querySelector("#importLeadsTitle"),
  importLeadsSubtitle: document.querySelector("#importLeadsSubtitle"),
  importLeadsBody: document.querySelector("#importLeadsBody"),
  importLeadsMessage: document.querySelector("#importLeadsMessage"),
  importLeadsActions: document.querySelector("#importLeadsActions"),
  salesmanDialog: document.querySelector("#salesmanDialog"),
  salesmanForm: document.querySelector("#salesmanForm"),
  salesmanMessage: document.querySelector("#salesmanMessage"),
  salesmanTerritory: document.querySelector("#salesmanTerritory"),
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
  metricTotalSub: document.querySelector("#metricTotalSub"),
  metricValue: document.querySelector("#metricValue"),
  metricHot: document.querySelector("#metricHot"),
  metricDue: document.querySelector("#metricDue"),
  metricDueSub: document.querySelector("#metricDueSub"),
  quickTaskBadge: document.querySelector("#quickTaskBadge"),
  greetingLabel: document.querySelector("#greetingLabel"),
  dashboardUserName: document.querySelector("#dashboardUserName"),
  dashboardSubline: document.querySelector("#dashboardSubline"),
  metricsShell: document.querySelector("#metricsShell"),
  metricsPanel: document.querySelector("#metricsPanel"),
  dashboardView: document.querySelector("#dashboardView"),
  dailyAiPanel: document.querySelector("#dailyAiPanel"),
  dailyAiGreeting: document.querySelector("#dailyAiGreeting"),
  dailyAiSummary: document.querySelector("#dailyAiSummary"),
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
  marketIntelPanel: document.querySelector("#marketIntelPanel"),
  marketIntelKicker: document.querySelector("#marketIntelKicker"),
  marketIntelTitle: document.querySelector("#marketIntelTitle"),
  marketIntelFeed: document.querySelector("#marketIntelFeed"),
  refreshMarketIntel: document.querySelector("#refreshMarketIntel"),
  needsAttentionPanel: document.querySelector("#needsAttentionPanel"),
  needsAttentionList: document.querySelector("#needsAttentionList"),
  needsAttentionCount: document.querySelector("#needsAttentionCount"),
  performancePanel: document.querySelector("#performancePanel"),
  adminTaskPanel: document.querySelector("#adminTaskPanel"),
  adminTaskSummary: document.querySelector("#adminTaskSummary"),
  adminTaskTableBody: document.querySelector("#adminTaskTableBody"),
  performanceStageFilter: document.querySelector("#performanceStageFilter"),
  performanceLeaderboard: document.querySelector("#performanceLeaderboard"),
  performanceChart: document.querySelector("#performanceChart"),
  performanceTable: document.querySelector("#performanceTable"),
  performanceFeed: document.querySelector("#performanceFeed"),
  marketSnapshotPanel: document.querySelector("#marketSnapshotPanel"),
  marketSnapshotSalesmanFilter: document.querySelector("#marketSnapshotSalesmanFilter"),
  marketLocationPie: document.querySelector("#marketLocationPie"),
  marketLocationLegend: document.querySelector("#marketLocationLegend"),
  marketSectorPie: document.querySelector("#marketSectorPie"),
  marketSectorLegend: document.querySelector("#marketSectorLegend"),
  dashboardPipelineFunnelPanel: document.querySelector("#dashboardPipelineFunnelPanel"),
  dashboardPipelineFunnelBadge: document.querySelector("#dashboardPipelineFunnelBadge"),
  dashboardPipelineFunnelBody: document.querySelector("#dashboardPipelineFunnelBody"),
  actionPlanPanel: document.querySelector("#actionPlanPanel"),
  actionPlanSummary: document.querySelector("#actionPlanSummary"),
  actionPlanList: document.querySelector("#actionPlanList"),
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
  dashboardActivityFeed: document.querySelector("#dashboardActivityFeed"),
  agentPanel: document.querySelector("#agentPanel"),
  agentToggle: document.querySelector("#agentToggle"),
  agentBody: document.querySelector("#agentBody"),
  agentPrompt: document.querySelector("#agentPrompt"),
  agentAsk: document.querySelector("#agentAsk"),
  agentExamples: document.querySelector("#agentExamples"),
  agentAnswer: document.querySelector("#agentAnswer"),
  agentMessage: document.querySelector("#agentMessage"),
  configAgentPanel: document.querySelector("#configAgentPanel"),
  configAgentPrompt: document.querySelector("#configAgentPrompt"),
  configAgentPropose: document.querySelector("#configAgentPropose"),
  configAgentApply: document.querySelector("#configAgentApply"),
  configAgentExamples: document.querySelector("#configAgentExamples"),
  configAgentResult: document.querySelector("#configAgentResult"),
  configAgentAudit: document.querySelector("#configAgentAudit"),
  configAgentMessage: document.querySelector("#configAgentMessage"),
  pipelineFunnelPanel: document.querySelector("#pipelineFunnelPanel"),
  pipelineFunnelBadge: document.querySelector("#pipelineFunnelBadge"),
  pipelineFunnelBody: document.querySelector("#pipelineFunnelBody"),
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
  leadDetailView: document.querySelector("#leadDetailView"),
  leadAiSummaryPagePanel: document.querySelector("#leadAiSummaryPagePanel"),
  leadAiSummaryPageContent: document.querySelector("#leadAiSummaryPageContent"),
  leadDetailPagePanel: document.querySelector("#leadDetailPagePanel"),
  leadDetailPageContent: document.querySelector("#leadDetailPageContent"),
  salesmenView: document.querySelector("#salesmenView"),
  salesmenGrid: document.querySelector("#salesmenGrid"),
  salesmenSummary: document.querySelector("#salesmenSummary"),
  salesmanLeadsDialog: document.querySelector("#salesmanLeadsDialog"),
  salesmanLeadsTitle: document.querySelector("#salesmanLeadsTitle"),
  salesmanLeadsSubtitle: document.querySelector("#salesmanLeadsSubtitle"),
  salesmanLeadsSummary: document.querySelector("#salesmanLeadsSummary"),
  salesmanLeadsList: document.querySelector("#salesmanLeadsList"),
  closeSalesmanLeads: document.querySelector("#closeSalesmanLeads"),
  activityView: document.querySelector("#activityView"),
  activityFeed: document.querySelector("#activityFeed"),
  activityWeeklyLog: document.querySelector("#activityWeeklyLog"),
  activitySummary: document.querySelector("#activitySummary"),
  activityFilterToggle: document.querySelector("#activityFilterToggle"),
  activityFilterBar: document.querySelector("#activityFilterBar"),
  activitySalesmanFilter: document.querySelector("#activitySalesmanFilter"),
  activityTypeSelect: document.querySelector("#activityTypeSelect"),
  activityDatePresets: document.querySelector("#activityDatePresets"),
  activityDateFrom: document.querySelector("#activityDateFrom"),
  activityDateTo: document.querySelector("#activityDateTo"),
  activityCompanySearch: document.querySelector("#activityCompanySearch"),
  activitySearchClear: document.querySelector("#activitySearchClear"),
  activityResetFilters: document.querySelector("#activityResetFilters"),
  activityResultsSummary: document.querySelector("#activityResultsSummary"),
  activityLoading: document.querySelector("#activityLoading"),
  activityKpiActivities: document.querySelector("#activityKpiActivities"),
  activityKpiActivitiesMeta: document.querySelector("#activityKpiActivitiesMeta"),
  activityKpiOverdue: document.querySelector("#activityKpiOverdue"),
  activityKpiUpcoming: document.querySelector("#activityKpiUpcoming"),
  activityKpiWeek: document.querySelector("#activityKpiWeek"),
  activityKpiWeekMeta: document.querySelector("#activityKpiWeekMeta"),
  activityWeekRange: document.querySelector("#activityWeekRange"),
  activityPrevWeek: document.querySelector("#activityPrevWeek"),
  activityNextWeek: document.querySelector("#activityNextWeek"),
  activityReminders: document.querySelector("#activityReminders"),
  activityTypeShortcutChips: document.querySelector("#activityTypeShortcutChips"),
  activityQuickLinks: document.querySelector("#activityQuickLinks"),
  leadDrawerShell: document.querySelector("#leadDrawerShell"),
  leadDrawerBackdrop: document.querySelector("#leadDrawerBackdrop"),
  leadDrawerMobileSwitch: document.querySelector("#leadDrawerMobileSwitch"),
  leadAiSummaryPanel: document.querySelector("#leadAiSummaryPanel"),
  leadAiSummaryContent: document.querySelector("#leadAiSummaryContent"),
  leadDrawerContent: document.querySelector("#leadDrawerContent"),
  leadDialog: document.querySelector("#leadDialog"),
  leadForm: document.querySelector("#leadForm"),
  formSalesman: document.querySelector("#formSalesman"),
  formStage: document.querySelector("#formStage"),
  formPriority: document.querySelector("#formPriority"),
  formSector: document.querySelector("#formSector"),
  formTier: document.querySelector("#formTier"),
  formTerritory: document.querySelector("#formTerritory"),
  duplicateWarning: document.querySelector("#duplicateWarning"),
  leadEnrichmentStatus: document.querySelector("#leadEnrichmentStatus"),
  handoffDialog: document.querySelector("#handoffDialog"),
  handoffForm: document.querySelector("#handoffForm"),
  handoffTitle: document.querySelector("#handoffTitle"),
  handoffSubtitle: document.querySelector("#handoffSubtitle"),
  handoffSummary: document.querySelector("#handoffSummary"),
  handoffMessage: document.querySelector("#handoffMessage"),
  confirmHandoff: document.querySelector("#confirmHandoff"),
  cancelHandoff: document.querySelector("#cancelHandoff"),
  pmrDialog: document.querySelector("#pmrDialog"),
  pmrForm: document.querySelector("#pmrForm"),
  pmrActivityLink: document.querySelector("#pmrActivityLink"),
  pmrMessage: document.querySelector("#pmrMessage"),
  recordPmrVoice: document.querySelector("#recordPmrVoice"),
  deletePmrVoice: document.querySelector("#deletePmrVoice"),
  pmrVoicePreview: document.querySelector("#pmrVoicePreview"),
  pmrVoiceStatus: document.querySelector("#pmrVoiceStatus"),
  pmrTranscriptLabel: document.querySelector("#pmrTranscriptLabel"),
  aiActionDialog: document.querySelector("#aiActionDialog"),
  aiActionTitle: document.querySelector("#aiActionTitle"),
  aiActionSubtitle: document.querySelector("#aiActionSubtitle"),
  aiActionLoading: document.querySelector("#aiActionLoading"),
  aiActionLoadingText: document.querySelector("#aiActionLoadingText"),
  aiActionResult: document.querySelector("#aiActionResult"),
  aiActionMessage: document.querySelector("#aiActionMessage"),
  aiActionFooter: document.querySelector("#aiActionFooter"),
  flagAttentionDialog: document.querySelector("#flagAttentionDialog"),
  flagAttentionForm: document.querySelector("#flagAttentionForm"),
  flagAttentionTitle: document.querySelector("#flagAttentionTitle"),
  flagAttentionMessage: document.querySelector("#flagAttentionMessage"),
  quickLogDialog: document.querySelector("#quickLogDialog"),
  quickLogForm: document.querySelector("#quickLogForm"),
  closeQuickLog: document.querySelector("#closeQuickLog"),
  quickLogSyncStatus: document.querySelector("#quickLogSyncStatus"),
  quickLogCompanySearch: document.querySelector("#quickLogCompanySearch"),
  quickLogNear: document.querySelector("#quickLogNear"),
  quickLogRecent: document.querySelector("#quickLogRecent"),
  quickLogLeadSelect: document.querySelector("#quickLogLeadSelect"),
  quickLogTypes: document.querySelector("#quickLogTypes"),
  quickLogNote: document.querySelector("#quickLogNote"),
  quickPhraseChips: document.querySelector("#quickPhraseChips"),
  quickQuoteField: document.querySelector("#quickQuoteField"),
  quickQuotationRef: document.querySelector("#quickQuotationRef"),
  quickOrderField: document.querySelector("#quickOrderField"),
  quickOrderVolume: document.querySelector("#quickOrderVolume"),
  quickNextAction: document.querySelector("#quickNextAction"),
  quickNextDate: document.querySelector("#quickNextDate"),
  quickLogMessage: document.querySelector("#quickLogMessage"),
  pendingChangesDialog: document.querySelector("#pendingChangesDialog"),
  closePendingChanges: document.querySelector("#closePendingChanges"),
  pendingChangesList: document.querySelector("#pendingChangesList"),
  syncNowButton: document.querySelector("#syncNowButton"),
  mobileMapDialog: document.querySelector("#mobileMapDialog"),
  closeMobileMap: document.querySelector("#closeMobileMap"),
  mobileMapList: document.querySelector("#mobileMapList"),
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
const leadAiSummaryCache = new Map();
let leadEnrichmentTimer = null;
let leadEnrichmentKey = "";
let leadCompanyInputKey = "";
let activitySearchTimer = null;
let quotationValidationTimer = null;
let duplicateCheckTimer = null;
let overdueRefreshTimer = null;
let performanceChartInstance = null;

function isLeadRoutePath(pathname = window.location.pathname) {
  return /^\/leads\/[^/]+\/?$/.test(pathname);
}

function parseAppRoute(locationLike = window.location) {
  const pathname = locationLike.pathname || "/";
  const search = new URLSearchParams(locationLike.search || "");
  if (isLeadRoutePath(pathname)) {
    return {
      view: "lead",
      leadId: decodeURIComponent(pathname.replace(/^\/leads\//, "").replace(/\/$/, "")),
      tab: search.get("tab") || "overview"
    };
  }
  return {
    view: "dashboard",
    leadId: "",
    tab: "overview"
  };
}

function leadRouteUrl(leadId, tab = "overview") {
  const safeLeadId = encodeURIComponent(String(leadId || "").trim());
  const params = new URLSearchParams();
  if (tab && tab !== "overview") params.set("tab", tab);
  return params.toString() ? `/leads/${safeLeadId}?${params}` : `/leads/${safeLeadId}`;
}

function currentRouteState() {
  if (currentView === "lead" && state.selectedId) {
    return {
      view: "lead",
      leadId: state.selectedId,
      tab: state.leadDrawerTab || "overview",
      returnView: state.lastNonLeadView || "pipeline"
    };
  }
  return {
    view: currentView,
    returnView: state.lastNonLeadView || currentView || "dashboard"
  };
}

function syncBrowserRoute(options = {}) {
  const replace = Boolean(options.replace);
  const routeState = currentRouteState();
  const nextUrl = routeState.view === "lead" && routeState.leadId
    ? leadRouteUrl(routeState.leadId, routeState.tab)
    : "/";
  const currentUrl = `${window.location.pathname}${window.location.search}`;
  if (currentUrl === nextUrl && !options.forceState) return;
  window.history[replace ? "replaceState" : "pushState"](routeState, "", nextUrl);
}

function applyRouteState(route, options = {}) {
  const parsed = route?.view ? route : parseAppRoute();
  const nextView = parsed.view === "lead" ? "lead" : (parsed.view || "dashboard");
  if (nextView !== "lead") {
    state.leadDrawerOpen = false;
    currentView = nextView;
    if (currentView !== "lead") state.lastNonLeadView = currentView;
    return;
  }
  currentView = "lead";
  state.selectedId = parsed.leadId || state.selectedId;
  state.leadDrawerTab = parsed.tab || "overview";
  state.leadDrawerOpen = true;
  if (parsed.returnView && parsed.returnView !== "lead") {
    state.lastNonLeadView = parsed.returnView;
  } else if (!options.keepReturnView && (!state.lastNonLeadView || state.lastNonLeadView === "lead")) {
    state.lastNonLeadView = "pipeline";
  }
}

loadLeadAiSummaryCache();

const enrichmentFieldMap = {
  company_name: "company_name",
  legal_name: "legal_name",
  year_established: "year_established",
  website: "website",
  phone: "phone",
  email: "email",
  address: "address",
  google_maps_url: "google_maps_url",
  latitude: "latitude",
  longitude: "longitude",
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

const leadAutoEnrichmentFields = new Set(
  Object.values(enrichmentFieldMap).filter(fieldName => fieldName !== "company_name")
);

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

const NEXT_ACTION_PLAN_OPTIONS = ["To Call", "To Send Email", "To Visit"];
const ACTIVITY_PURPOSE_OPTIONS = [
  "Company Introductory",
  "New Requirements",
  "Quotation Submission",
  "Quotation Follow-Up",
  "Meeting"
];

function normalizeNextActionPlan(value) {
  const raw = String(value || "").trim();
  if (!raw) return NEXT_ACTION_PLAN_OPTIONS[0];
  if (NEXT_ACTION_PLAN_OPTIONS.includes(raw)) return raw;
  const upper = raw.toUpperCase();
  if (/(EMAIL|MAIL|QUOTE|QUOTATION|SUBMIT)/.test(upper)) return "To Send Email";
  if (/(VISIT|MEET|MEETING|SITE)/.test(upper)) return "To Visit";
  return "To Call";
}

function normalizeActivityPurpose(value) {
  const raw = String(value || "").trim();
  if (!raw) return ACTIVITY_PURPOSE_OPTIONS[0];
  if (ACTIVITY_PURPOSE_OPTIONS.includes(raw)) return raw;
  const upper = raw.toUpperCase();
  if (/(FOLLOW[\s-]?UP)/.test(upper) && /QUOTATION|QUOTE/.test(upper)) return "Quotation Follow-Up";
  if (/QUOTATION|QUOTE/.test(upper)) return "Quotation Submission";
  if (/REQUIREMENT/.test(upper)) return "New Requirements";
  if (/MEET|MEETING|VISIT|SITE/.test(upper)) return "Meeting";
  return ACTIVITY_PURPOSE_OPTIONS[0];
}

const KANBAN_STAGE_BY_KEY = Object.fromEntries(KANBAN_STAGES.map(stage => [stage.key, stage]));

const IMPORT_STEPS = ["Upload", "Map", "Preview", "Import", "Done"];
const IMPORT_MAX_BYTES = 5 * 1024 * 1024;
const IMPORT_MAX_ROWS = 500;
const IMPORT_BATCH_SIZE = 50;
const IMPORT_FIELD_DEFINITIONS = [
  { key: "", label: "Skip this column" },
  { key: "company_name", label: "Company Name *", required: true },
  { key: "legal_name", label: "Legal Name" },
  { key: "contact_person", label: "Contact Person" },
  { key: "primary_contact_title", label: "Title" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "secondary_contact_name", label: "Secondary Contact" },
  { key: "secondary_contact_mobile", label: "Secondary Phone" },
  { key: "secondary_contact_email", label: "Secondary Email" },
  { key: "website", label: "Website" },
  { key: "country_emirate", label: "Country / Emirate" },
  { key: "territory", label: "Territory" },
  { key: "location", label: "Location" },
  { key: "address", label: "Address" },
  { key: "industry", label: "Industry" },
  { key: "sector", label: "Sector" },
  { key: "tags", label: "Tags" },
  { key: "stage", label: "Stage" },
  { key: "priority", label: "Priority" },
  { key: "estimated_value", label: "Estimated Value" },
  { key: "next_action_date", label: "Next Action Date" },
  { key: "next_action", label: "Next Action" },
  { key: "product_interest", label: "Product Interest" },
  { key: "assigned_salesman", label: "Assigned Salesman" },
  { key: "notes", label: "Notes" }
];
const IMPORT_HEADER_SYNONYMS = [
  { key: "company_name", patterns: ["company", "company name", "business", "account", "customer", "client"] },
  { key: "legal_name", patterns: ["legal name", "official name", "trade license name"] },
  { key: "contact_person", patterns: ["contact", "contact person", "person", "name", "buyer"] },
  { key: "primary_contact_title", patterns: ["title", "job title", "designation", "position"] },
  { key: "phone", patterns: ["phone", "mobile", "tel", "telephone", "number", "contact number"] },
  { key: "email", patterns: ["email", "email address", "e-mail", "mail"] },
  { key: "secondary_contact_name", patterns: ["secondary contact", "second contact", "alternate contact"] },
  { key: "secondary_contact_mobile", patterns: ["secondary phone", "secondary mobile", "alternate phone"] },
  { key: "secondary_contact_email", patterns: ["secondary email", "alternate email"] },
  { key: "website", patterns: ["website", "web", "url", "domain"] },
  { key: "territory", patterns: ["territory", "area", "emirate", "city"] },
  { key: "location", patterns: ["location", "place"] },
  { key: "country_emirate", patterns: ["country", "country emirate", "country / emirate"] },
  { key: "address", patterns: ["address", "formatted address"] },
  { key: "industry", patterns: ["industry", "category", "type", "business type"] },
  { key: "sector", patterns: ["sector", "segment"] },
  { key: "tags", patterns: ["tags", "tag", "labels"] },
  { key: "assigned_salesman", patterns: ["salesman", "assigned to", "rep", "owner", "sales person", "salesperson"] },
  { key: "stage", patterns: ["stage", "status", "pipeline", "lead status"] },
  { key: "priority", patterns: ["priority", "tier", "heat"] },
  { key: "estimated_value", patterns: ["value", "estimated value", "est value", "estimated value aed", "estimated value (aed)"] },
  { key: "next_action_date", patterns: ["next action date", "follow up", "follow-up date", "follow up date", "due date"] },
  { key: "next_action", patterns: ["next action", "required action", "follow up action"] },
  { key: "product_interest", patterns: ["product interest", "products", "products interest", "item", "items"] },
  { key: "notes", patterns: ["notes", "remarks", "comment", "comments"] }
];
const IMPORT_TEMPLATE = `Company Name,Legal Name,Contact Person,Title,Phone,Email,Secondary Contact,Secondary Phone,Secondary Email,Website,Country,Emirate,Address,Industry,Sector,Tags,Stage,Priority,Estimated Value (AED),Next Action Date (YYYY-MM-DD),Product Interest,Notes
Gulf Steel Fabricators LLC,Gulf Steel Fabricators LLC,Ahmed Al Rashidi,Procurement Manager,0501234567,ahmed@gulfsteel.ae,Sara Khalid,0507654321,sara@gulfsteel.ae,www.gulfsteel.ae,UAE,Dubai,Al Quoz Industrial Area 3,Steel Fabrication,Construction,fabricator;structural,Prospect,Hot,250000,2026-06-20,HEA/HEB Beams;Flat Bars,Regular buyer for villa projects`;

function allActivityTypes() {
  return ["Note", "Phone Call", "Email", "In-Person Meeting", "Site Visit", "Video Call", "Quotation Sent", "Order Placed", "Reminder"];
}

function selectedActivityType() {
  const filters = state.activityFilters?.types || [];
  return filters.length === 1 ? filters[0] : "all";
}

function setSelectedActivityType(type) {
  updateActivityFilter("types", type && type !== "all" ? [type] : allActivityTypes());
}

function activityIconGlyph(type) {
  const normalized = String(type || "").toLowerCase();
  if (normalized.includes("phone")) return "☎";
  if (normalized.includes("email")) return "@";
  if (normalized.includes("meeting")) return "◌";
  if (normalized.includes("visit")) return "⌖";
  if (normalized.includes("video")) return "▣";
  if (normalized.includes("quotation")) return "Q";
  if (normalized.includes("order")) return "AED";
  if (normalized.includes("reminder")) return "!";
  if (normalized.includes("handoff")) return "↗";
  return "•";
}

function isoDateFromDate(date) {
  return date.toISOString().slice(0, 10);
}

function formatDisplayDate(dateValue) {
  const value = String(dateValue || "").slice(0, 10);
  if (!value) return "";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
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

function loadLeadAiSummaryCache() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LEAD_AI_SUMMARY_CACHE_KEY) || "{}");
    Object.entries(parsed || {}).forEach(([leadId, value]) => {
      if (!leadId || !value || typeof value !== "object") return;
      leadAiSummaryCache.set(leadId, value);
    });
  } catch {
    leadAiSummaryCache.clear();
  }
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function persistLeadAiSummaryCache() {
  const entries = [...leadAiSummaryCache.entries()].slice(-40);
  localStorage.setItem(LEAD_AI_SUMMARY_CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
}

function leadAiSummaryHeuristic(lead) {
  const latestActivity = asArray(lead?.activities)[0] || {};
  return JSON.stringify({
    id: lead?.id || "",
    stage: lead?.stage || "",
    priority: lead?.priority || "",
    last_activity: lead?.last_activity || "",
    next_action: lead?.next_action || "",
    next_action_date: lead?.next_action_date || "",
    quotation_ref: lead?.quotation_ref || "",
    activities: asArray(lead?.activities).length,
    latest_activity_at: latestActivity.at || latestActivity.activity_date || latestActivity.created_at || "",
    latest_activity_text: latestActivity.text || latestActivity.note || latestActivity.activity_required || ""
  });
}

function emptyLeadAiSummaryState() {
  return {
    visible: true,
    loading: false,
    error: "",
    data: null,
    generatedAt: "",
    fingerprint: "",
    provider: "",
    marketIntelUnavailableReason: "",
    minimized: false,
    mobileTab: window.innerWidth <= 900 ? "details" : "ai",
    cached: false
  };
}

function resetLeadAiSummaryState() {
  state.leadAiSummary = emptyLeadAiSummaryState();
}

function primeLeadAiSummaryState(lead) {
  const base = emptyLeadAiSummaryState();
  const cached = leadAiSummaryCache.get(String(lead?.id || ""));
  state.leadAiSummary = {
    ...base,
    ...(cached ? {
      data: cached.summary || null,
      generatedAt: cached.generatedAt || "",
      fingerprint: cached.fingerprint || "",
      provider: cached.provider || "",
      marketIntelUnavailableReason: cached.marketIntelUnavailableReason || "",
      cached: true
    } : {})
  };
}

function rememberLeadAiSummary(leadId, payload, lead) {
  leadAiSummaryCache.set(String(leadId), {
    summary: payload.summary || null,
    generatedAt: payload.generated_at || "",
    fingerprint: payload.fingerprint || "",
    provider: payload.provider || "",
    marketIntelUnavailableReason: payload.market_intelligence_unavailable_reason || "",
    heuristic: leadAiSummaryHeuristic(lead)
  });
  persistLeadAiSummaryCache();
}

function leadAiGeneratedLabel(value) {
  if (!value) return "Not generated yet";
  try {
    return new Date(value).toLocaleString("en-AE", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  } catch {
    return value;
  }
}

function summaryList(items, tone = "") {
  const rows = asArray(items).filter(Boolean);
  if (!rows.length) return `<p class="lead-ai-empty-copy">No items noted.</p>`;
  return `<ul class="lead-ai-list ${tone}">${rows.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function sourceList(items) {
  const rows = asArray(items).filter(Boolean);
  if (!rows.length) return `<p class="lead-ai-empty-copy">No source references attached.</p>`;
  return `
    <div class="lead-ai-source-list">
      ${rows.map(item => {
        const label = typeof item === "string" ? item : item.label || item.title || item.name || "Source";
        const url = typeof item === "string" ? "" : item.url || item.link || "";
        return url
          ? `<a class="lead-ai-source" href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`
          : `<span class="lead-ai-source">${escapeHtml(label)}</span>`;
      }).join("")}
    </div>
  `;
}

function leadAiCard(title, content, options = {}) {
  return `
    <article class="lead-ai-card ${options.tone || ""}">
      <div class="lead-ai-card-head">
        <h3>${escapeHtml(title)}</h3>
        ${options.meta ? `<span class="lead-ai-card-meta">${escapeHtml(options.meta)}</span>` : ""}
      </div>
      <div class="lead-ai-card-body">${content}</div>
    </article>
  `;
}

function renderLeadAiSummaryPanel(lead, options = {}) {
  const panel = options.panel || els.leadAiSummaryPagePanel;
  const content = options.content || els.leadAiSummaryPageContent;
  if (!panel || !content) return;
  const summaryState = state.leadAiSummary || emptyLeadAiSummaryState();
  const summary = summaryState.data;
  const confidence = summary?.confidence || "Medium";
  const stale = Boolean(summaryState.cached && summaryState.generatedAt && (lead?.last_activity || "") > summaryState.generatedAt.slice(0, 10));
  panel.classList.toggle("minimized", Boolean(summaryState.minimized));

  if (summaryState.minimized) {
    content.innerHTML = `
      <button class="lead-ai-restore" type="button" data-toggle-lead-ai-minimize="false">
        <span>AI Summary</span>
        <strong>${escapeHtml(lead.company_name || "Lead")}</strong>
      </button>
    `;
    return;
  }

  let body = "";
  if (summaryState.loading && !summary) {
    body = `
      <div class="lead-ai-loading">
        <span></span><span></span><span></span><span></span>
      </div>
    `;
  } else if (summary) {
    body = [
      leadAiCard("Current Lead Status", `<p>${escapeHtml(summary.current_lead_status || "No summary available.")}</p>`),
      leadAiCard("Market Intelligence", `
        <p>${escapeHtml(summary.market_intelligence || "Market intelligence unavailable.")}</p>
        ${summaryState.marketIntelUnavailableReason ? `<div class="lead-ai-note">${escapeHtml(summaryState.marketIntelUnavailableReason)}</div>` : ""}
      `, { tone: "intel" }),
      leadAiCard("Salesman Engagement History", `<p>${escapeHtml(summary.salesman_engagement_history || "No engagement history recorded.")}</p>`),
      leadAiCard("Risks / Attention Needed", summaryList(summary.risks_attention_needed, "risk"), { tone: "risk" }),
      leadAiCard("Recommended Next Action", `
        <p class="lead-ai-action-copy">${escapeHtml(summary.recommended_next_action || "No next action recommended yet.")}</p>
        ${summary.suggested_follow_up_message ? `<div class="lead-ai-followup"><span class="meta-label">Suggested follow-up message</span><p>${escapeHtml(summary.suggested_follow_up_message)}</p></div>` : ""}
      `, { tone: "action" }),
      leadAiCard("Data Gaps", summaryList(summary.data_gaps), { tone: "neutral" }),
      leadAiCard("Sources", sourceList(summary.sources), { meta: stale ? "Needs refresh" : "Current" })
    ].join("");
  } else if (summaryState.error) {
    body = `
      <div class="lead-ai-error-state">
        <strong>AI summary unavailable</strong>
        <p>${escapeHtml(summaryState.error)}</p>
      </div>
    `;
  } else {
    body = `<div class="lead-ai-empty-state"><strong>AI summary not generated yet.</strong><p>Open a lead and refresh the summary after activities, reminders, or PMRs are logged.</p></div>`;
  }

  content.innerHTML = `
    <header class="lead-ai-header">
      <div class="lead-ai-header-top">
        <span class="meta-label">AI Leads Overall Summary</span>
        <div class="lead-ai-header-actions">
          <button class="ghost-button" type="button" data-refresh-lead-ai-summary="${escapeHtml(lead.id)}">${summaryState.loading ? "Refreshing..." : "Refresh AI Summary"}</button>
          <button class="ghost-button lead-ai-minimize-button" type="button" data-toggle-lead-ai-minimize="true">Minimize</button>
        </div>
      </div>
      <div class="lead-ai-title-copy">
        <h2>${escapeHtml(lead.company_name || "Lead summary")}</h2>
        <p>Executive snapshot of CRM history, follow-up risk, and market signals.</p>
      </div>
    </header>
    <div class="lead-ai-toolbar">
      <span class="chip">${escapeHtml(confidence)} confidence</span>
      <span class="chip ${summaryState.cached ? "warm" : ""}">${summaryState.cached ? "Cached summary" : "Live summary"}</span>
      ${summaryState.provider ? `<span class="chip">${escapeHtml(summaryState.provider)}</span>` : ""}
      <span class="lead-ai-generated">Generated on ${escapeHtml(leadAiGeneratedLabel(summaryState.generatedAt))}</span>
    </div>
    ${summaryState.error && summary ? `<div class="lead-ai-inline-error">${escapeHtml(summaryState.error)}</div>` : ""}
    <div class="lead-ai-body">${body}</div>
  `;
}

async function loadLeadAiSummary(leadId, options = {}) {
  const lead = state.leads.find(item => item.id === leadId);
  if (!lead) return;
  if (state.selectedId !== leadId) return;
  if (state.leadAiSummary.loading && !options.force) return;
  state.leadAiSummary.loading = true;
  state.leadAiSummary.error = "";
  state.leadAiSummary.visible = true;
  renderLeadDrawer();
  try {
    const result = await api("/api/ai/lead-summary", {
      method: "POST",
      body: JSON.stringify({ leadId })
    });
    if (state.selectedId !== leadId) return;
    state.leadAiSummary.data = result.summary || null;
    state.leadAiSummary.generatedAt = result.generated_at || "";
    state.leadAiSummary.fingerprint = result.fingerprint || "";
    state.leadAiSummary.provider = result.provider || "";
    state.leadAiSummary.marketIntelUnavailableReason = result.market_intelligence_unavailable_reason || "";
    state.leadAiSummary.cached = false;
    rememberLeadAiSummary(leadId, result, lead);
  } catch (error) {
    if (state.selectedId !== leadId) return;
    state.leadAiSummary.error = state.leadAiSummary.data
      ? `Refresh failed: ${error.message}`
      : error.message;
  } finally {
    if (state.selectedId === leadId) {
      state.leadAiSummary.loading = false;
      renderLeadDrawer();
    }
  }
}

function openOutboxDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(OUTBOX_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
        const store = db.createObjectStore(OUTBOX_STORE, { keyPath: "id" });
        store.createIndex("created_at", "created_at");
        store.createIndex("status", "status");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withOutboxStore(mode, callback) {
  const db = await openOutboxDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OUTBOX_STORE, mode);
    const store = tx.objectStore(OUTBOX_STORE);
    const result = callback(store);
    tx.oncomplete = () => {
      db.close();
      resolve(result);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

async function outboxItems() {
  const db = await openOutboxDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OUTBOX_STORE, "readonly");
    const request = tx.objectStore(OUTBOX_STORE).getAll();
    request.onsuccess = () => resolve((request.result || []).sort((a, b) => Number(a.created_at || 0) - Number(b.created_at || 0)));
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

async function getOutboxItem(id) {
  const db = await openOutboxDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OUTBOX_STORE, "readonly");
    const request = tx.objectStore(OUTBOX_STORE).get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

async function putOutboxItem(item) {
  await withOutboxStore("readwrite", store => store.put(item));
  await refreshSyncState();
  registerBackgroundSync();
}

async function deleteOutboxItem(id) {
  await withOutboxStore("readwrite", store => store.delete(id));
  await refreshSyncState();
}

async function updateOutboxItem(item) {
  await withOutboxStore("readwrite", store => store.put(item));
  await refreshSyncState();
}

async function refreshSyncState() {
  try {
    const items = await outboxItems();
    state.sync.pending = items.length;
    state.sync.failed = items.filter(item => item.status === "failed").length;
  } catch {
    state.sync.pending = 0;
    state.sync.failed = 0;
  }
  renderSyncStatus();
}

function renderSyncStatus() {
  const pending = Number(state.sync.pending || 0);
  const failed = Number(state.sync.failed || 0);
  let label = "All synced";
  let tone = "synced";
  if (!state.sync.online) {
    label = `Offline - ${pending} pending`;
    tone = "offline";
  } else if (state.sync.syncing) {
    label = "Syncing...";
    tone = "syncing";
  } else if (failed) {
    label = `${failed} failed sync`;
    tone = "failed";
  } else if (pending) {
    label = `${pending} pending`;
    tone = "pending";
  }
  if (els.syncStatusPill) {
    els.syncStatusPill.textContent = label;
    els.syncStatusPill.className = `sync-status-pill ${tone}`;
    els.syncStatusPill.classList.toggle("hidden", !state.currentUser || (!pending && state.sync.online && !state.sync.syncing));
  }
  if (els.mobileAlertsBadge) {
    const attention = (state.attentionFlags || []).filter(flag => flag.status === "open").length;
    const count = pending + failed + attention;
    els.mobileAlertsBadge.textContent = String(count);
    els.mobileAlertsBadge.classList.toggle("hidden", !count);
  }
  if (els.quickLogSyncStatus) {
    els.quickLogSyncStatus.textContent = state.sync.online
      ? pending ? `${pending} item(s) waiting to sync.` : "Online and ready."
      : `Offline mode - saved logs will sync later. ${pending} pending.`;
  }
}

async function syncOutbox() {
  if (state.sync.syncing || !navigator.onLine || !state.currentUser) {
    await refreshSyncState();
    return;
  }
  state.sync.syncing = true;
  renderSyncStatus();
  try {
    const items = await outboxItems();
    for (const item of items) {
      if (item.status === "failed" && Number(item.attempts || 0) >= 5) continue;
      const next = { ...item, status: "syncing" };
      await updateOutboxItem(next);
      try {
        if (next.kind === "activity") {
          await api(`/api/leads/${encodeURIComponent(next.lead_id)}/activities`, {
            method: "POST",
            body: JSON.stringify(next.payload)
          });
        } else if (next.kind === "pmr") {
          await syncPendingPmr(next);
        } else if (next.kind === "lead_update") {
          await api(`/api/leads/${encodeURIComponent(next.lead_id)}`, {
            method: "PATCH",
            body: JSON.stringify(next.payload)
          });
        }
        await deleteOutboxItem(next.id);
      } catch (error) {
        const attempts = Number(next.attempts || 0) + 1;
        const latest = await getOutboxItem(next.id).catch(() => null);
        await updateOutboxItem({
          ...(latest || next),
          status: attempts >= 5 ? "failed" : "pending",
          attempts,
          last_error: error.message || "Sync failed"
        });
        if (!navigator.onLine) break;
      }
    }
    await refreshSyncState();
    if (!state.sync.pending) {
      setToast("All pending changes synced.", "success");
      await loadLeads();
    }
  } finally {
    state.sync.syncing = false;
    await refreshSyncState();
  }
}

async function syncPendingPmr(item) {
  let payload = { ...(item.payload || {}) };
  if (item.voice_note_blob && !payload.voice_note_id) {
    const uploaded = await uploadPmrVoiceBlob(item.voice_note_blob, item.voice_note_mime_type || "audio/webm");
    payload = {
      ...payload,
      voice_note_id: uploaded.id || "",
      voice_note_url: uploaded.url || "",
      voice_note_path: uploaded.path || "",
      voice_note_mime_type: uploaded.mime_type || item.voice_note_mime_type || "audio/webm",
      voice_note_size_bytes: String(uploaded.size_bytes || item.voice_note_size_bytes || "")
    };
    await updateOutboxItem({
      ...item,
      payload,
      voice_note_blob: null,
      voice_note_uploaded: true
    });
  }
  await api(`/api/leads/${encodeURIComponent(item.lead_id)}/pmrs`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

function registerBackgroundSync() {
  if (!("serviceWorker" in navigator) || !("SyncManager" in window)) return;
  navigator.serviceWorker.ready
    .then(registration => registration.sync.register("arg-outbox-sync"))
    .catch(() => null);
}

function isNetworkFailure(error) {
  return !navigator.onLine || error?.name === "TypeError" || /network|fetch|offline/i.test(error?.message || "");
}

function clientId(prefix = "local") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
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

  const result = await uploadPmrVoiceBlob(pmrVoiceBlob, pmrVoiceBlob.type || "audio/webm");
  els.pmrForm.elements.voice_note_id.value = result.id || "";
  els.pmrForm.elements.voice_note_url.value = result.url || "";
  els.pmrForm.elements.voice_note_path.value = result.path || "";
  els.pmrForm.elements.voice_note_mime_type.value = result.mime_type || pmrVoiceBlob.type || "audio/webm";
  els.pmrForm.elements.voice_note_size_bytes.value = String(result.size_bytes || pmrVoiceBlob.size || "");
  return result;
}

async function uploadPmrVoiceBlob(blob, fallbackType = "audio/webm") {
  const token = sessionStorage.getItem(SESSION_KEY);
  const mimeType = blob.type || fallbackType || "audio/webm";
  const body = blob.type ? blob : blob.slice(0, blob.size, mimeType);
  const response = await fetch("/api/pmr-voice-notes", {
    method: "POST",
    headers: {
      "Content-Type": mimeType,
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Voice note upload failed: ${response.status}`);
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
  return `<button class="small-action" type="button" data-edit-activity-lead="${escapeHtml(leadId)}" data-edit-activity-index="${escapeHtml(activityIndex)}">Correct</button>`;
}

function activityDeleteButton(leadId, activityIndex, activity = {}) {
  if (activityIndex == null || activityIndex < 0 || activity.delete_request) return "";
  return `<button class="small-action" type="button" data-delete-activity-lead="${escapeHtml(leadId)}" data-delete-activity-index="${escapeHtml(activityIndex)}">Request Review</button>`;
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
      ${activity.quotation_ref ? `<button class="quote-ref-pill" type="button" data-quotation-ref="${escapeHtml(activity.quotation_ref)}">Quote ${escapeHtml(activity.quotation_ref)}</button>` : ""}
      ${activity.delete_request ? `<span class="request-status ${escapeHtml(activity.request_status || "pending")}">Review request ${escapeHtml(activity.request_status || "pending")}</span>` : ""}
      ${activity.correction ? `<span class="meta-label">Correction for ${escapeHtml(activity.target_activity_summary || "previous activity")}</span>` : ""}
      ${activity.edited_at ? `<span class="meta-label">Legacy edited entry ${escapeHtml(String(activity.edited_at).slice(0, 10))}</span>` : ""}
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
  form.text.value = "";
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
  const promptText = targetType === "activity"
    ? "Reason for requesting activity review. The original activity will stay in history:"
    : "Reason for requesting lead deletion:";
  const reason = window.prompt(promptText);
  if (!reason?.trim()) return;
  await api(`/api/leads/${encodeURIComponent(leadId)}/delete-requests`, {
    method: "POST",
    body: JSON.stringify({
      target_type: targetType,
      activity_index: activityIndex,
      reason: reason.trim()
    })
  });
  window.alert(targetType === "activity" ? "Activity review request sent to admin." : "Delete request sent to admin for approval.");
  await loadLeads();
}

async function handleActivityDelete(leadId, activityIndex) {
  await submitDeleteRequest(leadId, "activity", activityIndex);
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
    const normalizedAction = normalizeNextActionPlan(text);
    await api(`/api/leads/${encodeURIComponent(leadId)}`, {
      method: "PATCH",
      body: JSON.stringify({ next_action: normalizedAction, next_action_date: date })
    });
    await api(`/api/leads/${encodeURIComponent(leadId)}/activities`, {
      method: "POST",
      body: JSON.stringify({ type: "Note", text: `Follow-up rescheduled to ${date} ${time}: ${normalizedAction}` })
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
        <h2>Review Requests</h2>
        <span>${visible.length} request${visible.length === 1 ? "" : "s"}</span>
      </div>
      <div class="delete-request-list">
        ${visible.map(request => `
          <article class="delete-request-card">
            <div>
              <span class="request-status ${escapeHtml(request.request_status || "pending")}">${escapeHtml(request.request_status || "pending")}</span>
              <strong>${escapeHtml(request.target_type === "lead" ? "Lead deletion" : "Activity review")}</strong>
              <p>${escapeHtml(request.reason || request.text || "No reason provided.")}</p>
              ${request.target_activity_summary ? `<p class="meta-label">${escapeHtml(request.target_activity_summary)}</p>` : ""}
              <span class="meta-label">Requested by ${escapeHtml(request.requested_by_name || "User")} on ${escapeHtml(String(request.requested_at || request.at || "").slice(0, 10))}</span>
            </div>
            ${state.currentUser?.role === "admin" && request.request_status === "pending" ? `
              <div class="delete-request-actions">
                <button class="small-action ${request.target_type === "lead" ? "danger" : ""}" type="button" data-review-delete-lead="${escapeHtml(lead.id)}" data-review-delete-request="${escapeHtml(request.id)}" data-review-delete-action="approve">${request.target_type === "lead" ? "Approve Delete" : "Mark Reviewed"}</button>
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

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || "");
  return date.toLocaleString("en-AE", { dateStyle: "medium", timeStyle: "short" });
}

function lastLoginLabel(value) {
  return value ? formatDateTime(value) : "Never logged in";
}

function daysSince(dateValue) {
  const date = String(dateValue || "").slice(0, 10);
  if (!date) return 999;
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return 999;
  const start = new Date(`${today()}T00:00:00`);
  return Math.round((start - parsed) / 86_400_000);
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

function isIosSafari() {
  const ua = navigator.userAgent || "";
  return /iphone|ipad|ipod/i.test(ua) && /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
}

function isStandalonePwa() {
  return window.matchMedia?.("(display-mode: standalone)")?.matches || navigator.standalone === true;
}

function maybeShowInstallBanner() {
  if (!els.installBanner || isStandalonePwa() || !state.currentUser) return;
  const dismissedUntil = Number(localStorage.getItem(PWA_INSTALL_DISMISSED_KEY) || 0);
  if (Date.now() < dismissedUntil) return;
  const visits = Number(localStorage.getItem(PWA_VISIT_KEY) || 0) + 1;
  localStorage.setItem(PWA_VISIT_KEY, String(visits));
  if (visits < 3) return;
  const ios = isIosSafari();
  if (!state.installPrompt && !ios) return;
  els.installBannerTitle.textContent = ios ? "Add ARG Leads to Home Screen" : "Install ARG Leads";
  els.installBannerText.textContent = ios
    ? "On iPhone, tap Share, then Add to Home Screen for app-style access."
    : "Install ARG Leads on your phone for one-tap access and offline activity logging.";
  els.installAppButton.classList.toggle("hidden", ios);
  els.installBanner.classList.remove("hidden");
}

function initPwaShell() {
  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    state.installPrompt = event;
    maybeShowInstallBanner();
  });

  els.installAppButton?.addEventListener("click", async () => {
    if (!state.installPrompt) return;
    state.installPrompt.prompt();
    await state.installPrompt.userChoice.catch(() => null);
    state.installPrompt = null;
    els.installBanner?.classList.add("hidden");
  });

  els.dismissInstallBanner?.addEventListener("click", () => {
    localStorage.setItem(PWA_INSTALL_DISMISSED_KEY, String(Date.now() + 14 * 24 * 60 * 60 * 1000));
    els.installBanner?.classList.add("hidden");
  });

  els.refreshAppButton?.addEventListener("click", () => {
    navigator.serviceWorker?.controller?.postMessage({ type: "SKIP_WAITING" });
    window.location.reload();
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").then(registration => {
      if (registration.waiting) els.updateBanner?.classList.remove("hidden");
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            els.updateBanner?.classList.remove("hidden");
          }
        });
      });
    }).catch(() => null);
    navigator.serviceWorker.addEventListener("message", event => {
      if (event.data?.type === "SYNC_OUTBOX") syncOutbox();
    });
  }

  window.addEventListener("online", () => {
    state.sync.online = true;
    refreshSyncState();
    syncOutbox();
  });
  window.addEventListener("offline", () => {
    state.sync.online = false;
    refreshSyncState();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) syncOutbox();
  });
}

function recentQuickLogLeads() {
  return [...state.leads]
    .sort((a, b) => String(b.last_activity || "").localeCompare(String(a.last_activity || "")))
    .slice(0, 5);
}

function quickLogLeadOptions() {
  const query = String(els.quickLogCompanySearch?.value || "").trim().toLowerCase();
  const leads = query
    ? state.leads.filter(lead => [
      lead.company_name,
      lead.contact_name,
      lead.territory,
      lead.location,
      lead.address
    ].some(value => String(value || "").toLowerCase().includes(query)))
    : state.leads;
  return leads.slice(0, 80);
}

function setQuickLogType(type) {
  state.quickLog.type = type;
  renderQuickLogSheet();
}

function renderQuickLogSheet() {
  if (!els.quickLogDialog) return;
  const options = quickLogLeadOptions();
  const selected = state.quickLog.leadId || options[0]?.id || state.leads[0]?.id || "";
  state.quickLog.leadId = selected;
  if (els.quickLogLeadSelect) {
    els.quickLogLeadSelect.innerHTML = options.map(lead => `<option value="${escapeHtml(lead.id)}" ${lead.id === selected ? "selected" : ""}>${escapeHtml(lead.company_name || "Unnamed company")} - ${escapeHtml(lead.territory || lead.location || "No territory")}</option>`).join("");
    els.quickLogLeadSelect.value = selected;
  }
  if (els.quickLogRecent) {
    els.quickLogRecent.innerHTML = recentQuickLogLeads().map(lead => `<button type="button" data-quick-lead="${escapeHtml(lead.id)}">${escapeHtml(lead.company_name)}</button>`).join("");
  }
  if (els.quickLogTypes) {
    els.quickLogTypes.innerHTML = QUICK_LOG_TYPES.map(type => `<button type="button" class="${state.quickLog.type === type ? "active" : ""}" data-quick-type="${escapeHtml(type)}">${escapeHtml(ACTIVITY_TYPE_ICONS[type] || "")}<span>${escapeHtml(type)}</span></button>`).join("");
  }
  if (els.quickPhraseChips) {
    els.quickPhraseChips.innerHTML = QUICK_PHRASES.map(phrase => `<button type="button" data-quick-phrase="${escapeHtml(phrase)}">${escapeHtml(phrase)}</button>`).join("");
  }
  els.quickQuoteField?.classList.toggle("hidden", state.quickLog.type !== "Quotation Sent");
  els.quickOrderField?.classList.toggle("hidden", state.quickLog.type !== "Order Placed");
  renderSyncStatus();
}

function openQuickLog(leadId = "") {
  state.quickLog.leadId = leadId || state.selectedId || state.leads[0]?.id || "";
  state.quickLog.type = state.quickLog.type || "In-Person Meeting";
  if (els.quickLogCompanySearch) els.quickLogCompanySearch.value = "";
  if (els.quickLogNote) els.quickLogNote.value = "";
  if (els.quickNextAction) els.quickNextAction.value = "";
  if (els.quickNextDate) els.quickNextDate.value = "";
  if (els.quickQuotationRef) els.quickQuotationRef.value = "";
  if (els.quickOrderVolume) els.quickOrderVolume.value = "";
  setMessage(els.quickLogMessage, "");
  renderQuickLogSheet();
  els.quickLogDialog?.showModal();
  requestQuickLogLocation();
}

function appendQuickPhrase(phrase) {
  if (!els.quickLogNote) return;
  const current = els.quickLogNote.value.trim();
  els.quickLogNote.value = current ? `${current}; ${phrase}` : phrase;
  els.quickLogNote.focus();
}

function setQuickDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + Number(days || 0));
  if (els.quickNextDate) els.quickNextDate.value = date.toISOString().slice(0, 10);
}

function distanceKm(a, b) {
  const lat1 = Number(a.lat);
  const lon1 = Number(a.lng);
  const lat2 = Number(b.lat);
  const lon2 = Number(b.lng);
  if ([lat1, lon1, lat2, lon2].some(value => Number.isNaN(value))) return Infinity;
  const toRad = value => value * Math.PI / 180;
  const earth = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return earth * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function requestQuickLogLocation() {
  if (!navigator.geolocation || !els.quickLogNear) return;
  navigator.geolocation.getCurrentPosition(position => {
    const here = { lat: position.coords.latitude, lng: position.coords.longitude };
    const nearby = state.leads
      .map(lead => ({
        lead,
        km: distanceKm(here, { lat: lead.latitude, lng: lead.longitude })
      }))
      .filter(item => item.km <= 0.5)
      .sort((a, b) => a.km - b.km)[0];
    if (!nearby) return;
    els.quickLogNear.innerHTML = `<button type="button" data-quick-lead="${escapeHtml(nearby.lead.id)}">Near you: ${escapeHtml(nearby.lead.company_name)} (${nearby.km.toFixed(1)} km)</button>`;
    els.quickLogNear.classList.remove("hidden");
    state.quickLog.type = "Site Visit";
    renderQuickLogSheet();
  }, () => null, { maximumAge: 300000, timeout: 2500, enableHighAccuracy: false });
}

function quickLogPayload() {
  const leadId = els.quickLogLeadSelect?.value || state.quickLog.leadId;
  const note = String(els.quickLogNote?.value || "").trim();
  const nextAction = String(els.quickNextAction?.value || "").trim();
  const nextDate = String(els.quickNextDate?.value || "").trim();
  const type = state.quickLog.type || "Note";
  const payload = {
    id: clientId("act"),
    type,
    text: note || type
  };
  if (type === "Quotation Sent" && els.quickQuotationRef?.value?.trim()) {
    payload.quotation_ref = els.quickQuotationRef.value.trim();
    payload.quotation_status = "pending";
  }
  if (type === "Order Placed" && els.quickOrderVolume?.value?.trim()) {
    payload.order_volume_mt = els.quickOrderVolume.value.trim();
    payload.text = [payload.text, `Order volume: ${payload.order_volume_mt}`].filter(Boolean).join("; ");
  }
  if (nextAction && nextDate) {
    payload.reminder = true;
    payload.reminder_type = "General follow-up";
    payload.due_date = nextDate;
    payload.due_time = "09:00";
    payload.activity_required = nextAction;
    payload.text = [payload.text, `Next action: ${nextAction} on ${nextDate}`].filter(Boolean).join("; ");
  }
  return { leadId, payload };
}

function applyOptimisticActivity(leadId, payload) {
  const lead = state.leads.find(item => item.id === leadId);
  if (!lead) return;
  if ((lead.activities || []).some(activity => activity.id && activity.id === payload.id)) return;
  const activityDate = payload.at || today();
  lead.activities = [{ ...payload, at: activityDate, pending_sync: true }, ...(lead.activities || [])];
  lead.last_activity = activityDate;
  render();
}

async function queueActivityForSync(leadId, payload) {
  const queuedPayload = { ...payload, id: payload.id || clientId("act") };
  await putOutboxItem({
    id: queuedPayload.id,
    created_at: Date.now(),
    kind: "activity",
    lead_id: leadId,
    payload: queuedPayload,
    status: "pending",
    attempts: 0,
    last_error: null
  });
  applyOptimisticActivity(leadId, queuedPayload);
}

async function mergePendingActivitiesIntoState() {
  try {
    const items = await outboxItems();
    items
      .filter(item => item.kind === "activity" && item.payload)
      .forEach(item => applyOptimisticActivity(item.lead_id, item.payload));
  } catch {
    // IndexedDB may be unavailable in private browsing; normal server data still renders.
  }
}

async function saveQuickLog() {
  const { leadId, payload } = quickLogPayload();
  if (!leadId) {
    setMessage(els.quickLogMessage, "Choose a company first.", "error");
    return;
  }
  try {
    if (!navigator.onLine) throw new Error("offline");
    await api(`/api/leads/${encodeURIComponent(leadId)}/activities`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    setToast("Activity logged.", "success");
    els.quickLogDialog?.close();
    await loadLeads();
    if (["In-Person Meeting", "Site Visit"].includes(payload.type)) {
      setToast("Meeting logged. Open the company record to file PMR.", "success");
    }
  } catch (error) {
    if (!isNetworkFailure(error) && error.message !== "offline") {
      setMessage(els.quickLogMessage, error.message, "error");
      return;
    }
    await queueActivityForSync(leadId, payload);
    els.quickLogDialog?.close();
    setToast("Saved - will sync when online.", "success");
  }
}

async function renderPendingChanges() {
  const items = await outboxItems();
  if (!els.pendingChangesList) return;
  els.pendingChangesList.innerHTML = items.length ? items.map(item => {
    const lead = state.leads.find(record => record.id === item.lead_id);
    const label = item.kind === "pmr"
      ? `PMR${item.voice_note_blob ? " + voice note" : item.voice_note_uploaded ? " + uploaded voice" : ""}`
      : item.kind || "change";
    const summary = item.kind === "pmr"
      ? item.payload?.notes || item.payload?.meeting_date || "Post-meeting report"
      : item.payload?.type || item.payload?.stage || "Pending change";
    return `
      <article class="pending-item ${escapeHtml(item.status || "pending")}">
        <strong>${escapeHtml(label)} - ${escapeHtml(lead?.company_name || "Lead")}</strong>
        <span>${escapeHtml(summary)} - ${new Date(item.created_at).toLocaleString()}</span>
        ${item.last_error ? `<small>${escapeHtml(item.last_error)}</small>` : ""}
      </article>
    `;
  }).join("") : `<p class="empty-copy">No pending changes on this device.</p>`;
}

function openPendingChanges() {
  renderPendingChanges();
  els.pendingChangesDialog?.showModal();
}

function renderMobileMap() {
  if (!els.mobileMapList) return;
  const leads = state.leads.filter(lead => lead.google_maps_url || (lead.latitude && lead.longitude)).slice(0, 50);
  els.mobileMapList.innerHTML = leads.length ? leads.map(lead => {
    const destination = lead.latitude && lead.longitude ? `${lead.latitude},${lead.longitude}` : encodeURIComponent(lead.address || lead.company_name || "");
    const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    return `
      <article class="pending-item">
        <strong>${escapeHtml(lead.company_name)}</strong>
        <span>${escapeHtml([lead.stage, lead.territory, lead.last_activity].filter(Boolean).join(" - "))}</span>
        <div class="pending-actions">
          <a class="ghost-button" href="${escapeHtml(lead.google_maps_url || navUrl)}" target="_blank" rel="noopener">Open map</a>
          <a class="primary-button" href="${escapeHtml(navUrl)}" target="_blank" rel="noopener">Navigate</a>
          <button class="ghost-button" type="button" data-map-log="${escapeHtml(lead.id)}">Log</button>
        </div>
      </article>
    `;
  }).join("") : `<p class="empty-copy">No map links or coordinates saved yet.</p>`;
}

function openMobileMap() {
  renderMobileMap();
  els.mobileMapDialog?.showModal();
}

const AI_ACTION_LABELS = {
  prepare: "Prepare me for this meeting",
  next: "What should I do next?",
  email: "Draft follow-up email",
  summary: "Summarise this relationship",
  prepare_meeting: "Prepare me for this meeting",
  next_action: "What should I do next?",
  draft_email: "Draft follow-up email",
  summarise_relationship: "Summarise this relationship"
};

const SALESPERSON_ACTION_LABELS = {
  focus_today: "What should I focus on today?",
  neglected: "Who have I neglected?",
  pipeline_health: "My pipeline health",
  new_intel: "Any new intel on my prospects?"
};

const AI_LOADING_MESSAGES = [
  "Reading activity history...",
  "Reviewing the latest PMR...",
  "Checking open actions...",
  "Drafting a grounded answer..."
];

function aiLead() {
  return state.leads.find(lead => lead.id === state.aiAction.leadId) || {};
}

function linkCompanyNames(html) {
  let next = html;
  [...state.leads]
    .sort((a, b) => String(b.company_name || "").length - String(a.company_name || "").length)
    .forEach(lead => {
      const name = String(lead.company_name || "").trim();
      if (!name) return;
      const escaped = escapeHtml(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      next = next.replace(new RegExp(`(?<![">])${escaped}(?![^<]*>|[^<>]*</button>)`, "g"), `<button class="ai-company-link" type="button" data-ai-company="${escapeHtml(lead.id)}">${escapeHtml(name)}</button>`);
    });
  return next;
}

function simpleMarkdown(markdown) {
  const lines = String(markdown || "").split(/\r?\n/);
  let html = "";
  let inList = false;
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      return;
    }
    if (trimmed.startsWith("## ")) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      html += `<h3>${escapeHtml(trimmed.slice(3))}</h3>`;
      return;
    }
    if (trimmed.startsWith("- ")) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${escapeHtml(trimmed.slice(2))}</li>`;
      return;
    }
    if (inList) {
      html += "</ul>";
      inList = false;
    }
    html += `<p>${escapeHtml(trimmed)}</p>`;
  });
  if (inList) html += "</ul>";
  return html || "<p>No result returned.</p>";
}

function renderPipelineMetrics(metrics = {}, insight = "") {
  const byStatus = metrics.by_status || {};
  const max = Math.max(1, ...Object.values(byStatus).map(Number));
  const trend = metrics.activity_trend;
  const trendClass = trend == null ? "neutral" : trend >= 0 ? "up" : "down";
  const trendText = trend == null ? "No last-month baseline" : `${trend >= 0 ? "Up" : "Down"} ${Math.abs(trend)}%`;
  const bars = (state.settings.stages || Object.keys(byStatus)).map(status => {
    const count = Number(byStatus[status] || 0);
    return `
      <div class="pipeline-health-row">
        <span>${escapeHtml(status)}</span>
        <i><b style="width:${Math.max(4, (count / max) * 100)}%"></b></i>
        <strong>${count}</strong>
      </div>
    `;
  }).join("");
  const overdue = metrics.overdue_action_companies || [];
  return `
    <div class="pipeline-health-result">
      ${insight ? `<p class="pipeline-insight">${escapeHtml(insight)}</p>` : ""}
      <article class="pipeline-total"><span>Total companies</span><strong>${Number(metrics.total_companies || 0)}</strong></article>
      <div class="pipeline-health-bars">${bars}</div>
      <div class="pipeline-health-alerts">
        <button class="pipeline-health-shortcut" type="button" data-salesperson-ai-action="neglected">
          Past expected contact frequency: <strong>${Number(metrics.contact_overdue_count || 0)}</strong> companies
        </button>
        <span class="trend ${trendClass}">Activity trend: ${escapeHtml(trendText)} (${Number(metrics.activities_this_month || 0)} this month vs ${Number(metrics.activities_last_month || 0)} last month)</span>
      </div>
      <section class="pipeline-overdue-list">
        <h3>Overdue next actions: ${Number(metrics.overdue_next_actions || 0)}</h3>
        ${overdue.map(item => `
          <button type="button" data-ai-company="${escapeHtml(item.id)}">
            <strong>${escapeHtml(item.name)}</strong>
            <span>${escapeHtml(item.action)} - ${Number(item.days_overdue || 0)} days overdue</span>
          </button>
        `).join("") || `<p>No overdue next actions.</p>`}
      </section>
    </div>
  `;
}

async function copyText(text, success = "Copied.") {
  await navigator.clipboard?.writeText(String(text || ""));
  setToast(success, "success");
}

function parseEmailDraft(output) {
  const text = String(output || "");
  const subjectMatch = text.match(/^Subject:\s*(.+)$/im);
  const subject = subjectMatch?.[1]?.trim() || "Follow-up from Al Ras Steel";
  const body = text.replace(/^Subject:\s*.+$/im, "").trim();
  return { subject, body };
}

function aiFooterMarkup(action) {
  const base = `<button class="ghost-button" type="button" data-ai-regenerate>Regenerate</button>`;
  if (state.aiAction.scope === "salesperson") {
    return `${base}<button class="primary-button" type="button" data-ai-copy>${state.aiAction.type === "metrics" ? "Copy summary" : "Copy"}</button>`;
  }
  if (action === "prepare" || action === "prepare_meeting") {
    return `${base}<button class="primary-button" type="button" data-ai-copy>Copy brief</button><button class="ghost-button" type="button" data-ai-save-activity>Save to activity log</button>`;
  }
  if (action === "next" || action === "next_action") {
    return `${base}<button class="primary-button" type="button" data-ai-copy>Copy</button><button class="ghost-button" type="button" data-ai-set-next>Set as next action</button>`;
  }
  if (action === "email" || action === "draft_email") {
    return `${base}<button class="primary-button" type="button" data-ai-copy>Copy email</button><button class="ghost-button" type="button" data-ai-mailto>Open in mail app</button>`;
  }
  return `${base}<button class="primary-button" type="button" data-ai-copy>Copy</button><button class="ghost-button" type="button" data-ai-save-notes>Save to notes</button>`;
}

function renderAiActionDialog() {
  if (!els.aiActionDialog) return;
  const lead = aiLead();
  const action = state.aiAction.action;
  els.aiActionTitle.textContent = state.aiAction.label || AI_ACTION_LABELS[action] || "AI Action";
  els.aiActionSubtitle.textContent = state.aiAction.scope === "salesperson"
    ? "Generated from your visible portfolio only"
    : lead.company_name ? `${lead.company_name} - grounded in CRM records` : "Generated from CRM records";
  els.aiActionLoading?.classList.toggle("hidden", !state.aiAction.loading);
  const hasResult = state.aiAction.type === "metrics" ? Boolean(state.aiAction.metrics) : Boolean(state.aiAction.output);
  els.aiActionResult?.classList.toggle("hidden", state.aiAction.loading || !hasResult);
  if (els.aiActionResult) {
    els.aiActionResult.innerHTML = state.aiAction.type === "metrics"
      ? renderPipelineMetrics(state.aiAction.metrics, state.aiAction.insight)
      : state.aiAction.scope === "salesperson"
        ? linkCompanyNames(simpleMarkdown(state.aiAction.output))
        : simpleMarkdown(state.aiAction.output);
  }
  if (els.aiActionFooter) {
    els.aiActionFooter.innerHTML = hasResult
      ? `${aiFooterMarkup(action)}<span>AI-generated from your CRM data - review before acting.</span>`
      : `<button class="ghost-button" type="button" data-ai-regenerate>Retry</button>`;
  }
  if (els.aiActionMessage) {
    setMessage(
      els.aiActionMessage,
      state.aiAction.error || (state.aiAction.provider === "fallback" ? "Server AI key is not configured, so a CRM-data fallback was used." : ""),
      state.aiAction.error ? "error" : state.aiAction.provider === "fallback" ? "" : "success"
    );
  }
}

function startAiLoadingTicker() {
  clearInterval(startAiLoadingTicker.timer);
  let index = 0;
  if (els.aiActionLoadingText) els.aiActionLoadingText.textContent = AI_LOADING_MESSAGES[index];
  startAiLoadingTicker.timer = setInterval(() => {
    index = (index + 1) % AI_LOADING_MESSAGES.length;
    if (els.aiActionLoadingText) els.aiActionLoadingText.textContent = AI_LOADING_MESSAGES[index];
  }, 1800);
}

async function runLeadAiAction(lead, action) {
  if (!lead || state.aiAction.loading) return;
  if (!navigator.onLine) {
    setToast("AI briefings need a connection.", "error");
    return;
  }
  if (Date.now() < state.aiCooldownUntil) {
    setToast("Please wait a few seconds before running another AI action.", "error");
    return;
  }
  state.aiAction = { scope: "company", leadId: lead.id, action, label: AI_ACTION_LABELS[action] || "AI Action", output: "", loading: true, error: "", provider: "", type: "markdown", metrics: null, insight: "" };
  renderAiActionDialog();
  els.aiActionDialog?.showModal();
  startAiLoadingTicker();
  try {
    const result = await api(`/api/leads/${encodeURIComponent(lead.id)}/ai-actions`, {
      method: "POST",
      body: JSON.stringify({ action })
    });
    state.aiAction = {
      scope: "company",
      leadId: lead.id,
      action: result.action || action,
      label: result.label || AI_ACTION_LABELS[action] || "AI Action",
      output: result.output || "",
      loading: false,
      error: "",
      provider: result.provider || "",
      type: "markdown",
      metrics: null,
      insight: ""
    };
    state.aiCooldownUntil = Date.now() + 3000;
  } catch (error) {
    state.aiAction = { ...state.aiAction, loading: false, error: "Couldn't generate this right now. Please try again.", output: "", provider: "", metrics: null };
  } finally {
    clearInterval(startAiLoadingTicker.timer);
    renderAiActionDialog();
  }
}

async function runSalespersonAiAction(action, { showDialog = true } = {}) {
  if (!navigator.onLine) {
    setToast("AI briefings need a connection.", "error");
    return;
  }
  if (state.dailyAiLoading || Date.now() < state.aiCooldownUntil) return;
  state.dailyAiLoading = true;
  state.aiAction = { scope: "salesperson", leadId: "", action, label: SALESPERSON_ACTION_LABELS[action] || "Daily AI", output: "", loading: true, error: "", provider: "", type: "markdown", metrics: null, insight: "" };
  if (showDialog) {
    renderAiActionDialog();
    els.aiActionDialog?.showModal();
    startAiLoadingTicker();
  }
  try {
    const result = await api("/api/salesperson-ai-actions", {
      method: "POST",
      body: JSON.stringify({ action })
    });
    state.aiAction = {
      scope: "salesperson",
      leadId: "",
      action: result.action || action,
      label: result.label || SALESPERSON_ACTION_LABELS[action] || "Daily AI",
      output: result.result || "",
      loading: false,
      error: "",
      provider: result.provider || "",
      type: result.type || "markdown",
      metrics: result.metrics || null,
      insight: result.insight || ""
    };
    if (action === "pipeline_health" && result.metrics) state.dailyPipelineSummary = { metrics: result.metrics, insight: result.insight || "" };
    state.aiCooldownUntil = Date.now() + 3000;
  } catch {
    state.aiAction = { ...state.aiAction, loading: false, error: "Couldn't generate this right now. Please try again.", output: "", metrics: null };
  } finally {
    state.dailyAiLoading = false;
    clearInterval(startAiLoadingTicker.timer);
    if (showDialog) renderAiActionDialog();
    renderDailyAiPanel();
  }
}

async function saveAiOutputToActivity() {
  const lead = aiLead();
  if (!lead.id || !state.aiAction.output) return;
  await api(`/api/leads/${encodeURIComponent(lead.id)}/activities`, {
    method: "POST",
    body: JSON.stringify({ type: "Note", text: `Meeting prep generated:\n${state.aiAction.output}` })
  });
  setToast("AI brief saved to activity log.", "success");
  await loadLeads();
}

async function setAiOutputAsNextAction() {
  const lead = aiLead();
  if (!lead.id || !state.aiAction.output) return;
  const defaultAction = state.aiAction.output.split(/\r?\n/).map(line => line.replace(/^#+\s*/, "").trim()).find(line => line && !["Next action", "Why this action", "Watch out for"].includes(line)) || "";
  const nextAction = window.prompt("Confirm next action:", defaultAction.slice(0, 220));
  if (!nextAction?.trim()) return;
  const nextDate = window.prompt("Due date (YYYY-MM-DD):", lead.next_action_date || today()) || lead.next_action_date || today();
  const normalizedAction = normalizeNextActionPlan(nextAction);
  await api(`/api/leads/${encodeURIComponent(lead.id)}`, {
    method: "PATCH",
    body: JSON.stringify({ next_action: normalizedAction, next_action_date: nextDate })
  });
  setToast("Next action updated.", "success");
  await loadLeads();
}

async function saveAiOutputToNotes() {
  const lead = aiLead();
  if (!lead.id || !state.aiAction.output) return;
  const note = [`AI relationship summary (${today()}):`, state.aiAction.output].join("\n");
  await api(`/api/leads/${encodeURIComponent(lead.id)}`, {
    method: "PATCH",
    body: JSON.stringify({ notes: [lead.notes, note].filter(Boolean).join("\n\n") })
  });
  setToast("Summary appended to lead notes.", "success");
  await loadLeads();
}

function openAiMail() {
  const lead = aiLead();
  const draft = parseEmailDraft(state.aiAction.output);
  const url = `mailto:${encodeURIComponent(lead.email || "")}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`;
  window.location.href = url;
}

function openFlagAttentionModal(lead) {
  if (!lead || !els.flagAttentionDialog) return;
  els.flagAttentionForm.reset();
  els.flagAttentionForm.elements.company_id.value = lead.id;
  els.flagAttentionTitle.textContent = `Flag ${lead.company_name} for director attention`;
  setMessage(els.flagAttentionMessage, "");
  els.flagAttentionDialog.showModal();
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

function clearDynamicLeadFormOptions(name) {
  const field = els.leadForm?.elements?.[name];
  if (!field || field.tagName !== "SELECT") return;
  [...field.options].forEach(option => {
    if (option.dataset.dynamic === "true") option.remove();
  });
}

function ensureLeadFormSelectValue(name, value, fallback = "") {
  const field = els.leadForm?.elements?.[name];
  if (!field || field.tagName !== "SELECT") return;
  clearDynamicLeadFormOptions(name);
  const normalized = formValue(value);
  if (!normalized) {
    if (fallback) field.value = fallback;
    return;
  }
  const exists = [...field.options].some(option => option.value === normalized);
  if (!exists) {
    const option = document.createElement("option");
    option.value = normalized;
    option.textContent = normalized;
    option.dataset.dynamic = "true";
    field.appendChild(option);
  }
  field.value = normalized;
}

function clearLeadAutoEnrichmentFields() {
  leadAutoEnrichmentFields.forEach(fieldName => {
    const field = els.leadForm.elements[fieldName];
    if (!field) return;
    field.value = "";
    leadFormTouched.delete(fieldName);
  });
}

function resetLeadEnrichmentSession({ clearFields = false } = {}) {
  clearTimeout(leadEnrichmentTimer);
  leadEnrichmentTimer = null;
  leadEnrichmentKey = "";
  leadCompanyInputKey = "";
  if (clearFields) clearLeadAutoEnrichmentFields();
}

function resetLeadFormForNewLead() {
  state.editingLeadId = "";
  state.editingOriginalStage = "";
  state.editingLostData = null;
  els.leadForm.reset();
  leadFormTouched.clear();
  state.duplicateMatches = [];
  state.duplicateChecking = false;
  clearTimeout(duplicateCheckTimer);
  resetLeadEnrichmentSession();
  if (!isAdminOrManager()) {
    els.formSalesman.value = state.currentUser.name;
    if (els.formTerritory) els.formTerritory.value = state.currentUser.territory || els.formTerritory.value;
  }
  if (els.leadForm.elements.next_action_date) {
    els.leadForm.elements.next_action_date.value = today();
  }
  ensureLeadFormSelectValue("next_action", NEXT_ACTION_PLAN_OPTIONS[0], NEXT_ACTION_PLAN_OPTIONS[0]);
  ensureLeadFormSelectValue("activity_purpose", ACTIVITY_PURPOSE_OPTIONS[0], ACTIVITY_PURPOSE_OPTIONS[0]);
  renderDuplicateWarning();
  setEnrichmentStatus("Type a company name to fetch Google business info.");
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

function leadCompanyOnlyKey(companyName) {
  return String(companyName || "").trim().toLowerCase();
}

function clientFuzzyNormalise(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[.,\-&']/g, " ")
    .replace(/\b(l\s*l\s*c|llc|l\.l\.c|fze|fzco|wll|bsc|co|company|ltd|limited|trading|group|industries|international|est|establishment|contracting|construction|services|solutions)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function clientJaroWinkler(leftInput, rightInput) {
  const left = String(leftInput || "");
  const right = String(rightInput || "");
  if (left === right) return 1;
  if (!left.length || !right.length) return 0;
  const matchDistance = Math.max(Math.floor(Math.max(left.length, right.length) / 2) - 1, 0);
  const leftMatches = new Array(left.length).fill(false);
  const rightMatches = new Array(right.length).fill(false);
  let matches = 0;
  let transpositions = 0;
  for (let i = 0; i < left.length; i += 1) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, right.length);
    for (let j = start; j < end; j += 1) {
      if (rightMatches[j] || left[i] !== right[j]) continue;
      leftMatches[i] = true;
      rightMatches[j] = true;
      matches += 1;
      break;
    }
  }
  if (!matches) return 0;
  let rightIndex = 0;
  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    if (!leftMatches[leftIndex]) continue;
    while (!rightMatches[rightIndex]) rightIndex += 1;
    if (left[leftIndex] !== right[rightIndex]) transpositions += 1;
    rightIndex += 1;
  }
  const jaro = (matches / left.length + matches / right.length + (matches - transpositions / 2) / matches) / 3;
  let prefix = 0;
  for (let i = 0; i < Math.min(4, left.length, right.length); i += 1) {
    if (left[i] === right[i]) prefix += 1;
    else break;
  }
  return jaro + prefix * 0.1 * (1 - jaro);
}

function clientDuplicateCandidates(companyName, leads, duplicateThreshold = 0.85, warnThreshold = 0.75) {
  const input = clientFuzzyNormalise(companyName);
  if (input.length < 4) return [];
  return (leads || [])
    .map(lead => ({
      id: lead.id,
      company_name: lead.company_name,
      assigned_salesman: lead.assigned_salesman,
      territory: lead.territory,
      stage: lead.stage,
      score: clientJaroWinkler(input, clientFuzzyNormalise(lead.company_name))
    }))
    .filter(match => match.score >= warnThreshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(match => ({ ...match, isDuplicate: match.score >= duplicateThreshold }));
}

function handleLeadCompanyNameInput() {
  const companyKey = leadCompanyOnlyKey(els.leadForm.elements.company_name.value);
  if (companyKey !== leadCompanyInputKey) {
    leadCompanyInputKey = companyKey;
    leadEnrichmentKey = "";
    clearLeadAutoEnrichmentFields();
  }
  scheduleDuplicateCheck();
  scheduleLeadCompanyEnrichment();
}

function handleLeadLocationInput() {
  leadEnrichmentKey = "";
  scheduleLeadCompanyEnrichment();
}

function scheduleLeadCompanyEnrichment() {
  clearTimeout(leadEnrichmentTimer);
  const companyName = els.leadForm.elements.company_name.value.trim();
  const location = els.leadForm.elements.location.value.trim() || els.leadForm.elements.territory.value.trim();
  if (!companyName) {
    resetLeadEnrichmentSession({ clearFields: !state.editingLeadId });
    setEnrichmentStatus("Type a company name to fetch Google business info.");
    return;
  }
  if (companyName.length < 2) return;
  leadEnrichmentTimer = setTimeout(() => enrichLeadFormCompany(companyName, location), 850);
}

function renderDuplicateWarning() {
  if (!els.duplicateWarning) return;
  const matches = state.duplicateMatches || [];
  const severe = matches.some(match => match.isDuplicate);
  const crossSalesmanMatches = matches.filter(match => match.owner_type === "other_salesman");
  els.duplicateWarning.classList.toggle("hidden", !state.duplicateChecking && !matches.length);
  els.duplicateWarning.classList.toggle("duplicate-danger", severe);
  els.duplicateWarning.classList.toggle("duplicate-warn", !severe);
  if (state.duplicateChecking) {
    els.duplicateWarning.innerHTML = `<strong>Checking similar companies...</strong>`;
    return;
  }
  if (!matches.length) {
    els.duplicateWarning.innerHTML = "";
    return;
  }
  els.duplicateWarning.innerHTML = `
    <strong>${crossSalesmanMatches.length ? "This company appears to be already registered by another salesman." : (severe ? "Probable duplicate - this company may already exist." : "Similar companies already exist - please check before creating.")}</strong>
    <div class="duplicate-list">
      ${matches.map(match => `
        <article>
          <span>${escapeHtml(match.company_name)}</span>
          <small>
            ${escapeHtml(match.owner_type === "other_salesman" ? `Registered by ${match.owner_type === "other_salesman" ? match.assigned_salesman || "another salesman" : match.assigned_salesman || "Unassigned"}` : `Owned by ${match.owner_type === "self" ? "you" : match.assigned_salesman || "Unassigned"}`)}
            · Territory: ${escapeHtml(match.territory || "Not set")} · Stage: ${escapeHtml(match.stage || "Unknown")} · ${Math.round(Number(match.score || 0) * 100)}%
          </small>
          <button class="small-action" type="button" data-view-duplicate="${escapeHtml(match.id)}">View record</button>
        </article>
      `).join("")}
    </div>
    <p>${crossSalesmanMatches.length ? "Please review this before creating another lead. If this is a different legal entity, continue manually." : "This might be the same company. You can still create a new record if it is genuinely separate."}</p>
  `;
  els.duplicateWarning.querySelectorAll("[data-view-duplicate]").forEach(button => {
    button.addEventListener("click", () => {
      els.leadDialog.close();
      openLeadDrawer(button.dataset.viewDuplicate);
    });
  });
}

function scheduleDuplicateCheck() {
  clearTimeout(duplicateCheckTimer);
  const companyName = els.leadForm.elements.company_name.value.trim();
  state.duplicateMatches = [];
  state.duplicateCache = state.duplicateCache || new Map();
  if (companyName.length < 4) {
    state.duplicateChecking = false;
    renderDuplicateWarning();
    return;
  }
  state.duplicateChecking = true;
  renderDuplicateWarning();
  duplicateCheckTimer = setTimeout(async () => {
    const cacheKey = companyName.toLowerCase();
    const cached = state.duplicateCache.get(cacheKey);
    const now = Date.now();
    if (cached && now - cached.at < 30000) {
      state.duplicateMatches = cached.matches;
      state.duplicateChecking = false;
      renderDuplicateWarning();
      return;
    }
    try {
      const result = await api(`/api/leads/duplicates?name=${encodeURIComponent(companyName)}`);
      if (els.leadForm.elements.company_name.value.trim() !== companyName) return;
      state.duplicateMatches = result.matches || [];
      state.duplicateCache.set(cacheKey, { matches: state.duplicateMatches, at: now });
    } catch {
      state.duplicateMatches = [];
    } finally {
      state.duplicateChecking = false;
      renderDuplicateWarning();
    }
  }, 500);
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
    const latestCompanyName = els.leadForm.elements.company_name.value.trim();
    const latestLocation = els.leadForm.elements.location.value.trim() || els.leadForm.elements.territory.value.trim();
    if (leadEnrichmentRequestKey(latestCompanyName, latestLocation) !== key) return;
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

function newImportState() {
  return {
    step: 1,
    fileName: "",
    headers: [],
    rawRows: [],
    mapping: {},
    previewRows: [],
    previewFilter: "all",
    duplicateMode: "skip",
    progress: 0,
    result: null,
    sessionStart: new Date().toISOString()
  };
}

function importHeaderKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function importCompanyKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\b(llc|l\.l\.c|fze|fzco|ltd|limited|co|company|est|establishment)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function guessImportField(header) {
  const key = importHeaderKey(header);
  if (!key) return "";
  const exact = IMPORT_HEADER_SYNONYMS.find(item => item.patterns.some(pattern => key === importHeaderKey(pattern)));
  if (exact) return exact.key;
  const fuzzy = IMPORT_HEADER_SYNONYMS.find(item => item.patterns.some(pattern => key.includes(importHeaderKey(pattern))));
  return fuzzy?.key || "";
}

function parseCsvText(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  const source = String(text || "").replace(/^\uFEFF/, "");
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];
    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some(value => String(value || "").trim())) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }
  row.push(cell);
  if (row.some(value => String(value || "").trim())) rows.push(row);
  if (!rows.length) return { headers: [], rows: [] };
  const headers = rows[0].map(header => String(header || "").trim());
  const data = rows.slice(1).map(values => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = String(values[index] || "").trim();
    });
    return record;
  });
  return { headers, rows: data };
}

function downloadTextFile(filename, content, type = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadImportTemplate() {
  downloadTextFile("arg-leads-import-template.csv", IMPORT_TEMPLATE);
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function importErrorReport(rows) {
  const headers = ["Row", "Company Name", "Status", "Reasons"];
  const body = rows.map(row => [
    row.rowNumber,
    row.data.company_name || "",
    row.errors.length ? "Error" : row.duplicate ? "Duplicate skipped" : "Warning",
    [...row.errors, ...row.warnings, row.duplicate ? "Duplicate company name" : ""].filter(Boolean).join("; ")
  ]);
  return [headers, ...body].map(line => line.map(csvEscape).join(",")).join("\n");
}

function normalizeImportStage(value) {
  const raw = String(value || "").trim();
  if (!raw) return "PROSPECT";
  const upper = raw.toUpperCase();
  const stage = KANBAN_STAGES.find(item => item.key === upper || item.aliases.includes(upper) || item.label.toUpperCase() === upper);
  if (stage) return stage.key;
  return "";
}

function normalizeImportPriority(value) {
  const raw = String(value || "").trim();
  if (!raw) return "New";
  const match = (state.settings.priorities || []).find(priority => priority.toLowerCase() === raw.toLowerCase());
  if (match) return match;
  if (raw.toLowerCase() === "cold") return "New";
  return "";
}

function normalizeImportDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function normalizeImportValue(value) {
  const raw = String(value || "").replace(/aed|,/gi, "").trim();
  if (!raw) return 0;
  const number = Number(raw);
  return Number.isFinite(number) ? number : null;
}

function mappedImportRows() {
  const importState = state.importLeads;
  if (!importState) return [];
  const existingByCompany = new Map(state.leads.map(lead => [importCompanyKey(lead.company_name), lead]));
  return importState.rawRows.map((raw, index) => {
    const data = {};
    Object.entries(importState.mapping).forEach(([header, field]) => {
      if (!field) return;
      const value = String(raw[header] || "").trim();
      if (!value) return;
      if (field === "territory" && data.territory) return;
      data[field] = value;
    });

    const warnings = [];
    const errors = [];
    if (!String(data.company_name || "").trim()) errors.push("Company name is required.");
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) warnings.push("Email format looks invalid.");
    if (data.phone && data.phone.replace(/\D/g, "").length < 7) warnings.push("Phone has fewer than 7 digits.");
    const stage = normalizeImportStage(data.stage);
    if (!stage) warnings.push("Stage not recognised; defaulted to Prospect.");
    data.stage = stage || "PROSPECT";
    const priority = normalizeImportPriority(data.priority);
    if (!priority) warnings.push("Priority not recognised; defaulted to New.");
    data.priority = priority || "New";
    if (data.next_action_date) {
      const date = normalizeImportDate(data.next_action_date);
      if (!date) warnings.push("Next action date is invalid; imported as blank.");
      data.next_action_date = date;
    }
    if (data.estimated_value !== undefined) {
      const value = normalizeImportValue(data.estimated_value);
      if (value === null) warnings.push("Estimated value is not numeric; imported as 0.");
      data.estimated_value = value === null ? 0 : value;
    }
    data.next_action = normalizeNextActionPlan(data.next_action);
    data.activity_purpose = normalizeActivityPurpose(data.activity_purpose);
    if (!data.territory && data.country_emirate) data.territory = data.country_emirate;
    if (!data.location && data.territory) data.location = data.territory;
    data.source = "CSV import";

    const exactDuplicate = existingByCompany.get(importCompanyKey(data.company_name));
    const fuzzyDuplicate = exactDuplicate ? null : clientDuplicateCandidates(data.company_name, state.leads)[0];
    const duplicate = exactDuplicate || fuzzyDuplicate;
    if (exactDuplicate) {
      warnings.push(`Duplicate candidate: ${exactDuplicate.company_name}.`);
    } else if (fuzzyDuplicate) {
      warnings.push(`${fuzzyDuplicate.isDuplicate ? "Probable duplicate" : "Similar company"}: ${fuzzyDuplicate.company_name} (${Math.round(fuzzyDuplicate.score * 100)}% match).`);
    }
    return {
      rowNumber: index + 2,
      raw,
      data,
      errors,
      warnings,
      duplicate: duplicate ? {
        id: duplicate.id,
        company_name: duplicate.company_name,
        score: duplicate.score || 1,
        isDuplicate: duplicate.isDuplicate ?? true,
        assigned_salesman: duplicate.assigned_salesman,
        territory: duplicate.territory,
        stage: duplicate.stage
      } : null
    };
  });
}

function importSummary(rows) {
  const errors = rows.filter(row => row.errors.length).length;
  const warnings = rows.filter(row => !row.errors.length && row.warnings.length).length;
  const duplicates = rows.filter(row => !row.errors.length && row.duplicate).length;
  const ready = rows.length - errors;
  return { ready, warnings, errors, duplicates };
}

function renderImportStepper() {
  const importState = state.importLeads || newImportState();
  els.importStepper.innerHTML = IMPORT_STEPS.map((label, index) => `
    <span class="import-step ${importState.step === index + 1 ? "active" : ""} ${importState.step > index + 1 ? "done" : ""}">
      <b>${index + 1}</b>${escapeHtml(label)}
    </span>
  `).join("");
}

function renderImportLeadsModal() {
  const importState = state.importLeads || newImportState();
  state.importLeads = importState;
  renderImportStepper();
  setMessage(els.importLeadsMessage, "");
  const titles = {
    1: ["Import Leads from CSV", "Upload an Excel-exported CSV file."],
    2: ["Map CSV Columns", `${importState.headers.length} column${importState.headers.length === 1 ? "" : "s"} detected in ${importState.fileName}.`],
    3: ["Review Before Importing", "Check warnings, duplicates, and rows that will be skipped."],
    4: ["Importing Leads", "The server is saving rows in controlled batches."],
    5: ["Import Complete", "Review the result and download any error report if needed."]
  };
  [els.importLeadsTitle.textContent, els.importLeadsSubtitle.textContent] = titles[importState.step] || titles[1];

  if (importState.step === 1) renderImportUploadStep();
  if (importState.step === 2) renderImportMappingStep();
  if (importState.step === 3) renderImportPreviewStep();
  if (importState.step === 4) renderImportProgressStep();
  if (importState.step === 5) renderImportCompleteStep();
}

function renderImportUploadStep() {
  els.importLeadsBody.innerHTML = `
    <label class="import-dropzone" for="importCsvFile">
      <input id="importCsvFile" type="file" accept=".csv,text/csv">
      <strong>Drop your CSV file here or tap to browse</strong>
      <span>Accepted: .csv only, max 5MB, up to ${IMPORT_MAX_ROWS} leads per import.</span>
    </label>
    <button class="ghost-button" type="button" id="downloadImportTemplate">Download Template CSV</button>
  `;
  els.importLeadsActions.innerHTML = "";
  const dropzone = els.importLeadsBody.querySelector(".import-dropzone");
  const input = els.importLeadsBody.querySelector("#importCsvFile");
  const handleFile = file => readImportFile(file);
  input.addEventListener("change", () => input.files?.[0] && handleFile(input.files[0]));
  dropzone.addEventListener("dragover", event => {
    event.preventDefault();
    dropzone.classList.add("dragging");
  });
  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragging"));
  dropzone.addEventListener("drop", event => {
    event.preventDefault();
    dropzone.classList.remove("dragging");
    const file = event.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  });
  els.importLeadsBody.querySelector("#downloadImportTemplate").addEventListener("click", downloadImportTemplate);
}

async function readImportFile(file) {
  if (!file.name.toLowerCase().endsWith(".csv")) {
    setMessage(els.importLeadsMessage, "Please upload a .csv file exported from Excel.", "error");
    return;
  }
  if (file.size > IMPORT_MAX_BYTES) {
    setMessage(els.importLeadsMessage, "CSV file is too large. Keep it under 5MB.", "error");
    return;
  }
  const text = await file.text();
  const parsed = parseCsvText(text);
  if (!parsed.headers.length || !parsed.rows.length) {
    setMessage(els.importLeadsMessage, "No CSV rows found. Check that the file has headers and data.", "error");
    return;
  }
  if (parsed.rows.length > IMPORT_MAX_ROWS) {
    setMessage(els.importLeadsMessage, `This file has ${parsed.rows.length} rows. Please import ${IMPORT_MAX_ROWS} or fewer at a time.`, "error");
    return;
  }
  const mapping = Object.fromEntries(parsed.headers.map(header => [header, guessImportField(header)]));
  state.importLeads = {
    ...newImportState(),
    step: 2,
    fileName: file.name,
    headers: parsed.headers,
    rawRows: parsed.rows,
    mapping
  };
  renderImportLeadsModal();
}

function importFieldOptions(selected) {
  return IMPORT_FIELD_DEFINITIONS.map(field => `
    <option value="${escapeHtml(field.key)}" ${field.key === selected ? "selected" : ""}>${escapeHtml(field.label)}</option>
  `).join("");
}

function renderImportMappingStep() {
  const importState = state.importLeads;
  els.importLeadsBody.innerHTML = `
    <div class="import-map-list">
      ${importState.headers.map(header => `
        <label class="import-map-row">
          <span>${escapeHtml(header)}</span>
          <select data-import-map="${escapeHtml(header)}">${importFieldOptions(importState.mapping[header] || "")}</select>
        </label>
      `).join("")}
    </div>
  `;
  els.importLeadsActions.innerHTML = `
    <button class="ghost-button" type="button" data-import-back>Back</button>
    <button class="primary-button" type="button" data-import-next>Next</button>
  `;
  els.importLeadsBody.querySelectorAll("[data-import-map]").forEach(select => {
    select.addEventListener("change", () => {
      importState.mapping[select.dataset.importMap] = select.value;
    });
  });
  els.importLeadsActions.querySelector("[data-import-back]").addEventListener("click", () => {
    state.importLeads = newImportState();
    renderImportLeadsModal();
  });
  els.importLeadsActions.querySelector("[data-import-next]").addEventListener("click", () => {
    if (!Object.values(importState.mapping).includes("company_name")) {
      setMessage(els.importLeadsMessage, "Map one CSV column to Company Name before continuing.", "error");
      return;
    }
    importState.previewRows = mappedImportRows();
    importState.step = 3;
    renderImportLeadsModal();
  });
}

function previewRowsForFilter(rows, filter) {
  if (filter === "errors") return rows.filter(row => row.errors.length);
  if (filter === "warnings") return rows.filter(row => !row.errors.length && row.warnings.length);
  return rows;
}

function importStatusLabel(row) {
  if (row.errors.length) return `<span class="import-status error">Error</span>`;
  if (row.warnings.length) return `<span class="import-status warning">Warning</span>`;
  return `<span class="import-status ok">OK</span>`;
}

function renderImportPreviewStep() {
  const importState = state.importLeads;
  const rows = importState.previewRows.length ? importState.previewRows : mappedImportRows();
  importState.previewRows = rows;
  const summary = importSummary(rows);
  const filtered = previewRowsForFilter(rows, importState.previewFilter).slice(0, 10);
  const importableCount = rows.filter(row => !row.errors.length && (importState.duplicateMode !== "skip" || !row.duplicate)).length;
  els.importLeadsBody.innerHTML = `
    <div class="import-summary-grid">
      <article><strong>${summary.ready}</strong><span>rows ready</span></article>
      <article><strong>${summary.warnings}</strong><span>warnings</span></article>
      <article><strong>${summary.errors}</strong><span>errors skipped</span></article>
      <article><strong>${summary.duplicates}</strong><span>duplicates found</span></article>
    </div>
    <div class="import-filter-row">
      <button class="small-action ${importState.previewFilter === "all" ? "active" : ""}" type="button" data-preview-filter="all">Show all</button>
      <button class="small-action ${importState.previewFilter === "warnings" ? "active" : ""}" type="button" data-preview-filter="warnings">Show warnings</button>
      <button class="small-action ${importState.previewFilter === "errors" ? "active" : ""}" type="button" data-preview-filter="errors">Show errors only</button>
    </div>
    <div class="import-table-wrap">
      <table class="import-table">
        <thead><tr><th>Row</th><th>Company</th><th>Duplicate check</th><th>Phone</th><th>Stage</th><th>Status</th><th>Notes</th></tr></thead>
        <tbody>
          ${filtered.map(row => `
            <tr class="${row.errors.length ? "has-error" : row.warnings.length ? "has-warning" : ""}">
              <td>${row.rowNumber}</td>
              <td>${escapeHtml(row.data.company_name || "(empty)")}</td>
              <td>${row.duplicate ? `<strong>${escapeHtml(row.duplicate.company_name)}</strong><br><small>${escapeHtml(row.duplicate.assigned_salesman || "Unassigned")} / ${escapeHtml(row.duplicate.territory || "No territory")} / ${Math.round(Number(row.duplicate.score || 0) * 100)}%</small>` : "-"}</td>
              <td>${escapeHtml(row.data.phone || "-")}</td>
              <td>${escapeHtml(drawerStageLabel(row.data.stage))}</td>
              <td>${importStatusLabel(row)}</td>
              <td>${escapeHtml([...row.errors, ...row.warnings].join(" "))}</td>
            </tr>
          `).join("") || `<tr><td colspan="7">No rows match this preview filter.</td></tr>`}
        </tbody>
      </table>
    </div>
    <fieldset class="duplicate-options">
      <legend>Duplicate handling</legend>
      <label><input type="radio" name="duplicateMode" value="skip" ${importState.duplicateMode === "skip" ? "checked" : ""}> Skip duplicates</label>
      <label><input type="radio" name="duplicateMode" value="update" ${importState.duplicateMode === "update" ? "checked" : ""}> Update existing</label>
      <label><input type="radio" name="duplicateMode" value="import_all" ${importState.duplicateMode === "import_all" ? "checked" : ""}> Import all</label>
    </fieldset>
  `;
  els.importLeadsActions.innerHTML = `
    <button class="ghost-button" type="button" data-import-back>Back</button>
    <button class="primary-button" type="button" data-import-start ${importableCount ? "" : "disabled"}>Import ${importableCount} Leads</button>
  `;
  els.importLeadsBody.querySelectorAll("[data-preview-filter]").forEach(button => {
    button.addEventListener("click", () => {
      importState.previewFilter = button.dataset.previewFilter;
      renderImportLeadsModal();
    });
  });
  els.importLeadsBody.querySelectorAll('input[name="duplicateMode"]').forEach(input => {
    input.addEventListener("change", () => {
      importState.duplicateMode = input.value;
      renderImportLeadsModal();
    });
  });
  els.importLeadsActions.querySelector("[data-import-back]").addEventListener("click", () => {
    importState.step = 2;
    renderImportLeadsModal();
  });
  els.importLeadsActions.querySelector("[data-import-start]").addEventListener("click", startLeadImport);
}

function renderImportProgressStep() {
  const importState = state.importLeads;
  const total = importState.previewRows.filter(row => !row.errors.length).length || 1;
  const width = Math.min(100, Math.round((importState.progress / total) * 100));
  els.importLeadsBody.innerHTML = `
    <div class="import-progress">
      <div class="import-progress-track"><span style="width:${width}%"></span></div>
      <strong>${Math.min(importState.progress, total)} / ${total}</strong>
      <p>Saving in batches of ${IMPORT_BATCH_SIZE}. Keep this window open.</p>
    </div>
  `;
  els.importLeadsActions.innerHTML = "";
}

function renderImportCompleteStep() {
  const importState = state.importLeads;
  const result = importState.result || {};
  const failedRows = [
    ...(importState.previewRows || []).filter(row => row.errors.length),
    ...((result.failed_rows || []).map(item => ({
      rowNumber: item.row_number || item.index || "-",
      data: item.data || {},
      errors: [item.reason || "Import failed"],
      warnings: [],
      duplicate: null
    })))
  ];
  els.importLeadsBody.innerHTML = `
    <div class="import-complete">
      <article><strong>${result.imported || 0}</strong><span>leads imported</span></article>
      <article><strong>${result.updated || 0}</strong><span>updated</span></article>
      <article><strong>${result.skipped || 0}</strong><span>duplicates skipped</span></article>
      <article><strong>${failedRows.length}</strong><span>failed/skipped rows</span></article>
    </div>
  `;
  els.importLeadsActions.innerHTML = `
    <button class="ghost-button" type="button" data-import-errors ${failedRows.length ? "" : "disabled"}>Download Error Report</button>
    <button class="primary-button" type="button" data-import-view>View Imported Leads</button>
    <button class="ghost-button" type="button" data-import-close>Close</button>
  `;
  els.importLeadsActions.querySelector("[data-import-errors]").addEventListener("click", () => {
    downloadTextFile(`arg-leads-import-errors-${today()}.csv`, importErrorReport(failedRows));
  });
  els.importLeadsActions.querySelector("[data-import-view]").addEventListener("click", async () => {
    state.importedAfter = importState.sessionStart;
    state.lastNonLeadView = "pipeline";
    currentView = "pipeline";
    state.leadDrawerOpen = false;
    syncBrowserRoute({ replace: false });
    els.importLeadsDialog.close();
    await loadLeads();
    setToast("Showing leads from the latest import session.", "success");
  });
  els.importLeadsActions.querySelector("[data-import-close]").addEventListener("click", () => els.importLeadsDialog.close());
}

async function startLeadImport() {
  const importState = state.importLeads;
  const importable = importState.previewRows
    .filter(row => !row.errors.length)
    .filter(row => importState.duplicateMode !== "skip" || !row.duplicate);
  if (!importable.length) return;
  importState.step = 4;
  importState.progress = 0;
  renderImportLeadsModal();
  try {
    importState.progress = Math.min(importable.length, IMPORT_BATCH_SIZE);
    renderImportProgressStep();
    const result = await api("/api/leads/import", {
      method: "POST",
      body: JSON.stringify({
        rows: importable.map(row => ({ row_number: row.rowNumber, data: row.data })),
        duplicate_mode: importState.duplicateMode,
        session_start: importState.sessionStart
      })
    });
    importState.progress = importable.length;
    importState.result = result;
    importState.step = 5;
    await loadLeads();
    renderImportLeadsModal();
  } catch (error) {
    importState.step = 3;
    renderImportLeadsModal();
    setMessage(els.importLeadsMessage, error.message, "error");
  }
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
    const importedAt = Date.parse(lead.imported_at || "");
    const importedAfter = Date.parse(state.importedAfter || "");
    const matchesImported = !state.importedAfter || (Number.isFinite(importedAt) && importedAt >= importedAfter);
    return matchesQuery && matchesStage && matchesSalesman && matchesPriority && matchesTerritory && matchesOverdue && matchesImported;
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
  return ["admin", "manager", "director"].includes(String(state.currentUser?.role || "").toLowerCase());
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
  const overdue = overdueItems().length;
  const openValue = state.leads
    .filter(lead => lead.stage !== "ACTIVE" && lead.stage !== "DORMANT")
    .reduce((sum, lead) => sum + Number(lead.estimated_value || 0), 0);
  const active = state.leads.filter(lead => lead.stage === "ACTIVE").length;
  const atRisk = state.leads.filter(lead => lead.health?.label === "RED" || lead.stage === "DORMANT" || lead.priority === "At Risk").length;
  renderHeaderSummary();
  els.metricTotal.textContent = active;
  if (els.metricTotalSub) els.metricTotalSub.textContent = `of ${state.leads.length}`;
  els.metricValue.textContent = money.format(openValue);
  els.metricHot.textContent = atRisk;
  els.metricDue.textContent = due;
  if (els.metricDueSub) els.metricDueSub.textContent = `${overdue} overdue`;
  if (els.quickTaskBadge) {
    els.quickTaskBadge.textContent = due;
    els.quickTaskBadge.classList.toggle("hidden", due === 0);
  }
}

function hasLeadContactedActivity(lead) {
  const activities = Array.isArray(lead?.activities) ? lead.activities.filter(activity => !activity?.delete_request && !isReminderActivity(activity)) : [];
  return activities.length > 0 || Boolean(String(lead?.last_activity || "").trim());
}

function isOpenPipelineStage(stage) {
  return ["OUTREACH", "SAMPLING", "ENGAGED"].includes(kanbanStageForLead({ stage }));
}

function percentOf(value, total) {
  if (!total) return 0;
  return Math.round((Number(value || 0) / total) * 100);
}

function dropOffPercent(previous, current) {
  if (!previous) return 0;
  return Math.max(0, Math.round(((previous - current) / previous) * 100));
}

function pipelineFunnelMetricsForLeads(leads) {
  const totalAssignedLeads = leads.length;
  const contactedLeads = leads.filter(hasLeadContactedActivity).length;
  const openPipelineLeads = leads.filter(lead => isOpenPipelineStage(lead.stage)).length;
  const wonDeals = leads.filter(lead => kanbanStageForLead(lead) === "ACTIVE").length;
  const lostDeals = leads.filter(lead => kanbanStageForLead(lead) === "DORMANT").length;
  return {
    totalAssignedLeads,
    contactedLeads,
    openPipelineLeads,
    wonDeals,
    lostDeals,
    conversionRate: percentOf(wonDeals, totalAssignedLeads),
    stageDropOffs: {
      assignedToContacted: dropOffPercent(totalAssignedLeads, contactedLeads),
      contactedToOpenPipeline: dropOffPercent(contactedLeads, openPipelineLeads),
      openPipelineToWon: dropOffPercent(openPipelineLeads, wonDeals),
      openPipelineToLost: dropOffPercent(openPipelineLeads, lostDeals)
    }
  };
}

function pipelineFunnelStageRows(metrics) {
  const total = metrics.totalAssignedLeads || 0;
  return [
    {
      key: "assigned",
      label: "Total Assigned Leads",
      count: metrics.totalAssignedLeads,
      percentage: total ? 100 : 0,
      dropoff: null,
      tone: "assigned"
    },
    {
      key: "contacted",
      label: "Contacted Leads",
      count: metrics.contactedLeads,
      percentage: percentOf(metrics.contactedLeads, total),
      dropoff: metrics.stageDropOffs.assignedToContacted,
      tone: "contacted"
    },
    {
      key: "open",
      label: "Active / Open Pipeline Leads",
      count: metrics.openPipelineLeads,
      percentage: percentOf(metrics.openPipelineLeads, total),
      dropoff: metrics.stageDropOffs.contactedToOpenPipeline,
      tone: "open"
    },
    {
      key: "won",
      label: "Won Deals / Active Customers",
      count: metrics.wonDeals,
      percentage: percentOf(metrics.wonDeals, total),
      dropoff: metrics.stageDropOffs.openPipelineToWon,
      tone: "won"
    },
    {
      key: "lost",
      label: "Lost Deals",
      count: metrics.lostDeals,
      percentage: percentOf(metrics.lostDeals, total),
      dropoff: metrics.stageDropOffs.openPipelineToLost,
      tone: "lost"
    }
  ];
}

function pipelineFunnelPeople() {
  const merged = [];
  const known = new Set();
  const add = person => {
    const name = salesmanName(person).trim();
    if (!name || name.toLowerCase() === "unassigned") return;
    const key = name.toLowerCase();
    if (known.has(key)) return;
    known.add(key);
    merged.push(person);
  };
  if (isAdminOrManager()) {
    (state.userAccounts || [])
      .filter(account => !["admin", "manager", "director"].includes(String(account.role || "").toLowerCase()))
      .forEach(add);
  }
  analyticsSalesmen().forEach(add);
  return merged;
}

function pipelineFunnelComparisonRows(leads) {
  return pipelineFunnelPeople()
    .map(person => {
      const salesmanLeads = leads.filter(lead => leadMatchesSalesman(lead, person));
      const metrics = pipelineFunnelMetricsForLeads(salesmanLeads);
      return {
        salesmanId: person.id || salesmanName(person),
        salesmanName: salesmanName(person),
        ...metrics
      };
    })
    .sort((a, b) =>
      b.totalAssignedLeads - a.totalAssignedLeads
      || b.conversionRate - a.conversionRate
      || a.salesmanName.localeCompare(b.salesmanName)
    );
}

function pipelineFunnelStageMarkup(stage) {
  const width = Math.max(0, Math.min(100, stage.percentage));
  const fillWidth = stage.count > 0 ? Math.max(width, 10) : 0;
  const dropoffMarkup = stage.dropoff == null
    ? `<span class="pipeline-funnel-meta">Baseline</span>`
    : `<span class="pipeline-funnel-meta">Drop-off ${stage.dropoff}% from previous stage</span>`;
  return `
    <article class="pipeline-funnel-stage ${stage.tone}">
      <div class="pipeline-funnel-stage-head">
        <div>
          <strong>${escapeHtml(stage.label)}</strong>
          ${dropoffMarkup}
        </div>
        <div class="pipeline-funnel-stage-stats">
          <span>${escapeHtml(String(stage.count))}</span>
          <small>${escapeHtml(String(stage.percentage))}% of assigned</small>
        </div>
      </div>
      <div class="pipeline-funnel-track" aria-hidden="true">
        <div class="pipeline-funnel-fill ${stage.tone}" style="width:${fillWidth}%"></div>
      </div>
    </article>
  `;
}

function pipelineFunnelChartMarkup(metrics, { title = "Pipeline Funnel Chart", subtitle = "Visual conversion flow from assigned leads to outcomes" } = {}) {
  const stages = pipelineFunnelStageRows(metrics);
  return `
    <section class="pipeline-funnel-chart-card">
      <div class="pipeline-funnel-chart-head">
        <div>
          <span class="meta-label">${escapeHtml(title)}</span>
          <h3>${escapeHtml(subtitle)}</h3>
        </div>
      </div>
      <div class="pipeline-funnel-chart-stack" role="img" aria-label="Visual pipeline funnel from assigned leads to contacted leads, active pipeline, won deals, and lost deals.">
        ${stages.map(stage => {
          const width = Math.max(12, Math.min(100, stage.percentage || 0));
          const dropoffLabel = stage.dropoff == null ? "Baseline stage" : `Drop-off ${stage.dropoff}% from previous stage`;
          return `
            <article class="pipeline-funnel-chart-stage ${stage.tone}">
              <div class="pipeline-funnel-chart-meta">
                <div>
                  <strong>${escapeHtml(stage.label)}</strong>
                  <span>${escapeHtml(dropoffLabel)}</span>
                </div>
                <div class="pipeline-funnel-chart-numbers">
                  <b>${escapeHtml(String(stage.count))}</b>
                  <small>${escapeHtml(String(stage.percentage))}% of assigned</small>
                </div>
              </div>
              <div class="pipeline-funnel-chart-shape-wrap">
                <div class="pipeline-funnel-chart-shape ${stage.tone}" style="width:${width}%">
                  <span>${escapeHtml(stage.label)}</span>
                  <strong>${escapeHtml(String(stage.count))}</strong>
                </div>
              </div>
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function pipelineFunnelMarkup(leads, { selectedSalesman = "all", forceSingleSalesman = false, focusName = "", includeComparison = true } = {}) {
  const singleSalesmanView = forceSingleSalesman || !isAdminOrManager() || selectedSalesman !== "all";
  const resolvedFocusName = singleSalesmanView
    ? (focusName || (selectedSalesman !== "all" ? selectedSalesman : state.currentUser?.name || "My leads"))
    : "All salesmen";

  if (!leads.length) {
    return {
      badge: "0 visible leads",
      html: `
        <div class="pipeline-funnel-empty">
          <strong>No funnel data for these filters.</strong>
          <span>Try another salesman, stage, priority, territory, or search term.</span>
        </div>
      `
    };
  }

  if (singleSalesmanView) {
    const metrics = pipelineFunnelMetricsForLeads(leads);
    const stages = pipelineFunnelStageRows(metrics);
    return {
      badge: `${leads.length} visible lead${leads.length === 1 ? "" : "s"}`,
      html: `
        <div class="pipeline-funnel-detail">
          <div class="pipeline-funnel-summary-card">
            <div class="pipeline-funnel-copy">
              <span class="meta-label">Detailed funnel</span>
              <h3>${escapeHtml(resolvedFocusName)}</h3>
              <p>Conversion rate is <strong>${escapeHtml(String(metrics.conversionRate))}%</strong> from assigned leads to won deals within the current pipeline filters.</p>
            </div>
            <div class="pipeline-funnel-micro-kpis">
              <article><span>Assigned</span><strong>${escapeHtml(String(metrics.totalAssignedLeads))}</strong></article>
              <article><span>Contacted</span><strong>${escapeHtml(String(metrics.contactedLeads))}</strong></article>
              <article><span>Open</span><strong>${escapeHtml(String(metrics.openPipelineLeads))}</strong></article>
              <article><span>Won</span><strong>${escapeHtml(String(metrics.wonDeals))}</strong></article>
            </div>
          </div>
          <div class="pipeline-funnel-stages">
            ${stages.map(pipelineFunnelStageMarkup).join("")}
          </div>
        </div>
      `
    };
  }

  const aggregate = pipelineFunnelMetricsForLeads(leads);
  const aggregateStages = pipelineFunnelStageRows(aggregate);
  const rows = pipelineFunnelComparisonRows(leads);
  return {
    badge: `${leads.length} visible lead${leads.length === 1 ? "" : "s"}`,
    html: `
      <div class="pipeline-funnel-layout">
        <section class="pipeline-funnel-summary-card">
          <div class="pipeline-funnel-copy">
            <span class="meta-label">Team conversion snapshot</span>
            <h3>All salesmen</h3>
            <p>${escapeHtml(String(rows.filter(row => row.totalAssignedLeads > 0).length))} salesmen currently match the active pipeline filters.</p>
          </div>
          <div class="pipeline-funnel-stages">
            ${aggregateStages.map(pipelineFunnelStageMarkup).join("")}
          </div>
        </section>
        ${includeComparison ? `
          <section class="pipeline-funnel-table-card">
            <div class="pipeline-funnel-table-head">
              <div>
                <span class="meta-label">Salesman comparison</span>
                <h3>Conversion by owner</h3>
              </div>
              <span class="chip">${escapeHtml(String(rows.length))} salesmen</span>
            </div>
            <div class="pipeline-funnel-table-wrap">
              <table class="pipeline-funnel-table">
                <thead>
                  <tr>
                    <th>Salesman</th>
                    <th>Assigned Leads</th>
                    <th>Contacted</th>
                    <th>Open Pipeline</th>
                    <th>Won</th>
                    <th>Lost</th>
                    <th>Conversion Rate</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows.map(row => `
                    <tr>
                      <td data-label="Salesman">${escapeHtml(row.salesmanName)}</td>
                      <td data-label="Assigned Leads">${escapeHtml(String(row.totalAssignedLeads))}</td>
                      <td data-label="Contacted">${escapeHtml(String(row.contactedLeads))}</td>
                      <td data-label="Open Pipeline">${escapeHtml(String(row.openPipelineLeads))}</td>
                      <td data-label="Won">${escapeHtml(String(row.wonDeals))}</td>
                      <td data-label="Lost">${escapeHtml(String(row.lostDeals))}</td>
                      <td data-label="Conversion Rate"><span class="chip ${row.conversionRate >= 35 ? "green" : row.conversionRate >= 15 ? "warm" : ""}">${escapeHtml(String(row.conversionRate))}%</span></td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          </section>
        ` : ""}
      </div>
    `
  };
}

function renderPipelineFunnel() {
  if (!els.pipelineFunnelBody || !els.pipelineFunnelBadge) return;
  if (state.leadsLoading && !state.leadsLoaded) {
    els.pipelineFunnelBadge.textContent = "Loading lead conversion";
    els.pipelineFunnelBody.innerHTML = `
      <div class="pipeline-funnel-skeleton">
        <span></span>
        <span></span>
        <span></span>
        <span></span>
      </div>
    `;
    return;
  }

  try {
    const leads = filteredLeads();
    const view = pipelineFunnelMarkup(leads, { selectedSalesman: state.filters.salesman });
    els.pipelineFunnelBadge.textContent = view.badge;
    els.pipelineFunnelBody.innerHTML = view.html;
  } catch (error) {
    els.pipelineFunnelBadge.textContent = "Funnel unavailable";
    els.pipelineFunnelBody.innerHTML = `
      <div class="pipeline-funnel-empty error">
        <strong>Could not load pipeline funnel.</strong>
        <span>${escapeHtml(error.message || "Unexpected funnel rendering error.")}</span>
      </div>
    `;
  }
}

function renderDashboardPipelineFunnel() {
  if (!els.dashboardPipelineFunnelPanel || !els.dashboardPipelineFunnelBody || !els.dashboardPipelineFunnelBadge) return;
  const admin = state.currentUser?.role === "admin";
  els.dashboardPipelineFunnelPanel.classList.toggle("hidden", !admin);
  if (!admin) return;
  if (state.leadsLoading && !state.leadsLoaded) {
    els.dashboardPipelineFunnelBadge.textContent = "Loading lead conversion";
    els.dashboardPipelineFunnelBody.innerHTML = `
      <div class="pipeline-funnel-skeleton">
        <span></span>
        <span></span>
        <span></span>
        <span></span>
      </div>
    `;
    return;
  }
  try {
    const selectedSalesman = state.marketSnapshotSalesman || "all";
    const leads = marketSnapshotLeads();
    const view = pipelineFunnelMarkup(leads, { selectedSalesman, forceSingleSalesman: false, includeComparison: true });
    const chart = pipelineFunnelChartMarkup(pipelineFunnelMetricsForLeads(leads));
    els.dashboardPipelineFunnelBadge.textContent = view.badge.replace("visible", "tracked");
    els.dashboardPipelineFunnelBody.innerHTML = `${view.html}${chart}`;
  } catch (error) {
    els.dashboardPipelineFunnelBadge.textContent = "Funnel unavailable";
    els.dashboardPipelineFunnelBody.innerHTML = `
      <div class="pipeline-funnel-empty error">
        <strong>Could not load dashboard funnel.</strong>
        <span>${escapeHtml(error.message || "Unexpected funnel rendering error.")}</span>
      </div>
    `;
  }
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
    <div class="overdue-banner-icon" aria-hidden="true"></div>
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
  state.lastNonLeadView = "pipeline";
  currentView = "pipeline";
  state.leadDrawerOpen = false;
  syncBrowserRoute({ replace: false });
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
  state.lastNonLeadView = "activity";
  currentView = "activity";
  state.leadDrawerOpen = false;
  syncBrowserRoute({ replace: false });
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

function leadOriginForCurrentUser(lead, person = state.currentUser) {
  const createdBy = String(lead.created_by || "").trim().toLowerCase();
  const assignedTo = String(lead.assigned_to || "").trim().toLowerCase();
  const assignedSalesman = String(lead.assigned_salesman || "").trim().toLowerCase();

  if (!createdBy) {
    return assignedTo || assignedSalesman ? "Self-generated" : "Admin-assigned";
  }

  if (assignedTo) {
    return createdBy === assignedTo ? "Self-generated" : "Admin-assigned";
  }

  if (!person) return "Self-generated";
  if (leadGeneratedBySalesman(lead, person)) return "Self-generated";
  if (assignedSalesman && normalizedUserTokens(person).includes(assignedSalesman)) return "Self-generated";
  return "Admin-assigned";
}

function leadOriginChipClass(originLabel) {
  return String(originLabel).toLowerCase().includes("admin")
    ? "chip-admin-assigned"
    : "chip-self-generated";
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
    const accountStatus = String(typeof person === "string" ? "active" : person.status || "active").toLowerCase();
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
      accountStatus,
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

function performanceRawScore(row) {
  return (row.activitiesLogged * 3)
    + (row.totalAssigned * 2)
    + (row.followupsCompleted * 2)
    + row.filteredStageCount;
}

function scoreSalesmanPerformanceRows(rows) {
  const withRaw = rows.map(row => ({ ...row, rawPerformanceScore: performanceRawScore(row) }));
  const maxPossibleScore = Math.max(0, ...withRaw.map(row => row.rawPerformanceScore));
  return withRaw
    .map(row => ({
      ...row,
      performanceScore: maxPossibleScore ? Math.round((row.rawPerformanceScore / maxPossibleScore) * 100) : 0
    }))
    .sort((a, b) =>
      b.performanceScore - a.performanceScore
      || b.rawPerformanceScore - a.rawPerformanceScore
      || b.totalAssigned - a.totalAssigned
      || a.name.localeCompare(b.name)
    );
}

function salesmanInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "??";
  return `${parts[0][0] || ""}${(parts[parts.length - 1][0] || parts[0][1] || "")}`.toUpperCase();
}

function performanceRankColor(index, inactive = false) {
  if (inactive) return "#888780";
  if (index === 0) return "#378ADD";
  if (index === 1) return "#1D9E75";
  if (index === 2) return "#BA7517";
  if (index === 3) return "#7F77DD";
  return "#5E6B7C";
}

function ordinalLabel(position) {
  const value = Number(position || 0);
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
  if (value % 10 === 1) return `${value}st`;
  if (value % 10 === 2) return `${value}nd`;
  if (value % 10 === 3) return `${value}rd`;
  return `${value}th`;
}

function performanceStateLabel(row, index) {
  if (row.accountStatus === "inactive") return "Inactive";
  if (index === 0) return "Top Performer";
  if (row.performanceScore >= 70) return "Active";
  if (row.performanceScore >= 35) return "Building";
  return "Low Activity";
}

function lastActiveMarkup(dateValue) {
  const days = daysAgo(dateValue);
  if (days === 0) return `<span class="sp-fresh">today</span>`;
  if (days === 1) return `<span class="sp-fresh">yesterday</span>`;
  if (days >= 9999) return `<span class="sp-stale-red">No activity logged</span>`;
  return `<span class="${days >= 3 ? "sp-stale-red" : "sp-fresh"}">${days} days ago</span>`;
}

function relativeActivityTime(dateValue) {
  const days = daysAgo(String(dateValue || "").slice(0, 10));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 9999) return `${Math.max(1, Math.round(days / 7))}w ago`;
  return "-";
}

function heatmapClass(value) {
  const number = Number(value || 0);
  if (number === 0) return "hm-0";
  if (number <= 2) return "hm-1";
  if (number <= 5) return "hm-2";
  return "hm-3";
}

function scoreHeatmapClass(score) {
  const value = Number(score || 0);
  if (value === 0) return "hm-0";
  if (value <= 40) return "hm-1";
  if (value <= 70) return "hm-2";
  return "hm-3";
}

function leaderboardCard(row, index) {
  const inactive = row.accountStatus === "inactive";
  const color = performanceRankColor(index, inactive);
  const rank = ordinalLabel(index + 1);
  const stateLabel = performanceStateLabel(row, index);
  const toneClass = inactive ? "is-inactive" : index === 0 ? "is-top" : row.performanceScore >= 70 ? "is-strong" : row.performanceScore >= 35 ? "is-mid" : "is-low";
  const subtitle = inactive
    ? `${rank} - Inactive`
    : index === 0
      ? "1st - Most active"
      : index === 1
        ? "2nd - Active"
        : `${rank} - Active`;
  return `
    <article class="sp-leader-card ${index === 0 ? "top" : ""} ${toneClass}">
      <div class="sp-leader-top">
        <div class="sp-avatar ${inactive ? "sp-av-gray" : index === 0 ? "sp-av-blue" : index === 1 ? "sp-av-teal" : "sp-av-gray"}">${escapeHtml(salesmanInitials(row.name))}</div>
        <div class="sp-leader-copy">
          <p class="sp-leader-name">${escapeHtml(row.name)}</p>
          <p class="sp-leader-sub">${escapeHtml(subtitle)}</p>
        </div>
        <div class="sp-leader-badges">
          <span class="sp-rank-badge">${escapeHtml(rank)}</span>
          <span class="sp-state-badge">${escapeHtml(stateLabel)}</span>
        </div>
      </div>
      <div class="sp-score-row">
        <span class="sp-score-label">Progress</span>
        <div class="sp-score-bar-bg"><div class="sp-score-bar-fill" style="width:${row.performanceScore}%; background:${color};"></div></div>
        <span class="sp-score-pct">${row.performanceScore}%</span>
      </div>
      <div class="sp-stats-row">
        <div class="sp-stat-mini"><span class="sp-stat-mini-val">${row.activitiesLogged}</span><span class="sp-stat-mini-lbl">Activities</span></div>
        <div class="sp-stat-mini"><span class="sp-stat-mini-val">${row.totalAssigned}</span><span class="sp-stat-mini-lbl">Leads</span></div>
        <div class="sp-stat-mini"><span class="sp-stat-mini-val">${row.followupsCompleted}</span><span class="sp-stat-mini-lbl">Follow-ups</span></div>
      </div>
      <p class="sp-stale">Last active: ${lastActiveMarkup(row.lastActivityDate)}</p>
    </article>
  `;
}

function renderPerformanceLeaderboard(rows) {
  if (!els.performanceLeaderboard) return;
  els.performanceLeaderboard.innerHTML = rows.map(leaderboardCard).join("") || `<p class="empty-copy">No salesman records available.</p>`;
}

function chartLabelName(name) {
  const value = String(name || "Unassigned").trim();
  return value.length > 10 ? value.split(/\s+/)[0] || value.slice(0, 10) : value;
}

function applyPerformanceChartWidth(rows) {
  const frame = els.performanceChart?.closest(".sp-chart-frame");
  if (!frame) return;
  const chartMinWidth = Math.max(960, rows.length * 180);
  frame.style.setProperty("--performance-chart-min-width", `${chartMinWidth}px`);
}

function renderPerformanceChart(rows) {
  if (!els.performanceChart) return;
  applyPerformanceChartWidth(rows);
  if (typeof Chart === "undefined") {
    els.performanceChart.replaceWith(Object.assign(document.createElement("p"), {
      className: "empty-copy",
      textContent: "Chart.js is still loading. Performance data is available in the heatmap below."
    }));
    return;
  }
  if (performanceChartInstance) performanceChartInstance.destroy();
  performanceChartInstance = new Chart(els.performanceChart, {
    type: "bar",
    data: {
      labels: rows.map(row => chartLabelName(row.name)),
      datasets: [
        { label: "Assigned leads", data: rows.map(row => row.totalAssigned), backgroundColor: "#378ADD", borderRadius: 6, borderSkipped: false, barPercentage: 0.8, categoryPercentage: 0.72, maxBarThickness: 40 },
        { label: "Activities logged", data: rows.map(row => row.activitiesLogged), backgroundColor: "#7F77DD", borderRadius: 6, borderSkipped: false, barPercentage: 0.8, categoryPercentage: 0.72, maxBarThickness: 40 },
        { label: "Follow-ups", data: rows.map(row => row.followupsCompleted), backgroundColor: "#BA7517", borderRadius: 6, borderSkipped: false, barPercentage: 0.8, categoryPercentage: 0.72, maxBarThickness: 40 },
        { label: "Stage leads", data: rows.map(row => row.filteredStageCount), backgroundColor: "#1D9E75", borderRadius: 6, borderSkipped: false, barPercentage: 0.8, categoryPercentage: 0.72, maxBarThickness: 40 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          top: 6,
          right: 16,
          bottom: 0,
          left: 6
        }
      },
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { display: false },
          offset: true,
          ticks: {
            font: { size: 13, weight: "600" },
            color: "#EAF2FF",
            maxRotation: 0,
            minRotation: 0,
            autoSkip: false,
            padding: 10
          }
        },
        y: {
          grid: { color: "rgba(136,135,128,0.15)" },
          ticks: { font: { size: 11, weight: "600" }, color: "#C6D5F2", stepSize: 1, precision: 0 },
          beginAtZero: true
        }
      }
    }
  });
}

function performanceActivityItems(rows) {
  const colorByName = new Map(rows.map((row, index) => [row.name.toLowerCase(), performanceRankColor(index, row.activitiesLogged === 0)]));
  const activities = state.leads.flatMap(lead => (Array.isArray(lead.activities) ? lead.activities : [])
    .filter(activity => !activity.delete_request)
    .map(activity => ({
      salesman: lead.assigned_salesman || "Unassigned",
      company: lead.company_name || "Unnamed company",
      type: activity.type || "Note",
      at: activity.activity_date || activity.at || lead.last_activity || "",
      color: colorByName.get(String(lead.assigned_salesman || "Unassigned").toLowerCase()) || "#888780"
    })))
    .sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
  const inactiveItems = rows
    .filter(row => row.activitiesLogged === 0)
    .map(row => ({
      salesman: row.name,
      company: "No activity logged",
      type: "",
      at: row.created_at || "",
      color: "#888780",
      empty: true
    }));
  return [
    ...activities.slice(0, Math.max(0, 8 - inactiveItems.length)),
    ...inactiveItems
  ].slice(0, 8);
}

function renderPerformanceFeed(rows) {
  if (!els.performanceFeed) return;
  const items = performanceActivityItems(rows);
  els.performanceFeed.innerHTML = items.map(item => `
    <div class="sp-feed-item">
      <span class="sp-feed-dot" style="background:${item.color};"></span>
      <div class="sp-feed-body">
        <p class="sp-feed-name">${escapeHtml(item.salesman)}</p>
        <p class="sp-feed-detail ${item.empty ? "sp-feed-empty" : ""}">${escapeHtml(item.empty ? "No activity logged" : `${item.company} - ${item.type}`)}</p>
      </div>
      <span class="sp-feed-time ${item.empty ? "sp-stale-red" : ""}">${escapeHtml(item.empty ? "7d+" : relativeActivityTime(item.at))}</span>
    </div>
  `).join("") || `
    <div class="sp-feed-item">
      <span class="sp-feed-dot" style="background:#888780;"></span>
      <div class="sp-feed-body">
        <p class="sp-feed-name">No activity</p>
        <p class="sp-feed-detail sp-feed-empty">No activity logged</p>
      </div>
      <span class="sp-feed-time">-</span>
    </div>
  `;
}

function isAdminDashboardCollapseMode() {
  return state.currentUser?.role === "admin" && currentView === "dashboard";
}

function directSectionHeader(section) {
  return [...section.children].find(child =>
    child.classList?.contains("panel-header") || child.classList?.contains("dashboard-section-header")
  ) || null;
}

function ensureCollapsibleBody(section, header) {
  let body = [...section.children].find(child => child.classList?.contains("dashboard-collapsible-body"));
  if (body) return body;
  body = document.createElement("div");
  body.className = "dashboard-collapsible-body";
  const inner = document.createElement("div");
  inner.className = "dashboard-collapsible-body-inner";
  body.appendChild(inner);
  [...section.children].forEach(child => {
    if (child !== header) inner.appendChild(child);
  });
  section.appendChild(body);
  return body;
}

function ensurePanelHeaderActions(header) {
  let actions = header.querySelector(".panel-header-actions");
  if (actions) return actions;
  actions = document.createElement("div");
  actions.className = "panel-header-actions";
  const children = [...header.children];
  children.slice(1).forEach(child => actions.appendChild(child));
  header.appendChild(actions);
  return actions;
}

function refreshDashboardCollapsibleSection(sectionId) {
  switch (sectionId) {
    case "performancePanel":
      renderPerformanceAnalytics();
      break;
    case "marketSnapshotPanel":
      renderMarketSnapshotPanel();
      break;
    case "dashboardPipelineFunnelPanel":
      renderDashboardPipelineFunnel();
      break;
    case "actionPlanPanel":
      renderActionPlanPanel();
      break;
    case "lossReasonsPanel":
      renderLossReasonsAnalytics();
      break;
    case "marketIntelPanel":
      renderMarketIntelPanel();
      break;
    case "needsAttentionPanel":
      renderNeedsAttentionPanel();
      break;
    case "adminTaskPanel":
      renderAdminTaskAccountsPanel();
      break;
    default:
      break;
  }
}

function queueDashboardCollapsibleRefresh(sectionId) {
  if (!sectionId) return;
  clearTimeout(dashboardCollapsibleTimers.get(sectionId));
  const timer = setTimeout(() => {
    dashboardCollapsibleTimers.delete(sectionId);
    refreshDashboardCollapsibleSection(sectionId);
  }, 220);
  dashboardCollapsibleTimers.set(sectionId, timer);
}

function updateDashboardCollapsibleButton(section) {
  const button = section.querySelector(".panel-collapse-toggle");
  if (!button) return;
  const collapsed = section.classList.contains("is-collapsed");
  button.setAttribute("aria-expanded", String(!collapsed));
  button.setAttribute("title", collapsed ? "Expand section" : "Collapse section");
  const label = button.querySelector(".panel-collapse-label");
  if (label) label.textContent = collapsed ? "Expand section" : "Collapse section";
}

function setDashboardSectionCollapsed(section, collapsed, options = {}) {
  if (!section) return;
  const { persist = true, refresh = true, force = false } = options;
  const nextCollapsed = Boolean(collapsed) && (force || section.classList.contains("collapsible-enabled"));
  section.classList.toggle("is-collapsed", nextCollapsed);
  const body = section.querySelector(".dashboard-collapsible-body");
  if (body) body.setAttribute("aria-hidden", String(nextCollapsed));
  updateDashboardCollapsibleButton(section);
  if (persist && section.dataset.storageKey) {
    localStorage.setItem(section.dataset.storageKey, String(nextCollapsed));
  }
  if (!nextCollapsed && refresh) {
    queueDashboardCollapsibleRefresh(section.id);
  }
}

function setupDashboardCollapsible(definition) {
  const section = document.getElementById(definition.id);
  if (!section) return;
  const header = directSectionHeader(section);
  if (!header) return;
  section.dataset.storageKey = definition.storageKey;
  if (definition.refresh) section.dataset.refreshOnExpand = definition.refresh;
  ensureCollapsibleBody(section, header);
  const actions = ensurePanelHeaderActions(header);
  if (!actions.querySelector(".panel-collapse-toggle")) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "panel-collapse-toggle";
    button.innerHTML = `
      <span class="panel-collapse-label">Collapse section</span>
      <span class="panel-collapse-icon" aria-hidden="true">▾</span>
    `;
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      setDashboardSectionCollapsed(section, !section.classList.contains("is-collapsed"));
    });
    actions.appendChild(button);
  }
  updateDashboardCollapsibleButton(section);
}

function syncDashboardCollapsibles() {
  const active = isAdminDashboardCollapseMode();
  ADMIN_DASHBOARD_COLLAPSIBLES.forEach(definition => {
    const section = document.getElementById(definition.id);
    if (!section) return;
    section.classList.toggle("collapsible-enabled", active);
    const button = section.querySelector(".panel-collapse-toggle");
    if (button) button.classList.toggle("hidden", !active);
    if (!active) {
      setDashboardSectionCollapsed(section, false, { persist: false, refresh: false, force: true });
      return;
    }
    const collapsed = localStorage.getItem(definition.storageKey) === "true";
    setDashboardSectionCollapsed(section, collapsed, { persist: false, refresh: false, force: true });
  });
}

function initDashboardCollapsibles() {
  if (dashboardCollapsiblesReady) return;
  ADMIN_DASHBOARD_COLLAPSIBLES.forEach(setupDashboardCollapsible);
  dashboardCollapsiblesReady = true;
  syncDashboardCollapsibles();
}

function renderPerformanceAnalytics() {
  if (!els.performancePanel || state.currentUser?.role !== "admin") return;
  const rows = scoreSalesmanPerformanceRows(salesmanPerformanceRows());
  renderPerformanceLeaderboard(rows);
  if (!els.performancePanel.classList.contains("is-collapsed")) {
    renderPerformanceChart(rows);
  }
  if (els.performanceTable) {
    els.performanceTable.innerHTML = rows.map(row => `
      <tr>
        <td>${escapeHtml(row.name)}</td>
        <td class="${heatmapClass(row.totalAssigned)}">${row.totalAssigned}</td>
        <td class="${heatmapClass(row.activitiesLogged)}">${row.activitiesLogged}</td>
        <td class="${heatmapClass(row.followupsCompleted)}">${row.followupsCompleted}</td>
        <td class="${scoreHeatmapClass(row.performanceScore)}">${row.performanceScore}%</td>
      </tr>
    `).join("");
  }
  renderPerformanceFeed(rows);
}

function renderAdminTaskAccountsPanel() {
  if (!els.adminTaskPanel || !els.adminTaskTableBody || !els.adminTaskSummary) return;
  const admin = state.currentUser?.role === "admin";
  els.adminTaskPanel.classList.toggle("hidden", !admin);
  if (!admin) return;
  const rows = [...(state.userAccounts || [])]
    .filter(account => String(account.role || "salesman").toLowerCase() === "salesman")
    .sort((a, b) =>
      String(a.full_name || a.name || "").localeCompare(String(b.full_name || b.name || ""))
      || String(a.email || "").localeCompare(String(b.email || ""))
    );
  els.adminTaskSummary.textContent = `${rows.length} ${rows.length === 1 ? "account" : "accounts"}`;
  els.adminTaskTableBody.innerHTML = rows.length
    ? rows.map(account => {
      const fullName = account.full_name || account.name || "Unnamed salesman";
      const status = String(account.status || "active").toLowerCase();
      return `
        <tr>
          <td data-label="Full Name">
            <div class="admin-task-name-cell">
              <strong>${escapeHtml(fullName)}</strong>
              <span class="chip ${status === "inactive" || status === "disabled" ? "warm" : "green"}">${escapeHtml(status === "disabled" ? "Inactive" : status === "inactive" ? "Inactive" : "Active")}</span>
            </div>
          </td>
          <td data-label="User Account Email">${escapeHtml(account.email || "No email recorded")}</td>
          <td data-label="Password"><span class="meta-label">${escapeHtml(account.password_display || "Hidden")}</span></td>
          <td data-label="Last Login">${escapeHtml(lastLoginLabel(account.last_login_at))}</td>
        </tr>
      `;
    }).join("")
    : `<tr><td colspan="4"><div class="table-empty-state">No salesman accounts exist yet.</div></td></tr>`;
}

function leadSectorLabel(lead) {
  return String(lead.sector || lead.business_category || lead.industry || "Unspecified").trim() || "Unspecified";
}

function marketSnapshotLeads() {
  if (state.currentUser?.role !== "admin") return [];
  if (!state.marketSnapshotSalesman || state.marketSnapshotSalesman === "all") return state.leads;
  const person = (state.settings.salesmen || []).find(item => salesmanName(item) === state.marketSnapshotSalesman)
    || state.marketSnapshotSalesman;
  return state.leads.filter(lead => leadMatchesSalesman(lead, person));
}

function renderSnapshotPie(target, legend, entries, totalLabel) {
  if (!target || !legend) return;
  const slices = pieSlices(entries);
  target.style.background = slices.length
    ? `conic-gradient(${slices.map(slice => `${slice.color} ${slice.start}% ${slice.end}%`).join(", ")})`
    : "#edf2f7";
  target.innerHTML = `<span>${entries.reduce((sum, [, count]) => sum + count, 0)}<small>${escapeHtml(totalLabel)}</small></span>`;
  legend.innerHTML = slices.length
    ? slices.map(slice => `<span><i style="background:${slice.color}"></i>${escapeHtml(slice.label)} <strong>${slice.count}</strong></span>`).join("")
    : `<p class="empty-copy">No leads match this filter yet.</p>`;
}

function renderMarketSnapshotPanel() {
  if (!els.marketSnapshotPanel) return;
  const admin = state.currentUser?.role === "admin";
  els.marketSnapshotPanel.classList.toggle("hidden", !admin);
  if (!admin) return;
  const leads = marketSnapshotLeads();
  const locationEntries = Object.entries(countBy(leads, lead => inferEmirate(lead) || inferCountry(lead) || "Unspecified"))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const sectorEntries = Object.entries(countBy(leads, leadSectorLabel))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  renderSnapshotPie(els.marketLocationPie, els.marketLocationLegend, locationEntries, "locations");
  renderSnapshotPie(els.marketSectorPie, els.marketSectorLegend, sectorEntries, "sectors");
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
  renderDailyAiPanel();
  renderSalesmanFollowups();
  renderPortfolioAnalytics();
}

function renderDailyAiPanel() {
  if (!els.dailyAiPanel) return;
  const salesman = state.currentUser && state.currentUser.role !== "admin";
  els.dailyAiPanel.classList.toggle("hidden", !salesman);
  if (!salesman) return;
  if (els.dailyAiGreeting) els.dailyAiGreeting.textContent = `${greetingText()}, ${firstName(state.currentUser.name || state.currentUser.email)}`;
  els.dailyAiPanel.querySelectorAll("[data-salesperson-ai-action]").forEach(button => {
    button.disabled = state.dailyAiLoading || Date.now() < state.aiCooldownUntil;
  });
  if (!els.dailyAiSummary) return;
  if (!state.dailyPipelineSummary?.metrics) {
    els.dailyAiSummary.classList.add("hidden");
    return;
  }
  const metrics = state.dailyPipelineSummary.metrics;
  const trend = metrics.activity_trend;
  els.dailyAiSummary.classList.remove("hidden");
  els.dailyAiSummary.innerHTML = `
    <strong>${Number(metrics.total_companies || 0)} companies</strong>
    <span>${Number(metrics.overdue_next_actions || 0)} overdue</span>
    <span>${trend == null ? "trend baseline pending" : `${trend >= 0 ? "Up" : "Down"} ${Math.abs(trend)}% activity`}</span>
  `;
}

function maybeAutoRunDailyPipeline() {
  if (!state.currentUser || state.currentUser.role === "admin") return;
  const key = `arg_daily_pipeline_${state.currentUser.id || state.currentUser.email}_${today()}`;
  if (localStorage.getItem(key) === "true") return;
  localStorage.setItem(key, "true");
  runSalespersonAiAction("pipeline_health", { showDialog: false }).catch(() => null);
}

function renderAgentPanel() {
  if (!els.agentPanel) return;
  els.agentPanel.classList.toggle("agent-open", state.agentOpen);
  els.agentBody?.classList.toggle("hidden", !state.agentOpen);
  if (els.agentToggle) els.agentToggle.textContent = `${state.agentOpen ? "Hide" : "Ask"} the database`;
  if (els.agentAsk) {
    els.agentAsk.disabled = state.agentLoading || !state.integrations.ai_agent;
    els.agentAsk.textContent = state.agentLoading ? "Thinking..." : "Ask";
  }
  if (els.agentMessage && !state.agentLoading) {
    setMessage(
      els.agentMessage,
      state.integrations.ai_agent
        ? "Read-only - this agent cannot create or modify records."
        : "AI database agent is not configured. Add ANTHROPIC_API_KEY on the server.",
      state.integrations.ai_agent ? "" : "error"
    );
  }
  if (els.agentExamples) {
    const examples = state.integrations.agent_examples?.length
      ? state.integrations.agent_examples
      : [
        "Which accounts have overdue follow-ups?",
        "How many leads are in ENGAGED status?",
        "Who has the most activity this month?"
      ];
    els.agentExamples.innerHTML = examples.map(prompt => `
      <button class="agent-chip" type="button" data-agent-example="${escapeHtml(prompt)}">${escapeHtml(prompt)}</button>
    `).join("");
  }
}

function configDiffHtml(diff = []) {
  if (!diff.length) return `<p class="empty-copy">No changes detected.</p>`;
  return diff.map(row => `
    <article class="config-diff-row">
      <strong>${escapeHtml(row.label || row.field)}</strong>
      <div>
        <span>Before</span>
        <p>${escapeHtml((row.before || []).join(", ") || "Empty")}</p>
      </div>
      <div>
        <span>After</span>
        <p>${escapeHtml((row.after || []).join(", ") || "Empty")}</p>
      </div>
    </article>
  `).join("");
}

function renderConfigAgentPanel() {
  if (!els.configAgentPanel) return;
  const admin = state.currentUser?.role === "admin";
  els.configAgentPanel.classList.toggle("hidden", !admin);
  if (!admin) return;
  if (els.configAgentPropose) {
    els.configAgentPropose.disabled = state.configAgent.loading;
    els.configAgentPropose.textContent = state.configAgent.loading ? "Preparing..." : "Generate Proposal";
  }
  if (els.configAgentApply) {
    const hasChanges = Boolean(state.configAgent.proposal?.diff?.length);
    els.configAgentApply.disabled = state.configAgent.loading || !hasChanges;
  }
  if (els.configAgentExamples) {
    const examples = state.configAgent.examples?.length
      ? state.configAgent.examples
      : state.integrations.configuration_agent_examples || [];
    els.configAgentExamples.innerHTML = examples.map(prompt => `
      <button class="agent-chip" type="button" data-config-agent-example="${escapeHtml(prompt)}">${escapeHtml(prompt)}</button>
    `).join("");
  }
  if (els.configAgentResult) {
    const proposal = state.configAgent.proposal;
    if (!proposal) {
      els.configAgentResult.innerHTML = `<p class="empty-copy">Ask for a safe CRM configuration change. The agent will prepare a proposal before anything is applied.</p>`;
    } else {
      els.configAgentResult.innerHTML = `
        <div class="config-proposal-head">
          <strong>${escapeHtml(proposal.summary || "Configuration proposal")}</strong>
          <span>${escapeHtml(proposal.status || "draft")}</span>
        </div>
        ${proposal.warnings?.length ? `<div class="config-warning">${proposal.warnings.map(escapeHtml).join("<br>")}</div>` : ""}
        <div class="config-diff-list">${configDiffHtml(proposal.diff || [])}</div>
      `;
    }
  }
  if (els.configAgentAudit) {
    const rows = state.configAgent.audit || [];
    els.configAgentAudit.innerHTML = rows.length ? rows.slice(0, 8).map(item => `
      <article class="config-audit-item">
        <div>
          <strong>${escapeHtml(String(item.action || "").replace(/_/g, " "))}</strong>
          <p>${escapeHtml(item.actor_name || item.actor_uid || "Admin")} - ${escapeHtml(formatDateTime(item.timestamp || item.created_at))}</p>
        </div>
        <span>${Number(item.diff?.length || 0)} change${Number(item.diff?.length || 0) === 1 ? "" : "s"}</span>
      </article>
    `).join("") : `<p class="empty-copy">No configuration audit entries yet.</p>`;
  }
}

async function loadConfigurationAgentState() {
  if (state.currentUser?.role !== "admin") {
    state.configAgent = { loading: false, proposal: null, audit: [], examples: [] };
    renderConfigAgentPanel();
    return;
  }
  try {
    const result = await api("/api/configuration-agent/state");
    state.configAgent.audit = result.audit || [];
    state.configAgent.examples = result.examples || [];
  } catch (error) {
    state.configAgent.audit = [];
    setMessage(els.configAgentMessage, error.message, "error");
  }
  renderConfigAgentPanel();
}

async function proposeConfigChange() {
  const prompt = els.configAgentPrompt?.value.trim() || "";
  if (!prompt || state.configAgent.loading) return;
  state.configAgent.loading = true;
  setMessage(els.configAgentMessage, "Preparing configuration proposal...");
  renderConfigAgentPanel();
  try {
    const proposal = await api("/api/configuration-agent/propose", {
      method: "POST",
      body: JSON.stringify({ prompt })
    });
    state.configAgent.proposal = proposal;
    await loadConfigurationAgentState();
    setMessage(els.configAgentMessage, proposal.diff?.length ? "Proposal ready. Review the diff before applying." : "No change was detected.", proposal.diff?.length ? "success" : "");
  } catch (error) {
    setMessage(els.configAgentMessage, error.message, "error");
  } finally {
    state.configAgent.loading = false;
    renderConfigAgentPanel();
  }
}

async function applyConfigProposal() {
  const proposal = state.configAgent.proposal;
  if (!proposal?.diff?.length || state.configAgent.loading) return;
  const adminPassword = adminPasswordPrompt("apply configuration changes");
  if (!adminPassword) return;
  const reason = window.prompt("Reason for this configuration change:", proposal.prompt || "");
  state.configAgent.loading = true;
  setMessage(els.configAgentMessage, "Applying configuration...");
  renderConfigAgentPanel();
  try {
    await api("/api/configuration-agent/apply", {
      method: "POST",
      body: JSON.stringify({
        changes: proposal.changes,
        proposal_id: proposal.id,
        reason: reason || proposal.prompt,
        admin_password: adminPassword
      })
    });
    state.configAgent.proposal = null;
    if (els.configAgentPrompt) els.configAgentPrompt.value = "";
    await loadWorkspace();
    await loadConfigurationAgentState();
    setMessage(els.configAgentMessage, "Configuration applied and audit trail updated.", "success");
  } catch (error) {
    setMessage(els.configAgentMessage, error.message, "error");
  } finally {
    state.configAgent.loading = false;
    renderConfigAgentPanel();
  }
}

function renderDashboardView() {
  renderNeedsAttentionPanel();
  renderPerformanceAnalytics();
  renderAdminTaskAccountsPanel();
  renderMarketSnapshotPanel();
  renderDashboardPipelineFunnel();
  renderActionPlanPanel();
  renderLossReasonsAnalytics();
  renderSalesmanDashboard();
  renderMarketIntelPanel();
  renderAgentPanel();
  renderConfigAgentPanel();
  renderHeaderSummary();
  const focus = [...state.leads]
    .sort((a, b) => {
      const healthRank = { RED: 0, AMBER: 1, GREEN: 2 };
      return (healthRank[a.health?.label] ?? 1) - (healthRank[b.health?.label] ?? 1)
        || String(a.next_action_date || "").localeCompare(String(b.next_action_date || ""));
    })
    .slice(0, 5);
  els.dashboardFocus.innerHTML = focus.map(lead => `
    <button class="dashboard-activity-item dashboard-focus-item" type="button" data-focus-lead="${escapeHtml(lead.id)}">
      <span class="activity-pin attention-square ${drawerStageClass(lead.stage)}" aria-hidden="true"></span>
      <div class="dashboard-focus-copy">
        <strong>${escapeHtml(lead.company_name)}</strong>
        <p>${escapeHtml([inferEmirate(lead), daysAgoLabel(lead.last_activity)].filter(Boolean).join(" - "))}</p>
      </div>
      <span class="stage-badge compact ${drawerStageClass(lead.stage)}">${escapeHtml(stageDisplayLabel(lead.stage))}</span>
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
  if (els.dashboardActivityFeed) {
    const latest = (state.activities || []).slice(0, 5);
    els.dashboardActivityFeed.innerHTML = latest.map(activity => `
      <button class="dashboard-activity-item" type="button" data-dashboard-activity-lead="${escapeHtml(activity.lead_id)}">
        <span class="activity-pin">${escapeHtml(ACTIVITY_TYPE_ICONS[activity.type] || "PIN")}</span>
        <div>
          <strong>${escapeHtml(activity.company_name || "Unnamed account")}</strong>
          <p>${escapeHtml(activity.note || activity.text || "No note added.")}</p>
        </div>
      </button>
    `).join("") || `<p class="empty-copy">No recent interactions yet.</p>`;
    document.querySelectorAll("[data-dashboard-activity-lead]").forEach(button => {
      button.addEventListener("click", () => {
        state.selectedId = button.dataset.dashboardActivityLead;
        openLeadDrawer(state.selectedId, "activities");
      });
    });
  }
}

function renderMarketIntelPanel() {
  if (!els.marketIntelPanel || !els.marketIntelFeed) return;
  const admin = ["admin", "manager"].includes(String(state.currentUser?.role || "").toLowerCase());
  els.marketIntelPanel.classList.toggle("hidden", false);
  els.refreshMarketIntel?.classList.toggle("hidden", !admin);
  if (els.marketIntelKicker) els.marketIntelKicker.textContent = admin ? "Intel Overview" : "Market Intel";
  if (els.marketIntelTitle) els.marketIntelTitle.textContent = admin ? "Last 7 days across territories" : "Signals matched to your prospects";
  const items = (state.marketIntel.items || []).slice(0, admin ? 8 : 5);
  if (state.marketIntel.disabled) {
    els.marketIntelFeed.innerHTML = `<p class="empty-copy">Market intelligence feed is disabled until ZAWYA_API_KEY and feed URL are configured.</p>`;
    return;
  }
  els.marketIntelFeed.innerHTML = items.length
    ? items.map(intelItemMarkup).join("")
    : `<p class="empty-copy">No market intelligence items matched yet. Weekly feeds will appear here after sources are configured.</p>`;
}

function snapshotValue(snapshot, key, fallback = "Not recorded") {
  return escapeHtml(snapshot?.[key] || fallback);
}

function attentionFlagCard(flag) {
  const company = flag.company_snapshot || {};
  const pmr = flag.latest_pmr_snapshot || {};
  return `
    <article class="attention-flag-card">
      <details>
        <summary>
          <span class="flag-status">${escapeHtml(flag.status || "open")}</span>
          <strong>${escapeHtml(flag.company_name || company.company_name || "Company")}</strong>
          <small>Flagged by ${escapeHtml(flag.flagged_by_name || "User")} - ${escapeHtml(String(flag.flagged_at || flag.created_at || "").slice(0, 10) || "today")}</small>
        </summary>
        <p>${escapeHtml(flag.reason || "No reason provided.")}</p>
        <div class="flag-snapshot-grid">
          <span><b>Stage</b>${snapshotValue(company, "stage")}</span>
          <span><b>Owner</b>${snapshotValue(company, "assigned_salesman")}</span>
          <span><b>Next action</b>${snapshotValue(company, "next_action")}</span>
          <span><b>Due</b>${snapshotValue(company, "next_action_date")}</span>
          <span><b>Latest PMR heat</b>${snapshotValue(pmr, "relationship_heat_score")}</span>
          <span><b>PMR director action</b>${snapshotValue(pmr, "director_action_required")}</span>
        </div>
        ${pmr.notes ? `<p class="flag-pmr-note"><b>Latest PMR notes:</b> ${escapeHtml(pmr.notes)}</p>` : ""}
        <div class="flag-actions">
          <button class="small-action" type="button" data-open-flag-lead="${escapeHtml(flag.company_id)}">Open company record</button>
          ${String(flag.status || "open") === "open" ? `<button class="small-action" type="button" data-flag-action="acknowledge" data-flag-id="${escapeHtml(flag.id || flag.flag_id)}">Acknowledge</button>` : ""}
          ${String(flag.status || "") !== "resolved" ? `<button class="small-action danger" type="button" data-flag-action="resolve" data-flag-id="${escapeHtml(flag.id || flag.flag_id)}">Resolve</button>` : ""}
        </div>
      </details>
    </article>
  `;
}

function renderNeedsAttentionPanel() {
  if (!els.needsAttentionPanel || !els.needsAttentionList) return;
  const admin = state.currentUser?.role === "admin";
  els.needsAttentionPanel.classList.toggle("hidden", !admin);
  if (!admin) return;
  const open = (state.attentionFlags || []).filter(flag => String(flag.status || "open") === "open");
  if (els.needsAttentionCount) els.needsAttentionCount.textContent = `${open.length} open`;
  els.needsAttentionList.innerHTML = open.length
    ? open.map(attentionFlagCard).join("")
    : `<p class="empty-copy">No open director alerts.</p>`;
  els.needsAttentionList.querySelectorAll("[data-open-flag-lead]").forEach(button => {
    button.addEventListener("click", () => {
      const id = button.dataset.openFlagLead;
      state.selectedId = id;
      openLeadDrawer(id);
    });
  });
  els.needsAttentionList.querySelectorAll("[data-flag-action]").forEach(button => {
    button.addEventListener("click", async () => {
      const action = button.dataset.flagAction;
      const body = { action };
      if (action === "resolve") {
        const note = window.prompt("Resolution note:");
        if (!note?.trim()) return;
        body.resolution_note = note.trim();
      }
      button.disabled = true;
      try {
        await api(`/api/attention-flags/${encodeURIComponent(button.dataset.flagId)}`, {
          method: "PATCH",
          body: JSON.stringify(body)
        });
        await fetchAttentionFlags();
        renderNeedsAttentionPanel();
        setToast(action === "resolve" ? "Director alert resolved." : "Director alert acknowledged.", "success");
      } catch (error) {
        setToast(error.message, "error");
        button.disabled = false;
      }
    });
  });
}

function renderLeadList() {
  const leads = filteredLeads();
  els.leadCount.textContent = `${leads.length} record${leads.length === 1 ? "" : "s"}${state.importedAfter ? " from latest import" : ""}`;
  els.leadList.innerHTML = leads.map(lead => {
    const origin = leadOriginForCurrentUser(lead, state.currentUser);
    return `
    <button class="lead-card ${lead.id === state.selectedId ? "active" : ""}" data-lead-id="${escapeHtml(lead.id)}">
      <div class="lead-title">
        <span class="priority-dot ${priorityClass(lead.priority)}"></span>
        <strong>${escapeHtml(lead.company_name)}</strong>
        <span class="lead-chevron">&rsaquo;</span>
      </div>
      <p>${escapeHtml([inferEmirate(lead), daysAgoLabel(lead.last_activity)].filter(Boolean).join(" - "))}</p>
      ${leadActionPlanMarkup(lead)}
      <div class="chip-row">
        <span class="stage-badge ${drawerStageClass(lead.stage)}">${escapeHtml(stageDisplayLabel(lead.stage))}</span>
        <span class="chip ${healthClass(lead.health)}">${escapeHtml(lead.health?.label || "AMBER")}</span>
        <span class="chip">${escapeHtml(lead.territory)}</span>
        <span class="chip ${leadOriginChipClass(origin)}">${escapeHtml(origin)}</span>
        <span class="chip">${escapeHtml(lead.assigned_salesman)}</span>
      </div>
    </button>
    `;
  }).join("");

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

function greetingText() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function firstName(value) {
  return String(value || "").trim().split(/\s+/)[0] || "Team";
}

function stageDisplayLabel(stage) {
  const key = kanbanStageForLead({ stage });
  if (key === "OUTREACH") return "CONTACTED";
  if (key === "SAMPLING") return "QUOTATION SENT";
  if (key === "ENGAGED") return "NEGOTIATION";
  if (key === "ACTIVE") return "WON";
  if (key === "DORMANT") return "LOST";
  return "NEW";
}

function daysAgoLabel(dateValue) {
  if (!dateValue) return "No activity yet";
  const days = daysSince(dateValue);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  if (days >= 999) return "No activity yet";
  return `${days} days ago`;
}

function renderHeaderSummary() {
  if (!state.currentUser) return;
  const territory = state.currentUser.role === "admin"
    ? "All territories"
    : (state.currentUser.territory || "UAE");
  if (els.greetingLabel) els.greetingLabel.textContent = greetingText();
  if (els.dashboardUserName) els.dashboardUserName.textContent = firstName(state.currentUser.name || state.currentUser.email);
  if (els.dashboardSubline) {
    els.dashboardSubline.textContent = `${state.leads.length} account${state.leads.length === 1 ? "" : "s"} - ${territory}`;
  }
}

function renderSidebarIdentity() {
  if (!state.currentUser) return;
  if (els.sidebarUserName) els.sidebarUserName.textContent = state.currentUser.name || state.currentUser.email || "User";
  if (els.sidebarUserRole) els.sidebarUserRole.textContent = state.currentUser.role || "user";
  if (els.sidebarUserAvatar) {
    const initials = String(state.currentUser.name || state.currentUser.email || "AR")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(token => token.charAt(0).toUpperCase())
      .join("");
    els.sidebarUserAvatar.textContent = initials || "AR";
  }
}

function weekRangeLabel(anchorDate = state.activityWeekAnchor) {
  const days = weekDays(anchorDate);
  if (!days.length) return "";
  const start = formatDisplayDate(days[0].date);
  const end = formatDisplayDate(days[6].date);
  return `${start} - ${end}`;
}

function renderTopbar() {
  if (!els.topbarPageTitle || !els.topbarContext || !state.currentUser) return;
  const currentWeekItems = activityWeeklyItems(state.activities || [], state.activityWeekAnchor);
  const selectedLead = state.leads.find(item => item.id === state.selectedId);
  const territory = state.currentUser.role === "admin"
    ? "All territories"
    : (state.currentUser.territory || "UAE");
  const config = {
    dashboard: {
      title: "Dashboard",
      context: `${state.leads.length} account${state.leads.length === 1 ? "" : "s"} across ${territory}`
    },
    pipeline: {
      title: "Pipeline",
      context: `${state.leads.length} live lead${state.leads.length === 1 ? "" : "s"} in active tracking`
    },
    salesmen: {
      title: "Salesmen",
      context: "Team ownership, activity, and follow-up performance"
    },
    activity: {
      title: "Activity",
      context: `${weekRangeLabel()} · ${currentWeekItems.length} scheduled move${currentWeekItems.length === 1 ? "" : "s"}`
    },
    lead: {
      title: selectedLead?.company_name || "Lead Detail",
      context: [selectedLead?.assigned_salesman, stageDisplayLabel(selectedLead?.stage), selectedLead?.territory].filter(Boolean).join(" · ") || "AI summary, CRM timeline, reminders, and PMRs"
    }
  }[currentView] || {
    title: "CRM",
    context: `${state.leads.length} active records`
  };
  els.topbarPageTitle.textContent = config.title;
  els.topbarContext.textContent = config.context;
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

function salesmanByName(name) {
  const target = String(name || "").trim().toLowerCase();
  return (state.settings.salesmen || []).find(person => salesmanName(person).toLowerCase() === target);
}

function promptHandoff(existingLead, newSalesmanName) {
  if (!els.handoffDialog || !els.handoffForm) return Promise.resolve(null);
  const oldOwner = existingLead.assigned_salesman || "Unassigned";
  const newOwner = newSalesmanName || "Unassigned";
  const newProfile = salesmanByName(newOwner);
  const oldTerritory = existingLead.territory || "Not set";
  const newTerritory = newProfile?.territory || oldTerritory;
  els.handoffForm.reset();
  if (els.handoffTitle) els.handoffTitle.textContent = `Reassign ${existingLead.company_name || "lead"}`;
  if (els.handoffSubtitle) els.handoffSubtitle.textContent = "Add a handoff note so the ownership change is auditable.";
  if (els.handoffSummary) {
    els.handoffSummary.innerHTML = `
      <span><strong>Owner:</strong> ${escapeHtml(oldOwner)} to ${escapeHtml(newOwner)}</span>
      <span><strong>Territory:</strong> ${escapeHtml(oldTerritory)} to ${escapeHtml(newTerritory)}</span>
    `;
  }
  if (els.handoffMessage) setMessage(els.handoffMessage, "Minimum 20 characters. Mention what changed and what the new owner should do next.");
  if (els.confirmHandoff) els.confirmHandoff.disabled = true;

  return new Promise(resolve => {
    const noteField = els.handoffForm.elements.handoff_note;
    const cleanup = () => {
      noteField.removeEventListener("input", onInput);
      els.handoffForm.removeEventListener("submit", onSubmit);
      els.cancelHandoff?.removeEventListener("click", onCancel);
      els.handoffDialog.removeEventListener("cancel", onCancel);
    };
    const onInput = () => {
      const valid = noteField.value.trim().length >= 20;
      if (els.confirmHandoff) els.confirmHandoff.disabled = !valid;
      if (els.handoffMessage) {
        setMessage(els.handoffMessage, valid ? "Ready to confirm reassignment." : "Minimum 20 characters. Mention what changed and what the new owner should do next.", valid ? "success" : "");
      }
    };
    const onCancel = event => {
      event?.preventDefault?.();
      cleanup();
      els.handoffDialog.close();
      resolve(null);
    };
    const onSubmit = event => {
      event.preventDefault();
      const note = noteField.value.trim();
      if (note.length < 20) {
        setMessage(els.handoffMessage, "A handoff note is required before reassigning.", "error");
        return;
      }
      cleanup();
      els.handoffDialog.close();
      resolve(note);
    };
    noteField.addEventListener("input", onInput);
    els.handoffForm.addEventListener("submit", onSubmit);
    els.cancelHandoff?.addEventListener("click", onCancel);
    els.handoffDialog.addEventListener("cancel", onCancel);
    els.handoffDialog.showModal();
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

function loadLeadDetailData(leadId) {
  const lead = state.leads.find(item => item.id === leadId);
  if (!lead) return;
  state.leadDrawerLoading = true;
  state.leadDrawerPmrs = [];
  state.leadDrawerIntel = [];
  state.leadDrawerHandoffs = [];
  primeLeadAiSummaryState(lead);
  render();
  loadLeadAiSummary(leadId).catch(() => {});
  Promise.allSettled([
    api(`/api/leads/${encodeURIComponent(leadId)}/pmrs`),
    api(`/api/leads/${encodeURIComponent(leadId)}/intel`),
    api(`/api/leads/${encodeURIComponent(leadId)}/handoffs`),
    outboxItems()
  ])
    .then(results => {
      if (state.selectedId !== leadId) return;
      const syncedPmrs = results[0].status === "fulfilled" ? results[0].value || [] : [];
      const pendingPmrs = results[3].status === "fulfilled"
        ? results[3].value
          .filter(item => item.kind === "pmr" && item.lead_id === leadId)
          .map(item => ({
            ...(item.payload || {}),
            id: item.id,
            company_id: leadId,
            pending_sync: true,
            voice_note_pending_upload: Boolean(item.voice_note_blob)
          }))
        : [];
      state.leadDrawerPmrs = [...pendingPmrs, ...syncedPmrs];
      if (results[1].status === "fulfilled") state.leadDrawerIntel = results[1].value || [];
      if (results[2].status === "fulfilled") state.leadDrawerHandoffs = results[2].value || [];
    })
    .finally(() => {
      if (state.selectedId === leadId) {
        state.leadDrawerLoading = false;
        render();
        loadActivityAudioSources();
      }
    });
}

function openLeadDrawer(leadId, tab = "overview", options = {}) {
  const lead = state.leads.find(item => item.id === leadId);
  if (!lead) return;
  if (currentView !== "lead") {
    state.lastNonLeadView = currentView === "lead" ? (state.lastNonLeadView || "pipeline") : currentView;
  }
  state.selectedId = leadId;
  state.leadDrawerOpen = true;
  state.leadDrawerTab = tab;
  currentView = "lead";
  if (!options.skipHistory) syncBrowserRoute({ replace: Boolean(options.replaceHistory) });
  closeMobileMenu();
  loadLeadDetailData(leadId);
}

function closeLeadDrawer(options = {}) {
  state.leadDrawerOpen = false;
  state.leadDrawerLoading = false;
  resetLeadAiSummaryState();
  currentView = state.lastNonLeadView && state.lastNonLeadView !== "lead" ? state.lastNonLeadView : "pipeline";
  if (options.useBrowserBack && window.history.state?.view === "lead" && window.history.length > 1) {
    window.history.back();
    return;
  }
  syncBrowserRoute({ replace: Boolean(options.replaceHistory) });
  render();
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
  const auto = options.auto ? `<span class="auto-tag">Auto</span>` : "";
  const safeValue = escapeHtml(String(value));
  const content = options.href
    ? `<a class="drawer-field-value" href="${escapeHtml(options.href)}" title="${safeValue}" ${options.external ? 'target="_blank" rel="noopener"' : ""}>${safeValue}</a>`
    : `<span class="drawer-field-value" title="${safeValue}">${safeValue}</span>`;
  return `<article class="drawer-field ${options.overdue ? "overdue" : ""}"><span>${escapeHtml(label)}${auto}</span><strong>${content}</strong></article>`;
}

function tagPills(value) {
  return String(value || "").split(",").map(tag => tag.trim()).filter(Boolean)
    .map(tag => `<span class="chip">${escapeHtml(tag)}</span>`).join("") || `<span class="empty-copy">No tags added.</span>`;
}

function autoEnrichmentData(lead) {
  return lead?.auto_enrichment?.data && typeof lead.auto_enrichment.data === "object" ? lead.auto_enrichment.data : {};
}

function isAutoPending(lead) {
  return lead?.auto_enrichment?.status === "pending_review" || lead?.auto_enrichment?.status === "failed";
}

function autoField(lead, key) {
  return isAutoPending(lead) && Object.hasOwn(autoEnrichmentData(lead), key);
}

function autoEnrichmentBanner(lead) {
  if (!lead?.auto_enrichment) return "";
  const status = lead.auto_enrichment.status || "pending_review";
  if (status === "verified") return "";
  const date = lead.auto_enrichment.enriched_at
    ? new Date(lead.auto_enrichment.enriched_at).toLocaleDateString("en-AE", { year: "numeric", month: "short", day: "numeric" })
    : "recently";
  const warning = lead.auto_enrichment.low_confidence ? `<span>Low confidence - verify before saving.</span>` : "";
  const data = autoEnrichmentData(lead);
  const sector = String(data.sector_classification || "").trim();
  const confidence = String(data.confidence || lead.auto_enrichment.confidence || "").trim();
  return `
    <div class="auto-enrichment-banner ${lead.auto_enrichment.low_confidence ? "low" : ""}">
      <div>
        <strong>${status === "failed" ? "Auto-enrichment unavailable" : `Auto-enriched on ${escapeHtml(date)} - please review and confirm.`}</strong>
        ${sector ? `<span>Suggested sector: ${escapeHtml(sector)}${confidence ? ` (${escapeHtml(confidence)} confidence)` : ""}</span>` : ""}
        ${warning}
      </div>
      <div class="auto-enrichment-actions">
        ${status !== "failed" ? `<button class="ghost-button" type="button" data-confirm-auto-enrichment="${escapeHtml(lead.id)}">Apply All</button>` : ""}
        <button class="ghost-button" type="button" data-reenrich-lead="${escapeHtml(lead.id)}">Re-enrich</button>
        <button class="ghost-button" type="button" data-drawer-edit-lead="${escapeHtml(lead.id)}">Edit</button>
      </div>
    </div>
  `;
}

function autoValue(value) {
  if (Array.isArray(value)) {
    if (!value.length) return "";
    if (typeof value[0] === "object") {
      return value.map(item => [item.name, item.title].filter(Boolean).join(" - ")).filter(Boolean).join("; ");
    }
    return value.join(", ");
  }
  return String(value || "").trim();
}

function sectorAutoReviewSummary(lead) {
  const data = autoEnrichmentData(lead);
  const sources = Array.isArray(data.sector_sources) ? data.sector_sources.filter(Boolean) : [];
  const sector = String(data.sector_classification || "").trim();
  const confidence = String(data.confidence || lead?.auto_enrichment?.confidence || "").trim();
  const confidenceReason = String(data.confidence_reason || "").trim();
  const reasoning = String(data.sector_reasoning || "").trim();
  if (!sector && !sources.length && !confidence && !reasoning) return "";
  return `
    <section class="sector-review-card">
      <div class="sector-review-head">
        <div>
          <strong>Suggested sector: ${escapeHtml(sector || "Not available")}</strong>
          <span class="meta-label">AI maps only to the approved CRM sector list. Please confirm before applying.</span>
        </div>
        ${confidence ? `<span class="chip ${confidence.toLowerCase() === "high" ? "plan-upcoming" : confidence.toLowerCase() === "medium" ? "plan-soon" : "hot"}">${escapeHtml(confidence)} confidence</span>` : ""}
      </div>
      ${reasoning ? `<p class="sector-review-copy">${escapeHtml(reasoning)}</p>` : ""}
      ${confidenceReason ? `<p class="sector-review-copy muted">${escapeHtml(confidenceReason)}</p>` : ""}
      ${sources.length ? `<div class="chip-row">${sources.map(source => `<span class="chip">${escapeHtml(source)}</span>`).join("")}</div>` : ""}
    </section>
  `;
}

function autoReviewRows(lead) {
  const data = autoEnrichmentData(lead);
  return [
    { key: "sector_classification", label: "Suggested sector", current: lead.sector || lead.industry, auto: data.sector_classification },
    { key: "estimated_scale", label: "Scale", current: lead.estimated_scale, auto: data.estimated_scale },
    { key: "estimated_annual_revenue", label: "Annual revenue", current: lead.estimated_annual_revenue, auto: data.estimated_annual_revenue },
    { key: "key_personnel", label: "Key personnel", current: lead.key_personnel, auto: data.key_personnel },
    { key: "recent_projects", label: "Recent projects", current: lead.recent_projects, auto: data.recent_projects },
    { key: "certifications", label: "Certifications", current: lead.certifications, auto: data.certifications },
    { key: "compliance_flags", label: "Compliance flags", current: lead.certifications, auto: data.compliance_flags },
    { key: "steel_products_likely_needed", label: "Likely steel products", current: lead.steel_products_likely_needed, auto: data.steel_products_likely_needed },
    { key: "competitors_likely_using", label: "Likely competitors", current: lead.competitors_likely_using, auto: data.competitors_likely_using }
  ].filter(row => autoValue(row.auto));
}

function autoEnrichmentReviewPanel(lead) {
  if (!isAutoPending(lead) || lead.auto_enrichment?.status === "failed") return "";
  const rows = autoReviewRows(lead);
  if (!rows.length) return "";
  return `
    <section class="auto-review-panel ${lead.auto_enrichment?.low_confidence ? "low" : ""}">
      <div class="drawer-tab-heading">
        <div>
          <h3>Review Auto-Enrichment</h3>
          <span class="meta-label">${lead.auto_enrichment?.low_confidence ? "Low confidence - verify before applying." : "Apply only details you trust."}</span>
        </div>
        <button class="primary-button" type="button" data-confirm-auto-enrichment="${escapeHtml(lead.id)}">Apply All</button>
      </div>
      ${sectorAutoReviewSummary(lead)}
      <div class="auto-review-table">
        <div class="auto-review-head"><span>Field</span><span>Current</span><span>Auto-Enriched</span><span></span></div>
        ${rows.map(row => `
          <article class="auto-review-row">
            <strong>${escapeHtml(row.label)}</strong>
            <span>${escapeHtml(autoValue(row.current) || "Not added")}</span>
            <span>${escapeHtml(autoValue(row.auto))}</span>
            <button class="small-action" type="button" data-apply-auto-field="${escapeHtml(row.key)}" data-lead-id="${escapeHtml(lead.id)}">Apply</button>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function linkedinControls(lead) {
  const titles = state.integrations.linkedin_titles?.length
    ? state.integrations.linkedin_titles
    : ["Procurement Manager", "Supply Chain Manager", "Project Manager", "Estimation Manager", "MD CEO"];
  return `
    <div class="linkedin-search">
      <select data-linkedin-title="${escapeHtml(lead.id)}">
        ${titles.map(title => `<option value="${escapeHtml(title)}">${escapeHtml(title)}</option>`).join("")}
      </select>
      <button class="ghost-button" type="button" data-linkedin-search="${escapeHtml(lead.id)}">Find contact on LinkedIn</button>
    </div>
  `;
}

function intelItemMarkup(item) {
  return `
    <article class="intel-item">
      <div class="intel-title-row">
        <span class="source-badge">${escapeHtml(item.source || "Source")}</span>
        <span class="meta-label">${escapeHtml(String(item.published_at || item.fetched_at || "").slice(0, 10))}</span>
      </div>
      <strong>${escapeHtml(item.title || "Untitled intelligence item")}</strong>
      <p>${escapeHtml(item.summary || "No summary available.")}</p>
      <div class="chip-row">
        ${(item.sector_tags || []).slice(0, 3).map(tag => `<span class="chip">${escapeHtml(tag)}</span>`).join("")}
        ${(item.geography_tags || []).slice(0, 3).map(tag => `<span class="chip warm">${escapeHtml(tag)}</span>`).join("")}
      </div>
      ${item.url ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener">View source</a>` : ""}
    </article>
  `;
}

function validateQuotationInput(input, statusEl) {
  clearTimeout(quotationValidationTimer);
  const ref = input?.value?.trim() || "";
  if (!statusEl) return;
  if (!ref) {
    statusEl.textContent = "";
    statusEl.className = "quote-ref-status";
    return;
  }
  statusEl.textContent = "Checking...";
  statusEl.className = "quote-ref-status checking";
  quotationValidationTimer = setTimeout(async () => {
    try {
      const result = await api("/api/erp/validate-quotation", {
        method: "POST",
        body: JSON.stringify({ ref })
      });
      statusEl.textContent = result.valid ? "Valid ref" : "Invalid ref";
      statusEl.className = `quote-ref-status ${result.valid ? "valid" : "invalid"}`;
    } catch {
      statusEl.textContent = "ERP unavailable";
      statusEl.className = "quote-ref-status invalid";
    }
  }, 450);
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
    ${autoEnrichmentBanner(lead)}
    <section class="drawer-section">
      <h3>Contact Information</h3>
      <div class="drawer-field-grid">
        ${detailField("Primary contact", [lead.contact_person, lead.primary_contact_title].filter(Boolean).join(" - "), { auto: autoField(lead, "key_personnel") })}
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
        ${detailField("Industry", lead.industry || lead.business_category || lead.sector, { auto: autoField(lead, "sector_classification") })}
        ${detailField("Product interest", lead.product_interest)}
        ${detailField("Quotation ref", lead.quotation_ref)}
        ${detailField("First order date", lead.first_order_date)}
        ${detailField("Monthly volume", lead.estimated_monthly_volume)}
        ${detailField("Assigned salesman", lead.assigned_salesman)}
        ${detailField("Activity purpose", normalizeActivityPurpose(lead.activity_purpose))}
        ${detailField("Next action date", lead.next_action_date ? `${lead.next_action_date}${overdue ? " - overdue" : ""}` : "", { overdue })}
        ${detailField("Next action", lead.next_action ? normalizeNextActionPlan(lead.next_action) : "")}
      </div>
      <div class="drawer-tags">${tagPills(lead.tags)}</div>
      <p class="drawer-remarks">${autoField(lead, "recent_projects") ? `<span class="auto-tag">Auto</span> ` : ""}${escapeHtml(lead.products_services_remarks || "No products/services remarks added.")}</p>
    </section>
    ${renderLossDetails(lead)}
    ${autoEnrichmentReviewPanel(lead)}
    <div class="drawer-quick-actions">
      <a class="ghost-button" href="${lead.phone ? `tel:${escapeHtml(lead.phone)}` : "#"}">Call</a>
      <a class="ghost-button" href="${lead.email ? `mailto:${escapeHtml(lead.email)}` : "#"}">Email</a>
      <button class="ghost-button" type="button" data-drawer-log-activity="${escapeHtml(lead.id)}">Log Activity</button>
      <button class="primary-button" type="button" data-drawer-edit-lead="${escapeHtml(lead.id)}">Edit Lead</button>
    </div>
    ${linkedinControls(lead)}
  `;
}

function renderDrawerActivities(lead) {
  const activities = [...(lead.activities || [])].sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
  const handoffs = [...(state.leadDrawerHandoffs || [])].sort((a, b) => String(b.timestamp || "").localeCompare(String(a.timestamp || "")));
  return `
    <section class="drawer-section">
      <div class="drawer-tab-heading"><h3>Activities</h3><button class="ghost-button" type="button" data-drawer-log-activity="${escapeHtml(lead.id)}">Log New Activity</button></div>
      ${handoffs.length ? `
        <div class="handoff-history">
          <h4>Ownership Handoff History</h4>
          ${handoffs.map(item => `
            <article class="handoff-event">
              <div>
                <span class="activity-type-label"><i>MOVE</i>Handoff</span>
                <span class="meta-label">${escapeHtml(String(item.timestamp || "").slice(0, 10))}</span>
              </div>
              <strong>${escapeHtml(item.previous_owner_name || "Unassigned")} to ${escapeHtml(item.new_owner_name || "Unassigned")}</strong>
              <small>${escapeHtml(item.previous_territory || "No territory")} to ${escapeHtml(item.new_territory || "No territory")} - by ${escapeHtml(item.initiated_by_name || "Admin")}</small>
              <p class="activity-note clamp" data-expand-note>${escapeHtml(item.handoff_note || "No handoff note saved.")}</p>
            </article>
          `).join("")}
        </div>
      ` : ""}
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

function linkedActivityLabel(lead, activityId) {
  if (!activityId) return "";
  const activity = (lead.activities || []).find(item => String(item.id || "") === String(activityId));
  if (!activity) return `Linked activity ${String(activityId).slice(0, 12)}`;
  return `${activity.at || "No date"} - ${activity.type || "Activity"}`;
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
              ${pmr.pending_sync ? `<span class="chip warm">Pending sync</span>` : ""}
              ${pmr.voice_note_pending_upload ? `<span class="chip warm">Voice upload queued</span>` : ""}
              <span class="chip">${escapeHtml(pmr.first_order_timing || "Timing unknown")}</span>
              <span class="chip">${escapeHtml(pmr.potential_annual_value || "Value unknown")}</span>
              <span class="chip">${escapeHtml(pmr.director_action_required || "No director action")}</span>
              ${pmr.activity_id ? `<span class="chip">${escapeHtml(linkedActivityLabel(lead, pmr.activity_id))}</span>` : ""}
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

function renderDrawerIntel(lead) {
  const items = state.leadDrawerIntel || [];
  return `
    <section class="drawer-section">
      <div class="drawer-tab-heading">
        <h3>Market Intel</h3>
        <button class="ghost-button" type="button" data-refresh-lead-intel="${escapeHtml(lead.id)}">Refresh</button>
      </div>
      <div class="drawer-list intel-list">
        ${items.length ? items.map(intelItemMarkup).join("") : `<div class="timeline-empty"><strong>No matched intel yet.</strong><span>Weekly feeds will appear here when sources are configured.</span></div>`}
      </div>
    </section>
  `;
}

function renderLeadDrawer() {
  const lead = state.leads.find(item => item.id === state.selectedId);
  const admin = ["admin", "manager"].includes(String(state.currentUser?.role || "").toLowerCase());
  const tabs = ["overview", "activities", "pmr", "reminders", "intel", "notes"];
  const tabLabels = { overview: "Overview", activities: "Activities", pmr: "PMR", reminders: "Reminders", intel: "Intel", notes: "Notes" };
  const isLeadView = currentView === "lead";

  if (els.leadDrawerShell) {
    els.leadDrawerShell.classList.add("hidden");
    els.leadDrawerShell.classList.remove("open", "closing");
    els.leadDrawerShell.setAttribute("aria-hidden", "true");
  }
  els.leadDrawerMobileSwitch?.classList.add("hidden");

  if (!els.leadDetailView || !els.leadAiSummaryPagePanel || !els.leadAiSummaryPageContent || !els.leadDetailPageContent) return;
  if (!isLeadView) {
    els.leadDetailView.classList.add("hidden");
    els.leadAiSummaryPageContent.innerHTML = "";
    els.leadDetailPageContent.innerHTML = "";
    return;
  }

  if (!lead) {
    els.leadDetailView.classList.remove("hidden");
    els.leadAiSummaryPageContent.innerHTML = "";
    els.leadDetailPageContent.innerHTML = `
      <div class="empty-state lead-detail-empty-state">
        <strong>Lead not found</strong>
        <span>The requested lead could not be loaded for this account.</span>
        <button class="ghost-button" type="button" id="leadDetailBack">Back to leads</button>
      </div>
    `;
    bindLeadDrawerEvents();
    return;
  }

  const body = state.leadDrawerLoading ? drawerSkeleton() : ({
    overview: renderDrawerOverview(lead),
    activities: renderDrawerActivities(lead),
    pmr: renderDrawerPmrs(lead),
    reminders: renderDrawerReminders(lead),
    intel: renderDrawerIntel(lead),
    notes: renderDrawerNotes(lead)
  }[state.leadDrawerTab] || renderDrawerOverview(lead));

  els.leadDetailView.classList.remove("hidden");
  els.leadDetailPageContent.innerHTML = `
    <div class="lead-detail-page-toolbar">
      <button class="ghost-button lead-detail-back-button" type="button" id="leadDetailBack">Back to ${escapeHtml(state.lastNonLeadView === "activity" ? "Activity" : state.lastNonLeadView === "salesmen" ? "Salesmen" : state.lastNonLeadView === "dashboard" ? "Dashboard" : "Pipeline")}</button>
    </div>
    <header class="drawer-header lead-page-header">
      <div class="drawer-title-row">
        <div class="drawer-avatar ${kanbanPriorityTone(lead.priority)}">${escapeHtml(leadInitial(lead))}</div>
        <div class="drawer-title-copy">
          <h2 id="leadDrawerTitle">${escapeHtml(lead.company_name || "Lead")}</h2>
          <p>${escapeHtml([lead.sector || lead.industry, inferEmirate(lead), lead.territory].filter(Boolean).join(" - "))}</p>
        </div>
      </div>
      <div class="drawer-badges">
        ${admin ? `<select class="drawer-stage-select ${drawerStageClass(lead.stage)}" id="drawerStageSelect">${(state.settings.stages || []).map(stage => `<option value="${escapeHtml(stage)}" ${stage === lead.stage ? "selected" : ""}>${escapeHtml(drawerStageLabel(stage))}</option>`).join("")}</select>` : `<span class="drawer-stage-pill ${drawerStageClass(lead.stage)}">${escapeHtml(drawerStageLabel(lead.stage))}</span>`}
        <span class="chip ${priorityClass(lead.priority)}">${escapeHtml(lead.priority || "Cold")}</span>
        <span class="chip">${escapeHtml(formatAED(lead.estimated_value))}</span>
      </div>
    </header>
    <nav class="drawer-tabs lead-detail-tabs">${tabs.map(tab => `<button type="button" class="${state.leadDrawerTab === tab ? "active" : ""}" data-drawer-tab="${tab}">${tabLabels[tab]}</button>`).join("")}</nav>
    <div class="drawer-body lead-detail-page-body">${body}</div>
  `;
  renderLeadAiSummaryPanel(lead, { panel: els.leadAiSummaryPagePanel, content: els.leadAiSummaryPageContent });
  bindLeadDrawerEvents();
}

function bindLeadDrawerEvents() {
  document.querySelector("#leadDetailBack")?.addEventListener("click", () => {
    closeLeadDrawer({ useBrowserBack: true });
  });
  document.querySelectorAll("[data-toggle-lead-ai-minimize]").forEach(button => {
    button.addEventListener("click", () => {
      state.leadAiSummary.minimized = button.dataset.toggleLeadAiMinimize === "true";
      render();
    });
  });
  document.querySelectorAll("[data-refresh-lead-ai-summary]").forEach(button => {
    button.addEventListener("click", () => {
      loadLeadAiSummary(button.dataset.refreshLeadAiSummary, { force: true }).catch(error => {
        setToast(error.message, "error");
      });
    });
  });
  document.querySelectorAll("[data-drawer-tab]").forEach(button => {
    button.addEventListener("click", () => {
      state.leadDrawerTab = button.dataset.drawerTab;
      if (currentView === "lead") syncBrowserRoute({ replace: true });
      render();
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
        render();
        return;
      }
      Object.assign(lead, result.updated);
      setToast(`Lead moved to ${drawerStageLabel(stage)}`, "success");
      render();
    } catch (error) {
      lead.stage = previous;
      setToast(error.message, "error");
      render();
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
  document.querySelectorAll("[data-confirm-auto-enrichment]").forEach(button => {
    button.addEventListener("click", async () => {
      try {
        const updated = await api(`/api/leads/${button.dataset.confirmAutoEnrichment}/auto-enrichment/confirm`, {
          method: "POST",
          body: JSON.stringify({ apply_all: true })
        });
        const lead = state.leads.find(item => item.id === updated.id);
        if (lead) Object.assign(lead, updated);
        setToast("Auto-enrichment applied.", "success");
        render();
      } catch (error) {
        setToast(error.message, "error");
      }
    });
  });
  document.querySelectorAll("[data-apply-auto-field]").forEach(button => {
    button.addEventListener("click", async () => {
      try {
        const updated = await api(`/api/leads/${button.dataset.leadId}/auto-enrichment/confirm`, {
          method: "POST",
          body: JSON.stringify({ fields: [button.dataset.applyAutoField] })
        });
        const lead = state.leads.find(item => item.id === updated.id);
        if (lead) Object.assign(lead, updated);
        setToast("Auto-enrichment field applied.", "success");
        render();
      } catch (error) {
        setToast(error.message, "error");
      }
    });
  });
  document.querySelectorAll("[data-reenrich-lead]").forEach(button => {
    button.addEventListener("click", async () => {
      try {
        setToast("Refreshing company intelligence...", "");
        const updated = await api(`/api/leads/${button.dataset.reenrichLead}/auto-enrichment/retry`, { method: "POST" });
        const lead = state.leads.find(item => item.id === updated.id);
        if (lead) Object.assign(lead, updated);
        setToast("Company intelligence refreshed.", "success");
        render();
      } catch (error) {
        setToast("Auto-enrichment unavailable - add details manually.", "error");
      }
    });
  });
  document.querySelectorAll("[data-linkedin-search]").forEach(button => {
    button.addEventListener("click", async () => {
      const lead = state.leads.find(item => item.id === button.dataset.linkedinSearch);
      const title = document.querySelector(`[data-linkedin-title="${CSS.escape(button.dataset.linkedinSearch)}"]`)?.value || "";
      if (!lead) return;
      try {
        const result = await api(`/api/linkedin/search-url?company=${encodeURIComponent(lead.company_name)}&title=${encodeURIComponent(title)}`);
        window.open(result.url, "_blank", "noopener");
      } catch {
        window.open(`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${lead.company_name} ${title || "Procurement Manager"}`)}`, "_blank", "noopener");
      }
    });
  });
  document.querySelectorAll("[data-refresh-lead-intel]").forEach(button => {
    button.addEventListener("click", async () => {
      try {
        state.leadDrawerIntel = await api(`/api/leads/${button.dataset.refreshLeadIntel}/intel`);
        renderLeadDrawer();
      } catch (error) {
        setToast(error.message, "error");
      }
    });
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
      render();
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

function pmrLinkableActivities(lead) {
  const meetingTypes = new Set(["in-person meeting", "site visit", "customer meeting", "phone call", "video call", "visit"]);
  return (lead.activities || []).filter(activity => {
    if (!activity?.id || activity.delete_request || activity.correction || activity.pmr_linked) return false;
    const type = String(activity.type || "").trim().toLowerCase();
    const text = String(activity.text || activity.note || "").toLowerCase();
    return meetingTypes.has(type) || text.includes("meeting") || text.includes("visit");
  });
}

function populatePmrActivityOptions(lead) {
  if (!els.pmrActivityLink) return;
  const activities = pmrLinkableActivities(lead);
  els.pmrActivityLink.innerHTML = [
    `<option value="">Create a new meeting activity for this PMR</option>`,
    ...activities.map(activity => {
      const label = `${activity.at || "No date"} - ${activity.type || "Activity"} - ${activity.text || activity.note || "No note"}`;
      return `<option value="${escapeHtml(activity.id)}">${escapeHtml(label.slice(0, 140))}</option>`;
    })
  ].join("");
}

function openPmrForLead(leadId) {
  const lead = state.leads.find(item => item.id === leadId);
  if (!lead) return;
  els.pmrMessage.textContent = "";
  els.pmrForm.reset();
  resetPmrVoiceNote();
  els.pmrForm.elements.company_id.value = lead.id;
  els.pmrForm.elements.meeting_date.value = today();
  populatePmrActivityOptions(lead);
  els.pmrDialog.showModal();
}

function openLeadEdit(leadId) {
  const lead = state.leads.find(item => item.id === leadId);
  if (!lead) return;
  state.editingLeadId = leadId;
  state.editingOriginalStage = lead.stage || "";
  state.editingLostData = null;
  leadFormTouched.clear();
  resetLeadEnrichmentSession();
  els.leadForm.reset();
  Object.entries(lead).forEach(([key, value]) => {
    const field = els.leadForm.elements[key];
    if (!field) return;
    field.value = formValue(value);
  });
  ensureLeadFormSelectValue("next_action", normalizeNextActionPlan(lead.next_action), NEXT_ACTION_PLAN_OPTIONS[0]);
  ensureLeadFormSelectValue("activity_purpose", normalizeActivityPurpose(lead.activity_purpose), ACTIVITY_PURPOSE_OPTIONS[0]);
  leadCompanyInputKey = leadCompanyOnlyKey(lead.company_name);
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
      const origin = leadOriginForCurrentUser(lead, state.currentUser);
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
          ${leadActionPlanMarkup(lead, true)}
          <div class="kanban-card-meta">
            <span class="chip ${leadOriginChipClass(origin)}">${escapeHtml(origin)}</span>
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
      openLeadDrawer(card.dataset.kanbanLead);
    });
    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openLeadDrawer(card.dataset.kanbanLead);
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
  const salesmen = analyticsSalesmen().filter(person => salesmanName(person) !== "Unassigned");
  els.salesmenSummary.textContent = `${salesmen.length} ${salesmen.length === 1 ? "salesman" : "salespeople"}`;
  els.salesmenGrid.innerHTML = salesmen.map(person => {
    const name = typeof person === "string" ? person : person.name;
    const owned = state.leads.filter(lead => leadMatchesSalesman(lead, person)).sort(compareLeadRecentFirst);
    const value = owned.reduce((sum, lead) => sum + Number(lead.estimated_value || 0), 0);
    const overdue = owned.filter(isOverdue).length;
    const hot = owned.filter(lead => lead.priority === "Hot").length;
    const territory = (typeof person === "string" ? "" : person.territory) || "Territory not set";
    return `
      <article class="salesman-card">
        <div class="salesman-card-head">
          <div>
          <h2>${escapeHtml(name)}</h2>
            <p>${escapeHtml(territory)}</p>
          </div>
          <button class="ghost-button salesman-open-button" type="button" data-open-salesman-leads="${escapeHtml(name)}">View Leads</button>
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
  els.salesmenGrid.querySelectorAll("[data-open-salesman-leads]").forEach(button => {
    button.addEventListener("click", () => {
      openSalesmanLeadsViewer(button.dataset.openSalesmanLeads);
    });
  });
}

function salesmanByViewerName(name) {
  return analyticsSalesmen().find(person => salesmanName(person) === name) || null;
}

function renderSalesmanLeadsViewer() {
  if (!els.salesmanLeadsList || !els.salesmanLeadsTitle || !els.salesmanLeadsSummary || !els.salesmanLeadsSubtitle) return;
  const viewer = state.salesmanLeadsViewer;
  if (!viewer) {
    els.salesmanLeadsTitle.textContent = "Salesman leads";
    els.salesmanLeadsSubtitle.textContent = "Most recent leads";
    els.salesmanLeadsSummary.innerHTML = "";
    els.salesmanLeadsList.innerHTML = `<p class="empty-copy">No salesman selected.</p>`;
    return;
  }
  const person = salesmanByViewerName(viewer.name) || viewer.person;
  const leads = state.leads.filter(lead => leadMatchesSalesman(lead, person)).sort(compareLeadRecentFirst);
  const value = leads.reduce((sum, lead) => sum + Number(lead.estimated_value || 0), 0);
  const overdue = leads.filter(isOverdue).length;
  const hot = leads.filter(lead => lead.priority === "Hot").length;
  els.salesmanLeadsTitle.textContent = viewer.name;
  els.salesmanLeadsSubtitle.textContent = `${leads.length} ${leads.length === 1 ? "lead" : "leads"} - most recent first`;
  els.salesmanLeadsSummary.innerHTML = `
    <span><strong>${leads.length}</strong> companies</span>
    <span><strong>${money.format(value)}</strong> open value</span>
    <span><strong>${hot}</strong> hot</span>
    <span><strong>${overdue}</strong> overdue</span>
  `;
  els.salesmanLeadsList.innerHTML = leads.map(lead => {
    const plan = leadActionPlanState(lead);
    const recent = leadRecentTimestamp(lead);
    const recentLabel = recent ? formatDisplayDate(String(recent).slice(0, 10)) : "No recent activity";
    return `
      <button class="salesman-lead-row" type="button" data-salesman-view-lead="${escapeHtml(lead.id)}">
        <div class="salesman-lead-copy">
          <strong>${escapeHtml(lead.company_name || "Unnamed company")}</strong>
          <p>${escapeHtml(plan.action || lead.stage || "No task set")}</p>
          <small>${escapeHtml(recentLabel)}</small>
        </div>
        <div class="salesman-lead-meta">
          <span class="chip ${priorityClass(lead.stage)}">${escapeHtml(lead.stage || "Prospect")}</span>
          <span class="chip ${plan.chipClass}">${escapeHtml(plan.dueLabel)}</span>
        </div>
      </button>
    `;
  }).join("") || `<div class="timeline-empty"><strong>No leads found for this salesman.</strong><span>There are no assigned or generated leads to review yet.</span></div>`;
  els.salesmanLeadsList.querySelectorAll("[data-salesman-view-lead]").forEach(button => {
    button.addEventListener("click", () => {
      state.selectedId = button.dataset.salesmanViewLead;
      closeSalesmanLeadsViewer();
      openLeadDrawer(button.dataset.salesmanViewLead);
      render();
    });
  });
}

function openSalesmanLeadsViewer(name) {
  state.salesmanLeadsViewer = { name, person: salesmanByViewerName(name) };
  renderSalesmanLeadsViewer();
  els.salesmanLeadsDialog?.showModal();
}

function closeSalesmanLeadsViewer() {
  els.salesmanLeadsDialog?.close();
}

function renderActionPlanPanel() {
  if (!els.actionPlanPanel || !els.actionPlanList || !els.actionPlanSummary) return;
  const admin = state.currentUser?.role === "admin";
  els.actionPlanPanel.classList.toggle("hidden", !admin);
  if (!admin) return;
  const groups = analyticsSalesmen()
    .filter(person => salesmanName(person) !== "Unassigned")
    .map(person => {
      const leads = state.leads.filter(lead => leadMatchesSalesman(lead, person)).sort(compareNewestLeadFirst);
      return {
        person,
        name: salesmanName(person),
        leads,
        overdue: leads.filter(lead => leadActionPlanState(lead).chipClass === "hot").length
      };
    })
    .filter(group => group.leads.length);
  const totalLeads = groups.reduce((sum, group) => sum + group.leads.length, 0);
  els.actionPlanSummary.textContent = `${totalLeads} lead${totalLeads === 1 ? "" : "s"} tracked`;
  els.actionPlanList.innerHTML = groups.map(group => `
    <article class="salesman-plan-card">
      <div class="salesman-plan-head">
        <div>
          <h3>${escapeHtml(group.name)}</h3>
          <p>${escapeHtml((group.person.territory || "").trim() || "Territory not set")} | ${group.leads.length} registered lead${group.leads.length === 1 ? "" : "s"} | ${group.overdue} overdue</p>
        </div>
        <div class="salesman-plan-head-meta">
          ${group.leads.length > 10 ? `<span class="chip plan-soon">Latest 10 visible</span>` : ""}
          <span class="chip ${group.overdue ? "hot" : "plan-upcoming"}">${group.overdue ? `${group.overdue} overdue` : "On track"}</span>
        </div>
      </div>
      <div class="salesman-plan-table-wrap">
        <table class="salesman-plan-table">
          <thead>
            <tr>
              <th>Lead Registration Date</th>
              <th>Lead Name</th>
              <th>Next Action Plan Date</th>
              <th>Purpose of Activity</th>
              <th>Action Plan</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${group.leads.map(lead => {
              const plan = leadActionPlanState(lead);
              return `
                <tr class="salesman-plan-row" data-action-plan-lead="${escapeHtml(lead.id)}" tabindex="0" role="button" aria-label="Open ${escapeHtml(lead.company_name || "lead")}">
                  <td data-label="Lead Registration Date">${escapeHtml(formatPlanDate(leadRegistrationDate(lead)) || "Not recorded")}</td>
                  <td data-label="Lead Name">
                    <strong>${escapeHtml(lead.company_name || "Unnamed company")}</strong>
                    <span class="salesman-plan-row-meta">${escapeHtml(stageDisplayLabel(lead.stage))}</span>
                  </td>
                  <td data-label="Next Action Plan Date">${escapeHtml(formatPlanDate(lead.next_action_date) || "Not set")}</td>
                  <td data-label="Purpose of Activity">${escapeHtml(normalizeActivityPurpose(lead.activity_purpose))}</td>
                  <td data-label="Action Plan">${escapeHtml(plan.action)}</td>
                  <td data-label="Status"><span class="chip ${plan.chipClass}">${escapeHtml(plan.dueLabel)}</span></td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    </article>
  `).join("") || `<p class="empty-copy">No registered leads available for action-plan tracking yet.</p>`;
  els.actionPlanList.querySelectorAll("[data-action-plan-lead]").forEach(row => {
    const openLead = () => {
      state.selectedId = row.dataset.actionPlanLead;
      openLeadDrawer(row.dataset.actionPlanLead);
      render();
    };
    row.addEventListener("click", openLead);
    row.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openLead();
      }
    });
  });
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
  if (els.activityTypeSelect) {
    els.activityTypeSelect.innerHTML = [`<option value="all">All types</option>`].concat(
      allActivityTypes().map(type => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`)
    ).join("");
    els.activityTypeSelect.value = selectedActivityType();
  }
  if (els.activityTypeShortcutChips) {
    els.activityTypeShortcutChips.innerHTML = allActivityTypes().map(type => `
      <button class="type-pill ${selectedActivityType() === type ? "active" : ""}" type="button" data-activity-shortcut="${escapeHtml(type)}">${escapeHtml(type)}</button>
    `).join("");
  }
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

function formatPlanDate(dateValue) {
  const value = String(dateValue || "").slice(0, 10);
  if (!value) return "";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-AE", { month: "short", day: "numeric" });
}

function leadRegistrationDate(lead) {
  return String(lead?.created_at || lead?.imported_at || "").slice(0, 10);
}

function compareNewestLeadFirst(a, b) {
  const aDate = leadRegistrationDate(a) || "";
  const bDate = leadRegistrationDate(b) || "";
  return String(bDate).localeCompare(String(aDate))
    || String(b.created_at || b.imported_at || "").localeCompare(String(a.created_at || a.imported_at || ""))
    || String(a.company_name || "").localeCompare(String(b.company_name || ""));
}

function leadRecentTimestamp(lead) {
  return String(
    lead?.updated_at
    || lead?.stage_updated_at
    || lead?.last_activity
    || lead?.created_at
    || lead?.imported_at
    || ""
  );
}

function compareLeadRecentFirst(a, b) {
  return leadRecentTimestamp(b).localeCompare(leadRecentTimestamp(a))
    || compareNewestLeadFirst(a, b);
}

function leadActionPlanState(lead) {
  const rawAction = String(lead?.next_action || "").trim();
  const action = rawAction ? normalizeNextActionPlan(rawAction) : "";
  const dueDate = String(lead?.next_action_date || "").slice(0, 10);
  if (!action && !dueDate) {
    return { action: "Next action plan not set", dueDate: "", dueLabel: "Plan needed", chipClass: "plan-missing", overdue: false };
  }
  if (!dueDate) {
    return { action: action || "Next action plan not set", dueDate: "", dueLabel: "Due date not set", chipClass: "plan-missing", overdue: false };
  }
  const days = daysUntil(dueDate);
  if (days < 0) {
    return { action: action || "Follow up with customer", dueDate, dueLabel: daysOverdueLabel(dueDate), chipClass: "hot", overdue: true };
  }
  if (days === 0) {
    return { action: action || "Follow up with customer", dueDate, dueLabel: "Due today", chipClass: "warm", overdue: false };
  }
  if (days <= 3) {
    return { action: action || "Follow up with customer", dueDate, dueLabel: `Due in ${days} day${days === 1 ? "" : "s"}`, chipClass: "plan-soon", overdue: false };
  }
  return { action: action || "Follow up with customer", dueDate, dueLabel: `Due ${formatPlanDate(dueDate)}`, chipClass: "plan-upcoming", overdue: false };
}

function leadActionPlanMarkup(lead, compact = false) {
  const plan = leadActionPlanState(lead);
  return `
    <div class="next-action-block ${compact ? "compact" : ""}">
      <span class="next-action-label">Next Action</span>
      <strong class="next-action-text ${plan.overdue ? "overdue" : ""}">${escapeHtml(plan.action)}</strong>
      <div class="next-action-meta">
        <span class="chip ${plan.chipClass}">${escapeHtml(plan.dueLabel)}</span>
        ${plan.dueDate ? `<span>${escapeHtml(formatPlanDate(plan.dueDate))}</span>` : ""}
      </div>
    </div>
  `;
}

function compareLeadPlans(a, b) {
  const rank = lead => {
    const chipClass = leadActionPlanState(lead).chipClass;
    if (chipClass === "hot") return 0;
    if (chipClass === "warm") return 1;
    if (chipClass === "plan-soon") return 2;
    if (chipClass === "plan-upcoming") return 3;
    return 4;
  };
  return rank(a) - rank(b)
    || String(a.next_action_date || "9999-12-31").localeCompare(String(b.next_action_date || "9999-12-31"))
    || String(a.company_name || "").localeCompare(String(b.company_name || ""));
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
    <article class="reminder-card ${overdue ? "overdue" : "upcoming"}" data-reminder-lead="${escapeHtml(reminder.lead_id)}" tabindex="0">
      <div>
        <strong>${escapeHtml(compact ? reminder.company_name : reminder.company_name)}</strong>
        <p>${escapeHtml(compact ? (reminder.activity_required || reminder.text || "Follow up with customer") : (reminder.activity_required || reminder.text || "Follow up with customer"))}</p>
        <span class="meta-label">${escapeHtml(due ? `${formatDisplayDate(reminder.due_date)}${reminder.due_time ? ` · ${reminder.due_time}` : ""}` : (reminder.reminder_type || "Reminder"))}</span>
      </div>
      ${calendarUrl ? `<a class="calendar-link icon-only" href="${escapeHtml(calendarUrl)}" target="_blank" rel="noopener" aria-label="Add reminder to Google Calendar" title="Add reminder to Google Calendar">📅</a>` : ""}
    </article>
  `;
}

function renderActivityReminders(upcoming, overdue) {
  if (!els.activityReminders) return;
  els.activityReminders.innerHTML = `
    <div class="reminder-stack">
      <div class="reminder-stack-header">
        <span>Upcoming</span>
        <em class="count-chip upcoming">${upcoming.length}</em>
      </div>
      <div class="reminder-grid compact">${upcoming.map(reminder => reminderCard(reminder, { compact: true })).join("") || `<p class="empty-copy">No upcoming reminders.</p>`}</div>
    </div>
    <div class="reminder-divider"></div>
    <div class="reminder-stack">
      <div class="reminder-stack-header">
        <span>Overdue</span>
        <em class="count-chip overdue">${overdue.length}</em>
      </div>
      <div class="reminder-grid compact">${overdue.map(reminder => reminderCard(reminder, { compact: true })).join("") || `<p class="empty-copy">No overdue reminders.</p>`}</div>
    </div>
  `;
}

function renderActivityQuickLinks() {
  if (!els.activityQuickLinks) return;
  const tasks = allReminders().length;
  const activePipeline = state.leads.filter(lead => !["ACTIVE", "DORMANT"].includes(String(lead.stage || "").toUpperCase())).length;
  const quotes = state.leads.filter(lead =>
    Boolean(lead.quotation_ref)
    || String(lead.activity_purpose || "").toLowerCase().includes("quotation")
    || String(lead.stage || "").toUpperCase() === "SAMPLING"
  ).length;
  const accounts = state.leads.length;
  const links = [
    { label: "Tasks", icon: "✓", count: tasks, tone: tasks > 0 ? "danger" : "neutral", view: "activity", text: `${tasks} open` },
    { label: "Pipeline", icon: "⎇", count: activePipeline, tone: "success", view: "pipeline", text: `${activePipeline} active` },
    { label: "Quotes", icon: "Q", count: quotes, tone: quotes > 0 ? "warning" : "neutral", view: "pipeline", text: `${quotes} pending` },
    { label: "Accounts", icon: "A", count: accounts, tone: "neutral", view: "pipeline", text: `${accounts} total` }
  ];
  els.activityQuickLinks.innerHTML = links.map(link => `
    <button class="activity-quick-link" type="button" data-activity-quick-view="${escapeHtml(link.view)}">
      <span class="activity-quick-link-copy"><i>${escapeHtml(link.icon)}</i><strong>${escapeHtml(link.label)}</strong></span>
      <span class="count-chip ${escapeHtml(link.tone)}">${escapeHtml(link.text)}</span>
    </button>
  `).join("");
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
  if (diff > 1 && diff <= 7) return `${diff} days ago`;
  return formatDisplayDate(date);
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
  const from = state.activityFilters.dateFrom ? formatDisplayDate(state.activityFilters.dateFrom) : "Any date";
  const to = state.activityFilters.dateTo ? formatDisplayDate(state.activityFilters.dateTo) : "Any date";
  return `Showing ${activities.length} activit${activities.length === 1 ? "y" : "ies"} · ${uniqueSalesmen.size} ${uniqueSalesmen.size === 1 ? "salesman" : "salespeople"} · ${from} to ${to}`;
}

function activityCardMarkup(activity) {
  const type = activity.type || "Note";
  const note = activity.note || activity.text || "No note added.";
  const admin = state.currentUser?.role === "admin" || state.currentUser?.role === "manager";
  const isReminder = String(type).toLowerCase() === "reminder";
  const dueDate = activity.reminder_due_date || activity.due_date || "";
  const reminderOverdue = isReminder && dueDate && dueDate.slice(0, 10) < today() && activity.reminder_status !== "completed";
  const statusLabel = isReminder
    ? activity.reminder_status || (reminderOverdue ? "Overdue" : "Scheduled")
    : activity.stage || "Prospect";
  const statusClass = isReminder ? (reminderOverdue ? "hot" : "plan-upcoming") : priorityClass(activity.stage);
  const actionLabel = isReminder ? `${statusLabel}${dueDate ? ` · ${formatDisplayDate(dueDate)}` : ""}` : formatDisplayDate(activityDisplayDate(activity));
  const timeLabel = activityDisplayTime(activity);
  return `
    <article class="activity-feed-item timeline-card ${activityTypeClass(type)}" data-activity-lead="${escapeHtml(activity.lead_id)}" tabindex="0">
      <div class="activity-feed-head">
        <span class="activity-type-icon" aria-hidden="true">${escapeHtml(activityIconGlyph(type))}</span>
        <div class="activity-feed-body">
          <strong>${escapeHtml(activity.company_name)}</strong>
          <p class="activity-note clamp" data-expand-note>${escapeHtml(note)}</p>
          ${admin ? `<span class="meta-label">Salesman: ${escapeHtml(activity.salesman_name || activity.assigned_salesman || "Unassigned")}</span>` : ""}
        </div>
      </div>
      <div class="activity-feed-footer">
        <div class="chip-row">
          <span class="chip">${escapeHtml(actionLabel)}</span>
          ${timeLabel ? `<span class="chip">${escapeHtml(timeLabel)}</span>` : ""}
          <span class="chip ${statusClass}">${escapeHtml(statusLabel)}</span>
          <span class="chip">${escapeHtml(type)}</span>
          ${activity.quotation_ref ? `<button class="quote-ref-pill" type="button" data-quotation-ref="${escapeHtml(activity.quotation_ref)}">Quote ${escapeHtml(activity.quotation_ref)}</button>` : ""}
        </div>
        <div class="activity-footer-actions">
          ${activityEditButton(activity.lead_id, activity.activity_index, activity)}
          ${activityDeleteButton(activity.lead_id, activity.activity_index, activity)}
        </div>
      </div>
      ${activity.delete_request ? `<span class="request-status ${escapeHtml(activity.request_status || "pending")}">Review request ${escapeHtml(activity.request_status || "pending")}</span>` : ""}
      ${activity.correction ? `<span class="meta-label">Correction for ${escapeHtml(activity.target_activity_summary || "previous activity")}</span>` : ""}
      ${activity.edited_at ? `<span class="meta-label">Legacy edited entry ${escapeHtml(String(activity.edited_at).slice(0, 10))}</span>` : ""}
      ${activityAudioMarkup(activity)}
      ${activityTranscriptMarkup(activity)}
    </article>
  `;
}

function weekStart(dateValue = today()) {
  const date = dateOnly(dateValue);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}

function weekDays(dateValue = state.activityWeekAnchor || today()) {
  const start = weekStart(dateValue);
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index);
    return {
      date: isoDateFromDate(date),
      day: date.toLocaleDateString("en-US", { weekday: "short" }),
      number: date.getDate()
    };
  });
}

function calendarHourForTime(timeValue, fallbackIndex = 0) {
  const match = String(timeValue || "").match(/^(\d{1,2})/);
  const hour = match ? Number(match[1]) : 9 + (fallbackIndex % 8);
  return Math.min(17, Math.max(9, hour));
}

function activityWeeklyItems(activities, anchorDate = state.activityWeekAnchor || today()) {
  const days = weekDays(anchorDate);
  const dayIndex = new Map(days.map((day, index) => [day.date, index]));
  const activityItems = activities
    .filter(activity => dayIndex.has(activityDisplayDate(activity)))
    .map((activity, index) => {
      const date = activityDisplayDate(activity);
      const time = activityDisplayTime(activity) || `${String(9 + (index % 8)).padStart(2, "0")}:00`;
      return {
        leadId: activity.lead_id,
        date,
        time,
        type: activity.type || "Note",
        title: activity.note || activity.text || activity.company_name || "Activity logged",
        company: activity.company_name || "Unnamed account",
        dayIndex: dayIndex.get(date),
        hour: calendarHourForTime(time, index),
        offset: index % 3
      };
    });
  const reminderItems = allReminders()
    .filter(reminder => dayIndex.has(String(reminder.due_date || "").slice(0, 10)))
    .map((reminder, index) => {
      const date = String(reminder.due_date || "").slice(0, 10);
      const time = reminder.due_time || "09:00";
      return {
        leadId: reminder.lead_id,
        date,
        time,
        type: "Reminder",
        title: reminder.activity_required || reminder.text || reminder.reminder_type || "Follow-up reminder",
        company: reminder.company_name || "Unnamed account",
        dayIndex: dayIndex.get(date),
        hour: calendarHourForTime(time, index),
        offset: index % 3
      };
    });
  return [...activityItems, ...reminderItems]
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
}

function renderWeeklyActivityLog(activities) {
  if (!els.activityWeeklyLog) return;
  const days = weekDays(state.activityWeekAnchor);
  const hours = Array.from({ length: 9 }, (_, index) => 9 + index);
  const items = activityWeeklyItems(activities, state.activityWeekAnchor);
  els.activityWeeklyLog.innerHTML = `
    <div class="calendar-legend">
      <span><i class="legend-swatch overdue"></i>Overdue</span>
      <span><i class="legend-swatch upcoming"></i>Upcoming</span>
      <span><i class="legend-swatch neutral"></i>Neutral</span>
    </div>
    <div class="weekly-calendar" style="--hour-count: ${hours.length}">
      <div class="calendar-corner-spacer" aria-hidden="true"></div>
      ${days.map(day => `
        <div class="calendar-day-head ${day.date === today() ? "today" : ""}">
          <strong>${escapeHtml(day.day)}</strong>
          <span>${escapeHtml(day.number)}</span>
        </div>
      `).join("")}
      ${hours.map(hour => `
        <div class="calendar-time">${String(hour).padStart(2, "0")}.00</div>
        ${days.map(() => `<div class="calendar-slot"></div>`).join("")}
      `).join("")}
      ${items.map(item => `
        <button
          type="button"
          class="calendar-event ${activityTypeClass(item.type)}"
          data-calendar-lead="${escapeHtml(item.leadId)}"
          style="grid-column: ${item.dayIndex + 2}; grid-row: ${item.hour - 7}; --event-offset: ${item.offset};"
          title="${escapeHtml(`${item.company}: ${item.title}`)}"
        >
          <span>${escapeHtml(item.title)}</span>
        </button>
      `).join("")}
      ${items.length ? "" : `<p class="calendar-empty">No activity scheduled this week.</p>`}
    </div>
  `;
  if (els.activityWeekRange) els.activityWeekRange.textContent = weekRangeLabel(state.activityWeekAnchor);
  if (els.activityKpiWeek) els.activityKpiWeek.textContent = String(items.length);
  if (els.activityKpiWeekMeta) els.activityKpiWeekMeta.textContent = items.length ? "Items scheduled in this week view" : "No scheduled items in this week view";
  els.activityWeeklyLog.querySelectorAll("[data-calendar-lead]").forEach(button => {
    button.addEventListener("click", () => {
      state.selectedId = button.dataset.calendarLead;
      openLeadDrawer(state.selectedId, "activities");
    });
  });
}

function renderActivityView() {
  const activities = state.activities || [];
  els.activitySummary.textContent = `${activities.length} activit${activities.length === 1 ? "y" : "ies"}`;
  renderActivityFilters();
  const upcoming = allReminders().filter(reminder => !reminder.due_date || reminder.due_date >= today()).slice(0, 8);
  const overdue = allReminders().filter(reminder => reminder.due_date && reminder.due_date < today()).slice(0, 6);
  renderActivityReminders(upcoming, overdue);
  renderActivityQuickLinks();
  els.activityLoading.classList.toggle("hidden", !state.activityLoading);
  els.activityResultsSummary.textContent = activitySummaryText(activities);
  renderWeeklyActivityLog(activities);
  if (els.activityKpiActivities) els.activityKpiActivities.textContent = String(activities.length);
  if (els.activityKpiActivitiesMeta) {
    els.activityKpiActivitiesMeta.textContent = state.activityFilters.preset
      ? `${state.activityFilters.preset} filter applied`
      : "Filtered activity count";
  }
  if (els.activityKpiOverdue) els.activityKpiOverdue.textContent = String(overdue.length);
  if (els.activityKpiUpcoming) els.activityKpiUpcoming.textContent = String(upcoming.length);
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
  els.activityFeed.innerHTML = state.activityLoading ? "" : (timelineHtml || emptyHtml);

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
  els.activityQuickLinks?.querySelectorAll("[data-activity-quick-view]").forEach(button => {
    button.addEventListener("click", () => setView(button.dataset.activityQuickView || "dashboard"));
  });
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
      ${autoEnrichmentBanner(lead)}
      ${autoEnrichmentReviewPanel(lead)}

      <div class="ai-actions">
        <button class="ghost-button" data-ai-action="prepare" type="button">Prepare Me For This Meeting</button>
        <button class="ghost-button" data-ai-action="next" type="button">What Should I Do Next?</button>
        <button class="ghost-button" data-ai-action="email" type="button">Draft Follow-Up Email</button>
        <button class="ghost-button" data-ai-action="summary" type="button">Summarise Relationship</button>
        <button class="ghost-button danger" data-ai-action="flag" type="button">Flag Needs Attention</button>
      </div>
      ${(lead.activities || []).length ? "" : `<p class="ai-tip">Tip: log activities and PMRs to get richer AI briefs.</p>`}

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
        <div class="meta-box"><span class="meta-label">Estimated scale</span><span class="meta-value">${escapeHtml(lead.estimated_scale || "Not added")}</span></div>
        <div class="meta-box"><span class="meta-label">Annual revenue</span><span class="meta-value">${escapeHtml(lead.estimated_annual_revenue || "Not added")}</span></div>
        <div class="meta-box"><span class="meta-label">Certifications</span><span class="meta-value">${escapeHtml(autoValue(lead.certifications) || "Not added")}</span></div>
        <div class="meta-box"><span class="meta-label">Likely products</span><span class="meta-value">${escapeHtml(autoValue(lead.steel_products_likely_needed) || "Not added")}</span></div>
        <div class="meta-box"><span class="meta-label">Likely competitors</span><span class="meta-value">${escapeHtml(autoValue(lead.competitors_likely_using) || "Not added")}</span></div>
        <div class="meta-box"><span class="meta-label">Tags</span><span class="meta-value">${escapeHtml(lead.tags || "Not added")}</span></div>
        <div class="meta-box"><span class="meta-label">Estimated value</span><span class="meta-value">${money.format(lead.estimated_value || 0)}</span></div>
        <div class="meta-box"><span class="meta-label">Activity purpose</span><span class="meta-value">${escapeHtml(normalizeActivityPurpose(lead.activity_purpose) || "Not added")}</span></div>
        <div class="meta-box"><span class="meta-label">Next action</span><span class="meta-value">${escapeHtml(lead.next_action ? normalizeNextActionPlan(lead.next_action) : "")}</span></div>
        <div class="meta-box"><span class="meta-label">Due date</span><span class="meta-value">${escapeHtml(lead.next_action_date)}</span></div>
        <div class="meta-box"><span class="meta-label">Products/services remarks</span><span class="meta-value">${escapeHtml(lead.products_services_remarks || "Not added")}</span></div>
      </div>

      <div class="detail-actions">
        <button class="ghost-button" id="enrichLead" type="button">Enrich with Hunter</button>
        <button class="ghost-button" id="manualReenrichLead" type="button">Re-enrich Company</button>
        <button class="ghost-button" id="openPmrForm" type="button">File PMR</button>
        <button class="ghost-button danger" id="deleteLead" type="button">${state.currentUser?.role === "admin" ? "Delete Lead" : "Request Delete Lead"}</button>
        <span class="form-message" id="detailMessage" aria-live="polite"></span>
      </div>
      ${linkedinControls(lead)}

      ${deleteRequestPanel(lead)}

      <div class="stage-actions">
        <select id="detailStage">${stageOptions}</select>
        <button class="primary-button" id="saveStage">Update Stage</button>
      </div>

      <div class="quick-note">
        <input id="activityText" placeholder="Log a call, visit, email, or follow-up note">
        <div class="activity-quote-row">
          <input id="activityQuotationRef" placeholder="Optional quotation ref">
          <span class="quote-ref-status" id="activityQuotationStatus" aria-live="polite"></span>
        </div>
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
    button.addEventListener("click", () => {
      if (button.dataset.aiAction === "flag") {
        openFlagAttentionModal(lead);
        return;
      }
      runLeadAiAction(lead, button.dataset.aiAction);
    });
  });

  document.querySelector("#saveActivity").addEventListener("click", async () => {
    const input = document.querySelector("#activityText");
    const reminderDate = document.querySelector("#activityReminderDate");
    const reminderTime = document.querySelector("#activityReminderTime");
    const quotationRef = document.querySelector("#activityQuotationRef");
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
    if (quotationRef?.value?.trim()) {
      body.quotation_ref = quotationRef.value.trim();
      body.quotation_status = "validated";
    }
    body.id = body.id || clientId("act");
    try {
      if (!navigator.onLine) throw new Error("offline");
      await api(`/api/leads/${lead.id}/activities`, {
        method: "POST",
        body: JSON.stringify(body)
      });
      setToast("Activity logged.", "success");
    } catch (error) {
      if (!isNetworkFailure(error) && error.message !== "offline") {
        setToast(error.message, "error");
        return;
      }
      await queueActivityForSync(lead.id, body);
      setToast("Activity saved offline and will sync when online.", "success");
    }
    input.value = "";
    if (quotationRef) quotationRef.value = "";
    const quotationStatus = document.querySelector("#activityQuotationStatus");
    if (quotationStatus) {
      quotationStatus.textContent = "";
      quotationStatus.className = "quote-ref-status";
    }
    reminderDate.value = "";
    reminderTime.value = "09:00";
    await loadLeads();
  });

  document.querySelector("#activityQuotationRef")?.addEventListener("input", event => {
    validateQuotationInput(event.currentTarget, document.querySelector("#activityQuotationStatus"));
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

  els.detailPanel.querySelector("#manualReenrichLead")?.addEventListener("click", async () => {
    const message = document.querySelector("#detailMessage");
    setMessage(message, "Refreshing company intelligence...");
    try {
      const updated = await api(`/api/leads/${lead.id}/auto-enrichment/retry`, { method: "POST" });
      Object.assign(lead, updated);
      setMessage(message, "Company intelligence refreshed. Review before confirming.", "success");
      await loadLeads();
    } catch {
      setMessage(message, "Auto-enrichment unavailable - add details manually.", "error");
    }
  });

  els.detailPanel.querySelectorAll("[data-confirm-auto-enrichment]").forEach(button => {
    button.addEventListener("click", async () => {
      const message = document.querySelector("#detailMessage");
      setMessage(message, "Confirming auto-enrichment...");
      try {
        const updated = await api(`/api/leads/${button.dataset.confirmAutoEnrichment}/auto-enrichment/confirm`, { method: "POST" });
        Object.assign(lead, updated);
        setMessage(message, "Auto-enrichment confirmed.", "success");
        await loadLeads();
      } catch (error) {
        setMessage(message, error.message, "error");
      }
    });
  });

  els.detailPanel.querySelectorAll("[data-reenrich-lead]").forEach(button => {
    button.addEventListener("click", () => els.detailPanel.querySelector("#manualReenrichLead")?.click());
  });

  els.detailPanel.querySelectorAll("[data-drawer-edit-lead]").forEach(button => {
    button.addEventListener("click", () => openLeadEdit(button.dataset.drawerEditLead));
  });

  els.detailPanel.querySelector("[data-linkedin-search]")?.addEventListener("click", async buttonEvent => {
    const button = buttonEvent.currentTarget;
    const title = els.detailPanel.querySelector(`[data-linkedin-title="${CSS.escape(button.dataset.linkedinSearch)}"]`)?.value || "";
    try {
      const result = await api(`/api/linkedin/search-url?company=${encodeURIComponent(lead.company_name)}&title=${encodeURIComponent(title)}`);
      window.open(result.url, "_blank", "noopener");
    } catch {
      window.open(`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${lead.company_name} ${title || "Procurement Manager"}`)}`, "_blank", "noopener");
    }
  });

  document.querySelector("#openPmrForm").addEventListener("click", () => {
    openPmrForLead(lead.id);
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
  renderPipelineFunnel();
  renderSidebarIdentity();
  renderTopbar();
  renderDashboardView();
  renderLeadList();
  renderKanbanView();
  renderDetail();
  renderLeadDrawer();
  renderSalesmenView();
  renderSalesmanLeadsViewer();
  renderActivityView();
  renderPipelineFilterNotice();
  loadActivityAudioSources();
  applyView();
  syncDashboardCollapsibles();
  renderSyncStatus();
}

function applyView() {
  if (state.currentUser?.role !== "admin" && currentView === "salesmen") {
    currentView = "dashboard";
  }
  const isDashboard = currentView === "dashboard";
  const isPipeline = currentView === "pipeline";
  const isActivity = currentView === "activity";
  const isLead = currentView === "lead";
  const isKanban = state.pipelineViewMode === "kanban";
  els.metricsShell?.classList.toggle("hidden", !(isDashboard || isPipeline));
  els.dashboardView.classList.toggle("hidden", !isDashboard);
  els.pipelineFunnelPanel?.classList.toggle("hidden", !isPipeline);
  els.pipelineToolbar.classList.toggle("hidden", !isPipeline);
  els.pipelineView.classList.toggle("hidden", !isPipeline);
  els.pipelineView?.classList.toggle("kanban-mode", isPipeline && isKanban);
  els.pipelineView?.classList.toggle("detail-routed", isPipeline);
  els.pipelineListPanel?.classList.toggle("hidden", isKanban);
  els.kanbanPanel?.classList.toggle("hidden", !isKanban);
  els.detailPanel?.classList.toggle("hidden", true);
  els.leadDetailView?.classList.toggle("hidden", !isLead);
  els.salesmenView.classList.toggle("hidden", currentView !== "salesmen");
  els.activityView.classList.toggle("hidden", currentView !== "activity");
  document.querySelectorAll("[data-pipeline-mode]").forEach(button => {
    button.classList.toggle("active", button.dataset.pipelineMode === state.pipelineViewMode);
  });
  document.querySelectorAll(".nav-item").forEach(item => {
    item.classList.toggle("active", item.dataset.view === currentView && !item.dataset.mobileAction);
  });
  els.syncStatusPill?.classList.toggle("activity-hidden", isActivity);
  document.body.classList.toggle("activity-mode", isActivity);
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
  if (view !== "lead") state.lastNonLeadView = view;
  currentView = view;
  state.leadDrawerOpen = view === "lead";
  syncBrowserRoute({ replace: false });
  closeMobileMenu();
  render();
}

async function loadLeads() {
  state.leadsLoading = true;
  if (currentView === "pipeline") renderPipelineFunnel();
  try {
    state.leads = await api("/api/leads");
    state.leadsLoaded = true;
    await mergePendingActivitiesIntoState();
    if (!state.leads.some(lead => lead.id === state.selectedId)) {
      if (currentView === "lead") {
        state.selectedId = null;
      } else {
        state.selectedId = state.leads[0]?.id || null;
      }
    }
    if (currentView !== "lead" && !state.selectedId) {
      state.selectedId = state.leads[0]?.id || null;
    }
    await fetchActivities();
    await fetchAttentionFlags();
    await fetchMarketIntel();
    render();
    if (currentView === "lead" && state.selectedId) {
      loadLeadDetailData(state.selectedId);
    }
  } finally {
    state.leadsLoading = false;
  }
}

async function loadIntegrationStatus() {
  try {
    state.integrations = await api("/api/integrations/status");
  } catch {
    state.integrations = { linkedin_titles: [], agent_examples: [], configuration_agent_examples: [], ai_agent: false };
  }
}

async function fetchMarketIntel() {
  try {
    state.marketIntel = await api("/api/market-intelligence");
  } catch {
    state.marketIntel = { items: [], heat_map: [], disabled: true };
  }
}

async function fetchAttentionFlags() {
  try {
    state.attentionFlags = state.currentUser?.role === "admin"
      ? await api("/api/attention-flags?status=open")
      : [];
  } catch {
    state.attentionFlags = [];
  }
}

async function fetchSalesmanAccounts() {
  try {
    state.userAccounts = state.currentUser?.role === "admin"
      ? await api("/api/users")
      : [];
  } catch {
    state.userAccounts = [];
  }
}

function showLogin(message = "") {
  state.currentUser = null;
  state.userAccounts = [];
  state.leadsLoaded = false;
  state.leadsLoading = false;
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
  els.installBanner?.classList.add("hidden");
  els.updateBanner?.classList.add("hidden");
  els.syncStatusPill?.classList.add("hidden");
}

function configureRoleUi(user) {
  const admin = user.role === "admin";
  document.querySelectorAll('.sidebar [data-view="salesmen"]').forEach(item => {
    item.classList.toggle("hidden", !admin);
  });
  els.salesmanFilter?.closest("label")?.classList.toggle("hidden", !admin);
  els.formSalesman?.closest("label")?.classList.toggle("hidden", !admin);
  els.openSalesmanForm.classList.toggle("hidden", !admin);
  els.exportLeadsExcel?.classList.toggle("hidden", !admin);
  els.exportLeadsPdf?.classList.toggle("hidden", !admin);
  els.openImportLeads?.classList.toggle("hidden", !admin);
  els.performancePanel?.classList.toggle("hidden", !admin);
  els.adminTaskPanel?.classList.toggle("hidden", !admin);
  els.needsAttentionPanel?.classList.toggle("hidden", !admin);
  els.dashboardPipelineFunnelPanel?.classList.toggle("hidden", !admin);
  els.dailyAiPanel?.classList.toggle("hidden", admin);
  els.salesmanFollowupPanel?.classList.toggle("hidden", admin);
  els.portfolioPanel?.classList.toggle("hidden", admin);
  els.relationshipFocusPanel?.classList.toggle("hidden", !admin);
  els.pipelineHealthPanel?.classList.toggle("hidden", !admin);
  els.configAgentPanel?.classList.toggle("hidden", !admin);
  renderHeaderSummary();
  renderConfigAgentPanel();
  if (!admin) {
    state.filters.salesman = "all";
    if (currentView === "salesmen") currentView = "dashboard";
  }
}

function showApp(user) {
  state.currentUser = user;
  applyRouteState(window.history.state || parseAppRoute(), { keepReturnView: true });
  els.signedInUser.textContent = `${user.name} · ${user.role}`;
  configureRoleUi(user);
  els.authScreen.classList.add("hidden");
  els.appShell.classList.remove("hidden");
  maybeShowInstallBanner();
  refreshSyncState();
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
  await loadIntegrationStatus();
  state.settings = await api("/api/settings");
  await fetchSalesmanAccounts();
  fillSelect(els.stageFilter, state.settings.stages, "All stages");
  fillSelect(els.priorityFilter, state.settings.priorities || [], "All priorities");
  fillSelect(els.territoryFilter, [...new Set([...(state.settings.territories || []), "UAE", "Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah", "Umm Al Quwain"])], "All territories");
  fillSelect(els.performanceStageFilter, state.settings.stages, "All Stages");
  els.performanceStageFilter.value = state.performanceStage;
  fillSelect(els.marketSnapshotSalesmanFilter, state.settings.salesmen || [], "All salesmen");
  if (els.marketSnapshotSalesmanFilter) els.marketSnapshotSalesmanFilter.value = state.marketSnapshotSalesman || "all";
  fillSelect(els.portfolioStageFilter, state.settings.stages, "All Stages");
  els.portfolioReportView.value = state.portfolioFilters.reportView;
  els.portfolioStageFilter.value = state.portfolioFilters.stage;
  els.portfolioCountryFilter.value = state.portfolioFilters.country;
  els.portfolioEmirateFilter.value = state.portfolioFilters.emirate;
  fillSelect(els.salesmanFilter, state.settings.salesmen, "All salesmen");
  fillSelect(els.formSalesman, state.settings.salesmen);
  if (!isAdminOrManager()) {
    els.formSalesman.value = state.currentUser.name;
  }
  fillSelect(els.formStage, state.settings.stages);
  fillSelect(els.formPriority, state.settings.priorities);
  fillSelect(els.formSector, state.settings.sectors || []);
  fillSelect(els.formTier, state.settings.tiers || []);
  fillSelect(els.formTerritory, state.settings.territories || []);
  if (!isAdminOrManager() && els.formTerritory) {
    els.formTerritory.value = state.currentUser.territory || els.formTerritory.value;
  }
  fillSelect(els.salesmanTerritory, state.settings.territories || []);
  fillSelect(document.querySelector("#pmrHeat"), state.settings.pmr?.heat || ["1", "2", "3", "4", "5"]);
  fillSelect(document.querySelector("#pmrOrderTiming"), state.settings.pmr?.firstOrderTiming || []);
  fillSelect(document.querySelector("#pmrPotentialValue"), state.settings.pmr?.potentialValue || []);
  fillSelect(document.querySelector("#pmrDirectorAction"), state.settings.pmr?.directorAction || []);
  fillSelect(document.querySelector("#pmrAccountStatus"), state.settings.pmr?.accountStatus || []);
  els.leadForm.elements.next_action_date.value = today();
  await loadConfigurationAgentState();
  await loadLeads();
  maybeAutoRunDailyPipeline();
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

window.addEventListener("popstate", event => {
  applyRouteState(event.state || parseAppRoute(), { keepReturnView: true });
  render();
  if (currentView === "lead" && state.selectedId) {
    loadLeadDetailData(state.selectedId);
  }
});

els.searchInput.addEventListener("input", event => {
  state.importedAfter = "";
  state.filters.search = event.target.value;
  render();
});

els.stageFilter.addEventListener("change", event => {
  state.importedAfter = "";
  state.filters.stage = event.target.value;
  render();
});

els.performanceStageFilter?.addEventListener("change", event => {
  state.performanceStage = event.target.value;
  renderPerformanceAnalytics();
});

els.marketSnapshotSalesmanFilter?.addEventListener("change", event => {
  state.marketSnapshotSalesman = event.target.value;
  renderMarketSnapshotPanel();
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
  state.importedAfter = "";
  state.filters.salesman = event.target.value;
  render();
});

els.priorityFilter?.addEventListener("change", event => {
  state.importedAfter = "";
  state.filters.priority = event.target.value;
  render();
});

els.territoryFilter?.addEventListener("change", event => {
  state.importedAfter = "";
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

els.activityTypeSelect?.addEventListener("change", event => {
  setSelectedActivityType(event.target.value);
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
els.closeSalesmanLeads?.addEventListener("click", closeSalesmanLeadsViewer);
els.salesmanLeadsDialog?.addEventListener("close", () => {
  state.salesmanLeadsViewer = null;
});
els.activityTypeShortcutChips?.addEventListener("click", event => {
  const button = event.target.closest("[data-activity-shortcut]");
  if (!button) return;
  const type = button.dataset.activityShortcut;
  setSelectedActivityType(selectedActivityType() === type ? "all" : type);
});
els.activityPrevWeek?.addEventListener("click", () => {
  state.activityWeekAnchor = isoDateFromDate(addDays(dateOnly(state.activityWeekAnchor), -7));
  renderActivityView();
  renderTopbar();
});
els.activityNextWeek?.addEventListener("click", () => {
  state.activityWeekAnchor = isoDateFromDate(addDays(dateOnly(state.activityWeekAnchor), 7));
  renderActivityView();
  renderTopbar();
});
els.leadDrawerBackdrop?.addEventListener("click", closeLeadDrawer);
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && state.leadDrawerOpen) closeLeadDrawer();
});

document.addEventListener("click", async event => {
  const quoteButton = event.target.closest("[data-quotation-ref]");
  if (!quoteButton) return;
  event.preventDefault();
  event.stopPropagation();
  const ref = quoteButton.dataset.quotationRef;
  try {
    const result = await api("/api/erp/validate-quotation", {
      method: "POST",
      body: JSON.stringify({ ref })
    });
    window.alert(result.data
      ? JSON.stringify(result.data, null, 2)
      : `Quotation ${ref}: ${result.valid ? "valid reference. ERP details are not connected yet." : result.error || "not valid."}`);
  } catch (error) {
    window.alert(error.message);
  }
});

document.querySelector("#openLeadForm").addEventListener("click", () => {
  resetLeadFormForNewLead();
  els.leadDialog.showModal();
});
document.querySelector("#closeLeadForm").addEventListener("click", () => {
  state.editingLeadId = "";
  state.editingOriginalStage = "";
  state.editingLostData = null;
  resetLeadEnrichmentSession();
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
        clearLeadAutoEnrichmentFields();
        applyLeadEnrichment(place, { overwrite: true });
        leadCompanyInputKey = leadCompanyOnlyKey(els.leadForm.elements.company_name.value);
        leadEnrichmentKey = leadEnrichmentRequestKey(
          els.leadForm.elements.company_name.value,
          els.leadForm.elements.location.value || els.leadForm.elements.territory.value
        );
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
  setMessage(els.activityEditMessage, "Appending correction...");
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
    setMessage(els.activityEditMessage, "Correction appended. Original activity was not changed.", "success");
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

document.querySelectorAll("[data-quick-view]").forEach(button => {
  button.addEventListener("click", () => {
    setView(button.dataset.quickView || "dashboard");
  });
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
els.closeMobileSidebar?.addEventListener("click", closeMobileMenu);
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

els.refreshMarketIntel?.addEventListener("click", async () => {
  try {
    els.refreshMarketIntel.textContent = "Refreshing...";
    const result = await api("/api/market-intelligence/fetch", { method: "POST" });
    await fetchMarketIntel();
    renderMarketIntelPanel();
    setToast(result.disabled ? "Market intelligence source is not configured yet." : `Imported ${result.imported} intel item(s).`, result.disabled ? "" : "success");
  } catch (error) {
    setToast(error.message, "error");
  } finally {
    els.refreshMarketIntel.textContent = "Refresh Intel";
  }
});

async function submitAgentPrompt() {
  const prompt = els.agentPrompt?.value.trim() || "";
  if (!prompt || state.agentLoading) return;
  state.agentLoading = true;
  let finalMessage = "";
  let finalType = "";
  if (els.agentAnswer) {
    els.agentAnswer.classList.add("hidden");
    els.agentAnswer.textContent = "";
  }
  setMessage(els.agentMessage, "Thinking against visible CRM records...");
  renderAgentPanel();
  try {
    const result = await api("/api/agent/query", {
      method: "POST",
      body: JSON.stringify({ prompt })
    });
    if (els.agentAnswer) {
      els.agentAnswer.textContent = result.answer || "No answer returned.";
      els.agentAnswer.classList.remove("hidden");
    }
    finalMessage = `Read-only answer. Tools used: ${(result.tools_used || []).join(", ") || "none"}.`;
    finalType = "success";
  } catch (error) {
    finalMessage = error.message || "Query failed. Please try again.";
    finalType = "error";
  } finally {
    state.agentLoading = false;
    renderAgentPanel();
    if (finalMessage) setMessage(els.agentMessage, finalMessage, finalType);
  }
}

els.agentToggle?.addEventListener("click", () => {
  state.agentOpen = !state.agentOpen;
  renderAgentPanel();
});

els.agentAsk?.addEventListener("click", submitAgentPrompt);
els.agentPrompt?.addEventListener("keydown", event => {
  if (event.key === "Enter") submitAgentPrompt();
});
els.agentExamples?.addEventListener("click", event => {
  const button = event.target.closest("[data-agent-example]");
  if (!button || !els.agentPrompt) return;
  els.agentPrompt.value = button.dataset.agentExample || "";
  els.agentPrompt.focus();
});

els.configAgentPropose?.addEventListener("click", proposeConfigChange);
els.configAgentApply?.addEventListener("click", applyConfigProposal);
els.configAgentPrompt?.addEventListener("keydown", event => {
  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) proposeConfigChange();
});
els.configAgentExamples?.addEventListener("click", event => {
  const button = event.target.closest("[data-config-agent-example]");
  if (!button || !els.configAgentPrompt) return;
  els.configAgentPrompt.value = button.dataset.configAgentExample || "";
  els.configAgentPrompt.focus();
});

document.querySelector("#closeAiActionDialog")?.addEventListener("click", () => els.aiActionDialog?.close());
els.aiActionFooter?.addEventListener("click", async event => {
  const button = event.target.closest("button");
  if (!button) return;
  try {
    if (button.matches("[data-ai-regenerate]")) {
      if (state.aiAction.scope === "salesperson") await runSalespersonAiAction(state.aiAction.action);
      else await runLeadAiAction(aiLead(), state.aiAction.action);
    } else if (button.matches("[data-ai-copy]")) {
      await copyText(state.aiAction.output, "AI result copied.");
    } else if (button.matches("[data-ai-save-activity]")) {
      await saveAiOutputToActivity();
    } else if (button.matches("[data-ai-set-next]")) {
      await setAiOutputAsNextAction();
    } else if (button.matches("[data-ai-mailto]")) {
      openAiMail();
    } else if (button.matches("[data-ai-save-notes]")) {
      await saveAiOutputToNotes();
    }
  } catch (error) {
    setMessage(els.aiActionMessage, error.message, "error");
  }
});

els.aiActionResult?.addEventListener("click", event => {
  const shortcutButton = event.target.closest("[data-salesperson-ai-action]");
  if (shortcutButton) {
    runSalespersonAiAction(shortcutButton.dataset.salespersonAiAction);
    return;
  }
  const companyButton = event.target.closest("[data-ai-company]");
  if (!companyButton) return;
  state.selectedId = companyButton.dataset.aiCompany;
  els.aiActionDialog?.close();
  openLeadDrawer(state.selectedId);
  render();
});

els.dailyAiPanel?.addEventListener("click", event => {
  const button = event.target.closest("[data-salesperson-ai-action]");
  if (!button) {
    if (event.target.closest("#dailyAiSummary")) {
      runSalespersonAiAction("pipeline_health");
    }
    return;
  }
  runSalespersonAiAction(button.dataset.salespersonAiAction);
});

els.syncStatusPill?.addEventListener("click", openPendingChanges);
els.closePendingChanges?.addEventListener("click", () => els.pendingChangesDialog?.close());
els.syncNowButton?.addEventListener("click", () => syncOutbox());
els.closeQuickLog?.addEventListener("click", () => els.quickLogDialog?.close());
els.closeMobileMap?.addEventListener("click", () => els.mobileMapDialog?.close());

els.quickLogCompanySearch?.addEventListener("input", renderQuickLogSheet);
els.quickLogLeadSelect?.addEventListener("change", event => {
  state.quickLog.leadId = event.target.value;
});
els.quickLogTypes?.addEventListener("click", event => {
  const button = event.target.closest("[data-quick-type]");
  if (button) setQuickLogType(button.dataset.quickType);
});
els.quickLogRecent?.addEventListener("click", event => {
  const button = event.target.closest("[data-quick-lead]");
  if (!button) return;
  state.quickLog.leadId = button.dataset.quickLead;
  renderQuickLogSheet();
});
els.quickLogNear?.addEventListener("click", event => {
  const button = event.target.closest("[data-quick-lead]");
  if (!button) return;
  state.quickLog.leadId = button.dataset.quickLead;
  renderQuickLogSheet();
});
els.quickPhraseChips?.addEventListener("click", event => {
  const button = event.target.closest("[data-quick-phrase]");
  if (button) appendQuickPhrase(button.dataset.quickPhrase);
});
els.quickLogForm?.querySelectorAll("[data-quick-date]").forEach(button => {
  button.addEventListener("click", () => setQuickDate(button.dataset.quickDate));
});
els.quickLogForm?.addEventListener("submit", event => {
  event.preventDefault();
  saveQuickLog();
});
els.mobileMapList?.addEventListener("click", event => {
  const button = event.target.closest("[data-map-log]");
  if (!button) return;
  els.mobileMapDialog?.close();
  openQuickLog(button.dataset.mapLog);
});

document.querySelector("#closeFlagAttention")?.addEventListener("click", () => els.flagAttentionDialog?.close());
document.querySelector("#cancelFlagAttention")?.addEventListener("click", () => els.flagAttentionDialog?.close());
els.flagAttentionForm?.addEventListener("submit", async event => {
  event.preventDefault();
  const companyId = els.flagAttentionForm.elements.company_id.value;
  const reason = els.flagAttentionForm.elements.reason.value.trim();
  setMessage(els.flagAttentionMessage, "Flagging for director attention...");
  try {
    await api(`/api/leads/${encodeURIComponent(companyId)}/attention-flags`, {
      method: "POST",
      body: JSON.stringify({ reason })
    });
    els.flagAttentionDialog.close();
    setToast("Flagged - directors will be notified.", "success");
    await loadLeads();
  } catch (error) {
    setMessage(els.flagAttentionMessage, error.message, "error");
  }
});

els.openImportLeads?.addEventListener("click", () => {
  if (state.currentUser?.role !== "admin") return;
  state.importLeads = newImportState();
  renderImportLeadsModal();
  els.importLeadsDialog?.showModal();
});

els.closeImportLeads?.addEventListener("click", () => els.importLeadsDialog?.close());

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

els.leadForm.elements.company_name.addEventListener("input", handleLeadCompanyNameInput);
els.leadForm.elements.location.addEventListener("input", handleLeadLocationInput);

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
      if (
        existing
        && isAdminOrManager()
        && String(payload.assigned_salesman || "").trim() !== String(existing.assigned_salesman || "").trim()
      ) {
        const note = await promptHandoff(existing, payload.assigned_salesman);
        if (!note) {
          els.leadForm.elements.assigned_salesman.value = existing.assigned_salesman || els.leadForm.elements.assigned_salesman.value;
          return;
        }
        payload.handoff_note = note;
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
      const isFromAnotherSalesman = duplicate.owner_type === "other_salesman";
      const ownerName = duplicate.owner_name || duplicate.assigned_salesman || "another account";
      const proceed = window.confirm(
        `Possible duplicate found: ${duplicate.company_name}. It appears to be linked to ${ownerName}.${isFromAnotherSalesman ? " It is linked to another salesman. " : " "}Do you still want to create a separate lead?`
      );
      if (!proceed) return;
      lead = await api("/api/leads", { method: "POST", body: JSON.stringify({ ...payload, allow_duplicate: true }) });
    } else {
      setEnrichmentStatus(error.message, "error");
      return;
    }
  }
  state.selectedId = lead.id;
  resetLeadFormForNewLead();
  els.leadDialog.close();
  await loadLeads();
  openLeadDrawer(lead.id, "overview");
});

function pmrPayloadFromForm() {
  return Object.fromEntries(new FormData(els.pmrForm).entries());
}

function applyOptimisticPmr(leadId, payload, hasVoiceNote = false) {
  const optimistic = {
    ...payload,
    id: payload.id || clientId("pmr"),
    company_id: leadId,
    pending_sync: true,
    voice_note_pending_upload: hasVoiceNote && !payload.voice_note_id
  };
  if (state.leadDrawerOpen && state.selectedId === leadId) {
    state.leadDrawerPmrs = [optimistic, ...(state.leadDrawerPmrs || [])];
  }
  render();
}

async function queuePmrForSync(leadId, payload) {
  const voicePending = Boolean(pmrVoiceBlob && !payload.voice_note_id);
  const queuedPayload = { ...payload };
  if (voicePending) {
    queuedPayload.voice_note_mime_type = queuedPayload.voice_note_mime_type || pmrVoiceBlob.type || "audio/webm";
    queuedPayload.voice_note_size_bytes = queuedPayload.voice_note_size_bytes || String(pmrVoiceBlob.size || "");
  }
  await putOutboxItem({
    id: clientId("pmr"),
    created_at: Date.now(),
    kind: "pmr",
    lead_id: leadId,
    payload: queuedPayload,
    voice_note_blob: voicePending ? pmrVoiceBlob : null,
    voice_note_mime_type: voicePending ? (pmrVoiceBlob.type || "audio/webm") : "",
    voice_note_size_bytes: voicePending ? pmrVoiceBlob.size : 0,
    status: "pending",
    attempts: 0,
    last_error: null
  });
  applyOptimisticPmr(leadId, queuedPayload, voicePending);
}

els.pmrForm.addEventListener("submit", async event => {
  event.preventDefault();
  const companyId = els.pmrForm.elements.company_id.value;
  if (!companyId) return;
  els.pmrMessage.textContent = "Saving PMR...";
  let payload = pmrPayloadFromForm();
  try {
    if (!navigator.onLine) throw new Error("offline");
    if (pmrVoiceBlob && !els.pmrForm.elements.voice_note_id.value) {
      els.pmrMessage.textContent = "Uploading PMR voice note...";
      await uploadPmrVoiceNote();
      els.pmrMessage.textContent = "Saving PMR...";
      payload = pmrPayloadFromForm();
    }
    await api(`/api/leads/${companyId}/pmrs`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    els.pmrMessage.textContent = "PMR saved.";
    resetPmrVoiceNote();
    els.pmrDialog.close();
    await loadLeads();
    if (state.leadDrawerOpen) openLeadDrawer(companyId, "pmr");
  } catch (error) {
    payload = pmrPayloadFromForm();
    if (isNetworkFailure(error) || error.message === "offline") {
      await queuePmrForSync(companyId, payload);
      els.pmrMessage.textContent = "PMR saved offline. It will sync with the voice note when online.";
      resetPmrVoiceNote();
      els.pmrDialog.close();
      if (state.leadDrawerOpen) renderLeadDrawer();
      return;
    }
    setMessage(els.pmrMessage, error.message, "error");
  }
});

document.querySelectorAll(".nav-item").forEach(item => {
  item.addEventListener("click", () => {
    if (item.dataset.mobileAction === "quick-log") {
      openQuickLog();
      return;
    }
    if (item.dataset.mobileAction === "map") {
      openMobileMap();
      return;
    }
    if (item.dataset.mobileAction === "alerts") {
      openPendingChanges();
      return;
    }
    setView(item.dataset.view || "dashboard");
  });
});

initPwaShell();
initDashboardCollapsibles();
setInterval(() => {
  if (state.sync.pending) syncOutbox();
}, 60_000);

init().catch(error => {
  document.body.innerHTML = `<main class="empty-state"><strong>Could not load ARG CRM</strong><span>${escapeHtml(error.message)}</span></main>`;
});
