from typing import Optional
from pydantic import Field, model_validator
from src.api.requests import ServerRequest

class WMSRequest(ServerRequest):
    """
    Standard WMS Model for server requests. Defines WMS-specific fields and sets WMS defaults.
    """
    SERVICE: str = "WMS"
    VERSION: str = "1.3.0"
    CRS: str = "CRS:84"  # lon,lat axis order — EPSG:4326 in WMS 1.3.0 reverses to lat,lon

    LAYERS: str = Field(..., description="Comma-separated list of layer names to be rendered.")
    WIDTH: int = 256
    HEIGHT: int = 256
    FORMAT: str = "image/png"
    FEATURE_COUNT: int = 1
    STYLES: str = "default"
    TRANSPARENT: bool = True
    QUERY_LAYERS: Optional[str] = None
    I: Optional[int] = None
    J: Optional[int] = None
    INFO_FORMAT: str = "application/json"

    @model_validator(mode="after")
    def sync_feature_info(self) -> 'WMSRequest':
        if self.REQUEST == "GetFeatureInfo":
            self.QUERY_LAYERS = self.QUERY_LAYERS or self.LAYERS
            if self.I is None or self.J is None:
                raise ValueError("I and J are required for GetFeatureInfo")
        return self
