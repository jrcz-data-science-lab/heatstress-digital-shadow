import proj4 from 'proj4';

export const RD =
	'+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.9999079 ' +
	'+x_0=155000 +y_0=463000 +ellps=bessel ' +
	'+towgs84=565.2369,50.0087,465.658,-0.406857,0.350732,-1.87035,4.0812 +units=m +no_defs';

export function rdToLonLat(x: number, y: number): [number, number] {
	const [lon, lat] = proj4(RD, 'WGS84', [x, y]);
	return [lon, lat];
}

export function lonLatToRd(lon: number, lat: number): [number, number] {
	const [x, y] = proj4('WGS84', RD, [lon, lat]);
	return [x, y];
}
