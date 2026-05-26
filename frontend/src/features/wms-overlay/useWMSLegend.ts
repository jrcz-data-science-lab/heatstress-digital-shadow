import { useEffect, useRef, useState } from 'react';

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
};

export function useWMSLegend({ enabled }: Config): LegendState {
	const [legend, setLegend] = useState<LegendPayload | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const hasFetched = useRef(false);

	useEffect(() => {
		if (!enabled || hasFetched.current) {
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
				const res = await fetch('/backend/legend?layer=pet-version-1', {
					signal: controller.signal,
				});

				if (!res.ok) {
					setLegend(null);
					setError(`Legend request failed (${res.status})`);
					return;
				}

				const json = (await res.json()) as LegendPayload;
				setLegend(json);
				hasFetched.current = true;
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
	}, [enabled]);

	return { legend, isLoading, error };
}
