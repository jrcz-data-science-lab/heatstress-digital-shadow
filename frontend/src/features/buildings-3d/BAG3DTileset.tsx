import { useMemo } from "react";
import { Cesium3DTileset } from "resium";
import { Cesium3DTileStyle, Cartesian3, Matrix4 } from "cesium";

// 3D BAG — LoD2.2 3D Tiles (Netherlands national building dataset)
// Docs: https://docs.3dbag.nl/en/delivery/webservices/
const LOD22_URL =
	"https://data.3dbag.nl/v20250903/cesium3dtiles/lod22/tileset.json";

// Geographic center of the Netherlands — used to compute the ECEF radial direction
// for the height offset translation.
const NL_LON = 5.3;
const NL_LAT = 52.1;

type Props = {
	color?: string;
	heightOffset?: number;
};

export function BAG3DTileset({ color = "#ffffff", heightOffset = 0 }: Props) {
	const sanitizedColor = color.replace(/'/g, "\\'");
	const style = useMemo(
		() => new Cesium3DTileStyle({ color: `color('${sanitizedColor}')` }),
		[sanitizedColor],
	);

	// Translate the tileset radially (along the ECEF up-direction at the NL center).
	// Matrix4.IDENTITY when heightOffset is 0 so no transform is applied.
	const modelMatrix = useMemo(() => {
		if (heightOffset === 0) return Matrix4.IDENTITY.clone();
		const surface = Cartesian3.fromDegrees(NL_LON, NL_LAT, 0);
		const shifted = Cartesian3.fromDegrees(NL_LON, NL_LAT, heightOffset);
		const translation = Cartesian3.subtract(shifted, surface, new Cartesian3());
		return Matrix4.fromTranslation(translation);
	}, [heightOffset]);

	return (
		<Cesium3DTileset url={LOD22_URL} style={style} modelMatrix={modelMatrix} />
	);
}
