import { useState } from 'react';
import styles from './CollapsibleSection.module.css';

interface CollapsibleSectionProps {
	title: string;
	children: React.ReactNode;
	defaultOpen?: boolean;
	separator?: boolean;
}

export function CollapsibleSection({
	title,
	children,
	defaultOpen = true,
	separator = false,
}: CollapsibleSectionProps) {
	const [isOpen, setIsOpen] = useState(defaultOpen);

	return (
		<div className={`${styles.section} ${separator ? styles.separator : ''}`}>
			<div
				onClick={() => setIsOpen(!isOpen)}
				className={`${styles.header} ${isOpen ? styles.headerOpen : styles.headerClosed}`}
			>
				<h3 className={styles.title}>{title}</h3>
				<span className={styles.arrow}>{isOpen ? '▼' : '▶'}</span>
			</div>
			{isOpen && <div className={styles.content}>{children}</div>}
		</div>
	);
}
