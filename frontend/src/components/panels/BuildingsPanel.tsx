import CheckboxItem from "./items/CheckboxItem";
import type { TileProperties, EnergieLabel, BuildingAddressData } from "../../features/buildings-3d/lib/buildingMetadataApi";

interface VboData {
	bag_id: string;
	usage_function?: string[];
	surface_area_m2?: number;
	status?: string;
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
	pand_data?: PandData;
	verblijfsobject_data?: VboData[];
}

type BuildingsPanelProps = {
	showBuildings: boolean;
	onToggleBuildings: (value: boolean) => void;
	buildingInfo?: BuildingInfo | null;
	activeVbos?: VboData[];
	usageFunctions?: string[];
	tileProperties?: TileProperties | null;
};

const lbl: React.CSSProperties = {
	color: "#666",
	fontSize: "10px",
	fontWeight: 600,
	textTransform: "uppercase",
	letterSpacing: "0.4px",
	display: "block",
	marginBottom: "2px",
};

const val: React.CSSProperties = {
	color: "#111",
	fontSize: "13px",
	fontWeight: 600,
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

function fmt(n: number | undefined, decimals = 1, unit = ""): string {
	if (n == null) return "—";
	return `${n.toFixed(decimals)}${unit ? "\u202f" + unit : ""}`;
}

function fmtBool(b: boolean | undefined): string {
	if (b == null) return "—";
	return b ? "Yes" : "No";
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

function fmtAddress(a: BuildingAddressData | null | undefined): { line1: string; line2: string } | null {
	if (!a) return null;
	const num = [a.house_number, a.house_letter, a.house_number_addition]
		.filter(Boolean)
		.join(" ");
	const line1 = [a.street, num].filter(Boolean).join(" ");
	const line2 = [a.postcode, a.city].filter(Boolean).join("  ");
	return line1 || line2 ? { line1, line2 } : null;
}

/** EU energy label colour scale A+++ → G */
const LABEL_COLORS: Record<string, { bg: string; text: string }> = {
	"A+++++": { bg: "#00893a", text: "#fff" },
	"A++++":  { bg: "#00893a", text: "#fff" },
	"A+++":   { bg: "#00893a", text: "#fff" },
	"A++":    { bg: "#1aaa45", text: "#fff" },
	"A+":     { bg: "#57b944", text: "#fff" },
	A:        { bg: "#a8ce38", text: "#000" },
	B:        { bg: "#cede38", text: "#000" },
	C:        { bg: "#f5eb1a", text: "#000" },
	D:        { bg: "#f5c31a", text: "#000" },
	E:        { bg: "#f5961a", text: "#000" },
	F:        { bg: "#f0631a", text: "#fff" },
	G:        { bg: "#e8231a", text: "#fff" },
};

function EnergieLabelBadge({ label }: { label: EnergieLabel }) {
	const klasse = label.energieklasse;
	const colors = klasse ? (LABEL_COLORS[klasse] ?? { bg: "#aaa", text: "#fff" }) : null;

	return (
		<div style={{ marginTop: "6px" }}>
			{/* Label class badge */}
			{klasse && colors && (
				<div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
					<div
						style={{
							background: colors.bg,
							color: colors.text,
							fontWeight: 800,
							fontSize: "14px",
							padding: "2px 10px",
							borderRadius: "4px",
							letterSpacing: "0.5px",
							minWidth: "36px",
							textAlign: "center",
						}}
					>
						{klasse}
					</div>
					{label.energie_index != null && (
						<span style={{ fontSize: "11px", color: "#555" }}>
							Index: {label.energie_index.toFixed(2)}
						</span>
					)}
					{label.gebouwklasse && (
						<span style={{ fontSize: "11px", color: "#555" }}>
							{label.gebouwklasse === "W" ? "Residential" : label.gebouwklasse === "U" ? "Utility" : label.gebouwklasse}
						</span>
					)}
				</div>
			)}

			{/* Performance figures */}
			<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
				{label.energiebehoefte != null && (
					<div>
						<span style={lbl}>Energy demand</span>
						<span style={{ ...val, fontSize: "12px" }}>{fmt(label.energiebehoefte, 0, "kWh/m²")}</span>
					</div>
				)}
				{label.primaire_fossiele_energie != null && (
					<div>
						<span style={lbl}>Fossil energy</span>
						<span style={{ ...val, fontSize: "12px" }}>{fmt(label.primaire_fossiele_energie, 0, "kWh/m²")}</span>
					</div>
				)}
				{label.aandeel_hernieuwbare_energie != null && (
					<div>
						<span style={lbl}>Renewable share</span>
						<span style={{ ...val, fontSize: "12px" }}>{fmt(label.aandeel_hernieuwbare_energie, 1, "%")}</span>
					</div>
				)}
				{label.warmtebehoefte != null && (
					<div>
						<span style={lbl}>Heat demand</span>
						<span style={{ ...val, fontSize: "12px" }}>{fmt(label.warmtebehoefte, 0, "kWh/m²")}</span>
					</div>
				)}
			</div>

			{/* Validity */}
			{(label.registratiedatum || label.geldig_tot) && (
				<div style={{ marginTop: "4px", fontSize: "10px", color: "#888" }}>
					{label.registratiedatum && `Registered: ${label.registratiedatum}`}
					{label.registratiedatum && label.geldig_tot && " · "}
					{label.geldig_tot && `Valid until: ${label.geldig_tot}`}
				</div>
			)}
		</div>
	);
}

export function BuildingsPanel({
	showBuildings,
	onToggleBuildings,
	buildingInfo,
	activeVbos = [],
	usageFunctions = [],
	tileProperties: tp,
}: BuildingsPanelProps) {
	const bagId = buildingInfo?.pand_data?.bag_id ?? buildingInfo?.bag_id;
	const address = fmtAddress(buildingInfo?.address);

	return (
		<div style={{ padding: "0 4px" }}>
			<div>
				<h3>3DBAG Buildings</h3>
			</div>
			<CheckboxItem
				label="Display Buildings"
				checked={showBuildings}
				onChange={onToggleBuildings}
			/>

			{/* Placeholder when nothing is selected */}
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
					This includes construction year, 3D geometry, roof data, and active
					units.
				</p>
			</div>

			{/* ── Building details ── */}
			{buildingInfo && (
				<div style={{ marginTop: "14px" }}>
					<div style={{ marginBottom: "12px" }}>
						<div
							style={{ fontWeight: 700, fontSize: "14px", marginBottom: "4px" }}
						>
							Selected Building
						</div>
						{address ? (
							<div style={{ marginBottom: "4px" }}>
								{address.line1 && (
									<div style={{ fontSize: "13px", fontWeight: 600, color: "#111" }}>
										{address.line1}
									</div>
								)}
								{address.line2 && (
									<div style={{ fontSize: "12px", color: "#555" }}>
										{address.line2}
									</div>
								)}
							</div>
						) : null}
						<code style={{ fontSize: "10px", color: "#888" }}>{bagId}</code>
					</div>

					{/* Registration (Kadaster BAG) */}
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
					<div style={{ marginTop: "10px" }}>
						<span style={lbl}>Usage</span>
						<span style={val}>{usageFunctions.join(", ") || "—"}</span>
					</div>

					{/* 3D Geometry (3D BAG tileset) */}
					{tp && (
						<div style={divider}>
							<div
								style={{
									fontSize: "11px",
									fontWeight: 700,
									color: "#444",
									marginBottom: "10px",
								}}
							>
								3D Geometry
							</div>
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
										<span style={lbl}>Flat roof</span>
										<span style={val}>{fmt(tp.opp_dak_plat, 0, "m²")}</span>
									</div>
									<div>
										<span style={lbl}>Slant roof</span>
										<span style={val}>{fmt(tp.opp_dak_schuin, 0, "m²")}</span>
									</div>
								</div>
							)}
						</div>
					)}

					{/* Data Quality */}
					{tp && (
						<div style={divider}>
							<div
								style={{
									fontSize: "11px",
									fontWeight: 700,
									color: "#444",
									marginBottom: "10px",
								}}
							>
								Data Quality
							</div>
							<div style={grid3}>
								<div>
									<span style={lbl}>Quality OK</span>
									<span
										style={{
											...val,
											color: tp.kwaliteitsindicator
												? "#1a7f37"
												: tp.kwaliteitsindicator === false
													? "#cf222e"
													: "#111",
										}}
									>
										{fmtBool(tp.kwaliteitsindicator)}
									</span>
								</div>
								<div>
									<span style={lbl}>Root Mean Square Error</span>
									<span style={val}>{fmt(tp.rmse_lod22, 2, "m")}</span>
								</div>
								<div>
									<span style={lbl}>AHN year</span>
									<span style={val}>{tp.pw_datum ?? "—"}</span>
								</div>
							</div>
							{tp.mutatie_ahn4_ahn5 != null && (
								<div style={{ marginTop: "10px" }}>
									<span style={lbl}>Changed since AHN4</span>
									<span style={val}>{fmtBool(tp.mutatie_ahn4_ahn5)}</span>
								</div>
							)}
						</div>
					)}

					{/* Active Units (VBOs) with EP-Online energy labels */}
					{activeVbos.length > 0 && (
						<div style={divider}>
							<div
								style={{
									fontSize: "11px",
									fontWeight: 700,
									color: "#444",
									marginBottom: "10px",
								}}
							>
								Used as
							</div>
							<div
								style={{ display: "flex", flexDirection: "column", gap: "8px" }}
							>
								{activeVbos.map((vbo: VboData) => (
									<div
										key={vbo.bag_id}
										style={{
											background: "#f5f5f5",
											padding: "8px 10px",
											borderRadius: "6px",
											fontSize: "12px",
											border: "1px solid #e8e8e8",
										}}
									>
										<div style={{ fontWeight: 600 }}>
											{vbo.usage_function?.[0] ?? "Unknown"}
										</div>
										<div style={{ fontSize: "11px", color: "#555", marginBottom: "2px" }}>
											{vbo.surface_area_m2} m² · {vbo.status}
										</div>

										{/* Energy label */}
										{vbo.energie_label ? (
											<EnergieLabelBadge label={vbo.energie_label} />
										) : (
											<div style={{ fontSize: "10px", color: "#aaa", marginTop: "4px" }}>
												No energy label registered
											</div>
										)}
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
