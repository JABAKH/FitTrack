import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { routeCoordinates, routeUpdateScript } from "../src/lib/openStreetMap";

test("map bridge discards unavailable or out-of-range GPS coordinates", () => {
  assert.deepEqual(
    routeCoordinates([
      { latitude: 29.07, longitude: -110.95 },
      { latitude: NaN, longitude: -110.95 },
      { latitude: 91, longitude: 0 },
      { latitude: 0, longitude: Infinity },
      { latitude: 0, longitude: -181 },
    ]),
    [[29.07, -110.95]],
  );
});

test("map updates safely transfer numeric coordinates without profile data", () => {
  let received: unknown;
  const window = {
    setFitTrackRoute: (points: unknown) => {
      received = points;
    },
  };
  vm.runInNewContext(
    routeUpdateScript([
      { latitude: 29.07, longitude: -110.95, userId: "private" },
    ] as { latitude: number; longitude: number }[]),
    { window },
  );
  assert.deepEqual(JSON.parse(JSON.stringify(received)), [[29.07, -110.95]]);
  assert.doesNotThrow(() =>
    vm.runInNewContext(routeUpdateScript([]), { window: {} }),
  );
});
