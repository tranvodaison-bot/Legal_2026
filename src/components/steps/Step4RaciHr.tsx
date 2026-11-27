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

export interface Step4RaciHrProps {
  ctx: StepContextType;
}

export const Step4RaciHr: React.FC<Step4RaciHrProps> = ({ ctx }) => {
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
          {activeTab === 'STEP4_EXECUTE' && (
            <div className="h-full flex flex-col lg:flex-row overflow-hidden">
              <div
                style={{ width: `${step4Col1Pct}%` }}
                className="w-full lg:shrink-0 min-w-[210px] p-3 overflow-y-auto space-y-2 bg-[var(--giay)]"
              >
                <div className="text-[11px] font-bold uppercase text-amber-800 dark:text-amber-400 px-2 py-1">
                  DANH MỤC SƠ ĐỒ QUY TRÌNH THỰC THI
                </div>
                {QAQC_PROCESSES.map(proc => (
                  <button
                    key={proc.id}
                    onClick={() => {
                      setSelectedProcessId(proc.id);
                      setSelectedFlowStepIdx(0);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition ${
                      proc.id === selectedProcessId
                        ? 'bg-amber-500/15 border-amber-500 text-[var(--chu)]'
                        : 'bg-[var(--panel)]/60 border-[var(--line)] text-[var(--chu-m)] hover:bg-[var(--panel)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-amber-800 dark:text-amber-400">
                        Quy trình {proc.code}
                      </span>
                      <span className="text-[11px] font-mono text-sky-800 dark:text-sky-300">Gate {proc.gateRef}</span>
                    </div>
                    <div className="text-xs font-semibold mt-1">{proc.title}</div>
                  </button>
                ))}
              </div>

              {/* Thanh kéo co giãn giữa Cột 1 và Cột 2 Bước 4 */}
              {renderVerticalSplitter({
                id: 'STEP4_SPLIT_1',
                onDoubleClickReset: () => {
                  setStep4Col1Pct(24);
                  showToast('Đã đặt lại độ rộng Cột 1 Bước 4 (24%)');
                },
                label: `Cột 1: ${Math.round(step4Col1Pct)}%`,
              })}

              <div
                style={{ width: `${step4Col2Pct}%` }}
                className="w-full lg:shrink-0 min-w-[280px] p-5 overflow-y-auto space-y-4"
              >
                <div className="bg-[var(--panel)] border border-[var(--line)] rounded-xl p-4 space-y-2">
                  <h2 className="text-base font-bold text-[var(--chu)]">{currentProcess.title}</h2>
                  <p className="text-xs text-[var(--chu-m)]">{currentProcess.summary}</p>
                  <div className="text-[11px] font-mono text-amber-800 dark:text-amber-300">
                    Căn cứ: {currentProcess.legalTag}
                  </div>
                </div>

                <div className="space-y-3">
                  {currentProcess.steps.map((st, idx) => (
                    <div
                      key={st.stepNo}
                      onClick={() => setSelectedFlowStepIdx(idx)}
                      className={`p-4 rounded-xl border cursor-pointer transition ${
                        idx === selectedFlowStepIdx
                          ? 'bg-amber-500/15 border-amber-500'
                          : 'bg-[var(--panel)] border-[var(--line)]'
                      }`}
                    >
                      <div className="flex justify-between text-xs font-mono text-amber-800 dark:text-amber-400 mb-1">
                        <span>{st.stepNo}</span>
                        <span>{st.type}</span>
                      </div>
                      <div className="text-sm font-bold text-[var(--chu)]">{st.name}</div>
                      <div className="text-xs text-[var(--chu-m)] mt-1">Tương tác: {st.parties}</div>
                    </div>
                  ))}
                </div>

                {/* Sổ Nhật ký Thi công Điện tử đã ghi nhận */}
                <div className="bg-[var(--panel)] border border-[var(--line)] rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-emerald-800 dark:text-emerald-400">
                      Nhật ký Thi công Điện tử Đã Ký Xác nhận ({customDiaryEntries.length} bản ghi)
                    </span>
                  </div>
                  <div className="space-y-2 max-h-52 overflow-y-auto">
                    {customDiaryEntries.map(entry => (
                      <div
                        key={entry.id}
                        className="p-3 rounded-lg bg-[var(--giay)] border border-[var(--line)] text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between font-mono text-[11px] text-[var(--chu-m)]">
                          <span>
                            {entry.id} · {entry.date} · {entry.processCode}
                          </span>
                          <span className="text-emerald-800 dark:text-emerald-400">{entry.status}</span>
                        </div>
                        <p className="text-[var(--chu)] font-mono text-[11px]">{entry.content}</p>
                        <div className="text-[10px] text-[var(--chu-m)]">Người ký: {entry.author}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Khóa chéo 3 Trục: Kiểm soát RFI / ITP & Chứng chỉ VLXD QCVN 16:2023 / LAS-XD */}
                <div className="bg-[var(--panel)] border border-amber-500/40 rounded-xl p-4 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase text-amber-800 dark:text-amber-400">
                      🔒 Kiểm soát RFI / ITP & Chứng chỉ VLXD (QCVN 16:2023 / LAS-XD) · Dự án [{activeProjectArchetype}]
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('STEP3_PLAN')}
                      className="px-2.5 py-1 rounded bg-[var(--giay-d)] hover:bg-[var(--giay-d)] text-sky-800 dark:text-sky-300 text-[10px] font-mono font-semibold border border-[var(--line-d)]"
                    >
                      Kiểm tra mở khóa IPC tại Bước 3 →
                    </button>
                  </div>
                  <div className="space-y-2">
                    {qaqcControlRecords
                      .filter(q => q.projectAxes.includes(activeProjectArchetype))
                      .map(item => {
                        const isMatchingProcess = item.processId === currentProcess.id;
                        const isClosed = item.status === 'CLOSED_VERIFIED';
                        return (
                          <div
                            key={item.id}
                            className={`p-3 rounded-lg border flex flex-wrap items-center justify-between gap-2 text-xs ${
                              isClosed
                                ? 'bg-emerald-500/10 dark:bg-emerald-950/40 border-emerald-500/40'
                                : isMatchingProcess
                                ? 'bg-rose-500/10 dark:bg-rose-950/40 border-rose-500/60 ring-1 ring-rose-500/30'
                                : 'bg-[var(--giay)] border-[var(--line)]'
                            }`}
                          >
                            <div className="space-y-0.5 flex-1 min-w-[200px]">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span
                                  className={`px-1.5 py-0.2 rounded font-mono text-[10px] font-bold ${
                                    isClosed
                                      ? 'bg-emerald-500 text-slate-950'
                                      : 'bg-rose-500 text-white'
                                  }`}
                                >
                                  {item.kind === 'CO_CQ_QCVN16'
                                    ? 'CO/CQ QCVN 16'
                                    : item.kind}
                                </span>
                                <span className="font-mono font-bold text-amber-800 dark:text-amber-300">
                                  {item.code}
                                </span>
                                <span className="font-mono text-[10px] text-sky-800 dark:text-sky-300">
                                  Gate {item.gateRef} · {item.processId}
                                </span>
                              </div>
                              <div className="font-semibold text-[var(--chu)]">{item.title}</div>
                              <div className="text-[11px] text-[var(--chu-m)]">{item.detailNote}</div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleToggleQaQcControl(item.id)}
                              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition shrink-0 ${
                                isClosed
                                  ? 'bg-[var(--giay-d)] hover:bg-[var(--giay-d)] text-emerald-800 dark:text-emerald-300 border border-emerald-500/40'
                                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                              }`}
                            >
                              {isClosed ? '✓ Đã đóng (Mở lại)' : '✓ Đóng & Xác nhận Đạt'}
                            </button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* Thanh kéo co giãn giữa Cột 2 và Cột 3 Bước 4 */}
              {renderVerticalSplitter({
                id: 'STEP4_SPLIT_2',
                onDoubleClickReset: () => {
                  setStep4Col2Pct(42);
                  showToast('Đã đặt lại độ rộng Cột 2 Bước 4 (42%)');
                },
                label: `Cột 2: ${Math.round(step4Col2Pct)}%`,
              })}

              {/* Cột Phải: Hướng dẫn + Mẫu Nhật ký + Khởi tạo Biểu mẫu Tự động (Auto-Fill) */}
              <div className="flex-1 min-w-[260px] p-5 bg-[var(--panel)]/30 overflow-y-auto space-y-4">
                <div className="bg-[var(--panel)] border border-amber-500/40 rounded-xl p-4 space-y-2">
                  <div className="text-xs font-mono text-amber-800 dark:text-amber-400">{currentFlowStep.stepNo}</div>
                  <h3 className="text-sm font-bold text-[var(--chu)]">{currentFlowStep.name}</h3>
                  <p className="text-xs text-[var(--chu-m)] leading-relaxed">{currentFlowStep.desc}</p>
                </div>

                <div className="bg-[var(--panel)] border border-emerald-500/30 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400">
                      Mẫu câu ghi Nhật ký Thi công chuẩn:
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(currentFlowStep.diaryTemplate);
                        showToast('Đã copy mẫu ghi Nhật ký thi công!');
                      }}
                      className="text-[11px] px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="p-3 rounded bg-[var(--giay)] font-mono text-xs text-[var(--chu)]">
                    {currentFlowStep.diaryTemplate}
                  </div>
                  <button
                    onClick={async () => {
                      const newEntry = {
                        id: `NK-2026-0${customDiaryEntries.length + 1}`,
                        date: new Date().toLocaleString('sv-SE'),
                        processCode: currentProcess.id,
                        author: `${currentActor.fullName} (${currentActor.rbacRole})`,
                        content: currentFlowStep.diaryTemplate,
                        status: `Đã ký (${currentActor.rbacRole})`,
                      };
                      setCustomDiaryEntries(prev => [newEntry, ...prev]);
                      await recordAuditLog({
                        module: 'QAQC_EXEC',
                        action: `Ghi & ký xác nhận Nhật ký thi công theo ${currentProcess.id} (${currentFlowStep.stepNo})`,
                        entityRef: newEntry.id,
                        newState: 'DIARY_SIGNED',
                      });
                      showToast('Đã ghi và ký xác nhận vào Sổ Nhật ký thi công điện tử!');
                    }}
                    className="w-full py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition"
                  >
                    Ký & Lưu vào Sổ Nhật ký Thi công Điện tử
                  </button>
                </div>

                {/* Trình Khởi tạo Biểu mẫu Tự động điền căn cứ pháp lý (Smart Auto-Fill Form) */}
                <div className="bg-[var(--panel)] border border-sky-500/40 rounded-xl p-4 space-y-3">
                  <div className="text-xs font-bold uppercase text-sky-800 dark:text-sky-400">
                    Biểu mẫu Chuẩn Tự động Điền Căn cứ Pháp lý:
                  </div>
                  <div className="p-3 rounded-lg bg-[var(--giay)] border border-[var(--line)] text-xs space-y-1.5 font-mono text-[var(--chu-m)]">
                    <div className="text-amber-800 dark:text-amber-300 font-bold">{currentFlowStep.formTemplateTitle}</div>
                    <div>• Dự án: {activeProjectName} [{activeProjectArchetype}]</div>
                    <div>• Căn cứ: {currentProcess.legalTag}</div>
                    <div>• Người lập/ký: {currentActor.fullName} ({currentActor.certNumber})</div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      onClick={() => setShowFormPreviewModal(true)}
                      className="py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition whitespace-nowrap"
                    >
                      Mở & Ký Biểu mẫu
                    </button>
                    <button
                      onClick={() => {
                        const content = `${currentFlowStep.formTemplateTitle}\nDự án: ${activeProjectName} (${activeProjectArchetype})\nCăn cứ pháp lý: ${currentProcess.legalTag}\nNội dung xác nhận: ${currentFlowStep.diaryTemplate}`;
                        navigator.clipboard.writeText(content);
                        showToast('Đã copy nội dung Biểu mẫu tự động điền sẵn căn cứ pháp lý!');
                      }}
                      className="py-2 px-3 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition whitespace-nowrap"
                    >
                      Copy Dự thảo
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
    </>
  );
};
