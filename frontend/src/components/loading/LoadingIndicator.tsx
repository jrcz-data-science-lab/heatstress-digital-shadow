import { useEffect, useRef, useState } from "react";
import "./LoadingIndicator.css";

type Step = { label: string; durationMs: number };

const STEPS: Step[] = [
	{ label: "Burning objects into terrain model...", durationMs: 8000 },
	{ label: "Aligning sun exposure grid...", durationMs: 5000 },
	{ label: "Computing sun PET...", durationMs: 15000 },
	{ label: "Generating shadow map...", durationMs: 35000 },
	{ label: "Combining sun & shadow PET...", durationMs: 20000 },
	{ label: "Finalising and updating map...", durationMs: 10000 },
];

const TOTAL_MS = STEPS.reduce((s, step) => s + step.durationMs, 0);

type LoadingIndicatorProps = {
	label?: string;
	backgroundColor: string;
	textColor: string;
	left?: number | string;
};

export function LoadingIndicator({
	backgroundColor,
	textColor,
	left = "26rem",
}: LoadingIndicatorProps) {
	const [elapsed, setElapsed] = useState(0);
	const [liveMessage, setLiveMessage] = useState("");
	const startRef = useRef(Date.now());

	useEffect(() => {
		startRef.current = Date.now();
		const timer = setInterval(
			() => setElapsed(Date.now() - startRef.current),
			100,
		);
		return () => clearInterval(timer);
	}, []);

	useEffect(() => {
		const poll = setInterval(async () => {
			try {
				const r = await fetch("/backend/processing-status");
				const data = await r.json();
				if (data?.message && data.message !== "Idle")
					setLiveMessage(data.message);
			} catch {
				/* empty */
			}
		}, 1500);
		return () => clearInterval(poll);
	}, []);

	// Determine current step and overall progress (capped at 95% until done)
	let remaining = elapsed;
	let stepIndex = STEPS.length - 1;
	let stepFraction = 1;
	let doneMs = TOTAL_MS - STEPS[STEPS.length - 1].durationMs;

	for (let i = 0; i < STEPS.length; i++) {
		if (remaining < STEPS[i].durationMs) {
			stepIndex = i;
			stepFraction = remaining / STEPS[i].durationMs;
			doneMs = STEPS.slice(0, i).reduce((s, st) => s + st.durationMs, 0);
			break;
		}
		remaining -= STEPS[i].durationMs;
	}

	const progress = Math.min(
		((doneMs + stepFraction * STEPS[stepIndex].durationMs) / TOTAL_MS) * 95,
		95,
	);

	return (
		<div
			style={{
				position: "absolute",
				top: 20,
				left: left,
				background: backgroundColor,
				color: textColor,
				padding: "14px 20px",
				borderRadius: "12px",
				boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
				border: "1px solid rgba(0,0,0,0.15)",
				pointerEvents: "auto",
				width: "300px",
				display: "flex",
				flexDirection: "column",
				gap: "8px",
			}}
		>
			<span style={{ fontSize: "15px", fontWeight: 700 }}>
				Computing PET map...
			</span>

			<div className="progress-track">
				<div className="progress-fill" style={{ width: `${progress}%` }} />
			</div>

			<span style={{ fontSize: "12px", color: "#555" }}>
				{liveMessage || STEPS[stepIndex].label}
			</span>
		</div>
	);
}
