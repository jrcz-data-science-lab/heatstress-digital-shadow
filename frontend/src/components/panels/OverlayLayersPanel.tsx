import type { QgisLayerId } from "../../features/wms-overlay/lib/qgisLayers";
import { QGIS_OVERLAY_LAYERS } from "../../features/wms-overlay/lib/qgisLayers";
import CheckboxItem from "./items/CheckboxItem";

type OverlayProps = {
  value: QgisLayerId | "";
  onChange: (val: QgisLayerId | "") => void;
  showExistingTrees: boolean;
  onToggleExistingTrees: (value: boolean) => void;
};

export function OverlayLayersPanel({ value, onChange, showExistingTrees, onToggleExistingTrees }: OverlayProps) {
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
    </div>
  );
}
