from fastapi import APIRouter, HTTPException
from src.api.requests import HeightMapRequest, ImportGeoJSONRequest, RasterizeGeoJSONRequest, ExtractHeightRequest, AspectRequest, GridRequest, WindReductionMapRequest
from src.services.wind import WindService
from src.utils.layer_utils import load_raster_layer

router = APIRouter()
wind_service = WindService()

@router.post("/height-map")
def create_height_map(req: HeightMapRequest):
    """
    Create height map from DSM and DTM layers.
    
    Processing pipeline:
    1. Warp DSM/DTM to 1m resolution
    2. Fill DTM NoData gaps (buildings) using GDAL interpolation
    3. Fill remaining DTM NoData (water bodies) with 0
    4. Calculate absolute heights (DSM - DTM)
    5. Correct negative values (from approximation errors) to 0
    
    All intermediate files are stored in system temp and automatically cleaned up.
    Only the final height map is saved to the specified output path.
    
    Returns: JSON with output path and processing status
    """
    try:
        result = wind_service.height.create_height_map(
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

@router.post("/buildings")
def import_buildings(req: ImportGeoJSONRequest):
    """
    Import buildings from PDOK BAG WFS service.
    
    Fetches building polygons (pand layer) from the Dutch national building registry
        within the specified bounding box and exports them as a GeoPackage.
    
    The bounding box is derived from the height map extent.
    
    Returns: JSON with output path, feature count, and processing status
    """
    try:
        reference_layer = load_raster_layer(req.height_map_path, "Height Map")
        
        result = wind_service.wfs.import_buildings(
            output_geopackage_path=req.output_geojson_path,
            extent=reference_layer.extent(),
        )
        
        return {
            "status": "success",
            "buildings_path": result["path"],
            "message": "Successfully imported buildings"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error importing buildings: {str(e)}")

@router.post("/trees")
def import_trees(req: ImportGeoJSONRequest):
    """
    Import trees from PDOK BGT WFS service.
    
    Fetches vegetation objects (vegetatieobject_punt layer) from the Dutch national BGT registry
        within a bounding box and exports them as a GeoPackage. The bounding box is derived from the 
    height map extent.
    
    Returns: JSON with output path and processing status
    """
    try:
        if not req.height_map_path:
            raise ValueError("height_map_path is required for trees import")
        
        reference_layer = load_raster_layer(req.height_map_path, "Height Map")
        
        result = wind_service.wfs.import_trees(
            output_geopackage_path=req.output_geojson_path,
            extent=reference_layer.extent(),
        )
        
        return {
            "status": "success",
            "trees_path": result["path"],
            "message": "Successfully imported trees"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error importing trees: {str(e)}")

@router.post("/rasterize-buildings")
def rasterize_buildings(req: RasterizeGeoJSONRequest):
    """
    Rasterize buildings GeoJSON to create a binary mask.
    
    Converts building polygons to a raster layer where building pixels have value 1
    and non-building pixels have value 0. Uses 1m resolution by default.
    
    If height_map_path is provided, the mask will be aligned to match the extent
    and resolution of the height map, ensuring compatibility for height extraction.
    
    Returns: JSON with output path and processing status
    """
    try:
        reference_layer = load_raster_layer(req.height_map_path, "Height Map Reference")
        
        result = wind_service.rasterization.rasterize_buildings(
            buildings_geojson_path=req.input_geojson_path,
            output_raster_path=req.output_raster_path,
            reference_layer=reference_layer,
            raster_resolution=req.raster_resolution,
        )
        
        return {
            "status": "success",
            "mask_path": result["mask_path"],
            "message": "Successfully rasterized buildings"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error rasterizing buildings: {str(e)}")

@router.post("/rasterize-trees")
def rasterize_trees(req: RasterizeGeoJSONRequest):
    """
    Rasterize trees GeoJSON to create a binary mask.
    
    Converts tree points to a raster layer by first buffering them into polygons,
    then rasterizing where tree pixels have value 1 and non-tree pixels have value 0.
    Uses 3m buffer radius and 1m resolution by default.
    
    If height_map_path is provided, the mask will be aligned to match the extent
    and resolution of the height map, ensuring compatibility for height extraction.
    
    Returns: JSON with output path and processing status
    """
    try:
        reference_layer = load_raster_layer(req.height_map_path, "Height Map Reference")
        
        result = wind_service.rasterization.rasterize_trees(
            trees_geojson_path=req.input_geojson_path,
            output_raster_path=req.output_raster_path,
            reference_layer=reference_layer,
            raster_resolution=req.raster_resolution,
            trees_buffer_distance=req.trees_buffer_distance,
        )
        
        return {
            "status": "success",
            "mask_path": result["mask_path"],
            "message": "Successfully rasterized trees"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error rasterizing trees: {str(e)}")

@router.post("/extract-height-buildings")
def extract_height_buildings(req: ExtractHeightRequest):
    """
    Extract building heights from height map using buildings mask.
    
    Applies the formula: (corrected DSM-DTM) * (mask == 1)
    This creates a layer containing only the building heights.
    
    Returns: JSON with output path and processing status
    """
    try:
        result = wind_service.height.extract_height_buildings(
            height_map_path=req.height_map_path,
            buildings_mask_path=req.mask_path,
            output_path=req.output_path
        )
        
        return {
            "status": "success",
            "height_path": result["height_path"],
            "message": "Successfully extracted building heights"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error extracting building heights: {str(e)}")

@router.post("/extract-height-trees")
def extract_height_trees(req: ExtractHeightRequest):
    """
    Extract tree heights from height map using trees mask.
    
    Applies the formula: (corrected DSM-DTM) * (mask == 1)
    This creates a layer containing only the tree heights, with zeros elsewhere.
    
    Returns: JSON with output path and processing status
    """
    try:
        result = wind_service.height.extract_height_trees(
            height_map_path=req.height_map_path,
            trees_mask_path=req.mask_path,
            output_path=req.output_path
        )
        
        return {
            "status": "success",
            "height_path": result["height_path"],
            "message": "Successfully extracted tree heights"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error extracting tree heights: {str(e)}")


@router.post("/aspect-buildings")
def aspect_buildings(req: AspectRequest):
    """Calculate buildings aspect and extract only the selected wind direction mask."""
    try:
        direction = req.wind_direction.strip().lower()
        result = wind_service.aspect.calculate_buildings_aspect(
            buildings_height_path=req.height_path,
            buildings_mask_path=req.mask_path,
            output_dir=req.output_dir,
            wind_direction=direction,
        )

        return {
            "status": "success",
            "aspect_path": result["aspect"]["path"],
            "aspect_separated_path": result["aspect_separated"]["path"],
            "wind_direction": direction,
            "directional_aspect_path": result[direction]["path"],
            "message": "Successfully calculated buildings aspect",
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating buildings aspect: {str(e)}")


@router.post("/aspect-trees")
def aspect_trees(req: AspectRequest):
    """Calculate trees aspect and extract only the selected wind direction mask."""
    try:
        direction = req.wind_direction.strip().lower()
        result = wind_service.aspect.calculate_trees_aspect(
            trees_height_path=req.height_path,
            trees_mask_path=req.mask_path,
            output_dir=req.output_dir,
            wind_direction=direction,
        )

        return {
            "status": "success",
            "aspect_path": result["aspect"]["path"],
            "aspect_separated_path": result["aspect_separated"]["path"],
            "wind_direction": direction,
            "directional_aspect_path": result[direction]["path"],
            "message": "Successfully calculated trees aspect",
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating trees aspect: {str(e)}")


@router.post("/grid")
def create_grid(req: GridRequest):
    """
    Create a rectangular analysis grid and compute zonal statistics for buildings and trees.

    Processing pipeline:
    1. Create a rectangular vector grid aligned to the corrected DSM-DTM extent.
       Default cell size: 125 m (width) x 250 m (height).
    2. Zonal statistics - buildings height (count, sum, mean) with prefix "buildings_height_".
    3. Zonal statistics - trees height    (count, sum, mean) with prefix "trees_height_",
       using the layer produced in step 2 as input.
    4. Normalise buildings_height_mean: values in (0, 5) are raised to 5.
    5. Normalise trees_height_mean:     values in (0, 3) are raised to 3.

    Returns: JSON with grid output path and processing status.
    """
    try:
        result = wind_service.grid.create_grid_with_zonal_stats(
            height_map_path=req.height_map_path,
            buildings_height_path=req.buildings_height_path,
            trees_height_path=req.trees_height_path,
            output_grid_path=req.output_grid_path,
            grid_width=req.grid_width,
            grid_height=req.grid_height,
            buildings_min_height=req.buildings_min_height,
            trees_min_height=req.trees_min_height,
            lambda_buildings_weight=req.lambda_buildings_weight,
            lambda_trees_weight=req.lambda_trees_weight,
            lambda_background=req.lambda_background,
            u_60=req.u_60,
            reference_height=req.reference_height,
            von_karman_constant=req.von_karman_constant,
            target_height=req.target_height,
            stability_exponent=req.stability_exponent,
            buildings_aspect_path=req.buildings_aspect_path,
            trees_aspect_path=req.trees_aspect_path,
            buildings_polygon_path=req.buildings_polygon_path,
            trees_points_path=req.trees_points_path,
        )

        return {
            "status": "success",
            "grid_path": result["grid_path"],
            "message": "Grid with zonal statistics created successfully",
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating grid: {str(e)}")


@router.post("/generate-wind-reduction-map")
def generate_wind_reduction_map(req: WindReductionMapRequest):
    """
    Generate complete wind reduction map from raw DSM and DTM data.
    
    This endpoint orchestrates the entire wind reduction workflow:
    1. Create height map (DSM - DTM)
    2. Import buildings from PDOK BAG WFS
    3. Import trees from PDOK BGT WFS
    4. Rasterize buildings and trees to grid
    5. Calculate aspect angles for buildings and trees
    6. Create rectangular grid with zonal statistics and wind parameters
    
    Returns: JSON with output paths and final results from all processing steps.
    """
    try:
        result = wind_service.generate_wind_reduction_map(
            dsm_path=req.dsm_path,
            dtm_path=req.dtm_path,
            output_dir=req.output_dir,
            wind_direction=req.wind_direction,
            grid_cell_width=req.grid_cell_width,
            grid_cell_height=req.grid_cell_height,
            buildings_min_height=req.buildings_min_height,
            trees_min_height=req.trees_min_height,
            raster_resolution=req.raster_resolution,
            trees_buffer_distance=req.trees_buffer_distance,
            lambda_buildings_weight=req.lambda_buildings_weight,
            lambda_trees_weight=req.lambda_trees_weight,
            lambda_background=req.lambda_background,
            u_60=req.u_60,
            reference_height=req.reference_height,
            von_karman_constant=req.von_karman_constant,
            target_height=req.target_height,
            stability_exponent=req.stability_exponent,
        )
        
        return {
            "status": "success",
            "message": "Wind reduction map generated successfully",
            "outputs": result["outputs"],
            "results": result["results"],
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating wind reduction map: {str(e)}")

