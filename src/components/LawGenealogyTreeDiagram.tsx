import React, { useState, useMemo } from 'react';
import * as d3 from 'd3';
import {
  FunctionalDomainCode,
  LawRoadmapDocNode,
  LawRoadmapPillar,
  LegalCutoffEvaluation,
  LegalCutoffFilterMode,
  ProjectArchetypeCode,
  ProjectLegalMilestones,
} from '../types/lexPmoTypes';
import {
  classifyProjectCutoffRegime,
  evaluateRoadmapNodeCutoff,
  PRESET_LEGACY_2023_2024,
} from '../utils/legalCutoffEngine';

interface GenealogyTreeNodeDatum {
  id: string;
  code: string;
  badge: string;
  title: string;
  relationTag: string;
  effectiveText: string;
  tierLevel: 'ROOT' | 'L2' | 'L3' | 'L4';
  status?: LawRoadmapDocNode['status'];
  docId?: string;
  replacesOrAmends?: string;
  keyArticlesOrScope?: string;
  linkedGates: string[];
  linkedDomains: FunctionalDomainCode[];
  projectAxes: ProjectArchetypeCode[];
  rawNode?: LawRoadmapDocNode;
  cutoffEval?: LegalCutoffEvaluation;
  children?: GenealogyTreeNodeDatum[];
}

interface LawGenealogyTreeDiagramProps {
  pillar: LawRoadmapPillar;
  activeDocId?: string;
  activeProjectArchetype: ProjectArchetypeCode;
  darkTheme?: boolean;
  filterMode?: LegalCutoffFilterMode;
  onChangeFilterMode?: (mode: LegalCutoffFilterMode) => void;
  projectMilestones?: ProjectLegalMilestones;
  onSelectDoc: (docId: string, mode: 'TOC_INDEX' | 'FULL_CONTENT') => void;
  onSelectGate: (gateCode: string) => void;
}

const TIER_COLORS: Record<
  GenealogyTreeNodeDatum['tierLevel'],
  {
    bg: string;
    border: string;
    badgeBg: string;
    badgeText: string;
    stroke: string;
    label: string;
  }
> = {
  ROOT: {
    bg: '#7f1d1d',
    border: '#f87171',
    badgeBg: '#ef4444',
    badgeText: '#ffffff',
    stroke: '#ef4444',
    label: 'BỘ LUẬT GỐC TRUNG TÂM',
  },
  L2: {
    bg: '#312e81',
    border: '#818cf8',
    badgeBg: '#4f46e5',
    badgeText: '#ffffff',
    stroke: '#6366f1',
    label: 'VBHN · VĂN BẢN HỢP NHẤT (CÒN HIỆU LỰC)',
  },
  L3: {
    bg: '#0c4a6e',
    border: '#38bdf8',
    badgeBg: '#0284c7',
    badgeText: '#ffffff',
    stroke: '#0ea5e9',
    label: 'NGHỊ ĐỊNH CHÍNH PHỦ (CÒN HIỆU LỰC)',
  },
  L4: {
    bg: '#064e3b',
    border: '#34d399',
    badgeBg: '#059669',
    badgeText: '#ffffff',
    stroke: '#10b981',
    label: 'THÔNG TƯ HƯỚNG DẪN (CÒN HIỆU LỰC)',
  },
};

export const LawGenealogyTreeDiagram: React.FC<LawGenealogyTreeDiagramProps> = ({
  pillar,
  activeDocId,
  activeProjectArchetype,
  darkTheme = false,
  filterMode: externalFilterMode,
  onChangeFilterMode,
  projectMilestones = PRESET_LEGACY_2023_2024,
  onSelectDoc,
  onSelectGate,
}) => {
  const [internalFilterMode, setInternalFilterMode] =
    useState<LegalCutoffFilterMode>('CURRENT_VALID_ONLY');
  const activeFilterMode: LegalCutoffFilterMode = externalFilterMode ?? internalFilterMode;
  const handleSetFilterMode = (mode: LegalCutoffFilterMode) => {
    if (onChangeFilterMode) {
      onChangeFilterMode(mode);
    } else {
      setInternalFilterMode(mode);
    }
  };

  const regimeInfo = useMemo(
    () => classifyProjectCutoffRegime(projectMilestones),
    [projectMilestones]
  );

  const [layoutOrientation, setLayoutOrientation] = useState<'HORIZONTAL' | 'VERTICAL'>('HORIZONTAL');
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [highlightDomain, setHighlightDomain] = useState<string>('ALL');
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Record<string, boolean>>({});
  const [selectedTreeNodeId, setSelectedTreeNodeId] = useState<string | null>(null);

  // Xây dựng cấu trúc Cây Phả hệ:
  // - Chế độ CURRENT_VALID_ONLY: Chỉ giữ VBHN (L2), Nghị định (L3) & Thông tư (L4) đang còn hiệu lực.
  // - Chế độ PROJECT_TRANSITION: Đối chiếu 3 mốc dự án bằng Legal Cut-off Engine, tự động bảo lưu văn bản chuyển tiếp cũ (NĐ 06/2021, NĐ 15/2021, NĐ 37/2015...) & gắn cảnh báo hồi tố (NĐ 70/2025, TT 12/2025).
  const fullTreeData = useMemo<GenealogyTreeNodeDatum>(() => {
    const tierL1 = pillar.tiers.find(t => t.tierCode === 'L1_ROOT_AND_AMEND_LAWS')?.items || [];
    const rawTierL2 = pillar.tiers.find(t => t.tierCode === 'L2_CONSOLIDATED_AND_OMNIBUS')?.items || [];
    const rawTierL3 = pillar.tiers.find(t => t.tierCode === 'L3_DECREES')?.items || [];
    const rawTierL4 = pillar.tiers.find(t => t.tierCode === 'L4_CIRCULARS_AND_FORMS')?.items || [];

    const isTransitionMode = activeFilterMode === 'PROJECT_TRANSITION';

    const evaluateNode = (item: LawRoadmapDocNode): LegalCutoffEvaluation =>
      evaluateRoadmapNodeCutoff(item, projectMilestones, activeFilterMode);

    const activeL2WithEval = rawTierL2
      .map(item => ({ item, cutoffEval: evaluateNode(item) }))
      .filter(({ item, cutoffEval }) => {
        if (!isTransitionMode) {
          return (
            item.status === 'CON_HIEU_LUC' &&
            (item.relationRole === 'VB_HOP_NHAT' ||
              item.docNumber.includes('VBHN') ||
              item.docNumber.includes('NĐ-CP'))
          );
        }
        return cutoffEval.included;
      });

    const activeL3WithEval = rawTierL3
      .map(item => ({ item, cutoffEval: evaluateNode(item) }))
      .filter(({ item, cutoffEval }) => {
        if (!isTransitionMode) {
          return (
            item.status === 'CON_HIEU_LUC' &&
            (item.relationRole === 'ND_HUONG_DAN' || item.docNumber.includes('NĐ-CP'))
          );
        }
        return cutoffEval.included;
      });

    const activeL4WithEval = rawTierL4
      .map(item => ({ item, cutoffEval: evaluateNode(item) }))
      .filter(({ item, cutoffEval }) => {
        if (!isTransitionMode) {
          return (
            item.status === 'CON_HIEU_LUC' &&
            (item.relationRole === 'TT_HUONG_DAN' || item.docNumber.includes('TT-'))
          );
        }
        return cutoffEval.included;
      });

    const l1Evaluated = tierL1.map(item => ({ item, cutoffEval: evaluateNode(item) }));
    const rootLawEntry = isTransitionMode
      ? l1Evaluated.find(x => x.cutoffEval.included) || l1Evaluated[0]
      : l1Evaluated.find(x => x.item.status === 'CON_HIEU_LUC') || l1Evaluated[0];
    const rootLawItem = rootLawEntry?.item;

    const assignedL4Ids = new Set<string>();

    const makeBadgeForNode = (defaultBadge: string, cutoffEval?: LegalCutoffEvaluation) => {
      if (!isTransitionMode || !cutoffEval) return defaultBadge;
      if (cutoffEval.badgeType === 'TRANSITIONAL_OLD') return '🛡️ CHUYỂN TIẾP HĐ CŨ';
      if (cutoffEval.badgeType === 'MANDATORY_NEW_RETROACTIVE') return '⚡ BẮT BUỘC MỚI/HỒI TỐ';
      if (cutoffEval.badgeType === 'DIRECT_NEW_2026') return '🆕 ÁP DỤNG MỚI 2026';
      return defaultBadge;
    };

    const l2Nodes: GenealogyTreeNodeDatum[] = activeL2WithEval.map(({ item, cutoffEval }) => {
      const primaryDom = item.linkedDomains[0];
      const matchingCirculars = activeL4WithEval.filter(({ item: circ }) => {
        if (assignedL4Ids.has(circ.id)) return false;
        const hasDedicatedL3 = activeL3WithEval.some(
          d => d.item.linkedDomains[0] === primaryDom
        );
        if (!hasDedicatedL3 && circ.linkedDomains[0] === primaryDom) {
          assignedL4Ids.add(circ.id);
          return true;
        }
        return false;
      });

      return {
        id: item.id,
        code: item.docNumber,
        badge: makeBadgeForNode(
          item.relationRole === 'VB_HOP_NHAT' ? 'VBHN · CÒN HIỆU LỰC' : item.docTypeBadge,
          cutoffEval
        ),
        title: item.title,
        relationTag: item.relationLabel,
        effectiveText: item.effectiveNote,
        tierLevel: 'L2' as const,
        status: item.status,
        docId: item.docId,
        replacesOrAmends: item.replacesOrAmends,
        keyArticlesOrScope: item.keyArticlesOrScope,
        linkedGates: item.linkedGates,
        linkedDomains: item.linkedDomains,
        projectAxes: item.projectAxes,
        rawNode: item,
        cutoffEval,
        children:
          matchingCirculars.length > 0
            ? matchingCirculars.map(({ item: c, cutoffEval: cEval }) => ({
                id: c.id,
                code: c.docNumber,
                badge: makeBadgeForNode('THÔNG TƯ · CÒN HIỆU LỰC', cEval),
                title: c.title,
                relationTag: 'Thông tư hướng dẫn thi hành',
                effectiveText: c.effectiveNote,
                tierLevel: 'L4' as const,
                status: c.status,
                docId: c.docId,
                replacesOrAmends: c.replacesOrAmends,
                keyArticlesOrScope: c.keyArticlesOrScope,
                linkedGates: c.linkedGates,
                linkedDomains: c.linkedDomains,
                projectAxes: c.projectAxes,
                rawNode: c,
                cutoffEval: cEval,
              }))
            : undefined,
      };
    });

    const l3Nodes: GenealogyTreeNodeDatum[] = activeL3WithEval.map(
      ({ item: decree, cutoffEval }, dIdx) => {
        const decreePrimaryDomain = decree.linkedDomains[0];

        const matchingL4 = activeL4WithEval.filter(({ item: circ }) => {
          if (assignedL4Ids.has(circ.id)) return false;
          const isMatch =
            circ.linkedDomains[0] === decreePrimaryDomain ||
            (dIdx === activeL3WithEval.length - 1 &&
              circ.linkedDomains.some(dom => decree.linkedDomains.includes(dom)));
          if (isMatch) {
            assignedL4Ids.add(circ.id);
          }
          return isMatch;
        });

        const decreeChildren: GenealogyTreeNodeDatum[] = matchingL4.map(
          ({ item: c, cutoffEval: cEval }) => ({
            id: c.id,
            code: c.docNumber,
            badge: makeBadgeForNode('THÔNG TƯ · CÒN HIỆU LỰC', cEval),
            title: c.title,
            relationTag: 'Thông tư hướng dẫn NĐ',
            effectiveText: c.effectiveNote,
            tierLevel: 'L4' as const,
            status: c.status,
            docId: c.docId,
            replacesOrAmends: c.replacesOrAmends,
            keyArticlesOrScope: c.keyArticlesOrScope,
            linkedGates: c.linkedGates,
            linkedDomains: c.linkedDomains,
            projectAxes: c.projectAxes,
            rawNode: c,
            cutoffEval: cEval,
          })
        );

        return {
          id: decree.id,
          code: decree.docNumber,
          badge: makeBadgeForNode('NGHỊ ĐỊNH · CÒN HIỆU LỰC', cutoffEval),
          title: decree.title,
          relationTag: decree.relationLabel,
          effectiveText: decree.effectiveNote,
          tierLevel: 'L3' as const,
          status: decree.status,
          docId: decree.docId,
          replacesOrAmends: decree.replacesOrAmends,
          keyArticlesOrScope: decree.keyArticlesOrScope,
          linkedGates: decree.linkedGates,
          linkedDomains: decree.linkedDomains,
          projectAxes: decree.projectAxes,
          rawNode: decree,
          cutoffEval,
          children: decreeChildren.length > 0 ? decreeChildren : undefined,
        };
      }
    );

    const remainingL4 = activeL4WithEval.filter(({ item: c }) => !assignedL4Ids.has(c.id));
    if (l3Nodes.length > 0 && remainingL4.length > 0) {
      const targetL3 = l3Nodes[0];
      targetL3.children = [
        ...(targetL3.children || []),
        ...remainingL4.map(({ item: c, cutoffEval: cEval }) => ({
          id: c.id,
          code: c.docNumber,
          badge: makeBadgeForNode('THÔNG TƯ · CÒN HIỆU LỰC', cEval),
          title: c.title,
          relationTag: 'Thông tư hướng dẫn',
          effectiveText: c.effectiveNote,
          tierLevel: 'L4' as const,
          status: c.status,
          docId: c.docId,
          replacesOrAmends: c.replacesOrAmends,
          keyArticlesOrScope: c.keyArticlesOrScope,
          linkedGates: c.linkedGates,
          linkedDomains: c.linkedDomains,
          projectAxes: c.projectAxes,
          rawNode: c,
          cutoffEval: cEval,
        })),
      ];
    }

    return {
      id: rootLawItem?.id || `ROOT-${pillar.id}`,
      code: rootLawItem?.docNumber || pillar.rootLawNumber,
      badge: makeBadgeForNode('BỘ LUẬT GỐC', rootLawEntry?.cutoffEval),
      title: rootLawItem?.title || pillar.fullName,
      relationTag: 'Gốc Phả hệ Pháp lý Trung tâm',
      effectiveText:
        rootLawItem?.effectiveNote || 'Đang có hiệu lực thi hành',
      tierLevel: 'ROOT',
      status: rootLawItem?.status || 'CON_HIEU_LUC',
      docId: rootLawItem?.docId || pillar.rootDocId,
      replacesOrAmends: rootLawItem?.replacesOrAmends,
      keyArticlesOrScope: rootLawItem?.keyArticlesOrScope || pillar.summary,
      linkedGates: rootLawItem?.linkedGates || ['G0', 'G1', 'G5', 'G9', 'G12', 'G14', 'G15'],
      linkedDomains: pillar.primaryDomains,
      projectAxes: pillar.projectAxes,
      rawNode: rootLawItem,
      cutoffEval: rootLawEntry?.cutoffEval,
      children: [...l2Nodes, ...l3Nodes],
    };
  }, [pillar, activeFilterMode, projectMilestones]);

  // Áp dụng đóng/mở nhánh (Collapse/Expand)
  const pruneCollapsedTree = (node: GenealogyTreeNodeDatum): GenealogyTreeNodeDatum => {
    const isCollapsed = !!collapsedNodeIds[node.id];
    if (isCollapsed || !node.children || node.children.length === 0) {
      return {
        ...node,
        children: undefined,
      };
    }
    return {
      ...node,
      children: node.children.map(pruneCollapsedTree),
    };
  };

  const visibleTreeRoot = useMemo(
    () => pruneCollapsedTree(fullTreeData),
    [fullTreeData, collapsedNodeIds]
  );

  // Tính toán tọa độ D3 Tree Layout
  const { nodes, links, svgWidth, svgHeight, nodeMap } = useMemo(() => {
    const rootHierarchy = d3.hierarchy<GenealogyTreeNodeDatum>(visibleTreeRoot);
    const isHorizontal = layoutOrientation === 'HORIZONTAL';

    const dx = isHorizontal ? 108 : 240;
    const dy = isHorizontal ? 330 : 165;

    const treeGenerator = d3.tree<GenealogyTreeNodeDatum>().nodeSize([dx, dy]);
    const treeData = treeGenerator(rootHierarchy);

    const allNodes = treeData.descendants();
    const allLinks = treeData.links();

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    allNodes.forEach(d => {
      const px = isHorizontal ? d.y : d.x;
      const py = isHorizontal ? d.x : d.y;
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
    });

    const padX = isHorizontal ? 170 : 150;
    const padY = isHorizontal ? 85 : 95;

    const width = Math.max(880, maxX - minX + padX * 2);
    const height = Math.max(420, maxY - minY + padY * 2);

    const offsetX = -minX + padX;
    const offsetY = -minY + padY;

    const mapById = new Map<string, GenealogyTreeNodeDatum>();
    const collectRaw = (n: GenealogyTreeNodeDatum) => {
      mapById.set(n.id, n);
      n.children?.forEach(collectRaw);
    };
    collectRaw(fullTreeData);

    const positionedNodes = allNodes.map(d => ({
      ...d,
      renderX: (isHorizontal ? d.y : d.x) + offsetX,
      renderY: (isHorizontal ? d.x : d.y) + offsetY,
      hasOriginalChildren: (mapById.get(d.data.id)?.children?.length || 0) > 0,
      originalChildrenCount: mapById.get(d.data.id)?.children?.length || 0,
    }));

    const positionedLinks = allLinks.map(l => ({
      source: {
        ...l.source,
        renderX: (isHorizontal ? l.source.y : l.source.x) + offsetX,
        renderY: (isHorizontal ? l.source.x : l.source.y) + offsetY,
      },
      target: {
        ...l.target,
        renderX: (isHorizontal ? l.target.y : l.target.x) + offsetX,
        renderY: (isHorizontal ? l.target.x : l.target.y) + offsetY,
      },
    }));

    return {
      nodes: positionedNodes,
      links: positionedLinks,
      svgWidth: width,
      svgHeight: height,
      nodeMap: mapById,
    };
  }, [visibleTreeRoot, layoutOrientation, fullTreeData]);

  const inspectedNode: GenealogyTreeNodeDatum = useMemo(() => {
    if (selectedTreeNodeId && nodeMap.has(selectedTreeNodeId)) {
      return nodeMap.get(selectedTreeNodeId)!;
    }
    if (activeDocId) {
      for (const n of nodeMap.values()) {
        if (n.docId === activeDocId) return n;
      }
    }
    return fullTreeData;
  }, [selectedTreeNodeId, activeDocId, nodeMap, fullTreeData]);

  return (
    <div
      className={`rounded-2xl border overflow-hidden space-y-3 p-3.5 ${
        darkTheme
          ? 'bg-[var(--giay)] border-amber-500/40 text-[var(--chu)]'
          : 'bg-[var(--panel)] border-[#163d5c] text-[var(--chu)] shadow-md'
      }`}
    >
      {/* Thanh tiêu đề & Điều khiển Sơ đồ Cây Phả hệ */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[var(--line)]">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-mono text-xs font-extrabold shadow-xs">
            🌳 SƠ ĐỒ CÂY PHẢ HỆ BỘ LUẬT
          </span>
          <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
            {pillar.icon} {pillar.shortName} ({nodeMap.size} văn bản)
          </span>

          {/* Bộ chuyển đổi Chế độ: Chỉ văn bản còn hiệu lực hiện tại vs Áp dụng theo Mốc chuyển tiếp Dự án */}
          <div className="flex items-center bg-[var(--panel)] p-0.5 rounded-lg border border-[var(--line-d)] text-[10px] font-mono">
            <button
              type="button"
              onClick={() => handleSetFilterMode('CURRENT_VALID_ONLY')}
              className={`px-2 py-1 rounded font-bold transition ${
                activeFilterMode === 'CURRENT_VALID_ONLY'
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'text-[var(--chu-m)] hover:text-[var(--chu)]'
              }`}
              title="Chỉ giữ lại các Nghị định, Thông tư, VBHN đang còn hiệu lực hiện tại"
            >
              🟢 Chỉ VB còn hiệu lực hiện tại
            </button>
            <button
              type="button"
              onClick={() => handleSetFilterMode('PROJECT_TRANSITION')}
              className={`px-2 py-1 rounded font-bold transition ${
                activeFilterMode === 'PROJECT_TRANSITION'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'text-amber-800 dark:text-amber-300 hover:text-[var(--chu)]'
              }`}
              title="Đối chiếu 3 mốc thời gian Dự án để bảo lưu VB chuyển tiếp cũ & cảnh báo quy định bắt buộc mới/hồi tố"
            >
              ⚖️ Áp dụng theo Mốc chuyển tiếp Dự án
            </button>
          </div>
        </div>

        {activeFilterMode === 'PROJECT_TRANSITION' && (
          <div className="w-full p-2 rounded-lg bg-amber-500/10 border border-amber-500/40 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
            <div className="flex flex-wrap items-center gap-2 text-amber-900 dark:text-amber-200">
              <span className="font-bold text-amber-800 dark:text-amber-400">{regimeInfo.label}</span>
              <span className="text-[var(--chu-m)]">
                (CTĐT: <b className="text-[var(--chu)]">{projectMilestones.investmentPolicyDate}</b> · TKBVTC:{' '}
                <b className="text-[var(--chu)]">{projectMilestones.projectDesignApprovalDate}</b> · Ký HĐ:{' '}
                <b className="text-[var(--chu)]">{projectMilestones.constructionContractDate}</b>)
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-400/60 text-emerald-800 dark:text-emerald-300 font-bold">
                🛡️ Bảo lưu chuyển tiếp HĐ/QĐ cũ
              </span>
              <span className="px-1.5 py-0.5 rounded bg-rose-500/10 dark:bg-rose-950/40 border border-rose-400/70 text-rose-800 dark:text-rose-300 font-bold">
                ⚡ Bắt buộc áp dụng mới/hồi tố
              </span>
            </div>
          </div>
        )}

        {/* Bộ công cụ Hướng cây, Thu phóng & Đóng/Mở nhánh */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center bg-[var(--panel)] p-0.5 rounded-lg border border-[var(--line-d)] text-[11px] font-mono">
            <button
              type="button"
              onClick={() => setLayoutOrientation('HORIZONTAL')}
              className={`px-2 py-1 rounded font-bold transition ${
                layoutOrientation === 'HORIZONTAL'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-[var(--chu-m)] hover:text-[var(--chu)]'
              }`}
              title="Sơ đồ Cây Phân nhánh Ngang (Trái sang Phải)"
            >
              ↔ Cây Ngang
            </button>
            <button
              type="button"
              onClick={() => setLayoutOrientation('VERTICAL')}
              className={`px-2 py-1 rounded font-bold transition ${
                layoutOrientation === 'VERTICAL'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-[var(--chu-m)] hover:text-[var(--chu)]'
              }`}
              title="Sơ đồ Cây Phân cấp Đứng (Trên xuống Dưới)"
            >
              ↕ Cây Đứng
            </button>
          </div>

          <div className="flex items-center gap-1 bg-[var(--panel)] px-1.5 py-0.5 rounded-lg border border-[var(--line-d)] text-[11px] font-mono">
            <button
              type="button"
              onClick={() => setZoomScale(s => Math.max(0.6, Math.round((s - 0.1) * 10) / 10))}
              className="px-1.5 py-0.5 rounded hover:bg-[var(--giay-d)] text-[var(--chu-m)] font-bold"
              title="Thu nhỏ sơ đồ cây"
            >
              −
            </button>
            <span className="text-amber-800 dark:text-amber-300 font-bold min-w-[40px] text-center">
              {Math.round(zoomScale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomScale(s => Math.min(1.5, Math.round((s + 0.1) * 10) / 10))}
              className="px-1.5 py-0.5 rounded hover:bg-[var(--giay-d)] text-[var(--chu-m)] font-bold"
              title="Phóng to sơ đồ cây"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => setZoomScale(1)}
              className="px-1.5 py-0.5 rounded bg-[var(--giay-d)] hover:bg-[var(--giay-d)] text-sky-800 dark:text-sky-300 text-[10px]"
              title="Đặt lại tỷ lệ 100%"
            >
              100%
            </button>
          </div>

          <button
            type="button"
            onClick={() => setCollapsedNodeIds({})}
            className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300 font-mono text-[10px] font-bold transition"
          >
            + Mở hết nhánh
          </button>
          <button
            type="button"
            onClick={() => {
              const nextCollapsed: Record<string, boolean> = {};
              fullTreeData.children?.forEach(c => {
                if (c.children && c.children.length > 0) {
                  nextCollapsed[c.id] = true;
                }
              });
              setCollapsedNodeIds(nextCollapsed);
            }}
            className="px-2 py-1 rounded-lg bg-[var(--panel)] hover:bg-[var(--giay-d)] border border-[var(--line-d)] text-[var(--chu-m)] font-mono text-[10px] transition"
          >
            − Thu gọn nhánh Thông tư (L4)
          </button>
        </div>
      </div>

      {/* Chú giải Cấp bậc Phả hệ + Lọc làm nổi bật theo Mảng Chức năng */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
        <div className="flex flex-wrap items-center gap-1.5">
          {(Object.keys(TIER_COLORS) as Array<GenealogyTreeNodeDatum['tierLevel']>).map(lvl => (
            <span
              key={lvl}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded border"
              style={{
                backgroundColor: TIER_COLORS[lvl].bg,
                borderColor: TIER_COLORS[lvl].border,
                color: '#f8fafc',
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: TIER_COLORS[lvl].border }}
              />
              <span>{TIER_COLORS[lvl].label}</span>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[var(--chu-m)]">Soi nhánh theo mảng:</span>
          <button
            type="button"
            onClick={() => setHighlightDomain('ALL')}
            className={`px-1.5 py-0.5 rounded border transition ${
              highlightDomain === 'ALL'
                ? 'bg-amber-400 text-slate-950 border-white font-bold'
                : 'bg-[var(--panel)] text-[var(--chu-m)] border-[var(--line-d)] hover:text-[var(--chu)]'
            }`}
          >
            Tất cả
          </button>
          {pillar.primaryDomains.map(dom => (
            <button
              key={dom}
              type="button"
              onClick={() => setHighlightDomain(highlightDomain === dom ? 'ALL' : dom)}
              className={`px-1.5 py-0.5 rounded border transition ${
                highlightDomain === dom
                  ? 'bg-sky-400 text-slate-950 border-white font-bold'
                  : 'bg-[var(--panel)] text-sky-800 dark:text-sky-300 border-[var(--line-d)] hover:border-sky-400'
              }`}
            >
              {dom}
            </button>
          ))}
        </div>
      </div>

      {/* VÙNG VẼ SƠ ĐỒ CÂY PHẢ HỆ TƯƠNG TÁC (SVG CANVAS) */}
      <div className="relative w-full overflow-auto rounded-xl bg-[var(--giay-soft)] border border-[var(--line)] max-h-[540px] shadow-inner">
        <div
          style={{
            width: `${Math.round(svgWidth * zoomScale)}px`,
            height: `${Math.round(svgHeight * zoomScale)}px`,
          }}
        >
          <svg
            width={Math.round(svgWidth * zoomScale)}
            height={Math.round(svgHeight * zoomScale)}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="select-none"
          >
            <defs>
              <pattern id="genealogy-grid" width="28" height="28" patternUnits="userSpaceOnUse">
                <path
                  d="M 28 0 L 0 0 0 28"
                  fill="none"
                  stroke="rgba(148, 163, 184, 0.06)"
                  strokeWidth="1"
                />
              </pattern>
              <marker
                id="genealogy-arrow"
                viewBox="0 -5 10 10"
                refX="8"
                refY="0"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M0,-4L10,0L0,4" fill="#38bdf8" />
              </marker>
            </defs>

            <rect width={svgWidth} height={svgHeight} fill="url(#genealogy-grid)" />

            {/* Vẽ các đường nối nhánh Phả hệ (Curved Bezier Connectors) */}
            <g>
              {links.map((link, idx) => {
                const isHorizontal = layoutOrientation === 'HORIZONTAL';
                const nodeW = 248;
                const nodeH = 78;

                const sx = isHorizontal
                  ? link.source.renderX + nodeW / 2
                  : link.source.renderX;
                const sy = isHorizontal
                  ? link.source.renderY
                  : link.source.renderY + nodeH / 2;

                const tx = isHorizontal
                  ? link.target.renderX - nodeW / 2
                  : link.target.renderX;
                const ty = isHorizontal
                  ? link.target.renderY
                  : link.target.renderY - nodeH / 2;

                const pathD = isHorizontal
                  ? `M ${sx} ${sy} C ${(sx + tx) / 2} ${sy}, ${(sx + tx) / 2} ${ty}, ${tx} ${ty}`
                  : `M ${sx} ${sy} C ${sx} ${(sy + ty) / 2}, ${tx} ${(sy + ty) / 2}, ${tx} ${ty}`;

                const targetStyle = TIER_COLORS[link.target.data.tierLevel];
                const isDomainHighlighted =
                  highlightDomain === 'ALL' ||
                  link.target.data.linkedDomains.includes(highlightDomain as FunctionalDomainCode);

                const midX = (sx + tx) / 2;
                const midY = (sy + ty) / 2;

                const relationShort =
                  link.target.data.tierLevel === 'L2'
                    ? 'VB Hợp nhất'
                    : link.target.data.tierLevel === 'L3'
                    ? 'Nghị định quy định'
                    : 'Thông tư hướng dẫn';

                return (
                  <g
                    key={`link-${idx}`}
                    style={{ opacity: isDomainHighlighted ? 1 : 0.2 }}
                  >
                    <path
                      d={pathD}
                      fill="none"
                      stroke={targetStyle.stroke}
                      strokeWidth={isDomainHighlighted && highlightDomain !== 'ALL' ? 2.6 : 1.8}
                      strokeDasharray={
                        link.target.data.tierLevel === 'L2'
                          ? '5,3'
                          : undefined
                      }
                      markerEnd="url(#genealogy-arrow)"
                    />
                    <rect
                      x={midX - 44}
                      y={midY - 8}
                      width={88}
                      height={15}
                      rx={4}
                      fill="var(--panel)"
                      stroke={targetStyle.border}
                      strokeWidth={0.7}
                    />
                    <text
                      x={midX}
                      y={midY + 2.5}
                      textAnchor="middle"
                      fill="var(--chu-m)"
                      fontSize="8.5"
                      fontFamily="monospace"
                    >
                      {relationShort}
                    </text>
                  </g>
                );
              })}
            </g>

            {/* Vẽ các Nút Văn bản trong Cây Phả hệ */}
            <g>
              {nodes.map(node => {
                const d = node.data;
                const style = TIER_COLORS[d.tierLevel];
                const nodeW = 248;
                const nodeH = 78;
                const x = node.renderX - nodeW / 2;
                const y = node.renderY - nodeH / 2;

                const isSelected = inspectedNode.id === d.id;
                const isActiveDoc = d.docId && d.docId === activeDocId;
                const isMatchesProject = d.projectAxes.includes(activeProjectArchetype);
                const isDomainHighlighted =
                  highlightDomain === 'ALL' ||
                  d.linkedDomains.includes(highlightDomain as FunctionalDomainCode);
                const isCollapsed = !!collapsedNodeIds[d.id];

                const cutoffBadgeType = d.cutoffEval?.badgeType;
                const isTransitionalOld =
                  activeFilterMode === 'PROJECT_TRANSITION' &&
                  cutoffBadgeType === 'TRANSITIONAL_OLD';
                const isMandatoryRetro =
                  activeFilterMode === 'PROJECT_TRANSITION' &&
                  cutoffBadgeType === 'MANDATORY_NEW_RETROACTIVE';
                const isNew2026 =
                  activeFilterMode === 'PROJECT_TRANSITION' &&
                  cutoffBadgeType === 'DIRECT_NEW_2026';

                const badgeFill = isTransitionalOld
                  ? '#d97706'
                  : isMandatoryRetro
                  ? '#dc2626'
                  : isNew2026
                  ? '#0284c7'
                  : style.badgeBg;
                const borderStroke =
                  isSelected || isActiveDoc
                    ? '#facc15'
                    : isMandatoryRetro
                    ? '#fb7185'
                    : isTransitionalOld
                    ? '#fbbf24'
                    : style.border;

                return (
                  <g
                    key={d.id}
                    transform={`translate(${x}, ${y})`}
                    onClick={() => setSelectedTreeNodeId(d.id)}
                    onDoubleClick={() => {
                      if (d.docId) {
                        onSelectDoc(d.docId, 'TOC_INDEX');
                      }
                    }}
                    className="cursor-pointer transition-opacity"
                    style={{ opacity: isDomainHighlighted ? 1 : 0.25 }}
                  >
                    {/* Khung thẻ Node */}
                    <rect
                      width={nodeW}
                      height={nodeH}
                      rx={10}
                      fill={style.bg}
                      stroke={borderStroke}
                      strokeWidth={isSelected || isActiveDoc || isMandatoryRetro || isTransitionalOld ? 2.4 : 1.5}
                      strokeDasharray={isTransitionalOld ? '6,2' : undefined}
                    />

                    {/* Thanh màu bên trái */}
                    <rect
                      x={0}
                      y={0}
                      width={6}
                      height={nodeH}
                      rx={3}
                      fill={
                        isSelected
                          ? '#facc15'
                          : isMandatoryRetro
                          ? '#fb7185'
                          : isTransitionalOld
                          ? '#fbbf24'
                          : style.border
                      }
                    />

                    {/* Hàng 1: Badge loại văn bản / Chuyển tiếp / Hồi tố + Dự án */}
                    <rect
                      x={12}
                      y={8}
                      width={Math.min(168, d.badge.length * 6.0 + 14)}
                      height={16}
                      rx={4}
                      fill={badgeFill}
                    />
                    <text
                      x={17}
                      y={19}
                      fill={style.badgeText}
                      fontSize="8.2"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {d.badge.slice(0, 26)}
                    </text>

                    {isMatchesProject && (
                      <g transform={`translate(${nodeW - 56}, 8)`}>
                        <rect
                          width={48}
                          height={15}
                          rx={4}
                          fill="#065f46"
                          stroke="#34d399"
                          strokeWidth={0.8}
                        />
                        <text
                          x={24}
                          y={10.5}
                          textAnchor="middle"
                          fill="#a7f3d0"
                          fontSize="8"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          {activeProjectArchetype}
                        </text>
                      </g>
                    )}

                    {/* Hàng 2: Số hiệu Văn bản */}
                    <text
                      x={12}
                      y={38}
                      fill="#ffffff"
                      fontSize="11"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {d.code.length > 29 ? `${d.code.slice(0, 28)}…` : d.code}
                    </text>

                    {/* Hàng 3: Trích yếu ngắn */}
                    <text x={12} y={53} fill="#e2e8f0" fontSize="9.5">
                      {d.title.length > 36 ? `${d.title.slice(0, 35)}…` : d.title}
                    </text>

                    {/* Hàng 4: Mảng chức năng & Các Gate liên kết */}
                    <text x={12} y={68} fill="#93c5fd" fontSize="8.5" fontFamily="monospace">
                      Mảng: {d.linkedDomains.slice(0, 3).join(', ')} · Gate:{' '}
                      {d.linkedGates.slice(0, 4).join(', ')}
                    </text>

                    {/* Nút đóng/mở nhánh con (+/-) nếu Node có các văn bản con (ví dụ Nghị định có Thông tư & QCVN) */}
                    {node.hasOriginalChildren && (
                      <g
                        transform={
                          layoutOrientation === 'HORIZONTAL'
                            ? `translate(${nodeW - 12}, ${nodeH / 2})`
                            : `translate(${nodeW / 2}, ${nodeH - 2})`
                        }
                        onClick={e => {
                          e.stopPropagation();
                          setCollapsedNodeIds(prev => ({
                            ...prev,
                            [d.id]: !prev[d.id],
                          }));
                        }}
                      >
                        <circle
                          r={10}
                          fill={isCollapsed ? '#f59e0b' : 'var(--panel)'}
                          stroke="#facc15"
                          strokeWidth={1.5}
                        />
                        <text
                          x={0}
                          y={3.5}
                          textAnchor="middle"
                          fill={isCollapsed ? '#0f172a' : '#facc15'}
                          fontSize="10"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          {isCollapsed ? `+${node.originalChildrenCount}` : '−'}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      </div>

      {/* HỘP CHI TIẾT NÚT PHẢ HỆ ĐANG CHỌN (NODE INSPECTOR PANEL) */}
      <div className="p-3.5 rounded-xl bg-[var(--panel)] border border-amber-500/40 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-mono text-[10px] font-extrabold">
              🔍 NÚT PHẢ HỆ ĐANG CHỌN: {inspectedNode.badge}
            </span>
            <span className="font-mono font-extrabold text-sm text-[var(--chu)]">
              {inspectedNode.code}
            </span>
            <span className="text-[11px] font-mono text-emerald-800 dark:text-emerald-400">
              ({inspectedNode.effectiveText})
            </span>
          </div>
          <div className="text-xs font-bold text-amber-900 dark:text-amber-200">{inspectedNode.title}</div>
          {activeFilterMode === 'PROJECT_TRANSITION' && inspectedNode.cutoffEval && (
            <div
              className={`p-2 rounded-lg border text-[11px] leading-snug ${
                inspectedNode.cutoffEval.badgeType === 'MANDATORY_NEW_RETROACTIVE'
                  ? 'bg-rose-500/10 dark:bg-rose-950/40 border-rose-500/60 text-rose-900 dark:text-rose-200'
                  : inspectedNode.cutoffEval.badgeType === 'TRANSITIONAL_OLD'
                  ? 'bg-amber-500/10 dark:bg-amber-950/30 border-amber-500/60 text-amber-900 dark:text-amber-100'
                  : 'bg-emerald-500/10 dark:bg-emerald-950/40 border-emerald-500/50 text-emerald-900 dark:text-emerald-200'
              }`}
            >
              <span className="font-mono font-extrabold mr-1.5">
                {inspectedNode.cutoffEval.badgeLabel}:
              </span>
              <span>{inspectedNode.cutoffEval.reason}</span>{' '}
              <span className="text-[var(--chu-m)] font-mono text-[10px]">
                ({inspectedNode.cutoffEval.basisLaw})
              </span>
            </div>
          )}
          {inspectedNode.replacesOrAmends && (
            <div className="text-[11px] text-indigo-800 dark:text-indigo-300 font-mono">
              🔄 Quan hệ sửa đổi / kế thừa: <b>{inspectedNode.replacesOrAmends}</b>
            </div>
          )}
          {inspectedNode.keyArticlesOrScope && (
            <p className="text-xs text-[var(--chu-m)] leading-relaxed">
              {inspectedNode.keyArticlesOrScope}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {inspectedNode.linkedGates.slice(0, 4).map(gCode => (
            <button
              key={gCode}
              type="button"
              onClick={() => onSelectGate(gCode)}
              className="px-2 py-1 rounded-lg bg-[var(--giay)] hover:bg-amber-500 hover:text-slate-950 text-amber-800 dark:text-amber-300 border border-amber-500/40 font-mono text-[10px] font-bold transition"
              title={`Chuyển sang Bước 3: Cổng kiểm soát ${gCode}`}
            >
              🧭 Gate {gCode}
            </button>
          ))}
          {inspectedNode.docId && (
            <>
              <button
                type="button"
                onClick={() => onSelectDoc(inspectedNode.docId!, 'TOC_INDEX')}
                className="px-2.5 py-1.5 rounded-lg bg-[#a61b1b] hover:bg-[#8b1616] text-white text-xs font-bold transition"
              >
                📕 Mở Mục lục
              </button>
              <button
                type="button"
                onClick={() => onSelectDoc(inspectedNode.docId!, 'FULL_CONTENT')}
                className="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition"
              >
                📄 Đọc Toàn văn
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
