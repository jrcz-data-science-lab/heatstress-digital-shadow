import os
from qgis.core import QgsRasterLayer
from src.services.raster_service import RasterService
from src.utils.layer_utils import load_raster_layer


class HeightService:
    """Service class for height map generation and height extraction operations."""
    
    def __init__(self):
        self.raster_service = RasterService()
    
    def create_height_map(
        self,
        dsm_input_path: str,
        dtm_input_path: str,
        corrected_height_output_path: str,
        dsm_name: str = "DSM-0.5",
        dtm_name: str = "DTM-0.5",
    ) -> dict:
        """
        Create corrected height map from DSM and DTM layers.
        
        :param dsm_input_path: Path to input DSM raster
        :param dtm_input_path: Path to input DTM raster
        :param corrected_height_output_path: Path for corrected height raster
        :param dsm_name: Display name for DSM layer (default: "DSM-0.5")
        :param dtm_name: Display name for DTM layer (default: "DTM-0.5")
        :return: Dictionary with path and layer object
        """
        import tempfile
        
        dsm_layer = load_raster_layer(dsm_input_path, dsm_name)
        dtm_layer = load_raster_layer(dtm_input_path, dtm_name)
        
        # Create temporary file paths for intermediate layers
        temp_dir = tempfile.gettempdir()
        dsm_warped_temp = os.path.join(temp_dir, 'dsm_warped_temp.tif')
        dtm_warped_temp = os.path.join(temp_dir, 'dtm_warped_temp.tif')
        dtm_filled_temp1 = os.path.join(temp_dir, 'dtm_filled_temp1.tif')
        dtm_filled_temp2 = os.path.join(temp_dir, 'dtm_filled_temp2.tif')
        height_temp = os.path.join(temp_dir, 'height_temp.tif')
        
        # Warp DSM to target resolution
        dsm_warped_path = self.raster_service.adjust_raster_pixel_resolution(
            input_raster=dsm_input_path,
            target_layer_obj=dsm_layer,
            resampled_output_path=dsm_warped_temp
        )
        
        # Warp DTM to target resolution
        self.raster_service.adjust_raster_pixel_resolution(
            input_raster=dtm_input_path,
            target_layer_obj=dtm_layer,
            resampled_output_path=dtm_warped_temp
        )
        
        # Fill DTM NoData: GDAL interpolation for building gaps
        self.raster_service.fill_nodata_gdal(
            input_raster_path=dtm_warped_temp,
            output_path=dtm_filled_temp1
        )
        
        # Fill DTM NoData: Zero fill for remaining gaps (water bodies)
        try:
            self.raster_service.fill_nodata_with_value(
                input_raster_path=dtm_filled_temp1,
                output_path=dtm_filled_temp2
            )
        except Exception as e:
            # If no NoData values remain, just use the GDAL-filled version
            if "no NoData" in str(e) or "NoData values" in str(e):
                import shutil
                shutil.copyfile(dtm_filled_temp1, dtm_filled_temp2)
            else:
                raise
        
        # Calculate absolute heights (DSM - DTM)
        self.raster_service.gdal_raster_calculator(
            formula='A-B',
            input_rasters={'A': dsm_warped_path, 'B': dtm_filled_temp2},
            output_path=height_temp
        )
        
        height_layer = QgsRasterLayer(height_temp, "Height")
        self.raster_service.validate_layer(height_layer, height_temp, "height raster")
        
        # Correct negative values
        self.raster_service.gdal_raster_calculator(
            formula='(A<0)*0 + (A>=0)*A',
            input_rasters={'A': height_temp},
            output_path=corrected_height_output_path
        )
        
        height_layer_final = QgsRasterLayer(corrected_height_output_path, "Height")
        self.raster_service.validate_layer(height_layer_final, corrected_height_output_path, "height raster")
        
        self.raster_service.cleanup_temp_files(dsm_warped_temp, dtm_warped_temp, dtm_filled_temp1, dtm_filled_temp2, height_temp)
        
        return {
            "height_path": corrected_height_output_path,
            "height_layer": height_layer_final,
        }
    
    def extract_height_buildings(
        self,
        height_map_path: str,
        buildings_mask_path: str,
        output_path: str,
    ) -> dict:
        """
        Extract building heights from height map using buildings mask.
        
        Formula: (corrected DSM-DTM) * (mask == 1)
        
        :param str height_map_path: Path to corrected height map (DSM-DTM)
        :param str buildings_mask_path: Path to buildings mask raster
        :param str output_path: Path for output buildings-height raster
        :return: Dictionary with output path and layer object
        """
        self.raster_service.gdal_raster_calculator(
            formula='A * (B == 1)',
            input_rasters={'A': height_map_path, 'B': buildings_mask_path},
            output_path=output_path
        )
        
        height_layer = load_raster_layer(output_path, "Buildings Height")
        
        return {
            "height_path": output_path,
            "height_layer": height_layer,
        }
    
    def extract_height_trees(
        self,
        height_map_path: str,
        trees_mask_path: str,
        output_path: str,
    ) -> dict:
        """
        Extract tree heights from height map using trees mask.
        
        Formula: (corrected DSM-DTM) * (mask == 1)
        
        :param str height_map_path: Path to corrected height map (DSM-DTM)
        :param str trees_mask_path: Path to trees mask raster
        :param str output_path: Path for output trees-height raster
        :return: Dictionary with output path and layer object
        """
        self.raster_service.gdal_raster_calculator(
            formula='A * (B == 1)',
            input_rasters={'A': height_map_path, 'B': trees_mask_path},
            output_path=output_path
        )
        
        height_layer = load_raster_layer(output_path, "Trees Height")
        
        return {
            "height_path": output_path,
            "height_layer": height_layer,
        }
