import assert from "node:assert/strict";
import test from "node:test";
import * as photoModeHelpers from "../src/lib/photo-modes.ts";

const photoModeModule = (
  "buildPhotoModeStyle" in photoModeHelpers
    ? photoModeHelpers
    : (photoModeHelpers as unknown as { default: typeof photoModeHelpers }).default
) as typeof photoModeHelpers;
const {
  buildPhotoModeStyle,
  defaultPhotoModeId,
  getPhotoModeById,
  getPhotoModeLabel,
  photoModes,
} = photoModeModule;

test("photoModes provide the expected first-pass tune options", () => {
  assert.ok(photoModes.length >= 4);
  assert.ok(photoModes.some((mode) => mode.id === "slimmer"));
  assert.ok(photoModes.some((mode) => mode.id === "premium"));
  assert.equal(getPhotoModeById(defaultPhotoModeId)?.id, defaultPhotoModeId);
});

test("buildPhotoModeStyle appends selected photo mode prompt", () => {
  const mode = getPhotoModeById("photo-ready");
  assert.ok(mode);

  const style = buildPhotoModeStyle("保留牛仔裤", mode);

  assert.match(style, /保留牛仔裤/);
  assert.match(style, /更适合拍照/);
  assert.ok(style.length <= 80);
});

test("getPhotoModeLabel names generated photo mode records", () => {
  assert.equal(getPhotoModeLabel(getPhotoModeById("slimmer")), "照片换搭 · 更显瘦");
  assert.equal(getPhotoModeLabel(undefined), "");
});
