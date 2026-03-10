import { useEffect } from 'react';
import { useQgisFeatureInfo } from "./lib/qgisFeatureInfo";
import type { QgisLayerId } from './lib/qgisLayers';
import { useWMSLegend } from './useWMSLegend';

export const WMS_BOUNDS: [number, number, number, number] = [
  3.588347,     // west
  51.4626817,   // south
  3.6581358,    // east
  51.5199357,   // north
];

export const WMS_WIDTH = 2048;
export const WMS_HEIGHT = 2048;

type UseWMSLayersOpts = {
    showOverlay: boolean;
    overlayLayerId: QgisLayerId;
};

export function useWMSLayers({ showOverlay, overlayLayerId }: UseWMSLayersOpts) {
    const WMS_BASE_URL = "/backend/qgis/wms";

    const { legend, isLoading: isLegendLoading, error: legendError } = useWMSLegend({
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
