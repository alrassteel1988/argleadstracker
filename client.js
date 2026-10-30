const ACTIVITY_FILTER_KEY = "arg_activity_filters";
const OVERDUE_BANNER_KEY = "arg_overdue_banner_dismissed";
const DASHBOARD_MARKET_NEWS_KEY = "arg_dashboard_market_news_open";
const DASHBOARD_PERFORMANCE_KEY = "arg_dashboard_performance_open";
const DASHBOARD_AGENT_KEY = "arg_dashboard_agent_open";
const DASHBOARD_TOOLS_KEY = "arg_dashboard_tools_open";
const PWA_VISIT_KEY = "arg_pwa_visit_count";
const PWA_INSTALL_DISMISSED_KEY = "arg_pwa_install_dismissed_until";
const LEAD_AI_SUMMARY_CACHE_KEY = "arg_lead_ai_summary_cache_v1";
const OUTBOX_DB_NAME = "arg_leads_pwa_outbox";
const OUTBOX_STORE = "outbox";
const SMART_SEARCH_DEBOUNCE_MS = 220;
const SUMMARY_DETAILS_DEFAULT_PAGE_SIZE = 10;
const SUMMARY_DETAILS_PAGE_SIZES = [10, 20, 50];
const ACTIVITY_PRESETS = ["Today", "This Week", "This Month", "Last 30 Days", "Last 90 Days"];
const QUICK_LOG_TYPES = ["Phone Call", "Email", "In-Person Meeting", "Site Visit", "Video Call", "Quotation Sent", "Order Placed"];
const QUICK_PHRASES = ["Discussed pricing", "Requested quotation", "Sample feedback", "Follow-up agreed", "Met procurement"];
const WEEKLY_LIKELIHOOD_OPTIONS = ["Low chance", "Could happen", "Good chance", "Almost certain"];
const WEEKLY_TIMING_OPTIONS = ["This week", "Next week", "2 weeks", "3 weeks", "4 weeks"];
const WEEKLY_PROBLEM_OPTIONS = ["Overdue payment", "Credit limit pressure", "No recent activity", "Price pressure", "Competitor risk", "Project delay", "Documentation issue", "Other"];
const WEEKLY_ASSESSMENT_OPTIONS = ["Managed", "Watch closely", "Could go either way", "Getting worse"];
const WEEKLY_DEMAND_OPTIONS = ["Much slower", "Slightly slower", "Same", "Slightly busier", "Much busier"];
const WEEKLY_FOUR_BAND_OPTIONS = ["None", "Occasional", "Frequent", "Severe"];
const WEEKLY_GOVERNMENT_OPTIONS = ["No change", "Delayed", "Speeding up"];
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
  pipelineTable: {
    nextAction: "all",
    overdue: "all",
    dueDate: "",
    dateFrom: "",
    dateTo: "",
    sortKey: "daysOverdue",
    sortDirection: "desc",
    page: 1,
    pageSize: 10
  },
  importedAfter: "",
  overduePipelineOnly: false,
  dueTodayPipelineOnly: false,
  performanceStage: "all",
  salesmenDirectory: {
    search: "",
    territory: "all",
    status: "all",
    sort: "assigned-desc",
    view: "list",
    page: 1,
    pageSize: 10
  },
  marketSnapshotSalesman: "all",
  marketSnapshotTab: "location",
  salesmanLeadsViewer: null,
  actionPlanCollapsed: {},
  portfolioFilters: { reportView: "stage", stage: "all", country: "all", emirate: "all" },
  kanbanStage: localStorage.getItem("arg_kanban_stage") || "NEW",
  draggedLeadId: "",
  importLeads: null,
  activities: [],
  activityLoading: false,
  activityPage: 1,
  activityPageSize: 10,
  activityFiltersOpen: false,
  activityFilters: loadActivityFilters(),
  activityWeekAnchor: today(),
  activityCalendarMinimized: false,
  weeklyReports: {
    loading: false,
    actionPending: false,
    current: null,
    history: [],
    review: [],
    missing: [],
    selectedId: "",
    selectedReport: null,
    weekEnding: "",
    storageMode: ""
  },
  leadFormStep: 0,
  leadFormDetailsOpen: { company: false, contact: false, followup: false },
  leadDrawerOpen: false,
  leadDrawerTab: "overview",
  leadDrawerLoading: false,
  leadDrawerPmrs: [],
  leadDrawerIntel: [],
  leadIntelligenceMissingPdfUrls: new Set(),
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
  agentOpen: localStorage.getItem(DASHBOARD_AGENT_KEY) === "true",
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
  marketNews: { items: [], disabled: false, loading: false, error: "", reason: "", fetched_at: "" },
  dashboardMarketNewsOpen: localStorage.getItem(DASHBOARD_MARKET_NEWS_KEY) === "true",
  dashboardPerformanceOpen: localStorage.getItem(DASHBOARD_PERFORMANCE_KEY) === "true",
  dashboardToolsOpen: localStorage.getItem(DASHBOARD_TOOLS_KEY) === "true",
  smartSearch: { query: "", results: [], open: false, expanded: false, searching: false },
  editingLeadId: "",
  editingOriginalStage: "",
  editingLostData: null,
  lostReasonRequest: null,
  currentUser: null,
  leadsLoaded: false,
  leadsLoading: false,
  leadsError: "",
  summaryCardDetails: {
    type: "",
    search: "",
    filters: {},
    sortKey: "",
    sortDirection: "asc",
    page: 1,
    pageSize: SUMMARY_DETAILS_DEFAULT_PAGE_SIZE,
    trigger: null
  }
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
let smartSearchTimer = null;

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
  sidebarToolsMenu: document.querySelector("#sidebarToolsMenu"),
  sidebarSearchPlaces: document.querySelector("#sidebarSearchPlaces"),
  sidebarUserName: document.querySelector("#sidebarUserName"),
  sidebarUserRole: document.querySelector("#sidebarUserRole"),
  sidebarUserAvatar: document.querySelector("#sidebarUserAvatar"),
  topbarPageTitle: document.querySelector("#topbarPageTitle"),
  topbarContext: document.querySelector("#topbarContext"),
  syncStatusPill: document.querySelector("#syncStatusPill"),
  smartSearchShell: document.querySelector("#smartSearchShell"),
  smartSearchInput: document.querySelector("#smartSearchInput"),
  smartSearchPanel: document.querySelector("#smartSearchPanel"),
  mobileTabs: document.querySelector("#mobileTabs"),
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
  exportLeadsExcelTop: document.querySelector("#exportLeadsExcelTop"),
  exportLeadsPdfTop: document.querySelector("#exportLeadsPdfTop"),
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
  clearPipelineFilters: document.querySelector("#clearPipelineFilters"),
  refreshPipelineLeads: document.querySelector("#refreshPipelineLeads"),
  pipelineReportTools: document.querySelector("#pipelineReportTools"),
  pipelineReportDateFrom: document.querySelector("#pipelineReportDateFrom"),
  pipelineReportDateTo: document.querySelector("#pipelineReportDateTo"),
  exportPipelineExcel: document.querySelector("#exportPipelineExcel"),
  exportPipelinePdf: document.querySelector("#exportPipelinePdf"),
  pipelineListStatus: document.querySelector("#pipelineListStatus"),
  pipelinePagination: document.querySelector("#pipelinePagination"),
  searchInput: document.querySelector("#searchInput"),
  stageFilter: document.querySelector("#stageFilter"),
  salesmanFilter: document.querySelector("#salesmanFilter"),
  priorityFilter: document.querySelector("#priorityFilter"),
  territoryFilter: document.querySelector("#territoryFilter"),
  metricTotal: document.querySelector("#metricTotal"),
  metricTotalSub: document.querySelector("#metricTotalSub"),
  metricValue: document.querySelector("#metricValue"),
  metricValueSub: document.querySelector("#metricValueSub"),
  metricHot: document.querySelector("#metricHot"),
  metricDue: document.querySelector("#metricDue"),
  metricDueSub: document.querySelector("#metricDueSub"),
  quickTaskBadge: document.querySelector("#quickTaskBadge"),
  greetingLabel: document.querySelector("#greetingLabel"),
  dashboardUserName: document.querySelector("#dashboardUserName"),
  dashboardSubline: document.querySelector("#dashboardSubline"),
  metricsShell: document.querySelector("#metricsShell"),
  sharedDashboardTopSlot: document.querySelector("#sharedDashboardTopSlot"),
  adminDashboardOverviewSlot: document.querySelector("#adminDashboardOverviewSlot"),
  adminDashboardWorkRow: document.querySelector("#adminDashboardWorkRow"),
  adminDashboardTriageRow: document.querySelector("#adminDashboardTriageRow"),
  adminDashboardAnalyticsRow: document.querySelector("#adminDashboardAnalyticsRow"),
  adminDashboardBottomRow: document.querySelector("#adminDashboardBottomRow"),
  metricsPanel: document.querySelector("#metricsPanel"),
  summaryCardDetailsDialog: document.querySelector("#summaryCardDetailsDialog"),
  summaryCardDetailsShell: document.querySelector("#summaryCardDetailsShell"),
  summaryCardDetailsTitle: document.querySelector("#summaryCardDetailsTitle"),
  summaryCardDetailsDescription: document.querySelector("#summaryCardDetailsDescription"),
  summaryCardDetailsCount: document.querySelector("#summaryCardDetailsCount"),
  summaryCardDetailsFilters: document.querySelector("#summaryCardDetailsFilters"),
  summaryCardDetailsStatus: document.querySelector("#summaryCardDetailsStatus"),
  summaryCardDetailsTableWrap: document.querySelector("#summaryCardDetailsTableWrap"),
  summaryCardDetailsPagination: document.querySelector("#summaryCardDetailsPagination"),
  closeSummaryCardDetails: document.querySelector("#closeSummaryCardDetails"),
  dashboardView: document.querySelector("#dashboardView"),
  salesmanSimplifiedDashboard: document.querySelector("#salesmanSimplifiedDashboard"),
  salesmanSimplifiedGreeting: document.querySelector("#salesmanSimplifiedGreeting"),
  salesmanSimplifiedAddLead: document.querySelector("#salesmanSimplifiedAddLead"),
  salesmanSimplifiedMetrics: document.querySelector("#salesmanSimplifiedMetrics"),
  salesmanSimplifiedActions: document.querySelector("#salesmanSimplifiedActions"),
  salesmanSimplifiedQueueMeta: document.querySelector("#salesmanSimplifiedQueueMeta"),
  salesmanSimplifiedQueue: document.querySelector("#salesmanSimplifiedQueue"),
  salesmanSimplifiedViewAll: document.querySelector("#salesmanSimplifiedViewAll"),
  salesmanSimplifiedFirstTouch: document.querySelector("#salesmanSimplifiedFirstTouch"),
  salesmanSimplifiedLossPrompts: document.querySelector("#salesmanSimplifiedLossPrompts"),
  salesmanSimplifiedPipeline: document.querySelector("#salesmanSimplifiedPipeline"),
  salesmanDashboardLeadCount: document.querySelector("#salesmanDashboardLeadCount"),
  salesmanDashboardLeadList: document.querySelector("#salesmanDashboardLeadList"),
  dashboardQuickActions: document.querySelector("#dashboardQuickActions"),
  dashboardFirstTouchList: document.querySelector("#dashboardFirstTouchList"),
  dashboardQuickLogActivity: document.querySelector("#dashboardQuickLogActivity"),
  dashboardQuickPipeline: document.querySelector("#dashboardQuickPipeline"),
  dashboardOpenFullBriefing: document.querySelector("#dashboardOpenFullBriefing"),
  dashboardTogglePerformance: document.querySelector("#dashboardTogglePerformance"),
  dashboardToggleMarketNews: document.querySelector("#dashboardToggleMarketNews"),
  dashboardToggleAgent: document.querySelector("#dashboardToggleAgent"),
  salesmanDashboardToggleShell: document.querySelector("#salesmanDashboardToggleShell"),
  dashboardToggleTools: document.querySelector("#dashboardToggleTools"),
  dailyAiPanel: document.querySelector("#dailyAiPanel"),
  dailyAiGreeting: document.querySelector("#dailyAiGreeting"),
  dailyAiActions: document.querySelector("#dailyAiActions"),
  dailyAiSummary: document.querySelector("#dailyAiSummary"),
  salesmanLossPromptPanel: document.querySelector("#salesmanLossPromptPanel"),
  salesmanLossPromptList: document.querySelector("#salesmanLossPromptList"),
  marketNewsPanel: document.querySelector("#marketNewsPanel"),
  marketNewsMeta: document.querySelector("#marketNewsMeta"),
  marketNewsFeed: document.querySelector("#marketNewsFeed"),
  salesmanFollowupPanel: document.querySelector("#salesmanFollowupPanel"),
  salesmanFollowupGroups: document.querySelector("#salesmanFollowupGroups"),
  portfolioPanel: document.querySelector("#portfolioPanel"),
  salesmanDashboardToolsPanel: document.querySelector("#salesmanDashboardToolsPanel"),
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
  salesmenSummaryChart: document.querySelector("#salesmenSummaryChart"),
  salesmenSummaryLegend: document.querySelector("#salesmenSummaryLegend"),
  salesmenConversionRate: document.querySelector("#salesmenConversionRate"),
  salesmenMetricTotal: document.querySelector("#salesmenMetricTotal"),
  salesmenMetricTerritories: document.querySelector("#salesmenMetricTerritories"),
  salesmenMetricTerritoriesMeta: document.querySelector("#salesmenMetricTerritoriesMeta"),
  salesmenMetricOverdue: document.querySelector("#salesmenMetricOverdue"),
  salesmenMetricOpenLeads: document.querySelector("#salesmenMetricOpenLeads"),
  salesmenSearch: document.querySelector("#salesmenSearch"),
  salesmenTerritoryFilter: document.querySelector("#salesmenTerritoryFilter"),
  salesmenStatusFilter: document.querySelector("#salesmenStatusFilter"),
  salesmenSort: document.querySelector("#salesmenSort"),
  applySalesmenFilters: document.querySelector("#applySalesmenFilters"),
  clearSalesmenFilters: document.querySelector("#clearSalesmenFilters"),
  exportSalesmenDirectory: document.querySelector("#exportSalesmenDirectory"),
  salesmenDirectoryStatus: document.querySelector("#salesmenDirectoryStatus"),
  salesmenDirectoryPagination: document.querySelector("#salesmenDirectoryPagination"),
  performanceTable: document.querySelector("#performanceTable"),
  performanceFeed: document.querySelector("#performanceFeed"),
  marketSnapshotPanel: document.querySelector("#marketSnapshotPanel"),
  marketSnapshotSalesmanFilter: document.querySelector("#marketSnapshotSalesmanFilter"),
  marketLocationBars: document.querySelector("#marketLocationBars"),
  marketSectorBars: document.querySelector("#marketSectorBars"),
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
  dashboardActivityPanel: document.querySelector("#dashboardActivityPanel"),
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
  pipelineWorkspace: document.querySelector("#pipelineWorkspace"),
  pipelineFunnelPanel: document.querySelector("#pipelineFunnelPanel"),
  pipelineFunnelBadge: document.querySelector("#pipelineFunnelBadge"),
  pipelineFunnelBody: document.querySelector("#pipelineFunnelBody"),
  pipelineFunnelSummaryStrip: document.querySelector("#pipelineFunnelSummaryStrip"),
  pipelineFunnelSummaryDonut: document.querySelector("#pipelineFunnelSummaryDonut"),
  pipelineFunnelSummaryTotal: document.querySelector("#pipelineFunnelSummaryTotal"),
  pipelineFunnelSummaryAssigned: document.querySelector("#pipelineFunnelSummaryAssigned"),
  pipelineFunnelSummaryContacted: document.querySelector("#pipelineFunnelSummaryContacted"),
  pipelineFunnelSummaryWon: document.querySelector("#pipelineFunnelSummaryWon"),
  pipelineFunnelExpand: document.querySelector("#pipelineFunnelExpand"),
  pipelineFunnelCollapse: document.querySelector("#pipelineFunnelCollapse"),
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
  tasksView: document.querySelector("#tasksView"),
  tasksViewTitle: document.querySelector("#tasksViewTitle"),
  tasksViewSubtitle: document.querySelector("#tasksViewSubtitle"),
  tasksWeekLabel: document.querySelector("#tasksWeekLabel"),
  tasksStatusBadge: document.querySelector("#tasksStatusBadge"),
  tasksMessage: document.querySelector("#tasksMessage"),
  tasksPrimary: document.querySelector("#tasksPrimary"),
  tasksSidebar: document.querySelector("#tasksSidebar"),
  salesmanLeadsDialog: document.querySelector("#salesmanLeadsDialog"),
  salesmanLeadsTitle: document.querySelector("#salesmanLeadsTitle"),
  salesmanLeadsSubtitle: document.querySelector("#salesmanLeadsSubtitle"),
  salesmanLeadsSummary: document.querySelector("#salesmanLeadsSummary"),
  salesmanLeadsList: document.querySelector("#salesmanLeadsList"),
  closeSalesmanLeads: document.querySelector("#closeSalesmanLeads"),
  activityView: document.querySelector("#activityView"),
  activityFeed: document.querySelector("#activityFeed"),
  activityWeeklyLog: document.querySelector("#activityWeeklyLog"),
  activityCalendarToggle: document.querySelector("#activityCalendarToggle"),
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
  leadStepper: document.querySelector("#leadStepper"),
  leadStepBack: document.querySelector("#leadStepBack"),
  leadStepNext: document.querySelector("#leadStepNext"),
  leadSubmitButton: document.querySelector("#leadSubmitButton"),
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
  activityDialog: document.querySelector("#activityDialog"),
  activityForm: document.querySelector("#activityForm"),
  activityDialogTitle: document.querySelector("#activityDialogTitle"),
  activityLeadName: document.querySelector("#activityLeadName"),
  activityLeadPickerWrap: document.querySelector("#activityLeadPickerWrap"),
  activityLeadPicker: document.querySelector("#activityLeadPicker"),
  activityNextActionPlan: document.querySelector("#activityNextActionPlan"),
  activityNextActionDate: document.querySelector("#activityNextActionDate"),
  activityPurpose: document.querySelector("#activityPurpose"),
  activityNotes: document.querySelector("#activityNotes"),
  activityRecordVoice: document.querySelector("#activityRecordVoice"),
  activityVoiceControls: document.querySelector("#activityVoiceControls"),
  activityPauseVoice: document.querySelector("#activityPauseVoice"),
  activityStopVoice: document.querySelector("#activityStopVoice"),
  activityCancelVoice: document.querySelector("#activityCancelVoice"),
  activityVoiceStatus: document.querySelector("#activityVoiceStatus"),
  activityVoiceElapsed: document.querySelector("#activityVoiceElapsed"),
  activityMessage: document.querySelector("#activityMessage"),
  closeActivityDialog: document.querySelector("#closeActivityDialog"),
  cancelActivityDialog: document.querySelector("#cancelActivityDialog"),
  saveActivity: document.querySelector("#saveActivity"),
  activityAttachmentInput: document.querySelector("#activityAttachmentInput"),
  activityDropZone: document.querySelector("#activityDropZone"),
  activityAttachmentList: document.querySelector("#activityAttachmentList"),
  openActivityCreate: document.querySelector("#openActivityCreate"),
  openActivityDeletionQueue: document.querySelector("#openActivityDeletionQueue"),
  activityDetailsDialog: document.querySelector("#activityDetailsDialog"),
  activityDetailsTitle: document.querySelector("#activityDetailsTitle"),
  activityDetailsBody: document.querySelector("#activityDetailsBody"),
  editActivityFromDetails: document.querySelector("#editActivityFromDetails"),
  requestActivityDeletionFromDetails: document.querySelector("#requestActivityDeletionFromDetails"),
  cancelActivityDeletionFromDetails: document.querySelector("#cancelActivityDeletionFromDetails"),
  activityDeletionDialog: document.querySelector("#activityDeletionDialog"),
  activityDeletionForm: document.querySelector("#activityDeletionForm"),
  activityDeletionSummary: document.querySelector("#activityDeletionSummary"),
  activityDeletionMessage: document.querySelector("#activityDeletionMessage"),
  activityDeletionQueueDialog: document.querySelector("#activityDeletionQueueDialog"),
  activityDeletionQueueSearch: document.querySelector("#activityDeletionQueueSearch"),
  activityDeletionQueueStatus: document.querySelector("#activityDeletionQueueStatus"),
  activityDeletionQueueRequester: document.querySelector("#activityDeletionQueueRequester"),
  activityDeletionQueueSalesman: document.querySelector("#activityDeletionQueueSalesman"),
  activityDeletionQueueFrom: document.querySelector("#activityDeletionQueueFrom"),
  activityDeletionQueueTo: document.querySelector("#activityDeletionQueueTo"),
  activityDeletionQueueBody: document.querySelector("#activityDeletionQueueBody"),
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
const REFRESH_SESSION_KEY = "arg_crm_refresh_session";
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
let salesmenSummaryChartInstance = null;
let authRefreshPromise = null;
let authInitialization = Promise.resolve();

function isLeadRoutePath(pathname = window.location.pathname) {
  return /^\/leads\/[^/]+(?:\/overview)?\/?$/.test(pathname);
}

function parseAppRoute(locationLike = window.location) {
  const pathname = locationLike.pathname || "/";
  const search = new URLSearchParams(locationLike.search || "");
  const requestedView = search.get("view") === "dashboard/neglected" ? "neglected" : search.get("view");
  const allowedViews = new Set(["dashboard", "pipeline", "salesmen", "activity", "tasks", "ai-actions", "focus", "neglected", "meeting-prep", "draft-email"]);
  const emailRoute = pathname.match(/^\/leads\/([^/]+)\/draft-email\/?$/);
  if (emailRoute) return { view: "draft-email", leadId: decodeURIComponent(emailRoute[1]), tab: "overview" };
  const meetingRoute = pathname.match(/^\/leads\/([^/]+)\/prepare-meeting\/?$/);
  if (meetingRoute) return { view: "meeting-prep", leadId: decodeURIComponent(meetingRoute[1]), tab: "overview" };
  if (isLeadRoutePath(pathname)) {
    return {
      view: "lead",
      leadId: decodeURIComponent(pathname.split("/")[2]),
      tab: search.get("tab") || "overview"
    };
  }
  return {
    view: allowedViews.has(requestedView) ? requestedView : "dashboard",
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
  if (currentView === "meeting-prep" && state.meetingRouteLeadId) {
    return { view: "meeting-prep", leadId: state.meetingRouteLeadId, returnView: state.lastNonLeadView || "pipeline" };
  }
  if (currentView === "draft-email" && state.emailRouteLeadId) {
    return { view: "draft-email", leadId: state.emailRouteLeadId, returnView: state.lastNonLeadView || "pipeline" };
  }
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
    : routeState.view === "draft-email" && routeState.leadId ? `${leadRouteUrl(routeState.leadId)}/draft-email`
    : routeState.view === "meeting-prep" && routeState.leadId ? `${leadRouteUrl(routeState.leadId)}/prepare-meeting`
    : routeState.view === "neglected" ? "/?view=dashboard/neglected"
      : (routeState.view && routeState.view !== "dashboard" ? `/?view=${encodeURIComponent(routeState.view)}` : "/");
  const currentUrl = `${window.location.pathname}${window.location.search}`;
  if (currentUrl === nextUrl && !options.forceState) return;
  window.history[replace ? "replaceState" : "pushState"](routeState, "", nextUrl);
}

function applyRouteState(route, options = {}) {
  const parsed = route?.view ? route : parseAppRoute();
  const nextView = parsed.view === "lead" ? "lead" : (parsed.view || "dashboard");
  state.emailRouteLeadId = nextView === "draft-email" ? parsed.leadId || "" : "";
  state.meetingRouteLeadId = nextView === "meeting-prep" ? parsed.leadId || "" : "";
  if (nextView !== "lead") {
    state.leadDrawerOpen = false;
    currentView = nextView;
    if (state.emailRouteLeadId || state.meetingRouteLeadId) {
      if (parsed.returnView && !["lead", "draft-email", "meeting-prep"].includes(parsed.returnView)) state.lastNonLeadView = parsed.returnView;
    } else state.lastNonLeadView = currentView;
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
  { key: "NEW", label: "New", color: "stage-prospect", aliases: ["NEW", "PROSPECT"] },
  { key: "CONTACTED", label: "Contacted", color: "stage-qualified", aliases: ["CONTACTED", "OUTREACH", "QUALIFIED"] },
  { key: "NEGOTIATION", label: "Negotiation", color: "stage-negotiation", aliases: ["NEGOTIATION", "ENGAGED", "SAMPLING", "PROPOSAL", "PROPOSAL SENT"] },
  { key: "WON", label: "Won", color: "stage-won", aliases: ["WON", "ACTIVE"] },
  { key: "DORMANT", label: "Dormant", color: "stage-dormant", aliases: ["DORMANT"] },
  { key: "LOST", label: "Lost", color: "stage-lost", aliases: ["LOST", "AT RISK"] }
];
const CANONICAL_STAGE_KEYS = KANBAN_STAGES.map(stage => stage.key);
// Display labels never replace stored stage keys or workflow rules.
const STAGE_DISPLAY_LABELS = Object.freeze({ NEW: "Prospect", CONTACTED: "Outreach", NEGOTIATION: "Engaged", WON: "Active", DORMANT: "Dormant", LOST: "Lost" });
const CANONICAL_STAGE_SET = new Set(CANONICAL_STAGE_KEYS);
const CLOSED_STAGE_KEYS = new Set(["WON", "DORMANT", "LOST"]);

const STAGE_ALIAS_MAP = new Map(
  KANBAN_STAGES.flatMap(stage => stage.aliases.map(alias => [String(alias).trim().toUpperCase(), stage.key]))
);

function normalizeRoleValue(role) {
  return String(role || "").trim().toLowerCase();
}

function isSalesmanRole(role = state.currentUser?.role) {
  return normalizeRoleValue(role) === "salesman";
}

function isPrivilegedDashboardRole(role = state.currentUser?.role) {
  return ["admin", "manager", "director"].includes(normalizeRoleValue(role));
}

function normalizeStageKey(stage, fallback = "NEW") {
  const normalized = String(stage || "").trim().toUpperCase();
  return STAGE_ALIAS_MAP.get(normalized) || fallback;
}

const NEXT_ACTION_PLAN_OPTIONS = ["To Call", "To Send Email", "To Visit"];
const ACTIVITY_PURPOSE_OPTIONS = [
  "Company Introductory",
  "New Requirements",
  "Quotation Submission",
  "Quotation Follow-Up",
  "Meeting"
];
const STRUCTURED_ACTIVITY_PURPOSE_OPTIONS = [
  "Company Introductory",
  "New Requirements",
  "Quotation Submission",
  "Quotation Follow Up",
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
const PRODUCT_INTEREST_OPTIONS = [
  "Beams",
  "European sections",
  "Steel Plates",
  "UPN/Channels",
  "MS Angles",
  "MS Plates",
  "Hollow Sections",
  "Pipes",
  "GI Coils",
  "Steel Bars",
  "GI Gratings",
  "PPGI Coils"
];

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

function sessionToken() {
  return sessionStorage.getItem(SESSION_KEY) || "";
}

function persistSession(session = {}) {
  if (session.token) sessionStorage.setItem(SESSION_KEY, session.token);
  if (session.refresh_token) sessionStorage.setItem(REFRESH_SESSION_KEY, session.refresh_token);
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(REFRESH_SESSION_KEY);
}

function isRefreshableRequest(path, options = {}) {
  return !options.skipAuthRefresh && !["/api/auth/login", "/api/auth/refresh"].includes(path);
}

async function refreshAuthenticatedSession() {
  if (authRefreshPromise) return authRefreshPromise;
  const refreshToken = sessionStorage.getItem(REFRESH_SESSION_KEY);
  if (!refreshToken) throw Object.assign(new Error("Your session has expired. Please sign in again."), { status: 401 });
  authRefreshPromise = fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken })
  })
    .then(async response => {
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.token) {
        throw Object.assign(new Error(result.error || "Your session has expired. Please sign in again."), { status: response.status || 401 });
      }
      persistSession(result);
      if (result.user) state.currentUser = result.user;
      return result;
    })
    .finally(() => { authRefreshPromise = null; });
  return authRefreshPromise;
}

function handleAuthenticationFailure() {
  clearSession();
  state.leads = [];
  state.leadsLoaded = false;
  state.selectedId = null;
  showLogin("Your session has expired. Please sign in again.");
}

async function authenticatedFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = sessionToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const request = {
    ...options,
    credentials: "same-origin",
    headers
  };
  let response = await fetch(path, request);
  if (response.status === 401 && isRefreshableRequest(path, options)) {
    try {
      await refreshAuthenticatedSession();
      const refreshedToken = sessionToken();
      if (refreshedToken) request.headers.Authorization = `Bearer ${refreshedToken}`;
      response = await fetch(path, request);
    } catch (error) {
      handleAuthenticationFailure();
      throw error;
    }
  }
  return response;
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && typeof options.body === "string" && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
  const response = await authenticatedFetch(path, { ...options, headers });
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
  return `<ul class="lead-ai-list ${tone}">${rows.map(item => `<li>${escapeHtml(summaryText(item))}</li>`).join("")}</ul>`;
}

function summaryText(value) {
  if (Array.isArray(value)) return value.map(item => summaryText(item)).filter(Boolean).join("; ");
  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(([key, item]) => `${key.replace(/[_-]+/g, " ")}: ${summaryText(item)}`)
      .filter(Boolean)
      .join("; ");
  }
  return String(value || "").replace(/\s+/g, " ").trim();
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
  if (panel === els.leadAiSummaryPagePanel) {
    const hideSummary = ["overview", "activities", "pmr", "reminders", "notes"].includes(state.leadDrawerTab);
    panel.hidden = hideSummary;
    if (hideSummary) {
      content.replaceChildren();
      return;
    }
  }
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
      leadAiCard("Current Lead Status", `<p>${escapeHtml(summaryText(summary.current_lead_status) || "No summary available.")}</p>`, { tone: "status" }),
      leadAiCard("Market Intelligence", `
        <p>${escapeHtml(summaryText(summary.market_intelligence) || "Market intelligence unavailable.")}</p>
        ${summaryState.marketIntelUnavailableReason ? `<div class="lead-ai-note">${escapeHtml(summaryState.marketIntelUnavailableReason)}</div>` : ""}
      `, { tone: "intel" }),
      leadAiCard("Salesman Engagement History", `<p>${escapeHtml(summaryText(summary.salesman_engagement_history) || "No engagement history recorded.")}</p>`, { tone: "engagement" }),
      leadAiCard("Risks / Attention Needed", summaryList(summary.risks_attention_needed, "risk"), { tone: "risk" }),
      leadAiCard("Recommended Next Action", `
        <p class="lead-ai-action-copy">${escapeHtml(summaryText(summary.recommended_next_action) || "No next action recommended yet.")}</p>
        ${summary.suggested_follow_up_message ? `<div class="lead-ai-followup"><span class="meta-label">Suggested follow-up message</span><p>${escapeHtml(summaryText(summary.suggested_follow_up_message))}</p></div>` : ""}
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
      <span class="chip lead-ai-badge confidence">${escapeHtml(confidence)} confidence</span>
      <span class="chip lead-ai-badge freshness ${summaryState.cached ? "warm" : ""}">${summaryState.cached ? "Cached summary" : "Live summary"}</span>
      ${summaryState.provider ? `<span class="chip lead-ai-badge provider">${escapeHtml(summaryState.provider)}</span>` : ""}
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
  await authInitialization;
  if (state.sync.syncing || !navigator.onLine || !state.currentUser || !sessionToken()) {
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
        if ([401, 403].includes(Number(error?.status))) {
          await updateOutboxItem({
            ...next,
            status: "failed",
            last_error: error.message || "Authentication is required before this change can sync."
          });
          break;
        }
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

async function downloadExport(path, fallbackName, options = {}) {
  const response = await authenticatedFetch(path, {
    method: options.method || "GET",
    headers: options.headers || {},
    body: options.body
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
  const response = await authenticatedFetch("/api/transcriptions", {
    method: "POST",
    headers: {
      "Content-Type": blob.type || "audio/webm"
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
let activityModalRecorder = null;
let activityModalElapsedTimer = null;
let activityModalTrigger = null;
let activityModalSaving = false;
let activityModalLastTranscript = "";
let activityModalMode = "create";
let activityModalFiles = [];
let activityModalExistingAttachments = [];
let activityModalRemovedAttachmentIds = new Set();
let activityDetailsSelection = null;

function recorderMimeType() {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return types.find(type => window.MediaRecorder?.isTypeSupported?.(type)) || "";
}

async function toggleVoiceRecording({ button, status, target }) {
  const idleLabel = button?.dataset?.idleLabel || button?.textContent || "Record Voice Note";
  const stopLabel = button?.dataset?.stopLabel || "Stop Recording";
  const listeningLabel = button?.dataset?.listeningLabel || "Recording voice note...";
  const transcribingLabel = button?.dataset?.transcribingLabel || "Converting voice note to English text...";
  const successLabel = button?.dataset?.successLabel || "English transcript added. You can edit it before saving.";
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
    button.textContent = stopLabel;
    button.classList.add("recording");
    status.textContent = listeningLabel;

    recorder.addEventListener("dataavailable", event => {
      if (event.data.size) chunks.push(event.data);
    });
    recorder.addEventListener("stop", async () => {
      const current = activeRecorder;
      activeRecorder = null;
      clearTimeout(current.timeout);
      current.stream.getTracks().forEach(track => track.stop());
      current.button.textContent = idleLabel;
      current.button.classList.remove("recording");
      current.status.textContent = transcribingLabel;
      try {
        const transcript = await transcribeRecording(new Blob(current.chunks, { type: recorder.mimeType || "audio/webm" }));
        if (!transcript) throw new Error("No speech was detected. Please record again.");
        current.target.value = [current.target.value.trim(), transcript].filter(Boolean).join(current.target.value.trim() ? "\n" : "");
        current.target.dispatchEvent(new Event("input", { bubbles: true }));
        current.status.textContent = successLabel;
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
  const mimeType = blob.type || fallbackType || "audio/webm";
  const body = blob.type ? blob : blob.slice(0, blob.size, mimeType);
  const response = await authenticatedFetch("/api/pmr-voice-notes", {
    method: "POST",
    headers: {
      "Content-Type": mimeType
    },
    body
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Voice note upload failed: ${response.status}`);
  return result;
}

function activityAudioMarkup(activity) {
  if (!activity.voice_note_url && !activity.voice_note_id) return "";
  const voiceNoteId = String(activity.voice_note_id || "");
  const source = !voiceNoteId && activity.voice_note_url
    ? `src="${escapeHtml(activity.voice_note_url)}"`
    : "";
  return `<audio class="activity-audio" controls preload="metadata" data-voice-note-id="${escapeHtml(voiceNoteId)}" ${source}></audio>`;
}

function handleOutboxSyncError(error) {
  refreshSyncState().catch(() => {});
  if (!error || Number(error.status) === 401) return;
  setToast(error.message || "Pending changes could not be synchronized.", "error");
}

async function uploadLeadIntelligencePdf(leadId, file) {
  if (!(file instanceof File) || !/\.pdf$/i.test(file.name || "") && file.type !== "application/pdf") {
    throw new Error("Choose a PDF intelligence report.");
  }
  const response = await authenticatedFetch(`/api/leads/${encodeURIComponent(leadId)}/intelligence/upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/pdf",
      "X-File-Name": encodeURIComponent(file.name)
    },
    body: file
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Intelligence PDF upload failed.");
  return result;
}

async function fetchAuthenticatedBlob(url) {
  const response = await authenticatedFetch(url);
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    const error = new Error(result.error || `Intelligence PDF request failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response.blob();
}

function markLeadIntelligencePdfMissing(url) {
  if (!url) return;
  state.leadIntelligenceMissingPdfUrls.add(url);
  if (state.leadDrawerTab === "intel") renderLeadDrawer();
}

function blobDownloadName(url) {
  return url.includes("download=1") ? "lead-intelligence.pdf" : "lead-intelligence-preview.pdf";
}

async function downloadAuthenticatedPdf(url) {
  const blobUrl = URL.createObjectURL(await fetchAuthenticatedBlob(url));
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = blobDownloadName(url);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}

async function openAuthenticatedPdf(url, popup = null) {
  try {
    const blobUrl = URL.createObjectURL(await fetchAuthenticatedBlob(url));
    if (popup) {
      popup.opener = null;
      popup.location.replace(blobUrl);
    } else {
      window.open(blobUrl, "_blank", "noopener");
    }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  } catch (error) {
    popup?.close();
    throw error;
  }
}

async function hydrateLeadIntelligencePdfPreviews() {
  const previews = [...document.querySelectorAll("iframe[data-lead-intelligence-pdf-preview]")];
  await Promise.all(previews.map(async preview => {
    try {
      const blobUrl = URL.createObjectURL(await fetchAuthenticatedBlob(preview.dataset.leadIntelligencePdfPreview));
      preview.src = blobUrl;
      preview.dataset.blobUrl = blobUrl;
    } catch (error) {
      if (error.status === 404) {
        markLeadIntelligencePdfMissing(preview.dataset.leadIntelligencePdfPreview);
        return;
      }
      preview.replaceWith(Object.assign(document.createElement("p"), { className: "empty-copy", textContent: "PDF preview is unavailable. Use Open in new tab." }));
    }
  }));
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
  return `<button class="small-action" type="button" data-edit-activity-lead="${escapeHtml(leadId)}" data-edit-activity-index="${escapeHtml(activityIndex)}" data-edit-activity-id="${escapeHtml(activity.id || "")}">Edit</button>`;
}

function activityDeleteButton(leadId, activityIndex, activity = {}) {
  if (activityIndex == null || activityIndex < 0 || activity.delete_request) return "";
  const pending = activity.deletion_status === "pending";
  return `<button class="small-action" type="button" data-delete-activity-lead="${escapeHtml(leadId)}" data-delete-activity-index="${escapeHtml(activityIndex)}" data-delete-activity-id="${escapeHtml(activity.id || "")}" ${pending ? "disabled" : ""}>${pending ? "Deletion Pending" : "Request Deletion"}</button>`;
}

function activityViewButton(leadId, activityIndex, activity = {}) {
  if (activityIndex == null || activityIndex < 0 || activity.delete_request) return "";
  return `<button class="small-action" type="button" data-view-activity-lead="${escapeHtml(leadId)}" data-view-activity-index="${escapeHtml(activityIndex)}" data-view-activity-id="${escapeHtml(activity.id || "")}">View</button>`;
}

function activityItemMarkup(activity, leadId, activityIndex) {
  return `
    <div class="activity-item">
      <div class="activity-row">
        <span class="meta-label">${escapeHtml(activity.at)} - ${escapeHtml(activity.type)}</span>
        <span class="activity-actions">
          ${activityViewButton(leadId, activityIndex, activity)}
          ${activityEditButton(leadId, activityIndex, activity)}
          ${activityDeleteButton(leadId, activityIndex, activity)}
        </span>
      </div>
      <p>${escapeHtml(activity.text)}</p>
      ${activity.quotation_ref ? `<button class="quote-ref-pill" type="button" data-quotation-ref="${escapeHtml(activity.quotation_ref)}">Quote ${escapeHtml(activity.quotation_ref)}</button>` : ""}
      ${activity.delete_request ? `<span class="request-status ${escapeHtml(activity.request_status || "pending")}">Review request ${escapeHtml(activity.request_status || "pending")}</span>` : ""}
      ${activity.deletion_status === "pending" ? `<span class="request-status pending">Deletion pending approval</span>` : ""}
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
      openActivityEdit(button.dataset.editActivityLead, Number(button.dataset.editActivityIndex), button.dataset.editActivityId, button);
    });
  });
  document.querySelectorAll("[data-view-activity-lead]").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      openActivityDetails(button.dataset.viewActivityLead, Number(button.dataset.viewActivityIndex), button.dataset.viewActivityId);
    });
  });
}

function bindDeleteButtons() {
  document.querySelectorAll("[data-delete-activity-lead]").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      handleActivityDelete(button.dataset.deleteActivityLead, Number(button.dataset.deleteActivityIndex), button.dataset.deleteActivityId);
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

function resolveActivity(leadId, activityIndex, activityId = "") {
  const lead = state.leads.find(item => item.id === leadId);
  const activity = lead?.activities?.find(item => String(item.id) === String(activityId))
    || lead?.activities?.[activityIndex]
    || state.activities.find(item => item.lead_id === leadId && String(item.id) === String(activityId));
  return { lead, activity };
}

function openActivityEdit(leadId, activityIndex, activityId = "", trigger = null) {
  const { lead, activity } = resolveActivity(leadId, activityIndex, activityId);
  if (!lead || !activity) return;
  openActivityModal(leadId, trigger, activity);
}

function auditEventLabel(event = {}) {
  return String(event.action || "activity_updated").replaceAll("_", " ");
}

function openActivityDetails(leadId, activityIndex, activityId = "") {
  const { lead, activity } = resolveActivity(leadId, activityIndex, activityId);
  if (!lead || !activity || !els.activityDetailsDialog) return;
  const pendingRequest = (lead.activities || []).find(item => (
    item.delete_request
    && item.target_type === "activity"
    && String(item.target_activity_id) === String(activity.id)
    && item.request_status === "pending"
  ));
  activityDetailsSelection = { leadId, activityIndex, activity, pendingRequest };
  els.activityDetailsTitle.innerHTML = pageTitleMarkup(`${activity.activity_purpose || activity.type || "Activity"} · ${lead.company_name}`);
  const attachments = (activity.attachments || []).filter(item => !item.removed_at);
  const history = activity.audit_history || [];
  els.activityDetailsBody.innerHTML = `
    <div class="activity-detail-grid">
      <div class="activity-detail-field"><span>Company</span><strong>${escapeHtml(lead.company_name)}</strong></div>
      <div class="activity-detail-field"><span>Recorded by</span><strong>${escapeHtml(activity.created_by_name || activity.salesman_name || lead.assigned_salesman || "User")}</strong></div>
      <div class="activity-detail-field"><span>Next action</span><strong>${escapeHtml(activity.next_action_plan || lead.next_action || "Not added")}</strong></div>
      <div class="activity-detail-field"><span>Next action date</span><strong>${escapeHtml(formatDisplayDate(activity.next_action_date || activity.at || ""))}</strong></div>
      <div class="activity-detail-field"><span>Purpose</span><strong>${escapeHtml(activity.activity_purpose || activity.type || "Activity")}</strong></div>
      <div class="activity-detail-field"><span>Version</span><strong>${escapeHtml(activity.version || 1)}</strong></div>
    </div>
    <section class="activity-detail-section"><h3>Notes</h3><p>${escapeHtml(activity.notes || activity.text || "No notes added.")}</p></section>
    <section class="activity-detail-section">
      <h3>Attachments (${attachments.length})</h3>
      <div class="activity-attachment-list">
        ${attachments.map(item => `<div class="activity-attachment-row"><div><strong>${escapeHtml(item.filename || item.original_filename)}</strong><small>${escapeHtml(humanFileSize(item.size))}</small></div><span></span><button type="button" data-details-download-attachment="${escapeHtml(item.id)}">Download</button></div>`).join("") || "<p>No attachments.</p>"}
      </div>
    </section>
    <section class="activity-detail-section">
      <h3>Audit history</h3>
      <div class="activity-audit-list">
        ${history.map(event => `<article class="activity-audit-event"><span>${escapeHtml(auditEventLabel(event))}</span><strong>${escapeHtml(event.actor_name || "User")}</strong><p>${escapeHtml(formatDateTime(event.at || event.created_at || ""))}</p></article>`).join("") || "<p>No audit events available for this legacy activity.</p>"}
      </div>
    </section>
  `;
  els.activityDetailsBody.querySelectorAll("[data-details-download-attachment]").forEach(button => {
    button.addEventListener("click", () => downloadActivityAttachment(button.dataset.detailsDownloadAttachment));
  });
  els.editActivityFromDetails.disabled = activity.deletion_status === "pending";
  els.requestActivityDeletionFromDetails.disabled = activity.deletion_status === "pending";
  els.requestActivityDeletionFromDetails.textContent = activity.deletion_status === "pending" ? "Deletion Pending" : "Request Deletion";
  const canCancel = pendingRequest && (
    String(pendingRequest.requested_by) === String(state.currentUser?.id)
    || ["admin", "manager", "director"].includes(String(state.currentUser?.role || "").toLowerCase())
  );
  els.cancelActivityDeletionFromDetails?.classList.toggle("hidden", !canCancel);
  if (els.cancelActivityDeletionFromDetails) {
    els.cancelActivityDeletionFromDetails.dataset.requestId = canCancel ? pendingRequest.id : "";
  }
  els.activityDetailsDialog.showModal();
}

function adminPasswordPrompt(action) {
  return window.prompt(`Enter admin password to ${action}:`);
}

async function submitDeleteRequest(leadId, targetType, activityIndex = null, activityId = "") {
  if (targetType === "activity" && els.activityDeletionDialog) {
    const selection = resolveActivity(leadId, activityIndex, activityId);
    els.activityDeletionForm.reset();
    els.activityDeletionForm.elements.lead_id.value = leadId;
    els.activityDeletionForm.elements.activity_id.value = activityId || selection.activity?.id || "";
    if (els.activityDeletionSummary) {
      const attachments = (selection.activity?.attachments || []).filter(item => !item.removed_at);
      els.activityDeletionSummary.innerHTML = `
        <strong>${escapeHtml(selection.lead?.company_name || "Activity")}</strong>
        <span>${escapeHtml(selection.activity?.activity_purpose || selection.activity?.type || "Activity")} &middot; ${escapeHtml(formatDisplayDate(selection.activity?.at || selection.activity?.next_action_date || ""))}</span>
        <span>Created by ${escapeHtml(selection.activity?.created_by_name || selection.activity?.salesman_name || "User")} &middot; ${attachments.length} attachment${attachments.length === 1 ? "" : "s"}</span>
      `;
    }
    setMessage(els.activityDeletionMessage, "");
    els.activityDeletionDialog.showModal();
    return;
  }
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

async function handleActivityDelete(leadId, activityIndex, activityId = "") {
  await submitDeleteRequest(leadId, "activity", activityIndex, activityId);
}

async function reviewDeleteRequest(leadId, requestId, action, suppliedNote = "") {
  const role = String(state.currentUser?.role || "").toLowerCase();
  const password = role === "admin" ? adminPasswordPrompt(`${action} this delete request`) : "";
  if (role === "admin" && !password) return;
  const note = action === "reject"
    ? suppliedNote.trim() || window.prompt("Rejection comment (required):") || ""
    : suppliedNote.trim();
  if (action === "reject" && !note.trim()) {
    setToast("A rejection comment is required.", "error");
    return;
  }
  const result = await api(`/api/leads/${encodeURIComponent(leadId)}/delete-requests/${encodeURIComponent(requestId)}/${encodeURIComponent(action)}`, {
    method: "POST",
    body: JSON.stringify({ admin_password: password, note })
  });
  if (result.deleted && state.selectedId === leadId) state.selectedId = null;
  await loadLeads();
  if (currentView === "activity") await fetchActivities();
  if (els.activityDeletionQueueDialog?.open) await loadActivityDeletionQueue();
  setToast(action === "approve" ? "Deletion approved; activity archived." : "Deletion request rejected.", "success");
}

function activityDeletionStatusLabel(status) {
  return String(status || "pending").replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());
}

function activityDeletionQueueCard(request) {
  const selfRequest = String(request.requested_by) === String(state.currentUser?.id);
  const pending = request.request_status === "pending";
  const historyCount = Array.isArray(request.audit_history) ? request.audit_history.length : 0;
  return `
    <article class="activity-queue-card">
      <div class="activity-queue-card-head">
        <div>
          <span class="request-status ${escapeHtml(request.request_status || "pending")}">${escapeHtml(activityDeletionStatusLabel(request.request_status))}</span>
          <h3>${escapeHtml(request.company_name || "Lead")}</h3>
          <p>${escapeHtml(request.activity_type || "Activity")} &middot; ${escapeHtml(formatDisplayDate(request.activity_date || request.requested_at))}</p>
        </div>
        <strong>${escapeHtml(formatDateTime(request.requested_at || ""))}</strong>
      </div>
      <div class="activity-detail-grid">
        <div class="activity-detail-field"><span>Requester</span><strong>${escapeHtml(request.requested_by_name || "User")}</strong></div>
        <div class="activity-detail-field"><span>Salesman / team</span><strong>${escapeHtml(request.assigned_salesman || "Not assigned")}</strong></div>
        <div class="activity-detail-field"><span>Activity creator</span><strong>${escapeHtml(request.activity_creator || "Not recorded")}</strong></div>
        <div class="activity-detail-field"><span>Attachments</span><strong>${escapeHtml(request.attachment_count || 0)}</strong></div>
        <div class="activity-detail-field"><span>Reason</span><strong>${escapeHtml(request.reason || "Not added")}</strong></div>
        <div class="activity-detail-field"><span>Audit events</span><strong>${escapeHtml(historyCount)}</strong></div>
      </div>
      ${request.comments ? `<p><strong>Requester comments:</strong> ${escapeHtml(request.comments)}</p>` : ""}
      ${request.activity_notes ? `<p><strong>Activity notes:</strong> ${escapeHtml(request.activity_notes)}</p>` : ""}
      ${request.review_note ? `<p><strong>Management comment:</strong> ${escapeHtml(request.review_note)}</p>` : ""}
      ${pending ? `
        <div class="activity-queue-card-actions">
          <textarea data-activity-review-note="${escapeHtml(request.id)}" aria-label="Management comment for ${escapeHtml(request.company_name || "activity")}"></textarea>
          <button class="danger-button" type="button" data-activity-request-action="reject" data-request-lead="${escapeHtml(request.lead_id)}" data-request-id="${escapeHtml(request.id)}" ${selfRequest ? "disabled title=\"You cannot review your own request.\"" : ""}>Reject</button>
          <button class="primary-button" type="button" data-activity-request-action="approve" data-request-lead="${escapeHtml(request.lead_id)}" data-request-id="${escapeHtml(request.id)}" ${selfRequest ? "disabled title=\"You cannot review your own request.\"" : ""}>Approve</button>
        </div>
      ` : ""}
    </article>
  `;
}

async function loadActivityDeletionQueue() {
  if (!els.activityDeletionQueueBody) return;
  els.activityDeletionQueueBody.innerHTML = `<div class="activity-workflow-loading" role="status">Loading deletion requests...</div>`;
  const params = new URLSearchParams({
    status: els.activityDeletionQueueStatus?.value || "pending",
    search: els.activityDeletionQueueSearch?.value || "",
    requester: els.activityDeletionQueueRequester?.value || "",
    salesman: els.activityDeletionQueueSalesman?.value || "",
    from: els.activityDeletionQueueFrom?.value || "",
    to: els.activityDeletionQueueTo?.value || ""
  });
  try {
    const requests = await api(`/api/activity-deletion-requests?${params.toString()}`);
    els.activityDeletionQueueBody.innerHTML = requests.length
      ? `<div class="activity-queue-list">${requests.map(activityDeletionQueueCard).join("")}</div>`
      : `<div class="activity-workflow-empty"><strong>No deletion requests match these filters.</strong></div>`;
    els.activityDeletionQueueBody.querySelectorAll("[data-activity-request-action]").forEach(button => {
      button.addEventListener("click", async () => {
        const note = els.activityDeletionQueueBody.querySelector(`[data-activity-review-note="${CSS.escape(button.dataset.requestId)}"]`)?.value || "";
        button.disabled = true;
        try {
          await reviewDeleteRequest(button.dataset.requestLead, button.dataset.requestId, button.dataset.activityRequestAction, note);
        } catch (error) {
          button.disabled = false;
          setToast(error.message, "error");
        }
      });
    });
  } catch (error) {
    els.activityDeletionQueueBody.innerHTML = `<div class="activity-workflow-error" role="alert">${escapeHtml(error.message)}</div>`;
  }
}

async function cancelActivityDeletionRequest() {
  const requestId = els.cancelActivityDeletionFromDetails?.dataset.requestId;
  const leadId = activityDetailsSelection?.leadId;
  if (!requestId || !leadId) return;
  try {
    await api(`/api/leads/${encodeURIComponent(leadId)}/delete-requests/${encodeURIComponent(requestId)}/cancel`, {
      method: "POST"
    });
    els.activityDetailsDialog?.close();
    await loadLeads();
    if (currentView === "activity") await fetchActivities();
    setToast("Deletion request cancelled.", "success");
  } catch (error) {
    setToast(error.message, "error");
  }
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
      if (event.data?.type === "SYNC_OUTBOX") syncOutbox().catch(handleOutboxSyncError);
    });
  }

  window.addEventListener("online", () => {
    state.sync.online = true;
    refreshSyncState();
    syncOutbox().catch(handleOutboxSyncError);
  });
  window.addEventListener("offline", () => {
    state.sync.online = false;
    refreshSyncState();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) syncOutbox().catch(handleOutboxSyncError);
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

function aiWorkspacePage(view = currentView) {
  return {
    "ai-actions": { title: "One-tap AI actions", context: "Relationship intelligence grounded in your visible CRM records." },
    focus: { title: "Today", context: "Your follow-ups, starting with the most urgent.", portfolioAction: "focus_today" },
    neglected: { title: "Who have I neglected?", context: "Review overdue activity follow-ups and their remarks.", portfolioAction: "neglected" },
    "meeting-prep": { title: "Prepare for this meeting", context: "Review relationship history, PMRs and relevant intelligence.", companyAction: "prepare" },
    "draft-email": { title: "Draft follow-up email", context: "Review a grounded draft, then edit it in your mail app before sending.", companyAction: "email" }
  }[view] || null;
}

function renderTodayWorkspace(workspace) {
  const datasets = salesmanDashboardSummaryDatasets();
  const queue = actionableSalesmanLeads();
  const busy = Boolean(state.leadsLoading && !state.leadsLoaded);
  const unavailable = Boolean(state.leadsError && !state.leadsLoaded);
  const stages = [
    ["Prospect", datasets.stageNew, "salesmanStageNew"],
    ["Outreach", datasets.stageContacted, "salesmanStageContacted"],
    ["Engaged", datasets.stageNegotiation, "salesmanStageNegotiation"],
    ["Active", datasets.stageWon, "salesmanStageWon"],
    ["Dormant", datasets.stageDormant, "salesmanStageDormant"]
  ];
  workspace.setAttribute("aria-busy", String(busy));
  workspace.innerHTML = `
    <div class="crm-today-layout">
      <section class="crm-today-panel crm-today-calls" aria-labelledby="aiWorkspaceHeading">
        <header class="crm-today-panel-heading"><h2 id="aiWorkspaceHeading">Call next</h2>
          <button class="ghost-button" type="button" data-today-summary="salesmanScheduled" ${busy || unavailable ? "disabled" : ""}>View all</button>
        </header>
        <div class="crm-today-call-list">${busy ? `<p class="crm-today-state" role="status">Loading your follow-ups...</p>` : unavailable ? `<p class="crm-today-state">Follow-ups could not be loaded. Retry below.</p>` : queue.slice(0, 4).map(lead => {
          const contact = primaryLeadContact(lead);
          const due = daysUntil(lead.next_action_date);
          const dueLabel = due < 0 ? `${Math.abs(due)} days overdue` : due === 0 ? "Due today" : formatDisplayDate(lead.next_action_date);
          return `<article class="crm-today-call-row">
            <div class="crm-today-company"><button type="button" class="crm-today-company-link" data-today-lead="${escapeHtml(lead.id)}">${escapeHtml(lead.company_name || "Unnamed company")}</button>
              <p>${escapeHtml([lead.next_action || "Follow up", contact.name, lead.location || lead.territory].filter(Boolean).join(" · "))}</p>
            </div>
            <span class="crm-today-due ${due < 0 ? "is-overdue" : ""}">${escapeHtml(dueLabel)}</span>
            <div class="crm-today-contact-actions">
              ${contact.email ? `<a class="ghost-button crm-today-email" href="mailto:${escapeHtml(encodeURIComponent(contact.email))}" aria-label="Email ${escapeHtml(lead.company_name || "company")}">Email</a>` : `<button type="button" class="ghost-button crm-today-email" disabled title="No email address saved">Email</button>`}
              ${contact.phone ? `<a class="primary-button crm-today-call" href="tel:${escapeHtml(contact.phone.replace(/[^+\d*#,;]/g, ""))}" aria-label="Call ${escapeHtml(lead.company_name || "company")}">Call</a>` : `<button type="button" class="primary-button crm-today-call" disabled title="No phone number saved">Call</button>`}
            </div>
          </article>`;
        }).join("") || `<p class="crm-today-state">No scheduled follow-ups. Your assigned leads are available in Pipeline.</p>`}</div>
      </section>
      <div class="crm-today-side">
        <section class="crm-today-panel" aria-labelledby="todayQuickActionsTitle">
          <header class="crm-today-panel-heading"><h2 id="todayQuickActionsTitle">Quick actions</h2></header>
          <div class="crm-today-quick-grid">
            <button class="ghost-button" type="button" data-today-action="add">Add lead</button>
            <button class="ghost-button" type="button" data-today-action="places">Search places</button>
            <button class="ghost-button" type="button" data-workspace-view="draft-email">Draft email</button>
            <button class="ghost-button" type="button" data-today-action="report">Weekly report</button>
          </div>
        </section>
        <section class="crm-today-panel" aria-labelledby="todayPipelineTitle">
          <header class="crm-today-panel-heading"><h2 id="todayPipelineTitle">My pipeline</h2></header>
          <div class="crm-today-pipeline">${stages.map(([label, records, type]) => `<button type="button" class="crm-today-stage ${label === "Engaged" ? "is-engaged" : ""}" data-today-summary="${type}" ${busy || unavailable ? "disabled" : ""} aria-label="${label}: ${busy || unavailable ? "unavailable" : `${records.length} leads`}. View summary">
            <span>${label}</span><span class="crm-today-track" aria-hidden="true"><i style="width:${Math.round(records.length / Math.max(1, datasets.myLeads.length) * 100)}%"></i></span><strong>${busy || unavailable ? "—" : records.length}</strong>
          </button>`).join("")}
          <div class="crm-today-stage is-unavailable"><span>Block</span><span class="crm-today-track" aria-hidden="true"></span><span aria-label="Not available">—</span></div>
          </div>
          <p class="crm-today-note">Block status setup is pending.${datasets.stageLost.length ? ` ${datasets.stageLost.length} legacy Lost records await Outreach reclassification.` : ""}</p>
        </section>
      </div>
    </div>
    <details class="crm-today-more"><summary>More tools</summary><button class="ghost-button" type="button" data-workspace-portfolio-action="focus_today" ${busy || state.dailyAiLoading ? "disabled" : ""}>Generate AI daily focus</button></details>
    ${state.leadsError ? `<p class="crm-ai-workspace-error" role="alert">${escapeHtml(state.leadsError)}</p><button class="ghost-button" type="button" data-workspace-retry>Retry loading companies</button>` : ""}
  `;
}

let neglectedWorkspace = null;
let neglectedToolsOpen = false;
let neglectedActivityFilter = "all";
let neglectedActivityEditor = null;
const neglectedOutcomes = {
  pending: ["Call back requested", "Meeting or visit scheduled", "Will try again", "Waiting for customer reply"],
  closed: ["Done - spoke to customer", "Done - visit or meeting held", "Not reached - no answer", "Not reached - wrong or invalid number", "Not interested", "Company closed or moved"]
};

function neglectedActivityRows(leads, referenceDate) {
  const rows = [];
  for (const lead of leads || []) {
    const activities = Array.isArray(lead.activities) ? lead.activities : [];
    for (const activity of activities) {
      if (!activity || activity.archived || activity.delete_request || activity.deletion_status === "pending") continue;
      const due = String(activity.next_action_date || activity.reminder_due_date || (activity.reminder ? activity.due_date : "") || "").slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(due) || Number.isNaN(Date.parse(`${due}T00:00:00Z`)) || new Date(`${due}T00:00:00Z`).toISOString().slice(0, 10) !== due || due >= referenceDate) continue;
      const id = String(activity.id || "").trim();
      const stable = Boolean(id && activities.filter(item => item && String(item.id || "") === id).length === 1);
      rows.push({ lead, activity, due, stable, status: activity.transaction_status === "closed" ? "closed" : "pending" });
    }
  }
  return rows.sort((a, b) => a.due.localeCompare(b.due));
}

function renderNeglectedActivities(workspace) {
  const manager = !isSalesmanRole();
  if (neglectedActivityEditor && neglectedActivityEditor.owner !== String(state.currentUser?.id)) neglectedActivityEditor = null;
  const referenceDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dubai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const unavailable = !state.leadsLoaded;
  const rows = unavailable ? [] : neglectedActivityRows(state.leads, referenceDate);
  const closed = rows.filter(row => row.status === "closed").length;
  const done = rows.filter(row => row.status === "closed" && String(row.activity.transaction_outcome || "").startsWith("Done -")).length;
  const notReached = rows.filter(row => row.status === "closed" && String(row.activity.transaction_outcome || "").startsWith("Not reached -")).length;
  const missing = rows.filter(row => !String(row.activity.transaction_remarks || "").trim()).length;
  const visible = rows.map((row, index) => ({ ...row, index })).filter(row => neglectedActivityFilter === "all" || row.status === neglectedActivityFilter);
  const outcomeLabel = status => status === "pending" ? "Where does it stand?" : "Why is it closed?";
  workspace.innerHTML = `
    <div class="neglected-v2-head"><div><button type="button" data-workspace-view="dashboard" class="neglected-v2-back">Dashboard</button><span> / Neglected accounts</span><h2>Who have I <em>neglected?</em></h2><p>Overdue activity follow-ups, based on their scheduled dates.</p></div>${manager ? `<button type="button" class="ghost-button" data-neglected-export>Export for management</button>` : ""}</div>
    <div class="neglected-v2-stats"><article><span>Overdue activities</span><strong>${unavailable ? "—" : rows.length}</strong></article><article><span>Follow-ups closed</span><strong>${unavailable ? "—" : `${closed} / ${rows.length}`}</strong>${unavailable ? "" : `<progress max="${Math.max(1, rows.length)}" value="${closed}" aria-label="Follow-ups closed"></progress>`}</article><article><span>Still pending</span><strong>${unavailable ? "—" : rows.length - closed}</strong>${unavailable ? "" : `<small>Closed: ${done} done · ${notReached} not reached</small>`}</article><article><span>Missing remarks</span><strong>${unavailable ? "—" : missing}</strong></article></div>
    <section class="neglected-v2-list" aria-label="Overdue follow-ups"><div class="neglected-v2-filters">${["all", "pending", "closed"].map(filter => `<button type="button" data-neglected-filter="${filter}" aria-pressed="${neglectedActivityFilter === filter}" ${unavailable ? "disabled" : ""}>${filter[0].toUpperCase() + filter.slice(1)} · ${unavailable ? "—" : filter === "all" ? rows.length : filter === "closed" ? closed : rows.length - closed}</button>`).join("")}</div>
    ${state.leadsLoading && !state.leadsLoaded ? `<p role="status">Loading follow-ups...</p>` : state.leadsError && !state.leadsLoaded ? `<p role="alert">${escapeHtml(state.leadsError)}</p><button type="button" data-neglected-retry>Retry</button>` : !visible.length ? `<p class="neglected-v2-empty">No overdue activities match this filter.</p>` : visible.map(row => {
      const a = row.activity;
      const editing = neglectedActivityEditor && neglectedActivityEditor.leadId === String(row.lead.id) && neglectedActivityEditor.activityId === String(a.id);
      const editor = editing ? neglectedActivityEditor : null;
      const days = Math.floor((Date.parse(`${referenceDate}T00:00:00Z`) - Date.parse(`${row.due}T00:00:00Z`)) / 86400000);
      return `<article class="neglected-v2-row"><div class="neglected-v2-row-main"><div><button type="button" class="crm-neglected-company" data-neglected-lead="${escapeHtml(row.lead.id)}">${escapeHtml(row.lead.company_name || "Unnamed company")}</button><p>${escapeHtml(a.activity_purpose || a.type || "Activity")} · due ${escapeHtml(row.due)}</p></div><strong class="neglected-v2-overdue">${days} d overdue</strong><div class="neglected-v2-switch" aria-label="Follow-up status">${["pending", "closed"].map(status => `<button type="button" data-neglected-status="${status}" data-neglected-index="${row.index}" aria-pressed="${row.status === status}" ${manager || !row.stable ? "disabled" : ""}>${status === "pending" ? "Pending" : "Closed"}</button>`).join("")}</div><div class="neglected-v2-remark">${a.transaction_remarks ? `<strong>${escapeHtml(a.transaction_outcome || "Update")}</strong><p>${escapeHtml(a.transaction_remarks)}</p><small>${escapeHtml(a.transaction_updated_by_name || "User")} · ${escapeHtml(String(a.transaction_updated_at || "").slice(0, 10))}${a.transaction_next_attempt ? ` · next attempt ${escapeHtml(a.transaction_next_attempt)}` : ""}</small>` : `<span>No remarks</span>`}${!row.stable ? `<small>Activity needs a permanent ID before editing.</small>` : ""}</div>${!manager ? `<div class="neglected-v2-actions">${row.lead.phone ? `<a class="primary-button" href="tel:${escapeHtml(String(row.lead.phone).replace(/[^+\d*#,;]/g, ""))}" aria-label="Call ${escapeHtml(row.lead.company_name || "company")}">Call</a>` : `<button type="button" disabled title="No phone number saved">Call</button>`}<button type="button" class="ghost-button" data-neglected-task="${escapeHtml(row.lead.id)}">Task</button>${row.stable ? `<button type="button" class="ghost-button" data-neglected-edit="${row.index}">${a.transaction_remarks ? "Edit remarks" : "Add remarks"}</button>` : ""}</div>` : ""}</div>
      ${editor ? `<form class="neglected-v2-editor" data-neglected-form><label>${outcomeLabel(editor.status)}<select name="outcome" required><option value="">Choose...</option>${neglectedOutcomes[editor.status].map(outcome => `<option value="${escapeHtml(outcome)}" ${editor.outcome === outcome ? "selected" : ""}>${escapeHtml(outcome)}</option>`).join("")}</select></label>${editor.status === "pending" ? `<label>Next attempt<input type="date" name="next_attempt" value="${escapeHtml(editor.nextAttempt)}" required></label>` : ""}<label>Remarks <span>required</span><textarea name="remarks" maxlength="4000" required placeholder="Add a note for management">${escapeHtml(editor.remarks)}</textarea></label><div><button type="submit" class="primary-button" data-neglected-save disabled>Save update</button><button type="button" class="ghost-button" data-neglected-cancel>Cancel</button><p role="alert">${escapeHtml(editor.error || "")}</p></div></form>` : ""}</article>`;
    }).join("")}</section><form class="neglected-v2-assistant"><label class="sr-only" for="neglectedQuestion">Ask the AI Assistant</label><input id="neglectedQuestion" placeholder="Ask the AI Assistant about these accounts" maxlength="4000"><span class="neglected-assistant-host"></span></form>`;
  const form = workspace.querySelector("[data-neglected-form]");
  if (form) updateNeglectedSaveButton(form);
  arrangeAssistantLauncher(false);
}

function updateNeglectedSaveButton(form) {
  const button = form.querySelector("[data-neglected-save]");
  if (button) button.disabled = !form.elements.outcome.value || !form.elements.remarks.value.trim() || Boolean(form.elements.next_attempt && !form.elements.next_attempt.value);
}

async function loadNeglectedWorkspace(request) {
  try {
    const result = await api("/api/salesperson-ai-actions", {
      method: "POST", body: JSON.stringify({ action: "pipeline_health" })
    });
    if (!Array.isArray(result.metrics?.contact_overdue_companies) && request.leads.length) {
      throw new Error("Contact-frequency details are unavailable. Please retry.");
    }
    request.metrics = result.metrics || { contact_overdue_companies: [] };
  } catch (error) {
    request.error = error.message || "Neglected accounts could not be loaded.";
  } finally {
    request.loading = false;
    if (neglectedWorkspace === request && isSalesmanRole()
      && String(state.currentUser?.id || state.currentUser?.email) === request.owner
      && currentView === "neglected") renderAiWorkspace();
  }
}

function neglectedAccountRows(metrics) {
  const visible = new Map(salesmanDashboardLeads().map(lead => [String(lead.id), lead]));
  return (metrics?.contact_overdue_companies || []).filter(company => visible.has(String(company.id)))
    .map(company => ({ ...company, lead: visible.get(String(company.id)) }))
    .sort((a, b) => Number(b.contact_overdue_by == null) - Number(a.contact_overdue_by == null)
      || Number(b.contact_overdue_by || 0) - Number(a.contact_overdue_by || 0)
      || String(a.lead.company_name || "").localeCompare(String(b.lead.company_name || "")));
}

function renderNeglectedWorkspace(workspace) {
  const owner = String(state.currentUser.id || state.currentUser.email);
  const leadsBusy = !state.leadsLoaded && !state.leadsError;
  const leadsFailed = state.leadsError && !state.leadsLoaded;
  if (!leadsBusy && !leadsFailed && (!neglectedWorkspace || neglectedWorkspace.owner !== owner || neglectedWorkspace.leads !== state.leads)) {
    neglectedWorkspace = { owner, leads: state.leads, loading: true, error: "", metrics: null };
    loadNeglectedWorkspace(neglectedWorkspace);
  }
  const result = neglectedWorkspace?.owner === owner ? neglectedWorkspace : null;
  const busy = Boolean(leadsBusy || result?.loading);
  const error = leadsFailed ? state.leadsError : result?.error;
  const rows = !busy && !error ? neglectedAccountRows(result?.metrics) : [];
  const known = rows.filter(row => row.contact_overdue_by != null);
  const worst = known[0];
  const tierOne = rows.filter(row => String(row.lead.tier || "2") === "1").length;
  workspace.setAttribute("aria-busy", String(busy));
  workspace.innerHTML = `
    <div class="crm-neglected-toolbar"><span>Territory ${escapeHtml(state.currentUser.territory || "Not set")}</span><button type="button" class="ghost-button crm-neglected-tools" data-neglected-tools aria-expanded="${neglectedToolsOpen}" aria-controls="smartSearchShell">Tools</button><button type="button" class="ghost-button" data-workspace-view="dashboard" aria-label="Back to Dashboard">Back to Dashboard</button></div>
    <div class="crm-neglected-stats" aria-label="Neglected account summary">
      <article><span>Accounts overdue</span><strong class="is-overdue">${busy || error ? "—" : rows.length}</strong><small>Past their expected contact date</small></article>
      <article><span>Most overdue</span><strong>${busy || error || !worst ? "—" : `${Number(worst.contact_overdue_by)} d`}</strong><small>${escapeHtml(busy ? "Loading contact history" : worst?.lead.company_name || (rows.length ? "No activity date recorded" : "No overdue accounts"))}</small></article>
      <article><span>Tier 1 overdue</span><strong>${busy || error ? "—" : tierOne}</strong><small>High-value accounts needing contact</small></article>
    </div>
    <section class="crm-neglected-panel" aria-labelledby="aiWorkspaceHeading">
      <div class="crm-neglected-source"><button class="ghost-button" type="button" data-workspace-portfolio-action="neglected" ${busy || error || state.dailyAiLoading ? "disabled" : ""}>AI answer</button><span>Built from: activity log, tier and status rules · sorted by days overdue</span></div>
      <h2 id="aiWorkspaceHeading" class="sr-only">Neglected accounts</h2>
      ${busy ? `<p class="crm-neglected-state" role="status">Loading contact-frequency details...</p>` : error ? `<div class="crm-neglected-state" role="alert"><p>${escapeHtml(error)}</p><button class="ghost-button" type="button" data-neglected-retry>Retry</button></div>` : !rows.length ? `<p class="crm-neglected-state">No accounts are past their expected contact frequency.</p>` : `<div class="crm-neglected-table-wrap"><table class="crm-neglected-table"><thead><tr><th>Company</th><th>Status</th><th>Tier</th><th>Last activity</th><th>Expected</th><th>Overdue</th><th>Actions</th></tr></thead><tbody>${rows.map(row => {
        const lead = row.lead;
        const status = stageDisplayLabel(lead.stage || "NEW");
        const last = row.days_since_activity == null ? "No activity recorded" : `${Number(row.days_since_activity)} days ago`;
        const overdue = row.contact_overdue_by == null ? "Unknown" : `${Number(row.contact_overdue_by)} d`;
        return `<tr><td><button type="button" class="crm-neglected-company" data-neglected-lead="${escapeHtml(lead.id)}">${escapeHtml(lead.company_name || "Unnamed company")}<span class="crm-neglected-mobile-meta">${escapeHtml(status)} · Tier ${escapeHtml(lead.tier || "2")} · ${escapeHtml(last)}</span></button><span class="crm-neglected-mobile-gap">${row.contact_overdue_by == null ? "No recorded contact" : `${escapeHtml(overdue)} overdue`} · every ${Number(row.expected_contact_days)} d</span></td><td><span class="crm-neglected-status">${escapeHtml(status)}</span></td><td><span class="crm-neglected-tier">Tier ${escapeHtml(lead.tier || "2")}</span></td><td>${escapeHtml(last)}</td><td>every ${Number(row.expected_contact_days)} days</td><td class="is-overdue">${escapeHtml(overdue)}</td><td><div class="crm-neglected-actions"><button class="primary-button" type="button" data-neglected-log="${escapeHtml(lead.id)}" aria-label="Log call for ${escapeHtml(lead.company_name || "company")}"><span>Log call</span></button><button class="ghost-button" type="button" data-neglected-task="${escapeHtml(lead.id)}">Task</button></div></td></tr>`;
      }).join("")}</tbody></table></div>`}
    </section>`;
}

let meetingBriefState = null;

function meetingBriefSections(output) {
  const sections = Object.create(null);
  let heading = "Brief";
  for (const line of String(output || "").split(/\r?\n/)) {
    if (/^##\s+/.test(line)) heading = line.replace(/^##\s+/, "").trim();
    else sections[heading] = `${sections[heading] || ""}${line}\n`;
  }
  return sections;
}

function openMeetingBriefPage(lead) {
  if (!lead || !state.leads.some(item => item.id === lead.id)) return;
  const existing = state.aiAction.scope === "company" && state.aiAction.leadId === lead.id
    && ["prepare", "prepare_meeting"].includes(state.aiAction.action) ? state.aiAction : null;
  meetingBriefState = { owner: String(state.currentUser.id), leadId: lead.id,
    output: existing?.output || "", provider: existing?.provider || "", loading: false,
    error: "", generatedAt: existing?.generatedAt || "", checked: new Set() };
  els.aiActionDialog?.close();
  state.meetingRouteLeadId = currentView === "lead" ? String(lead.id) : "";
  setView("meeting-prep");
}

async function generateMeetingBrief(lead) {
  if (!lead || meetingBriefState?.loading) return;
  if (!state.leads.some(item => String(item.id) === String(lead.id)) || state.meetingRouteLeadId && String(lead.id) !== state.meetingRouteLeadId) return;
  if (!navigator.onLine) return setToast("AI briefings need a connection.", "error");
  if (Date.now() < state.aiCooldownUntil) return setToast("Please wait a few seconds before running another AI action.", "error");
  const request = { owner: String(state.currentUser.id), leadId: lead.id, loading: true,
    output: "", provider: "", error: "", generatedAt: "", checked: meetingBriefState?.checked || new Set() };
  meetingBriefState = request;
  renderAiWorkspace();
  try {
    const result = await api(`/api/leads/${encodeURIComponent(lead.id)}/ai-actions`, {
      method: "POST", body: JSON.stringify({ action: "prepare" })
    });
    request.output = result.output || "";
    request.provider = result.provider || "";
    request.generatedAt = new Date().toISOString();
    if (!request.output) request.error = "No brief was returned. Please try again.";
    state.aiCooldownUntil = Date.now() + 3000;
  } catch {
    request.error = "Couldn't generate this right now. Please try again.";
  } finally {
    request.loading = false;
    if (meetingBriefState === request && String(state.currentUser?.id) === request.owner && currentView === "meeting-prep") renderAiWorkspace();
  }
}

function renderMeetingBriefWorkspace(workspace) {
  const launcher = document.querySelector("#aiAssistantLauncher");
  const owner = String(state.currentUser.id);
  const leads = [...state.leads].sort((a, b) => String(a.company_name || "").localeCompare(String(b.company_name || "")));
  if (meetingBriefState?.owner !== owner) meetingBriefState = null;
  const parentId = state.meetingRouteLeadId;
  if (parentId && meetingBriefState?.leadId !== parentId) {
    const parentLead = leads.find(item => String(item.id) === parentId);
    meetingBriefState = parentLead ? {owner,leadId:parentId,output:"",provider:"",loading:false,error:"",generatedAt:"",checked:new Set()} : null;
  }
  const lead = leads.find(item => String(item.id) === meetingBriefState?.leadId);
  if (meetingBriefState && !lead && state.leadsLoaded) meetingBriefState = null;
  const brief = lead ? meetingBriefState : null;
  const busy = Boolean(brief?.loading || state.leadsLoading && !state.leadsLoaded);
  const sections = meetingBriefSections(brief?.output);
  const section = title => sections[title]?.trim() ? simpleMarkdown(sections[title]) : "<p>No data returned in this brief.</p>";
  const known = ["Recommended ask", "Talking points", "Relationship snapshot", "What happened last time", "Open items", "Recent intelligence"];
  const additional = Object.entries(sections).filter(([title, text]) => !known.includes(title) && text.trim());
  const contextSections = ["Relationship snapshot", "Open items"].filter(title => sections[title]?.trim());
  const list = value => (Array.isArray(value) ? value.filter(item => typeof item === "string").join(", ") : typeof value === "string" ? value : "") || "Not recorded";
  const facts = lead && parentId ? [
    ["Phone",lead.phone || "Not recorded"],
    ["Last activity",lead.last_activity ? formatDisplayDate(lead.last_activity) : "Not recorded"],
    ["Contact every",lead.expected_contact_days ? `${lead.expected_contact_days} days (Tier ${lead.tier || "2"})` : "Not recorded"],
    ["Named contact",lead.contact_person || lead.contact_name || "Not recorded"],
    ["Competitors",list(lead.competitors_likely_using)],
    ["Recorded certifications",list(lead.certifications)]
  ] : lead ? [
    ["Status", stageDisplayLabel(lead.stage)], ["Current CRM health", lead.health?.label || "Not available"],
    ["Last activity", lead.last_activity ? formatDisplayDate(lead.last_activity) : "Not recorded"],
    ["Named contact", lead.contact_person || lead.contact_name || "Not recorded"],
    ["Competitors", list(lead.competitors_likely_using)],
    ["Recorded certifications", list(lead.certifications)]
  ] : [];
  const healthTone = { RED: "is-risk", AMBER: "is-watch", GREEN: "is-healthy" }[lead?.health?.label] || "";
  const factValue = (label, value) => {
    if (label === "Phone" && value !== "Not recorded") return `<a href="tel:${escapeHtml(value)}">${escapeHtml(value)}</a>`;
    if (label === "Current CRM health" && state.meetingRouteLeadId && lead) {
      const health = recordRelationshipHealth(lead);
      return `<span class="meeting-health-badge ${({red:"is-risk",amber:"is-watch",green:"is-healthy"})[health.tone] || ""}">${health.label}</span>`;
    }
    if (label === "Status") return `<span class="meeting-status-badge">${escapeHtml(value)}</span>`;
    if (label === "Current CRM health" && healthTone) return `<span class="meeting-health-badge ${healthTone}">${escapeHtml(value)}</span>`;
    if (label === "Last activity" && lead?.last_activity && !Number.isNaN(new Date(lead.last_activity).getTime())) {
      const age = daysSince(lead.last_activity);
      return `${escapeHtml(value)}${age >= 0 ? ` <span class="meeting-activity-age">· ${age === 0 ? "today" : `${age} days ago`}</span>` : ""}`;
    }
    return value === "Not recorded" || value === "Not available" ? `<em class="meeting-missing">${value}</em>` : escapeHtml(value);
  };
  const checklist = ["Confirm procurement contact and number", "Confirm a live project and steel requirements", "Confirm required compliance documents", "Confirm the current supplier"];
  const backHref = parentId ? leadRouteUrl(parentId) : "/?view=ai-actions";
  const parentHealth = parentId && lead ? recordRelationshipHealth(lead) : null;
  workspace.setAttribute("aria-busy", String(busy));
  workspace.innerHTML = `
    <nav class="meeting-breadcrumb" aria-label="Meeting brief breadcrumb"><button type="button" class="ghost-button meeting-menu" data-meeting-menu aria-label="Open navigation menu">Menu</button>${parentId ? `<a href="/?view=pipeline">Pipeline</a><span>/</span><button class="record-text-action" type="button" data-meeting-parent>${escapeHtml(lead?.company_name || "Lead details")}</button>` : '<a href="/?view=ai-actions">AI actions</a>'}<span>/</span><span>Prepare meeting</span></nav>
    <header class="meeting-heading"><a class="ghost-button meeting-back" href="${escapeHtml(backHref)}" aria-label="${parentId ? "Back to Lead Details" : "Back to AI actions"}" title="${parentId ? "Back to Lead Details" : "Back to AI actions"}"></a><div class="meeting-heading-copy"><span class="meeting-mobile-company">${lead ? escapeHtml(lead.company_name) : "Choose a company"}</span><h2 id="aiWorkspaceHeading"><span class="meeting-title-full">Prepare me for this </span><span class="meeting-title-short">Prepare for </span><em>meeting</em></h2></div><div class="meeting-company-meta"><a class="meeting-mobile-origin" href="${escapeHtml(backHref)}">${parentId ? "From lead details" : "From AI actions"}</a><strong>${lead ? escapeHtml(lead.company_name) : "Choose a company"}</strong>${parentHealth ? `<span class="meeting-status-badge">${escapeHtml(stageDisplayLabel(lead.stage))}</span><span class="meeting-health-badge ${({red:"is-risk",amber:"is-watch",green:"is-healthy"})[parentHealth.tone] || ""}">${parentHealth.label}</span>` : ""}${brief?.generatedAt ? `<span class="meeting-generated-at">· Generated ${escapeHtml(new Date(brief.generatedAt).toLocaleString("en-GB", { timeZone: "Asia/Dubai" }))}</span>` : ""}${!parentId && brief?.output ? `<button class="ghost-button meeting-company-change" type="button" data-meeting-change aria-controls="meetingCompanyPicker" aria-expanded="false"><span class="meeting-title-full">Change company</span><span class="meeting-title-short">Change</span></button>` : ""}${lead ? `<a class="meeting-open-lead" href="${escapeHtml(leadRouteUrl(lead.id))}">Open lead</a>` : ""}</div>
      ${parentId ? '<button class="ghost-button meeting-parent-back" type="button" data-meeting-parent>Back to lead</button>' : ""}<button class="ghost-button meeting-regenerate" type="button" data-meeting-generate aria-label="${brief?.output ? "Regenerate brief" : "Generate brief"}" title="${brief?.output ? "Regenerate brief" : "Generate brief"}" ${!lead || busy ? "disabled" : ""}><span>${brief?.output ? "Regenerate" : "Generate brief"}</span></button><div class="meeting-toolbar"><button class="ghost-button" type="button" data-meeting-copy ${!brief?.output || busy ? "disabled" : ""}><span class="meeting-title-full">Copy brief</span><span class="meeting-title-short">Copy</span></button><button class="primary-button" type="button" data-meeting-log ${!lead || busy ? "disabled" : ""}>Log meeting</button></div></header>
    ${lead ? `<div class="meeting-mobile-summary">${factValue("Status", stageDisplayLabel(lead.stage))}${factValue("Current CRM health", lead.health?.label || "Not available")}<span>Last contact ${factValue("Last activity", lead.last_activity ? formatDisplayDate(lead.last_activity) : "Not recorded")}</span></div>` : ""}
    ${parentId ? "" : `<div id="meetingCompanyPicker" class="meeting-company${brief?.output ? " hidden" : ""}"><label for="aiWorkspaceCompany">Company</label><select id="aiWorkspaceCompany" ${state.leadsLoading && !state.leadsLoaded || !leads.length ? "disabled" : ""}><option value="">Choose a company</option>${leads.map(item => `<option value="${escapeHtml(String(item.id))}" ${item.id === lead?.id ? "selected" : ""}>${escapeHtml(item.company_name || "Unnamed company")}</option>`).join("")}</select></div>`}
    ${state.leadsError ? `<p class="crm-ai-workspace-error" role="alert">${escapeHtml(state.leadsError)}</p><button class="ghost-button" type="button" data-workspace-retry>Retry loading companies</button>` : ""}
    ${busy ? `<p class="meeting-state" role="status">Preparing your brief from CRM records...</p>` : brief?.error ? `<p class="crm-ai-workspace-error" role="alert">${escapeHtml(brief.error)}</p>` : ""}
    ${!lead ? `<p class="meeting-state" role="status">${parentId ? busy ? "Loading lead details..." : "This lead is unavailable or you do not have access." : leads.length ? "Choose a company to prepare its meeting brief." : "No visible companies are available."}</p>` : `
    <div class="meeting-layout"><div class="meeting-main">
      <section class="meeting-ask"><span class="meeting-target" aria-hidden="true"></span><div><h3>Your one ask</h3>${brief?.output ? section("Recommended ask") : `<p>Generate a brief to see the recommended ask.</p>`}</div></section>
      <section class="meeting-panel meeting-talking"><h3>Talking points</h3>${brief?.output ? section("Talking points") : `<p>No brief generated yet.</p>`}</section>
      <section class="meeting-panel meeting-evidence"><header><span class="meeting-ai-badge">${brief?.provider === "fallback" ? "CRM fallback" : brief?.output ? "AI answer" : "Brief sources"}</span><span class="meeting-title-full">Company record, activity history, PMRs and matched intelligence</span><span class="meeting-title-short">Record, activity, PMRs, intel</span></header>
        ${brief?.provider === "fallback" ? `<p class="meeting-provenance">CRM-data fallback was used. Review before acting.</p>` : ""}
        ${brief?.output ? `<div class="meeting-evidence-row"><h4>History</h4><div>${section("What happened last time")}</div></div>` : `<p>Generate a brief to review its supporting context.</p>`}
        ${parentId ? `<div class="meeting-evidence-row"><h4>Latest note</h4><p>${escapeHtml(lead.notes || "No note recorded.")}</p></div>` : ""}
        <div class="meeting-evidence-row"><h4>Last PMR</h4><div><a href="${escapeHtml(leadRouteUrl(lead.id, "pmr"))}">Review PMRs in the company record</a></div></div>
        ${brief?.output ? `<div class="meeting-evidence-row"><h4>Recent intel</h4><div>${section("Recent intelligence")}</div></div>` : ""}
        <div class="meeting-evidence-row"><h4>Quote reference</h4><p>${escapeHtml(lead.quotation_ref || "Not recorded")}</p></div>
        ${contextSections.length || additional.length ? `<details class="meeting-extra-context"><summary>More brief context</summary>${contextSections.map(title => `<div class="meeting-evidence-row"><h4>${escapeHtml(title)}</h4><div>${section(title)}</div></div>`).join("")}${additional.map(([title, text]) => `<div class="meeting-evidence-row"><h4>${escapeHtml(title)}</h4><div>${simpleMarkdown(text)}</div></div>`).join("")}</details>` : ""}
      </section></div><aside class="meeting-side">
      <section class="meeting-panel meeting-facts"><h3>Key <em>facts</em></h3><dl>${facts.map(([label, value]) => `<div><dt>${label}</dt><dd>${factValue(label, value)}</dd></div>`).join("")}</dl></section>
      <section class="meeting-panel meeting-checklist"><h3>Find out in this meeting</h3><p>Working checklist · not saved</p>${checklist.map((text, index) => `<label><input type="checkbox" data-meeting-check="${index}" ${brief?.checked.has(String(index)) ? "checked" : ""}><span>${text}</span></label>`).join("")}</section>
      <section class="meeting-panel meeting-after"><h3>After the meeting</h3><button class="ghost-button" type="button" data-meeting-log>Log the meeting outcome</button><button class="ghost-button" type="button" data-meeting-pmr>File a PMR with heat score</button></section>
    </aside></div><div class="meeting-footer"><span class="meeting-assistant-host"></span></div>`}
  `;
  if (launcher) workspace.querySelector(".meeting-assistant-host")?.appendChild(launcher);
}

function renderOneTapWorkspace(workspace, leads, selectedCompany, busy) {
  const shortcuts = leads.filter(lead => lead.next_action_date && daysUntil(lead.next_action_date) < 0)
    .sort((a, b) => new Date(a.next_action_date) - new Date(b.next_action_date)).slice(0, 3);
  const portfolioHints = {
    focus_today: "Your priority accounts to contact, with the reason for each",
    neglected: "Accounts past their expected contact date",
    pipeline_health: "Where deals are stuck and why",
    new_intel: "News and research matched to your prospects"
  };
  const companyActions = [
    ["prepare", "Prepare me for this meeting", "History, latest PMR, intel, quote reference, talking points and one recommended ask"],
    ["next", "What should I do next?", "The next action and why"],
    ["email", "Draft follow-up email", "A draft from your CRM records, for your review"],
    ["summary", "Summarise for handoff", "A relationship recap for a colleague or the director"],
    ["flag", "Flag needs attention", "Review the account before notifying the director"]
  ];
  const portfolioCard = action => `<button class="ghost-button crm-ai-action-card crm-onetap-${action}" type="button" data-workspace-portfolio-action="${action}" ${busy || state.dailyAiLoading ? "disabled" : ""}><span class="crm-onetap-icon" aria-hidden="true"><span></span></span><span class="crm-onetap-card-copy"><strong>${escapeHtml(SALESPERSON_ACTION_LABELS[action])}</strong><small><span class="crm-onetap-desktop-copy">${portfolioHints[action]}</span>${action === "focus_today" ? '<span class="crm-onetap-mobile-copy">Priority accounts, with reasons</span>' : ""}</small></span>${action === "focus_today" ? '<span class="crm-onetap-chevron" aria-hidden="true"></span>' : ""}</button>`;
  workspace.setAttribute("aria-busy", String(busy));
  workspace.innerHTML = `
    <header class="crm-onetap-heading"><button type="button" class="ghost-button crm-onetap-back" data-workspace-view="dashboard" aria-label="Back to dashboard" title="Back to dashboard"></button><div><h2 id="aiWorkspaceHeading">One-tap AI <em>actions</em></h2><p><span class="crm-onetap-desktop-copy">Answers built only from the CRM records you can see. No typing needed.</span><span class="crm-onetap-mobile-copy">From the CRM records you can see</span></p></div></header>
    ${isSalesmanRole() ? `<section class="crm-onetap-section" aria-label="Portfolio intelligence"><header class="crm-onetap-section-heading"><h3>Your <em>day</em></h3><p>Across your visible accounts${state.currentUser.territory ? ` · ${escapeHtml(state.currentUser.territory)}` : ""}</p></header>${portfolioCard("focus_today")}<div class="crm-onetap-day-grid">${["neglected", "pipeline_health", "new_intel"].map(portfolioCard).join("")}</div></section>` : ""}
    <section class="crm-onetap-section" aria-label="Company intelligence"><h3>One <em>company</em></h3>
      <div class="crm-onetap-company-body">
      <div class="crm-onetap-company-row"><div class="crm-onetap-picker"><label for="aiWorkspaceCompany">Company</label><select id="aiWorkspaceCompany" ${busy || !leads.length ? "disabled" : ""}><option value="">Choose a company</option>${leads.map(lead => `<option value="${escapeHtml(String(lead.id))}" ${String(lead.id) === selectedCompany ? "selected" : ""}>${escapeHtml(lead.company_name || "Unnamed company")}</option>`).join("")}</select></div>
      ${!busy && shortcuts.length ? `<div class="crm-onetap-shortcuts"><span>Overdue follow-ups</span><div>${shortcuts.map(lead => `<button class="ghost-button" type="button" data-workspace-pick="${escapeHtml(String(lead.id))}">${escapeHtml(lead.company_name || "Unnamed company")}</button>`).join("")}</div></div>` : ""}</div>
      <p class="crm-ai-workspace-status" aria-live="polite">${busy ? "Loading your visible companies..." : selectedCompany ? "Company actions are ready." : leads.length ? "Choose a company to enable its actions." : "No visible companies are available. Add a lead or check your current assignment."}</p>
      <div class="crm-onetap-company-grid">${companyActions.map(([action, title, hint]) => `<button class="ghost-button crm-ai-action-card crm-onetap-${action}" type="button" data-workspace-company-action="${action}" ${!selectedCompany || busy ? "disabled" : ""}><span class="crm-onetap-icon" aria-hidden="true"><span></span></span><span class="crm-onetap-card-copy"><strong>${title}</strong><small><span class="crm-onetap-desktop-copy">${hint}</span>${action === "prepare" ? '<span class="crm-onetap-mobile-copy">Brief, talking points, one ask</span>' : ""}</small></span>${action === "prepare" ? '<span class="crm-onetap-chevron" aria-hidden="true"></span>' : ""}</button>`).join("")}</div>
      </div>
    </section>
    ${state.leadsError ? `<p class="crm-ai-workspace-error" role="alert">${escapeHtml(state.leadsError)}</p><button class="ghost-button" type="button" data-workspace-retry>Retry loading companies</button>` : ""}
    <form class="crm-onetap-assistant"><p>Not here? Ask the AI Assistant about your accounts</p><input class="crm-onetap-assistant-input" type="text" aria-label="Ask the AI Assistant" placeholder="Ask the AI Assistant..." maxlength="4000"><span class="crm-onetap-assistant-host"></span></form>`;
}

let emailDraftState = null;

function newEmailDraft(lead) {
  return { owner: String(state.currentUser.id), leadId: String(lead.id), to: lead.email || lead.contact_email || "",
    cc: "", showCc: false, subject: "", body: "", tone: "formal", includeProfile: true,
    loading: false, downloading: false, dirty: false, provider: "", error: "" };
}

function emailToneBody(body, tone) {
  return String(body).replace(/^(Dear|Hello)\s+([^\n]+),/i, `${tone === "friendly" ? "Hello" : "Dear"} $2,`)
    .replace(/^(?:Kind regards|Best regards|Regards),?$/im, tone === "friendly" ? "Best regards," : "Kind regards,");
}

function emailBase64(bytes) {
  let text = "";
  for (let index = 0; index < bytes.length; index += 8192) text += String.fromCharCode(...bytes.subarray(index, index + 8192));
  return btoa(text).match(/.{1,76}/g)?.join("\r\n") || "";
}

function emailDraftMime(draft, profileBytes) {
  const addressList = value => {
    const addresses = String(value || "").split(/[,;]/).map(item => item.trim()).filter(Boolean);
    if (addresses.length > 20 || addresses.some(item => !/^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/.test(item))) throw new Error("Enter valid email addresses, separated by commas.");
    return addresses.join(", ");
  };
  const to = addressList(draft.to);
  const cc = addressList(draft.cc);
  if (!to || !draft.subject.trim() || !draft.body.trim()) throw new Error("Complete the recipient, subject and email body.");
  if (/[\r\n\x00-\x1f\x7f]/.test(draft.subject)) throw new Error("The subject must be a single line.");
  const boundary = `arg-draft-${crypto.randomUUID()}`;
  // Fold encoded words independently so non-ASCII subjects remain valid RFC 2047 headers.
  const subjectWords = Array.from(draft.subject).reduce((chunks, char) => {
    if (!chunks.length || new TextEncoder().encode(chunks.at(-1) + char).length > 42) chunks.push(char);
    else chunks[chunks.length - 1] += char;
    return chunks;
  }, []).map(chunk => `=?UTF-8?B?${btoa(String.fromCharCode(...new TextEncoder().encode(chunk)))}?=`).join("\r\n ");
  const lines = ["X-Unsent: 1", "MIME-Version: 1.0", `To: ${to}`, ...(cc ? [`Cc: ${cc}`] : []),
    `Subject: ${subjectWords}`, `Content-Type: multipart/mixed; boundary="${boundary}"`, "",
    `--${boundary}`, 'Content-Type: text/plain; charset="UTF-8"', "Content-Transfer-Encoding: base64", "",
    emailBase64(new TextEncoder().encode(draft.body.replace(/\r?\n/g, "\r\n")))];
  if (draft.includeProfile) {
    if (!profileBytes?.length) throw new Error("Company profile could not be loaded. Try downloading again.");
    lines.push(`--${boundary}`, 'Content-Type: application/pdf; name="Al Ras Group - Company Profile.pdf"',
      'Content-Disposition: attachment; filename="Al Ras Group - Company Profile.pdf"', "Content-Transfer-Encoding: base64", "", emailBase64(profileBytes));
  }
  lines.push(`--${boundary}--`, "");
  return lines.join("\r\n");
}

async function generateEmailDraft() {
  const draft = emailDraftState;
  const lead = state.leads.find(item => String(item.id) === draft?.leadId);
  if (!lead || draft.owner !== String(state.currentUser?.id) || draft.loading || draft.downloading) return;
  if (draft.dirty && !window.confirm("Replace your edited subject and body with a new draft?")) return;
  draft.loading = true;
  draft.error = "";
  renderAiWorkspace();
  try {
    const result = await api(`/api/leads/${encodeURIComponent(lead.id)}/ai-actions`, { method: "POST", body: JSON.stringify({ action: "email" }) });
    if (emailDraftState !== draft || draft.owner !== String(state.currentUser?.id)) return;
    const parsed = parseEmailDraft(result.output);
    if (!parsed.body) throw new Error("No email draft returned. Please try again.");
    draft.subject = parsed.subject;
    draft.body = emailToneBody(parsed.body, draft.tone);
    draft.provider = result.provider || "";
    draft.dirty = false;
  } catch (error) { draft.error = error.message || "Could not generate the draft. Your edits have been kept."; }
  finally {
    draft.loading = false;
    if (emailDraftState === draft && currentView === "draft-email" && draft.owner === String(state.currentUser?.id)) renderAiWorkspace();
  }
}

async function downloadEmailDraft() {
  const draft = emailDraftState;
  const owner = String(state.currentUser?.id);
  if (!draft || draft.owner !== owner || draft.loading || draft.downloading || !state.leads.some(item => String(item.id) === draft.leadId)) return;
  try {
    emailDraftMime({ ...draft, includeProfile: false });
    draft.downloading = true;
    draft.error = "";
    renderAiWorkspace();
    const parts = [];
    let count = 1;
    let size = 0;
    for (let part = 0; draft.includeProfile && part < count; part++) {
      if (emailDraftState !== draft || String(state.currentUser?.id) !== owner) return;
      const response = await authenticatedFetch(`/api/leads/${encodeURIComponent(draft.leadId)}/email-profile?part=${part}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load the company profile. Please retry; no draft was downloaded.");
      count = Number(response.headers.get("X-Profile-Parts"));
      size = Number(response.headers.get("X-Profile-Size"));
      if (!Number.isInteger(count) || count < 1 || count > 32 || !Number.isInteger(size) || size < 1 || size > 32 * 1024 * 1024) throw new Error("Invalid company profile response.");
      parts.push(new Uint8Array(await response.arrayBuffer()));
    }
    if (emailDraftState !== draft || String(state.currentUser?.id) !== owner || !state.leads.some(item => String(item.id) === draft.leadId)) return;
    let bytes = null;
    if (draft.includeProfile) {
      if (parts.reduce((total, part) => total + part.length, 0) !== size) throw new Error("Incomplete company profile. Please retry.");
      bytes = new Uint8Array(size);
      let offset = 0;
      parts.forEach(part => { bytes.set(part, offset); offset += part.length; });
    }
    const blob = new Blob([emailDraftMime(draft, bytes)], { type: "message/rfc822" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Al Ras - Follow-up draft.eml";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    setToast("Email draft downloaded. Review and send it from your mail client.", "success");
  } catch (error) { draft.error = error.message || "Could not download the email draft."; }
  finally {
    draft.downloading = false;
    if (emailDraftState === draft && currentView === "draft-email" && String(state.currentUser?.id) === owner) renderAiWorkspace();
  }
}

function arrangeEmailDraftLayout() {
  const page = document.querySelector(".email-page");
  if (!page) return;
  const mobile = window.matchMedia("(max-width: 700px)").matches;
  const tones = page.querySelector(".email-tones");
  const profile = page.querySelector(".email-attach");
  const toneHost = page.querySelector(mobile ? ".email-mobile-tone-host" : ".email-adjust-fieldset");
  if (tones && toneHost) {
    if (mobile) toneHost.appendChild(tones);
    else toneHost.insertBefore(tones, toneHost.querySelector(".email-tone-note"));
  }
  const profileHost = page.querySelector(mobile ? ".email-attached" : ".email-adjust-fieldset");
  if (profile && profileHost) profileHost.appendChild(profile);
  const details = page.querySelector(".email-delivery-details");
  if (details && page.dataset.mobileLayout !== String(mobile)) details.open = !mobile;
  page.dataset.mobileLayout = String(mobile);
}

window.matchMedia("(max-width: 700px)").addEventListener("change", () => {
  if (currentView === "draft-email") arrangeEmailDraftLayout();
});

function renderEmailDraftWorkspace(workspace) {
  const owner = String(state.currentUser.id);
  const leads = [...state.leads].sort((a, b) => String(a.company_name || "").localeCompare(String(b.company_name || "")));
  if (emailDraftState?.owner !== owner || state.leadsLoaded && !leads.some(item => String(item.id) === emailDraftState?.leadId)) emailDraftState = null;
  const parentId = state.emailRouteLeadId;
  if (parentId && emailDraftState?.leadId !== parentId) {
    const parentLead = leads.find(item => String(item.id) === parentId);
    emailDraftState = parentLead ? newEmailDraft(parentLead) : null;
  }
  const draft = emailDraftState;
  const lead = leads.find(item => String(item.id) === draft?.leadId);
  const busy = Boolean(draft?.loading || draft?.downloading);
  const disabled = !lead || busy ? "disabled" : "";
  workspace.setAttribute("aria-busy", String(busy));
  workspace.innerHTML = `<div class="email-page">
    <nav class="email-breadcrumb" aria-label="Breadcrumb">${parentId ? '<button type="button" data-email-parent>Lead details</button>' : '<button type="button" data-workspace-view="ai-actions">AI actions</button>'}<span>/</span><span>Follow-up email</span></nav>
    <header class="email-heading"><button class="ghost-button email-mobile-back" type="button" ${parentId ? 'data-email-parent aria-label="Back to Lead Details" title="Back to Lead Details"' : 'data-workspace-view="ai-actions" aria-label="Back to AI actions" title="Back to AI actions"'}></button><div class="email-heading-copy"><span class="email-mobile-company">${escapeHtml(lead?.company_name || "Choose a company")}</span><h2 id="aiWorkspaceHeading"><span class="email-desktop-title">Draft follow-up</span><span class="email-mobile-title">Follow-up</span> <em>email</em></h2><div class="email-company"><strong>${escapeHtml(lead?.company_name || "Choose a company")}</strong><span class="email-mobile-source">${draft?.provider === "fallback" ? "CRM draft" : draft?.provider ? "AI draft" : "Draft"} · review first</span>${parentId ? "" : `<button type="button" data-email-change aria-expanded="${!draft?.body}"><span class="email-desktop-title">Change company</span><span class="email-mobile-title">Change</span></button>`}<button type="button" data-email-open ${disabled}>Open lead</button></div></div>
    <div class="email-toolbar"><button class="ghost-button" type="button" data-email-generate aria-label="${draft?.body ? "Regenerate draft" : "Generate draft"}" title="${draft?.body ? "Regenerate draft" : "Generate draft"}" ${disabled}><span>${draft?.loading ? "Generating..." : draft?.body ? "Regenerate" : "Generate draft"}</span></button><button class="ghost-button" type="button" data-email-copy ${!draft?.body || busy ? "disabled" : ""}>Copy</button></div></header>
    <div id="emailCompanyPicker" class="email-picker${parentId || draft?.body ? " hidden" : ""}"><label for="aiWorkspaceCompany">Company</label><select id="aiWorkspaceCompany" ${parentId || busy || !leads.length ? "disabled" : ""}><option value="">Choose a company</option>${leads.map(item => `<option value="${escapeHtml(String(item.id))}" ${String(item.id) === draft?.leadId ? "selected" : ""}>${escapeHtml(item.company_name || "Unnamed company")}</option>`).join("")}</select></div>
    ${parentId && !lead ? `<p role="status">${state.leadsLoading && !state.leadsLoaded ? "Loading lead..." : "This lead is unavailable or you do not have access."}</p>` : ""}
    ${state.leadsError ? `<p role="alert">${escapeHtml(state.leadsError)}</p><button type="button" class="ghost-button" data-workspace-retry>Retry loading companies</button>` : ""}
    <p class="email-status" role="status">${escapeHtml(draft?.error || (draft?.downloading ? "Preparing email with the company profile..." : draft?.loading ? "Reading CRM records and drafting your email..." : !lead ? "Choose a company to start a draft." : !draft.body ? "Generate a draft from CRM records, or write your own below." : ""))}</p>
    <div class="email-mobile-tone-host"></div><div class="email-layout"><section class="email-editor" aria-label="Email draft"><div class="email-provenance"><span>${draft?.provider === "fallback" ? "CRM draft" : draft?.provider ? "AI draft" : "Draft"}</span><small>${draft?.provider === "fallback" ? "CRM-data fallback was used. Review before sending." : draft?.provider ? "Built from CRM records. Review before sending." : "Editable email. Nothing is sent from this page."}</small></div>
    <fieldset ${disabled}><div class="email-fields"><label for="emailDraftTo">To</label><div class="email-to"><input id="emailDraftTo" data-email-field="to" type="text" inputmode="email" maxlength="1000" placeholder="recipient@example.com" value="${escapeHtml(draft?.to || "")}"><button type="button" data-email-cc aria-expanded="${Boolean(draft?.showCc)}">${draft?.showCc ? "Remove CC" : "Add CC"}</button></div>
    ${draft?.showCc ? `<label for="emailDraftCc">CC</label><input id="emailDraftCc" data-email-field="cc" type="text" inputmode="email" maxlength="1000" placeholder="Separate addresses with commas" value="${escapeHtml(draft.cc)}">` : ""}
    <label for="emailDraftSubject">Subject</label><input id="emailDraftSubject" data-email-field="subject" maxlength="240" value="${escapeHtml(draft?.subject || "")}"></div>
    <label for="emailDraftBody" class="sr-only">Email body</label><textarea id="emailDraftBody" data-email-field="body" maxlength="20000" placeholder="Write your email, or generate a draft from CRM records.">${escapeHtml(draft?.body || "")}</textarea></fieldset>
    <div class="email-attached"><span class="email-attachment-caption">Attached:</span><span class="email-attachment-caption">${draft?.includeProfile ? '<span class="email-file">Company profile (PDF) · 11 MB</span>' : 'None'}</span></div>
    <footer><small>Nothing is sent or logged when you download.</small><button class="primary-button" type="button" data-email-download ${!draft?.body.trim() || !draft?.subject.trim() || !draft?.to.trim() || busy ? "disabled" : ""}>${draft?.downloading ? "Preparing..." : '<span class="email-desktop-title">Download email draft</span><span class="email-mobile-title">Download draft</span>'}</button></footer></section>
    <aside class="email-side"><section class="email-adjust-panel"><h3>Adjust the <em>draft</em></h3><fieldset class="email-adjust-fieldset" ${disabled}><legend>Tone</legend><div class="email-tones" role="group" aria-label="Email tone">${["formal", "friendly"].map(tone => `<button type="button" data-email-tone="${tone}" aria-pressed="${(draft?.tone || "formal") === tone}" ${disabled}>${tone === "formal" ? "Formal" : "Friendly"}</button>`).join("")}</div><small class="email-tone-note">Updates the greeting and sign-off only.</small><label class="email-attach"><input type="checkbox" data-email-profile ${draft?.includeProfile ? "checked" : ""} ${disabled}><span class="email-desktop-title">Company profile (PDF)</span><span class="email-mobile-title">Company profile</span></label></fieldset></section>
    <section class="email-delivery-panel"><p class="email-mobile-note">Downloading does not send email, log activity or change reminders.</p><details class="email-delivery-details" open><summary>Draft details</summary><h3>When you download</h3><ul><li>An editable .eml file is saved to your device</li><li>${draft?.includeProfile ? "The company profile PDF is included" : "No attachments are included"}</li><li>No email is sent and no activity or reminder is changed</li></ul><p>Open or import the file in a compatible mail client, review it, then send. Some clients open .eml files read-only; use their edit or forward command. With the profile, the draft is about 16 MB; mailbox limits may apply.</p></details></section></aside></div><div class="email-assistant-host"></div></div>`;
  arrangeEmailDraftLayout();
  arrangeAssistantLauncher(false);
}

function renderAiWorkspace() {
  const workspace = document.querySelector("#aiWorkspaceView");
  const config = aiWorkspacePage();
  if (!workspace || !config || !state.currentUser) return;
  const launcher = workspace.querySelector("#aiAssistantLauncher");
  if (launcher) document.body.appendChild(launcher);
  if (currentView === "focus" && isSalesmanRole()) return renderTodayWorkspace(workspace);
  if (currentView === "neglected" && (isSalesmanRole() || isPrivilegedDashboardRole())) return renderNeglectedActivities(workspace);
  if (currentView === "meeting-prep") return renderMeetingBriefWorkspace(workspace);
  if (currentView === "draft-email") return renderEmailDraftWorkspace(workspace);
  const previousCompany = workspace.querySelector("#aiWorkspaceCompany")?.value || "";
  const leads = [...state.leads].sort((a, b) => String(a.company_name || "").localeCompare(String(b.company_name || "")));
  const selectedCompany = leads.some(lead => String(lead.id) === previousCompany) ? previousCompany : "";
  const busy = Boolean(state.leadsLoading && !state.leadsLoaded);
  if (currentView === "ai-actions") return renderOneTapWorkspace(workspace, leads, selectedCompany, busy);
  const portfolioActions = config.portfolioAction ? [config.portfolioAction] : Object.keys(SALESPERSON_ACTION_LABELS);
  const companyActions = config.companyAction ? [config.companyAction] : ["prepare", "next", "email", "summary", "flag"];
  workspace.setAttribute("aria-busy", String(busy));
  workspace.innerHTML = `
    <div class="crm-ai-workspace-heading"><h2 id="aiWorkspaceHeading">${pageTitleMarkup(config.title)}</h2>
      <div class="crm-ai-workspace-links">
        <button class="ghost-button" type="button" data-workspace-view="ai-actions">All AI actions</button>
        <button class="ghost-button" type="button" data-workspace-view="meeting-prep">Meeting preparation</button>
        <button class="ghost-button" type="button" data-workspace-view="draft-email">Draft email</button>
      </div>
    </div>
    ${isSalesmanRole() && !config.companyAction ? `<section class="crm-ai-workspace-panel" aria-label="Portfolio intelligence">
      <h3>Your daily <em class="crm-title-accent">intelligence</em></h3><div class="crm-ai-action-grid">${portfolioActions.map(action => `
        <button class="ghost-button crm-ai-action-card" type="button" data-workspace-portfolio-action="${action}" ${busy || state.dailyAiLoading ? "disabled" : ""}>${escapeHtml(SALESPERSON_ACTION_LABELS[action])}</button>
      `).join("")}</div></section>` : ""}
    ${!config.portfolioAction ? `<section class="crm-ai-workspace-panel" aria-label="Company intelligence">
      <h3>Company <em class="crm-title-accent">intelligence</em></h3>
      <label for="aiWorkspaceCompany">Company</label>
      <select id="aiWorkspaceCompany" ${busy || !leads.length ? "disabled" : ""}>
        <option value="">Choose a company</option>${leads.map(lead => `<option value="${escapeHtml(String(lead.id))}" ${String(lead.id) === selectedCompany ? "selected" : ""}>${escapeHtml(lead.company_name || "Unnamed company")}</option>`).join("")}
      </select>
      <div class="crm-ai-action-grid">${companyActions.map(action => `
        <button class="ghost-button crm-ai-action-card" type="button" data-workspace-company-action="${action}" ${!selectedCompany || busy ? "disabled" : ""}>${escapeHtml(action === "flag" ? "Flag needs attention" : AI_ACTION_LABELS[action])}</button>
      `).join("")}</div>
      <p class="crm-ai-workspace-status" aria-live="polite">${busy ? "Loading your visible companies..." : selectedCompany ? "Company actions are ready." : leads.length ? "Choose a company to enable its actions." : "No visible companies are available. Add a lead or check your current assignment."}</p>
    </section>` : ""}
    ${state.leadsError ? `<p class="crm-ai-workspace-error" role="alert">${escapeHtml(state.leadsError)}</p><button class="ghost-button" type="button" data-workspace-retry>Retry loading companies</button>` : ""}
  `;
}

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
    return `${base}<button class="primary-button" type="button" data-ai-copy>Copy brief</button><button class="ghost-button" type="button" data-ai-open-brief>Open meeting brief</button><button class="ghost-button" type="button" data-ai-save-activity>Save to activity log</button>`;
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
  els.aiActionTitle.innerHTML = pageTitleMarkup(state.aiAction.label || AI_ACTION_LABELS[action] || "AI Action");
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
  if (lead && ["prepare", "prepare_meeting"].includes(action) && currentView === "lead") {
    openMeetingBriefPage(lead);
    await generateMeetingBrief(lead);
    return;
  }
  if (lead && ["email", "profile"].includes(action)) {
    const sameDraft = emailDraftState?.owner === String(state.currentUser?.id) && emailDraftState.leadId === String(lead.id);
    if (!sameDraft) {
      if (emailDraftState?.owner === String(state.currentUser?.id) && emailDraftState.dirty && !window.confirm("Discard your edited draft and change company?")) return;
      emailDraftState = newEmailDraft(lead);
    }
    if (action === "profile") emailDraftState.includeProfile = true;
    state.emailRouteLeadId = currentView === "lead" ? String(lead.id) : "";
    setView("draft-email");
    return;
  }
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
      generatedAt: new Date().toISOString(),
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
  if (showDialog) {
    state.aiAction = { scope: "salesperson", leadId: "", action, label: SALESPERSON_ACTION_LABELS[action] || "Daily AI", output: "", loading: true, error: "", provider: "", type: "markdown", metrics: null, insight: "" };
    renderAiActionDialog();
    els.aiActionDialog?.showModal();
    startAiLoadingTicker();
  }
  try {
    const result = await api("/api/salesperson-ai-actions", {
      method: "POST",
      body: JSON.stringify({ action })
    });
    const actionResult = {
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
    if (showDialog) state.aiAction = actionResult;
    if (action === "pipeline_health" && result.metrics) state.dailyPipelineSummary = { metrics: result.metrics, insight: result.insight || "" };
    if (showDialog) state.aiCooldownUntil = Date.now() + 3000;
  } catch {
    if (showDialog) state.aiAction = { ...state.aiAction, loading: false, error: "Couldn't generate this right now. Please try again.", output: "", metrics: null };
  } finally {
    state.dailyAiLoading = false;
    if (showDialog) {
      clearInterval(startAiLoadingTicker.timer);
      renderAiActionDialog();
    }
    renderDailyAiPanel();
    document.querySelectorAll("#aiWorkspaceView [data-workspace-portfolio-action]").forEach(button => {
      button.disabled = Boolean(state.leadsLoading && !state.leadsLoaded);
    });
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
  els.flagAttentionTitle.innerHTML = pageTitleMarkup(`Flag ${lead.company_name} for director attention`);
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

function parseDelimitedValues(value) {
  if (Array.isArray(value)) return value.map(item => String(item || "").trim()).filter(Boolean);
  return String(value || "")
    .split(/[\n,;]+/)
    .map(item => item.trim())
    .filter(Boolean);
}

function productInterestSelections(value) {
  return [...new Set(parseDelimitedValues(value))];
}

function leadProductInterestOptions(extraValues = []) {
  return [...new Set([...PRODUCT_INTEREST_OPTIONS, ...productInterestSelections(extraValues)])];
}

function renderLeadProductInterestOptions(selectedValues = []) {
  const container = document.querySelector("#leadProductInterestGrid");
  if (!container) return;
  const selected = new Set(productInterestSelections(selectedValues));
  container.innerHTML = leadProductInterestOptions(selectedValues).map(option => `
    <label class="lead-product-interest-option">
      <input type="checkbox" name="product_interest" value="${escapeHtml(option)}" ${selected.has(option) ? "checked" : ""}>
      <span>${escapeHtml(option)}</span>
    </label>
  `).join("");
}

function selectedLeadProductInterests() {
  return [...document.querySelectorAll('#leadProductInterestGrid input[name="product_interest"]:checked')]
    .map(input => input.value.trim())
    .filter(Boolean);
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

function resetLeadWizardState() {
  state.leadFormStep = 0;
  state.leadFormDetailsOpen = { company: false, contact: false, followup: false };
}

function setLeadFormMode(mode = "create") {
  const title = document.querySelector("#leadFormTitle");
  const subtitle = document.querySelector("#leadFormSubtitle");
  if (title) {
    title.innerHTML = pageTitleMarkup(mode === "edit" ? "Edit Lead" : "Add New Lead");
  }
  if (subtitle) {
    subtitle.textContent = mode === "edit"
      ? "Review the essentials first, then expand only the extra details you want to refine."
      : "Create once, then guide the team through contact capture and follow-up without the clutter.";
  }
  if (els.leadSubmitButton) {
    els.leadSubmitButton.textContent = mode === "edit" ? "Save Changes" : "Save Lead";
  }
}

function activityRecordingElapsedSeconds(session = activityModalRecorder) {
  if (!session?.startedAt) return 0;
  const end = session.pausedAt || Date.now();
  return Math.max(0, Math.floor((end - session.startedAt - (session.pausedDuration || 0)) / 1000));
}

function renderActivityRecordingElapsed() {
  if (!els.activityVoiceElapsed) return;
  const seconds = activityRecordingElapsedSeconds();
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  els.activityVoiceElapsed.textContent = `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  els.activityVoiceElapsed.setAttribute("datetime", `PT${seconds}S`);
}

function clearActivityRecordingTimer() {
  clearInterval(activityModalElapsedTimer);
  activityModalElapsedTimer = null;
}

function setActivityVoiceState(status, message) {
  if (!els.activityRecordVoice) return;
  const labels = {
    ready: "Record Voice Note",
    recording: "Recording Voice Note",
    paused: "Recording Paused",
    processing: "Processing Voice Note",
    completed: "Record Another Voice Note",
    failed: "Retry Voice Note"
  };
  els.activityRecordVoice.dataset.state = status;
  els.activityRecordVoice.textContent = labels[status] || labels.ready;
  els.activityRecordVoice.disabled = ["recording", "paused", "processing"].includes(status);
  els.activityVoiceControls?.classList.toggle("hidden", !["recording", "paused"].includes(status));
  if (els.activityPauseVoice) {
    els.activityPauseVoice.textContent = status === "paused" ? "Resume" : "Pause";
    els.activityPauseVoice.disabled = !["recording", "paused"].includes(status);
  }
  if (els.activityStopVoice) els.activityStopVoice.disabled = !["recording", "paused"].includes(status);
  if (els.activityCancelVoice) els.activityCancelVoice.disabled = !["recording", "paused"].includes(status);
  if (els.activityVoiceStatus) els.activityVoiceStatus.textContent = message;
  if (!["recording", "paused"].includes(status)) clearActivityRecordingTimer();
  renderActivityRecordingElapsed();
}

function activityModalIsBusy() {
  return activityModalSaving || Boolean(activityModalRecorder);
}

function stopActivityRecordingTracks(session = activityModalRecorder) {
  session?.stream?.getTracks?.().forEach(track => track.stop());
}

function resetActivityVoiceRecorder() {
  const session = activityModalRecorder;
  if (session) {
    session.cancelled = true;
    if (session.recorder?.state && session.recorder.state !== "inactive") {
      session.recorder.stop();
    }
    stopActivityRecordingTracks(session);
  }
  activityModalRecorder = null;
  activityModalLastTranscript = "";
  clearActivityRecordingTimer();
  if (els.activityVoiceElapsed) {
    els.activityVoiceElapsed.textContent = "00:00";
    els.activityVoiceElapsed.setAttribute("datetime", "PT0S");
  }
  setActivityVoiceState("ready", "Ready. Record in any supported language; the English transcript will be added to Notes.");
}

async function startActivityVoiceRecording() {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    setActivityVoiceState("failed", "Voice recording is not supported in this browser.");
    return;
  }
  if (activityModalRecorder || activityModalSaving) return;

  setActivityVoiceState("ready", "Requesting microphone permission...");
  let stream = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks = [];
    const mimeType = recorderMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const session = {
      recorder,
      stream,
      chunks,
      cancelled: false,
      startedAt: Date.now(),
      pausedAt: 0,
      pausedDuration: 0
    };
    activityModalRecorder = session;

    recorder.addEventListener("dataavailable", event => {
      if (event.data.size) session.chunks.push(event.data);
    });
    recorder.addEventListener("pause", () => {
      session.pausedAt = Date.now();
      setActivityVoiceState("paused", "Paused. Resume, stop, or cancel the voice note.");
    });
    recorder.addEventListener("resume", () => {
      if (session.pausedAt) session.pausedDuration += Date.now() - session.pausedAt;
      session.pausedAt = 0;
      setActivityVoiceState("recording", "Recording. Speak naturally in any supported language.");
      activityModalElapsedTimer = setInterval(renderActivityRecordingElapsed, 250);
    });
    recorder.addEventListener("stop", async () => {
      clearActivityRecordingTimer();
      stopActivityRecordingTracks(session);
      if (session.cancelled) {
        if (activityModalRecorder === session) activityModalRecorder = null;
        setActivityVoiceState("ready", "Recording cancelled. No audio was saved.");
        return;
      }

      setActivityVoiceState("processing", "Processing speech and converting the final transcript to English...");
      try {
        const transcript = await transcribeRecording(new Blob(session.chunks, { type: recorder.mimeType || "audio/webm" }));
        if (!transcript) throw new Error("No speech was detected. Please record again.");
        if (transcript !== activityModalLastTranscript) {
          const existing = els.activityNotes?.value.trim() || "";
          els.activityNotes.value = [existing, transcript].filter(Boolean).join(existing ? "\n" : "");
          els.activityNotes.dispatchEvent(new Event("input", { bubbles: true }));
          activityModalLastTranscript = transcript;
        }
        if (activityModalRecorder === session) activityModalRecorder = null;
        setActivityVoiceState("completed", "Completed. The English transcript was added to Notes and remains editable.");
      } catch (error) {
        if (activityModalRecorder === session) activityModalRecorder = null;
        setActivityVoiceState("failed", `Voice processing failed: ${error.message}`);
      }
    });

    recorder.start();
    setActivityVoiceState("recording", "Recording. Speak naturally in any supported language.");
    activityModalElapsedTimer = setInterval(renderActivityRecordingElapsed, 250);
  } catch (error) {
    activityModalRecorder = null;
    stream?.getTracks?.().forEach(track => track.stop());
    setActivityVoiceState(
      "failed",
      error.name === "NotAllowedError"
        ? "Microphone permission was denied. Allow microphone access in your browser and retry."
        : `Recording failed: ${error.message}`
    );
  }
}

function pauseActivityVoiceRecording() {
  const recorder = activityModalRecorder?.recorder;
  if (!recorder) return;
  if (recorder.state === "recording") recorder.pause();
  else if (recorder.state === "paused") recorder.resume();
}

function stopActivityVoiceRecording() {
  const recorder = activityModalRecorder?.recorder;
  if (!recorder || recorder.state === "inactive") return;
  setActivityVoiceState("processing", "Preparing the recording for transcription...");
  recorder.stop();
}

function cancelActivityVoiceRecording() {
  const session = activityModalRecorder;
  if (!session) return;
  session.cancelled = true;
  if (session.recorder?.state && session.recorder.state !== "inactive") session.recorder.stop();
  else {
    stopActivityRecordingTracks(session);
    activityModalRecorder = null;
    setActivityVoiceState("ready", "Recording cancelled. No audio was saved.");
  }
}

function syncLeadWizardDetailsFromValues() {
  if (!els.leadForm) return;
  const groups = {
    company: ["tier", "country_emirate", "location", "legal_name", "year_established", "industry", "business_category", "address", "website", "google_maps_url"],
    contact: ["primary_contact_title", "estimated_value", "product_interest", "secondary_contact_name", "secondary_contact_title", "secondary_contact_mobile", "secondary_contact_email", "tags", "quotation_ref"],
    followup: ["estimated_monthly_volume", "first_order_date", "products_services_remarks"]
  };
  Object.entries(groups).forEach(([key, fields]) => {
    state.leadFormDetailsOpen[key] = fields.some(name => {
      if (name === "product_interest") return selectedLeadProductInterests().length > 0;
      const field = els.leadForm.elements[name];
      if (!field) return false;
      const value = String(field.value || "").trim();
      if (!value) return false;
      if (name === "estimated_value") return Number(value) > 0;
      if (name === "country_emirate") return value.toLowerCase() !== "dubai, uae";
      return true;
    });
  });
}

function renderLeadFormWizard() {
  if (!els.leadForm) return;
  const step = Number(state.leadFormStep || 0);
  const panels = [...els.leadForm.querySelectorAll("[data-lead-step-panel]")];
  const steps = [...els.leadForm.querySelectorAll("[data-lead-step]")];
  panels.forEach((panel, index) => {
    const active = index === step;
    panel.hidden = !active;
    panel.classList.toggle("active", active);
  });
  steps.forEach((button, index) => {
    const active = index === step;
    const complete = index < step;
    button.classList.toggle("active", active);
    button.classList.toggle("complete", complete);
    button.setAttribute("aria-current", active ? "step" : "false");
  });
  ["company", "contact", "followup"].forEach(key => {
    const open = Boolean(state.leadFormDetailsOpen[key]);
    els.leadForm.querySelectorAll(`[data-lead-details-group="${key}"]`).forEach(node => {
      node.classList.toggle("hidden", !open);
    });
    els.leadForm.querySelectorAll(`[data-lead-details-toggle="${key}"]`).forEach(button => {
      button.textContent = open ? "Hide Details" : "Show Details";
      button.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });
  els.leadStepBack?.classList.toggle("hidden", step === 0);
  els.leadStepNext?.classList.toggle("hidden", step >= panels.length - 1);
  els.leadSubmitButton?.classList.toggle("hidden", step < panels.length - 1);
  if (els.leadStepNext) {
    const labels = ["Continue to Contact", "Continue to Next Step", "Next"];
    els.leadStepNext.textContent = labels[step] || "Next";
  }
}

function leadStepFieldNames(step = state.leadFormStep) {
  const map = [
    ["company_name", "assigned_salesman", "territory", "sector"],
    ["contact_person", "phone", "email", "stage", "priority"],
    ["next_action", "next_action_date", "activity_purpose", "notes"]
  ];
  return map[step] || [];
}

function validateLeadStep(step = state.leadFormStep) {
  const names = leadStepFieldNames(step);
  for (const name of names) {
    const field = els.leadForm?.elements?.[name];
    if (field && typeof field.reportValidity === "function" && !field.reportValidity()) {
      field.focus();
      return false;
    }
  }
  return true;
}

function setLeadFormStep(step) {
  const panels = els.leadForm ? [...els.leadForm.querySelectorAll("[data-lead-step-panel]")] : [];
  const max = Math.max(0, panels.length - 1);
  state.leadFormStep = Math.max(0, Math.min(Number(step || 0), max));
  renderLeadFormWizard();
}

function resetLeadFormForNewLead() {
  state.editingLeadId = "";
  state.editingOriginalStage = "";
  state.editingLostData = null;
  setLeadFormMode("create");
  resetLeadWizardState();
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
  renderLeadProductInterestOptions();
  ensureLeadFormSelectValue("next_action", NEXT_ACTION_PLAN_OPTIONS[0], NEXT_ACTION_PLAN_OPTIONS[0]);
  ensureLeadFormSelectValue("activity_purpose", ACTIVITY_PURPOSE_OPTIONS[0], ACTIVITY_PURPOSE_OPTIONS[0]);
  renderDuplicateWarning();
  setEnrichmentStatus("Type a company name to fetch Google business info.");
  renderLeadFormWizard();
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
  if (!raw) return "NEW";
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
    if (!stage) warnings.push("Stage not recognised; defaulted to New.");
    data.stage = stage || "NEW";
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
  const [dialogTitle, dialogSubtitle] = titles[importState.step] || titles[1];
  els.importLeadsTitle.innerHTML = pageTitleMarkup(dialogTitle);
  els.importLeadsSubtitle.textContent = dialogSubtitle;

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
    const matchesDueToday = !state.dueTodayPipelineOnly
      || String(lead.next_action_date || "").slice(0, 10) === today();
    const importedAt = Date.parse(lead.imported_at || "");
    const importedAfter = Date.parse(state.importedAfter || "");
    const matchesImported = !state.importedAfter || (Number.isFinite(importedAt) && importedAt >= importedAfter);
    return matchesQuery
      && matchesStage
      && matchesSalesman
      && matchesPriority
      && matchesTerritory
      && matchesOverdue
      && matchesDueToday
      && matchesImported;
  });
}

function smartSearchText(value) {
  return String(value || "").trim().toLowerCase();
}

function smartSearchHasPhrase(query, phrases) {
  return phrases.some(phrase => query.includes(phrase));
}

function smartSearchMetaLine(lead) {
  return [
    stageDisplayLabel(lead.stage || "NEW"),
    lead.priority || "No priority",
    lead.assigned_salesman || "Unassigned"
  ].filter(Boolean).join(" · ");
}

function smartSearchFollowupLine(lead, overdueCount = 0) {
  if (lead.next_action_date) {
    return `${overdueCount ? `${overdueCount} overdue · ` : ""}Next follow-up ${lead.next_action_date}`;
  }
  if (lead.last_activity) return `Last activity ${daysAgoLabel(lead.last_activity)}`;
  return overdueCount ? `${overdueCount} overdue follow-up item${overdueCount === 1 ? "" : "s"}` : "No follow-up scheduled";
}

function smartSearchLeadResult(lead, query, tokens) {
  const normalizedStage = normalizeStageKey(lead.stage, "NEW");
  const reminders = remindersForLead(lead);
  const overdueCount = overdueReminderItemsForLead(lead).length + (leadHasOverdueNextAction(lead) ? 1 : 0);
  const noFollowup = !lead.next_action_date;
  const staleDays = daysSince(lead.last_activity || lead.updated_at || lead.created_at);
  const dormant = normalizedStage === "DORMANT" || staleDays >= 60;
  const inactive = ["DORMANT", "LOST"].includes(normalizedStage) || staleDays >= 75 || (!lead.last_activity && !lead.next_action_date);
  const openPipeline = !CLOSED_STAGE_KEYS.has(normalizedStage);
  const lostLead = isLostStageValue(lead.stage) || Boolean(lead.lost_reason);
  const activeCustomer = normalizedStage === "WON";
  const quotationRelated = Boolean(lead.quotation_ref)
    || /quotation|quote|proposal/i.test([
      lead.notes,
      lead.product_interest,
      lead.products_services_remarks,
      ...(lead.activities || []).map(activity => `${activity.type || ""} ${activity.text || activity.note || ""}`)
    ].join(" "));
  const noReply = /no reply|no response|unanswered|silent/i.test([
    lead.notes,
    lead.products_services_remarks,
    lead.lost_reason,
    ...(lead.activities || []).map(activity => `${activity.type || ""} ${activity.text || activity.note || ""}`)
  ].join(" "));
  const haystack = [
    lead.company_name,
    lead.legal_name,
    lead.contact_person,
    lead.primary_contact_title,
    lead.email,
    lead.phone,
    lead.stage,
    lead.priority,
    lead.product_interest,
    lead.notes,
    lead.products_services_remarks,
    lead.quotation_ref,
    lead.tags,
    lead.industry,
    lead.business_category,
    lead.sector,
    lead.territory,
    lead.location,
    lead.country_emirate,
    lead.address,
    lead.assigned_salesman,
    lead.next_action,
    lead.activity_purpose,
    ...(lead.activities || []).map(activity => `${activity.type || ""} ${activity.text || activity.note || ""}`)
  ].filter(Boolean).join(" ").toLowerCase();
  const companyName = smartSearchText(lead.company_name);
  const reasons = [];
  if (companyName && companyName === query) reasons.push({ score: 360, label: "Matched company name exactly" });
  else if (companyName && companyName.includes(query)) reasons.push({ score: 280, label: "Matched company name" });
  if (smartSearchHasPhrase(query, ["inactive"]) && inactive) reasons.push({ score: 250, label: "Matched inactive account signal" });
  if (smartSearchHasPhrase(query, ["dormant"]) && dormant) reasons.push({ score: 250, label: "Matched dormant status" });
  if (smartSearchHasPhrase(query, ["overdue"]) && overdueCount) reasons.push({ score: 255, label: "Matched overdue follow-up" });
  if (smartSearchHasPhrase(query, ["no follow-up", "no followup"]) && noFollowup) reasons.push({ score: 245, label: "Matched no follow-up scheduled" });
  if (smartSearchHasPhrase(query, ["quotation", "quote", "proposal"]) && quotationRelated) reasons.push({ score: 240, label: "Matched quotation activity" });
  if (smartSearchHasPhrase(query, ["lost lead", "lost"]) && lostLead) reasons.push({ score: 235, label: "Matched lost lead status" });
  if (smartSearchHasPhrase(query, ["pipeline"]) && openPipeline) reasons.push({ score: 225, label: "Matched active pipeline stage" });
  if (smartSearchHasPhrase(query, ["active"]) && activeCustomer && !smartSearchHasPhrase(query, ["inactive"])) reasons.push({ score: 220, label: "Matched active customer status" });
  if (smartSearchHasPhrase(query, ["at risk", "risk"]) && (String(lead.priority || "").toLowerCase() === "hot" || overdueCount)) reasons.push({ score: 215, label: "Matched at-risk condition" });
  if (smartSearchHasPhrase(query, ["task", "follow-up", "follow up"]) && (lead.next_action_date || reminders.length)) reasons.push({ score: 200, label: "Matched task or follow-up" });
  if (smartSearchHasPhrase(query, ["no reply", "no response", "unanswered"]) && noReply) reasons.push({ score: 230, label: "Matched no-reply activity" });
  if (!reasons.length && tokens.length && tokens.every(token => haystack.includes(token))) {
    reasons.push({ score: 180, label: "Matched company, status, notes, or activity text" });
  }
  if (!reasons.length) return null;
  const best = reasons.sort((a, b) => b.score - a.score)[0];
  return {
    kind: "lead",
    id: lead.id,
    company_name: lead.company_name || "Unnamed company",
    stage: stageDisplayLabel(lead.stage || "NEW"),
    rawStage: normalizeStageKey(lead.stage || "NEW"),
    meta: smartSearchMetaLine(lead),
    reason: best.label,
    supporting: smartSearchFollowupLine(lead, overdueCount),
    actionLabel: "Open Lead",
    score: best.score + Math.max(0, 40 - staleDays)
  };
}

function smartSearchArticleResult(item, query, tokens, kind = "intel") {
  const haystack = `${item.title || ""} ${item.description || item.summary || ""} ${item.source || ""} ${(item.sector_tags || []).join(" ")} ${(item.geography_tags || []).join(" ")}`.toLowerCase();
  if (!tokens.length || !tokens.every(token => haystack.includes(token))) return null;
  return {
    kind,
    url: item.url || "",
    company_name: item.title || "Market insight",
    stage: item.source || (kind === "news" ? "News" : "Intel"),
    meta: kind === "news" ? "Matched market news topic" : "Matched market intelligence topic",
    reason: kind === "news" ? "Matched dashboard market news" : "Matched market intelligence",
    supporting: item.published_at ? `Published ${formatDateTime(item.published_at)}` : "Recently published",
    actionLabel: item.url ? "Open Article" : "View Intel",
    score: kind === "news" ? 120 : 130
  };
}

function computeSmartSearchResults(query) {
  const normalized = smartSearchText(query);
  if (!normalized) return [];
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const leadResults = state.leads
    .map(lead => smartSearchLeadResult(lead, normalized, tokens))
    .filter(Boolean);
  const intelResults = (state.marketIntel.items || [])
    .slice(0, 8)
    .map(item => smartSearchArticleResult(item, normalized, tokens, "intel"))
    .filter(Boolean);
  const newsResults = (state.marketNews.items || [])
    .slice(0, 8)
    .map(item => smartSearchArticleResult(item, normalized, tokens, "news"))
    .filter(Boolean);
  return [...leadResults, ...intelResults, ...newsResults]
    .sort((left, right) => right.score - left.score)
    .slice(0, 24);
}

function closeSmartSearch() {
  state.smartSearch.open = false;
  state.smartSearch.expanded = false;
  renderSmartSearch();
}

function queueSmartSearch(query) {
  clearTimeout(smartSearchTimer);
  const normalized = String(query || "");
  state.smartSearch.query = normalized;
  state.smartSearch.expanded = false;
  if (!normalized.trim()) {
    state.smartSearch.results = [];
    state.smartSearch.searching = false;
    state.smartSearch.open = false;
    renderSmartSearch();
    return;
  }
  state.smartSearch.searching = true;
  state.smartSearch.open = true;
  renderSmartSearch();
  smartSearchTimer = setTimeout(() => {
    state.smartSearch.results = computeSmartSearchResults(normalized);
    state.smartSearch.searching = false;
    renderSmartSearch();
  }, SMART_SEARCH_DEBOUNCE_MS);
}

function openSmartSearchFullResults() {
  if (!state.smartSearch.query.trim()) return;
  state.smartSearch.open = true;
  state.smartSearch.expanded = true;
  if (!state.smartSearch.results.length && !state.smartSearch.searching) {
    state.smartSearch.results = computeSmartSearchResults(state.smartSearch.query);
  }
  renderSmartSearch();
}

function smartSearchResultMarkup(result) {
  const stageTone = result.kind === "lead"
    ? `stage-pill ${drawerStageClass(result.rawStage || result.stage)}`
    : "chip";
  return `
    <button class="smart-search-result" type="button" data-smart-search-kind="${escapeHtml(result.kind)}" data-smart-search-lead="${escapeHtml(result.id || "")}" data-smart-search-url="${escapeHtml(result.url || "")}">
      <div class="smart-search-result-copy">
        <div class="smart-search-result-top">
          <strong>${escapeHtml(result.company_name)}</strong>
          <span class="${escapeHtml(stageTone)}">${escapeHtml(result.stage)}</span>
        </div>
        <span class="smart-search-result-reason">${escapeHtml(result.reason)}</span>
        <small>${escapeHtml(result.meta)}</small>
        <p>${escapeHtml(result.supporting)}</p>
      </div>
      <span class="smart-search-result-action">${escapeHtml(result.actionLabel)}</span>
    </button>
  `;
}

function renderSmartSearch() {
  if (!els.smartSearchShell || !els.smartSearchInput || !els.smartSearchPanel) return;
  const visible = Boolean(state.currentUser);
  els.smartSearchShell.classList.toggle("hidden", !visible);
  if (!visible) return;
  if (document.activeElement !== els.smartSearchInput) {
    els.smartSearchInput.value = state.smartSearch.query || "";
  }
  const query = smartSearchText(state.smartSearch.query);
  if (query && !state.smartSearch.searching) {
    state.smartSearch.results = computeSmartSearchResults(query);
  }
  const results = state.smartSearch.expanded
    ? state.smartSearch.results
    : state.smartSearch.results.slice(0, 6);
  const showPanel = state.smartSearch.open && Boolean(query);
  els.smartSearchShell.classList.toggle("is-open", showPanel);
  els.smartSearchPanel.classList.toggle("hidden", !showPanel);
  if (!showPanel) return;
  if (state.smartSearch.searching) {
    els.smartSearchPanel.innerHTML = `<div class="smart-search-state">Searching CRM records…</div>`;
    return;
  }
  const total = state.smartSearch.results.length;
  const leadCount = state.smartSearch.results.filter(item => item.kind === "lead").length;
  const hasMore = !state.smartSearch.expanded && total > results.length;
  els.smartSearchPanel.innerHTML = `
    <div class="smart-search-panel-header">
      <div>
        <strong>${total ? `${total} match${total === 1 ? "" : "es"}` : "No matching CRM records found."}</strong>
        <small>${total ? `${leadCount} CRM record${leadCount === 1 ? "" : "s"} matched "${query}"` : `Try a company name, status, overdue task, note topic, or pipeline term.`}</small>
      </div>
      <div class="smart-search-panel-actions">
        ${hasMore ? `<button class="small-action" type="button" data-smart-search-expand="true">Show all</button>` : ""}
      </div>
    </div>
    ${results.length ? `<div class="smart-search-results">${results.map(smartSearchResultMarkup).join("")}</div>` : `<div class="smart-search-state">No matching CRM records found.</div>`}
  `;
}

function priorityClass(priority) {
  return String(priority || "").toLowerCase().replace(/\s+/g, "-");
}

function healthClass(health) {
  return `health-${String(health?.label || "amber").toLowerCase()}`;
}

function isOverdue(lead) {
  return lead.next_action_date <= today() && !CLOSED_STAGE_KEYS.has(normalizeStageKey(lead.stage));
}

function isAdminOrManager() {
  return isPrivilegedDashboardRole();
}

function activeLeadForOverdue(lead) {
  return !CLOSED_STAGE_KEYS.has(normalizeStageKey(lead?.stage));
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

function dashboardLeadIsAtRisk(lead) {
  return lead.health?.label === "RED"
    || normalizeStageKey(lead.stage) === "LOST"
    || lead.priority === "At Risk";
}

function dashboardSummaryDatasets() {
  const openPipeline = state.leads.filter(lead => !CLOSED_STAGE_KEYS.has(normalizeStageKey(lead.stage)));
  const activeCustomers = state.leads.filter(lead => normalizeStageKey(lead.stage) === "WON");
  const atRisk = state.leads.filter(dashboardLeadIsAtRisk);
  const tasksDue = state.leads
    .filter(isOverdue)
    .sort((a, b) => String(a.next_action_date || "").localeCompare(String(b.next_action_date || "")));
  return { openPipeline, activeCustomers, atRisk, tasksDue };
}

function summaryDetailsDateLabel(value) {
  const raw = String(value || "").slice(0, 10);
  if (!raw) return "Not set";
  const parsed = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleDateString("en-AE", { day: "2-digit", month: "short", year: "numeric" });
}

function summaryDetailsRiskReason(lead) {
  const reasons = [];
  if (lead.health?.label === "RED") reasons.push(lead.health?.reason || "Relationship health is red");
  if (normalizeStageKey(lead.stage) === "LOST") reasons.push("Lost opportunity");
  if (lead.priority === "At Risk") reasons.push("Priority marked At Risk");
  return [...new Set(reasons)].join("; ") || "Needs attention";
}

function summaryDetailsRecord(lead, type) {
  const dueDate = String(lead.next_action_date || "").slice(0, 10);
  const overdueDays = dueDate && dueDate < today() ? daysOverdue(dueDate) : 0;
  const inactiveDays = lead.last_activity ? Math.max(0, daysSince(lead.last_activity)) : null;
  const priority = String(lead.priority || lead.health?.label || "Not set").trim() || "Not set";
  const nextAction = lead.next_action ? normalizeNextActionPlan(lead.next_action) : "Not set";
  const riskReason = summaryDetailsRiskReason(lead);
  const riskAge = overdueDays > 0
    ? `${overdueDays} day${overdueDays === 1 ? "" : "s"} overdue`
    : inactiveDays === null ? "No activity recorded" : `${inactiveDays} day${inactiveDays === 1 ? "" : "s"} inactive`;
  const taskStatus = dueDate < today() ? "Overdue" : "Due today";
  const record = {
    id: lead.id,
    leadId: lead.id,
    company: lead.company_name || "Unnamed company",
    opportunity: lead.product_interest || lead.products_services_remarks || lead.industry || "Not added",
    pipelineValue: Number(lead.estimated_value || 0),
    salesman: lead.assigned_salesman || "Unassigned",
    stage: stageDisplayLabel(lead.stage || "NEW"),
    stageKey: normalizeStageKey(lead.stage || "NEW"),
    stageRaw: lead.stage || stageDisplayLabel(lead.stage || "NEW"),
    priority,
    nextAction,
    dueDate,
    territory: lead.territory || inferEmirate(lead) || "Not set",
    mainContact: lead.contact_person || "Not added",
    lastActivity: lead.last_activity ? daysAgoLabel(lead.last_activity) : "No activity yet",
    customerStatus: "Active",
    riskReason,
    riskAge,
    riskAgeDays: overdueDays || inactiveDays || 0,
    highRisk: lead.health?.label === "RED" || lead.priority === "At Risk" || overdueDays >= 35,
    task: nextAction,
    taskType: normalizeActivityPurpose(lead.activity_purpose || lead.next_action || "Follow-up"),
    daysOverdue: overdueDays,
    taskStatus
  };
  record.searchText = Object.values(record).filter(value => typeof value === "string").join(" ").toLowerCase();
  record.type = type;
  return record;
}

function summaryDetailsFollowupRecord(reminder, type) {
  const lead = salesmanDashboardLeads().find(item => String(item.id) === String(reminder.lead_id));
  if (!lead) return null;
  const record = summaryDetailsRecord(lead, type);
  const dueDate = String(reminder.due_date || "").slice(0, 10);
  const dueDelta = dueDate ? daysUntil(dueDate) : 0;
  record.id = reminder.id || `${lead.id}:${dueDate}:${reminder.activity_index ?? "next"}`;
  record.nextAction = normalizeNextActionPlan(
    reminder.activity_required
    || reminder.text
    || reminder.next_action
    || reminder.reminder_type
    || lead.next_action
    || "Complete the follow-up"
  );
  record.dueDate = dueDate;
  record.daysOverdue = dueDelta < 0 ? Math.abs(dueDelta) : 0;
  record.daysUntilDue = dueDelta > 0 ? dueDelta : 0;
  record.dueTiming = dueDelta > 0
    ? `${dueDelta} day${dueDelta === 1 ? "" : "s"}`
    : dueDelta === 0 ? "Today" : `${Math.abs(dueDelta)} day${Math.abs(dueDelta) === 1 ? "" : "s"} overdue`;
  record.taskStatus = dueDelta < 0 ? "Overdue" : dueDelta === 0 ? "Due today" : "Upcoming";
  record.searchText = Object.values(record).filter(value => typeof value === "string").join(" ").toLowerCase();
  return record;
}

function summaryDetailsCoverageGapRecord(company, type) {
  const lead = salesmanDashboardLeads().find(item => String(item.id) === String(company.id));
  if (!lead) return null;
  const record = summaryDetailsRecord(lead, type);
  const inactiveDays = company.days_since_activity == null ? null : Number(company.days_since_activity);
  const cadenceDays = Number(company.expected_contact_days || 0);
  const overdueBy = company.contact_overdue_by == null ? null : Number(company.contact_overdue_by);
  record.lastContact = company.last_activity_date
    ? summaryDetailsDateLabel(company.last_activity_date)
    : "No activity recorded";
  record.daysInactive = inactiveDays == null
    ? "No activity recorded"
    : `${inactiveDays} day${inactiveDays === 1 ? "" : "s"}`;
  record.daysInactiveValue = inactiveDays ?? Number.MAX_SAFE_INTEGER;
  record.contactGap = overdueBy == null
    ? `No logged activity; expected every ${cadenceDays || 30} days`
    : `${overdueBy} day${overdueBy === 1 ? "" : "s"} past ${cadenceDays || 30}-day cadence`;
  record.nextAction = normalizeNextActionPlan(company.next_action || lead.next_action || "Plan the next contact");
  record.searchText = Object.values(record).filter(value => typeof value === "string").join(" ").toLowerCase();
  return record;
}

function summaryDetailsStageTone(stageKey) {
  if (stageKey === "WON") return "green";
  if (stageKey === "LOST") return "red";
  if (stageKey === "DORMANT") return "neutral";
  if (stageKey === "NEGOTIATION") return "amber";
  return "blue";
}

function summaryDetailsPriorityTone(priority) {
  const normalized = String(priority || "").toLowerCase();
  if (/(red|hot|high|at risk|urgent)/.test(normalized)) return "red";
  if (/(amber|warm|medium|orange)/.test(normalized)) return "amber";
  if (/(green|cold|low)/.test(normalized)) return "green";
  return "neutral";
}

function summaryDetailsBadge(value, tone = "neutral") {
  return `<span class="summary-details-badge tone-${tone}">${escapeHtml(value || "Not set")}</span>`;
}

function summaryCardDetailsConfig(type) {
  const datasets = dashboardSummaryDatasets();
  const salesmanDatasets = salesmanDashboardSummaryDatasets();
  const actionDatasets = salesmanDashboardActionSummaryDatasets();
  const commonFilters = {
    company: { key: "company", label: "Company / Lead", type: "text", placeholder: "Search company / lead..." },
    salesman: { key: "salesman", label: "Owner", type: "select" },
    stage: { key: "stage", label: "Stage", type: "select" },
    priority: { key: "priority", label: "Priority", type: "select" },
    territory: { key: "territory", label: "Territory", type: "select" },
    nextAction: { key: "nextAction", label: "Next Action", type: "text", placeholder: "Search next action..." },
    dueDate: { key: "dueDate", label: "Due Date", type: "date" }
  };
  const configurations = {
    openPipeline: {
      title: "Open Pipeline",
      description: "Open opportunities currently moving through the pipeline.",
      tone: "blue",
      searchPlaceholder: "Search company or opportunity",
      leads: datasets.openPipeline,
      filters: [commonFilters.salesman, commonFilters.stage, commonFilters.priority, commonFilters.territory],
      columns: [
        { key: "company", label: "Company", className: "is-company" },
        { key: "opportunity", label: "Opportunity or product" },
        { key: "pipelineValue", label: "Pipeline value", render: record => formatAED(record.pipelineValue) },
        { key: "salesman", label: "Salesman" },
        { key: "stage", label: "Stage", render: record => summaryDetailsBadge(record.stage, summaryDetailsStageTone(record.stageKey)) },
        { key: "priority", label: "Priority", render: record => summaryDetailsBadge(record.priority, summaryDetailsPriorityTone(record.priority)) },
        { key: "nextAction", label: "Next action", className: "is-action" },
        { key: "dueDate", label: "Due date", render: record => summaryDetailsDateLabel(record.dueDate) }
      ]
    },
    activeCustomers: {
      title: "Active Customers",
      description: "Customers currently classified as active from won opportunities.",
      tone: "green",
      searchPlaceholder: "Search company or main contact",
      leads: datasets.activeCustomers,
      filters: [commonFilters.salesman, commonFilters.territory],
      columns: [
        { key: "company", label: "Company", className: "is-company" },
        { key: "mainContact", label: "Main contact" },
        { key: "salesman", label: "Salesman" },
        { key: "territory", label: "Territory" },
        { key: "lastActivity", label: "Last activity" },
        { key: "nextAction", label: "Next action", className: "is-action" },
        { key: "customerStatus", label: "Customer status", render: record => summaryDetailsBadge(record.customerStatus, "green") }
      ]
    },
    atRisk: {
      title: "At Risk",
      description: "Records matching the dashboard's existing red-health, lost, or At Risk priority rule.",
      tone: "red",
      searchPlaceholder: "Search company or risk reason",
      leads: datasets.atRisk,
      filters: [commonFilters.salesman, commonFilters.priority, commonFilters.stage, commonFilters.territory, { key: "riskReason", label: "Risk reason" }],
      columns: [
        { key: "company", label: "Company", className: "is-company" },
        { key: "salesman", label: "Salesman" },
        { key: "riskReason", label: "Risk reason", className: "is-risk" },
        { key: "riskAge", label: "Days inactive or overdue", render: record => summaryDetailsBadge(record.riskAge, record.highRisk ? "red" : "amber") },
        { key: "priority", label: "Priority", render: record => summaryDetailsBadge(record.priority, summaryDetailsPriorityTone(record.priority)) },
        { key: "stage", label: "Current stage", render: record => summaryDetailsBadge(record.stage, summaryDetailsStageTone(record.stageKey)) },
        { key: "nextAction", label: "Next action", className: "is-action" },
        { key: "dueDate", label: "Due date", render: record => summaryDetailsDateLabel(record.dueDate) }
      ]
    },
    tasksDue: {
      title: "Tasks Due",
      description: "Open lead next actions due today or earlier, with overdue work shown first.",
      tone: "amber",
      searchPlaceholder: "Search task or company",
      leads: datasets.tasksDue,
      filters: [commonFilters.salesman, { key: "taskType", label: "Task type" }, commonFilters.priority, { key: "dueDate", label: "Due date", type: "date" }, { key: "taskStatus", label: "Status" }],
      columns: [
        { key: "task", label: "Task", className: "is-action" },
        { key: "company", label: "Company", className: "is-company" },
        { key: "salesman", label: "Assigned salesman" },
        { key: "taskType", label: "Task type" },
        { key: "priority", label: "Priority", render: record => summaryDetailsBadge(record.priority, summaryDetailsPriorityTone(record.priority)) },
        { key: "dueDate", label: "Due date", render: record => summaryDetailsDateLabel(record.dueDate) },
        { key: "daysOverdue", label: "Days overdue", render: record => record.daysOverdue ? summaryDetailsBadge(`${record.daysOverdue} day${record.daysOverdue === 1 ? "" : "s"}`, record.daysOverdue >= 35 ? "red" : "amber") : summaryDetailsBadge("Due today", "neutral") },
        { key: "taskStatus", label: "Status", render: record => summaryDetailsBadge(record.taskStatus, record.taskStatus === "Overdue" ? "red" : "amber") }
      ]
    }
  };
  const salesmanColumns = [
    { key: "company", label: "Company / Lead", className: "is-company" },
    { key: "stage", label: "Stage", render: record => summaryDetailsBadge(record.stage, summaryDetailsStageTone(record.stageKey)) },
    { key: "nextAction", label: "Next Action", className: "is-action" },
    { key: "dueDate", label: "Due Date", render: record => summaryDetailsDateLabel(record.dueDate) },
    { key: "salesman", label: "Owner" }
  ];
  const salesmanFilters = [
    commonFilters.company,
    commonFilters.stage,
    commonFilters.nextAction,
    commonFilters.dueDate,
    commonFilters.salesman
  ];
  Object.assign(configurations, {
    salesmanScheduled: {
      title: "Call Next",
      description: "Your scheduled active follow-ups, earliest due date first.",
      tone: "blue",
      searchPlaceholder: "Search scheduled company or next action",
      leads: actionableSalesmanLeads(),
      filters: salesmanFilters,
      columns: salesmanColumns,
      fullList: { view: "pipeline" }
    },
    salesmanMyLeads: {
      title: "My Leads",
      description: "All leads currently assigned to you.",
      tone: "blue",
      searchPlaceholder: "Search company, action, stage, or owner",
      leads: salesmanDatasets.myLeads,
      filters: salesmanFilters,
      columns: salesmanColumns,
      fullList: { view: "pipeline" }
    },
    salesmanOverdueCalls: {
      title: "Overdue Calls",
      description: "Calls and follow-ups past their scheduled due date.",
      tone: "red",
      searchPlaceholder: "Search overdue company or next action",
      leads: salesmanDatasets.overdueCalls,
      filters: salesmanFilters,
      columns: [
        ...salesmanColumns.slice(0, 4),
        {
          key: "daysOverdue",
          label: "Days Overdue",
          render: record => summaryDetailsBadge(
            `${record.daysOverdue} day${record.daysOverdue === 1 ? "" : "s"}`,
            record.daysOverdue >= 35 ? "red" : "amber"
          )
        },
        salesmanColumns[4]
      ],
      fullList: { view: "pipeline", overdueOnly: true }
    },
    salesmanDueToday: {
      title: "Due Today",
      description: "Calls and follow-ups scheduled for today.",
      tone: "amber",
      searchPlaceholder: "Search today's company or next action",
      leads: salesmanDatasets.dueToday,
      filters: salesmanFilters,
      columns: salesmanColumns,
      fullList: { view: "pipeline", dueTodayOnly: true }
    },
    salesmanStageNew: {
      title: "Prospect Leads",
      description: "Your leads currently in the Prospect stage.",
      tone: "green",
      searchPlaceholder: "Search Prospect-stage leads",
      leads: salesmanDatasets.stageNew,
      filters: salesmanFilters,
      columns: salesmanColumns,
      fullList: { view: "pipeline", stageKey: "NEW" }
    },
    salesmanStageContacted: {
      title: "Outreach Leads",
      description: "Your leads currently in the Outreach stage.",
      tone: "blue",
      searchPlaceholder: "Search Outreach-stage leads",
      leads: salesmanDatasets.stageContacted,
      filters: salesmanFilters,
      columns: salesmanColumns,
      fullList: { view: "pipeline", stageKey: "CONTACTED" }
    },
    salesmanStageNegotiation: {
      title: "Engaged Leads",
      description: "Your leads currently in the Engaged stage.",
      tone: "amber",
      searchPlaceholder: "Search Engaged-stage leads",
      leads: salesmanDatasets.stageNegotiation,
      filters: salesmanFilters,
      columns: salesmanColumns,
      fullList: { view: "pipeline", stageKey: "NEGOTIATION" }
    },
    salesmanStageWon: {
      title: "Active Leads",
      description: "Your leads currently in the Active stage.",
      tone: "navy",
      searchPlaceholder: "Search Active-stage leads",
      leads: salesmanDatasets.stageWon,
      filters: salesmanFilters,
      columns: salesmanColumns,
      fullList: { view: "pipeline", stageKey: "WON" }
    },
    salesmanStageDormant: {
      title: "Dormant Leads",
      description: "Previously active leads that have gone quiet.",
      tone: "navy",
      searchPlaceholder: "Search Dormant-stage leads",
      leads: salesmanDatasets.stageDormant,
      filters: salesmanFilters,
      columns: salesmanColumns,
      fullList: { view: "pipeline", stageKey: "DORMANT" }
    },
    salesmanStageLost: {
      title: "Lost Leads",
      description: "Your leads currently in the Lost stage.",
      tone: "red",
      searchPlaceholder: "Search Lost-stage leads",
      leads: salesmanDatasets.stageLost,
      filters: salesmanFilters,
      columns: salesmanColumns,
      fullList: { view: "pipeline", stageKey: "LOST" }
    },
    salesmanActionOverdue: {
      title: "Overdue Follow-ups",
      description: "Every overdue reminder and follow-up currently driving your action card.",
      tone: "red",
      searchPlaceholder: "Search overdue company or next action",
      sources: actionDatasets.overdue,
      recordFactory: reminder => summaryDetailsFollowupRecord(reminder, "salesmanActionOverdue"),
      filters: [commonFilters.company, commonFilters.nextAction, commonFilters.stage, commonFilters.salesman],
      columns: [
        salesmanColumns[0],
        salesmanColumns[2],
        salesmanColumns[3],
        {
          key: "daysOverdue",
          label: "Days Overdue",
          render: record => summaryDetailsBadge(
            `${record.daysOverdue} day${record.daysOverdue === 1 ? "" : "s"}`,
            record.daysOverdue >= 35 ? "red" : "amber"
          )
        },
        salesmanColumns[1],
        salesmanColumns[4]
      ],
      fullList: { view: "pipeline", overdueOnly: true }
    },
    salesmanActionCoverageGap: {
      title: "Coverage Gap",
      description: "Accounts beyond their expected contact cadence, using the same pipeline-health calculation as this card.",
      tone: "amber",
      searchPlaceholder: "Search quiet account, action, stage, or owner",
      sources: actionDatasets.coverageGap,
      recordFactory: company => summaryDetailsCoverageGapRecord(company, "salesmanActionCoverageGap"),
      filters: [commonFilters.company, commonFilters.nextAction, commonFilters.stage, commonFilters.salesman],
      columns: [
        salesmanColumns[0],
        { key: "lastContact", label: "Last Contact" },
        { key: "daysInactive", label: "Days Inactive" },
        { key: "contactGap", label: "Coverage Gap", className: "is-risk" },
        salesmanColumns[2],
        salesmanColumns[1],
        salesmanColumns[4]
      ],
      fullList: { view: "pipeline" }
    },
    salesmanActionNextUp: {
      title: "Next Up",
      description: "Upcoming reminders and follow-ups, ordered by the nearest due date.",
      tone: "blue",
      searchPlaceholder: "Search upcoming company or next action",
      sources: actionDatasets.nextUp,
      recordFactory: reminder => summaryDetailsFollowupRecord(reminder, "salesmanActionNextUp"),
      filters: [commonFilters.company, commonFilters.nextAction, commonFilters.dueDate, commonFilters.stage, commonFilters.salesman],
      columns: [
        salesmanColumns[0],
        salesmanColumns[2],
        salesmanColumns[3],
        { key: "dueTiming", label: "Due In", render: record => summaryDetailsBadge(record.dueTiming, "blue") },
        salesmanColumns[1],
        salesmanColumns[4]
      ],
      fullList: { view: "pipeline" }
    }
  });
  const config = configurations[type];
  if (!config) return null;
  const sources = config.sources || config.leads || [];
  const recordFactory = config.recordFactory || (lead => summaryDetailsRecord(lead, type));
  config.records = sources.map(recordFactory).filter(Boolean);
  return config;
}

function summaryDetailsFilterOptions(records, key) {
  return [...new Set(records.map(record => String(record[key] || "").trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
}

function summaryDetailsFiltersMarkup(config) {
  return `
    <label class="summary-card-details-search"><span>Search all records</span><input type="search" data-summary-details-search value="${escapeHtml(state.summaryCardDetails.search || "")}" placeholder="${escapeHtml(config.searchPlaceholder)}" autocomplete="off"></label>
    <button class="summary-card-details-reset" type="button" data-summary-details-reset>Clear all filters</button>
  `;
}

function summaryDetailsColumnFilterMarkup(config, column) {
  const filter = config.filters.find(item => item.key === column.key);
  if (!filter) return '<span class="summary-column-filter-spacer" aria-hidden="true"></span>';
  const value = state.summaryCardDetails.filters?.[filter.key] || "";
  if (filter.type === "text") {
    return `<label class="summary-column-filter"><span class="sr-only">Filter ${escapeHtml(filter.label)}</span><input type="search" data-summary-details-filter="${escapeHtml(filter.key)}" value="${escapeHtml(value)}" placeholder="${escapeHtml(filter.placeholder || `Filter ${filter.label.toLowerCase()}`)}" autocomplete="off"></label>`;
  }
  if (filter.type === "date") {
    return `<label class="summary-column-filter"><span class="sr-only">Filter ${escapeHtml(filter.label)}</span><input type="date" data-summary-details-filter="${escapeHtml(filter.key)}" value="${escapeHtml(value)}"></label>`;
  }
  const options = summaryDetailsFilterOptions(config.records, filter.key);
  return `<label class="summary-column-filter"><span class="sr-only">Filter ${escapeHtml(filter.label)}</span><select data-summary-details-filter="${escapeHtml(filter.key)}"><option value="">All</option>${options.map(option => `<option value="${escapeHtml(option)}" ${value === option ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}</select></label>`;
}

function summaryDetailsFilteredRecords(config) {
  const query = String(state.summaryCardDetails.search || "").trim().toLowerCase();
  const filters = state.summaryCardDetails.filters || {};
  return config.records.filter(record => {
    if (query && !record.searchText.includes(query)) return false;
    return config.filters.every(filter => {
      const expected = String(filters[filter.key] || "").trim().toLowerCase();
      if (!expected) return true;
      const actual = String(record[filter.key] || "").trim().toLowerCase();
      return filter.type === "text" ? actual.includes(expected) : actual === expected;
    });
  });
}

function summaryDetailsSortedRecords(records) {
  const key = state.summaryCardDetails.sortKey;
  if (!key) return records;
  const direction = state.summaryCardDetails.sortDirection === "desc" ? -1 : 1;
  return [...records].sort((a, b) => {
    const aValue = a[key];
    const bValue = b[key];
    if (typeof aValue === "number" || typeof bValue === "number") {
      return (Number(aValue || 0) - Number(bValue || 0)) * direction;
    }
    if (key.toLowerCase().includes("date")) {
      return String(aValue || "9999-12-31").localeCompare(String(bValue || "9999-12-31")) * direction;
    }
    return String(aValue || "").localeCompare(String(bValue || ""), undefined, { numeric: true, sensitivity: "base" }) * direction;
  });
}

function summaryDetailsSortIndicator(key) {
  if (state.summaryCardDetails.sortKey !== key) return '<span aria-hidden="true">&updownarrow;</span>';
  return state.summaryCardDetails.sortDirection === "desc"
    ? '<span aria-hidden="true">&darr;</span>'
    : '<span aria-hidden="true">&uarr;</span>';
}

function summaryDetailsPageNumbers(page, pageCount) {
  const start = Math.max(1, Math.min(page - 2, pageCount - 4));
  const end = Math.min(pageCount, start + 4);
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
}

function renderSummaryCardDetailsResults() {
  const config = summaryCardDetailsConfig(state.summaryCardDetails.type);
  if (!config || !els.summaryCardDetailsTableWrap || !els.summaryCardDetailsStatus || !els.summaryCardDetailsPagination) return;
  els.summaryCardDetailsTableWrap.setAttribute("aria-busy", state.leadsLoading ? "true" : "false");
  if (state.leadsLoading && !state.leadsLoaded) {
    els.summaryCardDetailsStatus.textContent = "Loading dashboard records...";
    els.summaryCardDetailsTableWrap.innerHTML = `<div class="summary-card-details-state"><strong>Loading records</strong><span>Please wait while the CRM data is loaded.</span></div>`;
    els.summaryCardDetailsPagination.innerHTML = "";
    return;
  }
  if (state.leadsError) {
    els.summaryCardDetailsStatus.textContent = "Dashboard records could not be loaded.";
    els.summaryCardDetailsTableWrap.innerHTML = `<div class="summary-card-details-state is-error"><strong>Unable to load records</strong><span>${escapeHtml(state.leadsError)}</span><button type="button" data-summary-details-retry>Retry</button></div>`;
    els.summaryCardDetailsPagination.innerHTML = "";
    return;
  }
  const records = summaryDetailsSortedRecords(summaryDetailsFilteredRecords(config));
  const pageSize = state.summaryCardDetails.pageSize;
  const pageCount = Math.max(1, Math.ceil(records.length / pageSize));
  state.summaryCardDetails.page = Math.min(Math.max(1, state.summaryCardDetails.page), pageCount);
  const start = (state.summaryCardDetails.page - 1) * pageSize;
  const visible = records.slice(start, start + pageSize);
  els.summaryCardDetailsStatus.textContent = `${records.length} of ${config.records.length} record${config.records.length === 1 ? "" : "s"} shown`;
  if (!visible.length) {
    const emptyMessage = config.records.length
      ? "Adjust the search or filters to see more results."
      : config.emptyMessage || `No records are currently included in ${config.title}.`;
    els.summaryCardDetailsTableWrap.innerHTML = `<div class="summary-card-details-state"><strong>${config.records.length ? "No matching records" : "Nothing here right now"}</strong><span>${escapeHtml(emptyMessage)}</span></div>`;
  } else {
    els.summaryCardDetailsTableWrap.innerHTML = `
      <table class="summary-card-details-table">
        <thead>
          <tr>${config.columns.map(column => `
            <th scope="col">
              <button class="summary-sort-button" type="button" data-summary-details-sort="${escapeHtml(column.key)}" aria-label="Sort by ${escapeHtml(column.label)}">
                ${escapeHtml(column.label)} ${summaryDetailsSortIndicator(column.key)}
              </button>
            </th>
          `).join("")}</tr>
          <tr class="summary-column-filters">${config.columns.map(column => `<th>${summaryDetailsColumnFilterMarkup(config, column)}</th>`).join("")}</tr>
        </thead>
        <tbody>${visible.map(record => `<tr class="summary-card-details-row ${record.highRisk ? "is-high-risk" : ""}" data-summary-details-lead="${escapeHtml(record.leadId)}" tabindex="0" role="link" aria-label="Open ${escapeHtml(record.company)}">${config.columns.map(column => `<td data-label="${escapeHtml(column.label)}" class="${escapeHtml(column.className || "")}">${column.render ? column.render(record) : escapeHtml(record[column.key] || "Not set")}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
    `;
  }
  const firstResult = records.length ? start + 1 : 0;
  const lastResult = Math.min(start + visible.length, records.length);
  const pageButtons = summaryDetailsPageNumbers(state.summaryCardDetails.page, pageCount)
    .map(pageNumber => `<button type="button" data-summary-details-page="${pageNumber}" class="${pageNumber === state.summaryCardDetails.page ? "is-current" : ""}" aria-label="Page ${pageNumber}" ${pageNumber === state.summaryCardDetails.page ? 'aria-current="page"' : ""}>${pageNumber}</button>`)
    .join("");
  els.summaryCardDetailsPagination.innerHTML = `
    <span>Showing ${firstResult} to ${lastResult} of ${records.length} result${records.length === 1 ? "" : "s"}</span>
    <div class="summary-pagination-controls">
      <label class="summary-page-size"><span class="sr-only">Results per page</span><select data-summary-details-page-size>
        ${SUMMARY_DETAILS_PAGE_SIZES.map(size => `<option value="${size}" ${size === pageSize ? "selected" : ""}>${size} / page</option>`).join("")}
      </select></label>
      <button type="button" data-summary-details-page="${state.summaryCardDetails.page - 1}" aria-label="Previous page" ${state.summaryCardDetails.page <= 1 ? "disabled" : ""}>&lsaquo;</button>
      ${pageButtons}
      <button type="button" data-summary-details-page="${state.summaryCardDetails.page + 1}" aria-label="Next page" ${state.summaryCardDetails.page >= pageCount ? "disabled" : ""}>&rsaquo;</button>
      <button class="summary-open-full-list" type="button" data-summary-details-open-full>Open full list <span aria-hidden="true">&nearr;</span></button>
    </div>
  `;
}

function renderSummaryCardDetailsModal() {
  const config = summaryCardDetailsConfig(state.summaryCardDetails.type);
  if (!config || !els.summaryCardDetailsShell) return;
  els.summaryCardDetailsShell.className = `summary-card-details-shell tone-${config.tone}`;
  els.summaryCardDetailsTitle.innerHTML = `${pageTitleMarkup(`${config.title} Summary`)} (${config.records.length})`;
  els.summaryCardDetailsDescription.textContent = config.description;
  const overdueCount = config.records.filter(record => record.taskStatus === "Overdue").length;
  els.summaryCardDetailsCount.textContent = state.summaryCardDetails.type === "tasksDue"
    ? `${config.records.length} due - ${overdueCount} overdue`
    : `${config.records.length} record${config.records.length === 1 ? "" : "s"}`;
  els.summaryCardDetailsFilters.innerHTML = summaryDetailsFiltersMarkup(config);
  renderSummaryCardDetailsResults();
}

function openSummaryCardDetails(type, trigger) {
  if (!(currentView === "dashboard" || (currentView === "focus" && isSalesmanRole())) || !summaryCardDetailsConfig(type)) return;
  const allowed = isPrivilegedDashboardRole()
    ? ["openPipeline", "activeCustomers", "atRisk", "tasksDue"].includes(type)
    : isSalesmanRole() && type.startsWith("salesman");
  if (!allowed) return;
  state.summaryCardDetails = {
    type,
    search: "",
    filters: {},
    sortKey: ["salesmanOverdueCalls", "salesmanActionOverdue"].includes(type)
      ? "daysOverdue"
      : type === "salesmanActionCoverageGap" ? "daysInactiveValue" : "dueDate",
    sortDirection: ["salesmanOverdueCalls", "salesmanActionOverdue", "salesmanActionCoverageGap"].includes(type)
      ? "desc"
      : "asc",
    page: 1,
    pageSize: SUMMARY_DETAILS_DEFAULT_PAGE_SIZE,
    trigger
  };
  renderSummaryCardDetailsModal();
  document.body.classList.add("summary-details-modal-open");
  if (typeof els.summaryCardDetailsDialog?.showModal === "function") els.summaryCardDetailsDialog.showModal();
  else els.summaryCardDetailsDialog?.setAttribute("open", "");
  requestAnimationFrame(() => els.closeSummaryCardDetails?.focus());
}

function cleanupSummaryCardDetailsModal({ restoreFocus = true } = {}) {
  document.body.classList.remove("summary-details-modal-open");
  const trigger = state.summaryCardDetails.trigger;
  state.summaryCardDetails.trigger = null;
  if (restoreFocus && trigger?.isConnected) trigger.focus();
}

function closeSummaryCardDetails({ restoreFocus = true } = {}) {
  if (!els.summaryCardDetailsDialog?.open) return;
  if (!restoreFocus) state.summaryCardDetails.trigger = null;
  els.summaryCardDetailsDialog.close();
}

function summaryStageFilterValue(stageKey) {
  const matchingLead = state.leads.find(lead => normalizeStageKey(lead.stage) === stageKey);
  return matchingLead?.stage || stageDisplayLabel(stageKey);
}

function openSummaryDetailsFullList() {
  const type = state.summaryCardDetails.type;
  const config = summaryCardDetailsConfig(type);
  if (!config) return;
  const fullList = config.fullList || {};
  state.filters = { search: "", stage: "all", salesman: "all", priority: "all", territory: "all" };
  state.importedAfter = "";
  state.overduePipelineOnly = Boolean(fullList.overdueOnly || type === "tasksDue");
  state.dueTodayPipelineOnly = Boolean(fullList.dueTodayOnly);
  const adminStage = type === "activeCustomers" ? "WON" : "";
  const stageKey = fullList.stageKey || adminStage;
  if (stageKey) state.filters.stage = summaryStageFilterValue(stageKey);
  state.pipelineTable.page = 1;
  closeSummaryCardDetails({ restoreFocus: false });
  setView("pipeline");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function trapSummaryCardDetailsFocus(event) {
  if (event.key !== "Tab" || !els.summaryCardDetailsDialog?.open) return;
  const focusable = [...els.summaryCardDetailsDialog.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    .filter(element => element.offsetParent !== null);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function renderMetrics() {
  const datasets = dashboardSummaryDatasets();
  const openValue = datasets.openPipeline
    .reduce((sum, lead) => sum + Number(lead.estimated_value || 0), 0);
  const overdue = datasets.tasksDue.filter(lead => String(lead.next_action_date || "").slice(0, 10) < today()).length;
  renderHeaderSummary();
  els.metricTotal.textContent = datasets.activeCustomers.length;
  if (els.metricTotalSub) els.metricTotalSub.textContent = `of ${state.leads.length}`;
  els.metricValue.textContent = datasets.openPipeline.length;
  if (els.metricValueSub) els.metricValueSub.textContent = `${money.format(openValue)} pipeline value`;
  els.metricHot.textContent = datasets.atRisk.length;
  els.metricDue.textContent = datasets.tasksDue.length;
  if (els.metricDueSub) els.metricDueSub.textContent = `${overdue} overdue`;
  const dueLabel = document.querySelector("#metricsPanel .metric-due > span");
  if (dueLabel) dueLabel.textContent = currentView === "pipeline" && isSalesmanRole() ? "Follow-ups due" : "Tasks Due";
  if (els.quickTaskBadge) {
    els.quickTaskBadge.textContent = datasets.tasksDue.length;
    els.quickTaskBadge.classList.toggle("hidden", datasets.tasksDue.length === 0);
  }
  const interactive = currentView === "dashboard" && isPrivilegedDashboardRole();
  els.metricsPanel?.querySelectorAll("[data-summary-card]").forEach(card => {
    const config = summaryCardDetailsConfig(card.dataset.summaryCard);
    card.tabIndex = interactive ? 0 : -1;
    if (interactive) {
      card.setAttribute("role", "button");
      card.setAttribute("aria-haspopup", "dialog");
      card.setAttribute("aria-label", `Open ${config?.title || "summary"} details, ${config?.records.length || 0} records`);
    } else {
      card.removeAttribute("role");
      card.removeAttribute("aria-haspopup");
      card.removeAttribute("aria-label");
    }
  });
}

function hasLeadContactedActivity(lead) {
  const activities = Array.isArray(lead?.activities) ? lead.activities.filter(activity => !activity?.delete_request && !isReminderActivity(activity)) : [];
  return activities.length > 0 || Boolean(String(lead?.last_activity || "").trim());
}

function isOpenPipelineStage(stage) {
  return ["CONTACTED", "NEGOTIATION"].includes(kanbanStageForLead({ stage }));
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
  const wonDeals = leads.filter(lead => kanbanStageForLead(lead) === "WON").length;
  const lostDeals = leads.filter(lead => kanbanStageForLead(lead) === "LOST").length;
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
  const dropoffLabel = stage.dropoff == null ? "Baseline stage" : `Drop-off ${stage.dropoff}% from previous stage`;
  return `
    <article class="pipeline-funnel-stage ${stage.tone}" aria-label="${escapeHtml(`${stage.label}: ${stage.count}, ${stage.percentage}% of assigned. ${dropoffLabel}`)}">
      <div class="pipeline-funnel-stage-head">
        <strong>${escapeHtml(stage.label)}</strong>
        <div class="pipeline-funnel-stage-stats">
          <span>${escapeHtml(String(stage.count))}</span>
          <small>&middot; ${escapeHtml(String(stage.percentage))}%</small>
        </div>
      </div>
      <div class="pipeline-funnel-track" aria-hidden="true">
        <div class="pipeline-funnel-fill ${stage.tone}" style="width:${fillWidth}%"></div>
      </div>
    </article>
  `;
}

function pipelineFunnelChartMarkup(
  metrics,
  {
    title = "Pipeline Funnel Chart",
    subtitle = "Visual conversion flow from assigned leads to outcomes",
    showStageBreakdown = true
  } = {}
) {
  const stages = pipelineFunnelStageRows(metrics);
  const totalAssigned = Math.max(0, Number(metrics.totalAssignedLeads || 0));
  const activeOpen = Math.min(totalAssigned, Math.max(0, Number(metrics.openPipelineLeads || 0)));
  const contactedBaseline = Math.max(0, totalAssigned - activeOpen);
  const outcomeSlices = [
    { label: "Contacted", count: contactedBaseline, color: "var(--bauhaus-blue)" },
    { label: "Active / Open", count: activeOpen, color: "var(--bauhaus-amber)" }
  ].filter(slice => slice.count > 0);
  const totalSlices = outcomeSlices.reduce((sum, slice) => sum + slice.count, 0);
  let cursor = 0;
  const conicStops = (outcomeSlices.length ? outcomeSlices : [{ color: "#e2e8f0", count: 1 }]).map(slice => {
    const start = cursor;
    const pct = totalSlices ? (slice.count / totalSlices) * 100 : 100;
    cursor += pct;
    return `${slice.color} ${start}% ${cursor}%`;
  }).join(", ");
  return `
    <section class="pipeline-funnel-chart-card pipelineFunnelChartCard ${showStageBreakdown ? "" : "chartLegendOnly"}">
      <div class="pipeline-funnel-chart-head">
        <div>
          <span class="meta-label">${escapeHtml(title)}</span>
          <h3>${escapeHtml(subtitle)}</h3>
        </div>
      </div>
      <div class="pipeline-funnel-chart-layout" role="img" aria-label="Pie chart showing visual conversion flow from assigned leads to contacted, open pipeline, won, and lost outcomes.">
        <div class="pipeline-funnel-chart-visual">
          <div class="pipeline-funnel-pie" style="background: conic-gradient(${conicStops});">
            <div class="pipeline-funnel-pie-center">
              <strong>${escapeHtml(String(totalAssigned))}</strong>
              <span>Assigned leads</span>
            </div>
          </div>
          <div class="pipeline-funnel-pie-legend">
            ${(outcomeSlices.length ? outcomeSlices : [{ label: "No active slices", count: 0, color: "#cbd5e1" }]).map(slice => `
              <span><i style="background:${slice.color}"></i>${escapeHtml(slice.label)} <strong>${escapeHtml(String(slice.count))}</strong></span>
            `).join("")}
          </div>
        </div>
        ${showStageBreakdown ? `
          <div class="pipeline-funnel-chart-stack">
            ${stages.map(stage => {
              const dropoffLabel = stage.dropoff == null ? "Baseline stage" : `Drop-off ${stage.dropoff}% from previous stage`;
              return `
                <article class="pipeline-funnel-chart-stage ${stage.tone}" aria-label="${escapeHtml(`${stage.label}: ${stage.count}, ${stage.percentage}% of assigned. ${dropoffLabel}`)}">
                  <div class="pipeline-funnel-chart-meta">
                    <strong>${escapeHtml(stage.label)}</strong>
                    <div class="pipeline-funnel-chart-numbers">
                      <b>${escapeHtml(String(stage.count))}</b>
                      <small>&middot; ${escapeHtml(String(stage.percentage))}%</small>
                    </div>
                  </div>
                  <div class="pipeline-funnel-chart-progress">
                    <i class="${stage.tone}" style="width:${Math.max(0, Math.min(100, stage.percentage || 0))}%"></i>
                  </div>
                </article>
              `;
            }).join("")}
          </div>
        ` : ""}
      </div>
    </section>
  `;
}

function pipelineFunnelComparisonTableRowsMarkup(rows) {
  return rows.map(row => `
    <tr>
      <td data-label="Salesman">${escapeHtml(row.salesmanName)}</td>
      <td data-label="Assigned Leads">${escapeHtml(String(row.totalAssignedLeads))}</td>
      <td data-label="Contacted">${escapeHtml(String(row.contactedLeads))}</td>
      <td data-label="Open Pipeline">${escapeHtml(String(row.openPipelineLeads))}</td>
      <td data-label="Won">${escapeHtml(String(row.wonDeals))}</td>
      <td data-label="Lost">${escapeHtml(String(row.lostDeals))}</td>
      <td data-label="Conversion Rate"><span class="chip ${row.conversionRate >= 35 ? "green" : row.conversionRate >= 15 ? "warm" : ""}">${escapeHtml(String(row.conversionRate))}%</span></td>
    </tr>
  `).join("");
}

function dashboardPipelineFunnelCompactMarkup(leads, { dialogTitleId = "dashboardFunnelDialogTitle" } = {}) {
  const metrics = pipelineFunnelMetricsForLeads(leads);
  const stages = pipelineFunnelStageRows(metrics).filter(stage => ["assigned", "contacted", "open"].includes(stage.key));
  const rows = pipelineFunnelComparisonRows(leads);
  const leader = rows.find(row => row.totalAssignedLeads > 0) || rows[0];
  const leaderSummary = leader
    ? `${leader.salesmanName} leads at ${leader.totalAssignedLeads} assigned`
    : "No assigned leads in the current filters";

  return `
    <div class="dashboard-funnel-compact">
      <div class="dashboard-funnel-bar-list" aria-label="${escapeHtml(`${metrics.totalAssignedLeads} assigned leads, ${metrics.contactedLeads} contacted, ${metrics.openPipelineLeads} active or open`)}">
        <p class="dashboard-funnel-note">Counts are overlapping measures; each bar is shown as a share of assigned leads.</p>
        ${stages.map(stage => `
          <article class="dashboard-funnel-bar-row ${escapeHtml(stage.tone)}">
            <div class="dashboard-funnel-bar-meta">
              <strong>${escapeHtml(stage.label)}</strong>
              <span>${escapeHtml(String(stage.count))} &middot; ${escapeHtml(String(stage.percentage))}% of assigned</span>
            </div>
            <div class="dashboard-funnel-bar-track" aria-hidden="true"><i class="${escapeHtml(stage.tone)}" style="width:${Math.max(0, Math.min(100, stage.percentage || 0))}%"></i></div>
          </article>
        `).join("")}
      </div>
    </div>
    <div class="dashboard-funnel-comparison-summary">
      <span><strong>Salesman comparison (${escapeHtml(String(rows.length))})</strong> &mdash; ${escapeHtml(leaderSummary)}</span>
      <button class="ghost-button" type="button" data-dashboard-funnel-table-open>View table</button>
    </div>
    <dialog class="dashboard-funnel-dialog" data-dashboard-funnel-dialog aria-labelledby="${escapeHtml(dialogTitleId)}">
      <div class="dialog-header">
        <div>
          <span class="meta-label">Salesman comparison</span>
          <h2 id="${escapeHtml(dialogTitleId)}">Conversion by owner</h2>
        </div>
        <button class="ghost-button" type="button" data-dashboard-funnel-table-close aria-label="Close salesman comparison">Close</button>
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
          <tbody>${pipelineFunnelComparisonTableRowsMarkup(rows)}</tbody>
        </table>
      </div>
    </dialog>
  `;
}

function bindPipelineFunnelDialog(container) {
  const dialog = container?.querySelector("[data-dashboard-funnel-dialog]");
  if (!dialog) return;
  container.querySelector("[data-dashboard-funnel-table-open]")?.addEventListener("click", () => {
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  });
  dialog.querySelector("[data-dashboard-funnel-table-close]")?.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
  });
}

function bindDashboardFunnelDialog() {
  bindPipelineFunnelDialog(els.dashboardPipelineFunnelBody);
}

function pipelineFunnelMarkup(
  leads,
  {
    selectedSalesman = "all",
    forceSingleSalesman = false,
    focusName = "",
    includeComparison = true,
    includeSummary = true
  } = {}
) {
  const singleSalesmanView = forceSingleSalesman || !isAdminOrManager() || selectedSalesman !== "all";
  const resolvedFocusName = singleSalesmanView
    ? (focusName || (selectedSalesman !== "all" ? selectedSalesman : state.currentUser?.name || "My leads"))
    : "All salesmen";

  if (!leads.length) {
    return {
      badge: "0 visible leads",
      singleSalesmanView,
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
      singleSalesmanView,
      html: `
        <div class="pipeline-funnel-detail">
          <div class="pipeline-funnel-summary-card teamConversionCard">
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
              <article><span>Lost</span><strong>${escapeHtml(String(metrics.lostDeals))}</strong></article>
              <article><span>Conversion</span><strong>${escapeHtml(String(metrics.conversionRate))}%</strong></article>
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
    singleSalesmanView,
    html: `
      <div class="pipeline-funnel-layout pipelineFunnelGrid">
        ${includeSummary ? `
          <section class="pipeline-funnel-summary-card teamConversionCard">
            <div class="pipeline-funnel-copy">
              <span class="meta-label">Team conversion snapshot</span>
              <h3>All salesmen</h3>
              <p>${escapeHtml(String(rows.filter(row => row.totalAssignedLeads > 0).length))} salesmen currently match the active pipeline filters.</p>
            </div>
            <div class="pipeline-funnel-stages">
              ${aggregateStages.map(pipelineFunnelStageMarkup).join("")}
            </div>
          </section>
        ` : ""}
        ${includeComparison ? `
          <section class="pipeline-funnel-table-card salesmanComparisonCard">
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
                  ${pipelineFunnelComparisonTableRowsMarkup(rows)}
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
  const teamView = isAdminOrManager();
  if (state.leadsLoading && !state.leadsLoaded) {
    els.pipelineFunnelBadge.textContent = "Loading lead conversion";
    els.pipelineFunnelBody.classList.remove("pipelineFunnelCompactView");
    els.pipelineFunnelBody.classList.remove("pipelineFunnelGrid", "pipelineFunnelSingleView", "pipelineFunnelAdminTwoUp", "pipelineFunnelDetailWide");
    els.pipelineFunnelBody.innerHTML = `
      <div class="pipeline-funnel-skeleton">
        <span></span>
        <span></span>
      </div>
    `;
    return;
  }

  try {
    const leads = filteredLeads();
    if (!leads.length) {
      els.pipelineFunnelBadge.textContent = "0 visible leads";
      els.pipelineFunnelBody.classList.remove("pipelineFunnelCompactView");
      els.pipelineFunnelBody.classList.remove("pipelineFunnelGrid", "pipelineFunnelSingleView", "pipelineFunnelAdminTwoUp", "pipelineFunnelDetailWide");
      els.pipelineFunnelBody.innerHTML = `
        <div class="pipeline-funnel-empty">
          <strong>No funnel data for these filters.</strong>
          <span>Try another salesman, stage, priority, territory, or search term.</span>
        </div>
      `;
      return;
    }
    if (teamView) {
      els.pipelineFunnelBadge.textContent = `${leads.length} visible lead${leads.length === 1 ? "" : "s"}`;
      els.pipelineFunnelBody.classList.remove("pipelineFunnelGrid", "pipelineFunnelSingleView", "pipelineFunnelAdminTwoUp", "pipelineFunnelDetailWide");
      els.pipelineFunnelBody.classList.add("pipelineFunnelCompactView");
      els.pipelineFunnelBody.innerHTML = dashboardPipelineFunnelCompactMarkup(leads, { dialogTitleId: "pipelineFunnelDialogTitle" });
      bindPipelineFunnelDialog(els.pipelineFunnelBody);
      return;
    }

    const chart = pipelineFunnelChartMarkup(pipelineFunnelMetricsForLeads(leads));
    els.pipelineFunnelBadge.textContent = `${leads.length} visible lead${leads.length === 1 ? "" : "s"}`;
    els.pipelineFunnelBody.classList.remove("pipelineFunnelCompactView");
    els.pipelineFunnelBody.classList.remove("pipelineFunnelGrid", "pipelineFunnelSingleView", "pipelineFunnelAdminTwoUp", "pipelineFunnelDetailWide");
    els.pipelineFunnelBody.innerHTML = chart;
  } catch (error) {
    els.pipelineFunnelBadge.textContent = "Funnel unavailable";
    els.pipelineFunnelBody.classList.remove("pipelineFunnelCompactView");
    els.pipelineFunnelBody.classList.remove("pipelineFunnelGrid", "pipelineFunnelSingleView", "pipelineFunnelAdminTwoUp", "pipelineFunnelDetailWide");
    els.pipelineFunnelBody.innerHTML = `
      <div class="pipeline-funnel-empty error">
        <strong>Could not load pipeline funnel.</strong>
        <span>${escapeHtml(error.message || "Unexpected funnel rendering error.")}</span>
      </div>
    `;
  }
}

function renderPipelineFunnelSummary() {
  if (!els.pipelineFunnelSummaryStrip) return;
  const leads = state.leadsLoading && !state.leadsLoaded ? [] : filteredLeads();
  const metrics = pipelineFunnelMetricsForLeads(leads);
  const contactedPercent = percentOf(metrics.contactedLeads, metrics.totalAssignedLeads);
  els.pipelineFunnelSummaryTotal.textContent = String(metrics.totalAssignedLeads);
  els.pipelineFunnelSummaryAssigned.textContent = String(metrics.totalAssignedLeads);
  els.pipelineFunnelSummaryContacted.textContent = String(metrics.contactedLeads);
  els.pipelineFunnelSummaryWon.textContent = String(metrics.wonDeals);
  els.pipelineFunnelSummaryDonut?.style.setProperty("--pipeline-summary-progress", `${contactedPercent}%`);
  els.pipelineFunnelSummaryDonut?.setAttribute(
    "aria-label",
    `${contactedPercent}% contacted: ${metrics.contactedLeads} of ${metrics.totalAssignedLeads} assigned leads`
  );
}

function renderDashboardPipelineFunnel() {
  if (!els.dashboardPipelineFunnelPanel || !els.dashboardPipelineFunnelBody || !els.dashboardPipelineFunnelBadge) return;
  const role = String(state.currentUser?.role || "").toLowerCase();
  const admin = ["admin", "manager", "director"].includes(role);
  const visible = admin || Boolean(state.currentUser && state.dashboardToolsOpen && state.dashboardPerformanceOpen);
  const subtitle = els.dashboardPipelineFunnelPanel.querySelector(".panel-header > div > span");
  els.dashboardPipelineFunnelPanel.classList.toggle("hidden", !visible);
  if (!visible) return;
  if (subtitle) {
    subtitle.textContent = admin
      ? "Track lead conversion progress by salesman"
      : "Track your lead conversion progress and sales performance";
  }
  if (state.leadsLoading && !state.leadsLoaded) {
    els.dashboardPipelineFunnelBadge.textContent = "Loading lead conversion";
    els.dashboardPipelineFunnelBody.classList.remove("pipelineFunnelGrid", "pipelineFunnelSingleView", "pipelineFunnelAdminTwoUp", "dashboardFunnelCompactView");
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
    if (admin) {
      const leads = marketSnapshotLeads();
      els.dashboardPipelineFunnelBadge.textContent = `${leads.length} tracked lead${leads.length === 1 ? "" : "s"}`;
      els.dashboardPipelineFunnelBody.classList.remove("pipelineFunnelGrid", "pipelineFunnelSingleView", "pipelineFunnelAdminTwoUp");
      els.dashboardPipelineFunnelBody.classList.add("dashboardFunnelCompactView");
      els.dashboardPipelineFunnelBody.innerHTML = dashboardPipelineFunnelCompactMarkup(leads);
      bindDashboardFunnelDialog();
      return;
    }

    const leads = [...state.leads];
    if (!leads.length) {
      els.dashboardPipelineFunnelBadge.textContent = "0 assigned leads";
      els.dashboardPipelineFunnelBody.classList.remove("pipelineFunnelGrid", "pipelineFunnelAdminTwoUp", "dashboardFunnelCompactView");
      els.dashboardPipelineFunnelBody.classList.add("pipelineFunnelSingleView");
      els.dashboardPipelineFunnelBody.innerHTML = `
        <div class="pipeline-funnel-empty">
          <strong>No pipeline data yet</strong>
          <span>You do not have assigned leads in the current filters.</span>
        </div>
      `;
      return;
    }
    const metrics = pipelineFunnelMetricsForLeads(leads);
    const view = pipelineFunnelMarkup(leads, {
      selectedSalesman: "all",
      forceSingleSalesman: true,
      focusName: state.currentUser?.name || "My leads",
      includeComparison: false
    });
    const chart = pipelineFunnelChartMarkup(metrics);
    els.dashboardPipelineFunnelBadge.textContent = `${leads.length} assigned lead${leads.length === 1 ? "" : "s"}`;
    els.dashboardPipelineFunnelBody.classList.remove("pipelineFunnelGrid", "pipelineFunnelAdminTwoUp", "dashboardFunnelCompactView");
    els.dashboardPipelineFunnelBody.classList.add("pipelineFunnelSingleView");
    els.dashboardPipelineFunnelBody.innerHTML = `${view.html}${chart}`;
  } catch (error) {
    els.dashboardPipelineFunnelBadge.textContent = "Funnel unavailable";
    els.dashboardPipelineFunnelBody.classList.remove("pipelineFunnelGrid", "pipelineFunnelSingleView", "pipelineFunnelAdminTwoUp", "dashboardFunnelCompactView");
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
      ? `${shown.map(([name, count]) => `<span class="overdue-pill overdue-owner-chip">${escapeHtml(name)}: ${count}</span>`).join("")}${moreCount ? `<span class="overdue-pill overdue-owner-chip">+${moreCount} more</span>` : ""}`
      : `Oldest: ${escapeHtml(oldest.company_name)} - ${escapeHtml(daysOverdueLabel(oldest.due_date))}`;
  const summary = admin && total > 1
    ? `
      <span class="overdue-banner-eyebrow">Attention required</span>
      <strong>Overdue follow-ups</strong>
      <div class="overdue-banner-kpis">
        <span><b>${escapeHtml(String(total))}</b> overdue follow-ups</span>
        <span><b>${escapeHtml(String(breakdownEntries.length))}</b> salesmen affected</span>
      </div>
      <div class="overdue-banner-pills overdue-owner-chips">${subtitle}</div>
    `
    : `
      <strong>${escapeHtml(title)}</strong>
      <div>${subtitle}</div>
    `;

  els.overdueBanner.classList.remove("hidden");
  els.overdueBanner.innerHTML = `
    <div class="overdue-banner-icon" aria-hidden="true"></div>
    <div class="overdue-banner-copy">
      ${summary}
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
  state.dueTodayPipelineOnly = false;
  state.filters = { ...state.filters, search: "", stage: "all", priority: "all", territory: "all", salesman: "all" };
  state.pipelineTable.page = 1;
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
  const showingDueToday = state.dueTodayPipelineOnly;
  const showingOverdue = state.overduePipelineOnly;
  const count = showingDueToday
    ? state.leads.filter(lead => String(lead.next_action_date || "").slice(0, 10) === today()).length
    : state.leads.filter(leadHasOverdueFollowup).length;
  const label = showingDueToday ? "due today" : "overdue";
  const title = els.overduePipelineFilter.querySelector("strong");
  const clearButton = els.clearOverdueFilter;
  if (title) title.textContent = showingDueToday ? "Showing follow-ups due today" : "Showing overdue follow-ups only";
  els.overduePipelineCount.textContent = `${count} ${label} record${count === 1 ? "" : "s"}`;
  if (clearButton) clearButton.textContent = "Clear summary filter";
  els.overduePipelineFilter.classList.toggle("hidden", !(currentView === "pipeline" && (showingOverdue || showingDueToday)));
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
    const progressedLeads = assignedLeads.filter(lead => !["NEW", "LOST"].includes(normalizeStageKey(lead.stage))).length;
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
  const rank = ordinalLabel(index + 1);
  const stateLabel = performanceStateLabel(row, index);
  const toneClass = inactive ? "is-inactive" : index === 0 ? "is-top" : row.performanceScore >= 70 ? "is-strong" : row.performanceScore >= 35 ? "is-mid" : "is-low";
  return `
    <article class="sp-leader-card ${index === 0 ? "top" : ""} ${toneClass}">
      <div class="sp-leader-top">
        <div class="sp-leader-copy">
          <p class="sp-leader-name">${escapeHtml(row.name)}</p>
        </div>
        <span class="sp-rank-badge">${escapeHtml(rank)}</span>
      </div>
      <div class="sp-leader-status-row">
        <span class="sp-state-badge">${escapeHtml(stateLabel)}</span>
      </div>
      <div class="sp-stats-row">
        <span><strong>${row.activitiesLogged}</strong> act</span>
        <span><strong>${row.totalAssigned}</strong> leads</span>
        <span><strong>${row.followupsCompleted}</strong> f-ups</span>
      </div>
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
  const chartMinWidth = Math.max(720, rows.length * 110);
  frame.style.setProperty("--performance-chart-min-width", `${chartMinWidth}px`);
}

function crmChartColors() {
  const styles = getComputedStyle(document.documentElement);
  const token = name => styles.getPropertyValue(`--crm-${name}`).trim();
  return {
    navy: token("navy"), surface: token("surface"), divider: token("divider"),
    text: token("text"), secondary: token("text-secondary"),
    success: token("health-green"), risk: token("health-red"), warning: token("health-amber")
  };
}

function renderPerformanceChart(rows) {
  if (!els.performanceChart) return;
  if (typeof Chart === "undefined") {
    els.performanceChart.closest(".salesmen-chart-frame")?.insertAdjacentHTML("beforeend", `<p class="empty-copy">Chart unavailable. Assigned lead totals remain available in the directory.</p>`);
    return;
  }
  if (performanceChartInstance) performanceChartInstance.destroy();
  const colors = crmChartColors();
  performanceChartInstance = new Chart(els.performanceChart, {
    type: "bar",
    data: {
      labels: rows.map(row => row.name),
      datasets: [
        {
          label: "Assigned leads",
          data: rows.map(row => row.totalAssigned),
          backgroundColor: colors.navy,
          borderColor: colors.navy,
          borderWidth: 1,
          borderRadius: 2,
          borderSkipped: false,
          maxBarThickness: 18
        }
      ]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 2, right: 22, bottom: 0, left: 2 } },
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { color: colors.divider },
          beginAtZero: true,
          ticks: { font: { family: "Inter", size: 12, weight: "600" }, color: colors.secondary, precision: 0 },
          title: { display: true, text: "Assigned leads", color: colors.secondary, font: { family: "Inter", size: 12, weight: "600" } }
        },
        y: {
          grid: { display: false },
          ticks: { font: { family: "Inter", size: 12, weight: "600" }, color: colors.text, autoSkip: false }
        }
      }
    }
  });
}

function renderSalesmenSummaryChart(rows) {
  if (!els.salesmenSummaryChart || !els.salesmenSummaryLegend || !els.salesmenConversionRate) return;
  const totalAssigned = rows.reduce((sum, row) => sum + row.totalAssigned, 0);
  const converted = rows.reduce((sum, row) => sum + row.activeCustomers, 0);
  const open = rows.reduce((sum, row) => sum + row.openLeads, 0);
  const overdue = rows.reduce((sum, row) => sum + row.overdueFollowups, 0);
  const tasksDue = rows.reduce((sum, row) => sum + row.tasksDue, 0);
  const conversionRate = percentOf(converted, totalAssigned);
  const colors = crmChartColors();
  const metrics = [
    { label: "Converted leads", value: converted, color: colors.success },
    { label: "Open leads", value: open, color: colors.navy },
    { label: "Overdue follow-ups", value: overdue, color: colors.risk },
    { label: "Tasks due", value: tasksDue, color: colors.warning }
  ];
  els.salesmenConversionRate.textContent = `${conversionRate}%`;
  els.salesmenSummaryLegend.innerHTML = metrics.map(metric => `
    <div class="salesmen-summary-legend-row">
      <i style="--legend-color:${metric.color}" aria-hidden="true"></i>
      <span>${escapeHtml(metric.label)}</span>
      <strong>${escapeHtml(String(metric.value))}</strong>
      <small>${escapeHtml(String(percentOf(metric.value, totalAssigned)))}%</small>
    </div>
  `).join("");
  const textEquivalent = metrics.map(metric => `${metric.label}: ${metric.value}`).join(", ");
  els.salesmenSummaryChart.setAttribute("aria-label", `Overall conversion rate ${conversionRate} percent. ${textEquivalent}.`);
  if (typeof Chart === "undefined") return;
  if (salesmenSummaryChartInstance) salesmenSummaryChartInstance.destroy();
  salesmenSummaryChartInstance = new Chart(els.salesmenSummaryChart, {
    type: "doughnut",
    data: {
      labels: metrics.map(metric => metric.label),
      datasets: [{
        data: metrics.map(metric => metric.value),
        backgroundColor: metrics.map(metric => metric.color),
        borderColor: colors.surface,
        borderWidth: 2,
        hoverOffset: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "68%",
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(context) {
              return `${context.label}: ${context.raw}`;
            }
          }
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
  return Boolean(state.currentUser) && !isSalesmanRole() && currentView === "dashboard";
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
  const sectionTitle = directSectionHeader(section)?.querySelector("h2")?.textContent?.trim() || "section";
  const action = collapsed ? "Expand" : "Collapse";
  button.setAttribute("aria-expanded", String(!collapsed));
  button.setAttribute("aria-label", `${action} ${sectionTitle}`);
  button.setAttribute("title", `${action} ${sectionTitle}`);
  const label = button.querySelector(".panel-collapse-label");
  if (label) label.textContent = action;
  const icon = button.querySelector(".panel-collapse-icon");
  if (icon) icon.textContent = collapsed ? "\u25bc" : "\u25b2";
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

function handleDashboardCollapseClick(event) {
  const button = event.target.closest(".panel-collapse-toggle");
  if (!button) return;
  const section = button.closest(".panel");
  const adminDashboardActive = document.body.classList.contains("admin-dashboard-mode");
  if (!section || (!section.classList.contains("collapsible-enabled") && !adminDashboardActive)) return;
  event.preventDefault();
  event.stopPropagation();
  section.classList.add("collapsible-enabled");
  setDashboardSectionCollapsed(
    section,
    !section.classList.contains("is-collapsed"),
    { force: adminDashboardActive }
  );
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
  let button = actions.querySelector(".panel-collapse-toggle");
  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.className = "panel-collapse-toggle";
    button.innerHTML = `
      <span class="panel-collapse-label">Collapse section</span>
      <span class="panel-collapse-icon" aria-hidden="true">\u25b2</span>
    `;
    actions.appendChild(button);
  }
  button.dataset.collapseBound = "true";
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
  if (document.documentElement.dataset.dashboardCollapseDelegated !== "true") {
    document.addEventListener("click", handleDashboardCollapseClick);
    document.documentElement.dataset.dashboardCollapseDelegated = "true";
  }
  ADMIN_DASHBOARD_COLLAPSIBLES.forEach(setupDashboardCollapsible);
  dashboardCollapsiblesReady = true;
  syncDashboardCollapsibles();
}

function renderPerformanceAnalytics() {
  if (!els.performancePanel || state.currentUser?.role !== "admin") return;
  if (currentView === "salesmen") renderSalesmenManagementDashboard();
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

const MARKET_SNAPSHOT_BAR_COLORS = [
  { solid: "#1D9E75", muted: ["#72BDA5", "#A8D8C8"] },
  { solid: "#2E6DA4", muted: ["#79A6CA", "#ADC9DF"] },
  { solid: "#D68A2C", muted: ["#E7B46D", "#F0D09F"] },
  { solid: "#7F77DD", muted: ["#A9A3E9", "#CCC8F2"] }
];

function marketSnapshotBarColor(index) {
  const base = MARKET_SNAPSHOT_BAR_COLORS[index % MARKET_SNAPSHOT_BAR_COLORS.length];
  if (index < MARKET_SNAPSHOT_BAR_COLORS.length) return base.solid;
  const mutedCycle = Math.floor(index / MARKET_SNAPSHOT_BAR_COLORS.length) - 1;
  return base.muted[Math.min(mutedCycle, base.muted.length - 1)];
}

function renderSnapshotBars(target, entries, dimensionLabel) {
  if (!target) return;
  const rows = [...entries].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const total = rows.reduce((sum, [, count]) => sum + count, 0);
  target.setAttribute("aria-label", `${total} total leads grouped by ${dimensionLabel}`);
  target.innerHTML = rows.length
    ? `
      <p class="market-snapshot-total"><strong>${total}</strong> total ${total === 1 ? "lead" : "leads"}</p>
      <div class="market-snapshot-bar-list">
        ${rows.map(([label, count], index) => {
          const percentage = total ? (count / total) * 100 : 0;
          const displayPercentage = Math.round(percentage);
          const color = marketSnapshotBarColor(index);
          return `
            <div class="market-snapshot-bar-row">
              <div class="market-snapshot-bar-meta">
                <span>${escapeHtml(label)}</span>
                <span><strong>${count}</strong> · <small>${displayPercentage}%</small></span>
              </div>
              <div class="market-snapshot-bar-track" aria-hidden="true">
                <i style="width:${percentage.toFixed(2)}%;background:${color}"></i>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `
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
  renderSnapshotBars(els.marketLocationBars, locationEntries, "location");
  renderSnapshotBars(els.marketSectorBars, sectorEntries, "sector");
  els.marketSnapshotPanel.querySelectorAll("[data-market-snapshot-tab]").forEach(button => {
    const active = button.dataset.marketSnapshotTab === state.marketSnapshotTab;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  els.marketSnapshotPanel.querySelectorAll("[data-market-snapshot-view]").forEach(view => {
    view.classList.toggle("hidden", view.dataset.marketSnapshotView !== state.marketSnapshotTab);
  });
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
  const followups = salesmanFollowups();
  const columns = [
    { title: "Overdue Follow-Ups", groups: ["Overdue Follow-Ups"] },
    { title: "Tomorrow", groups: ["Tomorrow"] },
    { title: "This Week", groups: ["Today", "This Week"] }
  ];
  const columnMarkup = columns.map(column => {
    const sections = column.groups.map(group => ({
      title: group,
      reminders: followups.filter(reminder => followupGroup(reminder) === group)
    }));
    const total = sections.reduce((count, section) => count + section.reminders.length, 0);
    return `
      <section class="followup-column" data-followup-column="${escapeHtml(column.title)}">
        <div class="followup-group-header">
          <h3>${escapeHtml(column.title)}</h3>
          <span>${total}</span>
        </div>
        <div class="followup-column-body">
          ${sections.map(section => `
            <div class="followup-column-section">
              ${section.title !== column.title ? `<p class="followup-subheading">${escapeHtml(section.title)}</p>` : ""}
              <div class="followup-list">
                ${section.reminders.map(reminder => renderSalesmanFollowupCard(reminder)).join("") || `<p class="empty-copy">No follow-ups in this bucket.</p>`}
              </div>
            </div>
          `).join("")}
        </div>
      </section>
    `;
  });
  const hasAny = columns.some(column => column.groups.some(group => followups.some(reminder => followupGroup(reminder) === group)));
  els.salesmanFollowupGroups.innerHTML = hasAny
    ? columnMarkup.join("")
    : `<p class="empty-copy">No overdue or near-term follow-ups right now. Open the full pipeline only when you want the longer-range book.</p>`;
  bindFollowupActions();
}

function renderSalesmanFollowupCard(reminder) {
  const priority = followupPriority(reminder);
  return `
    <article class="followup-card priority-${priority.className}">
      <div class="followup-main">
        <span class="followup-priority">${escapeHtml(priority.label)}</span>
        <strong>${escapeHtml(reminder.company_name)}</strong>
        <p>${escapeHtml(reminder.activity_required || reminder.text || "Follow up with customer")}</p>
        <div class="chip-row">
          <span class="chip">${escapeHtml(stageDisplayLabel(reminder.stage || "NEW"))}</span>
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
}

function renderPortfolioAnalytics() {
  if (!els.portfolioPanel || !isSalesmanRole()) return;
  const visible = Boolean(state.dashboardToolsOpen && state.dashboardPerformanceOpen);
  els.portfolioPanel.classList.toggle("hidden", !visible);
  if (!visible) return;
  const leads = portfolioFilteredLeads();
  const allDue = salesmanFollowups();
  const overdue = allDue.filter(reminder => daysUntil(reminder.due_date) < 0);
  els.portfolioTotal.textContent = leads.length;
  els.portfolioActive.textContent = leads.filter(lead => normalizeStageKey(lead.stage) === "WON").length;
  els.portfolioDormant.textContent = leads.filter(lead => normalizeStageKey(lead.stage) === "DORMANT").length;
  els.portfolioHot.textContent = leads.filter(lead => String(lead.priority || "").toLowerCase() === "hot").length;
  els.portfolioDue.textContent = allDue.filter(reminder => daysUntil(reminder.due_date) <= 7).length;
  els.portfolioOverdue.textContent = overdue.length;

  const reportView = state.portfolioFilters.reportView;
  const counts = reportView === "country"
    ? countBy(leads, inferCountry)
    : reportView === "emirate"
      ? countBy(leads, inferEmirate)
      : countBy(leads, lead => stageDisplayLabel(lead.stage || "NEW"));
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const slices = pieSlices(entries);
  els.portfolioPie.style.background = slices.length
    ? `conic-gradient(${slices.map(slice => `${slice.color} ${slice.start}% ${slice.end}%`).join(", ")})`
    : "#edf2f7";
  els.portfolioPie.innerHTML = `<span>${leads.length}<small>leads</small></span>`;
  els.portfolioLegend.innerHTML = slices.map(slice => `
    <span><i style="background:${slice.color}"></i>${escapeHtml(slice.label)} <strong>${slice.count}</strong></span>
  `).join("") || `<p class="empty-copy">No leads match the selected filters.</p>`;

  const stageCounts = Object.entries(countBy(leads, lead => stageDisplayLabel(lead.stage || "NEW"))).sort((a, b) => b[1] - a[1]);
  const countryCounts = Object.entries(countBy(leads, inferCountry)).sort((a, b) => b[1] - a[1]);
  const dormantPct = leads.length ? Math.round((leads.filter(lead => normalizeStageKey(lead.stage) === "DORMANT").length / leads.length) * 100) : 0;
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
  const salesman = isSalesmanRole() && currentView === "dashboard";
  const priorityRow = els.sharedDashboardTopSlot;
  if (priorityRow && els.overdueBanner && els.metricsShell) {
    if (salesman && els.overdueBanner.parentElement !== priorityRow) {
      priorityRow.prepend(els.overdueBanner);
    } else if (!salesman && els.overdueBanner.parentElement === priorityRow) {
      els.metricsShell.parentElement?.insertBefore(els.overdueBanner, els.metricsShell);
    }
  }
  els.salesmanSimplifiedDashboard?.classList.toggle("hidden", !salesman);
  els.dashboardQuickActions?.classList.add("hidden");
  els.dailyAiPanel?.classList.add("hidden");
  els.salesmanLossPromptPanel?.classList.add("hidden");
  els.marketNewsPanel?.classList.add("hidden");
  els.salesmanFollowupPanel?.classList.add("hidden");
  els.portfolioPanel?.classList.add("hidden");
  els.salesmanDashboardToolsPanel?.classList.add("hidden");
  els.salesmanDashboardToggleShell?.classList.add("hidden");
  if (!salesman) {
    renderDashboardQuickActions();
    renderDailyAiPanel();
    renderSalesmanLossPromptPanel();
    renderMarketNewsPanel();
    renderSalesmanFollowups();
    renderPortfolioAnalytics();
    return;
  }
  renderSalesmanSimplifiedDashboard();
}

function arrangeAdminDashboardLayout() {
  if (!els.dashboardView || !els.metricsShell || !els.overdueBanner) return;
  const isAdminDashboard = currentView === "dashboard" && !isSalesmanRole();
  els.adminDashboardWorkRow?.classList.toggle("hidden", !isAdminDashboard);

  if (isAdminDashboard) {
    els.adminDashboardOverviewSlot?.appendChild(els.metricsShell);
    els.adminDashboardOverviewSlot?.before(els.overdueBanner);
    [els.marketIntelPanel, els.needsAttentionPanel].forEach(panel => {
      if (panel) els.adminDashboardTriageRow?.appendChild(panel);
    });
    els.adminDashboardWorkRow?.prepend(els.actionPlanPanel);
    els.adminDashboardOverviewSlot?.after(els.adminDashboardWorkRow);
    els.adminDashboardWorkRow?.after(els.adminTaskPanel, els.lossReasonsPanel, els.adminDashboardBottomRow);
    [els.marketSnapshotPanel, els.dashboardPipelineFunnelPanel].forEach(panel => {
      if (panel) els.adminDashboardAnalyticsRow?.appendChild(panel);
    });
    els.dashboardView?.appendChild(els.adminDashboardAnalyticsRow);
    ADMIN_DASHBOARD_COLLAPSIBLES.forEach(definition => {
      const section = document.getElementById(definition.id);
      if (!section) return;
      const heading = section.querySelector(".panel-header h2");
      if (heading) heading.innerHTML = pageTitleMarkup(heading.textContent);
      section.classList.add("collapsible-enabled");
      section.querySelector(".panel-collapse-toggle")?.classList.remove("hidden");
      updateDashboardCollapsibleButton(section);
    });
    if (!els.actionPlanPanel?.dataset.actionPlanDefaultOpen) {
      setDashboardSectionCollapsed(els.actionPlanPanel, false, { persist: false, refresh: false, force: true });
      els.actionPlanPanel.dataset.actionPlanDefaultOpen = "true";
    }
    return;
  }

  if (els.metricsShell.parentElement !== els.sharedDashboardTopSlot) {
    els.sharedDashboardTopSlot?.appendChild(els.metricsShell);
  }
  if (!isSalesmanRole() && els.overdueBanner.parentElement !== els.sharedDashboardTopSlot) {
    els.sharedDashboardTopSlot?.insertBefore(els.overdueBanner, els.sharedDashboardTopSlot.firstChild);
  }

  if (els.actionPlanPanel?.parentElement === els.adminDashboardWorkRow) {
    els.adminDashboardWorkRow.before(els.actionPlanPanel);
  }
  const dashboardAnchor = els.actionPlanPanel || els.dashboardView.firstElementChild;
  [
    els.marketIntelPanel,
    els.needsAttentionPanel,
    els.adminTaskPanel,
    els.marketSnapshotPanel,
    els.dashboardPipelineFunnelPanel
  ].forEach(panel => {
    if (panel && panel.parentElement !== els.dashboardView) {
      els.dashboardView.insertBefore(panel, dashboardAnchor);
    }
  });
  if (
    els.dashboardView &&
    els.adminDashboardBottomRow instanceof HTMLElement &&
    els.adminDashboardBottomRow.parentElement !== els.dashboardView
  ) {
    els.actionPlanPanel?.after(els.adminDashboardBottomRow);
  }
}

function salesmanDashboardLeads() {
  if (!state.currentUser || isPrivilegedDashboardRole()) return [...state.leads];
  return state.leads.filter(lead => leadMatchesSalesman(lead, state.currentUser));
}

function firstTouchDueLeads() {
  return salesmanDashboardLeads()
    .filter(lead => !CLOSED_STAGE_KEYS.has(normalizeStageKey(lead.stage)))
    .filter(lead => !hasLeadContactedActivity(lead))
    .sort((a, b) => {
      const originRank = lead => leadOriginForCurrentUser(lead, state.currentUser).includes("Admin") ? 0 : 1;
      return originRank(a) - originRank(b)
        || compareNewestLeadFirst(a, b);
    });
}

function lossReasonPromptDueLeads() {
  return salesmanDashboardLeads()
    .filter(lead => isLostStageValue(lead.stage) && !String(lead.lost_reason || "").trim())
    .filter(lead => daysSince(lead.stage_updated_at || lead.updated_at || lead.created_at) >= 3)
    .sort((a, b) =>
      daysSince(b.stage_updated_at || b.updated_at || b.created_at) - daysSince(a.stage_updated_at || a.updated_at || a.created_at)
      || compareNewestLeadFirst(a, b)
    );
}

function actionableSalesmanLeads() {
  return salesmanDashboardLeads()
    .filter(lead => !CLOSED_STAGE_KEYS.has(normalizeStageKey(lead.stage)))
    .filter(lead => String(lead.next_action_date || "").slice(0, 10))
    .sort((a, b) =>
      String(a.next_action_date || "").localeCompare(String(b.next_action_date || ""))
      || compareNewestLeadFirst(a, b)
    );
}

function salesmanDashboardSummaryDatasets() {
  const myLeads = salesmanDashboardLeads();
  const scheduled = actionableSalesmanLeads();
  const overdueCalls = scheduled.filter(leadHasOverdueNextAction);
  const dueToday = scheduled.filter(lead =>
    String(lead.next_action_date || "").slice(0, 10) === today()
  );
  const byStage = stageKey => myLeads.filter(lead => normalizeStageKey(lead.stage) === stageKey);
  return {
    myLeads,
    overdueCalls,
    dueToday,
    stageNew: byStage("NEW"),
    stageContacted: byStage("CONTACTED"),
    stageNegotiation: byStage("NEGOTIATION"),
    stageWon: byStage("WON"),
    stageDormant: byStage("DORMANT"),
    stageLost: byStage("LOST")
  };
}

function salesmanDashboardActionSummaryDatasets() {
  const followups = salesmanFollowups();
  const metrics = state.dailyPipelineSummary?.metrics || {};
  return {
    overdue: followups.filter(reminder => daysUntil(reminder.due_date) < 0),
    coverageGap: Array.isArray(metrics.contact_overdue_companies)
      ? metrics.contact_overdue_companies
      : [],
    nextUp: followups
      .filter(reminder => daysUntil(reminder.due_date) > 0)
      .sort((a, b) =>
        String(a.due_date || "").localeCompare(String(b.due_date || ""))
        || String(a.due_time || "").localeCompare(String(b.due_time || ""))
        || String(a.company_name || "").localeCompare(String(b.company_name || ""))
      )
  };
}

function salesmanDashboardSummaryIcon(type) {
  const icons = {
    myLeads: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
    overdueCalls: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.63a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0 1 22 16.92z"></path>',
    dueToday: '<rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M16 2v4M8 2v4M3 10h18M12 14v4M10 16h4"></path>',
    stageNew: '<path d="M15 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8" cy="7" r="4"></circle><path d="M19 8v6M16 11h6"></path>',
    stageContacted: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path><path d="M8 10h.01M12 10h.01M16 10h.01"></path>',
    stageNegotiation: '<path d="m8 11 4-4 4 4M12 7v10"></path><path d="M5 5 2 8l4 4M19 5l3 3-4 4"></path><path d="M7 19h10"></path>',
    stageWon: '<path d="M8 21h8M12 17v4"></path><path d="M7 4h10v5a5 5 0 0 1-10 0z"></path><path d="M7 6H4a2 2 0 0 0 2 4h1M17 6h3a2 2 0 0 1-2 4h-1"></path>',
    stageLost: '<circle cx="12" cy="12" r="9"></circle><path d="m9 9 6 6m0-6-6 6"></path>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${icons[type] || icons.myLeads}</svg>`;
}

function renderSalespersonReferencePanels(datasets) {
  const root = els.salesmanSimplifiedDashboard;
  const loading = state.leadsLoading && !state.leadsLoaded;
  const unavailable = state.leadsError && !state.leadsLoaded;
  const candidates = [...actionableSalesmanLeads(), ...firstTouchDueLeads()];
  const seen = new Set();
  const focus = candidates.filter(lead => !seen.has(lead.id) && seen.add(lead.id)).slice(0, 3);
  root.querySelector("#salespersonFocusList").innerHTML = loading || unavailable
    ? `<li class="empty-copy">${loading ? "Loading your priorities..." : "Priorities unavailable. Use Refresh to retry."}</li>`
    : focus.length ? focus.map((lead, index) => {
      const contact = primaryLeadContact(lead);
      const overdue = leadHasOverdueNextAction(lead);
      const emailAction = /email/i.test(lead.next_action || "");
      const phone = String(contact.phone || "").replace(/[^+\d*#,;]/g, "");
      const id = escapeHtml(lead.id), company = escapeHtml(lead.company_name || "Unnamed company");
      const call = phone ? `<a class="${emailAction ? "ghost-button" : "primary-button"} focus-contact" href="tel:${escapeHtml(phone)}" aria-label="Call ${company}" title="Call"><span class="focus-icon focus-phone"></span>${emailAction ? "" : "<span>Call</span>"}</a>` : `<button class="ghost-button focus-contact" type="button" disabled aria-label="No phone number for ${company}" title="No phone number on file"><span class="focus-icon focus-phone"></span></button>`;
      const email = `<button class="${emailAction ? "primary-button" : "ghost-button"} focus-contact" type="button" data-dashboard-email="${id}" aria-label="Draft email to ${company}" title="${contact.email ? "Draft email" : "No email address on file"}" ${contact.email ? "" : "disabled"}><span class="focus-icon focus-mail"></span>${emailAction ? "<span>Email</span>" : ""}</button>`;
      return `<li><span class="salesperson-focus-number">${index + 1}</span><div class="focus-copy"><button type="button" class="salesperson-focus-company" data-dashboard-focus-open="${id}">${company}</button>${overdue ? `<span class="salesperson-overdue-chip">${daysOverdue(lead.next_action_date)}d overdue</span>` : ""}<p>${escapeHtml(lead.next_action || "No first contact logged. Review the company and plan your opening contact.")}</p></div><div class="focus-actions">${emailAction ? email + call : call + email}<button class="ghost-button" type="button" data-dashboard-focus-log="${id}" aria-label="Log activity for ${company}" title="Log activity"><span class="focus-icon focus-check"></span></button><button class="ghost-button" type="button" data-dashboard-focus-open="${id}" aria-label="Open ${company}" title="Open lead"><span class="focus-icon focus-chevron"></span></button></div></li>`;
    }).join("") : '<li class="empty-copy">Your scheduled queue and first touches are clear.</li>';
  // Only explicit creator provenance is classified; missing provenance stays unknown.
  const origins = { "Created by others": 0, "Self-generated": 0, "Unrecorded origin": 0 };
  datasets.myLeads.forEach(lead => {
    const label = !lead.created_by ? "Unrecorded origin"
      : leadGeneratedBySalesman(lead, state.currentUser) ? "Self-generated" : "Created by others";
    origins[label] += 1;
  });
  root.querySelector("#salespersonOrigin").innerHTML = loading || unavailable ? '<p class="empty-copy">Account totals not available yet.</p>' : Object.entries(origins).filter(([label, count]) => count || label !== "Unrecorded origin").map(([label, count]) => `<div class="salesperson-origin-row${label === "Unrecorded origin" ? " origin-unknown" : ""}"><span class="salesperson-origin-label">${escapeHtml(label)}</span><span class="salesperson-mobile-label">${escapeHtml(label)}</span><strong>${count} accounts</strong><meter min="0" max="${Math.max(1, datasets.myLeads.length)}" value="${count}" aria-label="${escapeHtml(label)} account share"></meter><small>Task totals unavailable</small></div>`).join("");
  root.querySelector("#salespersonPipelineNote").textContent = loading ? "Loading pipeline..." : unavailable ? "Pipeline unavailable." : datasets.myLeads.length
    ? `${datasets.stageNew.length} of ${datasets.myLeads.length} leads are at ${stageDisplayLabel("NEW")}.`
    : "No assigned leads yet.";
  const metrics = state.dailyPipelineSummary?.metrics;
  const prospect = datasets.stageNew.length;
  const engaged = datasets.stageNegotiation.length;
  const total = datasets.myLeads.length;
  const others = Math.max(0, total - prospect - engaged);
  root.querySelector("#salespersonMobilePipeline").innerHTML = `<div class="salesperson-mobile-pipeline-heading"><h2>My pipeline</h2><button type="button" class="text-button" data-dashboard-stages aria-controls="salespersonPipelineBreakdown" aria-expanded="false" title="Toggle pipeline stage breakdown">${loading || unavailable ? "Unavailable" : `${total} leads`} <span aria-hidden="true">&rsaquo;</span></button></div>${loading || unavailable ? '<p class="empty-copy">Pipeline totals not available yet.</p>' : `<div class="salesperson-pipeline-segments" role="img" aria-label="${prospect} Prospect, ${engaged} Engaged, ${others} in other stages">${[["prospect", prospect], ["engaged", engaged], ["others", others]].map(([key, count]) => `<span class="segment-${key}" style="width:${total ? count / total * 100 : 0}%"></span>`).join("")}</div><p class="salesperson-pipeline-legend"><span>Prospect ${prospect}</span><span>Engaged ${engaged}</span><span>Others ${others}</span></p>`}`;
  root.querySelector("#salespersonQuickGrid").innerHTML = [
    { action: "neglected", label: "Who have I neglected?", icon: "myLeads", count: metrics?.contact_overdue_count },
    { action: "pipeline_health", label: "My pipeline health", mobileLabel: "Pipeline health", icon: "stageNegotiation" },
    { action: "new_intel", label: "New intel on my prospects", mobileLabel: "New intel", icon: "dueToday" }
  ].map(item => `<button type="button" class="salesperson-quick-action" data-dashboard-portfolio="${item.action}" ${loading || unavailable || state.dailyAiLoading ? "disabled" : ""}><span class="salesperson-quick-icon">${salesmanDashboardSummaryIcon(item.icon)}</span><span class="salesperson-quick-count">${Number.isFinite(item.count) ? item.count : "Not available"}</span><strong><span class="salesperson-desktop-label">${item.label}</span><span class="salesperson-mobile-label">${item.mobileLabel || item.label}</span></strong></button>`).join("");
}

function arrangeSalespersonMobileDashboard() {
  const breakdown = document.querySelector("#salespersonPipelineBreakdown");
  if (!breakdown) return;
  const mobile = window.matchMedia("(max-width: 720px)").matches;
  if (breakdown.dataset.mobile !== String(mobile)) {
    breakdown.open = !mobile;
    breakdown.dataset.mobile = String(mobile);
  }
  document.querySelector("[data-dashboard-stages]")?.setAttribute("aria-expanded", String(breakdown.open));
}

window.matchMedia("(max-width: 720px)").addEventListener("change", arrangeSalespersonMobileDashboard);

function renderSalesmanSimplifiedDashboard() {
  if (!els.salesmanSimplifiedDashboard) return;
  const datasets = salesmanDashboardSummaryDatasets();
  const leads = datasets.myLeads;
  const queue = actionableSalesmanLeads();
  const overdue = datasets.overdueCalls;
  const dueToday = datasets.dueToday;
  const overdueFollowups = leads.filter(lead => !CLOSED_STAGE_KEYS.has(normalizeStageKey(lead.stage)))
    .flatMap(remindersForLead).filter(reminder => reminder.due_date && daysUntil(reminder.due_date) < 0).length;
  renderSalespersonReferencePanels(datasets);
  const pipelineCounts = {
    NEW: datasets.stageNew.length,
    CONTACTED: datasets.stageContacted.length,
    NEGOTIATION: datasets.stageNegotiation.length,
    WON: datasets.stageWon.length,
    DORMANT: datasets.stageDormant.length,
    LOST: datasets.stageLost.length
  };

  if (els.salesmanSimplifiedGreeting) {
    els.salesmanSimplifiedGreeting.textContent = `${greetingText()}, ${firstName(state.currentUser?.name || state.currentUser?.email)}`;
  }

  if (els.salesmanSimplifiedMetrics) {
    const summaryLoading = state.leadsLoading && !state.leadsLoaded;
    const summaryUnavailable = Boolean(state.leadsError && !state.leadsLoaded);
    els.salesmanSimplifiedMetrics.innerHTML = [
      { type: "salesmanOverdueCalls", icon: "overdueCalls", label: "Overdue leads", value: overdue.length, meta: `${overdueFollowups} overdue follow-ups${overdue.length ? ` · oldest next action ${daysOverdue(overdue[0].next_action_date)} days` : ""}`, action: "See details", tone: "danger" },
      { type: "salesmanDueToday", icon: "dueToday", label: "Due today", value: dueToday.length, meta: dueToday.length ? `${dueToday[0].company_name || "Next lead"} is due today` : "Nothing scheduled", action: "View today's list", tone: "warm" },
      { type: "salesmanMyLeads", icon: "myLeads", label: "My leads", value: leads.length, meta: "Total assigned to you", action: "View summary", tone: "info" }
    ].map(card => `
      <button class="salesman-simplified-metric tone-${escapeHtml(card.tone)} ${summaryLoading ? "is-loading" : ""}" type="button" data-summary-card="${escapeHtml(card.type)}" aria-haspopup="dialog" aria-controls="summaryCardDetailsDialog" aria-label="${escapeHtml(`${card.label}, ${summaryUnavailable ? "unavailable" : card.value}. ${card.action}`)}" title="${escapeHtml(`View ${card.label} breakdown`)}" aria-busy="${summaryLoading}" ${summaryLoading || summaryUnavailable ? "disabled" : ""}>
        <span class="salesman-summary-card-icon">${salesmanDashboardSummaryIcon(card.icon)}</span>
        <span class="salesman-summary-card-copy">
          <span class="salesman-summary-card-label">${escapeHtml(card.label)}</span>
          <strong>${summaryUnavailable ? "Unavailable" : escapeHtml(String(card.value))}</strong>
          <small>${summaryUnavailable ? "Could not load leads" : escapeHtml(card.meta)}</small>
          <span class="salesman-summary-card-action">${escapeHtml(card.action)} <span aria-hidden="true">&rarr;</span></span>
        </span>
        <span class="salesman-summary-card-chevron" aria-hidden="true">&rsaquo;</span>
      </button>
    `).join("") + `<div class="salesman-simplified-metric management-metric"><span class="salesman-summary-card-copy"><span class="salesman-summary-card-label">Management tasks</span><strong>Not available</strong><small>Task totals not recorded</small></span></div>`;
  }

  if (els.salesmanSimplifiedActions) {
    els.salesmanSimplifiedActions.innerHTML = salesmanPriorityActions().map(item => {
      const attributes = item.summaryType
        ? `data-summary-card="${escapeHtml(item.summaryType)}" aria-haspopup="dialog" aria-controls="summaryCardDetailsDialog" title="${escapeHtml(`View ${item.kicker} breakdown`)}"`
        : item.aiAction
          ? `data-salesperson-ai-action="${escapeHtml(item.aiAction)}"`
          : `data-dashboard-action="${escapeHtml(item.key)}"`;
      const bodyMarkup = item.bodyEntity
        ? `
          <p class="salesman-triage-body">
            ${item.bodyPrefix ? `<span class="salesman-triage-body-prefix">${escapeHtml(item.bodyPrefix)}</span>` : ""}
            <span class="salesman-triage-company">${escapeHtml(item.bodyEntity)}</span>
            ${item.bodySuffix ? `<span class="salesman-triage-body-suffix">${escapeHtml(item.bodySuffix)}</span>` : ""}
          </p>
        `
        : `<p class="salesman-triage-body">${escapeHtml(item.body || "")}</p>`;
      return `
        <button class="salesman-triage-card tone-${escapeHtml(item.tone || "neutral")}" type="button" ${attributes}>
          <span class="salesman-triage-kicker">${escapeHtml(item.kicker)}</span>
          <strong class="salesman-triage-title">${escapeHtml(item.title)}</strong>
          ${bodyMarkup}
          <span class="salesman-triage-detail">${escapeHtml(item.detail || "")}</span>
          <small>${escapeHtml(item.cta)}</small>
        </button>
      `;
    }).join("");
  }

  const visibleQueue = queue.slice(0, 10);
  if (els.salesmanSimplifiedQueueMeta) {
    els.salesmanSimplifiedQueueMeta.textContent = visibleQueue.length
      ? `${visibleQueue.length} next action${visibleQueue.length === 1 ? "" : "s"} sorted by due date`
      : "No scheduled next actions yet.";
  }
  if (els.salesmanSimplifiedQueue) {
    els.salesmanSimplifiedQueue.innerHTML = visibleQueue.length ? visibleQueue.map(lead => {
      const dueDate = String(lead.next_action_date || "").slice(0, 10);
      const overdueLabel = leadHasOverdueNextAction(lead)
        ? `${daysOverdue(dueDate)} day${daysOverdue(dueDate) === 1 ? "" : "s"} overdue`
        : formatPlanDate(dueDate);
      return `
        <button class="salesman-simplified-queue-item" type="button" data-salesman-queue-open="${escapeHtml(lead.id)}">
          <div>
            <strong>${escapeHtml(lead.company_name || "Unnamed lead")}<span class="salesman-queue-icon" aria-hidden="true"></span></strong>
            <p>${escapeHtml(lead.next_action || "Next step")} - ${escapeHtml(lead.activity_purpose || "Follow-up")}</p>
          </div>
          <span class="chip ${leadHasOverdueNextAction(lead) ? "hot" : ""}">${escapeHtml(overdueLabel)}</span>
        </button>
      `;
    }).join("") : `<p class="empty-copy">Your next-action queue is clear. Add a new lead or log activity from the field.</p>`;
  }

  if (els.salesmanSimplifiedFirstTouch) {
    const firstTouches = firstTouchDueLeads().slice(0, 6);
    els.salesmanSimplifiedFirstTouch.innerHTML = firstTouches.length ? firstTouches.map(lead => {
      const origin = leadOriginForCurrentUser(lead, state.currentUser);
      return `
        <article class="salesman-first-touch-card">
          <div class="salesman-first-touch-main">
            <span class="salesman-first-touch-kicker">${escapeHtml(origin)}</span>
            <strong>${escapeHtml(lead.company_name || "Unnamed company")}</strong>
            <p>${escapeHtml(lead.contact_person || lead.location || lead.territory || "No contact details added yet.")}</p>
            <div class="chip-row">
              <span class="chip">${escapeHtml(stageDisplayLabel(lead.stage))}</span>
              <span class="chip ${leadOriginChipClass(origin)}">${escapeHtml(origin)}</span>
            </div>
          </div>
          <div class="salesman-first-touch-actions">
            <button class="small-action" type="button" data-first-touch-open="${escapeHtml(lead.id)}">Open lead</button>
            <button class="small-action" type="button" data-first-touch-log="${escapeHtml(lead.id)}">Log first touch</button>
          </div>
        </article>
      `;
    }).join("") : `<p class="empty-copy">Every open lead already has a first touch logged.</p>`;
  }

  if (els.salesmanSimplifiedLossPrompts) {
    const dueLeads = lossReasonPromptDueLeads().slice(0, 6);
    els.salesmanSimplifiedLossPrompts.innerHTML = dueLeads.length ? dueLeads.map(lead => {
      const overdueDays = Math.max(0, daysSince(lead.stage_updated_at || lead.updated_at || lead.created_at) - 3);
      return `
        <article class="salesman-loss-card">
          <div class="salesman-loss-card-copy">
            <span class="salesman-loss-kicker">Lost lead follow-through</span>
            <strong>${escapeHtml(lead.company_name || "Unnamed company")}</strong>
            <p>${escapeHtml(lead.lost_reason_detail || "Capture the reason now while the context is still fresh.")}</p>
            <div class="chip-row">
              <span class="chip hot">${escapeHtml(overdueDays ? `${overdueDays} day${overdueDays === 1 ? "" : "s"} late` : "Due now")}</span>
              <span class="chip">${escapeHtml(stageDisplayLabel(lead.stage))}</span>
            </div>
          </div>
          <div class="salesman-loss-card-actions">
            <button class="small-action" type="button" data-loss-prompt-open="${escapeHtml(lead.id)}">Open lead</button>
            <button class="small-action" type="button" data-loss-prompt-capture="${escapeHtml(lead.id)}">Capture reason</button>
          </div>
        </article>
      `;
    }).join("") : `<p class="empty-copy">No loss-reason prompts are due right now.</p>`;
  }

  if (els.salesmanSimplifiedPipeline) {
    const summaryLoading = state.leadsLoading && !state.leadsLoaded;
    els.salesmanSimplifiedPipeline.innerHTML = [
      { label: stageDisplayLabel("NEW"), value: pipelineCounts.NEW, type: "salesmanStageNew", icon: "stageNew", tone: "new" },
      { label: stageDisplayLabel("CONTACTED"), value: pipelineCounts.CONTACTED, type: "salesmanStageContacted", icon: "stageContacted", tone: "contacted" },
      { label: stageDisplayLabel("NEGOTIATION"), value: pipelineCounts.NEGOTIATION, type: "salesmanStageNegotiation", icon: "stageNegotiation", tone: "negotiation" },
      { label: stageDisplayLabel("WON"), value: pipelineCounts.WON, type: "salesmanStageWon", icon: "stageWon", tone: "won" },
      { label: stageDisplayLabel("DORMANT"), value: pipelineCounts.DORMANT, type: "salesmanStageDormant", icon: "dueToday", tone: "dormant" },
      { label: "Lost", value: pipelineCounts.LOST, type: "salesmanStageLost", icon: "stageLost", tone: "lost" }
    ].map(card => `
      <button class="salesman-simplified-stage tone-${escapeHtml(card.tone)} ${summaryLoading ? "is-loading" : ""}" type="button" data-summary-card="${escapeHtml(card.type)}" aria-haspopup="dialog" aria-controls="summaryCardDetailsDialog" aria-label="${escapeHtml(`${card.label} leads, ${card.value}. View summary`)}" title="${escapeHtml(`View ${card.label} leads breakdown`)}" aria-busy="${summaryLoading}" ${summaryLoading ? "disabled" : ""}>
        <span class="salesman-stage-copy">
          <span class="salesman-stage-label">${escapeHtml(card.label)}</span>
          <strong>${escapeHtml(String(card.value))}</strong>
          <span class="salesman-stage-action">View summary <span aria-hidden="true">&rarr;</span></span>
        </span>
        <meter class="salesperson-stage-meter" min="0" max="${Math.max(1, leads.length)}" value="${card.value}" aria-label="${escapeHtml(card.label)} share"></meter>
      </button>
    `).join("");
  }

  arrangeSalespersonMobileDashboard();
  if (els.salesmanDashboardLeadCount) {
    els.salesmanDashboardLeadCount.textContent = `${leads.length} record${leads.length === 1 ? "" : "s"}`;
  }
  if (els.salesmanDashboardLeadList) {
    const dashboardLeads = [...leads].sort((a, b) => {
      const statusComparison = salesmanLeadDisplayRank(a) - salesmanLeadDisplayRank(b);
      if (statusComparison) return statusComparison;
      const aDue = String(a.next_action_date || "9999-12-31").slice(0, 10);
      const bDue = String(b.next_action_date || "9999-12-31").slice(0, 10);
      return aDue.localeCompare(bDue) || compareNewestLeadFirst(a, b);
    });
    els.salesmanDashboardLeadList.innerHTML = dashboardLeadTableMarkup(dashboardLeads);
    bindLeadTableRows(els.salesmanDashboardLeadList, "data-dashboard-lead-id", openLeadDrawer);
  }

  document.querySelectorAll("[data-salesman-queue-open]").forEach(button => {
    button.addEventListener("click", () => openLeadDrawer(button.dataset.salesmanQueueOpen));
  });
  document.querySelectorAll("[data-first-touch-open]").forEach(button => {
    button.addEventListener("click", () => openLeadDrawer(button.dataset.firstTouchOpen));
  });
  document.querySelectorAll("[data-first-touch-log]").forEach(button => {
    button.addEventListener("click", () => openQuickLog(button.dataset.firstTouchLog));
  });
  document.querySelectorAll("[data-loss-prompt-open]").forEach(button => {
    button.addEventListener("click", () => openLeadDrawer(button.dataset.lossPromptOpen));
  });
  document.querySelectorAll("[data-loss-prompt-capture]").forEach(button => {
    button.addEventListener("click", async () => {
      const lead = state.leads.find(item => item.id === button.dataset.lossPromptCapture);
      if (!lead) return;
      const lostData = await promptLostReason(lead);
      if (!lostData) return;
      await saveStageWithLostPrompt(lead, lead.stage, lostData);
      await loadLeads();
      render();
    });
  });
}

function scrollToDashboardPanel(panel) {
  panel?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setDashboardMarketNewsOpen(open) {
  state.dashboardMarketNewsOpen = Boolean(open);
  localStorage.setItem(DASHBOARD_MARKET_NEWS_KEY, state.dashboardMarketNewsOpen ? "true" : "false");
  renderDashboardQuickActions();
  renderMarketNewsPanel();
  renderMarketIntelPanel();
}

function setDashboardPerformanceOpen(open) {
  state.dashboardPerformanceOpen = Boolean(open);
  localStorage.setItem(DASHBOARD_PERFORMANCE_KEY, state.dashboardPerformanceOpen ? "true" : "false");
  renderDashboardQuickActions();
  renderPortfolioAnalytics();
  renderDashboardPipelineFunnel();
}

function setDashboardAgentOpen(open) {
  state.agentOpen = Boolean(open);
  localStorage.setItem(DASHBOARD_AGENT_KEY, state.agentOpen ? "true" : "false");
  renderDashboardQuickActions();
  renderAgentPanel();
}

function setDashboardToolsOpen(open) {
  state.dashboardToolsOpen = Boolean(open);
  localStorage.setItem(DASHBOARD_TOOLS_KEY, state.dashboardToolsOpen ? "true" : "false");
  renderDashboardQuickActions();
  renderPortfolioAnalytics();
  renderDashboardPipelineFunnel();
  renderMarketNewsPanel();
  renderMarketIntelPanel();
  renderAgentPanel();
}

function salesmanPriorityActions() {
  const allFollowups = salesmanFollowups();
  const overdueFollowups = allFollowups.filter(reminder => daysUntil(reminder.due_date) < 0);
  const todayFollowups = allFollowups.filter(reminder => daysUntil(reminder.due_date) === 0);
  const firstTouches = firstTouchDueLeads();
  const lossReasonPrompts = lossReasonPromptDueLeads();
  const metrics = state.dailyPipelineSummary?.metrics || {};
  const neglectedCount = Number(metrics.contact_overdue_count || 0);
  const cards = [];

  if (overdueFollowups.length) {
    const oldestOverdue = overdueFollowups[0];
    cards.push({
      key: "followups",
      summaryType: "salesmanActionOverdue",
      tone: "danger",
      kicker: "Overdue",
      title: `Clear ${overdueFollowups.length} overdue follow-up${overdueFollowups.length === 1 ? "" : "s"}`,
      bodyPrefix: "Oldest:",
      bodyEntity: oldestOverdue.company_name || "Lead",
      bodySuffix: `- ${daysOverdueLabel(oldestOverdue.due_date)}`,
      detail: `Next move: ${oldestOverdue.activity_required || oldestOverdue.reminder_type || "Complete the follow-up"}`,
      cta: "Review queue"
    });
  } else if (todayFollowups.length) {
    const todayFollowup = todayFollowups[0];
    cards.push({
      key: "followups",
      tone: "warm",
      kicker: "Due today",
      title: `${todayFollowups.length} follow-up${todayFollowups.length === 1 ? "" : "s"} scheduled for today`,
      bodyPrefix: "Start with",
      bodyEntity: todayFollowup.company_name || "your next lead",
      bodySuffix: "and keep the day moving.",
      detail: `Next move: ${todayFollowup.activity_required || todayFollowup.reminder_type || "Complete today's follow-up"}`,
      cta: "Open today queue"
    });
  }

  if (firstTouches.length) {
    cards.push({
      key: "first-touch",
      tone: "info",
      kicker: "First touch",
      title: `${firstTouches.length} lead${firstTouches.length === 1 ? "" : "s"} still need the first contact`,
      bodyEntity: firstTouches[0].company_name || "Newest lead",
      bodySuffix: "is still waiting for its opening call or visit.",
      detail: `Contact: ${firstTouches[0].contact_person || firstTouches[0].location || firstTouches[0].territory || "Open the lead for contact details"}`,
      cta: "Start first touch"
    });
  }

  if (lossReasonPrompts.length) {
    cards.push({
      key: "loss-reasons",
      tone: "danger",
      kicker: "3-day deadline",
      title: `${lossReasonPrompts.length} blocked lead${lossReasonPrompts.length === 1 ? "" : "s"} still need a reason`,
      bodyEntity: lossReasonPrompts[0].company_name || "A blocked lead",
      bodySuffix: "has crossed the reason-capture deadline.",
      detail: "Capture the decision context while the customer conversation is still fresh.",
      cta: "Capture reason"
    });
  }

  if (cards.length < 3 && neglectedCount) {
    cards.push({
      key: "neglected",
      summaryType: "salesmanActionCoverageGap",
      tone: "neutral",
      kicker: "Coverage gap",
      title: `${neglectedCount} account${neglectedCount === 1 ? "" : "s"} are past expected contact frequency`,
      body: "Use the queue and your next actions to revive the quiet relationships before they cool down.",
      detail: "Start with the account that has gone longest without a logged interaction.",
      cta: "See neglected accounts"
    });
  }

  if (cards.length < 3 && allFollowups.length > overdueFollowups.length + todayFollowups.length) {
    const nextReminder = allFollowups
      .filter(reminder => daysUntil(reminder.due_date) > 0)
      .sort((a, b) => String(a.due_date || "").localeCompare(String(b.due_date || "")))[0];
    if (nextReminder) {
      cards.push({
        key: "followups",
        summaryType: "salesmanActionNextUp",
        tone: "neutral",
        kicker: "Next up",
        title: `Prepare ${nextReminder.company_name || "the next account"} before it slips`,
        body: `${formatPlanDate(nextReminder.due_date)} - ${nextReminder.next_action || nextReminder.activity_type || "Follow up"}`,
        detail: `Due in ${daysUntil(nextReminder.due_date)} day${daysUntil(nextReminder.due_date) === 1 ? "" : "s"}; review the last interaction before contacting them.`,
        cta: "Review upcoming queue"
      });
    }
  }

  if (cards.length < 3) {
    cards.push({
      key: "log-activity",
      tone: "info",
      kicker: "Capture",
      title: "Log today's field activity before it gets missed",
      body: "Record the latest call, visit, or quotation follow-up while the details are still fresh.",
      detail: "Include the outcome and next action date so tomorrow's queue stays accurate.",
      cta: "Log activity"
    });
  }

  return cards.slice(0, 3);
}

function renderDashboardQuickActions() {
  if (!els.dashboardQuickActions) return;
  const salesman = isSalesmanRole();
  els.dashboardQuickActions.classList.toggle("hidden", !salesman);
  els.salesmanDashboardToggleShell?.classList.toggle("hidden", !salesman);
  els.salesmanDashboardToolsPanel?.classList.toggle("hidden", !(salesman && state.dashboardToolsOpen));
  if (!salesman) {
    els.dashboardToggleMarketNews?.classList.remove("is-active");
    els.dashboardTogglePerformance?.classList.remove("is-active");
    els.dashboardToggleAgent?.classList.remove("is-active");
    if (els.dashboardToggleTools) els.dashboardToggleTools.setAttribute("aria-expanded", "false");
    return;
  }
  const leads = firstTouchDueLeads().slice(0, 6);
  if (els.dashboardFirstTouchList) {
    els.dashboardFirstTouchList.innerHTML = leads.length ? leads.map(lead => {
      const origin = leadOriginForCurrentUser(lead, state.currentUser);
      const createdLabel = leadRegistrationDate(lead) ? formatPlanDate(leadRegistrationDate(lead)) : "New lead";
      return `
        <article class="salesman-first-touch-card">
          <div class="salesman-first-touch-main">
            <span class="salesman-first-touch-kicker">${escapeHtml(origin)}</span>
            <strong>${escapeHtml(lead.company_name || "Unnamed company")}</strong>
            <p>${escapeHtml(lead.contact_person || lead.location || lead.territory || "No contact details added yet.")}</p>
            <div class="chip-row">
              <span class="chip">${escapeHtml(stageDisplayLabel(lead.stage || "NEW"))}</span>
              <span class="chip">${escapeHtml(createdLabel)}</span>
              <span class="chip ${leadOriginChipClass(origin)}">${escapeHtml(origin)}</span>
            </div>
          </div>
          <div class="salesman-first-touch-actions">
            <button class="small-action" type="button" data-first-touch-open="${escapeHtml(lead.id)}">Open Lead</button>
            <button class="small-action" type="button" data-first-touch-log="${escapeHtml(lead.id)}">Log First Touch</button>
          </div>
        </article>
      `;
    }).join("") : `<p class="empty-copy">Every open lead already has a first touch logged. Nice and calm.</p>`;
  }
  document.querySelectorAll("[data-first-touch-open]").forEach(button => {
    button.addEventListener("click", () => openLeadDrawer(button.dataset.firstTouchOpen));
  });
  document.querySelectorAll("[data-first-touch-log]").forEach(button => {
    button.addEventListener("click", () => openQuickLog(button.dataset.firstTouchLog));
  });

  const insightsOpen = Boolean(state.dashboardMarketNewsOpen);
  const performanceOpen = Boolean(state.dashboardPerformanceOpen);
  const agentOpen = Boolean(state.agentOpen);
  const toolsOpen = Boolean(state.dashboardToolsOpen);

  if (els.dashboardToggleTools) {
    els.dashboardToggleTools.classList.toggle("is-active", toolsOpen);
    els.dashboardToggleTools.setAttribute("aria-expanded", toolsOpen ? "true" : "false");
    const title = els.dashboardToggleTools.querySelector("strong");
    const body = els.dashboardToggleTools.querySelector("small");
    if (title) title.textContent = toolsOpen ? "Hide coaching and research tools" : "Open extra tools only when needed";
    if (body) body.textContent = toolsOpen
      ? "Collapse the non-urgent layers and return to the act-now dashboard."
      : "Full pipeline, performance, market intel, and the database assistant stay tucked away until you choose to open them.";
  }

  const syncToolButton = (button, open, openTitle, closeTitle, openCopy, closeCopy) => {
    if (!button) return;
    const title = button.querySelector("strong");
    const body = button.querySelector("small");
    button.classList.toggle("is-active", open);
    if (title) title.textContent = open ? closeTitle : openTitle;
    if (body) body.textContent = open ? closeCopy : openCopy;
  };

  syncToolButton(
    els.dashboardToggleMarketNews,
    insightsOpen,
    "Market intel and news",
    "Hide intel and news",
    "Browse headlines and project signals without crowding the default view.",
    "Close the research layer and return to the action queue."
  );
  syncToolButton(
    els.dashboardTogglePerformance,
    performanceOpen,
    "My performance",
    "Hide performance",
    "Reveal conversion, distribution, and portfolio metrics.",
    "Hide the coaching metrics and keep the dashboard focused on execution."
  );
  syncToolButton(
    els.dashboardToggleAgent,
    agentOpen,
    "Ask the database",
    "Hide database oracle",
    "Open the read-only CRM oracle when you have a specific question.",
    "Close the oracle and keep the landing page free of reference material."
  );
}

function renderDailyAiPanel() {
  if (!els.dailyAiPanel) return;
  const salesman = isSalesmanRole();
  els.dailyAiPanel.classList.toggle("hidden", !salesman);
  if (!salesman) return;
  if (els.dailyAiGreeting) els.dailyAiGreeting.textContent = `${greetingText()}, ${firstName(state.currentUser.name || state.currentUser.email)}`;
  const actions = salesmanPriorityActions();
  if (els.dailyAiActions) {
    els.dailyAiActions.innerHTML = actions.map(item => {
      const bodyMarkup = item.bodyEntity
        ? `
          <p class="salesman-triage-body">
            ${item.bodyPrefix ? `<span class="salesman-triage-body-prefix">${escapeHtml(item.bodyPrefix)}</span>` : ""}
            <span class="salesman-triage-company">${escapeHtml(item.bodyEntity)}</span>
            ${item.bodySuffix ? `<span class="salesman-triage-body-suffix">${escapeHtml(item.bodySuffix)}</span>` : ""}
          </p>
        `
        : `<p class="salesman-triage-body">${escapeHtml(item.body || "")}</p>`;
      return `
        <button class="salesman-triage-card tone-${escapeHtml(item.tone || "neutral")}" type="button" ${item.aiAction ? `data-salesperson-ai-action="${escapeHtml(item.aiAction)}"` : `data-dashboard-action="${escapeHtml(item.key)}"`}>
          <span class="salesman-triage-kicker">${escapeHtml(item.kicker)}</span>
          <strong class="salesman-triage-title">${escapeHtml(item.title)}</strong>
          ${bodyMarkup}
          <span class="salesman-triage-detail">${escapeHtml(item.detail || "")}</span>
          <small>${escapeHtml(item.cta)}</small>
        </button>
      `;
    }).join("");
  }
  els.dailyAiPanel.querySelectorAll("[data-salesperson-ai-action]").forEach(button => {
    button.disabled = state.dailyAiLoading || Date.now() < state.aiCooldownUntil;
  });
  if (!els.dailyAiSummary) return;
  const metrics = state.dailyPipelineSummary?.metrics || {};
  const firstTouchCount = firstTouchDueLeads().length;
  const lossReasonCount = lossReasonPromptDueLeads().length;
  const overdueCount = Number(metrics.overdue_next_actions || salesmanFollowups().filter(reminder => daysUntil(reminder.due_date) < 0).length);
  els.dailyAiSummary.classList.remove("hidden");
  els.dailyAiSummary.innerHTML = `
    <strong>Today&apos;s queue</strong>
    <span>${overdueCount} overdue follow-up${overdueCount === 1 ? "" : "s"}</span>
    <span>${firstTouchCount} first touch${firstTouchCount === 1 ? "" : "es"}</span>
    <span>${lossReasonCount} loss reason${lossReasonCount === 1 ? "" : "s"} due</span>
  `;
}

function renderSalesmanLossPromptPanel() {
  if (!els.salesmanLossPromptPanel || !els.salesmanLossPromptList) return;
  const salesman = isSalesmanRole();
  els.salesmanLossPromptPanel.classList.toggle("hidden", !salesman);
  if (!salesman) return;
  const dueLeads = lossReasonPromptDueLeads().slice(0, 6);
  els.salesmanLossPromptList.innerHTML = dueLeads.length ? dueLeads.map(lead => {
    const overdueDays = daysSince(lead.stage_updated_at || lead.updated_at || lead.created_at) - 3;
    return `
      <article class="salesman-loss-card">
        <div class="salesman-loss-card-copy">
          <span class="salesman-loss-kicker">Lost lead follow-through</span>
          <strong>${escapeHtml(lead.company_name || "Unnamed company")}</strong>
          <p>${escapeHtml(lead.lost_reason_detail || lead.notes || "Capture the primary loss reason and any context for coaching.")}</p>
          <div class="chip-row">
            <span class="chip hot">${escapeHtml(overdueDays > 0 ? `${overdueDays} day${overdueDays === 1 ? "" : "s"} late` : "Due now")}</span>
            <span class="chip">${escapeHtml(stageDisplayLabel(lead.stage || "LOST"))}</span>
            <span class="chip">${escapeHtml(lead.assigned_salesman || salesmanName(state.currentUser))}</span>
          </div>
        </div>
        <div class="salesman-loss-card-actions">
          <button class="small-action" type="button" data-loss-prompt-open="${escapeHtml(lead.id)}">Open Lead</button>
          <button class="small-action" type="button" data-loss-prompt-capture="${escapeHtml(lead.id)}">Capture Reason</button>
        </div>
      </article>
    `;
  }).join("") : `<p class="empty-copy">No loss-reason prompts are due right now.</p>`;

  document.querySelectorAll("[data-loss-prompt-open]").forEach(button => {
    button.addEventListener("click", () => openLeadDrawer(button.dataset.lossPromptOpen));
  });
  document.querySelectorAll("[data-loss-prompt-capture]").forEach(button => {
    button.addEventListener("click", async () => {
      const lead = state.leads.find(item => item.id === button.dataset.lossPromptCapture);
      if (!lead) return;
      const lostData = await promptLostReason(lead);
      if (!lostData) return;
      await saveStageWithLostPrompt(lead, lead.stage, lostData);
      await loadLeads();
      render();
    });
  });
}

function marketNewsCardMarkup(item) {
  const title = item.title || "Untitled article";
  const description = item.description || "No summary available for this article yet.";
  const source = item.source || "News source";
  const published = item.published_at ? formatDateTime(item.published_at) : "Recently published";
  return `
    <article class="market-news-card article-card">
      <div class="market-news-topline">
        <span class="source-badge">${escapeHtml(source)}</span>
        <span class="market-news-time">${escapeHtml(published)}</span>
      </div>
      <strong class="article-title">${escapeHtml(title)}</strong>
      <p class="article-description">${escapeHtml(description)}</p>
      ${item.url ? `<a class="market-news-link open-article-link" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">Open full article</a>` : ""}
    </article>
  `;
}

function renderMarketNewsPanel() {
  if (!els.marketNewsPanel || !els.marketNewsFeed) return;
  const salesmanDashboard = isSalesmanRole() && currentView === "dashboard";
  const visible = Boolean(salesmanDashboard && state.dashboardToolsOpen && state.dashboardMarketNewsOpen);
  els.marketNewsPanel.classList.toggle("hidden", !visible);
  if (!visible) return;
  if (els.marketNewsMeta) {
    els.marketNewsMeta.textContent = state.marketNews.loading
      ? "Refreshing..."
      : state.marketNews.fetched_at
        ? `Updated ${formatDateTime(state.marketNews.fetched_at)}`
        : "";
  }
  if (state.marketNews.loading) {
    els.marketNewsFeed.innerHTML = `
      <div class="market-news-skeleton" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
      </div>
    `;
    return;
  }
  if (state.marketNews.error) {
    els.marketNewsFeed.innerHTML = `<p class="empty-copy">Market news is temporarily unavailable. ${escapeHtml(state.marketNews.error)}</p>`;
    return;
  }
  if (state.marketNews.disabled) {
    els.marketNewsFeed.innerHTML = `<p class="empty-copy">${escapeHtml(state.marketNews.reason || "Market news is disabled until NEWS_API_KEY is configured on the server.")}</p>`;
    return;
  }
  const items = (state.marketNews.items || []).slice(0, 6);
  els.marketNewsFeed.innerHTML = items.length
    ? items.map(marketNewsCardMarkup).join("")
    : `<p class="empty-copy">No market news articles are available right now. Fresh construction, oil and gas, marine engineering, metal, and fabrication headlines will appear here when NewsAPI returns results.</p>`;
}

function maybeAutoRunDailyPipeline() {
  if (!state.currentUser || !isSalesmanRole()) return;
  // Version the key when the response shape changes so existing sessions fetch
  // the new per-company coverage-gap details instead of reusing a stale marker.
  const key = `arg_daily_pipeline_contact_list_v1_${state.currentUser.id || state.currentUser.email}_${today()}`;
  if (localStorage.getItem(key) === "true") return;
  localStorage.setItem(key, "true");
  runSalespersonAiAction("pipeline_health", { showDialog: false }).catch(() => null);
}

function renderAgentPanel() {
  if (!els.agentPanel) return;
  const salesman = isSalesmanRole();
  els.agentPanel.classList.toggle("hidden", Boolean(salesman && (!state.dashboardToolsOpen || !state.agentOpen)));
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
        "How many leads are in Negotiation?",
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
    els.configAgentExamples.innerHTML = examples.filter(prompt => !/whats\s*app/i.test(String(prompt))).map(prompt => `
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
        <span class="meta-label">${escapeHtml(stageDisplayLabel(stage))}</span>
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
  const visible = admin || Boolean(state.dashboardToolsOpen && state.dashboardMarketNewsOpen);
  els.marketIntelPanel.classList.toggle("hidden", !visible);
  if (!visible) return;
  els.refreshMarketIntel?.classList.toggle("hidden", !admin);
  if (els.marketIntelKicker) els.marketIntelKicker.textContent = admin ? "Intel Overview" : "Market Intel";
  if (els.marketIntelTitle) els.marketIntelTitle.innerHTML = pageTitleMarkup(admin ? "Last 7 days across territories" : "Signals matched to your prospects");
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
  if (els.needsAttentionCount) {
    els.needsAttentionCount.textContent = `${open.length} open`;
    els.needsAttentionCount.classList.toggle("attention-count-success", open.length === 0);
    els.needsAttentionCount.classList.toggle("attention-count-danger", open.length > 0);
  }
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

function leadTablePresentation(lead) {
  const plan = leadActionPlanState(lead);
  const dueDate = String(lead.next_action_date || "").slice(0, 10);
  const overdueDays = dueDate ? Math.max(0, -daysUntil(dueDate)) : null;
  const overdueTone = overdueDays === null || overdueDays === 0
    ? "neutral"
    : overdueDays >= 35 ? "red" : "amber";
  const overdueLabel = overdueDays === null
    ? "Not set"
    : overdueDays === 0 ? "Not overdue" : `${overdueDays} day${overdueDays === 1 ? "" : "s"}`;
  const priorityLabel = String(lead.priority || lead.health?.label || "Not set").trim();
  const normalizedPriority = priorityLabel.toLowerCase();
  const priorityTone = /(red|hot|high|at risk|overdue)/.test(normalizedPriority)
    ? "red"
    : /(amber|warm|medium|orange)/.test(normalizedPriority)
      ? "amber"
      : /(green|cold|low)/.test(normalizedPriority) ? "green" : "neutral";
  const stageKey = normalizeStageKey(lead.stage).toLowerCase();
  const companyMeta = [inferEmirate(lead), daysAgoLabel(lead.last_activity)].filter(Boolean).join(" - ");
  return { plan, dueDate, overdueTone, overdueLabel, priorityLabel, priorityTone, stageKey, companyMeta };
}

function leadTableRowMarkup(lead, { idAttribute = "data-lead-id", selectedId = "" } = {}) {
  const { plan, dueDate, overdueTone, overdueLabel, priorityLabel, priorityTone, stageKey, companyMeta } = leadTablePresentation(lead);
  return `
    <tr class="lead-table-row ${lead.id === selectedId ? "active" : ""}" ${idAttribute}="${escapeHtml(lead.id)}" tabindex="0" role="link" aria-label="Open ${escapeHtml(lead.company_name || "lead")}">
      <td class="lead-table-company">
        <strong>${escapeHtml(lead.company_name || "Unnamed company")}</strong>
        ${companyMeta ? `<small>${escapeHtml(companyMeta)}</small>` : ""}
      </td>
      <td class="lead-table-next-action">${escapeHtml(plan.action)}</td>
      <td><span class="lead-table-badge lead-table-overdue-${overdueTone}">${escapeHtml(overdueLabel)}</span></td>
      <td>${escapeHtml(dueDate ? formatPlanDate(dueDate) : "Not set")}</td>
      <td>${escapeHtml(lead.assigned_salesman || "Unassigned")}</td>
      <td><span class="lead-table-badge lead-table-stage-${escapeHtml(stageKey)}">${escapeHtml(stageDisplayLabel(lead.stage))}</span></td>
      <td><span class="lead-table-badge lead-table-priority-${priorityTone}">${escapeHtml(priorityLabel)}</span></td>
      <td class="lead-table-territory">${escapeHtml(lead.territory || inferEmirate(lead) || "Not set")}</td>
    </tr>
  `;
}

function primaryLeadContact(lead) {
  const contacts = Array.isArray(lead.contacts) ? lead.contacts : [];
  const contact = contacts.find(item => item?.is_default || item?.is_primary || item?.default)
    || contacts[0]
    || {};
  return {
    name: contact.name || contact.contact_person || lead.contact_person || "",
    phone: contact.phone || contact.mobile || lead.phone || "",
    email: contact.email || lead.email || ""
  };
}

function dashboardLeadTableRowMarkup(lead) {
  const { plan, overdueTone, overdueLabel, stageKey, companyMeta } = leadTablePresentation(lead);
  const contact = primaryLeadContact(lead);
  const dashboardOverdueLabel = overdueLabel === "Not set" ? "Not overdue" : overdueLabel;
  return `
    <tr class="lead-table-row" data-dashboard-lead-id="${escapeHtml(lead.id)}" tabindex="0" role="link" aria-label="Open ${escapeHtml(lead.company_name || "lead")}">
      <td class="lead-table-company">
        <strong>${escapeHtml(lead.company_name || "Unnamed company")}</strong>
        ${companyMeta ? `<small>${escapeHtml(companyMeta)}</small>` : ""}
      </td>
      <td class="lead-table-contact ${contact.name ? "" : "is-empty"}">${escapeHtml(contact.name || "Not added")}</td>
      <td class="lead-table-contact-link">${contact.phone
        ? `<a href="tel:${escapeHtml(contact.phone)}" aria-label="Call ${escapeHtml(contact.name || lead.company_name || "contact")}">${escapeHtml(contact.phone)}</a>`
        : `<span class="is-empty">&mdash;</span>`}</td>
      <td class="lead-table-next-action">${escapeHtml(plan.action)}</td>
      <td><span class="lead-table-badge lead-table-overdue-${overdueTone}">${escapeHtml(dashboardOverdueLabel)}</span></td>
      <td><span class="lead-table-badge lead-table-stage-${escapeHtml(stageKey)}">${escapeHtml(stageDisplayLabel(lead.stage))}</span></td>
    </tr>
  `;
}

function dashboardLeadTableMarkup(leads) {
  const rows = leads.map(dashboardLeadTableRowMarkup).join("");
  return `
    <table class="live-lead-table dashboard-live-lead-table">
      <thead>
        <tr>
          <th scope="col">Company Name</th>
          <th scope="col">Contact Person</th>
          <th scope="col">Phone</th>
          <th scope="col">Next Action</th>
          <th scope="col">Days Overdue</th>
          <th scope="col">Stage</th>
        </tr>
      </thead>
      <tbody>${rows || `<tr class="lead-table-empty"><td colspan="6">No assigned leads found.</td></tr>`}</tbody>
    </table>
  `;
}

function leadTableMarkup(leads, { idAttribute = "data-lead-id", selectedId = "", emptyText = "No leads match the current filters." } = {}) {
  const rows = leads.map(lead => leadTableRowMarkup(lead, { idAttribute, selectedId })).join("");
  return `
    <table class="live-lead-table">
      <thead>
        <tr>
          <th scope="col">Company Name</th>
          <th scope="col">Next Action</th>
          <th scope="col">Days Overdue</th>
          <th scope="col">Due Date</th>
          <th scope="col">Salesman</th>
          <th scope="col">Stage</th>
          <th scope="col">Priority</th>
          <th scope="col">Territory</th>
        </tr>
      </thead>
      <tbody>${rows || `<tr class="lead-table-empty"><td colspan="8">${escapeHtml(emptyText)}</td></tr>`}</tbody>
    </table>
  `;
}

function pipelineDaysOverdue(lead) {
  const dueDate = String(lead?.next_action_date || "").slice(0, 10);
  return dueDate ? Math.max(0, -daysUntil(dueDate)) : null;
}

function pipelineFilterOptions(values, selected, allLabel, displayLabel = value => value) {
  const normalizedValues = [...new Set(values
    .map(value => String(value || "").trim())
    .filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
  return [
    `<option value="all" ${selected === "all" ? "selected" : ""}>${escapeHtml(allLabel)}</option>`,
    ...normalizedValues.map(value => `<option value="${escapeHtml(value)}" ${selected === value ? "selected" : ""}>${escapeHtml(displayLabel(value))}</option>`)
  ].join("");
}

function pipelineFilterActiveCount() {
  return [
    state.filters.search,
    state.filters.stage !== "all",
    state.filters.salesman !== "all",
    state.filters.priority !== "all",
    state.filters.territory !== "all",
    state.pipelineTable.nextAction !== "all",
    state.pipelineTable.overdue !== "all",
    state.pipelineTable.dueDate,
    state.pipelineTable.dateFrom,
    state.pipelineTable.dateTo,
    state.overduePipelineOnly,
    state.dueTodayPipelineOnly,
    state.importedAfter
  ].filter(Boolean).length;
}

function resetPipelineFilters() {
  state.filters = { search: "", stage: "all", salesman: "all", priority: "all", territory: "all" };
  state.pipelineTable.nextAction = "all";
  state.pipelineTable.overdue = "all";
  state.pipelineTable.dueDate = "";
  state.pipelineTable.dateFrom = "";
  state.pipelineTable.dateTo = "";
  state.pipelineTable.page = 1;
  state.overduePipelineOnly = false;
  state.dueTodayPipelineOnly = false;
  state.importedAfter = "";
}

function matchesPipelineOverdueRange(lead, range) {
  if (range === "all") return true;
  const days = pipelineDaysOverdue(lead);
  if (range === "not-overdue") return !days;
  if (days === null || days === 0) return false;
  if (range === "1-7") return days <= 7;
  if (range === "8-14") return days >= 8 && days <= 14;
  if (range === "15-30") return days >= 15 && days <= 30;
  if (range === "31-plus") return days > 30;
  return true;
}

function pipelineSortValue(lead, key) {
  const presentation = leadTablePresentation(lead);
  const values = {
    company: lead.company_name || lead.contact_person || "",
    nextAction: presentation.plan.action || "",
    daysOverdue: pipelineDaysOverdue(lead) ?? -1,
    dueDate: String(lead.next_action_date || "").slice(0, 10),
    salesman: lead.assigned_salesman || "",
    stage: KANBAN_STAGE_BY_KEY[kanbanStageForLead(lead)]?.label || "New",
    priority: presentation.priorityLabel || "",
    territory: lead.territory || inferEmirate(lead) || ""
  };
  return values[key] ?? "";
}

function salesmanLeadDisplayRank(lead) {
  return ["DORMANT", "LOST"].includes(normalizeStageKey(lead?.stage)) ? 1 : 0;
}

function pipelineFilteredAndSortedLeads() {
  const nextAction = state.pipelineTable.nextAction;
  const dueDate = state.pipelineTable.dueDate;
  const dateFrom = state.pipelineTable.dateFrom;
  const dateTo = state.pipelineTable.dateTo;
  const direction = state.pipelineTable.sortDirection === "desc" ? -1 : 1;
  const key = state.pipelineTable.sortKey;
  return filteredLeads()
    .filter(lead => {
      const action = leadActionPlanState(lead).action;
      const reportDueDate = String(lead.next_action_date || "").slice(0, 10);
      return (nextAction === "all" || action === nextAction)
        && matchesPipelineOverdueRange(lead, state.pipelineTable.overdue)
        && (!dueDate || reportDueDate === dueDate)
        && (!dateFrom || (reportDueDate && reportDueDate >= dateFrom))
        && (!dateTo || (reportDueDate && reportDueDate <= dateTo));
    })
    .map((lead, index) => ({ lead, index }))
    .sort((left, right) => {
      const statusComparison = isSalesmanRole()
        ? salesmanLeadDisplayRank(left.lead) - salesmanLeadDisplayRank(right.lead)
        : 0;
      if (statusComparison) return statusComparison;
      const a = pipelineSortValue(left.lead, key);
      const b = pipelineSortValue(right.lead, key);
      const comparison = typeof a === "number" && typeof b === "number"
        ? a - b
        : String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
      return comparison ? comparison * direction : left.index - right.index;
    })
    .map(item => item.lead);
}

function pipelineSortableHeader(key, label) {
  const active = state.pipelineTable.sortKey === key;
  const direction = active ? state.pipelineTable.sortDirection : "none";
  const nextDirection = active && direction === "asc" ? "descending" : "ascending";
  return `
    <th scope="col" aria-sort="${active ? `${direction}ending` : "none"}">
      <button class="pipeline-sort-button ${active ? "active" : ""}" type="button" data-pipeline-sort="${escapeHtml(key)}" aria-label="Sort ${escapeHtml(label)} ${nextDirection}">
        <span>${escapeHtml(label)}</span>
        <span class="pipeline-sort-indicator" aria-hidden="true">${active ? (direction === "asc" ? "▲" : "▼") : "↕"}</span>
      </button>
    </th>
  `;
}

function pipelineLeadRowMarkup(lead) {
  const { plan, dueDate, overdueTone, overdueLabel, priorityLabel, priorityTone, stageKey, companyMeta } = leadTablePresentation(lead);
  const contact = primaryLeadContact(lead);
  return `
    <tr class="lead-table-row ${lead.id === state.selectedId ? "active" : ""}" data-lead-id="${escapeHtml(lead.id)}" tabindex="0" role="link" aria-label="Open ${escapeHtml(lead.company_name || "lead")}">
      <td class="lead-table-company">
        <strong>${escapeHtml(lead.company_name || "Unnamed company")}</strong>
        ${companyMeta ? `<small>${escapeHtml(companyMeta)}</small>` : ""}
      </td>
      <td class="lead-table-next-action" data-label="Next action">${escapeHtml(plan.action)}</td>
      <td data-label="Days overdue"><span class="lead-table-badge lead-table-overdue-${overdueTone}">${escapeHtml(overdueLabel)}</span>${isSalesmanRole() ? `<small class="salesman-pipeline-due">${escapeHtml(dueDate ? `Due ${formatPlanDate(dueDate)}` : "No due date")}</small>` : ""}</td>
      <td data-label="Due date">${escapeHtml(dueDate ? formatPlanDate(dueDate) : "Not set")}</td>
      <td data-label="Salesman">${escapeHtml(lead.assigned_salesman || "Unassigned")}</td>
      <td data-label="Stage"><span class="lead-table-badge lead-table-stage-${escapeHtml(stageKey)}">${escapeHtml(stageDisplayLabel(lead.stage))}</span></td>
      <td data-label="Priority"><span class="lead-table-badge lead-table-priority-${priorityTone}">${escapeHtml(priorityLabel)}</span></td>
      <td class="lead-table-territory" data-label="Territory">${escapeHtml(lead.territory || inferEmirate(lead) || "Not set")}</td>
      <td class="pipeline-row-actions">
        ${isSalesmanRole() ? `<button class="primary-button salesman-pipeline-log" type="button" data-pipeline-log="${escapeHtml(lead.id)}" style="--crm-button-icon:var(--crm-icon-${/email/i.test(plan.action) ? "mail" : "phone"})">${/email/i.test(plan.action) ? "Log email" : /visit/i.test(plan.action) ? "Log visit" : "Log call"}</button>` : ""}
        ${contact.phone ? `<a class="pipeline-mobile-call" href="tel:${escapeHtml(contact.phone)}" aria-label="Call ${escapeHtml(contact.name || lead.company_name || "contact")}">Call</a>` : ""}
        <button class="pipeline-row-action" type="button" data-pipeline-open="${escapeHtml(lead.id)}" aria-label="Open ${escapeHtml(lead.company_name || "lead")}">Open</button>
      </td>
    </tr>
  `;
}

function pipelineFilterHeaderMarkup() {
  const nextActions = state.leads.map(lead => leadActionPlanState(lead).action);
  const stages = [...(state.settings.stages || []), ...state.leads.map(lead => lead.stage)];
  const priorities = [...(state.settings.priorities || []), ...state.leads.map(lead => lead.priority)];
  const territories = [...(state.settings.territories || []), ...state.leads.flatMap(lead => [lead.territory, inferEmirate(lead)])];
  const salesmen = [...(state.settings.salesmen || []).map(salesmanName), ...state.leads.map(lead => lead.assigned_salesman)];
  const salesmanControl = isSalesmanRole()
    ? `<span class="pipeline-owner-scope" aria-label="Salesman scope">${escapeHtml(state.currentUser?.name || "My leads")}</span>`
    : `<label><span class="sr-only">Filter by salesman</span><select class="${state.filters.salesman !== "all" ? "is-active" : ""}" data-pipeline-filter="salesman">${pipelineFilterOptions(salesmen, state.filters.salesman, "All salesmen")}</select></label>`;
  return `
    <tr class="pipeline-filter-row">
      <th>
        <label><span class="sr-only">Filter company or contact</span><input class="${state.filters.search ? "is-active" : ""}" type="search" data-pipeline-filter="search" value="${escapeHtml(state.filters.search)}" placeholder="Filter company / contact..."></label>
      </th>
      <th>
        <label><span class="sr-only">Filter by next action</span><select class="${state.pipelineTable.nextAction !== "all" ? "is-active" : ""}" data-pipeline-filter="nextAction">${pipelineFilterOptions(nextActions, state.pipelineTable.nextAction, "All actions")}</select></label>
      </th>
      <th>
        <label><span class="sr-only">Filter by days overdue</span><select class="${state.pipelineTable.overdue !== "all" ? "is-active" : ""}" data-pipeline-filter="overdue">
          <option value="all" ${state.pipelineTable.overdue === "all" ? "selected" : ""}>All</option>
          <option value="not-overdue" ${state.pipelineTable.overdue === "not-overdue" ? "selected" : ""}>Not overdue</option>
          <option value="1-7" ${state.pipelineTable.overdue === "1-7" ? "selected" : ""}>1-7 days</option>
          <option value="8-14" ${state.pipelineTable.overdue === "8-14" ? "selected" : ""}>8-14 days</option>
          <option value="15-30" ${state.pipelineTable.overdue === "15-30" ? "selected" : ""}>15-30 days</option>
          <option value="31-plus" ${state.pipelineTable.overdue === "31-plus" ? "selected" : ""}>More than 30 days</option>
        </select></label>
      </th>
      <th>
        <label><span class="sr-only">Filter by exact due date</span><input class="${state.pipelineTable.dueDate ? "is-active" : ""}" type="date" data-pipeline-filter="dueDate" value="${escapeHtml(state.pipelineTable.dueDate)}"></label>
      </th>
      <th>${salesmanControl}</th>
      <th>
        <label><span class="sr-only">Filter by stage</span><select class="${state.filters.stage !== "all" ? "is-active" : ""}" data-pipeline-filter="stage">${pipelineFilterOptions(stages, state.filters.stage, "All stages", value => STAGE_DISPLAY_LABELS[normalizeStageKey(value, "")] || value)}</select></label>
      </th>
      <th>
        <label><span class="sr-only">Filter by priority</span><select class="${state.filters.priority !== "all" ? "is-active" : ""}" data-pipeline-filter="priority">${pipelineFilterOptions(priorities, state.filters.priority, "All priorities")}</select></label>
      </th>
      <th>
        <label><span class="sr-only">Filter by territory</span><select class="${state.filters.territory !== "all" ? "is-active" : ""}" data-pipeline-filter="territory">${pipelineFilterOptions(territories, state.filters.territory, "All territories")}</select></label>
      </th>
      <th><span class="sr-only">Row actions</span></th>
    </tr>
  `;
}

let salesmanPipelineColumnsExpanded = false;
let dismissedPipelineAlertFor = "";

function salesmanPipelineFiltersMarkup() {
  // Reuse the existing controls and values through a structured DOM fragment.
  const template = document.createElement("template");
  template.innerHTML = `<table><thead>${pipelineFilterHeaderMarkup()}</thead></table>`;
  const fields = [...template.content.querySelectorAll(".pipeline-filter-row > th")];
  const bar = document.createElement("div");
  bar.className = "salesman-pipeline-filters";
  for (const index of [0, 1, 5, 6, 7]) {
    const group = document.createElement("div");
    group.className = "salesman-pipeline-filter";
    group.append(...fields[index].childNodes);
    bar.append(group);
  }
  bar.querySelector('[data-pipeline-filter="stage"] option[value="all"]').textContent = "All statuses";
  bar.querySelector('[data-pipeline-filter="search"]').placeholder = "Filter company or contact";
  const more = document.createElement("details");
  more.className = "salesman-pipeline-more";
  more.open = state.pipelineTable.overdue !== "all" || Boolean(state.pipelineTable.dueDate) || salesmanPipelineColumnsExpanded;
  more.innerHTML = `<summary>More filters</summary><div class="salesman-pipeline-more-fields"></div>`;
  const extra = more.querySelector("div");
  for (const [index, label] of [[2, "Days overdue"], [3, "Due date"]]) {
    const field = fields[index].querySelector("label");
    field.querySelector("span").className = "";
    field.querySelector("span").textContent = label;
    extra.append(field);
  }
  const columns = document.createElement("label");
  columns.innerHTML = `<input type="checkbox" data-pipeline-columns ${salesmanPipelineColumnsExpanded ? "checked" : ""}> Show all columns`;
  extra.append(columns);
  bar.append(more);
  const actions = document.createElement("div");
  actions.className = "salesman-pipeline-filter-actions";
  bar.append(actions);
  return bar.outerHTML;
}

function renderSalesmanPipelineAlert() {
  const banner = document.querySelector("#salesmanPipelineAlert");
  if (!banner) return;
  const owner = String(state.currentUser?.id || state.currentUser?.email || "");
  const visible = currentView === "pipeline" && isSalesmanRole() && state.leadsLoaded && !state.leadsError && dismissedPipelineAlertFor !== owner;
  const ids = new Set(salesmanDashboardLeads().map(lead => String(lead.id)));
  const items = visible ? overdueItems().filter(item => ids.has(String(item.lead_id))) : [];
  banner.classList.toggle("hidden", !items.length);
  if (!items.length) { banner.innerHTML = ""; return; }
  banner.innerHTML = `<p><strong>${items.length} overdue follow-ups across ${new Set(items.map(item => item.lead_id)).size} leads.</strong> Oldest: ${escapeHtml(items[0].company_name)}, ${escapeHtml(daysOverdueLabel(items[0].due_date))}.</p><button class="ghost-button" type="button" data-salesman-pipeline-overdue>Show overdue only</button><button class="ghost-button" type="button" data-salesman-pipeline-dismiss aria-label="Dismiss pipeline overdue notice">Close</button>`;
  banner.querySelector('[data-salesman-pipeline-overdue]').addEventListener('click', openOverduePipeline);
  banner.querySelector('[data-salesman-pipeline-dismiss]').addEventListener('click', () => { dismissedPipelineAlertFor = owner; renderSalesmanPipelineAlert(); });
}

function pipelineTableMarkup(leads) {
  const rows = leads.map(pipelineLeadRowMarkup).join("");
  return `
    ${isSalesmanRole() ? salesmanPipelineFiltersMarkup() : ""}
    <table class="live-lead-table pipeline-lead-table" role="table" aria-label="Live leads">
      <thead>
        <tr class="pipeline-column-row">
          ${pipelineSortableHeader("company", "Company / Contact")}
          ${pipelineSortableHeader("nextAction", "Next Action")}
          ${pipelineSortableHeader("daysOverdue", "Days Overdue")}
          ${pipelineSortableHeader("dueDate", "Due Date")}
          ${pipelineSortableHeader("salesman", "Salesman")}
          ${pipelineSortableHeader("stage", isSalesmanRole() ? "Status" : "Stage")}
          ${pipelineSortableHeader("priority", "Priority")}
          ${pipelineSortableHeader("territory", "Territory")}
          <th scope="col">Actions</th>
        </tr>
        ${isSalesmanRole() ? "" : pipelineFilterHeaderMarkup()}
      </thead>
      <tbody>${rows || `
        <tr class="lead-table-empty">
          <td colspan="9">
            <div class="pipeline-empty-state">
              <strong>No leads match the selected filters.</strong>
              <button class="ghost-button" type="button" data-pipeline-clear>Clear all filters</button>
            </div>
          </td>
        </tr>`}
      </tbody>
    </table>
  `;
}

function pipelineLoadingMarkup() {
  return `
    <div class="pipeline-loading-state" role="status" aria-label="Loading live leads">
      ${Array.from({ length: 6 }, (_, index) => `<span style="--skeleton-index:${index}"></span>`).join("")}
    </div>
  `;
}

function pipelineErrorMarkup(message) {
  return `
    <div class="pipeline-error-state" role="alert">
      <strong>Live leads could not be loaded.</strong>
      <span>${escapeHtml(message || "Please try again.")}</span>
      <button class="primary-button" type="button" data-pipeline-retry>Retry</button>
    </div>
  `;
}

function pipelinePaginationMarkup(total, page, pageSize) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const start = total ? ((page - 1) * pageSize) + 1 : 0;
  const end = Math.min(total, page * pageSize);
  return `
    <div class="pipeline-pagination-summary">Showing ${start}-${end} of ${total} result${total === 1 ? "" : "s"}</div>
    <div class="pipeline-pagination-controls">
      <label>Rows
        <select data-pipeline-page-size>
          ${[10, 20, 50].map(size => `<option value="${size}" ${pageSize === size ? "selected" : ""}>${size}</option>`).join("")}
        </select>
      </label>
      <button class="ghost-button" type="button" data-pipeline-page="${page - 1}" ${page <= 1 ? "disabled" : ""} aria-label="Previous page">Previous</button>
      <span>Page ${page} of ${pages}</span>
      <button class="ghost-button" type="button" data-pipeline-page="${page + 1}" ${page >= pages ? "disabled" : ""} aria-label="Next page">Next</button>
    </div>
  `;
}

function bindLeadTableRows(container, idAttribute, onOpen) {
  container.querySelectorAll(`.lead-table-row[${idAttribute}]`).forEach(row => {
    const openRow = () => onOpen(row.getAttribute(idAttribute));
    row.addEventListener("click", event => {
      if (event.target.closest("a, button")) return;
      openRow();
    });
    row.addEventListener("keydown", event => {
      if (event.target.closest("a, button")) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openRow();
    });
  });
}

function restorePipelineFilterFocus(filter, selectionStart, selectionEnd) {
  if (!filter) return;
  const control = els.leadList.querySelector(`[data-pipeline-filter="${filter}"]`);
  if (!control) return;
  control.focus();
  if (typeof control.setSelectionRange === "function" && Number.isInteger(selectionStart)) {
    control.setSelectionRange(selectionStart, selectionEnd);
  }
}

function renderLeadList({ focusFilter = "", selectionStart, selectionEnd } = {}) {
  if (!els.leadList) return;
  renderSalesmanPipelineAlert();
  const toolbar = document.querySelector("#pipelineListPanel .pipeline-list-actions");
  if (toolbar) toolbar.append(...[els.clearPipelineFilters, els.refreshPipelineLeads].filter(Boolean));
  const canExportPipeline = state.currentUser?.role === "admin";
  const activeFilters = pipelineFilterActiveCount();
  els.pipelineReportTools?.classList.toggle("hidden", !canExportPipeline);
  if (els.pipelineReportDateFrom && document.activeElement !== els.pipelineReportDateFrom) {
    els.pipelineReportDateFrom.value = state.pipelineTable.dateFrom;
  }
  if (els.pipelineReportDateTo && document.activeElement !== els.pipelineReportDateTo) {
    els.pipelineReportDateTo.value = state.pipelineTable.dateTo;
  }
  els.clearPipelineFilters?.classList.toggle("hidden", activeFilters === 0 && !isSalesmanRole());
  els.leadList.setAttribute("aria-busy", String(state.leadsLoading));

  if (state.leadsLoading && !state.leadsLoaded) {
    [els.exportPipelineExcel, els.exportPipelinePdf].forEach(button => {
      if (button) button.disabled = true;
    });
    els.leadCount.textContent = "Loading records";
    els.leadList.innerHTML = pipelineLoadingMarkup();
    if (els.pipelinePagination) els.pipelinePagination.innerHTML = "";
    return;
  }
  if (state.leadsError) {
    [els.exportPipelineExcel, els.exportPipelinePdf].forEach(button => {
      if (button) button.disabled = true;
    });
    els.leadCount.textContent = "Records unavailable";
    els.leadList.innerHTML = pipelineErrorMarkup(state.leadsError);
    if (els.pipelinePagination) els.pipelinePagination.innerHTML = "";
    bindPipelineTableEvents();
    return;
  }

  const filtered = pipelineFilteredAndSortedLeads();
  [els.exportPipelineExcel, els.exportPipelinePdf].forEach(button => {
    if (button) button.disabled = !canExportPipeline || filtered.length === 0;
  });
  const total = state.leads.length;
  const pages = Math.max(1, Math.ceil(filtered.length / state.pipelineTable.pageSize));
  state.pipelineTable.page = Math.min(Math.max(1, state.pipelineTable.page), pages);
  const start = (state.pipelineTable.page - 1) * state.pipelineTable.pageSize;
  const leads = filtered.slice(start, start + state.pipelineTable.pageSize);
  els.leadCount.textContent = activeFilters
    ? `Showing ${filtered.length} of ${total} leads`
    : `${total} lead${total === 1 ? "" : "s"}`;
  if (els.pipelineListStatus) {
    els.pipelineListStatus.textContent = `${filtered.length} lead${filtered.length === 1 ? "" : "s"} shown${activeFilters ? ` with ${activeFilters} active filter${activeFilters === 1 ? "" : "s"}` : ""}.`;
  }
  els.leadList.innerHTML = pipelineTableMarkup(leads);
  if (isSalesmanRole()) {
    els.leadList.classList.toggle("salesman-pipeline-all-columns", salesmanPipelineColumnsExpanded);
    const actions = els.leadList.querySelector(".salesman-pipeline-filter-actions");
    if (actions) actions.append(...[els.clearPipelineFilters, els.refreshPipelineLeads].filter(Boolean));
  }
  if (els.pipelinePagination) {
    els.pipelinePagination.innerHTML = pipelinePaginationMarkup(filtered.length, state.pipelineTable.page, state.pipelineTable.pageSize);
  }

  bindLeadTableRows(els.leadList, "data-lead-id", leadId => {
    state.selectedId = leadId;
    openLeadDrawer(leadId);
    render();
  });
  bindPipelineTableEvents();
  restorePipelineFilterFocus(focusFilter, selectionStart, selectionEnd);
}

function updatePipelineFilter(filter, value) {
  if (["search", "stage", "salesman", "priority", "territory"].includes(filter)) {
    state.filters[filter] = value;
  } else if (["nextAction", "overdue", "dueDate", "dateFrom", "dateTo"].includes(filter)) {
    state.pipelineTable[filter] = value;
  }
  state.pipelineTable.page = 1;
  state.importedAfter = "";
}

function bindPipelineTableEvents() {
  if (!els.leadList) return;
  els.leadList.querySelector('[data-pipeline-columns]')?.addEventListener('change', event => {
    salesmanPipelineColumnsExpanded = event.currentTarget.checked;
    els.leadList.classList.toggle('salesman-pipeline-all-columns', salesmanPipelineColumnsExpanded);
  });
  els.leadList.querySelectorAll('[data-pipeline-log]').forEach(button => button.addEventListener('click', () => {
    const lead = salesmanDashboardLeads().find(item => String(item.id) === button.dataset.pipelineLog);
    if (lead && isSalesmanRole()) openActivityModal(lead.id, button);
  }));
  els.leadList.querySelectorAll("[data-pipeline-filter]").forEach(control => {
    const eventName = control.matches('input[type="search"]') ? "input" : "change";
    control.addEventListener(eventName, event => {
      const target = event.currentTarget;
      updatePipelineFilter(target.dataset.pipelineFilter, target.value);
      renderLeadList({
        focusFilter: target.dataset.pipelineFilter,
        selectionStart: target.selectionStart,
        selectionEnd: target.selectionEnd
      });
    });
  });
  els.leadList.querySelectorAll("[data-pipeline-sort]").forEach(button => {
    button.addEventListener("click", () => {
      const key = button.dataset.pipelineSort;
      if (state.pipelineTable.sortKey === key) {
        state.pipelineTable.sortDirection = state.pipelineTable.sortDirection === "asc" ? "desc" : "asc";
      } else {
        state.pipelineTable.sortKey = key;
        state.pipelineTable.sortDirection = "asc";
      }
      state.pipelineTable.page = 1;
      renderLeadList();
    });
  });
  els.leadList.querySelectorAll("[data-pipeline-open]").forEach(button => {
    button.addEventListener("click", event => {
      event.stopPropagation();
      state.selectedId = button.dataset.pipelineOpen;
      openLeadDrawer(button.dataset.pipelineOpen);
    });
  });
  els.leadList.querySelectorAll("[data-pipeline-clear]").forEach(button => {
    button.addEventListener("click", () => {
      resetPipelineFilters();
      render();
    });
  });
  els.leadList.querySelectorAll("[data-pipeline-retry]").forEach(button => {
    button.addEventListener("click", () => loadLeads().catch(error => setToast(error.message, "error")));
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
  if (STAGE_DISPLAY_LABELS[key]) return STAGE_DISPLAY_LABELS[key];
  return KANBAN_STAGE_BY_KEY[key]?.label || "New";
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
    els.dashboardSubline.textContent = state.currentUser.role === "admin"
      ? `${state.leads.length} account${state.leads.length === 1 ? "" : "s"} - ${territory}`
      : "Start with overdue follow-ups, first touch, and loss reasons due.";
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

function pageTitleMarkup(value) {
  const title = String(value ?? "");
  const parts = /^(.*?)(\S+)(\s*)$/s.exec(title);
  if (!parts) return escapeHtml(title);
  return `${escapeHtml(parts[1])}<em class="crm-title-accent">${escapeHtml(parts[2])}</em>${escapeHtml(parts[3])}`;
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
      title: state.currentUser.role === "admin" ? "Dashboard" : "What do I do next?",
      context: state.currentUser.role === "admin"
        ? `${state.leads.length} account${state.leads.length === 1 ? "" : "s"} across ${territory}`
        : "Start with the urgent queue, then open the wider CRM."
    },
    pipeline: {
      title: "Pipeline",
      context: `${state.leads.length} live lead${state.leads.length === 1 ? "" : "s"} in active tracking`
    },
    salesmen: {
      title: "Salesmen",
      context: "Team ownership, activity, and follow-up performance"
    },
    tasks: {
      title: "Tasks",
      context: state.currentUser.role === "admin"
        ? "Weekly sales reporting, review discipline, and missing-submission control"
        : "Confirm the week, explain exceptions, and submit one clean report."
    },
    activity: {
      title: "Activity",
      context: `${weekRangeLabel()} · ${currentWeekItems.length} scheduled move${currentWeekItems.length === 1 ? "" : "s"}`
    },
    lead: {
      title: selectedLead?.company_name || "Lead Detail",
      context: [selectedLead?.assigned_salesman, stageDisplayLabel(selectedLead?.stage), selectedLead?.territory].filter(Boolean).join(" · ") || "AI summary, CRM timeline, reminders, and PMRs"
    }
  }[currentView] || aiWorkspacePage(currentView) || {
    title: "CRM",
    context: `${state.leads.length} active records`
  };
  els.topbarPageTitle.innerHTML = pageTitleMarkup(config.title);
  els.topbarContext.textContent = config.context;
  const dashboardDate = document.querySelector("#salespersonDashboardDate");
  const dashboardQuestion = document.querySelector("#salespersonDashboardQuestion");
  const questionOwner = String(state.currentUser.id || state.currentUser.email || "");
  if (dashboardQuestion && dashboardQuestion.dataset.owner !== questionOwner) {
    dashboardQuestion.value = "";
    dashboardQuestion.dataset.owner = questionOwner;
  }
  const salespersonHome = currentView === "dashboard" && isSalesmanRole();
  dashboardDate?.classList.toggle("hidden", !salespersonHome);
  if (salespersonHome) {
    document.querySelector("#salespersonMobileDate").textContent = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Dubai" }).format(new Date());
    document.querySelector("#salespersonMobileGreeting").innerHTML = 'What should I do <em class="crm-title-accent">today?</em>';
    dashboardDate.textContent = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Dubai" }).format(new Date());
    els.topbarPageTitle.innerHTML = 'What should I do <em class="crm-title-accent">today?</em>';
    els.topbarContext.textContent = `${greetingText()}, ${firstName(state.currentUser.name || state.currentUser.email)}. Start with your focus list, then work through the overdue queue.`;
  }
  if (els.smartSearchInput) {
    els.smartSearchInput.dataset.originalPlaceholder ||= els.smartSearchInput.placeholder;
    els.smartSearchInput.placeholder = currentView === "pipeline" && isSalesmanRole()
      ? "Search companies, tasks, notes" : els.smartSearchInput.dataset.originalPlaceholder;
  }
  if (currentView === "pipeline" && isSalesmanRole()) {
    els.topbarPageTitle.innerHTML = 'My <em class="crm-title-accent">pipeline</em>';
    els.topbarContext.textContent = state.leadsLoading && !state.leadsLoaded ? "Loading your leads..." : `${salesmanDashboardLeads().length} leads in your pipeline`;
  }
  if (currentView === "focus" && isSalesmanRole()) {
    const datasets = salesmanDashboardSummaryDatasets();
    const count = datasets.overdueCalls.length + datasets.dueToday.length;
    els.topbarPageTitle.textContent = "Today";
    els.topbarContext.textContent = state.leadsLoading && !state.leadsLoaded ? "Loading your follow-ups..." : state.leadsError && !state.leadsLoaded ? "Follow-ups unavailable. Retry loading." : `${count} follow-up${count === 1 ? "" : "s"} need you. Start at the top.`;
  }
}

function leadInitial(lead) {
  return String(lead?.company_name || "?").trim().charAt(0).toUpperCase() || "?";
}

function drawerStageLabel(stage) {
  if (STAGE_DISPLAY_LABELS[normalizeStageKey(stage)]) return STAGE_DISPLAY_LABELS[normalizeStageKey(stage)];
  const match = KANBAN_STAGE_BY_KEY[normalizeStageKey(stage)];
  return match?.label || stage || "New";
}

function drawerStageClass(stage) {
  const key = kanbanStageForLead({ stage });
  return KANBAN_STAGE_BY_KEY[key]?.color || "stage-prospect";
}

function isLostStageValue(stage) {
  return kanbanStageForLead({ stage }) === "LOST";
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
  if (els.handoffTitle) els.handoffTitle.innerHTML = pageTitleMarkup(`Reassign ${existingLead.company_name || "lead"}`);
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
  state.leadDrawerPmrsError = false;
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
      state.leadDrawerPmrsError = results[0].status !== "fulfilled";
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
  if (currentView !== "lead" && !(currentView === "draft-email" && state.emailRouteLeadId) && !(currentView === "meeting-prep" && state.meetingRouteLeadId)) {
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
  const empty = !value;
  if (empty) value = "Not added";
  const auto = options.auto ? `<span class="auto-tag">Auto</span>` : "";
  const safeValue = escapeHtml(String(value));
  const content = options.href
    ? `<a class="drawer-field-value" href="${escapeHtml(options.href)}" title="${safeValue}" ${options.external ? 'target="_blank" rel="noopener"' : ""}>${safeValue}</a>`
    : `<span class="drawer-field-value" title="${safeValue}">${safeValue}</span>`;
  const classes = [
    "drawer-field",
    options.overdue ? "overdue" : "",
    empty ? "is-empty" : "",
    options.linkTone === "blue" ? "is-link-blue" : ""
  ].filter(Boolean).join(" ");
  return `<article class="${classes}"><span>${escapeHtml(label)}${auto}</span><strong>${content}</strong></article>`;
}

function drawerSummaryMetric(label, value, options = {}) {
  const tone = options.tone ? ` ${options.tone}` : "";
  return `
    <article class="drawer-summary-card${tone}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value || "Not set"))}</strong>
    </article>
  `;
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
      <select data-linkedin-title="${escapeHtml(lead.id)}" aria-label="Contact role for LinkedIn search">
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

function recordDaysSince(value) {
  const day = String(value || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const date = new Date(`${day}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== day) return null;
  const days = Math.floor((new Date(`${today()}T00:00:00Z`) - date) / 86400000);
  return Number.isFinite(days) && days >= 0 ? days : null;
}

function recordRelationshipHealth(lead) {
  const cadence = Number(lead.expected_contact_days);
  const days = recordDaysSince(lead.last_activity);
  const closed = ["LOST", "DORMANT"].includes(String(lead.stage || "").toUpperCase());
  const known = !closed && days !== null && Number.isFinite(cadence) && cadence > 0;
  const tone = !known ? "unknown" : days > cadence * 1.6 ? "red" : days > cadence ? "amber" : "green";
  const recent = (lead.activities || []).filter(activity => {
    const elapsed = recordDaysSince(activity.at);
    return elapsed !== null && elapsed <= 60;
  });
  const visits = recent.filter(activity => /in.person|site visit|meeting/i.test(activity.type || "") && !/pmr filed/i.test(activity.type || ""));
  const pmrsReady = state.selectedId === lead.id && !state.leadDrawerLoading && !state.leadDrawerPmrsError;
  const pmrs = pmrsReady ? (state.leadDrawerPmrs || []).filter(pmr => String(pmr.company_id) === String(lead.id) && !pmr.pending_sync).sort((a, b) => String(b.meeting_date || "").localeCompare(String(a.meeting_date || ""))).slice(0, 3) : [];
  const scores = pmrs.map(pmr => Number(pmr.relationship_heat_score)).filter(score => Number.isFinite(score) && score >= 1 && score <= 5);
  return {
    tone,
    label: closed ? "Closed" : ({red:"At risk", amber:"Watch", green:"Healthy", unknown:"Unknown"})[tone],
    rows: [
      ["Days since last activity", days === null ? "No valid activity date" : `${days} days${cadence > 0 ? ` · expected ${cadence}` : " · cadence unavailable"}`, tone, known ? ({red:"Act now", amber:"Watch", green:"On track"})[tone] : "Not rated"],
      ["Activity trend, last 60 days", `${recent.length} ${recent.length === 1 ? "activity" : "activities"} recorded`, recent.length ? "green" : "amber", recent.length ? "Recorded" : "Watch"],
      ["Engagement quality", visits.length ? `${visits.length} meeting / visit records in 60 days` : recent.length ? "Follow-ups only, no visit logged in 60 days" : "No recent engagement recorded", visits.length ? "green" : "amber", visits.length ? "Recorded" : "Watch"],
      ["Time in status", "Stage-change date not recorded", "unknown", "Not rated"],
      ["PMR heat scores, last 3", !pmrsReady ? state.leadDrawerLoading && state.selectedId === lead.id ? "Loading PMRs..." : "PMR data unavailable" : scores.length ? `${scores.join(", ")} / 5` : "None filed with a heat score", !pmrsReady ? "unknown" : scores.length ? "green" : "amber", !pmrsReady ? "Not rated" : scores.length ? "Recorded" : "Watch"]
    ]
  };
}

function recordHealthMarkup(lead, mobile = false) {
  const health = recordRelationshipHealth(lead);
  return `<section class="drawer-section ${mobile ? "record-mobile-health" : "record-overview-health"}" aria-label="Relationship health"><div class="record-health-heading"><h3>Relationship <em class="crm-title-accent">health</em></h3><span class="record-health-status tone-${health.tone}">${health.label}</span></div><p class="record-health-disclaimer">Contact timing uses the current status and tier cadence.</p><dl>${health.rows.map(([label, value, tone, badge]) => `<div><dt>${escapeHtml(label)}</dt><dd><strong>${escapeHtml(value)}</strong><span class="record-health-status tone-${tone}">${badge}</span></dd></div>`).join("")}</dl><button class="ghost-button danger" type="button" data-company-ai-action="flag" data-company-ai-lead="${escapeHtml(lead.id)}">Flag to director</button></section>`;
}

function recordProfileFollowupMarkup(lead) {
  const notes = String(lead.notes || "");
  const profile = /company\s+profile/i;
  const sent = text => profile.test(text) && !/not\s+(?:yet\s+)?(?:sent|emailed|shared)|hasn.t.*(?:sent|emailed|shared)|send.*pending/i.test(text) && /\bsent\b|\bemailed\b|\bshared\b/i.test(text);
  const requested = profile.test(notes) && /request|\bshare\b|\bsend\b/i.test(notes) && !/(?:did not|didn.t|never|not)\s+request(?:ed)?|\bno\s+(?:company\s+)?profile\s+request/i.test(notes);
  if (!requested || sent(notes) || (lead.activities || []).some(activity => sent(`${activity.text || ""} ${activity.note || ""}`))) return "";
  return `<div class="record-profile-followup"><span>Company profile requested · review delivery history</span><button class="record-text-action" type="button" data-record-send-profile="${escapeHtml(lead.id)}">Send profile</button></div>`;
}

function companyAiActionsMarkup(lead, { mobile = false, overview = false } = {}) {
  const actions = [
    ["prepare", "Prepare Me For This Meeting"],
    ["next", "What Should I Do Next?"],
    ["email", "Draft Follow-Up Email"],
    ["summary", "Summarise Relationship"],
    ["flag", "Flag Needs Attention"]
  ];
  const hints = {
      prepare: "History, latest PMR, intel and talking points",
      next: "Next action and reasoning",
      email: "A draft for your review",
      summary: "A concise relationship recap",
      flag: "Review before notifying the director"
  };
  if (mobile) {
    return `<section class="company-ai-actions record-mobile-ai" aria-label="One-tap AI actions">
      <h3>One-tap <em>AI actions</em></h3>
      <div class="record-mobile-ai-grid">${actions.filter(([action]) => ["prepare", "email", "summary"].includes(action)).map(([action, label]) => `<button class="record-ai-card${action === "prepare" ? " record-ai-card-primary" : ""}" type="button" data-company-ai-action="${action}" data-company-ai-lead="${escapeHtml(lead.id)}"><span><strong>${escapeHtml(action === "summary" ? "Summarise for handoff" : label)}</strong><small>${escapeHtml(hints[action])}</small></span></button>`).join("")}</div>
    </section>`;
  }
  return `<section class="drawer-section company-ai-actions${overview ? " record-overview-ai" : ""}" aria-label="Company AI actions">
    <h3>One-tap <em class="crm-title-accent">AI actions</em></h3>
    <div class="drawer-primary-actions">${actions.filter(([action]) => !overview || ["prepare", "email", "summary"].includes(action)).map(([action, label]) => `<button class="ghost-button${action === "prepare" ? " record-ai-card-primary" : ""}${action === "flag" ? " danger" : ""}" type="button" data-company-ai-action="${action}" data-company-ai-lead="${escapeHtml(lead.id)}"><span><strong>${escapeHtml(label)}</strong><small>${escapeHtml(hints[action])}</small></span></button>`).join("")}</div>
  </section>`;
}

function desktopLeadOverviewMarkup(lead) {
  const id = escapeHtml(lead.id);
  const activities = [...(lead.activities || [])].sort((a, b) => String(b.at || "").localeCompare(String(a.at || ""))).slice(0, 3);
  const reminders = remindersForLead(lead).slice(0, 3);
  const overdueDays = lead.next_action_date ? Math.max(0, -daysUntil(lead.next_action_date)) : 0;
  const summary = state.selectedId === lead.id ? state.leadAiSummary : null;
  const guidance = !summary?.loading && !summary?.error ? summaryText(summary?.data?.recommended_next_action) : "";
  const source = summary?.cached ? "Cached guidance" : summary?.provider === "fallback" ? "CRM guidance" : "AI guidance";
  const contactRow = (label, value, href = "") => `<div class="record-contact-row"><div><span>${escapeHtml(label)}</span>${value ? href ? `<a href="${escapeHtml(href)}"${label === "Website" || label === "Location" ? ' target="_blank" rel="noopener"' : ""}>${escapeHtml(value)}</a>` : `<strong>${escapeHtml(value)}</strong>` : '<em>Not added yet</em>'}</div>${label === "Phone" && value ? `<button class="record-copy-phone ghost-button" type="button" data-record-copy-phone="${id}" aria-label="Copy phone number" title="Copy phone number"></button>` : !value ? `<button class="record-text-action" type="button" data-drawer-edit-lead="${id}">Add<span class="sr-only"> ${escapeHtml(label)}</span></button>` : ""}</div>`;
  return `<div class="record-desktop-overview">
    <div class="record-main-column">
      <section class="drawer-section record-next-step">
        <div class="record-next-content"><div><span class="record-eyebrow">Next step</span><h3>${escapeHtml(lead.next_action ? normalizeNextActionPlan(lead.next_action) : "No next step set")}</h3><p>${overdueDays ? `<strong class="record-overdue">${overdueDays} days overdue</strong> ` : ""}${escapeHtml(lead.next_action_date ? `Due ${formatDisplayDate(lead.next_action_date)}` : "No due date set")}</p></div>
        <div class="record-action-row"><button class="ghost-button" type="button" data-drawer-edit-lead="${id}" title="Edit the lead's next action and due date">Reschedule</button><button class="primary-button" type="button" data-drawer-log-activity="${id}">Log outcome</button></div></div>
        <div class="record-next-guidance" aria-live="polite"><div><span class="record-guidance-badge">${escapeHtml(guidance ? source : "Guidance")}</span><button class="ghost-button" type="button" data-refresh-lead-ai-summary="${id}" ${summary?.loading ? "disabled" : ""}>Ask again</button></div><p>${escapeHtml(guidance || (summary?.loading ? "Loading guidance..." : "Guidance unavailable. Ask again to retry."))}</p></div>
        ${recordProfileFollowupMarkup(lead)}
      </section>
      ${companyAiActionsMarkup(lead, {overview:true})}
      <section class="drawer-section record-recent-activity"><div class="drawer-tab-heading"><h3>Recent activity</h3><button class="record-text-action" type="button" data-drawer-tab="activities">View all</button></div>
        <div>${activities.map(activity => `<article class="record-activity-row"><span class="record-activity-icon ${escapeHtml(activityTypeClass(activity.type))}" aria-hidden="true"></span><div><strong>${escapeHtml(activity.type || "Activity")}</strong><p>${escapeHtml(activity.text || activity.note || "No note added.")}</p></div><time>${escapeHtml(activity.at ? formatDisplayDate(activity.at) : "Date not recorded")}</time></article>`).join("") || '<p class="empty-copy">No activity recorded yet.</p>'}</div>
        <button class="record-text-action" type="button" data-drawer-tab="activities">View all activity</button>
      </section>
      <div class="record-overview-notes">${renderDrawerNotes(lead)}</div>
      <section class="drawer-section record-details"><h3>Lead details</h3><dl>
        ${[["Contact every", lead.expected_contact_days ? `${lead.expected_contact_days} days` : "Not recorded"], ["Last activity", lead.last_activity ? formatDisplayDate(lead.last_activity) : "No activity yet"], ["Territory", lead.territory], ["Named buyer", lead.contact_person || "Not added"], ["Pipeline value", formatAED(lead.estimated_value)]].map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value || "Not added")}</dd></div>`).join("")}
      </dl></section>
    </div>
    <div class="record-side-column">
      ${recordHealthMarkup(lead)}
      <section class="drawer-section record-contact"><h3>Contact</h3>
        ${primaryContactMarkup(lead)}
        ${contactRow("Phone", lead.phone, lead.phone ? `tel:${lead.phone}` : "")}
        ${contactRow("Email", lead.email, lead.email ? `mailto:${lead.email}` : "")}
        ${contactRow("Website", lead.website, lead.website)}
        ${contactRow("Location", [lead.location, lead.country_emirate].filter(Boolean).join(" - ") || (lead.google_maps_url ? "Open map" : ""), lead.google_maps_url)}
      </section>
      <section class="drawer-section record-reminders"><div class="drawer-tab-heading"><h3>Reminders</h3><button class="ghost-button" type="button" data-drawer-add-reminder="${id}">Add reminder</button></div>
        ${reminders.map(reminder => `<div class="record-reminder-row"><strong>${escapeHtml(reminder.activity_required || reminder.text || reminder.reminder_type || "Follow up")}</strong><span>${escapeHtml(reminder.due_date ? formatDisplayDate(reminder.due_date) : "No due date")}</span></div>`).join("") || '<p class="empty-copy">No reminders set.</p>'}
        ${reminders.length ? '<button class="record-text-action" type="button" data-drawer-tab="reminders">View all reminders</button>' : ""}
      </section>
    </div>
  </div><form class="record-overview-assistant"><input type="text" maxlength="4000" aria-label="Ask the AI Assistant about this lead" placeholder="Ask the AI Assistant about ${escapeHtml(lead.company_name || "this lead")}"><span class="record-overview-assistant-host"></span></form>`;
}

function primaryContactMarkup(lead) {
  const contact = [lead.contact_person, lead.primary_contact_title].filter(Boolean).join(" - ");
  return contact ? `<p class="record-primary-contact">${escapeHtml(contact)}</p>` : "";
}

function mobileLeadNextStepMarkup(lead) {
  const overdueDays = lead.next_action_date ? Math.max(0, -daysUntil(lead.next_action_date)) : 0;
  const summary = state.selectedId === lead.id ? state.leadAiSummary : null;
  const guidance = !summary?.loading && !summary?.error ? summaryText(summary?.data?.recommended_next_action) : "";
  const guidanceLabel = summary?.cached ? "Cached guidance" : summary?.provider === "fallback" ? "CRM guidance" : "AI guidance";
  return `<section class="drawer-section record-mobile-next" aria-label="Next step">
    <div class="record-mobile-next-heading"><span>Next step</span>${overdueDays ? `<strong class="record-overdue">${overdueDays} days overdue</strong>` : ""}</div>
    <h3>${escapeHtml(lead.next_action ? normalizeNextActionPlan(lead.next_action) : "No next step set")}</h3>
    <div class="record-mobile-guidance" aria-live="polite"><div class="record-mobile-guidance-heading"><span>${escapeHtml(guidance ? guidanceLabel : "Guidance")}</span><button class="ghost-button" type="button" data-refresh-lead-ai-summary="${escapeHtml(lead.id)}" ${summary?.loading ? "disabled" : ""}>Ask again</button></div><p>${escapeHtml(guidance || (summary?.loading ? "Loading guidance..." : "Guidance unavailable."))}</p></div>
    <p class="record-mobile-due">${escapeHtml(lead.next_action_date ? `Due ${formatDisplayDate(lead.next_action_date)}` : "No due date set")}</p>
    <div class="record-mobile-next-footer"><button class="ghost-button" type="button" data-drawer-edit-lead="${escapeHtml(lead.id)}">Reschedule</button><button class="primary-button" type="button" data-drawer-log-activity="${escapeHtml(lead.id)}">Log outcome</button></div>
    ${recordProfileFollowupMarkup(lead)}
  </section>`;
}

function mobileLeadOverviewExtras(lead) {
  return `<div class="record-mobile-overview">
    ${companyAiActionsMarkup(lead, { mobile: true })}
    ${recordHealthMarkup(lead, true)}
  </div>`;
}

function renderDrawerOverview(lead) {
  const overdue = lead.next_action_date && lead.next_action_date < today();
  const primaryContact = [lead.contact_person, lead.primary_contact_title].filter(Boolean).join(" - ");
  const secondaryContact = [lead.secondary_contact_name, lead.secondary_contact_title].filter(Boolean).join(" - ");
  const locationLine = [lead.location, lead.country_emirate, lead.address].filter(Boolean).join(" - ");
  const lastActivity = lead.last_activity ? `${daysAgoLabel(lead.last_activity)}` : "No activity yet";
  const estimatedValue = formatAED(lead.estimated_value);
  const overviewSnapshot = `
    <section class="drawer-section drawer-overview-hero drawer-overview-panel drawer-overview-panel--snapshot">
      <div class="drawer-tab-heading">
        <div>
          <h3>Lead Snapshot</h3>
          <p class="drawer-section-copy">Surface the next move first, then keep the supporting context available on demand.</p>
        </div>
      </div>
      <div class="drawer-summary-grid">
        ${drawerSummaryMetric("Next Action", lead.next_action ? normalizeNextActionPlan(lead.next_action) : "Not set", { tone: "next-action" })}
        ${drawerSummaryMetric("Due Date", lead.next_action_date ? `${lead.next_action_date}${overdue ? " - overdue" : ""}` : "Not set")}
        ${drawerSummaryMetric("Estimated Value", estimatedValue)}
        ${drawerSummaryMetric("Last Activity", lastActivity)}
      </div>
      <div class="drawer-primary-actions">
        <a class="ghost-button" href="${lead.phone ? `tel:${escapeHtml(lead.phone)}` : "#"}">Call</a>
        <a class="ghost-button" href="${lead.email ? `mailto:${escapeHtml(lead.email)}` : "#"}">Email</a>
        <button class="ghost-button" type="button" data-drawer-log-activity="${escapeHtml(lead.id)}">Add New Activity</button>
        <button class="primary-button" type="button" data-drawer-edit-lead="${escapeHtml(lead.id)}">Edit Lead</button>
      </div>
    </section>
  `;
  return `
    ${autoEnrichmentBanner(lead)}
    ${mobileLeadOverviewExtras(lead)}
    ${desktopLeadOverviewMarkup(lead)}
    ${overviewSnapshot}
    <section class="drawer-section drawer-overview-panel drawer-overview-panel--contact">
      <div class="drawer-tab-heading">
        <div>
          <h3>Contact Essentials</h3>
          <p class="drawer-section-copy">Keep the main relationship details easy to scan during calls and follow-ups.</p>
        </div>
      </div>
      <div class="drawer-field-grid">
        ${detailField("Primary contact", primaryContact, { auto: autoField(lead, "key_personnel") })}
        ${detailField("Phone", lead.phone, lead.phone ? { href: `tel:${lead.phone}`, linkTone: "blue" } : {})}
        ${detailField("Email", lead.email, lead.email ? { href: `mailto:${lead.email}`, linkTone: "blue" } : {})}
        ${detailField("Website", lead.website, lead.website ? { href: lead.website, external: true } : {})}
        ${detailField("Google Maps", lead.google_maps_url ? "Open map" : "", lead.google_maps_url ? { href: lead.google_maps_url, external: true } : {})}
        ${detailField("Assigned salesman", lead.assigned_salesman)}
        ${detailField("Location", locationLine)}
      </div>
    </section>
    <div class="record-supporting-details" aria-label="Company details">
    <details class="drawer-disclosure drawer-overview-panel drawer-overview-panel--commercial" open>
      <summary>
        <span>Commercial Details</span>
        <small>Stage context, value, and what the customer is interested in.</small>
      </summary>
      <div class="drawer-disclosure-body">
        <div class="drawer-field-grid">
          ${detailField("Industry", lead.industry || lead.business_category || lead.sector, { auto: autoField(lead, "sector_classification") })}
          ${detailField("Product interest", lead.product_interest)}
          ${detailField("Activity purpose", normalizeActivityPurpose(lead.activity_purpose))}
          ${detailField("Quotation ref", lead.quotation_ref)}
          ${detailField("Monthly volume", lead.estimated_monthly_volume)}
          ${detailField("First order date", lead.first_order_date)}
        </div>
      </div>
    </details>
    <details class="drawer-disclosure drawer-overview-panel drawer-overview-panel--company" open>
      <summary>
        <span>Additional Company Details</span>
        <small>Legal, location, and enrichment-backed company profile data.</small>
      </summary>
      <div class="drawer-disclosure-body">
        <div class="drawer-field-grid">
          ${detailField("Legal name", lead.legal_name)}
          ${detailField("Year established", lead.year_established)}
          ${detailField("Business category", lead.business_category)}
          ${detailField("Address", lead.address)}
          ${detailField("Country / Emirate", lead.country_emirate)}
          ${detailField("Territory", lead.territory)}
        </div>
      </div>
    </details>
    <details class="drawer-disclosure drawer-overview-panel drawer-overview-panel--secondary" open>
      <summary>
        <span>Secondary Contacts & Notes</span>
        <small>Optional relationship details, tags, and sales remarks.</small>
      </summary>
      <div class="drawer-disclosure-body">
        <div class="drawer-field-grid">
          ${detailField("Secondary contact", secondaryContact)}
          ${detailField("Secondary phone", lead.secondary_contact_mobile, lead.secondary_contact_mobile ? { href: `tel:${lead.secondary_contact_mobile}` } : {})}
          ${detailField("Secondary email", lead.secondary_contact_email, lead.secondary_contact_email ? { href: `mailto:${lead.secondary_contact_email}` } : {})}
        </div>
        <div class="drawer-tags">${tagPills(lead.tags)}</div>
        <p class="drawer-remarks">${autoField(lead, "recent_projects") ? `<span class="auto-tag">Auto</span> ` : ""}${escapeHtml(lead.products_services_remarks || "No products/services remarks added.")}</p>
      </div>
    </details>
    <section class="drawer-section record-linkedin"><h3>Find a Contact</h3>${linkedinControls(lead)}</section>
    </div>
    ${renderLossDetails(lead)}
    ${autoEnrichmentReviewPanel(lead)}
  `;
}

function renderDrawerActivities(lead) {
  const activities = [...(lead.activities || [])].sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
  const handoffs = [...(state.leadDrawerHandoffs || [])].sort((a, b) => String(b.timestamp || "").localeCompare(String(a.timestamp || "")));
  const reminders = remindersForLead(lead);
  const latestActivity = activities[0];
  const recentActivities = activities.slice(0, 3);
  const olderActivities = activities.slice(3);
  const activityCard = (activity, index) => `
    <article class="drawer-activity ${activityTypeClass(activity.type)}">
      <div><span class="activity-type-label"><i>${escapeHtml(ACTIVITY_TYPE_ICONS[activity.type] || "ACT")}</i>${escapeHtml(activity.type || "Note")}</span><span class="meta-label">${escapeHtml(activity.at || "")}</span></div>
      <p class="activity-note clamp" data-expand-note>${escapeHtml(activity.text || activity.note || "No note added.")}</p>
      <div class="activity-actions">${activityEditButton(lead.id, index, activity)}${activityDeleteButton(lead.id, index, activity)}</div>
    </article>
  `;
  return `
    <section class="drawer-section">
      <div class="drawer-tab-heading">
        <div>
          <h3>Activities</h3>
          <p class="drawer-section-copy">See the current rhythm first, then expand the full timeline only when you need the history.</p>
        </div>
        <button class="ghost-button" type="button" data-drawer-log-activity="${escapeHtml(lead.id)}">Add New Activity</button>
      </div>
      <div class="drawer-summary-grid">
        ${drawerSummaryMetric("Total Activities", String(activities.length))}
        ${drawerSummaryMetric("Latest Activity", latestActivity?.type || "No activity")}
        ${drawerSummaryMetric("Last Logged", latestActivity?.at || "Not recorded")}
        ${drawerSummaryMetric("Active Reminders", String(reminders.length))}
      </div>
      <div class="drawer-list">
        ${recentActivities.length
          ? recentActivities.map((activity, index) => activityCard(activity, index)).join("")
          : `<div class="timeline-empty"><strong>No activities logged yet.</strong><span>Log the first one.</span><button class="ghost-button" type="button" data-drawer-log-activity="${escapeHtml(lead.id)}">Add New Activity</button></div>`
        }
      </div>
      ${olderActivities.length ? `
        <details class="drawer-disclosure">
          <summary>
            <span>Activity History</span>
            <small>${olderActivities.length} older activit${olderActivities.length === 1 ? "y" : "ies"} available for review.</small>
          </summary>
          <div class="drawer-disclosure-body">
            <div class="drawer-list">
              ${olderActivities.map((activity, index) => activityCard(activity, index + 3)).join("")}
            </div>
          </div>
        </details>
      ` : ""}
      ${handoffs.length ? `
        <details class="drawer-disclosure">
          <summary>
            <span>Ownership Handoff History</span>
            <small>${handoffs.length} ownership move${handoffs.length === 1 ? "" : "s"} captured for this lead.</small>
          </summary>
          <div class="drawer-disclosure-body">
            <div class="handoff-history">
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
          </div>
        </details>
      ` : ""}
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
  const pmrs = [...(state.leadDrawerPmrs || [])].sort((a, b) => String(b.meeting_date || "").localeCompare(String(a.meeting_date || "")));
  const latest = pmrs[0];
  const earlierPmrs = pmrs.slice(1);
  const pmrCard = pmr => `
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
      ${pmr.voice_note_url || pmr.voice_note_id ? activityAudioMarkup(pmr) : ""}
    </article>
  `;
  return `
    <section class="drawer-section">
      <div class="drawer-tab-heading">
        <div>
          <h3>Post-Meeting Reports</h3>
          <p class="drawer-section-copy">Highlight the latest meeting outcome first, then keep the report archive tucked underneath.</p>
        </div>
        <button class="ghost-button" type="button" data-drawer-file-pmr="${escapeHtml(lead.id)}">File New PMR</button>
      </div>
      <div class="drawer-summary-grid">
        ${drawerSummaryMetric("Total PMRs", String(pmrs.length))}
        ${drawerSummaryMetric("Latest Meeting", latest?.meeting_date || "Not filed")}
        ${drawerSummaryMetric("Relationship Heat", latest?.relationship_heat_score ? `Heat ${latest.relationship_heat_score}/5` : "Not scored")}
        ${drawerSummaryMetric("Director Action", latest?.director_action_required || "None")}
      </div>
      ${latest ? `
        <div class="drawer-list">
          ${pmrCard(latest)}
        </div>
      ` : `<div class="timeline-empty"><strong>No PMRs filed yet.</strong><span>File a report after the next customer meeting.</span></div>`}
      ${earlierPmrs.length ? `
        <details class="drawer-disclosure">
          <summary>
            <span>PMR History</span>
            <small>${earlierPmrs.length} previous report${earlierPmrs.length === 1 ? "" : "s"} available.</small>
          </summary>
          <div class="drawer-disclosure-body">
            <div class="drawer-list">
              ${earlierPmrs.map(pmrCard).join("")}
            </div>
          </div>
        </details>
      ` : ""}
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

function intelligenceSummaryMarkup(report) {
  if (!report) return "";
  const summary = report.summary || {};
  const confidence = summary.confidence_summary || report.confidence_summary || {};
  return `
    <div class="lead-intel-summary-grid" aria-label="Lead intelligence summary">
      <span><b>Research</b><small>${escapeHtml(formatDisplayDate(summary.research_date || report.research_timestamp || report.completed_at || ""))}</small></span>
      <span><b>Score</b><small>${escapeHtml(String(report.displayed_score || summary.lead_score || "-"))}/10</small></span>
      <span><b>Priority</b><small>${escapeHtml(report.priority || summary.priority || "-")}</small></span>
      <span><b>Demand</b><small>${escapeHtml(report.steel_demand || summary.steel_demand || "-")}</small></span>
      <span><b>Buyer</b><small>${escapeHtml(report.buyer_classification || summary.buyer_classification || "-")}</small></span>
      <span><b>Confidence</b><small>Identity ${escapeHtml(confidence.company_identity || "-")}</small></span>
    </div>
  `;
}

function leadIntelligenceActionButton(action, leadId, label, tone = "primary-button", reportId = "") {
  return `<button class="${tone}" type="button" data-lead-intelligence-action="${escapeHtml(action)}" data-lead-id="${escapeHtml(leadId)}" ${reportId ? `data-report-id="${escapeHtml(reportId)}"` : ""}>${escapeHtml(label)}</button>`;
}

function leadIntelligenceUploadMarkup(leadId, { hasReport = false, processing = false } = {}) {
  const label = hasReport || processing ? "Replace PDF" : "Upload PDF";
  return `<label class="primary-button lead-intel-upload-control">${label}<input type="file" accept="application/pdf,.pdf" data-lead-intelligence-upload="${escapeHtml(leadId)}"></label>`;
}

function renderDrawerIntel(lead) {
  const statePayload = state.leadDrawerIntel && !Array.isArray(state.leadDrawerIntel) ? state.leadDrawerIntel : { market_items: Array.isArray(state.leadDrawerIntel) ? state.leadDrawerIntel : [] };
  const report = statePayload.report || null;
  const active = statePayload.active_report || null;
  const failed = statePayload.failed_report || null;
  const marketItems = statePayload.market_items || [];
  const missingPdf = Boolean(report?.pdf_url && state.leadIntelligenceMissingPdfUrls.has(report.pdf_url));
  const hasPdf = report && report.pdf_available && report.pdf_url && !missingPdf;
  const processing = active && ["queued", "researching", "generating_pdf"].includes(String(active.status));
  const statusLabel = active ? String(active.status || "queued").replace(/_/g, " ") : "";
  const failedVisible = failed && !processing;
  const uploadControl = leadIntelligenceUploadMarkup(lead.id, { hasReport: Boolean(report), processing });
  return `
    <section class="drawer-section lead-intel-section">
      <div class="drawer-tab-heading">
        <h3>UAE Structural Steel Lead Intelligence</h3>
        ${processing ? `<span class="status-pill">${escapeHtml(statusLabel)}</span>` : ""}
      </div>
      ${uploadControl ? `<div class="lead-intel-actions">${uploadControl}</div>` : ""}
      ${!report && !processing && !failedVisible ? `
        <div class="lead-intel-empty">
          <strong>No intelligence report yet.</strong>
          <span>Generate a source-backed UAE structural steel assessment and PDF for this company.</span>
          <div class="lead-intel-actions">${leadIntelligenceActionButton("generate", lead.id, "Generate Intelligence", "primary-button")}</div>
        </div>
      ` : ""}
      ${processing ? `
        <div class="lead-intel-processing" role="status" aria-live="polite">
          <strong>Intelligence report is ${escapeHtml(statusLabel)}.</strong>
          <span>Started: ${escapeHtml(formatDisplayDate(active.started_at || active.created_at || ""))}</span>
          ${report ? `<span>The last completed PDF remains available below while refresh is running.</span>` : `<span>Use the admin processor or scheduled job to complete queued research.</span>`}
        </div>
      ` : ""}
      ${failedVisible ? `
        <div class="lead-intel-failed" role="alert">
          <strong>Latest intelligence job failed.</strong>
          <span>${escapeHtml(failed.error_message || "The report could not be generated.")}</span>
          <div class="lead-intel-actions">${leadIntelligenceActionButton("retry", lead.id, "Retry", "primary-button", failed.id)}</div>
        </div>
      ` : ""}
      ${report ? `
        ${intelligenceSummaryMarkup(report)}
        ${report.report ? `<div class="lead-intel-detail-grid"><span><b>Opportunity</b><small>${escapeHtml(report.report.executive_snapshot?.top_opportunity || report.report.sales_recommendation?.recommended_sales_angle || "Not publicly found")}</small></span><span><b>Next action</b><small>${escapeHtml(report.report.sales_recommendation?.suggested_next_action || "Not publicly found")}</small></span><span><b>Company profile</b><small>${escapeHtml((report.report.company_profile?.main_activities || []).join(", ") || "Not publicly found")}</small></span></div>` : ""}
        ${hasPdf ? `
          <div class="lead-intel-actions">
            <button class="ghost-button" type="button" data-lead-intelligence-pdf-download="${escapeHtml(report.download_url)}">Download PDF</button>
            <button class="ghost-button" type="button" data-lead-intelligence-pdf-open="${escapeHtml(report.pdf_url)}">Open in new tab</button>
            ${leadIntelligenceActionButton("refresh", lead.id, "Refresh Intelligence", "primary-button")}
          </div>
          <iframe class="lead-intel-pdf" data-lead-intelligence-pdf-preview="${escapeHtml(report.pdf_url)}" title="Embedded lead intelligence PDF"></iframe>
        ` : `<p class="empty-copy">${missingPdf ? "PDF file not found, please re-upload." : "PDF is not available for this report yet."}</p>`}
      ` : ""}
      <details class="lead-intel-market-feed">
        <summary>Matched market feed items</summary>
        <div class="drawer-list intel-list">
          ${marketItems.length ? marketItems.map(intelItemMarkup).join("") : `<div class="timeline-empty"><strong>No matched feed items.</strong><span>Weekly feeds will appear here when sources are configured.</span></div>`}
        </div>
      </details>
    </section>
  `;
}

function renderLeadDrawer() {
  const searchTools = document.querySelector(".record-search-host .topbar-actions");
  if (searchTools) document.querySelector("#appShell .topbar")?.appendChild(searchTools);
  const assistantLauncher = document.querySelector("#aiAssistantLauncher");
  if (assistantLauncher && els.leadDetailPageContent?.contains(assistantLauncher)) document.body.appendChild(assistantLauncher);
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
      <span class="record-breadcrumb-company" aria-hidden="true">/ ${escapeHtml(lead.company_name || "Lead")}</span>
      <div class="record-assistant-host"></div>
      <div class="record-search-host"></div>
      <button class="ghost-button record-mobile-edit" type="button" data-drawer-edit-lead="${escapeHtml(lead.id)}" aria-label="Edit lead" title="Edit lead"></button>
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
        <span class="chip">${escapeHtml(lead.tier ? `Tier ${lead.tier}` : "Tier not set")}</span>
        <span class="record-health-status tone-${recordRelationshipHealth(lead).tone}">${recordRelationshipHealth(lead).label}</span>
        <span class="record-owner-meta">${escapeHtml([lead.sector || lead.industry, lead.territory, lead.assigned_salesman ? `Owner ${lead.assigned_salesman}` : ""].filter(Boolean).join(" · "))}</span>
      </div>
      <div class="record-header-actions">
        ${lead.phone ? `<a class="primary-button record-call" href="tel:${escapeHtml(lead.phone)}">Call</a>` : ""}
        <button class="ghost-button record-email" type="button" data-record-send-email="${escapeHtml(lead.id)}" title="Prepare an email draft">Send Email</button>
        <button class="ghost-button record-add-activity" type="button" data-drawer-log-activity="${escapeHtml(lead.id)}">Add activity</button>
        <button class="ghost-button" type="button" data-drawer-edit-lead="${escapeHtml(lead.id)}">Edit</button>
      </div>
    </header>
    <nav class="drawer-tabs lead-detail-tabs" aria-label="Lead details sections">${tabs.map(tab => `<button type="button" class="${state.leadDrawerTab === tab ? "active" : ""}" data-drawer-tab="${tab}" aria-current="${state.leadDrawerTab === tab ? "page" : "false"}">${tabLabels[tab]}</button>`).join("")}</nav>
    ${mobileLeadNextStepMarkup(lead)}
    <div class="drawer-body lead-detail-page-body">${body}</div>
    <div class="record-mobile-actions" aria-label="Lead actions"><button class="primary-button" type="button" data-drawer-log-activity="${escapeHtml(lead.id)}">Log outcome</button><button class="ghost-button" type="button" data-record-note>Note</button></div>
  `;
  if (assistantLauncher) els.leadDetailPageContent.querySelector(".record-assistant-host")?.appendChild(assistantLauncher);
  renderLeadAiSummaryPanel(lead, { panel: els.leadAiSummaryPagePanel, content: els.leadAiSummaryPageContent });
  bindLeadDrawerEvents();
  hydrateLeadIntelligencePdfPreviews();
  arrangeLeadRecordControls();
  arrangeMobileLeadOverview();
  arrangeAssistantLauncher(false);
}

function arrangeMobileLeadOverview() {
  const root = els.leadDetailPageContent;
  if (!root) return;
  const assistant = root.querySelector(".record-overview-assistant");
  if (assistant) root.querySelector(".lead-detail-page-body")?.appendChild(assistant);
  const mobile = state.leadDrawerTab === "overview" && window.matchMedia("(max-width: 1024px)").matches;
  root.classList.toggle("record-mobile-overview-layout", mobile);
  const flow = root.querySelector(".record-mobile-overview");
  if (!flow) return;
  const classes = ["record-reminders", "record-recent-activity", "record-overview-notes", "record-contact", "record-details"];
  let contact = flow.querySelector(".record-contact-details");
  if (mobile && !contact) {
    contact = document.createElement("div");
    contact.className = "record-contact-details";
    const heading = document.createElement("h3");
    heading.textContent = "Contact and details";
    contact.appendChild(heading);
    flow.appendChild(contact);
  }
  // Move existing nodes, preserving their listeners and original positions across breakpoints.
  classes.forEach(name => {
    const node = root.querySelector(`.${name}`);
    let slot = root.querySelector(`[data-record-mobile-slot="${name}"]`);
    if (!node) return;
    if (mobile) {
      if (!slot) {
        slot = document.createElement("span");
        slot.hidden = true;
        slot.dataset.recordMobileSlot = name;
        node.before(slot);
      }
      (name === "record-contact" || name === "record-details" ? contact : flow).appendChild(node);
    } else if (slot) slot.replaceWith(node);
  });
  if (mobile) flow.appendChild(contact);
  else contact?.remove();
}

function bindLeadDrawerEvents() {
  const assistantForm = els.leadDetailPageContent?.querySelector(".record-overview-assistant");
  const transferQuestion = () => {
    const input = assistantForm.querySelector("input");
    aiAssistantElements().command.value = input.value.trim();
    input.value = "";
  };
  assistantForm?.addEventListener("submit", event => { event.preventDefault(); transferQuestion(); openAiAssistant(); });
  assistantForm?.addEventListener("click", event => { if (event.target.closest("#aiAssistantLauncher")) transferQuestion(); });
  els.leadDetailPageContent?.querySelectorAll("[data-record-send-profile]").forEach(button => {
    button.addEventListener("click", () => {
      const lead = state.leads.find(item => String(item.id) === button.dataset.recordSendProfile);
      if (lead) runLeadAiAction(lead, "profile");
    });
  });
  els.leadDetailPageContent?.querySelector("[data-record-send-email]")?.addEventListener("click", event => {
    const lead = state.leads.find(item => String(item.id) === event.currentTarget.dataset.recordSendEmail);
    if (lead) runLeadAiAction(lead, "email");
  });
  els.leadDetailPageContent?.querySelector("[data-record-note]")?.addEventListener("click", () => {
    state.leadDrawerTab = "notes";
    syncBrowserRoute({ replace: true });
    render();
    document.querySelector("[data-drawer-edit-notes]")?.click();
    document.querySelector("#drawerNotesForm textarea")?.focus();
  });
  els.leadDetailPageContent?.querySelectorAll("[data-record-copy-phone]").forEach(button => {
    button.addEventListener("click", async () => {
      const lead = state.leads.find(item => item.id === button.dataset.recordCopyPhone);
      if (!lead?.phone) return;
      try {
        if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable. Select the phone number to copy it.");
        await navigator.clipboard.writeText(lead.phone);
        setToast("Phone number copied.", "success");
      } catch (error) {
        setToast(error.message || "Could not copy the phone number.", "error");
      }
    });
  });
  els.leadDetailPageContent?.querySelectorAll("[data-company-ai-action]").forEach(button => {
    button.addEventListener("click", () => {
      const lead = state.leads.find(item => item.id === button.dataset.companyAiLead);
      if (!lead) return;
      if (button.dataset.companyAiAction === "flag") {
        openFlagAttentionModal(lead);
        return;
      }
      runLeadAiAction(lead, button.dataset.companyAiAction);
    });
  });
  document.querySelectorAll("[data-lead-intelligence-pdf-download]").forEach(button => {
    button.addEventListener("click", async () => {
      try {
        await downloadAuthenticatedPdf(button.dataset.leadIntelligencePdfDownload);
      } catch (error) {
        if (error.status === 404) markLeadIntelligencePdfMissing(button.dataset.leadIntelligencePdfDownload);
        setToast(error.message, "error");
      }
    });
  });
  document.querySelectorAll("[data-lead-intelligence-pdf-open]").forEach(button => {
    button.addEventListener("click", async () => {
      const popup = window.open("", "_blank");
      try {
        await openAuthenticatedPdf(button.dataset.leadIntelligencePdfOpen, popup);
      } catch (error) {
        if (error.status === 404) markLeadIntelligencePdfMissing(button.dataset.leadIntelligencePdfOpen);
        setToast(error.message, "error");
      }
    });
  });
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
    button.addEventListener("click", () => openActivityModal(button.dataset.drawerLogActivity, button));
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
      const title = button.closest(".linkedin-search")?.querySelector("[data-linkedin-title]")?.value || "";
      if (!lead) return;
      try {
        const result = await api(`/api/linkedin/search-url?company=${encodeURIComponent(lead.company_name)}&title=${encodeURIComponent(title)}`);
        window.open(result.url, "_blank", "noopener");
      } catch {
        window.open(`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${lead.company_name} ${title || "Procurement Manager"}`)}`, "_blank", "noopener");
      }
    });
  });
  document.querySelectorAll("[data-lead-intelligence-action]").forEach(button => {
    button.addEventListener("click", async () => {
      const leadId = button.dataset.leadId;
      const action = button.dataset.leadIntelligenceAction;
      try {
        button.disabled = true;
        setToast(action === "refresh" ? "Refreshing intelligence..." : action === "retry" ? "Retrying intelligence..." : "Generating intelligence...", "");
        const body = action === "retry" ? JSON.stringify({ report_id: button.dataset.reportId || "" }) : undefined;
        state.leadDrawerIntel = await api(`/api/leads/${encodeURIComponent(leadId)}/intelligence/${encodeURIComponent(action)}`, { method: "POST", body });
        state.leadDrawerIntel = await api(`/api/leads/${encodeURIComponent(leadId)}/intel`);
        setToast("Intelligence job queued.", "success");
        renderLeadDrawer();
      } catch (error) {
        setToast(error.message, "error");
      } finally {
        button.disabled = false;
      }
    });
  });
  document.querySelectorAll("[data-lead-intelligence-upload]").forEach(input => {
    input.addEventListener("change", async event => {
      // currentTarget is cleared by the browser after the synchronous event
      // dispatch. Keep the input and lead id before awaiting the upload.
      const uploadInput = event.currentTarget;
      const uploadedLeadId = String(uploadInput?.dataset.leadIntelligenceUpload || "");
      const file = uploadInput?.files?.[0];
      if (!file || !uploadedLeadId) return;
      try {
        uploadInput.disabled = true;
        setToast("Extracting and saving intelligence PDF...", "");
        await uploadLeadIntelligencePdf(uploadedLeadId, file);
        // Reload the persisted report rather than relying on the upload
        // response, so the Intel tab always reflects the saved current row.
        state.leadDrawerIntel = await api(`/api/leads/${encodeURIComponent(uploadedLeadId)}/intel`);
        leadAiSummaryCache.delete(uploadedLeadId);
        await loadLeadAiSummary(uploadedLeadId, { force: true });
        setToast("Intelligence PDF saved to the Intel card and AI summary context.", "success");
        renderLeadDrawer();
      } catch (error) {
        try {
          state.leadDrawerIntel = await api(`/api/leads/${encodeURIComponent(uploadedLeadId)}/intel`);
          renderLeadDrawer();
        } catch {
          // Preserve the original upload error when the state refresh is unavailable.
        }
        setToast(error.message, "error");
      } finally {
        if (uploadInput.isConnected) uploadInput.disabled = false;
      }
    });
  });
  document.querySelector("[data-drawer-edit-notes]")?.addEventListener("click", () => {
    document.querySelector(".drawer-notes-view")?.classList.add("hidden");
    document.querySelector("#drawerNotesForm")?.classList.remove("hidden");
    document.querySelector("#drawerNotesForm textarea")?.focus();
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

function activityClientId() {
  return `act-${window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

function humanFileSize(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function activityAttachmentUrl(leadId, activityId, attachmentId) {
  return `/api/leads/${encodeURIComponent(leadId)}/activities/${encodeURIComponent(activityId)}/attachments/${encodeURIComponent(attachmentId)}`;
}

function renderActivityAttachmentList() {
  if (!els.activityAttachmentList) return;
  const existingRows = activityModalExistingAttachments.map(attachment => {
    const removed = activityModalRemovedAttachmentIds.has(String(attachment.id));
    return `
      <div class="activity-attachment-row ${removed ? "is-removed" : ""}">
        <div>
          <strong>${escapeHtml(attachment.filename || attachment.original_filename || "Attachment")}</strong>
          <small>${escapeHtml(humanFileSize(attachment.size))}${removed ? " · will be removed" : ""}</small>
        </div>
        <button type="button" data-download-activity-attachment="${escapeHtml(attachment.id)}" ${removed ? "disabled" : ""}>Download</button>
        <button type="button" data-toggle-remove-activity-attachment="${escapeHtml(attachment.id)}">${removed ? "Keep" : "Remove"}</button>
      </div>
    `;
  });
  const pendingRows = activityModalFiles.map(item => `
    <div class="activity-attachment-row">
      <div>
        <strong title="${escapeHtml(item.file.name)}">${escapeHtml(item.file.name)}</strong>
        <small>${escapeHtml(humanFileSize(item.file.size))} · ${escapeHtml(item.status || "ready")}${item.error ? ` · ${escapeHtml(item.error)}` : ""}</small>
      </div>
      ${item.status === "uploading" ? `<progress max="100" value="${Number(item.progress || 20)}"></progress>` : "<span></span>"}
      ${item.status === "failed" ? `<button type="button" data-retry-pending-activity-file="${escapeHtml(item.id)}">Retry</button>` : ""}
      <button type="button" data-remove-pending-activity-file="${escapeHtml(item.id)}" ${item.status === "uploading" ? "disabled" : ""}>Remove</button>
    </div>
  `);
  els.activityAttachmentList.innerHTML = [...existingRows, ...pendingRows].join("")
    || `<p class="activity-attachment-empty">No attachments selected.</p>`;
  els.activityAttachmentList.querySelectorAll("[data-remove-pending-activity-file]").forEach(button => {
    button.addEventListener("click", () => {
      activityModalFiles = activityModalFiles.filter(item => item.id !== button.dataset.removePendingActivityFile);
      renderActivityAttachmentList();
    });
  });
  els.activityAttachmentList.querySelectorAll("[data-retry-pending-activity-file]").forEach(button => {
    button.addEventListener("click", () => {
      const item = activityModalFiles.find(file => file.id === button.dataset.retryPendingActivityFile);
      if (!item) return;
      item.status = "ready";
      item.error = "";
      item.progress = 0;
      setMessage(els.activityMessage, "");
      renderActivityAttachmentList();
    });
  });
  els.activityAttachmentList.querySelectorAll("[data-toggle-remove-activity-attachment]").forEach(button => {
    button.addEventListener("click", () => {
      const id = String(button.dataset.toggleRemoveActivityAttachment);
      if (activityModalRemovedAttachmentIds.has(id)) activityModalRemovedAttachmentIds.delete(id);
      else activityModalRemovedAttachmentIds.add(id);
      renderActivityAttachmentList();
    });
  });
  els.activityAttachmentList.querySelectorAll("[data-download-activity-attachment]").forEach(button => {
    button.addEventListener("click", () => downloadActivityAttachment(button.dataset.downloadActivityAttachment));
  });
  if (!activityModalSaving && els.saveActivity) {
    els.saveActivity.disabled = activityModalFiles.some(item => ["uploading", "failed", "rejected"].includes(item.status));
  }
}

const ACTIVITY_ATTACHMENT_TYPES = {
  png: ["image/png"],
  pdf: ["application/pdf"],
  doc: ["application/msword", "application/octet-stream"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/zip", "application/octet-stream"],
  xls: ["application/vnd.ms-excel", "application/octet-stream"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/zip", "application/octet-stream"]
};

async function activityFileSignatureLooksValid(file, extension) {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const begins = (...values) => values.every((value, index) => bytes[index] === value);
  if (extension === "png") return begins(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
  if (extension === "pdf") return begins(0x25, 0x50, 0x44, 0x46, 0x2d);
  if (["doc", "xls"].includes(extension)) return begins(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1);
  if (["docx", "xlsx"].includes(extension)) return begins(0x50, 0x4b, 0x03, 0x04);
  return false;
}

async function addActivityFiles(files) {
  for (const file of [...files]) {
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    if (!ACTIVITY_ATTACHMENT_TYPES[extension]) {
      setMessage(els.activityMessage, `${file.name} is not an allowed attachment type.`, "error");
      continue;
    }
    if (file.size > 8 * 1024 * 1024) {
      setMessage(els.activityMessage, "File is too large. The maximum allowed size is 8 MB.", "error");
      continue;
    }
    if (file.type && !ACTIVITY_ATTACHMENT_TYPES[extension].includes(file.type)) {
      setMessage(els.activityMessage, `${file.name} does not match its declared file type.`, "error");
      continue;
    }
    if (!await activityFileSignatureLooksValid(file, extension)) {
      setMessage(els.activityMessage, `${file.name} has an invalid or unsupported file signature.`, "error");
      continue;
    }
    if (activityModalFiles.some(item => item.file.name === file.name && item.file.size === file.size)) continue;
    activityModalFiles.push({ id: activityClientId(), file, status: "ready", progress: 0, error: "" });
  }
  renderActivityAttachmentList();
}

async function downloadActivityAttachment(attachmentId) {
  const leadId = els.activityForm?.elements.lead_id?.value || activityDetailsSelection?.leadId;
  const activityId = els.activityForm?.elements.activity_id?.value || activityDetailsSelection?.activity?.id;
  if (!leadId || !activityId) return;
  try {
    const response = await authenticatedFetch(activityAttachmentUrl(leadId, activityId, attachmentId));
    if (!response.ok) throw new Error("Attachment could not be downloaded.");
    const blob = await response.blob();
    const disposition = response.headers.get("content-disposition") || "";
    const filename = disposition.match(/filename="([^"]+)"/i)?.[1] || "attachment";
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  } catch (error) {
    setToast(error.message, "error");
  }
}

function closeActivityModal({ force = false } = {}) {
  if (!els.activityDialog?.open) return;
  if (!force && activityModalIsBusy()) {
    setMessage(els.activityMessage, "Finish or cancel the recording, or wait for the save to complete.", "error");
    return;
  }
  resetActivityVoiceRecorder();
  els.activityDialog.close();
}

function openActivityModal(leadId = "", trigger = null, activity = null) {
  const lead = state.leads.find(item => String(item.id) === String(leadId)) || state.leads[0];
  if (!lead || !els.activityDialog || !els.activityForm) {
    setToast("This lead is not available to your account.", "error");
    return;
  }
  activityModalMode = activity ? "edit" : "create";
  activityModalTrigger = trigger || document.activeElement;
  activityModalSaving = false;
  activityModalLastTranscript = "";
  activityModalFiles = [];
  activityModalExistingAttachments = (activity?.attachments || []).map(item => ({ ...item }));
  activityModalRemovedAttachmentIds = new Set();
  els.activityForm.reset();
  els.activityForm.elements.lead_id.value = lead.id;
  els.activityForm.elements.activity_id.value = activity?.id || "";
  els.activityForm.elements.activity_version.value = String(activity?.version || 1);
  els.activityForm.dataset.clientId = activity?.id || activityClientId();
  els.activityDialogTitle.innerHTML = pageTitleMarkup(activity ? "Edit Activity" : "Add New Activity");
  els.saveActivity.textContent = activity ? "Save Changes" : "Save Activity";
  els.closeActivityDialog.setAttribute("aria-label", `Close ${activity ? "Edit Activity" : "Add New Activity"} modal`);
  els.activityLeadName.textContent = lead.company_name || "Selected lead";
  const globalCreate = !leadId && !activity;
  els.activityLeadPickerWrap.classList.toggle("hidden", !globalCreate);
  els.activityLeadPicker.innerHTML = state.leads.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.company_name)}</option>`).join("");
  els.activityLeadPicker.value = lead.id;
  els.activityNextActionPlan.value = normalizeNextActionPlan(activity?.next_action_plan || lead.next_action);
  const dateValue = String(activity?.next_action_date || lead.next_action_date || today()).slice(0, 10);
  els.activityNextActionDate.value = /^\d{4}-\d{2}-\d{2}$/.test(dateValue) ? dateValue : today();
  const normalizedPurpose = normalizeActivityPurpose(activity?.activity_purpose || activity?.type || lead.activity_purpose).replace("Quotation Follow-Up", "Quotation Follow Up");
  els.activityPurpose.value = STRUCTURED_ACTIVITY_PURPOSE_OPTIONS.includes(normalizedPurpose)
    ? normalizedPurpose
    : STRUCTURED_ACTIVITY_PURPOSE_OPTIONS[0];
  els.activityNotes.value = activity?.notes ?? activity?.text ?? "";
  setMessage(els.activityMessage, "");
  resetActivityVoiceRecorder();
  renderActivityAttachmentList();
  document.body.classList.add("activity-modal-open");
  els.activityDialog.showModal();
  requestAnimationFrame(() => els.activityNextActionPlan?.focus());
}

async function saveActivityModal() {
  if (!els.activityForm || activityModalSaving || activityModalRecorder) return;
  if (!els.activityForm.reportValidity()) return;

  const data = new FormData(els.activityForm);
  const leadId = String(data.get("lead_picker") || data.get("lead_id") || "");
  const nextActionPlan = String(data.get("next_action_plan") || "").trim();
  const nextActionDate = String(data.get("next_action_date") || "").trim();
  const activityPurpose = String(data.get("activity_purpose") || "").trim();
  const notes = String(data.get("notes") || "").trim();
  const parsedDate = new Date(`${nextActionDate}T00:00:00`);
  if (
    !NEXT_ACTION_PLAN_OPTIONS.includes(nextActionPlan)
    || !STRUCTURED_ACTIVITY_PURPOSE_OPTIONS.includes(activityPurpose)
    || !/^\d{4}-\d{2}-\d{2}$/.test(nextActionDate)
    || Number.isNaN(parsedDate.getTime())
  ) {
    setMessage(els.activityMessage, "Complete each required field with a valid value.", "error");
    return;
  }

  activityModalSaving = true;
  els.saveActivity.disabled = true;
  els.cancelActivityDialog.disabled = true;
  els.closeActivityDialog.disabled = true;
  els.activityRecordVoice.disabled = true;
  setMessage(els.activityMessage, "Saving activity...");
  try {
    const activityId = String(data.get("activity_id") || els.activityForm.dataset.clientId);
    const result = await api(`/api/leads/${encodeURIComponent(leadId)}/activities${activityModalMode === "edit" ? `/${encodeURIComponent(activityId)}` : ""}`, {
      method: activityModalMode === "edit" ? "PATCH" : "POST",
      body: JSON.stringify({
        id: activityId,
        version: Number(data.get("activity_version") || 1),
        structured_activity: true,
        type: activityPurpose,
        text: notes || `${activityPurpose}: ${nextActionPlan} on ${nextActionDate}`,
        notes,
        next_action_plan: nextActionPlan,
        next_action_date: nextActionDate,
        activity_purpose: activityPurpose,
        remove_attachment_ids: [...activityModalRemovedAttachmentIds]
      })
    });
    const savedActivity = result.activity;
    els.activityForm.elements.activity_id.value = savedActivity.id;
    els.activityForm.elements.activity_version.value = String(savedActivity.version || 1);
    for (const item of activityModalFiles.filter(file => file.status !== "uploaded")) {
      item.status = "uploading";
      item.progress = 30;
      item.error = "";
      renderActivityAttachmentList();
      try {
        const upload = await api(`/api/leads/${encodeURIComponent(leadId)}/activities/${encodeURIComponent(savedActivity.id)}/attachments`, {
          method: "POST",
          headers: {
            "Content-Type": item.file.type || "application/octet-stream",
            "x-file-name": encodeURIComponent(item.file.name)
          },
          body: item.file
        });
        item.status = "uploaded";
        item.progress = 100;
        activityModalExistingAttachments.push(upload.attachment);
        els.activityForm.elements.activity_version.value = String(upload.activity.version || Number(els.activityForm.elements.activity_version.value) + 1);
      } catch (error) {
        item.status = "failed";
        item.error = error.message || "Upload failed";
      }
      renderActivityAttachmentList();
    }
    const failedUploads = activityModalFiles.filter(file => file.status === "failed");
    if (failedUploads.length) {
      activityModalMode = "edit";
      activityModalSaving = false;
      setMessage(els.activityMessage, `Activity saved, but ${failedUploads.length} attachment${failedUploads.length === 1 ? "" : "s"} failed. Fix or retry without losing your entries.`, "error");
      return;
    }
    await loadLeads();
    activityModalSaving = false;
    closeActivityModal({ force: true });
    if (currentView === "activity") await fetchActivities();
    setToast(activityModalMode === "edit" ? "Activity updated." : "Activity saved.", "success");
    openLeadDrawer(leadId, "activities");
  } catch (error) {
    activityModalSaving = false;
    setMessage(els.activityMessage, error.message || "Activity could not be saved. Your entries were preserved.", "error");
  } finally {
    els.saveActivity.disabled = activityModalFiles.some(item => ["uploading", "failed", "rejected"].includes(item.status));
    els.cancelActivityDialog.disabled = false;
    els.closeActivityDialog.disabled = false;
    if (!activityModalRecorder) els.activityRecordVoice.disabled = false;
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
  setLeadFormMode("edit");
  resetLeadWizardState();
  leadFormTouched.clear();
  resetLeadEnrichmentSession();
  els.leadForm.reset();
  Object.entries(lead).forEach(([key, value]) => {
    if (key === "product_interest") return;
    const field = els.leadForm.elements[key];
    if (!field) return;
    field.value = formValue(value);
  });
  renderLeadProductInterestOptions(lead.product_interest);
  ensureLeadFormSelectValue("next_action", normalizeNextActionPlan(lead.next_action), NEXT_ACTION_PLAN_OPTIONS[0]);
  ensureLeadFormSelectValue("activity_purpose", normalizeActivityPurpose(lead.activity_purpose), ACTIVITY_PURPOSE_OPTIONS[0]);
  syncLeadWizardDetailsFromValues();
  leadCompanyInputKey = leadCompanyOnlyKey(lead.company_name);
  setEnrichmentStatus("Editing existing lead. Review changes before saving.", "success");
  renderLeadFormWizard();
  els.leadDialog.showModal();
}

function kanbanStageForLead(lead) {
  return normalizeStageKey(lead?.stage, "NEW");
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
        ${escapeHtml(stageDisplayLabel(stage.key))} <span>${count}</span>
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
            <h3>${escapeHtml(stageDisplayLabel(stage.key))}</h3>
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

function salesmenDirectoryPeople() {
  const accounts = (state.userAccounts || [])
    .filter(person => String(person.role || "salesman").toLowerCase() === "salesman");
  const analytics = analyticsSalesmen().filter(person => salesmanName(person) !== "Unassigned");
  const analyticsByName = new Map(analytics.map(person => [salesmanName(person).toLowerCase(), person]));
  const source = accounts.length ? accounts : analytics;
  const seen = new Set();
  return source.map(person => {
    const name = salesmanName(person);
    const enriched = analyticsByName.get(name.toLowerCase());
    const merged = typeof enriched === "object" ? { ...enriched, ...person } : person;
    return { person: merged, name };
  }).filter(item => {
    const key = item.name.toLowerCase();
    if (!key || key === "unassigned" || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function directoryLatestActivity(ownedLeads) {
  const values = ownedLeads.flatMap(lead => [
    lead.last_activity,
    ...(Array.isArray(lead.activities) ? lead.activities
      .filter(activity => !activity.delete_request)
      .map(activity => activity.activity_date || activity.at || activity.created_at) : [])
  ]).map(value => String(value || "").trim()).filter(Boolean);
  return values.sort((a, b) => b.localeCompare(a))[0] || "";
}

function salesmenDirectoryRows() {
  const performanceRows = scoreSalesmanPerformanceRows(salesmanPerformanceRows());
  const performanceByName = new Map(performanceRows.map((row, index) => [row.name.toLowerCase(), { ...row, rank: index + 1 }]));
  const dueItems = overdueItems();
  return salesmenDirectoryPeople().map(({ person, name }) => {
    const ownedLeads = state.leads.filter(lead => leadMatchesSalesman(lead, person));
    const openLeads = ownedLeads.filter(activeLeadForOverdue);
    const activeCustomers = ownedLeads.filter(lead => normalizeStageKey(lead.stage) === "WON").length;
    const overdueFollowups = dueItems.filter(item => normalizedUserTokens(person).includes(String(item.assigned_salesman || "").trim().toLowerCase())).length;
    const tasksDue = ownedLeads.filter(isOverdue).length;
    const lastActivity = directoryLatestActivity(ownedLeads);
    const performance = performanceByName.get(name.toLowerCase()) || {
      performanceScore: 0,
      rank: Number.MAX_SAFE_INTEGER,
      activitiesLogged: 0,
      followupsCompleted: 0
    };
    const accountStatus = String(typeof person === "string" ? "active" : person.status || "active").toLowerCase();
    const stageLeadCount = state.performanceStage === "all"
      ? ownedLeads.length
      : ownedLeads.filter(lead => String(lead.stage || "").toLowerCase() === String(state.performanceStage || "").toLowerCase()).length;
    let statusKey = "active";
    let statusLabel = "Active";
    if (["inactive", "disabled"].includes(accountStatus)) {
      statusKey = "inactive";
      statusLabel = "Inactive";
    } else if (["on_leave", "on leave", "leave"].includes(accountStatus)) {
      statusKey = "on-leave";
      statusLabel = "On Leave";
    } else if (performance.rank === 1 && ownedLeads.length) {
      statusKey = "top-performer";
      statusLabel = "Top Performer";
    } else if (performance.performanceScore < 35 || overdueFollowups >= Math.max(3, Math.ceil(ownedLeads.length / 2))) {
      statusKey = "needs-attention";
      statusLabel = "Needs Attention";
    }
    return {
      person,
      name,
      email: typeof person === "string" ? "" : person.email || "",
      phone: typeof person === "string" ? "" : person.phone || person.mobile || "",
      territory: (typeof person === "string" ? "" : person.territory) || "",
      accountStatus,
      statusKey,
      statusLabel,
      totalAssigned: ownedLeads.length,
      stageLeadCount,
      activeCustomers,
      overdueFollowups,
      tasksDue,
      openLeads: openLeads.length,
      wonLeads: activeCustomers,
      conversionRate: percentOf(activeCustomers, ownedLeads.length),
      lastActivity,
      performanceScore: performance.performanceScore,
      activitiesLogged: performance.activitiesLogged,
      followupsCompleted: performance.followupsCompleted,
      searchText: [name, typeof person === "string" ? "" : person.email, typeof person === "string" ? "" : person.phone, typeof person === "string" ? "" : person.mobile, typeof person === "string" ? "" : person.territory].join(" ").toLowerCase()
    };
  });
}

function filteredSalesmenDirectoryRows(rows) {
  const filters = state.salesmenDirectory;
  const search = filters.search.trim().toLowerCase();
  const filtered = rows.filter(row => {
    if (search && !row.searchText.includes(search)) return false;
    if (filters.territory !== "all" && row.territory !== filters.territory) return false;
    if (filters.status !== "all" && row.statusKey !== filters.status) return false;
    if (state.performanceStage !== "all" && row.stageLeadCount === 0) return false;
    return true;
  });
  return filtered.sort((a, b) => {
    if (filters.sort === "name-asc") return a.name.localeCompare(b.name);
    if (filters.sort === "overdue-desc") return b.overdueFollowups - a.overdueFollowups || a.name.localeCompare(b.name);
    if (filters.sort === "conversion-desc") return b.conversionRate - a.conversionRate || b.totalAssigned - a.totalAssigned;
    if (filters.sort === "recent-desc") return String(b.lastActivity || "").localeCompare(String(a.lastActivity || "")) || a.name.localeCompare(b.name);
    return b.totalAssigned - a.totalAssigned || b.performanceScore - a.performanceScore || a.name.localeCompare(b.name);
  });
}

function directoryActivityMarkup(value) {
  if (!value) return `<span class="salesmen-last-activity">&mdash;<small>Not available</small></span>`;
  const date = String(value).slice(0, 10);
  const time = String(value).includes("T")
    ? new Date(value).toLocaleTimeString("en-AE", { hour: "2-digit", minute: "2-digit" })
    : "";
  return `<span class="salesmen-last-activity">${escapeHtml(formatDisplayDate(date))}${time ? `<small>${escapeHtml(time)}</small>` : ""}</span>`;
}

function salesmenRowActionsMarkup(row) {
  return `
    <div class="salesmen-row-actions">
      <button type="button" data-salesmen-action="profile" data-salesman-name="${escapeHtml(row.name)}">View Profile</button>
      <button type="button" data-salesmen-action="assign" data-salesman-name="${escapeHtml(row.name)}">Assign Leads</button>
      <details>
        <summary aria-label="More actions for ${escapeHtml(row.name)}">&hellip;</summary>
        <div class="salesmen-row-menu">
          <button type="button" data-salesmen-action="profile" data-salesman-name="${escapeHtml(row.name)}">Jump to Leads</button>
          <button type="button" data-salesmen-action="pipeline" data-salesman-name="${escapeHtml(row.name)}">Filter Pipeline</button>
        </div>
      </details>
    </div>
  `;
}

function salesmenDirectoryTableMarkup(rows) {
  return `
    <table class="salesmen-directory-table">
      <thead><tr>
        <th scope="col">Salesman</th><th scope="col">Territory</th><th scope="col">Assigned Leads</th>
        <th scope="col">Active Customers</th><th scope="col">Overdue Follow-ups</th><th scope="col">Tasks Due</th>
        <th scope="col">Conversion Rate</th><th scope="col">Last Activity</th><th scope="col">Status</th><th scope="col">Actions</th>
      </tr></thead>
      <tbody>${rows.map(row => `
        <tr>
          <td><div class="salesmen-person-cell"><span class="salesmen-avatar" aria-hidden="true">${escapeHtml(salesmanInitials(row.name))}</span><div><strong>${escapeHtml(row.name)}</strong><small>${escapeHtml(row.email || "Email not available")}</small></div></div></td>
          <td>${escapeHtml(row.territory || "—")}</td>
          <td class="salesmen-number">${escapeHtml(String(row.totalAssigned))}</td>
          <td class="salesmen-number">${escapeHtml(String(row.activeCustomers))}</td>
          <td class="salesmen-number ${row.overdueFollowups ? "is-alert" : ""}">${escapeHtml(String(row.overdueFollowups))}</td>
          <td class="salesmen-number ${row.tasksDue ? "is-alert" : ""}">${escapeHtml(String(row.tasksDue))}</td>
          <td class="salesmen-number">${escapeHtml(String(row.conversionRate))}%</td>
          <td>${directoryActivityMarkup(row.lastActivity)}</td>
          <td><span class="salesmen-status-badge is-${escapeHtml(row.statusKey)}">${escapeHtml(row.statusLabel)}</span></td>
          <td>${salesmenRowActionsMarkup(row)}</td>
        </tr>
      `).join("")}</tbody>
    </table>
  `;
}

const SALESMAN_CARD_ACCENTS = ["blue", "yellow", "red", "green", "orange", "violet"];

function salesmanCardAccent(row) {
  const person = row && typeof row.person === "object" ? row.person : {};
  const identity = String(person.id || person.user_id || row.email || row.name || row.territory || "salesman").toLowerCase();
  const hash = Array.from(identity).reduce((value, character) => ((value * 31) + character.codePointAt(0)) >>> 0, 0);
  return SALESMAN_CARD_ACCENTS[hash % SALESMAN_CARD_ACCENTS.length];
}

function salesmenDirectoryCardsMarkup(rows) {
  return `<div class="salesmen-card-grid">${rows.map(row => {
    const accent = salesmanCardAccent(row);
    const email = row.email || "Email not available";
    const territory = row.territory || "Territory not available";
    const lastActivity = row.lastActivity ? formatDisplayDate(String(row.lastActivity).slice(0, 10)) : "—";
    const conversion = Math.max(0, Math.min(100, Number(row.conversionRate) || 0));
    return `
      <article class="salesmen-directory-card" data-card-accent="${accent}" aria-labelledby="salesman-card-${escapeHtml(String(row.name).toLowerCase().replace(/[^a-z0-9]+/g, "-"))}">
        <header class="salesmen-directory-card-head">
          <div class="salesmen-card-identity">
            <span class="salesmen-card-avatar" aria-hidden="true">${escapeHtml(salesmanInitials(row.name))}</span>
            <div class="salesmen-card-identity-copy">
              <h3 id="salesman-card-${escapeHtml(String(row.name).toLowerCase().replace(/[^a-z0-9]+/g, "-"))}" title="${escapeHtml(row.name)}">${escapeHtml(row.name)}</h3>
              ${row.email
                ? `<a href="mailto:${escapeHtml(row.email)}" title="${escapeHtml(row.email)}">${escapeHtml(row.email)}</a>`
                : `<span title="${escapeHtml(email)}">${escapeHtml(email)}</span>`}
              <small title="${escapeHtml(territory)}"><b>Territory:</b> ${escapeHtml(territory)}</small>
            </div>
          </div>
          <span class="salesmen-status-badge is-${escapeHtml(row.statusKey)}">${escapeHtml(row.statusLabel)}</span>
        </header>

        <div class="salesmen-directory-card-metrics" aria-label="Performance metrics for ${escapeHtml(row.name)}">
          <div class="salesmen-card-metric is-assigned"><strong>${escapeHtml(String(row.totalAssigned))}</strong><span>Assigned Leads</span></div>
          <div class="salesmen-card-metric is-customers"><strong>${escapeHtml(String(row.activeCustomers))}</strong><span>Active Customers</span></div>
          <div class="salesmen-card-metric is-overdue ${row.overdueFollowups ? "has-warning" : ""}">
            <strong>${row.overdueFollowups ? `<i aria-hidden="true">!</i>` : ""}${escapeHtml(String(row.overdueFollowups))}</strong><span>Overdue Follow-ups</span>
          </div>
          <div class="salesmen-card-metric is-conversion"><strong>${escapeHtml(String(row.conversionRate))}%</strong><span>Conversion Rate</span></div>
        </div>

        <div class="salesmen-card-progress" aria-label="Conversion rate ${escapeHtml(String(row.conversionRate))}%">
          <div><span>Conversion progress</span><strong>${escapeHtml(String(row.conversionRate))}%</strong></div>
          <span class="salesmen-card-progress-track"><i style="width:${conversion}%"></i></span>
        </div>

        <dl class="salesmen-card-meta">
          <div><dt>Tasks due</dt><dd class="${row.tasksDue ? "is-alert" : ""}">${escapeHtml(String(row.tasksDue))}</dd></div>
          <div><dt>Last activity</dt><dd title="${escapeHtml(row.lastActivity || "Not available")}">${escapeHtml(lastActivity)}</dd></div>
          <div><dt>Territory</dt><dd title="${escapeHtml(territory)}">${escapeHtml(territory)}</dd></div>
        </dl>

        <footer class="salesmen-directory-card-actions">${salesmenRowActionsMarkup(row)}</footer>
      </article>
    `;
  }).join("")}</div>`;
}

function bindSalesmenDirectoryActions() {
  els.salesmenGrid?.querySelectorAll("[data-salesmen-action]").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      const name = button.dataset.salesmanName;
      if (button.dataset.salesmenAction === "profile") {
        openSalesmanLeadsViewer(name);
        return;
      }
      if (button.dataset.salesmenAction === "assign") {
        resetLeadFormForNewLead();
        if (els.formSalesman) els.formSalesman.value = name;
        els.leadDialog.showModal();
        return;
      }
      if (button.dataset.salesmenAction === "pipeline") {
        state.filters.salesman = name;
        if (els.salesmanFilter) els.salesmanFilter.value = name;
        setView("pipeline");
      }
    });
  });
}

function renderSalesmenPagination(total) {
  if (!els.salesmenDirectoryPagination) return;
  const { pageSize } = state.salesmenDirectory;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  state.salesmenDirectory.page = Math.min(state.salesmenDirectory.page, pageCount);
  const page = state.salesmenDirectory.page;
  const start = total ? (page - 1) * pageSize + 1 : 0;
  const end = Math.min(total, page * pageSize);
  els.salesmenDirectoryPagination.innerHTML = `
    <span>Showing ${start} to ${end} of ${total} results</span>
    <div class="salesmen-pagination-controls">
      <button type="button" data-salesmen-page="first" ${page === 1 ? "disabled" : ""} aria-label="First page">&laquo;</button>
      <button type="button" data-salesmen-page="previous" ${page === 1 ? "disabled" : ""} aria-label="Previous page">&lsaquo;</button>
      <button class="active" type="button" aria-current="page">${page}</button>
      <button type="button" data-salesmen-page="next" ${page === pageCount ? "disabled" : ""} aria-label="Next page">&rsaquo;</button>
      <button type="button" data-salesmen-page="last" ${page === pageCount ? "disabled" : ""} aria-label="Last page">&raquo;</button>
      <select data-salesmen-page-size aria-label="Rows per page">
        ${[5, 10, 20].map(size => `<option value="${size}" ${size === pageSize ? "selected" : ""}>${size} / page</option>`).join("")}
      </select>
    </div>
  `;
  els.salesmenDirectoryPagination.querySelectorAll("[data-salesmen-page]").forEach(button => {
    button.addEventListener("click", () => {
      if (button.dataset.salesmenPage === "first") state.salesmenDirectory.page = 1;
      if (button.dataset.salesmenPage === "previous") state.salesmenDirectory.page = Math.max(1, page - 1);
      if (button.dataset.salesmenPage === "next") state.salesmenDirectory.page = Math.min(pageCount, page + 1);
      if (button.dataset.salesmenPage === "last") state.salesmenDirectory.page = pageCount;
      renderSalesmenManagementDashboard();
    });
  });
  els.salesmenDirectoryPagination.querySelector("[data-salesmen-page-size]")?.addEventListener("change", event => {
    state.salesmenDirectory.pageSize = Number(event.target.value || 10);
    state.salesmenDirectory.page = 1;
    renderSalesmenManagementDashboard();
  });
}

function syncSalesmenFilterControls(rows) {
  const territories = [...new Set(rows.map(row => row.territory).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  if (els.salesmenTerritoryFilter) {
    els.salesmenTerritoryFilter.innerHTML = `<option value="all">All territories</option>${territories.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("")}`;
    els.salesmenTerritoryFilter.value = territories.includes(state.salesmenDirectory.territory) ? state.salesmenDirectory.territory : "all";
  }
  if (els.salesmenSearch && document.activeElement !== els.salesmenSearch) els.salesmenSearch.value = state.salesmenDirectory.search;
  if (els.salesmenStatusFilter) els.salesmenStatusFilter.value = state.salesmenDirectory.status;
  if (els.salesmenSort) els.salesmenSort.value = state.salesmenDirectory.sort;
  document.querySelectorAll("[data-salesmen-view]").forEach(button => {
    const active = button.dataset.salesmenView === state.salesmenDirectory.view;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function renderSalesmenMetrics(rows) {
  const activeRows = rows.filter(row => !["inactive", "on-leave"].includes(row.statusKey));
  const activeTerritories = new Set(activeRows.map(row => row.territory).filter(Boolean));
  const totalTerritories = new Set([...(state.settings.territories || []), ...rows.map(row => row.territory).filter(Boolean)]).size;
  if (els.salesmenMetricTotal) els.salesmenMetricTotal.textContent = rows.length;
  if (els.salesmenMetricTerritories) els.salesmenMetricTerritories.textContent = activeTerritories.size;
  if (els.salesmenMetricTerritoriesMeta) els.salesmenMetricTerritoriesMeta.textContent = `of ${totalTerritories} total`;
  if (els.salesmenMetricOverdue) els.salesmenMetricOverdue.textContent = rows.reduce((sum, row) => sum + row.overdueFollowups, 0);
  if (els.salesmenMetricOpenLeads) els.salesmenMetricOpenLeads.textContent = rows.reduce((sum, row) => sum + row.openLeads, 0);
}

function renderSalesmenManagementDashboard() {
  if (!els.performancePanel || !els.salesmenGrid || state.currentUser?.role !== "admin") return;
  const allRows = salesmenDirectoryRows();
  syncSalesmenFilterControls(allRows);
  renderSalesmenMetrics(allRows);
  const rows = filteredSalesmenDirectoryRows(allRows);
  const pageCount = Math.max(1, Math.ceil(rows.length / state.salesmenDirectory.pageSize));
  state.salesmenDirectory.page = Math.min(state.salesmenDirectory.page, pageCount);
  const start = (state.salesmenDirectory.page - 1) * state.salesmenDirectory.pageSize;
  const visibleRows = rows.slice(start, start + state.salesmenDirectory.pageSize);
  if (els.salesmenSummary) els.salesmenSummary.textContent = `${rows.length} ${rows.length === 1 ? "record" : "records"}`;
  if (els.salesmenDirectoryStatus) {
    els.salesmenDirectoryStatus.textContent = rows.length
      ? `${rows.length} salesman ${rows.length === 1 ? "account matches" : "accounts match"} the selected filters.`
      : "No salesmen match the selected filters.";
  }
  els.salesmenGrid.innerHTML = visibleRows.length
    ? state.salesmenDirectory.view === "cards" ? salesmenDirectoryCardsMarkup(visibleRows) : salesmenDirectoryTableMarkup(visibleRows)
    : `<div class="salesmen-empty-state"><strong>No salesmen match the selected filters.</strong><span>Adjust the search, territory, status, or stage selection.</span><button class="ghost-button" type="button" data-salesmen-clear-empty>Clear Filters</button></div>`;
  bindSalesmenDirectoryActions();
  els.salesmenGrid.querySelector("[data-salesmen-clear-empty]")?.addEventListener("click", clearSalesmenDirectoryFilters);
  renderSalesmenPagination(rows.length);
  renderPerformanceChart(rows);
  renderSalesmenSummaryChart(rows);
}

function renderSalesmenView() {
  if (state.currentUser?.role !== "admin") {
    if (els.salesmenSummary) els.salesmenSummary.textContent = "My workspace";
    if (els.salesmenGrid) els.salesmenGrid.innerHTML = `<p class="empty-copy">Salesman accounts are visible to administrators only.</p>`;
    return;
  }
  renderSalesmenManagementDashboard();
}

function applySalesmenDirectoryFilters() {
  state.salesmenDirectory.search = String(els.salesmenSearch?.value || "").trim();
  state.salesmenDirectory.territory = els.salesmenTerritoryFilter?.value || "all";
  state.salesmenDirectory.status = els.salesmenStatusFilter?.value || "all";
  state.salesmenDirectory.sort = els.salesmenSort?.value || "assigned-desc";
  state.performanceStage = els.performanceStageFilter?.value || "all";
  state.salesmenDirectory.page = 1;
  renderSalesmenManagementDashboard();
}

function clearSalesmenDirectoryFilters() {
  state.salesmenDirectory = {
    ...state.salesmenDirectory,
    search: "",
    territory: "all",
    status: "all",
    sort: "assigned-desc",
    page: 1
  };
  state.performanceStage = "all";
  if (els.salesmenSearch) els.salesmenSearch.value = "";
  if (els.salesmenTerritoryFilter) els.salesmenTerritoryFilter.value = "all";
  if (els.salesmenStatusFilter) els.salesmenStatusFilter.value = "all";
  if (els.salesmenSort) els.salesmenSort.value = "assigned-desc";
  if (els.performanceStageFilter) els.performanceStageFilter.value = "all";
  renderSalesmenManagementDashboard();
}

function exportSalesmenDirectoryCsv() {
  const rows = filteredSalesmenDirectoryRows(salesmenDirectoryRows());
  if (!rows.length) {
    setToast("No salesman records match the selected filters.", "error");
    return;
  }
  const headers = ["Salesman", "Email", "Territory", "Assigned Leads", "Active Customers", "Overdue Follow-ups", "Tasks Due", "Conversion Rate", "Last Activity", "Status"];
  const body = rows.map(row => [
    row.name,
    row.email || "Not available",
    row.territory || "Not available",
    row.totalAssigned,
    row.activeCustomers,
    row.overdueFollowups,
    row.tasksDue,
    `${row.conversionRate}%`,
    row.lastActivity || "Not available",
    row.statusLabel
  ]);
  const csv = [headers, ...body].map(line => line.map(csvEscape).join(",")).join("\n");
  downloadTextFile(`salesmen-directory-${today()}.csv`, csv);
}

function salesmanByViewerName(name) {
  return analyticsSalesmen().find(person => salesmanName(person) === name) || null;
}

function renderSalesmanLeadsViewer() {
  if (!els.salesmanLeadsList || !els.salesmanLeadsTitle || !els.salesmanLeadsSummary || !els.salesmanLeadsSubtitle) return;
  const viewer = state.salesmanLeadsViewer;
  if (!viewer) {
    els.salesmanLeadsTitle.innerHTML = pageTitleMarkup("Salesman leads");
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
  els.salesmanLeadsTitle.innerHTML = pageTitleMarkup(viewer.name);
  els.salesmanLeadsSubtitle.textContent = `${leads.length} ${leads.length === 1 ? "lead" : "leads"} - most recent first`;
  els.salesmanLeadsSummary.innerHTML = `
    <span><strong>${leads.length}</strong> companies</span>
    <span><strong>${money.format(value)}</strong> open value</span>
    <span><strong>${hot}</strong> hot</span>
    <span><strong class="${overdue ? "is-overdue" : ""}">${overdue}</strong> overdue</span>
  `;
  els.salesmanLeadsList.innerHTML = leadTableMarkup(leads, {
    idAttribute: "data-salesman-view-lead",
    emptyText: "No assigned or generated leads to review yet."
  });
  bindLeadTableRows(els.salesmanLeadsList, "data-salesman-view-lead", leadId => {
    state.selectedId = leadId;
    closeSalesmanLeadsViewer();
    openLeadDrawer(leadId);
    render();
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

function actionPlanGroupKey(name) {
  return `plan-${String(name || "salesman").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "salesman"}`;
}

function ensureActionPlanHeaderControls() {
  if (!els.actionPlanPanel) return null;
  const header = directSectionHeader(els.actionPlanPanel);
  if (!header) return null;
  const actions = ensurePanelHeaderActions(header);
  let controls = actions.querySelector(".action-plan-bulk-actions");
  if (!controls) {
    controls = document.createElement("div");
    controls.className = "action-plan-bulk-actions";
    controls.innerHTML = `
      <button class="small-action action-plan-toolbar-button" type="button" data-action-plan-bulk="expand">Expand All</button>
      <button class="small-action action-plan-toolbar-button" type="button" data-action-plan-bulk="collapse">Collapse All</button>
    `;
    const collapseToggle = actions.querySelector(".panel-collapse-toggle");
    actions.insertBefore(controls, collapseToggle || null);
  }
  return controls;
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
        key: actionPlanGroupKey(salesmanName(person)),
        leads,
        overdue: leads.filter(lead => leadActionPlanState(lead).chipClass === "hot").length
      };
    });
  groups.forEach(group => {
    if (typeof state.actionPlanCollapsed[group.key] !== "boolean") {
      state.actionPlanCollapsed[group.key] = true;
    }
  });
  const totalLeads = groups.reduce((sum, group) => sum + group.leads.length, 0);
  els.actionPlanSummary.textContent = `${totalLeads} lead${totalLeads === 1 ? "" : "s"} tracked`;
  const headerControls = ensureActionPlanHeaderControls();
  if (headerControls) {
    headerControls.classList.toggle("hidden", !groups.length);
  }
  els.actionPlanList.innerHTML = groups.map(group => `
    <article class="salesman-plan-card ${state.actionPlanCollapsed[group.key] ? "is-collapsed" : ""}" data-action-plan-card="${escapeHtml(group.key)}">
      <div class="salesman-plan-head">
        <div class="salesman-plan-head-copy">
          <h3>${escapeHtml(group.name)}</h3>
          <p>${escapeHtml((group.person.territory || "").trim() || "Territory not set")} | ${group.leads.length} registered lead${group.leads.length === 1 ? "" : "s"} | ${group.overdue} overdue</p>
        </div>
        <div class="salesman-plan-head-meta">
          ${group.leads.length > 10 ? `<span class="chip plan-soon">Latest 10 visible</span>` : ""}
          <span class="chip ${group.overdue ? "hot" : "plan-upcoming"}">${group.overdue ? `${group.overdue} overdue` : "On track"}</span>
          <button
            class="small-action action-plan-toggle"
            type="button"
            data-action-plan-toggle="${escapeHtml(group.key)}"
            aria-expanded="${String(!state.actionPlanCollapsed[group.key])}"
            aria-controls="action-plan-body-${escapeHtml(group.key)}"
            aria-label="${escapeHtml(`${state.actionPlanCollapsed[group.key] ? "Expand" : "Collapse"} ${group.name} lead action plan`)}"
          >
            <span>${state.actionPlanCollapsed[group.key] ? "Expand" : "Collapse"}</span>
            <span class="action-plan-toggle-icon" aria-hidden="true">${state.actionPlanCollapsed[group.key] ? "+" : "-"}</span>
          </button>
        </div>
      </div>
      <div class="salesman-plan-table-region" id="action-plan-body-${escapeHtml(group.key)}" ${state.actionPlanCollapsed[group.key] ? "hidden" : ""}>
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
              ${group.leads.length ? group.leads.map(lead => {
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
              }).join("") : `<tr><td colspan="6"><div class="table-empty-state">No registered leads for this salesman yet.</div></td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    </article>
  `).join("") || `<p class="empty-copy">No registered leads available for action-plan tracking yet.</p>`;
  els.actionPlanList.querySelectorAll("[data-action-plan-toggle]").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      const key = button.dataset.actionPlanToggle;
      state.actionPlanCollapsed[key] = !state.actionPlanCollapsed[key];
      renderActionPlanPanel();
    });
  });
  headerControls?.querySelectorAll("[data-action-plan-bulk]").forEach(button => {
    button.onclick = () => {
      const collapse = button.dataset.actionPlanBulk === "collapse";
      groups.forEach(group => {
        state.actionPlanCollapsed[group.key] = collapse;
      });
      renderActionPlanPanel();
    };
  });
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
  state.activityPage = 1;
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
        <span>Overdue</span>
        <em class="count-chip overdue">${overdue.length}</em>
      </div>
      <div class="reminder-grid compact">${overdue.map(reminder => reminderCard(reminder, { compact: true })).join("") || `<p class="empty-copy">No overdue reminders.</p>`}</div>
    </div>
    <div class="reminder-divider"></div>
    <div class="reminder-stack">
      <div class="reminder-stack-header">
        <span>Upcoming</span>
        <em class="count-chip upcoming">${upcoming.length}</em>
      </div>
      <div class="reminder-grid compact">${upcoming.map(reminder => reminderCard(reminder, { compact: true })).join("") || `<p class="empty-copy">No upcoming reminders.</p>`}</div>
    </div>
  `;
}

function renderActivityQuickLinks() {
  if (!els.activityQuickLinks) return;
  const tasks = allReminders().length;
  const activePipeline = state.leads.filter(lead => !CLOSED_STAGE_KEYS.has(normalizeStageKey(lead.stage))).length;
  const quotes = state.leads.filter(lead =>
    Boolean(lead.quotation_ref)
    || String(lead.activity_purpose || "").toLowerCase().includes("quotation")
    || normalizeStageKey(lead.stage) === "NEGOTIATION"
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
    : STAGE_DISPLAY_LABELS[normalizeStageKey(activity.stage, "")] || activity.stage || "Prospect";
  const statusClass = reminderOverdue ? "hot" : "activity-status-neutral";
  const actionLabel = isReminder ? `${statusLabel}${dueDate ? ` · ${formatDisplayDate(dueDate)}` : ""}` : formatDisplayDate(activityDisplayDate(activity));
  const timeLabel = activityDisplayTime(activity);
  return `
    <article class="activity-feed-item timeline-card ${activityTypeClass(type)} ${reminderOverdue ? "is-urgent" : ""} ${activity.deletion_status === "pending" ? "is-deletion-pending" : ""}" data-activity-lead="${escapeHtml(activity.lead_id)}" tabindex="0">
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
          ${activityViewButton(activity.lead_id, activity.activity_index, activity)}
          ${activityEditButton(activity.lead_id, activity.activity_index, activity)}
          ${activityDeleteButton(activity.lead_id, activity.activity_index, activity)}
        </div>
      </div>
      ${activity.deletion_status === "pending" ? `<span class="request-status pending">Deletion pending approval</span>` : ""}
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
    const localDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return {
      date: localDate,
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
  const items = activityWeeklyItems(activities, state.activityWeekAnchor);
  const itemsForDay = date => items.filter(item => item.date === date);
  const dayTone = day => {
    const dayItems = itemsForDay(day.date);
    if (!dayItems.length) return "neutral";
    if (dayItems.some(item => item.type === "Reminder" && item.date < today())) return "overdue";
    if (day.date >= today()) return "upcoming";
    return "has-activity";
  };
  els.activityWeeklyLog.innerHTML = `
    <div class="calendar-legend">
      <span><i class="legend-swatch overdue"></i>Overdue</span>
      <span><i class="legend-swatch upcoming"></i>Upcoming</span>
      <span><i class="legend-swatch neutral"></i>Neutral</span>
    </div>
    <div class="activity-weekly-grid" role="list" aria-label="Activity days for ${escapeHtml(weekRangeLabel(state.activityWeekAnchor))}">
      ${days.map(day => {
        const dayItems = itemsForDay(day.date);
        return `
          <section class="activity-weekly-day ${dayTone(day)} ${day.date === today() ? "today" : ""}" role="listitem">
            <header class="activity-weekly-day-head">
              <strong>${escapeHtml(day.day)}</strong>
              <span>${escapeHtml(day.number)}</span>
            </header>
            <div class="activity-weekly-day-items">
              ${dayItems.map(item => `
                <button type="button" class="activity-day-event" data-calendar-lead="${escapeHtml(item.leadId)}">
                  <span>${escapeHtml(item.time)}</span>
                  <strong>${escapeHtml(item.company)}</strong>
                  <em>${escapeHtml(item.title)}</em>
                </button>
              `).join("") || `<p class="activity-weekly-empty">No activity scheduled.</p>`}
            </div>
          </section>
        `;
      }).join("")}
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

function activityTableStatus(activity) {
  const type = String(activity.type || "Note");
  const dueDate = String(activity.reminder_due_date || activity.due_date || "").slice(0, 10);
  const reminder = type.toLowerCase() === "reminder";
  const status = String(activity.reminder_status || activity.status || "").trim();
  if (activity.deletion_status === "pending") return { label: "Deletion pending", tone: "pending" };
  if (reminder && dueDate && dueDate < today() && status !== "completed") return { label: "Overdue", tone: "overdue" };
  if (status.toLowerCase() === "completed") return { label: "Completed", tone: "completed" };
  if (reminder) return { label: status || "Scheduled", tone: "scheduled" };
  if (dueDate && dueDate >= today()) return { label: "Upcoming", tone: "upcoming" };
  return { label: STAGE_DISPLAY_LABELS[normalizeStageKey(activity.stage, "")] || activity.stage || status || "Logged", tone: "neutral" };
}

function activityTableMarkup(activities) {
  const total = activities.length;
  const pageSize = state.activityPageSize || 10;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  state.activityPage = Math.min(Math.max(1, state.activityPage || 1), pageCount);
  const start = (state.activityPage - 1) * pageSize;
  const pageActivities = activities.slice(start, start + pageSize);
  const rows = pageActivities.map(activity => {
    const type = activity.type || "Note";
    const note = activity.note || activity.text || "No description added.";
    const salesman = activity.salesman_name || activity.assigned_salesman || "Unassigned";
    const date = formatDisplayDate(activityDisplayDate(activity));
    const time = activityDisplayTime(activity);
    const status = activityTableStatus(activity);
    const overflowActions = [
      activityDeleteButton(activity.lead_id, activity.activity_index, activity),
      activity.quotation_ref ? `<button class="small-action" type="button" data-quotation-ref="${escapeHtml(activity.quotation_ref)}">Open quote ${escapeHtml(activity.quotation_ref)}</button>` : ""
    ].filter(Boolean).join("");
    return `
      <tr class="activity-table-row" data-activity-lead="${escapeHtml(activity.lead_id)}" tabindex="0">
        <td data-label="Company / Lead">
          <strong>${escapeHtml(activity.company_name || "Unnamed lead")}</strong>
          <small>${escapeHtml(note)}</small>
        </td>
        <td data-label="Activity Type"><span class="activity-table-type ${activityTypeClass(type)}"><i aria-hidden="true">${escapeHtml(activityIconGlyph(type))}</i>${escapeHtml(type)}</span></td>
        <td data-label="Salesman">${escapeHtml(salesman)}</td>
        <td data-label="Date"><strong>${escapeHtml(date)}</strong>${time ? `<small>${escapeHtml(time)}</small>` : ""}</td>
        <td data-label="Status"><span class="activity-table-status ${escapeHtml(status.tone)}">${escapeHtml(status.label)}</span></td>
        <td data-label="Actions">
          <div class="activity-table-actions">
            ${activityViewButton(activity.lead_id, activity.activity_index, activity)}
            ${activityEditButton(activity.lead_id, activity.activity_index, activity)}
            ${overflowActions ? `<details class="activity-row-menu"><summary aria-label="More actions for ${escapeHtml(activity.company_name || "activity")}">&#8230;</summary><div>${overflowActions}</div></details>` : ""}
          </div>
        </td>
      </tr>
    `;
  }).join("");
  const firstShown = total ? start + 1 : 0;
  const lastShown = Math.min(start + pageSize, total);
  return `
    <div class="activity-table-scroll">
      <table class="activity-table">
        <thead><tr>
          <th scope="col">Company / Lead</th>
          <th scope="col">Activity Type</th>
          <th scope="col">Salesman</th>
          <th scope="col">Date</th>
          <th scope="col">Status</th>
          <th scope="col">Actions</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <nav class="activity-pagination" aria-label="Activity log pagination">
      <span>Showing ${firstShown} to ${lastShown} of ${total} activities</span>
      <div>
        <button type="button" data-activity-page="${state.activityPage - 1}" ${state.activityPage <= 1 ? "disabled" : ""} aria-label="Previous activity page">&#8249;</button>
        <strong>Page ${state.activityPage} of ${pageCount}</strong>
        <button type="button" data-activity-page="${state.activityPage + 1}" ${state.activityPage >= pageCount ? "disabled" : ""} aria-label="Next activity page">&#8250;</button>
      </div>
    </nav>
  `;
}

function weeklyReportStatusMeta(status) {
  const value = String(status || "not_started").trim().toLowerCase();
  if (value === "submitted") return { label: "Submitted", chipClass: "plan-upcoming" };
  if (value === "under_review") return { label: "Under Review", chipClass: "warm" };
  if (value === "accepted") return { label: "Accepted", chipClass: "success" };
  if (value === "rejected") return { label: "Rejected", chipClass: "hot" };
  if (["revision_required", "revision_requested"].includes(value)) return { label: "Revision Requested", chipClass: "plan-missing" };
  if (value === "in_progress") return { label: "In Progress", chipClass: "plan-soon" };
  return { label: "Not Started", chipClass: "plan-missing" };
}

function weeklyReportIsLocked(status) {
  return ["submitted", "under_review", "accepted", "rejected"].includes(String(status || "").trim().toLowerCase());
}

function weeklyDefaultMarketIntel() {
  return {
    demand_band: "",
    demand_note: "",
    pricing_band: "",
    competitor_loss: "",
    competitor_loss_note: "",
    competitor_pricing_note: "",
    cashflow_band: "",
    extended_terms_band: "",
    defaults_heard: "",
    defaults_details: "",
    projects_note: "",
    government_projects_band: "",
    government_projects_note: "",
    new_customers_note: "",
    lost_customers_note: "",
    big_changes_note: ""
  };
}

function normalizeWeeklyReportWrapper(payload) {
  const report = payload?.report || {};
  return {
    report: {
      ...report,
      secured_orders: Array.isArray(report.secured_orders) ? report.secured_orders.map(item => ({ ...item })) : [],
      expected_orders: Array.isArray(report.expected_orders) ? report.expected_orders.map(item => ({ ...item })) : [],
      problematic_accounts: Array.isArray(report.problematic_accounts) ? report.problematic_accounts.map(item => ({
        ...item,
        system_flags: Array.isArray(item.system_flags) ? [...item.system_flags] : [],
        problems: Array.isArray(item.problems) ? [...item.problems] : []
      })) : [],
      market_intelligence: {
        ...weeklyDefaultMarketIntel(),
        ...(report.market_intelligence || {})
      },
      contradiction_flags: Array.isArray(report.contradiction_flags) ? [...report.contradiction_flags] : []
    },
    context: payload?.context || {},
    blockers: Array.isArray(payload?.blockers) ? [...payload.blockers] : [],
    thin_report: Boolean(payload?.thin_report),
    storage_mode: payload?.storage_mode || "",
    events: Array.isArray(payload?.events) ? payload.events.map(item => ({ ...item })) : [],
    versions: Array.isArray(payload?.versions) ? payload.versions.map(item => ({ ...item })) : [],
    reviews: Array.isArray(payload?.reviews) ? payload.reviews.map(item => ({ ...item })) : [],
    latest_submitted_version: payload?.latest_submitted_version || null,
    displayed_version: payload?.displayed_version || null
  };
}

function weeklyWeekLabel(wrapper) {
  const report = wrapper?.report || {};
  if (wrapper?.context?.week_range) return wrapper.context.week_range;
  if (report.week_ending) return `Week ending ${formatDisplayDate(report.week_ending)}`;
  return "Week ending --";
}

function weeklySpecificEnough(value, options = {}) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text || text.length < (options.minLength || 10)) return false;
  const banned = new Set(["none", "n/a", "na", "nil", "same", "ok", "normal"]);
  if (banned.has(text.toLowerCase())) return false;
  if (options.requireDateOrAmount && !(/(?:\d|aed|mt|ton|june|july|aug|sep|oct|nov|dec|jan|feb|mar|apr|may)/i.test(text))) return false;
  return true;
}

function weeklyExpectedOrderCompletion(item = {}) {
  const likelihoodComplete = WEEKLY_LIKELIHOOD_OPTIONS.includes(String(item.likelihood || ""));
  const timingComplete = WEEKLY_TIMING_OPTIONS.includes(String(item.timing || ""));
  const blockersRequired = true;
  const blockersComplete = weeklySpecificEnough(item.blockers, { minLength: 16 });
  return {
    likelihoodComplete,
    timingComplete,
    blockersRequired,
    blockersComplete,
    complete: likelihoodComplete && timingComplete && blockersComplete
  };
}

function weeklyRequiredFieldState(report, path) {
  if (path === "summary") {
    return { required: true, complete: weeklySpecificEnough(report?.summary, { minLength: 24 }) };
  }
  const match = String(path || "").match(/^expected_orders\.(\d+)\.(likelihood|timing|blockers)$/);
  if (!match) return { required: false, complete: false };
  const item = report?.expected_orders?.[Number(match[1])] || {};
  const state = weeklyExpectedOrderCompletion(item);
  if (match[2] === "likelihood") return { required: true, complete: state.likelihoodComplete };
  if (match[2] === "timing") return { required: true, complete: state.timingComplete };
  return { required: state.blockersRequired, complete: state.blockersComplete };
}

function weeklyRequiredFieldClass(report, path) {
  const state = weeklyRequiredFieldState(report, path);
  if (!state.required) return "";
  return state.complete ? "field--filled" : "field--required-empty";
}

function weeklyRequiredLabel(label, report, path) {
  const state = weeklyRequiredFieldState(report, path);
  return `<span class="tasks-field-label ${state.required ? "is-required" : ""}">${escapeHtml(label)}</span>`;
}

function weeklyClientBlockers(wrapper) {
  const report = wrapper?.report || {};
  const blockers = [];
  if (!weeklySpecificEnough(report.summary, { minLength: 24 })) blockers.push("Add a specific weekly summary with more than filler text.");
  if (!(report.secured_orders || []).length && !report.no_secured_orders_confirmed) blockers.push("Confirm explicitly if there were no secured orders worth reporting this week.");
  (report.secured_orders || []).forEach(item => {
    if (item.flagged && String(item.has_issue || "").toLowerCase() === "yes" && !weeklySpecificEnough(item.problem_note, { requireDateOrAmount: true, minLength: 14 })) {
      blockers.push(`Explain the secured-order issue for ${item.account_name || "this account"} with a dated or quantified note.`);
    }
  });
  if (!(report.expected_orders || []).length && !report.no_expected_orders_confirmed) blockers.push("Confirm explicitly if there were no expected orders to review this week.");
  (report.expected_orders || []).forEach(item => {
    const state = weeklyExpectedOrderCompletion(item);
    if (!state.likelihoodComplete) blockers.push(`Choose the likelihood for ${item.account_name || "an expected order"}.`);
    if (!state.timingComplete) blockers.push(`Choose the timing window for ${item.account_name || "an expected order"}.`);
    if (!state.blockersComplete) {
      blockers.push(`Describe what could stop ${item.account_name || "this expected order"}.`);
    }
  });
  if (!(report.problematic_accounts || []).length && !report.no_problematic_accounts_confirmed) blockers.push("Confirm explicitly if there were zero problematic accounts this week.");
  (report.problematic_accounts || []).forEach(item => {
    const disposition = String(item.disposition || "").toLowerCase();
    if (!["report", "dismiss"].includes(disposition)) {
      blockers.push(`Choose whether to report or dismiss ${item.account_name || "this problematic account"}.`);
      return;
    }
    if (disposition === "dismiss" && !weeklySpecificEnough(item.dismiss_reason, { minLength: 12 })) {
      blockers.push(`Explain why ${item.account_name || "this account"} was dismissed from the problematic-account queue.`);
    }
    if (disposition === "report") {
      if (!Array.isArray(item.problems) || !item.problems.length) blockers.push(`Select at least one problem for ${item.account_name || "this account"}.`);
      if (Array.isArray(item.problems) && item.problems.includes("Other") && !weeklySpecificEnough(item.other_problem, { minLength: 10 })) {
        blockers.push(`Describe the "Other" problem for ${item.account_name || "this account"}.`);
      }
      if (!weeklySpecificEnough(item.specifics, { requireDateOrAmount: true, minLength: 14 })) blockers.push(`Add dated or quantified specifics for ${item.account_name || "this account"}.`);
      if (!WEEKLY_ASSESSMENT_OPTIONS.includes(String(item.assessment || ""))) blockers.push(`Choose the honest assessment for ${item.account_name || "this account"}.`);
    }
  });
  const intel = { ...weeklyDefaultMarketIntel(), ...(report.market_intelligence || {}) };
  if (!WEEKLY_DEMAND_OPTIONS.includes(String(intel.demand_band || ""))) blockers.push("Choose the customer demand signal for the week.");
  if (!weeklySpecificEnough(intel.demand_note, { minLength: 14 })) blockers.push("Describe what customers said about their business this week.");
  if (!WEEKLY_FOUR_BAND_OPTIONS.includes(String(intel.pricing_band || ""))) blockers.push("Choose the pricing-complaint level.");
  if (!["yes", "no"].includes(String(intel.competitor_loss || "").toLowerCase())) blockers.push("Confirm whether any orders were lost to competitors this week.");
  if (String(intel.competitor_loss || "").toLowerCase() === "yes" && !weeklySpecificEnough(intel.competitor_loss_note, { requireDateOrAmount: true, minLength: 14 })) blockers.push("Explain the competitor loss with specifics.");
  if (!weeklySpecificEnough(intel.competitor_pricing_note, { minLength: 10 })) blockers.push("Add a competitor pricing trend note or explicitly say none observed.");
  if (!WEEKLY_FOUR_BAND_OPTIONS.includes(String(intel.cashflow_band || ""))) blockers.push("Choose the cash-flow stress signal.");
  if (!WEEKLY_FOUR_BAND_OPTIONS.includes(String(intel.extended_terms_band || ""))) blockers.push("Choose the extended-terms signal.");
  if (!["yes", "no"].includes(String(intel.defaults_heard || "").toLowerCase())) blockers.push("Confirm whether defaults or failures were heard in the market.");
  if (String(intel.defaults_heard || "").toLowerCase() === "yes" && !weeklySpecificEnough(intel.defaults_details, { requireDateOrAmount: true, minLength: 12 })) blockers.push("Name the default or failure and give details.");
  if (!weeklySpecificEnough(intel.projects_note, { minLength: 10 })) blockers.push("List the big projects or state the live project signal explicitly.");
  if (!WEEKLY_GOVERNMENT_OPTIONS.includes(String(intel.government_projects_band || ""))) blockers.push("Choose the government-project speed signal.");
  if (["Delayed", "Speeding up"].includes(String(intel.government_projects_band || "")) && !weeklySpecificEnough(intel.government_projects_note, { minLength: 12 })) blockers.push("Explain the government-project movement.");
  if (!weeklySpecificEnough(intel.new_customers_note, { minLength: 8 })) blockers.push("Confirm new customers this week or explicitly state none confirmed.");
  if (!weeklySpecificEnough(intel.lost_customers_note, { minLength: 8 })) blockers.push("Confirm lost customers this week or explicitly state none.");
  if (!weeklySpecificEnough(intel.big_changes_note, { minLength: 8 })) blockers.push("Describe any big account changes or explicitly state none.");
  if (!weeklySpecificEnough(report.next_week_plan, { minLength: 16 })) blockers.push("Add next week's action plan.");
  if (!report.attested) blockers.push("Tick the digital attestation before submission.");
  return blockers;
}

function weeklyCompletionSnapshot(wrapper) {
  const report = wrapper?.report || {};
  const expected = report.expected_orders || [];
  const problems = report.problematic_accounts || [];
  const intel = { ...weeklyDefaultMarketIntel(), ...(report.market_intelligence || {}) };
  const checks = [
    weeklySpecificEnough(report.summary, { minLength: 24 }),
    expected.length ? true : Boolean(report.no_expected_orders_confirmed),
    !expected.length || expected.every(item => weeklyExpectedOrderCompletion(item).complete),
    problems.length ? true : Boolean(report.no_problematic_accounts_confirmed),
    !problems.length || problems.every(item => ["report", "dismiss"].includes(String(item.disposition || "").toLowerCase())),
    (report.secured_orders || []).length ? true : Boolean(report.no_secured_orders_confirmed),
    WEEKLY_DEMAND_OPTIONS.includes(String(intel.demand_band || "")) && WEEKLY_FOUR_BAND_OPTIONS.includes(String(intel.pricing_band || "")),
    WEEKLY_FOUR_BAND_OPTIONS.includes(String(intel.cashflow_band || "")) && WEEKLY_FOUR_BAND_OPTIONS.includes(String(intel.extended_terms_band || "")),
    WEEKLY_GOVERNMENT_OPTIONS.includes(String(intel.government_projects_band || "")),
    weeklySpecificEnough(report.next_week_plan, { minLength: 16 }),
    Boolean(report.attested)
  ];
  const completed = checks.filter(Boolean).length;
  const total = checks.length || 1;
  return {
    completed,
    total,
    percent: Math.round((completed / total) * 100)
  };
}

function syncWeeklyRequiredFieldStates() {
  const wrapper = state.weeklyReports.current;
  const report = wrapper?.report || {};
  els.tasksPrimary.querySelectorAll("[data-weekly-completion-field]").forEach(field => {
    const fieldState = weeklyRequiredFieldState(report, field.dataset.weeklyField);
    field.classList.toggle("field--required-empty", fieldState.required && !fieldState.complete);
    field.classList.toggle("field--filled", fieldState.required && fieldState.complete);
    if (fieldState.required) field.setAttribute("aria-required", "true");
    else field.removeAttribute("aria-required");
    field.closest("label")?.querySelector(".tasks-field-label")?.classList.toggle("is-required", fieldState.required);
  });

  els.tasksPrimary.querySelectorAll("[data-weekly-expected-card]").forEach(card => {
    const item = report.expected_orders?.[Number(card.dataset.weeklyExpectedCard)] || {};
    const itemState = weeklyExpectedOrderCompletion(item);
    card.classList.toggle("is-complete", itemState.complete);
    card.classList.toggle("needs-input", !itemState.complete);
    const badge = card.querySelector("[data-weekly-account-status]");
    if (badge) {
      badge.textContent = itemState.complete ? "Complete" : "Needs input";
      badge.classList.toggle("success", itemState.complete);
      badge.classList.toggle("plan-missing", !itemState.complete);
    }
  });

  const completion = weeklyCompletionSnapshot(wrapper);
  const fill = els.tasksSidebar.querySelector("[data-weekly-progress-fill]");
  const copy = els.tasksSidebar.querySelector("[data-weekly-progress-copy]");
  const percent = els.tasksSidebar.querySelector("[data-weekly-progress-percent]");
  if (fill) fill.style.width = `${completion.percent}%`;
  if (copy) copy.textContent = `${completion.completed}/${completion.total} checkpoints complete`;
  if (percent) percent.textContent = `${completion.percent}%`;

  const blockersBody = els.tasksSidebar.querySelector("[data-weekly-blockers-body]");
  if (blockersBody) {
    const blockers = weeklyClientBlockers(wrapper);
    blockersBody.innerHTML = blockers.length
      ? `<ul class="tasks-checklist">${blockers.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
      : `<p class="empty-copy">No blockers left. This report is ready to submit.</p>`;
  }
}

function weeklySetValue(target, path, value) {
  const parts = String(path || "").split(".").filter(Boolean);
  if (!parts.length) return;
  let cursor = target;
  parts.forEach((part, index) => {
    const last = index === parts.length - 1;
    const key = /^\d+$/.test(part) ? Number(part) : part;
    if (last) {
      cursor[key] = value;
      return;
    }
    const nextPart = parts[index + 1];
    const shouldArray = /^\d+$/.test(nextPart);
    if (cursor[key] == null) cursor[key] = shouldArray ? [] : {};
    cursor = cursor[key];
  });
}

function weeklyGetValue(target, path) {
  return String(path || "").split(".").filter(Boolean).reduce((cursor, part) => {
    const key = /^\d+$/.test(part) ? Number(part) : part;
    return cursor?.[key];
  }, target);
}

function weeklyReportFieldValue(path) {
  return weeklyGetValue(state.weeklyReports.current?.report || {}, path);
}

function weeklyReportEventLabel(action) {
  const value = String(action || "").trim().toLowerCase();
  if (value === "report_created") return "Report created";
  if (value === "report_started") return "Report started";
  if (value === "draft_saved") return "Draft saved";
  if (["submitted", "report_submitted"].includes(value)) return "Submitted for review";
  if (["resubmitted", "report_resubmitted"].includes(value)) return "Resubmitted after revision";
  if (["review_under_review", "review_started"].includes(value)) return "Marked under review";
  if (["review_accepted", "report_accepted"].includes(value)) return "Accepted by management";
  if (["review_revision_required", "revision_requested"].includes(value)) return "Revision requested";
  if (["review_rejected", "report_rejected"].includes(value)) return "Rejected by management";
  return "Weekly report update";
}

function weeklySelectMarkup(options, selected, placeholder = "Choose") {
  return [`<option value="">${escapeHtml(placeholder)}</option>`].concat(
    options.map(option => `<option value="${escapeHtml(option)}" ${option === selected ? "selected" : ""}>${escapeHtml(option)}</option>`)
  ).join("");
}

function weeklyStatusMarkup(status) {
  const meta = weeklyReportStatusMeta(status);
  return `<span class="chip ${meta.chipClass}">${escapeHtml(meta.label)}</span>`;
}

function setTasksMessage(message = "", type = "") {
  if (!els.tasksMessage) return;
  if (!message) {
    els.tasksMessage.textContent = "";
    els.tasksMessage.className = "tasks-message hidden";
    return;
  }
  els.tasksMessage.textContent = message;
  els.tasksMessage.className = `tasks-message ${type || ""}`.trim();
}

async function loadWeeklyReportReviewDetail(id) {
  if (!id) {
    state.weeklyReports.selectedId = "";
    state.weeklyReports.selectedReport = null;
    return;
  }
  const detail = await api(`${isAdminOrManager() ? "/api/admin" : "/api"}/weekly-reports/${encodeURIComponent(id)}`);
  state.weeklyReports.selectedId = id;
  state.weeklyReports.selectedReport = normalizeWeeklyReportWrapper(detail);
}

async function loadWeeklySalesmanReportDetail(id) {
  if (!id) return;
  const detail = await api(`/api/weekly-reports/${encodeURIComponent(id)}`);
  state.weeklyReports.current = normalizeWeeklyReportWrapper(detail);
  state.weeklyReports.weekEnding = state.weeklyReports.current.report.week_ending || "";
  state.weeklyReports.storageMode = state.weeklyReports.current.storage_mode || "";
}

async function loadWeeklyReportWorkspace(force = false) {
  if (state.weeklyReports.loading && !force) return;
  state.weeklyReports.loading = true;
  renderTasksView();
  try {
    if (isAdminOrManager()) {
      const weekQuery = state.weeklyReports.weekEnding
        ? `?weekEnd=${encodeURIComponent(state.weeklyReports.weekEnding)}`
        : "";
      const review = await api(`/api/admin/weekly-reports${weekQuery}`);
      state.weeklyReports.review = Array.isArray(review.reports) ? review.reports : [];
      state.weeklyReports.missing = Array.isArray(review.missing) ? review.missing : [];
      state.weeklyReports.weekEnding = review.week_ending || "";
      state.weeklyReports.storageMode = "review";
      const candidateId = state.weeklyReports.review.some(item => item.id === state.weeklyReports.selectedId)
        ? state.weeklyReports.selectedId
        : (state.weeklyReports.review[0]?.id || "");
      if (candidateId) {
        await loadWeeklyReportReviewDetail(candidateId);
      } else {
        state.weeklyReports.selectedId = "";
        state.weeklyReports.selectedReport = null;
      }
    } else {
      const [current, history] = await Promise.all([
        api("/api/weekly-reports/current"),
        api("/api/weekly-reports/mine")
      ]);
      const normalized = normalizeWeeklyReportWrapper(current);
      state.weeklyReports.current = normalized;
      state.weeklyReports.history = Array.isArray(history.reports) ? history.reports : [];
      state.weeklyReports.weekEnding = normalized.report.week_ending || "";
      state.weeklyReports.storageMode = normalized.storage_mode || "";
    }
    setTasksMessage("");
  } catch (error) {
    setTasksMessage(error.message || "Unable to load weekly report workspace.", "error");
  } finally {
    state.weeklyReports.loading = false;
    renderTasksView();
  }
}

function weeklyReportCard(title, subtitle, body, tone = "", headerCap = "") {
  const headerCapClass = headerCap ? ` tasks-section-card--${headerCap}-cap` : "";
  return `
    <section class="tasks-section-card ${tone}${headerCapClass}">
      <div class="tasks-section-head">
        <div>
          <h3>${pageTitleMarkup(title)}</h3>
          ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
        </div>
      </div>
      <div class="tasks-section-body">${body}</div>
    </section>
  `;
}

function renderWeeklySalesmanView() {
  const wrapper = state.weeklyReports.current;
  const report = wrapper?.report;
  if (!report) {
    els.tasksPrimary.innerHTML = `
      <div class="timeline-empty">
        <strong>Weekly sales report is not ready yet.</strong>
        <span>Reload the workspace to pull your current reporting week.</span>
      </div>
    `;
    els.tasksSidebar.innerHTML = "";
    return;
  }
  const blockers = weeklyClientBlockers(wrapper);
  const completion = weeklyCompletionSnapshot(wrapper);
  const status = weeklyReportStatusMeta(report.status);
  const locked = weeklyReportIsLocked(report.status);
  const eventsMarkup = (wrapper.events || []).length
    ? `
      <ul class="tasks-audit-list">
        ${wrapper.events.map(item => `
          <li class="tasks-audit-item">
            <strong>${escapeHtml(weeklyReportEventLabel(item.action))}</strong>
            <span>${escapeHtml(item.actor_name || "System")} · ${escapeHtml(formatDateTime(item.timestamp))}</span>
            ${item.details?.note ? `<p>${escapeHtml(item.details.note)}</p>` : ""}
          </li>
        `).join("")}
      </ul>
    `
    : `<p class="empty-copy">The immutable event trail will appear here after the first save or submit.</p>`;
  const securedMarkup = (report.secured_orders || []).length
    ? report.secured_orders.map((item, index) => `
      <article class="tasks-row-card ${item.flagged ? "is-flagged" : ""}">
        <div class="tasks-row-head">
          <div>
            <strong>${escapeHtml(item.account_name || "Unnamed account")}</strong>
            <p>${escapeHtml(formatAED(item.order_value || item.value || 0))}${item.product_type ? ` · ${escapeHtml(item.product_type)}` : ""}</p>
          </div>
          ${item.flagged ? `<span class="chip warm">Needs comment</span>` : `<span class="chip success">Clean</span>`}
        </div>
        ${item.flagged ? `
          <div class="tasks-inline-grid">
            <label>
              <span>Any issue?</span>
              <select data-weekly-field="secured_orders.${index}.has_issue">
                ${weeklySelectMarkup(["yes", "no"], item.has_issue || "", "Choose")}
              </select>
            </label>
            <label class="tasks-full-span ${String(item.has_issue || "").toLowerCase() === "yes" ? "" : "muted-field"}">
              <span>Issue note</span>
              <textarea rows="3" data-weekly-field="secured_orders.${index}.problem_note" placeholder="What happened, when, and what needs help?">${escapeHtml(item.problem_note || "")}</textarea>
            </label>
          </div>
        ` : `<p class="tasks-muted-line">System marked this order as clean. No extra comment needed unless something changed.</p>`}
      </article>
    `).join("")
    : `
      <label class="tasks-checkline">
        <input type="checkbox" data-weekly-field="no_secured_orders_confirmed" ${report.no_secured_orders_confirmed ? "checked" : ""}>
        <span>Confirm there were no secured orders worth reporting this week.</span>
      </label>
    `;

  const expectedMarkup = (report.expected_orders || []).length
    ? report.expected_orders.map((item, index) => {
      const fieldBase = `expected_orders.${index}`;
      const itemCompletion = weeklyExpectedOrderCompletion(item);
      return `
      <article class="tasks-row-card tasks-expected-order-card ${itemCompletion.complete ? "is-complete" : "needs-input"}" data-weekly-expected-card="${index}">
        <div class="tasks-row-head">
          <div>
            <strong>${escapeHtml(item.account_name || "Unnamed account")}</strong>
            <p>${escapeHtml(formatAED(item.expected_value || 0))}${item.order_scope ? ` · ${escapeHtml(item.order_scope)}` : ""}</p>
          </div>
          ${itemCompletion.complete
            ? `<span class="chip success" data-weekly-account-status>Complete</span>`
            : `<span class="chip plan-missing" data-weekly-account-status>Needs input</span>`}
        </div>
        <div class="tasks-inline-grid">
          <label>
            ${weeklyRequiredLabel("Likelihood", report, `${fieldBase}.likelihood`)}
            <select class="${weeklyRequiredFieldClass(report, `${fieldBase}.likelihood`)}" data-weekly-completion-field data-weekly-field="${fieldBase}.likelihood" aria-required="true">
              ${weeklySelectMarkup(WEEKLY_LIKELIHOOD_OPTIONS, item.likelihood || "", "Choose")}
            </select>
          </label>
          <label>
            ${weeklyRequiredLabel("Timing", report, `${fieldBase}.timing`)}
            <select class="${weeklyRequiredFieldClass(report, `${fieldBase}.timing`)}" data-weekly-completion-field data-weekly-field="${fieldBase}.timing" aria-required="true">
              ${weeklySelectMarkup(WEEKLY_TIMING_OPTIONS, item.timing || "", "Choose")}
            </select>
          </label>
          <label class="tasks-full-span">
            ${weeklyRequiredLabel("What could stop it?", report, `${fieldBase}.blockers`)}
            <textarea class="${weeklyRequiredFieldClass(report, `${fieldBase}.blockers`)}" rows="3" id="weeklyExpectedBlockers${index}" data-weekly-completion-field data-weekly-field="${fieldBase}.blockers" aria-required="true" placeholder="Name the blocker or next dependency that could stop this order.">${escapeHtml(item.blockers || "")}</textarea>
          </label>
          <div class="tasks-voice-row tasks-full-span">
            <button
              class="ghost-button tasks-voice-button"
              type="button"
              data-weekly-voice-button
              data-voice-target="weeklyExpectedBlockers${index}"
              data-idle-label="Voice Note"
              data-stop-label="Stop"
              data-listening-label="Listening..."
              data-transcribing-label="Transcribing..."
              data-success-label="Transcript added below. Review before saving."
            >Voice Note</button>
            <span class="tasks-voice-status" data-weekly-voice-status>Append a blocker note by voice. Your transcript will be added to the field above.</span>
          </div>
        </div>
      </article>
    `;
    }).join("")
    : `
      <label class="tasks-checkline">
        <input type="checkbox" data-weekly-field="no_expected_orders_confirmed" ${report.no_expected_orders_confirmed ? "checked" : ""}>
        <span>Confirm there were no expected orders to review this week.</span>
      </label>
      <p class="empty-copy">No open expected orders are in your current visible pipeline.</p>
    `;

  const problemMarkup = (report.problematic_accounts || []).length
    ? report.problematic_accounts.map((item, index) => {
      const disposition = String(item.disposition || "").toLowerCase();
      return `
        <article class="tasks-row-card tasks-problematic-account-card ${disposition === "report" ? "is-flagged" : ""}">
          <div class="tasks-row-head">
            <div>
              <strong>${escapeHtml(item.account_name || "Unnamed account")}</strong>
              <p>${(item.system_flags || []).map(flag => `<span class="chip hot">${escapeHtml(flag)}</span>`).join("") || `<span class="chip">No system flags</span>`}</p>
            </div>
            ${weeklyStatusMarkup(disposition === "report" ? "in_progress" : disposition === "dismiss" ? "accepted" : "not_started")}
          </div>
          <div class="tasks-inline-grid">
            <div class="tasks-context-grid tasks-full-span">
              <div class="tasks-context-pill"><span>Credit limit</span><strong>${escapeHtml(String(item.credit_limit || "ERP not synced"))}</strong></div>
              <div class="tasks-context-pill"><span>Utilization</span><strong>${escapeHtml(String(item.current_utilization || "ERP not synced"))}</strong></div>
              <div class="tasks-context-pill"><span>Last payment</span><strong>${escapeHtml(String(item.last_payment_date || "ERP not synced"))}</strong></div>
              <div class="tasks-context-pill"><span>Days late</span><strong>${escapeHtml(String(item.days_late || "ERP not synced"))}</strong></div>
            </div>
            <label>
              <span>Decision</span>
              <select data-weekly-field="problematic_accounts.${index}.disposition">
                ${weeklySelectMarkup(["report", "dismiss"], disposition || "", "Choose")}
              </select>
            </label>
            ${disposition === "dismiss" ? `
              <label class="tasks-full-span">
                <span>Dismiss reason</span>
                <textarea rows="3" data-weekly-field="problematic_accounts.${index}.dismiss_reason" placeholder="Why should this account stay out of the report this week?">${escapeHtml(item.dismiss_reason || "")}</textarea>
              </label>
            ` : ""}
            ${disposition === "report" ? `
              <div class="tasks-checkbox-grid tasks-full-span">
                ${WEEKLY_PROBLEM_OPTIONS.map(problem => `
                  <label class="tasks-checkline">
                    <input type="checkbox" data-weekly-array-toggle="problematic_accounts.${index}.problems" value="${escapeHtml(problem)}" ${Array.isArray(item.problems) && item.problems.includes(problem) ? "checked" : ""}>
                    <span>${escapeHtml(problem)}</span>
                  </label>
                `).join("")}
              </div>
              ${Array.isArray(item.problems) && item.problems.includes("Other") ? `
                <label class="tasks-full-span">
                  <span>Other problem</span>
                  <input type="text" data-weekly-field="problematic_accounts.${index}.other_problem" value="${escapeHtml(item.other_problem || "")}" placeholder="Describe the other issue">
                </label>
              ` : ""}
              <label class="tasks-full-span">
                <span>Specifics</span>
                <textarea rows="3" data-weekly-field="problematic_accounts.${index}.specifics" placeholder="What happened, with dates, amounts, or named blockers?">${escapeHtml(item.specifics || "")}</textarea>
              </label>
              <label>
                <span>Assessment</span>
                <select data-weekly-field="problematic_accounts.${index}.assessment">
                  ${weeklySelectMarkup(WEEKLY_ASSESSMENT_OPTIONS, item.assessment || "", "Choose")}
                </select>
              </label>
            ` : ""}
          </div>
        </article>
      `;
    }).join("")
    : `
      <label class="tasks-checkline">
        <input type="checkbox" data-weekly-field="no_problematic_accounts_confirmed" ${report.no_problematic_accounts_confirmed ? "checked" : ""}>
        <span>I confirm there were zero problematic accounts requiring mention this week.</span>
      </label>
      <p class="empty-copy">No system-flagged problematic accounts were pulled into this reporting week.</p>
    `;

  const intel = { ...weeklyDefaultMarketIntel(), ...(report.market_intelligence || {}) };
  const marketIntelMarkup = `
    <div class="tasks-inline-grid">
      <label>
        <span>Customer demand this week</span>
        <select data-weekly-field="market_intelligence.demand_band">${weeklySelectMarkup(WEEKLY_DEMAND_OPTIONS, intel.demand_band || "", "Choose")}</select>
      </label>
      <label>
        <span>Pricing complaints</span>
        <select data-weekly-field="market_intelligence.pricing_band">${weeklySelectMarkup(WEEKLY_FOUR_BAND_OPTIONS, intel.pricing_band || "", "Choose")}</select>
      </label>
      <label class="tasks-full-span">
        <span>What customers said about their business</span>
        <textarea rows="3" data-weekly-field="market_intelligence.demand_note" placeholder="Summarize demand tone, slowdowns, or urgency from the field.">${escapeHtml(intel.demand_note || "")}</textarea>
      </label>
      <label>
        <span>Any orders lost to competitors?</span>
        <select data-weekly-field="market_intelligence.competitor_loss">${weeklySelectMarkup(["yes", "no"], intel.competitor_loss || "", "Choose")}</select>
      </label>
      <label>
        <span>Cash-flow stress</span>
        <select data-weekly-field="market_intelligence.cashflow_band">${weeklySelectMarkup(WEEKLY_FOUR_BAND_OPTIONS, intel.cashflow_band || "", "Choose")}</select>
      </label>
      <label>
        <span>Extended terms requests</span>
        <select data-weekly-field="market_intelligence.extended_terms_band">${weeklySelectMarkup(WEEKLY_FOUR_BAND_OPTIONS, intel.extended_terms_band || "", "Choose")}</select>
      </label>
      <label>
        <span>Defaults or failures heard?</span>
        <select data-weekly-field="market_intelligence.defaults_heard">${weeklySelectMarkup(["yes", "no"], intel.defaults_heard || "", "Choose")}</select>
      </label>
      <label>
        <span>Government project speed</span>
        <select data-weekly-field="market_intelligence.government_projects_band">${weeklySelectMarkup(WEEKLY_GOVERNMENT_OPTIONS, intel.government_projects_band || "", "Choose")}</select>
      </label>
      <label class="tasks-full-span">
        <span>Competitor pricing trend</span>
        <textarea rows="2" data-weekly-field="market_intelligence.competitor_pricing_note" placeholder="What did competitors do on price this week?">${escapeHtml(intel.competitor_pricing_note || "")}</textarea>
      </label>
      ${String(intel.competitor_loss || "").toLowerCase() === "yes" ? `
        <label class="tasks-full-span">
          <span>Competitor loss details</span>
          <textarea rows="2" data-weekly-field="market_intelligence.competitor_loss_note" placeholder="Name the account, competitor, and what was lost.">${escapeHtml(intel.competitor_loss_note || "")}</textarea>
        </label>
      ` : ""}
      ${String(intel.defaults_heard || "").toLowerCase() === "yes" ? `
        <label class="tasks-full-span">
          <span>Default or failure details</span>
          <textarea rows="2" data-weekly-field="market_intelligence.defaults_details" placeholder="Who struggled, and what is the field impact?">${escapeHtml(intel.defaults_details || "")}</textarea>
        </label>
      ` : ""}
      ${["Delayed", "Speeding up"].includes(String(intel.government_projects_band || "")) ? `
        <label class="tasks-full-span">
          <span>Government project note</span>
          <textarea rows="2" data-weekly-field="market_intelligence.government_projects_note" placeholder="Which project moved, and why does it matter?">${escapeHtml(intel.government_projects_note || "")}</textarea>
        </label>
      ` : ""}
      <label class="tasks-full-span">
        <span>Big projects or live opportunities</span>
        <textarea rows="2" data-weekly-field="market_intelligence.projects_note" placeholder="List the big projects or explicitly state none.">${escapeHtml(intel.projects_note || "")}</textarea>
      </label>
      <label class="tasks-full-span">
        <span>New customers gained</span>
        <textarea rows="2" data-weekly-field="market_intelligence.new_customers_note" placeholder="State names won this week or say none confirmed.">${escapeHtml(intel.new_customers_note || "")}</textarea>
      </label>
      <label class="tasks-full-span">
        <span>Customers lost</span>
        <textarea rows="2" data-weekly-field="market_intelligence.lost_customers_note" placeholder="State names lost this week or say none.">${escapeHtml(intel.lost_customers_note || "")}</textarea>
      </label>
      <label class="tasks-full-span">
        <span>Any big account changes</span>
        <textarea rows="2" data-weekly-field="market_intelligence.big_changes_note" placeholder="Any mergers, slowdowns, project delays, or management shifts?">${escapeHtml(intel.big_changes_note || "")}</textarea>
      </label>
    </div>
  `;

  els.tasksPrimary.innerHTML = `
    <div class="tasks-section-stack">
      ${locked ? `
        <section class="tasks-section-card">
          <div class="tasks-section-body">
            <div class="tasks-lock-banner">
              <strong>This weekly report is locked after submission.</strong>
              <p>You can review it here, but it stays immutable until management sends it back with a revision request.</p>
            </div>
          </div>
        </section>
      ` : ""}
      ${String(report.status || "").toLowerCase() === "revision_required" && (report.latest_review_note || report.review_note) ? `
        <section class="tasks-section-card warning">
          <div class="tasks-section-head">
            <div>
              <h3>Revision note from management</h3>
              <p>Clear the note below, then resubmit the report.</p>
            </div>
            ${weeklyStatusMarkup(report.status)}
          </div>
          <div class="tasks-section-body">
            <p>${escapeHtml(report.latest_review_note || report.review_note)}</p>
          </div>
        </section>
      ` : ""}
      ${weeklyReportCard("Week overview", "Summarize the week once, with specifics.", `
        <label>
          ${weeklyRequiredLabel("Weekly summary", report, "summary")}
          <textarea class="${weeklyRequiredFieldClass(report, "summary")}" rows="5" data-weekly-completion-field data-weekly-field="summary" aria-required="true" placeholder="What actually happened this week, in plain sales language?">${escapeHtml(report.summary || "")}</textarea>
        </label>
      `, "", "blue")}
      ${weeklyReportCard("Secured orders", "ERP facts should appear here already. Only explain the flagged exceptions.", securedMarkup, "", "blue")}
      ${weeklyReportCard("Expected orders", "Confirm what is still likely and what could stop it.", expectedMarkup, "", "blue")}
      ${weeklyReportCard("Problematic accounts", "Every system-flagged issue must be reported or dismissed with a reason.", problemMarkup, "", "blue")}
      ${weeklyReportCard("Market intelligence overlay", "Capture the tacit market signal the system cannot infer.", marketIntelMarkup)}
      ${weeklyReportCard("Next week plan", "Tell management what you will do next, not just what happened.", `
        <label>
          <span>Next week action plan</span>
          <textarea rows="4" data-weekly-field="next_week_plan" placeholder="Name the accounts, action, and timing for next week.">${escapeHtml(report.next_week_plan || "")}</textarea>
        </label>
        <label class="tasks-checkline">
          <input type="checkbox" data-weekly-field="attested" ${report.attested ? "checked" : ""}>
          <span>I confirm this report is honest, specific, and complete for the week.</span>
        </label>
      `)}
    </div>
  `;

  els.tasksSidebar.innerHTML = `
    <div class="tasks-sidebar-stack">
      <section class="tasks-status-card">
        <span class="tasks-kicker">Submission status</span>
        <strong class="chip ${status.chipClass}">${escapeHtml(status.label)}</strong>
        <p>${escapeHtml(weeklyWeekLabel(wrapper))}</p>
        <div class="tasks-progress-meter">
          <div class="tasks-progress-fill" data-weekly-progress-fill style="width:${completion.percent}%"></div>
        </div>
        <div class="tasks-progress-copy">
          <span data-weekly-progress-copy>${completion.completed}/${completion.total} checkpoints complete</span>
          <strong data-weekly-progress-percent>${completion.percent}%</strong>
        </div>
        <div class="tasks-status-notes">
          ${report.current_version_number ? `<span><strong>Version ${Number(report.current_version_number)}</strong></span>` : ""}
          ${report.submitted_at ? `<span>${escapeHtml(`Submitted ${formatDateTime(report.submitted_at)}`)}</span>` : ""}
          ${report.reviewed_at ? `<span>${escapeHtml(`Reviewed ${formatDateTime(report.reviewed_at)}`)}</span>` : ""}
          <span>${escapeHtml(report.updated_at ? `Last updated ${formatDateTime(report.updated_at)}` : "Not saved yet")}</span>
          <span>${escapeHtml(wrapper.storage_mode ? `Storage: ${wrapper.storage_mode}` : "")}</span>
          ${report.attested_at ? `<span>${escapeHtml(`Attested ${formatDateTime(report.attested_at)}`)}</span>` : ""}
        </div>
      </section>
      <section class="tasks-section-card tasks-report-history">
        <div class="tasks-section-head">
          <div>
            <h3>My weekly reports</h3>
            <p>Open any saved reporting week, including submitted and reviewed reports.</p>
          </div>
        </div>
        <div class="tasks-section-body">
          <div class="tasks-week-filter">
            <label for="weeklyAdminWeekEnding">
              <span>Reporting week ending</span>
              <input
                id="weeklyAdminWeekEnding"
                type="date"
                value="${escapeHtml(state.weeklyReports.weekEnding || "")}"
                ${state.weeklyReports.actionPending ? "disabled" : ""}
              >
            </label>
            <button class="ghost-button" type="button" id="weeklyAdminLoadWeek" ${state.weeklyReports.actionPending ? "disabled" : ""}>Load week</button>
          </div>
          <div class="tasks-review-list">
            ${(state.weeklyReports.history || []).length ? state.weeklyReports.history.map(item => `
              <button
                class="tasks-review-card ${String(report.id || "") === String(item.id) ? "active" : ""}"
                type="button"
                data-weekly-history-id="${escapeHtml(item.id)}"
              >
                <div class="tasks-review-card-head">
                  <strong>${escapeHtml(item.week_start && item.week_ending
                    ? `${formatDisplayDate(item.week_start)} - ${formatDisplayDate(item.week_ending)}`
                    : `Week ending ${formatDisplayDate(item.week_ending)}`)}</strong>
                  ${weeklyStatusMarkup(item.status)}
                </div>
                <div class="tasks-review-card-meta">
                  <span>${item.current_version_number ? `Version ${Number(item.current_version_number)}` : "Draft"}</span>
                  ${item.submitted_at ? `<span>${escapeHtml(formatDateTime(item.submitted_at))}</span>` : ""}
                </div>
                ${item.latest_review_note ? `<small>${escapeHtml(item.latest_review_note)}</small>` : ""}
                <span class="tasks-open-report-copy">Open report</span>
              </button>
            `).join("") : `<p class="empty-copy">No prior weekly reports yet.</p>`}
          </div>
        </div>
      </section>
      <section class="tasks-section-card tasks-blockers-card">
        <div class="tasks-section-head">
          <div>
            <h3>Blockers to clear</h3>
            <p>These are the gaps stopping clean submission.</p>
          </div>
        </div>
        <div class="tasks-section-body" data-weekly-blockers-body>
          ${blockers.length ? `<ul class="tasks-checklist">${blockers.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : `<p class="empty-copy">No blockers left. This report is ready to submit.</p>`}
        </div>
      </section>
      ${report.contradiction_flags?.length ? weeklyReportCard("Director challenge queue", "These entries may need clarification before review.", `<ul class="tasks-checklist warning">${report.contradiction_flags.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`, "warning") : ""}
      ${weeklyReportCard("Immutable report trail", "Each save, submit, and review action is preserved as an append-only event.", eventsMarkup)}
      <section class="tasks-actions-card">
        <button class="ghost-button" type="button" id="weeklySaveDraft" ${locked ? "disabled" : ""}>Save draft</button>
        <button class="primary-button" type="button" id="weeklySubmitReport" ${locked ? "disabled" : ""}>${String(report.status || "").toLowerCase() === "revision_required" ? "Resubmit report" : "Submit report"}</button>
      </section>
    </div>
  `;

  bindWeeklySalesmanEvents();
}

function renderWeeklyReviewViewLegacy() {
  const review = state.weeklyReports.review || [];
  const missing = state.weeklyReports.missing || [];
  const detail = state.weeklyReports.selectedReport;
  els.tasksPrimary.innerHTML = detail ? `
    <div class="tasks-review-shell">
      <section class="tasks-section-card">
        <div class="tasks-section-head">
          <div>
            <h3>${escapeHtml(detail.report.rep_name || detail.report.rep_email || "Weekly report")}</h3>
            <p>${escapeHtml(detail.report.territory || "Territory not set")} · ${escapeHtml(weeklyWeekLabel(detail))}</p>
          </div>
          <div class="tasks-review-meta">
            ${weeklyStatusMarkup(detail.report.status)}
            ${detail.thin_report ? `<span class="chip hot">Thin report</span>` : ""}
          </div>
        </div>
        <div class="tasks-review-grid">
          <div class="tasks-review-block">
            <span class="tasks-kicker">Summary</span>
            <p>${escapeHtml(detail.report.summary || "No summary provided.")}</p>
          </div>
          <div class="tasks-review-block">
            <span class="tasks-kicker">Next week plan</span>
            <p>${escapeHtml(detail.report.next_week_plan || "No next-week plan provided.")}</p>
          </div>
          <div class="tasks-review-block">
            <span class="tasks-kicker">Expected orders</span>
            ${(detail.report.expected_orders || []).length ? `
              <ul class="tasks-checklist compact">
                ${(detail.report.expected_orders || []).map(item => `
                  <li><strong>${escapeHtml(item.account_name || "Account")}</strong> · ${escapeHtml(item.likelihood || "No likelihood")} · ${escapeHtml(item.timing || "No timing")} ${item.blockers ? `· ${escapeHtml(item.blockers)}` : ""}</li>
                `).join("")}
              </ul>
            ` : `<p>No expected orders in scope.</p>`}
          </div>
          <div class="tasks-review-block">
            <span class="tasks-kicker">Problematic accounts</span>
            ${(detail.report.problematic_accounts || []).length ? `
              <ul class="tasks-checklist compact">
                ${(detail.report.problematic_accounts || []).map(item => `
                  <li>
                    <strong>${escapeHtml(item.account_name || "Account")}</strong>
                    · ${escapeHtml(item.disposition || "Undecided")}
                    ${item.problems?.length ? `· ${escapeHtml(item.problems.join(", "))}` : ""}
                    ${item.dismiss_reason ? `· ${escapeHtml(item.dismiss_reason)}` : ""}
                    ${item.specifics ? `· ${escapeHtml(item.specifics)}` : ""}
                  </li>
                `).join("")}
              </ul>
            ` : `<p>No problematic accounts were surfaced.</p>`}
          </div>
          <div class="tasks-review-block tasks-review-block-full">
            <span class="tasks-kicker">Market intelligence</span>
            <div class="tasks-review-inline-list">
              <span class="chip">${escapeHtml(detail.report.market_intelligence?.demand_band || "No demand signal")}</span>
              <span class="chip">${escapeHtml(detail.report.market_intelligence?.pricing_band || "No pricing signal")}</span>
              <span class="chip">${escapeHtml(detail.report.market_intelligence?.cashflow_band || "No cash-flow signal")}</span>
              <span class="chip">${escapeHtml(detail.report.market_intelligence?.government_projects_band || "No government signal")}</span>
            </div>
            <p>${escapeHtml(detail.report.market_intelligence?.demand_note || "No demand note provided.")}</p>
            <p>${escapeHtml(detail.report.market_intelligence?.projects_note || "No project signal provided.")}</p>
          </div>
        </div>
      </section>
      <section class="tasks-section-card ${detail.blockers?.length ? "warning" : ""}">
        <div class="tasks-section-head">
          <div>
            <h3>Review notes and decision</h3>
            <p>Challenge thin reports, push back on contradictions, then move the report forward.</p>
          </div>
        </div>
        <div class="tasks-section-body">
          ${detail.blockers?.length ? `<ul class="tasks-checklist warning">${detail.blockers.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : `<p class="empty-copy">No blockers left in the submitted report.</p>`}
          ${detail.report.contradiction_flags?.length ? `<ul class="tasks-checklist warning">${detail.report.contradiction_flags.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
          <label>
            <span>Review note</span>
            <textarea rows="4" id="weeklyReviewNote" placeholder="Challenge unclear claims, confirm what is accepted, or tell the rep what to revise.">${escapeHtml(detail.report.review_note || "")}</textarea>
          </label>
          <div class="tasks-actions-card inline">
            <button class="ghost-button" type="button" data-weekly-review-action="under_review">Mark under review</button>
            <button class="ghost-button" type="button" data-weekly-review-action="revision_required">Request revision</button>
            <button class="primary-button" type="button" data-weekly-review-action="accepted">Accept report</button>
          </div>
        </div>
      </section>
      ${weeklyReportCard("Immutable report trail", "Salesman saves, submissions, and director decisions are preserved as an append-only log.", (detail.events || []).length ? `
        <ul class="tasks-audit-list">
          ${(detail.events || []).map(item => `
            <li class="tasks-audit-item">
              <strong>${escapeHtml(weeklyReportEventLabel(item.action))}</strong>
              <span>${escapeHtml(item.actor_name || "System")} · ${escapeHtml(formatDateTime(item.timestamp))}</span>
              ${item.details?.note ? `<p>${escapeHtml(item.details.note)}</p>` : ""}
            </li>
          `).join("")}
        </ul>
      ` : `<p class="empty-copy">No immutable events were recorded yet.</p>`)}
    </div>
  ` : `
    <div class="timeline-empty tasks-review-empty">
      <strong>No submitted weekly reports yet.</strong>
      <span>Once a salesman submits, the review detail will appear here.</span>
    </div>
  `;

  els.tasksSidebar.innerHTML = `
    <div class="tasks-sidebar-stack">
      <section class="tasks-section-card tasks-submitted-panel">
        <div class="tasks-section-head">
          <div>
            <h3>Submitted reports</h3>
            <p>${escapeHtml(state.weeklyReports.weekEnding ? `Week ending ${formatDisplayDate(state.weeklyReports.weekEnding)}` : "Current reporting week")}</p>
          </div>
        </div>
        <div class="tasks-section-body">
          <div class="tasks-review-list">
            ${review.length ? review.map(item => `
              <button class="tasks-review-card ${state.weeklyReports.selectedId === item.id ? "active" : ""}" type="button" data-weekly-open-id="${escapeHtml(item.id)}">
                <div class="tasks-review-card-head">
                  <strong>${escapeHtml(item.rep_name || item.rep_email || "Salesman")}</strong>
                  ${weeklyStatusMarkup(item.status)}
                </div>
                <p>${escapeHtml(item.territory || "Territory not set")}</p>
                <small>${escapeHtml(item.summary || "No summary added yet.")}</small>
                <div class="tasks-review-card-meta">
                  ${item.contradiction_flags?.length ? `<span class="chip hot">${item.contradiction_flags.length} flags</span>` : ""}
                  ${item.thin_report ? `<span class="chip warm">Thin</span>` : `<span class="chip success">Solid</span>`}
                </div>
              </button>
            `).join("") : `<p class="empty-copy">No submitted reports yet.</p>`}
          </div>
        </div>
      </section>
      <section class="tasks-section-card tasks-missing-panel">
        <div class="tasks-section-head">
          <div>
            <h3>Missing submissions</h3>
            <p>A missing report is itself a tracked escalation.</p>
          </div>
        </div>
        <div class="tasks-section-body">
          ${missing.length ? `
            <ul class="tasks-checklist warning">
              ${missing.map(item => `<li><strong>${escapeHtml(item.name || item.email || "Salesman")}</strong>${item.territory ? ` · ${escapeHtml(item.territory)}` : ""}</li>`).join("")}
            </ul>
          ` : `<p class="empty-copy">Every active salesman has a report or active review state for this week.</p>`}
        </div>
      </section>
    </div>
  `;

  bindWeeklyReviewEvents();
}

function weeklyReviewVersionMarkup(detail) {
  const versions = detail?.versions || [];
  if (!versions.length) return `<p class="empty-copy">No immutable submitted version is available yet.</p>`;
  const selectedVersion = Number(detail?.displayed_version?.version_number || 0);
  return `
    <div class="tasks-version-list">
      ${versions.map(version => `
        <button
          class="tasks-version-row ${selectedVersion === Number(version.version_number) ? "active" : ""}"
          type="button"
          data-weekly-version-number="${Number(version.version_number)}"
        >
          <span>
            <strong>Version ${Number(version.version_number)}</strong>
            <small>${escapeHtml(formatDateTime(version.submitted_at || version.created_at))}</small>
          </span>
          <span>Open submitted version</span>
        </button>
      `).join("")}
    </div>
  `;
}

function renderWeeklyReviewView() {
  const review = state.weeklyReports.review || [];
  const missing = state.weeklyReports.missing || [];
  const detail = state.weeklyReports.selectedReport;
  const report = detail?.report || {};
  const reviewStatus = String(report.status || "").toLowerCase();
  const canReview = ["submitted", "under_review"].includes(reviewStatus);
  const reviewDisabled = !canReview || state.weeklyReports.actionPending;
  const latestReviewNote = report.latest_review_note || report.review_note || "";
  const intel = { ...weeklyDefaultMarketIntel(), ...(report.market_intelligence || {}) };

  els.tasksPrimary.innerHTML = detail ? `
    <div class="tasks-review-shell">
      <section class="tasks-section-card">
        <div class="tasks-section-head">
          <div>
            <h3>${escapeHtml(report.rep_name || report.rep_email || "Weekly report")}</h3>
            <p>${escapeHtml(report.territory || "Territory not set")} &middot; ${escapeHtml(weeklyWeekLabel(detail))}</p>
          </div>
          <div class="tasks-review-meta">
            ${weeklyStatusMarkup(report.status)}
            ${detail.thin_report ? `<span class="chip hot">Thin report</span>` : ""}
            ${report.current_version_number ? `<span class="chip">Current version ${Number(report.current_version_number)}</span>` : ""}
            ${detail.displayed_version ? `<span class="chip warm">Viewing version ${Number(detail.displayed_version.version_number)}</span>` : ""}
          </div>
        </div>
        <div class="tasks-review-grid">
          <div class="tasks-review-block">
            <span class="tasks-kicker">Summary</span>
            <p>${escapeHtml(report.summary || "No summary provided.")}</p>
          </div>
          <div class="tasks-review-block">
            <span class="tasks-kicker">Next week plan</span>
            <p>${escapeHtml(report.next_week_plan || "No next-week plan provided.")}</p>
          </div>
          <div class="tasks-review-block">
            <span class="tasks-kicker">Secured orders</span>
            ${(report.secured_orders || []).length ? `
              <ul class="tasks-checklist compact">
                ${(report.secured_orders || []).map(item => `
                  <li>
                    <strong>${escapeHtml(item.account_name || "Account")}</strong>
                    ${item.quantity ? ` &middot; ${escapeHtml(item.quantity)}` : ""}
                    ${item.amount ? ` &middot; ${escapeHtml(item.amount)}` : ""}
                    ${item.flagged ? ` &middot; ${escapeHtml(item.problem_note || "Flagged exception")}` : ""}
                  </li>
                `).join("")}
              </ul>
            ` : `<p>${report.no_secured_orders_confirmed ? "Salesman confirmed there were no secured orders to report." : "No secured-order response was submitted."}</p>`}
          </div>
          <div class="tasks-review-block">
            <span class="tasks-kicker">Expected orders</span>
            ${(report.expected_orders || []).length ? `
              <ul class="tasks-checklist compact">
                ${(report.expected_orders || []).map(item => `
                  <li>
                    <strong>${escapeHtml(item.account_name || "Account")}</strong>
                    &middot; ${escapeHtml(item.likelihood || "No likelihood")}
                    &middot; ${escapeHtml(item.timing || "No timing")}
                    ${item.blockers ? ` &middot; ${escapeHtml(item.blockers)}` : ""}
                  </li>
                `).join("")}
              </ul>
            ` : `<p>${report.no_expected_orders_confirmed ? "Salesman confirmed there were no expected orders." : "No expected-order response was submitted."}</p>`}
          </div>
          <div class="tasks-review-block">
            <span class="tasks-kicker">Problematic accounts</span>
            ${(report.problematic_accounts || []).length ? `
              <ul class="tasks-checklist compact">
                ${(report.problematic_accounts || []).map(item => `
                  <li>
                    <strong>${escapeHtml(item.account_name || "Account")}</strong>
                    &middot; ${escapeHtml(item.disposition || "Undecided")}
                    ${item.problems?.length ? ` &middot; ${escapeHtml(item.problems.join(", "))}` : ""}
                    ${item.dismiss_reason ? ` &middot; ${escapeHtml(item.dismiss_reason)}` : ""}
                    ${item.specifics ? ` &middot; ${escapeHtml(item.specifics)}` : ""}
                  </li>
                `).join("")}
              </ul>
            ` : `<p>${report.no_problematic_accounts_confirmed ? "Salesman confirmed there were no problematic accounts." : "No problematic-account response was submitted."}</p>`}
          </div>
          <div class="tasks-review-block tasks-review-block-full">
            <span class="tasks-kicker">Market intelligence</span>
            <div class="tasks-review-inline-list">
              <span class="chip">${escapeHtml(intel.demand_band || "No demand signal")}</span>
              <span class="chip">${escapeHtml(intel.pricing_band || "No pricing signal")}</span>
              <span class="chip">${escapeHtml(intel.cashflow_band || "No cash-flow signal")}</span>
              <span class="chip">${escapeHtml(intel.extended_terms_band || "No terms signal")}</span>
              <span class="chip">${escapeHtml(intel.government_projects_band || "No government signal")}</span>
            </div>
            <p><strong>Demand:</strong> ${escapeHtml(intel.demand_note || "No demand note provided.")}</p>
            <p><strong>Competitor pricing:</strong> ${escapeHtml(intel.competitor_pricing_note || "No competitor pricing note provided.")}</p>
            <p><strong>Projects:</strong> ${escapeHtml(intel.projects_note || "No project signal provided.")}</p>
            <p><strong>Government projects:</strong> ${escapeHtml(intel.government_projects_note || "No movement note provided.")}</p>
            <p><strong>Customer movement:</strong> ${escapeHtml(intel.big_changes_note || "No major account change recorded.")}</p>
          </div>
        </div>
      </section>

      <section class="tasks-section-card ${detail.blockers?.length ? "warning" : ""}">
        <div class="tasks-section-head">
          <div>
            <h3>Review notes and decision</h3>
            <p>Review the exact submitted version, then accept it or return it with a clear reason.</p>
          </div>
        </div>
        <div class="tasks-section-body">
          ${detail.blockers?.length ? `<ul class="tasks-checklist warning">${detail.blockers.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : `<p class="empty-copy">No blockers were found in this submitted report.</p>`}
          ${report.contradiction_flags?.length ? `<ul class="tasks-checklist warning">${report.contradiction_flags.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
          <label>
            <span>Review note</span>
            <textarea rows="4" id="weeklyReviewNote" placeholder="Required when rejecting or requesting revision.">${escapeHtml(latestReviewNote)}</textarea>
          </label>
          ${latestReviewNote ? `<p class="tasks-review-latest-note"><strong>Latest management note:</strong> ${escapeHtml(latestReviewNote)}</p>` : ""}
          <div class="tasks-actions-card inline">
            <button class="ghost-button" type="button" data-weekly-review-action="under_review" ${reviewDisabled || reviewStatus === "under_review" ? "disabled" : ""}>Mark under review</button>
            <button class="ghost-button" type="button" data-weekly-review-action="revision_required" ${reviewDisabled ? "disabled" : ""}>Request revision</button>
            <button class="danger-button" type="button" data-weekly-review-action="rejected" ${reviewDisabled ? "disabled" : ""}>Reject report</button>
            <button class="primary-button" type="button" data-weekly-review-action="accepted" ${reviewDisabled ? "disabled" : ""}>Accept report</button>
          </div>
          ${!canReview ? `<p class="empty-copy">This report is in ${escapeHtml(weeklyReportStatusMeta(reviewStatus).label)} status and has no pending management action.</p>` : ""}
        </div>
      </section>

      ${weeklyReportCard(
        "Submitted versions",
        "Open the exact immutable payload that management reviewed.",
        weeklyReviewVersionMarkup(detail)
      )}

      ${weeklyReportCard("Immutable report trail", "Salesman saves, submissions, and management decisions are preserved as an append-only log.", (detail.events || []).length ? `
        <ul class="tasks-audit-list">
          ${(detail.events || []).map(item => `
            <li class="tasks-audit-item">
              <strong>${escapeHtml(weeklyReportEventLabel(item.action))}</strong>
              <span>${escapeHtml(item.actor_name || "System")} &middot; ${escapeHtml(formatDateTime(item.timestamp || item.created_at))}</span>
              ${item.report_version_id ? `<span>Submitted version linked</span>` : ""}
              ${item.details?.note ? `<p>${escapeHtml(item.details.note)}</p>` : ""}
            </li>
          `).join("")}
        </ul>
      ` : `<p class="empty-copy">No immutable events were recorded yet.</p>`)}
    </div>
  ` : `
    <div class="timeline-empty tasks-review-empty">
      <strong>No submitted weekly reports yet.</strong>
      <span>Once a salesman submits, the review detail will appear here.</span>
    </div>
  `;

  els.tasksSidebar.innerHTML = `
    <div class="tasks-sidebar-stack">
      <section class="tasks-section-card tasks-submitted-panel">
        <div class="tasks-section-head">
          <div>
            <h3>Submitted reports</h3>
            <p>${escapeHtml(state.weeklyReports.weekEnding ? `Week ending ${formatDisplayDate(state.weeklyReports.weekEnding)}` : "Current reporting week")}</p>
          </div>
        </div>
        <div class="tasks-section-body">
          <div class="tasks-review-list">
            ${review.length ? review.map(item => `
              <button class="tasks-review-card ${state.weeklyReports.selectedId === item.id ? "active" : ""}" type="button" data-weekly-open-id="${escapeHtml(item.id)}">
                <div class="tasks-review-card-head">
                  <strong>${escapeHtml(item.rep_name || item.rep_email || "Salesman")}</strong>
                  ${weeklyStatusMarkup(item.status)}
                </div>
                <p>${escapeHtml(item.territory || "Territory not set")}</p>
                <small>${escapeHtml(item.summary || "No summary added yet.")}</small>
                <div class="tasks-review-card-meta">
                  ${item.current_version_number ? `<span>Version ${Number(item.current_version_number)}</span>` : ""}
                  ${item.submitted_at ? `<span>${escapeHtml(formatDateTime(item.submitted_at))}</span>` : ""}
                  ${item.contradiction_flags?.length ? `<span class="chip hot">${item.contradiction_flags.length} flags</span>` : ""}
                  ${item.thin_report ? `<span class="chip warm">Thin</span>` : `<span class="chip success">Solid</span>`}
                </div>
                <span class="tasks-open-report-copy">Open report</span>
              </button>
            `).join("") : `<p class="empty-copy">No submitted reports yet.</p>`}
          </div>
        </div>
      </section>
      <section class="tasks-section-card tasks-missing-panel">
        <div class="tasks-section-head">
          <div>
            <h3>Missing submissions</h3>
            <p>A missing report is itself a tracked escalation.</p>
          </div>
        </div>
        <div class="tasks-section-body">
          ${missing.length ? `
            <ul class="tasks-checklist warning">
              ${missing.map(item => `<li><strong>${escapeHtml(item.name || item.email || "Salesman")}</strong>${item.territory ? ` &middot; ${escapeHtml(item.territory)}` : ""}</li>`).join("")}
            </ul>
          ` : `<p class="empty-copy">Every active salesman has a report or active review state for this week.</p>`}
        </div>
      </section>
    </div>
  `;

  bindWeeklyReviewEvents();
}

function renderTasksView() {
  if (!els.tasksPrimary || !els.tasksSidebar) return;
  const admin = isAdminOrManager();
  els.tasksViewTitle.innerHTML = pageTitleMarkup(admin ? "Weekly Sales Report Review" : "Weekly Sales Report");
  els.tasksViewSubtitle.textContent = admin
    ? "Review submitted reports, challenge contradictions, and chase missing weekly submissions."
    : "Capture the week once, at the source, then lock it with an honest digital sign-off.";
  els.tasksWeekLabel.textContent = admin
    ? (state.weeklyReports.weekEnding ? `Week ending ${formatDisplayDate(state.weeklyReports.weekEnding)}` : "Current week")
    : weeklyWeekLabel(state.weeklyReports.current);
  const statusMeta = admin
    ? weeklyReportStatusMeta(state.weeklyReports.selectedReport?.report?.status || (state.weeklyReports.review.length ? "submitted" : "not_started"))
    : weeklyReportStatusMeta(state.weeklyReports.current?.report?.status || "not_started");
  els.tasksStatusBadge.textContent = statusMeta.label;
  els.tasksStatusBadge.className = `chip ${statusMeta.chipClass}`.trim();

  if (state.weeklyReports.loading) {
    els.tasksPrimary.innerHTML = `
      <div class="timeline-empty">
        <strong>Loading weekly report workspace…</strong>
        <span>Pulling the current reporting week and its CRM-backed context.</span>
      </div>
    `;
    els.tasksSidebar.innerHTML = "";
    return;
  }

  if (admin) {
    renderWeeklyReviewView();
  } else {
    renderWeeklySalesmanView();
  }
}

function bindWeeklySalesmanEvents() {
  const report = state.weeklyReports.current?.report || {};
  const locked = weeklyReportIsLocked(report.status);
  els.tasksSidebar.querySelectorAll("[data-weekly-history-id]").forEach(button => {
    button.addEventListener("click", async () => {
      if (state.weeklyReports.actionPending) return;
      state.weeklyReports.actionPending = true;
      setTasksMessage("Loading saved weekly report...");
      try {
        await loadWeeklySalesmanReportDetail(button.dataset.weeklyHistoryId);
        setTasksMessage("");
        renderTasksView();
      } catch (error) {
        setTasksMessage(error.message || "Unable to open the weekly report.", "error");
      } finally {
        state.weeklyReports.actionPending = false;
      }
    });
  });
  if (locked) {
    els.tasksPrimary.querySelectorAll("[data-weekly-field], [data-weekly-array-toggle], [data-weekly-voice-button]").forEach(field => {
      field.disabled = true;
    });
    return;
  }

  els.tasksPrimary.querySelectorAll("[data-weekly-field]").forEach(field => {
    const applyValue = shouldRerender => {
      const value = field.type === "checkbox" ? field.checked : field.value;
      weeklySetValue(state.weeklyReports.current.report, field.dataset.weeklyField, value);
      if (shouldRerender) renderTasksView();
      else syncWeeklyRequiredFieldStates();
    };
    field.addEventListener("input", () => applyValue(false));
    field.addEventListener("change", () => applyValue(field.tagName === "SELECT" || field.type === "checkbox"));
  });

  els.tasksPrimary.querySelectorAll("[data-weekly-array-toggle]").forEach(field => {
    field.addEventListener("change", () => {
      const path = field.dataset.weeklyArrayToggle;
      const current = Array.isArray(weeklyGetValue(state.weeklyReports.current.report, path)) ? [...weeklyGetValue(state.weeklyReports.current.report, path)] : [];
      const value = field.value;
      const next = field.checked
        ? (current.includes(value) ? current : [...current, value])
        : current.filter(item => item !== value);
      weeklySetValue(state.weeklyReports.current.report, path, next);
      renderTasksView();
    });
  });

  els.tasksPrimary.querySelectorAll("[data-weekly-voice-button]").forEach(button => {
    button.addEventListener("click", () => {
      const targetId = button.dataset.voiceTarget;
      const target = targetId ? els.tasksPrimary.querySelector(`#${targetId}`) : null;
      const status = button.parentElement?.querySelector("[data-weekly-voice-status]");
      if (!(target instanceof HTMLTextAreaElement) || !(status instanceof HTMLElement)) return;
      toggleVoiceRecording({ button, status, target });
    });
  });

  els.tasksSidebar.querySelector("#weeklySaveDraft")?.addEventListener("click", async () => {
    if (state.weeklyReports.actionPending) return;
    state.weeklyReports.actionPending = true;
    setTasksMessage("Saving weekly report draft…");
    try {
      state.weeklyReports.current.report.attestation_device = navigator.userAgent || "browser";
      const reportId = state.weeklyReports.current.report.id;
      const saved = await api(reportId
        ? `/api/weekly-reports/${encodeURIComponent(reportId)}/draft`
        : "/api/weekly-reports/current", {
        method: reportId ? "PATCH" : "POST",
        headers: { "Idempotency-Key": `draft-${reportId || "new"}-${Date.now()}` },
        body: JSON.stringify(state.weeklyReports.current.report)
      });
      state.weeklyReports.current = normalizeWeeklyReportWrapper(saved);
      state.weeklyReports.weekEnding = state.weeklyReports.current.report.week_ending || "";
      const history = await api("/api/weekly-reports/mine");
      state.weeklyReports.history = Array.isArray(history.reports) ? history.reports : [];
      setTasksMessage("Weekly report draft saved.", "success");
      renderTasksView();
    } catch (error) {
      setTasksMessage(error.message || "Unable to save the weekly report draft.", "error");
    } finally {
      state.weeklyReports.actionPending = false;
    }
  });

  els.tasksSidebar.querySelector("#weeklySubmitReport")?.addEventListener("click", async () => {
    if (state.weeklyReports.actionPending) return;
    state.weeklyReports.actionPending = true;
    setTasksMessage("Submitting weekly report…");
    try {
      state.weeklyReports.current.report.attestation_device = navigator.userAgent || "browser";
      const reportId = state.weeklyReports.current.report.id;
      const saved = await api(reportId
        ? `/api/weekly-reports/${encodeURIComponent(reportId)}/submit`
        : "/api/weekly-reports/current/submit", {
        method: "POST",
        headers: { "Idempotency-Key": `submit-${reportId || "new"}-${state.weeklyReports.current.report.row_version || 0}` },
        body: JSON.stringify(state.weeklyReports.current.report)
      });
      state.weeklyReports.current = normalizeWeeklyReportWrapper(saved);
      state.weeklyReports.weekEnding = state.weeklyReports.current.report.week_ending || "";
      const history = await api("/api/weekly-reports/mine");
      state.weeklyReports.history = Array.isArray(history.reports) ? history.reports : [];
      setTasksMessage(String(report.status || "").toLowerCase() === "revision_required"
        ? "Revised weekly report resubmitted for review."
        : "Weekly report submitted for review.", "success");
      renderTasksView();
    } catch (error) {
      const blockers = Array.isArray(error.details?.blockers) ? ` ${error.details.blockers.join(" ")}` : "";
      setTasksMessage(`${error.message || "Unable to submit weekly report."}${blockers}`, "error");
    } finally {
      state.weeklyReports.actionPending = false;
    }
  });
}

function bindWeeklyReviewEventsLegacy() {
  els.tasksSidebar.querySelectorAll("[data-weekly-open-id]").forEach(button => {
    button.addEventListener("click", async () => {
      setTasksMessage("Loading weekly report detail…");
      try {
        await loadWeeklyReportReviewDetail(button.dataset.weeklyOpenId);
        setTasksMessage("");
        renderTasksView();
      } catch (error) {
        setTasksMessage(error.message || "Unable to open the weekly report.", "error");
      }
    });
  });

  els.tasksPrimary.querySelectorAll("[data-weekly-review-action]").forEach(button => {
    button.addEventListener("click", async () => {
      if (!state.weeklyReports.selectedId) return;
      const note = els.tasksPrimary.querySelector("#weeklyReviewNote")?.value || "";
      setTasksMessage("Saving review decision…");
      try {
        await api(`/api/weekly-reports/${encodeURIComponent(state.weeklyReports.selectedId)}/review`, {
          method: "POST",
          body: JSON.stringify({
            action: button.dataset.weeklyReviewAction,
            note
          })
        });
        setTasksMessage("Weekly report review updated.", "success");
        await loadWeeklyReportWorkspace(true);
      } catch (error) {
        setTasksMessage(error.message || "Unable to update the weekly report review.", "error");
      }
    });
  });
}

function bindWeeklyReviewEvents() {
  const weekInput = els.tasksSidebar.querySelector("#weeklyAdminWeekEnding");
  const loadWeekButton = els.tasksSidebar.querySelector("#weeklyAdminLoadWeek");
  const loadSelectedWeek = async () => {
    const weekEnding = String(weekInput?.value || "").trim();
    if (!weekEnding || state.weeklyReports.actionPending) return;
    state.weeklyReports.weekEnding = weekEnding;
    state.weeklyReports.selectedId = "";
    state.weeklyReports.selectedReport = null;
    await loadWeeklyReportWorkspace(true);
  };
  loadWeekButton?.addEventListener("click", () => {
    loadSelectedWeek().catch(error => setTasksMessage(error.message || "Unable to load the selected reporting week.", "error"));
  });
  weekInput?.addEventListener("change", () => {
    loadSelectedWeek().catch(error => setTasksMessage(error.message || "Unable to load the selected reporting week.", "error"));
  });

  els.tasksSidebar.querySelectorAll("[data-weekly-open-id]").forEach(button => {
    button.addEventListener("click", async () => {
      if (state.weeklyReports.actionPending) return;
      state.weeklyReports.actionPending = true;
      setTasksMessage("Loading weekly report detail...");
      try {
        await loadWeeklyReportReviewDetail(button.dataset.weeklyOpenId);
        setTasksMessage("");
        renderTasksView();
      } catch (error) {
        setTasksMessage(error.message || "Unable to open the weekly report.", "error");
      } finally {
        state.weeklyReports.actionPending = false;
      }
    });
  });

  els.tasksPrimary.querySelectorAll("[data-weekly-version-number]").forEach(button => {
    button.addEventListener("click", async () => {
      if (!state.weeklyReports.selectedId || state.weeklyReports.actionPending) return;
      state.weeklyReports.actionPending = true;
      setTasksMessage(`Loading submitted version ${button.dataset.weeklyVersionNumber}...`);
      try {
        const detail = await api(`/api/admin/weekly-reports/${encodeURIComponent(state.weeklyReports.selectedId)}?version=${encodeURIComponent(button.dataset.weeklyVersionNumber)}`);
        state.weeklyReports.selectedReport = normalizeWeeklyReportWrapper(detail);
        setTasksMessage("");
        renderTasksView();
      } catch (error) {
        setTasksMessage(error.message || "Unable to open the submitted version.", "error");
      } finally {
        state.weeklyReports.actionPending = false;
      }
    });
  });

  els.tasksPrimary.querySelectorAll("[data-weekly-review-action]").forEach(button => {
    button.addEventListener("click", async () => {
      if (!state.weeklyReports.selectedId || state.weeklyReports.actionPending) return;
      const action = button.dataset.weeklyReviewAction;
      const note = String(els.tasksPrimary.querySelector("#weeklyReviewNote")?.value || "").trim();
      const versionId = String(state.weeklyReports.selectedReport?.report?.current_version_id || "").trim();
      const endpoint = {
        under_review: "start-review",
        accepted: "accept",
        rejected: "reject",
        revision_required: "request-revision"
      }[action];
      if (!endpoint || !versionId) {
        setTasksMessage("Reload the report before applying a review decision.", "error");
        return;
      }
      if (["rejected", "revision_required"].includes(action) && !note) {
        setTasksMessage(action === "rejected"
          ? "Add a rejection reason before rejecting this report."
          : "Add a revision note before returning this report.", "error");
        els.tasksPrimary.querySelector("#weeklyReviewNote")?.focus();
        return;
      }

      state.weeklyReports.actionPending = true;
      setTasksMessage("Saving review decision...");
      try {
        const updated = await api(`/api/admin/weekly-reports/${encodeURIComponent(state.weeklyReports.selectedId)}/${endpoint}`, {
          method: "POST",
          headers: { "Idempotency-Key": `review-${state.weeklyReports.selectedId}-${versionId}-${action}` },
          body: JSON.stringify({
            version_id: versionId,
            note
          })
        });
        state.weeklyReports.selectedReport = normalizeWeeklyReportWrapper(updated);
        setTasksMessage("Weekly report review updated.", "success");
        await loadWeeklyReportWorkspace(true);
      } catch (error) {
        const staleCopy = Number(error.status) === 409
          ? " Reload the report to review its latest submitted version."
          : "";
        setTasksMessage(`${error.message || "Unable to update the weekly report review."}${staleCopy}`, "error");
      } finally {
        state.weeklyReports.actionPending = false;
      }
    });
  });
}

function renderActivityCalendarVisibility() {
  const admin = state.currentUser?.role === "admin" || state.currentUser?.role === "manager";
  const minimized = admin && state.activityCalendarMinimized;
  if (els.activityCalendarToggle) {
    els.activityCalendarToggle.classList.toggle("hidden", !admin);
    els.activityCalendarToggle.textContent = minimized ? "Expand" : "Minimize";
    els.activityCalendarToggle.setAttribute("aria-expanded", String(!minimized));
    els.activityCalendarToggle.setAttribute("aria-label", `${minimized ? "Expand" : "Minimize"} weekly calendar`);
  }
  if (els.activityWeeklyLog) {
    els.activityWeeklyLog.hidden = minimized;
    els.activityWeeklyLog.closest(".activity-weekly-card")?.classList.toggle("is-minimized", minimized);
  }
}

function renderActivityView() {
  renderActivityCalendarVisibility();
  const activities = state.activities || [];
  const canReviewDeletions = ["admin", "manager", "director"].includes(String(state.currentUser?.role || "").toLowerCase());
  els.openActivityDeletionQueue?.classList.toggle("hidden", !canReviewDeletions);
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
  const emptyHtml = `
    <div class="timeline-empty">
      <strong>No activities match your current filters.</strong>
      <span>Try another salesman, date range, activity type, or company search.</span>
      <button class="ghost-button" type="button" data-reset-activity-empty>Reset Filters</button>
    </div>
  `;
  els.activityFeed.innerHTML = state.activityLoading ? "" : (activities.length ? activityTableMarkup(activities) : emptyHtml);

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
  els.activityFeed.querySelectorAll("[data-activity-page]").forEach(button => {
    button.addEventListener("click", () => {
      state.activityPage = Number(button.dataset.activityPage) || 1;
      renderActivityView();
      els.activityFeed.scrollIntoView({ block: "nearest" });
    });
  });
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
    `<option value="${escapeHtml(stage)}" ${stage === lead.stage ? "selected" : ""}>${escapeHtml(stageDisplayLabel(stage))}</option>`
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
  if (state.currentUser && !isSalesmanRole() && (currentView === "focus" || currentView === "neglected" && !isPrivilegedDashboardRole())) currentView = "ai-actions";
  document.querySelector("#aiAssistantLauncher")?.classList.toggle("hidden", !state.currentUser);
  renderMetrics();
  renderOverdueBanner();
  // Funnel analytics remain available for Dashboard and their planned
  // Salesmen-page relocation; the Pipeline workspace is worklist-first.
  renderSidebarIdentity();
  renderTopbar();
  renderSmartSearch();
  renderDashboardView();
  renderLeadList();
  renderDetail();
  renderLeadDrawer();
  renderSalesmenView();
  renderSalesmanLeadsViewer();
  renderTasksView();
  renderActivityView();
  renderAiWorkspace();
  renderPipelineFilterNotice();
  loadActivityAudioSources();
  applyView();
  syncDashboardCollapsibles();
  renderSyncStatus();
}

function arrangeAssistantLauncher(isTasks) {
  const launcher = document.querySelector("#aiAssistantLauncher");
  const host = currentView === "lead"
    ? (state.leadDrawerTab === "overview" ? document.querySelector(".record-overview-assistant-host") : null) || document.querySelector(".record-assistant-host") || document.body
    : currentView === "meeting-prep" ? document.querySelector(".meeting-assistant-host") || document.body
    : currentView === "draft-email" ? document.querySelector(".email-assistant-host") || document.body
    : currentView === "ai-actions" ? document.querySelector(".crm-onetap-assistant-host") || document.body
    : currentView === "dashboard" && isSalesmanRole() ? document.querySelector(".salesperson-dashboard-assistant-host") || document.body
    : currentView === "neglected" ? document.querySelector(".neglected-assistant-host") || document.body
    : isTasks ? document.querySelector("#appShell .topbar-actions") : document.body;
  if (launcher && host && launcher.parentElement !== host) host.appendChild(launcher);
}

window.matchMedia("(min-width: 1025px)").addEventListener("change", () => {
  if (currentView === "lead") {
    arrangeMobileLeadOverview();
    applyView();
  }
});

function arrangeLeadRecordControls() {
  const topbar = document.querySelector("#appShell .topbar");
  const actions = document.querySelector("#appShell .topbar-actions");
  const recordSearchHost = currentView === "lead" && window.matchMedia("(min-width: 1025px)").matches ? document.querySelector(".record-search-host") : null;
  if (actions && (recordSearchHost || topbar)) (recordSearchHost || topbar).appendChild(actions);
}

function applyView() {
  arrangeLeadRecordControls();
  if (isSalesmanRole() && ["salesmen", "activity"].includes(currentView)) {
    currentView = "dashboard";
  }
  if (!isSalesmanRole() && (currentView === "focus" || currentView === "neglected" && !isPrivilegedDashboardRole())) currentView = "ai-actions";
  const isDashboard = currentView === "dashboard";
  const isPipeline = currentView === "pipeline";
  const isActivity = currentView === "activity";
  const isTasks = currentView === "tasks";
  const isLead = currentView === "lead";
  const isAiWorkspace = Boolean(aiWorkspacePage());
  const showMetricsShell = isPipeline || (isDashboard && !isSalesmanRole());
  els.metricsShell?.classList.toggle("hidden", !showMetricsShell);
  els.dashboardView.classList.toggle("hidden", !isDashboard);
  els.pipelineWorkspace?.classList.toggle("hidden", !isPipeline);
  els.pipelineWorkspace?.classList.toggle("pipeline-workspace-list", isPipeline);
  els.pipelineWorkspace?.classList.remove("pipeline-workspace-kanban");
  els.pipelineView.classList.toggle("hidden", !isPipeline);
  els.pipelineView?.classList.remove("kanban-mode");
  els.pipelineView?.classList.toggle("detail-routed", isPipeline);
  els.pipelineListPanel?.classList.toggle("hidden", !isPipeline);
  els.kanbanPanel?.classList.add("hidden");
  els.detailPanel?.classList.toggle("hidden", true);
  els.leadDetailView?.classList.toggle("hidden", !isLead);
  els.salesmenView.classList.toggle("hidden", currentView !== "salesmen");
  els.tasksView?.classList.toggle("hidden", !isTasks);
  document.querySelector("#aiWorkspaceView")?.classList.toggle("hidden", !isAiWorkspace);
  document.querySelectorAll("[data-ai-portfolio-nav]").forEach(item => item.classList.toggle("hidden", !isSalesmanRole() && !(item.dataset.view === "neglected" && isPrivilegedDashboardRole())));
  document.querySelector('#mobileSidebar [data-view="ai-actions"]')?.classList.remove("hidden");
  els.activityView.classList.toggle("hidden", currentView !== "activity");
  document.querySelectorAll(".nav-item").forEach(item => {
    const navigationView = currentView === "lead" || currentView === "meeting-prep" && state.meetingRouteLeadId ? "pipeline" : currentView === "neglected" ? "dashboard" : isSalesmanRole() && isAiWorkspace && !["focus", "neglected"].includes(currentView) ? "dashboard"
      : isAiWorkspace && !["focus", "neglected"].includes(currentView) ? "ai-actions" : currentView;
    item.classList.toggle("active", item.dataset.view === navigationView && !item.dataset.mobileAction);
  });
  els.syncStatusPill?.classList.toggle("activity-hidden", isActivity);
  document.body.classList.toggle("activity-mode", isActivity);
  document.body.classList.toggle("activity-admin-mode", Boolean(isActivity && !isSalesmanRole()));
  document.body.classList.toggle("pipeline-compact-mode", isPipeline);
  document.body.classList.toggle("pipeline-admin-mode", Boolean(isPipeline && !isSalesmanRole()));
  document.body.classList.toggle("pipeline-salesman-mode", Boolean(isPipeline && isSalesmanRole()));
  document.body.classList.toggle("salesmen-mode", currentView === "salesmen" && state.currentUser?.role === "admin");
  document.body.classList.toggle("salesman-dashboard-mode", Boolean(isDashboard && isSalesmanRole()));
  document.body.classList.toggle("admin-dashboard-mode", Boolean(isDashboard && !isSalesmanRole()));
  document.body.classList.toggle("tasks-mode", isTasks);
  document.body.classList.toggle("admin-tasks-mode", Boolean(isTasks && !isSalesmanRole()));
  document.body.classList.toggle("lead-detail-mode", isLead);
  document.body.classList.toggle("ai-workspace-mode", isAiWorkspace);
  document.body.classList.toggle("one-tap-mode", currentView === "ai-actions");
  document.body.classList.toggle("meeting-brief-mode", currentView === "meeting-prep");
  document.body.classList.toggle("lead-meeting-mode", currentView === "meeting-prep" && Boolean(state.meetingRouteLeadId));
  document.body.classList.toggle("email-draft-mode", currentView === "draft-email");
  document.body.classList.toggle("today-mode", currentView === "focus" && isSalesmanRole());
  document.body.classList.toggle("neglected-mode", currentView === "neglected" && (isSalesmanRole() || isPrivilegedDashboardRole()));
  document.body.classList.toggle("neglected-tools-open", currentView === "neglected" && isSalesmanRole() && neglectedToolsOpen);
  arrangeAssistantLauncher(isTasks || (["focus", "neglected", "pipeline"].includes(currentView) && isSalesmanRole()));
  arrangeAdminDashboardLayout();
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
  if (view !== "draft-email") state.emailRouteLeadId = "";
  if (view !== "meeting-prep") state.meetingRouteLeadId = "";
  if (isSalesmanRole() && ["salesmen", "activity"].includes(view)) view = "dashboard";
  if (!isSalesmanRole() && (view === "focus" || view === "neglected" && !isPrivilegedDashboardRole())) view = "ai-actions";
  if (view !== "lead" && !(view === "draft-email" && state.emailRouteLeadId) && !(view === "meeting-prep" && state.meetingRouteLeadId)) state.lastNonLeadView = view;
  currentView = view;
  state.leadDrawerOpen = view === "lead";
  syncBrowserRoute({ replace: false });
  closeMobileMenu();
  render();
  if (view === "tasks") {
    loadWeeklyReportWorkspace(true).catch(error => setTasksMessage(error.message, "error"));
  }
}

async function loadLeads(options = {}) {
  if (!options.authInitialized) await authInitialization;
  if (!state.currentUser || !sessionToken()) {
    throw Object.assign(new Error("Please sign in to load your CRM records."), { status: 401 });
  }
  state.leadsLoading = true;
  state.leadsError = "";
  if (currentView === "pipeline") renderLeadList();
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
  } catch (error) {
    if ([401, 403].includes(Number(error?.status))) state.leads = [];
    state.leadsError = error?.message || "The CRM records could not be loaded.";
    if (currentView === "pipeline") renderLeadList();
    throw error;
  } finally {
    state.leadsLoading = false;
    if (currentView === "pipeline") renderLeadList();
    if (els.summaryCardDetailsDialog?.open) renderSummaryCardDetailsResults();
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

async function fetchMarketNews() {
  state.marketNews = {
    ...state.marketNews,
    loading: true,
    error: ""
  };
  if (currentView === "dashboard") renderSalesmanDashboard();
  try {
    const payload = await api("/api/market-news");
    state.marketNews = {
      items: payload.items || [],
      disabled: Boolean(payload.disabled),
      loading: false,
      error: "",
      reason: payload.reason || "",
      fetched_at: payload.fetched_at || ""
    };
  } catch (error) {
    state.marketNews = {
      items: [],
      disabled: false,
      loading: false,
      error: error.message || "Unable to load market news.",
      reason: "",
      fetched_at: ""
    };
  }
  if (currentView === "dashboard") renderSalesmanDashboard();
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
  if (els.summaryCardDetailsDialog?.open) els.summaryCardDetailsDialog.close();
  if (els.activityDialog?.open) closeActivityModal({ force: true });
  document.body.classList.remove("summary-details-modal-open");
  document.body.classList.remove("activity-modal-open");
  state.currentUser = null;
  state.userAccounts = [];
  state.marketNews = { items: [], disabled: false, loading: false, error: "", reason: "", fetched_at: "" };
  state.leadsLoaded = false;
  state.leadsLoading = false;
  state.leadsError = "";
  state.summaryCardDetails = {
    type: "",
    search: "",
    filters: {},
    sortKey: "",
    sortDirection: "asc",
    page: 1,
    pageSize: SUMMARY_DETAILS_DEFAULT_PAGE_SIZE,
    trigger: null
  };
  state.overduePipelineOnly = false;
  state.dueTodayPipelineOnly = false;
  if (overdueRefreshTimer) {
    clearInterval(overdueRefreshTimer);
    overdueRefreshTimer = null;
  }
  els.loginMessage.textContent = message;
  els.authScreen.classList.remove("hidden");
  els.appShell.classList.add("hidden");
  els.mobileTabs?.classList.add("hidden");
  els.overdueBanner?.classList.add("hidden");
  els.overduePipelineFilter?.classList.add("hidden");
  els.installBanner?.classList.add("hidden");
  els.updateBanner?.classList.add("hidden");
  els.syncStatusPill?.classList.add("hidden");
  document.querySelector("#aiAssistantLauncher")?.classList.add("hidden");
  const aiDialog = document.querySelector("#aiAssistantDialog");
  if (aiDialog?.open) aiDialog.close();
  document.body.classList.remove("ai-assistant-open");
}

function configureRoleUi(user) {
  const role = normalizeRoleValue(user?.role);
  const admin = role === "admin";
  document.body.classList.toggle("admin-shell", admin);
  const salesman = role === "salesman";
  const privileged = !salesman;
  if (salesman) {
    state.dashboardToolsOpen = false;
    state.dashboardPerformanceOpen = false;
    state.dashboardMarketNewsOpen = false;
    state.agentOpen = false;
    localStorage.setItem(DASHBOARD_TOOLS_KEY, "false");
    localStorage.setItem(DASHBOARD_PERFORMANCE_KEY, "false");
    localStorage.setItem(DASHBOARD_MARKET_NEWS_KEY, "false");
    localStorage.setItem(DASHBOARD_AGENT_KEY, "false");
  }
  document.querySelectorAll('.sidebar [data-view="salesmen"]').forEach(item => {
    item.classList.toggle("hidden", !privileged);
  });
  document.querySelectorAll('.sidebar [data-view="activity"]').forEach(item => {
    item.classList.toggle("hidden", salesman);
  });
  els.sidebarToolsMenu?.classList.toggle("hidden", salesman);
  els.sidebarSearchPlaces?.classList.toggle("hidden", salesman);
  els.openPlacesSearch?.classList.toggle("hidden", salesman);
  els.salesmanFilter?.closest("label")?.classList.toggle("hidden", !privileged);
  els.formSalesman?.closest("label")?.classList.toggle("hidden", !privileged);
  els.openSalesmanForm.classList.toggle("hidden", !admin);
  els.exportLeadsExcel?.classList.toggle("hidden", !admin);
  els.exportLeadsPdf?.classList.toggle("hidden", !admin);
  els.exportLeadsExcelTop?.classList.toggle("hidden", !admin);
  els.exportLeadsPdfTop?.classList.toggle("hidden", !admin);
  els.openImportLeads?.classList.toggle("hidden", !admin);
  els.performancePanel?.classList.toggle("hidden", !privileged);
  els.adminTaskPanel?.classList.toggle("hidden", !privileged);
  els.needsAttentionPanel?.classList.toggle("hidden", !privileged);
  els.dashboardPipelineFunnelPanel?.classList.toggle("hidden", salesman);
  els.dashboardQuickActions?.classList.toggle("hidden", privileged);
  els.dailyAiPanel?.classList.toggle("hidden", privileged);
  els.salesmanLossPromptPanel?.classList.toggle("hidden", privileged);
  els.salesmanDashboardToolsPanel?.classList.toggle("hidden", privileged);
  els.marketNewsPanel?.classList.toggle("hidden", privileged);
  els.dashboardToggleMarketNews?.classList.toggle("hidden", privileged);
  els.salesmanFollowupPanel?.classList.toggle("hidden", privileged);
  els.portfolioPanel?.classList.toggle("hidden", privileged);
  els.salesmanDashboardToggleShell?.classList.toggle("hidden", privileged);
  els.dashboardActivityPanel?.classList.toggle("hidden", !privileged);
  els.relationshipFocusPanel?.classList.toggle("hidden", !privileged);
  els.pipelineHealthPanel?.classList.toggle("hidden", !privileged);
  els.configAgentPanel?.classList.toggle("hidden", !privileged);
  renderHeaderSummary();
  renderConfigAgentPanel();
  if (salesman) {
    state.filters.salesman = "all";
    if (["salesmen", "activity"].includes(currentView)) currentView = "dashboard";
  }
}

function showApp(user) {
  state.currentUser = user;
  applyRouteState(window.history.state || parseAppRoute(), { keepReturnView: true });
  els.signedInUser.textContent = `${user.name} · ${user.role}`;
  configureRoleUi(user);
  els.authScreen.classList.add("hidden");
  els.appShell.classList.remove("hidden");
  els.mobileTabs?.classList.remove("hidden");
  document.querySelector("#aiAssistantLauncher")?.classList.remove("hidden");
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
  const marketNewsPromise = !isSalesmanRole()
    ? Promise.resolve()
    : fetchMarketNews();
  fillSelect(els.performanceStageFilter, state.settings.stages, "All Stages");
  els.performanceStageFilter.value = state.performanceStage;
  fillSelect(els.marketSnapshotSalesmanFilter, state.settings.salesmen || [], "All salesmen");
  if (els.marketSnapshotSalesmanFilter) els.marketSnapshotSalesmanFilter.value = state.marketSnapshotSalesman || "all";
  fillSelect(els.portfolioStageFilter, state.settings.stages, "All Stages");
  els.portfolioReportView.value = state.portfolioFilters.reportView;
  els.portfolioStageFilter.value = state.portfolioFilters.stage;
  els.portfolioCountryFilter.value = state.portfolioFilters.country;
  els.portfolioEmirateFilter.value = state.portfolioFilters.emirate;
  fillSelect(els.formSalesman, state.settings.salesmen);
  if (!isAdminOrManager()) {
    els.formSalesman.value = state.currentUser.name;
  }
  fillSelect(els.formStage, state.settings.stages);
  [els.formStage, els.performanceStageFilter, els.portfolioStageFilter].forEach(select => {
    if (!select) return;
    [...select.options].forEach(option => {
      const label = STAGE_DISPLAY_LABELS[normalizeStageKey(option.value, "")];
      if (label) option.textContent = label;
    });
  });
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
  await loadLeads({ authInitialized: true });
  await loadWeeklyReportWorkspace();
  await marketNewsPromise;
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
    clearSession();
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

els.smartSearchInput?.addEventListener("focus", () => {
  if (state.smartSearch.query.trim()) {
    state.smartSearch.open = true;
    renderSmartSearch();
  }
});

els.smartSearchInput?.addEventListener("input", event => {
  queueSmartSearch(event.target.value);
});

els.smartSearchInput?.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    openSmartSearchFullResults();
  }
  if (event.key === "Escape") {
    event.preventDefault();
    closeSmartSearch();
    els.smartSearchInput.blur();
  }
});

els.smartSearchPanel?.addEventListener("click", event => {
  const expand = event.target.closest("[data-smart-search-expand]");
  if (expand) {
    openSmartSearchFullResults();
    return;
  }
  const trigger = event.target.closest("[data-smart-search-kind]");
  if (!trigger) return;
  const kind = trigger.dataset.smartSearchKind;
  if (kind === "lead" && trigger.dataset.smartSearchLead) {
    closeSmartSearch();
    state.selectedId = trigger.dataset.smartSearchLead;
    openLeadDrawer(trigger.dataset.smartSearchLead, "overview");
    return;
  }
  const url = trigger.dataset.smartSearchUrl;
  if (url) {
    window.open(url, "_blank", "noopener");
    closeSmartSearch();
  }
});

document.addEventListener("click", event => {
  if (!els.smartSearchShell || !state.smartSearch.open) return;
  if (els.smartSearchShell.contains(event.target)) return;
  closeSmartSearch();
});

els.performanceStageFilter?.addEventListener("change", event => {
  state.performanceStage = event.target.value;
  state.salesmenDirectory.page = 1;
  if (currentView === "salesmen") renderSalesmenManagementDashboard();
});

els.applySalesmenFilters?.addEventListener("click", applySalesmenDirectoryFilters);
els.clearSalesmenFilters?.addEventListener("click", clearSalesmenDirectoryFilters);
els.exportSalesmenDirectory?.addEventListener("click", exportSalesmenDirectoryCsv);
els.salesmenSearch?.addEventListener("keydown", event => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  applySalesmenDirectoryFilters();
});
document.querySelectorAll("[data-salesmen-view]").forEach(button => {
  button.addEventListener("click", () => {
    state.salesmenDirectory.view = button.dataset.salesmenView === "cards" ? "cards" : "list";
    state.salesmenDirectory.page = 1;
    renderSalesmenManagementDashboard();
  });
});

els.marketSnapshotSalesmanFilter?.addEventListener("change", event => {
  state.marketSnapshotSalesman = event.target.value;
  renderMarketSnapshotPanel();
  renderDashboardPipelineFunnel();
});

els.marketSnapshotPanel?.addEventListener("click", event => {
  const tab = event.target.closest("[data-market-snapshot-tab]");
  if (!tab) return;
  state.marketSnapshotTab = tab.dataset.marketSnapshotTab === "sector" ? "sector" : "location";
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

els.clearOverdueFilter?.addEventListener("click", () => {
  state.overduePipelineOnly = false;
  state.dueTodayPipelineOnly = false;
  state.pipelineTable.page = 1;
  render();
});

els.clearPipelineFilters?.addEventListener("click", () => {
  resetPipelineFilters();
  render();
});

els.refreshPipelineLeads?.addEventListener("click", () => {
  loadLeads().catch(error => setToast(error.message, "error"));
});

function updatePipelineReportDate(filter, input) {
  const previous = state.pipelineTable[filter];
  state.pipelineTable[filter] = input.value;
  const invalid = state.pipelineTable.dateFrom
    && state.pipelineTable.dateTo
    && state.pipelineTable.dateFrom > state.pipelineTable.dateTo;
  if (invalid) {
    state.pipelineTable[filter] = previous;
    input.value = previous;
    input.setCustomValidity("From date must be on or before To date.");
    input.reportValidity();
    input.setCustomValidity("");
    return;
  }
  state.pipelineTable.page = 1;
  state.importedAfter = "";
  renderLeadList();
}

els.pipelineReportDateFrom?.addEventListener("change", event => {
  updatePipelineReportDate("dateFrom", event.currentTarget);
});

els.pipelineReportDateTo?.addEventListener("change", event => {
  updatePipelineReportDate("dateTo", event.currentTarget);
});

els.exportPipelineExcel?.addEventListener("click", () => exportPipelineReport("xls"));
els.exportPipelinePdf?.addEventListener("click", () => exportPipelineReport("pdf"));

els.pipelinePagination?.addEventListener("click", event => {
  const button = event.target.closest("[data-pipeline-page]");
  if (!button || button.disabled) return;
  state.pipelineTable.page = Number(button.dataset.pipelinePage) || 1;
  renderLeadList();
  els.pipelineListPanel?.scrollIntoView({ block: "start", behavior: "smooth" });
});

els.pipelinePagination?.addEventListener("change", event => {
  const select = event.target.closest("[data-pipeline-page-size]");
  if (!select) return;
  state.pipelineTable.pageSize = Number(select.value) || 10;
  state.pipelineTable.page = 1;
  renderLeadList();
});

window.matchMedia("(min-width: 1025px) and (min-height: 600px)").addEventListener?.("change", () => {
  if (currentView === "pipeline") render();
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

els.metricsPanel?.addEventListener("click", event => {
  const card = event.target.closest("[data-summary-card]");
  if (!card) return;
  openSummaryCardDetails(card.dataset.summaryCard, card);
});

els.metricsPanel?.addEventListener("keydown", event => {
  const card = event.target.closest("[data-summary-card]");
  if (!card || !["Enter", " "].includes(event.key)) return;
  event.preventDefault();
  openSummaryCardDetails(card.dataset.summaryCard, card);
});

els.salesmanSimplifiedDashboard?.addEventListener("click", event => {
  const card = event.target.closest("[data-summary-card]");
  if (!card) return;
  openSummaryCardDetails(card.dataset.summaryCard, card);
});

els.salesmanSimplifiedDashboard?.addEventListener("click", async event => {
  const button = event.target.closest("button");
  if (!button || button.disabled || !isSalesmanRole()) return;
  if (button.hasAttribute("data-dashboard-search")) {
    const expanded = document.body.classList.toggle("salesperson-dashboard-search-open");
    button.setAttribute("aria-expanded", String(expanded));
    if (expanded) els.smartSearchInput?.focus();
    return;
  }
  if (button.hasAttribute("data-dashboard-stages")) {
    const breakdown = document.querySelector("#salespersonPipelineBreakdown");
    breakdown.open = !breakdown.open;
    button.setAttribute("aria-expanded", String(breakdown.open));
    return;
  }
  if (button.hasAttribute("data-dashboard-alerts")) { openPendingChanges(); return; }
  if (button.id === "aiAssistantLauncher") {
    const input = document.querySelector("#salespersonDashboardQuestion");
    aiAssistantElements().command.value = input.value.trim();
    input.value = "";
    return;
  }
  if (button.hasAttribute("data-dashboard-refresh")) {
    const label = button.textContent;
    button.disabled = true;
    button.textContent = "Refreshing...";
    try { await loadLeads(); render(); }
    catch { setToast("Could not refresh your accounts. Try again.", "error"); }
    finally { button.disabled = false; button.textContent = label; }
  } else if (button.hasAttribute("data-dashboard-portfolio")) {
    if (button.dataset.dashboardPortfolio === "neglected") { setView("neglected"); return; }
    await runSalespersonAiAction(button.dataset.dashboardPortfolio);
    renderSalesmanSimplifiedDashboard();
  } else if (button.hasAttribute("data-dashboard-ai-all")) setView("ai-actions");
  else if (button.hasAttribute("data-dashboard-today")) setView("focus");
  else if (button.hasAttribute("data-dashboard-focus-open")) openLeadDrawer(button.dataset.dashboardFocusOpen);
  else if (button.hasAttribute("data-dashboard-focus-log")) {
    const lead = salesmanDashboardLeads().find(item => String(item.id) === button.dataset.dashboardFocusLog);
    if (lead) openActivityModal(lead.id, button);
  }
  else if (button.hasAttribute("data-dashboard-email")) {
    const lead = salesmanDashboardLeads().find(item => String(item.id) === button.dataset.dashboardEmail);
    if (lead) runLeadAiAction(lead, "email");
  }
});

document.querySelector(".salesperson-dashboard-assistant")?.addEventListener("submit", event => {
  event.preventDefault();
  if (!isSalesmanRole()) return;
  const input = document.querySelector("#salespersonDashboardQuestion");
  aiAssistantElements().command.value = input.value.trim();
  openAiAssistant();
  input.value = "";
});

els.closeSummaryCardDetails?.addEventListener("click", () => closeSummaryCardDetails());
els.summaryCardDetailsDialog?.addEventListener("click", event => {
  if (event.target === els.summaryCardDetailsDialog) {
    closeSummaryCardDetails();
    return;
  }
  const reset = event.target.closest("[data-summary-details-reset]");
  if (reset) {
    state.summaryCardDetails.search = "";
    state.summaryCardDetails.filters = {};
    state.summaryCardDetails.page = 1;
    renderSummaryCardDetailsModal();
    requestAnimationFrame(() => els.summaryCardDetailsFilters?.querySelector("[data-summary-details-search]")?.focus());
    return;
  }
  const pageButton = event.target.closest("[data-summary-details-page]");
  if (pageButton && !pageButton.disabled) {
    state.summaryCardDetails.page = Number(pageButton.dataset.summaryDetailsPage || 1);
    renderSummaryCardDetailsResults();
    els.summaryCardDetailsTableWrap?.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  const sortButton = event.target.closest("[data-summary-details-sort]");
  if (sortButton) {
    const key = sortButton.dataset.summaryDetailsSort;
    state.summaryCardDetails.sortDirection = state.summaryCardDetails.sortKey === key
      && state.summaryCardDetails.sortDirection === "asc" ? "desc" : "asc";
    state.summaryCardDetails.sortKey = key;
    state.summaryCardDetails.page = 1;
    renderSummaryCardDetailsResults();
    return;
  }
  if (event.target.closest("[data-summary-details-open-full]")) {
    openSummaryDetailsFullList();
    return;
  }
  if (event.target.closest("[data-summary-details-retry]")) {
    state.leadsError = "";
    loadLeads().catch(error => {
      state.leadsError = error?.message || "The CRM records could not be loaded.";
      renderSummaryCardDetailsResults();
    });
    renderSummaryCardDetailsResults();
    return;
  }
  const row = event.target.closest("[data-summary-details-lead]");
  if (!row || event.target.closest("a, button, input, select")) return;
  const leadId = row.dataset.summaryDetailsLead;
  closeSummaryCardDetails({ restoreFocus: false });
  openLeadDrawer(leadId);
  render();
});

els.summaryCardDetailsDialog?.addEventListener("input", event => {
  let refocusFilter = "";
  if (event.target.matches("[data-summary-details-search]")) {
    state.summaryCardDetails.search = event.target.value;
  } else if (event.target.matches('[data-summary-details-filter][type="search"]')) {
    const key = event.target.dataset.summaryDetailsFilter;
    state.summaryCardDetails.filters = { ...state.summaryCardDetails.filters, [key]: event.target.value };
    refocusFilter = key;
  } else {
    return;
  }
  state.summaryCardDetails.page = 1;
  renderSummaryCardDetailsResults();
  if (refocusFilter) {
    requestAnimationFrame(() => {
      const replacement = els.summaryCardDetailsTableWrap?.querySelector(`[data-summary-details-filter="${CSS.escape(refocusFilter)}"]`);
      replacement?.focus();
      if (typeof replacement?.setSelectionRange === "function") {
        const end = replacement.value.length;
        replacement.setSelectionRange(end, end);
      }
    });
  }
});

els.summaryCardDetailsDialog?.addEventListener("change", event => {
  if (event.target.matches("[data-summary-details-page-size]")) {
    state.summaryCardDetails.pageSize = Number(event.target.value || SUMMARY_DETAILS_DEFAULT_PAGE_SIZE);
    state.summaryCardDetails.page = 1;
    renderSummaryCardDetailsResults();
    return;
  }
  const key = event.target.dataset.summaryDetailsFilter;
  if (!key) return;
  state.summaryCardDetails.filters = { ...state.summaryCardDetails.filters, [key]: event.target.value };
  state.summaryCardDetails.page = 1;
  renderSummaryCardDetailsResults();
});

els.summaryCardDetailsDialog?.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    event.preventDefault();
    closeSummaryCardDetails();
    return;
  }
  const row = event.target.closest("[data-summary-details-lead]");
  if (row && ["Enter", " "].includes(event.key)) {
    event.preventDefault();
    const leadId = row.dataset.summaryDetailsLead;
    closeSummaryCardDetails({ restoreFocus: false });
    openLeadDrawer(leadId);
    render();
    return;
  }
  trapSummaryCardDetailsFocus(event);
});

els.summaryCardDetailsDialog?.addEventListener("cancel", event => {
  event.preventDefault();
  closeSummaryCardDetails();
});

els.summaryCardDetailsDialog?.addEventListener("close", () => cleanupSummaryCardDetailsModal());

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
els.activityCalendarToggle?.addEventListener("click", () => {
  if (state.currentUser?.role !== "admin" && state.currentUser?.role !== "manager") return;
  state.activityCalendarMinimized = !state.activityCalendarMinimized;
  renderActivityCalendarVisibility();
});
els.activityNextWeek?.addEventListener("click", () => {
  state.activityWeekAnchor = isoDateFromDate(addDays(dateOnly(state.activityWeekAnchor), 7));
  renderActivityView();
  renderTopbar();
});
els.leadDrawerBackdrop?.addEventListener("click", closeLeadDrawer);
document.addEventListener("keydown", event => {
  if (event.defaultPrevented || document.querySelector("dialog[open]")) return;
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

function openNewLeadForm() {
  resetLeadFormForNewLead();
  els.leadDialog.showModal();
}

document.querySelector("#openLeadForm")?.addEventListener("click", openNewLeadForm);
els.salesmanSimplifiedAddLead?.addEventListener("click", openNewLeadForm);
document.querySelector("#closeLeadForm").addEventListener("click", () => {
  state.editingLeadId = "";
  state.editingOriginalStage = "";
  state.editingLostData = null;
  resetLeadEnrichmentSession();
  els.leadDialog.close();
});
els.leadStepper?.addEventListener("click", event => {
  const button = event.target.closest("[data-lead-step]");
  if (!button) return;
  const nextStep = Number(button.dataset.leadStep || 0);
  if (nextStep > state.leadFormStep && !validateLeadStep(state.leadFormStep)) return;
  setLeadFormStep(nextStep);
});
els.leadStepBack?.addEventListener("click", () => {
  setLeadFormStep(state.leadFormStep - 1);
});
els.leadStepNext?.addEventListener("click", () => {
  if (!validateLeadStep(state.leadFormStep)) return;
  setLeadFormStep(state.leadFormStep + 1);
});
els.leadForm?.addEventListener("click", event => {
  const toggle = event.target.closest("[data-lead-details-toggle]");
  if (!toggle) return;
  const key = toggle.dataset.leadDetailsToggle;
  if (!key) return;
  state.leadFormDetailsOpen[key] = !state.leadFormDetailsOpen[key];
  renderLeadFormWizard();
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

function hideLoginPassword() {
  const password = document.querySelector("#loginPassword");
  const toggle = document.querySelector("#loginPasswordToggle");
  if (!password || !toggle) return;
  password.type = "password";
  toggle.setAttribute("aria-pressed", "false");
  toggle.setAttribute("aria-label", "Show password");
  toggle.title = "Show password";
}

document.querySelector("#loginPasswordToggle")?.addEventListener("click", event => {
  const password = document.querySelector("#loginPassword");
  if (!password) return;
  const visible = password.type === "password";
  password.type = visible ? "text" : "password";
  event.currentTarget.setAttribute("aria-pressed", String(visible));
  event.currentTarget.setAttribute("aria-label", visible ? "Hide password" : "Show password");
  event.currentTarget.title = visible ? "Hide password" : "Show password";
});
els.loginForm.addEventListener("reset", hideLoginPassword);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) hideLoginPassword();
});

els.loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  hideLoginPassword();
  els.loginMessage.textContent = "Signing in...";

  try {
    const result = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(new FormData(els.loginForm).entries()))
    });
    sessionStorage.removeItem(OVERDUE_BANNER_KEY);
    persistSession(result);
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

els.sidebarSearchPlaces?.addEventListener("click", () => {
  document.querySelector("#openPlacesSearch")?.click();
});

els.dashboardQuickLogActivity?.addEventListener("click", () => {
  openQuickLog();
});

els.dashboardQuickPipeline?.addEventListener("click", () => {
  setView("pipeline");
});

els.dashboardOpenFullBriefing?.addEventListener("click", () => {
  runSalespersonAiAction("pipeline_health");
});

els.dashboardToggleTools?.addEventListener("click", () => {
  setDashboardToolsOpen(!state.dashboardToolsOpen);
});

els.dashboardTogglePerformance?.addEventListener("click", () => {
  setDashboardPerformanceOpen(!state.dashboardPerformanceOpen);
});

els.dashboardToggleMarketNews?.addEventListener("click", () => {
  setDashboardMarketNewsOpen(!state.dashboardMarketNewsOpen);
});

els.dashboardToggleAgent?.addEventListener("click", () => {
  setDashboardAgentOpen(!state.agentOpen);
});

els.logoutButton.addEventListener("click", async () => {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } finally {
    clearSession();
    showLogin();
  }
});

els.mobileMenuToggle?.addEventListener("click", toggleMobileMenu);
els.closeMobileSidebar?.addEventListener("click", closeMobileMenu);
els.menuBackdrop?.addEventListener("click", closeMobileMenu);
window.addEventListener("resize", () => {
  if (window.innerWidth > 980) closeMobileMenu();
});

async function exportLeadsBackup(format) {
  const endpoint = format === "pdf" ? "/api/exports/leads.pdf" : "/api/exports/leads.xls";
  const filename = format === "pdf"
    ? `arg-leads-backup-${today()}.pdf`
    : `arg-leads-backup-${today()}.xls`;
  try {
    await downloadExport(endpoint, filename);
    setToast(`Lead backup exported as ${format.toUpperCase()}.`, "success");
  } catch (error) {
    window.alert(error.message);
  }
}

function pipelineReportRangeSlug() {
  const from = state.pipelineTable.dateFrom || "any";
  const to = state.pipelineTable.dateTo || "any";
  return `${from}-to-${to}`;
}

async function exportPipelineReport(format) {
  if (state.currentUser?.role !== "admin") {
    setToast("Admin access is required to export Pipeline reports.", "error");
    return;
  }
  const records = pipelineFilteredAndSortedLeads();
  if (!records.length) {
    setToast("No Pipeline records match the selected filters.", "error");
    return;
  }
  const button = format === "pdf" ? els.exportPipelinePdf : els.exportPipelineExcel;
  const defaultText = format === "pdf" ? "Export PDF" : "Export Excel";
  const endpoint = `/api/exports/pipeline-report.${format}`;
  const filename = `pipeline-live-leads-${pipelineReportRangeSlug()}.${format}`;
  try {
    if (button) {
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
      button.textContent = "Exporting...";
    }
    await downloadExport(endpoint, filename, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lead_ids: records.map(record => record.id),
        date_from: state.pipelineTable.dateFrom,
        date_to: state.pipelineTable.dateTo
      })
    });
    setToast(`${records.length} Pipeline record${records.length === 1 ? "" : "s"} exported as ${format === "pdf" ? "PDF" : "Excel"}.`, "success");
  } catch (error) {
    setToast(error.message, "error");
  } finally {
    if (button) {
      button.removeAttribute("aria-busy");
      button.textContent = defaultText;
    }
    renderLeadList();
  }
}

[els.exportLeadsExcel, els.exportLeadsExcelTop].forEach(button => {
  button?.addEventListener("click", () => exportLeadsBackup("xls"));
});

[els.exportLeadsPdf, els.exportLeadsPdfTop].forEach(button => {
  button?.addEventListener("click", () => exportLeadsBackup("pdf"));
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
  setDashboardAgentOpen(!state.agentOpen);
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
    } else if (button.matches("[data-ai-open-brief]")) {
      openMeetingBriefPage(aiLead());
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

document.querySelector("#aiWorkspaceView")?.addEventListener("input", event => {
  if (currentView === "neglected" && event.target.closest("[data-neglected-form]")) {
    const form = event.target.closest("[data-neglected-form]");
    if (neglectedActivityEditor) {
      neglectedActivityEditor.remarks = form.elements.remarks.value;
      neglectedActivityEditor.nextAttempt = form.elements.next_attempt?.value || "";
    }
    updateNeglectedSaveButton(form);
    return;
  }
  if (currentView !== "draft-email" || !emailDraftState || emailDraftState.owner !== String(state.currentUser?.id)) return;
  const field = event.target.dataset.emailField;
  if (!["to", "cc", "subject", "body"].includes(field)) return;
  emailDraftState[field] = event.target.value;
  emailDraftState.dirty = true;
  const button = document.querySelector("[data-email-download]");
  if (button) button.disabled = !emailDraftState.to.trim() || !emailDraftState.subject.trim() || !emailDraftState.body.trim();
  const copy = document.querySelector("[data-email-copy]");
  if (copy) copy.disabled = !emailDraftState.body.trim();
});

document.querySelector("#aiWorkspaceView")?.addEventListener("change", event => {
  if (currentView === "neglected" && event.target.closest("[data-neglected-form]")) {
    const form = event.target.closest("[data-neglected-form]");
    if (neglectedActivityEditor) {
      neglectedActivityEditor.outcome = form.elements.outcome.value;
      neglectedActivityEditor.nextAttempt = form.elements.next_attempt?.value || "";
    }
    updateNeglectedSaveButton(form);
    return;
  }
  if (currentView === "draft-email") {
    if (event.target.hasAttribute("data-email-profile") && emailDraftState) {
      emailDraftState.includeProfile = event.target.checked;
      renderAiWorkspace();
      return;
    }
    if (event.target.id === "aiWorkspaceCompany") {
      if (state.emailRouteLeadId) return;
      if (emailDraftState?.dirty && !window.confirm("Discard your edited draft and change company?")) {
        event.target.value = emailDraftState.leadId;
        return;
      }
      const lead = state.leads.find(item => String(item.id) === event.target.value);
      emailDraftState = lead ? newEmailDraft(lead) : null;
      renderAiWorkspace();
      return;
    }
  }
  if (event.target.hasAttribute("data-meeting-check") && meetingBriefState) {
    const key = event.target.dataset.meetingCheck;
    if (event.target.checked) meetingBriefState.checked.add(key);
    else meetingBriefState.checked.delete(key);
    return;
  }
  if (event.target.id !== "aiWorkspaceCompany") return;
  if (currentView === "meeting-prep") {
    const lead = state.leads.find(item => String(item.id) === event.target.value);
    meetingBriefState = lead ? { owner: String(state.currentUser.id), leadId: lead.id,
      output: "", provider: "", loading: false, error: "", generatedAt: "", checked: new Set() } : null;
    renderAiWorkspace();
    return;
  }
  const selected = state.leads.some(lead => String(lead.id) === event.target.value);
  document.querySelectorAll("#aiWorkspaceView [data-workspace-company-action]").forEach(button => { button.disabled = !selected; });
  const status = document.querySelector("#aiWorkspaceView .crm-ai-workspace-status");
  if (status) status.textContent = selected ? "Company actions are ready." : "Choose a company to enable its actions.";
});

document.querySelector("#aiWorkspaceView")?.addEventListener("submit", async event => {
  if (event.target.matches(".neglected-v2-assistant")) {
    event.preventDefault();
    const input = event.target.querySelector("#neglectedQuestion");
    const assistant = aiAssistantElements();
    if (input?.value.trim() && assistant.command) assistant.command.value = input.value.trim();
    event.target.querySelector("#aiAssistantLauncher")?.click();
    return;
  }
  if (event.target.matches("[data-neglected-form]")) {
    event.preventDefault();
    const editor = neglectedActivityEditor;
    if (!isSalesmanRole() || !editor || editor.owner !== String(state.currentUser?.id)) return;
    const form = event.target;
    if (!form.reportValidity() || !form.elements.remarks.value.trim()) return;
    form.querySelector("[data-neglected-save]").disabled = true;
    try {
      const result = await api(`/api/leads/${encodeURIComponent(editor.leadId)}/activities/${encodeURIComponent(editor.activityId)}/transaction`, {
        method: "PATCH", body: JSON.stringify({ status: editor.status, outcome: form.elements.outcome.value, remarks: form.elements.remarks.value.trim(), next_attempt: form.elements.next_attempt?.value || "", version: editor.version })
      });
      if (editor.owner !== String(state.currentUser?.id) || neglectedActivityEditor !== editor) return;
      const lead = state.leads.find(item => String(item.id) === editor.leadId);
      const index = lead?.activities?.findIndex(item => String(item.id) === editor.activityId) ?? -1;
      if (index >= 0) lead.activities[index] = result.activity;
      neglectedActivityEditor = null;
      renderAiWorkspace();
      setToast("Follow-up updated.", "success");
    } catch (error) {
      if (neglectedActivityEditor === editor) {
        editor.error = error.message || "Unable to save the update.";
        renderAiWorkspace();
      }
    }
    return;
  }
  if (!event.target.matches(".crm-onetap-assistant")) return;
  event.preventDefault();
  event.target.querySelector("#aiAssistantLauncher")?.click();
});

document.querySelector("#aiWorkspaceView")?.addEventListener("click", async event => {
  const button = event.target.closest("button");
  if (!button || button.disabled) return;
  if (currentView === "neglected" && button.id === "aiAssistantLauncher") {
    const input = document.querySelector("#neglectedQuestion");
    const assistant = aiAssistantElements();
    if (input?.value.trim() && assistant.command) assistant.command.value = input.value.trim();
    return;
  }
  if (currentView === "neglected" && button.dataset.neglectedFilter) {
    neglectedActivityFilter = button.dataset.neglectedFilter;
    neglectedActivityEditor = null;
    renderAiWorkspace();
    return;
  }
  if (currentView === "neglected" && button.hasAttribute("data-neglected-cancel")) {
    neglectedActivityEditor = null;
    renderAiWorkspace();
    return;
  }
  if (currentView === "neglected" && button.hasAttribute("data-neglected-export") && isPrivilegedDashboardRole()) {
    try { await downloadExport("/api/management/overdue-activities.csv", "overdue-activities.csv"); }
    catch (error) { setToast(error.message || "Export failed.", "error"); }
    return;
  }
  if (currentView === "neglected" && isSalesmanRole() && (button.dataset.neglectedStatus || button.hasAttribute("data-neglected-edit"))) {
    const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dubai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const row = neglectedActivityRows(state.leads, date)[Number(button.dataset.neglectedIndex ?? button.dataset.neglectedEdit)];
    if (!row || !row.stable) return;
    const status = button.dataset.neglectedStatus || row.status;
    neglectedActivityEditor = { owner: String(state.currentUser.id), leadId: String(row.lead.id), activityId: String(row.activity.id), version: Number(row.activity.version || 1), status, outcome: status === row.status ? row.activity.transaction_outcome || "" : "", remarks: row.activity.transaction_remarks || "", nextAttempt: status === "pending" ? row.activity.transaction_next_attempt || "" : "", error: "" };
    renderAiWorkspace();
    return;
  }
  if (currentView === "draft-email" && Object.keys(button.dataset).some(key => key.startsWith("email"))) {
    if (button.hasAttribute("data-email-parent") && state.emailRouteLeadId) {
      openLeadDrawer(state.emailRouteLeadId);
      return;
    }
    if (button.hasAttribute("data-email-change")) {
      const picker = document.querySelector("#emailCompanyPicker");
      const expanded = picker.classList.contains("hidden");
      picker.classList.toggle("hidden", !expanded);
      button.setAttribute("aria-expanded", String(expanded));
      if (expanded) picker.querySelector("select")?.focus();
      return;
    }
    const draft = emailDraftState;
    if (!draft || draft.owner !== String(state.currentUser?.id) || !state.leads.some(item => String(item.id) === draft.leadId)) return;
    if (button.hasAttribute("data-email-generate")) await generateEmailDraft();
    else if (button.hasAttribute("data-email-download")) await downloadEmailDraft();
    else if (button.hasAttribute("data-email-open")) openLeadDrawer(draft.leadId);
    else if (button.hasAttribute("data-email-cc")) {
      draft.showCc = !draft.showCc;
      if (!draft.showCc) draft.cc = "";
      renderAiWorkspace();
    } else if (button.dataset.emailTone) {
      draft.tone = button.dataset.emailTone;
      draft.body = emailToneBody(draft.body, draft.tone);
      draft.dirty = Boolean(draft.body);
      renderAiWorkspace();
    } else if (button.hasAttribute("data-email-copy")) {
      try {
        await navigator.clipboard.writeText(`To: ${draft.to}\n${draft.cc ? `Cc: ${draft.cc}\n` : ""}Subject: ${draft.subject}\n\n${draft.body}`);
        setToast("Email text copied. Attachments are included only in the downloaded draft.", "success");
      } catch { setToast("Could not copy. Select the email text to copy it.", "error"); }
    }
    return;
  }
  if (button.id === "aiAssistantLauncher" && currentView === "ai-actions") {
    const input = document.querySelector(".crm-onetap-assistant-input");
    if (input?.value.trim()) {
      aiAssistantElements().command.value = input.value.trim();
      input.value = "";
    }
    return;
  }
  if (button.hasAttribute("data-meeting-menu")) { toggleMobileMenu(); return; }
  if (button.hasAttribute("data-meeting-parent")) {
    if (state.leads.some(item => String(item.id) === state.meetingRouteLeadId)) openLeadDrawer(state.meetingRouteLeadId);
    else setView("pipeline");
    return;
  }
  if (button.hasAttribute("data-meeting-change")) {
    if (state.meetingRouteLeadId) return;
    const picker = document.querySelector("#meetingCompanyPicker");
    const expanded = picker.classList.contains("hidden");
    picker.classList.toggle("hidden", !expanded);
    button.setAttribute("aria-expanded", String(expanded));
    if (expanded) picker.querySelector("select")?.focus();
    return;
  }
  if (button.matches("[data-meeting-generate], [data-meeting-copy], [data-meeting-log], [data-meeting-pmr]")) {
    const lead = meetingBriefState?.owner === String(state.currentUser?.id)
      ? state.leads.find(item => String(item.id) === meetingBriefState.leadId) : null;
    if (!lead) return;
    if (button.hasAttribute("data-meeting-generate")) await generateMeetingBrief(lead);
    else if (button.hasAttribute("data-meeting-log")) {
      openActivityModal(lead.id, button);
      els.activityPurpose.value = "Meeting";
    } else if (button.hasAttribute("data-meeting-pmr")) openPmrForLead(lead.id);
    else {
      try {
        if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable. Select the brief text to copy it.");
        await navigator.clipboard.writeText(meetingBriefState.output);
        setToast("Meeting brief copied.", "success");
      } catch (error) { setToast(error.message || "Could not copy the brief.", "error"); }
    }
    return;
  }
  if (button.hasAttribute("data-neglected-tools")) {
    neglectedToolsOpen = !neglectedToolsOpen;
    document.body.classList.toggle("neglected-tools-open", neglectedToolsOpen);
    button.setAttribute("aria-expanded", String(neglectedToolsOpen));
    return;
  }
  if (button.hasAttribute("data-neglected-retry") && (isSalesmanRole() || isPrivilegedDashboardRole())) {
    neglectedWorkspace = null;
    if (!state.leadsLoaded) {
      try { await loadLeads(); } catch { /* The page displays the existing load error. */ }
    }
    renderAiWorkspace();
    return;
  }
  const neglectedLeadId = button.dataset.neglectedLead || button.dataset.neglectedLog || button.dataset.neglectedTask;
  if (neglectedLeadId && (isSalesmanRole() || isPrivilegedDashboardRole())) {
    const lead = state.leads.find(item => String(item.id) === neglectedLeadId);
    if (!lead) return;
    if (button.dataset.neglectedLog) openActivityModal(lead.id, button);
    else openLeadDrawer(lead.id, button.dataset.neglectedTask ? "reminders" : "overview");
    return;
  }
  if (button.dataset.todayLead) {
    openLeadDrawer(button.dataset.todayLead);
    render();
    return;
  }
  if (button.dataset.todaySummary) {
    openSummaryCardDetails(button.dataset.todaySummary, button);
    return;
  }
  if (button.dataset.todayAction) {
    if (button.dataset.todayAction === "add") document.querySelector("#openLeadForm")?.click();
    if (button.dataset.todayAction === "places") document.querySelector("#openPlacesSearch")?.click();
    if (button.dataset.todayAction === "report") setView("tasks");
    return;
  }
  if (button.dataset.workspaceView) {
    setView(button.dataset.workspaceView);
    return;
  }
  if (button.dataset.workspacePick) {
    const select = document.querySelector("#aiWorkspaceCompany");
    if (!select || !state.leads.some(lead => String(lead.id) === button.dataset.workspacePick)) return;
    select.value = button.dataset.workspacePick;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    select.focus();
    return;
  }
  if (button.hasAttribute("data-workspace-retry")) {
    try { await loadLeads(); } catch (error) { setToast(error.message, "error"); }
    renderAiWorkspace();
    return;
  }
  if (button.dataset.workspacePortfolioAction && isSalesmanRole()) {
    await runSalespersonAiAction(button.dataset.workspacePortfolioAction);
    return;
  }
  if (button.dataset.workspaceCompanyAction) {
    const selected = document.querySelector("#aiWorkspaceCompany")?.value;
    const lead = state.leads.find(item => String(item.id) === selected);
    if (!lead) return;
    if (button.dataset.workspaceCompanyAction === "flag") openFlagAttentionModal(lead);
    else await runLeadAiAction(lead, button.dataset.workspaceCompanyAction);
  }
});

els.dailyAiPanel?.addEventListener("click", event => {
  const dashboardAction = event.target.closest("[data-dashboard-action]");
  if (dashboardAction) {
    const action = dashboardAction.dataset.dashboardAction;
    if (action === "followups") {
      scrollToDashboardPanel(els.salesmanFollowupPanel);
      return;
    }
    if (action === "first-touch") {
      scrollToDashboardPanel(els.dashboardQuickActions);
      return;
    }
    if (action === "loss-reasons") {
      scrollToDashboardPanel(els.salesmanLossPromptPanel);
      return;
    }
    if (action === "log-activity") {
      openQuickLog();
      return;
    }
    if (action === "pipeline") {
      setView("pipeline");
      return;
    }
  }
  const button = event.target.closest("[data-salesperson-ai-action]");
  if (!button) {
    return;
  }
  runSalespersonAiAction(button.dataset.salespersonAiAction);
});

els.syncStatusPill?.addEventListener("click", openPendingChanges);
els.closePendingChanges?.addEventListener("click", () => els.pendingChangesDialog?.close());
els.syncNowButton?.addEventListener("click", () => syncOutbox().catch(handleOutboxSyncError));
els.closeQuickLog?.addEventListener("click", () => els.quickLogDialog?.close());
els.closeMobileMap?.addEventListener("click", () => els.mobileMapDialog?.close());
els.closeActivityDialog?.addEventListener("click", () => closeActivityModal());
els.cancelActivityDialog?.addEventListener("click", () => closeActivityModal());
els.openActivityCreate?.addEventListener("click", event => openActivityModal("", event.currentTarget));
els.activityLeadPicker?.addEventListener("change", event => {
  const lead = state.leads.find(item => String(item.id) === String(event.target.value));
  if (!lead) return;
  els.activityForm.elements.lead_id.value = lead.id;
  els.activityLeadName.textContent = lead.company_name || "Selected lead";
});
els.activityAttachmentInput?.addEventListener("change", async event => {
  await addActivityFiles(event.target.files || []);
  event.target.value = "";
});
els.activityDropZone?.addEventListener("click", () => els.activityAttachmentInput?.click());
els.activityDropZone?.addEventListener("dragenter", event => {
  event.preventDefault();
  els.activityDropZone.classList.add("is-dragging");
});
els.activityDropZone?.addEventListener("dragover", event => {
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
});
els.activityDropZone?.addEventListener("dragleave", event => {
  if (!els.activityDropZone.contains(event.relatedTarget)) els.activityDropZone.classList.remove("is-dragging");
});
els.activityDropZone?.addEventListener("drop", async event => {
  event.preventDefault();
  els.activityDropZone.classList.remove("is-dragging");
  await addActivityFiles(event.dataTransfer?.files || []);
});
els.activityRecordVoice?.addEventListener("click", startActivityVoiceRecording);
els.activityPauseVoice?.addEventListener("click", pauseActivityVoiceRecording);
els.activityStopVoice?.addEventListener("click", stopActivityVoiceRecording);
els.activityCancelVoice?.addEventListener("click", cancelActivityVoiceRecording);
els.activityForm?.addEventListener("submit", event => {
  event.preventDefault();
  saveActivityModal();
});
els.activityDialog?.addEventListener("cancel", event => {
  event.preventDefault();
  closeActivityModal();
});
els.activityDialog?.addEventListener("click", event => {
  if (event.target === els.activityDialog) closeActivityModal();
});
els.activityDialog?.addEventListener("close", () => {
  document.body.classList.remove("activity-modal-open");
  activityModalFiles = [];
  activityModalExistingAttachments = [];
  activityModalRemovedAttachmentIds = new Set();
  const trigger = activityModalTrigger;
  activityModalTrigger = null;
  if (trigger?.isConnected) trigger.focus();
});
document.querySelectorAll("[data-close-activity-details]").forEach(button => {
  button.addEventListener("click", () => els.activityDetailsDialog?.close());
});
els.editActivityFromDetails?.addEventListener("click", () => {
  const selection = activityDetailsSelection;
  els.activityDetailsDialog?.close();
  if (selection) openActivityEdit(selection.leadId, selection.activityIndex, selection.activity.id);
});
els.requestActivityDeletionFromDetails?.addEventListener("click", () => {
  const selection = activityDetailsSelection;
  els.activityDetailsDialog?.close();
  if (selection) submitDeleteRequest(selection.leadId, "activity", selection.activityIndex, selection.activity.id);
});
els.cancelActivityDeletionFromDetails?.addEventListener("click", cancelActivityDeletionRequest);
els.activityDeletionForm?.addEventListener("submit", async event => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const reason = String(data.get("reason") || "").trim();
  const comments = String(data.get("comments") || "").trim();
  if (reason === "Other" && !comments) {
    setMessage(els.activityDeletionMessage, "Add supporting comments when the reason is Other.", "error");
    return;
  }
  const submit = event.currentTarget.querySelector('[type="submit"]');
  submit.disabled = true;
  setMessage(els.activityDeletionMessage, "Submitting deletion request...");
  try {
    await api(`/api/leads/${encodeURIComponent(data.get("lead_id"))}/delete-requests`, {
      method: "POST",
      body: JSON.stringify({
        target_type: "activity",
        activity_id: String(data.get("activity_id") || ""),
        reason,
        comments
      })
    });
    els.activityDeletionDialog.close();
    await loadLeads();
    if (currentView === "activity") await fetchActivities();
    setToast("Deletion request submitted for management approval.", "success");
  } catch (error) {
    setMessage(els.activityDeletionMessage, error.message, "error");
  } finally {
    submit.disabled = false;
  }
});
document.querySelectorAll("[data-close-activity-deletion]").forEach(button => {
  button.addEventListener("click", () => els.activityDeletionDialog?.close());
});
els.activityDeletionDialog?.addEventListener("cancel", event => {
  event.preventDefault();
  els.activityDeletionDialog.close();
});
els.openActivityDeletionQueue?.addEventListener("click", async () => {
  if (els.activityDeletionQueueSalesman) {
    const previous = els.activityDeletionQueueSalesman.value;
    const salesmen = (state.settings.salesmen || [])
      .map(salesmanName)
      .filter(Boolean);
    els.activityDeletionQueueSalesman.innerHTML = [
      `<option value="">All salesmen</option>`,
      ...salesmen.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)
    ].join("");
    els.activityDeletionQueueSalesman.value = previous;
  }
  els.activityDeletionQueueDialog?.showModal();
  await loadActivityDeletionQueue();
});
document.querySelectorAll("[data-close-activity-queue]").forEach(button => {
  button.addEventListener("click", () => els.activityDeletionQueueDialog?.close());
});
els.activityDeletionQueueStatus?.addEventListener("change", loadActivityDeletionQueue);
els.activityDeletionQueueSalesman?.addEventListener("change", loadActivityDeletionQueue);
els.activityDeletionQueueFrom?.addEventListener("change", loadActivityDeletionQueue);
els.activityDeletionQueueTo?.addEventListener("change", loadActivityDeletionQueue);
let activityDeletionQueueSearchTimer = null;
const queueSearchInputs = [els.activityDeletionQueueSearch, els.activityDeletionQueueRequester].filter(Boolean);
queueSearchInputs.forEach(input => input.addEventListener("input", () => {
  clearTimeout(activityDeletionQueueSearchTimer);
  activityDeletionQueueSearchTimer = setTimeout(loadActivityDeletionQueue, 250);
}));

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
els.leadForm.addEventListener("change", event => {
  const field = event.target;
  if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement)) return;
  if (field.name) leadFormTouched.add(field.name);
});
renderLeadProductInterestOptions();
renderLeadFormWizard();

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
  const formData = new FormData(els.leadForm);
  const payload = Object.fromEntries(formData.entries());
  payload.product_interest = formData.getAll("product_interest").map(value => String(value || "").trim()).filter(Boolean).join(", ");
  payload.estimated_value = Number(payload.estimated_value || 0);
  if (!isAdminOrManager() && state.currentUser) {
    payload.assigned_salesman = state.currentUser.name || state.currentUser.email || payload.assigned_salesman;
    payload.territory = state.currentUser.territory || payload.territory;
  }
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

const aiAssistant = {
  sessionId: "",
  preview: null,
  selectedContextId: "",
  recorder: null,
  recordingTimeout: null,
  chunks: [],
  trigger: null,
  needsRender: false
};

function aiAssistantElements() {
  return {
    launcher: document.querySelector("#aiAssistantLauncher"),
    dialog: document.querySelector("#aiAssistantDialog"),
    form: document.querySelector("#aiAssistantForm"),
    close: document.querySelector("#closeAiAssistant"),
    greeting: document.querySelector("#aiAssistantGreeting"),
    state: document.querySelector("#aiAssistantState"),
    command: document.querySelector("#aiAssistantCommand"),
    mic: document.querySelector("#aiAssistantMic"),
    interpret: document.querySelector("#aiAssistantInterpret"),
    transcript: document.querySelector("#aiAssistantTranscript"),
    result: document.querySelector("#aiAssistantResult"),
    preview: document.querySelector("#aiAssistantPreview"),
    previewFields: document.querySelector("#aiAssistantPreviewFields"),
    confirm: document.querySelector("#aiAssistantConfirm"),
    cancel: document.querySelector("#aiAssistantCancel"),
    refreshDrafts: document.querySelector("#refreshAiDrafts"),
    draftList: document.querySelector("#aiAssistantDraftList")
  };
}

function setAiAssistantState(name, title, detail) {
  const { state: stateElement } = aiAssistantElements();
  if (!stateElement) return;
  stateElement.dataset.state = name;
  const strong = stateElement.querySelector("strong");
  const span = stateElement.querySelector("span:last-child");
  if (strong) strong.textContent = title;
  if (span) span.textContent = detail;
}

function setAiAssistantBusy(busy) {
  const { interpret, confirm, cancel, refreshDrafts, command } = aiAssistantElements();
  [interpret, confirm, cancel, refreshDrafts].forEach(button => {
    if (button) button.disabled = Boolean(busy);
  });
  if (command) command.readOnly = Boolean(busy);
}

function runAiAssistantUiStep(label, callback) {
  try {
    return callback();
  } catch (error) {
    throw new Error(`${label}: ${error.message}`);
  }
}

function currentAiAssistantLeadId() {
  return currentView === "lead" && state.selectedId ? state.selectedId : "";
}

function clearAiAssistantPreview() {
  const { preview, previewFields } = aiAssistantElements();
  aiAssistant.sessionId = "";
  aiAssistant.preview = null;
  preview?.classList.add("hidden");
  if (previewFields) previewFields.innerHTML = "";
}

function aiAssistantChoiceMarkup(choice, missingField = "") {
  const title = choice.company_name || choice.label || choice.id || "Select";
  const detail = [choice.contact_person, choice.territory].filter(Boolean).join(" - ");
  return `
    <button type="button" class="ai-assistant-choice" data-ai-choice-id="${escapeHtml(choice.id)}" data-ai-choice-value="${escapeHtml(title)}" data-ai-missing-field="${escapeHtml(missingField)}">
      <strong>${escapeHtml(title)}</strong>
      ${detail ? `<span>${escapeHtml(detail)}</span>` : ""}
    </button>
  `;
}

function showAiAssistantResult(result, stateName = "completed") {
  const { result: resultElement } = aiAssistantElements();
  if (!resultElement) return;
  const records = Array.isArray(result.records) ? result.records : [];
  const choices = Array.isArray(result.choices) ? result.choices : [];
  const recordMarkup = records.length ? `
    <div class="ai-assistant-records">
      ${records.slice(0, 25).map(record => `
        <button type="button" data-ai-open-lead="${escapeHtml(record.lead_id || record.id)}">
          <strong>${escapeHtml(record.company_name || record.type || "CRM activity")}</strong>
          <span>${escapeHtml([
            record.next_action || record.next_action_plan || record.type,
            record.next_action_date,
            record.status
          ].filter(Boolean).join(" - "))}</span>
        </button>
      `).join("")}
    </div>
  ` : "";
  const choiceMarkup = choices.length ? `
    <div class="ai-assistant-records">
      ${choices.map(choice => aiAssistantChoiceMarkup(choice, result.missing_field)).join("")}
    </div>
  ` : "";
  resultElement.dataset.state = stateName;
  resultElement.innerHTML = `
    <h3>${escapeHtml(result.question || (stateName === "failed" ? "I could not complete that command" : "Assistant result"))}</h3>
    <p>${escapeHtml(result.message || result.error || "Review the information below.")}</p>
    ${recordMarkup}
    ${choiceMarkup}
    ${result.missing_field === "requestedDateExpression" ? "<p><strong>Add the missing date and time to your command, then try again.</strong></p>" : ""}
  `;
  resultElement.classList.remove("hidden");
}

function aiAssistantOptions(options, selected) {
  return options.map(value => `<option value="${escapeHtml(value)}" ${String(value) === String(selected) ? "selected" : ""}>${escapeHtml(value)}</option>`).join("");
}

function renderAiAssistantPreview(result) {
  const { preview, previewFields } = aiAssistantElements();
  const data = result.preview || {};
  const activity = data.activity || {};
  const email = data.email_draft || null;
  aiAssistant.sessionId = result.session_id || "";
  aiAssistant.preview = data;
  aiAssistant.selectedContextId = data.lead?.id || aiAssistant.selectedContextId;
  previewFields.innerHTML = `
    <div class="ai-assistant-fields">
      <div class="ai-assistant-field ai-assistant-field--wide">
        <label>CRM record</label>
        <input value="${escapeHtml(data.lead?.company_name || "")}" readonly aria-readonly="true">
      </div>
      <div class="ai-assistant-field">
        <label for="aiActivityPlan">Next action plan</label>
        <select id="aiActivityPlan">${aiAssistantOptions(NEXT_ACTION_PLAN_OPTIONS, activity.next_action_plan)}</select>
      </div>
      <div class="ai-assistant-field">
        <label for="aiActivityPurpose">Type / purpose</label>
        <select id="aiActivityPurpose">${aiAssistantOptions(STRUCTURED_ACTIVITY_PURPOSE_OPTIONS, activity.activity_purpose)}</select>
      </div>
      <div class="ai-assistant-field">
        <label for="aiActivityDate">Date</label>
        <input id="aiActivityDate" type="date" value="${escapeHtml(activity.next_action_date || "")}">
      </div>
      <div class="ai-assistant-field">
        <label for="aiActivityTime">Time</label>
        <input id="aiActivityTime" type="time" value="${escapeHtml(activity.next_action_time || "")}">
      </div>
      <div class="ai-assistant-field ai-assistant-field--wide">
        <label for="aiActivityNotes">Notes</label>
        <textarea id="aiActivityNotes" rows="4">${escapeHtml(activity.notes || "")}</textarea>
      </div>
      ${email ? `
        <div class="ai-assistant-field ai-assistant-field--wide">
          <label for="aiDraftRecipient">Verified recipient</label>
          <input id="aiDraftRecipient" type="email" value="${escapeHtml(email.recipient || "")}" placeholder="Add a verified CRM email">
        </div>
        <div class="ai-assistant-field">
          <label for="aiDraftCc">CC</label>
          <input id="aiDraftCc" type="text" value="${escapeHtml(email.cc || "")}">
        </div>
        <div class="ai-assistant-field">
          <label for="aiDraftBcc">BCC</label>
          <input id="aiDraftBcc" type="text" value="${escapeHtml(email.bcc || "")}">
        </div>
        <div class="ai-assistant-field ai-assistant-field--wide">
          <label for="aiDraftSubject">Email subject</label>
          <input id="aiDraftSubject" value="${escapeHtml(email.subject || "")}">
        </div>
        <div class="ai-assistant-field ai-assistant-field--wide">
          <label for="aiDraftBody">Editable email draft</label>
          <textarea id="aiDraftBody" rows="8">${escapeHtml(email.body || "")}</textarea>
        </div>
        <div class="ai-assistant-field ai-assistant-field--wide">
          <p class="ai-assistant-draft-notice"><strong>This assistant never sends email automatically.</strong> Saving creates a draft for manual review and Send.</p>
        </div>
      ` : ""}
    </div>
  `;
  preview?.classList.remove("hidden");
  showAiAssistantResult({ message: result.message || "Review every field before confirming." }, "confirmation");
  setAiAssistantState("confirmation", "Confirmation required", "Nothing has been saved yet");
  preview?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
}

function aiAssistantConfirmedPayload() {
  const value = selector => document.querySelector(selector)?.value || "";
  const payload = {
    session_id: aiAssistant.sessionId,
    activity: {
      next_action_plan: value("#aiActivityPlan"),
      activity_purpose: value("#aiActivityPurpose"),
      next_action_date: value("#aiActivityDate"),
      next_action_time: value("#aiActivityTime"),
      notes: value("#aiActivityNotes"),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Dubai"
    }
  };
  if (aiAssistant.preview?.email_draft) {
    payload.email_draft = {
      recipient: value("#aiDraftRecipient"),
      cc: value("#aiDraftCc"),
      bcc: value("#aiDraftBcc"),
      subject: value("#aiDraftSubject"),
      body: value("#aiDraftBody")
    };
  }
  return payload;
}

async function loadAiAssistantDrafts() {
  const { draftList } = aiAssistantElements();
  if (!draftList || !state.currentUser) return;
  draftList.innerHTML = '<p class="ai-assistant-empty">Loading your drafts...</p>';
  try {
    const drafts = await api("/api/ai-assistant/email-drafts");
    draftList.innerHTML = drafts.length ? drafts.map(draft => `
      <article class="ai-assistant-draft-card">
        <strong>${escapeHtml(draft.company_name || draft.recipient || "Email draft")}</strong>
        <span>${escapeHtml(draft.subject || "No subject")}</span>
        <em>${escapeHtml(draft.status || "Draft")}${draft.scheduled_for ? ` - ${escapeHtml(formatDateTime(draft.scheduled_for))}` : ""}</em>
      </article>
    `).join("") : '<p class="ai-assistant-empty">No AI-assisted email drafts yet.</p>';
  } catch (error) {
    draftList.innerHTML = `<p class="ai-assistant-empty">${escapeHtml(error.message)}</p>`;
  }
}

async function interpretAiAssistantCommand() {
  const { command, result: resultElement } = aiAssistantElements();
  const text = String(command?.value || "").trim();
  if (text.length < 3) {
    showAiAssistantResult({ error: "Type or speak a CRM command first." }, "failed");
    command?.focus();
    return;
  }
  clearAiAssistantPreview();
  resultElement?.classList.add("hidden");
  setAiAssistantBusy(true);
  setAiAssistantState("processing", "Understanding command", "Checking authorized CRM records");
  try {
    const response = await api("/api/ai-assistant/interpret", {
      method: "POST",
      body: JSON.stringify({
        command: text,
        context_lead_id: aiAssistant.selectedContextId || currentAiAssistantLeadId(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Dubai"
      })
    });
    if (response.state === "ready_for_confirmation") {
      renderAiAssistantPreview(response);
    } else if (response.state === "needs_clarification") {
      aiAssistant.sessionId = response.session_id || "";
      if (response.selected_record?.id) aiAssistant.selectedContextId = response.selected_record.id;
      showAiAssistantResult(response, "clarification");
      setAiAssistantState("clarification", "One detail needed", response.question || "Choose an option");
    } else {
      showAiAssistantResult(response, "completed");
      setAiAssistantState("completed", "Complete", response.message || "CRM information is ready");
    }
  } catch (error) {
    showAiAssistantResult({ error: error.message }, "failed");
    setAiAssistantState("failed", "Command not completed", error.message);
  } finally {
    setAiAssistantBusy(false);
  }
}

async function confirmAiAssistantAction() {
  if (!aiAssistant.sessionId || !aiAssistant.preview) return;
  setAiAssistantBusy(true);
  setAiAssistantState("processing", "Saving confirmed action", "Writing to the existing CRM workflow");
  try {
    const response = await api("/api/ai-assistant/confirm", {
      method: "POST",
      body: JSON.stringify(aiAssistantConfirmedPayload())
    });
    runAiAssistantUiStep("clear preview", clearAiAssistantPreview);
    runAiAssistantUiStep("show result", () => showAiAssistantResult(response, "completed"));
    runAiAssistantUiStep("update status", () => setAiAssistantState("completed", "Saved", response.message || "CRM action saved"));
    runAiAssistantUiStep("show toast", () => setToast(response.message || "Assistant action saved."));
    if (response.lead?.id) {
      const index = state.leads.findIndex(lead => lead.id === response.lead.id);
      if (index >= 0) state.leads[index] = response.lead;
      else state.leads.unshift(response.lead);
      aiAssistant.needsRender = true;
    }
    try {
      await loadAiAssistantDrafts();
    } catch (error) {
      throw new Error(`refresh drafts: ${error.message}`);
    }
  } catch (error) {
    showAiAssistantResult({ error: error.message }, "failed");
    setAiAssistantState("failed", "Save failed", error.message);
  } finally {
    setAiAssistantBusy(false);
  }
}

async function cancelAiAssistantAction() {
  const sessionId = aiAssistant.sessionId;
  clearAiAssistantPreview();
  setAiAssistantState("ready", "Ready", "Waiting for a command");
  if (!sessionId) return;
  try {
    await api("/api/ai-assistant/cancel", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId })
    });
  } catch {
    // The local preview is already discarded; cancellation audit can retry with a new command.
  }
}

async function stopAiAssistantRecording() {
  if (aiAssistant.recorder?.state === "recording") aiAssistant.recorder.stop();
}

async function toggleAiAssistantRecording() {
  const { mic, transcript, command } = aiAssistantElements();
  if (aiAssistant.recorder) {
    stopAiAssistantRecording();
    return;
  }
  if (activeRecorder || activityModalRecorder || pmrVoiceRecorder) {
    transcript.textContent = "Finish the current CRM voice recording first.";
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    transcript.textContent = "Voice commands are not supported in this browser. Type the command instead.";
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = recorderMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    aiAssistant.recorder = recorder;
    aiAssistant.chunks = [];
    aiAssistant.recordingTimeout = setTimeout(() => recorder.state === "recording" && recorder.stop(), 120_000);
    mic.classList.add("recording");
    mic.setAttribute("aria-label", "Stop voice command");
    mic.querySelector("span:last-child").textContent = "Stop recording";
    transcript.textContent = "Listening... Speak naturally in your preferred language.";
    setAiAssistantState("recording", "Listening", "Tap Stop recording when finished");
    recorder.addEventListener("dataavailable", event => {
      if (event.data.size) aiAssistant.chunks.push(event.data);
    });
    recorder.addEventListener("stop", async () => {
      clearTimeout(aiAssistant.recordingTimeout);
      stream.getTracks().forEach(track => track.stop());
      const chunks = aiAssistant.chunks.slice();
      aiAssistant.recorder = null;
      aiAssistant.chunks = [];
      mic.classList.remove("recording");
      mic.setAttribute("aria-label", "Start voice command");
      mic.querySelector("span:last-child").textContent = "Tap to speak";
      transcript.textContent = "Transcribing and translating voice to English...";
      setAiAssistantState("processing", "Transcribing", "Converting speech into an editable command");
      try {
        const text = await transcribeRecording(new Blob(chunks, { type: recorder.mimeType || "audio/webm" }));
        if (!text) throw new Error("No speech was detected. Please try again.");
        command.value = text;
        transcript.textContent = "Voice transcript added. Review it, then choose Understand command.";
        setAiAssistantState("ready", "Transcript ready", "Review the text before continuing");
        command.focus();
      } catch (error) {
        transcript.textContent = error.message;
        setAiAssistantState("failed", "Transcription failed", error.message);
      }
    });
    recorder.start();
  } catch (error) {
    transcript.textContent = error.name === "NotAllowedError"
      ? "Microphone permission was denied. Allow microphone access or type the command."
      : `Could not start recording: ${error.message}`;
    setAiAssistantState("failed", "Microphone unavailable", transcript.textContent);
  }
}

function openAiAssistant() {
  const { dialog, greeting, command } = aiAssistantElements();
  if (!dialog || !state.currentUser) return;
  aiAssistant.trigger = document.activeElement;
  aiAssistant.selectedContextId = currentAiAssistantLeadId();
  greeting.textContent = `Hi ${state.currentUser.name || "there"}, how can I help?`;
  if (!dialog.open) dialog.showModal();
  document.body.classList.add("ai-assistant-open");
  loadAiAssistantDrafts();
  setTimeout(() => command?.focus(), 0);
}

function closeAiAssistant() {
  const { dialog } = aiAssistantElements();
  stopAiAssistantRecording();
  if (dialog?.open) dialog.close();
  document.body.classList.remove("ai-assistant-open");
  if (aiAssistant.needsRender) {
    aiAssistant.needsRender = false;
    render();
  }
  aiAssistant.trigger?.focus?.();
}

function initAiSalesAssistant() {
  const elements = aiAssistantElements();
  if (!elements.dialog || !elements.launcher) return;
  elements.launcher.addEventListener("click", openAiAssistant);
  elements.close.addEventListener("click", closeAiAssistant);
  elements.interpret.addEventListener("click", interpretAiAssistantCommand);
  elements.command.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") interpretAiAssistantCommand();
  });
  elements.mic.addEventListener("click", toggleAiAssistantRecording);
  elements.confirm.addEventListener("click", confirmAiAssistantAction);
  elements.cancel.addEventListener("click", cancelAiAssistantAction);
  elements.refreshDrafts.addEventListener("click", loadAiAssistantDrafts);
  elements.dialog.addEventListener("cancel", event => {
    event.preventDefault();
    closeAiAssistant();
  });
  elements.dialog.addEventListener("click", event => {
    if (event.target === elements.dialog) closeAiAssistant();
  });
  elements.dialog.addEventListener("close", () => {
    document.body.classList.remove("ai-assistant-open");
  });
  elements.form.addEventListener("submit", event => event.preventDefault());
  document.querySelectorAll("[data-ai-prompt]").forEach(button => {
    button.addEventListener("click", () => {
      elements.command.value = button.dataset.aiPrompt || "";
      elements.command.focus();
    });
  });
  elements.result.addEventListener("click", event => {
    const choice = event.target.closest("[data-ai-choice-id]");
    if (choice) {
      const missingField = choice.dataset.aiMissingField;
      if (missingField === "purpose") {
        const purpose = choice.dataset.aiChoiceValue || "";
        elements.command.value = `${elements.command.value.trim()} Purpose: ${purpose}.`;
      } else {
        aiAssistant.selectedContextId = choice.dataset.aiChoiceId || "";
      }
      interpretAiAssistantCommand();
      return;
    }
    const record = event.target.closest("[data-ai-open-lead]");
    if (!record?.dataset.aiOpenLead) return;
    state.selectedId = record.dataset.aiOpenLead;
    closeAiAssistant();
    setView("lead");
    loadLeadDetailData(state.selectedId);
  });
}

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

initAiSalesAssistant();
initPwaShell();
initDashboardCollapsibles();
setInterval(() => {
  if (state.sync.pending) syncOutbox().catch(handleOutboxSyncError);
}, 60_000);

authInitialization = init();
authInitialization.catch(error => {
  document.body.innerHTML = `<main class="empty-state"><strong>Could not load ARG CRM</strong><span>${escapeHtml(error.message)}</span></main>`;
});
