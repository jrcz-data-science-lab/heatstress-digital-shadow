import { useMemo } from "react";
import type { Layer } from "@deck.gl/core";
import { makeOsmTileLayer } from "../../features/basemap/lib/osmLayer";
import { useBuildingsLayer } from "../../features/buildings-3d/useBuildingsLayer";
import { useStaticTreesLayer } from "../../features/objects/useStaticTreesLayer";
import { useUserObjectsLayer } from "../../features/objects/useUserObjectsLayer";
import { useWMSLayers } from "../../features/wms-overlay/useWMSLayers";
import type { QgisLayerId } from "../../features/wms-overlay/lib/qgisLayers";

export type UseDeckLayersOpts = {
  objPath?: string;
  showBuildings: boolean;
  showObjects: boolean;
  isEditingMode: boolean;
  selectedObjectType: string | null;
  setSelectedObjectType: (type: string) => void;
  showOverlay: boolean;
  overlayLayerId: QgisLayerId;
};

export function useDeckLayers({
  objPath,
  showBuildings,
  showObjects,
  isEditingMode,
  selectedObjectType,
  setSelectedObjectType,
  showOverlay,
  overlayLayerId,
}: UseDeckLayersOpts) {
  const osmBase = useMemo<Layer>(() => makeOsmTileLayer(), []);

  const { layer: buildingsLayer, error: buildingError } = useBuildingsLayer({
    visible: showBuildings,
    objPath: objPath,
  });

  const { objectLayer, error: objectError } = useStaticTreesLayer(showObjects);

  const {
    userObjectLayers,
    handleInteraction,
    saveObjects,
    discardChanges,
    error: userObjectError,
    hasUnsavedChanges,
    objectsVersion,
    objectTypes,
    isProcessing,
    objectsToSave,
    handleImport,
  } = useUserObjectsLayer(
    showObjects,
    isEditingMode,
    selectedObjectType,
    setSelectedObjectType,
  );

  const {
    wmsLayer,
    featureInfo,
    legend,
    isLegendLoading,
    legendError,
    handleMapClick,
  } = useWMSLayers({
    showOverlay,
    overlayLayerId,
    objectsVersion,
  });

  const error = buildingError || objectError || userObjectError || null;

  const layers: Layer[] = useMemo(() => {
    const arr: Layer[] = [osmBase];

    if (buildingsLayer) arr.push(buildingsLayer);
    if (objectLayer) arr.push(objectLayer);
    if (userObjectLayers && Array.isArray(userObjectLayers))
      arr.push(...userObjectLayers);
    if (wmsLayer) arr.push(wmsLayer);

    return arr;
  }, [osmBase, buildingsLayer, objectLayer, userObjectLayers, wmsLayer]);

  return {
    layers,
    error,
    onViewStateClick: handleInteraction,
    saveObjects,
    discardChanges,
    hasUnsavedChanges,
    featureInfo,
    legend,
    isLegendLoading,
    legendError,
    handleMapClick,
    objectTypes,
    isProcessing,
    objectsToSave,
    handleImport,
  };
}
