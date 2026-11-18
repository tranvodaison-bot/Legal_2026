import React from 'react';
import {
  AiCompareDifferenceItem,
  AiLegalGapAnalysis,
  LegalDiffCategory,
  ProjectArchetypeCode,
} from '../types/lexPmoTypes';
import { DIFF_CATEGORY_META } from '../utils/legalCompareHighlighter';

interface AiLegalGapAnalysisCardProps {
  leftDocNumber: string;
  leftNodeCode: string;
  rightDocNumber: string;
  rightNodeCode: string;
  activeProjectArchetype: ProjectArchetypeCode;
  isLoading: boolean;
  errorMessage: string | null;
  analysis: AiLegalGapAnalysis | null;
  isStaleForCurrentPair: boolean;
  semanticHighlightEnabled: boolean;
  activeCategoryFilter: 'ALL' | LegalDiffCategory;
  onRunAnalysis: () => void;
  onToggleSemanticHighlight: (enabled: boolean) => void;
  onChangeCategoryFilter: (cat: 'ALL' | LegalDiffCategory) => void;
  onCopyReport: () => void;
}

const renderCategoryList = (
  category: LegalDiffCategory,
  items: AiCompareDifferenceItem[],
  leftLabel: string,
  rightLabel: string,
  isFocused: boolean
) => {
  const meta = DIFF_CATEGORY_META[category];
  return (
    <div
      className={`rounded-xl border p-3 space-y-2 transition bg-white ${
        isFocused ? 'ring-2 ring-offset-1 ring-indigo-500 border-indigo-400' : 'border-slate-200'
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-bold ${meta.badgeClass}`}
        >
          <span>{meta.icon}</span>
          <span>{meta.label}</span>
        </span>
        <span className="text-[10px] font-mono text-slate-500 font-bold">
          {items.length} điểm
        </span>
      </div>

      {items.length === 0 ? (
        <div className="text-[11px] text-slate-400 italic py-1">
          AI không phát hiện chênh lệch đáng kể ở nhóm {meta.shortLabel.toLowerCase()}.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div
              key={`${category}-${idx}`}
              className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1 text-[11px]"
            >
              <div className="font-bold text-slate-900">{item.aspect}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                <div className="p-1.5 rounded bg-sky-50 border border-sky-200 text-sky-950">
                  <span className="font-mono font-bold text-[10px] text-sky-700 block">
                    {leftLabel}:
                  </span>
                  <span>{item.clauseAValue}</span>
                </div>
                <div className="p-1.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-950">
                  <span className="font-mono font-bold text-[10px] text-indigo-700 block">
                    {rightLabel}:
                  </span>
                  <span>{item.clauseBValue}</span>
                </div>
              </div>
              <div className="text-[11px] text-slate-700 leading-snug pt-0.5">
                <b className="text-amber-800">Tác động:</b> {item.impactNote}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const AiLegalGapAnalysisCard: React.FC<AiLegalGapAnalysisCardProps> = ({
  leftDocNumber,
  leftNodeCode,
  rightDocNumber,
  rightNodeCode,
  activeProjectArchetype,
  isLoading,
  errorMessage,
  analysis,
  isStaleForCurrentPair,
  semanticHighlightEnabled,
  activeCategoryFilter,
  onRunAnalysis,
  onToggleSemanticHighlight,
  onChangeCategoryFilter,
  onCopyReport,
}) => {
  const leftShort = `${leftDocNumber} (${leftNodeCode})`;
  const rightShort = `${rightDocNumber} (${rightNodeCode})`;

  return (
    <div className="rounded-xl border-2 border-indigo-300 bg-gradient-to-br from-indigo-50/90 via-white to-sky-50/80 p-3.5 space-y-3 shadow-xs">
      {/* Thanh điều khiển AI & Bộ lọc Tô sáng 3 nhóm khác biệt */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-indigo-700 text-white font-mono text-[10px] font-extrabold tracking-wide">
              ✨ AI GỢI Ý PHÂN TÍCH CHÊNH LỆCH PHÁP LÝ
            </span>
            {analysis && !isStaleForCurrentPair && (
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 font-mono text-[10px] font-bold">
                {analysis.source} · {analysis.analyzedAt}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-600">
            Tự động đối chiếu &amp; tô sáng trực tiếp trong bảng:{' '}
            <b>⏱️ Mốc thời gian</b>, <b>🏛️ Cấp thẩm quyền</b> và <b>⚙️ Yêu cầu kỹ thuật</b> giữa{' '}
            <b className="text-sky-800">{leftShort}</b> và{' '}
            <b className="text-indigo-800">{rightShort}</b>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isLoading}
            onClick={onRunAnalysis}
            className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-bold text-xs shadow-sm transition disabled:opacity-55 disabled:cursor-wait flex items-center gap-1.5"
          >
            <span>{isLoading ? '⏳' : '✨'}</span>
            <span>
              {isLoading
                ? 'AI đang phân tích chênh lệch...'
                : analysis && !isStaleForCurrentPair
                ? 'Phân tích lại bằng AI'
                : 'AI Phân tích Chênh lệch Pháp lý'}
            </span>
          </button>
          {analysis && !isStaleForCurrentPair && (
            <button
              type="button"
              onClick={onCopyReport}
              className="px-2.5 py-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold text-xs transition"
              title="Sao chép toàn bộ báo cáo chênh lệch pháp lý AI"
            >
              📋 Copy
            </button>
          )}
        </div>
      </div>

      {/* Bộ lọc Highlight trực tiếp trong bảng */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-indigo-200/70">
        <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-800 cursor-pointer">
          <input
            type="checkbox"
            checked={semanticHighlightEnabled}
            onChange={e => onToggleSemanticHighlight(e.target.checked)}
            className="accent-indigo-600"
          />
          <span>🎯 Highlight trực tiếp Mốc thời gian · Thẩm quyền · Kỹ thuật trong bảng</span>
        </label>

        {semanticHighlightEnabled && (
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => onChangeCategoryFilter('ALL')}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition ${
                activeCategoryFilter === 'ALL'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              Tất cả 3 nhóm
            </button>
            {(['TIMELINE', 'AUTHORITY', 'TECHNICAL'] as LegalDiffCategory[]).map(cat => {
              const meta = DIFF_CATEGORY_META[cat];
              const isSelected = activeCategoryFilter === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => onChangeCategoryFilter(isSelected ? 'ALL' : cat)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition flex items-center gap-1 ${
                    isSelected
                      ? `${meta.badgeClass} ring-2 ring-slate-700`
                      : `${meta.badgeClass} opacity-80 hover:opacity-100`
                  }`}
                >
                  <span>{meta.icon}</span>
                  <span>{meta.shortLabel}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Trạng thái Lỗi API (nếu thiếu key hoặc lỗi kết nối) */}
      {errorMessage && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-300 text-rose-900 text-xs flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-0.5">
            <div className="font-bold">⚠️ Không thể chạy AI Phân tích Chênh lệch:</div>
            <div className="text-[11px]">{errorMessage}</div>
          </div>
          <button
            type="button"
            onClick={onRunAnalysis}
            className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] shrink-0"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Cảnh báo nếu người dùng vừa đổi cặp điều khoản nhưng chưa chạy lại AI */}
      {analysis && isStaleForCurrentPair && !isLoading && (
        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-950 text-[11px] flex flex-wrap items-center justify-between gap-2">
          <span>
            Bạn vừa thay đổi cặp điều khoản so sánh. Nhấn <b>&quot;AI Phân tích Chênh lệch Pháp lý&quot;</b>{' '}
            để Gemini AI cập nhật phán quyết &amp; tô sáng chuyên sâu cho cặp mới.
          </span>
          <button
            type="button"
            onClick={onRunAnalysis}
            className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] shrink-0"
          >
            Phân tích cặp mới →
          </button>
        </div>
      )}

      {/* Kết quả Phân tích Chuyên sâu từ Gemini AI */}
      {analysis && !isStaleForCurrentPair && (
        <div className="space-y-3 pt-1">
          {/* Tóm tắt phán quyết */}
          <div className="p-3 rounded-xl bg-white border border-indigo-200 space-y-1">
            <div className="text-[11px] font-mono font-extrabold text-indigo-800 uppercase">
              ⚖️ Phán quyết Chênh lệch Cốt lõi · Dự án [{activeProjectArchetype}]
            </div>
            <p className="text-xs text-slate-800 leading-relaxed font-medium">
              {analysis.summaryVerdict}
            </p>
          </div>

          {/* 3 Trục Chênh lệch: Thời gian · Thẩm quyền · Kỹ thuật */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-2.5">
            {renderCategoryList(
              'TIMELINE',
              analysis.timelineDifferences,
              leftShort,
              rightShort,
              activeCategoryFilter === 'TIMELINE'
            )}
            {renderCategoryList(
              'AUTHORITY',
              analysis.authorityDifferences,
              leftShort,
              rightShort,
              activeCategoryFilter === 'AUTHORITY'
            )}
            {renderCategoryList(
              'TECHNICAL',
              analysis.technicalDifferences,
              leftShort,
              rightShort,
              activeCategoryFilter === 'TECHNICAL'
            )}
          </div>

          {/* Khuyến nghị hành động */}
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-950 flex items-start gap-2">
            <span className="text-base leading-none shrink-0">💡</span>
            <div>
              <span className="font-bold text-emerald-900">
                Khuyến nghị áp dụng cho Ban QLDA / Chủ đầu tư [{activeProjectArchetype}]:
              </span>{' '}
              <span>{analysis.recommendedAction}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
