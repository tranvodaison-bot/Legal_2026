"""
LEX-PMO OS — VBPL Data Foundation (6-Layer Single-User Local-First Architecture)
Data -> Data Lake (Bronze/Silver/Gold Parquet) -> Model Data (SQLite Star Schema + FTS5)
-> Data Analyst (DQ Profiler & SQL Views) -> BA (KPI Semantic Layer) -> BI (API, Dashboard, Excel).
"""

from .contracts import (
    DEFAULT_DATA_LAKE_ROOT,
    VBPL_DOMAIN_CODES,
    SSOT_FILENAME_RULE_RE,
    RawVbplRecord,
    CleanVbplDocument,
    CleanVbplClause,
    VbplRelationRecord,
    extract_legal_relations,
    score_document_dq,
)
from .warehouse_sqlite import VbplWarehouseSQLite
from .lake_pipeline import VbplDataLakePipeline
from .analyst_ba_bi import VbplAnalystBaBiEngine

__all__ = [
    "DEFAULT_DATA_LAKE_ROOT",
    "VBPL_DOMAIN_CODES",
    "SSOT_FILENAME_RULE_RE",
    "RawVbplRecord",
    "CleanVbplDocument",
    "CleanVbplClause",
    "VbplRelationRecord",
    "extract_legal_relations",
    "score_document_dq",
    "VbplWarehouseSQLite",
    "VbplDataLakePipeline",
    "VbplAnalystBaBiEngine",
]
