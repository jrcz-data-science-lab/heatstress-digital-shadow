from fastapi import APIRouter
from src.services.pet_service import PETService
from src.services.raster_service import RasterService
from src.services.shadow_service import ShadowService
from src.services.geojson_service import GeoJSONService
from datetime import datetime, timedelta
from src.api.requests.placed_objects_request import PlacedObjectsRequest
from src.utils.update_qgis_project import update_pet_layer_in_project
from typing import Optional

router = APIRouter()
pet_service = PETService()
raster_service = RasterService()
shadow_service = ShadowService()
geojson_service = GeoJSONService()

@router.get("/full-map-generation")
def get_uhi_zone():
    uhi = "/data/json/wind_reduction copy.geojson"
    ref_path = "/data/dsm.TIF"
    vegetation = "/data/raster/vegetation-reproject.tif"
    svf = "/data/raster/svf-reproject.tif"

    reference = raster_service.load_raster_layer(ref_path, "dsm")
    vector = pet_service.load_zonal_layer(uhi)
    
    obj = geojson_service.calculate_wind_speed_1_2(vector) 
    obj = pet_service.calculate_zonal_uhi(obj, vegetation, svf)
    obj = pet_service.calculate_t_a_temperature(obj)
    obj = pet_service.calculate_wet_bulb_temp(obj)

    obj = pet_service.calculate_zonal_part_pet_sun(obj, "t_a", "t_w", "geschaalde_u_1_2")
    obj = pet_service.calculate_zonal_part_pet_shadow(obj, "t_a", "t_w", "geschaalde_u_1_2")

    result = raster_service.rasterize_vector_layer(obj, "pet_sun_partial", "/data/uhi/temp.tif")
    raster_service.clip_raster_by_extent(result, reference, "/data/uhi/sun-bbox.tif")

    result = raster_service.rasterize_vector_layer(obj, "pet_shadow_partial", "/data/uhi/temp.tif")
    raster_service.clip_raster_by_extent(result, reference, "/data/uhi/shadow-bbox.tif")

    raster_service.rasterize_vector_layer(obj, "t_a", "/data/uhi/t_a.tif")
    raster_service.fill_nodata_gdal("/data/raster/svf-reproject.tif", "/data/raster/svf-reproject-filled.tif")

    pet_service.calculate_total_pet_sun(
        "/data/uhi/sun-bbox.tif",
        "/data/raster/br-reproject.tif",
        "/data/raster/svf-reproject-filled.tif",
        "/data/uhi/sun-pet.tif",
    )
    pet_service.calculate_total_pet_shadow(
        "/data/uhi/shadow-bbox.tif",
        "/data/raster/svf-reproject-filled.tif",
        "/data/uhi/t_a.tif",
        "/data/uhi/shadow-pet.tif",
    )

    output_folder = "/data/shadow-maps"
    lat, lon = 51.498, 3.613
    start_dt = datetime(2015, 7, 1, 15, 0, 0)
    end_dt = datetime(2015, 7, 1, 15, 0, 0)

    shadow_service.generate_hillshade_maps(
        ref_path, output_folder, lat, lon, start_dt, end_dt
    )
    
    pet_service.calculate_total_pet_map(
        "/data/shadow-maps/hillshade_20150701_1500.tif",
        "/data/uhi/sun-pet.tif",
        "/data/uhi/shadow-pet.tif",
        "/data/pet/pet.tif",
    )
    
    return {
        "status": "success",
        "message": "Map(s) generated successfully",
    }


@router.post("/update")
def burn_point_to_raster(req: PlacedObjectsRequest, session_id: Optional[str] = None):
    input_raster = "/data/dsm.TIF"    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_raster = f"/data/server/sessions/{session_id}/dsm_{timestamp}.tif"
    pet_raster = f"/data/server/sessions/{session_id}/pet_{timestamp}.tif"
    filled_pet_raster = f"/data/server/sessions/{session_id}/pet_{timestamp}_filled.tif"
    bowen_raster =  "/data/raster/br-reproject.tif"
    bowen_updated_raster = f"/data/server/sessions/{session_id}/bowen_{timestamp}.tif"
    sun_pet_updated = f"/data/server/sessions/{session_id}/sun_pet_{timestamp}.tif"
    
    raster_service.burn_points_to_raster_pixel_cloud(input_raster, req.points, output_path=output_raster)
    raster_service.burn_points_to_raster(bowen_raster, req.points, output_path=bowen_updated_raster, height=0.4, sameHeight=True)

    pet_service.calculate_total_pet_sun(
        "/data/uhi/sun-bbox.tif",
        bowen_updated_raster,
        "/data/raster/svf-reproject-filled.tif",
        sun_pet_updated,
    )

    output_folder = "/data/shadow-maps"
    lat, lon = 51.498, 3.613
    start_dt = datetime(2015, 7, 1, 15, 0, 0)
    end_dt = datetime(2015, 7, 1, 15, 0, 0)

    shadow_path = shadow_service.generate_hillshade_maps(
        output_raster, output_folder, lat, lon, start_dt, end_dt
    )
    
    pet_service.calculate_total_pet_map(
        shadow_path,
        sun_pet_updated,
        "/data/uhi/shadow-pet.tif",
        pet_raster,
    )
    
    raster_service.fill_nodata_gdal(
        pet_raster,
        filled_pet_raster
    )
    
    update_pet_layer_in_project(f"/data/server/sessions/{session_id}/map.qgz", filled_pet_raster, f"pet_{timestamp}_filled")

    return {
        "status": "success",
        "message": f"Burned {len(req.points)} point(s) into raster.",
        "params": {"points": [p.dict() for p in req.points]},
        "output": pet_raster,
    }