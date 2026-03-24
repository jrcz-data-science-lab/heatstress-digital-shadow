import { Entity, PolygonGraphics } from 'resium';
import { Cartesian3, Color, PolygonHierarchy } from 'cesium';

type LonLat = [number, number];

type Props = {
  polygon: LonLat[];
  height: number;
};

export function BuildingHighlightEntity({ polygon, height }: Props) {
  const positions = polygon.map(([lon, lat]) => Cartesian3.fromDegrees(lon, lat));
  const hierarchy = new PolygonHierarchy(positions);

  return (
    <Entity>
      <PolygonGraphics
        hierarchy={hierarchy}
        extrudedHeight={height}
        material={Color.TRANSPARENT}
        outline={true}
        outlineColor={Color.BLACK}
        outlineWidth={2}
      />
    </Entity>
  );
}
