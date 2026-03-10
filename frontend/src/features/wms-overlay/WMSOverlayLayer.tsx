import { useMemo } from 'react';
import { ImageryLayer } from 'resium';
import { WebMapServiceImageryProvider, Rectangle } from 'cesium';
import type { QgisLayerId } from './lib/qgisLayers';

const WMS_RECTANGLE = Rectangle.fromDegrees(3.588347, 51.4626817, 3.6581358, 51.5199357);
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
        rectangle: WMS_RECTANGLE,
      }),
    [layerId, objectsVersion]
  );

  return <ImageryLayer imageryProvider={provider} />;
}
