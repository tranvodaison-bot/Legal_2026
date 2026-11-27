import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { sankey as d3Sankey, sankeyJustify, sankeyLinkHorizontal, SankeyNode } from 'd3-sankey';
import {
  ApprovalWorkflowItem,
  D3ApprovalDiagramMode,
  D3ApprovalLinkDatum,
  D3ApprovalNodeDatum,
  D3ApprovalTreeDatum,
  EmployeeUser,
  ProjectArchetypeCode,
  RbacRoleCode,
} from '../types/lexPmoTypes';
import { getRaciActionPermissions } from '../utils/rbacRaciHelpers';

interface ApprovalFlowD3DiagramProps {
  approvalWorkflows: ApprovalWorkflowItem[];
  employees: EmployeeUser[];
  activeProjectArchetype: ProjectArchetypeCode;
  authorityName: string;
  chronoErrorsCount: number;
  currentActorRole: RbacRoleCode;
  selectedRoleFilter: string;
  onSelectRoleFilter: (roleOrNode: string) => void;
  onQuickResolveWorkflow: (wf: ApprovalWorkflowItem, nextStatus: ApprovalWorkflowItem['status']) => void;
}

type SankeyGraphNode = SankeyNode<D3ApprovalNodeDatum, D3ApprovalLinkDatum>;

export const ApprovalFlowD3Diagram: React.FC<ApprovalFlowD3DiagramProps> = ({
  approvalWorkflows,
  employees,
  activeProjectArchetype,
  authorityName,
  chronoErrorsCount,
  currentActorRole,
  selectedRoleFilter,
  onSelectRoleFilter,
  onQuickResolveWorkflow,
}) => {
  const raciPerms = useMemo(() => getRaciActionPermissions(currentActorRole), [currentActorRole]);
  const [diagramMode, setDiagramMode] = useState<D3ApprovalDiagramMode>('SANKEY_BLOCK');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('UNIT_BQLDA');
  const [hoveredLinkKey, setHoveredLinkKey] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // ==========================================================================
  // 1. TÍNH TOÁN DỮ LIỆU LUỒNG PHÊ DUYỆT & NÚT THẮT CỔ CHAI TỪ STATE THỰC TẾ
  // ==========================================================================
  const { nodesData, linksData, treeData, bottleneckSummary } = useMemo(() => {
    const getEmpRole = (empId: string): string => {
      const emp = employees.find(e => e.id === empId);
      return emp?.rbacRole || 'BQLDA';
    };

    // Thống kê theo từng đơn vị trong chuỗi phê duyệt
    const roleStats: Record<
      string,
      {
        total: number;
        pending: number;
        rejected: number;
        approved: number;
        totalHours: number;
        slaLimit: number;
      }
    > = {
      CDT: { total: 0, pending: 0, rejected: 0, approved: 0, totalHours: 0, slaLimit: 48 },
      BQLDA: { total: 0, pending: 0, rejected: 0, approved: 0, totalHours: 0, slaLimit: 48 },
      TVGS: { total: 0, pending: 0, rejected: 0, approved: 0, totalHours: 0, slaLimit: 24 },
      TVTK: { total: 0, pending: 0, rejected: 0, approved: 0, totalHours: 0, slaLimit: 60 },
      NTTC: { total: 0, pending: 0, rejected: 0, approved: 0, totalHours: 0, slaLimit: 36 },
    };

    approvalWorkflows.forEach(wf => {
      const reqRole = getEmpRole(wf.requesterId);
      const appRole = getEmpRole(wf.approverId);
      const consultRole = wf.consultedRole || 'BQLDA';
      const elapsed = wf.elapsedHours || 48;

      const involvedRoles = Array.from(new Set([reqRole, appRole, consultRole]));
      involvedRoles.forEach(r => {
        if (!roleStats[r]) return;
        roleStats[r].total += 1;
        roleStats[r].totalHours += elapsed;
        if (wf.status === 'PENDING_REVIEW') roleStats[r].pending += 1;
        else if (wf.status === 'REJECTED_HOLD') roleStats[r].rejected += 1;
        else roleStats[r].approved += 1;
      });
    });

    const calcAvg = (role: string) =>
      roleStats[role].total > 0 ? Math.round(roleStats[role].totalHours / roleStats[role].total) : 24;

    const nodes: D3ApprovalNodeDatum[] = [
      // Cột 0: Chủ đầu tư (Cấp quyết định & giao quyền)
      {
        nodeId: 'UNIT_CDT',
        code: 'CDT (Accountable)',
        name: 'Chủ đầu tư / HĐQT',
        roleGroup: 'CDT',
        raciBadge: 'A · Phê duyệt cuối',
        totalDossiers: Math.max(3, roleStats.CDT.total),
        pendingCount: roleStats.CDT.pending,
        rejectedCount: roleStats.CDT.rejected,
        approvedCount: roleStats.CDT.approved,
        avgTurnaroundHours: calcAvg('CDT'),
        slaLimitHours: 48,
        isBottleneck: roleStats.CDT.pending >= 2,
        bottleneckNote:
          'Chốt chặn phê duyệt Tờ trình Dự toán phát sinh (VO-02) và Quyết định LCNT sau khi Ban QLDA & Tư vấn thẩm định xong.',
      },
      // Cột 1: Ban Quản lý Dự án (Trung tâm điều phối hành chính & QS)
      {
        nodeId: 'UNIT_BQLDA',
        code: 'BQLDA (PMO & QS)',
        name: 'Ban QLDA & Phòng Kỹ thuật/QS',
        roleGroup: 'BQLDA',
        raciBadge: 'R/A · Điều phối & Thẩm tra',
        totalDossiers: Math.max(5, roleStats.BQLDA.total),
        pendingCount: roleStats.BQLDA.pending,
        rejectedCount: roleStats.BQLDA.rejected,
        approvedCount: roleStats.BQLDA.approved,
        avgTurnaroundHours: calcAvg('BQLDA'),
        slaLimitHours: 48,
        isBottleneck: roleStats.BQLDA.pending + roleStats.BQLDA.rejected >= 2,
        bottleneckNote:
          'NÚT THẮT TRUNG TÂM: Tập trung toàn bộ luồng tờ trình từ TVTK, TVGS và Nhà thầu trước khi trình CĐT phê duyệt.',
      },
      // Cột 2: Các đơn vị Tư vấn độc lập (TVTK, TVGS, LAS-XD/Thẩm tra)
      {
        nodeId: 'UNIT_TVTK',
        code: 'TVTK (Thiết kế)',
        name: 'Tư vấn Thiết kế & Giám sát tác giả',
        roleGroup: 'CONSULTANT',
        raciBadge: 'R/C · Thiết kế & PCCC',
        totalDossiers: Math.max(3, roleStats.TVTK.total),
        pendingCount: roleStats.TVTK.pending,
        rejectedCount: roleStats.TVTK.rejected,
        approvedCount: roleStats.TVTK.approved,
        avgTurnaroundHours: calcAvg('TVTK'),
        slaLimitHours: 60,
        isBottleneck: calcAvg('TVTK') > 60 || roleStats.TVTK.pending >= 2,
        bottleneckNote:
          'NÚT THẮT CỔ CHAI (+24h..+48h so với SLA): Chậm ký xác nhận bản vẽ điều chỉnh cục bộ VO-02 & thuyết minh PCCC Trạm XLNT.',
      },
      {
        nodeId: 'UNIT_TVGS',
        code: 'TVGS & LAS-XD',
        name: 'Tư vấn Giám sát & Phòng LAS-XD',
        roleGroup: 'CONSULTANT',
        raciBadge: 'R · Nghiệm thu & Kiểm định',
        totalDossiers: Math.max(4, roleStats.TVGS.total),
        pendingCount: roleStats.TVGS.pending,
        rejectedCount: roleStats.TVGS.rejected + (chronoErrorsCount > 0 ? 1 : 0),
        approvedCount: roleStats.TVGS.approved,
        avgTurnaroundHours: calcAvg('TVGS'),
        slaLimitHours: 24,
        isBottleneck: roleStats.TVGS.rejected > 0 || chronoErrorsCount > 0 || calcAvg('TVGS') > 24,
        bottleneckNote:
          'CHẶN HARD-STOP (RF-05): Tạm dừng nghiệm thu & thanh toán IPC Đợt 3 do sai lệch trình tự ngày xuất kết quả LAS-XD và ngày ký BBNT.',
      },
      // Cột 3: Nhà thầu thi công & Đệ trình hiện trường
      {
        nodeId: 'UNIT_NTTC',
        code: 'NTTC (Nhà thầu)',
        name: 'Nhà thầu Thi công & Cung ứng VLXD',
        roleGroup: 'CONTRACTOR',
        raciBadge: 'R · Lập hồ sơ & Thi công',
        totalDossiers: Math.max(4, roleStats.NTTC.total),
        pendingCount: roleStats.NTTC.pending,
        rejectedCount: roleStats.NTTC.rejected,
        approvedCount: roleStats.NTTC.approved,
        avgTurnaroundHours: calcAvg('NTTC'),
        slaLimitHours: 36,
        isBottleneck: roleStats.NTTC.rejected > 0,
        bottleneckNote:
          'Đầu mối trình Phiếu yêu cầu nghiệm thu (RFI), Đệ trình vật liệu (MAF/MS) và Hồ sơ thanh quyết toán A-B.',
      },
      // Cột 4: Kết quả đầu ra quy trình hành chính (Chốt chặn Stage-Gate)
      {
        nodeId: 'OUT_APPROVED',
        code: 'THÔNG QUA (APPROVED)',
        name: 'Đã Phê duyệt & Xác nhận Hợp lệ',
        roleGroup: 'STATUS_GATE',
        raciBadge: 'Gate Mở khóa',
        totalDossiers: approvalWorkflows.filter(
          w => w.status === 'CDT_APPROVED' || w.status === 'TVGS_VERIFIED'
        ).length,
        pendingCount: 0,
        rejectedCount: 0,
        approvedCount: approvalWorkflows.filter(
          w => w.status === 'CDT_APPROVED' || w.status === 'TVGS_VERIFIED'
        ).length,
        avgTurnaroundHours: 41,
        slaLimitHours: 48,
        isBottleneck: false,
        bottleneckNote: 'Hồ sơ đã hoàn tất luồng ký số RACI và được lưu trữ định danh SSOT.',
      },
      {
        nodeId: 'OUT_BOTTLENECK',
        code: 'NGHẼN / TỒN ĐỌNG',
        name: 'Nút thắt Cổ chai (Chờ duyệt / Hard-Stop)',
        roleGroup: 'STATUS_GATE',
        raciBadge: 'Cảnh báo SLA & RF-05',
        totalDossiers: approvalWorkflows.filter(
          w => w.status === 'PENDING_REVIEW' || w.status === 'REJECTED_HOLD'
        ).length,
        pendingCount: approvalWorkflows.filter(w => w.status === 'PENDING_REVIEW').length,
        rejectedCount: approvalWorkflows.filter(w => w.status === 'REJECTED_HOLD').length,
        approvedCount: 0,
        avgTurnaroundHours: 88,
        slaLimitHours: 48,
        isBottleneck:
          approvalWorkflows.some(
            w => w.status === 'PENDING_REVIEW' || w.status === 'REJECTED_HOLD'
          ) || chronoErrorsCount > 0,
        bottleneckNote:
          'Tập hợp các hồ sơ đang bị nghẽn tại khâu thẩm định thiết kế phát sinh (TVTK ↔ BQLDA) hoặc bị chặn Hard-Stop tại TVGS.',
      },
    ];

    const pendingVO = approvalWorkflows.filter(
      w => w.domain === 'QLHD' || w.domain === 'PCCC' || w.domain === 'HDXD'
    );
    const pendingSite = approvalWorkflows.filter(
      w => w.domain === 'QLCL' || w.domain === 'VLXD' || w.domain === 'TQT'
    );

    const links: D3ApprovalLinkDatum[] = [
      {
        sourceId: 'UNIT_CDT',
        targetId: 'UNIT_BQLDA',
        value: Math.max(4, approvalWorkflows.length),
        flowLabel: 'Giao chỉ tiêu, Ngân sách & Ủy quyền điều hành RACI',
        pendingCount: roleStats.BQLDA.pending,
        isBottleneckLink: roleStats.BQLDA.pending >= 2,
        avgHours: calcAvg('BQLDA'),
        docCodes: approvalWorkflows.map(w => w.docCode),
      },
      {
        sourceId: 'UNIT_BQLDA',
        targetId: 'UNIT_TVTK',
        value: Math.max(2, pendingVO.length),
        flowLabel: 'Yêu cầu Thẩm định TKCS, BVTC, PCCC & Bản vẽ Phát sinh VO',
        pendingCount: roleStats.TVTK.pending,
        isBottleneckLink: roleStats.TVTK.pending > 0,
        avgHours: calcAvg('TVTK'),
        docCodes: pendingVO.map(w => w.docCode),
      },
      {
        sourceId: 'UNIT_BQLDA',
        targetId: 'UNIT_TVGS',
        value: Math.max(3, pendingSite.length),
        flowLabel: 'Chỉ đạo Giám sát chất lượng, Thí nghiệm LAS-XD & Khối lượng QS',
        pendingCount: roleStats.TVGS.pending + roleStats.TVGS.rejected,
        isBottleneckLink: roleStats.TVGS.rejected > 0 || chronoErrorsCount > 0,
        avgHours: calcAvg('TVGS'),
        docCodes: pendingSite.map(w => w.docCode),
      },
      {
        sourceId: 'UNIT_TVTK',
        targetId: 'UNIT_NTTC',
        value: 2,
        flowLabel: 'Phát hành Bản vẽ thi công & Giải trình kỹ thuật (RFI Thiết kế)',
        pendingCount: roleStats.TVTK.pending,
        isBottleneckLink: roleStats.TVTK.pending > 0,
        avgHours: calcAvg('TVTK'),
        docCodes: ['TTr-112/2026/BQLDA', 'PLHD-VO-02/2026', 'TTr-TKCS-08/2026'],
      },
      {
        sourceId: 'UNIT_TVGS',
        targetId: 'UNIT_NTTC',
        value: Math.max(3, pendingSite.length),
        flowLabel: 'Kiểm tra Hiện trường, Ký Nhật ký IIa, BBNT & Xác nhận Thanh toán',
        pendingCount: roleStats.TVGS.rejected + roleStats.TVGS.pending,
        isBottleneckLink: roleStats.TVGS.rejected > 0 || chronoErrorsCount > 0,
        avgHours: calcAvg('TVGS'),
        docCodes: ['MAF-MS-012/2026', 'RFI-NT-045/2026', 'HSQT-AB-03/2026'],
      },
      {
        sourceId: 'UNIT_NTTC',
        targetId: 'OUT_APPROVED',
        value: Math.max(
          1,
          approvalWorkflows.filter(
            w => w.status === 'CDT_APPROVED' || w.status === 'TVGS_VERIFIED'
          ).length
        ),
        flowLabel: 'Hồ sơ Đạt chuẩn 3 Trục → Thông qua Cổng Stage-Gate',
        pendingCount: 0,
        isBottleneckLink: false,
        avgHours: 42,
        docCodes: approvalWorkflows
          .filter(w => w.status === 'CDT_APPROVED' || w.status === 'TVGS_VERIFIED')
          .map(w => w.docCode),
      },
      {
        sourceId: 'UNIT_NTTC',
        targetId: 'OUT_BOTTLENECK',
        value: Math.max(
          1,
          approvalWorkflows.filter(
            w => w.status === 'PENDING_REVIEW' || w.status === 'REJECTED_HOLD'
          ).length
        ),
        flowLabel: 'Tồn đọng chờ Tư vấn/BQLDA thẩm định hoặc Chặn Hard-Stop RF-05',
        pendingCount: approvalWorkflows.filter(
          w => w.status === 'PENDING_REVIEW' || w.status === 'REJECTED_HOLD'
        ).length,
        isBottleneckLink:
          approvalWorkflows.some(
            w => w.status === 'PENDING_REVIEW' || w.status === 'REJECTED_HOLD'
          ) || chronoErrorsCount > 0,
        avgHours: 88,
        docCodes: approvalWorkflows
          .filter(w => w.status === 'PENDING_REVIEW' || w.status === 'REJECTED_HOLD')
          .map(w => w.docCode),
      },
    ];

    // Cấu trúc Cây phân cấp D3 Tree từ CĐT -> Ban QLDA -> Các Đơn vị Tư vấn -> Hồ sơ cụ thể
    const tree: D3ApprovalTreeDatum = {
      id: 'UNIT_CDT',
      code: 'CẤP 1 · CHỦ ĐẦU TƯ (CDT)',
      name: 'Hội đồng Quản trị / Chủ đầu tư (Accountable)',
      subtitle: `Thẩm quyền phê duyệt cuối · ${authorityName}`,
      raciTag: 'RACI: A',
      status: roleStats.CDT.pending > 0 ? 'WARNING_SLA' : 'APPROVED',
      slaText: `SLA TB: ${calcAvg('CDT')}h / 48h`,
      pendingDocs: roleStats.CDT.pending,
      bottleneckReason:
        'Chốt chặn phê duyệt Tờ trình Dự toán phát sinh (VO) và Quyết toán vốn đầu tư.',
      children: [
        {
          id: 'UNIT_BQLDA',
          code: 'CẤP 2 · BAN QLDA (PMO & QS)',
          name: 'Ban Quản lý Dự án & Phòng Kỹ thuật - Khối lượng (QS)',
          subtitle: `Điều phối trung tâm [${activeProjectArchetype}] · Rà soát pháp lý & dự toán`,
          raciTag: 'RACI: R/A',
          status:
            roleStats.BQLDA.rejected > 0
              ? 'BOTTLENECK_HOLD'
              : roleStats.BQLDA.pending > 0
              ? 'WARNING_SLA'
              : 'APPROVED',
          slaText: `SLA TB: ${calcAvg('BQLDA')}h / 48h`,
          pendingDocs: roleStats.BQLDA.pending + roleStats.BQLDA.rejected,
          bottleneckReason:
            'Nút thắt điều phối hồ sơ giữa Tư vấn Thiết kế (TVTK), Tư vấn Giám sát (TVGS) và Chủ đầu tư.',
          children: [
            {
              id: 'UNIT_TVTK',
              code: 'NHÁNH 2.1 · TƯ VẤN THIẾT KẾ (TVTK)',
              name: 'Viện Thiết kế Quy hoạch & Giám sát Tác giả',
              subtitle: 'Thẩm tra TKCS, BVTC, PCCC & Xác nhận bản vẽ phát sinh VO',
              raciTag: 'RACI: R/C',
              status: roleStats.TVTK.pending > 0 ? 'BOTTLENECK_HOLD' : 'APPROVED',
              slaText: `SLA TB: ${calcAvg('TVTK')}h / 60h`,
              pendingDocs: roleStats.TVTK.pending,
              bottleneckReason:
                'Nghẽn cổ chai tại khâu điều chỉnh thiết kế PCCC (Gate G6) và ký bản vẽ phát sinh VO-02 (Gate G14).',
              children: approvalWorkflows
                .filter(w => w.domain === 'HDXD' || w.domain === 'PCCC' || w.domain === 'QLHD' || w.domain === 'DTH')
                .map(wf => ({
                  id: `WF_${wf.id}`,
                  code: `${wf.docCode} (${wf.gateRef})`,
                  name: wf.title,
                  subtitle: `Trạng thái: ${wf.status} · Thời gian: ${wf.elapsedHours || 48}h / SLA ${wf.slaHours || 48}h`,
                  raciTag: wf.domain,
                  status:
                    wf.status === 'REJECTED_HOLD'
                      ? 'BOTTLENECK_HOLD'
                      : wf.status === 'PENDING_REVIEW'
                      ? 'WARNING_SLA'
                      : 'APPROVED',
                  slaText: `${wf.elapsedHours || 48}h/${wf.slaHours || 48}h`,
                  pendingDocs: wf.status === 'PENDING_REVIEW' || wf.status === 'REJECTED_HOLD' ? 1 : 0,
                  bottleneckReason: wf.bottleneckReason,
                  linkedWorkflowId: wf.id,
                })),
            },
            {
              id: 'UNIT_TVGS',
              code: 'NHÁNH 2.2 · TƯ VẤN GIÁM SÁT & LAS-XD',
              name: 'Đoàn Tư vấn Giám sát Hiện trường & Phòng LAS-XD',
              subtitle: 'Kiểm soát VLXD, Nhật ký IIa, Nghiệm thu QLCL & Xác nhận KL Thanh toán',
              raciTag: 'RACI: R',
              status:
                roleStats.TVGS.rejected > 0 || chronoErrorsCount > 0
                  ? 'BOTTLENECK_HOLD'
                  : roleStats.TVGS.pending > 0
                  ? 'WARNING_SLA'
                  : 'APPROVED',
              slaText: `SLA TB: ${calcAvg('TVGS')}h / 24h`,
              pendingDocs: roleStats.TVGS.pending + roleStats.TVGS.rejected,
              bottleneckReason:
                'Chặn Hard-Stop RF-05 đối với hồ sơ nghiệm thu khi ngày kết quả thí nghiệm LAS-XD muộn hơn ngày ký BBNT.',
              children: approvalWorkflows
                .filter(w => w.domain === 'VLXD' || w.domain === 'QLCL' || w.domain === 'TQT')
                .map(wf => ({
                  id: `WF_${wf.id}`,
                  code: `${wf.docCode} (${wf.gateRef})`,
                  name: wf.title,
                  subtitle: `Nhà thầu NTTC đệ trình · ${wf.status} (${wf.elapsedHours || 36}h / SLA ${wf.slaHours || 24}h)`,
                  raciTag: wf.domain,
                  status:
                    wf.status === 'REJECTED_HOLD'
                      ? 'BOTTLENECK_HOLD'
                      : wf.status === 'PENDING_REVIEW'
                      ? 'WARNING_SLA'
                      : 'APPROVED',
                  slaText: `${wf.elapsedHours || 36}h/${wf.slaHours || 24}h`,
                  pendingDocs: wf.status === 'PENDING_REVIEW' || wf.status === 'REJECTED_HOLD' ? 1 : 0,
                  bottleneckReason: wf.bottleneckReason,
                  linkedWorkflowId: wf.id,
                })),
            },
          ],
        },
      ],
    };

    const delayedWfs = approvalWorkflows.filter(
      w =>
        w.status === 'PENDING_REVIEW' ||
        w.status === 'REJECTED_HOLD' ||
        (w.elapsedHours || 0) > (w.slaHours || 48)
    );

    return {
      nodesData: nodes,
      linksData: links,
      treeData: tree,
      bottleneckSummary: {
        delayedCount: delayedWfs.length,
        criticalHoldCount: approvalWorkflows.filter(w => w.status === 'REJECTED_HOLD').length,
        avgOverdueHours:
          delayedWfs.length > 0
            ? Math.round(
                delayedWfs.reduce(
                  (acc, w) => acc + Math.max(0, (w.elapsedHours || 48) - (w.slaHours || 48)),
                  0
                ) / delayedWfs.length
              )
            : 0,
        delayedWorkflows: delayedWfs,
      },
    };
  }, [approvalWorkflows, employees, activeProjectArchetype, authorityName, chronoErrorsCount]);

  // ==========================================================================
  // 2. D3.JS ENGINE: VẼ BIỂU ĐỒ SANKEY BLOCK & BIỂU ĐỒ CÂY HIERARCHY TREE
  // ==========================================================================
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const width = 1040;
    const height = diagramMode === 'SANKEY_BLOCK' ? 370 : 410;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('preserveAspectRatio', 'xMidYMid meet');

    const defs = svg.append('defs');

    // Bộ lọc phát sáng (Glow Filter) cho các khối Nút thắt cổ chai
    const glowFilter = defs
      .append('filter')
      .attr('id', 'bottleneck-glow')
      .attr('x', '-20%')
      .attr('y', '-20%')
      .attr('width', '140%')
      .attr('height', '140%');
    glowFilter.append('feGaussianBlur').attr('stdDeviation', '3.5').attr('result', 'coloredBlur');
    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    if (diagramMode === 'SANKEY_BLOCK') {
      // Khởi tạo D3 Sankey Generator
      const sankeyGenerator = d3Sankey<D3ApprovalNodeDatum, D3ApprovalLinkDatum>()
        .nodeId(d => d.nodeId)
        .nodeAlign(sankeyJustify)
        .nodeWidth(156)
        .nodePadding(22)
        .extent([
          [20, 26],
          [width - 20, height - 22],
        ]);

      const graph = sankeyGenerator({
        nodes: nodesData.map(n => ({ ...n })),
        links: linksData.map(l => ({
          ...l,
          source: l.sourceId,
          target: l.targetId,
        })),
      });

      // Vẽ nhãn tầng bậc phía trên cùng của biểu đồ Sankey
      const columnHeaders = [
        { x: 20, label: 'TẦNG 1: CHỦ ĐẦU TƯ (A)' },
        { x: 255, label: 'TẦNG 2: BAN QLDA / PMO (R/A)' },
        { x: 495, label: 'TẦNG 3: ĐƠN VỊ TƯ VẤN (TVTK · TVGS)' },
        { x: 725, label: 'TẦNG 4: NHÀ THẦU (NTTC)' },
        { x: 880, label: 'TẦNG 5: ĐẦU RA GATE' },
      ];

      svg
        .append('g')
        .selectAll('text')
        .data(columnHeaders)
        .join('text')
        .attr('x', d => d.x)
        .attr('y', 15)
        .attr('fill', 'var(--d3-muted)')
        .attr('font-size', 10)
        .attr('font-family', 'ui-monospace, monospace')
        .attr('font-weight', '700')
        .text(d => d.label);

      // Tạo Gradient cho từng Link
      graph.links.forEach((link, idx) => {
        const grad = defs
          .append('linearGradient')
          .attr('id', `sankey-link-grad-${idx}`)
          .attr('gradientUnits', 'userSpaceOnUse')
          .attr('x1', (link.source as SankeyGraphNode).x1 || 0)
          .attr('x2', (link.target as SankeyGraphNode).x0 || 0);

        if (link.isBottleneckLink) {
          grad.append('stop').attr('offset', '0%').attr('stop-color', '#f59e0b').attr('stop-opacity', 0.55);
          grad.append('stop').attr('offset', '100%').attr('stop-color', '#f43f5e').attr('stop-opacity', 0.75);
        } else {
          grad.append('stop').attr('offset', '0%').attr('stop-color', '#38bdf8').attr('stop-opacity', 0.42);
          grad.append('stop').attr('offset', '100%').attr('stop-color', '#10b981').attr('stop-opacity', 0.55);
        }
      });

      // Vẽ các dải luồng phê duyệt (Sankey Links)
      const linkGroup = svg.append('g').attr('fill', 'none');

      const linkPaths = linkGroup
        .selectAll('g')
        .data(graph.links)
        .join('g')
        .attr('class', 'cursor-pointer')
        .on('mouseenter', (_, d) => {
          setHoveredLinkKey(`${d.sourceId}->${d.targetId}`);
        })
        .on('mouseleave', () => {
          setHoveredLinkKey(null);
        })
        .on('click', (_, d) => {
          const targetNode = d.target as SankeyGraphNode;
          setSelectedNodeId(targetNode.nodeId);
          onSelectRoleFilter(targetNode.nodeId);
        });

      linkPaths
        .append('path')
        .attr('d', sankeyLinkHorizontal())
        .attr('stroke', (_, idx) => `url(#sankey-link-grad-${idx})`)
        .attr('stroke-width', d => Math.max(8, d.width || 8))
        .attr('stroke-opacity', d => {
          const key = `${d.sourceId}->${d.targetId}`;
          if (hoveredLinkKey && hoveredLinkKey !== key) return 0.25;
          return d.isBottleneckLink ? 0.85 : 0.6;
        });

      // Đường tim nét đứt cảnh báo trên các luồng bị nghẽn cổ chai
      linkPaths
        .filter(d => d.isBottleneckLink)
        .append('path')
        .attr('d', sankeyLinkHorizontal())
        .attr('stroke', '#fda4af')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '6,4')
        .attr('stroke-opacity', 0.95);

      linkPaths
        .append('title')
        .text(
          d =>
            `${d.flowLabel}\n• Lưu lượng: ${d.value} hồ sơ (${d.docCodes.join(', ')})\n• Thời gian xử lý TB: ${d.avgHours}h\n• Hồ sơ đang nghẽn/chờ: ${d.pendingCount}`
        );

      // Nhãn hiển thị số lượng hồ sơ & thời gian SLA ngay giữa luồng
      linkPaths
        .append('text')
        .attr('x', d => {
          const sx = (d.source as SankeyGraphNode).x1 || 0;
          const tx = (d.target as SankeyGraphNode).x0 || 0;
          return (sx + tx) / 2;
        })
        .attr('y', d => ((d.y0 || 0) + (d.y1 || 0)) / 2 - 3)
        .attr('text-anchor', 'middle')
        .attr('fill', d => (d.isBottleneckLink ? 'var(--d3-link-warn)' : 'var(--d3-link-label)'))
        .attr('font-size', 9.5)
        .attr('font-family', 'ui-monospace, monospace')
        .attr('font-weight', '700')
        .text(d =>
          d.isBottleneckLink
            ? `⚠ ${d.value} HS · ${d.avgHours}h (Nghẽn ${d.pendingCount})`
            : `${d.value} HS · ${d.avgHours}h`
        );

      // Vẽ các khối Đơn vị / Tổ chức (Sankey Block Nodes)
      const nodeGroup = svg
        .append('g')
        .selectAll('g')
        .data(graph.nodes)
        .join('g')
        .attr('transform', d => `translate(${d.x0 || 0},${d.y0 || 0})`)
        .attr('class', 'cursor-pointer')
        .on('click', (_, d) => {
          setSelectedNodeId(d.nodeId);
          onSelectRoleFilter(d.nodeId);
        });

      nodeGroup.each(function (d) {
        const g = d3.select(this);
        const nodeW = Math.max(140, (d.x1 || 0) - (d.x0 || 0));
        const nodeH = Math.max(58, (d.y1 || 0) - (d.y0 || 0));
        const isSelected = d.nodeId === selectedNodeId || selectedRoleFilter === d.nodeId;

        const strokeColor = isSelected
          ? '#fbbf24'
          : d.isBottleneck
          ? '#f43f5e'
          : d.roleGroup === 'CDT'
          ? '#f59e0b'
          : d.roleGroup === 'BQLDA'
          ? '#38bdf8'
          : d.roleGroup === 'STATUS_GATE'
          ? '#10b981'
          : '#64748b';

        const bgFill = d.isBottleneck
          ? 'var(--d3-node-bottleneck-bg)'
          : 'var(--d3-node-bg)';

        // Khung khối chữ nhật chính
        g.append('rect')
          .attr('width', nodeW)
          .attr('height', nodeH)
          .attr('rx', 10)
          .attr('ry', 10)
          .attr('fill', bgFill)
          .attr('stroke', strokeColor)
          .attr('stroke-width', isSelected ? 2.5 : d.isBottleneck ? 2 : 1.3)
          .attr('filter', d.isBottleneck ? 'url(#bottleneck-glow)' : null);

        // Thanh màu trạng thái bên trái khối
        g.append('rect')
          .attr('x', 0)
          .attr('y', 0)
          .attr('width', 5)
          .attr('height', nodeH)
          .attr('rx', 3)
          .attr(
            'fill',
            d.isBottleneck
              ? '#f43f5e'
              : d.nodeId === 'OUT_APPROVED'
              ? '#10b981'
              : d.roleGroup === 'CDT'
              ? '#f59e0b'
              : '#38bdf8'
          );

        // Mã đơn vị + Badge nút thắt
        g.append('text')
          .attr('x', 11)
          .attr('y', 16)
          .attr('fill', d.isBottleneck ? 'var(--d3-link-warn)' : 'var(--d3-accent)')
          .attr('font-size', 10.5)
          .attr('font-family', 'ui-monospace, monospace')
          .attr('font-weight', '800')
          .text(d.isBottleneck ? `🔥 ${d.code}` : d.code);

        // Tên đơn vị
        g.append('text')
          .attr('x', 11)
          .attr('y', 31)
          .attr('fill', 'var(--d3-text)')
          .attr('font-size', 10)
          .attr('font-weight', '600')
          .text(d.name.length > 23 ? d.name.slice(0, 22) + '…' : d.name);

        // Chỉ số SLA & Tồn đọng
        if (nodeH >= 52) {
          g.append('text')
            .attr('x', 11)
            .attr('y', 46)
            .attr('fill', d.avgTurnaroundHours > d.slaLimitHours ? 'var(--son-l)' : 'var(--xanh)')
            .attr('font-size', 9.5)
            .attr('font-family', 'ui-monospace, monospace')
            .attr('font-weight', '700')
            .text(
              `SLA: ${d.avgTurnaroundHours}h/${d.slaLimitHours}h · Chờ: ${
                d.pendingCount + d.rejectedCount
              }`
            );
        }

        if (nodeH >= 68) {
          g.append('text')
            .attr('x', 11)
            .attr('y', 60)
            .attr('fill', 'var(--d3-muted)')
            .attr('font-size', 9)
            .attr('font-family', 'ui-monospace, monospace')
            .text(d.raciBadge);
        }
      });
    } else {
      // ======================================================================
      // CHẾ ĐỘ 2: BIỂU ĐỒ CÂY PHÂN CẤP D3 BLOCK TREE (CĐT -> BAN QLDA -> TƯ VẤN -> HỒ SƠ)
      // ======================================================================
      const root = d3.hierarchy<D3ApprovalTreeDatum>(treeData);
      const treeLayout = d3
        .tree<D3ApprovalTreeDatum>()
        .size([height - 44, width - 310]);

      const treeRoot = treeLayout(root);

      const gTree = svg.append('g').attr('transform', 'translate(30, 22)');

      const linkGen = d3
        .linkHorizontal<
          d3.HierarchyPointLink<D3ApprovalTreeDatum>,
          d3.HierarchyPointNode<D3ApprovalTreeDatum>
        >()
        .x(d => d.y)
        .y(d => d.x);

      // Vẽ đường kết nối phân cấp giữa các khối
      gTree
        .append('g')
        .attr('fill', 'none')
        .selectAll('path')
        .data(treeRoot.links())
        .join('path')
        .attr('d', d => linkGen(d) || '')
        .attr('stroke', d =>
          d.target.data.status === 'BOTTLENECK_HOLD'
            ? '#f43f5e'
            : d.target.data.status === 'WARNING_SLA'
            ? '#f59e0b'
            : '#10b981'
        )
        .attr('stroke-width', d =>
          d.target.data.status === 'BOTTLENECK_HOLD' || d.target.data.status === 'WARNING_SLA'
            ? 2.6
            : 1.8
        )
        .attr('stroke-dasharray', d =>
          d.target.data.status === 'BOTTLENECK_HOLD' ? '6,4' : null
        )
        .attr('stroke-opacity', 0.85);

      // Vẽ các khối nút trên Cây phân cấp
      const treeNodes = gTree
        .append('g')
        .selectAll('g')
        .data(treeRoot.descendants())
        .join('g')
        .attr('transform', d => `translate(${d.y},${d.x})`)
        .attr('class', 'cursor-pointer')
        .on('click', (_, d) => {
          setSelectedNodeId(d.data.id);
          onSelectRoleFilter(d.data.id);
        });

      treeNodes.each(function (d) {
        const g = d3.select(this);
        const isLeaf = !d.children || d.children.length === 0;
        const boxW = isLeaf ? 255 : 210;
        const boxH = isLeaf ? 44 : 54;
        const isSelected = d.data.id === selectedNodeId || selectedRoleFilter === d.data.id;

        const isBottleneck =
          d.data.status === 'BOTTLENECK_HOLD' || d.data.status === 'WARNING_SLA';

        const strokeColor = isSelected
          ? '#fbbf24'
          : d.data.status === 'BOTTLENECK_HOLD'
          ? '#f43f5e'
          : d.data.status === 'WARNING_SLA'
          ? '#f59e0b'
          : '#10b981';

        const fillBg =
          d.data.status === 'BOTTLENECK_HOLD'
            ? 'var(--d3-node-bottleneck-bg)'
            : 'var(--d3-node-bg)';

        g.append('rect')
          .attr('x', -10)
          .attr('y', -boxH / 2)
          .attr('width', boxW)
          .attr('height', boxH)
          .attr('rx', 8)
          .attr('ry', 8)
          .attr('fill', fillBg)
          .attr('stroke', strokeColor)
          .attr('stroke-width', isSelected ? 2.5 : isBottleneck ? 2 : 1.4)
          .attr('filter', d.data.status === 'BOTTLENECK_HOLD' ? 'url(#bottleneck-glow)' : null);

        // Dòng 1: Mã khối + SLA
        g.append('text')
          .attr('x', 0)
          .attr('y', -boxH / 2 + 15)
          .attr(
            'fill',
            d.data.status === 'BOTTLENECK_HOLD'
              ? 'var(--d3-link-warn)'
              : d.data.status === 'WARNING_SLA'
              ? 'var(--d3-accent)'
              : 'var(--xanh)'
          )
          .attr('font-size', 9.5)
          .attr('font-family', 'ui-monospace, monospace')
          .attr('font-weight', '800')
          .text(
            `${
              d.data.status === 'BOTTLENECK_HOLD'
                ? '⛔ '
                : d.data.status === 'WARNING_SLA'
                ? '⚠ '
                : '✓ '
            }${d.data.code} · ${d.data.slaText}`
          );

        // Dòng 2: Tên đơn vị / Tờ trình
        g.append('text')
          .attr('x', 0)
          .attr('y', -boxH / 2 + 29)
          .attr('fill', 'var(--d3-text)')
          .attr('font-size', 9.5)
          .attr('font-weight', '600')
          .text(d.data.name.length > 34 ? d.data.name.slice(0, 33) + '…' : d.data.name);

        // Dòng 3: Phụ đề RACI (cho các node cấp đơn vị)
        if (!isLeaf) {
          g.append('text')
            .attr('x', 0)
            .attr('y', -boxH / 2 + 43)
            .attr('fill', 'var(--d3-muted)')
            .attr('font-size', 8.5)
            .attr('font-family', 'ui-monospace, monospace')
            .text(
              `${d.data.raciTag} · Tồn đọng: ${d.data.pendingDocs} HS`
            );
        }

        g.append('title').text(
          `${d.data.code} — ${d.data.name}\n${d.data.subtitle}\n${d.data.bottleneckReason || ''}`
        );
      });
    }
  }, [
    diagramMode,
    nodesData,
    linksData,
    treeData,
    selectedNodeId,
    selectedRoleFilter,
    hoveredLinkKey,
    onSelectRoleFilter,
  ]);

  const activeSelectedNode = useMemo(() => {
    return (
      nodesData.find(n => n.nodeId === selectedNodeId) ||
      nodesData.find(n => n.nodeId === 'UNIT_BQLDA') ||
      nodesData[0]
    );
  }, [nodesData, selectedNodeId]);

  return (
    <div className="bg-[var(--panel)] border border-[var(--line)] rounded-xl p-4 space-y-3 shadow-lg text-[var(--chu)]">
      {/* Header điều khiển Biểu đồ D3.js (Chuyển đổi Sankey Block <-> Hierarchy Tree + KPI Nút thắt) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/40 text-rose-800 dark:text-rose-300 font-mono text-[10px] font-extrabold uppercase">
              D3.JS BOTTLENECK ENGINE
            </span>
            <h3 className="text-xs sm:text-sm font-bold text-[var(--navy-ink)]">
              Biểu đồ Khối Luồng Phê duyệt Hành chính: Chủ đầu tư (CĐT) ↔ Ban QLDA ↔ Các Đơn vị Tư vấn (TVTK · TVGS · LAS-XD)
            </h3>
          </div>
          <p className="text-[11px] text-[var(--chu-m)]">
            Click vào bất kỳ <b className="text-amber-800 dark:text-amber-300">Khối Đơn vị</b> hoặc{' '}
            <b className="text-rose-800 dark:text-rose-300">Luồng Nút thắt đỏ</b> trên sơ đồ D3.js để lọc hồ sơ bị nghẽn và giải tỏa trực tiếp theo phân quyền RBAC.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Chuyển đổi giữa D3 Sankey Block và D3 Hierarchy Tree */}
          <div className="flex items-center bg-[var(--giay-soft)] p-1 rounded-lg border border-[var(--line)]">
            <button
              onClick={() => setDiagramMode('SANKEY_BLOCK')}
              className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold transition cursor-pointer ${
                diagramMode === 'SANKEY_BLOCK'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-[var(--chu-m)] hover:text-[var(--chu)]'
              }`}
            >
              📊 D3 Sankey Khối (Luồng & Băng thông)
            </button>
            <button
              onClick={() => setDiagramMode('HIERARCHY_TREE')}
              className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold transition cursor-pointer ${
                diagramMode === 'HIERARCHY_TREE'
                  ? 'bg-sky-500 text-slate-950 shadow'
                  : 'text-[var(--chu-m)] hover:text-[var(--chu)]'
              }`}
            >
              🌳 D3 Tree Phân cấp (CĐT → Tư vấn → Hồ sơ)
            </button>
          </div>

          {selectedRoleFilter !== 'ALL' && (
            <button
              onClick={() => onSelectRoleFilter('ALL')}
              className="px-2.5 py-1 rounded-lg bg-[var(--giay-d)] hover:opacity-90 text-amber-800 dark:text-amber-300 font-mono text-xs font-bold border border-amber-500/40 transition cursor-pointer"
            >
              ✕ Bỏ lọc đơn vị ({selectedRoleFilter.replace('UNIT_', '')})
            </button>
          )}
        </div>
      </div>

      {/* Dải 4 thẻ chỉ số Nút thắt Cổ chai (Bottleneck Telemetry) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
        <div className="p-2.5 rounded-lg bg-[var(--giay-soft)] border border-rose-500/40 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono text-[var(--chu-m)] uppercase">
              Điểm nghẽn Cổ chai Chính
            </div>
            <div className="font-bold text-rose-800 dark:text-rose-300 mt-0.5">
              TVTK ↔ BQLDA & TVGS (RF-05)
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-800 dark:text-rose-300 font-mono font-extrabold text-xs">
            {bottleneckSummary.delayedCount} HS trễ
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-[var(--giay-soft)] border border-amber-500/40 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono text-[var(--chu-m)] uppercase">
              Độ trễ SLA Trung bình tại Nút thắt
            </div>
            <div className="font-bold text-amber-800 dark:text-amber-300 mt-0.5">
              +{bottleneckSummary.avgOverdueHours} giờ vượt định mức SLA
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-800 dark:text-amber-300 font-mono font-extrabold text-xs">
            SLA &gt; 48h
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-[var(--giay-soft)] border border-sky-500/40 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono text-[var(--chu-m)] uppercase">
              Đơn vị Đang chọn Kiểm tra
            </div>
            <div className="font-bold text-sky-800 dark:text-sky-300 mt-0.5 truncate max-w-[180px]">
              {activeSelectedNode.name}
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-sky-500/15 text-sky-800 dark:text-sky-300 font-mono font-bold text-[11px]">
            {activeSelectedNode.avgTurnaroundHours}h/{activeSelectedNode.slaLimitHours}h
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-[var(--giay-soft)] border border-emerald-500/40 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono text-[var(--chu-m)] uppercase">
              Hồ sơ Thông qua / Tổng luồng
            </div>
            <div className="font-bold text-emerald-800 dark:text-emerald-300 mt-0.5">
              {
                approvalWorkflows.filter(
                  w => w.status === 'CDT_APPROVED' || w.status === 'TVGS_VERIFIED'
                ).length
              }{' '}
              / {approvalWorkflows.length} Hồ sơ đã duyệt
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-mono font-extrabold text-xs">
            {Math.round(
              (approvalWorkflows.filter(
                w => w.status === 'CDT_APPROVED' || w.status === 'TVGS_VERIFIED'
              ).length /
                Math.max(1, approvalWorkflows.length)) *
                100
            )}
            %
          </span>
        </div>
      </div>

      {/* Khung Canvas SVG D3.js */}
      <div className="relative rounded-xl bg-[var(--giay-soft)] border border-[var(--line)] p-2 overflow-x-auto">
        <svg ref={svgRef} className="w-full min-w-[780px] h-auto select-none" />
      </div>

      {/* Hộp Phân tích & Giải tỏa Nhanh Nút thắt Cổ chai (Bottleneck Inspector & Action Bar) */}
      <div className="p-3 rounded-xl bg-[var(--giay-soft)] border border-[var(--line)] flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-amber-800 dark:text-amber-300 uppercase">
              🔍 Chẩn đoán Nút thắt tại [{activeSelectedNode.code}]:
            </span>
            <span
              className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                activeSelectedNode.isBottleneck
                  ? 'bg-rose-500/15 text-rose-800 dark:text-rose-300 border border-rose-500/40'
                  : 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40'
              }`}
            >
              {activeSelectedNode.isBottleneck
                ? `ĐANG NGHẼN (${activeSelectedNode.pendingCount + activeSelectedNode.rejectedCount} HỒ SƠ)`
                : 'LUỒNG THÔNG SUỐT'}
            </span>
          </div>
          <p className="text-[var(--chu-m)] leading-relaxed">{activeSelectedNode.bottleneckNote}</p>
        </div>

        {/* Nút Giải tỏa nhanh các hồ sơ đang bị nghẽn (Khóa quyền RACI theo Vai trò) */}
        {bottleneckSummary.delayedWorkflows.length > 0 && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {bottleneckSummary.delayedWorkflows.slice(0, 2).map(wf => {
              const targetNext: ApprovalWorkflowItem['status'] =
                wf.status === 'REJECTED_HOLD' ? 'TVGS_VERIFIED' : 'CDT_APPROVED';
              const isAllowed =
                targetNext === 'TVGS_VERIFIED'
                  ? raciPerms.canTvgsVerify
                  : raciPerms.canCdtFinalApprove;
              const disabledReason =
                targetNext === 'TVGS_VERIFIED'
                  ? 'Yêu cầu quyền TVGS để xác nhận kỹ thuật'
                  : raciPerms.isContractor
                  ? 'Yêu cầu quyền TVGS / Chủ đầu tư'
                  : 'Yêu cầu quyền Chủ đầu tư (CĐT) để phê duyệt cuối cùng';

              return (
                <button
                  key={wf.id}
                  type="button"
                  disabled={!isAllowed}
                  onClick={() => onQuickResolveWorkflow(wf, targetNext)}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-emerald-600 hover:text-white border border-rose-500/50 text-rose-800 dark:text-rose-200 font-mono text-[11px] font-bold transition whitespace-nowrap disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:bg-rose-500/15 cursor-pointer"
                  title={
                    isAllowed
                      ? `Giải tỏa nút thắt cho hồ sơ ${wf.docCode}: ${wf.title}`
                      : disabledReason
                  }
                >
                  {isAllowed ? '⚡' : '🔒'} Giải tỏa {wf.docCode} ({wf.gateRef}) →
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
