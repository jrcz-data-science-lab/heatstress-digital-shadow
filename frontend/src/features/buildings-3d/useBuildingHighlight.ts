import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PickingInfo } from '@deck.gl/core';
import { PolygonLayer } from '@deck.gl/layers';
import { lonLatToRd, rdToLonLat } from '../../map/utils/crs';
import { fetchBuildingMetadataByRD, type BuildingApiResponse } from './lib/buildingMetadataApi';

type LonLat = [number, number];

type UseBuildingHighlightOptions = {
	enabled: boolean;
};

type HighlightState = {
	polygon: LonLat[];
	height: number;
};

type PolygonData = HighlightState;

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
	if (!Number.isFinite(areaM2) || areaM2 <= 0) {
		return 15;
	}

	const base = 8;
	const extra = Math.sqrt(areaM2);
	return base + extra * 0.4;
}

export function useBuildingHighlight({ enabled }: UseBuildingHighlightOptions) {
	const [highlight, setHighlight] = useState<HighlightState | null>(null);
	const [buildingInfo, setBuildingInfo] = useState<BuildingApiResponse | null>(null);

	useEffect(() => {
		if (!enabled) {
			setHighlight(null);
			setBuildingInfo(null);
		}
	}, [enabled]);

	const handleBuildingClick = useCallback(
		(info: PickingInfo) => {
			if (!enabled) {
				setHighlight(null);
				setBuildingInfo(null);
				return;
			}

			// Check if there is an object where the user clicks, otherwise dont proceed with api call.
			if (!info.object) {
				setHighlight(null);
				setBuildingInfo(null);
				return;
			}

			if (!info.coordinate) {
				setHighlight(null);
				setBuildingInfo(null);
				return;
			}

			const [lon, lat] = info.coordinate as LonLat;
			const [xRD, yRD] = lonLatToRd(lon, lat);

			setBuildingInfo(null);

			void fetchBuildingMetadataByRD(xRD, yRD)
				.then((data) => {
					const geom = data?.pand_data?.geometry;
					if (!geom || geom.type !== 'Polygon' || !geom.coordinates?.length) {
						setHighlight(null);
						setBuildingInfo(null);
						return;
					}

					const ringRD = geom.coordinates[0];
					const coordsRD: [number, number][] = ringRD.map(([x, y]: number[]) => [x, y]);

					const areaM2 = polygonAreaRD(coordsRD);
					const estimatedHeight = estimateHeightFromArea(areaM2);

					const ringLonLat: LonLat[] = coordsRD.map(([x, y]) =>
						rdToLonLat(x, y),
					) as LonLat[];

					setHighlight({
						polygon: ringLonLat,
						height: estimatedHeight,
					});
					setBuildingInfo(data);
				})
				.catch((err) => {
					console.error('Failed to fetch building metadata:', err);
					// On error: hide highlight + card
					setHighlight(null);
					setBuildingInfo(null);
				});
		},
		[enabled],
	);

	const highlightLayer = useMemo(() => {
		if (!highlight) return null;

		const data: PolygonData[] = [highlight];

		return new PolygonLayer<PolygonData>({
			id: 'building-highlight',
			data,
			getPolygon: (d) => d.polygon,
			filled: true,
			stroked: true,
			extruded: true,
			getElevation: (d) => d.height,
			elevationScale: 1,
			getFillColor: [255, 255, 0, 150],
			getLineColor: [0, 0, 0, 255],
			lineWidthUnits: 'pixels',
			lineWidthMinPixels: 3,
			getLineWidth: 3,
			pickable: false,
		});
	}, [highlight]);

	return {
		highlightLayer,
		handleBuildingClick,
		buildingInfo,
	};
}
