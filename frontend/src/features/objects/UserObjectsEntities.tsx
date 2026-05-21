import { Entity, ModelGraphics } from 'resium';
import { Cartesian3, HeightReference } from 'cesium';
import type { MeasureType, ObjectInstance } from './lib/objectLayer';

type Props = {
  objectsToSave: ObjectInstance[];
  objectTypes: MeasureType[];
};

export function UserObjectsEntities({ objectsToSave, objectTypes }: Props) {
  const objectTypesMap = objectTypes.reduce((acc, type) => {
    acc[type.name] = type;
    return acc;
  }, {} as Record<string, MeasureType>);

  return (
    <>
      {objectsToSave.map((obj) => {
        const type = objectTypesMap[obj.objectType];
        if (!type) return null;

        const [lon, lat] = obj.position;

        return (
          <Entity
            key={obj.id}
            // Prefix with 'user-obj-' so the click handler can identify these entities
            id={`user-obj-${obj.id}`}
            position={Cartesian3.fromDegrees(lon, lat, 0)}
          >
            <ModelGraphics
              uri={type.model}
              scale={obj.scale * 0.5}
              minimumPixelSize={16}
              heightReference={HeightReference.CLAMP_TO_GROUND}
            />
          </Entity>
        );
      })}
    </>
  );
}
