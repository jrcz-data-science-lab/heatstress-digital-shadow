import { useState } from "react";
import { HeightMapTab } from "./wind/HeightMapTab";
import { BuildingsTab } from "./wind/BuildingsTab";
import { TreesTab } from "./wind/TreesTab";

export function WindPanel() {
  const [activeTab, setActiveTab] = useState<"height" | "buildings" | "trees">("height");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Tab Navigation */}
      <div style={{ display: "flex", borderBottom: "2px solid #ddd", marginBottom: "1rem", flexShrink: 0 }}>
        <button
          onClick={() => setActiveTab("height")}
          style={{
            flex: 1,
            padding: "0.75rem",
            backgroundColor: activeTab === "height" ? "#4CAF50" : "#f5f5f5",
            color: activeTab === "height" ? "white" : "#333",
            border: "none",
            borderBottom: activeTab === "height" ? "3px solid #2e7d32" : "none",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "0.95rem",
          }}
        >
          Height Map
        </button>
        <button
          onClick={() => setActiveTab("buildings")}
          style={{
            flex: 1,
            padding: "0.75rem",
            backgroundColor: activeTab === "buildings" ? "#2196F3" : "#f5f5f5",
            color: activeTab === "buildings" ? "white" : "#333",
            border: "none",
            borderBottom: activeTab === "buildings" ? "3px solid #1565c0" : "none",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "0.95rem",
          }}
        >
          Buildings
        </button>
        <button
          onClick={() => setActiveTab("trees")}
          style={{
            flex: 1,
            padding: "0.75rem",
            backgroundColor: activeTab === "trees" ? "#4CAF50" : "#f5f5f5",
            color: activeTab === "trees" ? "white" : "#333",
            border: "none",
            borderBottom: activeTab === "trees" ? "3px solid #2e7d32" : "none",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "0.95rem",
          }}
        >
          Trees
        </button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", paddingRight: "0.5rem" }}>
        {activeTab === "height" && <HeightMapTab />}
        {activeTab === "buildings" && <BuildingsTab />}
        {activeTab === "trees" && <TreesTab />}
      </div>
    </div>
  );
}