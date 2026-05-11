import { useState } from "react";
import CheckboxItem from "./items/CheckboxItem";
import type {
	TileProperties,
	EnergieLabel,
	PandEnergieData,
	BuildingAddressData,
	VboAdres,
} from "../../features/buildings-3d/lib/buildingMetadataApi";

interface VboData {
	bag_id: string;
	usage_function?: string[];
	surface_area_m2?: number;
	status?: string;
	adres?: VboAdres | null;
	energie_label?: EnergieLabel | null;
}

interface PandData {
	bag_id?: string;
	construction_year?: number | string;
	status?: string;
}

interface BuildingInfo {
	bag_id?: string;
	address?: BuildingAddressData | null;
	pand_energie_data?: PandEnergieData | null;
	pand_data?: PandData;
	verblijfsobject_data?: VboData[];
}

type BuildingsPanelProps = {
	showBuildings: boolean;
	onToggleBuildings: (value: boolean) => void;
	buildingInfo?: BuildingInfo | null;
	activeVbos?: VboData[];
	tileProperties?: TileProperties | null;
};

// ── Shared styles ─────────────────────────────────────────────────────────────

const lbl: React.CSSProperties = {
	color: "#888",
	fontSize: "10px",
	fontWeight: 600,
	textTransform: "uppercase",
	letterSpacing: "0.5px",
	display: "block",
	marginBottom: "2px",
};

const val: React.CSSProperties = {
	color: "#111",
	fontSize: "13px",
	fontWeight: 600,
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

const grid2: React.CSSProperties = {
	display: "grid",
	gridTemplateColumns: "1fr 1fr",
	gap: "10px",
};

const grid3: React.CSSProperties = {
	display: "grid",
	gridTemplateColumns: "1fr 1fr 1fr",
	gap: "10px",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number | undefined, decimals = 1, unit = ""): string {
	if (n == null) return "—";
	return `${n.toFixed(decimals)}${unit ? "\u202f" + unit : ""}`;
}

function roofTypeLabel(type: string | undefined): string {
	if (!type) return "—";
	const map: Record<string, string> = {
		slanted: "Slanted",
		horizontal: "Flat",
		"multiple horizontal": "Multi-flat",
		unknown: "Unknown",
		"no points": "No data",
		"no planes": "No planes",
	};
	return map[type] ?? type;
}

function fmtAddress(
	a: BuildingAddressData | null | undefined,
): { line1: string; line2: string } | null {
	if (!a) return null;
	const num = [a.house_number, a.house_letter, a.house_number_addition]
		.filter(Boolean)
		.join(" ");
	const line1 = [a.street, num].filter(Boolean).join(" ");
	const line2 = [a.postcode, a.city].filter(Boolean).join("  ");
	return line1 || line2 ? { line1, line2 } : null;
}

/**
 * Build a full address title for a VBO unit.
 * Combines the building street with the unit's own number/letter/addition.
 * e.g. "Kanaalweg 2", "Kanaalweg 2 A", "Kanaalweg 2 toev. 01"
 */
function fmtVboAddress(
	street: string | undefined,
	a: VboAdres | null | undefined,
): string | null {
	if (!a) return null;
	const parts: string[] = [];
	if (street) parts.push(street);
	if (a.house_number != null) parts.push(String(a.house_number));
	if (a.house_letter) parts.push(a.house_letter);
	if (a.house_number_addition)
		parts.push(`toev.\u00a0${a.house_number_addition}`);
	return parts.length > 0 ? parts.join(" ") : null;
}

/** EU energy label colour scale A+++ → G */
const LABEL_COLORS: Record<string, { bg: string; text: string }> = {
	"A+++++": { bg: "#00893a", text: "#fff" },
	"A++++": { bg: "#00893a", text: "#fff" },
	"A+++": { bg: "#00893a", text: "#fff" },
	"A++": { bg: "#1aaa45", text: "#fff" },
	"A+": { bg: "#57b944", text: "#fff" },
	A: { bg: "#a8ce38", text: "#000" },
	B: { bg: "#cede38", text: "#000" },
	C: { bg: "#f5eb1a", text: "#000" },
	D: { bg: "#f5c31a", text: "#000" },
	E: { bg: "#f5961a", text: "#000" },
	F: { bg: "#f0631a", text: "#fff" },
	G: { bg: "#e8231a", text: "#fff" },
};

const EP_ONLINE_SEARCH_URL = "https://www.ep-online.nl/Energylabel/Search";

function InfoTooltip({ text }: { text: string }) {
	const [visible, setVisible] = useState(false);
	return (
		<span
			style={{
				position: "relative",
				display: "inline-flex",
				alignItems: "center",
			}}
		>
			<span
				role="button"
				tabIndex={0}
				onMouseEnter={() => setVisible(true)}
				onMouseLeave={() => setVisible(false)}
				onFocus={() => setVisible(true)}
				onBlur={() => setVisible(false)}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") setVisible((v) => !v);
				}}
				aria-label={text}
				style={{
					cursor: "default",
					fontSize: "15px",
					color: "#000000",
					lineHeight: 1,
				}}
			>
				ⓘ
			</span>
			{visible && (
				<span
					style={{
						position: "absolute",
						left: "50%",
						top: "calc(100% + 6px)",
						width: "max-content",
						maxWidth: "100px",
						background: "#000",
						color: "#fff",
						fontSize: "10px",
						fontWeight: "bold",
						padding: "6px 8px",
						borderRadius: "4px",
						zIndex: 10,
						pointerEvents: "none",
					}}
				>
					{text}
				</span>
			)}
		</span>
	);
}

function LabelBadge({ klasse, href }: { klasse: string; href?: string }) {
	const colors = LABEL_COLORS[klasse] ?? { bg: "#aaa", text: "#fff" };

	const badge = (
		<div
			style={{
				display: "inline-flex",
				alignItems: "center",
				justifyContent: "center",
				background: colors.bg,
				color: colors.text,
				fontWeight: 800,
				fontSize: "13px",
				padding: "2px 9px",
				borderRadius: "4px",
				letterSpacing: "0.5px",
				minWidth: "34px",
			}}
		>
			{klasse}
		</div>
	);

	return href ? (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			style={{ textDecoration: "none" }}
			aria-label={`More information about energy label ${klasse}`}
			title="Open energy label information"
		>
			{badge}
		</a>
	) : (
		badge
	);
}

// ── Sub-components ────────────────────────────────────────────────────────────

/** Per-VBO energy label card content */
function EnergieLabelBadge({
	label,
	bagId,
}: {
	label: EnergieLabel;
	bagId?: string;
}) {
	const { energieklasse: klasse } = label;

	return (
		<div
			style={{
				marginTop: "8px",
				borderTop: "1px solid #ececec",
				paddingTop: "8px",
			}}
		>
			{/* Badge row */}
			{klasse && (
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "8px",
						marginBottom: "8px",
					}}
				>
					<LabelBadge
						klasse={klasse}
						href={bagId ? EP_ONLINE_SEARCH_URL : undefined}
					/>
					{bagId && (
						<InfoTooltip text="Click the label to open EP-Online. Enter the BAG ID shown above in the search box." />
					)}
					{label.gebouwklasse && (
						<span style={{ fontSize: "11px", color: "#555" }}>
							{label.gebouwklasse === "W"
								? "Residential"
								: label.gebouwklasse === "U"
									? "Utility"
									: label.gebouwklasse}
						</span>
					)}
					{label.energie_index != null && (
						<span style={{ fontSize: "11px", color: "#888" }}>
							index {label.energie_index.toFixed(2)}
						</span>
					)}
				</div>
			)}

			{/* Figures */}
			<div
				style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}
			>
				{label.energiebehoefte != null && (
					<div>
						<span style={lbl}>Energy demand</span>
						<span style={{ ...val, fontSize: "12px" }}>
							{fmt(label.energiebehoefte, 0, "kWh/m²")}
						</span>
					</div>
				)}
				{label.aandeel_hernieuwbare_energie != null && (
					<div>
						<span style={lbl}>Renewable share</span>
						<span style={{ ...val, fontSize: "12px" }}>
							{fmt(label.aandeel_hernieuwbare_energie, 1, "%")}
						</span>
					</div>
				)}
				{label.warmtebehoefte != null && (
					<div>
						<span style={lbl}>Heat demand</span>
						<span style={{ ...val, fontSize: "12px" }}>
							{fmt(label.warmtebehoefte, 0, "kWh/m²")}
						</span>
					</div>
				)}
				{label.primaire_fossiele_energie != null && (
					<div>
						<span style={lbl}>Fossil energy</span>
						<span style={{ ...val, fontSize: "12px" }}>
							{fmt(label.primaire_fossiele_energie, 0, "kWh/m²")}
						</span>
					</div>
				)}
			</div>

			{/* Validity dates */}
			{(label.registratiedatum || label.geldig_tot) && (
				<div style={{ marginTop: "5px", fontSize: "10px", color: "#aaa" }}>
					{label.registratiedatum && `Registered: ${label.registratiedatum}`}
					{label.registratiedatum && label.geldig_tot && " · "}
					{label.geldig_tot && `Valid until: ${label.geldig_tot}`}
				</div>
			)}
		</div>
	);
}

/** Building-level EP-Online pand section */
function PandEnergieSection({
	data,
	bagId,
}: {
	data: PandEnergieData;
	bagId?: string;
}) {
	return (
		<div style={divider}>
			<div style={sectionTitle}>Energy Performance</div>

			{/* Badge + type row */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: "10px",
					marginBottom: "12px",
				}}
			>
				{data.energieklasse && (
					<LabelBadge
						klasse={data.energieklasse}
						href={bagId ? EP_ONLINE_SEARCH_URL : undefined}
					/>
				)}
				{bagId && (
					<InfoTooltip text="Click the label to open EP-Online. Enter the BAG ID shown above in the search box." />
				)}
				<div>
					{data.gebouwtype && (
						<div style={{ fontSize: "12px", fontWeight: 600, color: "#111" }}>
							{data.gebouwtype}
						</div>
					)}
					{data.gebouwklasse && (
						<div style={{ fontSize: "11px", color: "#666" }}>
							{data.gebouwklasse === "W"
								? "Residential"
								: data.gebouwklasse === "U"
									? "Utility"
									: data.gebouwklasse}
						</div>
					)}
				</div>
			</div>

			{data.projectnaam && (
				<div style={{ marginBottom: "10px" }}>
					<span style={lbl}>Project</span>
					<span style={val}>{data.projectnaam}</span>
				</div>
			)}

			<div style={grid2}>
				<div>
					<span style={lbl}>Energy demand</span>
					<span style={val}>{fmt(data.energiebehoefte, 0, "kWh/m²")}</span>
				</div>
				<div>
					<div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
						<span style={lbl}>Required limit</span>
						<InfoTooltip text="The legally required maximum energy demand for this building type. If energy demand exceeds this, the building does not meet current standards." />
					</div>
					<span style={val}>{fmt(data.eis_energiebehoefte, 0, "kWh/m²")}</span>
				</div>
			</div>
		</div>
	);
}

/** One VBO unit card */
function VboCard({
	vbo,
	index,
	isOnly,
	street,
}: {
	vbo: VboData;
	index: number;
	isOnly: boolean;
	street?: string;
}) {
	const title =
		fmtVboAddress(street, vbo.adres) ?? (!isOnly ? `Unit ${index + 1}` : null);
	const func = vbo.usage_function?.[0] ?? "Unknown";

	return (
		<div
			style={{
				background: "#fff",
				border: "1px solid #e0e0e0",
				borderRadius: "8px",
				padding: "10px 12px",
				fontSize: "12px",
			}}
		>
			{/* Header */}
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "flex-start",
					marginBottom: "4px",
				}}
			>
				<div>
					{title && (
						<div
							style={{
								fontWeight: 700,
								fontSize: "13px",
								color: "#111",
								marginBottom: "2px",
							}}
						>
							{title}
						</div>
					)}
					<div style={{ color: "#555", fontSize: "11px" }}>{func}</div>
				</div>
				{vbo.surface_area_m2 != null && (
					<div
						style={{
							background: "#f0f0f0",
							borderRadius: "4px",
							padding: "2px 7px",
							fontSize: "11px",
							fontWeight: 600,
							color: "#444",
							whiteSpace: "nowrap",
						}}
					>
						{vbo.surface_area_m2} m²
					</div>
				)}
			</div>

			{/* Status */}
			<div style={{ fontSize: "10px", color: "#aaa", marginBottom: "2px" }}>
				{vbo.status}
			</div>

			{/* Energy label */}
			{vbo.energie_label ? (
				<EnergieLabelBadge label={vbo.energie_label} bagId={vbo.bag_id} />
			) : (
				<div
					style={{
						marginTop: "6px",
						fontSize: "10px",
						color: "#bbb",
						fontStyle: "italic",
					}}
				>
					No energy label registered
				</div>
			)}
		</div>
	);
}

// ── Main component ────────────────────────────────────────────────────────────

export function BuildingsPanel({
	showBuildings,
	onToggleBuildings,
	buildingInfo,
	activeVbos = [],
	tileProperties: tp,
}: BuildingsPanelProps) {
	const bagId = buildingInfo?.pand_data?.bag_id ?? buildingInfo?.bag_id;
	const address = fmtAddress(buildingInfo?.address);

	return (
		<div style={{ padding: "0 4px" }}>
			<h3>3DBAG Buildings</h3>
			<CheckboxItem
				label="Display Buildings"
				checked={showBuildings}
				onChange={onToggleBuildings}
			/>

			{/* Intro hint */}
			<div
				style={{
					marginTop: "1rem",
					backgroundColor: "#f1e9e9",
					padding: "10px",
					borderRadius: "6px",
					fontStyle: "italic",
					fontSize: "13px",
				}}
			>
				<span
					style={{ fontWeight: "bold", display: "block", marginBottom: "4px" }}
				>
					About buildings
				</span>
				<p style={{ margin: "4px 0" }}>
					When buildings are enabled, click any building on the map to see its
					details here.
				</p>
				<p style={{ margin: "4px 0" }}>
					This includes construction year, 3D geometry, energy performance, and
					active units.
				</p>
			</div>

			{/* ── Building details ── */}
			{buildingInfo && (
				<div style={{ marginTop: "14px" }}>
					{/* Identity */}
					<div style={{ marginBottom: "12px" }}>
						<div
							style={{ fontWeight: 700, fontSize: "14px", marginBottom: "4px" }}
						>
							Selected Building
						</div>
						{address && (
							<div style={{ marginBottom: "4px" }}>
								{address.line1 && (
									<div
										style={{ fontSize: "13px", fontWeight: 600, color: "#111" }}
									>
										{address.line1}
									</div>
								)}
								{address.line2 && (
									<div style={{ fontSize: "12px", color: "#555" }}>
										{address.line2}
									</div>
								)}
							</div>
						)}
						<div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
							<code style={{ fontSize: "10px", color: "#aaa" }}>
								BAG ID: {bagId}
							</code>
							<InfoTooltip text="Basisregistratie Adressen en Gebouwen — the national building ID. Use it to search for this building on EP-Online." />
						</div>
					</div>

					{/* BAG registration */}
					<div style={grid2}>
						<div>
							<span style={lbl}>Year built</span>
							<span style={val}>
								{buildingInfo.pand_data?.construction_year ?? "—"}
							</span>
						</div>
						<div>
							<span style={lbl}>Status</span>
							<span style={val}>{buildingInfo.pand_data?.status ?? "—"}</span>
						</div>
					</div>

					{/* Building-level EP-Online energy */}
					{buildingInfo.pand_energie_data && (
						<PandEnergieSection
							data={buildingInfo.pand_energie_data}
							bagId={bagId}
						/>
					)}

					{/* 3D Geometry */}
					{tp && (
						<div style={divider}>
							<div style={sectionTitle}>3D Geometry</div>
							<div style={grid3}>
								<div>
									<span style={lbl}>Height</span>
									<span style={val}>{fmt(tp.hoogte, 1, "m")}</span>
								</div>
								<div>
									<span style={lbl}>Floors</span>
									<span style={val}>{tp.bouwlagen ?? "—"}</span>
								</div>
								<div>
									<span style={lbl}>Roof type</span>
									<span style={val}>{roofTypeLabel(tp.dak_type)}</span>
								</div>
							</div>
							<div style={{ ...grid2, marginTop: "10px" }}>
								<div>
									<span style={lbl}>Roof slope</span>
									<span style={val}>{fmt(tp.hellingshoek, 1, "°")}</span>
								</div>
								<div>
									<span style={lbl}>Volume</span>
									<span style={val}>
										{tp.volume_lod22 != null
											? `${Math.round(tp.volume_lod22)} m³`
											: "—"}
									</span>
								</div>
							</div>
							{(tp.opp_grond != null ||
								tp.opp_dak_plat != null ||
								tp.opp_dak_schuin != null) && (
								<div style={{ ...grid3, marginTop: "10px" }}>
									<div>
										<span style={lbl}>Footprint</span>
										<span style={val}>{fmt(tp.opp_grond, 0, "m²")}</span>
									</div>
									<div>
										<div
											style={{
												display: "flex",
												alignItems: "center",
												gap: "3px",
											}}
										>
											<span style={lbl}>Flat roof</span>
										</div>
										<span style={val}>{fmt(tp.opp_dak_plat, 0, "m²")}</span>
									</div>
									<div>
										<div
											style={{
												display: "flex",
												alignItems: "center",
												gap: "3px",
											}}
										>
											<span style={lbl}>Slant roof</span>
										</div>
										<span style={val}>{fmt(tp.opp_dak_schuin, 0, "m²")}</span>
									</div>
								</div>
							)}
						</div>
					)}

					{/* Active Units */}
					{activeVbos.length > 0 && (
						<div style={divider}>
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									alignItems: "baseline",
									marginBottom: "10px",
								}}
							>
								<div style={sectionTitle}>Active Units</div>
								<div style={{ fontSize: "11px", color: "#888" }}>
									{activeVbos.length} unit{activeVbos.length !== 1 ? "s" : ""}
								</div>
							</div>
							<div
								style={{ display: "flex", flexDirection: "column", gap: "8px" }}
							>
								{activeVbos.map((vbo, i) => (
									<VboCard
										key={vbo.bag_id}
										vbo={vbo}
										index={i}
										isOnly={activeVbos.length === 1}
										street={buildingInfo?.address?.street}
									/>
								))}
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
