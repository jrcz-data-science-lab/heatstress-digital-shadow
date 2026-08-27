from pydantic import BaseModel

class ExtractHeightRequest(BaseModel):
    height_map_path: str
    mask_path: str
    output_path: str
