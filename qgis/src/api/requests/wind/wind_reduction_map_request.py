from typing import Literal

from pydantic import BaseModel

class WindReductionMapRequest(BaseModel):
    dsm_path: str
    dtm_path: str
    output_dir: str
    wind_direction: Literal["north", "east", "south", "west"] = "west"
    grid_cell_width: float | None = None
    grid_cell_height: float | None = None
    buildings_min_height: float = 5.0
    trees_min_height: float = 3.0
    raster_resolution: float = 1.0
    trees_buffer_distance: float = 3.0
    lambda_buildings_weight: float = 0.6
    lambda_trees_weight: float = 0.3
    lambda_background: float = 0.015
    u_60: float = 1.3084
    reference_height: float = 60.0
    von_karman_constant: float = 0.4
    target_height: float = 1.2
    stability_exponent: float = 9.8
