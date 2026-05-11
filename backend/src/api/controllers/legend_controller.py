from abc import ABC
from pathlib import Path
import xml.etree.ElementTree as ET

class LegendController(ABC):
    """
    Controller that should handle all legend related functions
    """
    
    def get_legend(
        self,
    ):
        """Returns the legend overview."""

        qml_path = Path(f"/data/server/styles/new-default.qml")
        tree = ET.parse(qml_path)
        root = tree.getroot()

        renderer = root.find(".//rasterrenderer")
        shader = root.find(".//colorrampshader")

        if renderer is None or shader is None:
            raise ValueError("Invalid or unsupported QML style")

        result = {
            "renderer": {
                "type": renderer.attrib.get("type"),
                "band": int(renderer.attrib.get("band", 1)),
                "classification_min": float(renderer.attrib.get("classificationMin")),
                "classification_max": float(renderer.attrib.get("classificationMax")),
                "opacity": float(renderer.attrib.get("opacity", 1.0)),
            },
            "color_ramp": {
                "type": shader.attrib.get("colorRampType"),
                "mode": shader.attrib.get("classificationMode"),
                "clip": shader.attrib.get("clip"),
                "items": [],
            },
        }

        for item in shader.findall("item"):
            result["color_ramp"]["items"].append(
                {
                    "value": float(item.attrib["value"]),
                    "label": item.attrib.get("label"),
                    "color": item.attrib.get("color"),
                }
            )

        return result
