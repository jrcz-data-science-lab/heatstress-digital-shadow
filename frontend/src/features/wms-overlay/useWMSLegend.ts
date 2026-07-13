import { useEffect, useState } from 'react';
import type { QgisLayerId } from './lib/qgisLayers';

export type LegendItem = {
	value: number;
	label?: string | null;
	color: string;
};

export type LegendPayload = {
	renderer: {
		type?: string;
		band: number;
		classification_min: number;
		classification_max: number;
		opacity: number;
	};
	color_ramp: {
		type?: string;
		mode?: string;
		clip?: string;
		items: LegendItem[];
	};
};

type LegendState = {
	legend: LegendPayload | null;
	isLoading: boolean;
	error: string | null;
};

type Config = {
	enabled: boolean;
	layerId: QgisLayerId;
};

export function useWMSLegend({ enabled, layerId }: Config): LegendState {
	const [legend, setLegend] = useState<LegendPayload | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!enabled) {
			setLegend(null);
			setError(null);
			setIsLoading(false);
			return;
		}

		const controller = new AbortController();

		async function fetchLegend() {
			setIsLoading(true);
			setError(null);

			try {
				const res = await fetch(`/backend/legend?layer=${layerId}`, {
					signal: controller.signal,
				});

				if (!res.ok) {
					setLegend(null);
					setError(`Legend request failed (${res.status})`);
					return;
				}

				const json = (await res.json()) as LegendPayload;
				setLegend(json);
			} catch (err) {
				if ((err as { name?: string }).name !== 'AbortError') {
					setLegend(null);
					setError('Legend request failed');
				}
			} finally {
				setIsLoading(false);
			}
		}

		void fetchLegend();

		return () => {
			controller.abort();
		};
	}, [enabled, layerId]);

	return { legend, isLoading, error };
}
