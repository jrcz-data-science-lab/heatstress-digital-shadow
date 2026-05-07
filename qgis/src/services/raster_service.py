import os
import tempfile
from qgis.core import (
    QgsVectorLayer, QgsRasterLayer, QgsFeature, QgsGeometry, QgsPointXY,
    QgsField, QgsProcessingFeedback, QgsVectorFileWriter
)
from qgis.PyQt.QtCore import QVariant
from typing import List
from src.api.models import Point
import shutil
import math
import random

class RasterService:
    def load_raster_layer(self, path: str, layer: str) -> QgsRasterLayer:
        return QgsRasterLayer(path, layer)

    def burn_points_to_raster(
        self,
        raster: str,
        points: List[Point], 
        crs="EPSG:28992",
        buffer_distance = 3,
        output_path: str | None = None,
        height: float = 0.4,
        sameHeight: bool = False
    ) -> str:
        import processing

        # Creating a vector layer
        # https://docs.qgis.org/3.40/en/docs/pyqgis_developer_cookbook/vector.html#from-an-instance-of-qgsvectorlayer
        vl = QgsVectorLayer(f"Point?crs={crs}", "temp_point", "memory")
        pr = vl.dataProvider()
        pr.addAttributes([QgsField("value", QVariant.Double)]) # Add Fields
        vl.updateFields() # Tell the vector layer to fetch changes from the provider

        # --- Add all points ---
        for pt in points:
            feat = QgsFeature() # Shape + Attribute
            feat.setGeometry(QgsGeometry.fromPointXY(QgsPointXY(pt.x, pt.y)))
            value = pt.height if pt.height != None and pt.height != 0 else height
            
            if sameHeight:
                value = height
                
            feat.setAttributes([value])
            pr.addFeature(feat)
        vl.updateExtents()

        # Buffer for the point (in order to have actual dimensions)
        buffer_layer_path = os.path.join(tempfile.gettempdir(), "buffered_point.gpkg") 
        processing.run(
            "native:buffer",
            {
                "INPUT": vl,
                "DISTANCE": buffer_distance,
                "SEGMENTS": 16,
                "END_CAP_STYLE": 0,
                "JOIN_STYLE": 0,
                "MITER_LIMIT": 2,
                "DISSOLVE": False,  # Merge overlapping buffers
                "OUTPUT": buffer_layer_path,
            },
        )

        if output_path:
            shutil.copyfile(raster, output_path)

            processing.run(
                "gdal:rasterize_over",
                {
                    "INPUT": buffer_layer_path,
                    "INPUT_RASTER": output_path,
                    "FIELD": "value",
                    "ADD": False,
                    "EXTRA": "",
                    "OPTIONS": "",
                },
                feedback=QgsProcessingFeedback(),
            )

            return output_path

        else:
            processing.run(
                "gdal:rasterize_over",
                {
                    "INPUT": buffer_layer_path,
                    "INPUT_RASTER": raster,
                    "FIELD": "value",
                    "ADD": False,
                    "EXTRA": "",
                    "OPTIONS": "",
                },
                feedback=QgsProcessingFeedback(),
            )

            return raster

    def rasterize_vector_layer(
        self,
        vector_layer: QgsVectorLayer,
        attribute_field: str,
        output_path: str,
        resolution: float = 1.0,
        no_data_value: float = 0.0,
    ) -> QgsRasterLayer:
        """
        Rasterizes a vector layer based on a specific attribute field using georeferenced units.

        :param QgsVectorLayer vector_layer: Input vector layer to rasterize.
        :param str attribute_field: The attribute field whose values will be burned into the raster.
        :param str output_path: Path to the output raster (e.g., '/tmp/output.tif').
        :param float resolution: The raster resolution in georeferenced units
        :param float no_data_value: Value for pixels with no data.
        :return: The rasterized layer as a QgsRasterLayer.
        :rtype: QgsRasterLayer
        """
        import processing

        feedback = QgsProcessingFeedback()

        # Define raster extent and resolution in georeferenced units
        params = {
            'INPUT': vector_layer,
            'FIELD': attribute_field,
            'BURN': 1, #  Source trust me (ui qgis)
            'USE_Z': False,
            'UNITS': 1,  # 1 = Georeferenced units (map units)
            'WIDTH': resolution,
            'HEIGHT': resolution,
            'EXTENT': vector_layer.extent(),
            'NODATA': no_data_value,
            'DATA_TYPE': 5,  # Float32
            'OUTPUT': output_path
        }

        result = processing.run("gdal:rasterize", params, feedback=feedback)
        raster_layer = QgsRasterLayer(result['OUTPUT'], os.path.basename(output_path))

        if not raster_layer.isValid():
            raise Exception(f"Rasterization failed — could not load output: {output_path}")

        return raster_layer

    def clip_raster_by_extent(
        self,
        input_raster: QgsRasterLayer,
        reference_raster: QgsRasterLayer,
        output_path: str,
        no_data_value: float = 0,
        crop_to_cutline: bool = True
    ) -> QgsRasterLayer:
        """
        Clips the first raster by the extent of the second raster.

        :param QgsRasterLayer input_raster: The raster to be clipped.
        :param QgsRasterLayer reference_raster: The raster whose extent will be used for clipping.
        :param str output_path: The path for the clipped output raster (e.g., '/tmp/clipped.tif').
        :param float no_data_value: Optional no-data value to assign to empty areas.
        :param bool crop_to_cutline: Whether to crop tightly to the reference extent.
        :return: The clipped raster layer.
        :rtype: QgsRasterLayer
        """
        import processing

        feedback = QgsProcessingFeedback()
        
        extent = reference_raster.extent()
        extent_str = f"{extent.xMinimum()},{extent.xMaximum()},{extent.yMinimum()},{extent.yMaximum()}"

        params = {
            'INPUT': input_raster,
            'PROJWIN': extent_str,
            'NODATA': no_data_value,
            'OPTIONS': '',
            'DATA_TYPE': 0,  # same as input
            'OUTPUT': output_path
        }

        result = processing.run("gdal:cliprasterbyextent", params, feedback=feedback)
        
        clipped_raster = QgsRasterLayer(result['OUTPUT'], os.path.basename(output_path))
        
        if not clipped_raster.isValid():
            raise Exception("Raster clipping failed — could not load output raster.")
        
        return clipped_raster

    def fill_nodata_gdal(
        self,
        input_raster_path: str,
        output_path: str,
        band: int = 1,
        distance: float = 10,
        iterations: int = 0,
    ) -> QgsRasterLayer:
        """
        Fills NoData pixels in a raster using GDAL's Fill NoData algorithm.

        Equivalent to running:
        gdal_fillnodata.bat <input> <output> -md <distance> -b <band>

        :param QgsRasterLayer input_raster: Input raster layer with gaps (NoData)
        :param str output_path: Path to save the filled raster (e.g. '/tmp/filled.tif')
        :param int band: Band number to process (default: 1)
        :param float distance: Maximum distance (in pixels) to search for values (default: 10)
        :param int iterations: Number of smoothing iterations (default: 0)
        :return: QgsRasterLayer of the filled raster
        :rtype: QgsRasterLayer
        """
        import processing
        from qgis.core import QgsProcessingFeedback
        import os

        feedback = QgsProcessingFeedback()

        params = {
            'INPUT': input_raster_path,
            'BAND': band,
            'DISTANCE': distance,
            'ITERATIONS': iterations,
            'MASK_LAYER': None,
            'OPTIONS': '',
            'EXTRA': '',
            'OUTPUT': output_path
        }

        result = processing.run("gdal:fillnodata", params, feedback=feedback)
        filled_raster = QgsRasterLayer(result['OUTPUT'], os.path.basename(output_path))

        if not filled_raster.isValid():
            raise Exception("NoData filling failed — could not load output raster.")

        return filled_raster
      
    def adjust_raster_pixel_resolution(
        self,
        input_raster: str | QgsRasterLayer,
        target_layer_obj: QgsRasterLayer,
        resampled_output_path: str,
        resampling: int = 0,
        target_resolution: float = 1,
    )-> str:
        import processing
        feedback = QgsProcessingFeedback()
        """
        Reprojects and resamples a raster to match the CRS and alignment of a target layer.

        :param input_raster_path: file path or QgsRasterLayer to warp
        :param target_layer_objr: QgsRasterLayer whose CRS/resolution/alignment will be matched
        :param resampled_output_path: output file path for the warped raster
        :param resampling: resampling method index (0=nearest, 1=bilinear, etc.)
        :param target_resolution: target resolution in map units
        """

        warp_params = {
            'INPUT': input_raster,
            'TARGET_CRS': target_layer_obj.crs().authid(),
            'RESAMPLING': resampling,  
            'TARGET_RESOLUTION': target_resolution,
            'OPTIONS': '',     
            'DATA_TYPE': 5,     
            'TARGET_ALIGN': True, 
            'OUTPUT': resampled_output_path
        }
        
        processing.run("gdal:warpreproject", warp_params, feedback=feedback)

        if not os.path.exists(resampled_output_path):
            raise Exception(f"Warped raster was not created at: {resampled_output_path}")

        return resampled_output_path

    def burn_points_to_raster_pixel_cloud(
        self,
        raster: str,
        points: List[Point],
        crs="EPSG:28992",
        height: float = 0.4,
        radius: float = 5.0,
        density: int = 250,
        jitter: float = 0.3,
        output_path: str | None = None,
    ):
        import processing

        # Memory point layer for cloud
        vl = QgsVectorLayer(f"Point?crs={crs}", "leaf_clouds", "memory")
        pr = vl.dataProvider()
        pr.addAttributes([QgsField("value", QVariant.Double)])
        vl.updateFields()

        # Add clustered leaf points
        for pt in points:
            pointRadius = pt.radius if pt.radius != None else radius
            leafs = self._generate_leaf_points(pt.x, pt.y, pointRadius, density, jitter)
            for (px, py) in leafs:
                feat = QgsFeature()
                feat.setGeometry(QgsGeometry.fromPointXY(QgsPointXY(px, py)))
                pointHeight = pt.height if pt.height != None else height
                feat.setAttributes([pointHeight])
                pr.addFeature(feat)

        vl.updateExtents()

        # Save to temporary gpkg
        tmpdir = tempfile.gettempdir()
        gpkg_path = os.path.join(tmpdir, "leaf_clouds.gpkg")
        QgsVectorFileWriter.writeAsVectorFormat(vl, gpkg_path, "utf-8", vl.crs(), "GPKG")

        target = output_path or raster
        if output_path:
            shutil.copyfile(raster, output_path)

        processing.run(
            "gdal:rasterize_over",
            {
                "INPUT": gpkg_path,
                "INPUT_RASTER": target,
                "FIELD": "value",
                "ADD": False
            }
        )

        return target

    def _generate_leaf_points(self, x, y, radius, density, jitter):
        pts = []
        for _ in range(density):
            # radius distribution
            r = radius * math.sqrt(random.random())
            ang = random.random() * 2 * math.pi

            # Apply jitter and coordinates
            px = x + math.cos(ang) * r + random.uniform(-jitter, jitter)
            py = y + math.sin(ang) * r + random.uniform(-jitter, jitter)
            
            pts.append((px, py))
        return pts
