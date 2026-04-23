import type { QgisLayerId } from "../../features/wms-overlay/lib/qgisLayers";
import { QGIS_OVERLAY_LAYERS } from "../../features/wms-overlay/lib/qgisLayers";
import CheckboxItem from "./items/CheckboxItem";

type OverlayProps = {
  value: QgisLayerId | "";
  onChange: (val: QgisLayerId | "") => void;
  opacity: number;
  onOpacityChange: (opacity: number) => void;
  showExistingTrees: boolean;
  onToggleExistingTrees: (value: boolean) => void;
};

export function OverlayLayersPanel({ value, onChange, opacity, onOpacityChange, showExistingTrees, onToggleExistingTrees }: OverlayProps) {
  return (
    <div>
      <h3>Overlay Layers</h3>

      <CheckboxItem
        label="Existing Trees (BGT)"
        checked={showExistingTrees}
        onChange={onToggleExistingTrees}
      />

      <hr style={{ border: "none", borderTop: "1px solid #e5e5e5", margin: "12px 0" }} />

      <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "0.5rem",
            cursor: "pointer",
          }}
        >
          <input
            type="radio"
            name="overlay-layer"
            checked={value === ""}
            onChange={() => onChange("")}
            style={{ cursor: "pointer" }}
          />
          None
        </label>
        {QGIS_OVERLAY_LAYERS.map((layer) => (
          <label
            key={layer.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.5rem",
              cursor: "pointer",
            }}
          >
            <input
              type="radio"
              name="overlay-layer"
              checked={value === layer.id}
              onChange={() => onChange(layer.id)}
              style={{
                cursor: "pointer",
              }}
            />
            {layer.label}
          </label>
        ))}
      </fieldset>

      {value !== "" && (
        <>
          <hr style={{ border: "none", borderTop: "1px solid #e5e5e5", margin: "12px 0" }} />
          <div>
            <label
              htmlFor="overlay-opacity"
              style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem", fontSize: "0.875rem" }}
            >
              <span>Opacity</span>
              <span>{Math.round(opacity * 100)}%</span>
            </label>
            <input
              id="overlay-opacity"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={opacity}
              onChange={(e) => onOpacityChange(Number(e.target.value))}
              style={{ width: "100%", cursor: "pointer" }}
            />
          </div>
        </>
      )}
    </div>
  );
}
