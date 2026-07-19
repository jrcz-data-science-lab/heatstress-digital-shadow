import { useMemo } from 'react';
import { Cesium3DTileset } from 'resium';
import {
	Cesium3DTileStyle,
	Cesium3DTileColorBlendMode,
	Cartesian3,
	Matrix4,
	ShadowMode,
} from 'cesium';

// 3D BAG — LoD2.2 3D Tiles (Netherlands national building dataset)
// Docs: https://docs.3dbag.nl/en/delivery/webservices/
const LOD22_URL = 'https://data.3dbag.nl/v20250903/cesium3dtiles/lod22/tileset.json';

// Geographic center of Middelburg — used to compute the ECEF radial (up) direction
// for the height offset translation. Using the actual project location ensures the
// translation vector is vertical here, not tilted from a distant reference point.
const NL_LON = 3.613;
const NL_LAT = 51.5;

const DEFAULT_COLOR = "color('rgb(200, 205, 212)')";
const SELECTED_COLOR_HIGHLIGHT = "color('yellow')";

type Props = {
	heightOffset?: number;
	/** Numeric BAG identificatie of the selected building (without NL.IMBAG.Pand. prefix).
	 *  All tile features whose identificatie matches are highlighted yellow. */
	selectedBagId?: string | null;
	/** When true the tileset casts and receives shadows from the Cesium sun. */
	shadowsEnabled?: boolean;
};

export function BAG3DTileset({ heightOffset = 0, selectedBagId, shadowsEnabled = false }: Props) {
	// Translate the tileset radially (along the ECEF up-direction at the NL center).
	// Matrix4.IDENTITY when heightOffset is 0 so no transform is applied.
	const modelMatrix = useMemo(() => {
		if (heightOffset === 0) return Matrix4.IDENTITY.clone();
		const surface = Cartesian3.fromDegrees(NL_LON, NL_LAT, 0);
		const shifted = Cartesian3.fromDegrees(NL_LON, NL_LAT, heightOffset);
		const translation = Cartesian3.subtract(shifted, surface, new Cartesian3());
		return Matrix4.fromTranslation(translation);
	}, [heightOffset]);

	// The 3D BAG tileset stores identificatie as "NL.IMBAG.Pand.<numeric-id>".
	// When a building is selected we inject a conditional style that highlights all
	// tile features belonging to that building, matching 3D BAG viewer behaviour.
	const style = useMemo(() => {
		if (!selectedBagId) {
			return new Cesium3DTileStyle({ color: DEFAULT_COLOR });
		}
		const fullId = `NL.IMBAG.Pand.${selectedBagId}`;
		return new Cesium3DTileStyle({
			color: {
				conditions: [
					[`\${identificatie} === '${fullId}'`, SELECTED_COLOR_HIGHLIGHT],
					['true', DEFAULT_COLOR],
				],
			},
		});
	}, [selectedBagId]);

	return (
		<Cesium3DTileset
			url={LOD22_URL}
			style={style}
			modelMatrix={modelMatrix}
			colorBlendMode={Cesium3DTileColorBlendMode.REPLACE}
			// CAST_ONLY: buildings project shadows onto the ground but never
			// receive shadows on their own surfaces — eliminates self-shadow acne
			// at low sun angles without losing ground-level shadow coverage.
			shadows={shadowsEnabled ? ShadowMode.CAST_ONLY : ShadowMode.DISABLED}
		/>
	);
}
