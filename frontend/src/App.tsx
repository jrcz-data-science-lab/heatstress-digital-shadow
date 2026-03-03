import type { MeasureType } from "./features/objects/lib/objectLayer";
import type { PickingInfo } from "@deck.gl/core";
import type { SideMenuItem } from "./components/sideMenu/SideMenuItem";
import React, { useCallback, useEffect, useState } from "react";
import DeckMap from "./map/DeckMap";
import { useDeckLayers } from "./map/hooks/useDeckLayers";
import { QGIS_OVERLAY_LAYERS, type QgisLayerId } from "./features/wms-overlay/lib/qgisLayers";
import { useBuildingHighlight } from "./features/buildings-3d/useBuildingHighlight";
import { SideMenu } from "./components/sideMenu/SideMenu";
import { LayersIcon } from "./components/icons/LayersIcon";
import { OverlayLayersPanel } from "./components/panels/OverlayLayersPanel";
import { TreeIcon } from "./components/icons/TreeIcon";
import { HeatStressMeasuresPanel } from "./components/panels/HeatStressMeasuresPanel";
import { BuildingIcon } from "./components/icons/BuildingIcon";
import { BuildingsPanel } from "./components/panels/BuildingsPanel";
import { WindIcon } from "./components/icons/WindIcon";
import { WindPanel } from "./components/panels/WindPanel";
import { BuildingInfoCard } from "./components/infoCards/BuildingInfoCard";
import { FeatureInfoCard } from "./components/infoCards/FeatureInfoCard";
import { LoadingIndicator } from "./components/loading/LoadingIndicator";
import { LegendCard } from "./components/legend/LegendCard";

export default function App() {
  const [showBuildings, setShowBuildings] = React.useState(false);

  const [showObjects, setShowObjects] = useState(false);
  const [editingIntent, setEditingIntent] = useState(false);
  const [activeSideMenuId, setActiveSideMenuId] = useState<string | null>(null);
  const isEditingMode = editingIntent && activeSideMenuId === "heatstressmeasures";
  const [selectedObjectType, setSelectedObjectType] =
    useState<string | null>(null);
  const loaderLeft = activeSideMenuId ? "25.5rem" : "4rem";

  const [showOverlay, setShowOverlay] = useState(true);
  const [overlayLayerId, setOverlayLayerId] = useState<QgisLayerId>(
    QGIS_OVERLAY_LAYERS[0].id
  );

  const {
    layers,
    onViewStateClick,
    saveObjects,
    discardChanges,
    hasUnsavedChanges,
    featureInfo,
    legend,
    handleMapClick,
    objectTypes,
    isProcessing,
    objectsToSave,
    handleImport
  } = useDeckLayers({
    showBuildings,
    showObjects,
    isEditingMode,
    selectedObjectType,
    setSelectedObjectType,
    objPath: 'data/10-72-338-LoD22-3D_leveled.obj',
    showOverlay,
    overlayLayerId,
  });

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  const handleToggleObjects = (value: boolean) => {
    setShowObjects(value);

    if (!value) {
      setSelectedObjectType(null);
      setEditingIntent(false);
    }
  };

  const handleSelectObjectType = (type: MeasureType | null) => {
    if (!type) {
      setSelectedObjectType(null);
      setEditingIntent(false);
      return;
    }

    const typeExists = objectTypes.find(t => t.name === type.name) ? true : false;

    if (!typeExists) {
      console.warn("Selected object type not found.");
      return;
    }

    setSelectedObjectType(type.name);
    setEditingIntent(typeExists);
  };

  const items: SideMenuItem[] = [
    {
      id: "overlayLayers",
      icon: <LayersIcon />,
      label: "Overlay Layers",
      panel: (
        <OverlayLayersPanel
          value={overlayLayerId}
          onChange={(id) => {
            setShowOverlay(true);
            setOverlayLayerId(id);
          }}
        />
      ),
    },
    {
      id: "heatstressmeasures",
      icon: <TreeIcon />,
      label: "Heat Stress Measures",
      panel: (
        <HeatStressMeasuresPanel
          showObjects={showObjects}
          onToggleObjects={handleToggleObjects}
          objectTypes={objectTypes}
          selectedObjectType={selectedObjectType}
          onSelectObjectType={handleSelectObjectType}
          hasUnsavedChanges={hasUnsavedChanges}
          isProcessing={isProcessing}
          onSave={saveObjects}
          onDiscard={discardChanges}
          currentObjects={objectsToSave}
          onImportObjects={handleImport}
        />
      ),
    },
    {
      id: "buildings",
      icon: <BuildingIcon />,
      label: "Buildings (3D View)",
      panel: (
        <BuildingsPanel
          showBuildings={showBuildings}
          onToggleBuildings={setShowBuildings}
        />
      ),
    },
    {
      id: "wind",
      icon: <WindIcon />,
      label: "Wind (Debug)",
      panel: <WindPanel />,
    },
  ];

  const { highlightLayer, handleBuildingClick, buildingInfo } = useBuildingHighlight({
    enabled: showBuildings,
  });

  const activeVbos =
    buildingInfo?.verblijfsobject_data?.filter(
      (vbo) => vbo.status === "Verblijfsobject in gebruik"
    ) ?? [];

  const usageFunctions = Array.from(
    new Set(activeVbos.flatMap((vbo) => vbo.usage_function ?? []))
  );

  const deckClickHandler = useCallback(
    (info: PickingInfo) => {
      handleBuildingClick(info);

      const handledByInteraction = onViewStateClick(info);

      handleMapClick(info);

      return handledByInteraction;
    },
    [handleBuildingClick, onViewStateClick, handleMapClick]
  );

  const menuNode = React.useRef<HTMLDivElement>(null);

  return (
    <div style={{ position: "relative", height: "100dvh", width: "100%" }}>
 
      
      <DeckMap
        layers={highlightLayer ? [...layers, highlightLayer] : layers}
        initialViewState={{
          longitude: 3.613,
          latitude: 51.5,
          zoom: 14,
          pitch: 45,
          bearing: 0,
        }}
        onMapInteraction={deckClickHandler}
        isEditingMode={isEditingMode}
      />

      {isProcessing && (
        <LoadingIndicator
          label="Processing"
          backgroundColor="white"
          textColor="black"
          left={loaderLeft}
        />
      )}

      {/* TOP RIGHT INFO PANEL */}
      <div style={{
        position: "absolute",
        top: 20,
        right: 20,
        zIndex: 1000,
        pointerEvents: "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "12px",
      }}>
        {legend && showOverlay && overlayLayerId === "pet-version-1" && (
          <LegendCard legend={legend} title="PET Index Legend" />
        )}
        {buildingInfo ? (
          <BuildingInfoCard
            buildingInfo={buildingInfo}
            activeVbos={activeVbos}
            usageFunctions={usageFunctions}
          />
        ) : featureInfo ? (
          <FeatureInfoCard info={featureInfo} />
        ) : null}
      </div>

      <div ref={menuNode} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", height: "100dvh", width: 400, pointerEvents: "auto" }}>
          <SideMenu
            items={items}
            activeId={activeSideMenuId}
            onChange={setActiveSideMenuId} />
        </div>
      </div>
    </div>
  )
}
