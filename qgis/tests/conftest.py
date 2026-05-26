"""
Shared fixtures for the wind-reduction pipeline integration tests.

These tests exercise the REAL services (no mocks). They must run inside the
QGIS Python environment (i.e. inside the `qgis` Docker container), and they
hit live PDOK WFS/OAPIF endpoints to fetch buildings/trees.

Run from repo root:

    docker compose run --rm qgis pytest tests -v

Override the input data location with `DATA_PATH` (defaults to `/data`,
mounted from `./data` in docker-compose.yml).
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

# Make `src.*` importable from the qgis/ package root.
QGIS_PKG_ROOT = Path(__file__).resolve().parent.parent
if str(QGIS_PKG_ROOT) not in sys.path:
    sys.path.insert(0, str(QGIS_PKG_ROOT))

from src.configs.preflight import init_qgis  # noqa: E402


DATA_DIR = Path(os.environ.get("DATA_PATH", "/data"))
DSM_PATH = DATA_DIR / "wind" / "DSM-0.5.tiff"
DTM_PATH = DATA_DIR / "wind" / "DTM-0.5.tiff"


@pytest.fixture(scope="session", autouse=True)
def qgis_app():
    """Initialise QGIS + Processing once for the whole test session."""
    return init_qgis()


@pytest.fixture(scope="session")
def dsm_path() -> str:
    if not DSM_PATH.exists():
        pytest.skip(f"DSM not found at {DSM_PATH}")
    return str(DSM_PATH)


@pytest.fixture(scope="session")
def dtm_path() -> str:
    if not DTM_PATH.exists():
        pytest.skip(f"DTM not found at {DTM_PATH}")
    return str(DTM_PATH)


@pytest.fixture(scope="session")
def pipeline_run(tmp_path_factory, dsm_path, dtm_path) -> dict:
    """
    Run the FULL wind reduction pipeline once and reuse its outputs across every test.
    """
    from src.services.wind.wind_service import WindService

    out_dir = tmp_path_factory.mktemp("wind_pipeline_out")
    svc = WindService()
    return svc.generate_wind_reduction_map(
        dsm_path=dsm_path,
        dtm_path=dtm_path,
        output_dir=str(out_dir),
        wind_direction="west",
    )
