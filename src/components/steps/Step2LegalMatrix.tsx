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
import { SecurePdfViewerModal } from "../SecurePdfViewerModal";
import { SlideOverRefDrawer, SlideOverRefTarget } from "../SlideOverRefDrawer";
import { getVbplBadgeClass, getVbplBadgeLabel } from "../modals/VbplLibraryModals";

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

  const [isSecurePdfOpen, setIsSecurePdfOpen] = React.useState(false);
  const [securePdfTarget, setSecurePdfTarget] = React.useState<{ fileName: string; docTitle?: string; docNumber?: string }>({ fileName: '' });
  const [slideRefTarget, setSlideRefTarget] = React.useState<SlideOverRefTarget | null>(null);
  const [isPmoFilterOpen, setIsPmoFilterOpen] = React.useState(false);
  const [mobilePane, setMobilePane] = React.useState<'c1' | 'c2' | 'c3'>('c3');

  // Tô sáng từ khóa tìm kiếm trong đoạn văn bản
  const renderHighlightedSpan = (rawText: string, query: string) => {
    const q = query.trim();
    if (!q || q.length < 2) return rawText;
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = rawText.split(regex);
    if (parts.length <= 1) return rawText;
    return parts.map((p, i) =>
      p.toLowerCase() === q.toLowerCase() ? (
        <mark key={i} className="vbpl-hit">
          {p}
        </mark>
      ) : (
        <React.Fragment key={i}>{p}</React.Fragment>
      )
    );
  };

  // Định dạng nội dung điều khoản chuẩn sách luật: Số khoản/điểm màu Đỏ son (--son)
  const renderFormattedArticleBody = (content: string) => {
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    return (
      <div className="space-y-2 vbpl-article-prose">
        {lines.map((line, lIdx) => {
          const clauseMatch = line.match(/^(\d+\.\s+)(.*)$/);
          if (clauseMatch) {
            return (
              <p key={lIdx} className="leading-[1.78]" style={{ color: 'var(--chu)' }}>
                <b className="font-bold mr-1" style={{ color: 'var(--son)' }}>
                  {clauseMatch[1]}
                </b>
                {renderHighlightedSpan(clauseMatch[2], globalSearch)}
              </p>
            );
          }
          const pointMatch = line.match(/^([a-zđ]\)\s+|-\s+)(.*)$/i);
          if (pointMatch) {
            return (
              <p key={lIdx} className="pl-5 leading-[1.78]" style={{ color: 'var(--chu)' }}>
                <b className="font-bold mr-1" style={{ color: 'var(--son)' }}>
                  {pointMatch[1]}
                </b>
                {renderHighlightedSpan(pointMatch[2], globalSearch)}
              </p>
            );
          }
          return (
            <p key={lIdx} className="leading-[1.78]" style={{ color: 'var(--chu)' }}>
              {renderHighlightedSpan(line, globalSearch)}
            </p>
          );
        })}
      </div>
    );
  };

  // Danh sách văn bản liên quan / phả hệ cho văn bản đang mở
  const relatedLineageDocs = React.useMemo(() => {
    if (!currentLegalDoc) return [];
    return legalDocs
      .filter(
        d =>
          d.id !== currentLegalDoc.id &&
          (d.primaryDomain === currentLegalDoc.primaryDomain ||
            d.subSectorCode === currentLegalDoc.subSectorCode)
      )
      .slice(0, 4);
  }, [currentLegalDoc, legalDocs]);

  const spacedDocTypeHeader = (docType: string) => {
    const label = getVbplBadgeLabel(docType);
    return label.split('').join(' ');
  };

  return (
    <>
      {activeTab === 'STEP2_VBPL' && (
        <div className="h-full flex flex-col overflow-hidden">
          {/* CHẾ ĐỘ 2A: GIAO DIỆN 3 CỘT CHUẨN MẪU thuvien-vbpl-26.web.app */}
          {vbplSubMode === 'READER_3PANE' ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* ==========================================================
                    CỘT 1 (.vbpl-c1): CÂY LĨNH VỰC NỀN XANH NAVY ĐẬM (#12293f)
                   ========================================================== */}
                {isVbplCol1Collapsed ? (
                  <div className="hidden lg:flex w-8 vbpl-c1 border-r border-white/10 flex-col items-center py-3 justify-between shrink-0 select-none">
                    <button
                      type="button"
                      onClick={() => setIsVbplCol1Collapsed(false)}
                      title="Mở rộng Cột 1: Lĩnh vực"
                      className="h-7 w-6 rounded bg-[#c8a33c] hover:bg-[#e8c66a] text-[#2c2003] font-bold text-xs flex items-center justify-center cursor-pointer"
                    >
                      ▶
                    </button>
                    <div className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-mono font-bold tracking-widest text-[#e8c66a] uppercase">
                      LĨNH VỰC ({LEGAL_CATEGORY_TREE.length})
                    </div>
                    <span className="text-xs">📚</span>
                  </div>
                ) : (
                  <div
                    style={{ width: undefined }}
                    className={`${
                      mobilePane === 'c1' ? 'flex' : 'hidden'
                    } lg:flex w-full lg:shrink-0 min-w-[190px] vbpl-c1 flex-col justify-between overflow-hidden select-none lg:[width:var(--c1-w)]`}
                    ref={el => {
                      if (el) el.style.setProperty('--c1-w', `${vbplCol1Pct}%`);
                    }}
                  >
                    {/* Header Cột 1 + Ô lọc lĩnh vực */}
                    <div className="p-2.5 border-b border-white/10 space-y-2 shrink-0">
                      <div className="flex items-center justify-between gap-1 px-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm">📚</span>
                          <span className="text-[11.5px] font-extrabold uppercase tracking-wider text-[#e8c66a] truncate">
                            LĨNH VỰC
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <div className="flex items-center bg-black/25 rounded p-0.5 border border-white/10 text-[10px]">
                            <button
                              type="button"
                              onClick={() => {
                                setCol1ViewMode('BY_15_INDUSTRIES');
                                setFilterTreeByActiveProject(false);
                                setVbplProjectFilter('ALL');
                              }}
                              className={`px-1.5 py-0.5 rounded font-semibold transition cursor-pointer ${
                                col1ViewMode !== 'BY_PROJECT'
                                  ? 'bg-[#c8a33c] text-[#2c2003] font-bold'
                                  : 'text-slate-300 hover:text-white'
                              }`}
                              title="Cây phân cấp theo Ngành & Lĩnh vực chuẩn"
                            >
                              Ngành
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCol1ViewMode('BY_PROJECT');
                                setFilterTreeByActiveProject(true);
                                setVbplIndustryGroupFilter('ALL');
                                setVbplSubSectorFilter('ALL');
                                setVbplProjectFilter(activeProjectArchetype);
                                setExpandedStandaloneProjects(prev => ({
                                  ...prev,
                                  [activeProjectArchetype]: true,
                                }));
                              }}
                              className={`px-1.5 py-0.5 rounded font-semibold transition cursor-pointer ${
                                col1ViewMode === 'BY_PROJECT'
                                  ? 'bg-[#c8a33c] text-[#2c2003] font-bold'
                                  : 'text-slate-300 hover:text-white'
                              }`}
                              title="Lọc theo 6 Loại hình Dự án & Cổng Stage-Gate (G0–G15)"
                            >
                              Dự án
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsVbplCol1Collapsed(true)}
                            title="Thu gọn Cột 1"
                            className="hidden lg:flex h-5 w-5 rounded bg-white/10 hover:bg-white/20 text-slate-200 text-[10px] items-center justify-center cursor-pointer"
                          >
                            ◀
                          </button>
                        </div>
                      </div>

                      <div className="relative">
                        <input
                          type="text"
                          value={categorySearch}
                          onChange={e => setCategorySearch(e.target.value)}
                          placeholder="Lọc lĩnh vực…"
                          className="w-full bg-white/8 border border-white/15 rounded-md pl-2.5 pr-6 py-1.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#c8a33c]"
                        />
                        {categorySearch && (
                          <button
                            type="button"
                            onClick={() => setCategorySearch('')}
                            className="absolute right-2 top-1.5 text-[10px] text-slate-300 hover:text-white cursor-pointer"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Cây phân cấp 2 tầng có vạch nối nhánh chuẩn thuvien-vbpl-26 */}
                    <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
                      {col1ViewMode !== 'BY_PROJECT' ? (
                        <>
                          {LEGAL_CATEGORY_TREE.map(group => {
                            const q = categorySearch.trim().toLowerCase();
                            const groupDocs = legalDocs.filter(d => d.industryGroupId === group.id);
                            if (groupDocs.length === 0) return null;

                            const matchingChildren = group.children.filter(child => {
                              if (!q) return true;
                              return (
                                group.name.toLowerCase().includes(q) ||
                                child.name.toLowerCase().includes(q) ||
                                child.code.toLowerCase().includes(q)
                              );
                            });
                            if (q && matchingChildren.length === 0 && !group.name.toLowerCase().includes(q)) {
                              return null;
                            }

                            const isExpanded =
                              q.length > 0 ||
                              expandedCatGroups[group.id] !== false &&
                                (expandedCatGroups[group.id] || vbplIndustryGroupFilter === group.id || group.priorityOrder <= 3);
                            const isGroupSelected =
                              vbplIndustryGroupFilter === group.id &&
                              vbplSubSectorFilter === 'ALL' &&
                              vbplDomainFilter === 'ALL';

                            return (
                              <div key={group.id} className="space-y-0.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setExpandedCatGroups(prev => ({
                                      ...prev,
                                      [group.id]: !isExpanded,
                                    }));
                                    setVbplIndustryGroupFilter(group.id);
                                    setVbplSubSectorFilter('ALL');
                                    setVbplDomainFilter('ALL');
                                    setVbplProjectFilter('ALL');
                                    setPane2SubTab('DOCS');
                                    setMobilePane('c2');
                                  }}
                                  className={`w-full text-left px-2 py-1.5 rounded-md flex items-center justify-between gap-1.5 text-[12.5px] font-bold transition cursor-pointer ${
                                    isGroupSelected
                                      ? 'bg-white/14 text-[#e8c66a]'
                                      : 'text-slate-100 hover:bg-white/8'
                                  }`}
                                >
                                  <span className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-[10px] text-slate-400 w-2.5 shrink-0">
                                      {isExpanded ? '▾' : '▸'}
                                    </span>
                                    <span className="text-xs shrink-0">📁</span>
                                    <span className="truncate">{group.name}</span>
                                  </span>
                                  <span
                                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono tabular-nums shrink-0 ${
                                      vbplIndustryGroupFilter === group.id
                                        ? 'bg-[#c8a33c] text-[#3a2c05] font-extrabold'
                                        : 'bg-white/12 text-slate-200'
                                    }`}
                                  >
                                    {groupDocs.length}
                                  </span>
                                </button>

                                {isExpanded && (
                                  <div className="vbpl-tree-children space-y-0.5 py-0.5">
                                    {matchingChildren.map(child => {
                                      const subCount = groupDocs.filter(
                                        d => d.subSectorCode === child.code
                                      ).length;
                                      const isSubActive =
                                        vbplIndustryGroupFilter === group.id &&
                                        vbplSubSectorFilter === child.code;
                                      return (
                                        <button
                                          key={child.code}
                                          type="button"
                                          onClick={() => {
                                            setVbplIndustryGroupFilter(group.id);
                                            setVbplSubSectorFilter(child.code);
                                            setVbplDomainFilter('ALL');
                                            setVbplProjectFilter('ALL');
                                            setPane2SubTab('DOCS');
                                            setMobilePane('c2');
                                          }}
                                          className={`vbpl-tree-item ${isSubActive ? 'active' : ''}`}
                                        >
                                          <span className="flex items-center gap-1.5 min-w-0">
                                            <span className="text-[11px] opacity-80 shrink-0">📄</span>
                                            <span className="truncate">{child.name}</span>
                                          </span>
                                          <span
                                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono tabular-nums shrink-0 ${
                                              isSubActive
                                                ? 'bg-[#3a2c05]/18 text-[#3a2c05] font-extrabold'
                                                : 'bg-white/10 text-slate-300'
                                            }`}
                                          >
                                            {subCount}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Nhóm Lĩnh vực Chức năng chuyên sâu (QLCP, QLCL, QLHD, DTH, TQT...) */}
                          <div className="pt-2 mt-2 border-t border-white/10 space-y-0.5">
                            <div className="px-2 py-1 text-[10.5px] font-bold uppercase tracking-wider text-[#e8c66a] flex items-center justify-between">
                              <span>🏷️ Chức năng chuyên môn</span>
                              {vbplDomainFilter !== 'ALL' && (
                                <button
                                  type="button"
                                  onClick={() => setVbplDomainFilter('ALL')}
                                  className="text-[10px] underline text-slate-300 cursor-pointer"
                                >
                                  Bỏ lọc
                                </button>
                              )}
                            </div>
                            <div className="vbpl-tree-children space-y-0.5">
                              {TAXONOMY_3D.functionalDomains
                                .filter(fd => {
                                  const q = categorySearch.trim().toLowerCase();
                                  if (!q) return true;
                                  return (
                                    fd.code.toLowerCase().includes(q) ||
                                    fd.name.toLowerCase().includes(q)
                                  );
                                })
                                .map(fd => {
                                  const domCount = legalDocs.filter(
                                    d =>
                                      d.primaryDomain === fd.code ||
                                      d.secondaryDomains.includes(fd.code)
                                  ).length;
                                  const isDomActive = vbplDomainFilter === fd.code;
                                  return (
                                    <button
                                      key={fd.code}
                                      type="button"
                                      onClick={() => {
                                        setVbplIndustryGroupFilter('ALL');
                                        setVbplSubSectorFilter('ALL');
                                        setVbplDomainFilter(isDomActive ? 'ALL' : fd.code);
                                        setPane2SubTab('DOCS');
                                        setMobilePane('c2');
                                      }}
                                      className={`vbpl-tree-item ${isDomActive ? 'active' : ''}`}
                                      title={fd.name}
                                    >
                                      <span className="truncate">
                                        <b>{fd.code}</b> · {fd.name}
                                      </span>
                                      <span
                                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono tabular-nums shrink-0 ${
                                          isDomActive
                                            ? 'bg-[#3a2c05]/18 text-[#3a2c05] font-extrabold'
                                            : 'bg-white/10 text-slate-300'
                                        }`}
                                      >
                                        {domCount}
                                      </span>
                                    </button>
                                  );
                                })}
                            </div>
                          </div>
                        </>
                      ) : (
                        /* Chế độ Cây Dự án -> Stage-Gate G0-G15 gọn chuẩn */
                        <div className="space-y-1">
                          {TAXONOMY_3D.projectTypes.map(pt => {
                            const projDocs = legalDocs.filter(d => d.projectAxes.includes(pt.code));
                            const isProjOpen = Boolean(expandedStandaloneProjects[pt.code]);
                            const isProjSelected =
                              vbplProjectFilter === pt.code && vbplGateFilter === 'ALL';
                            return (
                              <div key={pt.code} className="space-y-0.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setExpandedStandaloneProjects(prev => ({
                                      ...prev,
                                      [pt.code]: !isProjOpen,
                                    }));
                                    setActiveProjectArchetype(pt.code);
                                    setVbplProjectFilter(pt.code);
                                    setVbplGateFilter('ALL');
                                    setPane2SubTab('DOCS');
                                    setMobilePane('c2');
                                  }}
                                  className={`w-full text-left px-2 py-1.5 rounded-md flex items-center justify-between gap-1.5 text-[12.5px] font-bold transition cursor-pointer ${
                                    isProjSelected
                                      ? 'bg-[#c8a33c] text-[#3a2c05]'
                                      : 'text-slate-100 hover:bg-white/8'
                                  }`}
                                >
                                  <span className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-[10px] w-2.5 shrink-0">
                                      {isProjOpen ? '▾' : '▸'}
                                    </span>
                                    <span>{PROJECT_ARCHETYPE_ICONS[pt.code]}</span>
                                    <span className="truncate">[{pt.code}] {pt.name}</span>
                                  </span>
                                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-black/20 shrink-0">
                                    {projDocs.length}
                                  </span>
                                </button>

                                {isProjOpen && (
                                  <div className="vbpl-tree-children space-y-0.5 py-0.5">
                                    {gates.map(gItem => {
                                      const gCount = projDocs.filter(d =>
                                        d.linkedGates.includes(gItem.gate)
                                      ).length;
                                      const isGateActive =
                                        vbplProjectFilter === pt.code &&
                                        vbplGateFilter === gItem.gate;
                                      return (
                                        <button
                                          key={gItem.gate}
                                          type="button"
                                          onClick={() => {
                                            setActiveProjectArchetype(pt.code);
                                            setVbplProjectFilter(pt.code);
                                            setVbplGateFilter(isGateActive ? 'ALL' : gItem.gate);
                                            setPane2SubTab('DOCS');
                                            setMobilePane('c2');
                                          }}
                                          className={`vbpl-tree-item ${isGateActive ? 'active' : ''}`}
                                        >
                                          <span className="truncate text-xs">
                                            <b className="font-mono">{gItem.gate}</b> · {gItem.name}
                                          </span>
                                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/10 shrink-0">
                                            {gCount}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Nút đáy Cột 1 chuẩn mẫu: Viền vàng nét đứt "🌐 Tra cứu toàn thư viện" */}
                    <div className="p-2.5 border-t border-white/10 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setCol1ViewMode('BY_15_INDUSTRIES');
                          setVbplIndustryGroupFilter('ALL');
                          setVbplSubSectorFilter('ALL');
                          setVbplDomainFilter('ALL');
                          setVbplProjectFilter('ALL');
                          setVbplGateFilter('ALL');
                          setFilterDocType('ALL');
                          setFilterValidityPeriod('ALL');
                          setTechStandardQuickFilter('ALL');
                          setFilterTreeByActiveProject(false);
                          setPane2SubTab('DOCS');
                          setMobilePane('c2');
                        }}
                        className="w-full py-2 px-3 rounded-md border border-dashed border-[#c8a33c] hover:bg-[#c8a33c] text-[#e8c66a] hover:text-[#2c2003] text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <span>🌐</span>
                        <span>Tra cứu toàn thư viện ({legalDocs.length})</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Thanh kéo co giãn giữa Cột 1 và Cột 2 */}
                {renderVerticalSplitter({
                  id: 'VBPL_SPLIT_1',
                  onDoubleClickReset: () => {
                    setIsVbplCol1Collapsed(false);
                    setVbplCol1Pct(19);
                  },
                  label: `Cột 1: ${Math.round(vbplCol1Pct)}%`,
                })}

                {/* ==========================================================
                    CỘT 2 (.vbpl-c2): DANH SÁCH VĂN BẢN NỀN GIẤY KEM (#ebe4d6)
                   ========================================================== */}
                {isVbplCol2Collapsed ? (
                  <div
                    className="hidden lg:flex w-8 vbpl-c2 border-r flex-col items-center py-3 justify-between shrink-0 select-none"
                    style={{ borderColor: 'var(--line)' }}
                  >
                    <button
                      type="button"
                      onClick={() => setIsVbplCol2Collapsed(false)}
                      title="Mở rộng Cột 2: Danh sách Văn bản"
                      className="h-7 w-6 rounded text-white font-bold text-xs flex items-center justify-center cursor-pointer"
                      style={{ backgroundColor: 'var(--navy)' }}
                    >
                      ▶
                    </button>
                    <div
                      className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-mono font-bold tracking-widest uppercase"
                      style={{ color: 'var(--navy-ink)' }}
                    >
                      DANH MỤC ({filteredLegalDocs.length})
                    </div>
                    <span className="text-xs">📂</span>
                  </div>
                ) : (
                  <div
                    className={`${
                      mobilePane === 'c2' ? 'flex' : 'hidden'
                    } lg:flex w-full lg:shrink-0 min-w-[250px] vbpl-c2 flex-col overflow-hidden border-r lg:[width:var(--c2-w)]`}
                    style={{ borderColor: 'var(--line)' }}
                    ref={el => {
                      if (el) el.style.setProperty('--c2-w', `${vbplCol2Pct}%`);
                    }}
                  >
                    {/* Hàng 1: 4 Sub-tabs (📂 Văn bản | 🔍 Kết quả | 🔖 Đánh dấu | 🕘 Gần đây) gạch chân Đỏ son */}
                    <div
                      className="flex items-center border-b text-xs font-semibold select-none shrink-0"
                      style={{ backgroundColor: 'var(--giay)', borderColor: 'var(--line)' }}
                    >
                      <div className="flex-1 flex items-center justify-around text-[11.5px] min-w-0">
                        {[
                          { id: 'DOCS' as const, icon: '📂', label: 'Văn bản', count: 0 },
                          {
                            id: 'RESULTS' as const,
                            icon: '🔍',
                            label: 'Kết quả',
                            count: globalSearch.trim() ? filteredLegalDocs.length : 0,
                          },
                          {
                            id: 'BOOKMARKS' as const,
                            icon: '🔖',
                            label: 'Đánh dấu',
                            count: bookmarkedDocIds.length,
                          },
                          { id: 'RECENT' as const, icon: '🕘', label: 'Gần đây', count: 0 },
                        ].map(t => {
                          const isAct = pane2SubTab === t.id;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setPane2SubTab(t.id)}
                              className="py-2 px-1 flex items-center justify-center gap-1 transition whitespace-nowrap cursor-pointer"
                              style={{
                                borderBottom: isAct ? '2.5px solid var(--son)' : '2.5px solid transparent',
                                color: isAct ? 'var(--son)' : 'var(--chu-m)',
                                fontWeight: isAct ? 700 : 600,
                                backgroundColor: isAct ? 'var(--panel)' : 'transparent',
                              }}
                            >
                              <span>{t.icon}</span>
                              <span>{t.label}</span>
                              {t.count > 0 && (
                                <span
                                  className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold text-white"
                                  style={{ backgroundColor: 'var(--son)' }}
                                >
                                  {t.count}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsVbplCol2Collapsed(true)}
                        title="Thu gọn Cột 2"
                        className="hidden lg:flex mx-1 h-6 w-6 rounded items-center justify-center text-[10px] cursor-pointer"
                        style={{ backgroundColor: 'var(--giay-d)', color: 'var(--chu)' }}
                      >
                        ◀
                      </button>
                    </div>

                    {/* Hàng 2: Thanh lọc tinh gọn 1 dòng chuẩn thuvien-vbpl-26 + Nút ⚙ Lọc PMO */}
                    <div
                      className="px-2.5 py-2 border-b space-y-2 text-xs shrink-0"
                      style={{ backgroundColor: 'var(--giay)', borderColor: 'var(--line)' }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <label className="flex items-center gap-1 text-[11.5px] cursor-pointer select-none whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={exactMatchAccent}
                            onChange={e => setExactMatchAccent(e.target.checked)}
                            className="rounded accent-[#1b3a5c]"
                          />
                          <span>Khớp dấu</span>
                        </label>

                        <div className="flex items-center gap-1">
                          <span className="text-[11px]" style={{ color: 'var(--chu-m)' }}>
                            Loại:
                          </span>
                          <select
                            value={filterDocType}
                            onChange={e => setFilterDocType(e.target.value)}
                            className="rounded border px-1.5 py-1 text-[11.5px] max-w-[105px] focus:outline-none"
                            style={{
                              backgroundColor: 'var(--panel)',
                              borderColor: 'var(--line-d)',
                              color: 'var(--chu)',
                            }}
                          >
                            <option value="ALL">Tất cả</option>
                            {TAXONOMY_3D.legalGroups.map(dt => (
                              <option key={dt.code} value={dt.code}>
                                {dt.name.split(' ')[0]} ({dt.code})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-1">
                          <span className="text-[11px]" style={{ color: 'var(--chu-m)' }}>
                            Hiệu lực:
                          </span>
                          <select
                            value={filterValidityPeriod}
                            disabled={legalCutoffMode === 'PROJECT_TRANSITION'}
                            onChange={e =>
                              setFilterValidityPeriod(
                                e.target.value as 'ALL' | 'EFFECTIVE' | 'UPCOMING'
                              )
                            }
                            className="rounded border px-1.5 py-1 text-[11.5px] max-w-[98px] focus:outline-none disabled:opacity-60"
                            style={{
                              backgroundColor: 'var(--panel)',
                              borderColor: 'var(--line-d)',
                              color: 'var(--chu)',
                            }}
                          >
                            <option value="ALL">Mọi kỳ</option>
                            <option value="EFFECTIVE">Còn hiệu lực</option>
                            <option value="UPCOMING">Từ 01/07/2026</option>
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsPmoFilterOpen(prev => !prev)}
                          title="Mở bộ lọc chuyên sâu PMO: Mốc chuyển tiếp DA, QCVN/TCVN, Thu gọn & NotebookLM"
                          className="px-2 py-1 rounded border text-[11px] font-bold cursor-pointer transition"
                          style={{
                            backgroundColor:
                              isPmoFilterOpen ||
                              legalCutoffMode === 'PROJECT_TRANSITION' ||
                              techStandardQuickFilter !== 'ALL'
                                ? 'var(--gold-xl)'
                                : 'var(--panel)',
                            borderColor: 'var(--line-d)',
                            color: 'var(--navy-ink)',
                          }}
                        >
                          ⚙
                        </button>
                      </div>

                      {/* Ngăn bộ lọc chuyên sâu PMO (chỉ bung khi bấm ⚙ để giữ Cột 2 thoáng sạch như mẫu) */}
                      {isPmoFilterOpen && (
                        <div
                          className="pt-2 border-t space-y-2 text-[11px]"
                          style={{ borderColor: 'var(--line)' }}
                        >
                          <div className="grid grid-cols-2 gap-1 p-0.5 rounded border" style={{ backgroundColor: 'var(--giay-d)', borderColor: 'var(--line-d)' }}>
                            <button
                              type="button"
                              onClick={() => setLegalCutoffMode('CURRENT_VALID_ONLY')}
                              className="py-1 px-1.5 rounded font-bold cursor-pointer truncate"
                              style={{
                                backgroundColor: legalCutoffMode === 'CURRENT_VALID_ONLY' ? 'var(--navy)' : 'transparent',
                                color: legalCutoffMode === 'CURRENT_VALID_ONLY' ? '#fff' : 'var(--chu)',
                              }}
                            >
                              🟢 Hiệu lực hiện hành
                            </button>
                            <button
                              type="button"
                              onClick={() => setLegalCutoffMode('PROJECT_TRANSITION')}
                              className="py-1 px-1.5 rounded font-bold cursor-pointer truncate"
                              style={{
                                backgroundColor: legalCutoffMode === 'PROJECT_TRANSITION' ? 'var(--gold)' : 'transparent',
                                color: legalCutoffMode === 'PROJECT_TRANSITION' ? '#2c2003' : 'var(--chu)',
                              }}
                            >
                              ⚖️ Chuyển tiếp [{activeProjectArchetype}]
                            </button>
                          </div>

                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1">
                              {(['ALL', 'QCVN_ONLY', 'TCVN_ONLY'] as const).map(mode => (
                                <button
                                  key={mode}
                                  type="button"
                                  onClick={() => setTechStandardQuickFilter(mode)}
                                  className="px-2 py-0.5 rounded border font-mono text-[10px] font-bold cursor-pointer"
                                  style={{
                                    backgroundColor: techStandardQuickFilter === mode ? 'var(--navy)' : 'var(--panel)',
                                    borderColor: 'var(--line-d)',
                                    color: techStandardQuickFilter === mode ? '#fff' : 'var(--chu)',
                                  }}
                                >
                                  {mode === 'ALL' ? 'Mọi loại' : mode === 'QCVN_ONLY' ? `QCVN (${qcvnTcvnCounts.qcvn})` : `TCVN (${qcvnTcvnCounts.tcvn})`}
                                </button>
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={() => setIsCol2CompactMode(prev => !prev)}
                              className="px-2 py-0.5 rounded border text-[10px] font-semibold cursor-pointer"
                              style={{ backgroundColor: 'var(--panel)', borderColor: 'var(--line-d)' }}
                            >
                              {isCol2CompactMode ? '≣ Đang thu gọn' : '▤ Đầy đủ'}
                            </button>
                          </div>

                          {(() => {
                            const activeNotebook = resolveLegalNotebookForContext({
                              doc: currentLegalDoc,
                              domainCode: vbplDomainFilter,
                              gateCode: vbplGateFilter,
                              projectCode: activeProjectArchetype,
                            });
                            const notebookUrl = getResolvedNotebookUrl(activeNotebook.id);
                            return (
                              <div className="flex items-center justify-between gap-1.5 pt-1">
                                <span className="truncate font-mono text-[10px]" style={{ color: 'var(--chu-m)' }}>
                                  📓 {activeNotebook.code}: {activeNotebook.shortTitle}
                                </span>
                                <a
                                  href={notebookUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-0.5 rounded text-[10px] font-bold text-white shrink-0"
                                  style={{ backgroundColor: 'var(--tim)' }}
                                >
                                  Mở NotebookLM ↗
                                </a>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    {/* Danh sách Thẻ Văn bản Accordion chuẩn .vb-node của thuvien-vbpl-26 */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                      {pane2SubTab === 'RESULTS' && !globalSearch.trim() ? (
                        <div className="py-12 px-5 text-center space-y-2">
                          <div className="text-sm font-bold flex items-center justify-center gap-1.5" style={{ color: 'var(--navy-ink)' }}>
                            <span>🌐</span>
                            <span>Chế độ tra cứu toàn thư viện</span>
                          </div>
                          <p className="text-xs leading-relaxed" style={{ color: 'var(--chu-m)' }}>
                            Gõ cụm từ (≥ 2 ký tự) ở ô tìm kiếm phía trên rồi bấm{' '}
                            <b style={{ color: 'var(--navy-ink)' }}>Enter</b>.
                            <br />
                            Kết quả tự động lọc trên toàn bộ {legalDocs.length} văn bản.
                          </p>
                        </div>
                      ) : filteredLegalDocs.length === 0 ? (
                        <div className="vbpl-card p-5 text-center text-xs space-y-2.5">
                          <p className="font-bold" style={{ color: 'var(--chu)' }}>
                            Không tìm thấy văn bản khớp bộ lọc hiện tại.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setVbplIndustryGroupFilter('ALL');
                              setVbplSubSectorFilter('ALL');
                              setVbplDomainFilter('ALL');
                              setVbplProjectFilter('ALL');
                              setVbplGateFilter('ALL');
                              setFilterDocType('ALL');
                              setTechStandardQuickFilter('ALL');
                              setFilterValidityPeriod('ALL');
                              setPane2SubTab('DOCS');
                              setGlobalSearch('');
                            }}
                            className="px-3 py-1.5 rounded text-white font-bold text-xs cursor-pointer"
                            style={{ backgroundColor: 'var(--navy)' }}
                          >
                            🌐 Xem toàn bộ thư viện ({legalDocs.length} VB)
                          </button>
                        </div>
                      ) : (
                        filteredLegalDocs.map(doc => {
                          const isSelected = doc.id === currentLegalDoc?.id;
                          const isExpandedToc = !isCol2CompactMode && doc.id === expandedInlineDocId;
                          const isExpired =
                            doc.validityPeriod === 'AMENDED' || /hết hiệu lực/i.test(doc.status);
                          const hasPdfSource = Boolean(
                            (doc.rawFileName || doc.ssotFileName || '').toLowerCase().endsWith('.pdf')
                          );
                          const docNotesCount = doc.nodes.filter(
                            n =>
                              n.level !== 'Chương' &&
                              n.level !== 'Mục' &&
                              Boolean(articlePersonalNotes[getArticleNoteKey(doc.id, n.id)])
                          ).length;

                          return (
                            <div
                              key={doc.id}
                              id={`col2-doc-card-${doc.id}`}
                              className="vbpl-card overflow-hidden"
                              style={{
                                borderColor: isSelected ? 'var(--navy)' : undefined,
                              }}
                            >
                              {/* Đầu thẻ văn bản */}
                              <div
                                onClick={() => {
                                  handleSelectDoc(doc.id, !isCol2CompactMode);
                                  setMobilePane('c3');
                                }}
                                className={`px-2.5 py-2 cursor-pointer transition ${
                                  isSelected ? 'vbpl-card-open-header' : ''
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                                    <span
                                      className={`text-[10px] shrink-0 ${
                                        isSelected ? 'text-[#e8c66a]' : 'opacity-55'
                                      }`}
                                    >
                                      {isExpandedToc ? '▾' : '▸'}
                                    </span>

                                    <span className={getVbplBadgeClass(doc.docType)}>
                                      {getVbplBadgeLabel(doc.docType)}
                                    </span>

                                    <span
                                      className={`font-mono font-bold text-[12.5px] truncate ${
                                        isExpired ? 'line-through opacity-75' : ''
                                      }`}
                                      style={{ color: isSelected ? '#ffffff' : 'var(--chu)' }}
                                    >
                                      {renderHighlightedSpan(doc.docNumber, globalSearch)}
                                    </span>

                                    {isExpired && (
                                      <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-[#98a2ac] text-white">
                                        hết hiệu lực
                                      </span>
                                    )}

                                    {docNotesCount > 0 && (
                                      <span
                                        className="px-1.5 py-0.2 rounded text-[9.5px] font-bold"
                                        style={{ backgroundColor: 'var(--gold)', color: '#3a2c05' }}
                                        title={`${docNotesCount} ghi chú riêng`}
                                      >
                                        🖊 {docNotesCount}
                                      </span>
                                    )}

                                    {doc.isAmended && (
                                      <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-[#2f5a86] text-white border border-white/25">
                                        SĐ
                                      </span>
                                    )}

                                    {hasPdfSource && (
                                      <button
                                        type="button"
                                        onClick={e => {
                                          e.stopPropagation();
                                          setSecurePdfTarget({
                                            fileName: doc.rawFileName || doc.ssotFileName,
                                            docTitle: doc.title,
                                            docNumber: doc.docNumber,
                                          });
                                          setIsSecurePdfOpen(true);
                                        }}
                                        title="Mở bản PDF scan gốc có dấu đỏ (Zero-Trust Proxy)"
                                        className={`px-1.5 py-0.2 rounded text-[10px] border cursor-pointer transition ${
                                          isSelected
                                            ? 'bg-emerald-500/25 border-emerald-300/50 text-emerald-100'
                                            : 'bg-emerald-50 border-emerald-500/40 text-emerald-700 hover:bg-emerald-100'
                                        }`}
                                      >
                                        🔗
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <div
                                  className="mt-1 text-[11.5px] leading-snug line-clamp-2"
                                  style={{
                                    color: isSelected ? 'rgba(255,255,255,0.86)' : 'var(--chu-m)',
                                  }}
                                >
                                  {renderHighlightedSpan(doc.shortSummary || doc.title, globalSearch)}
                                </div>
                              </div>

                              {/* Mục lục bung nội tuyến ngay tại Cột 2 giống hệt step_23_shot_1.png */}
                              {isExpandedToc && (
                                <div
                                  className="border-t max-h-[330px] overflow-y-auto divide-y"
                                  style={{
                                    backgroundColor: 'var(--giay-soft)',
                                    borderColor: 'var(--line)',
                                  }}
                                >
                                  {doc.nodes.map(node => {
                                    const isChapter = node.level === 'Chương';
                                    const isSection = node.level === 'Mục';
                                    const isBasis = node.level === 'Căn cứ' || node.level === 'Mở đầu';
                                    const isNodeActive = activeNodeId === node.id && isSelected;

                                    return (
                                      <div
                                        key={node.id}
                                        onClick={() => {
                                          jumpToArticleNode(doc.id, node.id, true);
                                          setMobilePane('c3');
                                        }}
                                        className="px-3 py-1.5 text-xs cursor-pointer transition"
                                        style={{
                                          borderColor: 'var(--line)',
                                          backgroundColor: isChapter
                                            ? 'var(--giay-d)'
                                            : isNodeActive
                                            ? 'var(--gold-xl)'
                                            : 'transparent',
                                          borderLeft: isNodeActive
                                            ? '3px solid var(--gold)'
                                            : '3px solid transparent',
                                          color: isChapter || isSection
                                            ? 'var(--son)'
                                            : isBasis
                                            ? 'var(--navy)'
                                            : 'var(--chu)',
                                          fontWeight: isChapter || isBasis || isNodeActive ? 700 : 400,
                                        }}
                                      >
                                        {isChapter ? (
                                          <span className="uppercase tracking-wide text-[11px]">
                                            {node.code.replace(/\.+$/, '')}
                                            {node.title ? `. ${node.title}` : ''}
                                          </span>
                                        ) : isSection ? (
                                          <span className="italic pl-2 text-[11px]">
                                            {node.code.replace(/\.+$/, '')}. {node.title}
                                          </span>
                                        ) : isBasis ? (
                                          <span>Căn cứ ban hành · Lời mở đầu</span>
                                        ) : (
                                          <span>
                                            <b style={{ color: 'var(--navy-ink)' }}>{node.code.replace(/\.+$/, '')}.</b>{' '}
                                            {node.title}
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

                {/* Thanh kéo co giãn giữa Cột 2 và Cột 3 */}
                {renderVerticalSplitter({
                  id: 'VBPL_SPLIT_2',
                  lightTheme: true,
                  onDoubleClickReset: () => {
                    setIsVbplCol2Collapsed(false);
                    setVbplCol2Pct(25);
                  },
                  label: `Cột 2: ${Math.round(vbplCol2Pct)}%`,
                })}

                {/* ==========================================================
                    CỘT 3 (.vbpl-c3): TRÌNH ĐỌC GIẤY PHÁP LÝ + DRAWER ĐỐI CHIẾU (#ref)
                   ========================================================== */}
                <div
                  className={`${
                    mobilePane === 'c3' ? 'flex' : 'hidden'
                  } lg:flex flex-1 min-w-[300px] vbpl-c3 flex-col overflow-hidden`}
                >
                  {currentLegalDoc && (
                    <>
                      {/* Thanh công cụ phụ Cột 3 (.vbpl-c3-bar, 38px) chuẩn mẫu */}
                      <div className="vbpl-c3-bar px-3.5 h-[38px] flex items-center justify-between gap-2 shrink-0">
                        <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                          <button
                            type="button"
                            onClick={() =>
                              setRightReaderMode(prev =>
                                prev === 'TOC_INDEX' ? 'FULL_CONTENT' : 'TOC_INDEX'
                              )
                            }
                            title="Chuyển nhanh giữa Mục lục và Nội dung toàn văn (Phím M)"
                            className="px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 transition cursor-pointer border"
                            style={{
                              backgroundColor:
                                rightReaderMode === 'TOC_INDEX' ? 'var(--son)' : 'var(--panel)',
                              borderColor:
                                rightReaderMode === 'TOC_INDEX' ? 'var(--son)' : 'var(--line-d)',
                              color: rightReaderMode === 'TOC_INDEX' ? '#ffffff' : 'var(--chu)',
                            }}
                          >
                            <span>📑</span>
                            <span>Mục lục</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setRightReaderMode('FULL_CONTENT')}
                            className="px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 transition cursor-pointer border"
                            style={{
                              backgroundColor:
                                rightReaderMode === 'FULL_CONTENT' ? 'var(--navy)' : 'var(--panel)',
                              borderColor:
                                rightReaderMode === 'FULL_CONTENT' ? 'var(--navy)' : 'var(--line-d)',
                              color: rightReaderMode === 'FULL_CONTENT' ? '#ffffff' : 'var(--chu)',
                            }}
                          >
                            <span>📄</span>
                            <span className="hidden sm:inline">Toàn văn</span>
                          </button>

                          <span
                            className="font-bold text-xs truncate mx-1"
                            style={{ color: 'var(--navy-ink)' }}
                          >
                            {getVbplBadgeLabel(currentLegalDoc.docType)} {currentLegalDoc.docNumber}
                            {' — '}
                            {rightReaderMode === 'TOC_INDEX'
                              ? 'Mục lục'
                              : rightReaderMode === 'FULL_CONTENT'
                              ? currentLegalDoc.primaryDomain
                              : rightReaderMode === 'COMPARE_MODE'
                              ? 'So sánh song song'
                              : 'Phả hệ'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRoadmapPillarId(resolveRoadmapPillarIdForDoc(currentLegalDoc));
                              setRightReaderMode('LAW_ROADMAP');
                            }}
                            title="Xem Cây Phả hệ Bộ luật"
                            className="px-2 py-1 rounded text-[11px] font-bold border cursor-pointer transition"
                            style={{
                              backgroundColor:
                                rightReaderMode === 'LAW_ROADMAP' ? 'var(--gold)' : 'var(--panel)',
                              borderColor: 'var(--line-d)',
                              color: rightReaderMode === 'LAW_ROADMAP' ? '#2c2003' : 'var(--chu)',
                            }}
                          >
                            🗺️ <span className="hidden xl:inline">Phả hệ</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setRightReaderMode('COMPARE_MODE')}
                            title="So sánh song song 2 điều khoản (AI Diff)"
                            className="px-2 py-1 rounded text-[11px] font-bold border cursor-pointer transition"
                            style={{
                              backgroundColor:
                                rightReaderMode === 'COMPARE_MODE' ? 'var(--tim)' : 'var(--panel)',
                              borderColor: 'var(--line-d)',
                              color: rightReaderMode === 'COMPARE_MODE' ? '#ffffff' : 'var(--chu)',
                            }}
                          >
                            ⚖️ <span className="hidden xl:inline">So sánh</span>
                          </button>

                          {Boolean(
                            (currentLegalDoc.rawFileName || currentLegalDoc.ssotFileName || '')
                              .toLowerCase()
                              .endsWith('.pdf')
                          ) && (
                            <button
                              type="button"
                              onClick={() => {
                                setSecurePdfTarget({
                                  fileName: currentLegalDoc.rawFileName || currentLegalDoc.ssotFileName,
                                  docTitle: currentLegalDoc.title,
                                  docNumber: currentLegalDoc.docNumber,
                                });
                                setIsSecurePdfOpen(true);
                              }}
                              title="Xem trực tiếp bản scan PDF gốc có dấu đỏ (Zero-Trust Proxy, không mở Drive)"
                              className="px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 bg-[#1e7e34] hover:opacity-90 text-white cursor-pointer"
                            >
                              <span>🔒</span>
                              <span className="hidden sm:inline">PDF gốc</span>
                            </button>
                          )}

                          {/* 3 Nút biểu tượng góc phải chuẩn mẫu: Đánh dấu (D) · Sao chép (C) · In */}
                          <button
                            type="button"
                            onClick={e => toggleBookmarkDoc(currentLegalDoc.id, e)}
                            title="Đánh dấu văn bản (Phím D)"
                            className="h-7 w-7 rounded border flex items-center justify-center text-xs cursor-pointer transition"
                            style={{
                              backgroundColor: bookmarkedDocIds.includes(currentLegalDoc.id)
                                ? 'var(--son)'
                                : 'var(--panel)',
                              borderColor: bookmarkedDocIds.includes(currentLegalDoc.id)
                                ? 'var(--son)'
                                : 'var(--line-d)',
                              color: bookmarkedDocIds.includes(currentLegalDoc.id)
                                ? '#ffffff'
                                : 'var(--chu)',
                            }}
                          >
                            🖊️
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const cite = `${getVbplBadgeLabel(currentLegalDoc.docType)} ${currentLegalDoc.docNumber} — ${currentLegalDoc.title} (Ban hành: ${currentLegalDoc.issueDate}, Hiệu lực: ${currentLegalDoc.effectiveDate})`;
                              navigator.clipboard?.writeText(cite);
                              showToast(`📋 Đã sao chép trích dẫn: ${currentLegalDoc.docNumber}`);
                            }}
                            title="Sao chép trích dẫn văn bản (Phím C)"
                            className="h-7 w-7 rounded border flex items-center justify-center text-xs cursor-pointer"
                            style={{
                              backgroundColor: 'var(--panel)',
                              borderColor: 'var(--line-d)',
                              color: 'var(--chu)',
                            }}
                          >
                            📋
                          </button>

                          <button
                            type="button"
                            onClick={() => window.print()}
                            title="In nội dung văn bản (Ctrl + P)"
                            className="h-7 w-7 rounded border flex items-center justify-center text-xs cursor-pointer"
                            style={{
                              backgroundColor: 'var(--panel)',
                              borderColor: 'var(--line-d)',
                              color: 'var(--chu)',
                            }}
                          >
                            🖨️
                          </button>
                        </div>
                      </div>

                      {/* Khung chính Cột 3 + Ngăn kéo Đối chiếu Trượt ngang (#ref) */}
                      <div className="flex-1 flex overflow-hidden">
                        <div className="flex-1 overflow-y-auto px-5 md:px-8 py-6 vbpl-doc-reader">
                          {rightReaderMode === 'TOC_INDEX' ? (
                            /* ======================================================
                               CHẾ ĐỘ 1: BÌA VĂN BẢN + PHẢ HỆ + MỤC LỤC CHẤM NGANG
                               (Khớp chính xác bố cục step_23_shot_1.png)
                               ====================================================== */
                            <div
                              className="max-w-[860px] mx-auto space-y-5"
                              style={{ fontSize: `${readerFontSize}px` }}
                            >
                              {/* 1. Bìa Quốc hiệu / Loại VB / Số hiệu / Tên Văn bản căn giữa */}
                              <div
                                className="text-center pb-5 border-b-[3px] border-double space-y-2"
                                style={{ borderColor: 'var(--line-d)' }}
                              >
                                <div
                                  className="text-xs font-extrabold uppercase tracking-[0.22em]"
                                  style={{ color: 'var(--son)' }}
                                >
                                  {spacedDocTypeHeader(currentLegalDoc.docType)}
                                </div>
                                <div
                                  className="font-mono text-[13px]"
                                  style={{ color: 'var(--chu-m)' }}
                                >
                                  Số {currentLegalDoc.docNumber}
                                </div>
                                <h1
                                  className="text-lg md:text-[20px] font-bold leading-snug max-w-[740px] mx-auto pt-0.5"
                                  style={{ color: 'var(--navy-ink)' }}
                                >
                                  {currentLegalDoc.title}
                                </h1>

                                {/* Hàng huy hiệu Metadata căn giữa chuẩn .chip */}
                                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                                  <span className="vbpl-chip">
                                    Ban hành <b>{currentLegalDoc.issueDate}</b>
                                  </span>
                                  <span className="vbpl-chip">
                                    Hiệu lực từ <b>{currentLegalDoc.effectiveDate}</b>
                                  </span>
                                  <span className="vbpl-chip tabular-nums">
                                    <b>{currentLegalDoc.articleCount}</b> điều
                                  </span>
                                  <span className="vbpl-chip tabular-nums">
                                    <b>{currentLegalDoc.chapterCount}</b> chương
                                  </span>
                                  <span className="vbpl-chip tabular-nums">
                                    <b>{currentLegalDoc.clauseTotalCount}</b> khoản/điểm
                                  </span>

                                  {(() => {
                                    const docNoteCount = currentLegalDoc.nodes.filter(
                                      n =>
                                        n.level !== 'Chương' &&
                                        n.level !== 'Mục' &&
                                        Boolean(
                                          articlePersonalNotes[
                                            getArticleNoteKey(currentLegalDoc.id, n.id)
                                          ]
                                        )
                                    ).length;
                                    return (
                                      <button
                                        type="button"
                                        onClick={() => setFilterOnlyNotedNodes(prev => !prev)}
                                        className="vbpl-chip cursor-pointer transition"
                                        style={{
                                          backgroundColor:
                                            filterOnlyNotedNodes || docNoteCount > 0
                                              ? 'var(--gold-xl)'
                                              : undefined,
                                          borderColor:
                                            filterOnlyNotedNodes || docNoteCount > 0
                                              ? 'var(--gold)'
                                              : undefined,
                                        }}
                                      >
                                        <span>🖊</span>
                                        <span>
                                          <b>{docNoteCount}</b> ghi chú riêng
                                          {filterOnlyNotedNodes ? ' (Đang lọc)' : ''}
                                        </span>
                                      </button>
                                    );
                                  })()}

                                  {currentLegalDoc.linkedGates?.slice(0, 4).map(g => (
                                    <button
                                      key={g}
                                      type="button"
                                      onClick={() => {
                                        setSelectedGateCode(g);
                                        setActiveTab('STEP3_PLAN');
                                      }}
                                      title={`Mở chốt chặn Stage-Gate ${g} tại Bước 3`}
                                      className="vbpl-chip cursor-pointer font-mono text-[11px] font-bold hover:opacity-85"
                                      style={{ color: 'var(--navy-ink)' }}
                                    >
                                      🧭 Gate {g}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Cảnh báo hiệu lực nếu hết hiệu lực / sắp có hiệu lực */}
                              {(currentLegalDoc.validityPeriod === 'AMENDED' ||
                                /hết hiệu lực/i.test(currentLegalDoc.status)) && (
                                <div
                                  className="px-4 py-2.5 rounded-lg border text-xs font-medium"
                                  style={{
                                    backgroundColor: 'rgba(161, 52, 44, 0.08)',
                                    borderColor: 'var(--son)',
                                    color: 'var(--son)',
                                  }}
                                >
                                  ⚠ Văn bản thuộc diện <b>{currentLegalDoc.status}</b> — chỉ dùng đối chiếu hồ sơ chuyển tiếp kỳ cũ.
                                </div>
                              )}

                              {/* 2. Hộp Phả hệ & Văn bản Liên quan (Bấm mở Ngăn kéo đối chiếu #ref bên phải) */}
                              {relatedLineageDocs.length > 0 && (
                                <div
                                  className="p-4 rounded-xl border space-y-2.5"
                                  style={{
                                    backgroundColor: 'var(--giay-soft)',
                                    borderColor: 'var(--gold)',
                                  }}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: 'var(--navy-ink)' }}>
                                      <span>📌</span>
                                      <span>Văn bản cùng lĩnh vực & hướng dẫn đối chiếu ({currentLegalDoc.primaryDomain})</span>
                                    </span>
                                    <span className="text-[11px]" style={{ color: 'var(--chu-m)' }}>
                                      Bấm để mở ngăn đối chiếu song song bên phải
                                    </span>
                                  </div>

                                  <div className="space-y-1.5">
                                    {relatedLineageDocs.map(rel => (
                                      <div
                                        key={rel.id}
                                        onClick={() =>
                                          setSlideRefTarget({
                                            doc: rel,
                                            reasonLabel: `Đối chiếu cùng chuyên ngành ${currentLegalDoc.primaryDomain} với ${currentLegalDoc.docNumber}`,
                                          })
                                        }
                                        className="px-3 py-2 rounded-lg border flex items-center justify-between gap-2 cursor-pointer transition hover:shadow-xs"
                                        style={{
                                          backgroundColor: 'var(--panel)',
                                          borderColor: 'var(--line)',
                                        }}
                                      >
                                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                          <span className={getVbplBadgeClass(rel.docType)}>
                                            {getVbplBadgeLabel(rel.docType)}
                                          </span>
                                          <span className="font-mono font-bold text-xs" style={{ color: 'var(--chu)' }}>
                                            {rel.docNumber}
                                          </span>
                                          <span className="text-[11px]" style={{ color: 'var(--chu-nhat)' }}>
                                            {rel.effectiveDate}
                                          </span>
                                          <span className="text-xs truncate" style={{ color: 'var(--chu-m)' }}>
                                            — {rel.shortSummary || rel.title}
                                          </span>
                                        </div>
                                        <span
                                          className="text-xs font-semibold shrink-0"
                                          style={{ color: 'var(--navy-l)' }}
                                        >
                                          mở ›
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* 3. Mục lục Chấm Kẻ Ngang chuẩn thuvien-vbpl-26 */}
                              <div className="space-y-2 pt-1">
                                <div className="flex items-center justify-between text-xs pb-1">
                                  <span style={{ color: 'var(--chu-m)' }}>
                                    📑 <b style={{ color: 'var(--son)' }} className="text-sm">Mục lục</b>{' '}
                                    bấm vào từng dòng để tới thẳng nội dung điều khoản
                                  </span>
                                  <span className="font-mono text-[11px]" style={{ color: 'var(--chu-nhat)' }}>
                                    Số khoản
                                  </span>
                                </div>

                                <div className="space-y-1">
                                  {currentLegalDoc.nodes
                                    .filter(node => {
                                      if (!filterOnlyNotedNodes) return true;
                                      if (node.level === 'Chương' || node.level === 'Mục') return false;
                                      return Boolean(
                                        articlePersonalNotes[
                                          getArticleNoteKey(currentLegalDoc.id, node.id)
                                        ]
                                      );
                                    })
                                    .map(node => {
                                      if (node.level === 'Chương') {
                                        return (
                                          <div
                                            key={node.id}
                                            id={`reader-node-${node.id}`}
                                            className="mt-4 mb-2 vbpl-chapter-bar text-sm"
                                          >
                                            {node.code.replace(/\.+$/, '')}. {node.title}
                                          </div>
                                        );
                                      }

                                      if (node.level === 'Mục') {
                                        return (
                                          <div
                                            key={node.id}
                                            id={`reader-node-${node.id}`}
                                            className="pt-2 pb-1 pl-3 italic font-bold text-xs"
                                            style={{ color: 'var(--son)' }}
                                          >
                                            {node.code.replace(/\.+$/, '')}. {node.title}
                                          </div>
                                        );
                                      }

                                      const noteKey = getArticleNoteKey(currentLegalDoc.id, node.id);
                                      const existingNote = articlePersonalNotes[noteKey];

                                      return (
                                        <div
                                          key={node.id}
                                          id={`reader-node-${node.id}`}
                                          onClick={() =>
                                            jumpToArticleNode(currentLegalDoc.id, node.id, true)
                                          }
                                          className="group flex items-baseline justify-between gap-2 py-1.5 px-2.5 rounded cursor-pointer transition"
                                          style={{
                                            backgroundColor: existingNote
                                              ? 'var(--gold-xl)'
                                              : 'transparent',
                                          }}
                                        >
                                          <span
                                            className="leading-relaxed group-hover:underline"
                                            style={{ color: 'var(--navy-ink)' }}
                                          >
                                            <b className="font-bold">
                                              {node.level === 'Căn cứ' || node.level === 'Mở đầu'
                                                ? 'Căn cứ ban hành · Lời mở đầu'
                                                : `${node.code.replace(/\.+$/, '')}.`}
                                            </b>{' '}
                                            {node.level !== 'Căn cứ' && node.level !== 'Mở đầu' && (
                                              <span style={{ color: 'var(--chu)' }}>
                                                {node.title}
                                              </span>
                                            )}
                                          </span>

                                          <span
                                            className="flex-1 border-b border-dotted mx-1.5 min-w-[24px]"
                                            style={{ borderColor: 'var(--line-d)' }}
                                          />

                                          <span className="flex items-center gap-2 shrink-0">
                                            {existingNote && (
                                              <span
                                                title={existingNote.text}
                                                className="text-xs"
                                                style={{ color: 'var(--cam)' }}
                                              >
                                                🖊
                                              </span>
                                            )}
                                            <span
                                              className="text-xs font-mono tabular-nums"
                                              style={{ color: 'var(--chu-nhat)' }}
                                            >
                                              {node.clauseCount ?? 1}
                                            </span>
                                          </span>
                                        </div>
                                      );
                                    })}
                                </div>
                              </div>
                            </div>
                          ) : rightReaderMode === 'FULL_CONTENT' ? (
                            /* ======================================================
                               CHẾ ĐỘ 2: ĐỌC TOÀN VĂN ĐIỀU KHOẢN CHUẨN SÁCH LUẬT
                               (Số khoản Đỏ son · Hộp Ghi chú riêng viền vàng nét đứt)
                               ====================================================== */
                            <div
                              className="max-w-[860px] mx-auto space-y-6"
                              style={{ fontSize: `${readerFontSize}px` }}
                            >
                              {/* Hộp tóm tắt & Nguồn gốc văn bản ở đầu trang đọc */}
                              <div
                                className="p-4 rounded-lg border space-y-2"
                                style={{
                                  backgroundColor: 'var(--giay-soft)',
                                  borderColor: 'var(--gold)',
                                }}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className={getVbplBadgeClass(currentLegalDoc.docType)}>
                                      {getVbplBadgeLabel(currentLegalDoc.docType)}
                                    </span>
                                    <span className="font-mono font-bold text-sm" style={{ color: 'var(--navy-ink)' }}>
                                      {currentLegalDoc.docNumber}
                                    </span>
                                    <span className="text-xs" style={{ color: 'var(--chu-m)' }}>
                                      · Hiệu lực: <b>{currentLegalDoc.effectiveDate}</b>
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setRightReaderMode('TOC_INDEX')}
                                    className="text-xs font-bold underline cursor-pointer"
                                    style={{ color: 'var(--son)' }}
                                  >
                                    ← Quay về Mục lục
                                  </button>
                                </div>
                                <div className="font-bold text-base" style={{ color: 'var(--chu)' }}>
                                  {currentLegalDoc.title}
                                </div>
                                {currentLegalDoc.lineage && (
                                  <div className="text-xs" style={{ color: 'var(--chu-m)' }}>
                                    {currentLegalDoc.lineage}
                                  </div>
                                )}
                              </div>

                              {/* Chuỗi các Điều khoản nối tiếp chuẩn step_25_shot_1.png */}
                              <div className="space-y-7">
                                {currentLegalDoc.nodes
                                  .filter(node => {
                                    if (!filterOnlyNotedNodes) return true;
                                    if (node.level === 'Chương' || node.level === 'Mục') return false;
                                    return Boolean(
                                      articlePersonalNotes[
                                        getArticleNoteKey(currentLegalDoc.id, node.id)
                                      ]
                                    );
                                  })
                                  .map(node => {
                                    if (node.level === 'Chương') {
                                      return (
                                        <div
                                          key={node.id}
                                          id={`reader-node-${node.id}`}
                                          className="vbpl-chapter-bar text-sm mt-6"
                                        >
                                          {node.code.replace(/\.+$/, '')}. {node.title}
                                        </div>
                                      );
                                    }

                                    if (node.level === 'Mục') {
                                      return (
                                        <div
                                          key={node.id}
                                          id={`reader-node-${node.id}`}
                                          className="italic font-bold text-sm pt-2"
                                          style={{ color: 'var(--son)' }}
                                        >
                                          {node.code.replace(/\.+$/, '')}. {node.title}
                                        </div>
                                      );
                                    }

                                    const noteKey = getArticleNoteKey(currentLegalDoc.id, node.id);
                                    const existingNote = articlePersonalNotes[noteKey];
                                    const isEditingThisNote = editingNoteKey === noteKey;
                                    const isActiveArticle = activeNodeId === node.id;

                                    return (
                                      <article
                                        key={node.id}
                                        id={`reader-node-${node.id}`}
                                        className={`scroll-mt-4 space-y-3 transition ${
                                          isActiveArticle
                                            ? 'pl-3.5 border-l-[3px]'
                                            : ''
                                        }`}
                                        style={{
                                          borderColor: isActiveArticle ? 'var(--gold)' : undefined,
                                        }}
                                      >
                                        {/* Tiêu đề Điều màu Xanh Navy + Cụm nút đối chiếu nhanh */}
                                        <div className="flex flex-wrap items-baseline justify-between gap-2 group">
                                          <h3
                                            className="text-[16.5px] font-bold leading-snug"
                                            style={{ color: 'var(--navy-ink)' }}
                                          >
                                            {node.code.replace(/\.+$/, '')}. {renderHighlightedSpan(node.title, globalSearch)}
                                          </h3>

                                          <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition text-[11px]">
                                            {relatedLineageDocs[0] && (
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setSlideRefTarget({
                                                    doc: relatedLineageDocs[0],
                                                    reasonLabel: `Đối chiếu với ${node.code} (${currentLegalDoc.docNumber})`,
                                                  })
                                                }
                                                className="px-2 py-0.5 rounded border cursor-pointer font-semibold"
                                                style={{
                                                  backgroundColor: 'var(--giay)',
                                                  borderColor: 'var(--line-d)',
                                                  color: 'var(--navy-ink)',
                                                }}
                                                title="Mở ngăn đối chiếu văn bản liên quan bên phải"
                                              >
                                                🔗 Đối chiếu
                                              </button>
                                            )}
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
                                              className="px-2 py-0.5 rounded border cursor-pointer font-mono font-semibold"
                                              style={{
                                                backgroundColor:
                                                  compareLeftDocId === currentLegalDoc.id &&
                                                  compareLeftNodeId === node.id
                                                    ? 'var(--navy)'
                                                    : 'var(--giay)',
                                                borderColor: 'var(--line-d)',
                                                color:
                                                  compareLeftDocId === currentLegalDoc.id &&
                                                  compareLeftNodeId === node.id
                                                    ? '#ffffff'
                                                    : 'var(--chu)',
                                              }}
                                              title="Chọn làm Điều khoản A"
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
                                              className="px-2 py-0.5 rounded border cursor-pointer font-mono font-semibold"
                                              style={{
                                                backgroundColor: 'var(--giay)',
                                                borderColor: 'var(--line-d)',
                                                color: 'var(--tim)',
                                              }}
                                              title="Đưa vào Điều khoản B và mở bảng So sánh AI"
                                            >
                                              ⚖️ So sánh B
                                            </button>
                                          </div>
                                        </div>

                                        {/* Hộp cảnh báo sửa đổi nếu văn bản có cờ sửa đổi */}
                                        {currentLegalDoc.isAmended && relatedLineageDocs[0] && (
                                          <div className="vbpl-canhbao-sua p-3 text-xs space-y-1">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                              <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-[#d97706] text-white">
                                                ĐÃ SỬA ĐỔI / HỢP NHẤT
                                              </span>
                                              <span style={{ color: 'var(--chu)' }}>
                                                Đối chiếu quy định liên quan tại{' '}
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    setSlideRefTarget({
                                                      doc: relatedLineageDocs[0],
                                                      reasonLabel: `Kiểm tra sửa đổi / hướng dẫn liên quan tới ${node.code}`,
                                                    })
                                                  }
                                                  className="font-bold underline cursor-pointer"
                                                  style={{ color: 'var(--son)' }}
                                                >
                                                  {relatedLineageDocs[0].docNumber} ›
                                                </button>
                                              </span>
                                            </div>
                                          </div>
                                        )}

                                        {/* Nội dung Điều khoản với số khoản Đỏ son */}
                                        {node.content && renderFormattedArticleBody(node.content)}

                                        {/* Hộp GHI CHÚ RIÊNG viền vàng nét đứt chuẩn mẫu (.vbpl-ghichu) */}
                                        <div className="pt-1 space-y-1">
                                          <div
                                            className="text-[10.5px] font-bold uppercase tracking-wider flex items-center justify-between"
                                            style={{ color: 'var(--chu-m)' }}
                                          >
                                            <span>✎ GHI CHÚ RIÊNG (BẤM ĐỂ VIẾT)</span>
                                            {existingNote?.isSharedToGate && (
                                              <span className="px-1.5 py-0.2 rounded bg-[#a1342c] text-white text-[9.5px] font-mono">
                                                📢 Đã gắn Gate [{(existingNote.targetGates || []).join(', ')}]
                                              </span>
                                            )}
                                          </div>

                                          {!isEditingThisNote ? (
                                            <div
                                              onClick={e =>
                                                openArticleNoteEditor(currentLegalDoc.id, node.id, e)
                                              }
                                              className="vbpl-ghichu px-3.5 py-2.5 text-xs cursor-pointer transition hover:opacity-95 min-h-[48px] flex items-start justify-between gap-2"
                                            >
                                              {existingNote ? (
                                                <div className="space-y-0.5">
                                                  <div className="font-medium" style={{ color: 'var(--chu)' }}>
                                                    {existingNote.text}
                                                  </div>
                                                  <div className="text-[10.5px]" style={{ color: 'var(--chu-m)' }}>
                                                    {existingNote.author} · {existingNote.updatedAt}
                                                  </div>
                                                </div>
                                              ) : (
                                                <span className="italic" style={{ color: 'var(--chu-m)' }}>
                                                  Ghi chú nghiệp vụ, rủi ro kiểm toán, ví dụ áp dụng…
                                                </span>
                                              )}
                                            </div>
                                          ) : (
                                            <div
                                              onClick={e => e.stopPropagation()}
                                              className="vbpl-ghichu p-3 space-y-2.5 text-xs"
                                            >
                                              <textarea
                                                rows={2}
                                                autoFocus
                                                value={noteDraftText}
                                                onChange={e => setNoteDraftText(e.target.value)}
                                                placeholder={`Nhập ghi chú nghiệp vụ, rủi ro hoặc lưu ý áp dụng cho ${node.code}…`}
                                                className="w-full rounded border px-2.5 py-1.5 text-xs focus:outline-none"
                                                style={{
                                                  backgroundColor: 'var(--panel)',
                                                  borderColor: 'var(--gold)',
                                                  color: 'var(--chu)',
                                                }}
                                              />

                                              <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      setNoteDraftSharedToGate(prev => !prev)
                                                    }
                                                    className="px-2.5 py-1 rounded border text-[11px] font-bold cursor-pointer"
                                                    style={{
                                                      backgroundColor: noteDraftSharedToGate
                                                        ? 'var(--son)'
                                                        : 'var(--panel)',
                                                      borderColor: 'var(--gold)',
                                                      color: noteDraftSharedToGate
                                                        ? '#ffffff'
                                                        : 'var(--chu)',
                                                    }}
                                                  >
                                                    {noteDraftSharedToGate
                                                      ? '✅ Đang gắn vào Stage-Gate'
                                                      : '📢 Gắn cảnh báo vào Gate'}
                                                  </button>

                                                  {noteDraftSharedToGate &&
                                                    gates.slice(0, 8).map(gItem => {
                                                      const sel = noteDraftTargetGates.includes(gItem.gate);
                                                      return (
                                                        <button
                                                          key={gItem.gate}
                                                          type="button"
                                                          onClick={() => toggleDraftTargetGate(gItem.gate)}
                                                          className="px-1.5 py-0.5 rounded font-mono text-[10px] font-bold border cursor-pointer"
                                                          style={{
                                                            backgroundColor: sel ? 'var(--navy)' : 'var(--panel)',
                                                            borderColor: 'var(--line-d)',
                                                            color: sel ? '#fff' : 'var(--chu)',
                                                          }}
                                                        >
                                                          {gItem.gate}
                                                        </button>
                                                      );
                                                    })}
                                                </div>

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
                                                    className="px-3 py-1 rounded text-white font-bold cursor-pointer"
                                                    style={{ backgroundColor: 'var(--navy)' }}
                                                  >
                                                    💾 Lưu
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
                                                      className="px-2.5 py-1 rounded bg-rose-600 text-white font-semibold cursor-pointer"
                                                    >
                                                      Xóa
                                                    </button>
                                                  )}
                                                  <button
                                                    type="button"
                                                    onClick={() => setEditingNoteKey(null)}
                                                    className="px-2.5 py-1 rounded border cursor-pointer"
                                                    style={{
                                                      backgroundColor: 'var(--panel)',
                                                      borderColor: 'var(--line-d)',
                                                    }}
                                                  >
                                                    Đóng
                                                  </button>
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </article>
                                    );
                                  })}
                              </div>

                              {/* Thanh điều hướng cuối văn bản */}
                              <div
                                className="pt-4 border-t flex flex-wrap items-center justify-between gap-2 text-xs"
                                style={{ borderColor: 'var(--line)' }}
                              >
                                <button
                                  type="button"
                                  onClick={() => setRightReaderMode('TOC_INDEX')}
                                  className="px-3 py-1.5 rounded border font-bold cursor-pointer"
                                  style={{ backgroundColor: 'var(--giay)', borderColor: 'var(--line-d)' }}
                                >
                                  📑 Lên đầu Mục lục
                                </button>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {currentLegalDoc.linkedGates.map(g => (
                                    <button
                                      key={g}
                                      type="button"
                                      onClick={() => {
                                        setSelectedGateCode(g);
                                        setActiveTab('STEP3_PLAN');
                                      }}
                                      className="px-2.5 py-1.5 rounded font-mono font-bold text-white cursor-pointer"
                                      style={{ backgroundColor: 'var(--navy)' }}
                                    >
                                      Bước 3: Gate {g} →
                                    </button>
                                  ))}
                                </div>
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

                        {/* NGĂN KÉO ĐỐI CHIẾU TRƯỢT NGANG (#ref 430px viền Vàng đồng) */}
                        <SlideOverRefDrawer
                          target={slideRefTarget}
                          onClose={() => setSlideRefTarget(null)}
                          onPromoteToMainReader={(docId, nodeId) => {
                            handleSelectDoc(docId, false);
                            if (nodeId) {
                              jumpToArticleNode(docId, nodeId, true);
                            } else {
                              setRightReaderMode('TOC_INDEX');
                            }
                          }}
                          onCompareWithCurrent={(docId, nodeId) => {
                            if (currentLegalDoc) {
                              const curFirst =
                                currentLegalDoc.nodes.find(
                                  n => n.level !== 'Chương' && n.level !== 'Mục'
                                )?.id || currentLegalDoc.nodes[0]?.id;
                              if (curFirst) {
                                sendArticleToCompare('LEFT', currentLegalDoc.id, activeNodeId || curFirst, false);
                              }
                            }
                            sendArticleToCompare('RIGHT', docId, nodeId, true);
                          }}
                          onOpenSecurePdf={doc => {
                            setSecurePdfTarget({
                              fileName: doc.rawFileName || doc.ssotFileName,
                              docTitle: doc.title,
                              docNumber: doc.docNumber,
                            });
                            setIsSecurePdfOpen(true);
                          }}
                          onOpenGate={gCode => {
                            setSelectedGateCode(gCode);
                            setActiveTab('STEP3_PLAN');
                          }}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* THANH ĐIỀU HƯỚNG ĐÁY TRÊN MOBILE (.mnav <= 1024px chuẩn mẫu) */}
              <nav
                className="lg:hidden grid grid-cols-3 border-t-2 shrink-0 text-xs font-bold select-none"
                style={{ backgroundColor: 'var(--navy-d)', borderColor: 'var(--gold)' }}
              >
                {[
                  { id: 'c1' as const, icon: '📚', label: 'Lĩnh vực' },
                  { id: 'c2' as const, icon: '📂', label: `Danh mục (${filteredLegalDocs.length})` },
                  { id: 'c3' as const, icon: '📄', label: 'Nội dung' },
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMobilePane(m.id)}
                    className="py-2.5 flex items-center justify-center gap-1.5 cursor-pointer"
                    style={{
                      color: mobilePane === m.id ? '#2c2003' : '#e2e8f0',
                      backgroundColor: mobilePane === m.id ? 'var(--gold)' : 'transparent',
                    }}
                  >
                    <span>{m.icon}</span>
                    <span>{m.label}</span>
                  </button>
                ))}
              </nav>
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

      {/* MODAL XEM PDF GỐC BẢO MẬT (ZERO-TRUST PROXY) */}
      <SecurePdfViewerModal
        isOpen={isSecurePdfOpen}
        onClose={() => setIsSecurePdfOpen(false)}
        fileName={securePdfTarget.fileName}
        docTitle={securePdfTarget.docTitle}
        docNumber={securePdfTarget.docNumber}
      />
    </>
  );
};
