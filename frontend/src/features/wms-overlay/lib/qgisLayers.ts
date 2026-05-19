export const QGIS_OVERLAY_LAYERS = [
	{
		id: "PET_ahn4",
		label: "PET Nederland 2020 2m",
		valueLabel: "PET Index",
		unit: "°C",
	},
	{
		id: "PET_ahn2",
		label: "PET Nederland 2012 2m",
		valueLabel: "PET Index",
		unit: "°C",
	},
	{
		id: "pet-zeeland",
		label: "PET Zeeland 2019 5m",
		valueLabel: "PET Index",
		unit: "°C",
	},
	{
		id: "pet-zeeland-2015",
		label: "PET Zeeland 2015 2m",
		valueLabel: "PET Index",
		unit: "°C",
	},
	{
		id: "pet-version-1",
		label: "PET Middelburg 2025 0.5m",
		valueLabel: "PET Index",
		unit: "°C",
	},
	{
		id: "pet-session-updated",
		label: "PET (Updated)",
		valueLabel: "PET Index",
		unit: "°C",
	},
	{ id: "wind", label: "Wind", valueLabel: "Wind Speed", unit: "m/s" },
	{
		id: "wind-speed-calc",
		label: "Wind speed (calc)",
		valueLabel: "Wind Speed",
		unit: "m/s",
	},
	{ id: "R_65DN1", label: "R_65DN1", valueLabel: "R_65DN1", unit: "" },
	{
		id: "SVF_r65dn1",
		label: "SVF (Sky View Factor)",
		valueLabel: "Sky View Factor",
		unit: "",
	},
	{
		id: "bowen-ratio-middelburg",
		label: "Bowen ratio",
		valueLabel: "Bowen Ratio",
		unit: "",
	},
	{ id: "ndvi-middelburg", label: "NDVI", valueLabel: "NDVI", unit: "" },
] as const;

export type QgisLayerId = (typeof QGIS_OVERLAY_LAYERS)[number]["id"];
