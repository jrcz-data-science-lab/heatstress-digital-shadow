import { SimpleMeshLayer } from '@deck.gl/mesh-layers';
import { COORDINATE_SYSTEM } from '@deck.gl/core';
import type { Mesh, MeshAttribute } from '@loaders.gl/schema';
import proj4 from 'proj4';
import { RD } from '../../../map/utils/crs';

/** centroid of a POSITION array [x,y,z,...] in RD meters */
export function computeCentroidRD(positions: Float32Array) {
	let minX = Infinity,
		minY = Infinity,
		minZ = Infinity;
	let maxX = -Infinity,
		maxY = -Infinity,
		maxZ = -Infinity;
	for (let i = 0; i < positions.length; i += 3) {
		const x = positions[i],
			y = positions[i + 1],
			z = positions[i + 2];
		if (x < minX) minX = x;
		if (y < minY) minY = y;
		if (z < minZ) minZ = z;
		if (x > maxX) maxX = x;
		if (y > maxY) maxY = y;
		if (z > maxZ) maxZ = z;
	}
	return [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2] as [number, number, number];
}

function lonLatDeltaToMeters(lon: number, lat: number, lon0: number, lat0: number) {
	const dLon = lon - lon0;
	const dLat = lat - lat0;
	const mPerDegLat = 110_540; // ~meters per degree latitude
	const mPerDegLon = 111_320 * Math.cos((lat0 * Math.PI) / 180);
	return [dLon * mPerDegLon, dLat * mPerDegLat] as [number, number];
}

function getPositionArray(mesh: Mesh): Float32Array {
	const attr = mesh.attributes?.POSITION as MeshAttribute | undefined;
	const v = attr?.value as
		| Float32Array
		| Float64Array
		| Int32Array
		| Uint32Array
		| Int16Array
		| Uint16Array
		| Int8Array
		| Uint8Array
		| Uint8ClampedArray
		| number[]
		| ArrayBuffer
		| undefined;

	if (!v) throw new Error('OBJ mesh has no POSITION attribute');
	if (v instanceof Float32Array) return v;
	if (ArrayBuffer.isView(v)) return Float32Array.from(v as ArrayLike<number>);
	if (Array.isArray(v)) return Float32Array.from(v);
	if (v instanceof ArrayBuffer) return new Float32Array(v);
	throw new Error('Unsupported POSITION value type');
}

/**
 * Project RD (x,y) of every vertex to WGS84, then to local meter offsets around anchor lon0,lat0.
 * Z is grounded so buildings sit on the map (+ small lift to avoid z-fighting).
 */
function meshRDToLocalMeters(mesh: Mesh, lon0: number, lat0: number, heightScale = 1): Mesh {
	const src = getPositionArray(mesh);

	const out = new Float32Array(src.length);

	for (let i = 0; i < src.length; i += 3) {
		const xRD = src[i],
			yRD = src[i + 1],
			z = src[i + 2];

		const [lon, lat] = proj4(RD, 'WGS84', [xRD, yRD]) as [number, number];
		const [dx, dy] = lonLatDeltaToMeters(lon, lat, lon0, lat0);

		const zGrounded = z + 0.2;
		out[i] = dx;
		out[i + 1] = dy;
		out[i + 2] = zGrounded * heightScale;
	}

	return {
		...mesh,
		attributes: {
			...mesh.attributes,
			POSITION: { value: out, size: 3 } as MeshAttribute,
		},
	};
}

export function buildObjLayerFromMesh(
	id: string,
	mesh: Mesh,
	originLonLat: [number, number],
	options?: {
		color?: [number, number, number, number];
		wireframe?: boolean;
		zBase?: 'min' | 'mean' | number;
		zLift?: number;
		heightScale?: number;
		zAdd?: number;
	},
) {
	const [lon0, lat0] = originLonLat;
	const recentered = meshRDToLocalMeters(mesh, lon0, lat0, options?.heightScale ?? 1);

	return new SimpleMeshLayer({
		id,
		data: [{}],
		mesh: recentered,
		getPosition: () => [0, 0, 0],
		coordinateSystem: COORDINATE_SYSTEM.METER_OFFSETS,
		coordinateOrigin: [lon0, lat0, 0],
		parameters: { depthTest: true },
		getColor: options?.color ?? [180, 180, 180, 255],
		wireframe: options?.wireframe ?? false,
		pickable: true,
	});
}
