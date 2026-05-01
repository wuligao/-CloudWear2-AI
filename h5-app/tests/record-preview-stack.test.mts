import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRecordPreviewStack,
  normalizeRecordCount,
} from "../src/lib/record-preview-stack.ts";

test("buildRecordPreviewStack shows three visible layers and the hidden count for batch records", () => {
  const stack = buildRecordPreviewStack({
    failedCount: 1,
    imageUrl: "https://example.com/look.png",
    recordStatus: "succeeded",
    successCount: 3,
    totalCount: 4,
  });

  assert.equal(stack.totalCount, 4);
  assert.equal(stack.visibleLayers.length, 3);
  assert.equal(stack.hiddenCount, 1);
  assert.equal(stack.summaryLabel, "成功 3 / 失败 1");
  assert.equal(stack.hasImage, true);
});

test("normalizeRecordCount keeps counts in the supported visual range", () => {
  assert.equal(normalizeRecordCount(undefined), 1);
  assert.equal(normalizeRecordCount(0), 1);
  assert.equal(normalizeRecordCount(9), 9);
  assert.equal(normalizeRecordCount(99), 12);
});

test("buildRecordPreviewStack derives total count from outcome counts", () => {
  const stack = buildRecordPreviewStack({
    imageUrl: "https://example.com/look.png",
    recordStatus: "succeeded",
    successCount: 4,
    failedCount: 0,
  });

  assert.equal(stack.totalCount, 4);
  assert.equal(stack.successCount, 4);
  assert.equal(stack.failedCount, 0);
  assert.equal(stack.isBatch, true);
  assert.equal(stack.visibleLayers.length, 3);
});
