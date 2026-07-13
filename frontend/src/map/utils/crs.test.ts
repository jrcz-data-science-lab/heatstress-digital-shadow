import { rdToLonLat, lonLatToRd } from "./crs";

// RD New projection origin: Amersfoort (x=155000, y=463000) → WGS84 lon≈5.387, lat≈52.156
const AMERSFOORT_RD: [number, number] = [155000, 463000];
const AMERSFOORT_LON = 5.387638;
const AMERSFOORT_LAT = 52.156161;

// Round-trip tolerance: sub-meter accuracy
const M_TOLERANCE = 1;
const DEG_TOLERANCE = 0.00001;

describe("rdToLonLat", () => {
	test("converts Amersfoort RD origin to roughly correct WGS84 (within 0.01°)", () => {
		const [lon, lat] = rdToLonLat(...AMERSFOORT_RD);
		expect(lon).toBeCloseTo(AMERSFOORT_LON, 2); // within ~1km, sanity check
		expect(lat).toBeCloseTo(AMERSFOORT_LAT, 2);
	});

	test("returns [lon, lat] order (lon first, smaller value for NL)", () => {
		const [lon, lat] = rdToLonLat(...AMERSFOORT_RD);
		// For the Netherlands: lon ~3–7, lat ~51–53 — lon is always the smaller value
		expect(lon).toBeLessThan(lat);
	});

	test("result is within the Netherlands bounding box", () => {
		const [lon, lat] = rdToLonLat(...AMERSFOORT_RD);
		expect(lon).toBeGreaterThan(3.0);
		expect(lon).toBeLessThan(8.0);
		expect(lat).toBeGreaterThan(50.5);
		expect(lat).toBeLessThan(53.5);
	});
});

describe("lonLatToRd", () => {
	test("round-trip rdToLonLat → lonLatToRd recovers original RD within 1m", () => {
		const [lon, lat] = rdToLonLat(...AMERSFOORT_RD);
		const [x, y] = lonLatToRd(lon, lat);
		expect(Math.abs(x - AMERSFOORT_RD[0])).toBeLessThan(M_TOLERANCE);
		expect(Math.abs(y - AMERSFOORT_RD[1])).toBeLessThan(M_TOLERANCE);
	});

	test("round-trip lonLatToRd → rdToLonLat recovers original lon/lat within 0.00001°", () => {
		const [x, y] = lonLatToRd(AMERSFOORT_LON, AMERSFOORT_LAT);
		const [lon, lat] = rdToLonLat(x, y);
		expect(Math.abs(lon - AMERSFOORT_LON)).toBeLessThan(DEG_TOLERANCE);
		expect(Math.abs(lat - AMERSFOORT_LAT)).toBeLessThan(DEG_TOLERANCE);
	});

	test("Middelburg (lon 3.613, lat 51.5) round-trips without loss", () => {
		const [x, y] = lonLatToRd(3.613, 51.5);
		const [lon, lat] = rdToLonLat(x, y);
		expect(Math.abs(lon - 3.613)).toBeLessThan(DEG_TOLERANCE);
		expect(Math.abs(lat - 51.5)).toBeLessThan(DEG_TOLERANCE);
	});
});
