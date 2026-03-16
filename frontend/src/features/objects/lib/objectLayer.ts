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
