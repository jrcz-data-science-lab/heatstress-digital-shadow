from pydantic import BaseModel

class WindMapRequest(BaseModel):
    dsm_input_path: str
    dtm_input_path: str
    corrected_height_output_path: str
    dsm_name: str = "DSM-0.5"
    dtm_name: str = "DTM-0.5"
