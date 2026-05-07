from datetime import timedelta
from src.utils.solar_position import get_solar_position
from qgis.core import QgsApplication, QgsProcessingFeedback
import os

class ShadowService:
    def generate_hillshade_maps(self, input_path, output_folder, lat, lon, start_dt, end_dt) -> str:
        import processing
        from processing.algs.gdal.GdalAlgorithmProvider import GdalAlgorithmProvider

        input_tif = input_path
        current_dt = start_dt
        out_path = ''
        while current_dt <= end_dt:
            az, alt = get_solar_position(lat, lon, "Middelburg", "Netherlands", "Europe/Amsterdam", current_dt)
            print(f"{current_dt}: Azimuth={az:.2f}, Altitude={alt:.2f}")

            hour_str = current_dt.strftime("%Y%m%d_%H%M")
            out_path = os.path.join(output_folder, f"hillshade_{hour_str}.tif")

            params = {
                "INPUT": input_tif,
                "Z_FACTOR": 1.0,
                "AZIMUTH": az,
                "ALTITUDE": alt,
                "COMBINED": False,
                "MULTIDIRECTIONAL": False,
                "OUTPUT": out_path,
            }
            feedback = QgsProcessingFeedback()
            processing.run("gdal:hillshade", params, feedback=feedback)
            print(f"Hillshade saved: {out_path}")

            current_dt += timedelta(hours=1)
        
        return out_path
