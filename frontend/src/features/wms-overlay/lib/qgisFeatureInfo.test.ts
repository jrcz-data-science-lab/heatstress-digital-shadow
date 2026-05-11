import { renderHook, act, waitFor } from "@testing-library/react";
import { useQgisFeatureInfo } from "./qgisFeatureInfo";
import { buildGetFeatureInfoUrl, type LonLatBBox } from "./wmsLayer";

jest.mock("./wmsLayer", () => ({
  buildGetFeatureInfoUrl: jest.fn(),
}));

function mockResponse(body: unknown, ok = true): Partial<Response> {
  return {
    ok,
    json: jest.fn().mockResolvedValue(body),
  };
}

describe("useQgisFeatureInfo", () => {
  const bounds: LonLatBBox = [3.6, 51.49, 3.62, 51.51];
  const baseUrl = "/qgis";
  const layerName = "pet-version-1";

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    (buildGetFeatureInfoUrl as jest.Mock).mockReturnValue("/qgis?dummy");
  });

  afterEach(() => {
    // @ts-expect-error – cleanup mock
    delete global.fetch;
  });

  test("initially has null featureInfo", () => {
    const { result } = renderHook(() =>
      useQgisFeatureInfo({
        bounds,
        width: 1024,
        height: 1024,
        baseUrl,
        layerName,
      }),
    );
    expect(result.current.featureInfo).toBeNull();
  });

  test("does nothing and clears info when click is outside bounds", async () => {
    const mockFetch = global.fetch as jest.Mock;

    mockFetch.mockResolvedValue(
      mockResponse({
        type: "FeatureCollection",
        features: [{ properties: { "Band 1": 10 } }],
      }) as Response,
    );

    const { result } = renderHook(() =>
      useQgisFeatureInfo({
        bounds,
        width: 1024,
        height: 1024,
        baseUrl,
        layerName,
      }),
    );

    await act(async () => {
      await result.current.request(3.61, 51.5);
    });

    await waitFor(() =>
      expect(result.current.featureInfo).toEqual({
        lon: 3.61,
        lat: 51.5,
        band: 10,
      }),
    );

    mockFetch.mockClear();

    await act(async () => {
      await result.current.request(3.7, 51.6);
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.featureInfo).toBeNull();
  });

  test("sets featureInfo when response contains numeric Band 1", async () => {
    (buildGetFeatureInfoUrl as jest.Mock).mockReturnValue("/qgis?numeric");
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValue(
      mockResponse({
        type: "FeatureCollection",
        features: [{ properties: { "Band 1": 29.88 } }],
      }) as Response,
    );

    const { result } = renderHook(() =>
      useQgisFeatureInfo({
        bounds,
        width: 1024,
        height: 1024,
        baseUrl,
        layerName,
      }),
    );

    await act(async () => {
      await result.current.request(3.61, 51.5);
    });

    await waitFor(() => expect(result.current.featureInfo).not.toBeNull());

    expect(buildGetFeatureInfoUrl).toHaveBeenCalledWith({
      baseUrl,
      layerName,
      bounds,
      width: 1024,
      height: 1024,
      coord: [3.61, 51.5],
      infoFormat: "application/json",
    });

    expect(result.current.featureInfo).toEqual({
      lon: 3.61,
      lat: 51.5,
      band: 29.88,
    });
  });

  test("parses string Band 1 to number", async () => {
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValue(
      mockResponse({
        type: "FeatureCollection",
        features: [{ properties: { "Band 1": "42.5" } }],
      }) as Response,
    );

    const { result } = renderHook(() =>
      useQgisFeatureInfo({
        bounds,
        width: 512,
        height: 512,
        baseUrl,
        layerName,
      }),
    );

    await act(async () => {
      await result.current.request(3.61, 51.505);
    });

    await waitFor(() => expect(result.current.featureInfo).not.toBeNull());

    expect(result.current.featureInfo?.band).toBeCloseTo(42.5);
  });

  test("sets band to null when property is missing or invalid", async () => {
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValue(
      mockResponse({
        type: "FeatureCollection",
        features: [{ properties: {} }],
      }) as Response,
    );

    const { result } = renderHook(() =>
      useQgisFeatureInfo({
        bounds,
        width: 512,
        height: 512,
        baseUrl,
        layerName,
      }),
    );

    await act(async () => {
      await result.current.request(3.61, 51.505);
    });

    await waitFor(() => expect(result.current.featureInfo).not.toBeNull());

    expect(result.current.featureInfo?.band).toBeNull();
  });

  test("clears featureInfo when HTTP status is not ok", async () => {
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValue({ ok: false } as Response);

    const { result } = renderHook(() =>
      useQgisFeatureInfo({
        bounds,
        width: 1024,
        height: 1024,
        baseUrl,
        layerName,
      }),
    );

    await act(async () => {
      await result.current.request(3.61, 51.5);
    });

    expect(result.current.featureInfo).toBeNull();
  });

  test("clears featureInfo when JSON is not a FeatureCollection", async () => {
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValue(mockResponse({ foo: "bar" }) as Response);

    const { result } = renderHook(() =>
      useQgisFeatureInfo({
        bounds,
        width: 1024,
        height: 1024,
        baseUrl,
        layerName,
      }),
    );

    await act(async () => {
      await result.current.request(3.61, 51.5);
    });

    expect(result.current.featureInfo).toBeNull();
  });

  test("clear() resets featureInfo to null", async () => {
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValue(
      mockResponse({
        type: "FeatureCollection",
        features: [{ properties: { "Band 1": 10 } }],
      }) as Response,
    );

    const { result } = renderHook(() =>
      useQgisFeatureInfo({
        bounds,
        width: 1024,
        height: 1024,
        baseUrl,
        layerName,
      }),
    );

    await act(async () => {
      await result.current.request(3.61, 51.5);
    });

    await waitFor(() => expect(result.current.featureInfo).not.toBeNull());

    act(() => {
      result.current.clear();
    });

    expect(result.current.featureInfo).toBeNull();
  });
});
