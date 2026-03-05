import styles from "./MessageBox.module.css";

interface MessageBoxProps {
  message: string;
  type?: "error" | "success";
}

export function MessageBox({ message, type = "error" }: MessageBoxProps) {
  return (
    <div className={`${styles.messageBox} ${styles[type]}`}>
      <strong>{type === "error" ? "Error:" : "Success!"}</strong> {message}
    </div>
  );
}
