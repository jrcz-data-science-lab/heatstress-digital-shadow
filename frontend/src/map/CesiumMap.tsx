import { type ReactNode, useEffect, useRef } from 'react';
import { Viewer } from 'resium';
import {
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

export default function CesiumMap({ children, onLeftClick, isEditingMode = false }: Props) {
  const viewerRef = useRef<{ cesiumElement: import('cesium').Viewer } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Set up click handler
  useEffect(() => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer || !onLeftClick) return;

    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);

    handler.setInputAction((movement: { position: import('cesium').Cartesian2 }) => {
      const scene = viewer.scene;

      // Pick entity at click position
      const picked = scene.pick(movement.position);
      const pickedEntityId: string | undefined =
        picked?.id?.id ?? picked?.id ?? undefined;

      // Convert screen position to lon/lat
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

    return () => {
      handler.destroy();
    };
  }, [onLeftClick]);

  // Update cursor style
  useEffect(() => {
    const canvas = viewerRef.current?.cesiumElement?.scene?.canvas;
    if (!canvas) return;
    canvas.style.cursor = isEditingMode ? 'crosshair' : 'default';
  }, [isEditingMode]);

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0 }}>
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
        // Disable default Ion imagery — children provide their own
        imageryProvider={false as never}
        camera={{
          position: {
            longitude: CesiumMath.toRadians(3.613),
            latitude: CesiumMath.toRadians(51.5),
            height: 3000,
          },
          heading: 0,
          pitch: CesiumMath.toRadians(-45),
          roll: 0,
        }}
      >
        {children}
      </Viewer>

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
