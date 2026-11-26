/**
 * KHO HỒ SƠ PHÁP LÝ THỰC TẾ DATA_LEGAL_2026 (160 MỤC)
 * Nguồn: G:\My Drive\02_KNOWLEDGE_LIBRARY\01_Quan_tri_Doanh_nghiep\Phap_che\Data_Legal_2026
 * Tự động tạo bởi: scripts/generate_real_data_legal_batch.py
 * KHÔNG SỬA TAY — Cung cấp dữ liệu thực tế 100% cho Bước 1 CDE và Bước 2 Ma trận pháp lý.
 */

import {
  AnalyzedFileItem,
  FolderNamingPresetCode,
  ProjectArchetypeCode,
  QlvbNamingGroupCode,
  CdeIsoStatus,
} from '../types/lexPmoTypes';
import {
  buildAutoSuggestedTags,
  buildFileNameByRule,
  buildStandardFolderPath,
  extractOcrZonesFromText,
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
