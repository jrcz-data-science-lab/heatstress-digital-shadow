import { buildGetFeatureInfoUrl, type LonLatBBox } from './wmsUtils';

const BASE_URL = 'http://localhost/qgis/wms';
const LAYER = 'pet-version-1';
const BOUNDS: LonLatBBox = [3.6, 51.49, 3.62, 51.51];
const WIDTH = 1024;
const HEIGHT = 1024;

function parseUrl(url: string) {
  const [base, qs] = url.split('?');
  return { base, params: new URLSearchParams(qs) };
}

describe('buildGetFeatureInfoUrl', () => {
  test('produces a valid URL with correct base', () => {
    const url = buildGetFeatureInfoUrl({
      baseUrl: BASE_URL, layerName: LAYER, bounds: BOUNDS,
      width: WIDTH, height: HEIGHT, coord: [3.61, 51.5],
    });
    const { base } = parseUrl(url);
    expect(base).toBe(BASE_URL);
  });

  test('sets required WMS GetFeatureInfo params', () => {
    const url = buildGetFeatureInfoUrl({
      baseUrl: BASE_URL, layerName: LAYER, bounds: BOUNDS,
      width: WIDTH, height: HEIGHT, coord: [3.61, 51.5],
    });
    const { params } = parseUrl(url);
    expect(params.get('REQUEST')).toBe('GetFeatureInfo');
    expect(params.get('LAYERS')).toBe(LAYER);
    expect(params.get('QUERY_LAYERS')).toBe(LAYER);
    expect(params.get('WIDTH')).toBe(String(WIDTH));
    expect(params.get('HEIGHT')).toBe(String(HEIGHT));
  });

  test('BBOX is west,south,east,north (lon,lat order for CRS:84)', () => {
    const url = buildGetFeatureInfoUrl({
      baseUrl: BASE_URL, layerName: LAYER, bounds: BOUNDS,
      width: WIDTH, height: HEIGHT, coord: [3.61, 51.5],
    });
    const { params } = parseUrl(url);
    expect(params.get('BBOX')).toBe('3.6,51.49,3.62,51.51');
  });

  test('computes pixel I correctly for coord at center of bounds', () => {
    // coord exactly at horizontal center → I should be WIDTH/2
    const centerLon = (3.6 + 3.62) / 2; // 3.61
    const url = buildGetFeatureInfoUrl({
      baseUrl: BASE_URL, layerName: LAYER, bounds: BOUNDS,
      width: 1000, height: 1000, coord: [centerLon, 51.5],
    });
    const { params } = parseUrl(url);
    expect(Number(params.get('I'))).toBe(500);
  });

  test('computes pixel J correctly for coord at vertical center of bounds', () => {
    // coord exactly at vertical center → J should be HEIGHT/2
    const centerLat = (51.49 + 51.51) / 2; // 51.5
    const url = buildGetFeatureInfoUrl({
      baseUrl: BASE_URL, layerName: LAYER, bounds: BOUNDS,
      width: 1000, height: 1000, coord: [3.61, centerLat],
    });
    const { params } = parseUrl(url);
    expect(Number(params.get('J'))).toBe(500);
  });

  test('defaults INFO_FORMAT to application/json', () => {
    const url = buildGetFeatureInfoUrl({
      baseUrl: BASE_URL, layerName: LAYER, bounds: BOUNDS,
      width: WIDTH, height: HEIGHT, coord: [3.61, 51.5],
    });
    const { params } = parseUrl(url);
    expect(params.get('INFO_FORMAT')).toBe('application/json');
  });

  test('respects custom infoFormat', () => {
    const url = buildGetFeatureInfoUrl({
      baseUrl: BASE_URL, layerName: LAYER, bounds: BOUNDS,
      width: WIDTH, height: HEIGHT, coord: [3.61, 51.5],
      infoFormat: 'text/xml',
    });
    const { params } = parseUrl(url);
    expect(params.get('INFO_FORMAT')).toBe('text/xml');
  });

  test('handles baseUrl that already ends with ?', () => {
    const url = buildGetFeatureInfoUrl({
      baseUrl: BASE_URL + '?', layerName: LAYER, bounds: BOUNDS,
      width: WIDTH, height: HEIGHT, coord: [3.61, 51.5],
    });
    expect(url).not.toContain('??');
  });
});
