export type LonLatBBox = [west: number, south: number, east: number, north: number];

// Half-width of the tiny BBOX sent with GetFeatureInfo (degrees).
// Small enough to be sub-pixel for any realistic raster, large enough to avoid
// floating-point degenerate boxes. With WIDTH=HEIGHT=1 and I=J=0, QGIS samples
// the raster at the exact center of this box — i.e. the clicked coordinate.
const GFI_DELTA = 0.0005;

export function buildGetFeatureInfoUrl({
  baseUrl,
  layerName,
  coord,
  style = 'default',
  infoFormat = 'application/json',
}: {
  baseUrl: string;
  layerName: string;
  coord: [number, number];
  style?: string;
  infoFormat?: string;
}) {
  const [lon, lat] = coord;

  // Tiny 1×1 BBOX centred on the click. QGIS converts I=0,J=0 back to the
  // BBOX centre, so this queries exactly the clicked geographic point.
  const bboxParam = `${lon - GFI_DELTA},${lat - GFI_DELTA},${lon + GFI_DELTA},${lat + GFI_DELTA}`;

  const p = new URLSearchParams({
    REQUEST: 'GetFeatureInfo',
    LAYERS: layerName,
    QUERY_LAYERS: layerName,
    STYLES: style,
    BBOX: bboxParam,
    WIDTH: '1',
    HEIGHT: '1',
    I: '0',
    J: '0',
    INFO_FORMAT: infoFormat,
  });

  return `${baseUrl}${baseUrl.endsWith('?') ? '' : '?'}${p.toString()}`;
}
