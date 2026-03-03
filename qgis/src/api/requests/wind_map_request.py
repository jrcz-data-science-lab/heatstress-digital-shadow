from pydantic import BaseModel, Field
from typing import Optional

class WindMapRequest(BaseModel):
    """Request model for height map generation."""
    dsm_input_path: str = Field(..., description="Path to input DSM raster file")
    dtm_input_path: str = Field(..., description="Path to input DTM raster file")
    corrected_height_output_path: str = Field(..., description="Path where the height raster will be saved")
    dsm_name: str = Field(default="DSM-0.5", description="Display name for DSM layer")
    dtm_name: str = Field(default="DTM-0.5", description="Display name for DTM layer")