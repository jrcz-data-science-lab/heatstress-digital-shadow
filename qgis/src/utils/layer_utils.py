"""Utility functions for QGIS layer operations and path handling."""

import os
from qgis.core import (
    QgsVectorLayer, QgsRasterLayer, QgsRectangle,
    QgsVectorFileWriter, QgsCoordinateTransformContext
)
from typing import Optional

def load_vector_layer(path: str, name: str = "Layer") -> QgsVectorLayer:
    """
    Load and validate a vector layer.
    
    :param str path: Path to the vector layer
    :param str name: Display name for the layer (default: "Layer")
    :return: Validated vector layer
    :raises ValueError: If layer cannot be loaded or is invalid
    """
    layer = QgsVectorLayer(path, name, "ogr")
    if not layer.isValid():
        raise ValueError(f"Failed to load vector layer from {path}")
    return layer


def load_raster_layer(path: str | None, name: str = "Layer") -> QgsRasterLayer | None:
    """
    Load and validate a raster layer.
    
    :param str path: Path to the raster layer (or None)
    :param str name: Display name for the layer (default: "Layer")
    :return: Validated raster layer or None if path is None
    :raises ValueError: If layer cannot be loaded or is invalid
    """
    if not path:
        return None
    
    layer = QgsRasterLayer(path, name)
    if not layer.isValid():
        raise ValueError(f"Failed to load raster layer from {path}")
    return layer


def export_layer_to_geopackage(
    layer: QgsVectorLayer,
    output_path: str,
    extent: Optional[QgsRectangle] = None,
) -> str:
    """
    Export a vector layer to GeoPackage format.
    
    :param QgsVectorLayer layer: Layer to export
    :param str output_path: Path where GeoPackage will be saved
    :param QgsRectangle extent: Optional extent to filter features (default: None)
    :return: Normalized GeoPackage output path
    :raises Exception: If export fails or file is not created
    """
    base_path, extension = os.path.splitext(output_path)
    resolved_output_path = output_path if extension.lower() == ".gpkg" else f"{base_path}.gpkg"

    # Ensure output directory exists
    output_dir = os.path.dirname(resolved_output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)
    
    save_options = QgsVectorFileWriter.SaveVectorOptions()
    save_options.driverName = "GPKG"
    save_options.fileEncoding = "UTF-8"
    
    if extent != None:
        save_options.filterExtent = extent
    
    error = QgsVectorFileWriter.writeAsVectorFormatV3(
        layer,
        resolved_output_path,
        QgsCoordinateTransformContext(),
        save_options
    )
    
    if error[0] != QgsVectorFileWriter.NoError:
        raise Exception(f"Failed to export to GeoPackage: {error[1]}")
    
    if not os.path.exists(resolved_output_path):
        raise Exception(f"Export completed but file not found at {resolved_output_path}")

    return resolved_output_path