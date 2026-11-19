"""
FastAPI Router cho nền tảng VBPL Data Foundation (6 tầng) — gắn vào Local Sidecar (:8008).
Prefix: /api/data-foundation
"""

from __future__ import annotations

from typing import Any, Callable, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from .analyst_ba_bi import VbplAnalystBaBiEngine
from .lake_pipeline import VbplDataLakePipeline


class SyncRecordsRequest(BaseModel):
    records: List[Dict[str, Any]] = Field(default_factory=list)
    source_system: str = "WEB_APP"
    run_etl: bool = True


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
