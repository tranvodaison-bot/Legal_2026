import React, { useEffect } from 'react';
import { LegalDocument, LegalNode } from '../types/lexPmoTypes';
import { getVbplBadgeClass, getVbplBadgeLabel } from './modals/VbplLibraryModals';

export interface SlideOverRefTarget {
  doc: LegalDocument;
  focusNodeId?: string;
  reasonLabel?: string;
}

interface SlideOverRefDrawerProps {
  target: SlideOverRefTarget | null;
  onClose: () => void;
  onPromoteToMainReader: (docId: string, nodeId?: string) => void;
  onCompareWithCurrent?: (docId: string, nodeId: string) => void;
  onOpenSecurePdf?: (doc: LegalDocument) => void;
  onOpenGate?: (gateCode: string) => void;
}

export const SlideOverRefDrawer: React.FC<SlideOverRefDrawerProps> = ({
  target,
  onClose,
  onPromoteToMainReader,
  onCompareWithCurrent,
  onOpenSecurePdf,
  onOpenGate,
}) => {
  useEffect(() => {
    if (!target) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [target, onClose]);

  if (!target) return null;

  const { doc, focusNodeId, reasonLabel } = target;
  const articleNodes: LegalNode[] = doc.nodes.filter(n => n.level !== 'Chương' && n.level !== 'Mục');
  const focusedNode = focusNodeId ? doc.nodes.find(n => n.id === focusNodeId) : null;
  const orderedNodes = focusedNode
    ? [focusedNode, ...doc.nodes.filter(n => n.id !== focusedNode.id)]
    : doc.nodes;
  const hasPdf = Boolean(
    (doc.rawFileName || doc.ssotFileName || '').toLowerCase().endsWith('.pdf')
  );

  return (
    <aside
      aria-label="Ngăn đối chiếu văn bản liên quan"
      className="w-full md:w-[430px] shrink-0 h-full flex flex-col overflow-hidden z-20 transition-all"
      style={{
        backgroundColor: 'var(--panel)',
        borderLeft: '2px solid var(--gold)',
        boxShadow: 'var(--sh-lg)',
      }}
    >
      {/* Thanh tiêu đề Navy đậm chuẩn #ref của thuvien-vbpl-26 */}
      <div
        className="px-3.5 py-2.5 flex items-center justify-between gap-2 shrink-0 text-white"
        style={{ backgroundColor: 'var(--navy-d)' }}
      >
        <div className="min-w-0 flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-[#e8c66a] shrink-0">
            [{doc.subSectorLabel || doc.primaryDomain}]
          </span>
          <span className={getVbplBadgeClass(doc.docType)}>
            {getVbplBadgeLabel(doc.docType)}
          </span>
          <span className="font-mono font-bold text-xs truncate">{doc.docNumber}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {hasPdf && onOpenSecurePdf && (
            <button
              type="button"
              onClick={() => onOpenSecurePdf(doc)}
              title="Xem PDF gốc có dấu đỏ của văn bản đối chiếu này"
              className="px-2 py-1 rounded text-[11px] font-bold bg-emerald-700 hover:bg-emerald-600 text-white cursor-pointer"
            >
              🔒 PDF
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              onPromoteToMainReader(doc.id, focusNodeId);
              onClose();
            }}
            title="Đưa văn bản này sang khung đọc chính Cột 3"
            className="px-2 py-1 rounded text-[11px] font-bold bg-white/15 hover:bg-white/25 text-white border border-white/20 cursor-pointer"
          >
            Mở ⇄
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Đóng ngăn đối chiếu (Esc)"
            className="h-6 w-6 rounded flex items-center justify-center bg-white/10 hover:bg-rose-600 text-white text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Nội dung cuộn */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-[13.5px] leading-relaxed">
        {reasonLabel && (
          <div
            className="px-3 py-1.5 rounded text-xs font-semibold border"
            style={{
              backgroundColor: 'var(--gold-xl)',
              borderColor: 'var(--gold)',
              color: 'var(--chu)',
            }}
          >
            📌 {reasonLabel}
          </div>
        )}

        <div className="space-y-1.5 pb-2.5 border-b" style={{ borderColor: 'var(--line)' }}>
          <div className="text-xs italic" style={{ color: 'var(--chu-m)' }}>
            {doc.title}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="vbpl-chip text-[11px]">
              Ban hành: <b>{doc.issueDate || doc.year}</b>
            </span>
            <span className="vbpl-chip text-[11px]">
              Hiệu lực: <b>{doc.effectiveDate || doc.status}</b>
            </span>
            {doc.linkedGates?.slice(0, 4).map(g => (
              <button
                key={g}
                type="button"
                onClick={() => onOpenGate?.(g)}
                className="px-2 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer border"
                style={{
                  backgroundColor: 'var(--gold-xl)',
                  borderColor: 'var(--gold)',
                  color: 'var(--chu)',
                }}
              >
                Gate {g}
              </button>
            ))}
          </div>
        </div>

        {/* Các điều khoản của văn bản đối chiếu */}
        <div className="space-y-3">
          {orderedNodes.map(node => {
            if (node.level === 'Chương' || node.level === 'Mục') {
              return (
              <div
                key={node.id}
                className="px-2.5 py-1 rounded text-xs font-bold uppercase"
                style={{ backgroundColor: 'var(--giay-d)', color: 'var(--son)' }}
              >
                {node.code.replace(/\.+$/, '')}. {node.title}
              </div>
            );
          }
          const isHighlighted = focusNodeId === node.id;
          return (
            <div
              key={node.id}
              className={`p-3 rounded-lg border space-y-1.5 ${
                isHighlighted ? 'vbpl-nd-suadoi' : ''
              }`}
              style={{
                borderColor: isHighlighted ? 'var(--cam)' : 'var(--line)',
                backgroundColor: isHighlighted ? undefined : 'var(--giay)',
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-bold text-sm" style={{ color: 'var(--navy-ink)' }}>
                  {node.code.replace(/\.+$/, '')}. {node.title}
                </h4>
                  {onCompareWithCurrent && articleNodes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        onCompareWithCurrent(doc.id, node.id);
                        onClose();
                      }}
                      className="px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 cursor-pointer text-white"
                      style={{ backgroundColor: 'var(--navy-l)' }}
                      title="Đưa điều khoản này vào Chế độ So sánh Song song A ↔ B"
                    >
                      ⚖️ So sánh
                    </button>
                  )}
                </div>
                {node.content && (
                  <div
                    className="whitespace-pre-line text-[13px] leading-relaxed"
                    style={{ color: 'var(--chu)' }}
                  >
                    {node.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
