import os
import shutil
import tempfile
from qgis.core import QgsProcessingFeedback
from src.utils.layer_utils import load_raster_layer
from src.utils.grid_utils import (
    create_grid,
    zonal_statistics,
    zonal_count,
    normalise_mean_field,
    count_points_in_polygon,
    polygon_centroids,
    calculate_field,
    remove_gpkg,
)
from src.utils.layer_utils import load_vector_layer


class GridService:

    DEFAULT_GRID_WIDTH = 125.0
    DEFAULT_GRID_HEIGHT = 250.0

    """
    Service for creating a rectangular analysis grid and computing zonal statistics
    of building and tree heights per cell, followed by height normalisation.

    Full pipeline:
    1. Create a rectangular vector grid aligned to the extent of the height map.
    2. Zonal statistics - buildings height (count, sum, mean) → prefix "buildings_height_".
    3. Zonal statistics - trees height   (count, sum, mean) → prefix "trees_height_"
       using the layer produced in step 2 as input.
     4. Normalise buildings_height_mean: values below the threshold are raised to the minimum.
     5. Normalise trees_height_mean:     values below the threshold are raised to the minimum.
    """

    def create_grid_with_zonal_stats(
        self,
        height_map_path: str,
        buildings_height_path: str,
        trees_height_path: str,
        output_grid_path: str,
        grid_width: float,
        grid_height: float,
        buildings_aspect_west_path: str,
        trees_aspect_west_path: str,
        buildings_polygon_path: str,
        trees_points_path: str,
        buildings_min_height: float = 5.0,
        trees_min_height: float = 3.0,
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
        Extended pipeline: grid, zonal stats, normalisation, frontal area count, object counts.
        """
        if grid_width <= 0 or grid_height <= 0:
            raise ValueError("Grid cell dimensions must be positive values")
        if buildings_min_height <= 0 or trees_min_height <= 0:
            raise ValueError("Normalisation thresholds must be positive values")
        if lambda_buildings_weight < 0 or lambda_trees_weight < 0 or lambda_background < 0:
            raise ValueError("Lambda weights and baseline must be non-negative values")
        if u_60 <= 0 or reference_height <= 0 or von_karman_constant <= 0:
            raise ValueError("Wind profile constants must be positive values")
        if target_height <= 0 or stability_exponent <= 0:
            raise ValueError("Target height and stability exponent must be positive values")
        missing_inputs = {
            "buildings_aspect_west_path": buildings_aspect_west_path,
            "trees_aspect_west_path": trees_aspect_west_path,
            "buildings_polygon_path": buildings_polygon_path,
            "trees_points_path": trees_points_path,
        }
        missing_names = [name for name, value in missing_inputs.items() if not value]
        if missing_names:
            raise ValueError(f"Missing required wind grid inputs: {', '.join(missing_names)}")

        reference_layer = load_raster_layer(height_map_path, "Height Map")
        extent = reference_layer.extent()
        crs = reference_layer.crs()

        # Define temporary file paths for intermediate outputs.
        tmp = tempfile.mkdtemp(prefix="wind_grid_")
        grid_raw_path               = os.path.join(tmp, "grid_raw.gpkg")
        buildings_stats_path        = os.path.join(tmp, "grid_buildings_stats.gpkg")
        trees_stats_path            = os.path.join(tmp, "grid_trees_stats.gpkg")
        buildings_norm_path         = os.path.join(tmp, "grid_buildings_norm.gpkg")
        trees_norm_path             = os.path.join(tmp, "grid_trees_norm.gpkg")
        grid_frontal_buildings_path = os.path.join(tmp, "grid_frontal_buildings.gpkg")
        grid_frontal_trees_path     = os.path.join(tmp, "grid_frontal_trees.gpkg")
        grid_tree_count_path        = os.path.join(tmp, "grid_tree_count.gpkg")
        grid_building_count_path    = os.path.join(tmp, "grid_building_count.gpkg")
        grid_tree_frontal_side_area_path = os.path.join(tmp, "grid_tree_frontal_side_area.gpkg")
        grid_building_frontal_side_area_path = os.path.join(tmp, "grid_building_frontal_side_area.gpkg")
        grid_tree_frontal_full_area_path = os.path.join(tmp, "grid_tree_frontal_full_area.gpkg")
        grid_building_frontal_full_area_path = os.path.join(tmp, "grid_building_frontal_full_area.gpkg")
        grid_tree_lambda_path          = os.path.join(tmp, "grid_tree_lambda.gpkg")
        grid_building_lambda_path      = os.path.join(tmp, "grid_building_lambda.gpkg")
        grid_corrected_lambda_path     = os.path.join(tmp, "grid_corrected_lambda.gpkg")
        grid_d_h_path                  = os.path.join(tmp, "grid_d_h.gpkg")
        grid_zw_h_path                 = os.path.join(tmp, "grid_zw_h.gpkg")
        grid_z0_h_path                 = os.path.join(tmp, "grid_z0_h.gpkg")
        grid_a_h_path                  = os.path.join(tmp, "grid_a_h.gpkg")
        grid_b_coeff_path              = os.path.join(tmp, "grid_b_coeff.gpkg")
        grid_u_60_path                 = os.path.join(tmp, "grid_u_60.gpkg")
        grid_u_zw_path                 = os.path.join(tmp, "grid_u_zw.gpkg")
        grid_u_star_path               = os.path.join(tmp, "grid_u_star.gpkg")
        grid_u_h_path                  = os.path.join(tmp, "grid_u_h.gpkg")
        grid_u_1_2_path                = os.path.join(tmp, "grid_u_1_2.gpkg")
        centroids_path              = os.path.join(tmp, "buildings_centroids.gpkg")

        try:
            grid_layer = create_grid(
                extent,
                crs,
                grid_raw_path,
                grid_width=grid_width,
                grid_height=grid_height,
            )

            buildings_stats_layer = zonal_statistics(
                grid_layer, buildings_height_path, "buildings_height_", buildings_stats_path
            )

            trees_stats_layer = zonal_statistics(
                buildings_stats_layer, trees_height_path, "trees_height_", trees_stats_path
            )

            buildings_norm_layer = normalise_mean_field(
                trees_stats_layer,
                "buildings_height_mean",
                buildings_min_height,
                buildings_norm_path,
            )

            norm_layer = normalise_mean_field(
                buildings_norm_layer,
                "trees_height_mean",
                trees_min_height,
                trees_norm_path,
            )

            # frontal area
            norm_layer = zonal_count(
                norm_layer, buildings_aspect_west_path, grid_frontal_buildings_path, "buildings_frontal_count_west_"
            )

            norm_layer = zonal_count(
                norm_layer, trees_aspect_west_path, grid_frontal_trees_path, "trees_frontal_count_west_"
            )

            # tree count
            feedback = QgsProcessingFeedback()
            trees_points_layer = load_vector_layer(trees_points_path, "Trees Points")
            norm_layer = count_points_in_polygon(norm_layer, trees_points_layer, grid_tree_count_path, "tree_count", feedback=feedback)

            # building count
            feedback = QgsProcessingFeedback()
            buildings_poly_layer = load_vector_layer(buildings_polygon_path, "Buildings Poly")
            centroids_layer = polygon_centroids(buildings_poly_layer, centroids_path)
            norm_layer = count_points_in_polygon(norm_layer, centroids_layer, grid_building_count_path, "building_count", feedback=feedback)

            # frontal side area trees
            norm_layer = calculate_field(
                input_layer=norm_layer,
                field_name="fa_t_side",
                formula='sqrt("trees_frontal_count_west_count" * "tree_count")',
                output_path=grid_tree_frontal_side_area_path,
            )
            
            # frontal side area buildings
            norm_layer = calculate_field(
                input_layer=norm_layer,
                field_name="fa_b_side",
                formula='sqrt("buildings_frontal_count_west_count" * "building_count")',
                output_path=grid_building_frontal_side_area_path,
            )

            # full frontal area trees
            norm_layer = calculate_field(
                input_layer=norm_layer,
                field_name="fa_t_full",
                formula='"fa_t_side" * "trees_height_mean"',
                output_path=grid_tree_frontal_full_area_path,
            )

            # full frontal area buildings
            norm_layer = calculate_field(
                input_layer=norm_layer,
                field_name="fa_b_full",
                formula='"fa_b_side" * "buildings_height_mean"',
                output_path=grid_building_frontal_full_area_path,
            )

            # lambda trees
            norm_layer = calculate_field(
                input_layer=norm_layer,
                field_name="lambda_trees",
                formula=f'"fa_t_full" / {grid_width * grid_height}',
                output_path=grid_tree_lambda_path,
            )

            # lambda buildings
            norm_layer = calculate_field(
                input_layer=norm_layer,
                field_name="lambda_buildings",
                formula=f'"fa_b_full" / {grid_width * grid_height}',
                output_path=grid_building_lambda_path,
            )

            # total lambda
            norm_layer = calculate_field(
                input_layer=norm_layer,
                field_name="lambda_total",
                formula=(
                    f'"lambda_buildings" * {lambda_buildings_weight} '
                    f'+ "lambda_trees" * {lambda_trees_weight} '
                    f'+ {lambda_background}'
                ),
                output_path=grid_corrected_lambda_path,
            )

            # features based on table
            norm_layer = calculate_field(
                input_layer=norm_layer,
                field_name="d_h",
                formula='CASE '
                        'WHEN "lambda_total" < 0.08 THEN 0.066 '
                        'WHEN "lambda_total" < 0.135 THEN 0.26 '
                        'WHEN "lambda_total" < 0.18 THEN 0.32 '
                        'WHEN "lambda_total" < 0.265 THEN 0.47 '
                        'ELSE 0.57 END',
                output_path=grid_d_h_path,
            )

            norm_layer = calculate_field(
                input_layer=norm_layer,
                field_name="zw_h",
                formula='CASE '
                        'WHEN "lambda_total" < 0.08 THEN 2 '
                        'WHEN "lambda_total" < 0.135 THEN 2.5 '
                        'WHEN "lambda_total" < 0.18 THEN 2.7 '
                        'WHEN "lambda_total" < 0.265 THEN 1.5 '
                        'ELSE 1.2 END',
                output_path=grid_zw_h_path,
            )

            norm_layer = calculate_field(
                input_layer=norm_layer,
                field_name="z0_h",
                formula='CASE '
                        'WHEN "lambda_total" < 0.08 THEN 0.048 '
                        'WHEN "lambda_total" < 0.135 THEN 0.071 '
                        'WHEN "lambda_total" < 0.18 THEN 0.084 '
                        'WHEN "lambda_total" < 0.265 THEN 0.08 '
                        'ELSE 0.077 END',
                output_path=grid_z0_h_path,
            )

            norm_layer = calculate_field(
                input_layer=norm_layer,
                field_name="a_h",
                formula='CASE '
                        'WHEN "lambda_total" < 0.08 THEN -0.35 '
                        'WHEN "lambda_total" < 0.135 THEN -0.35 '
                        'WHEN "lambda_total" < 0.18 THEN -0.34 '
                        'WHEN "lambda_total" < 0.265 THEN -0.56 '
                        'ELSE -0.85 END',
                output_path=grid_a_h_path,
            )

            norm_layer = calculate_field(
                input_layer=norm_layer,
                field_name="b_coeff",
                formula='CASE '
                        'WHEN "lambda_total" < 0.08 THEN 0.56 '
                        'WHEN "lambda_total" < 0.135 THEN 0.50 '
                        'WHEN "lambda_total" < 0.18 THEN 0.48 '
                        'WHEN "lambda_total" < 0.265 THEN 0.66 '
                        'ELSE 0.92 END',
                output_path=grid_b_coeff_path,
            )
            
            # wind speed formulas calculation
            norm_layer = calculate_field(
                input_layer=norm_layer,
                field_name="u_60",
                formula=str(u_60),
                output_path=grid_u_60_path,
            )

            norm_layer = calculate_field(
                input_layer=norm_layer,
                field_name="u_zw",
                formula=(
                    f'"u_60" * (ln(("zw_h"-"d_h")/"z0_h")) '
                    f'/ (ln(({reference_height}-"d_h")/"z0_h"))'
                ),
                output_path=grid_u_zw_path,
            )

            norm_layer = calculate_field(
                input_layer=norm_layer,
                field_name="u_star",
                formula=(
                    f'{von_karman_constant} * "u_60" '
                    f'/ (ln(({reference_height}-"d_h")/"z0_h"))'
                ),
                output_path=grid_u_star_path,
            )

            norm_layer = calculate_field(
                input_layer=norm_layer,
                field_name="u_h",
                formula='(((-"u_star")/"b_coeff") * ln(("a_h" + "b_coeff"*"zw_h") / ("a_h" + "b_coeff"*"buildings_height_mean")) + "u_zw")',
                output_path=grid_u_h_path,
            )

            norm_layer = calculate_field(
                input_layer=norm_layer,
                field_name="u_1.2",
                formula=(
                    'CASE WHEN "u_h" * exp('
                    f'{stability_exponent} * "lambda_total" * (({target_height}/"buildings_height_mean")-1)) '
                    'IS NULL THEN 0 ELSE "u_h" * exp('
                    f'{stability_exponent} * "lambda_total" * (({target_height}/"buildings_height_mean")-1)) END'
                ),
                output_path=grid_u_1_2_path,
            )

            remove_gpkg(output_grid_path)
            shutil.move(grid_u_1_2_path, output_grid_path)

        finally:
            for path in [
                grid_raw_path, buildings_stats_path, trees_stats_path, buildings_norm_path,
                trees_norm_path, grid_frontal_buildings_path, grid_frontal_trees_path,
                grid_tree_count_path, grid_building_count_path,
                grid_tree_frontal_side_area_path, grid_building_frontal_side_area_path,
                grid_tree_frontal_full_area_path, grid_building_frontal_full_area_path,
                grid_tree_lambda_path, grid_building_lambda_path, grid_corrected_lambda_path,
                grid_d_h_path, grid_zw_h_path, grid_z0_h_path, grid_a_h_path, grid_b_coeff_path,
                grid_u_60_path, grid_u_zw_path, grid_u_star_path, grid_u_h_path, grid_u_1_2_path,
                centroids_path
            ]:
                remove_gpkg(path)

            shutil.rmtree(tmp, ignore_errors=True)

        return {"grid_path": output_grid_path}
