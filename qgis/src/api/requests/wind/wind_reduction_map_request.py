from typing import Literal

from pydantic import BaseModel

class WindReductionMapRequest(BaseModel):
    dsm_path: str
    dtm_path: str
    output_dir: str
    wind_direction: Literal["north", "east", "south", "west"] = "west"
