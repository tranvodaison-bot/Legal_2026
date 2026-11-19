import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { StepContextType } from '../../App';
import {
  fetchDataFoundationBiOverview,
  getDataFoundationExcelExportUrl,
  ingestFolderToDataFoundation,
  searchDataFoundationClauses,
  syncDocsToDataFoundation,
  triggerDataFoundationEtl,
} from '../../services/ssotBridgeService';
import {
  computeClientVbplBiOverview,
  searchClientVbplClauses,
  VbplBiOverviewPayload,
  VbplFtsSearchHit,
} from '../../utils/vbplDataFoundationEngine';

export interface Step6DataFoundationBiProps {
  ctx: StepContextType;
}

type BiSubTab = 'OVERVIEW' | 'LAKE_MODEL' | 'DQ_ANALYST' | 'RELATIONS' | 'FTS_SEARCH';

const PHASE_LABELS: Record<'CHUAN_BI' | 'THUC_HIEN' | 'KET_THUC', string> = {
  CHUAN_BI: 'Giai đoạn Chuẩn bị (G0–G6)',
  THUC_HIEN: 'Giai đoạn Thực hiện (G7–G13)',
  KET_THUC: 'Giai đoạn Kết thúc (G14–G16)',
};

export const Step6DataFoundationBi: React.FC<Step6DataFoundationBiProps> = ({ ctx }) => {
  const { legalDocs, activeProjectArchetype, articlePersonalNotes, showToast } = ctx;

  const [subTab, setSubTab] = useState<BiSubTab>('OVERVIEW');
  const [liveOverview, setLiveOverview] = useState<VbplBiOverviewPayload | null>(null);
  const [isSidecarConnected, setIsSidecarConnected] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [folderInput, setFolderInput] = useState('');

  // FTS5 search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHits, setSearchHits] = useState<VbplFtsSearchHit[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchSource, setSearchSource] = useState<'SQLITE_FTS5' | 'CLIENT_MEMORY'>('CLIENT_MEMORY');

  const personalNoteCount = useMemo(
    () => Object.keys(articlePersonalNotes || {}).length,
    [articlePersonalNotes]
  );

  const clientOverview = useMemo(
    () => computeClientVbplBiOverview(legalDocs, personalNoteCount),
    [legalDocs, personalNoteCount]
  );

  const refreshLiveLake = useCallback(async () => {
    const remote = await fetchDataFoundationBiOverview();
    if (remote && Array.isArray(remote.ba_kpis)) {
      setLiveOverview({
        ...(remote as unknown as VbplBiOverviewPayload),
        source_mode: 'LOCAL_LAKE_8008',
      });
      setIsSidecarConnected(true);
    } else {
      setLiveOverview(null);
      setIsSidecarConnected(false);
    }
  }, []);

  useEffect(() => {
    void refreshLiveLake();
  }, [refreshLiveLake]);

  const overview: VbplBiOverviewPayload =
    isSidecarConnected && liveOverview && liveOverview.summary.total_documents > 0
      ? liveOverview
      : clientOverview;

  const handleSyncAppDocsToLake = async () => {
    setIsBusy(true);
    try {
      const payload = legalDocs.map(d => ({
        id: d.id,
        ssotFileName: d.ssotFileName,
        originalName: d.ssotFileName,
        docType: d.docType,
        issuer: d.issuer,
        docNumber: d.docNumber,
        year: d.year,
        primaryDomain: d.primaryDomain,
        title: d.title,
        issueDate: d.issueDate,
        effectiveDate: d.effectiveDate,
        status: d.status,
        isAmended: d.isAmended,
        projectAxes: d.projectAxes,
        linkedGates: d.linkedGates,
        tags: d.tags || [],
        nodes: d.nodes || [],
      }));
      const res = await syncDocsToDataFoundation(payload, 'WEB_APP_SYNC');
      if (!res) {
        showToast(
          'Sidecar :8008 chưa chạy — đang hiển thị BI ở chế độ Client Analytics Mirror.'
        );
        return;
      }
      await refreshLiveLake();
      showToast(
        `Đã đồng bộ ${payload.length} VBPL vào Data Lake (Bronze→Silver→Gold Parquet + SQLite FTS5) trên SSD E:\\.`
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleRunEtl = async () => {
    setIsBusy(true);
    try {
      const res = await triggerDataFoundationEtl();
      if (!res) {
        showToast('Sidecar :8008 chưa bật — không thể chạy ETL cục bộ trên ổ E:\\.');
        return;
      }
      await refreshLiveLake();
      showToast(`Đã chạy lại Medallion ETL (${String(res.run_id || 'OK')}) thành công.`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleIngestLocalFolder = async () => {
    if (!folderInput.trim()) {
      showToast('Vui lòng nhập đường dẫn thư mục chứa file PDF/DOCX trên máy trạm.');
      return;
    }
    setIsBusy(true);
    try {
      const res = await ingestFolderToDataFoundation(folderInput.trim(), activeProjectArchetype);
      await refreshLiveLake();
      const ing = (res.ingestion || {}) as { ingested_records?: number };
      showToast(
        `Đã nạp ${ing.ingested_records ?? 0} tệp từ thư mục cục bộ vào Bronze và cập nhật toàn bộ 6 tầng.`
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Lỗi nạp thư mục vào Data Lake.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleRunSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = searchQuery.trim();
    if (!q) {
      setSearchHits([]);
      return;
    }
    setIsSearching(true);
    try {
      if (isSidecarConnected) {
        const remote = await searchDataFoundationClauses(q, 30);
        if (remote) {
          setSearchHits(remote.hits as unknown as VbplFtsSearchHit[]);
          setSearchSource('SQLITE_FTS5');
          return;
        }
      }
      setSearchHits(searchClientVbplClauses(legalDocs, q, 30));
      setSearchSource('CLIENT_MEMORY');
    } finally {
      setIsSearching(false);
    }
  };

  const maxDomainCount = Math.max(
    1,
    ...overview.charts.by_domain.map(d => d.doc_count)
  );
  const maxYearCount = Math.max(
    1,
    ...overview.charts.by_year.map(y => y.doc_count)
  );

  return (
    <div className="h-full overflow-y-auto bg-slate-950 text-slate-100 p-4 md:p-6 space-y-5">
      {/* HEADER BAR */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 md:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-cyan-500/15 border border-cyan-500/40 text-cyan-300">
              Single-User Pilot · VBPL Data Foundation
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                isSidecarConnected
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
              }`}
            >
              {isSidecarConnected
                ? '🟢 LIVE Local Lake (:8008 · Parquet + SQLite FTS5 trên SSD E:\\)'
                : '🟡 Client Analytics Mirror (Bật Sidecar :8008 để ghi Bronze/Silver/Gold lên SSD E:\\)'}
            </span>
          </div>
          <h2 className="text-lg md:text-xl font-extrabold text-white tracking-tight">
            Kiến trúc 6 Tầng: Data → Data Lake → Model Data → Data Analyst → BA → BI
          </h2>
          <p className="text-xs text-slate-400">
            Kho mẫu chuẩn hóa riêng cho phân hệ Quản lý Văn bản Pháp luật (1 người sử dụng) — sẵn sàng mở rộng đa phân hệ & nâng cấp PostgreSQL/Supabase.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={isBusy}
            onClick={handleSyncAppDocsToLake}
            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition shadow-sm"
          >
            {isBusy ? '⏳ Đang xử lý...' : `⬆️ Đồng bộ ${legalDocs.length} VB vào Data Lake`}
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={handleRunEtl}
            className="px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold transition"
          >
            🔄 Chạy Medallion ETL
          </button>
          {isSidecarConnected && (
            <a
              href={getDataFoundationExcelExportUrl()}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold transition"
            >
              📊 Xuất Excel BI (.xlsx)
            </a>
          )}
        </div>
      </div>

      {/* 6-LAYER PIPELINE STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5">
        {overview.architecture_layers.map(layer => (
          <div
            key={layer.code}
            className={`rounded-xl p-3 border transition ${
              layer.status === 'ACTIVE'
                ? 'bg-slate-900/90 border-cyan-500/35'
                : 'bg-slate-900/50 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[10px] font-mono font-bold text-cyan-400">
                TẦNG {layer.step} · {layer.code}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  layer.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-slate-600'
                }`}
              />
            </div>
            <div className="text-xs font-bold text-white leading-snug">{layer.label}</div>
            <div className="text-[11px] font-mono text-slate-400 mt-1.5">{layer.metric}</div>
          </div>
        ))}
      </div>

      {/* SUB-NAVIGATION TABS */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        {(
          [
            { id: 'OVERVIEW', label: '📊 Tầng 5–6: BA KPIs & BI Dashboard' },
            { id: 'LAKE_MODEL', label: '🗄️ Tầng 1–3: Data Lake & Star Schema' },
            { id: 'DQ_ANALYST', label: '🧪 Tầng 4: Data Quality Profiler' },
            { id: 'RELATIONS', label: `🔗 Radar Sửa đổi/Bãi bỏ (${overview.relation_radar.length})` },
            { id: 'FTS_SEARCH', label: '🔍 Tra cứu Toàn văn FTS5' },
          ] as Array<{ id: BiSubTab; label: string }>
        ).map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubTab(tab.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition ${
              subTab === tab.id
                ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-xs'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* VIEW 1: BA KPIs & BI DASHBOARD */}
      {subTab === 'OVERVIEW' && (
        <div className="space-y-5">
          {/* 6 BA KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {overview.ba_kpis.map(kpi => {
              const badgeCls =
                kpi.status === 'PASS'
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                  : kpi.status === 'WARN'
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                  : 'bg-rose-500/15 text-rose-300 border-rose-500/40';
              const barCls =
                kpi.status === 'PASS'
                  ? 'bg-emerald-400'
                  : kpi.status === 'WARN'
                  ? 'bg-amber-400'
                  : 'bg-rose-400';
              const pct =
                kpi.unit === '%' || kpi.unit === '/100'
                  ? Math.min(100, Math.max(0, kpi.value))
                  : kpi.value === 0
                  ? 100
                  : Math.max(15, 100 - kpi.value * 12);

              return (
                <div
                  key={kpi.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-slate-200">{kpi.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeCls}`}>
                      {kpi.status}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-white tabular-nums">{kpi.value}</span>
                    <span className="text-xs font-mono text-slate-400">{kpi.unit}</span>
                    <span className="ml-auto text-[11px] font-mono text-slate-500">
                      Mục tiêu: {kpi.id === 'KPI_CONFLICT_ALERTS' ? `≤ ${kpi.target}` : `≥ ${kpi.target}${kpi.unit}`}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div className={`h-full rounded-full ${barCls}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-[11px] text-slate-400">{kpi.formula}</div>
                </div>
              );
            })}
          </div>

          {/* BA Actionable Insights */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2.5">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
              🎯 Khuyến nghị Hành động Tự động (Tầng 5 — BA Decision Rules)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {overview.ba_insights.map((ins, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border text-xs space-y-1 ${
                    ins.priority === 'P0'
                      ? 'bg-rose-950/35 border-rose-500/40'
                      : ins.priority === 'P1'
                      ? 'bg-amber-950/30 border-amber-500/35'
                      : 'bg-emerald-950/30 border-emerald-500/35'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-slate-950 font-mono text-[10px] font-bold text-white">
                      {ins.priority}
                    </span>
                    <span className="text-[10px] font-mono uppercase text-slate-400">{ins.layer}</span>
                  </div>
                  <div className="font-bold text-white">{ins.title}</div>
                  <div className="text-slate-300">{ins.action}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Charts Grid: Domain & Doc Type / Year */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* By Domain */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">
                  Phân bố theo 11 Lĩnh vực chuyên môn (Silver → Gold)
                </h3>
                <span className="text-[11px] font-mono text-slate-400">
                  {overview.summary.total_documents} VB · {overview.summary.total_articles} Điều
                </span>
              </div>
              <div className="space-y-2">
                {overview.charts.by_domain.map(row => (
                  <div key={row.domain_code} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200 truncate pr-2">
                        <span className="font-mono text-amber-300 mr-1.5">{row.domain_code}</span>
                        {row.domain_name}
                      </span>
                      <span className="font-mono text-[11px] text-slate-300 shrink-0 tabular-nums">
                        {row.doc_count} VB · DQ {row.avg_dq_score}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400"
                        style={{ width: `${Math.max(6, (row.doc_count / maxDomainCount) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* By Doc Type & Yearly Trend */}
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-sky-300">
                  Phân bố theo Cấp Văn bản (dim_doc_type)
                </h3>
                <div className="flex flex-wrap gap-2">
                  {overview.charts.by_doc_type.map(dt => (
                    <div
                      key={dt.doc_type_code}
                      className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs min-w-[115px]"
                    >
                      <div className="font-mono font-bold text-rose-300">{dt.doc_type_code}</div>
                      <div className="text-[11px] text-slate-400 truncate">{dt.doc_type_name}</div>
                      <div className="mt-1 font-extrabold text-white tabular-nums">
                        {dt.doc_count} VB{' '}
                        <span className="text-[10px] font-normal text-slate-500">
                          (DQ {dt.avg_dq_score})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-300">
                  Xu hướng Ban hành theo Năm (dim_time)
                </h3>
                <div className="flex items-end gap-2 h-32 pt-4">
                  {overview.charts.by_year.map(yr => {
                    const hPct = Math.max(12, Math.round((yr.doc_count / maxYearCount) * 100));
                    return (
                      <div key={yr.issue_year} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                        <span className="text-[10px] font-mono font-bold text-emerald-300 tabular-nums">
                          {yr.doc_count}
                        </span>
                        <div
                          className="w-full max-w-[36px] rounded-t-md bg-gradient-to-t from-sky-600 to-cyan-400"
                          style={{ height: `${hPct}%` }}
                          title={`Năm ${yr.issue_year}: ${yr.doc_count} VB (${yr.active_count} hiệu lực)`}
                        />
                        <span className="text-[10px] font-mono text-slate-400">{yr.issue_year}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Stage-Gate G0-G16 Legal Readiness Heatmap */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
                🧭 Ma trận Độ phủ Pháp lý theo 17 Cổng Stage-Gate (G0–G16)
              </h3>
              <span className="text-[11px] font-mono text-slate-400">
                Xanh: ≥ 2 VB hiệu lực · Vàng: 1 VB · Đỏ: Chưa có VB dẫn chiếu
              </span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {(['CHUAN_BI', 'THUC_HIEN', 'KET_THUC'] as const).map(phase => (
                <div key={phase} className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2">
                  <div className="text-[11px] font-bold uppercase text-sky-300">
                    {PHASE_LABELS[phase]}
                  </div>
                  <div className="space-y-1.5">
                    {overview.charts.gate_coverage
                      .filter(g => g.phase_code === phase)
                      .map(g => {
                        const cls =
                          g.active_doc_count >= 2
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                            : g.active_doc_count === 1
                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                            : 'bg-rose-500/15 border-rose-500/40 text-rose-200';
                        return (
                          <div
                            key={g.gate_code}
                            className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border text-xs ${cls}`}
                          >
                            <span className="truncate">
                              <b className="font-mono mr-1.5">{g.gate_code}</b>
                              {g.gate_name}
                            </span>
                            <span className="font-mono font-bold text-[11px] shrink-0 tabular-nums">
                              {g.active_doc_count} VB
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: DATA LAKE & STAR SCHEMA */}
      {subTab === 'LAKE_MODEL' && (
        <div className="space-y-4">
          {/* Local Folder Ingest Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-300">
              📥 Tầng 1 (DATA) — Nạp trực tiếp thư mục PDF / DOCX trên máy trạm vào Bronze Zone
            </h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={folderInput}
                onChange={e => setFolderInput(e.target.value)}
                placeholder="VD: E:\1. Tai_nguyen\VBPL_2026_PDF"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
              />
              <button
                type="button"
                disabled={isBusy || !isSidecarConnected}
                onClick={handleIngestLocalFolder}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold transition"
              >
                Quét & Nạp vào Bronze → Gold
              </button>
            </div>
            {!isSidecarConnected && (
              <p className="text-[11px] text-amber-300">
                Cần khởi chạy Local Sidecar (`python -B desktop-sidecar/local_scanner_engine.py` cổng `:8008`) để đọc tệp trực tiếp trên ổ cứng và ghi xuống `.local_data/vbpl/`.
              </p>
            )}
          </div>

          {/* Storage Zones */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-4 space-y-1.5">
              <div className="text-xs font-extrabold text-amber-300">01_bronze (Raw Immutable)</div>
              <div className="text-[11px] font-mono text-slate-400 break-all">
                {overview.lake_status?.storage_layers.bronze.path ||
                  '.local_data/vbpl/01_bronze'}
              </div>
              <div className="text-xs text-slate-200 pt-1">
                {overview.lake_status
                  ? `${overview.lake_status.storage_layers.bronze.batch_files} batch JSONL · ${overview.lake_status.storage_layers.bronze.size_kb} KB`
                  : 'Chờ kết nối Sidecar :8008'}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-500/40 rounded-xl p-4 space-y-1.5">
              <div className="text-xs font-extrabold text-slate-200">02_silver (Parquet Cleaned)</div>
              <div className="text-[11px] font-mono text-slate-400 break-all">
                {overview.lake_status?.storage_layers.silver.parquet_files.join(', ') ||
                  'vbpl_documents.parquet, vbpl_clauses.parquet, vbpl_relations.parquet'}
              </div>
              <div className="text-xs text-slate-200 pt-1">
                {overview.lake_status
                  ? `${overview.lake_status.storage_layers.silver.size_kb} KB (PyArrow Parquet)`
                  : 'Chờ chạy ETL'}
              </div>
            </div>

            <div className="bg-slate-900 border border-yellow-500/40 rounded-xl p-4 space-y-1.5">
              <div className="text-xs font-extrabold text-yellow-300">03_gold (Analytics Marts)</div>
              <div className="text-[11px] font-mono text-slate-400 break-all">
                {overview.lake_status?.storage_layers.gold.parquet_files.join(', ') ||
                  'mart_vbpl_portfolio.parquet, mart_vbpl_coverage_matrix.parquet, mart_vbpl_amendment_radar.parquet'}
              </div>
              <div className="text-xs text-slate-200 pt-1">
                {overview.lake_status
                  ? `${overview.lake_status.storage_layers.gold.size_kb} KB (Gold Parquet)`
                  : 'Chờ chạy ETL'}
              </div>
            </div>

            <div className="bg-slate-900 border border-cyan-500/40 rounded-xl p-4 space-y-1.5">
              <div className="text-xs font-extrabold text-cyan-300">04_warehouse (SQLite WAL + FTS5)</div>
              <div className="text-[11px] font-mono text-slate-400 break-all">
                {overview.lake_status?.storage_layers.warehouse_sqlite.path ||
                  '.local_data/vbpl/04_warehouse/vbpl_warehouse.sqlite'}
              </div>
              <div className="text-xs text-slate-200 pt-1">
                {overview.lake_status
                  ? `${overview.lake_status.storage_layers.warehouse_sqlite.size_kb} KB · 6 Dim + Fact/Bridge`
                  : 'Star Schema sẵn sàng'}
              </div>
            </div>
          </div>

          {/* Star Schema Table Counts */}
          {overview.lake_status?.storage_layers.warehouse_sqlite.table_counts && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">
                Tầng 3 (MODEL DATA) — Số bản ghi trong Star Schema (`vbpl_warehouse.sqlite`)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-2">
                {Object.entries(overview.lake_status.storage_layers.warehouse_sqlite.table_counts).map(
                  ([tbl, cnt]) => (
                    <div
                      key={tbl}
                      className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs"
                    >
                      <div className="font-mono text-[10px] text-slate-400 truncate" title={tbl}>
                        {tbl}
                      </div>
                      <div className="text-base font-extrabold text-white tabular-nums mt-0.5">
                        {cnt}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: DATA QUALITY PROFILER */}
      {subTab === 'DQ_ANALYST' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-slate-900 border border-cyan-500/40 rounded-xl p-3.5">
              <div className="text-[11px] text-slate-400">Điểm DQ tổng hợp</div>
              <div className="text-2xl font-black text-cyan-300 tabular-nums mt-1">
                {overview.dq_report.avg_dq_score} / 100
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
              <div className="text-[11px] text-slate-400">Completeness (/30)</div>
              <div className="text-xl font-extrabold text-white tabular-nums mt-1">
                {overview.dq_report.pillars.completeness_30}
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
              <div className="text-[11px] text-slate-400">Validity (/30)</div>
              <div className="text-xl font-extrabold text-white tabular-nums mt-1">
                {overview.dq_report.pillars.validity_30}
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
              <div className="text-[11px] text-slate-400">Uniqueness (/20)</div>
              <div className="text-xl font-extrabold text-white tabular-nums mt-1">
                {overview.dq_report.pillars.uniqueness_20}
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
              <div className="text-[11px] text-slate-400">Timeliness & Gate (/20)</div>
              <div className="text-xl font-extrabold text-white tabular-nums mt-1">
                {overview.dq_report.pillars.timeliness_20}
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-rose-300">
              Danh sách Văn bản cần nâng chuẩn chất lượng dữ liệu ({overview.dq_report.documents_with_issues.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2 pr-3">Tên file SSOT</th>
                    <th className="py-2 pr-3">Phân loại</th>
                    <th className="py-2 pr-3">Điểm DQ</th>
                    <th className="py-2">Các lỗi cần khắc phục</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {overview.dq_report.documents_with_issues.map(item => (
                    <tr key={item.doc_key} className="hover:bg-slate-800/40">
                      <td className="py-2 pr-3 font-mono text-sky-300 break-all">
                        {item.ssot_file_name}
                      </td>
                      <td className="py-2 pr-3 font-mono text-[11px] whitespace-nowrap">
                        {item.doc_type_code}-{item.issuer_code} · {item.domain_code}
                      </td>
                      <td className="py-2 pr-3 font-mono font-bold tabular-nums">
                        <span
                          className={
                            item.dq_score >= 85
                              ? 'text-emerald-400'
                              : item.dq_score >= 70
                              ? 'text-amber-300'
                              : 'text-rose-400'
                          }
                        >
                          {item.dq_score}/100
                        </span>
                      </td>
                      <td className="py-2 text-slate-300">{item.issues.join(' · ')}</td>
                    </tr>
                  ))}
                  {overview.dq_report.documents_with_issues.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-emerald-400 font-semibold">
                        100% văn bản trong kho đạt 100/100 điểm Data Quality!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: RELATIONS RADAR */}
      {subTab === 'RELATIONS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
            🔗 Radar Quan hệ Thay thế · Bãi bỏ · Sửa đổi · Hướng dẫn (Tự động trích xuất từ Điều/Khoản)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2 pr-3">Loại quan hệ</th>
                  <th className="py-2 pr-3">Văn bản nguồn</th>
                  <th className="py-2 pr-3">Số hiệu đích</th>
                  <th className="py-2">Chứng cứ trích từ văn bản</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {overview.relation_radar.map(rel => (
                  <tr key={rel.relation_key} className="hover:bg-slate-800/40">
                    <td className="py-2 pr-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                          rel.relation_type === 'REPEALS' || rel.relation_type === 'REPLACES'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : rel.relation_type === 'AMENDS'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                        }`}
                      >
                        {rel.relation_type}
                      </span>
                    </td>
                    <td className="py-2 pr-3 font-mono text-sky-300 break-all">
                      {rel.source_ssot_name}
                    </td>
                    <td className="py-2 pr-3 font-mono font-bold text-white whitespace-nowrap">
                      {rel.target_ref_raw}
                    </td>
                    <td className="py-2 text-slate-300">{rel.evidence_snippet}</td>
                  </tr>
                ))}
                {overview.relation_radar.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      Chưa phát hiện quan hệ thay thế/bãi bỏ trong tập dữ liệu hiện tại. Hãy nạp full-text PDF/DOCX để quét sâu toàn văn.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 5: FTS5 SEARCH */}
      {subTab === 'FTS_SEARCH' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
          <form onSubmit={handleRunSearch} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Nhập từ khóa tra cứu sâu trong toàn bộ Điều/Khoản (VD: nghiệm thu, BIM, bảo hiểm, PCCC, tạm ứng)..."
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-extrabold transition"
            >
              {isSearching ? 'Đang tìm...' : '🔍 Tra cứu FTS5'}
            </button>
          </form>

          <div className="text-[11px] font-mono text-slate-400">
            Nguồn chỉ mục: <b className="text-cyan-300">{searchSource}</b> · Tìm thấy{' '}
            <b className="text-white">{searchHits.length}</b> điều/khoản khớp.
          </div>

          <div className="space-y-2">
            {searchHits.map(hit => (
              <div
                key={hit.clause_key}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono font-bold text-sky-300">{hit.ssot_file_name}</span>
                  <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-[10px] text-amber-300">
                    {hit.article_number || hit.node_level} · {hit.domain_code} · {hit.issue_year}
                  </span>
                </div>
                {hit.title && <div className="font-bold text-white">{hit.title}</div>}
                <div className="text-slate-300 leading-relaxed">{hit.snippet}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
