import React, { useEffect } from 'react';
import { LEGAL_CATEGORY_TREE } from '../../data/lexPmoData';
import { LegalDocument } from '../../types/lexPmoTypes';

export function getVbplBadgeClass(docType: string): string {
  const up = (docType || '').toUpperCase();
  if (up === 'LUAT') return 'vbpl-badge vbpl-b-LUAT';
  if (up === 'ND') return 'vbpl-badge vbpl-b-ND';
  if (up === 'TT' || up === 'TTLT') return 'vbpl-badge vbpl-b-TT';
  if (up === 'QD') return 'vbpl-badge vbpl-b-QD';
  if (up === 'NQ') return 'vbpl-badge vbpl-b-NQ';
  if (up === 'CV' || up === 'HD_CV') return 'vbpl-badge vbpl-b-CV';
  if (up === 'VBHN') return 'vbpl-badge vbpl-b-VBHN';
  if (up === 'QCVN') return 'vbpl-badge vbpl-b-QCVN';
  if (up === 'TCVN') return 'vbpl-badge vbpl-b-TCVN';
  if (up === 'HD' || up === 'PLHD') return 'vbpl-badge vbpl-b-HD';
  return 'vbpl-badge vbpl-b-KHAC';
}

export function getVbplBadgeLabel(docType: string): string {
  const up = (docType || '').toUpperCase();
  if (up === 'LUAT') return 'LUẬT';
  if (up === 'ND') return 'NGHỊ ĐỊNH';
  if (up === 'TT' || up === 'TTLT') return 'THÔNG TƯ';
  if (up === 'QD') return 'QUYẾT ĐỊNH';
  if (up === 'NQ') return 'NGHỊ QUYẾT';
  if (up === 'CV') return 'CÔNG VĂN';
  if (up === 'VBHN') return 'VB HỢP NHẤT';
  if (up === 'QCVN') return 'QCVN';
  if (up === 'TCVN') return 'TCVN';
  if (up === 'HD') return 'HỢP ĐỒNG';
  if (up === 'PLHD') return 'PHỤ LỤC HĐ';
  return up || 'VĂN BẢN';
}

interface VbplStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  legalDocs: LegalDocument[];
  personalNotesCount: number;
  realBatchCount: number;
  onSelectIndustry?: (industryGroupId: string) => void;
  onSelectDocType?: (docType: string) => void;
  onOpenFullBiStep?: () => void;
}

export const VbplStatsModal: React.FC<VbplStatsModalProps> = ({
  isOpen,
  onClose,
  legalDocs,
  personalNotesCount,
  realBatchCount,
  onSelectIndustry,
  onSelectDocType,
  onOpenFullBiStep,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalSubSectors = LEGAL_CATEGORY_TREE.reduce((acc, g) => acc + g.children.length, 0);
  const totalArticles = legalDocs.reduce(
    (acc, d) => acc + (d.articleCount || d.nodes.filter(n => n.level === 'Điều').length || 1),
    0
  );
  const totalClauses = legalDocs.reduce(
    (acc, d) => acc + (d.clauseTotalCount || d.nodes.reduce((s, n) => s + (n.clauseCount || 1), 0)),
    0
  );
  const amendedOrExpiredCount = legalDocs.filter(
    d => d.isAmended || d.validityPeriod === 'AMENDED' || /hết hiệu lực/i.test(d.status)
  ).length;

  const byTypeMap = new Map<string, { count: number; articles: number }>();
  for (const d of legalDocs) {
    const cur = byTypeMap.get(d.docType) || { count: 0, articles: 0 };
    cur.count += 1;
    cur.articles += d.articleCount || d.nodes.length || 1;
    byTypeMap.set(d.docType, cur);
  }
  const byTypeRows = Array.from(byTypeMap.entries()).sort((a, b) => b[1].count - a[1].count);

  const byIndRows = LEGAL_CATEGORY_TREE.map(grp => {
    const docs = legalDocs.filter(d => d.industryGroupId === grp.id);
    const articles = docs.reduce((s, d) => s + (d.articleCount || d.nodes.length || 1), 0);
    return {
      id: grp.id,
      name: grp.name,
      subCount: grp.children.length,
      docCount: docs.length,
      articles,
    };
  }).filter(r => r.docCount > 0);

  return (
    <div
      className="fixed inset-0 z-50 vbpl-md-backdrop flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
        className="vbpl-mdw w-full max-w-[820px] max-h-[88vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div
          className="px-5 py-3.5 flex items-center justify-between border-b"
          style={{ borderColor: 'var(--line)', backgroundColor: 'var(--giay)' }}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-lg">📊</span>
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--navy-ink)' }}>
                Thống kê Thư viện Văn bản Quy phạm Pháp luật
              </h2>
              <p className="text-xs" style={{ color: 'var(--chu-m)' }}>
                Tổng hợp trực tiếp từ Kho SSOT & Kho thực tế Data_Legal_2026
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 rounded-md flex items-center justify-center text-sm font-bold cursor-pointer hover:opacity-80"
            style={{ backgroundColor: 'var(--giay-d)', color: 'var(--chu)' }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          {/* 6 KPI Cards giống chuẩn thuvien-vbpl-26 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Chuyên ngành / Lĩnh vực', value: totalSubSectors.toLocaleString('vi-VN'), sub: `${LEGAL_CATEGORY_TREE.length} nhóm ngành lớn` },
              { label: 'Văn bản trong thư viện', value: legalDocs.length.toLocaleString('vi-VN'), sub: 'Tra cứu 3 cột tức thì' },
              { label: 'Tổng số Điều / Mục', value: totalArticles.toLocaleString('vi-VN'), sub: 'Bóc tách cấu trúc NĐ 30/2020' },
              { label: 'Tổng Khoản / Điểm', value: totalClauses.toLocaleString('vi-VN'), sub: 'Hỗ trợ tìm kiếm toàn văn' },
              { label: 'Kho thực tế Data_Legal_2026', value: realBatchCount.toLocaleString('vi-VN'), sub: 'PDF scan dấu đỏ & Word gốc' },
              { label: 'Sửa đổi / Ghi chú nghiệp vụ', value: `${amendedOrExpiredCount} / ${personalNotesCount}`, sub: 'VB sửa đổi · Ghi chú cá nhân' },
            ].map((kpi, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-lg border"
                style={{ backgroundColor: 'var(--giay-d)', borderColor: 'var(--line)' }}
              >
                <div
                  className="text-xl font-extrabold tabular-nums"
                  style={{ color: idx === 1 ? 'var(--son-l)' : 'var(--navy-ink)' }}
                >
                  {kpi.value}
                </div>
                <div className="font-bold mt-0.5" style={{ color: 'var(--chu)' }}>
                  {kpi.label}
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: 'var(--chu-m)' }}>
                  {kpi.sub}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bảng 1: Theo loại văn bản */}
            <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--line)' }}>
              <div
                className="px-3.5 py-2 font-bold border-b"
                style={{ backgroundColor: 'var(--giay)', borderColor: 'var(--line)', color: 'var(--navy-ink)' }}
              >
                📑 Phân rã theo Loại văn bản (Bấm để lọc)
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr style={{ backgroundColor: 'var(--giay-d)', color: 'var(--chu-m)' }}>
                    <th className="py-1.5 px-3 font-semibold">Loại VB</th>
                    <th className="py-1.5 px-3 font-semibold text-right">Số VB</th>
                    <th className="py-1.5 px-3 font-semibold text-right">Số điều</th>
                  </tr>
                </thead>
                <tbody>
                  {byTypeRows.map(([typeCode, info]) => (
                    <tr
                      key={typeCode}
                      onClick={() => {
                        onSelectDocType?.(typeCode);
                        onClose();
                      }}
                      className="border-t cursor-pointer hover:opacity-85 transition"
                      style={{ borderColor: 'var(--line)' }}
                    >
                      <td className="py-1.5 px-3">
                        <span className={getVbplBadgeClass(typeCode)}>
                          {getVbplBadgeLabel(typeCode)}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono font-bold tabular-nums">
                        {info.count}
                      </td>
                      <td
                        className="py-1.5 px-3 text-right font-mono tabular-nums"
                        style={{ color: 'var(--chu-m)' }}
                      >
                        {info.articles}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bảng 2: Theo nhóm ngành */}
            <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--line)' }}>
              <div
                className="px-3.5 py-2 font-bold border-b"
                style={{ backgroundColor: 'var(--giay)', borderColor: 'var(--line)', color: 'var(--navy-ink)' }}
              >
                📚 Phân rã theo Nhóm Lĩnh vực (Bấm để mở)
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr style={{ backgroundColor: 'var(--giay-d)', color: 'var(--chu-m)' }}>
                    <th className="py-1.5 px-3 font-semibold">Lĩnh vực</th>
                    <th className="py-1.5 px-3 font-semibold text-right">Mục con</th>
                    <th className="py-1.5 px-3 font-semibold text-right">Số VB</th>
                  </tr>
                </thead>
                <tbody>
                  {byIndRows.map(row => (
                    <tr
                      key={row.id}
                      onClick={() => {
                        onSelectIndustry?.(row.id);
                        onClose();
                      }}
                      className="border-t cursor-pointer hover:opacity-85 transition"
                      style={{ borderColor: 'var(--line)' }}
                    >
                      <td className="py-1.5 px-3 font-semibold">{row.name}</td>
                      <td
                        className="py-1.5 px-3 text-right font-mono tabular-nums"
                        style={{ color: 'var(--chu-m)' }}
                      >
                        {row.subCount}
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono font-bold tabular-nums">
                        {row.docCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-5 py-3 border-t flex flex-wrap items-center justify-between gap-2"
          style={{ backgroundColor: 'var(--giay-d)', borderColor: 'var(--line)' }}
        >
          {onOpenFullBiStep ? (
            <button
              type="button"
              onClick={() => {
                onOpenFullBiStep();
                onClose();
              }}
              className="px-3.5 py-1.5 rounded-md text-xs font-bold text-white cursor-pointer transition hover:opacity-90"
              style={{ backgroundColor: 'var(--navy)' }}
            >
              📈 Mở BI Dashboard 6 Tầng & Kiểm định Chất lượng Dữ liệu →
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-md text-xs font-bold border cursor-pointer"
            style={{ backgroundColor: 'var(--panel)', borderColor: 'var(--line-d)', color: 'var(--chu)' }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

interface VbplGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VbplGuideModal: React.FC<VbplGuideModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 vbpl-md-backdrop flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
        className="vbpl-mdw w-full max-w-[760px] max-h-[88vh] flex flex-col overflow-hidden"
      >
        <div
          className="px-5 py-3.5 flex items-center justify-between border-b"
          style={{ borderColor: 'var(--line)', backgroundColor: 'var(--giay)' }}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-lg">❓</span>
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--navy-ink)' }}>
                Hướng dẫn Tra cứu & Tổ hợp Phím tắt Nhanh
              </h2>
              <p className="text-xs" style={{ color: 'var(--chu-m)' }}>
                Chuẩn giao diện 3 Cột · Tra cứu Điều khoản · Đối chiếu Song song & Xem PDF Gốc
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 rounded-md flex items-center justify-center text-sm font-bold cursor-pointer"
            style={{ backgroundColor: 'var(--giay-d)', color: 'var(--chu)' }}
          >
            ✕
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 text-xs leading-relaxed">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div
              className="p-3.5 rounded-lg border space-y-1.5"
              style={{ backgroundColor: 'var(--giay)', borderColor: 'var(--line)' }}
            >
              <div className="font-bold text-sm" style={{ color: 'var(--navy-ink)' }}>
                1. Bố cục 3 Cột Tra cứu Chuẩn
              </div>
              <p style={{ color: 'var(--chu-m)' }}>
                • <b>Cột 1 (Trái - Xanh Navy):</b> Chọn nhóm Ngành hoặc Lĩnh vực chuyên môn (QLCL, QLCP, QLHD, Đấu thầu, Thuế...).
                <br />• <b>Cột 2 (Giữa - Giấy Kem):</b> Lọc theo Loại văn bản, Hiệu lực, xem thẻ văn bản và bung nhanh Mục lục Chương/Điều ngay tại chỗ.
                <br />• <b>Cột 3 (Phải - Giấy Trắng):</b> Xem Bìa văn bản, Phả hệ sửa đổi, Mục lục chấm ngang, đọc Toàn văn từng Điều và mở Ngăn kéo đối chiếu trượt ngang.
              </p>
            </div>

            <div
              className="p-3.5 rounded-lg border space-y-1.5"
              style={{ backgroundColor: 'var(--giay)', borderColor: 'var(--line)' }}
            >
              <div className="font-bold text-sm" style={{ color: 'var(--navy-ink)' }}>
                2. Đọc PDF Gốc & Quản trị Dự án PMO
              </div>
              <p style={{ color: 'var(--chu-m)' }}>
                • Nhấn nút <b>🔒 PDF gốc</b> trên thanh công cụ Cột 3 để đọc trực tiếp bản scan có dấu đỏ từ kho <code>Data_Legal_2026</code> mà không cần mở Google Drive.
                <br />• Viết <b>Ghi chú riêng</b> ngay dưới từng Điều và gắn cảnh báo trực tiếp sang các cổng <b>Stage-Gate (G0–G15)</b>.
                <br />• Dùng menu <b>Phân hệ PMO</b> trên thanh Topbar để chuyển sang Nạp CDE, Stage-Gate, QA/QC, Kiểm toán VO & AI.
              </p>
            </div>
          </div>

          {/* Bảng màu huy hiệu */}
          <div
            className="p-3.5 rounded-lg border space-y-2"
            style={{ backgroundColor: 'var(--panel)', borderColor: 'var(--line)' }}
          >
            <div className="font-bold" style={{ color: 'var(--navy-ink)' }}>
              🏷️ Quy ước Huy hiệu Loại Văn bản
            </div>
            <div className="flex flex-wrap gap-2">
              {['LUAT', 'ND', 'TT', 'QD', 'NQ', 'VBHN', 'CV', 'QCVN', 'TCVN', 'HD'].map(code => (
                <span key={code} className={getVbplBadgeClass(code)}>
                  {getVbplBadgeLabel(code)}
                </span>
              ))}
            </div>
          </div>

          {/* Phím tắt */}
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--line)' }}>
            <div
              className="px-3.5 py-2 font-bold border-b"
              style={{ backgroundColor: 'var(--giay)', borderColor: 'var(--line)', color: 'var(--navy-ink)' }}
            >
              ⌨️ Phím tắt Bàn phím
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x" style={{ borderColor: 'var(--line)' }}>
              {[
                { key: 'Ctrl + K', desc: 'Đặt con trỏ vào ô Tìm kiếm toàn thư viện' },
                { key: 'M', desc: 'Chuyển nhanh giữa Mục lục và Toàn văn' },
                { key: 'D', desc: 'Đánh dấu / Bỏ đánh dấu văn bản đang mở' },
                { key: 'C', desc: 'Sao chép trích dẫn chuẩn của văn bản' },
                { key: 'J / K', desc: 'Nhảy tới Điều kế tiếp / Điều trước đó' },
                { key: 'Esc', desc: 'Đóng ngăn kéo đối chiếu hoặc hộp thoại' },
              ].map((item, i) => (
                <div
                  key={i}
                  className="px-3.5 py-2 flex items-center justify-between gap-2 border-b"
                  style={{ borderColor: 'var(--line)' }}
                >
                  <span style={{ color: 'var(--chu)' }}>{item.desc}</span>
                  <kbd
                    className="px-2 py-0.5 rounded font-mono text-[11px] font-bold border shrink-0"
                    style={{ backgroundColor: 'var(--giay-d)', borderColor: 'var(--line-d)', color: 'var(--navy-ink)' }}
                  >
                    {item.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          className="px-5 py-3 border-t flex justify-end"
          style={{ backgroundColor: 'var(--giay-d)', borderColor: 'var(--line)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-md text-xs font-bold text-white cursor-pointer"
            style={{ backgroundColor: 'var(--navy)' }}
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
};
