import type { TileProperties } from "../../features/buildings-3d/lib/buildingMetadataApi";

interface VboData {
	bag_id: string;
	usage_function?: string[];
	surface_area_m2?: number;
	status?: string;
}

interface PandData {
	bag_id?: string;
	construction_year?: number | string;
	status?: string;
}

interface BuildingInfo {
	bag_id?: string;
	pand_data?: PandData;
	verblijfsobject_data?: VboData[];
}

interface BuildingInfoCardProps {
	buildingInfo: BuildingInfo;
	activeVbos: VboData[];
	usageFunctions: string[];
	tileProperties?: TileProperties;
}

const label: React.CSSProperties = {
	color: "#666",
	fontSize: "10px",
	fontWeight: 600,
	textTransform: "uppercase",
	letterSpacing: "0.4px",
	display: "block",
	marginBottom: "1px",
};

const value: React.CSSProperties = {
	color: "#111",
	fontSize: "13px",
	fontWeight: 600,
};

const section: React.CSSProperties = {
	borderTop: "1px solid #eee",
	paddingTop: "10px",
	marginTop: "10px",
};

const grid2: React.CSSProperties = {
	display: "grid",
	gridTemplateColumns: "1fr 1fr",
	gap: "8px",
};

const grid3: React.CSSProperties = {
	display: "grid",
	gridTemplateColumns: "1fr 1fr 1fr",
	gap: "8px",
};

function fmt(n: number | undefined, decimals = 1, unit = ""): string {
	if (n == null) return "—";
	return `${n.toFixed(decimals)}${unit ? " " + unit : ""}`;
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

export const BuildingInfoCard = ({
	buildingInfo,
	activeVbos,
	usageFunctions,
	tileProperties: tp,
}: BuildingInfoCardProps) => {
	const bagId = buildingInfo.pand_data?.bag_id ?? buildingInfo.bag_id;

	return (
		<div
			style={{
				padding: "14px",
				background: "#ffffff",
				borderRadius: "12px",
				boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
				border: "1px solid rgba(0,0,0,0.1)",
				width: "260px",
				pointerEvents: "auto",
				color: "#000",
				maxHeight: "80vh",
				overflowY: "auto",
			}}
		>
			{/* ── Header ── */}
			<h3 style={{ margin: "0 0 2px 0", fontSize: "14px", fontWeight: 700 }}>
				Building Details
			</h3>
			<code
				style={{
					fontSize: "10px",
					color: "#555",
					display: "block",
					marginBottom: "10px",
				}}
			>
				{bagId}
			</code>

			{/* ── Registration (Kadaster BAG) ── */}
			<div style={grid2}>
				<div>
					<span style={label}>Year built</span>
					<span style={value}>
						{buildingInfo.pand_data?.construction_year ?? "—"}
					</span>
				</div>
				<div>
					<span style={label}>Status</span>
					<span style={value}>{buildingInfo.pand_data?.status ?? "—"}</span>
				</div>
			</div>

			<div style={{ marginTop: "8px" }}>
				<span style={label}>Usage</span>
				<span style={value}>{usageFunctions.join(", ") || "—"}</span>
			</div>

			{/* ── Geometry (3D BAG tileset) ── */}
			{tp && (
				<div style={section}>
					<div
						style={{
							fontSize: "11px",
							fontWeight: 700,
							color: "#444",
							marginBottom: "8px",
						}}
					>
						3D Geometry
					</div>

					<div style={grid3}>
						<div>
							<span style={label}>Height</span>
							<span style={value}>{fmt(tp.hoogte, 1, "m")}</span>
						</div>
						<div>
							<span style={label}>Floors</span>
							<span style={value}>{tp.bouwlagen ?? "—"}</span>
						</div>
						<div>
							<span style={label}>Roof type</span>
							<span style={value}>{roofTypeLabel(tp.dak_type)}</span>
						</div>
					</div>

					<div style={{ ...grid2, marginTop: "8px" }}>
						<div>
							<span style={label}>Roof slope</span>
							<span style={value}>{fmt(tp.hellingshoek, 1, "°")}</span>
						</div>
						<div>
							<span style={label}>Volume</span>
							<span style={value}>
								{tp.volume_lod22 != null
									? `${Math.round(tp.volume_lod22)} m³`
									: "—"}
							</span>
						</div>
					</div>

					{(tp.opp_grond != null ||
						tp.opp_dak_plat != null ||
						tp.opp_dak_schuin != null) && (
						<div style={{ ...grid3, marginTop: "8px" }}>
							<div>
								<span style={label}>Footprint</span>
								<span style={value}>{fmt(tp.opp_grond, 0, "m²")}</span>
							</div>
							<div>
								<span style={label}>Flat roof</span>
								<span style={value}>{fmt(tp.opp_dak_plat, 0, "m²")}</span>
							</div>
							<div>
								<span style={label}>Slant roof</span>
								<span style={value}>{fmt(tp.opp_dak_schuin, 0, "m²")}</span>
							</div>
						</div>
					)}
				</div>
			)}

			{/* ── Data quality (3D BAG) ── */}
			{tp && (
				<div style={section}>
					<div
						style={{
							fontSize: "11px",
							fontWeight: 700,
							color: "#444",
							marginBottom: "8px",
						}}
					>
						Data Quality
					</div>
					<div style={grid3}>
						<div>
							<span style={label}>Quality OK</span>
							<span
								style={{
									...value,
									color: tp.kwaliteitsindicator ? "#1a7f37" : "#cf222e",
								}}
							>
								{fmtBool(tp.kwaliteitsindicator)}
							</span>
						</div>
						<div>
							<span style={label}>RMSE</span>
							<span style={value}>{fmt(tp.rmse_lod22, 2, "m")}</span>
						</div>
						<div>
							<span style={label}>AHN year</span>
							<span style={value}>{tp.pw_datum ?? "—"}</span>
						</div>
					</div>
					{tp.mutatie_ahn4_ahn5 != null && (
						<div style={{ marginTop: "8px" }}>
							<span style={label}>Changed since AHN4</span>
							<span style={value}>{fmtBool(tp.mutatie_ahn4_ahn5)}</span>
						</div>
					)}
				</div>
			)}

			{/* ── Active units (VBOs) ── */}
			{activeVbos.length > 0 && (
				<div style={section}>
					<div
						style={{
							fontSize: "11px",
							fontWeight: 700,
							color: "#444",
							marginBottom: "8px",
						}}
					></div>
					<div
						style={{
							maxHeight: "150px",
							overflowY: "auto",
							display: "flex",
							flexDirection: "column",
							gap: "5px",
						}}
					>
						{activeVbos.map((vbo: VboData) => (
							<div
								key={vbo.bag_id}
								style={{
									background: "#f5f5f5",
									padding: "7px 9px",
									borderRadius: "6px",
									fontSize: "12px",
									border: "1px solid #e8e8e8",
								}}
							>
								<div style={{ fontWeight: 600 }}>
									{vbo.usage_function?.[0] ?? "Unknown"}
								</div>
								<div style={{ fontSize: "11px", color: "#555" }}>
									{vbo.surface_area_m2} m² · {vbo.status}
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
};
