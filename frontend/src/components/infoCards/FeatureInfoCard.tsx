interface FeatureInfo {
  band?: number | null;
  lon: number;
  lat: number;
}

interface FeatureInfoCardProps {
  info: FeatureInfo;
  valueLabel?: string;
  unit?: string;
}

export const FeatureInfoCard = ({ info, valueLabel = "Value", unit = "" }: FeatureInfoCardProps) => {
  const formattedValue = info.band != null
    ? `${info.band.toFixed(2)}${unit ? ` ${unit}` : ""}`
    : "n/a";

  return (
    <div style={{
      padding: "12px 16px",
      background: "#ffffff",
      borderRadius: "12px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
      border: "1px solid rgba(0,0,0,0.15)",
      fontSize: "13px",
      color: "#000000",
      pointerEvents: "auto",
      display: "flex",
      flexDirection: "column",
      gap: "10px",
      width: "232px",
    }}>
      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
        <strong style={{ color: "#000000" }}>{valueLabel}:</strong>
        <span style={{ color: "#000000", fontWeight: 400 }}>{formattedValue}</span>
      </div>

      <div style={{
        color: "#333333",
        fontSize: "13px",
        borderTop: "1px solid #ddd",
        paddingTop: "10px",
        display: "flex",
        gap: "4px"
      }}>
        <strong style={{ color: "#000000" }}>Lon/Lat:</strong>
        <span>{info.lon.toFixed(4)}, {info.lat.toFixed(4)}</span>
      </div>
    </div>
  );
};
