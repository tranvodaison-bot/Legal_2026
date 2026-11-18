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

export interface Step1CdeIngestionProps {
  ctx: StepContextType;
}

export const Step1CdeIngestion: React.FC<Step1CdeIngestionProps> = ({ ctx }) => {
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
          {activeTab === 'STEP1_INGEST' && (
            <div className="h-full flex flex-col lg:flex-row overflow-hidden">
              {/* Cột Trái: Đọc File/Folder Đa năng + Bảng Đổi Tên File/Folder Hàng Loạt + Gắn nhãn 3 Trục */}
              <div
                style={{ width: `${step1LeftPct}%` }}
                className="w-full lg:shrink-0 p-4 overflow-y-auto space-y-3.5 min-w-[300px]"
              >
                {/* 1. TRUNG TÂM ĐỌC FILE & THƯ MỤC ĐA NĂNG (MULTI-FORMAT & FOLDER READER) */}
                <div
                  onDragOver={e => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={e => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      handleProcessFiles(e.dataTransfer.files);
                    }
                  }}
                  className={`rounded-xl border-2 border-dashed p-3.5 transition-all space-y-3 ${
                    isDragging
                      ? 'border-emerald-400 bg-emerald-500/15'
                      : 'border-amber-500/50 bg-slate-900/80 hover:border-amber-400'
                  }`}
                >
                  {/* Input chọn nhiều File */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.docx,.doc,.txt,.md,.csv,.tsv,.json,.xml,.html,.xlsx,.xls,.dwg"
                    className="hidden"
                    onChange={e => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleProcessFiles(e.target.files);
                      }
                    }}
                  />
                  {/* Input chọn cả Thư mục (webkitdirectory) */}
                  <input
                    ref={folderInputRef}
                    type="file"
                    multiple
                    {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
                    className="hidden"
                    onChange={e => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleProcessFiles(e.target.files);
                      }
                    }}
                  />

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-11 w-11 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl shrink-0">
                        {isAnalyzingFile ? '⏳' : '📂'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-extrabold uppercase text-amber-400">
                            BƯỚC 1.1 — ĐỌC FILE / THƯ MỤC ĐA NĂNG & BÓC TÁCH OCR 4 VÙNG
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-[10px]">
                            PDF · DOCX · TXT · CSV · JSON · XML · XLSX · DWG
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          Kéo-thả nhiều <b>File</b> hoặc cả <b>Thư mục dự án</b> để đọc nội dung, tính mã băm{' '}
                          <span className="text-sky-300 font-mono">SHA-256</span>, nhận diện 4 vùng OCR (V1–V4) & đổi tên hàng loạt.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current && fileInputRef.current.click()}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                      >
                        <span>📄</span>
                        <span>Chọn Nhiều File</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => folderInputRef.current && folderInputRef.current.click()}
                        className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                      >
                        <span>📁</span>
                        <span>Đọc Cả Thư Mục</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const samples = createSampleBatchItems(
                            activeProjectArchetype,
                            batchNamingStandard,
                            folderNamingPreset
                          );
                          setDroppedFilesQueue(samples);
                          const first = samples.find(s => s.itemKind === 'FILE') || samples[0];
                          if (first) {
                            setActiveBatchItemId(first.id);
                            setNamingForm(prev => ({
                              ...prev,
                              ...first.suggestion,
                              rawContentToParse: first.extractedText,
                            }));
                          }
                          showToast(
                            'Đã nạp bộ mẫu 6 File & 2 Thư mục dự án để kiểm thử đổi tên hàng loạt!'
                          );
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-emerald-300 font-semibold text-xs transition"
                      >
                        ⚡ Nạp Lô Mẫu (8 mục)
                      </button>
                    </div>
                  </div>

                  {/* Thanh cấu hình Chế độ Đọc File & Quy tắc Đặt tên Hàng loạt */}
                  <div className="pt-2 border-t border-slate-800/90 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                    <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-2 flex items-center justify-between gap-2">
                      <div>
                        <div className="text-[10px] font-mono uppercase text-slate-400">
                          CHẾ ĐỘ ĐỌC NỘI DUNG:
                        </div>
                        <div className="text-[11px] font-semibold text-emerald-300">
                          {deepScanReadMode
                            ? '🔍 Deep Scan (15 trang + OCR V1-V4)'
                            : '⚡ Quick Scan (3 trang đầu)'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDeepScanReadMode(prev => !prev)}
                        className={`px-2 py-1 rounded text-[10px] font-mono font-bold border transition ${
                          deepScanReadMode
                            ? 'bg-emerald-500 text-slate-950 border-emerald-300'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {deepScanReadMode ? 'BẬT' : 'TẮT'}
                      </button>
                    </div>

                    <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-2">
                      <label className="block text-[10px] font-mono uppercase text-amber-400 mb-0.5">
                        CHUẨN ĐẶT TÊN FILE HÀNG LOẠT:
                      </label>
                      <select
                        value={batchNamingStandard}
                        onChange={e =>
                          handleRecomputeBatchNames(
                            e.target.value as QlvbNamingGroupCode,
                            folderNamingPreset
                          )
                        }
                        className="w-full bg-transparent text-[11px] font-semibold text-white focus:outline-none cursor-pointer"
                      >
                        <option value="SSOT_9PART" className="bg-slate-900">
                          Chuẩn SSOT 9 Thành phần (3 Trục)
                        </option>
                        <option value="PL" className="bg-slate-900">
                          Nhóm PL — Văn bản Pháp luật (QLVB v0.1)
                        </option>
                        <option value="HC" className="bg-slate-900">
                          Nhóm HC — Văn bản Hành chính (Pad 001)
                        </option>
                        <option value="KT" className="bg-slate-900">
                          Nhóm KT — Kỹ thuật / Nghiệm thu / TT
                        </option>
                        <option value="TK" className="bg-slate-900">
                          Nhóm TK — Hồ sơ Thiết kế / Bản vẽ / BIM
                        </option>
                        <option value="PLDA" className="bg-slate-900">
                          Nhóm PLDA — Pháp lý Dự án & Hợp đồng
                        </option>
                      </select>
                    </div>

                    <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-2">
                      <label className="block text-[10px] font-mono uppercase text-sky-400 mb-0.5">
                        CHUẨN ĐỔI TÊN THƯ MỤC (FOLDER):
                      </label>
                      <select
                        value={folderNamingPreset}
                        onChange={e =>
                          handleRecomputeBatchNames(
                            batchNamingStandard,
                            e.target.value as FolderNamingPresetCode
                          )
                        }
                        className="w-full bg-transparent text-[11px] font-semibold text-white focus:outline-none cursor-pointer"
                      >
                        <option value="STAGE_GATE_ISO" className="bg-slate-900">
                          ISO 19650 Stage-Gate ({activeProjectArchetype}_G12_CDE/QLCL_...)
                        </option>
                        <option value="QLVB_5GROUP" className="bg-slate-900">
                          Theo 5 Nhóm QLVB (2026_{activeProjectArchetype}/KT_QLCL_...)
                        </option>
                        <option value="AXIS_3D_STANDARD" className="bg-slate-900">
                          Theo Tọa độ 3 Trục (XD_{activeProjectArchetype}_QLCL_2026/...)
                        </option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. BẢNG ĐỔI TÊN FILE & FOLDER HÀNG LOẠT + TRẠNG THÁI CDE ISO 19650 + CHECK TRÙNG SHA-256 */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-extrabold uppercase text-emerald-400">
                        ⚡ BẢNG QUẢN LÝ FILE/FOLDER CDE ISO 19650 ({validatedBatchQueue.length} MỤC)
                      </span>
                      <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px] font-mono flex-wrap">
                        {(
                          [
                            { id: 'ALL', label: `Tất cả (${validatedBatchQueue.length})` },
                            {
                              id: 'FOLDER',
                              label: `📁 Thư mục (${
                                validatedBatchQueue.filter(i => i.itemKind === 'FOLDER').length
                              })`,
                            },
                            {
                              id: 'FILE',
                              label: `📄 File (${
                                validatedBatchQueue.filter(i => i.itemKind !== 'FOLDER').length
                              })`,
                            },
                            {
                              id: 'ISSUE',
                              label: `⚠️ Lỗi (${
                                validatedBatchQueue.filter(i => i.validationStatus !== 'OK').length
                              })`,
                            },
                            {
                              id: 'DUP_HASH',
                              label: `🧬 Trùng SHA (${duplicateHashItems.length})`,
                            },
                          ] as const
                        ).map(tab => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setBatchFilterKind(tab.id)}
                            className={`px-2 py-0.5 rounded transition ${
                              batchFilterKind === tab.id
                                ? tab.id === 'DUP_HASH'
                                  ? 'bg-rose-500 text-white font-bold'
                                  : 'bg-amber-500 text-slate-950 font-bold'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleDuplicateSha256Action('SIMULATE_DUP')}
                        title="Nạp thử 1 tệp trùng nội dung/mã băm SHA-256 để kiểm tra cảnh báo chống trùng lặp"
                        className="px-2 py-1 rounded bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 text-[10px] font-mono font-bold"
                      >
                        🧬 Test trùng SHA-256
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const allSelected = droppedFilesQueue.every(i => i.selected !== false);
                          setDroppedFilesQueue(prev =>
                            prev.map(i => ({ ...i, selected: !allSelected }))
                          );
                        }}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-mono"
                      >
                        ☑️ Chọn/Bỏ tất cả
                      </button>
                      <button
                        type="button"
                        onClick={() => setDroppedFilesQueue([])}
                        className="px-2 py-1 rounded bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[11px]"
                      >
                        🗑️ Xóa lô
                      </button>
                    </div>
                  </div>

                  {/* Thanh lọc Trạng thái CDE ISO 19650: S0 -> S1 -> A1 -> B1 */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-slate-950/90 border border-slate-800 text-[10px] font-mono">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sky-400 font-bold uppercase mr-1">
                        🏛️ Luồng CDE ISO 19650:
                      </span>
                      <button
                        type="button"
                        onClick={() => setBatchFilterCde('ALL')}
                        className={`px-2 py-0.5 rounded border transition ${
                          batchFilterCde === 'ALL'
                            ? 'bg-slate-200 text-slate-950 border-white font-bold'
                            : 'bg-slate-900 text-slate-300 border-slate-700 hover:text-white'
                        }`}
                      >
                        Tất cả ({validatedBatchQueue.length})
                      </button>
                      {CDE_ISO_19650_PIPELINE.map((code, idx) => {
                        const meta = CDE_ISO_19650_META[code];
                        const cnt = validatedBatchQueue.filter(
                          i => (i.cdeStatus || 'S0') === code
                        ).length;
                        return (
                          <React.Fragment key={code}>
                            {idx > 0 && <span className="text-slate-600">→</span>}
                            <button
                              type="button"
                              onClick={() =>
                                setBatchFilterCde(prev => (prev === code ? 'ALL' : code))
                              }
                              title={meta.description}
                              className={`px-2 py-0.5 rounded border transition ${
                                batchFilterCde === code
                                  ? 'bg-amber-500 text-slate-950 border-amber-300 font-bold'
                                  : `${meta.badgeClass} hover:opacity-90`
                              }`}
                            >
                              {meta.shortLabel} ({cnt})
                            </button>
                          </React.Fragment>
                        );
                      })}
                    </div>
                    <span className="text-slate-400 text-[9px]">
                      S0 (WIP) → S1 (Shared) → A1 (Published) → B1 (Archived)
                    </span>
                  </div>

                  {/* CẢNH BÁO TRÙNG LẶP NỘI DUNG / MÃ BĂM SHA-256 KHI NẠP LÔ FILE MỚI */}
                  {duplicateHashItems.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-rose-950/70 border-2 border-rose-500/70 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="space-y-0.5 flex-1 min-w-[220px]">
                        <div className="font-extrabold text-rose-300 flex items-center gap-1.5">
                          <span>⚠️</span>
                          <span>
                            Cảnh báo Trùng lặp Nội dung / Mã băm SHA-256 ({duplicateHashItems.length} mục)
                          </span>
                        </div>
                        <div className="text-[11px] text-rose-100">
                          Phát hiện tệp trùng mã băm SHA-256:{' '}
                          <b className="font-mono text-amber-300">
                            {duplicateHashItems
                              .slice(0, 2)
                              .map(d => `${d.originalName} (SHA: ${d.sha256Hash})`)
                              .join(', ')}
                            {duplicateHashItems.length > 2
                              ? ` và ${duplicateHashItems.length - 2} mục khác`
                              : ''}
                          </b>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDuplicateSha256Action('DESELECT')}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px]"
                        >
                          Bỏ chọn bản trùng
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateSha256Action('REMOVE')}
                          className="px-2.5 py-1 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-bold text-[10px]"
                        >
                          Xóa bản trùng khỏi lô
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Thanh Công cụ Biến đổi Hàng loạt: Tìm & Thay thế | Hậu tố | Đánh số tự động */}
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/90 grid grid-cols-1 xl:grid-cols-12 gap-2 items-center text-xs">
                    <div className="xl:col-span-6 flex items-center gap-1.5">
                      <input
                        type="text"
                        value={batchFindText}
                        onChange={e => setBatchFindText(e.target.value)}
                        placeholder="Tìm từ khóa (VD: KCN, 2025)..."
                        className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-white"
                      />
                      <span className="text-slate-500">→</span>
                      <input
                        type="text"
                        value={batchReplaceText}
                        onChange={e => setBatchReplaceText(e.target.value)}
                        placeholder="Thay bằng..."
                        className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleBatchFindReplaceAndFormat('FIND_REPLACE')}
                        className="px-2.5 py-1 rounded bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 font-semibold text-[11px] shrink-0"
                      >
                        Thay thế
                      </button>
                    </div>

                    <div className="xl:col-span-4 flex items-center gap-1.5">
                      <input
                        type="text"
                        value={batchSuffixInput}
                        onChange={e => setBatchSuffixInput(e.target.value)}
                        placeholder="Hậu tố: PL01, V02, KY..."
                        className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-white font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => handleBatchFindReplaceAndFormat('APPLY_SUFFIX')}
                        className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-semibold text-[11px] shrink-0"
                      >
                        +Hậu tố
                      </button>
                    </div>

                    <div className="xl:col-span-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleBatchFindReplaceAndFormat('AUTO_NUMBER')}
                        title="Đánh lại số thứ tự 001, 002, 003... cho toàn bộ các mục đang chọn"
                        className="w-full px-2 py-1 rounded bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 font-mono font-semibold text-[11px]"
                      >
                        🔢 Đánh số 001..N
                      </button>
                    </div>
                  </div>

                  {/* Danh sách các dòng File & Folder trong lô (Kèm cột Trạng thái CDE ISO 19650) */}
                  {filteredBatchQueue.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-lg">
                      Chưa có File hoặc Thư mục nào trong bộ lọc này. Hãy kéo-thả File/Folder hoặc bấm{' '}
                      <b className="text-emerald-400">"⚡ Nạp Lô Mẫu (8 mục)"</b> ở trên.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                      {filteredBatchQueue.map(item => {
                        const isRowActive = activeBatchItemId === item.id;
                        const isFolder = item.itemKind === 'FOLDER';
                        const isValid = item.validationStatus === 'OK';
                        const cdeCode: CdeIsoStatus = item.cdeStatus || 'S0';
                        const cdeMeta = CDE_ISO_19650_META[cdeCode];

                        return (
                          <div
                            key={item.id}
                            onClick={() => {
                              setActiveBatchItemId(item.id);
                              setActiveRawFile(item.rawFile);
                              setNamingForm(prev => ({
                                ...prev,
                                ...item.suggestion,
                                rawContentToParse: item.extractedText || prev.rawContentToParse,
                              }));
                            }}
                            className={`p-2.5 rounded-lg border transition cursor-pointer ${
                              item.duplicateHashOf
                                ? 'bg-rose-950/35 border-rose-500/70'
                                : isRowActive
                                ? 'bg-[#10233f] border-amber-400 shadow-md'
                                : 'bg-slate-950/90 border-slate-800 hover:border-slate-600'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2 min-w-0 flex-1">
                                <input
                                  type="checkbox"
                                  checked={item.selected !== false}
                                  onChange={e => {
                                    e.stopPropagation();
                                    setDroppedFilesQueue(prev =>
                                      prev.map(q =>
                                        q.id === item.id ? { ...q, selected: e.target.checked } : q
                                      )
                                    );
                                  }}
                                  onClick={e => e.stopPropagation()}
                                  className="mt-1 accent-amber-500 cursor-pointer shrink-0"
                                />

                                <div className="min-w-0 flex-1 space-y-1.5">
                                  {/* Dòng 1: Loại mục + Nhóm QLVB + Thư mục + Cột Trạng thái CDE (ISO 19650) */}
                                  <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px] font-mono">
                                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                                      <span
                                        className={`px-1.5 py-0.2 rounded font-bold ${
                                          isFolder
                                            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                        }`}
                                      >
                                        {isFolder ? '📁 FOLDER' : '📄 FILE'}
                                      </span>

                                      <select
                                        value={item.qlvbGroup || batchNamingStandard}
                                        onClick={e => e.stopPropagation()}
                                        onChange={e => {
                                          const nextGrp = e.target.value as QlvbNamingGroupCode;
                                          setDroppedFilesQueue(prev =>
                                            prev.map(q => {
                                              if (q.id !== item.id) return q;
                                              const nextName =
                                                q.itemKind === 'FOLDER'
                                                  ? q.proposedName
                                                  : buildFileNameByRule({
                                                      group: nextGrp,
                                                      industry: q.suggestion.industry,
                                                      docType: q.suggestion.docType,
                                                      issuer: q.suggestion.issuer,
                                                      rawNumber: q.suggestion.rawNumber,
                                                      year: q.suggestion.year,
                                                      primaryDomain: q.suggestion.primaryDomain,
                                                      rawSummary: q.suggestion.rawSummary,
                                                      appendixSuffix: q.suggestion.appendixSuffix,
                                                      ext: q.suggestion.ext,
                                                      projectCode: activeProjectArchetype,
                                                      ktSubType: q.ktSubType,
                                                      tkStageDept: q.tkStageDept,
                                                      tkDocCode: q.tkDocCode,
                                                      tkRevision: q.tkRevision,
                                                    });
                                              return {
                                                ...q,
                                                qlvbGroup: nextGrp,
                                                proposedName: nextName,
                                              };
                                            })
                                          );
                                        }}
                                        className="bg-slate-900 border border-slate-700 rounded px-1 py-0.2 text-[10px] text-emerald-300 font-bold"
                                      >
                                        <option value="SSOT_9PART">9-PART</option>
                                        <option value="PL">Nhóm PL</option>
                                        <option value="HC">Nhóm HC</option>
                                        <option value="KT">Nhóm KT</option>
                                        <option value="TK">Nhóm TK</option>
                                        <option value="PLDA">Nhóm PLDA</option>
                                      </select>

                                      <span className="text-slate-400 truncate max-w-[240px]">
                                        📂 {item.originalFolderPath || 'Gốc'} →{' '}
                                        <b className="text-sky-300">{item.proposedFolderPath}</b>
                                      </span>
                                    </div>

                                    {/* CỘT TRẠNG THÁI CDE (ISO 19650): S0 -> S1 -> A1 -> B1 */}
                                    <div
                                      className="flex items-center gap-1 shrink-0"
                                      onClick={e => e.stopPropagation()}
                                    >
                                      <span className="text-[9px] text-slate-400 uppercase">CDE:</span>
                                      <select
                                        value={cdeCode}
                                        onChange={e =>
                                          handleChangeCdeStatus(
                                            item.id,
                                            e.target.value as CdeIsoStatus
                                          )
                                        }
                                        title={`Trạng thái CDE (ISO 19650): ${cdeMeta.description}`}
                                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold border cursor-pointer focus:outline-none ${cdeMeta.badgeClass}`}
                                      >
                                        <option value="S0" className="bg-slate-900 text-amber-200">
                                          S0 · WIP (Đang soạn thảo)
                                        </option>
                                        <option value="S1" className="bg-slate-900 text-sky-300">
                                          S1 · Shared (Phối hợp 4 bên)
                                        </option>
                                        <option value="A1" className="bg-slate-900 text-emerald-300">
                                          A1 · Published (Đã duyệt thi công)
                                        </option>
                                        <option value="B1" className="bg-slate-900 text-purple-300">
                                          B1 · Archived (Hồ sơ hoàn công)
                                        </option>
                                      </select>
                                      {cdeMeta.nextCode && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleChangeCdeStatus(item.id, cdeMeta.nextCode!)
                                          }
                                          title={cdeMeta.nextActionLabel || undefined}
                                          className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-amber-300 border border-amber-500/40 text-[9px] font-bold transition"
                                        >
                                          → {cdeMeta.nextCode}
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Dòng 2: Tên gốc -> Ô sửa trực tiếp Tên mới */}
                                  <div className="grid grid-cols-1 md:grid-cols-12 gap-1.5 items-center text-xs">
                                    <div
                                      className="md:col-span-5 text-slate-400 truncate text-[11px]"
                                      title={item.originalName}
                                    >
                                      Gốc: <span className="text-slate-200">{item.originalName}</span>
                                    </div>
                                    <div className="md:col-span-7 flex items-center gap-1">
                                      <span className="text-emerald-400 font-mono text-[11px] shrink-0">
                                        →
                                      </span>
                                      <input
                                        type="text"
                                        value={item.proposedName}
                                        onClick={e => e.stopPropagation()}
                                        onChange={e => {
                                          const val = e.target.value;
                                          setDroppedFilesQueue(prev =>
                                            prev.map(q =>
                                              q.id === item.id ? { ...q, proposedName: val } : q
                                            )
                                          );
                                        }}
                                        className="w-full bg-slate-900/90 border border-slate-700 focus:border-emerald-400 rounded px-2 py-0.5 font-mono text-[11px] text-emerald-300 focus:outline-none"
                                      />
                                    </div>
                                  </div>

                                  {/* Dòng 3: Metadata đọc file, OCR confidence, SHA256, Duplicate Hash & Trạng thái kiểm tra */}
                                  <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-[10px] font-mono">
                                    <div className="flex flex-wrap items-center gap-2 text-slate-400">
                                      <span>📊 {item.readStatsLabel || 'Đã đọc'}</span>
                                      <span>·</span>
                                      <span>
                                        OCR:{' '}
                                        <b className="text-amber-300">
                                          {item.ocrZones?.confidence || 95}%
                                        </b>
                                      </span>
                                      <span>·</span>
                                      <span
                                        className={
                                          item.duplicateHashOf ? 'text-rose-300 font-bold' : ''
                                        }
                                      >
                                        SHA256: {item.sha256Hash || '8F4EA12B'}
                                      </span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-1.5">
                                      {item.duplicateHashOf && (
                                        <span className="px-1.5 py-0.2 rounded bg-rose-500 text-white font-extrabold animate-pulse">
                                          🧬 TRÙNG SHA-256 ({item.duplicateSourceKind === 'IN_REPO' ? 'Kho SSOT' : 'Trong lô'})
                                        </span>
                                      )}
                                      {item.isCommitted && (
                                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                                          ✓ Đã lưu kho
                                        </span>
                                      )}
                                      <span
                                        className={`px-1.5 py-0.2 rounded font-bold ${
                                          isValid
                                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50'
                                            : 'bg-rose-950 text-rose-300 border border-rose-600/60'
                                        }`}
                                      >
                                        {item.validationStatus}: {item.validationMessage}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  handleDownloadRenamedFile(item.rawFile, item.proposedName);
                                }}
                                className="px-2 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[10px] shrink-0 whitespace-nowrap"
                              >
                                ⬇️ Tải
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Thanh Nút Thực thi Đổi tên Hàng loạt & Xuất Script */}
                  <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleCommitBatchRename}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs transition flex items-center gap-1.5 shadow-md"
                      >
                        <span>✅</span>
                        <span>
                          Đổi Tên & Lưu Kho Hàng Loạt (
                          {validatedBatchQueue.filter(i => i.selected !== false).length} mục)
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExportBatchRenameArtifact('PS1')}
                        title="Tải xuống Script PowerShell (.ps1) để chạy đổi tên File & Folder trực tiếp trên máy tính"
                        className="px-2.5 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 font-semibold text-xs transition"
                      >
                        💻 Xuất Script .PS1 (Ổ cứng)
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExportBatchRenameArtifact('CSV')}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 font-semibold text-xs transition"
                      >
                        📊 Xuất Bảng CSV
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setStep1RightSubTab('RENAME_LOG')}
                      className="text-[11px] font-mono text-amber-300 hover:underline"
                    >
                      📜 Nhật ký Hoàn tác ({renameLogs.length}) ›
                    </button>
                  </div>
                </div>

                {/* Kết quả Sinh Tên File Chuẩn cho Mục Đang Chọn */}
                <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-mono uppercase text-amber-400 font-semibold">
                      ĐỊNH DANH TÊN FILE CHUẨN ĐANG CHỌN ({batchNamingStandard}):
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(generatedFileName);
                          showToast('Đã copy tên file chuẩn!');
                        }}
                        className="text-xs bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 font-semibold px-2.5 py-1 rounded-md whitespace-nowrap"
                      >
                        Copy Tên File
                      </button>
                      <button
                        onClick={() => handleDownloadRenamedFile(activeRawFile, generatedFileName)}
                        className="text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-2.5 py-1 rounded-md whitespace-nowrap"
                      >
                        {activeRawFile ? 'Tải File Đã Đổi Tên' : 'Xuất Bản Thảo SSOT'}
                      </button>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-400 break-all select-all">
                    {generatedFileName}
                  </div>
                </div>

                {/* Cấu hình 9 Thành phần & TRỤC 1 (Nhóm Pháp luật) */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 border-b border-slate-800 pb-2">
                    TRỤC 1 (NHÓM PHÁP LUẬT): Luật · Nghị định · Thông tư · Nghị quyết · Văn bản hợp nhất · QCVN/TCVN
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">1. [Ngành]</label>
                      <select
                        value={namingForm.industry}
                        onChange={e => setNamingForm({ ...namingForm, industry: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white"
                      >
                        {TAXONOMY_3D.industries.map(item => (
                          <option key={item.code} value={item.code}>
                            {item.code} — {item.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-rose-400 font-bold mb-1">
                        2. [Loại_VB] (Nhóm Pháp luật)
                      </label>
                      <select
                        value={namingForm.docType}
                        onChange={e => setNamingForm({ ...namingForm, docType: e.target.value })}
                        className="w-full bg-slate-950 border border-rose-500/60 rounded-lg px-2.5 py-2 text-xs text-rose-300 font-bold"
                      >
                        {TAXONOMY_3D.legalGroups.map(item => (
                          <option key={item.code} value={item.code}>
                            {item.code} — {item.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">3. [Cơ Quan]</label>
                      <select
                        value={namingForm.issuer}
                        onChange={e => setNamingForm({ ...namingForm, issuer: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white"
                      >
                        {TAXONOMY_3D.issuers.map(item => (
                          <option key={item.code} value={item.code}>
                            {item.code} — {item.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">4. [Số_Hiệu]</label>
                      <input
                        type="text"
                        value={namingForm.rawNumber}
                        onChange={e => setNamingForm({ ...namingForm, rawNumber: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">5. [Năm] (YYYY)</label>
                      <input
                        type="text"
                        maxLength={4}
                        value={namingForm.year}
                        onChange={e => setNamingForm({ ...namingForm, year: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white font-mono tabular-nums"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-amber-400 font-bold mb-1">
                        6. [Lĩnh_Vực Chức năng]
                      </label>
                      <select
                        value={namingForm.primaryDomain}
                        onChange={e =>
                          setNamingForm({ ...namingForm, primaryDomain: e.target.value as FunctionalDomainCode })
                        }
                        className="w-full bg-slate-950 border border-amber-500 rounded-lg px-2.5 py-2 text-xs text-amber-300 font-bold"
                      >
                        {TAXONOMY_3D.functionalDomains.map(item => (
                          <option key={item.code} value={item.code}>
                            {item.code} — {item.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-8">
                      <label className="block text-[11px] text-slate-400 mb-1">
                        7. [Trích_Yếu] (Chuyển PascalCase tự động)
                      </label>
                      <input
                        type="text"
                        value={namingForm.rawSummary}
                        onChange={e => setNamingForm({ ...namingForm, rawSummary: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white"
                      />
                    </div>
                    <div className="md:col-span-4">
                      <label className="block text-[11px] text-slate-400 mb-1">8. [Hậu tố Phụ lục/Phần]</label>
                      <input
                        type="text"
                        value={namingForm.appendixSuffix}
                        onChange={e => setNamingForm({ ...namingForm, appendixSuffix: e.target.value })}
                        placeholder="VD: PL01, PLIIa, KY"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* TRỤC 2 (NHÓM DỰ ÁN) & TRỤC 3 (NHÓM CHỨC NĂNG) */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-sky-400 mb-2">
                      TRỤC 2 (NHÓM DỰ ÁN ÁP DỤNG): Hạ tầng kỹ thuật · Dân dụng · KCN · CCN · FTZ · PPP/BT
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {TAXONOMY_3D.projectTypes.map(pt => {
                        const active = namingForm.projectAxes.includes(pt.code);
                        return (
                          <button
                            key={pt.code}
                            type="button"
                            onClick={() => toggleProjectAxis(pt.code)}
                            className={`p-2.5 rounded-lg border text-left transition flex items-start justify-between gap-2 ${
                              active
                                ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <div className="text-xs">
                              <div className="font-bold font-mono text-white">
                                {active ? '✓ ' : '+ '}[{pt.code}]
                              </div>
                              <div className="text-[11px] mt-0.5">{pt.name}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800">
                    <label className="block text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
                      TRỤC 3 (NHÓM CHỨC NĂNG NGHIỆP VỤ): QLCL · HDXD · QLHD · QLCP · VLXD · TCVN · QCVN
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {TAXONOMY_3D.functionalDomains.map(d => {
                        const active = namingForm.secondaryDomains.includes(d.code);
                        return (
                          <button
                            key={d.code}
                            type="button"
                            onClick={() => toggleSecondaryDomain(d.code)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
                              active
                                ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            {active ? '✓ ' : '+ '}
                            <b>{d.code}</b> ({d.name})
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800">
                    <label className="block text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">
                      ÁNH XẠ TỰ ĐỘNG SANG STAGE-GATE (BƯỚC 3) & QUY TRÌNH QA/QC (BƯỚC 4):
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {gates.map(g => {
                        const active = namingForm.linkedGates.includes(g.gate);
                        return (
                          <button
                            key={g.gate}
                            type="button"
                            onClick={() => toggleLinkedGate(g.gate)}
                            className={`px-2.5 py-1 rounded text-xs font-mono border transition ${
                              active
                                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                                : 'bg-slate-950 border-slate-800 text-slate-400'
                            }`}
                          >
                            {active ? '✓ ' : ''}
                            {g.gate}: {g.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Thanh kéo co giãn 2 cột Bước 1 */}
              {renderVerticalSplitter({
                id: 'STEP1_SPLIT',
                onDoubleClickReset: () => {
                  setStep1LeftPct(56);
                  showToast('Đã đặt lại tỷ lệ 2 cột Bước 1 (56% : 44%)');
                },
                label: `${Math.round(step1LeftPct)}% : ${Math.round(100 - step1LeftPct)}%`,
              })}

              {/* Cột Phải: Trình Đọc File Chuyên sâu (4 vùng OCR V1-V4) + Cây Chương-Mục-Điều + Nhật ký Hoàn tác LOG_DOITEN */}
              <div className="flex-1 min-w-[280px] p-4 bg-slate-900/30 overflow-y-auto space-y-3.5">
                {/* Thanh chuyển đổi 3 chế độ ở Cột Phải Bước 1 */}
                <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setStep1RightSubTab('OCR_READER')}
                    className={`py-2 px-2 rounded-lg font-semibold transition truncate ${
                      step1RightSubTab === 'OCR_READER'
                        ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    👁️ Đọc File & 4 Vùng OCR
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep1RightSubTab('AST_CHAPTERS')}
                    className={`py-2 px-2 rounded-lg font-semibold transition truncate ${
                      step1RightSubTab === 'AST_CHAPTERS'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🌳 Chương-Mục-Điều ({parsedPreviewNodes.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep1RightSubTab('RENAME_LOG')}
                    className={`py-2 px-2 rounded-lg font-semibold transition truncate ${
                      step1RightSubTab === 'RENAME_LOG'
                        ? 'bg-sky-500 text-slate-950 font-bold shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    📜 Nhật ký Hoàn tác ({renameLogs.length})
                  </button>
                </div>

                {/* TAB PHẢI 1: TRÌNH ĐỌC FILE & BÓC TÁCH 4 VÙNG TỌA ĐỘ OCR (V1..V4) */}
                {step1RightSubTab === 'OCR_READER' && (
                  <div className="space-y-3.5">
                    {/* 4 Vùng Tọa độ OCR (CFG_OCR V1..V4) */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase text-amber-400">
                          🎯 BÓC TÁCH TỰ ĐỘNG 4 VÙNG TỌA ĐỘ VĂN BẢN (CFG_OCR V1–V4)
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold">
                          Độ tin cậy OCR: {currentOcrZones.confidence}%
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                          <div className="text-[10px] font-mono text-sky-400">
                            [V1] CƠ QUAN BAN HÀNH (Góc trên trái):
                          </div>
                          <div className="font-semibold text-white truncate mt-0.5">
                            {currentOcrZones.v1Issuer}
                          </div>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                          <div className="text-[10px] font-mono text-rose-400">
                            [V2] SỐ HIỆU & NGÀY BAN HÀNH (Góc trên phải):
                          </div>
                          <div className="font-semibold text-white truncate mt-0.5">
                            {currentOcrZones.v2NumberDate}
                          </div>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 sm:col-span-2">
                          <div className="text-[10px] font-mono text-amber-400">
                            [V3] TÊN LOẠI & TRÍCH YẾU NỘI DUNG (Vùng trung tâm):
                          </div>
                          <div className="font-semibold text-emerald-300 line-clamp-2 mt-0.5">
                            {currentOcrZones.v3TitleSummary}
                          </div>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 sm:col-span-2">
                          <div className="text-[10px] font-mono text-purple-400">
                            [V4] THẨM QUYỀN KÝ, DẤU ĐỎ & HIỆU LỰC (Chân văn bản):
                          </div>
                          <div className="text-slate-200 truncate mt-0.5">
                            {currentOcrZones.v4SignerValidity}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Khung đọc nội dung văn bản & Tìm kiếm từ khóa trong file */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-xs font-bold uppercase text-emerald-400">
                          BƯỚC 1.2 — Trình Đọc Nội Dung File & Bóc Tách Điều Khoản
                        </h3>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={readerKeywordSearch}
                            onChange={e => setReaderKeywordSearch(e.target.value)}
                            placeholder="Tìm trong nội dung file..."
                            className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[11px] text-white"
                          />
                          <span className="text-[10px] font-mono text-slate-400">
                            {namingForm.rawContentToParse.split('\n').length} dòng
                          </span>
                        </div>
                      </div>

                      {readerKeywordSearch.trim() && (
                        <div className="px-2.5 py-1.5 rounded bg-amber-500/15 border border-amber-500/30 text-[11px] text-amber-200">
                          🔍 Tìm thấy{' '}
                          <b>
                            {
                              namingForm.rawContentToParse
                                .toLowerCase()
                                .split(readerKeywordSearch.trim().toLowerCase()).length - 1
                            }
                          </b>{' '}
                          vị trí khớp từ khóa <b>"{readerKeywordSearch}"</b> trong văn bản đang đọc.
                        </div>
                      )}

                      <textarea
                        rows={10}
                        value={namingForm.rawContentToParse}
                        onChange={e =>
                          setNamingForm({ ...namingForm, rawContentToParse: e.target.value })
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 font-mono leading-relaxed focus:outline-none focus:border-emerald-500"
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            handleSaveToSSOT();
                            setActiveTab('STEP2_VBPL');
                          }}
                          className="py-2.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition whitespace-nowrap"
                        >
                          Lưu & Chuyển sang Bước 2 (VBPL)
                        </button>
                        <button
                          onClick={() => {
                            handleSaveToSSOT();
                            setActiveTab('STEP3_PLAN');
                          }}
                          className="py-2.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition whitespace-nowrap"
                        >
                          Lưu & Chuyển sang Bước 3 (Stage-Gate)
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB PHẢI 2: CÂY CẤU TRÚC CHƯƠNG - MỤC - ĐIỀU BÓC TÁCH TỰ ĐỘNG */}
                {step1RightSubTab === 'AST_CHAPTERS' && (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-amber-400">
                        🌳 CÂY CẤU TRÚC CHƯƠNG · MỤC · ĐIỀU BÓC TÁCH TỪ FILE ({parsedPreviewNodes.length} MỤC)
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400">AST Ready</span>
                    </div>
                    <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
                      {parsedPreviewNodes.map(node => (
                        <div
                          key={node.id}
                          className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold ${
                                node.level === 'Chương'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                              }`}
                            >
                              {node.level}: {node.code}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {node.clauseCount} khoản/điểm
                            </span>
                          </div>
                          {node.title && (
                            <div className="text-xs font-bold text-white">{node.title}</div>
                          )}
                          {node.content && (
                            <div className="text-[11px] text-slate-300 whitespace-pre-line">
                              {node.content}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB PHẢI 3: NHẬT KÝ ĐỔI TÊN & HOÀN TÁC (LOG_DOITEN) */}
                {step1RightSubTab === 'RENAME_LOG' && (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-sky-400">
                        📜 NHẬT KÝ ĐỔI TÊN FILE / FOLDER & HOÀN TÁC (LOG_DOITEN)
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        SHA-256 Checksum Verified
                      </span>
                    </div>
                    <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                      {renameLogs.map(log => (
                        <div
                          key={log.logId}
                          className={`p-2.5 rounded-lg border text-xs space-y-1 ${
                            log.isReverted
                              ? 'bg-slate-950/50 border-slate-800 opacity-60'
                              : 'bg-slate-950 border-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 font-mono text-[10px]">
                            <span className="text-amber-300 font-bold">
                              {log.logId} · [{log.itemKind}] · {log.qlvbGroup} ·{' '}
                              <span className="text-sky-300">CDE {log.cdeStatus || 'S0'}</span>
                            </span>
                            <span className="text-slate-400">{log.timestamp}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            Tên cũ: <span className="text-slate-200">{log.oldName}</span>
                          </div>
                          <div className="text-[11px] font-mono text-emerald-400 truncate">
                            Tên mới: {log.newName}
                          </div>
                          <div className="text-[10px] font-mono text-sky-300 truncate">
                            Folder: {log.oldFolderPath} → {log.newFolderPath}
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px] font-mono">
                            <span className="text-slate-400">
                              SHA256: {log.sha256Before} · Bởi: {log.actorName}
                            </span>
                            {log.isReverted ? (
                              <span className="text-rose-400 font-bold">Đã hoàn tác</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleUndoRenameLog(log)}
                                className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold"
                              >
                                ↩️ Hoàn tác tên cũ
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Preview JSON Tọa độ 3 Trục */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase text-slate-300">
                      Siêu dữ liệu Tọa độ 3 Trục (3D Metadata SSOT)
                    </h4>
                    <span className="text-[11px] font-mono text-amber-400">REG_Master Ready</span>
                  </div>
                  <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-[11px] font-mono text-sky-300 overflow-x-auto">
                    {JSON.stringify(
                      {
                        ssot_file_name: generatedFileName,
                        naming_standard: batchNamingStandard,
                        folder_preset: folderNamingPreset,
                        axis_1_legal_group: namingForm.docType,
                        axis_2_project_types: namingForm.projectAxes,
                        axis_3_functional_domains: namingForm.secondaryDomains,
                        generated_stage_gates: namingForm.linkedGates,
                        generated_qaqc_flows: namingForm.linkedQAQC,
                        actor_rbac: `${currentActor.fullName} (${currentActor.rbacRole})`,
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>
              </div>
            </div>
          )}
    </>
  );
};
