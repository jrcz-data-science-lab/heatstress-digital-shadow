import { useEffect, useState } from 'react';
import { Cesium3DTileset, useCesium } from 'resium';
import { IonResource, ShadowMode } from 'cesium';

// Cesium Ion asset 2275207 — Google Photorealistic 3D Tiles
const ASSET_ID = 2275207;

type Props = {
	shadowsEnabled?: boolean;
};

export function GooglePhotorealisticTileset({ shadowsEnabled = false }: Props) {
	const { viewer } = useCesium();
	const [url, setUrl] = useState<IonResource | null>(null);

	// Resolve the Ion resource URL once on mount
	useEffect(() => {
		IonResource.fromAssetId(ASSET_ID).then(setUrl).catch(console.error);
	}, []);

	// Google Photorealistic 3D Tiles contain their own terrain and ground surface.
	// Leaving the Cesium globe visible causes the tiles to appear to float above
	// the map. Hide it while this tileset is active; restore on unmount.
	useEffect(() => {
		if (!viewer) return;
		viewer.scene.globe.show = false;
		return () => {
			viewer.scene.globe.show = true;
		};
	}, [viewer]);

	if (!url) return null;

	return (
		<Cesium3DTileset
			url={url}
			// Google Photorealistic Tiles bundle both buildings AND ground in one mesh,
			// so ENABLED is correct — the ground portion must receive shadows from the
			// building portions. Self-shadow acne is minimal on photogrammetry meshes
			// because they have smooth normals (unlike the angular BAG LoD2.2 geometry).
			shadows={shadowsEnabled ? ShadowMode.ENABLED : ShadowMode.DISABLED}
		/>
	);
}
