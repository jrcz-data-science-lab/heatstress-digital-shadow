import { useState } from "react";
import { CollapsibleHelpBox } from "../../CollapsibleHelpBox";
import { CollapsibleSection } from "../../CollapsibleSection";
import { FormInput, LoadingButton, MessageBox, ResultBox, LockToggle } from "../../form";

type WindApiResult = Record<string, string>;

export function GridTab() {
  const [heightMapPath, setHeightMapPath] = useState("/data/wind/height.tif");
  const [buildingsHeightPath, setBuildingsHeightPath] = useState("/data/wind/buildings-height.tif");
  const [treesHeightPath, setTreesHeightPath] = useState("/data/wind/trees-height.tif");
  const [buildingsAspectWestPath, setBuildingsAspectWestPath] = useState("/data/wind/buildings-aspect-west.tif");
  const [treesAspectWestPath, setTreesAspectWestPath] = useState("/data/wind/trees-aspect-west.tif");
  const [buildingsPolygonPath, setBuildingsPolygonPath] = useState("/data/wind/buildings.gpkg");
  const [treesPointsPath, setTreesPointsPath] = useState("/data/wind/trees.gpkg");
  const [outputGridPath, setOutputGridPath] = useState("/data/wind/grid.gpkg");
  const [gridWidth, setGridWidth] = useState("125");
  const [gridHeight, setGridHeight] = useState("250");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<WindApiResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(true);

  const handleCreateGrid = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("http://localhost:9000/wind/grid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          height_map_path: heightMapPath,
          buildings_height_path: buildingsHeightPath,
          trees_height_path: treesHeightPath,
          buildings_aspect_west_path: buildingsAspectWestPath,
          trees_aspect_west_path: treesAspectWestPath,
          buildings_polygon_path: buildingsPolygonPath,
          trees_points_path: treesPointsPath,
          output_grid_path: outputGridPath,
          grid_width: parseFloat(gridWidth),
          grid_height: parseFloat(gridHeight),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to create grid");
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "100%", overflowX: "hidden" }}>
      <CollapsibleSection title="Create Grid &amp; Zonal Statistics">
        <LockToggle isLocked={isLocked} onToggle={() => setIsLocked(!isLocked)} />

        <FormInput
          label="Height Map Path (Extent Reference):"
          value={heightMapPath}
          onChange={setHeightMapPath}
          disabled={isLocked}
        />

        <FormInput
          label="Buildings Height Path:"
          value={buildingsHeightPath}
          onChange={setBuildingsHeightPath}
          disabled={isLocked}
        />

        <FormInput
          label="Trees Height Path:"
          value={treesHeightPath}
          onChange={setTreesHeightPath}
          disabled={isLocked}
        />

        <FormInput
          label="Buildings Aspect West Path:"
          value={buildingsAspectWestPath}
          onChange={setBuildingsAspectWestPath}
          disabled={isLocked}
        />

        <FormInput
          label="Trees Aspect West Path:"
          value={treesAspectWestPath}
          onChange={setTreesAspectWestPath}
          disabled={isLocked}
        />

        <FormInput
          label="Buildings Polygon Path:"
          value={buildingsPolygonPath}
          onChange={setBuildingsPolygonPath}
          disabled={isLocked}
        />

        <FormInput
          label="Trees Points Path:"
          value={treesPointsPath}
          onChange={setTreesPointsPath}
          disabled={isLocked}
        />

        <FormInput
          label="Output Grid Path (.gpkg):"
          value={outputGridPath}
          onChange={setOutputGridPath}
          disabled={isLocked}
        />

        <FormInput
          label="Grid Cell Width (m):"
          value={gridWidth}
          onChange={setGridWidth}
          disabled={isLocked}
        />

        <FormInput
          label="Grid Cell Height (m):"
          value={gridHeight}
          onChange={setGridHeight}
          disabled={isLocked}
        />

        <LoadingButton
          onClick={handleCreateGrid}
          isLoading={isLoading}
          loadingText="Processing..."
          text="Create Grid"
          color="#9C27B0"
        />

        {error && <MessageBox message={error} type="error" />}

        {result && (
          <ResultBox
            status={result.status}
            outputPath={result.grid_path}
            outputLabel="Grid Path:"
            message={result.message}
            variant="blue"
          />
        )}

        <CollapsibleHelpBox
          title="Help: Grid &amp; Zonal Statistics"
          backgroundColor="#f3e5f5"
          borderColor="#9C27B0"
        >
          <p>
            Creates a rectangular analysis grid aligned to the height map extent, then
            computes per-cell height statistics for buildings and trees.
          </p>
          <p>
            <strong>Processing steps:</strong>
          </p>
          <ul style={{ marginLeft: "1rem" }}>
            <li>Create rectangular grid (default 125 m x 250 m) from height map extent</li>
            <li>
              Zonal statistics - buildings height: <code>buildings_height_count</code>,{" "}
              <code>buildings_height_sum</code>, <code>buildings_height_mean</code>
            </li>
            <li>
              Zonal statistics - trees height: <code>trees_height_count</code>,{" "}
              <code>trees_height_sum</code>, <code>trees_height_mean</code>
            </li>
            <li>
              Normalise <code>buildings_height_mean</code>: values between 0 and 5 are
              raised to 5 (minimum representative building height)
            </li>
            <li>
              Normalise <code>trees_height_mean</code>: values between 0 and 3 are
              raised to 3 (minimum representative tree height)
            </li>
          </ul>
          <p>
            The output is a GeoPackage vector layer. Open its attribute table or use
            rule-based symbology on a specific grid ID to inspect results.
          </p>
        </CollapsibleHelpBox>
      </CollapsibleSection>
    </div>
  );
}
