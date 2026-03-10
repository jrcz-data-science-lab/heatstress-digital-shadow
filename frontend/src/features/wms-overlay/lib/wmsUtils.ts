export type LonLatBBox = [west: number, south: number, east: number, north: number];

export function buildGetFeatureInfoUrl({
  baseUrl,
  layerName,
  bounds,
  width,
  height,
  coord,
  style = 'default',
  infoFormat = 'application/json'
}: {
  baseUrl: string;
  layerName: string;
  bounds: LonLatBBox;
  width: number;
  height: number;
  coord: [number, number];
  style?: string;
  infoFormat?: string;
}) {
  const [west, south, east, north] = bounds;
  const [lon, lat] = coord;

  // CRS:84 (used server-side) uses lon,lat axis order — same as WMS 1.1.1 EPSG:4326
  const bboxParam = `${west},${south},${east},${north}`;

  const xFrac = (lon - west) / (east - west);
  const yFrac = (north - lat) / (north - south);
  const I = Math.round(xFrac * width);
  const J = Math.round(yFrac * height);

  const p = new URLSearchParams({
    REQUEST: 'GetFeatureInfo',
    LAYERS: layerName,
    QUERY_LAYERS: layerName,
    STYLES: style,
    BBOX: bboxParam,
    WIDTH: String(width),
    HEIGHT: String(height),
    I: String(I),
    J: String(J),
    INFO_FORMAT: infoFormat,
  });

  return `${baseUrl}${baseUrl.endsWith('?') ? '' : '?'}${p.toString()}`;
}
