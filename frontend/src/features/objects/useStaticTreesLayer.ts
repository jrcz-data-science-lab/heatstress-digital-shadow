import { useEffect, useState } from 'react';
import type { Layer } from '@deck.gl/core';
import { makeObjectsLayer, type ObjectInstance } from './lib/objectLayer';
import { rdToLonLat } from '../../map/utils/crs';
import { BBOX, DEFAULT_OBJECT_TYPE } from '../../map/utils/deckUtils';

export function useStaticTreesLayer(showObjects: boolean) {
	const [objectLayer, setObjectLayer] = useState<Layer | null>(null);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		let cancelled = false;

		if (!showObjects) {
			setObjectLayer(null);
			return;
		}

		async function fetchObjectData() {
			setError(null);
			try {
				const response = await fetch(`/backend/objects/trees?BBOX=${BBOX}`);
				const json = await response.json();

				const features = (json.features || []) as {
					id: string;
					geometry: { coordinates: [number, number] }; // [xRD, yRD]
					properties: { relatieve_hoogteligging?: number } & Record<string, unknown>;
				}[];

				// Transform the data
				const data: ObjectInstance[] = features.map((feature) => {
					const [xRD, yRD] = feature.geometry.coordinates;
					const [lon, lat] = rdToLonLat(xRD, yRD);

					const rawHeight = feature.properties?.relatieve_hoogteligging;
					const height = rawHeight && rawHeight > 0 ? rawHeight : 15;

					return {
						id: feature.id,
						objectType: DEFAULT_OBJECT_TYPE,
						position: [lon, lat, 0],
						scale: height,
					};
				});

				const layer = makeObjectsLayer('objects', data, '/models/tree-pine.glb');

				if (!cancelled) setObjectLayer(layer);
			} catch (e) {
				if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
			}
		}

		fetchObjectData();
		return () => {
			cancelled = true;
		};
	}, [showObjects]);

	return { objectLayer, error };
}
