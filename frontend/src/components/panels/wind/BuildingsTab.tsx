import { useState } from "react";
import { CollapsibleHelpBox } from "../../CollapsibleHelpBox";
import { CollapsibleSection } from "../../CollapsibleSection";
import { FormInput, LoadingButton, MessageBox, ResultBox, LockToggle } from "../../form";

type WindApiResult = Record<string, string>;

export function BuildingsTab() {
  const [buildingsReferencePath, setBuildingsReferencePath] = useState("/data/wind/height.tif");
  const [buildingsOutputPath, setBuildingsOutputPath] = useState("/data/wind/buildings.geojson");
  const [isBuildingsLoading, setIsBuildingsLoading] = useState(false);
  const [buildingsResult, setBuildingsResult] = useState<WindApiResult | null>(null);
  const [buildingsError, setBuildingsError] = useState<string | null>(null);
  const [isImportLocked, setIsImportLocked] = useState(true);

  const [rasterizeInput, setRasterizeInput] = useState("/data/wind/buildings.geojson");
  const [rasterizeOutput, setRasterizeOutput] = useState("/data/wind/buildings-mask.tif");
  const [isRasterizing, setIsRasterizing] = useState(false);
  const [rasterizeResult, setRasterizeResult] = useState<WindApiResult | null>(null);
  const [rasterizeError, setRasterizeError] = useState<string | null>(null);
  const [isRasterizeLocked, setIsRasterizeLocked] = useState(true);

  const [heightMapPath, setHeightMapPath] = useState("/data/wind/height.tif");
  const [buildingsMaskPath, setBuildingsMaskPath] = useState("/data/wind/buildings-mask.tif");
  const [buildingsHeightOutput, setBuildingsHeightOutput] = useState("/data/wind/buildings-height.tif");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractResult, setExtractResult] = useState<WindApiResult | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [isExtractLocked, setIsExtractLocked] = useState(true);

  const [aspectHeightPath, setAspectHeightPath] = useState("/data/wind/buildings-height.tif");
  const [aspectMaskPath, setAspectMaskPath] = useState("/data/wind/buildings-mask.tif");
  const [aspectOutputDir, setAspectOutputDir] = useState("/data/wind");
  const [isAspectLoading, setIsAspectLoading] = useState(false);
  const [aspectResult, setAspectResult] = useState<WindApiResult | null>(null);
  const [aspectError, setAspectError] = useState<string | null>(null);
  const [isAspectLocked, setIsAspectLocked] = useState(true);

  const handleImportBuildings = async () => {
    setIsBuildingsLoading(true);
    setBuildingsError(null);
    setBuildingsResult(null);

    try {
      const response = await fetch("http://localhost:9000/wind/buildings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          output_geojson_path: buildingsOutputPath,
          height_map_path: buildingsReferencePath,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to import buildings");
      }

      const data = await response.json();
      setBuildingsResult(data);
    } catch (err) {
      setBuildingsError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsBuildingsLoading(false);
    }
  };

  const handleRasterizeBuildings = async () => {
    setIsRasterizing(true);
    setRasterizeError(null);
    setRasterizeResult(null);

    try {
      const response = await fetch("http://localhost:9000/wind/rasterize-buildings", {
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
        throw new Error(errorData.detail || "Failed to rasterize buildings");
      }

      const data = await response.json();
      setRasterizeResult(data);
    } catch (err) {
      setRasterizeError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsRasterizing(false);
    }
  };

  const handleBuildingsAspect = async () => {
    setIsAspectLoading(true);
    setAspectError(null);
    setAspectResult(null);

    try {
      const response = await fetch("http://localhost:9000/wind/aspect-buildings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          height_path: aspectHeightPath,
          mask_path: aspectMaskPath,
          output_dir: aspectOutputDir,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to calculate buildings aspect");
      }

      setAspectResult(await response.json());
    } catch (err) {
      setAspectError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsAspectLoading(false);
    }
  };

  const handleExtractBuildingsHeight = async () => {
    setIsExtracting(true);
    setExtractError(null);
    setExtractResult(null);

    try {
      const response = await fetch("http://localhost:9000/wind/extract-height-buildings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          height_map_path: heightMapPath,
          mask_path: buildingsMaskPath,
          output_path: buildingsHeightOutput,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to extract buildings height");
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
      <CollapsibleSection title="Import Buildings">
        <LockToggle isLocked={isImportLocked} onToggle={() => setIsImportLocked(!isImportLocked)} />
        <FormInput
          label="Reference Layer Path (Height Map):"
          value={buildingsReferencePath}
          onChange={setBuildingsReferencePath}
          disabled={isImportLocked}
        />

        <FormInput
          label="Output GeoJSON Path:"
          value={buildingsOutputPath}
          onChange={setBuildingsOutputPath}
          disabled={isImportLocked}
        />

        <LoadingButton
          onClick={handleImportBuildings}
          isLoading={isBuildingsLoading}
          loadingText="Importing..."
          text="Import Buildings"
          color="#2196F3"
        />

        {buildingsError && <MessageBox message={buildingsError} type="error" />}

        {buildingsResult && (
          <ResultBox
            status={buildingsResult.status}
            outputPath={buildingsResult.buildings_path}
            message={buildingsResult.message}
            variant="blue"
          />
        )}

        <CollapsibleHelpBox
          title="Help: Buildings Import"
          backgroundColor="#e3f2fd"
          borderColor="#2196F3"
        >
          <p>
            This tool imports building footprints from the PDOK BAG WFS service
            and exports them as GeoJSON.
          </p>
          <p>
            <strong>How it works:</strong>
          </p>
          <ul style={{ marginLeft: "1rem" }}>
            <li>Reads the bounding box from the reference layer (height map)</li>
            <li>Fetches building polygons from PDOK BAG WFS v2.0</li>
            <li>Exports buildings within the extent as GeoJSON</li>
          </ul>
          <p>
            The reference layer is typically the height map generated in the previous step.
            The bounding box is automatically extracted from its extent.
          </p>
        </CollapsibleHelpBox>
      </CollapsibleSection>

      <CollapsibleSection title="Rasterize Buildings" separator>
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
          onClick={handleRasterizeBuildings}
          isLoading={isRasterizing}
          loadingText="Rasterizing..."
          text="Rasterize Buildings"
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
          title="Help: Buildings Rasterization"
          backgroundColor="#e8f5e9"
          borderColor="#4CAF50"
        >
          <p>
            This tool converts building footprints from GeoJSON to a binary raster mask.
          </p>
          <p>
            <strong>How it works:</strong>
          </p>
          <ul style={{ marginLeft: "1rem" }}>
            <li>Reads building polygons from the input GeoJSON file</li>
            <li>Uses height map reference to match extent, resolution, and CRS</li>
            <li>Rasterizes buildings with burn value 1.0 (1m resolution)</li>
            <li>Creates a binary mask where buildings = 1, no buildings = 0</li>
          </ul>
          <p>
            <strong>Important:</strong> The height map reference ensures the mask aligns perfectly
            with the height map for later height extraction operations.
          </p>
        </CollapsibleHelpBox>
      </CollapsibleSection>

      <CollapsibleSection title="Extract Buildings Height" separator>
        <LockToggle isLocked={isExtractLocked} onToggle={() => setIsExtractLocked(!isExtractLocked)} />
        <FormInput
          label="Height Map Path:"
          value={heightMapPath}
          onChange={setHeightMapPath}
          disabled={isExtractLocked}
        />

        <FormInput
          label="Buildings Mask Path:"
          value={buildingsMaskPath}
          onChange={setBuildingsMaskPath}
          disabled={isExtractLocked}
        />

        <FormInput
          label="Output Buildings Height Path:"
          value={buildingsHeightOutput}
          onChange={setBuildingsHeightOutput}
          disabled={isExtractLocked}
        />

        <LoadingButton
          onClick={handleExtractBuildingsHeight}
          isLoading={isExtracting}
          loadingText="Extracting..."
          text="Extract Buildings Height"
          color="#FF9800"
        />

        {extractError && <MessageBox message={extractError} type="error" />}

        {extractResult && (
          <ResultBox
            status={extractResult.status}
            outputPath={extractResult.height_path}
            message={extractResult.message}
          />
        )}

        <CollapsibleHelpBox
          title="Help: Buildings Height Extraction"
          backgroundColor="#fff3e0"
          borderColor="#FF9800"
        >
          <p>
            This tool extracts building heights from the height map using the buildings mask.
          </p>
          <p>
            <strong>How it works:</strong>
          </p>
          <ul style={{ marginLeft: "1rem" }}>
            <li>Applies the formula: (corrected DSM-DTM) * (buildings-mask == 1)</li>
            <li>Creates a raster where only building pixels have height values</li>
            <li>All non-building pixels are set to 0</li>
          </ul>
          <p>
            This output layer contains only the heights of buildings, which can be used
            for wind flow calculations and urban planning analyses.
          </p>
        </CollapsibleHelpBox>
      </CollapsibleSection>

      <CollapsibleSection title="Buildings Aspect" separator>
        <LockToggle isLocked={isAspectLocked} onToggle={() => setIsAspectLocked(!isAspectLocked)} />
        <FormInput
          label="Buildings Height Path:"
          value={aspectHeightPath}
          onChange={setAspectHeightPath}
          disabled={isAspectLocked}
        />
        <FormInput
          label="Buildings Mask Path:"
          value={aspectMaskPath}
          onChange={setAspectMaskPath}
          disabled={isAspectLocked}
        />
        <FormInput
          label="Output Directory:"
          value={aspectOutputDir}
          onChange={setAspectOutputDir}
          disabled={isAspectLocked}
        />

        <LoadingButton
          onClick={handleBuildingsAspect}
          isLoading={isAspectLoading}
          loadingText="Calculating..."
          text="Calculate Buildings Aspect"
          color="#E91E63"
        />

        {aspectError && <MessageBox message={aspectError} type="error" />}

        {aspectResult && (
          <ResultBox
            status={aspectResult.status}
            outputPath={aspectResult.aspect_separated_path}
            outputLabel="Aspect Separated:"
            message={aspectResult.message}
            variant="blue"
          />
        )}

        <CollapsibleHelpBox
          title="Help: Buildings Aspect"
          backgroundColor="#fce4ec"
          borderColor="#E91E63"
        >
          <p>Calculates which compass direction each building face is facing and produces 4 binary direction masks (N/E/S/W).</p>
          <ul style={{ marginLeft: "1rem" }}>
            <li>Runs GDAL Aspect on the buildings height layer (0–360°, true north)</li>
            <li>Bins into N=1 (315–45°), E=2 (45–135°), S=3 (135–225°), W=4 (225–315°)</li>
            <li>Multiplies each band by the buildings mask to isolate only building pixels</li>
            <li>Outputs: aspect, aspect-separated, and north/east/south/west masks</li>
          </ul>
        </CollapsibleHelpBox>
      </CollapsibleSection>
    </div>
  );
}
