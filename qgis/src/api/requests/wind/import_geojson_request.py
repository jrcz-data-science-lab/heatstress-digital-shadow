from pydantic import BaseModel

class ImportGeoJSONRequest(BaseModel):
    output_geojson_path: str
    height_map_path: str
