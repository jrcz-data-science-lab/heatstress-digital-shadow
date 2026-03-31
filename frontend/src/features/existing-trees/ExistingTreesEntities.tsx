import { useEffect, useRef, useState } from "react";
import { Entity, ModelGraphics, PointGraphics, useCesium } from "resium";
import { Cartesian3, Color, Math as CesiumMath } from "cesium";

/** Below this altitude: full 3D tree models */
const HIGH_DETAIL_HEIGHT = 1500;

/** Below this altitude: cheap green dot; above: nothing */
const LOW_DETAIL_HEIGHT = 20000;

const FEATURE_LIMIT_HIGH = 1000;
const FEATURE_LIMIT_LOW = 1000;

/** Scale for the 3D pine model (slightly smaller than user-placed trees at 7.5) */
const TREE_SCALE = 5;

const PDOK_BASE =
	"https://api.pdok.nl/lv/bgt/ogc/v1/collections/vegetatieobject_punt/items";

type LodLevel = "high" | "low" | "none";

type ExistingTreeData = {
	id: string;
	lon: number;
	lat: number;
};

export type TreeLoadStatus = {
	loading: boolean;
	count: number;
	limit: number;
	hitLimit: boolean;
};

type Props = {
	modelUrl?: string;
	onStatusChange?: (status: TreeLoadStatus) => void;
};

function getLod(height: number): LodLevel {
	if (height <= HIGH_DETAIL_HEIGHT) return "high";
	if (height <= LOW_DETAIL_HEIGHT) return "low";
	return "none";
}

export function ExistingTreesEntities({
	modelUrl = "/models/tree-pine.glb",
	onStatusChange,
}: Props) {
	const { viewer } = useCesium();
	const [trees, setTrees] = useState<ExistingTreeData[]>([]);
	const [lod, setLod] = useState<LodLevel>("none");
	const abortRef = useRef<AbortController | null>(null);

	useEffect(() => {
		if (!viewer) return;

		async function fetchForView() {
			const height = viewer!.camera.positionCartographic.height;
			const currentLod = getLod(height);

			if (currentLod === "none") {
				setTrees([]);
				setLod("none");
				return;
			}

			const rect = viewer!.camera.computeViewRectangle();
			if (!rect) return;

			const west = CesiumMath.toDegrees(rect.west);
			const south = CesiumMath.toDegrees(rect.south);
			const east = CesiumMath.toDegrees(rect.east);
			const north = CesiumMath.toDegrees(rect.north);
			const bbox = `${west},${south},${east},${north}`;

			const limit =
				currentLod === "high" ? FEATURE_LIMIT_HIGH : FEATURE_LIMIT_LOW;

			abortRef.current?.abort();
			abortRef.current = new AbortController();
			const signal = abortRef.current.signal;

			onStatusChange?.({ loading: true, count: 0, limit, hitLimit: false });

			try {
				const url = `${PDOK_BASE}?bbox=${bbox}&f=json&limit=${limit}`;
				const res = await fetch(url, { signal });
				const json = (await res.json()) as {
					features?: {
						id: string | number;
						geometry: { coordinates: [number, number] };
					}[];
				};

				// PDOK OGC API returns WGS84 (CRS84) by default — coordinates are [lon, lat]
				const data: ExistingTreeData[] = (json.features ?? []).map((f) => ({
					id: String(f.id),
					lon: f.geometry.coordinates[0],
					lat: f.geometry.coordinates[1],
				}));

				setTrees(data);
				setLod(currentLod);
				onStatusChange?.({
					loading: false,
					count: data.length,
					limit,
					hitLimit: data.length >= limit,
				});
			} catch (e) {
				if (e instanceof Error && e.name === "AbortError") return;
				console.error("Failed to fetch BGT existing trees from PDOK:", e);
				onStatusChange?.({ loading: false, count: 0, limit, hitLimit: false });
			}
		}

		const removeListener =
			viewer.camera.moveEnd.addEventListener(fetchForView);

		void fetchForView();

		return () => {
			removeListener();
			abortRef.current?.abort();
		};
	}, [viewer]);

	return (
		<>
			{trees.map((tree) => (
				<Entity
					key={tree.id}
					id={`existing-tree-${tree.id}`}
					position={Cartesian3.fromDegrees(tree.lon, tree.lat, 0)}
				>
					{lod === "high" ? (
						<ModelGraphics
							uri={modelUrl}
							scale={TREE_SCALE}
							minimumPixelSize={12}
						/>
					) : (
						<PointGraphics
							pixelSize={5}
							color={Color.fromCssColorString("#2d8a4e")}
							outlineColor={Color.fromCssColorString("#1a5c33")}
							outlineWidth={1}
						/>
					)}
				</Entity>
			))}
		</>
	);
}
