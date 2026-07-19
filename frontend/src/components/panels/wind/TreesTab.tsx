import { useState } from 'react';
import { CollapsibleHelpBox } from '../../CollapsibleHelpBox';
import { DropdownInput, FormInput, LoadingButton, MessageBox, ResultBox } from '../../form';
import { WindSection } from './WindSection';
import { postWindJson } from './windApi';
import { WIND_DIRECTION_OPTIONS } from './windConstants';
import type { WindApiResult, WindDirection } from './windConstants';
import { useWindRequest } from './useWindRequest';
import { getValidatedValue, requirePositiveNumber } from './windValidation';

export function TreesTab() {
	const [treesReferencePath, setTreesReferencePath] = useState('/data/wind/height.tif');
	const [treesOutputPath, setTreesOutputPath] = useState('/data/wind/trees.gpkg');
	const [isImportLocked, setIsImportLocked] = useState(true);
	const importRequest = useWindRequest<WindApiResult>();

	const [rasterizeInput, setRasterizeInput] = useState('/data/wind/trees.gpkg');
	const [rasterizeOutput, setRasterizeOutput] = useState('/data/wind/trees-mask.tif');
	const [rasterizeResolution, setRasterizeResolution] = useState('1');
	const [bufferDistance, setBufferDistance] = useState('3');
	const [isRasterizeLocked, setIsRasterizeLocked] = useState(true);
	const rasterizeRequest = useWindRequest<WindApiResult>();

	const [heightMapPath, setHeightMapPath] = useState('/data/wind/height.tif');
	const [treesMaskPath, setTreesMaskPath] = useState('/data/wind/trees-mask.tif');
	const [treesHeightOutput, setTreesHeightOutput] = useState('/data/wind/trees-height.tif');
	const [isExtractLocked, setIsExtractLocked] = useState(true);
	const extractRequest = useWindRequest<WindApiResult>();

	const [aspectHeightPath, setAspectHeightPath] = useState('/data/wind/trees-height.tif');
	const [aspectMaskPath, setAspectMaskPath] = useState('/data/wind/trees-mask.tif');
	const [aspectOutputDir, setAspectOutputDir] = useState('/data/wind');
	const [aspectWindDirection, setAspectWindDirection] = useState<WindDirection>('west');
	const [isAspectLocked, setIsAspectLocked] = useState(true);
	const aspectRequest = useWindRequest<WindApiResult>();

	const handleImportTrees = () => {
		void importRequest.run(() =>
			postWindJson<WindApiResult>(
				'/trees',
				{
					output_geojson_path: treesOutputPath,
					height_map_path: treesReferencePath,
				},
				'Failed to import trees',
			),
		);
	};

	const handleRasterizeTrees = () => {
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

		const bufferDistanceValue = getValidatedValue(
			requirePositiveNumber(bufferDistance, 'Buffer distance must be a positive number'),
			rasterizeRequest.setError,
		);
		if (bufferDistanceValue === null) {
			return;
		}

		void rasterizeRequest.run(() =>
			postWindJson<WindApiResult>(
				'/rasterize-trees',
				{
					input_geojson_path: rasterizeInput,
					output_raster_path: rasterizeOutput,
					height_map_path: heightMapPath,
					raster_resolution: rasterResolutionValue,
					trees_buffer_distance: bufferDistanceValue,
				},
				'Failed to rasterize trees',
			),
		);
	};

	const handleTreesAspect = () => {
		void aspectRequest.run(() =>
			postWindJson<WindApiResult>(
				'/aspect-trees',
				{
					height_path: aspectHeightPath,
					mask_path: aspectMaskPath,
					output_dir: aspectOutputDir,
					wind_direction: aspectWindDirection,
				},
				'Failed to calculate trees aspect',
			),
		);
	};

	const handleExtractTreesHeight = () => {
		void extractRequest.run(() =>
			postWindJson<WindApiResult>(
				'/extract-height-trees',
				{
					height_map_path: heightMapPath,
					mask_path: treesMaskPath,
					output_path: treesHeightOutput,
				},
				'Failed to extract trees height',
			),
		);
	};

	return (
		<div className="wind-panel__tab-content">
			<WindSection
				title="Import Trees"
				isLocked={isImportLocked}
				onToggleLock={() => setIsImportLocked(!isImportLocked)}
			>
				<FormInput
					label="Reference Layer Path (Height Map):"
					value={treesReferencePath}
					onChange={setTreesReferencePath}
					disabled={isImportLocked}
				/>

				<FormInput
					label="Output GeoPackage Path:"
					value={treesOutputPath}
					onChange={setTreesOutputPath}
					disabled={isImportLocked}
				/>

				<LoadingButton
					onClick={handleImportTrees}
					isLoading={importRequest.isLoading}
					loadingText="Importing..."
					text="Import Trees"
					color="#4CAF50"
				/>

				{importRequest.error && <MessageBox message={importRequest.error} type="error" />}

				{importRequest.result && (
					<ResultBox
						status={importRequest.result.status}
						outputPath={importRequest.result.trees_path}
						message={importRequest.result.message}
					/>
				)}

				<CollapsibleHelpBox
					title="Help: Trees Import"
					backgroundColor="var(--wind-color-trees-surface)"
					borderColor="var(--wind-color-trees)"
				>
					<p>
						This tool imports tree/vegetation objects from the PDOK BGT WFS service and
						exports them as point features in a GeoPackage.
					</p>
					<p>
						<strong>How it works:</strong>
					</p>
					<ul style={{ marginLeft: '1rem' }}>
						<li>
							Loads the entire vegetatieobject_punt layer from BGT (no bbox limit)
						</li>
						<li>Filters features by the reference layer extent during export</li>
						<li>Exports trees within the extent as point features in a GeoPackage</li>
					</ul>
					<p>
						The reference layer is typically the height map generated in the Height Map
						tab. This approach avoids the 1000 object API limit by loading the full
						dataset and filtering locally.
					</p>
				</CollapsibleHelpBox>
			</WindSection>

			<WindSection
				title="Rasterize Trees"
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

				<FormInput
					label="Buffer Distance (m):"
					value={bufferDistance}
					onChange={setBufferDistance}
					disabled={isRasterizeLocked}
					type="number"
					step="0.1"
					min="0"
				/>

				<LoadingButton
					onClick={handleRasterizeTrees}
					isLoading={rasterizeRequest.isLoading}
					loadingText="Rasterizing..."
					text="Rasterize Trees"
					color="#4CAF50"
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
					title="Help: Trees Rasterization"
					backgroundColor="var(--wind-color-trees-surface)"
					borderColor="var(--wind-color-trees)"
				>
					<p>
						This tool converts tree points from a GeoPackage to a binary raster mask
						with buffering.
					</p>
					<p>
						<strong>How it works:</strong>
					</p>
					<ul style={{ marginLeft: '1rem' }}>
						<li>Reads tree point features from the input GeoPackage file</li>
						<li>Buffers each point into a circular polygon (default 3m radius)</li>
						<li>Uses height map reference to match extent, resolution, and CRS</li>
						<li>Rasterizes buffered trees with default 1m resolution</li>
						<li>Creates a binary mask where trees = 1, no trees = 0</li>
					</ul>
					<p>
						<strong>Important:</strong> The height map reference ensures the mask aligns
						perfectly with the height map for later height extraction operations. The
						default 3m buffer represents typical tree canopy radius.
					</p>
				</CollapsibleHelpBox>
			</WindSection>

			<WindSection
				title="Extract Trees Height"
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
					isLoading={extractRequest.isLoading}
					loadingText="Extracting..."
					text="Extract Trees Height"
					color="#4CAF50"
				/>

				{extractRequest.error && <MessageBox message={extractRequest.error} type="error" />}

				{extractRequest.result && (
					<ResultBox
						status={extractRequest.result.status}
						outputPath={extractRequest.result.height_path}
						message={extractRequest.result.message}
						variant="green"
					/>
				)}

				<CollapsibleHelpBox
					title="Help: Trees Height Extraction"
					backgroundColor="var(--wind-color-trees-surface)"
					borderColor="var(--wind-color-trees)"
				>
					<p>This tool extracts tree heights from the height map using the trees mask.</p>
					<p>
						<strong>How it works:</strong>
					</p>
					<ul style={{ marginLeft: '1rem' }}>
						<li>Applies the formula: (corrected DSM-DTM) * (trees-mask == 1)</li>
						<li>Creates a raster where only tree pixels have height values</li>
						<li>All non-tree pixels are set to 0</li>
					</ul>
					<p>
						This output layer contains only the heights of trees, which can be used for
						wind flow calculations, vegetation analysis, and urban forestry planning.
					</p>
				</CollapsibleHelpBox>
			</WindSection>

			<WindSection
				title="Trees Aspect"
				separator
				isLocked={isAspectLocked}
				onToggleLock={() => setIsAspectLocked(!isAspectLocked)}
			>
				<FormInput
					label="Trees Height Path:"
					value={aspectHeightPath}
					onChange={setAspectHeightPath}
					disabled={isAspectLocked}
				/>
				<FormInput
					label="Trees Mask Path:"
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
					onClick={handleTreesAspect}
					isLoading={aspectRequest.isLoading}
					loadingText="Calculating..."
					text="Calculate Trees Aspect"
					color="#4CAF50"
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
					/>
				)}

				<CollapsibleHelpBox
					title="Help: Trees Aspect"
					backgroundColor="var(--wind-color-trees-surface)"
					borderColor="var(--wind-color-trees)"
				>
					<p>
						Calculates tree-facing aspect and extracts only the selected wind direction
						mask.
					</p>
					<ul style={{ marginLeft: '1rem' }}>
						<li>Runs GDAL Aspect on the trees height layer (0-360°, true north)</li>
						<li>
							Bins into N=1 (315-45°), E=2 (45-135°), S=3 (135-225°), W=4 (225-315°)
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
