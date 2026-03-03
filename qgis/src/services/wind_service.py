import os
from qgis.core import QgsRasterLayer, QgsProcessingFeedback
from src.services.raster_service import RasterService


class WindService:
    """Service class for wind-related processing, including height map generation from DSM and DTM layers."""
    
    def __init__(self):
        """Initialize the WindService with a RasterService instance."""
        self.raster_service = RasterService()
    
    def _validate_layer(self, layer: QgsRasterLayer, path: str, layer_type: str) -> None:
        """Validate that a raster layer was loaded successfully."""
        if not layer.isValid():
            raise ValueError(f"Failed to load {layer_type} from {path}")
    
    def _cleanup_temp_files(self, *file_paths: str) -> None:
        """Remove temporary files if they exist."""
        for file_path in file_paths:
            if os.path.exists(file_path):
                os.remove(file_path)
    
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
        
        Processing pipeline:
        1. Warp DSM/DTM to 1m resolution using bilinear resampling
        2. Fill DTM NoData gaps (buildings) using GDAL interpolation (~10m)
        3. Fill remaining NoData (water bodies) with 0
        4. Calculate absolute heights (DSM - DTM)
        5. Correct negative values from approximation errors to 0
        
        All intermediate files are temporary and cleaned up automatically.
        Only the final corrected height map is saved.
        
        :param dsm_input_path: Path to input DSM raster
        :param dtm_input_path: Path to input DTM raster
        :param corrected_height_output_path: Path for corrected height raster
        :param dsm_name: Display name for DSM layer (default: "DSM-0.5")
        :param dtm_name: Display name for DTM layer (default: "DTM-0.5")
        :return: Dictionary with path and layer object
        """
        import tempfile
        
        # Ensure output directory exists
        output_dir = os.path.dirname(corrected_height_output_path)
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir, exist_ok=True)
        
        # Load and validate input rasters
        dsm_layer = QgsRasterLayer(dsm_input_path, dsm_name)
        dtm_layer = QgsRasterLayer(dtm_input_path, dtm_name)
        self._validate_layer(dsm_layer, dsm_input_path, "DSM")
        self._validate_layer(dtm_layer, dtm_input_path, "DTM")
        
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
                output_path=dtm_filled_temp2,
                fill_value=0
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
        
        # Load height layer
        height_layer = QgsRasterLayer(height_temp, "Height")
        self._validate_layer(height_layer, height_temp, "height raster")
        
        # Correct negative values
        self.raster_service.gdal_raster_calculator(
            formula='(A<0)*0 + (A>=0)*A',
            input_rasters={'A': height_temp},
            output_path=corrected_height_output_path
        )
        
        # Load and validate final height layer
        height_layer_final = QgsRasterLayer(corrected_height_output_path, "Height")
        self._validate_layer(height_layer_final, corrected_height_output_path, "height raster")
        
        # Clean up all temporary files
        self._cleanup_temp_files(dsm_warped_temp, dtm_warped_temp, dtm_filled_temp1, dtm_filled_temp2, height_temp)
        
        return {
            "height_path": corrected_height_output_path,
            "height_layer": height_layer_final,
        }