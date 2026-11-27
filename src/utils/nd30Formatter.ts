import type { LegalDocument, LegalNode } from '../types/lexPmoTypes';

export interface Nd30HeaderParts {
  issuerUpper: string;
  docNumberLine: string;
  nationUpper: string;
  motto: string;
  placeDateLine: string;
  docTypeUpper: string;
  docTitle: string;
  legalBases: string[];
  enactingLine?: string;
  extraIntroLines: string[];
}

export interface Nd30FooterParts {
  adoptionNote?: string;
  recipients: string[];
  signerAuthorityLines: string[];
  signerName?: string;
}

const ISSUER_DISPLAY_MAP: Record<string, string> = {
  QH: 'QUỐC HỘI',
  QH15: 'QUỐC HỘI',
  QH14: 'QUỐC HỘI',
  QH16: 'QUỐC HỘI',
  UBTVQH: 'ỦY BAN THƯỜNG VỤ QUỐC HỘI',
  CP: 'CHÍNH PHỦ',
  TTG: 'THỦ TƯỚNG CHÍNH PHỦ',
  TTg: 'THỦ TƯỚNG CHÍNH PHỦ',
  BXD: 'BỘ XÂY DỰNG',
  BTC: 'BỘ TÀI CHÍNH',
  BCT: 'BỘ CÔNG THƯƠNG',
  BTNMT: 'BỘ TÀI NGUYÊN VÀ MÔI TRƯỜNG',
  BNNMT: 'BỘ NÔNG NGHIỆP VÀ MÔI TRƯỜNG',
  BNV: 'BỘ NỘI VỤ',
  BTP: 'BỘ TƯ PHÁP',
  BCA: 'BỘ CÔNG AN',
  BQP: 'BỘ QUỐC PHÒNG',
  BKHCN: 'BỘ KHOA HỌC VÀ CÔNG NGHỆ',
  BKHDT: 'BỘ KẾ HOẠCH VÀ ĐẦU TƯ',
  KTNN: 'KIỂM TOÁN NHÀ NƯỚC',
  VPCP: 'VĂN PHÒNG CHÍNH PHỦ',
  VPQH: 'VĂN PHÒNG QUỐC HỘI',
  UBNDHN: 'ỦY BAN NHÂN DÂN THÀNH PHỐ HÀ NỘI',
};

const DOC_TYPE_DISPLAY_MAP: Record<string, string> = {
  LUAT: 'LUẬT',
  ND: 'NGHỊ ĐỊNH',
  TT: 'THÔNG TƯ',
  TTLT: 'THÔNG TƯ LIÊN TỊCH',
  QD: 'QUYẾT ĐỊNH',
  NQ: 'NGHỊ QUYẾT',
  CT: 'CHỈ THỊ',
  CV: 'CÔNG VĂN',
  TB: 'THÔNG BÁO',
  HD: 'HƯỚNG DẪN',
  VBHN: 'VĂN BẢN HỢP NHẤT',
  QCVN: 'QUY CHUẨN KỸ THUẬT QUỐC GIA',
  TCVN: 'TIÊU CHUẨN QUỐC GIA',
};

function cleanHeaderLine(line: string): string {
  return line
    .replace(/\s+/g, ' ')
    .replace(/^[-–—_.|]+\s*/, '')
    .trim();
}

export function parseNd30Header(doc: LegalDocument, introNode?: LegalNode): Nd30HeaderParts {
  const issuerUpper =
    ISSUER_DISPLAY_MAP[doc.issuer] ||
    ISSUER_DISPLAY_MAP[doc.issuer.toUpperCase()] ||
    doc.issuer.toUpperCase() ||
    'CƠ QUAN BAN HÀNH';

  const docTypeUpper =
    DOC_TYPE_DISPLAY_MAP[doc.docType] ||
    DOC_TYPE_DISPLAY_MAP[doc.docType.toUpperCase()] ||
    doc.docType.toUpperCase() ||
    'VĂN BẢN PHÁP LUẬT';

  const rawLines = (introNode?.content || '')
    .split('\n')
    .map(cleanHeaderLine)
    .filter(Boolean);

  let detectedNumber =
    docTypeUpper === 'LUẬT'
      ? `Luật số: ${doc.docNumber}`
      : `Số: ${doc.docNumber}`;
  let placeDateLine = doc.issueDate ? `Hà Nội, ngày ${doc.issueDate}` : 'Hà Nội';
  const legalBases: string[] = [];
  const extraIntroLines: string[] = [];
  let enactingLine: string | undefined;
  let titleFromIntro = '';
  let passedDocType = false;

  for (const ln of rawLines) {
    if (
      /^Cơ quan phát hành:/i.test(ln) ||
      /^CỘNG HÒA XÃ HỘI/i.test(ln) ||
      /^Độc lập\s*-\s*Tự do/i.test(ln) ||
      /^———$/.test(ln)
    ) {
      continue;
    }
    if (ln.toUpperCase() === issuerUpper) continue;

    const numMatch = ln.match(/(?:Luật\s+số|Số)\s*:\s*([^\s].*)$/i);
    if (numMatch && legalBases.length === 0) {
      const dateInside = ln.match(
        /(?:Hà Nội|TP\.?\s*Hồ Chí Minh),\s*ngày\s+\d+\s+tháng\s+\d+\s+năm\s+\d{4}/i
      );
      if (dateInside) placeDateLine = dateInside[0].trim();

      const cleanedRight = numMatch[1]
        .replace(/Độc lập.*$/i, '')
        .replace(/(?:,\s*)?(?:Hà Nội|TP\.?\s*Hồ Chí Minh)?,?\s*ngày\s+\d+\s+tháng\s+\d+\s+năm\s+\d{4}.*$/i, '')
        .trim();
      if (cleanedRight) {
        detectedNumber = `${docTypeUpper === 'LUẬT' ? 'Luật số' : 'Số'}: ${cleanedRight}`;
      }
      continue;
    }

    if (/(?:Hà Nội|TP\.?\s*Hồ Chí Minh),\s*ngày\s+\d+/i.test(ln) && ln.length < 70) {
      const cleanDate = ln.match(
        /(?:Hà Nội|TP\.?\s*Hồ Chí Minh),\s*ngày\s+\d+\s+tháng\s+\d+\s+năm\s+\d{4}/i
      );
      placeDateLine = cleanDate ? cleanDate[0].trim() : ln;
      continue;
    }

    if (ln.toUpperCase() === docTypeUpper && !passedDocType) {
      passedDocType = true;
      continue;
    }

    if (/^Căn cứ\s+/i.test(ln)) {
      legalBases.push(ln);
      continue;
    }

    if (/^(?:Quốc hội ban hành|Chính phủ ban hành|Bộ trưởng|Thủ tướng|Theo đề nghị của)/i.test(ln)) {
      enactingLine = enactingLine ? `${enactingLine} ${ln}` : ln;
      continue;
    }

    if (enactingLine && !/[.:]$/.test(enactingLine) && !/^Điều\s+/i.test(ln) && ln.length < 220) {
      enactingLine = `${enactingLine} ${ln}`;
      continue;
    }

    if (passedDocType && legalBases.length === 0 && ln.length <= 220) {
      titleFromIntro = titleFromIntro ? `${titleFromIntro} ${ln}` : ln;
      continue;
    }

    if (legalBases.length > 0 && !enactingLine && !/^Điều\s+/i.test(ln) && ln.length < 220) {
      // Câu Căn cứ kéo dài xuống dòng tiếp theo
      if (!legalBases[legalBases.length - 1].endsWith(';')) {
        legalBases[legalBases.length - 1] = `${legalBases[legalBases.length - 1]} ${ln}`;
        continue;
      }
    }

    extraIntroLines.push(ln);
  }

  return {
    issuerUpper,
    docNumberLine: detectedNumber,
    nationUpper: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
    motto: 'Độc lập - Tự do - Hạnh phúc',
    placeDateLine,
    docTypeUpper,
    docTitle: titleFromIntro || doc.title,
    legalBases,
    enactingLine,
    extraIntroLines,
  };
}

export function parseNd30Footer(closingNode?: LegalNode, fallbackIssuer?: string): Nd30FooterParts | null {
  if (!closingNode || !closingNode.content?.trim()) return null;
  const lines = closingNode.content
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  let adoptionNote: string | undefined;
  const recipients: string[] = [];
  const signerAuthorityLines: string[] = [];
  let signerName: string | undefined;
  let inRecipients = false;

  for (const ln of lines) {
    if (/^(?:Luật này được|Nghị quyết này được|Pháp lệnh này được)/i.test(ln)) {
      // Nếu dính chữ ký ở cuối dòng, tách ra
      const authSplit = ln.split(/\b(CHỦ TỊCH QUỐC HỘI|TM\.|KT\.|BỘ TRƯỞNG|THỦ TƯỚNG)\b/);
      adoptionNote = authSplit[0].trim();
      if (authSplit.length >= 3) {
        const rest = authSplit.slice(1).join('').trim();
        signerAuthorityLines.push(rest);
      }
      continue;
    }
    if (/^Nơi nhận\s*:/i.test(ln)) {
      inRecipients = true;
      continue;
    }
    if (inRecipients && ln.startsWith('-')) {
      recipients.push(ln.replace(/^-\s*/, '').trim());
      continue;
    }
    if (/^(?:TM\.|KT\.|CHỦ TỊCH|THỦ TƯỚNG|BỘ TRƯỞNG|TỔNG KIỂM TOÁN)/i.test(ln)) {
      inRecipients = false;
      signerAuthorityLines.push(ln);
      continue;
    }
    if (inRecipients) {
      recipients.push(ln.replace(/^-\s*/, '').trim());
    } else if (/^[A-ZÀ-ỸĐ][a-zà-ỹđ]+(?:\s+[A-ZÀ-ỸĐ][a-zà-ỹđ]+){1,4}$/.test(ln)) {
      signerName = ln;
    } else {
      signerAuthorityLines.push(ln);
    }
  }

  if (signerAuthorityLines.length === 0 && fallbackIssuer) {
    signerAuthorityLines.push(ISSUER_DISPLAY_MAP[fallbackIssuer] || fallbackIssuer.toUpperCase());
  }

  return {
    adoptionNote,
    recipients,
    signerAuthorityLines,
    signerName,
  };
}

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildNd30A4PrintHtml(doc: LegalDocument): string {
  const introNode = doc.nodes.find(n => n.level === 'Mở đầu' || n.level === 'Căn cứ');
  const closingNode = doc.nodes.find(n => n.level === 'Kết thúc');
  const bodyNodes = doc.nodes.filter(
    n => n.level !== 'Mở đầu' && n.level !== 'Căn cứ' && n.level !== 'Kết thúc'
  );

  const hdr = parseNd30Header(doc, introNode);
  const ftr = parseNd30Footer(closingNode, doc.issuer);

  const basesHtml = hdr.legalBases
    .map(b => `<p class="basis">${escapeHtml(b)}</p>`)
    .join('\n');
  const enactingHtml = hdr.enactingLine
    ? `<p class="enacting">${escapeHtml(hdr.enactingLine)}</p>`
    : '';

  const bodyHtml = bodyNodes
    .map(node => {
      if (node.level === 'Chương') {
        return `<div class="chapter">${escapeHtml(node.code.replace(/\.+$/, ''))}<br/><span>${escapeHtml(node.title.toUpperCase())}</span></div>`;
      }
      if (node.level === 'Mục') {
        return `<div class="section">${escapeHtml(node.code.replace(/\.+$/, ''))}${node.title ? `. ${escapeHtml(node.title)}` : ''}</div>`;
      }
      const lines = (node.content || '')
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean);
      const artContentHtml = lines
        .map(ln => {
          if (/^[a-zđ]\)\s+/i.test(ln)) {
            return `<p class="point">${escapeHtml(ln)}</p>`;
          }
          return `<p class="clause">${escapeHtml(ln)}</p>`;
        })
        .join('\n');
      return `<section class="article">
        <p class="clause"><strong>${escapeHtml(node.code.replace(/\.+$/, ''))}. ${escapeHtml(node.title)}</strong></p>
        ${artContentHtml}
      </section>`;
    })
    .join('\n');

  const footerHtml = ftr
    ? `${ftr.adoptionNote ? `<p class="adoption">${escapeHtml(ftr.adoptionNote)}</p>` : ''}
      <table class="footer-table">
        <tr>
          <td class="recipients">
            <div class="rec-title">Nơi nhận:</div>
            ${ftr.recipients.map(r => `<div>- ${escapeHtml(r)}</div>`).join('')}
          </td>
          <td class="signer">
            ${ftr.signerAuthorityLines.map(a => `<div class="auth">${escapeHtml(a)}</div>`).join('')}
            ${ftr.signerName ? `<div class="signer-name">${escapeHtml(ftr.signerName)}</div>` : ''}
          </td>
        </tr>
      </table>`
    : '';

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(doc.docNumber)} - Chuẩn Nghị định 30/2020/NĐ-CP</title>
  <style>
    @page { size: A4; margin: 20mm 15mm 20mm 30mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 20mm 15mm 20mm 30mm;
      font-family: "Times New Roman", Times, serif;
      font-size: 13.5pt;
      line-height: 1.45;
      color: #111;
      background: #fff;
    }
    @media print {
      body { padding: 0; }
    }
    table.header-table { width: 100%; border-collapse: collapse; margin-bottom: 14pt; }
    table.header-table td { vertical-align: top; text-align: center; }
    td.issuer-col { width: 42%; }
    td.nation-col { width: 58%; }
    .issuer-name { font-size: 12.5pt; font-weight: 700; text-transform: uppercase; }
    .doc-num { font-size: 12.5pt; margin-top: 4pt; }
    .rule-short { width: 90px; height: 1px; background: #111; margin: 3pt auto 0; }
    .nation { font-size: 12.5pt; font-weight: 700; text-transform: uppercase; }
    .motto { font-size: 13.5pt; font-weight: 700; }
    .rule-motto { width: 170px; height: 1px; background: #111; margin: 3pt auto 6pt; }
    .place-date { font-size: 13pt; font-style: italic; }
    .doc-type { text-align: center; font-size: 14pt; font-weight: 700; text-transform: uppercase; margin-top: 12pt; }
    .doc-title { text-align: center; font-size: 13.5pt; font-weight: 700; margin: 4pt auto 6pt; max-width: 85%; }
    .rule-title { width: 160px; height: 1px; background: #111; margin: 0 auto 14pt; }
    p.basis, p.enacting, p.clause, p.adoption {
      margin: 0 0 6pt 0;
      text-align: justify;
      text-indent: 1.27cm;
    }
    p.basis { font-style: italic; }
    p.adoption { font-style: italic; margin-top: 12pt; }
    p.point {
      margin: 0 0 5pt 0;
      text-align: justify;
      padding-left: 1.8cm;
    }
    .chapter {
      text-align: center;
      font-weight: 700;
      text-transform: uppercase;
      margin: 16pt 0 8pt;
      line-height: 1.35;
    }
    .section {
      text-align: center;
      font-weight: 700;
      margin: 12pt 0 6pt;
    }
    .article { margin-top: 6pt; }
    table.footer-table { width: 100%; border-collapse: collapse; margin-top: 18pt; page-break-inside: avoid; }
    table.footer-table td { vertical-align: top; }
    td.recipients { width: 52%; font-size: 11pt; line-height: 1.35; }
    .rec-title { font-style: italic; font-weight: 700; font-size: 11.5pt; margin-bottom: 3pt; }
    td.signer { width: 48%; text-align: center; font-size: 13pt; }
    .auth { font-weight: 700; text-transform: uppercase; }
    .signer-name { font-weight: 700; margin-top: 42pt; }
  </style>
</head>
<body>
  <table class="header-table">
    <tr>
      <td class="issuer-col">
        <div class="issuer-name">${escapeHtml(hdr.issuerUpper)}</div>
        <div class="rule-short"></div>
        <div class="doc-num">${escapeHtml(hdr.docNumberLine)}</div>
      </td>
      <td class="nation-col">
        <div class="nation">${escapeHtml(hdr.nationUpper)}</div>
        <div class="motto">${escapeHtml(hdr.motto)}</div>
        <div class="rule-motto"></div>
        <div class="place-date">${escapeHtml(hdr.placeDateLine)}</div>
      </td>
    </tr>
  </table>
  <div class="doc-type">${escapeHtml(hdr.docTypeUpper)}</div>
  <div class="doc-title">${escapeHtml(hdr.docTitle)}</div>
  <div class="rule-title"></div>
  ${basesHtml}
  ${enactingHtml}
  ${bodyHtml}
  ${footerHtml}
</body>
</html>`;
}
