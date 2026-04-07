import { useState } from "react";
import { CollapsibleHelpBox } from "../../CollapsibleHelpBox";
import { CollapsibleSection } from "../../CollapsibleSection";
import { FormInput, LoadingButton, MessageBox, ResultBox, LockToggle } from "../../form";

type WindApiResult = Record<string, string>;

export function HeightMapTab() {
  const [dsmPath, setDsmPath] = useState("/data/wind/DSM-0.5.tiff");
  const [dtmPath, setDtmPath] = useState("/data/wind/DTM-0.5.tiff");
  const [outputPath, setOutputPath] = useState("/data/wind/height.tif");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<WindApiResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(true);

  const handleGenerateHeightMap = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("http://localhost:9000/wind/height-map", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dsm_input_path: dsmPath,
          dtm_input_path: dtmPath,
          corrected_height_output_path: outputPath,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to generate height map");
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
      <CollapsibleSection title="Generate Height Map">
        <LockToggle isLocked={isLocked} onToggle={() => setIsLocked(!isLocked)} />
        <FormInput
          label="DSM Input Path:"
          value={dsmPath}
          onChange={setDsmPath}
          disabled={isLocked}
        />

        <FormInput
          label="DTM Input Path:"
          value={dtmPath}
          onChange={setDtmPath}
          disabled={isLocked}
        />

        <FormInput
          label="Output Path:"
          value={outputPath}
          onChange={setOutputPath}
          disabled={isLocked}
        />

        <LoadingButton
          onClick={handleGenerateHeightMap}
          isLoading={isLoading}
          loadingText="Generating..."
          text="Generate Height Map"
          color="#4CAF50"
        />

        {error && <MessageBox message={error} type="error" />}

        {result && (
          <ResultBox
            status={result.status}
            outputPath={result.height_path}
            message={result.message}
          />
        )}

      <CollapsibleHelpBox
        title="Help: Wind Map Generation"
        backgroundColor="#f1e9e9ff"
        borderColor="#4CAF50"
      >
        <p>
          This tool generates a height map from DSM (Digital Surface Model)
          and DTM (Digital Terrain Model) layers.
        </p>
        <p>
          <strong>Processing steps:</strong>
        </p>
        <ul style={{ marginLeft: "1rem" }}>
          <li>Warp DSM/DTM to 1m resolution</li>
          <li>Fill DTM NoData gaps (buildings) using GDAL interpolation</li>
          <li>Fill remaining gaps (water bodies) with 0</li>
          <li>Calculate absolute heights (DSM - DTM)</li>
          <li>Correct negative values (from approximation errors) to 0</li>
        </ul>
        <p>
          Make sure the input files exist in the <code>/data</code> directory. The output height map will also be saved there.
        </p>
      </CollapsibleHelpBox>
      </CollapsibleSection>
    </div>
  );
}
