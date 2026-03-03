import { useState } from "react";

export function WindPanel() {
  const [dsmPath, setDsmPath] = useState("/data/wind/DSM-0.5.tiff");
  const [dtmPath, setDtmPath] = useState("/data/wind/DTM-0.5.tiff");
  const [outputPath, setOutputPath] = useState("/data/wind/height.tif");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

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
    <>
      <div>
        <h3>Wind Map Generation (Debug)</h3>

        <div style={{ marginTop: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
            DSM Input Path:
          </label>
          <input
            type="text"
            value={dsmPath}
            onChange={(e) => setDsmPath(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
              marginBottom: "1rem",
            }}
          />

          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
            DTM Input Path:
          </label>
          <input
            type="text"
            value={dtmPath}
            onChange={(e) => setDtmPath(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
              marginBottom: "1rem",
            }}
          />

          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
            Output Path:
          </label>
          <input
            type="text"
            value={outputPath}
            onChange={(e) => setOutputPath(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
              marginBottom: "1rem",
            }}
          />

          <button
            onClick={handleGenerateHeightMap}
            disabled={isLoading}
            style={{
              width: "100%",
              padding: "0.75rem",
              backgroundColor: isLoading ? "#ccc" : "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: isLoading ? "not-allowed" : "pointer",
              fontWeight: "bold",
            }}
          >
            {isLoading ? "Generating..." : "Generate Height Map"}
          </button>
        </div>

        {error && (
          <div
            style={{
              marginTop: "1rem",
              padding: "1rem",
              backgroundColor: "#ffebee",
              border: "1px solid #f44336",
              borderRadius: "4px",
              color: "#c62828",
            }}
          >
            <strong>Error:</strong> {error}
          </div>
        )}

        {result && (
          <div
            style={{
              marginTop: "1rem",
              padding: "1rem",
              backgroundColor: "#e8f5e9",
              border: "1px solid #4CAF50",
              borderRadius: "4px",
            }}
          >
            <strong style={{ color: "#2e7d32" }}>Success!</strong>
            <div style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}>
              <div><strong>Status:</strong> {result.status}</div>
              <div><strong>Output Path:</strong></div>
              <div
                style={{
                  wordBreak: "break-all",
                  backgroundColor: "#f5f5f5",
                  padding: "0.5rem",
                  borderRadius: "4px",
                  marginTop: "0.25rem",
                  fontFamily: "monospace",
                  fontSize: "0.85rem",
                }}
              >
                {result.height_path}
              </div>
              <div style={{ marginTop: "0.5rem" }}>{result.message}</div>
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: "1rem",
          backgroundColor: "#f1e9e9ff",
          paddingLeft: 10,
          fontStyle: "italic",
          paddingTop: "0.5rem",
          paddingBottom: "0.5rem",
        }}
      >
        <span style={{ fontWeight: "bold" }}>Help: Wind Map Generation</span>
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
      </div>
    </>
  );
}