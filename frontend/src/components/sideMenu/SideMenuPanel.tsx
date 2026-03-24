import type { SideMenuItem } from "./SideMenuItem";

interface PanelProps {
  activeItem?: SideMenuItem;
  onClose: () => void;
}

const SideMenuPanel: React.FC<PanelProps> = ({ activeItem, onClose }) => {
  if (!activeItem) return null;

  return (
    <div
      style={{
        width: 300,
        background: "#fff",
        borderLeft: "1px solid #ccc",
        padding: 20,
        marginTop: 0,
        paddingTop: 0,
        position: "relative",
        height: "100%",
        overflowY: "auto",
        boxSizing: "border-box",
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: 5,
          right: 10,
          background: "transparent",
          border: "none",
          fontSize: 20,
          cursor: "pointer",
          width: 50,
          color: "black",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        aria-label="Close panel"
      >
        ×
      </button>
      {activeItem.panel}
    </div>
  );
};

export default SideMenuPanel;
