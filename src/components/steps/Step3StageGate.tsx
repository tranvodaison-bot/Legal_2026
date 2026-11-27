import React from "react";
import {
  TAXONOMY_3D,
  LEGAL_CATEGORY_TREE,
  INITIAL_LEGAL_DOCS,
  CROSS_EXAM_TOPICS,
  INITIAL_GATES,
  QAQC_PROCESSES,
  INITIAL_EMPLOYEES,
  INITIAL_APPROVAL_WORKFLOWS,
  INITIAL_RACI_TASKS,
  INITIAL_ASSETS,
  INITIAL_AUDIT_LOGS,
  LAW_ROADMAPS,
  INITIAL_QAQC_CONTROLS,
} from "../../data/lexPmoData";
import {
  AiLegalGapAnalysis,
  AnalyzedFileItem,
  ApprovalWorkflowItem,
  ArticlePersonalNoteItem,
  AuditLogEntry,
  CdeIsoStatus,
  EmployeeUser,
  FavoriteComparePair,
  FolderNamingPresetCode,
  FunctionalDomainCode,
  GateCrossLockEvaluation,
  GateCrossLockReason,
  GateWorkflowStatus,
  LawRoadmapPillar,
  LawRoadmapTierType,
  LegalCutoffFilterMode,
  LegalDiffCategory,
  LegalDocument,
  NamingFormState,
  PendingDigitalSignoff,
  ProjectArchetypeCode,
  ProjectArchetypeItem,
  ProjectAssetItem,
  ProjectLegalMilestones,
  QaQcGateControlItem,
  QlvbNamingGroupCode,
  RaciTaskItem,
  RbacRoleCode,
  RenameLogEntry,
  StageGateItem,
  StageGatePhaseProgress,
  StageGateProgressSummary,
  VbplBreadcrumbPath,
  VbplNavigationLevel,
} from "../../types/lexPmoTypes";
import {
  classifyProjectCutoffRegime,
  DEFAULT_PROJECT_MILESTONES_MAP,
  evaluateLegalDocumentCutoff,
  PRESET_LEGACY_2023_2024,
  PRESET_NEW_2026,
} from "../../utils/legalCutoffEngine";
import {
  CDE_ISO_19650_META,
  CDE_ISO_19650_PIPELINE,
  computeFullSha256Hex,
  FOUR_PARTY_ROLES,
  getRaciActionPermissions,
} from "../../utils/rbacRaciHelpers";
import {
  buildFileNameByRule,
  buildStandardFolderPath,
  cleanDocNumber,
  computeSha256Short,
  createSampleBatchItems,
  detectQlvbGroup,
  extractOcrZonesFromText,
  extractTextFromFileEnhanced,
  formatFileSize,
  parseVietnameseLegalText,
  removeVietnameseTones,
  smartAnalyzeFile3D,
  toPascalCaseVN,
  validateBatchFileName,
} from "../../utils/legalParser";
import {
  DIFF_CATEGORY_META,
  extractLocalSemanticCues,
  splitTextByHighlightTargets,
} from "../../utils/legalCompareHighlighter";
import { AiLegalGapAnalysisCard } from "../AiLegalGapAnalysisCard";
import { ApprovalFlowD3Diagram } from "../ApprovalFlowD3Diagram";
import { LawGenealogyTreeDiagram } from "../LawGenealogyTreeDiagram";
import { Step5PortfolioDashboard } from "../Step5PortfolioDashboard";

const PROJECT_ARCHETYPE_ICONS: Record<ProjectArchetypeCode, string> = {
  HTKT: "🛣️",
  DAN_DUNG: "🏢",
  KCN: "🏭",
  CCN: "⚙️",
  FTZ: "🚢",
  PPP_BT: "🤝",
};

type ProjectPhaseFilter = "ALL" | "CHUAN_BI" | "THUC_HIEN" | "KET_THUC";

const PROJECT_PHASE_META: {
  id: Exclude<ProjectPhaseFilter, "ALL">;
  label: string;
  shortLabel: string;
  icon: string;
  gates: string[];
  gateRangeLabel: string;
  desc: string;
  activeClass: string;
  badgeClass: string;
}[] = [
  {
    id: "CHUAN_BI",
    label: "Chuẩn bị",
    shortLabel: "Chuẩn bị",
    icon: "📋",
    gates: ["G0", "G1", "G2", "G3", "G4", "G5", "G6"],
    gateRangeLabel: "G0–G6",
    desc: "Chủ trương ĐT, Quy hoạch, Đất đai, ĐTM, PCCC, BCNCKT & TKCS",
    activeClass: "bg-sky-500 text-slate-950 border-sky-300 font-bold shadow-xs",
    badgeClass: "bg-sky-500/20 text-sky-800 dark:text-sky-300 border-sky-500/40",
  },
  {
    id: "THUC_HIEN",
    label: "Thực hiện",
    shortLabel: "Thực hiện",
    icon: "🏗️",
    gates: ["G7", "G8", "G9", "G10", "G11", "G12", "G13"],
    gateRangeLabel: "G7–G13",
    desc: "TKBVTC - Dự toán, GPXD, Đấu thầu, Ký HĐ, Thi công, Nghiệm thu & Tạm ứng/TT",
    activeClass: "bg-amber-500 text-slate-950 border-amber-300 font-bold shadow-xs",
    badgeClass: "bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40",
  },
  {
    id: "KET_THUC",
    label: "Kết thúc",
    shortLabel: "Kết thúc",
    icon: "🏁",
    gates: ["G14", "G15"],
    gateRangeLabel: "G14–G15",
    desc: "Nghiệm thu hoàn thành đưa vào sử dụng, Bàn giao, Quyết toán vốn & Bảo hành",
    activeClass: "bg-emerald-500 text-slate-950 border-emerald-300 font-bold shadow-xs",
    badgeClass: "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/40",
  },
];

function matchesDocProjectPhase(doc: LegalDocument, phase: ProjectPhaseFilter): boolean {
  if (phase === "ALL") return true;
  if (phase === "CHUAN_BI") {
    return (
      doc.linkedGates.some(g => ["G0", "G1", "G2", "G3", "G4", "G5", "G6"].includes(g)) ||
      ["DTU", "QHDD"].includes(doc.primaryDomain)
    );
  }
  if (phase === "THUC_HIEN") {
    return (
      doc.linkedGates.some(g => ["G7", "G8", "G9", "G10", "G11", "G12", "G13"].includes(g)) ||
      ["DTH", "QLHD", "QLCP", "QLCL", "VLXD", "TCVN", "QCVN", "ATLD"].includes(doc.primaryDomain)
    );
  }
  if (phase === "KET_THUC") {
    return (
      doc.linkedGates.some(g => ["G14", "G15"].includes(g)) ||
      doc.primaryDomain === "TQT" ||
      doc.secondaryDomains.includes("TQT")
    );
  }
  return true;
}

function matchesDossierProjectPhase(gateRef: string, phase: ProjectPhaseFilter): boolean {
  if (phase === "ALL") return true;
  if (phase === "CHUAN_BI") return ["G0", "G1", "G2", "G3", "G4", "G5", "G6"].includes(gateRef);
  if (phase === "THUC_HIEN") return ["G7", "G8", "G9", "G10", "G11", "G12", "G13"].includes(gateRef);
  if (phase === "KET_THUC") return ["G14", "G15"].includes(gateRef);
  return true;
}

import type { StepContextType } from "../../App";

export interface Step3StageGateProps {
  ctx: StepContextType;
}

export const Step3StageGate: React.FC<Step3StageGateProps> = ({ ctx }) => {
  const {
    activeTab, setActiveTab,
    isSidebarCollapsed, setIsSidebarCollapsed,
    isStep2SidebarExpanded, setIsStep2SidebarExpanded,
    sidebarWidthPx, setSidebarWidthPx,
    isCol1SubDomainMenuOpen, setIsCol1SubDomainMenuOpen,
    col1ViewMode, setCol1ViewMode,
    expandedStandaloneSubDomains, setExpandedStandaloneSubDomains,
    expandedStandaloneProjects, setExpandedStandaloneProjects,
    projectCardSubTab, setProjectCardSubTab,
    vbplProjectPhaseFilter, setVbplProjectPhaseFilter,
    projectDocGroupMode, setProjectDocGroupMode,
    expandedProjectGates, setExpandedProjectGates,
    vbplGateFilter, setVbplGateFilter,
    globalSearch, setGlobalSearch,
    activeDragSplitter, setActiveDragSplitter,
    workspaceMainRef,
    step1LeftPct, setStep1LeftPct,
    vbplCol1Pct, setVbplCol1Pct,
    vbplCol2Pct, setVbplCol2Pct,
    isVbplCol1Collapsed, setIsVbplCol1Collapsed,
    isVbplCol2Collapsed, setIsVbplCol2Collapsed,
    step3Col1Pct, setStep3Col1Pct,
    step3Col2Pct, setStep3Col2Pct,
    step4Col1Pct, setStep4Col1Pct,
    step4Col2Pct, setStep4Col2Pct,
    startResizeSplitter, renderVerticalSplitter,
    activeProjectArchetype, setActiveProjectArchetype,
    activeProjectName, setActiveProjectName,
    employees, setEmployees,
    currentActorId, setCurrentActorId,
    currentActor, raciPerms,
    pendingDigitalSignoff, setPendingDigitalSignoff,
    gateTvgsVerifiedMap, setGateTvgsVerifiedMap,
    projectProfiles, setProjectProfiles,
    legalDocs, setLegalDocs,
    gates, setGates,
    approvalWorkflows, setApprovalWorkflows,
    raciTasks, setRaciTasks,
    projectAssets, setProjectAssets,
    qaqcControlRecords, setQaqcControlRecords,
    voAppendixApproved, setVoAppendixApproved,
    voState, setVoState,
    chronoDates, setChronoDates,
    auditLogs, setAuditLogs,
    toastMsg, setToastMsg,
    showToast, recordAuditLog,
    currentArchetypeMeta, chronoAuditStatus,
    formatVndBillions, calcDaysUntilReference,
    isDragging, setIsDragging,
    isAnalyzingFile, setIsAnalyzingFile,
    deepScanReadMode, setDeepScanReadMode,
    batchNamingStandard, setBatchNamingStandard,
    folderNamingPreset, setFolderNamingPreset,
    batchFilterKind, setBatchFilterKind,
    batchFilterCde, setBatchFilterCde,
    batchFindText, setBatchFindText,
    batchReplaceText, setBatchReplaceText,
    batchSuffixInput, setBatchSuffixInput,
    activeBatchItemId, setActiveBatchItemId,
    step1RightSubTab, setStep1RightSubTab,
    readerKeywordSearch, setReaderKeywordSearch,
    droppedFilesQueue, setDroppedFilesQueue,
    renameLogs, setRenameLogs,
    activeRawFile, setActiveRawFile,
    fileInputRef, folderInputRef,
    namingForm, setNamingForm,
    generatedFileName, currentOcrZones, parsedPreviewNodes,
    validatedBatchQueue, duplicateHashItems, filteredBatchQueue,
    toggleProjectAxis, toggleSecondaryDomain, toggleLinkedGate,
    handleProcessFiles, handleChangeCdeStatus, handleDuplicateSha256Action,
    handleRecomputeBatchNames, handleBatchFindReplaceAndFormat,
    handleCommitBatchRename, handleUndoRenameLog,
    handleExportBatchRenameArtifact, handleDownloadRenamedFile,
    vbplSubMode, setVbplSubMode,
    categorySearch, setCategorySearch,
    filterTreeByActiveProject, setFilterTreeByActiveProject,
    expandedCatGroups, setExpandedCatGroups,
    expandedIndustryDocCatalog, setExpandedIndustryDocCatalog,
    expandedSubDomains, setExpandedSubDomains,
    expandedProjectGroups, setExpandedProjectGroups,
    vbplIndustryGroupFilter, setVbplIndustryGroupFilter,
    vbplSubSectorFilter, setVbplSubSectorFilter,
    vbplDomainFilter, setVbplDomainFilter,
    vbplProjectFilter, setVbplProjectFilter,
    pane2SubTab, setPane2SubTab,
    exactMatchAccent, setExactMatchAccent,
    filterDocType, setFilterDocType,
    filterValidityPeriod, setFilterValidityPeriod,
    selectedDocId, setSelectedDocId,
    expandedInlineDocId, setExpandedInlineDocId,
    bookmarkedDocIds, setBookmarkedDocIds,
    recentDocIds, setRecentDocIds,
    activeNodeId, setActiveNodeId,
    rightReaderMode, setRightReaderMode,
    readerFontSize, setReaderFontSize,
    selectedCrossExamId, setSelectedCrossExamId,
    selectedRoadmapPillarId, setSelectedRoadmapPillarId,
    roadmapTierFilter, setRoadmapTierFilter,
    isCol2CompactMode, setIsCol2CompactMode,
    techStandardQuickFilter, setTechStandardQuickFilter,
    compareLeftDocId, setCompareLeftDocId,
    compareLeftNodeId, setCompareLeftNodeId,
    compareRightDocId, setCompareRightDocId,
    compareRightNodeId, setCompareRightNodeId,
    highlightTextDiff, setHighlightTextDiff,
    semanticHighlightEnabled, setSemanticHighlightEnabled,
    compareCategoryFilter, setCompareCategoryFilter,
    aiCompareCache, setAiCompareCache,
    lastCompletedAiPairKey, setLastCompletedAiPairKey,
    isAiCompareLoading, setIsAiCompareLoading,
    aiCompareError, setAiCompareError,
    favoriteComparePairs, setFavoriteComparePairs,
    showFavoritesDrawer, setShowFavoritesDrawer,
    editingFavNoteId, setEditingFavNoteId,
    favNoteDraft, setFavNoteDraft,
    handleToggleFavoriteComparePair, handleSaveFavoritePairNote,
    projectLegalDatesMap, setProjectLegalDatesMap,
    legalCutoffMode, setLegalCutoffMode,
    activeProjectMilestones, activeProjectCutoffRegime,
    applyProjectMilestonePreset, updateProjectMilestoneField,
    articlePersonalNotes, setArticlePersonalNotes,
    editingNoteKey, setEditingNoteKey,
    noteDraftText, setNoteDraftText,
    noteDraftSharedToGate, setNoteDraftSharedToGate,
    noteDraftTargetGates, setNoteDraftTargetGates,
    noteDraftProjectScope, setNoteDraftProjectScope,
    filterOnlyNotedNodes, setFilterOnlyNotedNodes,
    getArticleNoteKey, openArticleNoteEditor, toggleDraftTargetGate,
    saveArticlePersonalNote, toggleShareNoteToGate, deleteArticlePersonalNote,
    resolveRoadmapPillarIdForDoc, openLawRoadmapForDoc,
    getSelectableArticleNodes, handleChangeCompareDoc,
    sendArticleToCompare, swapCompareSides,
    normalizeCompareWord, renderWordDiffChunk, renderDiffHighlightedText,
    handleRunAiLegalCompare, activeIndustryGroup, activeSubSector,
    handleSaveToSSOT, toggleBookmarkDoc, handleSelectDoc, handleSelectDocFromColumn1,
    isDocQcvn, isDocTcvn, qcvnTcvnCounts,
    filteredLegalDocs, currentLegalDoc, vbplBreadcrumbPath,
    handleBreadcrumbToRoot, handleBreadcrumbToIndustry,
    handleBreadcrumbToSubSector, handleBreadcrumbToDocument,
    handleBreadcrumbStepBack, jumpToArticleNode,
    selectedGateCode, setSelectedGateCode,
    checkedAuditItems, setCheckedAuditItems,
    projectGateStatusMap, setProjectGateStatusMap,
    evaluateGateCrossLock, projectScopedGates,
    currentGate, currentStep, currentGateCrossLock, stageGateProgressSummary,
    gateRiskAiReports, setGateRiskAiReports,
    analyzingGateStepKey, setAnalyzingGateStepKey,
    handleAnalyzeStepRiskByAI,
    selectedProcessId, setSelectedProcessId,
    selectedFlowStepIdx, setSelectedFlowStepIdx,
    showFormPreviewModal, setShowFormPreviewModal,
    customDiaryEntries, setCustomDiaryEntries,
    currentProcess, currentFlowStep,
    step5SubMode, setStep5SubMode,
    enterpriseModuleTab, setEnterpriseModuleTab,
    selectedD3UnitFilter, setSelectedD3UnitFilter,
    filteredApprovalWorkflows,
    handleUpdateGateStatus, handleTvgsVerifyGate,
    handleSubmitGateIpcPayment, handleToggleQaQcControl,
    handleRenewProjectBonds, handleApproveWorkflow,
    handleCreateVoOrRfiRequest, handleAdvanceTaskStatus, handleCalibrateAsset,
    activeAiAgent, setActiveAiAgent,
    aiPromptInput, setAiPromptInput,
    aiOutputText, setAiOutputText,
    aiEngineSource, setAiEngineSource,
    isAiRunning, setIsAiRunning,
    AI_AGENTS_LIST, runMultiAgentAnalysis,
  } = ctx;

  return (
    <>
          {activeTab === 'STEP3_PLAN' && (
            <div className="h-full flex flex-col overflow-hidden">
              {/* THANH TIẾN ĐỘ TỔNG THỂ STAGE-GATE (OVERALL STAGE-GATE PROGRESS BAR) Ở PHÍA TRÊN CÙNG BƯỚC 3 */}
              <div className="px-4 py-3 bg-[var(--panel)] border-b border-[var(--line)] space-y-2.5 shrink-0">
                {/* Hàng 1: Tiêu đề Lộ trình Dự án + Chọn nhanh Loại hình Dự án + Tỷ lệ % Tiến độ tổng thể */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-800 dark:text-amber-300 font-mono text-[11px] font-bold">
                      TIẾN ĐỘ LỘ TRÌNH STAGE-GATE [{stageGateProgressSummary.projectCode}]
                    </span>
                    <span className="text-xs font-bold text-[var(--chu)]">
                      {stageGateProgressSummary.projectName}
                    </span>
                    <span className="text-[11px] font-mono text-emerald-800 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded">
                      Thẩm quyền: {stageGateProgressSummary.authority}
                    </span>
                  </div>

                  {/* Bộ chọn Loại hình Dự án & Chỉ số % Tổng thể */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1 bg-[var(--giay)] p-1 rounded-lg border border-[var(--line)]">
                      {TAXONOMY_3D.projectTypes.map(pt => (
                        <button
                          key={pt.code}
                          onClick={() => setActiveProjectArchetype(pt.code)}
                          className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition whitespace-nowrap ${
                            activeProjectArchetype === pt.code
                              ? 'bg-amber-500 text-slate-950 shadow'
                              : 'text-[var(--chu-m)] hover:text-[var(--chu)]'
                          }`}
                          title={`Chuyển sang lộ trình Stage-Gate của dự án ${pt.name}`}
                        >
                          {pt.code}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-[var(--giay)] border border-[var(--line)]">
                      <div className="text-right">
                        <div className="text-[10px] font-mono text-[var(--chu-m)] uppercase">
                          Đã thông qua cổng (APPROVED)
                        </div>
                        <div className="text-xs font-mono font-extrabold text-emerald-800 dark:text-emerald-400 tabular-nums">
                          {stageGateProgressSummary.approvedCount}/{stageGateProgressSummary.totalGates} Gate ({stageGateProgressSummary.strictCompletionPct}%)
                        </div>
                      </div>
                      <div className="h-6 w-px bg-[var(--giay-d)]" />
                      <div className="text-right">
                        <div className="text-[10px] font-mono text-[var(--chu-m)] uppercase">
                          Tiến độ Lộ trình Trọng số
                        </div>
                        <div className="text-xs font-mono font-extrabold text-amber-800 dark:text-amber-400 tabular-nums">
                          {stageGateProgressSummary.weightedProgressPct}% · Hồ sơ {stageGateProgressSummary.checklistPct}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hàng 2: Thanh Progress Bar đa phân đoạn (Multi-Segment Progress Bar) + Chú giải trạng thái */}
                <div className="space-y-1.5">
                  <div className="relative h-3.5 w-full rounded-full bg-[var(--giay)] border border-[var(--line)] overflow-hidden flex shadow-inner">
                    {/* Phân đoạn 1: Đã duyệt (APPROVED) */}
                    {stageGateProgressSummary.approvedPctWidth > 0 && (
                      <div
                        style={{ width: `${stageGateProgressSummary.approvedPctWidth}%` }}
                        className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500 flex items-center justify-center"
                        title={`Đã duyệt qua cổng (APPROVED): ${stageGateProgressSummary.approvedCount} Gate (${stageGateProgressSummary.approvedPctWidth}%)`}
                      >
                        {stageGateProgressSummary.approvedPctWidth >= 14 && (
                          <span className="text-[9px] font-mono font-extrabold text-slate-950">
                            {stageGateProgressSummary.approvedPctWidth}% ĐÃ DUYỆT
                          </span>
                        )}
                      </div>
                    )}
                    {/* Phân đoạn 2: Đang thẩm định (IN_REVIEW) */}
                    {stageGateProgressSummary.inReviewPctWidth > 0 && (
                      <div
                        style={{ width: `${stageGateProgressSummary.inReviewPctWidth}%` }}
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500 flex items-center justify-center"
                        title={`Đang trình thẩm định (IN_REVIEW): ${stageGateProgressSummary.inReviewCount} Gate (${stageGateProgressSummary.inReviewPctWidth}%)`}
                      >
                        {stageGateProgressSummary.inReviewPctWidth >= 10 && (
                          <span className="text-[9px] font-mono font-extrabold text-slate-950">
                            {stageGateProgressSummary.inReviewPctWidth}%
                          </span>
                        )}
                      </div>
                    )}
                    {/* Phân đoạn 3: Chặn Hard-Stop (HARD_STOP_BLOCKED) */}
                    {stageGateProgressSummary.blockedPctWidth > 0 && (
                      <div
                        style={{ width: `${stageGateProgressSummary.blockedPctWidth}%` }}
                        className="h-full bg-gradient-to-r from-rose-600 to-rose-500 transition-all duration-500 flex items-center justify-center"
                        title={`Chặn Hard-Stop (BLOCKED): ${stageGateProgressSummary.blockedCount} Gate (${stageGateProgressSummary.blockedPctWidth}%)`}
                      >
                        {stageGateProgressSummary.blockedPctWidth >= 10 && (
                          <span className="text-[9px] font-mono font-extrabold text-[var(--chu)]">
                            {stageGateProgressSummary.blockedPctWidth}%
                          </span>
                        )}
                      </div>
                    )}
                    {/* Phân đoạn 4: Bản thảo / Chưa mở (DRAFT) */}
                    {stageGateProgressSummary.draftPctWidth > 0 && (
                      <div
                        style={{ width: `${stageGateProgressSummary.draftPctWidth}%` }}
                        className="h-full bg-[var(--panel)] transition-all duration-500"
                        title={`Bản thảo / Chưa mở cổng (DRAFT): ${stageGateProgressSummary.draftCount} Gate (${stageGateProgressSummary.draftPctWidth}%)`}
                      />
                    )}
                  </div>

                  {/* Dải chỉ số trạng thái + Tiến độ theo 3 Giai đoạn Đầu tư Xây dựng */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-3 flex-wrap font-mono">
                      <span className="inline-flex items-center gap-1.5 text-emerald-800 dark:text-emerald-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        ĐÃ DUYỆT: <b>{stageGateProgressSummary.approvedCount}</b>
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-amber-800 dark:text-amber-400">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        ĐANG THẨM ĐỊNH: <b>{stageGateProgressSummary.inReviewCount}</b>
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-rose-800 dark:text-rose-400">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        CHẶN HARD-STOP: <b>{stageGateProgressSummary.blockedCount}</b>
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[var(--chu-m)]">
                        <span className="w-2 h-2 rounded-full bg-slate-600" />
                        BẢN THẢO: <b>{stageGateProgressSummary.draftCount}</b>
                      </span>
                    </div>

                    {/* Tiến độ theo 3 Giai đoạn dự án */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {stageGateProgressSummary.phaseBreakdown.map(ph => (
                        <span
                          key={ph.phase}
                          className="px-2 py-0.5 rounded bg-[var(--giay)] border border-[var(--line)] text-[10px] font-mono text-[var(--chu-m)]"
                        >
                          {ph.phase.replace('Giai đoạn ', 'GĐ ')}:{' '}
                          <b className={ph.pct === 100 ? 'text-emerald-800 dark:text-emerald-400' : 'text-amber-800 dark:text-amber-400'}>
                            {ph.approved}/{ph.total} ({ph.pct}%)
                          </b>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Hàng 3: Dải Nút Mốc Lộ Trình Tương tác (Interactive Stage-Gate Milestone Stepper G0 -> G15) */}
                <div className="pt-1 flex items-center gap-1.5 overflow-x-auto pb-0.5">
                  {projectScopedGates.map((g, idx) => {
                    const isSelected = g.gate === selectedGateCode;
                    const st = g.status || 'DRAFT';
                    const nodeStyle =
                      st === 'APPROVED'
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/25'
                        : st === 'HARD_STOP_BLOCKED'
                        ? 'bg-rose-500/20 border-rose-500/60 text-rose-800 dark:text-rose-300 hover:bg-rose-500/30'
                        : st === 'IN_REVIEW'
                        ? 'bg-amber-500/20 border-amber-500/60 text-amber-900 dark:text-amber-200 hover:bg-amber-500/30'
                        : 'bg-[var(--giay)] border-[var(--line)] text-[var(--chu-m)] hover:border-[var(--line-d)]';

                    const dotIcon =
                      st === 'APPROVED'
                        ? '✓'
                        : st === 'HARD_STOP_BLOCKED'
                        ? '⛔'
                        : st === 'IN_REVIEW'
                        ? '⏳'
                        : '○';

                    return (
                      <React.Fragment key={g.gate}>
                        <button
                          onClick={() => setSelectedGateCode(g.gate)}
                          title={`${g.gate}: ${g.name} (${st})`}
                          className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono transition shrink-0 ${nodeStyle} ${
                            isSelected ? 'ring-2 ring-amber-400 shadow-md scale-[1.02]' : ''
                          }`}
                        >
                          <span className="font-bold">{dotIcon}</span>
                          <span className="font-extrabold">{g.gate}</span>
                          <span className="hidden xl:inline text-[10px] opacity-85 max-w-[115px] truncate">
                            {g.name.split('(')[0].trim()}
                          </span>
                        </button>
                        {idx < projectScopedGates.length - 1 && (
                          <div
                            className={`h-0.5 w-3 shrink-0 rounded ${
                              st === 'APPROVED' ? 'bg-emerald-500/60' : 'bg-[var(--giay-d)]'
                            }`}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}

                  {stageGateProgressSummary.activeBottleneckGate && (
                    <button
                      onClick={() =>
                        setSelectedGateCode(stageGateProgressSummary.activeBottleneckGate!.gate)
                      }
                      className="ml-auto px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-800 dark:text-rose-300 font-mono text-[10px] font-bold whitespace-nowrap shrink-0 transition"
                      title="Nhảy nhanh tới cổng đang bị chặn Hard-Stop hoặc đang chờ thẩm định"
                    >
                      ⚡ Xử lý điểm nghẽn: {stageGateProgressSummary.activeBottleneckGate.gate} →
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Cột 1: Danh sách Cổng Stage-Gate kèm trạng thái (Co giãn) */}
                <div
                  style={{ width: `${step3Col1Pct}%` }}
                  className="w-full lg:shrink-0 min-w-[210px] overflow-y-auto p-3 space-y-2 bg-[var(--giay)]"
                >
                  {projectScopedGates.map(g => {
                    const isSelected = g.gate === selectedGateCode;
                    const statusLabel =
                      g.status === 'APPROVED'
                        ? 'ĐÃ DUYỆT'
                        : g.status === 'HARD_STOP_BLOCKED'
                        ? 'CHẶN HARD-STOP'
                        : g.status === 'IN_REVIEW'
                        ? 'ĐANG THẨM ĐỊNH'
                        : 'BẢN THẢO';
                    const statusColor =
                      g.status === 'APPROVED'
                        ? 'text-emerald-800 dark:text-emerald-400'
                        : g.status === 'HARD_STOP_BLOCKED'
                        ? 'text-rose-800 dark:text-rose-400'
                        : g.status === 'IN_REVIEW'
                        ? 'text-amber-800 dark:text-amber-400'
                        : 'text-[var(--chu-m)]';

                    return (
                      <button
                        key={g.gate}
                        onClick={() => setSelectedGateCode(g.gate)}
                        className={`w-full text-left p-3 rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-500 text-[var(--chu)]'
                            : 'bg-[var(--panel)]/60 border-[var(--line)] text-[var(--chu-m)] hover:bg-[var(--panel)]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-amber-500 text-slate-950">
                            {g.gate}
                          </span>
                          <span className={`text-[10px] font-mono font-semibold ${statusColor}`}>
                            {statusLabel}
                          </span>
                        </div>
                        <div className="text-xs font-semibold leading-snug">{g.name}</div>
                        <div className="text-[10px] font-mono text-[var(--chu-m)] mt-1">
                          Chức năng: {g.functionalTags.join(' · ')}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Thanh kéo co giãn giữa Cột 1 và Cột 2 Bước 3 */}
                {renderVerticalSplitter({
                  id: 'STEP3_SPLIT_1',
                  onDoubleClickReset: () => {
                    setStep3Col1Pct(24);
                    showToast('Đã đặt lại độ rộng Cột 1 Bước 3 (24%)');
                  },
                  label: `Cột 1: ${Math.round(step3Col1Pct)}%`,
                })}

                {/* Cột 2: Đặc thù Pháp lý theo Loại hình Dự án + Ma trận RACI 4 Bên (Co giãn) */}
                <div
                  style={{ width: `${step3Col2Pct}%` }}
                  className="w-full lg:shrink-0 min-w-[280px] overflow-y-auto p-5 space-y-4"
                >
                  <div className="bg-[var(--panel)] border border-sky-500/40 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-sky-800 dark:text-sky-400">
                        CHỈ DẪN ĐẶC THÙ CHO DỰ ÁN [{activeProjectArchetype}] TẠI {currentGate.gate}
                      </span>
                      <span className="text-[11px] font-mono text-sky-800 dark:text-sky-300">
                        {currentArchetypeMeta.authority}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--chu)] leading-relaxed">
                      {currentGate.projectNotes[activeProjectArchetype]}
                    </p>
                  </div>

                  {/* Điều khiển Chuyển trạng thái Gate (State Transition + RBAC / RACI 4 Bên) */}
                  <div className="bg-[var(--panel)] border border-[var(--line)] rounded-xl p-4 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[var(--chu)]">
                          Trạng thái Phê duyệt Cổng {currentGate.gate} (RACI 4 Bên):
                        </span>
                        {gateTvgsVerifiedMap[`${activeProjectArchetype}::${currentGate.gate}`] && (
                          <span className="px-2 py-0.5 rounded bg-sky-500/20 border border-sky-400/50 text-sky-800 dark:text-sky-300 font-mono text-[10px] font-bold">
                            ✓ TVGS Đã xác nhận kỹ thuật
                          </span>
                        )}
                      </div>
                      <span
                        className={`font-mono font-bold ${
                          currentGate.status === 'HARD_STOP_BLOCKED'
                            ? 'text-rose-800 dark:text-rose-400'
                            : currentGate.status === 'APPROVED'
                            ? 'text-emerald-800 dark:text-emerald-400'
                            : 'text-amber-800 dark:text-amber-400'
                        }`}
                      >
                        {currentGate.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          { code: 'DRAFT', label: '1. Chuẩn bị hồ sơ (DRAFT)' },
                          { code: 'IN_REVIEW', label: '2. Nộp hồ sơ / Trình duyệt (IN_REVIEW)' },
                        ] as Array<{ code: GateWorkflowStatus; label: string }>
                      ).map(st => {
                        const blockedByUnlock =
                          currentGate.status === 'HARD_STOP_BLOCKED' && !raciPerms.canUnlockHardStop;
                        return (
                          <button
                            key={st.code}
                            type="button"
                            disabled={blockedByUnlock}
                            onClick={() => handleUpdateGateStatus(currentGate.gate, st.code)}
                            title={
                              blockedByUnlock
                                ? 'Cổng đang bị Hard-Stop — Chỉ Chủ đầu tư (CĐT) mới có quyền mở khóa'
                                : 'Thực hiện theo quyền R (Nộp/Chuẩn bị hồ sơ)'
                            }
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition whitespace-nowrap disabled:opacity-45 disabled:cursor-not-allowed ${
                              currentGate.status === st.code
                                ? 'bg-amber-500 text-slate-950 border-amber-400'
                                : 'bg-[var(--giay)] text-[var(--chu-m)] border-[var(--line)] hover:border-[var(--line-d)]'
                            }`}
                          >
                            {st.label}
                          </button>
                        );
                      })}

                      {/* Nút TVGS Xác nhận kỹ thuật / Nghiệm thu */}
                      <button
                        type="button"
                        disabled={!raciPerms.canTvgsVerify}
                        onClick={() => handleTvgsVerifyGate(currentGate.gate)}
                        title={
                          raciPerms.canTvgsVerify
                            ? 'TVGS ký số xác nhận kỹ thuật, QA/QC & khối lượng tại Gate này'
                            : raciPerms.isContractor
                            ? 'Yêu cầu quyền TVGS / Chủ đầu tư'
                            : 'Chỉ Tư vấn Giám sát (TVGS) mới được xác nhận kỹ thuật & nghiệm thu'
                        }
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed ${
                          gateTvgsVerifiedMap[`${activeProjectArchetype}::${currentGate.gate}`]
                            ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold'
                            : 'bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-500/40 hover:bg-sky-500/25'
                        }`}
                      >
                        🔍 TVGS Xác nhận kỹ thuật
                      </button>

                      {/* Nút CĐT Phê duyệt cuối cùng */}
                      <button
                        type="button"
                        disabled={!raciPerms.canCdtFinalApprove || currentGateCrossLock.isHardStopLocked}
                        onClick={() => handleUpdateGateStatus(currentGate.gate, 'APPROVED')}
                        title={
                          !raciPerms.canCdtFinalApprove
                            ? raciPerms.isContractor
                              ? 'Yêu cầu quyền TVGS / Chủ đầu tư'
                              : 'Chỉ Chủ đầu tư (CĐT - Accountable) mới có quyền Phê duyệt cuối cùng'
                            : currentGateCrossLock.isHardStopLocked
                            ? 'Đang bị Khóa chéo 3 Trục (Hard-Stop) — Cần gỡ điểm nghẽn trước khi phê duyệt'
                            : 'CĐT ký số Phê duyệt cuối cùng qua cổng Stage-Gate'
                        }
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed ${
                          currentGate.status === 'APPROVED'
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                            : 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30'
                        }`}
                      >
                        ✓ CĐT Phê duyệt cuối cùng (APPROVED)
                      </button>

                      {/* Nút Trả lại bổ sung / Chặn Hard-Stop */}
                      <button
                        type="button"
                        disabled={!raciPerms.canReturnForSupplement}
                        onClick={() => handleUpdateGateStatus(currentGate.gate, 'HARD_STOP_BLOCKED')}
                        title={
                          raciPerms.canReturnForSupplement
                            ? 'Trả lại yêu cầu bổ sung hồ sơ hoặc kích hoạt Chặn Hard-Stop'
                            : 'Yêu cầu quyền TVGS / Chủ đầu tư'
                        }
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed ${
                          currentGate.status === 'HARD_STOP_BLOCKED'
                            ? 'bg-rose-500 text-white border-rose-400'
                            : 'bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/40 hover:bg-rose-500/25'
                        }`}
                      >
                        ↩️ Trả lại / Chặn Hard-Stop
                      </button>

                      {/* Nút Mở khóa cổng Hard-Stop (Chỉ CĐT) */}
                      {currentGate.status === 'HARD_STOP_BLOCKED' && (
                        <button
                          type="button"
                          disabled={!raciPerms.canUnlockHardStop}
                          onClick={() => handleUpdateGateStatus(currentGate.gate, 'IN_REVIEW')}
                          title={
                            raciPerms.canUnlockHardStop
                              ? 'Chủ đầu tư ký số Mở khóa cổng Hard-Stop để tiếp tục thẩm định'
                              : 'Chỉ Chủ đầu tư (CĐT) mới có quyền mở khóa cổng Hard-Stop'
                          }
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-amber-400 bg-amber-500 text-slate-950 hover:bg-amber-400 transition whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          🔓 CĐT Mở khóa Cổng Hard-Stop
                        </button>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-[var(--chu-m)] pt-0.5">
                      Phiên hiện tại: <b className="text-amber-800 dark:text-amber-300">{currentActor.rbacRole}</b> —{' '}
                      {raciPerms.isContractor
                        ? 'Nhà thầu chỉ được Nộp hồ sơ & Tạo yêu cầu VO/RFI (Các nút TVGS/CĐT đang khóa).'
                        : raciPerms.isTvgs
                        ? 'TVGS được Xác nhận kỹ thuật / Trả lại bổ sung (Nút CĐT Phê duyệt cuối đang khóa).'
                        : raciPerms.isBqlda
                        ? 'PMU được Trình thẩm định / Trả lại bổ sung (Nút TVGS & CĐT Phê duyệt cuối đang khóa).'
                        : 'Chủ đầu tư có toàn quyền Phê duyệt cuối cùng & Mở khóa cổng Hard-Stop (Ký số SHA-256).'}
                    </div>
                  </div>

                  {/* THẺ KIỂM SOÁT GIẢI NGÂN & ĐIỀU KIỆN THANH TOÁN (IPC) CHO CỔNG G7–G15 */}
                  {currentGateCrossLock.isPaymentGate && (
                    <div
                      className={`rounded-xl border-2 p-4 space-y-3 shadow-md ${
                        currentGateCrossLock.isHardStopLocked
                          ? 'bg-rose-500/10 dark:bg-gradient-to-br dark:from-rose-950/60 dark:via-slate-900 dark:to-slate-950 border-rose-500/70'
                          : 'bg-emerald-500/10 dark:bg-gradient-to-br dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-950 border-emerald-500/60'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="text-xs font-extrabold text-[var(--chu)] flex items-center gap-1.5">
                            <span>💰</span>
                            <span>
                              Kiểm soát Giải ngân & Điều kiện Thanh toán (IPC) · {currentGate.gate}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-[var(--chu-m)]">
                            Đợt thanh toán: <b className="text-amber-800 dark:text-amber-300">{currentGateCrossLock.ipcTrancheCode}</b> —{' '}
                            {currentGateCrossLock.ipcTitle}
                          </div>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-extrabold border ${
                            currentGateCrossLock.isHardStopLocked
                              ? 'bg-rose-500 text-white border-rose-400 animate-pulse'
                              : 'bg-emerald-500 text-slate-950 border-emerald-400'
                          }`}
                        >
                          {currentGateCrossLock.isHardStopLocked
                            ? '🔒 KHÓA HARD-STOP (3-WAY LOCK)'
                            : '🔓 MỞ KHÓA THANH TOÁN IPC'}
                        </span>
                      </div>

                      {/* 4 chỉ số tài chính của Gate */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono tabular-nums">
                        <div className="p-2.5 rounded-lg bg-[var(--giay)] border border-[var(--line)]">
                          <div className="text-[10px] text-[var(--chu-m)]">Giá trị HĐ tại Gate</div>
                          <div className="font-bold text-[var(--chu)] mt-0.5">
                            {formatVndBillions(currentGateCrossLock.allocatedVnd)}
                          </div>
                        </div>
                        <div className="p-2.5 rounded-lg bg-[var(--giay)] border border-[var(--line)]">
                          <div className="text-[10px] text-[var(--chu-m)]">Đã nghiệm thu</div>
                          <div className="font-bold text-sky-800 dark:text-sky-300 mt-0.5">
                            {formatVndBillions(currentGateCrossLock.acceptedVnd)}
                          </div>
                        </div>
                        <div className="p-2.5 rounded-lg bg-[var(--giay)] border border-[var(--line)]">
                          <div className="text-[10px] text-[var(--chu-m)]">Đã giải ngân</div>
                          <div className="font-bold text-emerald-800 dark:text-emerald-400 mt-0.5">
                            {formatVndBillions(currentGateCrossLock.disbursedVnd)}
                          </div>
                        </div>
                        <div
                          className={`p-2.5 rounded-lg border ${
                            currentGateCrossLock.blockedCapexVnd > 0
                              ? 'bg-rose-500/10 dark:bg-rose-950/40 border-rose-500/60'
                              : 'bg-[var(--giay)] border-[var(--line)]'
                          }`}
                        >
                          <div className="text-[10px] text-[var(--chu-m)]">Đang bị treo (Blocked)</div>
                          <div
                            className={`font-extrabold mt-0.5 ${
                              currentGateCrossLock.blockedCapexVnd > 0
                                ? 'text-rose-800 dark:text-rose-300'
                                : 'text-emerald-800 dark:text-emerald-400'
                            }`}
                          >
                            {formatVndBillions(currentGateCrossLock.blockedCapexVnd)}
                          </div>
                        </div>
                      </div>

                      {/* Tình trạng Bảo lãnh thực hiện HĐ & Bảo lãnh Tạm ứng */}
                      {currentGateCrossLock.isBondApplicable && (
                        <div className="p-2.5 rounded-lg bg-[var(--giay)] border border-[var(--line)] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                          <div className="flex flex-wrap items-center gap-3">
                            <span
                              className={
                                currentGateCrossLock.perfBondDaysLeft < 15
                                  ? 'text-rose-800 dark:text-rose-300 font-bold'
                                  : 'text-emerald-800 dark:text-emerald-300'
                              }
                            >
                              🛡️ Bảo lãnh THHĐ: {currentGateCrossLock.performanceBondExpiry} (
                              {currentGateCrossLock.perfBondDaysLeft < 0
                                ? `Hết hạn ${Math.abs(currentGateCrossLock.perfBondDaysLeft)} ngày`
                                : `còn ${currentGateCrossLock.perfBondDaysLeft} ngày`}
                              )
                            </span>
                            <span
                              className={
                                currentGateCrossLock.advBondDaysLeft < 15
                                  ? 'text-rose-800 dark:text-rose-300 font-bold'
                                  : 'text-sky-800 dark:text-sky-300'
                              }
                            >
                              🏦 Bảo lãnh Tạm ứng: {currentGateCrossLock.advanceBondExpiry} (
                              {currentGateCrossLock.advBondDaysLeft < 0
                                ? `Hết hạn ${Math.abs(currentGateCrossLock.advBondDaysLeft)} ngày`
                                : `còn ${currentGateCrossLock.advBondDaysLeft} ngày`}
                              )
                            </span>
                          </div>
                          {currentGateCrossLock.minBondDaysLeft < 15 && (
                            <button
                              type="button"
                              onClick={() => handleRenewProjectBonds(activeProjectArchetype)}
                              className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] transition"
                            >
                              🛡️ Gia hạn Bảo lãnh (+180 ngày)
                            </button>
                          )}
                        </div>
                      )}

                      {/* Chi tiết 4 Quy tắc Chặn tự động liên hoàn (Hard-Stop Cross-Locking) */}
                      {currentGateCrossLock.isHardStopLocked ? (
                        <div className="space-y-2">
                          <div className="text-[11px] font-mono font-bold text-rose-800 dark:text-rose-300 uppercase">
                            ⛔ Phát hiện {currentGateCrossLock.lockReasons.length} Vi phạm Khóa chéo — Bắt buộc xử lý để mở khóa IPC:
                          </div>
                          {currentGateCrossLock.lockReasons.map(reason => (
                            <div
                              key={reason.ruleCode}
                              className="p-2.5 rounded-lg bg-[var(--giay)] border border-rose-500/40 flex flex-wrap items-center justify-between gap-2 text-xs"
                            >
                              <div className="space-y-0.5 flex-1 min-w-[200px]">
                                <div className="font-bold text-rose-800 dark:text-rose-300">{reason.label}</div>
                                <div className="text-[11px] text-[var(--chu-m)] leading-snug">
                                  {reason.detail}
                                </div>
                              </div>
                              {reason.ruleCode === 'D_BOND_EXPIRY' ? (
                                <button
                                  type="button"
                                  onClick={() => handleRenewProjectBonds(activeProjectArchetype)}
                                  className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] shrink-0 transition"
                                >
                                  {reason.actionLabel}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (reason.targetTab === 'STEP4_EXECUTE') {
                                      if (reason.targetProcessId) {
                                        setSelectedProcessId(reason.targetProcessId);
                                        setSelectedFlowStepIdx(0);
                                      }
                                      setActiveTab('STEP4_EXECUTE');
                                    } else if (reason.targetTab === 'STEP5_AUDIT') {
                                      if (reason.targetStep5Mode) {
                                        setStep5SubMode(reason.targetStep5Mode);
                                      }
                                      setActiveTab('STEP5_AUDIT');
                                    }
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-bold text-[11px] shrink-0 transition"
                                >
                                  {reason.actionLabel}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-lg bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                          <span>✅</span>
                          <span>
                            <b>Đạt chuẩn 3-Way Gate Locking:</b> Đã đóng RFI/ITP Bước 4, đủ CO/CQ QCVN 16:2023 & LAS-XD, không vướng VO chưa duyệt và Bảo lãnh còn hiệu lực &ge; 15 ngày.
                          </span>
                        </div>
                      )}

                      {/* Nút Trình duyệt Thanh toán / Giải ngân IPC */}
                      <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] font-mono text-[var(--chu-m)]">
                          Giá trị chờ giải ngân đợt này:{' '}
                          <b className="text-amber-800 dark:text-amber-300">
                            {formatVndBillions(currentGateCrossLock.pendingPayableVnd)}
                          </b>
                        </span>
                        <button
                          type="button"
                          disabled={
                            currentGateCrossLock.isHardStopLocked ||
                            currentGateCrossLock.pendingPayableVnd === 0
                          }
                          onClick={() => handleSubmitGateIpcPayment(currentGate.gate)}
                          className={`px-4 py-2 rounded-lg font-bold text-xs transition flex items-center gap-1.5 ${
                            currentGateCrossLock.isHardStopLocked
                              ? 'bg-rose-500/10 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-500/50 cursor-not-allowed opacity-80'
                              : currentGateCrossLock.pendingPayableVnd === 0
                              ? 'bg-[var(--giay-d)] text-emerald-800 dark:text-emerald-400 border border-emerald-500/40 cursor-default'
                              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg cursor-pointer'
                          }`}
                        >
                          {currentGateCrossLock.isHardStopLocked ? (
                            <>
                              <span>🔒</span>
                              <span>
                                ĐÃ KHÓA: Trình duyệt Thanh toán / Giải ngân IPC (HARD_STOP_BLOCKED)
                              </span>
                            </>
                          ) : currentGateCrossLock.pendingPayableVnd === 0 ? (
                            <>
                              <span>✓</span>
                              <span>Đã giải ngân đủ 100% giá trị nghiệm thu Gate {currentGate.gate}</span>
                            </>
                          ) : (
                            <>
                              <span>{raciPerms.isCdt ? '💳' : raciPerms.isTvgs ? '🔍' : '📤'}</span>
                              <span>
                                {raciPerms.isCdt
                                  ? `✓ CĐT Phê duyệt Giải ngân IPC (${currentGateCrossLock.ipcTrancheCode}) →`
                                  : raciPerms.isTvgs
                                  ? `TVGS Xác nhận Khối lượng IPC (${currentGateCrossLock.ipcTrancheCode}) →`
                                  : `Nộp / Trình duyệt Hồ sơ IPC (${currentGateCrossLock.ipcTrancheCode}) →`}
                              </span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {currentGate.steps.map(step => (
                    <div
                      key={step.code}
                      className="bg-[var(--panel)]/70 border border-amber-500/40 rounded-xl p-4 space-y-4"
                    >
                      <div>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500 text-slate-950 mr-2">
                          Bước {step.code}
                        </span>
                        <span className="text-[11px] font-mono text-rose-800 dark:text-rose-300">{step.mandatory}</span>
                        <h3 className="text-sm font-bold text-[var(--chu)] mt-2">{step.title}</h3>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        <div className="p-2.5 rounded bg-[var(--giay)] border border-[var(--line)]">
                          <div className="text-[10px] text-[var(--chu-m)]">Chủ đầu tư (CDT)</div>
                          <div className="font-semibold text-amber-800 dark:text-amber-400">{step.raci.CDT}</div>
                        </div>
                        <div className="p-2.5 rounded bg-[var(--giay)] border border-[var(--line)]">
                          <div className="text-[10px] text-[var(--chu-m)]">Ban QLDA</div>
                          <div className="font-semibold text-emerald-800 dark:text-emerald-400">{step.raci.BQLDA}</div>
                        </div>
                        <div className="p-2.5 rounded bg-[var(--giay)] border border-[var(--line)]">
                          <div className="text-[10px] text-[var(--chu-m)]">Tư vấn Thiết kế</div>
                          <div className="font-semibold text-sky-800 dark:text-sky-400">{step.raci.TVTK}</div>
                        </div>
                        <div className="p-2.5 rounded bg-[var(--giay)] border border-[var(--line)]">
                          <div className="text-[10px] text-[var(--chu-m)]">Tư vấn Giám sát</div>
                          <div className="font-semibold text-purple-800 dark:text-purple-400">{step.raci.TVGS}</div>
                        </div>
                        <div className="p-2.5 rounded bg-[var(--giay)] border border-[var(--line)]">
                          <div className="text-[10px] text-[var(--chu-m)]">Nhà thầu (NTTC)</div>
                          <div className="font-semibold text-orange-800 dark:text-orange-400">{step.raci.NhaThau}</div>
                        </div>
                        <div className="p-2.5 rounded bg-[var(--giay)] border border-[var(--line)]">
                          <div className="text-[10px] text-[var(--chu-m)]">Cơ quan Thẩm quyền</div>
                          <div className="font-semibold text-[var(--chu)]">{currentArchetypeMeta.authority}</div>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-rose-500/10 dark:bg-rose-950/40 border border-rose-500/40 text-xs text-rose-900 dark:text-rose-200 space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-bold text-rose-800 dark:text-rose-400 flex items-center gap-1.5">
                            <span>🛡️ Chốt chặn Rủi ro Kiểm toán Pháp lý:</span>
                            <span className="px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-[10px] font-mono text-rose-800 dark:text-rose-300">
                              {PROJECT_ARCHETYPE_ICONS[activeProjectArchetype]} {activeProjectArchetype}
                            </span>
                          </div>
                          <button
                            type="button"
                            disabled={analyzingGateStepKey === `${currentGate.gate}-${step.code}-${activeProjectArchetype}`}
                            onClick={() =>
                              handleAnalyzeStepRiskByAI(currentGate.gate, currentGate.name, {
                                code: step.code,
                                title: step.title,
                                mandatory: step.mandatory,
                                riskFlag: step.riskFlag,
                              })
                            }
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-bold text-[11px] shadow-md shadow-rose-950/50 transition cursor-pointer disabled:opacity-60"
                          >
                            {analyzingGateStepKey === `${currentGate.gate}-${step.code}-${activeProjectArchetype}` ? (
                              <>
                                <span className="animate-spin inline-block">⏳</span>
                                <span>Đang phân tích rủi ro [{activeProjectArchetype}]...</span>
                              </>
                            ) : (
                              <>
                                <span>🤖</span>
                                <span>Phân tích rủi ro chi tiết bằng AI</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className="leading-relaxed text-rose-900 dark:text-rose-100/95 bg-[var(--giay)] p-2.5 rounded-lg border border-rose-500/20">
                          {step.riskFlag}
                        </div>

                        {/* THẺ ĐỒNG BỘ CHỈ THỊ PHÁP LÝ BAN QLDA TỪ BƯỚC 2 */}
                        {(() => {
                          const sharedDirectives = (
                            Object.entries(articlePersonalNotes) as Array<
                              [string, ArticlePersonalNoteItem]
                            >
                          ).filter(
                            ([, note]) =>
                              note.isSharedToGate &&
                              (note.targetGates || []).includes(currentGate.gate) &&
                              (!note.projectScope ||
                                note.projectScope === 'ALL' ||
                                note.projectScope === activeProjectArchetype)
                          );
                          if (sharedDirectives.length === 0) return null;
                          return (
                            <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-400/60 space-y-2">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-[11px] font-mono font-extrabold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                                  <span>📌</span>
                                  <span>
                                    Lưu ý Pháp lý từ Ban QLDA ({sharedDirectives.length} chỉ thị
                                    đồng bộ vào {currentGate.gate})
                                  </span>
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-amber-400/20 border border-amber-400/40 text-[9px] font-mono text-amber-900 dark:text-amber-200">
                                  Đồng bộ từ Bước 2 · Cột 3
                                </span>
                              </div>
                              <div className="space-y-1.5">
                                {sharedDirectives.map(([noteKey, note]) => {
                                  const fallbackDocId = noteKey.split('__')[0];
                                  const fallbackNodeId = noteKey.split('__')[1];
                                  const targetDocId = note.docId || fallbackDocId;
                                  const targetNodeId = note.nodeId || fallbackNodeId;
                                  return (
                                    <div
                                      key={noteKey}
                                      className="p-2.5 rounded-lg bg-[var(--giay)] border border-amber-500/40 flex flex-wrap items-start justify-between gap-2"
                                    >
                                      <div className="space-y-0.5 flex-1 min-w-[200px]">
                                        <div className="text-[10px] font-mono text-amber-800 dark:text-amber-300 font-bold">
                                          ⚖️ {note.docNumber || targetDocId} ·{' '}
                                          {note.nodeCode || targetNodeId} · Người ban hành:{' '}
                                          {note.author} ({note.updatedAt})
                                        </div>
                                        <div className="text-xs text-amber-50 font-medium leading-snug">
                                          {note.text}
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveTab('STEP2_VBPL');
                                          setVbplSubMode('READER_3PANE');
                                          setSelectedDocId(targetDocId);
                                          setActiveNodeId(targetNodeId);
                                          setRightReaderMode('TOC_INDEX');
                                          showToast(
                                            `Đã mở điều khoản nguồn: ${note.docNumber || targetDocId} (${note.nodeCode || targetNodeId})`
                                          );
                                        }}
                                        className="px-2 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono text-[10px] font-bold shrink-0 transition"
                                      >
                                        📖 Mở điều khoản Bước 2 →
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}

                        {gateRiskAiReports[`${currentGate.gate}-${step.code}-${activeProjectArchetype}`] && (
                          <div className="mt-2 p-3.5 rounded-xl bg-[var(--giay)] border border-amber-500/50 text-[var(--chu)] space-y-2.5 shadow-inner">
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--line)]">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-800 dark:text-amber-300 font-bold text-[10px] font-mono">
                                  🤖 AI KHUYẾN NGHỊ & BIỆN PHÁP KHẮC PHỤC
                                </span>
                                <span className="text-[10px] font-mono text-emerald-800 dark:text-emerald-400">
                                  Dự án: [{activeProjectArchetype}] {currentArchetypeMeta.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-[var(--chu-m)] font-mono">
                                  {gateRiskAiReports[`${currentGate.gate}-${step.code}-${activeProjectArchetype}`].source} ·{' '}
                                  {gateRiskAiReports[`${currentGate.gate}-${step.code}-${activeProjectArchetype}`].timestamp}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard?.writeText(
                                      gateRiskAiReports[`${currentGate.gate}-${step.code}-${activeProjectArchetype}`].report
                                    );
                                    showToast('Đã sao chép biện pháp khắc phục AI vào Clipboard!');
                                  }}
                                  className="px-2 py-0.5 rounded bg-[var(--giay-d)] hover:bg-[var(--giay-d)] text-[var(--chu-m)] text-[10px] font-semibold transition"
                                >
                                  📋 Sao chép
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const reportData =
                                      gateRiskAiReports[`${currentGate.gate}-${step.code}-${activeProjectArchetype}`];
                                    setActiveAiAgent('AGENT_3_PLAN');
                                    setAiPromptInput(
                                      `Phân tích chuyên sâu Chốt chặn Rủi ro tại ${currentGate.gate} - Bước ${step.code} (${step.title}) cho dự án [${activeProjectArchetype}] ${currentArchetypeMeta.name}: ${step.riskFlag}`
                                    );
                                    setAiOutputText(reportData.report);
                                    setAiEngineSource(reportData.source);
                                    setActiveTab('STEP6_AI');
                                    showToast('Đã chuyển kết quả sang Trung tâm AI (Bước 6)');
                                  }}
                                  className="px-2 py-0.5 rounded bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-800 dark:text-indigo-300 text-[10px] font-semibold transition"
                                >
                                  Mở tại AI Core →
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setGateRiskAiReports(prev => {
                                      const next = { ...prev };
                                      delete next[`${currentGate.gate}-${step.code}-${activeProjectArchetype}`];
                                      return next;
                                    })
                                  }
                                  className="px-1.5 py-0.5 rounded bg-[var(--giay-d)] hover:bg-rose-500/20 text-[var(--chu-m)] hover:text-rose-800 dark:text-rose-300 text-[10px] transition"
                                  title="Đóng bảng phân tích AI"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                            <div className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-[var(--chu)] max-h-80 overflow-y-auto pr-1">
                              {gateRiskAiReports[`${currentGate.gate}-${step.code}-${activeProjectArchetype}`].report}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Thanh kéo co giãn giữa Cột 2 và Cột 3 Bước 3 */}
                {renderVerticalSplitter({
                  id: 'STEP3_SPLIT_2',
                  onDoubleClickReset: () => {
                    setStep3Col2Pct(42);
                    showToast('Đã đặt lại độ rộng Cột 2 Bước 3 (42%)');
                  },
                  label: `Cột 2: ${Math.round(step3Col2Pct)}%`,
                })}

                {/* Cột 3: Checklist Hồ sơ Bắt buộc & Liên kết Nhân sự / Tài sản (Co giãn) */}
                <div className="flex-1 min-w-[260px] overflow-y-auto p-5 bg-[var(--panel)]/30 space-y-4">
                  <div className="bg-[var(--panel)] border border-[var(--line)] rounded-xl p-4 space-y-2.5">
                    <h3 className="text-xs font-bold uppercase text-emerald-800 dark:text-emerald-400">
                      Checklist Hồ sơ Bắt buộc tại {currentGate.gate} ({activeProjectArchetype})
                    </h3>
                    {currentStep.auditChecklist.map((item, idx) => {
                      const key = `${currentStep.code}-${idx}`;
                      const isChecked = !!checkedAuditItems[key];
                      return (
                        <label
                          key={key}
                          onClick={() => setCheckedAuditItems(prev => ({ ...prev, [key]: !prev[key] }))}
                          className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer text-xs ${
                            isChecked
                              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-900 dark:text-emerald-200'
                              : 'bg-[var(--giay)] border-[var(--line)] text-[var(--chu-m)]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            readOnly
                            className="mt-0.5 accent-emerald-500"
                          />
                          <span>{item}</span>
                        </label>
                      );
                    })}
                  </div>

                  {/* Liên kết Thực thể Chéo tại Gate này (Tasks & Thiết bị) */}
                  <div className="bg-[var(--panel)] border border-[var(--line)] rounded-xl p-4 space-y-2 text-xs">
                    <div className="font-bold text-sky-800 dark:text-sky-400 uppercase">
                      Thực thể Liên kết Chéo tại {currentGate.gate}:
                    </div>
                    <div className="text-[var(--chu-m)]">
                      • Định danh biểu mẫu SSOT:{' '}
                      <span className="font-mono text-emerald-800 dark:text-emerald-400 break-all">{currentStep.ssotTemplate}</span>
                    </div>
                    <div className="text-[var(--chu-m)]">
                      • Công việc RACI đang mở:{' '}
                      <b className="font-mono tabular-nums text-[var(--chu)]">
                        {raciTasks.filter(t => t.gateRef === currentGate.gate).length} task
                      </b>
                    </div>
                    <div className="text-[var(--chu-m)]">
                      • Thiết bị LAS/Trắc địa phục vụ Gate:{' '}
                      <b className="font-mono tabular-nums text-[var(--chu)]">
                        {projectAssets.filter(a => a.gateRef === currentGate.gate).length} thiết bị
                      </b>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab('STEP4_EXECUTE')}
                    className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition whitespace-nowrap"
                  >
                    Chuyển sang Bước 4: Mở Sơ đồ Quy trình, Biểu mẫu & Nhật ký →
                  </button>
                </div>
              </div>
            </div>
          )}
    </>
  );
};
