import { useState } from "react";
import styles from "./CollapsibleHelpBox.module.css";

interface CollapsibleHelpBoxProps {
  title: string;
  backgroundColor?: string;
  borderColor?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function CollapsibleHelpBox({
  title,
  backgroundColor = "#e3f2fd",
  borderColor = "#2196F3",
  children,
  defaultOpen = false,
}: CollapsibleHelpBoxProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={styles.container}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`${styles.button} ${isOpen ? styles.buttonOpen : styles.buttonClosed}`}
        style={{
          backgroundColor,
          borderColor,
        }}
      >
        <span>{title}</span>
        <span className={styles.arrow}>{isOpen ? "▼" : "▶"}</span>
      </button>
      {isOpen && (
        <div
          className={styles.content}
          style={{
            backgroundColor,
            borderColor,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
