from fastapi import APIRouter, Depends, Request, Response, Cookie, Query
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from typing import Optional, List
from src.api.controllers import WMSController, DataProcessingController, SessionController, WFSController, LegendController
from src.api.models import WFSParams, WMSParams
from src.api.services import Metadata3DBagService, get_metadata_bag3d_service, DatabaseService, get_database_service
from src.api.models import AggregatedBagResponse
from src.api.requests import PlacedObjectsRequest, MeasureLocationsRequest

wfs_controller = WFSController()
wms_controller = WMSController()
dpc_controller = DataProcessingController()
session_controller = SessionController()
legend_controller = LegendController()
api_router = APIRouter()
metadata_3dbag_router = APIRouter() 

@api_router.get("/measures")
def get_measures(
    database_service: DatabaseService = Depends(get_database_service)
):
    return database_service.get_measures()

@api_router.post("/measures")
def add_measures(
    measures: List[MeasureLocationsRequest],

    database_service: DatabaseService = Depends(get_database_service)
):
    return database_service.add_measure_locations(measures)
    
@api_router.get("/objects/{type}")
async def get_objects_by_type(
    type: str,
    params: WFSParams = Depends(),
):
    return await wfs_controller.get_features(
        type=type,
        params=params,
    )

def get_wms_params(request: Request) -> WMSParams:
    # Normalize query param keys to uppercase — Cesium sends lowercase (request, layers, bbox…)
    # but WMSParams and QGIS Server expect uppercase (REQUEST, LAYERS, BBOX…)
    raw = {k.upper(): v for k, v in request.query_params.items()}
    try:
        return WMSParams(**raw)
    except ValidationError as e:
        raise RequestValidationError(e.errors())

@api_router.get("/qgis/wms")
async def get_wms(
    params: WMSParams = Depends(get_wms_params),
    session_id: Optional[str] = Cookie(default=None)
):
    return await wms_controller.get_wms(params, session_id)

@api_router.get("/session/init")
async def get_session(
    response: Response,
    session_id: Optional[str] = Cookie(default=None)
):
    return await session_controller.get_or_create_session(
        response=response,
        session_id=session_id,
    )

@api_router.post("/update-pet")
async def update_pet_map_based_on_objects(
    req: PlacedObjectsRequest,
    session_id: Optional[str] = Cookie(default=None)
):
    return await dpc_controller.update_map_placed_objects(
        req,
        session_id=session_id
    )

@metadata_3dbag_router.get("/search-pand", response_model=AggregatedBagResponse)
async def read_3dbag_by_coordinates(
    x_coord: float = Query(..., description="X coordinate (Rijksdriehoeksstelsel, EPSG:28992)"),
    y_coord: float = Query(..., description="Y coordinate (Rijksdriehoeksstelsel, EPSG:28992)"),

    service: Metadata3DBagService = Depends(get_metadata_bag3d_service),
):
    """
    Searches for the nearest PAND at the given coordinates and returns aggregated data.
    """
    return await service.fetch_and_aggregate(
        x_coord=x_coord, 
        y_coord=y_coord
    )

@api_router.get('/legend')
async def get_map_legend():
    return await legend_controller.get_legend()
