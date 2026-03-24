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
} from "cesium";

export type CesiumClickInfo = {
	coordinate: [lon: number, lat: number] | null;
	pickedEntityId?: string;
	/** BAG building ID (identificatie) extracted directly from a clicked 3D tileset feature */
	bagId?: string;
	/** Absolute roof height in metres above NAP (b3_h_dak_50p from 3D BAG tileset) */
	roofHeight?: number;
	/** Absolute ground level in metres above NAP (b3_h_maaiveld from 3D BAG tileset) */
	groundHeight?: number;
};

export type CesiumMapHandle = {
	togglePerspective: () => void;
};

type Props = {
	children?: ReactNode;
	onLeftClick?: (info: CesiumClickInfo) => void;
	isEditingMode?: boolean;
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
	{ children, onLeftClick, isEditingMode },
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

				// Extract BAG ID and real height data if a 3D tileset feature was clicked.
				// The 3D BAG tileset exposes identificatie, b3_h_dak_50p (roof), and b3_h_maaiveld (ground).
				let bagId: string | undefined;
				let roofHeight: number | undefined;
				let groundHeight: number | undefined;
				if (picked instanceof Cesium3DTileFeature) {
					const raw: string | undefined = picked.getProperty("identificatie");
					// Strip "NL.IMBAG.Pand." prefix if present — Kadaster API only wants the numeric part.
					bagId = raw?.replace(/^NL\.IMBAG\.Pand\./, "") ?? undefined;
					// Real heights — absolute metres above NAP. Used to perfectly align the highlight polygon.
					roofHeight = picked.getProperty("b3_h_dak_50p") ?? undefined;
					groundHeight = picked.getProperty("b3_h_maaiveld") ?? undefined;
				}

				// Try pickPosition first (works for 3D entities/tiles), fall back to ellipsoid
				const cartesian =
					scene.pickPosition(movement.position) ??
					viewer.camera.pickEllipsoid(movement.position);
				if (!cartesian) {
					onLeftClick({ coordinate: null, pickedEntityId, bagId, roofHeight, groundHeight });
					return;
				}

				const cartographic = Cartographic.fromCartesian(cartesian);
				const lon = CesiumMath.toDegrees(cartographic.longitude);
				const lat = CesiumMath.toDegrees(cartographic.latitude);

				onLeftClick({ coordinate: [lon, lat], pickedEntityId, bagId, roofHeight, groundHeight });
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

			<div
				style={{
					position: "absolute",
					left: 60,
					bottom: 8,
					background: "rgba(255,255,255,0.8)",
					color: "black",
					padding: "2px 6px",
					borderRadius: 6,
					fontSize: 12,
					zIndex: 1,
					pointerEvents: "auto",
				}}
			>
				©{" "}
				<a
					href="https://www.openstreetmap.org/copyright"
					target="_blank"
					rel="noreferrer"
				>
					OpenStreetMap
				</a>{" "}
				contributors
				{" · "}©{" "}
				<a href="https://3dbag.nl" target="_blank" rel="noreferrer">
					3D BAG
				</a>{" "}
				by TU Delft
			</div>
		</div>
	);
});

export default CesiumMap;
