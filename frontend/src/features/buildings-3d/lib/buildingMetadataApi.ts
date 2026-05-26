const BUILDING_API_URL = 'backend/3dbag/search-pand';

export type BagPolygonRD = {
	type: 'Polygon';
	coordinates: number[][][];
};

export type BuildingPandData = {
	bag_object_type: 'PAND';
	bag_id: string;
	construction_year: number;
	status: string;
	is_notified_to_bag: boolean;
	document_date: string;
	document_number: string;
	record_metadata: {
		registration_time: string;
		version: string;
		validity_start_date: string;
		validity_end_date: string | null;
		inactivity_time: string | null;
	};
	geometry: BagPolygonRD;
};

export type BuildingVerblijfsobjectData = {
	bag_object_type: 'VBO';
	bag_id: string;
	usage_function: string[];
	surface_area_m2: number;
	status: string;
};

export type BuildingApiResponse = {
	bag_id: string;
	pand_data: BuildingPandData;
	verblijfsobject_data: BuildingVerblijfsobjectData[];
};

export async function fetchBuildingMetadataByRD(
	xRD: number,
	yRD: number,
): Promise<BuildingApiResponse> {
	const params = new URLSearchParams({
		x_coord: xRD.toString(),
		y_coord: yRD.toString(),
	});

	const res = await fetch(`${BUILDING_API_URL}?${params.toString()}`);

	if (!res.ok) {
		throw new Error(`Building API error: ${res.status} ${res.statusText}`);
	}

	const data = (await res.json()) as BuildingApiResponse;
	return data;
}
