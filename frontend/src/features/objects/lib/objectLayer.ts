import { ScenegraphLayer } from "@deck.gl/mesh-layers";
import { GLTFLoader } from "@loaders.gl/gltf";
import type { Layer } from "@deck.gl/core";

export type ObjectInstance = {
  id: string;
  objectType: string; // (e.g., 'tree', 'bench')
  position: [number, number, number]; // [longitude, latitude, elevation]
  scale: number;
  height?: number;
  radius?: number;
  geometry?: string; // e.g., 'circle', 'square'
};

export interface MeasureType {
  id: number;
  name: string;
  model: string;
  icon: string;
  scale: number;
  height: number;
  radius: number;
  geometry: string;
  rotation: [number, number, number];
}

// Common scale multiplier for the model
const SCENEGRAPH_SIZE_SCALE = 0.5;

/**
 * Creates a ScenegraphLayer configured for displaying 3D objects.
 * @param id Layer ID.
 * @param data Array of ObjectFeature objects (WGS84 coordinates).
 * @param modelUrl URL to the GLB/GLTF model.
 * @param options Optional: color and orientation overrides.
 * @returns A configured ScenegraphLayer.
 */
export function makeObjectsLayer(
  id: string,
  data: ObjectInstance[],
  modelUrl: string,
  options?: {
    color?: [number, number, number, number];
    orientation?: [number, number, number];
  },
): Layer {
  return new ScenegraphLayer<ObjectInstance>({
    id: id,
    data,
    scenegraph: modelUrl,
    loaders: [GLTFLoader],

    sizeScale: SCENEGRAPH_SIZE_SCALE,
    _lighting: "pbr",
    pickable: true,
    getColor: options?.color || [180, 180, 180, 255],

    getPosition: (d) => d.position,
    getScale: (d) => [d.scale, d.scale, d.scale],
    getOrientation: options?.orientation || [0, 0, 90],

    updateTriggers: {
      getScale: [data.length],
    },
  });
}
