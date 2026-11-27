import type { LegalDocument, LegalNode } from '../types/lexPmoTypes';

export interface LegalXrefSegment {
  kind: 'text' | 'xref';
  text: string;
  docNumHint?: string;
  lawNameHint?: string;
  articleHint?: string;
  isSelfDocRef?: boolean;
}

export interface ResolvedXrefTarget {
  doc: LegalDocument;
  focusNodeId?: string;
  reasonLabel: string;
}

const KNOWN_LAW_ALIASES: Array<{ re: RegExp; canonicalDocNum: string }> = [
  { re: /^lu[aâậ]t x[aâ]y d[uưự]ng(?:\s+2025|\s+135)?$/i, canonicalDocNum: '135/2025/QH15' },
  { re: /^lu[aâậ]t [đd][aấ]u th[aầ]u/i, canonicalDocNum: '22/2023/QH15' },
  { re: /^lu[aâậ]t [đd][aấ]t [đd]ai/i, canonicalDocNum: '31/2024/QH15' },
  { re: /^lu[aâậ]t [đd][aầ]u t[uư](?:\s+c[oô]ng)?$/i, canonicalDocNum: '58/2024/QH15' },
  { re: /^lu[aâậ]t nh[aà] [oơở]/i, canonicalDocNum: '27/2023/QH15' },
  { re: /^lu[aâậ]t kinh doanh b[aấ]t [đd][oộ]ng s[aả]n/i, canonicalDocNum: '29/2023/QH15' },
  { re: /^lu[aâậ]t quy ho[aạ]ch [đd][oô] th[iị]/i, canonicalDocNum: '47/2024/QH15' },
  { re: /^lu[aâậ]t [đd]i[eệ]n l[uự]c/i, canonicalDocNum: '61/2024/QH15' },
  { re: /^lu[aâậ]t b[aả]o v[eệ] m[oô]i tr[uư][oờ]ng/i, canonicalDocNum: '72/2020/QH14' },
];

const DOC_NUMBER_CORE_RE =
  '\\d{1,4}\\/\\d{4}\\/(?:NĐ-CP|ND-CP|TT-BXD|TT-BTC|TT-BTNMT|TT-BCT|TT-BKHDT|TT-BKHĐT|TT-BNNMT|TT-BCA|TT-BYT|TT-BQP|QĐ-TTg|QD-TTg|QĐ-BXD|QD-BXD|VBHN-VPQH|VBHN-BXD|QH\\d{1,2}|UBTVQH\\d{1,2}|NQ-CP|NQ-UBTVQH\\d{1,2})';

const LAW_TITLE_PATTERN =
  'Luật\\s+(?:Xây dựng|Đấu thầu|Đất đai|Đầu tư công|Đầu tư|Nhà ở|Kinh doanh bất động sản|Quy hoạch đô thị và nông thôn|Điện lực|Bảo vệ môi trường)(?:\\s+(?:số\\s+)?\\d{1,4}\\/\\d{4}\\/QH\\d{1,2}|\\s+năm\\s+\\d{4})?';

// Single-pass longest-first alternation:
// 1. Cross-article + doc citation: "Điều X Nghị định 206/2026/NĐ-CP" or "Điều X Luật Xây dựng..."
// 2. Explicit doc citations: "Nghị định số 206/2026/NĐ-CP" or bare "206/2026/NĐ-CP" or "Luật Xây dựng"
// 3. Internal article citation: "Điều X (của Luật/Nghị định/Thông tư/Quyết định này)"
const MASTER_XREF_REGEX = new RegExp(
  [
    // Group 1: (khoản ... ) Điều X + DocRef
    `(?:(?:[Kk]hoản\\s+\\d+(?:\\s*,\\s*\\d+)*\\s+)?Điều\\s+(\\d+[a-z]?)\\s+(?:của\\s+)?(?:(?:Nghị định|Thông tư|Quyết định|Luật|Văn bản hợp nhất)\\s+(?:số\\s+)?)?(${DOC_NUMBER_CORE_RE}|${LAW_TITLE_PATTERN}))`,
    // Group 2: Explicit DocType + Number
    `(?:(?:Nghị định|Thông tư|Quyết định|Luật|Văn bản hợp nhất|Công văn)\\s+(?:số\\s+)?(${DOC_NUMBER_CORE_RE}))`,
    // Group 3: Named Law Title
    `(${LAW_TITLE_PATTERN})`,
    // Group 4: Bare DocNumber
    `(${DOC_NUMBER_CORE_RE})`,
    // Group 5: Article ref (with optional "của ... này")
    `((?:[Kk]hoản\\s+\\d+(?:\\s*,\\s*\\d+)*\\s+)?Điều\\s+(\\d+[a-z]?)(?:\\s+(?:của\\s+)?(?:Luật|Nghị định|Thông tư|Quyết định)\\s+này)?)`,
  ].join('|'),
  'gu'
);

function normalizeDocLookupKey(raw: string): string {
  return String(raw || '')
    .normalize('NFC')
    .replace(/Đ/g, 'D')
    .replace(/đ/g, 'd')
    .replace(/NĐ-CP/gi, 'ND-CP')
    .replace(/QĐ-/gi, 'QD-')
    .replace(/BKHĐT/gi, 'BKHDT')
    .trim()
    .toLowerCase();
}

export function buildDocRefIndex(docs: LegalDocument[]): Map<string, LegalDocument> {
  const index = new Map<string, LegalDocument>();
  for (const doc of docs) {
    if (doc.docNumber && doc.docNumber !== '01') {
      const k = normalizeDocLookupKey(doc.docNumber);
      if (k && !index.has(k)) index.set(k, doc);
      // Also index stripped leading zeros like "17/2026/nd-cp" -> handle "017"
      const shortNum = k.replace(/^0+(?=\d)/, '');
      if (shortNum && !index.has(shortNum)) index.set(shortNum, doc);
    }
    const titleNorm = normalizeDocLookupKey(doc.title);
    for (const alias of KNOWN_LAW_ALIASES) {
      if (alias.re.test(doc.title) || alias.re.test(titleNorm)) {
        const canonical = normalizeDocLookupKey(alias.canonicalDocNum);
        if (!index.has(canonical)) index.set(canonical, doc);
      }
    }
  }
  return index;
}

export function parseLegalXrefs(text: string): LegalXrefSegment[] {
  const input = String(text || '');
  if (!input) return [];

  MASTER_XREF_REGEX.lastIndex = 0;
  const segments: LegalXrefSegment[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = MASTER_XREF_REGEX.exec(input)) !== null) {
    const start = match.index;
    const matchedText = match[0];
    if (start > cursor) {
      segments.push({ kind: 'text', text: input.slice(cursor, start) });
    }

    const combinedArt = match[1];
    const combinedDoc = match[2];
    const typedDocNum = match[3];
    const lawTitle = match[4];
    const bareDocNum = match[5];
    const internalArtNum = match[7];

    if (combinedArt && combinedDoc) {
      const isLaw = /^Luật\s+/i.test(combinedDoc);
      const extractedDocNum = combinedDoc.match(new RegExp(DOC_NUMBER_CORE_RE, 'i'))?.[0];
      segments.push({
        kind: 'xref',
        text: matchedText,
        articleHint: combinedArt,
        docNumHint: extractedDocNum || undefined,
        lawNameHint: isLaw ? combinedDoc : undefined,
      });
    } else if (typedDocNum || bareDocNum) {
      segments.push({
        kind: 'xref',
        text: matchedText,
        docNumHint: typedDocNum || bareDocNum,
      });
    } else if (lawTitle) {
      const extractedDocNum = lawTitle.match(new RegExp(DOC_NUMBER_CORE_RE, 'i'))?.[0];
      segments.push({
        kind: 'xref',
        text: matchedText,
        docNumHint: extractedDocNum || undefined,
        lawNameHint: lawTitle,
      });
    } else if (internalArtNum) {
      segments.push({
        kind: 'xref',
        text: matchedText,
        articleHint: internalArtNum,
        isSelfDocRef: true,
      });
    } else {
      segments.push({ kind: 'text', text: matchedText });
    }

    cursor = start + matchedText.length;
  }

  if (cursor < input.length) {
    segments.push({ kind: 'text', text: input.slice(cursor) });
  }
  return segments;
}

function findArticleNode(nodes: LegalNode[], articleHint?: string): LegalNode | undefined {
  if (!articleHint || !Array.isArray(nodes) || nodes.length === 0) return undefined;
  const exactRe = new RegExp(`^Điều\\s+${articleHint}\\b`, 'i');
  return nodes.find(
    n => exactRe.test(n.code.trim()) || exactRe.test(n.title.trim())
  );
}

export function resolveXrefTarget(
  seg: LegalXrefSegment,
  currentDoc: LegalDocument,
  index: Map<string, LegalDocument>
): ResolvedXrefTarget | null {
  if (seg.kind !== 'xref') return null;

  // 1. Tham chiếu nội bộ trong chính văn bản đang đọc ("Điều X" / "Điều X Luật này")
  if (seg.isSelfDocRef && seg.articleHint) {
    const matchedNode = findArticleNode(currentDoc.nodes, seg.articleHint);
    if (!matchedNode) return null;
    return {
      doc: currentDoc,
      focusNodeId: matchedNode.id,
      reasonLabel: `Tham chiếu nội bộ · ${matchedNode.code}`,
    };
  }

  // 2. Tham chiếu sang văn bản khác theo số hiệu hoặc tên Luật phổ biến
  let lookupKey = seg.docNumHint ? normalizeDocLookupKey(seg.docNumHint) : '';
  if (!lookupKey && seg.lawNameHint) {
    const strippedLaw = seg.lawNameHint.replace(/\s+năm\s+\d{4}$/i, '').trim();
    const alias = KNOWN_LAW_ALIASES.find(a => a.re.test(strippedLaw));
    if (alias) lookupKey = normalizeDocLookupKey(alias.canonicalDocNum);
  }
  if (!lookupKey) return null;

  const targetDoc = index.get(lookupKey);
  if (!targetDoc) return null;

  const matchedNode = seg.articleHint
    ? findArticleNode(targetDoc.nodes, seg.articleHint)
    : undefined;

  return {
    doc: targetDoc,
    focusNodeId: matchedNode?.id,
    reasonLabel: matchedNode
      ? `Dẫn chiếu · ${targetDoc.docNumber} (${matchedNode.code})`
      : `Dẫn chiếu · ${targetDoc.docNumber}`,
  };
}
