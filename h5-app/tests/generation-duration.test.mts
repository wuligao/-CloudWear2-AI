import assert from "node:assert/strict";
import test from "node:test";
import {
  formatGenerationDuration,
  normalizeGenerationDuration,
} from "../src/lib/generation-duration.ts";

test("formatGenerationDuration keeps record card duration compact", () => {
  assert.equal(formatGenerationDuration(48000), "耗时 48秒");
  assert.equal(formatGenerationDuration(125000), "耗时 2分05秒");
});

test("normalizeGenerationDuration ignores invalid duration values", () => {
  assert.equal(normalizeGenerationDuration(undefined), undefined);
  assert.equal(normalizeGenerationDuration(-1), undefined);
  assert.equal(normalizeGenerationDuration(Number.NaN), undefined);
  assert.equal(normalizeGenerationDuration(1234.8), 1234);
});
