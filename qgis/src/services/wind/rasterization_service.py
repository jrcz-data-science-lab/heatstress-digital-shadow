import os
import tempfile
from qgis.core import QgsRasterLayer, QgsRectangle, QgsProcessingFeedback
from src.services.raster_service import RasterService
from src.utils.layer_utils import load_vector_layer


class RasterizationService:
    """Service class for rasterizing vector data (buildings, trees) into raster masks."""
    
    def __init__(self):
        """Initialize the RasterizationService with a RasterService instance."""
        self.raster_service = RasterService()
    
    def rasterize_buildings(
        self,
        buildings_geojson_path: str,
        output_raster_path: str,
        reference_layer=None,
        raster_resolution: float = 1.0,
    ) -> dict:
        """
        Rasterize buildings GeoJSON to create a binary mask.
        
        :param str buildings_geojson_path: Path to buildings GeoJSON
        :param str output_raster_path: Path for output raster mask
        :param reference_layer: Optional reference raster layer to match extent and resolution
        :param float raster_resolution: Raster resolution in map units (default: 1.0)
        :return: Dictionary with output path and layer object
        """
        if raster_resolution <= 0:
            raise ValueError("raster_resolution must be a positive value")
        buildings_layer = load_vector_layer(buildings_geojson_path, "Buildings")
        
        extent = reference_layer.extent()
        
        raster_layer = self.raster_service.rasterize_vector_layer(
            vector_layer=buildings_layer,
            attribute_field='',
            output_path=output_raster_path,
            extent=extent,
            resolution=raster_resolution,
        )
        
        return {
            "mask_path": output_raster_path,
            "mask_layer": raster_layer,
        }
    
    def rasterize_trees(
        self,
        trees_geojson_path: str,
        output_raster_path: str,
        reference_layer=None,
        raster_resolution: float = 1.0,
        trees_buffer_distance: float = 3.0,
    ) -> dict:
        """
        Rasterize trees GeoJSON to create a binary mask.
        
        Trees are point features, so they are first buffered to create polygons
        before rasterization.
        
        :param str trees_geojson_path: Path to trees GeoJSON (point features)
        :param str output_raster_path: Path for output raster mask
        :param reference_layer: Optional reference raster layer to match extent and resolution
        :param float raster_resolution: Raster resolution in map units (default: 1.0)
        :param float trees_buffer_distance: Buffer radius in map units (default: 3.0)
        :return: Dictionary with output path and layer object
        """
        if raster_resolution <= 0:
            raise ValueError("raster_resolution must be a positive value")
        if trees_buffer_distance <= 0:
            raise ValueError("trees_buffer_distance must be a positive value")
        trees_layer = load_vector_layer(trees_geojson_path, "Trees")
        
        buffer_layer_path = os.path.join(tempfile.gettempdir(), "trees_buffered.gpkg")
        buffered_layer = self.raster_service.buffer_vector_layer(
            vector_layer=trees_layer,
            distance=trees_buffer_distance,
            output_path=buffer_layer_path
        )
        
        extent = reference_layer.extent()
        
        raster_layer = self.raster_service.rasterize_vector_layer(
            vector_layer=buffered_layer,
            attribute_field='',
            output_path=output_raster_path,
            extent=extent,
            resolution=raster_resolution,
        )
        
        if os.path.exists(buffer_layer_path):
            os.remove(buffer_layer_path)
        
        return {
            "mask_path": output_raster_path,
            "mask_layer": raster_layer,
        }