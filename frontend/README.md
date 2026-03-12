## Frontend Architecture

The frontend uses a **feature-based structure**.
Each map capability (buildings, trees, WMS overlay, etc.) lives in its own folder under `src/features/`.
The map is rendered with **CesiumJS + Resium** — layers are React components (JSX children of `<Viewer>`).

### Structure

```
src/
  App.tsx
  map/
    CesiumMap.tsx             # <Viewer> wrapper, click/pick via ScreenSpaceEventHandler
    utils/
      crs.ts                  # RD ↔ WGS84 coordinate transforms (proj4)
      deckUtils.ts            # Shared constants (BBOX, LOCAL_STORAGE_KEY, etc.)

  features/
    basemap/
      BasemapLayer.tsx        # Cesium BaseLayerPicker (e.g. Stadia Alidade Smooth)

    buildings-3d/
      BuildingHighlightEntity.tsx   # Polygon highlight for selected building
      BAG3DTileset.tsx              # 3D Tiles from BAG dataset
      useBuildingHighlight.ts
      lib/
        bbox.ts
        buildingMetadataApi.ts

    wms-overlay/
      WMSOverlayLayer.tsx     # QGIS WMS tiles (WebMapServiceImageryProvider)
      useWMSLayers.ts
      useWMSLegend.ts
      lib/
        wmsUtils.ts           # buildGetFeatureInfoUrl, LonLatBBox
        qgisFeatureInfo.ts    # useQgisFeatureInfo hook
        qgisLayers.ts

    objects/
      StaticTreesEntities.tsx       # Dataset trees (<Entity> + <ModelGraphics>)
      UserObjectsEntities.tsx       # User-placed objects
      useUserObjectsLayer.ts
      lib/
        objectLayer.ts        # ObjectInstance + MeasureType types
        fileIOUtils.ts
```

### Principles

- **Each domain feature has its own folder**
  (`buildings-3d`, `objects`, `wms-overlay`, `basemap`).

- **Layers are React components**
  Each feature renders Resium entities/imagery as JSX children of `<Viewer>` in `CesiumMap.tsx`. There is no central layer array — composition is declarative.

- **Pure logic lives in `lib/` with no React code**
  URL builders, coordinate helpers, and API calls are isolated and unit-tested.

- **`CesiumMap` handles all map interaction**
  Click events are caught via `ScreenSpaceEventHandler`, which picks entities and fires `onLeftClick({ coordinate, pickedEntityId? })` to the parent.

- **Cesium Ion integration**
  The basemap is provided via Cesium's BaseLayerPicker with cloud-hosted imagery providers (e.g. Stadia Maps). A valid Ion access token is configured in Cesium's initialization.

- **UI components do not contain map logic**
  Panels and controls update state via props/callbacks only.

### Adding a new feature (example)

1. Create a folder:
   `src/features/<name>/`

2. Add a Resium component:
   `<Name>Entities.tsx` or `<Name>Layer.tsx` — renders `<Entity>`, `<ImageryLayer>`, etc.

3. Add it as a child of `<Viewer>` in `CesiumMap.tsx`.

4. Put any pure logic (data fetching, URL building) in:
   `lib/<name>Api.ts` or `lib/<name>Utils.ts`

This keeps the frontend modular, predictable, and easy to extend.

### Testing

We use **Jest + babel-jest** for unit tests. Only pure utility functions are tested — Resium component rendering is not unit-tested.

Tested modules:

- `map/utils/crs.ts` — RD ↔ WGS84 round-trip accuracy
- `features/wms-overlay/lib/wmsUtils.ts` — GetFeatureInfo URL construction
- `features/wms-overlay/lib/qgisFeatureInfo.ts` — feature info hook behaviour

Run tests:

```bash
npm test
```
