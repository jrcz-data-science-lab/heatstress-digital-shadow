import { useState } from 'react';
import { buildGetFeatureInfoUrl } from './wmsUtils';

export interface PetFeatureInfo {
	lon: number;
	lat: number;
	band: number | null;
}

interface QgisFeature {
	type: string;
	id?: string | number;
	properties?: Record<string, unknown>;
}

interface QgisFeatureCollection {
	type: string;
	features: QgisFeature[];
}

function isFeatureCollection(value: unknown): value is QgisFeatureCollection {
	if (typeof value !== 'object' || value === null || !('features' in value)) {
		return false;
	}

	const fc = value as { features: unknown };

	return Array.isArray(fc.features);
}

type Config = {
	baseUrl: string;
	layerName: string;
};

export function useQgisFeatureInfo(config: Config) {
	const [featureInfo, setFeatureInfo] = useState<PetFeatureInfo | null>(null);

	function clear() {
		setFeatureInfo(null);
	}

	async function request(lon: number, lat: number): Promise<void> {
		const url = buildGetFeatureInfoUrl({
			baseUrl: config.baseUrl,
			layerName: config.layerName,
			coord: [lon, lat],
			infoFormat: 'application/json',
		});

		let json: unknown;
		try {
			const res = await fetch(url);
			if (!res.ok) {
				setFeatureInfo(null);
				return;
			}
			json = await res.json();
		} catch {
			setFeatureInfo(null);
			return;
		}

		if (!isFeatureCollection(json)) {
			setFeatureInfo(null);
			return;
		}

		const firstFeature = json.features[0];
		const properties: Record<string, unknown> = firstFeature?.properties ?? {};

		const rawBand = properties['Band 1'] ?? properties['band_1'] ?? null;

		let band: number | null = null;

		if (typeof rawBand === 'number') {
			band = rawBand;
		} else if (typeof rawBand === 'string') {
			const parsed = Number(rawBand);
			if (!Number.isNaN(parsed)) {
				band = parsed;
			}
		}

		setFeatureInfo({ lon, lat, band });
	}

	return { featureInfo, request, clear };
}
