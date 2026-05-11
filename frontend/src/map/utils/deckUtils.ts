import type { Mesh, MeshAttribute } from "@loaders.gl/schema";

export const BBOX = "31593.331,391390.397,32093.331,391890.397";
// BBOX for entire Middelburg, in case we need it later:
// export const BBOX = "30000.0074047316,387498.9925012316,34999.99884920326,393749.9992063424";
export const LOCAL_STORAGE_KEY = "userPlacedObjects";
export const DEFAULT_OBJECT_TYPE = "Trees";

export function resolveUrl(path?: string): string | undefined {
  if (!path) return undefined;
  const base =
    (typeof document !== "undefined" && document.baseURI) ||
    (typeof window !== "undefined" && window.location?.href) ||
    "/";
  return new URL(path, base).toString();
}

export function getPositionArray(mesh: Mesh): Float32Array {
  const attr = mesh.attributes?.POSITION as MeshAttribute | undefined;
  if (!attr) throw new Error("OBJ mesh has no POSITION attribute");
  const v = attr.value as unknown;

  if (v instanceof Float32Array) return v;
  if (typeof v === "object" && v !== null) {
    if (ArrayBuffer.isView(v)) {
      if (v instanceof DataView) {
        throw new Error("Unsupported POSITION value type: DataView");
      }
      return Float32Array.from(v as unknown as ArrayLike<number>);
    }
    if (v instanceof ArrayBuffer) {
      return new Float32Array(v);
    }
  }

  if (Array.isArray(v)) {
    return Float32Array.from(v);
  }

  throw new Error("Unsupported POSITION value type");
}
