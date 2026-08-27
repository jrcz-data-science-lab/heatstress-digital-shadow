import styles from './LockToggle.module.css';

interface LockToggleProps {
	isLocked: boolean;
	onToggle: () => void;
}

export function LockToggle({ isLocked, onToggle }: LockToggleProps) {
	return (
		<div className={styles.container}>
			<button
				onClick={onToggle}
				className={styles.button}
				title={isLocked ? 'Unlock inputs' : 'Lock inputs'}
			>
				{isLocked ? (
					<svg
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
					>
						<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
						<path d="M7 11V7a5 5 0 0 1 10 0v4" />
					</svg>
				) : (
					<svg
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
					>
						<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
						<path d="M7 11V7a5 5 0 0 1 9.9-1" />
					</svg>
				)}
				{isLocked ? 'Unlock' : 'Lock'}
			</button>
		</div>
	);
}
