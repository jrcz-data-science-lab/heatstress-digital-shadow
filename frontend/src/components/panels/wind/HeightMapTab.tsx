import { useState } from 'react';
import { CollapsibleHelpBox } from '../../CollapsibleHelpBox';
import { FormInput, LoadingButton, MessageBox, ResultBox } from '../../form';
import { WindSection } from './WindSection';
import { postWindJson } from './windApi';
import type { WindApiResult } from './windConstants';
import { useWindRequest } from './useWindRequest';

export function HeightMapTab() {
	const [dsmPath, setDsmPath] = useState('/data/wind/DSM-0.5.tiff');
	const [dtmPath, setDtmPath] = useState('/data/wind/DTM-0.5.tiff');
	const [outputPath, setOutputPath] = useState('/data/wind/height.tif');
	const [isLocked, setIsLocked] = useState(true);
	const request = useWindRequest<WindApiResult>();

	const handleGenerateHeightMap = () => {
		void request.run(() =>
			postWindJson<WindApiResult>(
				'/height-map',
				{
					dsm_input_path: dsmPath,
					dtm_input_path: dtmPath,
					corrected_height_output_path: outputPath,
				},
				'Failed to generate height map',
			),
		);
	};

	return (
		<div className="wind-panel__tab-content">
			<WindSection
				title="Generate Height Map"
				isLocked={isLocked}
				onToggleLock={() => setIsLocked(!isLocked)}
			>
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
					isLoading={request.isLoading}
					loadingText="Generating..."
					text="Generate Height Map"
					color="#0D47A1"
				/>

				{request.error && <MessageBox message={request.error} type="error" />}

				{request.result && (
					<ResultBox
						status={request.result.status}
						outputPath={request.result.height_path}
						message={request.result.message}
					/>
				)}

				<CollapsibleHelpBox
					title="Help: Wind Map Generation"
					backgroundColor="var(--wind-color-height-surface)"
					borderColor="var(--wind-color-height)"
				>
					<p>
						This tool generates a height map from DSM (Digital Surface Model) and DTM
						(Digital Terrain Model) layers.
					</p>
					<p>
						<strong>Processing steps:</strong>
					</p>
					<ul style={{ marginLeft: '1rem' }}>
						<li>Warp DSM/DTM to 1m resolution</li>
						<li>Fill DTM NoData gaps (buildings) using GDAL interpolation</li>
						<li>Fill remaining gaps (water bodies) with 0</li>
						<li>Calculate absolute heights (DSM - DTM)</li>
						<li>Correct negative values (from approximation errors) to 0</li>
					</ul>
					<p>
						Make sure the input files exist in the <code>/data</code> directory. The
						output height map will also be saved there.
					</p>
				</CollapsibleHelpBox>
			</WindSection>
		</div>
	);
}
