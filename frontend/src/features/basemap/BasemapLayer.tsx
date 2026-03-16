import { useMemo } from "react";
import { ImageryLayer } from "resium";
import { UrlTemplateImageryProvider } from "cesium";

const OSM_URL =
	"https://cartodb-basemaps-a.global.ssl.fastly.net/light_nolabels/{z}/{x}/{y}.png";

export function BasemapLayer() {
	const provider = useMemo(
		() => new UrlTemplateImageryProvider({ url: OSM_URL }),
		[],
	);

	return <ImageryLayer imageryProvider={provider} />;
}
