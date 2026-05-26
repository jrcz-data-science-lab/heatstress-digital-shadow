type CheckboxItemItemProps = {
	label: string;
	checked?: boolean;
	onChange?: (checked: boolean) => void;
	toggleable?: boolean;
	children?: React.ReactNode;
};

export default function CheckboxItem({
	label,
	checked = false,
	onChange,
	toggleable = true,
	children,
}: CheckboxItemItemProps) {
	return (
		<div>
			<label
				style={{
					cursor: 'pointer',
					display: 'flex',
					alignItems: 'center',
					gap: 8,
				}}
			>
				{toggleable && (
					<input
						type="checkbox"
						checked={checked}
						onChange={(e) => onChange?.(e.target.checked)}
						style={{ cursor: 'pointer' }}
					/>
				)}
				{label}
			</label>
			{children && <div>{children}</div>}
		</div>
	);
}
