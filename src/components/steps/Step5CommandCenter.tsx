import React, { useState } from "react";
import {
  ProjectArchetypeCode,
} from "../../types/lexPmoTypes";
import { ApprovalFlowD3Diagram } from "../ApprovalFlowD3Diagram";
import { Step5PortfolioDashboard } from "../Step5PortfolioDashboard";

const PROJECT_ARCHETYPE_ICONS: Record<ProjectArchetypeCode, string> = {
  HTKT: "🛣️",
  DAN_DUNG: "🏢",
  KCN: "🏭",
  CCN: "⚙️",
  FTZ: "🚢",
  PPP_BT: "🤝",
};

import type { StepContextType } from "../../App";
import {
  DEFAULT_NOTEBOOK_LM_URL,
  getResolvedNotebookUrl,
  loadNotebookLmUrlMap,
  NOTEBOOK_LM_CATALOG,
  NOTEBOOK_LM_COLLECTION_META,
  NotebookLmCollectionCode,
  saveNotebookLmUrlMap,
} from "../../config/notebookLmConfig";

export interface Step5CommandCenterProps {
  ctx: StepContextType;
}

export const Step5CommandCenter: React.FC<Step5CommandCenterProps> = ({ ctx }) => {
  const {
    activeTab, setActiveTab,
    activeProjectArchetype, setActiveProjectArchetype,
    employees,
    currentActor, raciPerms,
    setPendingDigitalSignoff,
    projectProfiles,
    gates,
    approvalWorkflows,
    raciTasks,
    projectAssets,
    qaqcControlRecords,
    voAppendixApproved, setVoAppendixApproved,
    voState, setVoState,
    chronoDates, setChronoDates,
    auditLogs,
    showToast, recordAuditLog,
    currentArchetypeMeta, chronoAuditStatus,
    setSelectedGateCode,
    projectGateStatusMap,
    evaluateGateCrossLock,
    step5SubMode, setStep5SubMode,
    enterpriseModuleTab, setEnterpriseModuleTab,
    selectedD3UnitFilter, setSelectedD3UnitFilter,
    filteredApprovalWorkflows,
    handleApproveWorkflow,
    handleCreateVoOrRfiRequest, handleAdvanceTaskStatus, handleCalibrateAsset,
    activeAiAgent, setActiveAiAgent,
    aiPromptInput, setAiPromptInput,
    aiOutputText,
    aiEngineSource,
    isAiRunning,
    AI_AGENTS_LIST, runMultiAgentAnalysis,
  } = ctx;

  const [nblmCollectionFilter, setNblmCollectionFilter] = useState<
    NotebookLmCollectionCode | 'ALL'
  >('LEGAL');
  const [nblmUrlMap, setNblmUrlMap] = useState<Record<string, string>>(() =>
    loadNotebookLmUrlMap()
  );
  const [editingNblmId, setEditingNblmId] = useState<string | null>(null);
  const [nblmUrlDraft, setNblmUrlDraft] = useState<string>('');

  const handleSaveNotebookUrl = (notebookId: string, notebookCode: string) => {
    const trimmed = nblmUrlDraft.trim();
    const nextMap = { ...nblmUrlMap };
    if (!trimmed || trimmed === DEFAULT_NOTEBOOK_LM_URL) {
      delete nextMap[notebookId];
    } else {
      nextMap[notebookId] = trimmed;
    }
    setNblmUrlMap(nextMap);
    saveNotebookLmUrlMap(nextMap);
    setEditingNblmId(null);
    setNblmUrlDraft('');
    showToast(`Đã lưu URL NotebookLM cho sổ [${notebookCode}] vào localStorage!`);
  };

  const filteredNotebooks = NOTEBOOK_LM_CATALOG.filter(
    item => nblmCollectionFilter === 'ALL' || item.collection === nblmCollectionFilter
  );

  return (
    <>
          {activeTab === 'STEP5_AUDIT' && (
            <div className="h-full flex flex-col overflow-hidden">
              {/* Sub-navigation giữa [Dashboard Tổng hợp Dự án], [5B. Luồng Phê duyệt D3.js & 4 Phân hệ] và [5A. VO Wizard & Kiểm toán Thời gian] */}
              <div className="h-11 px-4 bg-[var(--panel)] border-b border-[var(--line)] flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2 overflow-x-auto">
                  <button
                    onClick={() => setStep5SubMode('PORTFOLIO_DASHBOARD')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                      step5SubMode === 'PORTFOLIO_DASHBOARD'
                        ? 'bg-emerald-500 text-slate-950 shadow'
                        : 'bg-[var(--giay-d)] text-[var(--chu-m)] hover:text-[var(--chu)]'
                    }`}
                  >
                    📊 Dashboard Tổng hợp Dự án & Điểm nghẽn
                  </button>
                  <button
                    onClick={() => {
                      setStep5SubMode('ENTERPRISE_4MODULES');
                      setEnterpriseModuleTab('ADMIN_WF');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                      step5SubMode === 'ENTERPRISE_4MODULES'
                        ? 'bg-sky-500 text-slate-950 shadow'
                        : 'bg-[var(--giay-d)] text-[var(--chu-m)] hover:text-[var(--chu)]'
                    }`}
                  >
                    5B. Sơ đồ Khối D3.js Luồng Phê duyệt (Sankey/Tree) & Quản trị 4 Phân hệ
                  </button>
                  <button
                    onClick={() => setStep5SubMode('FORENSIC_VO')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                      step5SubMode === 'FORENSIC_VO'
                        ? 'bg-amber-500 text-slate-950 shadow'
                        : 'bg-[var(--giay-d)] text-[var(--chu-m)] hover:text-[var(--chu)]'
                    }`}
                  >
                    5A. Cây Quyết định Phát sinh (VO) & Kiểm toán Thời gian Hồ sơ
                  </button>
                </div>
                <span className="text-xs font-mono text-[var(--chu-m)] hidden md:inline">
                  Phiên RBAC: {currentActor.fullName} ({currentActor.rbacRole})
                </span>
              </div>

              {step5SubMode === 'PORTFOLIO_DASHBOARD' ? (
                <Step5PortfolioDashboard
                  projectTypes={projectProfiles}
                  projectIcons={PROJECT_ARCHETYPE_ICONS}
                  activeProjectArchetype={activeProjectArchetype}
                  currentActorRole={currentActor.rbacRole}
                  gates={gates}
                  projectGateStatusMap={projectGateStatusMap}
                  approvalWorkflows={approvalWorkflows}
                  employees={employees}
                  raciTasks={raciTasks}
                  qaqcControlRecords={qaqcControlRecords}
                  chronoErrorsCount={chronoAuditStatus.length}
                  evaluateGateCrossLock={evaluateGateCrossLock}
                  onSwitchProjectAndOpenGate={(projectCode, gateCode) => {
                    setActiveProjectArchetype(projectCode);
                    if (gateCode) {
                      setSelectedGateCode(gateCode as any);
                    }
                    setActiveTab('STEP3_PLAN');
                    showToast(
                      `Đã chuyển sang dự án [${projectCode}]${
                        gateCode ? ` · Mở Gate ${gateCode}` : ''
                      }`
                    );
                  }}
                  onApproveWorkflow={handleApproveWorkflow}
                  onInspectInD3Flow={wfId => {
                    setStep5SubMode('ENTERPRISE_4MODULES');
                    setEnterpriseModuleTab('ADMIN_WF');
                    setSelectedD3UnitFilter(`WF_${wfId}`);
                  }}
                  onOpenChronoAudit={() => setStep5SubMode('FORENSIC_VO')}
                />
              ) : step5SubMode === 'FORENSIC_VO' ? (
                <div className="flex-1 grid grid-cols-12 divide-x divide-[var(--line)] overflow-hidden">
                  <div className="col-span-12 lg:col-span-6 p-5 overflow-y-auto space-y-4">
                    <div className="bg-[var(--panel)] border border-amber-500/40 rounded-xl p-4 space-y-3">
                      <h3 className="text-sm font-bold text-amber-800 dark:text-amber-400">
                        Công cụ 1: Cây Quyết định Xử lý Phát sinh Hợp đồng & Thay đổi Thiết kế (VO Wizard)
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-[11px] text-[var(--chu-m)] mb-1">
                            1. Loại Hợp đồng đang thực hiện (QLHD):
                          </label>
                          <select
                            value={voState.contractType}
                            onChange={e => setVoState({ ...voState, contractType: e.target.value })}
                            className="w-full bg-[var(--giay)] border border-[var(--line-d)] rounded-lg px-3 py-2 text-xs text-[var(--chu)]"
                          >
                            <option value="TRON_GOI">Hợp đồng Trọn gói (Lump-sum)</option>
                            <option value="DON_GIA_CO_DINH">Hợp đồng theo Đơn giá cố định</option>
                            <option value="DON_GIA_DIEU_CHINH">Hợp đồng theo Đơn giá điều chỉnh</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] text-[var(--chu-m)] mb-1">
                            2. Phát sinh nằm ngoài phạm vi Thiết kế/HĐ?
                          </label>
                          <select
                            value={voState.isOutsideScope}
                            onChange={e => setVoState({ ...voState, isOutsideScope: e.target.value })}
                            className="w-full bg-[var(--giay)] border border-[var(--line-d)] rounded-lg px-3 py-2 text-xs text-[var(--chu)]"
                          >
                            <option value="YES">Có — Phát sinh ngoài bản vẽ hợp đồng</option>
                            <option value="NO">Không — Chỉ chênh lệch khối lượng BOQ</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] text-[var(--chu-m)] mb-1">
                            3. Có làm VƯỢT Giá gói thầu / Dự toán (QLCP)?
                          </label>
                          <select
                            value={voState.exceedsPkgPrice}
                            onChange={e => setVoState({ ...voState, exceedsPkgPrice: e.target.value })}
                            className="w-full bg-[var(--giay)] border border-[var(--line-d)] rounded-lg px-3 py-2 text-xs text-[var(--chu)]"
                          >
                            <option value="NO">Không — Nằm trong dự phòng phí gói thầu</option>
                            <option value="YES">Có — Vượt dự toán gói thầu được duyệt</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] text-[var(--chu-m)] mb-1">
                            4. Có ảnh hưởng Kết cấu chính / PCCC không?
                          </label>
                          <select
                            value={voState.affectsSafetyPCCC}
                            onChange={e => setVoState({ ...voState, affectsSafetyPCCC: e.target.value })}
                            className="w-full bg-[var(--giay)] border border-[var(--line-d)] rounded-lg px-3 py-2 text-xs text-[var(--chu)]"
                          >
                            <option value="NO">Không ảnh hưởng an toàn chịu lực & PCCC</option>
                            <option value="YES">Có ảnh hưởng kết cấu chính / giải pháp PCCC</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[var(--panel)] border border-emerald-500/40 rounded-xl p-4 space-y-2 text-xs">
                      <div className="font-bold text-emerald-800 dark:text-emerald-400 uppercase">
                        Lộ trình Pháp lý Bắt buộc cho Dự án [{activeProjectArchetype}]:
                      </div>
                      {voState.contractType === 'TRON_GOI' && voState.isOutsideScope === 'NO' ? (
                        <div className="p-3 rounded-lg bg-rose-500/10 dark:bg-rose-950/40 border border-rose-500 text-rose-900 dark:text-rose-200">
                          <b>CẢNH BÁO TỪ CHỐI THANH TOÁN (QLHD):</b> Đối với Hợp đồng Trọn gói, nếu không có
                          thay đổi thiết kế hoặc yêu cầu của Chủ đầu tư, mọi chênh lệch tăng khối lượng so với
                          BOQ nhà thầu tự chịu rủi ro — <b>TUYỆT ĐỐI KHÔNG ký Phụ lục bổ sung kinh phí</b>.
                        </div>
                      ) : (
                        <div className="p-3 rounded-lg bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/40 space-y-2 text-[var(--chu)]">
                          <div>
                            <b>1. Hiện trường (QLCL - Gate G12):</b> Lập Biên bản hiện trường 4 bên (Ban QLDA,
                            TVGS, TVTK, Nhà thầu) xác nhận nguyên nhân phát sinh.
                          </div>
                          {voState.affectsSafetyPCCC === 'YES' && (
                            <div className="text-amber-800 dark:text-amber-300 font-semibold">
                              <b>Thẩm định lại (HDXD/PCCC - Gate G6 & G9):</b> Phải trình{' '}
                              {currentArchetypeMeta.authority} / Cục PCCC thẩm định thiết kế điều chỉnh trước
                              khi thi công!
                            </div>
                          )}
                          <div>
                            <b>2. Dự toán (QLCP - Gate G9):</b>{' '}
                            {voState.exceedsPkgPrice === 'YES'
                              ? 'Do VƯỢT giá gói thầu, Chủ đầu tư phải phê duyệt điều chỉnh Dự toán gói thầu và KHLCNT trước khi ký Phụ lục.'
                              : 'Sử dụng chi phí dự phòng trong hợp đồng. Chủ đầu tư thẩm định và phê duyệt bản vẽ + dự toán phát sinh.'}
                          </div>
                          <div>
                            <b>3. Hợp đồng (QLHD - Gate G11):</b> Ký Phụ lục Hợp đồng chính thức trước khi đưa
                            vào Phụ lục 04 thanh toán tại Gate G14.
                          </div>
                        </div>
                      )}

                      {/* Chốt phê duyệt Phụ lục VO & Tạo yêu cầu VO/RFI theo RBAC 4 Bên */}
                      <div className="pt-2.5 border-t border-[var(--line)] space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[11px] font-mono text-[var(--chu-m)]">
                            Trạng thái Khóa chéo VO (Quy tắc c):{' '}
                            <b className={voAppendixApproved ? 'text-emerald-800 dark:text-emerald-400' : 'text-rose-800 dark:text-rose-400'}>
                              {voAppendixApproved
                                ? 'ĐÃ PHÊ DUYỆT PHỤ LỤC VO'
                                : 'CHƯA DUYỆT PHỤ LỤC VO (ĐANG KHÓA IPC G14)'}
                            </b>
                          </span>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              disabled={!raciPerms.canCreateVoOrRfi}
                              onClick={() => handleCreateVoOrRfiRequest('VO')}
                              title={
                                raciPerms.canCreateVoOrRfi
                                  ? 'Tạo & Trình yêu cầu phát sinh VO mới vào luồng 4 bên'
                                  : 'TVGS chỉ xác nhận kỹ thuật, không khởi tạo yêu cầu VO trực tiếp'
                              }
                              className="px-2.5 py-1.5 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-800 dark:text-orange-300 font-bold text-[11px] transition disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              📤 Tạo Yêu cầu VO
                            </button>
                            <button
                              type="button"
                              disabled={!raciPerms.canCreateVoOrRfi}
                              onClick={() => handleCreateVoOrRfiRequest('RFI')}
                              title={
                                raciPerms.canCreateVoOrRfi
                                  ? 'Tạo phiếu RFI nghiệm thu hiện trường tại Bước 4'
                                  : 'TVGS chỉ xác nhận RFI, không tạo mới RFI'
                              }
                              className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-800 dark:text-amber-300 font-bold text-[11px] transition disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              📝 Tạo phiếu RFI
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={!raciPerms.canTvgsVerify}
                            onClick={() => {
                              setPendingDigitalSignoff({
                                title: 'TVGS Xác nhận Kỹ thuật & Khối lượng Phát sinh VO',
                                actionLabel: `TVGS Xác nhận hồ sơ kỹ thuật VO tại Dự án [${activeProjectArchetype}]`,
                                module: 'VO_AUDIT',
                                entityRef: `VO Wizard / ${activeProjectArchetype}`,
                                previousState: 'VO_PENDING',
                                newState: 'TVGS_VERIFIED_VO',
                                requiredRaciLetter: 'R',
                                defaultNote: `TVGS đã đo bóc hiện trường, xác nhận phát sinh (${voState.contractType}, ngoài phạm vi=${voState.isOutsideScope}) đạt điều kiện trình Chủ đầu tư ký Phụ lục.`,
                                onConfirm: async (note, sha256Hex) => {
                                  await recordAuditLog({
                                    module: 'VO_AUDIT',
                                    action: 'TVGS Xác nhận kỹ thuật & khối lượng phát sinh VO',
                                    entityRef: `VO Wizard / ${activeProjectArchetype}`,
                                    previousState: 'VO_PENDING',
                                    newState: 'TVGS_VERIFIED_VO',
                                    sha256Hash: sha256Hex,
                                    accountabilityNote: note,
                                  });
                                  showToast('TVGS đã ký số xác nhận kỹ thuật hồ sơ VO!');
                                },
                              });
                            }}
                            title={
                              raciPerms.canTvgsVerify
                                ? 'TVGS ký số xác nhận kỹ thuật khối lượng VO'
                                : raciPerms.isContractor
                                ? 'Yêu cầu quyền TVGS / Chủ đầu tư'
                                : 'Chỉ Tư vấn Giám sát (TVGS) mới có quyền xác nhận kỹ thuật VO'
                            }
                            className="px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-800 dark:text-sky-300 font-bold text-xs transition disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            🔍 TVGS Xác nhận kỹ thuật VO
                          </button>

                          <button
                            type="button"
                            disabled={!raciPerms.canSignVoAppendix}
                            title={
                              raciPerms.canSignVoAppendix
                                ? 'Chủ đầu tư ký số Phê duyệt Dự toán & Phụ lục VO'
                                : raciPerms.isContractor
                                ? 'Yêu cầu quyền TVGS / Chủ đầu tư'
                                : 'Chỉ Chủ đầu tư (CĐT) mới có quyền Phê duyệt Dự toán & Ký Phụ lục VO'
                            }
                            onClick={() => {
                              const nextVal = !voAppendixApproved;
                              setPendingDigitalSignoff({
                                title: nextVal
                                  ? 'CĐT Phê duyệt Dự toán & Ký Phụ lục VO'
                                  : 'CĐT Tạm hủy Phê duyệt Phụ lục VO',
                                actionLabel: nextVal
                                  ? '✓ CĐT Phê duyệt Dự toán Phát sinh & Ký Phụ lục Hợp đồng VO'
                                  : 'Hủy phê duyệt Phụ lục VO (Kích hoạt khóa chéo G14)',
                                module: 'VO_AUDIT',
                                entityRef: 'VO Wizard / Gate G14',
                                previousState: voAppendixApproved ? 'VO_APPROVED' : 'VO_PENDING',
                                newState: nextVal ? 'VO_APPROVED' : 'VO_PENDING',
                                riskSeverity: nextVal ? 'NOMINAL' : 'WARNING',
                                requiredRaciLetter: 'A',
                                defaultNote: nextVal
                                  ? `Chủ đầu tư phê duyệt dự toán phát sinh & ký Phụ lục Hợp đồng VO cho dự án ${activeProjectArchetype}, mở khóa điều kiện (c) tại Gate G14.`
                                  : 'Thu hồi phê duyệt Phụ lục VO để rà soát lại dự toán phát sinh.',
                                onConfirm: async (note, sha256Hex) => {
                                  setVoAppendixApproved(nextVal);
                                  await recordAuditLog({
                                    module: 'VO_AUDIT',
                                    action: nextVal
                                      ? 'CĐT Phê duyệt Dự toán Phát sinh & Ký Phụ lục Hợp đồng VO'
                                      : 'CĐT Hủy phê duyệt Phụ lục VO (Kích hoạt khóa chéo G14)',
                                    entityRef: 'VO Wizard / Gate G14',
                                    previousState: voAppendixApproved ? 'VO_APPROVED' : 'VO_PENDING',
                                    newState: nextVal ? 'VO_APPROVED' : 'VO_PENDING',
                                    riskSeverity: nextVal ? 'NOMINAL' : 'WARNING',
                                    sha256Hash: sha256Hex,
                                    accountabilityNote: note,
                                  });
                                  showToast(
                                    nextVal
                                      ? 'Đã ký số phê duyệt Phụ lục VO — Đã gỡ điều kiện (c) tại Gate G14!'
                                      : 'Đã chuyển Phụ lục VO về trạng thái chờ duyệt!'
                                  );
                                },
                              });
                            }}
                            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition disabled:opacity-40 disabled:cursor-not-allowed ${
                              voAppendixApproved
                                ? 'bg-[var(--giay-d)] hover:bg-[var(--giay-d)] text-emerald-800 dark:text-emerald-300 border border-emerald-500/40'
                                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                            }`}
                          >
                            {voAppendixApproved
                              ? '✓ CĐT Đã ký Phụ lục VO (Hoàn tác)'
                              : '✓ CĐT Phê duyệt & Ký Phụ lục VO'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-12 lg:col-span-6 p-5 bg-[var(--panel)]/30 overflow-y-auto space-y-4">
                    <div className="bg-[var(--panel)] border border-sky-500/40 rounded-xl p-4 space-y-3">
                      <h3 className="text-sm font-bold text-sky-800 dark:text-sky-400">
                        Công cụ 2: Kiểm toán Logic Thời gian Hồ sơ (VLXD → QLCL → TQT)
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] text-[var(--chu-m)] mb-1">
                            1. Ngày lấy mẫu vật liệu hiện trường (VLXD):
                          </label>
                          <input
                            type="date"
                            value={chronoDates.sampleDate}
                            onChange={e => setChronoDates({ ...chronoDates, sampleDate: e.target.value })}
                            className="w-full bg-[var(--giay)] border border-[var(--line-d)] rounded-lg px-3 py-2 text-xs text-[var(--chu)] font-mono tabular-nums"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-[var(--chu-m)] mb-1">
                            2. Ngày xuất Kết quả thí nghiệm LAS (VLXD):
                          </label>
                          <input
                            type="date"
                            value={chronoDates.labResultDate}
                            onChange={e => setChronoDates({ ...chronoDates, labResultDate: e.target.value })}
                            className="w-full bg-[var(--giay)] border border-[var(--line-d)] rounded-lg px-3 py-2 text-xs text-[var(--chu)] font-mono tabular-nums"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-[var(--chu-m)] mb-1">
                            3. Ngày Nghiệm thu vật liệu đầu vào (QT-03):
                          </label>
                          <input
                            type="date"
                            value={chronoDates.materialApproveDate}
                            onChange={e =>
                              setChronoDates({ ...chronoDates, materialApproveDate: e.target.value })
                            }
                            className="w-full bg-[var(--giay)] border border-[var(--line-d)] rounded-lg px-3 py-2 text-xs text-[var(--chu)] font-mono tabular-nums"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-[var(--chu-m)] mb-1">
                            4. Ngày Nghiệm thu công việc xây dựng (QLCL):
                          </label>
                          <input
                            type="date"
                            value={chronoDates.workInspectDate}
                            onChange={e =>
                              setChronoDates({ ...chronoDates, workInspectDate: e.target.value })
                            }
                            className="w-full bg-[var(--giay)] border border-[var(--line-d)] rounded-lg px-3 py-2 text-xs text-[var(--chu)] font-mono tabular-nums"
                          />
                        </div>
                      </div>

                      {chronoAuditStatus.length === 0 ? (
                        <div className="p-4 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500 text-emerald-800 dark:text-emerald-300 text-xs">
                          <b>HỒ SƠ HỢP LỆ 100% VỀ TRÌNH TỰ THỜI GIAN!</b> Đủ điều kiện mở khóa Gate G14 giải
                          ngân.
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-rose-500/10 dark:bg-rose-950/40 border border-rose-500 text-rose-900 dark:text-rose-200 text-xs space-y-2">
                          <div className="font-bold text-rose-800 dark:text-rose-400">
                            PHÁT HIỆN {chronoAuditStatus.length} LỖI LOGIC THỜI GIAN HỒ SƠ:
                          </div>
                          <ul className="list-disc pl-4 space-y-1">
                            {chronoAuditStatus.map((e, idx) => (
                              <li key={idx}>{e}</li>
                            ))}
                          </ul>
                          <button
                            onClick={async () => {
                              setChronoDates({
                                sampleDate: '2026-10-05',
                                labResultDate: '2026-10-12',
                                materialApproveDate: '2026-10-13',
                                workInspectDate: '2026-10-15',
                              });
                              await recordAuditLog({
                                module: 'VO_AUDIT',
                                action: 'Chuẩn hóa trình tự thời gian nghiệm thu (15/10/2026) — Khắc phục lỗi RF-05',
                                entityRef: 'Gate G12 & G14 / BBNT-CV-05',
                                previousState: 'CHRONO_ERROR',
                                newState: 'CHRONO_VALIDATED',
                              });
                              showToast('Đã đồng bộ ngày nghiệm thu hợp lệ và ghi nhận vào AuditLog!');
                            }}
                            className="mt-2 px-3 py-1.5 rounded bg-emerald-500 text-slate-950 font-bold text-xs"
                          >
                            Chuẩn hóa về ngày hợp lệ (2026-10-15)
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* CHẾ ĐỘ 5B: QUẢN TRỊ DOANH NGHIỆP HỢP NHẤT 4 PHÂN HỆ + AUDIT LOG */
                <div className="flex-1 flex flex-col overflow-hidden p-5 space-y-4">
                  {/* Thanh chọn phân hệ: HRM, Admin Approval, Tasks RACI, Assets LAS, AuditLog */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          { id: 'ADMIN_WF', label: '1. Hành chính & Luồng Phê duyệt (Approval Workflows)' },
                          { id: 'HRM', label: '2. Nhân sự, Chứng chỉ & RACI (HRM)' },
                          { id: 'TASKS_RACI', label: '3. Quản lý Công việc & Tiến độ WBS (Tasks/RACI)' },
                          { id: 'ASSETS_LAS', label: '4. Quản lý Tài sản & Thiết bị LAS-XD (QR Code)' },
                          { id: 'AUDIT_LOG', label: `5. Nhật ký Bảo mật Bất biến (AuditLog: ${auditLogs.length})` },
                        ] as const
                      ).map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setEnterpriseModuleTab(tab.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition whitespace-nowrap ${
                            enterpriseModuleTab === tab.id
                              ? 'bg-amber-500 text-slate-950 border-amber-400'
                              : 'bg-[var(--panel)] text-[var(--chu-m)] border-[var(--line)] hover:border-[var(--line-d)]'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Nội dung chi tiết từng phân hệ */}
                  <div className="flex-1 overflow-y-auto">
                    {enterpriseModuleTab === 'ADMIN_WF' && (
                      <div className="space-y-4">
                        {/* BIỂU ĐỒ D3.JS DẠNG KHỐI (SANKEY BLOCK & HIERARCHY TREE) TRỰC QUAN HÓA LUỒNG PHÊ DUYỆT & NÚT THẮT CỔ CHAI */}
                        <ApprovalFlowD3Diagram
                          approvalWorkflows={approvalWorkflows}
                          employees={employees}
                          activeProjectArchetype={activeProjectArchetype}
                          currentActorRole={currentActor.rbacRole}
                          authorityName={currentArchetypeMeta.authority}
                          chronoErrorsCount={chronoAuditStatus.length}
                          selectedRoleFilter={selectedD3UnitFilter}
                          onSelectRoleFilter={roleOrNode => {
                            setSelectedD3UnitFilter(prev =>
                              prev === roleOrNode ? 'ALL' : roleOrNode
                            );
                          }}
                          onQuickResolveWorkflow={(wf, nextStatus) =>
                            handleApproveWorkflow(wf, nextStatus)
                          }
                        />

                        {/* Bảng chi tiết Tờ trình / Hồ sơ Phê duyệt đồng bộ trực tiếp với Sơ đồ D3.js */}
                        <div className="bg-[var(--panel)] border border-[var(--line)] rounded-xl overflow-hidden">
                          <div className="px-4 py-2.5 bg-[var(--giay)] border-b border-[var(--line)] flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase">
                                Danh mục Tờ trình & Hồ sơ trong Luồng Phê duyệt ({filteredApprovalWorkflows.length}/{approvalWorkflows.length})
                              </span>
                              {selectedD3UnitFilter !== 'ALL' && (
                                <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-800 dark:text-amber-300 font-mono text-[10px] font-bold">
                                  Đang lọc theo khối D3: {selectedD3UnitFilter}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-[var(--chu-m)]">
                              Cập nhật trạng thái bên dưới sẽ tự động tính lại băng thông và nút thắt trên biểu đồ D3.js
                            </span>
                          </div>
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-[var(--giay)] border-b border-[var(--line)] text-[var(--chu-m)] font-mono text-[11px]">
                                <th className="p-3">Số hiệu VB</th>
                                <th className="p-3">Trích yếu Tờ trình / Chẩn đoán Nút thắt</th>
                                <th className="p-3">Gate · Lĩnh vực</th>
                                <th className="p-3">Luồng RACI: Trình (R) → Tham vấn (C) → Duyệt (A)</th>
                                <th className="p-3">SLA & Trạng thái</th>
                                <th className="p-3 text-right">Thao tác RBAC</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--line)]">
                              {filteredApprovalWorkflows.map(wf => {
                                const reqEmp = employees.find(e => e.id === wf.requesterId);
                                const appEmp = employees.find(e => e.id === wf.approverId);
                                const isOverSla = (wf.elapsedHours || 0) > (wf.slaHours || 48);
                                return (
                                  <tr key={wf.id} className="hover:bg-[var(--giay-d)]">
                                    <td className="p-3 font-mono font-bold text-amber-800 dark:text-amber-400 whitespace-nowrap">
                                      <div>{wf.docCode}</div>
                                      <div className="text-[10px] text-[var(--chu-m)] font-normal">
                                        {wf.submittedAt}
                                      </div>
                                    </td>
                                    <td className="p-3">
                                      <div className="font-semibold text-[var(--chu)]">{wf.title}</div>
                                      <div className="font-mono text-[10px] text-[var(--chu-m)]">
                                        {wf.ssotFileName}
                                      </div>
                                      {wf.bottleneckReason && (
                                        <div
                                          className={`mt-1 text-[11px] font-mono ${
                                            wf.status === 'REJECTED_HOLD' || wf.status === 'PENDING_REVIEW'
                                              ? 'text-rose-800 dark:text-rose-300'
                                              : 'text-emerald-800 dark:text-emerald-300'
                                          }`}
                                        >
                                          • {wf.bottleneckReason}
                                        </div>
                                      )}
                                    </td>
                                    <td className="p-3 font-mono whitespace-nowrap">
                                      <span className="px-2 py-0.5 rounded bg-[var(--giay)] border border-[var(--line-d)] text-amber-800 dark:text-amber-300 font-bold">
                                        {wf.gateRef}
                                      </span>{' '}
                                      · <span className="text-sky-800 dark:text-sky-300">{wf.domain}</span>
                                    </td>
                                    <td className="p-3 text-[var(--chu-m)]">
                                      <div className="text-xs">
                                        <span className="text-amber-800 dark:text-amber-300 font-mono">
                                          [{reqEmp?.rbacRole}]
                                        </span>{' '}
                                        {reqEmp?.fullName}
                                      </div>
                                      <div className="text-[11px] text-[var(--chu-m)] font-mono">
                                        ↳ Tham vấn: {wf.consultedRole || 'BQLDA'} → Duyệt:{' '}
                                        <b className="text-sky-800 dark:text-sky-300">
                                          [{appEmp?.rbacRole}] {appEmp?.fullName}
                                        </b>
                                      </div>
                                    </td>
                                    <td className="p-3 font-mono font-semibold whitespace-nowrap">
                                      <div
                                        className={
                                          wf.status === 'CDT_APPROVED'
                                            ? 'text-emerald-800 dark:text-emerald-400'
                                            : wf.status === 'TVGS_VERIFIED'
                                            ? 'text-sky-800 dark:text-sky-400'
                                            : wf.status === 'REJECTED_HOLD'
                                            ? 'text-rose-800 dark:text-rose-400'
                                            : 'text-amber-800 dark:text-amber-400'
                                        }
                                      >
                                        {wf.status}
                                      </div>
                                      <div
                                        className={`text-[10px] ${
                                          isOverSla ? 'text-rose-800 dark:text-rose-400 font-bold' : 'text-[var(--chu-m)]'
                                        }`}
                                      >
                                        SLA: {wf.elapsedHours || 48}h / {wf.slaHours || 48}h{' '}
                                        {isOverSla ? '(Quá hạn)' : '(Đúng hạn)'}
                                      </div>
                                    </td>
                                    <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                                      {(raciPerms.isContractor || raciPerms.isBqlda) && (
                                        <button
                                          type="button"
                                          onClick={() => handleApproveWorkflow(wf, 'PENDING_REVIEW')}
                                          title="Nộp lại / Trình duyệt hồ sơ lên TVGS & Chủ đầu tư"
                                          className="px-2 py-1 rounded bg-orange-500/20 border border-orange-500/40 text-orange-800 dark:text-orange-300 hover:bg-orange-500/30 font-semibold"
                                        >
                                          📤 Trình duyệt
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        disabled={!raciPerms.canTvgsVerify}
                                        onClick={() => handleApproveWorkflow(wf, 'TVGS_VERIFIED')}
                                        title={
                                          raciPerms.canTvgsVerify
                                            ? 'TVGS ký số xác nhận kỹ thuật / nghiệm thu'
                                            : raciPerms.isContractor
                                            ? 'Yêu cầu quyền TVGS / Chủ đầu tư'
                                            : 'Chỉ Tư vấn Giám sát (TVGS) mới có quyền xác nhận kỹ thuật'
                                        }
                                        className="px-2.5 py-1 rounded bg-sky-500/20 border border-sky-500/40 text-sky-800 dark:text-sky-300 hover:bg-sky-500/30 font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                                      >
                                        🔍 TVGS Xác nhận
                                      </button>
                                      <button
                                        type="button"
                                        disabled={!raciPerms.canCdtFinalApprove}
                                        onClick={() => handleApproveWorkflow(wf, 'CDT_APPROVED')}
                                        title={
                                          raciPerms.canCdtFinalApprove
                                            ? 'Chủ đầu tư ký số Phê duyệt cuối cùng'
                                            : raciPerms.isContractor
                                            ? 'Yêu cầu quyền TVGS / Chủ đầu tư'
                                            : 'Chỉ Chủ đầu tư (CĐT) mới có quyền Phê duyệt cuối cùng'
                                        }
                                        className="px-2.5 py-1 rounded bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed"
                                      >
                                        ✓ CĐT Phê duyệt
                                      </button>
                                      <button
                                        type="button"
                                        disabled={!raciPerms.canReturnForSupplement}
                                        onClick={() => handleApproveWorkflow(wf, 'REJECTED_HOLD')}
                                        title={
                                          raciPerms.canReturnForSupplement
                                            ? 'Trả lại yêu cầu bổ sung / Chặn Hold nút thắt'
                                            : 'Yêu cầu quyền TVGS / Chủ đầu tư'
                                        }
                                        className="px-2 py-1 rounded bg-rose-500/20 border border-rose-500/40 text-rose-800 dark:text-rose-300 hover:bg-rose-500/30 font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                                      >
                                        ↩️ Trả lại / Hold
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {enterpriseModuleTab === 'HRM' && (
                      <div className="bg-[var(--panel)] border border-[var(--line)] rounded-xl overflow-hidden">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-[var(--giay)] border-b border-[var(--line)] text-[var(--chu-m)] font-mono text-[11px]">
                              <th className="p-3">Mã NV</th>
                              <th className="p-3">Họ và Tên · Chức danh</th>
                              <th className="p-3">Phòng ban / Đơn vị</th>
                              <th className="p-3">Vai trò RBAC · RACI</th>
                              <th className="p-3">Chứng chỉ hành nghề XD</th>
                              <th className="p-3 text-right">KPI · Liên kết Chéo</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--line)]">
                            {employees.map(emp => (
                              <tr key={emp.id} className="hover:bg-[var(--giay-d)]">
                                <td className="p-3 font-mono font-bold text-amber-800 dark:text-amber-400">{emp.code}</td>
                                <td className="p-3">
                                  <div className="font-bold text-[var(--chu)]">{emp.fullName}</div>
                                  <div className="text-[var(--chu-m)] text-[11px]">{emp.title}</div>
                                </td>
                                <td className="p-3 text-[var(--chu-m)]">{emp.department}</td>
                                <td className="p-3 font-mono text-sky-800 dark:text-sky-300">
                                  {emp.rbacRole} · RACI: {emp.raciDefault}
                                </td>
                                <td className="p-3 font-mono text-emerald-800 dark:text-emerald-400">{emp.certNumber}</td>
                                <td className="p-3 text-right font-mono tabular-nums text-[var(--chu)]">
                                  KPI: <b>{emp.kpiScore}/100</b> · {emp.activeTasksCount} Task ·{' '}
                                  {emp.assignedAssetsCount} Tài sản
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {enterpriseModuleTab === 'TASKS_RACI' && (
                      <div className="bg-[var(--panel)] border border-[var(--line)] rounded-xl overflow-hidden">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-[var(--giay)] border-b border-[var(--line)] text-[var(--chu-m)] font-mono text-[11px]">
                              <th className="p-3">Mã WBS · Gate</th>
                              <th className="p-3">Nội dung Công việc Thực thi Pháp lý & Hiện trường</th>
                              <th className="p-3">Nhân sự Phụ trách (RACI)</th>
                              <th className="p-3">Hạn hoàn thành</th>
                              <th className="p-3 text-right">Tiến độ</th>
                              <th className="p-3 text-right">Cập nhật</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--line)]">
                            {raciTasks.map(task => {
                              const assignee = employees.find(e => e.id === task.assigneeId);
                              return (
                                <tr key={task.id} className="hover:bg-[var(--giay-d)]">
                                  <td className="p-3 font-mono font-bold text-amber-800 dark:text-amber-400 whitespace-nowrap">
                                    {task.wbsCode} · {task.gateRef}
                                  </td>
                                  <td className="p-3 font-medium text-[var(--chu)]">{task.title}</td>
                                  <td className="p-3 text-[var(--chu-m)]">
                                    {assignee?.fullName} ({task.raciRole})
                                  </td>
                                  <td className="p-3 font-mono tabular-nums text-[var(--chu-m)]">{task.dueDate}</td>
                                  <td className="p-3 text-right font-mono tabular-nums text-emerald-800 dark:text-emerald-400">
                                    {task.progress}% ({task.status})
                                  </td>
                                  <td className="p-3 text-right">
                                    <button
                                      onClick={() => handleAdvanceTaskStatus(task)}
                                      className="px-2.5 py-1 rounded bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 whitespace-nowrap"
                                    >
                                      Chuyển bước →
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {enterpriseModuleTab === 'ASSETS_LAS' && (
                      <div className="bg-[var(--panel)] border border-[var(--line)] rounded-xl overflow-hidden">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-[var(--giay)] border-b border-[var(--line)] text-[var(--chu-m)] font-mono text-[11px]">
                              <th className="p-3">Mã QR / Barcode</th>
                              <th className="p-3">Tên Thiết bị LAS-XD / Trắc địa / CDE</th>
                              <th className="p-3">Người giữ tài sản (Custodian)</th>
                              <th className="p-3">Hạn Hiệu chuẩn</th>
                              <th className="p-3">Trạng thái · Khấu hao</th>
                              <th className="p-3 text-right">Kiểm kê QR</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--line)]">
                            {projectAssets.map(asset => {
                              const holder = employees.find(e => e.id === asset.custodianId);
                              return (
                                <tr key={asset.id} className="hover:bg-[var(--giay-d)]">
                                  <td className="p-3 font-mono font-bold text-sky-800 dark:text-sky-400 whitespace-nowrap">
                                    {asset.qrBarcode}
                                  </td>
                                  <td className="p-3 font-medium text-[var(--chu)]">
                                    {asset.name} (Gate {asset.gateRef})
                                  </td>
                                  <td className="p-3 text-[var(--chu-m)]">{holder?.fullName}</td>
                                  <td className="p-3 font-mono tabular-nums text-[var(--chu-m)]">
                                    {asset.calibrationDueDate}
                                  </td>
                                  <td className="p-3 font-mono tabular-nums">
                                    <span
                                      className={
                                        asset.status === 'ACTIVE_CALIBRATED'
                                          ? 'text-emerald-800 dark:text-emerald-400'
                                          : 'text-amber-800 dark:text-amber-400'
                                      }
                                    >
                                      {asset.status}
                                    </span>{' '}
                                    · KH: {asset.depreciationRate}%/năm
                                  </td>
                                  <td className="p-3 text-right">
                                    <button
                                      onClick={() => handleCalibrateAsset(asset)}
                                      className="px-2.5 py-1 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/30 font-semibold whitespace-nowrap"
                                    >
                                      Xác nhận Hiệu chuẩn
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {enterpriseModuleTab === 'AUDIT_LOG' && (
                      <div className="bg-[var(--panel)] border border-[var(--line)] rounded-xl overflow-hidden">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-[var(--giay)] border-b border-[var(--line)] text-[var(--chu-m)] font-mono text-[11px]">
                              <th className="p-3">Mã Audit · Thời gian</th>
                              <th className="p-3">Nhân sự Thực thi (RBAC)</th>
                              <th className="p-3">Phân hệ</th>
                              <th className="p-3">Hành động · Ý kiến Giải trình &amp; Chữ ký SHA-256</th>
                              <th className="p-3">Thực thể Tham chiếu</th>
                              <th className="p-3 text-right">Trạng thái Mới</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--line)]">
                            {auditLogs.map(log => (
                              <tr key={log.id} className="hover:bg-[var(--giay-d)]">
                                <td className="p-3 font-mono tabular-nums text-[var(--chu-m)] whitespace-nowrap">
                                  <div>{log.id}</div>
                                  <div className="text-[10px]">{log.timestamp}</div>
                                </td>
                                <td className="p-3">
                                  <div className="font-semibold text-[var(--chu)]">{log.actorName}</div>
                                  <div className="font-mono text-[10px] text-sky-800 dark:text-sky-400">{log.actorRole}</div>
                                </td>
                                <td className="p-3 font-mono text-amber-800 dark:text-amber-400 whitespace-nowrap">{log.module}</td>
                                <td className="p-3 text-[var(--chu)] space-y-1">
                                  <div className="font-medium">{log.action}</div>
                                  {log.accountabilityNote && (
                                    <div className="text-[11px] text-amber-900 dark:text-amber-200/90 italic">
                                      “{log.accountabilityNote}”
                                    </div>
                                  )}
                                  {log.sha256Hash && (
                                    <div className="font-mono text-[10px] text-emerald-800 dark:text-emerald-300 bg-[var(--giay)] border border-emerald-500/30 rounded px-2 py-0.5 inline-block">
                                      🔏 SHA-256: {log.sha256Hash.slice(0, 24)}…
                                    </div>
                                  )}
                                </td>
                                <td className="p-3 font-mono text-[11px] text-[var(--chu-m)]">{log.entityRef}</td>
                                <td className="p-3 text-right font-mono font-bold whitespace-nowrap">
                                  <span
                                    className={
                                      log.riskSeverity === 'CRITICAL'
                                        ? 'text-rose-800 dark:text-rose-400'
                                        : log.riskSeverity === 'WARNING'
                                        ? 'text-amber-800 dark:text-amber-400'
                                        : 'text-emerald-800 dark:text-emerald-400'
                                    }
                                  >
                                    {log.newState}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================
              BƯỚC 6: TRUNG TÂM 5 AI AGENTS PHÁP LÝ & KIỂM TOÁN DỰ ÁN (SERVER-SIDE)
             ================================================================ */}
          {activeTab === 'STEP6_AI' && (
            <div className="h-full grid grid-cols-12 divide-x divide-[var(--line)] overflow-hidden">
              {/* Cột Trái (4 cols): Chọn 1 trong 5 AI Agents chuyên biệt */}
              <div className="col-span-12 lg:col-span-4 p-4 overflow-y-auto space-y-3 bg-[var(--giay)]">
                <div className="text-xs font-bold uppercase text-indigo-800 dark:text-indigo-400">
                  CHỌN TÁC NHÂN AI CHUYÊN BIỆT (5 AI AGENTS)
                </div>
                {AI_AGENTS_LIST.map(ag => (
                  <button
                    key={ag.id}
                    onClick={() => {
                      setActiveAiAgent(ag.id);
                      setAiPromptInput(ag.samplePrompt);
                    }}
                    className={`w-full text-left p-3.5 rounded-xl border transition space-y-1 ${
                      activeAiAgent === ag.id
                        ? 'bg-indigo-500/20 border-indigo-400 text-[var(--chu)]'
                        : 'bg-[var(--panel)]/70 border-[var(--line)] text-[var(--chu-m)] hover:bg-[var(--panel)]'
                    }`}
                  >
                    <div className="text-xs font-bold text-indigo-800 dark:text-indigo-300">{ag.name}</div>
                    <p className="text-[11px] text-[var(--chu-m)] leading-snug">{ag.desc}</p>
                  </button>
                ))}

                <div className="p-3 rounded-xl bg-[var(--panel)] border border-[var(--line)] text-xs text-[var(--chu-m)] space-y-1">
                  <div className="font-mono text-emerald-800 dark:text-emerald-400 font-semibold">
                    Server-Side Gemini API & Legal Engine
                  </div>
                  <p className="text-[11px]">
                    Tác nhân AI thực thi an toàn qua máy chủ Express (`/api/gemini/analyze`), tự động kết hợp
                    ngữ cảnh 3 Trục của dự án [{activeProjectArchetype}] và trạng thái kiểm toán hồ sơ.
                  </p>
                </div>
              </div>

              {/* Cột Phải (8 cols): Giao diện Thực thi AI & Phán quyết Pháp lý */}
              <div className="col-span-12 lg:col-span-8 p-5 overflow-y-auto space-y-4">
                <div className="bg-[var(--panel)] border border-indigo-500/40 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-indigo-800 dark:text-indigo-400">
                      YÊU CẦU PHÂN TÍCH TÌNH HUỐNG PHÁP LÝ / KIỂM TOÁN DỰ ÁN [{activeProjectArchetype}]
                    </span>
                    <span className="text-[11px] font-mono text-indigo-800 dark:text-indigo-300">
                      3D Context Active {aiEngineSource ? `· ${aiEngineSource}` : ''}
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={aiPromptInput}
                    onChange={e => setAiPromptInput(e.target.value)}
                    className="w-full bg-[var(--giay)] border border-[var(--line)] rounded-lg p-3 text-xs text-[var(--chu)] focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={runMultiAgentAnalysis}
                    disabled={isAiRunning}
                    className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition"
                  >
                    {isAiRunning
                      ? 'Đang chạy đối soát chéo 3 Trục trên Server...'
                      : 'KÍCH HOẠT AI AGENT ĐỐI SOÁT CHÉO & XUẤT PHÁN QUYẾT'}
                  </button>
                </div>

                {aiOutputText && (
                  <div className="bg-[var(--panel)] border border-emerald-500/40 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-emerald-800 dark:text-emerald-400">
                        Kết quả Phân tích & Đối soát từ AI Agent:
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(aiOutputText);
                          showToast('Đã copy báo cáo phân tích của AI!');
                        }}
                        className="text-xs bg-[var(--giay-d)] px-2.5 py-1 rounded text-[var(--chu)] hover:bg-[var(--giay-d)]"
                      >
                        Copy Báo cáo
                      </button>
                    </div>
                    <pre className="p-4 rounded-lg bg-[var(--giay)] border border-[var(--line)] text-xs font-mono text-[var(--chu)] whitespace-pre-wrap leading-relaxed">
                      {aiOutputText}
                    </pre>
                  </div>
                )}

                {/* BẢNG ĐIỀU KHIỂN NOTEBOOKLM GROUNDED KNOWLEDGE HUB (14 SỔ LEGAL, 5 SỔ AI, THAM KHẢO) */}
                <div className="bg-[var(--panel)] border border-indigo-500/40 rounded-xl p-4 space-y-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-indigo-500 text-white font-mono text-[10px] font-bold">
                          DEEP-RAG HUB
                        </span>
                        <h3 className="text-xs font-bold uppercase text-[var(--chu)]">
                          NotebookLM Grounded Knowledge Hub (3 Bộ sưu tập · 21 Sổ Chuyên đề)
                        </h3>
                      </div>
                      <p className="text-[11px] text-[var(--chu-m)] mt-0.5">
                        Quản lý & gắn link trực tiếp tới 14 sổ <b className="text-amber-800 dark:text-amber-300">LEGAL</b>, 5 sổ{' '}
                        <b className="text-indigo-800 dark:text-indigo-300">AI</b> và 2 sổ đệm{' '}
                        <b className="text-emerald-800 dark:text-emerald-300">Tham Khảo</b> (lưu tự động trong{' '}
                        <code className="text-sky-800 dark:text-sky-300">localStorage</code>).
                      </p>
                    </div>

                    {/* Bộ lọc 3 Bộ sưu tập */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(
                        [
                          { id: 'LEGAL', label: '⚖️ LEGAL (14 sổ)' },
                          { id: 'AI', label: '🤖 AI (5 sổ)' },
                          { id: 'THAM_KHAO', label: '🗂️ Tham Khảo (2 sổ đệm)' },
                          { id: 'ALL', label: `📚 Tất cả (${NOTEBOOK_LM_CATALOG.length})` },
                        ] as const
                      ).map(tab => {
                        const active = nblmCollectionFilter === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setNblmCollectionFilter(tab.id)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border transition ${
                              active
                                ? 'bg-indigo-500 text-white border-indigo-300 shadow-xs'
                                : 'bg-[var(--giay)] text-[var(--chu-m)] border-[var(--line)] hover:bg-[var(--giay-d)]'
                            }`}
                          >
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Thông tin tóm tắt Bộ sưu tập đang chọn */}
                  {nblmCollectionFilter !== 'ALL' && (
                    <div className="p-2.5 rounded-lg bg-[var(--giay)] border border-[var(--line)] flex items-center justify-between gap-2 text-[11px]">
                      <span className="text-[var(--chu-m)]">
                        {NOTEBOOK_LM_COLLECTION_META[nblmCollectionFilter].description}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border shrink-0 ${NOTEBOOK_LM_COLLECTION_META[nblmCollectionFilter].badgeClass}`}
                      >
                        {NOTEBOOK_LM_COLLECTION_META[nblmCollectionFilter].badgeCount}
                      </span>
                    </div>
                  )}

                  {/* Danh sách các Sổ ghi chú NotebookLM */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5 max-h-[420px] overflow-y-auto pr-1">
                    {filteredNotebooks.map(nb => {
                      const resolvedUrl = getResolvedNotebookUrl(nb.id, nblmUrlMap);
                      const hasCustomUrl = Boolean(nblmUrlMap[nb.id]);
                      const isEditingThis = editingNblmId === nb.id;
                      const colMeta = NOTEBOOK_LM_COLLECTION_META[nb.collection];

                      return (
                        <div
                          key={nb.id}
                          className="p-3 rounded-xl bg-[var(--giay)] border border-[var(--line)] hover:border-indigo-500/50 transition flex flex-col justify-between gap-2"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                  className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold border shrink-0 ${colMeta.badgeClass}`}
                                >
                                  {nb.code}
                                </span>
                                <span className="text-xs font-bold text-[var(--chu)] truncate" title={nb.title}>
                                  {nb.title}
                                </span>
                              </div>
                              {hasCustomUrl ? (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 font-mono text-[9px] shrink-0">
                                  Đã gắn Link riêng
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-[var(--panel)] text-[var(--chu-m)] border border-[var(--line)] font-mono text-[9px] shrink-0">
                                  Mặc định
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] text-[var(--chu-m)] leading-snug">{nb.description}</p>

                            {/* Tags Lĩnh vực & Stage-Gate liên kết */}
                            <div className="flex flex-wrap items-center gap-1 pt-0.5">
                              {nb.linkedDomains.map(dom => (
                                <span
                                  key={dom}
                                  className="px-1.5 py-0.2 rounded bg-[var(--panel)] border border-[var(--line)] text-[9px] font-mono text-sky-800 dark:text-sky-300"
                                >
                                  {dom}
                                </span>
                              ))}
                              {nb.linkedGates.map(g => (
                                <span
                                  key={g}
                                  className="px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/30 text-[9px] font-mono text-amber-800 dark:text-amber-300"
                                >
                                  {g}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Khung sửa/dán URL trực tiếp của sổ vào localStorage */}
                          {isEditingThis ? (
                            <div className="pt-2 border-t border-[var(--line)] space-y-1.5">
                              <input
                                type="url"
                                value={nblmUrlDraft}
                                onChange={e => setNblmUrlDraft(e.target.value)}
                                placeholder="https://notebook.google.com/notebook/..."
                                className="w-full bg-[var(--panel)] border border-indigo-500/60 rounded px-2.5 py-1 text-[11px] font-mono text-[var(--chu)] focus:outline-none"
                              />
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingNblmId(null);
                                    setNblmUrlDraft('');
                                  }}
                                  className="px-2 py-1 rounded bg-[var(--giay-d)] text-[var(--chu-m)] text-[10px] font-semibold"
                                >
                                  Hủy
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveNotebookUrl(nb.id, nb.code)}
                                  className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-bold"
                                >
                                  💾 Lưu URL vào localStorage
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="pt-2 border-t border-[var(--line)] flex flex-wrap items-center justify-between gap-1.5">
                              <div className="flex items-center gap-1.5">
                                <a
                                  href={resolvedUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] transition flex items-center gap-1"
                                  title={`Mở ${nb.title} (${resolvedUrl})`}
                                >
                                  <span>📓</span>
                                  <span>Mở Sổ NotebookLM</span>
                                </a>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingNblmId(nb.id);
                                    setNblmUrlDraft(nblmUrlMap[nb.id] || DEFAULT_NOTEBOOK_LM_URL);
                                  }}
                                  className="px-2 py-1 rounded bg-[var(--panel)] hover:bg-[var(--giay-d)] text-[var(--chu-m)] border border-[var(--line-d)] text-[10px] font-mono transition"
                                  title="Dán hoặc cập nhật đường dẫn URL trực tiếp tới Sổ ghi chú NotebookLM này"
                                >
                                  🔗 Gắn Link URL
                                </button>
                              </div>

                              {nb.sampleKeywords[0] && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const q = `[${nb.code} - ${nb.shortTitle}] Đối với dự án [${activeProjectArchetype}] (${currentArchetypeMeta.name}): Hãy trích dẫn toàn văn và phân tích "${nb.sampleKeywords[0]}"`;
                                    setAiPromptInput(q);
                                    navigator.clipboard.writeText(q);
                                    showToast(`Đã nạp & copy từ khóa tra cứu sổ [${nb.code}]!`);
                                  }}
                                  className="px-2 py-1 rounded bg-[var(--panel)] hover:bg-indigo-500/10 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border border-indigo-500/30 text-[10px] font-mono transition"
                                  title="Copy nhanh câu lệnh truy vấn mẫu và nạp vào ô Prompt AI phía trên"
                                >
                                  📋 Copy Từ khóa RAG
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
    </>
  );
};
