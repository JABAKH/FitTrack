import { test } from "node:test";
import assert from "node:assert/strict";
import {
  distanceMeters,
  numberValue,
  localDay,
  streak,
} from "../src/lib/domain";
test("GPS distance uses great-circle meters", () => {
  assert.ok(
    Math.abs(
      distanceMeters(
        { latitude: 0, longitude: 0 },
        { latitude: 0, longitude: 1 },
      ) - 111194.9,
    ) < 1,
  );
});
test("validation rejects empty/negative and accepts decimal comma", () => {
  assert.throws(() => numberValue(""));
  assert.throws(() => numberValue("-1"));
  assert.equal(numberValue("72,5"), 72.5);
});
test("streak respects local calendar and permits current rest day", () => {
  const now = new Date(2026, 9, 7, 12);
  assert.equal(localDay(now), "2026-10-07");
  assert.equal(streak(["2026-10-06", "2026-10-05", "2026-10-04"], now), 3);
  assert.equal(streak(["2026-10-05"], now), 0);
});
