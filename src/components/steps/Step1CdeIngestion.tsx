import React, { useEffect, useMemo, useRef, useState } from "react";
import { TAXONOMY_3D, LEGAL_CATEGORY_TREE } from "../../data/lexPmoData";
import { createRealDataLegalBatchItems } from "../../data/realDataLegal2026Batch";
import { SecureDocumentViewerModal } from "../SecureDocumentViewerModal";
import {
  AnalyzedFileItem,
  ApprovalWorkflowItem,
  CdeIsoStatus,
  FolderNamingPresetCode,
  FunctionalDomainCode,
  GateWorkflowStatus,
  LegalDocument,
  LegalNode,
  ProjectArchetypeCode,
  QaQcGateControlItem,
  QlvbNamingGroupCode,
  SmartTagCategory,
  SmartTagItem,
  StageGateItem,
} from "../../types/lexPmoTypes";
import { CDE_ISO_19650_META, CDE_ISO_19650_PIPELINE } from "../../utils/rbacRaciHelpers";
import {
  buildAutoSuggestedTags,
  buildFileNameByRule,
  buildStandardFolderPath,
  cleanDocNumber,
  computeSha256Short,
  createSampleBatchItems,
  detectQlvbGroup,
  extractOcrZonesFromText,
  inferSubSectorFromDomain,
  normalizeDomainForFilename,
  normalizeIssuerCode,
  normalizeSsotDocType,
  parseRawTagInput,
  parseVietnameseLegalText,
  resolveDocTaxonomyFromTags,
  smartAnalyzeFile3D,
  SMART_TAG_DOMAIN_CODES,
  SMART_TAG_INDUSTRY_OPTIONS,
  SMART_TAG_PROJECT_AXES,
  SMART_TAG_STAGE_GATES,
  SMART_TAG_SUB_SECTOR_OPTIONS,
  SSOT_FILENAME_RULE_RE,
  stripRedundantSummaryPrefix,
  syncSuggestionWithSmartTags,
  toPascalCaseVN,
} from "../../utils/legalParser";
import type { StepContextType } from "../../App";

const VALID_PROJECT_AXES: ProjectArchetypeCode[] = [
  "HTKT",
  "DAN_DUNG",
  "KCN",
  "CCN",
  "FTZ",
  "PPP_BT",
];

const VALID_DOMAINS: FunctionalDomainCode[] = [
  "QLCL",
  "HDXD",
  "QLHD",
  "QLCP",
  "VLXD",
  "TCVN",
  "QCVN",
  "DTH",
  "TQT",
  "PCCC",
  "QHDD",
  "ATLD",
  "DTU",
];

const VALID_CDE_STATUSES: CdeIsoStatus[] = ["S0", "S1", "A1", "B1"];

const VALID_GATE_STATUSES: GateWorkflowStatus[] = [
  "DRAFT",
  "IN_REVIEW",
  "APPROVED",
  "HARD_STOP_BLOCKED",
];

const CSV_TEMPLATES = [
  {
    id: "vbpl",
    label: "Danh mục VBPL 3 Trục",
    desc: "Nạp văn bản pháp luật, QCVN/TCVN & phân loại 3 Trục sang Bước 2",
    fileName: "mau_danh_muc_vbpl_3truc.csv",
    href: "/templates/mau_danh_muc_vbpl_3truc.csv",
  },
  {
    id: "stage_gate",
    label: "Stage-Gate Dự án (G0–G15)",
    desc: "Cập nhật tiến độ Gate, RACI, tài chính IPC & checklist sang Bước 3",
    fileName: "mau_stage_gate_du_an.csv",
    href: "/templates/mau_stage_gate_du_an.csv",
  },
  {
    id: "contract_itp",
    label: "Hợp đồng, VLXD & ITP",
    desc: "Nạp kiểm soát ITP, LAS-XD, CO/CQ và tờ trình VO sang Bước 3 & 4",
    fileName: "mau_hop_dong_itp.csv",
    href: "/templates/mau_hop_dong_itp.csv",
  },
] as const;

type CsvSchemaKind = "VBPL_3TRUC" | "STAGE_GATE" | "CONTRACT_ITP" | "GENERIC_CSV";
type AdvancedDrawerTab = "OCR_JSON" | "NAMING_8PART" | "BATCH_TOOLS";

interface CsvImportSummary {
  fileName: string;
  schemaKind: CsvSchemaKind;
  schemaLabel: string;
  docsCount: number;
  gatesCount: number;
  qaqcCount: number;
  workflowCount: number;
  queueCount: number;
  importedAt: string;
}

interface ConfirmBannerSummary {
  docsCount: number;
  foldersCount: number;
  gatesList: string[];
  committedAt: string;
}

/**
 * Parse RFC-4180 UTF-8 CSV content (stripping UTF-8 BOM if present) into normalized headers and row objects.
 */
function parseCsvContent(rawText: string): {
  headers: string[];
  rows: Record<string, string>[];
} {
  const cleanText = rawText.replace(/^\uFEFF/, "");
  const records: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const ch = cleanText[i];
    if (ch === '"') {
      if (inQuotes && cleanText[i + 1] === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = "";
    } else if ((ch === "\r" || ch === "\n") && !inQuotes) {
      if (ch === "\r" && cleanText[i + 1] === "\n") {
        i++;
      }
      currentRow.push(currentField.trim());
      if (currentRow.some(cell => cell.length > 0)) {
        records.push(currentRow);
      }
      currentRow = [];
      currentField = "";
    } else {
      currentField += ch;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(cell => cell.length > 0)) {
      records.push(currentRow);
    }
  }

  if (records.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = records[0].map(h => h.replace(/^\uFEFF/, "").trim().toLowerCase());
  const rows = records.slice(1).map(cols => {
    const rowObj: Record<string, string> = {};
    headers.forEach((header, idx) => {
      if (header) {
        rowObj[header] = (cols[idx] || "").trim();
      }
    });
    return rowObj;
  });

  return { headers, rows };
}

function parseListField(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[;,|]/)
    .map(s => s.trim())
    .filter(Boolean);
}

function safeParseDomain(raw: string | undefined, fallback: FunctionalDomainCode): FunctionalDomainCode {
  const upper = (raw || "").trim().toUpperCase() as FunctionalDomainCode;
  return VALID_DOMAINS.includes(upper) ? upper : fallback;
}

function safeParseProjectAxes(
  raw: string | undefined,
  fallback: ProjectArchetypeCode[]
): ProjectArchetypeCode[] {
  const parsed = parseListField(raw)
    .map(v => v.toUpperCase() as ProjectArchetypeCode)
    .filter(v => VALID_PROJECT_AXES.includes(v));
  return parsed.length > 0 ? Array.from(new Set(parsed)) : fallback;
}

function safeParseCdeStatus(raw: string | undefined, fallback: CdeIsoStatus): CdeIsoStatus {
  const upper = (raw || "").trim().toUpperCase() as CdeIsoStatus;
  return VALID_CDE_STATUSES.includes(upper) ? upper : fallback;
}

function safeParseGateStatus(
  raw: string | undefined,
  fallback: GateWorkflowStatus
): GateWorkflowStatus {
  const upper = (raw || "").trim().toUpperCase() as GateWorkflowStatus;
  return VALID_GATE_STATUSES.includes(upper) ? upper : fallback;
}

function parseNumericVnd(raw: string | undefined, fallback = 0): number {
  if (!raw) return fallback;
  const cleaned = raw.replace(/[^\d.-]/g, "");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : fallback;
}

function inferIndustryAndSubSector(
  primaryDomain: FunctionalDomainCode,
  requestedGroupId?: string,
  requestedSubCode?: string
): { industryGroupId: string; subSectorCode: string; subSectorLabel: string } {
  if (requestedGroupId) {
    const matchedGroup = LEGAL_CATEGORY_TREE.find(g => g.id === requestedGroupId);
    if (matchedGroup) {
      const matchedSub =
        matchedGroup.children.find(c => c.code === requestedSubCode) || matchedGroup.children[0];
      return {
        industryGroupId: matchedGroup.id,
        subSectorCode: matchedSub?.code || requestedSubCode || "XD_XAYDUNG",
        subSectorLabel: matchedSub?.name || "Xây dựng",
      };
    }
  }
  const inferred = inferSubSectorFromDomain(
    primaryDomain,
    undefined,
    requestedGroupId,
    requestedSubCode
  );
  return {
    industryGroupId: inferred.industryGroupId,
    subSectorCode: inferred.subSectorCode,
    subSectorLabel: inferred.subSectorLabel,
  };
}

function buildLegalNodesForImport(params: {
  docNumber: string;
  title: string;
  lineage: string;
  status: string;
  linkedGates: string[];
}): LegalNode[] {
  const sampleText = [
    `Số: ${params.docNumber}`,
    "Chương I. THÔNG TIN CHUNG & PHẠM VI ÁP DỤNG",
    `Điều 1. Trích yếu nội dung văn bản`,
    params.title,
    `Điều 2. Định hướng kiểm soát & Ánh xạ Stage-Gate (${params.linkedGates.join(", ") || "G12"})`,
    `${params.lineage || "Nạp trực tiếp từ dữ liệu CSV thực tế."}\nTrạng thái hiệu lực: ${params.status}`,
  ].join("\n");
  return parseVietnameseLegalText(sampleText);
}

/**
 * Upsert incoming LegalDocument records into existing list by matching ssotFileName or docNumber.
 */
function mergeLegalDocs(prev: LegalDocument[], incoming: LegalDocument[]): LegalDocument[] {
  const next = [...prev];
  for (let i = incoming.length - 1; i >= 0; i--) {
    const doc = incoming[i];
    const existingIdx = next.findIndex(
      d =>
        d.ssotFileName.toLowerCase() === doc.ssotFileName.toLowerCase() ||
        (doc.docNumber && d.docNumber.toLowerCase() === doc.docNumber.toLowerCase() && doc.docNumber !== "01")
    );
    if (existingIdx >= 0) {
      next[existingIdx] = { ...next[existingIdx], ...doc, id: next[existingIdx].id };
    } else {
      next.unshift(doc);
    }
  }
  return next;
}

export interface Step1CdeIngestionProps {
  ctx: StepContextType;
}

export const Step1CdeIngestion: React.FC<Step1CdeIngestionProps> = ({ ctx }) => {
  const {
    activeTab,
    setActiveTab,
    activeProjectArchetype,
    setActiveProjectArchetype,
    activeProjectName,
    currentActor,
    gates,
    setGates,
    setProjectGateStatusMap,
    setLegalDocs,
    setQaqcControlRecords,
    setApprovalWorkflows,
    setVoState,
    setSelectedDocId,
    setExpandedInlineDocId,
    setVbplIndustryGroupFilter,
    setVbplSubSectorFilter,
    setVbplDomainFilter,
    setVbplProjectFilter,
    setPane2SubTab,
    setFilterDocType,
    setFilterValidityPeriod,
    setRecentDocIds,
    setSelectedGateCode,
    showToast,
    recordAuditLog,
    isDragging,
    setIsDragging,
    isAnalyzingFile,
    deepScanReadMode,
    setDeepScanReadMode,
    batchNamingStandard,
    folderNamingPreset,
    batchFilterKind,
    setBatchFilterKind,
    batchFilterCde,
    setBatchFilterCde,
    batchFindText,
    setBatchFindText,
    batchReplaceText,
    setBatchReplaceText,
    batchSuffixInput,
    setBatchSuffixInput,
    activeBatchItemId,
    setActiveBatchItemId,
    readerKeywordSearch,
    setReaderKeywordSearch,
    droppedFilesQueue,
    setDroppedFilesQueue,
    renameLogs,
    activeRawFile,
    setActiveRawFile,
    fileInputRef,
    folderInputRef,
    namingForm,
    setNamingForm,
    generatedFileName,
    currentOcrZones,
    parsedPreviewNodes,
    validatedBatchQueue,
    duplicateHashItems,
    filteredBatchQueue,
    toggleProjectAxis,
    toggleSecondaryDomain,
    toggleLinkedGate,
    handleProcessFiles,
    handleChangeCdeStatus,
    handleDuplicateSha256Action,
    handleRecomputeBatchNames,
    handleBatchFindReplaceAndFormat,
    handleCommitBatchRename,
    handleUndoRenameLog,
    handleExportBatchRenameArtifact,
    handleDownloadRenamedFile,
    handleSaveToSSOT,
    hybridHealth,
    batchOperationMode,
    setBatchOperationMode,
    lastPersistenceSource,
    handleScanLocalFolderToQueue,
  } = ctx;

  // Local Progressive Disclosure UI state (Drawer/Accordion mặc định ĐÓNG)
  const [isAdvancedDrawerOpen, setIsAdvancedDrawerOpen] = useState(false);
  const [isSecurePdfOpen, setIsSecurePdfOpen] = useState(false);
  const [securePdfTarget, setSecurePdfTarget] = useState<{
    fileName: string;
    docTitle?: string;
    docNumber?: string;
    folderName?: string;
    viewerMode?: "AUTO" | "PDF" | "WORD" | "FOLDER_FORMS";
  }>({ fileName: "" });
  const [localFolderInput, setLocalFolderInput] = useState<string>("");
  const [localScanRecursive, setLocalScanRecursive] = useState<boolean>(true);
  const [advancedTab, setAdvancedTab] = useState<AdvancedDrawerTab>("BATCH_TOOLS");
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);
  const [isImportingCsv, setIsImportingCsv] = useState(false);
  const [csvImportResult, setCsvImportResult] = useState<CsvImportSummary | null>(null);
  const [confirmBannerResult, setConfirmBannerResult] = useState<ConfirmBannerSummary | null>(null);
  const [tagPickerRowId, setTagPickerRowId] = useState<string | null>(null);
  const [drawerTagPickerOpen, setDrawerTagPickerOpen] = useState<boolean>(false);
  const [newTagDraft, setNewTagDraft] = useState<string>("");
  const [editingTagRef, setEditingTagRef] = useState<{ itemId: string; tagId: string } | null>(
    null
  );
  const [editingTagDraft, setEditingTagDraft] = useState<string>("");

  const csvInputRef = useRef<HTMLInputElement | null>(null);
  const templateMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isTemplateMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (templateMenuRef.current && !templateMenuRef.current.contains(e.target as Node)) {
        setIsTemplateMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [isTemplateMenuOpen]);

  useEffect(() => {
    if (!isAdvancedDrawerOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsAdvancedDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isAdvancedDrawerOpen]);

  // Derived metrics for Confirmation Bar & Table
  const selectedItems = useMemo(
    () => validatedBatchQueue.filter(item => item.selected !== false),
    [validatedBatchQueue]
  );

  const selectedFileCount = useMemo(
    () => selectedItems.filter(item => item.itemKind !== "FOLDER").length,
    [selectedItems]
  );

  const selectedFolderCount = useMemo(
    () => selectedItems.filter(item => item.itemKind === "FOLDER").length,
    [selectedItems]
  );

  const invalidSelectedItems = useMemo(
    () => selectedItems.filter(item => item.validationStatus !== "OK"),
    [selectedItems]
  );

  const selectedLinkedGates = useMemo(() => {
    const set = new Set<string>();
    selectedItems.forEach(item => {
      (item.suggestion.linkedGates || []).forEach(g => set.add(g));
    });
    return Array.from(set).sort((a, b) => {
      const na = parseInt(a.replace(/\D/g, ""), 10) || 0;
      const nb = parseInt(b.replace(/\D/g, ""), 10) || 0;
      return na - nb;
    });
  }, [selectedItems]);

  const allQueueSelected =
    droppedFilesQueue.length > 0 && droppedFilesQueue.every(i => i.selected !== false);

  const activeBatchItem = useMemo(
    () => validatedBatchQueue.find(i => i.id === activeBatchItemId) || null,
    [validatedBatchQueue, activeBatchItemId]
  );

  const normalizedFormDocType = normalizeSsotDocType(namingForm.docType);
  const formCleanedNumber = cleanDocNumber(namingForm.rawNumber, namingForm.year);
  const formStrippedSummary = stripRedundantSummaryPrefix(namingForm.rawSummary);
  const formSummaryPascal = toPascalCaseVN(namingForm.rawSummary, 40);

  const getItemSmartTags = (item: AnalyzedFileItem): SmartTagItem[] =>
    item.smartTags !== undefined
      ? item.smartTags
      : buildAutoSuggestedTags(
          item.suggestion,
          activeProjectArchetype,
          item.isCommitted ? "CONFIRMED" : "SUGGESTED"
        );

  const updateRowSmartTags = (
    itemId: string,
    updater: (tags: SmartTagItem[], item: AnalyzedFileItem) => SmartTagItem[]
  ) => {
    const targetItem = droppedFilesQueue.find(i => i.id === itemId);
    if (!targetItem) return;
    const currentTags = getItemSmartTags(targetItem);
    const nextTags = updater(currentTags, targetItem);
    const syncedSuggestion = syncSuggestionWithSmartTags(targetItem.suggestion, nextTags);

    setDroppedFilesQueue(prev =>
      prev.map(item =>
        item.id === itemId
          ? {
              ...item,
              smartTags: nextTags,
              suggestion: syncedSuggestion,
            }
          : item
      )
    );

    if (itemId === activeBatchItemId) {
      setNamingForm(prev => ({
        ...prev,
        industry: syncedSuggestion.industry,
        projectAxes: syncedSuggestion.projectAxes,
        secondaryDomains: syncedSuggestion.secondaryDomains,
        linkedGates: syncedSuggestion.linkedGates,
      }));
    }
  };

  const handleApproveSmartTag = (itemId: string, tagId: string) => {
    updateRowSmartTags(itemId, tags =>
      tags.map(t => (t.id === tagId ? { ...t, status: "CONFIRMED" as const } : t))
    );
  };

  const handleApproveAllRowTags = (itemId: string) => {
    updateRowSmartTags(itemId, tags => tags.map(t => ({ ...t, status: "CONFIRMED" as const })));
    showToast("Đã duyệt toàn bộ Smart Tags gợi ý thành nhãn chính thức!");
  };

  const handleRemoveSmartTag = (itemId: string, tagId: string) => {
    updateRowSmartTags(itemId, tags => tags.filter(t => t.id !== tagId));
  };

  const handleAddSmartTag = (
    itemId: string,
    rawOrPreset: string | { category: SmartTagCategory; code: string; label: string }
  ) => {
    const parsed =
      typeof rawOrPreset === "string" ? parseRawTagInput(rawOrPreset) : rawOrPreset;
    if (!parsed.label.trim()) return;

    updateRowSmartTags(itemId, tags => {
      const existingIdx = tags.findIndex(
        t =>
          t.category === parsed.category &&
          t.code.toUpperCase() === parsed.code.toUpperCase()
      );
      if (existingIdx >= 0) {
        return tags.map((t, idx) =>
          idx === existingIdx ? { ...t, status: "CONFIRMED" as const } : t
        );
      }
      const nextTag: SmartTagItem = {
        id: `TAG-${parsed.category}-${Date.now().toString(36)}-${tags.length + 1}`,
        category: parsed.category,
        code: parsed.code,
        label: parsed.label,
        status: "CONFIRMED",
      };
      return [...tags, nextTag];
    });
  };

  const handleStartEditTag = (itemId: string, tag: SmartTagItem) => {
    setEditingTagRef({ itemId, tagId: tag.id });
    setEditingTagDraft(tag.label);
  };

  const handleCommitEditTag = (itemId: string, tagId: string) => {
    const trimmed = editingTagDraft.trim();
    setEditingTagRef(null);
    if (!trimmed) return;
    const parsed = parseRawTagInput(trimmed);
    updateRowSmartTags(itemId, tags =>
      tags.map(t =>
        t.id === tagId
          ? {
              ...t,
              category: parsed.category,
              code: parsed.code,
              label: parsed.label,
              status: "CONFIRMED" as const,
            }
          : t
      )
    );
  };

  const getTagColorClasses = (category: SmartTagCategory, isSuggested: boolean): string => {
    const borderStyle = isSuggested ? "border-dashed" : "border-solid";
    switch (category) {
      case "INDUSTRY":
        return `${borderStyle} bg-indigo-500/15 border-indigo-400/60 text-indigo-900 dark:text-indigo-200`;
      case "SUB_SECTOR":
        return `${borderStyle} bg-cyan-500/15 border-cyan-400/60 text-cyan-900 dark:text-cyan-200`;
      case "DOMAIN":
        return `${borderStyle} bg-amber-500/15 border-amber-400/60 text-amber-900 dark:text-amber-200`;
      case "PROJECT_AXIS":
        return `${borderStyle} bg-sky-500/15 border-sky-400/60 text-sky-900 dark:text-sky-200`;
      case "STAGE_GATE":
        return `${borderStyle} bg-emerald-500/15 border-emerald-400/60 text-emerald-900 dark:text-emerald-200 font-mono`;
      default:
        return `${borderStyle} bg-purple-500/15 border-purple-400/60 text-purple-900 dark:text-purple-200`;
    }
  };

  const renderTagPickerPanel = (item: AnalyzedFileItem, onClose: () => void) => (
    <div
      onClick={e => e.stopPropagation()}
      className="mt-2 p-2.5 rounded-xl bg-[var(--giay)] border border-[var(--line-d)] shadow-2xl space-y-2 text-[11px]"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-amber-800 dark:text-amber-300">🏷️ Thêm nhanh hoặc nhập Tag tùy chỉnh</span>
        <button
          type="button"
          onClick={onClose}
          className="text-[var(--chu-m)] hover:text-[var(--chu)] px-1.5 py-0.5 rounded bg-[var(--panel)] cursor-pointer"
          aria-label="Đóng bảng chọn tag"
        >
          ✕
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={newTagDraft}
          onChange={e => setNewTagDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && newTagDraft.trim()) {
              e.preventDefault();
              handleAddSmartTag(item.id, newTagDraft);
              setNewTagDraft("");
            }
          }}
          placeholder="Nhập tag (VD: G14, KCN, XD_DAUTHAU, Gói XL-01)..."
          className="flex-1 min-w-[140px] bg-[var(--panel)] border border-[var(--line-d)] focus:border-amber-400 rounded-lg px-2 py-1 text-[11px] text-[var(--chu)] focus:outline-none"
        />
        <button
          type="button"
          onClick={() => {
            if (!newTagDraft.trim()) return;
            handleAddSmartTag(item.id, newTagDraft);
            setNewTagDraft("");
          }}
          className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] cursor-pointer shrink-0"
        >
          + Thêm
        </button>
      </div>

      <div className="space-y-1.5">
        <div>
          <div className="text-[10px] text-indigo-800 dark:text-indigo-300 font-semibold mb-1">Ngành:</div>
          <div className="flex flex-wrap gap-1">
            {SMART_TAG_INDUSTRY_OPTIONS.map(opt => (
              <button
                key={opt.code}
                type="button"
                onClick={() =>
                  handleAddSmartTag(item.id, {
                    category: "INDUSTRY",
                    code: opt.code,
                    label: opt.label,
                  })
                }
                className="px-1.5 py-0.5 rounded bg-indigo-500/15 hover:bg-indigo-500/30 border border-indigo-400/40 text-indigo-900 dark:text-indigo-200 text-[10px] cursor-pointer"
              >
                + {opt.code}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[10px] text-cyan-800 dark:text-cyan-300 font-semibold mb-1">Lĩnh vực con & Chức năng:</div>
          <div className="flex flex-wrap gap-1">
            {SMART_TAG_SUB_SECTOR_OPTIONS.slice(0, 6).map(opt => (
              <button
                key={opt.code}
                type="button"
                onClick={() =>
                  handleAddSmartTag(item.id, {
                    category: "SUB_SECTOR",
                    code: opt.code,
                    label: opt.label,
                  })
                }
                className="px-1.5 py-0.5 rounded bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-900 dark:text-cyan-200 text-[10px] cursor-pointer"
              >
                + {opt.subSectorLabel}
              </button>
            ))}
            {SMART_TAG_DOMAIN_CODES.slice(0, 8).map(dom => (
              <button
                key={dom}
                type="button"
                onClick={() =>
                  handleAddSmartTag(item.id, {
                    category: "DOMAIN",
                    code: dom,
                    label: `LV mở rộng: ${dom}`,
                  })
                }
                className="px-1.5 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/30 border border-amber-400/40 text-amber-900 dark:text-amber-200 text-[10px] cursor-pointer"
              >
                + {dom}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[10px] text-sky-800 dark:text-sky-300 font-semibold mb-1">Dự án / Loại hình DA:</div>
          <div className="flex flex-wrap gap-1">
            {SMART_TAG_PROJECT_AXES.map(ax => (
              <button
                key={ax}
                type="button"
                onClick={() =>
                  handleAddSmartTag(item.id, {
                    category: "PROJECT_AXIS",
                    code: ax,
                    label: `DA: ${ax}`,
                  })
                }
                className="px-1.5 py-0.5 rounded bg-sky-500/15 hover:bg-sky-500/30 border border-sky-400/40 text-sky-900 dark:text-sky-200 text-[10px] cursor-pointer"
              >
                + {ax}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[10px] text-emerald-800 dark:text-emerald-300 font-semibold mb-1">Stage-Gate (G0–G16):</div>
          <div className="flex flex-wrap gap-1">
            {SMART_TAG_STAGE_GATES.map(g => (
              <button
                key={g}
                type="button"
                onClick={() =>
                  handleAddSmartTag(item.id, {
                    category: "STAGE_GATE",
                    code: g,
                    label: `Gate ${g}`,
                  })
                }
                className="px-1.5 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-900 dark:text-emerald-200 font-mono text-[10px] cursor-pointer"
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderSmartTagsBlock = (item: AnalyzedFileItem, mode: "TABLE" | "DRAWER") => {
    const tags = getItemSmartTags(item);
    const suggestedCount = tags.filter(t => t.status === "SUGGESTED").length;
    const isPickerOpen = mode === "TABLE" ? tagPickerRowId === item.id : drawerTagPickerOpen;

    return (
      <div className="space-y-1.5" onClick={e => e.stopPropagation()}>
        <div className="flex flex-wrap items-center gap-1">
          {tags.map(tag => {
            const isSuggested = tag.status === "SUGGESTED";
            const isEditing =
              editingTagRef?.itemId === item.id && editingTagRef?.tagId === tag.id;
            const colorCls = getTagColorClasses(tag.category, isSuggested);

            return (
              <span
                key={tag.id}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] transition ${colorCls}`}
              >
                {isSuggested && (
                  <span
                    className="text-[9px] text-amber-800 dark:text-amber-300 font-semibold shrink-0"
                    title="Tag tự động gợi ý từ nội dung — bấm ✓ để chốt hoặc × để bỏ"
                  >
                    ✨ Gợi ý
                  </span>
                )}

                {isEditing ? (
                  <input
                    type="text"
                    autoFocus
                    value={editingTagDraft}
                    onChange={e => setEditingTagDraft(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleCommitEditTag(item.id, tag.id);
                      } else if (e.key === "Escape") {
                        setEditingTagRef(null);
                      }
                    }}
                    onBlur={() => handleCommitEditTag(item.id, tag.id)}
                    aria-label="Chỉnh sửa tên tag"
                    className="w-28 bg-[var(--giay)] border border-amber-400 rounded px-1 py-0 text-[10px] text-[var(--chu)] focus:outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => handleStartEditTag(item.id, tag)}
                    title="Bấm để chỉnh sửa tên tag trực tiếp"
                    className="text-left hover:underline cursor-text font-medium"
                  >
                    {tag.label}
                  </button>
                )}

                {isSuggested && !isEditing && (
                  <button
                    type="button"
                    onClick={() => handleApproveSmartTag(item.id, tag.id)}
                    title="Đồng ý chốt thành tag chính thức"
                    aria-label={`Đồng ý tag ${tag.label}`}
                    className="px-1 rounded bg-emerald-500/25 hover:bg-emerald-500 text-emerald-900 dark:text-emerald-200 hover:text-slate-950 font-bold text-[10px] leading-tight cursor-pointer"
                  >
                    ✓
                  </button>
                )}

                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => handleRemoveSmartTag(item.id, tag.id)}
                    title="Xóa tag"
                    aria-label={`Xóa tag ${tag.label}`}
                    className="px-0.5 rounded hover:bg-rose-500/30 text-[var(--chu-m)] hover:text-rose-900 dark:text-rose-200 font-bold text-[10px] leading-tight cursor-pointer"
                  >
                    ×
                  </button>
                )}
              </span>
            );
          })}

          <button
            type="button"
            onClick={() => {
              setNewTagDraft("");
              if (mode === "TABLE") {
                setTagPickerRowId(prev => (prev === item.id ? null : item.id));
              } else {
                setDrawerTagPickerOpen(prev => !prev);
              }
            }}
            className="px-1.5 py-0.5 rounded-md bg-[var(--giay-d)] hover:bg-[var(--giay-d)] border border-[var(--line-d)] text-sky-800 dark:text-sky-300 text-[10px] font-semibold cursor-pointer"
          >
            + Thêm Tag
          </button>

          {suggestedCount > 0 && (
            <button
              type="button"
              onClick={() => handleApproveAllRowTags(item.id)}
              title="Đồng ý tất cả tag gợi ý trên dòng này"
              className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-500/45 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold cursor-pointer"
            >
              ✓ Duyệt ({suggestedCount})
            </button>
          )}
        </div>

        {isPickerOpen &&
          renderTagPickerPanel(item, () => {
            if (mode === "TABLE") setTagPickerRowId(null);
            else setDrawerTagPickerOpen(false);
          })}
      </div>
    );
  };

  const renderSsotTwoLayerExamples = (compact = false) => (
    <div className="bg-[var(--giay)] border border-[var(--line)] rounded-xl p-3.5 space-y-2.5 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-400">
          📐 Quy Tắc Đặt Tên VBPL Thống Nhất 100% (PascalCase ≤ 40 ký tự · Smart Tags Gợi ý)
        </span>
        <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/35 text-emerald-800 dark:text-emerald-300 text-[10px] font-mono">
          {`${formCleanedNumber}-${namingForm.year}_${normalizedFormDocType}-${normalizeIssuerCode(
            namingForm.issuer,
            normalizedFormDocType
          )}_${normalizeDomainForFilename(namingForm.primaryDomain)}`}
        </span>
      </div>
      <div className={`grid grid-cols-1 ${compact ? "gap-2" : "md:grid-cols-2 gap-2.5"}`}>
        <div className="p-2.5 rounded-lg bg-[var(--panel)] border border-emerald-500/30 space-y-1">
          <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
            Công thức duy nhất áp dụng cho mọi cấp VBPL (Không ngoại lệ)
          </div>
          <div className="font-mono text-[10px] text-sky-800 dark:text-sky-300 break-all">
            [SốHiệu]-[Năm]_[LoạiVB]-[CơQuan]_[LĩnhVực]_[TríchYếuNgắn][-PhụLục].[ext]
          </div>
          <div className="text-[10px] text-[var(--chu-m)] pt-0.5 space-y-0.5">
            <div className="font-mono text-emerald-800 dark:text-emerald-400 break-all">
              Luật: 135-2025_LUAT-QH15_HDXD_LuatXayDung.pdf
            </div>
            <div className="font-mono text-emerald-800 dark:text-emerald-400/90 break-all">
              NĐ: 207-2026_ND-CP_QLCL_QuanLyChatLuongCongTrinh-PLIIa.pdf
            </div>
            <div className="font-mono text-emerald-800 dark:text-emerald-400/90 break-all">
              TT: 50-2022_TT-BTC_HDXD_BaoHiemTrongHoatDongXayDung.pdf
            </div>
            <div className="font-mono text-sky-800 dark:text-sky-300/90 break-all">
              VBHN: 05-2025_VBHN-BXD_HDXD_QuanLyDuAnDauTuXayDung.pdf
            </div>
            <div className="font-mono text-amber-800 dark:text-amber-300 break-all">
              QCVN: 06-2023_QCVN-BXD_PCCC_AnToanChayChoNhaVaCongTrinh.pdf
            </div>
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-[var(--panel)] border border-sky-500/30 space-y-1">
          <div className="text-[11px] font-bold text-sky-800 dark:text-sky-300">
            Thuộc tính mở rộng (Tách thành Smart Tags / Labels)
          </div>
          <div className="text-[10px] text-[var(--chu-m)] leading-relaxed">
            • <b>Ngành</b> (XD, BDS, TC, DN) &amp; <b>Lĩnh vực con</b> (XD_XAYDUNG, XD_DAUTHAU, DN_DTU...)
            <br />• <b>Mã Dự án / Loại hình DA</b> (KCN, HTKT, DAN_DUNG, CCN, FTZ, PPP_BT)
            <br />• <b>Stage-Gate G0–G16</b> (hiển thị ✨ Gợi ý viền đứt để duyệt ✓ / sửa / xóa ×)
          </div>
        </div>
      </div>
    </div>
  );

  const selectItemAndOpenDetails = (item: AnalyzedFileItem, openDrawer: boolean) => {
    setActiveBatchItemId(item.id);
    setActiveRawFile(item.rawFile);
    setNamingForm(prev => ({
      ...prev,
      ...item.suggestion,
      rawContentToParse: item.extractedText || prev.rawContentToParse,
    }));
    if (openDrawer) {
      setAdvancedTab("OCR_JSON");
      setIsAdvancedDrawerOpen(true);
    }
  };

  /**
   * Build a clean AnalyzedFileItem from a CSV row so it appears in Khối 2 review table.
   */
  const createQueueItemFromCsvRow = async (params: {
    index: number;
    originalName: string;
    proposedName: string;
    extractedText: string;
    primaryDomain: FunctionalDomainCode;
    secondaryDomains: FunctionalDomainCode[];
    projectAxes: ProjectArchetypeCode[];
    linkedGates: string[];
    linkedQAQC: string[];
    docType: string;
    issuer: string;
    industry: string;
    rawNumber: string;
    year: string;
    rawSummary: string;
    cdeStatus: CdeIsoStatus;
    sourceLabel: string;
  }): Promise<AnalyzedFileItem> => {
    const qlvbGroup: QlvbNamingGroupCode =
      batchNamingStandard === "SSOT_9PART"
        ? "SSOT_9PART"
        : detectQlvbGroup(params.docType, params.primaryDomain);

    const safeProposedName =
      params.proposedName &&
      params.proposedName.length <= 120 &&
      (qlvbGroup !== "SSOT_9PART" || SSOT_FILENAME_RULE_RE.test(params.proposedName))
        ? params.proposedName
        : buildFileNameByRule({
            group: qlvbGroup,
            industry: params.industry,
            docType: params.docType,
            issuer: params.issuer,
            rawNumber: params.rawNumber,
            year: params.year,
            primaryDomain: params.primaryDomain,
            rawSummary: params.rawSummary,
            appendixSuffix: "",
            ext: "pdf",
            projectCode: params.projectAxes[0] || activeProjectArchetype,
            gateCode: params.linkedGates[0],
            linkedGates: params.linkedGates,
          });

    const proposedFolderPath = buildStandardFolderPath({
      preset: folderNamingPreset,
      originalFolder: params.sourceLabel,
      projectCode: params.projectAxes[0] || activeProjectArchetype,
      primaryDomain: params.primaryDomain,
      gateCode: params.linkedGates[0] || "G12",
      year: params.year,
      qlvbGroup,
      industry: params.industry,
    });

    const sha256Hash = await computeSha256Short(
      `${params.index}|${params.originalName}|${safeProposedName}|${params.extractedText}`
    );

    const csvSmartTags = buildAutoSuggestedTags(
      {
        industry: params.industry,
        primaryDomain: params.primaryDomain,
        projectAxes: params.projectAxes,
        secondaryDomains: params.secondaryDomains,
        linkedGates: params.linkedGates,
      },
      activeProjectArchetype,
      "SUGGESTED"
    );

    return {
      id: `CSV-${Date.now().toString(36).toUpperCase()}-${params.index + 1}`,
      rawFile: null,
      itemKind: "FILE",
      originalName: params.originalName,
      originalFolderPath: params.sourceLabel,
      proposedFolderPath,
      extractedText: params.extractedText,
      suggestion: {
        industry: params.industry,
        docType: params.docType,
        issuer: params.issuer,
        rawNumber: params.rawNumber,
        year: params.year,
        primaryDomain: params.primaryDomain,
        rawSummary: params.rawSummary,
        appendixSuffix: "",
        ext: "pdf",
        projectAxes: params.projectAxes,
        secondaryDomains: params.secondaryDomains,
        linkedGates: params.linkedGates,
        linkedQAQC: params.linkedQAQC,
      },
      smartTags: csvSmartTags,
      proposedName: safeProposedName,
      qlvbGroup,
      cdeStatus: params.cdeStatus,
      sha256Hash,
      fileSizeLabel: "CSV Row",
      readStatsLabel: `CSV · ${params.sourceLabel}`,
      ocrZones: extractOcrZonesFromText(params.originalName, params.extractedText),
      selected: true,
      isCommitted: true,
    };
  };

  /**
   * Parse UTF-8 CSV data and dispatch real records into Step 1 queue, Step 2 (VBPL) & Step 3 (Stage-Gate).
   */
  const handleLiveCsvImport = async (rawText: string, fileName: string) => {
    setIsImportingCsv(true);
    try {
      const { headers, rows } = parseCsvContent(rawText);
      if (headers.length === 0 || rows.length === 0) {
        showToast("File CSV trống hoặc không đúng định dạng cột!");
        return;
      }

      const headerSet = new Set(headers);
      let schemaKind: CsvSchemaKind = "GENERIC_CSV";
      let schemaLabel = "Bảng dữ liệu CSV Tổng quát";

      if (
        headerSet.has("ssot_file_name") &&
        (headerSet.has("doc_number") || headerSet.has("industry_group_id"))
      ) {
        schemaKind = "VBPL_3TRUC";
        schemaLabel = "Danh mục VBPL 3 Trục";
      } else if (
        headerSet.has("gate_code") &&
        (headerSet.has("gate_name") || headerSet.has("step_code") || headerSet.has("gate_status"))
      ) {
        schemaKind = "STAGE_GATE";
        schemaLabel = "Tiến độ Stage-Gate Dự án";
      } else if (
        headerSet.has("record_id") &&
        (headerSet.has("record_kind") || headerSet.has("gate_ref"))
      ) {
        schemaKind = "CONTRACT_ITP";
        schemaLabel = "Hợp đồng, VLXD & ITP QA/QC";
      }

      const importedDocs: LegalDocument[] = [];
      const importedQueueItems: AnalyzedFileItem[] = [];
      let gatesUpdatedCount = 0;
      let qaqcUpdatedCount = 0;
      let workflowUpdatedCount = 0;
      let firstImportedGateCode: string | null = null;

      if (schemaKind === "VBPL_3TRUC") {
        for (let idx = 0; idx < rows.length; idx++) {
          const row = rows[idx];
          const rowGates = parseListField(row.linked_gates).map(g => g.toUpperCase());
          const ssotName =
            row.ssot_file_name ||
            buildFileNameByRule({
              group: "SSOT_9PART",
              industry: row.industry_code || "XD",
              docType: row.doc_type || "ND",
              issuer: row.issuer_code || "CP",
              rawNumber: row.doc_number || String(idx + 1),
              year: row.issue_year || "2026",
              primaryDomain: safeParseDomain(row.primary_domain, "QLCL"),
              rawSummary: row.title || `VanBan_${idx + 1}`,
              appendixSuffix: "",
              ext: "pdf",
              projectCode: activeProjectArchetype,
              linkedGates: rowGates,
            });
          const analyzed = smartAnalyzeFile3D(ssotName, `${row.title || ""}\n${row.lineage || ""}`);
          const primaryDomain = safeParseDomain(row.primary_domain, analyzed.primaryDomain);
          const secondaryDomainsRaw = parseListField(row.secondary_domains)
            .map(d => safeParseDomain(d, primaryDomain))
            .filter(Boolean);
          const secondaryDomains = Array.from(
            new Set<FunctionalDomainCode>([primaryDomain, ...secondaryDomainsRaw])
          );
          const projectAxes = safeParseProjectAxes(row.project_axes, analyzed.projectAxes);
          const linkedGates = parseListField(row.linked_gates).map(g => g.toUpperCase());
          const effectiveGates = linkedGates.length > 0 ? linkedGates : analyzed.linkedGates;
          const linkedQAQC = parseListField(row.linked_qaqc);
          const docNumber = row.doc_number || analyzed.rawNumber;
          const title = row.title || ssotName;
          const status = row.status || "Còn hiệu lực năm 2026";
          const lineage =
            row.lineage || `Nạp trực tiếp từ file CSV (${fileName}) — Dòng ${idx + 1}`;
          const { industryGroupId, subSectorCode, subSectorLabel } = inferIndustryAndSubSector(
            primaryDomain,
            row.industry_group_id,
            row.sub_sector_code
          );

          const nodes = buildLegalNodesForImport({
            docNumber,
            title,
            lineage,
            status,
            linkedGates: effectiveGates,
          });
          const csvIndustry = row.industry_code || analyzed.industry;
          const csvTags = buildAutoSuggestedTags(
            {
              industry: csvIndustry,
              primaryDomain,
              projectAxes,
              secondaryDomains,
              linkedGates: effectiveGates,
            },
            activeProjectArchetype,
            "CONFIRMED"
          );
          const csvTaxonomy = resolveDocTaxonomyFromTags(primaryDomain, csvIndustry, csvTags);

          const docObj: LegalDocument = {
            id: `DOC-CSV-${Date.now().toString(36).toUpperCase()}-${idx + 1}`,
            ssotFileName: ssotName,
            docNumber,
            docType: normalizeSsotDocType(row.doc_type || analyzed.docType),
            issuer: row.issuer_code || analyzed.issuer,
            year: row.issue_year || analyzed.year,
            issueDate: row.issue_date || `01/01/${row.issue_year || "2026"}`,
            effectiveDate: row.effective_date || `01/07/${row.issue_year || "2026"}`,
            industryGroupId,
            subSectorCode,
            subSectorLabel,
            primaryDomain,
            title,
            shortSummary: title.length > 64 ? `${title.slice(0, 61)}...` : title,
            status,
            validityPeriod:
              row.validity_period === "UPCOMING" || row.validity_period === "Sắp có hiệu lực"
                ? "UPCOMING"
                : "EFFECTIVE",
            isAmended: false,
            chapterCount: Math.max(1, nodes.filter(n => n.level === "Chương").length),
            articleCount: Math.max(1, nodes.filter(n => n.level === "Điều").length),
            clauseTotalCount: nodes.length * 3,
            projectAxes,
            secondaryDomains,
            linkedGates: effectiveGates,
            linkedQAQC,
            tags: csvTaxonomy.tags,
            lineage,
            nodes,
          };
          importedDocs.push(docObj);

          const queueItem = await createQueueItemFromCsvRow({
            index: idx,
            originalName: ssotName,
            proposedName: ssotName,
            extractedText: nodes.map(n => `${n.code} ${n.title}\n${n.content}`).join("\n"),
            primaryDomain,
            secondaryDomains,
            projectAxes,
            linkedGates: effectiveGates,
            linkedQAQC,
            docType: docObj.docType,
            issuer: docObj.issuer,
            industry: row.industry_code || analyzed.industry,
            rawNumber: docNumber,
            year: docObj.year,
            rawSummary: title,
            cdeStatus: safeParseCdeStatus(row.cde_status, "S1"),
            sourceLabel: fileName,
          });
          importedQueueItems.push(queueItem);
        }
      } else if (schemaKind === "STAGE_GATE") {
        const nextGateStatusPatches: Array<{
          archetype: ProjectArchetypeCode;
          gateCode: string;
          status: GateWorkflowStatus;
        }> = [];
        const gateUpdates = new Map<string, StageGateItem>();

        gates.forEach(g => {
          gateUpdates.set(g.gate, { ...g, steps: g.steps.map(s => ({ ...s })) });
        });

        for (let idx = 0; idx < rows.length; idx++) {
          const row = rows[idx];
          const gateCode = (row.gate_code || "G12").toUpperCase();
          if (!firstImportedGateCode) firstImportedGateCode = gateCode;

          const archetypeList = safeParseProjectAxes(row.project_archetype, [
            activeProjectArchetype,
          ]);
          const rowArchetype = archetypeList[0];
          const gateStatus = safeParseGateStatus(row.gate_status, "IN_REVIEW");
          const functionalTags = parseListField(row.functional_tags)
            .map(d => safeParseDomain(d, "QLCL"))
            .filter(Boolean);
          const effectiveTags: FunctionalDomainCode[] =
            functionalTags.length > 0 ? functionalTags : ["QLCL"];
          const checklistItems = parseListField(row.audit_checklist);

          const existingGate = gateUpdates.get(gateCode);
          const stepCode = row.step_code || `${gateCode}.1`;
          const stepTitle = row.step_title || row.gate_name || `Kiểm soát ${gateCode}`;
          const ssotTemplate =
            row.ssot_template ||
            `${rowArchetype}_${gateCode}_QD_2026-${idx + 1}_${effectiveTags[0]}_HoSoStageGate.pdf`;

          const newStep = {
            code: stepCode,
            title: stepTitle,
            mandatory: row.mandatory || "Bắt buộc",
            raci: {
              CDT: row.raci_cdt || "A",
              BQLDA: row.raci_bqlda || "R",
              TVTK: row.raci_tvtk || "C",
              TVGS: row.raci_tvgs || "C",
              NhaThau: row.raci_nhathau || "I",
              CoQuanNN: row.co_quan_nn || "Sở XD / Ban QLDA",
            },
            ssotTemplate,
            riskFlag: row.risk_flag || "Kiểm soát tính đồng bộ pháp lý và thanh toán.",
            auditChecklist:
              checklistItems.length > 0
                ? checklistItems
                : ["Hồ sơ pháp lý đầy đủ theo quy định Stage-Gate"],
          };

          if (existingGate) {
            const stepIdx = existingGate.steps.findIndex(s => s.code === stepCode);
            const updatedSteps = [...existingGate.steps];
            if (stepIdx >= 0) {
              updatedSteps[stepIdx] = { ...updatedSteps[stepIdx], ...newStep };
            } else {
              updatedSteps.unshift(newStep);
            }

            const existingFp = existingGate.financialProfile || {
              allocatedContractVnd: 100_000_000_000,
              acceptedValueVnd: 50_000_000_000,
              disbursedValueVnd: 50_000_000_000,
            };

            gateUpdates.set(gateCode, {
              ...existingGate,
              name: row.gate_name || existingGate.name,
              status: gateStatus,
              assignedLeadId: row.assigned_lead_id || existingGate.assignedLeadId,
              functionalTags: Array.from(new Set([...existingGate.functionalTags, ...effectiveTags])),
              financialProfile: {
                allocatedContractVnd: parseNumericVnd(
                  row.allocated_contract_vnd,
                  existingFp.allocatedContractVnd
                ),
                acceptedValueVnd: parseNumericVnd(
                  row.accepted_value_vnd,
                  existingFp.acceptedValueVnd
                ),
                disbursedValueVnd: parseNumericVnd(
                  row.disbursed_value_vnd,
                  existingFp.disbursedValueVnd
                ),
                ipcTrancheCode: row.ipc_tranche_code || existingFp.ipcTrancheCode,
                ipcTitle: row.step_title || existingFp.ipcTitle,
              },
              steps: updatedSteps,
            });
          } else {
            const defaultNotes = VALID_PROJECT_AXES.reduce(
              (acc, code) => ({
                ...acc,
                [code]: `${stepTitle} (${row.phase || "Stage-Gate"})`,
              }),
              {} as Record<ProjectArchetypeCode, string>
            );
            gateUpdates.set(gateCode, {
              gate: gateCode,
              phase: row.phase || "Giai đoạn II: Thực hiện dự án",
              name: row.gate_name || `Cổng kiểm soát ${gateCode}`,
              stepsCount: 1,
              functionalTags: effectiveTags,
              status: gateStatus,
              assignedLeadId: row.assigned_lead_id || "EMP-01",
              financialProfile: {
                allocatedContractVnd: parseNumericVnd(row.allocated_contract_vnd, 50_000_000_000),
                acceptedValueVnd: parseNumericVnd(row.accepted_value_vnd, 25_000_000_000),
                disbursedValueVnd: parseNumericVnd(row.disbursed_value_vnd, 15_000_000_000),
                ipcTrancheCode: row.ipc_tranche_code || `IPC-${gateCode}`,
                ipcTitle: stepTitle,
              },
              projectNotes: defaultNotes,
              steps: [newStep],
            });
          }

          nextGateStatusPatches.push({ archetype: rowArchetype, gateCode, status: gateStatus });
          gatesUpdatedCount += 1;

          const analyzed = smartAnalyzeFile3D(ssotTemplate, `${stepTitle}\n${row.risk_flag || ""}`);
          const primaryDomain = effectiveTags[0] || analyzed.primaryDomain;
          const { industryGroupId, subSectorCode, subSectorLabel } =
            inferIndustryAndSubSector(primaryDomain);
          const lineage = `Stage-Gate ${gateCode} (${rowArchetype}) · ${row.mandatory || ""} · ${
            row.risk_flag || ""
          }`;
          const nodes = buildLegalNodesForImport({
            docNumber: row.ipc_tranche_code || `${gateCode}-${stepCode}`,
            title: stepTitle,
            lineage,
            status: `Trạng thái Gate: ${gateStatus}`,
            linkedGates: [gateCode],
          });

          importedDocs.push({
            id: `DOC-SG-${Date.now().toString(36).toUpperCase()}-${idx + 1}`,
            ssotFileName: ssotTemplate,
            docNumber: row.ipc_tranche_code || `${gateCode}/${stepCode}`,
            docType: analyzed.docType,
            issuer: analyzed.issuer,
            year: "2026",
            issueDate: "15/11/2026",
            effectiveDate: "15/11/2026",
            industryGroupId,
            subSectorCode,
            subSectorLabel,
            primaryDomain,
            title: `${gateCode} · ${stepTitle}`,
            shortSummary: stepTitle,
            status: `Stage-Gate: ${gateStatus}`,
            validityPeriod: "EFFECTIVE",
            isAmended: false,
            chapterCount: 1,
            articleCount: 2,
            clauseTotalCount: 4,
            projectAxes: [rowArchetype],
            secondaryDomains: effectiveTags,
            linkedGates: [gateCode],
            linkedQAQC: [],
            lineage,
            nodes,
          });

          const queueItem = await createQueueItemFromCsvRow({
            index: idx,
            originalName: ssotTemplate,
            proposedName: ssotTemplate,
            extractedText: `${gateCode}: ${stepTitle}\nRủi ro: ${row.risk_flag || ""}\nChecklist: ${
              row.audit_checklist || ""
            }`,
            primaryDomain,
            secondaryDomains: effectiveTags,
            projectAxes: [rowArchetype],
            linkedGates: [gateCode],
            linkedQAQC: [],
            docType: analyzed.docType,
            issuer: analyzed.issuer,
            industry: analyzed.industry,
            rawNumber: stepCode,
            year: "2026",
            rawSummary: stepTitle,
            cdeStatus: gateStatus === "APPROVED" ? "A1" : "S1",
            sourceLabel: fileName,
          });
          importedQueueItems.push(queueItem);
        }

        setGates(Array.from(gateUpdates.values()));
        setProjectGateStatusMap(prev => {
          const next = { ...prev };
          nextGateStatusPatches.forEach(p => {
            next[p.archetype] = {
              ...(next[p.archetype] || {}),
              [p.gateCode]: p.status,
            };
          });
          return next;
        });

        const importedArchetypes = new Set(nextGateStatusPatches.map(p => p.archetype));
        if (!importedArchetypes.has(activeProjectArchetype) && nextGateStatusPatches[0]) {
          setActiveProjectArchetype(nextGateStatusPatches[0].archetype);
        }
        const preferredGate =
          nextGateStatusPatches.find(p => p.archetype === activeProjectArchetype)?.gateCode ||
          firstImportedGateCode;
        if (preferredGate) setSelectedGateCode(preferredGate);
      } else if (schemaKind === "CONTRACT_ITP") {
        const qaqcBatch: QaQcGateControlItem[] = [];
        const workflowBatch: ApprovalWorkflowItem[] = [];

        for (let idx = 0; idx < rows.length; idx++) {
          const row = rows[idx];
          const recordId = row.record_id || `CSV-REC-${idx + 1}`;
          const recordKind = (row.record_kind || "ITP").toUpperCase();
          const gateRef = (row.gate_ref || "G12").toUpperCase();
          if (!firstImportedGateCode) firstImportedGateCode = gateRef;
          const archetype = safeParseProjectAxes(row.project_archetype, [activeProjectArchetype])[0];
          const domain = safeParseDomain(row.domain, "QLCL");
          const ssotName =
            row.ssot_file_name ||
            `${archetype}_${gateRef}_BBNT_2026-${idx + 1}_${domain}_HoSoKiemSoat.pdf`;
          const title = row.title || row.code || ssotName;
          const detailNote = row.detail_note || "Nạp trực tiếp từ dữ liệu CSV thực tế.";

          if (["ITP", "CO_CQ_QCVN16", "LAS_XD", "RFI"].includes(recordKind)) {
            const qaqcItem: QaQcGateControlItem = {
              id: recordId,
              kind: recordKind as QaQcGateControlItem["kind"],
              code: row.code || recordId,
              title,
              gateRef,
              processId: row.process_id || "QT-01",
              projectAxes: [archetype],
              status:
                row.status?.toUpperCase() === "CLOSED_VERIFIED"
                  ? "CLOSED_VERIFIED"
                  : "OPEN_PENDING",
              detailNote,
            };
            qaqcBatch.push(qaqcItem);
            qaqcUpdatedCount += 1;
          } else {
            const rawStatus = (row.status || "PENDING_REVIEW").toUpperCase();
            const wfStatus: ApprovalWorkflowItem["status"] =
              rawStatus === "CDT_APPROVED" ||
              rawStatus === "TVGS_VERIFIED" ||
              rawStatus === "REJECTED_HOLD"
                ? (rawStatus as ApprovalWorkflowItem["status"])
                : "PENDING_REVIEW";

            const wfItem: ApprovalWorkflowItem = {
              id: recordId,
              docCode: row.code || recordId,
              title,
              gateRef,
              domain,
              requesterId: row.requester_id || "EMP-02",
              approverId: row.approver_id || "EMP-01",
              status: wfStatus,
              submittedAt: row.work_inspection_date || "18/11/2026",
              ssotFileName: ssotName,
              projectCode: archetype,
              financialImpactVnd:
                parseNumericVnd(row.vo_amount_vnd) || parseNumericVnd(row.contract_value_vnd),
              bottleneckReason: detailNote,
            };
            workflowBatch.push(wfItem);
            workflowUpdatedCount += 1;

            if (row.contract_type || row.vo_outside_scope) {
              setVoState(prev => ({
                contractType: row.contract_type || prev.contractType,
                isOutsideScope: row.vo_outside_scope || prev.isOutsideScope,
                exceedsPkgPrice: row.exceeds_pkg_price || prev.exceedsPkgPrice,
                affectsSafetyPCCC: row.affects_safety_pccc || prev.affectsSafetyPCCC,
              }));
            }
          }

          const analyzed = smartAnalyzeFile3D(ssotName, `${title}\n${detailNote}`);
          const { industryGroupId, subSectorCode, subSectorLabel } = inferIndustryAndSubSector(domain);
          const nodes = buildLegalNodesForImport({
            docNumber: row.code || recordId,
            title,
            lineage: `${recordKind} · Gate ${gateRef} · ${detailNote}`,
            status: row.status || "Đang kiểm soát",
            linkedGates: [gateRef],
          });

          importedDocs.push({
            id: `DOC-ITP-${Date.now().toString(36).toUpperCase()}-${idx + 1}`,
            ssotFileName: ssotName,
            docNumber: row.code || recordId,
            docType: analyzed.docType,
            issuer: analyzed.issuer,
            year: "2026",
            issueDate: row.material_sample_date || "15/11/2026",
            effectiveDate: row.work_inspection_date || "16/11/2026",
            industryGroupId,
            subSectorCode,
            subSectorLabel,
            primaryDomain: domain,
            title,
            shortSummary: title,
            status: row.status || "Đang kiểm soát",
            validityPeriod: "EFFECTIVE",
            isAmended: false,
            chapterCount: 1,
            articleCount: 2,
            clauseTotalCount: 4,
            projectAxes: [archetype],
            secondaryDomains: [domain],
            linkedGates: [gateRef],
            linkedQAQC: row.process_id ? [row.process_id] : [],
            lineage: `${recordKind} (${archetype}) · ${detailNote}`,
            nodes,
          });

          const queueItem = await createQueueItemFromCsvRow({
            index: idx,
            originalName: ssotName,
            proposedName: ssotName,
            extractedText: `${row.code || recordId}: ${title}\n${detailNote}`,
            primaryDomain: domain,
            secondaryDomains: [domain],
            projectAxes: [archetype],
            linkedGates: [gateRef],
            linkedQAQC: row.process_id ? [row.process_id] : [],
            docType: analyzed.docType,
            issuer: analyzed.issuer,
            industry: analyzed.industry,
            rawNumber: row.code || recordId,
            year: "2026",
            rawSummary: title,
            cdeStatus: row.status?.toUpperCase() === "CLOSED_VERIFIED" ? "A1" : "S1",
            sourceLabel: fileName,
          });
          importedQueueItems.push(queueItem);
        }

        if (qaqcBatch.length > 0) {
          setQaqcControlRecords(prev => {
            const next = [...prev];
            qaqcBatch.forEach(item => {
              const existingIdx = next.findIndex(q => q.id === item.id || q.code === item.code);
              if (existingIdx >= 0) next[existingIdx] = item;
              else next.unshift(item);
            });
            return next;
          });
        }

        if (workflowBatch.length > 0) {
          setApprovalWorkflows(prev => {
            const next = [...prev];
            workflowBatch.forEach(item => {
              const existingIdx = next.findIndex(w => w.id === item.id);
              if (existingIdx >= 0) next[existingIdx] = item;
              else next.unshift(item);
            });
            return next;
          });
        }

        if (firstImportedGateCode) {
          setSelectedGateCode(firstImportedGateCode);
        }
      } else {
        // Generic CSV fallback
        for (let idx = 0; idx < rows.length; idx++) {
          const row = rows[idx];
          const rawName =
            row.ssot_file_name ||
            row.file_name ||
            row.ten_file ||
            row.name ||
            row.title ||
            row.trich_yeu ||
            `HoSo_CSV_${idx + 1}.pdf`;
          const rawSummary = row.title || row.trich_yeu || row.summary || rawName;
          const rawContent = Object.entries(row)
            .map(([k, v]) => `${k}: ${v}`)
            .join("\n");
          const analyzed = smartAnalyzeFile3D(rawName, rawContent);
          const primaryDomain = safeParseDomain(
            row.primary_domain || row.domain || row.linh_vuc,
            analyzed.primaryDomain
          );
          const gateCol = row.gate_code || row.gate_ref || row.gate || row.linked_gates;
          const gatesParsed = parseListField(gateCol).map(g => g.toUpperCase());
          const linkedGates = gatesParsed.length > 0 ? gatesParsed : analyzed.linkedGates;
          if (!firstImportedGateCode && linkedGates[0]) firstImportedGateCode = linkedGates[0];
          const projectAxes = safeParseProjectAxes(
            row.project_axes || row.project_archetype,
            analyzed.projectAxes
          );
          const { industryGroupId, subSectorCode, subSectorLabel } =
            inferIndustryAndSubSector(primaryDomain);
          const nodes = buildLegalNodesForImport({
            docNumber: row.doc_number || row.so_hieu || analyzed.rawNumber,
            title: rawSummary,
            lineage: `Nạp từ CSV (${fileName})`,
            status: row.status || "Còn hiệu lực năm 2026",
            linkedGates,
          });

          const proposedName = buildFileNameByRule({
            group: batchNamingStandard,
            industry: analyzed.industry,
            docType: row.doc_type || analyzed.docType,
            issuer: row.issuer_code || analyzed.issuer,
            rawNumber: row.doc_number || row.so_hieu || analyzed.rawNumber,
            year: row.issue_year || analyzed.year,
            primaryDomain,
            rawSummary,
            appendixSuffix: "",
            ext: analyzed.ext,
            projectCode: projectAxes[0] || activeProjectArchetype,
            gateCode: linkedGates[0],
            linkedGates,
          });

          importedDocs.push({
            id: `DOC-GEN-${Date.now().toString(36).toUpperCase()}-${idx + 1}`,
            ssotFileName: proposedName,
            docNumber: row.doc_number || row.so_hieu || analyzed.rawNumber,
            docType: normalizeSsotDocType(row.doc_type || analyzed.docType),
            issuer: row.issuer_code || analyzed.issuer,
            year: row.issue_year || analyzed.year,
            issueDate: row.issue_date || "18/11/2026",
            effectiveDate: row.effective_date || "18/11/2026",
            industryGroupId,
            subSectorCode,
            subSectorLabel,
            primaryDomain,
            title: rawSummary,
            shortSummary: rawSummary,
            status: row.status || "Còn hiệu lực năm 2026",
            validityPeriod: "EFFECTIVE",
            isAmended: false,
            chapterCount: 1,
            articleCount: 2,
            clauseTotalCount: 4,
            projectAxes,
            secondaryDomains: [primaryDomain],
            linkedGates,
            linkedQAQC: [],
            tags: [
              analyzed.industry,
              subSectorCode,
              ...projectAxes,
              ...linkedGates,
            ],
            lineage: `Nạp trực tiếp từ file CSV (${fileName})`,
            nodes,
          });

          const queueItem = await createQueueItemFromCsvRow({
            index: idx,
            originalName: rawName,
            proposedName,
            extractedText: rawContent,
            primaryDomain,
            secondaryDomains: [primaryDomain],
            projectAxes,
            linkedGates,
            linkedQAQC: [],
            docType: row.doc_type || analyzed.docType,
            issuer: row.issuer_code || analyzed.issuer,
            industry: analyzed.industry,
            rawNumber: row.doc_number || row.so_hieu || analyzed.rawNumber,
            year: row.issue_year || analyzed.year,
            rawSummary,
            cdeStatus: safeParseCdeStatus(row.cde_status, "S1"),
            sourceLabel: fileName,
          });
          importedQueueItems.push(queueItem);
        }
        if (firstImportedGateCode) setSelectedGateCode(firstImportedGateCode);
      }

      if (importedDocs.length > 0) {
        setLegalDocs(prev => mergeLegalDocs(prev, importedDocs));
        setSelectedDocId(importedDocs[0].id);
        setExpandedInlineDocId(importedDocs[0].id);
        setVbplIndustryGroupFilter("ALL");
        setVbplSubSectorFilter("ALL");
        setVbplDomainFilter("ALL");
        setVbplProjectFilter("ALL");
        setPane2SubTab("DOCS");
        setFilterDocType("ALL");
        setFilterValidityPeriod("ALL");
        setRecentDocIds(prev => [
          importedDocs[0].id,
          ...prev.filter(id => id !== importedDocs[0].id),
        ]);
      }

      if (importedQueueItems.length > 0) {
        setDroppedFilesQueue(prev => [...importedQueueItems, ...prev]);
        const firstQ = importedQueueItems[0];
        setActiveBatchItemId(firstQ.id);
        setNamingForm(prev => ({
          ...prev,
          ...firstQ.suggestion,
          rawContentToParse: firstQ.extractedText,
        }));
      }

      const summary: CsvImportSummary = {
        fileName,
        schemaKind,
        schemaLabel,
        docsCount: importedDocs.length,
        gatesCount: gatesUpdatedCount,
        qaqcCount: qaqcUpdatedCount,
        workflowCount: workflowUpdatedCount,
        queueCount: importedQueueItems.length,
        importedAt: new Date().toLocaleTimeString("vi-VN"),
      };
      setCsvImportResult(summary);

      await recordAuditLog({
        module: "INGEST_3D",
        action: `Nạp CSV thực tế [${schemaLabel}] từ "${fileName}": ${importedDocs.length} VBPL, ${gatesUpdatedCount} Stage-Gate, ${qaqcUpdatedCount + workflowUpdatedCount} QA/QC-HĐ`,
        entityRef: fileName,
        newState: "LIVE_CSV_IMPORTED",
      });

      showToast(
        `Đã nạp ${rows.length} dòng từ "${fileName}" và cập nhật thẳng sang Bước 2 & Bước 3!`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi đọc file CSV";
      showToast(`Không thể đọc file CSV: ${msg}`);
    } finally {
      setIsImportingCsv(false);
    }
  };

  const handleCsvFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const text = await file.text();
    await handleLiveCsvImport(text, file.name);
  };

  const handleQuickLoadTemplateCsv = async (tpl: (typeof CSV_TEMPLATES)[number]) => {
    setIsTemplateMenuOpen(false);
    try {
      const res = await fetch(tpl.href);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      await handleLiveCsvImport(text, tpl.fileName);
    } catch {
      showToast(`Không thể tải trực tiếp ${tpl.fileName}. Vui lòng tải file xuống và nạp lại.`);
    }
  };

  const handleLoadRealDataLegalBatch = () => {
    const realBatch = createRealDataLegalBatchItems(
      activeProjectArchetype,
      batchNamingStandard,
      folderNamingPreset
    );
    setDroppedFilesQueue(realBatch);
    const first = realBatch.find(s => s.itemKind === "FILE") || realBatch[0];
    if (first) {
      setActiveBatchItemId(first.id);
      setActiveRawFile(first.rawFile);
      setNamingForm(prev => ({
        ...prev,
        ...first.suggestion,
        rawContentToParse: first.extractedText,
      }));
    }
    showToast(`Đã nạp toàn bộ ${realBatch.length} hồ sơ thực tế từ kho Data_Legal_2026!`);
  };

  const handleLoadSampleBatch = () => {
    const samples = createSampleBatchItems(
      activeProjectArchetype,
      batchNamingStandard,
      folderNamingPreset
    );
    setDroppedFilesQueue(samples);
    const first = samples.find(s => s.itemKind === "FILE") || samples[0];
    if (first) {
      setActiveBatchItemId(first.id);
      setActiveRawFile(first.rawFile);
      setNamingForm(prev => ({
        ...prev,
        ...first.suggestion,
        rawContentToParse: first.extractedText,
      }));
    }
    showToast("Đã nạp thử 8 hồ sơ & thư mục mẫu để kiểm duyệt!");
  };

  const handleConfirmAndIngest = async () => {
    if (droppedFilesQueue.length === 0) {
      await handleSaveToSSOT();
      setConfirmBannerResult({
        docsCount: 1,
        foldersCount: 0,
        gatesList: namingForm.linkedGates,
        committedAt: new Date().toLocaleTimeString("vi-VN"),
      });
      if (namingForm.linkedGates[0]) {
        setSelectedGateCode(namingForm.linkedGates[0]);
      }
      return;
    }

    if (selectedItems.length === 0) {
      showToast("Vui lòng tích chọn ít nhất 1 mục trong bảng để nạp vào hệ thống!");
      return;
    }

    if (invalidSelectedItems.length > 0) {
      await handleCommitBatchRename();
      return;
    }

    await handleCommitBatchRename();
    if (selectedLinkedGates.length > 0) {
      setSelectedGateCode(selectedLinkedGates[0]);
    }
    setConfirmBannerResult({
      docsCount: selectedFileCount,
      foldersCount: selectedFolderCount,
      gatesList: selectedLinkedGates,
      committedAt: new Date().toLocaleTimeString("vi-VN"),
    });
  };

  const handleApplyNamingFormToActiveRow = () => {
    if (!activeBatchItemId) {
      showToast("Chưa chọn dòng nào trong bảng để cập nhật!");
      return;
    }
    setDroppedFilesQueue(prev =>
      prev.map(item => {
        if (item.id !== activeBatchItemId) return item;
        const nextSuggestion = {
          ...item.suggestion,
          industry: namingForm.industry,
          docType: namingForm.docType,
          issuer: namingForm.issuer,
          rawNumber: namingForm.rawNumber,
          year: namingForm.year,
          primaryDomain: namingForm.primaryDomain,
          rawSummary: namingForm.rawSummary,
          appendixSuffix: namingForm.appendixSuffix,
          ext: namingForm.ext,
          projectAxes: namingForm.projectAxes,
          secondaryDomains: namingForm.secondaryDomains,
          linkedGates: namingForm.linkedGates,
          linkedQAQC: namingForm.linkedQAQC,
        };
        const nextName =
          item.itemKind === "FOLDER"
            ? item.proposedName
            : buildFileNameByRule({
                group: item.qlvbGroup || batchNamingStandard,
                industry: nextSuggestion.industry,
                docType: nextSuggestion.docType,
                issuer: nextSuggestion.issuer,
                rawNumber: nextSuggestion.rawNumber,
                year: nextSuggestion.year,
                primaryDomain: nextSuggestion.primaryDomain,
                rawSummary: nextSuggestion.rawSummary,
                appendixSuffix: nextSuggestion.appendixSuffix,
                ext: nextSuggestion.ext,
                projectCode: nextSuggestion.projectAxes[0] || activeProjectArchetype,
                gateCode: nextSuggestion.linkedGates[0],
                linkedGates: nextSuggestion.linkedGates,
                ktSubType: item.ktSubType,
                tkStageDept: item.tkStageDept,
                tkDocCode: item.tkDocCode,
                tkRevision: item.tkRevision,
              });
        const nextTagsFromForm = [
          ...buildAutoSuggestedTags(nextSuggestion, activeProjectArchetype, "CONFIRMED"),
          ...(item.smartTags || []).filter(t => t.category === "CUSTOM"),
        ];
        return {
          ...item,
          suggestion: nextSuggestion,
          smartTags: nextTagsFromForm,
          proposedName: nextName,
          extractedText: namingForm.rawContentToParse,
        };
      })
    );
    showToast("Đã cập nhật tên chuẩn & phân loại 3 Trục vào dòng đang chọn!");
  };

  if (activeTab !== "STEP1_INGEST") return null;

  return (
    <div className="h-full overflow-y-auto bg-[var(--giay)] text-[var(--chu)]">
      <div className="max-w-[1560px] mx-auto px-4 py-5 md:px-6 md:py-6 space-y-5">
        {/* Header Tối giản */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-base md:text-lg font-bold text-[var(--chu)] flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-800 dark:text-amber-400 text-sm">
                1
              </span>
              <span>Tiếp nhận & Chuẩn hóa Hồ sơ Dự án (CDE)</span>
            </h1>
            <p className="text-xs text-[var(--chu-m)] mt-0.5">
              Tải tài liệu hoặc nhập dữ liệu thực tế từ file CSV, kiểm duyệt tên chuẩn trước khi đưa sang Bước 2 (Tra cứu VBPL) và Bước 3 (Stage-Gate).
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-[var(--panel)] border border-[var(--line)] text-[var(--chu-m)]">
              Dự án: <b className="text-amber-800 dark:text-amber-400">[{activeProjectArchetype}]</b>{" "}
              <span className="hidden sm:inline">{activeProjectName}</span>
            </span>
          </div>
        </div>

        {/* =================================================================
            KHỐI 1 (TRÊN CÙNG): VÙNG NẠP DỮ LIỆU — 2 THẺ TRỰC QUAN (70% / 30%)
           ================================================================= */}
        <section aria-label="Vùng nạp dữ liệu" className="grid grid-cols-1 lg:grid-cols-10 gap-4">
          {/* Thẻ Trái (70%): Kéo-Thả File/Thư mục lớn, thoáng */}
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
            className={`lg:col-span-7 rounded-2xl border-2 border-dashed p-6 md:p-7 transition-all flex flex-col justify-center items-center text-center min-h-[210px] ${
              isDragging
                ? "border-emerald-400 bg-emerald-500/10 shadow-lg shadow-emerald-500/10"
                : "border-[var(--line-d)] bg-[var(--panel)]/60 hover:border-amber-400/70 hover:bg-[var(--panel)]"
            }`}
          >
            {/* Hidden file & folder inputs */}
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
            <input
              ref={folderInputRef}
              type="file"
              multiple
              {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
              className="hidden"
              onChange={e => {
                if (e.target.files && e.target.files.length > 0) {
                  handleProcessFiles(e.target.files);
                }
              }}
            />

            <div className="h-12 w-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-2xl mb-3">
              {isAnalyzingFile ? "⏳" : "📂"}
            </div>
            <h2 className="text-sm md:text-base font-bold text-[var(--chu)]">
              {isAnalyzingFile
                ? "Đang đọc nội dung & chuẩn hóa tên hồ sơ..."
                : "Kéo & thả File hoặc Thư mục dự án vào đây"}
            </h2>
            <p className="text-xs text-[var(--chu-m)] max-w-xl mt-1">
              Hỗ trợ PDF, Word, Excel, CAD (.dwg). Hệ thống tự động bóc tách trích yếu, gắn nhãn 3 Trục, kiểm tra trùng lặp SHA-256 và đề xuất tên chuẩn CDE.
            </p>

            {/* Chỉ hiển thị 2 nút chính */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs md:text-sm transition shadow-md cursor-pointer inline-flex items-center gap-2"
              >
                <span>📄 Chọn File (PDF, Word)</span>
              </button>
              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                className="px-4 py-2.5 rounded-xl bg-[var(--giay-d)] hover:bg-[var(--giay-d)] border border-[var(--line-d)] text-sky-800 dark:text-sky-300 font-bold text-xs md:text-sm transition cursor-pointer inline-flex items-center gap-2"
              >
                <span>📁 Chọn Cả Thư Mục</span>
              </button>
            </div>

            {/* Lựa chọn nạp kho thực tế vs nạp mẫu demo */}
            <div className="mt-3.5 flex flex-wrap items-center justify-center gap-3 text-xs">
              <button
                type="button"
                onClick={handleLoadRealDataLegalBatch}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/30 font-bold border border-emerald-500/30 cursor-pointer flex items-center gap-1.5 transition shadow-sm"
                title="Nạp toàn bộ 160 hồ sơ pháp lý thực tế từ kho Data_Legal_2026 trên Drive"
              >
                <span>📂 Nạp Kho Thực Tế (160 tệp)</span>
              </button>
              <button
                type="button"
                onClick={handleLoadSampleBatch}
                className="text-[var(--chu-m)] hover:text-[var(--chu)] underline underline-offset-4 cursor-pointer text-[11px]"
              >
                Nạp 8 mẫu demo
              </button>
            </div>

            {/* Quét thư mục ổ cứng trực tiếp qua Local Sidecar :8008 */}
            <div className="mt-3 pt-3 border-t border-[var(--line)]/70 flex flex-wrap items-center justify-center gap-2 text-left">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  hybridHealth?.localScannerOnline
                    ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/35"
                    : "bg-slate-500/10 text-[var(--chu-m)] border-[var(--line-d)]"
                }`}
                title="Trạng thái Local Sidecar :8008 (đọc ổ cứng & lưu SQLite ACID)"
              >
                {hybridHealth?.localScannerOnline ? "● Sidecar :8008 Online" : "○ Sidecar :8008 Offline"}
              </span>
              <input
                type="text"
                value={localFolderInput}
                onChange={e => setLocalFolderInput(e.target.value)}
                placeholder="Đường dẫn thư mục ổ cứng (VD: E:\\HoSo_DuAn)..."
                aria-label="Đường dẫn thư mục ổ cứng cần quét"
                className="flex-1 min-w-[210px] max-w-[340px] bg-[var(--giay)] border border-[var(--line-d)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--chu)] font-mono"
              />
              <label className="inline-flex items-center gap-1 text-[11px] text-[var(--chu-m)] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={localScanRecursive}
                  onChange={e => setLocalScanRecursive(e.target.checked)}
                />
                <span>Quét thư mục con</span>
              </label>
              <button
                type="button"
                onClick={() => handleScanLocalFolderToQueue(localFolderInput, localScanRecursive)}
                disabled={!localFolderInput.trim()}
                className="px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-50 border border-sky-500/40 text-sky-900 dark:text-sky-200 font-bold text-xs cursor-pointer transition"
              >
                🔍 Quét ổ cứng → Hàng đợi
              </button>
            </div>
          </div>

          {/* Thẻ Phải (30%): Nạp Dữ Liệu Thực Tế (CSV/Excel) */}
          <div className="lg:col-span-3 rounded-2xl border border-emerald-500/35 bg-[var(--panel)] p-5 flex flex-col justify-between gap-4 min-h-[210px]">
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,.tsv,.txt"
              className="hidden"
              onChange={handleCsvFileSelected}
            />

            <div className="space-y-1.5">
              <h2 className="text-sm font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <span>📊 Nạp Dữ Liệu Thực Tế (CSV/Excel)</span>
              </h2>
              <p className="text-xs text-[var(--chu-m)] leading-relaxed">
                Nhập nhanh file CSV (UTF-8) để đổ thẳng danh mục VBPL, tiến độ Stage-Gate hoặc ITP vào Bước 2 & Bước 3.
              </p>
            </div>

            <div className="space-y-2.5">
              {/* Dropdown 3 file mẫu trong /templates/ */}
              <div className="relative" ref={templateMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsTemplateMenuOpen(prev => !prev)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--giay-d)] hover:bg-[var(--giay-d)] border border-[var(--line-d)] text-[var(--chu)] font-semibold text-xs transition flex items-center justify-between cursor-pointer"
                >
                  <span>📥 Tải File Mẫu</span>
                  <span className="text-[var(--chu-m)] text-[10px]">
                    {isTemplateMenuOpen ? "▲" : "▼"}
                  </span>
                </button>

                {isTemplateMenuOpen && (
                  <div className="absolute left-0 right-0 mt-1.5 z-30 rounded-xl bg-[var(--panel)] border border-[var(--line-d)] shadow-2xl p-1.5 space-y-1">
                    {CSV_TEMPLATES.map(tpl => (
                      <div
                        key={tpl.id}
                        className="rounded-lg p-2 hover:bg-[var(--giay-d)] transition flex items-center justify-between gap-2"
                      >
                        <a
                          href={tpl.href}
                          download={tpl.fileName}
                          onClick={() => {
                            setIsTemplateMenuOpen(false);
                            showToast(`Đang tải biểu mẫu ${tpl.fileName} (UTF-8 BOM)`);
                          }}
                          className="min-w-0 flex-1 block"
                        >
                          <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 truncate">
                            📥 {tpl.label}
                          </div>
                          <div className="text-[10px] text-[var(--chu-m)] truncate">{tpl.desc}</div>
                        </a>
                        <button
                          type="button"
                          onClick={() => handleQuickLoadTemplateCsv(tpl)}
                          title={`Nạp thử dữ liệu từ ${tpl.fileName} vào ứng dụng`}
                          className="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold shrink-0 cursor-pointer"
                        >
                          Nạp thử
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Nút chính Nạp File CSV Thực Tế */}
              <button
                type="button"
                disabled={isImportingCsv}
                onClick={() => csvInputRef.current?.click()}
                className="w-full px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-bold text-xs md:text-sm transition shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <span>{isImportingCsv ? "⏳ Đang phân tích CSV..." : "📤 Nạp File CSV Thực Tế"}</span>
              </button>
            </div>

            {csvImportResult && (
              <div className="rounded-xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/40 px-3 py-2 text-[11px] text-emerald-900 dark:text-emerald-200 space-y-1">
                <div className="font-semibold truncate">
                  ✓ Đã nạp: <span className="text-[var(--chu)]">{csvImportResult.fileName}</span>
                </div>
                <div className="text-[10px] text-emerald-800 dark:text-emerald-300/90 flex flex-wrap gap-x-2">
                  <span>• {csvImportResult.docsCount} VBPL (Bước 2)</span>
                  {(csvImportResult.gatesCount > 0 ||
                    csvImportResult.qaqcCount > 0 ||
                    csvImportResult.workflowCount > 0) && (
                    <span>
                      •{" "}
                      {csvImportResult.gatesCount > 0
                        ? `${csvImportResult.gatesCount} Stage-Gate`
                        : `${csvImportResult.qaqcCount + csvImportResult.workflowCount} ITP/HĐ`}{" "}
                      (Bước 3)
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* =================================================================
            KHỐI 2 (Ở GIỮA): BẢNG KIỂM DUYỆT GỌN GÀNG (5 CỘT)
           ================================================================= */}
        <section
          aria-label="Bảng kiểm duyệt hồ sơ"
          className="rounded-2xl border border-[var(--line)] bg-[var(--panel)]/75 shadow-xl overflow-hidden"
        >
          {/* Header Bảng & Bộ lọc nhanh */}
          <div className="px-4 py-3.5 border-b border-[var(--line)] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-sm font-bold text-[var(--chu)]">
                Danh sách hồ sơ kiểm duyệt ({validatedBatchQueue.length})
              </h2>
              <div className="flex items-center gap-1 bg-[var(--giay)] p-1 rounded-lg border border-[var(--line)] text-[11px] flex-wrap">
                {(
                  [
                    { id: "ALL", label: `Tất cả (${validatedBatchQueue.length})` },
                    {
                      id: "FILE",
                      label: `File (${validatedBatchQueue.filter(i => i.itemKind !== "FOLDER").length})`,
                    },
                    {
                      id: "FOLDER",
                      label: `Thư mục (${validatedBatchQueue.filter(i => i.itemKind === "FOLDER").length})`,
                    },
                    {
                      id: "ISSUE",
                      label: `Cần kiểm tra (${
                        validatedBatchQueue.filter(i => i.validationStatus !== "OK").length
                      })`,
                    },
                    {
                      id: "DUP_HASH",
                      label: `Trùng SHA (${duplicateHashItems.length})`,
                    },
                  ] as const
                ).map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setBatchFilterKind(tab.id)}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                      batchFilterKind === tab.id
                        ? tab.id === "DUP_HASH"
                          ? "bg-rose-500 text-white font-bold"
                          : "bg-amber-500 text-slate-950 font-bold"
                        : "text-[var(--chu-m)] hover:text-[var(--chu)]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={batchFilterCde}
                onChange={e => setBatchFilterCde(e.target.value as "ALL" | CdeIsoStatus)}
                aria-label="Lọc trạng thái CDE"
                className="bg-[var(--giay)] border border-[var(--line-d)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--chu)] focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                <option value="ALL">CDE: Tất cả</option>
                {CDE_ISO_19650_PIPELINE.map(code => (
                  <option key={code} value={code}>
                    {CDE_ISO_19650_META[code].shortLabel} (
                    {validatedBatchQueue.filter(i => (i.cdeStatus || "S0") === code).length})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  const nextSelected = !allQueueSelected;
                  setDroppedFilesQueue(prev => prev.map(i => ({ ...i, selected: nextSelected })));
                }}
                className="px-2.5 py-1.5 rounded-lg bg-[var(--giay-d)] hover:bg-[var(--giay-d)] text-[var(--chu)] text-xs font-medium cursor-pointer"
              >
                {allQueueSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
              </button>

              {droppedFilesQueue.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setDroppedFilesQueue([]);
                    setConfirmBannerResult(null);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs font-medium cursor-pointer"
                >
                  Xóa danh sách
                </button>
              )}
            </div>
          </div>

          {/* Cảnh báo trùng mã băm SHA-256 (chỉ hiển thị khi phát hiện trùng) */}
          {duplicateHashItems.length > 0 && (
            <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-500/10 dark:bg-rose-950/40 border border-rose-500/60 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="text-rose-900 dark:text-rose-200">
                <b className="text-rose-800 dark:text-rose-300">
                  ⚠️ Phát hiện {duplicateHashItems.length} tệp trùng nội dung (SHA-256):
                </b>{" "}
                <span className="font-mono text-amber-800 dark:text-amber-300">
                  {duplicateHashItems
                    .slice(0, 2)
                    .map(d => d.originalName)
                    .join(", ")}
                  {duplicateHashItems.length > 2 ? ` (+${duplicateHashItems.length - 2})` : ""}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDuplicateSha256Action("DESELECT")}
                  className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                >
                  Bỏ chọn bản trùng
                </button>
                <button
                  type="button"
                  onClick={() => handleDuplicateSha256Action("REMOVE")}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer"
                >
                  Xóa bản trùng
                </button>
              </div>
            </div>
          )}

          {/* Bảng 5 Cột Gọn Gàng */}
          {filteredBatchQueue.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <div className="text-2xl">📭</div>
              <p className="text-sm text-[var(--chu-m)] font-medium">
                Chưa có hồ sơ nào trong danh sách hiển thị.
              </p>
              <p className="text-xs text-[var(--chu-nhat)]">
                Hãy kéo thả File/Thư mục ở phía trên, nạp file CSV thực tế hoặc{" "}
                <button
                  type="button"
                  onClick={handleLoadRealDataLegalBatch}
                  className="text-emerald-800 dark:text-emerald-400 hover:underline font-bold cursor-pointer"
                >
                  nạp toàn bộ kho Data_Legal_2026 (160 tệp)
                </button>{" "}
                (hoặc{" "}
                <button
                  type="button"
                  onClick={handleLoadSampleBatch}
                  className="text-[var(--chu-m)] hover:underline cursor-pointer"
                >
                  nạp 8 mẫu demo
                </button>
                ).
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-[var(--giay)] backdrop-blur border-b border-[var(--line)] text-[11px] uppercase tracking-wider text-[var(--chu-m)]">
                  <tr>
                    <th className="py-3 pl-4 pr-2 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={allQueueSelected}
                        aria-label="Chọn tất cả hồ sơ"
                        onChange={e =>
                          setDroppedFilesQueue(prev =>
                            prev.map(i => ({ ...i, selected: e.target.checked }))
                          )
                        }
                        className="accent-amber-500 cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-3 min-w-[210px]">Tên gốc</th>
                    <th className="py-3 px-3 min-w-[290px]">Tên chuẩn tự động đề xuất</th>
                    <th className="py-3 px-3 min-w-[270px]">Phân loại &amp; Tags</th>
                    <th className="py-3 pl-3 pr-4 min-w-[230px] text-right">
                      Trạng thái CDE (S0/S1/A1) &amp; Chi tiết
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)] text-xs">
                  {filteredBatchQueue.map(item => {
                    const isFolder = item.itemKind === "FOLDER";
                    const isRowActive = activeBatchItemId === item.id;
                    const isValid = item.validationStatus === "OK";
                    const cdeCode: CdeIsoStatus = item.cdeStatus || "S0";
                    const cdeMeta = CDE_ISO_19650_META[cdeCode];

                    return (
                      <tr
                        key={item.id}
                        onClick={() => selectItemAndOpenDetails(item, false)}
                        className={`transition cursor-pointer ${
                          item.duplicateHashOf
                            ? "bg-rose-500/10 dark:bg-rose-950/40 hover:bg-rose-500/10 dark:bg-rose-950/40"
                            : isRowActive
                            ? "bg-[var(--giay-d)]"
                            : "hover:bg-[var(--giay-d)]"
                        }`}
                      >
                        {/* Cột 1: [Checkbox] */}
                        <td
                          className="py-3 pl-4 pr-2 text-center align-top"
                          onClick={e => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={item.selected !== false}
                            aria-label={`Chọn ${item.originalName}`}
                            onChange={e =>
                              setDroppedFilesQueue(prev =>
                                prev.map(q =>
                                  q.id === item.id ? { ...q, selected: e.target.checked } : q
                                )
                              )
                            }
                            className="mt-1 accent-amber-500 cursor-pointer"
                          />
                        </td>

                        {/* Cột 2: Tên gốc */}
                        <td className="py-3 px-3 align-top max-w-[260px]">
                          <div className="flex items-start gap-2">
                            <span className="text-base leading-none mt-0.5 shrink-0">
                              {isFolder ? "📁" : "📄"}
                            </span>
                            <div className="min-w-0">
                              <div
                                className="font-semibold text-[var(--chu)] truncate"
                                title={item.originalName}
                              >
                                {item.originalName}
                              </div>
                              <div className="text-[11px] text-[var(--chu-m)] truncate mt-0.5">
                                {item.fileSizeLabel || "Tệp"} · {item.readStatsLabel || "Đã đọc"}
                              </div>
                              {item.duplicateHashOf && (
                                <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/50 text-rose-800 dark:text-rose-300 text-[10px] font-semibold">
                                  Trùng SHA-256
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Cột 3: Tên chuẩn tự động đề xuất */}
                        <td
                          className="py-3 px-3 align-top"
                          onClick={e => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={item.proposedName}
                            aria-label={`Tên chuẩn đề xuất cho ${item.originalName}`}
                            onChange={e => {
                              const val = e.target.value;
                              setDroppedFilesQueue(prev =>
                                prev.map(q =>
                                  q.id === item.id ? { ...q, proposedName: val } : q
                                )
                              );
                            }}
                            className="w-full bg-[var(--giay)] border border-[var(--line-d)] focus:border-emerald-400 rounded-lg px-2.5 py-1.5 font-mono text-xs text-emerald-800 dark:text-emerald-300 focus:outline-none"
                          />
                          <div className="flex items-center justify-between gap-2 mt-1 text-[11px]">
                            <span
                              className="text-[var(--chu-m)] truncate"
                              title={item.proposedFolderPath}
                            >
                              📂 {item.proposedFolderPath}
                            </span>
                            <span
                              className={`shrink-0 font-medium ${
                                isValid ? "text-emerald-800 dark:text-emerald-400" : "text-rose-800 dark:text-rose-400"
                              }`}
                            >
                              {isValid ? "✓ Chuẩn" : `⚠ ${item.validationMessage}`}
                            </span>
                          </div>
                        </td>

                        {/* Cột 4: Phân loại & Tags (Smart Tags Gợi ý Tự động & Duyệt/Sửa/Xóa) */}
                        <td className="py-3 px-3 align-top max-w-[360px]">
                          <div className="flex flex-wrap items-center gap-1 mb-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-rose-500/15 border border-rose-500/35 text-rose-800 dark:text-rose-300 font-semibold text-[10px]">
                              {normalizeSsotDocType(item.suggestion.docType)}-
                              {normalizeIssuerCode(item.suggestion.issuer, item.suggestion.docType)}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/35 text-amber-800 dark:text-amber-300 font-semibold text-[10px]">
                              {normalizeDomainForFilename(item.suggestion.primaryDomain)}
                            </span>
                            {item.isCommitted && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[10px] font-semibold">
                                ✓ Đã lưu
                              </span>
                            )}
                          </div>
                          {renderSmartTagsBlock(item, "TABLE")}
                        </td>

                        {/* Cột 5: Trạng thái CDE (S0/S1/A1) & Nút "⚙️ Chi tiết" */}
                        <td
                          className="py-3 pl-3 pr-4 align-top text-right"
                          onClick={e => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center justify-end gap-1.5 flex-wrap">
                            <select
                              value={cdeCode}
                              aria-label={`Trạng thái CDE cho ${item.originalName}`}
                              onChange={e =>
                                handleChangeCdeStatus(item.id, e.target.value as CdeIsoStatus)
                              }
                              title={cdeMeta.description}
                              className={`rounded-lg px-2 py-1 text-[11px] font-bold border cursor-pointer focus:outline-none ${cdeMeta.badgeClass}`}
                            >
                              <option value="S0" className="bg-[var(--panel)] text-amber-900 dark:text-amber-200">
                                S0 · WIP
                              </option>
                              <option value="S1" className="bg-[var(--panel)] text-sky-800 dark:text-sky-300">
                                S1 · Shared
                              </option>
                              <option value="A1" className="bg-[var(--panel)] text-emerald-800 dark:text-emerald-300">
                                A1 · Published
                              </option>
                              <option value="B1" className="bg-[var(--panel)] text-purple-800 dark:text-purple-300">
                                B1 · Archived
                              </option>
                            </select>

                            <button
                              type="button"
                              onClick={() => selectItemAndOpenDetails(item, true)}
                              className="px-2.5 py-1 rounded-lg bg-[var(--giay-d)] hover:bg-[var(--giay-d)] border border-[var(--line-d)] text-[var(--chu)] text-[11px] font-semibold transition cursor-pointer whitespace-nowrap"
                            >
                              ⚙️ Chi tiết
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* =================================================================
              2. THANH XÁC NHẬN RÕ RÀNG (CUỐI BẢNG)
             ================================================================= */}
          <div className="px-4 py-4 bg-[var(--giay)] border-t border-[var(--line)] flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs md:text-sm text-[var(--chu)]">
                {droppedFilesQueue.length === 0 ? (
                  <span>
                    Chưa có file trong bảng — bấm xác nhận để lưu biểu mẫu nhập tay sang{" "}
                    <b className="text-emerald-800 dark:text-emerald-400">Bước 2 (Tra cứu VBPL)</b> &{" "}
                    <b className="text-amber-800 dark:text-amber-400">Bước 3 (Stage-Gate)</b>.
                  </span>
                ) : (
                  <span>
                    Sẽ cập nhật <b className="text-emerald-800 dark:text-emerald-400">{selectedFileCount} hồ sơ văn bản</b>{" "}
                    {selectedFolderCount > 0 && (
                      <span>
                        (+ <b className="text-sky-800 dark:text-sky-300">{selectedFolderCount} thư mục</b>){" "}
                      </span>
                    )}
                    sang <b className="text-emerald-800 dark:text-emerald-400">Bước 2 (Tra cứu VBPL)</b> và đồng bộ{" "}
                    <b className="text-amber-800 dark:text-amber-400">
                      {selectedLinkedGates.length} cổng Stage-Gate
                      {selectedLinkedGates.length > 0
                        ? ` (${selectedLinkedGates.slice(0, 5).join(", ")}${
                            selectedLinkedGates.length > 5 ? "..." : ""
                          })`
                        : ""}
                    </b>{" "}
                    sang <b className="text-amber-800 dark:text-amber-400">Bước 3 (Stage-Gate)</b>.
                  </span>
                )}
              </div>

              {invalidSelectedItems.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
                  <span>
                    ⚠️ Có {invalidSelectedItems.length} mục đang chọn chưa đạt chuẩn hoặc bị trùng SHA-256.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const invalidIds = new Set(invalidSelectedItems.map(i => i.id));
                      setDroppedFilesQueue(prev =>
                        prev.map(i => (invalidIds.has(i.id) ? { ...i, selected: false } : i))
                      );
                      showToast(`Đã bỏ chọn ${invalidSelectedItems.length} mục chưa đạt chuẩn!`);
                    }}
                    className="underline font-semibold text-amber-900 dark:text-amber-200 hover:text-[var(--chu)] cursor-pointer"
                  >
                    Bỏ chọn mục lỗi
                  </button>
                </div>
              )}

              {confirmBannerResult && (
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-emerald-800 dark:text-emerald-300">
                  <span>
                    ✓ Đã nạp lúc {confirmBannerResult.committedAt}: {confirmBannerResult.docsCount}{" "}
                    hồ sơ đã sẵn sàng.
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("STEP2_VBPL")}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-900 dark:text-emerald-200 font-semibold cursor-pointer"
                  >
                    Mở Bước 2 (Tra cứu VBPL) →
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("STEP3_PLAN")}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-900 dark:text-amber-200 font-semibold cursor-pointer"
                  >
                    Mở Bước 3 (Stage-Gate) →
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Toggle chế độ lưu ACID + chỉ báo SQLite/RAM */}
              <div className="flex items-center gap-1 bg-[var(--panel)] border border-[var(--line-d)] rounded-xl p-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setBatchOperationMode("COPY_TO_SILVER")}
                  title="Giữ nguyên file gốc, copy sang Silver Layer + lưu Bronze Vault (An toàn)"
                  className={`px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    batchOperationMode === "COPY_TO_SILVER"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-[var(--chu-m)] hover:text-[var(--chu)]"
                  }`}
                >
                  🛡️ An toàn (Vault + Silver)
                </button>
                <button
                  type="button"
                  onClick={() => setBatchOperationMode("INPLACE_RENAME")}
                  title="Đổi tên trực tiếp tệp gốc trên ổ cứng (tự động lưu backup SHA-256 ở Bronze Vault để Hoàn tác; chặn G:\\Data_Legal_2026)"
                  className={`px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    batchOperationMode === "INPLACE_RENAME"
                      ? "bg-amber-600 text-white shadow-sm"
                      : "text-[var(--chu-m)] hover:text-[var(--chu)]"
                  }`}
                >
                  ⚡ Đổi tên gốc (In-Place)
                </button>
              </div>
              {lastPersistenceSource && (
                <span
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${
                    lastPersistenceSource === "SQLITE_VAULT"
                      ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/35"
                      : "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/35"
                  }`}
                >
                  {lastPersistenceSource === "SQLITE_VAULT" ? "💾 SQLite ACID" : "🧠 RAM Tạm"}
                </span>
              )}
              <button
                type="button"
                onClick={handleConfirmAndIngest}
                className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm transition shadow-lg shadow-emerald-500/20 cursor-pointer whitespace-nowrap"
              >
                ✅ Xác Nhận & Nạp Vào Hệ Thống
              </button>
            </div>
          </div>
        </section>

        {/* =================================================================
            KHỐI 3 (THU GỌN - MẶC ĐỊNH ĐÓNG): ACCORDION "CẤU HÌNH NÂNG CAO & CHI TIẾT OCR"
           ================================================================= */}
        <section aria-label="Cấu hình nâng cao và chi tiết OCR">
          <button
            type="button"
            onClick={() => setIsAdvancedDrawerOpen(prev => !prev)}
            className="w-full px-4 py-3 rounded-xl bg-[var(--panel)]/70 hover:bg-[var(--panel)] border border-[var(--line)] flex flex-wrap items-center justify-between gap-2 text-left transition cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-base">⚙️</span>
              <div>
                <div className="text-xs md:text-sm font-bold text-[var(--chu)]">
                  Cấu hình nâng cao & Chi tiết OCR
                </div>
                <div className="text-[11px] text-[var(--chu-m)]">
                  Đổi tên hàng loạt (Tìm/Thay thế), Xuất Script .PS1, Công thức [SốHiệu]-[Năm]_[LoạiVB]_[LĩnhVực], Smart Tags, 4 vùng OCR V1–V4 &amp; JSON
                </div>
              </div>
            </div>
            <span className="px-3 py-1 rounded-lg bg-[var(--giay-d)] border border-[var(--line-d)] text-xs font-semibold text-amber-800 dark:text-amber-300 shrink-0">
              {isAdvancedDrawerOpen ? "Đóng ngăn cấu hình ✕" : "Mở cấu hình nâng cao ›"}
            </span>
          </button>
        </section>
      </div>

      {/* ===================================================================
          NGĂN TRƯỢT (SLIDE-OVER DRAWER): CẤU HÌNH NÂNG CAO & CHI TIẾT OCR
          Mặc định ĐÓNG, mở khi bấm "⚙️ Chi tiết" ở bảng hoặc Accordion ở cuối
         =================================================================== */}
      {isAdvancedDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            onClick={() => setIsAdvancedDrawerOpen(false)}
            className="fixed inset-0 bg-[var(--giay)] backdrop-blur-[2px]"
          />

          {/* Slide-over Panel */}
          <aside className="relative z-10 w-full max-w-3xl h-full bg-[var(--giay)] border-l border-[var(--line)] shadow-2xl flex flex-col">
            {/* Drawer Header */}
            <div className="px-5 py-4 border-b border-[var(--line)] bg-[var(--panel)] flex items-center justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-[var(--chu)] flex items-center gap-2">
                  <span>⚙️ Cấu hình nâng cao & Chi tiết OCR</span>
                </h3>
                <p className="text-xs text-[var(--chu-m)] truncate mt-0.5">
                  {activeBatchItem
                    ? `Đang xem mục: ${activeBatchItem.originalName}`
                    : `Chuẩn đặt tên hiện hành: ${
                        batchNamingStandard === "SSOT_9PART"
                          ? "[SốHiệu]-[Năm]_[LoạiVB]_[LĩnhVực]_[TríchYếu]"
                          : batchNamingStandard
                      } · ${currentActor.fullName}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAdvancedDrawerOpen(false)}
                className="h-8 w-8 rounded-lg bg-[var(--giay-d)] hover:bg-[var(--giay-d)] border border-[var(--line-d)] text-[var(--chu-m)] hover:text-[var(--chu)] flex items-center justify-center text-sm cursor-pointer shrink-0"
                aria-label="Đóng ngăn cấu hình nâng cao"
              >
                ✕
              </button>
            </div>

            {/* Drawer Sub-Tabs */}
            <div className="px-5 py-2.5 border-b border-[var(--line)] bg-[var(--panel)]/50 grid grid-cols-3 gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setAdvancedTab("OCR_JSON")}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer truncate ${
                  advancedTab === "OCR_JSON"
                    ? "bg-emerald-500 text-slate-950"
                    : "bg-[var(--panel)] text-[var(--chu-m)] hover:text-[var(--chu)] border border-[var(--line)]"
                }`}
              >
                👁️ OCR V1–V4 & JSON
              </button>
              <button
                type="button"
                onClick={() => setAdvancedTab("NAMING_8PART")}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer truncate ${
                  advancedTab === "NAMING_8PART"
                    ? "bg-amber-500 text-slate-950"
                    : "bg-[var(--panel)] text-[var(--chu-m)] hover:text-[var(--chu)] border border-[var(--line)]"
                }`}
              >
                ✏️ Chuẩn Tên &amp; Smart Tags
              </button>
              <button
                type="button"
                onClick={() => setAdvancedTab("BATCH_TOOLS")}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer truncate ${
                  advancedTab === "BATCH_TOOLS"
                    ? "bg-sky-500 text-slate-950"
                    : "bg-[var(--panel)] text-[var(--chu-m)] hover:text-[var(--chu)] border border-[var(--line)]"
                }`}
              >
                🛠️ Hàng loạt & Script .PS1
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* TAB 1: 4 VÙNG OCR (V1-V4) + SMART TAGS + NỘI DUNG + AST + JSON METADATA */}
              {advancedTab === "OCR_JSON" && (
                <div className="space-y-4">
                  {activeBatchItem && (
                    <div className="bg-[var(--panel)] border border-sky-500/35 rounded-xl p-4 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold uppercase text-sky-800 dark:text-sky-300">
                          🏷️ Phân loại &amp; Smart Tags (Duyệt ✓ / Sửa trực tiếp / Xóa ×)
                        </span>
                        <span className="text-[10px] text-[var(--chu-m)]">
                          Viền nét đứt = ✨ Gợi ý tự động · Viền liền = Đã chốt
                        </span>
                      </div>
                      {renderSmartTagsBlock(activeBatchItem, "DRAWER")}
                    </div>
                  )}

                  {/* 4 Vùng OCR V1-V4 */}
                  <div className="bg-[var(--panel)] border border-[var(--line)] rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase text-amber-800 dark:text-amber-400">
                        🎯 Bóc tách 4 Vùng Tọa độ OCR (V1–V4)
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300 font-mono text-[11px] font-bold">
                        Độ tin cậy: {currentOcrZones.confidence}%
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      <div className="p-2.5 rounded-lg bg-[var(--giay)] border border-[var(--line)]">
                        <div className="text-[10px] font-mono text-sky-800 dark:text-sky-400">
                          [V1] CƠ QUAN BAN HÀNH (Góc trên trái)
                        </div>
                        <div className="font-semibold text-[var(--chu)] mt-0.5">
                          {currentOcrZones.v1Issuer}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[var(--giay)] border border-[var(--line)]">
                        <div className="text-[10px] font-mono text-rose-800 dark:text-rose-400">
                          [V2] SỐ HIỆU & NGÀY BAN HÀNH (Góc trên phải)
                        </div>
                        <div className="font-semibold text-[var(--chu)] mt-0.5">
                          {currentOcrZones.v2NumberDate}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[var(--giay)] border border-[var(--line)] sm:col-span-2">
                        <div className="text-[10px] font-mono text-amber-800 dark:text-amber-400">
                          [V3] TÊN LOẠI & TRÍCH YẾU NỘI DUNG (Trung tâm)
                        </div>
                        <div className="font-semibold text-emerald-800 dark:text-emerald-300 mt-0.5">
                          {currentOcrZones.v3TitleSummary}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[var(--giay)] border border-[var(--line)] sm:col-span-2">
                        <div className="text-[10px] font-mono text-purple-800 dark:text-purple-400">
                          [V4] THẨM QUYỀN KÝ & HIỆU LỰC (Chân văn bản)
                        </div>
                        <div className="text-[var(--chu)] mt-0.5">
                          {currentOcrZones.v4SignerValidity}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Trình đọc nội dung & Tìm từ khóa */}
                  <div className="bg-[var(--panel)] border border-[var(--line)] rounded-xl p-4 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold uppercase text-emerald-800 dark:text-emerald-400">
                          Nội dung văn bản bóc tách ({parsedPreviewNodes.length} Chương/Điều)
                        </h4>
                        {activeBatchItem &&
                          (activeBatchItem.itemKind === "FOLDER" ||
                            /\.(pdf|docx?)$/i.test(activeBatchItem.originalName)) && (
                            <button
                              type="button"
                              onClick={() => {
                                const isFolder = activeBatchItem.itemKind === "FOLDER";
                                const isWord = /\.(docx?)$/i.test(activeBatchItem.originalName);
                                setSecurePdfTarget({
                                  fileName: isFolder ? "" : activeBatchItem.originalName,
                                  folderName: isFolder ? activeBatchItem.originalName : undefined,
                                  viewerMode: isFolder ? "FOLDER_FORMS" : isWord ? "WORD" : "PDF",
                                  docTitle: activeBatchItem.suggestion.rawSummary || activeBatchItem.originalName,
                                  docNumber: `${activeBatchItem.suggestion.docType} ${activeBatchItem.suggestion.rawNumber}`,
                                });
                                setIsSecurePdfOpen(true);
                              }}
                              className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/30 font-bold text-xs border border-emerald-500/30 flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                              title="Xem trực tiếp tài liệu gốc hoặc 29 Biểu mẫu an toàn (Zero-Trust Proxy, không mở Drive)"
                            >
                              <span>
                                {activeBatchItem.itemKind === "FOLDER"
                                  ? "📂 Mở 29 Biểu mẫu"
                                  : /\.(docx?)$/i.test(activeBatchItem.originalName)
                                  ? "📝 Xem Word Gốc"
                                  : "🔒 Xem PDF Gốc"}
                              </span>
                            </button>
                          )}
                      </div>
                      <input
                        type="text"
                        value={readerKeywordSearch}
                        onChange={e => setReaderKeywordSearch(e.target.value)}
                        placeholder="Tìm từ khóa trong văn bản..."
                        className="bg-[var(--giay)] border border-[var(--line-d)] rounded-lg px-2.5 py-1 text-xs text-[var(--chu)]"
                      />
                    </div>
                    {readerKeywordSearch.trim() && (
                      <div className="px-2.5 py-1.5 rounded bg-amber-500/15 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200">
                        Tìm thấy{" "}
                        <b>
                          {namingForm.rawContentToParse
                            .toLowerCase()
                            .split(readerKeywordSearch.trim().toLowerCase()).length - 1}
                        </b>{" "}
                        vị trí khớp "{readerKeywordSearch}".
                      </div>
                    )}
                    <textarea
                      rows={7}
                      value={namingForm.rawContentToParse}
                      onChange={e =>
                        setNamingForm({ ...namingForm, rawContentToParse: e.target.value })
                      }
                      className="w-full bg-[var(--giay)] border border-[var(--line)] rounded-lg p-3 text-xs text-[var(--chu)] font-mono leading-relaxed focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Cây Chương-Mục-Điều */}
                  {parsedPreviewNodes.length > 0 && (
                    <div className="bg-[var(--panel)] border border-[var(--line)] rounded-xl p-4 space-y-2">
                      <h4 className="text-xs font-bold uppercase text-amber-800 dark:text-amber-400">
                        🌳 Cấu trúc Chương · Mục · Điều ({parsedPreviewNodes.length})
                      </h4>
                      <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                        {parsedPreviewNodes.map(node => (
                          <div
                            key={node.id}
                            className="p-2 rounded-lg bg-[var(--giay)] border border-[var(--line)] text-xs"
                          >
                            <span className="font-mono font-bold text-sky-800 dark:text-sky-300">
                              {node.level}: {node.code}
                            </span>{" "}
                            <span className="text-[var(--chu)] font-semibold">{node.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* JSON Metadata 3 Trục */}
                  <div className="bg-[var(--panel)] border border-[var(--line)] rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase text-[var(--chu-m)]">
                        Siêu dữ liệu JSON 3 Trục (3D Metadata SSOT)
                      </h4>
                      <span className="text-[11px] font-mono text-amber-800 dark:text-amber-400">REG_Master Ready</span>
                    </div>
                    <pre className="bg-[var(--giay)] border border-[var(--line)] rounded-lg p-3 text-[11px] font-mono text-sky-800 dark:text-sky-300 overflow-x-auto">
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
                          smart_tags: activeBatchItem
                            ? getItemSmartTags(activeBatchItem).map(t => ({
                                category: t.category,
                                code: t.code,
                                label: t.label,
                                status: t.status,
                              }))
                            : [],
                          actor_rbac: `${currentActor.fullName} (${currentActor.rbacRole})`,
                        },
                        null,
                        2
                      )}
                    </pre>
                  </div>
                </div>
              )}

              {/* TAB 2: CÔNG THỨC ĐẶT TÊN CHUẨN & SMART TAGS */}
              {advancedTab === "NAMING_8PART" && (
                <div className="space-y-4">
                  {/* Tên file sinh tự động */}
                  <div className="bg-[var(--panel)] border border-amber-500/35 rounded-xl p-4 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold uppercase text-amber-800 dark:text-amber-400">
                          Tên file chuẩn (
                          {batchNamingStandard === "SSOT_9PART" || batchNamingStandard === "PL"
                            ? "[SốHiệu]-[Năm]_[LoạiVB]-[CơQuan]_[LĩnhVực]_[TríchYếu]"
                            : batchNamingStandard}
                          )
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[var(--giay)] border border-[var(--line-d)] font-mono text-[10px] text-sky-800 dark:text-sky-300">
                          {`${formCleanedNumber}-${namingForm.year}_${normalizedFormDocType}-${normalizeIssuerCode(
                            namingForm.issuer,
                            normalizedFormDocType
                          )}_${normalizeDomainForFilename(namingForm.primaryDomain)}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(generatedFileName);
                            showToast("Đã copy tên file chuẩn!");
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[var(--giay-d)] hover:bg-[var(--giay-d)] border border-[var(--line-d)] text-xs text-amber-800 dark:text-amber-300 font-semibold cursor-pointer"
                        >
                          Copy tên
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadRenamedFile(activeRawFile, generatedFileName)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer"
                        >
                          {activeRawFile ? "Tải file đã đổi tên" : "Xuất bản thảo"}
                        </button>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[var(--giay)] border border-[var(--line)] font-mono text-xs text-emerald-800 dark:text-emerald-400 break-all select-all">
                      {generatedFileName}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--chu-m)]">
                      <span>
                        Trích yếu sau cắt lặp:{" "}
                        <b className="font-mono text-[var(--chu)]">{formStrippedSummary || "—"}</b>
                      </span>
                      <span className="font-mono text-sky-800 dark:text-sky-300">
                        PascalCase: {formSummaryPascal} ({formSummaryPascal.length}/40 ký tự)
                      </span>
                    </div>
                  </div>

                  {renderSsotTwoLayerExamples(false)}

                  {/* Thành phần cấu thành tên file chuẩn mới */}
                  <div className="bg-[var(--panel)] border border-[var(--line)] rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-bold uppercase text-rose-800 dark:text-rose-400">
                      Chỉnh tay Thành phần Tên File ([SốHiệu]-[Năm]_[LoạiVB]-[CơQuan]_[LĩnhVực]_[TríchYếu])
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="block text-[11px] text-[var(--chu-m)] mb-1">
                          Ngành (Nhóm QLVB)
                        </label>
                        <select
                          value={namingForm.industry}
                          onChange={e => setNamingForm({ ...namingForm, industry: e.target.value })}
                          className="w-full bg-[var(--giay)] border border-[var(--line-d)] rounded-lg px-2.5 py-2 text-xs text-[var(--chu)]"
                        >
                          {TAXONOMY_3D.industries.map(item => (
                            <option key={item.code} value={item.code}>
                              {item.code} — {item.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-rose-800 dark:text-rose-400 font-bold mb-1">
                          [LoạiVB / LoạiHS]
                        </label>
                        <select
                          value={namingForm.docType}
                          onChange={e => setNamingForm({ ...namingForm, docType: e.target.value })}
                          className="w-full bg-[var(--giay)] border border-rose-500/60 rounded-lg px-2.5 py-2 text-xs text-rose-800 dark:text-rose-300 font-bold"
                        >
                          {TAXONOMY_3D.legalGroups.map(item => (
                            <option key={item.code} value={item.code}>
                              {item.code} — {item.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-[var(--chu-m)] mb-1">
                          Cơ quan ban hành
                        </label>
                        <select
                          value={namingForm.issuer}
                          onChange={e => setNamingForm({ ...namingForm, issuer: e.target.value })}
                          className="w-full bg-[var(--giay)] border border-[var(--line-d)] rounded-lg px-2.5 py-2 text-xs text-[var(--chu)]"
                        >
                          {TAXONOMY_3D.issuers.map(item => (
                            <option key={item.code} value={item.code}>
                              {item.code} — {item.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-[var(--chu-m)] mb-1">
                          [SốHiệu] (làm sạch: {formCleanedNumber})
                        </label>
                        <input
                          type="text"
                          value={namingForm.rawNumber}
                          onChange={e => setNamingForm({ ...namingForm, rawNumber: e.target.value })}
                          className="w-full bg-[var(--giay)] border border-[var(--line-d)] rounded-lg px-2.5 py-2 text-xs text-[var(--chu)] font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-[var(--chu-m)] mb-1">[Năm]</label>
                        <input
                          type="text"
                          maxLength={4}
                          value={namingForm.year}
                          onChange={e => setNamingForm({ ...namingForm, year: e.target.value })}
                          className="w-full bg-[var(--giay)] border border-[var(--line-d)] rounded-lg px-2.5 py-2 text-xs text-[var(--chu)] font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-amber-800 dark:text-amber-400 font-bold mb-1">
                          [LĩnhVực]
                        </label>
                        <select
                          value={namingForm.primaryDomain}
                          onChange={e =>
                            setNamingForm({
                              ...namingForm,
                              primaryDomain: e.target.value as FunctionalDomainCode,
                            })
                          }
                          className="w-full bg-[var(--giay)] border border-amber-500 rounded-lg px-2.5 py-2 text-xs text-amber-800 dark:text-amber-300 font-bold"
                        >
                          {TAXONOMY_3D.functionalDomains.map(item => (
                            <option key={item.code} value={item.code}>
                              {item.code} — {item.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] text-[var(--chu-m)] mb-1">
                          [TríchYếuNgắn] (cắt từ thừa · PascalCase ≤ 40 ký tự)
                        </label>
                        <input
                          type="text"
                          value={namingForm.rawSummary}
                          onChange={e =>
                            setNamingForm({ ...namingForm, rawSummary: e.target.value })
                          }
                          className="w-full bg-[var(--giay)] border border-[var(--line-d)] rounded-lg px-2.5 py-2 text-xs text-[var(--chu)]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-[var(--chu-m)] mb-1">
                          [-PhụLục]
                        </label>
                        <input
                          type="text"
                          value={namingForm.appendixSuffix}
                          onChange={e =>
                            setNamingForm({ ...namingForm, appendixSuffix: e.target.value })
                          }
                          placeholder="PL01, V02, KY"
                          className="w-full bg-[var(--giay)] border border-[var(--line-d)] rounded-lg px-2.5 py-2 text-xs text-[var(--chu)] font-mono"
                        />
                      </div>
                    </div>

                    {activeBatchItemId && (
                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={handleApplyNamingFormToActiveRow}
                          className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                        >
                          Áp dụng thay đổi vào dòng đang chọn
                        </button>
                      </div>
                    )}
                  </div>

                  {activeBatchItem && (
                    <div className="bg-[var(--panel)] border border-sky-500/35 rounded-xl p-4 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold uppercase text-sky-800 dark:text-sky-300">
                          🏷️ Smart Tags / Labels đang gắn trên dòng chọn
                        </span>
                        <span className="text-[10px] text-[var(--chu-m)]">
                          Bấm ✓ để chốt gợi ý · Bấm tên tag để sửa · × để xóa
                        </span>
                      </div>
                      {renderSmartTagsBlock(activeBatchItem, "DRAWER")}
                    </div>
                  )}

                  {/* Trục 2, Trục 3 & Gate */}
                  <div className="bg-[var(--panel)] border border-[var(--line)] rounded-xl p-4 space-y-4">
                    <div>
                      <div className="text-xs font-bold uppercase text-sky-800 dark:text-sky-400 mb-2">
                        Trục 2 — Loại hình Dự án áp dụng
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {TAXONOMY_3D.projectTypes.map(pt => {
                          const active = namingForm.projectAxes.includes(pt.code);
                          return (
                            <button
                              key={pt.code}
                              type="button"
                              onClick={() => toggleProjectAxis(pt.code)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs border transition cursor-pointer ${
                                active
                                  ? "bg-sky-500/20 border-sky-400 text-sky-900 dark:text-sky-200 font-bold"
                                  : "bg-[var(--giay)] border-[var(--line)] text-[var(--chu-m)]"
                              }`}
                            >
                              {active ? "✓ " : "+ "}
                              {pt.code}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold uppercase text-amber-800 dark:text-amber-400 mb-2">
                        Trục 3 — Lĩnh vực Chức năng
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {TAXONOMY_3D.functionalDomains.map(d => {
                          const active = namingForm.secondaryDomains.includes(d.code);
                          return (
                            <button
                              key={d.code}
                              type="button"
                              onClick={() => toggleSecondaryDomain(d.code)}
                              className={`px-2 py-1 rounded-lg text-xs border transition cursor-pointer ${
                                active
                                  ? "bg-amber-500/20 border-amber-500 text-amber-800 dark:text-amber-300 font-bold"
                                  : "bg-[var(--giay)] border-[var(--line)] text-[var(--chu-m)]"
                              }`}
                            >
                              {active ? "✓ " : "+ "}
                              {d.code}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold uppercase text-emerald-800 dark:text-emerald-400 mb-2">
                        Ánh xạ Stage-Gate (Bước 3)
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {gates.map(g => {
                          const active = namingForm.linkedGates.includes(g.gate);
                          return (
                            <button
                              key={g.gate}
                              type="button"
                              onClick={() => toggleLinkedGate(g.gate)}
                              className={`px-2 py-1 rounded text-xs font-mono border transition cursor-pointer ${
                                active
                                  ? "bg-emerald-500/20 border-emerald-400 text-emerald-800 dark:text-emerald-300 font-bold"
                                  : "bg-[var(--giay)] border-[var(--line)] text-[var(--chu-m)]"
                              }`}
                            >
                              {active ? "✓ " : ""}
                              {g.gate}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: CÔNG CỤ HÀNG LOẠT, TÌM/THAY THẾ, SCRIPT .PS1 & NHẬT KÝ HOÀN TÁC */}
              {advancedTab === "BATCH_TOOLS" && (
                <div className="space-y-4">
                  {/* Chế độ đọc & Quy chuẩn đặt tên */}
                  <div className="bg-[var(--panel)] border border-[var(--line)] rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-bold uppercase text-sky-800 dark:text-sky-400">
                      Quy chuẩn đặt tên & Chế độ đọc tài liệu
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[11px] text-amber-800 dark:text-amber-400 font-semibold mb-1">
                          Chuẩn đặt tên File hàng loạt
                        </label>
                        <select
                          value={batchNamingStandard}
                          onChange={e =>
                            handleRecomputeBatchNames(
                              e.target.value as QlvbNamingGroupCode,
                              folderNamingPreset
                            )
                          }
                          className="w-full bg-[var(--giay)] border border-[var(--line-d)] rounded-lg px-2.5 py-2 text-xs text-[var(--chu)]"
                        >
                          <option value="SSOT_9PART">
                            Chuẩn VBPL Thống Nhất ([SốHiệu]-[Năm]_[LoạiVB]-[CơQuan]_[LĩnhVực]_[TríchYếu])
                          </option>
                          <option value="PL">Nhóm PL — Văn bản Pháp luật</option>
                          <option value="HC">Nhóm HC — Văn bản Hành chính</option>
                          <option value="KT">Nhóm KT — Kỹ thuật / Nghiệm thu</option>
                          <option value="TK">Nhóm TK — Thiết kế / Bản vẽ / BIM</option>
                          <option value="PLDA">Nhóm PLDA — Pháp lý Dự án & HĐ</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-sky-800 dark:text-sky-400 font-semibold mb-1">
                          Chuẩn đổi tên Thư mục
                        </label>
                        <select
                          value={folderNamingPreset}
                          onChange={e =>
                            handleRecomputeBatchNames(
                              batchNamingStandard,
                              e.target.value as FolderNamingPresetCode
                            )
                          }
                          className="w-full bg-[var(--giay)] border border-[var(--line-d)] rounded-lg px-2.5 py-2 text-xs text-[var(--chu)]"
                        >
                          <option value="STAGE_GATE_ISO">
                            ISO 19650 Stage-Gate ({activeProjectArchetype}_G12_CDE)
                          </option>
                          <option value="QLVB_5GROUP">Theo 5 Nhóm QLVB</option>
                          <option value="AXIS_3D_STANDARD">Theo Tọa độ 3 Trục</option>
                        </select>
                      </div>
                    </div>

                    {renderSsotTwoLayerExamples(true)}

                    <div className="flex items-center justify-between bg-[var(--giay)] border border-[var(--line)] rounded-lg p-3 text-xs">
                      <div>
                        <div className="font-semibold text-emerald-800 dark:text-emerald-300">
                          {deepScanReadMode
                            ? "🔍 Deep Scan (15 trang PDF + OCR V1–V4)"
                            : "⚡ Quick Scan (3 trang đầu)"}
                        </div>
                        <div className="text-[11px] text-[var(--chu-m)]">
                          Bật Deep Scan để đọc sâu văn bản nhiều trang khi kéo-thả file mới
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDeepScanReadMode(prev => !prev)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold border cursor-pointer ${
                          deepScanReadMode
                            ? "bg-emerald-500 text-slate-950 border-emerald-300"
                            : "bg-[var(--giay-d)] text-[var(--chu-m)] border-[var(--line-d)]"
                        }`}
                      >
                        {deepScanReadMode ? "ĐANG BẬT" : "ĐANG TẮT"}
                      </button>
                    </div>
                  </div>

                  {/* Tìm & Thay thế, Gắn hậu tố, Đánh số */}
                  <div className="bg-[var(--panel)] border border-[var(--line)] rounded-xl p-4 space-y-3 text-xs">
                    <h4 className="text-xs font-bold uppercase text-amber-800 dark:text-amber-400">
                      Đổi tên hàng loạt (Áp dụng cho {selectedItems.length} mục đang chọn)
                    </h4>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={batchFindText}
                        onChange={e => setBatchFindText(e.target.value)}
                        placeholder="Tìm từ khóa (VD: KCN, 2025)..."
                        className="flex-1 min-w-[140px] bg-[var(--giay)] border border-[var(--line-d)] rounded-lg px-2.5 py-1.5 text-[var(--chu)]"
                      />
                      <span className="text-[var(--chu-nhat)]">→</span>
                      <input
                        type="text"
                        value={batchReplaceText}
                        onChange={e => setBatchReplaceText(e.target.value)}
                        placeholder="Thay bằng..."
                        className="flex-1 min-w-[140px] bg-[var(--giay)] border border-[var(--line-d)] rounded-lg px-2.5 py-1.5 text-[var(--chu)]"
                      />
                      <button
                        type="button"
                        onClick={() => handleBatchFindReplaceAndFormat("FIND_REPLACE")}
                        className="px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-800 dark:text-sky-300 font-semibold cursor-pointer"
                      >
                        Thay thế
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={batchSuffixInput}
                        onChange={e => setBatchSuffixInput(e.target.value)}
                        placeholder="Hậu tố: PL01, V02, KY..."
                        className="flex-1 min-w-[160px] bg-[var(--giay)] border border-[var(--line-d)] rounded-lg px-2.5 py-1.5 text-[var(--chu)] font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => handleBatchFindReplaceAndFormat("APPLY_SUFFIX")}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-800 dark:text-amber-300 font-semibold cursor-pointer"
                      >
                        + Gắn hậu tố
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBatchFindReplaceAndFormat("AUTO_NUMBER")}
                        className="px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-800 dark:text-purple-300 font-semibold cursor-pointer"
                      >
                        🔢 Đánh số 001..N
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicateSha256Action("SIMULATE_DUP")}
                        className="px-3 py-1.5 rounded-lg bg-[var(--giay-d)] hover:bg-[var(--giay-d)] border border-[var(--line-d)] text-sky-800 dark:text-sky-300 font-semibold cursor-pointer"
                      >
                        🧬 Test trùng SHA
                      </button>
                    </div>
                  </div>

                  {/* Xuất Script .PS1 & Bảng đối chiếu CSV */}
                  <div className="bg-[var(--panel)] border border-[var(--line)] rounded-xl p-4 space-y-2.5 text-xs">
                    <h4 className="text-xs font-bold uppercase text-emerald-800 dark:text-emerald-400">
                      Xuất Script đổi tên ổ cứng & Bảng đối chiếu
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleExportBatchRenameArtifact("PS1")}
                        className="px-3.5 py-2 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-800 dark:text-sky-300 font-bold cursor-pointer"
                      >
                        💻 Xuất Script .PS1 (PowerShell)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportBatchRenameArtifact("CSV")}
                        className="px-3.5 py-2 rounded-lg bg-[var(--giay-d)] hover:bg-[var(--giay-d)] border border-[var(--line-d)] text-amber-800 dark:text-amber-300 font-bold cursor-pointer"
                      >
                        📊 Xuất Bảng đối chiếu .CSV
                      </button>
                    </div>
                  </div>

                  {/* Nhật ký Đổi tên & Hoàn tác (LOG_DOITEN) */}
                  <div className="bg-[var(--panel)] border border-[var(--line)] rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase text-[var(--chu-m)]">
                        📜 Nhật ký Hoàn tác (LOG_DOITEN · {renameLogs.length})
                      </h4>
                      <span className="text-[10px] font-mono text-[var(--chu-m)]">
                        SHA-256 Verified
                      </span>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {renameLogs.map(log => (
                        <div
                          key={log.logId}
                          className={`p-2.5 rounded-lg border text-xs space-y-1 ${
                            log.isReverted
                              ? "bg-[var(--giay)] border-[var(--line)] opacity-60"
                              : "bg-[var(--giay)] border-[var(--line)]"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 font-mono text-[10px]">
                            <span className="text-amber-800 dark:text-amber-300 font-bold flex items-center gap-1.5 flex-wrap">
                              <span>
                                {log.logId} · {log.qlvbGroup} · CDE {log.cdeStatus || "S0"}
                              </span>
                              {log.persistedInSqlite && (
                                <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/35 text-[9px]">
                                  SQLite ACID{log.operationMode ? ` · ${log.operationMode}` : ""}
                                </span>
                              )}
                            </span>
                            <span className="text-[var(--chu-m)]">{log.timestamp}</span>
                          </div>
                          <div className="text-[11px] text-[var(--chu-m)] truncate">
                            Cũ: {log.oldName}
                          </div>
                          <div className="text-[11px] font-mono text-emerald-800 dark:text-emerald-400 truncate">
                            Mới: {log.newName}
                          </div>
                          <div className="flex items-center justify-between pt-1 text-[10px]">
                            <span className="text-[var(--chu-nhat)] font-mono">
                              SHA256: {log.sha256Before}
                            </span>
                            {log.isReverted ? (
                              <span className="text-rose-800 dark:text-rose-400 font-bold">Đã hoàn tác</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleUndoRenameLog(log)}
                                className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-800 dark:text-amber-300 font-bold cursor-pointer"
                              >
                                ↩️ Hoàn tác
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* MODAL XEM TÀI LIỆU GỐC & 29 BIỂU MẪU BẢO MẬT (ZERO-TRUST PROXY) */}
      <SecureDocumentViewerModal
        isOpen={isSecurePdfOpen}
        onClose={() => setIsSecurePdfOpen(false)}
        fileName={securePdfTarget.fileName}
        docTitle={securePdfTarget.docTitle}
        docNumber={securePdfTarget.docNumber}
        folderName={securePdfTarget.folderName}
        viewerMode={securePdfTarget.viewerMode}
      />
    </div>
  );
};
