import React, { useEffect, useState } from 'react';
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

export interface TopRoleSwitcherHeaderProps {
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
  showToast: (msg: string) => void;
}

export const TopRoleSwitcherHeader: React.FC<TopRoleSwitcherHeaderProps> = ({
  currentChainMeta,
  activeProjectArchetype,
  currentArchetypeMeta,
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
        const dbLabel = status.fastApiOnline ? '🟢 SSOT DB (:8000) Online' : '🟡 Local Preview (Express Fallback)';
        const scanLabel = status.localScannerOnline ? '🟢 Scanner (:8008) Online' : 'Scanner (:8008) Standby';
        showToast(`Kiểm tra kết nối Hybrid: ${dbLabel} · ${scanLabel}`);
      }
    } finally {
      setIsProbingHybrid(false);
    }
  };

  useEffect(() => {
    void handleRefreshHybridStatus(false);
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
      return;
    }

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

  return (
    <>
      <header className="min-h-14 py-1.5 border-b border-slate-800 bg-slate-900/95 backdrop-blur px-3.5 flex flex-wrap items-center justify-between gap-2.5 shrink-0 z-20">
        {/* Bước hiện tại */}
        <div className="flex items-center gap-2 min-w-0 max-w-[290px] xl:max-w-[330px]">
          <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-mono font-bold text-xs shrink-0 whitespace-nowrap">
            {currentChainMeta.stepNum}
          </span>
          <div className="min-w-0">
            <h1 className="text-xs font-bold text-white truncate">{currentChainMeta.title}</h1>
            <p className="text-[10px] text-slate-400 truncate">
              {activeProjectArchetype}: {currentArchetypeMeta.authority}
            </p>
          </div>
        </div>

        {/* THANH CHUYỂN ĐỔI VAI TRÒ PHÁP NHÂN 4 BÊN (4-PARTY ROLE SWITCHER + RACI SCOPE) */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div
            className="flex items-center gap-1 bg-slate-950 border border-sky-500/40 rounded-xl p-1 shadow-inner"
            title={
              roleGuardStatus.configError
                ? 'Lỗi cấu hình ROLE_PASSCODES trên máy chủ (Server configuration error) — các vai trò nâng cao đang bị khóa an toàn'
                : roleGuardStatus.protected
                ? 'Chế độ RBAC Passcode Guard đang bật — yêu cầu Passcode khi chuyển sang CĐT / PMU / TVGS'
                : 'Chế độ Demo Mode — tự do chuyển đổi 4 vai trò (chưa cấu hình ROLE_PASSCODES)'
            }
          >
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
                  title={`${party.fullTitle}\nQuyền RACI: ${party.raciScopeLabel}\nPhạm vi: ${party.authoritySummary}${
                    needsPasscode ? '\n🔒 Yêu cầu Passcode xác thực để chuyển sang vai trò này' : ''
                  }`}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                    isActive
                      ? party.activeClass
                      : 'bg-slate-900/80 border-transparent text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span>{party.icon}</span>
                  <span>{party.shortName}</span>
                  {needsPasscode && (
                    <span className="text-[9px] opacity-85" aria-label="Cần Passcode">
                      🔒
                    </span>
                  )}
                  {isUnlocked && (
                    <span className="text-[9px] opacity-75" aria-label="Đã mở khóa phiên">
                      🔓
                    </span>
                  )}
                </button>
              );
            })}

            {roleGuardStatus.configError && (
              <span
                role="status"
                title={roleGuardStatus.configError}
                className="px-1.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-rose-950/80 border border-rose-500/60 text-rose-200 whitespace-nowrap"
              >
                ⚠ Lỗi cấu hình ROLE_PASSCODES
              </span>
            )}

            {roleGuardStatus.protected && unlockedRoles.length > 0 && onLockAllRoles && (
              <button
                type="button"
                onClick={() => {
                  onLockAllRoles();
                  showToast('Đã khóa lại các vai trò bảo vệ & chuyển về Nhà thầu (NTTC).');
                }}
                title="Khóa lại phiên các vai trò đã mở khóa và trở về vai trò Nhà thầu (NTTC)"
                className="px-1.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-rose-950/70 hover:bg-rose-900/90 border border-rose-500/40 text-rose-200 transition cursor-pointer whitespace-nowrap"
              >
                🔒 Khóa
              </button>
            )}
          </div>

          {/* Hiển thị rõ vai trò đang đăng nhập & phạm vi quyền hạn R-A-C-I */}
          <div
            className="hidden md:flex items-center gap-1 bg-slate-950 border border-slate-700/80 rounded-lg px-2 py-1 text-[10px] font-mono"
            title={`Đang đăng nhập: ${currentActor.fullName} (${currentActor.department})\nR: Thực hiện | A: Phê duyệt | C: Tham vấn | I: Nhận thông báo`}
          >
            <span className="text-slate-300 font-semibold truncate max-w-[115px]">
              {currentActor.fullName}
            </span>
            <span className="text-slate-600">|</span>
            {(['R', 'A', 'C', 'I'] as const).map(letter => {
              const info = raciPerms.raciMatrixMap[letter];
              return (
                <span
                  key={letter}
                  title={info.meaning}
                  className={`px-1.5 py-0.2 rounded font-extrabold border ${
                    info.active
                      ? letter === 'A'
                        ? 'bg-amber-500/25 text-amber-300 border-amber-400/60'
                        : letter === 'R'
                        ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400/60'
                        : letter === 'C'
                        ? 'bg-sky-500/25 text-sky-300 border-sky-400/60'
                        : 'bg-purple-500/25 text-purple-300 border-purple-400/60'
                      : 'bg-slate-900 text-slate-600 border-slate-800 line-through'
                  }`}
                >
                  {letter}
                </span>
              );
            })}
          </div>
        </div>

        {/* Cụm Badge Trạng thái Kết nối Hybrid SSOT + Bộ chọn Trục Dự án (Trục Y) + Tìm kiếm toàn cục */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Cụm Badge Trạng thái Kết nối Hybrid SSOT (:8000 & :8008) */}
          <button
            type="button"
            onClick={() => void handleRefreshHybridStatus(true)}
            disabled={isProbingHybrid}
            title={`Trạng thái Hybrid Architecture (Lần kiểm tra cuối: ${hybridHealth.checkedAt})
• FastAPI Backend (${hybridHealth.fastApiBaseUrl}): ${
              hybridHealth.fastApiOnline ? 'ONLINE (:8000)' : 'OFFLINE → Đang dùng Local Preview'
            }
• Local PDF Scanner Sidecar (${hybridHealth.localScannerBaseUrl}): ${
              hybridHealth.localScannerOnline ? 'ONLINE (:8008)' : 'STANDBY (Trình duyệt cục bộ)'
            }
Nhấn để kiểm tra lại kết nối (Refresh)`}
            className="flex items-center gap-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-700/90 hover:border-sky-500/50 rounded-lg px-2 py-1 text-[10px] font-mono transition cursor-pointer"
          >
            {hybridHealth.fastApiOnline ? (
              <span className="text-emerald-300 font-bold whitespace-nowrap">
                🟢 SSOT DB (:8000)
              </span>
            ) : (
              <span className="text-amber-300 font-semibold whitespace-nowrap">
                🟡 Local Preview
              </span>
            )}

            {hybridHealth.localScannerOnline ? (
              <>
                <span className="text-slate-600">|</span>
                <span className="text-emerald-300 font-bold whitespace-nowrap">
                  🟢 Scanner (:8008)
                </span>
              </>
            ) : (
              <span className="hidden xl:inline-flex items-center gap-1 text-slate-400 whitespace-nowrap">
                <span className="text-slate-700">|</span>
                <span>Scanner (:8008)</span>
              </span>
            )}

            <span
              className={`text-[10px] text-sky-400 ml-0.5 ${
                isProbingHybrid ? 'animate-spin' : ''
              }`}
            >
              ↻
            </span>
          </button>

          <div className="hidden 2xl:flex items-center gap-1.5 bg-slate-950 border border-amber-500/40 rounded-lg px-2 py-1">
            <span className="text-[10px] font-mono uppercase text-amber-400 font-bold whitespace-nowrap">
              Dự án:
            </span>
            <select
              value={activeProjectArchetype}
              onChange={e => onChangeProjectArchetype(e.target.value as ProjectArchetypeCode)}
              className="bg-transparent text-xs text-white font-semibold focus:outline-none cursor-pointer max-w-[165px] truncate"
            >
              {TAXONOMY_3D.projectTypes.map(pt => (
                <option key={pt.code} value={pt.code} className="bg-slate-900 text-slate-100">
                  [{pt.code}] {pt.name}
                </option>
              ))}
            </select>
          </div>

          {/* Ô tìm kiếm toàn cục */}
          <div className="relative">
            <input
              type="text"
              value={globalSearch}
              onChange={e => onChangeGlobalSearch(e.target.value)}
              placeholder="Tìm VBPL, Gate, Điều..."
              className="w-40 xl:w-48 bg-slate-950 border border-slate-700 rounded-lg pl-2.5 pr-6 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-amber-500"
            />
            {globalSearch && (
              <button
                onClick={() => onChangeGlobalSearch('')}
                className="absolute right-2 top-1.5 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MODAL XÁC THỰC PASSCODE CHUYỂN ĐỔI VAI TRÒ BẢO VỆ (CDT / PMU / TVGS) */}
      {pendingRoleParty && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={closePasscodeModal}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="lex-role-passcode-modal-title"
            onSubmit={handleVerifyPasscodeSubmit}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-slate-900 border-2 border-amber-500/70 shadow-2xl overflow-hidden text-slate-100"
          >
            <div className="px-5 py-3.5 bg-gradient-to-r from-slate-950 via-[#0f223d] to-slate-950 border-b border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="h-9 w-9 rounded-xl bg-amber-500/20 border border-amber-400/60 flex items-center justify-center text-lg shrink-0">
                  🔐
                </span>
                <div className="min-w-0">
                  <div
                    id="lex-role-passcode-modal-title"
                    className="text-[11px] font-mono font-extrabold text-amber-400 uppercase tracking-wide"
                  >
                    Xác Thực Chuyển Vai Trò (RBAC Passcode Guard)
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
                className="h-7 w-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold shrink-0 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="font-bold text-white">{pendingRoleParty.fullTitle}</div>
                <div className="text-[11px] font-mono text-amber-300">
                  {pendingRoleParty.raciScopeLabel}
                </div>
                <div className="text-[11px] text-slate-400">
                  {pendingRoleParty.authoritySummary}
                </div>
              </div>

              <div>
                <label
                  htmlFor="lex-role-passcode-input"
                  className="block text-[11px] font-mono font-bold text-amber-300 uppercase mb-1.5"
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
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-400 px-3 py-2 text-xs text-white focus:outline-none font-mono"
                />
              </div>

              {roleGuardStatus.configError && (
                <div
                  role="alert"
                  className="p-2.5 rounded-lg bg-rose-950/70 border border-rose-500/60 text-rose-200 text-[11px] font-semibold"
                >
                  ⚠ Lỗi cấu hình bảo mật máy chủ (Server configuration error): {roleGuardStatus.configError}. Hệ thống khóa an toàn (không cho phép Demo Mode bypass).
                </div>
              )}

              {passcodeError && (
                <div
                  role="alert"
                  className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/50 text-rose-200 text-[11px] font-semibold"
                >
                  ⚠ {passcodeError}
                </div>
              )}

              <div className="text-[10px] text-slate-400 font-mono">
                Trạng thái mở khóa chỉ được lưu trong phiên trình duyệt hiện tại (`sessionStorage`).
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closePasscodeModal}
                disabled={isVerifyingPasscode}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isVerifyingPasscode || Boolean(roleGuardStatus.configError) || !passcodeInput.trim()}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold transition disabled:opacity-45 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-lg cursor-pointer"
              >
                <span>🔓</span>
                <span>{isVerifyingPasscode ? 'Đang xác thực...' : 'Xác thực & Chuyển vai trò'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};
