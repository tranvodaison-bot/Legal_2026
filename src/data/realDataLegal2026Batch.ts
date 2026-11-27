/**
 * KHO HỒ SƠ PHÁP LÝ THỰC TẾ DATA_LEGAL_2026 (160 MỤC)
 * Nguồn: G:\My Drive\02_KNOWLEDGE_LIBRARY\01_Quan_tri_Doanh_nghiep\Phap_che\Data_Legal_2026
 * Tự động tạo bởi: scripts/generate_real_data_legal_batch.py
 * Cung cấp dữ liệu thực tế 100% cho Bước 1 CDE và Bước 2 Thư viện Pháp lý 3 Cột.
 */

import {
  AnalyzedFileItem,
  FolderNamingPresetCode,
  ProjectArchetypeCode,
  QlvbNamingGroupCode,
  CdeIsoStatus,
  LegalDocument,
  LegalNode,
} from '../types/lexPmoTypes';
import {
  buildAutoSuggestedTags,
  buildFileNameByRule,
  buildStandardFolderPath,
  extractOcrZonesFromText,
  inferSubSectorFromDomain,
  normalizeSsotDocType,
  parseVietnameseLegalText,
  smartAnalyzeFile3D,
  validateBatchFileName,
} from '../utils/legalParser';
import rawDataLegal2026 from './rawRealDataLegal2026.json';

interface RawItem {
  kind: 'FILE' | 'FOLDER';
  originalFolder: string;
  originalName: string;
  extractedText: string;
  sizeLabel: string;
  statsLabel: string;
  sha256Hash: string;
  qlvbGroup: QlvbNamingGroupCode;
}

const RAW_ITEMS = rawDataLegal2026 as RawItem[];

/**
 * Trích xuất tên tệp vật lý gốc trong kho Data_Legal_2026 từ chuỗi lineage (nếu có)
 */
export function extractRawFileNameFromLineage(lineage?: string): string | undefined {
  if (!lineage) return undefined;
  const m = lineage.match(/Data_Legal_2026\s*\(([^·)]+)/i);
  return m && m[1] ? m[1].trim() : undefined;
}

/**
 * Hợp nhất các tệp thực tế còn lại trong Data_Legal_2026 chưa có trong danh mục cơ sở
 * để Thư viện VBPL 3 Cột hiển thị đầy đủ 100% kho thực tế (không trùng lặp ID hoặc tệp gốc).
 */
export function buildExtraDataLegal2026Docs(existingDocs: LegalDocument[]): LegalDocument[] {
  const coveredRawNames = new Set<string>();
  const coveredSsotNames = new Set<string>();

  for (const d of existingDocs) {
    if (d.rawFileName) coveredRawNames.add(d.rawFileName.toLowerCase());
    const fromLin = extractRawFileNameFromLineage(d.lineage);
    if (fromLin) coveredRawNames.add(fromLin.toLowerCase());
    if (d.ssotFileName) coveredSsotNames.add(d.ssotFileName.toLowerCase());
  }

  const extras: LegalDocument[] = [];

  RAW_ITEMS.forEach((s, idx) => {
    if (s.kind !== 'FILE') return;
    if (!/\.(pdf|docx?|xlsx?)$/i.test(s.originalName)) return;
    if (coveredRawNames.has(s.originalName.toLowerCase())) return;

    const suggestion = smartAnalyzeFile3D(s.originalName, s.extractedText);
    const ssotFileName = buildFileNameByRule({
      group: 'SSOT_9PART',
      industry: suggestion.industry,
      docType: suggestion.docType,
      issuer: suggestion.issuer,
      rawNumber: suggestion.rawNumber,
      year: suggestion.year,
      primaryDomain: suggestion.primaryDomain,
      rawSummary: suggestion.rawSummary,
      appendixSuffix: suggestion.appendixSuffix,
      ext: suggestion.ext,
      projectCode: 'KCN',
      linkedGates: suggestion.linkedGates,
    });

    if (coveredSsotNames.has(ssotFileName.toLowerCase())) return;
    coveredRawNames.add(s.originalName.toLowerCase());
    coveredSsotNames.add(ssotFileName.toLowerCase());

    const subSector = inferSubSectorFromDomain(
      suggestion.primaryDomain,
      suggestion.industry,
      s.originalName
    );
    const normType = normalizeSsotDocType(suggestion.docType);
    const parsedNodes = parseVietnameseLegalText(s.extractedText || '');
    const fallbackNodes: LegalNode[] =
      parsedNodes.length > 0
        ? parsedNodes
        : [
            {
              id: `DL26-EXT-N-${idx + 1}`,
              level: 'Điều',
              code: 'Điều 1',
              title: suggestion.rawSummary || s.originalName,
              clauseCount: 1,
              content:
                s.extractedText ||
                `Tài liệu pháp quy thực tế từ kho Data_Legal_2026: ${s.originalName} (${s.sizeLabel}).`,
            },
          ];

    const yearNum = Number(suggestion.year) || 2026;
    const isOld = yearNum <= 2020 && /06-2021|50-2021|37-2015/i.test(s.originalName);

    const formattedDocNumber = suggestion.rawNumber.includes('/')
      ? suggestion.rawNumber
      : normType === 'ND'
      ? `${suggestion.rawNumber}/${suggestion.year}/NĐ-CP`
      : normType === 'LUAT'
      ? `${suggestion.rawNumber}/${suggestion.year}/${suggestion.issuer || 'QH15'}`
      : `${suggestion.rawNumber}/${suggestion.year}/${normType}-${suggestion.issuer || 'BXD'}`;

    extras.push({
      id: `DOC-DL26-EXT-${String(idx + 1).padStart(3, '0')}`,
      ssotFileName,
      rawFileName: s.originalName,
      docNumber: formattedDocNumber,
      docType: normType,
      issuer: suggestion.issuer || 'CP',
      year: suggestion.year || '2026',
      issueDate: `01/01/${suggestion.year || '2026'}`,
      effectiveDate: yearNum >= 2026 ? `01/07/${suggestion.year}` : `15/02/${suggestion.year || '2025'}`,
      industryGroupId: subSector.industryGroupId,
      subSectorCode: subSector.subSectorCode,
      subSectorLabel: subSector.subSectorLabel,
      primaryDomain: suggestion.primaryDomain,
      title: suggestion.rawSummary || s.originalName,
      shortSummary: suggestion.rawSummary || s.originalName,
      status: isOld ? 'Hết hiệu lực (Tra cứu chuyển tiếp)' : `Còn hiệu lực năm ${Math.max(2026, yearNum)}`,
      validityPeriod: isOld ? 'AMENDED' : 'Còn hiệu lực',
      isAmended: /SDBS|SuaDoi|VBHN/i.test(s.originalName),
      amendBadge: /SDBS|SuaDoi/i.test(s.originalName) ? 'SĐBS' : undefined,
      chapterCount: Math.max(1, fallbackNodes.filter(n => n.level === 'Chương').length),
      articleCount: Math.max(1, fallbackNodes.filter(n => n.level !== 'Chương' && n.level !== 'Mục').length),
      clauseTotalCount: Math.max(
        1,
        fallbackNodes.reduce((sum, n) => sum + (n.clauseCount || 1), 0)
      ),
      projectAxes:
        suggestion.projectAxes && suggestion.projectAxes.length > 0
          ? suggestion.projectAxes
          : ['HTKT', 'DAN_DUNG', 'KCN', 'CCN', 'FTZ', 'PPP_BT'],
      secondaryDomains:
        suggestion.secondaryDomains && suggestion.secondaryDomains.length > 0
          ? suggestion.secondaryDomains
          : [suggestion.primaryDomain],
      linkedGates:
        suggestion.linkedGates && suggestion.linkedGates.length > 0
          ? suggestion.linkedGates
          : ['G0', 'G5', 'G12', 'G15'],
      linkedQAQC:
        suggestion.linkedQAQC && suggestion.linkedQAQC.length > 0
          ? suggestion.linkedQAQC
          : ['QT-01'],
      tags: ['Nguồn: Data_Legal_2026', s.statsLabel, `LV: ${suggestion.primaryDomain}`],
      lineage: `Đồng bộ trực tiếp từ kho thực tế Data_Legal_2026 (${s.originalName} · ${s.sizeLabel} · SHA256: ${s.sha256Hash})`,
      nodes: fallbackNodes,
    });
  });

  return extras;
}

/**
 * Nạp toàn bộ 160 tệp thực tế từ kho Data_Legal_2026 và chuyển đổi sang AnalyzedFileItem[]
 */
export function createRealDataLegalBatchItems(
  activeProject: ProjectArchetypeCode = 'KCN',
  namingGroup: QlvbNamingGroupCode = 'SSOT_9PART',
  folderPreset: FolderNamingPresetCode = 'STAGE_GATE_ISO'
): AnalyzedFileItem[] {
  return RAW_ITEMS.map((s, idx) => {
    const suggestion = smartAnalyzeFile3D(s.originalName, s.extractedText);
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

    const defaultCdeStatus: CdeIsoStatus =
      s.originalName.includes('2026') || s.originalName.includes('2025')
        ? 'A1'
        : 'S1';

    return {
      id: `DL26-${String(idx + 1).padStart(3, '0')}`,
      rawFile: null,
      itemKind: s.kind,
      originalName: s.originalName,
      originalFolderPath: 'G:/My Drive/02_KNOWLEDGE_LIBRARY/01_Quan_tri_Doanh_nghiep/Phap_che/Data_Legal_2026',
      proposedFolderPath: proposedFolder,
      extractedText: s.extractedText,
      suggestion,
      smartTags,
      proposedName,
      qlvbGroup: effectiveGroup,
      cdeStatus: defaultCdeStatus,
      validationStatus: validation.status,
      validationMessage: validation.message || 'Hồ sơ pháp lý thực tế từ kho Data_Legal_2026',
      sha256Hash: s.sha256Hash,
      fileSizeLabel: s.sizeLabel,
      readStatsLabel: s.statsLabel,
      ocrZones,
      selected: true,
      isCommitted: false,
    };
  });
}

export const REAL_DATA_LEGAL_2026_BATCH: AnalyzedFileItem[] = createRealDataLegalBatchItems();

export function getRealDataLegalBatch(
  project: ProjectArchetypeCode = 'KCN',
  group: QlvbNamingGroupCode = 'SSOT_9PART',
  preset: FolderNamingPresetCode = 'STAGE_GATE_ISO'
): AnalyzedFileItem[] {
  return createRealDataLegalBatchItems(project, group, preset);
}
