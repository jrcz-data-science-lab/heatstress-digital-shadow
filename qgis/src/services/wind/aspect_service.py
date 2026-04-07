import os
from src.services.raster_service import RasterService


class AspectService:
    """
    Service for calculating and separating aspect directions from height layers.

    Full pipeline:
    1. Calculate aspect from a height raster (trees-height / buildings-height) using GDAL Aspect.
    2. Separate the aspect into 4 directional bands (N=1, E=2, S=3, W=4).
    3. Multiply each direction by the object mask to isolate only tree/building pixels facing that direction.
    4. Produce 8 masked outputs: 4 directions x 2 object types (trees + buildings).
    """

    DIRECTIONS = {
        "north": 1,
        "east": 2,
        "south": 3,
        "west": 4,
    }

    def __init__(self):
        self.raster_service = RasterService()

    def calculate_aspect(
        self,
        height_layer_path: str,
        output_path: str,
    ) -> dict:
        """
        Calculate aspect from a height raster using GDAL Aspect.

        :param str height_layer_path: Path to input height raster (e.g. trees-height.tif)
        :param str output_path: Path to save the output aspect raster
        :return: Dictionary with 'path' and 'layer' keys
        """
        layer = self.raster_service.gdal_aspect(height_layer_path, output_path)
        return {"path": output_path, "layer": layer}

    def separate_aspect_directions(
        self,
        aspect_path: str,
        output_path: str,
    ) -> dict:
        """
        Separate a continuous aspect raster (0-360) into discrete direction values.

        Output pixel values:
        - 1 = North  (315-360 and 0-45 degrees)
        - 2 = East   (45-135 degrees)
        - 3 = South  (135-225 degrees)
        - 4 = West   (225-315 degrees)
        
        :param str aspect_path: Path to input aspect raster
        :param str output_path: Path for the output direction-coded raster
        :return: Dictionary with 'path' and 'layer' keys
        """
        formula = (
            "((A >= 315) + ((A >= 0) * (A < 45))) * 1 "
            "+ ((A >= 45) * (A < 135)) * 2 "
            "+ ((A >= 135) * (A < 225)) * 3 "
            "+ ((A >= 225) * (A < 315)) * 4"
        )
        layer = self.raster_service.gdal_raster_calculator(
            formula=formula,
            input_rasters={"A": aspect_path},
            output_path=output_path,
            no_data=None,
            rtype=0
        )
        return {"path": output_path, "layer": layer}

    def extract_directional_aspect(
        self,
        aspect_separated_path: str,
        mask_path: str,
        direction_value: int,
        output_path: str,
    ) -> dict:
        """
        Extract one direction from a separated aspect layer, masked to a single object type.

        :param str aspect_separated_path: Path to aspect-separated raster (values 1-4)
        :param str mask_path: Path to binary object mask (1 = object present, 0 = absent)
        :param int direction_value: Direction to extract (1=N, 2=E, 3=S, 4=W)
        :param str output_path: Path for the output masked direction raster
        :return: Dictionary with 'path' and 'layer' keys
        """
        formula = f"(A == {direction_value}) * (B == 1)"
        layer = self.raster_service.gdal_raster_calculator(
            formula=formula,
            input_rasters={"A": aspect_separated_path, "B": mask_path},
            output_path=output_path,
            no_data=None,
            rtype=0
        )
        return {"path": output_path, "layer": layer}

    def calculate_buildings_aspect(
        self,
        buildings_height_path: str,
        buildings_mask_path: str,
        output_dir: str,
    ) -> dict:
        """
        Bin aspect for buildings and extract directional masks.

        :param str buildings_height_path: Path to buildings height raster
        :param str buildings_mask_path: Path to binary buildings mask raster
        :param str output_dir: Directory for all output files
        :return: Dictionary with 'aspect', 'aspect_separated', and 'north'/'east'/'south'/'west' keys.
                 Each value is a dict with 'path' and 'layer' keys.
        """
        aspect_path = os.path.join(output_dir, "buildings-aspect.tif")
        aspect_sep_path = os.path.join(output_dir, "buildings-aspect-separated.tif")

        results = {
            "aspect": self.calculate_aspect(buildings_height_path, aspect_path),
            "aspect_separated": self.separate_aspect_directions(aspect_path, aspect_sep_path),
        }

        for direction_name, direction_value in self.DIRECTIONS.items():
            out_path = os.path.join(output_dir, f"buildings-aspect-{direction_name}.tif")
            results[direction_name] = self.extract_directional_aspect(
                aspect_separated_path=aspect_sep_path,
                mask_path=buildings_mask_path,
                direction_value=direction_value,
                output_path=out_path,
            )

        return results

    def calculate_trees_aspect(
        self,
        trees_height_path: str,
        trees_mask_path: str,
        output_dir: str,
    ) -> dict:
        """
        Bin aspect for trees and extract directional masks.

        :param str trees_height_path: Path to trees height raster
        :param str trees_mask_path: Path to binary trees mask raster
        :param str output_dir: Directory for all output files
        :return: Dictionary with 'aspect', 'aspect_separated', and 'north'/'east'/'south'/'west' keys.
                 Each value is a dict with 'path' and 'layer' keys.
        """
        aspect_path = os.path.join(output_dir, "trees-aspect.tif")
        aspect_sep_path = os.path.join(output_dir, "trees-aspect-separated.tif")

        results = {
            "aspect": self.calculate_aspect(trees_height_path, aspect_path),
            "aspect_separated": self.separate_aspect_directions(aspect_path, aspect_sep_path),
        }

        for direction_name, direction_value in self.DIRECTIONS.items():
            out_path = os.path.join(output_dir, f"trees-aspect-{direction_name}.tif")
            results[direction_name] = self.extract_directional_aspect(
                aspect_separated_path=aspect_sep_path,
                mask_path=trees_mask_path,
                direction_value=direction_value,
                output_path=out_path,
            )

        return results