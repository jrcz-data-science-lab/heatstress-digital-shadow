import { useMemo } from 'react';
import { ImageryLayer } from 'resium';
import { WebMapServiceImageryProvider } from 'cesium';
import type { QgisLayerId } from './lib/qgisLayers';

const WMS_BASE_URL = '/backend/qgis/wms';

type Props = {
  layerId: QgisLayerId;
  objectsVersion: number;
};

export function WMSOverlayLayer({ layerId, objectsVersion }: Props) {
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
    [layerId, objectsVersion]
  );

  return <ImageryLayer imageryProvider={provider} />;
}
