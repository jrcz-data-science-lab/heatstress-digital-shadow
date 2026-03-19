from fastapi import APIRouter
from src.services.pet_service import PETService
from src.services.raster_service import RasterService
from src.services.shadow_service import ShadowService
from src.services.geojson_service import GeoJSONService
from datetime import datetime
from src.api.requests.placed_objects_request import PlacedObjectsRequest
from src.utils.update_qgis_project import update_pet_layer_in_project
from typing import Optional

router = APIRouter()
pet_service = PETService()
raster_service = RasterService()
shadow_service = ShadowService()
geojson_service = GeoJSONService()

_status: dict = {"message": "Idle"}


@router.get("/status")
def get_status():
    return _status


@router.get("/full-map-generation")
def get_uhi_zone():
    uhi = "/data/json/wind_reduction_kapelletest.geojson"

    # 5m reference grid
    ref_path = "/data/kapelle/dsm-kapelle-5m.tif"
    vegetation = "/data/kapelle/vegetation-kapelle-5m.tif"
    svf = "/data/kapelle/SVF-Kapelle-5m.tif"
    svf_filled = "/data/kapelle/SVF-Kapelle-5m-filled.tif"
    bowen_5m = "/data/raster/kapelle/br-kapelle-5m.tif"

    # Output paths
    sun_bbox = "/data/uhi/sun-bbox.tif"
    shadow_bbox = "/data/uhi/shadow-bbox.tif"
    ta_raster = "/data/uhi/t_a.tif"
    sun_pet = "/data/uhi/sun-pet.tif"
    shadow_pet = "/data/uhi/shadow-pet.tif"
    pet_out = "/data/pet/pet.tif"

    reference = raster_service.load_raster_layer(ref_path, "dsm")
    vector = pet_service.load_zonal_layer(uhi)

    obj = geojson_service.calculate_wind_speed_1_2(vector)
    obj = pet_service.calculate_zonal_uhi(obj, vegetation, svf)
    obj = pet_service.calculate_t_a_temperature(obj)
    obj = pet_service.calculate_wet_bulb_temp(obj)

    obj = pet_service.calculate_zonal_part_pet_sun(obj, "t_a", "t_w", "geschaalde_u_1_2")
    obj = pet_service.calculate_zonal_part_pet_shadow(obj, "t_a", "t_w", "geschaalde_u_1_2")

    # SUN partial -> warp to DSM grid -> write directly to sun-bbox.tif
    raster_service.rasterize_vector_layer(
        obj,
        "pet_sun_partial",
        "/data/uhi/sun_tmp.tif",
        resolution=5.0,
        extent_layer=reference,
    )
    raster_service.adjust_raster_pixel_resolution("/data/uhi/sun_tmp.tif", reference, sun_bbox)

    # SHADOW partial -> warp to DSM grid -> write directly to shadow-bbox.tif
    raster_service.rasterize_vector_layer(
        obj,
        "pet_shadow_partial",
        "/data/uhi/shadow_tmp.tif",
        resolution=5.0,
        extent_layer=reference,  # <-- FIX
    )
    raster_service.adjust_raster_pixel_resolution("/data/uhi/shadow_tmp.tif", reference, shadow_bbox)

    # Ta -> rasterize -> warp to DSM grid -> write directly to t_a.tif
    raster_service.rasterize_vector_layer(
        obj,
        "t_a",
        "/data/uhi/t_a_tmp.tif",
        resolution=5.0,
        extent_layer=reference,  # <-- FIX
    )
    raster_service.adjust_raster_pixel_resolution("/data/uhi/t_a_tmp.tif", reference, ta_raster)

    # SVF filled (DO NOT overwrite input)
    raster_service.fill_nodata_gdal(svf, svf_filled)

    # Total PET rasters
    pet_service.calculate_total_pet_sun(sun_bbox, bowen_5m, svf_filled, sun_pet)
    pet_service.calculate_total_pet_shadow(shadow_bbox, svf_filled, ta_raster, shadow_pet)

    # Shadow maps from 5m DSM
    output_folder = "/data/shadow-maps"
    lat, lon = 51.498, 3.613
    start_dt = datetime(2015, 7, 1, 15, 0, 0)
    end_dt = datetime(2015, 7, 1, 15, 0, 0)

    shadow_service.generate_hillshade_maps(ref_path, output_folder, lat, lon, start_dt, end_dt)

    # Final PET map
    pet_service.calculate_total_pet_map(
        "/data/shadow-maps/hillshade_20150701_1500.tif",
        sun_pet,
        shadow_pet,
        pet_out,
    )

    return {"status": "success", "message": "Map(s) generated successfully"}



@router.post("/update")
def burn_point_to_raster(req: PlacedObjectsRequest, session_id: Optional[str] = None):
    """
    Update flow (5m-consistent):
    - Burns objects into a 5m DSM copy + 5m Bowen raster copy
    - Aligns the global sun-bbox to the UPDATED DSM grid (session-specific)
    - Recomputes session sun PET
    - Recomputes hillshade from updated DSM
    - Combines sun/shadow PET into final PET
    - Make sure to edit path for reference files if working with another area than Kapelle!
    """
    # IMPORTANT: use 5m DSM as update base (NOT /data/dsm.TIF which is likely 1m)
    base_dsm_5m = "/data/kapelle/dsm-kapelle-5m.tif"

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    output_raster = f"/data/server/sessions/{session_id}/dsm_{timestamp}.tif"
    pet_raster = f"/data/server/sessions/{session_id}/pet_{timestamp}.tif"
    filled_pet_raster = f"/data/server/sessions/{session_id}/pet_{timestamp}_filled.tif"

    bowen_raster_5m = "/data/raster/kapelle/br-kapelle-5m.tif"
    bowen_updated_raster = f"/data/server/sessions/{session_id}/bowen_{timestamp}.tif"
    sun_pet_updated = f"/data/server/sessions/{session_id}/sun_pet_{timestamp}.tif"

    # 1) Burn objects into DSM + Bowen (both 5m)
    _status["message"] = "Burning objects into terrain model..."
    raster_service.burn_points_to_raster_pixel_cloud(
        base_dsm_5m, req.points, output_path=output_raster
    )
    raster_service.burn_points_to_raster(
        bowen_raster_5m,
        req.points,
        output_path=bowen_updated_raster,
        height=0.4,
        sameHeight=True,
    )

    # 2) Ensure sun-bbox matches UPDATED DSM grid (session-specific bbox)
    _status["message"] = "Aligning sun exposure grid..."
    reference = raster_service.load_raster_layer(output_raster, "dsm_updated")

    # If /data/uhi/sun-bbox.tif is already 5m and aligned, this is fast and effectively a no-op.
    sun_bbox_updated = f"/data/server/sessions/{session_id}/sun_bbox_{timestamp}.tif"
    raster_service.adjust_raster_pixel_resolution(
        "/data/uhi/sun-bbox.tif",
        reference,
        sun_bbox_updated,
    )

    # 3) Recompute session sun PET (SVF must be 5m-filled)
    _status["message"] = "Computing sun PET..."
    svf_filled = "/data/kapelle/SVF-Kapelle-5m-filled.tif"

    pet_service.calculate_total_pet_sun(
        sun_bbox_updated,
        bowen_updated_raster,
        svf_filled,
        sun_pet_updated,
    )

    # 4) Hillshade from UPDATED DSM
    try:
        _status["message"] = "Generating shadow map..."
        output_folder = "/data/shadow-maps"
        lat, lon = 51.498, 3.613
        start_dt = datetime(2015, 7, 1, 15, 0, 0)
        end_dt = datetime(2015, 7, 1, 15, 0, 0)

        shadow_path = shadow_service.generate_hillshade_maps(
            output_raster, output_folder, lat, lon, start_dt, end_dt
        )

        # 5) Combine sun/shadow PET into final PET
        _status["message"] = "Combining sun & shadow PET..."
        pet_service.calculate_total_pet_map(
            shadow_path,
            sun_pet_updated,
            "/data/uhi/shadow-pet.tif",
            pet_raster,
        )

        # 6) Fill nodata for display
        _status["message"] = "Finalising and updating map..."
        raster_service.fill_nodata_gdal(pet_raster, filled_pet_raster)

        update_pet_layer_in_project(
            f"/data/server/sessions/{session_id}/map.qgz",
            filled_pet_raster,
            f"pet_{timestamp}_filled",
        )

        return {
            "status": "success",
            "message": f"Burned {len(req.points)} point(s) into raster.",
            "params": {"points": [p.dict() for p in req.points]},
            "output": pet_raster,
        }
    except Exception as exc:
        _status["message"] = f"Error: {exc}"
        raise
    finally:
        _status["message"] = "Idle"