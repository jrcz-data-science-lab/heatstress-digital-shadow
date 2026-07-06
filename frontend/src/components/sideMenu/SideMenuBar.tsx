import type { SideMenuItem } from './SideMenuItem';

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
				<button
					key={item.id}
					onClick={() => {
						item.onClick?.();
						if (item.panel != null) onSelect(item.id);
					}}
					style={{
						cursor: "pointer",
						padding: 12,
						background: activeItem === item.id ? "#dedede" : "transparent",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						border: "none",
						width: "100%",
					}}
					title={item.label}
					aria-label={item.label}
					aria-pressed={activeItem === item.id}
				>
					{item.icon}
				</button>
			))}
		</div>
	);
};

export default SideMenuBar;
