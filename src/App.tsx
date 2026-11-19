import React, { useState, useMemo, useRef, useEffect } from 'react';
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
} from './data/lexPmoData';
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
} from './types/lexPmoTypes';
import {
  classifyProjectCutoffRegime,
  DEFAULT_PROJECT_MILESTONES_MAP,
  evaluateLegalDocumentCutoff,
  PRESET_LEGACY_2023_2024,
  PRESET_NEW_2026,
} from './utils/legalCutoffEngine';
import {
  CDE_ISO_19650_META,
  CDE_ISO_19650_PIPELINE,
  computeFullSha256Hex,
  FOUR_PARTY_ROLES,
  getRaciActionPermissions,
} from './utils/rbacRaciHelpers';
import {
  buildAutoSuggestedTags,
  buildFileNameByRule,
  buildStandardFolderPath,
  cleanDocNumber,
  computeSha256Short,
  createSampleBatchItems,
  detectQlvbGroup,
  extractOcrZonesFromText,
  extractTextFromFileEnhanced,
  formatFileSize,
  normalizeSsotDocType,
  parseVietnameseLegalText,
  removeVietnameseTones,
  resolveDocTaxonomyFromTags,
  smartAnalyzeFile3D,
  syncSuggestionWithSmartTags,
  toPascalCaseVN,
  validateBatchFileName,
} from './utils/legalParser';
import {
  DIFF_CATEGORY_META,
  extractLocalSemanticCues,
  splitTextByHighlightTargets,
} from './utils/legalCompareHighlighter';
import { DigitalSignoffModal } from './components/layout/DigitalSignoffModal';
import { TopRoleSwitcherHeader } from './components/layout/TopRoleSwitcherHeader';
import { Step1CdeIngestion } from './components/steps/Step1CdeIngestion';
import { Step2LegalMatrix } from './components/steps/Step2LegalMatrix';
import { Step3StageGate } from './components/steps/Step3StageGate';
import { Step4RaciHr } from './components/steps/Step4RaciHr';
import { Step5CommandCenter } from './components/steps/Step5CommandCenter';
import {
  analyzeLegalWithHybridAi,
  compareClausesWithHybridAi,
  fetchRoleGuardStatus,
  probeHybridServices,
  RoleGuardStatus,
  syncAuditLogEntry,
  toCanonicalGuardRole,
} from './services/ssotBridgeService';

const LEX_PMO_UNLOCKED_ROLES_KEY = 'lex_pmo_unlocked_roles_v1';
const LEX_PMO_ACTIVE_ACTOR_KEY = 'lex_pmo_active_actor_id_v1';

type ElevatedGuardRole = 'CDT' | 'PMU' | 'TVGS';

function readUnlockedRolesFromSession(): ElevatedGuardRole[] {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return [];
    const raw = window.sessionStorage.getItem(LEX_PMO_UNLOCKED_ROLES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is ElevatedGuardRole => r === 'CDT' || r === 'PMU' || r === 'TVGS'
    );
  } catch {
    return [];
  }
}

function writeUnlockedRolesToSession(roles: ElevatedGuardRole[]): void {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(LEX_PMO_UNLOCKED_ROLES_KEY, JSON.stringify(roles));
    }
  } catch {
    // Ignore storage quota/security errors
  }
}

function readSavedActorIdFromSession(): string | null {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return null;
    const raw = window.sessionStorage.getItem(LEX_PMO_ACTIVE_ACTOR_KEY);
    return raw && raw.trim() ? raw.trim() : null;
  } catch {
    return null;
  }
}

function writeSavedActorIdToSession(actorId: string): void {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(LEX_PMO_ACTIVE_ACTOR_KEY, actorId);
    }
  } catch {
    // Ignore storage quota/security errors
  }
}

type MainStepTab =
  | 'STEP1_INGEST'
  | 'STEP2_VBPL'
  | 'STEP3_PLAN'
  | 'STEP4_EXECUTE'
  | 'STEP5_AUDIT'
  | 'STEP6_AI';

const PROJECT_ARCHETYPE_ICONS: Record<ProjectArchetypeCode, string> = {
  HTKT: '🛣️',
  DAN_DUNG: '🏢',
  KCN: '🏭',
  CCN: '⚙️',
  FTZ: '🚢',
  PPP_BT: '🤝',
};

type ProjectPhaseFilter = 'ALL' | 'CHUAN_BI' | 'THUC_HIEN' | 'KET_THUC';

const PROJECT_PHASE_META: {
  id: Exclude<ProjectPhaseFilter, 'ALL'>;
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
    id: 'CHUAN_BI',
    label: 'Chuẩn bị',
    shortLabel: 'Chuẩn bị',
    icon: '📋',
    gates: ['G0', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6'],
    gateRangeLabel: 'G0–G6',
    desc: 'Chủ trương ĐT, Quy hoạch, Đất đai, ĐTM, PCCC, BCNCKT & TKCS',
    activeClass: 'bg-sky-500 text-slate-950 border-sky-300 font-bold shadow-xs',
    badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  },
  {
    id: 'THUC_HIEN',
    label: 'Thực hiện',
    shortLabel: 'Thực hiện',
    icon: '🏗️',
    gates: ['G7', 'G8', 'G9', 'G10', 'G11', 'G12', 'G13'],
    gateRangeLabel: 'G7–G13',
    desc: 'TKBVTC - Dự toán, GPXD, Đấu thầu, Ký HĐ, Thi công, Nghiệm thu & Tạm ứng/TT',
    activeClass: 'bg-amber-500 text-slate-950 border-amber-300 font-bold shadow-xs',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  {
    id: 'KET_THUC',
    label: 'Kết thúc',
    shortLabel: 'Kết thúc',
    icon: '🏁',
    gates: ['G14', 'G15'],
    gateRangeLabel: 'G14–G15',
    desc: 'Nghiệm thu hoàn thành đưa vào sử dụng, Bàn giao, Quyết toán vốn & Bảo hành',
    activeClass: 'bg-emerald-500 text-slate-950 border-emerald-300 font-bold shadow-xs',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
];

function matchesDocProjectPhase(doc: LegalDocument, phase: ProjectPhaseFilter): boolean {
  if (phase === 'ALL') return true;
  if (phase === 'CHUAN_BI') {
    return (
      doc.linkedGates.some(g => ['G0', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6'].includes(g)) ||
      ['DTU', 'QHDD'].includes(doc.primaryDomain)
    );
  }
  if (phase === 'THUC_HIEN') {
    return (
      doc.linkedGates.some(g => ['G7', 'G8', 'G9', 'G10', 'G11', 'G12', 'G13'].includes(g)) ||
      ['DTH', 'QLHD', 'QLCP', 'QLCL', 'VLXD', 'TCVN', 'QCVN', 'ATLD'].includes(doc.primaryDomain)
    );
  }
  if (phase === 'KET_THUC') {
    return (
      doc.linkedGates.some(g => ['G14', 'G15'].includes(g)) ||
      doc.primaryDomain === 'TQT' ||
      doc.secondaryDomains.includes('TQT')
    );
  }
  return true;
}

function matchesDossierProjectPhase(gateRef: string, phase: ProjectPhaseFilter): boolean {
  if (phase === 'ALL') return true;
  if (phase === 'CHUAN_BI') return ['G0', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6'].includes(gateRef);
  if (phase === 'THUC_HIEN') return ['G7', 'G8', 'G9', 'G10', 'G11', 'G12', 'G13'].includes(gateRef);
  if (phase === 'KET_THUC') return ['G14', 'G15'].includes(gateRef);
  return true;
}

export function useLexPmoOrchestrator() {
  // ==========================================================================
  // GLOBAL NAVIGATION & RBAC ACTOR CONTEXT
  // ==========================================================================
  const [activeTab, setActiveTab] = useState<MainStepTab>('STEP2_VBPL');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isStep2SidebarExpanded, setIsStep2SidebarExpanded] = useState(true);
  const [sidebarWidthPx, setSidebarWidthPx] = useState<number>(145);
  const [isCol1SubDomainMenuOpen, setIsCol1SubDomainMenuOpen] = useState(false);
  const [col1ViewMode, setCol1ViewMode] = useState<'BY_15_INDUSTRIES' | 'BY_SUBDOMAINS' | 'BY_PROJECT'>('BY_15_INDUSTRIES');
  const [expandedStandaloneSubDomains, setExpandedStandaloneSubDomains] = useState<Record<string, boolean>>({
    QLCL: true,
    QLHD: true,
    QLCP: false,
    HDXD: false,
  });
  const [expandedStandaloneProjects, setExpandedStandaloneProjects] = useState<Record<string, boolean>>({
    KCN: true,
    HTKT: false,
    DAN_DUNG: false,
    CCN: false,
    FTZ: false,
    PPP_BT: false,
  });
  const [projectCardSubTab, setProjectCardSubTab] = useState<Record<string, 'VBPL' | 'HSDA'>>({});
  const [vbplProjectPhaseFilter, setVbplProjectPhaseFilter] = useState<ProjectPhaseFilter>('ALL');
  // Chế độ hiển thị thẻ VBPL trong Cột 1 ("Dự án"): Nhóm theo Cấp độ Gate (mặc định) hoặc Danh sách phẳng
  const [projectDocGroupMode, setProjectDocGroupMode] = useState<'BY_GATE' | 'FLAT'>('BY_GATE');
  const [expandedProjectGates, setExpandedProjectGates] = useState<Record<string, boolean>>({});
  const [vbplGateFilter, setVbplGateFilter] = useState<string>('ALL');
  const [globalSearch, setGlobalSearch] = useState('');

  // ==========================================================================
  // HỆ THỐNG CO GIÃN CỘT LINH HOẠT (FLEXIBLE COLUMN RESIZING ENGINE)
  // ==========================================================================
  type DragSplitterId =
    | 'SIDEBAR'
    | 'STEP1_SPLIT'
    | 'VBPL_SPLIT_1'
    | 'VBPL_SPLIT_2'
    | 'STEP3_SPLIT_1'
    | 'STEP3_SPLIT_2'
    | 'STEP4_SPLIT_1'
    | 'STEP4_SPLIT_2';

  const [activeDragSplitter, setActiveDragSplitter] = useState<DragSplitterId | null>(null);
  const workspaceMainRef = useRef<HTMLElement | null>(null);

  // Tỷ lệ % các cột cho từng Bước
  const [step1LeftPct, setStep1LeftPct] = useState<number>(56);
  const [vbplCol1Pct, setVbplCol1Pct] = useState<number>(18);
  const [vbplCol2Pct, setVbplCol2Pct] = useState<number>(26);
  const [isVbplCol1Collapsed, setIsVbplCol1Collapsed] = useState<boolean>(false);
  const [isVbplCol2Collapsed, setIsVbplCol2Collapsed] = useState<boolean>(false);

  const [step3Col1Pct, setStep3Col1Pct] = useState<number>(24);
  const [step3Col2Pct, setStep3Col2Pct] = useState<number>(42);

  const [step4Col1Pct, setStep4Col1Pct] = useState<number>(24);
  const [step4Col2Pct, setStep4Col2Pct] = useState<number>(42);

  useEffect(() => {
    if (!activeDragSplitter) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (activeDragSplitter === 'SIDEBAR') {
        const nextWidth = Math.max(96, Math.min(320, e.clientX));
        setSidebarWidthPx(nextWidth);
        if (isSidebarCollapsed) setIsSidebarCollapsed(false);
        return;
      }

      const container = workspaceMainRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0) return;
      const relPct = ((e.clientX - rect.left) / rect.width) * 100;

      if (activeDragSplitter === 'STEP1_SPLIT') {
        setStep1LeftPct(Math.max(28, Math.min(72, Math.round(relPct * 10) / 10)));
      } else if (activeDragSplitter === 'VBPL_SPLIT_1') {
        const clampedCol1 = Math.max(11, Math.min(36, Math.round(relPct * 10) / 10));
        if (isVbplCol1Collapsed) setIsVbplCol1Collapsed(false);
        setVbplCol1Pct(clampedCol1);
      } else if (activeDragSplitter === 'VBPL_SPLIT_2') {
        const effectiveCol1 = isVbplCol1Collapsed ? 2.5 : vbplCol1Pct;
        const rawCol2 = relPct - effectiveCol1;
        const maxCol2 = Math.min(48, 74 - effectiveCol1);
        const clampedCol2 = Math.max(15, Math.min(maxCol2, Math.round(rawCol2 * 10) / 10));
        if (isVbplCol2Collapsed) setIsVbplCol2Collapsed(false);
        setVbplCol2Pct(clampedCol2);
      } else if (activeDragSplitter === 'STEP3_SPLIT_1') {
        setStep3Col1Pct(Math.max(15, Math.min(36, Math.round(relPct * 10) / 10)));
      } else if (activeDragSplitter === 'STEP3_SPLIT_2') {
        const rawCol2 = relPct - step3Col1Pct;
        setStep3Col2Pct(Math.max(24, Math.min(56, Math.round(rawCol2 * 10) / 10)));
      } else if (activeDragSplitter === 'STEP4_SPLIT_1') {
        setStep4Col1Pct(Math.max(15, Math.min(36, Math.round(relPct * 10) / 10)));
      } else if (activeDragSplitter === 'STEP4_SPLIT_2') {
        const rawCol2 = relPct - step4Col1Pct;
        setStep4Col2Pct(Math.max(24, Math.min(56, Math.round(rawCol2 * 10) / 10)));
      }
    };

    const handleMouseUp = () => {
      setActiveDragSplitter(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [
    activeDragSplitter,
    isSidebarCollapsed,
    isVbplCol1Collapsed,
    isVbplCol2Collapsed,
    vbplCol1Pct,
    step3Col1Pct,
    step4Col1Pct,
  ]);

  const startResizeSplitter = (id: DragSplitterId, e: React.MouseEvent) => {
    e.preventDefault();
    setActiveDragSplitter(id);
  };

  const renderVerticalSplitter = (params: {
    id: DragSplitterId;
    onDoubleClickReset: () => void;
    lightTheme?: boolean;
    label?: string;
  }) => {
    const isDraggingThis = activeDragSplitter === params.id;
    return (
      <div
        onMouseDown={e => startResizeSplitter(params.id, e)}
        onDoubleClick={params.onDoubleClickReset}
        title="Kéo trái/phải để co giãn cột · Nhấp đúp (Double-click) để đặt lại kích thước chuẩn"
        className={`group relative w-1.5 shrink-0 cursor-col-resize flex items-center justify-center select-none transition-colors z-20 ${
          isDraggingThis
            ? 'bg-amber-500'
            : params.lightTheme
            ? 'bg-slate-300/90 hover:bg-amber-500'
            : 'bg-slate-800/90 hover:bg-amber-500'
        }`}
      >
        <div
          className={`h-10 w-1 rounded-full transition-all flex items-center justify-center ${
            isDraggingThis
              ? 'bg-slate-950 scale-y-125'
              : params.lightTheme
              ? 'bg-slate-500/60 group-hover:bg-slate-950'
              : 'bg-slate-600 group-hover:bg-slate-950'
          }`}
        />
        {isDraggingThis && params.label && (
          <div className="absolute top-3 left-2.5 px-2 py-0.5 rounded bg-slate-950 text-amber-400 border border-amber-500/50 font-mono text-[10px] font-bold whitespace-nowrap shadow-xl pointer-events-none">
            {params.label}
          </div>
        )}
      </div>
    );
  };

  // Trục Y toàn cục: Loại hình dự án đang điều hành
  const [activeProjectArchetype, setActiveProjectArchetype] = useState<ProjectArchetypeCode>('KCN');
  const [activeProjectName, setActiveProjectName] = useState('DA Đầu tư Hạ tầng KCN / Khu Đô Thị Đại Sơn');

  // Nhân sự đang đăng nhập (Cross-Entity Actor cho RBAC & AuditLog)
  const [employees, setEmployees] = useState<EmployeeUser[]>(INITIAL_EMPLOYEES);
  const [unlockedRoles, setUnlockedRoles] = useState<ElevatedGuardRole[]>(() =>
    readUnlockedRolesFromSession()
  );
  const [roleGuardStatus, setRoleGuardStatus] = useState<RoleGuardStatus & { checked: boolean }>({
    checked: false,
    protected: true,
    demoMode: false,
    guardedRoles: ['CDT', 'PMU', 'TVGS'],
  });
  const [currentActorId, setCurrentActorId] = useState<string>(() => {
    const savedActorId = readSavedActorIdFromSession();
    const initialUnlocked = readUnlockedRolesFromSession();
    if (savedActorId) {
      const matched = INITIAL_EMPLOYEES.find(e => e.id === savedActorId);
      if (matched) {
        const canonical = toCanonicalGuardRole(matched.rbacRole);
        if (
          canonical === 'CONTRACTOR' ||
          initialUnlocked.includes(canonical as ElevatedGuardRole)
        ) {
          return savedActorId;
        }
      }
    }
    return 'EMP-05';
  });

  useEffect(() => {
    let active = true;
    void fetchRoleGuardStatus().then(status => {
      if (!active) return;
      if (!status) {
        setRoleGuardStatus({
          checked: true,
          protected: true,
          demoMode: false,
          guardedRoles: ['CDT', 'PMU', 'TVGS'],
        });
        return;
      }

      setRoleGuardStatus({
        checked: true,
        ...status,
      });

      const savedActorId = readSavedActorIdFromSession();
      const sessionUnlocked = readUnlockedRolesFromSession();

      if (status.demoMode && !status.protected) {
        if (!savedActorId) {
          setCurrentActorId('EMP-01');
        } else if (INITIAL_EMPLOYEES.some(e => e.id === savedActorId)) {
          setCurrentActorId(savedActorId);
        }
        return;
      }

      setCurrentActorId(prevId => {
        const currentEmp = INITIAL_EMPLOYEES.find(e => e.id === prevId);
        if (!currentEmp) return 'EMP-05';
        const canonical = toCanonicalGuardRole(currentEmp.rbacRole);
        if (
          canonical !== 'CONTRACTOR' &&
          status.guardedRoles.includes(canonical as ElevatedGuardRole) &&
          !sessionUnlocked.includes(canonical as ElevatedGuardRole)
        ) {
          return 'EMP-05';
        }
        return prevId;
      });
    });

    return () => {
      active = false;
    };
  }, []);

  const handleUnlockRole = (role: ElevatedGuardRole) => {
    setUnlockedRoles(prev => {
      const next = prev.includes(role) ? prev : [...prev, role];
      writeUnlockedRolesToSession(next);
      return next;
    });
  };

  const handleLockAllRoles = () => {
    setUnlockedRoles([]);
    writeUnlockedRolesToSession([]);
    setCurrentActorId('EMP-05');
    writeSavedActorIdToSession('EMP-05');
  };

  const handleSelectActorId = (employeeId: string) => {
    setCurrentActorId(employeeId);
    writeSavedActorIdToSession(employeeId);
  };

  const currentActor = useMemo(
    () => employees.find(e => e.id === currentActorId) || employees[0],
    [employees, currentActorId]
  );

  const raciPerms = useMemo(
    () => getRaciActionPermissions(currentActor.rbacRole),
    [currentActor.rbacRole]
  );

  const [pendingDigitalSignoff, setPendingDigitalSignoff] = useState<PendingDigitalSignoff | null>(
    null
  );
  const [gateTvgsVerifiedMap, setGateTvgsVerifiedMap] = useState<Record<string, boolean>>({});

  const [projectProfiles, setProjectProfiles] = useState<ProjectArchetypeItem[]>(
    TAXONOMY_3D.projectTypes
  );
  const [legalDocs, setLegalDocs] = useState<LegalDocument[]>(INITIAL_LEGAL_DOCS);
  const [gates, setGates] = useState<StageGateItem[]>(INITIAL_GATES);
  const [approvalWorkflows, setApprovalWorkflows] = useState<ApprovalWorkflowItem[]>(INITIAL_APPROVAL_WORKFLOWS);
  const [raciTasks, setRaciTasks] = useState<RaciTaskItem[]>(INITIAL_RACI_TASKS);
  const [projectAssets, setProjectAssets] = useState<ProjectAssetItem[]>(INITIAL_ASSETS);
  const [qaqcControlRecords, setQaqcControlRecords] = useState<QaQcGateControlItem[]>(
    INITIAL_QAQC_CONTROLS
  );
  const [voAppendixApproved, setVoAppendixApproved] = useState<boolean>(false);
  const [voState, setVoState] = useState({
    contractType: 'TRON_GOI',
    isOutsideScope: 'YES',
    exceedsPkgPrice: 'NO',
    affectsSafetyPCCC: 'NO',
  });
  const [chronoDates, setChronoDates] = useState({
    sampleDate: '2026-10-05',
    labResultDate: '2026-10-12',
    materialApproveDate: '2026-10-13',
    workInspectDate: '2026-10-10',
  });
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3800);
  };

  // Đồng bộ AuditLog lên server & state (Hỗ trợ lưu kèm Mã băm SHA-256 & Ý kiến giải trình)
  const recordAuditLog = async (params: {
    module: AuditLogEntry['module'];
    action: string;
    entityRef: string;
    previousState?: string;
    newState: string;
    riskSeverity?: AuditLogEntry['riskSeverity'];
    sha256Hash?: string;
    accountabilityNote?: string;
  }) => {
    const nowIso = new Date().toLocaleString('sv-SE');
    const resolvedHash =
      params.sha256Hash ||
      (await computeFullSha256Hex(
        `${currentActor.id}|${currentActor.rbacRole}|${params.module}|${params.action}|${params.entityRef}|${params.newState}|${nowIso}`
      ));

    const newEntry: AuditLogEntry = {
      id: `AUD-2026-${String(auditLogs.length + 1).padStart(4, '0')}`,
      timestamp: nowIso,
      actorId: currentActor.id,
      actorName: currentActor.fullName,
      actorRole: `${currentActor.rbacRole} (${currentActor.raciDefault})`,
      module: params.module,
      action: params.action,
      entityRef: params.entityRef,
      previousState: params.previousState,
      newState: params.newState,
      riskSeverity: params.riskSeverity || 'NOMINAL',
      sha256Hash: resolvedHash,
      accountabilityNote: params.accountabilityNote,
    };
    setAuditLogs(prev => [newEntry, ...prev]);

    await syncAuditLogEntry(newEntry, currentActor.rbacRole);
  };

  const currentArchetypeMeta = useMemo(
    () => projectProfiles.find(p => p.code === activeProjectArchetype) || projectProfiles[0],
    [projectProfiles, activeProjectArchetype]
  );

  const chronoAuditStatus = useMemo(() => {
    const dSample = new Date(chronoDates.sampleDate);
    const dLab = new Date(chronoDates.labResultDate);
    const dMat = new Date(chronoDates.materialApproveDate);
    const dWork = new Date(chronoDates.workInspectDate);
    const errors: string[] = [];
    if (dLab < dSample) {
      errors.push('LỖI NGHIÊM TRỌNG (VLXD): Ngày xuất kết quả thí nghiệm LAS sớm hơn Ngày lấy mẫu hiện trường!');
    }
    if (dMat < dLab) {
      errors.push('LỖI QUY TRÌNH (QT-03 - VLXD): Nghiệm thu vật liệu đầu vào khi chưa có Kết quả thí nghiệm hợp chuẩn!');
    }
    if (dWork < dMat || dWork < dLab) {
      errors.push(
        'LỖI XUẤT TOÁN (RF-05 - QLCL): Ngày ký Biên bản nghiệm thu công việc xây dựng sớm hơn Ngày có kết quả thí nghiệm / nghiệm thu vật liệu đầu vào!'
      );
    }
    return errors;
  }, [chronoDates]);

  const formatVndBillions = (vnd: number) => {
    const ty = vnd / 1_000_000_000;
    return `${ty.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} tỷ VNĐ`;
  };

  const calcDaysUntilReference = (expiryDateStr: string) => {
    const refMs = new Date('2026-11-17T00:00:00').getTime();
    const targetMs = new Date(`${expiryDateStr}T00:00:00`).getTime();
    if (Number.isNaN(targetMs)) return 365;
    return Math.round((targetMs - refMs) / (1000 * 60 * 60 * 24));
  };

  // ==========================================================================
  // STATE BƯỚC 1: ĐỌC FILE/FOLDER ĐA NĂNG & ĐỔI TÊN HÀNG LOẠT (INGEST & BATCH RENAMER)
  // ==========================================================================
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzingFile, setIsAnalyzingFile] = useState(false);
  const [deepScanReadMode, setDeepScanReadMode] = useState(true);
  const [batchNamingStandard, setBatchNamingStandard] = useState<QlvbNamingGroupCode>('SSOT_9PART');
  const [folderNamingPreset, setFolderNamingPreset] =
    useState<FolderNamingPresetCode>('STAGE_GATE_ISO');
  const [batchFilterKind, setBatchFilterKind] = useState<'ALL' | 'FOLDER' | 'FILE' | 'ISSUE' | 'DUP_HASH'>('ALL');
  const [batchFilterCde, setBatchFilterCde] = useState<'ALL' | CdeIsoStatus>('ALL');
  const [batchFindText, setBatchFindText] = useState('');
  const [batchReplaceText, setBatchReplaceText] = useState('');
  const [batchSuffixInput, setBatchSuffixInput] = useState('');
  const [activeBatchItemId, setActiveBatchItemId] = useState<string | null>(null);
  const [step1RightSubTab, setStep1RightSubTab] = useState<
    'OCR_READER' | 'AST_CHAPTERS' | 'RENAME_LOG'
  >('OCR_READER');
  const [readerKeywordSearch, setReaderKeywordSearch] = useState('');

  const [droppedFilesQueue, setDroppedFilesQueue] = useState<AnalyzedFileItem[]>(() =>
    createSampleBatchItems('KCN', 'SSOT_9PART', 'STAGE_GATE_ISO')
  );
  const [renameLogs, setRenameLogs] = useState<RenameLogEntry[]>([
    {
      logId: 'LOG-2026-0001',
      timestamp: '2026-11-16 08:15:22',
      itemId: 'INIT-1',
      itemKind: 'FILE',
      oldFolderPath: '01_Ho so phap ly & giay phep KCN',
      newFolderPath: 'KCN_G12_CDE/QLCL_01HoSoPhapLyGiayPhepKcn',
      oldName: 'Nghi dinh 207-2026-ND-CP quan ly chat luong.pdf',
      newName: '207-2026_ND-CP_QLCL_QuanLyChatLuongCongTrinh-PLIIa.pdf',
      sha256Before: '8F4E0CC92A1B',
      sha256After: '8F4E0CC92A1B',
      actorName: 'TS. Trần Võ Đại Sơn',
      qlvbGroup: 'SSOT_9PART',
      cdeStatus: 'A1',
      isReverted: false,
    },
  ]);

  const [activeRawFile, setActiveRawFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const [namingForm, setNamingForm] = useState<NamingFormState>({
    industry: 'XD',
    docType: 'ND',
    issuer: 'CP',
    rawNumber: '207/2026/NĐ-CP',
    year: '2026',
    primaryDomain: 'QLCL',
    rawSummary: 'Quản lý chất lượng thi công và bảo trì công trình xây dựng',
    appendixSuffix: 'PLIIa',
    ext: 'pdf',
    projectAxes: ['HTKT', 'DAN_DUNG', 'KCN', 'CCN', 'FTZ', 'PPP_BT'],
    secondaryDomains: ['QLCL', 'VLXD', 'TCVN', 'QCVN', 'QLHD'],
    linkedGates: ['G12', 'G14', 'G15'],
    linkedQAQC: ['QT-01', 'QT-03', 'QT-08', 'QT-12'],
    status: 'Còn hiệu lực năm 2026',
    rawContentToParse: `CHÍNH PHỦ\nSố: 207/2026/NĐ-CP\nHà Nội, ngày 18 tháng 05 năm 2026\nChương I: QUY ĐỊNH CHUNG\nĐiều 1. Phạm vi điều chỉnh và đối tượng áp dụng\nNghị định này hướng dẫn chi tiết về quản lý chất lượng (QLCL), vật liệu xây dựng (VLXD), thi công xây dựng và bảo trì công trình xây dựng áp dụng cho dự án Dân dụng, Hạ tầng kỹ thuật, KCN, CCN, FTZ và PPP.\nĐiều 15. Quản lý Nhật ký thi công và Hồ sơ chất lượng\n1. Chủ đầu tư và Nhà thầu thống nhất mẫu Nhật ký thi công trước khi khởi công.\n2. Tư vấn giám sát kiểm tra và ký xác nhận hằng ngày.\nĐiều 21. Nghiệm thu công việc xây dựng\nBiên bản nghiệm thu công việc xây dựng là căn cứ bắt buộc để chuyển bước thi công và thanh toán khối lượng hoàn thành tại Gate G14.`,
  });

  const generatedFileName = useMemo(() => {
    return buildFileNameByRule({
      group: batchNamingStandard,
      industry: namingForm.industry,
      docType: namingForm.docType,
      issuer: namingForm.issuer,
      rawNumber: namingForm.rawNumber,
      year: namingForm.year,
      primaryDomain: namingForm.primaryDomain,
      rawSummary: namingForm.rawSummary,
      appendixSuffix: namingForm.appendixSuffix,
      ext: namingForm.ext,
      projectCode: activeProjectArchetype,
      gateCode: namingForm.linkedGates[0],
      linkedGates: namingForm.linkedGates,
    });
  }, [namingForm, batchNamingStandard, activeProjectArchetype]);

  const currentOcrZones = useMemo(
    () => extractOcrZonesFromText(generatedFileName, namingForm.rawContentToParse),
    [generatedFileName, namingForm.rawContentToParse]
  );

  const parsedPreviewNodes = useMemo(
    () => parseVietnameseLegalText(namingForm.rawContentToParse),
    [namingForm.rawContentToParse]
  );

  // Tự động kiểm tra tính hợp lệ & Phát hiện Trùng lặp Nội dung / Mã băm SHA-256 cho toàn bộ hàng đợi
  const validatedBatchQueue = useMemo(() => {
    const allNames = droppedFilesQueue.map(i => i.proposedName);
    const seenHashFirstName = new Map<string, string>();
    const repoHashToName = new Map<string, string>();
    renameLogs
      .filter(l => !l.isReverted && l.sha256After)
      .forEach(l => {
        if (!repoHashToName.has(l.sha256After)) {
          repoHashToName.set(l.sha256After, l.newName);
        }
      });

    // Reverse scan or forward scan: oldest/committed stays original, newer duplicate gets flagged
    const orderedForDup = [...droppedFilesQueue].reverse();
    const dupInfoById = new Map<string, { ofName: string; kind: 'IN_BATCH' | 'IN_REPO' }>();

    orderedForDup.forEach(item => {
      const h = (item.sha256Hash || '').trim().toUpperCase();
      if (!h) return;
      if (seenHashFirstName.has(h)) {
        dupInfoById.set(item.id, {
          ofName: seenHashFirstName.get(h)!,
          kind: 'IN_BATCH',
        });
      } else {
        seenHashFirstName.set(h, item.originalName);
        if (!item.isCommitted && repoHashToName.has(h)) {
          dupInfoById.set(item.id, {
            ofName: repoHashToName.get(h)!,
            kind: 'IN_REPO',
          });
        }
      }
    });

    return droppedFilesQueue.map(item => {
      const check = validateBatchFileName(
        item.proposedName,
        item.qlvbGroup || batchNamingStandard,
        item.suggestion.docType,
        item.suggestion.issuer,
        item.suggestion.rawSummary,
        allNames,
        item.itemKind || 'FILE'
      );
      const dupInfo = dupInfoById.get(item.id);
      const finalStatus =
        dupInfo && check.status === 'OK' ? 'TRUNG' : check.status;
      const finalMsg = dupInfo
        ? `Trùng nội dung SHA-256 với "${dupInfo.ofName}"`
        : check.message;

      return {
        ...item,
        cdeStatus: item.cdeStatus || 'S0',
        validationStatus: finalStatus,
        validationMessage: finalMsg,
        duplicateHashOf: dupInfo?.ofName,
        duplicateSourceKind: dupInfo?.kind,
      };
    });
  }, [droppedFilesQueue, batchNamingStandard, renameLogs]);

  const duplicateHashItems = useMemo(
    () => validatedBatchQueue.filter(i => Boolean(i.duplicateHashOf)),
    [validatedBatchQueue]
  );

  const filteredBatchQueue = useMemo(() => {
    return validatedBatchQueue.filter(item => {
      if (batchFilterCde !== 'ALL' && (item.cdeStatus || 'S0') !== batchFilterCde) return false;
      if (batchFilterKind === 'FOLDER') return item.itemKind === 'FOLDER';
      if (batchFilterKind === 'FILE') return item.itemKind !== 'FOLDER';
      if (batchFilterKind === 'ISSUE') return item.validationStatus !== 'OK';
      if (batchFilterKind === 'DUP_HASH') return Boolean(item.duplicateHashOf);
      return true;
    });
  }, [validatedBatchQueue, batchFilterKind, batchFilterCde]);

  const toggleProjectAxis = (code: ProjectArchetypeCode) => {
    setNamingForm(prev => {
      const exists = prev.projectAxes.includes(code);
      return {
        ...prev,
        projectAxes: exists ? prev.projectAxes.filter(i => i !== code) : [...prev.projectAxes, code],
      };
    });
  };

  const toggleSecondaryDomain = (code: FunctionalDomainCode) => {
    setNamingForm(prev => {
      const exists = prev.secondaryDomains.includes(code);
      return {
        ...prev,
        secondaryDomains: exists
          ? prev.secondaryDomains.filter(i => i !== code)
          : [...prev.secondaryDomains, code],
      };
    });
  };

  const toggleLinkedGate = (gateCode: string) => {
    setNamingForm(prev => {
      const exists = prev.linkedGates.includes(gateCode);
      return {
        ...prev,
        linkedGates: exists ? prev.linkedGates.filter(i => i !== gateCode) : [...prev.linkedGates, gateCode],
      };
    });
  };

  // Đọc & Phân tích hàng loạt File + Folder (hỗ trợ cả chọn nhiều file và chọn cả thư mục webkitRelativePath)
  const handleProcessFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    setIsAnalyzingFile(true);
    const analyzedQueue: AnalyzedFileItem[] = [];
    const seenFolders = new Set<string>();

    for (const file of files) {
      const relPath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || '';
      const pathParts = relPath ? relPath.split('/').filter(Boolean) : [];
      const parentFolder =
        pathParts.length > 1
          ? pathParts.slice(0, pathParts.length - 1).join('/')
          : '01_Thu_muc_Nguon_Ingest';

      // Nếu phát hiện thư mục mới khi đọc cả Folder -> Tạo mục FOLDER để đổi tên thư mục hàng loạt
      if (pathParts.length > 1 && !seenFolders.has(parentFolder)) {
        seenFolders.add(parentFolder);
        const folderSuggestion = smartAnalyzeFile3D(parentFolder, parentFolder);
        const folderGroup =
          batchNamingStandard === 'SSOT_9PART'
            ? 'SSOT_9PART'
            : detectQlvbGroup(folderSuggestion.docType, folderSuggestion.primaryDomain);
        const proposedFolder = buildStandardFolderPath({
          preset: folderNamingPreset,
          originalFolder: parentFolder,
          projectCode: activeProjectArchetype,
          primaryDomain: folderSuggestion.primaryDomain,
          gateCode: folderSuggestion.linkedGates[0] || 'G12',
          year: folderSuggestion.year,
          qlvbGroup: folderGroup,
          industry: folderSuggestion.industry,
        });
        const folderHash = await computeSha256Short(parentFolder);
        const folderSmartTags = buildAutoSuggestedTags(
          folderSuggestion,
          activeProjectArchetype,
          'SUGGESTED'
        );
        analyzedQueue.push({
          id: `FLD-${Math.random().toString(36).substring(2, 8)}`,
          rawFile: null,
          itemKind: 'FOLDER',
          originalName: parentFolder.split('/').pop() || parentFolder,
          originalFolderPath: parentFolder,
          proposedFolderPath: proposedFolder,
          extractedText: `THƯ MỤC ĐẦU VÀO: ${parentFolder}\nĐã quét tự động cấu trúc thư mục và chuẩn hóa theo chuẩn CDE Stage-Gate.`,
          suggestion: folderSuggestion,
          smartTags: folderSmartTags,
          proposedName: proposedFolder.split('/').pop() || proposedFolder,
          qlvbGroup: folderGroup,
          sha256Hash: folderHash,
          fileSizeLabel: 'Thư mục',
          readStatsLabel: 'Folder CDE',
          cdeStatus: 'S0',
          ocrZones: extractOcrZonesFromText(parentFolder, parentFolder),
          selected: true,
          isCommitted: false,
        });
      }

      const readRes = await extractTextFromFileEnhanced(file, deepScanReadMode);
      const extractedText = readRes.text;
      const suggestion = smartAnalyzeFile3D(file.name, extractedText);
      const itemGroup =
        batchNamingStandard === 'SSOT_9PART'
          ? 'SSOT_9PART'
          : detectQlvbGroup(suggestion.docType, suggestion.primaryDomain);

      const proposedFolder = buildStandardFolderPath({
        preset: folderNamingPreset,
        originalFolder: parentFolder,
        projectCode: activeProjectArchetype,
        primaryDomain: suggestion.primaryDomain,
        gateCode: suggestion.linkedGates[0] || 'G12',
        year: suggestion.year,
        qlvbGroup: itemGroup,
        industry: suggestion.industry,
      });

      const proposedName = buildFileNameByRule({
        group: itemGroup,
        industry: suggestion.industry,
        docType: suggestion.docType,
        issuer: suggestion.issuer,
        rawNumber: suggestion.rawNumber,
        year: suggestion.year,
        primaryDomain: suggestion.primaryDomain,
        rawSummary: suggestion.rawSummary,
        appendixSuffix: suggestion.appendixSuffix,
        ext: suggestion.ext,
        projectCode: activeProjectArchetype,
        linkedGates: suggestion.linkedGates,
      });

      const sha256Hash = await computeSha256Short(file);
      const ocrZones = extractOcrZonesFromText(file.name, extractedText);
      const fileSmartTags = buildAutoSuggestedTags(suggestion, activeProjectArchetype, 'SUGGESTED');

      analyzedQueue.push({
        id: `FIL-${Math.random().toString(36).substring(2, 9)}`,
        rawFile: file,
        itemKind: 'FILE',
        originalName: file.name,
        originalFolderPath: parentFolder,
        proposedFolderPath: proposedFolder,
        extractedText,
        suggestion,
        smartTags: fileSmartTags,
        proposedName,
        qlvbGroup: itemGroup,
        cdeStatus: 'S0',
        sha256Hash,
        fileSizeLabel: formatFileSize(file.size),
        readStatsLabel: readRes.statsLabel,
        ocrZones,
        selected: true,
        isCommitted: false,
      });
    }

    // Kiểm tra trùng lặp nội dung / mã băm SHA-256 khi nạp lô file mới
    const knownHashes = new Set<string>([
      ...droppedFilesQueue.map(i => (i.sha256Hash || '').toUpperCase()).filter(Boolean),
      ...renameLogs.filter(l => !l.isReverted).map(l => (l.sha256After || '').toUpperCase()).filter(Boolean),
    ]);
    let duplicateHashHitCount = 0;
    analyzedQueue.forEach(item => {
      const h = (item.sha256Hash || '').toUpperCase();
      if (!h) return;
      if (knownHashes.has(h)) {
        duplicateHashHitCount += 1;
      } else {
        knownHashes.add(h);
      }
    });

    const firstFile = analyzedQueue.find(i => i.itemKind === 'FILE') || analyzedQueue[0];
    if (firstFile) {
      setActiveBatchItemId(firstFile.id);
      setActiveRawFile(firstFile.rawFile);
      setNamingForm(prev => ({
        ...prev,
        industry: firstFile.suggestion.industry,
        docType: firstFile.suggestion.docType,
        issuer: firstFile.suggestion.issuer,
        rawNumber: firstFile.suggestion.rawNumber,
        year: firstFile.suggestion.year,
        primaryDomain: firstFile.suggestion.primaryDomain,
        rawSummary: firstFile.suggestion.rawSummary,
        ext: firstFile.suggestion.ext,
        projectAxes: firstFile.suggestion.projectAxes,
        secondaryDomains: firstFile.suggestion.secondaryDomains,
        linkedGates: firstFile.suggestion.linkedGates,
        linkedQAQC: firstFile.suggestion.linkedQAQC,
        rawContentToParse:
          firstFile.extractedText && firstFile.extractedText.trim().length > 10
            ? firstFile.extractedText.substring(0, 5000)
            : prev.rawContentToParse,
      }));
    }

    setDroppedFilesQueue(prev => [...analyzedQueue, ...prev]);
    setIsAnalyzingFile(false);

    await recordAuditLog({
      module: 'INGEST_3D',
      action: `Đọc & bóc tách hàng loạt ${analyzedQueue.length} File/Folder (${
        deepScanReadMode ? 'Deep Scan OCR V1–V4' : 'Quick Scan'
      })${duplicateHashHitCount > 0 ? ` — Phát hiện ${duplicateHashHitCount} trùng SHA-256` : ''}`,
      entityRef: firstFile?.proposedName || 'BATCH_INGEST',
      newState: duplicateHashHitCount > 0 ? 'DUPLICATE_SHA256_DETECTED' : 'ANALYZED_3D_READY',
      riskSeverity: duplicateHashHitCount > 0 ? 'WARNING' : 'NOMINAL',
    });

    if (duplicateHashHitCount > 0) {
      showToast(
        `⚠️ Cảnh báo: Phát hiện ${duplicateHashHitCount} tệp trùng mã băm SHA-256 với hồ sơ đã nạp!`
      );
    } else {
      showToast(
        `Đã đọc & phân tích ${analyzedQueue.length} File/Folder (CDE S0 · OCR 4 vùng · SHA-256)!`
      );
    }
  };

  // Chuyển đổi trạng thái Hồ sơ CDE theo chuẩn ISO 19650 (S0 -> S1 -> A1 -> B1)
  const handleChangeCdeStatus = async (itemId: string, nextCde: CdeIsoStatus) => {
    const target = droppedFilesQueue.find(i => i.id === itemId);
    if (!target) return;
    const prevCde = target.cdeStatus || 'S0';
    if (prevCde === nextCde) return;

    if ((nextCde === 'A1' || nextCde === 'B1') && !raciPerms.canPublishCdeA1B1) {
      showToast(
        `RBAC ISO 19650: Cần quyền Ban QLDA (PMU) hoặc Chủ đầu tư (CĐT) để phát hành hồ sơ sang trạng thái ${nextCde}!`
      );
      return;
    }

    setDroppedFilesQueue(prev =>
      prev.map(q => (q.id === itemId ? { ...q, cdeStatus: nextCde } : q))
    );

    await recordAuditLog({
      module: 'INGEST_3D',
      action: `Chuyển trạng thái CDE ISO 19650 cho [${target.proposedName}]: ${prevCde} → ${nextCde}`,
      entityRef: target.proposedName,
      previousState: `CDE_${prevCde}`,
      newState: `CDE_${nextCde}`,
      sha256Hash: target.sha256Hash,
    });

    showToast(
      `Đã chuyển [${target.originalName}] sang trạng thái ${CDE_ISO_19650_META[nextCde].fullLabel}`
    );
  };

  // Thử nghiệm hoặc xử lý nhanh các bản trùng mã băm SHA-256
  const handleDuplicateSha256Action = (mode: 'DESELECT' | 'REMOVE' | 'SIMULATE_DUP') => {
    if (mode === 'SIMULATE_DUP') {
      const sampleFile = droppedFilesQueue.find(i => i.itemKind !== 'FOLDER');
      if (!sampleFile) return;
      const clonedDup: AnalyzedFileItem = {
        ...sampleFile,
        id: `FIL-DUP-${Date.now().toString(36)}`,
        originalName: `BanSao_TrungNoiDung_${sampleFile.originalName}`,
        proposedName: sampleFile.proposedName.replace(/(\.[^.]+)$/, '-BanSao$1'),
        cdeStatus: 'S0',
        isCommitted: false,
        selected: true,
      };
      setDroppedFilesQueue(prev => [clonedDup, ...prev]);
      showToast(
        `⚠️ Cảnh báo Trùng lặp SHA-256: Tệp "${clonedDup.originalName}" có mã băm [${clonedDup.sha256Hash}] trùng với "${sampleFile.originalName}"!`
      );
      return;
    }

    const dupIds = new Set(duplicateHashItems.map(i => i.id));
    if (dupIds.size === 0) return;

    if (mode === 'DESELECT') {
      setDroppedFilesQueue(prev =>
        prev.map(i => (dupIds.has(i.id) ? { ...i, selected: false } : i))
      );
      showToast(`Đã tự động bỏ chọn ${dupIds.size} tệp trùng mã băm SHA-256!`);
    } else {
      setDroppedFilesQueue(prev => prev.filter(i => !dupIds.has(i.id)));
      showToast(`Đã loại bỏ ${dupIds.size} tệp trùng mã băm SHA-256 khỏi lô nạp!`);
    }
  };

  // Áp dụng lại công thức đặt tên hàng loạt khi đổi Chuẩn Đặt Tên File hoặc Chuẩn Thư mục
  const handleRecomputeBatchNames = (
    nextStandard: QlvbNamingGroupCode,
    nextFolderPreset: FolderNamingPresetCode
  ) => {
    setBatchNamingStandard(nextStandard);
    setFolderNamingPreset(nextFolderPreset);
    setDroppedFilesQueue(prev =>
      prev.map(item => {
        const effectiveGroup =
          nextStandard === 'SSOT_9PART'
            ? 'SSOT_9PART'
            : item.qlvbGroup && item.qlvbGroup !== 'SSOT_9PART'
            ? item.qlvbGroup
            : detectQlvbGroup(item.suggestion.docType, item.suggestion.primaryDomain);

        const nextFolder = buildStandardFolderPath({
          preset: nextFolderPreset,
          originalFolder: item.originalFolderPath || '01_HoSoDuAn',
          projectCode: activeProjectArchetype,
          primaryDomain: item.suggestion.primaryDomain,
          gateCode: item.suggestion.linkedGates[0] || 'G12',
          year: item.suggestion.year,
          qlvbGroup: effectiveGroup,
          industry: item.suggestion.industry,
        });

        const nextName =
          item.itemKind === 'FOLDER'
            ? nextFolder.split('/').pop() || nextFolder
            : buildFileNameByRule({
                group: effectiveGroup,
                industry: item.suggestion.industry,
                docType: item.suggestion.docType,
                issuer: item.suggestion.issuer,
                rawNumber: item.suggestion.rawNumber,
                year: item.suggestion.year,
                primaryDomain: item.suggestion.primaryDomain,
                rawSummary: item.suggestion.rawSummary,
                appendixSuffix: item.suggestion.appendixSuffix,
                ext: item.suggestion.ext,
                projectCode: activeProjectArchetype,
                linkedGates: item.suggestion.linkedGates,
                ktSubType: item.ktSubType,
                tkStageDept: item.tkStageDept,
                tkDocCode: item.tkDocCode,
                tkRevision: item.tkRevision,
              });

        return {
          ...item,
          qlvbGroup: effectiveGroup,
          proposedFolderPath: nextFolder,
          proposedName: nextName,
        };
      })
    );
  };

  // Tìm & Thay thế hoặc Gán hậu tố / Đánh số thứ tự hàng loạt cho các mục đang chọn
  const handleBatchFindReplaceAndFormat = (mode: 'FIND_REPLACE' | 'APPLY_SUFFIX' | 'AUTO_NUMBER') => {
    const selectedCount = droppedFilesQueue.filter(i => i.selected !== false).length;
    if (selectedCount === 0) {
      showToast('Vui lòng tick chọn ít nhất 1 File/Folder trong bảng để xử lý hàng loạt!');
      return;
    }

    let seq = 1;
    setDroppedFilesQueue(prev =>
      prev.map(item => {
        if (item.selected === false) return item;
        const nextSug = { ...item.suggestion };
        let nextProposedName = item.proposedName;
        let nextProposedFolder = item.proposedFolderPath || '';

        if (mode === 'FIND_REPLACE' && batchFindText.trim()) {
          const regex = new RegExp(batchFindText.trim(), 'gi');
          nextSug.rawSummary = nextSug.rawSummary.replace(regex, batchReplaceText);
          nextProposedName = nextProposedName.replace(regex, batchReplaceText);
          nextProposedFolder = nextProposedFolder.replace(regex, batchReplaceText);
        } else if (mode === 'APPLY_SUFFIX') {
          nextSug.appendixSuffix = batchSuffixInput.trim().replace(/^-+/, '');
          if (item.itemKind !== 'FOLDER') {
            nextProposedName = buildFileNameByRule({
              group: item.qlvbGroup || batchNamingStandard,
              industry: nextSug.industry,
              docType: nextSug.docType,
              issuer: nextSug.issuer,
              rawNumber: nextSug.rawNumber,
              year: nextSug.year,
              primaryDomain: nextSug.primaryDomain,
              rawSummary: nextSug.rawSummary,
              appendixSuffix: nextSug.appendixSuffix,
              ext: nextSug.ext,
              projectCode: activeProjectArchetype,
              linkedGates: nextSug.linkedGates,
              ktSubType: item.ktSubType,
              tkStageDept: item.tkStageDept,
              tkDocCode: item.tkDocCode,
              tkRevision: item.tkRevision,
            });
          }
        } else if (mode === 'AUTO_NUMBER') {
          const numStr = String(seq++).padStart(3, '0');
          nextSug.rawNumber = numStr;
          if (item.itemKind === 'FOLDER') {
            nextProposedName = `${numStr}_${nextProposedName.replace(/^\d+_/, '')}`;
          } else {
            nextProposedName = buildFileNameByRule({
              group: item.qlvbGroup || batchNamingStandard,
              industry: nextSug.industry,
              docType: nextSug.docType,
              issuer: nextSug.issuer,
              rawNumber: nextSug.rawNumber,
              year: nextSug.year,
              primaryDomain: nextSug.primaryDomain,
              rawSummary: nextSug.rawSummary,
              appendixSuffix: nextSug.appendixSuffix,
              ext: nextSug.ext,
              projectCode: activeProjectArchetype,
              linkedGates: nextSug.linkedGates,
              ktSubType: item.ktSubType,
              tkStageDept: item.tkStageDept,
              tkDocCode: item.tkDocCode,
              tkRevision: item.tkRevision,
            });
          }
        }

        return {
          ...item,
          suggestion: nextSug,
          proposedName: nextProposedName,
          proposedFolderPath: nextProposedFolder,
        };
      })
    );

    showToast(
      mode === 'FIND_REPLACE'
        ? `Đã thay thế "${batchFindText}" → "${batchReplaceText}" cho ${selectedCount} mục!`
        : mode === 'APPLY_SUFFIX'
        ? `Đã gắn hậu tố [-${batchSuffixInput}] cho ${selectedCount} mục!`
        : `Đã đánh lại số hiệu tự động (001..${String(selectedCount).padStart(3, '0')}) cho ${selectedCount} mục!`
    );
  };

  // Thực thi Đổi tên File/Folder Hàng loạt & Ghi vào Nhật ký Hoàn tác (LOG_DOITEN) + Đẩy vào Kho SSOT
  const handleCommitBatchRename = async () => {
    const selectedItems = validatedBatchQueue.filter(i => i.selected !== false);
    if (selectedItems.length === 0) {
      showToast('Chưa chọn File hoặc Folder nào để thực thi đổi tên hàng loạt!');
      return;
    }

    const invalidItems = selectedItems.filter(i => i.validationStatus !== 'OK');
    if (invalidItems.length > 0) {
      showToast(
        `Cảnh báo: Có ${invalidItems.length} mục chưa đạt chuẩn (${invalidItems[0].validationStatus}). Vui lòng kiểm tra trước khi lưu!`
      );
      return;
    }

    const nowStr = new Date().toLocaleString('sv-SE');
    const newLogs: RenameLogEntry[] = selectedItems.map((item, idx) => ({
      logId: `LOG-2026-${String(renameLogs.length + idx + 1).padStart(4, '0')}`,
      timestamp: nowStr,
      itemId: item.id,
      itemKind: item.itemKind || 'FILE',
      oldFolderPath: item.originalFolderPath || '01_Nguon',
      newFolderPath: item.proposedFolderPath || `${activeProjectArchetype}_G12_CDE`,
      oldName: item.originalName,
      newName: item.proposedName,
      sha256Before: item.sha256Hash || '8F4EA12B9C01',
      sha256After: item.sha256Hash || '8F4EA12B9C01',
      actorName: currentActor.fullName,
      qlvbGroup: item.qlvbGroup || batchNamingStandard,
      cdeStatus: item.cdeStatus || 'S0',
      isReverted: false,
    }));

    setRenameLogs(prev => [...newLogs, ...prev]);
    const selectedIds = new Set(selectedItems.map(i => i.id));
    setDroppedFilesQueue(prev =>
      prev.map(item => {
        if (!selectedIds.has(item.id)) return item;
        const confirmedTags = (
          item.smartTags && item.smartTags.length > 0
            ? item.smartTags
            : buildAutoSuggestedTags(item.suggestion, activeProjectArchetype, 'CONFIRMED')
        ).map(t => ({ ...t, status: 'CONFIRMED' as const }));
        const syncedSuggestion = syncSuggestionWithSmartTags(item.suggestion, confirmedTags);
        return {
          ...item,
          suggestion: syncedSuggestion,
          smartTags: confirmedTags,
          isCommitted: true,
        };
      })
    );

    // Đẩy các file hợp lệ vào danh mục văn bản Bước 2 (giữ nguyên 100% cơ chế Step2LegalMatrix)
    const fileItems = selectedItems.filter(i => i.itemKind !== 'FOLDER');
    if (fileItems.length > 0) {
      const addedDocs: LegalDocument[] = fileItems.map((item, idx) => {
        const nodes = parseVietnameseLegalText(item.extractedText || namingForm.rawContentToParse);
        const confirmedTags = (
          item.smartTags && item.smartTags.length > 0
            ? item.smartTags
            : buildAutoSuggestedTags(item.suggestion, activeProjectArchetype, 'CONFIRMED')
        ).map(t => ({ ...t, status: 'CONFIRMED' as const }));
        const syncedSug = syncSuggestionWithSmartTags(item.suggestion, confirmedTags);
        const taxonomy = resolveDocTaxonomyFromTags(
          syncedSug.primaryDomain,
          syncedSug.industry,
          confirmedTags
        );
        const canonicalDocType = normalizeSsotDocType(syncedSug.docType);
        return {
          id: `DOC-BATCH-${Date.now().toString(36).toUpperCase()}-${idx + 1}`,
          ssotFileName: item.proposedName,
          docNumber: syncedSug.rawNumber,
          docType: canonicalDocType,
          issuer: syncedSug.issuer,
          year: syncedSug.year,
          issueDate: `01/01/${syncedSug.year}`,
          effectiveDate: `15/02/${syncedSug.year}`,
          industryGroupId: taxonomy.industryGroupId,
          subSectorCode: taxonomy.subSectorCode,
          subSectorLabel: taxonomy.subSectorLabel,
          primaryDomain: syncedSug.primaryDomain,
          title: syncedSug.rawSummary,
          shortSummary: syncedSug.rawSummary,
          status: 'Còn hiệu lực năm 2026',
          validityPeriod: 'Còn hiệu lực',
          isAmended: false,
          chapterCount: Math.max(1, nodes.filter(n => n.level === 'Chương').length),
          articleCount: Math.max(1, nodes.filter(n => n.level === 'Điều').length),
          clauseTotalCount: nodes.length * 3,
          projectAxes:
            syncedSug.projectAxes.length > 0
              ? syncedSug.projectAxes
              : ['HTKT', 'DAN_DUNG', 'KCN', 'CCN', 'FTZ', 'PPP_BT'],
          secondaryDomains: syncedSug.secondaryDomains,
          linkedGates: syncedSug.linkedGates,
          linkedQAQC: syncedSug.linkedQAQC,
          tags: taxonomy.tags,
          lineage: `Chuẩn hóa hàng loạt (${item.qlvbGroup || batchNamingStandard} · CDE ${
            item.cdeStatus || 'S0'
          }) · Thư mục: ${item.proposedFolderPath || ''}`,
          nodes,
        };
      });
      setLegalDocs(prev => [...addedDocs, ...prev]);
      setSelectedDocId(addedDocs[0].id);
      setExpandedInlineDocId(addedDocs[0].id);
      setVbplIndustryGroupFilter('ALL');
      setVbplSubSectorFilter('ALL');
      setVbplDomainFilter('ALL');
      setVbplProjectFilter('ALL');
      setPane2SubTab('DOCS');
      setFilterDocType('ALL');
      setFilterValidityPeriod('ALL');
      setRecentDocIds(prev => [
        addedDocs[0].id,
        ...prev.filter(id => id !== addedDocs[0].id),
      ]);
    }

    await recordAuditLog({
      module: 'INGEST_3D',
      action: `Đổi tên hàng loạt ${selectedItems.length} File/Folder & ghi Nhật ký LOG_DOITEN`,
      entityRef: `${selectedItems.length} mục (${batchNamingStandard})`,
      newState: 'BATCH_RENAMED_COMMITTED',
    });

    showToast(
      `Đã đổi tên hàng loạt ${selectedItems.length} File/Folder, lưu Kho SSOT & ghi Nhật ký LOG_DOITEN!`
    );
  };

  // Hoàn tác tên cũ từ bảng LOG_DOITEN
  const handleUndoRenameLog = (logEntry: RenameLogEntry) => {
    setRenameLogs(prev =>
      prev.map(l => (l.logId === logEntry.logId ? { ...l, isReverted: true } : l))
    );
    setDroppedFilesQueue(prev =>
      prev.map(item =>
        item.id === logEntry.itemId
          ? {
              ...item,
              proposedName: logEntry.oldName,
              proposedFolderPath: logEntry.oldFolderPath,
              isCommitted: false,
            }
          : item
      )
    );
    showToast(`Đã hoàn tác về tên gốc: ${logEntry.oldName}`);
  };

  // Xuất Script đổi tên hàng loạt (.PS1 PowerShell / .CSV) để thực thi trực tiếp trên ổ cứng
  const handleExportBatchRenameArtifact = (format: 'PS1' | 'CSV') => {
    const selectedItems = validatedBatchQueue.filter(i => i.selected !== false);
    if (selectedItems.length === 0) {
      showToast('Không có mục nào được chọn để xuất!');
      return;
    }

    let content = '';
    let fileName = '';
    if (format === 'PS1') {
      const lines = [
        '# ==========================================================================',
        '# LEX-PMO OS v3.0 — SCRIPT ĐỔI TÊN FILE & THƯ MỤC HÀNG LOẠT CHUẨN SSOT / QLVB',
        `# Ngày xuất: ${new Date().toLocaleString('sv-SE')} | Người thực hiện: ${currentActor.fullName}`,
        '# Cách dùng: Đặt file này tại thư mục gốc và chạy bằng PowerShell',
        '# ==========================================================================',
        '',
      ];
      selectedItems.forEach(item => {
        if (item.itemKind === 'FOLDER') {
          lines.push(
            `# [FOLDER | CDE:${item.cdeStatus || 'S0'}] ${item.originalFolderPath} -> ${item.proposedFolderPath}`,
            `if (Test-Path "${item.originalFolderPath}") { New-Item -ItemType Directory -Force -Path "${item.proposedFolderPath}" | Out-Null }`
          );
        } else {
          lines.push(
            `# [FILE | CDE:${item.cdeStatus || 'S0'}] ${item.originalName} -> ${item.proposedName} (SHA256: ${item.sha256Hash})`,
            `if (Test-Path "${item.originalName}") { Rename-Item -Path "${item.originalName}" -NewName "${item.proposedName}" }`
          );
        }
      });
      content = lines.join('\n');
      fileName = `LEX_PMO_Batch_Rename_${activeProjectArchetype}_2026.ps1`;
    } else {
      const header =
        'STT,Loai,Trang_Thai_CDE,Thu_Muc_Goc,Thu_Muc_Moi,Ten_Goc,Ten_Moi_Chuan,Nhom_QLVB,Kiem_Tra,SHA256\n';
      const rows = selectedItems
        .map(
          (item, i) =>
            `${i + 1},${item.itemKind || 'FILE'},${item.cdeStatus || 'S0'},"${item.originalFolderPath || ''}","${
              item.proposedFolderPath || ''
            }","${item.originalName}","${item.proposedName}",${
              item.qlvbGroup || batchNamingStandard
            },${item.validationStatus || 'OK'},${item.sha256Hash || ''}`
        )
        .join('\n');
      content = '\uFEFF' + header + rows;
      fileName = `Bang_Doi_Chieu_Doi_Ten_${activeProjectArchetype}_2026.csv`;
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Đã xuất ${fileName} (${selectedItems.length} File/Folder)!`);
  };

  const handleDownloadRenamedFile = (fileObj: File | null, newName: string) => {
    if (!fileObj) {
      // Tạo file trích xuất nội dung chuẩn SSOT nếu chưa kéo file vật lý
      const blob = new Blob([namingForm.rawContentToParse], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = newName.replace(/\.(pdf|docx)$/i, '.txt');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Đã xuất bản thảo định danh chuẩn SSOT: ${newName}`);
      return;
    }
    const url = URL.createObjectURL(fileObj);
    const a = document.createElement('a');
    a.href = url;
    a.download = newName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Đã tải xuống file chuẩn SSOT: ${newName}`);
  };

  // ==========================================================================
  // STATE BƯỚC 2: TRA CỨU VBPL 3 CỘT THEO NGÀNH/LĨNH VỰC, ROAD_MAP BỘ LUẬT & ĐỐI SOÁT CHÉO
  // ==========================================================================
  const [vbplSubMode, setVbplSubMode] = useState<'READER_3PANE' | 'CROSS_EXAM' | 'LAW_ROADMAP'>('READER_3PANE');
  const [categorySearch, setCategorySearch] = useState('');
  const [filterTreeByActiveProject, setFilterTreeByActiveProject] = useState(false);
  const [expandedCatGroups, setExpandedCatGroups] = useState<Record<string, boolean>>({
    'IND-XAYDUNG-DAUTHAU': true,
    'IND-DOANHNGHIEP': false,
    'IND-KETOAN': false,
  });
  // Trạng thái sổ Danh mục văn bản trực tiếp của từng Ngành khi click vào Ngành
  const [expandedIndustryDocCatalog, setExpandedIndustryDocCatalog] = useState<Record<string, boolean>>({
    'IND-XAYDUNG-DAUTHAU': true,
  });
  // Trạng thái sổ Lĩnh vực con (QLCL, QLCP, QLHD...) -> Nhóm dự án
  const [expandedSubDomains, setExpandedSubDomains] = useState<Record<string, boolean>>({
    'IND-XAYDUNG-DAUTHAU__QLCL': true,
  });
  // Trạng thái sổ Nhóm dự án (HTKT, DAN_DUNG, KCN, CCN, FTZ, PPP_BT) -> Các văn bản thuộc dự án
  const [expandedProjectGroups, setExpandedProjectGroups] = useState<Record<string, boolean>>({
    'IND-XAYDUNG-DAUTHAU__QLCL__KCN': true,
  });
  // Lọc theo Ngành (Industry Group) và Chuyên ngành con (Sub-Sector) ở Cột 1
  const [vbplIndustryGroupFilter, setVbplIndustryGroupFilter] = useState<string>('IND-XAYDUNG-DAUTHAU');
  const [vbplSubSectorFilter, setVbplSubSectorFilter] = useState<string>('ALL');
  // Lọc nhanh theo Nhóm Lĩnh vực con (QLCL, QLCP, QLHD...) và Nhóm Dự án (HTKT, KCN...)
  const [vbplDomainFilter, setVbplDomainFilter] = useState<string>('ALL');
  const [vbplProjectFilter, setVbplProjectFilter] = useState<string>('ALL');
  // 4 Sub-tabs ở Cột 2: Văn bản | Kết quả | Đánh dấu | Gần đây
  const [pane2SubTab, setPane2SubTab] = useState<'DOCS' | 'RESULTS' | 'BOOKMARKS' | 'RECENT'>('DOCS');
  const [exactMatchAccent, setExactMatchAccent] = useState(false);
  const [filterDocType, setFilterDocType] = useState('ALL');
  const [filterValidityPeriod, setFilterValidityPeriod] = useState<'ALL' | 'EFFECTIVE' | 'UPCOMING'>('ALL');
  const [selectedDocId, setSelectedDocId] = useState('DOC-135');
  const [expandedInlineDocId, setExpandedInlineDocId] = useState<string | null>('DOC-135');
  const [bookmarkedDocIds, setBookmarkedDocIds] = useState<string[]>(['DOC-135', 'DOC-207', 'DOC-01', 'DOC-02']);
  const [recentDocIds, setRecentDocIds] = useState<string[]>(['DOC-135', 'DOC-206', 'DOC-207', 'DOC-209', 'DOC-01']);
  const [activeNodeId, setActiveNodeId] = useState('N135-D01');
  const [rightReaderMode, setRightReaderMode] = useState<
    'TOC_INDEX' | 'FULL_CONTENT' | 'LAW_ROADMAP' | 'COMPARE_MODE'
  >('TOC_INDEX');
  const [readerFontSize, setReaderFontSize] = useState(14);
  const [selectedCrossExamId, setSelectedCrossExamId] = useState('CX-01');
  const [selectedRoadmapPillarId, setSelectedRoadmapPillarId] = useState<string>('ROADMAP-LUAT-XD');
  const [roadmapTierFilter, setRoadmapTierFilter] = useState<'ALL' | LawRoadmapTierType>('ALL');
  const [isCol2CompactMode, setIsCol2CompactMode] = useState<boolean>(false);
  const [techStandardQuickFilter, setTechStandardQuickFilter] = useState<
    'ALL' | 'QCVN_TCVN' | 'QCVN_ONLY' | 'TCVN_ONLY'
  >('ALL');

  // Chế độ so sánh song song 2 điều khoản từ 2 văn bản khác nhau ở Cột 3
  const [compareLeftDocId, setCompareLeftDocId] = useState<string>('DOC-01');
  const [compareLeftNodeId, setCompareLeftNodeId] = useState<string>('N01-D15');
  const [compareRightDocId, setCompareRightDocId] = useState<string>('DOC-207');
  const [compareRightNodeId, setCompareRightNodeId] = useState<string>('N207-D15');
  const [highlightTextDiff, setHighlightTextDiff] = useState<boolean>(true);
  const [semanticHighlightEnabled, setSemanticHighlightEnabled] = useState<boolean>(true);
  const [compareCategoryFilter, setCompareCategoryFilter] = useState<'ALL' | LegalDiffCategory>('ALL');
  const [aiCompareCache, setAiCompareCache] = useState<Record<string, AiLegalGapAnalysis>>({});
  const [lastCompletedAiPairKey, setLastCompletedAiPairKey] = useState<string | null>(null);
  const [isAiCompareLoading, setIsAiCompareLoading] = useState<boolean>(false);
  const [aiCompareError, setAiCompareError] = useState<string | null>(null);

  // Danh sách các cặp điều khoản ưa thích đã lưu để truy cập nhanh trong Bảng so sánh
  const [favoriteComparePairs, setFavoriteComparePairs] = useState<FavoriteComparePair[]>(() => {
    try {
      const raw = localStorage.getItem('lex_pmo_favorite_compare_pairs_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore localStorage read errors
    }
    return [
      {
        id: 'FAV-DEFAULT-01',
        pairKey: 'DOC-01::N01-D15__DOC-207::N207-D15',
        leftDocId: 'DOC-01',
        leftDocNumber: '06/2021/NĐ-CP',
        leftNodeId: 'N01-D15',
        leftNodeCode: 'Điều 15.',
        leftNodeTitle: 'Quản lý thi công, Nhật ký thi công & Bản vẽ hoàn công',
        rightDocId: 'DOC-207',
        rightDocNumber: '207/2026/NĐ-CP',
        rightNodeId: 'N207-D15',
        rightNodeCode: 'Điều 15.',
        rightNodeTitle: 'Nhật ký thi công điện tử, Chữ ký số CA & Lưu trữ CDE',
        projectCode: 'KCN',
        customNote: 'Đối chiếu quy định chuyển tiếp Nhật ký thi công giấy sang Nhật ký điện tử ký số CA',
        savedAt: '16/11/2026 09:30',
      },
      {
        id: 'FAV-DEFAULT-02',
        pairKey: 'DOC-02::N02-D37__DOC-210::N210-D37',
        leftDocId: 'DOC-02',
        leftDocNumber: '37/2015/NĐ-CP',
        leftNodeId: 'N02-D37',
        leftNodeCode: 'Điều 37.',
        leftNodeTitle: 'Điều chỉnh khối lượng công việc trong hợp đồng xây dựng',
        rightDocId: 'DOC-210',
        rightDocNumber: '210/2026/NĐ-CP',
        rightNodeId: 'N210-D37',
        rightNodeCode: 'Điều 37.',
        rightNodeTitle: 'Điều chỉnh khối lượng, đơn giá & Quy trình phê duyệt VO',
        projectCode: 'KCN',
        customNote: 'Căn cứ kiểm soát phát sinh VO vượt dự toán gói thầu tại Gate G11 & G14',
        savedAt: '16/11/2026 14:15',
      },
    ];
  });
  const [showFavoritesDrawer, setShowFavoritesDrawer] = useState<boolean>(true);
  const [editingFavNoteId, setEditingFavNoteId] = useState<string | null>(null);
  const [favNoteDraft, setFavNoteDraft] = useState<string>('');

  useEffect(() => {
    try {
      localStorage.setItem(
        'lex_pmo_favorite_compare_pairs_v1',
        JSON.stringify(favoriteComparePairs)
      );
    } catch {
      // ignore localStorage write errors
    }
  }, [favoriteComparePairs]);

  const handleToggleFavoriteComparePair = (
    leftDoc: LegalDocument,
    leftNode: { id: string; code: string; title: string },
    rightDoc: LegalDocument,
    rightNode: { id: string; code: string; title: string }
  ) => {
    const basePairKey = `${leftDoc.id}::${leftNode.id}__${rightDoc.id}::${rightNode.id}`;
    const existing = favoriteComparePairs.find(f => f.pairKey === basePairKey);
    if (existing) {
      setFavoriteComparePairs(prev => prev.filter(f => f.pairKey !== basePairKey));
      showToast(
        `Đã bỏ lưu cặp điều khoản ưa thích: ${leftDoc.docNumber} (${leftNode.code}) ↔ ${rightDoc.docNumber} (${rightNode.code})`
      );
      return;
    }

    const nowStr = new Date().toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const aiCached = aiCompareCache[`${basePairKey}__${activeProjectArchetype}`];
    const newFav: FavoriteComparePair = {
      id: `FAV-${Date.now()}`,
      pairKey: basePairKey,
      leftDocId: leftDoc.id,
      leftDocNumber: leftDoc.docNumber,
      leftNodeId: leftNode.id,
      leftNodeCode: leftNode.code,
      leftNodeTitle: leftNode.title,
      rightDocId: rightDoc.id,
      rightDocNumber: rightDoc.docNumber,
      rightNodeId: rightNode.id,
      rightNodeCode: rightNode.code,
      rightNodeTitle: rightNode.title,
      projectCode: activeProjectArchetype,
      customNote: aiCached?.summaryVerdict
        ? aiCached.summaryVerdict.slice(0, 140)
        : `So sánh ${leftDoc.docNumber} (${leftNode.code}) ↔ ${rightDoc.docNumber} (${rightNode.code})`,
      savedAt: nowStr,
    };
    setFavoriteComparePairs(prev => [newFav, ...prev]);
    setShowFavoritesDrawer(true);
    showToast(
      `⭐ Đã lưu cặp điều khoản ưa thích: ${leftDoc.docNumber} (${leftNode.code}) ↔ ${rightDoc.docNumber} (${rightNode.code})!`
    );
  };

  const handleSaveFavoritePairNote = (favId: string) => {
    setFavoriteComparePairs(prev =>
      prev.map(item =>
        item.id === favId ? { ...item, customNote: favNoteDraft.trim() } : item
      )
    );
    setEditingFavNoteId(null);
    setFavNoteDraft('');
    showToast('Đã cập nhật ghi chú cho cặp điều khoản ưa thích!');
  };

  // Bộ máy Điều khoản Chuyển tiếp Pháp lý (Legal Cut-off Engine) theo 3 mốc Dự án
  const [projectLegalDatesMap, setProjectLegalDatesMap] = useState<
    Record<ProjectArchetypeCode, ProjectLegalMilestones>
  >(() => DEFAULT_PROJECT_MILESTONES_MAP);
  const [legalCutoffMode, setLegalCutoffMode] =
    useState<LegalCutoffFilterMode>('CURRENT_VALID_ONLY');

  const activeProjectMilestones = useMemo<ProjectLegalMilestones>(
    () => projectLegalDatesMap[activeProjectArchetype] || PRESET_LEGACY_2023_2024,
    [projectLegalDatesMap, activeProjectArchetype]
  );

  const activeProjectCutoffRegime = useMemo(
    () => classifyProjectCutoffRegime(activeProjectMilestones),
    [activeProjectMilestones]
  );

  const applyProjectMilestonePreset = (
    projectCode: ProjectArchetypeCode,
    preset: 'LEGACY_2023_2024' | 'NEW_2026'
  ) => {
    const nextMilestones =
      preset === 'LEGACY_2023_2024'
        ? { ...PRESET_LEGACY_2023_2024 }
        : { ...PRESET_NEW_2026 };
    setProjectLegalDatesMap(prev => ({
      ...prev,
      [projectCode]: nextMilestones,
    }));
    setLegalCutoffMode('PROJECT_TRANSITION');
    showToast(
      preset === 'LEGACY_2023_2024'
        ? `Đã áp dụng kịch bản "Dự án cũ chuyển tiếp 2023–2024" cho [${projectCode}] & kích hoạt Legal Cut-off Engine!`
        : `Đã áp dụng kịch bản "Dự án khởi tạo mới 2026" cho [${projectCode}] & kích hoạt Legal Cut-off Engine!`
    );
  };

  const updateProjectMilestoneField = (
    projectCode: ProjectArchetypeCode,
    field: 'investmentPolicyDate' | 'projectDesignApprovalDate' | 'constructionContractDate',
    value: string
  ) => {
    setProjectLegalDatesMap(prev => ({
      ...prev,
      [projectCode]: {
        ...(prev[projectCode] || PRESET_LEGACY_2023_2024),
        presetId: 'CUSTOM',
        [field]: value,
      },
    }));
  };

  // Ghi chú cá nhân & Chỉ thị Pháp lý Dùng chung của Dự án gắn vào Gate (lưu trữ trong state)
  const [articlePersonalNotes, setArticlePersonalNotes] = useState<
    Record<string, ArticlePersonalNoteItem>
  >({
    'DOC-135__N135-D4': {
      text: 'Lưu ý phối hợp đồng bộ giữa Luật Xây dựng 135/2025 với Luật Đầu tư & Nghị định 35/2022 khi thẩm định dự án Hạ tầng KCN tại Ban Quản lý KKT.',
      updatedAt: '16/11/2026 09:30',
      author: 'TS. Trần Võ Đại Sơn',
      docId: 'DOC-135',
      docNumber: '135/2025/QH15',
      nodeId: 'N135-D4',
      nodeCode: 'Điều 4.',
      nodeTitle: 'Nguyên tắc cơ bản trong hoạt động đầu tư xây dựng',
      isSharedToGate: false,
      targetGates: ['G0', 'G5'],
      projectScope: 'KCN',
    },
    'DOC-135__N135-D7': {
      text: 'Bắt buộc đính kèm mô hình BIM và Nhật ký thi công điện tử ký số CA đối với các gói thầu công trình cấp I, cấp II thuộc dự án.',
      updatedAt: '16/11/2026 10:15',
      author: 'TS. Trần Võ Đại Sơn',
      docId: 'DOC-135',
      docNumber: '135/2025/QH15',
      nodeId: 'N135-D7',
      nodeCode: 'Điều 7.',
      nodeTitle: 'Chuyển đổi số & Áp dụng BIM bắt buộc',
      isSharedToGate: false,
      targetGates: ['G5', 'G9', 'G12'],
      projectScope: 'ALL',
    },
    'DOC-207__N207-D12': {
      text: 'Chốt chặn Gate G12: Tuyệt đối không ký BBNT công việc nếu ngày xuất phiếu LAS-XD muộn hơn ngày nghiệm thu vật liệu đầu vào (Tránh lỗi RF-05).',
      updatedAt: '16/11/2026 14:20',
      author: 'KS. Nguyễn Hoàng Nam',
      docId: 'DOC-207',
      docNumber: '207/2026/NĐ-CP',
      nodeId: 'N207-D12',
      nodeCode: 'Điều 12.',
      nodeTitle: 'Quản lý chất lượng vật liệu, cấu kiện & thí nghiệm LAS-XD',
      isSharedToGate: true,
      targetGates: ['G12', 'G14'],
      projectScope: 'ALL',
    },
    'DOC-207__N207-D15': {
      text: 'Yêu cầu TVGS và Chỉ huy trưởng ký số Nhật ký thi công Phụ lục IIa trước 18h00 hàng ngày; không ghi khối lượng phát sinh thương mại vượt thẩm quyền vào nhật ký.',
      updatedAt: '16/11/2026 16:05',
      author: 'ThS.KS. Lê Minh Quân',
      docId: 'DOC-207',
      docNumber: '207/2026/NĐ-CP',
      nodeId: 'N207-D15',
      nodeCode: 'Điều 15.',
      nodeTitle: 'Nhật ký thi công điện tử & Giám sát hiện trường',
      isSharedToGate: false,
      targetGates: ['G12'],
      projectScope: 'ALL',
    },
    'DOC-01__N01-D21': {
      text: 'Thời hạn nghiệm thu công việc xây dựng tối đa 24h kể từ khi nhận phiếu RFI của Nhà thầu (Áp dụng chuyển tiếp theo NĐ 06/2021 cho HĐ cũ).',
      updatedAt: '15/11/2026 11:00',
      author: 'KS. Nguyễn Hoàng Nam',
      docId: 'DOC-01',
      docNumber: '06/2021/NĐ-CP',
      nodeId: 'N01-D21',
      nodeCode: 'Điều 21.',
      nodeTitle: 'Nghiệm thu công việc xây dựng',
      isSharedToGate: true,
      targetGates: ['G12', 'G14'],
      projectScope: 'ALL',
    },
  });
  const [editingNoteKey, setEditingNoteKey] = useState<string | null>(null);
  const [noteDraftText, setNoteDraftText] = useState<string>('');
  const [noteDraftSharedToGate, setNoteDraftSharedToGate] = useState<boolean>(false);
  const [noteDraftTargetGates, setNoteDraftTargetGates] = useState<string[]>([]);
  const [noteDraftProjectScope, setNoteDraftProjectScope] = useState<ProjectArchetypeCode | 'ALL'>('ALL');
  const [filterOnlyNotedNodes, setFilterOnlyNotedNodes] = useState<boolean>(false);

  const getArticleNoteKey = (docId: string, nodeId: string) => `${docId}__${nodeId}`;

  const openArticleNoteEditor = (
    docId: string,
    nodeId: string,
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();
    const key = getArticleNoteKey(docId, nodeId);
    const current = articlePersonalNotes[key];
    const docObj = legalDocs.find(d => d.id === docId);
    const defaultGates =
      current?.targetGates && current.targetGates.length > 0
        ? current.targetGates
        : docObj?.linkedGates && docObj.linkedGates.length > 0
        ? docObj.linkedGates.slice(0, 3)
        : ['G12'];
    setActiveNodeId(nodeId);
    setEditingNoteKey(key);
    setNoteDraftText(current?.text || '');
    setNoteDraftSharedToGate(Boolean(current?.isSharedToGate));
    setNoteDraftTargetGates(defaultGates);
    setNoteDraftProjectScope(current?.projectScope || 'ALL');
  };

  const toggleDraftTargetGate = (gateCode: string) => {
    setNoteDraftTargetGates(prev =>
      prev.includes(gateCode) ? prev.filter(g => g !== gateCode) : [...prev, gateCode]
    );
  };

  const saveArticlePersonalNote = (
    docId: string,
    nodeId: string,
    codeLabel: string,
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();
    const key = getArticleNoteKey(docId, nodeId);
    const trimmed = noteDraftText.trim();
    if (!trimmed) {
      setArticlePersonalNotes(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setEditingNoteKey(null);
      setNoteDraftText('');
      showToast(`Đã xóa ghi chú cá nhân tại ${codeLabel}`);
      return;
    }

    const docObj = legalDocs.find(d => d.id === docId);
    const nodeObj = docObj?.nodes.find(n => n.id === nodeId);
    const effectiveGates =
      noteDraftTargetGates.length > 0
        ? noteDraftTargetGates
        : docObj?.linkedGates?.slice(0, 2) || ['G12'];

    const nowStr = new Date().toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    setArticlePersonalNotes(prev => ({
      ...prev,
      [key]: {
        text: trimmed,
        updatedAt: nowStr,
        author: currentActor.fullName,
        docId,
        docNumber: docObj?.docNumber || docId,
        nodeId,
        nodeCode: nodeObj?.code || codeLabel,
        nodeTitle: nodeObj?.title || '',
        isSharedToGate: noteDraftSharedToGate,
        targetGates: effectiveGates,
        projectScope: noteDraftProjectScope,
      },
    }));
    setEditingNoteKey(null);
    showToast(
      noteDraftSharedToGate
        ? `📢 Đã chia sẻ Chỉ thị Pháp lý "${codeLabel}" vào Gate [${effectiveGates.join(', ')}] tại Bước 3!`
        : `Đã lưu ghi chú cá nhân cho ${codeLabel}!`
    );
  };

  const toggleShareNoteToGate = (
    docId: string,
    nodeId: string,
    codeLabel: string,
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();
    const key = getArticleNoteKey(docId, nodeId);
    const existing = articlePersonalNotes[key];
    if (!existing) return;
    const docObj = legalDocs.find(d => d.id === docId);
    const nodeObj = docObj?.nodes.find(n => n.id === nodeId);
    const nextShared = !existing.isSharedToGate;
    const effectiveGates =
      existing.targetGates && existing.targetGates.length > 0
        ? existing.targetGates
        : docObj?.linkedGates?.slice(0, 3) || ['G12'];

    setArticlePersonalNotes(prev => ({
      ...prev,
      [key]: {
        ...existing,
        docId,
        docNumber: existing.docNumber || docObj?.docNumber || docId,
        nodeId,
        nodeCode: existing.nodeCode || nodeObj?.code || codeLabel,
        nodeTitle: existing.nodeTitle || nodeObj?.title || '',
        isSharedToGate: nextShared,
        targetGates: effectiveGates,
        projectScope: existing.projectScope || 'ALL',
      },
    }));

    showToast(
      nextShared
        ? `📢 Đã gắn Chỉ thị "${codeLabel}" vào Chốt chặn Rủi ro Gate [${effectiveGates.join(', ')}] ở Bước 3!`
        : `Đã gỡ chia sẻ khỏi Gate đối với ghi chú ${codeLabel}.`
    );
  };

  const deleteArticlePersonalNote = (
    docId: string,
    nodeId: string,
    codeLabel: string,
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();
    const key = getArticleNoteKey(docId, nodeId);
    setArticlePersonalNotes(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    if (editingNoteKey === key) {
      setEditingNoteKey(null);
      setNoteDraftText('');
    }
    showToast(`Đã xóa ghi chú cá nhân tại ${codeLabel}`);
  };

  const resolveRoadmapPillarIdForDoc = (doc: LegalDocument): string => {
    if (doc.id === 'DOC-07' || doc.primaryDomain === 'DTH') {
      return 'ROADMAP-LUAT-DAUTHAU';
    }
    if (doc.id === 'DOC-35PPP') {
      return 'ROADMAP-LUAT-PPP';
    }
    if (
      ['DOC-05', 'DOC-32', 'DOC-HQ-FTZ'].includes(doc.id) ||
      ['DTU', 'QHDD'].includes(doc.primaryDomain)
    ) {
      return 'ROADMAP-LUAT-DAUTU-BDS-KCN';
    }
    if (
      ['DOC-08', 'DOC-HD-123', 'DOC-TKT-KTNN'].includes(doc.id) ||
      doc.primaryDomain === 'TQT'
    ) {
      return 'ROADMAP-LUAT-TAICHINH-QUYETTOAN';
    }
    return 'ROADMAP-LUAT-XD';
  };

  const openLawRoadmapForDoc = (doc: LegalDocument, fullSubMode = false) => {
    const pillarId = resolveRoadmapPillarIdForDoc(doc);
    setSelectedRoadmapPillarId(pillarId);
    setRoadmapTierFilter('ALL');
    setSelectedDocId(doc.id);
    if (fullSubMode) {
      setActiveTab('STEP2_VBPL');
      setVbplSubMode('LAW_ROADMAP');
    } else {
      setVbplSubMode('READER_3PANE');
      setRightReaderMode('LAW_ROADMAP');
    }
    const pillarObj = LAW_ROADMAPS.find(p => p.id === pillarId);
    showToast(`Đã mở Road_map: ${pillarObj?.shortName || 'Bộ luật'} (Tâm điểm: ${doc.docNumber})`);
  };

  // Helpers cho Chế độ So sánh 2 điều khoản từ 2 văn bản khác nhau
  const getSelectableArticleNodes = (doc?: LegalDocument) => {
    if (!doc) return [];
    return doc.nodes.filter(n => n.level !== 'Chương' && n.level !== 'Mục');
  };

  const handleChangeCompareDoc = (slot: 'LEFT' | 'RIGHT', newDocId: string) => {
    const targetDoc = legalDocs.find(d => d.id === newDocId);
    const selectableNodes = getSelectableArticleNodes(targetDoc);
    const firstNodeId = selectableNodes[0]?.id || targetDoc?.nodes[0]?.id || '';
    if (slot === 'LEFT') {
      setCompareLeftDocId(newDocId);
      setCompareLeftNodeId(firstNodeId);
    } else {
      setCompareRightDocId(newDocId);
      setCompareRightNodeId(firstNodeId);
    }
  };

  const sendArticleToCompare = (
    slot: 'LEFT' | 'RIGHT',
    docId: string,
    nodeId: string,
    openCompareTab = false,
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();
    const docObj = legalDocs.find(d => d.id === docId);
    const nodeObj = docObj?.nodes.find(n => n.id === nodeId);
    if (slot === 'LEFT') {
      setCompareLeftDocId(docId);
      setCompareLeftNodeId(nodeId);
    } else {
      setCompareRightDocId(docId);
      setCompareRightNodeId(nodeId);
    }
    if (openCompareTab) {
      setRightReaderMode('COMPARE_MODE');
    }
    showToast(
      `Đã đưa ${nodeObj?.code || nodeId} (${docObj?.docNumber || docId}) vào cột ${
        slot === 'LEFT' ? 'Điều khoản A' : 'Điều khoản B'
      }${openCompareTab ? ' & mở Bảng so sánh!' : '.'}`
    );
  };

  const swapCompareSides = () => {
    setCompareLeftDocId(compareRightDocId);
    setCompareLeftNodeId(compareRightNodeId);
    setCompareRightDocId(compareLeftDocId);
    setCompareRightNodeId(compareLeftNodeId);
    showToast('Đã đảo vị trí Điều khoản A ↔ Điều khoản B');
  };

  const normalizeCompareWord = (raw: string) =>
    raw
      .toLowerCase()
      .replace(/^[.,;:()[\]"'“”/–—-]+|[.,;:()[\]"'“”/–—-]+$/g, '');

  const renderWordDiffChunk = (
    chunkText: string,
    otherTokens: Set<string>,
    side: 'LEFT' | 'RIGHT',
    keyPrefix: string
  ) => {
    if (!highlightTextDiff) return <React.Fragment key={keyPrefix}>{chunkText}</React.Fragment>;
    const parts = chunkText.split(/(\s+)/);
    return (
      <React.Fragment key={keyPrefix}>
        {parts.map((part, idx) => {
          if (/^\s+$/.test(part)) return <span key={idx}>{part}</span>;
          const norm = normalizeCompareWord(part);
          if (norm.length >= 2 && !otherTokens.has(norm)) {
            return (
              <mark
                key={idx}
                className={
                  side === 'LEFT'
                    ? 'bg-amber-200/80 text-amber-950 px-0.5 rounded font-medium'
                    : 'bg-emerald-200/80 text-emerald-950 px-0.5 rounded font-semibold'
                }
              >
                {part}
              </mark>
            );
          }
          return <span key={idx}>{part}</span>;
        })}
      </React.Fragment>
    );
  };

  const renderDiffHighlightedText = (
    text: string,
    otherText: string,
    side: 'LEFT' | 'RIGHT',
    aiTargets: AiLegalGapAnalysis['highlightTargetsA'] = []
  ) => {
    if (!text) return <span className="italic text-slate-400">(Không có nội dung chi tiết)</span>;
    if (!highlightTextDiff && !semanticHighlightEnabled) return <span>{text}</span>;

    const otherTokens = new Set(
      otherText
        .split(/\s+/)
        .map(normalizeCompareWord)
        .filter(w => w.length >= 2)
    );

    if (!semanticHighlightEnabled) {
      return renderWordDiffChunk(text, otherTokens, side, 'word-only');
    }

    const localCues = extractLocalSemanticCues(text, otherText);
    const segments = splitTextByHighlightTargets(
      text,
      aiTargets,
      localCues,
      compareCategoryFilter
    );

    return (
      <>
        {segments.map((seg, idx) => {
          if (!seg.match) {
            return renderWordDiffChunk(seg.text, otherTokens, side, `plain-${idx}`);
          }
          const meta = DIFF_CATEGORY_META[seg.match.category];
          return (
            <mark
              key={`sem-${idx}`}
              className={`${meta.markClass} inline-flex items-baseline gap-0.5 mx-0.5 cursor-help`}
              title={`${meta.icon} ${meta.label}${seg.match.isAiVerified ? ' (AI Gemini)' : ''}: ${seg.match.reason}`}
            >
              <span className="text-[10px] select-none leading-none">{meta.icon}</span>
              <span>{seg.text}</span>
            </mark>
          );
        })}
      </>
    );
  };

  const handleRunAiLegalCompare = async (
    leftDoc: LegalDocument,
    leftNode: { id: string; code: string; title: string; content?: string },
    rightDoc: LegalDocument,
    rightNode: { id: string; code: string; title: string; content?: string },
    pairKey: string
  ) => {
    if (isAiCompareLoading) return;
    setIsAiCompareLoading(true);
    setAiCompareError(null);
    try {
      const data = await compareClausesWithHybridAi({
          projectCode: activeProjectArchetype,
          projectName: currentArchetypeMeta.name,
          authority: currentArchetypeMeta.authority,
          leftClause: {
            docId: leftDoc.id,
            docNumber: leftDoc.docNumber,
            docType: leftDoc.docType,
            issueDate: leftDoc.issueDate,
            effectiveDate: leftDoc.effectiveDate,
            status: leftDoc.status,
            nodeCode: leftNode.code,
            nodeTitle: leftNode.title,
            content: leftNode.content || '',
          },
          rightClause: {
            docId: rightDoc.id,
            docNumber: rightDoc.docNumber,
            docType: rightDoc.docType,
            issueDate: rightDoc.issueDate,
            effectiveDate: rightDoc.effectiveDate,
            status: rightDoc.status,
            nodeCode: rightNode.code,
            nodeTitle: rightNode.title,
            content: rightNode.content || '',
          },
      });
      if (!data?.analysis) {
        const msg = 'Lỗi máy chủ khi phân tích chênh lệch pháp lý bằng Gemini.';
        setAiCompareError(msg);
        showToast(msg);
        return;
      }

      const result: AiLegalGapAnalysis = {
        pairKey,
        summaryVerdict: data.analysis.summaryVerdict,
        timelineDifferences: data.analysis.timelineDifferences || [],
        authorityDifferences: data.analysis.authorityDifferences || [],
        technicalDifferences: data.analysis.technicalDifferences || [],
        recommendedAction: data.analysis.recommendedAction,
        highlightTargetsA: data.analysis.highlightTargetsA || [],
        highlightTargetsB: data.analysis.highlightTargetsB || [],
        source: data.source || 'gemini-4-hydrogen',
        analyzedAt: data.analyzedAt || new Date().toLocaleTimeString('vi-VN'),
      };

      setAiCompareCache(prev => ({ ...prev, [pairKey]: result }));
      setLastCompletedAiPairKey(pairKey);
      setSemanticHighlightEnabled(true);
      await recordAuditLog({
        module: 'VBPL_CROSS',
        action: `AI Phân tích chênh lệch pháp lý: ${leftDoc.docNumber} (${leftNode.code}) ↔ ${rightDoc.docNumber} (${rightNode.code})`,
        entityRef: `${activeProjectArchetype} / ${leftNode.code}↔${rightNode.code}`,
        newState: 'AI_DIFF_ANALYZED',
      });
      showToast('AI Gemini đã hoàn tất phân tích chênh lệch & tô sáng 3 nhóm trọng tâm!');
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? `Không thể kết nối máy chủ phân tích AI (${err.message}).`
          : 'Không thể kết nối máy chủ phân tích AI.';
      setAiCompareError(msg);
      showToast(msg);
    } finally {
      setIsAiCompareLoading(false);
    }
  };

  const activeIndustryGroup = useMemo(() => {
    if (vbplIndustryGroupFilter !== 'ALL') {
      const found = LEGAL_CATEGORY_TREE.find(g => g.id === vbplIndustryGroupFilter);
      if (found) return found;
    }
    return LEGAL_CATEGORY_TREE[0];
  }, [vbplIndustryGroupFilter]);

  const activeSubSector = useMemo(() => {
    if (vbplSubSectorFilter !== 'ALL') {
      for (const grp of LEGAL_CATEGORY_TREE) {
        const sub = grp.children.find(c => c.code === vbplSubSectorFilter);
        if (sub) return sub;
      }
    }
    return activeIndustryGroup.children[0];
  }, [vbplSubSectorFilter, activeIndustryGroup]);

  const handleSaveToSSOT = async () => {
    const parsedNodes = parseVietnameseLegalText(namingForm.rawContentToParse);
    const newDocId = 'DOC-0' + (legalDocs.length + 1);
    const autoTags = buildAutoSuggestedTags(namingForm, activeProjectArchetype, 'CONFIRMED');
    const taxonomy = resolveDocTaxonomyFromTags(
      namingForm.primaryDomain,
      namingForm.industry,
      autoTags
    );
    const newDoc: LegalDocument = {
      id: newDocId,
      ssotFileName: generatedFileName,
      docNumber: namingForm.rawNumber,
      docType: normalizeSsotDocType(namingForm.docType),
      issuer: namingForm.issuer,
      year: namingForm.year,
      issueDate: `01/01/${namingForm.year}`,
      effectiveDate: `15/02/${namingForm.year}`,
      industryGroupId: taxonomy.industryGroupId,
      subSectorCode: taxonomy.subSectorCode,
      subSectorLabel: taxonomy.subSectorLabel,
      primaryDomain: namingForm.primaryDomain,
      title: namingForm.rawSummary,
      shortSummary: `${namingForm.rawSummary.slice(0, 48)}...`,
      status: namingForm.status,
      validityPeriod: 'Còn hiệu lực',
      isAmended: false,
      chapterCount: Math.max(1, parsedNodes.filter(n => n.level === 'Chương').length),
      articleCount: Math.max(1, parsedNodes.filter(n => n.level === 'Điều').length),
      clauseTotalCount: parsedNodes.reduce((acc, n) => acc + (n.clauseCount || 4), 0),
      projectAxes:
        namingForm.projectAxes.length > 0
          ? namingForm.projectAxes
          : ['HTKT', 'DAN_DUNG', 'KCN', 'CCN', 'FTZ', 'PPP_BT'],
      secondaryDomains: namingForm.secondaryDomains,
      linkedGates: namingForm.linkedGates,
      linkedQAQC: namingForm.linkedQAQC,
      tags: taxonomy.tags,
      lineage: `Gắn nhãn 3 Trục: [${namingForm.docType}] × Dự án [${namingForm.projectAxes.join(', ')}] × Chức năng [${namingForm.secondaryDomains.join(', ')}].`,
      nodes: parsedNodes,
    };
    setLegalDocs(prev => [newDoc, ...prev]);
    setSelectedDocId(newDocId);
    setExpandedInlineDocId(newDocId);
    setRecentDocIds(prev => [newDocId, ...prev.filter(id => id !== newDocId)]);

    await recordAuditLog({
      module: 'INGEST_3D',
      action: `Nạp văn bản mới vào Kho SSOT (${parsedNodes.length} điều khoản)`,
      entityRef: `${newDocId} / ${generatedFileName}`,
      newState: 'SSOT_COMMITTED',
    });

    showToast(`Đã nạp "${generatedFileName}" vào Chuỗi Giá Trị SSOT!`);
  };

  const toggleBookmarkDoc = (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarkedDocIds(prev =>
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
  };

  const handleSelectDoc = (docId: string, toggleInline = true) => {
    const targetDoc = legalDocs.find(d => d.id === docId);
    setSelectedDocId(docId);
    if (toggleInline) {
      setExpandedInlineDocId(prev => (prev === docId ? null : docId));
    } else {
      setExpandedInlineDocId(docId);
    }
    if (targetDoc && targetDoc.nodes.length > 0) {
      setActiveNodeId(targetDoc.nodes[0].id);
    }
    setRecentDocIds(prev => [docId, ...prev.filter(id => id !== docId)].slice(0, 12));
  };

  // Khi click vào bất kỳ văn bản nào từ Cột 1 (Danh mục VB ngành hoặc Nhóm dự án), đồng bộ ngay Cột 2 & Cột 3
  const handleSelectDocFromColumn1 = (
    doc: LegalDocument,
    context?: {
      industryId?: string;
      domainCode?: FunctionalDomainCode | 'ALL';
      projectCode?: ProjectArchetypeCode | 'ALL';
    }
  ) => {
    if (context?.industryId) {
      setVbplIndustryGroupFilter(context.industryId);
    }
    setVbplSubSectorFilter('ALL');
    if (context?.domainCode !== undefined) {
      setVbplDomainFilter(context.domainCode);
    }
    if (context?.projectCode !== undefined) {
      setVbplProjectFilter(context.projectCode);
    }
    setPane2SubTab('DOCS');
    setSelectedDocId(doc.id);
    setExpandedInlineDocId(doc.id);
    if (doc.nodes.length > 0) {
      setActiveNodeId(doc.nodes[0].id);
    }
    setRecentDocIds(prev => [doc.id, ...prev.filter(id => id !== doc.id)].slice(0, 12));
    setTimeout(() => {
      const cardEl = document.getElementById(`col2-doc-card-${doc.id}`);
      if (cardEl) cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 60);
    showToast(`Đang hiển thị chi tiết tại Cột 2 & Cột 3: ${doc.docType} ${doc.docNumber}`);
  };

  const isDocQcvn = (doc: LegalDocument) =>
    doc.docType === 'QCVN' ||
    doc.primaryDomain === 'QCVN' ||
    doc.docNumber.toUpperCase().includes('QCVN');

  const isDocTcvn = (doc: LegalDocument) =>
    doc.docType === 'TCVN' ||
    doc.primaryDomain === 'TCVN' ||
    doc.docNumber.toUpperCase().includes('TCVN');

  const qcvnTcvnCounts = useMemo(() => {
    let qcvn = 0;
    let tcvn = 0;
    let both = 0;
    for (const d of legalDocs) {
      const q = isDocQcvn(d);
      const t = isDocTcvn(d);
      if (q) qcvn++;
      if (t) tcvn++;
      if (q || t) both++;
    }
    return { qcvn, tcvn, both };
  }, [legalDocs]);

  const filteredLegalDocs = useMemo(() => {
    return legalDocs.filter(doc => {
      if (pane2SubTab === 'BOOKMARKS' && !bookmarkedDocIds.includes(doc.id)) return false;
      if (pane2SubTab === 'RECENT' && !recentDocIds.includes(doc.id)) return false;

      // Bộ lọc nhanh Tài liệu Kỹ thuật (QCVN / TCVN)
      if (techStandardQuickFilter !== 'ALL') {
        const matchQcvn = isDocQcvn(doc);
        const matchTcvn = isDocTcvn(doc);
        if (techStandardQuickFilter === 'QCVN_TCVN' && !matchQcvn && !matchTcvn) return false;
        if (techStandardQuickFilter === 'QCVN_ONLY' && !matchQcvn) return false;
        if (techStandardQuickFilter === 'TCVN_ONLY' && !matchTcvn) return false;
      } else {
        // Lọc theo Ngành / Chuyên ngành (Cột 1) khi không bật chế độ gom toàn bộ QCVN/TCVN
        if (vbplSubSectorFilter !== 'ALL') {
          if (doc.subSectorCode !== vbplSubSectorFilter) return false;
        } else if (vbplIndustryGroupFilter !== 'ALL') {
          if (doc.industryGroupId !== vbplIndustryGroupFilter) return false;
        }
      }

      // Lọc theo Chức năng chuyên môn (khi bấm từ thanh công cụ phụ)
      if (vbplDomainFilter !== 'ALL' && techStandardQuickFilter === 'ALL') {
        const matchDomain =
          doc.primaryDomain === vbplDomainFilter ||
          doc.secondaryDomains.includes(vbplDomainFilter as FunctionalDomainCode);
        if (!matchDomain) return false;
      }

      const matchProject =
        vbplProjectFilter === 'ALL' ||
        (doc.projectAxes && doc.projectAxes.includes(vbplProjectFilter as ProjectArchetypeCode));
      if (!matchProject) return false;

      // Lọc theo trạng thái / giai đoạn dự án (Chuẩn bị - Thực hiện - Kết thúc) khi ở chế độ Dự án
      if (col1ViewMode === 'BY_PROJECT' && vbplProjectPhaseFilter !== 'ALL') {
        if (!matchesDocProjectPhase(doc, vbplProjectPhaseFilter)) return false;
      }

      // Lọc theo Cấp độ Gate cụ thể khi người dùng chọn lọc theo Gate ở chế độ Dự án
      if (col1ViewMode === 'BY_PROJECT' && vbplGateFilter !== 'ALL') {
        if (!doc.linkedGates.includes(vbplGateFilter)) return false;
      }

      if (filterDocType !== 'ALL' && doc.docType !== filterDocType) return false;

      // Áp dụng Bộ máy Điều khoản Chuyển tiếp Pháp lý (Legal Cut-off Engine)
      if (legalCutoffMode === 'PROJECT_TRANSITION') {
        const cutoffEval = evaluateLegalDocumentCutoff(
          doc,
          activeProjectMilestones,
          'PROJECT_TRANSITION'
        );
        if (!cutoffEval.included) return false;
      } else {
        // Chế độ mặc định: Chỉ văn bản còn hiệu lực hiện tại (ẩn văn bản hết hiệu lực chỉ dùng chuyển tiếp như DOC-15)
        if (doc.validityPeriod === 'AMENDED') return false;

        if (
          filterValidityPeriod === 'EFFECTIVE' &&
          (doc.validityPeriod === 'Sắp có hiệu lực' || doc.validityPeriod === 'UPCOMING')
        )
          return false;
        if (
          filterValidityPeriod === 'UPCOMING' &&
          doc.validityPeriod !== 'Sắp có hiệu lực' &&
          doc.validityPeriod !== 'UPCOMING'
        )
          return false;
      }

      if (globalSearch.trim()) {
        const q = exactMatchAccent
          ? globalSearch.trim().toLowerCase()
          : removeVietnameseTones(globalSearch.trim()).toLowerCase();
        const haystackRaw = `${doc.docNumber} ${doc.title} ${doc.ssotFileName} ${doc.subSectorLabel} ${doc.nodes
          .map(n => n.code + ' ' + n.title + ' ' + n.content)
          .join(' ')}`;
        const haystack = exactMatchAccent
          ? haystackRaw.toLowerCase()
          : removeVietnameseTones(haystackRaw).toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [
    legalDocs,
    pane2SubTab,
    bookmarkedDocIds,
    recentDocIds,
    techStandardQuickFilter,
    vbplIndustryGroupFilter,
    vbplSubSectorFilter,
    vbplDomainFilter,
    vbplProjectFilter,
    col1ViewMode,
    vbplProjectPhaseFilter,
    vbplGateFilter,
    filterDocType,
    filterValidityPeriod,
    legalCutoffMode,
    activeProjectMilestones,
    globalSearch,
    exactMatchAccent,
  ]);

  const currentLegalDoc = useMemo(
    () => filteredLegalDocs.find(d => d.id === selectedDocId) || filteredLegalDocs[0] || legalDocs[0],
    [filteredLegalDocs, selectedDocId, legalDocs]
  );

  // ==========================================================================
  // BREADCRUMB PHÂN CẤP CỘT 2 (THƯ VIỆN -> NGÀNH -> CHUYÊN NGÀNH CON -> VĂN BẢN)
  // ==========================================================================
  const vbplBreadcrumbPath = useMemo<VbplBreadcrumbPath>(() => {
    // Xác định Ngành (Level 1): ưu tiên bộ lọc đang chọn, nếu ALL thì suy ra từ văn bản đang mở
    const resolvedIndustry =
      vbplIndustryGroupFilter !== 'ALL'
        ? LEGAL_CATEGORY_TREE.find(g => g.id === vbplIndustryGroupFilter) || null
        : currentLegalDoc
        ? LEGAL_CATEGORY_TREE.find(g => g.id === currentLegalDoc.industryGroupId) || null
        : null;

    // Xác định Chuyên ngành con (Level 2): ưu tiên bộ lọc chuyên ngành, nếu ALL thì suy ra từ văn bản khi cần hiển thị đường dẫn đầy đủ
    let resolvedSubSector = null;
    if (vbplSubSectorFilter !== 'ALL') {
      for (const grp of LEGAL_CATEGORY_TREE) {
        const foundSub = grp.children.find(c => c.code === vbplSubSectorFilter);
        if (foundSub) {
          resolvedSubSector = foundSub;
          break;
        }
      }
    } else if (vbplIndustryGroupFilter === 'ALL' && currentLegalDoc && resolvedIndustry) {
      resolvedSubSector =
        resolvedIndustry.children.find(c => c.code === currentLegalDoc.subSectorCode) || null;
    }

    const resolvedDomain =
      vbplDomainFilter !== 'ALL'
        ? TAXONOMY_3D.functionalDomains.find(d => d.code === vbplDomainFilter) || null
        : null;

    const resolvedProjectGroup =
      vbplProjectFilter !== 'ALL'
        ? TAXONOMY_3D.projectTypes.find(p => p.code === vbplProjectFilter) || null
        : null;

    let currentLevel: VbplNavigationLevel = 'ALL_LIBRARY';
    if (expandedInlineDocId && currentLegalDoc) {
      currentLevel = 'DOCUMENT_LEVEL';
    } else if (vbplProjectFilter !== 'ALL') {
      currentLevel = 'PROJECT_GROUP_LEVEL';
    } else if (vbplDomainFilter !== 'ALL' || vbplSubSectorFilter !== 'ALL') {
      currentLevel = 'SUBSECTOR_LEVEL';
    } else if (vbplIndustryGroupFilter !== 'ALL') {
      currentLevel = 'INDUSTRY_LEVEL';
    }

    return {
      currentLevel,
      industryGroup: resolvedIndustry,
      subSector: resolvedSubSector,
      functionalDomain: resolvedDomain,
      projectGroup: resolvedProjectGroup
        ? { code: resolvedProjectGroup.code, name: resolvedProjectGroup.name }
        : null,
      activeDocument: currentLegalDoc || null,
      siblingSubSectors: resolvedIndustry ? resolvedIndustry.children : [],
      totalDocsInScope: filteredLegalDocs.length,
    };
  }, [
    vbplIndustryGroupFilter,
    vbplSubSectorFilter,
    vbplDomainFilter,
    vbplProjectFilter,
    currentLegalDoc,
    expandedInlineDocId,
    filteredLegalDocs.length,
  ]);

  const handleBreadcrumbToRoot = () => {
    setVbplIndustryGroupFilter('ALL');
    setVbplSubSectorFilter('ALL');
    setVbplDomainFilter('ALL');
    setVbplProjectFilter('ALL');
    setExpandedInlineDocId(null);
    setPane2SubTab('DOCS');
    showToast('Đã quay lại cấp gốc: Toàn thư viện (15 Ngành)');
  };

  const handleBreadcrumbToIndustry = (groupId: string) => {
    const grp = LEGAL_CATEGORY_TREE.find(g => g.id === groupId);
    setVbplIndustryGroupFilter(groupId);
    setVbplSubSectorFilter('ALL');
    setVbplDomainFilter('ALL');
    setVbplProjectFilter('ALL');
    setExpandedInlineDocId(null);
    setExpandedCatGroups(prev => ({ ...prev, [groupId]: true }));
    setExpandedIndustryDocCatalog(prev => ({ ...prev, [groupId]: true }));
    setPane2SubTab('DOCS');
    if (grp) {
      showToast(`Đang xem cấp Ngành: ${grp.name}`);
    }
  };

  const handleBreadcrumbToSubSector = (groupId: string, subSectorCode: string) => {
    const grp = LEGAL_CATEGORY_TREE.find(g => g.id === groupId);
    const sub = grp?.children.find(c => c.code === subSectorCode);
    setVbplIndustryGroupFilter(groupId);
    setVbplSubSectorFilter(subSectorCode);
    setVbplProjectFilter('ALL');
    setExpandedInlineDocId(null);
    setExpandedCatGroups(prev => ({ ...prev, [groupId]: true }));
    setPane2SubTab('DOCS');
    if (sub) {
      showToast(`Đang xem Chuyên ngành con: ${sub.name}`);
    }
  };

  const handleBreadcrumbToDocument = (doc: LegalDocument) => {
    setSelectedDocId(doc.id);
    setExpandedInlineDocId(doc.id);
    if (doc.nodes.length > 0) {
      setActiveNodeId(doc.nodes[0].id);
    }
    setTimeout(() => {
      const cardEl = document.getElementById(`col2-doc-card-${doc.id}`);
      if (cardEl) cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  };

  const handleBreadcrumbStepBack = () => {
    // 1. Nếu đang bung mục lục văn bản (DOCUMENT_LEVEL) -> Thu gọn về danh sách Nhóm dự án / Lĩnh vực con
    if (expandedInlineDocId !== null) {
      setExpandedInlineDocId(null);
      showToast('Đã đóng mục lục văn bản, quay về danh sách hiện tại');
      return;
    }
    // 2. Nếu đang lọc theo Nhóm dự án (PROJECT_GROUP_LEVEL) -> Lùi 1 cấp về Lĩnh vực con (QLCL, QLCP...)
    if (vbplProjectFilter !== 'ALL') {
      setVbplProjectFilter('ALL');
      showToast(
        `Đã quay lại Lĩnh vực con: ${
          vbplBreadcrumbPath.functionalDomain?.code || vbplBreadcrumbPath.subSector?.name || 'Tất cả dự án'
        }`
      );
      return;
    }
    // 3. Nếu đang lọc theo Lĩnh vực con (QLCL, QLCP...) hoặc Chuyên ngành con -> Lùi 1 cấp về Ngành cha
    if ((vbplDomainFilter !== 'ALL' || vbplSubSectorFilter !== 'ALL') && vbplBreadcrumbPath.industryGroup) {
      handleBreadcrumbToIndustry(vbplBreadcrumbPath.industryGroup.id);
      return;
    }
    // 4. Nếu đang ở Ngành (INDUSTRY_LEVEL) -> Lùi 1 cấp về Toàn thư viện (ALL_LIBRARY)
    if (vbplIndustryGroupFilter !== 'ALL') {
      handleBreadcrumbToRoot();
      return;
    }
    showToast('Đang ở cấp cao nhất: Toàn thư viện 15 Ngành');
  };

  const jumpToArticleNode = (docId: string, nodeId: string, switchToContent = false) => {
    if (selectedDocId !== docId) {
      setSelectedDocId(docId);
    }
    setActiveNodeId(nodeId);
    if (switchToContent) {
      setRightReaderMode('FULL_CONTENT');
    }
    setTimeout(() => {
      const el = document.getElementById(`reader-node-${nodeId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
  };

  // ==========================================================================
  // STATE BƯỚC 3: LẬP KẾ HOẠCH STAGE-GATE & RACI THEO LOẠI HÌNH DỰ ÁN
  // ==========================================================================
  const [selectedGateCode, setSelectedGateCode] = useState('G12');
  const [checkedAuditItems, setCheckedAuditItems] = useState<Record<string, boolean>>({
    '0.1-0': true,
    '0.1-1': true,
    '0.1-2': true,
    'I.1.1-0': true,
    'I.1.1-1': true,
    'I.5.1-0': true,
    'I.5.1-1': true,
    'I.6.1-0': true,
    'II.9.1-0': true,
    'II.10.2-0': true,
    'II.11.1-0': true,
    'II.12.1-0': true,
    'II.12.1-1': true,
  });

  // Lưu trạng thái từng Cổng Stage-Gate theo từng Loại hình Dự án (Trục Y)
  const [projectGateStatusMap, setProjectGateStatusMap] = useState<
    Record<ProjectArchetypeCode, Record<string, GateWorkflowStatus>>
  >(() => {
    const baseMap: Record<string, GateWorkflowStatus> = {};
    INITIAL_GATES.forEach(g => {
      baseMap[g.gate] = g.status || 'DRAFT';
    });
    return {
      KCN: { ...baseMap },
      HTKT: {
        ...baseMap,
        G12: 'APPROVED',
        G14: 'IN_REVIEW',
        G15: 'DRAFT',
      },
      DAN_DUNG: {
        ...baseMap,
        G11: 'IN_REVIEW',
        G12: 'DRAFT',
        G14: 'DRAFT',
        G15: 'DRAFT',
      },
      CCN: {
        ...baseMap,
        G10: 'IN_REVIEW',
        G11: 'DRAFT',
        G12: 'DRAFT',
        G14: 'DRAFT',
        G15: 'DRAFT',
      },
      FTZ: {
        ...baseMap,
        G6: 'IN_REVIEW',
        G9: 'DRAFT',
        G10: 'DRAFT',
        G11: 'DRAFT',
        G12: 'DRAFT',
        G14: 'DRAFT',
        G15: 'DRAFT',
      },
      PPP_BT: {
        ...baseMap,
        G11: 'APPROVED',
        G12: 'IN_REVIEW',
        G14: 'HARD_STOP_BLOCKED',
        G15: 'DRAFT',
      },
    };
  });

  // Bộ máy Đánh giá Khóa chéo 3 Trục (3-Way Gate Locking: Pháp lý - QA/QC - Dòng tiền IPC)
  const evaluateGateCrossLock = (
    projectCode: ProjectArchetypeCode,
    gateItem: StageGateItem
  ): GateCrossLockEvaluation => {
    const gateNum = parseInt(gateItem.gate.replace('G', ''), 10) || 0;
    const isPaymentGate = gateNum >= 7;
    const isBondApplicable = gateNum >= 11;

    const projMeta =
      projectProfiles.find(p => p.code === projectCode) || projectProfiles[0];

    const perfBondDaysLeft = calcDaysUntilReference(projMeta.performanceBondExpiry);
    const advBondDaysLeft = calcDaysUntilReference(projMeta.advanceBondExpiry);
    const minBondDaysLeft = Math.min(perfBondDaysLeft, advBondDaysLeft);

    const lockReasons: GateCrossLockReason[] = [];

    if (isPaymentGate) {
      // Quy tắc (a): Còn RFI hoặc ITP nghiệm thu chất lượng chưa đóng tại Bước 4
      const pendingRfiOrItp = qaqcControlRecords.filter(
        q =>
          q.gateRef === gateItem.gate &&
          q.projectAxes.includes(projectCode) &&
          (q.kind === 'RFI' || q.kind === 'ITP') &&
          q.status === 'OPEN_PENDING'
      );
      if (pendingRfiOrItp.length > 0) {
        lockReasons.push({
          ruleCode: 'A_RFI_ITP',
          label: `(a) Còn ${pendingRfiOrItp.length} RFI/ITP chưa đóng tại Bước 4`,
          detail: `${pendingRfiOrItp.map(i => `${i.code}: ${i.title}`).join('; ')}`,
          actionLabel: 'Mở RFI/ITP đang treo tại Bước 4 →',
          targetTab: 'STEP4_EXECUTE',
          targetProcessId: pendingRfiOrItp[0].processId,
        });
      }

      // Quy tắc (b): Thiếu chứng chỉ hợp quy VLXD (CO/CQ theo QCVN 16:2023) hoặc LAS-XD
      const pendingVlxdLas = qaqcControlRecords.filter(
        q =>
          q.gateRef === gateItem.gate &&
          q.projectAxes.includes(projectCode) &&
          (q.kind === 'CO_CQ_QCVN16' || q.kind === 'LAS_XD') &&
          q.status === 'OPEN_PENDING'
      );
      const hasChronoLasError =
        (gateItem.gate === 'G12' || gateItem.gate === 'G14') && chronoAuditStatus.length > 0;
      if (pendingVlxdLas.length > 0 || hasChronoLasError) {
        const parts: string[] = [];
        if (pendingVlxdLas.length > 0) {
          parts.push(pendingVlxdLas.map(i => `${i.code}: ${i.title}`).join('; '));
        }
        if (hasChronoLasError) {
          parts.push(
            `Vi phạm logic thời gian LAS-XD (RF-05: ${chronoAuditStatus.length} lỗi ở Bước 5A)`
          );
        }
        lockReasons.push({
          ruleCode: 'B_VLXD_LAS',
          label: '(b) Thiếu CO/CQ (QCVN 16:2023) hoặc Kết quả LAS-XD chưa hợp lệ',
          detail: parts.join(' | '),
          actionLabel:
            pendingVlxdLas.length > 0
              ? 'Mở hồ sơ VLXD / LAS tại Bước 4 →'
              : 'Mở Kiểm toán LAS tại Bước 5A →',
          targetTab: pendingVlxdLas.length > 0 ? 'STEP4_EXECUTE' : 'STEP5_AUDIT',
          targetProcessId: pendingVlxdLas[0]?.processId || 'QT-03',
          targetStep5Mode: 'FORENSIC_VO',
        });
      }

      // Quy tắc (c): Phát sinh VO (Bước 5A) vượt thẩm quyền hoặc chưa phê duyệt phụ lục hợp đồng
      const hasUnapprovedVoWizard =
        (gateItem.gate === 'G14' || gateItem.gate === 'G15') &&
        (voState.isOutsideScope === 'YES' ||
          voState.exceedsPkgPrice === 'YES' ||
          voState.affectsSafetyPCCC === 'YES') &&
        !voAppendixApproved;
      const pendingVoWorkflow = approvalWorkflows.find(
        w =>
          w.gateRef === gateItem.gate &&
          w.domain === 'QLHD' &&
          w.status !== 'CDT_APPROVED'
      );
      if (hasUnapprovedVoWizard || pendingVoWorkflow) {
        lockReasons.push({
          ruleCode: 'C_VO_UNAPPROVED',
          label: '(c) Phát sinh VO vượt thẩm quyền hoặc chưa duyệt Phụ lục Hợp đồng',
          detail: pendingVoWorkflow
            ? `${pendingVoWorkflow.docCode}: ${pendingVoWorkflow.bottleneckReason || pendingVoWorkflow.title}`
            : 'VO Wizard (Bước 5A) ghi nhận phát sinh ngoài thiết kế / vượt dự toán nhưng chưa phê duyệt Phụ lục HĐ.',
          actionLabel: 'Mở VO Wizard tại Bước 5A →',
          targetTab: 'STEP5_AUDIT',
          targetStep5Mode: 'FORENSIC_VO',
        });
      }

      // Quy tắc (d): Bảo lãnh tạm ứng / Bảo lãnh thực hiện hợp đồng hết hạn hoặc còn < 15 ngày
      if (isBondApplicable && minBondDaysLeft < 15) {
        const expiredMsgs: string[] = [];
        if (perfBondDaysLeft < 15) {
          expiredMsgs.push(
            `Bảo lãnh THHĐ (${projMeta.performanceBondExpiry}: ${
              perfBondDaysLeft < 0
                ? `đã hết hạn ${Math.abs(perfBondDaysLeft)} ngày`
                : `còn ${perfBondDaysLeft} ngày`
            })`
          );
        }
        if (advBondDaysLeft < 15) {
          expiredMsgs.push(
            `Bảo lãnh Tạm ứng (${projMeta.advanceBondExpiry}: ${
              advBondDaysLeft < 0
                ? `đã hết hạn ${Math.abs(advBondDaysLeft)} ngày`
                : `còn ${advBondDaysLeft} ngày`
            })`
          );
        }
        lockReasons.push({
          ruleCode: 'D_BOND_EXPIRY',
          label: '(d) Bảo lãnh THHĐ / Tạm ứng hết hạn hoặc còn dưới 15 ngày',
          detail: expiredMsgs.join(' · '),
          actionLabel: 'Gia hạn Bảo lãnh ngay (+180 ngày)',
          targetTab: 'STEP3_PLAN',
        });
      }
    }

    const fp = gateItem.financialProfile || {
      allocatedContractVnd: 100_000_000_000,
      acceptedValueVnd: 50_000_000_000,
      disbursedValueVnd: 50_000_000_000,
      ipcTrancheCode: `IPC-${gateItem.gate}`,
      ipcTitle: gateItem.name,
    };
    const pendingPayableVnd = Math.max(0, fp.acceptedValueVnd - fp.disbursedValueVnd);
    const isHardStopLocked = isPaymentGate && lockReasons.length > 0;
    const blockedCapexVnd = isHardStopLocked ? pendingPayableVnd : 0;

    return {
      gateCode: gateItem.gate,
      isPaymentGate,
      isBondApplicable,
      isHardStopLocked,
      lockReasons,
      allocatedVnd: fp.allocatedContractVnd,
      acceptedVnd: fp.acceptedValueVnd,
      disbursedVnd: fp.disbursedValueVnd,
      blockedCapexVnd,
      pendingPayableVnd,
      performanceBondExpiry: projMeta.performanceBondExpiry,
      advanceBondExpiry: projMeta.advanceBondExpiry,
      perfBondDaysLeft,
      advBondDaysLeft,
      minBondDaysLeft,
      ipcTrancheCode: fp.ipcTrancheCode || `IPC-${gateItem.gate}`,
      ipcTitle: fp.ipcTitle || gateItem.name,
    };
  };

  // Đồng bộ danh sách cổng theo Loại hình Dự án hiện hành + Tự động áp đặt HARD_STOP_BLOCKED khi vi phạm Khóa chéo 3 Trục
  const projectScopedGates = useMemo<StageGateItem[]>(() => {
    const archetypeMap = projectGateStatusMap[activeProjectArchetype] || {};
    return gates.map(g => {
      const baseStatus = archetypeMap[g.gate] || g.status || 'DRAFT';
      const crossEval = evaluateGateCrossLock(activeProjectArchetype, g);
      const effectiveStatus: GateWorkflowStatus =
        crossEval.isPaymentGate &&
        crossEval.isHardStopLocked &&
        (baseStatus !== 'APPROVED' || (crossEval.isBondApplicable && crossEval.minBondDaysLeft < 15))
          ? 'HARD_STOP_BLOCKED'
          : baseStatus;

      return {
        ...g,
        status: effectiveStatus,
      };
    });
  }, [
    gates,
    projectGateStatusMap,
    activeProjectArchetype,
    projectProfiles,
    qaqcControlRecords,
    chronoAuditStatus,
    voState,
    voAppendixApproved,
    approvalWorkflows,
  ]);

  const currentGate = useMemo(
    () => projectScopedGates.find(g => g.gate === selectedGateCode) || projectScopedGates[0],
    [projectScopedGates, selectedGateCode]
  );
  const currentStep = currentGate.steps[0];
  const currentGateCrossLock = useMemo(
    () => evaluateGateCrossLock(activeProjectArchetype, currentGate),
    [
      activeProjectArchetype,
      currentGate,
      projectProfiles,
      qaqcControlRecords,
      chronoAuditStatus,
      voState,
      voAppendixApproved,
      approvalWorkflows,
    ]
  );

  // Tính toán Thanh Tiến độ Tổng thể Stage-Gate (Overall Progress Bar) cho Dự án hiện tại
  const stageGateProgressSummary = useMemo<StageGateProgressSummary>(() => {
    const totalGates = projectScopedGates.length || 1;
    let approvedCount = 0;
    let inReviewCount = 0;
    let blockedCount = 0;
    let draftCount = 0;

    projectScopedGates.forEach(g => {
      const st = g.status || 'DRAFT';
      if (st === 'APPROVED') approvedCount += 1;
      else if (st === 'IN_REVIEW') inReviewCount += 1;
      else if (st === 'HARD_STOP_BLOCKED') blockedCount += 1;
      else draftCount += 1;
    });

    const strictCompletionPct = Math.round((approvedCount / totalGates) * 100);
    const weightedProgressPct = Math.min(
      100,
      Math.round(((approvedCount * 1 + inReviewCount * 0.5 + blockedCount * 0.2) / totalGates) * 100)
    );

    const approvedPctWidth = Math.round((approvedCount / totalGates) * 1000) / 10;
    const inReviewPctWidth = Math.round((inReviewCount / totalGates) * 1000) / 10;
    const blockedPctWidth = Math.round((blockedCount / totalGates) * 1000) / 10;
    const draftPctWidth = Math.max(
      0,
      Math.round((100 - approvedPctWidth - inReviewPctWidth - blockedPctWidth) * 10) / 10
    );

    let checklistDoneCount = 0;
    let checklistTotalCount = 0;
    projectScopedGates.forEach(g => {
      g.steps.forEach(st => {
        st.auditChecklist.forEach((_, idx) => {
          checklistTotalCount += 1;
          if (checkedAuditItems[`${st.code}-${idx}`]) {
            checklistDoneCount += 1;
          }
        });
      });
    });
    const checklistPct =
      checklistTotalCount > 0 ? Math.round((checklistDoneCount / checklistTotalCount) * 100) : 0;

    const activeBottleneckGate =
      projectScopedGates.find(g => g.status === 'HARD_STOP_BLOCKED') ||
      projectScopedGates.find(g => g.status === 'IN_REVIEW') ||
      null;

    const nextMilestoneGate =
      projectScopedGates.find(g => g.status !== 'APPROVED') ||
      projectScopedGates[projectScopedGates.length - 1] ||
      null;

    const phaseOrder = [
      'Giai đoạn I: Chuẩn bị dự án',
      'Giai đoạn II: Thực hiện dự án',
      'Giai đoạn III: Kết thúc & Đưa vào khai thác',
    ];
    const phaseBreakdown: StageGatePhaseProgress[] = phaseOrder.map(phaseName => {
      const gatesInPhase = projectScopedGates.filter(g => g.phase === phaseName);
      const total = gatesInPhase.length;
      const approved = gatesInPhase.filter(g => g.status === 'APPROVED').length;
      const inReview = gatesInPhase.filter(g => g.status === 'IN_REVIEW').length;
      const blocked = gatesInPhase.filter(g => g.status === 'HARD_STOP_BLOCKED').length;
      const draft = gatesInPhase.filter(g => !g.status || g.status === 'DRAFT').length;
      const pct = total > 0 ? Math.round((approved / total) * 100) : 0;
      return {
        phase: phaseName,
        total,
        approved,
        inReview,
        blocked,
        draft,
        pct,
      };
    });

    return {
      projectCode: activeProjectArchetype,
      projectName: currentArchetypeMeta.name,
      authority: currentArchetypeMeta.authority,
      totalGates,
      approvedCount,
      inReviewCount,
      blockedCount,
      draftCount,
      strictCompletionPct,
      weightedProgressPct,
      approvedPctWidth,
      inReviewPctWidth,
      blockedPctWidth,
      draftPctWidth,
      checklistDoneCount,
      checklistTotalCount,
      checklistPct,
      activeBottleneckGate,
      nextMilestoneGate,
      phaseBreakdown,
    };
  }, [projectScopedGates, checkedAuditItems, activeProjectArchetype, currentArchetypeMeta]);

  // State lưu kết quả Phân tích rủi ro chi tiết bằng AI tại Chốt chặn Rủi ro Bước 3
  const [gateRiskAiReports, setGateRiskAiReports] = useState<
    Record<string, { report: string; source: string; timestamp: string; projectCode: string; projectName: string }>
  >({});
  const [analyzingGateStepKey, setAnalyzingGateStepKey] = useState<string | null>(null);

  const handleAnalyzeStepRiskByAI = async (
    gateCode: string,
    gateTitle: string,
    step: { code: string; title: string; mandatory: string; riskFlag: string }
  ) => {
    const reportKey = `${gateCode}-${step.code}-${activeProjectArchetype}`;
    setAnalyzingGateStepKey(reportKey);
    try {
      const customPrompt = `Phân tích rủi ro chi tiết và đề xuất biện pháp khắc phục cho Bước ${step.code} (${step.title}) thuộc cổng kiểm soát ${gateCode} (${gateTitle}) đối với loại hình dự án [${activeProjectArchetype}] ${currentArchetypeMeta.name}. Cơ quan thẩm quyền: ${currentArchetypeMeta.authority}. Lưu ý đặc thù: ${currentArchetypeMeta.specialNote}. Chốt chặn rủi ro hiện tại: ${step.riskFlag}`;
      const data = await analyzeLegalWithHybridAi({
        agentId: 'AGENT-03',
        agentName: 'Chuyên gia Phân tích Chốt chặn Rủi ro & Biện pháp Khắc phục (Stage-Gate AI)',
        projectCode: currentArchetypeMeta.code,
        projectName: currentArchetypeMeta.name,
        authority: currentArchetypeMeta.authority,
        specialNote: currentArchetypeMeta.specialNote,
        prompt: customPrompt,
        chronoErrorsCount: chronoAuditStatus.length,
        gateCode,
        stepCode: step.code,
        stepTitle: step.title,
        riskFlag: step.riskFlag,
      });
      const reportText = data.report || 'Không nhận được phản hồi phân tích từ máy chủ.';
      const sourceText = data.source || 'AI Legal Engine';
      setGateRiskAiReports(prev => ({
        ...prev,
        [reportKey]: {
          report: reportText,
          source: sourceText,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          projectCode: currentArchetypeMeta.code,
          projectName: currentArchetypeMeta.name,
        },
      }));
      await recordAuditLog({
        module: 'STAGE_GATE',
        action: `AI Phân tích Chốt chặn Rủi ro [${gateCode} - Bước ${step.code}] theo dự án [${activeProjectArchetype}]`,
        entityRef: `${gateCode}/${step.code}`,
        newState: 'RISK_ANALYZED',
      });
      showToast(`Đã phân tích rủi ro Bước ${step.code} theo dự án [${activeProjectArchetype}]`);
    } catch {
      showToast('Lỗi kết nối máy chủ AI khi phân tích rủi ro.');
    } finally {
      setAnalyzingGateStepKey(null);
    }
  };

  // ==========================================================================
  // STATE BƯỚC 4: THỰC THI QUY TRÌNH QA/QC, BIỂU MẪU AUTO-FILL & NHẬT KÝ
  // ==========================================================================
  const [selectedProcessId, setSelectedProcessId] = useState('QT-08');
  const [selectedFlowStepIdx, setSelectedFlowStepIdx] = useState(0);
  const [showFormPreviewModal, setShowFormPreviewModal] = useState(false);
  const [customDiaryEntries, setCustomDiaryEntries] = useState<
    Array<{ id: string; date: string; processCode: string; author: string; content: string; status: string }>
  >([
    {
      id: 'NK-2026-01',
      date: '16/11/2026 08:30',
      processCode: 'QT-08',
      author: 'KS. Đặng Quốc Bảo (CHT) & KS. Nguyễn Hoàng Nam (TVGS)',
      content:
        'Ngày 16/11/2026 | Thời tiết: Nắng ráo (31°C). Nhân lực: 45 CN + 03 KS. Thi công cốt thép, cốp pha dầm sàn tầng 5 trục A-D/1-6. Ý KIẾN TVGS: Đai dầm vùng gối đạt TCVN 4453.',
      status: 'TVGS Đã ký số',
    },
  ]);

  const currentProcess = useMemo(
    () => QAQC_PROCESSES.find(p => p.id === selectedProcessId) || QAQC_PROCESSES[0],
    [selectedProcessId]
  );
  const currentFlowStep = currentProcess.steps[selectedFlowStepIdx] || currentProcess.steps[0];

  // ==========================================================================
  // STATE BƯỚC 5: KIỂM SOÁT, VO WIZARD, KIỂM TOÁN THỜI GIAN & QUẢN TRỊ 4 PHÂN HỆ
  // ==========================================================================
  const [step5SubMode, setStep5SubMode] = useState<
    'PORTFOLIO_DASHBOARD' | 'FORENSIC_VO' | 'ENTERPRISE_4MODULES'
  >('PORTFOLIO_DASHBOARD');
  const [enterpriseModuleTab, setEnterpriseModuleTab] = useState<'HRM' | 'ADMIN_WF' | 'TASKS_RACI' | 'ASSETS_LAS' | 'AUDIT_LOG'>('ADMIN_WF');
  const [selectedD3UnitFilter, setSelectedD3UnitFilter] = useState<string>('ALL');

  const filteredApprovalWorkflows = useMemo(() => {
    if (selectedD3UnitFilter === 'ALL') return approvalWorkflows;
    if (selectedD3UnitFilter.startsWith('WF_')) {
      const wfId = selectedD3UnitFilter.replace('WF_', '');
      return approvalWorkflows.filter(w => w.id === wfId);
    }
    if (selectedD3UnitFilter === 'OUT_APPROVED') {
      return approvalWorkflows.filter(
        w => w.status === 'CDT_APPROVED' || w.status === 'TVGS_VERIFIED'
      );
    }
    if (selectedD3UnitFilter === 'OUT_BOTTLENECK') {
      return approvalWorkflows.filter(
        w => w.status === 'PENDING_REVIEW' || w.status === 'REJECTED_HOLD'
      );
    }
    const targetRole = selectedD3UnitFilter.replace('UNIT_', '');
    return approvalWorkflows.filter(w => {
      const reqRole = employees.find(e => e.id === w.requesterId)?.rbacRole;
      const appRole = employees.find(e => e.id === w.approverId)?.rbacRole;
      return reqRole === targetRole || appRole === targetRole || w.consultedRole === targetRole;
    });
  }, [approvalWorkflows, employees, selectedD3UnitFilter]);

  // Chuyển đổi trạng thái Stage-Gate có kiểm soát RBAC/RACI, Hard-Stop 3-Way Locking & Ký số SHA-256
  const handleUpdateGateStatus = async (gateCode: string, nextStatus: GateWorkflowStatus) => {
    if (nextStatus === 'APPROVED' && !raciPerms.canCdtFinalApprove) {
      showToast(
        raciPerms.isContractor
          ? 'RBAC Chặn: Yêu cầu quyền TVGS / Chủ đầu tư!'
          : `RBAC Chặn: Chỉ Chủ đầu tư (CĐT - Accountable) mới có thẩm quyền Phê duyệt cuối cùng Cổng ${gateCode}!`
      );
      return;
    }

    if (nextStatus === 'HARD_STOP_BLOCKED' && !raciPerms.canReturnForSupplement) {
      showToast('RBAC Chặn: Yêu cầu quyền TVGS / Ban QLDA / Chủ đầu tư!');
      return;
    }

    const prevGate = projectScopedGates.find(g => g.gate === gateCode);
    const isUnlockAction = prevGate?.status === 'HARD_STOP_BLOCKED' && nextStatus !== 'HARD_STOP_BLOCKED';
    if (isUnlockAction && !raciPerms.canUnlockHardStop) {
      showToast(`RBAC Chặn: Chỉ Chủ đầu tư (CĐT) mới có quyền mở khóa cổng Hard-Stop ${gateCode}!`);
      return;
    }

    const targetGateObj = gates.find(g => g.gate === gateCode);
    if (nextStatus === 'APPROVED' && targetGateObj) {
      const lockEval = evaluateGateCrossLock(activeProjectArchetype, targetGateObj);
      if (lockEval.isHardStopLocked) {
        showToast(
          `HARD-STOP ${gateCode}: Không thể phê duyệt khi còn ${lockEval.lockReasons.length} vi phạm Khóa chéo 3 Trục (${lockEval.lockReasons[0].label})!`
        );
        return;
      }
    }

    if (gateCode === 'G14' && nextStatus === 'APPROVED' && chronoAuditStatus.length > 0) {
      showToast('HARD-STOP G14: Đang tồn tại lỗi trình tự thời gian nghiệm thu (RF-05) tại Bước 5. Không thể phê duyệt giải ngân!');
      return;
    }

    const actionVerb =
      nextStatus === 'APPROVED'
        ? isUnlockAction
          ? `CĐT Mở khóa cổng Hard-Stop & Phê duyệt cuối cùng Gate ${gateCode}`
          : `CĐT Phê duyệt cuối cùng qua cổng Stage-Gate ${gateCode}`
        : isUnlockAction
        ? `CĐT Mở khóa cổng Hard-Stop ${gateCode} → ${nextStatus}`
        : nextStatus === 'IN_REVIEW'
        ? `Nộp hồ sơ / Trình thẩm định Cổng ${gateCode}`
        : nextStatus === 'HARD_STOP_BLOCKED'
        ? `Trả lại bổ sung / Kích hoạt Chặn Hard-Stop tại Cổng ${gateCode}`
        : `Chuyển trạng thái Cổng ${gateCode} về Chuẩn bị (DRAFT)`;

    setPendingDigitalSignoff({
      title: `Xác nhận Trạng thái Cổng ${gateCode} (${activeProjectArchetype})`,
      actionLabel: actionVerb,
      module: 'STAGE_GATE',
      entityRef: `${activeProjectArchetype} / Gate ${gateCode}`,
      previousState: prevGate?.status || 'IN_REVIEW',
      newState: nextStatus,
      riskSeverity: nextStatus === 'HARD_STOP_BLOCKED' ? 'CRITICAL' : 'NOMINAL',
      requiredRaciLetter: nextStatus === 'APPROVED' ? 'A' : 'R',
      defaultNote:
        nextStatus === 'APPROVED'
          ? `Xác nhận đủ điều kiện pháp lý 3 Trục & mở thông cổng ${gateCode} theo thẩm quyền Chủ đầu tư.`
          : nextStatus === 'HARD_STOP_BLOCKED'
          ? `Yêu cầu bổ sung hồ sơ / khắc phục điều kiện tiên quyết trước khi thông qua cổng ${gateCode}.`
          : `Trình hồ sơ cổng ${gateCode} lên Ban QLDA & TVGS thẩm định theo quy trình RACI.`,
      onConfirm: async (note, sha256Hex) => {
        setGates(prev =>
          prev.map(g =>
            g.gate === gateCode ? { ...g, status: nextStatus, assignedLeadId: currentActor.id } : g
          )
        );
        setProjectGateStatusMap(prev => ({
          ...prev,
          [activeProjectArchetype]: {
            ...(prev[activeProjectArchetype] || {}),
            [gateCode]: nextStatus,
          },
        }));

        await recordAuditLog({
          module: 'STAGE_GATE',
          action: `${actionVerb} [${activeProjectArchetype}]`,
          entityRef: `Gate ${gateCode}`,
          previousState: prevGate?.status || 'IN_REVIEW',
          newState: nextStatus,
          riskSeverity: nextStatus === 'HARD_STOP_BLOCKED' ? 'CRITICAL' : 'NOMINAL',
          sha256Hash: sha256Hex,
          accountabilityNote: note,
        });

        showToast(`Đã ký số & cập nhật Gate ${gateCode} → ${nextStatus} (SHA-256: ${sha256Hex.slice(0, 12)})`);
      },
    });
  };

  // TVGS Xác nhận kỹ thuật / Nghiệm thu tại Stage-Gate (Bước 3)
  const handleTvgsVerifyGate = (gateCode: string) => {
    if (!raciPerms.canTvgsVerify) {
      showToast('RBAC Chặn: Chỉ Tư vấn Giám sát (TVGS) mới có quyền xác nhận kỹ thuật & nghiệm thu!');
      return;
    }
    const prevGate = projectScopedGates.find(g => g.gate === gateCode);
    const key = `${activeProjectArchetype}::${gateCode}`;
    setPendingDigitalSignoff({
      title: `TVGS Xác nhận Kỹ thuật & Nghiệm thu · Gate ${gateCode}`,
      actionLabel: `TVGS Xác nhận đạt chuẩn kỹ thuật, QA/QC & khối lượng tại Cổng ${gateCode}`,
      module: 'STAGE_GATE',
      entityRef: `${activeProjectArchetype} / Gate ${gateCode}`,
      previousState: prevGate?.status || 'IN_REVIEW',
      newState: 'TVGS_VERIFIED_GATE',
      requiredRaciLetter: 'R',
      defaultNote: `Đoàn TVGS đã kiểm tra hiện trường, đối soát QA/QC và xác nhận đủ điều kiện kỹ thuật trình CĐT phê duyệt Gate ${gateCode}.`,
      onConfirm: async (note, sha256Hex) => {
        setGateTvgsVerifiedMap(prev => ({ ...prev, [key]: true }));
        if (prevGate?.status === 'DRAFT') {
          setGates(prev =>
            prev.map(g => (g.gate === gateCode ? { ...g, status: 'IN_REVIEW' } : g))
          );
          setProjectGateStatusMap(prev => ({
            ...prev,
            [activeProjectArchetype]: {
              ...(prev[activeProjectArchetype] || {}),
              [gateCode]: 'IN_REVIEW',
            },
          }));
        }
        await recordAuditLog({
          module: 'STAGE_GATE',
          action: `TVGS Xác nhận kỹ thuật & QA/QC tại Gate ${gateCode} (${activeProjectArchetype})`,
          entityRef: `Gate ${gateCode}`,
          previousState: prevGate?.status || 'IN_REVIEW',
          newState: 'TVGS_VERIFIED',
          sha256Hash: sha256Hex,
          accountabilityNote: note,
        });
        showToast(`TVGS đã ký số xác nhận kỹ thuật Gate ${gateCode}!`);
      },
    });
  };

  // Trình duyệt / Phê duyệt Thanh toán & Giải ngân IPC theo RBAC 4 Bên + Ký số SHA-256
  const handleSubmitGateIpcPayment = async (gateCode: string) => {
    const targetGateObj = gates.find(g => g.gate === gateCode);
    if (!targetGateObj) return;
    const lockEval = evaluateGateCrossLock(activeProjectArchetype, targetGateObj);
    if (lockEval.isHardStopLocked) {
      showToast(
        `HARD-STOP ${gateCode}: Tự động khóa Trình duyệt Thanh toán IPC (${lockEval.lockReasons[0]?.label})!`
      );
      return;
    }

    const payable = lockEval.pendingPayableVnd;

    // Nếu là Nhà thầu hoặc PMU -> Trình duyệt hồ sơ IPC lên TVGS & CĐT
    if (raciPerms.isContractor || raciPerms.isBqlda) {
      setPendingDigitalSignoff({
        title: `Nộp & Trình duyệt Hồ sơ Thanh toán IPC (${lockEval.ipcTrancheCode})`,
        actionLabel: `Trình duyệt Hồ sơ Thanh toán IPC [${lockEval.ipcTrancheCode}] tại Gate ${gateCode} (${formatVndBillions(payable)})`,
        module: 'STAGE_GATE',
        entityRef: `${activeProjectArchetype} / ${lockEval.ipcTrancheCode}`,
        previousState: 'IPC_DRAFT',
        newState: 'PENDING_REVIEW',
        requiredRaciLetter: 'R',
        defaultNote: `${raciPerms.isContractor ? 'Nhà thầu' : 'Ban QLDA'} trình hồ sơ thanh toán ${lockEval.ipcTrancheCode} sau khi đủ điều kiện 3-Way Gate Locking.`,
        onConfirm: async (note, sha256Hex) => {
          const newWf: ApprovalWorkflowItem = {
            id: `WF-IPC-${Date.now().toString(36).toUpperCase()}`,
            docCode: `${lockEval.ipcTrancheCode}/${gateCode}`,
            title: `Hồ sơ đề nghị thanh toán ${lockEval.ipcTitle} (${formatVndBillions(payable)})`,
            gateRef: gateCode,
            domain: 'QLHD',
            requesterId: currentActor.id,
            approverId: 'EMP-01',
            consultedRole: 'TVGS',
            status: 'PENDING_REVIEW',
            submittedAt: new Date().toLocaleDateString('vi-VN'),
            ssotFileName: `XD_KT_${currentActor.rbacRole}_${gateCode}_2026_QLHD_${lockEval.ipcTrancheCode}.pdf`,
            slaHours: 48,
            elapsedHours: 2,
            projectCode: activeProjectArchetype,
            financialImpactVnd: payable,
            dailyInterestPenaltyVnd: Math.round(payable * 0.0003),
          };
          setApprovalWorkflows(prev => [newWf, ...prev]);
          await recordAuditLog({
            module: 'STAGE_GATE',
            action: `Nộp hồ sơ Trình duyệt IPC [${lockEval.ipcTrancheCode}] tại Gate ${gateCode}`,
            entityRef: newWf.docCode,
            previousState: 'IPC_PREPARED',
            newState: 'PENDING_REVIEW',
            sha256Hash: sha256Hex,
            accountabilityNote: note,
          });
          showToast(`Đã trình hồ sơ ${lockEval.ipcTrancheCode} sang Luồng phê duyệt TVGS → CĐT!`);
        },
      });
      return;
    }

    // Nếu là TVGS -> Xác nhận khối lượng IPC
    if (raciPerms.isTvgs) {
      handleTvgsVerifyGate(gateCode);
      return;
    }

    // Chỉ Chủ đầu tư (CDT) mới được Phê duyệt giải ngân cuối cùng
    setPendingDigitalSignoff({
      title: `CĐT Phê duyệt Giải ngân IPC (${lockEval.ipcTrancheCode})`,
      actionLabel: `CĐT Phê duyệt cuối cùng Giải ngân ${lockEval.ipcTrancheCode} (${formatVndBillions(payable)}) tại Gate ${gateCode}`,
      module: 'STAGE_GATE',
      entityRef: `${activeProjectArchetype} / ${lockEval.ipcTrancheCode}`,
      previousState: 'IPC_PENDING',
      newState: 'IPC_DISBURSED',
      requiredRaciLetter: 'A',
      defaultNote: `Chủ đầu tư phê duyệt giải ngân ${formatVndBillions(payable)} sau khi đã kiểm tra đạt chuẩn 3-Way Gate Locking.`,
      onConfirm: async (note, sha256Hex) => {
        setGates(prev =>
          prev.map(g =>
            g.gate === gateCode && g.financialProfile
              ? {
                  ...g,
                  status: 'APPROVED',
                  financialProfile: {
                    ...g.financialProfile,
                    disbursedValueVnd: g.financialProfile.acceptedValueVnd,
                  },
                }
              : g
          )
        );
        setProjectGateStatusMap(prev => ({
          ...prev,
          [activeProjectArchetype]: {
            ...(prev[activeProjectArchetype] || {}),
            [gateCode]: 'APPROVED',
          },
        }));
        if (payable > 0) {
          setProjectProfiles(prev =>
            prev.map(p =>
              p.code === activeProjectArchetype
                ? {
                    ...p,
                    disbursedValueVnd: p.disbursedValueVnd + payable,
                    blockedCapexVnd: Math.max(0, p.blockedCapexVnd - payable),
                  }
                : p
            )
          );
        }

        await recordAuditLog({
          module: 'STAGE_GATE',
          action: `CĐT Phê duyệt Giải ngân IPC [${lockEval.ipcTrancheCode}] tại Gate ${gateCode} (${formatVndBillions(payable)})`,
          entityRef: `${activeProjectArchetype} / ${lockEval.ipcTrancheCode}`,
          previousState: 'IPC_PENDING',
          newState: 'IPC_DISBURSED',
          sha256Hash: sha256Hex,
          accountabilityNote: note,
        });
        showToast(
          `Đã ký số & giải ngân ${lockEval.ipcTrancheCode} (${formatVndBillions(payable)}) tại Gate ${gateCode}!`
        );
      },
    });
  };

  // Đóng/Mở hồ sơ RFI, ITP, CO/CQ QCVN 16:2023, LAS-XD tại Bước 4
  const handleToggleQaQcControl = async (itemId: string) => {
    const target = qaqcControlRecords.find(q => q.id === itemId);
    if (!target) return;
    const nextStatus: QaQcGateControlItem['status'] =
      target.status === 'OPEN_PENDING' ? 'CLOSED_VERIFIED' : 'OPEN_PENDING';
    setQaqcControlRecords(prev =>
      prev.map(q => (q.id === itemId ? { ...q, status: nextStatus } : q))
    );
    await recordAuditLog({
      module: 'QAQC_EXEC',
      action: `${nextStatus === 'CLOSED_VERIFIED' ? 'Đóng & Xác nhận Đạt' : 'Mở lại kiểm tra'} [${target.code}] (${target.gateRef})`,
      entityRef: `${target.gateRef} / ${target.code}`,
      previousState: target.status,
      newState: nextStatus,
      riskSeverity: nextStatus === 'OPEN_PENDING' ? 'WARNING' : 'NOMINAL',
    });
    showToast(
      `${
        nextStatus === 'CLOSED_VERIFIED'
          ? `Đã đóng ${target.code} — Tự động cập nhật điều kiện mở khóa Gate ${target.gateRef}!`
          : `Đã mở lại ${target.code} — Khóa chéo Gate ${target.gateRef} được kích hoạt.`
      }`
    );
  };

  // Gia hạn Bảo lãnh Thực hiện Hợp đồng & Bảo lãnh Tạm ứng (+180 ngày)
  const handleRenewProjectBonds = async (projectCode: ProjectArchetypeCode) => {
    setProjectProfiles(prev =>
      prev.map(p =>
        p.code === projectCode
          ? {
              ...p,
              performanceBondExpiry: '2027-06-30',
              advanceBondExpiry: '2027-05-20',
            }
          : p
      )
    );
    await recordAuditLog({
      module: 'STAGE_GATE',
      action: `Cập nhật gia hạn Bảo lãnh THHĐ & Bảo lãnh Tạm ứng (+180 ngày) cho dự án [${projectCode}]`,
      entityRef: `BOND-${projectCode}`,
      previousState: 'BOND_EXPIRING_OR_EXPIRED',
      newState: 'BOND_EXTENDED_2027',
    });
    showToast(`Đã gia hạn Bảo lãnh THHĐ & Tạm ứng dự án [${projectCode}] đến năm 2027!`);
  };

  // Xử lý phê duyệt Luồng hành chính (Approval Workflow) có khóa quyền RACI & Hộp thoại Ký số SHA-256
  const handleApproveWorkflow = async (wf: ApprovalWorkflowItem, nextStatus: ApprovalWorkflowItem['status']) => {
    if (nextStatus === 'TVGS_VERIFIED' && !raciPerms.canTvgsVerify) {
      showToast(
        raciPerms.isContractor
          ? 'RBAC Chặn: Yêu cầu quyền TVGS / Chủ đầu tư!'
          : 'RBAC Chặn: Cần vai trò Tư vấn Giám sát (TVGS) để xác nhận kỹ thuật / nghiệm thu!'
      );
      return;
    }
    if (nextStatus === 'CDT_APPROVED' && !raciPerms.canCdtFinalApprove) {
      showToast(
        raciPerms.isContractor
          ? 'RBAC Chặn: Yêu cầu quyền TVGS / Chủ đầu tư!'
          : 'RBAC Chặn: Chỉ Chủ đầu tư (CĐT) mới có quyền phê duyệt cuối cùng!'
      );
      return;
    }
    if (nextStatus === 'REJECTED_HOLD' && !raciPerms.canReturnForSupplement) {
      showToast('RBAC Chặn: Yêu cầu quyền TVGS / Chủ đầu tư để trả lại hồ sơ bổ sung!');
      return;
    }

    const actionTitle =
      nextStatus === 'TVGS_VERIFIED'
        ? `TVGS Xác nhận kỹ thuật & nghiệm thu hồ sơ ${wf.docCode}`
        : nextStatus === 'CDT_APPROVED'
        ? `CĐT Phê duyệt cuối cùng hồ sơ ${wf.docCode}`
        : nextStatus === 'REJECTED_HOLD'
        ? `Trả lại yêu cầu bổ sung / Chặn Hold hồ sơ ${wf.docCode}`
        : `Nộp lại / Trình duyệt hồ sơ ${wf.docCode}`;

    setPendingDigitalSignoff({
      title: actionTitle,
      actionLabel: `${actionTitle} (${wf.gateRef} · ${wf.domain})`,
      module: 'STAGE_GATE',
      entityRef: `${wf.docCode} / ${wf.gateRef}`,
      previousState: wf.status,
      newState: nextStatus,
      riskSeverity: nextStatus === 'REJECTED_HOLD' ? 'WARNING' : 'NOMINAL',
      requiredRaciLetter: nextStatus === 'CDT_APPROVED' ? 'A' : 'R',
      defaultNote:
        nextStatus === 'CDT_APPROVED'
          ? `Chủ đầu tư phê duyệt thông qua hồ sơ ${wf.docCode} và cho phép chuyển bước thanh toán/thi công.`
          : nextStatus === 'TVGS_VERIFIED'
          ? `TVGS xác nhận hồ sơ ${wf.docCode} đạt yêu cầu kỹ thuật, quy chuẩn và khối lượng thực tế.`
          : nextStatus === 'REJECTED_HOLD'
          ? `Trả lại hồ sơ ${wf.docCode} để Nhà thầu hoàn thiện bổ sung chứng từ theo quy định.`
          : `Nhà thầu hoàn thiện và nộp trình duyệt lại hồ sơ ${wf.docCode}.`,
      onConfirm: async (note, sha256Hex) => {
        setApprovalWorkflows(prev =>
          prev.map(item =>
            item.id === wf.id
              ? {
                  ...item,
                  status: nextStatus,
                  approverId: nextStatus === 'PENDING_REVIEW' ? item.approverId : currentActor.id,
                  bottleneckReason:
                    nextStatus === 'CDT_APPROVED'
                      ? `CĐT đã phê duyệt (${note})`
                      : nextStatus === 'TVGS_VERIFIED'
                      ? `TVGS đã xác nhận kỹ thuật — Chờ CĐT phê duyệt cuối (${note})`
                      : note,
                }
              : item
          )
        );
        await recordAuditLog({
          module: 'STAGE_GATE',
          action: `${actionTitle} → ${nextStatus}`,
          entityRef: wf.ssotFileName,
          previousState: wf.status,
          newState: nextStatus,
          riskSeverity: nextStatus === 'REJECTED_HOLD' ? 'WARNING' : 'NOMINAL',
          sha256Hash: sha256Hex,
          accountabilityNote: note,
        });
        showToast(`Đã ký số cập nhật hồ sơ ${wf.docCode} → ${nextStatus}`);
      },
    });
  };

  // Tạo yêu cầu VO hoặc RFI mới (Dành cho Nhà thầu / BQLDA / CĐT)
  const handleCreateVoOrRfiRequest = (kind: 'VO' | 'RFI') => {
    const reqNum = Math.floor(100 + Math.random() * 899);
    const docCode = kind === 'VO' ? `VO-${reqNum}/2026/${activeProjectArchetype}` : `RFI-${reqNum}/2026/${activeProjectArchetype}`;
    setPendingDigitalSignoff({
      title: kind === 'VO' ? 'Tạo & Trình Yêu cầu Phát sinh (VO)' : 'Tạo & Gửi Phiếu Yêu cầu Thông tin / Nghiệm thu (RFI)',
      actionLabel: `Khởi tạo ${docCode} cho Dự án [${activeProjectArchetype}]`,
      module: kind === 'VO' ? 'VO_AUDIT' : 'QAQC_EXEC',
      entityRef: `${activeProjectArchetype} / ${docCode}`,
      previousState: 'NEW_REQUEST',
      newState: 'PENDING_REVIEW',
      requiredRaciLetter: 'R',
      defaultNote:
        kind === 'VO'
          ? `Đề xuất phát sinh khối lượng/thay đổi thiết kế (${voState.contractType}, ngoài phạm vi=${voState.isOutsideScope}) trình TVGS & Ban QLDA thẩm tra.`
          : `Nhà thầu gửi RFI yêu cầu kiểm tra nghiệm thu hiện trường & xác nhận bản vẽ thi công tại Gate G12.`,
      onConfirm: async (note, sha256Hex) => {
        if (kind === 'VO') {
          const newWf: ApprovalWorkflowItem = {
            id: `WF-VO-${Date.now().toString(36).toUpperCase()}`,
            docCode,
            title: `Yêu cầu Phát sinh Hợp đồng (${docCode}) — Dự án ${activeProjectArchetype}`,
            gateRef: 'G14',
            domain: 'QLHD',
            requesterId: currentActor.id,
            approverId: 'EMP-01',
            consultedRole: 'TVGS',
            status: 'PENDING_REVIEW',
            submittedAt: new Date().toLocaleDateString('vi-VN'),
            ssotFileName: `XD_TTr_${currentActor.rbacRole}_${reqNum}_2026_QLHD_YeuCauPhatSinhVO.pdf`,
            slaHours: 48,
            elapsedHours: 1,
            bottleneckReason: note,
            projectCode: activeProjectArchetype,
            financialImpactVnd: 18_500_000_000,
            dailyInterestPenaltyVnd: 5_200_000,
          };
          setApprovalWorkflows(prev => [newWf, ...prev]);
        } else {
          const newRfi: QaQcGateControlItem = {
            id: `QA-${Date.now().toString(36).toUpperCase()}`,
            kind: 'RFI',
            code: docCode,
            title: `Yêu cầu kiểm tra hiện trường / Nghiệm thu mới (${activeProjectArchetype})`,
            gateRef: 'G12',
            processId: 'QT-08',
            projectAxes: [activeProjectArchetype],
            status: 'OPEN_PENDING',
            detailNote: note,
          };
          setQaqcControlRecords(prev => [newRfi, ...prev]);
        }
        await recordAuditLog({
          module: kind === 'VO' ? 'VO_AUDIT' : 'QAQC_EXEC',
          action: `Khởi tạo & Trình duyệt ${docCode} bởi [${currentActor.rbacRole}]`,
          entityRef: docCode,
          previousState: 'DRAFT',
          newState: 'PENDING_REVIEW',
          sha256Hash: sha256Hex,
          accountabilityNote: note,
        });
        showToast(`Đã ký số & gửi yêu cầu ${docCode} vào luồng kiểm soát 4 bên!`);
      },
    });
  };

  // Xử lý cập nhật tiến độ Task RACI
  const handleAdvanceTaskStatus = async (task: RaciTaskItem) => {
    const nextMap: Record<RaciTaskItem['status'], RaciTaskItem['status']> = {
      TODO: 'IN_PROGRESS',
      IN_PROGRESS: 'REVIEW_HOLD',
      REVIEW_HOLD: 'DONE',
      DONE: 'TODO',
    };
    const nextStatus = nextMap[task.status];
    const nextProgress = nextStatus === 'DONE' ? 100 : nextStatus === 'REVIEW_HOLD' ? 85 : nextStatus === 'IN_PROGRESS' ? 50 : 0;

    setRaciTasks(prev =>
      prev.map(t => (t.id === task.id ? { ...t, status: nextStatus, progress: nextProgress } : t))
    );

    await recordAuditLog({
      module: 'HRM_RACI',
      action: `Cập nhật Task ${task.wbsCode} (${task.raciRole}) → ${nextStatus} (${nextProgress}%)`,
      entityRef: `${task.wbsCode} / Gate ${task.gateRef}`,
      previousState: task.status,
      newState: nextStatus,
    });
    showToast(`Đã chuyển trạng thái công việc ${task.wbsCode} → ${nextStatus}`);
  };

  // Xử lý kiểm kê / hiệu chuẩn Tài sản & Thiết bị LAS-XD
  const handleCalibrateAsset = async (asset: ProjectAssetItem) => {
    const nextStatus: ProjectAssetItem['status'] =
      asset.status === 'ACTIVE_CALIBRATED' ? 'MAINTENANCE_DUE' : 'ACTIVE_CALIBRATED';
    const nextDate = nextStatus === 'ACTIVE_CALIBRATED' ? '2027-11-16' : asset.calibrationDueDate;

    setProjectAssets(prev =>
      prev.map(a =>
        a.id === asset.id
          ? { ...a, status: nextStatus, calibrationDueDate: nextDate, custodianId: currentActor.id }
          : a
      )
    );

    await recordAuditLog({
      module: 'ASSET_LAS',
      action: `Kiểm kê & xác nhận hiệu chuẩn thiết bị ${asset.qrBarcode}`,
      entityRef: `${asset.id} / ${asset.qrBarcode}`,
      previousState: asset.status,
      newState: nextStatus,
    });
    showToast(`Đã cập nhật trạng thái thiết bị ${asset.qrBarcode} → ${nextStatus}`);
  };

  // ==========================================================================
  // STATE BƯỚC 6: TRUNG TÂM 5 AI AGENTS (SERVER-SIDE GEMINI API)
  // ==========================================================================
  const [activeAiAgent, setActiveAiAgent] = useState('AGENT_2_CROSS');
  const [aiPromptInput, setAiPromptInput] = useState(
    'Phân tích điều kiện pháp lý và rủi ro kiểm toán khi điều chỉnh thiết kế và phát sinh khối lượng tại Dự án Hạ tầng Khu Công Nghiệp (KCN) / Khu Thương Mại Tự Do (FTZ).'
  );
  const [aiOutputText, setAiOutputText] = useState('');
  const [aiEngineSource, setAiEngineSource] = useState<string>('');
  const [isAiRunning, setIsAiRunning] = useState(false);

  const AI_AGENTS_LIST = [
    {
      id: 'AGENT_1_INGEST',
      name: 'Agent 1 — AI Legal Ingestor & 3D Mapper',
      desc: 'Tự động đọc văn bản mới và gắn nhãn 3 Trục (Pháp luật × Dự án × Chức năng) vào Bước 1.',
      samplePrompt:
        'Phân tích cấu trúc 3 Trục và đề xuất tên file chuẩn SSOT 9 thành phần cho Thông tư hướng dẫn định mức dự toán xây dựng công trình hạ tầng KCN năm 2026.',
    },
    {
      id: 'AGENT_2_CROSS',
      name: 'Agent 2 — AI Cross-Exam & Conflict Resolver',
      desc: 'Đối soát chéo giữa Luật Xây dựng, Luật Đấu thầu, NĐ Hợp đồng và NĐ Chi phí tại Bước 2.',
      samplePrompt:
        'Phân tích điều kiện pháp lý và rủi ro kiểm toán khi điều chỉnh thiết kế và phát sinh khối lượng tại Dự án Hạ tầng Khu Công Nghiệp (KCN) / Khu Thương Mại Tự Do (FTZ).',
    },
    {
      id: 'AGENT_3_PLAN',
      name: 'Agent 3 — AI Project Blueprint Generator',
      desc: 'Thiết kế lộ trình pháp lý G0–G16 riêng cho dự án HTKT, Dân dụng, KCN, CCN, FTZ hoặc PPP/BT tại Bước 3.',
      samplePrompt:
        'Lập lộ trình các chốt chặn Stage-Gate từ G0 đến G15 và phân quyền RACI 4 bên cho dự án Đầu tư xây dựng hạ tầng kỹ thuật Cụm Công Nghiệp (CCN) 75 ha.',
    },
    {
      id: 'AGENT_4_SITE',
      name: 'Agent 4 — AI Site & Contract Copilot',
      desc: 'Soạn thảo Nhật ký thi công, Biên bản hiện trường và Công văn trả lời phát sinh hợp đồng tại Bước 4.',
      samplePrompt:
        'Soạn thảo Biên bản hiện trường 4 bên và mục ghi Nhật ký thi công chuẩn Phụ lục IIa khi phát hiện địa chất túi bùn yếu dưới đáy móng cống D1500 cần xử lý thay đất.',
    },
    {
      id: 'AGENT_5_AUDIT',
      name: 'Agent 5 — AI Pre-Audit Forensic Inspector',
      desc: 'Rà soát khuyết tật pháp lý, trình tự thời gian nghiệm thu và nguy cơ xuất toán tại Bước 5.',
      samplePrompt:
        'Rà soát rủi ro xuất toán khi ngày ký Biên bản nghiệm thu công việc xây dựng sớm hơn ngày xuất phiếu kết quả thí nghiệm nén mẫu bê tông R28 tại phòng LAS-XD.',
    },
  ];

  const runMultiAgentAnalysis = async () => {
    setIsAiRunning(true);
    const agentObj = AI_AGENTS_LIST.find(a => a.id === activeAiAgent) || AI_AGENTS_LIST[1];

    try {
      const data = await analyzeLegalWithHybridAi({
        agentId: agentObj.id,
        agentName: agentObj.name,
        projectCode: currentArchetypeMeta.code,
        projectName: currentArchetypeMeta.name,
        authority: currentArchetypeMeta.authority,
        specialNote: currentArchetypeMeta.specialNote,
        prompt: aiPromptInput,
        chronoErrorsCount: chronoAuditStatus.length,
      });
      if (data.report) {
        setAiOutputText(data.report);
        setAiEngineSource(data.source || 'server-engine');
        await recordAuditLog({
          module: 'AI_AGENT',
          action: `${agentObj.name} xuất phán quyết đối soát 3 Trục cho [${currentArchetypeMeta.code}]`,
          entityRef: `${agentObj.id} / ${currentArchetypeMeta.code}`,
          newState: 'VERDICT_ISSUED',
        });
        showToast('AI Agent đã hoàn tất đối soát chéo 3 Trục & xuất phán quyết!');
      } else {
        showToast('Không thể phân tích lúc này.');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ phân tích.');
    } finally {
      setIsAiRunning(false);
    }
  };

  // Tự động khởi chạy báo cáo mẫu lần đầu khi mở tab AI nếu chưa có
  useEffect(() => {
    if (activeTab === 'STEP6_AI' && !aiOutputText && !isAiRunning) {
      runMultiAgentAnalysis();
    }
  }, [activeTab]);

  // ==========================================================================
  // CẤU HÌNH CHUỖI 5 BƯỚC + AI TRÊN LEFT SIDEBAR
  // ==========================================================================
  const SIDEBAR_CHAIN = [
    {
      section: 'CHUỖI GIÁ TRỊ NHÂN QUẢ (5 BƯỚC KHÉP KÍN)',
      items: [
        {
          id: 'STEP1_INGEST' as MainStepTab,
          stepNum: 'BƯỚC 1',
          icon: '📥',
          title: 'Nhập dữ liệu & Định danh 3 Trục',
          subtitle: 'Pháp luật × Dự án × Chức năng',
          badge: '9 Thành phần',
          badgeColor: 'text-emerald-300',
        },
        {
          id: 'STEP2_VBPL' as MainStepTab,
          stepNum: 'BƯỚC 2',
          icon: '⚖️',
          title: 'Tra cứu VBPL 360 & Đối soát chéo',
          subtitle: '3 Cột chuẩn mẫu · Ma trận đối soát',
          badge: `${legalDocs.length} VB`,
          badgeColor: 'text-sky-300',
        },
        {
          id: 'STEP3_PLAN' as MainStepTab,
          stepNum: 'BƯỚC 3',
          icon: '🧭',
          title: 'Lập Kế hoạch Stage-Gate & RACI',
          subtitle: `Lộ trình G0–G15 theo [${activeProjectArchetype}]`,
          badge: `${gates.length} Gate`,
          badgeColor: 'text-amber-300',
        },
        {
          id: 'STEP4_EXECUTE' as MainStepTab,
          stepNum: 'BƯỚC 4',
          icon: '▦',
          title: 'Thực thi: Quy trình, Biểu mẫu, Nhật ký',
          subtitle: 'Sơ đồ khối QA/QC · Auto-fill Biểu mẫu',
          badge: `${QAQC_PROCESSES.length} QT`,
          badgeColor: 'text-purple-300',
        },
        {
          id: 'STEP5_AUDIT' as MainStepTab,
          stepNum: 'BƯỚC 5',
          icon: '🛡️',
          title: 'Kiểm soát, VO & Quản trị 4 Phân hệ',
          subtitle: 'VO · Thời gian · HRM/Admin/Task/Asset',
          badge: chronoAuditStatus.length > 0 ? `${chronoAuditStatus.length} Cảnh báo` : '100% Đạt',
          badgeColor: chronoAuditStatus.length > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400',
        },
      ],
    },
    {
      section: 'TRÍ TUỆ NHÂN TẠO ĐA TÁC NHÂN',
      items: [
        {
          id: 'STEP6_AI' as MainStepTab,
          stepNum: 'AI CORE',
          icon: '🤖',
          title: 'Trung tâm 5 AI Agents Pháp lý',
          subtitle: 'Bóc tách · Đối soát · Kiểm toán AI',
          badge: 'Server AI',
          badgeColor: 'text-indigo-300',
        },
      ],
    },
  ];

  const currentChainMeta = useMemo(() => {
    for (const grp of SIDEBAR_CHAIN) {
      const found = grp.items.find(i => i.id === activeTab);
      if (found) return found;
    }
    return SIDEBAR_CHAIN[0].items[0];
  }, [activeTab, activeProjectArchetype, legalDocs.length, gates.length, chronoAuditStatus.length]);


  useEffect(() => {
    void probeHybridServices();
  }, []);

  return {
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
    roleGuardStatus, unlockedRoles,
    handleUnlockRole, handleLockAllRoles, handleSelectActorId,
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
    SIDEBAR_CHAIN, currentChainMeta,
  };
}

export type StepContextType = ReturnType<typeof useLexPmoOrchestrator>;

export default function App() {
  const stepContext = useLexPmoOrchestrator();
  const {
    activeTab,
     setActiveTab,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    isStep2SidebarExpanded,
    setIsStep2SidebarExpanded,
    sidebarWidthPx,
    setSidebarWidthPx,
    globalSearch,
    setGlobalSearch,
    workspaceMainRef,
    renderVerticalSplitter,
    activeProjectArchetype,
    setActiveProjectArchetype,
    activeProjectName,
    employees,
    roleGuardStatus,
    unlockedRoles,
    handleUnlockRole,
    handleLockAllRoles,
    handleSelectActorId,
    currentActor,
    raciPerms,
    pendingDigitalSignoff,
    setPendingDigitalSignoff,
    toastMsg,
    showToast,
    recordAuditLog,
    currentArchetypeMeta,
    vbplSubMode,
    setVbplSubMode,
    setSelectedRoadmapPillarId,
    resolveRoadmapPillarIdForDoc,
    currentLegalDoc,
    showFormPreviewModal,
    setShowFormPreviewModal,
    currentProcess,
    currentFlowStep,
    SIDEBAR_CHAIN,
    currentChainMeta,
  } = stepContext;

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* ====================================================================
          LEFT SIDEBAR NAVIGATION (CHUỖI 5 BƯỚC + BỘ LỌC TRỤC CHỨC NĂNG)
         ==================================================================== */}
      <aside
        style={{ width: isSidebarCollapsed ? 64 : sidebarWidthPx }}
        className="bg-slate-900/95 border-r border-slate-800 flex flex-col justify-between shrink-0 z-30 select-none"
      >
        <div>
          {/* Brand Header */}
          <div className="h-14 px-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center font-bold text-slate-950 shadow-lg shrink-0">
                LX
              </div>
              {!isSidebarCollapsed && (
                <div className="leading-tight truncate">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-white whitespace-nowrap">LEX-PMO OS v3.0</span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">3-Axis Legal & Enterprise PMO</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsSidebarCollapsed(prev => !prev)}
              title="Thu gọn / Mở rộng Sidebar"
              className="h-7 w-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs border border-slate-700 shrink-0"
            >
              {isSidebarCollapsed ? '▶' : '◀'}
            </button>
          </div>

          {/* Chuỗi 5 Bước Điều hướng (Kèm Drill-Down Sub-module cho Bước 2) */}
          <div className="p-2 space-y-3 overflow-y-auto max-h-[calc(100vh-70px)]">
            {SIDEBAR_CHAIN.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1.5">
                {group.items.map(item => {
                  const isActive = activeTab === item.id;
                  const isStep2 = item.id === 'STEP2_VBPL';
                  return (
                    <div key={item.id} className="space-y-1">
                      <button
                        onClick={() => {
                          if (isStep2) {
                            if (activeTab === 'STEP2_VBPL' && vbplSubMode === 'READER_3PANE') {
                              setIsStep2SidebarExpanded(prev => !prev);
                            } else {
                              setActiveTab('STEP2_VBPL');
                              setVbplSubMode('READER_3PANE');
                              setIsStep2SidebarExpanded(true);
                            }
                          } else {
                            setActiveTab(item.id);
                          }
                        }}
                        title={`${item.stepNum}: ${item.title} — ${item.subtitle}`}
                        className={`w-full text-left rounded-xl p-2 transition-all flex items-center justify-between gap-2 border ${
                          isActive && (!isStep2 || vbplSubMode === 'READER_3PANE')
                            ? 'bg-gradient-to-r from-amber-500/20 to-amber-500/5 border-amber-500 text-white shadow-md'
                            : 'bg-transparent border-transparent text-slate-300 hover:bg-slate-800/70'
                        }`}
                      >
                        <div
                          className={`h-8 w-8 rounded-lg flex items-center justify-center text-sm shrink-0 border ${
                            isActive && (!isStep2 || vbplSubMode === 'READER_3PANE')
                              ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                              : 'bg-slate-950 border-slate-800 text-slate-300'
                          }`}
                        >
                          {item.icon}
                        </div>
                        {!isSidebarCollapsed && (
                          <div className="flex items-center gap-1 shrink-0">
                            <span className={`text-[10px] font-mono tabular-nums ${item.badgeColor}`}>
                              {item.badge}
                            </span>
                            {isStep2 && (
                              <span className="text-[10px] text-amber-400 font-mono">
                                {isStep2SidebarExpanded ? '▾' : '▸'}
                              </span>
                            )}
                          </div>
                        )}
                      </button>

                      {/* Sub-modules Drill-Down dưới Bước 2: Road_map Bộ luật & Đối soát chéo */}
                      {isStep2 && isStep2SidebarExpanded && (
                        <div
                          className={`${
                            isSidebarCollapsed ? 'px-0.5' : 'pl-2.5 pr-0.5'
                          } pt-0.5 space-y-1`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('STEP2_VBPL');
                              if (currentLegalDoc) {
                                setSelectedRoadmapPillarId(resolveRoadmapPillarIdForDoc(currentLegalDoc));
                              }
                              setVbplSubMode('LAW_ROADMAP');
                            }}
                            title="Road_map Phả hệ cho từng Bộ luật (Luật gốc, Luật sửa đổi, VBHN, Nghị định, Thông tư, QCVN)"
                            className={`w-full text-left rounded-lg px-2 py-1.5 text-[10px] font-mono transition flex items-center justify-between gap-1 border ${
                              activeTab === 'STEP2_VBPL' && vbplSubMode === 'LAW_ROADMAP'
                                ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold shadow-xs'
                                : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                          >
                            <span className="truncate">
                              {isSidebarCollapsed ? '🗺️' : '🗺️ Road_map Bộ luật'}
                            </span>
                            {!isSidebarCollapsed && (
                              <span className="text-[9px] text-amber-300 shrink-0">
                                {LAW_ROADMAPS.length}
                              </span>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('STEP2_VBPL');
                              setVbplSubMode('CROSS_EXAM');
                            }}
                            title="Bảng Đối soát chéo Đa Văn bản (Cross-Reference Matrix)"
                            className={`w-full text-left rounded-lg px-2 py-1.5 text-[10px] font-mono transition flex items-center justify-between gap-1 border ${
                              activeTab === 'STEP2_VBPL' && vbplSubMode === 'CROSS_EXAM'
                                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold shadow-xs'
                                : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                          >
                            <span className="truncate">
                              {isSidebarCollapsed ? '🔀' : '🔀 Đối soát chéo'}
                            </span>
                            {!isSidebarCollapsed && (
                              <span className="text-[9px] text-emerald-300 shrink-0">
                                {CROSS_EXAM_TOPICS.length}
                              </span>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Thanh kéo co giãn độ rộng Left Sidebar */}
      {renderVerticalSplitter({
        id: 'SIDEBAR',
        onDoubleClickReset: () => {
          setIsSidebarCollapsed(false);
          setSidebarWidthPx(145);
          showToast('Đã đặt lại chiều rộng Sidebar chuẩn (145px)');
        },
        label: `${sidebarWidthPx}px`,
      })}

      {/* ====================================================================
          RIGHT MAIN WORKSPACE (TOP PIPELINE BAR + ACTIVE STEP VIEW)
         ==================================================================== */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TOP CONTEXT, PROJECT ARCHETYPE & 4-PARTY RBAC/RACI ROLE SWITCHER BAR */}
        <TopRoleSwitcherHeader
          currentChainMeta={currentChainMeta}
          activeProjectArchetype={activeProjectArchetype}
          currentArchetypeMeta={currentArchetypeMeta}
          currentActor={currentActor}
          employees={employees}
          raciPerms={raciPerms}
          globalSearch={globalSearch}
          roleGuardStatus={roleGuardStatus}
          unlockedRoles={unlockedRoles}
          onUnlockRole={handleUnlockRole}
          onLockAllRoles={handleLockAllRoles}
          onSelectActorId={handleSelectActorId}
          onChangeProjectArchetype={code => setActiveProjectArchetype(code)}
          onChangeGlobalSearch={val => setGlobalSearch(val)}
          showToast={showToast}
        />

        {toastMsg && (
          <div className="fixed bottom-5 right-5 z-50 bg-emerald-500 text-slate-950 font-semibold text-xs px-4 py-3 rounded-lg shadow-2xl border border-emerald-300 flex items-center gap-2">
            <span>✓</span>
            <span>{toastMsg}</span>
          </div>
        )}

        {/* ==================================================================
            MAIN CONTENT AREA THEO TỪNG BƯỚC TRONG CHUỖI 5 BƯỚC + AI (CLEAN ARCHITECTURE)
           ================================================================== */}
        <main ref={workspaceMainRef} className="flex-1 overflow-hidden">
          {activeTab === "STEP1_INGEST" && <Step1CdeIngestion ctx={stepContext} />}
          {activeTab === "STEP2_VBPL" && <Step2LegalMatrix ctx={stepContext} />}
          {activeTab === "STEP3_PLAN" && <Step3StageGate ctx={stepContext} />}
          {activeTab === "STEP4_EXECUTE" && <Step4RaciHr ctx={stepContext} />}
          {(activeTab === "STEP5_AUDIT" || activeTab === "STEP6_AI") && (
            <Step5CommandCenter ctx={stepContext} />
          )}
        </main>
      </div>

      {/* ====================================================================
          MODAL XEM TRƯỚC & KÝ SỐ BIỂU MẪU AUTO-FILL (STEP 4 FORM PREVIEW MODAL)
         ==================================================================== */}
      {showFormPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[11px] font-mono text-amber-400">
                  BIỂU MẪU PHÁP LÝ TỰ ĐỘNG ĐIỀN CĂN CỨ (SMART AUTO-FILL)
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">{currentFlowStep.formTemplateTitle}</h3>
              </div>
              <button
                onClick={() => setShowFormPreviewModal(false)}
                className="h-7 w-7 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-200 space-y-2 max-h-96 overflow-y-auto">
              <div className="text-center font-bold text-white">
                CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                <br />
                Độc lập - Tự do - Hạnh phúc
                <br />
                -------------------
              </div>
              <div className="text-center font-bold text-amber-400 pt-2">
                {currentFlowStep.formTemplateTitle}
              </div>
              <div>1. Dự án đầu tư: {activeProjectName}</div>
              <div>
                2. Phân loại dự án (Trục Y): [{currentArchetypeMeta.code}] {currentArchetypeMeta.name}
              </div>
              <div>3. Cơ quan thẩm quyền đầu mối: {currentArchetypeMeta.authority}</div>
              <div>4. Căn cứ pháp lý áp dụng: {currentProcess.legalTag}</div>
              <div>5. Thành phần tham gia nghiệm thu / xác nhận ({currentFlowStep.parties}):</div>
              <div className="pl-3 text-slate-300">
                • Đại diện Chủ đầu tư / Ban QLDA: {currentFlowStep.raciDetail.CDT_QLDA}
                <br />• Đại diện Tư vấn Giám sát: {currentFlowStep.raciDetail.TVGS}
                <br />• Đại diện Nhà thầu thi công: {currentFlowStep.raciDetail.NhaThau}
              </div>
              <div>6. Nội dung xác nhận hiện trường:</div>
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-emerald-300">
                {currentFlowStep.diaryTemplate}
              </div>
              <div>
                7. Chữ ký số xác thực phiên hiện tại: {currentActor.fullName} — Chứng chỉ:{' '}
                {currentActor.certNumber}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowFormPreviewModal(false)}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-semibold"
              >
                Đóng
              </button>
              <button
                onClick={async () => {
                  const docText = `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n\n${currentFlowStep.formTemplateTitle}\nDự án: ${activeProjectName} [${currentArchetypeMeta.code}]\nCăn cứ pháp lý: ${currentProcess.legalTag}\nNội dung: ${currentFlowStep.diaryTemplate}\nNgười ký xác thực: ${currentActor.fullName} (${currentActor.certNumber})`;
                  const blob = new Blob([docText], { type: 'text/plain;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `XD_BBNT_${currentActor.rbacRole}_${currentProcess.code}_2026_QLCL_${toPascalCaseVN(
                    currentFlowStep.formTemplateTitle,
                    40
                  )}.txt`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);

                  await recordAuditLog({
                    module: 'QAQC_EXEC',
                    action: `Ký số & Xuất biểu mẫu chuẩn SSOT: ${currentFlowStep.formTemplateTitle}`,
                    entityRef: `${currentProcess.id} / ${currentFlowStep.stepNo}`,
                    newState: 'FORM_EXPORTED_SIGNED',
                  });

                  setShowFormPreviewModal(false);
                  showToast('Đã ký xác nhận và tải xuống Biểu mẫu chuẩn SSOT!');
                }}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
              >
                Ký xác nhận & Tải Biểu mẫu (.TXT)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL KÝ SỐ & GHI NHẬN TRÁCH NHIỆM GIẢI TRÌNH (SHA-256 + AUDIT TRAIL)
         ==================================================================== */}
      <DigitalSignoffModal
        signoff={pendingDigitalSignoff}
        currentActor={currentActor}
        onClose={() => setPendingDigitalSignoff(null)}
      />
    </div>
  );
}
