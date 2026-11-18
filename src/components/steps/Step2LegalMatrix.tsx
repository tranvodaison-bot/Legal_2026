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
    badgeClass: "bg-sky-500/20 text-sky-300 border-sky-500/40",
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
    badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/40",
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
    badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
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
import {
  buildNotebookLmCitationPrompt,
  getResolvedNotebookUrl,
  resolveLegalNotebookForContext,
} from "../../config/notebookLmConfig";

export interface Step2LegalMatrixProps {
  ctx: StepContextType;
}

export const Step2LegalMatrix: React.FC<Step2LegalMatrixProps> = ({ ctx }) => {
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
          {activeTab === 'STEP2_VBPL' && (
            <div className="h-full flex flex-col overflow-hidden">
              {/* CHẾ ĐỘ 2A: GIAO DIỆN 3 CỘT CO GIÃN LINH HOẠT THEO NGÀNH / LĨNH VỰC */}
              {vbplSubMode === 'READER_3PANE' ? (
                <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                  {/* ==========================================================
                      CỘT 1: CÂY PHÂN CẤP NGÀNH (CẤP 1) -> LĨNH VỰC CON -> DỰ ÁN -> VĂN BẢN
                     ========================================================== */}
                  {isVbplCol1Collapsed ? (
                    <div className="w-8 bg-[#0b1322] border-r border-slate-800 flex flex-col items-center py-3 justify-between shrink-0 select-none">
                      <button
                        onClick={() => setIsVbplCol1Collapsed(false)}
                        title="Mở rộng Cột 1: Ngành · Lĩnh vực"
                        className="h-7 w-6 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center shadow"
                      >
                        ▶
                      </button>
                      <div className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase">
                        CỘT 1 · NGÀNH & LĨNH VỰC (15)
                      </div>
                      <span className="text-xs">📚</span>
                    </div>
                  ) : (
                    <div
                      style={{ width: `${vbplCol1Pct}%` }}
                      className="w-full lg:shrink-0 min-w-[175px] bg-[#0b1322] flex flex-col justify-between overflow-hidden select-none"
                    >
                      <div className="p-2.5 border-b border-slate-800/90 space-y-2 relative">
                        <div className="flex items-center justify-between gap-1 px-0.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-sm">📚</span>
                            <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400 truncate">
                              NGÀNH · LĨNH VỰC
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[10px] font-mono text-sky-300 bg-[#16243d] px-1.5 py-0.5 rounded">
                              {Math.round(vbplCol1Pct)}%
                            </span>
                            <button
                              onClick={() => setIsVbplCol1Collapsed(true)}
                              title="Thu gọn Cột 1 (Ngành · Lĩnh vực)"
                              className="h-5 w-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] flex items-center justify-center border border-slate-700"
                            >
                              ◀
                            </button>
                          </div>
                        </div>

                        {/* Bộ 3 nút chuyển đổi trình tự Cột 1: [Ngành] | [Lĩnh vực] | [Dự án] */}
                        <div className="grid grid-cols-3 gap-1 bg-[#070d18] p-0.5 rounded-md border border-slate-800 text-[10px]">
                          <button
                            type="button"
                            onClick={() => {
                              setCol1ViewMode('BY_15_INDUSTRIES');
                              setFilterTreeByActiveProject(false);
                              setIsCol1SubDomainMenuOpen(false);
                              setVbplDomainFilter('ALL');
                              setVbplProjectFilter('ALL');
                              if (vbplIndustryGroupFilter === 'ALL') {
                                setVbplIndustryGroupFilter('IND-XAYDUNG-DAUTHAU');
                              }
                              setPane2SubTab('DOCS');
                            }}
                            title="Hiển thị danh sách các thẻ theo Ngành"
                            className={`py-1.5 px-1 rounded font-semibold transition truncate ${
                              col1ViewMode === 'BY_15_INDUSTRIES'
                                ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                            }`}
                          >
                            Ngành
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setCol1ViewMode('BY_SUBDOMAINS');
                              setFilterTreeByActiveProject(false);
                              setIsCol1SubDomainMenuOpen(false);
                              setVbplIndustryGroupFilter('ALL');
                              setVbplSubSectorFilter('ALL');
                              setVbplProjectFilter('ALL');
                              setPane2SubTab('DOCS');
                            }}
                            title="Hiển thị các thẻ dành riêng cho từng nhóm Lĩnh vực: QLCL, QLHD, QLCP, HDXD..."
                            className={`py-1.5 px-1 rounded font-semibold transition truncate flex items-center justify-center gap-0.5 ${
                              col1ViewMode === 'BY_SUBDOMAINS'
                                ? 'bg-sky-500 text-slate-950 font-bold shadow-xs'
                                : 'text-sky-200/90 hover:text-white hover:bg-slate-800/60'
                            }`}
                          >
                            <span className="truncate">Lĩnh vực</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setCol1ViewMode('BY_PROJECT');
                              setFilterTreeByActiveProject(true);
                              setIsCol1SubDomainMenuOpen(false);
                              setVbplIndustryGroupFilter('ALL');
                              setVbplSubSectorFilter('ALL');
                              setVbplDomainFilter('ALL');
                              setVbplProjectFilter(activeProjectArchetype);
                              setExpandedStandaloneProjects(prev => ({
                                ...prev,
                                [activeProjectArchetype]: true,
                              }));
                              setPane2SubTab('DOCS');
                            }}
                            title="Ứng với từng Dự án hiển thị các thẻ Văn bản pháp luật & Hồ sơ dự án liên quan"
                            className={`py-1.5 px-1 rounded font-semibold transition truncate ${
                              col1ViewMode === 'BY_PROJECT'
                                ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                            }`}
                          >
                            Dự án
                          </button>
                        </div>

                        {/* Ô TÌM KIẾM NHANH TRONG CỘT 1 */}
                        <div className="flex items-center gap-1.5">
                          <div className="relative flex-1 min-w-0">
                            <input
                              type="text"
                              value={categorySearch}
                              onChange={e => setCategorySearch(e.target.value)}
                              placeholder={
                                col1ViewMode === 'BY_SUBDOMAINS'
                                  ? 'Tìm QLCL, QLHD, QLCP, số hiệu VB...'
                                  : col1ViewMode === 'BY_PROJECT'
                                  ? 'Tìm dự án KCN, HTKT, văn bản, hồ sơ...'
                                  : 'Tìm ngành, số hiệu văn bản...'
                              }
                              className="w-full min-w-0 bg-[#131f35] border border-slate-700/80 rounded-md pl-2.5 pr-6 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                            />
                            {categorySearch && (
                              <button
                                type="button"
                                onClick={() => setCategorySearch('')}
                                className="absolute right-2 top-1.5 text-[10px] text-slate-400 hover:text-white"
                              >
                                ✕
                              </button>
                            )}
                          </div>

                          {(vbplDomainFilter !== 'ALL' ||
                            vbplProjectFilter !== 'ALL' ||
                            vbplProjectPhaseFilter !== 'ALL' ||
                            vbplGateFilter !== 'ALL') && (
                            <button
                              type="button"
                              onClick={() => {
                                setVbplDomainFilter('ALL');
                                setVbplProjectPhaseFilter('ALL');
                                setVbplGateFilter('ALL');
                                if (col1ViewMode !== 'BY_PROJECT') {
                                  setVbplProjectFilter('ALL');
                                }
                              }}
                              title="Đặt lại bộ lọc nhóm, cấp độ Gate & trạng thái giai đoạn đang chọn"
                              className="h-7 px-1.5 rounded-md bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-[10px] font-mono font-bold flex items-center justify-center shrink-0"
                            >
                              Tất cả ✕
                            </button>
                          )}
                        </div>
                      </div>

                      {/* ========================================================
                          NỘI DUNG DANH SÁCH THẺ CỘT 1 THEO 3 CHẾ ĐỘ:
                          1. BY_15_INDUSTRIES ("Ngành"): Hiển thị các thẻ theo Ngành & danh mục văn bản ngành
                          2. BY_SUBDOMAINS ("Lĩnh vực"): Tự động xuất hiện các thẻ dành cho nhóm Lĩnh vực (QLCL, QLHD, QLCP, HDXD...)
                          3. BY_PROJECT ("Dự án"): Ứng với từng Dự án xuất hiện các thẻ Văn bản pháp luật & Hồ sơ dự án liên quan
                         ======================================================== */}
                      <div className="flex-1 overflow-y-auto px-1.5 py-2 space-y-1.5">
                        {/* ======================================================
                            CHẾ ĐỘ 1: CLICK "NGÀNH" — HIỂN THỊ CÁC THẺ NGÀNH & VĂN BẢN THUỘC NGÀNH
                           ====================================================== */}
                        {col1ViewMode === 'BY_15_INDUSTRIES' &&
                          LEGAL_CATEGORY_TREE.map(group => {
                            const isExpanded = !!expandedCatGroups[group.id];
                            const q = categorySearch.trim().toLowerCase();

                            // Tất cả văn bản thuộc Ngành này
                            const allGroupDocs = legalDocs.filter(d => d.industryGroupId === group.id);
                            const industryDocs = allGroupDocs.filter(d => {
                              if (
                                filterTreeByActiveProject &&
                                !d.projectAxes.includes(activeProjectArchetype)
                              ) {
                                return false;
                              }
                              if (
                                vbplDomainFilter !== 'ALL' &&
                                d.primaryDomain !== vbplDomainFilter &&
                                !d.secondaryDomains.includes(vbplDomainFilter as FunctionalDomainCode)
                              ) {
                                return false;
                              }
                              if (!q) return true;
                              return (
                                group.name.toLowerCase().includes(q) ||
                                d.docNumber.toLowerCase().includes(q) ||
                                d.title.toLowerCase().includes(q) ||
                                d.primaryDomain.toLowerCase().includes(q) ||
                                d.secondaryDomains.some(sd => sd.toLowerCase().includes(q))
                              );
                            });

                            if (industryDocs.length === 0) {
                              return null;
                            }

                            const isGroupActive =
                              vbplIndustryGroupFilter === group.id &&
                              vbplDomainFilter === 'ALL' &&
                              vbplProjectFilter === 'ALL';
                            const isDocCatalogOpen =
                              expandedIndustryDocCatalog[group.id] !== undefined
                                ? expandedIndustryDocCatalog[group.id]
                                : true;

                            return (
                              <div
                                key={group.id}
                                className={`group/ind rounded-lg border overflow-hidden transition-all duration-200 ${
                                  isGroupActive
                                    ? 'border-amber-400 bg-[#121e36] shadow-md shadow-amber-500/10'
                                    : 'border-slate-800/80 bg-[#0e172a]/70 hover:border-amber-500/60 hover:bg-[#13203a] hover:shadow-lg hover:shadow-amber-500/10 hover:-translate-y-0.5'
                                }`}
                              >
                                {/* CẤP 1: NGÀNH */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextExpanded = !isExpanded;
                                    setExpandedCatGroups(prev => ({
                                      ...prev,
                                      [group.id]: nextExpanded,
                                    }));
                                    if (nextExpanded) {
                                      setExpandedIndustryDocCatalog(prev => ({
                                        ...prev,
                                        [group.id]: true,
                                      }));
                                    }
                                    setVbplIndustryGroupFilter(group.id);
                                    setVbplSubSectorFilter('ALL');
                                    setVbplProjectFilter('ALL');
                                    setPane2SubTab('DOCS');
                                  }}
                                  title={group.industrySummary}
                                  className={`w-full text-left px-2 py-1.5 flex items-center justify-between gap-1.5 text-xs transition-all duration-200 ${
                                    isGroupActive
                                      ? 'bg-gradient-to-r from-amber-500/25 to-slate-800/90 text-amber-300 font-bold border-b border-amber-500/30'
                                      : 'text-slate-100 group-hover/ind:text-amber-200 hover:bg-slate-800/70 font-semibold'
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-[10px] text-amber-400 w-2.5 shrink-0 transition-transform duration-200 group-hover/ind:scale-110">
                                      {isExpanded ? '▾' : '▸'}
                                    </span>
                                    <span className="text-xs shrink-0 transition-transform duration-200 group-hover/ind:scale-110">
                                      {isExpanded ? '📖' : '📕'}
                                    </span>
                                    <span className="truncate text-[12px]">{group.name}</span>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <span
                                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono tabular-nums transition-all duration-200 ${
                                        isExpanded
                                          ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                                          : 'bg-[#1c2c47] text-sky-300 group-hover/ind:bg-amber-500/20 group-hover/ind:text-amber-300 group-hover/ind:ring-1 group-hover/ind:ring-amber-400/50'
                                      }`}
                                    >
                                      {industryDocs.length} VB
                                    </span>
                                  </div>
                                </button>

                                {/* NỘI DUNG KHI SỔ NGÀNH: CHỈ HIỂN THỊ DANH MỤC VĂN BẢN CỦA NGÀNH */}
                                {isExpanded && (
                                  <div className="p-1.5 space-y-1.5 bg-[#09101e] border-t border-slate-800/80">
                                    <div className="rounded border border-slate-800 bg-[#0d1729]">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setExpandedIndustryDocCatalog(prev => ({
                                            ...prev,
                                            [group.id]: !isDocCatalogOpen,
                                          }))
                                        }
                                        className="w-full px-2 py-1 text-left flex items-center justify-between text-[10px] font-mono font-bold text-emerald-300 hover:bg-slate-800/50 transition"
                                      >
                                        <span className="flex items-center gap-1 truncate">
                                          <span>{isDocCatalogOpen ? '▾' : '▸'}</span>
                                          <span>📂 Danh mục văn bản ngành ({industryDocs.length})</span>
                                        </span>
                                        <span className="text-[9px] text-slate-400">Click chọn VB</span>
                                      </button>

                                      {isDocCatalogOpen && (
                                        <div className="px-1.5 pb-1.5 pt-0.5 space-y-1 border-t border-slate-800/70">
                                          {industryDocs.map(doc => {
                                            const isDocSelected = currentLegalDoc?.id === doc.id;
                                            return (
                                              <button
                                                key={doc.id}
                                                type="button"
                                                onClick={() =>
                                                  handleSelectDocFromColumn1(doc, {
                                                    industryId: group.id,
                                                  })
                                                }
                                                title={`${doc.docType} ${doc.docNumber} — ${doc.title}`}
                                                className={`w-full text-left px-2 py-1 rounded text-[11px] transition-all duration-150 flex items-start justify-between gap-1.5 border ${
                                                  isDocSelected
                                                    ? 'bg-emerald-500/20 border-emerald-400 text-white font-bold shadow-xs'
                                                    : 'bg-[#121e36]/80 border-slate-800 text-slate-300 hover:bg-[#172847] hover:border-amber-500/50 hover:text-white hover:translate-x-0.5'
                                                }`}
                                              >
                                                <div className="min-w-0 flex-1">
                                                  <div className="flex items-center gap-1">
                                                    <span className="px-1 py-0.1 rounded bg-slate-950 text-amber-300 font-mono text-[9px] font-bold shrink-0">
                                                      {doc.docType}
                                                    </span>
                                                    <span className="font-mono font-semibold truncate text-[11px]">
                                                      {doc.docNumber}
                                                    </span>
                                                  </div>
                                                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                                                    {doc.shortSummary || doc.title}
                                                  </div>
                                                </div>
                                                <span className="px-1 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-700/40 font-mono text-[9px] shrink-0">
                                                  {doc.primaryDomain}
                                                </span>
                                              </button>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}

                        {/* ======================================================
                            CHẾ ĐỘ 2: CLICK "LĨNH VỰC" — TỰ ĐỘNG XUẤT HIỆN CÁC THẺ DÀNH CHO NHÓM ẤY (QLCL, QLHD, QLCP, HDXD...)
                           ====================================================== */}
                        {col1ViewMode === 'BY_SUBDOMAINS' && (
                          <div className="space-y-2">
                            {/* Thanh chọn nhanh nhóm Lĩnh vực */}
                            <div className="p-2 rounded-lg bg-[#0d182c] border border-sky-500/30 space-y-1.5">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="font-mono font-bold text-sky-300 uppercase">
                                  🏷️ Nhóm Lĩnh vực (13 nhóm):
                                </span>
                                {vbplDomainFilter !== 'ALL' && (
                                  <button
                                    type="button"
                                    onClick={() => setVbplDomainFilter('ALL')}
                                    className="text-amber-300 hover:underline font-mono text-[9px]"
                                  >
                                    Hiện tất cả nhóm
                                  </button>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setVbplDomainFilter('ALL');
                                    setVbplIndustryGroupFilter('ALL');
                                  }}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border transition ${
                                    vbplDomainFilter === 'ALL'
                                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                                      : 'bg-[#131f35] text-slate-300 border-slate-700 hover:border-slate-500'
                                  }`}
                                >
                                  Tất cả ({TAXONOMY_3D.functionalDomains.length})
                                </button>
                                {TAXONOMY_3D.functionalDomains.map(dom => {
                                  const isSelectedChip = vbplDomainFilter === dom.code;
                                  const domDocCount = legalDocs.filter(
                                    d =>
                                      d.primaryDomain === dom.code ||
                                      d.secondaryDomains.includes(dom.code)
                                  ).length;
                                  return (
                                    <button
                                      key={dom.code}
                                      type="button"
                                      onClick={() => {
                                        const nextDom = isSelectedChip ? 'ALL' : dom.code;
                                        setVbplDomainFilter(nextDom);
                                        setVbplIndustryGroupFilter('ALL');
                                        setVbplSubSectorFilter('ALL');
                                        if (nextDom !== 'ALL') {
                                          setExpandedStandaloneSubDomains(prev => ({
                                            ...prev,
                                            [nextDom]: true,
                                          }));
                                        }
                                        setPane2SubTab('DOCS');
                                      }}
                                      title={`${dom.code} — ${dom.name} (${domDocCount} văn bản)`}
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border transition flex items-center gap-0.5 ${
                                        isSelectedChip
                                          ? 'bg-sky-500 text-slate-950 border-sky-300 font-bold'
                                          : 'bg-[#131f35] text-sky-200 border-slate-700/80 hover:bg-slate-800'
                                      }`}
                                    >
                                      <span>{dom.code}</span>
                                      <span
                                        className={`text-[8px] ${
                                          isSelectedChip ? 'text-slate-900' : 'text-slate-400'
                                        }`}
                                      >
                                        ({domDocCount})
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Danh sách các Thẻ Lĩnh vực con (QLCL, QLHD, QLCP, HDXD...) */}
                            {TAXONOMY_3D.functionalDomains
                              .filter(dom => {
                                if (vbplDomainFilter !== 'ALL' && dom.code !== vbplDomainFilter) {
                                  return false;
                                }
                                const q = categorySearch.trim().toLowerCase();
                                const domDocs = legalDocs.filter(
                                  d =>
                                    d.primaryDomain === dom.code ||
                                    d.secondaryDomains.includes(dom.code)
                                );
                                if (domDocs.length === 0 && !q) return true;
                                if (!q) return true;
                                return (
                                  dom.code.toLowerCase().includes(q) ||
                                  dom.name.toLowerCase().includes(q) ||
                                  domDocs.some(
                                    d =>
                                      d.docNumber.toLowerCase().includes(q) ||
                                      d.title.toLowerCase().includes(q)
                                  )
                                );
                              })
                              .map(dom => {
                                const q = categorySearch.trim().toLowerCase();
                                const domDocs = legalDocs.filter(d => {
                                  const matchDom =
                                    d.primaryDomain === dom.code ||
                                    d.secondaryDomains.includes(dom.code);
                                  if (!matchDom) return false;
                                  if (!q) return true;
                                  return (
                                    dom.code.toLowerCase().includes(q) ||
                                    dom.name.toLowerCase().includes(q) ||
                                    d.docNumber.toLowerCase().includes(q) ||
                                    d.title.toLowerCase().includes(q)
                                  );
                                });

                                const isCardExpanded =
                                  vbplDomainFilter === dom.code ||
                                  !!expandedStandaloneSubDomains[dom.code];
                                const isCardActive = vbplDomainFilter === dom.code;

                                // Các cổng Stage-Gate liên quan đến Lĩnh vực con này
                                const relatedGates = gates.filter(g =>
                                  g.functionalTags.includes(dom.code)
                                );

                                return (
                                  <div
                                    key={dom.code}
                                    className={`rounded-lg border overflow-hidden transition ${
                                      isCardActive
                                        ? 'border-sky-400 bg-[#10203a] shadow-md'
                                        : 'border-slate-800/90 bg-[#0e172a]/85'
                                    }`}
                                  >
                                    {/* Header Thẻ Lĩnh vực con (QLCL, QLHD...) */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const nextExpanded = !isCardExpanded;
                                        setExpandedStandaloneSubDomains(prev => ({
                                          ...prev,
                                          [dom.code]: nextExpanded,
                                        }));
                                        setVbplDomainFilter(dom.code);
                                        setVbplIndustryGroupFilter('ALL');
                                        setVbplSubSectorFilter('ALL');
                                        setPane2SubTab('DOCS');
                                      }}
                                      className={`w-full text-left px-2.5 py-2 flex items-center justify-between gap-1.5 transition ${
                                        isCardActive
                                          ? 'bg-gradient-to-r from-sky-600/30 to-sky-500/10 text-white font-bold border-b border-sky-500/30'
                                          : 'text-slate-100 hover:bg-slate-800/70 font-semibold'
                                      }`}
                                    >
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="text-[10px] text-sky-400 shrink-0">
                                          {isCardExpanded ? '▾' : '▸'}
                                        </span>
                                        <span
                                          className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-extrabold shrink-0 ${
                                            isCardActive
                                              ? 'bg-sky-400 text-slate-950'
                                              : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                                          }`}
                                        >
                                          {dom.code}
                                        </span>
                                        <span className="truncate text-xs">{dom.name}</span>
                                      </div>
                                      <span
                                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono tabular-nums shrink-0 ${
                                          isCardActive
                                            ? 'bg-amber-400 text-slate-950 font-bold'
                                            : 'bg-slate-950 text-sky-300 border border-slate-800'
                                        }`}
                                      >
                                        {domDocs.length} thẻ
                                      </span>
                                    </button>

                                    {/* Nội dung các Thẻ thuộc nhóm Lĩnh vực con (QLCL, QLHD...) */}
                                    {isCardExpanded && (
                                      <div className="p-1.5 space-y-1.5 bg-[#08101f]">
                                        {relatedGates.length > 0 && (
                                          <div className="flex flex-wrap items-center gap-1 px-1">
                                            <span className="text-[9px] font-mono text-slate-400">
                                              Stage-Gate:
                                            </span>
                                            {relatedGates.map(g => (
                                              <span
                                                key={g.gate}
                                                className="px-1 py-0.1 rounded bg-emerald-950/80 border border-emerald-700/40 text-emerald-300 font-mono text-[9px]"
                                              >
                                                {g.gate}
                                              </span>
                                            ))}
                                          </div>
                                        )}

                                        {domDocs.length === 0 ? (
                                          <div className="p-2 text-[10px] text-slate-400 italic text-center">
                                            Chưa có thẻ văn bản trong nhóm [{dom.code}].
                                          </div>
                                        ) : (
                                          <div className="space-y-1">
                                            {domDocs.map(doc => {
                                              const isDocSelected = currentLegalDoc?.id === doc.id;
                                              const isPrimary = doc.primaryDomain === dom.code;
                                              return (
                                                <button
                                                  key={doc.id}
                                                  type="button"
                                                  onClick={() =>
                                                    handleSelectDocFromColumn1(doc, {
                                                      domainCode: dom.code,
                                                    })
                                                  }
                                                  title={`${doc.docType} ${doc.docNumber} — ${doc.title}`}
                                                  className={`w-full text-left p-2 rounded-md text-[11px] transition flex flex-col gap-1 border ${
                                                    isDocSelected
                                                      ? 'bg-sky-500/20 border-sky-400 text-white shadow-xs'
                                                      : 'bg-[#101c34] border-slate-800/90 text-slate-200 hover:bg-slate-800 hover:border-slate-600'
                                                  }`}
                                                >
                                                  <div className="flex items-center justify-between gap-1">
                                                    <div className="flex items-center gap-1 min-w-0">
                                                      <span className="px-1 py-0.1 rounded bg-slate-950 text-amber-300 font-mono text-[9px] font-bold shrink-0">
                                                        {doc.docType}
                                                      </span>
                                                      <span className="font-mono font-bold truncate text-[11px]">
                                                        {doc.docNumber}
                                                      </span>
                                                    </div>
                                                    <span
                                                      className={`px-1 py-0.1 rounded font-mono text-[8px] shrink-0 ${
                                                        isPrimary
                                                          ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 font-bold'
                                                          : 'bg-slate-900 text-sky-300 border border-slate-700'
                                                      }`}
                                                    >
                                                      {isPrimary ? `Trọng tâm ${dom.code}` : `Liên đới ${dom.code}`}
                                                    </span>
                                                  </div>
                                                  <div className="text-[10px] text-slate-300 line-clamp-2 leading-snug">
                                                    {doc.shortSummary || doc.title}
                                                  </div>
                                                  <div className="flex flex-wrap items-center gap-1 pt-0.5">
                                                    {doc.projectAxes.map(pCode => (
                                                      <span
                                                        key={pCode}
                                                        className="px-1 py-0.1 rounded bg-slate-950/90 text-emerald-300 font-mono text-[8px] flex items-center gap-0.5"
                                                      >
                                                        <span>{PROJECT_ARCHETYPE_ICONS[pCode]}</span>
                                                        <span>{pCode}</span>
                                                      </span>
                                                    ))}
                                                  </div>
                                                </button>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        )}

                        {/* ======================================================
                            CHẾ ĐỘ 3: CLICK "DỰ ÁN" — ỨNG VỚI TỪNG DỰ ÁN XUẤT HIỆN CÁC THẺ VĂN BẢN PHÁP LUẬT & HỒ SƠ DỰ ÁN
                           ====================================================== */}
                        {col1ViewMode === 'BY_PROJECT' && (
                          <div className="space-y-2">
                            {/* Thanh chọn nhanh Dự án (KCN, HTKT, DAN_DUNG, CCN, FTZ, PPP_BT) */}
                            <div className="p-2 rounded-lg bg-[#0a1929] border border-emerald-500/30 space-y-1.5">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="font-mono font-bold text-emerald-300 uppercase">
                                  🏗️ Chọn Dự án ({TAXONOMY_3D.projectTypes.length} loại hình):
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setVbplProjectFilter('ALL');
                                    const allOpen: Record<string, boolean> = {};
                                    TAXONOMY_3D.projectTypes.forEach(p => {
                                      allOpen[p.code] = true;
                                    });
                                    setExpandedStandaloneProjects(allOpen);
                                  }}
                                  className="text-amber-300 hover:underline font-mono text-[9px]"
                                >
                                  Mở cả 6 DA
                                </button>
                              </div>
                              <div className="grid grid-cols-3 gap-1">
                                {TAXONOMY_3D.projectTypes.map(pt => {
                                  const isProjActive =
                                    activeProjectArchetype === pt.code &&
                                    vbplProjectFilter === pt.code;
                                  const projCount = legalDocs.filter(
                                    d =>
                                      d.projectAxes.includes(pt.code) &&
                                      matchesDocProjectPhase(d, vbplProjectPhaseFilter) &&
                                      evaluateLegalDocumentCutoff(
                                        d,
                                        projectLegalDatesMap[pt.code],
                                        legalCutoffMode
                                      ).included
                                  ).length;
                                  return (
                                    <button
                                      key={pt.code}
                                      type="button"
                                      onClick={() => {
                                        setActiveProjectArchetype(pt.code);
                                        setVbplProjectFilter(pt.code);
                                        setVbplIndustryGroupFilter('ALL');
                                        setVbplSubSectorFilter('ALL');
                                        setExpandedStandaloneProjects(prev => ({
                                          ...prev,
                                          [pt.code]: true,
                                        }));
                                        setPane2SubTab('DOCS');
                                      }}
                                      title={`${pt.name} (${projCount} VBPL)`}
                                      className={`group/pchip px-1.5 py-1 rounded text-[10px] font-mono font-semibold border transition-all duration-150 flex items-center justify-between gap-0.5 ${
                                        isProjActive
                                          ? 'bg-emerald-500 text-slate-950 border-emerald-300 font-bold shadow-xs'
                                          : 'bg-[#112238] text-emerald-200 border-slate-700/80 hover:bg-[#17304d] hover:border-emerald-400/70 hover:text-white hover:-translate-y-0.5 hover:shadow-md hover:shadow-emerald-500/10'
                                      }`}
                                    >
                                      <span className="flex items-center gap-1 min-w-0 truncate">
                                        <span className="text-[11px] shrink-0 transition-transform duration-150 group-hover/pchip:scale-110">
                                          {PROJECT_ARCHETYPE_ICONS[pt.code]}
                                        </span>
                                        <span className="truncate">{pt.code}</span>
                                      </span>
                                      <span
                                        className={`text-[8px] shrink-0 ${
                                          isProjActive ? 'text-slate-900' : 'text-slate-400'
                                        }`}
                                      >
                                        ({projCount})
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* BỘ CẤU HÌNH MỐC THỜI GIAN PHÁP LÝ GỐC CỦA DỰ ÁN (LEGAL CUT-OFF ENGINE) */}
                            <div className="p-2.5 rounded-lg bg-[#0c1b2e] border border-amber-500/45 space-y-2 shadow-sm">
                              <div className="flex items-center justify-between gap-1 text-[10px]">
                                <span className="font-mono font-extrabold text-amber-300 uppercase flex items-center gap-1 truncate">
                                  <span>⚖️</span>
                                  <span className="truncate">
                                    Mốc Pháp lý Gốc [{activeProjectArchetype}]:
                                  </span>
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded font-mono text-[8px] font-bold shrink-0 ${
                                    activeProjectCutoffRegime.regime === 'LEGACY_TRANSITIONAL'
                                      ? 'bg-amber-500/25 text-amber-300 border border-amber-400/50'
                                      : activeProjectCutoffRegime.regime === 'NEW_2026'
                                      ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/50'
                                      : 'bg-sky-500/25 text-sky-300 border border-sky-400/50'
                                  }`}
                                >
                                  {activeProjectCutoffRegime.shortTag}
                                </span>
                              </div>

                              {/* Chọn nhanh kịch bản mẫu */}
                              <div className="grid grid-cols-2 gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    applyProjectMilestonePreset(
                                      activeProjectArchetype,
                                      'LEGACY_2023_2024'
                                    )
                                  }
                                  className={`px-1.5 py-1 rounded text-[9px] font-mono font-bold border transition text-left leading-tight ${
                                    activeProjectMilestones.presetId === 'LEGACY_2023_2024'
                                      ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-xs'
                                      : 'bg-slate-900 text-amber-200 border-slate-700 hover:border-amber-400/60'
                                  }`}
                                >
                                  🛡️ Dự án cũ chuyển tiếp 2023–2024
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    applyProjectMilestonePreset(
                                      activeProjectArchetype,
                                      'NEW_2026'
                                    )
                                  }
                                  className={`px-1.5 py-1 rounded text-[9px] font-mono font-bold border transition text-left leading-tight ${
                                    activeProjectMilestones.presetId === 'NEW_2026'
                                      ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-xs'
                                      : 'bg-slate-900 text-emerald-200 border-slate-700 hover:border-emerald-400/60'
                                  }`}
                                >
                                  🆕 Dự án khởi tạo mới 2026
                                </button>
                              </div>

                              {/* 3 Mốc thời gian pháp lý gốc */}
                              <div className="space-y-1 text-[9px]">
                                <label className="flex items-center justify-between gap-1.5 bg-slate-950/70 px-1.5 py-1 rounded border border-slate-800">
                                  <span className="text-slate-300 font-medium truncate">
                                    1. Duyệt Chủ trương ĐT:
                                  </span>
                                  <input
                                    type="date"
                                    value={activeProjectMilestones.investmentPolicyDate}
                                    onChange={e =>
                                      updateProjectMilestoneField(
                                        activeProjectArchetype,
                                        'investmentPolicyDate',
                                        e.target.value
                                      )
                                    }
                                    className="bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-[9px] font-mono text-amber-200 focus:outline-none focus:border-amber-400"
                                  />
                                </label>
                                <label className="flex items-center justify-between gap-1.5 bg-slate-950/70 px-1.5 py-1 rounded border border-slate-800">
                                  <span className="text-slate-300 font-medium truncate">
                                    2. Duyệt Dự án / TKBVTC:
                                  </span>
                                  <input
                                    type="date"
                                    value={activeProjectMilestones.projectDesignApprovalDate}
                                    onChange={e =>
                                      updateProjectMilestoneField(
                                        activeProjectArchetype,
                                        'projectDesignApprovalDate',
                                        e.target.value
                                      )
                                    }
                                    className="bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-[9px] font-mono text-amber-200 focus:outline-none focus:border-amber-400"
                                  />
                                </label>
                                <label className="flex items-center justify-between gap-1.5 bg-slate-950/70 px-1.5 py-1 rounded border border-slate-800">
                                  <span className="text-slate-300 font-medium truncate">
                                    3. Ký Hợp đồng XD:
                                  </span>
                                  <input
                                    type="date"
                                    value={activeProjectMilestones.constructionContractDate}
                                    onChange={e =>
                                      updateProjectMilestoneField(
                                        activeProjectArchetype,
                                        'constructionContractDate',
                                        e.target.value
                                      )
                                    }
                                    className="bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-[9px] font-mono text-amber-200 focus:outline-none focus:border-amber-400"
                                  />
                                </label>
                              </div>

                              {/* Nút bật nhanh chế độ Cut-off Engine */}
                              <div className="grid grid-cols-2 gap-1 bg-[#050b14] p-0.5 rounded border border-slate-800 text-[9px] font-mono">
                                <button
                                  type="button"
                                  onClick={() => setLegalCutoffMode('CURRENT_VALID_ONLY')}
                                  className={`py-1 px-1 rounded font-bold transition truncate ${
                                    legalCutoffMode === 'CURRENT_VALID_ONLY'
                                      ? 'bg-emerald-500 text-slate-950'
                                      : 'text-slate-400 hover:text-white'
                                  }`}
                                >
                                  🟢 Còn hiệu lực hiện tại
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setLegalCutoffMode('PROJECT_TRANSITION')}
                                  className={`py-1 px-1 rounded font-bold transition truncate ${
                                    legalCutoffMode === 'PROJECT_TRANSITION'
                                      ? 'bg-amber-400 text-slate-950'
                                      : 'text-amber-300 hover:text-white'
                                  }`}
                                >
                                  ⚖️ Theo Mốc chuyển tiếp
                                </button>
                              </div>

                              {legalCutoffMode === 'PROJECT_TRANSITION' && (
                                <div className="text-[9px] text-amber-200/90 leading-snug bg-amber-500/10 px-1.5 py-1 rounded border border-amber-500/30">
                                  {activeProjectCutoffRegime.summary}
                                </div>
                              )}
                            </div>

                            {/* Bộ lọc Trạng thái / Giai đoạn Dự án (Chuẩn bị - Thực hiện - Kết thúc) ngay dưới thanh chọn loại hình dự án */}
                            <div className="p-2 rounded-lg bg-[#0b1829] border border-sky-500/30 space-y-1.5">
                              <div className="flex items-center justify-between gap-1 text-[10px]">
                                <span className="font-mono font-bold text-sky-300 uppercase flex items-center gap-1 truncate">
                                  <span>⏱️</span>
                                  <span className="truncate">Trạng thái Dự án:</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setVbplProjectPhaseFilter('ALL');
                                    setPane2SubTab('DOCS');
                                  }}
                                  className={`px-1.5 py-0.5 rounded font-mono text-[9px] border transition shrink-0 ${
                                    vbplProjectPhaseFilter === 'ALL'
                                      ? 'bg-slate-200 text-slate-950 border-white font-bold'
                                      : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:border-slate-500 hover:text-white'
                                  }`}
                                >
                                  Tất cả GĐ
                                </button>
                              </div>

                              <div className="grid grid-cols-3 gap-1">
                                {PROJECT_PHASE_META.map(phase => {
                                  const isSelectedPhase = vbplProjectPhaseFilter === phase.id;
                                  const phaseDocCount = legalDocs.filter(d => {
                                    const matchProj =
                                      vbplProjectFilter === 'ALL'
                                        ? true
                                        : d.projectAxes.includes(
                                            vbplProjectFilter as ProjectArchetypeCode
                                          );
                                    const cutoffOk = evaluateLegalDocumentCutoff(
                                      d,
                                      activeProjectMilestones,
                                      legalCutoffMode
                                    ).included;
                                    return matchProj && cutoffOk && matchesDocProjectPhase(d, phase.id);
                                  }).length;

                                  return (
                                    <button
                                      key={phase.id}
                                      type="button"
                                      onClick={() => {
                                        const nextPhase: ProjectPhaseFilter = isSelectedPhase
                                          ? 'ALL'
                                          : phase.id;
                                        setVbplProjectPhaseFilter(nextPhase);
                                        setPane2SubTab('DOCS');
                                      }}
                                      title={`Giai đoạn ${phase.label} (${phase.gateRangeLabel}): ${phase.desc} — ${phaseDocCount} VBPL`}
                                      className={`group/phase px-1.5 py-1.5 rounded-md text-[10px] border transition-all duration-150 flex flex-col items-center justify-center gap-0.5 ${
                                        isSelectedPhase
                                          ? phase.activeClass
                                          : 'bg-[#112036] text-slate-200 border-slate-700/80 hover:bg-[#172b47] hover:border-sky-400/60 hover:text-white hover:-translate-y-0.5 hover:shadow-md'
                                      }`}
                                    >
                                      <div className="flex items-center gap-1 font-semibold leading-none">
                                        <span className="text-[11px] transition-transform duration-150 group-hover/phase:scale-110">
                                          {phase.icon}
                                        </span>
                                        <span className="truncate">{phase.shortLabel}</span>
                                      </div>
                                      <div
                                        className={`text-[8px] font-mono leading-none mt-0.5 ${
                                          isSelectedPhase ? 'text-slate-900 font-bold' : 'text-slate-400'
                                        }`}
                                      >
                                        {phase.gateRangeLabel} ({phaseDocCount})
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>

                              {vbplProjectPhaseFilter !== 'ALL' && (
                                <div className="px-1.5 py-1 rounded bg-slate-950/80 border border-slate-800/90 flex items-center justify-between gap-1 text-[9px]">
                                  <span className="text-slate-300 truncate">
                                    {
                                      PROJECT_PHASE_META.find(p => p.id === vbplProjectPhaseFilter)
                                        ?.desc
                                    }
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setVbplProjectPhaseFilter('ALL')}
                                    className="text-rose-300 hover:text-rose-200 font-mono shrink-0"
                                  >
                                    ✕
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Danh sách Thẻ theo từng Dự án (Đưa dự án đang chọn lên đầu tiên) */}
                            {[...TAXONOMY_3D.projectTypes]
                              .sort((a, b) =>
                                a.code === activeProjectArchetype
                                  ? -1
                                  : b.code === activeProjectArchetype
                                  ? 1
                                  : 0
                              )
                              .map(pt => {
                                const q = categorySearch.trim().toLowerCase();
                                const projDocs = legalDocs.filter(d => {
                                  if (!d.projectAxes.includes(pt.code)) return false;
                                  if (legalCutoffMode === 'PROJECT_TRANSITION') {
                                    const projMilestones =
                                      projectLegalDatesMap[pt.code] || PRESET_LEGACY_2023_2024;
                                    const cut = evaluateLegalDocumentCutoff(
                                      d,
                                      projMilestones,
                                      'PROJECT_TRANSITION'
                                    );
                                    if (!cut.included) return false;
                                  } else if (d.validityPeriod === 'AMENDED') {
                                    return false;
                                  }
                                  if (!matchesDocProjectPhase(d, vbplProjectPhaseFilter)) {
                                    return false;
                                  }
                                  if (
                                    vbplDomainFilter !== 'ALL' &&
                                    d.primaryDomain !== vbplDomainFilter &&
                                    !d.secondaryDomains.includes(
                                      vbplDomainFilter as FunctionalDomainCode
                                    )
                                  ) {
                                    return false;
                                  }
                                  if (!q) return true;
                                  return (
                                    pt.code.toLowerCase().includes(q) ||
                                    pt.name.toLowerCase().includes(q) ||
                                    d.docNumber.toLowerCase().includes(q) ||
                                    d.title.toLowerCase().includes(q) ||
                                    d.primaryDomain.toLowerCase().includes(q)
                                  );
                                });

                                // Hồ sơ dự án (HSDA) & Stage-Gate gắn với dự án này (phục vụ mở rộng hồ sơ dự án)
                                const projDossiers = approvalWorkflows.filter(wf => {
                                  if (!matchesDossierProjectPhase(wf.gateRef, vbplProjectPhaseFilter)) {
                                    return false;
                                  }
                                  if (!q) return true;
                                  return (
                                    wf.docCode.toLowerCase().includes(q) ||
                                    wf.title.toLowerCase().includes(q) ||
                                    wf.ssotFileName.toLowerCase().includes(q)
                                  );
                                });

                                const isProjExpanded =
                                  pt.code === activeProjectArchetype
                                    ? expandedStandaloneProjects[pt.code] ?? true
                                    : !!expandedStandaloneProjects[pt.code];
                                const isCurrentActiveProj = pt.code === activeProjectArchetype;
                                const activeSubMode = projectCardSubTab[pt.code] || 'VBPL';

                                return (
                                  <div
                                    key={pt.code}
                                    className={`group/proj rounded-lg border overflow-hidden transition-all duration-200 ${
                                      isCurrentActiveProj
                                        ? 'border-emerald-400 bg-[#0d1f33] shadow-md shadow-emerald-500/10 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-500/15'
                                        : 'border-slate-800/90 bg-[#0e172a]/85 hover:border-emerald-400/70 hover:bg-[#13233b] hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-0.5'
                                    }`}
                                  >
                                    {/* Header Thẻ Dự án */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const nextExp = !isProjExpanded;
                                        setExpandedStandaloneProjects(prev => ({
                                          ...prev,
                                          [pt.code]: nextExp,
                                        }));
                                        setActiveProjectArchetype(pt.code);
                                        setVbplProjectFilter(pt.code);
                                        setVbplIndustryGroupFilter('ALL');
                                        setPane2SubTab('DOCS');
                                      }}
                                      className={`w-full text-left px-2.5 py-2 flex items-center justify-between gap-1.5 transition-all duration-200 ${
                                        isCurrentActiveProj
                                          ? 'bg-gradient-to-r from-emerald-600/30 to-emerald-500/10 text-white font-bold border-b border-emerald-500/30'
                                          : 'text-slate-100 group-hover/proj:text-emerald-200 hover:bg-slate-800/70 font-semibold'
                                      }`}
                                    >
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="text-[10px] text-emerald-400 shrink-0 transition-transform duration-200 group-hover/proj:scale-110">
                                          {isProjExpanded ? '▾' : '▸'}
                                        </span>
                                        <span
                                          title={`Loại hình dự án: ${pt.name}`}
                                          className={`h-5 w-5 rounded flex items-center justify-center text-xs shrink-0 transition-transform duration-200 group-hover/proj:scale-110 ${
                                            isCurrentActiveProj
                                              ? 'bg-emerald-500/30 border border-emerald-300/60'
                                              : 'bg-slate-900 border border-slate-700 group-hover/proj:border-emerald-400/50'
                                          }`}
                                        >
                                          {PROJECT_ARCHETYPE_ICONS[pt.code]}
                                        </span>
                                        <span
                                          className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-extrabold shrink-0 ${
                                            isCurrentActiveProj
                                              ? 'bg-emerald-400 text-slate-950'
                                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                          }`}
                                        >
                                          {pt.code}
                                        </span>
                                        <span className="truncate text-xs">
                                          {pt.name.split('(')[0].trim()}
                                        </span>
                                      </div>
                                      <span
                                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono tabular-nums shrink-0 transition-all duration-200 ${
                                          isCurrentActiveProj
                                            ? 'bg-amber-400 text-slate-950 font-bold'
                                            : 'bg-slate-950 text-emerald-300 border border-slate-800 group-hover/proj:bg-emerald-500/20 group-hover/proj:border-emerald-400/50'
                                        }`}
                                      >
                                        {projDocs.length} VBPL
                                      </span>
                                    </button>

                                    {/* Nội dung Thẻ của Dự án: Chuyển đổi giữa [Thẻ VBPL] và [Thẻ Hồ sơ dự án (HSDA)] */}
                                    {isProjExpanded && (
                                      <div className="p-1.5 space-y-1.5 bg-[#07111e]">
                                        <div className="px-1.5 py-1 rounded bg-[#0c1a2e] border border-slate-800 text-[10px] text-slate-300">
                                          <div className="font-semibold text-emerald-300 truncate">
                                            🏛️ {pt.authority}
                                          </div>
                                          <div className="text-[9px] text-slate-400 line-clamp-2 mt-0.5">
                                            {pt.specialNote}
                                          </div>
                                        </div>

                                        {/* Sub-tab bên trong Dự án: [⚖️ Thẻ VBPL liên quan] | [📁 Hồ sơ dự án (HSDA)] */}
                                        <div className="grid grid-cols-2 gap-1 bg-[#050b14] p-0.5 rounded border border-slate-800 text-[10px]">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setProjectCardSubTab(prev => ({
                                                ...prev,
                                                [pt.code]: 'VBPL',
                                              }))
                                            }
                                            className={`py-1 px-1.5 rounded font-semibold transition truncate ${
                                              activeSubMode === 'VBPL'
                                                ? 'bg-emerald-500 text-slate-950 font-bold'
                                                : 'text-slate-400 hover:text-white'
                                            }`}
                                          >
                                            ⚖️ VBPL ({projDocs.length})
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setProjectCardSubTab(prev => ({
                                                ...prev,
                                                [pt.code]: 'HSDA',
                                              }))
                                            }
                                            className={`py-1 px-1.5 rounded font-semibold transition truncate ${
                                              activeSubMode === 'HSDA'
                                                ? 'bg-amber-500 text-slate-950 font-bold'
                                                : 'text-slate-400 hover:text-white'
                                            }`}
                                          >
                                            📁 Hồ sơ DA ({projDossiers.length})
                                          </button>
                                        </div>

                                        {/* Thanh điều khiển chế độ hiển thị: [🧭 Theo Cấp độ Gate] vs [📋 Danh sách phẳng] */}
                                        <div className="p-1.5 rounded-md bg-[#0a1628] border border-slate-800/90 space-y-1.5">
                                          <div className="flex items-center justify-between gap-1">
                                            <div className="grid grid-cols-2 gap-1 flex-1 bg-[#050b14] p-0.5 rounded border border-slate-800/80 text-[9px]">
                                              <button
                                                type="button"
                                                onClick={() => setProjectDocGroupMode('BY_GATE')}
                                                title="Nhóm các thẻ văn bản theo trình tự Cấp độ Gate (G0 → G15)"
                                                className={`py-1 px-1.5 rounded font-mono font-semibold transition flex items-center justify-center gap-1 truncate ${
                                                  projectDocGroupMode === 'BY_GATE'
                                                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                                                    : 'text-slate-400 hover:text-white'
                                                }`}
                                              >
                                                <span>🧭</span>
                                                <span className="truncate">Theo Cấp độ Gate</span>
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setProjectDocGroupMode('FLAT');
                                                  setVbplGateFilter('ALL');
                                                }}
                                                title="Hiển thị danh sách phẳng tất cả văn bản của dự án"
                                                className={`py-1 px-1.5 rounded font-mono font-semibold transition flex items-center justify-center gap-1 truncate ${
                                                  projectDocGroupMode === 'FLAT'
                                                    ? 'bg-sky-500 text-slate-950 font-bold shadow-xs'
                                                    : 'text-slate-400 hover:text-white'
                                                }`}
                                              >
                                                <span>📋</span>
                                                <span className="truncate">Danh sách phẳng</span>
                                              </button>
                                            </div>

                                            {projectDocGroupMode === 'BY_GATE' && (
                                              <div className="flex items-center gap-0.5 shrink-0">
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const nextMap = { ...expandedProjectGates };
                                                    gates.forEach(g => {
                                                      nextMap[`${pt.code}__${g.gate}`] = true;
                                                    });
                                                    setExpandedProjectGates(nextMap);
                                                  }}
                                                  title="Mở rộng tất cả Cấp độ Gate"
                                                  className="px-1.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-[8px] font-mono text-emerald-300 transition"
                                                >
                                                  Mở hết
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const nextMap = { ...expandedProjectGates };
                                                    gates.forEach(g => {
                                                      nextMap[`${pt.code}__${g.gate}`] = false;
                                                    });
                                                    setExpandedProjectGates(nextMap);
                                                  }}
                                                  title="Thu gọn tất cả Cấp độ Gate"
                                                  className="px-1.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-[8px] font-mono text-slate-400 hover:text-white transition"
                                                >
                                                  Thu gọn
                                                </button>
                                              </div>
                                            )}
                                          </div>

                                          {vbplGateFilter !== 'ALL' && (
                                            <div className="px-1.5 py-1 rounded bg-amber-500/15 border border-amber-500/40 flex items-center justify-between gap-1 text-[9px]">
                                              <span className="font-mono text-amber-300 truncate">
                                                🎯 Đang lọc Cột 2 theo Gate: <b>{vbplGateFilter}</b>
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() => setVbplGateFilter('ALL')}
                                                className="text-rose-300 hover:text-white font-mono font-bold shrink-0"
                                              >
                                                Bỏ lọc ✕
                                              </button>
                                            </div>
                                          )}
                                        </div>

                                        {activeSubMode === 'VBPL' ? (
                                          projectDocGroupMode === 'BY_GATE' ? (
                                            <div className="space-y-1.5">
                                              {gates
                                                .filter(gateItem => {
                                                  if (
                                                    vbplProjectPhaseFilter !== 'ALL' &&
                                                    !matchesDossierProjectPhase(
                                                      gateItem.gate,
                                                      vbplProjectPhaseFilter
                                                    )
                                                  ) {
                                                    return false;
                                                  }
                                                  return projDocs.some(d =>
                                                    d.linkedGates.includes(gateItem.gate)
                                                  );
                                                })
                                                .map((gateItem, gateIdx) => {
                                                  const gateKey = `${pt.code}__${gateItem.gate}`;
                                                  const isGateOpen =
                                                    expandedProjectGates[gateKey] ?? true;
                                                  const isGateFiltered =
                                                    vbplGateFilter === gateItem.gate;

                                                  // Các văn bản thuộc Gate này (ưu tiên văn bản có primaryDomain khớp functionalTags của Gate lên đầu)
                                                  const gateDocs = [...projDocs]
                                                    .filter(d =>
                                                      d.linkedGates.includes(gateItem.gate)
                                                    )
                                                    .sort((a, b) => {
                                                      const aPrimary =
                                                        gateItem.functionalTags.includes(
                                                          a.primaryDomain
                                                        )
                                                          ? 0
                                                          : 1;
                                                      const bPrimary =
                                                        gateItem.functionalTags.includes(
                                                          b.primaryDomain
                                                        )
                                                          ? 0
                                                          : 1;
                                                      return aPrimary - bPrimary;
                                                    });

                                                  const isPrepPhase = [
                                                    'G0',
                                                    'G1',
                                                    'G2',
                                                    'G3',
                                                    'G4',
                                                    'G5',
                                                    'G6',
                                                  ].includes(gateItem.gate);
                                                  const isExecPhase = [
                                                    'G7',
                                                    'G8',
                                                    'G9',
                                                    'G10',
                                                    'G11',
                                                    'G12',
                                                    'G13',
                                                  ].includes(gateItem.gate);

                                                  const gateBadgeStyle = isPrepPhase
                                                    ? 'bg-sky-500 text-slate-950 border-sky-300'
                                                    : isExecPhase
                                                    ? 'bg-amber-500 text-slate-950 border-amber-300'
                                                    : 'bg-emerald-500 text-slate-950 border-emerald-300';

                                                  const gateBorderStyle = isGateFiltered
                                                    ? 'border-amber-400 bg-[#12243d] shadow-md shadow-amber-500/10'
                                                    : isPrepPhase
                                                    ? 'border-sky-500/30 bg-[#0b192c]/90 hover:border-sky-400/60'
                                                    : isExecPhase
                                                    ? 'border-amber-500/30 bg-[#0e1b2e]/90 hover:border-amber-400/60'
                                                    : 'border-emerald-500/30 bg-[#0b1f2e]/90 hover:border-emerald-400/60';

                                                  const phaseShortTag = isPrepPhase
                                                    ? 'GĐ Chuẩn bị'
                                                    : isExecPhase
                                                    ? 'GĐ Thực hiện'
                                                    : 'GĐ Kết thúc';

                                                  const projectGateNote =
                                                    gateItem.projectNotes?.[pt.code];

                                                  return (
                                                    <div
                                                      key={gateItem.gate}
                                                      className={`rounded-lg border overflow-hidden transition-all duration-150 ${gateBorderStyle}`}
                                                    >
                                                      {/* Header Cấp độ Gate */}
                                                      <div className="px-2 py-1.5 bg-[#081322]/90 border-b border-slate-800/80 flex flex-col gap-1">
                                                        <div className="flex items-center justify-between gap-1">
                                                          <button
                                                            type="button"
                                                            onClick={() =>
                                                              setExpandedProjectGates(prev => ({
                                                                ...prev,
                                                                [gateKey]: !isGateOpen,
                                                              }))
                                                            }
                                                            className="flex items-center gap-1.5 min-w-0 flex-1 text-left group/ghdr"
                                                            title={`Trình tự ${gateIdx + 1} — ${gateItem.gate}: ${gateItem.name}`}
                                                          >
                                                            <span className="text-[10px] text-amber-400 shrink-0">
                                                              {isGateOpen ? '▾' : '▸'}
                                                            </span>
                                                            <span
                                                              className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-extrabold border shrink-0 shadow-xs ${gateBadgeStyle}`}
                                                            >
                                                              {gateItem.gate}
                                                            </span>
                                                            <span className="text-[11px] font-bold text-white group-hover/ghdr:text-amber-300 truncate transition">
                                                              {gateItem.name}
                                                            </span>
                                                          </button>

                                                          <div className="flex items-center gap-1 shrink-0">
                                                            <button
                                                              type="button"
                                                              onClick={() => {
                                                                const nextGate = isGateFiltered
                                                                  ? 'ALL'
                                                                  : gateItem.gate;
                                                                setVbplGateFilter(nextGate);
                                                                setActiveProjectArchetype(pt.code);
                                                                setVbplProjectFilter(pt.code);
                                                                setPane2SubTab('DOCS');
                                                              }}
                                                              title={`Lọc danh sách văn bản Cột 2 theo cổng ${gateItem.gate}`}
                                                              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border transition ${
                                                                isGateFiltered
                                                                  ? 'bg-amber-400 text-slate-950 border-white'
                                                                  : 'bg-slate-900 text-sky-300 border-slate-700 hover:border-amber-400 hover:text-amber-300'
                                                              }`}
                                                            >
                                                              {gateDocs.length} VB
                                                            </button>
                                                            <button
                                                              type="button"
                                                              onClick={() => {
                                                                setActiveProjectArchetype(pt.code);
                                                                setSelectedGateCode(gateItem.gate);
                                                                setActiveTab('STEP3_PLAN');
                                                                showToast(
                                                                  `Đã mở Kế hoạch Stage-Gate ${gateItem.gate} (${pt.code}) tại Bước 3`
                                                                );
                                                              }}
                                                              title={`Mở chi tiết RACI & Chốt chặn Rủi ro của ${gateItem.gate} tại Bước 3`}
                                                              className="px-1 py-0.5 rounded bg-slate-900 hover:bg-amber-500/20 border border-slate-700 hover:border-amber-500/50 text-[9px] font-mono text-amber-300 transition"
                                                            >
                                                              🧭
                                                            </button>
                                                          </div>
                                                        </div>

                                                        <div className="flex items-center justify-between gap-1 text-[9px] pl-3.5">
                                                          <span className="font-mono text-slate-400 truncate">
                                                            Bước {gateIdx + 1} · {phaseShortTag} ·{' '}
                                                            <span className="text-sky-300">
                                                              {gateItem.functionalTags.join(' / ')}
                                                            </span>
                                                          </span>
                                                        </div>

                                                        {projectGateNote && isGateOpen && (
                                                          <div className="ml-3.5 px-1.5 py-1 rounded bg-slate-950/80 border-l-2 border-emerald-400 text-[9px] text-slate-300 leading-snug">
                                                            <span className="font-mono font-bold text-emerald-300">
                                                              [{pt.code}]:{' '}
                                                            </span>
                                                            {projectGateNote}
                                                          </div>
                                                        )}
                                                      </div>

                                                      {/* Danh sách thẻ VBPL thuộc Cấp độ Gate này */}
                                                      {isGateOpen && (
                                                        <div className="p-1.5 space-y-1 bg-[#07101d]">
                                                          {gateDocs.map(doc => {
                                                            const isDocSelected =
                                                              currentLegalDoc?.id === doc.id;
                                                            const isGateCoreDoc =
                                                              gateItem.functionalTags.includes(
                                                                doc.primaryDomain
                                                              );
                                                            return (
                                                              <button
                                                                key={`${gateItem.gate}-${doc.id}`}
                                                                type="button"
                                                                onClick={() =>
                                                                  handleSelectDocFromColumn1(doc, {
                                                                    projectCode: pt.code,
                                                                  })
                                                                }
                                                                title={`${doc.docType} ${doc.docNumber} — ${doc.title} (Áp dụng tại ${gateItem.gate})`}
                                                                className={`w-full text-left p-2 rounded-md text-[11px] transition-all duration-150 flex flex-col gap-1 border ${
                                                                  isDocSelected
                                                                    ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-xs'
                                                                    : 'bg-[#101e33] border-slate-800/90 text-slate-200 hover:bg-[#152843] hover:border-emerald-400/50 hover:translate-x-0.5'
                                                                }`}
                                                              >
                                                                <div className="flex items-center justify-between gap-1">
                                                                  <div className="flex items-center gap-1 min-w-0">
                                                                    <span className="px-1 py-0.1 rounded bg-slate-950 text-amber-300 font-mono text-[9px] font-bold shrink-0">
                                                                      {doc.docType}
                                                                    </span>
                                                                    <span className="font-mono font-bold truncate text-[11px]">
                                                                      {doc.docNumber}
                                                                    </span>
                                                                  </div>
                                                                  <div className="flex items-center gap-1 shrink-0">
                                                                    {isGateCoreDoc && (
                                                                      <span className="px-1 py-0.1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono text-[8px] font-bold">
                                                                        Trọng tâm {gateItem.gate}
                                                                      </span>
                                                                    )}
                                                                    <span className="px-1 py-0.1 rounded bg-sky-950 text-sky-300 border border-sky-700/40 font-mono text-[9px]">
                                                                      {doc.primaryDomain}
                                                                    </span>
                                                                  </div>
                                                                </div>
                                                                <div className="text-[10px] text-slate-300 line-clamp-2 leading-snug">
                                                                  {doc.shortSummary || doc.title}
                                                                </div>
                                                                <div className="flex items-center justify-between gap-1 pt-0.5">
                                                                  <div className="flex flex-wrap items-center gap-0.5">
                                                                    <span className="text-[8px] font-mono text-slate-400 mr-0.5">
                                                                      Liên thông:
                                                                    </span>
                                                                    {doc.linkedGates
                                                                      .slice(0, 5)
                                                                      .map(gCode => (
                                                                        <span
                                                                          key={gCode}
                                                                          className={`px-1 rounded font-mono text-[8px] ${
                                                                            gCode === gateItem.gate
                                                                              ? 'bg-emerald-500 text-slate-950 font-bold'
                                                                              : 'bg-slate-950 text-emerald-300'
                                                                          }`}
                                                                        >
                                                                          {gCode}
                                                                        </span>
                                                                      ))}
                                                                  </div>
                                                                  <span className="text-[9px] font-mono text-amber-300 shrink-0">
                                                                    Mở VB ›
                                                                  </span>
                                                                </div>
                                                              </button>
                                                            );
                                                          })}
                                                        </div>
                                                      )}
                                                    </div>
                                                  );
                                                })}
                                            </div>
                                          ) : (
                                            <div className="space-y-1">
                                              {projDocs.map(doc => {
                                                const isDocSelected = currentLegalDoc?.id === doc.id;
                                                return (
                                                  <button
                                                    key={doc.id}
                                                    type="button"
                                                    onClick={() =>
                                                      handleSelectDocFromColumn1(doc, {
                                                        projectCode: pt.code,
                                                      })
                                                    }
                                                    title={`${doc.docType} ${doc.docNumber} — ${doc.title}`}
                                                    className={`w-full text-left p-2 rounded-md text-[11px] transition-all duration-150 flex flex-col gap-1 border ${
                                                      isDocSelected
                                                        ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-xs'
                                                        : 'bg-[#101e33] border-slate-800/90 text-slate-200 hover:bg-[#152843] hover:border-emerald-400/50 hover:translate-x-0.5'
                                                    }`}
                                                  >
                                                    <div className="flex items-center justify-between gap-1">
                                                      <div className="flex items-center gap-1 min-w-0">
                                                        <span className="px-1 py-0.1 rounded bg-slate-950 text-amber-300 font-mono text-[9px] font-bold shrink-0">
                                                          {doc.docType}
                                                        </span>
                                                        <span className="font-mono font-bold truncate text-[11px]">
                                                          {doc.docNumber}
                                                        </span>
                                                      </div>
                                                      <span className="px-1 py-0.1 rounded bg-sky-950 text-sky-300 border border-sky-700/40 font-mono text-[9px] shrink-0">
                                                        {doc.primaryDomain}
                                                      </span>
                                                    </div>
                                                    <div className="text-[10px] text-slate-300 line-clamp-2 leading-snug">
                                                      {doc.shortSummary || doc.title}
                                                    </div>
                                                    <div className="flex items-center justify-between gap-1 pt-0.5">
                                                      <div className="flex flex-wrap gap-0.5">
                                                        {doc.linkedGates.slice(0, 4).map(gCode => (
                                                          <span
                                                            key={gCode}
                                                            className="px-1 rounded bg-slate-950 text-emerald-300 font-mono text-[8px]"
                                                          >
                                                            {gCode}
                                                          </span>
                                                        ))}
                                                      </div>
                                                      <span className="text-[9px] font-mono text-amber-300">
                                                        Mở VB ›
                                                      </span>
                                                    </div>
                                                  </button>
                                                );
                                              })}
                                            </div>
                                          )
                                        ) : (
                                          <div className="space-y-1.5">
                                            <div className="px-1.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-[9px] text-amber-200">
                                              📌 Các thẻ Hồ sơ pháp lý & tờ trình phê duyệt của dự án <b>[{pt.code}]</b>
                                              {projectDocGroupMode === 'BY_GATE' ? ' (Nhóm theo Cấp độ Gate):' : ':'}
                                            </div>
                                            {projectDocGroupMode === 'BY_GATE'
                                              ? gates
                                                  .filter(gItem =>
                                                    projDossiers.some(wf => wf.gateRef === gItem.gate)
                                                  )
                                                  .map(gItem => {
                                                    const gateDossiers = projDossiers.filter(
                                                      wf => wf.gateRef === gItem.gate
                                                    );
                                                    return (
                                                      <div
                                                        key={`hsda-${gItem.gate}`}
                                                        className="rounded-lg border border-amber-500/30 bg-[#0b1628] overflow-hidden"
                                                      >
                                                        <div className="px-2 py-1 bg-[#081120] border-b border-slate-800 flex items-center justify-between text-[10px]">
                                                          <span className="font-mono font-bold text-amber-300 truncate">
                                                            {gItem.gate} · {gItem.name}
                                                          </span>
                                                          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono text-[9px] shrink-0">
                                                            {gateDossiers.length} HS
                                                          </span>
                                                        </div>
                                                        <div className="p-1.5 space-y-1">
                                                          {gateDossiers.map(wf => (
                                                            <div
                                                              key={wf.id}
                                                              onClick={() => {
                                                                setActiveProjectArchetype(pt.code);
                                                                setSelectedGateCode(wf.gateRef);
                                                                showToast(
                                                                  `Đang đối chiếu Hồ sơ dự án [${pt.code}]: ${wf.docCode} (${wf.gateRef})`
                                                                );
                                                              }}
                                                              className="p-2 rounded-md bg-[#101e33] border border-slate-800 hover:border-amber-500/50 cursor-pointer space-y-1 transition"
                                                            >
                                                              <div className="flex items-center justify-between gap-1">
                                                                <span className="px-1.5 py-0.1 rounded bg-amber-500/20 text-amber-300 font-mono text-[9px] font-bold">
                                                                  {wf.gateRef} · {wf.domain}
                                                                </span>
                                                                <span className="font-mono text-[9px] text-emerald-300">
                                                                  {wf.docCode}
                                                                </span>
                                                              </div>
                                                              <div className="text-[10px] font-semibold text-white leading-snug">
                                                                {wf.title}
                                                              </div>
                                                              <div className="text-[9px] font-mono text-slate-400 truncate">
                                                                📎 {wf.ssotFileName}
                                                              </div>
                                                            </div>
                                                          ))}
                                                        </div>
                                                      </div>
                                                    );
                                                  })
                                              : projDossiers.map(wf => (
                                                  <div
                                                    key={wf.id}
                                                    onClick={() => {
                                                      setActiveProjectArchetype(pt.code);
                                                      setSelectedGateCode(wf.gateRef);
                                                      showToast(
                                                        `Đang đối chiếu Hồ sơ dự án [${pt.code}]: ${wf.docCode} (${wf.gateRef})`
                                                      );
                                                    }}
                                                    className="p-2 rounded-md bg-[#101e33] border border-slate-800 hover:border-amber-500/50 cursor-pointer space-y-1 transition"
                                                  >
                                                    <div className="flex items-center justify-between gap-1">
                                                      <span className="px-1.5 py-0.1 rounded bg-amber-500/20 text-amber-300 font-mono text-[9px] font-bold">
                                                        {wf.gateRef} · {wf.domain}
                                                      </span>
                                                      <span className="font-mono text-[9px] text-emerald-300">
                                                        {wf.docCode}
                                                      </span>
                                                    </div>
                                                    <div className="text-[10px] font-semibold text-white leading-snug">
                                                      {wf.title}
                                                    </div>
                                                    <div className="text-[9px] font-mono text-slate-400 truncate">
                                                      📎 {wf.ssotFileName}
                                                    </div>
                                                  </div>
                                                ))}
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setActiveProjectArchetype(pt.code);
                                                setActiveTab('STEP1_INGEST');
                                              }}
                                              className="w-full py-1.5 px-2 rounded bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-semibold text-[10px] flex items-center justify-center gap-1 transition"
                                            >
                                              <span>＋</span>
                                              <span>Nạp thêm Hồ sơ dự án [{pt.code}]</span>
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>

                      <div className="p-2 border-t border-slate-800 bg-[#09101d]">
                        <button
                          onClick={() => {
                            setCol1ViewMode('BY_15_INDUSTRIES');
                            setVbplIndustryGroupFilter('ALL');
                            setVbplSubSectorFilter('ALL');
                            setVbplDomainFilter('ALL');
                            setVbplProjectFilter('ALL');
                            setVbplProjectPhaseFilter('ALL');
                            setFilterDocType('ALL');
                            setFilterValidityPeriod('ALL');
                            setFilterTreeByActiveProject(false);
                            setPane2SubTab('DOCS');
                          }}
                          className="w-full py-1.5 px-2.5 rounded-md bg-[#16243d] hover:bg-[#1f3254] border border-sky-500/30 text-sky-200 text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap transition"
                        >
                          <span>🌐</span>
                          <span>Tra cứu toàn thư viện</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Thanh kéo co giãn giữa Cột 1 (Ngành) và Cột 2 (Danh sách Văn bản) */}
                  {renderVerticalSplitter({
                    id: 'VBPL_SPLIT_1',
                    onDoubleClickReset: () => {
                      setIsVbplCol1Collapsed(false);
                      setVbplCol1Pct(18);
                      showToast('Đã đặt lại chiều rộng Cột 1: Ngành · Lĩnh vực (18%)');
                    },
                    label: `Cột 1: ${Math.round(vbplCol1Pct)}%`,
                  })}

                  {/* ==========================================================
                      CỘT 2: 4 SUB-TABS + BỘ LỌC + THẺ VĂN BẢN NỘI TUYẾN (CO GIÃN)
                     ========================================================== */}
                  {isVbplCol2Collapsed ? (
                    <div className="w-8 bg-[#e8e2d5] border-r border-slate-300 flex flex-col items-center py-3 justify-between shrink-0 select-none text-slate-800">
                      <button
                        onClick={() => setIsVbplCol2Collapsed(false)}
                        title="Mở rộng Cột 2: Danh sách Văn bản & Mục lục nội tuyến"
                        className="h-7 w-6 rounded bg-[#163d5c] hover:bg-[#1e4b7a] text-white font-bold text-xs flex items-center justify-center shadow"
                      >
                        ▶
                      </button>
                      <div className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-mono font-bold tracking-widest text-[#163d5c] uppercase">
                        CỘT 2 · DANH SÁCH VĂN BẢN ({filteredLegalDocs.length})
                      </div>
                      <span className="text-xs">📂</span>
                    </div>
                  ) : (
                    <div
                      style={{ width: `${vbplCol2Pct}%` }}
                      className="w-full lg:shrink-0 min-w-[230px] bg-[#f3efe6] text-slate-800 flex flex-col overflow-hidden"
                    >
                      {/* 4 Sub-tabs: Văn bản | Kết quả | Đánh dấu | Gần đây */}
                      <div className="flex items-center bg-[#e8e2d5] border-b border-slate-300 text-[11px] font-semibold select-none shrink-0">
                        <div className="flex-1 grid grid-cols-4">
                          <button
                            onClick={() => setPane2SubTab('DOCS')}
                            className={`py-2 px-1 flex items-center justify-center gap-1 border-b-2 transition whitespace-nowrap ${
                              pane2SubTab === 'DOCS'
                                ? 'bg-[#faf7f0] text-[#b45309] border-[#b45309] font-bold'
                                : 'text-slate-600 border-transparent hover:text-slate-900'
                            }`}
                          >
                            <span>📂</span>
                            <span>Văn bản</span>
                          </button>
                          <button
                            onClick={() => setPane2SubTab('RESULTS')}
                            className={`py-2 px-1 flex items-center justify-center gap-1 border-b-2 transition whitespace-nowrap ${
                              pane2SubTab === 'RESULTS'
                                ? 'bg-[#faf7f0] text-[#b45309] border-[#b45309] font-bold'
                                : 'text-slate-600 border-transparent hover:text-slate-900'
                            }`}
                          >
                            <span>🔍</span>
                            <span>Kết quả</span>
                          </button>
                          <button
                            onClick={() => setPane2SubTab('BOOKMARKS')}
                            className={`py-2 px-1 flex items-center justify-center gap-1 border-b-2 transition whitespace-nowrap ${
                              pane2SubTab === 'BOOKMARKS'
                                ? 'bg-[#faf7f0] text-[#b45309] border-[#b45309] font-bold'
                                : 'text-slate-600 border-transparent hover:text-slate-900'
                            }`}
                          >
                            <span>🔖</span>
                            <span>Đánh dấu</span>
                          </button>
                          <button
                            onClick={() => setPane2SubTab('RECENT')}
                            className={`py-2 px-1 flex items-center justify-center gap-1 border-b-2 transition whitespace-nowrap ${
                              pane2SubTab === 'RECENT'
                                ? 'bg-[#faf7f0] text-[#b45309] border-[#b45309] font-bold'
                                : 'text-slate-600 border-transparent hover:text-slate-900'
                            }`}
                          >
                            <span>🕒</span>
                            <span>Gần đây</span>
                          </button>
                        </div>
                        <button
                          onClick={() => setIsVbplCol2Collapsed(true)}
                          title="Thu gọn Cột 2 (Danh sách Văn bản)"
                          className="mx-1.5 h-6 w-6 rounded bg-slate-300/80 hover:bg-slate-400/80 text-slate-800 text-[10px] flex items-center justify-center shrink-0"
                        >
                          ◀
                        </button>
                      </div>

                    {/* Khớp dấu + Loại + Hiệu lực */}
                    <div className="p-2.5 bg-[#f7f4ec] border-b border-slate-300 space-y-2 text-xs shrink-0">
                      <div className="flex items-center justify-between gap-2">
                        <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={exactMatchAccent}
                            onChange={e => setExactMatchAccent(e.target.checked)}
                            className="rounded border-slate-400 accent-[#163d5c]"
                          />
                          <span>Khớp dấu</span>
                        </label>

                        <div className="flex items-center gap-1.5 flex-1 justify-end">
                          <span className="text-xs text-slate-600 whitespace-nowrap">Loại:</span>
                          <select
                            value={filterDocType}
                            onChange={e => setFilterDocType(e.target.value)}
                            className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-[#163d5c]"
                          >
                            <option value="ALL">Tất cả</option>
                            {TAXONOMY_3D.legalGroups.map(dt => (
                              <option key={dt.code} value={dt.code}>
                                {dt.name} ({dt.code})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-600 whitespace-nowrap">Hiệu lực:</span>
                        <select
                          value={filterValidityPeriod}
                          disabled={legalCutoffMode === 'PROJECT_TRANSITION'}
                          onChange={e =>
                            setFilterValidityPeriod(e.target.value as 'ALL' | 'EFFECTIVE' | 'UPCOMING')
                          }
                          className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-[#163d5c] disabled:opacity-60"
                        >
                          <option value="ALL">Mọi kỳ</option>
                          <option value="EFFECTIVE">Đang có hiệu lực</option>
                          <option value="UPCOMING">Sắp có hiệu lực (từ 01/07/2026)</option>
                        </select>
                      </div>

                      {/* Bộ chuyển đổi Chế độ Điều khoản Chuyển tiếp (Legal Cut-off Engine) */}
                      <div className="pt-1.5 border-t border-slate-200/90 space-y-1.5">
                        <div className="grid grid-cols-2 gap-1 bg-[#e8e2d5] p-0.5 rounded-lg border border-slate-300 text-[10px] font-mono">
                          <button
                            type="button"
                            onClick={() => setLegalCutoffMode('CURRENT_VALID_ONLY')}
                            className={`py-1 px-1.5 rounded-md font-bold transition truncate ${
                              legalCutoffMode === 'CURRENT_VALID_ONLY'
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'text-slate-700 hover:text-slate-950'
                            }`}
                            title="Chỉ giữ lại các văn bản đang còn hiệu lực hiện tại"
                          >
                            🟢 Còn hiệu lực hiện tại
                          </button>
                          <button
                            type="button"
                            onClick={() => setLegalCutoffMode('PROJECT_TRANSITION')}
                            className={`py-1 px-1.5 rounded-md font-bold transition truncate ${
                              legalCutoffMode === 'PROJECT_TRANSITION'
                                ? 'bg-amber-500 text-slate-950 shadow-2xs'
                                : 'text-amber-900 hover:bg-amber-100'
                            }`}
                            title="Đối chiếu 3 mốc thời gian Dự án để bảo lưu VB chuyển tiếp cũ & cảnh báo quy định bắt buộc mới/hồi tố"
                          >
                            ⚖️ Theo Mốc chuyển tiếp DA
                          </button>
                        </div>

                        {legalCutoffMode === 'PROJECT_TRANSITION' && (
                          <div className="px-2 py-1 rounded bg-amber-50 border border-amber-400 text-[10px] font-mono text-amber-950 flex items-center justify-between gap-1">
                            <span className="truncate font-bold">
                              {activeProjectCutoffRegime.label}
                            </span>
                            <span className="shrink-0 text-[9px] text-amber-800">
                              [{activeProjectArchetype}]
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Bộ lọc tùy chọn Lọc nhanh Tài liệu Kỹ thuật (QCVN / TCVN) */}
                      <div className="pt-1.5 border-t border-slate-200/90 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-mono font-bold text-[#163d5c] uppercase flex items-center gap-1">
                            <span>📐</span>
                            <span>Lọc nhanh Tài liệu Kỹ thuật:</span>
                          </span>
                          {techStandardQuickFilter !== 'ALL' && (
                            <button
                              type="button"
                              onClick={() => {
                                setTechStandardQuickFilter('ALL');
                                showToast('Đã tắt bộ lọc nhanh QCVN / TCVN, hiển thị lại danh sách đầy đủ.');
                              }}
                              className="text-[10px] font-mono text-rose-700 hover:underline font-bold"
                            >
                              ✕ Bỏ lọc
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-4 gap-1 bg-[#e8e2d5] p-0.5 rounded-lg border border-slate-300 text-[10px] font-mono">
                          <button
                            type="button"
                            onClick={() => setTechStandardQuickFilter('ALL')}
                            className={`py-1 px-1 rounded font-bold transition truncate ${
                              techStandardQuickFilter === 'ALL'
                                ? 'bg-[#163d5c] text-white shadow-2xs'
                                : 'text-slate-700 hover:text-slate-950'
                            }`}
                            title="Hiển thị tất cả loại văn bản theo phạm vi đang chọn"
                          >
                            Tất cả
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const next =
                                techStandardQuickFilter === 'QCVN_TCVN' ? 'ALL' : 'QCVN_TCVN';
                              setTechStandardQuickFilter(next);
                              if (next !== 'ALL') {
                                setFilterDocType('ALL');
                                showToast(
                                  `Đang lọc nhanh toàn bộ tài liệu kỹ thuật QCVN & TCVN (${qcvnTcvnCounts.both} văn bản)`
                                );
                              }
                            }}
                            className={`py-1 px-1 rounded font-bold transition truncate ${
                              techStandardQuickFilter === 'QCVN_TCVN'
                                ? 'bg-teal-700 text-white shadow-2xs'
                                : 'text-teal-900 hover:bg-teal-100/70'
                            }`}
                            title="Chỉ hiển thị các văn bản thuộc nhóm QCVN hoặc TCVN trong danh sách"
                          >
                            QCVN+TCVN ({qcvnTcvnCounts.both})
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const next =
                                techStandardQuickFilter === 'QCVN_ONLY' ? 'ALL' : 'QCVN_ONLY';
                              setTechStandardQuickFilter(next);
                              if (next !== 'ALL') {
                                setFilterDocType('ALL');
                                showToast(`Đang lọc nhóm Quy chuẩn Quốc gia QCVN (${qcvnTcvnCounts.qcvn} văn bản)`);
                              }
                            }}
                            className={`py-1 px-1 rounded font-bold transition truncate ${
                              techStandardQuickFilter === 'QCVN_ONLY'
                                ? 'bg-amber-500 text-slate-950 shadow-2xs'
                                : 'text-amber-900 hover:bg-amber-100/70'
                            }`}
                            title="Chỉ hiển thị nhóm Quy chuẩn kỹ thuật quốc gia (QCVN)"
                          >
                            QCVN ({qcvnTcvnCounts.qcvn})
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const next =
                                techStandardQuickFilter === 'TCVN_ONLY' ? 'ALL' : 'TCVN_ONLY';
                              setTechStandardQuickFilter(next);
                              if (next !== 'ALL') {
                                setFilterDocType('ALL');
                                showToast(`Đang lọc nhóm Tiêu chuẩn Quốc gia TCVN (${qcvnTcvnCounts.tcvn} văn bản)`);
                              }
                            }}
                            className={`py-1 px-1 rounded font-bold transition truncate ${
                              techStandardQuickFilter === 'TCVN_ONLY'
                                ? 'bg-cyan-700 text-white shadow-2xs'
                                : 'text-cyan-900 hover:bg-cyan-100/70'
                            }`}
                            title="Chỉ hiển thị nhóm Tiêu chuẩn quốc gia (TCVN)"
                          >
                            TCVN ({qcvnTcvnCounts.tcvn})
                          </button>
                        </div>
                      </div>

                      {/* Thanh công cụ bật/tắt 'Chế độ thu gọn danh sách' & Đối chiếu NotebookLM (LEGAL) ngay phía trên bảng thẻ văn bản */}
                      {(() => {
                        const activeNotebook = resolveLegalNotebookForContext({
                          doc: currentLegalDoc,
                          domainCode: vbplDomainFilter,
                          gateCode: vbplGateFilter,
                          projectCode: activeProjectArchetype,
                        });
                        const notebookUrl = getResolvedNotebookUrl(activeNotebook.id);
                        const activeNodeObj =
                          currentLegalDoc?.nodes.find(n => n.id === activeNodeId) ||
                          currentLegalDoc?.nodes[0] ||
                          null;

                        return (
                          <div className="pt-1.5 border-t border-slate-200/90 space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-mono text-slate-600">
                                Hiển thị: <b className="text-[#163d5c]">{filteredLegalDocs.length}</b> văn bản
                              </span>
                              <button
                                type="button"
                                onClick={() => setIsCol2CompactMode(prev => !prev)}
                                title="Khi bật chỉ hiển thị số hiệu văn bản và trích yếu ngắn gọn, ẩn loại hình dự án, liên kết Gate và mục lục nội tuyến"
                                className={`px-2.5 py-1 rounded-md border text-[11px] font-semibold flex items-center gap-1.5 transition ${
                                  isCol2CompactMode
                                    ? 'bg-[#163d5c] text-white border-[#163d5c] shadow-2xs'
                                    : 'bg-white hover:bg-amber-50 text-slate-700 hover:text-[#163d5c] border-slate-300'
                                }`}
                              >
                                <span>{isCol2CompactMode ? '≣' : '▤'}</span>
                                <span>Chế độ thu gọn danh sách</span>
                              </button>
                            </div>

                            {/* Cụm nút NotebookLM Deep-RAG (14 sổ LEGAL) */}
                            <div className="p-1.5 rounded-lg bg-indigo-50/90 border border-indigo-200 flex flex-wrap items-center justify-between gap-1.5">
                              <div className="min-w-0 flex items-center gap-1.5">
                                <span className="px-1.5 py-0.5 rounded bg-indigo-700 text-white font-mono font-bold text-[9px] shrink-0">
                                  {activeNotebook.code}
                                </span>
                                <span
                                  className="text-[10px] font-semibold text-indigo-950 truncate"
                                  title={activeNotebook.title}
                                >
                                  {activeNotebook.shortTitle}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <a
                                  href={notebookUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() =>
                                    showToast(`Đang mở Sổ NotebookLM: ${activeNotebook.title}`)
                                  }
                                  title={`Mở trực tiếp ${activeNotebook.title} trên Google NotebookLM (${notebookUrl})`}
                                  className="px-2 py-1 rounded bg-indigo-700 hover:bg-indigo-600 text-white font-bold text-[10px] transition flex items-center gap-1 shadow-2xs whitespace-nowrap"
                                >
                                  <span>📓</span>
                                  <span>Đối chiếu NotebookLM (LEGAL)</span>
                                </a>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const promptText = buildNotebookLmCitationPrompt({
                                      notebook: activeNotebook,
                                      doc: currentLegalDoc,
                                      node: activeNodeObj,
                                      projectCode: activeProjectArchetype,
                                      projectName: currentArchetypeMeta.name,
                                      authority: currentArchetypeMeta.authority,
                                    });
                                    navigator.clipboard.writeText(promptText);
                                    showToast(
                                      `📋 Đã copy Prompt truy vấn trích dẫn toàn văn cho ${
                                        currentLegalDoc?.docNumber || activeNotebook.code
                                      }! Dán ngay vào NotebookLM.`
                                    );
                                  }}
                                  title="Copy nhanh Prompt truy vấn trích dẫn toàn văn (Số hiệu VB + Điều khoản + Loại hình dự án) để dán vào NotebookLM"
                                  className="px-2 py-1 rounded bg-white hover:bg-indigo-100 text-indigo-900 border border-indigo-300 font-semibold text-[10px] transition whitespace-nowrap"
                                >
                                  📋 Copy Prompt Toàn văn
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Danh sách thẻ văn bản + Mục lục nội tuyến */}
                    <div className={`flex-1 overflow-y-auto p-2 ${isCol2CompactMode ? 'space-y-1.5' : 'space-y-2'}`}>
                      {filteredLegalDocs.length === 0 ? (
                        <div className="p-5 text-center text-xs text-slate-600 bg-white rounded-lg border border-slate-300 space-y-2.5">
                          <p className="font-semibold text-slate-800">
                            Chưa có văn bản trong chuyên mục đang lọc.
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Bạn có thể chuyển về chuyên ngành <b>Xây dựng (15)</b>, <b>Đấu thầu (10)</b> hoặc nạp thêm văn bản mới ở Bước 1.
                          </p>
                          <div className="flex flex-wrap justify-center gap-1.5 pt-1">
                            <button
                              onClick={() => {
                                setVbplIndustryGroupFilter('IND-XAYDUNG-DAUTHAU');
                                setVbplSubSectorFilter('XD_XAYDUNG');
                                setVbplDomainFilter('ALL');
                                setVbplProjectFilter('ALL');
                                setFilterDocType('ALL');
                                setTechStandardQuickFilter('ALL');
                                setFilterValidityPeriod('ALL');
                                setPane2SubTab('DOCS');
                                setGlobalSearch('');
                              }}
                              className="px-2.5 py-1.5 rounded bg-[#163d5c] text-white font-semibold text-xs"
                            >
                              Về ngành Xây dựng (15 VB)
                            </button>
                            <button
                              onClick={() => {
                                setVbplIndustryGroupFilter('ALL');
                                setVbplSubSectorFilter('ALL');
                                setVbplDomainFilter('ALL');
                                setVbplProjectFilter('ALL');
                                setFilterDocType('ALL');
                                setTechStandardQuickFilter('ALL');
                                setFilterValidityPeriod('ALL');
                                setPane2SubTab('DOCS');
                                setGlobalSearch('');
                              }}
                              className="px-2.5 py-1.5 rounded bg-amber-500 text-slate-950 font-semibold text-xs"
                            >
                              Xem toàn thư viện
                            </button>
                          </div>
                        </div>
                      ) : (
                        filteredLegalDocs.map(doc => {
                          const isSelected = doc.id === currentLegalDoc?.id;
                          const isExpandedToc = !isCol2CompactMode && doc.id === expandedInlineDocId;
                          const isBookmarked = bookmarkedDocIds.includes(doc.id);
                          const badgeLabel =
                            doc.docType === 'LUAT'
                              ? 'LUẬT'
                              : doc.docType === 'ND'
                              ? 'NGHỊ ĐỊNH'
                              : doc.docType === 'TT'
                              ? 'THÔNG TƯ'
                              : doc.docType === 'QCVN'
                              ? 'QUY CHUẨN QCVN'
                              : doc.docType === 'TCVN'
                              ? 'TIÊU CHUẨN TCVN'
                              : doc.docType;
                          const badgeColor =
                            doc.docType === 'LUAT'
                              ? 'bg-[#c81e1e] text-white'
                              : doc.docType === 'ND'
                              ? 'bg-[#1e4b7a] text-white'
                              : doc.docType === 'QCVN'
                              ? 'bg-amber-500 text-slate-950'
                              : doc.docType === 'TCVN'
                              ? 'bg-cyan-700 text-white'
                              : 'bg-teal-700 text-white';

                          return (
                            <div
                              key={doc.id}
                              id={`col2-doc-card-${doc.id}`}
                              className={`rounded-lg border overflow-hidden transition-all shadow-xs ${
                                isSelected
                                  ? 'border-[#163d5c] bg-[#faf7f0] ring-1 ring-[#163d5c]/30'
                                  : 'border-slate-300 bg-white hover:border-slate-400'
                              }`}
                            >
                              {/* Header thẻ văn bản */}
                              <div
                                onClick={() => handleSelectDoc(doc.id, !isCol2CompactMode)}
                                className={`${
                                  isCol2CompactMode ? 'px-2.5 py-1.5' : 'p-2.5'
                                } cursor-pointer transition ${
                                  isSelected
                                    ? 'bg-[#163d5c] text-white'
                                    : 'bg-white text-slate-800 hover:bg-slate-50'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                                    {!isCol2CompactMode && (
                                      <span
                                        className={`text-[10px] ${
                                          isSelected ? 'text-sky-200' : 'text-slate-400'
                                        }`}
                                      >
                                        {isExpandedToc ? '▾' : '▸'}
                                      </span>
                                    )}
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide shrink-0 ${badgeColor}`}
                                    >
                                      {badgeLabel}
                                    </span>
                                    <span
                                      className={`font-bold text-xs truncate ${
                                        isSelected ? 'text-white' : 'text-slate-900'
                                      }`}
                                    >
                                      {doc.docNumber}
                                    </span>

                                    {!isCol2CompactMode && doc.amendBadge && (
                                      <>
                                        <span className="px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-bold text-[10px]">
                                          {doc.amendBadge}
                                        </span>
                                        <span className="px-1.5 py-0.2 rounded bg-[#1e4b7a] text-white font-bold text-[10px]">
                                          SĐ
                                        </span>
                                      </>
                                    )}

                                    {legalCutoffMode === 'PROJECT_TRANSITION' && (() => {
                                      const docCutoff = evaluateLegalDocumentCutoff(
                                        doc,
                                        activeProjectMilestones,
                                        'PROJECT_TRANSITION'
                                      );
                                      if (docCutoff.badgeType === 'TRANSITIONAL_OLD') {
                                        return (
                                          <span
                                            title={`${docCutoff.reason} (${docCutoff.basisLaw})`}
                                            className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-950 border border-amber-500 font-mono text-[9px] font-bold"
                                          >
                                            {docCutoff.badgeLabel}
                                          </span>
                                        );
                                      }
                                      if (docCutoff.badgeType === 'MANDATORY_NEW_RETROACTIVE') {
                                        return (
                                          <span
                                            title={`${docCutoff.reason} (${docCutoff.basisLaw})`}
                                            className="px-1.5 py-0.2 rounded bg-rose-600 text-white border border-rose-400 font-mono text-[9px] font-bold"
                                          >
                                            {docCutoff.badgeLabel}
                                          </span>
                                        );
                                      }
                                      if (docCutoff.badgeType === 'DIRECT_NEW_2026') {
                                        return (
                                          <span
                                            title={`${docCutoff.reason} (${docCutoff.basisLaw})`}
                                            className="px-1.5 py-0.2 rounded bg-emerald-600 text-white border border-emerald-400 font-mono text-[9px] font-bold"
                                          >
                                            {docCutoff.badgeLabel}
                                          </span>
                                        );
                                      }
                                      return null;
                                    })()}

                                    {!isCol2CompactMode && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={e => {
                                            e.stopPropagation();
                                            showToast(`Đã sao chép liên kết SSOT: ${doc.docNumber} (${doc.ssotFileName})`);
                                          }}
                                          title="Sao chép liên kết văn bản"
                                          className={`px-1 py-0.5 rounded border text-[10px] transition ${
                                            isSelected
                                              ? 'border-sky-300/40 bg-sky-900/50 text-sky-200 hover:bg-sky-800'
                                              : 'border-emerald-500/50 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                          }`}
                                        >
                                          🔗
                                        </button>

                                        <button
                                          type="button"
                                          onClick={e => {
                                            e.stopPropagation();
                                            openLawRoadmapForDoc(doc, false);
                                          }}
                                          title="Xem Road_map Phả hệ của Bộ luật (Luật gốc, Luật sửa đổi, VBHN, Nghị định, Thông tư)"
                                          className={`px-1.5 py-0.5 rounded border text-[9px] font-mono font-bold transition flex items-center gap-0.5 ${
                                            isSelected
                                              ? 'border-amber-400 bg-amber-400 text-slate-950 hover:bg-amber-300'
                                              : 'border-amber-500/60 bg-amber-50 text-amber-800 hover:bg-amber-100'
                                          }`}
                                        >
                                          <span>🗺️</span>
                                          <span>Road_map</span>
                                        </button>
                                      </>
                                    )}
                                  </div>

                                  {!isCol2CompactMode && (
                                    <button
                                      type="button"
                                      onClick={e => toggleBookmarkDoc(doc.id, e)}
                                      title="Đánh dấu văn bản"
                                      className={`text-xs shrink-0 ${
                                        isBookmarked
                                          ? 'text-amber-400'
                                          : isSelected
                                          ? 'text-slate-300 hover:text-white'
                                          : 'text-slate-400 hover:text-amber-500'
                                      }`}
                                    >
                                      ★
                                    </button>
                                  )}
                                </div>

                                <div
                                  className={`mt-1 text-[11px] leading-snug truncate ${
                                    isSelected ? 'text-sky-100 font-medium' : 'text-slate-500'
                                  }`}
                                >
                                  {isCol2CompactMode
                                    ? doc.shortSummary || doc.title
                                    : isSelected
                                    ? doc.subSectorLabel
                                    : doc.shortSummary || doc.title}
                                </div>

                                {/* Khi tắt Chế độ thu gọn: Hiển thị đầy đủ Loại hình Dự án & Liên kết Gate */}
                                {!isCol2CompactMode && (
                                  <div className="mt-1.5 space-y-1">
                                    <div className="flex flex-wrap items-center gap-1">
                                      {(doc.projectAxes || []).map(pCode => {
                                        const isProjActive =
                                          activeProjectArchetype === pCode || vbplProjectFilter === pCode;
                                        return (
                                          <span
                                            key={pCode}
                                            className={`px-1.5 py-0.2 rounded text-[9px] font-mono ${
                                              isSelected
                                                ? isProjActive
                                                  ? 'bg-amber-400 text-slate-950 font-bold'
                                                  : 'bg-sky-900/80 text-sky-200'
                                                : isProjActive
                                                ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300'
                                                : 'bg-slate-100 text-slate-600'
                                            }`}
                                          >
                                            {pCode}
                                          </span>
                                        );
                                      })}
                                    </div>

                                    {doc.linkedGates && doc.linkedGates.length > 0 && (
                                      <div className="flex flex-wrap items-center gap-1">
                                        <span
                                          className={`text-[9px] font-mono ${
                                            isSelected ? 'text-sky-200/80' : 'text-slate-400'
                                          }`}
                                        >
                                          Gate:
                                        </span>
                                        {doc.linkedGates.slice(0, 5).map(gCode => (
                                          <span
                                            key={gCode}
                                            className={`px-1 py-0.1 rounded text-[9px] font-mono font-semibold ${
                                              isSelected
                                                ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40'
                                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                            }`}
                                          >
                                            {gCode}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Cây Mục lục bung nội tuyến ngay tại Cột 2 giống hệt hình mẫu */}
                              {isExpandedToc && (
                                <div className="bg-[#faf7f0] border-t border-slate-300 max-h-80 overflow-y-auto divide-y divide-[#ede6d6] text-slate-800">
                                  {doc.nodes.map(node => {
                                    const isChapter = node.level === 'Chương';
                                    const isSection = node.level === 'Mục';
                                    const isBasis = node.level === 'Căn cứ' || node.level === 'Mở đầu';
                                    const isNodeActive = activeNodeId === node.id && isSelected;

                                    return (
                                      <div
                                        key={node.id}
                                        onClick={() => jumpToArticleNode(doc.id, node.id, false)}
                                        className={`px-3 py-2 text-xs cursor-pointer transition ${
                                          isChapter
                                            ? 'bg-[#efe6d5] text-[#8b261d] font-bold uppercase tracking-wide text-[11px]'
                                            : isSection
                                            ? 'bg-[#f5efe2] text-[#8b261d] italic font-semibold pl-4 text-[11px]'
                                            : isBasis
                                            ? 'text-[#164e63] font-bold hover:bg-[#efe8d8]'
                                            : isNodeActive
                                            ? 'bg-amber-200/70 text-slate-950 font-semibold border-l-2 border-amber-600'
                                            : 'text-slate-700 hover:bg-[#f2ece0]'
                                        }`}
                                      >
                                        {isChapter || isSection || isBasis ? (
                                          <span>
                                            {node.code}
                                            {node.title ? `. ${node.title}` : ''}
                                          </span>
                                        ) : (
                                          <span>
                                            <b className="text-[#163d5c]">{node.code}.</b> {node.title}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                  )}

                  {/* Thanh kéo co giãn giữa Cột 2 (Danh sách VB) và Cột 3 (Mục lục / Nội dung) */}
                  {renderVerticalSplitter({
                    id: 'VBPL_SPLIT_2',
                    lightTheme: true,
                    onDoubleClickReset: () => {
                      setIsVbplCol2Collapsed(false);
                      setVbplCol2Pct(26);
                      showToast('Đã đặt lại chiều rộng Cột 2: Danh sách Văn bản (26%)');
                    },
                    label: `Cột 2: ${Math.round(vbplCol2Pct)}%`,
                  })}

                  {/* ==========================================================
                      CỘT 3 (LINH HOẠT): MỤC LỤC CHẤM KẺ NGANG & NỘI DUNG CHI TIẾT
                     ========================================================== */}
                  <div className="flex-1 min-w-[300px] bg-white text-slate-900 flex flex-col overflow-hidden">
                    {currentLegalDoc && (
                      <>
                        {/* Thanh tiêu đề trên cùng của Cột 3 */}
                        <div className="h-10 px-4 border-b border-slate-300 bg-[#f6f2e9] flex items-center justify-between gap-2 shrink-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <button
                              onClick={() => setRightReaderMode('TOC_INDEX')}
                              className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 transition whitespace-nowrap ${
                                rightReaderMode === 'TOC_INDEX'
                                  ? 'bg-[#a61b1b] text-white shadow-xs'
                                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                              }`}
                            >
                              <span>📕</span>
                              <span>Mục lục</span>
                            </button>
                            <button
                              onClick={() => setRightReaderMode('FULL_CONTENT')}
                              className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 transition whitespace-nowrap ${
                                rightReaderMode === 'FULL_CONTENT'
                                  ? 'bg-[#163d5c] text-white shadow-xs'
                                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                              }`}
                            >
                              <span>📄</span>
                              <span>Nội dung chi tiết & Stage-Gate</span>
                            </button>
                            <button
                              onClick={() => {
                                if (currentLegalDoc) {
                                  setSelectedRoadmapPillarId(resolveRoadmapPillarIdForDoc(currentLegalDoc));
                                }
                                setRightReaderMode('LAW_ROADMAP');
                              }}
                              title="Xem Road_map Phả hệ cho từng Bộ luật: Luật gốc, Luật sửa đổi bổ sung, Văn bản hợp nhất, Nghị định & Thông tư"
                              className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 transition whitespace-nowrap ${
                                rightReaderMode === 'LAW_ROADMAP'
                                  ? 'bg-amber-500 text-slate-950 shadow-xs ring-1 ring-amber-600'
                                  : 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                              }`}
                            >
                              <span>🗺️</span>
                              <span>Road_map Bộ luật</span>
                            </button>
                            <button
                              onClick={() => setRightReaderMode('COMPARE_MODE')}
                              title="Mở Chế độ so sánh song song hai điều khoản bất kỳ từ hai văn bản khác nhau để phân tích sự khác biệt về pháp lý"
                              className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 transition whitespace-nowrap ${
                                rightReaderMode === 'COMPARE_MODE'
                                  ? 'bg-indigo-600 text-white shadow-xs ring-1 ring-indigo-400'
                                  : 'bg-indigo-50 text-indigo-900 border border-indigo-300 hover:bg-indigo-100'
                              }`}
                            >
                              <span>⚖️</span>
                              <span>Chế độ so sánh</span>
                            </button>
                            <span className="font-bold text-xs text-[#163d5c] truncate ml-1">
                              {rightReaderMode === 'COMPARE_MODE'
                                ? 'SO SÁNH PHÁP LÝ SONG SONG (2 VĂN BẢN)'
                                : `${
                                    currentLegalDoc.docType === 'LUAT'
                                      ? 'LUẬT'
                                      : currentLegalDoc.docType === 'ND'
                                      ? 'NGHỊ ĐỊNH'
                                      : currentLegalDoc.docType
                                  } ${currentLegalDoc.docNumber} - ${
                                    rightReaderMode === 'TOC_INDEX'
                                      ? 'Mục lục'
                                      : rightReaderMode === 'FULL_CONTENT'
                                      ? 'Toàn văn & Chốt chặn'
                                      : 'Road_map Phả hệ Bộ luật'
                                  }`}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => setReaderFontSize(s => Math.max(12, s - 1))}
                              className="px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 font-mono text-[11px]"
                            >
                              A-
                            </button>
                            <button
                              onClick={() => setReaderFontSize(s => Math.min(18, s + 1))}
                              className="px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 font-mono text-[11px]"
                            >
                              A+
                            </button>
                            <button
                              onClick={e => toggleBookmarkDoc(currentLegalDoc.id, e)}
                              title="Đánh dấu văn bản này"
                              className="px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 text-xs"
                            >
                              🖊️
                            </button>
                          </div>
                        </div>

                        {/* Khu vực nội dung cuộn của Cột 3 */}
                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                          {/* Hàng huy hiệu Metadata căn giữa giống hình mẫu */}
                          <div className="flex flex-wrap items-center justify-center gap-2 pb-3 border-b-2 border-[#163d5c]">
                            <span className="px-3 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-xs text-slate-700">
                              Ban hành <b className="text-slate-900">{currentLegalDoc.issueDate}</b>
                            </span>
                            <span className="px-3 py-0.5 rounded-full bg-amber-50 border border-amber-400 text-xs text-amber-900">
                              Hiệu lực từ <b className="text-slate-950">{currentLegalDoc.effectiveDate}</b>
                            </span>
                            <span className="px-3 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-xs text-slate-700 tabular-nums">
                              <b className="text-slate-900">{currentLegalDoc.articleCount}</b> điều
                            </span>
                            <span className="px-3 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-xs text-slate-700 tabular-nums">
                              <b className="text-slate-900">{currentLegalDoc.chapterCount}</b> chương
                            </span>
                            <span className="px-3 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-xs text-slate-700 tabular-nums">
                              <b className="text-slate-900">{currentLegalDoc.clauseTotalCount}</b> khoản/điểm
                            </span>
                            {(() => {
                              const docNoteCount = currentLegalDoc.nodes.filter(
                                n =>
                                  n.level !== 'Chương' &&
                                  n.level !== 'Mục' &&
                                  Boolean(articlePersonalNotes[getArticleNoteKey(currentLegalDoc.id, n.id)])
                              ).length;
                              return (
                                <button
                                  type="button"
                                  onClick={() => setFilterOnlyNotedNodes(prev => !prev)}
                                  title="Bấm để lọc riêng các điều khoản có ghi chú cá nhân trong văn bản này"
                                  className={`px-3 py-0.5 rounded-full border text-xs font-semibold flex items-center gap-1 transition tabular-nums ${
                                    filterOnlyNotedNodes
                                      ? 'bg-amber-500 text-slate-950 border-amber-600 font-bold shadow-xs'
                                      : docNoteCount > 0
                                      ? 'bg-amber-50 hover:bg-amber-100 border-amber-400 text-amber-900'
                                      : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-600'
                                  }`}
                                >
                                  <span>📝</span>
                                  <span>
                                    <b>{docNoteCount}</b> ghi chú cá nhân
                                    {filterOnlyNotedNodes ? ' (Đang lọc)' : ''}
                                  </span>
                                </button>
                              );
                            })()}
                            <button
                              onClick={() =>
                                showToast(
                                  `Đã kết nối CSDL Quốc gia về VBPL cho: ${currentLegalDoc.docNumber} (${currentLegalDoc.ssotFileName})`
                                )
                              }
                              className="px-3 py-0.5 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-500 text-xs font-semibold text-emerald-800 flex items-center gap-1 transition"
                            >
                              <span>🔗</span>
                              <span>CSDL quốc gia</span>
                            </button>
                          </div>

                          {/* Chế độ 1: MỤC LỤC CÓ DÒNG CHẤM KẺ NGANG (CHUẨN HÌNH MẪU) */}
                          {rightReaderMode === 'TOC_INDEX' ? (
                            <div className="space-y-2" style={{ fontSize: `${readerFontSize}px` }}>
                              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 pb-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span>
                                    📖 <b className="text-[#a61b1b] text-sm">Mục lục</b>{' '}
                                    <span>
                                      bấm vào từng dòng để xem nội dung · bấm icon <b>📝</b> cạnh số điều để thêm/sửa ghi chú cá nhân
                                    </span>
                                  </span>
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 border border-amber-300 text-[10px] font-mono text-amber-900">
                                    <span className="w-2.5 h-2.5 rounded-xs bg-amber-200 border-l-2 border-amber-500 inline-block" />
                                    <span>Nền vàng = Có ghi chú cá nhân</span>
                                  </span>
                                </div>
                                <span className="font-mono text-[11px] text-slate-400">
                                  Ghi chú / Số khoản
                                </span>
                              </div>

                              <div className="space-y-1">
                                {currentLegalDoc.nodes
                                  .filter(node => {
                                    if (!filterOnlyNotedNodes) return true;
                                    if (node.level === 'Chương' || node.level === 'Mục') return false;
                                    return Boolean(
                                      articlePersonalNotes[getArticleNoteKey(currentLegalDoc.id, node.id)]
                                    );
                                  })
                                  .map(node => {
                                    if (node.level === 'Chương') {
                                      return (
                                        <div
                                          key={node.id}
                                          id={`reader-node-${node.id}`}
                                          className="mt-4 mb-2 px-3 py-1.5 rounded-sm bg-gradient-to-r from-[#163554] via-[#2b4c6f] to-slate-200 text-white font-bold text-sm shadow-xs"
                                        >
                                          {node.code}. {node.title}
                                        </div>
                                      );
                                    }

                                    if (node.level === 'Mục') {
                                      return (
                                        <div
                                          key={node.id}
                                          id={`reader-node-${node.id}`}
                                          className="pt-2 pb-1 pl-3 text-[#991b1b] italic font-bold text-xs"
                                        >
                                          {node.code}. {node.title}
                                        </div>
                                      );
                                    }

                                    const isSelectedNode = activeNodeId === node.id;
                                    const noteKey = getArticleNoteKey(currentLegalDoc.id, node.id);
                                    const existingNote = articlePersonalNotes[noteKey];
                                    const isEditingThisNote = editingNoteKey === noteKey;

                                    return (
                                      <div key={node.id} id={`reader-node-${node.id}`} className="space-y-1">
                                        <div
                                          onClick={() => setActiveNodeId(node.id)}
                                          onDoubleClick={() => jumpToArticleNode(currentLegalDoc.id, node.id, true)}
                                          className={`group flex items-baseline justify-between gap-2 py-1.5 px-2.5 rounded cursor-pointer transition ${
                                            existingNote && isSelectedNode
                                              ? 'bg-amber-100/95 border-l-4 border-amber-500 text-slate-950 font-semibold ring-1 ring-amber-300/80 shadow-2xs'
                                              : existingNote
                                              ? 'bg-amber-50/90 hover:bg-amber-100/80 border-l-4 border-amber-400 text-slate-900'
                                              : isSelectedNode
                                              ? 'bg-sky-50/90 border-l-4 border-[#163d5c] text-slate-950 font-semibold'
                                              : 'hover:bg-slate-50 text-slate-800 border-l-4 border-transparent'
                                          }`}
                                        >
                                          <span className="text-[#164e63] group-hover:text-[#b45309] leading-relaxed">
                                            <b className="font-bold">
                                              {node.level === 'Căn cứ' || node.level === 'Mở đầu'
                                                ? node.code
                                                : `${node.code}.`}
                                            </b>
                                            {/* Icon ghi chú cá nhân hiển thị ngay bên cạnh số hiệu điều khoản */}
                                            {existingNote ? (
                                              <button
                                                type="button"
                                                onClick={e =>
                                                  openArticleNoteEditor(currentLegalDoc.id, node.id, e)
                                                }
                                                title={`Ghi chú cá nhân (${existingNote.author} · ${existingNote.updatedAt}):\n${existingNote.text}`}
                                                className="inline-flex items-center gap-0.5 ml-1.5 mr-1 px-1.5 py-0.2 rounded bg-amber-100 hover:bg-amber-200 border border-amber-400 text-amber-900 text-[10px] font-mono font-bold align-baseline shadow-2xs transition"
                                              >
                                                <span>📝</span>
                                                <span className="max-w-[140px] truncate hidden sm:inline">
                                                  {existingNote.text}
                                                </span>
                                              </button>
                                            ) : (
                                              <button
                                                type="button"
                                                onClick={e =>
                                                  openArticleNoteEditor(currentLegalDoc.id, node.id, e)
                                                }
                                                title={`Thêm ghi chú cá nhân cho ${node.code}`}
                                                className="inline-flex items-center ml-1 mr-1 px-1 py-0.2 rounded opacity-0 group-hover:opacity-100 hover:bg-amber-100 text-slate-400 hover:text-amber-800 border border-transparent hover:border-amber-300 text-[10px] font-mono transition align-baseline"
                                              >
                                                +📝
                                              </button>
                                            )}{' '}
                                            {node.title}
                                          </span>
                                          <span className="flex-1 border-b border-dotted border-slate-300 mx-1 min-w-[24px]" />
                                          <div className="flex items-center gap-1.5 shrink-0">
                                            <button
                                              type="button"
                                              onClick={e =>
                                                openArticleNoteEditor(currentLegalDoc.id, node.id, e)
                                              }
                                              title={
                                                existingNote
                                                  ? `Sửa ghi chú cá nhân: ${existingNote.text}`
                                                  : `Thêm ghi chú cá nhân vào ${node.code}`
                                              }
                                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition ${
                                                existingNote
                                                  ? 'bg-amber-100 text-amber-900 border border-amber-400 font-bold hover:bg-amber-200'
                                                  : 'opacity-0 group-hover:opacity-100 bg-slate-100 hover:bg-amber-50 text-slate-500 hover:text-amber-800 border border-slate-200'
                                              }`}
                                            >
                                              {existingNote ? '📝 Có ghi chú' : '+ Ghi chú'}
                                            </button>
                                            <span className="text-xs font-mono text-slate-500 tabular-nums">
                                              {node.clauseCount ?? 4}
                                            </span>
                                          </div>
                                        </div>

                                        {/* Khung nhập / chỉnh sửa Ghi chú cá nhân trực tiếp cho Điều khoản */}
                                        {isEditingThisNote && (
                                          <div
                                            onClick={e => e.stopPropagation()}
                                            className="ml-4 mr-2 my-1.5 p-3 rounded-lg bg-amber-50/95 border-2 border-amber-400 text-slate-800 space-y-2 shadow-sm"
                                          >
                                            <div className="flex items-center justify-between gap-2">
                                              <span className="text-xs font-extrabold text-amber-950 flex items-center gap-1.5">
                                                <span>📝</span>
                                                <span>
                                                  Ghi chú cá nhân tại {node.code} ({currentLegalDoc.docNumber})
                                                </span>
                                              </span>
                                              <span className="text-[10px] font-mono text-amber-800">
                                                Người tạo: {currentActor.fullName}
                                              </span>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-1">
                                              {[
                                                `Áp dụng dự án ${activeProjectArchetype}`,
                                                'Kiểm soát chặt tại Gate G12/G14',
                                                'Lưu ý tránh xuất toán KTNN',
                                                'Đối chiếu điều khoản HĐ FIDIC',
                                              ].map(tag => (
                                                <button
                                                  key={tag}
                                                  type="button"
                                                  onClick={() =>
                                                    setNoteDraftText(prev =>
                                                      prev.trim() ? `${prev.trim()} · ${tag}` : tag
                                                    )
                                                  }
                                                  className="px-2 py-0.5 rounded bg-white hover:bg-amber-100 border border-amber-300 text-[10px] font-mono text-amber-900 transition"
                                                >
                                                  + {tag}
                                                </button>
                                              ))}
                                            </div>

                                            <textarea
                                              rows={2}
                                              value={noteDraftText}
                                              onChange={e => setNoteDraftText(e.target.value)}
                                              placeholder={`Nhập ghi chú cá nhân, lưu ý áp dụng hoặc rủi ro pháp lý cho ${node.code}...`}
                                              className="w-full px-2.5 py-1.5 rounded border border-amber-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                              autoFocus
                                            />

                                            {/* Nâng cấp: Chia sẻ thành Chỉ thị Pháp lý Dùng chung của Dự án & Gắn vào Gate Bước 3 */}
                                            <div className="p-2 rounded-lg bg-white border border-amber-300 space-y-2">
                                              <div className="flex flex-wrap items-center justify-between gap-2">
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    setNoteDraftSharedToGate(prev => !prev)
                                                  }
                                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1.5 transition ${
                                                    noteDraftSharedToGate
                                                      ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                                                      : 'bg-slate-100 hover:bg-rose-50 text-slate-700 border-slate-300'
                                                  }`}
                                                >
                                                  <span>{noteDraftSharedToGate ? '✅' : '📢'}</span>
                                                  <span>
                                                    Chia sẻ thành Cảnh báo Dự án & Gắn vào Gate
                                                  </span>
                                                </button>

                                                {noteDraftSharedToGate && (
                                                  <select
                                                    value={noteDraftProjectScope}
                                                    onChange={e =>
                                                      setNoteDraftProjectScope(
                                                        e.target.value as
                                                          | ProjectArchetypeCode
                                                          | 'ALL'
                                                      )
                                                    }
                                                    className="px-2 py-0.5 rounded border border-slate-300 bg-slate-50 text-[10px] font-mono text-slate-800"
                                                  >
                                                    <option value="ALL">
                                                      Áp dụng: Tất cả 6 loại hình DA
                                                    </option>
                                                    <option value={activeProjectArchetype}>
                                                      Chỉ dự án [{activeProjectArchetype}]
                                                    </option>
                                                  </select>
                                                )}
                                              </div>

                                              {noteDraftSharedToGate && (
                                                <div className="space-y-1">
                                                  <div className="text-[10px] font-mono text-slate-600">
                                                    Chọn Cấp độ Gate hiển thị thẻ{' '}
                                                    <b className="text-rose-700">
                                                      "📌 Lưu ý Pháp lý từ Ban QLDA"
                                                    </b>{' '}
                                                    tại Bước 3:
                                                  </div>
                                                  <div className="flex flex-wrap gap-1">
                                                    {gates.map(gItem => {
                                                      const isSelectedGate =
                                                        noteDraftTargetGates.includes(gItem.gate);
                                                      return (
                                                        <button
                                                          key={gItem.gate}
                                                          type="button"
                                                          onClick={() =>
                                                            toggleDraftTargetGate(gItem.gate)
                                                          }
                                                          className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold border transition ${
                                                            isSelectedGate
                                                              ? 'bg-amber-500 text-slate-950 border-amber-700'
                                                              : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-amber-100'
                                                          }`}
                                                        >
                                                          {isSelectedGate ? '✓ ' : ''}
                                                          {gItem.gate}
                                                        </button>
                                                      );
                                                    })}
                                                  </div>
                                                </div>
                                              )}
                                            </div>

                                            <div className="flex items-center justify-between gap-2">
                                              <div className="flex items-center gap-1.5">
                                                <button
                                                  type="button"
                                                  onClick={e =>
                                                    saveArticlePersonalNote(
                                                      currentLegalDoc.id,
                                                      node.id,
                                                      node.code,
                                                      e
                                                    )
                                                  }
                                                  className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-2xs transition"
                                                >
                                                  💾 Lưu ghi chú
                                                </button>
                                                {existingNote && (
                                                  <button
                                                    type="button"
                                                    onClick={e =>
                                                      deleteArticlePersonalNote(
                                                        currentLegalDoc.id,
                                                        node.id,
                                                        node.code,
                                                        e
                                                      )
                                                    }
                                                    className="px-2.5 py-1 rounded bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 font-semibold text-xs transition"
                                                  >
                                                    🗑️ Xóa
                                                  </button>
                                                )}
                                              </div>
                                              <button
                                                type="button"
                                                onClick={() => setEditingNoteKey(null)}
                                                className="px-2.5 py-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold transition"
                                              >
                                                Đóng
                                              </button>
                                            </div>
                                          </div>
                                        )}

                                        {/* Khi click vào dòng Điều khoản trong Mục lục, hiển thị ngay hộp trích xuất nội dung + Ghi chú cá nhân + liên kết Bước 3/Bước 4 */}
                                        {isSelectedNode && node.content && (
                                          <div className="ml-4 mr-2 my-1.5 p-3.5 rounded-lg bg-[#faf7f0] border border-amber-400/80 text-slate-800 space-y-2 shadow-xs">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                              <span className="text-xs font-bold text-[#163d5c]">
                                                Nội dung trích xuất — {node.code}: {node.title}
                                              </span>
                                              <div className="flex flex-wrap items-center gap-1.5">
                                                <button
                                                  type="button"
                                                  onClick={e =>
                                                    sendArticleToCompare(
                                                      'LEFT',
                                                      currentLegalDoc.id,
                                                      node.id,
                                                      false,
                                                      e
                                                    )
                                                  }
                                                  title="Đặt điều khoản này làm Điều khoản A để đối chiếu"
                                                  className={`px-2 py-0.5 rounded text-[11px] font-bold border transition ${
                                                    compareLeftDocId === currentLegalDoc.id &&
                                                    compareLeftNodeId === node.id
                                                      ? 'bg-sky-600 text-white border-sky-700'
                                                      : 'bg-sky-50 hover:bg-sky-100 text-sky-900 border-sky-300'
                                                  }`}
                                                >
                                                  ⚖️ Đặt làm A
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={e =>
                                                    sendArticleToCompare(
                                                      'RIGHT',
                                                      currentLegalDoc.id,
                                                      node.id,
                                                      true,
                                                      e
                                                    )
                                                  }
                                                  title="Đưa vào Điều khoản B và mở ngay Bảng so sánh song song"
                                                  className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold transition"
                                                >
                                                  ⚖️ So sánh (B) →
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={e =>
                                                    openArticleNoteEditor(currentLegalDoc.id, node.id, e)
                                                  }
                                                  className="px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-400 text-[11px] font-bold transition"
                                                >
                                                  📝 {existingNote ? 'Sửa ghi chú cá nhân' : 'Thêm ghi chú cá nhân'}
                                                </button>
                                                <button
                                                  onClick={() => setRightReaderMode('FULL_CONTENT')}
                                                  className="px-2 py-0.5 rounded bg-[#163d5c] text-white text-[11px] font-semibold hover:bg-[#1e4b7a]"
                                                >
                                                  Mở toàn văn & Stage-Gate →
                                                </button>
                                              </div>
                                            </div>
                                            <p className="text-xs leading-relaxed whitespace-pre-line text-slate-700">
                                              {node.content}
                                            </p>

                                            {/* Hiển thị hộp Ghi chú cá nhân đã lưu ngay trong phần xem nhanh điều khoản */}
                                            {existingNote && !isEditingThisNote && (
                                              <div className="p-2.5 rounded-lg bg-amber-100/80 border border-amber-400 text-xs text-amber-950 flex items-start justify-between gap-2">
                                                <div className="space-y-1">
                                                  <div className="font-mono text-[10px] font-bold text-amber-900 flex flex-wrap items-center gap-1.5">
                                                    <span>
                                                      📝 GHI CHÚ CÁ NHÂN ({existingNote.author} ·{' '}
                                                      {existingNote.updatedAt}):
                                                    </span>
                                                    {existingNote.isSharedToGate && (
                                                      <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white text-[9px] font-bold">
                                                        📢 Đã gắn vào Gate [
                                                        {(existingNote.targetGates || []).join(', ')}]
                                                      </span>
                                                    )}
                                                  </div>
                                                  <div className="text-slate-900 font-medium leading-snug">
                                                    {existingNote.text}
                                                  </div>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                  <button
                                                    type="button"
                                                    onClick={e =>
                                                      toggleShareNoteToGate(
                                                        currentLegalDoc.id,
                                                        node.id,
                                                        node.code,
                                                        e
                                                      )
                                                    }
                                                    title="Bật/tắt chia sẻ thành Chỉ thị Pháp lý Ban QLDA tại Bước 3"
                                                    className={`px-1.5 py-0.5 rounded border text-[10px] font-mono font-bold transition ${
                                                      existingNote.isSharedToGate
                                                        ? 'bg-rose-600 text-white border-rose-700'
                                                        : 'bg-white hover:bg-rose-50 text-rose-800 border-rose-300'
                                                    }`}
                                                  >
                                                    {existingNote.isSharedToGate
                                                      ? '📢 Đã gắn Gate'
                                                      : '📢 Gắn Gate'}
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={e =>
                                                      openArticleNoteEditor(currentLegalDoc.id, node.id, e)
                                                    }
                                                    className="px-1.5 py-0.5 rounded bg-white hover:bg-amber-200 border border-amber-400 text-[10px] font-mono font-bold text-amber-900"
                                                  >
                                                    ✏️ Sửa
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={e =>
                                                      deleteArticlePersonalNote(
                                                        currentLegalDoc.id,
                                                        node.id,
                                                        node.code,
                                                        e
                                                      )
                                                    }
                                                    className="px-1.5 py-0.5 rounded bg-white hover:bg-rose-100 border border-rose-300 text-[10px] font-mono text-rose-700"
                                                  >
                                                    🗑️
                                                  </button>
                                                </div>
                                              </div>
                                            )}

                                            <div className="pt-1.5 border-t border-amber-300/60 flex flex-wrap items-center gap-1.5">
                                              <span className="text-[11px] font-semibold text-slate-500">
                                                Liên kết Nhân quả:
                                              </span>
                                              {currentLegalDoc.linkedGates.map(g => (
                                                <button
                                                  key={g}
                                                  onClick={() => {
                                                    setSelectedGateCode(g);
                                                    setActiveTab('STEP3_PLAN');
                                                  }}
                                                  className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-bold hover:bg-amber-400"
                                                >
                                                  Bước 3: Gate {g} →
                                                </button>
                                              ))}
                                              {currentLegalDoc.linkedQAQC.map(qt => (
                                                <button
                                                  key={qt}
                                                  onClick={() => {
                                                    setSelectedProcessId(qt);
                                                    setActiveTab('STEP4_EXECUTE');
                                                  }}
                                                  className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#163d5c] text-white font-semibold hover:bg-[#1e4b7a]"
                                                >
                                                  Bước 4: Quy trình {qt} →
                                                </button>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          ) : rightReaderMode === 'FULL_CONTENT' ? (
                            /* Chế độ 2: TOÀN VĂN ĐIỀU KHOẢN & LIÊN KẾT STAGE-GATE */
                            <div className="space-y-4" style={{ fontSize: `${readerFontSize}px` }}>
                              <div className="bg-[#faf7f0] border border-slate-300 rounded-xl p-4 space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-mono font-bold text-[#163d5c]">
                                    [{currentLegalDoc.docType}] Số {currentLegalDoc.docNumber} · Ngành:{' '}
                                    {currentLegalDoc.subSectorLabel} · Chức năng: {currentLegalDoc.primaryDomain}
                                  </span>
                                  <span className="text-[11px] font-mono font-semibold text-emerald-700">
                                    {currentLegalDoc.status}
                                  </span>
                                </div>
                                <h2 className="text-base font-bold text-slate-900 leading-snug">
                                  {currentLegalDoc.title}
                                </h2>
                                <div className="text-xs text-slate-600">{currentLegalDoc.lineage}</div>

                                <div className="pt-2 border-t border-slate-300 flex flex-wrap items-center gap-1.5">
                                  <span className="text-[11px] font-semibold text-slate-600">
                                    Chuyển sang Lập kế hoạch & Thực thi:
                                  </span>
                                  {currentLegalDoc.linkedGates.map(g => (
                                    <button
                                      key={g}
                                      onClick={() => {
                                        setSelectedGateCode(g);
                                        setActiveTab('STEP3_PLAN');
                                      }}
                                      className="text-[11px] font-mono px-2.5 py-1 rounded bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 whitespace-nowrap"
                                    >
                                      Bước 3: Gate {g} →
                                    </button>
                                  ))}
                                  {currentLegalDoc.linkedQAQC.map(qt => (
                                    <button
                                      key={qt}
                                      onClick={() => {
                                        setSelectedProcessId(qt);
                                        setActiveTab('STEP4_EXECUTE');
                                      }}
                                      className="text-[11px] font-mono px-2.5 py-1 rounded bg-[#163d5c] text-white font-semibold hover:bg-[#1e4b7a] whitespace-nowrap"
                                    >
                                      Bước 4: Quy trình {qt} →
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="space-y-3">
                                {currentLegalDoc.nodes
                                  .filter(node => {
                                    if (!filterOnlyNotedNodes) return true;
                                    if (node.level === 'Chương' || node.level === 'Mục') return false;
                                    return Boolean(
                                      articlePersonalNotes[getArticleNoteKey(currentLegalDoc.id, node.id)]
                                    );
                                  })
                                  .map(node => {
                                    const noteKey = getArticleNoteKey(currentLegalDoc.id, node.id);
                                    const existingNote = articlePersonalNotes[noteKey];
                                    const isEditingThisNote = editingNoteKey === noteKey;
                                    const isChapterOrSection =
                                      node.level === 'Chương' || node.level === 'Mục';

                                    return (
                                      <div
                                        id={`reader-node-${node.id}`}
                                        key={node.id}
                                        className={`p-4 rounded-xl border space-y-2 transition ${
                                          node.level === 'Chương'
                                            ? 'bg-[#163554] text-white border-[#163554]'
                                            : !isChapterOrSection && existingNote && activeNodeId === node.id
                                            ? 'bg-amber-100/85 border-amber-500 border-l-4 ring-1 ring-amber-300 shadow-xs'
                                            : !isChapterOrSection && existingNote
                                            ? 'bg-amber-50/85 border-amber-300 border-l-4 hover:bg-amber-100/60'
                                            : activeNodeId === node.id
                                            ? 'bg-sky-50/90 border-[#163d5c] border-l-4'
                                            : 'bg-white border-slate-200'
                                        }`}
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <div
                                            className={`font-bold ${
                                              node.level === 'Chương'
                                                ? 'text-amber-300'
                                                : 'text-[#163d5c]'
                                            }`}
                                          >
                                            <span>{node.code}.</span>
                                            {!isChapterOrSection && existingNote && (
                                              <button
                                                type="button"
                                                onClick={e =>
                                                  openArticleNoteEditor(currentLegalDoc.id, node.id, e)
                                                }
                                                title={`Ghi chú cá nhân (${existingNote.author} · ${existingNote.updatedAt}):\n${existingNote.text}`}
                                                className="inline-flex items-center gap-1 ml-1.5 mr-1 px-1.5 py-0.5 rounded bg-amber-100 hover:bg-amber-200 border border-amber-400 text-amber-900 text-[10px] font-mono font-bold align-middle shadow-2xs transition"
                                              >
                                                <span>📝</span>
                                                <span>Ghi chú cá nhân</span>
                                              </button>
                                            )}{' '}
                                            <span>{node.title}</span>
                                          </div>

                                          {!isChapterOrSection && (
                                            <div className="flex items-center gap-1.5 shrink-0">
                                              <button
                                                type="button"
                                                onClick={e =>
                                                  sendArticleToCompare(
                                                    'LEFT',
                                                    currentLegalDoc.id,
                                                    node.id,
                                                    false,
                                                    e
                                                  )
                                                }
                                                title="Chọn làm Điều khoản A để đối chiếu"
                                                className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold border transition ${
                                                  compareLeftDocId === currentLegalDoc.id &&
                                                  compareLeftNodeId === node.id
                                                    ? 'bg-sky-600 text-white border-sky-700'
                                                    : 'bg-sky-50 hover:bg-sky-100 text-sky-900 border-sky-300'
                                                }`}
                                              >
                                                ⚖️ A
                                              </button>
                                              <button
                                                type="button"
                                                onClick={e =>
                                                  sendArticleToCompare(
                                                    'RIGHT',
                                                    currentLegalDoc.id,
                                                    node.id,
                                                    true,
                                                    e
                                                  )
                                                }
                                                title="Đặt làm Điều khoản B và mở ngay Bảng so sánh song song"
                                                className="px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-600 text-indigo-900 hover:text-white border border-indigo-300 text-[11px] font-mono font-semibold transition"
                                              >
                                                ⚖️ So sánh B
                                              </button>
                                              <button
                                                type="button"
                                                onClick={e =>
                                                  openArticleNoteEditor(currentLegalDoc.id, node.id, e)
                                                }
                                                className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold shrink-0 transition ${
                                                  existingNote
                                                    ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-400'
                                                    : 'bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-900 border border-slate-300'
                                                }`}
                                              >
                                                {existingNote ? '📝 Sửa ghi chú' : '+ 📝 Ghi chú'}
                                              </button>
                                            </div>
                                          )}
                                        </div>

                                        {node.content && (
                                          <p
                                            className={`leading-relaxed whitespace-pre-line ${
                                              node.level === 'Chương'
                                                ? 'text-slate-100'
                                                : 'text-slate-700'
                                            }`}
                                          >
                                            {node.content}
                                          </p>
                                        )}

                                        {/* Hiển thị Ghi chú cá nhân đã lưu tại chế độ Toàn văn */}
                                        {!isChapterOrSection && existingNote && !isEditingThisNote && (
                                          <div className="p-2.5 rounded-lg bg-amber-100/85 border border-amber-400 text-xs text-amber-950 flex items-start justify-between gap-2">
                                            <div className="space-y-1">
                                              <div className="font-mono text-[10px] font-bold text-amber-900 flex flex-wrap items-center gap-1.5">
                                                <span>
                                                  📝 GHI CHÚ CÁ NHÂN ({existingNote.author} ·{' '}
                                                  {existingNote.updatedAt}):
                                                </span>
                                                {existingNote.isSharedToGate && (
                                                  <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white text-[9px] font-bold">
                                                    📢 Đã gắn vào Gate [
                                                    {(existingNote.targetGates || []).join(', ')}]
                                                  </span>
                                                )}
                                              </div>
                                              <div className="text-slate-900 font-medium leading-snug">
                                                {existingNote.text}
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                              <button
                                                type="button"
                                                onClick={e =>
                                                  toggleShareNoteToGate(
                                                    currentLegalDoc.id,
                                                    node.id,
                                                    node.code,
                                                    e
                                                  )
                                                }
                                                className={`px-2 py-0.5 rounded border text-[10px] font-mono font-bold transition ${
                                                  existingNote.isSharedToGate
                                                    ? 'bg-rose-600 text-white border-rose-700'
                                                    : 'bg-white hover:bg-rose-50 text-rose-800 border-rose-300'
                                                }`}
                                              >
                                                {existingNote.isSharedToGate
                                                  ? '📢 Đã gắn Gate'
                                                  : '📢 Gắn Gate'}
                                              </button>
                                              <button
                                                type="button"
                                                onClick={e =>
                                                  openArticleNoteEditor(currentLegalDoc.id, node.id, e)
                                                }
                                                className="px-2 py-0.5 rounded bg-white hover:bg-amber-200 border border-amber-400 text-[10px] font-mono font-bold text-amber-900"
                                              >
                                                ✏️ Sửa
                                              </button>
                                              <button
                                                type="button"
                                                onClick={e =>
                                                  deleteArticlePersonalNote(
                                                    currentLegalDoc.id,
                                                    node.id,
                                                    node.code,
                                                    e
                                                  )
                                                }
                                                className="px-1.5 py-0.5 rounded bg-white hover:bg-rose-100 border border-rose-300 text-[10px] font-mono text-rose-700"
                                              >
                                                🗑️
                                              </button>
                                            </div>
                                          </div>
                                        )}

                                        {/* Khung nhập/chỉnh sửa ghi chú cá nhân tại chế độ Toàn văn */}
                                        {!isChapterOrSection && isEditingThisNote && (
                                          <div
                                            onClick={e => e.stopPropagation()}
                                            className="p-3 rounded-lg bg-amber-50 border-2 border-amber-400 text-slate-800 space-y-2"
                                          >
                                            <div className="flex items-center justify-between gap-2">
                                              <span className="text-xs font-extrabold text-amber-950">
                                                📝 Ghi chú cá nhân tại {node.code} ({currentLegalDoc.docNumber})
                                              </span>
                                              <span className="text-[10px] font-mono text-amber-800">
                                                {currentActor.fullName}
                                              </span>
                                            </div>
                                            <textarea
                                              rows={2}
                                              value={noteDraftText}
                                              onChange={e => setNoteDraftText(e.target.value)}
                                              placeholder={`Nhập ghi chú cá nhân cho ${node.code}...`}
                                              className="w-full px-2.5 py-1.5 rounded border border-amber-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                              autoFocus
                                            />
                                            <div className="p-2 rounded-lg bg-white border border-amber-300 space-y-2">
                                              <div className="flex flex-wrap items-center justify-between gap-2">
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    setNoteDraftSharedToGate(prev => !prev)
                                                  }
                                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1.5 transition ${
                                                    noteDraftSharedToGate
                                                      ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                                                      : 'bg-slate-100 hover:bg-rose-50 text-slate-700 border-slate-300'
                                                  }`}
                                                >
                                                  <span>{noteDraftSharedToGate ? '✅' : '📢'}</span>
                                                  <span>
                                                    Chia sẻ thành Cảnh báo Dự án & Gắn vào Gate
                                                  </span>
                                                </button>
                                                {noteDraftSharedToGate && (
                                                  <select
                                                    value={noteDraftProjectScope}
                                                    onChange={e =>
                                                      setNoteDraftProjectScope(
                                                        e.target.value as
                                                          | ProjectArchetypeCode
                                                          | 'ALL'
                                                      )
                                                    }
                                                    className="px-2 py-0.5 rounded border border-slate-300 bg-slate-50 text-[10px] font-mono text-slate-800"
                                                  >
                                                    <option value="ALL">
                                                      Áp dụng: Tất cả 6 loại hình DA
                                                    </option>
                                                    <option value={activeProjectArchetype}>
                                                      Chỉ dự án [{activeProjectArchetype}]
                                                    </option>
                                                  </select>
                                                )}
                                              </div>
                                              {noteDraftSharedToGate && (
                                                <div className="flex flex-wrap gap-1">
                                                  {gates.map(gItem => {
                                                    const isSelectedGate =
                                                      noteDraftTargetGates.includes(gItem.gate);
                                                    return (
                                                      <button
                                                        key={gItem.gate}
                                                        type="button"
                                                        onClick={() =>
                                                          toggleDraftTargetGate(gItem.gate)
                                                        }
                                                        className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold border transition ${
                                                          isSelectedGate
                                                            ? 'bg-amber-500 text-slate-950 border-amber-700'
                                                            : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-amber-100'
                                                        }`}
                                                      >
                                                        {isSelectedGate ? '✓ ' : ''}
                                                        {gItem.gate}
                                                      </button>
                                                    );
                                                  })}
                                                </div>
                                              )}
                                            </div>
                                            <div className="flex items-center justify-between gap-2">
                                              <div className="flex items-center gap-1.5">
                                                <button
                                                  type="button"
                                                  onClick={e =>
                                                    saveArticlePersonalNote(
                                                      currentLegalDoc.id,
                                                      node.id,
                                                      node.code,
                                                      e
                                                    )
                                                  }
                                                  className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
                                                >
                                                  💾 Lưu ghi chú
                                                </button>
                                                {existingNote && (
                                                  <button
                                                    type="button"
                                                    onClick={e =>
                                                      deleteArticlePersonalNote(
                                                        currentLegalDoc.id,
                                                        node.id,
                                                        node.code,
                                                        e
                                                      )
                                                    }
                                                    className="px-2.5 py-1 rounded bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 font-semibold text-xs transition"
                                                  >
                                                    🗑️ Xóa
                                                  </button>
                                                )}
                                              </div>
                                              <button
                                                type="button"
                                                onClick={() => setEditingNoteKey(null)}
                                                className="px-2.5 py-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold transition"
                                              >
                                                Đóng
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          ) : rightReaderMode === 'COMPARE_MODE' ? (
                            /* Chế độ 4: CHẾ ĐỘ SO SÁNH SONG SONG 2 ĐIỀU KHOẢN TỪ 2 VĂN BẢN KHÁC NHAU */
                            (() => {
                              const leftDoc =
                                legalDocs.find(d => d.id === compareLeftDocId) || legalDocs[0];
                              const leftSelectableNodes = getSelectableArticleNodes(leftDoc);
                              const leftNode =
                                leftSelectableNodes.find(n => n.id === compareLeftNodeId) ||
                                leftSelectableNodes[0] ||
                                leftDoc?.nodes[0];

                              const rightDoc =
                                legalDocs.find(d => d.id === compareRightDocId) ||
                                legalDocs.find(d => d.id !== leftDoc?.id) ||
                                legalDocs[0];
                              const rightSelectableNodes = getSelectableArticleNodes(rightDoc);
                              const rightNode =
                                rightSelectableNodes.find(n => n.id === compareRightNodeId) ||
                                rightSelectableNodes[0] ||
                                rightDoc?.nodes[0];

                              if (!leftDoc || !rightDoc || !leftNode || !rightNode) {
                                return (
                                  <div className="p-6 text-center text-sm text-slate-500">
                                    Chưa đủ dữ liệu điều khoản để so sánh.
                                  </div>
                                );
                              }

                              const isSameDocument = leftDoc.id === rightDoc.id;
                              const leftGates = leftDoc.linkedGates || [];
                              const rightGates = rightDoc.linkedGates || [];
                              const commonGates = leftGates.filter(g => rightGates.includes(g));
                              const onlyLeftGates = leftGates.filter(g => !rightGates.includes(g));
                              const onlyRightGates = rightGates.filter(g => !leftGates.includes(g));

                              const leftDomains = Array.from(
                                new Set([leftDoc.primaryDomain, ...(leftDoc.secondaryDomains || [])])
                              );
                              const rightDomains = Array.from(
                                new Set([rightDoc.primaryDomain, ...(rightDoc.secondaryDomains || [])])
                              );
                              const commonDomains = leftDomains.filter(d => rightDomains.includes(d));
                              const onlyRightDomains = rightDomains.filter(d => !leftDomains.includes(d));

                              const leftAxes = leftDoc.projectAxes || [];
                              const rightAxes = rightDoc.projectAxes || [];
                              const commonAxes = leftAxes.filter(a => rightAxes.includes(a));
                              const onlyRightAxes = rightAxes.filter(a => !leftAxes.includes(a));

                              const clauseDelta =
                                (rightNode.clauseCount ?? 0) - (leftNode.clauseCount ?? 0);
                              const yearDelta =
                                (Number(rightDoc.year) || 0) - (Number(leftDoc.year) || 0);

                              const leftNote =
                                articlePersonalNotes[getArticleNoteKey(leftDoc.id, leftNode.id)];
                              const rightNote =
                                articlePersonalNotes[getArticleNoteKey(rightDoc.id, rightNode.id)];

                              // Phát hiện các khái niệm/quy định pháp lý mới hoặc đặc thù ở từng bên
                              const leftLower = `${leftNode.title} ${leftNode.content || ''}`.toLowerCase();
                              const rightLower = `${rightNode.title} ${rightNode.content || ''}`.toLowerCase();
                              const legalMarkers = [
                                { key: 'chữ ký số', label: 'Chữ ký số / Xác thực điện tử (CA)' },
                                { key: 'điện tử', label: 'Hồ sơ / Nhật ký thi công điện tử' },
                                { key: 'bim', label: 'Áp dụng mô hình thông tin công trình (BIM)' },
                                { key: '24 giờ', label: 'Mốc thời hạn nghiệm thu 24 giờ (RFI)' },
                                { key: 'las-xd', label: 'Kiểm soát thí nghiệm hợp chuẩn LAS-XD' },
                                { key: 'phụ lục iia', label: 'Biểu mẫu chuẩn Phụ lục IIa' },
                                { key: 'ban quản lý', label: 'Thẩm quyền Ban Quản lý KCN / KKT / FTZ' },
                                { key: '1/500', label: 'Miễn GPXD theo quy hoạch 1/500' },
                                { key: 'phát sinh', label: 'Xử lý khối lượng phát sinh / Phụ lục VO' },
                                { key: 'trọn gói', label: 'Ràng buộc hợp đồng trọn gói / đơn giá' },
                              ];
                              const markersOnlyInRight = legalMarkers.filter(
                                m => rightLower.includes(m.key) && !leftLower.includes(m.key)
                              );
                              const markersOnlyInLeft = legalMarkers.filter(
                                m => leftLower.includes(m.key) && !rightLower.includes(m.key)
                              );

                              const quickComparePresets = [
                                {
                                  label: 'NĐ 06/2021 (Đ.15) ↔ NĐ 207/2026 (Đ.15)',
                                  desc: 'Nhật ký thi công & Bản vẽ hoàn công',
                                  lDoc: 'DOC-01',
                                  lNode: 'N01-D15',
                                  rDoc: 'DOC-207',
                                  rNode: 'N207-D15',
                                },
                                {
                                  label: 'NĐ 06/2021 (Đ.21) ↔ NĐ 207/2026 (Đ.21)',
                                  desc: 'Nghiệm thu công việc & RFI 24h',
                                  lDoc: 'DOC-01',
                                  lNode: 'N01-D21',
                                  rDoc: 'DOC-207',
                                  rNode: 'N207-D21',
                                },
                                {
                                  label: 'NĐ 37/2015 (Đ.37) ↔ NĐ 210/2026 (Đ.37)',
                                  desc: 'Điều chỉnh khối lượng & Phát sinh VO',
                                  lDoc: 'DOC-02',
                                  lNode: 'N02-D37',
                                  rDoc: 'DOC-210',
                                  rNode: 'N210-D37',
                                },
                                {
                                  label: 'Luật XD 135 (Đ.7) ↔ NĐ 207/2026 (Đ.15)',
                                  desc: 'BIM & Nhật ký thi công điện tử',
                                  lDoc: 'DOC-135',
                                  lNode: 'N135-D7',
                                  rDoc: 'DOC-207',
                                  rNode: 'N207-D15',
                                },
                              ];

                              const baseComparePairKey = `${leftDoc.id}::${leftNode.id}__${rightDoc.id}::${rightNode.id}`;
                              const isCurrentPairFavorited = favoriteComparePairs.some(
                                f => f.pairKey === baseComparePairKey
                              );
                              const comparePairKey = `${baseComparePairKey}__${activeProjectArchetype}`;
                              const currentPairAnalysis = aiCompareCache[comparePairKey] || null;
                              const fallbackLastAnalysis =
                                !currentPairAnalysis && lastCompletedAiPairKey
                                  ? aiCompareCache[lastCompletedAiPairKey] || null
                                  : null;
                              const displayedAiAnalysis =
                                currentPairAnalysis || fallbackLastAnalysis;
                              const isAiAnalysisStale = Boolean(
                                !currentPairAnalysis && fallbackLastAnalysis
                              );

                              return (
                                <div
                                  className="space-y-4 text-slate-800"
                                  style={{ fontSize: `${readerFontSize}px` }}
                                >
                                  {/* Thanh Header & Cặp đối chiếu mẫu nhanh */}
                                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#163554] via-[#1b3e66] to-[#263c7a] text-white space-y-2.5 shadow-sm">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded bg-indigo-400 text-slate-950 font-mono text-[11px] font-extrabold">
                                          ⚖️ CHẾ ĐỘ SO SÁNH PHÁP LÝ
                                        </span>
                                        <span className="text-xs text-sky-100 font-medium">
                                          Chọn 2 điều khoản từ 2 văn bản khác nhau để đối chiếu song song & phân tích sự khác biệt
                                        </span>
                                      </div>

                                      <div className="flex flex-wrap items-center gap-2">
                                        {/* Nút Lưu / Bỏ lưu Cặp điều khoản ưa thích */}
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleToggleFavoriteComparePair(
                                              leftDoc,
                                              leftNode,
                                              rightDoc,
                                              rightNode
                                            )
                                          }
                                          className={`px-2.5 py-1 rounded font-bold text-[11px] transition flex items-center gap-1 border shadow-xs ${
                                            isCurrentPairFavorited
                                              ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 border-white'
                                              : 'bg-white/15 hover:bg-white/25 text-amber-200 border-amber-300/60'
                                          }`}
                                          title={
                                            isCurrentPairFavorited
                                              ? 'Cặp điều khoản này đã được lưu trong danh sách ưa thích (Nhấn để bỏ lưu)'
                                              : 'Lưu cặp điều khoản đang chọn vào danh sách ưa thích để mở lại nhanh'
                                          }
                                        >
                                          <span>{isCurrentPairFavorited ? '★' : '☆'}</span>
                                          <span>
                                            {isCurrentPairFavorited
                                              ? 'Đã lưu ưa thích'
                                              : 'Lưu điều khoản ưa thích'}
                                          </span>
                                        </button>

                                        {/* Nút Ẩn/Hiện ngăn Cặp điều khoản ưa thích đã lưu */}
                                        <button
                                          type="button"
                                          onClick={() => setShowFavoritesDrawer(prev => !prev)}
                                          className={`px-2.5 py-1 rounded font-mono font-bold text-[11px] transition flex items-center gap-1 border ${
                                            showFavoritesDrawer
                                              ? 'bg-sky-400/25 text-white border-sky-300'
                                              : 'bg-slate-900/50 text-sky-200 border-sky-400/40 hover:bg-slate-900'
                                          }`}
                                          title="Đóng/mở danh sách các cặp điều khoản ưa thích đã lưu"
                                        >
                                          <span>🔖</span>
                                          <span>Đã lưu ({favoriteComparePairs.length})</span>
                                        </button>

                                        <button
                                          type="button"
                                          disabled={isAiCompareLoading}
                                          onClick={() =>
                                            handleRunAiLegalCompare(
                                              leftDoc,
                                              leftNode,
                                              rightDoc,
                                              rightNode,
                                              comparePairKey
                                            )
                                          }
                                          className="px-2.5 py-1 rounded bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold text-[11px] transition disabled:opacity-55 flex items-center gap-1 shadow-xs"
                                          title="Gọi Gemini AI phân tích chênh lệch mốc thời gian, cấp thẩm quyền và yêu cầu kỹ thuật"
                                        >
                                          <span>{isAiCompareLoading ? '⏳' : '✨'}</span>
                                          <span>
                                            {isAiCompareLoading
                                              ? 'AI đang đối soát...'
                                              : 'AI Phân tích Chênh lệch'}
                                          </span>
                                        </button>

                                        {/* Nút Đối chiếu NotebookLM (LEGAL) & Copy Prompt Truy vấn Toàn văn cho cặp điều khoản đang so sánh */}
                                        {(() => {
                                          const compareNotebook = resolveLegalNotebookForContext({
                                            doc: rightDoc || leftDoc,
                                            projectCode: activeProjectArchetype,
                                          });
                                          const compareNotebookUrl = getResolvedNotebookUrl(
                                            compareNotebook.id
                                          );
                                          return (
                                            <>
                                              <a
                                                href={compareNotebookUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={() =>
                                                  showToast(
                                                    `Đang mở ${compareNotebook.title} trên NotebookLM`
                                                  )
                                                }
                                                title={`Mở ${compareNotebook.title} (${compareNotebookUrl}) để đối chiếu nguyên văn 2 điều khoản`}
                                                className="px-2.5 py-1 rounded bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-[11px] transition flex items-center gap-1 border border-indigo-300/60 shadow-xs whitespace-nowrap"
                                              >
                                                <span>📓</span>
                                                <span>Đối chiếu NotebookLM (LEGAL)</span>
                                              </a>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const promptText = buildNotebookLmCitationPrompt({
                                                    notebook: compareNotebook,
                                                    doc: leftDoc,
                                                    node: leftNode,
                                                    secondDoc: rightDoc,
                                                    secondNode: rightNode,
                                                    projectCode: activeProjectArchetype,
                                                    projectName: currentArchetypeMeta.name,
                                                    authority: currentArchetypeMeta.authority,
                                                  });
                                                  navigator.clipboard.writeText(promptText);
                                                  showToast(
                                                    `📋 Đã copy Prompt đối chiếu toàn văn [${leftDoc.docNumber} (${leftNode.code}) ↔ ${rightDoc.docNumber} (${rightNode.code})]!`
                                                  );
                                                }}
                                                title="Copy Prompt truy vấn trích dẫn toàn văn của cặp điều khoản A & B để dán ngay vào NotebookLM"
                                                className="px-2.5 py-1 rounded bg-white/15 hover:bg-white/25 text-indigo-100 border border-indigo-300/50 font-mono font-bold text-[11px] transition whitespace-nowrap"
                                              >
                                                📋 Copy Prompt Toàn văn
                                              </button>
                                            </>
                                          );
                                        })()}

                                        <label className="inline-flex items-center gap-1.5 text-[11px] font-mono bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded cursor-pointer transition">
                                          <input
                                            type="checkbox"
                                            checked={highlightTextDiff}
                                            onChange={e => setHighlightTextDiff(e.target.checked)}
                                            className="accent-emerald-400"
                                          />
                                          <span>🔍 Tô sáng từ khác biệt</span>
                                        </label>
                                        <button
                                          type="button"
                                          onClick={swapCompareSides}
                                          className="px-2.5 py-1 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[11px] transition"
                                          title="Hoán đổi Điều khoản A và Điều khoản B"
                                        >
                                          ⇄ Đảo A ↔ B
                                        </button>
                                      </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="text-[10px] font-mono text-sky-200 uppercase">
                                        Gợi ý đối chiếu nhanh:
                                      </span>
                                      {quickComparePresets.map(preset => {
                                        const isPresetActive =
                                          compareLeftDocId === preset.lDoc &&
                                          compareLeftNodeId === preset.lNode &&
                                          compareRightDocId === preset.rDoc &&
                                          compareRightNodeId === preset.rNode;
                                        return (
                                          <button
                                            key={preset.label}
                                            type="button"
                                            title={preset.desc}
                                            onClick={() => {
                                              setCompareLeftDocId(preset.lDoc);
                                              setCompareLeftNodeId(preset.lNode);
                                              setCompareRightDocId(preset.rDoc);
                                              setCompareRightNodeId(preset.rNode);
                                              showToast(`Đang so sánh: ${preset.desc}`);
                                            }}
                                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border transition ${
                                              isPresetActive
                                                ? 'bg-amber-400 text-slate-950 border-white font-bold'
                                                : 'bg-slate-900/50 text-sky-100 border-sky-400/40 hover:bg-slate-900'
                                            }`}
                                          >
                                            {preset.label}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* KHUNG DANH SÁCH CẶP ĐIỀU KHOẢN ƯA THÍCH ĐÃ LƯU */}
                                  {showFavoritesDrawer && (
                                    <div className="p-3.5 rounded-xl bg-amber-50/90 border-2 border-amber-300 space-y-2.5 shadow-2xs">
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                          <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-mono text-[10px] font-extrabold uppercase">
                                            ★ Cặp điều khoản ưa thích đã lưu ({favoriteComparePairs.length})
                                          </span>
                                          <span className="text-[11px] text-amber-950 font-medium">
                                            Truy cập nhanh các cặp điều khoản đã từng đối chiếu &amp; phân tích pháp lý
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          {!isCurrentPairFavorited && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleToggleFavoriteComparePair(
                                                  leftDoc,
                                                  leftNode,
                                                  rightDoc,
                                                  rightNode
                                                )
                                              }
                                              className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] transition flex items-center gap-1"
                                            >
                                              <span>＋</span>
                                              <span>
                                                Lưu cặp hiện tại ({leftDoc.docNumber} {leftNode.code} ↔{' '}
                                                {rightDoc.docNumber} {rightNode.code})
                                              </span>
                                            </button>
                                          )}
                                          <button
                                            type="button"
                                            onClick={() => setShowFavoritesDrawer(false)}
                                            className="px-2 py-0.5 rounded bg-white/80 hover:bg-white text-slate-600 border border-amber-300 text-[10px] font-mono"
                                          >
                                            Thu gọn ▲
                                          </button>
                                        </div>
                                      </div>

                                      {favoriteComparePairs.length === 0 ? (
                                        <div className="p-3 rounded-lg bg-white/80 border border-amber-200 text-xs text-slate-600 flex items-center justify-between gap-2">
                                          <span>
                                            Chưa có cặp điều khoản ưa thích nào được lưu. Nhấn nút{' '}
                                            <b>&quot;☆ Lưu điều khoản ưa thích&quot;</b> ở góc trên để lưu lại cặp đang phân tích.
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleToggleFavoriteComparePair(
                                                leftDoc,
                                                leftNode,
                                                rightDoc,
                                                rightNode
                                              )
                                            }
                                            className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] shrink-0"
                                          >
                                            ★ Lưu cặp đang xem
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                          {favoriteComparePairs.map(fav => {
                                            const isFavActive =
                                              compareLeftDocId === fav.leftDocId &&
                                              compareLeftNodeId === fav.leftNodeId &&
                                              compareRightDocId === fav.rightDocId &&
                                              compareRightNodeId === fav.rightNodeId;
                                            const hasCachedAi = Object.keys(aiCompareCache).some(k =>
                                              k.startsWith(`${fav.pairKey}__`)
                                            );
                                            const isEditingThisNote = editingFavNoteId === fav.id;

                                            return (
                                              <div
                                                key={fav.id}
                                                className={`p-2.5 rounded-xl border transition flex flex-col justify-between gap-2 ${
                                                  isFavActive
                                                    ? 'bg-white border-2 border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs'
                                                    : 'bg-white/90 hover:bg-white border-amber-300/90'
                                                }`}
                                              >
                                                <div className="space-y-1">
                                                  <div className="flex items-start justify-between gap-2">
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        setCompareLeftDocId(fav.leftDocId);
                                                        setCompareLeftNodeId(fav.leftNodeId);
                                                        setCompareRightDocId(fav.rightDocId);
                                                        setCompareRightNodeId(fav.rightNodeId);
                                                        showToast(
                                                          `Đã nạp cặp điều khoản ưa thích: ${fav.leftDocNumber} (${fav.leftNodeCode}) ↔ ${fav.rightDocNumber} (${fav.rightNodeCode})`
                                                        );
                                                      }}
                                                      className="text-left group flex-1"
                                                    >
                                                      <div className="flex flex-wrap items-center gap-1.5 text-xs font-extrabold text-[#163d5c] group-hover:text-indigo-700">
                                                        <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-900 font-mono text-[10px]">
                                                          A: {fav.leftDocNumber} · {fav.leftNodeCode}
                                                        </span>
                                                        <span className="text-slate-400">↔</span>
                                                        <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-900 font-mono text-[10px]">
                                                          B: {fav.rightDocNumber} · {fav.rightNodeCode}
                                                        </span>
                                                      </div>
                                                      <div className="text-[11px] text-slate-700 font-medium mt-1 line-clamp-1">
                                                        {fav.leftNodeTitle} ↔ {fav.rightNodeTitle}
                                                      </div>
                                                    </button>

                                                    <div className="flex items-center gap-1 shrink-0">
                                                      {isFavActive && (
                                                        <span className="px-1.5 py-0.5 rounded bg-indigo-600 text-white font-mono text-[9px] font-bold">
                                                          Đang mở
                                                        </span>
                                                      )}
                                                      {hasCachedAi && (
                                                        <span
                                                          className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 font-mono text-[9px] font-bold"
                                                          title="Đã có kết quả AI Phân tích chênh lệch pháp lý trong bộ nhớ phiên"
                                                        >
                                                          ✨ Đã có AI
                                                        </span>
                                                      )}
                                                      <button
                                                        type="button"
                                                        onClick={() => {
                                                          setFavoriteComparePairs(prev =>
                                                            prev.filter(item => item.id !== fav.id)
                                                          );
                                                          showToast('Đã xóa cặp điều khoản khỏi danh sách ưa thích.');
                                                        }}
                                                        className="h-5 w-5 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-700 text-[11px] font-bold flex items-center justify-center"
                                                        title="Xóa khỏi danh sách ưa thích"
                                                      >
                                                        ✕
                                                      </button>
                                                    </div>
                                                  </div>

                                                  {/* Ghi chú nhanh trên cặp điều khoản ưa thích */}
                                                  {isEditingThisNote ? (
                                                    <div className="flex items-center gap-1.5 pt-1">
                                                      <input
                                                        type="text"
                                                        value={favNoteDraft}
                                                        onChange={e => setFavNoteDraft(e.target.value)}
                                                        placeholder="Nhập ghi chú nhận xét cho cặp điều khoản này..."
                                                        className="flex-1 px-2 py-1 rounded border border-amber-400 bg-amber-50/40 text-[11px] text-slate-800 focus:outline-none"
                                                      />
                                                      <button
                                                        type="button"
                                                        onClick={() => handleSaveFavoritePairNote(fav.id)}
                                                        className="px-2 py-1 rounded bg-emerald-600 text-white text-[10px] font-bold"
                                                      >
                                                        Lưu
                                                      </button>
                                                      <button
                                                        type="button"
                                                        onClick={() => setEditingFavNoteId(null)}
                                                        className="px-1.5 py-1 rounded bg-slate-200 text-slate-700 text-[10px]"
                                                      >
                                                        Hủy
                                                      </button>
                                                    </div>
                                                  ) : (
                                                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-600 pt-0.5">
                                                      <span className="italic truncate">
                                                        📝 {fav.customNote || 'Chưa có ghi chú'}
                                                      </span>
                                                      <button
                                                        type="button"
                                                        onClick={() => {
                                                          setEditingFavNoteId(fav.id);
                                                          setFavNoteDraft(fav.customNote || '');
                                                        }}
                                                        className="text-[10px] font-mono text-indigo-700 hover:underline shrink-0"
                                                      >
                                                        ✏️ Sửa ghi chú
                                                      </button>
                                                    </div>
                                                  )}
                                                </div>

                                                <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-100 text-[10px] font-mono text-slate-500">
                                                  <span>
                                                    {PROJECT_ARCHETYPE_ICONS[fav.projectCode]} {fav.projectCode} · Lưu:{' '}
                                                    {fav.savedAt}
                                                  </span>
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setCompareLeftDocId(fav.leftDocId);
                                                      setCompareLeftNodeId(fav.leftNodeId);
                                                      setCompareRightDocId(fav.rightDocId);
                                                      setCompareRightNodeId(fav.rightNodeId);
                                                      showToast(
                                                        `Đang đối chiếu: ${fav.leftDocNumber} (${fav.leftNodeCode}) ↔ ${fav.rightDocNumber} (${fav.rightNodeCode})`
                                                      );
                                                    }}
                                                    className={`px-2 py-0.5 rounded font-sans font-bold text-[10px] transition ${
                                                      isFavActive
                                                        ? 'bg-indigo-100 text-indigo-900'
                                                        : 'bg-[#163554] hover:bg-indigo-700 text-white'
                                                    }`}
                                                  >
                                                    {isFavActive ? '✓ Đang hiển thị' : 'Mở đối chiếu →'}
                                                  </button>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Bộ chọn 2 Văn bản & 2 Điều khoản */}
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                    {/* Bộ chọn Cột A */}
                                    <div className="p-3 rounded-xl bg-sky-50/90 border-2 border-sky-300 space-y-2">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="px-2 py-0.5 rounded bg-sky-700 text-white font-mono text-[10px] font-bold">
                                          VĂN BẢN & ĐIỀU KHOẢN A (CƠ SỞ)
                                        </span>
                                        {currentLegalDoc.id !== leftDoc.id && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const firstNode =
                                                getSelectableArticleNodes(currentLegalDoc).find(
                                                  n => n.id === activeNodeId
                                                )?.id ||
                                                getSelectableArticleNodes(currentLegalDoc)[0]?.id ||
                                                '';
                                              setCompareLeftDocId(currentLegalDoc.id);
                                              setCompareLeftNodeId(firstNode);
                                            }}
                                            className="text-[10px] font-mono px-2 py-0.5 rounded bg-white hover:bg-sky-100 text-sky-900 border border-sky-300 font-semibold transition"
                                          >
                                            📥 Lấy VB đang đọc ({currentLegalDoc.docNumber})
                                          </button>
                                        )}
                                      </div>

                                      <div className="space-y-1.5">
                                        <label className="block text-[11px] font-bold text-slate-700">
                                          1. Chọn Văn bản A:
                                        </label>
                                        <select
                                          value={leftDoc.id}
                                          onChange={e =>
                                            handleChangeCompareDoc('LEFT', e.target.value)
                                          }
                                          className="w-full px-2.5 py-1.5 rounded-lg border border-sky-300 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                                        >
                                          {legalDocs.map(doc => (
                                            <option key={doc.id} value={doc.id}>
                                              [{doc.docType}] {doc.docNumber} — {doc.title.slice(0, 75)}
                                              {doc.title.length > 75 ? '...' : ''}
                                              {doc.id === rightDoc.id ? ' (Đang chọn ở B)' : ''}
                                            </option>
                                          ))}
                                        </select>
                                      </div>

                                      <div className="space-y-1.5">
                                        <label className="block text-[11px] font-bold text-slate-700">
                                          2. Chọn Điều khoản A ({leftSelectableNodes.length} điều khả dụng):
                                        </label>
                                        <select
                                          value={leftNode.id}
                                          onChange={e => setCompareLeftNodeId(e.target.value)}
                                          className="w-full px-2.5 py-1.5 rounded-lg border border-sky-300 bg-white text-xs font-semibold text-[#163d5c] focus:outline-none focus:ring-2 focus:ring-sky-500"
                                        >
                                          {leftSelectableNodes.map(n => (
                                            <option key={n.id} value={n.id}>
                                              {n.code} {n.title}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>

                                    {/* Bộ chọn Cột B */}
                                    <div className="p-3 rounded-xl bg-indigo-50/90 border-2 border-indigo-300 space-y-2">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="px-2 py-0.5 rounded bg-indigo-700 text-white font-mono text-[10px] font-bold">
                                          VĂN BẢN & ĐIỀU KHOẢN B (ĐỐI CHIẾU)
                                        </span>
                                        {currentLegalDoc.id !== rightDoc.id && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const firstNode =
                                                getSelectableArticleNodes(currentLegalDoc).find(
                                                  n => n.id === activeNodeId
                                                )?.id ||
                                                getSelectableArticleNodes(currentLegalDoc)[0]?.id ||
                                                '';
                                              setCompareRightDocId(currentLegalDoc.id);
                                              setCompareRightNodeId(firstNode);
                                            }}
                                            className="text-[10px] font-mono px-2 py-0.5 rounded bg-white hover:bg-indigo-100 text-indigo-900 border border-indigo-300 font-semibold transition"
                                          >
                                            📥 Lấy VB đang đọc ({currentLegalDoc.docNumber})
                                          </button>
                                        )}
                                      </div>

                                      <div className="space-y-1.5">
                                        <label className="block text-[11px] font-bold text-slate-700">
                                          1. Chọn Văn bản B:
                                        </label>
                                        <select
                                          value={rightDoc.id}
                                          onChange={e =>
                                            handleChangeCompareDoc('RIGHT', e.target.value)
                                          }
                                          className="w-full px-2.5 py-1.5 rounded-lg border border-indigo-300 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                          {legalDocs.map(doc => (
                                            <option key={doc.id} value={doc.id}>
                                              [{doc.docType}] {doc.docNumber} — {doc.title.slice(0, 75)}
                                              {doc.title.length > 75 ? '...' : ''}
                                              {doc.id === leftDoc.id ? ' (Đang chọn ở A)' : ''}
                                            </option>
                                          ))}
                                        </select>
                                      </div>

                                      <div className="space-y-1.5">
                                        <label className="block text-[11px] font-bold text-slate-700">
                                          2. Chọn Điều khoản B ({rightSelectableNodes.length} điều khả dụng):
                                        </label>
                                        <select
                                          value={rightNode.id}
                                          onChange={e => setCompareRightNodeId(e.target.value)}
                                          className="w-full px-2.5 py-1.5 rounded-lg border border-indigo-300 bg-white text-xs font-semibold text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                          {rightSelectableNodes.map(n => (
                                            <option key={n.id} value={n.id}>
                                              {n.code} {n.title}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>
                                  </div>

                                  {isSameDocument && (
                                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-400 text-xs text-amber-950 flex items-center justify-between gap-2">
                                      <span>
                                        ⚠️ <b>Lưu ý:</b> Cột A và Cột B đang cùng thuộc văn bản{' '}
                                        <b>{leftDoc.docNumber}</b>. Hãy chọn 2 văn bản khác nhau ở bộ chọn phía trên để đối chiếu sự khác biệt pháp lý liên văn bản.
                                      </span>
                                      {legalDocs.find(d => d.id !== leftDoc.id) && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const altDoc = legalDocs.find(d => d.id !== leftDoc.id);
                                            if (altDoc) handleChangeCompareDoc('RIGHT', altDoc.id);
                                          }}
                                          className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] shrink-0 transition"
                                        >
                                          Chọn nhanh VB khác →
                                        </button>
                                      )}
                                    </div>
                                  )}

                                  {/* TRỢ LÝ AI PHÂN TÍCH CHÊNH LỆCH PHÁP LÝ & TÔ SÁNG CHUYÊN SÂU (THỜI GIAN · THẨM QUYỀN · KỸ THUẬT) */}
                                  <AiLegalGapAnalysisCard
                                    leftDocNumber={leftDoc.docNumber}
                                    leftNodeCode={leftNode.code}
                                    rightDocNumber={rightDoc.docNumber}
                                    rightNodeCode={rightNode.code}
                                    activeProjectArchetype={activeProjectArchetype}
                                    isLoading={isAiCompareLoading}
                                    errorMessage={aiCompareError}
                                    analysis={displayedAiAnalysis}
                                    isStaleForCurrentPair={isAiAnalysisStale}
                                    semanticHighlightEnabled={semanticHighlightEnabled}
                                    activeCategoryFilter={compareCategoryFilter}
                                    onRunAnalysis={() =>
                                      handleRunAiLegalCompare(
                                        leftDoc,
                                        leftNode,
                                        rightDoc,
                                        rightNode,
                                        comparePairKey
                                      )
                                    }
                                    onToggleSemanticHighlight={setSemanticHighlightEnabled}
                                    onChangeCategoryFilter={setCompareCategoryFilter}
                                    onCopyReport={() => {
                                      if (!currentPairAnalysis) return;
                                      const textReport = [
                                        `[AI PHÂN TÍCH CHÊNH LỆCH PHÁP LÝ — ${leftDoc.docNumber} ${leftNode.code} ↔ ${rightDoc.docNumber} ${rightNode.code}]`,
                                        `Dự án: [${activeProjectArchetype}] ${currentArchetypeMeta.name}`,
                                        `Phán quyết tóm tắt: ${currentPairAnalysis.summaryVerdict}`,
                                        `\n1. MỐC THỜI GIAN / THỜI HẠN:\n${currentPairAnalysis.timelineDifferences
                                          .map(
                                            d =>
                                              `- ${d.aspect}: A=[${d.clauseAValue}] | B=[${d.clauseBValue}] -> ${d.impactNote}`
                                          )
                                          .join('\n')}`,
                                        `\n2. CẤP THẨM QUYỀN / CHỦ THỂ:\n${currentPairAnalysis.authorityDifferences
                                          .map(
                                            d =>
                                              `- ${d.aspect}: A=[${d.clauseAValue}] | B=[${d.clauseBValue}] -> ${d.impactNote}`
                                          )
                                          .join('\n')}`,
                                        `\n3. YÊU CẦU KỸ THUẬT / HỒ SƠ:\n${currentPairAnalysis.technicalDifferences
                                          .map(
                                            d =>
                                              `- ${d.aspect}: A=[${d.clauseAValue}] | B=[${d.clauseBValue}] -> ${d.impactNote}`
                                          )
                                          .join('\n')}`,
                                        `\nKhuyến nghị: ${currentPairAnalysis.recommendedAction}`,
                                      ].join('\n');
                                      navigator.clipboard.writeText(textReport);
                                      showToast('Đã copy báo cáo Phân tích Chênh lệch Pháp lý từ AI!');
                                    }}
                                  />

                                  {/* BẢNG SO SÁNH SONG SONG 2 ĐIỀU KHOẢN */}
                                  <div className="rounded-xl border border-slate-300 overflow-x-auto shadow-xs bg-white">
                                    <table className="w-full border-collapse text-left min-w-[680px]">
                                      <thead>
                                        <tr className="bg-[#163554] text-white text-xs">
                                          <th className="w-[170px] p-3 border-r border-slate-600 font-bold uppercase tracking-wide">
                                            Tiêu chí Đối chiếu
                                          </th>
                                          <th className="w-[41%] p-3 border-r border-slate-600 bg-sky-900/90">
                                            <div className="flex items-center justify-between gap-2">
                                              <div>
                                                <div className="text-[10px] font-mono text-sky-200">
                                                  ĐIỀU KHOẢN A · {leftDoc.docType}
                                                </div>
                                                <div className="font-extrabold text-sm text-white">
                                                  {leftDoc.docNumber} · {leftNode.code}
                                                </div>
                                              </div>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  handleSelectDoc(leftDoc.id, false);
                                                  setActiveNodeId(leftNode.id);
                                                  setRightReaderMode('FULL_CONTENT');
                                                }}
                                                className="px-2 py-0.5 rounded bg-white/15 hover:bg-white/25 text-[10px] font-mono text-white shrink-0"
                                              >
                                                📖 Đọc VB A
                                              </button>
                                            </div>
                                          </th>
                                          <th className="w-[41%] p-3 bg-indigo-900/90">
                                            <div className="flex items-center justify-between gap-2">
                                              <div>
                                                <div className="text-[10px] font-mono text-indigo-200">
                                                  ĐIỀU KHOẢN B · {rightDoc.docType}
                                                </div>
                                                <div className="font-extrabold text-sm text-white">
                                                  {rightDoc.docNumber} · {rightNode.code}
                                                </div>
                                              </div>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  handleSelectDoc(rightDoc.id, false);
                                                  setActiveNodeId(rightNode.id);
                                                  setRightReaderMode('FULL_CONTENT');
                                                }}
                                                className="px-2 py-0.5 rounded bg-white/15 hover:bg-white/25 text-[10px] font-mono text-white shrink-0"
                                              >
                                                📖 Đọc VB B
                                              </button>
                                            </div>
                                          </th>
                                        </tr>
                                      </thead>

                                      <tbody className="divide-y divide-slate-200 text-xs">
                                        {/* Hàng 1: Văn bản nguồn & Hiệu lực */}
                                        <tr className="bg-slate-50/70">
                                          <td className="p-3 border-r border-slate-200 font-bold text-[#163d5c] align-top">
                                            1. Văn bản nguồn & Hiệu lực pháp lý
                                          </td>
                                          <td className="p-3 border-r border-slate-200 align-top space-y-1.5">
                                            <div className="font-bold text-slate-900 leading-snug">
                                              {leftDoc.title}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
                                              <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-900 font-bold">
                                                Ban hành: {leftDoc.issueDate}
                                              </span>
                                              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold">
                                                Hiệu lực: {leftDoc.effectiveDate}
                                              </span>
                                            </div>
                                            <div className="text-[11px] text-slate-600">
                                              <b>Trạng thái:</b> {leftDoc.status}
                                            </div>
                                            <div className="text-[11px] text-slate-500 italic">
                                              {leftDoc.lineage}
                                            </div>
                                          </td>
                                          <td className="p-3 align-top space-y-1.5">
                                            <div className="font-bold text-slate-900 leading-snug">
                                              {rightDoc.title}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
                                              <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-900 font-bold">
                                                Ban hành: {rightDoc.issueDate}
                                              </span>
                                              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold">
                                                Hiệu lực: {rightDoc.effectiveDate}
                                              </span>
                                              {yearDelta !== 0 && (
                                                <span
                                                  className={`px-1.5 py-0.5 rounded font-bold ${
                                                    yearDelta > 0
                                                      ? 'bg-rose-100 text-rose-800'
                                                      : 'bg-amber-100 text-amber-900'
                                                  }`}
                                                >
                                                  {yearDelta > 0
                                                    ? `Mới hơn +${yearDelta} năm`
                                                    : `Trước ${Math.abs(yearDelta)} năm`}
                                                </span>
                                              )}
                                            </div>
                                            <div className="text-[11px] text-slate-600">
                                              <b>Trạng thái:</b> {rightDoc.status}
                                            </div>
                                            <div className="text-[11px] text-slate-500 italic">
                                              {rightDoc.lineage}
                                            </div>
                                          </td>
                                        </tr>

                                        {/* Hàng 2: Tiêu đề Điều khoản & Quy mô khoản */}
                                        <tr>
                                          <td className="p-3 border-r border-slate-200 font-bold text-[#163d5c] align-top">
                                            2. Điều khoản & Cấu trúc quy định
                                          </td>
                                          <td className="p-3 border-r border-slate-200 align-top space-y-1">
                                            <div className="font-extrabold text-[#163d5c] text-sm">
                                              {leftNode.code} {leftNode.title}
                                            </div>
                                            <div className="text-[11px] font-mono text-slate-500">
                                              Cấp mục: <b>{leftNode.level}</b> · Số khoản:{' '}
                                              <b>{leftNode.clauseCount ?? 'N/A'}</b>
                                            </div>
                                          </td>
                                          <td className="p-3 align-top space-y-1">
                                            <div className="font-extrabold text-indigo-950 text-sm">
                                              {rightNode.code} {rightNode.title}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-slate-500">
                                              <span>
                                                Cấp mục: <b>{rightNode.level}</b> · Số khoản:{' '}
                                                <b>{rightNode.clauseCount ?? 'N/A'}</b>
                                              </span>
                                              {clauseDelta !== 0 && (
                                                <span
                                                  className={`px-1.5 py-0.2 rounded font-bold ${
                                                    clauseDelta > 0
                                                      ? 'bg-emerald-100 text-emerald-800'
                                                      : 'bg-amber-100 text-amber-900'
                                                  }`}
                                                >
                                                  {clauseDelta > 0
                                                    ? `+${clauseDelta} khoản`
                                                    : `${clauseDelta} khoản`}
                                                </span>
                                              )}
                                            </div>
                                          </td>
                                        </tr>

                                        {/* Hàng 3: Nội dung Quy định chi tiết (Kèm Highlight khác biệt & Chuyên sâu 3 nhóm) */}
                                        <tr className="bg-[#faf8f3]">
                                          <td className="p-3 border-r border-slate-200 font-bold text-[#163d5c] align-top space-y-2">
                                            <div>3. Nội dung quy định chi tiết</div>
                                            {semanticHighlightEnabled && (
                                              <div className="text-[10px] font-normal text-slate-700 space-y-1 pt-1 border-t border-slate-200">
                                                <div className="font-bold text-indigo-900">
                                                  Highlight trực tiếp 3 nhóm:
                                                </div>
                                                <div className="flex items-center gap-1">
                                                  <span className="inline-block w-2.5 h-2.5 rounded bg-cyan-300 border border-cyan-600 shrink-0" />
                                                  <span>⏱️ Mốc thời gian</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                  <span className="inline-block w-2.5 h-2.5 rounded bg-rose-300 border border-rose-600 shrink-0" />
                                                  <span>🏛️ Cấp thẩm quyền</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                  <span className="inline-block w-2.5 h-2.5 rounded bg-violet-300 border border-violet-600 shrink-0" />
                                                  <span>⚙️ Yêu cầu kỹ thuật</span>
                                                </div>
                                              </div>
                                            )}
                                            {highlightTextDiff && (
                                              <div className="text-[10px] font-normal text-slate-600 space-y-1 pt-1 border-t border-slate-200">
                                                <div className="flex items-center gap-1">
                                                  <span className="inline-block w-2.5 h-2.5 rounded bg-amber-300 border border-amber-500 shrink-0" />
                                                  <span>Từ ngữ riêng ở A</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                  <span className="inline-block w-2.5 h-2.5 rounded bg-emerald-300 border border-emerald-500 shrink-0" />
                                                  <span>Bổ sung / Khác ở B</span>
                                                </div>
                                              </div>
                                            )}
                                          </td>
                                          <td className="p-3 border-r border-slate-200 align-top">
                                            <div className="p-3 rounded-lg bg-white border border-sky-200 text-slate-800 leading-relaxed whitespace-pre-line shadow-2xs">
                                              {renderDiffHighlightedText(
                                                leftNode.content || '',
                                                rightNode.content || '',
                                                'LEFT',
                                                currentPairAnalysis?.highlightTargetsA || []
                                              )}
                                            </div>
                                          </td>
                                          <td className="p-3 align-top">
                                            <div className="p-3 rounded-lg bg-white border border-indigo-200 text-slate-800 leading-relaxed whitespace-pre-line shadow-2xs">
                                              {renderDiffHighlightedText(
                                                rightNode.content || '',
                                                leftNode.content || '',
                                                'RIGHT',
                                                currentPairAnalysis?.highlightTargetsB || []
                                              )}
                                            </div>
                                          </td>
                                        </tr>

                                        {/* Hàng 4: Mảng chức năng & Loại hình Dự án */}
                                        <tr>
                                          <td className="p-3 border-r border-slate-200 font-bold text-[#163d5c] align-top">
                                            4. Mảng chức năng & Loại hình Dự án
                                          </td>
                                          <td className="p-3 border-r border-slate-200 align-top space-y-2">
                                            <div className="flex flex-wrap gap-1">
                                              {leftDomains.map(d => (
                                                <span
                                                  key={d}
                                                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                                                    d === leftDoc.primaryDomain
                                                      ? 'bg-sky-700 text-white'
                                                      : commonDomains.includes(d)
                                                      ? 'bg-slate-200 text-slate-800'
                                                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                                                  }`}
                                                >
                                                  {d}
                                                </span>
                                              ))}
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                              {leftAxes.map(ax => (
                                                <span
                                                  key={ax}
                                                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                                                    ax === activeProjectArchetype
                                                      ? 'bg-emerald-600 text-white border-emerald-700 font-bold'
                                                      : 'bg-slate-50 text-slate-700 border-slate-300'
                                                  }`}
                                                >
                                                  {PROJECT_ARCHETYPE_ICONS[ax]} {ax}
                                                </span>
                                              ))}
                                            </div>
                                          </td>
                                          <td className="p-3 align-top space-y-2">
                                            <div className="flex flex-wrap gap-1">
                                              {rightDomains.map(d => (
                                                <span
                                                  key={d}
                                                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                                                    d === rightDoc.primaryDomain
                                                      ? 'bg-indigo-700 text-white'
                                                      : onlyRightDomains.includes(d)
                                                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-400'
                                                      : 'bg-slate-200 text-slate-800'
                                                  }`}
                                                >
                                                  {onlyRightDomains.includes(d) ? `+ ${d}` : d}
                                                </span>
                                              ))}
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                              {rightAxes.map(ax => (
                                                <span
                                                  key={ax}
                                                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                                                    ax === activeProjectArchetype
                                                      ? 'bg-emerald-600 text-white border-emerald-700 font-bold'
                                                      : onlyRightAxes.includes(ax)
                                                      ? 'bg-emerald-50 text-emerald-900 border-emerald-400 font-bold'
                                                      : 'bg-slate-50 text-slate-700 border-slate-300'
                                                  }`}
                                                >
                                                  {PROJECT_ARCHETYPE_ICONS[ax]} {ax}
                                                </span>
                                              ))}
                                            </div>
                                          </td>
                                        </tr>

                                        {/* Hàng 5: Chốt chặn Stage-Gate & Quy trình QA/QC */}
                                        <tr className="bg-slate-50/70">
                                          <td className="p-3 border-r border-slate-200 font-bold text-[#163d5c] align-top">
                                            5. Liên kết Stage-Gate & Quy trình QA/QC
                                          </td>
                                          <td className="p-3 border-r border-slate-200 align-top space-y-1.5">
                                            <div className="flex flex-wrap gap-1">
                                              {leftGates.length === 0 ? (
                                                <span className="text-[11px] text-slate-400 italic">
                                                  Không gắn Gate trực tiếp
                                                </span>
                                              ) : (
                                                leftGates.map(g => (
                                                  <button
                                                    key={g}
                                                    type="button"
                                                    onClick={() => {
                                                      setSelectedGateCode(g);
                                                      setActiveTab('STEP3_PLAN');
                                                    }}
                                                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                                                      commonGates.includes(g)
                                                        ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                                                        : 'bg-amber-100 text-amber-950 border border-amber-400 hover:bg-amber-200'
                                                    }`}
                                                  >
                                                    Gate {g}
                                                  </button>
                                                ))
                                              )}
                                            </div>
                                            {leftDoc.linkedQAQC.length > 0 && (
                                              <div className="flex flex-wrap gap-1">
                                                {leftDoc.linkedQAQC.map(qt => (
                                                  <button
                                                    key={qt}
                                                    type="button"
                                                    onClick={() => {
                                                      setSelectedProcessId(qt);
                                                      setActiveTab('STEP4_EXECUTE');
                                                    }}
                                                    className="px-2 py-0.5 rounded bg-[#163d5c] text-white text-[10px] font-mono font-semibold hover:bg-[#1e4b7a]"
                                                  >
                                                    {qt}
                                                  </button>
                                                ))}
                                              </div>
                                            )}
                                          </td>
                                          <td className="p-3 align-top space-y-1.5">
                                            <div className="flex flex-wrap gap-1">
                                              {rightGates.length === 0 ? (
                                                <span className="text-[11px] text-slate-400 italic">
                                                  Không gắn Gate trực tiếp
                                                </span>
                                              ) : (
                                                rightGates.map(g => (
                                                  <button
                                                    key={g}
                                                    type="button"
                                                    onClick={() => {
                                                      setSelectedGateCode(g);
                                                      setActiveTab('STEP3_PLAN');
                                                    }}
                                                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                                                      onlyRightGates.includes(g)
                                                        ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                                                        : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                                                    }`}
                                                  >
                                                    {onlyRightGates.includes(g)
                                                      ? `+ Gate ${g}`
                                                      : `Gate ${g}`}
                                                  </button>
                                                ))
                                              )}
                                            </div>
                                            {rightDoc.linkedQAQC.length > 0 && (
                                              <div className="flex flex-wrap gap-1">
                                                {rightDoc.linkedQAQC.map(qt => (
                                                  <button
                                                    key={qt}
                                                    type="button"
                                                    onClick={() => {
                                                      setSelectedProcessId(qt);
                                                      setActiveTab('STEP4_EXECUTE');
                                                    }}
                                                    className="px-2 py-0.5 rounded bg-indigo-700 text-white text-[10px] font-mono font-semibold hover:bg-indigo-600"
                                                  >
                                                    {qt}
                                                  </button>
                                                ))}
                                              </div>
                                            )}
                                          </td>
                                        </tr>

                                        {/* Hàng 6: Ghi chú cá nhân đính kèm */}
                                        <tr>
                                          <td className="p-3 border-r border-slate-200 font-bold text-[#163d5c] align-top">
                                            6. Ghi chú cá nhân đính kèm
                                          </td>
                                          <td className="p-3 border-r border-slate-200 align-top">
                                            {leftNote ? (
                                              <div className="p-2 rounded-lg bg-amber-50 border border-amber-300 text-amber-950 space-y-0.5">
                                                <div className="text-[10px] font-mono font-bold text-amber-900">
                                                  📝 {leftNote.author} · {leftNote.updatedAt}
                                                </div>
                                                <div className="text-xs leading-snug">{leftNote.text}</div>
                                              </div>
                                            ) : (
                                              <span className="text-[11px] text-slate-400 italic">
                                                Chưa có ghi chú cá nhân cho điều khoản A.
                                              </span>
                                            )}
                                          </td>
                                          <td className="p-3 align-top">
                                            {rightNote ? (
                                              <div className="p-2 rounded-lg bg-amber-50 border border-amber-300 text-amber-950 space-y-0.5">
                                                <div className="text-[10px] font-mono font-bold text-amber-900">
                                                  📝 {rightNote.author} · {rightNote.updatedAt}
                                                </div>
                                                <div className="text-xs leading-snug">{rightNote.text}</div>
                                              </div>
                                            ) : (
                                              <span className="text-[11px] text-slate-400 italic">
                                                Chưa có ghi chú cá nhân cho điều khoản B.
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>

                                  {/* KHỐI TỔNG HỢP PHÂN TÍCH SỰ KHÁC BIỆT PHÁP LÝ */}
                                  <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-indigo-50/70 border-2 border-indigo-200 space-y-3 shadow-xs">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <h4 className="text-sm font-extrabold text-indigo-950 flex items-center gap-1.5">
                                        <span>📊</span>
                                        <span>
                                          Tổng hợp Phân tích Sự khác biệt Pháp lý ({leftDoc.docNumber}{' '}
                                          {leftNode.code} ↔ {rightDoc.docNumber} {rightNode.code})
                                        </span>
                                      </h4>
                                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-600 text-white font-mono text-[10px] font-bold">
                                        Dự án đang xét: {PROJECT_ARCHETYPE_ICONS[activeProjectArchetype]}{' '}
                                        {activeProjectArchetype}
                                      </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                      <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1.5">
                                        <div className="font-bold text-[#163d5c]">
                                          1. Chênh lệch Hiệu lực & Phạm vi điều chỉnh
                                        </div>
                                        <ul className="list-disc pl-4 space-y-1 text-slate-700 leading-relaxed">
                                          <li>
                                            <b>Mốc thời gian hiệu lực:</b> {leftDoc.docNumber} (
                                            {leftDoc.effectiveDate}) so với {rightDoc.docNumber} (
                                            {rightDoc.effectiveDate})
                                            {yearDelta > 0
                                              ? ` → Văn bản B ban hành mới hơn ${yearDelta} năm, cần ưu tiên cập nhật quy trình mới.`
                                              : yearDelta < 0
                                              ? ` → Văn bản A ban hành mới hơn ${Math.abs(yearDelta)} năm.`
                                              : ' → Hai văn bản cùng năm hiệu lực, cần phối hợp áp dụng song hành.'}
                                          </li>
                                          <li>
                                            <b>Giao thoa Stage-Gate:</b>{' '}
                                            {commonGates.length > 0
                                              ? `Cùng chi phối Gate ${commonGates.join(', ')}.`
                                              : 'Không trùng Gate trực tiếp.'}{' '}
                                            {onlyLeftGates.length > 0 &&
                                              `Chỉ có ở A: ${onlyLeftGates.join(', ')}. `}
                                            {onlyRightGates.length > 0 &&
                                              `Bổ sung riêng ở B: ${onlyRightGates.join(', ')}.`}
                                          </li>
                                          <li>
                                            <b>Khả năng áp dụng cho {activeProjectArchetype}:</b>{' '}
                                            {leftAxes.includes(activeProjectArchetype) &&
                                            rightAxes.includes(activeProjectArchetype)
                                              ? `Cả 2 điều khoản đều áp dụng trực tiếp cho loại hình ${activeProjectArchetype}.`
                                              : `A (${
                                                  leftAxes.includes(activeProjectArchetype)
                                                    ? 'Có'
                                                    : 'Không'
                                                }) · B (${
                                                  rightAxes.includes(activeProjectArchetype)
                                                    ? 'Có'
                                                    : 'Không'
                                                }) đối với dự án ${activeProjectArchetype}.`}
                                          </li>
                                        </ul>
                                      </div>

                                      <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1.5">
                                        <div className="font-bold text-indigo-950">
                                          2. Điểm mới & Chuyển dịch Pháp lý trọng tâm
                                        </div>
                                        <ul className="list-disc pl-4 space-y-1 text-slate-700 leading-relaxed">
                                          <li>
                                            <b>Quy mô điều khoản:</b> {leftNode.code} (
                                            {leftNode.clauseCount ?? 0} khoản) ↔ {rightNode.code} (
                                            {rightNode.clauseCount ?? 0} khoản)
                                            {clauseDelta !== 0 &&
                                              ` (${clauseDelta > 0 ? '+' : ''}${clauseDelta} khoản).`}
                                          </li>
                                          {markersOnlyInRight.length > 0 ? (
                                            <li>
                                              <b className="text-emerald-800">
                                                Điểm mới nổi bật tại Điều khoản B:
                                              </b>{' '}
                                              {markersOnlyInRight.map(m => m.label).join('; ')}.
                                            </li>
                                          ) : (
                                            <li>
                                              <b>Từ khóa kỹ thuật tại B:</b> Hai điều khoản sử dụng hệ
                                              thuật ngữ tương đương; cần đối chiếu trực tiếp phần bôi
                                              màu xanh lá trong bảng trên.
                                            </li>
                                          )}
                                          {markersOnlyInLeft.length > 0 && (
                                            <li>
                                              <b className="text-amber-800">
                                                Yếu tố đặc thù chỉ nêu ở Điều khoản A:
                                              </b>{' '}
                                              {markersOnlyInLeft.map(m => m.label).join('; ')}.
                                            </li>
                                          )}
                                          {commonAxes.length > 0 && (
                                            <li>
                                              <b>Loại hình dự án dùng chung:</b> {commonAxes.join(', ')}
                                              {onlyRightAxes.length > 0 &&
                                                ` (B mở rộng thêm: ${onlyRightAxes.join(', ')})`}.
                                            </li>
                                          )}
                                        </ul>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()
                          ) : (
                            /* Chế độ 3: ROAD_MAP PHẢ HỆ CHO TỪNG BỘ LUẬT (NGAY TRONG CỘT 3) */
                            (() => {
                              const activePillar: LawRoadmapPillar =
                                LAW_ROADMAPS.find(p => p.id === selectedRoadmapPillarId) || LAW_ROADMAPS[0];
                              const visibleTiers =
                                roadmapTierFilter === 'ALL'
                                  ? activePillar.tiers
                                  : activePillar.tiers.filter(t => t.tierCode === roadmapTierFilter);
                              const totalDocsInPillar = activePillar.tiers.reduce(
                                (sum, t) => sum + t.items.length,
                                0
                              );

                              return (
                                <div className="space-y-4 text-slate-800">
                                  {/* Thanh chọn nhanh 5 Bộ luật Trụ cột */}
                                  <div className="p-3.5 rounded-xl bg-[#163554] text-white space-y-3 shadow-sm">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-mono text-[11px] font-extrabold">
                                          🗺️ ROAD_MAP BỘ LUẬT (L1 → L5)
                                        </span>
                                        <span className="text-xs text-sky-200 font-medium">
                                          Chọn Bộ luật để xem Cây phả hệ: Luật gốc · Luật sửa đổi · VBHN · Nghị định · Thông tư · QCVN
                                        </span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => setVbplSubMode('LAW_ROADMAP')}
                                        className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] transition shrink-0"
                                      >
                                        ⛶ Mở Road_map Toàn màn hình
                                      </button>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2">
                                      {LAW_ROADMAPS.map(pillar => {
                                        const isPillarSelected = pillar.id === activePillar.id;
                                        const countNodes = pillar.tiers.reduce(
                                          (acc, t) => acc + t.items.length,
                                          0
                                        );
                                        return (
                                          <button
                                            key={pillar.id}
                                            type="button"
                                            onClick={() => {
                                              setSelectedRoadmapPillarId(pillar.id);
                                              setRoadmapTierFilter('ALL');
                                            }}
                                            className={`text-left p-2.5 rounded-lg border transition flex flex-col justify-between gap-1 ${
                                              isPillarSelected
                                                ? 'bg-amber-400 text-slate-950 border-white font-bold shadow-md'
                                                : 'bg-[#0f253d] text-slate-200 border-sky-800/80 hover:bg-[#19385a] hover:border-amber-400/60'
                                            }`}
                                          >
                                            <div className="flex items-center justify-between gap-1">
                                              <span className="text-sm">{pillar.icon}</span>
                                              <span
                                                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                                                  isPillarSelected
                                                    ? 'bg-slate-950 text-amber-300 font-bold'
                                                    : 'bg-sky-950 text-sky-300'
                                                }`}
                                              >
                                                {countNodes} VB
                                              </span>
                                            </div>
                                            <div className="text-xs font-bold leading-snug truncate">
                                              {pillar.shortName}
                                            </div>
                                            <div
                                              className={`text-[10px] font-mono truncate ${
                                                isPillarSelected ? 'text-slate-800' : 'text-sky-300/80'
                                              }`}
                                            >
                                              {pillar.rootLawNumber}
                                            </div>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* Thẻ Thông tin Tổng quan & Lịch sử Sửa đổi Bổ sung của Bộ luật */}
                                  <div className="p-4 rounded-xl bg-[#faf7f0] border-2 border-[#163d5c]/30 space-y-2.5">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xl">{activePillar.icon}</span>
                                        <div>
                                          <h3 className="text-sm font-extrabold text-[#163d5c]">
                                            {activePillar.fullName}
                                          </h3>
                                          <div className="text-[11px] font-mono text-slate-600">
                                            Luật gốc trung tâm: <b className="text-[#a61b1b]">{activePillar.rootLawNumber}</b> · Tổng số văn bản trong hệ sinh thái: <b>{totalDocsInPillar} văn bản</b>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex flex-wrap items-center gap-1">
                                        {activePillar.projectAxes.map(pCode => (
                                          <span
                                            key={pCode}
                                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                                              activeProjectArchetype === pCode
                                                ? 'bg-emerald-600 text-white border-emerald-700'
                                                : 'bg-white text-slate-700 border-slate-300'
                                            }`}
                                          >
                                            {PROJECT_ARCHETYPE_ICONS[pCode]} {pCode}
                                          </span>
                                        ))}
                                      </div>
                                    </div>

                                    <p className="text-xs text-slate-700 leading-relaxed">
                                      {activePillar.summary}
                                    </p>

                                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-300 text-xs text-amber-950">
                                      <b className="text-[#991b1b] font-bold">
                                        📜 Chuỗi Lịch sử Sửa đổi, Bổ sung & Hợp nhất:{' '}
                                      </b>
                                      {activePillar.amendmentHistorySummary}
                                    </div>
                                  </div>

                                  {/* SƠ ĐỒ CÂY PHẢ HỆ TRỰC QUAN (INTERACTIVE D3 GENEALOGY TREE) */}
                                  <LawGenealogyTreeDiagram
                                    pillar={activePillar}
                                    activeDocId={selectedDocId}
                                    activeProjectArchetype={activeProjectArchetype}
                                    darkTheme={false}
                                    filterMode={legalCutoffMode}
                                    onChangeFilterMode={setLegalCutoffMode}
                                    projectMilestones={activeProjectMilestones}
                                    onSelectDoc={(docId, mode) => {
                                      handleSelectDoc(docId, false);
                                      setRightReaderMode(mode);
                                    }}
                                    onSelectGate={gateCode => {
                                      setSelectedGateCode(gateCode as any);
                                      setActiveTab('STEP3_PLAN');
                                    }}
                                  />

                                  {/* SƠ ĐỒ TIẾN HÓA THỜI GIAN & THAY THẾ VĂN BẢN (EVOLUTION TIMELINE) */}
                                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-300 space-y-3">
                                    <div className="flex items-center justify-between">
                                      <h4 className="text-xs font-extrabold uppercase tracking-wide text-[#163d5c] flex items-center gap-1.5">
                                        <span>⏳</span>
                                        <span>
                                          Lộ trình Tiến hóa & Kế thừa Văn bản (Văn bản cũ ➔ Sửa đổi / Hợp nhất ➔ Hiện hành ➔ Thế hệ mới 2026)
                                        </span>
                                      </h4>
                                    </div>

                                    <div className="space-y-3">
                                      {activePillar.evolutionChains.map(chain => (
                                        <div
                                          key={chain.id}
                                          className="p-3 rounded-lg bg-white border border-slate-200 space-y-2 shadow-2xs"
                                        >
                                          <div className="flex items-center justify-between gap-2">
                                            <span className="text-xs font-bold text-[#163d5c]">
                                              {chain.domainTitle}
                                            </span>
                                            <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-900 font-mono text-[10px] font-bold">
                                              Mảng: {chain.domainCode}
                                            </span>
                                          </div>

                                          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-2">
                                            {chain.steps.map((st, sIdx) => {
                                              const roleColor =
                                                st.roleBadge === 'MOI_2026'
                                                  ? 'border-rose-500 bg-rose-50/70'
                                                  : st.roleBadge === 'HIEN_HANH'
                                                  ? 'border-emerald-500 bg-emerald-50/70'
                                                  : st.roleBadge === 'SUA_DOI_HOP_NHAT'
                                                  ? 'border-indigo-500 bg-indigo-50/70'
                                                  : 'border-slate-300 bg-slate-100/80 opacity-85';
                                              const badgeTag =
                                                st.roleBadge === 'MOI_2026'
                                                  ? { text: 'THẾ HỆ MỚI 2026', cls: 'bg-rose-600 text-white' }
                                                  : st.roleBadge === 'HIEN_HANH'
                                                  ? { text: 'ĐANG HIỆU LỰC', cls: 'bg-emerald-600 text-white' }
                                                  : st.roleBadge === 'SUA_DOI_HOP_NHAT'
                                                  ? { text: 'SỬA ĐỔI / VBHN', cls: 'bg-indigo-600 text-white' }
                                                  : { text: 'GIAI ĐOẠN TRƯỚC', cls: 'bg-slate-500 text-white' };

                                              return (
                                                <div
                                                  key={sIdx}
                                                  onClick={() => {
                                                    if (st.docId) {
                                                      handleSelectDoc(st.docId, false);
                                                      setRightReaderMode('TOC_INDEX');
                                                      showToast(`Đã mở văn bản: ${st.docNumber}`);
                                                    }
                                                  }}
                                                  className={`p-2.5 rounded-lg border-l-4 border ${roleColor} ${
                                                    st.docId ? 'cursor-pointer hover:shadow-md transition' : ''
                                                  } flex flex-col justify-between gap-1`}
                                                >
                                                  <div className="space-y-1">
                                                    <div className="flex items-center justify-between gap-1">
                                                      <span
                                                        className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${badgeTag.cls}`}
                                                      >
                                                        {badgeTag.text}
                                                      </span>
                                                      <span className="text-[10px] font-mono text-slate-500">
                                                        {st.period}
                                                      </span>
                                                    </div>
                                                    <div className="font-mono font-bold text-xs text-slate-900">
                                                      {sIdx + 1}. {st.docNumber}
                                                    </div>
                                                    <p className="text-[11px] text-slate-600 leading-snug">
                                                      {st.note}
                                                    </p>
                                                  </div>
                                                  {st.docId && (
                                                    <div className="text-[10px] font-mono font-bold text-[#163d5c] pt-1 flex items-center justify-end">
                                                      Đọc văn bản ›
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* BỘ LỌC TẦNG PHẢ HỆ (L1 -> L5) */}
                                  <div className="flex flex-wrap items-center justify-between gap-2 bg-[#f6f2e9] p-2.5 rounded-xl border border-slate-300">
                                    <span className="text-xs font-bold text-[#163d5c]">
                                      🌳 Cây Phả hệ 5 Tầng của {activePillar.shortName}:
                                    </span>
                                    <div className="flex flex-wrap gap-1">
                                      <button
                                        type="button"
                                        onClick={() => setRoadmapTierFilter('ALL')}
                                        className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition ${
                                          roadmapTierFilter === 'ALL'
                                            ? 'bg-[#163d5c] text-white'
                                            : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                                        }`}
                                      >
                                        Tất cả ({totalDocsInPillar})
                                      </button>
                                      {activePillar.tiers.map(t => (
                                        <button
                                          key={t.tierCode}
                                          type="button"
                                          onClick={() =>
                                            setRoadmapTierFilter(
                                              roadmapTierFilter === t.tierCode ? 'ALL' : t.tierCode
                                            )
                                          }
                                          className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition ${
                                            roadmapTierFilter === t.tierCode
                                              ? 'bg-amber-500 text-slate-950'
                                              : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                                          }`}
                                        >
                                          {t.tierLevel} ({t.items.length})
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* DANH SÁCH CÁC TẦNG PHẢ HỆ (L1: LUẬT -> L2: VBHN/SỬA ĐỔI -> L3: NGHỊ ĐỊNH -> L4: THÔNG TƯ -> L5: QCVN/KIỂM TOÁN) */}
                                  <div className="space-y-4">
                                    {visibleTiers.map((tier, tIdx) => (
                                      <div
                                        key={tier.tierCode}
                                        className="rounded-xl border border-slate-300 bg-white overflow-hidden shadow-xs"
                                      >
                                        <div className="px-4 py-2.5 bg-gradient-to-r from-[#163554] to-[#244b73] text-white flex flex-wrap items-center justify-between gap-2">
                                          <div className="flex items-center gap-2">
                                            <span
                                              className={`px-2 py-0.5 rounded font-mono text-xs font-extrabold ${tier.badgeColor}`}
                                            >
                                              {tier.tierLevel}
                                            </span>
                                            <div>
                                              <div className="text-xs font-bold">{tier.tierName}</div>
                                              <div className="text-[11px] text-sky-200">{tier.tierSubtitle}</div>
                                            </div>
                                          </div>
                                          <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-xs font-mono font-bold">
                                            {tier.items.length} văn bản
                                          </span>
                                        </div>

                                        <div className="p-3 grid grid-cols-1 xl:grid-cols-2 gap-3 bg-[#faf8f3]">
                                          {tier.items.map(item => {
                                            const isCurrentDocNode =
                                              item.docId && item.docId === currentLegalDoc?.id;
                                            const statusBadge =
                                              item.status === 'SAP_CO_HIEU_LUC'
                                                ? {
                                                    text: 'Hiệu lực 01/07/2026',
                                                    cls: 'bg-amber-100 text-amber-900 border-amber-400',
                                                  }
                                                : item.status === 'CHUYEN_TIEP'
                                                ? {
                                                    text: 'Giai đoạn chuyển tiếp',
                                                    cls: 'bg-indigo-100 text-indigo-900 border-indigo-300',
                                                  }
                                                : {
                                                    text: 'Đang có hiệu lực',
                                                    cls: 'bg-emerald-100 text-emerald-900 border-emerald-400',
                                                  };

                                            return (
                                              <div
                                                key={item.id}
                                                className={`p-3.5 rounded-xl border transition flex flex-col justify-between gap-2.5 ${
                                                  isCurrentDocNode
                                                    ? 'bg-amber-50/90 border-2 border-[#a61b1b] shadow-md'
                                                    : 'bg-white border-slate-300 hover:border-[#163d5c]'
                                                }`}
                                              >
                                                <div className="space-y-1.5">
                                                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                      <span
                                                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${tier.badgeColor}`}
                                                      >
                                                        {item.docTypeBadge}
                                                      </span>
                                                      <span className="font-mono font-extrabold text-xs text-[#163d5c]">
                                                        {item.docNumber}
                                                      </span>
                                                      {isCurrentDocNode && (
                                                        <span className="px-1.5 py-0.5 rounded bg-[#a61b1b] text-white text-[9px] font-mono font-bold">
                                                          ĐANG CHỌN
                                                        </span>
                                                      )}
                                                    </div>
                                                    <span
                                                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusBadge.cls}`}
                                                    >
                                                      {statusBadge.text}
                                                    </span>
                                                  </div>

                                                  <div className="text-xs font-bold text-slate-900 leading-snug">
                                                    {item.title}
                                                  </div>

                                                  <div className="text-[11px] text-slate-600 font-mono">
                                                    📌 Vai trò: <b className="text-slate-800">{item.relationLabel}</b> ·{' '}
                                                    {item.effectiveNote}
                                                  </div>

                                                  {item.replacesOrAmends && (
                                                    <div className="px-2.5 py-1 rounded bg-indigo-50 border border-indigo-200 text-[11px] text-indigo-950">
                                                      🔄 <b>Quan hệ kế thừa / hợp nhất:</b> {item.replacesOrAmends}
                                                    </div>
                                                  )}

                                                  <p className="text-xs text-slate-700 bg-slate-50 p-2 rounded border border-slate-200 leading-relaxed">
                                                    <b>Phạm vi & Điều khoản trọng tâm:</b> {item.keyArticlesOrScope}
                                                  </p>
                                                </div>

                                                <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                                                  <div className="flex flex-wrap items-center gap-1">
                                                    <span className="text-[10px] font-mono text-slate-500">
                                                      Mảng:
                                                    </span>
                                                    {item.linkedDomains.map(dCode => (
                                                      <span
                                                        key={dCode}
                                                        className="px-1.5 py-0.2 rounded bg-sky-100 text-sky-900 font-mono text-[10px] font-bold"
                                                      >
                                                        {dCode}
                                                      </span>
                                                    ))}
                                                    <span className="text-[10px] font-mono text-slate-400 ml-1">
                                                      Gate:
                                                    </span>
                                                    {item.linkedGates.slice(0, 5).map(gCode => (
                                                      <button
                                                        key={gCode}
                                                        type="button"
                                                        onClick={() => {
                                                          setSelectedGateCode(gCode);
                                                          setActiveTab('STEP3_PLAN');
                                                        }}
                                                        className="px-1.5 py-0.2 rounded bg-amber-100 hover:bg-amber-300 text-amber-950 font-mono text-[10px] font-bold transition"
                                                        title={`Mở Gate ${gCode} tại Bước 3`}
                                                      >
                                                        {gCode}
                                                      </button>
                                                    ))}
                                                  </div>

                                                  {item.docId && (
                                                    <div className="flex items-center gap-1">
                                                      <button
                                                        type="button"
                                                        onClick={() => {
                                                          handleSelectDoc(item.docId!, false);
                                                          setRightReaderMode('TOC_INDEX');
                                                        }}
                                                        className="px-2.5 py-1 rounded bg-[#a61b1b] hover:bg-[#8b1616] text-white text-[11px] font-bold transition"
                                                      >
                                                        📕 Xem Mục lục
                                                      </button>
                                                      <button
                                                        type="button"
                                                        onClick={() => {
                                                          handleSelectDoc(item.docId!, false);
                                                          setRightReaderMode('FULL_CONTENT');
                                                        }}
                                                        className="px-2.5 py-1 rounded bg-[#163d5c] hover:bg-[#1e4b7a] text-white text-[11px] font-bold transition"
                                                      >
                                                        📄 Đọc Toàn văn
                                                      </button>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>

                                        {tIdx < visibleTiers.length - 1 && (
                                          <div className="py-1.5 bg-slate-100 border-t border-slate-200 text-center text-[11px] font-mono text-slate-500">
                                            ⬇️ Quy định chi tiết & Hướng dẫn thi hành xuống tầng tiếp theo ⬇️
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : vbplSubMode === 'LAW_ROADMAP' ? (
                /* CHẾ ĐỘ 2C: BẢN ĐỒ ROAD_MAP PHẢ HỆ CHO TỪNG BỘ LUẬT TOÀN MÀN HÌNH */
                (() => {
                  const activePillar: LawRoadmapPillar =
                    LAW_ROADMAPS.find(p => p.id === selectedRoadmapPillarId) || LAW_ROADMAPS[0];
                  const visibleTiers =
                    roadmapTierFilter === 'ALL'
                      ? activePillar.tiers
                      : activePillar.tiers.filter(t => t.tierCode === roadmapTierFilter);
                  const totalDocsInPillar = activePillar.tiers.reduce(
                    (sum, t) => sum + t.items.length,
                    0
                  );

                  return (
                    <div className="flex-1 p-5 overflow-y-auto space-y-5 bg-[#09111f] text-slate-100">
                      {/* Header Toàn màn hình Road_map Bộ luật */}
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-[#10223d] to-slate-900 border border-amber-500/40 space-y-3 shadow-lg">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded bg-amber-500 text-slate-950 font-mono text-xs font-extrabold">
                                🗺️ ROAD_MAP PHẢ HỆ BỘ LUẬT (L1 → L5)
                              </span>
                              <span className="text-xs font-mono text-emerald-400">
                                Hệ thống Cây Phả hệ: Luật gốc ➔ Luật sửa đổi, bổ sung ➔ Văn bản hợp nhất (VBHN) ➔ Nghị định ➔ Thông tư ➔ QCVN/TCVN
                              </span>
                            </div>
                            <h2 className="text-base font-extrabold text-white">
                              {activePillar.fullName}
                            </h2>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setVbplSubMode('READER_3PANE');
                              setRightReaderMode('TOC_INDEX');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-amber-300 transition"
                          >
                            ← Quay lại Tra cứu 3 Cột
                          </button>
                        </div>

                        {/* Bộ chọn 5 Bộ luật */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                          {LAW_ROADMAPS.map(pillar => {
                            const isSelected = pillar.id === activePillar.id;
                            const countDocs = pillar.tiers.reduce(
                              (acc, t) => acc + t.items.length,
                              0
                            );
                            return (
                              <button
                                key={pillar.id}
                                type="button"
                                onClick={() => {
                                  setSelectedRoadmapPillarId(pillar.id);
                                  setRoadmapTierFilter('ALL');
                                }}
                                className={`text-left p-3 rounded-xl border transition-all flex flex-col justify-between gap-1.5 ${
                                  isSelected
                                    ? 'bg-gradient-to-br from-amber-500 to-amber-400 text-slate-950 border-white font-bold shadow-lg scale-[1.01]'
                                    : 'bg-slate-950/80 text-slate-200 border-slate-800 hover:border-amber-500/50 hover:bg-slate-900'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-lg">{pillar.icon}</span>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                                      isSelected
                                        ? 'bg-slate-950 text-amber-300'
                                        : 'bg-slate-900 text-sky-300 border border-slate-700'
                                    }`}
                                  >
                                    {countDocs} văn bản
                                  </span>
                                </div>
                                <div className="text-xs font-extrabold leading-snug">
                                  {pillar.shortName}
                                </div>
                                <div
                                  className={`text-[10px] font-mono truncate ${
                                    isSelected ? 'text-slate-900 font-semibold' : 'text-slate-400'
                                  }`}
                                >
                                  {pillar.rootLawNumber}
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {/* Tóm tắt lịch sử sửa đổi bổ sung */}
                        <div className="p-3 rounded-xl bg-slate-950/90 border border-amber-500/30 text-xs text-slate-200 space-y-1">
                          <div>{activePillar.summary}</div>
                          <div className="text-amber-300 font-mono text-[11px] pt-1 border-t border-slate-800">
                            <b>📜 Lịch sử sửa đổi, bổ sung & hợp nhất:</b> {activePillar.amendmentHistorySummary}
                          </div>
                        </div>
                      </div>

                      {/* SƠ ĐỒ CÂY PHẢ HỆ TRỰC QUAN (INTERACTIVE D3 GENEALOGY TREE) */}
                      <LawGenealogyTreeDiagram
                        pillar={activePillar}
                        activeDocId={selectedDocId}
                        activeProjectArchetype={activeProjectArchetype}
                        darkTheme={true}
                        filterMode={legalCutoffMode}
                        onChangeFilterMode={setLegalCutoffMode}
                        projectMilestones={activeProjectMilestones}
                        onSelectDoc={(docId, mode) => {
                          handleSelectDoc(docId, false);
                          setVbplSubMode('READER_3PANE');
                          setRightReaderMode(mode);
                        }}
                        onSelectGate={gateCode => {
                          setSelectedGateCode(gateCode as any);
                          setActiveTab('STEP3_PLAN');
                        }}
                      />

                      {/* Sơ đồ Tiến hóa & Thay thế Văn bản */}
                      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                            ⏳ Lộ trình Tiến hóa & Thay thế Văn bản theo Mảng Chuyên môn ({activePillar.shortName})
                          </h3>
                          <span className="text-[11px] font-mono text-slate-400">
                            Click vào thẻ văn bản để mở nội dung chi tiết
                          </span>
                        </div>

                        <div className="space-y-3">
                          {activePillar.evolutionChains.map(chain => (
                            <div
                              key={chain.id}
                              className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-sky-300">
                                  {chain.domainTitle}
                                </span>
                                <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 font-mono text-[10px] font-bold">
                                  Mã chức năng: {chain.domainCode}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-3">
                                {chain.steps.map((st, sIdx) => {
                                  const borderCls =
                                    st.roleBadge === 'MOI_2026'
                                      ? 'border-rose-500/70 bg-rose-950/25'
                                      : st.roleBadge === 'HIEN_HANH'
                                      ? 'border-emerald-500/70 bg-emerald-950/25'
                                      : st.roleBadge === 'SUA_DOI_HOP_NHAT'
                                      ? 'border-indigo-500/70 bg-indigo-950/25'
                                      : 'border-slate-700 bg-slate-900/60 opacity-80';
                                  const badgeText =
                                    st.roleBadge === 'MOI_2026'
                                      ? 'THẾ HỆ MỚI 2026'
                                      : st.roleBadge === 'HIEN_HANH'
                                      ? 'ĐANG HIỆU LỰC'
                                      : st.roleBadge === 'SUA_DOI_HOP_NHAT'
                                      ? 'SỬA ĐỔI / HỢP NHẤT'
                                      : 'GIAI ĐOẠN TRƯỚC';

                                  return (
                                    <div
                                      key={sIdx}
                                      onClick={() => {
                                        if (st.docId) {
                                          handleSelectDoc(st.docId, false);
                                          setVbplSubMode('READER_3PANE');
                                          setRightReaderMode('TOC_INDEX');
                                        }
                                      }}
                                      className={`p-3 rounded-xl border ${borderCls} ${
                                        st.docId ? 'cursor-pointer hover:border-amber-400 transition' : ''
                                      } space-y-1.5`}
                                    >
                                      <div className="flex items-center justify-between text-[10px] font-mono">
                                        <span className="font-bold text-amber-300">
                                          Bước {sIdx + 1} · {badgeText}
                                        </span>
                                        <span className="text-slate-400">{st.period}</span>
                                      </div>
                                      <div className="text-xs font-mono font-bold text-white">
                                        {st.docNumber}
                                      </div>
                                      <p className="text-[11px] text-slate-300 leading-relaxed">
                                        {st.note}
                                      </p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Cây Phả hệ 5 Tầng */}
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="text-sm font-extrabold text-white">
                            🌳 Cây Phả hệ 5 Tầng của {activePillar.shortName} ({totalDocsInPillar} văn bản)
                          </h3>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => setRoadmapTierFilter('ALL')}
                              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition ${
                                roadmapTierFilter === 'ALL'
                                  ? 'bg-amber-500 text-slate-950'
                                  : 'bg-slate-900 text-slate-300 border border-slate-700'
                              }`}
                            >
                              Tất cả 5 tầng ({totalDocsInPillar})
                            </button>
                            {activePillar.tiers.map(t => (
                              <button
                                key={t.tierCode}
                                type="button"
                                onClick={() =>
                                  setRoadmapTierFilter(
                                    roadmapTierFilter === t.tierCode ? 'ALL' : t.tierCode
                                  )
                                }
                                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition ${
                                  roadmapTierFilter === t.tierCode
                                    ? 'bg-amber-500 text-slate-950'
                                    : 'bg-slate-900 text-slate-300 border border-slate-700'
                                }`}
                              >
                                {t.tierLevel}: {t.tierName.split('&')[0].trim()} ({t.items.length})
                              </button>
                            ))}
                          </div>
                        </div>

                        {visibleTiers.map(tier => (
                          <div
                            key={tier.tierCode}
                            className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden"
                          >
                            <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <span
                                  className={`px-2.5 py-1 rounded-lg font-mono text-xs font-extrabold ${tier.badgeColor}`}
                                >
                                  {tier.tierLevel}
                                </span>
                                <div>
                                  <div className="text-sm font-bold text-white">{tier.tierName}</div>
                                  <div className="text-xs text-slate-400">{tier.tierSubtitle}</div>
                                </div>
                              </div>
                              <span className="px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-xs font-mono text-amber-300">
                                {tier.items.length} văn bản
                              </span>
                            </div>

                            <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                              {tier.items.map(item => (
                                <div
                                  key={item.id}
                                  className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 hover:border-amber-500/50 transition flex flex-col justify-between gap-3"
                                >
                                  <div className="space-y-2">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <span
                                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${tier.badgeColor}`}
                                        >
                                          {item.docTypeBadge}
                                        </span>
                                        <span className="font-mono font-extrabold text-sm text-amber-300">
                                          {item.docNumber}
                                        </span>
                                      </div>
                                      <span className="text-[11px] font-mono text-emerald-400">
                                        {item.effectiveNote}
                                      </span>
                                    </div>

                                    <div className="text-xs font-bold text-white leading-snug">
                                      {item.title}
                                    </div>

                                    {item.replacesOrAmends && (
                                      <div className="px-2.5 py-1.5 rounded-lg bg-indigo-950/60 border border-indigo-500/40 text-xs text-indigo-200">
                                        🔄 <b className="text-indigo-300">Quan hệ sửa đổi / hợp nhất:</b>{' '}
                                        {item.replacesOrAmends}
                                      </div>
                                    )}

                                    <p className="text-xs text-slate-300 bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 leading-relaxed">
                                      <b className="text-sky-300">Nội dung trọng tâm:</b>{' '}
                                      {item.keyArticlesOrScope}
                                    </p>
                                  </div>

                                  <div className="pt-2 border-t border-slate-800/90 flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex flex-wrap items-center gap-1">
                                      {item.linkedGates.map(gCode => (
                                        <button
                                          key={gCode}
                                          type="button"
                                          onClick={() => {
                                            setSelectedGateCode(gCode);
                                            setActiveTab('STEP3_PLAN');
                                          }}
                                          className="px-2 py-0.5 rounded bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-emerald-300 border border-slate-700 font-mono text-[10px] font-bold transition"
                                        >
                                          {gCode}
                                        </button>
                                      ))}
                                    </div>

                                    {item.docId && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleSelectDoc(item.docId!, false);
                                          setVbplSubMode('READER_3PANE');
                                          setRightReaderMode('TOC_INDEX');
                                        }}
                                        className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
                                      >
                                        📖 Mở Mục lục & Toàn văn →
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()
              ) : (
                /* CHẾ ĐỘ 2B: BẢNG ĐỐI SOÁT CHÉO ĐA VĂN BẢN (CROSS-REFERENCE MATRIX) */
                <div className="flex-1 p-5 overflow-y-auto space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {CROSS_EXAM_TOPICS.map(topic => (
                      <button
                        key={topic.id}
                        onClick={() => setSelectedCrossExamId(topic.id)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition ${
                          selectedCrossExamId === topic.id
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                            : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {topic.title}
                      </button>
                    ))}
                  </div>

                  {CROSS_EXAM_TOPICS.filter(t => t.id === selectedCrossExamId).map(topic => (
                    <div key={topic.id} className="space-y-4">
                      <div className="bg-slate-900 border border-emerald-500/40 rounded-xl p-4 space-y-2">
                        <h3 className="text-sm font-bold text-emerald-400">{topic.title}</h3>
                        <p className="text-xs text-slate-300">{topic.summary}</p>
                        <div className="text-[11px] font-mono text-slate-400">
                          Mã chức năng liên quan: {topic.functionalCodes.join(' · ')}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        {topic.columns.map((col, idx) => (
                          <div
                            key={idx}
                            className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3"
                          >
                            <div className="space-y-2">
                              <div className="text-xs font-mono font-bold text-amber-400 border-b border-slate-800 pb-1.5">
                                {col.docRef}
                              </div>
                              <div className="text-[11px] font-mono text-sky-400">Căn cứ: {col.clause}</div>
                              <p className="text-xs text-slate-200 leading-relaxed">{col.requirement}</p>
                            </div>
                            <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-200">
                              <b className="text-emerald-400 block mb-0.5">Chốt chặn thực thi:</b>
                              {col.controlAction}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
    </>
  );
};
