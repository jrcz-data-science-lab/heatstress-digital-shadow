"""
End-to-end integration tests for the wind reduction pipeline.

These tests run the real `WindService.generate_wind_reduction_map` workflow
once (via the session-scoped `pipeline_run` fixture) and then assert on the
artefacts it produced. They guard against regressions in:

- pipeline orchestration / file generation
- intermediate raster validity (height, masks, aspect)
- output GPKG schema (lambda_total, u_1.2, etc.)
- run-settings JSON contents
"""

from __future__ import annotations

import json
import os

import pytest


# ---------------------------------------------------------------------------
# Top-level pipeline contract
# ---------------------------------------------------------------------------
def test_pipeline_returns_success(pipeline_run):
    assert pipeline_run["status"] == "success"
    assert pipeline_run["outputs"]["wind_direction"] == "west"


@pytest.mark.parametrize(
    "output_key",
    [
        "height_map",
        "buildings_geojson",
        "trees_geojson",
        "buildings_mask",
        "trees_mask",
        "buildings_height",
        "trees_height",
        "buildings_aspect",
        "trees_aspect",
        "wind_grid",
        "settings_json",
    ],
)
def test_pipeline_artifact_exists(pipeline_run, output_key):
    path = pipeline_run["outputs"][output_key]
    assert isinstance(path, str) and path, f"Missing path for {output_key}"
    assert os.path.exists(path), f"Pipeline did not produce {output_key} at {path}"
    assert os.path.getsize(path) > 0, f"{output_key} is empty: {path}"


# ---------------------------------------------------------------------------
# Run-settings JSON
# ---------------------------------------------------------------------------
def test_settings_json_is_well_formed(pipeline_run):
    settings_path = pipeline_run["outputs"]["settings_json"]
    with open(settings_path, encoding="utf-8") as f:
        data = json.load(f)

    assert "created_at" in data
    assert data["inputs"]["wind_direction"] == "west"

    paths = data["paths"]
    for key in (
        "height_map",
        "buildings_geojson",
        "trees_geojson",
        "buildings_mask",
        "trees_mask",
        "buildings_height",
        "trees_height",
        "buildings_aspect_separated",
        "trees_aspect_separated",
        "buildings_aspect_direction",
        "trees_aspect_direction",
        "wind_grid",
    ):
        assert key in paths, f"settings.paths missing {key}"
        assert os.path.exists(paths[key]), f"settings.paths.{key} does not exist"


# ---------------------------------------------------------------------------
# Raster sanity checks
# ---------------------------------------------------------------------------
def _read_band_stats(path: str):
    """Return (min, max, mean, std) for band 1 using GDAL."""
    from osgeo import gdal
    ds = gdal.Open(path)
    assert ds is not None, f"GDAL could not open {path}"
    band = ds.GetRasterBand(1)
    stats = band.ComputeStatistics(False)
    return tuple(stats)


def _read_band_unique(path: str, sample_step: int = 50) -> set:
    """Sample unique pixel values from band 1 (subsampled for speed)."""
    from osgeo import gdal
    ds = gdal.Open(path)
    band = ds.GetRasterBand(1)
    arr = band.ReadAsArray()
    # subsample to keep the test fast on large rasters
    sampled = arr[::sample_step, ::sample_step]
    return set(int(v) for v in sampled.flatten().tolist())


def test_height_map_has_non_negative_values(pipeline_run):
    """Negative DSM-DTM values must be clamped to 0 by the height service."""
    min_v, max_v, _, _ = _read_band_stats(pipeline_run["outputs"]["height_map"])
    assert min_v >= 0.0, f"Height map has negative pixels (min={min_v})"
    assert max_v > 0.0, "Height map appears empty (max == 0)"


def test_buildings_mask_is_binary(pipeline_run):
    values = _read_band_unique(pipeline_run["outputs"]["buildings_mask"])
    assert values.issubset({0, 1}), f"Buildings mask not binary: {values}"
    assert 1 in values, "Buildings mask contains no buildings (no 1 pixels)"


def test_trees_mask_is_binary(pipeline_run):
    values = _read_band_unique(pipeline_run["outputs"]["trees_mask"])
    assert values.issubset({0, 1}), f"Trees mask not binary: {values}"
    assert 1 in values, "Trees mask contains no trees (no 1 pixels)"


def test_buildings_height_only_where_mask(pipeline_run):
    """Buildings-height raster must have no positive heights outside the mask."""
    from osgeo import gdal
    import numpy as np

    ds_h = gdal.Open(pipeline_run["outputs"]["buildings_height"])
    ds_m = gdal.Open(pipeline_run["outputs"]["buildings_mask"])
    band_h = ds_h.GetRasterBand(1)
    nodata = band_h.GetNoDataValue()

    h = band_h.ReadAsArray()[::100, ::100].astype("float64")
    m = ds_m.GetRasterBand(1).ReadAsArray()[::100, ::100]

    # Treat NoData and very-large sentinel values as "no data".
    valid = np.isfinite(h) & (h < 1e30)
    if nodata is not None:
        valid &= h != nodata

    # Where the mask is 0 AND we have a valid pixel, the height must be 0.
    leaked = ((m != 1) & valid & (h != 0)).sum()
    assert leaked == 0, f"{leaked} pixels have non-zero heights outside the buildings mask"


def test_aspect_separated_values_in_quadrants(pipeline_run):
    """The aspect-separated raster must contain only direction codes 0..4."""
    sep_path = pipeline_run["outputs"]["buildings_aspect"]  # aspect-separated
    values = _read_band_unique(sep_path)
    assert values.issubset({0, 1, 2, 3, 4}), f"Unexpected aspect codes: {values}"


# ---------------------------------------------------------------------------
# Wind grid GPKG: schema + value sanity
# ---------------------------------------------------------------------------
@pytest.fixture(scope="session")
def wind_grid_layer(pipeline_run):
    from qgis.core import QgsVectorLayer
    path = pipeline_run["outputs"]["wind_grid"]
    layer = QgsVectorLayer(path, "wind_grid", "ogr")
    assert layer.isValid(), f"Wind grid layer invalid at {path}"
    return layer


@pytest.mark.parametrize(
    "field_name",
    [
        "buildings_height_mean",
        "trees_height_mean",
        "buildings_frontal_count",
        "trees_frontal_count",
        "tree_count",
        "building_count",
        "fa_t_side",
        "fa_b_side",
        "fa_t_full",
        "fa_b_full",
        "lambda_trees",
        "lambda_buildings",
        "lambda_total",
        "d_h",
        "zw_h",
        "z0_h",
        "a_h",
        "b_coeff",
        "u_60",
        "u_zw",
        "u_star",
        "u_h",
        "u_1_2",
    ],
)
def test_wind_grid_has_field(wind_grid_layer, field_name):
    fields = [f.name() for f in wind_grid_layer.fields()]
    assert field_name in fields, (
        f"Field '{field_name}' missing from wind grid; have: {fields}"
    )


def test_wind_grid_has_features(wind_grid_layer):
    assert wind_grid_layer.featureCount() > 0


def test_wind_grid_lambda_total_in_expected_range(wind_grid_layer):
    """`lambda_total` must be non-negative; reasonable urban values stay below ~2."""
    vals = []
    for feat in wind_grid_layer.getFeatures():
        v = feat["lambda_total"]
        if v is None:
            continue
        vals.append(float(v))
    assert vals, "No lambda_total values found in wind grid"
    assert min(vals) >= 0.0, f"lambda_total has negative values (min={min(vals)})"
    assert max(vals) < 5.0, f"lambda_total unexpectedly large (max={max(vals)})"


def test_wind_grid_u_1_2_non_negative(wind_grid_layer):
    """Final wind speed `u_1_2` must never be negative."""
    negatives = 0
    total = 0
    for feat in wind_grid_layer.getFeatures():
        v = feat["u_1_2"]
        if v is None:
            continue
        total += 1
        if float(v) < 0:
            negatives += 1
    assert total > 0, "No u_1_2 values found"
    assert negatives == 0, f"{negatives}/{total} u_1_2 values are negative"
