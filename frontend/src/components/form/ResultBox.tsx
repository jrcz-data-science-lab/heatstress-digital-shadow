import styles from "./ResultBox.module.css";

interface ResultBoxProps {
  status: string;
  outputPath: string;
  message: string;
  outputLabel?: string;
  variant?: "green" | "blue";
}

export function ResultBox({
  status,
  outputPath,
  message,
  outputLabel = "Output Path:",
  variant = "green",
}: ResultBoxProps) {
  return (
    <div className={`${styles.resultBox} ${styles[variant]}`}>
      <strong className={styles.successText}>Success!</strong>
      <div className={styles.details}>
        <div>
          <strong>Status:</strong> {status}
        </div>
        <div>
          <strong>{outputLabel}</strong>
        </div>
        <div className={styles.outputPath}>{outputPath}</div>
        <div>{message}</div>
      </div>
    </div>
  );
}
