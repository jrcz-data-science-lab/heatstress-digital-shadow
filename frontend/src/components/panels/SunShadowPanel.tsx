import { useEffect, useRef, useState } from "react";
import CheckboxItem from "./items/CheckboxItem";

type Props = {
	enabled: boolean;
	onToggle: (v: boolean) => void;
	simulationDate: Date;
	onDateChange: (d: Date) => void;
};

const lbl: React.CSSProperties = {
	color: "#888",
	fontSize: "10px",
	fontWeight: 600,
	textTransform: "uppercase",
	letterSpacing: "0.5px",
	display: "block",
	marginBottom: "4px",
};

const sectionTitle: React.CSSProperties = {
	fontSize: "11px",
	fontWeight: 700,
	color: "#444",
	textTransform: "uppercase",
	letterSpacing: "0.5px",
	marginBottom: "10px",
};

const divider: React.CSSProperties = {
	borderTop: "1px solid #e5e5e5",
	paddingTop: "12px",
	marginTop: "12px",
};

function pad(n: number) {
	return String(n).padStart(2, "0");
}

function formatTime(date: Date): string {
	return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toDateInputValue(date: Date): string {
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function SunShadowPanel({
	enabled,
	onToggle,
	simulationDate,
	onDateChange,
}: Props) {
	const [isPlaying, setIsPlaying] = useState(false);
	const latestDateRef = useRef(simulationDate);
	useEffect(() => {
		latestDateRef.current = simulationDate;
	}, [simulationDate]);

	// Advance time by 30 min every 250ms when playing (~2 min/s)
	useEffect(() => {
		if (!isPlaying) return;
		const id = window.setInterval(() => {
			const next = new Date(latestDateRef.current.getTime() + 30 * 60 * 1000);
			onDateChange(next);
		}, 250);
		return () => clearInterval(id);
	}, [isPlaying, onDateChange]);

	const totalMinutes = simulationDate.getHours() * 60 + simulationDate.getMinutes();

	const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
		const minutes = parseInt(e.target.value, 10);
		const next = new Date(simulationDate);
		next.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
		onDateChange(next);
	};

	const handleDateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
		const [year, month, day] = e.target.value.split("-").map(Number);
		if (!year || !month || !day) return;
		const next = new Date(simulationDate);
		next.setFullYear(year, month - 1, day);
		onDateChange(next);
	};

	return (
		<div style={{ padding: "0 4px" }}>
			<h3>Sun &amp; Shadow</h3>
			<CheckboxItem
				label="Enable sun shadows"
				checked={enabled}
				onChange={onToggle}
			/>

			<div
				style={{
					marginTop: "1rem",
					backgroundColor: "#fef9ec",
					padding: "10px",
					borderRadius: "6px",
					fontStyle: "italic",
					fontSize: "13px",
					borderLeft: "3px solid #f5c518",
				}}
			>
				<span style={{ fontWeight: "bold", display: "block", marginBottom: "4px", fontStyle: "normal" }}>
					About sun shadows
				</span>
				<p style={{ margin: "4px 0" }}>
					Simulates real sun position for Middelburg based on date and time.
					The 3D BAG buildings will cast shadows across the scene.
				</p>
				<p style={{ margin: "4px 0" }}>
					Enable shadows and use the controls below to explore shade during different
					times of day and year.
				</p>
			</div>

			{enabled && (
				<>
					<div style={divider}>
						<div style={sectionTitle}>Date &amp; Time</div>

						{/* Date picker */}
						<div style={{ marginBottom: "14px" }}>
							<span style={lbl}>Date</span>
							<input
								type="date"
								value={toDateInputValue(simulationDate)}
								onChange={handleDateInput}
								style={{
									width: "100%",
									padding: "6px 8px",
									border: "1px solid #ddd",
									borderRadius: "6px",
									fontSize: "13px",
									color: "#111",
									background: "#fff",
									boxSizing: "border-box",
									cursor: "pointer",
								}}
							/>
						</div>

						{/* Time display */}
						<div style={{ marginBottom: "8px" }}>
							<span style={lbl}>Time</span>
							<div
								style={{
									fontSize: "22px",
									fontWeight: 700,
									color: "#111",
									letterSpacing: "2px",
									fontVariantNumeric: "tabular-nums",
								}}
							>
								{formatTime(simulationDate)}
							</div>
						</div>

						{/* Time slider */}
						<input
							type="range"
							min={0}
							max={1439}
							step={15}
							value={totalMinutes}
							onChange={handleSlider}
							disabled={isPlaying}
							style={{ width: "100%", accentColor: "#f5c518", cursor: isPlaying ? "not-allowed" : "pointer" }}
						/>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								fontSize: "10px",
								color: "#aaa",
								marginTop: "2px",
								marginBottom: "14px",
							}}
						>
							<span>00:00</span>
							<span>06:00</span>
							<span>12:00</span>
							<span>18:00</span>
							<span>23:45</span>
						</div>

						{/* Play / Pause */}
						<button
							onClick={() => setIsPlaying((p) => !p)}
							style={{
								width: "100%",
								padding: "8px",
								background: isPlaying ? "#444" : "#f5c518",
								color: isPlaying ? "#fff" : "#222",
								border: "none",
								borderRadius: "6px",
								fontSize: "13px",
								fontWeight: 700,
								cursor: "pointer",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								gap: "6px",
							}}
						>
							<span style={{ fontSize: "16px" }}>{isPlaying ? "⏸" : "▶"}</span>
							{isPlaying ? "Pause animation" : "Play through day"}
						</button>

						{isPlaying && (
							<p
								style={{
									marginTop: "8px",
									fontSize: "11px",
									color: "#888",
									textAlign: "center",
									fontStyle: "italic",
								}}
							>
								Advancing 30 min per tick · drag slider to pause &amp; jump
							</p>
						)}
					</div>

					<div style={divider}>
						<div style={sectionTitle}>Quick jump</div>
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "1fr 1fr",
								gap: "6px",
							}}
						>
							{[
								{ label: "Sunrise ~6:00", h: 6, m: 0 },
								{ label: "Morning 9:00", h: 9, m: 0 },
								{ label: "Noon 12:00", h: 12, m: 0 },
								{ label: "Afternoon 15:00", h: 15, m: 0 },
								{ label: "Evening 18:00", h: 18, m: 0 },
								{ label: "Sunset ~21:00", h: 21, m: 0 },
							].map(({ label, h, m }) => (
								<button
									key={label}
									onClick={() => {
										setIsPlaying(false);
										const next = new Date(simulationDate);
										next.setHours(h, m, 0, 0);
										onDateChange(next);
									}}
									style={{
										padding: "6px 8px",
										background: "#f4f4f4",
										border: "1px solid #e0e0e0",
										borderRadius: "6px",
										fontSize: "11px",
										fontWeight: 600,
										cursor: "pointer",
										color: "#333",
										textAlign: "left",
									}}
								>
									{label}
								</button>
							))}
						</div>
					</div>
				</>
			)}
		</div>
	);
}
