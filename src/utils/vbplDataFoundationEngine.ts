/**
 * Client-side VBPL Data Foundation Mirror (Tầng 4 Analyst + Tầng 5 BA + Tầng 6 BI)
 * Đồng bộ 1-1 công thức với Python Data Foundation (`data_foundation/analyst_ba_bi.py`)
 * để người dùng luôn xem được BI Dashboard trên Web/Vercel ngay cả khi Sidecar (:8008) chưa bật.
 */

import { LegalDocument } from '../types/lexPmoTypes';
import { SSOT_FILENAME_RULE_RE, VBPL_DOMAIN_CODES } from './legalParser';

export interface DataFoundationLayerCard {
  step: number;
  code: 'DATA' | 'DATA_LAKE' | 'MODEL_DATA' | 'DATA_ANALYST' | 'BA' | 'BI';
  label: string;
  metric: string;
  status: 'ACTIVE' | 'IDLE';
}

export interface BaKpiItem {
  id: string;
  name: string;
  value: number;
  unit: string;
  target: number;
  status: 'PASS' | 'WARN' | 'RISK';
  formula: string;
}

export interface BaInsightItem {
  priority: 'P0' | 'P1' | 'P2';
  layer: string;
  title: string;
  action: string;
}

export interface DqDocumentIssue {
  doc_key: string;
  ssot_file_name: string;
  doc_type_code: string;
  issuer_code: string;
  domain_code: string;
  issue_year: number;
  dq_score: number;
  issues: string[];
}

export interface DqReportPayload {
  total_documents: number;
  avg_dq_score: number;
  pillars: {
    completeness_30: number;
    validity_30: number;
    uniqueness_20: number;
    timeliness_20: number;
  };
  issue_frequency: Array<{ issue: string; count: number }>;
  documents_with_issues: DqDocumentIssue[];
}

export interface RelationRadarItem {
  relation_key: string;
  source_doc_key: string;
  source_ssot_name: string;
  relation_type: 'REPEALS' | 'REPLACES' | 'AMENDS' | 'GUIDES' | 'REFERENCES';
  target_ref_raw: string;
  target_doc_number: string;
  target_year: number | null;
  evidence_snippet: string;
  source_doc_type: string;
  source_domain: string;
}

export interface GateCoverageRow {
  gate_code: string;
  phase_code: 'CHUAN_BI' | 'THUC_HIEN' | 'KET_THUC';
  gate_name: string;
  gate_order: number;
  doc_count: number;
  active_doc_count: number;
  structured_doc_count: number;
}

export interface VbplBiOverviewPayload {
  generated_at: string;
  source_mode?: 'LOCAL_LAKE_8008' | 'CLIENT_FALLBACK';
  architecture_layers: DataFoundationLayerCard[];
  summary: {
    total_documents: number;
    total_articles: number;
    total_clauses: number;
    ocr_documents: number;
    personal_notes: number;
  };
  lake_status?: {
    status: string;
    mode: string;
    data_lake_root: string;
    storage_layers: {
      bronze: { path: string; batch_files: number; size_kb: number };
      silver: { path: string; parquet_files: string[]; size_kb: number };
      gold: { path: string; parquet_files: string[]; size_kb: number };
      warehouse_sqlite: {
        path: string;
        size_kb: number;
        table_counts: Record<string, number>;
      };
    };
    last_etl_run: Record<string, unknown> | null;
  };
  ba_kpis: BaKpiItem[];
  ba_insights: BaInsightItem[];
  dq_report: DqReportPayload;
  charts: {
    by_domain: Array<{
      domain_code: string;
      domain_name: string;
      doc_count: number;
      total_articles: number;
      total_clauses: number;
      avg_dq_score: number;
      valid_name_count: number;
      full_structure_count: number;
    }>;
    by_doc_type: Array<{
      doc_type_code: string;
      doc_type_name: string;
      doc_count: number;
      avg_dq_score: number;
    }>;
    by_issuer: Array<{
      issuer_code: string;
      issuer_name: string;
      doc_count: number;
      avg_dq_score: number;
    }>;
    by_year: Array<{
      issue_year: number;
      doc_count: number;
      total_articles: number;
      active_count: number;
      avg_dq_score: number;
    }>;
    gate_coverage: GateCoverageRow[];
    project_axis_coverage: Array<{
      project_axis_code: string;
      project_axis_name: string;
      doc_count: number;
    }>;
  };
  relation_radar: RelationRadarItem[];
}

export interface VbplFtsSearchHit {
  clause_key: string;
  doc_key: string;
  ssot_file_name: string;
  article_number: string;
  title: string;
  snippet: string;
  node_level: string;
  chapter_title: string;
  doc_type_code: string;
  issuer_code: string;
  domain_code: string;
  issue_year: number;
  effect_status: string;
}

const DOMAIN_LABELS: Record<string, string> = {
  HDXD: 'Hoạt động Xây dựng & Quản lý Dự án',
  QLCL: 'Quản lý Chất lượng, Thi công & Bảo trì',
  QLCP: 'Quản lý Chi phí, Định mức & Dự toán',
  QLHD: 'Quản lý Hợp đồng Xây dựng & FIDIC',
  VLXD: 'Vật liệu Xây dựng & LAS-XD',
  DTH: 'Đấu thầu & Lựa chọn Nhà thầu',
  TQT: 'Thanh quyết toán & Kiểm toán vốn đầu tư',
  PCCC: 'Phòng cháy Chữa cháy & Cứu nạn',
  QHDD: 'Quy hoạch, Đất đai & GPMB',
  ATLD: 'An toàn Lao động & Môi trường',
  DTU: 'Chủ trương Đầu tư KCN / KKT / FTZ / PPP',
};

const DOC_TYPE_LABELS: Record<string, { name: string; rank: number }> = {
  LUAT: { name: 'Luật', rank: 1 },
  NQ: { name: 'Nghị quyết', rank: 2 },
  ND: { name: 'Nghị định', rank: 3 },
  VBHN: { name: 'Văn bản hợp nhất', rank: 4 },
  TT: { name: 'Thông tư', rank: 5 },
  QCVN: { name: 'Quy chuẩn kỹ thuật quốc gia', rank: 6 },
  TCVN: { name: 'Tiêu chuẩn quốc gia', rank: 7 },
  QD: { name: 'Quyết định', rank: 8 },
  TTr: { name: 'Tờ trình', rank: 9 },
  HD: { name: 'Hợp đồng', rank: 10 },
  PLHD: { name: 'Phụ lục hợp đồng', rank: 11 },
  BBNT: { name: 'Biên bản nghiệm thu', rank: 12 },
};

const PROJECT_AXIS_LABELS: Record<string, string> = {
  KCN: 'Khu công nghiệp',
  CCN: 'Cụm công nghiệp',
  FTZ: 'Khu thương mại tự do & Logistics',
  HTKT: 'Hạ tầng kỹ thuật & Giao thông',
  DAN_DUNG: 'Công trình dân dụng & Khu đô thị',
  PPP_BT: 'Dự án PPP / BOT / BT',
};

const STAGE_GATE_DIM: Array<{
  gate_code: string;
  phase_code: 'CHUAN_BI' | 'THUC_HIEN' | 'KET_THUC';
  gate_name: string;
  gate_order: number;
}> = [
  { gate_code: 'G0', phase_code: 'CHUAN_BI', gate_name: 'Chủ trương đầu tư & Pháp lý đất', gate_order: 0 },
  { gate_code: 'G1', phase_code: 'CHUAN_BI', gate_name: 'Quy hoạch 1/2000 & Nhiệm vụ chuẩn bị', gate_order: 1 },
  { gate_code: 'G2', phase_code: 'CHUAN_BI', gate_name: 'Khảo sát & Báo cáo Tiền khả thi', gate_order: 2 },
  { gate_code: 'G3', phase_code: 'CHUAN_BI', gate_name: 'Quy hoạch chi tiết 1/500 & Giao đất', gate_order: 3 },
  { gate_code: 'G4', phase_code: 'CHUAN_BI', gate_name: 'Đền bù GPMB & Giấy chứng nhận QSDĐ', gate_order: 4 },
  { gate_code: 'G5', phase_code: 'CHUAN_BI', gate_name: 'BCNCKT, Thiết kế cơ sở & BIM', gate_order: 5 },
  { gate_code: 'G6', phase_code: 'CHUAN_BI', gate_name: 'Thẩm duyệt PCCC & ĐTM / Giấy phép MT', gate_order: 6 },
  { gate_code: 'G7', phase_code: 'THUC_HIEN', gate_name: 'Thiết kế kỹ thuật / TKBVTC', gate_order: 7 },
  { gate_code: 'G8', phase_code: 'THUC_HIEN', gate_name: 'Giấy phép Xây dựng & Khởi công', gate_order: 8 },
  { gate_code: 'G9', phase_code: 'THUC_HIEN', gate_name: 'Thẩm tra Dự toán & Kế hoạch LCNT', gate_order: 9 },
  { gate_code: 'G10', phase_code: 'THUC_HIEN', gate_name: 'Đấu thầu & Phê duyệt kết quả LCNT', gate_order: 10 },
  { gate_code: 'G11', phase_code: 'THUC_HIEN', gate_name: 'Thương thảo, Ký Hợp đồng & Bảo lãnh', gate_order: 11 },
  { gate_code: 'G12', phase_code: 'THUC_HIEN', gate_name: 'Thi công, LAS-XD & Nghiệm thu công việc', gate_order: 12 },
  { gate_code: 'G13', phase_code: 'THUC_HIEN', gate_name: 'Tạm ứng, Thanh toán IPC & Kiểm soát VO', gate_order: 13 },
  { gate_code: 'G14', phase_code: 'KET_THUC', gate_name: 'Nghiệm thu hoàn thành & PCCC đưa vào SD', gate_order: 14 },
  { gate_code: 'G15', phase_code: 'KET_THUC', gate_name: 'Quyết toán vốn đầu tư & Kiểm toán độc lập', gate_order: 15 },
  { gate_code: 'G16', phase_code: 'KET_THUC', gate_name: 'Vận hành, Bảo hành & Lưu trữ hoàn công', gate_order: 16 },
];

const REL_PATTERNS: Array<{
  type: RelationRadarItem['relation_type'];
  re: RegExp;
}> = [
  {
    type: 'REPLACES',
    re: /(?:thay\s+thế|thay\s+the)\s+(?:cho\s+)?(?:Luật|Nghị\s+định|Thông\s+tư|Quyết\s+định|QCVN|TCVN|VBHN)?\s*(?:số\s*)?(\d{1,4}[/:-]\d{4}(?:[/:-][A-Za-z0-9Đđ-]+)?)/gi,
  },
  {
    type: 'REPEALS',
    re: /(?:bãi\s+bỏ|bai\s+bo|hết\s+hiệu\s+lực)\s+(?:một\s+số\s+điều\s+của\s+|toàn\s+bộ\s+)?(?:Luật|Nghị\s+định|Thông\s+tư|Quyết\s+định|QCVN)?\s*(?:số\s*)?(\d{1,4}[/:-]\d{4}(?:[/:-][A-Za-z0-9Đđ-]+)?)/gi,
  },
  {
    type: 'AMENDS',
    re: /(?:sửa\s+đổi,\s*bổ\s+sung|sửa\s+đổi|bổ\s+sung)\s+(?:một\s+số\s+điều\s+của\s+)?(?:Luật|Nghị\s+định|Thông\s+tư|Quyết\s+định|QCVN)?\s*(?:số\s*)?(\d{1,4}[/:-]\d{4}(?:[/:-][A-Za-z0-9Đđ-]+)?)/gi,
  },
  {
    type: 'GUIDES',
    re: /(?:quy\s+định\s+chi\s+tiết|hướng\s+dẫn\s+thi\s+hành)\s+(?:một\s+số\s+điều\s+của\s+)?(?:Luật|Nghị\s+định|Thông\s+tư)?\s*(?:Xây\s+dựng|Đấu\s+thầu|Đất\s+đai|Đầu\s+tư)?\s*(?:số\s*)?(\d{1,4}[/:-]\d{4}(?:[/:-][A-Za-z0-9Đđ-]+)?)/gi,
  },
];

function normalizeEffectStatus(raw: string): 'ACTIVE' | 'UPCOMING' | 'AMENDED' | 'EXPIRED' {
  const s = (raw || '').toLowerCase();
  if (s.includes('hết hiệu lực') || s.includes('bãi bỏ') || s.includes('expired')) return 'EXPIRED';
  if (s.includes('sắp có hiệu lực') || s.includes('upcoming')) return 'UPCOMING';
  if (s.includes('sửa đổi') || s.includes('amended')) return 'AMENDED';
  return 'ACTIVE';
}

function kpiStatus(
  val: number,
  target: number,
  warn: number,
  higherIsBetter = true
): 'PASS' | 'WARN' | 'RISK' {
  if (higherIsBetter) {
    if (val >= target) return 'PASS';
    if (val >= warn) return 'WARN';
    return 'RISK';
  }
  if (val <= target) return 'PASS';
  if (val <= warn) return 'WARN';
  return 'RISK';
}

export function computeClientVbplBiOverview(
  legalDocs: LegalDocument[],
  personalNoteCount = 0
): VbplBiOverviewPayload {
  const docs = legalDocs || [];
  const totalDocs = docs.length;

  // Logical uniqueness check
  const logicalCounts = new Map<string, number>();
  for (const d of docs) {
    const lk = `${(d.docType || '').toUpperCase()}|${(d.issuer || '').toUpperCase()}|${(
      d.docNumber || ''
    ).toUpperCase()}|${d.year || ''}`;
    logicalCounts.set(lk, (logicalCounts.get(lk) || 0) + 1);
  }

  let totalArticles = 0;
  let totalClauses = 0;
  let namingValidCount = 0;
  let structuredCount = 0;
  let activeCount = 0;

  let sumDq = 0;
  let sumComp = 0;
  let sumVal = 0;
  let sumUniq = 0;
  let sumTime = 0;

  const issueCounter = new Map<string, number>();
  const flaggedDocs: DqDocumentIssue[] = [];
  const relationRadar: RelationRadarItem[] = [];

  const domainAcc = new Map<
    string,
    {
      doc_count: number;
      total_articles: number;
      total_clauses: number;
      dq_sum: number;
      valid_name_count: number;
      full_structure_count: number;
    }
  >();
  const docTypeAcc = new Map<string, { doc_count: number; dq_sum: number }>();
  const issuerAcc = new Map<string, { doc_count: number; dq_sum: number }>();
  const yearAcc = new Map<
    number,
    { doc_count: number; total_articles: number; active_count: number; dq_sum: number }
  >();
  const axisAcc = new Map<string, Set<string>>();
  for (const ax of Object.keys(PROJECT_AXIS_LABELS)) axisAcc.set(ax, new Set());

  const gateAcc = new Map<
    string,
    { docs: Set<string>; activeDocs: Set<string>; structuredDocs: Set<string> }
  >();
  for (const g of STAGE_GATE_DIM) {
    gateAcc.set(g.gate_code, { docs: new Set(), activeDocs: new Set(), structuredDocs: new Set() });
  }

  for (const d of docs) {
    const domain = (VBPL_DOMAIN_CODES as string[]).includes(d.primaryDomain)
      ? d.primaryDomain
      : 'HDXD';
    const yearNum = Number(String(d.year || '2026').slice(0, 4)) || 2026;
    const effect = normalizeEffectStatus(d.status || d.validityPeriod || '');
    const namingValid = SSOT_FILENAME_RULE_RE.test((d.ssotFileName || '').trim());

    const nodeArticles = (d.nodes || []).filter(n => n.level === 'Điều').length;
    const artCount = Math.max(d.articleCount || 0, nodeArticles);
    const clCount =
      d.clauseTotalCount ||
      (d.nodes || []).reduce((acc, n) => acc + (n.clauseCount || 0), 0);
    const wordTotal = (d.nodes || []).reduce(
      (acc, n) => acc + (n.content ? n.content.split(/\s+/).length : 0),
      0
    );
    const hasFullStructure = nodeArticles > 0 && wordTotal >= 12;

    totalArticles += artCount;
    totalClauses += clCount;
    if (namingValid) namingValidCount += 1;
    if (hasFullStructure) structuredCount += 1;
    if (effect === 'ACTIVE') activeCount += 1;

    // 4-Pillar DQ Scoring (mirrors Python score_document_dq)
    const issues: string[] = [];
    let comp = 30;
    if (!d.docNumber || d.docNumber === '00' || d.docNumber === '01') {
      comp -= 5;
      issues.push('Thiếu hoặc dùng số hiệu mặc định (00/01)');
    }
    if (!d.issuer) {
      comp -= 5;
      issues.push('Thiếu mã cơ quan ban hành');
    }
    if (!d.title || d.title.trim().length < 8) {
      comp -= 5;
      issues.push('Trích yếu quá ngắn (< 8 ký tự)');
    }
    if (!d.issueDate || !d.effectiveDate) {
      comp -= 5;
      issues.push('Thiếu ngày ban hành hoặc ngày hiệu lực');
    }
    if (artCount <= 0) {
      comp -= 10;
      issues.push('Chưa bóc tách được cấu trúc Điều (file vỏ / scan chưa OCR)');
    }
    comp = Math.max(0, comp);

    let val = 30;
    if (!namingValid) {
      val -= 18;
      issues.push(
        'Tên file chưa đúng chuẩn [SốHiệu]-[Năm]_[LoạiVB]-[CơQuan]_[LĩnhVực]_[TríchYếu].[ext]'
      );
    }
    if (!(VBPL_DOMAIN_CODES as string[]).includes(d.primaryDomain)) {
      val -= 7;
      issues.push(`Mã lĩnh vực '${d.primaryDomain}' không thuộc 11 mã chuẩn`);
    }
    if (yearNum < 1990 || yearNum > 2035) {
      val -= 5;
      issues.push(`Năm ban hành bất thường (${yearNum})`);
    }
    val = Math.max(0, val);

    const lk = `${(d.docType || '').toUpperCase()}|${(d.issuer || '').toUpperCase()}|${(
      d.docNumber || ''
    ).toUpperCase()}|${d.year || ''}`;
    const uniq = (logicalCounts.get(lk) || 0) > 1 ? 5 : 20;
    if (uniq < 20) issues.push('Trùng khóa logic văn bản (Số hiệu + Năm + Loại + Cơ quan)');

    let time = 20;
    if (effect === 'EXPIRED') {
      time -= 8;
      issues.push('Văn bản đã hết hiệu lực — cần gắn cờ đối chiếu văn bản thay thế');
    } else if (effect === 'AMENDED' || d.isAmended) {
      time -= 3;
      issues.push('Văn bản đã bị sửa đổi/bổ sung — cần kiểm tra điều khoản cập nhật');
    }
    if (!d.linkedGates || d.linkedGates.length === 0) {
      time -= 8;
      issues.push('Chưa ánh xạ Stage-Gate (G0–G16)');
    }
    time = Math.max(0, time);

    const dqScore = comp + val + uniq + time;
    sumDq += dqScore;
    sumComp += comp;
    sumVal += val;
    sumUniq += uniq;
    sumTime += time;

    for (const iss of issues) {
      issueCounter.set(iss, (issueCounter.get(iss) || 0) + 1);
    }
    if (issues.length > 0) {
      flaggedDocs.push({
        doc_key: d.id,
        ssot_file_name: d.ssotFileName,
        doc_type_code: d.docType,
        issuer_code: d.issuer,
        domain_code: domain,
        issue_year: yearNum,
        dq_score: dqScore,
        issues,
      });
    }

    // Domain summary
    const curDom = domainAcc.get(domain) || {
      doc_count: 0,
      total_articles: 0,
      total_clauses: 0,
      dq_sum: 0,
      valid_name_count: 0,
      full_structure_count: 0,
    };
    curDom.doc_count += 1;
    curDom.total_articles += artCount;
    curDom.total_clauses += clCount;
    curDom.dq_sum += dqScore;
    if (namingValid) curDom.valid_name_count += 1;
    if (hasFullStructure) curDom.full_structure_count += 1;
    domainAcc.set(domain, curDom);

    // Doc type summary
    const dt = d.docType || 'ND';
    const curDt = docTypeAcc.get(dt) || { doc_count: 0, dq_sum: 0 };
    curDt.doc_count += 1;
    curDt.dq_sum += dqScore;
    docTypeAcc.set(dt, curDt);

    // Issuer summary
    const issCode = d.issuer || 'CP';
    const curIss = issuerAcc.get(issCode) || { doc_count: 0, dq_sum: 0 };
    curIss.doc_count += 1;
    curIss.dq_sum += dqScore;
    issuerAcc.set(issCode, curIss);

    // Year summary
    const curYr = yearAcc.get(yearNum) || {
      doc_count: 0,
      total_articles: 0,
      active_count: 0,
      dq_sum: 0,
    };
    curYr.doc_count += 1;
    curYr.total_articles += artCount;
    if (effect === 'ACTIVE') curYr.active_count += 1;
    curYr.dq_sum += dqScore;
    yearAcc.set(yearNum, curYr);

    // Project axes
    for (const ax of d.projectAxes || []) {
      const s = axisAcc.get(ax);
      if (s) s.add(d.id);
    }

    // Stage gates
    for (const g of d.linkedGates || []) {
      const bucket = gateAcc.get(g.toUpperCase());
      if (bucket) {
        bucket.docs.add(d.id);
        if (effect === 'ACTIVE') bucket.activeDocs.add(d.id);
        if (hasFullStructure) bucket.structuredDocs.add(d.id);
      }
    }

    // Relation radar scan
    const corpus = `${d.title}\n${d.lineage || ''}\n${(d.nodes || [])
      .map(n => `${n.title} ${n.content}`)
      .join('\n')}`;
    const seenRel = new Set<string>();
    for (const { type, re } of REL_PATTERNS) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(corpus)) !== null) {
        const refRaw = m[1].trim();
        const key = `${type}|${refRaw.toUpperCase()}`;
        if (seenRel.has(key)) continue;
        seenRel.add(key);
        const yrMatch = refRaw.match(/(19|20)\d{2}/);
        const snippet = corpus
          .slice(Math.max(0, m.index - 25), Math.min(corpus.length, m.index + m[0].length + 65))
          .replace(/\s+/g, ' ')
          .trim();
        relationRadar.push({
          relation_key: `REL-${d.id}-${relationRadar.length + 1}`,
          source_doc_key: d.id,
          source_ssot_name: d.ssotFileName,
          relation_type: type,
          target_ref_raw: refRaw,
          target_doc_number: refRaw.split(/[/:-]/)[0] || refRaw,
          target_year: yrMatch ? Number(yrMatch[0]) : null,
          evidence_snippet: snippet,
          source_doc_type: d.docType,
          source_domain: domain,
        });
      }
    }
  }

  const avgDq = totalDocs ? Number((sumDq / totalDocs).toFixed(1)) : 0;
  const namingRate = totalDocs ? Number(((namingValidCount / totalDocs) * 100).toFixed(1)) : 0;
  const structureRate = totalDocs ? Number(((structuredCount / totalDocs) * 100).toFixed(1)) : 0;
  const freshnessRate = totalDocs ? Number(((activeCount / totalDocs) * 100).toFixed(1)) : 0;

  const gateCoverage: GateCoverageRow[] = STAGE_GATE_DIM.map(g => {
    const b = gateAcc.get(g.gate_code)!;
    return {
      ...g,
      doc_count: b.docs.size,
      active_doc_count: b.activeDocs.size,
      structured_doc_count: b.structuredDocs.size,
    };
  });
  const coveredGates = gateCoverage.filter(g => g.active_doc_count > 0).length;
  const gateReadiness = Number(((coveredGates / gateCoverage.length) * 100).toFixed(1));
  const highAlerts = relationRadar.filter(r =>
    ['REPEALS', 'REPLACES', 'AMENDS'].includes(r.relation_type)
  ).length;

  const baKpis: BaKpiItem[] = [
    {
      id: 'KPI_SSOT_NAMING',
      name: 'Tỷ lệ Chuẩn hóa tên SSOT',
      value: namingRate,
      unit: '%',
      target: 95,
      status: kpiStatus(namingRate, 95, 80),
      formula: 'Số VB đạt [SốHiệu]-[Năm]_[LoạiVB]-[CơQuan]_[LĩnhVực]_[TríchYếu] / Tổng VB',
    },
    {
      id: 'KPI_FULL_STRUCTURE',
      name: 'Độ phủ Cấu trúc NĐ 30 (Điều/Khoản)',
      value: structureRate,
      unit: '%',
      target: 90,
      status: kpiStatus(structureRate, 90, 70),
      formula: 'Số VB đã bóc tách Điều/Khoản đầy đủ / Tổng VB',
    },
    {
      id: 'KPI_LEGAL_FRESHNESS',
      name: 'Chỉ số Hiệu lực 2026',
      value: freshnessRate,
      unit: '%',
      target: 85,
      status: kpiStatus(freshnessRate, 85, 65),
      formula: 'Số VB đang còn hiệu lực (ACTIVE) / Tổng VB',
    },
    {
      id: 'KPI_GATE_READINESS',
      name: 'Độ phủ Pháp lý Stage-Gate G0–G16',
      value: gateReadiness,
      unit: '%',
      target: 88,
      status: kpiStatus(gateReadiness, 88, 65),
      formula: `Số cổng có VB hiệu lực (${coveredGates}/${gateCoverage.length} Gate)`,
    },
    {
      id: 'KPI_DQ_COMPOSITE',
      name: 'Điểm Sức khỏe Dữ liệu (DQ Score)',
      value: avgDq,
      unit: '/100',
      target: 85,
      status: kpiStatus(avgDq, 85, 70),
      formula: 'Completeness(30) + Validity(30) + Uniqueness(20) + Timeliness(20)',
    },
    {
      id: 'KPI_CONFLICT_ALERTS',
      name: 'Cảnh báo Sửa đổi / Thay thế / Bãi bỏ',
      value: highAlerts,
      unit: 'liên kết',
      target: 0,
      status: kpiStatus(highAlerts, 0, 3, false),
      formula: 'Số tham chiếu REPLACES / REPEALS / AMENDS cần soát xét',
    },
  ];

  const baInsights: BaInsightItem[] = [];
  const missingGates = gateCoverage.filter(g => g.active_doc_count === 0).map(g => g.gate_code);
  if (missingGates.length > 0) {
    baInsights.push({
      priority: missingGates.length >= 4 ? 'P0' : 'P1',
      layer: 'BA · Stage-Gate Gap',
      title: `Phát hiện ${missingGates.length} cổng Stage-Gate chưa có VBPL hiệu lực dẫn chiếu`,
      action: `Bổ sung hoặc gắn Smart Tag Stage-Gate cho các cổng: ${missingGates.slice(0, 8).join(', ')}.`,
    });
  }
  const badNames = totalDocs - namingValidCount;
  if (badNames > 0) {
    baInsights.push({
      priority: 'P0',
      layer: 'DATA · SSOT Naming',
      title: `${badNames}/${totalDocs} văn bản chưa đúng công thức tên chuẩn VBPL mới`,
      action: 'Mở Bước 1 hoặc đồng bộ lại qua Data Lake ETL để chuẩn hóa [SốHiệu]-[Năm]_[LoạiVB]-[CơQuan]_[LĩnhVực]_[TríchYếu].',
    });
  }
  const unstructured = totalDocs - structuredCount;
  if (unstructured > 0) {
    baInsights.push({
      priority: 'P1',
      layer: 'LAKE · Silver Parsing',
      title: `${unstructured} văn bản chưa có full-text Điều/Khoản`,
      action: 'Bật Local Scanner (:8008) để LegalDocumentParser tự động bóc tách PDF/DOCX và lưu Parquet trên SSD E:\\.',
    });
  }
  if (highAlerts > 0) {
    baInsights.push({
      priority: 'P1',
      layer: 'ANALYST · Legal Lineage',
      title: `Phát hiện ${highAlerts} liên kết Thay thế / Sửa đổi / Bãi bỏ cần rà soát`,
      action: 'Kiểm tra bảng Radar Quan hệ Hiệu lực để tránh áp dụng nhầm điều khoản cũ.',
    });
  }

  return {
    generated_at: new Date().toISOString(),
    source_mode: 'CLIENT_FALLBACK',
    architecture_layers: [
      {
        step: 1,
        code: 'DATA',
        label: 'Data Ingestion & Contracts',
        metric: `${totalDocs} VB trong phiên Web`,
        status: totalDocs > 0 ? 'ACTIVE' : 'IDLE',
      },
      {
        step: 2,
        code: 'DATA_LAKE',
        label: 'Medallion Lake (Bronze/Silver/Gold)',
        metric: 'Sẵn sàng đồng bộ sang SSD E:\\ (:8008)',
        status: 'IDLE',
      },
      {
        step: 3,
        code: 'MODEL_DATA',
        label: 'Star Schema (SQLite WAL + FTS5)',
        metric: `6 Dim · ${totalDocs} Fact VB`,
        status: totalDocs > 0 ? 'ACTIVE' : 'IDLE',
      },
      {
        step: 4,
        code: 'DATA_ANALYST',
        label: 'DQ Profiler & Gap Analysis',
        metric: `DQ ${avgDq}/100 · ${flaggedDocs.length} VB cần sửa`,
        status: 'ACTIVE',
      },
      {
        step: 5,
        code: 'BA',
        label: 'Semantic KPI Dictionary & Rules',
        metric: `6 KPI · ${baInsights.length} Khuyến nghị`,
        status: 'ACTIVE',
      },
      {
        step: 6,
        code: 'BI',
        label: 'Executive Dashboard & Export',
        metric: `${totalArticles} Điều · ${totalClauses} Khoản`,
        status: 'ACTIVE',
      },
    ],
    summary: {
      total_documents: totalDocs,
      total_articles: totalArticles,
      total_clauses: totalClauses,
      ocr_documents: 0,
      personal_notes: personalNoteCount,
    },
    ba_kpis: baKpis,
    ba_insights: baInsights,
    dq_report: {
      total_documents: totalDocs,
      avg_dq_score: avgDq,
      pillars: {
        completeness_30: totalDocs ? Number((sumComp / totalDocs).toFixed(1)) : 0,
        validity_30: totalDocs ? Number((sumVal / totalDocs).toFixed(1)) : 0,
        uniqueness_20: totalDocs ? Number((sumUniq / totalDocs).toFixed(1)) : 0,
        timeliness_20: totalDocs ? Number((sumTime / totalDocs).toFixed(1)) : 0,
      },
      issue_frequency: Array.from(issueCounter.entries())
        .map(([issue, count]) => ({ issue, count }))
        .sort((a, b) => b.count - a.count),
      documents_with_issues: flaggedDocs.sort((a, b) => a.dq_score - b.dq_score).slice(0, 50),
    },
    charts: {
      by_domain: Array.from(domainAcc.entries())
        .map(([domain_code, v]) => ({
          domain_code,
          domain_name: DOMAIN_LABELS[domain_code] || domain_code,
          doc_count: v.doc_count,
          total_articles: v.total_articles,
          total_clauses: v.total_clauses,
          avg_dq_score: Number((v.dq_sum / v.doc_count).toFixed(1)),
          valid_name_count: v.valid_name_count,
          full_structure_count: v.full_structure_count,
        }))
        .sort((a, b) => b.doc_count - a.doc_count),
      by_doc_type: Array.from(docTypeAcc.entries())
        .map(([doc_type_code, v]) => ({
          doc_type_code,
          doc_type_name: DOC_TYPE_LABELS[doc_type_code]?.name || doc_type_code,
          doc_count: v.doc_count,
          avg_dq_score: Number((v.dq_sum / v.doc_count).toFixed(1)),
        }))
        .sort(
          (a, b) =>
            (DOC_TYPE_LABELS[a.doc_type_code]?.rank ?? 99) -
            (DOC_TYPE_LABELS[b.doc_type_code]?.rank ?? 99)
        ),
      by_issuer: Array.from(issuerAcc.entries())
        .map(([issuer_code, v]) => ({
          issuer_code,
          issuer_name: issuer_code,
          doc_count: v.doc_count,
          avg_dq_score: Number((v.dq_sum / v.doc_count).toFixed(1)),
        }))
        .sort((a, b) => b.doc_count - a.doc_count),
      by_year: Array.from(yearAcc.entries())
        .map(([issue_year, v]) => ({
          issue_year,
          doc_count: v.doc_count,
          total_articles: v.total_articles,
          active_count: v.active_count,
          avg_dq_score: Number((v.dq_sum / v.doc_count).toFixed(1)),
        }))
        .sort((a, b) => a.issue_year - b.issue_year),
      gate_coverage: gateCoverage,
      project_axis_coverage: Object.entries(PROJECT_AXIS_LABELS).map(([code, name]) => ({
        project_axis_code: code,
        project_axis_name: name,
        doc_count: axisAcc.get(code)?.size || 0,
      })),
    },
    relation_radar: relationRadar.slice(0, 50),
  };
}

export function searchClientVbplClauses(
  legalDocs: LegalDocument[],
  query: string,
  limit = 25
): VbplFtsSearchHit[] {
  const q = (query || '').trim().toLowerCase();
  if (!q) return [];
  const hits: VbplFtsSearchHit[] = [];

  for (const d of legalDocs) {
    for (const n of d.nodes || []) {
      const hay = `${n.code} ${n.title} ${n.content}`.toLowerCase();
      const idx = hay.indexOf(q);
      if (idx === -1) continue;
      const rawBody = n.content || n.title || '';
      const rawLower = rawBody.toLowerCase();
      const bodyIdx = rawLower.indexOf(q);
      const start = Math.max(0, bodyIdx >= 0 ? bodyIdx - 50 : 0);
      const snippet = rawBody.slice(start, start + 180).trim();

      hits.push({
        clause_key: `${d.id}-${n.id}`,
        doc_key: d.id,
        ssot_file_name: d.ssotFileName,
        article_number: n.code,
        title: n.title,
        snippet: snippet || n.title,
        node_level: n.level,
        chapter_title: '',
        doc_type_code: d.docType,
        issuer_code: d.issuer,
        domain_code: d.primaryDomain,
        issue_year: Number(String(d.year || '2026').slice(0, 4)) || 2026,
        effect_status: normalizeEffectStatus(d.status || ''),
      });
      if (hits.length >= limit) return hits;
    }
  }
  return hits;
}
