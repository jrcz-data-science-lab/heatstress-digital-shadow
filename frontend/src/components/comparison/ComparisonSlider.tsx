import { useRef } from 'react';
import styles from './ComparisonSlider.module.css';

type Props = {
	enabled: boolean;
	position: number;
	onEnabledChange: (enabled: boolean) => void;
	onPositionChange: (position: number) => void;
};

export function ComparisonSlider({
	enabled,
	position,
	onEnabledChange,
	onPositionChange,
}: Props) {
	const containerRef = useRef<HTMLDivElement>(null);

	const updatePosition = (clientX: number) => {
		const bounds = containerRef.current?.getBoundingClientRect();
		if (!bounds) return;

		const nextPosition = (clientX - bounds.left) / bounds.width;
		onPositionChange(Math.min(1, Math.max(0, nextPosition)));
	};

	const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
		const step = event.shiftKey ? 0.1 : 0.01;
		let nextPosition = position;

		if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
			nextPosition -= step;
		} else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
			nextPosition += step;
		} else if (event.key === 'Home') {
			nextPosition = 0;
		} else if (event.key === 'End') {
			nextPosition = 1;
		} else {
			return;
		}

		event.preventDefault();
		onPositionChange(Math.min(1, Math.max(0, nextPosition)));
	};

	return (
		<div ref={containerRef} className={styles.container}>
			<label className={styles.toggle}>
				<input
					type="checkbox"
					checked={enabled}
					onChange={(event) => onEnabledChange(event.target.checked)}
				/>
				Compare layers
			</label>

			{enabled && (
				<div
					className={styles.divider}
					style={{ left: `${position * 100}%` }}
				>
					<button
						type="button"
						className={styles.handle}
						role="slider"
						aria-label="Comparison divider position"
						aria-valuemin={0}
						aria-valuemax={1}
						aria-valuenow={position}
						onKeyDown={handleKeyDown}
						onPointerDown={(event) => {
							event.currentTarget.setPointerCapture(event.pointerId);
							updatePosition(event.clientX);
						}}
						onPointerMove={(event) => {
							if (event.currentTarget.hasPointerCapture(event.pointerId)) {
								updatePosition(event.clientX);
							}
						}}
						onPointerUp={(event) => {
							if (event.currentTarget.hasPointerCapture(event.pointerId)) {
								event.currentTarget.releasePointerCapture(event.pointerId);
							}
						}}
					>
						<span className={styles.handleIcon} aria-hidden="true" />
					</button>
				</div>
			)}
		</div>
	);
}
