import { buildGetFeatureInfoUrl } from './wmsUtils';

const BASE_URL = 'http://localhost/qgis/wms';
const LAYER = 'pet-version-1';

function parseUrl(url: string) {
  const [base, qs] = url.split('?');
  return { base, params: new URLSearchParams(qs) };
}

describe('buildGetFeatureInfoUrl', () => {
  test('produces a valid URL with correct base', () => {
    const url = buildGetFeatureInfoUrl({ baseUrl: BASE_URL, layerName: LAYER, coord: [3.61, 51.5] });
    expect(parseUrl(url).base).toBe(BASE_URL);
  });

  test('sets required WMS GetFeatureInfo params', () => {
    const { params } = parseUrl(
      buildGetFeatureInfoUrl({ baseUrl: BASE_URL, layerName: LAYER, coord: [3.61, 51.5] })
    );
    expect(params.get('REQUEST')).toBe('GetFeatureInfo');
    expect(params.get('LAYERS')).toBe(LAYER);
    expect(params.get('QUERY_LAYERS')).toBe(LAYER);
  });

  test('uses 1x1 pixel image with I=0 J=0', () => {
    const { params } = parseUrl(
      buildGetFeatureInfoUrl({ baseUrl: BASE_URL, layerName: LAYER, coord: [3.61, 51.5] })
    );
    expect(params.get('WIDTH')).toBe('1');
    expect(params.get('HEIGHT')).toBe('1');
    expect(params.get('I')).toBe('0');
    expect(params.get('J')).toBe('0');
  });

  test('BBOX is centred on the clicked coordinate', () => {
    const lon = 3.61;
    const lat = 51.5;
    const { params } = parseUrl(
      buildGetFeatureInfoUrl({ baseUrl: BASE_URL, layerName: LAYER, coord: [lon, lat] })
    );
    const [west, south, east, north] = (params.get('BBOX') ?? '').split(',').map(Number);
    const centerLon = (west + east) / 2;
    const centerLat = (south + north) / 2;
    expect(centerLon).toBeCloseTo(lon, 8);
    expect(centerLat).toBeCloseTo(lat, 8);
  });

  test('BBOX is in lon,lat order (CRS:84 compatible)', () => {
    const { params } = parseUrl(
      buildGetFeatureInfoUrl({ baseUrl: BASE_URL, layerName: LAYER, coord: [3.61, 51.5] })
    );
    const [west, , east] = (params.get('BBOX') ?? '').split(',').map(Number);
    // Longitudes should be in the Netherlands range
    expect(west).toBeGreaterThan(3);
    expect(east).toBeLessThan(4);
  });

  test('defaults INFO_FORMAT to application/json', () => {
    const { params } = parseUrl(
      buildGetFeatureInfoUrl({ baseUrl: BASE_URL, layerName: LAYER, coord: [3.61, 51.5] })
    );
    expect(params.get('INFO_FORMAT')).toBe('application/json');
  });

  test('respects custom infoFormat', () => {
    const { params } = parseUrl(
      buildGetFeatureInfoUrl({ baseUrl: BASE_URL, layerName: LAYER, coord: [3.61, 51.5], infoFormat: 'text/xml' })
    );
    expect(params.get('INFO_FORMAT')).toBe('text/xml');
  });

  test('handles baseUrl that already ends with ?', () => {
    const url = buildGetFeatureInfoUrl({ baseUrl: BASE_URL + '?', layerName: LAYER, coord: [3.61, 51.5] });
    expect(url).not.toContain('??');
  });
});
