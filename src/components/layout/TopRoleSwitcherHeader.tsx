import React, { useEffect, useState } from 'react';
import { TAXONOMY_3D } from '../../data/lexPmoData';
import {
  HybridServiceHealth,
  probeHybridServices,
} from '../../services/ssotBridgeService';
import { EmployeeUser, ProjectArchetypeCode, ProjectArchetypeItem } from '../../types/lexPmoTypes';
import { FOUR_PARTY_ROLES, RaciActionPermissions } from '../../utils/rbacRaciHelpers';

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

  return (
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
          title="Chuyển đổi Vai trò Pháp nhân 4 Bên (áp dụng khóa quyền thao tác thực tế theo Ma trận RACI)"
        >
          {FOUR_PARTY_ROLES.map(party => {
            const isActive = currentActor.rbacRole === party.code;
            return (
              <button
                key={party.code}
                type="button"
                onClick={() => {
                  onSelectActorId(party.employeeId);
                  const found = employees.find(emp => emp.id === party.employeeId);
                  showToast(
                    `Đã chuyển vai trò sang ${party.icon} ${party.fullTitle}${
                      found ? ` (${found.fullName})` : ''
                    }`
                  );
                }}
                title={`${party.fullTitle}\nQuyền RACI: ${party.raciScopeLabel}\nPhạm vi: ${party.authoritySummary}`}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? party.activeClass
                    : 'bg-slate-900/80 border-transparent text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span>{party.icon}</span>
                <span>{party.shortName}</span>
              </button>
            );
          })}
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
  );
};
