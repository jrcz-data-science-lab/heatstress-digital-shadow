import type { MeasureType } from "./features/objects/lib/objectLayer";
import type { SideMenuItem } from "./components/sideMenu/SideMenuItem";
import React, { useCallback, useEffect, useRef, useState } from "react";
import CesiumMap, {
	type CesiumClickInfo,
	type CesiumMapHandle,
} from "./map/CesiumMap";
import { WMSOverlayLayer } from "./features/wms-overlay/WMSOverlayLayer";
import { StaticTreesEntities } from "./features/objects/StaticTreesEntities";
import {
	ExistingTreesEntities,
	type TreeLoadStatus,
} from "./features/existing-trees/ExistingTreesEntities";
import { UserObjectsEntities } from "./features/objects/UserObjectsEntities";
import { BAG3DTileset } from "./features/buildings-3d/BAG3DTileset";
import { GooglePhotorealisticTileset } from "./features/buildings-3d/GooglePhotorealisticTileset";
import { useUserObjectsLayer } from "./features/objects/useUserObjectsLayer";
import { useWMSLayers } from "./features/wms-overlay/useWMSLayers";
import { useBuildingHighlight } from "./features/buildings-3d/useBuildingHighlight";
import { QGIS_OVERLAY_LAYERS } from "./features/wms-overlay/lib/qgisLayers";
import { SideMenu } from "./components/sideMenu/SideMenu";
import { LayersIcon } from "./components/icons/LayersIcon";
import {
	OverlayLayersPanel,
	type OverlayLayerConfig,
} from "./components/panels/OverlayLayersPanel";
import { TreeIcon } from "./components/icons/TreeIcon";
import { HeatStressMeasuresPanel } from "./components/panels/HeatStressMeasuresPanel";
import { BuildingIcon } from "./components/icons/BuildingIcon";
import { BuildingsPanel } from "./components/panels/BuildingsPanel";
import { InformationPanel } from "./components/panels/InformationPanel";
import { FeatureInfoCard } from "./components/infoCards/FeatureInfoCard";
import { LoadingIndicator } from "./components/loading/LoadingIndicator";
import { TreeLoadingIndicator } from "./components/loading/TreeLoadingIndicator";
import { LegendCard } from "./components/legend/LegendCard";
import { PerspectiveIcon } from "./components/icons/PerspectiveIcon";
import { InformationIcon } from "./components/icons/InformationIcon";
import { SunIcon } from "./components/icons/SunIcon";
import { SunShadowPanel } from "./components/panels/SunShadowPanel";
import { PerformanceOverlay } from "./components/performance/PerformanceOverlay";

export default function App() {
	const [showBuildings, setShowBuildings] = React.useState(false);
	const [showGoogleTiles, setShowGoogleTiles] = React.useState(false);
	const [showSunShadow, setShowSunShadow] = useState(false);
	// Default to today at noon local time for a sensible starting point
	const [simulationDate, setSimulationDate] = useState<Date>(() => {
		const d = new Date();
		d.setHours(12, 0, 0, 0);
		return d;
	});
	const [showObjects, setShowObjects] = useState(false);
	const [showExistingTrees, setShowExistingTrees] = useState(false);
	const [treeLoadStatus, setTreeLoadStatus] = useState<TreeLoadStatus>({
		loading: false,
		count: 0,
		limit: 0,
		hitLimit: false,
		tooFarOut: true,
	});
	const [editingIntent, setEditingIntent] = useState(false);
	const [activeSideMenuId, setActiveSideMenuId] = useState<string | null>(null);
	const isEditingMode =
		editingIntent && activeSideMenuId === "heatstressmeasures";
	const [selectedObjectType, setSelectedObjectType] = useState<string | null>(
		null,
	);
	const loaderLeft = activeSideMenuId ? "25.5rem" : "4rem";

	// 3D BAG uses AHN LiDAR (0.5 m) for ground heights; Cesium World Terrain uses
	// coarser global data, so terrain mesh runs ~2 m lower than AHN in Middelburg.
	// A small positive offset keeps building bases above the terrain surface.
	const BAG_3D_HEIGHT_OFFSET = 1;

	const [overlayLayers, setOverlayLayers] = useState<OverlayLayerConfig[]>([
		{ id: QGIS_OVERLAY_LAYERS[0].id, opacity: 1 },
	]);

	const {
		objectsToSave,
		objectTypes,
		handleInteraction,
		saveObjects,
		discardChanges,
		hasUnsavedChanges,
		objectsVersion,
		isProcessing,
		handleImport,
	} = useUserObjectsLayer(
		showObjects,
		isEditingMode,
		selectedObjectType,
		setSelectedObjectType,
	);

	const { featureInfo, legend, handleMapClick } = useWMSLayers({
		showOverlay: overlayLayers.length > 0,
		overlayLayerId:
			overlayLayers[overlayLayers.length - 1]?.id ?? QGIS_OVERLAY_LAYERS[0].id,
	});

	const { handleBuildingClick, buildingInfo, tileProperties } =
		useBuildingHighlight({
			enabled: showBuildings,
		});

	useEffect(() => {
		const handleBeforeUnload = (event: BeforeUnloadEvent) => {
			if (!hasUnsavedChanges) return;
			event.preventDefault();
			event.returnValue = "";
		};
		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => window.removeEventListener("beforeunload", handleBeforeUnload);
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
		const typeExists = objectTypes.find((t) => t.name === type.name)
			? true
			: false;
		if (!typeExists) {
			console.warn("Selected object type not found.");
			return;
		}
		setSelectedObjectType(type.name);
		setEditingIntent(typeExists);
	};

	const handleCesiumClick = useCallback(
		({
			coordinate,
			pickedEntityId,
			bagId,
			tileProperties,
		}: CesiumClickInfo) => {
			const lon = coordinate?.[0];
			const lat = coordinate?.[1];

			if (showBuildings && !isEditingMode && lon != null && lat != null) {
				handleBuildingClick(lon, lat, bagId, tileProperties);
				// Auto-open the buildings panel so the user sees the details immediately.
				setActiveSideMenuId("buildings");
			}

			if (pickedEntityId || (lon != null && lat != null)) {
				handleInteraction(lon, lat, pickedEntityId);
			}

			if (lon != null && lat != null) {
				handleMapClick(lon, lat);
			}
		},
		[
			showBuildings,
			isEditingMode,
			handleBuildingClick,
			handleInteraction,
			handleMapClick,
		],
	);

	const activeVbos =
		buildingInfo?.verblijfsobject_data?.filter(
			(vbo) => vbo.status === "Verblijfsobject in gebruik",
		) ?? [];

	const cesiumMapRef = useRef<CesiumMapHandle>(null);

	const items: SideMenuItem[] = [
		{
			id: "overlayLayers",
			icon: <LayersIcon />,
			label: "Overlay Layers",
			panel: (
				<OverlayLayersPanel
					layers={overlayLayers}
					onChange={setOverlayLayers}
					showExistingTrees={showExistingTrees}
					onToggleExistingTrees={setShowExistingTrees}
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
					showGoogleTiles={showGoogleTiles}
					onToggleGoogleTiles={setShowGoogleTiles}
					buildingInfo={buildingInfo}
					activeVbos={activeVbos}
					tileProperties={tileProperties}
				/>
			),
		},
		{
			id: "sunShadow",
			icon: <SunIcon />,
			label: "Sun & Shadow",
			panel: (
				<SunShadowPanel
					enabled={showSunShadow}
					onToggle={setShowSunShadow}
					simulationDate={simulationDate}
					onDateChange={setSimulationDate}
				/>
			),
		},
		{
			id: "togglePerspective",
			icon: <PerspectiveIcon />,
			label: "Toggle Perspective",
			onClick: () => {
				cesiumMapRef.current?.togglePerspective();
			},
			panel: undefined,
		},
		{
			id: "information",
			icon: <InformationIcon />,
			label: "Information",
			panel: <InformationPanel />,
		},
	];

	return (
		<div style={{ position: "relative", height: "100dvh", width: "100%" }}>
			<CesiumMap
				ref={cesiumMapRef}
				onLeftClick={handleCesiumClick}
				isEditingMode={isEditingMode}
				showSunShadow={showSunShadow}
				simulationTime={showSunShadow ? simulationDate : null}
			>
				{overlayLayers.map((layer) => (
					<WMSOverlayLayer
						key={layer.id}
						layerId={layer.id}
						objectsVersion={objectsVersion}
						opacity={layer.opacity}
					/>
				))}

				{showExistingTrees && (
					<ExistingTreesEntities onStatusChange={setTreeLoadStatus} />
				)}

				{showObjects && <StaticTreesEntities />}

				{showObjects && (
					<UserObjectsEntities
						objectsToSave={objectsToSave}
						objectTypes={objectTypes}
					/>
				)}

				{showBuildings && (
					<BAG3DTileset
						heightOffset={BAG_3D_HEIGHT_OFFSET}
						selectedBagId={buildingInfo?.bag_id ?? null}
						shadowsEnabled={showSunShadow}
					/>
				)}

				{showGoogleTiles && (
					<GooglePhotorealisticTileset shadowsEnabled={showSunShadow} />
				)}
			</CesiumMap>

			{isProcessing && (
				<LoadingIndicator
					label="Processing"
					backgroundColor="white"
					textColor="black"
					left={loaderLeft}
				/>
			)}

			{showExistingTrees && (
				<TreeLoadingIndicator
					status={treeLoadStatus}
					left={isProcessing ? `calc(${loaderLeft} + 320px)` : loaderLeft}
				/>
			)}

			{/* BOTTOM RIGHT INFO PANEL */}
			<div
				style={{
					position: "absolute",
					bottom: 40,
					right: 10,
					zIndex: 1000,
					pointerEvents: "none",
					display: "flex",
					flexDirection: "column",
					alignItems: "flex-end",
					gap: "12px",
				}}
			>
				<PerformanceOverlay />
				{legend && overlayLayers.length > 0 && (
					<LegendCard legend={legend} title="PET Index Legend" />
				)}
				{featureInfo && !buildingInfo ? (
					<FeatureInfoCard info={featureInfo} />
				) : null}
			</div>

			<div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
				<div
					style={{
						position: "absolute",
						height: "100dvh",
						width: 400,
						pointerEvents: "auto",
					}}
				>
					<SideMenu
						items={items}
						activeId={activeSideMenuId}
						onChange={setActiveSideMenuId}
					/>
				</div>
			</div>
		</div>
	);
}
