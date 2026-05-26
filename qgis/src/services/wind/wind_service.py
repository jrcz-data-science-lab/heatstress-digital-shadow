import json
import os
from datetime import datetime
from qgis.core import QgsRasterLayer
from src.services.wind.wfs_service import WfsService
from src.services.wind.height_service import HeightService
from src.services.wind.rasterization_service import RasterizationService
from src.services.wind.aspect_service import AspectService
from src.services.wind.grid_service import GridService
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

    VALID_WIND_DIRECTIONS = ("north", "east", "south", "west")
    DIRECTION_GRID_SIZES = {
        "north": (125.0, 250.0),
        "east": (250.0, 125.0),
        "south": (125.0, 250.0),
        "west": (250.0, 125.0),
    }
    
    def __init__(self):
        """Initialize the WindService with all required service instances."""
        self.height = HeightService()
        self.wfs = WfsService()
        self.rasterization = RasterizationService()
        self.aspect = AspectService()
        self.grid = GridService()
    
    def generate_wind_reduction_map(
        self,
        dsm_path: str,
        dtm_path: str,
        output_dir: str,
        wind_direction: str = "west",
        grid_cell_width: float | None = None,
        grid_cell_height: float | None = None,
        buildings_min_height: float = 5.0,
        trees_min_height: float = 3.0,
        raster_resolution: float = 1.0,
        trees_buffer_distance: float = 3.0,
        lambda_buildings_weight: float = 0.6,
        lambda_trees_weight: float = 0.3,
        lambda_background: float = 0.015,
        u_60: float = 1.3084,
        reference_height: float = 60.0,
        von_karman_constant: float = 0.4,
        target_height: float = 1.2,
        stability_exponent: float = 9.8,
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
        10. Calculate wind reduction grid with zonal statistics and parameters
        
        :param str dsm_path: Path to input DSM raster
        :param str dtm_path: Path to input DTM raster
        :param str output_dir: Root directory where a timestamped output folder will be created
        :param str wind_direction: Cardinal direction the wind blows from (north/east/south/west)
        :param float | None grid_cell_width: Optional override for grid cell width
        :param float | None grid_cell_height: Optional override for grid cell height
        :param float buildings_min_height: Minimum building height for normalisation
        :param float trees_min_height: Minimum tree height for normalisation
        :param float raster_resolution: Raster resolution for masks (map units)
        :param float trees_buffer_distance: Buffer radius for tree points (map units)
        :param float lambda_buildings_weight: Weight for building frontal area in lambda_total
        :param float lambda_trees_weight: Weight for tree frontal area in lambda_total
        :param float lambda_background: Baseline lambda contribution
        :param float u_60: Reference wind speed at reference height
        :param float reference_height: Reference height for wind profile calculations
        :param float von_karman_constant: Von Karman constant for u* calculation
        :param float target_height: Target height for wind speed output (e.g. 1.2 m)
        :param float stability_exponent: Stability coefficient for exponential attenuation
        :return: Dictionary with all output paths and processing status
        """

        direction_key = wind_direction.strip().lower()
        if direction_key not in self.DIRECTION_GRID_SIZES:
            valid = ", ".join(self.VALID_WIND_DIRECTIONS)
            raise ValueError(f"Invalid wind_direction '{wind_direction}'. Valid values: {valid}")

        default_grid_width, default_grid_height = self.DIRECTION_GRID_SIZES[direction_key]
        grid_width = grid_cell_width if grid_cell_width is not None else default_grid_width
        grid_height = grid_cell_height if grid_cell_height is not None else default_grid_height

        if grid_width <= 0 or grid_height <= 0:
            raise ValueError("Grid cell dimensions must be positive values")
        if buildings_min_height <= 0 or trees_min_height <= 0:
            raise ValueError("Normalisation thresholds must be positive values")
        if raster_resolution <= 0:
            raise ValueError("raster_resolution must be a positive value")
        if trees_buffer_distance <= 0:
            raise ValueError("trees_buffer_distance must be a positive value")
        if lambda_buildings_weight < 0 or lambda_trees_weight < 0 or lambda_background < 0:
            raise ValueError("Lambda weights and baseline must be non-negative values")
        if u_60 <= 0 or reference_height <= 0 or von_karman_constant <= 0:
            raise ValueError("Wind profile constants must be positive values")
        if target_height <= 0 or stability_exponent <= 0:
            raise ValueError("Target height and stability exponent must be positive values")

        output_root_dir = output_dir.strip()
        if not output_root_dir:
            raise ValueError("output_dir is required")

        os.makedirs(output_root_dir, exist_ok=True)
        run_time = datetime.now()
        run_stamp = run_time.strftime("%Y%m%d_%H%M%S")
        created_at = run_time.isoformat(timespec="seconds")
        run_output_dir = os.path.join(output_root_dir, f"run_{run_stamp}")
        suffix = 1
        while os.path.exists(run_output_dir):
            run_output_dir = os.path.join(output_root_dir, f"run_{run_stamp}_{suffix}")
            suffix += 1
        os.makedirs(run_output_dir, exist_ok=False)

        height_path = os.path.join(run_output_dir, "height.tif")
        buildings_geopackage_path = os.path.join(run_output_dir, "buildings.gpkg")
        trees_geopackage_path = os.path.join(run_output_dir, "trees.gpkg")
        buildings_mask_path = os.path.join(run_output_dir, "buildings-mask.tif")
        trees_mask_path = os.path.join(run_output_dir, "trees-mask.tif")
        buildings_height_path = os.path.join(run_output_dir, "buildings-height.tif")
        trees_height_path = os.path.join(run_output_dir, "trees-height.tif")
        settings_path = os.path.join(run_output_dir, "run-settings.json")
        
        results = {}
        height_result = self.height.create_height_map(
            dsm_input_path=dsm_path,
            dtm_input_path=dtm_path,
            corrected_height_output_path=height_path
        )
        results["height_map"] = height_result
        
        height_layer = load_raster_layer(height_path, "Height")
        
        buildings_result = self.wfs.import_buildings(
            output_geopackage_path=buildings_geopackage_path,
            extent=height_layer.extent(),
        )
        results["buildings_import"] = {
            "buildings_path": buildings_result["path"],
            "buildings_layer": buildings_result["layer"],
        }
        
        trees_result = self.wfs.import_trees(
            output_geopackage_path=trees_geopackage_path,
            extent=height_layer.extent(),
        )
        results["trees_import"] = {
            "trees_path": trees_result["path"],
            "trees_layer": trees_result["layer"],
        }

        buildings_mask_result = self.rasterization.rasterize_buildings(
            buildings_geojson_path=buildings_geopackage_path,
            output_raster_path=buildings_mask_path,
            reference_layer=height_layer,
            raster_resolution=raster_resolution,
        )
        results["buildings_mask"] = buildings_mask_result
        
        trees_mask_result = self.rasterization.rasterize_trees(
            trees_geojson_path=trees_geopackage_path,
            output_raster_path=trees_mask_path,
            reference_layer=height_layer,
            raster_resolution=raster_resolution,
            trees_buffer_distance=trees_buffer_distance,
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
            output_dir=run_output_dir,
            wind_direction=direction_key,
        )

        results["trees_aspect"] = self.aspect.calculate_trees_aspect(
            trees_height_path=trees_height_path,
            trees_mask_path=trees_mask_path,
            output_dir=run_output_dir,
            wind_direction=direction_key,
        )

        grid_output_path = os.path.join(run_output_dir, "wind-grid.gpkg")
        grid_result = self.grid.create_grid_with_zonal_stats(
            height_map_path=height_path,
            buildings_height_path=buildings_height_path,
            trees_height_path=trees_height_path,
            output_grid_path=grid_output_path,
            grid_width=grid_width,
            grid_height=grid_height,
            buildings_min_height=buildings_min_height,
            trees_min_height=trees_min_height,
            lambda_buildings_weight=lambda_buildings_weight,
            lambda_trees_weight=lambda_trees_weight,
            lambda_background=lambda_background,
            u_60=u_60,
            reference_height=reference_height,
            von_karman_constant=von_karman_constant,
            target_height=target_height,
            stability_exponent=stability_exponent,
            buildings_aspect_west_path=os.path.join(run_output_dir, f"buildings-aspect-{direction_key}.tif"),
            trees_aspect_west_path=os.path.join(run_output_dir, f"trees-aspect-{direction_key}.tif"),
            buildings_polygon_path=buildings_geopackage_path,
            trees_points_path=trees_geopackage_path,
        )
        results["wind_grid"] = grid_result

        outputs = {
            "height_map": height_path,
            "buildings_geojson": buildings_geopackage_path,
            "trees_geojson": trees_geopackage_path,
            "buildings_mask": buildings_mask_path,
            "trees_mask": trees_mask_path,
            "buildings_height": buildings_height_path,
            "trees_height": trees_height_path,
            "buildings_aspect": os.path.join(run_output_dir, "buildings-aspect-separated.tif"),
            "trees_aspect": os.path.join(run_output_dir, "trees-aspect-separated.tif"),
            "wind_grid": grid_output_path,
            "settings_json": settings_path,
            "wind_direction": direction_key,
            "grid_cell_width": grid_width,
            "grid_cell_height": grid_height,
            "buildings_min_height": buildings_min_height,
            "trees_min_height": trees_min_height,
            "raster_resolution": raster_resolution,
            "trees_buffer_distance": trees_buffer_distance,
            "lambda_buildings_weight": lambda_buildings_weight,
            "lambda_trees_weight": lambda_trees_weight,
            "lambda_background": lambda_background,
            "u_60": u_60,
            "reference_height": reference_height,
            "von_karman_constant": von_karman_constant,
            "target_height": target_height,
            "stability_exponent": stability_exponent,
            "output_root_dir": output_root_dir,
            "output_run_dir": run_output_dir,
            "dsm_input_path": dsm_path,
            "dtm_input_path": dtm_path,
        }

        inputs = {
            "dsm_path": dsm_path,
            "dtm_path": dtm_path,
            "output_dir": output_root_dir,
            "wind_direction": direction_key,
            "grid_cell_width": grid_cell_width,
            "grid_cell_height": grid_cell_height,
            "buildings_min_height": buildings_min_height,
            "trees_min_height": trees_min_height,
            "raster_resolution": raster_resolution,
            "trees_buffer_distance": trees_buffer_distance,
            "lambda_buildings_weight": lambda_buildings_weight,
            "lambda_trees_weight": lambda_trees_weight,
            "lambda_background": lambda_background,
            "u_60": u_60,
            "reference_height": reference_height,
            "von_karman_constant": von_karman_constant,
            "target_height": target_height,
            "stability_exponent": stability_exponent,
        }

        paths = {
            "height_map": height_path,
            "buildings_geojson": buildings_geopackage_path,
            "trees_geojson": trees_geopackage_path,
            "buildings_mask": buildings_mask_path,
            "trees_mask": trees_mask_path,
            "buildings_height": buildings_height_path,
            "trees_height": trees_height_path,
            "buildings_aspect_separated": os.path.join(run_output_dir, "buildings-aspect-separated.tif"),
            "trees_aspect_separated": os.path.join(run_output_dir, "trees-aspect-separated.tif"),
            "buildings_aspect_direction": os.path.join(run_output_dir, f"buildings-aspect-{direction_key}.tif"),
            "trees_aspect_direction": os.path.join(run_output_dir, f"trees-aspect-{direction_key}.tif"),
            "wind_grid": grid_output_path,
            "settings_json": settings_path,
            "output_run_dir": run_output_dir,
        }

        settings = {
            "created_at": created_at,
            "inputs": inputs,
            "paths": paths,
        }

        with open(settings_path, "w", encoding="utf-8") as settings_file:
            json.dump(settings, settings_file, indent=2, ensure_ascii=True)

        return {
            "status": "success",
            "message": "Wind reduction map workflow completed successfully",
            "results": results,
            "outputs": outputs,
        }
