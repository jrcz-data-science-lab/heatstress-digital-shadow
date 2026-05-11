import type { SideMenuItem } from "./SideMenuItem";

interface BarProps {
  items: SideMenuItem[];
  activeItem: string | null;
  onSelect: (id: string) => void;
}

const SideMenuBar: React.FC<BarProps> = ({ items, activeItem, onSelect }) => {
  return (
    <div
      style={{
        width: 50,
        background: "#f4f4f4",
        borderRight: "1px solid #e0e1e3ff",
      }}
    >
      {items.map((item) => (
        <div
          key={item.id}
          onClick={() => onSelect(item.id)}
          style={{
            cursor: "pointer",
            padding: 12,
            background: activeItem === item.id ? "#dedede" : "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title={item.label}
        >
          {item.icon}
        </div>
      ))}
    </div>
  );
};

export default SideMenuBar;
