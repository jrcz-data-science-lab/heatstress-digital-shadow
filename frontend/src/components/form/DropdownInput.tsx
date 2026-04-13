import styles from "./DropdownInput.module.css";

export type DropdownOption<T extends string = string> = {
  value: T;
  label: string;
};

interface DropdownInputProps<T extends string = string> {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<DropdownOption<T>>;
  disabled?: boolean;
}

export function DropdownInput<T extends string = string>({
  label,
  value,
  onChange,
  options,
  disabled = false,
}: DropdownInputProps<T>) {
  return (
    <div className={styles.container}>
      <label className={styles.label}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        disabled={disabled}
        className={styles.select}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
