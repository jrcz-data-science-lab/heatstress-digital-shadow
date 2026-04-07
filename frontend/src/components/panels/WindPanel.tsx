import { useState } from "react";
import { HeightMapTab } from "./wind/HeightMapTab";
import { BuildingsTab } from "./wind/BuildingsTab";
import { TreesTab } from "./wind/TreesTab";
import { GridTab } from "./wind/GridTab";
import { WindReductionTab } from "./wind/WindReductionTab";

export function WindPanel() {
  const [activeTab, setActiveTab] = useState<"reduction" | "height" | "buildings" | "trees" | "grid">("reduction");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Tab Navigation */}
      <div style={{ display: "flex", borderBottom: "2px solid #ddd", marginBottom: "1rem", flexShrink: 0 }}>
        <button
          onClick={() => setActiveTab("reduction")}
          style={{
            flex: 1,
            padding: "0.75rem",
            backgroundColor: activeTab === "reduction" ? "#FF6B6B" : "#f5f5f5",
            color: activeTab === "reduction" ? "white" : "#333",
            border: "none",
            borderBottom: activeTab === "reduction" ? "3px solid #c92a2a" : "none",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "0.95rem",
          }}
        >
          Wind Reduction
        </button>
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
        <button
          onClick={() => setActiveTab("grid")}
          style={{
            flex: 1,
            padding: "0.75rem",
            backgroundColor: activeTab === "grid" ? "#9C27B0" : "#f5f5f5",
            color: activeTab === "grid" ? "white" : "#333",
            border: "none",
            borderBottom: activeTab === "grid" ? "3px solid #6a0080" : "none",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "0.95rem",
          }}
        >
          Grid
        </button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", paddingRight: "0.5rem" }}>
        {activeTab === "reduction" && <WindReductionTab />}
        {activeTab === "height" && <HeightMapTab />}
        {activeTab === "buildings" && <BuildingsTab />}
        {activeTab === "trees" && <TreesTab />}
        {activeTab === "grid" && <GridTab />}
      </div>
    </div>
  );
}