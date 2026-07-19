from typing import Literal

from pydantic import BaseModel


class AspectRequest(BaseModel):
    height_path: str
    mask_path: str
    output_dir: str
    wind_direction: Literal["north", "east", "south", "west"] = "west"
