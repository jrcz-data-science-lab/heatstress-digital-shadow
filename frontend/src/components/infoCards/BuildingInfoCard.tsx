interface VboData {
  bag_id: string;
  usage_function?: string[];
  surface_area_m2?: number;
  status?: string;
}

interface PandData {
  bag_id?: string;
  construction_year?: number | string;
  status?: string;
}

interface BuildingInfo {
  bag_id?: string;
  pand_data?: PandData;
  verblijfsobject_data?: VboData[];
}

interface BuildingInfoCardProps {
  buildingInfo: BuildingInfo;
  activeVbos: VboData[];
  usageFunctions: string[];
}

export const BuildingInfoCard = ({
  buildingInfo,
  activeVbos,
  usageFunctions,
}: BuildingInfoCardProps) => {
  return (
    <div
      style={{
        padding: "12px",
        background: "#ffffff",
        borderRadius: "12px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
        border: "1px solid rgba(0,0,0,0.15)",
        width: "240px",
        pointerEvents: "auto",
        color: "#000000",
      }}
    >
      <h3
        style={{
          margin: "0 0 4px 0",
          fontSize: "15px",
          fontWeight: 700,
          color: "#000000",
        }}
      >
        Building Details
      </h3>

      <code
        style={{
          fontSize: "11px",
          color: "#333333",
          display: "block",
          marginBottom: "10px",
        }}
      >
        ID: {buildingInfo.pand_data?.bag_id ?? buildingInfo.bag_id}
      </code>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px",
          fontSize: "13px",
          borderTop: "1px solid #ddd",
          paddingTop: "10px",
          color: "#000000",
        }}
      >
        <div>
          <label
            style={{
              color: "#444",
              display: "block",
              fontSize: "11px",
              fontWeight: 600,
            }}
          >
            Year
          </label>
          <strong style={{ color: "#000000" }}>
            {buildingInfo.pand_data?.construction_year ?? "—"}
          </strong>
        </div>
        <div>
          <label
            style={{
              color: "#444",
              display: "block",
              fontSize: "11px",
              fontWeight: 600,
            }}
          >
            Status
          </label>
          <strong style={{ color: "#000000" }}>
            {buildingInfo.pand_data?.status ?? "—"}
          </strong>
        </div>
      </div>

      <div style={{ marginTop: "10px", fontSize: "13px", color: "#000000" }}>
        <label
          style={{
            color: "#444",
            display: "block",
            fontSize: "11px",
            fontWeight: 600,
          }}
        >
          Usage
        </label>
        <strong style={{ color: "#000000" }}>
          {usageFunctions.join(", ") || "Unknown"}
        </strong>
      </div>

      {activeVbos.length > 0 && (
        <div style={{ marginTop: "12px" }}>
          <div
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "#000000",
              marginBottom: "8px",
            }}
          >
            Active Units
          </div>
          <div
            style={{
              maxHeight: "160px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            {activeVbos.map((vbo: VboData) => (
              <div
                key={vbo.bag_id}
                style={{
                  background: "#f0f0f0",
                  padding: "8px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "#000000",
                  border: "1px solid #e0e0e0",
                }}
              >
                <div style={{ fontWeight: 600 }}>
                  {vbo.usage_function?.[0] ?? "Unknown"}
                </div>
                <div style={{ fontSize: "11px" }}>
                  {vbo.surface_area_m2} m² · {vbo.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
