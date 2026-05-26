type ObjectProps = {
	label: string;
	icon: React.ReactNode;
	disabled?: boolean;
	active?: boolean;
	onClick: () => void;
};

export default function ObjectItem({ label, icon, disabled, active, onClick }: ObjectProps) {
	return (
		<button
			disabled={disabled}
			onClick={onClick}
			style={{
				height: '96px',
				width: '9rem',
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'center',
				alignItems: 'center',
				gap: '0.5rem',
				borderRadius: '8px',
				border: active ? '2px solid currentColor' : '1px solid #ccc',
				background: active ? 'rgba(0,0,0,0.05)' : 'transparent',
				cursor: disabled ? 'not-allowed' : 'pointer',
				fontSize: '0.9rem',
				color: 'black',
			}}
		>
			{icon}
			<span>{label}</span>
		</button>
	);
}
