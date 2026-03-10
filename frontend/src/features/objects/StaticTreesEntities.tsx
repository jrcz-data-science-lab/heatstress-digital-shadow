import { useEffect, useState } from 'react';
import { Entity, ModelGraphics } from 'resium';
import { Cartesian3 } from 'cesium';
import { rdToLonLat } from '../../map/utils/crs';
import { BBOX, DEFAULT_OBJECT_TYPE } from '../../map/utils/deckUtils';

type TreeData = {
  id: string;
  lon: number;
  lat: number;
  scale: number;
};

type Props = {
  modelUrl?: string;
};

export function StaticTreesEntities({ modelUrl = '/models/tree-pine.glb' }: Props) {
  const [trees, setTrees] = useState<TreeData[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function fetchTrees() {
      try {
        const response = await fetch(`/backend/objects/trees?BBOX=${BBOX}`);
        const json = await response.json();

        const features = (json.features || []) as {
          id: string;
          geometry: { coordinates: [number, number] };
          properties: { relatieve_hoogteligging?: number } & Record<string, unknown>;
        }[];

        const data: TreeData[] = features.map((feature) => {
          const [xRD, yRD] = feature.geometry.coordinates;
          const [lon, lat] = rdToLonLat(xRD, yRD);
          const rawHeight = feature.properties?.relatieve_hoogteligging;
          const scale = rawHeight && rawHeight > 0 ? rawHeight : 15;
          return { id: feature.id, lon, lat, scale };
        });

        if (!cancelled) setTrees(data);
      } catch (e) {
        console.error('Failed to fetch static trees:', e);
      }
    }

    void fetchTrees();
    return () => { cancelled = true; };
  }, []);

  // DEFAULT_OBJECT_TYPE is imported to keep the constant used (same as before)
  void DEFAULT_OBJECT_TYPE;

  return (
    <>
      {trees.map((tree) => (
        <Entity
          key={tree.id}
          id={`static-tree-${tree.id}`}
          position={Cartesian3.fromDegrees(tree.lon, tree.lat, 0)}
        >
          <ModelGraphics
            uri={modelUrl}
            scale={tree.scale * 0.5}
            minimumPixelSize={16}
          />
        </Entity>
      ))}
    </>
  );
}
