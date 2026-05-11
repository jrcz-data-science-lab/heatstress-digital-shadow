import type { QgisLayerId } from "../../features/wms-overlay/lib/qgisLayers";
import { QGIS_OVERLAY_LAYERS } from "../../features/wms-overlay/lib/qgisLayers";
import CheckboxItem from "./items/CheckboxItem";

export type OverlayLayerConfig = {
	id: QgisLayerId;
	opacity: number;
};

type OverlayProps = {
	layers: OverlayLayerConfig[];
	onChange: (layers: OverlayLayerConfig[]) => void;
	showExistingTrees: boolean;
	onToggleExistingTrees: (value: boolean) => void;
};

export function OverlayLayersPanel({
	layers,
	onChange,
	showExistingTrees,
	onToggleExistingTrees,
}: OverlayProps) {
	const activeIds = new Set(layers.map((l) => l.id));

	const addLayer = (id: QgisLayerId) => {
		onChange([...layers, { id, opacity: 1 }]);
	};

	const removeLayer = (id: QgisLayerId) => {
		onChange(layers.filter((l) => l.id !== id));
	};

	const updateOpacity = (id: QgisLayerId, opacity: number) => {
		onChange(layers.map((l) => (l.id === id ? { ...l, opacity } : l)));
	};

	const move = (index: number, direction: 1 | -1) => {
		const next = [...layers];
		[next[index], next[index + direction]] = [
			next[index + direction],
			next[index],
		];
		onChange(next);
	};

	// Reversed so the topmost rendered layer appears first
	const reversed = [...layers].reverse();

	return (
		<div>
			<h3>Overlay Layers</h3>

			<div role="group" aria-label="Base layer options">
				<CheckboxItem
					label="Existing Trees (BGT)"
					checked={showExistingTrees}
					onChange={onToggleExistingTrees}
				/>
			</div>

			<hr
				style={{
					border: "none",
					borderTop: "1px solid #e5e5e5",
					margin: "12px 0",
				}}
			/>

			{/* ── Active layer stack ── */}
			{layers.length > 0 && (
				<>
					<p style={sectionLabelStyle}>Active layers</p>
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							gap: "6px",
							marginBottom: "16px",
						}}
					>
						{reversed.map((layer) => {
							const index = layers.indexOf(layer);
							const isTop = index === layers.length - 1;
							const isBottom = index === 0;
							const label =
								QGIS_OVERLAY_LAYERS.find((l) => l.id === layer.id)?.label ??
								layer.id;

							return (
								<div key={layer.id} style={cardStyle}>
									{/* Card header: name + controls */}
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: "6px",
											marginBottom: "10px",
										}}
									>
										{/* Layer name — truncates instead of wrapping */}
										<span style={layerNameStyle} title={label}>
											{label}
										</span>

										{/* Reorder + remove buttons */}
										<div
											style={{
												display: "flex",
												gap: "2px",
												marginLeft: "auto",
												flexShrink: 0,
											}}
										>
											<button
												onClick={() => move(index, 1)}
												disabled={isTop}
												title="Move up in stack"
												style={{ ...iconBtnStyle, opacity: isTop ? 0.25 : 0.7 }}
											>
												↑
											</button>
											<button
												onClick={() => move(index, -1)}
												disabled={isBottom}
												title="Move down in stack"
												style={{
													...iconBtnStyle,
													opacity: isBottom ? 0.25 : 0.7,
												}}
											>
												↓
											</button>
											<div
												style={{
													width: "1px",
													background: "#e0e0e0",
													margin: "0 2px",
												}}
											/>
											<button
												onClick={() => removeLayer(layer.id)}
												title="Remove layer"
												style={{ ...iconBtnStyle, color: "#c0392b" }}
											>
												✕
											</button>
										</div>
									</div>

									{/* Opacity slider */}
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: "8px",
										}}
									>
										<span style={sliderLabelStyle}>Opacity</span>
										<input
											type="range"
											min={0}
											max={1}
											step={0.01}
											value={layer.opacity}
											onChange={(e) =>
												updateOpacity(layer.id, Number(e.target.value))
											}
											style={{
												flex: 1,
												cursor: "pointer",
												accentColor: "#2563eb",
											}}
										/>
										<span
											style={{
												...sliderLabelStyle,
												minWidth: "34px",
												textAlign: "right",
											}}
										>
											{Math.round(layer.opacity * 100)}%
										</span>
									</div>
								</div>
							);
						})}
					</div>
				</>
			)}

			{/* ── Layer picker ── */}
			<p style={sectionLabelStyle}>Layers</p>
			<div style={{ display: "flex", flexDirection: "column" }}>
				{QGIS_OVERLAY_LAYERS.map((layer) => {
					const isActive = activeIds.has(layer.id);
					return (
						<label key={layer.id} style={checkboxRowStyle}>
							<input
								type="checkbox"
								checked={isActive}
								onChange={() =>
									isActive ? removeLayer(layer.id) : addLayer(layer.id)
								}
								style={{
									cursor: "pointer",
									accentColor: "#2563eb",
									width: "15px",
									height: "15px",
									flexShrink: 0,
								}}
							/>
							<span
								style={{
									fontSize: "0.875rem",
									color: isActive ? "#111" : "#555",
								}}
							>
								{layer.label}
							</span>
						</label>
					);
				})}
			</div>
		</div>
	);
}

const sectionLabelStyle: React.CSSProperties = {
	fontSize: "0.7rem",
	fontWeight: 600,
	color: "#999",
	textTransform: "uppercase",
	letterSpacing: "0.06em",
	margin: "0 0 8px",
};

const cardStyle: React.CSSProperties = {
	background: "#fff",
	border: "1px solid #e8e8e8",
	borderLeft: "3px solid #2563eb",
	borderRadius: "6px",
	padding: "10px 12px",
};

const layerNameStyle: React.CSSProperties = {
	fontSize: "0.875rem",
	fontWeight: 600,
	color: "#111",
	flex: 1,
	minWidth: 0,
	overflow: "hidden",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap",
};

const iconBtnStyle: React.CSSProperties = {
	background: "none",
	border: "none",
	cursor: "pointer",
	fontSize: "0.875rem",
	width: "24px",
	height: "24px",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	borderRadius: "4px",
	lineHeight: 1,
	padding: 0,
};

const sliderLabelStyle: React.CSSProperties = {
	fontSize: "0.75rem",
	color: "#777",
	flexShrink: 0,
};

const checkboxRowStyle: React.CSSProperties = {
	display: "flex",
	alignItems: "center",
	gap: "10px",
	padding: "7px 4px",
	cursor: "pointer",
	borderBottom: "1px solid #f0f0f0",
};
