export const QGIS_OVERLAY_LAYERS = [
  { id: "pet-version-1", label: "PET" },
  { id: "pet-version-kapelle", label: "PET Kapelle" },
  { id: "pet-version-1-middelburggemeente", label: "PET Middelburg" },
  { id: "wind", label: "Wind" },
  { id: "wind-speed-calc", label: "Wind speed (calc)" },
  { id: "R_65DN1", label: "R_65DN1" },
  { id: "SVF_r65dn1", label: "SVF (Sky View Factor)" },
  { id: "bowen-ratio-middelburg", label: "Bowen ratio" },
  { id: "ndvi-middelburg", label: "NDVI" },
] as const;

export type QgisLayerId = (typeof QGIS_OVERLAY_LAYERS)[number]["id"];
