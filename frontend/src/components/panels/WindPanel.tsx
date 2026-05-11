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
    Component: WindReductionTab,
  },
  {
    id: "height",
    label: "Height Map",
    Component: HeightMapTab,
  },
  {
    id: "buildings",
    label: "Buildings",
    Component: BuildingsTab,
  },
  {
    id: "trees",
    label: "Trees",
    Component: TreesTab,
  },
  {
    id: "grid",
    label: "Grid",
    Component: GridTab,
  },
] as const;

type WindTabId = (typeof WIND_TABS)[number]["id"];

export function WindPanel() {
  const [activeTab, setActiveTab] = useState<WindTabId>("reduction");
  const activeTabConfig =
    WIND_TABS.find((tab) => tab.id === activeTab) ?? WIND_TABS[0];
  const ActiveTab = activeTabConfig.Component;

  return (
    <div className="wind-panel">
      <h3>Wind (Debug)</h3>

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
        <ActiveTab />
      </div>
    </div>
  );
}
