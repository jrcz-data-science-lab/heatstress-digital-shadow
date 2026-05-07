import os
import math
from datetime import datetime
from qgis.PyQt.QtCore import QVariant
from qgis.core import (
    QgsVectorLayer, QgsField, QgsRasterLayer, QgsProcessingFeedback
)
from qgis.analysis import QgsZonalStatistics
from src.services.raster_service import RasterService
from src.utils.uhi_lookup_tables import UHILookupTables

class PETService:
    def __init__(self):
        self.raster_service = RasterService()
    def load_zonal_layer(self, path: str) -> QgsVectorLayer:
        return QgsVectorLayer(path, "zonal_layer", "ogr")
    
    def calculate_t_a_temperature(
        self,
        zonal_layer: QgsVectorLayer,
        uhi_field = 'uhi',
        base_temperature = 28.3,
        date_time = datetime(2017, 7, 1, 18, 0)
    ): 
        field_name = "t_a"
        if field_name not in [field.name() for field in zonal_layer.fields()]:
            zonal_layer.dataProvider().addAttributes([QgsField(field_name, QVariant.Double)])
            zonal_layer.updateFields()
        
        uhi_factor = UHILookupTables.get_uhi_factor(date_time)
        print(uhi_factor)
        zonal_layer.startEditing()
        for feature in zonal_layer.getFeatures():
            uhi = feature[uhi_field]
            if uhi is None:
                t_a = None
            else:  
                t_a = base_temperature + uhi * uhi_factor
            feature[field_name] = t_a
            zonal_layer.updateFeature(feature)
        
        zonal_layer.commitChanges()
        return zonal_layer
    
    def calculate_zonal_uhi(
        self,
        zonal_layer: QgsVectorLayer,
        bowen_ratio_layer: str|QgsRasterLayer,
        svf_layer: str|QgsRasterLayer,
        t_min = 27.2,
        t_max = 29.1,
        average_wind_speed = 7.5
    ) -> QgsVectorLayer:
        """
        Calculates UHI directly on the ORIGINAL zonal_layer.
        """
        svf_obj, _ = self.convert_raster_layer_to_qgs_and_path(svf_layer)
        br_obj,  _ = self.convert_raster_layer_to_qgs_and_path(bowen_ratio_layer)

        if not svf_obj.isValid():
            raise Exception("SVF raster is invalid")
        if not br_obj.isValid():
            raise Exception("Bowen ratio raster is invalid")
        
        zs_svf = QgsZonalStatistics(
            zonal_layer,
            svf_obj,
            attributePrefix='svf_',
            stats=QgsZonalStatistics.Mean
        )
        zs_svf.calculateStatistics(None)

        zs_br = QgsZonalStatistics(
            zonal_layer,
            br_obj,
            attributePrefix='veg_',
            stats=QgsZonalStatistics.Mean
        )
        zs_br.calculateStatistics(None)
        
        field_name = "uhi"
        if field_name not in [f.name() for f in zonal_layer.fields()]:
            zonal_layer.dataProvider().addAttributes([QgsField(field_name, QVariant.Double)])
            zonal_layer.updateFields()

        zonal_layer.startEditing()
        temp_diff = t_max - t_min
        base_value = (663 * (temp_diff ** 3)) / average_wind_speed
        base_value = base_value ** 0.25

        for feature in zonal_layer.getFeatures():

            svf_mean = feature["svf_mean"]
            veg_mean = feature["veg_mean"]

            if svf_mean is None or veg_mean is None:
                uhi = None
            else:
                uhi = (2 - svf_mean - veg_mean) * base_value

            feature[field_name] = uhi
            zonal_layer.updateFeature(feature)

        zonal_layer.commitChanges()

        return zonal_layer

    def calculate_wet_bulb_temp(self, zonal_layer: QgsVectorLayer, t_a_field = "t_a", r_h = 44.0) -> QgsVectorLayer:
        """
        Adds a 'wet_bulb' field to the given vector layer and calculates wet-bulb temperature.
        
        :param QgsVectorLayer zonal_layer: The zonal statistics layer on which the calculation would be performed
        :param str t_a: The field in the zonal layer that contains the air temperature (Ta)
        :param float r_h: The relative humidity value (or constant) used in the calculation (φ)
        """
        field_name = "t_w"
        if field_name not in [field.name() for field in zonal_layer.fields()]:
            zonal_layer.dataProvider().addAttributes([QgsField(field_name, QVariant.Double)])
            zonal_layer.updateFields()
        
        zonal_layer.startEditing()
        for feature in zonal_layer.getFeatures():
            t_a = feature[t_a_field]
            if t_a is None:
                wet_bulb = None
            else:
                temp_val = t_a
                wet_bulb = (
                    temp_val * math.atan(0.151977 * math.sqrt(r_h + 8.313659)) +
                    math.atan(temp_val + r_h) -
                    math.atan(r_h - 1.676331) +
                    0.00391838 * (r_h ** 1.5) * math.atan(0.023101 * r_h) -
                    4.686035
                )
            feature[field_name] = wet_bulb
            zonal_layer.updateFeature(feature)
        
        zonal_layer.commitChanges()
        return zonal_layer

    def calculate_zonal_part_pet_sun(
        self,
        zonal_layer: QgsVectorLayer,
        t_a_field: str = "t_a",
        t_w_field: str = "t_w",
        u_field: str = "u",
        phi: float = 44.0,
        q_gl: float = 663.0,
    ) -> QgsVectorLayer:
        """
        Adds a 'pet_sun_partial' field to the given vector layer and calculates the PET sun temperature.
        
        :param QgsVectorLayer zonal_layer: The zonal statistics layer on which the calculation would be performed
        :param str t_a: The field in the zonal layer that contains the air temperature (Ta)
        :param str t_w: The field in the zonal layer that contains the wet bulb temperature (Tw)
        :param str u: The field in the zonal layer that contains the wind speed at 1.2 m height(U)
        :param float phi: The sun angle used in the calculation (φ)
        :param flaot q_gl: The global radiation taken by KNMI (Qgl)
        """
        field_name = "pet_sun_partial"
        if field_name not in [field.name() for field in zonal_layer.fields()]:
            zonal_layer.dataProvider().addAttributes([QgsField(field_name, QVariant.Double)])
            zonal_layer.updateFields()
        
        zonal_layer.startEditing()
        for feature in zonal_layer.getFeatures():
            t_a = feature[t_a_field]
            t_w = feature[t_w_field]
            u = feature[u_field]
            if t_a is None or t_w is None or u is None:
                pet_sun_partial = None
            else:
                pet_sun_partial = (
                    -13.26 + 1.25 * t_a + 0.011 * q_gl - 3.37 * math.log(u) + 0.078 * t_w +
                    0.0055 * q_gl * math.log(u) + 5.56 * math.sin(phi) - 0.0103 * q_gl * math.log(u) * math.sin(phi)
                )
            feature[field_name] = pet_sun_partial
            zonal_layer.updateFeature(feature)
        
        zonal_layer.commitChanges()
        return zonal_layer

    def calculate_zonal_part_pet_shadow(
        self,
        zonal_layer: QgsVectorLayer,
        t_a_field: str = "t_a",
        t_w_field: str = "t_w",
        u_field: str = "u",
    ) -> QgsVectorLayer:
        """
        Adds a 'pet_shadow_partial' field to the given vector layer and calculates the PET shadow temperature.
        
        :param QgsVectorLayer zonal_layer: The zonal statistics layer on which the calculation would be performed
        :param str t_a: The field in the zonal layer that contains the air temperature (Ta)
        :param str t_w: The field in the zonal layer that contains the wet bulb temperature (Tw)
        :param str u: The field in the zonal layer that contains the wind speed at 1.2 m height(U)
        """
        field_name = "pet_shadow_partial"
        if field_name not in [field.name() for field in zonal_layer.fields()]:
            zonal_layer.dataProvider().addAttributes([QgsField(field_name, QVariant.Double)])
            zonal_layer.updateFields()
        
        zonal_layer.startEditing()
        for feature in zonal_layer.getFeatures():
            t_a = feature[t_a_field]
            t_w = feature[t_w_field]
            u = feature[u_field]
            if t_a is None or t_w is None or u is None:
                pet_shadow_partial = None
            else:
                pet_shadow_partial = (
                    -12.14 + 1.25 * t_a - 1.47 * math.log(u) + 0.060 * t_w   
                )
            feature[field_name] = pet_shadow_partial
            zonal_layer.updateFeature(feature)
        
        zonal_layer.commitChanges()
        return zonal_layer
        
    def calculate_total_pet_sun(
        self,
        partial_pet_layer: str|QgsRasterLayer, 
        br_layer_path: str|QgsRasterLayer, 
        svf_layer_path: str|QgsRasterLayer, 
        output_path: str
    ) -> QgsRasterLayer:
        """
        Calculates the total sun pet over the entire given partial pet layer.
        
        :param str|QgsRasterLayer partial_pet_layer_path: The path of the partial sun pet raster
        :param str|QgsRasterLayer br_layer_path: The path of the bowen ratio map
        :param str|QgsRasterLayer svf_layer_path: The path of the sky-view factor map
        :param str output_path: Path to save the output raster (e.g., '/tmp/total_pet.tif').
        """
        import processing
        
        feedback = QgsProcessingFeedback()

        partial_pet_obj, partial_pet_path = self.convert_raster_layer_to_qgs_and_path(partial_pet_layer)
        br_obj, br_path = self.convert_raster_layer_to_qgs_and_path(br_layer_path)
        svf_obj, svf_path = self.convert_raster_layer_to_qgs_and_path(svf_layer_path)
        
        for layer in [partial_pet_obj, br_obj, svf_obj]:
            if not layer.isValid():
                raise Exception(f"Raster layer is invalid: {layer.name()}")

        # Use string paths in parameters
        params = {
            'INPUT_A': partial_pet_path,
            'BAND_A': 1,
            'INPUT_B': br_path,
            'BAND_B': 1,
            'INPUT_C': svf_path,
            'BAND_C': 1,
            'FORMULA': 'A + 0.546 * B + 1.94 * C',
            'NO_DATA': None,
            'EXTENT_OPT': 0,  # 0 = intersect
            'PROJWIN': partial_pet_obj.extent(),
            'RTYPE': 5,  # Float32
            'OUTPUT': output_path
        }

        result = processing.run("gdal:rastercalculator", params, feedback=feedback)

        total_pet_layer = QgsRasterLayer(result['OUTPUT'], os.path.basename(output_path))

        if not total_pet_layer.isValid():
            raise Exception("Failed to create total PET raster")

        return total_pet_layer

    def calculate_total_pet_shadow(
        self,
        partial_pet_layer: str|QgsRasterLayer, 
        svf_layer_path: str|QgsRasterLayer,
        t_a_layer_path: str|QgsRasterLayer,
        output_path: str,
        q_diff = 0.2,
    ) -> QgsRasterLayer:
        """
        Calculates the total sun pet over the entire given partial pet layer.
        
        :param str|QgsRasterLayer partial_pet_layer_path: The path of the partial sun pet raster
        :param str|QgsRasterLayer svf_layer_path: The path of the sky-view factor map
        :param str|QgsRasterLayer t_a_layer_path: The path of the air temperature map
        :param str output_path: Path to save the output raster
        :param float q_diff: The "diffuse straling" from the standard
        """
        import processing
        
        feedback = QgsProcessingFeedback()
        boltzmann_const = 5.670374419 * (10 ** (-8))

        partial_pet_obj, partial_pet_path = self.convert_raster_layer_to_qgs_and_path(partial_pet_layer)
        svf_obj, svf_path = self.convert_raster_layer_to_qgs_and_path(svf_layer_path)
        ta_obj, ta_path = self.convert_raster_layer_to_qgs_and_path(t_a_layer_path)
        
        for layer in [partial_pet_obj, svf_obj, ta_obj]:
            if not layer.isValid():
                raise Exception(f"Raster layer is invalid: {layer.name()}")

        # Use string paths in parameters
        params = {
            'INPUT_A': partial_pet_path,
            'BAND_A': 1,
            'INPUT_B': svf_path,
            'BAND_B': 1,
            'INPUT_C': ta_path,
            'BAND_C': 1,
            'FORMULA': f'A + 0.015 * B * {q_diff} + 0.0060 * (1 - B) * {boltzmann_const} * ((C + 273.15) ** 4)',
            'NO_DATA': None,
            'EXTENT_OPT': 0,  # 0 = intersect
            'PROJWIN': partial_pet_obj.extent(),
            'RTYPE': 5,  # Float32
            'OUTPUT': output_path
        }

        result = processing.run("gdal:rastercalculator", params, feedback=feedback)

        total_pet_layer = QgsRasterLayer(result['OUTPUT'], os.path.basename(output_path))

        if not total_pet_layer.isValid():
            raise Exception("Failed to create total PET raster")

        return total_pet_layer

    def convert_raster_layer_to_qgs_and_path(self, layer: str|QgsRasterLayer) -> tuple[QgsRasterLayer, str]:
        """
        Convert layer input to both object and path.
        
        :param layer: a file path string or QgsRasterLayer object
        """
        if isinstance(layer, str):
            layer_obj = QgsRasterLayer(layer, os.path.basename(layer))
            layer_path = layer
        else:
            layer_obj = layer
            layer_path = layer.source()
        
        if not layer_obj.isValid():
            raise Exception(f"Raster layer is invalid: {layer_obj.name()}")
        
        return layer_obj, layer_path

    def calculate_total_pet_map(
        self,
        shadow_map: str|QgsRasterLayer,
        sun_pet: str|QgsRasterLayer,
        shadow_pet: str|QgsRasterLayer,
        output_path: str,
        shadow_threshold: float = 127,
        ) :
        """
        Calculates and returns the total PET map
        
        :param shadow_map: a file path string or QgsRasterLayer object that contains the shadow map
        :param sun_pet: a file path string or QgsRasterLayer object that contains the sun PET
        :param shadow_pet: a file path string or QgsRasterLayer object that contains the shadow PET
        :param output_path: the output path
        :param shadow_threshold: a number between 0-255 that determines which values are shadow and which sun
        """
        import processing
        feedback = QgsProcessingFeedback()
        
        shadow_map_obj, shadow_map_path = self.convert_raster_layer_to_qgs_and_path(shadow_map)
        sun_pet_obj, sun_pet_path = self.convert_raster_layer_to_qgs_and_path(sun_pet)
        shadow_pet_obj, shadow_pet_path = self.convert_raster_layer_to_qgs_and_path(shadow_pet)
                
        for layer in [shadow_map_obj, sun_pet_obj, shadow_pet_obj]:
            if not layer.isValid():
                raise Exception(f"Raster layer is invalid: {layer.name()}")
        
        shadow_maps_folder_path = "/data/shadow-maps"
        aligned_shadow_map_path = os.path.join(shadow_maps_folder_path, "shadow_map_aligned.tif")

        self.raster_service.adjust_raster_pixel_resolution(shadow_map_path, sun_pet_obj, aligned_shadow_map_path)

        params = {
            'INPUT_A': sun_pet_path,
            'BAND_A': 1,
            'INPUT_B': aligned_shadow_map_path,
            'BAND_B': 1,
            'INPUT_C': shadow_pet_path,
            'BAND_C': 1,
            'FORMULA': f'(A * (B > {shadow_threshold})) + (C * (B <= {shadow_threshold}))',
            'NO_DATA': None,
            'EXTENT_OPT': 0,  # 0 = intersect
            'PROJWIN': shadow_map_obj.extent(),
            'RTYPE': 5,  # Float32
            'OUTPUT': output_path
        }

        result = processing.run("gdal:rastercalculator", params, feedback=feedback)

        total_pet_layer = QgsRasterLayer(result['OUTPUT'], os.path.basename(output_path))

        return total_pet_layer