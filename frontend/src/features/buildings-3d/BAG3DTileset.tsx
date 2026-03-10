import { useMemo } from 'react';
import { Cesium3DTileset } from 'resium';
import { Cesium3DTileStyle } from 'cesium';

// 3D BAG — LoD2.2 3D Tiles (Netherlands national building dataset)
// Docs: https://docs.3dbag.nl/en/delivery/webservices/
const LOD22_URL = 'https://data.3dbag.nl/v20250903/cesium3dtiles/lod22/tileset.json';

type Props = {
  // Any CSS color string: '#d4b896', 'rgba(200,150,100,0.8)', 'orange', etc.
  color?: string;
};

export function BAG3DTileset({ color = '#5fff87' }: Props) {
  const style = useMemo(
    () => new Cesium3DTileStyle({ color: `color('${color}')` }),
    [color]
  );

  return <Cesium3DTileset url={LOD22_URL} style={style} />;
}
