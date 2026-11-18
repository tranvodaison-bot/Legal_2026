import React, { useEffect, useState } from 'react';
import { EmployeeUser, PendingDigitalSignoff } from '../../types/lexPmoTypes';
import { computeFullSha256Hex, FOUR_PARTY_ROLES } from '../../utils/rbacRaciHelpers';

export interface DigitalSignoffModalProps {
  signoff: PendingDigitalSignoff | null;
  currentActor: EmployeeUser;
  onClose: () => void;
}

export const DigitalSignoffModal: React.FC<DigitalSignoffModalProps> = ({
  signoff,
  currentActor,
  onClose,
}) => {
  const [noteText, setNoteText] = useState('');
  const [isConfirmedLiability, setIsConfirmedLiability] = useState(true);
  const [timestampIso, setTimestampIso] = useState('');
  const [sha256Hex, setSha256Hex] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!signoff) return;
    setNoteText(signoff.defaultNote || '');
    setIsConfirmedLiability(true);
    setTimestampIso(new Date().toISOString());
    setIsSubmitting(false);
  }, [signoff]);

  useEffect(() => {
    if (!signoff) return;
    let active = true;
    const payload = [
      currentActor.id,
      currentActor.rbacRole,
      currentActor.certNumber,
      signoff.module,
      signoff.actionLabel,
      signoff.entityRef,
      signoff.newState,
      noteText.trim(),
      timestampIso,
    ].join('|');

    computeFullSha256Hex(payload).then(hex => {
      if (active) setSha256Hex(hex);
    });
    return () => {
      active = false;
    };
  }, [signoff, currentActor, noteText, timestampIso]);

  if (!signoff) return null;

  const partyMeta = FOUR_PARTY_ROLES.find(p => p.code === currentActor.rbacRole);

  const handleConfirmSubmit = async () => {
    if (!isConfirmedLiability || isSubmitting) return;
    setIsSubmitting(true);
    const finalIso = timestampIso || new Date().toISOString();
    const finalHex =
      sha256Hex ||
      (await computeFullSha256Hex(
        `${currentActor.id}|${currentActor.rbacRole}|${signoff.actionLabel}|${signoff.entityRef}|${noteText}|${finalIso}`
      ));
    try {
      await signoff.onConfirm(noteText.trim() || signoff.defaultNote, finalHex, finalIso);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-xl rounded-2xl bg-slate-900 border-2 border-amber-500/70 shadow-2xl overflow-hidden text-slate-100"
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-slate-950 via-[#0f223d] to-slate-950 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="h-9 w-9 rounded-xl bg-amber-500/20 border border-amber-400/60 flex items-center justify-center text-lg shrink-0">
              🔐
            </span>
            <div className="min-w-0">
              <div className="text-xs font-mono font-extrabold text-amber-400 uppercase tracking-wide">
                Ký số &amp; Ghi nhận Trách nhiệm Giải trình (Audit-Ready)
              </div>
              <div className="text-sm font-bold text-white truncate">{signoff.title}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3.5 text-xs">
          {/* Thông tin pháp nhân đang ký */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase">
                Chủ thể Pháp nhân Thực thi
              </div>
              <div className="font-bold text-white mt-0.5 flex items-center gap-1.5">
                <span>{partyMeta?.icon || '👤'}</span>
                <span>{partyMeta?.fullTitle || currentActor.department}</span>
              </div>
              <div className="text-[11px] text-sky-300 mt-0.5">
                {currentActor.fullName} · {currentActor.title}
              </div>
            </div>
            <div className="sm:text-right">
              <div className="text-[10px] font-mono text-slate-400 uppercase">
                Quyền RACI · Chứng chỉ
              </div>
              <div className="mt-0.5 font-mono font-bold text-amber-300">
                Vai trò: {currentActor.rbacRole} · Quyền [{signoff.requiredRaciLetter}]
              </div>
              <div className="text-[10px] font-mono text-emerald-400 mt-0.5">
                CCHN: {currentActor.certNumber}
              </div>
            </div>
          </div>

          {/* Chi tiết chuyển trạng thái */}
          <div className="p-3 rounded-xl bg-[#0b1829] border border-sky-500/40 space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] font-mono uppercase text-sky-400 font-bold">
                Hành động &amp; Thực thể Tham chiếu
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-700 font-mono text-[10px] text-amber-300 font-bold">
                {signoff.entityRef}
              </span>
            </div>
            <div className="font-semibold text-white">{signoff.actionLabel}</div>
            <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] pt-0.5">
              <span className="text-slate-400">Chuyển trạng thái:</span>
              {signoff.previousState && (
                <>
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                    {signoff.previousState}
                  </span>
                  <span className="text-slate-500">→</span>
                </>
              )}
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold">
                {signoff.newState}
              </span>
            </div>
          </div>

          {/* Ý kiến giải trình */}
          <div>
            <label className="block text-[11px] font-mono font-bold text-amber-300 uppercase mb-1">
              Ý kiến Chuyên môn &amp; Cam kết Giải trình (Lưu vĩnh viễn vào Audit Trail):
            </label>
            <textarea
              rows={3}
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Nhập căn cứ pháp lý, nội dung kiểm tra QA/QC hoặc lý do phê duyệt..."
              className="w-full rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-400 p-2.5 text-xs text-white focus:outline-none"
            />
          </div>

          {/* Dấu thời gian & Mã băm SHA-256 tự động */}
          <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/40 space-y-1.5 font-mono">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-emerald-400 font-bold uppercase">
                🔏 Chữ ký Dấu thời gian &amp; Mã băm SHA-256 (Bất biến)
              </span>
              <span className="text-slate-400">{timestampIso.replace('T', ' ').slice(0, 19)} UTC</span>
            </div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800 text-[10px] text-emerald-300 break-all select-all">
              SHA-256: {sha256Hex || 'Đang tính toán mã băm...'}
            </div>
          </div>

          {/* Checkbox cam kết */}
          <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 cursor-pointer">
            <input
              type="checkbox"
              checked={isConfirmedLiability}
              onChange={e => setIsConfirmedLiability(e.target.checked)}
              className="mt-0.5 accent-amber-500 cursor-pointer"
            />
            <span className="text-[11px] text-amber-100 leading-snug">
              Tôi xác nhận thực hiện hành động này theo đúng thẩm quyền RACI của{' '}
              <b>{partyMeta?.shortName || currentActor.rbacRole}</b> và chịu trách nhiệm giải trình
              pháp lý trước Thanh tra Xây dựng &amp; Kiểm toán Nhà nước.
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            disabled={!isConfirmedLiability || isSubmitting}
            onClick={handleConfirmSubmit}
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold transition disabled:opacity-45 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-lg"
          >
            <span>✍️</span>
            <span>{isSubmitting ? 'Đang ghi nhận...' : 'Xác nhận Ký số & Lưu Audit Trail'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
