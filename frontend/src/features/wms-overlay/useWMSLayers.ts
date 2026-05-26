import { useEffect, useMemo } from 'react';
import type { Layer, PickingInfo } from '@deck.gl/core';
import { makeWmsLayer } from './lib/wmsLayer';
import { useQgisFeatureInfo } from './lib/qgisFeatureInfo';
import type { QgisLayerId } from './lib/qgisLayers';
import { useWMSLegend } from './useWMSLegend';

export const WMS_BOUNDS: [number, number, number, number] = [
	3.588347, // west
	51.4626817, // south
	3.6581358, // east
	51.5199357, // north
];

export const WMS_WIDTH = 2048;
export const WMS_HEIGHT = 2048;

type UseWMSLayersOpts = {
	showOverlay: boolean;
	overlayLayerId: QgisLayerId;
	objectsVersion: number;
};

export function useWMSLayers({ showOverlay, overlayLayerId, objectsVersion }: UseWMSLayersOpts) {
	const WMS_BASE_URL = '/backend/qgis/wms';
	const wmsLayer = useMemo<Layer | null>(() => {
		if (!showOverlay) return null;

		return makeWmsLayer({
			id: `wms-overlay-${overlayLayerId}-${objectsVersion}`,
			baseUrl: WMS_BASE_URL,
			layerName: overlayLayerId,
			bounds: WMS_BOUNDS,
			minZoom: 0,
			maxZoom: 24,
			transparent: true,
			opacity: 1,
			cacheBuster: objectsVersion,
		});
	}, [showOverlay, overlayLayerId, objectsVersion]);

	const {
		legend,
		isLoading: isLegendLoading,
		error: legendError,
	} = useWMSLegend({
		enabled: true,
	});

	const { featureInfo, request, clear } = useQgisFeatureInfo({
		bounds: WMS_BOUNDS,
		width: WMS_WIDTH,
		height: WMS_HEIGHT,
		baseUrl: WMS_BASE_URL,
		layerName: overlayLayerId,
	});

	useEffect(() => {
		if (!showOverlay) {
			clear();
		}
	}, [showOverlay, clear]);

	const handleMapClick = (info: PickingInfo): void => {
		if (!showOverlay) return;
		if (!info.coordinate) return;

		const [lon, lat] = info.coordinate as [number, number];
		void request(lon, lat);
	};

	return {
		wmsLayer,
		featureInfo,
		legend,
		isLegendLoading,
		legendError,
		handleMapClick,
	};
}
