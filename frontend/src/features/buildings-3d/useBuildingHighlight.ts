import { useCallback, useEffect, useState } from "react";
import { lonLatToRd, rdToLonLat } from "../../map/utils/crs";
import {
  fetchBuildingMetadataByRD,
  type BuildingApiResponse,
} from "./lib/buildingMetadataApi";

type LonLat = [number, number];

type UseBuildingHighlightOptions = {
  enabled: boolean;
};

export type HighlightState = {
  polygon: LonLat[];
  height: number;
};

function polygonAreaRD(coords: [number, number][]): number {
  if (coords.length < 3) return 0;
  let area = 0;
  const n = coords.length;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = coords[i];
    const [x2, y2] = coords[(i + 1) % n];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) / 2;
}

function estimateHeightFromArea(areaM2: number): number {
  if (!Number.isFinite(areaM2) || areaM2 <= 0) return 15;
  const base = 8;
  const extra = Math.sqrt(areaM2);
  return base + extra * 0.4;
}

export function useBuildingHighlight({ enabled }: UseBuildingHighlightOptions) {
  const [highlight, setHighlight] = useState<HighlightState | null>(null);
  const [buildingInfo, setBuildingInfo] = useState<BuildingApiResponse | null>(null);

  useEffect(() => {
    if (!enabled) {
      setHighlight(null);
      setBuildingInfo(null);
    }
  }, [enabled]);

  /**
   * Call with the clicked lon/lat whenever buildings mode is enabled.
   * Buildings are not rendered as pickable 3D meshes, so we query the API
   * on every click within the area to look up building metadata.
   */
  const handleBuildingClick = useCallback(
    (lon: number, lat: number) => {
      if (!enabled) {
        setHighlight(null);
        setBuildingInfo(null);
        return;
      }

      const [xRD, yRD] = lonLatToRd(lon, lat);

      setBuildingInfo(null);

      void fetchBuildingMetadataByRD(xRD, yRD)
        .then((data) => {
          const geom = data?.pand_data?.geometry;
          if (!geom || geom.type !== "Polygon" || !geom.coordinates?.length) {
            setHighlight(null);
            setBuildingInfo(null);
            return;
          }

          const ringRD = geom.coordinates[0];
          const coordsRD: [number, number][] = ringRD.map(
            ([x, y]: number[]) => [x, y]
          );

          const areaM2 = polygonAreaRD(coordsRD);
          const estimatedHeight = estimateHeightFromArea(areaM2);

          const ringLonLat: LonLat[] = coordsRD.map(([x, y]) =>
            rdToLonLat(x, y)
          ) as LonLat[];

          setHighlight({ polygon: ringLonLat, height: estimatedHeight });
          setBuildingInfo(data);
        })
        .catch((err) => {
          console.error("Failed to fetch building metadata:", err);
          setHighlight(null);
          setBuildingInfo(null);
        });
    },
    [enabled]
  );

  return {
    highlight,
    handleBuildingClick,
    buildingInfo,
  };
}
