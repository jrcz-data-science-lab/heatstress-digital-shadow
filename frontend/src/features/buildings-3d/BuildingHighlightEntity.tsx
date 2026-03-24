import { Entity, PolygonGraphics } from "resium";
import { Cartesian3, Color, PolygonHierarchy, HeightReference } from "cesium";

type LonLat = [number, number];

type Props = {
	polygon: LonLat[];
	/** Absolute roof height in metres above NAP (extruded top) */
	height: number;
	/** Absolute ground level in metres above NAP (polygon base) */
	groundHeight: number;
};

export function BuildingHighlightEntity({
	polygon,
	height,
	groundHeight,
}: Props) {
	const positions = polygon.map(([lon, lat]) =>
		Cartesian3.fromDegrees(lon, lat),
	);
	const hierarchy = new PolygonHierarchy(positions);

	return (
		<Entity>
			<PolygonGraphics
				hierarchy={hierarchy}
				height={groundHeight}
				extrudedHeight={height}
				heightReference={HeightReference.NONE}
				extrudedHeightReference={HeightReference.NONE}
				outline={true}
				outlineColor={Color.BLACK}
				outlineWidth={1}
			/>
		</Entity>
	);
}
