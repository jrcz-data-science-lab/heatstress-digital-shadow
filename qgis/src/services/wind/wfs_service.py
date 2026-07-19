"""Service for handling WFS and OGC API Features data sources."""

from qgis.core import QgsVectorLayer, QgsRectangle
from src.utils.layer_utils import (
    load_vector_layer,
    export_layer_to_geopackage,
)


class WfsService:
    """Service for loading and exporting WFS/OAPIF data."""

    def _get_bbox_string(self, extent: QgsRectangle) -> str:
        """
        Convert QgsRectangle extent to bbox string.

        :param QgsRectangle extent: Extent rectangle
        :return: Comma-separated bbox string
        """
        return f"{extent.xMinimum()},{extent.yMinimum()},{extent.xMaximum()},{extent.yMaximum()}"

    def import_buildings(
        self,
        output_geopackage_path: str,
        extent: QgsRectangle,
    ) -> dict:
        """
        Import buildings from PDOK BAG WFS service.

        :param str output_geopackage_path: Path where GeoPackage will be saved
        :param QgsRectangle extent: Extent rectangle for filtering
        :return: Dictionary with output path and layer object
        """
        bbox_str = self._get_bbox_string(extent)
        wfs_url = f"https://service.pdok.nl/lv/bag/wfs/v2_0?bbox={bbox_str}"
        connection_string = f"url={wfs_url} typename=bag:pand"

        wfs_layer = QgsVectorLayer(connection_string, "BAG Buildings", "WFS")

        if not wfs_layer.isValid():
            raise ValueError(f"Failed to load WFS layer from {wfs_url}")

        exported_path = export_layer_to_geopackage(wfs_layer, output_geopackage_path)
        exported_layer = load_vector_layer(exported_path, "BAG Buildings")

        return {
            "path": exported_path,
            "layer": exported_layer,
        }

    def import_trees(
        self,
        output_geopackage_path: str,
        extent: QgsRectangle,
    ) -> dict:
        """
        Import trees from PDOK BGT OGC API Features service.

        :param str output_geopackage_path: Path where GeoPackage will be saved
        :param QgsRectangle extent: Extent rectangle for filtering
        :return: Dictionary with output path and layer object
        """
        connection_string = (
            "url='https://api.pdok.nl/lv/bgt/ogc/v1_0' "
            "typename='vegetatieobject_punt' "
            "restrictToRequestBBOX='1'"
        )

        wfs_layer = QgsVectorLayer(connection_string, "BGT Trees", "OAPIF")

        if not wfs_layer.isValid():
            raise ValueError(f"Failed to load OAPIF layer from PDOK BGT")

        # Export with extent filter - this triggers the OAPIF request with the specified extent
        exported_path = export_layer_to_geopackage(wfs_layer, output_geopackage_path, extent)
        exported_layer = load_vector_layer(exported_path, "BGT Trees")

        return {
            "path": exported_path,
            "layer": exported_layer,
        }
