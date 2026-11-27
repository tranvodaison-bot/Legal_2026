"""
Binary Vault & ACID Rename Manager cho nền tảng VBPL Data Foundation (Single-User).
- Bảo vệ bất biến bản gốc tại `01_bronze/raw_files/{sha256_16}_{safe_original_name}`.
- Hỗ trợ 2 chế độ an toàn:
  1) `COPY_TO_SILVER` (mặc định): copy sang `02_silver/curated_files/{domain}/{year}/{ssot_file_name}`.
  2) `INPLACE_RENAME`: đổi tên trực tiếp tại thư mục nguồn theo giao dịch All-or-Nothing có Undo ACID.
  3) `METADATA_ONLY`: ghi log thao tác khi tệp được nạp từ trình duyệt không có đường dẫn vật lý.
- Khóa cứng Lằn ranh đỏ: chặn tuyệt đối `INPLACE_RENAME` lên kho chỉ đọc `Data_Legal_2026`.
"""

from __future__ import annotations

import hashlib
import os
import re
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from .contracts import normalize_domain_code

DEFAULT_PROTECTED_ROOTS = [
    r"G:\My Drive\02_KNOWLEDGE_LIBRARY\01_Quan_tri_Doanh_nghiep\Phap_che\Data_Legal_2026",
]


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _get_protected_roots() -> List[str]:
    roots = list(DEFAULT_PROTECTED_ROOTS)
    extra = (os.getenv("LEX_PROTECTED_ROOTS") or "").strip()
    if extra:
        for part in extra.split(";"):
            p = part.strip()
            if p:
                roots.append(p)
    return roots


def _norm_win_path(p: str) -> str:
    try:
        resolved = os.path.realpath(p)
    except Exception:
        resolved = os.path.abspath(p)
    return os.path.normcase(os.path.normpath(resolved))


def is_protected_path(target_path: str) -> bool:
    """Kiểm tra đường dẫn có nằm trong kho chỉ-đọc được bảo vệ (vd Data_Legal_2026) hay không."""
    if not target_path:
        return False
    norm_target = _norm_win_path(target_path)
    for root in _get_protected_roots():
        norm_root = _norm_win_path(root)
        if norm_target == norm_root or norm_target.startswith(norm_root + os.sep):
            return True
    return False


def compute_file_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return h.hexdigest().lower()


def _sanitize_filename(name: str, max_len: int = 160) -> str:
    cleaned = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", (name or "document.pdf").strip())
    cleaned = cleaned.strip(" .") or "document.pdf"
    if len(cleaned) <= max_len:
        return cleaned
    stem, ext = os.path.splitext(cleaned)
    keep = max(12, max_len - len(ext))
    return f"{stem[:keep]}{ext}"


def store_in_bronze_vault(source_path: Path, lake_root: Path, sha256: Optional[str] = None) -> str:
    """
    Lưu bản sao nhị phân bất biến vào `01_bronze/raw_files/{sha256_16}_{safe_original_name}`.
    Nếu đã tồn tại file trùng prefix và trùng SHA-256 -> tái sử dụng (dedup vật lý).
    Trả về đường dẫn tương đối tính từ `lake_root` (dùng `/` chuẩn POSIX).
    """
    src = Path(source_path)
    if not src.is_file():
        raise FileNotFoundError(f"Không tìm thấy tệp nguồn để lưu Vault: {src}")

    file_sha = (sha256 or "").strip().lower()
    if not re.match(r"^[0-9a-f]{64}$", file_sha):
        file_sha = compute_file_sha256(src)

    vault_dir = Path(lake_root) / "01_bronze" / "raw_files"
    vault_dir.mkdir(parents=True, exist_ok=True)

    safe_orig = _sanitize_filename(src.name, max_len=140)
    prefix = f"{file_sha[:16]}_"

    # Tái sử dụng nếu đã lưu cùng SHA-256
    for existing in vault_dir.glob(f"{prefix}*"):
        if existing.is_file() and compute_file_sha256(existing) == file_sha:
            return existing.relative_to(Path(lake_root)).as_posix()

    target = vault_dir / f"{prefix}{safe_orig}"
    if not target.exists():
        tmp_path = vault_dir / f".tmp_{uuid.uuid4().hex[:10]}_{safe_orig}"
        try:
            shutil.copy2(str(src), str(tmp_path))
            os.replace(str(tmp_path), str(target))
        finally:
            if tmp_path.exists():
                try:
                    tmp_path.unlink()
                except OSError:
                    pass

    return target.relative_to(Path(lake_root)).as_posix()


def execute_batch_operation(
    *,
    warehouse: Any,
    lake_root: Path,
    items: List[Dict[str, Any]],
    operation_mode: str = "COPY_TO_SILVER",
    actor_name: str = "Single User (CĐT)",
) -> Dict[str, Any]:
    """
    Thực thi lưu Binary Vault + Copy/Rename ACID theo 3 chế độ:
      - COPY_TO_SILVER (mặc định, an toàn tuyệt đối)
      - INPLACE_RENAME (giao dịch All-or-Nothing + chặn Data_Legal_2026)
      - METADATA_ONLY (khi file không có source_path vật lý)
    """
    mode = (operation_mode or "COPY_TO_SILVER").strip().upper()
    if mode not in ("COPY_TO_SILVER", "INPLACE_RENAME", "METADATA_ONLY"):
        raise ValueError(f"Chế độ operation_mode không hợp lệ: {mode}")

    batch_id = datetime.now().strftime("BATCH_%Y%m%d_%H%M%S_%f")
    created_at = _utc_now_iso()
    lake_root = Path(lake_root)

    # Pre-flight validation cho chế độ INPLACE_RENAME
    if mode == "INPLACE_RENAME":
        planned_targets: set[str] = set()
        for it in items:
            src_str = str(it.get("source_path") or "").strip()
            if not src_str:
                continue
            if is_protected_path(src_str):
                raise PermissionError(
                    f"Lằn ranh đỏ: Cấm đổi tên trực tiếp (INPLACE_RENAME) trên kho chỉ-đọc được bảo vệ: {src_str}. "
                    "Hãy dùng chế độ COPY_TO_SILVER."
                )
            src_p = Path(src_str)
            if not src_p.exists():
                raise FileNotFoundError(f"Không tìm thấy tệp/thư mục nguồn: {src_str}")
            new_name = _sanitize_filename(str(it.get("ssot_file_name") or src_p.name))
            dst_p = src_p.parent / new_name
            norm_dst = _norm_win_path(str(dst_p))
            norm_src = _norm_win_path(str(src_p))
            if norm_dst in planned_targets:
                raise RuntimeError(f"Xung đột đích trùng tên trong cùng lô: {dst_p}")
            if dst_p.exists() and norm_dst != norm_src:
                raise RuntimeError(f"Tệp đích đã tồn tại, hủy lô để bảo toàn dữ liệu: {dst_p}")
            planned_targets.add(norm_dst)

    moved_pairs: List[tuple[Path, Path]] = []
    op_rows: List[Dict[str, Any]] = []
    enriched_items: List[Dict[str, Any]] = []

    try:
        for idx, raw_it in enumerate(items, start=1):
            it = dict(raw_it)
            src_str = str(it.get("source_path") or "").strip()
            orig_name = str(it.get("original_name") or (Path(src_str).name if src_str else "unknown.pdf"))
            ssot_name = _sanitize_filename(str(it.get("ssot_file_name") or orig_name))
            domain_code = normalize_domain_code(str(it.get("primary_domain") or "HDXD"))
            issue_year = int(it.get("issue_year") or 2026)
            item_kind = str(it.get("item_kind") or "FILE").upper()
            cde_status = str(it.get("cde_status") or "S1")
            qlvb_group = str(it.get("qlvb_group") or "SSOT_9PART")

            vault_rel = ""
            curated_rel = ""
            target_str = ssot_name
            sha_before = str(it.get("sha256") or "").strip().lower()
            sha_after = sha_before
            effective_mode = mode

            has_physical_file = bool(src_str and Path(src_str).is_file() and item_kind == "FILE")

            if has_physical_file:
                src_p = Path(src_str)
                sha_before = compute_file_sha256(src_p)
                vault_rel = store_in_bronze_vault(src_p, lake_root, sha_before)

                if mode == "COPY_TO_SILVER":
                    curated_dir = lake_root / "02_silver" / "curated_files" / domain_code / str(issue_year)
                    curated_dir.mkdir(parents=True, exist_ok=True)
                    dst_p = curated_dir / ssot_name
                    tmp_dst = curated_dir / f".tmp_{uuid.uuid4().hex[:8]}_{ssot_name}"
                    try:
                        shutil.copy2(str(src_p), str(tmp_dst))
                        os.replace(str(tmp_dst), str(dst_p))
                    finally:
                        if tmp_dst.exists():
                            try:
                                tmp_dst.unlink()
                            except OSError:
                                pass
                    sha_after = compute_file_sha256(dst_p)
                    if sha_after != sha_before:
                        raise RuntimeError(f"Kiểm tra toàn vẹn SHA-256 thất bại khi copy {ssot_name}")
                    curated_rel = dst_p.relative_to(lake_root).as_posix()
                    target_str = str(dst_p)

                elif mode == "INPLACE_RENAME":
                    dst_p = src_p.parent / ssot_name
                    if _norm_win_path(str(src_p)) != _norm_win_path(str(dst_p)):
                        # Xử lý đổi hoa/thường trên Windows NTFS qua file trung gian
                        if str(src_p).lower() == str(dst_p).lower() and str(src_p) != str(dst_p):
                            tmp_case = src_p.parent / f".ren_tmp_{uuid.uuid4().hex[:8]}_{src_p.name}"
                            shutil.move(str(src_p), str(tmp_case))
                            moved_pairs.append((src_p, tmp_case))
                            shutil.move(str(tmp_case), str(dst_p))
                            moved_pairs[-1] = (src_p, dst_p)
                        else:
                            shutil.move(str(src_p), str(dst_p))
                            moved_pairs.append((src_p, dst_p))
                    sha_after = compute_file_sha256(dst_p)
                    if sha_after != sha_before:
                        raise RuntimeError(f"Kiểm tra SHA-256 sau đổi tên thất bại: {dst_p}")
                    target_str = str(dst_p)
                    it["source_path"] = str(dst_p)
            else:
                effective_mode = "METADATA_ONLY"

            doc_key = (
                f"DOC-{sha_before[:12].upper()}"
                if re.match(r"^[0-9a-f]{64}$", sha_before)
                else f"DOC-{hashlib.sha1(ssot_name.lower().encode('utf-8')).hexdigest()[:12].upper()}"
            )

            it["sha256"] = sha_before
            it["vault_path"] = vault_rel
            it["curated_path"] = curated_rel
            enriched_items.append(it)

            op_rows.append(
                {
                    "op_id": f"OP-{batch_id}-{idx:04d}",
                    "batch_id": batch_id,
                    "doc_key": doc_key,
                    "operation_mode": effective_mode,
                    "item_kind": item_kind,
                    "source_path": src_str or orig_name,
                    "target_path": target_str,
                    "vault_path": vault_rel,
                    "original_name": orig_name,
                    "new_name": ssot_name,
                    "sha256_before": sha_before,
                    "sha256_after": sha_after,
                    "cde_status": cde_status,
                    "qlvb_group": qlvb_group,
                    "actor_name": actor_name,
                    "status": "COMMITTED",
                    "error_message": "",
                    "created_at": created_at,
                    "reverted_at": "",
                }
            )
    except Exception as exc:
        # Rollback toàn bộ file đã move ở chế độ INPLACE_RENAME nếu có lỗi giữa lô
        for orig_p, moved_p in reversed(moved_pairs):
            try:
                if moved_p.exists() and not orig_p.exists():
                    shutil.move(str(moved_p), str(orig_p))
            except Exception:
                pass
        if op_rows:
            failed_rows = [
                {**r, "status": "FAILED_ROLLED_BACK", "error_message": str(exc)[:300]}
                for r in op_rows
            ]
            try:
                warehouse.record_rename_operations(failed_rows)
            except Exception:
                pass
        raise RuntimeError(f"Giao dịch batch thất bại và đã rollback an toàn: {exc}") from exc

    if op_rows:
        warehouse.record_rename_operations(op_rows)

    return {
        "batch_id": batch_id,
        "operation_mode": mode,
        "vault_saved_count": sum(1 for r in op_rows if r["vault_path"]),
        "file_ops_count": len(op_rows),
        "operations": op_rows,
        "enriched_items": enriched_items,
    }


def undo_operations(
    *,
    warehouse: Any,
    lake_root: Path,
    batch_id: Optional[str] = None,
    op_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Hoàn tác ACID các thao tác `COMMITTED` theo `op_id` hoặc `batch_id` (mặc định batch gần nhất).
    Xác minh SHA-256 trước khi move/xóa để không đè nhầm tệp đã bị thay đổi bên ngoài.
    """
    lake_root = Path(lake_root)
    rows = warehouse.list_rename_operations(limit=200)
    committed = [r for r in rows if r.get("status") == "COMMITTED"]
    if not committed:
        raise ValueError("Không có thao tác đổi tên/lưu trữ nào ở trạng thái COMMITTED để hoàn tác.")

    if op_id:
        targets = [r for r in committed if r.get("op_id") == op_id]
    elif batch_id:
        targets = [r for r in committed if r.get("batch_id") == batch_id]
    else:
        latest_batch = committed[0]["batch_id"]
        targets = [r for r in committed if r.get("batch_id") == latest_batch]

    if not targets:
        raise ValueError("Không tìm thấy thao tác phù hợp để hoàn tác.")

    # Hoàn tác ngược thứ tự thực thi
    targets.sort(key=lambda r: r.get("op_id", ""), reverse=True)
    silver_root_norm = _norm_win_path(str(lake_root / "02_silver" / "curated_files"))

    restored_ops: List[str] = []
    rolled_back_moves: List[tuple[Path, Path]] = []

    try:
        for row in targets:
            mode = row.get("operation_mode")
            src_p = Path(row["source_path"])
            dst_p = Path(row["target_path"])
            sha_after = str(row.get("sha256_after") or "").strip().lower()

            if mode == "INPLACE_RENAME":
                if dst_p.is_file():
                    if sha_after and re.match(r"^[0-9a-f]{64}$", sha_after):
                        current_sha = compute_file_sha256(dst_p)
                        if current_sha != sha_after:
                            raise RuntimeError(
                                f"Từ chối hoàn tác vì tệp '{dst_p.name}' đã bị chỉnh sửa bên ngoài (SHA-256 không khớp)."
                            )
                    if _norm_win_path(str(dst_p)) != _norm_win_path(str(src_p)):
                        if src_p.exists():
                            raise RuntimeError(f"Đường dẫn gốc '{src_p}' đã tồn tại, không thể ghi đè khi hoàn tác.")
                        shutil.move(str(dst_p), str(src_p))
                        rolled_back_moves.append((dst_p, src_p))
            elif mode == "COPY_TO_SILVER":
                if dst_p.is_file():
                    norm_dst = _norm_win_path(str(dst_p))
                    if norm_dst.startswith(silver_root_norm + os.sep):
                        if not sha_after or compute_file_sha256(dst_p) == sha_after:
                            dst_p.unlink()

            restored_ops.append(row["op_id"])
    except Exception as exc:
        for orig_dst, moved_src in reversed(rolled_back_moves):
            try:
                if moved_src.exists() and not orig_dst.exists():
                    shutil.move(str(moved_src), str(orig_dst))
            except Exception:
                pass
        raise RuntimeError(f"Hoàn tác thất bại và đã khôi phục trạng thái trước undo: {exc}") from exc

    reverted_at = _utc_now_iso()
    warehouse.mark_rename_reverted(restored_ops, reverted_at)
    return {
        "status": "REVERTED",
        "reverted_count": len(restored_ops),
        "reverted_op_ids": restored_ops,
        "reverted_at": reverted_at,
    }
