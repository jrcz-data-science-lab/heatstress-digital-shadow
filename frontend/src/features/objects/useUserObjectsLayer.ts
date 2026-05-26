import type { Layer, PickingInfo } from '@deck.gl/core';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { makeObjectsLayer, type ObjectInstance, type MeasureType } from './lib/objectLayer';
import { LOCAL_STORAGE_KEY } from '../../map/utils/deckUtils';
import { lonLatToRd } from '../../map/utils/crs';

type LayerMap = Record<string, Layer>;

export function useUserObjectsLayer(
	showObjects: boolean,
	isEditingMode: boolean,
	selectedObjectType: string | null,
	setSelectedObjectType: (type: string) => void,
) {
	const [isProcessing, setIsProcessing] = useState(false);

	const [objectTypes, setObjectTypes] = useState<MeasureType[]>([]);

	useEffect(() => {
		let cancelled = false;
		async function fetchTypes() {
			try {
				const response = await fetch('/backend/measures');
				if (!response.ok) throw new Error(response.statusText);
				const data: MeasureType[] = await response.json();

				if (!cancelled) {
					setObjectTypes(data);
				}
			} catch (e) {
				console.error('Failed to fetch measure types', e);
			}
		}

		fetchTypes();

		return () => {
			cancelled = true;
		};
	}, [setSelectedObjectType]);

	const [userObjects, setUserObjects] = useState<ObjectInstance[]>(() => {
		try {
			const storedValue = localStorage.getItem(LOCAL_STORAGE_KEY);
			if (!storedValue) return [];
			const parsed = JSON.parse(storedValue);
			return Array.isArray(parsed) ? parsed : [];
		} catch (e) {
			console.error('Error loading user objects from local storage:', e);
			return [];
		}
	});

	const [objectsToSave, setObjectsToSave] = useState<ObjectInstance[]>(userObjects);
	const [nextClientId, setNextClientId] = useState(0);
	const [objectsVersion, setObjectsVersion] = useState(0);
	const [error, setError] = useState<Error | null>(null);

	// Sync objectsToSave when userObjects changes (on initial load/save commit)
	useEffect(() => {
		setObjectsToSave(userObjects);
	}, [userObjects]);

	const getSelectedTypeProperties = useCallback((): MeasureType | undefined => {
		if (objectTypes.length === 0) return undefined;

		return objectTypes.find((t) => t.name === selectedObjectType);
	}, [objectTypes, selectedObjectType]);

	const handleInteraction = useCallback(
		(info: PickingInfo) => {
			if (!isEditingMode) return;

			if (info.object) {
				const clickedObject = info.object as ObjectInstance;
				const clickedLayerId = info.layer?.id;
				const objectIdToRemove = clickedObject.id;

				if (clickedLayerId?.startsWith('user-objects')) {
					if (objectIdToRemove && objectIdToRemove.startsWith('CLIENT-')) {
						setObjectsToSave((prev) => prev.filter((t) => t.id !== objectIdToRemove));
						return true;
					} else {
						return; // Not a client-placed object
					}
				}
				return;
			}

			if (!info.coordinate) return;
			const [lon, lat] = info.coordinate;

			const selectedType = getSelectedTypeProperties();
			if (!selectedType) {
				console.warn(
					'Cannot place object: Type properties not yet loaded or selected type is invalid.',
				);
				return;
			}

			const newId = `CLIENT-${selectedObjectType}-${Date.now()}-${nextClientId}`;
			setNextClientId((prev) => prev + 1);

			const newObject: ObjectInstance = {
				id: newId,
				objectType: selectedObjectType ?? 'object',
				position: [lon, lat, 0],
				scale: selectedType.scale,
				height: selectedType.height,
				radius: selectedType.radius,
				geometry: selectedType.geometry,
			};

			setObjectsToSave((prev) => [...prev, newObject]);

			return true;
		},
		[
			isEditingMode,
			selectedObjectType,
			nextClientId,
			getSelectedTypeProperties,
			setObjectsToSave,
		],
	);

	const userObjectLayers = useMemo<LayerMap | null>(() => {
		if (!showObjects || objectsToSave.length === 0 || objectTypes.length === 0) return null;

		const groupedObjects = objectsToSave.reduce(
			(acc, obj) => {
				if (!acc[obj.objectType]) {
					acc[obj.objectType] = [];
				}
				acc[obj.objectType].push(obj);
				return acc;
			},
			{} as Record<string, ObjectInstance[]>,
		);

		const objectTypesMap = objectTypes.reduce(
			(acc, type) => {
				acc[type.name] = type;
				return acc;
			},
			{} as Record<string, MeasureType>,
		);

		const layers: LayerMap = {};

		for (const typeName in groupedObjects) {
			const type = objectTypesMap[typeName];

			if (!type) {
				console.warn(
					`Missing properties for saved object type: ${typeName}. Skipping layer.`,
				);
				continue;
			}

			layers[typeName] = makeObjectsLayer(
				`user-objects-${typeName}`,
				groupedObjects[typeName],
				type.model,
				{
					orientation: type.rotation,
				},
			);
		}

		return layers;
	}, [objectsToSave, showObjects, objectTypes]);

	const hasUnsavedChanges = useMemo(() => {
		// If the references happen to be the same, content is definitely the same
		if (userObjects === objectsToSave) {
			return false;
		}

		// If lengths are different, changes exist
		if (userObjects.length !== objectsToSave.length) {
			return true;
		}

		const sortedUser = [...userObjects].sort((a, b) => a.id.localeCompare(b.id));
		const sortedDraft = [...objectsToSave].sort((a, b) => a.id.localeCompare(b.id));

		// Serialize and compare the strings
		return JSON.stringify(sortedUser) !== JSON.stringify(sortedDraft);
	}, [userObjects, objectsToSave]);

	const saveObjects = useCallback(async (objectsToSave: ObjectInstance[]) => {
		setIsProcessing(true);

		try {
			const payload = {
				points: objectsToSave.map((obj) => {
					const [lon, lat] = obj.position;
					const [x, y] = lonLatToRd(lon, lat);

					return {
						x,
						y,
						height: obj.height ? obj.height : 0.4,
						radius: obj.radius ? obj.radius : 5.0,
						geometry: obj.geometry,
					};
				}),
			};

			const response = await fetch('/backend/update-pet', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				throw new Error(`Failed to update pet: ${response.status} ${response.statusText}`);
			}

			await Promise.resolve().then(() => {
				localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(objectsToSave));
				setUserObjects(objectsToSave);
				setObjectsVersion((v) => v + 1);
			});
		} catch (e) {
			console.error('Error saving objects to local storage:', e);
			setError(e instanceof Error ? e : new Error(String(e)));
		} finally {
			setIsProcessing(false);
		}
	}, []);

	const handleImport = useCallback(
		(importedObjects: ObjectInstance[]) => {
			if (importedObjects.length === 0) {
				alert('Imported file contains no objects.');
				return;
			}

			const confirmReplace = window.confirm(
				`This action will replace all current objects with ${importedObjects.length} imported objects and re-calculate PET map. Are you sure?`,
			);

			if (confirmReplace) {
				saveObjects(importedObjects);
			}
		},
		[saveObjects],
	);

	const discardChanges = useCallback(() => {
		setObjectsToSave(userObjects);
	}, [userObjects]);

	return {
		userObjectLayers: userObjectLayers ? Object.values(userObjectLayers) : [],
		handleInteraction,
		saveObjects,
		discardChanges,
		error,
		hasUnsavedChanges,
		objectsVersion,
		objectTypes,
		isProcessing,
		objectsToSave,
		handleImport,
	};
}
