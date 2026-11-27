"""
FastAPI Router cho nền tảng VBPL Data Foundation (6 tầng) — gắn vào Local Sidecar (:8008).
Prefix: /api/data-foundation
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from .analyst_ba_bi import VbplAnalystBaBiEngine
from .lake_pipeline import VbplDataLakePipeline
from .vault_manager import execute_batch_operation, undo_operations


class SyncRecordsRequest(BaseModel):
    records: List[Dict[str, Any]] = Field(default_factory=list)
    source_system: str = "WEB_APP"
    run_etl: bool = True


class CommitBatchRequest(BaseModel):
    items: List[Dict[str, Any]] = Field(default_factory=list)
    operation_mode: str = "COPY_TO_SILVER"  # COPY_TO_SILVER | INPLACE_RENAME | METADATA_ONLY
    actor_name: str = "Single User (CĐT)"
    project_code: str = "KCN"
    run_etl: bool = True


class UndoRenameRequest(BaseModel):
    batch_id: Optional[str] = None
    op_id: Optional[str] = None


class IngestFolderRequest(BaseModel):
    folder_path: str
    project_code: str = "KCN"
    run_etl: bool = True


class PersonalNoteRequest(BaseModel):
    doc_key: str
    clause_key: str
    note_text: str
    author: str = "Single User (CĐT)"


def create_data_foundation_router(
    *,
    root_dir: Optional[str] = None,
    extract_fn: Optional[Callable[[str], Dict[str, Any]]] = None,
    classify_fn: Optional[Callable[[str, Dict[str, Any]], Dict[str, Any]]] = None,
    parse_structure_fn: Optional[Callable[[str], Dict[str, Any]]] = None,
) -> APIRouter:
    router = APIRouter(prefix="/api/data-foundation", tags=["VBPL Data Foundation (6 Layers)"])
    pipeline = VbplDataLakePipeline(root_dir=root_dir)
    engine = VbplAnalystBaBiEngine(pipeline)

    @router.get("/status")
    def get_status():
        return engine.get_lake_status()

    @router.post("/sync-records")
    def sync_records(req: SyncRecordsRequest):
        if not req.records:
            raise HTTPException(status_code=400, detail="Danh sách records trống")
        ingest_res = pipeline.ingest_raw_records(req.records, source_system=req.source_system)
        etl_res = pipeline.run_medallion_etl() if req.run_etl else None
        return {
            "status": "SUCCESS",
            "ingestion": ingest_res,
            "etl": etl_res,
        }

    @router.post("/ingest-folder")
    def ingest_folder(req: IngestFolderRequest):
        if not (extract_fn and classify_fn and parse_structure_fn):
            raise HTTPException(
                status_code=501,
                detail="Sidecar parser functions chưa được đăng ký cho /ingest-folder",
            )
        try:
            ingest_res = pipeline.ingest_folder(
                folder_path=req.folder_path,
                extract_fn=extract_fn,
                classify_fn=classify_fn,
                parse_structure_fn=parse_structure_fn,
                project_code=req.project_code,
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))

        etl_res = pipeline.run_medallion_etl() if req.run_etl else None
        return {
            "status": "SUCCESS",
            "ingestion": ingest_res,
            "etl": etl_res,
        }

    @router.post("/etl/run")
    def run_etl():
        return pipeline.run_medallion_etl()

    @router.post("/commit-batch")
    def commit_batch(req: CommitBatchRequest):
        if not req.items:
            raise HTTPException(status_code=400, detail="Danh sách items trống")
        try:
            op_res = execute_batch_operation(
                warehouse=pipeline.warehouse,
                lake_root=pipeline.root,
                items=req.items,
                operation_mode=req.operation_mode,
                actor_name=req.actor_name,
            )
        except PermissionError as exc:
            raise HTTPException(status_code=403, detail=str(exc))
        except FileNotFoundError as exc:
            raise HTTPException(status_code=404, detail=str(exc))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
        except RuntimeError as exc:
            raise HTTPException(status_code=409, detail=str(exc))

        enriched_items = op_res.get("enriched_items") or []
        records_to_ingest: List[Dict[str, Any]] = []
        for it in enriched_items:
            rec = dict(it)
            src_path = str(rec.get("source_path") or "").strip()
            # Nếu file vật lý có trên đĩa nhưng Frontend chưa có full text/nodes -> tự đọc sâu tại backend
            if (
                src_path
                and Path(src_path).is_file()
                and extract_fn
                and parse_structure_fn
                and (not rec.get("raw_text") or len(str(rec.get("raw_text") or "")) < 600)
            ):
                try:
                    extracted = extract_fn(src_path)
                    raw_text = extracted.get("raw_text") or ""
                    structured = parse_structure_fn(raw_text)
                    rec["raw_text"] = raw_text
                    rec["nodes"] = structured.get("legal_nodes") or rec.get("nodes") or []
                    rec["source_type"] = extracted.get("source_type") or rec.get("source_type") or "PDF_NATIVE"
                    rec["ocr_applied"] = bool(extracted.get("ocr_applied", False))
                    rec["total_pages"] = int(extracted.get("total_pages") or 1)
                except Exception:
                    pass
            records_to_ingest.append(rec)

        ingest_res = pipeline.ingest_raw_records(records_to_ingest, source_system="STEP1_COMMIT")
        etl_res = pipeline.run_medallion_etl() if req.run_etl else None
        hydrated_docs = pipeline.warehouse.list_hydrated_documents(include_nodes=True, limit=500)
        rename_ops = pipeline.warehouse.list_rename_operations(limit=100)

        return {
            "status": "SUCCESS",
            "batch_id": op_res["batch_id"],
            "operation_mode": op_res["operation_mode"],
            "vault_saved_count": op_res["vault_saved_count"],
            "file_ops_count": op_res["file_ops_count"],
            "ingestion": ingest_res,
            "etl": etl_res,
            "rename_operations": rename_ops,
            "hydrated_documents": hydrated_docs,
        }

    @router.get("/documents")
    def list_hydrated_documents(
        include_nodes: bool = Query(default=True),
        limit: int = Query(default=500, ge=1, le=2000),
    ):
        docs = pipeline.warehouse.list_hydrated_documents(include_nodes=include_nodes, limit=limit)
        return {
            "status": "SUCCESS",
            "total": len(docs),
            "documents": docs,
        }

    @router.get("/rename-operations")
    def list_rename_operations(limit: int = Query(default=100, ge=1, le=500)):
        ops = pipeline.warehouse.list_rename_operations(limit=limit)
        return {
            "status": "SUCCESS",
            "total": len(ops),
            "operations": ops,
        }

    @router.post("/rename-operations/undo")
    def undo_rename_operation(req: UndoRenameRequest):
        try:
            res = undo_operations(
                warehouse=pipeline.warehouse,
                lake_root=pipeline.root,
                batch_id=req.batch_id,
                op_id=req.op_id,
            )
        except ValueError as exc:
            raise HTTPException(status_code=404, detail=str(exc))
        except RuntimeError as exc:
            raise HTTPException(status_code=409, detail=str(exc))
        return res

    @router.get("/bi/overview")
    def get_bi_overview():
        return engine.get_bi_overview()

    @router.get("/analyst/dq-report")
    def get_dq_report():
        return engine.get_dq_report()

    @router.get("/analyst/search")
    def search_clauses(q: str = Query(..., min_length=1), limit: int = Query(30, ge=1, le=100)):
        hits = pipeline.warehouse.search_clauses_fts(q, limit=limit)
        return {
            "query": q,
            "total_hits": len(hits),
            "hits": hits,
        }

    @router.get("/notes")
    def list_notes(doc_key: Optional[str] = Query(default=None)):
        return {"notes": pipeline.warehouse.list_personal_notes(doc_key=doc_key)}

    @router.post("/notes")
    def save_note(req: PersonalNoteRequest):
        if not req.note_text.strip():
            raise HTTPException(status_code=400, detail="Nội dung ghi chú không được để trống")
        saved = pipeline.warehouse.upsert_personal_note(
            doc_key=req.doc_key,
            clause_key=req.clause_key,
            note_text=req.note_text,
            author=req.author,
        )
        return {"status": "SUCCESS", "note": saved}

    @router.get("/export/excel")
    def export_excel():
        xlsx_path = engine.export_bi_excel()
        return FileResponse(
            path=str(xlsx_path),
            filename=xlsx_path.name,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )

    return router
