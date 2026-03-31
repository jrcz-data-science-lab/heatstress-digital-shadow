import { useEffect, useRef, useState } from "react";
import { Entity, ModelGraphics, PointGraphics, useCesium } from "resium";
import { Cartesian3, Color, Math as CesiumMath } from "cesium";

/** Below this altitude: full 3D tree models */
const HIGH_DETAIL_HEIGHT = 500;

/** Below this altitude: cheap green dot; above: nothing */
const LOW_DETAIL_HEIGHT = 5000;

/** Features per page — PDOK enforces a server-side cap of 1000 regardless of what you request */
const PAGE_SIZE = 1000;
/** Safety cap: stop following cursors after this many pages to prevent runaway fetches */
const MAX_PAGES = 10;

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
	/** Camera is above the max fetch altitude — no trees loaded */
	tooFarOut: boolean;
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
				onStatusChange?.({
					loading: false,
					count: 0,
					limit: 0,
					hitLimit: false,
					tooFarOut: true,
				});
				return;
			}

			const rect = viewer!.camera.computeViewRectangle();
			if (!rect) return;

			const west = CesiumMath.toDegrees(rect.west);
			const south = CesiumMath.toDegrees(rect.south);
			const east = CesiumMath.toDegrees(rect.east);
			const north = CesiumMath.toDegrees(rect.north);
			const bbox = `${west},${south},${east},${north}`;

			abortRef.current?.abort();
			abortRef.current = new AbortController();
			const signal = abortRef.current.signal;

			onStatusChange?.({
				loading: true,
				count: 0,
				limit: PAGE_SIZE,
				hitLimit: false,
				tooFarOut: false,
			});

			try {
				const accumulated: ExistingTreeData[] = [];
				let nextUrl: string | null =
					`${PDOK_BASE}?bbox=${bbox}&f=json&limit=${PAGE_SIZE}`;
				let page = 0;

				while (nextUrl && page < MAX_PAGES) {
					const res = await fetch(nextUrl, { signal });
					const json = (await res.json()) as {
						features?: {
							id: string | number;
							geometry: { coordinates: [number, number] };
						}[];
						links?: { rel: string; href: string }[];
					};

					for (const f of json.features ?? []) {
						accumulated.push({
							id: String(f.id),
							lon: f.geometry.coordinates[0],
							lat: f.geometry.coordinates[1],
						});
					}

					// Show trees as they arrive, page by page
					setTrees([...accumulated]);
					setLod(currentLod);
					onStatusChange?.({
						loading: true,
						count: accumulated.length,
						limit: PAGE_SIZE * MAX_PAGES,
						hitLimit: false,
						tooFarOut: false,
					});

					// Follow the cursor to the next page if one exists
					const next = json.links?.find((l) => l.rel === "next");
					nextUrl = next?.href ?? null;
					page++;
				}

				onStatusChange?.({
					loading: false,
					count: accumulated.length,
					limit: PAGE_SIZE * MAX_PAGES,
					hitLimit: page >= MAX_PAGES,
					tooFarOut: false,
				});
			} catch (e) {
				if (e instanceof Error && e.name === "AbortError") return;
				console.error("Failed to fetch BGT existing trees from PDOK:", e);
				onStatusChange?.({
					loading: false,
					count: 0,
					limit: PAGE_SIZE,
					hitLimit: false,
					tooFarOut: false,
				});
			}
		}

		const removeListener = viewer.camera.moveEnd.addEventListener(fetchForView);

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
