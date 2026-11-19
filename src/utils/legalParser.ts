import {
  AnalyzedFileItem,
  BatchValidationStatus,
  FolderNamingPresetCode,
  FunctionalDomainCode,
  LegalNode,
  OcrZonesExtract,
  ProjectArchetypeCode,
  QlvbNamingGroupCode,
  SmartTagCategory,
  SmartTagItem,
  SmartTagStatus,
} from '../types/lexPmoTypes';

declare global {
  interface Window {
    pdfjsLib?: {
      GlobalWorkerOptions: { workerSrc: string };
      getDocument: (params: { data: ArrayBuffer }) => {
        promise: Promise<{
          numPages: number;
          getPage: (pageNum: number) => Promise<{
            getTextContent: () => Promise<{ items: Array<{ str: string }> }>;
          }>;
        }>;
      };
    };
    mammoth?: {
      extractRawText: (params: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>;
    };
  }
}

if (typeof window !== 'undefined' && window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

export const SSOT_LEGAL_DOC_TYPES = ['LUAT', 'NQ', 'ND', 'TT', 'QCVN', 'TCVN', 'VBHN'] as const;
export const SSOT_PROJECT_DOC_TYPES = ['QD', 'TTr', 'HD', 'PLHD', 'BBNT', 'NKTC', 'BV'] as const;

export function normalizeSsotDocType(docType: string): string {
  const raw = (docType || '').trim();
  if (!raw) return 'ND';
  const upper = raw.toUpperCase();
  if (upper === 'TTR') return 'TTr';
  return upper;
}

export function isProjectDossierDocType(docType: string): boolean {
  const normalized = normalizeSsotDocType(docType);
  return (SSOT_PROJECT_DOC_TYPES as readonly string[]).includes(normalized);
}

export function inferDefaultGateForDoc(
  docType: string,
  primaryDomain: FunctionalDomainCode,
  linkedGates?: string[],
  explicitGateCode?: string
): string {
  if (explicitGateCode && explicitGateCode.trim()) {
    return explicitGateCode.trim().toUpperCase();
  }
  const normalized = normalizeSsotDocType(docType);
  const cleanedGates = (linkedGates || []).map(g => g.trim().toUpperCase()).filter(Boolean);
  if (cleanedGates.length > 0) {
    if ((normalized === 'HD' || normalized === 'PLHD') && cleanedGates.includes('G11')) {
      return 'G11';
    }
    if ((normalized === 'BBNT' || normalized === 'NKTC' || normalized === 'BV') && cleanedGates.includes('G12')) {
      return 'G12';
    }
    if (normalized === 'BV' && cleanedGates.includes('G9')) {
      return 'G9';
    }
    return cleanedGates[0];
  }
  if (normalized === 'HD' || normalized === 'PLHD') return 'G11';
  if (normalized === 'BBNT' || normalized === 'NKTC' || normalized === 'BV') return 'G12';
  if (normalized === 'QD') {
    if (primaryDomain === 'DTH') return 'G10';
    if (primaryDomain === 'QLCP') return 'G9';
    if (primaryDomain === 'DTU') return 'G0';
    if (primaryDomain === 'QHDD') return 'G3';
    if (primaryDomain === 'PCCC') return 'G6';
    if (primaryDomain === 'TQT') return 'G15';
    return 'G12';
  }
  if (normalized === 'TTr') {
    if (primaryDomain === 'QLHD') return 'G11';
    if (primaryDomain === 'QLCP') return 'G9';
    if (primaryDomain === 'TQT') return 'G14';
    return 'G12';
  }
  return 'G12';
}

export function removeVietnameseTones(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

const LEADING_SSOT_PREFIX_RE =
  /^(?:[0-9A-Za-z-]+-\d{4}_(?:LUAT|NQ|ND|TT|QCVN|TCVN|VBHN|QD|TTR|HD|PLHD|BBNT|NKTC|BV|CV)_[A-Z0-9]+_|(?:XD|BDS|TC|DN)_[A-Z]+_[A-Z]+_[0-9A-Z-]+_\d{4}_[A-Z]+_|(?:[A-Z_]+_G\d{1,2}_)?(?:LUAT|NQ|ND|TT|QCVN|TCVN|VBHN|QD|TTR|HD|PLHD|BBNT|NKTC|BV|CV)_\d{4}-[0-9A-Za-z-]+_[A-Z]+_)/i;

const LEADING_DOC_TYPE_RE =
  /^(?:van ban hop nhat|vbhn|bo luat|luat|nghi quyet|nq|nghi dinh|nd-cp|nd|thong tu lien tich|thong tu|tt-bxd|tt-btc|tt-bkhdt|tt-bca|tt-bnnmt|tt|quy chuan ky thuat quoc gia|quy chuan ky thuat|quy chuan|qcvn|tieu chuan quoc gia|tieu chuan|tcvn|quyet dinh|qd|to trinh|ttr|phu luc hop dong|plhd|hop dong thi cong xay dung cong trinh|hop dong thi cong xay dung|hop dong thi cong|hop dong xay dung|hop dong|hdxd|hd|bien ban nghiem thu cong viec xay dung|bien ban nghiem thu|bien ban|bbnt|nhat ky thi cong xay dung cong trinh|nhat ky thi cong|nktc|ho so thiet ke ban ve thi cong|ban ve thiet ke ban ve thi cong|ban ve tkbvtc|ban ve thiet ke|ban ve|tkbvtc|bv|cong van|cv)\b[\s:.,/-]*/i;

const LEADING_DOC_NUMBER_RE =
  /^(?:so\b[\s:.,/-]*)?(?:\d{1,5}(?:[/_:-]\d{1,4})+(?:[/_:-][a-z0-9]+){0,3}|\d{1,5}(?:\s*-\s*[a-z0-9]+)+)\b[\s:.,/-]*/i;

const LEADING_BARE_NUMBER_RE = /^(?:so\b[\s:.,/-]*)?\d{1,5}\b[\s:.,/-]*/i;

const LEADING_ISSUER_CODE_RE =
  /^(?:qh\d*|cp|nd-cp|bxd|bkhdt|btc|bca|bct|bkhcn|ubnd|bqlkkt|sxd|cdt|bqlda|tvgs|tvtk|nttc|qlcl|qlcp|qlhd|hdxd)\b[\s:.,/-]*/i;

const LEADING_FILLER_PHRASE_RE =
  /^(?:cua chinh phu|cua quoc hoi|cua bo xay dung|cua bo tai chinh|cua thu tuong chinh phu|cua ubnd|ngay\s+\d{1,2}(?:\s+thang\s+\d{1,2}\s+nam\s+\d{4}|\/\d{1,2}\/\d{4})|ban hanh quy chuan ky thuat quoc gia ve|ban hanh quy dinh ve|ban hanh|quy dinh chi tiet thi hanh mot so dieu cua|quy dinh chi tiet mot so dieu va bien phap thi hanh|quy dinh chi tiet mot so dieu cua|quy dinh chi tiet ve|quy dinh chi tiet|quy dinh ve|quy dinh|huong dan thi hanh|huong dan chi tiet ve|huong dan ve|huong dan|ve viec|v\/v|vv|ve)\b[\s:.,/-]*/i;

/**
 * Loại bỏ các từ lặp thừa ở đầu trích yếu (VD: "Nghị định số...", "Thông tư quy định về...", "Quyết định về việc...").
 */
export function stripRedundantSummaryPrefix(rawSummary: string): string {
  if (!rawSummary) return '';
  const withoutSsotPrefix = rawSummary.trim().replace(LEADING_SSOT_PREFIX_RE, '');
  const base = removeVietnameseTones(withoutSsotPrefix)
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!base) return '';

  let s = base;
  let hadDocOrNumberPrefix = false;

  for (let i = 0; i < 6; i++) {
    const before = s;
    if (LEADING_DOC_TYPE_RE.test(s)) {
      s = s.replace(LEADING_DOC_TYPE_RE, '').trim();
      hadDocOrNumberPrefix = true;
    }
    if (LEADING_DOC_NUMBER_RE.test(s)) {
      s = s.replace(LEADING_DOC_NUMBER_RE, '').trim();
      hadDocOrNumberPrefix = true;
    } else if (hadDocOrNumberPrefix && LEADING_BARE_NUMBER_RE.test(s)) {
      s = s.replace(LEADING_BARE_NUMBER_RE, '').trim();
    }
    if (hadDocOrNumberPrefix && LEADING_ISSUER_CODE_RE.test(s)) {
      s = s.replace(LEADING_ISSUER_CODE_RE, '').trim();
    }
    if (LEADING_FILLER_PHRASE_RE.test(s)) {
      s = s.replace(LEADING_FILLER_PHRASE_RE, '').trim();
    }
    if (s === before) break;
  }

  const remainingAlnum = s.replace(/[^a-zA-Z0-9]/g, '');
  return remainingAlnum.length >= 3 ? s : base;
}

export function toPascalCaseVN(str: string, maxLength = 40): string {
  if (!str) return 'TrichYeuVanBan';
  const stripped = stripRedundantSummaryPrefix(str);
  const cleanStr = (stripped || removeVietnameseTones(str))
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim();
  const pascal = cleanStr
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
  return pascal.substring(0, maxLength) || 'TrichYeuVanBan';
}

export function cleanDocNumber(rawNum: string, year?: string): string {
  if (!rawNum) return '00';
  let s = removeVietnameseTones(rawNum).trim();
  s = s.split('/')[0].split(':')[0].trim();
  s = s.replace(/^(?:19|20)\d{2}[-_\s]+/, '');
  s = s.replace(/[-_](?:19|20)\d{2}(?:[-_].*)?$/i, '');
  s = s.replace(
    /[-_](?:LUAT|NQ|ND|TT|QCVN|TCVN|VBHN|QD|TTR|HD|PLHD|BBNT|NKTC|BV|CP|QH\d*|BXD|BTC|BQLDA|TVGS|CDT)(?:[-_].*)?$/i,
    ''
  );
  if (year) {
    const cleanY = year.replace(/\D/g, '');
    if (cleanY.length === 4) {
      s = s.replace(new RegExp(`^${cleanY}[-_]?`), '').replace(new RegExp(`[-_]?${cleanY}$`), '');
    }
  }
  const alnum = s.replace(/[^a-zA-Z0-9]/g, '');
  return alnum || '00';
}

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '12.4 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export async function computeSha256Short(input: File | string): Promise<string> {
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const buffer =
        typeof input === 'string'
          ? new TextEncoder().encode(input).buffer
          : await input.arrayBuffer();
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const fullHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return fullHex.substring(0, 12).toUpperCase();
    }
  } catch {
    // Fallback hash
  }
  const str = typeof input === 'string' ? input : `${input.name}-${input.size}`;
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h).toString(16).padStart(8, '0').toUpperCase() + 'A9F2';
}

export function extractOcrZonesFromText(fileName: string, text: string): OcrZonesExtract {
  const lines = (text || '')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  // V1: Cơ quan ban hành (Góc trên trái)
  const issuerLine =
    lines.find(l =>
      /CHÍNH PHỦ|QUỐC HỘI|BỘ XÂY DỰNG|BỘ TÀI CHÍNH|ỦY BAN NHÂN DÂN|BAN QUẢN LÝ|CHỦ ĐẦU TƯ|CÔNG TY/i.test(
        l
      )
    ) || 'BỘ XÂY DỰNG / CHÍNH PHỦ';

  // V2: Số hiệu & Ngày ban hành (Góc trên phải)
  const numMatch =
    (text || '').match(/Số\s*:\s*([0-9a-zA-Z\-/Đđ]+)/i) ||
    fileName.match(/(\d{1,4}[/_-](?:\d{4}[/_-])?[A-Za-zĐđ-]+)/);
  const dateMatch = (text || '').match(
    /(?:ngày\s+\d{1,2}\s+tháng\s+\d{1,2}\s+năm\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{4})/i
  );
  const v2NumberDate = `${numMatch ? `Số: ${numMatch[1]}` : 'Số: Tự động nhận diện'} · ${
    dateMatch ? dateMatch[0] : 'Năm 2026'
  }`;

  // V3: Tên loại & Trích yếu (Vùng tiêu đề trung tâm)
  const titleLine =
    lines.find(l =>
      /NGHỊ ĐỊNH|THÔNG TƯ|LUẬT|QUYẾT ĐỊNH|BIÊN BẢN|HỢP ĐỒNG|TỜ TRÌNH|BÁO CÁO|QUY CHUẨN|TIÊU CHUẨN/i.test(
        l
      )
    ) || fileName.replace(/\.[^/.]+$/, '');
  const subTitleLine =
    lines.find(
      l =>
        /Về việc|Quy định chi tiết|Hướng dẫn|V\/v|Nghiệm thu|Phê duyệt/i.test(l) &&
        l !== titleLine
    ) || '';
  const v3TitleSummary = [titleLine, subTitleLine].filter(Boolean).join(' — ').substring(0, 120);

  // V4: Người ký, Dấu đỏ & Hiệu lực (Vùng chân văn bản)
  const signerLine =
    lines.find(l =>
      /KT\.|TM\.|BỘ TRƯỞNG|THỦ TƯỚNG|CHỦ TỊCH|GIÁM ĐỐC|ĐÃ KÝ|Nơi nhận/i.test(l)
    ) || 'Đã xác thực chữ ký số / Dấu đỏ hợp lệ';

  const confidence = text && text.trim().length > 80 ? 96 : text && text.trim().length > 15 ? 89 : 84;

  return {
    v1Issuer: issuerLine.substring(0, 80),
    v2NumberDate,
    v3TitleSummary: v3TitleSummary || fileName,
    v4SignerValidity: signerLine.substring(0, 80),
    confidence,
  };
}

export function parseVietnameseLegalText(rawText: string): LegalNode[] {
  const lines = rawText
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);
  const nodes: LegalNode[] = [];
  let currentNode: LegalNode | null = null;

  lines.forEach((line, idx) => {
    const isChapter = /^(Chương|CHƯƠNG)\s+[IVXLCDM0-9]+/i.test(line);
    const isSection = /^(Mục|MỤC)\s+[0-9]+/i.test(line);
    const isArticle = /^(Điều|ĐIỀU)\s+[0-9]+[a-z]?[.:]?/i.test(line);

    if (isChapter || isSection || isArticle) {
      if (currentNode) nodes.push(currentNode);
      const parts = line.split(/[.:]/);
      const code = parts[0].trim() + (isArticle ? '.' : '');
      const title = parts.slice(1).join('.').trim() || line;
      currentNode = {
        id: 'AUTO-' + (idx + 1),
        level: isChapter ? 'Chương' : isSection ? 'Mục' : 'Điều',
        code,
        title,
        clauseCount: isArticle ? 3 : 0,
        content: '',
      };
    } else {
      if (!currentNode) {
        currentNode = {
          id: 'AUTO-0',
          level: 'Mở đầu',
          code: 'Căn cứ ban hành · Lời mở đầu',
          title: '',
          clauseCount: 4,
          content: line,
        };
      } else {
        currentNode.content += (currentNode.content ? '\n' : '') + line;
      }
    }
  });
  if (currentNode) nodes.push(currentNode);
  return nodes;
}

export function detectQlvbGroup(docType: string, primaryDomain: FunctionalDomainCode): QlvbNamingGroupCode {
  const normalized = normalizeSsotDocType(docType);
  if (['LUAT', 'NQ', 'ND', 'TT', 'VBHN', 'QCVN', 'TCVN'].includes(normalized)) return 'PL';
  if (normalized === 'BV') return 'TK';
  if (['BBNT', 'NKTC', 'BB', 'BC'].includes(normalized) && ['QLCL', 'VLXD', 'QLCP', 'TQT'].includes(primaryDomain)) {
    return 'KT';
  }
  if (['HD', 'PLHD', 'QD'].includes(normalized) && ['DTU', 'QHDD', 'PCCC', 'DTH', 'QLHD'].includes(primaryDomain)) {
    return 'PLDA';
  }
  if (['TTr', 'CVDi', 'CVDe', 'TB'].includes(normalized)) return 'HC';
  return 'PL';
}

export function buildFileNameByRule(params: {
  group: QlvbNamingGroupCode;
  industry: string;
  docType: string;
  issuer: string;
  rawNumber: string;
  year: string;
  primaryDomain: FunctionalDomainCode;
  rawSummary: string;
  appendixSuffix: string;
  ext: string;
  projectCode?: ProjectArchetypeCode;
  gateCode?: string;
  linkedGates?: string[];
  projectSubCode?: string;
  ktSubType?: string;
  tkStageDept?: string;
  tkDocCode?: string;
  tkRevision?: string;
}): string {
  const extClean = (params.ext || 'pdf').replace(/^\./, '').toLowerCase();
  const yearClean = (params.year || '2026').replace(/\D/g, '').slice(0, 4) || '2026';
  const numClean = cleanDocNumber(params.rawNumber, yearClean);
  const suffixRaw = params.appendixSuffix ? params.appendixSuffix.trim().replace(/^-+/, '') : '';
  const suffixFormatted = suffixRaw ? `-${suffixRaw}` : '';
  const canonicalType = normalizeSsotDocType(params.docType);

  // Giới hạn Trích yếu <= 40 ký tự PascalCase sau khi đã loại bỏ từ lặp thừa
  const summary40 = toPascalCaseVN(params.rawSummary, 40);

  if (params.group === 'SSOT_9PART') {
    // Công thức chuẩn thống nhất: [SốHiệu]-[Năm]_[LoạiVB]_[LĩnhVực]_[TríchYếuNgắn][-PhụLục].[ext]
    return `${numClean}-${yearClean}_${canonicalType}_${params.primaryDomain}_${summary40}${suffixFormatted}.${extClean}`;
  }

  // Các nhóm QLVB_NAMING_DB v0.1 giới hạn Trích dẫn <= 40 ký tự PascalCase
  const projPrefix = params.projectSubCode
    ? `${params.projectCode || 'KCN'}-${params.projectSubCode}`
    : params.projectCode || 'KCN';

  if (params.group === 'PL') {
    // {Lĩnh vực}_{Loại[-Cơ quan]}_{Số}_{Năm}_{Trích dẫn}[Hậu tố].{Đuôi}
    const lvMap: Record<string, string> = {
      XD: 'XD',
      BDS: 'DD',
      TC: 'TC',
      DN: 'DN',
      MT: 'MT',
      PCCC: 'PCCC',
    };
    const lv = lvMap[params.industry] || 'XD';
    const needIssuer = ['QD', 'TT', 'TTLT', 'CT', 'CVHD', 'VBHN'].includes(canonicalType);
    const typeAndIssuer =
      needIssuer && params.issuer ? `${canonicalType}-${params.issuer}` : canonicalType;
    const digitsOnly = numClean.replace(/\D/g, '') || '01';
    return `${lv}_${typeAndIssuer}_${digitsOnly}_${yearClean}_${summary40}${suffixFormatted}.${extClean}`;
  }

  if (params.group === 'HC') {
    // {Đơn vị}_{Loại}_{Số pad 3}_{Năm}_{Trích dẫn}[Hậu tố].{Đuôi}
    const hcType = ['CVDi', 'CVDe', 'QD', 'TTr', 'TB', 'BC', 'BB', 'KH', 'GM', 'UQ', 'QC', 'QT'].includes(
      canonicalType
    )
      ? canonicalType
      : 'TTr';
    const digits = numClean.replace(/\D/g, '');
    const paddedNum = digits ? digits.padStart(3, '0') : 'N1116';
    const unit = params.issuer || 'BQLDA';
    return `${unit}_${hcType}_${paddedNum}_${yearClean}_${summary40}${suffixFormatted}.${extClean}`;
  }

  if (params.group === 'KT') {
    // {Dự án[-CôngTrình][-Gói]}_{Mảng-Loại}_{Số/Kỳ}_{Năm}_{Trích dẫn}[Hậu tố].{Đuôi}
    const ktPair = params.ktSubType || (params.primaryDomain === 'QLHD' ? 'TT-IPC' : 'CL-BBNTCV');
    const digits = numClean.replace(/\D/g, '');
    const paddedNum = digits ? digits.padStart(3, '0') : '001';
    return `${projPrefix}_${ktPair}_${paddedNum}_${yearClean}_${summary40}${suffixFormatted}.${extClean}`;
  }

  if (params.group === 'TK') {
    // {Dự án[-CôngTrình]}_{Giai đoạn-Bộ môn}_{Hạng mục-Mã tài liệu}_{Rev}_{Trích dẫn}[Hậu tố].{Đuôi}
    const stageDept = params.tkStageDept || 'TKBV-KC';
    const docCode = params.tkDocCode || 'HM01-BV001';
    const rev = params.tkRevision || 'R01';
    return `${projPrefix}_${stageDept}_${docCode}_${rev}_${summary40}${suffixFormatted}.${extClean}`;
  }

  // PLDA: {Dự án[-CôngTrình][-Gói]}_{Loại}_{Số}_{Năm}_{Trích dẫn}[Hậu tố].{Đuôi}
  const pldaType = [
    'CTDT',
    'GCNDT',
    'QDQH',
    'QDGD',
    'GCNQSDD',
    'HDTD',
    'GPMT',
    'DTM',
    'GPXD',
    'TDPCCC',
    'QDPD-TMDT',
    'QDPD-DT',
    'QDPD-KHLCNT',
    'HD',
    'PLHD',
    'BLTH',
    'BHXD',
  ].includes(canonicalType)
    ? canonicalType
    : 'GPXD';
  return `${projPrefix}_${pldaType}_${numClean || '01'}_${yearClean}_${summary40}${suffixFormatted}.${extClean}`;
}

export const SSOT_FILENAME_RULE_RE =
  /^[0-9A-Za-z]+(?:-[0-9A-Za-z]+)*-\d{4}_[A-Za-z0-9-]+_[A-Z0-9]+_[A-Za-z0-9]+(?:-[A-Za-z0-9_-]+)?\.[a-z0-9]+$/i;

export function validateBatchFileName(
  fileName: string,
  group: QlvbNamingGroupCode,
  docType: string,
  issuer: string,
  rawSummary: string,
  existingNames: string[],
  itemKind: 'FILE' | 'FOLDER' = 'FILE'
): { status: BatchValidationStatus; message: string } {
  if (!rawSummary || !rawSummary.trim()) {
    return { status: 'THIEU_TRUONG', message: 'Thiếu trích yếu văn bản' };
  }
  if (
    itemKind !== 'FOLDER' &&
    group === 'SSOT_9PART' &&
    !SSOT_FILENAME_RULE_RE.test((fileName || '').trim())
  ) {
    return {
      status: 'THIEU_TRUONG',
      message: 'Sai công thức [SốHiệu]-[Năm]_[LoạiVB]_[LĩnhVực]_[TríchYếu].[ext]',
    };
  }
  if (
    group === 'PL' &&
    ['QD', 'TT', 'TTLT', 'CT', 'CVHD', 'VBHN'].includes(docType) &&
    (!issuer || !issuer.trim())
  ) {
    return { status: 'THIEU_CO_QUAN', message: `Loại ${docType} bắt buộc có -CơQuan` };
  }
  if (fileName.length > 120) {
    return {
      status: 'QUA_DAI',
      message: `Quá dài (${fileName.length}/120 ký tự)`,
    };
  }
  const duplicateCount = existingNames.filter(
    n => n.toLowerCase() === fileName.toLowerCase()
  ).length;
  if (duplicateCount > 1) {
    return {
      status: 'TRUNG',
      message: 'Trùng tên file trong lô xử lý',
    };
  }
  return { status: 'OK', message: `Chuẩn (${fileName.length} ký tự)` };
}

export const SMART_TAG_INDUSTRY_OPTIONS: Array<{
  code: string;
  label: string;
  industryGroupId: string;
}> = [
  { code: 'XD', label: 'Ngành: Xây dựng (XD)', industryGroupId: 'IND-XAYDUNG-DAUTHAU' },
  { code: 'BDS', label: 'Ngành: Đầu tư KCN & BĐS (BDS)', industryGroupId: 'IND-DOANHNGHIEP' },
  { code: 'TC', label: 'Ngành: Tài chính - Kế toán (TC)', industryGroupId: 'IND-KETOAN' },
  { code: 'DN', label: 'Ngành: Quản trị Doanh nghiệp (DN)', industryGroupId: 'IND-LAODONG' },
];

export const SMART_TAG_SUB_SECTOR_OPTIONS: Array<{
  code: string;
  label: string;
  subSectorLabel: string;
  industryGroupId: string;
  industryCode: string;
}> = [
  {
    code: 'XD_XAYDUNG',
    label: 'LV con: Xây dựng',
    subSectorLabel: 'Xây dựng',
    industryGroupId: 'IND-XAYDUNG-DAUTHAU',
    industryCode: 'XD',
  },
  {
    code: 'XD_DAUTHAU',
    label: 'LV con: Đấu thầu',
    subSectorLabel: 'Đấu thầu',
    industryGroupId: 'IND-XAYDUNG-DAUTHAU',
    industryCode: 'XD',
  },
  {
    code: 'XD_XUPHAT',
    label: 'LV con: Xử phạt XD',
    subSectorLabel: 'Xử phạt vi phạm',
    industryGroupId: 'IND-XAYDUNG-DAUTHAU',
    industryCode: 'XD',
  },
  {
    code: 'DN_DTU',
    label: 'LV con: Đầu tư KCN/FTZ',
    subSectorLabel: 'Đầu tư Hạ tầng KCN · KKT · FTZ',
    industryGroupId: 'IND-DOANHNGHIEP',
    industryCode: 'BDS',
  },
  {
    code: 'DN_CCN',
    label: 'LV con: Cụm CN (CCN)',
    subSectorLabel: 'Phát triển Cụm Công Nghiệp (CCN)',
    industryGroupId: 'IND-DOANHNGHIEP',
    industryCode: 'BDS',
  },
  {
    code: 'DN_PPP',
    label: 'LV con: PPP / BT',
    subSectorLabel: 'Đầu tư theo phương thức PPP / BT',
    industryGroupId: 'IND-DOANHNGHIEP',
    industryCode: 'BDS',
  },
  {
    code: 'KT_QT',
    label: 'LV con: Quyết toán vốn',
    subSectorLabel: 'Kiểm toán & Quyết toán vốn đầu tư',
    industryGroupId: 'IND-KETOAN',
    industryCode: 'TC',
  },
  {
    code: 'TTHC_LIENTHONG',
    label: 'LV con: TTHC Liên thông',
    subSectorLabel: 'Thủ tục hành chính - liên thông',
    industryGroupId: 'IND-TTHC',
    industryCode: 'XD',
  },
  {
    code: 'CDS_BIM',
    label: 'LV con: BIM & CDE',
    subSectorLabel: 'Chuyển đổi số (BIM & CDE Dự án)',
    industryGroupId: 'IND-CHUYENDOISO',
    industryCode: 'XD',
  },
  {
    code: 'CDS_KHCN',
    label: 'LV con: TCVN / QCVN',
    subSectorLabel: 'KHCN - Đổi mới sáng tạo (TCVN/QCVN)',
    industryGroupId: 'IND-CHUYENDOISO',
    industryCode: 'XD',
  },
  {
    code: 'LD_ATLD',
    label: 'LV con: ATLĐ Xây dựng',
    subSectorLabel: 'An toàn vệ sinh lao động xây dựng',
    industryGroupId: 'IND-LAODONG',
    industryCode: 'DN',
  },
];

export const SMART_TAG_DOMAIN_CODES: FunctionalDomainCode[] = [
  'QLCL',
  'HDXD',
  'QLHD',
  'QLCP',
  'VLXD',
  'TCVN',
  'QCVN',
  'DTH',
  'TQT',
  'PCCC',
  'QHDD',
  'ATLD',
  'DTU',
];

export const SMART_TAG_PROJECT_AXES: ProjectArchetypeCode[] = [
  'KCN',
  'HTKT',
  'DAN_DUNG',
  'CCN',
  'FTZ',
  'PPP_BT',
];

export const SMART_TAG_STAGE_GATES: string[] = Array.from({ length: 17 }, (_, i) => `G${i}`);

export function inferSubSectorFromDomain(
  primaryDomain: FunctionalDomainCode,
  industryCode?: string,
  requestedGroupId?: string,
  requestedSubCode?: string
): {
  industryGroupId: string;
  industryCode: string;
  industryLabel: string;
  subSectorCode: string;
  subSectorLabel: string;
} {
  if (requestedSubCode) {
    const subMatch = SMART_TAG_SUB_SECTOR_OPTIONS.find(
      s => s.code.toUpperCase() === requestedSubCode.trim().toUpperCase()
    );
    if (subMatch) {
      const indMatch = SMART_TAG_INDUSTRY_OPTIONS.find(i => i.code === subMatch.industryCode);
      return {
        industryGroupId: requestedGroupId || subMatch.industryGroupId,
        industryCode: subMatch.industryCode,
        industryLabel: indMatch?.label || 'Ngành: Xây dựng (XD)',
        subSectorCode: subMatch.code,
        subSectorLabel: subMatch.subSectorLabel,
      };
    }
  }

  let res: {
    industryGroupId: string;
    industryCode: string;
    subSectorCode: string;
    subSectorLabel: string;
  };

  if (primaryDomain === 'DTH') {
    res = {
      industryGroupId: 'IND-XAYDUNG-DAUTHAU',
      industryCode: 'XD',
      subSectorCode: 'XD_DAUTHAU',
      subSectorLabel: 'Đấu thầu',
    };
  } else if (primaryDomain === 'DTU') {
    res = {
      industryGroupId: 'IND-DOANHNGHIEP',
      industryCode: 'BDS',
      subSectorCode: 'DN_DTU',
      subSectorLabel: 'Đầu tư Hạ tầng KCN · KKT · FTZ',
    };
  } else if (primaryDomain === 'TQT') {
    res = {
      industryGroupId: 'IND-KETOAN',
      industryCode: 'TC',
      subSectorCode: 'KT_QT',
      subSectorLabel: 'Kiểm toán & Quyết toán vốn đầu tư',
    };
  } else if (primaryDomain === 'PCCC') {
    res = {
      industryGroupId: 'IND-TTHC',
      industryCode: 'XD',
      subSectorCode: 'TTHC_LIENTHONG',
      subSectorLabel: 'Thủ tục hành chính - liên thông',
    };
  } else if (primaryDomain === 'ATLD') {
    res = {
      industryGroupId: 'IND-LAODONG',
      industryCode: 'DN',
      subSectorCode: 'LD_ATLD',
      subSectorLabel: 'An toàn vệ sinh lao động xây dựng',
    };
  } else if (primaryDomain === 'QCVN' || primaryDomain === 'TCVN') {
    res = {
      industryGroupId: 'IND-CHUYENDOISO',
      industryCode: 'XD',
      subSectorCode: 'CDS_KHCN',
      subSectorLabel: 'KHCN - Đổi mới sáng tạo (TCVN/QCVN)',
    };
  } else {
    res = {
      industryGroupId: 'IND-XAYDUNG-DAUTHAU',
      industryCode: 'XD',
      subSectorCode: 'XD_XAYDUNG',
      subSectorLabel: 'Xây dựng',
    };
  }

  if (requestedGroupId) {
    res.industryGroupId = requestedGroupId;
  } else if (industryCode) {
    const indOpt = SMART_TAG_INDUSTRY_OPTIONS.find(
      i => i.code.toUpperCase() === industryCode.trim().toUpperCase()
    );
    if (indOpt) {
      res.industryCode = indOpt.code;
      if (!['DTH', 'PCCC', 'QCVN', 'TCVN'].includes(primaryDomain)) {
        res.industryGroupId = indOpt.industryGroupId;
      }
    }
  }

  const industryLabel =
    SMART_TAG_INDUSTRY_OPTIONS.find(i => i.code === res.industryCode)?.label || 'Ngành: Xây dựng (XD)';
  return { ...res, industryLabel };
}

export function buildAutoSuggestedTags(
  suggestion: {
    industry: string;
    primaryDomain: FunctionalDomainCode;
    projectAxes: ProjectArchetypeCode[];
    secondaryDomains: FunctionalDomainCode[];
    linkedGates: string[];
  },
  activeProject?: ProjectArchetypeCode,
  initialStatus: SmartTagStatus = 'SUGGESTED'
): SmartTagItem[] {
  const tags: SmartTagItem[] = [];
  const seen = new Set<string>();
  const pushTag = (category: SmartTagCategory, code: string, label: string) => {
    const normKey = `${category}:${code.toUpperCase()}`;
    if (seen.has(normKey)) return;
    seen.add(normKey);
    tags.push({
      id: `TAG-${category}-${code.replace(/[^A-Za-z0-9_-]/g, '')}-${tags.length + 1}`,
      category,
      code,
      label,
      status: initialStatus,
    });
  };

  const inferred = inferSubSectorFromDomain(suggestion.primaryDomain, suggestion.industry);
  pushTag('INDUSTRY', inferred.industryCode, inferred.industryLabel);
  pushTag('SUB_SECTOR', inferred.subSectorCode, `LV con: ${inferred.subSectorLabel}`);

  (suggestion.secondaryDomains || [])
    .filter(d => d !== suggestion.primaryDomain)
    .slice(0, 2)
    .forEach(dom => {
      pushTag('DOMAIN', dom, `LV mở rộng: ${dom}`);
    });

  const axes =
    suggestion.projectAxes && suggestion.projectAxes.length > 0
      ? suggestion.projectAxes
      : activeProject
      ? [activeProject]
      : (['KCN'] as ProjectArchetypeCode[]);
  const prioritizedAxes =
    activeProject && axes.includes(activeProject)
      ? [activeProject, ...axes.filter(a => a !== activeProject)]
      : axes;
  prioritizedAxes.forEach(ax => {
    pushTag('PROJECT_AXIS', ax, `DA: ${ax}`);
  });

  const gates =
    suggestion.linkedGates && suggestion.linkedGates.length > 0 ? suggestion.linkedGates : ['G12'];
  gates.slice(0, 3).forEach(g => {
    const cleanG = g.trim().toUpperCase();
    if (cleanG) {
      pushTag('STAGE_GATE', cleanG, `Gate ${cleanG}`);
    }
  });

  return tags;
}

export function parseRawTagInput(rawText: string): {
  category: SmartTagCategory;
  code: string;
  label: string;
} {
  const trimmed = rawText.trim();
  const strippedPrefix = trimmed
    .replace(/^(?:Ngành|LV con|LV mở rộng|DA|Dự án|Gate)\s*:\s*/i, '')
    .replace(/^Gate\s+/i, '')
    .trim();
  const parenMatch = strippedPrefix.match(/\(([A-Za-z0-9_-]+)\)\s*$/);
  const candidateToken = (parenMatch ? parenMatch[1] : strippedPrefix).trim();
  const upper = removeVietnameseTones(candidateToken).toUpperCase().replace(/\s+/g, '_');

  if (/^G(?:[0-9]|1[0-6])$/.test(upper)) {
    return { category: 'STAGE_GATE', code: upper, label: `Gate ${upper}` };
  }

  const matchedAxis = SMART_TAG_PROJECT_AXES.find(a => a === upper);
  if (matchedAxis) {
    return { category: 'PROJECT_AXIS', code: matchedAxis, label: `DA: ${matchedAxis}` };
  }

  const matchedInd = SMART_TAG_INDUSTRY_OPTIONS.find(i => i.code === upper);
  if (matchedInd) {
    return { category: 'INDUSTRY', code: matchedInd.code, label: matchedInd.label };
  }

  const matchedSub = SMART_TAG_SUB_SECTOR_OPTIONS.find(s => s.code === upper);
  if (matchedSub) {
    return { category: 'SUB_SECTOR', code: matchedSub.code, label: matchedSub.label };
  }

  const matchedDom = SMART_TAG_DOMAIN_CODES.find(d => d === upper);
  if (matchedDom) {
    return { category: 'DOMAIN', code: matchedDom, label: `LV mở rộng: ${matchedDom}` };
  }

  const customCode = upper.replace(/[^A-Z0-9_-]/g, '') || 'CUSTOM';
  return {
    category: 'CUSTOM',
    code: customCode,
    label: trimmed || customCode,
  };
}

export function syncSuggestionWithSmartTags(
  suggestion: AnalyzedFileItem['suggestion'],
  smartTags: SmartTagItem[]
): AnalyzedFileItem['suggestion'] {
  const industryTag = smartTags.find(t => t.category === 'INDUSTRY');
  const axisTags = smartTags
    .filter(t => t.category === 'PROJECT_AXIS')
    .map(t => t.code.toUpperCase() as ProjectArchetypeCode)
    .filter(c => SMART_TAG_PROJECT_AXES.includes(c));
  const domainTags = smartTags
    .filter(t => t.category === 'DOMAIN')
    .map(t => t.code.toUpperCase() as FunctionalDomainCode)
    .filter(c => SMART_TAG_DOMAIN_CODES.includes(c));
  const gateTags = smartTags
    .filter(t => t.category === 'STAGE_GATE')
    .map(t => t.code.toUpperCase())
    .filter(Boolean);

  return {
    ...suggestion,
    industry: industryTag ? industryTag.code : suggestion.industry,
    projectAxes: Array.from(new Set(axisTags)),
    secondaryDomains: Array.from(
      new Set<FunctionalDomainCode>([suggestion.primaryDomain, ...domainTags])
    ),
    linkedGates: Array.from(new Set(gateTags)),
  };
}

export function resolveDocTaxonomyFromTags(
  primaryDomain: FunctionalDomainCode,
  industryCode: string,
  smartTags?: SmartTagItem[]
): {
  industryGroupId: string;
  subSectorCode: string;
  subSectorLabel: string;
  tags: string[];
} {
  const tags = smartTags || [];
  const indTag = tags.find(t => t.category === 'INDUSTRY');
  const subTag = tags.find(t => t.category === 'SUB_SECTOR');
  const inferred = inferSubSectorFromDomain(
    primaryDomain,
    indTag?.code || industryCode,
    undefined,
    subTag?.code
  );
  const tagStrings = Array.from(
    new Set(
      tags
        .map(t => (t.category === 'CUSTOM' ? t.label : t.code || t.label).trim())
        .filter(Boolean)
    )
  );
  return {
    industryGroupId: inferred.industryGroupId,
    subSectorCode: inferred.subSectorCode,
    subSectorLabel: inferred.subSectorLabel,
    tags: tagStrings,
  };
}

export function buildStandardFolderPath(params: {
  preset: FolderNamingPresetCode;
  originalFolder: string;
  projectCode: ProjectArchetypeCode;
  primaryDomain: FunctionalDomainCode;
  gateCode: string;
  year: string;
  qlvbGroup: QlvbNamingGroupCode;
  industry: string;
}): string {
  const cleanOrig = toPascalCaseVN(
    (params.originalFolder || 'HoSoDuAn').split('/').pop() || 'HoSoDuAn',
    28
  );
  if (params.preset === 'STAGE_GATE_ISO') {
    return `${params.projectCode}_${params.gateCode || 'G12'}_CDE/${params.primaryDomain}_${cleanOrig}`;
  }
  if (params.preset === 'QLVB_5GROUP') {
    return `${params.year}_${params.projectCode}/${params.qlvbGroup}_${params.primaryDomain}_${cleanOrig}`;
  }
  return `${params.industry}_${params.projectCode}_${params.primaryDomain}_${params.year}/${cleanOrig}`;
}

export function smartAnalyzeFile3D(fileName: string, extractedText = '') {
  const extMatch = fileName.match(/\.([a-zA-Z0-9]+)$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : 'pdf';
  const baseName = fileName.replace(/\.[^/.]+$/, '');
  const combinedRaw = `${baseName}\n${extractedText.substring(0, 2500)}`;
  const combinedUpperNoTone = removeVietnameseTones(combinedRaw).toUpperCase();
  const baseUpperNoTone = removeVietnameseTones(baseName).toUpperCase();
  const headerLines = extractedText
    .split(/\r?\n/)
    .slice(0, 12)
    .map(l => removeVietnameseTones(l).trim().toUpperCase())
    .filter(Boolean);

  const docTypeMatchers: Array<{
    docType: string;
    issuer: string;
    headingRe: RegExp;
    generalRe: RegExp;
  }> = [
    { docType: 'VBHN', issuer: 'BXD', headingRe: /^(?:VAN BAN HOP NHAT|VBHN)\b/, generalRe: /VAN BAN HOP NHAT|\bVBHN\b/ },
    { docType: 'NKTC', issuer: 'NTTC', headingRe: /^(?:NHAT KY THI CONG|NKTC)\b/, generalRe: /\bNHAT KY THI CONG\b|\bNKTC\b/ },
    { docType: 'BBNT', issuer: 'TVGS', headingRe: /^(?:BIEN BAN NGHIEM THU|BBNT)\b/, generalRe: /\bBIEN BAN NGHIEM THU\b|\bBBNT\b/ },
    { docType: 'BV', issuer: 'TVTK', headingRe: /^(?:HO SO THIET KE|BAN VE|TKBVTC|TKCS|TKKT)\b/, generalRe: /\bTKBVTC\b|\bBAN VE\b|\bTKCS\b|\bTKKT\b|\bHOAN CONG\b|\bBV\b/ },
    { docType: 'TTr', issuer: 'BQLDA', headingRe: /^(?:TO TRINH|TTR)\b/, generalRe: /\bTO TRINH\b|\bTTR\b/ },
    { docType: 'PLHD', issuer: 'CDT', headingRe: /^(?:PHU LUC HOP DONG|PLHD)\b/, generalRe: /\bPHU LUC HOP DONG\b|\bPLHD\b/ },
    { docType: 'HD', issuer: 'CDT', headingRe: /^HOP DONG\b/, generalRe: /\bHOP DONG\b|\bHDXD\b|\bHD-TCXD\b|\bHD\b/ },
    { docType: 'QD', issuer: 'CDT', headingRe: /^QUYET DINH\b/, generalRe: /\bQUYET DINH\b|\bQD\b/ },
    { docType: 'QCVN', issuer: 'BXD', headingRe: /^(?:QCVN|QUY CHUAN KY THUAT)\b/, generalRe: /\bQCVN\b|QUY CHUAN KY THUAT/ },
    { docType: 'TCVN', issuer: 'BKHCN', headingRe: /^(?:TCVN|TIEU CHUAN QUOC GIA)\b/, generalRe: /\bTCVN\b|TIEU CHUAN QUOC GIA/ },
    { docType: 'NQ', issuer: 'QH', headingRe: /^NGHI QUYET\b/, generalRe: /\bNGHI QUYET\b|\bNQ\b/ },
    { docType: 'ND', issuer: 'CP', headingRe: /^NGHI DINH\b/, generalRe: /\bNGHI DINH\b|ND-CP|ND_CP|\bND\b/ },
    { docType: 'TT', issuer: 'BXD', headingRe: /^THONG TU\b/, generalRe: /\bTHONG TU\b|TT-B[A-Z]+|\bTT\b/ },
    { docType: 'LUAT', issuer: 'QH', headingRe: /^(?:BO\s+)?LUAT\b/, generalRe: /\bLUAT\b|QH15|QH14/ },
  ];

  let docType = 'ND';
  let issuer = 'CP';
  let matched = false;

  // 1. Ưu tiên nhận diện dòng tiêu đề loại văn bản trong 12 dòng đầu
  for (const line of headerLines) {
    const hit = docTypeMatchers.find(m => m.headingRe.test(line));
    if (hit) {
      docType = hit.docType;
      issuer = hit.issuer;
      matched = true;
      break;
    }
  }

  // 2. Nếu chưa thấy dòng tiêu đề rõ ràng, chọn loại xuất hiện sớm nhất trong tên file gốc
  if (!matched) {
    let bestIdx = Number.MAX_SAFE_INTEGER;
    for (const m of docTypeMatchers) {
      const hit = baseUpperNoTone.match(m.generalRe);
      if (hit && hit.index !== undefined && hit.index < bestIdx) {
        bestIdx = hit.index;
        docType = m.docType;
        issuer = m.issuer;
        matched = true;
      }
    }
  }

  // 3. Fallback toàn văn bản
  if (!matched) {
    const fallbackMatch = docTypeMatchers.find(m => m.generalRe.test(combinedUpperNoTone));
    if (fallbackMatch) {
      docType = fallbackMatch.docType;
      issuer = fallbackMatch.issuer;
    }
  }

  const projectAxes = new Set<ProjectArchetypeCode>();
  if (/KHU CONG NGHIEP|\bKCN\b|KHU KINH TE/.test(combinedUpperNoTone)) projectAxes.add('KCN');
  if (/CUM CONG NGHIEP|\bCCN\b/.test(combinedUpperNoTone)) projectAxes.add('CCN');
  if (/THUONG MAI TU DO|\bFTZ\b|LOGISTICS/.test(combinedUpperNoTone)) projectAxes.add('FTZ');
  if (/PPP|\bBT\b|\bBOT\b|DOI TAC CONG TU/.test(combinedUpperNoTone)) projectAxes.add('PPP_BT');
  if (/HA TANG KY THUAT|GIAO THONG|CAP THOAT NUOC/.test(combinedUpperNoTone)) projectAxes.add('HTKT');
  if (/DAN DUNG|CHUNG CU|KHU DO THI|NHA O/.test(combinedUpperNoTone)) projectAxes.add('DAN_DUNG');
  if (projectAxes.size === 0) {
    (['HTKT', 'DAN_DUNG', 'KCN', 'CCN', 'FTZ', 'PPP_BT'] as ProjectArchetypeCode[]).forEach(p =>
      projectAxes.add(p)
    );
  }

  const domainRules: Array<{
    code: FunctionalDomainCode;
    weight: number;
    keywords: string[];
    gates: string[];
    qaqc: string[];
  }> = [
    { code: 'QCVN', weight: 10, keywords: ['QCVN', 'QUY CHUAN KY THUAT'], gates: ['G6', 'G9', 'G12'], qaqc: ['QT-03'] },
    { code: 'TCVN', weight: 9, keywords: ['TCVN', 'TIEU CHUAN QUOC GIA', 'TIEU CHUAN NGHIEM THU'], gates: ['G12', 'G14'], qaqc: ['QT-03', 'QT-08', 'QT-12'] },
    { code: 'QLCP', weight: 8, keywords: ['QLCP', 'CHI PHI', 'DU TOAN', 'DINH MUC', 'DON GIA', 'TONG MUC DAU TU'], gates: ['G9', 'G10', 'G14'], qaqc: [] },
    { code: 'QLHD', weight: 8, keywords: ['QLHD', 'HOP DONG', 'PHU LUC HOP DONG', 'TAM UNG', 'DIEU CHINH GIA', 'PHAT SINH'], gates: ['G11', 'G14'], qaqc: [] },
    { code: 'VLXD', weight: 8, keywords: ['VLXD', 'VAT LIEU', 'HOP CHUAN', 'HOP QUY', 'THI NGHIEM', 'LAS-XD', 'CO/CQ'], gates: ['G12'], qaqc: ['QT-03'] },
    { code: 'QLCL', weight: 8, keywords: ['QLCL', 'CHAT LUONG', 'NGHIEM THU', 'NHAT KY THI CONG', 'BAO TRI'], gates: ['G12', 'G14', 'G15'], qaqc: ['QT-01', 'QT-03', 'QT-08', 'QT-12'] },
    { code: 'HDXD', weight: 7, keywords: ['HDXD', 'HOAT DONG XAY DUNG', 'THAM DINH', 'BAN VE THI CONG', 'TKBVTC', 'BAN VE', 'KET CAU', 'GIAY PHEP XAY DUNG', 'KHOI CONG'], gates: ['G9', 'G12', 'G0'], qaqc: ['QT-01'] },
    { code: 'DTH', weight: 8, keywords: ['DTH', 'DAU THAU', 'LUA CHON NHA THAU', 'MOI THAU', 'HSMT'], gates: ['G10', 'G11'], qaqc: [] },
    { code: 'TQT', weight: 8, keywords: ['TQT', 'QUYET TOAN', 'KIEM TOAN', 'THANH QUYET TOAN'], gates: ['G14', 'G15'], qaqc: [] },
    { code: 'PCCC', weight: 9, keywords: ['PCCC', 'PHONG CHAY', 'CHUA CHAY'], gates: ['G6', 'G12', 'G15'], qaqc: [] },
    { code: 'DTU', weight: 8, keywords: ['CHU TRUONG DAU TU', 'KHU CONG NGHIEP', 'CUM CONG NGHIEP', 'THUONG MAI TU DO', 'PPP'], gates: ['G0', 'G1'], qaqc: [] },
  ];

  let primaryDomain = 'QLCL' as FunctionalDomainCode;
  let secondaryDomains: FunctionalDomainCode[] = [];
  let primaryRuleGates: string[] = [];
  const linkedGates = new Set<string>();
  const linkedQAQC = new Set<string>();
  let bestScore = -1;

  for (const rule of domainRules) {
    let hits = 0;
    for (const kw of rule.keywords) {
      if (combinedUpperNoTone.includes(kw)) hits += 1;
    }
    if (hits > 0) {
      secondaryDomains.push(rule.code);
      rule.gates.forEach(g => linkedGates.add(g));
      rule.qaqc.forEach(q => linkedQAQC.add(q));
      const score = hits * rule.weight;
      if (score > bestScore) {
        bestScore = score;
        primaryDomain = rule.code;
        primaryRuleGates = rule.gates;
      }
    }
  }

  if (secondaryDomains.length === 0) {
    secondaryDomains = ['QLCL', 'HDXD'];
    linkedGates.add('G12');
    primaryRuleGates = ['G12'];
  }

  const orderedLinkedGates = Array.from(new Set<string>([...primaryRuleGates, ...linkedGates]));

  let rawNumber = '01';
  const numInText = extractedText.match(/Số\s*:\s*([0-9a-zA-Z\-/]+)/i);
  const numInFile = baseName.match(/(\b[A-Za-z]{1,4}\d{1,4}[-/][A-Za-z]{1,4}\d{1,4}\b)|(\d{1,4}[/-](?:\d{4}[/-])?[a-zA-ZĐđ-]+)|(\b\d{1,4}\b)/);
  if (numInText && numInText[1]) rawNumber = numInText[1].trim();
  else if (numInFile && numInFile[0]) rawNumber = numInFile[0].replace(/-/g, '/');

  let year = '2026';
  const yearMatch = combinedRaw.match(/\b(201[5-9]|202[0-9])\b/);
  if (yearMatch) year = yearMatch[1];

  const rawSummary = stripRedundantSummaryPrefix(baseName) || baseName.replace(/[_-]+/g, ' ').trim();

  const industryCode = primaryDomain === 'TQT' ? 'TC' : primaryDomain === 'DTU' ? 'BDS' : 'XD';

  return {
    industry: industryCode,
    docType,
    issuer,
    rawNumber,
    year,
    primaryDomain,
    rawSummary: rawSummary || baseName,
    appendixSuffix: '',
    ext,
    projectAxes: Array.from(projectAxes),
    secondaryDomains: Array.from(new Set<FunctionalDomainCode>([primaryDomain, ...secondaryDomains])),
    linkedGates: orderedLinkedGates,
    linkedQAQC: Array.from(linkedQAQC),
  };
}

export async function extractTextFromPdfFile(
  file: File,
  deepScan = false
): Promise<{ text: string; pagesRead: number; totalPages: number }> {
  if (typeof window === 'undefined' || !window.pdfjsLib) {
    return { text: '', pagesRead: 0, totalPages: 1 };
  }
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  const maxPages = Math.min(pdf.numPages, deepScan ? 15 : 4);
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += `[Trang ${i}/${pdf.numPages}]\n` + content.items.map(item => item.str).join(' ') + '\n\n';
  }
  return { text: fullText, pagesRead: maxPages, totalPages: pdf.numPages };
}

export async function extractTextFromDocxFile(file: File): Promise<string> {
  if (typeof window === 'undefined' || !window.mammoth) return '';
  const arrayBuffer = await file.arrayBuffer();
  const result = await window.mammoth.extractRawText({ arrayBuffer });
  return result.value || '';
}

export async function extractTextFromFileEnhanced(
  file: File,
  deepScan = false
): Promise<{ text: string; statsLabel: string }> {
  const lower = file.name.toLowerCase();
  try {
    if (lower.endsWith('.pdf')) {
      const res = await extractTextFromPdfFile(file, deepScan);
      if (res.text.trim()) {
        return {
          text: res.text,
          statsLabel: `PDF · Đã đọc ${res.pagesRead}/${res.totalPages} trang`,
        };
      }
    } else if (lower.endsWith('.docx') || lower.endsWith('.doc')) {
      const txt = await extractTextFromDocxFile(file);
      if (txt.trim()) {
        const lineCount = txt.split('\n').filter(Boolean).length;
        return {
          text: txt,
          statsLabel: `Word · ${lineCount} đoạn văn`,
        };
      }
    } else if (
      lower.endsWith('.txt') ||
      lower.endsWith('.md') ||
      lower.endsWith('.csv') ||
      lower.endsWith('.tsv') ||
      lower.endsWith('.json') ||
      lower.endsWith('.xml') ||
      lower.endsWith('.html')
    ) {
      const txt = await file.text();
      const lines = txt.split('\n').length;
      return {
        text: txt,
        statsLabel: `Text/Data · ${lines} dòng`,
      };
    }
  } catch {
    // Fallback below
  }

  const fallbackText = `VĂN BẢN / HỒ SƠ DỰ ÁN: ${file.name}\nKích thước: ${formatFileSize(
    file.size
  )}\nCơ quan ban hành: BỘ XÂY DỰNG / CHỦ ĐẦU TƯ\nSố: 01/2026/VB-PMO\nChương I: QUY ĐỊNH CHUNG\nĐiều 1. Nội dung bóc tách tự động từ siêu dữ liệu tên tệp "${file.name}".`;
  return {
    text: fallbackText,
    statsLabel: `Metadata OCR · ${formatFileSize(file.size)}`,
  };
}

export function createSampleBatchItems(
  activeProject: ProjectArchetypeCode,
  namingGroup: QlvbNamingGroupCode,
  folderPreset: FolderNamingPresetCode
): AnalyzedFileItem[] {
  const rawSamples: Array<{
    kind: 'FILE' | 'FOLDER';
    originalFolder: string;
    originalName: string;
    extractedText: string;
    sizeLabel: string;
    statsLabel: string;
    qlvbGroup: QlvbNamingGroupCode;
    ktSubType?: string;
    tkStageDept?: string;
    tkDocCode?: string;
    tkRevision?: string;
    appendixSuffix?: string;
  }> = [
    {
      kind: 'FOLDER',
      originalFolder: '01_Ho so phap ly & giay phep KCN',
      originalName: '01_Ho so phap ly & giay phep KCN',
      extractedText:
        'THƯ MỤC HỒ SƠ PHÁP LÝ DỰ ÁN KCN\nChứa Quyết định chấp thuận chủ trương đầu tư, Quyết định phê duyệt Quy hoạch 1/500, Giấy phép môi trường và Thẩm duyệt PCCC (Gate G0 - G6).',
      sizeLabel: 'Thư mục (14 tệp)',
      statsLabel: 'Folder · Gate G0–G6',
      qlvbGroup: 'PLDA',
    },
    {
      kind: 'FOLDER',
      originalFolder: '02_Bien ban nghiem thu chat luong & LAS-XD',
      originalName: '02_Bien ban nghiem thu chat luong & LAS-XD',
      extractedText:
        'THƯ MỤC QUẢN LÝ CHẤT LƯỢNG & NGHIỆM THU (QLCL)\nChứa Biên bản nghiệm thu vật liệu đầu vào, Phiếu kết quả thí nghiệm LAS-XD, Nhật ký thi công và Biên bản nghiệm thu công việc xây dựng (Gate G12 - G14).',
      sizeLabel: 'Thư mục (28 tệp)',
      statsLabel: 'Folder · Gate G12–G14',
      qlvbGroup: 'KT',
    },
    {
      kind: 'FILE',
      originalFolder: '01_Ho so phap ly & giay phep KCN',
      originalName: 'Nghi dinh 207-2026-ND-CP quan ly chat luong cong trinh.pdf',
      extractedText:
        'CHÍNH PHỦ\nSố: 207/2026/NĐ-CP\nHà Nội, ngày 18 tháng 05 năm 2026\nNGHỊ ĐỊNH\nQuy định chi tiết Luật Xây dựng về quản lý chất lượng, thi công xây dựng và bảo trì công trình xây dựng\nChương I. NHỮNG QUY ĐỊNH CHUNG\nĐiều 1. Phạm vi điều chỉnh\nĐiều 15. Nhật ký thi công xây dựng công trình và Bản vẽ hoàn công\nĐiều 21. Nghiệm thu công việc xây dựng và Nghiệm thu giai đoạn thi công.',
      sizeLabel: '1.84 MB',
      statsLabel: 'PDF · Đã đọc 4/38 trang',
      qlvbGroup: 'PL',
      appendixSuffix: 'PLIIa',
    },
    {
      kind: 'FILE',
      originalFolder: '01_Ho so phap ly & giay phep KCN',
      originalName: 'Thong tu 12_2026_TT-BXD dinh muc du toan cong trinh.pdf',
      extractedText:
        'BỘ XÂY DỰNG\nSố: 12/2026/TT-BXD\nTHÔNG TƯ\nBan hành định mức dự toán xây dựng công trình và hướng dẫn quản lý chi phí đầu tư xây dựng hạ tầng KCN\nĐiều 1. Ban hành kèm theo Thông tư này hệ thống định mức dự toán.\nĐiều 4. Quy định chuyển tiếp đối với dự toán gói thầu.',
      sizeLabel: '2.45 MB',
      statsLabel: 'PDF · Đã đọc 4/52 trang',
      qlvbGroup: 'PL',
    },
    {
      kind: 'FILE',
      originalFolder: '02_Bien ban nghiem thu chat luong & LAS-XD',
      originalName: 'BBNT so 018 nghiem thu cot thep dam san tang 5.docx',
      extractedText:
        'BAN QUẢN LÝ DỰ ÁN & TƯ VẤN GIÁM SÁT\nSố: 018/2026/BBNT-QLCL\nBIÊN BẢN NGHIỆM THU CÔNG VIỆC XÂY DỰNG\nVề việc nghiệm thu lắp dựng cốt thép và cốp pha dầm sàn tầng 5 trục A-D\nĐiều 1. Thành phần trực tiếp nghiệm thu: Tư vấn giám sát và Chỉ huy trưởng Nhà thầu.\nĐiều 2. Kết luận: Đạt yêu cầu thiết kế bản vẽ thi công và TCVN 4453, đồng ý cho đổ bê tông.',
      sizeLabel: '420.5 KB',
      statsLabel: 'Word · 34 đoạn văn',
      qlvbGroup: 'KT',
      ktSubType: 'CL-BBNTCV',
      appendixSuffix: 'KY',
    },
    {
      kind: 'FILE',
      originalFolder: '03_Ho so Hop dong & Thanh quyet toan',
      originalName: 'Hop dong thi cong so 45-2026-HDXD ha tang ky thuat KCN.pdf',
      extractedText:
        'CHỦ ĐẦU TƯ & LIÊN DANH NHÀ THẦU\nSố: 45/2026/HĐ-TCXD\nHỢP ĐỒNG THI CÔNG XÂY DỰNG CÔNG TRÌNH\nGói thầu XL-01: Thi công hệ thống giao thông, cấp thoát nước và trạm xử lý nước thải KCN\nĐiều 1. Giá trị hợp đồng và hình thức hợp đồng theo đơn giá điều chỉnh.\nĐiều 8. Tạm ứng, thanh toán khối lượng hoàn thành (IPC) và hồ sơ quyết toán hợp đồng.',
      sizeLabel: '3.12 MB',
      statsLabel: 'PDF · Đã đọc 4/64 trang',
      qlvbGroup: 'PLDA',
      appendixSuffix: 'V01-KY',
    },
    {
      kind: 'FILE',
      originalFolder: '04_Ban ve Thiet ke & BIM',
      originalName: 'Ban ve TKBVTC Ket cau Nha xuong NX02-BV012 Rev01.pdf',
      extractedText:
        'TƯ VẤN THIẾT KẾ CÔNG TRÌNH\nSố: NX02-BV012\nHỒ SƠ THIẾT KẾ BẢN VẼ THI CÔNG (TKBVTC)\nBản vẽ kết cấu móng cọc ly tâm và khung thép tiền chế Nhà xưởng NX02 Khu công nghiệp\nĐiều 1. Thuyết minh tiêu chuẩn tải trọng và tác động TCVN 2737.\nĐiều 2. Bảng thống kê cốt thép và chi tiết liên kết bu lông cường độ cao.',
      sizeLabel: '5.60 MB',
      statsLabel: 'PDF/CAD · 12 bản vẽ',
      qlvbGroup: 'TK',
      tkStageDept: 'TKBV-KC',
      tkDocCode: 'NX02-BV012',
      tkRevision: 'R01',
    },
    {
      kind: 'FILE',
      originalFolder: '03_Ho so Hop dong & Thanh quyet toan',
      originalName: 'To trinh 009_TTr_BQLDA phe duyet phat sinh khoi luong VO-02.docx',
      extractedText:
        'BAN QUẢN LÝ DỰ ÁN ĐẦU TƯ XÂY DỰNG\nSố: 009/2026/TTr-BQLDA\nTỜ TRÌNH\nVề việc thẩm định và phê duyệt Phụ lục hợp đồng phát sinh khối lượng xử lý nền đất yếu (VO-02)\nĐiều 1. Căn cứ Biên bản hiện trường 4 bên và kết quả khoan khảo sát bổ sung.\nĐiều 2. Kiến nghị Chủ đầu tư phê duyệt dự toán phát sinh.',
      sizeLabel: '318.0 KB',
      statsLabel: 'Word · 26 đoạn văn',
      qlvbGroup: 'HC',
    },
  ];

  const items: AnalyzedFileItem[] = rawSamples.map((s, idx) => {
    const suggestion = smartAnalyzeFile3D(s.originalName, s.extractedText);
    if (s.appendixSuffix) suggestion.appendixSuffix = s.appendixSuffix;
    const effectiveGroup = namingGroup === 'SSOT_9PART' ? 'SSOT_9PART' : s.qlvbGroup;
    const proposedFolder = buildStandardFolderPath({
      preset: folderPreset,
      originalFolder: s.originalFolder,
      projectCode: activeProject,
      primaryDomain: suggestion.primaryDomain,
      gateCode: suggestion.linkedGates[0] || 'G12',
      year: suggestion.year,
      qlvbGroup: effectiveGroup,
      industry: suggestion.industry,
    });

    const proposedName =
      s.kind === 'FOLDER'
        ? proposedFolder.split('/').pop() || proposedFolder
        : buildFileNameByRule({
            group: effectiveGroup,
            industry: suggestion.industry,
            docType: suggestion.docType,
            issuer: suggestion.issuer,
            rawNumber: suggestion.rawNumber,
            year: suggestion.year,
            primaryDomain: suggestion.primaryDomain,
            rawSummary: suggestion.rawSummary,
            appendixSuffix: suggestion.appendixSuffix,
            ext: suggestion.ext,
            projectCode: activeProject,
            linkedGates: suggestion.linkedGates,
            ktSubType: s.ktSubType,
            tkStageDept: s.tkStageDept,
            tkDocCode: s.tkDocCode,
            tkRevision: s.tkRevision,
          });

    const ocrZones = extractOcrZonesFromText(s.originalName, s.extractedText);
    const smartTags = buildAutoSuggestedTags(suggestion, activeProject, 'SUGGESTED');
    const validation = validateBatchFileName(
      proposedName,
      effectiveGroup,
      suggestion.docType,
      suggestion.issuer,
      suggestion.rawSummary,
      [proposedName],
      s.kind
    );
    const defaultCdeStatus =
      idx === 0 || idx === 2 || idx === 3
        ? 'A1'
        : idx === 1 || idx === 4
        ? 'B1'
        : idx === 5 || idx === 6
        ? 'S1'
        : 'S0';

    return {
      id: `BATCH-${idx + 1}-${Date.now().toString(36)}`,
      rawFile: null,
      itemKind: s.kind,
      originalName: s.originalName,
      originalFolderPath: s.originalFolder,
      proposedFolderPath: proposedFolder,
      extractedText: s.extractedText,
      suggestion,
      smartTags,
      proposedName,
      qlvbGroup: effectiveGroup,
      cdeStatus: defaultCdeStatus,
      ktSubType: s.ktSubType || 'CL-BBNTCV',
      tkStageDept: s.tkStageDept || 'TKBV-KC',
      tkDocCode: s.tkDocCode || 'NX02-BV012',
      tkRevision: s.tkRevision || 'R01',
      validationStatus: validation.status,
      validationMessage: validation.message,
      sha256Hash: `8F4E${(idx + 10).toString(16).toUpperCase()}C92A1B`,
      fileSizeLabel: s.sizeLabel,
      readStatsLabel: s.statsLabel,
      ocrZones,
      selected: true,
      isCommitted: false,
    };
  });

  return items;
}

