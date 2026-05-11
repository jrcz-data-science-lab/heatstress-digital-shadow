import { makeOsmTileLayer } from "./lib/osmLayer";
import type { ImageLike, RenderSubLayerProps } from "./lib/osmLayer";
import { TileLayer } from "@deck.gl/geo-layers";
import { BitmapLayer } from "@deck.gl/layers";
import type { Layer, LayersList } from "@deck.gl/core";

type RenderSubLayersFn = (p: RenderSubLayerProps) => Layer | LayersList | null;

type TileLayerWithProps = TileLayer<ImageLike> & {
  props: {
    data: string;
    renderSubLayers?: RenderSubLayersFn;
  };
};

function callRenderSubLayers(
  layer: TileLayerWithProps,
  props: RenderSubLayerProps,
): Layer | LayersList | null {
  const fn = layer.props.renderSubLayers;
  if (typeof fn !== "function") throw new Error("renderSubLayers not found");
  return fn(props);
}

function firstLayer(out: Layer | LayersList | null): Layer | null {
  if (!out) return null;
  if (Array.isArray(out)) {
    for (const l of out) {
      if (l) return l as Layer;
    }
    return null;
  }
  return out;
}

function expectBitmapWithBounds(
  layer: Layer | null,
  bounds: [number, number, number, number],
) {
  expect(layer).toBeInstanceOf(BitmapLayer);
  const bmp = layer as BitmapLayer & {
    props: {
      bounds: [number, number, number, number];
      pickable: boolean;
      id: string;
    };
  };
  expect(bmp.props.bounds).toEqual(bounds);
  return bmp;
}

describe("makeOsmTileLayer", () => {
  test("returns a TileLayer with basic props", () => {
    const url = "https://tiles.example/{z}/{x}/{y}.png";
    const layer = makeOsmTileLayer(url) as TileLayerWithProps;
    expect(layer).toBeInstanceOf(TileLayer);
    expect(layer.id).toBe("raster-tiles");
    expect(layer.props.data).toBe(url);
  });

  test("renderSubLayers returns null when bbox is missing", () => {
    const layer = makeOsmTileLayer() as TileLayerWithProps;
    const out = callRenderSubLayers(layer, {
      id: "raster-tiles",
      data: "img" as unknown as HTMLImageElement,
      tile: {} as RenderSubLayerProps["tile"],
    } as RenderSubLayerProps);
    expect(firstLayer(out)).toBeNull();
  });

  test("bbox as WSEN object maps to [west,south,east,north]", () => {
    const layer = makeOsmTileLayer() as TileLayerWithProps;
    const out = callRenderSubLayers(layer, {
      id: "raster-tiles",
      data: "img" as unknown as HTMLImageElement,
      tile: { bbox: { west: 1, south: 2, east: 3, north: 4 } },
    } as RenderSubLayerProps);
    const bmp = expectBitmapWithBounds(firstLayer(out), [1, 2, 3, 4]);
    expect(bmp.props.pickable).toBe(false);
    expect(bmp.props.id).toBe("raster-tiles-bmp");
  });

  test("bbox as LTRB object maps to [left,bottom,right,top]", () => {
    const layer = makeOsmTileLayer() as TileLayerWithProps;
    const out = callRenderSubLayers(layer, {
      id: "raster-tiles",
      data: {} as unknown as HTMLImageElement,
      tile: { bbox: { left: -10, bottom: -20, right: 10, top: 20 } },
    } as RenderSubLayerProps);
    expectBitmapWithBounds(firstLayer(out), [-10, -20, 10, 20]);
  });

  test("bbox as [[minX,minY],[maxX,maxY]] maps correctly", () => {
    const layer = makeOsmTileLayer() as TileLayerWithProps;
    const out = callRenderSubLayers(layer, {
      id: "raster-tiles",
      data: {} as unknown as HTMLImageElement,
      tile: {
        boundingBox: [
          [100, 200],
          [300, 400],
        ],
      },
    } as RenderSubLayerProps);
    expectBitmapWithBounds(firstLayer(out), [100, 200, 300, 400]);
  });
});
