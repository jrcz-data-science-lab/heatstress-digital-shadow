import type { MeasureType, ObjectInstance } from '../../features/objects/lib/objectLayer';
import CheckboxItem from './items/CheckboxItem';
import ObjectItem from './items/ObjectItem';
import { ObjectIOControls } from './items/ObjectIOControls';

type HeatStressMeasuresProps = {
	showObjects: boolean;
	onToggleObjects: (v: boolean) => void;
	objectTypes: MeasureType[];
	selectedObjectType: string | null;
	onSelectObjectType: (type: MeasureType | null) => void;
	hasUnsavedChanges: boolean;
	isProcessing: boolean;
	onSave: (objects: ObjectInstance[]) => void;
	onDiscard: () => void;
	currentObjects: ObjectInstance[];
	onImportObjects: (objs: ObjectInstance[]) => void;
};

export function HeatStressMeasuresPanel({
	showObjects,
	onToggleObjects,
	objectTypes,
	selectedObjectType,
	onSelectObjectType,
	hasUnsavedChanges,
	isProcessing,
	onSave,
	onDiscard,
	currentObjects,
	onImportObjects,
}: HeatStressMeasuresProps) {
	const disabled = !showObjects;
	const disabledButtons = !hasUnsavedChanges || !showObjects || isProcessing;
	const handleObjectClick = (type: MeasureType) => {
		if (selectedObjectType === type.name) {
			onSelectObjectType(null);
		} else {
			onSelectObjectType(type);
		}
	};
	return (
		<div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
			<div style={{ flex: '0 0 auto' }}>
				<h3>Heat Stress Measures</h3>
				<CheckboxItem label="Objects View" checked={showObjects} onChange={onToggleObjects}>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: '1fr 1fr',
							gap: '1rem',
							marginTop: '1rem',
							opacity: disabled ? 0.5 : 1,
						}}
					>
						{objectTypes.map((type) => (
							<ObjectItem
								key={type.id}
								label={type.name}
								icon={
									<img
										src={type.icon}
										alt={type.name}
										style={{ width: 36, height: 36 }}
									/>
								}
								disabled={disabled}
								active={selectedObjectType === type.name}
								onClick={() => handleObjectClick(type)}
							/>
						))}
					</div>
				</CheckboxItem>
				<div
					style={{
						marginTop: '1rem',
						display: 'flex',
						gap: 8,
					}}
				>
					<button
						onClick={onDiscard}
						disabled={disabledButtons}
						style={{
							padding: '8px 15px',
							cursor: disabledButtons ? 'not-allowed' : 'pointer',
							border: 'solid 1px #d1d1d1ff',
						}}
					>
						Discard
					</button>
					<button
						onClick={() => onSave(currentObjects)}
						disabled={disabledButtons}
						style={{
							padding: '8px 15px',
							cursor: disabledButtons ? 'not-allowed' : 'pointer',
							border: 'solid 1px #d1d1d1ff',
						}}
					>
						Save
					</button>
				</div>

				<ObjectIOControls
					objects={currentObjects}
					objectTypes={objectTypes}
					onImportFinished={onImportObjects}
					disabled={disabled}
				/>
			</div>

			<div
				style={{
					backgroundColor: '#f1e9e9ff',
					marginTop: '1rem',
					paddingLeft: 10,
					fontStyle: 'italic',
					flex: '1 1 auto',
					overflowY: 'auto',
					minHeight: '0',
				}}
			>
				<span style={{ fontWeight: 'bold' }}>Help: About objects</span>
				<p>Remove objects by selecting a type and pressing on them on the map.</p>
				<p>You can only remove objects that were previously placed by you.</p>
				<p>"Discard" will delete all not saved changes.</p>
				<p>"Save" will make the changes definitive and will re-calculate the PET map.</p>
				<p>"Import" will allow you to load previously exported files.</p>
				<p>"Export" will allow you to locally save your placed objects.</p>
			</div>
		</div>
	);
}
