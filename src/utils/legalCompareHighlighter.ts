import { AiCompareHighlightSpan, LegalDiffCategory } from '../types/lexPmoTypes';

export interface HighlightSegment {
  text: string;
  match?: {
    category: LegalDiffCategory;
    reason: string;
    isAiVerified: boolean;
  };
}

export const DIFF_CATEGORY_META: Record<
  LegalDiffCategory,
  {
    code: LegalDiffCategory;
    icon: string;
    label: string;
    shortLabel: string;
    markClass: string;
    badgeClass: string;
  }
> = {
  TIMELINE: {
    code: 'TIMELINE',
    icon: '⏱️',
    label: 'Mốc thời gian / Thời hạn',
    shortLabel: 'Thời gian',
    markClass:
      'bg-cyan-200/90 text-cyan-950 px-1 py-0.5 rounded border-b-2 border-cyan-600 font-semibold',
    badgeClass: 'bg-cyan-100 text-cyan-900 border-cyan-400',
  },
  AUTHORITY: {
    code: 'AUTHORITY',
    icon: '🏛️',
    label: 'Cấp thẩm quyền / Chủ thể',
    shortLabel: 'Thẩm quyền',
    markClass:
      'bg-rose-200/90 text-rose-950 px-1 py-0.5 rounded border-b-2 border-rose-600 font-semibold',
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-400',
  },
  TECHNICAL: {
    code: 'TECHNICAL',
    icon: '⚙️',
    label: 'Yêu cầu kỹ thuật / Hồ sơ',
    shortLabel: 'Kỹ thuật',
    markClass:
      'bg-violet-200/90 text-violet-950 px-1 py-0.5 rounded border-b-2 border-violet-600 font-semibold',
    badgeClass: 'bg-violet-100 text-violet-900 border-violet-400',
  },
};

const SEMANTIC_CUE_RULES: Array<{
  category: LegalDiffCategory;
  regex: RegExp;
  reason: string;
}> = [
  {
    category: 'TIMELINE',
    regex:
      /\b(?:\d{1,2}\/\d{1,2}\/\d{4}|\d+\s*(?:giờ|ngày\s*làm\s*việc|ngày|tháng|năm)|hàng\s*ngày|định\s*kỳ\s*hàng\s*ngày|trong\s*vòng\s*\d+\s*(?:giờ|ngày)|trước\s*khi\s*(?:thi\s*công|nghiệm\s*thu|thanh\s*toán|chuyển\s*bước))\b/gi,
    reason: 'Mốc thời gian / Thời hạn thực hiện quy định trong điều khoản',
  },
  {
    category: 'AUTHORITY',
    regex:
      /\b(?:Chủ\s*đầu\s*tư|Ban\s*Quản\s*lý\s*(?:dự\s*án|KKT|KCN|các\s*KCN)|Ban\s*QLDA|Tư\s*vấn\s*[Gg]iám\s*sát|TVGS|Tư\s*vấn\s*[Tt]hiết\s*kế|TVTK|Tổng\s*thầu|Nhà\s*thầu(?:\s*thi\s*công)?|UBND\s*(?:cấp\s*)?(?:tỉnh|huyện|xã)|Sở\s*Xây\s*dựng|Bộ\s*Xây\s*dựng|Cơ\s*quan\s*chuyên\s*môn\s*về\s*xây\s*dựng|Thủ\s*tướng\s*Chính\s*phủ|Kiểm\s*toán\s*Nhà\s*nước|Cục\s*PCCC)\b/gi,
    reason: 'Chủ thể / Cấp thẩm quyền thực hiện hoặc phê duyệt',
  },
  {
    category: 'TECHNICAL',
    regex:
      /\b(?:mô\s*hình\s*thông\s*tin\s*công\s*trình|BIM|chữ\s*ký\s*số(?:\s*CA)?|nhật\s*ký\s*(?:thi\s*công\s*)?điện\s*tử|hệ\s*thống\s*CDE|LAS-XD|QCVN\s*[0-9:./-]+|TCVN\s*[0-9:./-]+|CO\/CQ|Phụ\s*lục\s*[IVXa-z0-9.]+|bản\s*vẽ\s*hoàn\s*công|nén\s*tĩnh|siêu\s*âm|độ\s*chặt\s*K\d+|mô\s*đun\s*đàn\s*hồi|tỷ\s*lệ\s*1\/\d+|PCCC|ĐTM|quan\s*trắc)\b/gi,
    reason: 'Yêu cầu kỹ thuật, quy chuẩn, biểu mẫu hoặc công nghệ áp dụng',
  },
];

export function extractLocalSemanticCues(
  text: string,
  otherText: string
): AiCompareHighlightSpan[] {
  if (!text) return [];
  const otherLower = (otherText || '').toLowerCase();
  const found: AiCompareHighlightSpan[] = [];
  const seenPhrases = new Set<string>();

  for (const rule of SEMANTIC_CUE_RULES) {
    const matches = text.match(rule.regex) || [];
    for (const raw of matches) {
      const phrase = raw.trim();
      const lower = phrase.toLowerCase();
      if (phrase.length < 2 || seenPhrases.has(lower)) continue;
      seenPhrases.add(lower);
      const isUniqueOrDifferent = !otherLower.includes(lower);
      found.push({
        category: rule.category,
        phrase,
        reason: isUniqueOrDifferent
          ? `${rule.reason} (Chỉ xuất hiện / khác biệt tại điều khoản này)`
          : `${rule.reason} (Cần đối chiếu ngữ cảnh với điều khoản còn lại)`,
      });
    }
  }
  return found;
}

export function splitTextByHighlightTargets(
  text: string,
  aiTargets: AiCompareHighlightSpan[],
  localTargets: AiCompareHighlightSpan[],
  categoryFilter: 'ALL' | LegalDiffCategory
): HighlightSegment[] {
  if (!text) return [];

  interface RangeMatch {
    start: number;
    end: number;
    category: LegalDiffCategory;
    reason: string;
    isAiVerified: boolean;
  }

  const normalizedAi = (aiTargets || [])
    .filter(t => t.phrase && t.phrase.trim().length >= 2)
    .filter(t => categoryFilter === 'ALL' || t.category === categoryFilter)
    .map(t => ({ ...t, isAiVerified: true }));

  const normalizedLocal = (localTargets || [])
    .filter(t => t.phrase && t.phrase.trim().length >= 2)
    .filter(t => categoryFilter === 'ALL' || t.category === categoryFilter)
    .map(t => ({ ...t, isAiVerified: false }));

  // Prioritize AI-verified exact highlights first, then longest phrases
  const orderedCandidates = [...normalizedAi, ...normalizedLocal].sort((a, b) => {
    if (a.isAiVerified !== b.isAiVerified) return a.isAiVerified ? -1 : 1;
    return b.phrase.length - a.phrase.length;
  });

  const textLower = text.toLowerCase();
  const ranges: RangeMatch[] = [];

  const overlapsExisting = (start: number, end: number) =>
    ranges.some(r => Math.max(r.start, start) < Math.min(r.end, end));

  for (const cand of orderedCandidates) {
    const targetLower = cand.phrase.trim().toLowerCase();
    if (targetLower.length < 2) continue;

    let searchIdx = 0;
    while (searchIdx < textLower.length) {
      const idx = textLower.indexOf(targetLower, searchIdx);
      if (idx === -1) break;
      const end = idx + targetLower.length;
      if (!overlapsExisting(idx, end)) {
        ranges.push({
          start: idx,
          end,
          category: cand.category,
          reason: cand.reason,
          isAiVerified: cand.isAiVerified,
        });
      }
      searchIdx = end;
    }
  }

  if (ranges.length === 0) {
    return [{ text }];
  }

  ranges.sort((a, b) => a.start - b.start);

  const segments: HighlightSegment[] = [];
  let cursor = 0;
  for (const r of ranges) {
    if (r.start > cursor) {
      segments.push({ text: text.slice(cursor, r.start) });
    }
    segments.push({
      text: text.slice(r.start, r.end),
      match: {
        category: r.category,
        reason: r.reason,
        isAiVerified: r.isAiVerified,
      },
    });
    cursor = r.end;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor) });
  }

  return segments;
}
