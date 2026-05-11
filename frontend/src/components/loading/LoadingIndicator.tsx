import "./LoadingIndicator.css";

type LoadingIndicatorProps = {
  label: string;
  backgroundColor: string;
  textColor: string;
  left?: number | string;
};

export function LoadingIndicator({
  label,
  backgroundColor,
  textColor,
  left = "26rem",
}: LoadingIndicatorProps) {
  return (
    <div
      style={{
        position: "absolute",
        top: 20,
        left: left,
        background: backgroundColor,
        color: textColor,
        fontWeight: 600,
        padding: "9px 20px",
        borderRadius: "12px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
        border: "1px solid rgba(0,0,0,0.15)",
        fontSize: "18px",
        pointerEvents: "auto",
        display: "flex",
        gap: "16px",
        alignItems: "center",
      }}
    >
      <span className="loading-dots">{label}</span>
    </div>
  );
}
