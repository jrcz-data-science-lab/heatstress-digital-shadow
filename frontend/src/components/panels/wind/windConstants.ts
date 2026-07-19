export type WindApiResult = Record<string, string>;

export type WindDirection = 'north' | 'east' | 'south' | 'west';

export const WIND_DIRECTION_OPTIONS: Array<{
	value: WindDirection;
	label: string;
}> = [
	{ value: 'west', label: 'From West' },
	{ value: 'north', label: 'From North' },
	{ value: 'east', label: 'From East' },
	{ value: 'south', label: 'From South' },
];

export const WIND_API_BASE = 'http://localhost:9000/wind';
