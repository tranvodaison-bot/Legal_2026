#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Trình tạo dữ liệu thực tế từ kho Data_Legal_2026:
Quét toàn bộ 157 tệp + 1 thư mục biểu mẫu tại:
  G:\\My Drive\\02_KNOWLEDGE_LIBRARY\\01_Quan_tri_Doanh_nghiep\\Phap_che\\Data_Legal_2026
Sinh ra:
  1. src/data/rawRealDataLegal2026.json (chứa metadata thực tế, SHA256, size, trích dẫn văn bản)
  2. src/data/realDataLegal2026Batch.ts (hàm tạo AnalyzedFileItem[] tương thích 100% với hệ thống)
"""

import os
import sys
import re
import json
import hashlib
import pathlib

try:
    import fitz  # pymupdf
except ImportError:
    fitz = None

try:
    import docx
except ImportError:
    docx = None

DATA_LEGAL_DIR = r"G:\My Drive\02_KNOWLEDGE_LIBRARY\01_Quan_tri_Doanh_nghiep\Phap_che\Data_Legal_2026"
PROJECT_ROOT = pathlib.Path(r"E:\4. AI_PROJECT\2_Project\5_LEGAL_2026")
OUTPUT_JSON = PROJECT_ROOT / "src" / "data" / "rawRealDataLegal2026.json"
OUTPUT_TS = PROJECT_ROOT / "src" / "data" / "realDataLegal2026Batch.ts"

def format_size(sz: int) -> str:
    if sz >= 1024 * 1024:
        return f"{sz / (1024 * 1024):.2f} MB"
    return f"{sz / 1024:.1f} KB"

def get_sha256_prefix(filepath: str) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        chunk = f.read(65536)
        while chunk:
            h.update(chunk)
            chunk = f.read(65536)
    return h.hexdigest()[:12].upper()

def infer_qlvb_group(name: str) -> str:
    up = name.upper()
    if "HOPDONG" in up or "MAUHD" in up or "HĐ" in up or "HD" in up:
        return "HD"
    if "THINGHIEM" in up or "LAS" in up or "CHATLUONG" in up or "QLCL" in up or "BBNT" in up or "PHONGTHINGHIEM" in up:
        return "KT"
    if "THIETKE" in up or "BANVE" in up or "TK" in up or "CAD" in up:
        return "TK"
    if "QUYHOACH" in up or "DATDAI" in up or "MOITRUONG" in up or "PCCC" in up or "CHUTRUONG" in up:
        return "PLDA"
    if "CONGVAN" in up or "CV" in up or "THONGBAO" in up or "BAOCAO" in up or "BC" in up:
        return "HC"
    return "PL"

def main():
    print(f"Scanning directory: {DATA_LEGAL_DIR}")
    if not os.path.exists(DATA_LEGAL_DIR):
        print(f"ERROR: Directory not found: {DATA_LEGAL_DIR}")
        sys.exit(1)

    entries = sorted(os.listdir(DATA_LEGAL_DIR))
    raw_items = []

    for entry in entries:
        full_path = os.path.join(DATA_LEGAL_DIR, entry)
        is_dir = os.path.isdir(full_path)
        ext = os.path.splitext(entry)[1].lower() if not is_dir else ""

        extracted_text = ""
        read_stats = ""
        sha_hash = ""
        size_label = ""
        qlvb_group = infer_qlvb_group(entry)

        if is_dir:
            sub_files = os.listdir(full_path)
            size_label = f"Thư mục ({len(sub_files)} tệp)"
            read_stats = f"Thư mục biểu mẫu · {len(sub_files)} mẫu đính kèm NĐ 14/2026"
            sha_hash = "DIR-ND14-2026"
            extracted_text = (
                f"THƯ MỤC BIỂU MẪU & PHỤ LỤC NGHỊ ĐỊNH 14/2026/NĐ-CP\n"
                f"Bao gồm {len(sub_files)} biểu mẫu Word (.docx) đính kèm: đơn cấp phép kinh doanh vận tải, "
                f"báo cáo an toàn công trình, biểu mẫu phá dỡ tàu biển, kiểm tra chất lượng ATKT & BVMT."
            )
            item_kind = "FOLDER"
            qlvb_group = "HC"
        else:
            sz = os.path.getsize(full_path)
            size_label = format_size(sz)
            sha_hash = get_sha256_prefix(full_path)
            item_kind = "FILE"

            # Extract sample text
            if ext == ".pdf" and fitz:
                try:
                    pdf_doc = fitz.open(full_path)
                    pages = len(pdf_doc)
                    page_text = ""
                    if pages > 0:
                        page_text = pdf_doc[0].get_text("text")[:600].strip()
                    pdf_doc.close()
                    read_stats = f"PDF · {pages} trang · SHA256: {sha_hash}"
                    extracted_text = page_text if page_text else f"Tệp PDF văn bản pháp quy: {entry} ({size_label}, {pages} trang)."
                except Exception as e:
                    read_stats = f"PDF · {size_label} · SHA256: {sha_hash}"
                    extracted_text = f"Tệp PDF văn bản pháp luật: {entry}."
            elif ext == ".docx" and docx:
                try:
                    doc = docx.Document(full_path)
                    p_texts = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
                    doc_snippet = "\n".join(p_texts[:8])[:600]
                    read_stats = f"DOCX · {len(p_texts)} đoạn · SHA256: {sha_hash}"
                    extracted_text = doc_snippet if doc_snippet else f"Tệp văn bản Word .docx: {entry}."
                except Exception as e:
                    read_stats = f"DOCX · {size_label} · SHA256: {sha_hash}"
                    extracted_text = f"Tệp văn bản Word .docx: {entry}."
            elif ext == ".doc":
                read_stats = f"DOC (Word) · {size_label} · SHA256: {sha_hash}"
                extracted_text = f"Tệp văn bản Microsoft Word: {entry}."
            else:
                read_stats = f"{ext.upper()} · {size_label} · SHA256: {sha_hash}"
                extracted_text = f"Tài liệu pháp lý: {entry}."

        raw_items.append({
            "kind": item_kind,
            "originalFolder": "Data_Legal_2026",
            "originalName": entry,
            "extractedText": extracted_text,
            "sizeLabel": size_label,
            "statsLabel": read_stats,
            "sha256Hash": sha_hash,
            "qlvbGroup": qlvb_group,
        })

    print(f"Total raw items: {len(raw_items)}")

    # Write JSON
    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(raw_items, f, ensure_ascii=False, indent=2)
    print(f"Generated raw JSON: {OUTPUT_JSON}")

    # Generate TypeScript file
    ts_code = f"""/**
 * KHO HỒ SƠ PHÁP LÝ THỰC TẾ DATA_LEGAL_2026 ({len(raw_items)} MỤC)
 * Nguồn: G:\\My Drive\\02_KNOWLEDGE_LIBRARY\\01_Quan_tri_Doanh_nghiep\\Phap_che\\Data_Legal_2026
 * Tự động tạo bởi: scripts/generate_real_data_legal_batch.py
 * KHÔNG SỬA TAY — Cung cấp dữ liệu thực tế 100% cho Bước 1 CDE và Bước 2 Ma trận pháp lý.
 */

import {{
  AnalyzedFileItem,
  FolderNamingPresetCode,
  ProjectArchetypeCode,
  QlvbNamingGroupCode,
  CdeIsoStatus,
}} from '../types/lexPmoTypes';
import {{
  buildAutoSuggestedTags,
  buildFileNameByRule,
  buildStandardFolderPath,
  extractOcrZonesFromText,
  smartAnalyzeFile3D,
  validateBatchFileName,
}} from '../utils/legalParser';
import rawDataLegal2026 from './rawRealDataLegal2026.json';

interface RawItem {{
  kind: 'FILE' | 'FOLDER';
  originalFolder: string;
  originalName: string;
  extractedText: string;
  sizeLabel: string;
  statsLabel: string;
  sha256Hash: string;
  qlvbGroup: QlvbNamingGroupCode;
}}

const RAW_ITEMS = rawDataLegal2026 as RawItem[];

/**
 * Nạp toàn bộ {len(raw_items)} tệp thực tế từ kho Data_Legal_2026 và chuyển đổi sang AnalyzedFileItem[]
 */
export function createRealDataLegalBatchItems(
  activeProject: ProjectArchetypeCode = 'KCN',
  namingGroup: QlvbNamingGroupCode = 'SSOT_9PART',
  folderPreset: FolderNamingPresetCode = 'STAGE_GATE_ISO'
): AnalyzedFileItem[] {{
  return RAW_ITEMS.map((s, idx) => {{
    const suggestion = smartAnalyzeFile3D(s.originalName, s.extractedText);
    const effectiveGroup = namingGroup === 'SSOT_9PART' ? 'SSOT_9PART' : s.qlvbGroup;
    const proposedFolder = buildStandardFolderPath({{
      preset: folderPreset,
      originalFolder: s.originalFolder,
      projectCode: activeProject,
      primaryDomain: suggestion.primaryDomain,
      gateCode: suggestion.linkedGates[0] || 'G12',
      year: suggestion.year,
      qlvbGroup: effectiveGroup,
      industry: suggestion.industry,
    }});

    const proposedName =
      s.kind === 'FOLDER'
        ? proposedFolder.split('/').pop() || proposedFolder
        : buildFileNameByRule({{
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
          }});

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

    return {{
      id: `DL26-${{String(idx + 1).padStart(3, '0')}}`,
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
    }};
  }});
}}

export const REAL_DATA_LEGAL_2026_BATCH: AnalyzedFileItem[] = createRealDataLegalBatchItems();

export function getRealDataLegalBatch(
  project: ProjectArchetypeCode = 'KCN',
  group: QlvbNamingGroupCode = 'SSOT_9PART',
  preset: FolderNamingPresetCode = 'STAGE_GATE_ISO'
): AnalyzedFileItem[] {{
  return createRealDataLegalBatchItems(project, group, preset);
}}
"""

    with open(OUTPUT_TS, "w", encoding="utf-8") as f:
        f.write(ts_code)
    print(f"Generated TypeScript: {OUTPUT_TS}")

if __name__ == "__main__":
    main()
