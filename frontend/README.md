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
      constants.ts            # Shared constants (BBOX, LOCAL_STORAGE_KEY, etc.)

  features/
    basemap/
      BasemapLayer.tsx        # CartoDB light tiles (UrlTemplateImageryProvider)

    existing-trees/
      ExistingTreesEntities.tsx     # Dataset of existing trees loaded from backend

    buildings-3d/
      BAG3DTileset.tsx              # 3D Tiles from api.3dbag.nl; highlights selected building via Cesium3DTileStyle
      useBuildingHighlight.ts       # Click handler: fetches BAG + EP-Online metadata from backend
      lib/
        buildingMetadataApi.ts      # API types + fetch functions (by BAG ID or RD coordinates)

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

- **Cesium Ion token required for basemaps**
  `Ion.defaultAccessToken` is set from the `VITE_CESIUM_ION_TOKEN` environment variable (see [Environment setup](#environment-setup) below). This unlocks the full basemap picker (Bing Maps, Esri imagery, etc.). Without a token the picker will return 401 errors on Ion-hosted layers.

- **UI components do not contain map logic**
  Panels and controls update state via props/callbacks only.

### Environment setup

Create a `.env.local` file in the `frontend/` directory (gitignored via `*.local`):

```bash
cp .env.example .env.local
```

Then edit `.env.local`:

```
VITE_CESIUM_ION_TOKEN=your_token_here
```

Get a free token at [ion.cesium.com/tokens](https://ion.cesium.com/tokens). Vite picks up `.env.local` automatically — restart the dev server after adding it.

---

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
