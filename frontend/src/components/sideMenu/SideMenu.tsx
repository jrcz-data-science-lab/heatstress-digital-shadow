import React from "react";
import SideMenuBar from "./SideMenuBar";
import type { SideMenuItem } from "./SideMenuItem";
import SideMenuPanel from "./SideMenuPanel";

interface Props {
  items: SideMenuItem[];
  activeId: string | null;
  onChange: (id: string | null) => void;
}

export const SideMenu: React.FC<Props> = ({ items, activeId, onChange }) => {
  const toggleMenu = (id: string) => {
    onChange(activeId === id ? null : id);
  };

  const closeMenu = () => onChange(null);

  return (
    <div style={{ display: "flex", height: "100%", color: "black" }}>
      <SideMenuBar items={items} activeItem={activeId} onSelect={toggleMenu} />

      <SideMenuPanel
        activeItem={items.find((i) => i.id === activeId)}
        onClose={closeMenu}
      />
    </div>
  );
};
