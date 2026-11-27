"""
Bộ chuẩn hóa văn bản & thể thức Nghị định 30/2020/NĐ-CP (Phụ lục I)
dành cho OCR PDF Scan, bóc tách cấu trúc Chương/Mục/Điều/Khoản/Điểm
và tách khối Kết thúc (Thẩm quyền ký + Nơi nhận) khỏi Điều cuối cùng.
"""

from __future__ import annotations

import io
import re
import unicodedata
from typing import List, Tuple

from PIL import Image, ImageOps


def strip_red_stamp_pil(png_bytes: bytes) -> Image.Image:
    """
    Khử con dấu đỏ và chữ ký mực đỏ trên trang scan trước khi đưa vào Tesseract OCR,
    giữ nguyên 100% nét chữ đen pháp lý và tăng độ tương phản.
    """
    rgb = Image.open(io.BytesIO(png_bytes)).convert("RGB")
    try:
        import numpy as np

        arr = np.asarray(rgb, dtype=np.int16)
        red_mask = (
            (arr[:, :, 0] > 135)
            & ((arr[:, :, 0] - arr[:, :, 1]) > 32)
            & ((arr[:, :, 0] - arr[:, :, 2]) > 32)
        )
        gray = np.asarray(rgb.convert("L"), dtype=np.uint8).copy()
        gray[red_mask] = 255
        clean = Image.fromarray(gray, mode="L")
    except Exception:
        clean = rgb.convert("L")
    return ImageOps.autocontrast(clean, cutoff=1)


def normalize_nd30_ocr_text(raw_text: str) -> str:
    """
    Chuẩn hóa Unicode NFC và sửa các lỗi cơ học điển hình do OCR trên văn bản luật Việt Nam
    mà tuyệt đối không làm thay đổi con số điều/khoản, ngày tháng hay nội dung pháp lý gốc.
    """
    text = unicodedata.normalize("NFC", raw_text or "")
    text = (
        text.replace("\xa0", " ")
        .replace("\xad", "")
        .replace("\u200b", "")
        .replace("\ufeff", "")
    )
    text = re.sub(r"\r\n?", "\n", text)

    # Sửa lỗi OCR cơ học thuần túy trên ký hiệu quốc hiệu / tên chương / tên điều
    text = re.sub(r"\bQHI(\d{2})\b", r"QH\1", text)
    text = re.sub(r"\bĐiêu\s+(\d+[a-zA-Z]?)\b", r"Điều \1", text)
    text = re.sub(r"\bĐiêu\s+(này|khoản)\b", r"Điều \1", text)
    text = re.sub(r"\bchỉ\.phí\b", "chi phí", text, flags=re.IGNORECASE)
    text = re.sub(r"(?m)^(Chương)\s+I\s+H\b", r"\1 II", text)
    text = re.sub(r"(?m)^(Chương)\s+I\s+H\s+I\b", r"\1 III", text)
    text = re.sub(r"(?m)^(Chương)\s+V\s+[ỊI]I\b", r"\1 VII", text)
    text = re.sub(r"(?m)^(Chương)\s+V\s+[ỊI]\b", r"\1 VI", text)
    text = re.sub(r"(?m)^(Chương\s+[IVXLCDM\d]+\s*[:.\-]?\s*)[._\-—~]+", r"\1", text)
    text = re.sub(r"(?m)^(Mục\s+\d+\s*[:.\-]?\s*)[._\-—~]+", r"\1", text)
    text = re.sub(r"\s*—\]\s*", " ", text)

    # Dọn đường kẻ ngang / nhiễu con dấu đứng ngay trước số khoản ("1.", "2.")
    text = re.sub(r"(?m)^\s*[._\-—~]{2,}\s*(\d+\.\s)", r"\1", text)
    text = re.sub(r"(?<=[.;:])\s+[._—~]{1,}\s*(\d+\.\s+[A-ZÀ-ỸĐ])", r"\n\1", text)
    text = re.sub(r"(?<=[.;:])\s+(?=(?:[Kk]hoản\s+)?\d+\.\s+[A-ZÀ-ỸĐ])", "\n", text)

    # Giữ mỗi dòng Căn cứ trên một dòng sạch chuẩn NĐ 30/2020
    text = re.sub(r";\s+(?=Căn cứ\s+)", ";\n", text)

    cleaned_lines: List[str] = []
    for raw_ln in text.splitlines():
        ln = re.sub(r"[ \t]{2,}", " ", raw_ln).strip()
        if not ln:
            continue
        # Loại số trang đơn lẻ ("- 12 -", "12", "Trang 12/68")
        if re.match(r"^(?:[-–—~_.|]+\s*)?\d{1,4}(?:\s*[-–—~_.|]+)?$", ln):
            continue
        if re.match(r"^\[?Trang\s+\d+(?:\s*/\s*\d+)?\]?$", ln, re.IGNORECASE):
            continue
        # Bỏ dòng chỉ gồm dấu gạch chân / nhiễu viền
        if re.match(r"^[._\-—~=*/\\|<>^`'\"]+$", ln) and ln not in ("———",):
            continue
        cleaned_lines.append(ln)
    return "\n".join(cleaned_lines)


_CLOSING_MARKERS_RE = re.compile(
    r"(?:"
    r"Luật này được Quốc hội|"
    r"Nghị quyết này được Quốc hội|"
    r"Pháp lệnh này được Ủy ban thường vụ Quốc hội|"
    r"(?:^|(?<=[.?!])\s+)(?:"
    r"Nơi nhận\s*:|"
    r"TM\.\s*(?:CHÍNH PHỦ|ỦY BAN THƯỜNG VỤ QUỐC HỘI|HỘI ĐỒNG NHÂN DÂN|ỦY BAN NHÂN DÂN)|"
    r"KT\.\s*(?:THỦ TƯỚNG|BỘ TRƯỞNG|CHỦ TỊCH)"
    r")"
    r")",
    re.MULTILINE,
)


def clean_nd30_closing_text(closing_raw: str) -> str:
    """
    Làm sạch ký tự rác do con dấu đỏ đè lên phần Ký ban hành & Nơi nhận,
    đồng thời tách các dòng Nơi nhận ("- ...") về chuẩn gạch đầu dòng NĐ 30/2020.
    """
    s = unicodedata.normalize("NFC", closing_raw or "").strip()
    # Loại các cụm ký tự rác từ mực con dấu đỏ chồng lên chữ ký
    s = re.sub(r"[/⁄\\<>^`~ˆ*•=]{1,}[A-Za-z0-9\"'“”‘’.\-:;]*", " ", s)
    s = re.sub(r"\s+[“”‘’]+\s*", " ", s)
    # Tách Nơi nhận & từng dòng "- ..." xuống dòng rõ ràng
    s = re.sub(r"\s*(Nơi nhận\s*:)\s*", r"\n\1\n", s)
    s = re.sub(r";\s*-\s+", ";\n- ", s)
    s = re.sub(r"\s+-\s+(?=[A-ZÀ-ỸĐ]|HĐND|UBND|VPCP|Lưu\s*:)", "\n- ", s)
    lines = [re.sub(r"[ \t]{2,}", " ", ln).strip() for ln in s.splitlines()]
    clean_lines = [
        ln
        for ln in lines
        if ln and not re.match(r"^[^\wÀ-ỹĐđ]{2,}$", ln) and len(ln) >= 2
    ]
    return "\n".join(clean_lines)


def split_nd30_closing_block(article_content: str) -> Tuple[str, str]:
    """
    Tách phần Ký ban hành / Thông qua / Nơi nhận (Chuẩn NĐ 30/2020) khỏi nội dung Điều cuối cùng.
    Trả về: (noi_dung_dieu_sach, noi_dung_khoi_ket_thuc). Nếu không có khối kết thúc trả về (text, "").
    """
    txt = article_content or ""
    if not txt.strip():
        return txt, ""
    m = _CLOSING_MARKERS_RE.search(txt)
    if not m:
        return txt, ""
    idx = m.start()
    body = txt[:idx].rstrip(" \t\r\n/⁄\\")
    closing = clean_nd30_closing_text(txt[idx:])
    if not closing:
        return txt, ""
    return body, closing
