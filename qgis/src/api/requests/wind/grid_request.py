from pydantic import BaseModel


class GridRequest(BaseModel):
    height_map_path: str
    buildings_height_path: str
    trees_height_path: str
    output_grid_path: str
    grid_width: float
    grid_height: float
    buildings_aspect_west_path: str
    trees_aspect_west_path: str
    buildings_polygon_path: str
    trees_points_path: str
