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

interface DataSource {
	name: string;
	provider: string;
	license: string;
	url: string;
	description: string;
}

const DATA_SOURCES: DataSource[] = [
	{
		name: "OpenStreetMap",
		provider: "OpenStreetMap contributors",
		license: "ODbL",
		url: "https://www.openstreetmap.org/copyright",
		description: "Base map tiles via CartoDB.",
	},
	{
		name: "3D BAG",
		provider: "TU Delft",
		license: "CC BY 4.0",
		url: "https://3dbag.nl",
		description:
			"3D building geometry derived from AHN point cloud and BAG data.",
	},
	{
		name: "EP-Online",
		provider: "Rijksoverheid",
		license: "Open Government",
		url: "https://www.ep-online.nl/",
		description: "Dutch energy performance certificates for buildings.",
	},
	{
		name: "BAG (Basisregistratie Adressen en Gebouwen)",
		provider: "Kadaster via LVBAG API",
		license: "CC0",
		url: "https://www.kadaster.nl/zakelijk/registraties/basisregistraties/bag",
		description:
			"Building addresses, construction years, unit status, and footprints.",
	},
	{
		name: "BGT (Basisregistratie Grootschalige Topografie)",
		provider: "Kadaster / Gemeenten via PDOK",
		license: "CC0",
		url: "https://api.pdok.nl/lv/bgt/ogc/v1",
		description:
			"Existing trees in public space, delivered via the PDOK OGC API.",
	},
];

function DataSourceCard({ source }: { source: DataSource }) {
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
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "flex-start",
					marginBottom: "4px",
				}}
			>
				<a
					href={source.url}
					target="_blank"
					rel="noopener noreferrer"
					style={{
						fontWeight: 700,
						fontSize: "13px",
						color: "#111",
						textDecoration: "none",
					}}
				>
					{source.name} ↗
				</a>
				<span
					style={{
						background: "#f0f0f0",
						borderRadius: "4px",
						padding: "2px 7px",
						fontSize: "10px",
						fontWeight: 600,
						color: "#444",
						whiteSpace: "nowrap",
					}}
				>
					{source.license}
				</span>
			</div>
			<div style={{ color: "#555", fontSize: "11px", marginBottom: "4px" }}>
				{source.provider}
			</div>
			<div style={{ color: "#888", fontSize: "11px", fontStyle: "italic" }}>
				{source.description}
			</div>
		</div>
	);
}

export function InformationPanel() {
	return (
		<div style={{ padding: "0 4px" }}>
			<h3>Information</h3>

			<div
				style={{
					backgroundColor: "#eef4fb",
					padding: "10px",
					borderRadius: "6px",
					fontSize: "13px",
					marginBottom: "16px",
				}}
			>
				<span
					style={{ fontWeight: "bold", display: "block", marginBottom: "4px" }}
				>
					About this tool
				</span>
				<p style={{ margin: "4px 0", color: "#333" }}>
					Heatstress Digital Shadow is a decision-support tool for visualising
					urban heat stress and evaluating green interventions in
					municipalities.
				</p>
			</div>

			{/* Data Sources */}
			<div style={sectionTitle}>Data Sources</div>
			<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
				{DATA_SOURCES.map((source) => (
					<DataSourceCard key={source.name} source={source} />
				))}
			</div>

			{/* Copyright */}
			<div style={divider}>
				<div style={sectionTitle}>Copyright &amp; Licensing</div>
				<div style={{ fontSize: "12px", color: "#555", lineHeight: "1.6" }}>
					<div style={{ marginBottom: "6px" }}>
						<span style={lbl}>Basemap</span>
						<span style={val}>
							©{" "}
							<a
								href="https://www.openstreetmap.org/copyright"
								target="_blank"
								rel="noopener noreferrer"
								style={{ color: "#111" }}
							>
								OpenStreetMap
							</a>{" "}
							contributors
						</span>
					</div>
					<div style={{ marginBottom: "6px" }}>
						<span style={lbl}>3D Buildings</span>
						<span style={val}>
							©{" "}
							<a
								href="https://3dbag.nl"
								target="_blank"
								rel="noopener noreferrer"
								style={{ color: "#111" }}
							>
								3D BAG
							</a>{" "}
							by TU Delft (CC BY 4.0)
						</span>
					</div>
					<div>
						<span style={lbl}>Energy Labels</span>
						<span style={val}>
							©{" "}
							<a
								href="https://www.ep-online.nl/"
								target="_blank"
								rel="noopener noreferrer"
								style={{ color: "#111" }}
							>
								EP-Online.nl
							</a>{" "}
							by Rijksoverheid
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}
