import type { LonLatBBox } from "./wmsLayer";

jest.mock("@deck.gl/layers", () => ({
  BitmapLayer: jest.fn().mockImplementation((opts) => ({
    __type: "BitmapLayer",
    ...opts,
  })),
}));

import { BitmapLayer } from "@deck.gl/layers";
import { makeWmsLayer, buildGetFeatureInfoUrl } from "./wmsLayer";

const BitmapLayerMock = BitmapLayer as unknown as jest.Mock;

describe("wmsLayer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("makeWmsLayer builds correct GetMap URL and BitmapLayer props (defaults)", () => {
    const bounds: LonLatBBox = [3.6, 51.49, 3.62, 51.51];

    const layer = makeWmsLayer({
      baseUrl: "/qgis",
      layerName: "pet-version-1",
      bounds,
    });

    expect(BitmapLayerMock).toHaveBeenCalledTimes(1);
    const callArg = BitmapLayerMock.mock.calls[0][0];

    expect(callArg.bounds).toEqual(bounds);
    expect(callArg.opacity).toBe(1);

    const url = new URL(callArg.image as string, "http://dummy");
    const params = url.searchParams;

    expect(url.pathname).toBe("/qgis");

    expect(params.get("SERVICE")).toBe("WMS");
    expect(params.get("VERSION")).toBe("1.3.0");
    expect(params.get("REQUEST")).toBe("GetMap");
    expect(params.get("LAYERS")).toBe("pet-version-1");
    expect(params.get("STYLES")).toBe("default");
    expect(params.get("FORMAT")).toBe("image/png");
    expect(params.get("TRANSPARENT")).toBe("TRUE");
    expect(params.get("CRS")).toBe("EPSG:4326");
    expect(params.get("WIDTH")).toBe("2048");
    expect(params.get("HEIGHT")).toBe("2048");

    const [west, south, east, north] = bounds;
    expect(params.get("BBOX")).toBe(`${south},${west},${north},${east}`);

    expect(layer).toEqual(expect.objectContaining({ __type: "BitmapLayer" }));
  });

  test('makeWmsLayer respects custom id, size, opacity and baseUrl with "?"', () => {
    const bounds: LonLatBBox = [0, 0, 10, 10];

    makeWmsLayer({
      id: "custom-id",
      baseUrl: "/qgis?",
      layerName: "wind",
      bounds,
      width: 512,
      height: 256,
      transparent: false,
      opacity: 0.5,
    });

    expect(BitmapLayerMock).toHaveBeenCalledTimes(1);
    const callArg = BitmapLayerMock.mock.calls[0][0];

    expect(callArg.id).toBe("custom-id");
    expect(callArg.opacity).toBe(0.5);

    const url = new URL(callArg.image as string, "http://dummy");
    const params = url.searchParams;

    expect(url.pathname).toBe("/qgis");
    expect(params.get("WIDTH")).toBe("512");
    expect(params.get("HEIGHT")).toBe("256");
    expect(params.get("TRANSPARENT")).toBe("FALSE");
  });

  test("buildGetFeatureInfoUrl builds correct URL and pixel coordinates", () => {
    const bounds: LonLatBBox = [0, 0, 10, 10];
    const width = 100;
    const height = 200;
    const baseUrl = "/qgis";
    const layerName = "pet-version-1";

    const coord: [number, number] = [5, 5];

    const urlStr = buildGetFeatureInfoUrl({
      baseUrl,
      layerName,
      bounds,
      width,
      height,
      coord,
    });

    const url = new URL(urlStr, "http://dummy");
    const params = url.searchParams;

    expect(url.pathname).toBe("/qgis");

    expect(params.get("SERVICE")).toBe("WMS");
    expect(params.get("VERSION")).toBe("1.3.0");
    expect(params.get("REQUEST")).toBe("GetFeatureInfo");
    expect(params.get("LAYERS")).toBe(layerName);
    expect(params.get("QUERY_LAYERS")).toBe(layerName);
    expect(params.get("STYLES")).toBe("default");
    expect(params.get("CRS")).toBe("EPSG:4326");
    expect(params.get("INFO_FORMAT")).toBe("application/json");
    expect(params.get("FEATURE_COUNT")).toBe("1");

    expect(params.get("BBOX")).toBe("0,0,10,10");

    expect(params.get("I")).toBe("50");
    expect(params.get("J")).toBe("100");
  });

  test('buildGetFeatureInfoUrl handles baseUrl ending with "?"', () => {
    const bounds: LonLatBBox = [1, 2, 3, 4];

    const urlStr = buildGetFeatureInfoUrl({
      baseUrl: "/qgis?",
      layerName: "ndvi-middelburg",
      bounds,
      width: 256,
      height: 256,
      coord: [2, 3],
    });

    const url = new URL(urlStr, "http://dummy");

    expect(url.pathname).toBe("/qgis");
  });
});
