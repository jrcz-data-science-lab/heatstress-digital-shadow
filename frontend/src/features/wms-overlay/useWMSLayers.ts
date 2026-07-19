import { useEffect } from 'react';
import { useQgisFeatureInfo } from './lib/qgisFeatureInfo';
import type { QgisLayerId } from './lib/qgisLayers';
import { useWMSLegend } from './useWMSLegend';

// Broad bounds covering all WMS layers in Zeeland (Middelburg, Kapelle, etc.)
export const WMS_BOUNDS: [number, number, number, number] = [
	3.3, // west
	51.3, // south
	4.2, // east
	51.7, // north
];

export const WMS_WIDTH = 2048;
export const WMS_HEIGHT = 2048;

type UseWMSLayersOpts = {
	showOverlay: boolean;
	overlayLayerId: QgisLayerId;
};

export function useWMSLayers({ showOverlay, overlayLayerId }: UseWMSLayersOpts) {
	const WMS_BASE_URL = '/backend/qgis/wms';

	const {
		legend,
		isLoading: isLegendLoading,
		error: legendError,
	} = useWMSLegend({
		enabled: showOverlay,
		layerId: overlayLayerId,
	});

	const { featureInfo, request, clear } = useQgisFeatureInfo({
		baseUrl: WMS_BASE_URL,
		layerName: overlayLayerId,
	});

	useEffect(() => {
		if (!showOverlay) {
			clear();
		}
	}, [showOverlay, clear]);

	const handleMapClick = (lon: number, lat: number): void => {
		if (!showOverlay) return;
		void request(lon, lat);
	};

	return {
		featureInfo,
		legend,
		isLegendLoading,
		legendError,
		handleMapClick,
	};
}
