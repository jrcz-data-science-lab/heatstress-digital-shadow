import styles from "./LoadingButton.module.css";

interface LoadingButtonProps {
  onClick: () => void;
  isLoading: boolean;
  loadingText: string;
  text: string;
  color?: string;
  disabled?: boolean;
}

export function LoadingButton({
  onClick,
  isLoading,
  loadingText,
  text,
  color = "#2196F3",
  disabled = false,
}: LoadingButtonProps) {
  const isDisabled = isLoading || disabled;

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={styles.button}
      style={{ backgroundColor: isDisabled ? undefined : color }}
    >
      {isLoading ? loadingText : text}
    </button>
  );
}
