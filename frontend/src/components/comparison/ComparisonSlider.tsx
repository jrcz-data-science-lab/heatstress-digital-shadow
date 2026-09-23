import { useRef } from 'react';
import styles from './ComparisonSlider.module.css';
import type { QgisLayerId } from '../../features/wms-overlay/lib/qgisLayers';

type LayerOption = {
	id: QgisLayerId;
	label: string;
};

type Props = {
	enabled: boolean;
	position: number;
	leftLayerId: QgisLayerId;
	rightLayerId: QgisLayerId;
	layers: readonly LayerOption[];
	onEnabledChange: (enabled: boolean) => void;
	onPositionChange: (position: number) => void;
	onLeftLayerChange: (layerId: QgisLayerId) => void;
	onRightLayerChange: (layerId: QgisLayerId) => void;
};

export function ComparisonSlider({
	enabled,
	position,
	leftLayerId,
	rightLayerId,
	layers,
	onEnabledChange,
	onPositionChange,
	onLeftLayerChange,
	onRightLayerChange,
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
					<div className={styles.layerSelectors}>
						<label>
							<select
								aria-label="Left comparison layer"
								value={leftLayerId}
								onChange={(event) => onLeftLayerChange(event.target.value as QgisLayerId)}
							>
								{layers.map((layer) => (
									<option key={layer.id} value={layer.id} disabled={layer.id === rightLayerId}>
										{layer.label}
									</option>
								))}
							</select>
						</label>
						<label>
							<select
								aria-label="Right comparison layer"
								value={rightLayerId}
								onChange={(event) => onRightLayerChange(event.target.value as QgisLayerId)}
							>
								{layers.map((layer) => (
									<option key={layer.id} value={layer.id} disabled={layer.id === leftLayerId}>
										{layer.label}
									</option>
								))}
							</select>
						</label>
					</div>

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
