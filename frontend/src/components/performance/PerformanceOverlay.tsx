import { useEffect, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PerfStats {
	fps: number;
	frameMs: number;
	heapUsedMB: number | null;
	heapLimitMB: number | null;
}

// Chrome-only memory API — not part of the standard lib
interface MemoryInfo {
	usedJSHeapSize: number;
	jsHeapSizeLimit: number;
}

// ── Shared styles (matching the rest of the app) ──────────────────────────────

const lbl: React.CSSProperties = {
	color: "#888",
	fontSize: "10px",
	fontWeight: 600,
	textTransform: "uppercase",
	letterSpacing: "0.5px",
	display: "block",
	marginTop: "2px",
};

const val: React.CSSProperties = {
	color: "#111",
	fontSize: "22px",
	fontWeight: 700,
	lineHeight: 1,
	fontVariantNumeric: "tabular-nums",
};

// ── Hook ─────────────────────────────────────────────────────────────────────

function usePerformanceStats(): PerfStats {
	const [fps, setFps] = useState(0);
	const [frameMs, setFrameMs] = useState(0);
	const [heapUsedMB, setHeapUsedMB] = useState<number | null>(null);
	const [heapLimitMB, setHeapLimitMB] = useState<number | null>(null);

	// rAF loop — samples frame deltas, updates state ~3×/sec to avoid
	// triggering excessive React re-renders.
	useEffect(() => {
		const samples: number[] = [];
		let lastTs = performance.now();
		let lastUpdate = performance.now();
		let rafId: number;

		const frame = (ts: number) => {
			const delta = ts - lastTs;
			lastTs = ts;

			// Discard huge gaps (tab was hidden / frozen)
			if (delta > 0 && delta < 500) {
				samples.push(delta);
				if (samples.length > 90) samples.shift();
			}

			if (ts - lastUpdate >= 333 && samples.length > 0) {
				lastUpdate = ts;
				const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
				setFps(Math.min(999, Math.round(1000 / avg)));
				setFrameMs(parseFloat(avg.toFixed(1)));
			}

			rafId = requestAnimationFrame(frame);
		};

		rafId = requestAnimationFrame(frame);
		return () => cancelAnimationFrame(rafId);
	}, []);

	// Heap — Chrome only, polled every 2 s
	useEffect(() => {
		const mem = (performance as unknown as { memory?: MemoryInfo }).memory;
		if (!mem) return;

		const update = () => {
			setHeapUsedMB(Math.round(mem.usedJSHeapSize / 1_048_576));
			setHeapLimitMB(Math.round(mem.jsHeapSizeLimit / 1_048_576));
		};
		update();
		const id = setInterval(update, 2000);
		return () => clearInterval(id);
	}, []);

	return { fps, frameMs, heapUsedMB, heapLimitMB };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fpsColor(fps: number): string {
	if (fps >= 55) return "#22c55e"; // green — smooth
	if (fps >= 30) return "#f5a623"; // amber — acceptable
	return "#ef4444";                // red   — struggling
}

function frameMsColor(ms: number): string {
	if (ms <= 18) return "#22c55e";
	if (ms <= 34) return "#f5a623";
	return "#ef4444";
}

function Bar({ fill, color }: { fill: number; color: string }) {
	return (
		<div
			style={{
				height: "4px",
				borderRadius: "2px",
				background: "#e5e5e5",
				overflow: "hidden",
				marginTop: "6px",
			}}
		>
			<div
				style={{
					height: "100%",
					width: `${Math.min(fill * 100, 100)}%`,
					background: color,
					borderRadius: "2px",
					transition: "width 0.3s ease, background 0.3s ease",
				}}
			/>
		</div>
	);
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PerformanceOverlay() {
	const { fps, frameMs, heapUsedMB, heapLimitMB } = usePerformanceStats();
	const color = fpsColor(fps);

	return (
		<div
			style={{
				padding: "12px 16px",
				background: "#ffffff",
				borderRadius: "12px",
				boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
				border: "1px solid rgba(0,0,0,0.15)",
				width: "220px",
				pointerEvents: "none",
				userSelect: "none",
			}}
		>
			{/* Header */}
			<div
				style={{
					fontSize: "11px",
					fontWeight: 700,
					color: "#444",
					textTransform: "uppercase",
					letterSpacing: "0.5px",
					marginBottom: "10px",
				}}
			>
				Render Performance
			</div>

			{/* FPS + Frame time — two columns */}
			<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
				<div>
					<span style={{ ...val, color }}>{fps}</span>
					<span style={lbl}>FPS</span>
				</div>
				<div>
					<span style={{ ...val, color: frameMsColor(frameMs), fontSize: "18px" }}>
						{frameMs}
					</span>
					<span style={lbl}>ms / frame</span>
				</div>
			</div>

			{/* Bar — FPS as fraction of 60fps target */}
			<Bar fill={fps / 60} color={color} />

			{/* Heap — Chrome only */}
			{heapUsedMB !== null && heapLimitMB !== null && (
				<div
					style={{
						marginTop: "10px",
						borderTop: "1px solid #e5e5e5",
						paddingTop: "8px",
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
					}}
				>
					<span style={{ ...lbl, display: "inline", marginTop: 0 }}>
						JS Heap
					</span>
					<span
						style={{
							fontSize: "12px",
							fontWeight: 600,
							color: "#111",
							fontVariantNumeric: "tabular-nums",
						}}
					>
						{heapUsedMB}&thinsp;
						<span style={{ color: "#aaa", fontWeight: 400 }}>
							/ {heapLimitMB} MB
						</span>
					</span>
				</div>
			)}
		</div>
	);
}
