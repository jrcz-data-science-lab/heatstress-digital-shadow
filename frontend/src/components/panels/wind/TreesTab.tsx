import { useState } from "react";
import { CollapsibleHelpBox } from "../../CollapsibleHelpBox";
import { CollapsibleSection } from "../../CollapsibleSection";
import { FormInput, LoadingButton, MessageBox, ResultBox, LockToggle } from "../../form";

export function TreesTab() {
  const [treesReferencePath, setTreesReferencePath] = useState("/data/wind/height.tif");
  const [treesOutputPath, setTreesOutputPath] = useState("/data/wind/trees.geojson");
  const [isTreesLoading, setIsTreesLoading] = useState(false);
  const [treesResult, setTreesResult] = useState<any>(null);
  const [treesError, setTreesError] = useState<string | null>(null);
  const [isImportLocked, setIsImportLocked] = useState(true);

  // Rasterization state
  const [rasterizeInput, setRasterizeInput] = useState("/data/wind/trees.geojson");
  const [rasterizeOutput, setRasterizeOutput] = useState("/data/wind/trees-mask.tif");
  const [isRasterizing, setIsRasterizing] = useState(false);
  const [rasterizeResult, setRasterizeResult] = useState<any>(null);
  const [rasterizeError, setRasterizeError] = useState<string | null>(null);
  const [isRasterizeLocked, setIsRasterizeLocked] = useState(true);

  // Height extraction state
  const [heightMapPath, setHeightMapPath] = useState("/data/wind/height.tif");
  const [treesMaskPath, setTreesMaskPath] = useState("/data/wind/trees-mask.tif");
  const [treesHeightOutput, setTreesHeightOutput] = useState("/data/wind/trees-height.tif");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractResult, setExtractResult] = useState<any>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [isExtractLocked, setIsExtractLocked] = useState(true);

  const handleImportTrees = async () => {
    setIsTreesLoading(true);
    setTreesError(null);
    setTreesResult(null);

    try {
      const response = await fetch("http://localhost:9000/wind/trees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          output_geojson_path: treesOutputPath,
          height_map_path: treesReferencePath,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to import trees");
      }

      const data = await response.json();
      setTreesResult(data);
    } catch (err) {
      setTreesError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsTreesLoading(false);
    }
  };

  const handleRasterizeTrees = async () => {
    setIsRasterizing(true);
    setRasterizeError(null);
    setRasterizeResult(null);

    try {
      const response = await fetch("http://localhost:9000/wind/rasterize-trees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input_geojson_path: rasterizeInput,
          output_raster_path: rasterizeOutput,
          height_map_path: heightMapPath,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to rasterize trees");
      }

      const data = await response.json();
      setRasterizeResult(data);
    } catch (err) {
      setRasterizeError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsRasterizing(false);
    }
  };

  const handleExtractTreesHeight = async () => {
    setIsExtracting(true);
    setExtractError(null);
    setExtractResult(null);

    try {
      const response = await fetch("http://localhost:9000/wind/extract-height-trees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          height_map_path: heightMapPath,
          mask_path: treesMaskPath,
          output_path: treesHeightOutput,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to extract trees height");
      }

      const data = await response.json();
      setExtractResult(data);
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div style={{ maxWidth: "100%", overflowX: "hidden" }}>
      <CollapsibleSection title="Import Trees">
        <LockToggle isLocked={isImportLocked} onToggle={() => setIsImportLocked(!isImportLocked)} />
        <FormInput
          label="Reference Layer Path (Height Map):"
          value={treesReferencePath}
          onChange={setTreesReferencePath}
          disabled={isImportLocked}
        />

        <FormInput
          label="Output GeoJSON Path:"
          value={treesOutputPath}
          onChange={setTreesOutputPath}
          disabled={isImportLocked}
        />

        <LoadingButton
          onClick={handleImportTrees}
          isLoading={isTreesLoading}
          loadingText="Importing..."
          text="Import Trees"
          color="#4CAF50"
        />

        {treesError && <MessageBox message={treesError} type="error" />}

        {treesResult && (
          <ResultBox
            status={treesResult.status}
            outputPath={treesResult.trees_path}
            message={treesResult.message}
          />
        )}

        <CollapsibleHelpBox
          title="Help: Trees Import"
          backgroundColor="#e8f5e9"
          borderColor="#4CAF50"
        >
          <p>
            This tool imports tree/vegetation objects from the PDOK BGT WFS service
            and exports them as GeoJSON points.
          </p>
          <p>
            <strong>How it works:</strong>
          </p>
          <ul style={{ marginLeft: "1rem" }}>
            <li>Loads the entire vegetatieobject_punt layer from BGT (no bbox limit)</li>
            <li>Filters features by the reference layer extent during export</li>
            <li>Exports trees within the extent as GeoJSON points</li>
          </ul>
          <p>
            The reference layer is typically the height map generated in the Height Map tab.
            This approach avoids the 1000 object API limit by loading the full dataset and filtering locally.
          </p>
        </CollapsibleHelpBox>
      </CollapsibleSection>

      <CollapsibleSection title="Rasterize Trees" separator>
        <LockToggle isLocked={isRasterizeLocked} onToggle={() => setIsRasterizeLocked(!isRasterizeLocked)} />
        <FormInput
          label="Height Map Reference Path:"
          value={heightMapPath}
          onChange={setHeightMapPath}
          disabled={isRasterizeLocked}
        />

        <FormInput
          label="Input GeoJSON Path:"
          value={rasterizeInput}
          onChange={setRasterizeInput}
          disabled={isRasterizeLocked}
        />

        <FormInput
          label="Output Raster Path:"
          value={rasterizeOutput}
          onChange={setRasterizeOutput}
          disabled={isRasterizeLocked}
        />

        <LoadingButton
          onClick={handleRasterizeTrees}
          isLoading={isRasterizing}
          loadingText="Rasterizing..."
          text="Rasterize Trees"
          color="#4CAF50"
        />

        {rasterizeError && <MessageBox message={rasterizeError} type="error" />}

        {rasterizeResult && (
          <ResultBox
            status={rasterizeResult.status}
            outputPath={rasterizeResult.mask_path}
            message={rasterizeResult.message}
          />
        )}

        <CollapsibleHelpBox
          title="Help: Trees Rasterization"
          backgroundColor="#e8f5e9"
          borderColor="#4CAF50"
        >
          <p>
            This tool converts tree points from GeoJSON to a binary raster mask with buffering.
          </p>
          <p>
            <strong>How it works:</strong>
          </p>
          <ul style={{ marginLeft: "1rem" }}>
            <li>Reads tree point features from the input GeoJSON file</li>
            <li>Buffers each point into a circular polygon (3m radius)</li>
            <li>Uses height map reference to match extent, resolution, and CRS</li>
            <li>Rasterizes buffered trees with 1m resolution</li>
            <li>Creates a binary mask where trees = 1, no trees = 0</li>
          </ul>
          <p>
            <strong>Important:</strong> The height map reference ensures the mask aligns perfectly
            with the height map for later height extraction operations. The 3m buffer represents
            typical tree canopy radius.
          </p>
        </CollapsibleHelpBox>
      </CollapsibleSection>

      <CollapsibleSection title="Extract Trees Height" separator>
        <LockToggle isLocked={isExtractLocked} onToggle={() => setIsExtractLocked(!isExtractLocked)} />
        <FormInput
          label="Height Map Path:"
          value={heightMapPath}
          onChange={setHeightMapPath}
          disabled={isExtractLocked}
        />

        <FormInput
          label="Trees Mask Path:"
          value={treesMaskPath}
          onChange={setTreesMaskPath}
          disabled={isExtractLocked}
        />

        <FormInput
          label="Output Trees Height Path:"
          value={treesHeightOutput}
          onChange={setTreesHeightOutput}
          disabled={isExtractLocked}
        />

        <LoadingButton
          onClick={handleExtractTreesHeight}
          isLoading={isExtracting}
          loadingText="Extracting..."
          text="Extract Trees Height"
          color="#8BC34A"
        />

        {extractError && <MessageBox message={extractError} type="error" />}

        {extractResult && (
          <ResultBox
            status={extractResult.status}
            outputPath={extractResult.height_path}
            message={extractResult.message}
            variant="green"
          />
        )}

        <CollapsibleHelpBox
          title="Help: Trees Height Extraction"
          backgroundColor="#f1f8e9"
          borderColor="#8BC34A"
        >
          <p>
            This tool extracts tree heights from the height map using the trees mask.
          </p>
          <p>
            <strong>How it works:</strong>
          </p>
          <ul style={{ marginLeft: "1rem" }}>
            <li>Applies the formula: (corrected DSM-DTM) * (trees-mask == 1)</li>
            <li>Creates a raster where only tree pixels have height values</li>
            <li>All non-tree pixels are set to 0</li>
          </ul>
          <p>
            This output layer contains only the heights of trees, which can be used
            for wind flow calculations, vegetation analysis, and urban forestry planning.
          </p>
        </CollapsibleHelpBox>
      </CollapsibleSection>
    </div>
  );
}
