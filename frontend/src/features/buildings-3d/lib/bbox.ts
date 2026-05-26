import { rdToLonLat } from '../../../map/utils/crs';

type RDBBox = [minX: number, minY: number, maxX: number, maxY: number];
export type LonLatBBox = [west: number, south: number, east: number, north: number];

export function rdBoxToLonLatBox([minX, minY, maxX, maxY]: RDBBox): LonLatBBox {
	const [lonWest, latSouth] = rdToLonLat(minX, minY);
	const [lonEast, latNorth] = rdToLonLat(maxX, maxY);

	return [lonWest, latSouth, lonEast, latNorth];
}
