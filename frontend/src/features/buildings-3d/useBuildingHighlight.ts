import { useCallback, useEffect, useState } from "react";
import {
	fetchBuildingMetadataByBagId,
	fetchBuildingMetadataByRD,
	type BuildingApiResponse,
	type TileProperties,
} from "./lib/buildingMetadataApi";
import { lonLatToRd } from "../../map/utils/crs";

type UseBuildingHighlightOptions = {
	enabled: boolean;
};

export function useBuildingHighlight({ enabled }: UseBuildingHighlightOptions) {
	const [buildingInfo, setBuildingInfo] = useState<BuildingApiResponse | null>(null);
	const [tileProperties, setTileProperties] = useState<TileProperties | null>(null);

	useEffect(() => {
		if (!enabled) {
			setBuildingInfo(null);
			setTileProperties(null);
		}
	}, [enabled]);

	/**
	 * Call on every building click when buildings mode is enabled.
	 * - bagId: fetches metadata directly by BAG ID (preferred — read from the clicked tile feature)
	 * - tileProperties: all 3D BAG tileset attributes read at click time, no extra API call needed
	 * Falls back to a coordinate-based spatial search when bagId is unavailable.
	 */
	const handleBuildingClick = useCallback(
		(lon: number, lat: number, bagId?: string, tileProp?: TileProperties) => {
			if (!enabled) {
				setBuildingInfo(null);
				setTileProperties(null);
				return;
			}

			setBuildingInfo(null);
			setTileProperties(tileProp ?? null);

			const [xRD, yRD] = lonLatToRd(lon, lat);
			const fetchPromise = bagId
				? fetchBuildingMetadataByBagId(bagId)
				: fetchBuildingMetadataByRD(xRD, yRD);

			void fetchPromise
				.then((data) => {
					setBuildingInfo(data);
				})
				.catch((err) => {
					console.error("Failed to fetch building metadata:", err);
					setBuildingInfo(null);
				});
		},
		[enabled],
	);

	return {
		handleBuildingClick,
		buildingInfo,
		tileProperties,
	};
}
