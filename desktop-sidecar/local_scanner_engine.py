import io
import os
import re
import json
import shutil
import hashlib
import threading
import zipfile
import unicodedata
import xml.etree.ElementTree as ET
from datetime import datetime
from typing import List, Optional, Dict, Any, Tuple

import fitz  # PyMuPDF
import cv2
import numpy as np
from PIL import Image
from fastapi import FastAPI, HTTPException, Body, Query
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# --- HỖ TRỢ ĐỌC WORD (.DOCX) ---
try:
    import docx  # python-docx
    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False

# --- TÍCH HỢP TESSERACT OCR (FALLBACK / PDF SCAN 250 DPI) ---
try:
    import pytesseract
    PYTESSERACT_AVAILABLE = True
    _default_tesseract_path = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    if os.path.exists(_default_tesseract_path):
        pytesseract.pytesseract.tesseract_cmd = _default_tesseract_path
except ImportError:
    PYTESSERACT_AVAILABLE = False

# --- TÍCH HỢP VIETOCR (OFFLINE TIẾNG VIỆT CHUẨN DẤU) ---
try:
    from vietocr.tool.predictor import Predictor
    from vietocr.tool.config import Cfg
    VIETOCR_AVAILABLE = True
except ImportError:
    VIETOCR_AVAILABLE = False

# --- TÍCH HỢP DOCLING (BÓC TÁCH BẢNG BIỂU & BỐ CỤC) ---
try:
    from docling.document_converter import DocumentConverter
    DOCLING_AVAILABLE = True
except ImportError:
    DOCLING_AVAILABLE = False

# --- TÍCH HỢP GEMINI VISION FALLBACK ---
try:
    from google import genai
    from google.genai import types
    GEMINI_SDK_AVAILABLE = True
except ImportError:
    GEMINI_SDK_AVAILABLE = False

# --- TÍCH HỢP NỀN TẢNG VBPL DATA FOUNDATION (6 TẦNG: BRONZE/SILVER/GOLD + SQLITE FTS5 + BA/BI) ---
import sys as _sys
_PARENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
for _cand in (_PARENT_DIR, os.path.join(_PARENT_DIR, "Legal_2026")):
    if os.path.isdir(os.path.join(_cand, "data_foundation")) and _cand not in _sys.path:
        _sys.path.insert(0, _cand)

try:
    from data_foundation.router import create_data_foundation_router
    DATA_FOUNDATION_AVAILABLE = True
except ImportError as _df_err:
    create_data_foundation_router = None
    DATA_FOUNDATION_AVAILABLE = False
    print(f"[INFO] VBPL Data Foundation chưa sẵn sàng: {_df_err}")

app = FastAPI(
    title="LEX-PMO OS v3.1 — Local PDF Scanner, Vietnamese OCR & Batch Rename Sidecar",
    description="Engine quét PDF scan tiếng Việt (OpenCV khử dấu đỏ + VietOCR + Docling + Gemini Vision Fallback), chuẩn hóa tên VBPL [SốHiệu]-[Năm]_[LoạiVB]-[CơQuan]_[LĩnhVực]_[TríchYếuNgắn][-PhụLục].[ext] & Smart Tags",
    version="3.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
AUDIT_LOG_FILE = os.path.join(BASE_DIR, "ssot_rename_audit_log.json")
CONFIDENCE_THRESHOLD = 0.78

# Khởi tạo VietOCR Engine (Lazy/Startup)
vn_ocr_predictor = None
if VIETOCR_AVAILABLE:
    try:
        config = Cfg.load_config_from_name('vgg_transformer')
        config['device'] = 'cpu'
        config['predictor']['beamsearch'] = False
        vn_ocr_predictor = Predictor(config)
    except Exception as e:
        print(f"[WARN] Không thể khởi tạo VietOCR offline: {e}")

# Khởi tạo Docling Converter
docling_converter = DocumentConverter() if DOCLING_AVAILABLE else None

# Khởi tạo Gemini Client (dùng làm Fallback khi ảnh scan quá mờ)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
gemini_client = genai.Client(api_key=GEMINI_API_KEY) if (GEMINI_SDK_AVAILABLE and GEMINI_API_KEY) else None


# ============================================================================
# 1. CÁC HÀM TIỀN XỬ LÝ ẢNH & OCR ĐA TẦNG TIẾNG VIỆT
# ============================================================================

def preprocess_remove_red_stamp(image_bytes: bytes) -> Image.Image:
    """
    Tách kênh màu đỏ (Red Channel) để loại bỏ con dấu mộc đỏ đè lên chữ đen,
    kết hợp Adaptive Thresholding giúp sắc nét dấu thanh tiếng Việt.
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img_bgr is None:
        raise ValueError("Không thể giải mã dữ liệu ảnh từ trang PDF")

    # Lấy kênh màu đỏ (index 2 trong BGR): mực đỏ trở nên sáng như nền trắng, chữ đen giữ nguyên độ tối
    _, _, red_channel = cv2.split(img_bgr)

    # Khử nhiễu nhẹ & nhị phân hóa thích nghi
    denoised = cv2.fastNlMeansDenoising(red_channel, None, h=10, templateWindowSize=7, searchWindowSize=21)
    clean_gray = cv2.adaptiveThreshold(
        denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 25, 15
    )
    return Image.fromarray(clean_gray)


def segment_text_lines_from_pil(pil_img: Image.Image) -> List[Image.Image]:
    """
    Cắt ảnh trang văn bản thành từng dòng ngang để đưa vào VietOCR đạt độ chính xác tối đa.
    """
    gray = np.array(pil_img.convert("L"))
    # Đảo ngược màu (chữ trắng nền đen) để tìm bounding box từng dòng
    inv = cv2.bitwise_not(gray)
    # Giãn nở theo chiều ngang để nối các chữ trong cùng một dòng
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (45, 3))
    dilated = cv2.dilate(inv, kernel, iterations=1)

    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    line_boxes = []
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        if w > 40 and h > 10:  # Lọc nhiễu chấm nhỏ
            line_boxes.append((y, x, w, h))

    # Sắp xếp từ trên xuống dưới
    line_boxes.sort(key=lambda b: b[0])
    line_images = []
    for y, x, w, h in line_boxes:
        pad = 4
        y1 = max(0, y - pad)
        y2 = min(pil_img.height, y + h + pad)
        x1 = max(0, x - pad)
        x2 = min(pil_img.width, x + w + pad)
        line_images.append(pil_img.crop((x1, y1, x2, y2)))

    return line_images


def call_gemini_vision_fallback(image_bytes: bytes) -> Tuple[str, Dict[str, Any]]:
    """
    Tầng 3 Fallback: Gọi Gemini 2.5 Flash Vision khi ảnh scan quá mờ nhòe hoặc VietOCR dưới ngưỡng tin cậy.
    """
    if not gemini_client:
        return "", {}

    prompt = (
        "Bạn là chuyên gia số hóa hồ sơ pháp lý và xây dựng Việt Nam. "
        "Hãy đọc chính xác nội dung tiếng Việt có dấu trong ảnh trang văn bản này (bỏ qua vết mờ hay con dấu đỏ đè lên chữ). "
        "Trả về JSON gồm: "
        "1) 'raw_text': toàn bộ văn bản đọc được; "
        "2) 'doc_type': mã loại (LUAT, NQ, ND, TT, QCVN, TCVN, VBHN, QD, TTr, HD, PLHD, BBNT, NKTC, BV); "
        "3) 'doc_number': số hiệu văn bản (vd: 135/2025/QH15); "
        "4) 'issue_year': năm ban hành (số nguyên); "
        "5) 'summary': trích yếu ngắn gọn tiếng Việt có dấu."
    )

    try:
        response = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type="image/png"),
                prompt
            ],
            config=types.GenerateContentConfig(response_mime_type="application/json")
        )
        parsed = json.loads(response.text)
        return parsed.get("raw_text", ""), parsed
    except Exception as e:
        print(f"[WARN] Gemini Vision Fallback thất bại: {e}")
        return "", {}


def extract_text_hybrid_pipeline(pdf_path: str, extract_full_tables: bool = False) -> Dict[str, Any]:
    """
    Pipeline trích xuất văn bản thông minh 4 tầng:
    Text gốc -> OpenCV khử dấu đỏ + VietOCR -> Docling (nếu cần bảng biểu) -> Gemini Vision Fallback.
    """
    doc = fitz.open(pdf_path)
    if len(doc) == 0:
        return {"text": "", "engine_used": "EMPTY", "confidence": 0.0, "ai_metadata": {}}

    first_page = doc[0]
    native_text = first_page.get_text("text").strip()

    # Tầng 0: PDF có sẵn text chuẩn
    if len(native_text) >= 60:
        full_text = "\n".join([p.get_text("text") for p in doc[:3]])
        return {
            "text": full_text,
            "engine_used": "PYMUPDF_NATIVE",
            "confidence": 1.0,
            "ai_metadata": {}
        }

    # Tầng 1 + 2: PDF Scan dạng ảnh -> Khử dấu đỏ + VietOCR vùng đầu trang (55% trên trang 1)
    clip_rect = fitz.Rect(0, 0, first_page.rect.width, first_page.rect.height * 0.55)
    pix = first_page.get_pixmap(dpi=300, clip=clip_rect)
    raw_png_bytes = pix.tobytes("png")

    ocr_lines_text = []
    avg_confidence = 0.0

    if vn_ocr_predictor is not None:
        try:
            clean_pil = preprocess_remove_red_stamp(raw_png_bytes)
            line_imgs = segment_text_lines_from_pil(clean_pil)
            confidences = []
            for l_img in line_imgs[:25]:  # Đọc tối đa 25 dòng đầu trang
                text_line, prob = vn_ocr_predictor.predict(l_img, return_prob=True)
                if text_line.strip():
                    ocr_lines_text.append(text_line.strip())
                    confidences.append(float(prob))
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
        except Exception as e:
            print(f"[WARN] Lỗi xử lý VietOCR: {e}")

    combined_vietocr_text = "\n".join(ocr_lines_text)

    # Tầng 2B: Nếu yêu cầu bóc tách toàn bộ bảng biểu (dùng Docling)
    if extract_full_tables and docling_converter is not None:
        try:
            result = docling_converter.convert(pdf_path)
            md_content = result.document.export_to_markdown()
            return {
                "text": md_content,
                "engine_used": "DOCLING_TABLE_OCR",
                "confidence": max(avg_confidence, 0.85),
                "ai_metadata": {}
            }
        except Exception as e:
            print(f"[WARN] Docling fallback về VietOCR: {e}")

    # Kiểm tra ngưỡng tin cậy: Nếu VietOCR đạt chuẩn -> Trả về ngay (100% Offline, bảo mật tuyệt đối)
    if avg_confidence >= CONFIDENCE_THRESHOLD and len(combined_vietocr_text) >= 30:
        return {
            "text": combined_vietocr_text,
            "engine_used": "VIETOCR_OPENCV_OFFLINE",
            "confidence": round(avg_confidence, 3),
            "ai_metadata": {}
        }

    # Tầng 3: Fallback sang Gemini 2.5 Flash Vision nếu ảnh scan quá mờ nhòe
    if gemini_client is not None:
        vision_text, ai_meta = call_gemini_vision_fallback(raw_png_bytes)
        if vision_text:
            return {
                "text": vision_text,
                "engine_used": "GEMINI_2.5_FLASH_VISION_FALLBACK",
                "confidence": 0.96,
                "ai_metadata": ai_meta
            }

    return {
        "text": combined_vietocr_text,
        "engine_used": "VIETOCR_LOW_CONFIDENCE",
        "confidence": round(avg_confidence, 3),
        "ai_metadata": {}
    }


def _extract_docx_full_text(file_path: str) -> Tuple[str, int]:
    """Đọc toàn vẹn cả đoạn văn (<w:p>) và bảng biểu (<w:tbl>) theo đúng thứ tự DOM trong .docx."""
    if DOCX_AVAILABLE:
        doc = docx.Document(file_path)
        w_ns = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
        blocks: List[str] = []
        para_idx = 0
        tbl_idx = 0
        for child in doc.element.body:
            tag = child.tag
            if tag == f"{w_ns}p" and para_idx < len(doc.paragraphs):
                txt = doc.paragraphs[para_idx].text.strip()
                para_idx += 1
                if txt:
                    blocks.append(txt)
            elif tag == f"{w_ns}tbl" and tbl_idx < len(doc.tables):
                tbl = doc.tables[tbl_idx]
                tbl_idx += 1
                for row in tbl.rows:
                    cells = [re.sub(r"\s+", " ", c.text).strip() for c in row.cells]
                    if any(cells):
                        blocks.append(" | ".join(cells))
            elif tag == f"{w_ns}p":
                para_idx += 1
            elif tag == f"{w_ns}tbl":
                tbl_idx += 1
        full_text = "\n".join(blocks)
        total_pages = max(1, len(blocks) // 30 + 1)
        return full_text, total_pages

    blocks_xml: List[str] = []
    with zipfile.ZipFile(file_path, "r") as zf:
        xml_bytes = zf.read("word/document.xml")
    root = ET.fromstring(xml_bytes)
    w_ns = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
    body = root.find(f"{w_ns}body") or root
    for child in body:
        if child.tag == f"{w_ns}p":
            texts = [t_el.text for t_el in child.iter(f"{w_ns}t") if t_el.text]
            line = "".join(texts).strip()
            if line:
                blocks_xml.append(line)
        elif child.tag == f"{w_ns}tbl":
            for tr in child.iter(f"{w_ns}tr"):
                row_cells: List[str] = []
                for tc in tr.iter(f"{w_ns}tc"):
                    cell_txt = " ".join(
                        "".join(t.text or "" for t in p.iter(f"{w_ns}t")).strip()
                        for p in tc.iter(f"{w_ns}p")
                    ).strip()
                    row_cells.append(re.sub(r"\s+", " ", cell_txt))
                if any(row_cells):
                    blocks_xml.append(" | ".join(row_cells))
    full_text = "\n".join(blocks_xml)
    return full_text, max(1, len(full_text.splitlines()) // 30 + 1)


class LegalDocumentParser:
    def __init__(self, min_chars_per_page: int = 150):
        self.min_chars_per_page = min_chars_per_page

    def extract_raw_text(self, file_path: str) -> Dict[str, Any]:
        """Bước 1: Trích xuất text thô từ DOCX hoặc PDF (tự động OCR nếu là file scan)."""
        ext = file_path.lower().rsplit(".", 1)[-1] if "." in file_path else ""

        if ext == "docx":
            full_text, total_pages = _extract_docx_full_text(file_path)
            return {
                "source_type": "DOCX_NATIVE",
                "ocr_applied": False,
                "total_pages": total_pages,
                "raw_text": self._clean_page_noise(full_text),
            }

        if ext == "pdf":
            with fitz.open(file_path) as doc:
                total_pages = len(doc)
                if total_pages == 0:
                    return {
                        "source_type": "PDF_NATIVE",
                        "ocr_applied": False,
                        "total_pages": 0,
                        "raw_text": "",
                    }

                sample_pages = min(3, total_pages)
                sample_text = "".join([doc[i].get_text("text").strip() for i in range(sample_pages)])

                # Kiểm tra mật độ chữ để phát hiện PDF Scan / Lỗi lớp text
                avg_chars = len(sample_text) / max(1, sample_pages)
                is_scan = avg_chars < self.min_chars_per_page

                pages_text = []
                for page_num in range(total_pages):
                    page = doc[page_num]
                    if not is_scan:
                        text = page.get_text("text")
                    else:
                        text = self._ocr_scan_page(page, page_num)

                    # Làm sạch header/footer số trang rác
                    cleaned_page = self._clean_page_noise(text)
                    if cleaned_page:
                        pages_text.append(cleaned_page)

            return {
                "source_type": "PDF_OCR" if is_scan else "PDF_NATIVE",
                "ocr_applied": is_scan,
                "total_pages": total_pages,
                "raw_text": "\n".join(pages_text),
            }

        raise ValueError(f"Định dạng file .{ext} chưa được hỗ trợ. Vui lòng dùng .pdf hoặc .docx")

    def _ocr_scan_page(self, page: Any, page_num: int) -> str:
        """Render trang PDF thành ảnh 250 DPI, khử con dấu đỏ và chạy OCR tiếng Việt chuẩn NĐ 30/2020."""
        pix = page.get_pixmap(dpi=250)
        png_bytes = pix.tobytes("png")
        clean_pil = preprocess_remove_red_stamp(png_bytes)

        if PYTESSERACT_AVAILABLE:
            try:
                txt = pytesseract.image_to_string(clean_pil, lang="vie", config="--psm 6")
                if txt and txt.strip():
                    return txt
            except Exception as e:
                print(f"[WARN] Tesseract OCR fallback trang {page_num + 1}: {e}")

        if vn_ocr_predictor is not None:
            try:
                line_imgs = segment_text_lines_from_pil(clean_pil)
                ocr_lines = []
                for l_img in line_imgs:
                    text_line = str(vn_ocr_predictor.predict(l_img)).strip()
                    if text_line:
                        ocr_lines.append(text_line)
                if ocr_lines:
                    return "\n".join(ocr_lines)
            except Exception as e:
                print(f"[WARN] VietOCR lỗi trang {page_num + 1}: {e}")

        if gemini_client is not None and page_num < 3:
            vision_text, _ = call_gemini_vision_fallback(png_bytes)
            if vision_text:
                return vision_text

        return ""

    def _clean_page_noise(self, text: str) -> str:
        """Chuẩn hóa khoảng trắng/NFC và loại bỏ các dòng số trang đơn lẻ hoặc ký tự rác."""
        lines = text.split("\n")
        cleaned = []
        for line in lines:
            s = unicodedata.normalize("NFC", line)
            s = re.sub(r"[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]", " ", s)
            s = re.sub(r"[\u200b-\u200d\ufeff]", "", s).strip()
            # Bỏ qua dòng chỉ có số trang (VD: "1", "- 2 -", "– 2 –", "Trang 1/89", "[Trang 1/89]")
            if re.match(r"^(?:[-–—\u00ad\u2212]\s*)?\d+(?:\s*[-–—\u00ad\u2212])?$", s) or re.match(
                r"^\[?Trang\s+\d+(?:\s*/\s*\d+)?\]?$", s, re.IGNORECASE
            ):
                continue
            if s:
                cleaned.append(s)
        return "\n".join(cleaned)

    def parse_structure(self, raw_text: str) -> Dict[str, Any]:
        """Bước 2: Phân rã cấu trúc chuẩn Nghị định 30/2020/NĐ-CP cho Cột 3."""
        lines = self._clean_page_noise(raw_text or "").split("\n") if raw_text else []

        # Regex neo chặt đầu dòng
        re_chuong = re.compile(r"^(Chương\s+[IVXLCDM\d]+)\s*[:.\-]?\s*(.*)$", re.IGNORECASE)
        re_muc = re.compile(r"^(Mục\s+\d+)\s*[:.\-]?\s*(.*)$", re.IGNORECASE)
        re_dieu = re.compile(r"^(Điều\s+\d+[a-zA-Z]?)\s*[:.]\s*(.*)$", re.IGNORECASE)
        re_khoan = re.compile(r"^(\d+)\.\s+(.*)$")
        re_diem = re.compile(r"^([a-zđ])\)\s+(.*)$", re.IGNORECASE)

        chapters = []
        articles = []
        legal_nodes: List[Dict[str, Any]] = []

        # Khởi tạo node Lời mở đầu / Căn cứ ban hành
        preamble_lines: List[str] = []
        current_chapter = {"code": "CHUONG_0", "title": "Căn cứ ban hành · Lời mở đầu"}
        current_article: Optional[Dict[str, Any]] = None
        current_node: Optional[Dict[str, Any]] = None

        stats = {"chapters": 0, "articles": 0, "clauses": 0}

        def flush_article() -> None:
            nonlocal current_article, current_node
            if current_article is not None:
                articles.append(current_article)
                if current_node is not None:
                    current_node["content"] = "\n".join(
                        b["text"] for b in current_article["content_blocks"]
                    )
                    current_node["clauseCount"] = max(
                        current_article["clauses_count"],
                        1 if current_article["content_blocks"] else 0,
                    )
                    legal_nodes.append(current_node)
                current_article = None
                current_node = None

        for line in lines:
            if not line:
                continue

            # 1. Kiểm tra cấp CHƯƠNG
            m_chuong = re_chuong.match(line)
            if m_chuong:
                flush_article()
                stats["chapters"] += 1
                chap_code = m_chuong.group(1).strip()
                chap_sub = m_chuong.group(2).strip()
                current_chapter = {
                    "code": chap_code.upper(),
                    "title": f"{chap_code}: {chap_sub}".strip(": "),
                }
                chapters.append(current_chapter)
                legal_nodes.append({
                    "id": f"AUTO-{len(legal_nodes) + 1}",
                    "level": "Chương",
                    "code": chap_code,
                    "title": chap_sub or line,
                    "clauseCount": 0,
                    "content": "",
                })
                continue

            # 1b. Kiểm tra cấp MỤC
            m_muc = re_muc.match(line)
            if m_muc:
                flush_article()
                sec_code = m_muc.group(1).strip()
                sec_title = m_muc.group(2).strip()
                legal_nodes.append({
                    "id": f"AUTO-{len(legal_nodes) + 1}",
                    "level": "Mục",
                    "code": sec_code,
                    "title": sec_title or line,
                    "clauseCount": 0,
                    "content": "",
                })
                continue

            # 2. Kiểm tra cấp ĐIỀU
            m_dieu = re_dieu.match(line)
            if m_dieu:
                flush_article()
                stats["articles"] += 1
                art_code = m_dieu.group(1).strip()
                art_title = m_dieu.group(2).strip()
                current_article = {
                    "id": f"dieu_{stats['articles']}",
                    "chapter": current_chapter["title"],
                    "article_number": art_code,
                    "title": art_title,
                    "full_heading": line,
                    "content_blocks": [],
                    "clauses_count": 0,
                }
                current_node = {
                    "id": f"AUTO-{len(legal_nodes) + 1}",
                    "level": "Điều",
                    "code": art_code,
                    "title": art_title or line,
                    "clauseCount": 0,
                    "content": "",
                }
                continue

            # 3. Nội dung bên trong (Trước Điều 1 -> Căn cứ; Sau Điều 1 -> Nội dung Điều)
            if current_article is None:
                preamble_lines.append(line)
            else:
                m_khoan = re_khoan.match(line)
                m_diem = re_diem.match(line)

                if m_khoan:
                    stats["clauses"] += 1
                    current_article["clauses_count"] += 1
                    current_article["content_blocks"].append({
                        "type": "clause",
                        "index": m_khoan.group(1),
                        "text": line,
                    })
                elif m_diem:
                    stats["clauses"] += 1
                    current_article["clauses_count"] += 1
                    current_article["content_blocks"].append({
                        "type": "point",
                        "index": m_diem.group(1).lower(),
                        "text": line,
                    })
                else:
                    # Nối dòng văn bản bị ngắt xuống dòng trong PDF
                    if current_article["content_blocks"]:
                        current_article["content_blocks"][-1]["text"] += " " + line
                    else:
                        current_article["content_blocks"].append({
                            "type": "paragraph",
                            "index": "0",
                            "text": line,
                        })

        # Đẩy Điều cuối cùng vào mảng
        flush_article()

        # Đưa Căn cứ ban hành lên đầu danh sách hiển thị Cột 3
        preamble_text = "\n".join(preamble_lines)
        preamble_node = {
            "id": "preamble",
            "chapter": "Mở đầu",
            "article_number": "Căn cứ",
            "title": "Căn cứ ban hành · Lời mở đầu",
            "full_heading": "Căn cứ ban hành · Lời mở đầu",
            "content_blocks": [{"type": "paragraph", "index": "0", "text": preamble_text}]
            if preamble_lines
            else [],
            "clauses_count": len(preamble_lines),
        }

        if preamble_lines:
            legal_nodes.insert(0, {
                "id": "AUTO-0",
                "level": "Mở đầu",
                "code": "Căn cứ ban hành · Lời mở đầu",
                "title": "",
                "clauseCount": len(preamble_lines),
                "content": preamble_text,
            })

        return {
            "stats": {
                "chapters": max(1, stats["chapters"]),
                "articles": stats["articles"],
                "clauses": stats["clauses"],
            },
            "toc": [preamble_node] + articles,
            "chapters": chapters,
            "legal_nodes": legal_nodes,
        }


parser = LegalDocumentParser()


# ============================================================================
# 2. CHUẨN HÓA TÊN 2 LỚP SSOT (5 THÀNH PHẦN VBPL / 7 THÀNH PHẦN HSDA) & 3 TRỤC
# ============================================================================

LEGAL_STANDARD_DOC_TYPES = {"LUAT", "NQ", "ND", "TT", "QCVN", "TCVN", "VBHN"}
PROJECT_DOSSIER_DOC_TYPES = {"QD", "TTr", "HD", "PLHD", "BBNT", "NKTC", "BV"}

_LEADING_SSOT_PREFIX_RE = re.compile(
    r"^(?:[0-9A-Za-z-]+-\d{4}_[A-Za-z0-9]+-[A-Za-z0-9]+_[A-Z0-9]+_|"
    r"[0-9A-Za-z-]+-\d{4}_(?:LUAT|NQ|ND|TT|QCVN|TCVN|VBHN|QD|TTR|HD|PLHD|BBNT|NKTC|BV|CV)_[A-Z0-9]+_|"
    r"(?:XD|BDS|TC|DN)_[A-Z]+_[A-Z]+_[0-9A-Z-]+_\d{4}_[A-Z]+_|"
    r"(?:[A-Z_]+_G\d{1,2}_)?(?:LUAT|NQ|ND|TT|QCVN|TCVN|VBHN|QD|TTR|HD|PLHD|BBNT|NKTC|BV|CV)_\d{4}-[0-9A-Za-z-]+_[A-Z]+_)",
    re.IGNORECASE,
)
_LEADING_DOC_TYPE_RE = re.compile(
    r"^(?:van ban hop nhat|vbhn(?:\s*-\s*[a-z0-9]+)?|bo luat(?=\s+(?:so\b|\d|qh\d*|ve\b))|"
    r"luat(?=\s+(?:so\b|\d|qh\d*|-\s*qh\d*))|luat-\s*qh\d*|"
    r"nghi quyet|nq(?:\s*-\s*[a-z0-9]+)?|nghi dinh|nd-cp|nd(?:\s*-\s*[a-z0-9]+)?|"
    r"thong tu lien tich|thong tu|tt-[a-z0-9]+|tt|"
    r"quy chuan ky thuat quoc gia|quy chuan ky thuat|quy chuan|qcvn(?:\s*-\s*[a-z0-9]+)?|"
    r"tieu chuan quoc gia|tieu chuan|tcvn(?:\s*-\s*[a-z0-9]+)?|quyet dinh|qd(?:\s*-\s*[a-z0-9]+)?|to trinh|ttr(?:\s*-\s*[a-z0-9]+)?|"
    r"phu luc hop dong|plhd|hop dong thi cong xay dung cong trinh|hop dong thi cong xay dung|"
    r"hop dong thi cong|hop dong xay dung|hop dong|hdxd|hd|"
    r"bien ban nghiem thu cong viec xay dung|bien ban nghiem thu|bien ban|bbnt(?:\s*-\s*[a-z0-9]+)?|"
    r"nhat ky thi cong xay dung cong trinh|nhat ky thi cong|nktc|"
    r"ho so thiet ke ban ve thi cong|ban ve thiet ke ban ve thi cong|"
    r"ban ve tkbvtc|ban ve thiet ke|ban ve|tkbvtc|bv|cong van|cv)\b[\s:.,/-]*",
    re.IGNORECASE,
)
_LEADING_DOC_NUMBER_RE = re.compile(
    r"^(?:so\b[\s:.,/-]*)?(?:\d{1,5}(?:[/_:-]\d{1,4})+(?:[/_:-][a-z0-9]+){0,3}|\d{1,5}(?:\s*-\s*[a-z0-9]+)+)\b[\s:.,/-]*",
    re.IGNORECASE,
)
_LEADING_BARE_NUMBER_RE = re.compile(r"^(?:so\b[\s:.,/-]*)?\d{1,5}\b[\s:.,/-]*", re.IGNORECASE)
_LEADING_ISSUER_CODE_RE = re.compile(
    r"^(?:qh\d*|cp|nd-cp|ttg|bxd|bkhdt|btc|bca|bct|btnmt|bnnmt|bkhcn|ubnd|bqlkkt|bqlkcn|sxd|cdt|bqlda|tvgs|tvtk|nttc)\b[\s:.,/-]*",
    re.IGNORECASE,
)
_LEADING_DOMAIN_CODE_RE = re.compile(
    r"^(?:hdxd|qlcl|qlcp|qlhd|vlxd|dth|tqt|pccc|qhdd|atld|dtu)\b[\s:.,/-]*",
    re.IGNORECASE,
)
_LEADING_FILLER_PHRASE_RE = re.compile(
    r"^(?:cua chinh phu|cua quoc hoi|cua bo xay dung|cua bo tai chinh|cua thu tuong chinh phu|cua ubnd|"
    r"nam\s+(?:19|20)\d{2}|ngay\s+\d{1,2}(?:\s+thang\s+\d{1,2}\s+nam\s+\d{4}|/\d{1,2}/\d{4})|"
    r"ban hanh quy chuan ky thuat quoc gia ve|ban hanh quy dinh ve|ban hanh|"
    r"quy dinh chi tiet thi hanh mot so dieu cua|quy dinh chi tiet mot so dieu va bien phap thi hanh|"
    r"quy dinh chi tiet mot so dieu cua|quy dinh chi tiet ve|quy dinh chi tiet|quy dinh ve|quy dinh|"
    r"huong dan thi hanh|huong dan chi tiet ve|huong dan ve|huong dan|ve viec|v/v|vv|ve)\b[\s:.,/-]*",
    re.IGNORECASE,
)
_TRAILING_DOC_NUM_SUFFIX_RE = re.compile(
    r"[\s,;-]+(?:so\s+\d{1,5}(?:[/_:-][a-z0-9-]+)*|(?!1/(?:50|100|200|250|500|1000|2000|2500|5000|10000)$)\d{1,5}(?:[/_:-](?:19|20)\d{2}(?:[/_:-][a-z0-9-]+)*|(?:[/_:-][a-z][a-z0-9-]*)+))$",
    re.IGNORECASE,
)


def remove_vn_tones(text: str) -> str:
    if not text:
        return ""
    s = unicodedata.normalize("NFD", text)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return s.replace("đ", "d").replace("Đ", "D")


def normalize_ssot_doc_type(doc_type: str) -> str:
    raw = (doc_type or "").strip()
    if not raw:
        return "ND"
    upper = raw.upper()
    if upper == "TTR":
        return "TTr"
    return upper


def is_project_dossier_doc_type(doc_type: str) -> bool:
    return normalize_ssot_doc_type(doc_type) in PROJECT_DOSSIER_DOC_TYPES


def infer_default_gate(doc_type: str, domain: str, explicit_gate: Optional[str] = None) -> str:
    if explicit_gate and explicit_gate.strip():
        return explicit_gate.strip().upper()
    norm = normalize_ssot_doc_type(doc_type)
    if norm in ("HD", "PLHD"):
        return "G11"
    if norm in ("BBNT", "NKTC", "BV"):
        return "G12"
    if norm == "QD":
        return {
            "DTH": "G10",
            "QLCP": "G9",
            "DTU": "G0",
            "QHDD": "G3",
            "PCCC": "G6",
            "TQT": "G15",
        }.get(domain, "G12")
    if norm == "TTr":
        return {"QLHD": "G11", "QLCP": "G9", "TQT": "G14"}.get(domain, "G12")
    return "G12"


def clean_doc_number(raw_num: str, issue_year: Optional[int] = None) -> str:
    if not raw_num:
        return "00"
    s = re.sub(r"^\[\d{4}\][_\s-]*", "", remove_vn_tones(str(raw_num)).strip())
    s = s.split("/")[0].split(":")[0].strip()
    s = re.sub(r"^(?:19|20)\d{2}[-_\s]+", "", s)
    s = re.sub(r"[-_](?:19|20)\d{2}(?:[-_].*)?$", "", s, flags=re.IGNORECASE)
    s = re.sub(
        r"[-_](?:LUAT|NQ|ND|TT|QCVN|TCVN|VBHN|QD|TTR|HD|PLHD|BBNT|NKTC|BV|CP|QH\d*|BXD|BTC|BQLDA|TVGS|CDT)(?:[-_].*)?$",
        "",
        s,
        flags=re.IGNORECASE,
    )
    if issue_year:
        y = str(issue_year)
        if len(y) == 4:
            s = re.sub(rf"^{y}[-_]?", "", s)
            s = re.sub(rf"[-_]?{y}$", "", s)
    alnum = re.sub(r"[^a-zA-Z0-9]", "", s)
    return alnum or "00"


def strip_redundant_summary_prefix(text: str) -> str:
    if not text:
        return ""
    without_bracket_year = re.sub(r"^\[\d{4}\][_\s-]*", "", text.strip())
    without_ssot = _LEADING_SSOT_PREFIX_RE.sub("", without_bracket_year)
    base = re.sub(r"\s+", " ", remove_vn_tones(without_ssot).replace("_", " ")).strip()
    if not base:
        return ""

    s = base
    had_doc_or_num = False
    for _ in range(8):
        before = s
        if _LEADING_DOC_NUMBER_RE.match(s):
            s = _LEADING_DOC_NUMBER_RE.sub("", s).strip()
            had_doc_or_num = True
        if _LEADING_DOC_TYPE_RE.match(s):
            s = _LEADING_DOC_TYPE_RE.sub("", s).strip()
            had_doc_or_num = True
        if _LEADING_DOC_NUMBER_RE.match(s):
            s = _LEADING_DOC_NUMBER_RE.sub("", s).strip()
            had_doc_or_num = True
        elif had_doc_or_num and _LEADING_BARE_NUMBER_RE.match(s):
            s = _LEADING_BARE_NUMBER_RE.sub("", s).strip()
        if had_doc_or_num and _LEADING_ISSUER_CODE_RE.match(s):
            s = _LEADING_ISSUER_CODE_RE.sub("", s).strip()
        if _LEADING_DOMAIN_CODE_RE.match(s):
            s = _LEADING_DOMAIN_CODE_RE.sub("", s).strip()
        if _LEADING_FILLER_PHRASE_RE.match(s):
            s = _LEADING_FILLER_PHRASE_RE.sub("", s).strip()
        if s == before:
            break

    if re.match(r"^bh\s+bao\s+hiem\b", s, flags=re.IGNORECASE):
        s = re.sub(r"^bh\s+", "", s, flags=re.IGNORECASE).strip()
    elif re.match(r"^bh\b", s, flags=re.IGNORECASE):
        s = re.sub(r"^bh\b", "Bao hiem", s, flags=re.IGNORECASE).strip()

    s = _TRAILING_DOC_NUM_SUFFIX_RE.sub("", s).strip()

    remaining_alnum = re.sub(r"[^a-zA-Z0-9]", "", s)
    return s if len(remaining_alnum) >= 3 else base


def to_pascal_case_vn(text: str, max_len: int = 40) -> str:
    stripped = strip_redundant_summary_prefix(text)
    cleaned = re.sub(r"[^a-zA-Z0-9\s]", " ", stripped or remove_vn_tones(text))
    words = []
    for w in cleaned.split():
        if not w:
            continue
        has_lower = any(c.islower() for c in w)
        has_internal_upper = any(c.isupper() for c in w[1:])
        if has_lower and has_internal_upper:
            words.append(w[0].upper() + w[1:])
        else:
            words.append(w.capitalize())
    joined = "".join(words)
    return joined[:max_len] if joined else "TaiLieuChuaPhanLoai"


SSOT_FILENAME_RULE_RE = re.compile(
    r"^[0-9A-Za-z]+(?:-[0-9A-Za-z]+)*-\d{4}_[A-Za-z0-9]+-[A-Za-z0-9]+_(?:HDXD|QLCL|QLHD|QLCP|VLXD|DTH|TQT|PCCC|QHDD|ATLD|DTU)_[A-Za-z0-9]+(?:-[A-Za-z0-9_-]+)?\.[a-z0-9]+$",
    re.IGNORECASE,
)


def validate_ssot_filename(file_name: str) -> bool:
    return bool(SSOT_FILENAME_RULE_RE.match((file_name or "").strip()))


def default_issuer_for_doc_type(doc_type: str) -> str:
    norm = normalize_ssot_doc_type(doc_type)
    if norm in ("LUAT", "NQ"):
        return "QH15"
    if norm == "ND":
        return "CP"
    if norm in ("TT", "VBHN", "QCVN"):
        return "BXD"
    if norm == "TCVN":
        return "BKHCN"
    if norm == "QD":
        return "UBND"
    if norm == "BBNT":
        return "TVGS"
    if norm in ("HD", "PLHD"):
        return "CDT"
    if norm == "TTr":
        return "BQLDA"
    if norm == "BV":
        return "TVTK"
    if norm == "NKTC":
        return "NTTC"
    return "CP"


def normalize_issuer_code(raw_issuer: str, doc_type: str = "ND") -> str:
    cleaned = re.sub(r"^(?:ND|TT|QD|LUAT|NQ|VBHN|QCVN|TCVN)[-_]", "", remove_vn_tones(raw_issuer or "").upper())
    cleaned = re.sub(r"[^A-Z0-9]", "", cleaned)
    if not cleaned:
        return default_issuer_for_doc_type(doc_type)
    if cleaned == "TTG":
        return "TTg"
    if cleaned == "BNNMT":
        return "BTNMT"
    if cleaned == "BQLKCN":
        return "BQLKKT"
    if cleaned == "QH" and normalize_ssot_doc_type(doc_type) == "LUAT":
        return "QH15"
    return cleaned


def normalize_domain_for_filename(domain: str) -> str:
    d = (domain or "HDXD").strip().upper()
    if d in ("QCVN", "TCVN", ""):
        return "HDXD"
    return d


def detect_issuer_from_file_and_text(
    base_name: str,
    extracted_text: str,
    doc_type: str,
    raw_number: str = "",
) -> str:
    base_upper = remove_vn_tones(base_name or "").upper()
    num_upper = remove_vn_tones(raw_number or "").upper()
    scope = f"{num_upper}\n{base_upper}"

    suffix_match = re.search(
        r"(?:LUAT|NQ|ND|TT|VBHN|QD|QCVN|TCVN|\d{1,5}(?:[/_:-]\d{4})?)[/_:-](QH\d{2}|CP|TTG|BXD|BTC|BKHDT|BCA|BCT|BTNMT|BNNMT|BKHCN|UBNDHN|UBND|BQLKKT|BQLKCN|SXD|CHQ)\b",
        scope,
    )
    if suffix_match:
        return normalize_issuer_code(suffix_match.group(1), doc_type)

    explicit_match = re.search(
        r"\b(QH15|QH14|BKHDT|BQLKKT|BQLKCN|BKHCN|BTNMT|BNNMT|BTC|BXD|BCA|BCT|UBNDHN|UBND|TTG|CHQ)\b",
        scope,
    )
    if explicit_match:
        return normalize_issuer_code(explicit_match.group(1), doc_type)

    top_lines = remove_vn_tones("\n".join((extracted_text or "").splitlines()[:12])).upper()
    if re.search(r"\bQUOC HOI\b", top_lines):
        return "QH14" if "QH14" in top_lines else "QH15"
    if re.search(r"\bCHINH PHU\b", top_lines):
        return "CP"
    if re.search(r"\bTHU TUONG\b", top_lines):
        return "TTg"
    if re.search(r"\bBO TAI CHINH\b", top_lines):
        return "BTC"
    if re.search(r"\bBO XAY DUNG\b", top_lines):
        return "BXD"
    if re.search(r"\bBO KE HOACH\b", top_lines):
        return "BKHDT"
    if re.search(r"\bBO CONG AN\b", top_lines):
        return "BCA"
    if re.search(r"\bBO CONG THUONG\b", top_lines):
        return "BCT"
    if re.search(r"\bBO TAI NGUYEN\b|\bBO NONG NGHIEP VA MOI TRUONG\b", top_lines):
        return "BTNMT"
    if re.search(r"\bBO KHOA HOC\b", top_lines):
        return "BKHCN"
    if re.search(r"\bUY BAN NHAN DAN HA NOI\b|\bUBND\s+TP\s*HA NOI\b|\bUBNDHN\b", top_lines):
        return "UBNDHN"
    if re.search(r"\bUY BAN NHAN DAN\b|\bUBND\b", top_lines):
        return "UBND"
    if re.search(r"\bCUC HAI QUAN\b|\bTONG CUC HAI QUAN\b", top_lines):
        return "CHQ"
    if re.search(r"\bTU VAN GIAM SAT\b", top_lines):
        return "TVGS"
    if re.search(r"\bTU VAN THIET KE\b", top_lines):
        return "TVTK"
    if re.search(r"\bCHU DAU TU\b", top_lines):
        return "CDT"

    return default_issuer_for_doc_type(doc_type)


def build_ssot_2layer_filename(
    doc_type: str,
    issue_year: int,
    doc_number: str,
    domain: str,
    summary_raw: str,
    ext: str = "pdf",
    project_code: str = "KCN",
    gate_code: Optional[str] = None,
    appendix_suffix: str = "",
    issuer: str = "CP",
) -> str:
    """
    Sinh tên file VBPL thống nhất (không ngoại lệ):
    [SốHiệu]-[Năm]_[LoạiVB]-[CơQuan]_[LĩnhVực]_[TríchYếuNgắn][-PhụLục].[ext]
    """
    canonical_type = normalize_ssot_doc_type(doc_type)
    issuer_clean = normalize_issuer_code(issuer, canonical_type)
    domain_clean = normalize_domain_for_filename(domain)
    year_str = str(issue_year or datetime.now().year)
    num_clean = clean_doc_number(doc_number, int(year_str) if year_str.isdigit() else None)
    summary_40 = to_pascal_case_vn(summary_raw, max_len=40)
    ext_clean = (ext or "pdf").lstrip(".").lower()
    suffix_clean = (appendix_suffix or "").strip().lstrip("-")
    suffix_part = f"-{suffix_clean}" if suffix_clean else ""

    return f"{num_clean}-{year_str}_{canonical_type}-{issuer_clean}_{domain_clean}_{summary_40}{suffix_part}.{ext_clean}"


def build_suggested_tags(
    domain: str,
    project_axes: List[str],
    gate_code: str,
) -> List[Dict[str, str]]:
    industry_map = {
        "TQT": ("TC", "Ngành: Tài chính - Kế toán (TC)"),
        "DTU": ("BDS", "Ngành: Đầu tư KCN & BĐS (BDS)"),
        "ATLD": ("DN", "Ngành: Quản trị Doanh nghiệp (DN)"),
    }
    sub_sector_map = {
        "DTH": ("XD_DAUTHAU", "LV con: Đấu thầu"),
        "DTU": ("DN_DTU", "LV con: Đầu tư Hạ tầng KCN · KKT · FTZ"),
        "TQT": ("KT_QT", "LV con: Kiểm toán & Quyết toán vốn đầu tư"),
        "PCCC": ("TTHC_LIENTHONG", "LV con: Thủ tục hành chính - liên thông"),
        "ATLD": ("LD_ATLD", "LV con: An toàn vệ sinh lao động xây dựng"),
    }
    ind_code, ind_label = industry_map.get(domain, ("XD", "Ngành: Xây dựng (XD)"))
    sub_code, sub_label = sub_sector_map.get(domain, ("XD_XAYDUNG", "LV con: Xây dựng"))
    gate = (gate_code or "G12").strip().upper()

    tags = [
        {"category": "INDUSTRY", "code": ind_code, "label": ind_label, "status": "SUGGESTED"},
        {"category": "SUB_SECTOR", "code": sub_code, "label": sub_label, "status": "SUGGESTED"},
    ]
    for ax in (project_axes or [])[:2]:
        tags.append({"category": "PROJECT_AXIS", "code": ax, "label": f"DA: {ax}", "status": "SUGGESTED"})
    tags.append({"category": "STAGE_GATE", "code": gate, "label": f"Gate {gate}", "status": "SUGGESTED"})
    return tags


def compute_sha256(file_path: str) -> str:
    sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            sha256.update(chunk)
    return sha256.hexdigest()


_DOC_TYPE_MATCHERS = [
    ("VBHN", re.compile(r"^(?:VAN BAN HOP NHAT|VBHN)\b"), re.compile(r"VAN BAN HOP NHAT|\bVBHN\b")),
    ("NKTC", re.compile(r"^(?:NHAT KY THI CONG|NKTC)\b"), re.compile(r"\bNHAT KY THI CONG\b|\bNKTC\b")),
    ("BBNT", re.compile(r"^(?:BIEN BAN NGHIEM THU|BBNT)\b"), re.compile(r"\bBIEN BAN NGHIEM THU\b|\bBBNT\b")),
    ("BV", re.compile(r"^(?:HO SO THIET KE|BAN VE|TKBVTC|TKCS|TKKT)\b"), re.compile(r"\bTKBVTC\b|\bBAN VE\b|\bTKCS\b|\bTKKT\b|\bHOAN CONG\b|\bBV\b")),
    ("TTr", re.compile(r"^(?:TO TRINH|TTR)\b"), re.compile(r"\bTO TRINH\b|\bTTR\b")),
    ("PLHD", re.compile(r"^(?:PHU LUC HOP DONG|PLHD)\b"), re.compile(r"\bPHU LUC HOP DONG\b|\bPLHD\b")),
    ("HD", re.compile(r"^HOP DONG\b"), re.compile(r"\bHOP DONG\b|\bHDXD\b|\bHD-TCXD\b|\bHD\b")),
    ("QD", re.compile(r"^QUYET DINH\b"), re.compile(r"\bQUYET DINH\b|\bQD\b")),
    ("QCVN", re.compile(r"^(?:QCVN|QUY CHUAN KY THUAT)\b"), re.compile(r"\bQCVN\b|QUY CHUAN KY THUAT")),
    ("TCVN", re.compile(r"^(?:TCVN|TIEU CHUAN QUOC GIA)\b"), re.compile(r"\bTCVN\b|TIEU CHUAN QUOC GIA")),
    ("NQ", re.compile(r"^NGHI QUYET\b"), re.compile(r"\bNGHI QUYET\b|\bNQ\b")),
    ("ND", re.compile(r"^NGHI DINH\b"), re.compile(r"\bNGHI DINH\b|ND-CP|ND_CP|\bND\b")),
    ("TT", re.compile(r"^THONG TU\b"), re.compile(r"\bTHONG TU\b|TT-[A-Z]+|\bTT\b")),
    ("LUAT", re.compile(r"^(?:BO\s+)?LUAT\b"), re.compile(r"\bLUAT\b|QH15|QH14")),
]


def classify_3_axes_and_9_parts(
    filename: str,
    extracted: Dict[str, Any],
    project_code: str = "KCN",
    default_gate: Optional[str] = None,
) -> Dict[str, Any]:
    text = extracted.get("text", "")
    ai_meta = extracted.get("ai_metadata", {})
    base_name, raw_ext = os.path.splitext(filename)
    ext = raw_ext.lstrip(".").lower() or "pdf"

    base_upper_notone = remove_vn_tones(base_name).upper()
    base_upper_tokens = base_upper_notone.replace("_", " ")
    combined_upper_notone = remove_vn_tones(f"{base_name}\n{text[:2500]}").upper()
    header_lines = [
        remove_vn_tones(line).strip().upper()
        for line in text.splitlines()[:12]
        if line.strip()
    ]

    # 1. Xác định Loại văn bản / Loại hồ sơ
    ai_doc_type = ai_meta.get("doc_type")
    doc_type = normalize_ssot_doc_type(ai_doc_type) if ai_doc_type else ""
    if not doc_type or doc_type == "TL":
        matched_type = ""
        for line in header_lines:
            for code, heading_re, _ in _DOC_TYPE_MATCHERS:
                if heading_re.search(line):
                    matched_type = code
                    break
            if matched_type:
                break

        if not matched_type:
            best_idx = 10**9
            for code, _, general_re in _DOC_TYPE_MATCHERS:
                m = general_re.search(base_upper_tokens)
                if m and m.start() < best_idx:
                    best_idx = m.start()
                    matched_type = code

        if not matched_type:
            for code, _, general_re in _DOC_TYPE_MATCHERS:
                if general_re.search(combined_upper_notone):
                    matched_type = code
                    break

        doc_type = matched_type or "ND"

    # 2. Xác định Số hiệu, Năm & Cơ quan ban hành
    raw_doc_number = ai_meta.get("doc_number")
    if not raw_doc_number:
        num_match = re.search(r"Số[:\s]*([0-9A-Za-z\-/:]+)", text, re.IGNORECASE)
        if num_match:
            raw_doc_number = num_match.group(1)
        else:
            base_no_year_prefix = re.sub(r"^\[\d{4}\][_\s-]*", "", base_upper_notone)
            file_num_match = re.search(
                r"(\b[A-Za-z]{1,4}\d{1,4}[-/][A-Za-z]{1,4}\d{1,4}\b)|(\d{1,4}[/:-](?:\d{4}[/:-])?[a-zA-Z]+)|(\b\d{1,4}\b)",
                base_no_year_prefix,
            )
            candidate_num = file_num_match.group(0) if file_num_match else ""
            if candidate_num and not re.match(r"^(?:19|20)\d{2}$", candidate_num):
                raw_doc_number = candidate_num
            else:
                non_year = next(
                    (n for n in re.findall(r"\b(\d{1,4})\b", base_no_year_prefix) if not re.match(r"^(?:19|20)\d{2}$", n)),
                    None,
                )
                raw_doc_number = non_year or "01"

    year_match = re.search(r"\b(199\d|20[0-3]\d)\b", f"{raw_doc_number} {base_name} {text[:400]}")
    issue_year = int(ai_meta.get("issue_year") or (year_match.group(1) if year_match else datetime.now().year))
    doc_number = clean_doc_number(str(raw_doc_number), issue_year)
    issuer = ai_meta.get("issuer") or detect_issuer_from_file_and_text(
        base_name, text, doc_type, str(raw_doc_number)
    )

    # 3. Xác định Lĩnh vực chuyên môn (11 Mã Lĩnh vực chuẩn, không gán QCVN/TCVN làm Lĩnh vực)
    domain_rules = [
        ("PCCC", 10, ["PCCC", "PHONG CHAY", "CHUA CHAY", "AN TOAN CHAY", "CHONG CHAY", "THOAT NAN"]),
        ("VLXD", 9, ["VLXD", "VAT LIEU XAY DUNG", "VAT LIEU", "HOP CHUAN", "HOP QUY", "LAS-XD", "CO/CQ"]),
        ("QLCL", 9, ["QLCL", "CHAT LUONG", "NGHIEM THU", "NHAT KY THI CONG", "HOAN CONG", "BAO TRI"]),
        ("QLCP", 8, ["QLCP", "CHI PHI", "DU TOAN", "DINH MUC", "DON GIA", "TONG MUC DAU TU"]),
        ("QLHD", 8, ["QLHD", "HOP DONG", "PHU LUC HOP DONG", "TAM UNG", "DIEU CHINH GIA", "PHAT SINH"]),
        ("DTH", 8, ["DTH", "DAU THAU", "LUA CHON NHA THAU", "MOI THAU", "HSMT"]),
        ("TQT", 8, ["TQT", "QUYET TOAN", "KIEM TOAN", "THANH QUYET TOAN"]),
        ("QHDD", 8, ["QHDD", "QUY HOACH", "DAT DAI", "GIAI PHONG MAT BANG", "1/500"]),
        ("ATLD", 8, ["ATLD", "AN TOAN LAO DONG", "VE SINH LAO DONG", "DANH GIA TAC DONG MOI TRUONG"]),
        ("DTU", 8, ["DTU", "CHU TRUONG DAU TU", "KHU CONG NGHIEP", "CUM CONG NGHIEP", "THUONG MAI TU DO", "PPP"]),
        ("HDXD", 7, ["HDXD", "HOAT DONG XAY DUNG", "HOAT DONG DAU TU XAY DUNG", "BAO HIEM", "QUAN LY DU AN", "LUAT XAY DUNG", "THAM DINH", "BAN VE THI CONG", "TKBVTC", "KET CAU", "GIAY PHEP XAY DUNG", "KHOI CONG"]),
    ]
    domain = "HDXD"
    best_score = -1
    for code, weight, kws in domain_rules:
        hits = sum(1 for kw in kws if kw in combined_upper_notone)
        if hits > 0 and hits * weight > best_score:
            best_score = hits * weight
            domain = code

    detected_axes: List[str] = []
    if re.search(r"KHU CONG NGHIEP|\bKCN\b|KHU KINH TE", combined_upper_notone):
        detected_axes.append("KCN")
    if re.search(r"CUM CONG NGHIEP|\bCCN\b", combined_upper_notone):
        detected_axes.append("CCN")
    if re.search(r"THUONG MAI TU DO|\bFTZ\b|LOGISTICS", combined_upper_notone):
        detected_axes.append("FTZ")
    if re.search(r"PPP|\bBOT\b|DOI TAC CONG TU", combined_upper_notone):
        detected_axes.append("PPP_BT")
    if re.search(r"HA TANG KY THUAT|GIAO THONG|CAP THOAT NUOC", combined_upper_notone):
        detected_axes.append("HTKT")
    if re.search(r"DAN DUNG|CHUNG CU|KHU DO THI|NHA O", combined_upper_notone):
        detected_axes.append("DAN_DUNG")

    # 4. Tạo Trích yếu PascalCase (cắt từ lặp thừa, tối đa 40 ký tự) & Sinh tên VBPL thống nhất
    summary_raw = ai_meta.get("summary") or base_name
    appendix_suffix = ai_meta.get("appendix_suffix") or ""
    gate_code = infer_default_gate(doc_type, domain, default_gate)
    ssot_name = build_ssot_2layer_filename(
        doc_type=doc_type,
        issue_year=issue_year,
        doc_number=doc_number,
        domain=domain,
        summary_raw=summary_raw,
        ext=ext,
        project_code=project_code,
        gate_code=gate_code,
        appendix_suffix=appendix_suffix,
        issuer=issuer,
    )
    naming_layer = "UNIFIED_VBPL"
    suggested_tags = build_suggested_tags(domain=domain, project_axes=detected_axes, gate_code=gate_code)

    return {
        "doc_type": doc_type,
        "issuer": issuer,
        "doc_number": doc_number,
        "issue_year": issue_year,
        "domain": domain,
        "gate_code": gate_code,
        "project_code": detected_axes[0] if detected_axes else None,
        "naming_layer": naming_layer,
        "is_valid_ssot_name": validate_ssot_filename(ssot_name),
        "suggested_tags": suggested_tags,
        "summary_pascal": to_pascal_case_vn(summary_raw, max_len=40),
        "suggested_ssot_name": ssot_name,
        "ocr_engine": extracted.get("engine_used"),
        "ocr_confidence": extracted.get("confidence"),
    }


# ============================================================================
# 3. API ENDPOINTS (CỔNG :8008)
# ============================================================================

class ScanFolderRequest(BaseModel):
    folder_path: str
    extract_tables: bool = False
    recursive: bool = True
    max_files: int = 300
    project_code: str = "KCN"
    gate_code: Optional[str] = None

class ScanFileRequest(BaseModel):
    file_path: Optional[str] = None
    fileName: Optional[str] = None
    relativePath: Optional[str] = None
    sizeBytes: Optional[int] = None
    raw_text: Optional[str] = None
    project_code: str = "KCN"
    gate_code: Optional[str] = None

class RenameItem(BaseModel):
    old_path: str
    new_name: str

class BatchRenameRequest(BaseModel):
    items: List[RenameItem]


@app.get("/api/local/health")
def local_health_check():
    return {
        "status": "online",
        "service": "LEX-PMO-LOCAL-SCANNER-V3.1",
        "capabilities": {
            "legal_document_parser": True,
            "data_foundation_v1": DATA_FOUNDATION_AVAILABLE,
            "python_docx": DOCX_AVAILABLE,
            "pytesseract_ocr": PYTESSERACT_AVAILABLE,
            "vietocr_offline": vn_ocr_predictor is not None,
            "docling_tables": docling_converter is not None,
            "gemini_vision_fallback": gemini_client is not None,
            "secure_stream_pdf": True
        }
    }


@app.get("/api/local/stream-pdf")
def local_stream_pdf(
    file_name: str = Query(..., description="Tên tệp PDF an toàn cần xem"),
):
    """
    Stream tài liệu PDF an toàn, chống path traversal, không để lộ cấu trúc thư mục Google Drive.
    """
    safe_name = os.path.basename(file_name)
    if ".." in safe_name or not safe_name.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Tên tệp không hợp lệ hoặc không phải định dạng PDF")

    candidate_roots = [
        r"G:\My Drive\02_KNOWLEDGE_LIBRARY\01_Quan_tri_Doanh_nghiep\Phap_che\Data_Legal_2026",
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".local_data", "vbpl", "02_silver", "curated_files"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".local_data", "vbpl", "01_bronze", "raw_files"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".local_data", "vbpl"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data"),
    ]

    target_path = None
    lower_safe = safe_name.lower()
    for root in candidate_roots:
        if not os.path.exists(root):
            continue
        p = os.path.join(root, safe_name)
        if os.path.isfile(p):
            target_path = p
            break
        try:
            for walk_root, _, files in os.walk(root):
                for item in files:
                    if item.lower() == lower_safe or item.lower().endswith(f"_{lower_safe}"):
                        target_path = os.path.join(walk_root, item)
                        break
                if target_path:
                    break
            if target_path:
                break
        except Exception:
            pass

    if not target_path or not os.path.isfile(target_path):
        raise HTTPException(status_code=404, detail=f"Không tìm thấy tệp PDF '{safe_name}' trong kho an toàn")

    return FileResponse(
        path=target_path,
        media_type="application/pdf",
        filename=safe_name,
        headers={
            "Content-Disposition": f"inline; filename=\"{safe_name}\"",
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "private, max-age=3600",
        },
    )


_WORD_COM_LOCK = threading.Lock()


def _find_safe_office_file(file_name: str, folder: Optional[str] = None) -> Optional[str]:
    if not file_name or ".." in file_name or "/" in file_name or "\\" in file_name:
        return None
    safe_name = os.path.basename(file_name)
    lower_safe = safe_name.lower()
    if not (lower_safe.endswith(".docx") or lower_safe.endswith(".doc")):
        return None

    candidate_roots = [
        r"G:\My Drive\02_KNOWLEDGE_LIBRARY\01_Quan_tri_Doanh_nghiep\Phap_che\Data_Legal_2026",
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".local_data", "vbpl", "02_silver", "curated_files"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".local_data", "vbpl", "01_bronze", "raw_files"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".local_data", "vbpl"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data"),
    ]
    for root in candidate_roots:
        if not os.path.exists(root):
            continue
        if folder:
            if ".." in folder or "/" in folder or "\\" in folder:
                return None
            sub_dir = os.path.join(root, folder)
            if os.path.isdir(sub_dir):
                for item in os.listdir(sub_dir):
                    if item.lower() == lower_safe and os.path.isfile(os.path.join(sub_dir, item)):
                        return os.path.join(sub_dir, item)
            continue
        for walk_root, _, files in os.walk(root):
            for item in files:
                if item.lower() == lower_safe or item.lower().endswith(f"_{lower_safe}"):
                    return os.path.join(walk_root, item)
    return None


def convert_doc_to_cached_docx(source_doc_path: str, cache_dir: str) -> Optional[str]:
    """Chuyển đổi .doc (Word 97-2003) -> .docx chỉ đọc vào 06_preview_cache/{sha256}.docx qua Word COM."""
    if not os.path.isfile(source_doc_path):
        return None
    sha = compute_sha256(source_doc_path)
    os.makedirs(cache_dir, exist_ok=True)
    target_docx = os.path.join(cache_dir, f"{sha}.docx")
    if os.path.isfile(target_docx):
        return target_docx

    try:
        import pythoncom  # type: ignore
        import win32com.client  # type: ignore
    except ImportError:
        return None

    tmp_docx = os.path.join(cache_dir, f".tmp_{sha[:12]}.docx")
    with _WORD_COM_LOCK:
        if os.path.isfile(target_docx):
            return target_docx
        pythoncom.CoInitialize()
        word_app = None
        doc_obj = None
        try:
            word_app = win32com.client.DispatchEx("Word.Application")
            word_app.Visible = False
            word_app.DisplayAlerts = 0
            doc_obj = word_app.Documents.Open(
                os.path.abspath(source_doc_path),
                ConfirmConversions=False,
                ReadOnly=True,
                AddToRecentFiles=False,
            )
            doc_obj.SaveAs2(os.path.abspath(tmp_docx), FileFormat=16)  # wdFormatXMLDocument
        finally:
            if doc_obj is not None:
                try:
                    doc_obj.Close(False)
                except Exception:
                    pass
            if word_app is not None:
                try:
                    word_app.Quit()
                except Exception:
                    pass
            pythoncom.CoUninitialize()

        if os.path.isfile(tmp_docx):
            os.replace(tmp_docx, target_docx)
            return target_docx
    return None


@app.get("/api/local/convert-doc-cache")
def local_convert_doc_cache(
    file: str = Query(..., description="Tên file .doc"),
    folder: Optional[str] = Query(default=None),
):
    src_path = _find_safe_office_file(file, folder)
    if not src_path:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy tệp '{file}'")
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    cache_dir = os.path.join(repo_root, ".local_data", "vbpl", "06_preview_cache")
    if src_path.lower().endswith(".docx"):
        return {"ok": True, "cache_ready": True, "ext": ".docx"}
    cached = convert_doc_to_cached_docx(src_path, cache_dir)
    return {"ok": bool(cached), "cache_ready": bool(cached), "ext": ".doc"}


@app.get("/api/local/preview-docx")
def local_preview_docx(
    file: str = Query(..., description="Tên file .docx/.doc"),
    folder: Optional[str] = Query(default=None),
):
    src_path = _find_safe_office_file(file, folder)
    if not src_path:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy tệp '{file}'")
    target_path = src_path
    if src_path.lower().endswith(".doc"):
        repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        cache_dir = os.path.join(repo_root, ".local_data", "vbpl", "06_preview_cache")
        cached = convert_doc_to_cached_docx(src_path, cache_dir)
        if not cached:
            raise HTTPException(status_code=422, detail="Không thể chuyển đổi tệp .doc trên máy trạm")
        target_path = cached
    full_text, total_pages = _extract_docx_full_text(target_path)
    return {
        "ok": True,
        "fileName": os.path.basename(src_path),
        "totalPages": total_pages,
        "plainText": full_text,
    }


@app.post("/api/scan-file")
@app.post("/api/local/scan-file")
def scan_legal_file(
    file_path: Optional[str] = Query(default=None),
    req: Optional[ScanFileRequest] = Body(default=None),
):
    resolved_path = file_path or (req.file_path if req else None) or (req.relativePath if req else None)
    if resolved_path and os.path.isfile(resolved_path):
        try:
            extracted = parser.extract_raw_text(resolved_path)
        except ValueError as ve:
            raise HTTPException(status_code=400, detail=str(ve))

        structured = parser.parse_structure(extracted["raw_text"])
        fname = (req.fileName if req and req.fileName else None) or os.path.basename(resolved_path)
        file_hash = compute_sha256(resolved_path)
        classified = classify_3_axes_and_9_parts(
            fname,
            {
                "text": extracted["raw_text"],
                "engine_used": extracted["source_type"],
                "confidence": 0.90 if extracted["ocr_applied"] else 0.99,
                "ai_metadata": {},
            },
            project_code=(req.project_code if req else "KCN"),
            default_gate=(req.gate_code if req else None),
        )
        return {
            "status": "SUCCESS",
            "meta": {
                "source_type": extracted["source_type"],
                "ocr_applied": extracted["ocr_applied"],
                "total_pages": extracted["total_pages"],
                **structured["stats"],
            },
            "sections": structured["toc"],
            "legal_nodes": structured["legal_nodes"],
            "raw_text": extracted["raw_text"],
            "extractedText": extracted["raw_text"],
            "sha256": file_hash,
            "ocrConfidence": round(classified.get("ocr_confidence", 0.96) * 100),
            **classified,
        }

    if req and req.raw_text:
        structured = parser.parse_structure(req.raw_text)
        return {
            "status": "SUCCESS",
            "meta": {
                "source_type": "RAW_TEXT",
                "ocr_applied": False,
                "total_pages": 1,
                **structured["stats"],
            },
            "sections": structured["toc"],
            "legal_nodes": structured["legal_nodes"],
            "raw_text": req.raw_text,
            "extractedText": req.raw_text,
        }

    raise HTTPException(
        status_code=404,
        detail="Không tìm thấy tệp tại đường dẫn file_path hoặc không có raw_text đầu vào",
    )


@app.post("/api/local/scan-folder")
def scan_local_folder(req: ScanFolderRequest):
    if not os.path.isdir(req.folder_path):
        raise HTTPException(status_code=400, detail="Đường dẫn thư mục không tồn tại trên ổ cứng")

    results = []
    seen_hashes = {}
    scanned_paths: List[Tuple[str, str, str]] = []

    if req.recursive:
        for walk_root, dirs, files in os.walk(req.folder_path):
            dirs.sort()
            for fname in sorted(files):
                if fname.startswith("~$"):
                    continue
                lower_name = fname.lower()
                if not (lower_name.endswith(".pdf") or lower_name.endswith(".docx")):
                    continue
                rel_dir = os.path.relpath(walk_root, req.folder_path)
                rel_folder = "" if rel_dir == "." else rel_dir.replace("\\", "/")
                scanned_paths.append((fname, os.path.join(walk_root, fname), rel_folder))
                if len(scanned_paths) >= max(1, min(1000, req.max_files)):
                    break
            if len(scanned_paths) >= max(1, min(1000, req.max_files)):
                break
    else:
        for fname in sorted(os.listdir(req.folder_path)):
            if fname.startswith("~$"):
                continue
            lower_name = fname.lower()
            if not (lower_name.endswith(".pdf") or lower_name.endswith(".docx")):
                continue
            full_path = os.path.join(req.folder_path, fname)
            if os.path.isfile(full_path):
                scanned_paths.append((fname, full_path, ""))
            if len(scanned_paths) >= max(1, min(1000, req.max_files)):
                break

    for fname, full_path, rel_folder in scanned_paths:
        lower_name = fname.lower()
        file_hash = compute_sha256(full_path)
        is_duplicate = file_hash in seen_hashes
        seen_hashes.setdefault(file_hash, fname)

        if lower_name.endswith(".pdf") and req.extract_tables and docling_converter is not None:
            extracted_hybrid = extract_text_hybrid_pipeline(full_path, extract_full_tables=True)
            raw_text = extracted_hybrid.get("text", "")
            structured = parser.parse_structure(raw_text)
            parser_meta = {
                "source_type": extracted_hybrid.get("engine_used", "DOCLING_TABLE_OCR"),
                "ocr_applied": True,
                "total_pages": 1,
                **structured["stats"],
            }
        else:
            parsed_doc = parser.extract_raw_text(full_path)
            raw_text = parsed_doc["raw_text"]
            structured = parser.parse_structure(raw_text)
            extracted_hybrid = {
                "text": raw_text,
                "engine_used": parsed_doc["source_type"],
                "confidence": 0.90 if parsed_doc["ocr_applied"] else 0.99,
                "ai_metadata": {},
            }
            parser_meta = {
                "source_type": parsed_doc["source_type"],
                "ocr_applied": parsed_doc["ocr_applied"],
                "total_pages": parsed_doc["total_pages"],
                **structured["stats"],
            }

        classified = classify_3_axes_and_9_parts(
            fname,
            extracted_hybrid,
            project_code=req.project_code,
            default_gate=req.gate_code,
        )

        results.append({
            "original_name": fname,
            "relative_folder": rel_folder,
            "full_path": full_path,
            "sha256": file_hash,
            "is_duplicate": is_duplicate,
            "duplicate_of": seen_hashes[file_hash] if is_duplicate else None,
            "preview_text": raw_text[:500],
            "meta": parser_meta,
            "legal_nodes": structured["legal_nodes"],
            **classified
        })

    return {"total_files": len(results), "files": results}


@app.post("/api/local/batch-rename")
def batch_rename_with_audit(req: BatchRenameRequest):
    if DATA_FOUNDATION_AVAILABLE:
        from pathlib import Path
        from data_foundation.contracts import DEFAULT_DATA_LAKE_ROOT
        from data_foundation.vault_manager import execute_batch_operation
        from data_foundation.warehouse_sqlite import VbplWarehouseSQLite

        lake_root = Path(DEFAULT_DATA_LAKE_ROOT)
        warehouse = VbplWarehouseSQLite(lake_root / "04_warehouse" / "vbpl_warehouse.sqlite")
        items = [
            {
                "item_kind": "FILE",
                "source_path": it.old_path,
                "original_name": os.path.basename(it.old_path),
                "ssot_file_name": it.new_name,
            }
            for it in req.items
        ]
        try:
            res = execute_batch_operation(
                warehouse=warehouse,
                lake_root=lake_root,
                items=items,
                operation_mode="INPLACE_RENAME",
            )
            return {
                "status": "success",
                "batch_id": res["batch_id"],
                "renamed_count": res["file_ops_count"],
                "vault_saved_count": res["vault_saved_count"],
            }
        except PermissionError as exc:
            raise HTTPException(status_code=403, detail=str(exc))
        except FileNotFoundError as exc:
            raise HTTPException(status_code=404, detail=str(exc))
        except RuntimeError as exc:
            raise HTTPException(status_code=409, detail=str(exc))

    batch_id = datetime.now().strftime("BATCH_%Y%m%d_%H%M%S")
    operations = []
    for item in req.items:
        if not os.path.exists(item.old_path):
            continue
        folder = os.path.dirname(item.old_path)
        new_path = os.path.join(folder, item.new_name)
        if os.path.exists(new_path) and item.old_path != new_path:
            continue
        shutil.move(item.old_path, new_path)
        operations.append({"old_path": item.old_path, "new_path": new_path})
    return {"status": "success", "batch_id": batch_id, "renamed_count": len(operations)}


@app.post("/api/local/undo-last-rename")
def undo_last_rename():
    if DATA_FOUNDATION_AVAILABLE:
        from pathlib import Path
        from data_foundation.contracts import DEFAULT_DATA_LAKE_ROOT
        from data_foundation.vault_manager import undo_operations
        from data_foundation.warehouse_sqlite import VbplWarehouseSQLite

        lake_root = Path(DEFAULT_DATA_LAKE_ROOT)
        warehouse = VbplWarehouseSQLite(lake_root / "04_warehouse" / "vbpl_warehouse.sqlite")
        try:
            res = undo_operations(warehouse=warehouse, lake_root=lake_root)
            return {
                "status": "reverted",
                "restored_count": res["reverted_count"],
                "reverted_op_ids": res["reverted_op_ids"],
            }
        except ValueError as exc:
            raise HTTPException(status_code=404, detail=str(exc))
        except RuntimeError as exc:
            raise HTTPException(status_code=409, detail=str(exc))

    raise HTTPException(status_code=404, detail="Không có lịch sử đổi tên để hoàn tác")


if DATA_FOUNDATION_AVAILABLE and create_data_foundation_router is not None:
    app.include_router(
        create_data_foundation_router(
            extract_fn=parser.extract_raw_text,
            classify_fn=classify_3_axes_and_9_parts,
            parse_structure_fn=parser.parse_structure,
        )
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8008)