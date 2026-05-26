import { TileLayer, type TileLayerProps } from '@deck.gl/geo-layers';
import { BitmapLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';

export type ImageLike = HTMLImageElement | ImageBitmap;
export type RenderSubLayerProps = Parameters<
	NonNullable<TileLayerProps<ImageLike>['renderSubLayers']>
>[0];

type BBoxWSEN = { west: number; south: number; east: number; north: number };
type BBoxLTRB = { left: number; bottom: number; right: number; top: number };
type BBoxArray = [[number, number], [number, number]];

export function makeOsmTileLayer(
	url = 'https://cartodb-basemaps-a.global.ssl.fastly.net/light_nolabels/{z}/{x}/{y}.png',
): Layer {
	return new TileLayer<ImageLike>({
		id: 'raster-tiles',
		data: url,
		tileSize: 256,
		minZoom: 0,
		maxZoom: 19,
		refinementStrategy: 'best-available',
		maxCacheSize: 200,
		loadOptions: { image: { crossOrigin: 'anonymous' } },

		renderSubLayers: (props: RenderSubLayerProps) => {
			const t = props.tile;

			const b =
				(t?.bbox as BBoxWSEN | BBoxLTRB | undefined) ??
				(t as unknown as { boundingBox?: BBoxArray }).boundingBox;

			if (!b) return null;

			const bounds: [number, number, number, number] = Array.isArray(b)
				? [b[0][0], b[0][1], b[1][0], b[1][1]] // [[minX,minY],[maxX,maxY]]
				: 'west' in b
					? [b.west, b.south, b.east, b.north]
					: [b.left, b.bottom, b.right, b.top];

			return new BitmapLayer({
				id: `${props.id}-bmp`,
				image: props.data,
				bounds,
				pickable: false,
			});
		},
	});
}
