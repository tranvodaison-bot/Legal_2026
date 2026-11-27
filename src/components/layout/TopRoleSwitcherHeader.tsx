import React, { useEffect, useRef, useState } from 'react';
import { TAXONOMY_3D } from '../../data/lexPmoData';
import {
  HybridServiceHealth,
  probeHybridServices,
  RoleGuardStatus,
  toCanonicalGuardRole,
  verifyRolePasscode,
} from '../../services/ssotBridgeService';
import { EmployeeUser, ProjectArchetypeCode, ProjectArchetypeItem } from '../../types/lexPmoTypes';
import {
  FOUR_PARTY_ROLES,
  PartyRoleDefinition,
  RaciActionPermissions,
} from '../../utils/rbacRaciHelpers';

export type HeaderTabCode =
  | 'STEP1_INGEST'
  | 'STEP2_VBPL'
  | 'STEP3_PLAN'
  | 'STEP4_EXECUTE'
  | 'STEP5_AUDIT'
  | 'STEP6_AI'
  | 'STEP6_DATA_BI';

export interface TopRoleSwitcherHeaderProps {
  activeTab: HeaderTabCode;
  vbplSubMode?: 'READER_3PANE' | 'CROSS_EXAM' | 'LAW_ROADMAP';
  onNavigateTab: (
    tab: HeaderTabCode,
    subMode?: 'READER_3PANE' | 'CROSS_EXAM' | 'LAW_ROADMAP'
  ) => void;
  currentChainMeta: {
    stepNum: string;
    title: string;
  };
  activeProjectArchetype: ProjectArchetypeCode;
  currentArchetypeMeta: ProjectArchetypeItem;
  currentActor: EmployeeUser;
  employees: EmployeeUser[];
  raciPerms: RaciActionPermissions;
  globalSearch: string;
  roleGuardStatus?: RoleGuardStatus & { checked: boolean };
  unlockedRoles?: Array<'CDT' | 'PMU' | 'TVGS'>;
  onUnlockRole?: (role: 'CDT' | 'PMU' | 'TVGS') => void;
  onLockAllRoles?: () => void;
  onSelectActorId: (employeeId: string) => void;
  onChangeProjectArchetype: (code: ProjectArchetypeCode) => void;
  onChangeGlobalSearch: (val: string) => void;
  onSearchSubmit?: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  isSerifFont: boolean;
  onToggleSerifFont: () => void;
  readerFontSize: number;
  onDecreaseFontSize: () => void;
  onIncreaseFontSize: () => void;
  onOpenGuideModal: () => void;
  onOpenStatsModal: () => void;
  onExportLibraryCsv: () => void;
  totalDocsCount: number;
  batchCount: number;
  showToast: (msg: string) => void;
}

export const TopRoleSwitcherHeader: React.FC<TopRoleSwitcherHeaderProps> = ({
  activeTab,
  vbplSubMode = 'READER_3PANE',
  onNavigateTab,
  activeProjectArchetype,
  currentActor,
  employees,
  raciPerms,
  globalSearch,
  roleGuardStatus = {
    checked: true,
    protected: false,
    demoMode: true,
    guardedRoles: [],
  },
  unlockedRoles = [],
  onUnlockRole,
  onLockAllRoles,
  onSelectActorId,
  onChangeProjectArchetype,
  onChangeGlobalSearch,
  onSearchSubmit,
  isDarkMode,
  onToggleDarkMode,
  isSerifFont,
  onToggleSerifFont,
  onDecreaseFontSize,
  onIncreaseFontSize,
  onOpenGuideModal,
  onOpenStatsModal,
  onExportLibraryCsv,
  totalDocsCount,
  batchCount,
  showToast,
}) => {
  const [hybridHealth, setHybridHealth] = useState<HybridServiceHealth>({
    fastApiOnline: false,
    localScannerOnline: false,
    expressFallbackOnline: true,
    fastApiBaseUrl: 'http://127.0.0.1:8000/api/v1',
    localScannerBaseUrl: 'http://127.0.0.1:8008/api/local',
    checkedAt: '--:--',
  });
  const [isProbingHybrid, setIsProbingHybrid] = useState(false);

  const [isModuleMenuOpen, setIsModuleMenuOpen] = useState(false);
  const [isRolePopoverOpen, setIsRolePopoverOpen] = useState(false);
  const moduleMenuRef = useRef<HTMLDivElement | null>(null);
  const rolePopoverRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Passcode modal state cho chuyển đổi vai trò nâng cao (CDT / PMU / TVGS)
  const [pendingRoleParty, setPendingRoleParty] = useState<PartyRoleDefinition | null>(null);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [isVerifyingPasscode, setIsVerifyingPasscode] = useState(false);

  const handleRefreshHybridStatus = async (notifyUser = false) => {
    if (isProbingHybrid) return;
    setIsProbingHybrid(true);
    try {
      const status = await probeHybridServices();
      setHybridHealth(status);
      if (notifyUser) {
        const dbLabel = status.fastApiOnline ? '🟢 SSOT DB (:8000) Online' : '🟡 Local Preview (Express)';
        const scanLabel = status.localScannerOnline ? '🟢 Scanner (:8008) Online' : 'Scanner (:8008) Standby';
        showToast(`Kết nối Hybrid: ${dbLabel} · ${scanLabel}`);
      }
    } finally {
      setIsProbingHybrid(false);
    }
  };

  useEffect(() => {
    void handleRefreshHybridStatus(false);
  }, []);

  // Đóng dropdown khi click ra ngoài & hỗ trợ phím tắt Ctrl+K
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (moduleMenuRef.current && !moduleMenuRef.current.contains(e.target as Node)) {
        setIsModuleMenuOpen(false);
      }
      if (rolePopoverRef.current && !rolePopoverRef.current.contains(e.target as Node)) {
        setIsRolePopoverOpen(false);
      }
    };
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleGlobalKeys);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleGlobalKeys);
    };
  }, []);

  const closePasscodeModal = () => {
    if (isVerifyingPasscode) return;
    setPendingRoleParty(null);
    setPasscodeInput('');
    setPasscodeError(null);
  };

  useEffect(() => {
    if (!pendingRoleParty) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isVerifyingPasscode) {
        setPendingRoleParty(null);
        setPasscodeInput('');
        setPasscodeError(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [pendingRoleParty, isVerifyingPasscode]);

  const handleSelectPartyButton = (party: PartyRoleDefinition) => {
    if (currentActor.rbacRole === party.code) return;

    const canonicalCode = toCanonicalGuardRole(party.code);
    const isElevatedGuarded =
      (canonicalCode === 'CDT' || canonicalCode === 'PMU' || canonicalCode === 'TVGS') &&
      roleGuardStatus.protected &&
      roleGuardStatus.guardedRoles.includes(canonicalCode) &&
      !unlockedRoles.includes(canonicalCode);

    if (!isElevatedGuarded) {
      onSelectActorId(party.employeeId);
      const found = employees.find(emp => emp.id === party.employeeId);
      showToast(
        `Đã chuyển vai trò sang ${party.icon} ${party.fullTitle}${
          found ? ` (${found.fullName})` : ''
        }`
      );
      setIsRolePopoverOpen(false);
      return;
    }

    setIsRolePopoverOpen(false);
    setPendingRoleParty(party);
    setPasscodeInput('');
    setPasscodeError(null);
  };

  const handleVerifyPasscodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingRoleParty || isVerifyingPasscode) return;

    if (roleGuardStatus.configError) {
      setPasscodeError(
        'Lỗi cấu hình ROLE_PASSCODES trên máy chủ (Server configuration error). Không thể xác thực hoặc bật Demo Mode.'
      );
      return;
    }

    const trimmed = passcodeInput.trim();
    if (!trimmed) {
      setPasscodeError('Vui lòng nhập mã Passcode để xác thực vai trò.');
      return;
    }

    const canonicalCode = toCanonicalGuardRole(pendingRoleParty.code);
    setIsVerifyingPasscode(true);
    setPasscodeError(null);

    try {
      const result = await verifyRolePasscode(canonicalCode, trimmed);
      if (!result.verified) {
        setPasscodeError(
          result.error || `Mã Passcode không chính xác cho vai trò ${canonicalCode}.`
        );
        return;
      }

      if (
        (canonicalCode === 'CDT' || canonicalCode === 'PMU' || canonicalCode === 'TVGS') &&
        result.protected !== false
      ) {
        onUnlockRole?.(canonicalCode);
      }

      const targetParty = pendingRoleParty;
      setPendingRoleParty(null);
      setPasscodeInput('');
      setPasscodeError(null);

      onSelectActorId(targetParty.employeeId);
      const found = employees.find(emp => emp.id === targetParty.employeeId);
      showToast(
        `Đã xác thực & chuyển vai trò sang ${targetParty.icon} ${targetParty.fullTitle}${
          found ? ` (${found.fullName})` : ''
        }`
      );
    } catch {
      setPasscodeError(
        'Không thể kết nối máy chủ xác thực (/api/verify-role). Vui lòng thử lại.'
      );
    } finally {
      setIsVerifyingPasscode(false);
    }
  };

  const activePartyMeta =
    FOUR_PARTY_ROLES.find(p => p.code === currentActor.rbacRole) || FOUR_PARTY_ROLES[3];

  const PMO_MODULES: Array<{
    tab: HeaderTabCode;
    subMode?: 'READER_3PANE' | 'CROSS_EXAM' | 'LAW_ROADMAP';
    icon: string;
    label: string;
    badge: string;
  }> = [
    { tab: 'STEP2_VBPL', subMode: 'READER_3PANE', icon: '⚖️', label: 'Thư viện VBPL (3 Cột chuẩn)', badge: `${totalDocsCount} VB` },
    { tab: 'STEP1_INGEST', icon: '📥', label: 'Bước 1 · Nạp Hồ sơ CDE & Đặt tên SSOT', badge: `${batchCount} tệp` },
    { tab: 'STEP2_VBPL', subMode: 'LAW_ROADMAP', icon: '🗺️', label: 'Bước 2B · Road_map Phả hệ Bộ luật', badge: '5 trụ cột' },
    { tab: 'STEP2_VBPL', subMode: 'CROSS_EXAM', icon: '🔀', label: 'Bước 2C · Bảng Đối soát Chéo Đa VB', badge: 'Ma trận' },
    { tab: 'STEP3_PLAN', icon: '🧭', label: 'Bước 3 · Lộ trình Stage-Gate G0–G15', badge: activeProjectArchetype },
    { tab: 'STEP4_EXECUTE', icon: '▦', label: 'Bước 4 · Thực thi QA/QC & Biểu mẫu', badge: 'ISO/TCVN' },
    { tab: 'STEP5_AUDIT', icon: '🛡️', label: 'Bước 5 · Kiểm toán VO & Quản trị 4 Phân hệ', badge: 'Pre-Audit' },
    { tab: 'STEP6_DATA_BI', icon: '📊', label: 'Bước 6A · Data Foundation & BI (6 Tầng)', badge: 'Analytics' },
    { tab: 'STEP6_AI', icon: '🤖', label: 'Bước 6B · Trung tâm 5 AI Agents Pháp lý', badge: 'Gemini AI' },
  ];

  const isLibrary3Pane = activeTab === 'STEP2_VBPL' && vbplSubMode === 'READER_3PANE';

  return (
    <>
      <header className="vbpl-topbar px-3 py-1.5 lg:h-[50px] lg:py-0 flex flex-wrap lg:flex-nowrap items-center justify-between gap-2 shrink-0 z-30 select-none">
        {/* TRÁI: Thương hiệu chuẩn thuvien-vbpl-26 + Menu Phân hệ PMO */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onNavigateTab('STEP2_VBPL', 'READER_3PANE')}
            title="Quay về Giao diện chính: Thư viện Văn bản Quy phạm Pháp luật (3 Cột)"
            className="flex items-baseline gap-1.5 cursor-pointer hover:opacity-95 transition text-left"
          >
            <span className="text-[16px] font-extrabold tracking-tight text-white flex items-center gap-1.5 whitespace-nowrap">
              <span>⚖️</span>
              <span>THƯ VIỆN VBPL</span>
            </span>
            <span className="hidden 2xl:inline text-[10.5px] font-bold uppercase tracking-wider text-[#e8c66a] whitespace-nowrap">
              XÂY DỰNG · ĐẤU THẦU · KCN
            </span>
          </button>

          {/* Dropdown chuyển đổi 6 Phân hệ PMO */}
          <div className="relative" ref={moduleMenuRef}>
            <button
              type="button"
              onClick={() => setIsModuleMenuOpen(prev => !prev)}
              title="Chuyển đổi giữa Thư viện VBPL 3 Cột và các Phân hệ Quản trị Dự án PMO (Bước 1–6)"
              className={`vbpl-tbtn ${!isLibrary3Pane ? 'active' : ''}`}
            >
              <span>🧭</span>
              <span className="hidden sm:inline">
                {isLibrary3Pane ? 'Phân hệ PMO' : 'Đang mở PMO'}
              </span>
              <span className="text-[10px] opacity-80">▾</span>
            </button>

            {isModuleMenuOpen && (
              <div
                className="absolute left-0 mt-1.5 w-80 rounded-lg border overflow-hidden z-50 py-1"
                style={{
                  backgroundColor: 'var(--panel)',
                  borderColor: 'var(--line-d)',
                  boxShadow: 'var(--sh-lg)',
                  color: 'var(--chu)',
                }}
              >
                <div
                  className="px-3 py-1.5 text-[10px] font-mono font-bold uppercase border-b"
                  style={{ color: 'var(--chu-m)', borderColor: 'var(--line)', backgroundColor: 'var(--giay)' }}
                >
                  Hệ điều hành Pháp chế & Quản lý Dự án (SSOT 2026)
                </div>
                {PMO_MODULES.map((m, idx) => {
                  const isCurrent =
                    activeTab === m.tab && (!m.subMode || vbplSubMode === m.subMode);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        onNavigateTab(m.tab, m.subMode);
                        setIsModuleMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left text-xs flex items-center justify-between gap-2 transition cursor-pointer"
                      style={{
                        backgroundColor: isCurrent ? 'var(--gold-xl)' : 'transparent',
                        fontWeight: isCurrent ? 700 : 500,
                        color: 'var(--chu)',
                      }}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <span>{m.icon}</span>
                        <span className="truncate">{m.label}</span>
                      </span>
                      <span
                        className="px-1.5 py-0.5 rounded font-mono text-[10px] font-bold shrink-0"
                        style={{ backgroundColor: 'var(--giay-d)', color: 'var(--navy)' }}
                      >
                        {m.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* GIỮA: Thanh tìm kiếm hình viên nhộng chuẩn mẫu (Ctrl + K) */}
        <div className="flex-1 min-w-[160px] max-w-[400px] mx-1">
          <form
            onSubmit={e => {
              e.preventDefault();
              onSearchSubmit?.();
            }}
            className="relative flex items-center"
          >
            <span className="absolute left-3 text-xs opacity-80 pointer-events-none">🔍</span>
            <input
              ref={searchInputRef}
              id="vbpl-global-search-input"
              type="text"
              value={globalSearch}
              onChange={e => onChangeGlobalSearch(e.target.value)}
              placeholder="Tìm trong toàn bộ văn bản, số hiệu, điều khoản…"
              className="vbpl-search-pill w-full pl-8 pr-16 text-xs"
            />
            {globalSearch ? (
              <button
                type="button"
                onClick={() => onChangeGlobalSearch('')}
                title="Xóa từ khóa tìm kiếm"
                className="absolute right-2.5 text-xs px-1.5 py-0.5 rounded bg-black/20 hover:bg-black/35 text-white cursor-pointer"
              >
                ✕
              </button>
            ) : (
              <kbd className="hidden sm:inline-block absolute right-2.5 px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/20 text-white/85 border border-white/20 pointer-events-none">
                Ctrl K
              </kbd>
            )}
          </form>
        </div>

        {/* PHẢI: Cụm nút chuẩn thuvien-vbpl-26 (Vai trò · Nạp VB · Hướng dẫn · Thống kê · Xuất · 🅰 · A− · A+ · 🌙) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Popover Vai trò RBAC & Dự án */}
          <div className="relative" ref={rolePopoverRef}>
            <button
              type="button"
              onClick={() => setIsRolePopoverOpen(prev => !prev)}
              title={`Đang đăng nhập: ${currentActor.fullName} (${activePartyMeta.fullTitle}) · Dự án: ${activeProjectArchetype}`}
              className="vbpl-tbtn !rounded-full !px-3"
              style={{
                backgroundColor: 'rgba(200, 163, 60, 0.22)',
                borderColor: 'rgba(232, 198, 106, 0.55)',
              }}
            >
              <span>{activePartyMeta.icon}</span>
              <span className="font-bold">{activePartyMeta.shortName}</span>
              <span className="hidden xl:inline text-[10px] text-[#e8c66a] font-mono">
                [{activeProjectArchetype}]
              </span>
            </button>

            {isRolePopoverOpen && (
              <div
                className="absolute right-0 mt-1.5 w-80 rounded-xl border p-3.5 space-y-3 z-50 text-xs"
                style={{
                  backgroundColor: 'var(--panel)',
                  borderColor: 'var(--line-d)',
                  boxShadow: 'var(--sh-lg)',
                  color: 'var(--chu)',
                }}
              >
                <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--line)' }}>
                  <div>
                    <div className="font-bold" style={{ color: 'var(--navy)' }}>
                      {currentActor.fullName}
                    </div>
                    <div className="text-[11px]" style={{ color: 'var(--chu-m)' }}>
                      {currentActor.department} · Quyền RACI:{' '}
                      {(['R', 'A', 'C', 'I'] as const)
                        .filter(l => raciPerms.raciMatrixMap[l].active)
                        .join('/')}
                    </div>
                  </div>
                  {roleGuardStatus.protected && unlockedRoles.length > 0 && onLockAllRoles && (
                    <button
                      type="button"
                      onClick={() => {
                        onLockAllRoles();
                        setIsRolePopoverOpen(false);
                        showToast('Đã khóa lại các vai trò bảo vệ & chuyển về Nhà thầu (NTTC).');
                      }}
                      className="px-2 py-1 rounded text-[10px] font-mono font-bold bg-rose-600 text-white cursor-pointer"
                    >
                      🔒 Khóa
                    </button>
                  )}
                </div>

                {/* Chuyển đổi 4 bên */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono font-bold uppercase" style={{ color: 'var(--chu-m)' }}>
                    Chuyển vai trò pháp nhân (4 bên):
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {FOUR_PARTY_ROLES.map(party => {
                      const isActive = currentActor.rbacRole === party.code;
                      const canonicalCode = toCanonicalGuardRole(party.code);
                      const isGuarded =
                        (canonicalCode === 'CDT' ||
                          canonicalCode === 'PMU' ||
                          canonicalCode === 'TVGS') &&
                        roleGuardStatus.protected &&
                        roleGuardStatus.guardedRoles.includes(canonicalCode);
                      const isUnlocked =
                        isGuarded &&
                        unlockedRoles.includes(canonicalCode as 'CDT' | 'PMU' | 'TVGS');
                      const needsPasscode = isGuarded && !isUnlocked;

                      return (
                        <button
                          key={party.code}
                          type="button"
                          onClick={() => handleSelectPartyButton(party)}
                          className="px-2.5 py-1.5 rounded-lg border text-left text-[11px] font-bold flex items-center justify-between transition cursor-pointer"
                          style={{
                            backgroundColor: isActive ? 'var(--navy)' : 'var(--giay)',
                            borderColor: isActive ? 'var(--navy)' : 'var(--line)',
                            color: isActive ? '#ffffff' : 'var(--chu)',
                          }}
                        >
                          <span className="truncate">
                            {party.icon} {party.shortName}
                          </span>
                          {needsPasscode && <span className="text-[10px]">🔒</span>}
                          {isUnlocked && <span className="text-[10px]">🔓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Chọn loại hình dự án Trục Y */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono font-bold uppercase" style={{ color: 'var(--chu-m)' }}>
                    Loại hình Dự án trọng tâm (Trục Y):
                  </label>
                  <select
                    value={activeProjectArchetype}
                    onChange={e => onChangeProjectArchetype(e.target.value as ProjectArchetypeCode)}
                    className="w-full rounded-md border px-2.5 py-1.5 text-xs font-semibold"
                    style={{
                      backgroundColor: 'var(--giay)',
                      borderColor: 'var(--line-d)',
                      color: 'var(--chu)',
                    }}
                  >
                    {TAXONOMY_3D.projectTypes.map(pt => (
                      <option key={pt.code} value={pt.code}>
                        [{pt.code}] {pt.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Trạng thái Hybrid */}
                <div className="pt-2 border-t flex items-center justify-between text-[10px] font-mono" style={{ borderColor: 'var(--line)' }}>
                  <span style={{ color: 'var(--chu-m)' }}>
                    {hybridHealth.fastApiOnline ? '🟢 SSOT DB (:8000)' : '🟡 Local SSOT'} ·{' '}
                    {hybridHealth.localScannerOnline ? '🟢 Scanner (:8008)' : 'Proxy PDF Sẵn sàng'}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleRefreshHybridStatus(true)}
                    className="font-bold underline cursor-pointer"
                    style={{ color: 'var(--navy-l)' }}
                  >
                    Kiểm tra ↻
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('STEP1_INGEST')}
            title={`Mở Kho Tiếp nhận Hồ sơ CDE & Đặt tên chuẩn SSOT (${batchCount} tệp thực tế)`}
            className={`vbpl-tbtn ${activeTab === 'STEP1_INGEST' ? 'active' : ''}`}
          >
            <span>📥</span>
            <span className="hidden xl:inline">Nạp VB</span>
          </button>

          <button
            type="button"
            onClick={onOpenGuideModal}
            title="Hướng dẫn tra cứu & Tổ hợp phím tắt"
            className="vbpl-tbtn"
          >
            <span>❓</span>
            <span className="hidden xl:inline">Hướng dẫn</span>
          </button>

          <button
            type="button"
            onClick={onOpenStatsModal}
            title="Thống kê toàn thư viện VBPL"
            className="vbpl-tbtn"
          >
            <span>📊</span>
            <span className="hidden xl:inline">Thống kê</span>
          </button>

          <button
            type="button"
            onClick={onExportLibraryCsv}
            title="Xuất danh mục văn bản ra tệp CSV (UTF-8 BOM)"
            className="vbpl-tbtn"
          >
            <span>📤</span>
            <span className="hidden xl:inline">Xuất</span>
          </button>

          <button
            type="button"
            onClick={onToggleSerifFont}
            title={
              isSerifFont
                ? 'Đang dùng chữ có chân (Serif sách luật) — Bấm để chuyển sang chữ không chân (Sans)'
                : 'Đang dùng chữ không chân (Sans) — Bấm để chuyển sang chữ có chân (Serif sách luật)'
            }
            className={`vbpl-tbtn !px-2 font-serif ${isSerifFont ? 'active' : ''}`}
          >
            <span>🅰</span>
          </button>

          <button
            type="button"
            onClick={onDecreaseFontSize}
            title="Giảm cỡ chữ nội dung văn bản (A−)"
            className="vbpl-tbtn !px-2 font-mono text-[11px]"
          >
            A−
          </button>

          <button
            type="button"
            onClick={onIncreaseFontSize}
            title="Tăng cỡ chữ nội dung văn bản (A+)"
            className="vbpl-tbtn !px-2 font-mono text-[11px]"
          >
            A+
          </button>

          <button
            type="button"
            onClick={onToggleDarkMode}
            title={isDarkMode ? 'Chuyển sang Giao diện Sáng (Giấy Pháp Lý)' : 'Chuyển sang Giao diện Tối (Dark Mode)'}
            className={`vbpl-tbtn !px-2 ${isDarkMode ? 'active' : ''}`}
          >
            <span>{isDarkMode ? '☀️' : '🌙'}</span>
          </button>
        </div>
      </header>

      {/* MODAL XÁC THỰC PASSCODE CHUYỂN ĐỔI VAI TRÒ BẢO VỆ (CDT / PMU / TVGS) */}
      {pendingRoleParty && (
        <div
          className="fixed inset-0 z-50 vbpl-md-backdrop flex items-center justify-center p-4"
          onClick={closePasscodeModal}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="lex-role-passcode-modal-title"
            onSubmit={handleVerifyPasscodeSubmit}
            onClick={e => e.stopPropagation()}
            className="vbpl-mdw w-full max-w-md overflow-hidden"
          >
            <div
              className="px-5 py-3.5 border-b flex items-center justify-between gap-3 text-white"
              style={{ background: 'linear-gradient(180deg, #2f5a86, #1b3a5c)', borderColor: 'var(--line)' }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-lg shrink-0">🔑</span>
                <div className="min-w-0">
                  <div
                    id="lex-role-passcode-modal-title"
                    className="text-[11px] font-mono font-extrabold text-[#e8c66a] uppercase tracking-wide"
                  >
                    Kích Hoạt Quyền Pháp Nhân (RBAC Guard)
                  </div>
                  <div className="text-sm font-bold text-white truncate">
                    {pendingRoleParty.icon} {pendingRoleParty.shortName} ({pendingRoleParty.badgeCode})
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={closePasscodeModal}
                disabled={isVerifyingPasscode}
                className="h-7 w-7 rounded bg-white/15 hover:bg-white/25 text-white text-xs font-bold shrink-0 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div
                className="p-3 rounded-lg border space-y-1"
                style={{ backgroundColor: 'var(--gold-xl)', borderColor: 'var(--gold)' }}
              >
                <div className="font-bold" style={{ color: 'var(--navy)' }}>
                  {pendingRoleParty.fullTitle}
                </div>
                <div className="text-[11px] font-mono font-semibold" style={{ color: 'var(--son)' }}>
                  {pendingRoleParty.raciScopeLabel}
                </div>
                <div className="text-[11px]" style={{ color: 'var(--chu-m)' }}>
                  {pendingRoleParty.authoritySummary}
                </div>
              </div>

              <div>
                <label
                  htmlFor="lex-role-passcode-input"
                  className="block text-[11px] font-bold mb-1.5"
                  style={{ color: 'var(--chu)' }}
                >
                  Nhập mã Passcode truy cập vai trò {toCanonicalGuardRole(pendingRoleParty.code)}:
                </label>
                <input
                  id="lex-role-passcode-input"
                  type="password"
                  autoFocus
                  autoComplete="current-password"
                  value={passcodeInput}
                  onChange={e => {
                    setPasscodeInput(e.target.value);
                    if (passcodeError) setPasscodeError(null);
                  }}
                  placeholder="Nhập mã Passcode được cấp..."
                  className="w-full rounded-lg border px-3 py-2 text-xs font-mono focus:outline-none"
                  style={{
                    backgroundColor: 'var(--panel)',
                    borderColor: 'var(--line-d)',
                    color: 'var(--chu)',
                  }}
                />
              </div>

              {roleGuardStatus.configError && (
                <div
                  role="alert"
                  className="p-2.5 rounded-lg bg-rose-100 border border-rose-400 text-rose-900 text-[11px] font-semibold"
                >
                  ⚠ Lỗi cấu hình bảo mật máy chủ: {roleGuardStatus.configError}
                </div>
              )}

              {passcodeError && (
                <div
                  role="alert"
                  className="p-2.5 rounded-lg bg-rose-100 border border-rose-400 text-rose-900 text-[11px] font-semibold"
                >
                  ⚠ {passcodeError}
                </div>
              )}

              <div className="text-[11px]" style={{ color: 'var(--chu-m)' }}>
                Mã được lưu an toàn trong phiên trình duyệt hiện tại.
              </div>
            </div>

            <div
              className="px-5 py-3 border-t flex items-center justify-end gap-2"
              style={{ backgroundColor: 'var(--giay-d)', borderColor: 'var(--line)' }}
            >
              <button
                type="button"
                onClick={closePasscodeModal}
                disabled={isVerifyingPasscode}
                className="px-3.5 py-1.5 rounded-md border text-xs font-semibold cursor-pointer"
                style={{ backgroundColor: 'var(--panel)', borderColor: 'var(--line-d)', color: 'var(--chu)' }}
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isVerifyingPasscode || Boolean(roleGuardStatus.configError) || !passcodeInput.trim()}
                className="px-4 py-1.5 rounded-md text-white text-xs font-bold transition disabled:opacity-45 cursor-pointer"
                style={{ backgroundColor: 'var(--navy)' }}
              >
                {isVerifyingPasscode ? 'Đang xác thực...' : '✔ Kích hoạt'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};
