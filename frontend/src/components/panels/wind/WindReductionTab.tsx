import { useState } from "react";
import { CollapsibleHelpBox } from "../../CollapsibleHelpBox";
import {
  DropdownInput,
  FormInput,
  LoadingButton,
  MessageBox,
  ResultBox,
} from "../../form";
import { WindSection } from "./WindSection";
import { postWindJson } from "./windApi";
import { WIND_DIRECTION_OPTIONS } from "./windConstants";
import type { WindDirection } from "./windConstants";
import { useWindRequest } from "./useWindRequest";
import {
  getValidatedValue,
  optionalPositiveNumber,
  requireNonNegativeNumber,
  requirePositiveNumber,
} from "./windValidation";

type WindReductionResponse = {
  status: string;
  message: string;
  outputs?: {
    wind_grid?: string;
    wind_direction?: WindDirection;
    grid_cell_width?: number;
    grid_cell_height?: number;
  };
};

export function WindReductionTab() {
  const [dsmPath, setDsmPath] = useState("/data/wind/DSM-0.5.tiff");
  const [dtmPath, setDtmPath] = useState("/data/wind/DTM-0.5.tiff");
  const [outputDir, setOutputDir] = useState("/data/wind/");
  const [windDirection, setWindDirection] = useState<WindDirection>("west");
  const [buildingsMinHeight, setBuildingsMinHeight] = useState("5");
  const [treesMinHeight, setTreesMinHeight] = useState("3");
  const [gridCellWidth, setGridCellWidth] = useState("");
  const [gridCellHeight, setGridCellHeight] = useState("");
  const [rasterResolution, setRasterResolution] = useState("1");
  const [treesBufferDistance, setTreesBufferDistance] = useState("3");
  const [lambdaBuildingsWeight, setLambdaBuildingsWeight] = useState("0.6");
  const [lambdaTreesWeight, setLambdaTreesWeight] = useState("0.3");
  const [lambdaBackground, setLambdaBackground] = useState("0.015");
  const [u60, setU60] = useState("1.3084");
  const [referenceHeight, setReferenceHeight] = useState("60");
  const [vonKarmanConstant, setVonKarmanConstant] = useState("0.4");
  const [targetHeight, setTargetHeight] = useState("1.2");
  const [stabilityExponent, setStabilityExponent] = useState("9.8");
  const [isLocked, setIsLocked] = useState(true);
  const request = useWindRequest<WindReductionResponse>();

  const handleGenerateWindMap = () => {
    if (!dsmPath.trim() || !dtmPath.trim() || !outputDir.trim()) {
      request.setError("All input paths are required");
      return;
    }
    const buildingsMinHeightValue = getValidatedValue(
      requirePositiveNumber(
        buildingsMinHeight,
        "Buildings minimum height must be a positive number",
      ),
      request.setError,
    );
    if (buildingsMinHeightValue === null) {
      return;
    }

    const treesMinHeightValue = getValidatedValue(
      requirePositiveNumber(
        treesMinHeight,
        "Trees minimum height must be a positive number",
      ),
      request.setError,
    );
    if (treesMinHeightValue === null) {
      return;
    }

    const gridCellWidthValidation = optionalPositiveNumber(
      gridCellWidth,
      "Grid cell width must be a positive number",
    );
    if (gridCellWidthValidation.error) {
      request.setError(gridCellWidthValidation.error);
      return;
    }

    const gridCellHeightValidation = optionalPositiveNumber(
      gridCellHeight,
      "Grid cell height must be a positive number",
    );
    if (gridCellHeightValidation.error) {
      request.setError(gridCellHeightValidation.error);
      return;
    }

    const rasterResolutionValue = getValidatedValue(
      requirePositiveNumber(
        rasterResolution,
        "Raster resolution must be a positive number",
      ),
      request.setError,
    );
    if (rasterResolutionValue === null) {
      return;
    }

    const treesBufferDistanceValue = getValidatedValue(
      requirePositiveNumber(
        treesBufferDistance,
        "Trees buffer distance must be a positive number",
      ),
      request.setError,
    );
    if (treesBufferDistanceValue === null) {
      return;
    }

    const lambdaBuildingsWeightValue = getValidatedValue(
      requireNonNegativeNumber(
        lambdaBuildingsWeight,
        "Lambda buildings weight must be a non-negative number",
      ),
      request.setError,
    );
    if (lambdaBuildingsWeightValue === null) {
      return;
    }

    const lambdaTreesWeightValue = getValidatedValue(
      requireNonNegativeNumber(
        lambdaTreesWeight,
        "Lambda trees weight must be a non-negative number",
      ),
      request.setError,
    );
    if (lambdaTreesWeightValue === null) {
      return;
    }

    const lambdaBackgroundValue = getValidatedValue(
      requireNonNegativeNumber(
        lambdaBackground,
        "Lambda background must be a non-negative number",
      ),
      request.setError,
    );
    if (lambdaBackgroundValue === null) {
      return;
    }

    const u60Value = getValidatedValue(
      requirePositiveNumber(u60, "u_60 must be a positive number"),
      request.setError,
    );
    if (u60Value === null) {
      return;
    }

    const referenceHeightValue = getValidatedValue(
      requirePositiveNumber(
        referenceHeight,
        "Reference height must be a positive number",
      ),
      request.setError,
    );
    if (referenceHeightValue === null) {
      return;
    }

    const vonKarmanConstantValue = getValidatedValue(
      requirePositiveNumber(
        vonKarmanConstant,
        "Von Karman constant must be a positive number",
      ),
      request.setError,
    );
    if (vonKarmanConstantValue === null) {
      return;
    }

    const targetHeightValue = getValidatedValue(
      requirePositiveNumber(
        targetHeight,
        "Target height must be a positive number",
      ),
      request.setError,
    );
    if (targetHeightValue === null) {
      return;
    }

    const stabilityExponentValue = getValidatedValue(
      requirePositiveNumber(
        stabilityExponent,
        "Stability exponent must be a positive number",
      ),
      request.setError,
    );
    if (stabilityExponentValue === null) {
      return;
    }

    const payload: Record<string, unknown> = {
      dsm_path: dsmPath,
      dtm_path: dtmPath,
      output_dir: outputDir,
      wind_direction: windDirection,
      buildings_min_height: buildingsMinHeightValue,
      trees_min_height: treesMinHeightValue,
      raster_resolution: rasterResolutionValue,
      trees_buffer_distance: treesBufferDistanceValue,
      lambda_buildings_weight: lambdaBuildingsWeightValue,
      lambda_trees_weight: lambdaTreesWeightValue,
      lambda_background: lambdaBackgroundValue,
      u_60: u60Value,
      reference_height: referenceHeightValue,
      von_karman_constant: vonKarmanConstantValue,
      target_height: targetHeightValue,
      stability_exponent: stabilityExponentValue,
    };

    if (gridCellWidthValidation.value !== null) {
      payload.grid_cell_width = gridCellWidthValidation.value;
    }

    if (gridCellHeightValidation.value !== null) {
      payload.grid_cell_height = gridCellHeightValidation.value;
    }

    void request.run(() =>
      postWindJson<WindReductionResponse>(
        "/generate-wind-reduction-map",
        payload,
        "Failed to generate wind reduction map",
      ),
    );
  };

  return (
    <div className="wind-panel__tab-content">
      <WindSection
        title="Wind Reduction Map Generator"
        isLocked={isLocked}
        onToggleLock={() => setIsLocked(!isLocked)}
      >
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

        <DropdownInput
          label="Wind Direction (Blowing From):"
          value={windDirection}
          onChange={setWindDirection}
          options={WIND_DIRECTION_OPTIONS}
          disabled={isLocked}
        />

        <FormInput
          label="Min Building Height (m):"
          value={buildingsMinHeight}
          onChange={setBuildingsMinHeight}
          disabled={isLocked}
          type="number"
          step="0.1"
          min="0"
        />

        <FormInput
          label="Min Tree Height (m):"
          value={treesMinHeight}
          onChange={setTreesMinHeight}
          disabled={isLocked}
          type="number"
          step="0.1"
          min="0"
        />

        <FormInput
          label="Grid Cell Width Override (m):"
          value={gridCellWidth}
          onChange={setGridCellWidth}
          disabled={isLocked}
          type="number"
          step="1"
          min="0"
          placeholder="Auto (from wind direction)"
        />

        <FormInput
          label="Grid Cell Height Override (m):"
          value={gridCellHeight}
          onChange={setGridCellHeight}
          disabled={isLocked}
          type="number"
          step="1"
          min="0"
          placeholder="Auto (from wind direction)"
        />

        <FormInput
          label="Raster Resolution (m):"
          value={rasterResolution}
          onChange={setRasterResolution}
          disabled={isLocked}
          type="number"
          step="0.1"
          min="0"
        />

        <FormInput
          label="Trees Buffer Distance (m):"
          value={treesBufferDistance}
          onChange={setTreesBufferDistance}
          disabled={isLocked}
          type="number"
          step="0.1"
          min="0"
        />

        <FormInput
          label="Lambda Buildings Weight:"
          value={lambdaBuildingsWeight}
          onChange={setLambdaBuildingsWeight}
          disabled={isLocked}
          type="number"
          step="0.01"
          min="0"
        />

        <FormInput
          label="Lambda Trees Weight:"
          value={lambdaTreesWeight}
          onChange={setLambdaTreesWeight}
          disabled={isLocked}
          type="number"
          step="0.01"
          min="0"
        />

        <FormInput
          label="Lambda Background:"
          value={lambdaBackground}
          onChange={setLambdaBackground}
          disabled={isLocked}
          type="number"
          step="0.001"
          min="0"
        />

        <FormInput
          label="u_60 (m/s):"
          value={u60}
          onChange={setU60}
          disabled={isLocked}
          type="number"
          step="0.01"
          min="0"
        />

        <FormInput
          label="Reference Height (m):"
          value={referenceHeight}
          onChange={setReferenceHeight}
          disabled={isLocked}
          type="number"
          step="1"
          min="0"
        />

        <FormInput
          label="Von Karman Constant:"
          value={vonKarmanConstant}
          onChange={setVonKarmanConstant}
          disabled={isLocked}
          type="number"
          step="0.01"
          min="0"
        />

        <FormInput
          label="Target Height (m):"
          value={targetHeight}
          onChange={setTargetHeight}
          disabled={isLocked}
          type="number"
          step="0.1"
          min="0"
        />

        <FormInput
          label="Stability Exponent:"
          value={stabilityExponent}
          onChange={setStabilityExponent}
          disabled={isLocked}
          type="number"
          step="0.1"
          min="0"
        />

        <LoadingButton
          onClick={handleGenerateWindMap}
          isLoading={request.isLoading}
          loadingText="Generating..."
          text="Generate Wind Reduction Map"
          color="#FF6B6B"
        />

        <CollapsibleHelpBox
          title="About Wind Reduction Maps"
          borderColor="#FF6B6B"
          backgroundColor="#FFEBEE"
        >
          <p>
            This tool generates a complete wind reduction map workflow which
            includes:
          </p>
          <ol>
            <li>
              <strong>Height Map:</strong> Creates a height difference map from
              DSM and DTM
            </li>
            <li>
              <strong>Building & Tree Import:</strong> Imports buildings and
              trees from WFS services
            </li>
            <li>
              <strong>Rasterization:</strong> Converts vector data to raster
              masks
            </li>
            <li>
              <strong>Height Extraction:</strong> Extracts building and tree
              heights
            </li>
            <li>
              <strong>Aspect Calculation:</strong> Calculates wind direction
              aspects (N/E/S/W)
            </li>
            <li>
              <strong>Grid Generation:</strong> Uses wind direction to pick
              aspect inputs and oriented grid cell dimensions
            </li>
          </ol>
          <p>
            <strong>Inputs:</strong>
          </p>
          <ul>
            <li>DSM (Digital Surface Model) - AHN5</li>
            <li>DTM (Digital Terrain Model) - AHN5</li>
            <li>Wind direction (blowing from) - north/east/south/west</li>
            <li>
              Minimum building height (default 5 m) and tree height (default 3
              m)
            </li>
            <li>
              Optional grid cell width/height overrides (otherwise chosen by
              wind direction)
            </li>
            <li>
              Raster resolution (default 1 m) and tree buffer radius (default 3
              m)
            </li>
            <li>
              Lambda weights and wind profile constants (defaults match current
              model)
            </li>
          </ul>
          <p>
            <strong>Outputs:</strong>
          </p>
          <ul>
            <li>Height maps and masks</li>
            <li>Building and tree aspect rasters</li>
            <li>
              Wind reduction grid (GeoPackage) with u_1.2 reduction factors
            </li>
          </ul>
          <p>The process can take several minutes depending on data size.</p>
        </CollapsibleHelpBox>
      </WindSection>

      {request.error && <MessageBox type="error" message={request.error} />}

      {request.result && (
        <ResultBox
          status={request.result.status}
          outputPath={request.result.outputs?.wind_grid ?? outputDir}
          outputLabel="Wind Grid Path:"
          message={request.result.message}
          variant="blue"
        />
      )}
    </div>
  );
}
