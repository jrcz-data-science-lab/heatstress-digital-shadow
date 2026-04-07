from pydantic import BaseModel

class WindReductionMapRequest(BaseModel):
    dsm_path: str
    dtm_path: str
    output_dir: str
