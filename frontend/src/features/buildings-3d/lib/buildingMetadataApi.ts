const BUILDING_API_URL = 'backend/3dbag/search-pand';
const BUILDING_API_BY_ID_URL = 'backend/3dbag/pand';

/**
 * Properties read directly from a clicked Cesium3DTileFeature in the 3D BAG tileset.
 * No extra API call — they are baked into the tile at render time.
 * All b3_ attributes follow the 3D BAG schema: https://docs.3dbag.nl/en/schema/attributes/
 */
export type TileProperties = {
	// Heights (absolute metres above NAP)
	h_maaiveld?: number; // b3_h_maaiveld  – ground level
	h_dak_50p?: number; // b3_h_dak_50p   – median roof height
	h_dak_max?: number; // b3_h_dak_max   – highest roof point
	// Derived (computed from the two above, metres above ground)
	hoogte?: number;

	// Roof geometry
	dak_type?: string; // b3_dak_type    – e.g. "slanted", "horizontal"
	hellingshoek?: number; // b3_hellingshoek – slope in degrees

	// Building dimensions
	bouwlagen?: number; // b3_bouwlagen   – number of floors
	volume_lod22?: number; // b3_volume_lod22 – volume in m³
	opp_grond?: number; // b3_opp_grond   – ground floor area m²
	opp_dak_plat?: number; // b3_opp_dak_plat  – flat roof area m²
	opp_dak_schuin?: number; // b3_opp_dak_schuin – slanted roof area m²

	// Reconstruction quality
	kwaliteitsindicator?: boolean; // b3_kwaliteitsindicator – overall quality flag
	rmse_lod22?: number; // b3_rmse_lod22 – reconstruction accuracy (m)

	// Point cloud source
	pw_datum?: string; // b3_pw_datum – AHN acquisition year
	mutatie_ahn4_ahn5?: boolean; // b3_mutatie_ahn4_ahn5 – changed between surveys
};

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

/** Energy performance certificate from EP-Online, attached per VBO. */
export type EnergieLabel = {
	energieklasse?: string; // e.g. "A", "B", "A+", "A+++"
	energie_index?: number; // numeric energy performance index
	registratiedatum?: string; // certificate registration date
	geldig_tot?: string; // certificate expiry date
	energiebehoefte?: number; // energy demand kWh/m²/year
	primaire_fossiele_energie?: number; // primary fossil energy kWh/m²/year
	aandeel_hernieuwbare_energie?: number; // renewable energy share %
	warmtebehoefte?: number; // heat demand kWh/m²/year
	gebouwklasse?: string; // "W" = residential, "U" = utility
};

/** Pand-level energy fields from EP-Online (same value for all VBOs in the building). */
export type PandEnergieData = {
	energieklasse?: string; // Pand_energieklasse
	gebouwklasse?: string; // Pand_gebouwklasse ("W" / "U")
	gebouwtype?: string; // Pand_gebouwtype
	projectnaam?: string; // Pand_projectnaam
	energiebehoefte?: number; // Pand_energiebehoefte kWh/m²
	eis_energiebehoefte?: number; // Pand_eis_energiebehoefte kWh/m²
};

/** Address of an individual unit (apartment) within the building. */
export type VboAdres = {
	house_number?: number;
	house_letter?: string;
	house_number_addition?: string;
	postcode?: string;
};

export type BuildingVerblijfsobjectData = {
	bag_object_type: 'VBO';
	bag_id: string;
	usage_function: string[];
	surface_area_m2: number;
	status: string;
	adres?: VboAdres | null;
	energie_label?: EnergieLabel | null;
};

export type BuildingAddressData = {
	street?: string;
	house_number?: number;
	house_letter?: string;
	house_number_addition?: string;
	postcode?: string;
	city?: string;
};

export type BuildingApiResponse = {
	bag_id: string;
	address?: BuildingAddressData | null;
	pand_energie_data?: PandEnergieData | null;
	pand_data: BuildingPandData;
	verblijfsobject_data: BuildingVerblijfsobjectData[];
};

/**
 * Fetch building metadata directly by BAG ID (identificatie).
 * This is the preferred path when clicking a 3D tileset feature,
 * because the BAG ID is already baked into the tile — no spatial search needed.
 */
export async function fetchBuildingMetadataByBagId(bagId: string): Promise<BuildingApiResponse> {
	const res = await fetch(`${BUILDING_API_BY_ID_URL}/${encodeURIComponent(bagId)}`);

	if (!res.ok) {
		throw new Error(`Building API error: ${res.status} ${res.statusText}`);
	}

	return (await res.json()) as BuildingApiResponse;
}

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
