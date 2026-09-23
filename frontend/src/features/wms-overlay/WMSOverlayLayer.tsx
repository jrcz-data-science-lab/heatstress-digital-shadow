import { useMemo } from 'react';
import { ImageryLayer } from 'resium';
import { SplitDirection, WebMapServiceImageryProvider } from 'cesium';
import type { QgisLayerId } from './lib/qgisLayers';

const WMS_BASE_URL = '/backend/qgis/wms';

type Props = {
	layerId: QgisLayerId;
	objectsVersion: number;
	opacity?: number;
	splitDirection?: SplitDirection;
};

export function WMSOverlayLayer({ layerId, objectsVersion, opacity = 1, splitDirection = SplitDirection.NONE }: Props) {
	const provider = useMemo(
		() =>
			new WebMapServiceImageryProvider({
				url: WMS_BASE_URL,
				layers: layerId,
				parameters: {
					transparent: true,
					format: 'image/png',
					_ts: objectsVersion,
				},
			}),
		[layerId, objectsVersion],
	);

	return <ImageryLayer imageryProvider={provider} alpha={opacity} splitDirection={splitDirection} />;
}
