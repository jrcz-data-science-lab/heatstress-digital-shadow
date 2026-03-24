import { useCallback, useEffect, useState } from "react";
import { lonLatToRd, rdToLonLat } from "../../map/utils/crs";
import {
	fetchBuildingMetadataByBagId,
	fetchBuildingMetadataByRD,
	type BuildingApiResponse,
	type TileProperties,
} from "./lib/buildingMetadataApi";

type LonLat = [number, number];

type UseBuildingHighlightOptions = {
	enabled: boolean;
};

export type HighlightState = {
	polygon: LonLat[];
	/** Absolute roof height in metres above NAP — used as extrudedHeight */
	height: number;
	/** Absolute ground level in metres above NAP — used as polygon base height */
	groundHeight: number;
};

function polygonAreaRD(coords: [number, number][]): number {
	if (coords.length < 3) return 0;
	let area = 0;
	const n = coords.length;
	for (let i = 0; i < n; i++) {
		const [x1, y1] = coords[i];
		const [x2, y2] = coords[(i + 1) % n];
		area += x1 * y2 - x2 * y1;
	}
	return Math.abs(area) / 2;
}

function estimateHeightFromArea(areaM2: number): number {
	if (!Number.isFinite(areaM2) || areaM2 <= 0) return 15;
	const base = 8;
	const extra = Math.sqrt(areaM2);
	return base + extra * 0.4;
}

export function useBuildingHighlight({ enabled }: UseBuildingHighlightOptions) {
	const [highlight, setHighlight] = useState<HighlightState | null>(null);
	const [buildingInfo, setBuildingInfo] = useState<BuildingApiResponse | null>(null);
	const [tileProperties, setTileProperties] = useState<TileProperties | null>(null);

	useEffect(() => {
		if (!enabled) {
			setHighlight(null);
			setBuildingInfo(null);
			setTileProperties(null);
		}
	}, [enabled]);

	/**
	 * Call with the clicked lon/lat and optional tileset-derived values whenever
	 * buildings mode is enabled.
	 * - bagId: skips the spatial search and fetches metadata directly by ID
	 * - tileProperties: all 3D BAG tileset feature attributes (heights, roof type, volume…)
	 *   read at click time from the Cesium3DTileFeature — no extra API call needed.
	 */
	const handleBuildingClick = useCallback(
		(lon: number, lat: number, bagId?: string, tileProp?: TileProperties) => {
			if (!enabled) {
				setHighlight(null);
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
					const geom = data?.pand_data?.geometry;
					if (!geom || geom.type !== "Polygon" || !geom.coordinates?.length) {
						setHighlight(null);
						setBuildingInfo(null);
						return;
					}

					const ringRD = geom.coordinates[0];
					const coordsRD: [number, number][] = ringRD.map(
						([x, y]: number[]) => [x, y],
					);

					const ringLonLat: LonLat[] = coordsRD.map(([x, y]) =>
						rdToLonLat(x, y),
					) as LonLat[];

					// Use real heights from the tileset if available, otherwise estimate.
					const resolvedGroundHeight = tileProp?.h_maaiveld ?? 0;
					const resolvedRoofHeight =
						tileProp?.h_dak_50p != null
							? tileProp.h_dak_50p
							: resolvedGroundHeight + estimateHeightFromArea(polygonAreaRD(coordsRD));

					setHighlight({
						polygon: ringLonLat,
						height: resolvedRoofHeight,
						groundHeight: resolvedGroundHeight,
					});
					setBuildingInfo(data);
				})
				.catch((err) => {
					console.error("Failed to fetch building metadata:", err);
					setHighlight(null);
					setBuildingInfo(null);
				});
		},
		[enabled],
	);

	return {
		highlight,
		handleBuildingClick,
		buildingInfo,
		tileProperties,
	};
}
