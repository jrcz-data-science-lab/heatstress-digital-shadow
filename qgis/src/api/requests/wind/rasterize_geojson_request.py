from pydantic import BaseModel
from typing import Optional

class RasterizeGeoJSONRequest(BaseModel):
    input_geojson_path: str
    output_raster_path: str
    height_map_path: Optional[str] = None
    raster_resolution: float = 1.0
    trees_buffer_distance: float = 3.0
