import CheckboxItem from "./items/CheckboxItem";

type BuildingsPanelProps = {
  showBuildings: boolean;
  onToggleBuildings: (value: boolean) => void;
};

export function BuildingsPanel({
  showBuildings,
  onToggleBuildings,
}: BuildingsPanelProps) {
  return (
    <>
      <div>
        <div>
          <h3>3DBAG Buildings</h3>
        </div>

        <div>
          <CheckboxItem
            label="Display Buildings"
            checked={showBuildings}
            onChange={onToggleBuildings}
          />
        </div>
      </div>

      <div
        style={{
          marginTop: "1rem",
          backgroundColor: "#f1e9e9ff",
          paddingLeft: 10,
          fontStyle: "italic",
        }}
      >
        <span style={{ fontWeight: "bold" }}>Help: About buildings</span>
        <p>
          When buildings are enabled, you can click on a building on the map to
          see information about it.
        </p>
        <p>
          This includes details such as the construction year and the type of
          building.
        </p>
      </div>
    </>
  );
}
