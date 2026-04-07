import os
from qgis.core import QgsRasterLayer
from src.services.wind.wfs_service import WfsService
from src.services.wind.height_service import HeightService
from src.services.wind.rasterization_service import RasterizationService
from src.services.wind.aspect_service import AspectService
from src.utils.layer_utils import load_raster_layer


class WindService:
    """
    Orchestration service for wind reduction map generation.
    
    This service coordinates multiple specialized services (height, WFS, rasterization)
    to create wind reduction maps for urban planning and heat stress analysis.
    
    Individual services are accessible as public attributes:
    - height: HeightService instance for height map operations
    - wfs: WfsService instance for importing buildings and trees
    - rasterization: RasterizationService instance for rasterization operations
    """
    
    def __init__(self):
        """Initialize the WindService with all required service instances."""
        self.height = HeightService()
        self.wfs = WfsService()
        self.rasterization = RasterizationService()
        self.aspect = AspectService()
    
    def generate_wind_reduction_map(
        self,
        dsm_path: str,
        dtm_path: str,
        output_dir: str,
    ) -> dict:
        """
        Orchestrate the complete wind reduction map generation workflow.
        
        Processing pipeline:
        1. Create height map from DSM and DTM
        2. Import buildings within the extent
        3. Import trees within the extent
        4. Rasterize buildings to create mask
        5. Rasterize trees to create mask
        6. Extract building heights from height map
        7. Extract tree heights from height map
        8. Calculate aspect for buildings (N/E/S/W direction masks)
        9. Calculate aspect for trees (N/E/S/W direction masks)
        10. Calculate wind reduction factors (TODO: implement)
        
        :param str dsm_path: Path to input DSM raster
        :param str dtm_path: Path to input DTM raster
        :param str output_dir: Directory where all outputs will be saved
        :return: Dictionary with all output paths and processing status
        """

        height_path = os.path.join(output_dir, "height.tif")
        buildings_geojson_path = os.path.join(output_dir, "buildings.geojson")
        trees_geojson_path = os.path.join(output_dir, "trees.geojson")
        buildings_mask_path = os.path.join(output_dir, "buildings-mask.tif")
        trees_mask_path = os.path.join(output_dir, "trees-mask.tif")
        buildings_height_path = os.path.join(output_dir, "buildings-height.tif")
        trees_height_path = os.path.join(output_dir, "trees-height.tif")
        
        results = {}
        height_result = self.height.create_height_map(
            dsm_input_path=dsm_path,
            dtm_input_path=dtm_path,
            corrected_height_output_path=height_path
        )
        results["height_map"] = height_result
        
        height_layer = load_raster_layer(height_path, "Height")
        
        buildings_result = self.wfs.import_buildings(
            output_geojson_path=buildings_geojson_path,
            extent=height_layer.extent(),
        )
        results["buildings_import"] = {
            "buildings_path": buildings_result["path"],
            "buildings_layer": buildings_result["layer"],
        }
        
        trees_result = self.wfs.import_trees(
            output_geojson_path=trees_geojson_path,
            extent=height_layer.extent(),
        )
        results["trees_import"] = {
            "trees_path": trees_result["path"],
            "trees_layer": trees_result["layer"],
        }

        buildings_mask_result = self.rasterization.rasterize_buildings(
            buildings_geojson_path=buildings_geojson_path,
            output_raster_path=buildings_mask_path,
            reference_layer=height_layer
        )
        results["buildings_mask"] = buildings_mask_result
        
        trees_mask_result = self.rasterization.rasterize_trees(
            trees_geojson_path=trees_geojson_path,
            output_raster_path=trees_mask_path,
            reference_layer=height_layer
        )
        results["trees_mask"] = trees_mask_result
        
        buildings_height_result = self.height.extract_height_buildings(
            height_map_path=height_path,
            buildings_mask_path=buildings_mask_path,
            output_path=buildings_height_path
        )
        results["buildings_height"] = buildings_height_result
        
        trees_height_result = self.height.extract_height_trees(
            height_map_path=height_path,
            trees_mask_path=trees_mask_path,
            output_path=trees_height_path
        )
        results["trees_height"] = trees_height_result

        results["buildings_aspect"] = self.aspect.calculate_buildings_aspect(
            buildings_height_path=buildings_height_path,
            buildings_mask_path=buildings_mask_path,
            output_dir=output_dir,
        )

        results["trees_aspect"] = self.aspect.calculate_trees_aspect(
            trees_height_path=trees_height_path,
            trees_mask_path=trees_mask_path,
            output_dir=output_dir,
        )

        # todo calculate wind reduction factors and grid

        return {
            "status": "success",
            "message": "Wind reduction map workflow completed successfully",
            "results": results,
            "outputs": {
                "height_map": height_path,
                "buildings_geojson": buildings_geojson_path,
                "trees_geojson": trees_geojson_path,
                "buildings_mask": buildings_mask_path,
                "trees_mask": trees_mask_path,
                "buildings_height": buildings_height_path,
                "trees_height": trees_height_path,
                "buildings_aspect": os.path.join(output_dir, "buildings-aspect-separated.tif"),
                "trees_aspect": os.path.join(output_dir, "trees-aspect-separated.tif"),
            }
        }
