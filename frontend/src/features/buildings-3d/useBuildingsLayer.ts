import { useEffect, useState } from 'react';
import type { Layer } from '@deck.gl/core';
import { load } from '@loaders.gl/core';
import { OBJLoader } from '@loaders.gl/obj';
import { buildObjLayerFromMesh, computeCentroidRD } from './lib/buildingsLayer';
import { rdToLonLat } from '../../map/utils/crs';
import type { Mesh } from '@loaders.gl/schema';
import { getPositionArray, resolveUrl } from '../../map/utils/deckUtils';

type UseBuildingLayerOptions = {
	visible: boolean;
	objPath?: string;
};

export function useBuildingsLayer({ visible, objPath }: UseBuildingLayerOptions) {
	const [layer, setLayer] = useState<Layer | null>(null);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		let cancelled = false;

		async function go() {
			setError(null);

			// if not visible or no path -> no layer
			if (!visible || !objPath) {
				setLayer(null);
				return;
			}

			// resolveUrl likely returns string | undefined
			const objUrl = resolveUrl(objPath);

			// extra guard to satisfy TS + runtime
			if (!objUrl) {
				setLayer(null);
				return;
			}

			try {
				const loaded = await load(objUrl, OBJLoader);
				const mesh = (Array.isArray(loaded) ? loaded[0] : loaded) as Mesh;

				const pos = getPositionArray(mesh);
				const [cx, cy] = computeCentroidRD(pos);
				const [lon0, lat0] = rdToLonLat(cx, cy);

				const buildingsLayer = buildObjLayerFromMesh('buildings-obj', mesh, [lon0, lat0], {
					color: [180, 180, 180, 255],
					zBase: 4.261,
					zLift: 0,
					heightScale: 1,
				});

				if (!cancelled) {
					setLayer(buildingsLayer);
				}
			} catch (e) {
				if (!cancelled) {
					setError(e instanceof Error ? e : new Error(String(e)));
				}
			}
		}

		void go();

		return () => {
			cancelled = true;
		};
	}, [visible, objPath]);

	return { layer, error };
}
