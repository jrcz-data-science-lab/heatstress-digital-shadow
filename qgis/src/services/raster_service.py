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
    def validate_layer(self, layer: QgsRasterLayer, path: str, layer_type: str) -> None:
        """Validate that a raster layer was loaded successfully."""
        if not layer.isValid():
            raise ValueError(f"Failed to load {layer_type} from {path}")
    
    def cleanup_temp_files(self, *file_paths: str) -> None:
        """Remove temporary files if they exist."""
        for file_path in file_paths:
            if os.path.exists(file_path):
                os.remove(file_path)

    def load_raster_layer(self, path: str, layer: str) -> QgsRasterLayer:
        return QgsRasterLayer(path, layer)
    
    def buffer_vector_layer(
        self,
        vector_layer: QgsVectorLayer,
        distance: float = 3.0,
        output_path: str | None = None,
        segments: int = 16,
        dissolve: bool = False,
    ) -> QgsVectorLayer:
        """
        Buffer a vector layer.
        
        :param QgsVectorLayer vector_layer: Input vector layer to buffer
        :param float distance: Buffer distance in map units
        :param str output_path: Optional output path (uses temp file if not provided)
        :param int segments: Number of segments for circular buffers (default: 16)
        :param bool dissolve: Whether to dissolve overlapping buffers (default: False)
        :return: Buffered vector layer
        """
        import processing
        
        if not output_path:
            output_path = os.path.join(tempfile.gettempdir(), f"buffered_{hash(vector_layer)}.gpkg")
        
        processing.run(
            "native:buffer",
            {
                "INPUT": vector_layer,
                "DISTANCE": distance,
                "SEGMENTS": segments,
                "END_CAP_STYLE": 0,
                "JOIN_STYLE": 0,
                "MITER_LIMIT": 2,
                "DISSOLVE": dissolve,
                "OUTPUT": output_path,
            },
        )
        
        buffered_layer = QgsVectorLayer(output_path, "Buffered", "ogr")
        if not buffered_layer.isValid():
            raise ValueError(f"Failed to create buffered layer at {output_path}")
        
        return buffered_layer

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

        buffer_layer_path = os.path.join(tempfile.gettempdir(), "buffered_point.gpkg")
        self.buffer_vector_layer(vl, buffer_distance, buffer_layer_path)

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
        extent=None,
    ) -> QgsRasterLayer:
        """
        Rasterizes a vector layer based on a specific attribute field using georeferenced units.

        :param QgsVectorLayer vector_layer: Input vector layer to rasterize.
        :param str attribute_field: The attribute field whose values will be burned into the raster.
        :param str output_path: Path to the output raster (e.g., '/tmp/output.tif').
        :param float resolution: The raster resolution in georeferenced units
        :param float no_data_value: Value for pixels with no data.
        :param extent: Optional extent to use for rasterization (default: vector_layer.extent())
        :return: The rasterized layer as a QgsRasterLayer.
        :rtype: QgsRasterLayer
        """
        import processing

        feedback = QgsProcessingFeedback()

        if extent is None:
            extent = vector_layer.extent()

        # Define raster extent and resolution in georeferenced units
        params = {
            'INPUT': vector_layer,
            'FIELD': attribute_field,
            'BURN': 1, #  Source trust me (ui qgis)
            'USE_Z': False,
            'UNITS': 1,  # 1 = Georeferenced units (map units)
            'WIDTH': resolution,
            'HEIGHT': resolution,
            'EXTENT': extent,
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

    def fill_nodata_with_value(
        self,
        input_raster_path: str,
        output_path: str,
        fill_value: float = 0,
        band: int = 1,
    ) -> QgsRasterLayer:
        """
        Fills NoData pixels in a raster with a constant value.

        :param str input_raster_path: Input raster layer path with NoData pixels
        :param str output_path: Path to save the filled raster
        :param float fill_value: Value to fill NoData pixels with (default: 0)
        :param int band: Band number to process (default: 1)
        :return: QgsRasterLayer of the filled raster
        :rtype: QgsRasterLayer
        """
        import processing
        from qgis.core import QgsProcessingFeedback

        feedback = QgsProcessingFeedback()

        params = {
            'INPUT': input_raster_path,
            'BAND': band,
            'FILL_VALUE': fill_value,
            'OUTPUT': output_path
        }

        result = processing.run("native:fillnodata", params, feedback=feedback)
        filled_raster = QgsRasterLayer(result['OUTPUT'], os.path.basename(output_path))

        if not filled_raster.isValid():
            raise Exception("NoData filling with value failed — could not load output raster.")

        return filled_raster

    def gdal_raster_calculator(
        self,
        formula: str,
        input_rasters: dict[str, str] | list[str],
        output_path: str,
        no_data: float | None = None,
        rtype: int = 5,
    ) -> QgsRasterLayer:
        """
        Performs raster calculator operations using GDAL.

        :param str formula: GDAL calculator formula using A, B, C, etc. (e.g., 'A-B', '(A<0)*0 + (A>=0)*A')
        :param dict[str, str] | list[str] input_rasters: Dictionary mapping letter to path {'A': path1, 'B': path2}
                                                         or list of paths (assigned to A, B, C, etc. in order)
        :param str output_path: Path to save the output raster
        :param float | None no_data: NoData value for output (None = no NoData)
        :param int rtype: Output data type (0=Byte, 1=Int16, 2=UInt16, 3=UInt32, 4=Int32, 5=Float32, 6=Float64)
        :return: QgsRasterLayer of the calculated raster
        :rtype: QgsRasterLayer
        """
        import processing
        from qgis.core import QgsProcessingFeedback

        feedback = QgsProcessingFeedback()

        # Convert list to dict if needed
        if isinstance(input_rasters, list):
            letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
            input_rasters = {letters[i]: path for i, path in enumerate(input_rasters)}

        params = {
            'FORMULA': formula,
            'NO_DATA': no_data,
            'RTYPE': rtype,
            'OUTPUT': output_path
        }

        for letter, path in input_rasters.items():
            params[f'INPUT_{letter}'] = path
            params[f'BAND_{letter}'] = 1

        try:
            result = processing.run("gdal:rastercalculator", params, feedback=feedback)
        except Exception as e:
            raise Exception(f"GDAL raster calculation failed: {str(e)}")

        if not result or 'OUTPUT' not in result:
            raise Exception(f"GDAL raster calculation did not produce output")

        output_file = result['OUTPUT']
        
        if not os.path.exists(output_file):
            raise Exception(f"Output raster file was not created at: {output_file}")

        output_raster = QgsRasterLayer(output_file, os.path.basename(output_path))

        if not output_raster.isValid():
            error_msg = output_raster.error().message() if output_raster.error() else "Unknown error"
            raise Exception(f"Failed to load output raster from {output_file}: {error_msg}")

        return output_raster

    def raster_calculator(
        self,
        expression: str,
        layers: list,
        output_path: str,
        cellsize: float = 0,
        extent = None,
        crs = None,
    ) -> QgsRasterLayer:
        """
        Performs raster calculator operations on input layers using QGIS.

        :param str expression: Raster calculator expression (e.g., '"Layer@1" - "Layer2@1"')
        :param list layers: List of QgsRasterLayer objects to use in the calculation
        :param str output_path: Path to save the output raster
        :param float cellsize: Cell size for output (0 = use input resolution)
        :param extent: Output extent (None = use input extent)
        :param crs: Output CRS (None = use input CRS)
        :return: QgsRasterLayer of the calculated raster
        :rtype: QgsRasterLayer
        """
        import processing
        from qgis.core import QgsProcessingFeedback

        feedback = QgsProcessingFeedback()

        params = {
            'EXPRESSION': expression,
            'LAYERS': layers,
            'CELLSIZE': cellsize,
            'EXTENT': extent,
            'CRS': crs,
            'OUTPUT': output_path
        }

        result = processing.run("qgis:rastercalculator", params, feedback=feedback)
        output_raster = QgsRasterLayer(result['OUTPUT'], os.path.basename(output_path))

        if not output_raster.isValid():
            raise Exception("Raster calculation failed — could not load output raster.")

        return output_raster
      
    def adjust_raster_pixel_resolution(
        self,
        input_raster: str | QgsRasterLayer,
        target_layer_obj: QgsRasterLayer,
        resampled_output_path: str,
        resampling: int = 0,
        target_resolution: float = 1,
        nodata_value: float = -9999,
    )-> str:
        """
        Reprojects and resamples a raster to match the CRS and alignment of a target layer.

        :param input_raster: file path or QgsRasterLayer to warp
        :param target_layer_obj: QgsRasterLayer whose CRS/resolution/alignment will be matched
        :param resampled_output_path: output file path for the warped raster
        :param resampling: resampling method index (0=nearest, 1=bilinear, etc.)
        :param target_resolution: target resolution in map units
        :param nodata_value: NoData value to use in output (default: -9999)
        """
        import processing
        feedback = QgsProcessingFeedback()

        warp_params = {
            'INPUT': input_raster,
            'TARGET_CRS': target_layer_obj.crs().authid(),
            'RESAMPLING': resampling,  
            'TARGET_RESOLUTION': target_resolution,
            'NODATA': nodata_value,
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

    def gdal_aspect(
        self,
        input_raster_path: str,
        output_path: str,
    ) -> QgsRasterLayer:
        """
        Calculates the aspect of a raster using GDAL.

        :param str input_raster_path: Path to input height raster
        :param str output_path: Path to save the output aspect raster
        :return: QgsRasterLayer of the aspect raster
        :rtype: QgsRasterLayer
        """
        import processing
        from qgis.core import QgsProcessingFeedback

        feedback = QgsProcessingFeedback()

        params = {
            'INPUT': input_raster_path,
            'BAND': 1,
            'TRIG_ANGLE': False,
            'ZERO_FLAT': False,
            'COMPUTE_EDGES': True,
            'ZEVENBERGEN': False,
            'OPTIONS': '',
            'EXTRA': '',
            'OUTPUT': output_path,
        }

        result = processing.run("gdal:aspect", params, feedback=feedback)
        aspect_raster = QgsRasterLayer(result['OUTPUT'], os.path.basename(output_path))


        if not aspect_raster.isValid():
            raise Exception(f"Aspect calculation failed - could not load output raster: {output_path}")

        return aspect_raster

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
