import os
import math
from qgis.PyQt.QtCore import QVariant
from qgis.core import (
    QgsVectorLayer, QgsField, QgsRasterLayer, QgsProcessingFeedback
)

class GeoJSONService:
    def calculate_wind_speed_1_2(self, zonal_layer: QgsVectorLayer, u_1_2_field="u_1_2", ff10=7.677) -> QgsVectorLayer:
        """
        Adds a 'geschaalde_u_1_2' field to the given vector layer and calculates it using:
        geschaalde_u_1_2 = ff10 * ((u_1_2 - 0.0796) * 0.9175 + 0.1254)

        :param QgsVectorLayer zonal_layer: The zonal statistics layer on which the calculation will be performed
        :param str u_1_2_field: The field in the zonal layer containing u_1_2 values
        :param float ff10: The wind speed 10m (if from KNMI / 10 to match units)
        :return: The updated QgsVectorLayer with the new field added
        """
        field_name = "geschaalde_u_1_2"
        provider = zonal_layer.dataProvider()

        if field_name not in [field.name() for field in zonal_layer.fields()]:
            provider.addAttributes([QgsField(field_name, QVariant.Double)])
            zonal_layer.updateFields()

        zonal_layer.startEditing()
        for feature in zonal_layer.getFeatures():
            u_1_2 = feature[u_1_2_field]
            if u_1_2 is None:
                geschaalde_val = None
            else:
                geschaalde_val = ff10 * ((u_1_2 - 0.0796) * 0.9175 + 0.1254)
                if geschaalde_val < 0.5:
                    geschaalde_val = ff10 - geschaalde_val
            feature[field_name] = geschaalde_val
            zonal_layer.updateFeature(feature)

        zonal_layer.commitChanges()
        return zonal_layer
