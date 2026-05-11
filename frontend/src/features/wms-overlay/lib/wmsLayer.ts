import { BitmapLayer } from "@deck.gl/layers";
import { TileLayer } from "@deck.gl/geo-layers";
import type { Layer } from "@deck.gl/core";

export type LonLatBBox = [
  west: number,
  south: number,
  east: number,
  north: number,
];

type MakeOpts = {
  id?: string;
  baseUrl: string;
  layerName: string;
  bounds: LonLatBBox;
  width?: number;
  height?: number;
  minZoom?: number;
  maxZoom?: number;
  style?: string;
  format?: "image/png" | "image/jpeg";
  transparent?: boolean;
  opacity?: number;
  cacheBuster?: number;
  tileSize?: number;
};

function getTileBounds(x: number, y: number, z: number): LonLatBBox {
  const tile2long = (x: number, z: number) => {
    return (x / Math.pow(2, z)) * 360 - 180;
  };

  const tile2lat = (y: number, z: number) => {
    const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
    return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  };

  const west = tile2long(x, z);
  const east = tile2long(x + 1, z);
  const north = tile2lat(y, z);
  const south = tile2lat(y + 1, z);

  return [west, south, east, north];
}

function buildGetMapUrl({
  baseUrl,
  layerName,
  bounds,
  width = 256,
  height = 256,
  style = "default",
  format = "image/png",
  transparent = true,
  cacheBuster,
}: MakeOpts) {
  const [west, south, east, north] = bounds;
  const bboxParam = `${south},${west},${north},${east}`;

  const p = new URLSearchParams({
    REQUEST: "GetMap",
    LAYERS: layerName,
    STYLES: style,
    FORMAT: format,
    TRANSPARENT: transparent ? "TRUE" : "FALSE",
    BBOX: bboxParam,
    WIDTH: String(width),
    HEIGHT: String(height),
  });

  if (cacheBuster !== undefined) {
    p.set("_ts", String(cacheBuster));
  }

  return `${baseUrl}${baseUrl.endsWith("?") ? "" : "?"}${p.toString()}`;
}

export function makeWmsLayer(opts: MakeOpts): Layer {
  return new TileLayer({
    id: opts.id,
    tileSize: opts.tileSize || 256,
    minZoom: opts.minZoom ?? 0,
    maxZoom: opts.maxZoom ?? 24,
    opacity: opts.opacity ?? 1,
    extent: opts.bounds,

    getTileData: ({ index: { x, y, z } }) => {
      const bounds = getTileBounds(x, y, z);
      const url = buildGetMapUrl({
        ...opts,
        bounds,
        width: opts.tileSize || 256,
        height: opts.tileSize || 256,
      });

      return fetch(url)
        .then((response) => response.blob())
        .then((blob) => createImageBitmap(blob));
    },

    renderSubLayers: (props) => {
      const { x, y, z } = props.tile.index;
      const [west, south, east, north] = getTileBounds(x, y, z);

      return new BitmapLayer(props, {
        data: undefined,
        image: props.data,
        bounds: [west, south, east, north],
      });
    },
  });
}

export function buildGetFeatureInfoUrl({
  baseUrl,
  layerName,
  bounds,
  width,
  height,
  coord,
  style = "default",
  infoFormat = "application/json",
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

  const bboxParam = `${south},${west},${north},${east}`;

  const xFrac = (lon - west) / (east - west);
  const yFrac = (north - lat) / (north - south);
  const I = Math.round(xFrac * width);
  const J = Math.round(yFrac * height);

  const p = new URLSearchParams({
    REQUEST: "GetFeatureInfo",
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

  return `${baseUrl}${baseUrl.endsWith("?") ? "" : "?"}${p.toString()}`;
}
