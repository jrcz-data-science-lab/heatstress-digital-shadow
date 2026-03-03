from fastapi import APIRouter, HTTPException
from src.api.requests import WindMapRequest
from src.services.wind_service import WindService

router = APIRouter()
wind_service = WindService()

@router.post("/height-map")
def create_height_map(req: WindMapRequest):
    """
    Create height map from DSM and DTM layers.
    
    Processing pipeline:
    1. Warp DSM/DTM to 1m resolution using bilinear resampling
    2. Fill DTM NoData gaps (buildings) using GDAL interpolation
    3. Fill remaining DTM NoData (water bodies) with 0
    4. Calculate absolute heights (DSM - DTM)
    5. Correct negative values (from approximation errors) to 0
    
    All intermediate files are stored in system temp and automatically cleaned up.
    Only the final height map is saved to the specified output path.
    
    Returns: JSON with output path and processing status
    """
    try:
        result = wind_service.create_height_map(
            dsm_input_path=req.dsm_input_path,
            dtm_input_path=req.dtm_input_path,
            corrected_height_output_path=req.corrected_height_output_path,
            dsm_name=req.dsm_name,
            dtm_name=req.dtm_name
        )
        
        return {
            "status": "success",
            "height_path": result["height_path"],
            "message": "Height map created successfully"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating height map: {str(e)}")
