import {
	type ReactNode,
	forwardRef,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from "react";
import { Viewer, CameraFlyTo } from "resium";
import {
	Cartesian3,
	Cartographic,
	Math as CesiumMath,
	ScreenSpaceEventHandler,
	ScreenSpaceEventType,
	Camera,
	Rectangle,
	Cesium3DTileFeature,
	JulianDate,
} from "cesium";
import type { TileProperties } from "../features/buildings-3d/lib/buildingMetadataApi";

export type CesiumClickInfo = {
	coordinate: [lon: number, lat: number] | null;
	pickedEntityId?: string;
	/** Numeric BAG ID (without NL.IMBAG.Pand. prefix) from the clicked 3D tileset feature */
	bagId?: string;
	/** All useful 3D BAG tileset feature properties, read at click time — no extra API call */
	tileProperties?: TileProperties;
};

export type CesiumMapHandle = {
	togglePerspective: () => void;
};

type Props = {
	children?: ReactNode;
	onLeftClick?: (info: CesiumClickInfo) => void;
	isEditingMode?: boolean;
	showSunShadow?: boolean;
	simulationTime?: Date | null;
};

// Home button position and default view rectangle are set to cover Zeeland by default, but can be adjusted as needed.
Camera.DEFAULT_VIEW_RECTANGLE = Rectangle.fromDegrees(
	3.58, // west
	51.36, // south
	3.97, // east
	51.6, // north
);
Camera.DEFAULT_VIEW_FACTOR = 0.05;

// Zeeland overview
const INITIAL_LON = 3.83;
const INITIAL_LAT = 50.45;
const INITIAL_HEIGHT = 100000;
const PITCH_3D = CesiumMath.toRadians(-45); // tilted perspective
const PITCH_2D = CesiumMath.toRadians(-90); // straight down

const CesiumMap = forwardRef<CesiumMapHandle, Props>(function CesiumMap(
	{ children, onLeftClick, isEditingMode, showSunShadow = false, simulationTime },
	ref,
) {
	const viewerRef = useRef<{ cesiumElement: import("cesium").Viewer } | null>(
		null,
	);
	const [isPerspective, setIsPerspective] = useState(true);
	const [initialFlyDone, setInitialFlyDone] = useState(false);
	const basemapSet = useRef(false);

	// Set up click handler (also sets default base layer once, since the viewer
	// isn't ready during the initial mount render and needs onLeftClick to be stable first)
	useEffect(() => {
		const viewer = viewerRef.current?.cesiumElement;
		if (!viewer || !onLeftClick) return;

		if (!basemapSet.current) {
			const viewModels =
				viewer.baseLayerPicker.viewModel.imageryProviderViewModels;
			const stadia = viewModels.find(
				(vm) => vm.name === "Stadia Alidade Smooth",
			);
			if (stadia) {
				viewer.baseLayerPicker.viewModel.selectedImagery = stadia;
				basemapSet.current = true;
			}
		}

		const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);

		handler.setInputAction(
			(movement: { position: import("cesium").Cartesian2 }) => {
				const scene = viewer.scene;

				const picked = scene.pick(movement.position);
				const pickedEntityId: string | undefined =
					picked?.id?.id ?? picked?.id ?? undefined;

				// Extract BAG ID and all useful 3D BAG tileset properties when a tile feature is clicked.
				let bagId: string | undefined;
				let tileProperties: TileProperties | undefined;
				if (picked instanceof Cesium3DTileFeature) {
					const raw: string | undefined = picked.getProperty("identificatie");
					// Strip "NL.IMBAG.Pand." prefix — Kadaster API only wants the numeric part.
					bagId = raw?.replace(/^NL\.IMBAG\.Pand\./, "") ?? undefined;

					// getProperty returns null for missing attrs — coerce to undefined.
					// For booleans, 3D Tiles may return 0/1 (int) instead of false/true,
					// so we explicitly cast those to boolean.
					const p = (name: string) => {
						const v = picked.getProperty(name);
						return v != null ? v : undefined;
					};
					const pBool = (name: string): boolean | undefined => {
						const v = picked.getProperty(name);
						if (v == null) return undefined;
						return Boolean(v);
					};

					const hMaaiveld: number | undefined = p("b3_h_maaiveld");
					// Try height attrs in order of preference — complex buildings (churches,
					// spires) often have null for the median (50p) but valid values for others.
					const hDak50p: number | undefined = p("b3_h_dak_50p");
					const hDak70p: number | undefined = p("b3_h_dak_70p");
					const hDakMax: number | undefined = p("b3_h_dak_max");
					const hNok: number | undefined = p("b3_h_nok");
					const hDakBest = hDak50p ?? hDak70p ?? hDakMax ?? hNok;

					tileProperties = {
						h_maaiveld: hMaaiveld,
						h_dak_50p: hDak50p,
						h_dak_max: hDakMax,
						// Height above ground — use the best available roof height attr.
						hoogte:
							hDakBest != null && hMaaiveld != null
								? Math.round((hDakBest - hMaaiveld) * 10) / 10
								: undefined,
						dak_type: p("b3_dak_type"),
						hellingshoek: p("b3_hellingshoek"),
						bouwlagen: p("b3_bouwlagen"),
						volume_lod22: p("b3_volume_lod22"),
						opp_grond: p("b3_opp_grond"),
						opp_dak_plat: p("b3_opp_dak_plat"),
						opp_dak_schuin: p("b3_opp_dak_schuin"),
						kwaliteitsindicator: pBool("b3_kwaliteitsindicator"),
						rmse_lod22: p("b3_rmse_lod22"),
						pw_datum: p("b3_pw_datum"),
						mutatie_ahn4_ahn5: pBool("b3_mutatie_ahn4_ahn5"),
					};
				}

				// Try pickPosition first (works for 3D entities/tiles), fall back to ellipsoid
				const cartesian =
					scene.pickPosition(movement.position) ??
					viewer.camera.pickEllipsoid(movement.position);
				if (!cartesian) {
					onLeftClick({
						coordinate: null,
						pickedEntityId,
						bagId,
						tileProperties,
					});
					return;
				}

				const cartographic = Cartographic.fromCartesian(cartesian);
				const lon = CesiumMath.toDegrees(cartographic.longitude);
				const lat = CesiumMath.toDegrees(cartographic.latitude);

				onLeftClick({
					coordinate: [lon, lat],
					pickedEntityId,
					bagId,
					tileProperties,
				});
			},
			ScreenSpaceEventType.LEFT_CLICK,
		);

		return () => {
			handler.destroy();
		};
	}, [onLeftClick]);

	const handleTogglePerspective = () => {
		const viewer = viewerRef.current?.cesiumElement;
		if (!viewer) return;

		const pos = viewer.camera.positionCartographic;
		viewer.camera.flyTo({
			destination: Cartesian3.fromRadians(
				pos.longitude,
				pos.latitude,
				pos.height,
			),
			orientation: {
				heading: viewer.camera.heading,
				pitch: isPerspective ? PITCH_2D : PITCH_3D,
				roll: 0,
			},
			duration: 0.2,
		});
		setIsPerspective((prev) => !prev);
	};

	useImperativeHandle(
		ref,
		() => ({ togglePerspective: handleTogglePerspective }),
		[isPerspective],
	);

	// Enable/disable Cesium shadow map and sun-based globe lighting.
	useEffect(() => {
		const viewer = viewerRef.current?.cesiumElement;
		if (!viewer) return;
		viewer.shadows = showSunShadow;
		viewer.scene.globe.enableLighting = showSunShadow;
		if (showSunShadow && viewer.shadowMap) {
			viewer.shadowMap.softShadows = true;
			viewer.shadowMap.maximumDistance = 5000;
		}
		// Stop Cesium's own real-time clock advance so we control time manually.
		viewer.clock.shouldAnimate = false;
	}, [showSunShadow]);

	// Sync the Cesium clock to the manually chosen simulation time.
	useEffect(() => {
		const viewer = viewerRef.current?.cesiumElement;
		if (!viewer || !simulationTime) return;
		viewer.clock.currentTime = JulianDate.fromDate(simulationTime);
	}, [simulationTime]);

	return (
		<div
			style={{
				position: "absolute",
				height: "100dvh",
				width: "100dvw",
				cursor: isEditingMode ? "crosshair" : "default",
			}}
		>
			<Viewer
				ref={viewerRef}
				full
				baseLayerPicker={true}
				geocoder={false}
				homeButton={true}
				sceneModePicker={false}
				navigationHelpButton={true}
				animation={false}
				timeline={false}
				fullscreenButton={false}
				infoBox={false}
				selectionIndicator={false}
			>
				{/* Set initial camera position once — removed after completion so re-renders don't re-trigger it */}
				{!initialFlyDone && (
					<CameraFlyTo
						duration={0}
						destination={Cartesian3.fromDegrees(
							INITIAL_LON,
							INITIAL_LAT,
							INITIAL_HEIGHT,
						)}
						orientation={{ heading: 0, pitch: PITCH_3D, roll: 0 }}
						onComplete={() => setInitialFlyDone(true)}
					/>
				)}
				{children}
			</Viewer>

		</div>
	);
});

export default CesiumMap;
