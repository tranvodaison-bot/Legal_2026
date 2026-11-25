import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, ZoomIn, ZoomOut, RotateCcw, Maximize2, AlertCircle, FileText } from 'lucide-react';

interface SecurePdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  docTitle?: string;
  docNumber?: string;
}

export const SecurePdfViewerModal: React.FC<SecurePdfViewerModalProps> = ({
  isOpen,
  onClose,
  fileName,
  docTitle,
  docNumber,
}) => {
  const [zoom, setZoom] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<boolean>(false);

  // Lắng nghe phím Esc để đóng modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !fileName) return null;

  // URL an toàn qua server proxy — hoàn toàn không để lộ Google Drive URL
  const streamUrl = `/api/documents/stream-pdf?file=${encodeURIComponent(fileName)}#zoom=${zoom}`;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));
  const handleZoomReset = () => setZoom(100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`relative flex flex-col w-full bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 ${
          isFullscreen ? 'h-full max-h-none rounded-none' : 'max-w-6xl h-[90vh]'
        }`}
      >
        {/* HEADER MODAL */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  🔒 Zero-Trust Proxy Viewer
                </span>
                {docNumber && (
                  <span className="text-xs font-mono font-bold text-sky-400 truncate">
                    {docNumber}
                  </span>
                )}
              </div>
              <h3 className="text-sm font-semibold text-slate-200 truncate mt-0.5">
                {docTitle || fileName}
              </h3>
            </div>
          </div>

          {/* CÁC NÚT ĐIỀU KHIỂN & BẢO MẬT */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-slate-800/80 rounded-lg border border-slate-700 text-slate-300 text-xs">
              <button
                type="button"
                onClick={handleZoomOut}
                title="Thu nhỏ"
                className="p-1 hover:text-white rounded hover:bg-slate-700 transition"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="font-mono text-[11px] px-1 text-slate-400">{zoom}%</span>
              <button
                type="button"
                onClick={handleZoomIn}
                title="Phóng to"
                className="p-1 hover:text-white rounded hover:bg-slate-700 transition"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleZoomReset}
                title="Đặt lại 100%"
                className="p-1 hover:text-white rounded hover:bg-slate-700 transition ml-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Toàn màn hình'}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              title="Đóng (Esc)"
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* BODY: IFRAME NHÚNG STREAM AN TOÀN */}
        <div className="relative flex-1 bg-slate-950 overflow-hidden">
          {loadError ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-400">
              <AlertCircle className="w-12 h-12 text-amber-400 mb-3" />
              <h4 className="text-base font-semibold text-slate-200">
                Không thể tải trực tiếp bản xem trước PDF
              </h4>
              <p className="text-xs text-slate-400 max-w-md mt-1 mb-4">
                Tệp tin <code className="text-amber-300 font-mono">{fileName}</code> có thể chưa sẵn
                sàng trên máy chủ hoặc đang được bảo vệ. Vui lòng đọc nội dung toàn văn số hóa tại Cột 3.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition"
              >
                Quay lại đọc Điều / Khoản số hóa
              </button>
            </div>
          ) : (
            <iframe
              src={streamUrl}
              title={`Bản PDF an toàn - ${fileName}`}
              className="w-full h-full border-none bg-slate-950"
              onError={() => setLoadError(true)}
            />
          )}
        </div>

        {/* FOOTER: BANNER BẢO MẬT & ZERO-TRUST */}
        <div className="flex flex-wrap items-center justify-between px-5 py-2.5 bg-slate-950/95 border-t border-slate-800 text-[11px] text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300">
              Chế độ <b>Chỉ Xem Bảo Mật (Read-Only)</b>: Kho Google Drive gốc được cách ly 100% chống xóa/sửa từ bên ngoài.
            </span>
          </div>
          <div className="font-mono text-[10px] text-slate-500">
            Tệp nguồn: <span className="text-slate-400">{fileName}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurePdfViewerModal;
