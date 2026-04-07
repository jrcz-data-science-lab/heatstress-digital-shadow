from pydantic import BaseModel
from typing import Optional

class RasterizeGeoJSONRequest(BaseModel):
    input_geojson_path: str
    output_raster_path: str
    height_map_path: Optional[str] = None
