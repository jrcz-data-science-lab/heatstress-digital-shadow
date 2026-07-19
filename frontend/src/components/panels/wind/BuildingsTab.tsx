import { useState } from 'react';
import { CollapsibleHelpBox } from '../../CollapsibleHelpBox';
import { DropdownInput, FormInput, LoadingButton, MessageBox, ResultBox } from '../../form';
import { WindSection } from './WindSection';
import { postWindJson } from './windApi';
import { WIND_DIRECTION_OPTIONS } from './windConstants';
import type { WindApiResult, WindDirection } from './windConstants';
import { useWindRequest } from './useWindRequest';
import { getValidatedValue, requirePositiveNumber } from './windValidation';

export function BuildingsTab() {
	const [buildingsReferencePath, setBuildingsReferencePath] = useState('/data/wind/height.tif');
	const [buildingsOutputPath, setBuildingsOutputPath] = useState('/data/wind/buildings.gpkg');
	const [isImportLocked, setIsImportLocked] = useState(true);
	const importRequest = useWindRequest<WindApiResult>();

	const [rasterizeInput, setRasterizeInput] = useState('/data/wind/buildings.gpkg');
	const [rasterizeOutput, setRasterizeOutput] = useState('/data/wind/buildings-mask.tif');
	const [rasterizeResolution, setRasterizeResolution] = useState('1');
	const [isRasterizeLocked, setIsRasterizeLocked] = useState(true);
	const rasterizeRequest = useWindRequest<WindApiResult>();

	const [heightMapPath, setHeightMapPath] = useState('/data/wind/height.tif');
	const [buildingsMaskPath, setBuildingsMaskPath] = useState('/data/wind/buildings-mask.tif');
	const [buildingsHeightOutput, setBuildingsHeightOutput] = useState(
		'/data/wind/buildings-height.tif',
	);
	const [isExtractLocked, setIsExtractLocked] = useState(true);
	const extractRequest = useWindRequest<WindApiResult>();

	const [aspectHeightPath, setAspectHeightPath] = useState('/data/wind/buildings-height.tif');
	const [aspectMaskPath, setAspectMaskPath] = useState('/data/wind/buildings-mask.tif');
	const [aspectOutputDir, setAspectOutputDir] = useState('/data/wind');
	const [aspectWindDirection, setAspectWindDirection] = useState<WindDirection>('west');
	const [isAspectLocked, setIsAspectLocked] = useState(true);
	const aspectRequest = useWindRequest<WindApiResult>();

	const handleImportBuildings = () => {
		void importRequest.run(() =>
			postWindJson<WindApiResult>(
				'/buildings',
				{
					output_geojson_path: buildingsOutputPath,
					height_map_path: buildingsReferencePath,
				},
				'Failed to import buildings',
			),
		);
	};

	const handleRasterizeBuildings = () => {
		const rasterResolutionValue = getValidatedValue(
			requirePositiveNumber(
				rasterizeResolution,
				'Raster resolution must be a positive number',
			),
			rasterizeRequest.setError,
		);
		if (rasterResolutionValue === null) {
			return;
		}

		void rasterizeRequest.run(() =>
			postWindJson<WindApiResult>(
				'/rasterize-buildings',
				{
					input_geojson_path: rasterizeInput,
					output_raster_path: rasterizeOutput,
					height_map_path: heightMapPath,
					raster_resolution: rasterResolutionValue,
				},
				'Failed to rasterize buildings',
			),
		);
	};

	const handleBuildingsAspect = () => {
		void aspectRequest.run(() =>
			postWindJson<WindApiResult>(
				'/aspect-buildings',
				{
					height_path: aspectHeightPath,
					mask_path: aspectMaskPath,
					output_dir: aspectOutputDir,
					wind_direction: aspectWindDirection,
				},
				'Failed to calculate buildings aspect',
			),
		);
	};

	const handleExtractBuildingsHeight = () => {
		void extractRequest.run(() =>
			postWindJson<WindApiResult>(
				'/extract-height-buildings',
				{
					height_map_path: heightMapPath,
					mask_path: buildingsMaskPath,
					output_path: buildingsHeightOutput,
				},
				'Failed to extract buildings height',
			),
		);
	};

	return (
		<div className="wind-panel__tab-content">
			<WindSection
				title="Import Buildings"
				isLocked={isImportLocked}
				onToggleLock={() => setIsImportLocked(!isImportLocked)}
			>
				<FormInput
					label="Reference Layer Path (Height Map):"
					value={buildingsReferencePath}
					onChange={setBuildingsReferencePath}
					disabled={isImportLocked}
				/>

				<FormInput
					label="Output GeoPackage Path:"
					value={buildingsOutputPath}
					onChange={setBuildingsOutputPath}
					disabled={isImportLocked}
				/>

				<LoadingButton
					onClick={handleImportBuildings}
					isLoading={importRequest.isLoading}
					loadingText="Importing..."
					text="Import Buildings"
					color="#2196F3"
				/>

				{importRequest.error && <MessageBox message={importRequest.error} type="error" />}

				{importRequest.result && (
					<ResultBox
						status={importRequest.result.status}
						outputPath={importRequest.result.buildings_path}
						message={importRequest.result.message}
						variant="blue"
					/>
				)}

				<CollapsibleHelpBox
					title="Help: Buildings Import"
					backgroundColor="#e3f2fd"
					borderColor="#2196F3"
				>
					<p>
						This tool imports building footprints from the PDOK BAG WFS service and
						exports them as a GeoPackage.
					</p>
					<p>
						<strong>How it works:</strong>
					</p>
					<ul style={{ marginLeft: '1rem' }}>
						<li>Reads the bounding box from the reference layer (height map)</li>
						<li>Fetches building polygons from PDOK BAG WFS v2.0</li>
						<li>Exports buildings within the extent as a GeoPackage</li>
					</ul>
					<p>
						The reference layer is typically the height map generated in the previous
						step. The bounding box is automatically extracted from its extent.
					</p>
				</CollapsibleHelpBox>
			</WindSection>

			<WindSection
				title="Rasterize Buildings"
				separator
				isLocked={isRasterizeLocked}
				onToggleLock={() => setIsRasterizeLocked(!isRasterizeLocked)}
			>
				<FormInput
					label="Height Map Reference Path:"
					value={heightMapPath}
					onChange={setHeightMapPath}
					disabled={isRasterizeLocked}
				/>

				<FormInput
					label="Input GeoPackage Path:"
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

				<FormInput
					label="Raster Resolution (m):"
					value={rasterizeResolution}
					onChange={setRasterizeResolution}
					disabled={isRasterizeLocked}
					type="number"
					step="0.1"
					min="0"
				/>

				<LoadingButton
					onClick={handleRasterizeBuildings}
					isLoading={rasterizeRequest.isLoading}
					loadingText="Rasterizing..."
					text="Rasterize Buildings"
					color="#2196F3"
				/>

				{rasterizeRequest.error && (
					<MessageBox message={rasterizeRequest.error} type="error" />
				)}

				{rasterizeRequest.result && (
					<ResultBox
						status={rasterizeRequest.result.status}
						outputPath={rasterizeRequest.result.mask_path}
						message={rasterizeRequest.result.message}
					/>
				)}

				<CollapsibleHelpBox
					title="Help: Buildings Rasterization"
					backgroundColor="var(--wind-color-buildings-surface)"
					borderColor="var(--wind-color-buildings)"
				>
					<p>
						This tool converts building footprints from a GeoPackage to a binary raster
						mask.
					</p>
					<p>
						<strong>How it works:</strong>
					</p>
					<ul style={{ marginLeft: '1rem' }}>
						<li>Reads building polygons from the input GeoPackage file</li>
						<li>Uses height map reference to match extent, resolution, and CRS</li>
						<li>Rasterizes buildings with burn value 1.0 (default 1m resolution)</li>
						<li>Creates a binary mask where buildings = 1, no buildings = 0</li>
					</ul>
					<p>
						<strong>Important:</strong> The height map reference ensures the mask aligns
						perfectly with the height map for later height extraction operations.
					</p>
				</CollapsibleHelpBox>
			</WindSection>

			<WindSection
				title="Extract Buildings Height"
				separator
				isLocked={isExtractLocked}
				onToggleLock={() => setIsExtractLocked(!isExtractLocked)}
			>
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
					isLoading={extractRequest.isLoading}
					loadingText="Extracting..."
					text="Extract Buildings Height"
					color="#2196F3"
				/>

				{extractRequest.error && <MessageBox message={extractRequest.error} type="error" />}

				{extractRequest.result && (
					<ResultBox
						status={extractRequest.result.status}
						outputPath={extractRequest.result.height_path}
						message={extractRequest.result.message}
					/>
				)}

				<CollapsibleHelpBox
					title="Help: Buildings Height Extraction"
					backgroundColor="var(--wind-color-buildings-surface)"
					borderColor="var(--wind-color-buildings)"
				>
					<p>
						This tool extracts building heights from the height map using the buildings
						mask.
					</p>
					<p>
						<strong>How it works:</strong>
					</p>
					<ul style={{ marginLeft: '1rem' }}>
						<li>Applies the formula: (corrected DSM-DTM) * (buildings-mask == 1)</li>
						<li>Creates a raster where only building pixels have height values</li>
						<li>All non-building pixels are set to 0</li>
					</ul>
					<p>
						This output layer contains only the heights of buildings, which can be used
						for wind flow calculations and urban planning analyses.
					</p>
				</CollapsibleHelpBox>
			</WindSection>

			<WindSection
				title="Buildings Aspect"
				separator
				isLocked={isAspectLocked}
				onToggleLock={() => setIsAspectLocked(!isAspectLocked)}
			>
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

				<DropdownInput
					label="Wind Direction (Blowing From):"
					value={aspectWindDirection}
					onChange={setAspectWindDirection}
					options={WIND_DIRECTION_OPTIONS}
					disabled={isAspectLocked}
				/>

				<LoadingButton
					onClick={handleBuildingsAspect}
					isLoading={aspectRequest.isLoading}
					loadingText="Calculating..."
					text="Calculate Buildings Aspect"
					color="#2196F3"
				/>

				{aspectRequest.error && <MessageBox message={aspectRequest.error} type="error" />}

				{aspectRequest.result && (
					<ResultBox
						status={aspectRequest.result.status}
						outputPath={
							aspectRequest.result.directional_aspect_path ??
							aspectRequest.result.aspect_separated_path
						}
						outputLabel="Directional Aspect:"
						message={aspectRequest.result.message}
						variant="blue"
					/>
				)}

				<CollapsibleHelpBox
					title="Help: Buildings Aspect"
					backgroundColor="var(--wind-color-buildings-surface)"
					borderColor="var(--wind-color-buildings)"
				>
					<p>
						Calculates building-facing aspect and extracts only the selected wind
						direction mask.
					</p>
					<ul style={{ marginLeft: '1rem' }}>
						<li>Runs GDAL Aspect on the buildings height layer (0–360°, true north)</li>
						<li>
							Bins into N=1 (315–45°), E=2 (45–135°), S=3 (135–225°), W=4 (225–315°)
						</li>
						<li>
							Uses the selected wind direction (blowing from) to extract one
							directional mask
						</li>
						<li>Outputs: aspect, aspect-separated, and one directional mask</li>
					</ul>
				</CollapsibleHelpBox>
			</WindSection>
		</div>
	);
}
