import styles from './FormInput.module.css';

interface FormInputProps {
	label: string;
	type?: 'text' | 'number';
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	step?: string;
	min?: string;
	disabled?: boolean;
}

export function FormInput({
	label,
	type = 'text',
	value,
	onChange,
	placeholder,
	step,
	min,
	disabled = false,
}: FormInputProps) {
	return (
		<div className={styles.container}>
			<label className={styles.label}>{label}</label>
			<input
				type={type}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				step={step}
				min={min}
				disabled={disabled}
				className={styles.input}
			/>
		</div>
	);
}
