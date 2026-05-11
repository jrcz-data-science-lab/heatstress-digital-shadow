import { useState } from "react";
import { CollapsibleHelpBox } from "../../CollapsibleHelpBox";
import { FormInput, LoadingButton, MessageBox, ResultBox } from "../../form";
import { WindSection } from "./WindSection";
import { postWindJson } from "./windApi";
import type { WindApiResult } from "./windConstants";
import { useWindRequest } from "./useWindRequest";
import {
  getValidatedValue,
  requireNonNegativeNumber,
  requirePositiveNumber,
} from "./windValidation";

export function GridTab() {
  const [heightMapPath, setHeightMapPath] = useState("/data/wind/height.tif");
  const [buildingsHeightPath, setBuildingsHeightPath] = useState(
    "/data/wind/buildings-height.tif",
  );
  const [treesHeightPath, setTreesHeightPath] = useState(
    "/data/wind/trees-height.tif",
  );
  const [buildingsAspectPath, setBuildingsAspectPath] = useState(
    "/data/wind/buildings-aspect-west.tif",
  );
  const [treesAspectPath, setTreesAspectPath] = useState(
    "/data/wind/trees-aspect-west.tif",
  );
  const [buildingsPolygonPath, setBuildingsPolygonPath] = useState(
    "/data/wind/buildings.gpkg",
  );
  const [treesPointsPath, setTreesPointsPath] = useState(
    "/data/wind/trees.gpkg",
  );
  const [outputGridPath, setOutputGridPath] = useState("/data/wind/grid.gpkg");
  const [gridWidth, setGridWidth] = useState("125");
  const [gridHeight, setGridHeight] = useState("250");
  const [buildingsMinHeight, setBuildingsMinHeight] = useState("5");
  const [treesMinHeight, setTreesMinHeight] = useState("3");
  const [lambdaBuildingsWeight, setLambdaBuildingsWeight] = useState("0.6");
  const [lambdaTreesWeight, setLambdaTreesWeight] = useState("0.3");
  const [lambdaBackground, setLambdaBackground] = useState("0.015");
  const [u60, setU60] = useState("1.3084");
  const [referenceHeight, setReferenceHeight] = useState("60");
  const [vonKarmanConstant, setVonKarmanConstant] = useState("0.4");
  const [targetHeight, setTargetHeight] = useState("1.2");
  const [stabilityExponent, setStabilityExponent] = useState("9.8");
  const [isLocked, setIsLocked] = useState(true);
  const request = useWindRequest<WindApiResult>();

  const handleCreateGrid = () => {
    const gridWidthValue = getValidatedValue(
      requirePositiveNumber(
        gridWidth,
        "Grid cell width must be a positive number",
      ),
      request.setError,
    );
    if (gridWidthValue === null) {
      return;
    }

    const gridHeightValue = getValidatedValue(
      requirePositiveNumber(
        gridHeight,
        "Grid cell height must be a positive number",
      ),
      request.setError,
    );
    if (gridHeightValue === null) {
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

    void request.run(() =>
      postWindJson<WindApiResult>(
        "/grid",
        {
          height_map_path: heightMapPath,
          buildings_height_path: buildingsHeightPath,
          trees_height_path: treesHeightPath,
          buildings_aspect_path: buildingsAspectPath,
          trees_aspect_path: treesAspectPath,
          buildings_polygon_path: buildingsPolygonPath,
          trees_points_path: treesPointsPath,
          output_grid_path: outputGridPath,
          grid_width: gridWidthValue,
          grid_height: gridHeightValue,
          buildings_min_height: buildingsMinHeightValue,
          trees_min_height: treesMinHeightValue,
          lambda_buildings_weight: lambdaBuildingsWeightValue,
          lambda_trees_weight: lambdaTreesWeightValue,
          lambda_background: lambdaBackgroundValue,
          u_60: u60Value,
          reference_height: referenceHeightValue,
          von_karman_constant: vonKarmanConstantValue,
          target_height: targetHeightValue,
          stability_exponent: stabilityExponentValue,
        },
        "Failed to create grid",
      ),
    );
  };

  return (
    <div className="wind-panel__tab-content">
      <WindSection
        title="Create Grid &amp; Zonal Statistics"
        isLocked={isLocked}
        onToggleLock={() => setIsLocked(!isLocked)}
      >
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
          label="Buildings Aspect Path (west by default):"
          value={buildingsAspectPath}
          onChange={setBuildingsAspectPath}
          disabled={isLocked}
        />

        <FormInput
          label="Trees Aspect Path (west by default):"
          value={treesAspectPath}
          onChange={setTreesAspectPath}
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
          type="number"
          step="1"
          min="0"
        />

        <FormInput
          label="Grid Cell Height (m):"
          value={gridHeight}
          onChange={setGridHeight}
          disabled={isLocked}
          type="number"
          step="1"
          min="0"
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
          onClick={handleCreateGrid}
          isLoading={request.isLoading}
          loadingText="Processing..."
          text="Create Grid"
          color="var(--wind-color-grid)"
        />

        {request.error && <MessageBox message={request.error} type="error" />}

        {request.result && (
          <ResultBox
            status={request.result.status}
            outputPath={request.result.grid_path}
            outputLabel="Grid Path:"
            message={request.result.message}
            variant="blue"
          />
        )}

        <CollapsibleHelpBox
          title="Help: Grid &amp; Zonal Statistics"
          backgroundColor="var(--wind-color-grid-surface)"
          borderColor="var(--wind-color-grid)"
        >
          <p>
            Creates a rectangular analysis grid aligned to the height map
            extent, then computes per-cell height statistics for buildings and
            trees.
          </p>
          <p>
            <strong>Processing steps:</strong>
          </p>
          <ul style={{ marginLeft: "1rem" }}>
            <li>
              Create rectangular grid (default 125 m x 250 m) from height map
              extent
            </li>
            <li>
              Zonal statistics - buildings height:{" "}
              <code>buildings_height_count</code>,{" "}
              <code>buildings_height_sum</code>,{" "}
              <code>buildings_height_mean</code>
            </li>
            <li>
              Zonal statistics - trees height: <code>trees_height_count</code>,{" "}
              <code>trees_height_sum</code>, <code>trees_height_mean</code>
            </li>
            <li>
              Normalise <code>buildings_height_mean</code>: values below the
              threshold are raised to the minimum (default 5 m)
            </li>
            <li>
              Normalise <code>trees_height_mean</code>: values below the
              threshold are raised to the minimum (default 3 m)
            </li>
            <li>
              Lambda weights and wind profile constants are configurable for
              tuning
            </li>
          </ul>
          <p>
            The output is a GeoPackage vector layer. Open its attribute table or
            use rule-based symbology on a specific grid ID to inspect results.
          </p>
        </CollapsibleHelpBox>
      </WindSection>
    </div>
  );
}
