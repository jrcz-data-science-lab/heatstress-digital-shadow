import { useCallback, useEffect, useMemo, useState } from "react";
import { LOCAL_STORAGE_KEY } from "../../map/utils/constants";
import { lonLatToRd } from "../../map/utils/crs";
import type { MeasureType, ObjectInstance } from "./lib/objectLayer";

export type { MeasureType, ObjectInstance };

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
				const response = await fetch("/backend/measures");
				if (!response.ok) throw new Error(response.statusText);
				const data: MeasureType[] = await response.json();
				if (!cancelled) setObjectTypes(data);
			} catch (e) {
				console.error("Failed to fetch measure types", e);
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
			console.error("Error loading user objects from local storage:", e);
			return [];
		}
	});

	const [objectsToSave, setObjectsToSave] =
		useState<ObjectInstance[]>(userObjects);
	const [nextClientId, setNextClientId] = useState(0);
	const [objectsVersion, setObjectsVersion] = useState(0);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		setObjectsToSave(userObjects);
	}, [userObjects]);

	const getSelectedTypeProperties = useCallback((): MeasureType | undefined => {
		if (objectTypes.length === 0) return undefined;
		return objectTypes.find((t) => t.name === selectedObjectType);
	}, [objectTypes, selectedObjectType]);

	/**
	 * Handle a map click for placing/removing user objects.
	 * @param lon  Longitude of the click
	 * @param lat  Latitude of the click
	 * @param pickedEntityId  Cesium entity id string, if any entity was picked
	 */
	const handleInteraction = useCallback(
		(lon: number | undefined, lat: number | undefined, pickedEntityId?: string) => {
			if (!isEditingMode) return;

			// If a user-placed entity was picked, remove it (coords not needed)
			if (pickedEntityId?.startsWith("user-obj-CLIENT-")) {
				const objectId = pickedEntityId.replace(/^user-obj-/, "");
				setObjectsToSave((prev) => prev.filter((t) => t.id !== objectId));
				return true;
			}

			// Otherwise place a new object at the clicked location (coords required)
			if (lon == null || lat == null) return;

			const selectedType = getSelectedTypeProperties();
			if (!selectedType) {
				console.warn(
					"Cannot place object: Type properties not yet loaded or selected type is invalid.",
				);
				return;
			}

			const newId = `CLIENT-${selectedObjectType}-${Date.now()}-${nextClientId}`;
			setNextClientId((prev) => prev + 1);

			const newObject: ObjectInstance = {
				id: newId,
				objectType: selectedObjectType ?? "object",
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
		],
	);

	// Suppress unused warning — showObjects is kept as a param for API symmetry
	void showObjects;

	const hasUnsavedChanges = useMemo(() => {
		if (userObjects === objectsToSave) return false;
		if (userObjects.length !== objectsToSave.length) return true;
		const sortedUser = [...userObjects].sort((a, b) =>
			a.id.localeCompare(b.id),
		);
		const sortedDraft = [...objectsToSave].sort((a, b) =>
			a.id.localeCompare(b.id),
		);
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
						height: obj.height ?? 0.4,
						radius: obj.radius ?? 5.0,
						geometry: obj.geometry,
					};
				}),
			};

			const response = await fetch("/backend/update-pet", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				throw new Error(
					`Failed to update pet: ${response.status} ${response.statusText}`,
				);
			}

			await Promise.resolve().then(() => {
				localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(objectsToSave));
				setUserObjects(objectsToSave);
				setObjectsVersion((v) => v + 1);
			});
		} catch (e) {
			console.error("Error saving objects:", e);
			setError(e instanceof Error ? e : new Error(String(e)));
		} finally {
			setIsProcessing(false);
		}
	}, []);

	const handleImport = useCallback(
		(importedObjects: ObjectInstance[]) => {
			if (importedObjects.length === 0) {
				alert("Imported file contains no objects.");
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
		objectsToSave,
		objectTypes,
		handleInteraction,
		saveObjects,
		discardChanges,
		error,
		hasUnsavedChanges,
		objectsVersion,
		isProcessing,
		handleImport,
	};
}
