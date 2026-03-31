import type { MeasureType } from "./features/objects/lib/objectLayer";
import type { SideMenuItem } from "./components/sideMenu/SideMenuItem";
import React, { useCallback, useEffect, useRef, useState } from "react";
import CesiumMap, {
	type CesiumClickInfo,
	type CesiumMapHandle,
} from "./map/CesiumMap";
import { WMSOverlayLayer } from "./features/wms-overlay/WMSOverlayLayer";
import { StaticTreesEntities } from "./features/objects/StaticTreesEntities";
import { ExistingTreesEntities, type TreeLoadStatus } from "./features/existing-trees/ExistingTreesEntities";
import { UserObjectsEntities } from "./features/objects/UserObjectsEntities";
import { BAG3DTileset } from "./features/buildings-3d/BAG3DTileset";
import { useUserObjectsLayer } from "./features/objects/useUserObjectsLayer";
import { useWMSLayers } from "./features/wms-overlay/useWMSLayers";
import { useBuildingHighlight } from "./features/buildings-3d/useBuildingHighlight";
import {
	QGIS_OVERLAY_LAYERS,
	type QgisLayerId,
} from "./features/wms-overlay/lib/qgisLayers";
import { SideMenu } from "./components/sideMenu/SideMenu";
import { LayersIcon } from "./components/icons/LayersIcon";
import { OverlayLayersPanel } from "./components/panels/OverlayLayersPanel";
import { TreeIcon } from "./components/icons/TreeIcon";
import { HeatStressMeasuresPanel } from "./components/panels/HeatStressMeasuresPanel";
import { BuildingIcon } from "./components/icons/BuildingIcon";
import { BuildingsPanel } from "./components/panels/BuildingsPanel";
import { FeatureInfoCard } from "./components/infoCards/FeatureInfoCard";
import { LoadingIndicator } from "./components/loading/LoadingIndicator";
import { TreeLoadingIndicator } from "./components/loading/TreeLoadingIndicator";
import { LegendCard } from "./components/legend/LegendCard";
import { PerspectiveIcon } from "./components/icons/PerspectiveIcon";

export default function App() {
	const [showBuildings, setShowBuildings] = React.useState(false);
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

	// Height offset for the BAG 3D Tileset to align better with the terrain. Adjust as needed based on visual inspection.
	const BAG_3D_HEIGHT_OFFSET = -45;

	const [showOverlay, setShowOverlay] = useState(true);
	const [overlayLayerId, setOverlayLayerId] = useState<QgisLayerId>(
		QGIS_OVERLAY_LAYERS[0].id,
	);

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
		showOverlay,
		overlayLayerId,
	});

	const { handleBuildingClick, buildingInfo, tileProperties } = useBuildingHighlight(
		{
			enabled: showBuildings,
		},
	);

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
		({ coordinate, pickedEntityId, bagId, tileProperties }: CesiumClickInfo) => {
			const lon = coordinate?.[0];
			const lat = coordinate?.[1];

			if (showBuildings && lon != null && lat != null) {
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
		[showBuildings, handleBuildingClick, handleInteraction, handleMapClick],
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
					value={overlayLayerId}
					onChange={(id) => {
						setShowOverlay(id !== "");
						setOverlayLayerId(id as QgisLayerId);
					}}
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
					buildingInfo={buildingInfo}
					activeVbos={activeVbos}
					tileProperties={tileProperties}
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
	];

	return (
		<div style={{ position: "relative", height: "100dvh", width: "100%" }}>
			<CesiumMap
				ref={cesiumMapRef}
				onLeftClick={handleCesiumClick}
				isEditingMode={isEditingMode}
			>
				{showOverlay && (
					<WMSOverlayLayer
						layerId={overlayLayerId}
						objectsVersion={objectsVersion}
					/>
				)}

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
					/>
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
				{legend && showOverlay && overlayLayerId === "pet-version-1" && (
					<LegendCard legend={legend} title="PET Index Legend" />
				)}
				{featureInfo && !buildingInfo ? (
					<FeatureInfoCard info={featureInfo} />
				) : null}
			</div>

			<div
				style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
			>
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
