import os
import math
from datetime import datetime
from qgis.PyQt.QtCore import QVariant
from qgis.core import (
    QgsVectorLayer,
    QgsField,
    QgsRasterLayer,
    QgsProcessingFeedback,
)
from qgis.analysis import QgsZonalStatistics
from src.services.raster_service import RasterService
from src.utils.uhi_lookup_tables import UHILookupTables


class PETService:
    def __init__(self):
        self.raster_service = RasterService()

    # -----------------------------
    # Helpers for QVariant/NULL-safe math
    # -----------------------------
    @staticmethod
    def _to_float_or_none(v):
        """
        Convert a QGIS feature attribute to float, safely handling:
        - Python None
        - QVariant(NULL)
        - empty strings
        Returns None if the value is missing/unusable.
        """
        if v is None:
            return None

        # QVariant handling
        if isinstance(v, QVariant):
            if v.isNull():
                return None
            v = v.value()

        if v == "" or v is None:
            return None

        try:
            return float(v)
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _to_float_or_default(v, default: float) -> float:
        """
        Like _to_float_or_none, but returns a default float if missing/unusable.
        """
        out = PETService._to_float_or_none(v)
        return default if out is None else out

    # -----------------------------
    # Raster alignment helpers
    # -----------------------------
    @staticmethod
    def _grid_signature(layer: QgsRasterLayer):
        """
        Stable grid signature without using dataProvider().geoTransform()
        Works across QGIS builds.

        Returns:
        (crs_authid, pixel_w, pixel_h, xmin, ymin, xmax, ymax, width, height)
        """
        ext = layer.extent()
        # QGIS pixel size can be accessed from the raster layer
        pw = float(layer.rasterUnitsPerPixelX())
        ph = float(layer.rasterUnitsPerPixelY())
        return (
            layer.crs().authid(),
            round(pw, 9),
            round(ph, 9),
            round(ext.xMinimum(), 6),
            round(ext.yMinimum(), 6),
            round(ext.xMaximum(), 6),
            round(ext.yMaximum(), 6),
            layer.width(),
            layer.height(),
        )

    @staticmethod
    def _same_grid(a: QgsRasterLayer, b: QgsRasterLayer) -> bool:
        return PETService._grid_signature(a) == PETService._grid_signature(b)

    def _ensure_aligned_to_reference(
        self,
        src_path: str,
        ref_layer: QgsRasterLayer,
        out_path: str,
    ) -> str:
        """
        Ensures src_path is on the exact same grid as ref_layer.
        If already aligned, returns src_path. Otherwise warps/resamples using RasterService.
        """
        src_layer = QgsRasterLayer(src_path, os.path.basename(src_path))
        if not src_layer.isValid():
            raise Exception(f"Raster layer is invalid: {src_path}")

        if self._same_grid(src_layer, ref_layer):
            return src_path

        os.makedirs(os.path.dirname(out_path), exist_ok=True)

        # This function must warp src_path to match ref_layer grid (pixel size + origin + extent/align).
        # You already use it elsewhere (shadow -> sun_pet grid).
        self.raster_service.adjust_raster_pixel_resolution(src_path, ref_layer, out_path)

        aligned_layer = QgsRasterLayer(out_path, os.path.basename(out_path))
        if not aligned_layer.isValid():
            raise Exception(f"Failed to align raster: {src_path} -> {out_path}")

        # Double-check alignment
        if not self._same_grid(aligned_layer, ref_layer):
            raise Exception(
                "Aligned raster grid still does not match reference grid.\n"
                f"REF GRID: {self._grid_signature(ref_layer)}\n"
                f"OUT GRID: {self._grid_signature(aligned_layer)}"
            )
        return out_path

    # -----------------------------
    # Loading
    # -----------------------------
    def load_zonal_layer(self, path: str) -> QgsVectorLayer:
        return QgsVectorLayer(path, "zonal_layer", "ogr")

    # -----------------------------
    # Air temperature (Ta)
    # -----------------------------
    def calculate_t_a_temperature(
        self,
        zonal_layer: QgsVectorLayer,
        uhi_field="uhi",
        base_temperature=28.3,
        date_time=datetime(2017, 7, 1, 18, 0),
    ):
        field_name = "t_a"
        if field_name not in [field.name() for field in zonal_layer.fields()]:
            zonal_layer.dataProvider().addAttributes([QgsField(field_name, QVariant.Double)])
            zonal_layer.updateFields()

        uhi_factor = UHILookupTables.get_uhi_factor(date_time)
        print(uhi_factor)

        zonal_layer.startEditing()
        for feature in zonal_layer.getFeatures():
            uhi = self._to_float_or_none(feature[uhi_field])

            if uhi is None:
                t_a = None
            else:
                t_a = float(base_temperature) + uhi * float(uhi_factor)

            feature[field_name] = t_a
            zonal_layer.updateFeature(feature)

        zonal_layer.commitChanges()
        return zonal_layer

    # -----------------------------
    # Zonal UHI (uses SVF + Bowen/veg rasters)
    # -----------------------------
    def calculate_zonal_uhi(
        self,
        zonal_layer: QgsVectorLayer,
        bowen_ratio_layer: str | QgsRasterLayer,
        svf_layer: str | QgsRasterLayer,
        t_min=27.2,
        t_max=29.1,
        average_wind_speed=7.5,
    ) -> QgsVectorLayer:
        """
        Calculates UHI directly on the ORIGINAL zonal_layer.
        """
        svf_obj, _ = self.convert_raster_layer_to_qgs_and_path(svf_layer)
        br_obj, _ = self.convert_raster_layer_to_qgs_and_path(bowen_ratio_layer)

        if not svf_obj.isValid():
            raise Exception("SVF raster is invalid")
        if not br_obj.isValid():
            raise Exception("Bowen ratio raster is invalid")

        # Zonal stats: SVF mean
        zs_svf = QgsZonalStatistics(
            zonal_layer,
            svf_obj,
            attributePrefix="svf_",
            stats=QgsZonalStatistics.Mean,
        )
        zs_svf.calculateStatistics(None)
        zonal_layer.updateFields()

        # Zonal stats: Bowen/veg mean
        zs_br = QgsZonalStatistics(
            zonal_layer,
            br_obj,
            attributePrefix="veg_",
            stats=QgsZonalStatistics.Mean,
        )
        zs_br.calculateStatistics(None)
        zonal_layer.updateFields()

        field_name = "uhi"
        if field_name not in [f.name() for f in zonal_layer.fields()]:
            zonal_layer.dataProvider().addAttributes([QgsField(field_name, QVariant.Double)])
            zonal_layer.updateFields()

        zonal_layer.startEditing()

        temp_diff = float(t_max) - float(t_min)
        base_value = (663.0 * (temp_diff**3)) / float(average_wind_speed)
        base_value = base_value**0.25

        for feature in zonal_layer.getFeatures():
            svf_mean = self._to_float_or_none(feature["svf_mean"])
            veg_mean = self._to_float_or_none(feature["veg_mean"])

            if svf_mean is None or veg_mean is None:
                uhi = None
            else:
                uhi = (2.0 - svf_mean - veg_mean) * base_value

            feature[field_name] = uhi
            zonal_layer.updateFeature(feature)

        zonal_layer.commitChanges()
        return zonal_layer

    # -----------------------------
    # Wet-bulb temperature (Tw)
    # -----------------------------
    def calculate_wet_bulb_temp(self, zonal_layer: QgsVectorLayer, t_a_field="t_a", r_h=44.0) -> QgsVectorLayer:
        field_name = "t_w"
        if field_name not in [field.name() for field in zonal_layer.fields()]:
            zonal_layer.dataProvider().addAttributes([QgsField(field_name, QVariant.Double)])
            zonal_layer.updateFields()

        zonal_layer.startEditing()
        for feature in zonal_layer.getFeatures():
            t_a = self._to_float_or_none(feature[t_a_field])

            if t_a is None:
                wet_bulb = None
            else:
                temp_val = t_a
                wet_bulb = (
                    temp_val * math.atan(0.151977 * math.sqrt(float(r_h) + 8.313659))
                    + math.atan(temp_val + float(r_h))
                    - math.atan(float(r_h) - 1.676331)
                    + 0.00391838 * (float(r_h) ** 1.5) * math.atan(0.023101 * float(r_h))
                    - 4.686035
                )

            feature[field_name] = wet_bulb
            zonal_layer.updateFeature(feature)

        zonal_layer.commitChanges()
        return zonal_layer

    # -----------------------------
    # PET partial (sun)
    # -----------------------------
    def calculate_zonal_part_pet_sun(
        self,
        zonal_layer: QgsVectorLayer,
        t_a_field: str = "t_a",
        t_w_field: str = "t_w",
        u_field: str = "u",
        phi: float = 44.0,
        q_gl: float = 663.0,
    ) -> QgsVectorLayer:
        field_name = "pet_sun_partial"
        if field_name not in [field.name() for field in zonal_layer.fields()]:
            zonal_layer.dataProvider().addAttributes([QgsField(field_name, QVariant.Double)])
            zonal_layer.updateFields()

        zonal_layer.startEditing()
        for feature in zonal_layer.getFeatures():
            t_a = self._to_float_or_none(feature[t_a_field])
            t_w = self._to_float_or_none(feature[t_w_field])
            u = self._to_float_or_none(feature[u_field])

            if t_a is None or t_w is None or u is None or u <= 0:
                pet_sun_partial = None
            else:
                pet_sun_partial = (
                    -13.26
                    + 1.25 * t_a
                    + 0.011 * float(q_gl)
                    - 3.37 * math.log(u)
                    + 0.078 * t_w
                    + 0.0055 * float(q_gl) * math.log(u)
                    + 5.56 * math.sin(float(phi))
                    - 0.0103 * float(q_gl) * math.log(u) * math.sin(float(phi))
                )

            feature[field_name] = pet_sun_partial
            zonal_layer.updateFeature(feature)

        zonal_layer.commitChanges()
        return zonal_layer

    # -----------------------------
    # PET partial (shadow)
    # -----------------------------
    def calculate_zonal_part_pet_shadow(
        self,
        zonal_layer: QgsVectorLayer,
        t_a_field: str = "t_a",
        t_w_field: str = "t_w",
        u_field: str = "u",
    ) -> QgsVectorLayer:
        field_name = "pet_shadow_partial"
        if field_name not in [field.name() for field in zonal_layer.fields()]:
            zonal_layer.dataProvider().addAttributes([QgsField(field_name, QVariant.Double)])
            zonal_layer.updateFields()

        zonal_layer.startEditing()
        for feature in zonal_layer.getFeatures():
            t_a = self._to_float_or_none(feature[t_a_field])
            t_w = self._to_float_or_none(feature[t_w_field])
            u = self._to_float_or_none(feature[u_field])

            if t_a is None or t_w is None or u is None or u <= 0:
                pet_shadow_partial = None
            else:
                pet_shadow_partial = -12.14 + 1.25 * t_a - 1.47 * math.log(u) + 0.060 * t_w

            feature[field_name] = pet_shadow_partial
            zonal_layer.updateFeature(feature)

        zonal_layer.commitChanges()
        return zonal_layer

    # -----------------------------
    # Total PET (sun): raster calculator
    # -----------------------------
    def calculate_total_pet_sun(
        self,
        partial_pet_layer: str | QgsRasterLayer,
        br_layer_path: str | QgsRasterLayer,
        svf_layer_path: str | QgsRasterLayer,
        output_path: str,
    ) -> QgsRasterLayer:
        import processing

        feedback = QgsProcessingFeedback()

        partial_pet_obj, partial_pet_path = self.convert_raster_layer_to_qgs_and_path(partial_pet_layer)
        br_obj, br_path = self.convert_raster_layer_to_qgs_and_path(br_layer_path)
        svf_obj, svf_path = self.convert_raster_layer_to_qgs_and_path(svf_layer_path)

        for layer in [partial_pet_obj, br_obj, svf_obj]:
            if not layer.isValid():
                raise Exception(f"Raster layer is invalid: {layer.name()}")

        # IMPORTANT: Align B and C to A's grid (pixel size + origin + CRS)
        aligned_dir = "/data/uhi/aligned"
        br_aligned = os.path.join(aligned_dir, "br_aligned_to_partial_pet.tif")
        svf_aligned = os.path.join(aligned_dir, "svf_aligned_to_partial_pet.tif")

        br_input = self._ensure_aligned_to_reference(br_path, partial_pet_obj, br_aligned)
        svf_input = self._ensure_aligned_to_reference(svf_path, partial_pet_obj, svf_aligned)

        params = {
            "INPUT_A": partial_pet_path,
            "BAND_A": 1,
            "INPUT_B": br_input,
            "BAND_B": 1,
            "INPUT_C": svf_input,
            "BAND_C": 1,
            "FORMULA": "A + 0.546 * B + 1.94 * C",
            "NO_DATA": None,
            "EXTENT_OPT": 0,  # 0 = intersect
            "PROJWIN": partial_pet_obj.extent(),
            "RTYPE": 5,  # Float32
            "OUTPUT": output_path,
        }

        result = processing.run("gdal:rastercalculator", params, feedback=feedback)
        total_pet_layer = QgsRasterLayer(result["OUTPUT"], os.path.basename(output_path))

        if not total_pet_layer.isValid():
            raise Exception("Failed to create total PET raster")

        return total_pet_layer

    # -----------------------------
    # Total PET (shadow): raster calculator
    # -----------------------------
    def calculate_total_pet_shadow(
        self,
        partial_pet_layer: str | QgsRasterLayer,
        svf_layer_path: str | QgsRasterLayer,
        t_a_layer_path: str | QgsRasterLayer,
        output_path: str,
        q_diff=0.2,
    ) -> QgsRasterLayer:
        import processing

        feedback = QgsProcessingFeedback()
        boltzmann_const = 5.670374419 * (10 ** (-8))

        partial_pet_obj, partial_pet_path = self.convert_raster_layer_to_qgs_and_path(partial_pet_layer)
        svf_obj, svf_path = self.convert_raster_layer_to_qgs_and_path(svf_layer_path)
        ta_obj, ta_path = self.convert_raster_layer_to_qgs_and_path(t_a_layer_path)

        for layer in [partial_pet_obj, svf_obj, ta_obj]:
            if not layer.isValid():
                raise Exception(f"Raster layer is invalid: {layer.name()}")

        # IMPORTANT: Align B and C to A's grid
        aligned_dir = "/data/uhi/aligned"
        svf_aligned = os.path.join(aligned_dir, "svf_aligned_to_partial_shadow_pet.tif")
        ta_aligned = os.path.join(aligned_dir, "ta_aligned_to_partial_shadow_pet.tif")

        svf_input = self._ensure_aligned_to_reference(svf_path, partial_pet_obj, svf_aligned)
        ta_input = self._ensure_aligned_to_reference(ta_path, partial_pet_obj, ta_aligned)

        params = {
            "INPUT_A": partial_pet_path,
            "BAND_A": 1,
            "INPUT_B": svf_input,
            "BAND_B": 1,
            "INPUT_C": ta_input,
            "BAND_C": 1,
            "FORMULA": (
                f"A + 0.015 * B * {float(q_diff)} + 0.0060 * (1 - B) * {boltzmann_const} * ((C + 273.15) ** 4)"
            ),
            "NO_DATA": None,
            "EXTENT_OPT": 0,  # 0 = intersect
            "PROJWIN": partial_pet_obj.extent(),
            "RTYPE": 5,  # Float32
            "OUTPUT": output_path,
        }

        result = processing.run("gdal:rastercalculator", params, feedback=feedback)
        total_pet_layer = QgsRasterLayer(result["OUTPUT"], os.path.basename(output_path))

        if not total_pet_layer.isValid():
            raise Exception("Failed to create total PET raster")

        return total_pet_layer

    # -----------------------------
    # Raster layer conversion helper
    # -----------------------------
    def convert_raster_layer_to_qgs_and_path(self, layer: str | QgsRasterLayer) -> tuple[QgsRasterLayer, str]:
        if isinstance(layer, str):
            layer_obj = QgsRasterLayer(layer, os.path.basename(layer))
            layer_path = layer
        else:
            layer_obj = layer
            layer_path = layer.source()

        if not layer_obj.isValid():
            raise Exception(f"Raster layer is invalid: {layer_obj.name()}")

        return layer_obj, layer_path

    # -----------------------------
    # Total PET map: combines sun/shadow
    # -----------------------------
    def calculate_total_pet_map(
        self,
        shadow_map: str | QgsRasterLayer,
        sun_pet: str | QgsRasterLayer,
        shadow_pet: str | QgsRasterLayer,
        output_path: str,
        shadow_threshold: float = 127,
    ):
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

        # Align shadow map to sun PET grid
        self.raster_service.adjust_raster_pixel_resolution(shadow_map_path, sun_pet_obj, aligned_shadow_map_path)

        # (Optional but safe) Ensure shadow PET is also aligned to sun PET grid
        aligned_dir = "/data/uhi/aligned"
        shadow_pet_aligned_path = os.path.join(aligned_dir, "shadow_pet_aligned_to_sun_pet.tif")
        shadow_pet_input = self._ensure_aligned_to_reference(shadow_pet_path, sun_pet_obj, shadow_pet_aligned_path)

        params = {
            "INPUT_A": sun_pet_path,
            "BAND_A": 1,
            "INPUT_B": aligned_shadow_map_path,
            "BAND_B": 1,
            "INPUT_C": shadow_pet_input,
            "BAND_C": 1,
            "FORMULA": f"(A * (B > {float(shadow_threshold)})) + (C * (B <= {float(shadow_threshold)}))",
            "NO_DATA": None,
            "EXTENT_OPT": 0,  # 0 = intersect
            "PROJWIN": shadow_map_obj.extent(),
            "RTYPE": 5,  # Float32
            "OUTPUT": output_path,
        }

        result = processing.run("gdal:rastercalculator", params, feedback=feedback)
        total_pet_layer = QgsRasterLayer(result["OUTPUT"], os.path.basename(output_path))
        return total_pet_layer