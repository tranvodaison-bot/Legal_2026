export type ProjectArchetypeCode = 'HTKT' | 'DAN_DUNG' | 'KCN' | 'CCN' | 'FTZ' | 'PPP_BT';

export type FunctionalDomainCode =
  | 'QLCL'
  | 'HDXD'
  | 'QLHD'
  | 'QLCP'
  | 'VLXD'
  | 'TCVN'
  | 'QCVN'
  | 'DTH'
  | 'TQT'
  | 'PCCC'
  | 'QHDD'
  | 'ATLD'
  | 'DTU';

export type GateWorkflowStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'HARD_STOP_BLOCKED';

export interface LegalGroupItem {
  code: string;
  name: string;
  group: 'VBPL' | 'TC_QC' | 'HSDA';
  badgeColor: string;
}

export interface ProjectArchetypeItem {
  code: ProjectArchetypeCode;
  name: string;
  authority: string;
  specialNote: string;
  totalInvestmentVnd: number;
  acceptedValueVnd: number;
  disbursedValueVnd: number;
  blockedCapexVnd: number;
  performanceBondExpiry: string;
  advanceBondExpiry: string;
}

export interface FunctionalDomainItem {
  code: FunctionalDomainCode;
  name: string;
}

export interface CodeNamePair {
  code: string;
  name: string;
}

export interface Taxonomy3D {
  legalGroups: LegalGroupItem[];
  projectTypes: ProjectArchetypeItem[];
  functionalDomains: FunctionalDomainItem[];
  industries: CodeNamePair[];
  issuers: CodeNamePair[];
}

export interface LegalSubSectorItem {
  code: string;
  name: string;
  count: number;
  mappedDomains?: FunctionalDomainCode[];
  projectArchetypes: ProjectArchetypeCode[];
  keyGates?: string[];
  projectLinkNote?: string;
}

export interface LegalCategoryGroup {
  id: string;
  industryCode: string;
  priorityOrder: number;
  name: string;
  badgeCount: number;
  primaryProjectAxes: ProjectArchetypeCode[];
  industrySummary: string;
  children: LegalSubSectorItem[];
}

export interface LegalNode {
  id: string;
  level: 'Mở đầu' | 'Căn cứ' | 'Chương' | 'Mục' | 'Điều';
  code: string;
  title: string;
  clauseCount: number;
  content: string;
}

export interface LegalContentBlock {
  type: 'clause' | 'point' | 'paragraph';
  index: string;
  text: string;
}

export interface LegalTocSection {
  id: string;
  chapter: string;
  article_number: string;
  title: string;
  full_heading: string;
  content_blocks: LegalContentBlock[];
  clauses_count: number;
}

export interface LegalParsedStructure {
  stats: {
    chapters: number;
    articles: number;
    clauses: number;
  };
  toc: LegalTocSection[];
  nodes: LegalNode[];
}

export interface LegalDocument {
  id: string;
  ssotFileName: string;
  docNumber: string;
  docType: string;
  issuer: string;
  year: string;
  issueDate: string;
  effectiveDate: string;
  industryGroupId: string;
  subSectorCode: string;
  subSectorLabel: string;
  primaryDomain: FunctionalDomainCode;
  title: string;
  shortSummary?: string;
  status: string;
  validityPeriod?: 'ALL' | 'EFFECTIVE' | 'UPCOMING' | 'AMENDED' | 'Còn hiệu lực' | 'Sắp có hiệu lực';
  isAmended: boolean;
  amendBadge?: string;
  chapterCount?: number;
  articleCount?: number;
  clauseTotalCount?: number;
  projectAxes: ProjectArchetypeCode[];
  secondaryDomains: FunctionalDomainCode[];
  linkedGates: string[];
  linkedQAQC: string[];
  tags?: string[];
  lineage: string;
  nodes: LegalNode[];
}

export interface CrossExamColumn {
  docRef: string;
  clause: string;
  requirement: string;
  controlAction: string;
}

export interface CrossExamTopic {
  id: string;
  title: string;
  functionalCodes: FunctionalDomainCode[];
  projectAxes: ProjectArchetypeCode[];
  summary: string;
  columns: CrossExamColumn[];
}

export interface StageGateRaci {
  CDT: string;
  BQLDA: string;
  TVTK: string;
  TVGS: string;
  NhaThau: string;
  CoQuanNN: string;
}

export interface StageGateStep {
  code: string;
  title: string;
  mandatory: string;
  raci: StageGateRaci;
  ssotTemplate: string;
  riskFlag: string;
  auditChecklist: string[];
}

export interface GateFinancialProfile {
  allocatedContractVnd: number;
  acceptedValueVnd: number;
  disbursedValueVnd: number;
  ipcTrancheCode?: string;
  ipcTitle?: string;
}

export interface StageGateItem {
  gate: string;
  phase: string;
  name: string;
  stepsCount: number;
  functionalTags: FunctionalDomainCode[];
  status?: GateWorkflowStatus;
  assignedLeadId?: string;
  financialProfile?: GateFinancialProfile;
  projectNotes: Record<ProjectArchetypeCode, string>;
  steps: StageGateStep[];
}

export interface QAQCStep {
  stepNo: string;
  name: string;
  type: string;
  parties: string;
  desc: string;
  raciDetail: {
    CDT_QLDA: string;
    TVGS: string;
    NhaThau: string;
  };
  diaryTemplate: string;
  formTemplateTitle: string;
}

export interface QAQCProcess {
  id: string;
  code: string;
  group: string;
  gateRef: string;
  title: string;
  summary: string;
  legalTag: string;
  steps: QAQCStep[];
}

export type QlvbNamingGroupCode = 'SSOT_9PART' | 'PL' | 'HC' | 'KT' | 'TK' | 'PLDA';

export type FolderNamingPresetCode = 'STAGE_GATE_ISO' | 'QLVB_5GROUP' | 'AXIS_3D_STANDARD';

export type BatchValidationStatus =
  | 'OK'
  | 'THIEU_TRUONG'
  | 'THIEU_CO_QUAN'
  | 'QUA_DAI'
  | 'TRUNG';

export interface OcrZonesExtract {
  v1Issuer: string;
  v2NumberDate: string;
  v3TitleSummary: string;
  v4SignerValidity: string;
  confidence: number;
}

export interface NamingFormState {
  industry: string;
  docType: string;
  issuer: string;
  rawNumber: string;
  year: string;
  primaryDomain: FunctionalDomainCode;
  rawSummary: string;
  appendixSuffix: string;
  ext: string;
  projectAxes: ProjectArchetypeCode[];
  secondaryDomains: FunctionalDomainCode[];
  linkedGates: string[];
  linkedQAQC: string[];
  status: string;
  rawContentToParse: string;
}

export type CdeIsoStatus = 'S0' | 'S1' | 'A1' | 'B1';

export type SmartTagCategory =
  | 'INDUSTRY'
  | 'SUB_SECTOR'
  | 'DOMAIN'
  | 'PROJECT_AXIS'
  | 'STAGE_GATE'
  | 'CUSTOM';

export type SmartTagStatus = 'SUGGESTED' | 'CONFIRMED';

export interface SmartTagItem {
  id: string;
  category: SmartTagCategory;
  code: string;
  label: string;
  status: SmartTagStatus;
}

export interface AnalyzedFileItem {
  id: string;
  rawFile: File | null;
  itemKind?: 'FILE' | 'FOLDER';
  originalName: string;
  originalFolderPath?: string;
  proposedFolderPath?: string;
  extractedText: string;
  suggestion: {
    industry: string;
    docType: string;
    issuer: string;
    rawNumber: string;
    year: string;
    primaryDomain: FunctionalDomainCode;
    rawSummary: string;
    appendixSuffix: string;
    ext: string;
    projectAxes: ProjectArchetypeCode[];
    secondaryDomains: FunctionalDomainCode[];
    linkedGates: string[];
    linkedQAQC: string[];
  };
  smartTags?: SmartTagItem[];
  proposedName: string;
  qlvbGroup?: QlvbNamingGroupCode;
  cdeStatus?: CdeIsoStatus;
  ktSubType?: string;
  tkStageDept?: string;
  tkDocCode?: string;
  tkRevision?: string;
  projectSubCode?: string;
  validationStatus?: BatchValidationStatus;
  validationMessage?: string;
  sha256Hash?: string;
  duplicateHashOf?: string;
  duplicateSourceKind?: 'IN_BATCH' | 'IN_REPO';
  fileSizeLabel?: string;
  readStatsLabel?: string;
  ocrZones?: OcrZonesExtract;
  selected?: boolean;
  isCommitted?: boolean;
}

export interface RenameLogEntry {
  logId: string;
  timestamp: string;
  itemId: string;
  itemKind: 'FILE' | 'FOLDER';
  oldFolderPath: string;
  newFolderPath: string;
  oldName: string;
  newName: string;
  sha256Before: string;
  sha256After: string;
  actorName: string;
  qlvbGroup: QlvbNamingGroupCode;
  cdeStatus?: CdeIsoStatus;
  isReverted: boolean;
}

// ============================================================================
// CROSS-ENTITY ENTERPRISE MODELS (HRM · ADMIN APPROVAL · TASKS · ASSETS · AUDIT)
// ============================================================================
export type RbacRoleCode = 'CDT' | 'BQLDA' | 'TVGS' | 'TVTK' | 'NTTC' | 'ADMIN_PMO';

export interface EmployeeUser {
  id: string;
  code: string;
  fullName: string;
  title: string;
  department: string;
  rbacRole: RbacRoleCode;
  raciDefault: 'A' | 'R' | 'C' | 'I';
  certNumber: string;
  kpiScore: number;
  activeTasksCount: number;
  assignedAssetsCount: number;
}

export interface ApprovalWorkflowItem {
  id: string;
  docCode: string;
  title: string;
  gateRef: string;
  domain: FunctionalDomainCode;
  requesterId: string;
  approverId: string;
  consultedRole?: RbacRoleCode;
  status: 'PENDING_REVIEW' | 'TVGS_VERIFIED' | 'CDT_APPROVED' | 'REJECTED_HOLD';
  submittedAt: string;
  ssotFileName: string;
  slaHours?: number;
  elapsedHours?: number;
  bottleneckReason?: string;
  projectCode?: ProjectArchetypeCode;
  financialImpactVnd?: number;
  dailyInterestPenaltyVnd?: number;
}

export interface RaciTaskItem {
  id: string;
  wbsCode: string;
  title: string;
  gateRef: string;
  assigneeId: string;
  raciRole: 'R' | 'A' | 'C' | 'I';
  dueDate: string;
  progress: number;
  status: 'TODO' | 'IN_PROGRESS' | 'REVIEW_HOLD' | 'DONE';
  priority: 'HIGH' | 'CRITICAL' | 'NORMAL';
}

export interface ProjectAssetItem {
  id: string;
  qrBarcode: string;
  name: string;
  category: 'LAS_LAB_EQUIP' | 'SURVEY_GEODESY' | 'HEAVY_MACHINERY' | 'IT_CDE_BIM';
  custodianId: string;
  gateRef: string;
  calibrationDueDate: string;
  status: 'ACTIVE_CALIBRATED' | 'MAINTENANCE_DUE' | 'RECALLED';
  depreciationRate: number;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  module: 'INGEST_3D' | 'VBPL_CROSS' | 'STAGE_GATE' | 'QAQC_EXEC' | 'VO_AUDIT' | 'HRM_RACI' | 'ASSET_LAS' | 'AI_AGENT';
  action: string;
  entityRef: string;
  previousState?: string;
  newState: string;
  riskSeverity: 'NOMINAL' | 'WARNING' | 'CRITICAL';
  sha256Hash?: string;
  accountabilityNote?: string;
}

export interface PendingDigitalSignoff {
  title: string;
  actionLabel: string;
  module: AuditLogEntry['module'];
  entityRef: string;
  previousState?: string;
  newState: string;
  riskSeverity?: AuditLogEntry['riskSeverity'];
  defaultNote: string;
  requiredRaciLetter: 'R' | 'A' | 'C' | 'I';
  onConfirm: (note: string, sha256Hex: string, signedAtIso: string) => Promise<void> | void;
}

export type VbplNavigationLevel =
  | 'ALL_LIBRARY'
  | 'INDUSTRY_LEVEL'
  | 'SUBSECTOR_LEVEL'
  | 'PROJECT_GROUP_LEVEL'
  | 'DOCUMENT_LEVEL';

export interface VbplBreadcrumbPath {
  currentLevel: VbplNavigationLevel;
  industryGroup: LegalCategoryGroup | null;
  subSector: LegalSubSectorItem | null;
  functionalDomain: { code: FunctionalDomainCode; name: string } | null;
  projectGroup: { code: ProjectArchetypeCode; name: string } | null;
  activeDocument: LegalDocument | null;
  siblingSubSectors: LegalSubSectorItem[];
  totalDocsInScope: number;
}

export interface StageGatePhaseProgress {
  phase: string;
  total: number;
  approved: number;
  inReview: number;
  blocked: number;
  draft: number;
  pct: number;
}

export interface StageGateProgressSummary {
  projectCode: ProjectArchetypeCode;
  projectName: string;
  authority: string;
  totalGates: number;
  approvedCount: number;
  inReviewCount: number;
  blockedCount: number;
  draftCount: number;
  strictCompletionPct: number;
  weightedProgressPct: number;
  approvedPctWidth: number;
  inReviewPctWidth: number;
  blockedPctWidth: number;
  draftPctWidth: number;
  checklistDoneCount: number;
  checklistTotalCount: number;
  checklistPct: number;
  activeBottleneckGate: StageGateItem | null;
  nextMilestoneGate: StageGateItem | null;
  phaseBreakdown: StageGatePhaseProgress[];
}

// ============================================================================
// D3.JS APPROVAL FLOW & BOTTLENECK VISUALIZATION TYPES (SANKEY & BLOCK TREE)
// ============================================================================
export type D3ApprovalDiagramMode = 'SANKEY_BLOCK' | 'HIERARCHY_TREE';

export interface D3ApprovalNodeDatum {
  nodeId: string;
  code: string;
  name: string;
  roleGroup: 'CDT' | 'BQLDA' | 'CONSULTANT' | 'CONTRACTOR' | 'STATUS_GATE';
  raciBadge: string;
  totalDossiers: number;
  pendingCount: number;
  rejectedCount: number;
  approvedCount: number;
  avgTurnaroundHours: number;
  slaLimitHours: number;
  isBottleneck: boolean;
  bottleneckNote?: string;
}

export interface D3ApprovalLinkDatum {
  sourceId: string;
  targetId: string;
  value: number;
  flowLabel: string;
  pendingCount: number;
  isBottleneckLink: boolean;
  avgHours: number;
  docCodes: string[];
}

export interface D3ApprovalTreeDatum {
  id: string;
  code: string;
  name: string;
  subtitle: string;
  raciTag: string;
  status: 'NOMINAL' | 'WARNING_SLA' | 'BOTTLENECK_HOLD' | 'APPROVED';
  slaText: string;
  pendingDocs: number;
  bottleneckReason?: string;
  linkedWorkflowId?: string;
  children?: D3ApprovalTreeDatum[];
}

// ============================================================================
// HỆ THỐNG ROAD_MAP PHẢ HỆ CHO TỪNG BỘ LUẬT (LAW GENEALOGY & ROADMAP L1 -> L5)
// ============================================================================
export type LawRoadmapTierType =
  | 'L1_ROOT_AND_AMEND_LAWS'
  | 'L2_CONSOLIDATED_AND_OMNIBUS'
  | 'L3_DECREES'
  | 'L4_CIRCULARS_AND_FORMS'
  | 'L5_STANDARDS_AND_AUDIT';

export interface LawRoadmapDocNode {
  id: string;
  docId?: string; // Liên kết trực tiếp tới LegalDocument trong kho SSOT nếu có
  docTypeBadge: string;
  docNumber: string;
  title: string;
  relationRole:
    | 'LUAT_GOC'
    | 'LUAT_SUA_DOI'
    | 'VB_HOP_NHAT'
    | 'ND_SUA_DOI'
    | 'ND_HUONG_DAN'
    | 'TT_HUONG_DAN'
    | 'QCVN_TCVN'
    | 'QUY_TRINH_KIEM_TOAN';
  relationLabel: string;
  effectiveNote: string;
  status: 'CON_HIEU_LUC' | 'SAP_CO_HIEU_LUC' | 'CHUYEN_TIEP' | 'HET_HIEU_LUC_MOT_PHAN';
  keyArticlesOrScope: string;
  replacesOrAmends?: string;
  linkedGates: string[];
  linkedDomains: FunctionalDomainCode[];
  projectAxes: ProjectArchetypeCode[];
}

export interface LawRoadmapTier {
  tierCode: LawRoadmapTierType;
  tierLevel: string;
  tierName: string;
  tierSubtitle: string;
  badgeColor: string;
  items: LawRoadmapDocNode[];
}

export interface LawEvolutionChain {
  id: string;
  domainCode: FunctionalDomainCode;
  domainTitle: string;
  steps: {
    stageLabel: string;
    docNumber: string;
    docId?: string;
    period: string;
    roleBadge: 'CU' | 'SUA_DOI_HOP_NHAT' | 'HIEN_HANH' | 'MOI_2026';
    note: string;
  }[];
}

export interface LawRoadmapPillar {
  id: string;
  shortName: string;
  fullName: string;
  rootLawNumber: string;
  rootDocId: string;
  icon: string;
  industryGroupId: string;
  primaryDomains: FunctionalDomainCode[];
  projectAxes: ProjectArchetypeCode[];
  summary: string;
  amendmentHistorySummary: string;
  evolutionChains: LawEvolutionChain[];
  tiers: LawRoadmapTier[];
}

// ============================================================================
// 3-WAY GATE LOCKING: PHÁP LÝ – QA/QC – DÒNG TIỀN THANH TOÁN (IPC & CASHFLOW)
// ============================================================================
export interface QaQcGateControlItem {
  id: string;
  kind: 'RFI' | 'ITP' | 'CO_CQ_QCVN16' | 'LAS_XD';
  code: string;
  title: string;
  gateRef: string;
  processId: string;
  projectAxes: ProjectArchetypeCode[];
  status: 'OPEN_PENDING' | 'CLOSED_VERIFIED';
  detailNote: string;
}

export interface GateCrossLockReason {
  ruleCode: 'A_RFI_ITP' | 'B_VLXD_LAS' | 'C_VO_UNAPPROVED' | 'D_BOND_EXPIRY';
  label: string;
  detail: string;
  actionLabel: string;
  targetTab: 'STEP3_PLAN' | 'STEP4_EXECUTE' | 'STEP5_AUDIT';
  targetProcessId?: string;
  targetStep5Mode?: 'FORENSIC_VO' | 'ENTERPRISE_4MODULES' | 'PORTFOLIO_DASHBOARD';
}

export interface GateCrossLockEvaluation {
  gateCode: string;
  isPaymentGate: boolean; // G7 - G15
  isBondApplicable: boolean; // G11 - G15
  isHardStopLocked: boolean;
  lockReasons: GateCrossLockReason[];
  allocatedVnd: number;
  acceptedVnd: number;
  disbursedVnd: number;
  blockedCapexVnd: number;
  pendingPayableVnd: number;
  performanceBondExpiry: string;
  advanceBondExpiry: string;
  perfBondDaysLeft: number;
  advBondDaysLeft: number;
  minBondDaysLeft: number;
  ipcTrancheCode: string;
  ipcTitle: string;
}

// ============================================================================
// LEGAL CUT-OFF ENGINE (ĐIỀU KHOẢN CHUYỂN TIẾP PHÁP LÝ) & CHỈ THỊ BAN QLDA
// ============================================================================
export type LegalCutoffFilterMode = 'CURRENT_VALID_ONLY' | 'PROJECT_TRANSITION';

export type LegalCutoffBadgeType =
  | 'TRANSITIONAL_OLD'
  | 'MANDATORY_NEW_RETROACTIVE'
  | 'DIRECT_NEW_2026'
  | 'CURRENT_VALID'
  | 'EXCLUDED_BY_CUTOFF';

export interface ProjectLegalMilestones {
  presetId: 'LEGACY_2023_2024' | 'NEW_2026' | 'CUSTOM';
  investmentPolicyDate: string; // (1) Ngày phê duyệt Chủ trương đầu tư (YYYY-MM-DD)
  projectDesignApprovalDate: string; // (2) Ngày phê duyệt Dự án / TKBVTC (YYYY-MM-DD)
  constructionContractDate: string; // (3) Ngày ký Hợp đồng xây dựng (YYYY-MM-DD)
}

export interface LegalCutoffEvaluation {
  included: boolean;
  badgeType: LegalCutoffBadgeType;
  badgeLabel: string;
  reason: string;
  basisLaw: string;
}

export interface ArticlePersonalNoteItem {
  text: string;
  updatedAt: string;
  author: string;
  docId?: string;
  docNumber?: string;
  nodeId?: string;
  nodeCode?: string;
  nodeTitle?: string;
  isSharedToGate?: boolean;
  targetGates?: string[];
  projectScope?: ProjectArchetypeCode | 'ALL';
}

// ============================================================================
// AI LEGAL GAP ANALYSIS & SEMANTIC DIFF HIGHLIGHTING (STEP 2 COMPARE MODE)
// ============================================================================
export type LegalDiffCategory = 'TIMELINE' | 'AUTHORITY' | 'TECHNICAL';

export interface AiCompareHighlightSpan {
  category: LegalDiffCategory;
  phrase: string;
  reason: string;
}

export interface AiCompareDifferenceItem {
  aspect: string;
  clauseAValue: string;
  clauseBValue: string;
  impactNote: string;
}

export interface AiLegalGapAnalysis {
  pairKey: string;
  summaryVerdict: string;
  timelineDifferences: AiCompareDifferenceItem[];
  authorityDifferences: AiCompareDifferenceItem[];
  technicalDifferences: AiCompareDifferenceItem[];
  recommendedAction: string;
  highlightTargetsA: AiCompareHighlightSpan[];
  highlightTargetsB: AiCompareHighlightSpan[];
  source: string;
  analyzedAt: string;
}

export interface FavoriteComparePair {
  id: string;
  pairKey: string;
  leftDocId: string;
  leftDocNumber: string;
  leftNodeId: string;
  leftNodeCode: string;
  leftNodeTitle: string;
  rightDocId: string;
  rightDocNumber: string;
  rightNodeId: string;
  rightNodeCode: string;
  rightNodeTitle: string;
  projectCode: ProjectArchetypeCode;
  customNote?: string;
  savedAt: string;
}

