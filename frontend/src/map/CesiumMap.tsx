import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Viewer, CameraFlyTo } from 'resium';
import {
  Cartesian3,
  Cartographic,
  Math as CesiumMath,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Ion,
} from 'cesium';

// Disable Cesium Ion — we use only self-hosted data
Ion.defaultAccessToken = '';

export type CesiumClickInfo = {
  coordinate: [lon: number, lat: number] | null;
  pickedEntityId?: string;
};

type Props = {
  children?: ReactNode;
  onLeftClick?: (info: CesiumClickInfo) => void;
  isEditingMode?: boolean;
};

// Zeeland/Kapelle overview
const INITIAL_LON = 3.83;
const INITIAL_LAT = 50.45;
const INITIAL_HEIGHT = 100000;
const PITCH_3D = CesiumMath.toRadians(-45);  // tilted perspective
const PITCH_2D = CesiumMath.toRadians(-90);  // straight down

export default function CesiumMap({ children, onLeftClick, isEditingMode = false }: Props) {
  const viewerRef = useRef<{ cesiumElement: import('cesium').Viewer } | null>(null);
  const [isPerspective, setIsPerspective] = useState(true);
  const [initialFlyDone, setInitialFlyDone] = useState(false);

  // Set up click handler
  useEffect(() => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer || !onLeftClick) return;

    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);

    handler.setInputAction((movement: { position: import('cesium').Cartesian2 }) => {
      const scene = viewer.scene;

      const picked = scene.pick(movement.position);
      const pickedEntityId: string | undefined =
        picked?.id?.id ?? picked?.id ?? undefined;

      const cartesian = viewer.camera.pickEllipsoid(movement.position);
      if (!cartesian) {
        onLeftClick({ coordinate: null, pickedEntityId });
        return;
      }

      const cartographic = Cartographic.fromCartesian(cartesian);
      const lon = CesiumMath.toDegrees(cartographic.longitude);
      const lat = CesiumMath.toDegrees(cartographic.latitude);

      onLeftClick({ coordinate: [lon, lat], pickedEntityId });
    }, ScreenSpaceEventType.LEFT_CLICK);

    return () => { handler.destroy(); };
  }, [onLeftClick]);

  // Remove default Cesium imagery layer on mount
  useEffect(() => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer) return;
    viewer.imageryLayers.removeAll();
  }, []);

  // Update cursor style
  useEffect(() => {
    const canvas = viewerRef.current?.cesiumElement?.scene?.canvas;
    if (!canvas) return;
    canvas.style.cursor = isEditingMode ? 'crosshair' : 'default';
  }, [isEditingMode]);

  const handleTogglePerspective = () => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer) return;

    const pos = viewer.camera.positionCartographic;
    viewer.camera.flyTo({
      destination: Cartesian3.fromRadians(pos.longitude, pos.latitude, pos.height),
      orientation: {
        heading: viewer.camera.heading,
        pitch: isPerspective ? PITCH_2D : PITCH_3D,
        roll: 0,
      },
      duration: 0.8,
    });
    setIsPerspective(prev => !prev);
  };

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Viewer
        ref={viewerRef}
        full
        baseLayerPicker={false}
        geocoder={false}
        homeButton={false}
        sceneModePicker={false}
        navigationHelpButton={false}
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
            destination={Cartesian3.fromDegrees(INITIAL_LON, INITIAL_LAT, INITIAL_HEIGHT)}
            orientation={{ heading: 0, pitch: PITCH_3D, roll: 0 }}
            onComplete={() => setInitialFlyDone(true)}
          />
        )}
        {children}
      </Viewer>

      {/* Perspective / top-down toggle */}
      <button
        onClick={handleTogglePerspective}
        title={isPerspective ? 'Switch to top-down view' : 'Switch to perspective view'}
        style={{
          position: 'absolute',
          right: 8,
          bottom: 36,
          background: 'rgba(255,255,255,0.9)',
          color: 'black',
          border: '1px solid rgba(0,0,0,0.2)',
          padding: '4px 10px',
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          zIndex: 1,
        }}
      >
        {isPerspective ? '2D' : '3D'}
      </button>

      <div
        style={{
          position: 'absolute',
          right: 8,
          bottom: 8,
          background: 'rgba(255,255,255,0.8)',
          color: 'black',
          padding: '2px 6px',
          borderRadius: 6,
          fontSize: 12,
          zIndex: 1,
          pointerEvents: 'auto',
        }}
      >
        © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors
      </div>
    </div>
  );
}
