import { useEffect, useState } from "react";
import { Cesium3DTileset } from "resium";
import { IonResource, ShadowMode } from "cesium";

// Cesium Ion asset 2275207 — Google Photorealistic 3D Tiles
const ASSET_ID = 2275207;

type Props = {
	shadowsEnabled?: boolean;
};

export function GooglePhotorealisticTileset({ shadowsEnabled = false }: Props) {
	const [url, setUrl] = useState<IonResource | null>(null);

	useEffect(() => {
		IonResource.fromAssetId(ASSET_ID).then(setUrl).catch(console.error);
	}, []);

	if (!url) return null;

	return (
		<Cesium3DTileset
			url={url}
			shadows={shadowsEnabled ? ShadowMode.ENABLED : ShadowMode.DISABLED}
		/>
	);
}
