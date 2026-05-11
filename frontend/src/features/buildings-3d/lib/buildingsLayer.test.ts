import { SimpleMeshLayer } from "@deck.gl/mesh-layers";
import { COORDINATE_SYSTEM, type Layer } from "@deck.gl/core";
import type { Mesh, MeshAttribute } from "@loaders.gl/schema";
import { computeCentroidRD, buildObjLayerFromMesh } from "./buildingsLayer";

jest.mock("proj4", () => ({
  __esModule: true,
  default: (...args: unknown[]) => args[2] as [number, number],
}));

function makeMeshFromPositions(positions: number[]): Mesh {
  const pos = Float32Array.from(positions);
  const POSITION: MeshAttribute = { value: pos, size: 3 };
  return { attributes: { POSITION } } as unknown as Mesh;
}

function outPositions(layer: Layer): Float32Array {
  const l = layer as SimpleMeshLayer & { props: { mesh: Mesh } };
  const attr = l.props.mesh.attributes?.POSITION as MeshAttribute;
  return attr.value as Float32Array;
}

describe("computeCentroidRD", () => {
  test("returns centroid of xyz positions", () => {
    const arr = new Float32Array([0, 0, 5, 10, 10, 15]);
    const [cx, cy, cz] = computeCentroidRD(arr);
    expect(cx).toBeCloseTo(5);
    expect(cy).toBeCloseTo(5);
    expect(cz).toBeCloseTo(10);
  });
});

describe("buildObjLayerFromMesh", () => {
  test("creates SimpleMeshLayer with expected deck props", () => {
    const src = makeMeshFromPositions([1, 2, 6, 3, 4, 10]);
    const origin: [number, number] = [0, 0];

    const layer = buildObjLayerFromMesh("buildings-obj", src, origin, {
      heightScale: 1,
    });

    const l = layer as SimpleMeshLayer & {
      props: {
        id: string;
        coordinateSystem: number;
        coordinateOrigin: [number, number, number];
        getPosition: () => [number, number, number];
        parameters: { depthTest: boolean };
        pickable: boolean;
        wireframe: boolean;
      };
    };

    expect(layer).toBeInstanceOf(SimpleMeshLayer);
    expect(l.props.id).toBe("buildings-obj");
    expect(l.props.coordinateSystem).toBe(COORDINATE_SYSTEM.METER_OFFSETS);
    expect(l.props.coordinateOrigin).toEqual([origin[0], origin[1], 0]);
    expect(l.props.getPosition()).toEqual([0, 0, 0]);
    expect(l.props.parameters.depthTest).toBe(true);
    expect(l.props.pickable).toBe(true);
  });

  test("applies XY meter offsets and grounded Z scaling", () => {
    const src = makeMeshFromPositions([
      0,
      0,
      4, // z' = (4 - 4) * 2 = 0
      1,
      0,
      5, // z' = (5 - 4) * 2 = 2
      0,
      1,
      6, // z' = (6 - 4) * 2 = 4
    ]);
    const origin: [number, number] = [0, 0];

    const layer = buildObjLayerFromMesh("buildings-obj", src, origin, {
      heightScale: 2,
    });
    const out = outPositions(layer);

    const mPerDegLon = 111_320;
    const mPerDegLat = 110_540;

    // (0,0,4)
    expect(out[0]).toBeCloseTo(0);
    expect(out[1]).toBeCloseTo(0);

    // (1,0,5)
    expect(out[3]).toBeCloseTo(1 * mPerDegLon);
    expect(out[4]).toBeCloseTo(0);

    // (0,1,6)
    expect(out[6]).toBeCloseTo(0);
    expect(out[7]).toBeCloseTo(1 * mPerDegLat);
  });
});
