import { useState } from "react";
import { HeightMapTab } from "./wind/HeightMapTab";
import { BuildingsTab } from "./wind/BuildingsTab";
import { TreesTab } from "./wind/TreesTab";
import { GridTab } from "./wind/GridTab";
import { WindReductionTab } from "./wind/WindReductionTab";
import "./WindPanel.css";

const WIND_TABS = [
  {
    id: "reduction",
    label: "Wind Reduction",
  },
  {
    id: "height",
    label: "Height Map",
  },
  {
    id: "buildings",
    label: "Buildings",
  },
  {
    id: "trees",
    label: "Trees",
  },
  {
    id: "grid",
    label: "Grid",
  },
] as const;

type WindTabId = (typeof WIND_TABS)[number]["id"];

export function WindPanel() {
  const [activeTab, setActiveTab] = useState<WindTabId>("reduction");

  return (
    <div className="wind-panel">
      <h3>Wind (Debug)</h3>

      {/* Tab Navigation */}
      <div className="wind-panel__tabs">
        {WIND_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const tabClassName = `wind-panel__tab wind-panel__tab--${tab.id}${isActive ? " is-active" : ""}`;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={tabClassName}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className="wind-panel__content">
        {activeTab === "reduction" && <WindReductionTab />}
        {activeTab === "height" && <HeightMapTab />}
        {activeTab === "buildings" && <BuildingsTab />}
        {activeTab === "trees" && <TreesTab />}
        {activeTab === "grid" && <GridTab />}
      </div>
    </div>
  );
}