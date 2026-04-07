import { useState } from "react";
import { CollapsibleHelpBox } from "../../CollapsibleHelpBox";
import { CollapsibleSection } from "../../CollapsibleSection";
import { FormInput, LoadingButton, MessageBox, ResultBox, LockToggle } from "../../form";

type WindReductionResponse = {
  status: string;
  message: string;
  outputs?: {
    wind_grid?: string;
  };
};

export function WindReductionTab() {
  const [dsmPath, setDsmPath] = useState("/data/wind/DSM-0.5.tiff");
  const [dtmPath, setDtmPath] = useState("/data/wind/DTM-0.5.tiff");
  const [outputDir, setOutputDir] = useState("/data/wind/");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<WindReductionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(true);

  const handleGenerateWindMap = async () => {
    if (!dsmPath.trim() || !dtmPath.trim() || !outputDir.trim()) {
      setError("All input paths are required");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("http://localhost:9000/wind/generate-wind-reduction-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dsm_path: dsmPath,
          dtm_path: dtmPath,
          output_dir: outputDir,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to generate wind reduction map");
      }

      const data: WindReductionResponse = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "100%", overflowX: "hidden" }}>
      <CollapsibleSection title="Wind Reduction Map Generator">
        <LockToggle isLocked={isLocked} onToggle={() => setIsLocked(!isLocked)} />

        <FormInput
          label="DSM Path (Digital Surface Model):"
          value={dsmPath}
          onChange={setDsmPath}
          disabled={isLocked}
          placeholder="/path/to/dsm.tif"
        />

        <FormInput
          label="DTM Path (Digital Terrain Model):"
          value={dtmPath}
          onChange={setDtmPath}
          disabled={isLocked}
          placeholder="/path/to/dtm.tif"
        />

        <FormInput
          label="Output Directory:"
          value={outputDir}
          onChange={setOutputDir}
          disabled={isLocked}
          placeholder="/path/to/output/"
        />

        <LoadingButton
          onClick={handleGenerateWindMap}
          isLoading={isLoading}
          loadingText="Generating..."
          text="Generate Wind Reduction Map"
          color="#FF6B6B"
        />

        <CollapsibleHelpBox title="About Wind Reduction Maps">
          <p>
            This tool generates a complete wind reduction map workflow which includes:
          </p>
          <ol>
            <li><strong>Height Map:</strong> Creates a height difference map from DSM and DTM</li>
            <li><strong>Building & Tree Import:</strong> Imports buildings and trees from WFS services</li>
            <li><strong>Rasterization:</strong> Converts vector data to raster masks</li>
            <li><strong>Height Extraction:</strong> Extracts building and tree heights</li>
            <li><strong>Aspect Calculation:</strong> Calculates wind direction aspects (N/E/S/W)</li>
            <li><strong>Grid Generation:</strong> Creates analysis grid with zonal statistics and wind parameters</li>
          </ol>
          <p>
            <strong>Inputs:</strong>
          </p>
          <ul>
            <li>DSM (Digital Surface Model) - typically AHN2 DSM data</li>
            <li>DTM (Digital Terrain Model) - typically AHN2 DTM data</li>
          </ul>
          <p>
            <strong>Outputs:</strong>
          </p>
          <ul>
            <li>Height maps and masks</li>
            <li>Building and tree aspect rasters</li>
            <li>Wind reduction grid (GeoPackage) with u_1.2 reduction factors</li>
          </ul>
          <p>
            The process can take several minutes depending on data size.
          </p>
        </CollapsibleHelpBox>
      </CollapsibleSection>

      {error && (
        <MessageBox type="error" message={error} />
      )}

      {result && (
        <ResultBox
          status={result.status}
          outputPath={result.outputs?.wind_grid ?? outputDir}
          outputLabel="Wind Grid Path:"
          message={result.message}
          variant="blue"
        />
      )}
    </div>
  );
}
