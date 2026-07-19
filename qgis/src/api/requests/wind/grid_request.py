from pydantic import BaseModel


class GridRequest(BaseModel):
    height_map_path: str
    buildings_height_path: str
    trees_height_path: str
    output_grid_path: str
    grid_width: float
    grid_height: float
    buildings_min_height: float = 5.0
    trees_min_height: float = 3.0
    lambda_buildings_weight: float = 0.6
    lambda_trees_weight: float = 0.3
    lambda_background: float = 0.015
    u_60: float = 1.3084
    reference_height: float = 60.0
    von_karman_constant: float = 0.4
    target_height: float = 1.2
    stability_exponent: float = 9.8
    buildings_aspect_path: str
    trees_aspect_path: str
    buildings_polygon_path: str
    trees_points_path: str
