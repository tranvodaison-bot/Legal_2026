import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Copy,
  FileText,
  FolderOpen,
  Maximize2,
  Printer,
  RotateCcw,
  ShieldCheck,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  buildA4StandaloneHtml,
  DocxPreviewResult,
  fetchDocxPreview,
  fetchFolderFormsList,
  FolderFormEntry,
} from '../services/ssotBridgeService';

export interface SecureDocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  docTitle?: string;
  docNumber?: string;
  folderName?: string;
  viewerMode?: 'AUTO' | 'PDF' | 'WORD' | 'FOLDER_FORMS';
}

export const SecureDocumentViewerModal: React.FC<SecureDocumentViewerModalProps> = ({
  isOpen,
  onClose,
  fileName,
  docTitle,
  docNumber,
  folderName,
  viewerMode = 'AUTO',
}) => {
  const [zoom, setZoom] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<boolean>(false);

  // State cho Word (.docx/.doc) & 29 Biểu mẫu NĐ 14/2026
  const [formsList, setFormsList] = useState<FolderFormEntry[]>([]);
  const [formsLoading, setFormsLoading] = useState<boolean>(false);
  const [activeFormFile, setActiveFormFile] = useState<string>('');
  const [wordData, setWordData] = useState<DocxPreviewResult | null>(null);
  const [wordLoading, setWordLoading] = useState<boolean>(false);
  const [wordError, setWordError] = useState<string>('');
  const [copiedText, setCopiedText] = useState<boolean>(false);

  const wordIframeRef = useRef<HTMLIFrameElement | null>(null);

  const lowerName = (fileName || '').toLowerCase();
  const effectiveMode: 'PDF' | 'WORD' | 'FOLDER_FORMS' =
    viewerMode !== 'AUTO'
      ? viewerMode
      : folderName && (!fileName || (!lowerName.endsWith('.pdf') && !lowerName.endsWith('.docx') && !lowerName.endsWith('.doc')))
      ? 'FOLDER_FORMS'
      : lowerName.endsWith('.docx') || lowerName.endsWith('.doc')
      ? 'WORD'
      : 'PDF';

  const currentWordTargetFile =
    effectiveMode === 'FOLDER_FORMS' ? activeFormFile : fileName;
  const currentWordTargetFolder =
    effectiveMode === 'FOLDER_FORMS' ? folderName || fileName : folderName;

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

  useEffect(() => {
    if (!isOpen) return;
    setLoadError(false);
    setWordError('');
    setCopiedText(false);
  }, [isOpen, fileName, folderName, viewerMode]);

  // Tải danh sách biểu mẫu nếu là FOLDER_FORMS (vd: 29 biểu mẫu NĐ 14/2026)
  useEffect(() => {
    if (!isOpen || effectiveMode !== 'FOLDER_FORMS') return;
    const targetFolder = folderName || fileName;
    if (!targetFolder) return;
    let active = true;
    setFormsLoading(true);
    setFormsList([]);
    setActiveFormFile('');
    fetchFolderFormsList(targetFolder)
      .then(res => {
        if (!active) return;
        setFormsList(res.files || []);
        if (res.files && res.files.length > 0) {
          setActiveFormFile(res.files[0].fileName);
        } else {
          setWordError('Thư mục biểu mẫu không có tệp .docx/.doc/.pdf hợp lệ.');
        }
      })
      .catch(err => {
        if (!active) return;
        setWordError(err instanceof Error ? err.message : 'Không thể đọc danh sách biểu mẫu');
      })
      .finally(() => {
        if (active) setFormsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen, effectiveMode, folderName, fileName]);

  // Tải nội dung HTML sạch cho tệp Word đang chọn
  useEffect(() => {
    if (!isOpen) return;
    if (effectiveMode !== 'WORD' && effectiveMode !== 'FOLDER_FORMS') return;
    if (!currentWordTargetFile) return;

    if (currentWordTargetFile.toLowerCase().endsWith('.pdf')) {
      setWordData(null);
      return;
    }

    let active = true;
    setWordLoading(true);
    setWordError('');
    fetchDocxPreview(currentWordTargetFile, currentWordTargetFolder)
      .then(data => {
        if (!active) return;
        setWordData(data);
      })
      .catch(err => {
        if (!active) return;
        setWordData(null);
        setWordError(err instanceof Error ? err.message : 'Không thể đọc tệp Word nội tuyến');
      })
      .finally(() => {
        if (active) setWordLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen, effectiveMode, currentWordTargetFile, currentWordTargetFolder]);

  if (!isOpen || (!fileName && !folderName)) return null;

  const isSelectedFormPdf =
    effectiveMode === 'FOLDER_FORMS' && currentWordTargetFile.toLowerCase().endsWith('.pdf');
  const streamUrl =
    effectiveMode === 'PDF' || isSelectedFormPdf
      ? `/api/documents/stream-pdf?file=${encodeURIComponent(
          effectiveMode === 'PDF' ? fileName : currentWordTargetFile
        )}${
          currentWordTargetFolder
            ? `&folder=${encodeURIComponent(currentWordTargetFolder)}`
            : ''
        }#zoom=${zoom}`
      : '';

  const wordA4Doc = wordData
    ? buildA4StandaloneHtml(currentWordTargetFile, wordData.html, zoom)
    : '';

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 20, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 20, 60));
  const handleZoomReset = () => setZoom(100);

  const handlePrintA4 = () => {
    if (wordIframeRef.current?.contentWindow) {
      wordIframeRef.current.contentWindow.focus();
      wordIframeRef.current.contentWindow.print();
    }
  };

  const handleCopyPlainText = async () => {
    if (!wordData?.plainText) return;
    try {
      await navigator.clipboard.writeText(wordData.plainText);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 1800);
    } catch {
      // ignore clipboard blocked
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 vbpl-md-backdrop">
      <div
        className={`relative flex flex-col w-full bg-[var(--panel)] border border-[var(--line-d)] rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 text-[var(--chu)] ${
          isFullscreen ? 'h-full max-h-none rounded-none' : 'max-w-6xl h-[91vh]'
        }`}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 bg-[var(--giay-soft)] border-b border-[var(--line)] shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/35 text-emerald-800 dark:text-emerald-300 shrink-0">
              {effectiveMode === 'FOLDER_FORMS' ? (
                <FolderOpen className="w-4 h-4" />
              ) : effectiveMode === 'WORD' ? (
                <FileText className="w-4 h-4" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/35">
                  {effectiveMode === 'FOLDER_FORMS'
                    ? `🔒 Kho Biểu mẫu (${formsList.length || 29} tệp)`
                    : effectiveMode === 'WORD'
                    ? '📝 Zero-Trust Word Viewer (A4)'
                    : '🔒 Zero-Trust PDF Viewer'}
                </span>
                {docNumber && (
                  <span className="text-xs font-mono font-bold text-sky-800 dark:text-sky-300 truncate">
                    {docNumber}
                  </span>
                )}
              </div>
              <h3 className="text-sm font-bold text-[var(--navy-ink)] truncate mt-0.5">
                {docTitle || currentWordTargetFile || fileName}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {(effectiveMode === 'WORD' || effectiveMode === 'FOLDER_FORMS') && wordData && (
              <>
                <button
                  type="button"
                  onClick={handlePrintA4}
                  title="In biểu mẫu chuẩn khổ A4 (NĐ 30/2020)"
                  className="px-2.5 py-1.5 rounded-lg bg-[var(--navy)] hover:opacity-90 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">In A4</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyPlainText}
                  title="Sao chép toàn văn biểu mẫu"
                  className="px-2.5 py-1.5 rounded-lg bg-[var(--giay-d)] hover:opacity-90 border border-[var(--line-d)] text-[var(--chu)] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className="hidden md:inline">{copiedText ? 'Đã chép' : 'Copy'}</span>
                </button>
              </>
            )}

            <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-[var(--giay-d)] rounded-lg border border-[var(--line-d)] text-[var(--chu)] text-xs">
              <button
                type="button"
                onClick={handleZoomOut}
                title="Thu nhỏ"
                className="p-1 rounded hover:bg-[var(--panel)] transition cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-[11px] px-1 text-[var(--chu-m)]">{zoom}%</span>
              <button
                type="button"
                onClick={handleZoomIn}
                title="Phóng to"
                className="p-1 rounded hover:bg-[var(--panel)] transition cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleZoomReset}
                title="Đặt lại 100%"
                className="p-1 rounded hover:bg-[var(--panel)] transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Toàn màn hình'}
              className="p-2 text-[var(--chu-m)] hover:text-[var(--chu)] hover:bg-[var(--giay-d)] rounded-lg transition cursor-pointer"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              title="Đóng (Esc)"
              className="p-2 text-[var(--chu-m)] hover:text-rose-700 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="relative flex-1 flex bg-[var(--giay)] overflow-hidden min-h-0">
          {/* CỘT TRÁI DANH SÁCH BIỂU MẪU (KHI Ở CHẾ ĐỘ FOLDER_FORMS) */}
          {effectiveMode === 'FOLDER_FORMS' && (
            <aside className="w-72 shrink-0 border-r border-[var(--line)] bg-[var(--giay-soft)] flex flex-col overflow-hidden">
              <div className="px-3 py-2.5 border-b border-[var(--line)] text-xs font-bold text-[var(--navy-ink)] flex items-center justify-between">
                <span>Danh sách Biểu mẫu</span>
                <span className="px-1.5 py-0.5 rounded bg-[var(--panel)] border border-[var(--line)] font-mono text-[10px]">
                  {formsList.length} tệp
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {formsLoading ? (
                  <div className="p-4 text-xs text-[var(--chu-m)] text-center">Đang đọc thư mục biểu mẫu...</div>
                ) : (
                  formsList.map((f, idx) => {
                    const isAct = f.fileName === activeFormFile;
                    return (
                      <button
                        key={f.fileName}
                        type="button"
                        onClick={() => setActiveFormFile(f.fileName)}
                        className={`w-full text-left px-2.5 py-2 rounded-lg border text-xs transition cursor-pointer ${
                          isAct
                            ? 'bg-[var(--panel)] border-[var(--gold)] text-[var(--navy-ink)] font-bold shadow-sm'
                            : 'bg-transparent border-transparent hover:bg-[var(--panel)] text-[var(--chu)]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="font-mono text-[10px] text-[var(--son)] font-bold">
                            #{String(idx + 1).padStart(2, '0')} · {f.ext.replace('.', '').toUpperCase()}
                          </span>
                          <span className="font-mono text-[10px] text-[var(--chu-m)]">{f.sizeLabel}</span>
                        </div>
                        <div className="truncate mt-0.5">{f.fileName.replace(/\.(docx?|pdf)$/i, '')}</div>
                      </button>
                    );
                  })
                )}
              </div>
            </aside>
          )}

          {/* KHUNG HIỂN THỊ CHÍNH */}
          <div className="relative flex-1 flex flex-col overflow-hidden bg-[var(--giay)]">
            {effectiveMode === 'PDF' || isSelectedFormPdf ? (
              loadError ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-amber-600 mb-3" />
                  <h4 className="text-base font-semibold text-[var(--navy-ink)]">
                    Không thể tải trực tiếp bản xem trước PDF
                  </h4>
                  <p className="text-xs text-[var(--chu-m)] max-w-md mt-1 mb-4">
                    Tệp tin <code className="text-amber-800 dark:text-amber-300 font-mono">{fileName}</code> có thể chưa sẵn sàng trên máy chủ hoặc đang được bảo vệ.
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-[var(--panel)] hover:bg-[var(--giay-d)] text-[var(--chu)] text-xs font-semibold rounded-lg border border-[var(--line-d)] transition cursor-pointer"
                  >
                    Quay lại đọc Điều / Khoản số hóa
                  </button>
                </div>
              ) : (
                <iframe
                  src={streamUrl}
                  title={`Bản PDF an toàn - ${fileName}`}
                  className="w-full h-full border-none bg-[var(--giay)]"
                  onError={() => setLoadError(true)}
                />
              )
            ) : wordLoading ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-xs text-[var(--chu-m)] gap-2">
                <div className="w-6 h-6 rounded-full border-2 border-[var(--navy)] border-t-transparent animate-spin" />
                <span>Đang dựng bản xem A4 chuẩn Nghị định 30/2020 cho {currentWordTargetFile}...</span>
              </div>
            ) : wordError ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <AlertCircle className="w-12 h-12 text-amber-600 mb-3" />
                <h4 className="text-base font-semibold text-[var(--navy-ink)]">
                  Không thể xem nội tuyến tệp Word
                </h4>
                <p className="text-xs text-[var(--chu-m)] max-w-md mt-1 mb-4">{wordError}</p>
              </div>
            ) : (
              <>
                {wordData?.degradedMode && (
                  <div className="px-4 py-2 bg-amber-500/15 border-b border-amber-500/40 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-2 shrink-0">
                    <span>
                      ⚠ {wordData.warnings?.[0] || 'Đang hiển thị văn bản thuần từ tệp .doc cũ.'}
                    </span>
                    <span className="font-mono text-[10px] font-bold">{wordData.engine}</span>
                  </div>
                )}
                <iframe
                  ref={wordIframeRef}
                  sandbox="allow-same-origin allow-modals"
                  srcDoc={wordA4Doc}
                  title={`Xem Word A4 - ${currentWordTargetFile}`}
                  className="w-full flex-1 border-none bg-[var(--giay-d)]"
                />
              </>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex flex-wrap items-center justify-between px-4 sm:px-5 py-2 bg-[var(--giay-soft)] border-t border-[var(--line)] text-[11px] text-[var(--chu-m)] shrink-0 gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              Chế độ <b>Chỉ Xem Bảo Mật (Read-Only · Zero-Trust)</b>: Kho gốc Google Drive được cách ly 100%, không lộ đường dẫn vật lý.
            </span>
          </div>
          <div className="font-mono text-[10px] truncate max-w-md">
            Nguồn: <span>{currentWordTargetFile || fileName}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecureDocumentViewerModal;
