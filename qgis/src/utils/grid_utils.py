"""Low-level QGIS processing helpers used by GridService."""

import os

from qgis.core import QgsCoordinateReferenceSystem, QgsRectangle, QgsVectorLayer, QgsProcessingFeedback, QgsSpatialIndex


# Zonal-statistics stat indices for native:zonalstatisticsfb
# 0 = Count, 1 = Sum, 2 = Mean
ZONAL_STATS = [0, 1, 2]


def create_grid(
    extent: QgsRectangle,
    crs: QgsCoordinateReferenceSystem,
    output_path: str,
    grid_width: float = 125.0,
    grid_height: float = 250.0,
) -> QgsVectorLayer:
    """
    Create a rectangular vector grid aligned to *extent*.

    :param QgsRectangle extent: Spatial extent of the grid.
    :param QgsCoordinateReferenceSystem crs: CRS for the output grid.
    :param str output_path: Destination GeoPackage path.
    :param float grid_width: Cell width in map units (default 125 m).
    :param float grid_height: Cell height in map units (default 250 m).
    :return: Loaded QgsVectorLayer of the created grid.
    """
    import processing

    params = {
        "TYPE": 2,  # Rectangle
        "EXTENT": extent,
        "HSPACING": grid_width,
        "VSPACING": grid_height,
        "HOVERLAY": 0,
        "VOVERLAY": 0,
        "CRS": crs,
        "OUTPUT": output_path,
    }
    processing.run("native:creategrid", params)

    layer = QgsVectorLayer(output_path, "Grid", "ogr")
    if not layer.isValid():
        raise ValueError(f"Failed to create grid layer at {output_path}")
    return layer


def zonal_statistics(
    input_layer: QgsVectorLayer,
    raster_path: str,
    column_prefix: str,
    output_path: str,
    stats: list[int] | None = None,
) -> QgsVectorLayer:
    """
    Compute zonal statistics from *raster_path* for each feature in *input_layer*.

    :param QgsVectorLayer input_layer: Vector layer that defines the zones.
    :param str raster_path: Path to the raster to sample.
    :param str column_prefix: Prefix for the generated statistic columns.
    :param str output_path: Destination GeoPackage path.
    :param list[int] stats: Stat indices (default: count, sum, mean = [0, 1, 2]).
    :return: Loaded QgsVectorLayer with the statistics columns appended.
    """
    import processing

    params = {
        "INPUT": input_layer,
        "INPUT_RASTER": raster_path,
        "RASTER_BAND": 1,
        "COLUMN_PREFIX": column_prefix,
        "STATISTICS": stats if stats is not None else ZONAL_STATS,
        "OUTPUT": output_path,
    }
    processing.run("native:zonalstatisticsfb", params)

    layer = QgsVectorLayer(output_path, column_prefix.rstrip("_"), "ogr")
    if not layer.isValid():
        raise ValueError(f"Failed to create zonal statistics layer at {output_path}")
    return layer


def zonal_count(
    grid_layer: QgsVectorLayer,
    raster_path: str,
    output_path: str,
    column_prefix: str,
) -> QgsVectorLayer:
    """
    Use QGIS zonal statistics to count non-nodata pixels in each grid cell for a raster.
    Only the count stat is computed.

    :param QgsVectorLayer grid_layer: The grid polygons.
    :param str raster_path: The raster to sample (e.g. aspect-separated direction).
    :param str output_path: Path for the output layer.
    :param str column_prefix: Prefix for the count field.
    :return: Output layer with count field.
    """
    import processing

    params = {
        "INPUT": grid_layer,
        "INPUT_RASTER": raster_path,
        "RASTER_BAND": 1,
        "COLUMN_PREFIX": column_prefix,
        "STATISTICS": [0],  # Only count
        "OUTPUT": output_path,
    }
    processing.run("native:zonalstatisticsfb", params)

    layer = QgsVectorLayer(output_path, column_prefix.rstrip("_"), "ogr")
    if not layer.isValid():
        raise ValueError(f"Failed to create zonal count layer at {output_path}")
    return layer


def normalise_mean_field(
    input_layer: QgsVectorLayer,
    field_name: str,
    min_threshold: float,
    output_path: str,
) -> QgsVectorLayer:
    """
    Clamp *field_name* upward: values below *min_threshold* are replaced with
    *min_threshold*; NULL values are left unchanged.

    :param QgsVectorLayer input_layer: Input vector layer.
    :param str field_name: Name of the field to normalise (must already exist).
    :param float min_threshold: Lower bound (e.g. 5 for buildings, 3 for trees).
    :param str output_path: Destination GeoPackage path.
    :return: Loaded QgsVectorLayer with the normalised field.
    """
    import processing

    formula = (
        f'CASE WHEN "{field_name}" IS NULL THEN NULL '
        f'WHEN "{field_name}" < {min_threshold} THEN {min_threshold} '
        f'ELSE "{field_name}" END'
    )
    params = {
        "INPUT": input_layer,
        "FIELD_NAME": field_name,
        "FIELD_TYPE": 0,  # Float / Double
        "FIELD_LENGTH": 20,
        "FIELD_PRECISION": 6,
        "FORMULA": formula,
        "OUTPUT": output_path,
    }
    processing.run("native:fieldcalculator", params)

    layer = QgsVectorLayer(output_path, field_name, "ogr")
    if not layer.isValid():
        raise ValueError(f"Failed to normalise field '{field_name}' at {output_path}")
    return layer


def count_points_in_polygon(
    polygon_layer: QgsVectorLayer,
    points_layer: QgsVectorLayer,
    output_path: str,
    count_field: str = "point_count",
    feedback: QgsProcessingFeedback | None = None,
) -> QgsVectorLayer:
    """
    Use QGIS 'Count points in polygon' to count points in each polygon.

    :param QgsVectorLayer polygon_layer: The grid or polygon layer.
    :param QgsVectorLayer points_layer: The points to count (e.g. trees or centroids).
    :param str output_path: Path for the output layer.
    :param str count_field: Name of the count field.
    :param QgsProcessingFeedback feedback: Optional feedback object for progress reporting.
    :return: Output layer with count field.
    """
    import processing

    # Build spatial index for performance using QgsSpatialIndex bulk loading
    QgsSpatialIndex(points_layer.getFeatures())

    params = {
        "POLYGONS": polygon_layer,
        "POINTS": points_layer,
        "FIELD": count_field,
        "OUTPUT": output_path,
    }
    processing.run("native:countpointsinpolygon", params, feedback=feedback)

    layer = QgsVectorLayer(output_path, count_field, "ogr")
    if not layer.isValid():
        raise ValueError(f"Failed to create count points in polygon layer at {output_path}")
    return layer


def polygon_centroids(
    polygon_layer: QgsVectorLayer,
    output_path: str,
) -> QgsVectorLayer:
    """
    Use QGIS 'Centroids' to create a point layer from polygons.

    :param QgsVectorLayer polygon_layer: The input polygons (e.g. buildings).
    :param str output_path: Path for the output centroid layer.
    :return: Output centroid point layer.
    """
    import processing

    params = {
        "INPUT": polygon_layer,
        "ALL_PARTS": False,
        "OUTPUT": output_path,
    }
    processing.run("native:centroids", params)

    layer = QgsVectorLayer(output_path, "centroids", "ogr")
    if not layer.isValid():
        raise ValueError(f"Failed to create centroids layer at {output_path}")
    return layer


def calculate_field(
    input_layer: QgsVectorLayer,
    field_name: str,
    formula: str,
    output_path: str,
    field_type: int = 0,
    field_length: int = 20,
    field_precision: int = 6,
) -> QgsVectorLayer:
    """
    Add or update a field using QGIS field calculator.

    :param QgsVectorLayer input_layer: Input vector layer.
    :param str field_name: Name of the target field to create/update.
    :param str formula: QGIS field calculator expression.
    :param str output_path: Destination GeoPackage path.
    :param int field_type: QGIS field type (default 0 = Float/Double).
    :param int field_length: Field length (default 20).
    :param int field_precision: Field precision (default 6).
    :return: Loaded QgsVectorLayer with the computed field.
    """
    import processing

    params = {
        "INPUT": input_layer,
        "FIELD_NAME": field_name,
        "FIELD_TYPE": field_type,
        "FIELD_LENGTH": field_length,
        "FIELD_PRECISION": field_precision,
        "FORMULA": formula,
        "OUTPUT": output_path,
    }
    processing.run("native:fieldcalculator", params)

    layer = QgsVectorLayer(output_path, field_name, "ogr")
    if not layer.isValid():
        raise ValueError(f"Failed to calculate field '{field_name}' at {output_path}")
    return layer


def remove_gpkg(path: str) -> None:
    """Remove a GeoPackage file together with its WAL/SHM journal files."""
    for suffix in ("", "-wal", "-shm"):
        full = path + suffix
        if os.path.exists(full):
            os.remove(full)
