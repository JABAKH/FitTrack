import { test } from "node:test";
import assert from "node:assert/strict";
import { appendFixes, type Fix } from "../src/lib/backgroundRoute";
const fix = (
  timestamp: number,
  longitude: number,
  accuracy: number | null = 5,
): Fix => ({
  timestamp,
  coords: {
    latitude: 0,
    longitude,
    accuracy,
    altitude: null,
    altitudeAccuracy: null,
    speed: null,
    heading: null,
  },
});
test("replayed background batches do not duplicate points or inflate distance", () => {
  const batch = [fix(1000, 0), fix(11000, 0.0001), fix(21000, 0.0002)];
  const first = appendFixes([], 0, batch, 1000);
  const second = appendFixes(first.route, first.distance, batch, 1000);
  assert.equal(second.route.length, 3);
  assert.equal(second.distance, first.distance);
  assert.ok(first.distance > 20 && first.distance < 25);
});
test("out-of-order batches are processed chronologically without mutating saved data", () => {
  const saved = [{ latitude: 0, longitude: 0, timestamp: 1000 }];
  const next = appendFixes(
    saved,
    0,
    [fix(21000, 0.0002), fix(11000, 0.0001)],
    1000,
  );
  assert.deepEqual(
    next.route.map((p) => p.timestamp),
    [1000, 11000, 21000],
  );
  assert.equal(saved.length, 1);
});
test("stale, imprecise, invalid and impossible GPS fixes cannot distort a session", () => {
  const next = appendFixes(
    [],
    0,
    [
      fix(500, 0),
      fix(1000, 0),
      fix(2000, 0.1),
      fix(3000, 0.0001, 80),
      fix(4000, 0.0001, null),
      fix(5000, 200),
      fix(6000, NaN),
      fix(11000, 0.0001),
    ],
    1000,
  );
  assert.equal(next.route.length, 2);
  assert.ok(next.distance < 12);
});
test("route remains measurable across a screen-lock gap", () => {
  const next = appendFixes(
    [{ latitude: 0, longitude: 0, timestamp: 1000 }],
    0,
    [fix(301000, 0.001)],
    1000,
  );
  assert.equal(next.route.length, 2);
  assert.ok(next.distance > 110 && next.distance < 112);
});
