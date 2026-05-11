import DeckGL from "@deck.gl/react";
import { MapView } from "@deck.gl/core";
import type { Layer, PickingInfo } from "@deck.gl/core";

type ClickHandler = (info: PickingInfo) => void | boolean;

type Props = {
  layers: Layer[];
  onMapInteraction?: ClickHandler;
  initialViewState: {
    longitude: number;
    latitude: number;
    zoom: number;
    pitch?: number;
    bearing?: number;
  };
  isEditingMode?: boolean;
};

export default function DeckMap({
  layers,
  initialViewState,
  onMapInteraction,
  isEditingMode = false,
}: Props) {
  return (
    <div
      onContextMenu={(evt) => {
        evt.preventDefault();
      }}
      style={{ position: "absolute", inset: 0 }}
    >
      <DeckGL
        views={new MapView({ id: "main" })}
        controller={true}
        layers={layers}
        initialViewState={initialViewState}
        onClick={onMapInteraction}
        getCursor={({ isDragging }) => {
          if (isDragging) return "grabbing";
          if (isEditingMode) return "crosshair";
          return "default";
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 8,
          bottom: 8,
          background: "rgba(255,255,255,0.8)",
          color: "black",
          padding: "2px 6px",
          borderRadius: 6,
          fontSize: 12,
        }}
      >
        ©{" "}
        <a href="https://www.openstreetmap.org/copyright" target="_blank">
          OpenStreetMap
        </a>{" "}
        contributors
      </div>
    </div>
  );
}
