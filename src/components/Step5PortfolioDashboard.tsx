import React, { useMemo, useState } from 'react';
import * as d3 from 'd3';
import {
  ApprovalWorkflowItem,
  EmployeeUser,
  GateCrossLockEvaluation,
  GateWorkflowStatus,
  ProjectArchetypeCode,
  ProjectArchetypeItem,
  QaQcGateControlItem,
  RaciTaskItem,
  RbacRoleCode,
  StageGateItem,
} from '../types/lexPmoTypes';
import { getRaciActionPermissions } from '../utils/rbacRaciHelpers';

interface Step5PortfolioDashboardProps {
  projectTypes: ProjectArchetypeItem[];
  projectIcons: Record<ProjectArchetypeCode, string>;
  activeProjectArchetype: ProjectArchetypeCode;
  currentActorRole: RbacRoleCode;
  gates: StageGateItem[];
  projectGateStatusMap: Record<ProjectArchetypeCode, Record<string, GateWorkflowStatus>>;
  approvalWorkflows: ApprovalWorkflowItem[];
  employees: EmployeeUser[];
  raciTasks: RaciTaskItem[];
  qaqcControlRecords: QaQcGateControlItem[];
  chronoErrorsCount: number;
  evaluateGateCrossLock: (
    projectCode: ProjectArchetypeCode,
    gateItem: StageGateItem
  ) => GateCrossLockEvaluation;
  onSwitchProjectAndOpenGate: (projectCode: ProjectArchetypeCode, gateCode?: string) => void;
  onApproveWorkflow: (wf: ApprovalWorkflowItem, nextStatus: ApprovalWorkflowItem['status']) => void;
  onInspectInD3Flow: (wfId: string) => void;
  onOpenChronoAudit: () => void;
}

interface PieSliceDatum {
  key: 'APPROVED' | 'IN_REVIEW' | 'HARD_STOP_BLOCKED' | 'DRAFT';
  label: string;
  shortLabel: string;
  count: number;
  pct: number;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
}

const REFERENCE_TODAY_STR = '2026-11-17';

const calcDaysUntilRef = (expiryStr: string): number => {
  const ref = new Date(`${REFERENCE_TODAY_STR}T00:00:00`).getTime();
  const target = new Date(`${expiryStr}T00:00:00`).getTime();
  if (Number.isNaN(target)) return 365;
  return Math.round((target - ref) / (1000 * 60 * 60 * 24));
};

const formatTyVnd = (vnd: number): string => {
  const ty = vnd / 1_000_000_000;
  if (Math.abs(ty) >= 100) {
    return `${ty.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tỷ`;
  }
  return `${ty.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} tỷ`;
};

const formatMillionVnd = (vnd: number): string => {
  const tr = vnd / 1_000_000;
  return `${tr.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} triệu`;
};

export const Step5PortfolioDashboard: React.FC<Step5PortfolioDashboardProps> = ({
  projectTypes,
  projectIcons,
  activeProjectArchetype,
  currentActorRole,
  gates,
  projectGateStatusMap,
  approvalWorkflows,
  employees,
  raciTasks,
  qaqcControlRecords,
  chronoErrorsCount,
  evaluateGateCrossLock,
  onSwitchProjectAndOpenGate,
  onApproveWorkflow,
  onInspectInD3Flow,
  onOpenChronoAudit,
}) => {
  const raciPerms = useMemo(() => getRaciActionPermissions(currentActorRole), [currentActorRole]);
  const [pieScope, setPieScope] = useState<'ALL' | ProjectArchetypeCode>('ALL');
  const [hoveredSliceKey, setHoveredSliceKey] = useState<PieSliceDatum['key'] | null>(null);
  const [bottleneckFilter, setBottleneckFilter] = useState<'ALL' | 'WORKFLOWS' | 'GATES'>('ALL');
  const [bottleneckSortMode, setBottleneckSortMode] = useState<
    'FINANCIAL_DESC' | 'PENALTY_DESC' | 'SEVERITY_DESC'
  >('FINANCIAL_DESC');
  const [bottleneckSearch, setBottleneckSearch] = useState('');

  // Tổng hợp tiến độ Stage-Gate, Tài chính, Bảo lãnh & Điểm sẵn sàng Kiểm toán (Audit-Readiness Score %) cho từng dự án
  const projectSummaries = useMemo(() => {
    const totalGatesPerProject = gates.length || 1;
    return projectTypes.map(pt => {
      const statusMap = projectGateStatusMap[pt.code] || {};
      let approved = 0;
      let inReview = 0;
      let blocked = 0;
      let draft = 0;

      const gateDetails = gates.map(g => {
        const crossEval = evaluateGateCrossLock(pt.code, g);
        const baseSt: GateWorkflowStatus = statusMap[g.gate] || g.status || 'DRAFT';
        const st: GateWorkflowStatus =
          crossEval.isPaymentGate && crossEval.isHardStopLocked && baseSt !== 'APPROVED'
            ? 'HARD_STOP_BLOCKED'
            : crossEval.isBondApplicable && crossEval.minBondDaysLeft < 15 && crossEval.isHardStopLocked
            ? 'HARD_STOP_BLOCKED'
            : baseSt;

        if (st === 'APPROVED') approved += 1;
        else if (st === 'IN_REVIEW') inReview += 1;
        else if (st === 'HARD_STOP_BLOCKED') blocked += 1;
        else draft += 1;

        return {
          ...g,
          resolvedStatus: st,
          crossEval,
        };
      });

      const strictPct = Math.round((approved / totalGatesPerProject) * 100);
      const weightedPct = Math.min(
        100,
        Math.round(((approved * 1 + inReview * 0.5 + blocked * 0.2) / totalGatesPerProject) * 100)
      );

      const bottleneckGate =
        gateDetails.find(g => g.resolvedStatus === 'HARD_STOP_BLOCKED') ||
        gateDetails.find(g => g.resolvedStatus === 'IN_REVIEW') ||
        null;

      // Tính Blocked Capex động dựa trên base + cổng bị khóa
      const dynamicGateBlocked = gateDetails.reduce(
        (sum, g) => sum + (g.resolvedStatus === 'HARD_STOP_BLOCKED' ? g.crossEval.blockedCapexVnd : 0),
        0
      );
      const effectiveBlockedCapexVnd =
        dynamicGateBlocked > 0
          ? Math.round((pt.blockedCapexVnd + dynamicGateBlocked) / 2)
          : blocked === 0
          ? Math.max(0, Math.round(pt.blockedCapexVnd * 0.15))
          : pt.blockedCapexVnd;

      const perfDaysLeft = calcDaysUntilRef(pt.performanceBondExpiry);
      const advDaysLeft = calcDaysUntilRef(pt.advanceBondExpiry);
      const minBondDaysLeft = Math.min(perfDaysLeft, advDaysLeft);

      // Tính Điểm sẵn sàng Kiểm toán (Audit-Readiness Score %) theo 4 trụ cột
      const scopedQaQc = qaqcControlRecords.filter(q => q.projectAxes.includes(pt.code));
      const closedQaQcCount = scopedQaQc.filter(q => q.status === 'CLOSED_VERIFIED').length;
      const qaQcReadyPct =
        scopedQaQc.length > 0 ? Math.round((closedQaQcCount / scopedQaQc.length) * 100) : 100;

      const scopedPendingWf = approvalWorkflows.filter(
        w => w.projectCode === pt.code && w.status !== 'CDT_APPROVED'
      ).length;

      const bondFactor = minBondDaysLeft >= 15 ? 100 : minBondDaysLeft >= 0 ? 45 : 15;
      const chronoPenalty = chronoErrorsCount > 0 ? Math.min(12, chronoErrorsCount * 4) : 0;
      const wfPenalty = scopedPendingWf * 5;
      const rawReadiness =
        weightedPct * 0.45 + qaQcReadyPct * 0.3 + bondFactor * 0.25 - chronoPenalty - wfPenalty;
      const auditReadinessScore = Math.max(18, Math.min(99, Math.round(rawReadiness)));

      return {
        ...pt,
        totalGates: totalGatesPerProject,
        approved,
        inReview,
        blocked,
        draft,
        strictPct,
        weightedPct,
        bottleneckGate,
        gateDetails,
        effectiveBlockedCapexVnd,
        perfDaysLeft,
        advDaysLeft,
        minBondDaysLeft,
        auditReadinessScore,
      };
    });
  }, [
    projectTypes,
    gates,
    projectGateStatusMap,
    evaluateGateCrossLock,
    qaqcControlRecords,
    approvalWorkflows,
    chronoErrorsCount,
  ]);

  // Tổng hợp toàn danh mục (Portfolio Totals)
  const portfolioTotals = useMemo(() => {
    return projectSummaries.reduce(
      (acc, p) => {
        acc.totalGates += p.totalGates;
        acc.approved += p.approved;
        acc.inReview += p.inReview;
        acc.blocked += p.blocked;
        acc.draft += p.draft;
        acc.totalInvestmentVnd += p.totalInvestmentVnd;
        acc.acceptedValueVnd += p.acceptedValueVnd;
        acc.disbursedValueVnd += p.disbursedValueVnd;
        acc.blockedCapexVnd += p.effectiveBlockedCapexVnd;
        acc.auditReadinessSum += p.auditReadinessScore;
        return acc;
      },
      {
        totalGates: 0,
        approved: 0,
        inReview: 0,
        blocked: 0,
        draft: 0,
        totalInvestmentVnd: 0,
        acceptedValueVnd: 0,
        disbursedValueVnd: 0,
        blockedCapexVnd: 0,
        auditReadinessSum: 0,
      }
    );
  }, [projectSummaries]);

  const portfolioStrictPct =
    portfolioTotals.totalGates > 0
      ? Math.round((portfolioTotals.approved / portfolioTotals.totalGates) * 100)
      : 0;
  const avgAuditReadinessPct =
    projectSummaries.length > 0
      ? Math.round(portfolioTotals.auditReadinessSum / projectSummaries.length)
      : 0;

  // Dữ liệu cho Biểu đồ tròn (Pie/Donut Chart)
  const pieCounts = useMemo(() => {
    if (pieScope === 'ALL') {
      return portfolioTotals;
    }
    const found = projectSummaries.find(p => p.code === pieScope);
    if (!found) return portfolioTotals;
    return {
      totalGates: found.totalGates,
      approved: found.approved,
      inReview: found.inReview,
      blocked: found.blocked,
      draft: found.draft,
    };
  }, [pieScope, portfolioTotals, projectSummaries]);

  const pieSlices: PieSliceDatum[] = useMemo(() => {
    const denom = pieCounts.totalGates || 1;
    const raw: Array<Omit<PieSliceDatum, 'pct'>> = [
      {
        key: 'APPROVED',
        label: 'Đã duyệt qua cổng (APPROVED)',
        shortLabel: 'Đã duyệt',
        count: pieCounts.approved,
        color: '#10b981',
        bgClass: 'bg-emerald-500/15',
        textClass: 'text-emerald-800 dark:text-emerald-400',
        borderClass: 'border-emerald-500/40',
      },
      {
        key: 'IN_REVIEW',
        label: 'Đang trình thẩm định (IN_REVIEW)',
        shortLabel: 'Đang thẩm định',
        count: pieCounts.inReview,
        color: '#0ea5e9',
        bgClass: 'bg-sky-500/15',
        textClass: 'text-sky-800 dark:text-sky-400',
        borderClass: 'border-sky-500/40',
      },
      {
        key: 'HARD_STOP_BLOCKED',
        label: 'Chặn Hard-Stop (BLOCKED)',
        shortLabel: 'Chặn Hard-Stop',
        count: pieCounts.blocked,
        color: '#f43f5e',
        bgClass: 'bg-rose-500/15',
        textClass: 'text-rose-800 dark:text-rose-400',
        borderClass: 'border-rose-500/40',
      },
      {
        key: 'DRAFT',
        label: 'Bản thảo / Chưa mở cổng (DRAFT)',
        shortLabel: 'Chưa mở / Bản thảo',
        count: pieCounts.draft,
        color: '#64748b',
        bgClass: 'bg-[var(--giay-d)]',
        textClass: 'text-[var(--chu-m)]',
        borderClass: 'border-[var(--line-d)]',
      },
    ];
    return raw.map(item => ({
      ...item,
      pct: Math.round((item.count / denom) * 1000) / 10,
    }));
  }, [pieCounts]);

  const pieArcs = useMemo(() => {
    const nonZeroSlices = pieSlices.filter(s => s.count > 0);
    const pieGen = d3
      .pie<PieSliceDatum>()
      .value(d => d.count)
      .sort(null)
      .padAngle(0.025);

    const arcGen = d3
      .arc<d3.PieArcDatum<PieSliceDatum>>()
      .innerRadius(64)
      .outerRadius(98)
      .cornerRadius(4);

    const arcHoverGen = d3
      .arc<d3.PieArcDatum<PieSliceDatum>>()
      .innerRadius(62)
      .outerRadius(104)
      .cornerRadius(4);

    return pieGen(nonZeroSlices).map(arcDatum => ({
      datum: arcDatum.data,
      path: arcGen(arcDatum) || '',
      hoverPath: arcHoverGen(arcDatum) || '',
      centroid: arcGen.centroid(arcDatum),
    }));
  }, [pieSlices]);

  const pieScopeCompletionPct =
    pieCounts.totalGates > 0 ? Math.round((pieCounts.approved / pieCounts.totalGates) * 100) : 0;

  // Thanh tiến độ chi tiết theo 3 Giai đoạn
  const phaseBreakdownForScope = useMemo(() => {
    const phaseOrder = [
      { id: 'Giai đoạn I: Chuẩn bị đầu tư', short: 'GĐ I · Chuẩn bị ĐT' },
      { id: 'Giai đoạn II: Thực hiện dự án', short: 'GĐ II · Thực hiện' },
      { id: 'Giai đoạn III: Kết thúc & Đưa vào khai thác', short: 'GĐ III · Kết thúc' },
    ];
    const targetProjects =
      pieScope === 'ALL'
        ? projectSummaries
        : projectSummaries.filter(p => p.code === pieScope);

    return phaseOrder.map(ph => {
      let total = 0;
      let approved = 0;
      let blocked = 0;
      let inReview = 0;
      targetProjects.forEach(p => {
        p.gateDetails
          .filter(g => g.phase === ph.id)
          .forEach(g => {
            total += 1;
            if (g.resolvedStatus === 'APPROVED') approved += 1;
            else if (g.resolvedStatus === 'HARD_STOP_BLOCKED') blocked += 1;
            else if (g.resolvedStatus === 'IN_REVIEW') inReview += 1;
          });
      });
      const pct = total > 0 ? Math.round((approved / total) * 100) : 0;
      return { ...ph, total, approved, blocked, inReview, pct };
    });
  }, [pieScope, projectSummaries]);

  // Danh sách Hồ sơ Điểm nghẽn (Bottlenecks) đang chờ phê duyệt kèm Giá trị tài chính & Thiệt hại lãi vay / SLA
  const pendingBottleneckWorkflows = useMemo(() => {
    const q = bottleneckSearch.trim().toLowerCase();
    return approvalWorkflows
      .filter(wf => wf.status !== 'CDT_APPROVED')
      .map(wf => {
        const impactVnd = wf.financialImpactVnd ?? 50_000_000_000;
        const slaLimit = wf.slaHours || 48;
        const elapsed = wf.elapsedHours || 24;
        const overHours = Math.max(0, elapsed - slaLimit);
        const overdueDays = Math.max(1, Math.ceil(overHours / 24));
        const dailyPenaltyVnd =
          wf.dailyInterestPenaltyVnd && wf.dailyInterestPenaltyVnd > 0
            ? wf.dailyInterestPenaltyVnd
            : Math.round(impactVnd * 0.00028); // ~10.2%/năm lãi vay & chi phí cơ hội vốn
        const estimatedAccruedLossVnd =
          overHours > 0 ? dailyPenaltyVnd * overdueDays : Math.round(dailyPenaltyVnd * 0.5);

        return {
          wf,
          impactVnd,
          dailyPenaltyVnd,
          estimatedAccruedLossVnd,
          overHours,
          overdueDays,
        };
      })
      .filter(({ wf }) => {
        if (!q) return true;
        return (
          wf.docCode.toLowerCase().includes(q) ||
          wf.title.toLowerCase().includes(q) ||
          wf.gateRef.toLowerCase().includes(q) ||
          wf.domain.toLowerCase().includes(q) ||
          (wf.projectCode || '').toLowerCase().includes(q) ||
          (wf.bottleneckReason || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (bottleneckSortMode === 'FINANCIAL_DESC') {
          return b.impactVnd - a.impactVnd;
        }
        if (bottleneckSortMode === 'PENALTY_DESC') {
          return b.estimatedAccruedLossVnd - a.estimatedAccruedLossVnd;
        }
        const rank = (w: ApprovalWorkflowItem) => {
          if (w.status === 'REJECTED_HOLD') return 0;
          if ((w.elapsedHours || 0) > (w.slaHours || 48)) return 1;
          if (w.status === 'PENDING_REVIEW') return 2;
          return 3;
        };
        const rDiff = rank(a.wf) - rank(b.wf);
        if (rDiff !== 0) return rDiff;
        return b.impactVnd - a.impactVnd;
      });
  }, [approvalWorkflows, bottleneckSearch, bottleneckSortMode]);

  // Danh sách Cổng Stage-Gate đang bị Chặn hoặc Chờ duyệt trên tất cả các dự án
  const gateBottlenecksAcrossProjects = useMemo(() => {
    const q = bottleneckSearch.trim().toLowerCase();
    const list: Array<{
      projectCode: ProjectArchetypeCode;
      projectName: string;
      authority: string;
      gateCode: string;
      gateName: string;
      phase: string;
      status: GateWorkflowStatus;
      riskFlag: string;
      impactVnd: number;
      dailyPenaltyVnd: number;
      lockReasonCount: number;
    }> = [];

    projectSummaries.forEach(proj => {
      proj.gateDetails.forEach(g => {
        if (g.resolvedStatus === 'HARD_STOP_BLOCKED' || g.resolvedStatus === 'IN_REVIEW') {
          const impactVnd = g.crossEval.blockedCapexVnd || g.crossEval.pendingPayableVnd || 35_000_000_000;
          const dailyPenaltyVnd = Math.round(impactVnd * 0.00028);
          const item = {
            projectCode: proj.code,
            projectName: proj.name,
            authority: proj.authority,
            gateCode: g.gate,
            gateName: g.name,
            phase: g.phase,
            status: g.resolvedStatus,
            riskFlag:
              g.crossEval.lockReasons[0]?.label ||
              g.steps[0]?.riskFlag ||
              '',
            impactVnd,
            dailyPenaltyVnd,
            lockReasonCount: g.crossEval.lockReasons.length,
          };
          if (
            !q ||
            item.projectCode.toLowerCase().includes(q) ||
            item.projectName.toLowerCase().includes(q) ||
            item.gateCode.toLowerCase().includes(q) ||
            item.gateName.toLowerCase().includes(q)
          ) {
            list.push(item);
          }
        }
      });
    });

    return list.sort((a, b) => {
      if (bottleneckSortMode === 'FINANCIAL_DESC' || bottleneckSortMode === 'PENALTY_DESC') {
        return b.impactVnd - a.impactVnd;
      }
      if (a.status === b.status) return b.impactVnd - a.impactVnd;
      return a.status === 'HARD_STOP_BLOCKED' ? -1 : 1;
    });
  }, [projectSummaries, bottleneckSearch, bottleneckSortMode]);

  const totalPendingWfImpactVnd = pendingBottleneckWorkflows.reduce(
    (sum, item) => sum + item.impactVnd,
    0
  );
  const totalEstimatedPenaltyLossVnd = pendingBottleneckWorkflows.reduce(
    (sum, item) => sum + item.estimatedAccruedLossVnd,
    0
  );
  const overdueWorkflowCount = pendingBottleneckWorkflows.filter(i => i.overHours > 0).length;
  const rejectedHoldCount = pendingBottleneckWorkflows.filter(
    i => i.wf.status === 'REJECTED_HOLD'
  ).length;
  const reviewHoldTasksCount = raciTasks.filter(t => t.status === 'REVIEW_HOLD').length;

  const activeHoveredSlice = hoveredSliceKey
    ? pieSlices.find(s => s.key === hoveredSliceKey) || null
    : null;

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[var(--giay)]">
      {/* Executive Header Banner */}
      <div className="bg-[var(--panel)] border border-sky-500/35 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-mono text-[11px] font-extrabold">
              🏛️ TRUNG TÂM CHỈ HUY BAN GIÁM ĐỐC · 3-WAY GATE LOCKING
            </span>
            <span className="text-xs font-mono text-emerald-800 dark:text-emerald-400">
              Khóa chéo 3 Trục: Pháp lý – QA/QC – Dòng tiền Thanh toán (IPC)
            </span>
          </div>
          <h2 className="text-base md:text-lg font-extrabold text-[var(--chu)]">
            Tổng hợp Danh mục Dự án, Giải ngân Bị treo (Blocked Capex) & Điểm sẵn sàng Kiểm toán
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {chronoErrorsCount > 0 && (
            <button
              type="button"
              onClick={onOpenChronoAudit}
              className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/60 text-rose-900 dark:text-rose-200 text-xs font-bold flex items-center gap-1.5 transition animate-pulse"
            >
              <span>⚠</span>
              <span>{chronoErrorsCount} lỗi thời gian RF-05 (Mở 5A xử lý →)</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onSwitchProjectAndOpenGate(activeProjectArchetype)}
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition"
          >
            Mở Stage-Gate Dự án {activeProjectArchetype} →
          </button>
        </div>
      </div>

      {/* 4 KPI Cards — Executive Command Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-[var(--panel)] border border-rose-500/50 space-y-1 shadow-sm">
          <div className="text-[11px] font-mono text-rose-800 dark:text-rose-400 uppercase font-bold">
            1. Tổng giá trị giải ngân bị treo (Blocked Capex)
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-extrabold text-rose-800 dark:text-rose-400 tabular-nums">
              {formatTyVnd(portfolioTotals.blockedCapexVnd)} VNĐ
            </span>
            <span className="text-xs font-mono text-amber-800 dark:text-amber-300">
              {portfolioTotals.blocked} Cổng Hard-Stop
            </span>
          </div>
          <div className="text-[11px] text-[var(--chu-m)]">
            Trên tổng MĐT <b className="text-[var(--chu)]">{formatTyVnd(portfolioTotals.totalInvestmentVnd)}</b> · Đã giải ngân{' '}
            <b className="text-emerald-800 dark:text-emerald-400">{formatTyVnd(portfolioTotals.disbursedValueVnd)}</b>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[var(--panel)] border border-emerald-500/40 space-y-1 shadow-sm">
          <div className="text-[11px] font-mono text-emerald-800 dark:text-emerald-400 uppercase font-bold">
            2. Điểm sẵn sàng Kiểm toán (Audit-Readiness)
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-extrabold text-emerald-800 dark:text-emerald-400 tabular-nums">
              {avgAuditReadinessPct}%
            </span>
            <span className="text-xs font-mono text-sky-800 dark:text-sky-300 tabular-nums">
              Stage-Gate: {portfolioStrictPct}% ({portfolioTotals.approved}/{portfolioTotals.totalGates})
            </span>
          </div>
          <div className="text-[11px] text-[var(--chu-m)]">
            Đang điều hành <b className="text-amber-800 dark:text-amber-300">{projectSummaries.length} dự án</b> ·{' '}
            {reviewHoldTasksCount} Task RACI chờ duyệt
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[var(--panel)] border border-amber-500/40 space-y-1 shadow-sm">
          <div className="text-[11px] font-mono text-amber-800 dark:text-amber-400 uppercase font-bold">
            3. Điểm nghẽn Hồ sơ & Rủi ro Tài chính
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-extrabold text-amber-800 dark:text-amber-400 tabular-nums">
              {pendingBottleneckWorkflows.length} Hồ sơ
            </span>
            <span className="text-xs font-mono text-rose-800 dark:text-rose-300 font-bold">
              {formatTyVnd(totalPendingWfImpactVnd)} VNĐ
            </span>
          </div>
          <div className="text-[11px] text-[var(--chu-m)]">
            <b className="text-rose-800 dark:text-rose-300">{rejectedHoldCount} Hard-Stop</b> ·{' '}
            <b className="text-amber-800 dark:text-amber-300">{overdueWorkflowCount} quá hạn SLA</b>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[var(--panel)] border border-sky-500/35 space-y-1 shadow-sm">
          <div className="text-[11px] font-mono text-sky-800 dark:text-sky-400 uppercase font-bold">
            4. Thiệt hại lãi vay / Phạt chậm SLA ước tính
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-extrabold text-sky-800 dark:text-sky-300 tabular-nums">
              {formatMillionVnd(totalEstimatedPenaltyLossVnd)}
            </span>
            <span className="text-xs font-mono text-rose-800 dark:text-rose-400 font-bold">Lũy kế tắc nghẽn</span>
          </div>
          <div className="text-[11px] text-[var(--chu-m)]">
            Tạm tính theo chi phí vốn & chậm giải ngân IPC trên {pendingBottleneckWorkflows.length} hồ sơ treo
          </div>
        </div>
      </div>

      {/* Hàng giữa: Biểu đồ Tròn Stage-Gate (4 cols) + Bảng Tổng hợp Tài chính & Kiểm toán Dự án (8 cols) */}
      <div className="grid grid-cols-12 gap-5">
        {/* CỘT TRÁI: BIỂU ĐỒ TRÒN TỶ LỆ HOÀN THÀNH STAGE-GATE */}
        <div className="col-span-12 xl:col-span-4 bg-[var(--panel)] border border-[var(--line)] rounded-2xl p-4 flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-[var(--chu)] flex items-center gap-1.5">
                  <span>🥧</span>
                  <span>Biểu đồ Tròn Tỷ lệ Hoàn thành Stage-Gate</span>
                </h3>
                <p className="text-[11px] text-[var(--chu-m)]">
                  Cơ cấu cổng kiểm soát (Đạt · Thẩm định · Khóa 3-Way · Bản thảo)
                </p>
              </div>
              <select
                value={pieScope}
                onChange={e => setPieScope(e.target.value as 'ALL' | ProjectArchetypeCode)}
                className="bg-[var(--giay)] border border-[var(--line-d)] rounded-lg px-2.5 py-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300 focus:outline-none focus:border-sky-500 w-full sm:w-auto"
              >
                <option value="ALL">Toàn bộ 6 Dự án ({portfolioTotals.totalGates} cổng)</option>
                {projectSummaries.map(p => (
                  <option key={p.code} value={p.code}>
                    {projectIcons[p.code]} {p.code} ({p.approved}/{p.totalGates} · {p.strictPct}%)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SVG Donut Chart */}
          <div className="flex flex-col sm:flex-row xl:flex-col 2xl:flex-row items-center justify-center gap-4 py-1">
            <div className="relative shrink-0">
              <svg
                width={210}
                height={210}
                viewBox="-110 -110 220 220"
                className="overflow-visible select-none"
              >
                {pieArcs.map(arc => {
                  const isHovered = hoveredSliceKey === arc.datum.key;
                  return (
                    <path
                      key={arc.datum.key}
                      d={isHovered ? arc.hoverPath : arc.path}
                      fill={arc.datum.color}
                      stroke="var(--panel)"
                      strokeWidth={2}
                      className="cursor-pointer transition-all duration-150"
                      style={{
                        filter: isHovered
                          ? `drop-shadow(0 0 10px ${arc.datum.color}88)`
                          : undefined,
                      }}
                      onMouseEnter={() => setHoveredSliceKey(arc.datum.key)}
                      onMouseLeave={() => setHoveredSliceKey(null)}
                    />
                  );
                })}

                <text
                  textAnchor="middle"
                  dy="-6"
                  className="fill-[var(--navy-ink)] font-extrabold text-3xl font-mono tabular-nums"
                >
                  {activeHoveredSlice ? `${activeHoveredSlice.pct}%` : `${pieScopeCompletionPct}%`}
                </text>
                <text
                  textAnchor="middle"
                  dy="14"
                  className="fill-[var(--chu-m)] text-[10px] font-mono uppercase"
                >
                  {activeHoveredSlice ? activeHoveredSlice.shortLabel : 'Đã duyệt Gate'}
                </text>
                <text
                  textAnchor="middle"
                  dy="30"
                  className="fill-amber-700 dark:fill-amber-300 text-[11px] font-mono font-bold"
                >
                  {activeHoveredSlice
                    ? `${activeHoveredSlice.count}/${pieCounts.totalGates} cổng`
                    : `${pieCounts.approved}/${pieCounts.totalGates} cổng`}
                </text>
              </svg>
            </div>

            {/* Chú giải 4 trạng thái */}
            <div className="flex-1 w-full space-y-1.5">
              {pieSlices.map(sl => {
                const isHovered = hoveredSliceKey === sl.key;
                return (
                  <div
                    key={sl.key}
                    onMouseEnter={() => setHoveredSliceKey(sl.key)}
                    onMouseLeave={() => setHoveredSliceKey(null)}
                    className={`p-2 rounded-lg border transition cursor-pointer flex items-center justify-between gap-2 ${
                      isHovered
                        ? `${sl.bgClass} ${sl.borderClass} ring-1 ring-white/20`
                        : 'bg-[var(--giay)] border-[var(--line)] hover:border-[var(--line-d)]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-3 h-3 rounded-sm shrink-0"
                        style={{ backgroundColor: sl.color }}
                      />
                      <span className="text-xs font-medium text-[var(--chu)] truncate">
                        {sl.shortLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-xs shrink-0 tabular-nums">
                      <span className={`font-bold ${sl.textClass}`}>{sl.count}</span>
                      <span className="text-[var(--chu-m)] w-11 text-right">{sl.pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Thanh tiến độ chi tiết theo 3 Giai đoạn */}
          <div className="pt-3 border-t border-[var(--line)] space-y-2">
            <div className="text-[11px] font-mono font-bold text-[var(--chu-m)] uppercase">
              Phân rã theo 3 Giai đoạn ({pieScope === 'ALL' ? 'Toàn danh mục' : pieScope}):
            </div>
            <div className="grid grid-cols-3 gap-2">
              {phaseBreakdownForScope.map(ph => (
                <div
                  key={ph.id}
                  className="p-2 rounded-lg bg-[var(--giay)] border border-[var(--line)] space-y-1"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-[var(--chu-m)] font-bold truncate">{ph.short}</span>
                    <span className="text-emerald-800 dark:text-emerald-400 font-bold">{ph.pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--giay-d)] overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${ph.pct}%` }}
                    />
                  </div>
                  <div className="text-[10px] font-mono text-[var(--chu-nhat)]">
                    {ph.approved}/{ph.total} đạt · {ph.blocked} chặn
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: BẢNG TỔNG HỢP TIẾN ĐỘ, TÀI CHÍNH, BẢO LÃNH & AUDIT-READINESS TẤT CẢ DỰ ÁN */}
        <div className="col-span-12 xl:col-span-8 bg-[var(--panel)] border border-[var(--line)] rounded-2xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 bg-[var(--giay)] border-b border-[var(--line)] flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-extrabold text-[var(--chu)] flex items-center gap-1.5">
                <span>🏗️</span>
                <span>
                  Tổng hợp Tài chính IPC, Bảo lãnh & Audit-Readiness Toàn bộ Dự án ({projectSummaries.length})
                </span>
              </h3>
              <p className="text-[11px] text-[var(--chu-m)]">
                Nhấn vào dòng dự án để xem biểu đồ tròn riêng hoặc mở Stage-Gate để xử lý khóa giải ngân IPC
              </p>
            </div>
            {pieScope !== 'ALL' && (
              <button
                type="button"
                onClick={() => setPieScope('ALL')}
                className="px-2.5 py-1 rounded bg-[var(--giay-d)] hover:bg-[var(--giay-d)] text-sky-800 dark:text-sky-300 text-[11px] font-mono font-semibold border border-[var(--line-d)]"
              >
                ↺ Xem tổng hợp 6 dự án
              </button>
            )}
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-[var(--giay)] border-b border-[var(--line)] text-[var(--chu-m)] font-mono text-[10px] uppercase">
                  <th className="px-2 py-2">Dự án · Thẩm quyền</th>
                  <th className="px-2 py-2">Tổng MĐT · Giải ngân</th>
                  <th className="px-2 py-2">Blocked Capex</th>
                  <th className="px-2 py-2">Bảo lãnh THHĐ / TƯ</th>
                  <th className="px-2 py-2 w-[96px]">Stage-Gate</th>
                  <th className="px-2 py-2 text-center">Audit</th>
                  <th className="px-2 py-2 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {projectSummaries.map(proj => {
                  const isActiveProject = proj.code === activeProjectArchetype;
                  const isPieFocused = pieScope === proj.code;
                  const approvedW = (proj.approved / proj.totalGates) * 100;
                  const reviewW = (proj.inReview / proj.totalGates) * 100;
                  const blockedW = (proj.blocked / proj.totalGates) * 100;
                  const disbursementPct = Math.round(
                    (proj.disbursedValueVnd / (proj.totalInvestmentVnd || 1)) * 100
                  );

                  return (
                    <tr
                      key={proj.code}
                      onClick={() =>
                        setPieScope(prev => (prev === proj.code ? 'ALL' : proj.code))
                      }
                      className={`cursor-pointer transition ${
                        isPieFocused
                          ? 'bg-sky-500/15'
                          : isActiveProject
                          ? 'bg-amber-500/5 hover:bg-[var(--giay-d)]'
                          : 'hover:bg-[var(--giay-d)]'
                      }`}
                    >
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-sm">{projectIcons[proj.code]}</span>
                          <span className="font-mono font-extrabold text-[var(--chu)]">
                            {proj.code}
                          </span>
                          {isActiveProject && (
                            <span className="px-1 py-0.2 rounded bg-amber-500 text-slate-950 font-mono text-[9px] font-extrabold">
                              CHỌN
                            </span>
                          )}
                        </div>
                        <div className="text-[var(--chu)] font-medium leading-snug mt-0.5 line-clamp-1 max-w-[135px]">
                          {proj.name}
                        </div>
                        <div className="text-[10px] font-mono text-[var(--chu-m)] truncate max-w-[135px]">
                          {proj.authority}
                        </div>
                      </td>

                      <td className="px-2 py-2 font-mono tabular-nums">
                        <div className="font-bold text-[var(--chu)]">
                          TMĐT: {formatTyVnd(proj.totalInvestmentVnd)}
                        </div>
                        <div className="text-[10.5px] text-emerald-800 dark:text-emerald-400">
                          Đã GN: {formatTyVnd(proj.disbursedValueVnd)} ({disbursementPct}%)
                        </div>
                        <div className="text-[10px] text-[var(--chu-m)]">
                          NT: {formatTyVnd(proj.acceptedValueVnd)}
                        </div>
                      </td>

                      <td className="px-2 py-2 font-mono tabular-nums">
                        <div
                          className={`font-extrabold text-[11px] ${
                            proj.effectiveBlockedCapexVnd > 100_000_000_000
                              ? 'text-rose-800 dark:text-rose-400'
                              : proj.effectiveBlockedCapexVnd > 0
                              ? 'text-amber-800 dark:text-amber-300'
                              : 'text-emerald-800 dark:text-emerald-400'
                          }`}
                        >
                          {formatTyVnd(proj.effectiveBlockedCapexVnd)} VNĐ
                        </div>
                        {proj.bottleneckGate && (
                          <div className="text-[10px] text-rose-800 dark:text-rose-300 mt-0.5">
                            Nghẽn {proj.bottleneckGate.gate}
                          </div>
                        )}
                      </td>

                      <td className="px-2 py-2 font-mono text-[10px]">
                        <div
                          className={
                            proj.perfDaysLeft < 0
                              ? 'text-rose-800 dark:text-rose-400 font-bold'
                              : proj.perfDaysLeft < 15
                              ? 'text-amber-800 dark:text-amber-300 font-bold'
                              : 'text-emerald-800 dark:text-emerald-300'
                          }
                        >
                          THHĐ: {proj.performanceBondExpiry} (
                          {proj.perfDaysLeft < 0
                            ? `Hết ${Math.abs(proj.perfDaysLeft)}n`
                            : `${proj.perfDaysLeft}n`}
                          )
                        </div>
                        <div
                          className={
                            proj.advDaysLeft < 0
                              ? 'text-rose-800 dark:text-rose-400 font-bold'
                              : proj.advDaysLeft < 15
                              ? 'text-amber-800 dark:text-amber-300 font-bold'
                              : 'text-[var(--chu-m)]'
                          }
                        >
                          TƯ: {proj.advanceBondExpiry} (
                          {proj.advDaysLeft < 0
                            ? `Hết ${Math.abs(proj.advDaysLeft)}n`
                            : `${proj.advDaysLeft}n`}
                          )
                        </div>
                      </td>

                      <td className="px-2 py-2">
                        <div className="flex items-center justify-between font-mono text-[10.5px] mb-1 tabular-nums">
                          <span className="font-bold text-emerald-800 dark:text-emerald-400">{proj.strictPct}%</span>
                          <span className="text-[var(--chu-m)]">
                            {proj.approved}/{proj.totalGates}
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-[var(--giay-d)] overflow-hidden flex">
                          {approvedW > 0 && (
                            <div className="bg-emerald-500 h-full" style={{ width: `${approvedW}%` }} />
                          )}
                          {reviewW > 0 && (
                            <div className="bg-sky-500 h-full" style={{ width: `${reviewW}%` }} />
                          )}
                          {blockedW > 0 && (
                            <div className="bg-rose-500 h-full" style={{ width: `${blockedW}%` }} />
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-[var(--chu-m)] mt-1">
                          ⛔{proj.blocked} · ⏳{proj.inReview}
                        </div>
                      </td>

                      <td className="px-2 py-2 text-center whitespace-nowrap">
                        <div
                          className={`inline-flex flex-col items-center px-1.5 py-1 rounded-lg border font-mono ${
                            proj.auditReadinessScore >= 80
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
                              : proj.auditReadinessScore >= 60
                              ? 'bg-amber-500/15 border-amber-500/40 text-amber-800 dark:text-amber-300'
                              : 'bg-rose-500/15 border-rose-500/50 text-rose-800 dark:text-rose-300'
                          }`}
                        >
                          <span className="text-xs font-extrabold tabular-nums">
                            {proj.auditReadinessScore}%
                          </span>
                          <span className="text-[8.5px] uppercase">
                            {proj.auditReadinessScore >= 80
                              ? 'Sẵn sàng'
                              : proj.auditReadinessScore >= 60
                              ? 'Bổ sung'
                              : 'Rủi ro'}
                          </span>
                        </div>
                      </td>

                      <td className="px-2 py-2 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            onSwitchProjectAndOpenGate(
                              proj.code,
                              proj.bottleneckGate?.gate || 'G12'
                            );
                          }}
                          className="px-2 py-1 rounded bg-[var(--giay-d)] hover:bg-amber-500 text-[var(--chu)] hover:text-slate-950 font-bold text-[10.5px] border border-[var(--line-d)] hover:border-amber-400 transition whitespace-nowrap"
                        >
                          Mở Gate →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* PHẦN DƯỚI: BẢNG DANH SÁCH ĐIỂM NGHẼN (BOTTLENECK) ĐANG CHỜ PHÊ DUYỆT — SẮP XẾP THEO RỦI RO TÀI CHÍNH */}
      <div className="bg-[var(--panel)] border border-rose-500/35 rounded-2xl overflow-hidden shadow-lg">
        <div className="px-4 py-3 bg-[var(--giay)] border-b border-[var(--line)] flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h3 className="text-sm font-extrabold text-rose-800 dark:text-rose-400 flex items-center gap-2">
              <span>🚦</span>
              <span>
                Danh sách Điểm nghẽn (Bottleneck) Đang Chờ Phê Duyệt (
                {pendingBottleneckWorkflows.length + gateBottlenecksAcrossProjects.length})
              </span>
            </h3>
            <p className="text-[11px] text-[var(--chu-m)]">
              Sắp xếp theo mức độ rủi ro tài chính, giá trị giải ngân bị ảnh hưởng (VNĐ) và thiệt hại lãi vay / phạt chậm SLA ước tính
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={bottleneckSortMode}
              onChange={e =>
                setBottleneckSortMode(
                  e.target.value as 'FINANCIAL_DESC' | 'PENALTY_DESC' | 'SEVERITY_DESC'
                )
              }
              className="bg-[var(--panel)] border border-amber-500/50 rounded-lg px-2.5 py-1.5 text-xs font-bold text-amber-800 dark:text-amber-300 focus:outline-none"
            >
              <option value="FINANCIAL_DESC">💰 Rủi ro tài chính: Cao → Thấp</option>
              <option value="PENALTY_DESC">⏱️ Thiệt hại lãi vay / SLA: Cao → Thấp</option>
              <option value="SEVERITY_DESC">🚨 Độ khẩn cấp (Hard-Stop trước)</option>
            </select>

            <input
              type="text"
              value={bottleneckSearch}
              onChange={e => setBottleneckSearch(e.target.value)}
              placeholder="Lọc mã hồ sơ, Gate, dự án..."
              className="bg-[var(--panel)] border border-[var(--line-d)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--chu)] placeholder-[var(--chu-nhat)] focus:outline-none focus:border-amber-500 w-44"
            />
            <div className="flex items-center gap-1 bg-[var(--panel)] p-1 rounded-lg border border-[var(--line)]">
              {(
                [
                  {
                    id: 'ALL',
                    label: `Tất cả (${
                      pendingBottleneckWorkflows.length + gateBottlenecksAcrossProjects.length
                    })`,
                  },
                  {
                    id: 'WORKFLOWS',
                    label: `Hồ sơ (${pendingBottleneckWorkflows.length})`,
                  },
                  {
                    id: 'GATES',
                    label: `Stage-Gate (${gateBottlenecksAcrossProjects.length})`,
                  },
                ] as const
              ).map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setBottleneckFilter(tab.id)}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${
                    bottleneckFilter === tab.id
                      ? 'bg-rose-500 text-white'
                      : 'text-[var(--chu-m)] hover:text-[var(--chu)] hover:bg-[var(--giay-d)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 space-y-5">
          {/* A. Bảng Hồ sơ Trình ký / Tờ trình Điểm nghẽn */}
          {(bottleneckFilter === 'ALL' || bottleneckFilter === 'WORKFLOWS') && (
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-mono font-bold uppercase text-amber-800 dark:text-amber-400">
                  A. Tờ trình & Hồ sơ Thanh toán/Pháp lý đang chờ phê duyệt ({pendingBottleneckWorkflows.length})
                </span>
                <span className="text-[11px] font-mono text-[var(--chu-m)]">
                  Tổng ảnh hưởng:{' '}
                  <b className="text-rose-800 dark:text-rose-300">{formatTyVnd(totalPendingWfImpactVnd)} VNĐ</b> ·
                  Thiệt hại lũy kế:{' '}
                  <b className="text-amber-800 dark:text-amber-300">{formatMillionVnd(totalEstimatedPenaltyLossVnd)}</b>
                </span>
              </div>

              {pendingBottleneckWorkflows.length === 0 ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs text-center">
                  ✓ Không còn hồ sơ trình ký nào bị tắc nghẽn hoặc chờ phê duyệt!
                </div>
              ) : (
                <div className="rounded-xl border border-[var(--line)] overflow-x-auto bg-[var(--giay)]">
                  <table className="w-full text-left border-collapse text-xs min-w-[920px]">
                    <thead>
                      <tr className="bg-[var(--giay)] border-b border-[var(--line)] text-[var(--chu-m)] font-mono text-[10px] uppercase">
                        <th className="p-3">Hồ sơ · Dự án · Gate</th>
                        <th className="p-3">Trích yếu & Nguyên nhân Tắc nghẽn (RACI)</th>
                        <th className="p-3 text-right">Giá trị tài chính ảnh hưởng (VNĐ)</th>
                        <th className="p-3 text-right">Thiệt hại lãi vay / Phạt chậm SLA ước tính</th>
                        <th className="p-3">SLA & Trạng thái</th>
                        <th className="p-3 text-right">Thao tác Xử lý</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--line)]">
                      {pendingBottleneckWorkflows.map(
                        ({
                          wf,
                          impactVnd,
                          dailyPenaltyVnd,
                          estimatedAccruedLossVnd,
                          overHours,
                        }) => {
                          const reqEmp = employees.find(e => e.id === wf.requesterId);
                          const appEmp = employees.find(e => e.id === wf.approverId);
                          const slaLimit = wf.slaHours || 48;
                          const elapsed = wf.elapsedHours || 24;
                          const isOverSla = overHours > 0;

                          return (
                            <tr
                              key={wf.id}
                              className={`transition ${
                                wf.status === 'REJECTED_HOLD'
                                  ? 'bg-rose-500/10 dark:bg-rose-950/40 hover:bg-rose-500/10 dark:bg-rose-950/40'
                                  : isOverSla
                                  ? 'bg-amber-500/10 dark:bg-amber-950/30 hover:bg-[var(--giay-d)]'
                                  : 'hover:bg-[var(--giay-d)]'
                              }`}
                            >
                              <td className="p-3 align-top whitespace-nowrap">
                                <div className="font-mono font-extrabold text-amber-800 dark:text-amber-300">
                                  {wf.docCode}
                                </div>
                                <div className="flex items-center gap-1 mt-1">
                                  {wf.projectCode && (
                                    <span className="px-1.5 py-0.2 rounded bg-[var(--giay-d)] border border-[var(--line-d)] font-mono text-[10px] text-[var(--chu)] font-bold">
                                      {projectIcons[wf.projectCode]} {wf.projectCode}
                                    </span>
                                  )}
                                  <span className="px-1.5 py-0.2 rounded bg-sky-500/15 border border-sky-500/30 font-mono text-[10px] text-sky-800 dark:text-sky-300 font-bold">
                                    {wf.gateRef} · {wf.domain}
                                  </span>
                                </div>
                                <div className="text-[10px] font-mono text-[var(--chu-nhat)] mt-1">
                                  Nộp: {wf.submittedAt}
                                </div>
                              </td>

                              <td className="p-3 align-top max-w-[340px]">
                                <div className="font-bold text-[var(--chu)] leading-snug">{wf.title}</div>
                                {wf.bottleneckReason && (
                                  <div className="mt-1 text-[11px] text-rose-900 dark:text-rose-200 leading-snug">
                                    • {wf.bottleneckReason}
                                  </div>
                                )}
                                <div className="mt-1 text-[10px] font-mono text-[var(--chu-m)]">
                                  {reqEmp?.fullName} ({reqEmp?.rbacRole}) → Tham vấn:{' '}
                                  {wf.consultedRole || 'BQLDA'} → Duyệt: {appEmp?.fullName} (
                                  {appEmp?.rbacRole})
                                </div>
                              </td>

                              <td className="p-3 align-top text-right font-mono tabular-nums whitespace-nowrap">
                                <div className="text-sm font-extrabold text-rose-800 dark:text-rose-300">
                                  {formatTyVnd(impactVnd)} VNĐ
                                </div>
                                <div className="text-[10px] text-[var(--chu-m)]">
                                  {impactVnd.toLocaleString('vi-VN')} đ
                                </div>
                              </td>

                              <td className="p-3 align-top text-right font-mono tabular-nums whitespace-nowrap">
                                <div className="text-xs font-extrabold text-amber-800 dark:text-amber-300">
                                  ~{formatMillionVnd(estimatedAccruedLossVnd)} VNĐ
                                </div>
                                <div className="text-[10px] text-rose-800 dark:text-rose-300">
                                  +{formatMillionVnd(dailyPenaltyVnd)}/ngày
                                </div>
                              </td>

                              <td className="p-3 align-top font-mono whitespace-nowrap">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                    wf.status === 'REJECTED_HOLD'
                                      ? 'bg-rose-500 text-white'
                                      : wf.status === 'PENDING_REVIEW'
                                      ? 'bg-amber-500 text-slate-950'
                                      : 'bg-sky-500 text-slate-950'
                                  }`}
                                >
                                  {wf.status === 'REJECTED_HOLD'
                                    ? '⛔ CHẶN HARD-STOP'
                                    : wf.status === 'PENDING_REVIEW'
                                    ? '⏳ CHỜ PHÊ DUYỆT'
                                    : '✓ TVGS ĐÃ XÁC NHẬN'}
                                </span>
                                <div
                                  className={`text-[10px] mt-1 font-bold ${
                                    isOverSla ? 'text-rose-800 dark:text-rose-400' : 'text-[var(--chu-m)]'
                                  }`}
                                >
                                  SLA: {elapsed}h / {slaLimit}h{' '}
                                  {isOverSla ? `(Quá +${overHours}h)` : '(Trong hạn)'}
                                </div>
                              </td>

                              <td className="p-3 align-top text-right whitespace-nowrap">
                                <div className="flex flex-col items-end gap-1">
                                  <div className="flex items-center gap-1 flex-wrap justify-end">
                                    {raciPerms.isContractor && (
                                      <button
                                        type="button"
                                        onClick={() => onApproveWorkflow(wf, 'PENDING_REVIEW')}
                                        title="Nhà thầu nộp lại / trình duyệt hồ sơ lên TVGS & Ban QLDA"
                                        className="px-2 py-1 rounded bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/50 text-orange-900 dark:text-orange-200 text-[10px] font-bold transition"
                                      >
                                        📤 Trình duyệt
                                      </button>
                                    )}
                                    {wf.status !== 'TVGS_VERIFIED' && (
                                      <button
                                        type="button"
                                        disabled={!raciPerms.canTvgsVerify}
                                        onClick={() => onApproveWorkflow(wf, 'TVGS_VERIFIED')}
                                        title={
                                          raciPerms.canTvgsVerify
                                            ? 'TVGS Xác nhận kỹ thuật, QA/QC & khối lượng hoàn thành'
                                            : raciPerms.isContractor
                                            ? 'Yêu cầu quyền TVGS / Chủ đầu tư'
                                            : 'Yêu cầu quyền Tư vấn Giám sát (TVGS)'
                                        }
                                        className="px-2 py-1 rounded bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-800 dark:text-sky-300 text-[10px] font-bold transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-sky-500/20"
                                      >
                                        {raciPerms.canTvgsVerify ? '🔍' : '🔒'} TVGS Xác nhận
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      disabled={!raciPerms.canReturnForSupplement}
                                      onClick={() => onApproveWorkflow(wf, 'REJECTED_HOLD')}
                                      title={
                                        raciPerms.canReturnForSupplement
                                          ? 'Trả lại yêu cầu bổ sung hồ sơ / Chặn Hold'
                                          : 'Yêu cầu quyền TVGS / Chủ đầu tư'
                                      }
                                      className="px-2 py-1 rounded bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-800 dark:text-rose-300 text-[10px] font-bold transition disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                      ↩️ Trả lại
                                    </button>
                                    <button
                                      type="button"
                                      disabled={!raciPerms.canCdtFinalApprove}
                                      onClick={() => onApproveWorkflow(wf, 'CDT_APPROVED')}
                                      title={
                                        raciPerms.canCdtFinalApprove
                                          ? 'Chủ đầu tư (CĐT) phê duyệt cuối cùng'
                                          : raciPerms.isContractor
                                          ? 'Yêu cầu quyền TVGS / Chủ đầu tư'
                                          : 'Yêu cầu quyền Chủ đầu tư (CĐT) để phê duyệt cuối cùng'
                                      }
                                      className="px-2 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-bold transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-emerald-500"
                                    >
                                      {raciPerms.canCdtFinalApprove ? '✓' : '🔒'} CĐT Duyệt
                                    </button>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => onInspectInD3Flow(wf.id)}
                                    className="px-2 py-0.5 rounded bg-[var(--giay-d)] hover:bg-[var(--giay-d)] text-sky-800 dark:text-sky-300 text-[10px] font-mono border border-[var(--line-d)] transition"
                                  >
                                    🔀 Sơ đồ D3
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* B. Cổng Stage-Gate đang bị Khóa 3-Way / Chờ Thẩm định */}
          {(bottleneckFilter === 'ALL' || bottleneckFilter === 'GATES') && (
            <div className="space-y-2.5 pt-2 border-t border-[var(--line)]">
              <span className="block text-xs font-mono font-bold uppercase text-sky-800 dark:text-sky-400">
                B. Cổng Stage-Gate đang bị Khóa chéo 3 Trục / Chờ Thẩm định trên Toàn bộ Dự án (
                {gateBottlenecksAcrossProjects.length})
              </span>

              {gateBottlenecksAcrossProjects.length === 0 ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs text-center">
                  ✓ Tất cả các cổng Stage-Gate trên toàn bộ dự án đều đang thông suốt!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                  {gateBottlenecksAcrossProjects.map(item => (
                    <div
                      key={`${item.projectCode}-${item.gateCode}`}
                      className={`p-3 rounded-xl border flex flex-col justify-between gap-2 ${
                        item.status === 'HARD_STOP_BLOCKED'
                          ? 'bg-rose-500/10 dark:bg-rose-950/40 border-rose-500/50'
                          : 'bg-[var(--giay)] border-[var(--line)]'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="font-mono text-[11px] font-extrabold text-[var(--chu)]">
                            {projectIcons[item.projectCode]} {item.projectCode} · Gate{' '}
                            <span className="text-amber-800 dark:text-amber-400">{item.gateCode}</span>
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-bold ${
                              item.status === 'HARD_STOP_BLOCKED'
                                ? 'bg-rose-500 text-white'
                                : 'bg-sky-500/20 text-sky-800 dark:text-sky-300 border border-sky-500/40'
                            }`}
                          >
                            {item.status === 'HARD_STOP_BLOCKED'
                              ? `⛔ KHÓA (${item.lockReasonCount} quy tắc)`
                              : '⏳ ĐANG THẨM ĐỊNH'}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-[var(--chu)] leading-snug">
                          {item.gateName}
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-mono pt-0.5">
                          <span className="text-rose-800 dark:text-rose-300 font-bold">
                            Ảnh hưởng: {formatTyVnd(item.impactVnd)} VNĐ
                          </span>
                          <span className="text-amber-800 dark:text-amber-300">
                            ~{formatMillionVnd(item.dailyPenaltyVnd)}/ngày
                          </span>
                        </div>
                        {item.riskFlag && (
                          <div className="text-[11px] text-amber-900 dark:text-amber-200/90 leading-snug line-clamp-2">
                            • {item.riskFlag}
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-[var(--line)] flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono text-[var(--chu-m)] truncate">
                          {item.authority}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onSwitchProjectAndOpenGate(item.projectCode, item.gateCode)
                          }
                          className="px-2 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] shrink-0 transition"
                        >
                          Mở & Gỡ khóa {item.gateCode} →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
